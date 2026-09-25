import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import { parseClaim, serialiseClaim, type Claim } from "./tack.ts";

/**
 * The claims on the tack, one markdown file each beside the vault's notes:
 * the claim, what it expects to see if so and if not, why it is held, the
 * tacks and the reopenings as dated entries a person can read; the layer,
 * the window and the looks in the frontmatter.
 */
export const TACK_DIR =
  process.env.NIWA_TACK_DIR ?? path.join(GARDEN_DIR, "..", "tack");

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function readClaims(): Claim[] {
  if (!fs.existsSync(TACK_DIR)) return [];
  return fs
    .readdirSync(TACK_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      try {
        return parseClaim(
          f.slice(0, -3),
          fs.readFileSync(path.join(TACK_DIR, f), "utf8"),
        );
      } catch (e) {
        console.warn(`niwa: ${f}: ${(e as Error).message} — skipped`);
        return null;
      }
    })
    .filter((c): c is Claim => c !== null)
    .sort((a, b) =>
      a.touched < b.touched ? 1 : a.touched > b.touched ? -1 : 0,
    );
}

/** Keep a claim. A fresh one whose slug is taken gets a numbered one; an existing one is rewritten in place. */
export function writeClaim(c: Claim, fresh: boolean): Claim {
  let slug = c.slug;
  if (fresh) {
    const taken = new Set(readClaims().map((x) => x.slug));
    const base = slug;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
  }
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const kept = { ...c, slug };
  fs.mkdirSync(TACK_DIR, { recursive: true });
  fs.writeFileSync(path.join(TACK_DIR, `${slug}.md`), serialiseClaim(kept));
  return kept;
}

export function deleteClaim(slug: string): boolean {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const file = path.join(TACK_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}
