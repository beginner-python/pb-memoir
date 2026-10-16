import { CalendarRange } from "lucide-react";

import { formatDateJa } from "@/lib/format";
import type { SearchResult } from "@/lib/types";

/** 解釈した時期の表示。どの期間を検索したかを回答より先に見せる */
export function DateRangeChip({ result }: { result: SearchResult }) {
  const dr = result.date_range;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <CalendarRange className="size-3.5" aria-hidden />
      {dr ? (
        <>
          <span>
            <span className="font-medium text-foreground">{dr.label}</span>
            {`(${formatDateJa(dr.from)}〜${formatDateJa(dr.to)})で検索`}
          </span>
          {result.widened && <span>期間内に見つからず、全期間から検索しました</span>}
          {dr.source === "cache" && <span>{formatDateJa(dr.as_of)}時点の解釈</span>}
        </>
      ) : (
        <span>全期間で検索</span>
      )}
    </div>
  );
}
