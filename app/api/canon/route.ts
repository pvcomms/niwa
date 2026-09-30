import { buildGarden, fingerprint, type GardenNode } from "@/lib/garden";
import { buildIndex, CORPUS_KINDS, type Index } from "@/lib/taste";
import { validateCanon, type Dated, type Root } from "@/lib/canon";
import { reachers, rootsOf, strandOf } from "@/lib/canon-strand";
import {
  CANON_DIR,
  deleteCanon,
  readCanon,
  writeCanon,
} from "@/lib/canon-store";
import { firstDays } from "@/lib/fence-store";
import { SPECIMEN_CANON } from "@/content/canon";

export const dynamic = "force-dynamic";

type Model = {
  fp: string;
  nodes: GardenNode[];
  links: ReturnType<typeof buildGarden>["links"];
  reach: ReturnType<typeof reachers>;
  index: Index;
  dayOf: (n: GardenNode) => Dated;
  roots: Root[];
  corpus: number;
};

// Built once per state of the sources: who reaches for whom, the word index
// kin is read from, and the day each file first appears in its repository.
let model: Model | null = null;

function getModel(): Model {
  const fp = fingerprint();
  if (model && model.fp === fp) return model;
  const g = buildGarden();
  const reach = reachers(g.links);
  const index = buildIndex(g.nodes);
  const stones = g.nodes.filter((n) => CORPUS_KINDS.has(n.kind));
  const first = firstDays(stones.map((n) => n.file));
  const dayOf = (n: GardenNode): Dated => {
    const d = first(n.file);
    if (d) return { day: d, approx: false };
    return n.modified
      ? { day: n.modified.slice(0, 10), approx: true }
      : { day: null, approx: false };
  };
  model = {
    fp,
    nodes: g.nodes,
    links: g.links,
    reach,
    index,
    dayOf,
    roots: rootsOf(g.nodes, reach, dayOf),
    corpus: stones.length,
  };
  return model;
}

/**
 * The strands kept; the roots — every stone reached for by three or more,
 * most reached-for first; and, with `?root=` (or `?id=` from a stone's
 * reader), the strand that grows from that stone. A deployed garden serves
 * the specimen read-only and reads nothing of the garden. No model is asked.
 */
export async function GET(req: Request) {
  if (process.env.NIWA_MODE)
    return Response.json(
      {
        canon: SPECIMEN_CANON,
        roots: [],
        strand: null,
        corpus: 0,
        writable: false,
        dir: null,
      },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  const q = new URL(req.url).searchParams;
  const id = q.get("root") ?? q.get("id");
  const m = getModel();
  const strand = id
    ? strandOf(id, m.nodes, m.links, m.reach, m.index, m.dayOf)
    : null;
  return Response.json(
    {
      canon: readCanon(),
      roots: m.roots,
      strand,
      corpus: m.corpus,
      writable: true,
      dir: CANON_DIR,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    canon?: unknown;
    fresh?: unknown;
  } | null;
  try {
    return Response.json(
      writeCanon(validateCanon(body?.canon), body?.fresh === true),
    );
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  try {
    return deleteCanon(slug)
      ? Response.json({ gone: true })
      : new Response(null, { status: 404 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
