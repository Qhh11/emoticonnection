"""
Configuration module for EmotiConnect backend.
Manages environment variables and application settings.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    TODO: Add your configuration variables here:
    - Database connection strings
    - LLM API keys and endpoints
    - JWT secret keys
    - CORS origins
    - WebSocket settings
    """

    # Application
    app_name: str = "EmotiConnect"
    debug: bool = True

    # Database
    # TODO: Configure your database URL
    database_url: str = "sqlite:///./emoticonnect.db"

    # LLM API
    # TODO: Add your LLM provider API keys
    llm_api_key: str = ""
    llm_api_endpoint: str = ""

    # Security
    # TODO: Generate a secure secret key for JWT tokens
    secret_key: str = "your-secret-key-here-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # CORS
    # TODO: Configure allowed origins for your frontend
    cors_origins: list = ["http://localhost:3000"]

    class Config:
        env_file = ".env"


# Global settings instance
settings = Settings()
