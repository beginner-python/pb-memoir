from openai import AsyncOpenAI


class OpenAIEmbedder:
    def __init__(self, client: AsyncOpenAI, model: str, dim: int) -> None:
        self._client = client
        self.model_name = model
        self._dim = dim

    async def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        res = await self._client.embeddings.create(
            model=self.model_name, input=texts, dimensions=self._dim
        )
        ordered = sorted(res.data, key=lambda d: d.index)  # index 順は保証されないので並べ直す
        return [d.embedding for d in ordered]
