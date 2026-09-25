import { buildGarden } from "@/lib/garden";
import { readConfig } from "@/lib/bearing-store";
import { DEFAULT_CONFIG } from "@/lib/bearing";
import { askAdherent, validateMask, validateProposal } from "@/lib/mask";
import { MASK_DIR, deleteMask, readMasks, writeMask } from "@/lib/mask-store";
import { SPECIMEN_MASK } from "@/content/mask";

export const dynamic = "force-dynamic";

const today = () => new Date().toISOString().slice(0, 10);

/** The model on this machine, the same one the way, the provenance and the dialogue ask. */
const OLLAMA = process.env.NIWA_OLLAMA ?? "http://127.0.0.1:11434";
const MODEL = process.env.NIWA_MODEL ?? "qwen3.6:35b-a3b";

/**
 * The masks kept, with the reader's values (name and terms only, so the desk
 * can say which each case leans on) and, with `?id=`, the stone the reader
 * came from. A deployed garden serves the specimen and the sample values,
 * read-only, and asks nothing of any stone.
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const deployed = Boolean(process.env.NIWA_MODE);
  const values = (deployed ? DEFAULT_CONFIG : readConfig().config).values.map((v) => ({
    name: v.name,
    terms: v.terms,
  }));
  let about: { id: string; label: string; first: string } | null = null;
  if (id && !deployed) {
    const node = buildGarden().nodes.find((n) => n.id === id);
    if (node) about = { id: node.id, label: node.label, first: node.description || "" };
  }
  if (deployed)
    return Response.json(
      { masks: [SPECIMEN_MASK], values, about: null, writable: false, dir: null, model: null },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  return Response.json(
    { masks: readMasks(), values, about, writable: true, dir: MASK_DIR, model: MODEL },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as { mask?: unknown; fresh?: unknown } | null;
  try {
    const m = validateMask(body?.mask, today());
    return Response.json(writeMask({ ...m, touched: today() }, body?.fresh === true));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  try {
    return deleteMask(slug) ? Response.json({ gone: true }) : new Response(null, { status: 404 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** Ask the model on this machine to read the mask as an adherent. It is never asked whether the mask passes. */
export async function POST(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as { mask?: unknown } | null;
  let m;
  try {
    m = validateMask(body?.mask, today());
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  if (!m.otherCase.trim())
    return Response.json({ error: "there is no case in the mask to read yet" }, { status: 400 });
  const prompt = askAdherent(m, today());
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
  return Response.json({ proposal: validateProposal(parsed, m.otherCase), model: MODEL, ms: Date.now() - started });
}
