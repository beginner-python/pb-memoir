from typing import Protocol


class Embedder(Protocol):
    """テキストを固定次元ベクトルに変換する。"""

    model_name: str

    async def embed(self, texts: list[str]) -> list[list[float]]: ...
