import { BookOpen } from "lucide-react";

export function EmptyState({ readOnly }: { readOnly: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
      <BookOpen className="mx-auto size-8 text-primary/70" aria-hidden />
      <p className="mt-4 text-base font-medium">まだ日記がありません</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {readOnly
          ? "このデモでは日記を追加できません。"
          : "上の入力欄から、今日の小さな出来事を書き留めてみませんか。"}
      </p>
    </div>
  );
}
