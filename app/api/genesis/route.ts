import { buildGarden } from "@/lib/garden";
import {
  ROUTE_KEYS,
  ask,
  inCorpus,
  normaliseSplit,
  opening,
  receive,
  rows,
  standing,
  type Route,
} from "@/lib/genesis";
import { GENESIS_DIR, readGenesis, writeGenesis } from "@/lib/genesis-store";

export const dynamic = "force-dynamic";

const today = () => new Date().toISOString().slice(0, 10);
const OLLAMA = process.env.NIWA_OLLAMA ?? "http://127.0.0.1:11434";
const MODEL = process.env.NIWA_MODEL ?? "qwen3.6:35b-a3b";
/** How many stones the model reads at a time. */
const BATCH = 8;

const frozen = () =>
  Response.json({ frozen: true }, { headers: { "cache-control": "public, max-age=300" } });
const fail = (e: unknown, status = 400) =>
  Response.json({ error: (e as Error).message }, { status });

/**
 * Every stone with words in it, the mark that stands on it and who made it,
 * and the reader's split. The deployed garden has no stones to read.
 */
export async function GET() {
  if (process.env.NIWA_MODE) return frozen();
  let g;
  try {
    g = readGenesis();
  } catch (e) {
    return fail(e, 500);
  }
  const garden = buildGarden();
  const byId = new Map(garden.nodes.map((n) => [n.id, n]));
  const stones = rows(garden.nodes, g, today()).map((r) => {
    const n = byId.get(r.id)!;
    return { ...r, label: n.label, modified: n.modified, why: g.untold[r.id] ?? "" };
  });
  return Response.json(
    { stones, guess: g.guess, model: MODEL, dir: GENESIS_DIR },
    { headers: { "cache-control": "no-store" } },
  );
}

/** The reader's split, said before the counts. Said again, it is replaced. */
export async function PUT(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as { split?: unknown } | null;
  if (!body?.split || typeof body.split !== "object")
    return Response.json({ error: "a split, route by route" }, { status: 400 });
  const split = normaliseSplit(body.split as Partial<Record<Route, number>>);
  if (!ROUTE_KEYS.some((k) => split[k] > 0))
    return Response.json({ error: "put something on at least one route" }, { status: 400 });
  try {
    const g = readGenesis();
    g.guess = { split, on: today() };
    writeGenesis(g);
    return Response.json({ guess: g.guess });
  } catch (e) {
    return fail(e, 500);
  }
}

/**
 * The reader's word on one stone: a route (theirs from now on, over any rule
 * or proposal), or null to take their word back.
 */
export async function PATCH(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    id?: unknown;
    from?: unknown;
    because?: unknown;
  } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return Response.json({ error: "which stone?" }, { status: 400 });
  try {
    const g = readGenesis();
    const node = buildGarden().nodes.find((n) => n.id === id);
    if (!node || !inCorpus(node)) return new Response(null, { status: 404 });
    if (body?.from === null) {
      if (g.marks[id]?.by === "you") delete g.marks[id];
    } else if ((ROUTE_KEYS as unknown[]).includes(body?.from)) {
      const prior = standing([node], g, today()).get(id);
      g.marks[id] = {
        from: body!.from as Route,
        by: "you",
        because:
          typeof body?.because === "string"
            ? body.because.slice(0, 400)
            : prior && prior.from === body!.from
              ? prior.because
              : "",
        on: today(),
      };
      delete g.untold[id];
    } else return Response.json({ error: "no such route" }, { status: 400 });
    writeGenesis(g);
    return Response.json({ mark: standing([node], g, today()).get(id) ?? null });
  } catch (e) {
    return fail(e, 500);
  }
}

/**
 * The model on this machine reads the next few stones no one has placed and
 * proposes a route for each, with a quote from the stone. The proposals are
 * written as proposals; the reader's own marks are never touched. The page
 * calls this again until nothing is left, or the reader stops it.
 */
export async function POST() {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  let g;
  try {
    g = readGenesis();
  } catch (e) {
    return fail(e, 500);
  }
  const on = today();
  const nodes = buildGarden().nodes.filter(inCorpus);
  const s = standing(nodes, g, on);
  const waiting = nodes.filter((n) => !s.has(n.id) && !g.untold[n.id]);
  if (!waiting.length) return Response.json({ read: 0, left: 0 });
  const batch = waiting.slice(0, BATCH).map((n) => ({ id: n.id, text: opening(n) }));
  const prompt = ask(batch);
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(`${OLLAMA}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        think: false,
        format: prompt.schema,
        options: { temperature: 0.2, num_predict: 1400 },
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      }),
      signal: AbortSignal.timeout(240_000),
    });
  } catch {
    return Response.json(
      { error: `no model answering at ${OLLAMA.replace(/^https?:\/\//, "")} — is Ollama up?` },
      { status: 503 },
    );
  }
  if (!res.ok)
    return Response.json({ error: `the model refused: ${res.status}` }, { status: 502 });
  const data = (await res.json().catch(() => null)) as { message?: { content?: string } } | null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(data?.message?.content ?? "");
  } catch {
    parsed = null;
  }
  const got = receive(parsed, batch, on);
  // Read the file again before writing: the reader may have marked a stone
  // while the model was reading, and their word is never written over.
  try {
    const now = readGenesis();
    for (const [id, m] of Object.entries(got.marks))
      if (now.marks[id]?.by !== "you") now.marks[id] = m;
    for (const [id, why] of Object.entries(got.untold))
      if (now.marks[id]?.by !== "you") now.untold[id] = why;
    writeGenesis(now);
  } catch (e) {
    return fail(e, 500);
  }
  return Response.json({
    read: batch.length,
    placed: Object.keys(got.marks).length,
    left: waiting.length - batch.length,
    ms: Date.now() - started,
    model: MODEL,
  });
}
