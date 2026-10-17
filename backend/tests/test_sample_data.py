from datetime import date

from scripts.seed import SAMPLE_PATH, load_sample


def test_sample_entries_are_well_formed():
    items = load_sample(SAMPLE_PATH)
    assert 120 <= len(items) <= 200
    dates = [date.fromisoformat(i["entry_date"]) for i in items]
    assert dates == sorted(dates), "日付は昇順"
    assert len(dates) == len(set(dates)), "同じ日付の重複なし"
    assert dates[0] >= date(2024, 10, 1) and dates[-1] <= date(2026, 10, 31)
    for i in items:
        assert 20 <= len(i["body"]) <= 400
        assert i["body"] == i["body"].strip()


def test_sample_entries_cover_suggested_periods():
    """質問例の期間(去年の夏 / 先月 / 今年の春 / 2025年のクリスマス)に日記があり、語彙も重なる"""
    items = load_sample(SAMPLE_PATH)

    def in_range(a: str, b: str):
        return [i for i in items if a <= i["entry_date"] <= b]

    summer = in_range("2025-06-01", "2025-08-31")
    assert summer and any("出かけた" in i["body"] for i in summer)
    assert in_range("2026-09-01", "2026-09-30")
    spring = in_range("2026-03-01", "2026-05-31")
    assert spring and any("水瀬" in i["body"] for i in spring)
    xmas = in_range("2025-12-24", "2025-12-25")
    assert xmas and any("クリスマス" in i["body"] for i in xmas)
    assert any("はじめて歩いた" in i["body"] for i in items)
