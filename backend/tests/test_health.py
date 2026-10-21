async def test_health_reports_mode_and_commit(client, monkeypatch):
    res = await client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["llm_provider"] == "mock"
    assert data["read_only"] is False
    assert data["database"] == "ok"
    assert "commit" in data  # ローカルでは None、Render では RENDER_GIT_COMMIT
    assert "service" in data  # ローカルでは None、Render では RENDER_SERVICE_NAME
