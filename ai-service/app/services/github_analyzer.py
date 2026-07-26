import logging
import time
from typing import Dict, Any
from app.schemas.github_schema import (
    GitHubAnalysisRequest, GitHubAnalysisOutput, GitHubAnalysisResponse,
    DetectedStack, CategoryEvaluation, InterviewReadiness, RecommendationItem, ConfidenceScore
)
from app.services.static_analyzer import static_analyzer
from app.services.gemini_service import gemini_service
from app.prompts.github_prompt import build_github_analysis_prompt

logger = logging.getLogger("repolens.github_analyzer")

class GitHubAnalyzer:
    def analyze_repository(self, request: GitHubAnalysisRequest) -> GitHubAnalysisResponse:
        start_time = time.time()
        logger.info(f"Received GitHub analysis request for {request.repository.owner}/{request.repository.name}")

        # 1. Run Static Analysis & Stack Detection
        static_res = static_analyzer.analyze(request)
        logger.info(f"Static analysis completed for {request.repository.name}")

        # Compute Evidence Confidence
        file_count = len(request.fileTree or [])
        has_readme = bool(request.readme and len(request.readme.strip()) > 50)
        has_files = len(request.importantFiles or []) > 0
        has_config = len(request.configurationFiles or []) > 0

        if file_count > 10 and has_readme and has_files and has_config:
            confidence_val = 90
            confidence_lvl = "High"
        elif file_count > 3 and (has_readme or has_files):
            confidence_val = 70
            confidence_lvl = "Medium"
        else:
            confidence_val = 40
            confidence_lvl = "Low"

        # 2. Attempt Gemini AI Evaluation
        ai_available = True
        ai_error_msg = None
        raw_ai_data = None

        try:
            prompt = build_github_analysis_prompt(request, static_res)
            logger.info("Starting Gemini AI request...")
            raw_ai_data = gemini_service.generate_json(prompt)
            logger.info("Gemini AI request completed successfully")
        except Exception as e:
            logger.error(f"Gemini AI evaluation failed: {e}")
            ai_available = False
            ai_error_msg = f"AI analysis temporarily unavailable: {str(e)}"

        # 3. Assemble Output (Hybrid approach)
        if ai_available and raw_ai_data:
            output = self._build_hybrid_output(raw_ai_data, static_res, confidence_val, confidence_lvl)
        else:
            output = self._build_static_fallback_output(static_res, confidence_val, confidence_lvl, ai_error_msg)

        duration = time.time() - start_time
        logger.info(f"Analysis completed in {duration:.2f}s for {request.repository.name}")

        return GitHubAnalysisResponse(success=True, analysis=output)

    def _build_hybrid_output(
        self, ai: Dict[str, Any], static_res: Dict[str, Any],
        conf_score: int, conf_lvl: str
    ) -> GitHubAnalysisOutput:
        stack = static_res["stack"]

        # Parse AI category evaluations (scale 0-10)
        cq = ai.get("codeQuality", {})
        arch = ai.get("architecture", {})
        doc = ai.get("documentation", {})
        test = ai.get("testing", {})
        sec = ai.get("security", {})
        maint = ai.get("maintainability", {})
        ir = ai.get("interviewReadiness", {})

        # Map recommendations
        recs = []
        for r in ai.get("recommendations", []):
            if isinstance(r, dict) and "title" in r and "suggestion" in r:
                recs.append(RecommendationItem(
                    title=r.get("title", "Recommendation"),
                    category=r.get("category", "General"),
                    priority=r.get("priority", "medium").lower(),
                    reason=r.get("reason", ""),
                    suggestion=r.get("suggestion", ""),
                    evidence=r.get("evidence", []) if isinstance(r.get("evidence"), list) else []
                ))

        return GitHubAnalysisOutput(
            detectedStack=stack,
            codeQuality=CategoryEvaluation(
                score=float(cq.get("score", 6.5)),
                strengths=cq.get("strengths", []),
                issues=cq.get("issues", [])
            ),
            architecture=CategoryEvaluation(
                score=float(arch.get("score", 6.0)),
                strengths=arch.get("strengths", []),
                issues=arch.get("issues", [])
            ),
            documentation=CategoryEvaluation(
                score=float(doc.get("score", static_res["documentation"]["score"] / 10.0)),
                strengths=static_res["documentation"]["evidence"],
                issues=doc.get("issues", [])
            ),
            testing=CategoryEvaluation(
                score=float(test.get("score", static_res["testing"]["score"] / 10.0)),
                strengths=static_res["testing"]["evidence"],
                issues=test.get("issues", [])
            ),
            security=CategoryEvaluation(
                score=float(sec.get("score", static_res["security"]["score"] / 10.0)),
                strengths=static_res["security"]["evidence"],
                issues=sec.get("issues", static_res["security"]["issues"])
            ),
            maintainability=CategoryEvaluation(
                score=float(maint.get("score", 6.0)),
                strengths=static_res["structure"]["evidence"],
                issues=maint.get("issues", [])
            ),
            interviewReadiness=InterviewReadiness(
                score=float(ir.get("score", 6.0)),
                reason=str(ir.get("reason", "Codebase exhibits standard patterns."))
            ),
            strengths=ai.get("strengths", static_res["structure"]["evidence"]),
            criticalIssues=ai.get("criticalIssues", static_res["security"]["issues"]),
            recommendations=recs,
            confidenceScore=ConfidenceScore(score=conf_score, level=conf_lvl),
            aiAvailable=True,
            aiError=None
        )

    def _build_static_fallback_output(
        self, static_res: Dict[str, Any], conf_score: int, conf_lvl: str, error_msg: str
    ) -> GitHubAnalysisOutput:
        stack = static_res["stack"]
        
        doc_score = static_res["documentation"]["score"] / 10.0
        test_score = static_res["testing"]["score"] / 10.0
        sec_score = static_res["security"]["score"] / 10.0
        struct_score = static_res["structure"]["score"] / 10.0
        hygiene_score = static_res["hygiene"]["score"] / 10.0

        return GitHubAnalysisOutput(
            detectedStack=stack,
            codeQuality=CategoryEvaluation(
                score=struct_score,
                strengths=static_res["structure"]["evidence"],
                issues=["AI evaluation unavailable; based on static modularity."]
            ),
            architecture=CategoryEvaluation(
                score=struct_score,
                strengths=static_res["structure"]["evidence"],
                issues=[]
            ),
            documentation=CategoryEvaluation(
                score=doc_score,
                strengths=static_res["documentation"]["evidence"],
                issues=["Documentation incomplete"] if doc_score < 6 else []
            ),
            testing=CategoryEvaluation(
                score=test_score,
                strengths=static_res["testing"]["evidence"],
                issues=["No unit or integration tests detected"] if test_score < 5 else []
            ),
            security=CategoryEvaluation(
                score=sec_score,
                strengths=static_res["security"]["evidence"],
                issues=static_res["security"]["issues"]
            ),
            maintainability=CategoryEvaluation(
                score=hygiene_score,
                strengths=static_res["hygiene"]["evidence"],
                issues=[]
            ),
            interviewReadiness=InterviewReadiness(
                score=round((doc_score + test_score + struct_score) / 3.0, 1),
                reason="Static evaluation performed while AI reasoning is unavailable."
            ),
            strengths=static_res["documentation"]["evidence"] + static_res["structure"]["evidence"],
            criticalIssues=static_res["security"]["issues"],
            recommendations=[
                RecommendationItem(
                    title="Add automated tests",
                    category="Testing",
                    priority="high",
                    reason="No test suite detected in static analysis",
                    suggestion="Add unit test framework (e.g. Jest or Pytest) and test files.",
                    evidence=[]
                )
            ] if test_score < 5 else [],
            confidenceScore=ConfidenceScore(score=conf_score, level=conf_lvl),
            aiAvailable=False,
            aiError=error_msg
        )

github_analyzer = GitHubAnalyzer()
