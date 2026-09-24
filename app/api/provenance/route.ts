import { buildGarden, type GardenNode } from "@/lib/garden";
import { buildFlow } from "@/lib/flow";
import { inputsOf } from "@/lib/course";
import { boil } from "@/lib/taste";
import {
  askQuestions,
  evidenceOf,
  validateProposal,
  validateProvenance,
} from "@/lib/provenance";
import {
  PROVENANCE_DIR,
  deleteProvenance,
  readProvenances,
  writeProvenance,
} from "@/lib/provenance-store";
import { SPECIMEN_PROVENANCE } from "@/content/specimen-provenance";

export const dynamic = "force-dynamic";

const today = () => new Date().toISOString().slice(0, 10);

/** The model on this machine, the same one the way asks. */
const OLLAMA = process.env.NIWA_OLLAMA ?? "http://127.0.0.1:11434";
const MODEL = process.env.NIWA_MODEL ?? "qwen3.6:35b-a3b";

/**
 * The provenances kept — or, with `?stone=`, what the garden itself knows
 * about a belief's provenance: what flows straight into it, by kind, and
 * the hosts those inputs name. A deployed garden has none to read and no
 * garden to ask, so it serves the specimen, read-only, and no evidence.
 */
export async function GET(req: Request) {
  const stone = new URL(req.url).searchParams.get("stone");
  if (stone !== null) {
    if (process.env.NIWA_MODE)
      return Response.json(
        { evidence: null },
        { headers: { "cache-control": "public, max-age=300" } },
      );
    const g = buildGarden();
    const nodes = new Map<string, GardenNode>(g.nodes.map((n) => [n.id, n]));
    const node = nodes.get(stone);
    if (!node) return new Response(null, { status: 404 });
    const inputs = inputsOf(buildFlow(g.links), nodes, stone);
    return Response.json(
      { evidence: evidenceOf(node, inputs, nodes) },
      { headers: { "cache-control": "no-store" } },
    );
  }
  if (process.env.NIWA_MODE)
    return Response.json(
      {
        provenances: [SPECIMEN_PROVENANCE],
        writable: false,
        dir: null,
        model: null,
      },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  return Response.json(
    {
      provenances: readProvenances(),
      writable: true,
      dir: PROVENANCE_DIR,
      model: MODEL,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    provenance?: unknown;
    fresh?: unknown;
  } | null;
  try {
    const p = validateProvenance(body?.provenance, today());
    return Response.json(writeProvenance(p, body?.fresh === true));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  if (!slug) return Response.json({ error: "which claim?" }, { status: 400 });
  try {
    return Response.json({ gone: deleteProvenance(slug) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

/**
 * The page behind a hand's link, read once on the reader's press and boiled
 * to a title, its host and its first words — the same one call the
 * distribution makes, to the host the reader pasted and no other.
 */
async function readOnce(url: string) {
  const u = new URL(url);
  if (u.protocol !== "http:" && u.protocol !== "https:")
    throw new Error("only http(s) links");
  const res = await fetch(u, {
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
    headers: {
      "user-agent":
        "niwa/0.1 (a local reading instrument; one fetch on a press)",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`the page answered ${res.status}`);
  const buf = await res.arrayBuffer();
  const html = new TextDecoder("utf-8", { fatal: false }).decode(
    buf.slice(0, 1_500_000),
  );
  const { title, text } = boil(html);
  return {
    title: title.slice(0, 200),
    host: u.hostname.replace(/^www\./, ""),
    words: text.replace(/\s+/g, " ").trim().slice(0, 600),
    on: today(),
  };
}

/**
 * Two asks, both on a press, neither written here. `read`: the page behind
 * a link, once. `ask`: the model on this machine, for questions to put to
 * each hand, checks that would settle the claim, and turns in the wording —
 * never for whether the claim is so. What comes back is a proposal the desk
 * folds in as proposed, and the reader keeps or not.
 */
export async function POST(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    read?: unknown;
    provenance?: unknown;
  } | null;
  if (typeof body?.read === "string") {
    try {
      return Response.json({ seen: await readOnce(body.read.trim()) });
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 400 });
    }
  }
  let p;
  try {
    p = validateProvenance(body?.provenance, today());
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  const prompt = askQuestions(p, today());
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
        options: { temperature: 0.5, num_predict: 1600 },
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
  let parsed: unknown;
  try {
    parsed = JSON.parse(data?.message?.content ?? "");
  } catch {
    return Response.json(
      { error: "the model answered, but not in a shape the desk can fold in" },
      { status: 502 },
    );
  }
  return Response.json({
    proposal: validateProposal(
      parsed,
      p.hops.map((h) => h.id),
    ),
    model: MODEL,
    ms: Date.now() - started,
  });
}
