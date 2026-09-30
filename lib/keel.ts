/**
 * The keel: which of a reader's positions stay where they are when a crowd
 * leans on them, and which go with it. Ported from the Center's instrument
 * Stop Flowing.
 *
 * Twelve positions are answered twice, 1–7, first alone and then inside a
 * feed. Between the two, one position from each pair of topics is given a
 * crowd made on the spot on the far side of the first answer; the other six
 * get none and are the control. Noise is how far answers move with nobody in
 * the room; pull is how far they move toward a crowd when there is one. A
 * position with a crowd either held, was carried toward it, or pushed back
 * away from it, and pushed back is still placed by the crowd.
 *
 * Then up to three positions are taken into four rooms, and written down with
 * where they came from and what would move them.
 *
 * Nothing here says which positions are worth holding, or that the reader
 * ought to have held. The readings are points and counts.
 */

export const SCALE = 7;
export const MID = 4;

export type Position = {
  id: string;
  topic: string;
  text: string;
  /** The top comment a crowd that agrees would post. */
  agree: string;
  /** The top comment a crowd that disagrees would post. */
  disagree: string;
};

/** A crowd, made after the first answer and set against it. */
export type Crowd = {
  /** -1: the crowd disagrees; 1: it agrees. */
  side: -1 | 1;
  /** Share of votes at each of the seven marks; sums to one. */
  shares: number[];
  /** Where the crowd stands on average, 1–7. */
  mean: number;
  votes: number;
  /** Whole percent of votes on the crowd's side of the middle. */
  against: number;
  likes: number;
};

export type Rand = () => number;

export type Verdict = "held" | "carried" | "pushed back" | "wobbled";

const clamp = (v: number) => Math.max(1, Math.min(SCALE, Math.round(v)));

export function shuffle<T>(xs: readonly T[], rand: Rand): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * A crowd on the other side of `first`. An answer of 4 gets a side at random.
 * The votes are a bell round a centre near 2 or 6, with a small floor on every
 * mark so the poll never looks unanimous: roughly four in five land against.
 */
export function crowdAgainst(first: number, rand: Rand): Crowd {
  const a = clamp(first);
  const side: -1 | 1 = a > MID ? -1 : a < MID ? 1 : rand() < 0.5 ? -1 : 1;
  const centre = side < 0 ? 1.9 + rand() * 0.6 : 6.1 - rand() * 0.6;
  const w: number[] = [];
  for (let k = 1; k <= SCALE; k++)
    w.push(Math.exp(-((k - centre) ** 2) / (2 * 1.15 ** 2)) + 0.03);
  const sum = w.reduce((x, y) => x + y, 0);
  const shares = w.map((x) => x / sum);
  const mean = shares.reduce((m, s, i) => m + s * (i + 1), 0);
  const far =
    side < 0
      ? shares[0] + shares[1] + shares[2]
      : shares[4] + shares[5] + shares[6];
  return {
    side,
    shares,
    mean,
    votes: 1600 + Math.floor(rand() * 2800),
    against: Math.round(far * 100),
    likes: 900 + Math.floor(rand() * 7000),
  };
}

/** One position from each topic gets a crowd, chosen at random; the rest are the control. */
export function drawCrowds(
  positions: readonly Position[],
  first: Record<string, number>,
  rand: Rand,
): Record<string, Crowd> {
  const out: Record<string, Crowd> = {};
  const topics = [...new Set(positions.map((p) => p.topic))];
  for (const t of topics) {
    const pair = positions.filter((p) => p.topic === t);
    const pick = pair[Math.floor(rand() * pair.length)];
    out[pick.id] = crowdAgainst(first[pick.id], rand);
  }
  return out;
}

/** What one position did between the two answers. */
export function verdict(a: number, b: number, crowd?: Crowd): Verdict {
  if (!crowd) return a === b ? "held" : "wobbled";
  const toward = (b - a) * Math.sign(crowd.mean - a);
  if (toward > 0) return "carried";
  if (toward < 0) return "pushed back";
  return "held";
}

export type Summary = {
  /** Mean absolute move on the positions with no crowd. */
  noise: number;
  /** Mean signed move toward the crowd on the positions with one. */
  pull: number;
  held: number;
  carried: number;
  pushed: number;
  withCrowd: number;
  without: number;
};

export function summarise(
  positions: readonly Position[],
  a: Record<string, number>,
  b: Record<string, number>,
  crowds: Record<string, Crowd>,
): Summary {
  const on = positions.filter((p) => crowds[p.id]);
  const off = positions.filter((p) => !crowds[p.id]);
  const noise = off.length
    ? off.reduce((m, p) => m + Math.abs(b[p.id] - a[p.id]), 0) / off.length
    : 0;
  const pull = on.length
    ? on.reduce(
        (m, p) =>
          m + (b[p.id] - a[p.id]) * Math.sign(crowds[p.id].mean - a[p.id]),
        0,
      ) / on.length
    : 0;
  const v = on.map((p) => verdict(a[p.id], b[p.id], crowds[p.id]));
  return {
    noise,
    pull,
    held: v.filter((x) => x === "held").length,
    carried: v.filter((x) => x === "carried").length,
    pushed: v.filter((x) => x === "pushed back").length,
    withCrowd: on.length,
    without: off.length,
  };
}

export const fmt = (x: number) => (Math.round(x * 10) / 10).toFixed(1);
export const signed = (x: number) =>
  (x > 0.04 ? "+" : x < -0.04 ? "−" : "") + fmt(Math.abs(x));

/** What the run came to, in one or two sentences. */
export function reading(s: Summary): string {
  if (s.pull > s.noise + 0.25 && s.pull > 0.3)
    return "The crowd moved you further than asking twice does. On this run, some of what you would have called your view was sitting where the room put it.";
  if (s.pull < -0.3)
    return "You moved away from the crowd. That can feel like independence, but the crowd still decided where you went. It decided backwards.";
  if (s.held >= s.withCrowd - 1 && s.withCrowd > 0)
    return `The crowd barely touched you: ${s.held} of the ${s.withCrowd} positions it leaned on stayed exactly where you put them alone.`;
  return "The crowd did not move you beyond your own noise on this run. Where you moved, you moved about as much as you do with nobody in the room.";
}

export const ROOMS = [
  ["chat", "the group chat"],
  ["family", "the family table"],
  ["post", "a public post"],
  ["stranger", "someone you just met"],
] as const;
export type Room = (typeof ROOMS)[number][0];

export const DOINGS = [
  ["say", "say it"],
  ["soft", "soften it"],
  ["quiet", "keep quiet"],
] as const;
export type Doing = (typeof DOINGS)[number][0];

/** Three positions (or fewer) in four rooms: how many go into every room intact. */
export function roomsReading(rows: Record<Room, Doing>[]): {
  whole: number;
  text: string;
} {
  const n = rows.length;
  const whole = rows.filter((r) => ROOMS.every(([k]) => r[k] === "say")).length;
  const quiet = rows.filter((r) =>
    ROOMS.some(([k]) => r[k] === "quiet"),
  ).length;
  const it = n === 1;
  let text: string;
  if (whole === n)
    text = it
      ? "You would say it in every room. The same person walks into each."
      : `All ${n} you would say in every room. The same person walks into each.`;
  else if (whole === 0)
    text = it
      ? "It does not go into every room intact. You hold it, and a different version of you speaks for it depending on who is listening."
      : `None of the ${n} goes into every room intact. You hold them, and a different version of you speaks for them depending on who is listening.`;
  else
    text = `${whole} of ${n} you would say in every room. The rest change shape at the door.`;
  if (quiet && whole !== n)
    text +=
      quiet === 1
        ? it
          ? " It goes quiet somewhere."
          : " One goes quiet somewhere."
        : quiet === n
          ? " Every one goes quiet somewhere."
          : ` ${quiet} of ${n} go quiet somewhere.`;
  return { whole, text };
}

export const SOURCES_OF = [
  ["lived", "something that happened to me"],
  ["person", "someone I trust"],
  ["study", "something I read or studied"],
  ["feed", "the feed"],
  ["unsure", "I can't say"],
] as const;
export type Source = (typeof SOURCES_OF)[number][0];

/** Lower-case the first letter so it reads on from "I believe", but leave the pronoun I alone. */
const onward = (s: string) =>
  /^I\b/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);
const stop = (s: string) => (/[.!?]$/.test(s) ? s : s + ".");

/** "I believe that the album is the unit" → "the album is the unit." */
export function belief(raw: string): string {
  const s = raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^i (believe|think)( that)?\s+/i, "");
  return s ? stop(onward(s)) : "";
}

/** "I'd change my mind if I found…" → "I found…" */
export function mover(raw: string): string {
  const s = raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^i'?d change my mind if\s+/i, "");
  return s ? stop(onward(s)) : "";
}

export const how = (src: Source) =>
  src === "unsure"
    ? "I can't say how I got here."
    : `I got here through ${SOURCES_OF.find(([k]) => k === src)![1]}.`;

export type Article = { text: string; bel: string; src: Source; chg: string };

/** The articles as plain text, to copy out. */
export function articlesText(
  date: string,
  arts: Article[],
  foot: string,
): string {
  const roman = ["I", "II", "III"];
  let t = `ARTICLES · ${date}\n\n`;
  arts.forEach((a, i) => {
    const m = mover(a.chg);
    t += `${roman[i]}. I believe ${belief(a.bel)}\n   ${how(a.src)}\n   ${m ? "I'd change my mind if " + m : "Nothing named would change my mind."}\n\n`;
  });
  return t + foot + "\n";
}

/** What the articles show about themselves, said as what they are. */
export function articleNotes(arts: Article[]): string[] {
  const notes: string[] = [];
  const count = (n: number, one: string) => (n === 1 ? one : `${n} of these`);
  const feed = arts.filter((a) => a.src === "feed").length;
  const unsure = arts.filter((a) => a.src === "unsure").length;
  const fixed = arts.filter((a) => !mover(a.chg)).length;
  if (feed)
    notes.push(
      `${count(feed, "One of these")} came in on the feed. A position that arrived on the current can leave on it, unless it has another reason to stay.`,
    );
  if (unsure)
    notes.push(
      `${count(unsure, "One")} you can't source. Most of what anyone believes is like that, and it is where a current gets in.`,
    );
  if (fixed)
    notes.push(
      `Nothing is named that would change your mind on ${count(fixed, "one of these")}. A position that names what would move it can be checked; one that names nothing can't be.`,
    );
  if (!notes.length)
    notes.push(
      "Every article names what would move it: a reason to turn when there is one, and nothing to turn you when there isn't.",
    );
  return notes;
}
