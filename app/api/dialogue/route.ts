import { buildGarden, type GardenNode } from "@/lib/garden";
import { buildFlow } from "@/lib/flow";
import { inputsOf } from "@/lib/course";
import { readConfig } from "@/lib/bearing-store";
import { DEFAULT_CONFIG } from "@/lib/bearing";
import {
  FAMILIES,
  askNext,
  gardenQuestions,
  validateDialogue,
  validateProposal,
  type Bank,
} from "@/lib/dialogue";
import {
  DIALOGUE_DIR,
  deleteDialogue,
  readBank,
  readDialogues,
  writeDialogue,
} from "@/lib/dialogue-store";
import { SPECIMEN_DIALOGUE, STARTER_BANK } from "@/content/dialogue";

export const dynamic = "force-dynamic";

const today = () => new Date().toISOString().slice(0, 10);

/** The model on this machine, the same one the way and the provenance ask. */
const OLLAMA = process.env.NIWA_OLLAMA ?? "http://127.0.0.1:11434";
const MODEL = process.env.NIWA_MODEL ?? "qwen3.6:35b-a3b";

const merged = (own: Bank): Bank =>
  Object.fromEntries(FAMILIES.map((f) => [f, [...own[f], ...STARTER_BANK[f]]])) as Bank;

/**
 * The dialogues kept, with the bank — the reader's own questions first, then
 * the starter's — or, with `?stone=`, the questions the garden itself can
 * put about a stone, from its first sentence, its roots, what it flows into,
 * the reader's values and when it was touched. A deployed garden serves the
 * specimen and the starter bank, read-only, and asks nothing of any stone.
 */
export async function GET(req: Request) {
  const stone = new URL(req.url).searchParams.get("stone");
  if (stone !== null) {
    if (process.env.NIWA_MODE)
      return Response.json({ questions: [], stone: null }, { headers: { "cache-control": "public, max-age=300" } });
    const g = buildGarden();
    const nodes = new Map<string, GardenNode>(g.nodes.map((n) => [n.id, n]));
    const node = nodes.get(stone);
    if (!node) return new Response(null, { status: 404 });
    const flow = buildFlow(g.links);
    const inputs = inputsOf(flow, nodes, stone);
    const outOf = (flow.outOf.get(stone) ?? [])
      .map((a) => nodes.get(a.to))
      .filter((n): n is GardenNode => Boolean(n) && n!.id !== stone)
      .map((n) => ({ id: n.id, label: n.label }));
    return Response.json(
      {
        questions: gardenQuestions(node, inputs, outOf, nodes, readConfig().config.values),
        stone: { id: node.id, label: node.label, kind: node.kind, first: node.description || "" },
      },
      { headers: { "cache-control": "no-store" } },
    );
  }
  if (process.env.NIWA_MODE)
    return Response.json(
      { dialogues: [SPECIMEN_DIALOGUE], bank: STARTER_BANK, ownBank: false, writable: false, dir: null, model: null },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  const { bank, own } = readBank();
  return Response.json(
    {
      dialogues: readDialogues(),
      bank: merged(bank),
      ownBank: own,
      writable: true,
      dir: DIALOGUE_DIR,
      model: MODEL,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as { dialogue?: unknown; fresh?: unknown } | null;
  try {
    const d = validateDialogue(body?.dialogue, today());
    return Response.json(writeDialogue({ ...d, touched: today() }, body?.fresh === true));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  try {
    return deleteDialogue(slug) ? Response.json({ gone: true }) : new Response(null, { status: 404 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** Ask the model on this machine what to ask next. It is never asked what to answer. */
export async function POST(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as { dialogue?: unknown } | null;
  let d;
  try {
    d = validateDialogue(body?.dialogue, today());
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  const prompt = askNext(d, today());
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
        options: { temperature: 0.6, num_predict: 1200 },
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
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return Response.json({ error: `the model refused: ${text.slice(0, 200) || res.status}` }, { status: 502 });
  }
  const data = (await res.json().catch(() => null)) as { message?: { content?: string } } | null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(data?.message?.content ?? "");
  } catch {
    return Response.json(
      { error: "the model answered, but not in a shape the desk can fold in" },
      { status: 502 },
    );
  }
  const turnIds = d.turns.filter((t) => t.kept).map((t) => t.id);
  return Response.json({ proposal: validateProposal(parsed, turnIds), model: MODEL, ms: Date.now() - started });
}
