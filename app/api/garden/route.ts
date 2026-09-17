import { buildGarden } from "@/lib/garden";

export const dynamic = "force-dynamic";

/**
 * Locally the garden is read off disk on every request. A deployed garden has no
 * ~/.claude/memory to read, so NIWA_MODE switches it to the snapshot baked by
 * scripts/snapshot.mjs at build time.
 */
export async function GET() {
  if (process.env.NIWA_MODE) {
    const snapshot = (await import("@/data/garden.json")).default;
    return Response.json(snapshot, {
      headers: { "cache-control": "public, max-age=300" },
    });
  }

  return Response.json(buildGarden(), {
    headers: { "cache-control": "no-store" },
  });
}
