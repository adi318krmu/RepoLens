const { getUserGithubData } = require("./githubService");

async function analyzeGithubData(username, resumeSections, spec) {
  let githubData = null;
  let fromApi = false;

  if (username) {
    try {
      githubData = await getUserGithubData(username);
      fromApi = true;
    } catch (err) {
      console.warn(`Could not retrieve live GitHub data for user: ${username}. Falling back to local estimations.`);
    }
  }

  let score = 70;
  let numRepos = 0;
  let languages = [];
  let stars = 0;
  let forks = 0;
  let summary = "";

  const allRoleSkills = [
    ...(spec.requiredSkills || []),
    ...(spec.preferredSkills || [])
  ].map(s => s.toLowerCase());

  if (fromApi && githubData) {
    const profile = githubData.profile;
    const repos = githubData.repos || [];

    numRepos = profile.public_repos || repos.length;
    stars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
    forks = repos.reduce((sum, r) => sum + (r.forks_count || 0), 0);

    const langMap = {};
    let descCount = 0;
    let alignedReposCount = 0;

    for (const r of repos) {
      if (r.language) {
        langMap[r.language] = (langMap[r.language] || 0) + 1;
      }
      if (r.description) {
        descCount++;
      }

      const nameLower = (r.name || "").toLowerCase();
      const descLower = (r.description || "").toLowerCase();

      // Dynamically check if the repository is aligned with the target role skills
      const isAligned = allRoleSkills.some(skill => 
        nameLower.includes(skill) || descLower.includes(skill)
      );
      if (isAligned) {
        alignedReposCount++;
      }
    }

    languages = Object.keys(langMap);

    let repoScore = numRepos > 15 ? 100 : numRepos > 5 ? 85 : numRepos > 0 ? 70 : 40;
    let readmeScore = repos.length ? Math.round((descCount / repos.length) * 100) : 50;
    let starScore = stars > 50 ? 100 : stars > 10 ? 85 : stars > 0 ? 75 : 60;
    let diversityScore = languages.length > 5 ? 100 : languages.length > 2 ? 85 : 60;
    
    // Give a bonus up to 20 points for role-aligned repositories
    let typeBonus = alignedReposCount > 0 ? Math.min(20, alignedReposCount * 5) : 0;

    score = Math.round((repoScore * 0.3) + (readmeScore * 0.3) + (starScore * 0.2) + (diversityScore * 0.2)) + typeBonus;
    score = Math.max(0, Math.min(100, score));

    summary = `GitHub profile @${username} analyzed. Detected ${numRepos} public repositories with language portfolio including: ${languages.slice(0, 4).join(", ")}. Received ${stars} stars and ${forks} forks. README documentation coverage is ${readmeScore}%. Detected ${alignedReposCount} repositories aligned with the target role skills.`;
  } else {
    // Estimations based on resume text
    const projText = resumeSections.projectsText || "";
    const skillsText = resumeSections.skillsText || "";

    const countMatches = projText.match(/(?:^|\n)\s*(?:[•\-\*]|\d+\.)/g);
    numRepos = countMatches ? countMatches.length : 2;
    if (numRepos === 0 && projText.length > 50) numRepos = 2;

    const testLanguages = ["JavaScript", "TypeScript", "Python", "Java", "C++", "Go", "Rust", "Ruby", "PHP", "HTML", "CSS", "SQL", "R", "Excel"];
    for (const lang of testLanguages) {
      if (skillsText.toLowerCase().includes(lang.toLowerCase()) || projText.toLowerCase().includes(lang.toLowerCase())) {
        languages.push(lang);
      }
    }

    // Dynamically check if candidate's listed skills or projects align with target role skills
    const isAligned = allRoleSkills.some(skill => 
      projText.toLowerCase().includes(skill) || skillsText.toLowerCase().includes(skill)
    );
    let typeBonus = isAligned ? 15 : 0;

    let repoScore = numRepos >= 3 ? 85 : 70;
    let diversityScore = languages.length >= 3 ? 80 : 65;

    score = Math.round((repoScore * 0.5) + (diversityScore * 0.5)) + typeBonus;
    score = Math.max(0, Math.min(100, score));

    if (username) {
      summary = `Analyzed estimated metrics for @${username}. Based on projects, detected repositories utilizing ${languages.slice(0, 3).join(", ") || "technologies related to target role"}. Live API link was bypassed, scored locally.`;
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
    summary
  };
}

module.exports = {
  analyzeGithubData
};
