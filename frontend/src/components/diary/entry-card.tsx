"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { useToday } from "@/hooks/use-today";
import { excerpt, formatDateRelativeToYear } from "@/lib/format";
import type { Entry } from "@/lib/types";

export function EntryCard({ entry }: { entry: Entry }) {
  const today = useToday();
  return (
    <Link
      href={`/diary/${entry.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-xs transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <div className="min-w-0 flex-1">
        <time dateTime={entry.entry_date} className="text-xs font-medium text-blush">
          {formatDateRelativeToYear(entry.entry_date, today)}
        </time>
        <p className="mt-1 line-clamp-2 text-[15px] leading-relaxed text-foreground">
          {excerpt(entry.body, 120)}
        </p>
      </div>
      <ChevronRight
        className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
        aria-hidden
      />
    </Link>
  );
}
