"use client";

import { useEffect, useRef } from "react";

import type { UiMessage } from "@/hooks/use-chat";

import { MessageBubble } from "./message-bubble";

export function ChatMessages({ messages }: { messages: UiMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1];
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, last?.content.length]);

  return (
    <div className="flex flex-col gap-5" role="log" aria-label="会話">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
