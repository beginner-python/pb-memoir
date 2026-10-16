"use client";

import { Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSuggestions } from "@/hooks/use-suggestions";

export function AskCard() {
  const router = useRouter();
  const { questions } = useSuggestions();
  const [q, setQ] = useState("");
  const inputId = useId();
  const example = questions[0] ?? "去年の夏、何をしていた?";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = q.trim();
    if (!text) return;
    router.push(`/chat?q=${encodeURIComponent(text)}`);
  }

  return (
    <section className="rounded-2xl bg-sage-soft p-6" aria-labelledby={`${inputId}-title`}>
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-primary" aria-hidden />
        <h2 id={`${inputId}-title`} className="text-lg font-medium">
          思い出に聞いてみる
        </h2>
      </div>
      <p className="mt-2">
        <button
          type="button"
          className="text-base text-foreground/80 hover:text-foreground"
          onClick={() => setQ(example)}
          title="クリックで入力欄に入れる"
        >
          「{example}」
        </button>
      </p>
      <form onSubmit={submit} className="mt-4 flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          思い出について質問する
        </label>
        <Input
          id={inputId}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="思い出について質問する..."
          className="h-11 flex-1 rounded-xl bg-card"
        />
        <Button type="submit" size="lg" className="h-11 rounded-xl px-4" disabled={!q.trim()}>
          <Search aria-hidden />
          <span className="sr-only sm:not-sr-only">聞く</span>
        </Button>
      </form>
    </section>
  );
}
