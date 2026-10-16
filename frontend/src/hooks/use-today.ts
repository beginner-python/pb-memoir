"use client";

import { useSyncExternalStore } from "react";

import { todayIso } from "@/lib/format";

const subscribe = () => () => {};

/** クライアントのローカル日付(YYYY-MM-DD)。サーバー側のレンダリングでは null */
export function useToday(): string | null {
  return useSyncExternalStore(subscribe, () => todayIso(), () => null);
}
