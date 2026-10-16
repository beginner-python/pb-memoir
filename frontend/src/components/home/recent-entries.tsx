"use client";

import Link from "next/link";

import { EmptyState } from "@/components/diary/empty-state";
import { EntryCard } from "@/components/diary/entry-card";
import { EntrySkeleton } from "@/components/diary/entry-skeleton";
import { ErrorAlert } from "@/components/shared/error-alert";
import { useHealth } from "@/hooks/use-health";
import type { Entry } from "@/lib/types";

export function RecentEntries({
  items,
  loading,
  error,
  onRetry,
}: {
  items: Entry[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const { readOnly } = useHealth();

  return (
    <section aria-labelledby="recent-title">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="recent-title" className="text-lg font-medium">
          最近の記録
        </h2>
        <Link href="/diary" className="text-sm text-primary hover:underline">
          すべて見る
        </Link>
      </div>
      {loading ? (
        <EntrySkeleton />
      ) : error ? (
        <ErrorAlert message={error} onRetry={onRetry} />
      ) : items.length === 0 ? (
        <EmptyState readOnly={readOnly} />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((e) => (
            <EntryCard key={e.id} entry={e} />
          ))}
        </div>
      )}
    </section>
  );
}
