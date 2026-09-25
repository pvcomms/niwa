import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import { parseMask, serialiseMask, type Mask } from "./mask.ts";

/**
 * The masks, one markdown file each beside the vault's notes: the matter, the
 * reader's case, the other side's case in the mask and where the reader
 * stands as sections a person can read; the marks, tells and missing reasons
 * in the frontmatter.
 */
export const MASK_DIR = process.env.NIWA_MASK_DIR ?? path.join(GARDEN_DIR, "..", "mask");

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function readMasks(): Mask[] {
  if (!fs.existsSync(MASK_DIR)) return [];
  return fs
    .readdirSync(MASK_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      try {
        return parseMask(f.slice(0, -3), fs.readFileSync(path.join(MASK_DIR, f), "utf8"));
      } catch (e) {
        console.warn(`niwa: ${f}: ${(e as Error).message} — skipped`);
        return null;
      }
    })
    .filter((m): m is Mask => m !== null)
    .sort((a, b) => (a.touched < b.touched ? 1 : a.touched > b.touched ? -1 : 0));
}

/** Keep a mask. A fresh one whose slug is taken gets a numbered one; an existing one is rewritten in place. */
export function writeMask(m: Mask, fresh: boolean): Mask {
  let slug = m.slug;
  if (fresh) {
    const taken = new Set(readMasks().map((x) => x.slug));
    const base = slug;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
  }
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const kept = { ...m, slug };
  fs.mkdirSync(MASK_DIR, { recursive: true });
  fs.writeFileSync(path.join(MASK_DIR, `${slug}.md`), serialiseMask(kept));
  return kept;
}

export function deleteMask(slug: string): boolean {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const file = path.join(MASK_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}
