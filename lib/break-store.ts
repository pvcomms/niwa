import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import { parseMoment, serialiseMoment, type Moment } from "./break.ts";

/**
 * The breaks on disk, one markdown file per moment beside the vault's
 * notes: what hurt, the three sentences as bullets, what was needed, the
 * two voices, the letter, afterwards; the hand and the hardest one in the
 * frontmatter.
 */
export const BREAK_DIR =
  process.env.NIWA_BREAK_DIR ?? path.join(GARDEN_DIR, "..", "break");

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function readMoments(): Moment[] {
  if (!fs.existsSync(BREAK_DIR)) return [];
  return fs
    .readdirSync(BREAK_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      try {
        return parseMoment(
          f.slice(0, -3),
          fs.readFileSync(path.join(BREAK_DIR, f), "utf8"),
        );
      } catch (e) {
        console.warn(`niwa: ${f}: ${(e as Error).message} — skipped`);
        return null;
      }
    })
    .filter((m): m is Moment => m !== null)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

/** Keep a moment. A fresh one whose slug is taken gets a numbered one. */
export function writeMoment(m: Moment, fresh: boolean): Moment {
  let slug = m.slug;
  if (fresh) {
    const taken = new Set(readMoments().map((x) => x.slug));
    const base = slug;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
  }
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const kept = { ...m, slug };
  fs.mkdirSync(BREAK_DIR, { recursive: true });
  fs.writeFileSync(path.join(BREAK_DIR, `${slug}.md`), serialiseMoment(kept));
  return kept;
}

export function deleteMoment(slug: string): boolean {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const file = path.join(BREAK_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}
