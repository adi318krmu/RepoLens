from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.github_schema import GitHubAnalysisRequest, GitHubAnalysisResponse
from app.api.deps import verify_internal_api_key
from app.services.github_analyzer import github_analyzer

router = APIRouter(prefix="/api/v1/analyze", tags=["GitHub Analysis"])

@router.post("/github", response_model=GitHubAnalysisResponse)
async def analyze_github_repository(
    request: GitHubAnalysisRequest,
    api_key: str = Depends(verify_internal_api_key)
):
    try:
        response = github_analyzer.analyze_repository(request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"GitHub repository analysis failed: {str(e)}"
        )
