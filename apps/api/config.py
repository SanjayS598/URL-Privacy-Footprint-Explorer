# Configuration settings for the API application.
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application settings loaded from environment variables.
    
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/privacy"
    redis_url: str = "redis://localhost:6379/0"
    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "artifacts"
    s3_public_base: str = "http://localhost:9000/artifacts"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
