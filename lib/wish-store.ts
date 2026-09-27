import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import {
  parseList,
  parsePod,
  parseSitting,
  serialiseList,
  serialisePod,
  serialiseSitting,
  type Pod,
  type Sitting,
} from "./wish.ts";

/**
 * The practice on disk, beside the vault's notes: `pods/` with one markdown
 * file per pod (its beings as bullets), `sittings/` with one per sitting
 * (the script as it was said, the voice beside it), and three lists a
 * person can edit — `wishes.md`, `truths.md`, `facts.md`.
 */
export const WISH_DIR =
  process.env.NIWA_WISH_DIR ?? path.join(GARDEN_DIR, "..", "wish");
const PODS = path.join(WISH_DIR, "pods");
const SITTINGS = path.join(WISH_DIR, "sittings");

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;
const VOICE = /^[a-z0-9-]+\.wav$/;

const readAll = <T>(
  dir: string,
  parse: (slug: string, raw: string) => T,
): T[] => {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      try {
        return parse(
          f.slice(0, -3),
          fs.readFileSync(path.join(dir, f), "utf8"),
        );
      } catch (e) {
        console.warn(`niwa: ${f}: ${(e as Error).message} — skipped`);
        return null;
      }
    })
    .filter((x): x is T => x !== null);
};

export const readPods = (): Pod[] =>
  readAll(PODS, parsePod).sort(
    (a, b) => a.order - b.order || (a.slug < b.slug ? -1 : 1),
  );

export function writePod(p: Pod): Pod {
  if (!SLUG.test(p.slug)) throw new Error("bad slug");
  fs.mkdirSync(PODS, { recursive: true });
  fs.writeFileSync(path.join(PODS, `${p.slug}.md`), serialisePod(p));
  return p;
}

export function deletePod(slug: string): boolean {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const file = path.join(PODS, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}

export const readSittings = (): Sitting[] =>
  readAll(SITTINGS, parseSitting).sort((a, b) => (a.slug < b.slug ? 1 : -1));

export function readSitting(slug: string): Sitting | null {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const file = path.join(SITTINGS, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  return parseSitting(slug, fs.readFileSync(file, "utf8"));
}

/** Keep a sitting. A fresh one whose slug is taken gets a numbered one. */
export function writeSitting(s: Sitting, fresh: boolean): Sitting {
  let slug = s.slug;
  if (fresh) {
    const taken = new Set(readSittings().map((x) => x.slug));
    const base = slug;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
  }
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const kept = { ...s, slug };
  fs.mkdirSync(SITTINGS, { recursive: true });
  fs.writeFileSync(path.join(SITTINGS, `${slug}.md`), serialiseSitting(kept));
  return kept;
}

export function deleteSitting(slug: string): boolean {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const file = path.join(SITTINGS, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  const voice = path.join(SITTINGS, `${slug}.wav`);
  if (fs.existsSync(voice)) fs.unlinkSync(voice);
  return true;
}

/** The voice beside a sitting, by its file name, or null; never a path outside `sittings/`. */
export function voicePath(name: string): string | null {
  if (!VOICE.test(name)) throw new Error("bad name");
  const file = path.join(SITTINGS, name);
  return fs.existsSync(file) ? file : null;
}

export function writeVoice(slug: string, wav: Uint8Array): string {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  fs.mkdirSync(SITTINGS, { recursive: true });
  const name = `${slug}.wav`;
  fs.writeFileSync(path.join(SITTINGS, name), wav);
  return name;
}

export type ListName = "wishes" | "truths" | "facts";
export const LISTS: ListName[] = ["wishes", "truths", "facts"];

/** One of the three lists; the default when the reader has not written their own. */
export function readList(name: ListName, fallback: string[]): string[] {
  const file = path.join(WISH_DIR, `${name}.md`);
  if (!fs.existsSync(file)) return fallback;
  return parseList(fs.readFileSync(file, "utf8"));
}

export function writeList(name: ListName, items: string[]): string[] {
  fs.mkdirSync(WISH_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(WISH_DIR, `${name}.md`),
    serialiseList(name, items),
  );
  return items;
}
