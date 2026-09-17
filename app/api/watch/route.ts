import fs from "node:fs";
import path from "node:path";
import { MEMORY_DIR, VAULT_DIR, fingerprint } from "@/lib/garden";

export const dynamic = "force-dynamic";

/**
 * Server-sent events. Memory auto-commits hourly and seven scheduled agents write into
 * it, so the garden genuinely changes while nobody is looking — this is what makes the
 * canvas grow in place instead of needing a reload.
 */
export async function GET(request: Request) {
  // A deployed garden is frozen — there is no home directory to watch. Answer
  // once and close, rather than holding a serverless function open forever.
  if (process.env.NIWA_MODE) {
    return new Response("event: frozen\ndata: {}\n\n", {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  const encoder = new TextEncoder();
  let last = fingerprint();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (event: string, data: string) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${data}\n\n`),
          );
        } catch {
          closed = true;
        }
      };

      send("open", JSON.stringify({ at: new Date().toISOString() }));

      let debounce: NodeJS.Timeout | null = null;
      const check = () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => {
          const next = fingerprint();
          if (next !== last) {
            last = next;
            send("changed", JSON.stringify({ at: new Date().toISOString() }));
          }
        }, 400);
      };

      const watchers: fs.FSWatcher[] = [];
      for (const dir of [MEMORY_DIR, path.join(VAULT_DIR, "Glossary")]) {
        try {
          watchers.push(fs.watch(dir, { recursive: true }, check));
        } catch {
          /* directory absent on this machine — the other watcher still works */
        }
      }

      // fs.watch misses some editor write patterns; a slow poll is the safety net.
      const poll = setInterval(check, 15_000);
      const beat = setInterval(() => send("beat", String(Date.now())), 25_000);

      const cleanup = () => {
        closed = true;
        clearInterval(poll);
        clearInterval(beat);
        if (debounce) clearTimeout(debounce);
        for (const w of watchers) w.close();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
    },
  });
}
