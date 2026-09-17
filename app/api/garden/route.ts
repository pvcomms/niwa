import { buildGarden } from "@/lib/garden";

export const dynamic = "force-dynamic";

export async function GET() {
  const garden = buildGarden();
  return Response.json(garden, {
    headers: { "cache-control": "no-store" },
  });
}
