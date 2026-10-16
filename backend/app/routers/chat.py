from datetime import date, datetime
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_session
from app.providers import get_date_extractor, get_embedder, get_llm
from app.providers.mock_provider import CachedDateExtractor
from app.schemas import (
    ChatRequest,
    SearchRequest,
    SearchResult,
    SuggestionOut,
    SuggestionsOut,
)
from app.services.chat import chat_stream
from app.services.retrieval import search

router = APIRouter(tags=["chat"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def _today() -> date:
    return datetime.now(ZoneInfo(get_settings().timezone)).date()


async def _search(session: AsyncSession, question: str) -> SearchResult:
    return await search(
        session,
        question,
        _today(),
        get_embedder(),
        get_date_extractor(),
        get_settings().top_k,
    )


@router.get("/suggestions", response_model=SuggestionsOut)
async def suggestions() -> SuggestionsOut:
    """チャットが空のときに表示する質問例。両モードで同じ内容を返す。"""
    # 質問例は suggestions.json が唯一の情報源。抽出結果(キャッシュ)は返さない
    cache = CachedDateExtractor(get_settings().suggestions_path)
    return SuggestionsOut(
        generated_at=cache.generated_at,
        items=[SuggestionOut(question=q) for q in cache.questions],
    )


@router.post("/search", response_model=SearchResult)
async def search_endpoint(payload: SearchRequest, session: SessionDep) -> SearchResult:
    """検索のみ(ストリームなし)。デバッグ・テスト・評価用。"""
    return await _search(session, payload.question)


@router.post("/chat")
async def chat(payload: ChatRequest, session: SessionDep) -> StreamingResponse:
    # DB を使う検索はレスポンスを返す前に終わらせる(セッションはこの関数の中でしか使えない)
    result = await _search(session, payload.question)
    return StreamingResponse(
        chat_stream(payload.question, payload.history, result, get_llm()),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
