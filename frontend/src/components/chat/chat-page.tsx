"use client";

import { Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useChat } from "@/hooks/use-chat";
import { useSuggestions } from "@/hooks/use-suggestions";

import { ChatInput } from "./chat-input";
import { ChatMessages } from "./chat-messages";
import { SuggestionChips } from "./suggestion-chips";

export function ChatPage() {
  const { messages, busy, send, stop } = useChat();
  const { questions } = useSuggestions();
  const [draft, setDraft] = useState("");
  const searchParams = useSearchParams();
  const handedOff = useRef(false);

  // ホームの入力欄から ?q= で引き継がれた質問は、初回だけ自動送信する
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !handedOff.current) {
      handedOff.current = true;
      send(q);
    }
  }, [searchParams, send]);

  function handleSend(text = draft) {
    if (!text.trim()) return;
    setDraft("");
    send(text);
  }

  return (
    <div className="flex min-h-[60vh] flex-col">
      <div className="flex-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-6 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-sage-soft">
              <Sparkles className="size-6 text-primary" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-medium tracking-tight">思い出に聞いてみる</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                書き溜めた日記を根拠に答えます。時期を含めて聞くと、その期間の日記から探します。
              </p>
            </div>
            <SuggestionChips questions={questions} onPick={(q) => handleSend(q)} disabled={busy} />
          </div>
        ) : (
          <ChatMessages messages={messages} />
        )}
      </div>
      <div className="sticky bottom-[4.5rem] mt-6 bg-background pt-3 pb-1 md:bottom-0 md:pb-3">
        <ChatInput value={draft} onChange={setDraft} onSend={() => handleSend()} onStop={stop} busy={busy} />
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Enter で送信、Shift + Enter で改行。会話は保存されません。
        </p>
      </div>
    </div>
  );
}
