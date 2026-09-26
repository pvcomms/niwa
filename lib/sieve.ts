import matter from "gray-matter";
import { leans as leansOn, type Lean } from "./mask.ts";
import { sentencesOf, slugOf as datedSlug } from "./way.ts";

/**
 * The sieve: Bayes drawn as areas, built by hand. A question is put down
 * with the worlds that could answer it, and each world is given a width —
 * how the reader weighs them before looking, in parts, 1 : 100. Then a
 * sighting is sifted: for each world, how many in a hundred of it would
 * show what was seen. The sighting shades that much of each column, and
 * only the shaded areas are compared: what passes. The next sighting is
 * sifted through what passed the last. Every width and every shade is the
 * reader's number; the tool multiplies and draws, and never supplies one.
 * The desk reads the areas back and never says which world is so.
 */

export type World = { name: string; parts: number };

/** One thing seen, sifted: the day, what was seen, and how much of each world passes it. */
export type Sighting = { on: string; saw: string; passes: number[] };

export type Sieve = {
  slug: string;
  title: string;
  /** What is being asked; the worlds are its possible answers. */
  question: string;
  worlds: World[];
  sightings: Sighting[];
  stone: string | null;
  opened: string;
  touched: string;
  note: string;
};

/** One sighting's arithmetic: the parts before, what passes of each, the parts after. */
export type Stage = {
  before: number[];
  passes: number[];
  after: number[];
  /** The raw product, before reduction — 80 : 1000. */
  product: number[];
};

export const MIN_WORLDS = 2;
export const MAX_WORLDS = 5;

/** Nothing passes at 0 or 100: a world that says never cannot come back, and one that says always has stopped looking. */
export const clampPasses = (n: number) =>
  Math.min(99, Math.max(1, Math.round(Number.isFinite(n) ? n : 50)));

/** A width is any positive number of parts; the drawing needs it finite and above nothing. */
export const clampParts = (n: number) =>
  Number.isFinite(n) && n > 0
    ? Math.min(1_000_000, Math.max(0.01, Math.round(n * 1000) / 1000))
    : 1;

export const emptySieve = (today: string): Sieve => ({
  slug: "",
  title: "",
  question: "",
  worlds: [
    { name: "", parts: 1 },
    { name: "", parts: 1 },
  ],
  sightings: [],
  stone: null,
  opened: today,
  touched: today,
  note: "",
});

/* ── the arithmetic ────────────────────────────────────────────────────── */

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Each world's share of the whole, by parts. */
export const shares = (parts: number[]): number[] => {
  const s = sum(parts) || 1;
  return parts.map((p) => p / s);
};

/** What passes of each world: its parts, shaded to how many in a hundred show the sighting. */
export const pass = (parts: number[], passes: number[]): number[] =>
  parts.map((p, i) => (p * (passes[i] ?? 50)) / 100);

/** Reduced so the smallest part is 1, which is how a ratio is said aloud. */
export const reduce = (parts: number[]): number[] => {
  const m = Math.min(...parts.filter((p) => p > 0));
  if (!Number.isFinite(m) || m <= 0) return parts;
  return parts.map((p) => p / m);
};

/** A number said plainly: 1, 12.5, 0.08. */
export const fmt = (n: number): string => {
  if (!Number.isFinite(n)) return "—";
  const d = n >= 100 ? 0 : n >= 10 ? 1 : n >= 1 ? 2 : 3;
  return String(Math.round(n * 10 ** d) / 10 ** d);
};

/** A share as parts in a hundred: 7.4, 92.6, <1. */
export const inHundred = (share: number): string => {
  const p = share * 100;
  if (p > 0 && p < 1) return "<1";
  if (p > 99 && p < 100) return ">99";
  return fmt(Math.round(p * 10) / 10);
};

export const ratio = (parts: number[]): string =>
  reduce(parts).map(fmt).join(" : ");
export const plain = (parts: number[]): string => parts.map(fmt).join(" : ");

/** Each sighting in order, sifted through what passed the one before. */
export function stagesOf(s: Sieve): Stage[] {
  const out: Stage[] = [];
  let before = s.worlds.map((w) => w.parts);
  for (const g of s.sightings) {
    const product = pass(before, g.passes);
    const after = reduce(product);
    out.push({ before, passes: g.passes, after, product });
    before = after;
  }
  return out;
}

/** The parts as they stand: the last thing that passed, or the widths before looking. */
export const partsNow = (s: Sieve): number[] =>
  stagesOf(s).at(-1)?.after ?? s.worlds.map((w) => w.parts);

/**
 * A sighting's weight between two worlds: how many times more of the first
 * it passes than the second. Always said as at-least-one-to-one, for the
 * world it favours.
 */
export function weight(
  passes: number[],
  i: number,
  j: number,
): { for: number; against: number; factor: number } {
  const a = passes[i] ?? 50;
  const b = passes[j] ?? 50;
  return a >= b
    ? { for: i, against: j, factor: a / b }
    : { for: j, against: i, factor: b / a };
}

/** The strongest weight a sighting carries between any two of the worlds. */
export function heaviest(passes: number[]): {
  for: number;
  against: number;
  factor: number;
} {
  let hi = 0;
  let lo = 0;
  passes.forEach((p, i) => {
    if (p > (passes[hi] ?? 0)) hi = i;
    if (p < (passes[lo] ?? Infinity)) lo = i;
  });
  return weight(passes, hi, lo);
}

/** The world with the most parts; ties go to the earlier one. */
export const leader = (parts: number[]): number =>
  parts.reduce((best, p, i) => (p > (parts[best] ?? -1) ? i : best), 0);

/**
 * Dragging the line between two columns: the pair keeps its parts between
 * them and splits them by the new fraction, said to a precision a person
 * would type.
 */
export function splitPair(parts: number[], i: number, f: number): number[] {
  const a = parts[i];
  const b = parts[i + 1];
  if (a === undefined || b === undefined) return parts;
  const total = a + b;
  const t = Math.min(0.99, Math.max(0.01, f));
  const round = (n: number) =>
    total >= 20
      ? Math.max(1, Math.round(n))
      : Math.max(0.1, Math.round(n * 10) / 10);
  const na = round(total * t);
  const nb = round(total - na);
  const out = parts.slice();
  out[i] = clampParts(na);
  out[i + 1] = clampParts(nb);
  return out;
}

/* ── the tally and the readings ────────────────────────────────────────── */

export type Tally = {
  n: number;
  names: string[];
  start: number[];
  now: number[];
  startShares: number[];
  nowShares: number[];
  ledBefore: number;
  lead: number;
  /** Sightings after which the lead changed hands, and to whom. */
  turns: { after: number; lead: number }[];
  /** The sighting that weighed most, and how. */
  heaviest: { i: number; for: number; against: number; factor: number } | null;
  /** What it would take for the second to draw level with the first, as it stands. */
  level: { for: number; against: number; factor: number } | null;
  stages: Stage[];
};

export function tally(s: Sieve): Tally {
  const names = s.worlds.map((w) => w.name);
  const start = s.worlds.map((w) => w.parts);
  const stages = stagesOf(s);
  const now = stages.at(-1)?.after ?? start;
  const ledBefore = leader(start);
  const lead = leader(now);
  const turns: { after: number; lead: number }[] = [];
  let led = ledBefore;
  stages.forEach((st, i) => {
    const l = leader(st.after);
    if (l !== led) {
      turns.push({ after: i, lead: l });
      led = l;
    }
  });
  let heavy: Tally["heaviest"] = null;
  s.sightings.forEach((g, i) => {
    const h = heaviest(g.passes);
    if (!heavy || h.factor > heavy.factor) heavy = { i, ...h };
  });
  let level: Tally["level"] = null;
  if (now.length >= 2) {
    const order = now.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p);
    const first = order[0];
    const second = order[1];
    if (first && second && first.p > second.p)
      level = { for: second.i, against: first.i, factor: first.p / second.p };
  }
  return {
    n: s.sightings.length,
    names,
    start,
    now,
    startShares: shares(start),
    nowShares: shares(now),
    ledBefore,
    lead,
    turns,
    heaviest: heavy,
    level,
    stages,
  };
}

const n = (k: number, one: string, many = `${one}s`) =>
  `${k} ${k === 1 ? one : many}`;
const list = (xs: string[]) => xs.map((w) => `'${w}'`).join(", ");
const quote = (saw: string) => {
  const s = saw.replace(/\s+/g, " ").trim();
  if (!s) return "an unnamed sighting";
  return `‘${s.length > 40 ? `${s.slice(0, 37).trim()}…` : s}’`;
};
const factorOf = (f: number) => `${fmt(f)} to 1`;

/** Facts about one sieve's numbers, all of them the reader's; none a verdict on the worlds. */
export function readings(s: Sieve, t: Tally, values: Lean[]): string[] {
  const out: string[] = [];
  const nm = (i: number) => t.names[i] ?? `world ${i + 1}`;
  const pair =
    t.names.length === 2 ? `${nm(0)} : ${nm(1)}` : t.names.join(" : ");
  const hundreds = (sh: number[]) =>
    sh.map((x, i) => `${nm(i)} ${inHundred(x)} in 100`).join(", ");
  if (!t.n) {
    out.push("nothing sifted yet");
    out.push(
      `before looking, ${pair} at ${ratio(t.start)} — ${hundreds(t.startShares)}`,
    );
  } else {
    out.push(`before looking, ${pair} at ${ratio(t.start)}`);
    const said = s.sightings.slice(0, 4).map((g) => {
      const h = heaviest(g.passes);
      const passed =
        g.passes.length === 2
          ? `passed ${g.passes[0]} in 100 of ${nm(0)} and ${g.passes[1]} in 100 of ${nm(1)}`
          : `passed ${g.passes.join(" · ")} in 100 of ${t.names.join(", ")}`;
      return `${quote(g.saw)} ${passed} — ${factorOf(h.factor)} for ${nm(h.for)}`;
    });
    out.push(
      `${n(t.n, "sighting")} sifted: ${said.join("; ")}${t.n > 4 ? `; and ${t.n - 4} more` : ""}`,
    );
    out.push(
      `what passes, by your numbers: ${ratio(t.now)} — ${hundreds(t.nowShares)}`,
    );
    if (!t.turns.length)
      out.push(
        `${nm(t.ledBefore)} was widest before looking and is widest now`,
      );
    else
      out.push(
        `the widest column changed hands ${n(t.turns.length, "time")}: ${t.turns
          .map(
            (x) =>
              `after ${quote(s.sightings[x.after]?.saw ?? "")}, ${nm(x.lead)}`,
          )
          .join("; ")}`,
      );
    if (t.heaviest && t.n > 1)
      out.push(
        `the sighting that weighed most was ${quote(s.sightings[t.heaviest.i]?.saw ?? "")}, ${factorOf(t.heaviest.factor)} for ${nm(t.heaviest.for)}`,
      );
  }
  if (t.level)
    out.push(
      `for ${nm(t.level.for)} to draw level with ${nm(t.level.against)} would take a sighting weighing ${factorOf(t.level.factor)} for it`,
    );
  else if (t.names.length >= 2) out.push("the two widest columns stand level");
  if (values.length)
    out.push(`leans on ${list(values.map((v) => v.name))}, by their terms`);
  return out;
}

/** Facts about every question on the sieve. */
export function wholeReadings(sieves: Sieve[]): string[] {
  if (!sieves.length) return ["nothing on the sieve yet"];
  const sifted = sum(sieves.map((s) => s.sightings.length));
  const out = [
    `${n(sieves.length, "question")} on the sieve · ${n(sifted, "sighting")} sifted in all`,
  ];
  const bare = sieves.filter((s) => !s.sightings.length).length;
  if (bare) out.push(`${bare} with nothing sifted yet`);
  const turned = sieves.filter((s) => tally(s).turns.length).length;
  if (turned) out.push(`${turned} where the widest column has changed hands`);
  const many = sieves.filter((s) => s.worlds.length > 2).length;
  if (many) out.push(`${many} with more than two worlds`);
  return out;
}

/** Which of the reader's values a question leans on, by the values' own terms. */
export const leansOnValues = (
  s: Sieve,
  values: { name: string; terms: string[] }[],
): Lean[] =>
  leansOn(
    `${s.question} ${s.worlds.map((w) => w.name).join(" ")} ${s.sightings.map((g) => g.saw).join(" ")}`,
    values,
  );

/* ── the file ──────────────────────────────────────────────────────────── */

export const slugOf = datedSlug;

export function titleOf(s: { title: string; question: string }): string {
  if (s.title.trim()) return s.title.trim();
  const first = (sentencesOf(s.question)[0] ?? s.question.trim())
    .replace(/[.!…]+$/, "")
    .trim();
  if (first) return first.length > 72 ? `${first.slice(0, 69).trim()}…` : first;
  return "a question";
}

const y = (s: string | null | boolean) => JSON.stringify(s);

export function serialiseSieve(s: Sieve): string {
  const lines = [`title: ${y(s.title)}`];
  if (s.stone) lines.push(`stone: ${y(s.stone)}`);
  lines.push(`opened: ${y(s.opened)}`, `touched: ${y(s.touched)}`);
  lines.push("worlds:");
  for (const w of s.worlds)
    lines.push(`  - { name: ${y(w.name)}, parts: ${w.parts} }`);
  const body = [`## the question\n\n${s.question.trim()}`];
  if (s.sightings.length)
    body.push(
      `## sifted\n\n${s.sightings
        .map(
          (g) =>
            `### ${g.on} · passes ${g.passes.join(" : ")}\n\n${g.saw.trim()}`,
        )
        .join("\n\n")}`,
    );
  if (s.note.trim()) body.push(`## note\n\n${s.note.trim()}`);
  return `---\n${lines.join("\n")}\n---\n\n${body.join("\n\n")}\n`;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const SIGHT_HEAD = /^### (\d{4}-\d{2}-\d{2}) · passes ([\d :.]+?)\s*$/;

/** Sub-entries under a section: each begins with a `### ` heading; the text after it is the body. */
function entries(section: string): { head: string; body: string }[] {
  const out: { head: string; body: string }[] = [];
  for (const line of section.split("\n")) {
    if (line.startsWith("### ")) out.push({ head: line, body: "" });
    else if (out.length) out[out.length - 1].body += `${line}\n`;
  }
  return out.map((e) => ({ head: e.head, body: e.body.trim() }));
}

export function parseSieve(slug: string, raw: string): Sieve {
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
  const sightings = entries(sec("sifted"))
    .map((e) => {
      const m = e.head.match(SIGHT_HEAD);
      return m
        ? {
            on: m[1],
            saw: e.body,
            passes: m[2].split(":").map((x) => Number(x.trim())),
          }
        : null;
    })
    .filter((g): g is Sighting => g !== null);
  return validateSieve(
    {
      slug,
      title: data.title,
      question: sec("the question"),
      worlds: data.worlds,
      sightings,
      stone: data.stone ?? null,
      opened: data.opened,
      touched: data.touched,
      note: sec("note"),
    },
    typeof data.touched === "string"
      ? data.touched
      : new Date().toISOString().slice(0, 10),
  );
}

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** Validation at the boundary: a sieve arrives from the desk, or from a hand-edited file. */
export function validateSieve(input: unknown, today: string): Sieve {
  const r = (input ?? {}) as Record<string, unknown>;
  const question =
    typeof r.question === "string" ? r.question.trim().slice(0, 2000) : "";
  if (!question) throw new Error("a question needs its words");
  const day = (v: unknown, fallback = today) =>
    typeof v === "string" && DAY.test(v) ? v : fallback;
  const long = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";
  const worlds: World[] = (Array.isArray(r.worlds) ? r.worlds : [])
    .slice(0, MAX_WORLDS)
    .map((x, i) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return {
        name: str(o.name, 60) || `world ${i + 1}`,
        parts: clampParts(Number(o.parts)),
      };
    });
  if (worlds.length < MIN_WORLDS)
    throw new Error("a sieve needs at least two worlds");
  const sightings: Sighting[] = (Array.isArray(r.sightings) ? r.sightings : [])
    .slice(0, 500)
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const given = Array.isArray(o.passes) ? o.passes : [];
      return {
        on: day(o.on),
        saw: long(o.saw, 2000),
        passes: worlds.map((_, i) => clampPasses(Number(given[i]))),
      };
    });
  const s: Sieve = {
    slug: str(r.slug, 120),
    title: str(r.title, 120),
    question,
    worlds,
    sightings,
    stone: str(r.stone, 200) || null,
    opened: day(r.opened),
    touched: day(r.touched),
    note: long(r.note, 4000),
  };
  s.title = titleOf(s);
  if (!s.slug) s.slug = slugOf(s.title, s.opened);
  return s;
}
