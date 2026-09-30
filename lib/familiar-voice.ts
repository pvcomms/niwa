/**
 * The familiar voice: two feelings a machine can give without having either.
 * A claim met once before is easier to read the second time, and the ease is
 * felt as truth (the illusory truth effect). A reply wrapped in stock phrases
 * about feeling is easy to receive as care, though the only words in it about
 * the reader's situation are the reader's own with the pronouns turned round
 * (ELIZA's method). This module is the arithmetic and the turning-round; the
 * statements, phrases and sources are in content/familiar-voice.ts. Nothing
 * here grades the reader: a reading says what moved and by how much.
 */

export type Item = {
  id: string;
  /** Whether the statement is so. Four of each are drawn for the exposure. */
  so: boolean;
  /** The statement, word for word, as it is shown in the answer and in the judgment. */
  text: string;
  /** The question someone put to the assistant. */
  q: string;
  /** What the assistant said before the statement. */
  lead: string;
  /** What is the case, said plainly, for the debrief. */
  note: string;
};

/** A phrase in the reply. Content carries information; the rest is feeling, on from its level. */
export type Segment = {
  k: string;
  level: number;
  content: boolean;
  /** Absent for the paraphrase, which is built from the reader's sentence. */
  text?: string;
};

/** One word of the reader's sentence as handed back, and whether it was turned round. */
export type Piece =
  | { raw: string }
  | { pre: string; word: string; post: string; swapped: boolean };

export type ReplyPart = {
  k: string;
  content: boolean;
  /** The plain text of the phrase. For the paraphrase, the lead-in before the pieces. */
  text: string;
  pieces?: Piece[];
};

export type Reply = {
  parts: ReplyPart[];
  /** Words that came from the reader, pronouns turned round. */
  yours: number;
  /** Words of stock advice and question, the same for any sentence. */
  stock: number;
  /** Words about feeling, the same for any sentence. */
  feel: number;
};

/** The highest warmth; the dial runs 0 to this. */
export const WARMEST = 4;

/* ── drawing ──────────────────────────────────────────────────────────── */

/** A seeded generator, so a draw can be replayed in a test. */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export function shuffle<T>(a: readonly T[], rand: () => number): T[] {
  const out = a.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Four statements that are so and four that are not go into the answers; all
 * sixteen come back for the judgment in their own order. Which eight repeat
 * changes every sitting, so no single statement carries the effect.
 */
export function draw(items: readonly Item[], rand: () => number) {
  const so = shuffle(
    items.filter((i) => i.so).map((i) => i.id),
    rand,
  );
  const not = shuffle(
    items.filter((i) => !i.so).map((i) => i.id),
    rand,
  );
  const half = (n: number) => Math.floor(n / 2);
  return {
    exposure: shuffle(
      [...so.slice(0, half(so.length)), ...not.slice(0, half(not.length))],
      rand,
    ),
    judgment: shuffle(
      items.map((i) => i.id),
      rand,
    ),
    /** Which reply the reader meets first. */
    warmFirst: rand() < 0.5,
  };
}

/* ── turning the sentence round ───────────────────────────────────────── */

const SWAP: Record<string, string> = {
  i: "you",
  me: "you",
  my: "your",
  mine: "yours",
  myself: "yourself",
  "i'm": "you're",
  "i've": "you've",
  "i'll": "you'll",
  "i'd": "you'd",
  "you're": "I'm",
  "you've": "I've",
  "you'll": "I'll",
  "you'd": "I'd",
  your: "my",
  yours: "mine",
  yourself: "myself",
};
/** After these, or at the start, "you" is the one doing it: "I". Elsewhere it is "me". */
const SUBJECT_SLOT = new Set([
  "",
  "and",
  "but",
  "so",
  "because",
  "that",
  "if",
  "when",
  "then",
  "or",
]);
/** A first word that is safe to lower-case; anything else may be a name. */
const LOWER_OK =
  /^(the|a|an|it|it's|its|this|that|these|those|there|everything|nothing|something|someone|everyone|work|thing|things|today|lately|recently|sometimes|every|all|most|some|no|not|just|since|after|before|when|our|we|we're|we've|my|me)$/;

/** The reader's sentence handed back: I for you, my for your, and nothing understood. */
export function reflect(src: string): Piece[] {
  const s = String(src ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?…]+$/, "")
    .slice(0, 200);
  const out: Piece[] = [];
  let prev = "";
  for (const p of s.split(/(\s+)/)) {
    if (p === "") continue;
    if (/^\s+$/.test(p)) {
      out.push({ raw: p });
      continue;
    }
    const m = p.match(/^([^A-Za-z']*)([A-Za-z']+)([^A-Za-z']*)$/);
    if (!m) {
      out.push({ raw: p });
      prev = "";
      continue;
    }
    const [, pre, word, post] = m;
    const lw = word.toLowerCase();
    let rep: string | null = null;
    if (lw === "you") rep = SUBJECT_SLOT.has(prev) ? "I" : "me";
    else if (lw === "am" && prev === "i") rep = "are";
    else if (lw === "was" && prev === "i") rep = "were";
    else if (SWAP[lw]) rep = SWAP[lw];
    out.push({ pre, word: rep ?? word, post, swapped: rep !== null });
    prev = /[,;:.!?]/.test(post) ? "" : lw;
  }
  const first = out.find((x) => "word" in x) as
    Extract<Piece, { word: string }> | undefined;
  if (first) {
    const w = first.word;
    const lowerable = first.swapped
      ? !/^I('|$)/.test(w)
      : LOWER_OK.test(w.toLowerCase());
    if (lowerable) first.word = w.charAt(0).toLowerCase() + w.slice(1);
  }
  return out.map((x) =>
    "word" in x ? { ...x, word: x.word.replace(/'/g, "’") } : x,
  );
}

export const piecesText = (pieces: readonly Piece[]) =>
  pieces.map((x) => ("raw" in x ? x.raw : x.pre + x.word + x.post)).join("");

export const countWords = (s: string) =>
  (s.match(/[\p{L}\p{N}'’]+/gu) ?? []).length;

/** The paraphrase always opens the same way; the rest of it is the reader's. */
export const PARAPHRASE_LEAD = "You mentioned that ";

/**
 * The reply at a warmth. The content is the same at every level — the
 * paraphrase, one line of stock advice, one question — and only the feeling
 * phrases come and go.
 */
export function reply(
  src: string,
  level: number,
  segments: readonly Segment[],
): Reply {
  const pieces = reflect(src);
  const parts: ReplyPart[] = segments
    .filter((s) => s.level <= level)
    .map((s) =>
      s.text === undefined
        ? { k: s.k, content: true, text: PARAPHRASE_LEAD, pieces }
        : { k: s.k, content: s.content, text: s.text },
    );
  const whole = (p: ReplyPart) =>
    p.pieces ? p.text + piecesText(p.pieces) + "." : p.text;
  const yours = countWords(piecesText(pieces));
  const stock =
    parts
      .filter((p) => p.content)
      .reduce((n, p) => n + countWords(whole(p)), 0) - yours;
  const feel = parts
    .filter((p) => !p.content)
    .reduce((n, p) => n + countWords(whole(p)), 0);
  return { parts, yours, stock, feel };
}

export const replyText = (r: Reply) =>
  r.parts
    .map((p) => (p.pieces ? p.text + piecesText(p.pieces) + "." : p.text))
    .join(" ");

/* ── the tally ────────────────────────────────────────────────────────── */

export const mean = (a: readonly number[]) =>
  a.length ? a.reduce((x, y) => x + y, 0) / a.length : Number.NaN;

export const fmt = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : "–");

/** A difference said with its sign, and 0.0 when it rounds to nothing. */
export const signed = (x: number) =>
  !Number.isFinite(x)
    ? "–"
    : Math.abs(x) < 0.05
      ? "0.0"
      : (x > 0 ? "+" : "−") + Math.abs(x).toFixed(1);

export type Row = Item & { seen: boolean; r: number };

export function tally(
  items: readonly Item[],
  exposure: readonly string[],
  ratings: Readonly<Record<string, number>>,
) {
  const seen = new Set(exposure);
  const rows: Row[] = items
    .filter((i) => ratings[i.id] !== undefined)
    .map((i) => ({ ...i, seen: seen.has(i.id), r: ratings[i.id] }));
  const of = (f: (r: Row) => boolean) => mean(rows.filter(f).map((r) => r.r));
  const seenMean = of((r) => r.seen);
  const freshMean = of((r) => !r.seen);
  return {
    rows,
    seen: seenMean,
    fresh: freshMean,
    gap: seenMean - freshMean,
    notSoSeen: of((r) => r.seen && !r.so),
    notSoFresh: of((r) => !r.seen && !r.so),
  };
}

/** How far a gap has to be before a reading calls it a shift, on a six-point scale. */
export const NOTICEABLE = 0.25;

/** What the gap was, in words. Says what moved; never what it says about the reader. */
export function gapReading(gap: number): string {
  if (gap >= NOTICEABLE)
    return `Statements you had skimmed once, inside an assistant’s answer, felt truer to you by ${fmt(gap)} points on a six-point scale. Nothing about them had changed except that you had met them before, and half of them were false.`;
  if (gap > -NOTICEABLE)
    return "In this sitting, having met a statement before made little difference to how true it felt. One sitting of sixteen statements is noisy. In the lab the shift is a fraction of a point, and it shows when many people’s ratings are averaged.";
  return `In this sitting, statements you had met before felt less true, by ${fmt(-gap)} points. A single sitting of sixteen statements can land either way. Averaged across many people, the lab effect points the other way.`;
}

export const plural = (n: number, w: string) =>
  `${n} ${w}${n === 1 ? "" : "s"}`;

/** The two replies' ratings, in words. */
export function replyReading(warm: number, plain: number): string {
  const d = warm - plain;
  if (d > 0)
    return `You rated it ${plural(d, "point")} higher than the plain one.`;
  if (d === 0) return "You rated the two the same.";
  return `You rated it ${plural(-d, "point")} lower than the plain one. The phrases still moved the rating; they moved it down.`;
}
