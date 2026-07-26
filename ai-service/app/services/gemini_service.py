import json
import re
import logging
from typing import Dict, Any, Optional
import google.generativeai as genai
from app.core.config import settings

logger = logging.getLogger("repolens.gemini")

class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL or "gemini-2.0-flash"
        self._initialized = False
        self._init_client()

    def _init_client(self):
        if self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                self._initialized = True
                logger.info(f"Gemini client initialized successfully with model {self.model_name}")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini client: {e}")
                self._initialized = False
        else:
            logger.warning("GEMINI_API_KEY is not configured in settings")

    def _clean_json_string(self, text: str) -> str:
        cleaned = re.sub(r'```json\s*', '', text)
        cleaned = re.sub(r'```\s*$', '', cleaned)
        cleaned = cleaned.strip()
        return cleaned

    def generate_json(self, prompt: str, temperature: float = 0.2) -> Optional[Dict[str, Any]]:
        if not self._initialized:
            # Re-attempt initialization if settings were updated
            self.api_key = settings.GEMINI_API_KEY
            self._init_client()
            if not self._initialized:
                raise ValueError("GEMINI_API_KEY is missing or invalid")

        try:
            model = genai.GenerativeModel(
                model_name=self.model_name,
                generation_config={
                    "response_mime_type": "application/json",
                    "temperature": temperature
                }
            )

            logger.info("Executing Gemini AI request...")
            response = model.generate_content(prompt)
            
            if not response or not response.text:
                raise ValueError("Empty response received from Gemini model")

            cleaned_text = self._clean_json_string(response.text)
            
            try:
                data = json.loads(cleaned_text)
                return data
            except json.JSONDecodeError as json_err:
                logger.warning(f"Initial JSON parse failed, attempting regex extraction: {json_err}")
                match = re.search(r'\{[\s\S]*\}', cleaned_text)
                if match:
                    return json.loads(match.group(0))
                raise json_err

        except Exception as e:
            logger.error(f"Gemini API Error: {str(e)}")
            raise e

gemini_service = GeminiService()
