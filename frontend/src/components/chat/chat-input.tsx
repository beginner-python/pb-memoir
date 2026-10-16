"use client";

import { Send, Square } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  busy,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  busy: boolean;
}) {
  const id = useId();

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter で送信、Shift+Enter で改行。日本語入力の変換中(isComposing)は無視
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!busy) onSend();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) onSend();
      }}
      className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-xs"
    >
      <label htmlFor={id} className="sr-only">
        質問
      </label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="思い出について質問する..."
        rows={1}
        maxLength={1000}
        className="max-h-40 min-h-10 field-sizing-content resize-none border-0 bg-transparent px-3 py-2 text-[15px] shadow-none focus-visible:ring-0"
      />
      {busy ? (
        <Button type="button" variant="outline" size="icon-lg" onClick={onStop} aria-label="生成を停止">
          <Square aria-hidden />
        </Button>
      ) : (
        <Button type="submit" size="icon-lg" disabled={!value.trim()} aria-label="送信">
          <Send aria-hidden />
        </Button>
      )}
    </form>
  );
}
