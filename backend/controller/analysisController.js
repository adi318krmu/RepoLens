const { getRepoData } = require("../services/githubService");
const { analyzeWithAI } = require("../services/geminiService");
const extractRepoDetails = require("../utils/extractRepo");
const { calculateScore, getStatus } = require("../services/scoringService");
const Analysis = require("../model/Analysis");
const { getDbStatus } = require("../model/dbConnect");
const {
  createAnalysis: createLocalAnalysis,
  getHistory: getLocalHistory
} = require("../services/localStore");

function fallbackAnalysis(message = "AI unavailable") {
  return {
    codeQuality: 5,
    readability: 5,
    bestPractices: 5,
    documentation: 5,
    issues: [message],
    suggestions: ["Try again later"]
  };
}

async function analyzeRepo(req, res) {
  try {
    const { repoUrl } = req.body;

    if (!repoUrl) {
      return res.status(400).json({
        success: false,
        message: "Repository URL is required"
      });
    }

    let repoData = { readme: "", files: [] };

    try {
      const { owner, repo } = extractRepoDetails(repoUrl);
      repoData = await getRepoData(owner, repo);
    } catch (_error) {
      repoData = { readme: "", files: [] };
    }

    let aiResult;

    try {
      aiResult = await analyzeWithAI({
        readme: repoData.readme,
        files: repoData.files
      });
    } catch (_error) {
      aiResult = fallbackAnalysis("AI unavailable");
    }

    const finalScore = calculateScore(aiResult);
    const status = getStatus(finalScore);

    const savedAnalysis = getDbStatus()
      ? await Analysis.create({
          userId: req.user?.id || null,
          repoUrl,
          score: finalScore,
          status,
          analysis: aiResult
        })
      : await createLocalAnalysis({
          userId: req.user?.id || null,
          repoUrl,
          score: finalScore,
          status,
          analysis: aiResult
        });

    return res.json({
      success: true,
      score: finalScore,
      status,
      analysis: aiResult,
      savedAnalysis
    });
  } catch (error) {
    console.error("ANALYSIS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to analyze repository"
    });
  }
}

async function getHistory(req, res) {
  try {
    const history = getDbStatus()
      ? await Analysis.find(req.user?.id ? { userId: req.user.id } : {}).sort({ createdAt: -1 })
      : await getLocalHistory(req.user?.id);

    return res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error("HISTORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load history"
    });
  }
}

module.exports = { analyzeRepo, getHistory };
