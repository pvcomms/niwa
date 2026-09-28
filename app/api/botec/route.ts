import { validateBotec } from "@/lib/botec";
import {
  BOTEC_DIR,
  deleteBotec,
  readBotecs,
  writeBotec,
} from "@/lib/botec-store";
import { SPECIMEN_BOTECS } from "@/content/botec";

export const dynamic = "force-dynamic";

/**
 * The envelopes kept, or with `?head=1` only whether this garden can keep one
 * — asked by the tab on every view. A deployed garden serves the specimen
 * read-only. No model is asked and nothing of the garden is read: every number
 * is the reader's, and the draws are taken in the page.
 */
export async function GET(req: Request) {
  const head = new URL(req.url).searchParams.has("head");
  if (process.env.NIWA_MODE)
    return Response.json(
      head
        ? { writable: false }
        : { botecs: SPECIMEN_BOTECS, writable: false, dir: null },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  return Response.json(
    head
      ? { writable: true }
      : { botecs: readBotecs(), writable: true, dir: BOTEC_DIR },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    botec?: unknown;
    fresh?: unknown;
  } | null;
  try {
    return Response.json(
      writeBotec(validateBotec(body?.botec), body?.fresh === true),
    );
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  try {
    return deleteBotec(slug)
      ? Response.json({ gone: true })
      : new Response(null, { status: 404 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
