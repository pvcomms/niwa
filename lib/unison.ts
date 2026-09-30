/**
 * The unison: the same words to the eye and to the ear at once. Three short
 * passages, one read, one heard and one read while heard, each followed by
 * four questions; then the three set side by side, and beside what the
 * studies found. This module is the draw, the word positions a voice's
 * boundary events land on, the counts and the readings; the passages,
 * arrangements and sources are in content/unison.ts. Nothing here grades the
 * reader: a reading says how many, how fast, and how often chance alone would
 * have spread the three that far.
 */

export type Way = "eyes" | "ears" | "both";

export const WAYS: readonly Way[] = ["eyes", "ears", "both"];

export const WAY_NAME: Record<Way, string> = {
  eyes: "read",
  ears: "heard",
  both: "read while heard",
};

export type Question = {
  q: string;
  /** Three options; the first is the one the passage has. The draw shuffles them. */
  options: [string, string, string];
};

export type Passage = {
  id: string;
  title: string;
  text: string;
  questions: Question[];
};

export type Round = {
  way: Way;
  passage: string;
  /** For each question, the options in the order they are shown, as indexes into `options`. */
  orders: number[][];
};

/** Who was reading in a study: in a language they read well, learning it, finding reading hard, or learning to read. */
export type Who = "own" | "learning" | "hard" | "young";

/** One study's finding, said as what scored higher, lower or about the same, against what. */
export type Finding = {
  who?: Who;
  /** What scored higher, about the same, lower, or both ways; a note carries how it goes rather than a result. */
  dir: "higher" | "same" | "lower" | "mixed" | "note";
  says: string;
  /** Keys into the sources. */
  src: string[];
};

/** Something on the page and something in the ear, at once. */
export type Arrangement = {
  id: string;
  name: string;
  page: { words: boolean; picture: boolean };
  ear: "none" | "same" | "other";
  /** What the sketch shows, in a sentence. */
  line: string;
  findings: Finding[];
};

/**
 * A toy of the working-memory account the studies argue from, for the sketch
 * only: printed words are turned into sound, so they share a store with heard
 * words; pictures keep a store of their own; the eye can look at one place at
 * a time. It returns how much each source puts into the words' store and the
 * pictures', what of the picture the eye misses while it is on the words, and
 * whether it has two places to look. It is not a
 * measurement and nothing is scored against it.
 */
export function load(a: Pick<Arrangement, "page" | "ear">): {
  wordsEye: number;
  wordsEar: number;
  pictures: number;
  /** What of the picture goes unlooked-at while the eye is on the words. */
  missed: number;
  split: boolean;
} {
  const wordsEye = a.page.words ? 1 : 0;
  const wordsEar =
    a.ear === "none" ? 0 : a.ear === "other" ? 1 : a.page.words ? 0.25 : 1;
  const split = a.page.words && a.page.picture;
  const picture = a.page.picture ? 0.8 : 0;
  const missed = split ? 0.4 : 0;
  return { wordsEye, wordsEar, pictures: picture - missed, missed, split };
}

/** How much the sketch lets a store hold before it is drawn spilling. */
export const HOLDS = 1.5;

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
 * A sitting: the ways in a fresh order, the passages in another, so no way is
 * tied to one passage or one place in the sitting. Without a voice only the
 * reading round can run.
 */
export function draw(
  passages: readonly Passage[],
  rand: () => number,
  ways: readonly Way[] = WAYS,
): Round[] {
  const w = shuffle(ways, rand);
  const p = shuffle(passages, rand);
  return w.map((way, i) => ({
    way,
    passage: p[i].id,
    orders: p[i].questions.map(() => shuffle([0, 1, 2], rand)),
  }));
}

/** A word of the passage and where it sits in the text. */
export type Word = { text: string; start: number; end: number };

export function words(text: string): Word[] {
  const out: Word[] = [];
  for (const m of text.matchAll(/\S+/g)) {
    out.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

/** The word a voice is on when it reports a character index: the last one begun by then. */
export function wordAt(ws: readonly Word[], charIndex: number): number {
  let lo = 0;
  let hi = ws.length - 1;
  if (hi < 0 || charIndex < ws[0].start) return -1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ws[mid].start <= charIndex) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** The passage cut at its sentence ends, each with where it starts, so it can be said a sentence at a time. */
export function sentences(text: string): { text: string; start: number }[] {
  const out: { text: string; start: number }[] = [];
  const re = /\S[\s\S]*?[.!?]+["”’)]*(?=\s|$)|\S[\s\S]*$/g;
  for (const m of text.matchAll(re)) {
    const lead = m[0].length - m[0].trimStart().length;
    const s = m[0].trim();
    if (s) out.push({ text: s, start: m.index + lead });
  }
  return out;
}

/** Words a minute, whole. */
export function wpm(nWords: number, ms: number): number | null {
  if (!(ms > 0) || nWords <= 0) return null;
  return Math.round(nWords / (ms / 60000));
}

/** How many answers are the ones the passage has. `answers` holds option indexes as authored (0 is the passage's). */
export function matched(answers: readonly (number | null)[]): number {
  return answers.filter((a) => a === 0).length;
}

function choose(n: number, k: number): number {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

/**
 * If the ways made no difference and each question came out the same way at
 * the reader's own overall rate, how often would the rounds spread at least as
 * far apart as these did? Exact, over every outcome of each round.
 */
export function spreadChance(scores: readonly number[], n = 4): number {
  if (scores.length < 2) return NaN;
  const total = scores.reduce((a, b) => a + b, 0);
  const p = total / (n * scores.length);
  const pmf = Array.from(
    { length: n + 1 },
    (_, k) => choose(n, k) * p ** k * (1 - p) ** (n - k),
  );
  const seen = Math.max(...scores) - Math.min(...scores);
  let at = 0;
  const walk = (i: number, lo: number, hi: number, pr: number) => {
    if (i === scores.length) {
      if (hi - lo >= seen) at += pr;
      return;
    }
    for (let k = 0; k <= n; k++) {
      if (pmf[k] > 0)
        walk(i + 1, Math.min(lo, k), Math.max(hi, k), pr * pmf[k]);
    }
  };
  walk(0, Infinity, -Infinity, 1);
  return Math.min(1, at);
}

/** What guessing alone averages, with three options to a question. */
export function guessing(n = 4, options = 3): number {
  return n / options;
}

const NUMBER = [
  "none",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];
const say = (k: number) => NUMBER[k] ?? String(k);

export type Scored = { way: Way; matched: number };

const AFTER: Record<Way, string> = {
  eyes: "after reading",
  ears: "after hearing",
  both: "after both at once",
};

/** The rounds in one sentence, in the order they were sat. */
export function roundsReading(rs: readonly Scored[], n = 4): string {
  if (rs.length === 0) return "";
  if (rs.length === 1)
    return `You answered ${say(rs[0].matched)} of ${say(n)} as the passage had it ${AFTER[rs[0].way]}.`;
  const [first, ...rest] = rs;
  const tail = rest.map((r) => `${say(r.matched)} ${AFTER[r.way]}`);
  const joined =
    tail.length === 1
      ? tail[0]
      : `${tail.slice(0, -1).join(", ")}, and ${tail.at(-1)}`;
  return `You answered ${say(first.matched)} of ${say(n)} as the passage had it ${AFTER[first.way]}, ${joined}.`;
}

/** How far the rounds spread, beside how far chance alone would spread them. */
export function spreadReading(rs: readonly Scored[], n = 4): string {
  if (rs.length < 2) return "";
  const scores = rs.map((r) => r.matched);
  const total = scores.reduce((a, b) => a + b, 0);
  const of = n * scores.length;
  if (Math.max(...scores) === Math.min(...scores)) {
    return `All ${say(rs.length)} rounds came out the same, ${say(scores[0])} of ${say(n)} each.`;
  }
  const c = Math.round(spreadChance(scores, n) * 100);
  return `If the way made no difference to you, and every question had the same chance at your overall ${total} of ${of}, ${say(rs.length)} rounds would spread at least this far in ${c} sittings out of 100.`;
}

/** The reader's pace beside the voice's and the average. */
export function paceReading(p: {
  you: number | null;
  voice: number | null;
  average: number;
  /** In the round with both, how many seconds before the voice finished the reader went on. */
  leftEarly?: number | null;
}): string {
  const out: string[] = [];
  if (p.you) out.push(`You read at ${p.you} words a minute.`);
  if (p.voice) out.push(`The voice spoke at ${p.voice}.`);
  out.push(
    `Adults reading non-fiction silently average about ${p.average}, most of them between 175 and 300 (Brysbaert, 2019).`,
  );
  if (p.you && p.voice) {
    const r = p.you / p.voice;
    if (r >= 1.1)
      out.push(
        `Heard, a passage took about ${Math.round(r * 10) / 10} times as long as you took to read it.`,
      );
    else if (r <= 0.9)
      out.push(`The voice went faster than you read on your own.`);
    else out.push(`The voice kept about your own pace.`);
  }
  if (p.leftEarly && p.leftEarly >= 1)
    out.push(
      `In the round with both, you went on ${Math.round(p.leftEarly)} seconds before the voice finished.`,
    );
  return out.join(" ");
}
