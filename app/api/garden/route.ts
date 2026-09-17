import fs from "node:fs";
import path from "node:path";
import { buildGarden, type Garden } from "@/lib/garden";

export const dynamic = "force-dynamic";

/**
 * Locally the garden is read off disk on every request. A deployed garden has no
 * ~/.claude/memory to read, so NIWA_MODE switches it to the snapshot baked by
 * scripts/snapshot.mjs at build time.
 *
 * Read with fs rather than `import("@/data/garden.json")`: data/ is gitignored
 * by design (a snapshot is generated output, never committed), so a typed JSON
 * import would fail to resolve on a fresh checkout -- exactly what CI runs.
 */
export async function GET() {
  if (process.env.NIWA_MODE) {
    const raw = fs.readFileSync(
      path.join(process.cwd(), "data", "garden.json"),
      "utf8",
    );
    return Response.json(JSON.parse(raw) as Garden, {
      headers: { "cache-control": "public, max-age=300" },
    });
  }

  return Response.json(buildGarden(), {
    headers: { "cache-control": "no-store" },
  });
}
