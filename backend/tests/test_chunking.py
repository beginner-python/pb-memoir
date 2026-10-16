import pytest

from app.chunking import split_text


def test_short_text_is_single_chunk():
    text = "今日は公園に行った。\n子どもが初めて滑り台を一人で滑った。"
    assert split_text(text, chunk_size=800, overlap=120) == [text]


def test_empty_text_returns_nothing():
    assert split_text("   \n  ") == []


def test_long_text_is_split_within_size_and_overlaps():
    sentences = [f"これは{i}番目の文です。" for i in range(60)]  # 1 文 11〜12 字
    text = "".join(sentences)
    chunks = split_text(text, chunk_size=100, overlap=20)

    assert len(chunks) > 1
    assert all(len(c) <= 100 for c in chunks)
    # 重なり: 次チャンクの先頭は前チャンクの末尾に含まれる
    for prev, nxt in zip(chunks, chunks[1:], strict=False):
        assert nxt[:10] in prev
    # 情報の欠落なし: 全ての文がどこかのチャンクに含まれる
    assert all(any(s in c for c in chunks) for s in sentences)


def test_prefers_paragraph_boundary():
    para1 = "あ" * 60
    para2 = "い" * 60
    chunks = split_text(f"{para1}\n\n{para2}", chunk_size=100, overlap=0)
    assert chunks == [para1, para2]


def test_text_without_separators_is_cut_by_length():
    chunks = split_text("x" * 250, chunk_size=100, overlap=0)
    assert [len(c) for c in chunks] == [100, 100, 50]


@pytest.mark.parametrize(("size", "overlap"), [(0, 0), (100, 100), (100, -1)])
def test_invalid_parameters(size, overlap):
    with pytest.raises(ValueError):
        split_text("abc", chunk_size=size, overlap=overlap)
