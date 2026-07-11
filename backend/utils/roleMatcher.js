const axios = require("axios");

// Custom technical synonyms mapping
function computeLocalSimilarity(str1, str2) {
  const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const s1 = clean(str1);
  const s2 = clean(str2);

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

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

async function getClosestRole(enteredRole, knownRoles) {
  const normalizedEntered = (enteredRole || "").trim().toLowerCase();
  if (!normalizedEntered) return knownRoles[0]; // fallback to first role if empty

  // 1. Check exact or direct match (case-insensitive)
  for (const role of knownRoles) {
    if (normalizedEntered === role.toLowerCase()) {
      return role;
    }
  }

  // 2. Check substring matching
  for (const role of knownRoles) {
    const roleLower = role.toLowerCase();
    if (normalizedEntered.includes(roleLower) || roleLower.includes(normalizedEntered)) {
      return role;
    }
  }

  // Common mapping overrides
  const overrides = {
    "mern stack developer": "frontend developer",
    "fullstack developer": "software engineer",
    "full stack developer": "software engineer",
    "web developer": "software engineer",
    "software developer": "software engineer",
    "ml engineer": "machine learning engineer",
    "sales manager": "sales executive",
    "hr manager": "hr executive",
    "marketing manager": "marketing executive"
  };

  if (overrides[normalizedEntered]) {
    for (const role of knownRoles) {
      if (role.toLowerCase() === overrides[normalizedEntered]) {
        return role;
      }
    }
  }

  // Keyword-based smart mapping rules
  if (normalizedEntered.includes("backend")) {
    const found = knownRoles.find(r => r.toLowerCase() === "backend developer");
    if (found) return found;
  }
  if (normalizedEntered.includes("frontend")) {
    const found = knownRoles.find(r => r.toLowerCase() === "frontend developer");
    if (found) return found;
  }
  if (normalizedEntered.includes("full stack") || normalizedEntered.includes("fullstack")) {
    const found = knownRoles.find(r => r.toLowerCase() === "software engineer");
    if (found) return found;
  }
  if (normalizedEntered.includes("ml") || normalizedEntered.includes("machine learning")) {
    const found = knownRoles.find(r => r.toLowerCase() === "machine learning engineer");
    if (found) return found;
  }
  if (normalizedEntered.includes("ai") || normalizedEntered.includes("artificial intelligence")) {
    const found = knownRoles.find(r => r.toLowerCase() === "ai engineer");
    if (found) return found;
  }
  if (normalizedEntered.includes("data scientist") || normalizedEntered.includes("science")) {
    const found = knownRoles.find(r => r.toLowerCase() === "data scientist");
    if (found) return found;
  }
  if (normalizedEntered.includes("data analyst") || normalizedEntered.includes("analytics")) {
    const found = knownRoles.find(r => r.toLowerCase() === "data analyst");
    if (found) return found;
  }
  if (normalizedEntered.includes("business analyst")) {
    const found = knownRoles.find(r => r.toLowerCase() === "business analyst");
    if (found) return found;
  }
  if (normalizedEntered.includes("product")) {
    const found = knownRoles.find(r => r.toLowerCase() === "product manager");
    if (found) return found;
  }
  if (normalizedEntered.includes("sales")) {
    const found = knownRoles.find(r => r.toLowerCase() === "sales executive");
    if (found) return found;
  }
  if (normalizedEntered.includes("marketing")) {
    const found = knownRoles.find(r => r.toLowerCase() === "marketing executive");
    if (found) return found;
  }
  if (normalizedEntered.includes("hr") || normalizedEntered.includes("human resource") || normalizedEntered.includes("recruiter")) {
    const found = knownRoles.find(r => r.toLowerCase() === "hr executive");
    if (found) return found;
  }
  if (normalizedEntered.includes("designer") || normalizedEntered.includes("ui") || normalizedEntered.includes("ux")) {
    const found = knownRoles.find(r => r.toLowerCase() === "ui/ux designer");
    if (found) return found;
  }

  // 3. Try Hugging Face embeddings with cosine similarity
  const token = process.env.HF_TOKEN;
  if (token) {
    try {
      const enteredEmbedding = await getEmbedding(enteredRole);
      if (enteredEmbedding) {
        let bestRole = null;
        let maxSimilarity = -Infinity;

        for (const role of knownRoles) {
          const roleEmbedding = await getEmbedding(role);
          if (roleEmbedding) {
            const similarity = cosineSimilarity(enteredEmbedding, roleEmbedding);
            if (similarity > maxSimilarity) {
              maxSimilarity = similarity;
              bestRole = role;
            }
          }
        }

        if (bestRole && maxSimilarity > 0.4) {
          console.log(`Mapped entered role "${enteredRole}" to "${bestRole}" using HF embeddings with similarity ${maxSimilarity.toFixed(4)}`);
          return bestRole;
        }
      }
    } catch (err) {
      console.warn("Hugging Face embedding role mapping failed, falling back to local similarity:", err.message);
    }
  }

  // 4. Local similarity fallback (bigram Jaccard)
  let bestRole = knownRoles[0];
  let maxSim = -Infinity;
  for (const role of knownRoles) {
    const sim = computeLocalSimilarity(normalizedEntered, role.toLowerCase());
    if (sim > maxSim) {
      maxSim = sim;
      bestRole = role;
    }
  }

  console.log(`Mapped entered role "${enteredRole}" to "${bestRole}" using local similarity fallback with score ${maxSim.toFixed(4)}`);
  return bestRole;
}

module.exports = {
  getClosestRole,
  computeLocalSimilarity,
  cosineSimilarity,
  getEmbedding
};
