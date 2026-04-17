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

exports.analyzeRepo = async (req, res) => {
  try {
    const { repoUrl } = req.body;

    const { owner, repo } = extractRepoDetails(repoUrl);

    const repoData = await getRepoData(owner, repo);

    let aiResult;

    // 🔥 Handle AI failure safely
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

    // 🔥 YOUR LOGIC (MOST IMPORTANT)
    const finalScore = calculateScore(aiResult);
    const status = getStatus(finalScore);

    // ✅ Final response
    res.json({
      success: true,
      score: finalScore,
      status,
      analysis: aiResult
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};