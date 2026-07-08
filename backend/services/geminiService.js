const { GoogleGenerativeAI } = require("@google/generative-ai");

const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";

function parseJsonResponse(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw error;
    return JSON.parse(match[0]);
  }
}

function normalizeScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 5;
  return Math.max(0, Math.min(10, score));
}

function normalizeAnalysis(data) {
  return {
    codeQuality: normalizeScore(data.codeQuality),
    readability: normalizeScore(data.readability),
    bestPractices: normalizeScore(data.bestPractices),
    documentation: normalizeScore(data.documentation),
    strengths: Array.isArray(data.strengths) ? data.strengths : [],
    issues: Array.isArray(data.issues) ? data.issues : [],
    suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
    summary: typeof data.summary === "string" ? data.summary : ""
  };
}

async function analyzeWithAI({ readme, files }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    const prompt = `
You are a senior software engineer.

Analyze this GitHub project for code quality, readability, best practices,
documentation, maintainability, and interview readiness.

README:
${readme?.slice(0, 4000) || "No README found"}

FILES:
${files.map((file) => file.name).join(", ") || "No files found"}

Return ONLY valid JSON in this format:
{
  "codeQuality": number,
  "readability": number,
  "bestPractices": number,
  "documentation": number,
  "strengths": ["..."],
  "issues": ["..."],
  "suggestions": ["..."],
  "summary": "..."
}
`;

    const result = await model.generateContent(prompt);
    return normalizeAnalysis(parseJsonResponse(result.response.text()));
  } catch (error) {
    console.error("GEMINI ERROR:", error.message);
    throw error;
  }
}

async function analyzeResumeWithGemini({ resumeText, targetRole, targetCompany, jobDescription }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    const prompt = `
You are an expert ATS (Applicant Tracking System) parser and senior recruiter.
Analyze the candidate's resume content against the target role, target company, and optional job description.

Target Role: ${targetRole || "Software Engineer"}
Target Company: ${targetCompany || "Any Company"}
Job Description: ${jobDescription || "Not provided. Evaluate general alignment with the target role."}

Resume Content:
${resumeText}

Provide an objective assessment. Calculate a realistic ATS Score (0 to 100), and evaluate candidate eligibility (Highly Eligible, Moderately Eligible, Low Alignment) and selection verdict (Selected, Shortlisted, Needs Improvement). Identify matching/missing keywords, key strengths, weaknesses, and optimization advice. Also suggest 2-4 alternative or compatible job roles suited for the candidate.

Return ONLY a valid JSON object in this format:
{
  "atsScore": number,
  "eligibility": "Highly Eligible | Moderately Eligible | Low Alignment",
  "verdict": "Selected | Shortlisted | Needs Improvement",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "missingKeywords": ["string"],
  "suggestions": ["string"],
  "roleSuggestions": ["string"],
  "summary": "overall assessment summary"
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      atsScore: Math.max(0, Math.min(100, Math.round(Number(parsed.atsScore ?? parsed.score ?? 70)))),
      eligibility: typeof parsed.eligibility === "string" ? parsed.eligibility : "Moderately Eligible",
      verdict: typeof parsed.verdict === "string" ? parsed.verdict : "Shortlisted",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      roleSuggestions: Array.isArray(parsed.roleSuggestions ?? parsed.roleRecommendations) ? (parsed.roleSuggestions ?? parsed.roleRecommendations) : [],
      summary: typeof parsed.summary === "string" ? parsed.summary : ""
    };
  } catch (error) {
    console.error("GEMINI RESUME ERROR:", error.message);
    throw error;
  }
}

module.exports = { analyzeWithAI, analyzeResumeWithGemini };
