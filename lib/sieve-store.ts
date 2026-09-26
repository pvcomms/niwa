import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import { parseSieve, serialiseSieve, type Sieve } from "./sieve.ts";

/**
 * The questions on the sieve, one markdown file each beside the vault's
 * notes: the question, the sightings as dated entries a person can read
 * with what passed of each world in the heading; the worlds and their
 * widths in the frontmatter.
 */
export const SIEVE_DIR =
  process.env.NIWA_SIEVE_DIR ?? path.join(GARDEN_DIR, "..", "sieve");

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function readSieves(): Sieve[] {
  if (!fs.existsSync(SIEVE_DIR)) return [];
  return fs
    .readdirSync(SIEVE_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      try {
        return parseSieve(
          f.slice(0, -3),
          fs.readFileSync(path.join(SIEVE_DIR, f), "utf8"),
        );
      } catch (e) {
        console.warn(`niwa: ${f}: ${(e as Error).message} — skipped`);
        return null;
      }
    })
    .filter((s): s is Sieve => s !== null)
    .sort((a, b) =>
      a.touched < b.touched ? 1 : a.touched > b.touched ? -1 : 0,
    );
}

/** Keep a sieve. A fresh one whose slug is taken gets a numbered one; an existing one is rewritten in place. */
export function writeSieve(s: Sieve, fresh: boolean): Sieve {
  let slug = s.slug;
  if (fresh) {
    const taken = new Set(readSieves().map((x) => x.slug));
    const base = slug;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
  }
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const kept = { ...s, slug };
  fs.mkdirSync(SIEVE_DIR, { recursive: true });
  fs.writeFileSync(path.join(SIEVE_DIR, `${slug}.md`), serialiseSieve(kept));
  return kept;
}

export function deleteSieve(slug: string): boolean {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const file = path.join(SIEVE_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}
