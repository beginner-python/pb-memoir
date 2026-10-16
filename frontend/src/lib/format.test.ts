import { describe, expect, it } from "vitest";

import {
  excerpt,
  formatDateJa,
  formatDateRelativeToYear,
  formatDateWithWeekday,
  groupByMonth,
  todayIso,
  trimHistory,
} from "./format";
import type { Entry } from "./types";

const entry = (id: string, entry_date: string): Entry => ({
  id,
  entry_date,
  body: "本文",
  chunk_count: 1,
  created_at: "",
  updated_at: "",
});

describe("dates", () => {
  it("formats without timezone shift", () => {
    expect(formatDateJa("2025-08-10")).toBe("2025年8月10日");
    expect(formatDateWithWeekday("2026-10-16")).toBe("2026年10月16日(金)");
  });
  it("omits the year only for the current year", () => {
    expect(formatDateRelativeToYear("2026-10-12", "2026-10-16")).toBe("10月12日");
    expect(formatDateRelativeToYear("2025-08-10", "2026-10-16")).toBe("2025年8月10日");
    expect(formatDateRelativeToYear("2026-10-12", null)).toBe("2026年10月12日");
  });
  it("todayIso uses local date", () => {
    expect(todayIso(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("groupByMonth", () => {
  it("groups consecutive entries by month keeping order", () => {
    const groups = groupByMonth([entry("a", "2026-10-15"), entry("b", "2026-10-01"), entry("c", "2026-09-30")]);
    expect(groups.map((g) => [g.label, g.items.map((e) => e.id)])).toEqual([
      ["2026年10月", ["a", "b"]],
      ["2026年9月", ["c"]],
    ]);
  });
  it("returns empty for no entries", () => {
    expect(groupByMonth([])).toEqual([]);
  });
});

describe("excerpt", () => {
  it("flattens whitespace and truncates", () => {
    expect(excerpt("一行目\n二行目  三行目", 7)).toBe("一行目 二行目…");
    expect(excerpt("短い")).toBe("短い");
  });
});

describe("trimHistory", () => {
  it("keeps the most recent messages", () => {
    const msgs = Array.from({ length: 12 }, (_, i) => ({ role: "user" as const, content: String(i) }));
    const trimmed = trimHistory(msgs, 10);
    expect(trimmed).toHaveLength(10);
    expect(trimmed[0].content).toBe("2");
  });
});
