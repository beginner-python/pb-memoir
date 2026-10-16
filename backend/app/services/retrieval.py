"""検索: 時期の抽出 → 日付で絞り込み → ベクトル類似度で並べる → 日記単位に集約。"""

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Entry, EntryChunk
from app.providers.base import DateExtractor, Embedder
from app.schemas import SearchResult, SourceItem
from app.services.temporal import Extraction

# 同じ日記のチャンクが複数入っても top_k 件の日記を返せるよう、余裕を持って取る
OVERFETCH = 3


async def search(
    session: AsyncSession,
    question: str,
    today: date,
    embedder: Embedder,
    extractor: DateExtractor,
    top_k: int,
) -> SearchResult:
    extraction = await extractor.extract(question, today)
    query_text = extraction.semantic_query if extraction else question
    [qvec] = await embedder.embed([query_text])

    rows = await _nearest(session, qvec, embedder.model_name, extraction, top_k)
    widened = False
    if not rows and extraction is not None:
        rows = await _nearest(session, qvec, embedder.model_name, None, top_k)
        widened = True

    items = _aggregate(rows, top_k)
    return SearchResult(
        date_range=extraction.to_out() if extraction else None,
        widened=widened,
        items=items,
    )


async def _nearest(
    session: AsyncSession,
    qvec: list[float],
    model_name: str,
    extraction: Extraction | None,
    top_k: int,
) -> list[tuple[EntryChunk, date, float]]:
    distance = EntryChunk.embedding.cosine_distance(qvec).label("distance")
    stmt = (
        select(EntryChunk, Entry.entry_date, distance)
        .join(Entry, Entry.id == EntryChunk.entry_id)
        .where(EntryChunk.embedding_model == model_name)
    )
    if extraction is not None:
        stmt = stmt.where(
            Entry.entry_date >= extraction.date_from, Entry.entry_date <= extraction.date_to
        )
    stmt = stmt.order_by(distance).limit(top_k * OVERFETCH)
    result = await session.execute(stmt)
    return [(chunk, entry_date, float(dist)) for chunk, entry_date, dist in result.all()]


def _aggregate(rows: list[tuple[EntryChunk, date, float]], top_k: int) -> list[SourceItem]:
    """同じ日記は類似度が最も高いチャンクだけ残し、上位 top_k 件に 1 から番号を振る。"""
    best: dict = {}
    for chunk, entry_date, dist in rows:  # rows は距離の昇順
        if chunk.entry_id not in best:
            best[chunk.entry_id] = (chunk, entry_date, dist)
    items = []
    for i, (chunk, entry_date, dist) in enumerate(list(best.values())[:top_k], start=1):
        items.append(
            SourceItem(
                index=i,
                entry_id=chunk.entry_id,
                entry_date=entry_date,
                content=chunk.content,
                similarity=round(max(0.0, min(1.0, 1.0 - dist)), 4),  # 0〜1 に収める
            )
        )
    return items
