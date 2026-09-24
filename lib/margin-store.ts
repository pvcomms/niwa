import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import {
  AUDIO,
  ID,
  parseNote,
  serialiseNote,
  type Note,
} from "./margin.ts";

/**
 * The margin's files, beside the vault's notes: one small markdown file per
 * note, named by its moment, and the voice note beside it under the same
 * name. A note is read by its file's name and never renamed.
 */
export const MARGIN_DIR =
  process.env.NIWA_MARGIN_DIR ?? path.join(GARDEN_DIR, "..", "margin");

export function readNotes(): Note[] {
  if (!fs.existsSync(MARGIN_DIR)) return [];
  return fs
    .readdirSync(MARGIN_DIR)
    .filter((f) => f.endsWith(".md") && ID.test(f.slice(0, -3)))
    .map((f) =>
      parseNote(f.slice(0, -3), fs.readFileSync(path.join(MARGIN_DIR, f), "utf8")),
    )
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

export function readNote(id: string): Note | null {
  if (!ID.test(id)) throw new Error("bad id");
  const file = path.join(MARGIN_DIR, `${id}.md`);
  if (!fs.existsSync(file)) return null;
  return parseNote(id, fs.readFileSync(file, "utf8"));
}

export function writeNote(n: Note): Note {
  if (!ID.test(n.id)) throw new Error("bad id");
  fs.mkdirSync(MARGIN_DIR, { recursive: true });
  fs.writeFileSync(path.join(MARGIN_DIR, `${n.id}.md`), serialiseNote(n));
  return n;
}

export function writeAudio(name: string, bytes: Uint8Array): string {
  if (!AUDIO.test(name)) throw new Error("bad audio name");
  fs.mkdirSync(MARGIN_DIR, { recursive: true });
  fs.writeFileSync(path.join(MARGIN_DIR, name), bytes);
  return name;
}

export function audioPath(name: string): string | null {
  if (!AUDIO.test(name)) throw new Error("bad audio name");
  const file = path.join(MARGIN_DIR, name);
  return fs.existsSync(file) ? file : null;
}

/** Take a note back: its file and its voice note, if any. */
export function deleteNote(id: string): boolean {
  const n = readNote(id);
  if (!n) return false;
  fs.unlinkSync(path.join(MARGIN_DIR, `${id}.md`));
  if (n.audio) {
    const a = path.join(MARGIN_DIR, n.audio);
    if (fs.existsSync(a)) fs.unlinkSync(a);
  }
  return true;
}
