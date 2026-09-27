import matter from "gray-matter";
import { lookingAhead, sentencesOf, slugOf as datedSlug } from "./way.ts";

/**
 * The overview: a step the reader keeps putting off, drawn to scale against
 * the life it opens. The reader says how hard the step will be at its worst
 * and for how long, writes the life if it goes as they hope — as it is, in
 * the first person — and marks how the road rises at a week, a month, a
 * year. The drawing starts close, where the discomfort is all there is, and
 * pulls back through the scales of time; the frame stays true to scale at
 * every altitude, so the dip keeps its depth and loses its width, and the
 * life fills the frame. Two roads fork at now: with the step, and without
 * it. The difference between them is what not taking it gives up, in the
 * reader's own words and numbers.
 *
 * The borrowed move is Frank White's overview effect (1987): seen from far
 * enough out, the thing that filled the view becomes a small part of a
 * larger whole. Seeing an act from farther off — why rather than how —
 * strengthens self-control (Fujita, Trope, Liberman & Levin-Sagi 2006), and a
 * future self felt as continuous with the present one makes present costs
 * easier to bear for them (Hershfield 2011). The dip is always drawn beside
 * the life, never the life alone: the picture of the outcome by itself
 * drains the effort it should summon (Kappes & Oettingen 2011). And people
 * forecast bad feelings as stronger and longer than they turn out (Wilson &
 * Gilbert 2005), so a step taken keeps what the reader said before beside
 * what it was after — pairs, never an accuracy.
 *
 * Every number here is the reader's. This file draws, integrates and counts;
 * it never says a step is worth it, or that the reader should take it.
 */

/* ── time, in days ─────────────────────────────────────────────────────── */

export const MINUTE = 1 / 1440;
export const HOUR = 1 / 24;
export const WEEK = 7;
export const YEAR = 365.2425;
export const MONTH = YEAR / 12;

/** How far out the life is set, in years. */
export const HORIZONS = [0.25, 1, 2, 5, 10] as const;

/** The named times the road is marked at, in days. The last mark is always the horizon. */
export const NAMED: { name: string; at: number }[] = [
  { name: "a week", at: WEEK },
  { name: "a month", at: MONTH },
  { name: "three months", at: 3 * MONTH },
  { name: "a year", at: YEAR },
  { name: "two years", at: 2 * YEAR },
  { name: "five years", at: 5 * YEAR },
  { name: "ten years", at: 10 * YEAR },
];
const ALONG = ["a week", "a month", "a year", "five years"];
const DEFAULT_LEVEL: Record<string, number> = {
  "a week": 1,
  "a month": 2,
  "three months": 4,
  "a year": 5,
  "two years": 6,
  "five years": 7,
  "ten years": 8,
};

export const horizonName = (years: number): string =>
  NAMED.find((n) => Math.abs(n.at - years * YEAR) < 1)?.name ??
  `${years} years`;
export const atOf = (name: string): number | null =>
  NAMED.find((n) => n.name === name)?.at ?? null;

/** The marks for a horizon: a week, a month, a year and five years where they fall short of it, then the horizon. */
export function marksFor(horizon: number): string[] {
  const H = horizon * YEAR;
  return [
    ...ALONG.filter((name) => (atOf(name) ?? Infinity) < H - 1),
    horizonName(horizon),
  ];
}

/* ── the step ──────────────────────────────────────────────────────────── */

export type Mark = { when: string; level: number; line: string };
export type NotToday = { on: string; why: string };

export type Step = {
  slug: string;
  /** The step, in a line. */
  step: string;
  /** How hard it will be at its worst, 1–10, said before. */
  hurt: number;
  /** How long it will last, in minutes, said before. */
  lasts: number;
  /** The life if the step is taken and it goes as hoped: as it is, in the first person. */
  life: string;
  /** Who the reader is on that road, in a line. */
  who: string;
  /** How far out the life is set, in years. */
  horizon: number;
  /** How far above now the road with the step is, at each named time. */
  marks: Mark[];
  /** Where the road without it is by the horizon, -10–10; 0 is as it is now. */
  without: number;
  withoutLine: string;
  /** The day it was put down, and the last day it was touched. */
  put: string;
  touched: string;
  /** When the step was taken and when the reader said it was over. */
  took: string | null;
  done: string | null;
  /** How hard it was at its worst, and how long it lasted, said after. */
  felt: number | null;
  feltLasts: number | null;
  after: string;
  /** The days it was let go for, and what stood in the way. */
  notToday: NotToday[];
  stone: string | null;
};

export type Status = "open" | "in-it" | "taken";
export const statusOf = (s: Step): Status =>
  s.done ? "taken" : s.took ? "in-it" : "open";

export const defaultMarks = (horizon: number): Mark[] =>
  marksFor(horizon).map((when) => ({
    when,
    level: DEFAULT_LEVEL[when] ?? 7,
    line: "",
  }));

export const emptyStep = (today: string): Step => ({
  slug: "",
  step: "",
  hurt: 7,
  lasts: 30,
  life: "",
  who: "",
  horizon: 5,
  marks: defaultMarks(5),
  without: 0,
  withoutLine: "",
  put: today,
  touched: today,
  took: null,
  done: null,
  felt: null,
  feltLasts: null,
  after: "",
  notToday: [],
  stone: null,
});

/**
 * The marks carried to another horizon: a named time keeps its level and its
 * line where it is still on the road, and the new horizon takes the old
 * horizon's.
 */
export function remark(marks: Mark[], from: number, to: number): Mark[] {
  const had = new Map(marks.map((m) => [m.when, m]));
  const end = had.get(horizonName(from));
  return marksFor(to).map((when, i, all) => {
    const kept = had.get(when) ?? (i === all.length - 1 ? end : undefined);
    return kept
      ? { ...kept, when }
      : { when, level: DEFAULT_LEVEL[when] ?? 7, line: "" };
  });
}

/* ── the roads ─────────────────────────────────────────────────────────── */

/** Log time, so the road is shaped the same whichever scale it is looked at from. */
const lt = (t: number) => Math.log1p(Math.max(0, t));

/**
 * The shape of the discomfort over its own length: in fast, out slow — at
 * its worst a seventh of the way in, then easing off. A bump that is 1 at
 * its worst and 0 at both ends.
 */
const A = 0.35;
const B = 2.1;
/** How far into the dip its worst comes: a seventh of the way. */
export const WORST = A / (A + B);
const PEAK = Math.pow(WORST, A) * Math.pow(1 - WORST, B);
export function dipShape(u: number): number {
  if (u <= 0 || u >= 1) return 0;
  return (Math.pow(u, A) * Math.pow(1 - u, B)) / PEAK;
}
/** The area under the shape, so a dip's area is this × how hard × how long. */
export const DIP_AREA = (() => {
  const n = 2000;
  let s = 0;
  for (let i = 1; i < n; i++) s += dipShape(i / n) * (i % 2 ? 4 : 2);
  return s / (3 * n);
})();

/** Below now while it hurts: `hurt` deep at its worst, over `lasts` minutes. */
export const dipAt = (t: number, hurt: number, lasts: number): number => {
  const k = dipShape(t / (lasts * MINUTE));
  return k === 0 ? 0 : -hurt * k;
};

/** Monotone cubic through the points (Fritsch–Carlson): it passes through each and never overshoots between. */
function monotone(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length;
  if (n === 1) return () => ys[0];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++)
    d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m: number[] = [d[0]];
  for (let i = 1; i < n - 1; i++)
    m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const h = a * a + b * b;
    if (h > 9) {
      const k = 3 / Math.sqrt(h);
      m[i] = k * a * d[i];
      m[i + 1] = k * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h * m[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h * m[i + 1]
    );
  };
}

export type Roads = {
  /** The road with the step: the rise, with the dip taken out of it. */
  with: (t: number) => number;
  /** The road without it. */
  without: (t: number) => number;
  dip: (t: number) => number;
  rise: (t: number) => number;
  /** The horizon and the dip's length, in days. */
  H: number;
  L: number;
};

type Shape = Pick<Step, "hurt" | "lasts" | "marks" | "without" | "horizon">;

/**
 * The two roads from now, as the reader marked them. `t` is days from the
 * moment the step is taken; before it both roads are the one road, at now.
 * The rise passes through every mark (log time, monotone between); the road
 * without it eases from now to where the reader put it by the horizon.
 */
export function roadsOf(s: Shape): Roads {
  const H = s.horizon * YEAR;
  const L = s.lasts * MINUTE;
  const pts = s.marks
    .map((m) => ({ x: lt(atOf(m.when) ?? H), y: m.level }))
    .sort((a, b) => a.x - b.x)
    .filter((p, i, all) => i === 0 || p.x > all[i - 1].x);
  const f = monotone([0, ...pts.map((p) => p.x)], [0, ...pts.map((p) => p.y)]);
  const rise = (t: number) => (t <= 0 ? 0 : f(lt(t)));
  const dip = (t: number) => dipAt(t, s.hurt, s.lasts);
  const end = lt(H);
  const without = (t: number) => {
    if (t <= 0 || !s.without) return 0;
    const u = Math.min(1, lt(t) / end);
    return s.without * u * u * (3 - 2 * u);
  };
  return { with: (t) => rise(t) + dip(t), without, dip, rise, H, L };
}

/**
 * Where to look along the road: dense through the dip, then evenly in log
 * time out to the horizon, so a sum over them sees the minutes and the
 * years alike.
 */
export function grid(L: number, H: number, n = 1200): number[] {
  const out: number[] = [];
  const dipN = 240;
  for (let i = 0; i <= dipN; i++) out.push((L * i) / dipN);
  const a = Math.log(L);
  const b = Math.log(Math.max(H, L * 1.01));
  for (let i = 1; i <= n; i++) out.push(Math.exp(a + ((b - a) * i) / n));
  return out;
}

export type Weighed = {
  /** The area below the road without it, by the road with the step: mostly the dip. */
  cost: number;
  /** The area above it: what the road with the step has that the other does not. */
  gain: number;
  /** gain ÷ cost, or null when nothing costs. */
  times: number | null;
};

/** The two areas between the roads, in the reader's units (their levels × days), out to the horizon. */
export function weigh(s: Shape): Weighed {
  const r = roadsOf(s);
  const ts = grid(r.L, r.H);
  let cost = 0;
  let gain = 0;
  for (let i = 1; i < ts.length; i++) {
    const a = ts[i - 1];
    const b = ts[i];
    const ga = r.with(a) - r.without(a);
    const gb = r.with(b) - r.without(b);
    const area = ((ga + gb) / 2) * (b - a);
    if (area < 0) cost -= area;
    else gain += area;
  }
  return { cost, gain, times: cost > 0 ? gain / cost : null };
}

/* ── the altitude ──────────────────────────────────────────────────────── */

/** The frame up close shows two and a half times the dip; far out, the horizon. */
export const closeSpan = (lasts: number): number =>
  Math.max(10 * MINUTE, lasts * MINUTE * 2.5);
export const farSpan = (horizon: number, lasts: number): number =>
  Math.max(horizon * YEAR, closeSpan(lasts) * 1.5);

const clamp01 = (z: number) => Math.min(1, Math.max(0, z));

/** How much time is in the frame at an altitude: 0 is close, 1 is far, and each step up multiplies. */
export const spanAt = (z: number, close: number, far: number): number =>
  Math.exp(Math.log(close) + clamp01(z) * (Math.log(far) - Math.log(close)));
export const altitudeOf = (span: number, close: number, far: number): number =>
  clamp01(Math.log(span / close) / Math.log(far / close));

/** How much of the frame lies before now. */
export const LEAD = 0.07;
export const frameAt = (span: number): [number, number] => [-LEAD * span, span];

/* ── words ─────────────────────────────────────────────────────────────── */

const SMALL = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];
const count = (k: number, one: string, many = `${one}s`) =>
  k === 1
    ? `${/^[aeiouh]/.test(one) && one !== "year" ? "an" : "a"} ${one}`
    : `${k <= 12 ? SMALL[k] : k.toLocaleString("en")} ${many}`;

/** A length of time as it would be said, rounded for a caption: 40 minutes · an hour and a half · three days · five years. */
export function spanWords(days: number): string {
  const m = days / MINUTE;
  if (m < 89.5) {
    const k = Math.max(1, m < 20 ? Math.round(m) : Math.round(m / 5) * 5);
    return minutesWords(k);
  }
  const h = days / HOUR;
  if (h < 1.75) return "an hour and a half";
  if (h < 22.5) return count(Math.round(h), "hour");
  if (days < 10.5) return count(Math.max(1, Math.round(days)), "day");
  const w = days / WEEK;
  if (w < 7.5) return count(Math.round(w), "week");
  const mo = days / MONTH;
  if (mo < 11.5) return count(Math.round(mo), "month");
  const y = days / YEAR;
  if (y > 1.35 && y < 1.65) return "a year and a half";
  return count(Math.round(y), "year");
}

const minutesWords = (k: number): string =>
  k === 60 ? "an hour" : k === 1 ? "a minute" : `${k <= 12 ? SMALL[k] : k} minutes`;

/** The frame's span as a caption says it: the next 75 minutes · the next hour · the next year and a half. */
export const nextWords = (days: number): string =>
  `the next ${spanWords(days).replace(/^an? /, "")}`;

/** The dip's length as the reader said it: 26 minutes exactly, then rounded as a caption would be — two hours. */
export const lastsWords = (lasts: number): string => {
  const m = Math.max(1, Math.round(lasts));
  return m < 90 ? minutesWords(m) : spanWords(m * MINUTE);
};

/** "the 40 minutes are" · "the hour is": the dip named as a thing in the frame. */
export function theDip(lasts: number): string {
  const w = lastsWords(lasts);
  const single = w.match(/^an? (.+)$/);
  if (single) return `the ${single[1]} is`;
  return `the ${w} are`;
}

const sig3 = (n: number): number => {
  if (n <= 0) return 0;
  const p = Math.pow(10, Math.floor(Math.log10(n)) - 2);
  return Math.round(n / p) * p;
};
export const big = (n: number): string =>
  n >= 1000 ? sig3(n).toLocaleString("en") : String(Math.round(n));

/** How much of a whole a part is: 40% · 2.8% · 1 part in 65,700. */
export function shareWords(part: number, whole: number): string {
  const s = whole > 0 ? part / whole : 0;
  if (s <= 0) return "none";
  if (s >= 0.995) return "all";
  if (s >= 0.1) return `${Math.round(s * 100)}%`;
  if (s >= 0.01) return `${(s * 100).toFixed(1).replace(/\.0$/, "")}%`;
  return `1 part in ${big(1 / s)}`;
}

/** How many times: 57,400 times · 12 times · half. */
export function timesWords(k: number): string {
  if (k >= 1.95) return `${big(k)} times`;
  if (k >= 1.05) return `${k.toFixed(1)} times`;
  if (k >= 0.95) return "as much as";
  return `${shareWords(k, 1)} of`;
}

/* ── the scale along the bottom ────────────────────────────────────────── */

const STEPS: { d: number; say: (k: number) => string }[] = [
  ...[1, 2, 5, 10, 15, 30].map((k) => ({
    d: k * MINUTE,
    say: (n: number) => `${n * k} min`,
  })),
  ...[1, 2, 3, 6, 12].map((k) => ({
    d: k * HOUR,
    say: (n: number) => `${n * k} hour${n * k === 1 ? "" : "s"}`,
  })),
  { d: 1, say: (n) => `${n} day${n === 1 ? "" : "s"}` },
  { d: 2, say: (n) => `${2 * n} days` },
  { d: WEEK, say: (n) => `${n} week${n === 1 ? "" : "s"}` },
  { d: 2 * WEEK, say: (n) => `${2 * n} weeks` },
  { d: MONTH, say: (n) => `${n} month${n === 1 ? "" : "s"}` },
  { d: 2 * MONTH, say: (n) => `${2 * n} months` },
  { d: 3 * MONTH, say: (n) => `${3 * n} months` },
  { d: 6 * MONTH, say: (n) => `${6 * n} months` },
  { d: YEAR, say: (n) => `${n} year${n === 1 ? "" : "s"}` },
  { d: 2 * YEAR, say: (n) => `${2 * n} years` },
];

/** The ticks after now across a frame: the finest step that puts no more than six on it. */
export function ticksOf(span: number): { t: number; label: string }[] {
  const step = STEPS.find((s) => span / s.d <= 6) ?? STEPS[STEPS.length - 1];
  const out: { t: number; label: string }[] = [];
  for (let n = 1; n * step.d <= span * 0.999; n++)
    out.push({ t: n * step.d, label: step.say(n) });
  return out;
}

/** The named stops between close and far, for the altitude rail: the dip, then each scale it passes. */
export function stopsOf(
  lasts: number,
  horizon: number,
): { z: number; label: string }[] {
  const close = closeSpan(lasts);
  const far = farSpan(horizon, lasts);
  const out = [{ z: 0, label: "the dip" }];
  for (const [label, d] of [
    ["an hour", HOUR],
    ["a day", 1],
    ["a week", WEEK],
    ["a month", MONTH],
    ["a year", YEAR],
  ] as const) {
    const z = altitudeOf(d, close, far);
    if (z > 0.06 && z < 0.94 && z - out[out.length - 1].z > 0.08)
      out.push({ z, label });
  }
  out.push({ z: 1, label: horizonName(horizon) });
  return out;
}

/* ── the readings ──────────────────────────────────────────────────────── */

const MON = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
export const dayWords = (d: string): string =>
  /^\d{4}-\d{2}-\d{2}/.test(d)
    ? `${+d.slice(8, 10)} ${MON[+d.slice(5, 7) - 1]}`
    : d;
const n = (k: number, one: string, many = `${one}s`) =>
  `${k} ${k === 1 ? one : many}`;
const level = (v: number) =>
  v === 0 ? "at now" : v > 0 ? `${v} above now` : `${-v} below now`;

/** Minutes between two moments, or null. */
export function minutesBetween(
  a: string | null,
  b: string | null,
): number | null {
  if (!a || !b) return null;
  const d = (Date.parse(b) - Date.parse(a)) / 60000;
  return Number.isFinite(d) && d >= 0 ? Math.round(d) : null;
}

/** Facts about one step, from the reader's numbers and words. None of them is a verdict. */
export function readings(s: Step): string[] {
  const out: string[] = [];
  const hz = horizonName(s.horizon);
  out.push(
    `the dip: ${s.hurt} of 10 at its worst, for ${lastsWords(s.lasts)}, as you said before`,
  );
  out.push(
    `${lastsWords(s.lasts)} is ${shareWords(s.lasts * MINUTE, s.horizon * YEAR)} of ${hz}`,
  );
  const byYear = s.marks.find((m) => m.when === "a year");
  const last = s.marks[s.marks.length - 1];
  const road =
    byYear && byYear !== last
      ? `${level(byYear.level)} by a year and ${level(last.level)} by ${hz}`
      : `${level(last.level)} by ${hz}`;
  out.push(
    `as marked, the road with the step is ${road}; the road without it ${
      s.without === 0 ? "stays as it is now" : `is ${level(s.without)} by then`
    }`,
  );
  const w = weigh(s);
  if (w.gain <= 0)
    out.push(
      "as marked, the road with the step is never above the road without it",
    );
  else if (w.times !== null)
    out.push(
      `as marked, what the road with the step has over the other, across ${hz}, is ${timesWords(w.times)} the dip`,
    );
  if (!s.life.trim()) out.push("the life is not written yet");
  else {
    const a = lookingAhead(s.life);
    out.push(
      `the life: ${n(a.of, "sentence")}${
        a.n
          ? `, ${a.n} still look${a.n === 1 ? "s" : ""} ahead — ${a.words.join(", ")}. it is meant to be written as it is`
          : ", each written as it is"
      }`,
    );
  }
  out.push(
    s.who.trim()
      ? `who you are on that road, in your words: ${s.who.trim()}`
      : "who you are on that road is not written yet",
  );
  const put = `put down ${dayWords(s.put)}`;
  out.push(
    s.notToday.length
      ? `${put} · let go for today ${n(s.notToday.length, "time")}: ${s.notToday.map((x) => dayWords(x.on)).join(", ")}`
      : put,
  );
  const st = statusOf(s);
  if (st === "in-it")
    out.push(`in it since ${dayWords(s.took!)} ${s.took!.slice(11, 16)}`);
  if (st === "taken") {
    const felt =
      s.felt === null
        ? "how hard it was is not said yet"
        : `${s.felt} of 10${s.feltLasts !== null ? ` for ${lastsWords(s.feltLasts)}` : ""}`;
    out.push(
      `taken ${dayWords(s.took!)} · before, you said ${s.hurt} of 10 for ${lastsWords(s.lasts)}; after, ${felt}`,
    );
  }
  return out;
}

export type Tally = {
  n: number;
  open: number;
  inIt: number;
  taken: number;
  letGo: number;
  letGoSteps: number;
  /** Before and after, for every step taken whose after was said. */
  pairs: {
    hurt: number;
    felt: number;
    lasts: number;
    feltLasts: number | null;
  }[];
};

export function tally(steps: Step[]): Tally {
  const pairs = steps
    .filter((s) => statusOf(s) === "taken" && s.felt !== null)
    .map((s) => ({
      hurt: s.hurt,
      felt: s.felt as number,
      lasts: s.lasts,
      feltLasts: s.feltLasts,
    }));
  return {
    n: steps.length,
    open: steps.filter((s) => statusOf(s) === "open").length,
    inIt: steps.filter((s) => statusOf(s) === "in-it").length,
    taken: steps.filter((s) => statusOf(s) === "taken").length,
    letGo: steps.reduce((k, s) => k + s.notToday.length, 0),
    letGoSteps: steps.filter((s) => s.notToday.length).length,
    pairs,
  };
}

/** How the afters stood against the befores, said as counts: less than said in 2 of 3, as much in 1. */
function against(xs: [number, number][], less: string, more: string): string {
  const lo = xs.filter(([b, a]) => a < b).length;
  const eq = xs.filter(([b, a]) => a === b).length;
  const hi = xs.filter(([b, a]) => a > b).length;
  const parts: string[] = [];
  if (lo) parts.push(`${less} in ${lo} of ${xs.length}`);
  if (eq) parts.push(`as said in ${eq}`);
  if (hi) parts.push(`${more} in ${hi}`);
  return parts.join(", ");
}

/** Facts about the whole record. Before and after are set side by side and counted; never an accuracy. */
export function wholeReadings(t: Tally): string[] {
  if (!t.n) return ["no steps put down yet"];
  const out = [
    `${n(t.n, "step")} put down · ${t.taken} taken · ${t.inIt} in it · ${t.open} open`,
  ];
  if (t.letGo)
    out.push(
      `let go for today ${n(t.letGo, "time")}, across ${n(t.letGoSteps, "step")}`,
    );
  if (t.pairs.length) {
    out.push(
      `at the worst, before and after: ${t.pairs.map((p) => `${p.hurt} → ${p.felt}`).join(", ")} — ${against(
        t.pairs.map((p) => [p.hurt, p.felt]),
        "less than said",
        "more than said",
      )}`,
    );
    const timed = t.pairs.filter((p) => p.feltLasts !== null);
    if (timed.length)
      out.push(
        `for how long, before and after: ${timed
          .map(
            (p) =>
              `${lastsWords(p.lasts)} → ${lastsWords(p.feltLasts as number)}`,
          )
          .join(", ")} — ${against(
          timed.map((p) => [p.lasts, p.feltLasts as number]),
          "shorter than said",
          "longer than said",
        )}`,
      );
  }
  return out;
}

/* ── the file ──────────────────────────────────────────────────────────── */

export const slugOf = datedSlug;

export function titleOf(s: { step: string }): string {
  const first = (sentencesOf(s.step)[0] ?? s.step.trim())
    .replace(/[.!…]+$/, "")
    .trim();
  return first
    ? first.length > 72
      ? `${first.slice(0, 69).trim()}…`
      : first
    : "a step";
}

const y = (v: string | number | null) => JSON.stringify(v);

export function serialiseStep(s: Step): string {
  const lines = [`put: ${y(s.put)}`, `touched: ${y(s.touched)}`];
  if (s.stone) lines.push(`stone: ${y(s.stone)}`);
  lines.push(
    `hurt: ${s.hurt}`,
    `lasts: ${s.lasts}`,
    `horizon: ${s.horizon}`,
    `without: ${s.without}`,
    "marks:",
    ...s.marks.map(
      (m) =>
        `  - { when: ${y(m.when)}, level: ${m.level}, line: ${y(m.line)} }`,
    ),
  );
  if (s.took) lines.push(`took: ${y(s.took)}`);
  if (s.done) lines.push(`done: ${y(s.done)}`);
  if (s.felt !== null) lines.push(`felt: ${s.felt}`);
  if (s.feltLasts !== null) lines.push(`feltLasts: ${s.feltLasts}`);
  const body = [`## the step\n\n${s.step.trim()}`];
  if (s.life.trim()) body.push(`## the life\n\n${s.life.trim()}`);
  if (s.who.trim()) body.push(`## who I am on that road\n\n${s.who.trim()}`);
  if (s.withoutLine.trim())
    body.push(`## without it\n\n${s.withoutLine.trim()}`);
  if (s.notToday.length)
    body.push(
      `## not today\n\n${s.notToday
        .map((x) => `- ${x.on}${x.why.trim() ? `: ${x.why.trim()}` : ""}`)
        .join("\n")}`,
    );
  if (s.after.trim()) body.push(`## afterwards\n\n${s.after.trim()}`);
  return `---\n${lines.join("\n")}\n---\n\n${body.join("\n\n")}\n`;
}

const text = (v: unknown): string => {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  return typeof v === "string"
    ? v.trim()
    : typeof v === "number"
      ? String(v)
      : "";
};

export function parseStep(slug: string, raw: string): Step {
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
  const notToday = sec("not today")
    .split("\n")
    .flatMap((line) => {
      const m = line.match(/^- (\d{4}-\d{2}-\d{2})(?::\s*(.*))?$/);
      return m ? [{ on: m[1], why: (m[2] ?? "").trim() }] : [];
    });
  return validateStep(
    {
      slug,
      step: sec("the step"),
      hurt: data.hurt,
      lasts: data.lasts,
      life: sec("the life"),
      who: sec("who i am on that road"),
      horizon: data.horizon,
      marks: data.marks,
      without: data.without,
      withoutLine: sec("without it"),
      put: text(data.put).slice(0, 10),
      touched: text(data.touched).slice(0, 10),
      took: data.took ? text(data.took) : null,
      done: data.done ? text(data.done) : null,
      felt: data.felt ?? null,
      feltLasts: data.feltLasts ?? null,
      after: sec("afterwards"),
      notToday,
      stone: data.stone ?? null,
    },
    text(data.put).slice(0, 10) || "2026-01-01",
  );
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const AT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?([+-]\d{2}:\d{2}|Z)?$/;
const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
const long = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const num = (v: unknown): number | null => {
  const k =
    typeof v === "number"
      ? v
      : typeof v === "string" && v.trim()
        ? Number(v)
        : NaN;
  return Number.isFinite(k) ? k : null;
};
const within = (v: unknown, lo: number, hi: number, fallback: number) => {
  const k = num(v);
  return k === null ? fallback : Math.min(hi, Math.max(lo, Math.round(k)));
};
/** The longest a dip may be said to last: sixty days, in minutes. */
export const MAX_LASTS = 60 * 1440;

export function validateStep(input: unknown, today: string): Step {
  const r = (input ?? {}) as Record<string, unknown>;
  const step = str(r.step, 300);
  if (!step) throw new Error("a step needs the step, in a line");
  const hz = num(r.horizon);
  const horizon =
    hz === null
      ? 5
      : HORIZONS.reduce((best, h) =>
          Math.abs(h - hz) < Math.abs(best - hz) ? h : best,
        );
  const given = new Map<string, Record<string, unknown>>();
  if (Array.isArray(r.marks))
    for (const m of r.marks)
      if (m && typeof m === "object") {
        const x = m as Record<string, unknown>;
        if (typeof x.when === "string") given.set(x.when, x);
      }
  const marks: Mark[] = marksFor(horizon).map((when) => {
    const x = given.get(when);
    return {
      when,
      level: within(x?.level, 0, 10, DEFAULT_LEVEL[when] ?? 7),
      line: str(x?.line, 200),
    };
  });
  const put = typeof r.put === "string" && DAY.test(r.put) ? r.put : today;
  const at = (v: unknown) => (typeof v === "string" && AT.test(v) ? v : null);
  const took = at(r.took);
  let done = took ? at(r.done) : null;
  if (took && done && Date.parse(done) < Date.parse(took)) done = null;
  const felt = done && num(r.felt) !== null ? within(r.felt, 1, 10, 1) : null;
  const feltLasts =
    done && num(r.feltLasts) !== null
      ? within(r.feltLasts, 1, MAX_LASTS, 1)
      : null;
  const seen = new Set<string>();
  const notToday: NotToday[] = (Array.isArray(r.notToday) ? r.notToday : [])
    .flatMap((x: unknown) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const on = typeof o.on === "string" && DAY.test(o.on) ? o.on : "";
      if (!on || seen.has(on)) return [];
      seen.add(on);
      return [{ on, why: str(o.why, 300) }];
    })
    .sort((a: NotToday, b: NotToday) => (a.on < b.on ? -1 : 1))
    .slice(-400);
  const s: Step = {
    slug: str(r.slug, 120),
    step,
    hurt: within(r.hurt, 1, 10, 7),
    lasts: within(r.lasts, 1, MAX_LASTS, 30),
    life: long(r.life, 4000),
    who: str(r.who, 200),
    horizon,
    marks,
    without: within(r.without, -10, 10, 0),
    withoutLine: str(r.withoutLine, 300),
    put,
    touched:
      typeof r.touched === "string" && DAY.test(r.touched) ? r.touched : put,
    took,
    done,
    felt,
    feltLasts,
    after: long(r.after, 2000),
    notToday,
    stone: str(r.stone, 200) || null,
  };
  if (!s.slug) s.slug = slugOf(step, put);
  return s;
}
