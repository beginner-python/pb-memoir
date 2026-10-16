import type { ChatMessage, Entry } from "@/lib/types";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** "2026-10-16" → Date(ローカル)。UTC ずれを避けるため分解して作る */
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDateJa(iso: string): string {
  const d = parseIsoDate(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function formatDateWithWeekday(iso: string): string {
  const d = parseIsoDate(iso);
  return `${formatDateJa(iso)}(${WEEKDAYS[d.getDay()]})`;
}

/** 今年の日付は「10月12日」、それ以外は「2025年8月10日」。today が未確定(サーバー側)なら年付き */
export function formatDateRelativeToYear(iso: string, today: string | null): string {
  const d = parseIsoDate(iso);
  if (today && iso.slice(0, 4) === today.slice(0, 4)) return `${d.getMonth() + 1}月${d.getDate()}日`;
  return formatDateJa(iso);
}

export function formatMonthJa(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  return `${y}年${m}月`;
}

/** 本文の先頭を抜粋にする。改行は空白にし、長ければ省略記号を付ける */
export function excerpt(body: string, maxChars = 90): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > maxChars ? `${flat.slice(0, maxChars).trimEnd()}…` : flat;
}

export type MonthGroup = { key: string; label: string; items: Entry[] };

/** 日付降順の一覧を月ごとにまとめる(入力順を保つ) */
export function groupByMonth(entries: Entry[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const e of entries) {
    const key = e.entry_date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(e);
    else groups.push({ key, label: formatMonthJa(key), items: [e] });
  }
  return groups;
}

/** バックエンドに送る履歴は直近 max 件に切る */
export function trimHistory(messages: ChatMessage[], max = 10): ChatMessage[] {
  return messages.length <= max ? messages : messages.slice(messages.length - max);
}

export function formatSimilarity(value: number): string {
  return value.toFixed(2);
}
