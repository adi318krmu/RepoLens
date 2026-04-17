const axios= require("axios")
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

module.exports = { getRepoData };