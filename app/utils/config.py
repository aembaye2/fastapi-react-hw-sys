from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_database: str = "quizdb"

    secret_key: str = "a_very_secret_key_that_should_be_in_an_env_file"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    debug: bool = False
    environment: str = "development"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore"
    }


@lru_cache()
def get_settings():
    return Settings()