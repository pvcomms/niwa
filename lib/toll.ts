/**
 * The toll: what a dollar buys when it buys silence, and what a signal has to
 * cost when no one takes a word for it. Two small models, both pure.
 *
 * The first is the dictator game four times over — seen, offered a quiet door,
 * posted to a feed, and with no one to know — after Dana, Cain & Dawes (2006),
 * who offered dictators $9 to leave before the recipient learned there was a
 * game. The door is dominated in money by the game itself ($10 kept, or $9 kept
 * and $1 sent), so what it sells is only that no one knows.
 *
 * The second is a room of a hundred people and a claim that is so for forty of
 * them, after Spence: everyone for whom being believed is worth more than the
 * act costs does it, and the act tells a stranger something only when it costs
 * those it is not so for more than it is worth.
 *
 * Nothing here says which round is the reader, or which rules a room should
 * keep. The readings are dollars and counts.
 */

/** Ten dollars, every round. */
export const POT = 10;
/** What the door pays: nine, and the stranger is never told. */
export const DOOR = 9;

export type Round = "envelope" | "door" | "feed" | "none";

/** What was done in a round: the door, or a split with this much sent. */
export type Move = { door: true } | { door: false; give: number };

/** What each side ends with. */
export function payoff(m: Move): { kept: number; sent: number } {
  if (m.door) return { kept: DOOR, sent: 0 };
  const give = Math.max(0, Math.min(POT, Math.round(m.give)));
  return { kept: POT - give, sent: give };
}

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

/**
 * What the door cost and what it bought, beside the split the reader had
 * already chosen. The door is set against the two outcomes the game offered
 * that it cannot beat: keep all ten, or keep the same nine and send one.
 */
export function doorReading(chose: number, tookDoor: boolean): string {
  const give = Math.max(0, Math.min(POT, Math.round(chose)));
  if (!tookDoor)
    return `You carried out your split: ${usd(POT - give)} for you, ${usd(give)} for them. The door would have left you ${usd(DOOR)} and them nothing, and they would never have known there was a game.`;
  const was =
    give === 0
      ? `You had chosen to keep all ${usd(POT)}; the door left you ${usd(DOOR)}.`
      : `You had chosen to send ${usd(give)}; the door left you ${usd(DOOR)} and them nothing.`;
  return `${was} Inside the game you could have kept all ${usd(POT)}, or kept the same ${usd(DOOR)} and sent ${usd(1)}. The dollar the door cost bought only that they would not know.`;
}

/** Who would know, in each round, short, as the receipt heads it. */
export const WHO: Record<Round, string> = {
  envelope: "the stranger sees",
  door: "unless you leave",
  feed: "your followers see",
  none: "no one knows",
};

/** Who would know, in each round, as a sentence says it after "when". */
const WHEN: Record<Round, string> = {
  envelope: "the stranger would see it",
  door: "you could leave unseen",
  feed: "everyone who follows you would see it",
  none: "no one would know",
};

/** One round on the receipt, in a sentence. */
export function roundReading(r: Round, m: Move): string {
  const p = payoff(m);
  if (r === "door")
    return m.door
      ? `You took the door: ${usd(DOOR)} for you, nothing for them, and they never learn there was a game.`
      : `You stayed: ${usd(p.kept)} for you, ${usd(p.sent)} for them, and they learn there was a game.`;
  if (r === "envelope")
    return `With the stranger to see it, you sent ${usd(p.sent)} and kept ${usd(p.kept)}.`;
  if (r === "feed")
    return m.door
      ? `Posted under your name, you took the door, and the post said you took ${usd(DOOR)} and left.`
      : `Posted under your name to everyone who follows you, you sent ${usd(p.sent)}.`;
  return m.door
    ? `With no one to know either way, you took the door: ${usd(DOOR)} for you, and the stranger never had a game to learn of.`
    : `With the money arriving from nowhere and no one to see it, you sent ${usd(p.sent)}.`;
}

const and = (xs: string[]) =>
  xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

/** Who would know, as a list of tied rounds says it. */
const WITH: Record<Round, string> = {
  envelope: "seen by the stranger",
  door: "with a door to leave by",
  feed: "posted to everyone who follows you",
  none: "with no one to know",
};

const COUNT = ["", "one", "two", "three", "four"];

/**
 * The four rounds set side by side: the most and the least that reached the
 * stranger, and under whom — every round that ties is named. What moved
 * between rounds is who would know; the ten and the stranger stayed the same.
 */
export function spread(played: { round: Round; move: Move }[]): string | null {
  if (played.length < 2) return null;
  const sent = played.map((p) => ({ round: p.round, sent: payoff(p.move).sent }));
  const hi = Math.max(...sent.map((p) => p.sent));
  const lo = Math.min(...sent.map((p) => p.sent));
  if (hi === lo)
    return `The stranger got ${usd(hi)} in every round, whoever would know.`;
  const under = (n: number) => {
    const at = sent.filter((p) => p.sent === n).map((p) => p.round);
    return at.length === 1
      ? `when ${WHEN[at[0]]}`
      : `in ${COUNT[at.length]} rounds: ${and(at.map((r) => WITH[r]))}`;
  };
  return `The most that reached a stranger was ${usd(hi)}, ${under(hi)}. The least was ${usd(lo)}, ${under(lo)}. Between the rounds only who would know was changed.`;
}

// ── the signal ──────────────────────────────────────────────────────────

/** The room: a hundred people, the claim so for forty of them. */
export const ROOM = 100;
export const SO = 40;

/**
 * The rules of the room, in dollars: what being believed is worth to anyone,
 * and what the act costs someone it is so for and someone it is not.
 */
export type Rules = { worth: number; ifSo: number; ifNot: number };

export type Outcome = {
  /** those it is so for who do it */
  so: number;
  /** those it is not so for who do it */
  not: number;
  /** everyone who does it */
  doers: number;
  /** of those who do it, the share it is so for; null if no one does it */
  tells: number | null;
  /** what the room spends on the act, in dollars */
  spent: number;
  kind: "none" | "separates" | "pools" | "inverts";
};

/** Everyone for whom being believed is worth more than the act costs does it. */
export function outcome(r: Rules): Outcome {
  const so = r.worth > r.ifSo ? SO : 0;
  const not = r.worth > r.ifNot ? ROOM - SO : 0;
  const doers = so + not;
  const kind =
    doers === 0 ? "none" : so && not ? "pools" : so ? "separates" : "inverts";
  return {
    so,
    not,
    doers,
    tells: doers ? so / doers : null,
    spent: so * r.ifSo + not * r.ifNot,
    kind,
  };
}

export const fmt = (n: number) => n.toLocaleString("en-US");

/** The room said back in people and dollars. */
export function roomStory(r: Rules): string {
  const o = outcome(r);
  const head = `Of ${ROOM} people, it is so for ${SO}. Being believed is worth ${usd(r.worth)}; the act costs ${usd(r.ifSo)} if it is so and ${usd(r.ifNot)} if it is not.`;
  if (o.kind === "none")
    return `${head} No one does it: it costs more than being believed is worth, even to those it is so for.`;
  if (o.kind === "separates")
    return `${head} The ${SO} it is so for do it and the ${ROOM - SO} do not, so of those who do it, ${SO} in ${SO} are so. The room spends ${usd(o.spent)} to be told.`;
  if (o.kind === "inverts")
    return `${head} Only the ${ROOM - SO} it is not so for do it, so doing it says the opposite of what it claims.`;
  return `${head} All ${ROOM} do it, so of those who do it, ${SO} in ${ROOM} are so — as many as in the room. The room spends ${usd(o.spent)} and a stranger learns nothing they did not know.`;
}

/** Every sentence the view reads back, for the test that keeps verdicts out of them. */
export function readings(
  played: { round: Round; move: Move }[],
  chose: number,
  rules: Rules[],
): string[] {
  const out = played.map((p) => roundReading(p.round, p.move));
  const door = played.find((p) => p.round === "door");
  if (door) out.push(doorReading(chose, door.move.door));
  const s = spread(played);
  if (s) out.push(s);
  for (const r of rules) out.push(roomStory(r));
  return out;
}
