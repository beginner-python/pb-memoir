// デプロイされたコミットを返す。ステージングのスモークテストが「新しい版が出たか」を判定するのに使う。
// Vercel は VERCEL_GIT_COMMIT_SHA を自動で設定する。

export function GET(): Response {
  return Response.json(
    { commit: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
