/**
 * The slice: sixteen invented people met a little at a time, and what the
 * reader's calls did as more of them came into view. Each person is met three
 * times — the first second and one moment, then three moments, then all six —
 * and called in or out each time. A year later the person is doing well or not.
 *
 * The deal is fixed, not left to luck, so that the counts mean something in
 * sixteen people. Sixteen people are two teams of eight. On every team the six
 * moments come to the same thing as the year for six of eight. The first
 * second — how they came in, how sure they sounded, whether they were like
 * you, where they had been, whether they looked the part — agrees with the year
 * for six of eight on Ash and for four of eight on Birch, which is a coin.
 * Half of every team is dealt with the first second pointing away from where
 * the six moments come to; those are the people the reader's reliance on the
 * first second can be counted on.
 *
 * The people and the wording are drawn fresh each sitting, the design is not.
 * Nothing here says how good thin slices are in the world, or that a reader
 * was biased. The readings are counts, set beside what a coin would do and
 * what two plain rules would have done on the same sixteen.
 */
import { rand, type Rand } from "./hand.ts";

/** Which way a thing points: 1 toward doing well a year on, −1 toward not. */
export type Dir = 1 | -1;
export const flip = (d: Dir): Dir => (d === 1 ? -1 : 1);

export type Team = "Ash" | "Birch";
export const TEAMS: readonly Team[] = ["Ash", "Birch"];
export const PER_TEAM = 8;
export const N = PER_TEAM * TEAMS.length;

/** The moments of a person's first weeks. */
export const MOMENTS = 6;
/** How many of them are on the page at the first, second and third call. */
export const SHOWN = [1, 3, 6] as const;
export type Slice = 0 | 1 | 2;
export const SLICE_IDS: readonly Slice[] = [0, 1, 2];

export type DoorKind = "entrance" | "voice" | "likeness" | "record" | "part";
export const DOOR_KINDS: readonly DoorKind[] = [
  "entrance",
  "voice",
  "likeness",
  "record",
  "part",
];

/** The words a deal is drawn from; the content file owns them. */
export type Pools = {
  door: Record<DoorKind, { in: string[]; out: string[] }>;
  moment: { in: string[]; out: string[] };
};

/**
 * Of a team's four people whose first second points away from where their six
 * moments come to (`conflict`), and of its four whose first second points the
 * same way (`agree`), how many the year went with the moments.
 */
export const DESIGN: Record<Team, { conflict: number; agree: number }> = {
  Ash: { conflict: 2, agree: 4 },
  Birch: { conflict: 3, agree: 3 },
};
/** People whose first moment goes against the other five. */
export const TURNS = 2;
/** People whose six moments hold one against the rest, somewhere from the second on. */
export const WOBBLES = 5;

export type Person = {
  /** 1–16, in the order they are met. */
  n: number;
  team: Team;
  kind: DoorKind;
  /** The first second. */
  door: { dir: Dir; text: string };
  moments: { dir: Dir; text: string }[];
  /** What the six moments come to. */
  lean: Dir;
  /** What happened a year on. */
  year: Dir;
  /** The first moment goes against the other five. */
  turn: boolean;
  /** Which moment (0-based) goes against the rest, when one does. */
  wobble: number | null;
};

/** 1 surely in, 2 lean in, 3 lean out, 4 surely out. */
export type Call = 1 | 2 | 3 | 4;
export const CALLS: readonly Call[] = [1, 2, 3, 4];
export const dirOf = (c: Call): Dir => (c <= 2 ? 1 : -1);
export const isSure = (c: Call): boolean => c === 1 || c === 4;
/** Three calls per person, by index in the deal. */
export type Calls = (readonly [Call, Call, Call])[];

export function rng(seed: number): Rand {
  return rand(seed);
}

function shuffle<T>(a: readonly T[], rnd: Rand): T[] {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type Slot = { team: Team; lean: Dir; door: Dir; year: Dir };

/** A team's eight, before names and words: two leans each way in each half. */
function slotsOf(team: Team, rnd: Rand): Slot[] {
  const out: Slot[] = [];
  for (const conflict of [true, false]) {
    const k = conflict ? DESIGN[team].conflict : DESIGN[team].agree;
    const leans = shuffle<Dir>([1, 1, -1, -1], rnd);
    const follows = shuffle(
      [0, 1, 2, 3].map((i) => i < k),
      rnd,
    );
    for (let i = 0; i < 4; i++) {
      const lean = leans[i];
      out.push({
        team,
        lean,
        door: conflict ? flip(lean) : lean,
        year: follows[i] ? lean : flip(lean),
      });
    }
  }
  return out;
}

/**
 * Draw sixteen: who is on which team, who comes in how, what they do and how
 * the year goes, in an order the reader cannot read the design from. Eight of
 * the sixteen do well.
 */
export function deal(pools: Pools, rnd: Rand = Math.random): Person[] {
  let slots: Slot[] = [];
  for (let tries = 0; ; tries++) {
    slots = shuffle(
      TEAMS.flatMap((t) => slotsOf(t, rnd)),
      rnd,
    );
    if (slots.filter((s) => s.year === 1).length === N / 2) break;
    if (tries > 1000) throw new Error("no balanced deal");
  }

  const kinds = shuffle(
    Array.from({ length: N }, (_, i) => DOOR_KINDS[i % DOOR_KINDS.length]),
    rnd,
  );
  // A thin slice can mislead: two people begin against how they go on, and the
  // year goes with how they go on. Five more have one moment that does not fit.
  const turned = new Set(
    shuffle(
      slots.flatMap((s, i) => (s.year === s.lean ? [i] : [])),
      rnd,
    ).slice(0, TURNS),
  );
  const wobbled = new Map(
    shuffle(
      slots.flatMap((_, i) => (turned.has(i) ? [] : [i])),
      rnd,
    )
      .slice(0, WOBBLES)
      .map((i) => [i, 1 + Math.floor(rnd() * (MOMENTS - 1))] as const),
  );

  return slots.map((s, i) => {
    const dirs: Dir[] = Array.from({ length: MOMENTS }, () => s.lean);
    const wobble = wobbled.get(i) ?? null;
    if (turned.has(i)) dirs[0] = flip(s.lean);
    else if (wobble !== null) dirs[wobble] = flip(s.lean);
    const bag = {
      1: shuffle(pools.moment.in, rnd),
      [-1]: shuffle(pools.moment.out, rnd),
    };
    const doorPool = pools.door[kinds[i]][s.door === 1 ? "in" : "out"];
    return {
      n: i + 1,
      team: s.team,
      kind: kinds[i],
      door: {
        dir: s.door,
        text: doorPool[Math.floor(rnd() * doorPool.length)],
      },
      moments: dirs.map((dir) => ({ dir, text: bag[dir].shift()! })),
      lean: s.lean,
      year: s.year,
      turn: turned.has(i),
      wobble: turned.has(i) ? null : wobble,
    };
  });
}

/**
 * What the moments seen so far come to. The dealt people never tie at one, three
 * or six moments (at most one goes against the rest), so the sign is enough.
 */
export function momentsLean(p: Person, seen: number): Dir {
  const sum = p.moments.slice(0, seen).reduce((a, m) => a + m.dir, 0);
  return sum >= 0 ? 1 : -1;
}

/** The chance of exactly 0…n matches by luck, for n coin-flips at p. */
function pmf(n: number, p: number): number[] {
  const out = [Math.pow(1 - p, n)];
  for (let k = 0; k < n; k++)
    out.push((out[k] * (n - k) * p) / ((k + 1) * (1 - p)));
  return out;
}

export type Band = { lo: number; hi: number; cover: number };

/**
 * What luck alone does over n people: the counts in which each tail holds
 * more than `tail` of the chance, and how much of the chance those counts hold.
 */
export function luckBand(n: number, p = 0.5, tail = 0.05): Band {
  const f = pmf(n, p);
  let lo = 0;
  let below = 0;
  while (lo < n && below + f[lo] <= tail) below += f[lo++];
  let hi = n;
  let above = 0;
  while (hi > 0 && above + f[hi] <= tail) above += f[hi--];
  let cover = 0;
  for (let k = lo; k <= hi; k++) cover += f[k];
  return { lo, hi, cover };
}

type Three = [number, number, number];
const zero = (): Three => [0, 0, 0];

export type TeamFacts = {
  n: number;
  /** How many the first second agreed with the year for. */
  doorMatched: number;
  /** How many the six moments agreed with the year for. */
  momentsMatched: number;
  /** People whose first second pointed away from where the six moments come to. */
  conflictN: number;
  /** Of those, how many the year went with the first second, and with the moments. */
  conflictYearWithDoor: number;
  conflictYearWithMoments: number;
};

/** What a deal is, before anyone has called it. */
export function facts(d: readonly Person[]): Record<Team, TeamFacts> {
  const out = {} as Record<Team, TeamFacts>;
  for (const team of TEAMS) {
    const people = d.filter((p) => p.team === team);
    const conflict = people.filter((p) => p.door.dir !== p.lean);
    out[team] = {
      n: people.length,
      doorMatched: people.filter((p) => p.door.dir === p.year).length,
      momentsMatched: people.filter((p) => p.lean === p.year).length,
      conflictN: conflict.length,
      conflictYearWithDoor: conflict.filter((p) => p.door.dir === p.year)
        .length,
      conflictYearWithMoments: conflict.filter((p) => p.lean === p.year).length,
    };
  }
  return out;
}

export type TeamTally = TeamFacts & {
  matched: Three;
  sure: Three;
  /** Of the conflict people, how many calls went with the first second. */
  conflictWithDoor: Three;
};

export type Tally = {
  n: number;
  matched: Three;
  sure: Three;
  /** Sure calls that went against the year. */
  sureAgainst: Three;
  /** A reader who only goes by the first second. */
  doorMatched: number;
  /** A reader who only goes by the moments met so far. */
  momentsMatched: Three;
  conflict: {
    n: number;
    withDoor: Three;
    yearWithDoor: number;
    yearWithMoments: number;
  };
  teams: Record<Team, TeamTally>;
  band: Band;
  teamBand: Band;
};

export function tally(d: readonly Person[], calls: Calls): Tally {
  const f = facts(d);
  const matched = zero();
  const sure = zero();
  const sureAgainst = zero();
  const momentsMatched = zero();
  const conflictWithDoor = zero();
  const teams = {} as Record<Team, TeamTally>;
  for (const team of TEAMS)
    teams[team] = {
      ...f[team],
      matched: zero(),
      sure: zero(),
      conflictWithDoor: zero(),
    };

  d.forEach((p, i) => {
    const t = teams[p.team];
    const conflict = p.door.dir !== p.lean;
    for (const s of SLICE_IDS) {
      const c = calls[i][s];
      const hit = dirOf(c) === p.year;
      if (hit) {
        matched[s]++;
        t.matched[s]++;
      }
      if (isSure(c)) {
        sure[s]++;
        t.sure[s]++;
        if (!hit) sureAgainst[s]++;
      }
      if (momentsLean(p, SHOWN[s]) === p.year) momentsMatched[s]++;
      if (conflict && dirOf(c) === p.door.dir) {
        conflictWithDoor[s]++;
        t.conflictWithDoor[s]++;
      }
    }
  });

  const conflictN = TEAMS.reduce((a, t) => a + f[t].conflictN, 0);
  return {
    n: d.length,
    matched,
    sure,
    sureAgainst,
    doorMatched: d.filter((p) => p.door.dir === p.year).length,
    momentsMatched,
    conflict: {
      n: conflictN,
      withDoor: conflictWithDoor,
      yearWithDoor: TEAMS.reduce((a, t) => a + f[t].conflictYearWithDoor, 0),
      yearWithMoments: TEAMS.reduce(
        (a, t) => a + f[t].conflictYearWithMoments,
        0,
      ),
    },
    teams,
    band: luckBand(d.length),
    teamBand: luckBand(PER_TEAM),
  };
}

/** "10, 11 and 11" */
export function three(a: readonly number[]): string {
  return `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`;
}

/** "went from 5 to 12" / "stayed at 11" */
export function moved(a: number, b: number): string {
  return a === b ? `stayed at ${a}` : `went from ${a} to ${b}`;
}

/** The whole number nearest to a share of a hundred. */
export const per100 = (x: number): number => Math.round(x * 100);

/**
 * The debrief in sentences, every number a count off the sitting. Nothing here
 * says a call was a mistake or that the reader leaned on the first second too
 * much: it says what the calls did, and what a coin and two plain rules would
 * have done on the same people.
 */
export function readings(t: Tally): string[] {
  const { n, band } = t;
  const out: string[] = [];
  out.push(
    `Your calls matched the year for ${three(t.matched)} of ${n}, at one moment, three and six. A coin lands between ${band.lo} and ${band.hi} in ${per100(band.cover)} sittings of a hundred.`,
  );
  out.push(
    `You were sure, on a one or a four, on ${three(t.sure)}. Of those, ${three(t.sureAgainst)} went against the year.`,
  );
  out.push(
    `From the first call to the last, your sure calls ${moved(t.sure[0], t.sure[2])} of ${n} and the calls that matched the year ${moved(t.matched[0], t.matched[2])}.`,
  );
  out.push(
    `A reader going only by the moments met so far would have matched ${three(t.momentsMatched)}. A reader going only by the first second would have matched ${t.doorMatched}, at every call.`,
  );
  const c = t.conflict;
  out.push(
    `Of the ${c.n} people whose first second pointed away from where the six moments came to, your calls went with the first second for ${three(c.withDoor)}. The year went with the first second for ${c.yearWithDoor} of them and with the moments for ${c.yearWithMoments}.`,
  );
  const [a, b] = [t.teams.Ash, t.teams.Birch];
  out.push(
    `On Ash the first second matched the year for ${a.doorMatched} of ${a.n} and the moments for ${a.momentsMatched}. On Birch the first second matched for ${b.doorMatched} of ${b.n} and the moments for ${b.momentsMatched}.`,
  );
  out.push(
    `At one moment you were sure on ${a.sure[0]} of ${a.n} on Ash and ${b.sure[0]} of ${b.n} on Birch, and your calls went with the first second for ${a.conflictWithDoor[0]} of the ${a.conflictN} whose first second pointed away on Ash and ${b.conflictWithDoor[0]} of the ${b.conflictN} on Birch.`,
  );
  return out;
}
