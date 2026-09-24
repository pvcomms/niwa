import { buildGarden, fingerprint, type GardenNode } from "@/lib/garden";
import {
  K,
  boil,
  buildIndex,
  conceptsIn,
  distribution,
  heaviest,
  pairwise,
  place,
  slugOf,
  tokens,
  vectorise,
  windowMembers,
  type Choice,
  type Curve,
  type Index,
  type Placement,
} from "@/lib/taste";
import {
  TASTE_DIR,
  deleteChoice,
  readChoice,
  readChoices,
  writeChoice,
} from "@/lib/taste-store";

export const dynamic = "force-dynamic";

type WinKey = "all" | "d90" | "d30";
const DAYS: Record<WinKey, number | null> = { all: null, d90: 90, d30: 30 };

type Model = {
  fp: string;
  index: Index;
  members: Record<WinKey, number[]>;
  windows: Record<WinKey, Curve | null>;
  nodes: GardenNode[];
};

// Built once per state of the sources: the pairwise likeness of every stone
// to every other is the expensive part, and the garden's own cache key says
// when it is stale.
let model: Model | null = null;

function getModel(): Model {
  const fp = fingerprint();
  if (model && model.fp === fp) return model;
  const g = buildGarden();
  const index = buildIndex(g.nodes);
  const M = pairwise(index.docs);
  const members = {
    all: windowMembers(index.docs, DAYS.all),
    d90: windowMembers(index.docs, DAYS.d90),
    d30: windowMembers(index.docs, DAYS.d30),
  };
  model = {
    fp,
    index,
    members,
    windows: {
      all: distribution(index.docs, M, members.all),
      d90: distribution(index.docs, M, members.d90),
      d30: distribution(index.docs, M, members.d30),
    },
    nodes: g.nodes,
  };
  return model;
}

const frozen = () =>
  Response.json({ frozen: true }, { headers: { "cache-control": "public, max-age=300" } });

export async function GET() {
  if (process.env.NIWA_MODE) return frozen();
  const m = getModel();
  return Response.json(
    {
      windows: m.windows,
      k: K,
      corpus: m.index.N,
      choices: readChoices(),
      dir: TASTE_DIR,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

/**
 * The one network call this garden makes, and only on the reader's press:
 * the page behind a pasted link, boiled down to a title and its words.
 */
async function fetchPage(url: string): Promise<{ title: string; text: string }> {
  const u = new URL(url);
  if (u.protocol !== "http:" && u.protocol !== "https:")
    throw new Error("only http(s) links");
  const res = await fetch(u, {
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
    headers: {
      "user-agent": "niwa/0.1 (a local reading instrument; one fetch on a press)",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`the page answered ${res.status}`);
  const buf = await res.arrayBuffer();
  const html = new TextDecoder("utf-8", { fatal: false }).decode(
    buf.slice(0, 1_500_000),
  );
  return boil(html);
}

export async function POST(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    title?: string;
    text?: string;
    url?: string;
  } | null;
  if (!body) return Response.json({ error: "nothing to weigh" }, { status: 400 });

  if (body.url && !body.text?.trim()) {
    try {
      return Response.json({ fetched: await fetchPage(body.url.trim()) });
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 400 });
    }
  }

  const title = (body.title ?? "").trim().slice(0, 200);
  const text = (body.text ?? "").trim().slice(0, 20_000);
  if (tokens(`${title} ${text}`).length < 4)
    return Response.json(
      { error: "too few words to weigh — paste a line or two" },
      { status: 400 },
    );
  const m = getModel();
  const cvec = vectorise(m.index, title, text);
  const windows: Record<WinKey, Placement | null> = { all: null, d90: null, d30: null };
  for (const key of Object.keys(windows) as WinKey[]) {
    const curve = m.windows[key];
    if (curve) windows[key] = place(m.index.docs, m.members[key], curve, cvec);
  }
  return Response.json({
    reading: {
      title,
      terms: heaviest(cvec),
      concepts: conceptsIn(m.nodes, `${title}\n${text}`),
      windows,
    },
  });
}

/** Keep a weighed choice. */
export async function PUT(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as Partial<Choice> | null;
  if (!body || typeof body.title !== "string" || !body.title.trim())
    return Response.json({ error: "a choice needs a title" }, { status: 400 });
  const taken = new Set(readChoices().map((c) => c.slug));
  const base = slugOf(body.title);
  let slug = base;
  let n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;
  const z: Record<string, number> = {};
  if (body.z && typeof body.z === "object")
    for (const [k, v] of Object.entries(body.z))
      if (Number.isFinite(Number(v))) z[k] = Number(v);
  const choice: Choice = {
    slug,
    title: body.title.trim().slice(0, 200),
    source: typeof body.source === "string" ? body.source.slice(0, 500) : "",
    weighed: new Date().toISOString().slice(0, 10),
    verdict:
      body.verdict === "let in" || body.verdict === "passed" ? body.verdict : "",
    z,
    note: typeof body.note === "string" ? body.note.slice(0, 5_000) : "",
    text: typeof body.text === "string" ? body.text.slice(0, 20_000) : "",
  };
  try {
    writeChoice(choice);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  return Response.json(choice);
}

export async function PATCH(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as Partial<Choice> | null;
  if (!body || typeof body.slug !== "string")
    return Response.json({ error: "which choice?" }, { status: 400 });
  try {
    const cur = readChoice(body.slug);
    if (!cur) return new Response(null, { status: 404 });
    const next: Choice = {
      ...cur,
      verdict:
        body.verdict === "let in" || body.verdict === "passed" || body.verdict === ""
          ? body.verdict
          : cur.verdict,
      note: typeof body.note === "string" ? body.note.slice(0, 5_000) : cur.note,
    };
    writeChoice(next);
    return Response.json(next);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  try {
    return Response.json({ gone: deleteChoice(slug) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
