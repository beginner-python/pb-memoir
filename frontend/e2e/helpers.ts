import { type APIRequestContext, type Page } from "@playwright/test";

/** テストが作った日記を識別する接頭辞 */
export const MARK = "E2E:";

/** Next.js 16 は遷移後も前ページを DOM に残すため、可視要素だけに絞るための起点 */
export const visible = (page: Page) => page.locator("main:visible");

export async function deleteMarkedEntries(request: APIRequestContext) {
  const res = await request.get("/api/entries?limit=200");
  const data = (await res.json()) as { items: { id: string; body: string }[] };
  for (const e of data.items) {
    if (e.body.startsWith(MARK)) await request.delete(`/api/entries/${e.id}`);
  }
}

export async function createEntry(request: APIRequestContext, entry_date: string, body: string) {
  const res = await request.post("/api/entries", { data: { entry_date, body: `${MARK} ${body}` } });
  if (!res.ok()) throw new Error(`create failed: ${res.status()}`);
  return (await res.json()) as { id: string };
}
