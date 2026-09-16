"""Application settings loaded from environment variables."""

from dotenv import load_dotenv
load_dotenv()

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """Project settings — values are read from .env at the backend/ root."""

    database_url: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
