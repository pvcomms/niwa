import { buildGarden } from "@/lib/garden";
import { validateMuster } from "@/lib/muster";
import {
  MUSTER_DIR,
  deleteMuster,
  readMusters,
  writeMuster,
} from "@/lib/muster-store";
import { SPECIMEN_MUSTERS } from "@/content/muster";

export const dynamic = "force-dynamic";

/**
 * The claims kept and, with `?id=`, the stone the reader came from, its name
 * and first line. A deployed garden serves the specimen read-only and reads
 * nothing of the garden. No model is asked; every number is the reader's, and
 * the room runs in the browser.
 */
export async function GET(req: Request) {
  if (process.env.NIWA_MODE)
    return Response.json(
      { musters: SPECIMEN_MUSTERS, about: null, writable: false, dir: null },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  const id = new URL(req.url).searchParams.get("id");
  const node = id
    ? (buildGarden().nodes.find((n) => n.id === id) ?? null)
    : null;
  return Response.json(
    {
      musters: readMusters(),
      about: node
        ? { id: node.id, label: node.label, first: node.description || "" }
        : null,
      writable: true,
      dir: MUSTER_DIR,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    muster?: unknown;
    fresh?: unknown;
  } | null;
  try {
    return Response.json(
      writeMuster(validateMuster(body?.muster), body?.fresh === true),
    );
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  try {
    return deleteMuster(slug)
      ? Response.json({ gone: true })
      : new Response(null, { status: 404 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
