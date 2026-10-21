// デプロイされたコミットと、プロキシの転送先(ホスト名のみ)を返す。
// ステージングのスモークテストが「新しい版が出たか」「どのバックエンドを向いているか」を判定するのに使う。
// Vercel は VERCEL_GIT_COMMIT_SHA を自動で設定する。

function backendHost(): string | null {
  try {
    return new URL(process.env.BACKEND_URL ?? "http://localhost:8000").host;
  } catch {
    return null;
  }
}

export function GET(): Response {
  return Response.json(
    {
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT ?? null,
      backend: backendHost(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
