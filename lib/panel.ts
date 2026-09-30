import type { GardenLink } from "./garden.ts";
import { KIND_LABEL } from "./palette.ts";

/**
 * The panel — the garden read as a set of markers over time, the way a
 * clinician reads a blood panel: each on its own line, none of them added to
 * the others. The method is the Community Archive's measure of serendipity
 * (Epistemic Garden, 2026): no single number to push up, relationships
 * counted beside volume, pairs that answer each other in both directions as
 * the headline, and every count taken again with the largest hubs removed to
 * see whether a jump belongs to the whole or to a few.
 *
 * Every stone is dated by the day its file first appears in the record (git),
 * and a thread by the later of its two ends: the earliest day it could have
 * been drawn. Everything here is pure; the record is read by the route.
 */

/** The stones with words in them. Repos and unwritten ideas are counted apart. */
export const CORPUS = new Set([
  "concept",
  "note",
  "notion",
  "garden",
  "reading",
  "project",
  "user",
  "feedback",
  "reference",
]);

/** Threads between two stones. `seed` and `build` reach an idea or a repo, not a stone. */
const THREAD = new Set<GardenLink["kind"]>([
  "link",
  "mention",
  "concept",
  "twin",
]);

/** Threads a stone writes in its own words, so they have a direction. */
const WRITTEN = new Set<GardenLink["kind"]>(["link", "mention"]);

/** The index that lists every memory is structure, not a thread; nor are agents. */
const NOT_A_THREAD = new Set(["meta", "agent"]);

/** This many stones first appearing on one day is an import, not a day's work. */
export const BULK = 20;

/** How many of the most threaded stones the check takes out. */
export const HUBS = 10;

/** The window for "tended". */
export const MONTH = 30;

/** Growth is read from the first week the garden held this many stones. */
export const MIN_START = 10;

export const MARKERS = [
  "stones",
  "threads",
  "per",
  "both",
  "vocab",
  "alone",
  "tended",
  "unplanted",
] as const;
export type MarkerKey = (typeof MARKERS)[number];

/** Markers that are a share of the stones, read in a hundred and drawn on a fixed 0–100 scale. */
export const SHARES = new Set<MarkerKey>(["vocab", "alone", "tended"]);

export type PanelStone = { id: string; label: string; kind: string };

export type PanelInput = {
  nodes: PanelStone[];
  links: GardenLink[];
  /** id → the day its file first appears in the record, `YYYY-MM-DD`. */
  born: Record<string, string>;
  /** id → every day its file changed, oldest first. */
  touched: Record<string, string[]>;
  today: string;
};

export type Leave = { hubs: boolean; bulk: boolean };

export type Bulk = { day: string; count: number; kinds: [string, number][] };
export type Hub = { id: string; label: string; threads: number };

export type Panel = {
  /** The last day of each week, oldest first; the last is today. */
  weeks: string[];
  series: Record<MarkerKey, number[]>;
  /** Days on which many stones first appear. */
  bulk: Bulk[];
  /** The most threaded stones, whether or not they were left out. */
  hubs: Hub[];
  /** How many stones were left out by the checks. */
  left: number;
  /** The week growth is read from. */
  start: number;
};

const DAY = 86_400_000;
const ms = (d: string) =>
  Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));

export const addDays = (d: string, n: number): string =>
  new Date(ms(d) + n * DAY).toISOString().slice(0, 10);

/** Week ends from today back to the first day, a week apart, oldest first. */
export function weeksOf(first: string, today: string): string[] {
  const out: string[] = [];
  for (let d = today; d >= first; d = addDays(d, -7)) out.push(d);
  if (!out.length) out.push(today);
  // One week before the first stone, so every line starts from nothing.
  out.push(addDays(out[out.length - 1], -7));
  return out.reverse();
}

const id = (end: GardenLink["source"]): string =>
  typeof end === "string" ? end : ((end as { id: string })?.id ?? "");

/** Days on which at least BULK stones first appear, with what kinds they were. */
export function bulkDays(input: PanelInput): Bulk[] {
  const byDay = new Map<string, Map<string, number>>();
  for (const n of input.nodes) {
    const b = input.born[n.id];
    if (!b || !CORPUS.has(n.kind)) continue;
    const k = byDay.get(b) ?? new Map<string, number>();
    k.set(n.kind, (k.get(n.kind) ?? 0) + 1);
    byDay.set(b, k);
  }
  return [...byDay.entries()]
    .map(([day, k]) => ({
      day,
      count: [...k.values()].reduce((a, b) => a + b, 0),
      kinds: [...k.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      ),
    }))
    .filter((b) => b.count >= BULK)
    .sort((a, b) => a.day.localeCompare(b.day));
}

/** The stones with the most threads to other stones, as the garden stands today. */
export function hubsOf(input: PanelInput, n = HUBS): Hub[] {
  const kind = new Map(input.nodes.map((s) => [s.id, s.kind]));
  const label = new Map(input.nodes.map((s) => [s.id, s.label]));
  const deg = new Map<string, number>();
  for (const l of input.links) {
    if (!THREAD.has(l.kind)) continue;
    const [s, t] = [id(l.source), id(l.target)];
    if (!CORPUS.has(kind.get(s) ?? "") || !CORPUS.has(kind.get(t) ?? ""))
      continue;
    deg.set(s, (deg.get(s) ?? 0) + 1);
    deg.set(t, (deg.get(t) ?? 0) + 1);
  }
  return [...deg.entries()]
    .map(([k, threads]) => ({ id: k, label: label.get(k) ?? k, threads }))
    .sort((a, b) => b.threads - a.threads || a.label.localeCompare(b.label))
    .slice(0, n);
}

const later = (a: string, b: string) => (a > b ? a : b);
const minInto = (m: Map<string, string>, k: string, d: string) => {
  const was = m.get(k);
  if (!was || d < was) m.set(k, d);
};

/**
 * The panel: every marker, week by week. `leave` takes stones out before
 * anything is counted — the most threaded, or the ones planted in bulk — and
 * with them every thread they held.
 */
export function panel(
  input: PanelInput,
  leave: Leave = { hubs: false, bulk: false },
): Panel {
  const bulk = bulkDays(input);
  const hubs = hubsOf(input);
  const kind = new Map(input.nodes.map((s) => [s.id, s.kind]));

  const out = new Set<string>();
  if (leave.hubs) for (const h of hubs) out.add(h.id);
  if (leave.bulk) {
    const days = new Set(bulk.map((b) => b.day));
    for (const n of input.nodes)
      if (CORPUS.has(n.kind) && days.has(input.born[n.id])) out.add(n.id);
  }

  const kept = input.nodes.filter(
    (n) => CORPUS.has(n.kind) && input.born[n.id] && !out.has(n.id),
  );
  const keep = new Set(kept.map((n) => n.id));
  const born = (k: string) => input.born[k];

  // Every thread dated once, by the later of its ends.
  const threadAt: string[] = [];
  const written = new Map<string, string>(); // "a|b" → day, a names b
  const vocabAt = new Map<string, string>(); // stone → first day a term reached it
  const linkedAt = new Map<string, string>(); // stone → first day anything joined it
  const ghostAt = new Map<string, string>(); // idea → first day a kept stone linked it

  for (const l of input.links) {
    const [s, t] = [id(l.source), id(l.target)];
    const [ks, kt] = [kind.get(s) ?? "", kind.get(t) ?? ""];
    if (NOT_A_THREAD.has(ks) || NOT_A_THREAD.has(kt)) continue;
    const cs = CORPUS.has(ks);
    const ct = CORPUS.has(kt);
    // A thread to a stone that was left out goes with it.
    if ((cs && !keep.has(s)) || (ct && !keep.has(t))) continue;
    if (!cs && !ct) continue;

    const at = cs && ct ? later(born(s), born(t)) : cs ? born(s) : born(t);
    if (cs) minInto(linkedAt, s, at);
    if (ct) minInto(linkedAt, t, at);

    if (l.kind === "seed" && cs) minInto(ghostAt, t, at);
    if (!(cs && ct) || !THREAD.has(l.kind)) continue;

    threadAt.push(at);
    if (WRITTEN.has(l.kind)) {
      const key = `${s}|${t}`;
      const was = written.get(key);
      if (!was || at < was) written.set(key, at);
    }
    if (l.kind === "concept" && ks === "concept" && kt !== "concept")
      minInto(vocabAt, t, at);
  }

  const bothAt: string[] = [];
  for (const [key, at] of written) {
    const [a, b] = key.split("|");
    if (a >= b) continue;
    const back = written.get(`${b}|${a}`);
    if (back) bothAt.push(later(at, back));
  }

  const first = kept.reduce(
    (m, n) => (born(n.id) < m ? born(n.id) : m),
    input.today,
  );
  const weeks = weeksOf(first, input.today);
  const series = Object.fromEntries(
    MARKERS.map((m) => [m, [] as number[]]),
  ) as Record<MarkerKey, number[]>;

  const upTo = (days: Iterable<string>, d: string) => {
    let c = 0;
    for (const x of days) if (x <= d) c++;
    return c;
  };

  for (const d of weeks) {
    const present = kept.filter((n) => born(n.id) <= d);
    const words = present.filter((n) => n.kind !== "concept");
    const since = addDays(d, -MONTH);

    const stones = present.length;
    const threads = upTo(threadAt, d);
    const vocab = words.filter((n) => (vocabAt.get(n.id) ?? "~") <= d).length;
    const alone = present.filter((n) => (linkedAt.get(n.id) ?? "~") > d).length;
    const tended = present.filter((n) =>
      (input.touched[n.id] ?? [born(n.id)]).some((t) => t > since && t <= d),
    ).length;

    series.stones.push(stones);
    series.threads.push(threads);
    series.per.push(stones ? threads / stones : 0);
    series.both.push(upTo(bothAt, d));
    series.vocab.push(words.length ? vocab / words.length : 0);
    series.alone.push(stones ? alone / stones : 0);
    series.tended.push(stones ? tended / stones : 0);
    series.unplanted.push(upTo(ghostAt.values(), d));
  }

  // From the first week with MIN_START stones, else the first with any.
  const full = series.stones.findIndex((s) => s >= MIN_START);
  const any = series.stones.findIndex((s) => s > 0);
  const start = full >= 0 ? full : Math.max(0, any);

  return { weeks, series, bulk, hubs, left: out.size, start };
}

// ── saying it ──────────────────────────────────────────────────────────────

const MON = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

/** `2026-09-19` → `19 Sep`. */
export const dayOf = (d: string) =>
  `${+d.slice(8, 10)} ${MON[+d.slice(5, 7) - 1]}`;

const commas = (n: number) =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** A marker's value as it is said: a count, a share in a hundred, or threads per stone to one place. */
export function said(key: MarkerKey, v: number): string {
  if (SHARES.has(key)) return `${Math.round(v * 100)} in 100`;
  if (key === "per") return v.toFixed(1);
  return commas(v);
}

/** How many times a thing grew, said plainly; from none, it only went from none. */
export function times(from: number, to: number): string | null {
  if (from <= 0) return null;
  const r = to / from;
  return r >= 10 ? `${Math.round(r)} times` : `${r.toFixed(1)} times`;
}

/** The headline: the stones, the threads and the pairs written both ways, from the start to now. */
export function growth(p: Panel): string {
  const s = p.start;
  const last = p.weeks.length - 1;
  const part = (k: MarkerKey, name: string) => {
    const [a, b] = [p.series[k][s], p.series[k][last]];
    const t = times(a, b);
    return t
      ? `${name} from ${said(k, a)} to ${said(k, b)}, ${t} as many`
      : `${name} from none to ${said(k, b)}`;
  };
  return `Since the week of ${dayOf(p.weeks[s])}: ${part("stones", "the stones")}; ${part("threads", "the threads")}; ${part("both", "the pairs written both ways")}.`;
}

/** One marker read at a week, beside four weeks before and the start. */
export function reading(
  p: Panel,
  key: MarkerKey,
  name: string,
  at: number,
): string {
  const v = p.series[key];
  const back = Math.max(0, at - 4);
  return `${name}: ${said(key, v[at])} in the week of ${dayOf(p.weeks[at])}; ${said(key, v[back])} four weeks before; ${said(key, v[p.start])} in the week of ${dayOf(p.weeks[p.start])}.`;
}

/** A day of planting in bulk, said. */
export function bulkSaid(b: Bulk): string {
  const [k, n] = b.kinds[0];
  const rest = b.count - n;
  const what = `${commas(n)} ${(KIND_LABEL[k] ?? k).toLowerCase()}`;
  return `${commas(b.count)} stones first appear on ${dayOf(b.day)}: ${what}${rest ? ` and ${commas(rest)} more` : ""}.`;
}

/** Every sentence the view reads back, for the test that keeps verdicts out of them. */
export function readings(p: Panel, names: Record<MarkerKey, string>): string[] {
  const at = p.weeks.length - 1;
  return [
    growth(p),
    ...MARKERS.map((k) => reading(p, k, names[k], at)),
    ...p.bulk.map(bulkSaid),
  ];
}
