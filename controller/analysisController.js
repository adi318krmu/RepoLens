// const { getRepoData } = require("../services/githubService");
// const extractRepoDetails = require("../utils/extractRepo");

// exports.analyzeRepo = async (req, res) => {
//   try {
//     const { repoUrl } = req.body;

//     const { owner, repo } = extractRepoDetails(repoUrl);

//     const data = await getRepoData(owner, repo);

//     res.json({
//       success: true,
//       data
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

const { getRepoData } = require("../services/githubService");
const { analyzeWithAI } = require("../services/geminiService");
const extractRepoDetails = require("../utils/extractRepo");
const { calculateScore, getStatus } = require("../services/scoringService");
const Analysis = require("../model/Analysis");


// 🔥 MAIN FUNCTION
exports.analyzeRepo = async (req, res) => {
  try {
    const { repoUrl } = req.body;

    const { owner, repo } = extractRepoDetails(repoUrl);

    const repoData = await getRepoData(owner, repo);

    let aiResult;

    try {
      aiResult = await analyzeWithAI({
        readme: repoData.readme,
        files: repoData.files
      });
    } catch (err) {
      console.log("AI failed, using fallback");

      aiResult = {
        codeQuality: 5,
        readability: 5,
        bestPractices: 5,
        documentation: 5,
        issues: ["AI unavailable"],
        suggestions: ["Try again later"]
      };
    }

    const finalScore = calculateScore(aiResult);
    const status = getStatus(finalScore);

    // 🔥 SAVE TO DB
    const savedAnalysis = await Analysis.create({
      userId: req.user?.id || null,
      repoUrl,
      score: finalScore,
      status,
      analysis: aiResult
    });

    res.json({
      success: true,
      score: finalScore,
      status,
      analysis: aiResult,
      savedAnalysis
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



// 🔥 ADD THIS BELOW (new function)
exports.getHistory = async (req, res) => {
  try {

    // ⚠️ If no auth, use this instead:
    const history = await Analysis.find().sort({ createdAt: -1 });

    // If auth exists, use:
    // const history = await Analysis.find({ userId: req.user?.id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      history
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};