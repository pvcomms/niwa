import matter from "gray-matter";
import { dayWords } from "./fence.ts";
import { rand, seedOf } from "./hand.ts";
import { slugOf as datedSlug, uid } from "./way.ts";

/**
 * The muster: Amanda Askell's four quarters as an instrument. Julia Galef's
 * soldier and scout divide reasoning by what it is for — defending a side, or
 * seeing what is there — and Askell's point is that the soldier runs two
 * things together: being after what you would like to be so, and fighting.
 * Crossed, they make four: the soldier (after its side, and fights), the
 * paladin (after what is so, and fights), the pacifist (after its side, and
 * keeps the peace) and the scout (after what is so, and keeps the peace).
 *
 * A claim is set down with the reader's prior, where it came from, which way
 * they would rather it came out and the line they would act at; then the
 * pieces of evidence as they came, each with its way, its weight — how many
 * times more likely it would be seen if the way it points were so — how it
 * was met, and where the reader stood after. The four figures run the same
 * pieces by their rules, so the reader's own marks can be read beside them;
 * a room of the four runs on dealt evidence, round by round, for what the
 * quarters do in company. Everything here counts or multiplies the reader's
 * own numbers or runs the rules as written. Nothing places the reader in a
 * quarter — the reader puts themself there — and nothing says a move was too
 * large, too small, or what to do.
 */

export type Way = "for" | "against";
export const WAYS: Way[] = ["for", "against"];
export const WAY_LABEL: Record<Way, string> = {
  for: "for",
  against: "against",
};

/** How much more likely a piece would be seen if the way it points were so. */
export const WEIGHTS = [1.5, 3, 8, 30] as const;
export const WEIGHT_LABEL: Record<number, string> = {
  1.5: "a little",
  3: "some",
  8: "a lot",
  30: "overwhelming",
};
export const weightWords = (w: number): string => WEIGHT_LABEL[w] ?? `×${w}`;

export type Met = "argued" | "took" | "passed";
export const METS: Met[] = ["argued", "took", "passed"];
export const MET_LABEL: Record<Met, string> = {
  argued: "argued with it",
  took: "took it in",
  passed: "let it pass",
};

export type From = "" | "base" | "seen" | "told" | "hunch";
export const FROMS: Exclude<From, "">[] = ["base", "seen", "told", "hunch"];
export const FROM_LABEL: Record<Exclude<From, "">, string> = {
  base: "a base rate",
  seen: "what I've seen",
  told: "what I was told",
  hunch: "a hunch",
};

/** Which way the reader would rather it came out; empty is either way. */
/** The same, said back to the reader. */
export const FROM_WORDS: Record<Exclude<From, "">, string> = {
  base: "from a base rate",
  seen: "from what you had seen",
  told: "from what you were told",
  hunch: "on a hunch",
};

export type Like = "" | "so" | "not";
export const LIKE_LABEL: Record<Like, string> = {
  so: "so",
  not: "not so",
  "": "either way",
};

export type Came = "" | "so" | "not";

/** How the reader met someone else who holds a view. */
export type Face = "argued" | "talked" | "kept";
export const FACES: Face[] = ["argued", "talked", "kept"];
export const FACE_LABEL: Record<Face, string> = {
  argued: "argued it out",
  talked: "talked it over",
  kept: "kept it to myself",
};

export type Piece = {
  id: string;
  on: string;
  text: string;
  way: Way;
  weight: number;
  met: Met;
  /** Where the reader stood after it, in percent; null when they did not say. */
  at: number | null;
};

export type Other = { id: string; name: string; at: number | null; met: Face };

export type Kind = "soldier" | "paladin" | "pacifist" | "scout";
/** The field's order: the top row fights, the bottom keeps the peace; the left is after its side, the right after what is so. */
export const KINDS: Kind[] = ["soldier", "paladin", "pacifist", "scout"];
export const FIGHTS: Record<Kind, boolean> = {
  soldier: true,
  paladin: true,
  pacifist: false,
  scout: false,
};
/** After what is so, rather than after its side. */
export const AFTER_SO: Record<Kind, boolean> = {
  soldier: false,
  paladin: true,
  pacifist: false,
  scout: true,
};
export const PLURAL: Record<Kind, string> = {
  soldier: "soldiers",
  paladin: "paladins",
  pacifist: "pacifists",
  scout: "scouts",
};

export type Room = Record<Kind, number>;
export const ROOM: Room = { soldier: 3, paladin: 3, pacifist: 3, scout: 3 };
export const ROOM_MAX = 6;

export type Muster = {
  slug: string;
  put: string;
  touched: string;
  claim: string;
  /** Before anything came in, in percent. */
  prior: number;
  from: From;
  like: Like;
  /** The line the reader would act at, in percent. */
  act: number;
  /** What they would do. */
  would: string;
  /** The day they acted; empty until they do. */
  acted: string;
  pieces: Piece[];
  others: Other[];
  /** Where the reader puts themself on the field: across (after what is so) and up (fights), each 0 to 1. */
  self: [number, number] | null;
  /** The room the reader keeps for this claim. */
  room: Room;
  came: Came;
  cameOn: string;
  after: string;
  stone: string | null;
};

export const emptyMuster = (day: string): Muster => ({
  slug: "",
  put: day,
  touched: day,
  claim: "",
  prior: 50,
  from: "",
  like: "",
  act: 70,
  would: "",
  acted: "",
  pieces: [],
  others: [],
  self: null,
  room: { ...ROOM },
  came: "",
  cameOn: "",
  after: "",
  stone: null,
});

export const newPiece = (text: string, day: string): Piece => ({
  id: uid(),
  on: day,
  text,
  way: "for",
  weight: 3,
  met: "took",
  at: null,
});

export const newOther = (name: string): Other => ({
  id: uid(),
  name,
  at: null,
  met: "talked",
});

/* ── odds ──────────────────────────────────────────────────────────────── */

/** A mark stays off the ends: 0 and 100 are not places a mind can be moved from. */
export const LO = 1;
export const HI = 99;
export const clampPct = (v: number) => Math.min(HI, Math.max(LO, v));
/** Percent to log-odds and back. */
export const logit = (p: number) => Math.log(p / (100 - p));
export const pctOf = (l: number) => 100 / (1 + Math.exp(-l));
/** Log-odds kept inside a tenth of a percent of either end, so a room cannot run off the page. */
const clampL = (l: number) => Math.max(-6.9, Math.min(6.9, l));
const sign = (x: number) => (x > 0 ? 1 : x < 0 ? -1 : 0);
/** A piece as a step in log-odds: its weight, signed by its way. */
export const stepOf = (p: Pick<Piece, "way" | "weight">) =>
  (p.way === "for" ? 1 : -1) * Math.log(p.weight);

/** A percent in words: whole numbers, and never 0 or 100. */
export function pw(p: number): string {
  if (p < 0.5) return "under 1%";
  if (p > 99.5) return "over 99%";
  return `${Math.round(p)}%`;
}

const ORD = ["", "1st", "2nd", "3rd"];
export const ordinal = (k: number) => ORD[k] ?? `${k}th`;

/* ── the four, alone with the reader's pieces ─────────────────────────── */

/**
 * The numbers the rules run on, named once. A piece that goes against the
 * side of whoever is after their side counts a quarter; the pacifist notices
 * a third of what comes its way and hears a third of what is said; the
 * scout's voice reaches half the room; a challenge shows fool's gold up two
 * times in three and real evidence holds.
 */
export const RULES = {
  against: 0.25,
  notice: 1 / 3,
  quiet: 0.5,
  show: 2 / 3,
  spread: 0.9,
};

/** The side a mind is on: what it would rather, else the side of the middle it stands on now. */
const sideOf = (like: Like, l: number) =>
  like === "so" ? 1 : like === "not" ? -1 : sign(l);

/** How much of a step a figure takes, given where it stands. */
function taken(kind: Kind, like: Like, l: number, s: number): number {
  const side = sideOf(like, l);
  const own = AFTER_SO[kind] || side === 0 || sign(s) === side;
  return own ? s : RULES.against * s;
}

export type Paths = {
  /** The reader's weights multiplied: where the scout and the paladin stand. */
  weights: number[];
  soldier: number[];
  pacifist: number[];
  /** The reader's own marks; null where they did not say. */
  you: (number | null)[];
};

/**
 * The same pieces run through each figure's rule, in percent, the prior first.
 * `order` replays the pieces in another order; the reader's marks stay with
 * the order they came in, so they are only drawn in that order.
 */
export function pathsOf(m: Muster, order?: number[]): Paths {
  const idx = order ?? m.pieces.map((_, i) => i);
  const l0 = logit(clampPct(m.prior));
  const out: Paths = {
    weights: [m.prior],
    soldier: [m.prior],
    pacifist: [m.prior],
    you: [m.prior],
  };
  let w = l0;
  let so = l0;
  let pa = l0;
  for (const i of idx) {
    const s = stepOf(m.pieces[i]);
    w += s;
    so += taken("soldier", m.like, so, s);
    pa += RULES.notice * taken("pacifist", m.like, pa, s);
    out.weights.push(pctOf(w));
    out.soldier.push(pctOf(so));
    out.pacifist.push(pctOf(pa));
    out.you.push(order ? null : m.pieces[i].at);
  }
  return out;
}

/** Where the reader stood just before each piece: the last mark, or the prior. */
function standings(m: Muster): number[] {
  const out: number[] = [];
  let last = m.prior;
  for (const p of m.pieces) {
    out.push(last);
    if (p.at !== null) last = p.at;
  }
  return out;
}

/** Whether a piece went the reader's way: toward what they would rather, else toward the side they stood on. */
export function yourWay(m: Muster): (boolean | null)[] {
  const before = standings(m);
  return m.pieces.map((p, i) => {
    const side = sideOf(m.like, logit(clampPct(before[i])));
    return side === 0 ? null : sign(stepOf(p)) === side;
  });
}

export type Moves = {
  /** Pieces counted: each with a mark straight after, and a mark or the prior straight before. */
  counted: number;
  skipped: number;
  /** Of the weight given, the share moved in the piece's direction, over what went the reader's way. */
  own: { n: number; share: number } | null;
  against: { n: number; share: number } | null;
};

/**
 * How far the reader moved on each piece, as a share of the weight they gave
 * it — summed over what went their way and over what went against them. A
 * piece counts only when the reader marked where they stood straight before
 * it (or it is the first) and straight after.
 */
export function movesOf(m: Muster): Moves {
  const way = yourWay(m);
  let prevKnown = true;
  let prev = m.prior;
  const acc = {
    own: { n: 0, moved: 0, weight: 0 },
    against: { n: 0, moved: 0, weight: 0 },
  };
  let counted = 0;
  let skipped = 0;
  m.pieces.forEach((p, i) => {
    const s = stepOf(p);
    if (p.at !== null && prevKnown && way[i] !== null) {
      const a = logit(clampPct(p.at)) - logit(clampPct(prev));
      const g = way[i] ? acc.own : acc.against;
      g.n++;
      g.moved += a * sign(s);
      g.weight += Math.abs(s);
      counted++;
    } else skipped++;
    prevKnown = p.at !== null;
    if (p.at !== null) prev = p.at;
  });
  const share = (g: { n: number; moved: number; weight: number }) =>
    g.n ? { n: g.n, share: g.weight ? g.moved / g.weight : 0 } : null;
  return {
    counted,
    skipped,
    own: share(acc.own),
    against: share(acc.against),
  };
}

/** The first piece after which a line stands at or over the line the reader would act at; 0 if it began there, null if never. */
export function reaches(line: (number | null)[], act: number): number | null {
  for (let k = 0; k < line.length; k++) {
    const v = line[k];
    if (v !== null && v >= act) return k;
  }
  return null;
}

/** Every order the pieces could have come in — or a seeded few thousand — and where each figure ends. */
export function endsInAnyOrder(
  m: Muster,
): Record<"weights" | "soldier" | "pacifist", [number, number]> {
  const n = m.pieces.length;
  const orders: number[][] = [];
  if (n <= 7) {
    const perm = (pre: number[], rest: number[]) => {
      if (!rest.length) orders.push(pre);
      else
        rest.forEach((x, i) =>
          perm(
            [...pre, x],
            rest.filter((_, j) => j !== i),
          ),
        );
    };
    perm(
      [],
      m.pieces.map((_, i) => i),
    );
  } else {
    const r = rand(seedOf(`${m.slug}-orders`));
    for (let t = 0; t < 3000; t++) {
      const o = m.pieces.map((_, i) => i);
      for (let i = o.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [o[i], o[j]] = [o[j], o[i]];
      }
      orders.push(o);
    }
  }
  const out = {
    weights: [Infinity, -Infinity] as [number, number],
    soldier: [Infinity, -Infinity] as [number, number],
    pacifist: [Infinity, -Infinity] as [number, number],
  };
  for (const o of orders) {
    const p = pathsOf(m, o);
    for (const k of ["weights", "soldier", "pacifist"] as const) {
      const v = p[k][n];
      out[k][0] = Math.min(out[k][0], v);
      out[k][1] = Math.max(out[k][1], v);
    }
  }
  return out;
}

/** A seeded order of the pieces — the shuffle on the sheet. */
export function shuffled(n: number, seed: number): number[] {
  const r = rand(seed);
  const o = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [o[i], o[j]] = [o[j], o[i]];
  }
  return o;
}

/** Which quarter a place on the field falls in; the line between two when it sits on it. */
export function quarterOf(
  x: number,
  y: number,
): { kind: Kind; between: Kind | null } {
  const right = x >= 0.5;
  const top = y >= 0.5;
  const kind: Kind = top
    ? right
      ? "paladin"
      : "soldier"
    : right
      ? "scout"
      : "pacifist";
  const nearX = Math.abs(x - 0.5) < 0.04;
  const nearY = Math.abs(y - 0.5) < 0.04;
  const between: Kind | null = nearX
    ? top
      ? right
        ? "soldier"
        : "paladin"
      : right
        ? "pacifist"
        : "scout"
    : nearY
      ? right
        ? top
          ? "scout"
          : "paladin"
        : top
          ? "pacifist"
          : "soldier"
      : null;
  return { kind, between };
}

/* ── the readings ──────────────────────────────────────────────────────── */

const n = (k: number, one: string, many = `${one}s`) =>
  `${k} ${k === 1 ? one : many}`;
const share = (x: number) => `${Math.round(x * 100)}%`;
const clip = (s: string, max: number) =>
  s.length <= max ? s : `${s.slice(0, max).replace(/\s+\S*$/, "")}…`;

function made(m: Muster): string {
  const parts = [
    `set down ${dayWords(m.put)}`,
    `put at ${pw(m.prior)} before anything came in${m.from ? `, ${FROM_WORDS[m.from]}` : ""}`,
  ];
  if (m.like) parts.push(`you would rather it were ${LIKE_LABEL[m.like]}`);
  return parts.join(" · ");
}

/** Where a line stands against the line the reader would act at now, and since which piece; a missing mark carries the last. */
export function sideSince(
  line: (number | null)[],
  act: number,
): { over: boolean; since: number } {
  const vals: number[] = [];
  let last = line[0] ?? 50;
  for (const v of line) {
    if (v !== null) last = v;
    vals.push(last);
  }
  const over = vals[vals.length - 1] >= act;
  let since = vals.length - 1;
  while (since > 0 && vals[since - 1] >= act === over) since--;
  return { over, since };
}

function actWords(m: Muster, paths: Paths): string {
  const head = `you would act at ${pw(m.act)}`;
  const acted = m.acted ? ` · you acted ${dayWords(m.acted)}` : "";
  if (!m.pieces.length)
    return `${head}${m.prior >= m.act ? ": you are over it from the start" : ""}${acted}`;
  const where = (x: { over: boolean; since: number }) =>
    x.since === 0
      ? x.over
        ? "over it from the start"
        : "under it all along"
      : `${x.over ? "over" : "under"} it since the ${ordinal(x.since)} piece`;
  const w = sideSince(paths.weights, m.act);
  const y = sideSince(paths.you, m.act);
  const body =
    w.over === y.over && w.since === y.since
      ? `you and your weights are both ${where(w)}`
      : `you are ${where(y)}; your weights are ${where(w)}`;
  return `${head}: ${body}${acted}`;
}

/** A ratio said aloud: one decimal under ten, whole above. */
const ratio = (r: number) =>
  r < 10 ? `${Math.round(r * 10) / 10}` : `${Math.round(r)}`;

/** How far the line the reader would act at is from where their weights stand, as the weight of one piece. */
function distance(m: Muster, at: number, came: boolean): string {
  const who = came ? "your weights" : "your prior";
  const gap = logit(clampPct(m.act)) - logit(Math.min(99.9, Math.max(0.1, at)));
  return gap > 0
    ? `${who} would reach your line on a piece weighing ${ratio(Math.exp(gap))} to 1 for it`
    : `${who} would go back under your line on a piece weighing ${ratio(Math.exp(-gap))} to 1 against it`;
}

/** Facts about one claim, in the order the sheet asks for them; never a verdict on it or the reader. */
export function readings(m: Muster): string[] {
  const out = [made(m)];
  const paths = pathsOf(m);
  const k = m.pieces.length;
  if (!k) out.push("nothing has come in yet");
  else {
    const f = m.pieces.filter((p) => p.way === "for").length;
    out.push(`${n(k, "piece")} came in: ${f} for, ${k - f} against`);
    const last = [...m.pieces].reverse().find((p) => p.at !== null);
    out.push(
      `by your weights, ${pw(paths.weights[k])} · ${last ? `you: ${pw(last.at!)}` : "you have not said where you stand since"}`,
    );
    const mv = movesOf(m);
    const parts: string[] = [];
    if (mv.own)
      parts.push(
        `${share(mv.own.share)} on the ${mv.own.n === 1 ? "one" : mv.own.n} that went your way`,
      );
    if (mv.against)
      parts.push(
        `${share(mv.against.share)} on the ${mv.against.n === 1 ? "one" : mv.against.n} that went against you`,
      );
    if (parts.length)
      out.push(
        `of the weight you gave them, you moved ${parts.join(" and ")}${mv.skipped ? ` (${n(mv.skipped, "piece")} without a mark on both sides left out)` : ""}`,
      );
    const way = yourWay(m);
    const argued = m.pieces.filter((p) => p.met === "argued");
    const ag = m.pieces.filter((_, i) => way[i] === false);
    const own = m.pieces.filter((_, i) => way[i] === true);
    const arguedOf = (xs: Piece[]) =>
      xs.filter((p) => p.met === "argued").length;
    const passed = m.pieces.filter((p) => p.met === "passed").length;
    out.push(
      argued.length
        ? `you argued with ${argued.length} of the ${k}: ${arguedOf(ag)} of the ${ag.length} that went against you, ${arguedOf(own)} of the ${own.length} that went your way${passed ? ` · let ${passed} pass` : ""}`
        : `you argued with none of them${passed ? ` · let ${passed} pass` : ""}`,
    );
  }
  out.push(actWords(m, paths));
  out.push(distance(m, paths.weights[k], k > 0));
  if (k) {
    const same = Math.round(paths.soldier[k]) === Math.round(paths.weights[k]);
    out.push(
      `alone with these pieces: the scout and the paladin at ${pw(paths.weights[k])}, the soldier ${same ? "with them" : `at ${pw(paths.soldier[k])}`}, the pacifist at ${pw(paths.pacifist[k])}`,
    );
    if (k > 1) {
      const e = endsInAnyOrder(m);
      const spans = (["soldier", "pacifist"] as const)
        .filter((f) => Math.round(e[f][1]) - Math.round(e[f][0]) >= 1)
        .map((f) => `the ${f} anywhere from ${pw(e[f][0])} to ${pw(e[f][1])}`);
      if (spans.length)
        out.push(
          `in another order, ${spans.join(", ")}; the scout and the paladin end at ${pw(paths.weights[k])} in any order`,
        );
    }
  }
  if (m.others.length) {
    const ats = m.others
      .map((o) => o.at)
      .filter((x): x is number => x !== null);
    const where = ats.length
      ? ats.length === 1
        ? `, at ${pw(ats[0])}`
        : `, from ${pw(Math.min(...ats))} to ${pw(Math.max(...ats))}`
      : "";
    const met = FACES.map(
      (f) => [f, m.others.filter((o) => o.met === f).length] as const,
    )
      .filter(([, c]) => c)
      .map(([f, c]) =>
        f === "kept"
          ? `kept it to yourself with ${c}`
          : `${FACE_LABEL[f]} with ${c}`,
      );
    out.push(
      `${n(m.others.length, "other")} ${m.others.length === 1 ? "holds" : "hold"} a view${where}: ${met.join(", ")}`,
    );
  }
  if (m.self) {
    const q = quarterOf(m.self[0], m.self[1]);
    out.push(
      q.between
        ? `you put yourself on the line between the ${PLURAL[q.kind]} and the ${PLURAL[q.between]}`
        : `you put yourself among the ${PLURAL[q.kind]}`,
    );
  } else out.push("you have not put yourself on the field");
  out.push(
    m.came
      ? `how it came out: ${m.came === "so" ? "so" : "not so"}${m.cameOn ? `, ${dayWords(m.cameOn)}` : ""}`
      : "it has not come out yet",
  );
  return out;
}

/* ── the room ──────────────────────────────────────────────────────────── */

export type Setup = {
  room: Room;
  prior: number;
  act: number;
  truth: "so" | "not";
  /** The share of what is dealt that is fool's gold. */
  gold: number;
  /** A court strikes what is shown up for everyone; a stage leaves each to judge. */
  court: boolean;
  rounds: number;
  seed: number;
};

export const GOLD = [0, 0.2, 0.4] as const;
export const GOLD_LABEL: Record<number, string> = {
  0: "none",
  0.2: "some",
  0.4: "a lot",
};
export const ROUNDS = 20;

export type Member = { seat: number; kind: Kind; start: number; far: boolean };
export type Dealt = {
  id: string;
  seat: number;
  way: 1 | -1;
  weight: number;
  gold: boolean;
};
export type Event =
  | { e: "deal"; seat: number; piece: string; noticed: boolean }
  | { e: "say"; seat: number; piece: string; loud: boolean }
  | { e: "keep"; seat: number; piece: string }
  | { e: "challenge"; seat: number; piece: string; shown: boolean }
  | { e: "strike"; piece: string };
export type Round = { at: number[]; dealt: Dealt[]; events: Event[] };
export type Run = { members: Member[]; rounds: Round[]; truth: 1 | -1 };

/** One draw for one purpose, the same whoever sits in the seat — so rooms of different make-up meet the same deal. */
const u = (seed: number, ...k: (string | number)[]) =>
  rand(seedOf(`${seed}|${k.join("|")}`))();
function normal(seed: number, ...k: (string | number)[]) {
  const a = Math.max(1e-9, u(seed, ...k, "a"));
  const b = u(seed, ...k, "b");
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
}
const HEAR: Record<Kind, number> = {
  soldier: 1,
  paladin: 1,
  scout: 1,
  pacifist: RULES.notice,
};

export const seatsOf = (room: Room): Kind[] =>
  KINDS.flatMap((k) => Array<Kind>(Math.max(0, room[k])).fill(k));

/**
 * The room, round by round. Each round one member is dealt a piece, a little
 * or some: most point at what is so, the stronger the more often, and fool's
 * gold looks like some and points either way. The holder takes it in (the pacifist notices a
 * third); the paladin and the scout say what they have — the paladin loud,
 * the scout to half the room — the soldier says only what is for its side, and
 * the pacifist says nothing. The pacifist hears a third of what is said. Every
 * fighter a piece goes against challenges it; a challenge shows fool's gold up
 * two times in three, and real evidence holds. In a court what is shown up is
 * struck for everyone, and whoever challenged a piece that held takes the
 * whole of it, whatever their side: they fought it and lost. On a stage nothing is
 * ruled: the members after what is so drop what was shown up, and the members
 * after their side drop whatever against them was challenged at all. Whoever
 * is after what is so moves by a piece's weight; whoever is after their side
 * moves by the whole of what is for it and a quarter of what is against. Every
 * other paladin starts on the far side of the room, for the credit of being
 * right where the others were not.
 */
export function runRoom(s: Setup): Run {
  const kinds = seatsOf(s.room);
  const size = kinds.length;
  const truth: 1 | -1 = s.truth === "so" ? 1 : -1;
  const l0 = logit(clampPct(s.prior));
  let paladins = 0;
  const members: Member[] = kinds.map((kind, seat) => {
    const far = kind === "paladin" && paladins++ % 2 === 0;
    const l = clampL(
      (far ? -l0 : l0) + RULES.spread * normal(s.seed, "start", seat),
    );
    return { seat, kind, start: pctOf(l), far };
  });
  const l = members.map((m) => logit(m.start));
  const rounds: Round[] = [{ at: l.map(pctOf), dealt: [], events: [] }];
  // `whole`: a ruling the member is bound by, whatever its side.
  const take = (j: number, step: number, whole = false) => {
    const before = l[j];
    l[j] = clampL(l[j] + (whole ? step : taken(kinds[j], "", l[j], step)));
    return l[j] - before;
  };
  for (let r = 1; r <= s.rounds; r++) {
    const dealt: Dealt[] = [];
    const events: Event[] = [];
    // One piece a round, to one seat: the same seat for any room of the same size.
    if (size) {
      const seat = Math.min(size - 1, Math.floor(u(s.seed, "who", r) * size));
      const gold = u(s.seed, "gold", r) < s.gold;
      const pick = u(s.seed, "weight", r);
      // A room is dealt a little or some, never a lot: one piece should not settle it.
      const weight = gold ? 3 : pick < 0.6 ? 1.5 : 3;
      const toward = u(s.seed, "way", r);
      const way = (
        gold
          ? toward < 0.5
            ? 1
            : -1
          : toward < weight / (1 + weight)
            ? truth
            : -truth
      ) as 1 | -1;
      dealt.push({ id: `r${r}`, seat, way, weight, gold });
    }
    for (const d of dealt) {
      const holder = kinds[d.seat];
      const noticed =
        holder !== "pacifist" || u(s.seed, "notice", r, d.seat) < RULES.notice;
      events.push({ e: "deal", seat: d.seat, piece: d.id, noticed });
      if (!noticed) continue;
      const step = d.way * Math.log(d.weight);
      const side = sign(l[d.seat]);
      const kept = take(d.seat, step);
      const says =
        holder === "paladin" ||
        holder === "scout" ||
        (holder === "soldier" && (side === 0 || side === d.way));
      if (!says) {
        events.push({ e: "keep", seat: d.seat, piece: d.id });
        continue;
      }
      const loud = FIGHTS[holder];
      events.push({ e: "say", seat: d.seat, piece: d.id, loud });
      const heard = kinds.map(
        (k, j) =>
          j !== d.seat &&
          u(s.seed, "hear", r, d.seat, j) < HEAR[k] * (loud ? 1 : RULES.quiet),
      );
      let shown = false;
      const fought = new Set<number>();
      kinds.forEach((k, j) => {
        if (!heard[j] || !FIGHTS[k]) return;
        const sj = sign(l[j]);
        if (sj === 0 || sj === d.way) return;
        const hit = d.gold && u(s.seed, "show", r, d.seat, j) < RULES.show;
        fought.add(j);
        shown ||= hit;
        events.push({ e: "challenge", seat: j, piece: d.id, shown: hit });
      });
      const challenged = fought.size > 0;
      if (shown && s.court) {
        l[d.seat] = clampL(l[d.seat] - kept);
        events.push({ e: "strike", piece: d.id });
        continue;
      }
      if (shown && AFTER_SO[holder]) l[d.seat] = clampL(l[d.seat] - kept);
      kinds.forEach((k, j) => {
        if (!heard[j]) return;
        if (AFTER_SO[k]) {
          if (!shown) take(j, step);
          return;
        }
        const sj = sign(l[j]);
        const against = sj !== 0 && sj !== d.way;
        if (!s.court && challenged && against) return;
        // In a court whoever fought a piece and lost takes the whole of it; the rest, by their own rule.
        take(j, step, s.court && fought.has(j));
      });
    }
    rounds.push({ at: l.map(pctOf), dealt, events });
  }
  return { members, rounds, truth };
}

const quantile = (xs: number[], q: number) => {
  if (!xs.length) return 50;
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
};
export const middleOf = (at: number[]) => quantile(at, 0.5);
export const bandOf = (at: number[]): [number, number] => [
  quantile(at, 0.1),
  quantile(at, 0.9),
];

/** What happened in one round, in a line: who was dealt what, what they did with it, and what the room did. */
export function roundWords(run: Run, r: number, court: boolean): string {
  const round = run.rounds[r];
  const d = round?.dealt[0];
  if (!d) return r ? "nothing was dealt" : "the room before anything is dealt";
  const kind = run.members[d.seat]?.kind ?? "scout";
  const what = `${d.gold ? "fool's gold" : "a piece"} ${d.way === 1 ? "for" : "against"} the claim (${d.gold ? "looks like " : ""}${WEIGHT_LABEL[d.weight] ?? `×${d.weight}`})`;
  const out = [`a ${kind} was dealt ${what}`];
  const ev = round.events.filter((e) => "piece" in e && e.piece === d.id);
  const deal = ev.find((e) => e.e === "deal");
  if (deal && deal.e === "deal" && !deal.noticed) {
    out.push("did not notice it");
    return out.join(" · ");
  }
  if (ev.some((e) => e.e === "keep")) out.push("kept it quiet");
  const say = ev.find((e) => e.e === "say");
  if (say && say.e === "say")
    out.push(say.loud ? "said it to the room" : "said it to half the room");
  const ch = ev.filter((e) => e.e === "challenge");
  if (ch.length) {
    const by = KINDS.map(
      (k) => [k, ch.filter((c) => "seat" in c && run.members[c.seat]?.kind === k).length] as const,
    )
      .filter(([, c]) => c)
      .map(([k, c]) => (c === 1 ? `a ${k}` : `${c} ${PLURAL[k]}`));
    const shown = ch.find((c) => c.e === "challenge" && c.shown);
    const words = `challenged by ${by.join(" and ")}`;
    if (shown && shown.e === "challenge")
      out.push(
        `${words}; shown up by a ${run.members[shown.seat]?.kind} · ${court ? "struck for everyone" : "dropped by those after what is so"}`,
      );
    else
      out.push(
        `${words}; ${d.gold ? "it got through" : "it held"}${court ? ` · ${ch.length === 1 ? "the challenger takes" : "the challengers take"} it whole` : ""}`,
      );
  } else if (say) out.push("no one challenged it");
  return out.join(" · ");
}

export type RoomTally = {
  round: number;
  size: number;
  middle: number;
  low: number;
  high: number;
  byKind: Partial<Record<Kind, number>>;
  dealt: number;
  noticed: number;
  said: number;
  /** Noticed and kept quiet — and of those, how many pointed at what is so. */
  quiet: number;
  quietTrue: number;
  gold: number;
  shown: number;
  shownBy: Partial<Record<Kind, number>>;
  /** The round the room's middle first stood at or over the line; null if it has not. */
  crossed: number | null;
  /** Members at or over the line now. */
  acting: number;
};

/** What happened in the room up to a round, counted. */
export function roomTally(
  run: Run,
  act: number,
  upto = run.rounds.length - 1,
): RoomTally {
  const kinds = run.members.map((m) => m.kind);
  const at = run.rounds[upto].at;
  const byKind: Partial<Record<Kind, number>> = {};
  for (const k of KINDS) {
    const xs = at.filter((_, i) => kinds[i] === k);
    if (xs.length) byKind[k] = middleOf(xs);
  }
  let dealt = 0;
  let noticed = 0;
  let said = 0;
  let quiet = 0;
  let quietTrue = 0;
  let gold = 0;
  let shown = 0;
  const shownBy: Partial<Record<Kind, number>> = {};
  let crossed: number | null = null;
  for (let r = 1; r <= upto; r++) {
    const round = run.rounds[r];
    const pieces = new Map(round.dealt.map((d) => [d.id, d]));
    dealt += round.dealt.length;
    gold += round.dealt.filter((d) => d.gold).length;
    const struck = new Set<string>();
    for (const ev of round.events) {
      if (ev.e === "deal" && ev.noticed) noticed++;
      if (ev.e === "say") said++;
      if (ev.e === "keep") {
        quiet++;
        const d = pieces.get(ev.piece);
        if (d && !d.gold && d.way === run.truth) quietTrue++;
      }
      if (ev.e === "challenge" && ev.shown && !struck.has(ev.piece)) {
        struck.add(ev.piece);
        shown++;
        const k = kinds[ev.seat];
        shownBy[k] = (shownBy[k] ?? 0) + 1;
      }
    }
    if (crossed === null && middleOf(round.at) >= act) crossed = r;
  }
  if (crossed === null && upto >= 0 && middleOf(run.rounds[0].at) >= act)
    crossed = 0;
  const [low, high] = bandOf(at);
  return {
    round: upto,
    size: at.length,
    middle: middleOf(at),
    low,
    high,
    byKind,
    dealt,
    noticed,
    said,
    quiet,
    quietTrue,
    gold,
    shown,
    shownBy,
    crossed,
    acting: at.filter((x) => x >= act).length,
  };
}

/** The room's run up to a round, in sentences; facts about the model, never about the reader. */
export function roomReadings(
  t: RoomTally,
  truth: "so" | "not",
  act: number,
  rounds: number,
): string[] {
  if (!t.size) return ["no one in the room"];
  const out = [
    `round ${t.round} of ${rounds} · the room's middle at ${pw(t.middle)}${t.size > 2 ? `, most of it between ${pw(t.low)} and ${pw(t.high)}` : ""} · in this room it is ${truth === "so" ? "so" : "not so"}`,
  ];
  const kinds = KINDS.filter((k) => t.byKind[k] !== undefined);
  if (kinds.length > 1)
    out.push(
      kinds.map((k) => `the ${PLURAL[k]} at ${pw(t.byKind[k]!)}`).join(", "),
    );
  if (t.round) {
    out.push(
      `${n(t.dealt, "piece")} dealt, ${t.noticed} noticed, ${t.said} said aloud${t.quiet ? ` · ${t.quiet} kept quiet, ${t.quietTrue} of them pointing at what is so` : ""}`,
    );
    if (t.gold)
      out.push(
        `fool's gold: ${t.gold} dealt, ${t.shown} shown up${
          t.shown
            ? ` (${KINDS.filter((k) => t.shownBy[k])
                .map(
                  (k) =>
                    `${t.shownBy[k]} by ${t.shownBy[k] === 1 ? `a ${k}` : PLURAL[k]}`,
                )
                .join(", ")})`
            : ""
        }`,
      );
  }
  out.push(
    t.crossed === null
      ? `the room's middle has not reached your line at ${pw(act)} · ${t.acting} of ${t.size} would act`
      : `the room's middle reached your line at ${pw(act)} ${t.crossed === 0 ? "before anything was dealt" : `in round ${t.crossed}`} · ${t.acting} of ${t.size} would act`,
  );
  return out;
}

export type Comparison = {
  label: string;
  room: Room;
  middle: number[];
  low: number[];
  high: number[];
};

/** The same deal to rooms of one kind each, the size of the reader's room, beside the reader's room. */
export function roomsBeside(s: Setup): Comparison[] {
  const size = seatsOf(s.room).length;
  const rooms: { label: string; room: Room }[] = [
    { label: "this room", room: s.room },
    ...KINDS.map((k) => ({
      label: `${size} ${size === 1 ? k : PLURAL[k]}`,
      room: {
        soldier: 0,
        paladin: 0,
        pacifist: 0,
        scout: 0,
        [k]: size,
      } as Room,
    })),
  ];
  return rooms.map(({ label, room }) => {
    const run = runRoom({ ...s, room });
    return {
      label,
      room,
      middle: run.rounds.map((r) => middleOf(r.at)),
      low: run.rounds.map((r) => bandOf(r.at)[0]),
      high: run.rounds.map((r) => bandOf(r.at)[1]),
    };
  });
}

/* ── the record ────────────────────────────────────────────────────────── */

export type Tally = {
  n: number;
  pieces: number;
  for: number;
  /** Across claims: of what went the reader's way and against them, how many, how many argued, and the share of weight moved. */
  own: { n: number; argued: number; moved: number; weight: number };
  against: { n: number; argued: number; moved: number; weight: number };
  acted: number;
  came: {
    claim: string;
    came: "so" | "not";
    you: number | null;
    weights: number;
  }[];
  self: Partial<Record<Kind, number>>;
};

export function tally(ms: Muster[]): Tally {
  const t: Tally = {
    n: ms.length,
    pieces: 0,
    for: 0,
    own: { n: 0, argued: 0, moved: 0, weight: 0 },
    against: { n: 0, argued: 0, moved: 0, weight: 0 },
    acted: 0,
    came: [],
    self: {},
  };
  for (const m of ms) {
    t.pieces += m.pieces.length;
    t.for += m.pieces.filter((p) => p.way === "for").length;
    const way = yourWay(m);
    m.pieces.forEach((p, i) => {
      if (way[i] === null) return;
      const g = way[i] ? t.own : t.against;
      g.n++;
      if (p.met === "argued") g.argued++;
    });
    const mv = movesOf(m);
    const add = (g: Tally["own"], x: Moves["own"], pieces: Piece[]) => {
      if (!x) return;
      const w = pieces.reduce((a, p) => a + Math.abs(stepOf(p)), 0);
      g.moved += x.share * w;
      g.weight += w;
    };
    // The weight behind each share is the weight of the pieces it counted.
    const counted = (own: boolean) => {
      const out: Piece[] = [];
      let prevKnown = true;
      m.pieces.forEach((p, i) => {
        if (p.at !== null && prevKnown && way[i] === own) out.push(p);
        prevKnown = p.at !== null;
      });
      return out;
    };
    add(t.own, mv.own, counted(true));
    add(t.against, mv.against, counted(false));
    if (m.acted) t.acted++;
    if (m.came) {
      const last = [...m.pieces].reverse().find((p) => p.at !== null);
      t.came.push({
        claim: m.claim,
        came: m.came,
        you: last ? last.at : m.prior,
        weights: pathsOf(m).weights.at(-1)!,
      });
    }
    if (m.self) {
      const q = quarterOf(m.self[0], m.self[1]);
      t.self[q.kind] = (t.self[q.kind] ?? 0) + 1;
    }
  }
  return t;
}

/** Facts about the record of claims; none a verdict on a claim or the reader. */
export function recordReadings(t: Tally): string[] {
  if (!t.n) return ["no claims mustered yet"];
  const out = [
    `${n(t.n, "claim")} mustered · ${t.pieces ? `${n(t.pieces, "piece")} came in, ${t.for} for, ${t.pieces - t.for} against` : "nothing has come in yet"}`,
  ];
  const own = t.own.weight ? t.own.moved / t.own.weight : null;
  const ag = t.against.weight ? t.against.moved / t.against.weight : null;
  if (own !== null || ag !== null)
    out.push(
      `of the weight you gave them, across the record you moved ${[
        own !== null ? `${share(own)} on what went your way` : "",
        ag !== null ? `${share(ag)} on what went against you` : "",
      ]
        .filter(Boolean)
        .join(" and ")}`,
    );
  if (t.own.n || t.against.n)
    out.push(
      `you argued with ${t.against.argued} of the ${t.against.n} that went against you and ${t.own.argued} of the ${t.own.n} that went your way`,
    );
  if (t.acted) out.push(`acted on ${t.acted}`);
  if (t.came.length) {
    const so = t.came.filter((c) => c.came === "so").length;
    out.push(
      `came out: ${t.came.length} (${so} so, ${t.came.length - so} not so) — ${t.came
        .slice(0, 4)
        .map(
          (c) =>
            `${clip(c.claim.replace(/[.!?]+$/, ""), 40)}: ${c.came === "so" ? "so" : "not so"}, with you at ${c.you === null ? "no mark" : pw(c.you)} and your weights at ${pw(c.weights)}`,
        )
        .join("; ")}`,
    );
  }
  const placed = KINDS.filter((k) => t.self[k]);
  if (placed.length)
    out.push(
      `where you put yourself: ${placed.map((k) => `among the ${PLURAL[k]} ${t.self[k]}`).join(", ")}`,
    );
  return out;
}

/* ── from a stone ──────────────────────────────────────────────────────── */

/** The stone a claim is about, as the route hands it over. */
export type About = { id: string; label: string; first: string };

/** A fresh claim about a stone: the first sentence of its first line when that reads as one, else its name. */
export function musterAbout(a: About, day: string): Muster {
  const first = a.first.trim().split(/(?<=[.!?])\s+/)[0] ?? "";
  return {
    ...emptyMuster(day),
    claim: first.length >= 12 && first.length <= 160 ? first : a.label,
    stone: a.id,
  };
}

/* ── the file ──────────────────────────────────────────────────────────── */

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const y = (s: string | null) => JSON.stringify(s);
const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
const long = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const day = (v: unknown, or: string) =>
  typeof v === "string" && DAY.test(v) ? v : or;
const pctIn = (v: unknown, or: number) => {
  const x = typeof v === "string" && v.trim() ? Number(v) : v;
  return typeof x === "number" && Number.isFinite(x)
    ? Math.round(clampPct(x))
    : or;
};
const pctOrNull = (v: unknown) =>
  v === null || v === undefined || v === "" ? null : pctIn(v, 50);
const MET_OF = Object.fromEntries(METS.map((k) => [MET_LABEL[k], k])) as Record<
  string,
  Met
>;
const FACE_OF = Object.fromEntries(
  FACES.map((k) => [FACE_LABEL[k], k]),
) as Record<string, Face>;
const round2 = (x: number) => Math.round(x * 100) / 100;
const weightIn = (v: unknown) => {
  const x = typeof v === "string" ? Number(v) : v;
  return typeof x === "number" && Number.isFinite(x)
    ? round2(Math.min(1000, Math.max(1.05, x)))
    : 3;
};

const pieceLine = (p: Piece) =>
  `- ${p.on} · ${p.way} · ×${p.weight} · ${MET_LABEL[p.met]}${p.at !== null ? ` · then ${p.at}` : ""} — ${p.text}`;
const otherLine = (o: Other) =>
  `- ${o.name}${o.at !== null ? ` · ${o.at}` : ""} · ${FACE_LABEL[o.met]}`;
const roomWords = (r: Room) => KINDS.map((k) => r[k]).join(" ");

export function serialiseMuster(m: Muster): string {
  const fm = [
    `put: ${y(m.put)}`,
    `touched: ${y(m.touched)}`,
    `prior: ${m.prior}`,
  ];
  if (m.from) fm.push(`from: ${m.from}`);
  if (m.like) fm.push(`like: ${m.like}`);
  fm.push(`act: ${m.act}`);
  if (m.acted) fm.push(`acted: ${y(m.acted)}`);
  if (m.came) fm.push(`came: ${m.came}`);
  if (m.cameOn) fm.push(`came_on: ${y(m.cameOn)}`);
  if (m.self)
    fm.push(`self: ${y(`${m.self[0].toFixed(2)} ${m.self[1].toFixed(2)}`)}`);
  fm.push(`room: ${y(roomWords(m.room))}`);
  if (m.stone) fm.push(`stone: ${y(m.stone)}`);
  const body = [`## the claim\n\n${m.claim.trim()}`];
  if (m.would.trim()) body.push(`## what you'd do\n\n${m.would.trim()}`);
  if (m.pieces.length)
    body.push(`## what came in\n\n${m.pieces.map(pieceLine).join("\n")}`);
  if (m.others.length)
    body.push(
      `## who else has a view\n\n${m.others.map(otherLine).join("\n")}`,
    );
  if (m.after.trim()) body.push(`## afterwards\n\n${m.after.trim()}`);
  return `---\n${fm.join("\n")}\n---\n\n${body.join("\n\n")}\n`;
}

export function parseMuster(slug: string, raw: string): Muster {
  const { data, content } = matter(raw);
  const sections = new Map<string, string>();
  let cur = "";
  for (const line of content.split("\n")) {
    const h = line.match(/^## (.+?)\s*$/);
    if (h) {
      cur = h[1].toLowerCase().replace(/’/g, "'");
      sections.set(cur, "");
      continue;
    }
    if (cur) sections.set(cur, `${sections.get(cur) ?? ""}${line}\n`);
  }
  const sec = (k: string) => (sections.get(k) ?? "").trim();
  // A piece written by hand may leave out anything after its way; what is missing takes the sheet's default.
  const pieces = sec("what came in")
    .split("\n")
    .map((l) =>
      l.match(
        /^- (?:(\d{4}-\d{2}-\d{2}) · )?(for|against)(?: · ×\s?([\d.]+))?(?: · (argued with it|took it in|let it pass))?(?: · then (\d{1,2}(?:\.\d+)?))?(?: — (.*))?$/,
      ),
    )
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({
      on: m[1],
      way: m[2],
      weight: m[3],
      met: m[4] ? MET_OF[m[4]] : "took",
      at: m[5] ?? null,
      text: m[6] ?? "",
    }));
  const others = sec("who else has a view")
    .split("\n")
    .map((l) =>
      l.match(
        /^- (.+?)(?: · (\d{1,2}))?(?: · (argued it out|talked it over|kept it to myself))?$/,
      ),
    )
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({
      name: m[1],
      at: m[2] ?? null,
      met: m[3] ? FACE_OF[m[3]] : "talked",
    }));
  // Hand-edited frontmatter may carry bare dates, which YAML reads as Dates; they are taken back as written.
  const text = (v: unknown) =>
    v instanceof Date
      ? v.toISOString().slice(0, 10)
      : typeof v === "number"
        ? String(v)
        : v;
  const self =
    typeof data.self === "string" && /^\s*[\d.]+\s+[\d.]+\s*$/.test(data.self)
      ? data.self.trim().split(/\s+/).map(Number)
      : null;
  const room =
    typeof data.room === "string" &&
    /^\s*\d+\s+\d+\s+\d+\s+\d+\s*$/.test(data.room)
      ? Object.fromEntries(
          KINDS.map((k, i) => [k, Number(data.room.trim().split(/\s+/)[i])]),
        )
      : undefined;
  return validateMuster({
    slug,
    put: text(data.put),
    touched: text(data.touched),
    claim: sec("the claim"),
    prior: data.prior,
    from: data.from,
    like: data.like,
    act: data.act,
    would: sec("what you'd do"),
    acted: text(data.acted),
    pieces,
    others,
    self,
    room,
    came: data.came,
    cameOn: text(data.came_on ?? data.cameOn),
    after: sec("afterwards"),
    stone: data.stone ?? null,
  });
}

const ID = /^[a-z0-9]{1,24}$/;
const oneOf = <T extends string>(v: unknown, xs: readonly T[], or: T): T =>
  (xs as readonly string[]).includes(String(v)) ? (v as T) : or;

export function validateMuster(input: unknown): Muster {
  const r = (input ?? {}) as Record<string, unknown>;
  const claim = str(r.claim, 300);
  if (!claim) throw new Error("a claim needs saying, in a line");
  const today = new Date().toISOString().slice(0, 10);
  const put = day(r.put, today);
  const list = (v: unknown, max: number) =>
    (Array.isArray(v) ? v : []).slice(0, max) as Record<string, unknown>[];
  const pieces: Piece[] = list(r.pieces, 24)
    .filter((p) => p && (p.way === "for" || p.way === "against"))
    .map((p, i) => ({
      id: typeof p.id === "string" && ID.test(p.id) ? p.id : `p${i + 1}`,
      on: day(p.on, put),
      text: str(p.text, 400),
      way: p.way as Way,
      weight: weightIn(p.weight),
      met: oneOf(p.met, METS, "took"),
      at: pctOrNull(p.at),
    }));
  const others: Other[] = list(r.others, 12)
    .filter((o) => str(o?.name, 80))
    .map((o, i) => ({
      id: typeof o.id === "string" && ID.test(o.id) ? o.id : `o${i + 1}`,
      name: str(o.name, 80),
      at: pctOrNull(o.at),
      met: oneOf(o.met, FACES, "talked"),
    }));
  const self =
    Array.isArray(r.self) &&
    r.self.length === 2 &&
    r.self.every((v) => typeof v === "number" && Number.isFinite(v))
      ? ([
          Math.min(1, Math.max(0, r.self[0] as number)),
          Math.min(1, Math.max(0, r.self[1] as number)),
        ] as [number, number])
      : null;
  const rr = (r.room ?? {}) as Record<string, unknown>;
  const room = Object.fromEntries(
    KINDS.map((k) => {
      const v = Number(rr[k]);
      return [
        k,
        Number.isFinite(v)
          ? Math.min(ROOM_MAX, Math.max(0, Math.round(v)))
          : ROOM[k],
      ];
    }),
  ) as Room;
  if (!seatsOf(room).length) Object.assign(room, ROOM);
  const m: Muster = {
    slug: str(r.slug, 120),
    put,
    touched: day(r.touched, put),
    claim,
    prior: pctIn(r.prior, 50),
    from: oneOf(r.from, ["", ...FROMS] as From[], ""),
    like: oneOf(r.like, ["", "so", "not"] as Like[], ""),
    act: pctIn(r.act, 70),
    would: long(r.would, 600),
    acted: day(r.acted, ""),
    pieces,
    others,
    self,
    room,
    came: oneOf(r.came, ["", "so", "not"] as Came[], ""),
    cameOn: day(r.cameOn, ""),
    after: long(r.after, 2000),
    stone: str(r.stone, 200) || null,
  };
  if (!m.came) m.cameOn = "";
  if (!m.slug) m.slug = slugOf(m.claim, m.put);
  return m;
}

export const slugOf = datedSlug;
