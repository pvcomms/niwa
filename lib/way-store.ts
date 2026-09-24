import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import { parseWay, serialiseWay, type Way } from "./way.ts";

/**
 * The ways, one markdown file each beside the vault's notes: the then and the
 * now as sections a person can edit, and the steps, obstacles and changes —
 * kept or still proposed — in the frontmatter. Read by the file's name.
 */
export const WAY_DIR =
  process.env.NIWA_WAY_DIR ?? path.join(GARDEN_DIR, "..", "way");

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function readWays(): Way[] {
  if (!fs.existsSync(WAY_DIR)) return [];
  return fs
    .readdirSync(WAY_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) =>
      parseWay(f.slice(0, -3), fs.readFileSync(path.join(WAY_DIR, f), "utf8")),
    )
    .sort((a, b) =>
      a.touched < b.touched ? 1 : a.touched > b.touched ? -1 : 0,
    );
}

/** Keep a way. A new one whose slug is taken gets a numbered one; an existing one is rewritten in place. */
export function writeWay(w: Way, fresh: boolean): Way {
  let slug = w.slug;
  if (fresh) {
    const taken = new Set(readWays().map((x) => x.slug));
    const base = slug;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
  }
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const kept = { ...w, slug };
  fs.mkdirSync(WAY_DIR, { recursive: true });
  fs.writeFileSync(path.join(WAY_DIR, `${slug}.md`), serialiseWay(kept));
  return kept;
}

export function deleteWay(slug: string): boolean {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const file = path.join(WAY_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}
