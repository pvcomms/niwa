import {
  BEARING_DIR,
  deleteBearing,
  readBearings,
  readConfig,
  writeBearing,
  writeConfig,
} from "@/lib/bearing-store";
import {
  DEFAULT_CONFIG,
  slugOf,
  validateConfig,
  type Bearing,
  type Trail,
} from "@/lib/bearing";

export const dynamic = "force-dynamic";

/**
 * The bearing's values and the decisions set down on it. A deployed garden has
 * no vault to read or write, so under NIWA_MODE it serves the shipped sample,
 * no decisions, and refuses every write — the sheet still works as a demo.
 */
export async function GET() {
  if (process.env.NIWA_MODE) {
    return Response.json(
      { config: DEFAULT_CONFIG, own: false, bearings: [], writable: false, dir: null },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  }
  const { config, own } = readConfig();
  return Response.json(
    { config, own, bearings: readBearings(), writable: true, dir: BEARING_DIR },
    { headers: { "cache-control": "no-store" } },
  );
}

const pt = (v: unknown): [number, number] | null =>
  Array.isArray(v) &&
  v.length === 2 &&
  v.every((n) => Number.isFinite(Number(n)))
    ? [Number(v[0]), Number(v[1])]
    : null;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const dayOr = (v: unknown, fallback: string) =>
  typeof v === "string" && DAY.test(v) ? v : fallback;
const trail = (v: unknown): Trail =>
  Array.isArray(v)
    ? v.flatMap((e) => {
        const p = Array.isArray(e) ? pt(e.slice(0, 2)) : null;
        return p && Array.isArray(e) && typeof e[2] === "string" && DAY.test(e[2])
          ? [[p[0], p[1], e[2]] as Trail[number]]
          : [];
      })
    : [];

export async function POST(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as Partial<Bearing> | null;
  if (!body || typeof body.title !== "string" || !body.title.trim())
    return Response.json({ error: "a decision needs words" }, { status: 400 });
  const title = body.title.trim().slice(0, 200);
  let slug = typeof body.slug === "string" && body.slug ? body.slug : slugOf(title);
  // A new decision must not overwrite an old one that happened to share a name.
  if (!body.slug) {
    const taken = new Set(readBearings().map((b) => b.slug));
    let n = 2;
    const base = slug;
    while (taken.has(slug)) slug = `${base}-${n++}`;
  }
  const today = new Date().toISOString().slice(0, 10);
  const placed = dayOr(body.placed, today);
  const bearing: Bearing = {
    slug,
    title,
    placed,
    since: dayOr(body.since, placed),
    at: pt(body.at),
    leads: pt(body.leads),
    note: typeof body.note === "string" ? body.note.slice(0, 20_000) : "",
    trail: trail(body.trail).slice(-40),
  };
  try {
    writeBearing(bearing);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  return Response.json(bearing);
}

export async function DELETE(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  try {
    return Response.json({ gone: deleteBearing(slug) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** The values file, written back from the editor. */
export async function PUT(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as { config?: unknown } | null;
  try {
    const config = validateConfig(body?.config);
    writeConfig(config);
    return Response.json({ config, own: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

