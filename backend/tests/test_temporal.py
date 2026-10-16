from datetime import date

import pytest

from app.services.temporal import normalize_question, postprocess

TODAY = date(2026, 10, 16)


def _pp(raw, question="q"):
    return postprocess(raw, question, TODAY, source="llm", as_of=TODAY)


def test_none_or_empty_returns_none():
    assert _pp(None) is None
    assert _pp({}) is None
    assert _pp({"date_from": None, "date_to": None, "label": None, "semantic_query": "x"}) is None


def test_basic_range_is_kept():
    e = _pp(
        {
            "date_from": "2025-06-01",
            "date_to": "2025-08-31",
            "label": "去年の夏",
            "semantic_query": "どこに出かけたか",
        }
    )
    assert (e.date_from, e.date_to) == (date(2025, 6, 1), date(2025, 8, 31))
    assert e.label == "去年の夏"
    assert e.semantic_query == "どこに出かけたか"
    assert e.source == "llm" and e.as_of == TODAY


def test_swaps_reversed_range():
    e = _pp({"date_from": "2025-08-31", "date_to": "2025-06-01"})
    assert (e.date_from, e.date_to) == (date(2025, 6, 1), date(2025, 8, 31))


def test_clamps_future_end_to_today():
    e = _pp({"date_from": "2026-10-01", "date_to": "2026-10-31"})
    assert e.date_to == TODAY


def test_fully_future_range_is_none():
    assert _pp({"date_from": "2027-01-01", "date_to": "2027-01-31"}) is None


def test_single_side_becomes_single_day():
    assert _pp({"date_from": "2025-03-03"}).date_to == date(2025, 3, 3)
    assert _pp({"date_to": "2025-03-03"}).date_from == date(2025, 3, 3)


def test_invalid_date_string_is_ignored():
    assert _pp({"date_from": "いつか", "date_to": None}) is None
    e = _pp({"date_from": "2025-03-03", "date_to": "not-a-date"})
    assert (e.date_from, e.date_to) == (date(2025, 3, 3), date(2025, 3, 3))


def test_defaults_for_missing_label_and_query():
    e = _pp({"date_from": "2025-03-03", "date_to": "2025-03-04", "semantic_query": ""}, "元の質問")
    assert e.label == "2025-03-03〜2025-03-04"
    assert e.semantic_query == "元の質問"


@pytest.mark.parametrize(
    ("a", "b"),
    [
        ("去年の夏、どこに出かけた?", "去年の夏どこに出かけた"),
        ("去年の夏、どこに出かけた？", "去年の夏 どこに出かけた ?"),
        ("ＨＥＬＬＯ　World!", "hello world"),
        ("「はじめて」歩いたのは、いつ?", "はじめて歩いたのはいつ"),
    ],
)
def test_normalize_question_absorbs_surface_differences(a, b):
    assert normalize_question(a) == normalize_question(b)


def test_normalize_question_keeps_meaningful_difference():
    assert normalize_question("去年の夏") != normalize_question("今年の夏")
