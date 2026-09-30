import matter from "gray-matter";

/**
 * The half-second: a feed engineered against a toy body. A body registers a
 * card about 150 ms after it lands and the reader becomes aware of it about
 * 500 ms after; everything a feed is built to do happens in that gap. The
 * sheet runs a synthetic feed of twelve cards against a synthetic body —
 * gauges, an unnamed bloom — and keeps a trace of what the reader did with
 * it: every dwell, skip and tap, the meters that moved and did not move
 * back, the weights the feed learned. Then the question, twice: what the
 * reader would say they were doing, in their own words, beside what the
 * trace shows. The desk counts; it never says the reader was hooked, weak,
 * or should put the phone down. The feed is fiction and the body is a toy;
 * nothing is measured from the reader.
 *
 * After Massumi's missing half-second (1995), Libet (1983), Nisbett and
 * Wilson's confabulated reasons (1977), Cooley's looking-glass self (1902).
 * None of it is checked against a primary source here; the instrument the
 * sheet is ported from lists them as unverified.
 */

export type Tech =
  | "hail"
  | "comparison"
  | "outrage"
  | "face"
  | "autoplay"
  | "buzz"
  | "spinner"
  | "reward"
  | "none";
export type Cls = "threat" | "comparison" | "hail" | "reward";
export type Norm = "followers" | "income" | "fitness" | "informed";
export const NORMS: Norm[] = ["followers", "income", "fitness", "informed"];
export const NORM_LABEL: Record<Norm, string> = {
  followers: "followers",
  income: "income",
  fitness: "fitness",
  informed: "being informed",
};
export type Preset = "pager" | "whatsapp" | "late";
export const PRESETS: Preset[] = ["pager", "whatsapp", "late"];
export const PRESET_LABEL: Record<Preset, string> = {
  pager: "pager years",
  whatsapp: "WhatsApp years",
  late: "no phone until twenty",
};
export type Vocab = "coarse" | "granular";
export type Loc = "head" | "eye" | "chest" | "gut" | "hands";
export type Channel = "eye" | "ear" | "skin" | "neck" | "gut";

export type Card = {
  id: string;
  tech: Tech;
  who: string;
  handle: string;
  text: string;
  metric: string;
  /** How hard it lands, 0 to 1, before the preset and habituation. */
  i: number;
  loc: Loc;
  norm: Record<Norm, number>;
};

export type Gauges = {
  hr: number;
  eda: number;
  pupil: number;
  breath: number;
  neck: number;
  ant: number;
};
export type GaugeKey = keyof Gauges;
export const GAUGE_KEYS: GaugeKey[] = [
  "hr",
  "eda",
  "pupil",
  "breath",
  "neck",
  "ant",
];
export const GAUGE_LABEL: Record<GaugeKey, [string, string, number]> = {
  hr: ["heart rate", "bpm", 0],
  eda: ["conductance", "µS", 1],
  pupil: ["pupil", "mm", 1],
  breath: ["breath", "/min", 0],
  neck: ["neck flexion", "°", 0],
  ant: ["anticipation", "", 2],
};

export type Meters = { standing: number; threat: number; agency: number };
export type MeterKey = keyof Meters;
export const METER_KEYS: MeterKey[] = ["standing", "threat", "agency"];
export type Weights = Record<Cls, number>;
export const CLASSES: Cls[] = ["threat", "comparison", "hail", "reward"];
export const CLS_LABEL: Record<Cls, string> = {
  threat: "threat-responsive",
  comparison: "comparison-responsive",
  hail: "hail-responsive",
  reward: "reward-responsive",
};

/* ── the specimen feed ───────────────────────────────────────────────────── */

const N = (
  followers: number,
  income: number,
  fitness: number,
  informed: number,
): Record<Norm, number> => ({ followers, income, fitness, informed });

export const CARDS: Card[] = [
  {
    id: "c1",
    tech: "hail",
    who: "Notifications",
    handle: "system",
    text: "3 people mentioned you in a thread you left yesterday.",
    metric: "",
    i: 0.7,
    loc: "head",
    norm: N(0.6, 0.1, 0, 0.3),
  },
  {
    id: "c2",
    tech: "comparison",
    who: "Maya R.",
    handle: "@maya.builds",
    text: "Closed the round. 18 months from first commit to term sheet. Grateful, tired, not stopping.",
    metric: "2,314 likes · 188 reposts",
    i: 0.65,
    loc: "gut",
    norm: N(0.7, 0.9, 0.1, 0.2),
  },
  {
    id: "c3",
    tech: "outrage",
    who: "Signal Desk",
    handle: "@signaldesk",
    text: "They are coming for people like you next, and the people who could stop it are laughing about it on a panel.",
    metric: "9,872 likes · 4,101 reposts",
    i: 0.85,
    loc: "chest",
    norm: N(0.2, 0.3, 0, 0.8),
  },
  {
    id: "c4",
    tech: "none",
    who: "Ilse K.",
    handle: "@ilse.k",
    text: "Lake this morning. Cold enough to count to ten and no further.",
    metric: "41 likes",
    i: 0.1,
    loc: "chest",
    norm: N(0, 0, 0.2, 0),
  },
  {
    id: "c5",
    tech: "face",
    who: "Tomas V.",
    handle: "@tomasv",
    text: "You already know what I am going to say.",
    metric: "612 likes",
    i: 0.55,
    loc: "head",
    norm: N(0.4, 0, 0, 0.2),
  },
  {
    id: "c6",
    tech: "spinner",
    who: "Loading",
    handle: "…",
    text: "Someone you follow just posted.",
    metric: "",
    i: 0.5,
    loc: "gut",
    norm: N(0.5, 0, 0, 0.3),
  },
  {
    id: "c7",
    tech: "comparison",
    who: "Rafe",
    handle: "@rafe.runs",
    text: "Sub-3 at 41. If you are not tracking it you are not doing it.",
    metric: "1,088 likes",
    i: 0.6,
    loc: "gut",
    norm: N(0.3, 0.1, 0.95, 0),
  },
  {
    id: "c8",
    tech: "buzz",
    who: "Direct",
    handle: "system",
    text: "New message.",
    metric: "",
    i: 0.6,
    loc: "hands",
    norm: N(0.4, 0, 0, 0.2),
  },
  {
    id: "c9",
    tech: "autoplay",
    who: "Clip",
    handle: "@wireclip",
    text: "Watch to the end.",
    metric: "2.1M views",
    i: 0.45,
    loc: "eye",
    norm: N(0.2, 0, 0, 0.4),
  },
  {
    id: "c10",
    tech: "none",
    who: "Priya S.",
    handle: "@priya.cooks",
    text: "Dal with too much lemon again. It is fine. It is always fine.",
    metric: "73 likes",
    i: 0.1,
    loc: "chest",
    norm: N(0, 0, 0, 0),
  },
  {
    id: "c11",
    tech: "outrage",
    who: "Anon 4471",
    handle: "@a4471",
    text: "This is what your side actually thinks of you. Read the replies.",
    metric: "3,304 likes",
    i: 0.75,
    loc: "chest",
    norm: N(0.2, 0.2, 0, 0.7),
  },
  {
    id: "c12",
    tech: "none",
    who: "Ben O.",
    handle: "@ben.o",
    text: "Finished the bookshelf. It leans. It holds.",
    metric: "58 likes",
    i: 0.1,
    loc: "chest",
    norm: N(0, 0, 0, 0),
  },
];

/** The card the pull sometimes yields. */
export const GOOD: Card = {
  id: "g",
  tech: "reward",
  who: "Sana",
  handle: "@sana",
  text: "Reread your thing from March today. Still the clearest version of that argument I have seen.",
  metric: "12 likes",
  i: 0.7,
  loc: "hands",
  norm: N(0.5, 0.1, 0, 0.1),
};

export const cardById = (id: string): Card | undefined =>
  id === "g" ? GOOD : CARDS.find((c) => c.id === id);

export type TechInfo = {
  label: string;
  sense: string;
  ch: Channel[];
  d: Gauges;
  cls: Cls | null;
  say: string[];
};
const G = (
  hr: number,
  eda: number,
  pupil: number,
  breath: number,
  neck: number,
  ant: number,
): Gauges => ({ hr, eda, pupil, breath, neck, ant });

export const TECH: Record<Tech, TechInfo> = {
  hail: {
    label: "the hail",
    sense: "the eye, then the name",
    ch: ["eye"],
    d: G(8, 0.6, 0.5, 1, 2, 0.8),
    cls: "hail",
    say: ["I just wanted to see who it was.", "It might have been important."],
  },
  comparison: {
    label: "social comparison",
    sense: "the eye, then a norm",
    ch: ["eye", "gut"],
    d: G(6, 0.8, 0.2, 2, 6, 0.2),
    cls: "comparison",
    say: ["Good for her, honestly.", "I was just curious how they did it."],
  },
  outrage: {
    label: "outrage seed",
    sense: "threat detection",
    ch: ["eye", "gut"],
    d: G(14, 1.2, 0.6, 4, 3, 0.3),
    cls: "threat",
    say: [
      "That take was wrong and someone had to say so.",
      "I needed to know what they were saying.",
    ],
  },
  face: {
    label: "the face",
    sense: "gaze detection",
    ch: ["eye"],
    d: G(5, 0.5, 0.7, 0, 1, 0.3),
    cls: "hail",
    say: ["He looked like he had something to say."],
  },
  autoplay: {
    label: "autoplay",
    sense: "peripheral vision",
    ch: ["eye", "neck"],
    d: G(2, 0.3, 0.4, 0, 5, 0.4),
    cls: "reward",
    say: ["I only watched a few seconds."],
  },
  buzz: {
    label: "the buzz",
    sense: "the skin",
    ch: ["skin"],
    d: G(7, 0.9, 0.3, 1, 0, 0.6),
    cls: "reward",
    say: ["My phone went, so I checked."],
  },
  spinner: {
    label: "the spinner",
    sense: "anticipation",
    ch: ["gut"],
    d: G(2, 0.5, 0.2, -2, 2, 0.7),
    cls: "reward",
    say: ["It was loading. I waited a second."],
  },
  reward: {
    label: "variable reward",
    sense: "anticipation, the thumb",
    ch: ["skin", "gut"],
    d: G(4, 0.4, 0.3, 0, 0, 0.9),
    cls: "reward",
    say: ["Sometimes there is something nice in there."],
  },
  none: {
    label: "",
    sense: "",
    ch: [],
    d: G(0, 0, 0, 0, 0, 0),
    cls: null,
    say: ["Nothing. I just kept going."],
  },
};

export const BODY = {
  base: G(62, 2.1, 3.4, 12, 14, 0) as Gauges,
  max: G(20, 1.6, 1, 6, 10, 1) as Gauges,
  /** Seconds for a gauge to fall most of the way back. */
  tau: 30,
  bloomTau: 9,
  /** What a repeated card lands with, each time after the first. */
  habit: 0.62,
};

const PRESET_W: Record<Preset, Record<Channel, number>> = {
  pager: { eye: 1, ear: 1, skin: 1.4, neck: 1, gut: 1 },
  whatsapp: { eye: 1.2, ear: 1, skin: 0.8, neck: 1.1, gut: 1 },
  late: { eye: 0.7, ear: 0.8, skin: 0.6, neck: 0.9, gut: 0.8 },
};

export const VOCAB: Record<Vocab, [number, string][]> = {
  coarse: [
    [0.15, "meh"],
    [0.5, "bad"],
    [1.01, "bad"],
  ],
  granular: [
    [0.12, "unbothered"],
    [0.22, "nudged"],
    [0.32, "alert"],
    [0.42, "wanting"],
    [0.52, "behind"],
    [0.62, "exposed"],
    [0.72, "summoned"],
    [0.82, "bristling"],
    [0.92, "braced"],
    [1.01, "flooded"],
  ],
};

const METER_READS: Record<MeterKey, [number, string][]> = {
  standing: [
    [25, "I'm behind"],
    [45, "I'm slipping"],
    [65, "I'm fine"],
    [101, "I'm ahead"],
  ],
  threat: [
    [25, "the world is fine"],
    [50, "something is off"],
    [75, "the world is hostile"],
    [101, "they are coming"],
  ],
  agency: [
    [25, "I'm summoned"],
    [50, "I'm answering"],
    [75, "I'm choosing"],
    [101, "I choose"],
  ],
};

export const METERS_AT_REST: Meters = { standing: 50, threat: 12, agency: 70 };
export const WEIGHTS_AT_REST: Weights = {
  threat: 0.25,
  comparison: 0.25,
  hail: 0.25,
  reward: 0.25,
};

/* ── the body ────────────────────────────────────────────────────────────── */

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const read = (table: [number, string][], v: number) => {
  for (const [lim, s] of table) if (v < lim) return s;
  return table[table.length - 1][1];
};

/** How hard a card's channels land under a preset: texture has a history. */
export function weightOf(tech: Tech, preset: Preset): number {
  const t = TECH[tech];
  if (!t.ch.length) return 1;
  const p = PRESET_W[preset];
  return t.ch.reduce((a, c) => a + p[c], 0) / t.ch.length;
}

/**
 * A card lands. The target every gauge is moving toward shifts by the card's
 * vector, scaled by how hard it lands and how many times it has landed
 * before; the bloom is that intensity, at the card's place on the body.
 */
export function stimulate(
  target: Gauges,
  card: Card,
  taps: number,
  preset: Preset,
): { target: Gauges; k: number } {
  const t = TECH[card.tech];
  const habit = Math.pow(BODY.habit, Math.max(0, taps - 1));
  const k = clamp(card.i * weightOf(card.tech, preset) * habit, 0, 1);
  const next = { ...target };
  for (const g of GAUGE_KEYS)
    next[g] = clamp(
      target[g] + t.d[g] * k * 1.6,
      BODY.base[g] - BODY.max[g] * 0.3,
      BODY.base[g] + BODY.max[g],
    );
  return { target: next, k };
}

/** One tick: the gauges chase their target, the target settles toward rest. */
export function settle(
  g: Gauges,
  target: Gauges,
  dt: number,
  down = false,
): { g: Gauges; target: Gauges } {
  const tau = down ? BODY.tau * 3 : BODY.tau;
  const ng = { ...g };
  const nt = { ...target };
  for (const k of GAUGE_KEYS) {
    ng[k] += (target[k] - g[k]) * (1 - Math.exp(-dt / 1.2));
    nt[k] += (BODY.base[k] - target[k]) * (1 - Math.exp(-dt / tau));
  }
  return { g: ng, target: nt };
}

/** The bloom fades; the meters do not. */
export const fade = (i: number, dt: number) =>
  i * Math.exp(-dt / BODY.bloomTau);

/** What a card leaves behind: the meters move and do not move back. */
export function sediment(m: Meters, card: Card, k: number, norm: Norm): Meters {
  const n = { ...m };
  if (card.tech === "comparison") n.standing -= k * (card.norm[norm] || 0) * 18;
  if (card.tech === "outrage") n.threat += k * 22;
  if (card.tech === "reward") n.standing += k * 4;
  for (const key of METER_KEYS) n[key] = clamp(n[key], 0, 100);
  return n;
}

/** The hail answered or let go. */
export function hailed(m: Meters, answered: boolean): Meters {
  return {
    ...m,
    agency: clamp(m.agency + (answered ? -8 : 3), 0, 100),
  };
}

/** The feed learns from what the reader did with a card. */
export function learn(
  w: Weights,
  tech: Tech,
  kind: "dwell" | "skip" | "tap",
): Weights {
  const cls = TECH[tech].cls;
  if (!cls) return w;
  const d = kind === "tap" ? 0.12 : kind === "dwell" ? 0.08 : -0.03;
  return { ...w, [cls]: clamp(w[cls] + d, 0, 1) };
}

export const flat = (w: Weights) => CLASSES.every((c) => w[c] < 0.01);

/** The next feed, from what the feed thinks the reader is. */
export function orderCards(
  ids: string[],
  w: Weights,
  rand: () => number = Math.random,
): string[] {
  if (flat(w)) return ids.filter((id) => cardById(id)?.tech === "none");
  const score = (id: string) => {
    const c = cardById(id);
    if (!c) return -1;
    const cls = TECH[c.tech].cls;
    return (cls ? w[cls] : 0) * c.i + rand() * 0.15;
  };
  return [...ids]
    .map((id) => ({ id, s: score(id) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.id);
}

export const nameOf = (i: number, vocab: Vocab) => read(VOCAB[vocab], i);
export const readMeter = (k: MeterKey, v: number) => read(METER_READS[k], v);

/** What the feed thinks the reader is, in a sentence. */
export function thinks(w: Weights): string {
  if (flat(w))
    return "It thinks you are nobody in particular. So it has nothing to serve.";
  const top = CLASSES.map((c) => [c, w[c]] as const).sort(
    (a, b) => b[1] - a[1],
  );
  return `It thinks you are ${CLS_LABEL[top[0][0]]} first and ${CLS_LABEL[top[1][0]]} second, and it will serve accordingly.`;
}

/* ── the trace ───────────────────────────────────────────────────────────── */

export type EvKind =
  | "dwell"
  | "skip"
  | "glance"
  | "tap"
  | "pull"
  | "reward"
  | "hail"
  | "down"
  | "up";
export type Ev = {
  kind: EvKind;
  /** Milliseconds since the trace began. */
  at: number;
  card?: string;
  /** For a dwell, skip or glance: how long the card was in view. */
  ms?: number;
  /** For a tap: the nth on that card. */
  n?: number;
};

export type Trace = {
  slug: string;
  /** ISO with the machine's offset. */
  at: string;
  preset: Preset;
  norm: Norm;
  vocab: Vocab;
  events: Ev[];
  meters: Meters;
  weights: Weights;
  /** The bloom at its highest, and the gauges at their highest. */
  peak: number;
  peaks: Gauges;
  /** What the reader would say they were doing, in their own words. */
  say: string;
  after: string;
  stone: string | null;
};

export const emptyTrace = (at: string): Trace => ({
  slug: "",
  at,
  preset: "pager",
  norm: "followers",
  vocab: "coarse",
  events: [],
  meters: { ...METERS_AT_REST },
  weights: { ...WEIGHTS_AT_REST },
  peak: 0,
  peaks: { ...BODY.base },
  say: "",
  after: "",
  stone: null,
});

export const hasContent = (t: Trace) =>
  t.events.some((e) => e.kind !== "glance") || t.say.trim().length > 0;

const secs = (ms: number) =>
  ms < 1000
    ? `${Math.round(ms)} ms`
    : `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)} s`;
const cardWords = (id: string | undefined) => {
  const c = id ? cardById(id) : undefined;
  if (!c) return "a card";
  const idx = CARDS.indexOf(c) + 1;
  const t = TECH[c.tech].label || "plain";
  return c.id === "g" ? "the good card" : `card ${idx} (${t})`;
};

/**
 * What the trace shows: the events as the record has them, in order, then
 * what moved. Every line is a count or a time; none is a reason.
 */
export function shows(t: Trace): string[] {
  const out: string[] = [];
  const ev = t.events;
  const seen = new Set(ev.filter((e) => e.card).map((e) => e.card));
  const dwells = ev.filter((e) => e.kind === "dwell");
  const skips = ev.filter((e) => e.kind === "skip");
  const taps = ev.filter((e) => e.kind === "tap");
  const pulls = ev.filter((e) => e.kind === "pull").length;
  const rewards = ev.filter((e) => e.kind === "reward");
  const hail = ev.find((e) => e.kind === "hail");
  const down = ev.find((e) => e.kind === "down");
  const last = ev.length ? ev[ev.length - 1].at : 0;
  if (!ev.length) return ["no trace yet"];
  out.push(
    `${seen.size} card${seen.size === 1 ? "" : "s"} seen in ${secs(last)}`,
  );
  if (hail) out.push(`the hail answered at ${secs(hail.at)}`);
  for (const d of dwells.slice(-3))
    out.push(`dwell ${secs(d.ms ?? 0)} on ${cardWords(d.card)}`);
  if (skips.length)
    out.push(
      `${skips.length} skip${skips.length === 1 ? "" : "s"}${pulls ? " under a variable schedule" : ""}`,
    );
  for (const tp of taps.slice(-3))
    out.push(`tap${(tp.n ?? 1) > 1 ? ` ×${tp.n}` : ""} ${cardWords(tp.card)}`);
  if (pulls)
    out.push(
      `${pulls} pull${pulls === 1 ? "" : "s"}, ${rewards.length ? `the good card on pull ${pulls - rewards.length + 1}` : "no good card"}`,
    );
  const eda = t.peaks.eda - BODY.base.eda;
  if (eda > 0.2) out.push(`conductance +${eda.toFixed(1)} µS at its highest`);
  const hr = Math.round(t.peaks.hr - BODY.base.hr);
  if (hr > 2) out.push(`heart rate +${hr} at 150 ms`);
  const st = Math.round(t.meters.standing - METERS_AT_REST.standing);
  const th = Math.round(t.meters.threat - METERS_AT_REST.threat);
  const ag = Math.round(t.meters.agency - METERS_AT_REST.agency);
  if (st)
    out.push(
      `standing ${st > 0 ? "up" : "down"} ${Math.abs(st)} under ${NORM_LABEL[t.norm]}`,
    );
  if (th) out.push(`threat ${th > 0 ? "up" : "down"} ${Math.abs(th)}`);
  if (ag) out.push(`agency ${ag > 0 ? "up" : "down"} ${Math.abs(ag)}`);
  if (down) out.push(`put down at ${secs(down.at)}; the meters did not move`);
  return out;
}

/** The desk's reading of one trace: what is there, never what it means. */
export function readings(t: Trace): string[] {
  const out: string[] = [];
  const ev = t.events;
  if (!ev.length && !t.say.trim()) return ["nothing on the sheet yet"];
  const said = t.say.trim().split(/\s+/).filter(Boolean).length;
  const lines = shows(t);
  if (ev.length) {
    const top = CLASSES.map((c) => [c, t.weights[c]] as const).sort(
      (a, b) => b[1] - a[1],
    );
    out.push(
      flat(t.weights)
        ? "the feed's guess: nobody in particular"
        : `the feed's guess: ${CLS_LABEL[top[0][0]]} first`,
    );
    const moved = METER_KEYS.filter(
      (k) => Math.round(t.meters[k]) !== METERS_AT_REST[k],
    );
    out.push(
      moved.length
        ? `${moved.length} of 3 meters moved: ${moved.map((k) => `${k} reads ${readMeter(k, t.meters[k])}`).join(", ")}`
        : "no meter moved",
    );
    if (t.peak > 0.05)
      out.push(
        `the bloom at its highest: ${t.peak.toFixed(2)}, ${nameOf(t.peak, "coarse")} in three words, ${nameOf(t.peak, "granular")} in twelve`,
      );
  }
  out.push(
    said
      ? `what you would say: ${said} word${said === 1 ? "" : "s"} · what the trace shows: ${lines.length} line${lines.length === 1 ? "" : "s"}`
      : `what the trace shows: ${lines.length} line${lines.length === 1 ? "" : "s"}; nothing said yet`,
  );
  return out;
}

export type Tally = {
  n: number;
  hailAnswered: number;
  putDown: number;
  standingDown: number;
  threatUp: number;
  said: number;
  first: Partial<Record<Cls, number>>;
};

export function tally(traces: Trace[]): Tally {
  const t: Tally = {
    n: traces.length,
    hailAnswered: 0,
    putDown: 0,
    standingDown: 0,
    threatUp: 0,
    said: 0,
    first: {},
  };
  for (const tr of traces) {
    if (tr.events.some((e) => e.kind === "hail")) t.hailAnswered++;
    if (tr.events.some((e) => e.kind === "down")) t.putDown++;
    if (tr.meters.standing < METERS_AT_REST.standing - 0.5) t.standingDown++;
    if (tr.meters.threat > METERS_AT_REST.threat + 0.5) t.threatUp++;
    if (tr.say.trim()) t.said++;
    if (!flat(tr.weights) && tr.events.length) {
      const top = CLASSES.map((c) => [c, tr.weights[c]] as const).sort(
        (a, b) => b[1] - a[1],
      )[0][0];
      t.first[top] = (t.first[top] ?? 0) + 1;
    }
  }
  return t;
}

/** The record across every trace kept: counts, never a grade. */
export function recordReadings(t: Tally): string[] {
  if (!t.n) return ["no trace kept yet"];
  const out = [`${t.n} trace${t.n === 1 ? "" : "s"} kept`];
  out.push(`the hail answered in ${t.hailAnswered} of ${t.n}`);
  out.push(`put down in ${t.putDown} of ${t.n}`);
  out.push(`standing down in ${t.standingDown}, threat up in ${t.threatUp}`);
  const firsts = CLASSES.filter((c) => t.first[c]).map(
    (c) => `${CLS_LABEL[c]} ${t.first[c]}×`,
  );
  if (firsts.length) out.push(`the feed's first guess: ${firsts.join(", ")}`);
  out.push(`said in your own words in ${t.said} of ${t.n}`);
  return out;
}

/** A first line for the record. */
export const titleOf = (t: Trace): string => {
  const s = t.say.trim();
  if (s) return s.length > 72 ? `${s.slice(0, 71)}…` : s;
  const ev = t.events;
  if (!ev.length) return "an untouched feed";
  const seen = new Set(ev.filter((e) => e.card).map((e) => e.card)).size;
  return `${seen} card${seen === 1 ? "" : "s"}, ${secs(ev[ev.length - 1].at)}`;
};

/* ── on disk ─────────────────────────────────────────────────────────────── */

const y = (s: string) => JSON.stringify(s);
const KINDS: EvKind[] = [
  "dwell",
  "skip",
  "glance",
  "tap",
  "pull",
  "reward",
  "hail",
  "down",
  "up",
];

const evLine = (e: Ev): string => {
  const parts = [`${e.at}`, e.kind];
  if (e.card) parts.push(e.card);
  if (e.ms !== undefined) parts.push(`${Math.round(e.ms)}ms`);
  if (e.n !== undefined) parts.push(`×${e.n}`);
  return `- ${parts.join(" · ")}`;
};

const parseEv = (line: string): Ev | null => {
  const m = line.match(/^- (\d+) · ([a-z]+)(.*)$/);
  if (!m) return null;
  if (!(KINDS as string[]).includes(m[2])) return null;
  const e: Ev = { kind: m[2] as EvKind, at: +m[1] };
  for (const p of m[3]
    .split(" · ")
    .map((s) => s.trim())
    .filter(Boolean)) {
    if (/^\d+ms$/.test(p)) e.ms = parseInt(p, 10);
    else if (/^×\d+$/.test(p)) e.n = parseInt(p.slice(1), 10);
    else if (/^[a-z0-9]+$/.test(p)) e.card = p;
  }
  return e;
};

const num = (v: unknown, d: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : d;

export function serialiseTrace(t: Trace): string {
  const lines = [
    `at: ${y(t.at)}`,
    `preset: ${t.preset}`,
    `norm: ${t.norm}`,
    `vocab: ${t.vocab}`,
    `meters: { standing: ${t.meters.standing.toFixed(1)}, threat: ${t.meters.threat.toFixed(1)}, agency: ${t.meters.agency.toFixed(1)} }`,
    `weights: { threat: ${t.weights.threat.toFixed(2)}, comparison: ${t.weights.comparison.toFixed(2)}, hail: ${t.weights.hail.toFixed(2)}, reward: ${t.weights.reward.toFixed(2)} }`,
    `peak: ${t.peak.toFixed(2)}`,
    `peaks: { ${GAUGE_KEYS.map((k) => `${k}: ${t.peaks[k].toFixed(2)}`).join(", ")} }`,
  ];
  if (t.stone) lines.push(`stone: ${y(t.stone)}`);
  const body = [
    `## the trace\n\n${t.events.map(evLine).join("\n") || "(none)"}`,
  ];
  if (t.say.trim()) body.push(`## what I would say\n\n${t.say.trim()}`);
  body.push(
    `## what the trace shows\n\n${shows(t)
      .map((l) => `- ${l}`)
      .join("\n")}`,
  );
  if (t.after.trim()) body.push(`## afterwards\n\n${t.after.trim()}`);
  return `---\n${lines.join("\n")}\n---\n\n${body.join("\n\n")}\n`;
}

export function parseTrace(slug: string, raw: string): Trace {
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
  const events = sec("the trace")
    .split("\n")
    .map(parseEv)
    .filter((e): e is Ev => e !== null);
  return validateTrace({
    slug,
    at: data.at,
    preset: data.preset,
    norm: data.norm,
    vocab: data.vocab,
    events,
    meters: data.meters,
    weights: data.weights,
    peak: data.peak,
    peaks: data.peaks,
    say: sec("what i would say"),
    after: sec("afterwards"),
    stone: data.stone ?? null,
  });
}

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.slice(0, max) : "";

export function validateTrace(input: unknown, fallbackAt?: string): Trace {
  const r = (input ?? {}) as Record<string, unknown>;
  const at = str(r.at, 40) || fallbackAt || "";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(at))
    throw new Error("a trace needs the time it began");
  const preset = (PRESETS as string[]).includes(String(r.preset))
    ? (r.preset as Preset)
    : "pager";
  const norm = (NORMS as string[]).includes(String(r.norm))
    ? (r.norm as Norm)
    : "followers";
  const vocab = r.vocab === "granular" ? "granular" : "coarse";
  const events: Ev[] = (Array.isArray(r.events) ? r.events : [])
    .slice(0, 400)
    .map((e) => {
      const o = (e ?? {}) as Record<string, unknown>;
      if (!(KINDS as string[]).includes(String(o.kind))) return null;
      const ev: Ev = {
        kind: o.kind as EvKind,
        at: Math.max(0, Math.round(num(o.at, 0))),
      };
      if (typeof o.card === "string" && cardById(o.card)) ev.card = o.card;
      if (typeof o.ms === "number") ev.ms = Math.max(0, Math.round(o.ms));
      if (typeof o.n === "number") ev.n = Math.max(1, Math.round(o.n));
      return ev;
    })
    .filter((e): e is Ev => e !== null);
  const m = (r.meters ?? {}) as Record<string, unknown>;
  const meters: Meters = {
    standing: clamp(num(m.standing, METERS_AT_REST.standing), 0, 100),
    threat: clamp(num(m.threat, METERS_AT_REST.threat), 0, 100),
    agency: clamp(num(m.agency, METERS_AT_REST.agency), 0, 100),
  };
  const w = (r.weights ?? {}) as Record<string, unknown>;
  const weights = { ...WEIGHTS_AT_REST };
  for (const c of CLASSES) weights[c] = clamp(num(w[c], 0.25), 0, 1);
  const p = (r.peaks ?? {}) as Record<string, unknown>;
  const peaks = { ...BODY.base };
  for (const k of GAUGE_KEYS) peaks[k] = num(p[k], BODY.base[k]);
  const slug = typeof r.slug === "string" ? r.slug : "";
  return {
    slug: slug || slugOf(at),
    at,
    preset,
    norm,
    vocab,
    events,
    meters,
    weights,
    peak: clamp(num(r.peak, 0), 0, 1),
    peaks,
    say: str(r.say, 2000),
    after: str(r.after, 4000),
    stone:
      typeof r.stone === "string" && r.stone ? r.stone.slice(0, 200) : null,
  };
}

/** `2026-09-30-2340`: the day and the minute the trace began. */
export const slugOf = (at: string) =>
  `${at.slice(0, 10)}-${at.slice(11, 13)}${at.slice(14, 16)}`;

/** The words the desk must never use of the reader. */
export const VERDICT =
  /\b(addict\w*|hooked|weak|manipulat\w*|should|unhealthy|healthy|bad for you|wasted|doomscroll\w*|discipline\w*|guilty|shame\w*)\b/i;
