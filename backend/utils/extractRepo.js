function extractRepoDetails(input) {
  if (!input || typeof input !== "string") {
    throw new Error("Repository URL is required");
  }

  const value = input.trim().replace(/\.git$/, "");

  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) {
    const [owner, repo] = value.split("/");
    return { owner, repo };
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch (_error) {
    throw new Error("Enter a valid GitHub URL or owner/repo");
  }

  if (!parsed.hostname.includes("github.com")) {
    throw new Error("Only GitHub repositories are supported");
  }

  const [owner, repo] = parsed.pathname.split("/").filter(Boolean);
  if (!owner || !repo) {
    throw new Error("GitHub repository URL must include owner and repo");
  }

  return { owner, repo: repo.replace(/\.git$/, "") };
}

module.exports = extractRepoDetails;
