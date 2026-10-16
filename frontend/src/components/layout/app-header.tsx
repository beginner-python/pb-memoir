"use client";

import { BookOpen, CircleUserRound } from "lucide-react";
import { useToday } from "@/hooks/use-today";
import { formatDateWithWeekday } from "@/lib/format";

import { StatusBadges } from "./status-badges";

export function AppHeader() {
  // 日付はクライアントのローカル時刻で出す。サーバー側は空にして hydration のずれを避ける
  const today = useToday();

  return (
    <header className="mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <BookOpen className="size-5 text-primary md:hidden" aria-hidden />
        <span className="font-heading text-xl md:hidden">pb-memoir</span>
        <p className="hidden text-sm text-muted-foreground md:block">
          {today ? formatDateWithWeekday(today) : "\u00a0"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadges />
        <CircleUserRound className="size-6 text-muted-foreground" aria-label="アカウント" role="img" />
      </div>
    </header>
  );
}
