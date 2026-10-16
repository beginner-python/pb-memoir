import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

BODY_MAX = 20_000


class EntryCreate(BaseModel):
    entry_date: date
    body: str = Field(min_length=1, max_length=BODY_MAX)


class EntryUpdate(BaseModel):
    entry_date: date | None = None
    body: str | None = Field(default=None, min_length=1, max_length=BODY_MAX)

    @model_validator(mode="after")
    def _at_least_one(self) -> "EntryUpdate":
        if self.entry_date is None and self.body is None:
            raise ValueError("entry_date か body のどちらかを指定してください")
        return self


class EntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    entry_date: date
    body: str
    chunk_count: int
    created_at: datetime
    updated_at: datetime


class EntryList(BaseModel):
    items: list[EntryOut]
    total: int


# ---- 検索・対話 ----------------------------------------------------------------

QUESTION_MAX = 1_000
HISTORY_MAX = 10


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4_000)


class SearchRequest(BaseModel):
    question: str = Field(min_length=1, max_length=QUESTION_MAX)


class ChatRequest(SearchRequest):
    history: list[ChatMessage] = Field(default_factory=list, max_length=HISTORY_MAX)


class DateRangeOut(BaseModel):
    """解釈した時期。JSON では from / to というキー名で返す。"""

    model_config = ConfigDict(populate_by_name=True)

    date_from: date = Field(serialization_alias="from")
    date_to: date = Field(serialization_alias="to")
    label: str
    source: Literal["llm", "cache"]
    as_of: date  # 解釈の基準日。llm なら今日、cache なら生成日


class SourceItem(BaseModel):
    index: int
    entry_id: uuid.UUID
    entry_date: date
    content: str
    similarity: float


class SearchResult(BaseModel):
    date_range: DateRangeOut | None
    widened: bool
    items: list[SourceItem]


class SuggestionOut(BaseModel):
    question: str


class SuggestionsOut(BaseModel):
    generated_at: date
    items: list[SuggestionOut]
