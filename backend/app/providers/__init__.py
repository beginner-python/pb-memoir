from functools import lru_cache

from app.config import get_settings
from app.providers.base import Embedder


@lru_cache
def get_embedder() -> Embedder:
    s = get_settings()
    if s.llm_provider == "openai":
        from openai import AsyncOpenAI

        from app.providers.openai_provider import OpenAIEmbedder

        return OpenAIEmbedder(
            AsyncOpenAI(api_key=s.openai_api_key), s.openai_embedding_model, s.embedding_dim
        )
    from app.providers.mock_provider import MockEmbedder

    return MockEmbedder(s.embedding_dim)
