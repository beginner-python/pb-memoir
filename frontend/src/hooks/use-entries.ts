"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError, api } from "@/lib/api";
import type { Entry } from "@/lib/types";

type State = {
  items: Entry[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
};

/** 日記一覧。日付降順で limit 件ずつ読み、loadMore で追加する */
export function useEntries(limit = 50) {
  const [state, setState] = useState<State>({
    items: [],
    total: 0,
    loading: true,
    loadingMore: false,
    error: null,
  });

  const load = useCallback(
    async (offset: number) => {
      const more = offset > 0;
      setState((s) => ({ ...s, loading: !more, loadingMore: more, error: null }));
      try {
        const res = await api.listEntries({ limit, offset });
        setState((s) => ({
          items: more ? [...s.items, ...res.items] : res.items,
          total: res.total,
          loading: false,
          loadingMore: false,
          error: null,
        }));
      } catch (e) {
        setState((s) => ({
          ...s,
          loading: false,
          loadingMore: false,
          error: e instanceof ApiError ? e.message : "日記を読み込めませんでした",
        }));
      }
    },
    [limit],
  );

  useEffect(() => {
    load(0);
  }, [load]);

  return {
    ...state,
    hasMore: state.items.length < state.total,
    refresh: () => load(0),
    loadMore: () => load(state.items.length),
  };
}
