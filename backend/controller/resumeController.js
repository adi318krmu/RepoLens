const ResumeAnalysis = require("../model/ResumeAnalysis");
const { getDbStatus } = require("../model/dbConnect");
const {
  createResumeAnalysis: createLocalResumeAnalysis,
  getResumeHistory: getLocalResumeHistory
} = require("../services/localStore");

// Imported modular service components
const roles = require("../utils/roles.json");
const { getClosestRole } = require("../utils/roleMatcher");
const resumeParser = require("../services/resumeParser");
const atsScorer = require("../services/atsScorer");
const githubAnalyzer = require("../services/githubAnalyzer");
const aiAnalyzer = require("../services/aiAnalyzer");

// Controller entry point for analyzing resume
async function analyzeResume(req, res) {
  try {
    const { targetRole, targetCompany, jobDescription } = req.body;
    let resumeText = req.body.resumeText;

    if (!targetRole) {
      return res.status(400).json({
        success: false,
        message: "Target role is required"
      });
    }

    // Step 1: PDF text extraction & validation
    if (req.file) {
      try {
        if (req.file.mimetype === "application/pdf") {
          const rawExtracted = await resumeParser.parsePdfBuffer(req.file.buffer);
          resumeText = resumeParser.cleanExtractedText(rawExtracted);
          
          console.log("--- EXTRACTED RESUME TEXT START ---");
          console.log(resumeText);
          console.log("--- EXTRACTED RESUME TEXT END ---");

          if (!resumeText || resumeText.trim().length < 50) {
            throw new Error("Extracted text is too short or empty. Please ensure the PDF is not an image scan.");
          }
        } else {
          const rawExtracted = req.file.buffer.toString("utf8");
          resumeText = resumeParser.cleanExtractedText(rawExtracted);

          console.log("--- EXTRACTED RESUME TEXT START ---");
          console.log(resumeText);
          console.log("--- EXTRACTED RESUME TEXT END ---");

          if (!resumeText || resumeText.trim().length < 50) {
            throw new Error("Uploaded text file is empty or too short.");
          }
        }
      } catch (err) {
        console.error("PDF/TXT Parsing Error:", err);
        return res.status(400).json({
          success: false,
          message: err.message || "Failed to parse PDF resume."
        });
      }
    }

    if (!resumeText || !resumeText.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please upload a resume file or paste your resume text."
      });
    }

    // Step 2: Separate into sections and extract GitHub info
    const resumeSections = resumeParser.extractSectionsLocal(resumeText);

    // Fallback: Check if githubUrl or githubUsername was passed explicitly in req.body
    const customGithub = req.body.githubUsername || req.body.githubUrl;
    if (customGithub && !resumeSections.githubUsername) {
      const match = customGithub.match(/(?:github\.com\/)?([a-zA-Z0-9_-]{1,39})/i);
      if (match && match[1]) {
        resumeSections.githubUsername = match[1].trim();
        resumeSections.githubUrl = `https://github.com/${match[1].trim()}`;
      }
    }

    // Step 3: Job roles mapping & specs retrieval
    const closestRole = await getClosestRole(targetRole, Object.keys(roles));
    const spec = roles[closestRole];
    console.log(`Analyzing candidate for target role: "${targetRole}" -> Mapped to: "${closestRole}"`);

    // Step 4: Estimate experience years
    const candidateExp = resumeParser.estimateExperienceYears(resumeText);

    // Step 5: Score the resume using ATS Scorer
    const scoreResult = await atsScorer.scoreResume({
      resumeText,
      resumeSections,
      candidateExp,
      spec
    });

    const {
      atsScore,
      matched,
      missing
    } = scoreResult;

    // Step 6: GitHub analysis using dynamic spec weights
    const githubAnalysis = await githubAnalyzer.analyzeGithubData(
      resumeSections.githubUsername,
      resumeSections,
      spec
    );

    // Step 7: Combine scores based on role spec weights
    const resumeWeightVal = spec.resumeWeight ?? 70;
    const githubWeightVal = spec.githubWeight ?? 30;
    const overallScore = Math.round(
      (atsScore * (resumeWeightVal / 100)) + 
      (githubAnalysis.score * (githubWeightVal / 100))
    );

    // Determine role fit label
    let roleFit = "Low Alignment";
    if (overallScore >= 85) roleFit = "Excellent Fit";
    else if (overallScore >= 70) roleFit = "Good Fit";
    else if (overallScore >= 50) roleFit = "Moderate Fit";

    // Step 8: Qualitative AI review
    const qualitativeResult = await aiAnalyzer.analyzeResumeQualitative({
      resumeText,
      resumeSections,
      targetRole: closestRole,
      targetCompany,
      jobDescription,
      matchedSkills: matched,
      missingSkills: missing,
      atsScore,
      githubScore: githubAnalysis.score,
      allRoles: Object.keys(roles)
    });

    // Step 9: Assemble final response matching the user's requested JSON structure
    const analysisPayload = {
      ats_score: atsScore,
      github_score: githubAnalysis.score,
      overall_score: overallScore,
      matched_skills: matched,
      missing_skills: missing,
      strengths: qualitativeResult.strengths,
      weaknesses: qualitativeResult.weaknesses,
      role_fit: roleFit,
      recommendations: qualitativeResult.recommendations,
      resume_summary: qualitativeResult.resume_summary,
      github_summary: githubAnalysis.summary,

      // UI legacy support attributes
      atsScore: atsScore,
      eligibility: roleFit,
      verdict: overallScore >= 80 ? "Selected" : overallScore >= 60 ? "Shortlisted" : "Needs Improvement",
      summary: qualitativeResult.resume_summary,
      missingKeywords: missing,
      roleSuggestions: qualitativeResult.roleSuggestions || [],
      suggestions: qualitativeResult.recommendations
    };

    // Save report to database or local JSON store
    const dbPayload = {
      userId: req.user ? req.user.id : null,
      targetRole: spec.displayName || closestRole,
      targetCompany: targetCompany || "",
      jobDescription: jobDescription || "",
      atsScore: atsScore,
      eligibility: roleFit,
      verdict: overallScore >= 80 ? "Selected" : overallScore >= 60 ? "Shortlisted" : "Needs Improvement",
      analysis: analysisPayload
    };

    const saved = getDbStatus()
      ? await ResumeAnalysis.create(dbPayload)
      : await createResumeAnalysisLocal(dbPayload);

    // Return the response
    return res.json({
      success: true,
      analysis: saved
    });

  } catch (error) {
    console.error("RESUME ANALYSIS CONTROLLER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to analyze resume"
    });
  }
}

// Wrapper for localStore createResumeAnalysis because localStore module names are imported differently
async function createResumeAnalysisLocal(payload) {
  return await createLocalResumeAnalysis({
    userId: payload.userId,
    targetRole: payload.targetRole,
    targetCompany: payload.targetCompany,
    jobDescription: payload.jobDescription,
    atsScore: payload.atsScore,
    eligibility: payload.eligibility,
    verdict: payload.verdict,
    analysis: payload.analysis
  });
}

// History of resume analysis
async function getResumeHistory(req, res) {
  try {
    const history = getDbStatus()
      ? await ResumeAnalysis.find({ userId: req.user.id }).sort({ createdAt: -1 })
      : await getLocalResumeHistory(req.user.id);

    return res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error("GET RESUME HISTORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load resume history"
    });
  }
}

// Get individual resume analysis report details
async function getResumeAnalysisById(req, res) {
  try {
    const analysis = getDbStatus()
      ? await ResumeAnalysis.findOne({ _id: req.params.id, userId: req.user.id })
      : (await getLocalResumeHistory(req.user.id)).find((entry) => entry._id === req.params.id);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: "Resume analysis report not found"
      });
    }

    return res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error("GET RESUME REPORT BY ID ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load resume analysis report"
    });
  }
}

module.exports = {
  analyzeResume,
  getResumeHistory,
  getResumeAnalysisById
};
