import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import {
  DEFAULT_CONFIG,
  parseBearing,
  serialiseBearing,
  validateConfig,
  type Bearing,
  type ValuesConfig,
} from "./bearing.ts";

/**
 * The one thing the garden writes: a decision set down on the bearing, kept
 * as a small markdown file beside the vault's notes. Values are read from
 * `values.json` in the same folder — the reader's own, edited by hand — and
 * the shipped sample is used until that file exists.
 */
export const BEARING_DIR =
  process.env.NIWA_BEARING_DIR ?? path.join(GARDEN_DIR, "..", "bearing");

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function readConfig(): { config: ValuesConfig; own: boolean } {
  const file = path.join(BEARING_DIR, "values.json");
  if (!fs.existsSync(file)) return { config: DEFAULT_CONFIG, own: false };
  try {
    return {
      config: validateConfig(JSON.parse(fs.readFileSync(file, "utf8"))),
      own: true,
    };
  } catch (e) {
    console.warn(`niwa: ${file}: ${(e as Error).message} — using the sample`);
    return { config: DEFAULT_CONFIG, own: false };
  }
}

export function readBearings(): Bearing[] {
  if (!fs.existsSync(BEARING_DIR)) return [];
  return fs
    .readdirSync(BEARING_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) =>
      parseBearing(
        f.slice(0, -3),
        fs.readFileSync(path.join(BEARING_DIR, f), "utf8"),
      ),
    )
    .sort((a, b) => (a.placed < b.placed ? 1 : a.placed > b.placed ? -1 : 0));
}

export function writeBearing(b: Bearing): void {
  if (!SLUG.test(b.slug)) throw new Error("bad slug");
  fs.mkdirSync(BEARING_DIR, { recursive: true });
  fs.writeFileSync(path.join(BEARING_DIR, `${b.slug}.md`), serialiseBearing(b));
}

export function deleteBearing(slug: string): boolean {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const file = path.join(BEARING_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}
