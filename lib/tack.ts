import matter from "gray-matter";
import type { GardenNode } from "./garden.ts";
import { leans as leansOn, norm, type Lean } from "./mask.ts";
import { wordsOf } from "./provenance.ts";
import { sentencesOf, slugOf as datedSlug, uid } from "./way.ts";

/**
 * The tack: directional accuracy as an instrument. You cannot sail straight
 * at what is so; you hold a heading, see what the water does, and correct —
 * a tack at a time, never a flip. A claim is set down and sorted by one
 * question, the flinch: do you want evidence to be able to change this? If
 * yes it is a belief and goes in the sails — held as a lean on a line from
 * "not so" to "so" that never reaches either end, with what it would expect
 * to see written down (the rent a belief pays), and every move dated with
 * what was seen. If asking felt like a small betrayal it is a commitment
 * and goes in the hull — chosen, not derived; held until a day the reader
 * names, no evidence owed; reopened only on the record. The desk reads back
 * the tacks, the steps, the crossings, the rent, the window. It never says
 * whether a claim is so, how likely, or what to hold: the judgment is the
 * reader's, and the model on this machine may only be asked what to go and
 * look at.
 */

export type Layer = "sail" | "hull";
export const LAYERS: Layer[] = ["sail", "hull"];
export const LAYER_LABEL: Record<Layer, string> = {
  sail: "in the sails",
  hull: "in the hull",
};
export const LAYER_KIND: Record<Layer, string> = {
  sail: "a belief",
  hull: "a commitment",
};

/** What a sighting matched: the rent the belief said it would pay. */
export type Rent = "" | "so" | "not" | "neither";
export const RENTS: Rent[] = ["so", "not", "neither"];
export const RENT_LABEL: Record<Rent, string> = {
  "": "unsaid",
  so: "as expected if so",
  not: "as expected if not",
  neither: "said nothing either way",
};

/** Which way seeing a thing would move the reader. */
export type Moves = "so" | "not" | "either";
export const MOVES: Moves[] = ["so", "not", "either"];
export const MOVES_LABEL: Record<Moves, string> = {
  so: "seeing it would move you toward so",
  not: "seeing it would move you toward not",
  either: "it could go either way",
};
export const MOVES_SHORT: Record<Moves, string> = {
  so: "toward so",
  not: "toward not",
  either: "either way",
};

export type By = "you" | "garden" | "proposed";
export type Went = "held" | "let-go";
export const WENT_LABEL: Record<Went, string> = {
  held: "held again",
  "let-go": "let go",
};

/** One move of the lean: the day, where it now leans, what was seen, and what that matched. */
export type Tack = { on: string; at: number; saw: string; rent: Rent };

/** Something to go and look at that would move the lean. */
export type Look = {
  id: string;
  text: string;
  moves: Moves;
  by: By;
  kept: boolean;
  /** The day it was looked at, or "". */
  looked: string;
  stone: string | null;
};

/** A commitment's question, reopened: what was said, and whether it was held again or let go. */
export type Reopen = {
  on: string;
  said: string;
  went: Went;
  until: string;
  early: boolean;
};

export type Claim = {
  slug: string;
  title: string;
  /** The claim itself: what you think is so, or what you are loyal to. */
  text: string;
  layer: Layer;
  /** What the reader said when asked whether they want evidence to be able to change this. */
  flinch: string;
  /* the sails */
  ifSo: string;
  ifNot: string;
  tacks: Tack[];
  looks: Look[];
  /* the hull */
  why: string;
  chosen: string;
  until: string;
  letGo: string;
  reopened: Reopen[];
  stone: string | null;
  opened: string;
  touched: string;
  note: string;
};

export type Proposal = {
  looks: { text: string; moves: Moves; by: By; stone: string | null }[];
};

export { uid };

/** 0 and 1 are not probabilities: a lean lives strictly between the ends. */
export const clampLean = (n: number) =>
  Math.min(99, Math.max(1, Math.round(Number.isFinite(n) ? n : 50)));

export const emptyClaim = (today: string): Claim => ({
  slug: "",
  title: "",
  text: "",
  layer: "sail",
  flinch: "",
  ifSo: "",
  ifNot: "",
  tacks: [],
  looks: [],
  why: "",
  chosen: "",
  until: "",
  letGo: "",
  reopened: [],
  stone: null,
  opened: today,
  touched: today,
  note: "",
});

export const leanNow = (c: Claim): number | null => c.tacks.at(-1)?.at ?? null;

/* ── days ──────────────────────────────────────────────────────────────── */

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const utc = (d: string) =>
  Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));

/** Whole days from a to b; negative when b is before a. */
export function daysBetween(a: string, b: string): number {
  if (!DAY.test(a) || !DAY.test(b)) return 0;
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

const MONTHS = [
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
export const monthOf = (iso: string) =>
  DAY.test(iso.slice(0, 10))
    ? `${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`
    : "";

/* ── the tally and the readings ────────────────────────────────────────── */

export type Tally = {
  layer: Layer;
  n: number;
  first: Tack | null;
  last: Tack | null;
  now: number | null;
  towardSo: number;
  towardNot: number;
  still: number;
  largest: number;
  /** Steps that took the lean across the middle in one move. */
  crossed: number;
  sinceLast: number | null;
  rent: Record<Rent, number>;
  expects: "both" | "so" | "not" | "none";
  looksKept: number;
  looksHollow: number;
  looked: number;
  held: number | null;
  toGo: number | null;
  open: boolean;
  letGo: boolean;
  reopens: number;
  early: number;
  heldAgain: number;
};

export function tally(c: Claim, today: string): Tally {
  const tacks = c.tacks;
  let towardSo = 0;
  let towardNot = 0;
  let still = 0;
  let largest = 0;
  let crossed = 0;
  for (let i = 1; i < tacks.length; i++) {
    const d = tacks[i].at - tacks[i - 1].at;
    if (d > 0) towardSo++;
    else if (d < 0) towardNot++;
    else still++;
    largest = Math.max(largest, Math.abs(d));
    if (
      (tacks[i - 1].at < 50 && tacks[i].at > 50) ||
      (tacks[i - 1].at > 50 && tacks[i].at < 50)
    )
      crossed++;
  }
  const rent: Record<Rent, number> = { "": 0, so: 0, not: 0, neither: 0 };
  for (const t of tacks.slice(1)) rent[t.rent]++;
  const last = tacks.at(-1) ?? null;
  const so = Boolean(c.ifSo.trim());
  const not = Boolean(c.ifNot.trim());
  const chosen = c.chosen || c.opened;
  const letGo = Boolean(c.letGo);
  return {
    layer: c.layer,
    n: tacks.length,
    first: tacks[0] ?? null,
    last,
    now: last?.at ?? null,
    towardSo,
    towardNot,
    still,
    largest,
    crossed,
    sinceLast: last ? daysBetween(last.on, today) : null,
    rent,
    expects: so && not ? "both" : so ? "so" : not ? "not" : "none",
    looksKept: c.looks.filter((l) => l.kept).length,
    looksHollow: c.looks.filter((l) => !l.kept).length,
    looked: c.looks.filter((l) => l.kept && l.looked).length,
    held:
      c.layer === "hull" ? daysBetween(chosen, letGo ? c.letGo : today) : null,
    toGo:
      c.layer === "hull" && c.until && !letGo
        ? daysBetween(today, c.until)
        : null,
    open:
      c.layer === "hull" &&
      !letGo &&
      Boolean(c.until) &&
      daysBetween(c.until, today) >= 0,
    letGo,
    reopens: c.reopened.length,
    early: c.reopened.filter((r) => r.early).length,
    heldAgain: c.reopened.filter((r) => r.went === "held").length,
  };
}

const n = (k: number, one: string, many = `${one}s`) =>
  `${k} ${k === 1 ? one : many}`;
const list = (xs: string[]) => xs.map((w) => `'${w}'`).join(", ");
const ago = (d: number) =>
  d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;

/** Facts about one claim's record; none a verdict on the claim or on the reader. */
export function readings(c: Claim, t: Tally, values: Lean[]): string[] {
  const out: string[] = [];
  if (c.layer === "sail") {
    if (!t.first) out.push("not yet put down on the line");
    else if (t.n === 1)
      out.push(
        `first put ${t.first.on} at ${t.first.at}, and not tacked since`,
      );
    else
      out.push(
        `first put ${t.first.on} at ${t.first.at} · now at ${t.now} after ${n(t.n - 1, "tack")} · moved toward so ×${t.towardSo}, toward not ×${t.towardNot}${t.still ? `, held still ×${t.still}` : ""} · largest step ${t.largest}` +
          (t.crossed
            ? ` · crossed the middle ${n(t.crossed, "time")} in one step`
            : " · never crossed the middle in one step"),
      );
    if (t.last && t.n > 1) out.push(`last tack ${ago(t.sinceLast ?? 0)}`);
    out.push(
      t.expects === "both"
        ? "what it expects to see is named both ways"
        : t.expects === "so"
          ? "what it expects to see is named only if so — nothing yet for if not"
          : t.expects === "not"
            ? "what it expects to see is named only if not — nothing yet for if so"
            : "nothing it expects to see is named — the belief has not said what would pay its rent",
    );
    if (t.n > 1) {
      const seen = t.rent.so + t.rent.not + t.rent.neither + t.rent[""];
      out.push(
        `${n(seen, "sighting")}: ×${t.rent.so} as expected if so, ×${t.rent.not} as expected if not, ×${t.rent.neither} that said nothing either way${t.rent[""] ? `, ×${t.rent[""]} unsaid` : ""}`,
      );
    }
    if (t.looksKept || t.looksHollow)
      out.push(
        `what would move it: ${n(t.looksKept, "look")} kept${t.looked ? `, ${t.looked} looked at` : ""}${t.looksHollow ? `, ${t.looksHollow} proposed and hollow` : ""}`,
      );
    else out.push("nothing named yet that would move it");
  } else {
    const chosen = c.chosen || c.opened;
    out.push(
      t.letGo
        ? `chosen ${chosen}, held ${n(t.held ?? 0, "day")}, let go ${c.letGo}`
        : `chosen ${chosen}, held ${n(t.held ?? 0, "day")} so far`,
    );
    if (!t.letGo)
      out.push(
        !c.until
          ? "no window set — you have not said when you will look at this again"
          : t.open
            ? `the window opened ${c.until}${(t.toGo ?? 0) < 0 ? `, ${ago(-(t.toGo ?? 0))}` : ", today"} — you said you would look again, and it is on the record whether you do`
            : `you said not before ${c.until} — ${n(t.toGo ?? 0, "day")} to go`,
      );
    if (t.reopens)
      out.push(
        `reopened ${n(t.reopens, "time")}${t.early ? `, ${t.early} of them early` : ""}: held again ×${t.heldAgain}, let go ×${t.reopens - t.heldAgain}`,
      );
    else out.push("never reopened");
    out.push(
      c.why.trim()
        ? "why you hold it is written"
        : "why you hold it is not written — none is owed, but it is yours to have",
    );
  }
  if (values.length)
    out.push(`leans on ${list(values.map((v) => v.name))}, by their terms`);
  return out;
}

/** Facts about the whole sheet: how much is in the sails, how much in the hull. */
export function wholeReadings(claims: Claim[], today: string): string[] {
  const sails = claims.filter((c) => c.layer === "sail");
  const hull = claims.filter((c) => c.layer === "hull" && !c.letGo);
  const gone = claims.filter((c) => c.layer === "hull" && c.letGo);
  if (!claims.length) return ["nothing set down yet"];
  const out = [
    `${n(sails.length, "belief")} in the sails · ${n(hull.length, "commitment")} in the hull${gone.length ? ` · ${gone.length} let go` : ""}`,
  ];
  if (sails.length) {
    const unpaid = sails.filter(
      (c) => !c.ifSo.trim() && !c.ifNot.trim(),
    ).length;
    const once = sails.filter((c) => c.tacks.length <= 1).length;
    const quiet = sails.filter(
      (c) => c.tacks.length && daysBetween(c.tacks.at(-1)!.on, today) > 30,
    ).length;
    if (unpaid)
      out.push(
        `${unpaid} of the sails ${unpaid === 1 ? "has" : "have"} named nothing ${unpaid === 1 ? "it" : "they"} would expect to see`,
      );
    if (once) out.push(`${once} put down once and never tacked`);
    if (quiet) out.push(`${quiet} not tacked in over a month`);
  }
  if (!hull.length && sails.length) out.push("the hull is empty");
  if (hull.length) {
    const open = hull.filter(
      (c) => c.until && daysBetween(c.until, today) >= 0,
    ).length;
    const noWindow = hull.filter((c) => !c.until).length;
    if (open) out.push(`${n(open, "window")} open in the hull`);
    if (noWindow) out.push(`${noWindow} in the hull with no window set`);
  }
  return out;
}

/** Which of the reader's values a claim leans on, by the values' own terms. */
export const leansOnValues = (
  c: Claim,
  values: { name: string; terms: string[] }[],
): Lean[] => leansOn(`${c.text} ${c.why} ${c.ifSo} ${c.ifNot}`, values);

/* ── what the garden offers to look at ─────────────────────────────────── */

type Stone = Pick<
  GardenNode,
  "id" | "label" | "description" | "body" | "stage" | "modified"
>;

/**
 * Stones that speak of the same things as the claim: places to go back and
 * look, offered hollow. A word the whole garden uses ('more', 'home') says
 * nothing about kinship, so only words rare across the garden count, and two
 * of them must be shared.
 */
export function gardenLooks(text: string, nodes: Stone[], except: string | null = null): Proposal["looks"] {
  const mine = wordsOf(text);
  if (!mine.size) return [];
  const bags = nodes.filter((s) => s.id !== except).map((s) => ({ s, words: wordsOf(`${s.label} ${s.description} ${(s.body ?? "").slice(0, 600)}`) }));
  const ceiling = Math.max(3, Math.floor(bags.length * 0.03));
  const rare = [...mine.keys()].filter((w) => w.length >= 4 && bags.filter((b) => b.words.has(w)).length <= ceiling);
  if (!rare.length) return [];
  return bags
    .map(({ s, words }) => ({ s, shared: rare.filter((w) => words.has(w)) }))
    .filter((x) => x.shared.length >= 2)
    .sort((a, b) => b.shared.length - a.shared.length || (a.s.stage === "fallow" ? -1 : 0) - (b.s.stage === "fallow" ? -1 : 0))
    .slice(0, 5)
    .map(({ s, shared }) => ({
      text: `Go back to “${s.label}”: it speaks of ${list(shared.slice(0, 3))} too${s.stage === "fallow" && s.modified ? `, and has lain fallow since ${monthOf(s.modified)}` : ""}. What does it expect that this does not?`,
      moves: "either" as Moves,
      by: "garden" as By,
      stone: s.id,
    }));
}

/* ── asking what to look at ────────────────────────────────────────────── */

const SYSTEM = (today: string) =>
  [
    "You are asked what someone could go and look at — in the world, or in their own record — that would move them on a claim, one way or the other.",
    "You never say whether the claim is so, how likely it is, or what they should believe or do. No probabilities, no advice, no verdict, no encouragement.",
    "Each look is one plain sentence naming something they could actually see, ask, count or read, specific enough to go and do this week. Invent no facts.",
    `Today is ${today}.`,
    "Answer in JSON only.",
  ].join(" ");

export function askLooks(c: Claim, today: string) {
  const already = c.looks.filter((l) => l.kept).map((l) => l.text);
  return {
    system: SYSTEM(today),
    user: [
      `THE CLAIM:\n${c.text.trim() || "(not written)"}`,
      c.ifSo.trim() ? `IF IT IS SO, they expect to see:\n${c.ifSo.trim()}` : "",
      c.ifNot.trim()
        ? `IF IT IS NOT, they expect to see:\n${c.ifNot.trim()}`
        : "",
      already.length ? `Already on the sheet: ${already.join(" · ")}` : "",
      "Give 3 to 6 looks. For each: text — one sentence, under 30 words, something to go and see, ask, count or read; and moves — 'so' if seeing it would move them toward the claim being so, 'not' if toward its not being so, 'either' if what they see could move them either way.",
      "At least one look should be able to move them toward not. Do not repeat what is already on the sheet. Do not say whether the claim is so.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    schema: {
      type: "object",
      properties: {
        looks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              moves: { type: "string", enum: MOVES },
            },
            required: ["text", "moves"],
          },
        },
      },
      required: ["looks"],
    },
  };
}

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** A look that carries a verdict is not a look. */
const VERDICT =
  /\b(likely|unlikely|probabl\w*|you should|is true|is false|certainly|obviously|you are (?:right|wrong)|the claim is|clearly)\b/i;

/** What came back, held to its role: places to look, never a verdict. */
export function validateProposal(raw: unknown): Proposal {
  const r = (raw ?? {}) as Record<string, unknown>;
  const arr = Array.isArray(r.looks) ? r.looks.slice(0, 8) : [];
  return {
    looks: arr
      .map((x) => {
        const o = (x ?? {}) as Record<string, unknown>;
        const moves = str(o.moves, 10) as Moves;
        return {
          text: str(o.text, 300),
          moves,
          by: "proposed" as By,
          stone: null,
        };
      })
      .filter(
        (l) => l.text && MOVES.includes(l.moves) && !VERDICT.test(l.text),
      ),
  };
}

/** Fold proposals in as hollow; nothing already there is repeated. */
export function adopt(
  c: Claim,
  p: Proposal,
  today: string,
  id: () => string = uid,
): Claim {
  const have = new Set(c.looks.map((l) => norm(l.text)));
  const fresh = p.looks.filter((l) => !have.has(norm(l.text)));
  for (const l of fresh) have.add(norm(l.text));
  return {
    ...c,
    looks: [
      ...c.looks,
      ...fresh.map((l) => ({
        id: id(),
        text: l.text,
        moves: l.moves,
        by: l.by,
        kept: false,
        looked: "",
        stone: l.stone,
      })),
    ],
    touched: today,
  };
}

export const proposedCount = (c: Claim) =>
  c.looks.filter((l) => !l.kept).length;

export function keepAll(c: Claim, yes: boolean): Claim {
  return {
    ...c,
    looks: yes
      ? c.looks.map((l) => ({ ...l, kept: true }))
      : c.looks.filter((l) => l.kept),
  };
}

/* ── the file ──────────────────────────────────────────────────────────── */

export const slugOf = datedSlug;

export function titleOf(c: { title: string; text: string }): string {
  if (c.title.trim()) return c.title.trim();
  const first = (sentencesOf(c.text)[0] ?? c.text.trim())
    .replace(/[.!…]+$/, "")
    .trim();
  if (first) return first.length > 72 ? `${first.slice(0, 69).trim()}…` : first;
  return "a claim";
}

const y = (s: string | null | boolean) => JSON.stringify(s);

export function serialiseClaim(c: Claim): string {
  const lines = [`title: ${y(c.title)}`, `layer: ${c.layer}`];
  if (c.flinch.trim()) lines.push(`flinch: ${y(c.flinch.trim())}`);
  if (c.stone) lines.push(`stone: ${y(c.stone)}`);
  lines.push(`opened: ${y(c.opened)}`, `touched: ${y(c.touched)}`);
  if (c.chosen) lines.push(`chosen: ${y(c.chosen)}`);
  if (c.until) lines.push(`until: ${y(c.until)}`);
  if (c.letGo) lines.push(`letGo: ${y(c.letGo)}`);
  if (c.looks.length) {
    lines.push("looks:");
    for (const l of c.looks)
      lines.push(
        `  - { id: ${y(l.id)}, text: ${y(l.text)}, moves: ${y(l.moves)}, by: ${y(l.by)}, kept: ${l.kept}, looked: ${y(l.looked)}${l.stone ? `, stone: ${y(l.stone)}` : ""} }`,
      );
  }
  const body = [`## the claim\n\n${c.text.trim()}`];
  if (c.layer === "sail" || c.ifSo.trim() || c.ifNot.trim())
    body.push(`## if so\n\n${c.ifSo.trim()}`, `## if not\n\n${c.ifNot.trim()}`);
  if (c.layer === "hull" || c.why.trim())
    body.push(`## why\n\n${c.why.trim()}`);
  if (c.tacks.length)
    body.push(
      `## the tacks\n\n${c.tacks
        .map(
          (t) =>
            `### ${t.on} · at ${t.at}${t.rent ? ` · ${RENT_LABEL[t.rent]}` : ""}\n\n${t.saw.trim()}`,
        )
        .join("\n\n")}`,
    );
  if (c.reopened.length)
    body.push(
      `## reopened\n\n${c.reopened
        .map(
          (r) =>
            `### ${r.on} · ${r.went === "held" ? `held again until ${r.until || "no day named"}` : "let go"}${r.early ? " · early" : ""}\n\n${r.said.trim()}`,
        )
        .join("\n\n")}`,
    );
  if (c.note.trim()) body.push(`## note\n\n${c.note.trim()}`);
  return `---\n${lines.join("\n")}\n---\n\n${body.join("\n\n")}\n`;
}

const TACK_HEAD = /^### (\d{4}-\d{2}-\d{2}) · at (\d{1,2})(?: · (.+))?\s*$/;
const REOPEN_HEAD =
  /^### (\d{4}-\d{2}-\d{2}) · (held again until (\S+)|let go)( · early)?\s*$/;

/** Sub-entries under a section: each begins with a `### ` heading; the text after it is the body. */
function entries(section: string): { head: string; body: string }[] {
  const out: { head: string; body: string }[] = [];
  for (const line of section.split("\n")) {
    if (line.startsWith("### ")) out.push({ head: line, body: "" });
    else if (out.length) out[out.length - 1].body += `${line}\n`;
  }
  return out.map((e) => ({ head: e.head, body: e.body.trim() }));
}

export function parseClaim(slug: string, raw: string): Claim {
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
  const rentOf = (label: string | undefined): Rent =>
    (RENTS.find((r) => RENT_LABEL[r] === label?.trim()) ?? "") as Rent;
  const tacks = entries(sec("the tacks"))
    .map((e) => {
      const m = e.head.match(TACK_HEAD);
      return m
        ? { on: m[1], at: Number(m[2]), saw: e.body, rent: rentOf(m[3]) }
        : null;
    })
    .filter((t): t is Tack => t !== null);
  const reopened = entries(sec("reopened"))
    .map((e) => {
      const m = e.head.match(REOPEN_HEAD);
      if (!m) return null;
      const held = m[2].startsWith("held");
      return {
        on: m[1],
        said: e.body,
        went: (held ? "held" : "let-go") as Went,
        until: held && DAY.test(m[3] ?? "") ? m[3] : "",
        early: Boolean(m[4]),
      };
    })
    .filter((r): r is Reopen => r !== null);
  return validateClaim(
    {
      slug,
      title: data.title,
      text: sec("the claim"),
      layer: data.layer,
      flinch: data.flinch,
      ifSo: sec("if so"),
      ifNot: sec("if not"),
      tacks,
      looks: data.looks,
      why: sec("why"),
      chosen: data.chosen,
      until: data.until,
      letGo: data.letGo,
      reopened,
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

/** Validation at the boundary: a claim arrives from the desk, or from a hand-edited file. */
export function validateClaim(input: unknown, today: string): Claim {
  const r = (input ?? {}) as Record<string, unknown>;
  const text = typeof r.text === "string" ? r.text.trim().slice(0, 2000) : "";
  if (!text) throw new Error("a claim needs its words");
  const day = (v: unknown, fallback = today) =>
    typeof v === "string" && DAY.test(v) ? v : fallback;
  const long = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";
  const layer: Layer = r.layer === "hull" ? "hull" : "sail";
  const tacks: Tack[] = (Array.isArray(r.tacks) ? r.tacks : [])
    .slice(0, 500)
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const rent = str(o.rent, 10) as Rent;
      return {
        on: day(o.on),
        at: clampLean(Number(o.at)),
        saw: long(o.saw, 2000),
        rent: RENTS.includes(rent) ? rent : ("" as Rent),
      };
    });
  const looks: Look[] = (Array.isArray(r.looks) ? r.looks : [])
    .slice(0, 100)
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const moves = str(o.moves, 10) as Moves;
      return {
        id: str(o.id, 24) || uid(),
        text: str(o.text, 300),
        moves: MOVES.includes(moves) ? moves : ("either" as Moves),
        by:
          o.by === "proposed"
            ? ("proposed" as By)
            : o.by === "garden"
              ? ("garden" as By)
              : ("you" as By),
        kept: o.kept !== false,
        looked: day(o.looked, ""),
        stone: str(o.stone, 200) || null,
      };
    })
    .filter((l) => l.text);
  const reopened: Reopen[] = (Array.isArray(r.reopened) ? r.reopened : [])
    .slice(0, 100)
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return {
        on: day(o.on),
        said: long(o.said, 2000),
        went: (o.went === "let-go" ? "let-go" : "held") as Went,
        until: day(o.until, ""),
        early: o.early === true,
      };
    });
  const c: Claim = {
    slug: str(r.slug, 120),
    title: str(r.title, 120),
    text,
    layer,
    flinch: long(r.flinch, 400),
    ifSo: long(r.ifSo, 2000),
    ifNot: long(r.ifNot, 2000),
    tacks,
    looks,
    why: long(r.why, 4000),
    chosen: day(r.chosen, ""),
    until: day(r.until, ""),
    letGo: day(r.letGo, ""),
    reopened,
    stone: str(r.stone, 200) || null,
    opened: day(r.opened),
    touched: day(r.touched),
    note: long(r.note, 4000),
  };
  c.title = titleOf(c);
  if (!c.slug) c.slug = slugOf(c.title, c.opened);
  return c;
}
