import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.deps import require_writable
from app.models import Entry, EntryChunk
from app.providers import get_embedder
from app.schemas import EntryCreate, EntryList, EntryOut, EntryUpdate
from app.services.ingest import reindex_entry

router = APIRouter(prefix="/entries", tags=["entries"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]

_chunk_count_sq = (
    select(func.count(EntryChunk.id))
    .where(EntryChunk.entry_id == Entry.id)
    .correlate(Entry)
    .scalar_subquery()
)


def _to_out(entry: Entry, chunk_count: int) -> EntryOut:
    return EntryOut(
        id=entry.id,
        entry_date=entry.entry_date,
        body=entry.body,
        chunk_count=chunk_count,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )


async def _get_or_404(session: AsyncSession, entry_id: uuid.UUID) -> Entry:
    entry = await session.get(Entry, entry_id)
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "日記が見つかりません")
    return entry


async def _count_chunks(session: AsyncSession, entry_id: uuid.UUID) -> int:
    stmt = select(func.count(EntryChunk.id)).where(EntryChunk.entry_id == entry_id)
    return await session.scalar(stmt) or 0


@router.get("", response_model=EntryList)
async def list_entries(
    session: SessionDep,
    date_from: Annotated[date | None, Query(alias="from")] = None,
    date_to: Annotated[date | None, Query(alias="to")] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> EntryList:
    conditions = []
    if date_from is not None:
        conditions.append(Entry.entry_date >= date_from)
    if date_to is not None:
        conditions.append(Entry.entry_date <= date_to)

    total = await session.scalar(select(func.count(Entry.id)).where(*conditions)) or 0
    rows = await session.execute(
        select(Entry, _chunk_count_sq)
        .where(*conditions)
        .order_by(Entry.entry_date.desc(), Entry.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return EntryList(items=[_to_out(e, c) for e, c in rows.all()], total=total)


@router.get("/{entry_id}", response_model=EntryOut)
async def get_entry(entry_id: uuid.UUID, session: SessionDep) -> EntryOut:
    entry = await _get_or_404(session, entry_id)
    return _to_out(entry, await _count_chunks(session, entry_id))


@router.post(
    "",
    response_model=EntryOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_writable)],
)
async def create_entry(payload: EntryCreate, session: SessionDep) -> EntryOut:
    entry = Entry(entry_date=payload.entry_date, body=payload.body)
    session.add(entry)
    await session.flush()  # id を確定させてからチャンクを作る
    chunk_count = await reindex_entry(session, entry, get_embedder())
    await session.commit()
    await session.refresh(entry)
    return _to_out(entry, chunk_count)


@router.put("/{entry_id}", response_model=EntryOut, dependencies=[Depends(require_writable)])
async def update_entry(entry_id: uuid.UUID, payload: EntryUpdate, session: SessionDep) -> EntryOut:
    entry = await _get_or_404(session, entry_id)
    if payload.entry_date is not None:
        entry.entry_date = payload.entry_date
    if payload.body is not None:
        entry.body = payload.body
    chunk_count = await reindex_entry(session, entry, get_embedder())
    await session.commit()
    await session.refresh(entry)
    return _to_out(entry, chunk_count)


@router.delete(
    "/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_writable)],
)
async def delete_entry(entry_id: uuid.UUID, session: SessionDep) -> None:
    entry = await _get_or_404(session, entry_id)
    await session.delete(entry)  # entry_chunks は ON DELETE CASCADE
    await session.commit()
