const PDFParser = require("pdf2json");
const axios = require("axios");
const ResumeAnalysis = require("../model/ResumeAnalysis");
const { getDbStatus } = require("../model/dbConnect");
const { getUserGithubData } = require("../services/githubService");
const {
  createResumeAnalysis: createLocalResumeAnalysis,
  getResumeHistory: getLocalResumeHistory
} = require("../services/localStore");

// Clean extracted PDF text to remove page headers, footers, page numbers and extra whitespaces
function cleanExtractedText(text) {
  if (!text) return "";
  const lines = text.split("\n");
  const cleanedLines = [];

  for (let line of lines) {
    // Replace multiple spaces/tabs with single space
    line = line.replace(/\s+/g, " ").trim();

    // Skip empty lines
    if (!line) continue;

    // Filter page numbers (e.g. "Page 1 of 5", "1 / 3", or solo digits)
    if (/^(page\s*\d+(\s*of\s*\d+)?|\d+\s*[\/-]\s*\d+|\d+)$/i.test(line)) {
      continue;
    }

    // Skip common repeated footer or header templates
    if (line.toLowerCase().includes("resume") && line.length < 15) {
      continue;
    }

    cleanedLines.push(line);
  }

  return cleanedLines.join("\n");
}

// Convert PDF buffer to plain text
function parsePdfBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData) => {
      reject(new Error(errData.parserError || "Failed to parse PDF"));
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      try {
        let textContent = "";
        if (pdfData && pdfData.Pages) {
          for (const page of pdfData.Pages) {
            if (page.Texts) {
              for (const textObj of page.Texts) {
                if (textObj.R) {
                  for (const textRun of textObj.R) {
                    if (textRun.T) {
                      let decodedText = textRun.T;
                      try {
                        decodedText = decodeURIComponent(textRun.T);
                      } catch (_) {
                        decodedText = unescape(textRun.T);
                      }
                      textContent += decodedText + " ";
                    }
                  }
                }
              }
            }
            textContent += "\n";
          }
        }
        resolve(textContent);
      } catch (err) {
        reject(err);
      }
    });

    pdfParser.parseBuffer(buffer);
  });
}

// Local semantic matching helper
function computeLocalSimilarity(str1, str2) {
  const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const s1 = clean(str1);
  const s2 = clean(str2);

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  // Custom technical synonyms mapping
  const synonyms = [
    ["react", "reactjs", "react.js"],
    ["node", "nodejs", "node.js"],
    ["restapi", "restfulapi", "rest"],
    ["ml", "machinelearning"],
    ["ai", "artificialintelligence"],
    ["js", "javascript"],
    ["ts", "typescript"],
    ["mongodb", "mongo"],
    ["postgres", "postgresql"],
    ["aws", "amazonwebservices"],
    ["k8s", "kubernetes"],
    ["ci/cd", "cicd", "continuousintegration"],
    ["vue", "vuejs", "vue.js"],
    ["angular", "angularjs"]
  ];

  for (const group of synonyms) {
    if (group.includes(s1) && group.includes(s2)) {
      return 0.95;
    }
  }

  // Calculate Bigram Jaccard Similarity
  const getNGrams = (str, n = 2) => {
    const ngrams = new Set();
    for (let i = 0; i <= str.length - n; i++) {
      ngrams.add(str.substring(i, i + n));
    }
    return ngrams;
  };

  const set1 = getNGrams(s1, 2);
  const set2 = getNGrams(s2, 2);

  if (set1.size === 0 || set2.size === 0) return 0.0;

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

// Request sentence embeddings from Hugging Face
async function getEmbedding(text) {
  const token = process.env.HF_TOKEN;
  if (!token) return null;

  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
      { inputs: [text] },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 4000
      }
    );
    if (response.data && Array.isArray(response.data) && response.data[0]) {
      return response.data[0];
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Compute Cosine Similarity between two embedding vectors
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Combine Embedding cosine similarity and local bigram fallback
async function getSemanticSimilarity(text1, text2) {
  const emb1 = await getEmbedding(text1);
  const emb2 = await getEmbedding(text2);
  if (emb1 && emb2) {
    return cosineSimilarity(emb1, emb2);
  }
  return computeLocalSimilarity(text1, text2);
}

// Pre-defined Job Roles profile specifications
const JOB_ROLES = {
  "backend developer": {
    skills: ["Node.js", "Express", "Python", "Django", "Java", "Spring Boot", "Go", "Databases", "SQL", "MongoDB", "PostgreSQL", "Redis", "REST APIs", "GraphQL", "Microservices", "Docker"],
    preferredTechnologies: ["Node.js", "Express", "PostgreSQL", "MongoDB", "Docker", "Redis"],
    keywords: ["REST API", "database migration", "backend architecture", "microservices", "caching", "query optimization", "authentication", "security"],
    experienceYears: 3
  },
  "frontend developer": {
    skills: ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Vue.js", "Angular", "Next.js", "Redux", "Tailwind CSS", "Sass", "Web Performance", "SEO", "Responsive Design", "Webpack", "Vite"],
    preferredTechnologies: ["React", "TypeScript", "HTML5", "CSS3", "Tailwind CSS", "Next.js"],
    keywords: ["responsive design", "component library", "state management", "web performance", "UI/UX", "cross-browser compatibility", "accessibility", "DOM manipulation"],
    experienceYears: 3
  },
  "full stack developer": {
    skills: ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Node.js", "Express", "SQL", "MongoDB", "REST APIs", "Git", "Docker", "DevOps", "AWS", "CI/CD"],
    preferredTechnologies: ["React", "Node.js", "Express", "MongoDB", "TypeScript", "SQL"],
    keywords: ["full stack", "end-to-end", "database integration", "frontend and backend", "API design", "state management", "deployment"],
    experienceYears: 3
  },
  "ai engineer": {
    skills: ["Python", "Machine Learning", "Deep Learning", "NLP", "Computer Vision", "TensorFlow", "PyTorch", "Scikit-Learn", "LLMs", "LangChain", "Hugging Face", "SQL", "Pandas", "NumPy", "Data Science"],
    preferredTechnologies: ["Python", "PyTorch", "TensorFlow", "Hugging Face", "LLMs", "LangChain"],
    keywords: ["machine learning", "neural networks", "fine-tuning", "prompt engineering", "model deployment", "data pipeline", "transformers", "regression", "classification"],
    experienceYears: 2
  },
  "data analyst": {
    skills: ["SQL", "Python", "R", "Excel", "Tableau", "Power BI", "Pandas", "NumPy", "Data Visualization", "Statistics", "Data Cleaning", "Data Modeling", "ETL"],
    preferredTechnologies: ["SQL", "Python", "Tableau", "Excel", "Pandas", "Power BI"],
    keywords: ["data cleaning", "statistical analysis", "reporting", "dashboard creation", "ETL pipeline", "business intelligence", "metrics", "data visualization"],
    experienceYears: 2
  },
  "devops engineer": {
    skills: ["Docker", "Kubernetes", "AWS", "Azure", "GCP", "CI/CD", "Jenkins", "GitHub Actions", "Terraform", "Ansible", "Linux", "Bash", "Python", "Monitoring", "Prometheus", "Grafana", "Git"],
    preferredTechnologies: ["Docker", "Kubernetes", "AWS", "Terraform", "GitHub Actions", "Linux"],
    keywords: ["infrastructure as code", "ci/cd pipeline", "cloud infrastructure", "containerization", "monitoring", "automation", "scalability", "kubernetes orchestration"],
    experienceYears: 3
  }
};

const MASTER_SKILLS_LIST = [
  "javascript", "typescript", "react", "vue", "angular", "node", "express", "python", "django", "flask",
  "fastapi", "java", "spring", "go", "golang", "c++", "c#", "ruby", "rails", "php", "laravel", "sql",
  "mysql", "postgresql", "postgres", "mongodb", "mongo", "redis", "elasticsearch", "docker", "kubernetes",
  "k8s", "aws", "azure", "gcp", "git", "github", "ci/cd", "jenkins", "terraform", "html", "css", "sass",
  "tailwind", "bootstrap", "graphql", "rest", "api", "microservices", "machine learning", "deep learning",
  "nlp", "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy", "tableau", "power bi", "excel", "r"
];

// Determine matching job specifications based on role and description
function getRoleSpec(targetRole, jobDescription) {
  const normalized = (targetRole || "").toLowerCase();
  let baseSpec = null;

  if (normalized.includes("backend")) {
    baseSpec = { ...JOB_ROLES["backend developer"] };
  } else if (normalized.includes("frontend")) {
    baseSpec = { ...JOB_ROLES["frontend developer"] };
  } else if (normalized.includes("full stack") || normalized.includes("fullstack") || normalized.includes("web developer")) {
    baseSpec = { ...JOB_ROLES["full stack developer"] };
  } else if (normalized.includes("ai") || normalized.includes("machine learning") || normalized.includes("ml") || normalized.includes("deep learning") || normalized.includes("data scientist")) {
    baseSpec = { ...JOB_ROLES["ai engineer"] };
  } else if (normalized.includes("data analyst") || normalized.includes("data analysis") || normalized.includes("business intelligence")) {
    baseSpec = { ...JOB_ROLES["data analyst"] };
  } else if (normalized.includes("devops") || normalized.includes("sre") || normalized.includes("site reliability") || normalized.includes("infrastructure")) {
    baseSpec = { ...JOB_ROLES["devops engineer"] };
  } else {
    baseSpec = {
      skills: ["Software Engineering", "Programming", "Databases", "Git", "System Design"],
      preferredTechnologies: [],
      keywords: ["software engineer", "development", "architecture", "coding", "testing"],
      experienceYears: 2
    };
  }

  // Parse custom technologies mentioned in the provided Job Description
  if (jobDescription && jobDescription.trim()) {
    const jdSkills = [];
    const jdLower = jobDescription.toLowerCase();

    for (const skill of MASTER_SKILLS_LIST) {
      if (jdLower.includes(skill)) {
        jdSkills.push(skill);
      }
    }

    if (jdSkills.length > 0) {
      baseSpec.skills = Array.from(new Set([...baseSpec.skills, ...jdSkills]));
    }
  }

  return baseSpec;
}

// Locally separate PDF text content into distinct resume sections
function extractSectionsLocal(text) {
  const sections = {
    skills: [],
    projects: [],
    experience: [],
    education: [],
    certifications: [],
    achievements: [],
    tools: [],
    programmingLanguages: []
  };

  const lines = text.split("\n");
  let currentSection = null;

  // Extract GitHub profile details if available
  let githubUrl = null;
  let githubUsername = null;
  const githubRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9-]{1,39})/i;
  const githubMatch = text.match(githubRegex);
  if (githubMatch) {
    githubUrl = githubMatch[0];
    githubUsername = githubMatch[1];
  }

  const headerMap = {
    skills: ["skills", "technical skills", "core competencies", "skills & tools", "technologies"],
    projects: ["projects", "personal projects", "academic projects", "key projects"],
    experience: ["experience", "work experience", "employment history", "professional experience", "work history"],
    education: ["education", "academic details", "academic background", "qualifications", "academic credentials"],
    certifications: ["certifications", "licenses & certifications", "courses", "certificates"],
    achievements: ["achievements", "awards", "accomplishments", "honors"],
    tools: ["tools", "developer tools", "utilities"],
    programmingLanguages: ["languages", "programming languages"]
  };

  for (let line of lines) {
    const trimmed = line.trim();
    const trimmedLower = trimmed.toLowerCase();
    if (!trimmed) continue;

    // Detect section headers
    let matchedHeader = null;
    for (const [secKey, headers] of Object.entries(headerMap)) {
      if (headers.some(h => trimmedLower === h || trimmedLower.startsWith(h + ":") || trimmedLower.startsWith(h + " "))) {
        matchedHeader = secKey;
        break;
      }
    }

    if (matchedHeader) {
      currentSection = matchedHeader;
      continue;
    }

    if (currentSection) {
      sections[currentSection].push(trimmed);
    }
  }

  return {
    skillsText: sections.skills.join("\n"),
    projectsText: sections.projects.join("\n"),
    experienceText: sections.experience.join("\n"),
    educationText: sections.education.join("\n"),
    certificationsText: sections.certifications.join("\n"),
    achievementsText: sections.achievements.join("\n"),
    toolsText: sections.tools.join("\n"),
    languagesText: sections.programmingLanguages.join("\n"),
    githubUrl,
    githubUsername,
    rawText: text
  };
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

// Estimate years of experience from resume text
function estimateExperienceYears(text) {
  const regexes = [
    /(\d+)\s*\+?\s*years?\s+of\s+experience/i,
    /(\d+)\s*\+?\s*(?:years?|yrs?)\b/i,
    /experience\s*:\s*(\d+)\s*(?:years?|yrs?)/i
  ];

  for (const regex of regexes) {
    const match = text.match(regex);
    if (match) {
      return parseInt(match[1]);
    }
  }

  const yearMatches = text.match(/\b(20\d{2})\b/g);
  if (yearMatches && yearMatches.length >= 2) {
    const uniqueYears = Array.from(new Set(yearMatches.map(Number))).sort((a, b) => a - b);
    const minYear = uniqueYears[0];
    const maxYear = uniqueYears[uniqueYears.length - 1];
    const diff = maxYear - minYear;
    if (diff > 0 && diff < 20) {
      return diff;
    }
  }

  return 1; // Default to 1 year
}

// Analyze projects alignment to job keywords
async function calculateProjectsRelevance(projectsText, keywords) {
  if (!projectsText || !projectsText.trim()) return 30; // base score for empty section

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

// Score keywords compliance
async function calculateKeywordsScore(rawText, keywords) {
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

// Evaluate GitHub indicators based on API data or fallback project details
async function analyzeGithubData(username, resumeSections) {
  let githubData = null;
  let fromApi = false;

  if (username) {
    try {
      githubData = await getUserGithubData(username);
      fromApi = true;
    } catch (err) {
      console.warn(`Could not retrieve live GitHub data for user: ${username}. Falling back to resume analysis.`);
    }
  }

  let score = 70;
  let numRepos = 0;
  let languages = [];
  let stars = 0;
  let forks = 0;
  let hasAiMl = false;
  let hasFullStack = false;
  let summary = "";

  if (fromApi && githubData) {
    const profile = githubData.profile;
    const repos = githubData.repos || [];

    numRepos = profile.public_repos || repos.length;
    stars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
    forks = repos.reduce((sum, r) => sum + (r.forks_count || 0), 0);

    const langMap = {};
    let descCount = 0;

    for (const r of repos) {
      if (r.language) {
        langMap[r.language] = (langMap[r.language] || 0) + 1;
      }
      if (r.description) {
        descCount++;
      }

      const nameLower = (r.name || "").toLowerCase();
      const descLower = (r.description || "").toLowerCase();

      if (nameLower.includes("ml") || nameLower.includes("ai") || descLower.includes("machine learning") || descLower.includes("deep learning") || descLower.includes("llm")) {
        hasAiMl = true;
      }
      if (nameLower.includes("fullstack") || nameLower.includes("react") || descLower.includes("full stack") || descLower.includes("frontend") || descLower.includes("backend")) {
        hasFullStack = true;
      }
    }

    languages = Object.keys(langMap);

    let repoScore = numRepos > 15 ? 100 : numRepos > 5 ? 85 : numRepos > 0 ? 70 : 40;
    let readmeScore = repos.length ? Math.round((descCount / repos.length) * 100) : 50;
    let starScore = stars > 50 ? 100 : stars > 10 ? 85 : stars > 0 ? 75 : 60;
    let diversityScore = languages.length > 5 ? 100 : languages.length > 2 ? 85 : 60;
    let typeBonus = (hasAiMl ? 10 : 0) + (hasFullStack ? 10 : 0);

    score = Math.round((repoScore * 0.3) + (readmeScore * 0.3) + (starScore * 0.2) + (diversityScore * 0.2)) + typeBonus;
    score = Math.max(0, Math.min(100, score));

    summary = `GitHub profile @${username} analyzed. Detected ${numRepos} public repositories with language portfolio including: ${languages.slice(0, 4).join(", ")}. Received ${stars} stars and ${forks} forks. README documentation coverage is ${readmeScore}%.`;
  } else {
    // Estimations based on resume text
    const projText = resumeSections.projectsText || "";
    const skillsText = resumeSections.skillsText || "";

    const countMatches = projText.match(/(?:^|\n)\s*(?:[•\-\*]|\d+\.)/g);
    numRepos = countMatches ? countMatches.length : 2;
    if (numRepos === 0 && projText.length > 50) numRepos = 2;

    const testLanguages = ["JavaScript", "TypeScript", "Python", "Java", "C++", "Go", "Rust", "Ruby", "PHP", "HTML", "CSS"];
    for (const lang of testLanguages) {
      if (skillsText.toLowerCase().includes(lang.toLowerCase()) || projText.toLowerCase().includes(lang.toLowerCase())) {
        languages.push(lang);
      }
    }

    if (projText.toLowerCase().includes("ml") || projText.toLowerCase().includes("ai") || projText.toLowerCase().includes("machine learning")) {
      hasAiMl = true;
    }
    if (projText.toLowerCase().includes("fullstack") || projText.toLowerCase().includes("react") || projText.toLowerCase().includes("database")) {
      hasFullStack = true;
    }

    let repoScore = numRepos >= 3 ? 85 : 70;
    let diversityScore = languages.length >= 3 ? 80 : 65;
    let typeBonus = (hasAiMl ? 10 : 0) + (hasFullStack ? 10 : 0);

    score = Math.round((repoScore * 0.5) + (diversityScore * 0.5)) + typeBonus;
    score = Math.max(0, Math.min(100, score));

    if (username) {
      summary = `Analyzed estimated metrics for @${username}. Based on projects, detected repositories utilizing ${languages.slice(0, 3).join(", ") || "software technologies"}. Live API link was bypassed, scored locally.`;
    } else {
      summary = `No GitHub username detected in resume. Project score is estimated based on the resume projects text. Recommend adding a GitHub link to support live metrics validation.`;
      score = Math.round(score * 0.85); // penalty for missing link
    }
  }

  return {
    score,
    numRepos,
    languages,
    stars,
    forks,
    hasAiMl,
    hasFullStack,
    summary
  };
}

// Generate static fallback analysis when LLM API is offline
function generateFallbackAnalysis(targetRole, resumeSections, matchedSkills, missingSkills, atsScore, githubAnalysis) {
  const strengths = [];
  const weaknesses = [];
  const recommendations = [];

  if (matchedSkills.length > 0) {
    strengths.push(`Matches essential technologies required for the role, including: ${matchedSkills.slice(0, 4).join(", ")}.`);
  }
  if (resumeSections.experienceText && resumeSections.experienceText.length > 200) {
    strengths.push("Substantial description of professional experience and achievements.");
  } else {
    weaknesses.push("Work experience descriptions are brief or lack quantifiable details.");
    recommendations.push("Quantify your achievements in your work experience (e.g. 'improved page load times by 30%').");
  }

  if (resumeSections.projectsText && resumeSections.projectsText.length > 100) {
    strengths.push("Good presentation of technical projects showcasing practical implementation.");
  } else {
    weaknesses.push("Limited project details listed to demonstrate hands-on application.");
    recommendations.push("Add 2-3 detailed project case studies demonstrating the technologies you used.");
  }

  if (missingSkills.length > 0) {
    weaknesses.push(`Missing key keywords or technologies: ${missingSkills.slice(0, 4).join(", ")}.`);
    recommendations.push(`Aquire or list exposure to missing technologies: ${missingSkills.slice(0, 4).join(", ")}.`);
  }

  if (!resumeSections.githubUsername) {
    weaknesses.push("No GitHub profile link detected on the resume.");
    recommendations.push("Add your GitHub profile URL to showcase open-source contributions.");
  } else if (githubAnalysis.score < 60) {
    weaknesses.push("GitHub repository metrics are relatively low (few repositories or missing README files).");
    recommendations.push("Optimize your GitHub profile by pinning your best repositories and adding detailed README files.");
  }

  const resume_summary = `The candidate is seeking a role as a ${targetRole}. Their resume exhibits strong compatibility in ${matchedSkills.slice(0, 3).join(", ") || "basic engineering"}, but lacks clear evidence of ${missingSkills.slice(0, 3).join(", ") || "advanced keywords"}. The overall format is ${atsScore > 75 ? "well-structured and readable" : "average and could be enhanced with better formatting"}.`;

  return {
    strengths: strengths.length ? strengths : ["Technical layout is clean and readable"],
    weaknesses: weaknesses.length ? weaknesses : ["Add more industry-standard technical tools"],
    recommendations: recommendations.length ? recommendations : ["Pin your top repositories on GitHub", "Add detail on project impact"],
    resume_summary
  };
}

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
          const rawExtracted = await parsePdfBuffer(req.file.buffer);
          resumeText = cleanExtractedText(rawExtracted);
          
          console.log("--- EXTRACTED RESUME TEXT START ---");
          console.log(resumeText);
          console.log("--- EXTRACTED RESUME TEXT END ---");

          if (!resumeText || resumeText.trim().length < 50) {
            throw new Error("Extracted text is too short or empty. Please ensure the PDF is not an image scan.");
          }
        } else {
          const rawExtracted = req.file.buffer.toString("utf8");
          resumeText = cleanExtractedText(rawExtracted);

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
    const resumeSections = extractSectionsLocal(resumeText);

    // Step 3: Job specs matching
    const spec = getRoleSpec(targetRole, jobDescription);

    // Step 4: Semantic match for skills
    const { matched, missing } = await matchSkillsSemantically(spec.skills, resumeSections);

    // Step 5: Score each section deterministically
    const skillScore = spec.skills.length ? Math.round((matched.length / spec.skills.length) * 100) : 70;
    
    const candidateExp = estimateExperienceYears(resumeText);
    const expScore = candidateExp >= spec.experienceYears
      ? 100
      : Math.round((candidateExp / spec.experienceYears) * 100);

    const projScore = await calculateProjectsRelevance(resumeSections.projectsText, spec.keywords);
    const eduScore = calculateEducationScore(resumeSections.educationText);
    const keywordScore = await calculateKeywordsScore(resumeText, spec.keywords);
    const formatScore = calculateFormattingScore(resumeText, resumeSections);

    // Dynamic ATS Score weighting
    // 30% Skills, 25% Experience, 20% Projects, 10% Education, 10% Keywords, 5% Formatting
    const atsScore = Math.round(
      (skillScore * 0.30) +
      (expScore * 0.25) +
      (projScore * 0.20) +
      (eduScore * 0.10) +
      (keywordScore * 0.10) +
      (formatScore * 0.05)
    );

    // Step 6: GitHub analysis
    const githubAnalysis = await analyzeGithubData(resumeSections.githubUsername, resumeSections);

    // Step 7: Combine scores
    // 70% Resume + 30% GitHub
    const overallScore = Math.round((atsScore * 0.7) + (githubAnalysis.score * 0.3));

    // Determine role fit label
    let roleFit = "Low Alignment";
    if (overallScore >= 85) roleFit = "Excellent Fit";
    else if (overallScore >= 70) roleFit = "Good Fit";
    else if (overallScore >= 50) roleFit = "Moderate Fit";

    // Step 8: Get qualitative feedback (strengths, weaknesses, suggestions) using LLMs with fallback
    let qualitativeResult = null;
    const token = process.env.HF_TOKEN;

    if (token) {
      try {
        const modelName = process.env.HF_MODEL || "Qwen/Qwen2.5-7B-Instruct";
        const prompt = `
You are an expert ATS (Applicant Tracking System) parser and senior recruiter.
Analyze the candidate's resume content against the target role and job description.

Target Role: ${targetRole}
Target Company: ${targetCompany || "Any Company"}
Job Description: ${jobDescription || "Evaluate general alignment with target role."}

Resume Sections:
- SKILLS: ${resumeSections.skillsText || "Not specified separately"}
- PROJECTS: ${resumeSections.projectsText || "Not specified separately"}
- EXPERIENCE: ${resumeSections.experienceText || "Not specified separately"}
- EDUCATION: ${resumeSections.educationText || "Not specified separately"}

Provide a realistic qualitative review. Identify key strengths, weaknesses, and actionable optimization suggestions. Output ONLY valid JSON matching this schema:
{
  "strengths": ["string"],
  "weaknesses": ["string"],
  "recommendations": ["string"],
  "resume_summary": "string"
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
            max_tokens: 800
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            timeout: 15000
          }
        );

        const completionText = response.data.choices[0].message.content;
        const cleaned = completionText.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        qualitativeResult = {
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
          weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
          recommendations: Array.isArray(parsed.recommendations || parsed.suggestions) ? (parsed.recommendations || parsed.suggestions) : [],
          resume_summary: parsed.resume_summary || parsed.summary || ""
        };
      } catch (hfError) {
        console.warn("Hugging Face API qualitative analysis failed, checking Gemini fallback...", hfError.message);
        if (process.env.GEMINI_API_KEY) {
          try {
            const { GoogleGenerativeAI } = require("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const prompt = `Evaluate target role: ${targetRole}. Return strengths, weaknesses, suggestions, and summary. Output ONLY JSON: { "strengths": [], "weaknesses": [], "recommendations": [], "resume_summary": "" }. Resume text: ${resumeText}`;
            
            const result = await model.generateContent(prompt);
            const parsed = JSON.parse(result.response.text().replace(/```json|```/g, "").trim());
            
            qualitativeResult = {
              strengths: parsed.strengths || [],
              weaknesses: parsed.weaknesses || [],
              recommendations: parsed.recommendations || [],
              resume_summary: parsed.resume_summary || ""
            };
          } catch (geminiError) {
            console.warn("Gemini fallback also failed, using local fallback generator.");
          }
        }
      }
    }

    if (!qualitativeResult) {
      qualitativeResult = generateFallbackAnalysis(targetRole, resumeSections, matched, missing, atsScore, githubAnalysis);
    }

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
      roleSuggestions: [ "Software Engineer", "Solutions Architect", "Technical Lead" ],
      suggestions: qualitativeResult.recommendations
    };

    // Save report to database or local JSON store
    const dbPayload = {
      userId: req.user ? req.user.id : null,
      targetRole,
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
