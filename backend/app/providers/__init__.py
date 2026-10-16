from functools import lru_cache

from app.config import get_settings
from app.providers.base import LLM, DateExtractor, Embedder


def _openai_client():
    from openai import AsyncOpenAI

    return AsyncOpenAI(api_key=get_settings().openai_api_key)


@lru_cache
def get_embedder() -> Embedder:
    s = get_settings()
    if s.llm_provider == "openai":
        from app.providers.openai_provider import OpenAIEmbedder

        return OpenAIEmbedder(_openai_client(), s.openai_embedding_model, s.embedding_dim)
    from app.providers.mock_provider import MockEmbedder

    return MockEmbedder(s.embedding_dim)


@lru_cache
def get_date_extractor() -> DateExtractor:
    s = get_settings()
    if s.llm_provider == "openai":
        from app.providers.openai_provider import OpenAIDateExtractor

        return OpenAIDateExtractor(_openai_client(), s.openai_chat_model)
    from app.providers.mock_provider import CachedDateExtractor

    return CachedDateExtractor(s.suggestions_path)


@lru_cache
def get_llm() -> LLM:
    s = get_settings()
    if s.llm_provider == "openai":
        from app.providers.openai_provider import OpenAILLM

        return OpenAILLM(_openai_client(), s.openai_chat_model)
    from app.providers.mock_provider import MockLLM

    return MockLLM()
