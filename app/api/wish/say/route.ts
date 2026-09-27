import { speak } from "@/lib/speech";
import { pcmOf, wavOf } from "@/lib/wish";
import { readSitting, writeSitting, writeVoice } from "@/lib/wish-store";

export const dynamic = "force-dynamic";

/**
 * Write a sitting out as one voice, through the speech server on this
 * machine: each line said in turn, the silences between them kept as
 * silence, the whole saved beside the sitting with a cue for every line.
 * Nothing leaves 127.0.0.1.
 */
export async function POST(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    slug?: unknown;
  } | null;
  let sitting;
  try {
    sitting = readSitting(String(body?.slug ?? ""));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  if (!sitting)
    return Response.json({ error: "no such sitting" }, { status: 404 });
  const started = Date.now();
  const pieces: { pcm: Uint8Array; silence: number }[] = [];
  let rate = 24000;
  for (const line of sitting.lines) {
    const out = await speak(line.text);
    if ("error" in out)
      return Response.json({ error: out.error }, { status: out.status });
    try {
      const { pcm, rate: r } = pcmOf(out.wav);
      rate = r;
      pieces.push({ pcm, silence: line.pause });
    } catch (e) {
      return Response.json(
        {
          error: `the speech server answered, but not with a wav: ${(e as Error).message}`,
        },
        { status: 502 },
      );
    }
  }
  const { wav, cues } = wavOf(pieces, rate);
  const voice = writeVoice(sitting.slug, wav);
  const kept = writeSitting({ ...sitting, voice, cues }, false);
  return Response.json({ sitting: kept, ms: Date.now() - started });
}
