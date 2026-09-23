import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "@/lib/garden";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

/**
 * Attachments that came in with the vault notes; niwa-vault keeps them in
 * content/media beside content/notes. Only ever a bare filename with a known
 * extension, so no path the request supplies reaches the filesystem. A deployed
 * garden has no vault and answers nothing.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const { name } = await params;
  const type = TYPES[path.extname(name).toLowerCase()];
  if (!type || name !== path.basename(name) || name.startsWith("."))
    return new Response(null, { status: 404 });
  try {
    const bytes = fs.readFileSync(
      path.join(path.dirname(GARDEN_DIR), "media", name),
    );
    return new Response(bytes, {
      headers: {
        "content-type": type,
        "cache-control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
