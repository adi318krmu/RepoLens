const fs = require("fs/promises");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
const dataFile = path.join(dataDir, "local-db.json");

const defaultData = {
  users: [],
  analyses: []
};

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(dataFile);
  } catch (_error) {
    await fs.writeFile(dataFile, JSON.stringify(defaultData, null, 2), "utf8");
  }
}

async function readData() {
  await ensureStore();
  const content = await fs.readFile(dataFile, "utf8");
  return JSON.parse(content);
}

async function writeData(data) {
  await ensureStore();
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2), "utf8");
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

async function findUserByEmail(email) {
  const data = await readData();
  return data.users.find((user) => user.email === email.toLowerCase()) ?? null;
}

async function findUserById(id) {
  const data = await readData();
  return data.users.find((user) => user._id === id) ?? null;
}

async function createUser({ name, email, password }) {
  const data = await readData();
  const now = new Date().toISOString();
  const user = {
    _id: makeId("user"),
    name,
    email: email.toLowerCase(),
    password,
    verified: false,
    verificationOTP: null,
    verificationOTPExpires: null,
    resetOTP: null,
    resetOTPExpires: null,
    createdAt: now,
    updatedAt: now
  };

  data.users.push(user);
  await writeData(data);
  return user;
}

async function createAnalysis({ userId = null, repoUrl, score, status, analysis }) {
  const data = await readData();
  const now = new Date().toISOString();
  const entry = {
    _id: makeId("analysis"),
    userId,
    repoUrl,
    score,
    status,
    analysis,
    createdAt: now,
    updatedAt: now
  };

  data.analyses.push(entry);
  await writeData(data);
  return entry;
}

async function getHistory(userId) {
  const data = await readData();
  const filtered = userId
    ? data.analyses.filter((entry) => entry.userId === userId)
    : data.analyses;

  return [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function createResumeAnalysis({ userId = null, targetRole, targetCompany = "", jobDescription = "", atsScore, eligibility, verdict, analysis }) {
  const data = await readData();
  if (!data.resumeAnalyses) {
    data.resumeAnalyses = [];
  }
  const now = new Date().toISOString();
  const entry = {
    _id: makeId("resume_analysis"),
    userId,
    targetRole,
    targetCompany,
    jobDescription,
    atsScore,
    eligibility,
    verdict,
    analysis,
    createdAt: now,
    updatedAt: now
  };

  data.resumeAnalyses.push(entry);
  await writeData(data);
  return entry;
}

async function getResumeHistory(userId) {
  const data = await readData();
  if (!data.resumeAnalyses) {
    return [];
  }
  const filtered = userId
    ? data.resumeAnalyses.filter((entry) => entry.userId === userId)
    : data.resumeAnalyses;

  return [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function updateUserProfilePicture(id, profilePicture) {
  const data = await readData();
  const index = data.users.findIndex((user) => user._id === id);
  if (index === -1) return null;
  data.users[index].profilePicture = profilePicture;
  data.users[index].updatedAt = new Date().toISOString();
  await writeData(data);
  return data.users[index];
}

async function updateUserFields(id, fields) {
  const data = await readData();
  const index = data.users.findIndex((user) => user._id === id);
  if (index === -1) return null;
  data.users[index] = { ...data.users[index], ...fields, updatedAt: new Date().toISOString() };
  await writeData(data);
  return data.users[index];
}

async function updateUserByEmailFields(email, fields) {
  const data = await readData();
  const index = data.users.findIndex((user) => user.email === email.toLowerCase());
  if (index === -1) return null;
  data.users[index] = { ...data.users[index], ...fields, updatedAt: new Date().toISOString() };
  await writeData(data);
  return data.users[index];
}

module.exports = {
  createAnalysis,
  createUser,
  findUserByEmail,
  findUserById,
  getHistory,
  createResumeAnalysis,
  getResumeHistory,
  updateUserProfilePicture,
  updateUserFields,
  updateUserByEmailFields
};
