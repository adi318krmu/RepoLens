const { getRepoData } = require("../services/githubService");
const { analyzeGithubRepoWithAI } = require("../services/aiService");
const extractRepoDetails = require("../utils/extractRepo");
const { calculateScore, getStatus } = require("../services/scoringService");
const Analysis = require("../model/Analysis");
const { getDbStatus } = require("../model/dbConnect");
const {
  createAnalysis: createLocalAnalysis,
  getHistory: getLocalHistory
} = require("../services/localStore");

function fallbackAnalysis(message = "AI microservice unavailable") {
  return {
    detectedStack: { languages: [], frameworks: [], databases: [], tools: [] },
    codeQuality: { score: 5, strengths: [], issues: [message] },
    architecture: { score: 5, strengths: [], issues: [] },
    documentation: { score: 5, issues: [] },
    testing: { score: 5, issues: [] },
    security: { score: 5, issues: [] },
    maintainability: { score: 5, issues: [] },
    interviewReadiness: { score: 5, reason: message },
    strengths: ["Repository data was collected successfully"],
    criticalIssues: [message],
    recommendations: [],
    confidenceScore: { score: 40, level: "Low" },
    aiAvailable: false,
    aiError: message
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

    let repoPackage;
    let repoDetails;

    try {
      repoDetails = extractRepoDetails(repoUrl);
      repoPackage = await getRepoData(repoDetails.owner, repoDetails.repo);
    } catch (error) {
      if (!repoDetails) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to collect GitHub repository data"
      });
    }

    let aiResult;

    try {
      aiResult = await analyzeGithubRepoWithAI(repoPackage);
    } catch (aiErr) {
      console.warn("AI Microservice call failed, falling back to static analysis representation:", aiErr.message);
      aiResult = fallbackAnalysis("AI microservice temporarily unavailable");
    }

    const finalScore = calculateScore(aiResult);
    const status = getStatus(finalScore);

    // Prepare legacy UI compatibility attributes
    const strengthsList = aiResult.strengths || [];
    const issuesList = aiResult.criticalIssues || aiResult.codeQuality?.issues || [];
    const suggestionsList = (aiResult.recommendations || []).map(r => `${r.title}: ${r.suggestion}`);
    const summaryText = aiResult.interviewReadiness?.reason || "Repository analysis completed.";

    const scoresBreakdown = {
      codeQuality: aiResult.codeQuality?.score ?? 6,
      readability: aiResult.architecture?.score ?? 6,
      bestPractices: aiResult.maintainability?.score ?? 6,
      documentation: aiResult.documentation?.score ?? 6
    };

    const savedAnalysis = getDbStatus()
      ? await Analysis.create({
          userId: req.user ? req.user.id : null,
          repoUrl,
          score: finalScore,
          status,
          analysis: aiResult
        })
      : await createLocalAnalysis({
          userId: req.user ? req.user.id : null,
          repoUrl,
          score: finalScore,
          status,
          analysis: aiResult
        });

    return res.json({
      success: true,
      score: finalScore,
      overallScore: finalScore,
      status,
      verdict: status,
      analysis: aiResult,
      scores: scoresBreakdown,
      strengths: strengthsList,
      issues: issuesList,
      suggestions: suggestionsList,
      summary: summaryText,
      repo: repoDetails ? `${repoDetails.owner}/${repoDetails.repo}` : repoUrl,
      repository: repoUrl,
      tags: [
        ...(aiResult.detectedStack?.languages || []),
        ...(aiResult.detectedStack?.frameworks || [])
      ].slice(0, 5),
      savedAnalysis
    });
  } catch (error) {
    console.error("ANALYSIS CONTROLLER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to analyze repository"
    });
  }
}

async function getHistory(req, res) {
  try {
    const history = getDbStatus()
      ? await Analysis.find({ userId: req.user.id }).sort({ createdAt: -1 })
      : await getLocalHistory(req.user.id);

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

async function getAnalysisById(req, res) {
  try {
    const analysis = getDbStatus()
      ? await Analysis.findOne({ _id: req.params.id, userId: req.user.id })
      : (await getLocalHistory(req.user.id)).find((entry) => entry._id === req.params.id);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: "Analysis not found"
      });
    }

    const raw = analysis._doc ?? analysis;
    const aiData = raw.analysis || {};

    const strengthsList = aiData.strengths || [];
    const issuesList = aiData.criticalIssues || aiData.codeQuality?.issues || [];
    const suggestionsList = (aiData.recommendations || []).map(r => `${r.title}: ${r.suggestion}`);
    const summaryText = aiData.interviewReadiness?.reason || "Repository analysis report.";

    const scoresBreakdown = {
      codeQuality: aiData.codeQuality?.score ?? 6,
      readability: aiData.architecture?.score ?? 6,
      bestPractices: aiData.maintainability?.score ?? 6,
      documentation: aiData.documentation?.score ?? 6
    };

    return res.json({
      success: true,
      score: raw.score,
      overallScore: raw.score,
      status: raw.status,
      verdict: raw.status,
      analysis: aiData,
      scores: scoresBreakdown,
      strengths: strengthsList,
      issues: issuesList,
      suggestions: suggestionsList,
      summary: summaryText,
      repo: raw.repoUrl,
      repository: raw.repoUrl,
      createdAt: raw.createdAt
    });
  } catch (error) {
    console.error("HISTORY ITEM ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load analysis"
    });
  }
}

module.exports = { analyzeRepo, getHistory, getAnalysisById };
