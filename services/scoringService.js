function calculateScore(data) {
  const {
    codeQuality,
    readability,
    bestPractices,
    documentation
  } = data;

  const score =
    codeQuality * 0.4 +
    readability * 0.2 +
    bestPractices * 0.2 +
    documentation * 0.2;

  return Number(score.toFixed(1));
}

function getStatus(score) {
  if (score >= 8) return "Excellent (Production Ready)";
  if (score >= 6) return "Good (Interview Ready)";
  if (score >= 4) return "Average (Needs Improvement)";
  return "Poor (Not Ready)";
}

module.exports = { calculateScore, getStatus };