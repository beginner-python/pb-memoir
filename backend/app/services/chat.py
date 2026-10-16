"""/chat の SSE ストリームを組み立てる。検索は呼び出し側で済ませ、ここでは生成だけを扱う。"""

import json
import logging
from collections.abc import AsyncIterator

from app.providers.base import LLM
from app.schemas import ChatMessage, SearchResult

logger = logging.getLogger(__name__)


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def chat_stream(
    question: str, history: list[ChatMessage], result: SearchResult, llm: LLM
) -> AsyncIterator[str]:
    yield sse("sources", result.model_dump(mode="json", by_alias=True))
    try:
        async for text in llm.stream(question, history, result):
            yield sse("token", {"text": text})
    except Exception:  # noqa: BLE001 - ストリーム途中の失敗はイベントで伝える
        logger.exception("回答生成に失敗しました")
        yield sse("error", {"message": "回答の生成中にエラーが発生しました。"})
        return
    yield sse("done", {})
