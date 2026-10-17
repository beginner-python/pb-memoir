import uuid

from app.models import EntryChunk
from app.providers.mock_provider import MockEmbedder


async def _create(client, entry_date, body):
    res = await client.post("/entries", json={"entry_date": entry_date, "body": body})
    assert res.status_code == 201, res.text
    return res.json()


async def _search(client, question):
    res = await client.post("/search", json={"question": question})
    assert res.status_code == 200, res.text
    return res.json()


async def test_cached_question_filters_by_date_range(client):
    await _create(client, "2025-08-10", "家族で海に出かけた。息子が初めて波に触れた。")
    await _create(client, "2024-08-10", "家族で海に出かけた。去年と同じ浜辺。")
    await _create(client, "2025-07-20", "近所の公園に出かけた。セミの声がすごかった。")

    data = await _search(client, "去年の夏、どこに出かけた?")

    assert data["date_range"] == {
        "from": "2025-06-01",
        "to": "2025-08-31",
        "label": "去年の夏",
        "source": "cache",
        "as_of": "2026-10-16",
    }
    assert data["widened"] is False
    assert sorted(i["entry_date"] for i in data["items"]) == ["2025-07-20", "2025-08-10"]
    assert [i["index"] for i in data["items"]] == [1, 2]
    assert all(0.0 <= i["similarity"] <= 1.0 for i in data["items"])


async def test_widens_when_nothing_in_range(client):
    await _create(client, "2024-01-05", "初詣に行った。")
    data = await _search(client, "先月はどんなことがあった?")  # 2026-09 にはデータなし
    assert data["date_range"]["source"] == "cache"
    assert data["widened"] is True
    assert [i["entry_date"] for i in data["items"]] == ["2024-01-05"]


async def test_free_question_searches_all_periods(client):
    await _create(client, "2023-05-01", "はじめて一人で歩いた。感動した。")
    await _create(client, "2025-05-01", "自転車に乗れるようになった。")
    data = await _search(client, "はじめて歩いたのはいつ?")
    assert data["date_range"] is None
    assert data["widened"] is False
    assert data["items"][0]["entry_date"] == "2023-05-01"  # 語彙が重なる方が上位


async def test_ignores_chunks_from_other_embedding_model(client, session_factory):
    created = await _create(client, "2025-08-10", "海に出かけた。")
    async with session_factory() as s:
        s.add(
            EntryChunk(
                entry_id=uuid.UUID(created["id"]),
                chunk_index=99,
                content="海に出かけた。",
                embedding=MockEmbedder(1536).embed_one("海に出かけた。"),
                embedding_model="text-embedding-3-small",
            )
        )
        await s.commit()

    data = await _search(client, "海に出かけた")
    assert len(data["items"]) == 1
    assert data["items"][0]["content"] == "海に出かけた。"


async def test_multi_chunk_entry_appears_once(client):
    long_body = "".join(f"{i}日目は公園に出かけた。" for i in range(200))
    created = await _create(client, "2025-08-01", long_body)
    assert created["chunk_count"] > 1
    await _create(client, "2025-08-02", "家で過ごした。")

    data = await _search(client, "公園に出かけた")
    ids = [i["entry_id"] for i in data["items"]]
    assert ids.count(created["id"]) == 1
    assert len(ids) == len(set(ids))


async def test_validation(client):
    assert (await client.post("/search", json={"question": ""})).status_code == 422
    assert (await client.post("/search", json={"question": "x" * 1001})).status_code == 422


async def test_empty_database_returns_no_items(client):
    data = await _search(client, "何でも")
    assert data["items"] == [] and data["widened"] is False
