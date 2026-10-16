"use client";

import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { DeleteEntryDialog } from "@/components/diary/delete-entry-dialog";
import { EntryForm } from "@/components/diary/entry-form";
import { ErrorAlert } from "@/components/shared/error-alert";
import { ReadOnlyNotice } from "@/components/shared/read-only-notice";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntry } from "@/hooks/use-entry";
import { useHealth } from "@/hooks/use-health";
import { api } from "@/lib/api";
import { formatDateWithWeekday } from "@/lib/format";

export default function EntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { readOnly } = useHealth();
  const { entry, setEntry, loading, notFound, error, reload } = useEntry(id);
  const [editing, setEditing] = useState(false);

  return (
    <>
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href="/diary">
            <ArrowLeft aria-hidden />
            日記一覧
          </Link>
        </Button>
      </div>

      {loading ? (
        <div aria-busy="true" aria-label="読み込み中">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-6 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </div>
      ) : notFound ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="font-medium">この日記は見つかりませんでした</p>
          <p className="mt-1 text-sm text-muted-foreground">削除されたか、URL が間違っている可能性があります。</p>
        </div>
      ) : error || !entry ? (
        <ErrorAlert message={error ?? "日記を読み込めませんでした"} onRetry={reload} />
      ) : editing ? (
        <>
          <h1 className="mb-6 text-2xl font-medium tracking-tight">日記を編集</h1>
          <EntryForm
            initial={{ entry_date: entry.entry_date, body: entry.body }}
            submitLabel="更新する"
            onCancel={() => setEditing(false)}
            onSubmit={async (payload) => {
              const updated = await api.updateEntry(entry.id, payload);
              setEntry(updated);
              setEditing(false);
            }}
          />
        </>
      ) : (
        <article className="rounded-2xl border border-border bg-card px-6 py-8 shadow-xs md:px-10 md:py-10">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <time dateTime={entry.entry_date} className="font-heading text-xl text-muted-foreground">
              {formatDateWithWeekday(entry.entry_date)}
            </time>
            <div className="flex items-center gap-1">
              <Button variant="ghost" onClick={() => setEditing(true)} disabled={readOnly}>
                <Pencil aria-hidden />
                編集
              </Button>
              <DeleteEntryDialog
                disabled={readOnly}
                onConfirm={async () => {
                  await api.deleteEntry(entry.id);
                  router.push("/diary");
                }}
              />
            </div>
          </header>
          {readOnly && (
            <div className="mb-6">
              <ReadOnlyNotice />
            </div>
          )}
          <p className="whitespace-pre-wrap text-[16px] leading-loose">{entry.body}</p>
        </article>
      )}
    </>
  );
}
