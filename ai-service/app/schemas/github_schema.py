from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# Request Schemas
class FileContentItem(BaseModel):
    path: str
    content: str

class RepositoryMetadata(BaseModel):
    stars: Optional[int] = 0
    forks: Optional[int] = 0
    openIssues: Optional[int] = 0
    defaultBranch: Optional[str] = "main"
    isPrivate: Optional[bool] = False
    updatedAt: Optional[str] = ""

class RepositoryInfo(BaseModel):
    owner: str
    name: str
    description: Optional[str] = ""
    primaryLanguage: Optional[str] = ""
    languages: Optional[Dict[str, Any]] = Field(default_factory=dict)
    metadata: Optional[RepositoryMetadata] = Field(default_factory=RepositoryMetadata)

class GitHubAnalysisRequest(BaseModel):
    repository: RepositoryInfo
    readme: Optional[str] = ""
    fileTree: Optional[List[str]] = Field(default_factory=list)
    importantFiles: Optional[List[FileContentItem]] = Field(default_factory=list)
    configurationFiles: Optional[List[FileContentItem]] = Field(default_factory=list)
    staticSignals: Optional[Dict[str, Any]] = Field(default_factory=dict)

# Response Sub-Schemas
class DetectedStack(BaseModel):
    languages: List[str] = Field(default_factory=list)
    frameworks: List[str] = Field(default_factory=list)
    databases: List[str] = Field(default_factory=list)
    tools: List[str] = Field(default_factory=list)
    confidence: float = 0.9

class CategoryEvaluation(BaseModel):
    score: float = 0.0
    strengths: List[str] = Field(default_factory=list)
    issues: List[str] = Field(default_factory=list)

class InterviewReadiness(BaseModel):
    score: float = 0.0
    reason: str = ""

class RecommendationItem(BaseModel):
    title: str
    category: str
    priority: str = "medium"  # high, medium, low
    reason: str
    suggestion: str
    evidence: List[str] = Field(default_factory=list)

class ConfidenceScore(BaseModel):
    score: int = 85
    level: str = "High"  # High, Medium, Low

class GitHubAnalysisOutput(BaseModel):
    detectedStack: DetectedStack
    codeQuality: CategoryEvaluation
    architecture: CategoryEvaluation
    documentation: CategoryEvaluation
    testing: CategoryEvaluation
    security: CategoryEvaluation
    maintainability: CategoryEvaluation
    interviewReadiness: InterviewReadiness
    strengths: List[str] = Field(default_factory=list)
    criticalIssues: List[str] = Field(default_factory=list)
    recommendations: List[RecommendationItem] = Field(default_factory=list)
    confidenceScore: ConfidenceScore
    aiAvailable: bool = True
    aiError: Optional[str] = None

class GitHubAnalysisResponse(BaseModel):
    success: bool = True
    analysis: GitHubAnalysisOutput
