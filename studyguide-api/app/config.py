"""Application settings loaded from environment / .env."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    groq_api_key: str = "your_groq_api_key_here"
    groq_model: str = "llama-3.3-70b-versatile"
    database_url: str = (
        "postgresql+psycopg://postgres:systemadmin@localhost:5433/studyguide"
    )
    frontend_origin: str = "http://localhost:5173"

    # Embedding model (local, free). 384-dim output.
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dim: int = 384

    # Chunking
    chunk_size: int = 800
    chunk_overlap: int = 120

    @property
    def groq_configured(self) -> bool:
        return bool(self.groq_api_key) and self.groq_api_key != "your_groq_api_key_here"


settings = Settings()
