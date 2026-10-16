"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { Health } from "@/lib/types";

type HealthState = {
  status: "loading" | "ok" | "unavailable";
  health: Health | null;
  readOnly: boolean;
  refresh: () => void;
};

const HealthContext = createContext<HealthState | null>(null);

const RETRY_MS = 5_000;

/** /health を取得して配下に配る。届かない間は数秒おきに再試行する(Render のスリープ対策) */
export function HealthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<HealthState["status"]>("loading");
  const [health, setHealth] = useState<Health | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      try {
        const h = await api.health();
        if (cancelled) return;
        setHealth(h);
        setStatus("ok");
      } catch {
        if (cancelled) return;
        setStatus("unavailable");
        timer = setTimeout(() => setAttempt((a) => a + 1), RETRY_MS);
      }
    })();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [attempt]);

  const refresh = useCallback(() => setAttempt((a) => a + 1), []);

  return (
    <HealthContext.Provider
      value={{ status, health, readOnly: health?.read_only ?? false, refresh }}
    >
      {children}
    </HealthContext.Provider>
  );
}

export function useHealth(): HealthState {
  const ctx = useContext(HealthContext);
  if (!ctx) throw new Error("useHealth は HealthProvider の中で使ってください");
  return ctx;
}
