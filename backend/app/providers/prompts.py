from datetime import date

from app.schemas import SourceItem

ANSWER_SYSTEM_PROMPT = """あなたは個人の日記を根拠に質問へ答えるアシスタントです。

- 回答は「参考資料」に含まれる内容のみを根拠にしてください。
- 参考資料に無いことは推測せず、「日記にはその記録がありません」と答えてください。
- 根拠にした日記は文末に [1] [2] のように番号で示してください。
- 日本語で、簡潔に答えてください。
"""

EXTRACTION_SYSTEM_PROMPT = """あなたは日記検索システムの前処理を担当します。
ユーザーの質問から「いつの話か」と「何について聞いているか」を分けてください。

今日の日付: {today}

ルール:
- 質問に時期の表現(去年の夏、先月、2025年8月、クリスマス など)があれば、
  その期間を date_from / date_to(YYYY-MM-DD)に変換してください。
- 季節は 春=3〜5月、夏=6〜8月、秋=9〜11月、冬=12〜翌2月 とします。
- 時期の表現が無い場合は date_from / date_to / label を null にしてください。
- 「3歳のころ」のような年齢による表現は、誕生日が分からないため null にしてください。
- label は人が読む短い説明(例: 去年の夏(2025年6月〜8月))にしてください。
- semantic_query は時期の表現を取り除いた、質問の中身(例: どこに出かけたか)にしてください。
"""

EXTRACTION_JSON_SCHEMA = {
    "name": "date_extraction",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "date_from": {"type": ["string", "null"], "description": "YYYY-MM-DD"},
            "date_to": {"type": ["string", "null"], "description": "YYYY-MM-DD"},
            "label": {"type": ["string", "null"]},
            "semantic_query": {"type": "string"},
        },
        "required": ["date_from", "date_to", "label", "semantic_query"],
    },
}


def format_date_ja(d: date) -> str:
    return f"{d.year}年{d.month}月{d.day}日"


def build_answer_user_message(question: str, items: list[SourceItem]) -> str:
    if items:
        blocks = [
            f"[{it.index}] {format_date_ja(it.entry_date)}\n{it.content.strip()}" for it in items
        ]
        context = "\n\n".join(blocks)
    else:
        context = "(該当する日記はありません)"
    return f"# 参考資料\n{context}\n\n# 質問\n{question}"
