"""外部 API を呼ばないモック実装(公開デモ用)。

埋め込みは、文字 3-gram と英数字の単語を特徴ハッシュで固定次元に写した決定的なベクトル。
語彙の重なりが cosine 類似度に反映されるため、日本語でも検索(Retrieval)は実際に機能する。
意味的な類似(「犬」と「ワンちゃん」)は拾えないが、費用ゼロで RAG の流れを示す目的には十分。
"""

import hashlib
import math
import re
from collections import Counter

_WORD_RE = re.compile(r"[a-z0-9_]+")
_SPACE_RE = re.compile(r"\s+")


class MockEmbedder:
    model_name = "mock-hashed-trigram"

    def __init__(self, dim: int) -> None:
        self._dim = dim

    @staticmethod
    def _tokens(text: str) -> list[str]:
        t = _SPACE_RE.sub(" ", text.lower()).strip()
        if not t:
            return []
        grams = [t[i : i + 3] for i in range(max(len(t) - 2, 1))]
        return grams + _WORD_RE.findall(t)

    def embed_one(self, text: str) -> list[float]:
        vec = [0.0] * self._dim
        for tok, count in Counter(self._tokens(text)).items():
            h = hashlib.blake2b(tok.encode("utf-8"), digest_size=8).digest()
            idx = int.from_bytes(h[:4], "little") % self._dim
            sign = 1.0 if h[4] & 1 else -1.0
            vec[idx] += sign * (1.0 + math.log(count))  # sublinear TF
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return [self.embed_one(t) for t in texts]
