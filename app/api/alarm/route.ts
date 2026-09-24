import { validateCircuit, validatePathway } from "@/lib/alarm";
import {
  ALARM_DIR,
  deletePathway,
  readCircuit,
  readPathways,
  writeCircuit,
  writePathway,
} from "@/lib/alarm-store";
import { SPECIMEN_CIRCUIT, SPECIMEN_PATHWAYS } from "@/content/specimen-alarm";

export const dynamic = "force-dynamic";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * The alarm's files: the reader's circuit — triggers, defences, brakes, the
 * day's load — and every pathway asked. A deployed garden has no reader to
 * read, so under NIWA_MODE it serves the synthetic specimen, read-only.
 */
export async function GET() {
  if (process.env.NIWA_MODE)
    return Response.json(
      {
        circuit: SPECIMEN_CIRCUIT,
        pathways: SPECIMEN_PATHWAYS,
        writable: false,
        specimen: true,
        dir: null,
      },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  return Response.json(
    {
      circuit: readCircuit(),
      pathways: readPathways(),
      writable: true,
      specimen: false,
      dir: ALARM_DIR,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

/** Ask a pathway, or rewrite one. `fresh` asks for a new file, numbered if its slug is taken. */
export async function PUT(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    pathway?: unknown;
    fresh?: unknown;
  } | null;
  try {
    const pathway = validatePathway(body?.pathway, readCircuit(), today());
    return Response.json(writePathway(pathway, body?.fresh === true));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** The circuit itself. */
export async function PATCH(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    circuit?: unknown;
  } | null;
  try {
    return Response.json(writeCircuit(validateCircuit(body?.circuit)));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  if (!slug) return Response.json({ error: "which pathway?" }, { status: 400 });
  try {
    return Response.json({ gone: deletePathway(slug) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
