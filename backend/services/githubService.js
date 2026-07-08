const axios = require("axios");
const BASE_URL = "https://api.github.com/repos";

async function getRepoData(owner, repo) {
  try {
    // repo metadata
    const repoRes = await axios.get(`${BASE_URL}/${owner}/${repo}`);

    // README
    const readmeRes = await axios.get(
      `${BASE_URL}/${owner}/${repo}/readme`,
      {
        headers: { Accept: "application/vnd.github.v3.raw" }
      }
    );

    // file structure (root)
    const contentsRes = await axios.get(
      `${BASE_URL}/${owner}/${repo}/contents`
    );

    return {
      metadata: repoRes.data,
      readme: readmeRes.data,
      files: contentsRes.data
    };

  } catch (error) {
    throw new Error("Error fetching GitHub repo");
  }
}

async function getUserGithubData(username) {
  try {
    const headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "RepoLens-Grader-App"
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

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