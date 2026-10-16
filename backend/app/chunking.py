"""テキストを検索用チャンクに分割する。

段落 → 改行 → 句点 → 感嘆・疑問符 → 空白 の順に、大きい区切りから再帰的に試す。
日記は短いので多くは 1 チャンクに収まるが、長文は chunk_size 以下に分割し、
文脈が切れないよう前チャンク末尾 overlap 文字を次チャンクの先頭に重ねる。
"""

SEPARATORS = ["\n\n", "\n", "。", "！", "？", "! ", "? ", ". ", " "]


def split_text(text: str, chunk_size: int = 800, overlap: int = 120) -> list[str]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be in [0, chunk_size)")
    text = text.strip()
    if not text:
        return []
    pieces = _split(text, chunk_size, SEPARATORS)
    return _merge_with_overlap(pieces, chunk_size, overlap)


def _split(text: str, chunk_size: int, separators: list[str]) -> list[str]:
    """chunk_size 以下の断片に分割する。区切り文字は前の断片の末尾に残す。"""
    if len(text) <= chunk_size:
        return [text]
    for i, sep in enumerate(separators):
        if sep not in text:
            continue
        parts = [p + sep for p in text.split(sep)]
        parts[-1] = parts[-1][: -len(sep)]  # 末尾の断片に余計な区切りを付けない
        result: list[str] = []
        for part in parts:
            if not part:
                continue
            if len(part) <= chunk_size:
                result.append(part)
            else:
                result.extend(_split(part, chunk_size, separators[i + 1 :]))
        return result
    # どの区切りも使えない(長い 1 語など)場合は固定長で切る
    return [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]


def _merge_with_overlap(pieces: list[str], chunk_size: int, overlap: int) -> list[str]:
    """断片を chunk_size まで詰め、チャンク境界では前チャンクの末尾を重ねる。"""
    chunks: list[str] = []
    current = ""
    for piece in pieces:
        if len(current) + len(piece) <= chunk_size:
            current += piece
            continue
        if current.strip():
            chunks.append(current.strip())
        tail = current[-overlap:] if overlap else ""
        current = tail + piece if len(tail) + len(piece) <= chunk_size else piece
    if current.strip():
        chunks.append(current.strip())
    return chunks
