"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";

export function useSuggestions() {
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .suggestions()
      .then((s) => {
        if (!cancelled) setQuestions(s.items.map((i) => i.question));
      })
      .catch(() => {
        // 質問例は補助的な表示なので、失敗しても画面は使える
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { questions, loading };
}
