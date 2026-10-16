import { groupByMonth } from "@/lib/format";
import type { Entry } from "@/lib/types";

import { EntryCard } from "./entry-card";

export function EntryList({ entries }: { entries: Entry[] }) {
  return (
    <div className="flex flex-col gap-8">
      {groupByMonth(entries).map((group) => (
        <section key={group.key} aria-labelledby={`month-${group.key}`}>
          <h2
            id={`month-${group.key}`}
            className="mb-3 font-heading text-lg text-muted-foreground"
          >
            {group.label}
          </h2>
          <div className="flex flex-col gap-3">
            {group.items.map((e) => (
              <EntryCard key={e.id} entry={e} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
