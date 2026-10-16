import json


def _parse_sse(text: str) -> list[tuple[str, dict]]:
    events = []
    for block in text.strip().split("\n\n"):
        event, data = None, None
        for line in block.splitlines():
            if line.startswith("event: "):
                event = line[len("event: ") :]
            elif line.startswith("data: "):
                data = json.loads(line[len("data: ") :])
        events.append((event, data))
    return events


async def test_chat_streams_sources_tokens_done(client):
    await client.post("/entries", json={"entry_date": "2025-08-10", "body": "家族で海に出かけた。"})

    async with client.stream(
        "POST", "/chat", json={"question": "去年の夏、どこに出かけた?", "history": []}
    ) as res:
        assert res.status_code == 200
        assert res.headers["content-type"].startswith("text/event-stream")
        body = (await res.aread()).decode()

    events = _parse_sse(body)
    names = [e for e, _ in events]
    assert names[0] == "sources"
    assert names[-1] == "done"
    assert names.count("token") >= 1 and set(names[1:-1]) == {"token"}

    sources = events[0][1]
    assert sources["date_range"]["source"] == "cache"
    assert sources["items"][0]["entry_date"] == "2025-08-10"

    answer = "".join(d["text"] for e, d in events if e == "token")
    assert "【デモモード】" in answer
    assert "2025年8月10日" in answer


async def test_chat_with_history_is_accepted(client):
    history = [{"role": "user", "content": "こんにちは"}, {"role": "assistant", "content": "はい"}]
    async with client.stream(
        "POST", "/chat", json={"question": "最近どう?", "history": history}
    ) as res:
        assert res.status_code == 200


async def test_chat_validation(client):
    too_many = [{"role": "user", "content": "x"}] * 11
    res = await client.post("/chat", json={"question": "q", "history": too_many})
    assert res.status_code == 422
    res = await client.post("/chat", json={"question": "", "history": []})
    assert res.status_code == 422
    res = await client.post(
        "/chat", json={"question": "q", "history": [{"role": "system", "content": "x"}]}
    )
    assert res.status_code == 422
