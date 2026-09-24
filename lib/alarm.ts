import matter from "gray-matter";

/**
 * The alarm: will this pathway set off the reader's fight-or-flight? The
 * standalone sandbox is a toy autonomic nervous system you can poke — an
 * amygdala, a prefrontal brake, a vagal brake, a sympathetic surge into the
 * body, with dials for sleep debt, chronic stress, caffeine and vagal tone.
 * Here the same toy is driven by what the reader has named about
 * themselves: the triggers they know set the alarm off, the defences that
 * fire when it does, the brakes that bring it down, and how loaded they are
 * today. A pathway — a decision, a plan, a trajectory — is marked against
 * those, and the line it draws runs to hypervigilance or to calm by the
 * reader's own marks. This file is the pure part: the model, the marks, the
 * readings, and the files. Nothing here decides anything; the toy is a toy.
 */

export type Charge = 1 | 2 | 3;
export type Dose = 1 | 2 | 3;
export type Reflex = "fight" | "flight" | "freeze" | "fawn";
export const REFLEXES: Reflex[] = ["fight", "flight", "freeze", "fawn"];
export type Reach = "seconds" | "hours" | "days";
export const REACHES: Reach[] = ["seconds", "hours", "days"];

/** Something the reader knows sets their alarm off. */
export type Trigger = {
  id: string;
  label: string;
  /** How hard it hits, 1 to 3. The reader's number. */
  charge: Charge;
  /** The defences the reader says usually follow it. */
  pulls: string[];
  /** What the body does first, in the reader's words. */
  signs: string;
  note: string;
};

/** A protection that fires on its own once the alarm is up. */
export type Defence = {
  id: string;
  label: string;
  /** The shape it takes: fight, flight, freeze or fawn. */
  reflex: Reflex;
  /** What it costs, in the reader's words. */
  cost: string;
  note: string;
};

/** Something the reader knows brings the alarm down. */
export type Brake = {
  id: string;
  label: string;
  /** How fast it works. */
  reach: Reach;
  note: string;
};

/** The sandbox's dials, 0 to 100 each: how loaded the reader is today. */
export type Load = {
  sleep: number;
  stress: number;
  caffeine: number;
  tone: number;
};

export type Circuit = {
  triggers: Trigger[];
  defences: Defence[];
  brakes: Brake[];
  load: Load;
  /** The day the load was last set. */
  loadDay: string | null;
};

export type Went = "calm" | "vigilant" | "mixed";
export const WENTS: Went[] = ["calm", "vigilant", "mixed"];

/** A decision, plan or trajectory, marked against the circuit. */
export type Pathway = {
  slug: string;
  title: string;
  /** The pathway in words. */
  put: string;
  /** Which triggers it touches, and how much of each is on it. */
  touches: Record<string, Dose>;
  /** The brakes the reader says are within reach on it. */
  brakes: string[];
  /** The defences the reader expects to fire. */
  expects: string[];
  stones: string[];
  asked: string;
  /** After the fact: how it went, and the day the reader said so. */
  went: Went | null;
  wentDay: string | null;
  note: string;
};

export const DEFAULT_LOAD: Load = {
  sleep: 25,
  stress: 25,
  caffeine: 20,
  tone: 55,
};
export const EMPTY_CIRCUIT: Circuit = {
  triggers: [],
  defences: [],
  brakes: [],
  load: DEFAULT_LOAD,
  loadDay: null,
};

// ── the toy body ──────────────────────────────────────────────────────────

export type Body = {
  amyg: number;
  pfc: number;
  vagal: number;
  cort: number;
  hr: number;
  hrv: number;
  symp: number;
  breatheT: number;
  coldT: number;
  freeze: number;
  freezeChg: number;
};

export type Knobs = {
  tone: number;
  sleep: number;
  stress: number;
  caffeine: number;
};

export const REST_HR = 58;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function rest(k: Knobs): Body {
  return {
    amyg: 0,
    pfc: 18,
    vagal: k.tone * 0.45,
    cort: 0,
    hr: REST_HR,
    hrv: k.tone,
    symp: 0,
    breatheT: 0,
    coldT: 0,
    freeze: 0,
    freezeChg: 0,
  };
}

export const knobsOf = (l: Load): Knobs => ({
  tone: l.tone,
  sleep: l.sleep,
  stress: l.stress,
  caffeine: l.caffeine,
});

/** A cue hits: the low road reaches the amygdala. `hit` is 0 to 10, the sandbox's threat dial. */
export function cue(b: Body, k: Knobs, hit: number): Body {
  const react = 1 + k.sleep / 110 + k.stress / 100;
  return {
    ...b,
    amyg: clamp(b.amyg + (8 + clamp(hit, 0, 10) * 9) * react, 0, 100),
    pfc: clamp(b.pfc + 10, 0, 100),
  };
}

/**
 * A brake applied. Seconds-fast brakes are the sandbox's slow breath; the
 * slower ones reach less far in a run this short, and say so.
 */
export function apply(b: Body, reach: Reach): Body {
  if (reach === "seconds") return { ...b, breatheT: Math.max(b.breatheT, 4.6) };
  if (reach === "hours") return { ...b, coldT: Math.max(b.coldT, 3.6) };
  return { ...b, breatheT: Math.max(b.breatheT, 2.2) };
}

/** The body's ceiling for the brake: sleep debt and chronic stress lower it. */
export const ceilingOf = (k: Knobs) =>
  clamp(100 - k.sleep * 0.45 - k.stress * 0.4, 20, 100);

/** One tick of the toy, `dt` seconds. Ported from the sandbox's loop, unchanged in its physics. */
export function step(b0: Body, k: Knobs, dt: number): Body {
  const b = { ...b0 };
  const pfcCeil = ceilingOf(k);
  const amygBase = k.stress * 0.14;
  const breBoost = b.breatheT > 0 ? 40 : 0;
  const coldBoost = b.coldT > 0 ? 40 : 0;
  const pfcT = clamp(
    18 +
      (b.amyg > 14 ? 16 : 0) -
      (b.amyg > 62 ? (b.amyg - 62) * 1.2 : 0) +
      breBoost * 0.4,
    2,
    pfcCeil,
  );
  b.pfc += (pfcT - b.pfc) * Math.min(1, 3 * dt);
  const vagT = clamp(
    k.tone * 0.45 + breBoost + coldBoost - b.amyg * 0.55,
    0,
    100,
  );
  b.vagal += (vagT - b.vagal) * Math.min(1, 2.4 * dt);
  b.amyg += (amygBase - b.amyg) * 0.05 * dt;
  b.amyg -= b.amyg * 0.25 * dt;
  b.amyg -= (b.pfc / 100) * b.amyg * 0.55 * dt;
  b.amyg -= (b.vagal / 100) * b.amyg * 0.45 * dt;
  b.amyg = clamp(b.amyg, 0, 100);
  b.symp = clamp(b.amyg * 0.9 + k.caffeine * 0.45, 0, 130);
  if (b.amyg > 80) b.freezeChg += dt;
  else b.freezeChg = Math.max(0, b.freezeChg - dt * 0.7);
  if (b.freezeChg > 2.6 && b.freeze <= 0) {
    b.freeze = 3.4;
    b.freezeChg = 0;
  }
  if (b.freeze > 0) b.freeze -= dt;
  if (b.freeze > 0) b.symp *= 0.35;
  const dive = b.coldT > 0 ? 14 : 0;
  const hrT = clamp(
    REST_HR + b.symp * 0.95 - b.vagal * 0.28 - dive - (b.freeze > 0 ? 16 : 0),
    42,
    192,
  );
  b.hr += (hrT - b.hr) * Math.min(1, 3.0 * dt);
  const hrvT = clamp(
    18 + b.vagal * 1.5 + (k.tone - 50) * 0.5 - b.symp * 0.7,
    8,
    180,
  );
  b.hrv += (hrvT - b.hrv) * Math.min(1, 1.2 * dt);
  const cortT = b.amyg * 0.9;
  const cl = k.stress > 40 ? 0.09 : 0.14;
  const kk = cortT > b.cort ? 0.4 : cl;
  b.cort += (cortT - b.cort) * Math.min(1, kk * dt * 2);
  if (b.breatheT > 0) b.breatheT -= dt;
  if (b.coldT > 0) b.coldT -= dt;
  return b;
}

export type StateName =
  "calm" | "rest" | "alert" | "surge" | "hijack" | "freeze";
export const STATE_LABEL: Record<StateName, string> = {
  calm: "Calm",
  rest: "Rest & digest",
  alert: "Alert",
  surge: "Fight or flight",
  hijack: "Amygdala hijack",
  freeze: "Freeze / shutdown",
};
export const STATE_WORDS: Record<StateName, string> = {
  calm: "baseline — the prefrontal cortex in quiet control, the vagus holding the floor.",
  rest: "ventral-vagal — high HRV, slow heart, the body doing its housekeeping.",
  alert:
    "the amygdala watching, the PFC appraising. arousal up, the brake still engaged.",
  surge:
    "full sympathetic surge — heart and muscles mobilised, digestion parked, ready to move.",
  hijack:
    "the alarm has the wheel. the prefrontal cortex is offline — no appraisal, pure reaction.",
  freeze:
    "dorsal-vagal collapse — the brake slammed past the floor. the heart drops, everything goes still.",
};
/** The states past which the reader's nervous system is on the vigilant path rather than the calm one. */
export const VIGILANT: StateName[] = ["surge", "hijack", "freeze"];

export function stateOf(b: Body): StateName {
  if (b.freeze > 0) return "freeze";
  if (b.amyg > 62 && b.pfc < b.amyg * 0.5) return "hijack";
  if (b.amyg >= 42) return "surge";
  if (b.amyg >= 14) return "alert";
  if (b.vagal > 45 && b.amyg < 8) return "rest";
  return "calm";
}

export type Gauges = {
  hr: number;
  hrv: number;
  breath: number;
  sweat: number;
  pupil: number;
  bp: number;
  muscle: number;
  digestion: number;
  /** -100 parasympathetic … +100 sympathetic. */
  balance: number;
};

export function gaugesOf(b: Body): Gauges {
  let breath = clamp(12 + b.symp * 0.14 - b.vagal * 0.05, 4, 40);
  if (b.breatheT > 0) breath = 5.5;
  return {
    hr: b.hr,
    hrv: b.hrv,
    breath,
    sweat: clamp(2 + b.symp * 0.14, 1, 22),
    pupil: clamp(3.2 + b.symp * 0.03 - b.vagal * 0.008, 2.5, 8),
    bp: Math.round(108 + b.symp * 0.5),
    muscle: clamp(b.symp * 0.9, 0, 100),
    digestion: clamp(100 - b.symp * 0.85 + b.vagal * 0.25, 0, 100),
    balance: clamp(b.symp - b.vagal, -100, 100),
  };
}

/** A whole run, without the screen: the cues in order, a brake pressed at `brakeAt` seconds, sampled every `dt`. */
export function simulate(
  k: Knobs,
  hits: number[],
  opts: {
    gap?: number;
    brake?: { at: number; reach: Reach } | null;
    seconds?: number;
    dt?: number;
  } = {},
): {
  peak: StateName;
  peakAt: number;
  peakHr: number;
  calmAt: number | null;
  states: StateName[];
} {
  const gap = opts.gap ?? 1.4;
  const dt = opts.dt ?? 0.05;
  const seconds = opts.seconds ?? 40;
  let b = rest(k);
  const order: StateName[] = [
    "calm",
    "rest",
    "alert",
    "surge",
    "hijack",
    "freeze",
  ];
  const rank = (s: StateName) =>
    s === "freeze"
      ? 5
      : s === "hijack"
        ? 4
        : s === "surge"
          ? 3
          : s === "alert"
            ? 2
            : 0;
  let peak: StateName = "calm";
  let peakAt = 0;
  let peakHr = b.hr;
  let calmAt: number | null = null;
  let wasUp = false;
  const states: StateName[] = [];
  let next = 0;
  let braked = false;
  for (let t = 0; t <= seconds; t += dt) {
    while (next < hits.length && t >= 0.6 + next * gap) {
      b = cue(b, k, hits[next]);
      next++;
    }
    if (opts.brake && !braked && t >= opts.brake.at) {
      b = apply(b, opts.brake.reach);
      braked = true;
    }
    b = step(b, k, dt);
    const s = stateOf(b);
    states.push(s);
    if (rank(s) > rank(peak)) {
      peak = s;
      peakAt = t;
    }
    if (b.hr > peakHr) peakHr = b.hr;
    if (rank(s) >= 2) wasUp = true;
    if (wasUp && rank(s) < 2 && calmAt === null && next >= hits.length)
      calmAt = t;
  }
  void order;
  return { peak, peakAt, peakHr, calmAt, states };
}

// ── the marks, drawn ──────────────────────────────────────────────────────

export const REACH_WEIGHT: Record<Reach, number> = {
  seconds: 3,
  hours: 2,
  days: 1,
};

export type Bend = {
  kind: "trigger" | "brake";
  id: string;
  label: string;
  amount: number;
};

/**
 * What the marks imply, before any run: each touched trigger bends the line
 * up by its charge times the dose; each brake within reach bends it down by
 * its reach, scaled by how much room the brake has today. The sum is where
 * the line ends, between hypervigilance and calm. It is the reader's marks,
 * added up, and nothing else.
 */
export function bendsOf(
  p: Pathway,
  c: Circuit,
): { bends: Bend[]; up: number; down: number; lean: number } {
  const bends: Bend[] = [];
  let up = 0;
  let down = 0;
  const room = ceilingOf(knobsOf(c.load)) / 100;
  for (const t of c.triggers) {
    const dose = p.touches[t.id];
    if (!dose) continue;
    const amount = t.charge * dose;
    up += amount;
    bends.push({ kind: "trigger", id: t.id, label: t.label, amount });
  }
  for (const b of c.brakes) {
    if (!p.brakes.includes(b.id)) continue;
    const amount = REACH_WEIGHT[b.reach] * room;
    down += amount;
    bends.push({ kind: "brake", id: b.id, label: b.label, amount });
  }
  const lean =
    up + down === 0 ? 0 : clamp((up - down) / Math.max(4, up + down), -1, 1);
  return { bends, up, down, lean };
}

export type Lean = "vigilant" | "calm" | "between";
export const leanOf = (lean: number): Lean =>
  lean > 0.25 ? "vigilant" : lean < -0.25 ? "calm" : "between";

// ── the tally and readings ────────────────────────────────────────────────

export type Tally = {
  known: number;
  touched: Trigger[];
  hardest: Trigger[];
  pulled: { trigger: Trigger; defences: Defence[] }[];
  expected: Defence[];
  within: Brake[];
  fastest: Reach | null;
  ceiling: number;
  lean: Lean;
  up: number;
  down: number;
  asked: number;
  walked: number;
  went: Record<Went, number>;
  /** Among the pathways that went vigilant, the triggers they touched most. */
  vigilantTriggers: { trigger: Trigger; n: number; of: number }[];
};

export function tally(p: Pathway | null, c: Circuit, all: Pathway[]): Tally {
  const byId = new Map(c.defences.map((d) => [d.id, d]));
  const touched = p ? c.triggers.filter((t) => p.touches[t.id]) : [];
  const hardest = touched.filter(
    (t) => t.charge * (p!.touches[t.id] ?? 0) >= 6,
  );
  const pulled = touched
    .map((t) => ({
      trigger: t,
      defences: t.pulls
        .map((id) => byId.get(id))
        .filter((d): d is Defence => !!d),
    }))
    .filter((x) => x.defences.length);
  const expected = p
    ? p.expects.map((id) => byId.get(id)).filter((d): d is Defence => !!d)
    : [];
  const within = p ? c.brakes.filter((b) => p.brakes.includes(b.id)) : [];
  const fastest = within.reduce<Reach | null>((f, b) => {
    if (!f) return b.reach;
    return REACHES.indexOf(b.reach) < REACHES.indexOf(f) ? b.reach : f;
  }, null);
  const bends = p ? bendsOf(p, c) : { up: 0, down: 0, lean: 0 };
  const went: Record<Went, number> = { calm: 0, vigilant: 0, mixed: 0 };
  for (const x of all) if (x.went) went[x.went]++;
  const vig = all.filter((x) => x.went === "vigilant");
  const vigilantTriggers = c.triggers
    .map((t) => ({
      trigger: t,
      n: vig.filter((x) => x.touches[t.id]).length,
      of: vig.length,
    }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3);
  return {
    known: c.triggers.length,
    touched,
    hardest,
    pulled,
    expected,
    within,
    fastest,
    ceiling: Math.round(ceilingOf(knobsOf(c.load))),
    lean: leanOf(bends.lean),
    up: bends.up,
    down: bends.down,
    asked: all.length,
    walked: all.filter((x) => x.went).length,
    went,
    vigilantTriggers,
  };
}

const list = (xs: string[]) =>
  xs.length <= 1
    ? xs.join("")
    : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

/** Facts about the marks, in sentences. None of them is a verdict on the reader. */
export function readings(t: Tally, p: Pathway | null, c: Circuit): string[] {
  const out: string[] = [];
  if (c.triggers.length === 0)
    return [
      "name what sets your alarm off first — the circuit is yours to draw, and the sheet draws nothing you have not said.",
    ];
  if (!p) {
    out.push(
      `your circuit: ${c.triggers.length} known ${c.triggers.length === 1 ? "trigger" : "triggers"}, ${c.defences.length} ${c.defences.length === 1 ? "defence" : "defences"}, ${c.brakes.length} ${c.brakes.length === 1 ? "brake" : "brakes"}.`,
    );
  } else {
    if (t.touched.length === 0)
      out.push(
        `touches none of your ${t.known} known triggers — as far as you have named them.`,
      );
    else
      out.push(
        `touches ${t.touched.length} of your ${t.known} known ${t.known === 1 ? "trigger" : "triggers"}: ${list(t.touched.map((x) => (t.hardest.includes(x) ? `${x.label} (hits hard)` : x.label)))}.`,
      );
    for (const x of t.pulled.slice(0, 3))
      out.push(
        `you said ${x.trigger.label} usually pulls ${list(x.defences.map((d) => d.label))}.`,
      );
    if (t.expected.length)
      out.push(`you expect ${list(t.expected.map((d) => d.label))} to fire.`);
    if (c.brakes.length === 0) out.push("you have named no brakes yet.");
    else if (t.within.length === 0)
      out.push(`none of your ${c.brakes.length} brakes is within reach on it.`);
    else
      out.push(
        `${t.within.length} of your ${c.brakes.length} brakes ${t.within.length === 1 ? "is" : "are"} within reach: ${list(t.within.map((b) => b.label))}${t.fastest === "seconds" ? " — the fastest works in seconds." : t.fastest === "hours" ? " — none faster than hours." : " — none faster than days."}`,
      );
  }
  out.push(
    `as you are today: sleep debt ${c.load.sleep}, chronic stress ${c.load.stress}, caffeine ${c.load.caffeine}, vagal tone ${c.load.tone} — the brake has ${t.ceiling} of 100 to work with.`,
  );
  if (p && (t.up || t.down))
    out.push(
      t.lean === "vigilant"
        ? "as marked, the line runs to hypervigilance."
        : t.lean === "calm"
          ? "as marked, the line runs to calm."
          : "as marked, the line hangs between — the brakes within reach roughly meet what it touches.",
    );
  if (t.walked) {
    out.push(
      `${t.asked} ${t.asked === 1 ? "pathway" : "pathways"} asked; you said how ${t.walked} went: ${t.went.calm} calm, ${t.went.vigilant} vigilant, ${t.went.mixed} mixed.`,
    );
    const v = t.vigilantTriggers[0];
    if (v && v.of >= 2)
      out.push(
        `the ones that went vigilant touched ${v.trigger.label} most often — ${v.n} of ${v.of}.`,
      );
  }
  return out;
}

// ── the files ─────────────────────────────────────────────────────────────

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;
const ID = /^[a-z][a-z0-9-]{0,39}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const strs = (v: unknown, n: number, max: number): string[] =>
  Array.isArray(v)
    ? v
        .filter((x) => typeof x === "string")
        .map((x) => x.trim().slice(0, max))
        .filter(Boolean)
        .slice(0, n)
    : [];
const num = (v: unknown, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(Math.max(0, Math.min(100, n))) : d;
};
const dayStr = (v: unknown): string => {
  if (v instanceof Date && !Number.isNaN(v.getTime()))
    return v.toISOString().slice(0, 10);
  return typeof v === "string" ? v.trim() : "";
};

export function slugOf(title: string): string {
  const t = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
  return t || "pathway";
}

/** An id for a named thing in the circuit, from its label. */
export function idOf(label: string, taken: Set<string>): string {
  let base = label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  if (!base || !/^[a-z]/.test(base)) base = `x-${base}`.replace(/-+$/, "");
  let id = base;
  let n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}

export function validateCircuit(input: unknown): Circuit {
  const c = input as Partial<Circuit> | null;
  if (!c || typeof c !== "object") throw new Error("circuit: not an object");
  const ids = new Set<string>();
  const take = (id: string, what: string) => {
    if (!ID.test(id))
      throw new Error(`circuit: bad ${what} id ${JSON.stringify(id)}`);
    if (ids.has(id))
      throw new Error(`circuit: two things called ${JSON.stringify(id)}`);
    ids.add(id);
  };
  const defences: Defence[] = [];
  for (const d of Array.isArray(c.defences) ? c.defences.slice(0, 40) : []) {
    const x = d as Partial<Defence> | null;
    if (!x || typeof x !== "object") continue;
    const id = str(x.id, 40).toLowerCase();
    take(id, "defence");
    defences.push({
      id,
      label: str(x.label, 80) || id,
      reflex: REFLEXES.includes(x.reflex as Reflex)
        ? (x.reflex as Reflex)
        : "flight",
      cost: str(x.cost, 300),
      note: str(x.note, 2000),
    });
  }
  const defenceIds = new Set(defences.map((d) => d.id));
  const triggers: Trigger[] = [];
  for (const t of Array.isArray(c.triggers) ? c.triggers.slice(0, 60) : []) {
    const x = t as Partial<Trigger> | null;
    if (!x || typeof x !== "object") continue;
    const id = str(x.id, 40).toLowerCase();
    take(id, "trigger");
    const charge = Number(x.charge);
    triggers.push({
      id,
      label: str(x.label, 80) || id,
      charge: charge === 1 || charge === 3 ? charge : 2,
      pulls: strs(x.pulls, 20, 40).filter((p) => defenceIds.has(p)),
      signs: str(x.signs, 300),
      note: str(x.note, 2000),
    });
  }
  const brakes: Brake[] = [];
  for (const b of Array.isArray(c.brakes) ? c.brakes.slice(0, 40) : []) {
    const x = b as Partial<Brake> | null;
    if (!x || typeof x !== "object") continue;
    const id = str(x.id, 40).toLowerCase();
    take(id, "brake");
    brakes.push({
      id,
      label: str(x.label, 80) || id,
      reach: REACHES.includes(x.reach as Reach) ? (x.reach as Reach) : "hours",
      note: str(x.note, 2000),
    });
  }
  const l = (c.load ?? {}) as Partial<Load>;
  const load: Load = {
    sleep: num(l.sleep, DEFAULT_LOAD.sleep),
    stress: num(l.stress, DEFAULT_LOAD.stress),
    caffeine: num(l.caffeine, DEFAULT_LOAD.caffeine),
    tone: num(l.tone, DEFAULT_LOAD.tone),
  };
  const loadDay = dayStr(c.loadDay);
  return {
    triggers,
    defences,
    brakes,
    load,
    loadDay: DAY.test(loadDay) ? loadDay : null,
  };
}

export function parseCircuit(raw: string): Circuit {
  try {
    return validateCircuit(JSON.parse(raw));
  } catch {
    return EMPTY_CIRCUIT;
  }
}

export function parsePathway(slug: string, raw: string): Pathway {
  const { data, content } = matter(raw);
  const touches: Record<string, Dose> = {};
  if (data.touches && typeof data.touches === "object")
    for (const [id, v] of Object.entries(
      data.touches as Record<string, unknown>,
    )) {
      const n = Number(v);
      if (n === 1 || n === 2 || n === 3) touches[id] = n;
    }
  const went = dayStr(data.went);
  return {
    slug,
    title: str(data.title, 200) || slug,
    put: str(data.put, 5000),
    touches,
    brakes: strs(data.brakes, 40, 40),
    expects: strs(data.expects, 40, 40),
    stones: strs(data.stones, 40, 200),
    asked: dayStr(data.asked),
    went: WENTS.includes(went as Went) ? (went as Went) : null,
    wentDay: DAY.test(dayStr(data.wentDay)) ? dayStr(data.wentDay) : null,
    note: content.trim(),
  };
}

const q = (s: string) => JSON.stringify(s);

/** The file a pathway is kept in: frontmatter a person can edit, the note below. */
export function serialisePathway(p: Pathway): string {
  const lines = [`title: ${q(p.title)}`];
  if (p.put) lines.push(`put: ${q(p.put)}`);
  const ids = Object.keys(p.touches).sort();
  if (ids.length) {
    lines.push("touches:");
    for (const id of ids) lines.push(`  ${q(id)}: ${p.touches[id]}`);
  }
  if (p.brakes.length) lines.push(`brakes: [${p.brakes.map(q).join(", ")}]`);
  if (p.expects.length) lines.push(`expects: [${p.expects.map(q).join(", ")}]`);
  if (p.stones.length) lines.push(`stones: [${p.stones.map(q).join(", ")}]`);
  lines.push(`asked: ${q(p.asked)}`);
  if (p.went)
    lines.push(`went: ${q(p.went)}`, `wentDay: ${q(p.wentDay ?? p.asked)}`);
  return `---\n${lines.join("\n")}\n---\n${p.note ? `${p.note}\n` : ""}`;
}

/** Validation at the boundary: a pathway arrives from the desk, or from a hand-edited file. */
export function validatePathway(
  input: unknown,
  c: Circuit,
  today: string,
): Pathway {
  const p = input as Partial<Pathway> | null;
  if (!p || typeof p !== "object") throw new Error("pathway: not an object");
  const title = str(p.title, 200);
  if (!title) throw new Error("pathway: it needs a title");
  const slugIn = str(p.slug, 80);
  const slug = slugIn || slugOf(title);
  if (!SLUG.test(slug)) throw new Error("pathway: bad slug");
  const triggerIds = new Set(c.triggers.map((t) => t.id));
  const touches: Record<string, Dose> = {};
  if (p.touches && typeof p.touches === "object")
    for (const [id, v] of Object.entries(
      p.touches as Record<string, unknown>,
    )) {
      const n = Number(v);
      if (triggerIds.has(id) && (n === 1 || n === 2 || n === 3))
        touches[id] = n;
    }
  const brakeIds = new Set(c.brakes.map((b) => b.id));
  const defenceIds = new Set(c.defences.map((d) => d.id));
  const asked = dayStr(p.asked);
  const went = WENTS.includes(p.went as Went) ? (p.went as Went) : null;
  const wentDay = dayStr(p.wentDay);
  return {
    slug,
    title,
    put: str(p.put, 5000),
    touches,
    brakes: strs(p.brakes, 40, 40).filter((id) => brakeIds.has(id)),
    expects: strs(p.expects, 40, 40).filter((id) => defenceIds.has(id)),
    stones: strs(p.stones, 40, 200),
    asked: DAY.test(asked) ? asked : today,
    went,
    wentDay: went ? (DAY.test(wentDay) ? wentDay : today) : null,
    note: typeof p.note === "string" ? p.note.trim().slice(0, 20_000) : "",
  };
}

export const emptyPathway = (
  today: string,
  title = "",
  stones: string[] = [],
): Pathway => ({
  slug: "",
  title,
  put: "",
  touches: {},
  brakes: [],
  expects: [],
  stones,
  asked: today,
  went: null,
  wentDay: null,
  note: "",
});
