// バックエンドが応答するまで待つ(コンテナ起動直後の実行に備える)
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default async function globalSetup() {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseURL}/api/health`);
      if (res.ok) {
        const h = (await res.json()) as { database: string; read_only: boolean };
        if (h.database === "ok" && !h.read_only) {
          await warmUp();
          return;
        }
        if (h.read_only) throw new Error("READ_ONLY=true のため E2E(書き込みあり)は実行できません");
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("READ_ONLY")) throw e;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`バックエンドが起動しません: ${baseURL}/api/health`);
}

/** 開発サーバーは初回アクセス時にページをコンパイルするため、先に各ページを一度開いておく */
async function warmUp() {
  for (const path of ["/", "/diary", "/chat"]) {
    try {
      await fetch(`${baseURL}${path}`);
    } catch {
      // 失敗しても本番のテストで再度アクセスするので無視
    }
  }
}
