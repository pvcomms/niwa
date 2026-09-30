import { validateAct, type From } from "@/lib/act";
import { ACT_DIR, deleteAct, readActs, writeAct } from "@/lib/act-store";
import { fmt, summarise, work } from "@/lib/botec";
import { readBotecs } from "@/lib/botec-store";
import { buildGarden } from "@/lib/garden";
import { SPECIMEN_ACTS } from "@/content/act";

export const dynamic = "force-dynamic";

/**
 * The intentions kept and, with `?id=` or `?botec=`, what a fresh one is
 * about: a stone's name and first line, or an envelope's question and what it
 * came to. A deployed garden serves the specimen read-only and reads nothing
 * of the garden. No model is asked; the steps are the reader's.
 */
export async function GET(req: Request) {
  if (process.env.NIWA_MODE)
    return Response.json(
      { acts: SPECIMEN_ACTS, from: null, note: "", writable: false, dir: null },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  const q = new URL(req.url).searchParams;
  let from: From | null = null;
  let note = "";
  const id = q.get("id");
  const slug = q.get("botec");
  if (id) {
    const node = buildGarden().nodes.find((n) => n.id === id);
    if (node) {
      from = {
        kind: node.kind,
        id: node.id,
        label: node.label,
        url: `/catalogue?id=${encodeURIComponent(node.id)}`,
      };
      note = node.description || "";
    }
  } else if (slug) {
    const b = readBotecs().find((x) => x.slug === slug);
    if (b) {
      from = {
        kind: "botec",
        id: b.slug,
        label: b.question || b.slug,
        url: `/botec?slug=${encodeURIComponent(b.slug)}`,
      };
      const s = summarise(work(b.lines).out, 0);
      const u = b.unit.trim() ? ` ${b.unit.trim()}` : "";
      if (s)
        note =
          s.lo === s.hi
            ? `it comes to ${fmt(s.mid)}${u}`
            : `about ${fmt(s.mid)}${u}; nine in ten between ${fmt(s.lo)} and ${fmt(s.hi)}`;
    }
  }
  return Response.json(
    { acts: readActs(), from, note, writable: true, dir: ACT_DIR },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    act?: unknown;
    fresh?: unknown;
  } | null;
  try {
    return Response.json(
      writeAct(validateAct(body?.act), body?.fresh === true),
    );
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  try {
    return deleteAct(slug)
      ? Response.json({ gone: true })
      : new Response(null, { status: 404 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
