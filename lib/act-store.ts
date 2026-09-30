import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import { parseAct, serialiseAct, type Act } from "./act.ts";

/**
 * The intentions on disk, one markdown file per intention beside the vault's
 * notes: the intention, the best that would come of it, what would stand in
 * the way and what to do if it does, the steps as dated bullets with their
 * cue, action, place, minutes, moves, marks and what they were like, and the
 * after-action review; where it came from in the frontmatter.
 */
export const ACT_DIR =
  process.env.NIWA_ACT_DIR ?? path.join(GARDEN_DIR, "..", "act");

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function readActs(): Act[] {
  if (!fs.existsSync(ACT_DIR)) return [];
  return fs
    .readdirSync(ACT_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      try {
        return parseAct(
          f.slice(0, -3),
          fs.readFileSync(path.join(ACT_DIR, f), "utf8"),
        );
      } catch (e) {
        console.warn(`niwa: ${f}: ${(e as Error).message} — skipped`);
        return null;
      }
    })
    .filter((x): x is Act => x !== null)
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

/** Keep an intention. A fresh one whose slug is taken gets a numbered one; a kept one is written in place. */
export function writeAct(a: Act, fresh: boolean): Act {
  let slug = a.slug;
  if (fresh) {
    const taken = new Set(readActs().map((x) => x.slug));
    const base = slug;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
  }
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const kept = { ...a, slug };
  fs.mkdirSync(ACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ACT_DIR, `${slug}.md`), serialiseAct(kept));
  return kept;
}

export function deleteAct(slug: string): boolean {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const file = path.join(ACT_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}
