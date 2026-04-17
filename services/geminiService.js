const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeWithAI({ readme, files }) {
  try {
    const model = genAI.getGenerativeModel({
 model: "gemini-pro"
});

    const prompt = `
You are a senior software engineer.

Analyze this GitHub project.

README:
${readme?.slice(0, 1000)}

FILES:
${files.map(f => f.name).join(", ")}

Return ONLY valid JSON in this format:
{
  "codeQuality": number (0-10),
  "readability": number (0-10),
  "bestPractices": number (0-10),
  "documentation": number (0-10),
  "issues": ["..."],
  "suggestions": ["..."]
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // 🔥 CLEAN RESPONSE (VERY IMPORTANT)
    const cleaned = text.replace(/```json|```/g, "").trim();

    return JSON.parse(cleaned);

  } catch (error) {
  console.error("🔥 FULL GEMINI ERROR:", error);
  throw error;
}
}

module.exports = { analyzeWithAI };