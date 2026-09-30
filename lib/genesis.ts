import type { GardenNode } from "./garden.ts";

/**
 * Genesis — how each stone came into the garden. The Epistemic Garden read
 * the first exchanges of a thousand friendships and found three ways they
 * start (a thread that sparked, a shared arena, a request for help). This is
 * the same question put to one garden: of the things kept, how many were met
 * in something read, told by a person, worked out with a model, found by
 * making, noticed in the day, or thought through alone — and how that sits
 * beside where the reader thinks their ideas come from.
 *
 * A route is known in one of three ways, and they are never merged: the
 * reader said so, a rule read it off the file (the Reader archive, a
 * Fieldnotes source), or the model on this machine proposed it with a quote
 * from the stone as its reason. A proposal whose quote is not in the stone is
 * dropped. The counts say which is which. Nothing here says one route is the
 * better way for an idea to arrive. Pure, testable.
 */

export const ROUTES = [
  { key: "read", name: "read", says: "met in something read, watched or heard" },
  { key: "told", name: "told", says: "came from a person, in conversation" },
  { key: "asked", name: "asked", says: "worked out in a session with a model" },
  { key: "made", name: "made", says: "found by building something" },
  { key: "lived", name: "lived", says: "noticed in the day: the body, a place, an event" },
  { key: "thought", name: "thought", says: "thought through alone, writing or walking" },
] as const;

export type Route = (typeof ROUTES)[number]["key"];
export const ROUTE_KEYS = ROUTES.map((r) => r.key) as Route[];
const isRoute = (v: unknown): v is Route =>
  typeof v === "string" && (ROUTE_KEYS as string[]).includes(v);

/** Who said which route a stone came by. Kept apart: the reader's word, a rule, a proposal. */
export type By = "you" | "rule" | "model";

export type Mark = {
  from: Route;
  by: By;
  /** Why: the reader's note, the rule's name, or the model's quote from the stone. */
  because: string;
  /** ISO day it was marked. */
  on: string;
};

/** The reader's own split, said before the counts: how many in 100 by each route. */
export type Guess = { split: Record<Route, number>; on: string };

export type Genesis = {
  guess: Guess | null;
  marks: Record<string, Mark>;
  /** Stones the model read and could not place, so they are not asked again. */
  untold: Record<string, string>;
};

export const empty = (): Genesis => ({ guess: null, marks: {}, untold: {} });

/** The beds with text in them: the same stones the distribution weighs. */
const TEXT_KINDS = new Set([
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

export const inCorpus = (n: GardenNode) =>
  TEXT_KINDS.has(n.kind) && `${n.description} ${n.body}`.trim().length >= 40;

/** What a rule can read straight off the file. Only two things say it outright. */
export function derive(n: GardenNode, on: string): Mark | null {
  if (n.kind === "reading")
    return { from: "read", by: "rule", because: "from the Reader archive", on };
  if (n.id.startsWith("note:Sources/"))
    return { from: "read", by: "rule", because: "kept under Fieldnotes Sources", on };
  return null;
}

const clean = (s: string) =>
  s
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/!?\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#*_`>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** What the model reads of a stone: its name, its line, and the top of it. */
export function opening(n: GardenNode, chars = 900): string {
  return clean(`${n.label}. ${n.description ?? ""} ${(n.body ?? "").slice(0, chars * 2)}`).slice(
    0,
    chars,
  );
}

/** For the quote check: lower case, straight quotes, one kind of dash, single spaces. */
export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\p{L}\p{N}'"\-. ,]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const SYSTEM = [
  "You sort notes from one person's garden by how the idea in each came to them.",
  "The routes. read: met in something read, watched or heard — a book, an article, a paper, a video, a podcast, a newsletter.",
  "told: from another person, in conversation — a friend, a mentor, a meeting, a call.",
  "asked: came out of a session with an AI model or assistant — the note says Claude, a model, an agent or a session proposed or worked it out.",
  "made: found while building something — code, an app, an instrument, a site, a thing made; a note that records a build is made.",
  "lived: noticed in the day — the body, health, a place, travel, an event, a feeling, a relationship.",
  "thought: thought through alone, in writing or walking — a thesis, a framework, an essay idea, with no other source shown.",
  "Choose the route the note itself shows, from its own words. A reminder, a schedule, a list or a config with no origin in it is unsaid. If you would be guessing, say unsaid.",
  "For every note give because: a short phrase copied exactly from the note, six to twenty words, that shows the route. Copy it character for character; do not paraphrase.",
  "Never judge the note or the person. Answer in JSON only.",
].join(" ");

export type Batch = { id: string; text: string }[];

export function ask(batch: Batch) {
  const ids = batch.map((b) => b.id);
  return {
    system: SYSTEM,
    user: batch.map((b) => `NOTE ${b.id}\n${b.text}`).join("\n\n"),
    schema: {
      type: "object",
      properties: {
        marks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", enum: ids },
              from: { type: "string", enum: [...ROUTE_KEYS, "unsaid"] },
              because: { type: "string" },
            },
            required: ["id", "from", "because"],
          },
        },
      },
      required: ["marks"],
    },
  };
}

/**
 * What the model sent, made safe. A mark is kept only for a note in the
 * batch, on a route that exists, with a because that is found in the note's
 * own words. A note it could not place, or placed without a quote it could
 * show, goes to `untold` with the reason, so it is not asked again.
 */
export function receive(
  raw: unknown,
  batch: Batch,
  on: string,
): { marks: Record<string, Mark>; untold: Record<string, string> } {
  const texts = new Map(batch.map((b) => [b.id, norm(b.text)]));
  const marks: Record<string, Mark> = {};
  const untold: Record<string, string> = {};
  const list = Array.isArray((raw as { marks?: unknown })?.marks)
    ? ((raw as { marks: unknown[] }).marks)
    : [];
  for (const m of list) {
    const x = (m ?? {}) as Record<string, unknown>;
    const id = typeof x.id === "string" ? x.id : "";
    const text = texts.get(id);
    if (text === undefined || marks[id]) continue;
    const because = typeof x.because === "string" ? x.because.trim().slice(0, 240) : "";
    const q = norm(because.replace(/^["'“‘]+|["'”’.]+$/g, ""));
    if (x.from === "unsaid" || !isRoute(x.from)) {
      untold[id] = "the note does not say";
      continue;
    }
    if (q.split(" ").length < 3 || !text.includes(q)) {
      untold[id] = "its reason was not in the note";
      continue;
    }
    marks[id] = { from: x.from, by: "model", because, on };
  }
  for (const b of batch) if (!marks[b.id] && !untold[b.id]) untold[b.id] = "no answer";
  return { marks, untold };
}

/** The marks that stand: the reader's word over a rule over a proposal. */
export function standing(
  nodes: GardenNode[],
  g: Genesis,
  on: string,
): Map<string, Mark> {
  const out = new Map<string, Mark>();
  for (const n of nodes) {
    if (!inCorpus(n)) continue;
    const kept = g.marks[n.id];
    if (kept?.by === "you") out.set(n.id, kept);
    else {
      const rule = derive(n, on);
      if (rule) out.set(n.id, rule);
      else if (kept) out.set(n.id, kept);
    }
  }
  return out;
}

export type Tally = {
  stones: number;
  byRoute: Record<Route, Record<By, number>>;
  /** Stones no one has placed yet, and ones the model read and could not. */
  unread: number;
  untold: number;
  /** Placed stones by bed and route. */
  byBed: Record<string, Record<Route, number>>;
};

const zeros = <T,>(v: () => T) =>
  Object.fromEntries(ROUTE_KEYS.map((k) => [k, v()])) as Record<Route, T>;

/** One stone as the sheet counts it: its bed, the mark that stands, and whether the model read it and could not place it. */
export type Row = { id: string; kind: string; mark: Mark | null; untold: boolean };

export function rows(nodes: GardenNode[], g: Genesis, on: string): Row[] {
  const corpus = nodes.filter(inCorpus);
  const s = standing(corpus, g, on);
  return corpus.map((n) => ({
    id: n.id,
    kind: n.kind,
    mark: s.get(n.id) ?? null,
    untold: !s.get(n.id) && Boolean(g.untold[n.id]),
  }));
}

export function count(rs: Row[]): Tally {
  const byRoute = zeros(() => ({ you: 0, rule: 0, model: 0 }) as Record<By, number>);
  const byBed: Record<string, Record<Route, number>> = {};
  let unread = 0;
  let untold = 0;
  for (const r of rs) {
    if (!r.mark) {
      if (r.untold) untold++;
      else unread++;
      continue;
    }
    byRoute[r.mark.from][r.mark.by]++;
    (byBed[r.kind] ??= zeros(() => 0))[r.mark.from]++;
  }
  return { stones: rs.length, byRoute, unread, untold, byBed };
}

export const tally = (nodes: GardenNode[], g: Genesis, on: string): Tally =>
  count(rows(nodes, g, on));

export const placed = (t: Tally) =>
  ROUTE_KEYS.reduce((a, k) => a + t.byRoute[k].you + t.byRoute[k].rule + t.byRoute[k].model, 0);

export const countOf = (t: Tally, r: Route) =>
  t.byRoute[r].you + t.byRoute[r].rule + t.byRoute[r].model;

/** A count said in 100, of the placed. */
export const share = (t: Tally, r: Route) => {
  const p = placed(t);
  return p ? Math.round((countOf(t, r) / p) * 100) : 0;
};

/** The reader's split, made to sum to 100 in whole numbers. */
export function normaliseSplit(raw: Partial<Record<Route, number>>): Record<Route, number> {
  const vals = ROUTE_KEYS.map((k) => Math.max(0, Number(raw[k]) || 0));
  const sum = vals.reduce((a, b) => a + b, 0);
  if (!sum) return zeros(() => 0);
  const exact = vals.map((v) => (v / sum) * 100);
  const out = exact.map(Math.floor);
  let left = 100 - out.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => [v - Math.floor(v), i] as const)
    .sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) if (left-- > 0) out[i]++;
  return Object.fromEntries(ROUTE_KEYS.map((k, i) => [k, out[i]])) as Record<Route, number>;
}

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/** The counts said back. Your split beside the garden's, never graded. */
export function readings(t: Tally, guess: Guess | null): string[] {
  const p = placed(t);
  const you = ROUTE_KEYS.reduce((a, k) => a + t.byRoute[k].you, 0);
  const rule = ROUTE_KEYS.reduce((a, k) => a + t.byRoute[k].rule, 0);
  const model = ROUTE_KEYS.reduce((a, k) => a + t.byRoute[k].model, 0);
  const out = [
    `${plural(t.stones, "stone")} with words in them; ${p} placed — ${you} by you, ${rule} read off the file, ${model} proposed by the model and not yet yours.`,
  ];
  if (t.unread || t.untold)
    out.push(
      `${t.unread} not yet read${t.untold ? `; ${t.untold} read and not placed, because the note does not say or its reason could not be shown` : ""}.`,
    );
  if (p) {
    const order = [...ROUTE_KEYS].sort((a, b) => countOf(t, b) - countOf(t, a));
    out.push(
      `By count: ${order
        .filter((k) => countOf(t, k))
        .map((k) => `${k} ${countOf(t, k)} (${share(t, k)} in 100)`)
        .join(" · ")}.`,
    );
  }
  if (guess && p) {
    const far = [...ROUTE_KEYS]
      .map((k) => [k, share(t, k) - guess.split[k]] as const)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
    out.push(
      `You said ${ROUTE_KEYS.map((k) => `${k} ${guess.split[k]}`).join(" · ")}, in 100. ` +
        (far[1] === 0
          ? "Every route sits where you put it."
          : `The widest gap is ${far[0]}: you said ${guess.split[far[0]]} in 100, the garden has ${share(t, far[0])}.`),
    );
  }
  return out;
}

// ── the file ───────────────────────────────────────────────────────────────

const day = /^\d{4}-\d{2}-\d{2}$/;

/** The file read back, keeping only what is a mark. A hand-edited file that has gone wrong loses the wrong lines, not the rest. */
export function parse(raw: unknown): Genesis {
  const r = (raw ?? {}) as Record<string, unknown>;
  const g = empty();
  const gs = r.guess as Record<string, unknown> | null | undefined;
  if (gs && typeof gs === "object" && gs.split && typeof gs.split === "object") {
    const split = normaliseSplit(gs.split as Record<Route, number>);
    if (ROUTE_KEYS.some((k) => split[k] > 0))
      g.guess = { split, on: typeof gs.on === "string" && day.test(gs.on) ? gs.on : "" };
  }
  const ms = r.marks && typeof r.marks === "object" ? (r.marks as Record<string, unknown>) : {};
  for (const [id, v] of Object.entries(ms)) {
    const x = (v ?? {}) as Record<string, unknown>;
    if (!isRoute(x.from)) continue;
    const by: By = x.by === "you" || x.by === "rule" || x.by === "model" ? x.by : "you";
    if (by === "rule") continue; // rules are read off the file every time, never kept
    g.marks[id] = {
      from: x.from,
      by,
      because: typeof x.because === "string" ? x.because.slice(0, 400) : "",
      on: typeof x.on === "string" && day.test(x.on) ? x.on : "",
    };
  }
  const un = r.untold && typeof r.untold === "object" ? (r.untold as Record<string, unknown>) : {};
  for (const [id, v] of Object.entries(un)) if (typeof v === "string") g.untold[id] = v.slice(0, 120);
  return g;
}

/** Stable order, so a hand edit and a diff read cleanly. */
export function serialise(g: Genesis): string {
  const sort = <T,>(o: Record<string, T>) =>
    Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  return `${JSON.stringify({ guess: g.guess, marks: sort(g.marks), untold: sort(g.untold) }, null, 2)}\n`;
}
