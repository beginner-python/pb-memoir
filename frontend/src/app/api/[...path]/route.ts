// FastAPI への catch-all プロキシ。バックエンドの URL をブラウザに出さず、CORS も不要にする。
// レスポンス本文はストリームのまま返すので SSE (/chat) も通る。

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:8000").replace(/\/+$/, "");

type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, ctx: Ctx): Promise<Response> {
  const { path } = await ctx.params;
  const incoming = new URL(request.url);
  const target = `${BACKEND_URL}/${path.join("/")}${incoming.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");

  const hasBody = !["GET", "HEAD"].includes(request.method);
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      cache: "no-store",
      signal: request.signal,
      // Node の fetch でストリーム本文を送るときに必要
      ...(hasBody ? { duplex: "half" } : {}),
    } as RequestInit);

    const resHeaders = new Headers(upstream.headers);
    // fetch が解凍済みなので、転送時に矛盾するヘッダーは落とす
    resHeaders.delete("content-encoding");
    resHeaders.delete("content-length");
    return new Response(upstream.body, { status: upstream.status, headers: resHeaders });
  } catch (err) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    console.error(`[proxy] ${request.method} ${target} failed:`, err);
    return Response.json({ detail: "バックエンドに接続できません" }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };
