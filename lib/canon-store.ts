import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import { parseCanon, serialiseCanon, type Canon } from "./canon.ts";

/**
 * The strands looked at, one markdown file per strand beside the vault's
 * notes: its name and story in the reader's words, the stones as they stood
 * when kept — each marked for how it got in, its day, and whether it is a
 * touchpoint or struck — and the three answers.
 */
export const CANON_DIR =
  process.env.NIWA_CANON_DIR ?? path.join(GARDEN_DIR, "..", "canon");

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function readCanon(): Canon[] {
  if (!fs.existsSync(CANON_DIR)) return [];
  return fs
    .readdirSync(CANON_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      try {
        return parseCanon(
          f.slice(0, -3),
          fs.readFileSync(path.join(CANON_DIR, f), "utf8"),
        );
      } catch (e) {
        console.warn(`niwa: ${f}: ${(e as Error).message} — skipped`);
        return null;
      }
    })
    .filter((x): x is Canon => x !== null)
    .sort((a, b) =>
      a.touched !== b.touched
        ? a.touched < b.touched
          ? 1
          : -1
        : a.put < b.put
          ? 1
          : a.put > b.put
            ? -1
            : 0,
    );
}

/** Keep a strand. A fresh one whose slug is taken gets a numbered one; a kept one is written in place. */
export function writeCanon(c: Canon, fresh: boolean): Canon {
  let slug = c.slug;
  if (fresh) {
    const taken = new Set(readCanon().map((x) => x.slug));
    const base = slug;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
  }
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const kept = { ...c, slug };
  fs.mkdirSync(CANON_DIR, { recursive: true });
  fs.writeFileSync(path.join(CANON_DIR, `${slug}.md`), serialiseCanon(kept));
  return kept;
}

export function deleteCanon(slug: string): boolean {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const file = path.join(CANON_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}
