const PDFParser = require("pdf2json");

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
  const reservedWords = ["orgs", "settings", "sponsors", "features", "pricing", "about", "blog", "explore", "topics", "search", "site", "readme", "pulls", "issues"];

  // 1. Standard github.com/username (allowing spaces or slashes introduced by PDF text extraction)
  const githubRegex = /(?:https?:\/\/)?(?:www\.)?github\s*\.\s*com\s*[\/:=]\s*([a-zA-Z0-9_-]{1,39})/i;
  const githubMatch = text.match(githubRegex);

  if (githubMatch && githubMatch[1] && !reservedWords.includes(githubMatch[1].toLowerCase())) {
    githubUsername = githubMatch[1].trim();
    githubUrl = `https://github.com/${githubUsername}`;
  } else {
    // 2. Fallback: GitHub: username, GitHub - username, or GitHub: @username
    const githubTextRegex = /github\s*[:\-–—]?\s*@?([a-zA-Z0-9_-]{1,39})/i;
    const textMatch = text.match(githubTextRegex);
    if (textMatch && textMatch[1] && !reservedWords.includes(textMatch[1].toLowerCase())) {
      githubUsername = textMatch[1].replace(/^@/, "").trim();
      githubUrl = `https://github.com/${githubUsername}`;
    }
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

module.exports = {
  cleanExtractedText,
  parsePdfBuffer,
  extractSectionsLocal,
  estimateExperienceYears
};
