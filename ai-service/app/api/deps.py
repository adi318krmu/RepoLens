from fastapi import Header, HTTPException, status
from app.core.config import settings

async def verify_internal_api_key(
    x_internal_api_key: str = Header(None, alias="X-Internal-API-Key")
):
    if not settings.AI_SERVICE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI_SERVICE_API_KEY is not configured on server"
        )
        
    if not x_internal_api_key or x_internal_api_key != settings.AI_SERVICE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Internal-API-Key header"
        )
    return x_internal_api_key
