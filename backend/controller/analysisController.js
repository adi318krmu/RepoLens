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
    strengths: ["Repository data was collected successfully"],
    issues: [message],
    suggestions: ["Try again later"],
    summary: "AI analysis could not be completed, so a neutral score was used."
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
    let repoDetails;

    try {
      repoDetails = extractRepoDetails(repoUrl);
      repoData = await getRepoData(repoDetails.owner, repoDetails.repo);
    } catch (error) {
      if (!repoDetails) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      repoData = { readme: "", files: [], metadata: null };
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
          userId: req.user.id,
          repoUrl,
          score: finalScore,
          status,
          analysis: aiResult
        })
      : await createLocalAnalysis({
          userId: req.user.id,
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
      scores: {
        codeQuality: aiResult.codeQuality,
        readability: aiResult.readability,
        bestPractices: aiResult.bestPractices,
        documentation: aiResult.documentation
      },
      strengths: aiResult.strengths,
      issues: aiResult.issues,
      suggestions: aiResult.suggestions,
      summary: aiResult.summary,
      repo: repoDetails ? `${repoDetails.owner}/${repoDetails.repo}` : repoUrl,
      repository: repoUrl,
      tags: [
        repoData.metadata?.language,
        repoData.metadata?.license?.spdx_id,
        repoData.metadata?.private === false ? "public" : null
      ].filter(Boolean),
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

    return res.json({
      success: true,
      score: raw.score,
      overallScore: raw.score,
      status: raw.status,
      verdict: raw.status,
      analysis: raw.analysis,
      scores: {
        codeQuality: raw.analysis?.codeQuality,
        readability: raw.analysis?.readability,
        bestPractices: raw.analysis?.bestPractices,
        documentation: raw.analysis?.documentation
      },
      strengths: raw.analysis?.strengths || [],
      issues: raw.analysis?.issues || [],
      suggestions: raw.analysis?.suggestions || [],
      summary: raw.analysis?.summary || "",
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
