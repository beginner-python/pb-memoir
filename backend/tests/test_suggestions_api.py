async def test_suggestions_returns_questions_only(client):
    res = await client.get("/suggestions")
    assert res.status_code == 200
    data = res.json()
    assert data["generated_at"] == "2026-10-16"
    assert len(data["items"]) == 5
    assert all(set(item.keys()) == {"question"} for item in data["items"])
    assert data["items"][0]["question"] == "去年の夏、どこに出かけた?"
