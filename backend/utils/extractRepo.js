function extractRepoDetails(url) {
  const parts = url.split("/");
  return {
    owner: parts[3],
    repo: parts[4]
  };
}

module.exports = extractRepoDetails;