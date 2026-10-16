"""外部 API を呼ばないモック実装(公開デモ用)。

- MockEmbedder:        文字 3-gram と単語を特徴ハッシュで固定次元に写した決定的ベクトル。
                       語彙の重なりが cosine 類似度に反映されるため、検索は実際に機能する。
                       意味的な類似(「犬」と「ワンちゃん」)は拾えない。
- CachedDateExtractor: ローカルで LLM に抽出させた結果(suggestions.json)を、
                       質問文の完全一致で再生する。
- MockLLM:             取得した日記を引用する定型文を、数文字ずつ疑似ストリームで返す。
"""

import asyncio
import hashlib
import json
import math
import re
from collections import Counter
from collections.abc import AsyncIterator
from datetime import date
from pathlib import Path

from app.providers.prompts import format_date_ja
from app.schemas import ChatMessage, SearchResult
from app.services.temporal import Extraction, normalize_question, postprocess

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


class CachedDateExtractor:
    """suggestions.json に保存された LLM の抽出結果を、正規化した質問文の完全一致で返す。"""

    def __init__(self, path: str | Path) -> None:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        self.generated_at = date.fromisoformat(data["generated_at"])
        self.questions: list[str] = [item["question"] for item in data["items"]]
        self._cache: dict[str, dict | None] = {
            normalize_question(item["question"]): item.get("extraction") for item in data["items"]
        }

    async def extract(self, question: str, today: date) -> Extraction | None:
        raw = self._cache.get(normalize_question(question))
        return postprocess(raw, question, today, source="cache", as_of=self.generated_at)


class MockLLM:
    model_name = "mock-extractive"
    CHUNK = 6
    DELAY_SEC = 0.012

    async def stream(
        self, question: str, history: list[ChatMessage], result: SearchResult
    ) -> AsyncIterator[str]:
        text = self.compose(question, result)
        for i in range(0, len(text), self.CHUNK):
            yield text[i : i + self.CHUNK]
            await asyncio.sleep(self.DELAY_SEC)

    @staticmethod
    def compose(question: str, result: SearchResult) -> str:
        lines = [
            "【デモモード】このデモでは API 費用を抑えるため、文章の生成は行っていません。",
        ]
        n = len(result.items)
        dr = result.date_range
        if dr is not None:
            period = f"{format_date_ja(dr.date_from)}〜{format_date_ja(dr.date_to)}"
            if result.widened:
                lines.append(
                    f"検索は実際に動いており、「{dr.label}」を {period} と解釈しましたが、"
                    f"その期間には見つからなかったため、"
                    f"全期間から関連する日記を {n} 件見つけました。"
                )
            else:
                lines.append(
                    f"検索は実際に動いており、「{dr.label}」を {period} と解釈して、"
                    f"関連する日記を {n} 件見つけました。"
                )
        elif n:
            lines.append(f"検索は実際に動いており、全期間から関連する日記を {n} 件見つけました。")
        else:
            lines.append("検索は実際に動いていますが、該当する日記は見つかりませんでした。")

        for it in result.items:
            snippet = _SPACE_RE.sub(" ", it.content).strip()
            if len(snippet) > 120:
                snippet = snippet[:120] + "…"
            lines.append("")
            lines.append(
                f"[{it.index}] {format_date_ja(it.entry_date)}(類似度 {it.similarity:.2f})"
            )
            lines.append(f"　　{snippet}")

        lines.append("")
        lines.append(
            "ローカルで LLM_PROVIDER=openai を設定すると、"
            "これらの日記を根拠に回答文が生成されます。"
        )
        return "\n".join(lines)
