import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import { parseFence, serialiseFence, type Fence } from "./fence.ts";

/**
 * The fences on disk, one markdown file per fence beside the vault's notes:
 * the fence, what it costs, what it might be for as bullets marked with how
 * each is known, what would come through, putting it back, the calls with
 * their days, afterwards; who put it up, when and whether it can go back up
 * in the frontmatter.
 */
export const FENCE_DIR =
  process.env.NIWA_FENCE_DIR ?? path.join(GARDEN_DIR, "..", "fence");

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function readFences(): Fence[] {
  if (!fs.existsSync(FENCE_DIR)) return [];
  return fs
    .readdirSync(FENCE_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      try {
        return parseFence(
          f.slice(0, -3),
          fs.readFileSync(path.join(FENCE_DIR, f), "utf8"),
        );
      } catch (e) {
        console.warn(`niwa: ${f}: ${(e as Error).message} — skipped`);
        return null;
      }
    })
    .filter((x): x is Fence => x !== null)
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

/** Keep a fence. A fresh one whose slug is taken gets a numbered one; a kept one is written in place. */
export function writeFence(f: Fence, fresh: boolean): Fence {
  let slug = f.slug;
  if (fresh) {
    const taken = new Set(readFences().map((x) => x.slug));
    const base = slug;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
  }
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const kept = { ...f, slug };
  fs.mkdirSync(FENCE_DIR, { recursive: true });
  fs.writeFileSync(path.join(FENCE_DIR, `${slug}.md`), serialiseFence(kept));
  return kept;
}

export function deleteFence(slug: string): boolean {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const file = path.join(FENCE_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}

/* ── when a rule was put up ────────────────────────────────────────────── */

function git(dir: string, args: string[]): string[] {
  try {
    return execFileSync("git", ["-C", dir, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 4000,
      maxBuffer: 16 * 1024 * 1024,
    })
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const tops = new Map<string, string | null>();
const added = new Map<string, { head: string; days: Map<string, string> }>();

/**
 * The day each file first appears in its repository's history — one
 * `git log` per repository, remembered until the repository's HEAD moves.
 * A file never committed has no day; a rename is not followed, so a renamed
 * file dates from its rename. Read-only; nothing is written.
 */
export function firstDays(
  files: (string | null)[],
): (file: string | null) => string | null {
  const out = new Map<string, string>();
  const heads = new Map<string, string | null>();
  for (const file of files) {
    if (!file || out.has(file) || !fs.existsSync(file)) continue;
    const real = fs.realpathSync(file);
    const dir = path.dirname(real);
    if (!tops.has(dir))
      tops.set(dir, git(dir, ["rev-parse", "--show-toplevel"])[0] ?? null);
    const top = tops.get(dir);
    if (!top) continue;
    if (!heads.has(top))
      heads.set(top, git(top, ["rev-parse", "HEAD"])[0] ?? null);
    const head = heads.get(top);
    if (!head) continue;
    let memo = added.get(top);
    if (!memo || memo.head !== head) {
      const days = new Map<string, string>();
      let day = "";
      for (const line of git(top, [
        "log",
        "--reverse",
        "--diff-filter=A",
        "--format=@%cs",
        "--name-only",
      ])) {
        if (line.startsWith("@")) day = line.slice(1);
        else if (day && !days.has(line)) days.set(line, day);
      }
      memo = { head, days };
      added.set(top, memo);
    }
    const d = memo.days.get(path.relative(top, real));
    if (d) out.set(file, d);
  }
  return (file) => (file ? (out.get(file) ?? null) : null);
}
