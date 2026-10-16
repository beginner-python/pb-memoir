import json
from datetime import date

import pytest

from app.providers.mock_provider import CachedDateExtractor

TODAY = date(2026, 10, 16)


@pytest.fixture
def extractor(tmp_path):
    data = {
        "generated_at": "2026-10-01",
        "items": [
            {
                "question": "去年の夏、どこに出かけた?",
                "extraction": {
                    "date_from": "2025-06-01",
                    "date_to": "2025-08-31",
                    "label": "去年の夏",
                    "semantic_query": "どこに出かけたか",
                },
            },
            {"question": "はじめて歩いたのはいつ?", "extraction": None},
        ],
    }
    path = tmp_path / "s.json"
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return CachedDateExtractor(path)


async def test_exact_match_returns_cached_extraction(extractor):
    e = await extractor.extract("去年の夏、どこに出かけた?", TODAY)
    assert e is not None
    assert (e.date_from, e.date_to) == (date(2025, 6, 1), date(2025, 8, 31))
    assert e.source == "cache"
    assert e.as_of == date(2026, 10, 1)


async def test_match_ignores_surface_differences(extractor):
    assert await extractor.extract("去年の夏 どこに出かけた？", TODAY) is not None
    assert await extractor.extract("　去年の夏、どこに出かけた?　", TODAY) is not None


async def test_unknown_or_no_time_question_returns_none(extractor):
    assert await extractor.extract("今年の夏、どこに出かけた?", TODAY) is None
    assert await extractor.extract("はじめて歩いたのはいつ?", TODAY) is None


def test_exposes_questions_and_generated_at(extractor):
    assert extractor.questions == ["去年の夏、どこに出かけた?", "はじめて歩いたのはいつ?"]
    assert extractor.generated_at == date(2026, 10, 1)


def test_bundled_suggestions_file_loads():
    from app.config import get_settings

    ex = CachedDateExtractor(get_settings().suggestions_path)
    assert len(ex.questions) == 5
