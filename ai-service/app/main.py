import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("repolens.main")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Dedicated AI Microservice for RepoLens Code & Resume Analysis",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.github import router as github_router
app.include_router(github_router)

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "repolens-ai"
    }

@app.get("/")
def root():
    return {
        "message": "RepoLens AI Microservice API",
        "health": "/health"
    }
