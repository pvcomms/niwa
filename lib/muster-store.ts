import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import { parseMuster, serialiseMuster, type Muster } from "./muster.ts";

/**
 * The claims on disk, one markdown file per claim beside the vault's notes:
 * the claim, what the reader would do, the pieces as dated bullets with their
 * way, weight, how they were met and where the reader stood after, who else
 * holds a view, afterwards; the prior, where it came from, which way they
 * would rather, the line they would act at and the room in the frontmatter.
 */
export const MUSTER_DIR =
  process.env.NIWA_MUSTER_DIR ?? path.join(GARDEN_DIR, "..", "muster");

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function readMusters(): Muster[] {
  if (!fs.existsSync(MUSTER_DIR)) return [];
  return fs
    .readdirSync(MUSTER_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      try {
        return parseMuster(
          f.slice(0, -3),
          fs.readFileSync(path.join(MUSTER_DIR, f), "utf8"),
        );
      } catch (e) {
        console.warn(`niwa: ${f}: ${(e as Error).message} — skipped`);
        return null;
      }
    })
    .filter((x): x is Muster => x !== null)
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

/** Keep a claim. A fresh one whose slug is taken gets a numbered one; a kept one is written in place. */
export function writeMuster(m: Muster, fresh: boolean): Muster {
  let slug = m.slug;
  if (fresh) {
    const taken = new Set(readMusters().map((x) => x.slug));
    const base = slug;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
  }
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const kept = { ...m, slug };
  fs.mkdirSync(MUSTER_DIR, { recursive: true });
  fs.writeFileSync(path.join(MUSTER_DIR, `${slug}.md`), serialiseMuster(kept));
  return kept;
}

export function deleteMuster(slug: string): boolean {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const file = path.join(MUSTER_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}
