"""質問例の時期抽出を実際の LLM で行い、app/data/suggestions.json を生成する。

    LLM_PROVIDER=openai OPENAI_API_KEY=... uv run python -m scripts.build_suggestions

生成物はモックモード(公開デモ)でキャッシュとして再生される。相対表現(「去年」「先月」)は
生成日(generated_at)を基準に固定されるため、公開前に再生成する。
"""

import asyncio
import json
import sys
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from app.providers.base import DateExtractor

OUT_PATH = Path(__file__).resolve().parent.parent / "app" / "data" / "suggestions.json"

QUESTIONS = [
    "去年の夏、どこに出かけた?",
    "先月はどんなことがあった?",
    "今年の春、水瀬はどんな成長をした?",
    "2025年のクリスマスは何をした?",
    "はじめて歩いたのはいつ?",
    "去年の誕生日はどう過ごした?",
]


async def build(extractor: DateExtractor, today: date, model: str) -> dict:
    items = []
    for q in QUESTIONS:
        ex = await extractor.extract(q, today)
        items.append(
            {
                "question": q,
                "extraction": None
                if ex is None
                else {
                    "date_from": ex.date_from.isoformat(),
                    "date_to": ex.date_to.isoformat(),
                    "label": ex.label,
                    "semantic_query": ex.semantic_query,
                },
            }
        )
    return {"generated_at": today.isoformat(), "model": model, "items": items}


def main() -> None:
    from app.config import get_settings
    from app.providers import get_date_extractor

    s = get_settings()
    if s.llm_provider != "openai" or not s.openai_api_key:
        print("LLM_PROVIDER=openai と OPENAI_API_KEY が必要です", file=sys.stderr)
        sys.exit(2)

    today = datetime.now(ZoneInfo(s.timezone)).date()
    data = asyncio.run(build(get_date_extractor(), today, s.openai_chat_model))
    OUT_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for item in data["items"]:
        ex = item["extraction"]
        print(f"- {item['question']}")
        print(
            f"    -> {ex['date_from']}〜{ex['date_to']} / {ex['label']} / {ex['semantic_query']}"
            if ex
            else "    -> 時期なし"
        )
    print(f"{OUT_PATH} に書き出しました(基準日 {today})")


if __name__ == "__main__":
    main()
