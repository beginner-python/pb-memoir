import json
from datetime import date

from app.config import get_settings
from app.services.temporal import postprocess


def test_suggestions_file_schema():
    data = json.loads(open(get_settings().suggestions_path, encoding="utf-8").read())
    generated_at = date.fromisoformat(data["generated_at"])
    assert data["model"]
    assert 5 <= len(data["items"]) <= 8
    questions = [i["question"] for i in data["items"]]
    assert len(questions) == len(set(questions))
    for item in data["items"]:
        assert item["question"].strip()
        ex = item["extraction"]
        if ex is None:
            continue
        result = postprocess(ex, item["question"], generated_at, source="cache", as_of=generated_at)
        assert result is not None, item["question"]
        assert result.date_from <= result.date_to
        assert "〜" not in ex["label"] and "(" not in ex["label"], "label は時期表現そのもの"
