import math

from app.providers.mock_provider import MockEmbedder

DIM = 1536


def _cos(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b, strict=True))


def test_is_deterministic():
    e = MockEmbedder(DIM)
    assert e.embed_one("公園で遊んだ") == e.embed_one("公園で遊んだ")


def test_is_unit_length_with_expected_dimension():
    v = MockEmbedder(DIM).embed_one("はじめて歩いた日。感動した。")
    assert len(v) == DIM
    assert math.isclose(math.sqrt(sum(x * x for x in v)), 1.0, rel_tol=1e-9)


def test_similar_texts_are_closer_than_unrelated():
    e = MockEmbedder(DIM)
    q = e.embed_one("公園で滑り台を滑った")
    similar = e.embed_one("今日は公園に行って滑り台で遊んだ")
    unrelated = e.embed_one("確定申告の書類を提出した")
    assert _cos(q, similar) > _cos(q, unrelated)


async def test_embed_batch_matches_single():
    e = MockEmbedder(DIM)
    texts = ["a", "b", ""]
    assert await e.embed(texts) == [e.embed_one(t) for t in texts]
