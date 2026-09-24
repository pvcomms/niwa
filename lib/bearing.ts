import matter from "gray-matter";
import type { GardenNode } from "./garden.ts";

/**
 * 指針 — the bearing. The reader's values drawn as overlapping circles, and
 * a decision set down among them by hand. Everything here is pure: the
 * geometry of the sheet, the reading of a point (which values it sits in,
 * which it leaves), the words for that reading, and the shape of the file a
 * decision is kept in. The instrument surfaces; it never scores.
 */

export type Pt = [number, number];

export type Value = {
  id: string;
  name: string;
  /** What the value means to the reader, in their words. */
  blurb: string;
  /** Words that, found in a stone's title or tags, mark it as about this value. */
  terms: string[];
};

export type Region = { name: string; blurb: string };

export type ValuesConfig = {
  layout: 3 | 5;
  /** In slot order: the first value takes the first circle of the layout. */
  values: Value[];
  /** Named regions, keyed by the ids of the values they lie in, sorted and joined with "+". */
  regions: Record<string, Region>;
};

export type Bearing = {
  slug: string;
  title: string;
  /** ISO date the decision was first set down. */
  placed: string;
  /** Where it sits on the sheet, in frame units; null while still unplaced. */
  at: Pt | null;
  /** Where it leads, if the reader drew a heading. */
  leads: Pt | null;
  /** The reader's own note under it. */
  note: string;
};

/** The sheet's frame: every coordinate below is in these units. */
export const FRAME = { w: 900, h: 640 } as const;

export type Slot = {
  cx: number;
  cy: number;
  r: number;
  /** Where the value's name is lettered, and how it is anchored. */
  lx: number;
  ly: number;
  anchor: "start" | "middle" | "end";
};

export type Layout = {
  slots: Slot[];
  /** Pure two-set regions that really exist, with where their name goes. */
  pairs: { ids: [number, number]; ax: number; ay: number }[];
  /** The one three-set region drawn, if the layout has it. */
  triple: { ids: number[]; mx: number; my: number } | null;
};

/**
 * Pre-solved geometry. Placing circles so that named overlaps are real regions
 * is a geometry problem, not a slider; these two were solved by hand for the
 * paramv.com figure and are carried over unchanged.
 */
export const LAYOUTS: Record<3 | 5, Layout> = {
  3: {
    slots: [
      { cx: 450, cy: 233.5, r: 195, lx: 450, ly: 28, anchor: "middle" },
      { cx: 350, cy: 406.7, r: 195, lx: 145, ly: 412, anchor: "end" },
      { cx: 550, cy: 406.7, r: 195, lx: 755, ly: 412, anchor: "start" },
    ],
    pairs: [
      { ids: [0, 1], ax: 361, ay: 297.6 },
      { ids: [0, 2], ax: 539, ay: 297.6 },
      { ids: [1, 2], ax: 450, ay: 451.7 },
    ],
    triple: { ids: [0, 1, 2], mx: 450, my: 349 },
  },
  5: {
    slots: [
      { cx: 300, cy: 255, r: 178, lx: 300, ly: 60, anchor: "middle" },
      { cx: 560, cy: 255, r: 178, lx: 560, ly: 60, anchor: "middle" },
      { cx: 430, cy: 445, r: 152, lx: 430, ly: 617, anchor: "middle" },
      { cx: 190, cy: 420, r: 115, lx: 120, ly: 290, anchor: "middle" },
      { cx: 665, cy: 430, r: 112, lx: 795, ly: 415, anchor: "middle" },
    ],
    pairs: [
      { ids: [0, 1], ax: 430, ay: 225 },
      { ids: [0, 3], ax: 221, ay: 358 },
      { ids: [0, 2], ax: 352, ay: 380 },
      { ids: [1, 2], ax: 512, ay: 380 },
      { ids: [1, 4], ax: 637, ay: 362 },
      { ids: [2, 3], ax: 286, ay: 470 },
      { ids: [2, 4], ax: 571, ay: 463 },
    ],
    triple: { ids: [0, 1, 2], mx: 430, my: 325 },
  },
};

/** Shipped as the sample. A reader's own values live in their vault, not here. */
export const DEFAULT_CONFIG: ValuesConfig = {
  layout: 5,
  values: [
    {
      id: "craft",
      name: "craft",
      blurb: "Made properly, including the parts nobody will check.",
      terms: ["craft", "quality", "made", "design"],
    },
    {
      id: "candour",
      name: "candour",
      blurb: "Said plainly, error bars left in.",
      terms: ["candour", "honest", "plain", "truth"],
    },
    {
      id: "curiosity",
      name: "curiosity",
      blurb: "Followed because it pulled, not because it paid.",
      terms: ["curiosity", "question", "wonder", "learn"],
    },
    {
      id: "care",
      name: "care",
      blurb: "Someone is on the other end of it.",
      terms: ["care", "kind", "people", "family"],
    },
    {
      id: "quiet",
      name: "quiet",
      blurb: "Kept small, kept close, not for a feed.",
      terms: ["quiet", "private", "local", "small"],
    },
  ],
  regions: {
    "candour+craft": {
      name: "the honest object",
      blurb: "made well and described exactly.",
    },
    "care+craft": { name: "made for someone", blurb: "the good room." },
    "craft+curiosity": {
      name: "the rabbit hole, finished",
      blurb: "followed all the way down and built at the bottom.",
    },
    "candour+curiosity": {
      name: "the open question",
      blurb: "asked out loud, answer unknown.",
    },
    "candour+quiet": {
      name: "the private ledger",
      blurb: "true, and not for show.",
    },
    "care+curiosity": {
      name: "asking after",
      blurb: "curious about a person, not a topic.",
    },
    "curiosity+quiet": {
      name: "for its own sake",
      blurb: "nobody watching, still doing it.",
    },
    "candour+craft+curiosity": {
      name: "the work worth doing",
      blurb: "rare on purpose.",
    },
  },
};

export const keyOf = (ids: string[]) => [...ids].sort().join("+");

/** Which circles a point of the sheet falls inside, as slot indices in order. */
export function slotsAt(layout: Layout, p: Pt): number[] {
  const out: number[] = [];
  layout.slots.forEach((s, i) => {
    const dx = p[0] - s.cx;
    const dy = p[1] - s.cy;
    if (dx * dx + dy * dy <= s.r * s.r) out.push(i);
  });
  return out;
}

/**
 * One short code per value for the set expressions: the shortest prefix of
 * its name that no other value shares, so "taste" and "trust" read as Ta and
 * Tr, and "care" beside "candour" as Car and Can.
 */
export function codes(values: Value[]): string[] {
  const names = values.map((v) => v.name.trim().toLowerCase() || "?");
  return names.map((n, i) => {
    let k = 1;
    while (
      k < n.length &&
      names.some((o, j) => j !== i && o.slice(0, k) === n.slice(0, k))
    )
      k++;
    const p = n.slice(0, k);
    return p.charAt(0).toUpperCase() + p.slice(1);
  });
}

/** `T ∩ P`, or the complement when the point is in no value at all. */
export function expression(inside: number[], values: Value[]): string {
  const c = codes(values);
  if (inside.length === 0) return `𝒰 ∖ (${c.join(" ∪ ")})`;
  return inside.map((i) => c[i]).join(" ∩ ");
}

/** The name the reader gave this region, if they gave it one. */
export function regionName(
  inside: number[],
  config: ValuesConfig,
): Region | null {
  if (inside.length === 0) return null;
  if (inside.length === 1) {
    const v = config.values[inside[0]];
    return { name: v.name, blurb: v.blurb };
  }
  return config.regions[keyOf(inside.map((i) => config.values[i].id))] ?? null;
}

/** "a, b and c" */
export function list(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** What a placement says, in words the reader can argue with. */
export function prose(inside: number[], values: Value[]): string {
  const serves = inside.map((i) => values[i].name);
  const silent = values
    .filter((_, i) => !inside.includes(i))
    .map((v) => v.name);
  if (serves.length === 0) return "outside every value you drew.";
  if (silent.length === 0)
    return `serves ${list(serves)} — all of them at once.`;
  return `serves ${list(serves)}. silent on ${list(silent)}.`;
}

/** The difference a heading makes: what it walks into, out of, and keeps. */
export function heading(
  from: number[],
  to: number[],
  values: Value[],
): { gains: string[]; leaves: string[]; keeps: string[] } {
  const name = (i: number) => values[i].name;
  return {
    gains: to.filter((i) => !from.includes(i)).map(name),
    leaves: from.filter((i) => !to.includes(i)).map(name),
    keeps: from.filter((i) => to.includes(i)).map(name),
  };
}

export function headingProse(
  from: number[],
  to: number[],
  values: Value[],
): string {
  const h = heading(from, to, values);
  const parts: string[] = [];
  if (h.gains.length) parts.push(`gains ${list(h.gains)}`);
  if (h.leaves.length) parts.push(`leaves ${list(h.leaves)}`);
  if (!parts.length)
    return h.keeps.length
      ? `stays within ${list(h.keeps)}.`
      : "stays outside every value.";
  if (h.keeps.length) parts.push(`keeps ${list(h.keeps)}`);
  return `${parts.join(" · ")}.`;
}

/**
 * The stones in the garden that are about a value: a term found in the title,
 * the tags or the first line. Ranked by how many terms hit, then by how
 * connected the stone is. Bodies are not searched — a value named once in
 * passing is not what the note is about.
 */
export function stonesFor(
  value: Value,
  nodes: GardenNode[],
  limit = 6,
): GardenNode[] {
  const terms = value.terms.map((t) => t.toLowerCase()).filter(Boolean);
  if (!terms.length) return [];
  const scored: { n: GardenNode; hits: number }[] = [];
  for (const n of nodes) {
    if (n.kind === "ghost" || n.kind === "repo") continue;
    const hay =
      `${n.label}\n${(n.tags ?? []).join(" ")}\n${n.description}`.toLowerCase();
    const hits = terms.filter((t) => hay.includes(t)).length;
    if (hits) scored.push({ n, hits });
  }
  scored.sort((a, b) => b.hits - a.hits || b.n.degree - a.n.degree);
  return scored.slice(0, limit).map((s) => s.n);
}

export function slugOf(title: string): string {
  const s = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || "decision";
}

const pt = (v: unknown): Pt | null =>
  Array.isArray(v) &&
  v.length === 2 &&
  Number.isFinite(Number(v[0])) &&
  Number.isFinite(Number(v[1]))
    ? [Number(v[0]), Number(v[1])]
    : null;

/** One decision, read back from its file. */
export function parseBearing(slug: string, raw: string): Bearing {
  const { data, content } = matter(raw);
  return {
    slug,
    title: String(data.title ?? slug),
    // js-yaml reads a bare date as a Date; a quoted one stays a string.
    placed:
      data.placed instanceof Date
        ? data.placed.toISOString().slice(0, 10)
        : String(data.placed ?? ""),
    at: pt(data.at),
    leads: pt(data.leads),
    note: content.trim(),
  };
}

const q = (s: string) => JSON.stringify(s);
const xy = (p: Pt) => `[${Math.round(p[0])}, ${Math.round(p[1])}]`;

/** The file a decision is kept in: frontmatter a person can edit, note below. */
export function serialiseBearing(b: Bearing): string {
  const lines = [`title: ${q(b.title)}`, `placed: ${q(b.placed)}`];
  if (b.at) lines.push(`at: ${xy(b.at)}`);
  if (b.leads) lines.push(`leads: ${xy(b.leads)}`);
  return `---\n${lines.join("\n")}\n---\n${b.note ? `${b.note}\n` : ""}`;
}

/** Validation at the boundary: a values file is hand-written and may be wrong. */
export function validateConfig(input: unknown): ValuesConfig {
  const c = input as Partial<ValuesConfig> | null;
  if (!c || typeof c !== "object") throw new Error("values: not an object");
  const layout = c.layout === 3 ? 3 : c.layout === 5 ? 5 : null;
  if (!layout) throw new Error("values: layout must be 3 or 5");
  if (!Array.isArray(c.values) || c.values.length !== layout)
    throw new Error(`values: need exactly ${layout} values for this layout`);
  const values: Value[] = c.values.map((v, i) => {
    if (!v || typeof v !== "object" || !v.name)
      throw new Error(`values: value ${i} has no name`);
    return {
      id: String(v.id ?? slugOf(String(v.name))),
      name: String(v.name),
      blurb: String(v.blurb ?? ""),
      terms: Array.isArray(v.terms) ? v.terms.map(String) : [String(v.name)],
    };
  });
  const ids = new Set(values.map((v) => v.id));
  if (ids.size !== values.length) throw new Error("values: ids must be unique");
  const regions: Record<string, Region> = {};
  for (const [k, r] of Object.entries(c.regions ?? {})) {
    const key = keyOf(k.split("+").map((s) => s.trim()));
    if (!key.split("+").every((id) => ids.has(id))) continue;
    regions[key] = {
      name: String(r?.name ?? ""),
      blurb: String(r?.blurb ?? ""),
    };
  }
  return { layout, values, regions };
}
