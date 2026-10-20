"""enable row level security

Supabase は public スキーマの表を REST API(anon キー)で公開する。RLS を有効にしてポリシーを
付けなければ anon からは読めず書けず、バックエンド(postgres ロール)だけが触れる状態になる。
ローカル Postgres でも同じマイグレーションを適用する(影響なし)。

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-20
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0002"
down_revision: str | Sequence[str] | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE entries ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE entry_chunks ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.execute("ALTER TABLE entry_chunks DISABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE entries DISABLE ROW LEVEL SECURITY")
