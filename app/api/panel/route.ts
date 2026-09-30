import fs from "node:fs";
import path from "node:path";
import { buildGarden, type Garden } from "@/lib/garden";
import { CORPUS } from "@/lib/panel";
import { readRecord } from "@/lib/panel-store";

export const dynamic = "force-dynamic";

const localDay = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/**
 * What the panel counts: every stone's id, name and kind, the threads, and
 * each stone's days. Locally the days come from git. A deployed garden has
 * no record to read, so under NIWA_MODE it dates each stone of the public
 * snapshot by its last change and says so; no private string is read.
 */
export async function GET() {
  const deployed = Boolean(process.env.NIWA_MODE);
  const garden: Garden = deployed
    ? JSON.parse(
        fs.readFileSync(
          path.join(process.cwd(), "data", "garden.json"),
          "utf8",
        ),
      )
    : buildGarden();

  const stones = garden.nodes.filter((n) => CORPUS.has(n.kind));
  let born: Record<string, string> = {};
  let touched: Record<string, string[]> = {};
  let undated = 0;

  if (deployed) {
    for (const s of stones)
      if (s.modified) {
        born[s.id] = s.modified.slice(0, 10);
        touched[s.id] = [s.modified.slice(0, 10)];
      }
  } else {
    ({ born, touched, undated } = readRecord(stones));
  }

  return Response.json(
    {
      nodes: garden.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        kind: n.kind,
      })),
      links: garden.links,
      born,
      touched,
      undated,
      dating: deployed ? "last change" : "record",
      today: localDay(),
    },
    {
      headers: {
        "cache-control": deployed ? "public, max-age=300" : "no-store",
      },
    },
  );
}
