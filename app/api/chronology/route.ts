import { validateEntry, validateLife } from "@/lib/chronology";
import {
  CHRONOLOGY_DIR,
  deleteEntry,
  readEntries,
  readLife,
  readOthers,
  writeEntry,
  writeLife,
} from "@/lib/chronology-store";
import { SPECIMEN_ENTRIES, SPECIMEN_LIFE } from "@/content/specimen";

export const dynamic = "force-dynamic";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * The chronology's files: the life (birth day, horizon, scale, lanes),
 * every entry set down, and any other lives kept under `others/` to be laid
 * alongside, read-only. A deployed garden has no life to read, so under
 * NIWA_MODE it serves the synthetic specimen, read-only — the line still
 * draws and a stranger can learn it before supplying their own.
 */
export async function GET() {
  if (process.env.NIWA_MODE)
    return Response.json(
      {
        life: SPECIMEN_LIFE,
        entries: SPECIMEN_ENTRIES,
        others: [],
        writable: false,
        specimen: true,
        dir: null,
      },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  return Response.json(
    {
      life: readLife(),
      entries: readEntries(),
      others: readOthers(),
      writable: true,
      specimen: false,
      dir: CHRONOLOGY_DIR,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

/** Set an entry down, or rewrite one. `fresh` asks for a new file, numbered if its slug is taken. */
export async function PUT(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    entry?: unknown;
    fresh?: unknown;
  } | null;
  try {
    const entry = validateEntry(body?.entry, today());
    return Response.json(writeEntry(entry, body?.fresh === true));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** The life itself: birth day, horizon, scale, lanes. */
export async function PATCH(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    life?: unknown;
  } | null;
  try {
    return Response.json(writeLife(validateLife(body?.life)));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  if (!slug) return Response.json({ error: "which entry?" }, { status: 400 });
  try {
    return Response.json({ gone: deleteEntry(slug) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
