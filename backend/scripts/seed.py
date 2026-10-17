"""サンプル日記(架空の家族の日記)を投入する。

    uv run python -m scripts.seed              # 日記が 1 件も無いときだけ投入
    uv run python -m scripts.seed --reset --yes  # 全削除してから投入(確認フラグ必須)

埋め込みは現在の LLM_PROVIDER で計算する。
公開環境(Supabase)にも DATABASE_URL を向けて同じ手順で投入する。
"""

import argparse
import asyncio
import json
import sys
from datetime import date
from pathlib import Path

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models import Entry
from app.providers.base import Embedder
from app.services.ingest import reindex_entry

SAMPLE_PATH = Path(__file__).resolve().parent.parent / "app" / "data" / "sample_entries.json"


def load_sample(path: Path = SAMPLE_PATH) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return data["items"]


async def seed(
    session_factory: async_sessionmaker[AsyncSession],
    embedder: Embedder,
    *,
    reset: bool = False,
    path: Path = SAMPLE_PATH,
) -> dict:
    items = load_sample(path)
    async with session_factory() as session:
        existing = await session.scalar(select(func.count(Entry.id))) or 0
        if existing and not reset:
            return {"status": "skipped", "existing": existing}
        if reset:
            await session.execute(delete(Entry))  # entry_chunks は ON DELETE CASCADE

        inserted = chunks = 0
        for item in items:
            entry = Entry(entry_date=date.fromisoformat(item["entry_date"]), body=item["body"])
            session.add(entry)
            await session.flush()
            chunks += await reindex_entry(session, entry, embedder)
            inserted += 1
        await session.commit()
    return {
        "status": "seeded",
        "inserted": inserted,
        "chunks": chunks,
        "embedding_model": embedder.model_name,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="サンプル日記を投入する")
    parser.add_argument("--reset", action="store_true", help="既存の日記を全て削除してから投入する")
    parser.add_argument("--yes", action="store_true", help="--reset の確認(無いと削除しない)")
    args = parser.parse_args()
    if args.reset and not args.yes:
        print(
            "--reset は全ての日記を削除します。実行するには --yes を付けてください。",
            file=sys.stderr,
        )
        sys.exit(2)

    from app.db import SessionLocal, engine
    from app.providers import get_embedder

    async def run() -> dict:
        try:
            return await seed(SessionLocal, get_embedder(), reset=args.reset)
        finally:
            await engine.dispose()

    result = asyncio.run(run())
    if result["status"] == "skipped":
        print(
            f"日記が既に {result['existing']} 件あるため投入しませんでした"
            "(--reset --yes で入れ替え)"
        )
    else:
        print(
            f"{result['inserted']} 件の日記と {result['chunks']} 件のチャンクを投入しました"
            f"(埋め込み: {result['embedding_model']})"
        )


if __name__ == "__main__":
    main()
