import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { GardenNode } from "./garden.ts";
import type { Input } from "./course.ts";

/**
 * What the belief's own file remembers. The garden's sources are git
 * repositories, so a belief's history is on record: the days its file
 * changed are the days it was steered, and the first commit in which an
 * input's name appears in the file is the day that input actually hit it.
 * Everything here is read from git on this machine; nothing is written.
 */

export type History = {
  /** days the belief's file changed, oldest first */
  rewrites: string[];
  /** input id → the day it first appeared in the belief's file */
  arrivals: Record<string, string>;
  /** the day the file's history begins; an input already present then has no arrival */
  since: string | null;
};

export type Probe = { id: string; strings: string[] };

const EMPTY: History = { rewrites: [], arrivals: {}, since: null };

function git(dir: string, args: string[]): string[] {
  try {
    return execFileSync("git", ["-C", dir, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 4000,
    })
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** The history of one file, and when each probe's strings first appeared in it. */
export function fileHistory(file: string, probes: Probe[]): History {
  if (!file || !fs.existsSync(file)) return EMPTY;
  const dir = path.dirname(file);
  const [top] = git(dir, ["rev-parse", "--show-toplevel"]);
  if (!top) return EMPTY;
  const rel = path.relative(top, fs.realpathSync(file));
  const days = git(top, ["log", "--follow", "--format=%cs", "--", rel]);
  if (!days.length) return EMPTY;
  const rewrites = [...new Set(days)].sort();
  const since = rewrites[0];
  const arrivals: Record<string, string> = {};
  for (const p of probes) {
    let first: string | null = null;
    for (const s of p.strings) {
      if (s.length < 3) continue;
      const hits = git(top, ["log", "--format=%cs", `-S${s}`, "--", rel]);
      const day = hits[hits.length - 1];
      if (day && (!first || day < first)) first = day;
    }
    // Present in the first commit on record: it was there before the record
    // begins, and the record cannot say when it came.
    if (first && first > since) arrivals[p.id] = first;
  }
  return { rewrites, arrivals, since };
}

/** The strings an input might be written as in a note: its name, its id, its slug. */
export function probeOf(input: Input, nodes: Map<string, GardenNode>): Probe {
  const n = nodes.get(input.id);
  const strings = new Set<string>();
  if (n?.label) strings.add(n.label);
  const tail = input.id.includes(":")
    ? input.id.slice(input.id.indexOf(":") + 1)
    : input.id;
  strings.add(tail);
  if (n?.file) strings.add(path.basename(n.file).replace(/\.[^.]+$/, ""));
  return { id: input.id, strings: [...strings].filter((s) => s.length >= 3) };
}

const cache = new Map<string, { key: string; value: History }>();

/**
 * A belief's history, memoised against the garden's state. Twins are the same
 * document and are not probed; ghosts have no file of their own but their
 * names do appear in the belief, so they are.
 */
export function historyOf(
  belief: GardenNode,
  inputs: Input[],
  nodes: Map<string, GardenNode>,
  fingerprint: string,
): History {
  if (!belief.file) return EMPTY;
  const probes = inputs
    .filter((i) => !(i.threads.length === 1 && i.threads[0] === "twin"))
    .map((i) => probeOf(i, nodes));
  const key = `${fingerprint}|${belief.file}|${probes.map((p) => p.id).join(",")}`;
  const hit = cache.get(belief.id);
  if (hit && hit.key === key) return hit.value;
  const value = fileHistory(belief.file, probes);
  cache.set(belief.id, { key, value });
  return value;
}
