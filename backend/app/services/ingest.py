"""日記を検索可能にする取り込み処理。作成・更新のたびにチャンクを作り直す。

埋め込むのは本文のみ。日付は entries.entry_date 列でフィルタする(メタデータフィルタ方式)。
"""

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.chunking import split_text
from app.config import get_settings
from app.models import Entry, EntryChunk
from app.providers.base import Embedder

EMBED_BATCH = 64


async def reindex_entry(session: AsyncSession, entry: Entry, embedder: Embedder) -> int:
    """entry のチャンクを全て入れ替え、作成したチャンク数を返す。commit は呼び出し側で行う。"""
    s = get_settings()
    await session.execute(delete(EntryChunk).where(EntryChunk.entry_id == entry.id))

    pieces = split_text(entry.body, s.chunk_size, s.chunk_overlap)
    vectors: list[list[float]] = []
    for i in range(0, len(pieces), EMBED_BATCH):
        vectors.extend(await embedder.embed(pieces[i : i + EMBED_BATCH]))

    session.add_all(
        EntryChunk(
            entry_id=entry.id,
            chunk_index=i,
            content=piece,
            embedding=vec,
            embedding_model=embedder.model_name,
        )
        for i, (piece, vec) in enumerate(zip(pieces, vectors, strict=True))
    )
    return len(pieces)
