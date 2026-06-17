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

module.exports = { analyzeWithAI };
