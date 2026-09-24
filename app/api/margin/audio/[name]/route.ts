import fs from "node:fs";
import { MIME } from "@/lib/margin";
import { audioPath } from "@/lib/margin-store";

export const dynamic = "force-dynamic";

/** A voice note, by its file name. A deployed garden has none. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const { name } = await params;
  let file: string | null;
  try {
    file = audioPath(name);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!file) return new Response(null, { status: 404 });
  const ext = name.slice(name.lastIndexOf(".") + 1);
  return new Response(new Uint8Array(fs.readFileSync(file)), {
    headers: {
      "content-type": MIME[ext] ?? "application/octet-stream",
      "cache-control": "no-store",
    },
  });
}
