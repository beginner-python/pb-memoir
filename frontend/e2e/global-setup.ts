// バックエンドが応答するまで待つ(コンテナ起動直後や Render の休止からの復帰に備える)
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const smoke = process.env.SMOKE === "1"; // 読み取り専用のスモーク。READ_ONLY=true でも実行する

export default async function globalSetup() {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseURL}/api/health`, { signal: AbortSignal.timeout(20_000) });
      if (res.ok) {
        const h = (await res.json()) as { database: string; read_only: boolean };
        if (h.database !== "ok") throw new Error("database not ok");
        if (h.read_only && !smoke) {
          throw new Error("READ_ONLY=true のため E2E(書き込みあり)は実行できません");
        }
        await warmUp();
        return;
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("READ_ONLY")) throw e;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`バックエンドが起動しません: ${baseURL}/api/health`);
}

/** 開発サーバーは初回アクセス時にページをコンパイルするため、先に各ページを一度開いておく */
async function warmUp() {
  for (const path of ["/", "/diary", "/chat"]) {
    try {
      await fetch(`${baseURL}${path}`, { signal: AbortSignal.timeout(60_000) });
    } catch {
      // 失敗しても本番のテストで再度アクセスするので無視
    }
  }
}
