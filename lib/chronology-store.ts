import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import {
  DEFAULT_LIFE,
  parseEntry,
  parseLife,
  serialiseEntry,
  startOf,
  type Entry,
  type Life,
  type Other,
} from "./chronology.ts";

/**
 * The chronology's files, beside the vault's notes: one small markdown file
 * per entry under `entries/`, and `life.json` for the reader's birth day,
 * horizon, scale and lanes. An entry is read by its file's name, which is
 * its slug and never changes once set down, so a link to it survives a
 * retitling.
 */
export const CHRONOLOGY_DIR =
  process.env.NIWA_CHRONOLOGY_DIR ?? path.join(GARDEN_DIR, "..", "chronology");
const ENTRIES_DIR = path.join(CHRONOLOGY_DIR, "entries");
const LIFE_FILE = path.join(CHRONOLOGY_DIR, "life.json");
/** Other lives, one folder each of the same shape, laid alongside read-only. */
const OTHERS_DIR = path.join(CHRONOLOGY_DIR, "others");

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function readLife(): Life {
  if (!fs.existsSync(LIFE_FILE)) return DEFAULT_LIFE;
  return parseLife(fs.readFileSync(LIFE_FILE, "utf8"));
}

export function writeLife(l: Life): Life {
  fs.mkdirSync(CHRONOLOGY_DIR, { recursive: true });
  fs.writeFileSync(LIFE_FILE, `${JSON.stringify(l, null, 2)}\n`);
  return l;
}

function entriesIn(dir: string): Entry[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) =>
      parseEntry(f.slice(0, -3), fs.readFileSync(path.join(dir, f), "utf8")),
    )
    .filter((e) => e.day)
    .sort((a, b) => startOf(a) - startOf(b));
}

export function readEntries(): Entry[] {
  return entriesIn(ENTRIES_DIR);
}

/** Every folder under `others/`: a name, its life.json and its entries. Nothing here is ever written. */
export function readOthers(): Other[] {
  if (!fs.existsSync(OTHERS_DIR)) return [];
  return fs
    .readdirSync(OTHERS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => {
      const dir = path.join(OTHERS_DIR, d.name);
      const lifeFile = path.join(dir, "life.json");
      return {
        name: d.name,
        life: fs.existsSync(lifeFile)
          ? parseLife(fs.readFileSync(lifeFile, "utf8"))
          : DEFAULT_LIFE,
        entries: entriesIn(path.join(dir, "entries")),
      };
    });
}

/** Set an entry down. A new one whose slug is taken gets a numbered one; an existing one is rewritten in place. */
export function writeEntry(e: Entry, fresh: boolean): Entry {
  let slug = e.slug;
  if (fresh) {
    const taken = new Set(readEntries().map((x) => x.slug));
    const base = slug;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
  }
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const kept = { ...e, slug };
  fs.mkdirSync(ENTRIES_DIR, { recursive: true });
  fs.writeFileSync(path.join(ENTRIES_DIR, `${slug}.md`), serialiseEntry(kept));
  return kept;
}

export function deleteEntry(slug: string): boolean {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const file = path.join(ENTRIES_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}
