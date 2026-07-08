const axios = require("axios");

const modelName = process.env.HF_MODEL || "Qwen/Qwen2.5-7B-Instruct";

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

function normalizeScore(value, defaultVal = 70) {
  const score = Number(value);
  if (!Number.isFinite(score)) return defaultVal;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeAnalysis(data) {
  return {
    atsScore: normalizeScore(data.atsScore ?? data.score),
    eligibility: typeof data.eligibility === "string" ? data.eligibility : "Moderately Eligible",
    verdict: typeof data.verdict === "string" ? data.verdict : "Shortlisted",
    strengths: Array.isArray(data.strengths) ? data.strengths : [],
    weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : [],
    missingKeywords: Array.isArray(data.missingKeywords) ? data.missingKeywords : [],
    suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
    roleSuggestions: Array.isArray(data.roleSuggestions ?? data.roleRecommendations) ? (data.roleSuggestions ?? data.roleRecommendations) : [],
    summary: typeof data.summary === "string" ? data.summary : ""
  };
}

async function analyzeResumeWithHF({ resumeText, targetRole, targetCompany, jobDescription }) {
  const token = process.env.HF_TOKEN;
  if (!token) {
    throw new Error("Hugging Face API token (HF_TOKEN) is missing.");
  }

  try {
    const prompt = `
You are an expert ATS (Applicant Tracking System) parser and senior recruiter.
Analyze the candidate's resume content against the target role, target company, and optional job description.

Target Role: ${targetRole || "Software Engineer"}
Target Company: ${targetCompany || "Any Company"}
Job Description: ${jobDescription || "Not provided. Evaluate general alignment with the target role."}

Resume Content:
${resumeText}

Provide an objective assessment. Calculate a realistic ATS Score (0 to 100), and evaluate candidate eligibility (Highly Eligible, Moderately Eligible, Low Alignment) and selection verdict (Selected, Shortlisted, Needs Improvement). Identify matching/missing keywords, key strengths, weaknesses, and optimization advice. Also provide suggestions for 2-4 alternative or compatible roles the candidate is suited for based on their current skillset.

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

    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${modelName}/v1/chat/completions`,
      {
        model: modelName,
        messages: [
          {
            role: "system",
            content: "You are an expert recruiter. You output ONLY JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        timeout: 30000 // 30 seconds timeout
      }
    );

    const completionText = response.data.choices[0].message.content;
    const rawResult = parseJsonResponse(completionText);
    return normalizeAnalysis(rawResult);
  } catch (error) {
    console.error("HUGGING FACE SERVICE ERROR:", error.message);
    if (error.response) {
      console.error("HF Response Error Body:", error.response.data);
    }
    throw error;
  }
}

module.exports = { analyzeResumeWithHF };
