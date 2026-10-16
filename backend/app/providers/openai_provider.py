import json
import logging
from collections.abc import AsyncIterator
from datetime import date

from openai import AsyncOpenAI

from app.providers.prompts import (
    ANSWER_SYSTEM_PROMPT,
    EXTRACTION_JSON_SCHEMA,
    EXTRACTION_SYSTEM_PROMPT,
    build_answer_user_message,
)
from app.schemas import ChatMessage, SearchResult
from app.services.temporal import Extraction, postprocess

logger = logging.getLogger(__name__)


class OpenAIEmbedder:
    def __init__(self, client: AsyncOpenAI, model: str, dim: int) -> None:
        self._client = client
        self.model_name = model
        self._dim = dim

    async def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        res = await self._client.embeddings.create(
            model=self.model_name, input=texts, dimensions=self._dim
        )
        ordered = sorted(res.data, key=lambda d: d.index)  # index 順は保証されないので並べ直す
        return [d.embedding for d in ordered]


class OpenAIDateExtractor:
    """質問から時期と意味検索用の質問を Structured Outputs で 1 回の呼び出しで取り出す。"""

    def __init__(self, client: AsyncOpenAI, model: str) -> None:
        self._client = client
        self.model_name = model

    async def extract(self, question: str, today: date) -> Extraction | None:
        try:
            res = await self._client.chat.completions.create(
                model=self.model_name,
                temperature=0,
                messages=[
                    {
                        "role": "system",
                        "content": EXTRACTION_SYSTEM_PROMPT.format(today=today.isoformat()),
                    },
                    {"role": "user", "content": question},
                ],
                response_format={"type": "json_schema", "json_schema": EXTRACTION_JSON_SCHEMA},
                timeout=15,
            )
            content = res.choices[0].message.content or ""
            raw = json.loads(content)
        except Exception:  # noqa: BLE001 - 抽出失敗は「時期なし」に落として検索は続ける
            logger.exception("時期抽出に失敗しました。全期間で検索します")
            return None
        return postprocess(raw, question, today, source="llm", as_of=today)


class OpenAILLM:
    def __init__(self, client: AsyncOpenAI, model: str) -> None:
        self._client = client
        self.model_name = model

    async def stream(
        self, question: str, history: list[ChatMessage], result: SearchResult
    ) -> AsyncIterator[str]:
        messages: list[dict[str, str]] = [{"role": "system", "content": ANSWER_SYSTEM_PROMPT}]
        messages.extend({"role": m.role, "content": m.content} for m in history)
        messages.append(
            {"role": "user", "content": build_answer_user_message(question, result.items)}
        )
        stream = await self._client.chat.completions.create(
            model=self.model_name,
            messages=messages,  # type: ignore[arg-type]
            temperature=0.2,
            stream=True,
        )
        async for event in stream:
            if not event.choices:
                continue
            delta = event.choices[0].delta.content
            if delta:
                yield delta
