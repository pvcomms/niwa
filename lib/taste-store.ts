import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import { parseChoice, serialiseChoice, type Choice } from "./taste.ts";

/**
 * The record of what was weighed on the distribution, one markdown file per
 * choice beside the vault's notes. Like the bearing's decisions, these are the
 * garden's only writes, and there are none when it is deployed.
 */
export const TASTE_DIR =
  process.env.NIWA_TASTE_DIR ?? path.join(GARDEN_DIR, "..", "taste");

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function readChoices(): Choice[] {
  if (!fs.existsSync(TASTE_DIR)) return [];
  return fs
    .readdirSync(TASTE_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) =>
      parseChoice(
        f.slice(0, -3),
        fs.readFileSync(path.join(TASTE_DIR, f), "utf8"),
      ),
    )
    .sort((a, b) => (a.weighed < b.weighed ? 1 : a.weighed > b.weighed ? -1 : 0));
}

export function readChoice(slug: string): Choice | null {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const file = path.join(TASTE_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  return parseChoice(slug, fs.readFileSync(file, "utf8"));
}

export function writeChoice(c: Choice): void {
  if (!SLUG.test(c.slug)) throw new Error("bad slug");
  fs.mkdirSync(TASTE_DIR, { recursive: true });
  fs.writeFileSync(path.join(TASTE_DIR, `${c.slug}.md`), serialiseChoice(c));
}

export function deleteChoice(slug: string): boolean {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const file = path.join(TASTE_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}
