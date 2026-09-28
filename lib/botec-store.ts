import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import { parseBotec, serialiseBotec, type Botec } from "./botec.ts";

/**
 * The envelopes on disk, one markdown file per envelope beside the vault's
 * notes: the question, the lines as indented bullets with their signs and
 * numbers as written, afterwards; the unit, the reader's line, what it came
 * to, the view it was started at and what was on the desk in the frontmatter.
 */
export const BOTEC_DIR =
  process.env.NIWA_BOTEC_DIR ?? path.join(GARDEN_DIR, "..", "botec");

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function readBotecs(): Botec[] {
  if (!fs.existsSync(BOTEC_DIR)) return [];
  return fs
    .readdirSync(BOTEC_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      try {
        return parseBotec(
          f.slice(0, -3),
          fs.readFileSync(path.join(BOTEC_DIR, f), "utf8"),
        );
      } catch (e) {
        console.warn(`niwa: ${f}: ${(e as Error).message} — skipped`);
        return null;
      }
    })
    .filter((x): x is Botec => x !== null)
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

/** Keep an envelope. A fresh one whose slug is taken gets a numbered one; a kept one is written in place. */
export function writeBotec(b: Botec, fresh: boolean): Botec {
  let slug = b.slug;
  if (fresh) {
    const taken = new Set(readBotecs().map((x) => x.slug));
    const base = slug;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
  }
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const kept = { ...b, slug };
  fs.mkdirSync(BOTEC_DIR, { recursive: true });
  fs.writeFileSync(path.join(BOTEC_DIR, `${slug}.md`), serialiseBotec(kept));
  return kept;
}

export function deleteBotec(slug: string): boolean {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const file = path.join(BOTEC_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}
