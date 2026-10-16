"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { excerpt, formatDateWithWeekday, formatSimilarity } from "@/lib/format";
import type { SourceItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SourceList({ items }: { items: SourceItem[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-3">
      <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden />
        根拠 {items.length} 件
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ol className="mt-2 flex flex-col gap-2">
          {items.map((it) => (
            <li
              key={it.entry_id}
              className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
            >
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  [{it.index}]{" "}
                  <Link href={`/diary/${it.entry_id}`} className="text-primary hover:underline">
                    {formatDateWithWeekday(it.entry_date)}
                  </Link>
                </span>
                <span title="質問との類似度(0〜1)">類似度 {formatSimilarity(it.similarity)}</span>
              </div>
              <p className="mt-1 leading-relaxed">{excerpt(it.content, 160)}</p>
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}
