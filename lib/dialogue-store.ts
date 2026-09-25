import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import {
  emptyBank,
  parseBank,
  parseDialogue,
  serialiseDialogue,
  type Bank,
  type Dialogue,
} from "./dialogue.ts";

/**
 * The dialogues, one markdown file each beside the vault's notes: the thesis
 * as first said and as it stands now as sections, the turns as sub-sections
 * a person can read as a transcript, the assumptions and terms in the
 * frontmatter. `questions.md` in the same folder is the reader's own bank.
 */
export const DIALOGUE_DIR =
  process.env.NIWA_DIALOGUE_DIR ?? path.join(GARDEN_DIR, "..", "dialogue");

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;
const BANK = "questions";

export function readDialogues(): Dialogue[] {
  if (!fs.existsSync(DIALOGUE_DIR)) return [];
  return fs
    .readdirSync(DIALOGUE_DIR)
    .filter((f) => f.endsWith(".md") && f !== `${BANK}.md`)
    .map((f) => {
      try {
        return parseDialogue(f.slice(0, -3), fs.readFileSync(path.join(DIALOGUE_DIR, f), "utf8"));
      } catch (e) {
        console.warn(`niwa: ${f}: ${(e as Error).message} — skipped`);
        return null;
      }
    })
    .filter((d): d is Dialogue => d !== null)
    .sort((a, b) => (a.touched < b.touched ? 1 : a.touched > b.touched ? -1 : 0));
}

/** Keep a dialogue. A fresh one whose slug is taken gets a numbered one; an existing one is rewritten in place. */
export function writeDialogue(d: Dialogue, fresh: boolean): Dialogue {
  let slug = d.slug;
  if (fresh) {
    const taken = new Set(readDialogues().map((x) => x.slug));
    const base = slug;
    let n = 2;
    while (taken.has(slug) || slug === BANK) slug = `${base}-${n++}`;
  }
  if (!SLUG.test(slug) || slug === BANK) throw new Error("bad slug");
  const kept = { ...d, slug };
  fs.mkdirSync(DIALOGUE_DIR, { recursive: true });
  fs.writeFileSync(path.join(DIALOGUE_DIR, `${slug}.md`), serialiseDialogue(kept));
  return kept;
}

export function deleteDialogue(slug: string): boolean {
  if (!SLUG.test(slug) || slug === BANK) throw new Error("bad slug");
  const file = path.join(DIALOGUE_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}

/** The reader's own bank of questions, if they have written one. */
export function readBank(): { bank: Bank; own: boolean } {
  const file = path.join(DIALOGUE_DIR, `${BANK}.md`);
  if (!fs.existsSync(file)) return { bank: emptyBank(), own: false };
  return { bank: parseBank(fs.readFileSync(file, "utf8")), own: true };
}
