/**
 * Bakes a garden snapshot for deployment. Nothing on a server can read
 * ~/.claude/memory, so a deploy ships a frozen graph instead of a live one.
 *
 *   node --experimental-strip-types scripts/snapshot.mjs public
 *   node --experimental-strip-types scripts/snapshot.mjs private
 *
 * The public build refuses to write if the tripwire audit finds anything.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildGarden } from "../lib/garden.ts";
import { buildPublicGarden, auditPublicGarden } from "../lib/publish.ts";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const mode = process.argv[2];

if (mode !== "public" && mode !== "private") {
  console.error("usage: snapshot.mjs <public|private>");
  process.exit(1);
}

const full = buildGarden();
console.log(
  `read ${full.stats.nodes} stones, ${full.stats.links} threads from disk`,
);

let out;

if (mode === "public") {
  // Public repo list comes from GitHub itself, so a repo that is private there
  // can never appear here by an editing mistake.
  const raw = execFileSync(
    "gh",
    [
      "repo",
      "list",
      "pvcomms",
      "--visibility",
      "public",
      "--limit",
      "100",
      "--json",
      "name,description,url",
    ],
    { encoding: "utf8" },
  );
  const repos = JSON.parse(raw).map((r) => ({
    name: r.name,
    description: r.description ?? "",
    url: r.url,
  }));
  console.log(`github reports ${repos.length} public repos`);

  out = buildPublicGarden(full, repos);

  const findings = auditPublicGarden(out);
  if (findings.length) {
    console.error(
      `\nREFUSING TO WRITE — ${findings.length} tripwire hit(s):\n`,
    );
    for (const f of findings) {
      console.error(`  ${f.node} · ${f.field} · ${f.tripwire}`);
      console.error(`    …${f.sample}…`);
    }
    process.exit(1);
  }
  console.log(
    "audit clean: no home paths, keys, contacts, health or family terms",
  );
} else {
  out = full;
}

out.stats.live = false;
out.stats.mode = mode;
if (mode === "public") {
  const { PUBLIC_BLURB } = await import("../content/public.ts");
  out.stats.blurb = PUBLIC_BLURB;
}

const dest = path.join(root, "data", "garden.json");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out));

const kinds = Object.entries(out.stats.byKind)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `${k} ${v}`)
  .join(" · ");

console.log(`\nwrote ${mode} snapshot → data/garden.json`);
console.log(`  ${out.stats.nodes} stones · ${out.stats.links} threads`);
console.log(`  ${kinds}`);
