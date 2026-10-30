from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "sqlite:///./bharat_ai.db"
    jwt_secret: str = "development-secret-change-me-bharat-ai-platform-2026-secure-key"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60 * 24


@lru_cache
def get_settings() -> Settings:
    return Settings()
