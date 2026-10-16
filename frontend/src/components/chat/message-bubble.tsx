import { Sparkles } from "lucide-react";

import type { UiMessage } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";

import { DateRangeChip } from "./date-range-chip";
import { SourceList } from "./source-list";

export function MessageBubble({ message }: { message: UiMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-relaxed text-primary-foreground">
          {message.content}
        </p>
      </div>
    );
  }

  const streaming = message.status === "streaming";
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-sage-soft">
        <Sparkles className="size-4 text-primary" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3">
        {message.result && <DateRangeChip result={message.result} />}
        {message.result || message.content ? (
          <p
            className={cn("mt-2 whitespace-pre-wrap text-[15px] leading-relaxed", streaming && "after:ml-0.5 after:inline-block after:h-4 after:w-0.5 after:animate-pulse after:bg-primary after:align-middle")}
            aria-live="polite"
          >
            {message.content}
          </p>
        ) : streaming ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            日記を探しています…
          </p>
        ) : message.status === "done" ? (
          <p className="text-sm text-muted-foreground">回答を取得できませんでした。</p>
        ) : null}
        {message.status === "error" && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {message.error}
          </p>
        )}
        {message.result && <SourceList items={message.result.items} />}
      </div>
    </div>
  );
}
