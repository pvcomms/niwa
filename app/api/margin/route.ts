import {
  extOf,
  idOf,
  localIso,
  validateAbout,
  validateNote,
} from "@/lib/margin";
import {
  MARGIN_DIR,
  deleteNote,
  readNote,
  readNotes,
  writeAudio,
  writeNote,
} from "@/lib/margin-store";
import { SPECIMEN_NOTES } from "@/content/specimen-margin";
import { speechUp } from "@/lib/speech";

export const dynamic = "force-dynamic";

const salt = () =>
  Math.random().toString(36).slice(2, 5).padEnd(3, "0");

/**
 * The margin's notes. A deployed garden has no reader to listen to, so under
 * NIWA_MODE it serves the specimen's asides, read-only. `?head=1` answers
 * without the notes — what the strip on every view asks on arrival.
 */
export async function GET(req: Request) {
  if (process.env.NIWA_MODE)
    return Response.json(
      {
        notes: SPECIMEN_NOTES,
        writable: false,
        specimen: true,
        speech: false,
        dir: null,
      },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  const head = new URL(req.url).searchParams.get("head") === "1";
  return Response.json(
    {
      notes: head ? [] : readNotes(),
      writable: true,
      specimen: false,
      speech: await speechUp(),
      dir: MARGIN_DIR,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

/** Keep a note: multipart, with the words as `text` and the voice note as `audio`. */
export async function POST(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: "not a form" }, { status: 400 });
  const now = new Date();
  const id = idOf(now, salt());
  const file = form.get("audio");
  let audio: string | null = null;
  try {
    if (file instanceof File && file.size > 0) {
      if (file.size > 60 * 1024 * 1024)
        return Response.json({ error: "too long to keep" }, { status: 413 });
      const mime = file.type || String(form.get("mime") ?? "");
      audio = writeAudio(
        `${id}.${extOf(mime)}`,
        new Uint8Array(await file.arrayBuffer()),
      );
    }
    let about: unknown = null;
    try {
      about = JSON.parse(String(form.get("about") ?? "null"));
    } catch {
      about = null;
    }
    const note = validateNote(
      {
        view: form.get("view"),
        url: form.get("url"),
        text: form.get("text"),
        about,
        audio,
        seconds: form.get("seconds"),
      },
      id,
      localIso(now),
    );
    return Response.json(writeNote(note));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** Change a note's words, what was said, or what it is about. */
export async function PATCH(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    id?: unknown;
    text?: unknown;
    said?: unknown;
    about?: unknown;
  } | null;
  try {
    const id = String(body?.id ?? "");
    const cur = readNote(id);
    if (!cur) return Response.json({ error: "no such note" }, { status: 404 });
    const next = validateNote(
      {
        ...cur,
        text: typeof body?.text === "string" ? body.text : cur.text,
        said: typeof body?.said === "string" ? body.said : cur.said,
        about:
          body && "about" in body ? validateAbout(body.about) : cur.about,
      },
      cur.id,
      cur.at,
    );
    return Response.json(writeNote(next));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return Response.json({ error: "which note?" }, { status: 400 });
  try {
    return Response.json({ gone: deleteNote(id) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
