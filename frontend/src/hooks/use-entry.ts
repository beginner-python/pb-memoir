"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError, api } from "@/lib/api";
import type { Entry } from "@/lib/types";

export function useEntry(id: string | undefined) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const e = await api.getEntry(id);
        if (!cancelled) setEntry(e);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) setNotFound(true);
        else setError(e instanceof ApiError ? e.message : "日記を読み込めませんでした");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  // 再試行はイベントから呼ばれるので、ここで loading を立ててよい
  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    setAttempt((a) => a + 1);
  }, []);

  return { entry, setEntry, loading, notFound, error, reload };
}
