import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import { parseTrace, serialiseTrace, type Trace } from "./half-second.ts";

/**
 * The traces on disk, one markdown file per run of the feed beside the
 * vault's notes: the events as a list, what the reader would say, what the
 * trace shows, afterwards; the meters, the weights and the peaks in the
 * frontmatter.
 */
export const HALF_SECOND_DIR =
  process.env.NIWA_HALF_SECOND_DIR ??
  path.join(GARDEN_DIR, "..", "half-second");

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function readTraces(): Trace[] {
  if (!fs.existsSync(HALF_SECOND_DIR)) return [];
  return fs
    .readdirSync(HALF_SECOND_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      try {
        return parseTrace(
          f.slice(0, -3),
          fs.readFileSync(path.join(HALF_SECOND_DIR, f), "utf8"),
        );
      } catch (e) {
        console.warn(`niwa: ${f}: ${(e as Error).message} — skipped`);
        return null;
      }
    })
    .filter((t): t is Trace => t !== null)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

/** Keep a trace. A fresh one whose slug is taken gets a numbered one. */
export function writeTrace(t: Trace, fresh: boolean): Trace {
  let slug = t.slug;
  if (fresh) {
    const taken = new Set(readTraces().map((x) => x.slug));
    const base = slug;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
  }
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const kept = { ...t, slug };
  fs.mkdirSync(HALF_SECOND_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(HALF_SECOND_DIR, `${slug}.md`),
    serialiseTrace(kept),
  );
  return kept;
}

export function deleteTrace(slug: string): boolean {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const file = path.join(HALF_SECOND_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}
