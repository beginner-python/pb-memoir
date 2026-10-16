"use client";

import { Loader2, PenLine, Send } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useHealth } from "@/hooks/use-health";
import { useToday } from "@/hooks/use-today";
import { ApiError, api } from "@/lib/api";
import type { Entry } from "@/lib/types";

const BODY_MAX = 20_000;

/** その場で日記を投稿するカード。ホームと日記一覧の両方に置く(作成ページは持たない) */
export function EntryComposer({ onCreated }: { onCreated?: (entry: Entry) => void }) {
  const { readOnly } = useHealth();
  const today = useToday();
  const [body, setBody] = useState("");
  const [dateInput, setDateInput] = useState<string | null>(null); // null = 今日
  const [showDate, setShowDate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Entry | null>(null);
  const bodyId = useId();
  const dateId = useId();

  const entryDate = dateInput ?? today ?? "";
  const canSubmit = !readOnly && !submitting && body.trim().length > 0 && entryDate !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createEntry({ entry_date: entryDate, body: body.trim() });
      setBody("");
      setDateInput(null);
      setShowDate(false);
      setSaved(created);
      onCreated?.(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "保存に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="rounded-2xl shadow-xs">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <PenLine className="size-5 text-primary" aria-hidden />
            <label htmlFor={bodyId} className="text-lg font-medium">
              今日の出来事を記録する
            </label>
          </div>
          <Textarea
            id={bodyId}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (saved) setSaved(null);
            }}
            placeholder="今日はどんな一日でしたか?"
            disabled={readOnly || submitting}
            maxLength={BODY_MAX}
            rows={3}
            className="min-h-24 field-sizing-content resize-y border-0 bg-transparent px-0 py-1 text-[15px] leading-relaxed shadow-none focus-visible:ring-0 md:text-[15px]"
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {readOnly ? (
                <span>読み取り専用のデモのため投稿できません</span>
              ) : showDate ? (
                <>
                  <label htmlFor={dateId} className="sr-only">
                    日付
                  </label>
                  <Input
                    id={dateId}
                    type="date"
                    value={entryDate}
                    max={today ?? undefined}
                    onChange={(e) => setDateInput(e.target.value)}
                    disabled={submitting}
                    className="h-8 w-fit"
                  />
                </>
              ) : (
                <button
                  type="button"
                  className="underline decoration-dotted underline-offset-4 hover:text-foreground"
                  onClick={() => setShowDate(true)}
                >
                  日付を変更
                </button>
              )}
              {saved && (
                <span aria-live="polite">
                  保存しました。
                  <Link href={`/diary/${saved.id}`} className="ml-1 text-primary hover:underline">
                    開く
                  </Link>
                </span>
              )}
            </div>
            <Button type="submit" size="lg" disabled={!canSubmit}>
              {submitting ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Send aria-hidden />
              )}
              投稿する
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
