"""時期抽出の共通部品。

抽出そのものは LLM(または LLM 出力のキャッシュ)が行い、ここでは
- LLM 出力の決定的な後処理(検証・補正)
- キャッシュ照合用の質問文の正規化
を提供する。ルールベースの日付解析は持たない。
"""

import re
import unicodedata
from dataclasses import dataclass
from datetime import date
from typing import Literal

from app.schemas import DateRangeOut

_PUNCT_RE = re.compile(r"[\s、。，．,.!?！？「」『』()（）\[\]【】・:：;；\-ー〜~'\"]+")


@dataclass(frozen=True)
class Extraction:
    date_from: date
    date_to: date
    label: str
    semantic_query: str
    source: Literal["llm", "cache"]
    as_of: date

    def to_out(self) -> DateRangeOut:
        return DateRangeOut(
            date_from=self.date_from,
            date_to=self.date_to,
            label=self.label,
            source=self.source,
            as_of=self.as_of,
        )


def normalize_question(text: str) -> str:
    """全半角・空白・句読点の差を吸収する。あいまい一致はしない(完全一致キャッシュ用)。"""
    t = unicodedata.normalize("NFKC", text).lower()
    return _PUNCT_RE.sub("", t)


def _parse_date(value: object) -> date | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value).strip())
    except ValueError:
        return None


def postprocess(
    raw: dict | None,
    question: str,
    today: date,
    source: Literal["llm", "cache"],
    as_of: date,
) -> Extraction | None:
    """LLM 出力(辞書)を検証・補正して Extraction にする。時期が取れなければ None。"""
    if not raw:
        return None
    d_from = _parse_date(raw.get("date_from"))
    d_to = _parse_date(raw.get("date_to"))
    if d_from is None and d_to is None:
        return None
    if d_from is None:
        d_from = d_to
    if d_to is None:
        d_to = d_from
    assert d_from is not None and d_to is not None
    if d_from > d_to:
        d_from, d_to = d_to, d_from
    if d_to > today:
        d_to = today
    if d_from > d_to:  # 範囲全体が未来だった場合
        return None

    label = str(raw.get("label") or "").strip() or f"{d_from.isoformat()}〜{d_to.isoformat()}"
    semantic_query = str(raw.get("semantic_query") or "").strip() or question
    return Extraction(
        date_from=d_from,
        date_to=d_to,
        label=label,
        semantic_query=semantic_query,
        source=source,
        as_of=as_of,
    )
