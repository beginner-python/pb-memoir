"""全ての日記のチャンクを、現在の LLM_PROVIDER の埋め込みで作り直す。

    uv run python -m scripts.reindex

LLM_PROVIDER を openai <-> mock で切り替えたあとに実行する。
検索は現在のプロバイダと同じ embedding_model のチャンクだけを対象にするため、
切り替え後に実行しないと検索結果が空になる。
"""

import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models import Entry
from app.providers.base import Embedder
from app.services.ingest import reindex_entry

COMMIT_EVERY = 20


async def reindex_all(
    session_factory: async_sessionmaker[AsyncSession], embedder: Embedder
) -> dict:
    entries = chunks = 0
    async with session_factory() as session:
        result = await session.scalars(select(Entry).order_by(Entry.entry_date))
        for entry in result:
            chunks += await reindex_entry(session, entry, embedder)
            entries += 1
            if entries % COMMIT_EVERY == 0:
                await session.commit()
        await session.commit()
    return {"entries": entries, "chunks": chunks, "embedding_model": embedder.model_name}


def main() -> None:
    from app.db import SessionLocal, engine
    from app.providers import get_embedder

    async def run() -> dict:
        try:
            return await reindex_all(SessionLocal, get_embedder())
        finally:
            await engine.dispose()

    r = asyncio.run(run())
    print(
        f"{r['entries']} 件の日記を {r['embedding_model']} で再埋め込みしました"
        f"(チャンク {r['chunks']} 件)"
    )


if __name__ == "__main__":
    main()
