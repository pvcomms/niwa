import matter from "gray-matter";
import { conceptMatchers, type GardenNode } from "./garden.ts";
import { slugOf } from "./bearing.ts";

/**
 * The distribution — the garden's own taste as a curve, and a thing you are
 * about to read set down on it. Everything here is measurable and nothing
 * here is a verdict: a stone's *kinship* is how alike its nearest stones are
 * on shared words, the curve is every stone's kinship standardised against
 * the garden's own spread, and a candidate is placed the same way. The tails
 * are both real: the left is "little here is like it", the right is "the
 * garden is already full of this". Which one is good is the reader's call.
 */

/** The beds that count as things read and written; repos and ghosts have no text. */
export const CORPUS_KINDS = new Set([
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

/** How many nearest stones kinship is taken over. */
export const K = 8;

/** Fewer stones than this and a window has no curve worth drawing. */
export const MIN_WINDOW = 24;

const STOP = new Set(
  `a about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just let me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves ll re ve don didn doesn isn aren wasn weren won wouldn couldn shouldn one two three like get got make made much many may might must ones thing things way well even still already always never ever every something anything nothing everything someone anyone everyone said says say see seen going went come came take took give gave use used using new old first last next back per via etc http https www com html`
    .split(/\s+/)
    .filter(Boolean),
);

/** A light stemmer: enough that "instruments" and "instrument" are one word. */
export function stem(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) return `${w.slice(0, -3)}y`;
  if (w.endsWith("ness") && w.length > 6) return w.slice(0, -4);
  if (w.endsWith("ing") && w.length > 5) return w.slice(0, -3);
  if (w.endsWith("ed") && w.length > 5) return w.slice(0, -2);
  if (w.endsWith("ly") && w.length > 5) return w.slice(0, -2);
  if (/(?:[sxz]|[cs]h)es$/.test(w) && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("s") && !w.endsWith("ss") && w.length > 4)
    return w.slice(0, -1);
  return w;
}

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/['’]s\b/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w))
    .map(stem)
    .filter((w) => w.length >= 3 && !STOP.has(w));
}

export type Vec = Map<string, number>;

export type Doc = {
  id: string;
  label: string;
  kind: string;
  modified: string | null;
  vec: Vec;
};

export type Index = { docs: Doc[]; idf: Map<string, number>; N: number };

/** What a stone is weighed on: its title three times, its first line, tags, and the top of its body. */
export function docText(n: GardenNode): { title: string; text: string } {
  const body = (n.body ?? "").slice(0, 4000).replace(/[[\]#*_`>|]/g, " ");
  return {
    title: n.label,
    text: `${n.description ?? ""}\n${(n.tags ?? []).join(" ")}\n${body}`,
  };
}

function counts(title: string, text: string): Map<string, number> {
  const c = new Map<string, number>();
  for (const t of tokens(title)) c.set(t, (c.get(t) ?? 0) + 3);
  for (const t of tokens(text)) c.set(t, (c.get(t) ?? 0) + 1);
  return c;
}

function normalise(v: Vec): Vec {
  let s = 0;
  for (const w of v.values()) s += w * w;
  const n = Math.sqrt(s) || 1;
  for (const [k, w] of v) v.set(k, w / n);
  return v;
}

/** tf-idf vectors for every stone that has text, unit length so cosine is a dot. */
export function buildIndex(nodes: GardenNode[]): Index {
  const raw = nodes
    .filter((n) => CORPUS_KINDS.has(n.kind))
    .map((n) => {
      const { title, text } = docText(n);
      return { n, c: counts(title, text) };
    })
    .filter((d) => d.c.size >= 4);
  const N = raw.length;
  const df = new Map<string, number>();
  for (const d of raw)
    for (const t of d.c.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = new Map<string, number>();
  for (const [t, f] of df) idf.set(t, Math.log((N + 1) / (f + 1)) + 1);
  const docs: Doc[] = raw.map((d) => ({
    id: d.n.id,
    label: d.n.label,
    kind: d.n.kind,
    modified: d.n.modified,
    vec: normalise(weigh(d.c, idf)),
  }));
  return { docs, idf, N };
}

function weigh(c: Map<string, number>, idf: Map<string, number>): Vec {
  const v: Vec = new Map();
  for (const [t, n] of c) {
    const w = (1 + Math.log(n)) * (idf.get(t) ?? 1);
    v.set(t, w);
  }
  return v;
}

/** A candidate, weighed on the garden's vocabulary. Words the garden has never seen count against likeness, as they should. */
export function vectorise(index: Index, title: string, text: string): Vec {
  return normalise(weigh(counts(title, text), index.idf));
}

export function dot(a: Vec, b: Vec): number {
  if (a.size > b.size) [a, b] = [b, a];
  let s = 0;
  for (const [t, w] of a) {
    const x = b.get(t);
    if (x) s += w * x;
  }
  return s;
}

/** Every stone against every other. Symmetric, zero on the diagonal. */
export function pairwise(docs: Doc[]): Float32Array {
  const n = docs.length;
  const M = new Float32Array(n * n);
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const s = dot(docs[i].vec, docs[j].vec);
      M[i * n + j] = s;
      M[j * n + i] = s;
    }
  return M;
}

/** Mean of the k largest values. */
export function topMean(values: number[], k = K): number {
  if (!values.length) return 0;
  const top = values
    .slice()
    .sort((a, b) => b - a)
    .slice(0, k);
  return top.reduce((s, v) => s + v, 0) / top.length;
}

/** The stones tended within the last `days`, or all of them. */
export function windowMembers(
  docs: Doc[],
  days: number | null,
  now = Date.now(),
): number[] {
  if (days === null) return docs.map((_, i) => i);
  const cut = now - days * 86_400_000;
  const out: number[] = [];
  docs.forEach((d, i) => {
    if (d.modified && new Date(d.modified).getTime() >= cut) out.push(i);
  });
  return out;
}

export type Placed = {
  id: string;
  label: string;
  kind: string;
  /** kinship: mean likeness to the k nearest stones in the window */
  c: number;
  /** the same, standardised against the window's spread */
  z: number;
  /** the curve's height where it sits, 0–1, for laying it under the curve */
  d: number;
};

export type Curve = {
  n: number;
  mu: number;
  sigma: number;
  items: Placed[];
  /** the smoothed curve, [z, height 0–1] */
  density: [number, number][];
  bw: number;
};

const gauss = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

/** Silverman's rule on standardised values. */
export const bandwidth = (n: number) => 1.06 * Math.pow(Math.max(n, 2), -1 / 5);

export function densityAt(zs: number[], z: number, bw: number): number {
  let s = 0;
  for (const v of zs) s += gauss((z - v) / bw);
  return s / (zs.length * bw);
}

export function kde(
  zs: number[],
  bw = bandwidth(zs.length),
  from = -3.5,
  to = 3.5,
  steps = 140,
): [number, number][] {
  const pts: [number, number][] = [];
  let max = 0;
  for (let i = 0; i <= steps; i++) {
    const z = from + ((to - from) * i) / steps;
    const d = densityAt(zs, z, bw);
    max = Math.max(max, d);
    pts.push([z, d]);
  }
  return pts.map(([z, d]) => [z, max ? d / max : 0]);
}

/** Every stone in a window placed on the window's own curve. */
export function distribution(
  docs: Doc[],
  M: Float32Array,
  members: number[],
  k = K,
): Curve | null {
  const n = docs.length;
  if (members.length < MIN_WINDOW) return null;
  const cs = members.map((i) =>
    topMean(
      members.filter((j) => j !== i).map((j) => M[i * n + j]),
      k,
    ),
  );
  const mu = cs.reduce((s, v) => s + v, 0) / cs.length;
  const sigma =
    Math.sqrt(cs.reduce((s, v) => s + (v - mu) ** 2, 0) / cs.length) || 1e-9;
  const zs = cs.map((c) => (c - mu) / sigma);
  const bw = bandwidth(zs.length);
  const dens = kde(zs, bw);
  const peak = Math.max(...zs.map((z) => densityAt(zs, z, bw)), 1e-9);
  return {
    n: members.length,
    mu,
    sigma,
    bw,
    density: dens,
    items: members.map((i, idx) => ({
      id: docs[i].id,
      label: docs[i].label,
      kind: docs[i].kind,
      c: cs[idx],
      z: zs[idx],
      d: densityAt(zs, zs[idx], bw) / peak,
    })),
  };
}

export type Kin = {
  id: string;
  label: string;
  kind: string;
  sim: number;
  shared: string[];
};

export type Placement = {
  c: number;
  z: number;
  /** share of the window's stones further from the middle than this — i.e. with lower kinship */
  outer: number;
  /** share closer to the middle */
  inner: number;
  words: string;
  kin: Kin[];
};

/** The words two vectors agree on most, for showing why two things are kin. */
export function shared(a: Vec, b: Vec, n = 6): string[] {
  const out: [string, number][] = [];
  for (const [t, w] of a) {
    const x = b.get(t);
    if (x) out.push([t, w * x]);
  }
  return out
    .sort((p, q) => q[1] - p[1])
    .slice(0, n)
    .map((p) => p[0]);
}

const pct = (f: number) => Math.round(f * 100);

/** The reading, in words the reader can argue with. Both tails are named; neither is praised. */
export function placementProse(
  z: number,
  outer: number,
  inner: number,
): string {
  if (z <= -1.5) return "far out — little in the garden is like it.";
  if (z <= -0.5)
    return `out toward the tail — further from the middle than ${pct(inner)}% of what is here.`;
  if (z < 0.5)
    return "in the thick of it — where most of what you keep already sits.";
  if (z < 1.5)
    return `closer to the middle than ${pct(outer)}% of the garden — more of the same.`;
  return "the garden is already full of this.";
}

/** Set a candidate down on a window's curve. */
export function place(
  docs: Doc[],
  members: number[],
  curve: Curve,
  cvec: Vec,
  k = K,
): Placement {
  const sims = members.map((i) => ({ i, sim: dot(docs[i].vec, cvec) }));
  const c = topMean(
    sims.map((s) => s.sim),
    k,
  );
  const z = (c - curve.mu) / curve.sigma;
  const below =
    curve.items.filter((it) => it.c < c).length / curve.items.length;
  const outer = below; // stones with lower kinship sit further out than this one
  const inner = 1 - below;
  const kin = sims
    .sort((a, b) => b.sim - a.sim)
    .slice(0, k)
    .filter((s) => s.sim > 0)
    .map((s) => ({
      id: docs[s.i].id,
      label: docs[s.i].label,
      kind: docs[s.i].kind,
      sim: s.sim,
      shared: shared(cvec, docs[s.i].vec),
    }));
  return { c, z, outer, inner, words: placementProse(z, outer, inner), kin };
}

/** Which of the reader's own terms the candidate speaks, by the garden's own rule. */
export function conceptsIn(
  nodes: GardenNode[],
  text: string,
): { id: string; label: string; signed: boolean }[] {
  const out: { id: string; label: string; signed: boolean }[] = [];
  for (const n of nodes) {
    if (n.kind !== "concept") continue;
    const ms = conceptMatchers(n.label, n.aliases ?? []);
    if (ms.some((m) => m.test(text)))
      out.push({ id: n.id, label: n.label, signed: n.signed === true });
  }
  return out;
}

/** The terms a candidate was weighed on, heaviest first. */
export function heaviest(v: Vec, n = 10): string[] {
  return [...v.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map((e) => e[0]);
}

// ── the record of choices ────────────────────────────────────────────────

export type Verdict = "let in" | "passed" | "";

export type Choice = {
  slug: string;
  title: string;
  source: string;
  /** ISO date it was weighed. */
  weighed: string;
  verdict: Verdict;
  /** Where it sat on each curve the day it was weighed. */
  z: Record<string, number>;
  note: string;
  /** What was weighed: the pasted or fetched text. */
  text: string;
};

export { slugOf };

const day = (v: unknown, fallback = ""): string =>
  v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v) : fallback;

export function parseChoice(slug: string, raw: string): Choice {
  const { data, content } = matter(raw);
  const z: Record<string, number> = {};
  if (data.z && typeof data.z === "object")
    for (const [k, v] of Object.entries(data.z))
      if (Number.isFinite(Number(v))) z[k] = Number(v);
  const verdict = String(data.verdict ?? "");
  const [note, ...rest] = content.split(/\n---\n/);
  return {
    slug,
    title: String(data.title ?? slug),
    source: String(data.source ?? ""),
    weighed: day(data.weighed),
    verdict: verdict === "let in" || verdict === "passed" ? verdict : "",
    z,
    note: rest.length ? note.trim() : "",
    text: (rest.length ? rest.join("\n---\n") : note).trim(),
  };
}

const q = (s: string) => JSON.stringify(s);

/** Frontmatter a person can edit; the note, a rule, then the text that was weighed. */
export function serialiseChoice(c: Choice): string {
  const lines = [
    `title: ${q(c.title)}`,
    `source: ${q(c.source)}`,
    `weighed: ${q(c.weighed)}`,
    `verdict: ${q(c.verdict)}`,
  ];
  const zs = Object.entries(c.z);
  if (zs.length)
    lines.push(
      `z: {${zs.map(([k, v]) => `${k}: ${(Math.round(v * 100) / 100).toFixed(2)}`).join(", ")}}`,
    );
  return `---\n${lines.join("\n")}\n---\n${c.note.trim()}\n---\n${c.text.trim()}\n`;
}

/** A page fetched on the reader's press, boiled down to a title and its words. */
export function boil(html: string): { title: string; text: string } {
  const title =
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ??
    html.match(/property=["']og:title["'][^>]*content=["']([^"']+)/i)?.[1] ??
    "";
  const desc =
    html.match(/name=["']description["'][^>]*content=["']([^"']+)/i)?.[1] ??
    html.match(
      /property=["']og:description["'][^>]*content=["']([^"']+)/i,
    )?.[1] ??
    "";
  const body = html
    .replace(/<head[\s\S]*?<\/head>/i, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(
      /<(?:nav|header|footer|aside)[\s\S]*?<\/(?:nav|header|footer|aside)>/gi,
      " ",
    )
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();
  return {
    title: clean(title).slice(0, 200),
    text: `${clean(desc)}\n${body.slice(0, 3000)}`.trim(),
  };
}
