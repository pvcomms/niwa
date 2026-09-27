import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import { parseStep, serialiseStep, type Step } from "./overview.ts";

/**
 * The steps on disk, one markdown file per step beside the vault's notes:
 * the step, the life, who the reader is on that road, the days it was let go
 * for; the numbers — how hard, how long, the horizon, the marks, when it was
 * taken and how it was after — in the frontmatter.
 */
export const OVERVIEW_DIR =
  process.env.NIWA_OVERVIEW_DIR ?? path.join(GARDEN_DIR, "..", "overview");

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function readSteps(): Step[] {
  if (!fs.existsSync(OVERVIEW_DIR)) return [];
  return fs
    .readdirSync(OVERVIEW_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      try {
        return parseStep(
          f.slice(0, -3),
          fs.readFileSync(path.join(OVERVIEW_DIR, f), "utf8"),
        );
      } catch (e) {
        console.warn(`niwa: ${f}: ${(e as Error).message} — skipped`);
        return null;
      }
    })
    .filter((s): s is Step => s !== null)
    .sort((a, b) =>
      a.touched < b.touched ? 1 : a.touched > b.touched ? -1 : a.slug < b.slug ? 1 : -1,
    );
}

/** Keep a step. A fresh one whose slug is taken gets a numbered one. */
export function writeStep(s: Step, fresh: boolean): Step {
  let slug = s.slug;
  if (fresh) {
    const taken = new Set(readSteps().map((x) => x.slug));
    const base = slug;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
  }
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const kept = { ...s, slug };
  fs.mkdirSync(OVERVIEW_DIR, { recursive: true });
  fs.writeFileSync(path.join(OVERVIEW_DIR, `${slug}.md`), serialiseStep(kept));
  return kept;
}

export function deleteStep(slug: string): boolean {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const file = path.join(OVERVIEW_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}
