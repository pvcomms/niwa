import matter from "gray-matter";
import { rand, seedOf } from "./hand.ts";
import { slugOf as datedSlug, uid } from "./way.ts";

/**
 * The back of an envelope: a thing worked out from rough guesses. The reader
 * says what they are after, then a line at a time what it is made of — what
 * the line is, and a number or a range they would be surprised to be outside.
 * The lines are taken down the page in order, each applied to what the page
 * has come to so far: times, unless the line says divided by, plus or minus.
 * A line can be broken down into lines of its own, worked out first.
 *
 * A range is read as the middle nine in ten of what the line could be —
 * spread by its ratio when both ends are above nothing, by its odds when both
 * are shares, evenly otherwise — and five thousand draws of every range are
 * taken together, so the answer comes back as a spread and not as a number.
 * Each line's draws are laid evenly through its own range and shuffled against
 * the others', seeded by where the line sits, so a line written as 20 to 50
 * draws 20 to 50 and a number dragged along moves the answer without the
 * draws being dealt again.
 *
 * Nothing here says what an answer means. The readings say where it lands, how
 * far it could run, which guess it leans on most, how many draws fall above a
 * line the reader draws across it, and — afterwards — where what it came to
 * fell among the draws. Every number on the envelope is the reader's.
 */

export type Op = "×" | "÷" | "+" | "−";
export const OPS: Op[] = ["×", "÷", "+", "−"];
export const OP_WORD: Record<Op, string> = {
  "×": "times",
  "÷": "divided by",
  "+": "plus",
  "−": "minus",
};
/** What a hand might type for each: the page and the file both read them. */
const OP_OF: Record<string, Op> = {
  "×": "×",
  "*": "×",
  x: "×",
  "÷": "÷",
  "/": "÷",
  "+": "+",
  "−": "−",
  "-": "−",
  "–": "−",
};
export const opOf = (s: string): Op | null => OP_OF[s] ?? null;

export type Line = {
  /** Stable while the envelope is open, for the page; not kept in the file. */
  key: string;
  op: Op;
  label: string;
  /** As written: `3M`, `20 to 50`, `1 in 30`; `=` when it is broken down. */
  value: string;
  /** Broken down: its own lines, worked out first. */
  lines: Line[];
};

/** What was on the desk when the envelope was started. */
export type About = { kind: string; id: string; label: string };

export type Botec = {
  slug: string;
  put: string;
  touched: string;
  /** What is being worked out. */
  question: string;
  /** What the answer is in: tuners, hours a month, per pound. */
  unit: string;
  lines: Line[];
  /** A line the reader draws across the answer, and what they call it. */
  line: number | null;
  lineName: string;
  /** Afterwards: what it came to, and when. */
  came: number | null;
  cameOn: string;
  after: string;
  /** The view it was started at, its address then, and what was on the desk. */
  view: string;
  url: string;
  about: About | null;
};

export const DRAWS = 5000;
/** Where the strip keeps the envelope being worked on, in this browser, until it is kept or let go. */
export const DRAFT = "niwa-botec-draft";
export const DOTS = 100;
/** A line, its lines, and theirs. */
export const DEPTH = 3;
export const MAX_LINES = 60;

export const newLine = (op: Op = "×", label = "", value = ""): Line => ({
  key: uid(),
  op,
  label,
  value,
  lines: [],
});

export const emptyBotec = (
  day: string,
  where: { view?: string; url?: string; about?: About | null } = {},
): Botec => ({
  slug: "",
  put: day,
  touched: day,
  question: "",
  unit: "",
  lines: [newLine()],
  line: null,
  lineName: "",
  came: null,
  cameOn: "",
  after: "",
  view: where.view ?? "",
  url: where.url ?? "",
  about: where.about ?? null,
});

/** What the envelope is called: its question, else its first line, else what it is. */
export const titleOf = (b: Pick<Botec, "question" | "lines">): string =>
  b.question.trim() ||
  b.lines.find((l) => l.label.trim())?.label.trim() ||
  "an envelope";

export const hasContent = (b: Pick<Botec, "question" | "lines">): boolean =>
  !!b.question.trim() ||
  flatten(b.lines).some((f) => f.line.label.trim() || f.line.value.trim());

/* ── reading a guess ──────────────────────────────────────────────────── */

export type Style =
  "plain" | "grouped" | "suffix" | "pct" | "in" | "frac" | "sci";
/** One end of a guess: its value, how it was written, and the 1 of a `1 in 30`. */
export type End = { v: number; style: Style; a?: number };
export type Guess =
  | { kind: "empty" }
  | { kind: "down" }
  | { kind: "bad" }
  | { kind: "point"; at: End; share: boolean; cur: string; unit: string }
  | {
      kind: "range";
      lo: End;
      hi: End;
      share: boolean;
      cur: string;
      unit: string;
    };

const SUFFIX: Record<string, number> = {
  k: 1e3,
  thousand: 1e3,
  m: 1e6,
  mn: 1e6,
  mil: 1e6,
  million: 1e6,
  b: 1e9,
  bn: 1e9,
  billion: 1e9,
  t: 1e12,
  tn: 1e12,
  trillion: 1e12,
};
const NUM = String.raw`(?:\d{1,3}(?:[,_]\d{3})+|\d+)(?:\.\d+)?|\.\d+`;
const POINT = new RegExp(
  String.raw`^([-−–])?\s*([$€£₹¥])?\s*(${NUM})` +
    String.raw`(?:\s*(?:e([-+]?\d+)|[×x*]\s*10\^([-+]?\d+)))?` +
    String.raw`(?:(k|mn|mil|m|bn|b|tn|t)(?![a-z])|\s+(thousand|million|billion|trillion|mn|bn|tn)(?![a-z]))?` +
    String.raw`\s*(%)?\s*(.*)$`,
  "i",
);
const ABOUT = /^(?:about|around|roughly|some|c\.|ca\.|~|≈)\s*/i;

type Read = { e: End; cur: string; unit: string; mult: number; bare: boolean };

function readEnd(raw: string): Read | null {
  const s = raw
    .trim()
    .replace(ABOUT, "")
    .replace(/^10\^([-+]?\d+)/, "1e$1");
  if (!s) return null;
  let m = s.match(/^(\d+(?:\.\d+)?)\s+in\s+(.+)$/i);
  if (m) {
    const a = Number(m[1]);
    const b = readEnd(m[2]);
    if (!b || !(b.e.v > 0) || !(a > 0)) return null;
    return {
      e: { v: a / b.e.v, style: "in", a },
      cur: "",
      unit: b.unit,
      mult: 1,
      bare: false,
    };
  }
  m = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)(?:\s+(.*))?$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (!(b > 0)) return null;
    return {
      e: { v: a / b, style: "frac", a },
      cur: "",
      unit: (m[3] ?? "").trim(),
      mult: 1,
      bare: false,
    };
  }
  m = s.match(POINT);
  if (!m) return null;
  const [, neg, cur = "", num, exp, pow, suf, word, pct, rest = ""] = m;
  let v = Number(num.replace(/[,_]/g, ""));
  if (!Number.isFinite(v)) return null;
  let style: Style = /[,_]/.test(num) ? "grouped" : "plain";
  let mult = 1;
  if (exp !== undefined || pow !== undefined) {
    v *= 10 ** Number(exp ?? pow);
    style = "sci";
  }
  const sx = (suf ?? word)?.toLowerCase();
  if (sx) {
    mult = SUFFIX[sx];
    v *= mult;
    style = "suffix";
  }
  if (pct) {
    v /= 100;
    style = "pct";
  }
  if (neg) v = -v;
  const unit = rest.trim();
  // What follows the number is a unit only if it is words: `3 4` and `3 x 4` are not numbers.
  if (/^([\d.+\-−*/×÷^=]|x\s*\d)/i.test(unit)) return null;
  return {
    e: { v, style },
    cur,
    unit,
    mult,
    bare: style === "plain" || style === "grouped",
  };
}

/** The two ends of a range as written, or null when it is one number. */
function splitRange(s: string): [string, string] | null {
  const between = /^between\s+/i.test(s);
  const t = s.replace(/^between\s+/i, "");
  let m = t.match(
    between ? /^(.+?)\s+(?:and|to)\s+(.+)$/i : /^(.+?)\s+to\s+(.+)$/i,
  );
  if (m) return [m[1], m[2]];
  m = t.match(/^(.+?)\s*(?:…|\.{2,3}|–|—)\s*(.+)$/);
  if (m) return [m[1], m[2]];
  // A hyphen between two numbers — not a leading minus, and not an exponent's.
  m = t.match(/^(.*?[\d%kmbtn])\s*-\s*([$€£₹¥]?\s*[\d.].*)$/i);
  if (m) return [m[1], m[2]];
  return null;
}

const isShare = (e: End) =>
  (e.style === "pct" || e.style === "in" || e.style === "frac") &&
  e.v >= 0 &&
  e.v <= 1;

/**
 * A line's number as written: empty, broken down (`=`), unreadable, one
 * number, or a range. `3M`, `2 to 3M`, `20–50`, `1 in 20 to 1 in 5`,
 * `3-10%`, `£40 an hour`, `2e6`, `1/3`, `between 4 and 6 weeks`. A suffix or a
 * percent written on the top end only is read on both.
 */
export function readGuess(text: string): Guess {
  const s = text.trim();
  if (!s) return { kind: "empty" };
  if (s === "=") return { kind: "down" };
  const r = splitRange(s);
  if (r) {
    const a = readEnd(r[0]);
    const b = readEnd(r[1]);
    if (!a || !b) return { kind: "bad" };
    let lo = a.e;
    let hi = b.e;
    if (a.bare && !b.bare) {
      if (b.e.style === "suffix") lo = { v: lo.v * b.mult, style: "suffix" };
      else if (b.e.style === "pct") lo = { v: lo.v / 100, style: "pct" };
    }
    if (lo.v > hi.v) [lo, hi] = [hi, lo];
    const cur = a.cur || b.cur;
    const unit = b.unit || a.unit;
    if (lo.v === hi.v)
      return { kind: "point", at: lo, share: isShare(lo), cur, unit };
    return {
      kind: "range",
      lo,
      hi,
      share: isShare(lo) && isShare(hi),
      cur,
      unit,
    };
  }
  const a = readEnd(s);
  if (!a) return { kind: "bad" };
  return {
    kind: "point",
    at: a.e,
    share: isShare(a.e),
    cur: a.cur,
    unit: a.unit,
  };
}

/* ── writing one back ─────────────────────────────────────────────────── */

const sig = (v: number, n = 2): number =>
  v === 0 ? 0 : Number(v.toPrecision(n));
/** A number without an exponent, as short as it goes. */
const plainOf = (v: number): string => {
  if (v === 0) return "0";
  const s = String(v);
  if (!/e/.test(s)) return s;
  const places = Math.min(
    20,
    Math.max(0, -Math.floor(Math.log10(Math.abs(v))) + 2),
  );
  return v.toFixed(places).replace(/\.?0+$/, "");
};
const group = (v: number): string => {
  const [i, d] = plainOf(v).split(".");
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (d ? `.${d}` : "");
};
const BIG: [number, string][] = [
  [1e12, "tn"],
  [1e9, "bn"],
  [1e6, "M"],
  [1e3, "k"],
];

/** A number as the envelope says it: two figures, and k, M, bn past ten thousand. */
export function fmt(v: number, n = 2): string {
  if (Number.isNaN(v)) return "?";
  if (!Number.isFinite(v)) return v > 0 ? "∞" : "−∞";
  const r = sig(Math.abs(v), n);
  let s: string;
  if (r >= 1e4) {
    const [d, suf] = BIG.find(([d]) => r >= d)!;
    s = `${plainOf(sig(r / d, n))}${suf}`;
  } else if (r >= 1000) s = group(r);
  else if (r >= 1e-4 || r === 0) s = plainOf(r);
  else s = r.toExponential(n - 1);
  return v < 0 ? `−${s}` : s;
}

/**
 * One end written back the way the reader wrote it: to two figures after a
 * drag, so a number moved by hand lands on a round one, and to more when it is
 * only being shown.
 */
export function writeEnd(e: End, n = 2): string {
  const neg = e.v < 0 ? "-" : "";
  const v = Math.abs(e.v);
  switch (e.style) {
    case "pct":
      return `${neg}${plainOf(sig(v * 100, n))}%`;
    case "in": {
      const a = e.a ?? 1;
      return v > 0 ? `${plainOf(a)} in ${group(sig(a / v, n))}` : "0";
    }
    case "frac": {
      const a = e.a ?? 1;
      return v > 0 ? `${plainOf(a)}/${plainOf(sig(a / v, n))}` : "0";
    }
    case "sci": {
      if (v === 0) return "0";
      const x = Math.floor(Math.log10(v));
      return `${neg}${plainOf(sig(v / 10 ** x, n))}e${x}`;
    }
    case "suffix":
      // Written with a suffix, a thousand keeps its k: 5k, not 5,000.
      return v >= 1e3 && v < 1e4
        ? `${neg}${plainOf(sig(v / 1e3, n))}k`
        : `${neg}${fmt(v, n)}`;
    case "grouped":
      return `${neg}${group(sig(v, n))}`;
    default:
      return `${neg}${plainOf(sig(v, n))}`;
  }
}

export function writeGuess(g: Guess, n = 2): string {
  const unit = (u: string) => (u ? ` ${u}` : "");
  if (g.kind === "point") return `${g.cur}${writeEnd(g.at, n)}${unit(g.unit)}`;
  if (g.kind === "range")
    return `${g.cur}${writeEnd(g.lo, n)} to ${g.cur}${writeEnd(g.hi, n)}${unit(g.unit)}`;
  return "";
}

/** An end moved by a factor: a share by its odds, so it stays a share. */
export function scaleEnd(e: End, f: number, share: boolean): End {
  if (share && e.v > 0 && e.v < 1) {
    const o = (e.v / (1 - e.v)) * f;
    return { ...e, v: o / (1 + o) };
  }
  return { ...e, v: share ? Math.min(1, Math.max(0, e.v * f)) : e.v * f };
}

/** A guess moved: one end, the other, or both, by a factor. The ends never cross. */
export function nudge(g: Guess, which: "lo" | "hi" | "both", f: number): Guess {
  if (g.kind === "point") return { ...g, at: scaleEnd(g.at, f, g.share) };
  if (g.kind !== "range") return g;
  let lo = which !== "hi" ? scaleEnd(g.lo, f, g.share) : g.lo;
  let hi = which !== "lo" ? scaleEnd(g.hi, f, g.share) : g.hi;
  if (lo.v > hi.v) {
    if (which === "lo") lo = { ...lo, v: hi.v };
    else hi = { ...hi, v: lo.v };
  }
  return { ...g, lo, hi };
}

/** A guess moved by an amount, for a number at or below nothing, which a factor cannot move. */
export function shift(g: Guess, which: "lo" | "hi" | "both", d: number): Guess {
  const by = (e: End): End => ({ ...e, v: e.v + d });
  if (g.kind === "point") return { ...g, at: by(g.at) };
  if (g.kind !== "range") return g;
  let lo = which !== "hi" ? by(g.lo) : g.lo;
  let hi = which !== "lo" ? by(g.hi) : g.hi;
  if (lo.v > hi.v) {
    if (which === "lo") lo = { ...lo, v: hi.v };
    else hi = { ...hi, v: lo.v };
  }
  return { ...g, lo, hi };
}

/* ── the spread ───────────────────────────────────────────────────────── */

export type Dist =
  | { kind: "point"; v: number }
  | { kind: "log"; mu: number; sigma: number }
  | { kind: "logit"; mu: number; sigma: number }
  | {
      kind: "normal";
      mu: number;
      sigma: number;
      floor: number | null;
      ceil: number | null;
    };

/** How far the edge of the middle nine in ten sits from the middle, in standard deviations. */
export const Z90 = 1.6448536269514722;
const logit = (p: number) => Math.log(p / (1 - p));
const logistic = (x: number) => 1 / (1 + Math.exp(-x));

/**
 * The range as a spread whose middle nine in ten are its ends: by ratio when
 * both ends are above nothing (20 to 50 is as far from 32 up as down), by odds
 * when both are shares strictly between nothing and all, evenly otherwise —
 * held at nothing when the range was written from nothing up, and at all for a
 * share.
 */
export function distOf(g: Guess): Dist | null {
  if (g.kind === "point") return { kind: "point", v: g.at.v };
  if (g.kind !== "range") return null;
  const lo = g.lo.v;
  const hi = g.hi.v;
  if (g.share && lo > 0 && hi < 1) {
    const a = logit(lo);
    const b = logit(hi);
    return { kind: "logit", mu: (a + b) / 2, sigma: (b - a) / (2 * Z90) };
  }
  if (lo > 0 && !g.share) {
    const a = Math.log(lo);
    const b = Math.log(hi);
    return { kind: "log", mu: (a + b) / 2, sigma: (b - a) / (2 * Z90) };
  }
  return {
    kind: "normal",
    mu: (lo + hi) / 2,
    sigma: (hi - lo) / (2 * Z90),
    floor: lo >= 0 ? 0 : null,
    ceil: g.share ? 1 : null,
  };
}

/** The value a spread takes at z standard deviations: its middle at 0, the ends of its range at ±Z90. */
export function at(d: Dist, z: number): number {
  switch (d.kind) {
    case "point":
      return d.v;
    case "log":
      return Math.exp(d.mu + d.sigma * z);
    case "logit":
      return logistic(d.mu + d.sigma * z);
    case "normal": {
      let v = d.mu + d.sigma * z;
      if (d.floor !== null && v < d.floor) v = d.floor;
      if (d.ceil !== null && v > d.ceil) v = d.ceil;
      return v;
    }
  }
}

/** Acklam's rational approximation to the inverse of the normal curve's area, good to about 1e-9. */
export function invNorm(p: number): number {
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];
  const lo = 0.02425;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= 1 - lo) {
    const q = p - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
        q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

const zs = new Map<string, Float64Array>();

/**
 * The standard draws for one place on the envelope: one in each of n equal
 * slices of the curve, in an order shuffled by the place's own seed — so a
 * line's draws cover its range evenly, and two lines' draws are shuffled
 * against each other. The same place always gets the same draws.
 */
export function zOf(place: string, n = DRAWS): Float64Array {
  const k = `${place}#${n}`;
  const had = zs.get(k);
  if (had) return had;
  const r = rand(seedOf(`botec ${place}`));
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const z = new Float64Array(n);
  for (let i = 0; i < n; i++)
    z[i] = invNorm((order[i] + 0.001 + 0.998 * r()) / n);
  if (zs.size > 400) zs.clear();
  zs.set(k, z);
  return z;
}

function drawsOf(d: Dist, z: Float64Array): Float64Array {
  const out = new Float64Array(z.length);
  if (d.kind === "point") out.fill(d.v);
  else for (let i = 0; i < z.length; i++) out[i] = at(d, z[i]);
  return out;
}

function apply(acc: Float64Array, own: Float64Array, op: Op): Float64Array {
  const n = acc.length;
  const out = new Float64Array(n);
  if (op === "×") for (let i = 0; i < n; i++) out[i] = acc[i] * own[i];
  else if (op === "÷") for (let i = 0; i < n; i++) out[i] = acc[i] / own[i];
  else if (op === "+") for (let i = 0; i < n; i++) out[i] = acc[i] + own[i];
  else for (let i = 0; i < n; i++) out[i] = acc[i] - own[i];
  return out;
}

const applyOne = (acc: number, own: number, op: Op): number =>
  op === "×"
    ? acc * own
    : op === "÷"
      ? acc / own
      : op === "+"
        ? acc + own
        : acc - own;

/* ── working it out ───────────────────────────────────────────────────── */

export type Row = {
  key: string;
  /** Where the line sits — `2`, `4.1` — which seeds its draws. */
  path: string;
  depth: number;
  /** The first line of its chain; its sign is not applied. */
  first: boolean;
  guess: Guess;
  /** What the line is, draw by draw: its guess, or what its own lines come to. */
  own: Float64Array | null;
  /** Where its chain stands after it. */
  run: Float64Array | null;
};

export type Worked = {
  /** Every line in reading order, a line before its own lines. */
  rows: Row[];
  /** The answer, draw by draw. */
  out: Float64Array | null;
  /** Lines with no number yet. */
  empty: number;
  /** Numbers that read as no number, as written. */
  bad: string[];
  /** Draws that divided by nothing. */
  lost: number;
};

/**
 * The envelope worked out: each chain taken down the page, a broken-down line
 * worked out before it is applied, and every line's draws and where its chain
 * stood after it kept for the drawing. A line with no number yet leaves the
 * chain where it was.
 */
export function work(lines: Line[], n = DRAWS): Worked {
  const rows: Row[] = [];
  let empty = 0;
  const bad: string[] = [];
  const chain = (
    ls: Line[],
    prefix: string,
    depth: number,
  ): Float64Array | null => {
    let acc: Float64Array | null = null;
    ls.forEach((l, i) => {
      const path = prefix ? `${prefix}.${i}` : String(i);
      const row: Row = {
        key: l.key,
        path,
        depth,
        first: i === 0,
        guess: { kind: "empty" },
        own: null,
        run: null,
      };
      rows.push(row);
      let own: Float64Array | null = null;
      if (l.lines.length) {
        row.guess = { kind: "down" };
        own = chain(l.lines, path, depth + 1);
      } else {
        const g = readGuess(l.value);
        row.guess = g;
        const d = distOf(g);
        if (d) own = drawsOf(d, zOf(path, n));
        else if (g.kind === "bad") bad.push(l.value.trim());
        else empty++;
      }
      row.own = own;
      if (own) acc = acc === null ? own : apply(acc, own, l.op);
      row.run = acc;
    });
    return acc;
  };
  const out = chain(lines, "", 0);
  let lost = 0;
  if (out) for (const v of out) if (!Number.isFinite(v)) lost++;
  return { rows, out, empty, bad, lost };
}

export type Summary = {
  /** The bottom and top of where nine in ten of the draws fall, and the middle. */
  lo: number;
  mid: number;
  hi: number;
  mean: number;
  /** Draws that came to a number. */
  n: number;
  /** A hundred dots, one for each hundredth of the draws, at its middle. */
  dots: number[];
};

export function summarise(
  xs: Float64Array | null,
  dots = DOTS,
): Summary | null {
  if (!xs) return null;
  let n = 0;
  for (const v of xs) if (Number.isFinite(v)) n++;
  if (!n) return null;
  const f = new Float64Array(n);
  let j = 0;
  let sum = 0;
  for (const v of xs)
    if (Number.isFinite(v)) {
      f[j++] = v;
      sum += v;
    }
  f.sort();
  const q = (p: number) => {
    const i = p * (n - 1);
    const a = Math.floor(i);
    const b = Math.min(n - 1, a + 1);
    return f[a] + (f[b] - f[a]) * (i - a);
  };
  return {
    lo: q(0.05),
    mid: q(0.5),
    hi: q(0.95),
    mean: sum / n,
    n,
    dots: Array.from({ length: dots }, (_, k) => q((k + 0.5) / dots)),
  };
}

/** The share of the draws above a value, and below one. */
export function above(xs: Float64Array, v: number): number {
  let k = 0;
  let n = 0;
  for (const x of xs)
    if (Number.isFinite(x)) {
      n++;
      if (x > v) k++;
    }
  return n ? k / n : 0;
}
export function below(xs: Float64Array, v: number): number {
  let k = 0;
  let n = 0;
  for (const x of xs)
    if (Number.isFinite(x)) {
      n++;
      if (x < v) k++;
    }
  return n ? k / n : 0;
}

/* ── what it leans on ─────────────────────────────────────────────────── */

export type Swing = {
  key: string;
  path: string;
  label: string;
  /** The range as the reader wrote it. */
  written: string;
  /** The answer with this guess at the bottom and at the top of its range and every other at its middle. */
  lo: number;
  hi: number;
};

/** The envelope with every guess at its middle, except where `fix` says otherwise. */
function workAt(
  lines: Line[],
  fix: (path: string, d: Dist) => number,
  prefix = "",
): number | null {
  let acc: number | null = null;
  lines.forEach((l, i) => {
    const path = prefix ? `${prefix}.${i}` : String(i);
    let own: number | null = null;
    if (l.lines.length) own = workAt(l.lines, fix, path);
    else {
      const d = distOf(readGuess(l.value));
      if (d) own = fix(path, d);
    }
    if (own !== null) acc = acc === null ? own : applyOne(acc, own, l.op);
  });
  return acc;
}

/**
 * Each range taken from its bottom to its top with every other guess held at
 * its middle, and how far the answer runs across it: widest first. The answer's
 * width is measured against the answer with everything at its middle.
 */
export function swingOf(lines: Line[]): {
  base: number | null;
  swings: Swing[];
} {
  const base = workAt(lines, (_, d) => at(d, 0));
  const swings: Swing[] = [];
  for (const f of flatten(lines)) {
    if (f.line.lines.length) continue;
    const d = distOf(readGuess(f.line.value));
    if (!d || d.kind === "point") continue;
    const a = workAt(lines, (p, dd) => at(dd, p === f.path ? -Z90 : 0));
    const b = workAt(lines, (p, dd) => at(dd, p === f.path ? Z90 : 0));
    if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b))
      continue;
    swings.push({
      key: f.line.key,
      path: f.path,
      label: f.line.label.trim() || "a line with no name",
      written: f.line.value.trim(),
      lo: Math.min(a, b),
      hi: Math.max(a, b),
    });
  }
  const scale = Math.abs(base ?? 1) || 1;
  swings.sort((a, b) => (b.hi - b.lo) / scale - (a.hi - a.lo) / scale);
  return { base, swings };
}

/* ── the drawing ──────────────────────────────────────────────────────── */

export type Axis = { log: boolean; lo: number; hi: number; ticks: number[] };

function logTicks(a: number, b: number): number[] {
  const span = b - a;
  const pick = (muls: number[], every = 1) => {
    const out: number[] = [];
    for (let e = Math.floor(a); e <= Math.ceil(b); e++) {
      if (e % every !== 0) continue;
      for (const m of muls) {
        const t = m * 10 ** e;
        const l = Math.log10(t);
        if (l >= a - 1e-9 && l <= b + 1e-9) out.push(Number(t.toPrecision(6)));
      }
    }
    return out;
  };
  if (span > 8) return pick([1], 2);
  // Up to two decades wide, the 2s and 5s between; up to four, the 3s; wider, the powers alone.
  let out = pick(span <= 2.3 ? [1, 2, 5] : span <= 4 ? [1, 3] : [1]);
  if (out.length < 2) out = pick([1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9]);
  return out;
}

function linTicks(lo: number, hi: number): number[] {
  const raw = (hi - lo) / 5;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? 10 * p;
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step)
    out.push(Number(t.toPrecision(6)));
  return out;
}

/**
 * The scale everything on the envelope is drawn against: by ratio when every
 * value is above nothing — each power of ten the same width, so a line that
 * multiplies moves the same distance wherever it lands — evenly otherwise.
 */
export function axisOf(values: number[]): Axis | null {
  const v = values.filter(Number.isFinite);
  if (!v.length) return null;
  let lo = Math.min(...v);
  let hi = Math.max(...v);
  if (lo > 0) {
    let a = Math.log10(lo);
    let b = Math.log10(hi);
    if (b - a < 0.3) {
      const m = (a + b) / 2;
      a = m - 0.15;
      b = m + 0.15;
    }
    const pad = (b - a) * 0.06;
    a -= pad;
    b += pad;
    return { log: true, lo: 10 ** a, hi: 10 ** b, ticks: logTicks(a, b) };
  }
  if (lo === hi) {
    const w = Math.abs(lo) * 0.5 || 1;
    lo -= w;
    hi += w;
  }
  const pad = (hi - lo) * 0.06;
  lo -= pad;
  hi += pad;
  return { log: false, lo, hi, ticks: linTicks(lo, hi) };
}

/** Where a value sits along an axis, 0 at its left and 1 at its right. */
export function place(ax: Axis, v: number): number {
  if (ax.log) {
    if (!(v > 0)) return -0.04;
    const a = Math.log10(ax.lo);
    return (Math.log10(v) - a) / (Math.log10(ax.hi) - a);
  }
  return (v - ax.lo) / (ax.hi - ax.lo);
}

/** The value at a place along an axis. */
export function unplace(ax: Axis, t: number): number {
  if (ax.log) {
    const a = Math.log10(ax.lo);
    return 10 ** (a + t * (Math.log10(ax.hi) - a));
  }
  return ax.lo + t * (ax.hi - ax.lo);
}

/**
 * Dots stacked where they fall: in order along the line, a dot joins the
 * stack begun by the dot less than one width to its left, stacks sit at least
 * a width apart, and each stack stands at the middle of what it holds.
 */
export function stackDots(xs: number[], d: number): { x: number; k: number }[] {
  const out: { x: number; k: number }[] = [];
  let prev = -Infinity;
  let i = 0;
  while (i < xs.length) {
    let j = i;
    while (j + 1 < xs.length && xs[j + 1] - xs[i] < d) j++;
    const x = Math.max((xs[i] + xs[j]) / 2, prev + d);
    for (let k = i; k <= j; k++) out.push({ x, k: k - i });
    prev = x;
    i = j + 1;
  }
  return out;
}

/* ── the lines as a tree ─────────────────────────────────────────────── */

export type Flat = {
  line: Line;
  path: string;
  depth: number;
  index: number;
  /** The key of the line it breaks down, or null at the top. */
  parent: string | null;
};

export function flatten(
  lines: Line[],
  prefix = "",
  depth = 0,
  parent: string | null = null,
): Flat[] {
  return lines.flatMap((line, index) => {
    const path = prefix ? `${prefix}.${index}` : String(index);
    return [
      { line, path, depth, index, parent },
      ...flatten(line.lines, path, depth + 1, line.key),
    ];
  });
}

export const findLine = (lines: Line[], key: string): Line | null =>
  flatten(lines).find((f) => f.line.key === key)?.line ?? null;

const mapTree = (lines: Line[], f: (ls: Line[]) => Line[]): Line[] =>
  f(lines).map((l) =>
    l.lines.length ? { ...l, lines: mapTree(l.lines, f) } : l,
  );

export const patchLine = (
  lines: Line[],
  key: string,
  p: Partial<Line>,
): Line[] =>
  mapTree(lines, (ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));

/** A line put in after another, beside it. */
export const insertAfter = (lines: Line[], key: string, line: Line): Line[] =>
  mapTree(lines, (ls) => {
    const i = ls.findIndex((l) => l.key === key);
    return i < 0 ? ls : [...ls.slice(0, i + 1), line, ...ls.slice(i + 1)];
  });

/** A line taken off with its own lines. A line left with none of its own is a guess again. */
export const removeLine = (lines: Line[], key: string): Line[] =>
  mapTree(lines, (ls) =>
    ls
      .filter((l) => l.key !== key)
      .map((l) =>
        l.lines.some((c) => c.key === key) && l.lines.length === 1
          ? { ...l, value: "", lines: [] }
          : l,
      ),
  );

/** A line broken down: its number becomes `=` and it gets a first line of its own. */
export const breakDown = (lines: Line[], key: string, first: Line): Line[] =>
  patchLine(lines, key, { value: "=", lines: [first] });

/** A line taken out of the line it breaks down and set after it. */
export function outdent(lines: Line[], key: string): Line[] {
  const f = flatten(lines).find((x) => x.line.key === key);
  if (!f || !f.parent) return lines;
  const parent = findLine(lines, f.parent)!;
  const rest = parent.lines.filter((l) => l.key !== key);
  const moved = patchLine(lines, parent.key, {
    lines: rest,
    value: rest.length ? parent.value : "",
  });
  return insertAfter(moved, parent.key, f.line);
}

/* ── readings ─────────────────────────────────────────────────────────── */

const n = (k: number, one: string, many = `${one}s`) =>
  `${k.toLocaleString("en")} ${k === 1 ? one : many}`;
const quote = (s: string) =>
  `‘${s.length > 60 ? `${s.slice(0, 59).replace(/\s+\S*$/, "")}…` : s}’`;
const times = (r: number) =>
  r < 10 ? `${sig(r, 2)} times` : `${fmt(r)} times`;

/** Where what it came to fell among the draws. */
function cameWords(
  came: number,
  xs: Float64Array,
  s: Summary,
  u: string,
): string {
  const k = Math.round(below(xs, came) * 100);
  const where =
    came < s.lo
      ? `below ${100 - k} in 100 of the draws`
      : came > s.hi
        ? `above ${k} in 100 of the draws`
        : `inside where nine in ten of the draws fell; ${k} in 100 came in under it`;
  return `it came to ${fmt(came)}${u}: ${where}`;
}

/**
 * What the envelope comes to, in sentences: the middle and where nine in ten
 * fall, how far the top is from the bottom, the average when the long end pulls
 * it off the middle, what it leans on most, how many draws land above the
 * reader's line, what is not yet a number, and afterwards where what it came to
 * fell. Never what it means or what to do.
 */
export function readings(
  b: Botec,
  w: Worked,
  s: Summary | null,
  swing: { swings: Swing[] },
): string[] {
  const out: string[] = [];
  const u = b.unit.trim() ? ` ${b.unit.trim()}` : "";
  if (!s)
    out.push(
      w.rows.length
        ? "no line has a number yet"
        : "nothing on the envelope yet",
    );
  else if (s.lo === s.hi)
    out.push(
      `every line is one number, so it comes to ${fmt(s.mid)}${u} exactly; a range on a line would show how far it could run`,
    );
  else {
    out.push(
      `the middle of ${DRAWS.toLocaleString("en")} draws is ${fmt(s.mid)}${u}; nine in ten fall between ${fmt(s.lo)} and ${fmt(s.hi)}`,
    );
    if (s.lo > 0)
      out.push(`the top of that is ${times(s.hi / s.lo)} the bottom`);
    if (Math.abs(s.mean - s.mid) > 0.1 * Math.max(Math.abs(s.mid), 1e-12))
      out.push(
        `the draws average ${fmt(s.mean)} — the long ${s.mean > s.mid ? "top" : "bottom"} pulls the average ${s.mean > s.mid ? "above" : "below"} the middle`,
      );
  }
  const [first, second] = swing.swings;
  if (s && s.lo !== s.hi && first) {
    out.push(
      `it leans most on ${quote(first.label)}: across your range for it, ${first.written}, the answer runs from ${fmt(first.lo)} to ${fmt(first.hi)} with every other line at its middle`,
    );
    if (second)
      out.push(
        `then on ${quote(second.label)}, from ${fmt(second.lo)} to ${fmt(second.hi)}`,
      );
  }
  if (s && w.out && b.line !== null)
    out.push(
      `${Math.round(above(w.out, b.line) * 100)} in 100 draws land above your line at ${fmt(b.line)}${b.lineName.trim() ? ` — ${b.lineName.trim()}` : ""}`,
    );
  if (w.empty)
    out.push(`${n(w.empty, "line has", "lines have")} no number yet`);
  if (w.bad.length)
    out.push(
      `${w.bad.map(quote).join(", ")} ${w.bad.length === 1 ? "reads" : "read"} as no number`,
    );
  if (w.lost)
    out.push(
      `${n(w.lost, "draw")} divided by nothing and ${w.lost === 1 ? "was" : "were"} left out`,
    );
  if (s && w.out && b.came !== null) out.push(cameWords(b.came, w.out, s, u));
  return out;
}

/* ── the record ───────────────────────────────────────────────────────── */

export type Tally = {
  kept: number;
  week: number;
  /** Looked up afterwards, and where what it came to fell against the middle nine in ten. */
  looked: number;
  under: number;
  inside: number;
  over: number;
  /** Where they were made, most first. */
  views: [string, number][];
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const utc = (d: string) =>
  Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
export const viewWords = (view: string): string =>
  view.replace(/^\//, "").split(/[/?]/)[0] || "garden";

export function tally(all: Botec[], today: string): Tally {
  const t: Tally = {
    kept: all.length,
    week: 0,
    looked: 0,
    under: 0,
    inside: 0,
    over: 0,
    views: [],
  };
  const views = new Map<string, number>();
  for (const b of all) {
    if (
      DAY.test(b.put) &&
      DAY.test(today) &&
      utc(today) - utc(b.put) < 7 * 86_400_000
    )
      t.week++;
    if (b.view)
      views.set(viewWords(b.view), (views.get(viewWords(b.view)) ?? 0) + 1);
    if (b.came === null) continue;
    const s = summarise(work(b.lines).out, 0);
    if (!s) continue;
    t.looked++;
    if (b.came < s.lo) t.under++;
    else if (b.came > s.hi) t.over++;
    else t.inside++;
  }
  t.views = [...views].sort((a, b) => b[1] - a[1]);
  return t;
}

export function recordReadings(t: Tally): string[] {
  if (!t.kept) return ["nothing kept yet"];
  const out = [`${n(t.kept, "envelope")} kept, ${t.week} this week`];
  if (t.looked) {
    const bins = (
      [
        ["inside", t.inside],
        ["under", t.under],
        ["over", t.over],
      ] as const
    ).filter(([, k]) => k);
    const said = bins.map(([w, k]) => `${k} ${w}`);
    out.push(
      `${t.looked} looked up afterwards: ${said.length > 1 ? `${said.slice(0, -1).join(", ")} and ${said.at(-1)}` : said[0]} the middle nine in ten of ${t.looked === 1 ? "its" : "their"} draws`,
    );
  }
  const [v0, v1] = t.views;
  if (v0)
    out.push(
      `most made at the ${v0[0]} (${v0[1]})${v1 ? `, then the ${v1[0]} (${v1[1]})` : ""}`,
    );
  return out;
}

/* ── the file ─────────────────────────────────────────────────────────── */

const y = (s: string) => JSON.stringify(s);
const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
const long = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const day = (v: unknown, or: string) =>
  typeof v === "string" && DAY.test(v) ? v : or;
const num = (v: unknown): number | null => {
  const x = typeof v === "string" && v.trim() ? Number(v) : v;
  return typeof x === "number" && Number.isFinite(x) ? x : null;
};
/** A label may not carry the mark that ends it in the file, nor a value any mark at all. */
const labelIn = (v: unknown) => str(v, 120).replace(/\s·\s/g, " - ");
const valueIn = (v: unknown) => str(v, 60).replace(/·/g, "");

function linesText(lines: Line[], depth = 0): string[] {
  return lines.flatMap((l, i) => {
    const head = [i === 0 ? "" : l.op, l.label.trim()]
      .filter(Boolean)
      .join(" ");
    const value = l.lines.length ? "=" : l.value.trim();
    const text = `${"  ".repeat(depth)}- ${head}${value ? `${head ? " " : ""}· ${value}` : ""}`;
    return [text.trimEnd(), ...linesText(l.lines, depth + 1)];
  });
}

export function serialiseBotec(b: Botec): string {
  const fm = [`put: ${y(b.put)}`, `touched: ${y(b.touched)}`];
  if (b.unit) fm.push(`unit: ${y(b.unit)}`);
  if (b.line !== null) fm.push(`line: ${b.line}`);
  if (b.lineName) fm.push(`line_name: ${y(b.lineName)}`);
  if (b.came !== null) fm.push(`came: ${b.came}`);
  if (b.cameOn) fm.push(`came_on: ${y(b.cameOn)}`);
  if (b.view) fm.push(`view: ${y(b.view)}`);
  if (b.url) fm.push(`url: ${y(b.url)}`);
  if (b.about)
    fm.push(
      "about:",
      `  kind: ${y(b.about.kind)}`,
      `  id: ${y(b.about.id)}`,
      `  label: ${y(b.about.label)}`,
    );
  const body: string[] = [];
  if (b.question.trim()) body.push(`## the question\n\n${b.question.trim()}`);
  if (b.lines.length)
    body.push(`## the envelope\n\n${linesText(b.lines).join("\n")}`);
  if (b.after.trim()) body.push(`## afterwards\n\n${b.after.trim()}`);
  return `---\n${fm.join("\n")}\n---\n\n${body.join("\n\n")}\n`;
}

/** The envelope's bullets back into lines: indented bullets are the lines of the bullet above. */
function parseLines(text: string): Line[] {
  const root: Line[] = [];
  const stack: { indent: number; lines: Line[] }[] = [
    { indent: -1, lines: root },
  ];
  let k = 0;
  for (const raw of text.split("\n")) {
    const m = raw.match(/^(\s*)[-*]\s+(.*)$/);
    if (!m) continue;
    const indent = m[1].replace(/\t/g, "  ").length;
    let rest = m[2].trim();
    let op: Op = "×";
    const o = rest.match(/^([×÷+−*/\-–])(?:\s+(.*))?$/);
    if (o) {
      op = opOf(o[1]) ?? "×";
      rest = (o[2] ?? "").trim();
    }
    let label = rest;
    let value = "";
    if (rest.startsWith("· ") || rest === "·") {
      label = "";
      value = rest.slice(1).trim();
    } else {
      const i = rest.lastIndexOf(" · ");
      if (i >= 0) {
        label = rest.slice(0, i).trim();
        value = rest.slice(i + 3).trim();
      }
    }
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent)
      stack.pop();
    const line: Line = { key: `k${++k}`, op, label, value, lines: [] };
    stack[stack.length - 1].lines.push(line);
    stack.push({ indent, lines: line.lines });
  }
  return root;
}

export function parseBotec(slug: string, raw: string): Botec {
  const { data, content } = matter(raw);
  const sections = new Map<string, string>();
  let cur = "";
  for (const line of content.split("\n")) {
    const h = line.match(/^## (.+?)\s*$/);
    if (h) {
      cur = h[1].toLowerCase();
      sections.set(cur, "");
      continue;
    }
    if (cur) sections.set(cur, `${sections.get(cur) ?? ""}${line}\n`);
  }
  const sec = (k: string) => (sections.get(k) ?? "").trim();
  // Hand-edited frontmatter may carry bare dates, which YAML reads as Dates; they are taken back as written.
  const text = (v: unknown) =>
    v instanceof Date ? v.toISOString().slice(0, 10) : v;
  return validateBotec({
    slug,
    put: text(data.put),
    touched: text(data.touched),
    question: sec("the question"),
    unit: data.unit,
    lines: parseLines(sec("the envelope")),
    line: data.line,
    lineName: data.line_name ?? data.lineName,
    came: data.came,
    cameOn: text(data.came_on ?? data.cameOn),
    after: sec("afterwards"),
    view: data.view,
    url: data.url,
    about: data.about,
  });
}

const KEY = /^[a-z0-9]{1,24}$/i;

export function validateBotec(input: unknown): Botec {
  const r = (input ?? {}) as Record<string, unknown>;
  const today = new Date().toISOString().slice(0, 10);
  const put = day(r.put, today);
  let count = 0;
  let k = 0;
  const seen = new Set<string>();
  const linesIn = (v: unknown, depth: number): Line[] =>
    (Array.isArray(v) ? v : [])
      .filter((l) => l && typeof l === "object")
      .flatMap((l: Record<string, unknown>) => {
        if (count >= MAX_LINES) return [];
        count++;
        let key =
          typeof l.key === "string" && KEY.test(l.key) && !seen.has(l.key)
            ? l.key
            : "";
        while (!key || seen.has(key)) key = `k${++k}`;
        seen.add(key);
        const lines = depth + 1 < DEPTH ? linesIn(l.lines, depth + 1) : [];
        const value = valueIn(l.value);
        return [
          {
            key,
            op: opOf(String(l.op ?? "")) ?? "×",
            label: labelIn(l.label),
            value: lines.length ? "=" : value === "=" ? "" : value,
            lines,
          },
        ];
      });
  const lines = linesIn(r.lines, 0);
  const question = str(r.question, 300);
  if (!question && !lines.some((l) => hasContent({ question: "", lines: [l] })))
    throw new Error("put down what you are working out, or a line");
  const a = (r.about ?? null) as Record<string, unknown> | null;
  const about =
    a && typeof a === "object" && str(a.id, 200)
      ? {
          kind: str(a.kind, 40) || "stone",
          id: str(a.id, 200),
          label: str(a.label, 200),
        }
      : null;
  const view =
    typeof r.view === "string" && /^\/[a-z0-9/-]*$/.test(r.view) ? r.view : "";
  const url =
    typeof r.url === "string" && r.url.startsWith("/")
      ? r.url.slice(0, 400)
      : "";
  const came = num(r.came);
  const b: Botec = {
    slug: str(r.slug, 120),
    put,
    touched: day(r.touched, put),
    question,
    unit: str(r.unit, 40),
    lines,
    line: num(r.line),
    lineName: str(r.lineName, 80),
    came,
    cameOn: came === null ? "" : day(r.cameOn, ""),
    after: long(r.after, 2000),
    view,
    url,
    about,
  };
  if (!b.slug) b.slug = slugOf(titleOf(b), b.put);
  return b;
}

export const slugOf = datedSlug;
