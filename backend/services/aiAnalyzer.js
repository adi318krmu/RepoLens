const axios = require("axios");

// Fallback qualitative analysis generator when LLM API is offline
function generateLocalFallbackAnalysis({ targetRole, resumeSections, matchedSkills, missingSkills, atsScore, githubScore, allRoles }) {
  const strengths = [];
  const weaknesses = [];
  const recommendations = [];

  if (matchedSkills.length > 0) {
    strengths.push(`Matches essential required skills for the role, including: ${matchedSkills.slice(0, 4).join(", ")}.`);
  } else {
    weaknesses.push(`Lacks direct evidence of core required skills for the role of ${targetRole}.`);
    recommendations.push("Update your skills section to highlight exposure to core competencies of the target role.");
  }

  if (resumeSections.experienceText && resumeSections.experienceText.length > 200) {
    strengths.push("Substantial description of professional experience and achievements.");
  } else {
    weaknesses.push("Work experience descriptions are brief or lack quantifiable details.");
    recommendations.push("Quantify your achievements in your work experience (e.g. 'improved efficiency by 15%').");
  }

  if (resumeSections.projectsText && resumeSections.projectsText.length > 100) {
    strengths.push("Good presentation of projects showcasing practical implementation.");
  } else {
    weaknesses.push("Limited project details listed to demonstrate hands-on application.");
    recommendations.push("Add 2-3 detailed project case studies demonstrating the skills you used.");
  }

  if (missingSkills.length > 0) {
    weaknesses.push(`Missing key keywords or technologies: ${missingSkills.slice(0, 4).join(", ")}.`);
    recommendations.push(`Acquire or list exposure to missing technologies: ${missingSkills.slice(0, 4).join(", ")}.`);
  }

  if (!resumeSections.githubUsername) {
    weaknesses.push("No GitHub profile link detected on the resume.");
    recommendations.push("Add your GitHub profile URL to showcase open-source contributions.");
  } else if (githubScore < 60) {
    weaknesses.push("GitHub repository metrics are relatively low (few repositories or missing README files).");
    recommendations.push("Optimize your GitHub profile by pinning your best repositories and adding detailed README files.");
  }

  const resume_summary = `The candidate is seeking a role as a ${targetRole}. Their resume exhibits compatibility in ${matchedSkills.slice(0, 3).join(", ") || "core domain competencies"}, but lacks clear evidence of ${missingSkills.slice(0, 3).join(", ") || "specific keywords"}. The overall format is ${atsScore > 75 ? "well-structured and readable" : "average and could be enhanced with better formatting"}.`;

  // Dynamically select alternative suggestions based on known roles (excluding current)
  const roleSuggestions = allRoles
    .filter(r => r.toLowerCase() !== targetRole.toLowerCase())
    .slice(0, 3)
    .map(r => r.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));

  return {
    strengths: strengths.length ? strengths : ["Technical layout is clean and readable"],
    weaknesses: weaknesses.length ? weaknesses : ["Add more industry-standard professional tools"],
    recommendations: recommendations.length ? recommendations : ["Detail project impact", "Highlight specific achievements"],
    resume_summary,
    roleSuggestions
  };
}

async function analyzeResumeQualitative({ resumeText, resumeSections, targetRole, targetCompany, jobDescription, matchedSkills, missingSkills, atsScore, githubScore, allRoles }) {
  const token = process.env.HF_TOKEN;
  let qualitativeResult = null;

  if (token) {
    try {
      const modelName = process.env.HF_MODEL || "Qwen/Qwen2.5-7B-Instruct";
      const prompt = `
You are an expert ATS (Applicant Tracking System) parser and senior recruiter.
Analyze the candidate's resume content against the target role, target company, and optional job description.

Target Role: ${targetRole}
Target Company: ${targetCompany || "Any Company"}
Job Description: ${jobDescription || "Evaluate general alignment with target role."}

Resume Sections:
- SKILLS: ${resumeSections.skillsText || "Not specified separately"}
- PROJECTS: ${resumeSections.projectsText || "Not specified separately"}
- EXPERIENCE: ${resumeSections.experienceText || "Not specified separately"}
- EDUCATION: ${resumeSections.educationText || "Not specified separately"}

Provide a realistic qualitative review. Identify key strengths, weaknesses, and actionable optimization suggestions. Also provide suggestions for 2-4 alternative or compatible roles the candidate is suited for based on their current skillset.

Output ONLY valid JSON matching this schema:
{
  "strengths": ["string"],
  "weaknesses": ["string"],
  "recommendations": ["string"],
  "resume_summary": "string",
  "roleSuggestions": ["string"]
}
`;

      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${modelName}/v1/chat/completions`,
        {
          model: modelName,
          messages: [
            { role: "system", content: "You are an expert recruiter. You output ONLY JSON." },
            { role: "user", content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 1000
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          timeout: 20000
        }
      );

      const completionText = response.data.choices[0].message.content;
      const cleaned = completionText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      qualitativeResult = {
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        recommendations: Array.isArray(parsed.recommendations || parsed.suggestions) ? (parsed.recommendations || parsed.suggestions) : [],
        resume_summary: parsed.resume_summary || parsed.summary || "",
        roleSuggestions: Array.isArray(parsed.roleSuggestions || parsed.roleRecommendations) ? (parsed.roleSuggestions || parsed.roleRecommendations) : []
      };
    } catch (hfError) {
      console.warn("Hugging Face API qualitative analysis failed, checking Gemini fallback...", hfError.message);
      if (process.env.GEMINI_API_KEY) {
        try {
          const { GoogleGenerativeAI } = require("@google/generative-ai");
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.0-flash" });
          const prompt = `
You are an expert ATS (Applicant Tracking System) parser. Evaluate target role: ${targetRole}. 
Return key strengths, weaknesses, actionable suggestions, resume summary, and 2-4 alternative role suggestions.
Output ONLY JSON matching this schema:
{
  "strengths": ["string"],
  "weaknesses": ["string"],
  "recommendations": ["string"],
  "resume_summary": "string",
  "roleSuggestions": ["string"]
}

Resume text:
${resumeText}
`;
          
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
          
          qualitativeResult = {
            strengths: parsed.strengths || [],
            weaknesses: parsed.weaknesses || [],
            recommendations: parsed.recommendations || parsed.suggestions || [],
            resume_summary: parsed.resume_summary || parsed.summary || "",
            roleSuggestions: parsed.roleSuggestions || parsed.roleRecommendations || []
          };
        } catch (geminiError) {
          console.warn("Gemini fallback also failed, using local fallback generator.");
        }
      }
    }
  }

  if (!qualitativeResult) {
    qualitativeResult = generateLocalFallbackAnalysis({
      targetRole,
      resumeSections,
      matchedSkills,
      missingSkills,
      atsScore,
      githubScore,
      allRoles
    });
  }

  return qualitativeResult;
}

module.exports = {
  analyzeResumeQualitative,
  generateLocalFallbackAnalysis
};
