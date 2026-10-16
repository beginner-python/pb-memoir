import { describe, expect, it } from "vitest";

import { parseSse, parseSseBlock } from "./sse";

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>) {
  const out = [];
  for await (const ev of parseSse(stream)) out.push(ev);
  return out;
}

describe("parseSseBlock", () => {
  it("parses event and JSON data", () => {
    expect(parseSseBlock('event: token\ndata: {"text": "こん"}')).toEqual({
      event: "token",
      data: { text: "こん" },
    });
  });

  it("defaults event to message and keeps non-JSON data as string", () => {
    expect(parseSseBlock("data: hello")).toEqual({ event: "message", data: "hello" });
  });

  it("joins multiple data lines and ignores comments", () => {
    expect(parseSseBlock(": keepalive\ndata: a\ndata: b")).toEqual({ event: "message", data: "a\nb" });
  });

  it("returns null without data", () => {
    expect(parseSseBlock("event: done")).toBeNull();
  });
});

describe("parseSse", () => {
  it("yields events in order", async () => {
    const events = await collect(
      streamOf(['event: sources\ndata: {"items": []}\n\n', 'event: token\ndata: {"text": "a"}\n\n', "event: done\ndata: {}\n\n"]),
    );
    expect(events.map((e) => e.event)).toEqual(["sources", "token", "done"]);
    expect(events[1].data).toEqual({ text: "a" });
  });

  it("reassembles events split across chunks, including multibyte characters", async () => {
    const full = 'event: token\ndata: {"text": "日本語"}\n\nevent: done\ndata: {}\n\n';
    const bytes = new TextEncoder().encode(full);
    // 3 バイト文字の途中で切る
    const cut = full.indexOf("日本語") + 1;
    const chunk1 = bytes.slice(0, cut);
    const chunk2 = bytes.slice(cut);
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(chunk1);
        c.enqueue(chunk2);
        c.close();
      },
    });
    const events = await collect(stream);
    expect(events).toEqual([
      { event: "token", data: { text: "日本語" } },
      { event: "done", data: {} },
    ]);
  });

  it("handles CRLF separators and a trailing block without terminator", async () => {
    const events = await collect(streamOf(["event: token\r\ndata: {\"text\":\"x\"}\r\n\r\nevent: done\r\ndata: {}"]));
    expect(events.map((e) => e.event)).toEqual(["token", "done"]);
  });
});
