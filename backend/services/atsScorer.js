const { getEmbedding, cosineSimilarity, computeLocalSimilarity } = require("../utils/roleMatcher");

// Combine Embedding cosine similarity and local bigram fallback
async function getSemanticSimilarity(text1, text2) {
  const emb1 = await getEmbedding(text1);
  const emb2 = await getEmbedding(text2);
  if (emb1 && emb2) {
    return cosineSimilarity(emb1, emb2);
  }
  return computeLocalSimilarity(text1, text2);
}

// Compare target skills against resume sections semantically
async function matchSkillsSemantically(requiredSkills, resumeSections) {
  const matched = [];
  const missing = [];
  const candidateText = `${resumeSections.skillsText} ${resumeSections.languagesText} ${resumeSections.toolsText} ${resumeSections.rawText}`.toLowerCase();

  for (const skill of requiredSkills) {
    const skillLower = skill.toLowerCase();

    // 1. Direct substring match (highly efficient)
    if (candidateText.includes(skillLower)) {
      matched.push(skill);
      continue;
    }

    // 2. Synonyms mapping check
    let isMatched = false;
    const synonyms = [
      ["react", "reactjs", "react.js"],
      ["node", "nodejs", "node.js"],
      ["rest api", "restful api", "rest api design"],
      ["ml", "machine learning"],
      ["ai", "artificial intelligence"],
      ["js", "javascript"],
      ["ts", "typescript"],
      ["mongodb", "mongo"],
      ["postgres", "postgresql"],
      ["aws", "amazon web services"],
      ["k8s", "kubernetes"],
      ["ci/cd", "cicd", "continuous integration"]
    ];

    for (const group of synonyms) {
      if (group.includes(skillLower)) {
        if (group.some(syn => candidateText.includes(syn))) {
          isMatched = true;
          break;
        }
      }
    }

    if (isMatched) {
      matched.push(skill);
      continue;
    }

    // 3. Token-level similarity check
    const words = candidateText.split(/[\s,;:\(\)\{\}\[\]\.\-\/]+/);
    let bestLocalSim = 0.0;
    let bestWord = "";

    for (let word of words) {
      word = word.trim();
      if (word.length < 3) continue;

      const localSim = computeLocalSimilarity(skillLower, word);
      if (localSim > bestLocalSim) {
        bestLocalSim = localSim;
        bestWord = word;
      }
      if (bestLocalSim > 0.8) break;
    }

    if (bestLocalSim > 0.8) {
      matched.push(skill);
    } else if (bestLocalSim > 0.4) {
      const semanticSim = await getSemanticSimilarity(skillLower, bestWord);
      if (semanticSim > 0.75) {
        matched.push(skill);
      } else {
        missing.push(skill);
      }
    } else {
      missing.push(skill);
    }
  }

  return { matched, missing };
}

// Analyze projects alignment to job keywords/skills
async function calculateProjectsRelevance(projectsText, keywords) {
  if (!projectsText || !projectsText.trim()) return 30; // base score for empty section
  if (!keywords || keywords.length === 0) return 100;

  let score = 50;
  let matchedCount = 0;

  for (const keyword of keywords) {
    const kwLower = keyword.toLowerCase();
    if (projectsText.toLowerCase().includes(kwLower)) {
      matchedCount++;
      continue;
    }

    const sim = await getSemanticSimilarity(keyword, projectsText);
    if (sim > 0.6) {
      matchedCount++;
    }
  }

  score += (matchedCount / keywords.length) * 50;
  return Math.min(100, Math.round(score));
}

// Determine education matching score
function calculateEducationScore(educationText) {
  if (!educationText || !educationText.trim()) return 40;

  const textLower = educationText.toLowerCase();

  if (textLower.includes("phd") || textLower.includes("ph.d") || textLower.includes("doctorate")) {
    return 100;
  }
  if (textLower.includes("master") || textLower.includes("mtech") || textLower.includes("m.tech") || textLower.includes("ms ") || textLower.includes("m.s")) {
    return 95;
  }
  if (textLower.includes("bachelor") || textLower.includes("btech") || textLower.includes("b.tech") || textLower.includes("bs ") || textLower.includes("b.s") || textLower.includes("degree") || textLower.includes("diploma")) {
    return 90;
  }

  return 70;
}

// Determine certifications matching score
function calculateCertificationScore(certificationsText) {
  if (!certificationsText || !certificationsText.trim()) return 0;
  const lines = certificationsText.split("\n").filter(l => l.trim().length > 0);
  if (lines.length >= 2) return 100;
  if (lines.length === 1) return 80;
  return 50;
}

// Score keywords compliance
async function calculateKeywordsScore(rawText, keywords) {
  if (!keywords || keywords.length === 0) return 100;

  let matched = 0;
  for (const kw of keywords) {
    if (rawText.toLowerCase().includes(kw.toLowerCase())) {
      matched++;
    } else {
      const words = rawText.split(/\s+/);
      for (const w of words) {
        if (computeLocalSimilarity(kw, w) > 0.8) {
          matched++;
          break;
        }
      }
    }
  }
  return Math.round((matched / keywords.length) * 100);
}

// Compute resume formatting quality
function calculateFormattingScore(rawText, resumeSections) {
  let score = 50;

  if (rawText.includes("@") || rawText.match(/\b\d{10}\b/) || rawText.match(/\+\d+/)) {
    score += 15;
  }

  let sectionsFound = 0;
  if (resumeSections.skillsText) sectionsFound++;
  if (resumeSections.projectsText) sectionsFound++;
  if (resumeSections.experienceText) sectionsFound++;
  if (resumeSections.educationText) sectionsFound++;

  score += (sectionsFound / 4) * 20;

  if (rawText.includes("•") || rawText.includes("- ") || rawText.includes("* ")) {
    score += 15;
  }

  return Math.min(100, score);
}

// Main ATS Scoring engine with dynamic role weights
async function scoreResume({ resumeText, resumeSections, candidateExp, spec }) {
  const { matched, missing } = await matchSkillsSemantically(spec.requiredSkills, resumeSections);

  const skillScore = spec.requiredSkills.length ? Math.round((matched.length / spec.requiredSkills.length) * 100) : 70;

  const targetExpYears = spec.experienceYears || 2;
  const expScore = candidateExp >= targetExpYears
    ? 100
    : Math.round((candidateExp / targetExpYears) * 100);

  // Use preferredSkills for projects and keyword relevance matching
  const keywords = spec.preferredSkills || [];
  const projScore = await calculateProjectsRelevance(resumeSections.projectsText, keywords);
  const eduScore = calculateEducationScore(resumeSections.educationText);
  const certScore = calculateCertificationScore(resumeSections.certificationsText);
  const keywordScore = await calculateKeywordsScore(resumeText, keywords);
  const formatScore = calculateFormattingScore(resumeText, resumeSections);

  // Combine format and keywords into resume quality score
  const resumeQualityScore = Math.round((formatScore * 0.4) + (keywordScore * 0.6));

  const totalWeight =
    (spec.skillWeight || 0) +
    (spec.experienceWeight || 0) +
    (spec.projectWeight || 0) +
    (spec.educationWeight || 0) +
    (spec.certificationWeight || 0) +
    (spec.resumeQualityWeight || 0);

  const atsScore = Math.round(
    (
      (skillScore * (spec.skillWeight || 0)) +
      (expScore * (spec.experienceWeight || 0)) +
      (projScore * (spec.projectWeight || 0)) +
      (eduScore * (spec.educationWeight || 0)) +
      (certScore * (spec.certificationWeight || 0)) +
      (resumeQualityScore * (spec.resumeQualityWeight || 0))
    ) / (totalWeight || 1)
  );

  return {
    atsScore,
    skillScore,
    expScore,
    projScore,
    eduScore,
    certScore,
    keywordScore,
    formatScore,
    matched,
    missing
  };
}

module.exports = {
  getSemanticSimilarity,
  matchSkillsSemantically,
  calculateProjectsRelevance,
  calculateEducationScore,
  calculateCertificationScore,
  calculateKeywordsScore,
  calculateFormattingScore,
  scoreResume
};
