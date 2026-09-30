import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * What the record remembers of each file: the days on which a commit touched
 * it, oldest first. The garden's sources are git repositories, so a stone's
 * first day is the first commit that holds its file. One `git log` per
 * repository, read on every request; at this garden's size that is about ten
 * milliseconds a repository, so nothing is kept between requests.
 */

function git(dir: string, args: string[]): string {
  try {
    return execFileSync(
      "git",
      ["-C", dir, "-c", "core.quotePath=false", ...args],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 8000,
        maxBuffer: 64 << 20,
      },
    );
  } catch {
    return "";
  }
}

/** Every file a repository's history has touched → the days it was touched, oldest first. */
function repoDays(top: string): Map<string, string[]> {
  const days = new Map<string, string[]>();
  let day = "";
  for (const line of git(top, [
    "log",
    "--name-only",
    "--no-renames",
    "--format=@%cs",
  ]).split("\n")) {
    if (!line) continue;
    if (line.startsWith("@")) {
      day = line.slice(1);
      continue;
    }
    const abs = path.join(top, line);
    const seen = days.get(abs);
    if (!seen) days.set(abs, [day]);
    else if (seen[seen.length - 1] !== day) seen.push(day);
  }
  for (const d of days.values()) d.reverse();
  return days;
}

export type Record = {
  born: { [id: string]: string };
  touched: { [id: string]: string[] };
  /** Stones whose file is not yet in any commit, dated by their last change on disk. */
  undated: number;
};

/** Each stone's days from the record of whichever repository holds its file. */
export function readRecord(
  stones: { id: string; file: string | null; modified: string | null }[],
): Record {
  const tops = new Map<string, string | null>(); // dir → repository root
  const repos = new Map<string, Map<string, string[]>>(); // root → its days
  const out: Record = { born: {}, touched: {}, undated: 0 };

  for (const s of stones) {
    let days: string[] | undefined;
    if (s.file && fs.existsSync(s.file)) {
      const real = fs.realpathSync(s.file);
      const dir = path.dirname(real);
      if (!tops.has(dir))
        tops.set(
          dir,
          git(dir, ["rev-parse", "--show-toplevel"]).trim() || null,
        );
      const top = tops.get(dir);
      if (top) {
        if (!repos.has(top)) repos.set(top, repoDays(top));
        days = repos.get(top)!.get(real);
      }
    }
    if (days?.length) {
      out.born[s.id] = days[0];
      out.touched[s.id] = days;
    } else if (s.modified) {
      out.born[s.id] = s.modified.slice(0, 10);
      out.touched[s.id] = [s.modified.slice(0, 10)];
      out.undated++;
    }
  }
  return out;
}
