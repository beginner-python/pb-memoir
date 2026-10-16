import uuid
from datetime import date, datetime

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
