import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import {
  EMPTY_CIRCUIT,
  parseCircuit,
  parsePathway,
  serialisePathway,
  type Circuit,
  type Pathway,
} from "./alarm.ts";

/**
 * The alarm's files, beside the vault's notes: `circuit.json` for what the
 * reader has named about themselves — triggers, defences, brakes, and how
 * loaded they are today — and one small markdown file per pathway under
 * `pathways/`. A pathway is read by its file's name, which is its slug and
 * never changes once asked.
 */
export const ALARM_DIR =
  process.env.NIWA_ALARM_DIR ?? path.join(GARDEN_DIR, "..", "alarm");
const PATHWAYS_DIR = path.join(ALARM_DIR, "pathways");
const CIRCUIT_FILE = path.join(ALARM_DIR, "circuit.json");

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function readCircuit(): Circuit {
  if (!fs.existsSync(CIRCUIT_FILE)) return EMPTY_CIRCUIT;
  return parseCircuit(fs.readFileSync(CIRCUIT_FILE, "utf8"));
}

export function writeCircuit(c: Circuit): Circuit {
  fs.mkdirSync(ALARM_DIR, { recursive: true });
  fs.writeFileSync(CIRCUIT_FILE, `${JSON.stringify(c, null, 2)}\n`);
  return c;
}

export function readPathways(): Pathway[] {
  if (!fs.existsSync(PATHWAYS_DIR)) return [];
  return fs
    .readdirSync(PATHWAYS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) =>
      parsePathway(
        f.slice(0, -3),
        fs.readFileSync(path.join(PATHWAYS_DIR, f), "utf8"),
      ),
    )
    .sort((a, b) => (a.asked < b.asked ? 1 : a.asked > b.asked ? -1 : 0));
}

/** Keep a pathway. A new one whose slug is taken gets a numbered one; an existing one is rewritten in place. */
export function writePathway(p: Pathway, fresh: boolean): Pathway {
  let slug = p.slug;
  if (fresh) {
    const taken = new Set(readPathways().map((x) => x.slug));
    const base = slug;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
  }
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const kept = { ...p, slug };
  fs.mkdirSync(PATHWAYS_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(PATHWAYS_DIR, `${slug}.md`),
    serialisePathway(kept),
  );
  return kept;
}

export function deletePathway(slug: string): boolean {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const file = path.join(PATHWAYS_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}
