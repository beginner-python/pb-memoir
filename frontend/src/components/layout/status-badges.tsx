"use client";

import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useHealth } from "@/hooks/use-health";

/** 動作状態の表示。読み取り専用のときと、バックエンド起動待ちのときだけ出す */
export function StatusBadges() {
  const { status, readOnly } = useHealth();

  if (status === "unavailable") {
    return (
      <Badge variant="outline" className="gap-1.5 text-muted-foreground">
        <Loader2 className="size-3 animate-spin" aria-hidden />
        サーバーを起動しています…
      </Badge>
    );
  }
  if (status === "ok" && readOnly) return <Badge variant="outline">読み取り専用</Badge>;
  return null;
}
