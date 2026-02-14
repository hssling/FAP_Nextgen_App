from pydantic import BaseModel
import os


class Settings(BaseModel):
    app_name: str = "FAP Micro AI Service"
    media_root: str = os.getenv("MICRO_AI_MEDIA_ROOT", "/tmp/micro_ai_media")
    redis_url: str = os.getenv("MICRO_AI_REDIS_URL", "redis://redis:6379/0")
    results_root: str = os.getenv("MICRO_AI_RESULTS_ROOT", "/tmp/micro_ai_results")
    max_upload_mb: int = int(os.getenv("MICRO_AI_MAX_UPLOAD_MB", "25"))


settings = Settings()
