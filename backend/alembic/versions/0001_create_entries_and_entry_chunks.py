"""create entries and entry_chunks

Revision ID: 0001
Revises:
Create Date: 2026-10-16
"""

from collections.abc import Sequence

import pgvector.sqlalchemy
import sqlalchemy as sa

from alembic import op

revision: str = "0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "entries",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_entries_entry_date"), "entries", ["entry_date"], unique=False)

    op.create_table(
        "entry_chunks",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("entry_id", sa.UUID(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", pgvector.sqlalchemy.vector.VECTOR(dim=1536), nullable=False),
        sa.Column("embedding_model", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["entry_id"], ["entries.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_entry_chunks_embedding_hnsw",
        "entry_chunks",
        ["embedding"],
        unique=False,
        postgresql_using="hnsw",
        postgresql_with={"m": 16, "ef_construction": 64},
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )
    op.create_index(
        op.f("ix_entry_chunks_embedding_model"), "entry_chunks", ["embedding_model"], unique=False
    )
    op.create_index(op.f("ix_entry_chunks_entry_id"), "entry_chunks", ["entry_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_entry_chunks_entry_id"), table_name="entry_chunks")
    op.drop_index(op.f("ix_entry_chunks_embedding_model"), table_name="entry_chunks")
    op.drop_index("ix_entry_chunks_embedding_hnsw", table_name="entry_chunks")
    op.drop_table("entry_chunks")
    op.drop_index(op.f("ix_entries_entry_date"), table_name="entries")
    op.drop_table("entries")
