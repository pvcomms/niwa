import {
  askColour,
  askStructure,
  validateColour,
  validateProposal,
  validateWay,
  type Lane,
} from "@/lib/way";
import { WAY_DIR, deleteWay, readWays, writeWay } from "@/lib/way-store";
import { SPECIMEN_WAY } from "@/content/specimen-way";

export const dynamic = "force-dynamic";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * The one place the garden talks to a model, and it is a model on this
 * machine: Ollama at 127.0.0.1:11434, nothing else. Overridable, so a
 * reader can point it elsewhere on their own network knowingly.
 */
const OLLAMA = process.env.NIWA_OLLAMA ?? "http://127.0.0.1:11434";
const MODEL = process.env.NIWA_MODEL ?? "qwen3.6:35b-a3b";

/** The ways kept. A deployed garden has none to read, so it serves the specimen's, read-only, and no model. */
export async function GET() {
  if (process.env.NIWA_MODE)
    return Response.json(
      { ways: [SPECIMEN_WAY], writable: false, dir: null, model: null },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  return Response.json(
    { ways: readWays(), writable: true, dir: WAY_DIR, model: MODEL },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    way?: unknown;
    fresh?: unknown;
  } | null;
  try {
    const way = validateWay(body?.way, today());
    return Response.json(writeWay(way, body?.fresh === true));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  if (!slug) return Response.json({ error: "which way?" }, { status: 400 });
  try {
    return Response.json({ gone: deleteWay(slug) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

/**
 * Ask the model on this machine for the way between the two texts, or for
 * the then said again. Nothing is written here: what comes back is a
 * proposal the desk folds in as proposed, and the reader keeps or not.
 */
export async function POST(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    way?: unknown;
    ask?: unknown;
    lanes?: unknown;
  } | null;
  let way;
  try {
    way = validateWay(body?.way, today());
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  const ask = body?.ask === "colour" ? "colour" : "structure";
  const lanes: Lane[] = Array.isArray(body?.lanes)
    ? body!.lanes
        .filter((l) => l && typeof l === "object")
        .map((l) => ({
          id: String((l as Lane).id ?? "").slice(0, 40),
          label: String((l as Lane).label ?? "").slice(0, 40),
        }))
        .filter((l) => /^[a-z][a-z0-9-]*$/.test(l.id))
        .slice(0, 24)
    : [];
  if (ask === "colour" && !way.thenText.trim())
    return Response.json(
      { error: "there is no then to say again" },
      { status: 400 },
    );
  const prompt =
    ask === "colour"
      ? askColour(way, today())
      : askStructure(way, lanes, today());
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
        options: { temperature: 0.6, num_predict: 1600 },
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      }),
      signal: AbortSignal.timeout(240_000),
    });
  } catch {
    return Response.json(
      {
        error: `no model answering at ${OLLAMA.replace(/^https?:\/\//, "")} — is Ollama up?`,
      },
      { status: 503 },
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return Response.json(
      { error: `the model refused: ${text.slice(0, 200) || res.status}` },
      { status: 502 },
    );
  }
  const data = (await res.json().catch(() => null)) as {
    message?: { content?: string };
  } | null;
  const content = data?.message?.content ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return Response.json(
      { error: "the model answered, but not in a shape the desk can fold in" },
      { status: 502 },
    );
  }
  const ms = Date.now() - started;
  if (ask === "colour")
    return Response.json({ colour: validateColour(parsed), model: MODEL, ms });
  return Response.json({
    proposal: validateProposal(parsed, today(), way.then, lanes),
    model: MODEL,
    ms,
  });
}
