import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import {
  parseProvenance,
  serialiseProvenance,
  type Provenance,
} from "./provenance.ts";

/**
 * The provenances, one markdown file each beside the vault's notes: the
 * claim as it reached the reader and the first saying as sections a person
 * can edit, and the hands, their questions and the checks in the
 * frontmatter. Read by the file's name.
 */
export const PROVENANCE_DIR =
  process.env.NIWA_PROVENANCE_DIR ?? path.join(GARDEN_DIR, "..", "provenance");

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function readProvenances(): Provenance[] {
  if (!fs.existsSync(PROVENANCE_DIR)) return [];
  return fs
    .readdirSync(PROVENANCE_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) =>
      parseProvenance(
        f.slice(0, -3),
        fs.readFileSync(path.join(PROVENANCE_DIR, f), "utf8"),
      ),
    )
    .sort((a, b) =>
      a.touched < b.touched ? 1 : a.touched > b.touched ? -1 : 0,
    );
}

/** Keep a provenance. A new one whose slug is taken gets a numbered one; an existing one is rewritten in place. */
export function writeProvenance(p: Provenance, fresh: boolean): Provenance {
  let slug = p.slug;
  if (fresh) {
    const taken = new Set(readProvenances().map((x) => x.slug));
    const base = slug;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
  }
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const kept = { ...p, slug };
  fs.mkdirSync(PROVENANCE_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(PROVENANCE_DIR, `${slug}.md`),
    serialiseProvenance(kept),
  );
  return kept;
}

export function deleteProvenance(slug: string): boolean {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const file = path.join(PROVENANCE_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}
