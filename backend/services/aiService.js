const axios = require("axios");

const getAiServiceUrl = () => {
  return process.env.AI_SERVICE_URL || "http://localhost:8000";
};

const getApiKey = () => {
  return process.env.AI_SERVICE_API_KEY || "repolens_internal_secret_key_2026";
};

/**
 * Call FastAPI AI Microservice to analyze GitHub repository data
 */
async function analyzeGithubRepoWithAI(repoPackage) {
  const baseUrl = getAiServiceUrl();
  const apiKey = getApiKey();

  try {
    const response = await axios.post(
      `${baseUrl}/api/v1/analyze/github`,
      repoPackage,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Internal-API-Key": apiKey
        },
        timeout: 35000 // 35s timeout
      }
    );

    if (response.data && response.data.success && response.data.analysis) {
      return response.data.analysis;
    } else {
      throw new Error("Invalid response shape from AI microservice");
    }
  } catch (error) {
    console.error("AI MICROSERVICE ERROR:", error.message);
    if (error.response) {
      console.error("AI MICROSERVICE RESPONSE ERROR STATUS:", error.response.status, error.response.data);
    }
    throw error;
  }
}

module.exports = { analyzeGithubRepoWithAI };
