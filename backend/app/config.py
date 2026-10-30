import os
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


def get_default_db_url() -> str:
    # If running on Vercel or AWS Lambda, the root filesystem is read-only (/var/task).
    # We must store SQLite in /tmp where write access is permitted.
    is_serverless = bool(
        os.environ.get("VERCEL")
        or os.environ.get("AWS_LAMBDA_FUNCTION_NAME")
        or os.environ.get("LAMBDA_TASK_ROOT")
    )
    if is_serverless:
        return "sqlite:////tmp/bharat_ai.db"
    try:
        test_file = Path("./.write_test")
        test_file.touch()
        test_file.unlink()
        return "sqlite:///./bharat_ai.db"
    except Exception:
        return "sqlite:////tmp/bharat_ai.db"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = get_default_db_url()
    jwt_secret: str = "development-secret-change-me-bharat-ai-platform-2026-secure-key"
    cors_origins: str = "*"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60 * 24


@lru_cache
def get_settings() -> Settings:
    return Settings()
