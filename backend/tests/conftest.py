"""結合テスト用の設定。

同じ Postgres サーバー内に memoir_test データベースを作り、テストごとにテーブルを空にする。
アプリの get_session をテスト用エンジンのセッションに差し替える。
"""

import asyncio
from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.db import Base, get_session
from app.main import app

TEST_DB = "memoir_test"


def _test_url() -> str:
    return (
        make_url(get_settings().database_url)
        .set(database=TEST_DB)
        .render_as_string(hide_password=False)
    )


async def _prepare_database() -> None:
    admin_url = make_url(get_settings().database_url).set(database="postgres")
    admin = create_async_engine(
        admin_url.render_as_string(hide_password=False), isolation_level="AUTOCOMMIT"
    )
    async with admin.connect() as conn:
        exists = await conn.scalar(
            text("select 1 from pg_database where datname = :n"), {"n": TEST_DB}
        )
        if not exists:
            await conn.execute(text(f'create database "{TEST_DB}"'))
    await admin.dispose()

    engine = create_async_engine(_test_url())
    async with engine.begin() as conn:
        await conn.execute(text("create extension if not exists vector"))
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()


@pytest.fixture(scope="session", autouse=True)
def _database() -> None:
    # セッションスコープの非同期フィクスチャはイベントループの扱いが面倒なので同期で実行する
    asyncio.run(_prepare_database())


@pytest.fixture
async def session_factory() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine(_test_url(), connect_args={"statement_cache_size": 0})
    async with engine.begin() as conn:
        await conn.execute(text("truncate entries cascade"))
    yield async_sessionmaker(engine, expire_on_commit=False)
    await engine.dispose()


@pytest.fixture
async def client(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[AsyncClient]:
    async def _override() -> AsyncIterator[AsyncSession]:
        async with session_factory() as s:
            yield s

    app.dependency_overrides[get_session] = _override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def read_only(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "read_only", True)
