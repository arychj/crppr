from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
import os


class Settings(BaseSettings):
    db_type: str = "sqlite"
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "crppr"
    db_user: str = ""
    db_password: str = ""

    model_config = {
        "env_prefix": "CRPPR_",
        "env_file": os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
    }

    @property
    def database_url(self) -> str:
        if self.db_type == "sqlite":
            return f"sqlite:///{self.db_name}.db"
        return (
            f"{self.db_type}://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
