from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """環境変数(および backend/.env)から読み込むアプリ設定。"""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: Literal["local", "production"] = "local"

    # "openai": OpenAI API を呼ぶ(ローカル開発向け)
    # "mock":   外部 API を呼ばない。検索は動くが生成は定型文(公開デモ向け)
    llm_provider: Literal["openai", "mock"] = "mock"
    openai_api_key: str | None = None
    openai_chat_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    embedding_dim: int = 1536
    chunk_size: int = 800
    chunk_overlap: int = 120
    top_k: int = 5
    timezone: str = "Asia/Tokyo"  # 「今日」の基準
    suggestions_path: str = str(Path(__file__).parent / "data" / "suggestions.json")

    # 公開デモでは True。書き込み系 API を 403 にする
    read_only: bool = False

    # ローカルは docker の pgvector、本番は Supabase の接続文字列
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5434/memoir"

    cors_origins: str = "http://localhost:3000"

    # Supabase の共有プーラーは同時接続数が少ないため、本番では小さく設定する
    db_pool_size: int = 5
    db_max_overflow: int = 10

    # デプロイされたコミット。Render は RENDER_GIT_COMMIT を自動で設定する
    git_commit: str | None = Field(
        default=None, validation_alias=AliasChoices("GIT_COMMIT", "RENDER_GIT_COMMIT")
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
