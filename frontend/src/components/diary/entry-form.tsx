"use client";

import { Loader2 } from "lucide-react";
import { useId, useState } from "react";

import { ErrorAlert } from "@/components/shared/error-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToday } from "@/hooks/use-today";
import { ApiError } from "@/lib/api";
import type { EntryCreate } from "@/lib/types";

const BODY_MAX = 20_000;

export function EntryForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  disabled = false,
}: {
  initial?: EntryCreate;
  submitLabel: string;
  onSubmit: (payload: EntryCreate) => Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
}) {
  const today = useToday();
  // 未編集(null)のときは今日の日付を使う。今日はクライアントでしか決まらない
  const [dateInput, setDateInput] = useState<string | null>(initial?.entry_date ?? null);
  const entryDate = dateInput ?? today ?? "";
  const [body, setBody] = useState(initial?.body ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dateId = useId();
  const bodyId = useId();

  const canSubmit = !disabled && !submitting && body.trim().length > 0 && entryDate !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ entry_date: entryDate, body: body.trim() });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "保存に失敗しました");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={dateId} className="text-sm font-medium">
          日付
        </label>
        <Input
          id={dateId}
          type="date"
          value={entryDate}
          max={today ?? undefined}
          onChange={(e) => setDateInput(e.target.value)}
          disabled={disabled || submitting}
          required
          className="w-fit"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={bodyId} className="text-sm font-medium">
          本文
        </label>
        <Textarea
          id={bodyId}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="今日はどんな一日でしたか?"
          disabled={disabled || submitting}
          maxLength={BODY_MAX}
          required
          className="min-h-56 field-sizing-content resize-y rounded-xl bg-card px-4 py-3 text-[15px] leading-relaxed"
        />
        <p className="text-right text-xs text-muted-foreground">
          {body.length.toLocaleString()} / {BODY_MAX.toLocaleString()}
        </p>
      </div>

      {error && <ErrorAlert title="保存できませんでした" message={error} />}

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            キャンセル
          </Button>
        )}
        <Button type="submit" size="lg" disabled={!canSubmit}>
          {submitting && <Loader2 className="animate-spin" aria-hidden />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
