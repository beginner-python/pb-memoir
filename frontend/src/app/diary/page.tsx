"use client";

import { EmptyState } from "@/components/diary/empty-state";
import { EntryComposer } from "@/components/diary/entry-composer";
import { EntryList } from "@/components/diary/entry-list";
import { EntrySkeleton } from "@/components/diary/entry-skeleton";
import { ErrorAlert } from "@/components/shared/error-alert";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { useEntries } from "@/hooks/use-entries";
import { useHealth } from "@/hooks/use-health";

export default function DiaryListPage() {
  const { items, total, loading, loadingMore, error, hasMore, refresh, loadMore } = useEntries(50);
  const { readOnly } = useHealth();

  return (
    <>
      <PageTitle title="日記" description={loading ? undefined : `${total.toLocaleString()} 件の記録`} />
      <div className="mb-8">
        <EntryComposer onCreated={refresh} />
      </div>
      {loading ? (
        <EntrySkeleton count={5} />
      ) : error ? (
        <ErrorAlert message={error} onRetry={refresh} />
      ) : items.length === 0 ? (
        <EmptyState readOnly={readOnly} />
      ) : (
        <>
          <EntryList entries={items} />
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "読み込み中…" : "もっと読む"}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
