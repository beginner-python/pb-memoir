import uuid

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models import EntryChunk


async def _create(client: AsyncClient, entry_date: str, body: str) -> dict:
    res = await client.post("/entries", json={"entry_date": entry_date, "body": body})
    assert res.status_code == 201, res.text
    return res.json()


async def _chunks(factory: async_sessionmaker[AsyncSession], entry_id: str) -> list[EntryChunk]:
    async with factory() as s:
        rows = await s.scalars(select(EntryChunk).where(EntryChunk.entry_id == uuid.UUID(entry_id)))
        return list(rows)


async def test_create_stores_entry_and_chunks(client, session_factory):
    created = await _create(client, "2025-08-10", "海に行った。子どもが初めて波に触れた。")

    assert created["entry_date"] == "2025-08-10"
    assert created["chunk_count"] == 1
    chunks = await _chunks(session_factory, created["id"])
    assert len(chunks) == 1
    assert chunks[0].content == "海に行った。子どもが初めて波に触れた。"
    assert chunks[0].embedding_model == "mock-hashed-ngram"
    assert len(chunks[0].embedding) == 1536


async def test_long_body_produces_multiple_chunks(client, session_factory):
    body = "".join(f"{i}日目の出来事を書く。" for i in range(200))  # 約 2,400 字
    created = await _create(client, "2025-01-01", body)
    assert created["chunk_count"] > 1
    chunks = await _chunks(session_factory, created["id"])
    assert sorted(c.chunk_index for c in chunks) == list(range(created["chunk_count"]))


async def test_list_filters_by_date_and_orders_desc(client):
    await _create(client, "2025-06-01", "6月")
    await _create(client, "2025-07-15", "7月")
    await _create(client, "2025-09-01", "9月")

    res = await client.get("/entries", params={"from": "2025-06-01", "to": "2025-08-31"})
    data = res.json()
    assert data["total"] == 2
    assert [e["entry_date"] for e in data["items"]] == ["2025-07-15", "2025-06-01"]

    res = await client.get("/entries", params={"limit": 1, "offset": 1})
    assert res.json()["total"] == 3
    assert res.json()["items"][0]["entry_date"] == "2025-07-15"


async def test_get_and_404(client):
    created = await _create(client, "2025-03-03", "ひな祭り")
    res = await client.get(f"/entries/{created['id']}")
    assert res.status_code == 200
    assert res.json()["body"] == "ひな祭り"

    res = await client.get(f"/entries/{uuid.uuid4()}")
    assert res.status_code == 404


async def test_update_reindexes_chunks(client, session_factory):
    created = await _create(client, "2025-03-03", "元の本文")
    old = await _chunks(session_factory, created["id"])

    res = await client.put(f"/entries/{created['id']}", json={"body": "書き直した本文"})
    assert res.status_code == 200
    assert res.json()["body"] == "書き直した本文"
    assert res.json()["entry_date"] == "2025-03-03"

    new = await _chunks(session_factory, created["id"])
    assert len(new) == 1
    assert new[0].content == "書き直した本文"
    assert new[0].id != old[0].id  # 作り直されている

    res = await client.put(f"/entries/{created['id']}", json={"entry_date": "2025-04-04"})
    assert res.json()["entry_date"] == "2025-04-04"


async def test_update_requires_a_field(client):
    created = await _create(client, "2025-03-03", "本文")
    res = await client.put(f"/entries/{created['id']}", json={})
    assert res.status_code == 422


async def test_delete_cascades_chunks(client, session_factory):
    created = await _create(client, "2025-03-03", "消す日記")
    res = await client.delete(f"/entries/{created['id']}")
    assert res.status_code == 204
    assert (await client.get(f"/entries/{created['id']}")).status_code == 404
    assert await _chunks(session_factory, created["id"]) == []


async def test_validation_errors(client):
    assert (
        await client.post("/entries", json={"entry_date": "2025-01-01", "body": ""})
    ).status_code == 422
    assert (await client.post("/entries", json={"body": "日付なし"})).status_code == 422
    assert (
        await client.post("/entries", json={"entry_date": "not-a-date", "body": "x"})
    ).status_code == 422


async def test_read_only_blocks_writes_but_allows_reads(client, read_only):
    res = await client.post("/entries", json={"entry_date": "2025-01-01", "body": "x"})
    assert res.status_code == 403
    assert "読み取り専用" in res.json()["detail"]
    assert (await client.put(f"/entries/{uuid.uuid4()}", json={"body": "x"})).status_code == 403
    assert (await client.delete(f"/entries/{uuid.uuid4()}")).status_code == 403
    assert (await client.get("/entries")).status_code == 200
