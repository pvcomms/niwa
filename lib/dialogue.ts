import matter from "gray-matter";
import type { GardenNode } from "./garden.ts";
import type { Input } from "./course.ts";
import { gainedLost } from "./provenance.ts";
import { sentencesOf, slugOf as datedSlug, uid } from "./way.ts";

/**
 * The dialogue: Socratic questioning as an instrument. One person puts a
 * thesis down and is asked — systematically, across six families of
 * question, in the open — until its meaning is clearer and the assumptions
 * under it are on the table. The questions come from the reader, from a
 * bank in their words, from the garden's own record, and from the model on
 * this machine, which is only ever asked what to ask. Nothing here answers,
 * agrees, disagrees, or says whether the thesis holds; the reader answers
 * in their own words and re-puts the thesis when they are ready.
 */

export type Family =
  | "clarify"
  | "assume"
  | "evidence"
  | "viewpoint"
  | "consequence"
  | "question";

export const FAMILIES: Family[] = [
  "clarify",
  "assume",
  "evidence",
  "viewpoint",
  "consequence",
  "question",
];

export const FAMILY_LABEL: Record<Family, string> = {
  clarify: "clarifying",
  assume: "assumptions",
  evidence: "reasons and evidence",
  viewpoint: "other viewpoints",
  consequence: "implications",
  question: "the question itself",
};

export const FAMILY_BLURB: Record<Family, string> = {
  clarify: "what is meant — the words, an example, the thing itself",
  assume: "what is taken for granted for this to be said at all",
  evidence: "how it is known — what it rests on, what would change it",
  viewpoint: "who would put it differently, and what they would say",
  consequence: "what follows if it is so — and if it is not",
  question: "why this is being asked, and what the asking is for",
};

export type By = "you" | "bank" | "garden" | "proposed";

export const BY_LABEL: Record<By, string> = {
  you: "you",
  bank: "the bank",
  garden: "the garden",
  proposed: "proposed",
};

export type Turn = {
  id: string;
  family: Family;
  question: string;
  by: By;
  /** A proposed question is hollow until kept. */
  kept: boolean;
  /** The reader's answer, in their words. */
  answer: string;
  /** The stone a garden question was asked from. */
  stone: string | null;
  /** The day it was asked. */
  on: string;
};

export type Examined = "" | "holds" | "fell" | "cannot";
export const EXAMINED_LABEL: Record<Examined, string> = {
  "": "not examined",
  holds: "holds",
  fell: "fell",
  cannot: "cannot say",
};

export type Assumption = {
  id: string;
  text: string;
  /** The turn it was heard in, when it was. */
  turn: string | null;
  by: "you" | "proposed";
  kept: boolean;
  examined: Examined;
  note: string;
};

export type Term = {
  id: string;
  word: string;
  meaning: string;
  turn: string | null;
};

export type Dialogue = {
  slug: string;
  title: string;
  /** The thesis as first said. Never rewritten; the re-putting goes in `now`. */
  thesis: string;
  /** The thesis as it stands now, once re-put. */
  now: string;
  stone: string | null;
  opened: string;
  touched: string;
  turns: Turn[];
  assumptions: Assumption[];
  terms: Term[];
  note: string;
};

export type Proposal = {
  questions: { family: Family; text: string; quote: string }[];
  assumptions: { text: string; turn: string }[];
};

export { uid };

export const emptyDialogue = (today: string): Dialogue => ({
  slug: "",
  title: "",
  thesis: "",
  now: "",
  stone: null,
  opened: today,
  touched: today,
  turns: [],
  assumptions: [],
  terms: [],
  note: "",
});

/* ── open questions ────────────────────────────────────────────────────── */

const CLOSED = /^(is|are|was|were|do|does|did|can|could|will|would|should|has|have|had|am|isn't|aren't|don't|doesn't|didn't|can't|couldn't|won't|wouldn't|shouldn't)\b/i;

const WH = /^(how|why|what|which|where|when|who|whose|whom|in what|to what|by what)\b/i;
const CLOSED_CLAUSE =
  /[,;—-]\s*(would|could|does|do|is|are|did|can|will|should|has|have|might) (that|this|it|you|they|we|there|he|she)\b/i;

/**
 * A Socratic question is open: it asks, and it cannot be answered with yes
 * or no. So it carries a question mark or opens with a question word; a
 * statement is not a question however probing. One that opens with an
 * auxiliary is closed unless it goes on to ask how, why, what or which.
 */
export function isOpen(q: string): boolean {
  const t = q.trim();
  if (!t) return false;
  if (!t.includes("?") && !WH.test(t)) return false;
  const wh = /\b(how|why|what|which|where|when|who|whose|whom)\b/i;
  if (CLOSED.test(t)) return wh.test(t.replace(CLOSED, ""));
  // "If so, would that be enough?" — a yes/no question behind a leading clause.
  if (CLOSED_CLAUSE.test(t) && !wh.test(t)) return false;
  return true;
}

/* ── the bank ──────────────────────────────────────────────────────────── */

export type Bank = Record<Family, string[]>;

export const emptyBank = (): Bank => ({
  clarify: [],
  assume: [],
  evidence: [],
  viewpoint: [],
  consequence: [],
  question: [],
});

const familyOf = (heading: string): Family | null => {
  const h = heading.toLowerCase().trim();
  for (const f of FAMILIES)
    if (h === f || h === FAMILY_LABEL[f] || h.startsWith(f) || FAMILY_LABEL[f].startsWith(h))
      return f;
  return null;
};

/**
 * The reader's own bank: a markdown file with one heading per family and
 * one question per line or paragraph under it. Lines under a heading the
 * bank does not know are left where they are.
 */
export function parseBank(raw: string): Bank {
  const bank = emptyBank();
  const { content } = matter(raw);
  let cur: Family | null = null;
  for (const line of content.split("\n")) {
    const h = line.match(/^#{1,3}\s+(.+?)\s*$/);
    if (h) {
      cur = familyOf(h[1]);
      continue;
    }
    const t = line.replace(/^\s*[-*]\s+/, "").trim();
    if (cur && t && !t.startsWith("#")) bank[cur].push(t);
  }
  return bank;
}

export function serialiseBank(b: Bank): string {
  return (
    `---\ntitle: "your questions"\n---\n\n` +
    FAMILIES.map((f) => `## ${FAMILY_LABEL[f]}\n\n${b[f].map((q) => `- ${q}`).join("\n")}`).join(
      "\n\n",
    ) +
    "\n"
  );
}

/* ── the garden asks ───────────────────────────────────────────────────── */

export type GardenQuestion = { family: Family; text: string; stone: string | null };

const q = (s: string) => `“${s.replace(/\s+/g, " ").trim()}”`;
const monthOf = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "";

/**
 * Questions the garden itself can put, each from a fact of the record: the
 * stone's own first sentence, what flows into it and how long that has lain
 * fallow, what it flows into, the reader's values, when it was last touched.
 * Facts turned into questions; the garden picks none over another.
 */
export function gardenQuestions(
  stone: GardenNode,
  inputs: Input[],
  outOf: { id: string; label: string }[],
  nodes: Map<string, GardenNode>,
  values: { name: string }[],
): GardenQuestion[] {
  const out: GardenQuestion[] = [];
  const push = (family: Family, text: string, s: string | null = stone.id) =>
    out.push({ family, text, stone: s });

  const first = sentencesOf(stone.description || stone.body || "")[0] ?? "";
  if (first && first.length < 240)
    push("clarify", `Your note begins: ${q(first)} How would you say the same thing without any of those words?`);
  push("clarify", `You titled it ${q(stone.label)}. Which word in the title is doing the most work, and what does it mean here?`);

  const roots = inputs
    .map((i) => ({ i, n: nodes.get(i.id) }))
    .filter((x): x is { i: Input; n: GardenNode } => Boolean(x.n));
  const fallow = roots.filter((r) => r.n.stage === "fallow");
  const read = roots.filter((r) => r.n.kind === "reading" || r.n.kind === "notion");
  const own = roots.filter((r) => r.n.kind === "garden" || r.n.kind === "note" || r.n.kind === "concept");

  for (const r of fallow.slice(0, 2))
    push(
      "assume",
      `${q(r.n.label)} flows into this and has lain fallow${r.n.modified ? ` since ${monthOf(r.n.modified)}` : ""}. What in it are you still taking for granted?`,
      r.n.id,
    );
  for (const r of own.slice(0, 2))
    push("assume", `${q(r.n.label)} flows into this. What does it take for granted that it never says?`, r.n.id);
  if (!roots.length)
    push("assume", "Nothing in the garden flows into this yet. What is it resting on that you have not written down?");

  for (const r of read.slice(0, 2))
    push("evidence", `You read ${q(r.n.label)} and it flows into this. How do you know it was right, and what would you have to see to drop it?`, r.n.id);
  push("evidence", roots.length
    ? `${roots.length} thing${roots.length === 1 ? "" : "s"} in the garden flow into this. Which one would it fall without?`
    : "What would you have to see, hear or read to give this up?");

  for (const v of values.slice(0, 2))
    push("viewpoint", `Someone who did not hold ${q(v.name)} as you do — how would they put this?`, null);
  push("viewpoint", "Who in your notes would put this differently, and what would their first sentence be?");

  if (outOf.length)
    push(
      "consequence",
      `It flows into ${outOf.length} stone${outOf.length === 1 ? "" : "s"}, among them ${q(outOf[0].label)}. If it fell, what happens to ${outOf.length === 1 ? "it" : "them"}?`,
      outOf[0].id,
    );
  push("consequence", "If this is so, what would you do differently this month that you are not doing now?");

  push(
    "question",
    stone.modified
      ? `You last touched this in ${monthOf(stone.modified)}. What made it a question today rather than then?`
      : "What made this a question today, and what will you do with the answer?",
  );
  return out;
}

/* ── the tally and the readings ────────────────────────────────────────── */

export type Tally = {
  turns: number;
  answered: number;
  hollow: number;
  byFamily: Record<Family, number>;
  unasked: Family[];
  bySource: Record<By, number>;
  assumptions: { surfaced: number; hollow: number; holds: number; fell: number; cannot: number; open: number };
  terms: number;
  stones: number;
  drift: { gained: string[]; lost: string[] } | null;
};

const kept = (t: Turn) => t.kept;

export function tally(d: Dialogue): Tally {
  const byFamily: Record<Family, number> = { clarify: 0, assume: 0, evidence: 0, viewpoint: 0, consequence: 0, question: 0 };
  const bySource: Record<By, number> = { you: 0, bank: 0, garden: 0, proposed: 0 };
  let answered = 0;
  const stones = new Set<string>();
  for (const t of d.turns) {
    if (!kept(t)) continue;
    byFamily[t.family]++;
    bySource[t.by]++;
    if (t.answer.trim()) answered++;
    if (t.stone) stones.add(t.stone);
  }
  const a = d.assumptions.filter((x) => x.kept);
  return {
    turns: d.turns.filter(kept).length,
    answered,
    hollow: d.turns.filter((t) => !t.kept).length,
    byFamily,
    unasked: FAMILIES.filter((f) => !byFamily[f]),
    bySource,
    assumptions: {
      surfaced: a.length,
      hollow: d.assumptions.filter((x) => !x.kept).length,
      holds: a.filter((x) => x.examined === "holds").length,
      fell: a.filter((x) => x.examined === "fell").length,
      cannot: a.filter((x) => x.examined === "cannot").length,
      open: a.filter((x) => !x.examined).length,
    },
    terms: d.terms.length,
    stones: stones.size,
    drift: d.now.trim() && d.thesis.trim() ? gainedLost(d.now, d.thesis) : null,
  };
}

const list = (xs: string[]) =>
  xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
const quoted = (xs: string[]) => xs.map((w) => `'${w}'`);

/** What is so about the dialogue, none of it a verdict on the thesis. */
export function readings(d: Dialogue, t: Tally): string[] {
  const out: string[] = [];
  if (!t.turns) out.push("no question kept yet");
  else
    out.push(
      `${t.turns} question${t.turns === 1 ? "" : "s"} kept, ${t.answered} answered` +
        (t.hollow ? ` · ${t.hollow} proposed and still hollow` : ""),
    );
  const askedIn = FAMILIES.filter((f) => t.byFamily[f]);
  if (askedIn.length)
    out.push(
      `asked across ${askedIn.length} of 6 families: ${askedIn.map((f) => `${FAMILY_LABEL[f]} ×${t.byFamily[f]}`).join(", ")}` +
        (t.unasked.length ? ` — ${list(t.unasked.map((f) => FAMILY_LABEL[f]))} not yet asked` : " — every family asked"),
    );
  if (t.turns) {
    const src = (["you", "bank", "garden", "proposed"] as By[])
      .filter((b) => t.bySource[b])
      .map((b) => `${b === "proposed" ? "proposed and kept" : BY_LABEL[b]} ${t.bySource[b]}`);
    out.push(`the questions came from: ${src.join(", ")}`);
  }
  if (t.assumptions.surfaced || t.assumptions.hollow) {
    const ex = t.assumptions.holds + t.assumptions.fell + t.assumptions.cannot;
    const parts = [
      t.assumptions.holds ? `${t.assumptions.holds} held` : "",
      t.assumptions.fell ? `${t.assumptions.fell} fell` : "",
      t.assumptions.cannot ? `${t.assumptions.cannot} cannot be said` : "",
    ].filter(Boolean);
    out.push(
      `${t.assumptions.surfaced} assumption${t.assumptions.surfaced === 1 ? "" : "s"} surfaced` +
        (ex ? `, ${ex} examined: ${parts.join(", ")}` : "") +
        (t.assumptions.open ? `; ${t.assumptions.open} not yet examined` : "") +
        (t.assumptions.hollow ? ` · ${t.assumptions.hollow} proposed and hollow` : ""),
    );
  } else out.push("no assumption surfaced yet");
  if (t.terms)
    out.push(
      `${t.terms} term${t.terms === 1 ? "" : "s"} clarified: ${list(quoted(d.terms.map((x) => x.word)))}`,
    );
  if (t.stones) out.push(`${t.stones} stone${t.stones === 1 ? "" : "s"} of the garden drawn in`);
  if (t.drift) {
    const g = t.drift.gained.slice(0, 6);
    const l = t.drift.lost.slice(0, 6);
    out.push(
      "as it stands now, the thesis " +
        [g.length ? `gained ${list(quoted(g))}` : "", l.length ? `lost ${list(quoted(l))}` : ""]
          .filter(Boolean)
          .join(" and ") || "as it stands now, the thesis keeps its words",
    );
  } else out.push("the thesis is not yet re-put");
  return out;
}

/* ── asking the model ──────────────────────────────────────────────────── */

const SYSTEM = (today: string) =>
  [
    "You are the questioner in a Socratic dialogue with one person, about a thesis they wrote.",
    "You only ask. You never answer, agree, disagree, evaluate, summarise, or say whether the thesis is true, sound, likely or well-founded; you never tell them what to think or do.",
    "Every question is open — it cannot be answered with yes or no — and presses on a specific phrase they wrote, which you quote back exactly.",
    "Use their words. Invent no facts. Plain, short, cooperative; no praise, no hedging, no preamble.",
    `Today is ${today}.`,
    "Answer in JSON only.",
  ].join(" ");

export function askNext(d: Dialogue, today: string) {
  const t = tally(d);
  const turnIds = d.turns.filter(kept).map((x) => x.id);
  const turns = d.turns
    .filter(kept)
    .map(
      (x, i) =>
        `turn ${i + 1} (id ${x.id}) · ${FAMILY_LABEL[x.family]}\n  Q: ${x.question.trim()}\n  A: ${x.answer.trim() || "(not answered yet)"}`,
    )
    .join("\n");
  const known = d.assumptions.filter((a) => a.kept).map((a) => a.text);
  return {
    system: SYSTEM(today),
    user: [
      `THE THESIS, as first said:\n${d.thesis.trim() || "(not written)"}`,
      d.now.trim() ? `AS IT STANDS NOW:\n${d.now.trim()}` : "",
      turns ? `THE DIALOGUE SO FAR:\n${turns}` : "THE DIALOGUE SO FAR: nothing asked yet.",
      known.length ? `Assumptions already on the table: ${known.join(" · ")}` : "",
      `Families of question: ${FAMILIES.map((f) => `${f} = ${FAMILY_BLURB[f]}`).join("; ")}.`,
      t.unasked.length
        ? `Not yet asked: ${t.unasked.join(", ")}. Lean toward those.`
        : "Every family has been asked at least once; go where the last answer is thinnest.",
      "Give two things.",
      "questions: 3 to 5 open questions. Each has a family (one of the six words), the text, and quote — the exact phrase from their thesis or their last answer that it presses on.",
      turnIds.length
        ? "assumptions: 0 to 4 things their answers take for granted without saying, each as a plain statement in text, with the id of the turn you heard it in as turn."
        : "assumptions: 0 to 3 things the thesis takes for granted without saying, each as a plain statement in text, with turn as an empty string.",
      "Do not repeat a question already asked. Do not answer any question. Do not say whether the thesis is so.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    schema: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              family: { type: "string", enum: FAMILIES },
              text: { type: "string" },
              quote: { type: "string" },
            },
            required: ["family", "text", "quote"],
          },
        },
        assumptions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              turn: turnIds.length ? { type: "string", enum: [...turnIds, ""] } : { type: "string" },
            },
            required: ["text", "turn"],
          },
        },
      },
      required: ["questions", "assumptions"],
    },
  };
}

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** What came back, held to the schema: real families, open questions, turns that exist. */
export function validateProposal(raw: unknown, turnIds: string[]): Proposal {
  const r = (raw ?? {}) as Record<string, unknown>;
  const ids = new Set(turnIds);
  const arr = (v: unknown, n: number) => (Array.isArray(v) ? v.slice(0, n) : []);
  const questions = arr(r.questions, 6)
    .map((x) => {
      const o = x as Record<string, unknown>;
      const family = str(o.family, 20) as Family;
      return { family, text: str(o.text, 300), quote: str(o.quote, 200) };
    })
    .filter((x) => FAMILIES.includes(x.family) && x.text && isOpen(x.text));
  const assumptions = arr(r.assumptions, 4)
    .map((x) => {
      const o = x as Record<string, unknown>;
      return { text: str(o.text, 300), turn: str(o.turn, 24) };
    })
    .filter((x) => x.text && (!x.turn || ids.has(x.turn)));
  return { questions, assumptions };
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Fold a proposal in as proposed and hollow; nothing already there is repeated. */
export function adopt(d: Dialogue, p: Proposal, today: string, id: () => string = uid): Dialogue {
  const haveQ = new Set(d.turns.map((t) => norm(t.question)));
  const turns: Turn[] = [
    ...d.turns,
    ...p.questions
      .filter((x) => !haveQ.has(norm(x.text)))
      .map((x) => ({
        id: id(),
        family: x.family,
        question: x.text,
        by: "proposed" as By,
        kept: false,
        answer: "",
        stone: null,
        on: today,
      })),
  ];
  const haveA = new Set(d.assumptions.map((a) => norm(a.text)));
  const assumptions: Assumption[] = [
    ...d.assumptions,
    ...p.assumptions
      .filter((x) => !haveA.has(norm(x.text)))
      .map((x) => ({
        id: id(),
        text: x.text,
        turn: x.turn || null,
        by: "proposed" as const,
        kept: false,
        examined: "" as Examined,
        note: "",
      })),
  ];
  return { ...d, turns, assumptions, touched: today };
}

export const proposedCount = (d: Dialogue) =>
  d.turns.filter((t) => !t.kept).length + d.assumptions.filter((a) => !a.kept).length;

export function keepAll(d: Dialogue, yes: boolean): Dialogue {
  return {
    ...d,
    turns: yes ? d.turns.map((t) => ({ ...t, kept: true })) : d.turns.filter((t) => t.kept),
    assumptions: yes
      ? d.assumptions.map((a) => ({ ...a, kept: true }))
      : d.assumptions.filter((a) => a.kept),
  };
}

/* ── the file ──────────────────────────────────────────────────────────── */

export const slugOf = datedSlug;

export function titleOf(d: { title: string; thesis: string }): string {
  if (d.title.trim()) return d.title.trim();
  const first = sentencesOf(d.thesis)[0] ?? d.thesis.trim();
  const t = first.replace(/[.!?…]+$/, "").trim();
  return t.length > 72 ? `${t.slice(0, 69).trim()}…` : t || "a dialogue";
}

const y = (s: string | null | boolean) => JSON.stringify(s);

export function serialiseDialogue(d: Dialogue): string {
  const lines = [`title: ${y(d.title)}`];
  if (d.stone) lines.push(`stone: ${y(d.stone)}`);
  lines.push(`opened: ${y(d.opened)}`, `touched: ${y(d.touched)}`);
  if (d.assumptions.length) {
    lines.push("assumptions:");
    for (const a of d.assumptions)
      lines.push(
        `  - { id: ${y(a.id)}, text: ${y(a.text)}, turn: ${y(a.turn)}, by: ${y(a.by)}, kept: ${a.kept}, examined: ${y(a.examined)}, note: ${y(a.note)} }`,
      );
  }
  if (d.terms.length) {
    lines.push("terms:");
    for (const t of d.terms)
      lines.push(`  - { id: ${y(t.id)}, word: ${y(t.word)}, meaning: ${y(t.meaning)}, turn: ${y(t.turn)} }`);
  }
  const body = [
    `## the thesis, as first said\n\n${d.thesis.trim()}`,
    `## as it stands now\n\n${d.now.trim()}`,
  ];
  if (d.turns.length)
    body.push(
      "## turns\n\n" +
        d.turns
          .map(
            (t) =>
              `### q ${t.id} · ${t.family} · ${t.by} · ${t.on}${t.stone ? ` · stone ${t.stone}` : ""}${t.kept ? "" : " · hollow"}\n\n${t.question.trim()}\n\n#### answer\n\n${t.answer.trim()}`,
          )
          .join("\n\n"),
    );
  if (d.note.trim()) body.push(`## note\n\n${d.note.trim()}`);
  return `---\n${lines.join("\n")}\n---\n\n${body.join("\n\n")}\n`;
}

const TURN_HEAD = /^q (\S+) · (\w+) · (\w+) · (\S*)((?: · stone \S+)?)((?: · hollow)?)\s*$/;

export function parseDialogue(slug: string, raw: string): Dialogue {
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
  const turns: Turn[] = [];
  const turnsRaw = sections.get("turns") ?? "";
  for (const chunk of turnsRaw.split(/\n(?=### )/)) {
    const m = chunk.match(/^### (.+)\n([\s\S]*)$/);
    if (!m) continue;
    const head = m[1].match(TURN_HEAD);
    if (!head) continue;
    const [qText, aText = ""] = m[2].split(/\n#### answer\n/);
    const family = head[2] as Family;
    const by = head[3] as By;
    turns.push({
      id: head[1],
      family: FAMILIES.includes(family) ? family : "clarify",
      question: qText.trim(),
      by: (["you", "bank", "garden", "proposed"] as By[]).includes(by) ? by : "you",
      kept: !head[6],
      answer: aText.trim(),
      stone: head[5] ? head[5].replace(" · stone ", "").trim() : null,
      on: head[4] || "",
    });
  }
  const A = Array.isArray(data.assumptions) ? (data.assumptions as Record<string, unknown>[]) : [];
  const T = Array.isArray(data.terms) ? (data.terms as Record<string, unknown>[]) : [];
  return validateDialogue(
    {
      slug,
      title: data.title,
      thesis: sec("the thesis, as first said"),
      now: sec("as it stands now"),
      stone: data.stone ?? null,
      opened: data.opened,
      touched: data.touched,
      turns,
      assumptions: A,
      terms: T,
      note: sec("note"),
    },
    typeof data.touched === "string" ? data.touched : new Date().toISOString().slice(0, 10),
  );
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Validation at the boundary: a dialogue arrives from the desk, or from a hand-edited file. */
export function validateDialogue(input: unknown, today: string): Dialogue {
  const r = (input ?? {}) as Record<string, unknown>;
  const thesis = typeof r.thesis === "string" ? r.thesis.trim().slice(0, 4000) : "";
  if (!thesis) throw new Error("a dialogue needs a thesis, in your words");
  const day = (v: unknown) => (typeof v === "string" && DAY.test(v) ? v : today);
  const turns: Turn[] = (Array.isArray(r.turns) ? r.turns : [])
    .slice(0, 200)
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const family = str(o.family, 20) as Family;
      const by = str(o.by, 10) as By;
      return {
        id: str(o.id, 24) || uid(),
        family: FAMILIES.includes(family) ? family : "clarify",
        question: str(o.question, 600),
        by: (["you", "bank", "garden", "proposed"] as By[]).includes(by) ? by : "you",
        kept: o.kept !== false,
        answer: typeof o.answer === "string" ? o.answer.trim().slice(0, 6000) : "",
        stone: str(o.stone, 200) || null,
        on: typeof o.on === "string" && DAY.test(o.on) ? o.on : today,
      };
    })
    .filter((t) => t.question);
  const ids = new Set(turns.map((t) => t.id));
  const assumptions: Assumption[] = (Array.isArray(r.assumptions) ? r.assumptions : [])
    .slice(0, 100)
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const ex = str(o.examined, 10) as Examined;
      const turn = str(o.turn, 24);
      return {
        id: str(o.id, 24) || uid(),
        text: str(o.text, 400),
        turn: turn && ids.has(turn) ? turn : null,
        by: o.by === "proposed" ? ("proposed" as const) : ("you" as const),
        kept: o.kept !== false,
        examined: (["", "holds", "fell", "cannot"] as Examined[]).includes(ex) ? ex : "",
        note: str(o.note, 600),
      };
    })
    .filter((a) => a.text);
  const terms: Term[] = (Array.isArray(r.terms) ? r.terms : [])
    .slice(0, 100)
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const turn = str(o.turn, 24);
      return {
        id: str(o.id, 24) || uid(),
        word: str(o.word, 120),
        meaning: str(o.meaning, 600),
        turn: turn && ids.has(turn) ? turn : null,
      };
    })
    .filter((t) => t.word);
  const d: Dialogue = {
    slug: str(r.slug, 120),
    title: str(r.title, 120),
    thesis,
    now: typeof r.now === "string" ? r.now.trim().slice(0, 4000) : "",
    stone: str(r.stone, 200) || null,
    opened: day(r.opened),
    touched: day(r.touched),
    turns,
    assumptions,
    terms,
    note: typeof r.note === "string" ? r.note.trim().slice(0, 4000) : "",
  };
  d.title = titleOf(d);
  if (!d.slug) d.slug = slugOf(d.title, d.opened);
  return d;
}
