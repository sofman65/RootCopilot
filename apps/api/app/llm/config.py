from pathlib import Path
from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings

# Absolute path so Settings loads .env regardless of CWD
_ENV_FILE = Path(__file__).parents[2] / ".env"


class Settings(BaseSettings):
    # Anthropic (primary) — optional so tests / mock mode don't require a real key
    anthropic_api_key: Optional[str] = None
    primary_model: str = "claude-sonnet-4-6"
    fallback_model: str = "claude-haiku-4-5-20251001"

    # OpenAI (fallback)
    openai_api_key: Optional[str] = None

    # LangSmith — matches LANGSMITH_* keys in .env
    langchain_tracing_v2: bool = True
    langsmith_api_key: str = ""
    langsmith_project: str = "rootcopilot"

    # Application
    app_env: str = "development"
    log_level: str = "INFO"
    rate_limit: str = "20/minute"
    cache_ttl_seconds: int = 300
    max_retries: int = 3

    # When True, LLMSubsystem uses MockAnalysisAgent (no network).
    # Default False (production); test conftest forces True.
    use_mock_llm: bool = False

    model_config = {"env_file": str(_ENV_FILE), "extra": "ignore"}

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
