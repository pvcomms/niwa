import matter from "gray-matter";
import { wordsOf } from "./provenance.ts";
import { sentencesOf, slugOf as datedSlug, uid } from "./way.ts";

/**
 * The mask: an ideological Turing test turned inward. The reader names a
 * matter, their own side and the other, writes their case in their own
 * voice, then writes the other side's case as the other side would put it —
 * to be read by them. Nothing here judges whether the mask passes. The
 * reader marks each sentence of the mask afterwards — I could say this and
 * mean it · I can say it, but do not · I could not write it straight — and
 * those marks are the map of what they actually hold. The tool counts the
 * tells that give a writer away, says which of the reader's values each case
 * leans on and what the two share, and the model on this machine may be
 * asked, as an adherent, what it would never have said and what was left
 * out — proposals, hollow until kept, never a grade.
 */

export type Mark = "" | "mean" | "could" | "refuse";
export const MARKS: Mark[] = ["mean", "could", "refuse"];
export const MARK_LABEL: Record<Mark, string> = {
  "": "unmarked",
  mean: "I could say this and mean it",
  could: "I can say it, but do not",
  refuse: "I could not write it straight",
};
export const MARK_SHORT: Record<Mark, string> = {
  "": "—",
  mean: "mean it",
  could: "could say it",
  refuse: "refuse it",
};

export type TellKind = "distance" | "scare" | "hedge" | "sneer" | "absolute";
export const TELL_KINDS: TellKind[] = ["distance", "scare", "hedge", "sneer", "absolute"];
export const TELL_LABEL: Record<TellKind, string> = {
  distance: "distancing",
  scare: "scare quotes",
  hedge: "hedging",
  sneer: "sneer",
  absolute: "absolutes",
};

/** The phrases that give a writer away when they are wearing a mask — or, in their own voice, that they lean on. */
const TELL: Record<Exclude<TellKind, "scare">, RegExp> = {
  distance:
    /\b(they (?:claim|believe|think|say|argue|insist|maintain|would (?:say|argue|claim|have you believe))|supposedly|allegedly|purportedly|according to them|in their (?:view|eyes|world|minds?)|so they say|or so we are told|apparently)\b/gi,
  hedge:
    /\b(arguably|perhaps|maybe|some (?:might|would) say|it could be argued|to some extent|in a sense|sort of|kind of|if you like|one might think|for what it'?s worth|i suppose|i guess|to be fair|admittedly)\b/gi,
  sneer:
    /\b(naive\w*|nonsense|absurd\w*|ridiculous\w*|laughabl\w*|silly|childish|simplistic|dogma\w*|zealot\w*|cults?\b|cultish|cult-like|delusion\w*|fantasy|conveniently|of course they|predictably|the usual|so much for|as if)\b/gi,
  absolute:
    /\b(always|never|everyone|everybody|nobody|no one|all of them|none of them|the only|obviously|clearly|undeniabl\w*|any (?:sane|reasonable|honest) person)\b/gi,
};

/** A short quoted span is a phrase held at arm's length; a long one is a quotation. */
const QUOTED = /(?:"([^"\n]{1,60})"|“([^”\n]{1,60})”|‘([^’\n]{1,60})’|\bso-called\s+(\w[\w-]*))/g;

export type Found = { kind: TellKind; phrase: string };

export function tells(text: string): Found[] {
  const out: Found[] = [];
  for (const kind of ["distance", "hedge", "sneer", "absolute"] as const) {
    const re = new RegExp(TELL[kind].source, "gi");
    for (const m of text.matchAll(re)) out.push({ kind, phrase: m[0].toLowerCase() });
  }
  for (const m of text.matchAll(QUOTED)) {
    const inner = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? "").trim();
    if (!inner) continue;
    if (inner.split(/\s+/).length <= 4) out.push({ kind: "scare", phrase: inner });
  }
  return out;
}

export type Stance = { we: number; they: number };

/** Who the writer is standing with, by pronoun. A mask that says "they" of its own side has slipped. */
export function stance(text: string): Stance {
  const we = (text.match(/\b(we|us|our|ours|ourselves)\b/gi) ?? []).length;
  const they = (text.match(/\b(they|them|their|theirs|themselves)\b/gi) ?? []).length;
  return { we, they };
}

export type Census = {
  found: Found[];
  byKind: Record<TellKind, number>;
  n: number;
  stance: Stance;
  sentences: number;
  words: number;
};

export function census(text: string): Census {
  const found = tells(text);
  const byKind: Record<TellKind, number> = { distance: 0, scare: 0, hedge: 0, sneer: 0, absolute: 0 };
  for (const f of found) byKind[f.kind]++;
  return {
    found,
    byKind,
    n: found.length,
    stance: stance(text),
    sentences: sentencesOf(text).length,
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
  };
}

export function censusWords(c: Census): string {
  const parts = TELL_KINDS.filter((k) => c.byKind[k]).map((k) => {
    const ex = [...new Set(c.found.filter((f) => f.kind === k).map((f) => f.phrase))].slice(0, 3);
    return `${TELL_LABEL[k]} ×${c.byKind[k]} (${ex.join(", ")})`;
  });
  return parts.length ? parts.join(" · ") : "no tells found";
}

/* ── the marks ─────────────────────────────────────────────────────────── */

export const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export type Marked = { text: string; mark: Mark };

export function markOf(marks: Marked[], sentence: string): Mark {
  const k = norm(sentence);
  return marks.find((m) => norm(m.text) === k)?.mark ?? "";
}

export function setMark(marks: Marked[], sentence: string, mark: Mark): Marked[] {
  const k = norm(sentence);
  const rest = marks.filter((m) => norm(m.text) !== k);
  return mark ? [...rest, { text: sentence.trim(), mark }] : rest;
}

/* ── values and common ground ──────────────────────────────────────────── */

export type Lean = { name: string; hits: string[] };

/** Which of the reader's values a text leans on, by the value's own terms. */
export function leans(text: string, values: { name: string; terms: string[] }[]): Lean[] {
  const hay = ` ${text.toLowerCase()} `;
  return values
    .map((v) => ({
      name: v.name,
      hits: v.terms.map((t) => t.toLowerCase().trim()).filter((t) => t && hay.includes(t)),
    }))
    .filter((l) => l.hits.length);
}

export type Common = { shared: string[]; ownOnly: string[]; otherOnly: string[] };

export function common(own: string, other: string): Common {
  const a = wordsOf(own);
  const b = wordsOf(other);
  const by = (m: Map<string, number>, not: Map<string, number>) =>
    [...m.entries()]
      .filter(([w]) => !not.has(w))
      .sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1))
      .map(([w]) => w);
  const shared = [...a.entries()]
    .filter(([w]) => b.has(w))
    .sort((x, y) => Math.min(y[1], b.get(y[0])!) - Math.min(x[1], b.get(x[0])!) || (x[0] < y[0] ? -1 : 1))
    .map(([w]) => w);
  return { shared, ownOnly: by(a, b), otherOnly: by(b, a) };
}

/* ── the mask itself ───────────────────────────────────────────────────── */

export type By = "you" | "proposed";

export type Tell = {
  id: string;
  /** The phrase, as written in the mask. */
  quote: string;
  kind: TellKind;
  /** How an adherent would have put it. */
  instead: string;
  by: By;
  kept: boolean;
};

export type Missing = { id: string; text: string; by: By; kept: boolean };

export type Mask = {
  slug: string;
  title: string;
  /** The matter, as a question or a topic. */
  matter: string;
  /** The reader's side, named. */
  side: string;
  /** The other side, named. */
  other: string;
  ownCase: string;
  /** The other side's case, as they would put it. */
  otherCase: string;
  /** Where the reader actually stands, written after. */
  stand: string;
  stone: string | null;
  opened: string;
  touched: string;
  marks: Marked[];
  tells: Tell[];
  missing: Missing[];
  note: string;
};

export type Proposal = {
  tells: { quote: string; kind: TellKind; instead: string }[];
  missing: string[];
};

export { uid };

export const emptyMask = (today: string): Mask => ({
  slug: "",
  title: "",
  matter: "",
  side: "",
  other: "",
  ownCase: "",
  otherCase: "",
  stand: "",
  stone: null,
  opened: today,
  touched: today,
  marks: [],
  tells: [],
  missing: [],
  note: "",
});

/* ── the tally and the readings ────────────────────────────────────────── */

export type Tally = {
  own: Census;
  mask: Census;
  sentences: string[];
  marks: Record<Mark, number>;
  crossed: string[];
  refused: string[];
  tellsKept: number;
  tellsHollow: number;
  missingKept: number;
  missingHollow: number;
  common: Common;
  stood: boolean;
};

export function tally(m: Mask): Tally {
  const sentences = sentencesOf(m.otherCase);
  const marks: Record<Mark, number> = { "": 0, mean: 0, could: 0, refuse: 0 };
  const crossed: string[] = [];
  const refused: string[] = [];
  for (const s of sentences) {
    const k = markOf(m.marks, s);
    marks[k]++;
    if (k === "mean") crossed.push(s);
    if (k === "refuse") refused.push(s);
  }
  return {
    own: census(m.ownCase),
    mask: census(m.otherCase),
    sentences,
    marks,
    crossed,
    refused,
    tellsKept: m.tells.filter((t) => t.kept).length,
    tellsHollow: m.tells.filter((t) => !t.kept).length,
    missingKept: m.missing.filter((x) => x.kept).length,
    missingHollow: m.missing.filter((x) => !x.kept).length,
    common: common(m.ownCase, m.otherCase),
    stood: Boolean(m.stand.trim()),
  };
}

const n = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;
const list = (xs: string[]) => xs.map((w) => `'${w}'`).join(", ");

/** Facts about the two cases and the marks; none a verdict on either side or on the mask. */
export function readings(m: Mask, t: Tally, values: Lean[][]): string[] {
  const out: string[] = [];
  out.push(
    m.ownCase.trim()
      ? `your case: ${n(t.own.sentences, "sentence")}, ${t.own.words} words · ${censusWords(t.own)} · 'we' ×${t.own.stance.we}, 'they' ×${t.own.stance.they}`
      : "your case is not written yet",
  );
  out.push(
    m.otherCase.trim()
      ? `the mask: ${n(t.mask.sentences, "sentence")}, ${t.mask.words} words · ${censusWords(t.mask)} · 'we' ×${t.mask.stance.we}, 'they' ×${t.mask.stance.they}`
      : "the mask is not written yet",
  );
  if (t.sentences.length) {
    const marked = t.marks.mean + t.marks.could + t.marks.refuse;
    out.push(
      marked
        ? `${marked} of ${t.sentences.length} marked: ${t.marks.mean} you could say and mean, ${t.marks.could} you can say but do not, ${t.marks.refuse} you could not write straight` +
            (t.marks[""] ? `; ${t.marks[""]} unmarked` : "")
        : `${n(t.sentences.length, "sentence")} in the mask, none marked yet`,
    );
  }
  if (t.tellsKept || t.tellsHollow || t.missingKept || t.missingHollow) {
    const parts = [
      t.tellsKept ? `${n(t.tellsKept, "tell")} kept` : "",
      t.tellsHollow ? `${t.tellsHollow} proposed and hollow` : "",
      t.missingKept ? `${n(t.missingKept, "missing reason")} kept` : "",
      t.missingHollow ? `${t.missingHollow} missing proposed` : "",
    ].filter(Boolean);
    out.push(`an adherent's reading: ${parts.join(", ")}`);
  }
  const [ownV, maskV] = values;
  if (ownV?.length || maskV?.length) {
    const o = ownV.map((l) => l.name);
    const k = maskV.map((l) => l.name);
    const both = o.filter((x) => k.includes(x));
    out.push(
      `values leaned on — your case: ${o.length ? list(o) : "none by their terms"}; the mask: ${k.length ? list(k) : "none by their terms"}` +
        (both.length ? `; both lean on ${list(both)}` : ""),
    );
  }
  if (m.ownCase.trim() && m.otherCase.trim())
    out.push(
      t.common.shared.length
        ? `${n(t.common.shared.length, "word")} the two cases share: ${list(t.common.shared.slice(0, 6))}`
        : "the two cases share no content word",
    );
  out.push(t.stood ? "where you stand is written" : "where you stand is not yet written");
  return out;
}

/* ── asking an adherent ────────────────────────────────────────────────── */

const SYSTEM = (today: string) =>
  [
    "You are a thoughtful, committed adherent of the side named as YOU ARE. Someone on the opposite side has written a case in YOUR side's voice, trying to pass as one of you.",
    "You point at exactly what gives the writer away — phrases your side would not use — and at the reasons YOUR side actually gives for its position that the case leaves out. Never give the writer's side's reasons.",
    "You never say whether the case passes or fails, never grade or praise it, never argue the matter yourself, and never describe the writer.",
    "Quote phrases exactly as written. Plain, short, specific. Invent no facts.",
    `Today is ${today}.`,
    "Answer in JSON only.",
  ].join(" ");

export function askAdherent(m: Mask, today: string) {
  const already = m.tells.filter((t) => t.kept).map((t) => t.quote);
  const alreadyMissing = m.missing.filter((x) => x.kept).map((x) => x.text);
  return {
    system: SYSTEM(today),
    user: [
      `THE MATTER:\n${m.matter.trim() || "(not written)"}`,
      `YOU ARE: ${m.other.trim() || "(the other side, unnamed)"} — this is your side.`,
      `THE WRITER IS: ${m.side.trim() || "(their side, unnamed)"} — the opposite side, wearing your side as a mask.`,
      `THE CASE, written by them in YOUR side's voice:\n${m.otherCase.trim() || "(not written)"}`,
      already.length ? `Tells already named: ${already.join(" · ")}` : "",
      alreadyMissing.length ? `Missing reasons already named: ${alreadyMissing.join(" · ")}` : "",
      "Give two things.",
      "tells: 2 to 6 phrases in the case that your side would not say — quoted exactly in quote; the kind, one of distance (holding the view at arm's length), scare (a phrase in quotation marks or 'so-called'), hedge (softening), sneer (contempt leaking through), absolute (overstating what your side claims); and instead — how your side would actually put it, under 30 words.",
      `missing: 1 to 4 reasons people who are ${m.other.trim() || "on your side"} actually give for their position that the case does not, each as one plain sentence in your side's voice — never a reason the writer's side (${m.side.trim() || "the opposite side"}) would give.`,
      "Do not repeat what is already named. Do not say whether the case passes. Do not argue the matter.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    schema: {
      type: "object",
      properties: {
        tells: {
          type: "array",
          items: {
            type: "object",
            properties: {
              quote: { type: "string" },
              kind: { type: "string", enum: TELL_KINDS },
              instead: { type: "string" },
            },
            required: ["quote", "kind", "instead"],
          },
        },
        missing: { type: "array", items: { type: "string" } },
      },
      required: ["tells", "missing"],
    },
  };
}

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** What came back, held to the case: a tell must quote a phrase that is actually in the mask. */
export function validateProposal(raw: unknown, otherCase: string): Proposal {
  const r = (raw ?? {}) as Record<string, unknown>;
  const hay = norm(otherCase);
  const arr = (v: unknown, k: number) => (Array.isArray(v) ? v.slice(0, k) : []);
  const tellsOut = arr(r.tells, 8)
    .map((x) => {
      const o = x as Record<string, unknown>;
      const kind = str(o.kind, 20) as TellKind;
      return { quote: str(o.quote, 200), kind, instead: str(o.instead, 300) };
    })
    .filter((x) => x.quote && TELL_KINDS.includes(x.kind) && hay.includes(norm(x.quote)));
  const missing = arr(r.missing, 6)
    .map((x) => str(x, 400))
    .filter(Boolean);
  return { tells: tellsOut, missing };
}

/** Fold a proposal in as proposed and hollow; nothing already there is repeated. */
export function adopt(m: Mask, p: Proposal, today: string, id: () => string = uid): Mask {
  const haveT = new Set(m.tells.map((t) => norm(t.quote)));
  const haveM = new Set(m.missing.map((x) => norm(x.text)));
  return {
    ...m,
    tells: [
      ...m.tells,
      ...p.tells
        .filter((t) => !haveT.has(norm(t.quote)))
        .map((t) => ({ id: id(), quote: t.quote, kind: t.kind, instead: t.instead, by: "proposed" as By, kept: false })),
    ],
    missing: [
      ...m.missing,
      ...p.missing
        .filter((x) => !haveM.has(norm(x)))
        .map((x) => ({ id: id(), text: x, by: "proposed" as By, kept: false })),
    ],
    touched: today,
  };
}

export const proposedCount = (m: Mask) =>
  m.tells.filter((t) => !t.kept).length + m.missing.filter((x) => !x.kept).length;

export function keepAll(m: Mask, yes: boolean): Mask {
  return {
    ...m,
    tells: yes ? m.tells.map((t) => ({ ...t, kept: true })) : m.tells.filter((t) => t.kept),
    missing: yes ? m.missing.map((x) => ({ ...x, kept: true })) : m.missing.filter((x) => x.kept),
  };
}

/* ── the file ──────────────────────────────────────────────────────────── */

export const slugOf = datedSlug;

export function titleOf(m: { title: string; matter: string; side: string; other: string }): string {
  if (m.title.trim()) return m.title.trim();
  const first = (sentencesOf(m.matter)[0] ?? m.matter.trim()).replace(/[.!…]+$/, "").trim();
  if (first) return first.length > 72 ? `${first.slice(0, 69).trim()}…` : first;
  if (m.side.trim() || m.other.trim()) return `${m.side.trim() || "one side"} · ${m.other.trim() || "the other"}`;
  return "a mask";
}

const y = (s: string | null | boolean) => JSON.stringify(s);

export function serialiseMask(m: Mask): string {
  const lines = [`title: ${y(m.title)}`, `side: ${y(m.side)}`, `other: ${y(m.other)}`];
  if (m.stone) lines.push(`stone: ${y(m.stone)}`);
  lines.push(`opened: ${y(m.opened)}`, `touched: ${y(m.touched)}`);
  if (m.marks.length) {
    lines.push("marks:");
    for (const k of m.marks) lines.push(`  - { text: ${y(k.text)}, mark: ${y(k.mark)} }`);
  }
  if (m.tells.length) {
    lines.push("tells:");
    for (const t of m.tells)
      lines.push(`  - { id: ${y(t.id)}, quote: ${y(t.quote)}, kind: ${y(t.kind)}, instead: ${y(t.instead)}, by: ${y(t.by)}, kept: ${t.kept} }`);
  }
  if (m.missing.length) {
    lines.push("missing:");
    for (const x of m.missing) lines.push(`  - { id: ${y(x.id)}, text: ${y(x.text)}, by: ${y(x.by)}, kept: ${x.kept} }`);
  }
  const body = [
    `## the matter\n\n${m.matter.trim()}`,
    `## your case, in your voice\n\n${m.ownCase.trim()}`,
    `## their case, in the mask\n\n${m.otherCase.trim()}`,
    `## where you stand\n\n${m.stand.trim()}`,
  ];
  if (m.note.trim()) body.push(`## note\n\n${m.note.trim()}`);
  return `---\n${lines.join("\n")}\n---\n\n${body.join("\n\n")}\n`;
}

export function parseMask(slug: string, raw: string): Mask {
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
  return validateMask(
    {
      slug,
      title: data.title,
      matter: sec("the matter"),
      side: data.side,
      other: data.other,
      ownCase: sec("your case, in your voice"),
      otherCase: sec("their case, in the mask"),
      stand: sec("where you stand"),
      stone: data.stone ?? null,
      opened: data.opened,
      touched: data.touched,
      marks: data.marks,
      tells: data.tells,
      missing: data.missing,
      note: sec("note"),
    },
    typeof data.touched === "string" ? data.touched : new Date().toISOString().slice(0, 10),
  );
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Validation at the boundary: a mask arrives from the desk, or from a hand-edited file. */
export function validateMask(input: unknown, today: string): Mask {
  const r = (input ?? {}) as Record<string, unknown>;
  const matterText = typeof r.matter === "string" ? r.matter.trim().slice(0, 2000) : "";
  const side = str(r.side, 120);
  const other = str(r.other, 120);
  if (!matterText && !side && !other) throw new Error("a mask needs the matter, or the two sides named");
  const day = (v: unknown) => (typeof v === "string" && DAY.test(v) ? v : today);
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const marks: Marked[] = (Array.isArray(r.marks) ? r.marks : [])
    .slice(0, 400)
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const mark = str(o.mark, 10) as Mark;
      return { text: str(o.text, 600), mark: MARKS.includes(mark) ? mark : ("" as Mark) };
    })
    .filter((k) => k.text && k.mark);
  const tellsIn: Tell[] = (Array.isArray(r.tells) ? r.tells : [])
    .slice(0, 100)
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const kind = str(o.kind, 20) as TellKind;
      return {
        id: str(o.id, 24) || uid(),
        quote: str(o.quote, 200),
        kind: TELL_KINDS.includes(kind) ? kind : ("distance" as TellKind),
        instead: str(o.instead, 300),
        by: o.by === "proposed" ? ("proposed" as By) : ("you" as By),
        kept: o.kept !== false,
      };
    })
    .filter((t) => t.quote);
  const missing: Missing[] = (Array.isArray(r.missing) ? r.missing : [])
    .slice(0, 100)
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return {
        id: str(o.id, 24) || uid(),
        text: str(o.text, 400),
        by: o.by === "proposed" ? ("proposed" as By) : ("you" as By),
        kept: o.kept !== false,
      };
    })
    .filter((x) => x.text);
  const m: Mask = {
    slug: str(r.slug, 120),
    title: str(r.title, 120),
    matter: matterText,
    side,
    other,
    ownCase: text(r.ownCase, 8000),
    otherCase: text(r.otherCase, 8000),
    stand: text(r.stand, 4000),
    stone: str(r.stone, 200) || null,
    opened: day(r.opened),
    touched: day(r.touched),
    marks,
    tells: tellsIn,
    missing,
    note: text(r.note, 4000),
  };
  m.title = titleOf(m);
  if (!m.slug) m.slug = slugOf(m.title, m.opened);
  return m;
}
