// Sends `n` numbered messages as server-sent events (/sse) or as newline-delimited bytes (/bytes).
// `batch` messages go out in one write, and writes are `gap` ms apart, the way a model's tokens reach a proxy.
const port = Number(process.env.PORT ?? 8787);

function numbered(n: number, batch: number, gap: number, frame: (i: number) => string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for (let i = 0; i < n; i += batch) {
        let write = '';
        for (let j = i; j < Math.min(n, i + batch); j++) write += frame(j);
        controller.enqueue(encoder.encode(write));
        if (gap > 0) await Bun.sleep(gap);
      }
      controller.close();
    },
  });
}

Bun.serve({
  hostname: '127.0.0.1',
  port,
  fetch(request) {
    const url = new URL(request.url);
    const n = Number(url.searchParams.get('n') ?? 300);
    const batch = Math.max(1, Number(url.searchParams.get('batch') ?? 1));
    const gap = Number(url.searchParams.get('gap') ?? 0);
    const headers = { 'cache-control': 'no-store', 'access-control-allow-origin': '*' };
    if (url.pathname === '/sse') {
      return new Response(numbered(n, batch, gap, (i) => `data: ${i}\n\n`), { headers: { ...headers, 'content-type': 'text/event-stream' } });
    }
    if (url.pathname === '/bytes') {
      return new Response(numbered(n, batch, gap, (i) => `${i}\n`), { headers: { ...headers, 'content-type': 'application/x-ndjson' } });
    }
    return new Response('not found', { status: 404 });
  },
});
console.log(`listening on http://127.0.0.1:${port}`);
