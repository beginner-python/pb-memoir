from collections.abc import AsyncIterator
from datetime import date
from typing import Protocol

from app.schemas import ChatMessage, SearchResult
from app.services.temporal import Extraction


class Embedder(Protocol):
    """テキストを固定次元ベクトルに変換する。"""

    model_name: str

    async def embed(self, texts: list[str]) -> list[list[float]]: ...


class DateExtractor(Protocol):
    """質問から時期(日付範囲)と意味検索用の質問を取り出す。時期が無ければ None。"""

    async def extract(self, question: str, today: date) -> Extraction | None: ...


class LLM(Protocol):
    """検索結果を根拠に回答をストリーム生成する。"""

    model_name: str

    def stream(
        self, question: str, history: list[ChatMessage], result: SearchResult
    ) -> AsyncIterator[str]: ...
