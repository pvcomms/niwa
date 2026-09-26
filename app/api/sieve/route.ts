import { buildGarden } from "@/lib/garden";
import { readConfig } from "@/lib/bearing-store";
import { DEFAULT_CONFIG } from "@/lib/bearing";
import { validateSieve } from "@/lib/sieve";
import {
  SIEVE_DIR,
  deleteSieve,
  readSieves,
  writeSieve,
} from "@/lib/sieve-store";
import { SPECIMEN_SIEVES } from "@/content/sieve";

export const dynamic = "force-dynamic";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * The questions on the sieve, with the reader's values (name and terms only,
 * so the desk can say which a question leans on) and, with `?id=`, the stone
 * the reader came from. A deployed garden serves the specimen and the sample
 * values, read-only. No model is asked here: every number on a sieve is the
 * reader's.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const deployed = Boolean(process.env.NIWA_MODE);
  const values = (deployed ? DEFAULT_CONFIG : readConfig().config).values.map(
    (v) => ({
      name: v.name,
      terms: v.terms,
    }),
  );
  let about: { id: string; label: string; first: string } | null = null;
  if (id && !deployed) {
    const node = buildGarden().nodes.find((n) => n.id === id);
    if (node)
      about = { id: node.id, label: node.label, first: node.description || "" };
  }
  if (deployed)
    return Response.json(
      {
        sieves: SPECIMEN_SIEVES,
        values,
        about: null,
        writable: false,
        dir: null,
      },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  return Response.json(
    {
      sieves: readSieves(),
      values,
      about,
      writable: true,
      dir: SIEVE_DIR,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    sieve?: unknown;
    fresh?: unknown;
  } | null;
  try {
    const s = validateSieve(body?.sieve, today());
    return Response.json(
      writeSieve({ ...s, touched: today() }, body?.fresh === true),
    );
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  try {
    return deleteSieve(slug)
      ? Response.json({ gone: true })
      : new Response(null, { status: 404 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
