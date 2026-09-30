/**
 * The crowd: a positive result seen against how rare the thing is. A thousand
 * people are drawn; how many of them have the thing, how many of those the
 * test catches, how many of the rest it flags anyway — and so, of everyone
 * flagged, how many have it. The arithmetic is Bayes' rule in whole people
 * (Gigerenzer's natural frequencies), which is the form people read without
 * help. Nothing here says whether a test is good or a reader is right: the
 * readings are counts, and a guess is set beside the count, never graded.
 */

/** How many are drawn. Every count is out of this. */
export const N = 1000;

/** How rare the thing is (1 in `rare`), how often the test catches it, how often it flags the rest. */
export type Crowd = { rare: number; catches: number; flags: number };

/** The nouns a situation is said in. */
export type Words = {
  /** "people", "drivers", "emails" */
  people: string;
  /** singular and plural: ["has the illness", "have the illness"] */
  has: [string, string];
  /** "the test", "the device", "the filter" */
  test: string;
};

export type Counts = {
  /** have the thing */
  so: number;
  /** do not */
  not: number;
  /** have it and are flagged */
  caught: number;
  /** have it and are not */
  missed: number;
  /** do not have it and are flagged anyway */
  alarms: number;
  /** everyone flagged */
  flagged: number;
};

/** Of those flagged, the share that have the thing. */
export function chance(c: Crowd): number {
  const p = 1 / c.rare;
  const yes = p * c.catches;
  const no = (1 - p) * c.flags;
  return yes + no === 0 ? 0 : yes / (yes + no);
}

/** The crowd in whole people. At least one has the thing, so there is someone to find. */
export function counts(c: Crowd, n = N): Counts {
  const so = Math.max(1, Math.min(n, Math.round(n / c.rare)));
  const not = n - so;
  const caught = Math.round(so * c.catches);
  const alarms = Math.round(not * c.flags);
  return {
    so,
    not,
    caught,
    missed: so - caught,
    alarms,
    flagged: caught + alarms,
  };
}

const mulberry32 = (a: number) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * Who in the crowd is who: a seeded shuffle of the seats, so the ones who have
 * the thing are scattered, not the first few, and the picture holds still while
 * the dials move. The first `so` seats have it; of those the first `caught` are
 * flagged; the next `alarms` seats are flagged without it.
 */
export function order(seed: number, n = N): number[] {
  const r = mulberry32(seed);
  const a = Array.from({ length: n }, (_, i) => i);
  for (let j = n - 1; j > 0; j--) {
    const k = Math.floor(r() * (j + 1));
    [a[j], a[k]] = [a[k], a[j]];
  }
  return a;
}

/** The rare dial, 0–100, runs 1 in 2 to 1 in 1,000 on a log scale, rounded as a person would say it. */
export function rareOfDial(t: number): number {
  let n = Math.round(2 * Math.pow(500, Math.min(100, Math.max(0, t)) / 100));
  if (n > 200) n = Math.round(n / 25) * 25;
  else if (n > 20) n = Math.round(n / 5) * 5;
  return n;
}

export function dialOfRare(rare: number): number {
  return Math.round((100 * Math.log(rare / 2)) / Math.log(500));
}

/** A share as it would be said: 9, 0.5, 99+. */
export function pct(p: number): string {
  const x = p * 100;
  if (x >= 99.5) return "99+";
  if (x >= 10) return String(Math.round(x));
  if (x >= 1) return String(Math.round(x * 10) / 10);
  return String(Math.round(x * 100) / 100);
}

export const fmt = (n: number) => n.toLocaleString("en-US");

const one = (n: number, w: Words) => (n === 1 ? w.has[0] : w.has[1]);
const is = (n: number) => (n === 1 ? "is" : "are");

/** The crowd said back in whole people. The last sentence is the count that matters. */
export function story(c: Crowd, w: Words): string {
  const k = counts(c);
  const head = `Of ${fmt(N)} ${w.people}, ${fmt(k.so)} ${one(k.so, w)}.`;
  if (k.flagged === 0)
    return `${head} ${cap(w.test)} flags no one, so there is no one to ask about.`;
  return (
    `${head} ${cap(w.test)} catches ${fmt(k.caught)}` +
    (k.missed ? ` and misses ${fmt(k.missed)}` : "") +
    `. It also flags ${fmt(k.alarms)} of the ${fmt(k.not)} who do not.` +
    ` So of the ${fmt(k.flagged)} flagged, ${fmt(k.caught)} ${one(k.caught, w)}: ${pct(chance(c))} in 100.`
  );
}

/**
 * What each dial does from here: the same crowd with the thing twice as common,
 * with half the flags on those who do not have it, and with every one who has
 * it caught. Three counts beside the count, so the reader can see which dial
 * moves it; nothing says which dial they should turn.
 */
export function leans(c: Crowd): { name: string; chance: number }[] {
  return [
    // Already 1 in 2: there is no rarer-halved crowd to set beside it.
    ...(c.rare > 2
      ? [
          {
            name: `at 1 in ${fmt(Math.max(2, Math.round(c.rare / 2)))} instead`,
            chance: chance({ ...c, rare: Math.max(2, c.rare / 2) }),
          },
        ]
      : []),
    {
      name: "with half the flags on those who do not have it",
      chance: chance({ ...c, flags: c.flags / 2 }),
    },
    {
      name: "catching every one who has it",
      chance: chance({ ...c, catches: 1 }),
    },
  ];
}

/** A guess set beside the crowd's count. Two numbers and what others said; no grade. */
export function guessReading(guess: number, c: Crowd, asked: string): string {
  return `You said ${guess} in 100. The crowd says ${pct(chance(c))} in 100. ${asked}`;
}

/** Every sentence the view reads back, for the test that keeps verdicts out of them. */
export function readings(
  c: Crowd,
  w: Words,
  guess: number | null,
  asked: string,
): string[] {
  const out = [
    story(c, w),
    ...leans(c).map((l) => `${l.name}, ${pct(l.chance)} in 100`),
  ];
  if (guess !== null) out.unshift(guessReading(guess, c, asked));
  return out;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
