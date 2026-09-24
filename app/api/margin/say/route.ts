import fs from "node:fs";
import { MIME } from "@/lib/margin";
import { audioPath, readNote, writeNote } from "@/lib/margin-store";
import { transcribe } from "@/lib/speech";

export const dynamic = "force-dynamic";

/**
 * Write a voice note out, through the speech server on this machine. The
 * audio goes to 127.0.0.1 and nowhere else; what comes back is kept under
 * the note's own `## said` heading, and the reader can change it.
 */
export async function POST(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const id = String(body?.id ?? "");
  let note;
  try {
    note = readNote(id);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  if (!note) return Response.json({ error: "no such note" }, { status: 404 });
  if (!note.audio)
    return Response.json({ error: "nothing was spoken" }, { status: 400 });
  const file = audioPath(note.audio);
  if (!file)
    return Response.json({ error: "the voice note is gone" }, { status: 404 });
  const ext = note.audio.slice(note.audio.lastIndexOf(".") + 1);
  const out = await transcribe(
    new Uint8Array(fs.readFileSync(file)),
    MIME[ext] ?? "application/octet-stream",
    note.audio,
  );
  if ("error" in out)
    return Response.json({ error: out.error }, { status: out.status });
  const said = out.text;
  return Response.json(writeNote({ ...note, said }));
}
