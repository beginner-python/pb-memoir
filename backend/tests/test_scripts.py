from sqlalchemy import func, select

from app.models import Entry, EntryChunk
from app.providers.mock_provider import MockEmbedder
from scripts.reindex import reindex_all
from scripts.seed import seed


class FakeEmbedder(MockEmbedder):
    model_name = "fake-other-model"


async def _counts(factory):
    async with factory() as s:
        entries = await s.scalar(select(func.count(Entry.id)))
        chunks = await s.scalar(select(func.count(EntryChunk.id)))
        models = set(await s.scalars(select(EntryChunk.embedding_model).distinct()))
    return entries, chunks, models


async def test_seed_then_skip_then_reset(session_factory):
    embedder = MockEmbedder(1536)
    first = await seed(session_factory, embedder)
    assert first["status"] == "seeded" and first["inserted"] >= 120
    entries, chunks, models = await _counts(session_factory)
    assert entries == first["inserted"] and chunks >= entries
    assert models == {"mock-hashed-ngram"}

    again = await seed(session_factory, embedder)
    assert again["status"] == "skipped" and again["existing"] == entries

    reset = await seed(session_factory, embedder, reset=True)
    assert reset["status"] == "seeded"
    entries2, _, _ = await _counts(session_factory)
    assert entries2 == entries  # 入れ替え後も同じ件数


async def test_reindex_switches_embedding_model(session_factory):
    await seed(session_factory, MockEmbedder(1536))
    r = await reindex_all(session_factory, FakeEmbedder(1536))
    entries, chunks, models = await _counts(session_factory)
    assert r["entries"] == entries and r["chunks"] == chunks
    assert models == {"fake-other-model"}
