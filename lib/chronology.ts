import matter from "gray-matter";
import type { GardenNode } from "./garden";

/**
 * The chronology: a life as a number line. Everything on it is an entry the
 * reader set down — a day or a stretch, in a lane of their own naming — plus
 * the circumstances they lived under and the stretches the record does not
 * speak for. This file is the pure part: dates with their precision, the
 * two scales an age can be drawn on, the ticks, the packing of stretches
 * into rows, the tally and its readings, the garden's own dated moments, and
 * the file an entry is kept in. Nothing here decides anything.
 */

export type Register = "inner" | "outer";
export type Domain = { id: string; label: string; register: Register };

/** The lanes that are not the reader's own: the world's, and the record's silence. */
export const LAYERS = ["structure", "conjuncture", "happening", "gap"] as const;
export type Layer = (typeof LAYERS)[number];
export const LAYER_LABEL: Record<Layer, string> = {
  structure: "structure",
  conjuncture: "conjuncture",
  happening: "happenings",
  gap: "gap",
};
export const isLayer = (lane: string): lane is Layer =>
  (LAYERS as readonly string[]).includes(lane);

export type Looms = 1 | 2 | 3;
export type Again = "yes" | "no" | "unsure";
export type Why = "no-record" | "refused" | "unexamined";
export const WHYS: Why[] = ["no-record", "refused", "unexamined"];
export const WHY_LABEL: Record<Why, string> = {
  "no-record": "no record",
  refused: "refused",
  unexamined: "unexamined",
};
export type Scale = "clock" | "proportional";

export type Entry = {
  /** The file's name; stable, so a link to it survives a retitling. */
  slug: string;
  title: string;
  /** `2011`, `2011-06` or `2011-06-12` — as precise as the reader knows. */
  day: string;
  /** A stretch ends here; `now` for one that has not ended; null for a day. */
  until: string | null;
  /** A domain of the reader's, or one of the LAYERS. */
  lane: string;
  /** How large it looms, 1 to 3. The reader's number, drawn as size. */
  looms: Looms;
  /** Would you have it again? Asked, never totalled into anything. */
  again: Again | null;
  /** Gaps only: what kind of silence this is. */
  why: Why | null;
  tags: string[];
  /** Garden stones this entry is associated with. */
  stones: string[];
  /** The day the entry was first written down — not the day it happened. */
  recorded: string;
  note: string;
};

export type Life = {
  born: string | null;
  /** How far past today the line runs; null draws two years ahead. */
  horizon: string | null;
  scale: Scale;
  domains: Domain[];
};

export const DEFAULT_DOMAINS: Domain[] = [
  { id: "mind", label: "Mind", register: "inner" },
  { id: "feeling", label: "Feeling", register: "inner" },
  { id: "place", label: "Place", register: "outer" },
  { id: "work", label: "Work", register: "outer" },
  { id: "people", label: "People", register: "outer" },
  { id: "body", label: "Body", register: "outer" },
  { id: "money", label: "Money", register: "outer" },
];

export const DEFAULT_LIFE: Life = {
  born: null,
  horizon: null,
  scale: "clock",
  domains: DEFAULT_DOMAINS,
};

// ── days ──────────────────────────────────────────────────────────────────

export const DAY_RE = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;
export type Precision = "year" | "month" | "day";

const MON = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export const YEAR_MS = 365.2425 * 86_400_000;
const DAY_MS = 86_400_000;

/** A day string the chronology can place: a real year, month and day. */
export function validDay(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const m = DAY_RE.exec(s);
  if (!m) return false;
  const y = +m[1];
  if (y < 1000 || y > 2999) return false;
  if (m[2]) {
    const mo = +m[2];
    if (mo < 1 || mo > 12) return false;
    if (m[3]) {
      const d = +m[3];
      if (d < 1 || d > new Date(Date.UTC(y, mo, 0)).getUTCDate()) return false;
    }
  }
  return true;
}

export function precisionOf(day: string): Precision {
  return day.length >= 10 ? "day" : day.length >= 7 ? "month" : "year";
}

/**
 * Where a day sits in time. A day of coarse precision is a period, and the
 * edge says which end of it is wanted; `mid` is where its mark is drawn.
 */
export function timeOf(day: string, edge: "start" | "mid" | "end" = "mid") {
  const m = DAY_RE.exec(day);
  if (!m) return NaN;
  const y = +m[1];
  let s: number;
  let e: number;
  if (m[3]) {
    s = Date.UTC(y, +m[2] - 1, +m[3]);
    e = s + DAY_MS;
  } else if (m[2]) {
    s = Date.UTC(y, +m[2] - 1, 1);
    e = Date.UTC(y, +m[2], 1);
  } else {
    s = Date.UTC(y, 0, 1);
    e = Date.UTC(y + 1, 0, 1);
  }
  return edge === "start" ? s : edge === "end" ? e : (s + e) / 2;
}

/** A day string at the given precision, from a moment. */
export function dayAt(ms: number, precision: Precision = "day"): string {
  const d = new Date(ms);
  const y = String(d.getUTCFullYear()).padStart(4, "0");
  if (precision === "year") return y;
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  if (precision === "month") return `${y}-${mo}`;
  return `${y}-${mo}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** `c. 2011` · `Jun 2019` · `12 Jun 2019`. The circa is the precision, said. */
export function formatDay(day: string): string {
  const m = DAY_RE.exec(day);
  if (!m) return day;
  if (m[3]) return `${+m[3]} ${MON[+m[2] - 1]} ${m[1]}`;
  if (m[2]) return `${MON[+m[2] - 1]} ${m[1]}`;
  return `c. ${m[1]}`;
}

/** A stretch, said once: `2011–2013` · `Jun 2019 – now` · `12 Jun 2019 – 3 Mar 2020`. */
export function spanWords(from: string, until: string | null): string {
  if (!until) return formatDay(from);
  if (until === "now") return `${formatDay(from)} – now`;
  if (precisionOf(from) === "year" && precisionOf(until) === "year")
    return from === until ? `c. ${from}` : `${from}–${until}`;
  return `${formatDay(from)} – ${formatDay(until)}`;
}

export const startOf = (e: Entry) => timeOf(e.day, "start");
export const midOf = (e: Entry) => timeOf(e.day, "mid");
/** Where an entry ends: a stretch at its `until`, an unended one at the present, a day at the end of its period. */
export function endOf(e: Entry, nowMs: number): number {
  if (e.until === "now") return Math.max(nowMs, startOf(e));
  if (e.until) return timeOf(e.until, "end");
  return timeOf(e.day, "end");
}
export const isSpan = (e: Entry) => e.until !== null;

// ── ages and durations ────────────────────────────────────────────────────

export function ageAt(born: string | null, ms: number): number | null {
  if (!born || !validDay(born)) return null;
  return (ms - timeOf(born, "mid")) / YEAR_MS;
}

export function ageWords(a: number | null): string {
  if (a === null || Number.isNaN(a)) return "";
  if (a < 0) {
    const y = Math.ceil(-a);
    return y === 1
      ? "the year before you were born"
      : `${y} years before you were born`;
  }
  return `age ${Math.floor(a)}`;
}

export function yearsWords(years: number): string {
  const y = Math.max(0, years);
  if (y < 0.075) {
    const d = Math.max(1, Math.round(y * 365.25));
    return d === 1 ? "a day" : `${d} days`;
  }
  if (y < 0.96) {
    const m = Math.max(1, Math.round(y * 12));
    return m === 1 ? "a month" : `${m} months`;
  }
  const whole = Math.floor(y + 0.04);
  const months = Math.round((y - whole) * 12);
  const ys = whole === 1 ? "a year" : `${whole} years`;
  if (months < 1 || months >= 12) return ys;
  return `${ys} and ${months === 1 ? "a month" : `${months} months`}`;
}

// ── the two scales ────────────────────────────────────────────────────────

export type Axis = { born: string | null; scale: Scale };
export type View = { u0: number; u1: number };

/**
 * Time to axis units. Clock gives every year the same width. Proportional
 * gives year n of a life a width proportional to ln(1 + n) — a year at
 * seven is not a year at thirty-seven — and runs linearly before birth, so
 * inherited things have a place. Without a birth day there is only clock.
 */
export function toU(ms: number, axis: Axis): number {
  if (axis.scale === "proportional" && axis.born && validDay(axis.born)) {
    const a = (ms - timeOf(axis.born, "mid")) / YEAR_MS;
    return a >= 0 ? Math.log1p(a) : a;
  }
  return ms / YEAR_MS;
}

export function fromU(u: number, axis: Axis): number {
  if (axis.scale === "proportional" && axis.born && validDay(axis.born)) {
    const a = u >= 0 ? Math.expm1(u) : u;
    return timeOf(axis.born, "mid") + a * YEAR_MS;
  }
  return u * YEAR_MS;
}

export const xOf = (
  ms: number,
  view: View,
  axis: Axis,
  x0: number,
  x1: number,
) => x0 + ((x1 - x0) * (toU(ms, axis) - view.u0)) / (view.u1 - view.u0);

export const msAt = (
  x: number,
  view: View,
  axis: Axis,
  x0: number,
  x1: number,
) => fromU(view.u0 + ((view.u1 - view.u0) * (x - x0)) / (x1 - x0), axis);

/** Zoom about a point on the axis, never past the whole and never tighter than `minSpan`. */
export function zoom(
  view: View,
  at: number,
  factor: number,
  whole: View,
  minSpan: number,
): View {
  const span = Math.min(
    whole.u1 - whole.u0,
    Math.max(minSpan, (view.u1 - view.u0) * factor),
  );
  const t = (at - view.u0) / (view.u1 - view.u0);
  let u0 = at - span * t;
  let u1 = u0 + span;
  if (u0 < whole.u0) {
    u0 = whole.u0;
    u1 = u0 + span;
  }
  if (u1 > whole.u1) {
    u1 = whole.u1;
    u0 = u1 - span;
  }
  return { u0, u1 };
}

export function pan(view: View, du: number, whole: View): View {
  const span = view.u1 - view.u0;
  let u0 = view.u0 + du;
  if (u0 < whole.u0) u0 = whole.u0;
  if (u0 + span > whole.u1) u0 = whole.u1 - span;
  return { u0, u1: u0 + span };
}

/** The whole of the line, in time: birth or the first entry to the horizon, with a little air. */
export function wholeOf(
  entries: Entry[],
  life: Life,
  nowMs: number,
): [number, number] {
  let t0 = Infinity;
  let t1 = -Infinity;
  if (life.born && validDay(life.born)) t0 = timeOf(life.born, "start");
  for (const e of entries) {
    t0 = Math.min(t0, startOf(e));
    t1 = Math.max(t1, endOf(e, nowMs));
  }
  const ahead =
    life.horizon && validDay(life.horizon)
      ? timeOf(life.horizon, "end")
      : nowMs + 2 * YEAR_MS;
  t1 = Math.max(t1, ahead, nowMs);
  if (!Number.isFinite(t0)) t0 = nowMs - 30 * YEAR_MS;
  if (t1 - t0 < 3 * YEAR_MS) t0 = t1 - 3 * YEAR_MS;
  const air = (t1 - t0) * 0.03;
  return [t0 - air, t1 + air];
}

// ── ticks ─────────────────────────────────────────────────────────────────

export type Tick = { ms: number; label: string | null; major: boolean };

/** The ticks a window deserves: decades, then five-years, years, months, days. */
export function ticksFor(t0: number, t1: number): Tick[] {
  const years = (t1 - t0) / YEAR_MS;
  const out: Tick[] = [];
  const d0 = new Date(t0);
  const d1 = new Date(t1);
  if (years > 6) {
    const step = years > 70 ? 10 : years > 22 ? 5 : 1;
    const minor = years > 70 ? 5 : years > 22 ? 1 : 0;
    const from =
      Math.floor(d0.getUTCFullYear() / (minor || step)) * (minor || step);
    for (let y = from; y <= d1.getUTCFullYear() + 1; y += minor || step) {
      const ms = Date.UTC(y, 0, 1);
      if (ms < t0 || ms > t1) continue;
      const major = y % step === 0;
      out.push({ ms, label: major ? String(y) : null, major });
    }
    return out;
  }
  if (years > 0.32) {
    // years major, months minor; label quarters when there is room
    const labelEvery = years > 2.6 ? 12 : years > 1.4 ? 3 : 1;
    let y = d0.getUTCFullYear();
    let m = d0.getUTCMonth();
    for (;;) {
      const ms = Date.UTC(y, m, 1);
      if (ms > t1) break;
      if (ms >= t0) {
        const major = m === 0;
        const label = major ? String(y) : m % labelEvery === 0 ? MON[m] : null;
        out.push({ ms, label, major });
      }
      m++;
      if (m === 12) {
        m = 0;
        y++;
      }
    }
    return out;
  }
  // months major, days minor, a label every week
  const days = (t1 - t0) / DAY_MS;
  const labelEvery = days > 60 ? 7 : days > 20 ? 2 : 1;
  let ms = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), d0.getUTCDate());
  while (ms <= t1) {
    if (ms >= t0) {
      const d = new Date(ms);
      const major = d.getUTCDate() === 1;
      const label = major
        ? `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`
        : (d.getUTCDate() - 1) % labelEvery === 0
          ? String(d.getUTCDate())
          : null;
      out.push({ ms, label, major });
    }
    ms += DAY_MS;
  }
  return out;
}

// ── packing ───────────────────────────────────────────────────────────────

/**
 * Stretches into rows: each takes the first row whose last stretch has
 * already ended, so two that overlap never print on one line. Rows are
 * returned in the input's order.
 */
export function packRows<T>(
  items: T[],
  start: (t: T) => number,
  end: (t: T) => number,
): number[] {
  const order = items
    .map((t, i) => i)
    .sort(
      (a, b) =>
        start(items[a]) - start(items[b]) || end(items[b]) - end(items[a]),
    );
  const ends: number[] = [];
  const rows = new Array<number>(items.length).fill(0);
  for (const i of order) {
    const s = start(items[i]);
    let r = ends.findIndex((e) => e <= s);
    if (r === -1) r = ends.length;
    ends[r] = end(items[i]);
    rows[i] = r;
  }
  return rows;
}

// ── relations ─────────────────────────────────────────────────────────────

/** How `a` sits against `b`, in words — Allen's relations, said plainly. */
export function relate(a: Entry, b: Entry, nowMs: number): string {
  const as = startOf(a);
  const ae = endOf(a, nowMs);
  const bs = startOf(b);
  const be = endOf(b, nowMs);
  const gap = (ms: number) => yearsWords(Math.abs(ms) / YEAR_MS);
  const day = DAY_MS * 1.5;
  if (Math.abs(as - bs) < day && Math.abs(ae - be) < day)
    return `the same time as ${b.title}`;
  if (isSpan(b)) {
    if (as >= bs - day && ae <= be + day) return `during ${b.title}`;
    if (ae <= bs + day)
      return ae > bs - day
        ? `right before ${b.title} began`
        : `${gap(bs - ae)} before ${b.title} began`;
    if (as >= be - day)
      return as < be + day
        ? `right after ${b.title} ended`
        : `${gap(as - be)} after ${b.title} ended`;
    if (as < bs && ae > be) return `around the whole of ${b.title}`;
    return as < bs ? `runs into ${b.title}` : `runs on past ${b.title}`;
  }
  if (isSpan(a)) {
    if (bs >= as - day && be <= ae + day) return `holds ${b.title}`;
    if (ae <= bs + day) return `ended ${gap(bs - ae)} before ${b.title}`;
    if (as >= be - day) return `began ${gap(as - be)} after ${b.title}`;
  }
  if (Math.abs(as - bs) < day) return `the same day as ${b.title}`;
  return as < bs
    ? `${gap(bs - as)} before ${b.title}`
    : `${gap(as - bs)} after ${b.title}`;
}

// ── the tally and its readings ────────────────────────────────────────────

export type Silence = { from: string; to: string; years: number };

export type Tally = {
  n: number;
  inner: number;
  outer: number;
  world: number;
  gaps: number;
  spans: number;
  expected: number;
  first: string | null;
  last: string | null;
  years: number;
  longest: { title: string; years: number } | null;
  silent: Silence[];
  late: number;
  again: Record<Again, number>;
  byLane: Record<string, number>;
  live: {
    structure: string[];
    conjuncture: string[];
    gap: Entry | null;
    year: Entry[];
  };
};

const SILENT_YEARS = 2;

export function tally(
  entries: Entry[],
  life: Life,
  present: string,
  today: string,
): Tally {
  const nowMs = timeOf(today, "mid");
  const atMs = timeOf(present, "mid");
  const reg = new Map(life.domains.map((d) => [d.id, d.register]));
  const t: Tally = {
    n: entries.length,
    inner: 0,
    outer: 0,
    world: 0,
    gaps: 0,
    spans: 0,
    expected: 0,
    first: null,
    last: null,
    years: 0,
    longest: null,
    silent: [],
    late: 0,
    again: { yes: 0, no: 0, unsure: 0 },
    byLane: {},
    live: { structure: [], conjuncture: [], gap: null, year: [] },
  };
  const personal: Entry[] = [];
  let first = Infinity;
  let last = -Infinity;
  for (const e of entries) {
    t.byLane[e.lane] = (t.byLane[e.lane] ?? 0) + 1;
    if (e.lane === "gap") t.gaps++;
    else if (isLayer(e.lane)) t.world++;
    else {
      personal.push(e);
      if (reg.get(e.lane) === "inner") t.inner++;
      else t.outer++;
    }
    if (isSpan(e)) t.spans++;
    if (startOf(e) > nowMs) t.expected++;
    if (e.again) t.again[e.again]++;
    if (
      !isLayer(e.lane) &&
      validDay(e.recorded) &&
      timeOf(e.recorded, "mid") - timeOf(e.day, "mid") > YEAR_MS
    )
      t.late++;
    const s = startOf(e);
    const en = endOf(e, nowMs);
    if (e.lane !== "gap" && s <= nowMs) {
      if (s < first) {
        first = s;
        t.first = e.day;
      }
      if (en > last) {
        last = en;
        t.last = e.until === "now" ? today : (e.until ?? e.day);
      }
    }
    if (isSpan(e) && !isLayer(e.lane)) {
      const y = (en - s) / YEAR_MS;
      if (!t.longest || y > t.longest.years)
        t.longest = { title: e.title, years: y };
    }
    // what was so at the present
    if (s <= atMs && en >= atMs) {
      if (e.lane === "structure") t.live.structure.push(e.title);
      else if (e.lane === "conjuncture") t.live.conjuncture.push(e.title);
      else if (e.lane === "gap" && !t.live.gap) t.live.gap = e;
    }
  }
  if (Number.isFinite(first) && Number.isFinite(last))
    t.years = (last - first) / YEAR_MS;

  const y0 = new Date(atMs).getUTCFullYear();
  t.live.year = entries
    .filter(
      (e) =>
        !isLayer(e.lane) &&
        !isSpan(e) &&
        startOf(e) <= atMs &&
        new Date(midOf(e)).getUTCFullYear() === y0,
    )
    .sort((a, b) => startOf(a) - startOf(b));

  // the record's silences: stretches of the reader's own life with nothing set down
  const covered = personal
    .map((e) => [startOf(e), endOf(e, nowMs)] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const from =
    life.born && validDay(life.born)
      ? timeOf(life.born, "start")
      : covered[0]?.[0];
  const gapsNamed = entries.filter((e) => e.lane === "gap");
  const inNamedGap = (s: number, e: number) =>
    gapsNamed.some(
      (g) => startOf(g) <= s + DAY_MS && endOf(g, nowMs) >= e - DAY_MS,
    );
  if (from !== undefined && covered.length) {
    let cursor = from;
    const stretches: [number, number][] = [];
    for (const [s, e] of covered) {
      if (s - cursor >= SILENT_YEARS * YEAR_MS) stretches.push([cursor, s]);
      cursor = Math.max(cursor, e);
    }
    if (Math.min(atMs, nowMs) - cursor >= SILENT_YEARS * YEAR_MS)
      stretches.push([cursor, Math.min(atMs, nowMs)]);
    t.silent = stretches
      .filter(([s, e]) => !inNamedGap(s, e))
      .map(([s, e]) => ({
        from: dayAt(s, "month"),
        to: dayAt(e, "month"),
        years: (e - s) / YEAR_MS,
      }))
      .sort((a, b) => b.years - a.years);
  }
  return t;
}

const list = (xs: string[]) =>
  xs.length <= 1
    ? xs.join("")
    : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

/** Facts about the record, in sentences. None of them is a verdict on the life. */
export function readings(
  t: Tally,
  life: Life,
  present: string,
  today: string,
): string[] {
  const out: string[] = [];
  if (t.n === 0)
    return [
      "nothing set down yet — double-click the line where something happened, or name a stretch the record does not speak for.",
    ];
  const parts: string[] = [];
  if (t.inner) parts.push(`${t.inner} inner`);
  if (t.outer) parts.push(`${t.outer} in the world`);
  if (t.world) parts.push(`${t.world} of the circumstances`);
  if (t.gaps) parts.push(`${t.gaps} ${t.gaps === 1 ? "gap" : "gaps"} named`);
  out.push(`${t.n} set down: ${parts.join(", ")}.`);

  if (t.first && t.last) {
    const a = ageAt(life.born, timeOf(t.first, "mid"));
    out.push(
      `from ${formatDay(t.first)} to ${formatDay(t.last)} — ${yearsWords(t.years)} of record${a !== null ? `, from ${ageWords(a)}` : ""}.`,
    );
  }

  const asOf = present === today ? "today" : `as of ${formatDay(present)}`;
  const age = ageAt(life.born, timeOf(present, "mid"));
  const live = [...t.live.structure, ...t.live.conjuncture];
  const yr = t.live.year.map((e) => e.title);
  let s = `${asOf}${age !== null ? `, ${ageWords(age)}` : ""}`;
  const bits: string[] = [];
  if (live.length) bits.push(`under ${list(live)}`);
  if (t.live.gap)
    bits.push(`inside a gap named ${WHY_LABEL[t.live.gap.why ?? "no-record"]}`);
  if (yr.length)
    bits.push(
      `that year ${list(yr.slice(0, 4))}${yr.length > 4 ? ` and ${yr.length - 4} more` : ""}`,
    );
  if (bits.length) s += `: ${bits.join("; ")}`;
  out.push(`${s}.`);

  if (t.longest)
    out.push(
      `the longest stretch set down is ${t.longest.title} — ${yearsWords(t.longest.years)}.`,
    );
  for (const g of t.silent.slice(0, 2))
    out.push(
      `between ${formatDay(g.from)} and ${formatDay(g.to)} nothing is set down — ${yearsWords(g.years)} the record does not speak for.`,
    );
  if (t.expected)
    out.push(`${t.expected} set down ahead of today — expected, not happened.`);
  if (t.late)
    out.push(
      `${t.late} ${t.late === 1 ? "was" : "were"} written down more than a year after ${t.late === 1 ? "it" : "they"} happened.`,
    );
  const ag = t.again;
  if (ag.yes + ag.no + ag.unsure)
    out.push(
      `asked whether you would have it again: ${ag.yes} yes, ${ag.no} no, ${ag.unsure} unsure.`,
    );
  return out;
}

// ── the garden's own dated moments ────────────────────────────────────────

export type Moment = {
  day: string;
  id: string;
  label: string;
  kind: string;
  /** `said`: the note names this day in its prose. `touched`: the note last changed this day. */
  how: "said" | "touched";
};

const MONTHS_RE =
  "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\\.?";
const ISO_RE = /\b(19\d\d|20\d\d)-(\d\d)-(\d\d)\b/g;
const MDY_RE = new RegExp(
  `\\b${MONTHS_RE} (\\d{1,2})(?:st|nd|rd|th)?(?:,? (19\\d\\d|20\\d\\d))?\\b`,
  "g",
);
const DMY_RE = new RegExp(
  `\\b(\\d{1,2}) ${MONTHS_RE}(?: (19\\d\\d|20\\d\\d))?\\b`,
  "g",
);
const MY_RE = new RegExp(`\\b${MONTHS_RE} (19\\d\\d|20\\d\\d)\\b`, "g");
const monthIndex = (m: string) => MON.findIndex((x) => m.startsWith(x));
const PER_NOTE = 24;

/**
 * Every day the garden's notes speak of, and the day each was last touched.
 * A month-and-day with no year is read in the year the note was last
 * changed — or the year before, if that would put it more than a month
 * ahead of the change. Notes speak in dates; this only listens.
 */
export function momentsOf(nodes: GardenNode[], today: string): Moment[] {
  const out: Moment[] = [];
  const ceiling = timeOf(today, "mid") + 2 * YEAR_MS;
  const floor = Date.UTC(1990, 0, 1);
  for (const n of nodes) {
    if (n.modified) {
      const d = n.modified.slice(0, 10);
      if (validDay(d))
        out.push({
          day: d,
          id: n.id,
          label: n.label,
          kind: n.kind,
          how: "touched",
        });
    }
    if (!n.body) continue;
    const modMs = n.modified ? Date.parse(n.modified) : NaN;
    const modYear = Number.isNaN(modMs)
      ? +today.slice(0, 4)
      : new Date(modMs).getUTCFullYear();
    const seen = new Set<string>();
    const add = (y: number, mo: number, d: number | null) => {
      if (mo < 0 || mo > 11) return;
      if (d !== null && (d < 1 || d > 31)) return;
      const day =
        d === null
          ? `${y}-${String(mo + 1).padStart(2, "0")}`
          : dayAt(Date.UTC(y, mo, d));
      if (!validDay(day)) return;
      const ms = timeOf(day, "mid");
      if (ms < floor || ms > ceiling) return;
      if (seen.has(day) || seen.size >= PER_NOTE) return;
      seen.add(day);
      out.push({ day, id: n.id, label: n.label, kind: n.kind, how: "said" });
    };
    // a bare month and day takes the note's year, or the one before
    const inferYear = (mo: number, d: number) => {
      const guess = Date.UTC(modYear, mo, d);
      return !Number.isNaN(modMs) && guess > modMs + 31 * DAY_MS
        ? modYear - 1
        : modYear;
    };
    const body = n.body.replace(/```[\s\S]*?```/g, " ");
    for (const m of body.matchAll(ISO_RE)) add(+m[1], +m[2] - 1, +m[3]);
    for (const m of body.matchAll(MDY_RE)) {
      const mo = monthIndex(m[1]);
      const d = +m[2];
      add(m[3] ? +m[3] : inferYear(mo, d), mo, d);
    }
    for (const m of body.matchAll(DMY_RE)) {
      const mo = monthIndex(m[2]);
      const d = +m[1];
      add(m[3] ? +m[3] : inferYear(mo, d), mo, d);
    }
    for (const m of body.matchAll(MY_RE)) add(+m[2], monthIndex(m[1]), null);
  }
  return out;
}

// ── the file ──────────────────────────────────────────────────────────────

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;
const DOMAIN_ID = /^[a-z][a-z0-9-]{0,39}$/;

/** A stable name for an entry's file: its year and its title, once. */
export function slugOf(title: string, day: string): string {
  const y = DAY_RE.exec(day)?.[1] ?? "undated";
  const t = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56)
    .replace(/-+$/g, "");
  return `${y}-${t || "entry"}`;
}

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const strs = (v: unknown, n: number, max: number): string[] =>
  Array.isArray(v)
    ? v
        .filter((x) => typeof x === "string")
        .map((x) => x.trim().slice(0, max))
        .filter(Boolean)
        .slice(0, n)
    : [];
// js-yaml reads a bare date as a Date; a quoted one stays a string.
const dayStr = (v: unknown): string => {
  if (v instanceof Date && !Number.isNaN(v.getTime()))
    return v.toISOString().slice(0, 10);
  if (typeof v === "number") return String(v);
  return typeof v === "string" ? v.trim() : "";
};

export function parseEntry(slug: string, raw: string): Entry {
  const { data, content } = matter(raw);
  const looms = Number(data.looms);
  const until = dayStr(data.until);
  return {
    slug,
    title: str(data.title, 200) || (data.lane === "gap" ? "" : slug),
    day: dayStr(data.day),
    until: until === "now" || validDay(until) ? until : null,
    lane: str(data.lane, 40) || "happening",
    looms: looms === 1 || looms === 3 ? looms : 2,
    again:
      data.again === "yes" || data.again === "no" || data.again === "unsure"
        ? data.again
        : null,
    why: WHYS.includes(data.why) ? (data.why as Why) : null,
    tags: strs(data.tags, 20, 40),
    stones: strs(data.stones, 40, 200),
    recorded: dayStr(data.recorded),
    note: content.trim(),
  };
}

const q = (s: string) => JSON.stringify(s);

/** The file an entry is kept in: frontmatter a person can edit, the note below. */
export function serialiseEntry(e: Entry): string {
  const lines = [`title: ${q(e.title)}`, `day: ${q(e.day)}`];
  if (e.until) lines.push(`until: ${q(e.until)}`);
  lines.push(`lane: ${q(e.lane)}`, `looms: ${e.looms}`);
  if (e.again) lines.push(`again: ${q(e.again)}`);
  if (e.why) lines.push(`why: ${q(e.why)}`);
  if (e.tags.length) lines.push(`tags: [${e.tags.map(q).join(", ")}]`);
  if (e.stones.length) lines.push(`stones: [${e.stones.map(q).join(", ")}]`);
  lines.push(`recorded: ${q(e.recorded)}`);
  return `---\n${lines.join("\n")}\n---\n${e.note ? `${e.note}\n` : ""}`;
}

/** Validation at the boundary: an entry arrives from the desk, or from a hand-edited file. */
export function validateEntry(input: unknown, today: string): Entry {
  const e = input as Partial<Entry> | null;
  if (!e || typeof e !== "object") throw new Error("entry: not an object");
  const title = str(e.title, 200);
  const lane = str(e.lane, 40);
  if (!title && lane !== "gap") throw new Error("entry: it needs a title");
  const day = dayStr(e.day);
  if (!validDay(day)) throw new Error("entry: when? a year, a month or a day");
  let until: string | null = null;
  const u = dayStr(e.until);
  if (u === "now") until = "now";
  else if (u) {
    if (!validDay(u))
      throw new Error("entry: until — a year, a month or a day");
    if (timeOf(u, "end") <= timeOf(day, "start"))
      throw new Error("entry: it cannot end before it began");
    until = u;
  }
  if (!lane || !(isLayer(lane) || DOMAIN_ID.test(lane)))
    throw new Error("entry: which lane?");
  if (lane === "gap" && !until)
    throw new Error("entry: a gap is a stretch — give it an until");
  const looms = Number(e.looms);
  const slugIn = str(e.slug, 80);
  const slug = slugIn || slugOf(title || lane, day);
  if (!SLUG.test(slug)) throw new Error("entry: bad slug");
  const recorded = dayStr(e.recorded);
  return {
    slug,
    title,
    day,
    until,
    lane,
    looms: looms === 1 || looms === 3 ? looms : 2,
    again:
      e.again === "yes" || e.again === "no" || e.again === "unsure"
        ? e.again
        : null,
    why:
      lane === "gap"
        ? WHYS.includes(e.why as Why)
          ? (e.why as Why)
          : "no-record"
        : null,
    tags: strs(e.tags, 20, 40),
    stones: strs(e.stones, 40, 200),
    recorded: validDay(recorded) && recorded.length === 10 ? recorded : today,
    note: typeof e.note === "string" ? e.note.trim().slice(0, 20_000) : "",
  };
}

export function validateLife(input: unknown): Life {
  const l = input as Partial<Life> | null;
  if (!l || typeof l !== "object") throw new Error("life: not an object");
  const born = dayStr(l.born);
  if (born && !validDay(born))
    throw new Error("life: born — a year, a month or a day");
  const horizon = dayStr(l.horizon);
  if (horizon && !validDay(horizon))
    throw new Error("life: horizon — a year, a month or a day");
  const scale: Scale = l.scale === "proportional" ? "proportional" : "clock";
  const domains: Domain[] = [];
  const ids = new Set<string>();
  if (!Array.isArray(l.domains))
    throw new Error("life: domains must be a list");
  for (const d of l.domains.slice(0, 24)) {
    const x = d as Partial<Domain> | null;
    if (!x || typeof x !== "object") continue;
    const id = str(x.id, 40).toLowerCase();
    const label = str(x.label, 40);
    if (!DOMAIN_ID.test(id) || isLayer(id))
      throw new Error(`life: bad lane id ${q(id)}`);
    if (ids.has(id)) throw new Error(`life: two lanes called ${q(id)}`);
    ids.add(id);
    domains.push({
      id,
      label: label || id,
      register: x.register === "inner" ? "inner" : "outer",
    });
  }
  if (!domains.length) throw new Error("life: at least one lane");
  return { born: born || null, horizon: horizon || null, scale, domains };
}

export function parseLife(raw: string): Life {
  try {
    return validateLife(JSON.parse(raw));
  } catch {
    return DEFAULT_LIFE;
  }
}

/** A lane id from a label the reader typed. */
export function domainIdOf(label: string, taken: Set<string>): string {
  let base = label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  if (!base || !/^[a-z]/.test(base)) base = `lane-${base}`.replace(/-+$/, "");
  if (isLayer(base)) base = `${base}-lane`;
  let id = base;
  let n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}

export const emptyEntry = (
  day: string,
  lane: string,
  today: string,
): Entry => ({
  slug: "",
  title: "",
  day,
  until: lane === "gap" ? day : null,
  lane,
  looms: 2,
  again: null,
  why: lane === "gap" ? "no-record" : null,
  tags: [],
  stones: [],
  recorded: today,
  note: "",
});
