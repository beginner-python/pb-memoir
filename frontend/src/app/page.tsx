"use client";

import { EntryComposer } from "@/components/diary/entry-composer";
import { AskCard } from "@/components/home/ask-card";
import { RecentEntries } from "@/components/home/recent-entries";
import { useEntries } from "@/hooks/use-entries";

export default function HomePage() {
  const entries = useEntries(5);
  return (
    <div className="flex flex-col gap-8">
      <EntryComposer onCreated={entries.refresh} />
      <AskCard />
      <RecentEntries
        items={entries.items}
        loading={entries.loading}
        error={entries.error}
        onRetry={entries.refresh}
      />
    </div>
  );
}
