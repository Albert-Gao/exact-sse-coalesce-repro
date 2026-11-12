# Exact drops server-sent events that arrive in one read

An `exactStream` mapper on a `text/event-stream` response sees only the newest event of each network read. The others are counted in `event.coalesced` but never reach the mapper. A mapper that folds the stream (appending text deltas, counting events) loses data even when the server sends slowly.

The same messages sent as a byte stream (any other content type) arrive complete.

## Run it

Clone this beside your Exact checkout (the app finds it at `../exact`, or set `EXACT`).

```sh
bun tools/server.ts          # http://127.0.0.1:8787, keep it running
bun exact.mjs test web       # or: bun exact.mjs test ios
```

`tools/server.ts` sends 300 numbered messages, 3 to a write, one write every 20 ms (about 6 seconds in all). `/sse` frames them as server-sent events and `/bytes` as newline-delimited lines. `app.ts` counts what each mapper saw.

```
test "a byte stream delivers every message": ok
test "an event stream delivers every message": FAIL
  an event stream delivers every message: line 10: sse.delivered is 100, expected 300
```

## Measured

300 messages on the web host at Exact 981bd55d, one write every 20 ms (`state batch` in `app.contract` sets the messages per write):

| Messages per write | SSE delivered | SSE coalesced | Bytes delivered |
| --- | --- | --- | --- |
| 1 | 300 | 0 | 300 |
| 2 | 150 | 150 | 300 |
| 3 | 100 | 200 | 300 |
| 10 | 30 | 270 | 300 |

The loss tracks how many events share a read, not how fast they come. `test ios` on the iOS Simulator fails the same way: 100 of 300.
