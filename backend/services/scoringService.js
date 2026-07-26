/**
 * Calculate deterministic RepoLens Score (0-100 scale)
 * Weights:
 * - Code Quality: 25%
 * - Architecture: 20%
 * - Maintainability / Best Practices: 15%
 * - Documentation: 15%
 * - Security: 10%
 * - Testing: 10%
 * - Interview Readiness / Hygiene: 5%
 */
function calculateScore(analysisData) {
  if (!analysisData) return 65;

  const cq = (analysisData.codeQuality?.score ?? 6) * 10;
  const arch = (analysisData.architecture?.score ?? 6) * 10;
  const maint = (analysisData.maintainability?.score ?? 6) * 10;
  const doc = (analysisData.documentation?.score ?? 6) * 10;
  const sec = (analysisData.security?.score ?? 6) * 10;
  const test = (analysisData.testing?.score ?? 6) * 10;
  const ir = (analysisData.interviewReadiness?.score ?? 6) * 10;

  const score =
    cq * 0.25 +
    arch * 0.20 +
    maint * 0.15 +
    doc * 0.15 +
    sec * 0.10 +
    test * 0.10 +
    ir * 0.05;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getStatus(score) {
  if (score >= 90) return "Excellent (Production Ready)";
  if (score >= 80) return "Interview Ready";
  if (score >= 70) return "Good";
  if (score >= 60) return "Needs Improvement";
  return "Not Ready";
}

module.exports = { calculateScore, getStatus };