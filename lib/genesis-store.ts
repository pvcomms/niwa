import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import { empty, parse, serialise, type Genesis } from "./genesis.ts";

/**
 * Where the stones came from, kept as one file beside the vault's notes: the
 * reader's split, said before the counts, and a mark per stone — the reader's
 * own, or the model's proposal with its quote. Rules are read off the stones
 * every time and never written. A hand edit is read back line by line.
 */
export const GENESIS_DIR =
  process.env.NIWA_GENESIS_DIR ?? path.join(GARDEN_DIR, "..", "genesis");
const FILE = () => path.join(GENESIS_DIR, "marks.json");

export function readGenesis(): Genesis {
  if (!fs.existsSync(FILE())) return empty();
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(FILE(), "utf8"));
  } catch {
    // Never read a broken file as empty: the next write would erase the marks.
    throw new Error(
      "genesis/marks.json is not JSON — fix or move it; nothing is written over it",
    );
  }
  return parse(raw);
}

export function writeGenesis(g: Genesis): void {
  fs.mkdirSync(GENESIS_DIR, { recursive: true });
  const tmp = `${FILE()}.tmp`;
  fs.writeFileSync(tmp, serialise(g));
  fs.renameSync(tmp, FILE());
}
