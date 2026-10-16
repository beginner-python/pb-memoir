import uuid
from datetime import date

from app.providers.mock_provider import MockLLM
from app.schemas import DateRangeOut, SearchResult, SourceItem


def _item(i, d, content="家族で海に行った。", sim=0.42):
    return SourceItem(index=i, entry_id=uuid.uuid4(), entry_date=d, content=content, similarity=sim)


def _range(label="去年の夏"):
    return DateRangeOut(
        date_from=date(2025, 6, 1),
        date_to=date(2025, 8, 31),
        label=label,
        source="cache",
        as_of=date(2026, 10, 16),
    )


def test_with_date_range_and_items():
    text = MockLLM.compose(
        "q", SearchResult(date_range=_range(), widened=False, items=[_item(1, date(2025, 8, 10))])
    )
    assert "【デモモード】" in text
    assert "「去年の夏」を 2025年6月1日〜2025年8月31日 と解釈して" in text
    assert "1 件見つけました" in text
    assert "[1] 2025年8月10日(類似度 0.42)" in text
    assert "家族で海に行った。" in text
    assert "LLM_PROVIDER=openai" in text


def test_widened_mentions_fallback():
    text = MockLLM.compose(
        "q", SearchResult(date_range=_range(), widened=True, items=[_item(1, date(2023, 1, 1))])
    )
    assert "その期間には見つからなかったため、全期間から" in text


def test_without_date_range():
    text = MockLLM.compose(
        "q", SearchResult(date_range=None, widened=False, items=[_item(1, date(2025, 8, 10))])
    )
    assert "全期間から関連する日記を 1 件見つけました" in text


def test_no_results():
    text = MockLLM.compose("q", SearchResult(date_range=None, widened=False, items=[]))
    assert "該当する日記は見つかりませんでした" in text


def test_long_content_is_truncated():
    text = MockLLM.compose(
        "q",
        SearchResult(
            date_range=None, widened=False, items=[_item(1, date(2025, 1, 1), "あ" * 300)]
        ),
    )
    assert "あ" * 120 + "…" in text
    assert "あ" * 121 not in text


async def test_stream_concatenates_to_compose():
    result = SearchResult(date_range=None, widened=False, items=[])
    llm = MockLLM()
    llm.DELAY_SEC = 0
    chunks = [c async for c in llm.stream("q", [], result)]
    assert len(chunks) > 1
    assert "".join(chunks) == MockLLM.compose("q", result)
