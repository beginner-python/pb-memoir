// Route Handler (/api/*) 経由で FastAPI を呼ぶ型付きクライアント。

import type {
  ChatMessage,
  Entry,
  EntryCreate,
  EntryList,
  EntryUpdate,
  Health,
  Suggestions,
} from "@/lib/types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** FastAPI のエラー本文(detail が文字列またはバリデーション配列)を人が読める 1 行にする */
export function detailToMessage(body: unknown, status: number): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const msgs = detail
        .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : ""))
        .filter(Boolean);
      if (msgs.length) return msgs.join(" / ");
    }
  }
  if (status === 502) return "サーバーに接続できません";
  return `リクエストに失敗しました (HTTP ${status})`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // 本文なし
    }
    throw new ApiError(res.status, detailToMessage(body, res.status));
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Render の休止からの復帰(30〜60 秒)で応答待ちのまま止まらないよう、短いタイムアウトで失敗させて再試行に回す */
const HEALTH_TIMEOUT_MS = 8_000;

export const api = {
  health: () => request<Health>("/health", { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) }),

  listEntries: (params: { from?: string; to?: string; limit?: number; offset?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.limit != null) q.set("limit", String(params.limit));
    if (params.offset != null) q.set("offset", String(params.offset));
    const qs = q.toString();
    return request<EntryList>(`/entries${qs ? `?${qs}` : ""}`);
  },
  getEntry: (id: string) => request<Entry>(`/entries/${id}`),
  createEntry: (payload: EntryCreate) =>
    request<Entry>("/entries", { method: "POST", body: JSON.stringify(payload) }),
  updateEntry: (id: string, payload: EntryUpdate) =>
    request<Entry>(`/entries/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteEntry: (id: string) => request<void>(`/entries/${id}`, { method: "DELETE" }),

  suggestions: () => request<Suggestions>("/suggestions"),

  /** SSE を返す。呼び出し側が body を parseSse で読む */
  chat: async (question: string, history: ChatMessage[], signal?: AbortSignal) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, history }),
      cache: "no-store",
      signal,
    });
    if (!res.ok || !res.body) {
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        // 本文なし
      }
      throw new ApiError(res.status, detailToMessage(body, res.status));
    }
    return res.body;
  },
};
