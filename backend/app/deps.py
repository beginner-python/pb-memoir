from fastapi import HTTPException, status

from app.config import get_settings


def require_writable() -> None:
    """公開デモ(READ_ONLY=true)では書き込み系 API を拒否する。"""
    if get_settings().read_only:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このデモは読み取り専用です。日記の作成・編集・削除はできません。",
        )
