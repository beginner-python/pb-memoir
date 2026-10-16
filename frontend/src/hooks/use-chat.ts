"use client";

import { useCallback, useRef, useState } from "react";

import { ApiError, api } from "@/lib/api";
import { trimHistory } from "@/lib/format";
import { parseSse } from "@/lib/sse";
import type { SearchResult } from "@/lib/types";

export type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  result?: SearchResult; // assistant のみ。根拠と解釈した時期
  status: "done" | "streaming" | "error";
  error?: string;
};

let seq = 0;
const nextId = () => `m${Date.now()}-${seq++}`;

/** 会話の状態と送信・中断。履歴はこの hook の state だけに持つ(再読み込みで消える) */
export function useChat() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [busy, setBusy] = useState(false);
  // 中断は「停止」ボタンからのみ行う。アンマウント時に中断すると、開発モードの StrictMode が
  // effect を二重実行する際に最初の送信まで止めてしまう(Next.js 16 は遷移後もページを保持する)
  const abortRef = useRef<AbortController | null>(null);

  const patchLast = useCallback((patch: (m: UiMessage) => UiMessage) => {
    setMessages((ms) => {
      if (ms.length === 0) return ms;
      const last = ms[ms.length - 1];
      return [...ms.slice(0, -1), patch(last)];
    });
  }, []);

  const send = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || busy) return;

      const history = trimHistory(
        messages.filter((m) => m.status === "done").map((m) => ({ role: m.role, content: m.content })),
      );
      setMessages((ms) => [
        ...ms,
        { id: nextId(), role: "user", content: q, status: "done" },
        { id: nextId(), role: "assistant", content: "", status: "streaming" },
      ]);
      setBusy(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const body = await api.chat(q, history, controller.signal);
        for await (const ev of parseSse(body)) {
          if (ev.event === "sources") {
            const result = ev.data as SearchResult;
            patchLast((m) => ({ ...m, result }));
          } else if (ev.event === "token") {
            const text = (ev.data as { text: string }).text;
            patchLast((m) => ({ ...m, content: m.content + text }));
          } else if (ev.event === "error") {
            const message = (ev.data as { message: string }).message;
            patchLast((m) => ({ ...m, status: "error", error: message }));
          } else if (ev.event === "done") {
            patchLast((m) => ({ ...m, status: "done" }));
          }
        }
        // done が来ずに終わった(中断など)場合は、その時点までの内容で確定する
        patchLast((m) => (m.status === "streaming" ? { ...m, status: "done" } : m));
      } catch (e) {
        if (controller.signal.aborted) {
          patchLast((m) => ({ ...m, status: "done" }));
        } else {
          const message = e instanceof ApiError ? e.message : "送信に失敗しました";
          patchLast((m) => ({ ...m, status: "error", error: message }));
        }
      } finally {
        abortRef.current = null;
        setBusy(false);
      }
    },
    [busy, messages, patchLast],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return { messages, busy, send, stop };
}
