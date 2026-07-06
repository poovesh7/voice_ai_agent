from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    groq_model: str = Field(
        default="meta-llama/llama-4-scout-17b-16e-instruct",
        alias="GROQ_MODEL",
    )
    groq_stt_model: str = Field(default="whisper-large-v3-turbo", alias="GROQ_STT_MODEL")
    groq_tts_model: str = Field(default="canopylabs/orpheus-v1-english", alias="GROQ_TTS_MODEL")
    database_url: str = Field(
        default="postgresql+asyncpg://user:password@localhost:5432/voice_assistant",
        alias="DATABASE_URL",
    )
    cors_origins: str = Field(default="http://localhost:5173", alias="CORS_ORIGINS")
    assistant_name: str = Field(default="Jarvis", alias="ASSISTANT_NAME")
    enable_groq_tts: bool = Field(default=False, alias="ENABLE_GROQ_TTS")
    enable_web_search: bool = Field(default=True, alias="ENABLE_WEB_SEARCH")
    web_search_timeout_seconds: float = Field(default=4.0, alias="WEB_SEARCH_TIMEOUT_SECONDS")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
