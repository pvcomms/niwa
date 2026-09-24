import { buildGarden, fingerprint, type GardenNode } from "@/lib/garden";
import {
  ANCHOR_MIN,
  K,
  THEMES_K,
  boil,
  buildIndex,
  conceptsIn,
  distribution,
  foldIn,
  heaviest,
  pairwise,
  place,
  simsTo,
  slugOf,
  themeCoords,
  themeMatrix,
  themeSims,
  themesOf,
  tokens,
  typicalAnchor,
  unknownWords,
  vectorise,
  windowMembers,
  type Choice,
  type Curve,
  type Index,
  type Placement,
  type Themes,
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
type Measure = "words" | "themes";
const DAYS: Record<WinKey, number | null> = { all: null, d90: 90, d30: 30 };
const WINS = Object.keys(DAYS) as WinKey[];

type Model = {
  fp: string;
  index: Index;
  members: Record<WinKey, number[]>;
  themes: Themes;
  coords: Float32Array;
  anchorTypical: number;
  curves: Record<Measure, Record<WinKey, Curve | null>>;
  nodes: GardenNode[];
};

// Built once per state of the sources: the pairwise likeness of every stone
// to every other, and the theme space on top of it, are the expensive parts,
// and the garden's own cache key says when they are stale.
let model: Model | null = null;

function curvesOf(index: Index, M: Float32Array, members: Record<WinKey, number[]>) {
  const out = {} as Record<WinKey, Curve | null>;
  for (const w of WINS) out[w] = distribution(index.docs, M, members[w]);
  return out;
}

function getModel(): Model {
  const fp = fingerprint();
  if (model && model.fp === fp) return model;
  const g = buildGarden();
  const index = buildIndex(g.nodes);
  const n = index.docs.length;
  const M = pairwise(index.docs);
  const members = {} as Record<WinKey, number[]>;
  for (const w of WINS) members[w] = windowMembers(index.docs, DAYS[w]);
  const themes = themesOf(M, n);
  const coords = themeCoords(themes);
  const T = themeMatrix(themes, coords);
  model = {
    fp,
    index,
    members,
    themes,
    coords,
    anchorTypical: typicalAnchor(themes, M, members.all),
    curves: { words: curvesOf(index, M, members), themes: curvesOf(index, T, members) },
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
      measures: m.curves,
      k: K,
      themesK: THEMES_K,
      anchorMin: ANCHOR_MIN,
      anchorTypical: m.anchorTypical,
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
  const all = simsTo(m.index.docs, m.members.all, cvec);
  const { q, anchor } = foldIn(m.themes, all);
  const measures: Record<Measure, Record<WinKey, Placement | null>> = {
    words: { all: null, d90: null, d30: null },
    themes: { all: null, d90: null, d30: null },
  };
  for (const w of WINS) {
    const members = m.members[w];
    const cw = m.curves.words[w];
    if (cw) measures.words[w] = place(m.index.docs, members, cw, simsTo(m.index.docs, members, cvec), cvec);
    const ct = m.curves.themes[w];
    // a text the garden's themes cannot hold has no place on them: its
    // direction would be noise, and the reading says so instead
    if (ct && anchor >= ANCHOR_MIN)
      measures.themes[w] = {
        ...place(m.index.docs, members, ct, themeSims(m.themes, m.coords, q, members), cvec),
        anchor,
      };
  }
  return Response.json({
    reading: {
      title,
      terms: heaviest(cvec),
      unknown: unknownWords(m.index, title, text),
      concepts: conceptsIn(m.nodes, `${title}\n${text}`),
      anchor,
      anchorTypical: m.anchorTypical,
      measures,
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
      if (Number.isFinite(Number(v)) && /^[a-z0-9_]+$/.test(k)) z[k] = Number(v);
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
