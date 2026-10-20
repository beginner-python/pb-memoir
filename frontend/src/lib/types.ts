// バックエンド(FastAPI)のスキーマに対応する型。backend/app/schemas.py と揃える。

export type Health = {
  status: "ok";
  app_env: string;
  llm_provider: "openai" | "mock";
  read_only: boolean;
  database: "ok" | "unavailable";
  commit: string | null;
};

export type Entry = {
  id: string;
  entry_date: string; // YYYY-MM-DD
  body: string;
  chunk_count: number;
  created_at: string;
  updated_at: string;
};

export type EntryList = { items: Entry[]; total: number };

export type EntryCreate = { entry_date: string; body: string };
export type EntryUpdate = Partial<EntryCreate>;

export type DateRange = {
  from: string;
  to: string;
  label: string;
  source: "llm" | "cache";
  as_of: string;
};

export type SourceItem = {
  index: number;
  entry_id: string;
  entry_date: string;
  content: string;
  similarity: number;
};

export type SearchResult = {
  date_range: DateRange | null;
  widened: boolean;
  items: SourceItem[];
};

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type Suggestions = { generated_at: string; items: { question: string }[] };

export type SseEvent = { event: string; data: unknown };
