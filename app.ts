import type { Answer, Result, Sources } from './app.contract.d.ts';

type Count = Result<'sseCount'>;

export const grants = 'net.fetch http://127.0.0.1:8787';

const origin = 'http://127.0.0.1:8787';

const sources: Sources = {
  sseCount: ([sent, batch, gap]) => {
    let delivered = 0;
    let coalesced = 0;
    let last = -1;
    return fetch(`${origin}/sse?n=${sent}&batch=${batch}&gap=${gap}`, {
      exactStream: (event): Count => {
        if (event.type === 'error') return { delivered, coalesced, last, done: true, end: `${event.kind}: ${event.message}` };
        delivered += 1;
        coalesced += event.coalesced ?? 0;
        last = Number(event.data);
        return { delivered, coalesced, last, done: false, end: '' };
      },
    });
  },
  byteCount: ([sent, batch, gap]) => {
    const decoder = new TextDecoder();
    let pending = '';
    let delivered = 0;
    let last = -1;
    return fetch(`${origin}/bytes?n=${sent}&batch=${batch}&gap=${gap}`, {
      exactStream: (event): Count => {
        if (event.type === 'error') return { delivered, coalesced: 0, last, done: true, end: `${event.kind}: ${event.message}` };
        pending += typeof event.data === 'string' ? event.data : decoder.decode(new Uint8Array(event.data), { stream: true });
        const lines = pending.split('\n');
        pending = lines.pop() ?? '';
        for (const line of lines) {
          delivered += 1;
          last = Number(line);
        }
        return { delivered, coalesced: 0, last, done: false, end: '' };
      },
    });
  },
};
export const answer: Answer = (source, args, store, storage, native) =>
  sources[source](args, store, storage, native);
