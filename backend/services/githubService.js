const axios = require("axios");

const BASE_URL = "https://api.github.com/repos";

function getHeaders() {
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "RepoLens-AI-App"
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

// File exclusions
const EXCLUDED_DIRS = [
  "node_modules", "dist", "build", "coverage", "vendor", ".git", ".idea",
  ".vscode", "__pycache__", "venv", ".venv", "target", "bin", "obj", ".next"
];

const EXCLUDED_EXTENSIONS = [
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".pdf", ".zip", ".tar",
  ".gz", ".7z", ".exe", ".dll", ".so", ".dylib", ".woff", ".woff2", ".ttf",
  ".eot", ".mp3", ".mp4", ".avi", ".mov", ".lock", "-lock.json"
];

function isExcludedPath(filePath) {
  const parts = filePath.split("/");
  if (parts.some(p => EXCLUDED_DIRS.includes(p.toLowerCase()))) {
    return true;
  }
  const lowerPath = filePath.toLowerCase();
  if (EXCLUDED_EXTENSIONS.some(ext => lowerPath.endsWith(ext))) {
    return true;
  }
  if (lowerPath.endsWith("package-lock.json") || lowerPath.endsWith("yarn.lock") || lowerPath.endsWith("pnpm-lock.yaml")) {
    return true;
  }
  return false;
}

function scoreFileImportance(filePath) {
  const lower = filePath.toLowerCase();
  const baseName = filePath.split("/").pop().toLowerCase();

  // High priority: Configuration & manifests
  if (
    baseName === "package.json" ||
    baseName === "requirements.txt" ||
    baseName === "pyproject.toml" ||
    baseName === "pom.xml" ||
    baseName === "dockerfile" ||
    baseName === "docker-compose.yml" ||
    baseName === "docker-compose.yaml" ||
    baseName === ".env.example"
  ) {
    return 100;
  }

  // CI/CD & GitHub config
  if (lower.startsWith(".github/workflows/")) return 90;

  // Entry points & main modules
  if (
    baseName === "server.js" ||
    baseName === "app.js" ||
    baseName === "main.py" ||
    baseName === "index.js" ||
    baseName === "app.jsx" ||
    baseName === "app.tsx" ||
    baseName === "main.jsx"
  ) {
    return 85;
  }

  // Core application logic
  if (
    lower.includes("/controller") ||
    lower.includes("/controllers") ||
    lower.includes("/service") ||
    lower.includes("/services") ||
    lower.includes("/route") ||
    lower.includes("/routes") ||
    lower.includes("/model") ||
    lower.includes("/models") ||
    lower.includes("/api") ||
    lower.includes("/components")
  ) {
    return 75;
  }

  // Test files
  if (lower.includes("test") || lower.includes("spec")) {
    return 70;
  }

  return 50;
}

async function fetchFileContent(owner, repo, defaultBranch, path, maxChars = 8000) {
  try {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${path}`;
    const res = await axios.get(rawUrl, {
      timeout: 5000,
      responseType: "text"
    });
    const content = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    return content.slice(0, maxChars);
  } catch (_error) {
    return null;
  }
}

async function getRepoData(owner, repo) {
  try {
    const headers = getHeaders();

    // 1. Fetch Repository Metadata
    const repoRes = await axios.get(`${BASE_URL}/${owner}/${repo}`, { headers });
    const repoMeta = repoRes.data;
    const defaultBranch = repoMeta.default_branch || "main";

    // 2. Fetch Languages breakdown
    let languages = {};
    try {
      const langRes = await axios.get(`${BASE_URL}/${owner}/${repo}/languages`, { headers });
      languages = langRes.data;
    } catch (_err) {
      languages = {};
    }

    // 3. Fetch README
    let readmeText = "";
    try {
      const readmeRes = await axios.get(`${BASE_URL}/${owner}/${repo}/readme`, {
        headers: { ...headers, Accept: "application/vnd.github.v3.raw" }
      });
      readmeText = typeof readmeRes.data === "string" ? readmeRes.data : "";
    } catch (_err) {
      readmeText = "";
    }

    // 4. Fetch Recursive Directory Tree
    let allTreeFiles = [];
    try {
      const treeRes = await axios.get(
        `${BASE_URL}/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
        { headers }
      );
      if (treeRes.data && Array.isArray(treeRes.data.tree)) {
        allTreeFiles = treeRes.data.tree
          .filter(item => item.type === "blob")
          .map(item => item.path);
      }
    } catch (_err) {
      // Fallback: root contents
      try {
        const rootRes = await axios.get(`${BASE_URL}/${owner}/${repo}/contents`, { headers });
        if (Array.isArray(rootRes.data)) {
          allTreeFiles = rootRes.data.map(item => item.path);
        }
      } catch (_err2) {
        allTreeFiles = [];
      }
    }

    // Filter file tree
    const validFilePaths = allTreeFiles.filter(p => !isExcludedPath(p));

    // Score & Rank files for content collection
    const rankedFiles = validFilePaths
      .map(filePath => ({ path: filePath, score: scoreFileImportance(filePath) }))
      .sort((a, b) => b.score - a.score);

    // Pick top files up to limits
    const maxFilesToFetch = 20;
    const topFilesToFetch = rankedFiles.slice(0, maxFilesToFetch);

    const importantFiles = [];
    const configurationFiles = [];
    let totalCharsFetched = 0;
    const maxTotalChars = 80000;

    for (const item of topFilesToFetch) {
      if (totalCharsFetched >= maxTotalChars) break;

      const content = await fetchFileContent(owner, repo, defaultBranch, item.path);
      if (content) {
        totalCharsFetched += content.length;
        const fileObj = { path: item.path, content };

        const baseName = item.path.split("/").pop().toLowerCase();
        if (
          baseName === "package.json" ||
          baseName === "requirements.txt" ||
          baseName === "pyproject.toml" ||
          baseName === "pom.xml" ||
          baseName === "dockerfile" ||
          baseName === "docker-compose.yml" ||
          baseName === ".env.example"
        ) {
          configurationFiles.push(fileObj);
        } else {
          importantFiles.push(fileObj);
        }
      }
    }

    return {
      repository: {
        owner,
        name: repo,
        description: repoMeta.description || "",
        primaryLanguage: repoMeta.language || "",
        languages,
        metadata: {
          stars: repoMeta.stargazers_count || 0,
          forks: repoMeta.forks_count || 0,
          openIssues: repoMeta.open_issues_count || 0,
          defaultBranch,
          isPrivate: repoMeta.private || false,
          updatedAt: repoMeta.updated_at || ""
        }
      },
      readme: readmeText,
      fileTree: validFilePaths,
      importantFiles,
      configurationFiles,
      staticSignals: {}
    };

  } catch (error) {
    console.error("Error in getRepoData:", error.message);
    let msg = "Error fetching GitHub repo";
    if (error.response?.status === 404) {
      msg = "GitHub repository not found or private. Please check that the URL is public and spelled correctly.";
    } else if (error.response?.status === 403 || error.response?.status === 429) {
      msg = "GitHub API rate limit exceeded or access denied. Please try again later or configure a GITHUB_TOKEN in your backend environment.";
    } else if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      msg = "Connection to GitHub timed out. Please try again.";
    }
    throw new Error(msg);
  }
}

async function getUserGithubData(username) {
  try {
    const headers = getHeaders();
    const profileRes = await axios.get(`https://api.github.com/users/${username}`, { headers });
    const reposRes = await axios.get(`https://api.github.com/users/${username}/repos?per_page=100`, { headers });

    return {
      profile: profileRes.data,
      repos: reposRes.data
    };
  } catch (error) {
    console.error("Error fetching GitHub user data:", error.message);
    throw error;
  }
}

module.exports = { getRepoData, getUserGithubData };