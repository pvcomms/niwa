import { buildGarden } from "@/lib/garden";
import { validateTrace } from "@/lib/half-second";
import {
  HALF_SECOND_DIR,
  deleteTrace,
  readTraces,
  writeTrace,
} from "@/lib/half-second-store";
import { SPECIMEN_TRACES } from "@/content/half-second";

export const dynamic = "force-dynamic";

/**
 * The traces kept and, with `?id=`, the stone the reader came from. A
 * deployed garden serves the specimen read-only. No model is asked; the feed
 * is fiction, the body is a toy, and every word on a trace is the reader's.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (process.env.NIWA_MODE)
    return Response.json(
      { traces: SPECIMEN_TRACES, about: null, writable: false, dir: null },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  let about: { id: string; label: string; first: string } | null = null;
  if (id) {
    const node = buildGarden().nodes.find((n) => n.id === id);
    if (node)
      about = { id: node.id, label: node.label, first: node.description || "" };
  }
  return Response.json(
    { traces: readTraces(), about, writable: true, dir: HALF_SECOND_DIR },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    trace?: unknown;
    fresh?: unknown;
  } | null;
  try {
    const t = validateTrace(body?.trace);
    return Response.json(writeTrace(t, body?.fresh === true));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  try {
    return deleteTrace(slug)
      ? Response.json({ gone: true })
      : new Response(null, { status: 404 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
