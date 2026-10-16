import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, api, detailToMessage } from "./api";

describe("detailToMessage", () => {
  it("uses string detail", () => {
    expect(detailToMessage({ detail: "読み取り専用です" }, 403)).toBe("読み取り専用です");
  });
  it("joins validation messages", () => {
    expect(detailToMessage({ detail: [{ msg: "a" }, { msg: "b" }] }, 422)).toBe("a / b");
  });
  it("falls back by status", () => {
    expect(detailToMessage(null, 502)).toBe("サーバーに接続できません");
    expect(detailToMessage({}, 500)).toBe("リクエストに失敗しました (HTTP 500)");
  });
});

describe("api", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("builds query string for listEntries and returns JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await api.listEntries({ from: "2025-06-01", to: "2025-08-31", limit: 5 });
    expect(res).toEqual({ items: [], total: 0 });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/entries?from=2025-06-01&to=2025-08-31&limit=5");
  });

  it("throws ApiError with server detail on non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "日記が見つかりません" }), { status: 404 })),
    );
    await expect(api.getEntry("x")).rejects.toMatchObject<Partial<ApiError>>({
      status: 404,
      message: "日記が見つかりません",
    });
  });

  it("returns undefined for 204", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(api.deleteEntry("x")).resolves.toBeUndefined();
  });
});
