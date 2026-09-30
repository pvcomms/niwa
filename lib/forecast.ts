/**
 * The forecast — the garden's guess at the reader's call, sealed when a thing
 * is weighed and opened only once the reader has let it in or passed. The
 * guess is the reader's own record turned on the new thing: the calls on the
 * nearest things they weighed before, each counted by how alike it is, pulled
 * toward their base rate by as much as that evidence is thin. Each call is then
 * scored against the guess that was sealed for it (Brier), and the record
 * against the base rate as it stood that day — so the only way the garden's
 * number rises is by knowing something the base rate did not.
 *
 * Nothing here is advice. The guess is hidden until after the call so it
 * cannot lean on it, and the readings are counts and squared distances,
 * never a grade of the reader. Pure, testable.
 */

/** How many near things are asked. */
export const NEAR = 8;
/** Likeness below this is not kin; it is noise. */
export const MIN_SIM = 0.05;
/** How many past calls the base rate counts as, when pulling the guess toward it. */
export const PULL = 2;
/** Below this many scored calls a skill is not said, only counted. */
export const MIN_SCORED = 10;

/** What was sealed the day a thing was weighed. */
export type Seal = {
  /** The garden's guess that the reader lets it in, 0–1. */
  garden: number;
  /** The base rate that day: the share of past calls that let in, Laplace-smoothed. */
  base: number;
  /** The summed likeness of the near things the guess rests on. */
  weight: number;
  /** How many near things it rests on, and of those how many were let in. */
  near: number;
  nearIn: number;
};

/** A past call as the guess sees it: how alike it is to the new thing, and whether it was let in. */
export type Past = { sim: number; letIn: boolean };

/** Laplace's rule: with no calls, even odds; each call moves it by less than the one before. */
export function baseRate(letIn: number, calls: number): number {
  return (letIn + 1) / (calls + 2);
}

/** The guess, sealed. */
export function seal(past: Past[]): Seal {
  const base = baseRate(
    past.filter((p) => p.letIn).length,
    past.length,
  );
  const near = past
    .filter((p) => p.sim >= MIN_SIM)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, NEAR);
  const weight = near.reduce((s, p) => s + p.sim, 0);
  const yes = near.reduce((s, p) => s + (p.letIn ? p.sim : 0), 0);
  return {
    garden: (yes + PULL * base) / (weight + PULL),
    base,
    weight,
    near: near.length,
    nearIn: near.filter((p) => p.letIn).length,
  };
}

/** How much the guess rests on, in words: evidence, not confidence in the reader. */
export function evidence(s: Seal): string {
  if (s.near === 0) return "nothing near it in your record, so the base rate alone";
  if (s.weight < 0.5) return "thin evidence";
  if (s.weight < 1.5) return "some evidence";
  return "a fair amount of evidence";
}

/** A share said as a person would: 62 in 100. */
export const in100 = (p: number) => `${Math.round(p * 100)} in 100`;

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/** The guess opened beside the call. Numbers only; whether it matched is plain to see. */
export function reveal(s: Seal, letIn: boolean): string {
  const rests =
    s.near === 0
      ? evidence(s)
      : `${plural(s.near, "near thing", "near things")} you weighed before, ${s.nearIn} let in — ${evidence(s)}`;
  return (
    `The garden guessed ${in100(s.garden)} that you would let it in, from ${rests}. ` +
    `The base rate was ${in100(s.base)}. You ${letIn ? "let it in" : "passed"}.`
  );
}

/** One call's squared distance from what happened. 0 is certain and so; 1 is certain and not. */
export const brier = (p: number, letIn: boolean) => (p - (letIn ? 1 : 0)) ** 2;

export type Bin = { lo: number; hi: number; n: number; guessed: number; letIn: number };

export type Score = {
  /** Calls with a sealed guess. */
  n: number;
  letIn: number;
  /** Calls kept before guesses were sealed, or not yet called. */
  unscored: number;
  /** Mean squared distance of the garden's guesses, and of the base rate's. */
  garden: number;
  base: number;
  /** 1 − garden / base: 0 is the base rate, 1 is knowing. Null below MIN_SCORED or when the base rate was never off. */
  skill: number | null;
  /** Five bins of the garden's guesses: how many, the mean guess, the share let in. */
  bins: Bin[];
  /** The calls the garden leaned toward (guessed above the base rate) and how many of them were let in. */
  leaned: number;
  leanedIn: number;
};

/** A call as it is scored: the seal and what the reader did. */
export type Called = { seal: Seal | null; verdict: "let in" | "passed" | "" };

export function score(calls: Called[]): Score {
  const scored = calls.filter(
    (c): c is { seal: Seal; verdict: "let in" | "passed" } =>
      c.seal !== null && c.verdict !== "",
  );
  const n = scored.length;
  let g = 0;
  let b = 0;
  let letIn = 0;
  let leaned = 0;
  let leanedIn = 0;
  const bins: Bin[] = [0, 1, 2, 3, 4].map((i) => ({
    lo: i / 5,
    hi: (i + 1) / 5,
    n: 0,
    guessed: 0,
    letIn: 0,
  }));
  for (const c of scored) {
    const y = c.verdict === "let in";
    g += brier(c.seal.garden, y);
    b += brier(c.seal.base, y);
    if (y) letIn++;
    if (c.seal.garden > c.seal.base) {
      leaned++;
      if (y) leanedIn++;
    }
    const bin = bins[Math.min(4, Math.floor(c.seal.garden * 5))];
    bin.n++;
    bin.guessed += c.seal.garden;
    if (y) bin.letIn++;
  }
  for (const bin of bins)
    if (bin.n) {
      bin.guessed /= bin.n;
      bin.letIn /= bin.n;
    }
  const garden = n ? g / n : 0;
  const base = n ? b / n : 0;
  return {
    n,
    letIn,
    unscored: calls.length - n,
    garden,
    base,
    skill: n >= MIN_SCORED && base > 0 ? 1 - garden / base : null,
    bins,
    leaned,
    leanedIn,
  };
}

const sign = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(2)}`;

/** The record said back: counts, then the two distances, then the skill once there are enough. */
export function readings(s: Score): string[] {
  if (s.n === 0)
    return [
      "Nothing scored yet. Each thing you let in or pass is scored against the guess the garden sealed when you weighed it.",
    ];
  const out = [
    `${plural(s.n, "call", "calls")} scored, ${s.letIn} let in.`,
    `The garden's guesses sat ${s.garden.toFixed(2)} from what you did, on average, squared; the base rate's sat ${s.base.toFixed(2)}.`,
  ];
  if (s.skill === null)
    out.push(
      `A skill is said after ${MIN_SCORED} calls; ${s.n} so far.`,
    );
  else
    out.push(
      `Skill ${sign(s.skill)}: ${
        s.skill > 0
          ? `${Math.round(s.skill * 100)} in 100 of the way from the base rate to knowing.`
          : s.skill < 0
            ? "further from what you did than the base rate was."
            : "level with the base rate."
      }`,
    );
  if (s.leaned)
    out.push(
      `Of the ${s.leaned} it leaned toward, ${s.leanedIn} let in; of all ${s.n}, ${s.letIn}.`,
    );
  return out;
}

/** The seal as it sits in a choice's frontmatter, and back. */
export function sealLine(s: Seal): string {
  const r = (x: number) => (Math.round(x * 1000) / 1000).toString();
  return `forecast: {garden: ${r(s.garden)}, base: ${r(s.base)}, weight: ${r(s.weight)}, near: ${s.near}, nearIn: ${s.nearIn}}`;
}

const unit = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) && x >= 0 && x <= 1 ? x : null;
};

/** A seal read from anywhere — a file, a request — or null if any part of it is not a seal. */
export function parseSeal(v: unknown): Seal | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const garden = unit(o.garden);
  const base = unit(o.base);
  const weight = Number(o.weight);
  const near = Number(o.near);
  const nearIn = Number(o.nearIn);
  if (
    garden === null ||
    base === null ||
    !Number.isFinite(weight) ||
    weight < 0 ||
    !Number.isInteger(near) ||
    !Number.isInteger(nearIn) ||
    near < 0 ||
    nearIn < 0 ||
    nearIn > near
  )
    return null;
  return { garden, base, weight, near, nearIn };
}
