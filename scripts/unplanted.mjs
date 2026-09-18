/**
 * What you keep pointing at and have never written.
 *
 *   node --experimental-strip-types scripts/unplanted.mjs
 *
 * Derives the garden from disk and prints the ghost stones ranked by how many
 * distinct notes reach for them. Reads only; writes nothing.
 */

import { buildGarden } from "../lib/garden.ts";
import { rankUnplanted } from "../lib/ghosts.ts";

const garden = buildGarden();
const unplanted = rankUnplanted(garden);

if (unplanted.length === 0) {
  console.log(
    `nothing unplanted — every [[link]] across ${garden.stats.nodes} stones resolves.`,
  );
  process.exit(0);
}

const width = Math.max(...unplanted.map((u) => u.label.length));

console.log(
  `${unplanted.length} unplanted idea${unplanted.length === 1 ? "" : "s"} across ${garden.stats.nodes} stones\n`,
);

for (const { label, count, pointedFrom } of unplanted) {
  const bar = "·".repeat(count);
  console.log(`${label.padEnd(width)}  ${String(count).padStart(2)}  ${bar}`);
  console.log(`${" ".repeat(width)}      ${pointedFrom.join(", ")}\n`);
}
