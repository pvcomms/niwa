/**
 * The speech server on this machine — mlx-audio behind `com.param.speech` on
 * 127.0.0.1:8880 — asked to write a voice note out. The audio goes there and
 * nowhere else. `NIWA_SPEECH` moves the host, `NIWA_SPEECH_MODEL` the model;
 * the default, `parakeet`, is the server's alias for the MLX Parakeet weights
 * it already holds (whisper-small.en invents sentences on short clips).
 */
export const SPEECH = process.env.NIWA_SPEECH ?? "http://127.0.0.1:8880";
export const SPEECH_MODEL = process.env.NIWA_SPEECH_MODEL ?? "parakeet";

let known: { at: number; up: boolean } | null = null;

/** Is anyone answering? Asked at most every half minute. */
export async function speechUp(): Promise<boolean> {
  const now = Date.now();
  if (known && now - known.at < 30_000) return known.up;
  let up = false;
  try {
    const r = await fetch(`${SPEECH}/v1/models`, {
      signal: AbortSignal.timeout(700),
      cache: "no-store",
    });
    up = r.ok;
  } catch {
    up = false;
  }
  known = { at: now, up };
  return up;
}

/** The words in a voice note, or an error naming why not. */
export async function transcribe(
  bytes: Uint8Array<ArrayBuffer>,
  mime: string,
  name: string,
): Promise<{ text: string } | { error: string; status: number }> {
  const form = new FormData();
  form.set("file", new Blob([bytes], { type: mime }), name);
  form.set("model", SPEECH_MODEL);
  let res: Response;
  try {
    res = await fetch(`${SPEECH}/v1/audio/transcriptions`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(120_000),
    });
  } catch (e) {
    return {
      error: `no speech server at ${SPEECH}: ${(e as Error).message}`,
      status: 502,
    };
  }
  if (!res.ok)
    return { error: `the speech server said ${res.status}`, status: 502 };
  const out = (await res.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof out?.text === "string" ? out.text.trim() : "";
  if (!text) return { error: "nothing could be made out", status: 422 };
  return { text };
}
