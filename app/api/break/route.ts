import { buildGarden } from "@/lib/garden";
import { validateMoment } from "@/lib/break";
import {
  BREAK_DIR,
  deleteMoment,
  readMoments,
  writeMoment,
} from "@/lib/break-store";
import { SPECIMEN_MOMENTS } from "@/content/break";

export const dynamic = "force-dynamic";

/**
 * The breaks taken and, with `?id=`, the stone the reader came from. A
 * deployed garden serves the specimen read-only. No model is asked; the
 * words are the reader's.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const deployed = Boolean(process.env.NIWA_MODE);
  if (deployed)
    return Response.json(
      { moments: SPECIMEN_MOMENTS, about: null, writable: false, dir: null },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  let about: { id: string; label: string; first: string } | null = null;
  if (id) {
    const node = buildGarden().nodes.find((n) => n.id === id);
    if (node)
      about = { id: node.id, label: node.label, first: node.description || "" };
  }
  return Response.json(
    { moments: readMoments(), about, writable: true, dir: BREAK_DIR },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    moment?: unknown;
    fresh?: unknown;
  } | null;
  try {
    return Response.json(
      writeMoment(validateMoment(body?.moment), body?.fresh === true),
    );
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  try {
    return deleteMoment(slug)
      ? Response.json({ gone: true })
      : new Response(null, { status: 404 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
