import { buildGarden } from "@/lib/garden";
import { aboutOf, standingOf, validateFence } from "@/lib/fence";
import {
  FENCE_DIR,
  deleteFence,
  firstDays,
  readFences,
  writeFence,
} from "@/lib/fence-store";
import { SPECIMEN_FENCES } from "@/content/fence";

export const dynamic = "force-dynamic";

/**
 * The fences kept; the rules in the reader's record as fences already
 * standing, each with the reason given then and the day its file first
 * appears; and, with `?id=`, the stone the reader came from. A deployed
 * garden serves the specimen read-only and reads nothing of the garden.
 * No model is asked; the reasons are the reader's.
 */
export async function GET(req: Request) {
  if (process.env.NIWA_MODE)
    return Response.json(
      {
        fences: SPECIMEN_FENCES,
        about: null,
        standing: [],
        writable: false,
        dir: null,
      },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  const id = new URL(req.url).searchParams.get("id");
  const nodes = buildGarden().nodes;
  const node = id ? (nodes.find((n) => n.id === id) ?? null) : null;
  const since = firstDays([
    ...nodes.filter((n) => n.kind === "feedback").map((n) => n.file),
    node?.file ?? null,
  ]);
  return Response.json(
    {
      fences: readFences(),
      about: node ? aboutOf(node, since(node.file)) : null,
      standing: standingOf(nodes, since),
      writable: true,
      dir: FENCE_DIR,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    fence?: unknown;
    fresh?: unknown;
  } | null;
  try {
    return Response.json(
      writeFence(validateFence(body?.fence), body?.fresh === true),
    );
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  try {
    return deleteFence(slug)
      ? Response.json({ gone: true })
      : new Response(null, { status: 404 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
