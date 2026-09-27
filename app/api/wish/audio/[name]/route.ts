import fs from "node:fs";
import { voicePath } from "@/lib/wish-store";

export const dynamic = "force-dynamic";

/** A sitting's voice, by its file name. A deployed garden has none. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const { name } = await params;
  let file: string | null;
  try {
    file = voicePath(name);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!file) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(file)), {
    headers: { "content-type": "audio/wav", "cache-control": "no-store" },
  });
}
