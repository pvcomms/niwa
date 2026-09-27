import { buildGarden } from "@/lib/garden";
import { validateStep } from "@/lib/overview";
import {
  OVERVIEW_DIR,
  deleteStep,
  readSteps,
  writeStep,
} from "@/lib/overview-store";
import { SPECIMEN_STEPS } from "@/content/overview";

export const dynamic = "force-dynamic";

const today = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/**
 * The steps put down and, with `?id=`, the stone the reader came from. A
 * deployed garden serves the specimen read-only. No model is asked; every
 * number and word on a step is the reader's.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (process.env.NIWA_MODE)
    return Response.json(
      { steps: SPECIMEN_STEPS, about: null, writable: false, dir: null },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  let about: { id: string; label: string; first: string } | null = null;
  if (id) {
    const node = buildGarden().nodes.find((n) => n.id === id);
    if (node)
      about = { id: node.id, label: node.label, first: node.description || "" };
  }
  return Response.json(
    { steps: readSteps(), about, writable: true, dir: OVERVIEW_DIR },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    step?: unknown;
    fresh?: unknown;
  } | null;
  try {
    const s = validateStep(body?.step, today());
    return Response.json(
      writeStep({ ...s, touched: today() }, body?.fresh === true),
    );
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  try {
    return deleteStep(slug)
      ? Response.json({ gone: true })
      : new Response(null, { status: 404 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
