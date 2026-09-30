import matter from "gray-matter";
import { addDays, daysBetween, dayWords } from "./fence.ts";
import { slugOf as datedSlug, uid } from "./way.ts";

/**
 * The act: from intention to action. Most of what the garden holds ends in a
 * decision — a call on a fence, a line on an envelope, a place among values —
 * and the distance from deciding to doing is where most decisions stop: about
 * half the people who mean to act do not (Sheeran 2002). What closes it best
 * in the research is small and plain. Say what you mean to do, the best that
 * would come of it and what in you would stand in the way, and what you will
 * do if it does (Oettingen's mental contrasting); then put each step as an
 * if-then — when this happens, I will do that — on a real day, with where and
 * for how long (Gollwitzer's implementation intentions). Then do it in the
 * world and come back to say what it was like.
 *
 * The drawing sets what was meant beside what was lived: each step's day as
 * planned above, the day it was done below, a line between. Nothing here
 * nags, counts a streak or says what to do; the readings say what was meant,
 * what was done and when, and what it was like, in the reader's words.
 */

export type Did = "" | "done" | "not";
export type Felt = "" | "easier" | "same" | "harder";
export const FELTS: Exclude<Felt, "">[] = ["easier", "same", "harder"];
export const FELT_LABEL: Record<Exclude<Felt, "">, string> = {
  easier: "easier than I thought",
  same: "as I thought",
  harder: "harder than I thought",
};

export type Step = {
  id: string;
  /** The cue: when this happens — a time, a place, after something. */
  when: string;
  /** What I will do. */
  will: string;
  where: string;
  /** How long I mean it to take. */
  minutes: number | null;
  /** The day I mean to do it. */
  day: string;
  /** The days it was meant for before, oldest first: each one a move. */
  moved: string[];
  did: Did;
  /** The day it was done, or let go. */
  on: string;
  /** What it was like, in the reader's words. */
  lived: string;
  felt: Felt;
  /** Whether what stands in the way showed up. */
  met: boolean;
};

/** Where the intention came from: an envelope, a stone, a view. */
export type From = { kind: string; id: string; label: string; url: string };

export type After = {
  meant: string;
  happened: string;
  difference: string;
  keep: string;
};

export type Act = {
  slug: string;
  put: string;
  touched: string;
  /** What I mean to do. */
  intention: string;
  /** The best that would come of it. */
  outcome: string;
  /** What in me would stand in the way. */
  obstacle: string;
  /** If it shows up, what I will do. */
  then: string;
  steps: Step[];
  after: After;
  from: From | null;
};

export const emptyAct = (day: string, from: From | null = null): Act => ({
  slug: "",
  put: day,
  touched: day,
  intention: "",
  outcome: "",
  obstacle: "",
  then: "",
  steps: [],
  after: { meant: "", happened: "", difference: "", keep: "" },
  from,
});

export const newStep = (day: string): Step => ({
  id: uid(),
  when: "",
  will: "",
  where: "",
  minutes: null,
  day,
  moved: [],
  did: "",
  on: "",
  lived: "",
  felt: "",
  met: false,
});

/* ── where a step stands ──────────────────────────────────────────────── */

/** Done or let go; else meant for a day to come, today, or a day that has gone by unmarked. */
export type State = "done" | "not" | "meant" | "today" | "due";

export function stateOf(s: Step, today: string): State {
  if (s.did === "done") return "done";
  if (s.did === "not") return "not";
  const d = daysBetween(today, s.day);
  return d > 0 ? "meant" : d === 0 ? "today" : "due";
}

/** A step meant for another day: the day it was meant for is kept as a move. */
export function moveStep(s: Step, day: string): Step {
  if (!day || day === s.day) return s;
  return { ...s, moved: [...s.moved, s.day].slice(-12), day };
}

/** A step marked: done, let go, or taken back. The day it was marked is kept. */
export function markStep(s: Step, did: Did, today: string): Step {
  if (!did) return { ...s, did: "", on: "", felt: "", met: false };
  return { ...s, did, on: s.did === did && s.on ? s.on : today };
}

/** The steps in the order they are meant for, the day's own order kept. */
export const inOrder = (steps: Step[]): Step[] =>
  steps
    .map((s, i) => ({ s, i }))
    .sort((a, b) =>
      a.s.day < b.s.day ? -1 : a.s.day > b.s.day ? 1 : a.i - b.i,
    )
    .map((x) => x.s);

/** The span the drawing covers: from the day it was set down to past today and the last step, a week at least. */
export function spanOf(
  a: Act,
  today: string,
): { from: string; to: string; days: number } {
  const days = [
    a.put,
    today,
    ...a.steps.flatMap((s) => [s.day, ...s.moved, s.on]),
  ].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  const from = days.reduce((m, d) => (d < m ? d : m), a.put);
  let to = days.reduce((m, d) => (d > m ? d : m), a.put);
  if (daysBetween(from, to) < 6) to = addDays(from, 6);
  to = addDays(to, 1);
  return { from, to, days: daysBetween(from, to) };
}

/* ── the reading ──────────────────────────────────────────────────────── */

const n = (k: number, one: string, many = `${one}s`) =>
  `${k} ${k === 1 ? one : many}`;
const clip = (s: string, max: number) =>
  s.length <= max ? s : `${s.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;

export type Tally = {
  steps: number;
  done: number;
  onDay: number;
  late: number;
  early: number;
  not: number;
  due: number;
  today: number;
  moved: number;
  minutes: number;
  easier: number;
  same: number;
  harder: number;
  met: number;
  /** Days from setting the intention down to the first step done, or null. */
  first: number | null;
};

export function tally(a: Act, today: string): Tally {
  const t: Tally = {
    steps: a.steps.length,
    done: 0,
    onDay: 0,
    late: 0,
    early: 0,
    not: 0,
    due: 0,
    today: 0,
    moved: 0,
    minutes: 0,
    easier: 0,
    same: 0,
    harder: 0,
    met: 0,
    first: null,
  };
  for (const s of a.steps) {
    const st = stateOf(s, today);
    if (s.moved.length) t.moved++;
    if (s.minutes) t.minutes += s.minutes;
    if (s.met) t.met++;
    if (st === "not") t.not++;
    else if (st === "due") t.due++;
    else if (st === "today") t.today++;
    if (st !== "done") continue;
    t.done++;
    const late = daysBetween(s.day, s.on);
    if (late === 0) t.onDay++;
    else if (late > 0) t.late++;
    else t.early++;
    if (s.felt) t[s.felt]++;
    const since = daysBetween(a.put, s.on);
    if (t.first === null || since < t.first) t.first = since;
  }
  return t;
}

/** When the steps done were done against the days they were meant for. */
function whenDone(t: Tally): string {
  if (t.done === t.onDay)
    return t.done === 1 ? ", on the day meant" : ", each on the day meant";
  const parts = [
    t.onDay && `${t.onDay} on the day meant`,
    t.late && `${t.late} later`,
    t.early && `${t.early} earlier`,
  ].filter(Boolean);
  return ` (${parts.join(", ")})`;
}

const dayCount = (k: number) =>
  k === 0 ? "the same day" : `${n(k, "day")} after`;

/**
 * What the act comes to, in sentences: the steps meant and where each stands,
 * how long from the intention to the first thing done, what the steps were
 * like, and what is next. Never whether it is enough, never a streak.
 */
export function readings(a: Act, today: string): string[] {
  const t = tally(a, today);
  const out: string[] = [];
  if (!a.intention.trim()) out.push("no intention set down yet");
  if (!t.steps) {
    out.push("no step set down yet");
    return out;
  }
  out.push(
    `${n(t.steps, "step")} meant${t.minutes ? `, ${n(t.minutes, "minute")} between them` : ""}`,
  );
  const parts = [
    t.done && `${t.done} done${whenDone(t)}`,
    t.today && `${t.today} meant for today`,
    t.due &&
      `${t.due} past ${t.due === 1 ? "its" : "their"} day and not marked`,
    t.not && `${t.not} let go`,
  ].filter(Boolean);
  if (parts.length) out.push(parts.join(" · "));
  if (t.moved) out.push(`${n(t.moved, "step")} moved to another day`);
  out.push(
    t.first !== null
      ? `the first step was done ${dayCount(t.first)} the intention was set down`
      : `nothing done yet, ${n(Math.max(0, daysBetween(a.put, today)), "day")} after the intention was set down`,
  );
  const felt = [
    t.easier && `${t.easier} easier than you thought`,
    t.same && `${t.same} as you thought`,
    t.harder && `${t.harder} harder`,
  ].filter(Boolean);
  if (felt.length) out.push(`of what was done: ${felt.join(", ")}`);
  if (t.met && a.obstacle.trim())
    out.push(`what stands in the way showed up on ${n(t.met, "step")}`);
  const next = inOrder(a.steps).find((s) => {
    const st = stateOf(s, today);
    return st === "meant" || st === "today";
  });
  if (next)
    out.push(
      `next: ${clip(next.will.trim() || "a step with no words", 60)}, ${daysBetween(today, next.day) === 0 ? "today" : dayWords(next.day)}${next.when.trim() ? ` — when ${clip(next.when.trim(), 40)}` : ""}`,
    );
  return out;
}

/* ── the record ───────────────────────────────────────────────────────── */

export type ActRecord = {
  acts: number;
  actedOn: number;
  whole: number;
  steps: number;
  done: number;
  onDay: number;
  easier: number;
  same: number;
  harder: number;
  /** The middle of the days from intention to first step, among those acted on. */
  middle: number | null;
};

export function recordOf(acts: Act[], today: string): ActRecord {
  const r: ActRecord = {
    acts: acts.length,
    actedOn: 0,
    whole: 0,
    steps: 0,
    done: 0,
    onDay: 0,
    easier: 0,
    same: 0,
    harder: 0,
    middle: null,
  };
  const firsts: number[] = [];
  for (const a of acts) {
    const t = tally(a, today);
    r.steps += t.steps;
    r.done += t.done;
    r.onDay += t.onDay;
    r.easier += t.easier;
    r.same += t.same;
    r.harder += t.harder;
    if (t.done) r.actedOn++;
    if (t.steps && t.done === t.steps) r.whole++;
    if (t.first !== null) firsts.push(t.first);
  }
  if (firsts.length) {
    firsts.sort((x, y) => x - y);
    r.middle = firsts[Math.floor((firsts.length - 1) / 2)];
  }
  return r;
}

export function recordReadings(r: ActRecord): string[] {
  if (!r.acts) return ["nothing set down yet"];
  const out = [
    `${n(r.acts, "intention")} set down, ${r.actedOn} acted on${r.whole ? `, ${r.whole} with every step done` : ""}`,
  ];
  if (r.steps)
    out.push(
      `${r.done} of ${n(r.steps, "step")} done, ${r.onDay} on the day meant`,
    );
  if (r.middle !== null) {
    const when =
      r.middle === 0
        ? "the same day as the intention"
        : `within ${n(r.middle, "day")} of the intention`;
    out.push(
      r.actedOn === 1
        ? `the first step came ${r.middle === 0 ? when : `${n(r.middle, "day")} after the intention`}`
        : `in at least half of those acted on, the first step came ${when}`,
    );
  }
  const felt = [
    r.easier && `${r.easier} easier than thought`,
    r.same && `${r.same} as thought`,
    r.harder && `${r.harder} harder`,
  ].filter(Boolean);
  if (felt.length) out.push(`what was done: ${felt.join(", ")}`);
  return out;
}

/* ── the file ─────────────────────────────────────────────────────────── */

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const y = (s: string) => JSON.stringify(s);
const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
const long = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const day = (v: unknown, or: string) =>
  typeof v === "string" && DAY.test(v) ? v : or;
/** A field that sits between the marks of a step's line may not carry them. */
const field = (v: unknown, max: number) =>
  str(v, max).replace(/\s·\s/g, " - ").replace(/\s—\s/g, " - ");
const FELT_OF = Object.fromEntries(
  FELTS.map((k) => [FELT_LABEL[k], k]),
) as Record<string, Felt>;

function stepLine(s: Step): string {
  const head = [
    `${s.day}${s.moved.length ? ` (was ${s.moved.join(", ")})` : ""}`,
  ];
  if (s.when.trim()) head.push(`when ${s.when.trim()}`);
  head.push(`I will ${s.will.trim()}`);
  if (s.where.trim()) head.push(`at ${s.where.trim()}`);
  if (s.minutes) head.push(`${s.minutes} min`);
  if (s.did) head.push(`${s.did === "done" ? "done" : "let go"} ${s.on}`);
  if (s.felt) head.push(FELT_LABEL[s.felt]);
  if (s.met) head.push("it showed up");
  return `- ${head.join(" · ")}${s.lived.trim() ? ` — ${s.lived.trim()}` : ""}`;
}

export function serialiseAct(a: Act): string {
  const fm = [`put: ${y(a.put)}`, `touched: ${y(a.touched)}`];
  if (a.from)
    fm.push(
      "from:",
      `  kind: ${y(a.from.kind)}`,
      `  id: ${y(a.from.id)}`,
      `  label: ${y(a.from.label)}`,
      `  url: ${y(a.from.url)}`,
    );
  const body = [`## the intention\n\n${a.intention.trim()}`];
  const add = (h: string, t: string) =>
    t.trim() && body.push(`## ${h}\n\n${t.trim()}`);
  add("the best that would come of it", a.outcome);
  add("what in me would stand in the way", a.obstacle);
  add("if it shows up, I will", a.then);
  if (a.steps.length)
    body.push(`## the steps\n\n${a.steps.map(stepLine).join("\n")}`);
  add("what was meant to happen", a.after.meant);
  add("what happened", a.after.happened);
  add("what made the difference", a.after.difference);
  add("what I would keep", a.after.keep);
  return `---\n${fm.join("\n")}\n---\n\n${body.join("\n\n")}\n`;
}

/** A step's line back into a step. Anything after its day may be left out; what is missing is empty. */
function parseStep(line: string, i: number): Record<string, unknown> | null {
  const m = line.match(
    /^-\s+(\d{4}-\d{2}-\d{2})(?:\s+\(was ([\d\-,\s]+)\))?(.*)$/,
  );
  if (!m) return null;
  let rest = m[3];
  let lived = "";
  const dash = rest.indexOf(" — ");
  if (dash >= 0) {
    lived = rest.slice(dash + 3).trim();
    rest = rest.slice(0, dash);
  }
  const s: Record<string, unknown> = {
    id: `s${i + 1}`,
    day: m[1],
    moved: (m[2] ?? "").split(/[,\s]+/).filter((d) => DAY.test(d)),
    lived,
  };
  for (const raw of rest
    .split(" · ")
    .map((x) => x.trim())
    .filter(Boolean)) {
    let k: RegExpMatchArray | null;
    if (/^when\s/i.test(raw)) s.when = raw.slice(5);
    else if (/^I will\s/i.test(raw)) s.will = raw.slice(7);
    else if (/^at\s/i.test(raw)) s.where = raw.slice(3);
    else if ((k = raw.match(/^(\d{1,4})\s*min$/))) s.minutes = Number(k[1]);
    else if ((k = raw.match(/^(done|let go)\s+(\d{4}-\d{2}-\d{2})$/))) {
      s.did = k[1] === "done" ? "done" : "not";
      s.on = k[2];
    } else if (FELT_OF[raw]) s.felt = FELT_OF[raw];
    else if (raw === "it showed up") s.met = true;
    else if (!s.will) s.will = raw;
  }
  return s;
}

export function parseAct(slug: string, raw: string): Act {
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
  const text = (v: unknown) =>
    v instanceof Date ? v.toISOString().slice(0, 10) : v;
  const steps = sec("the steps")
    .split("\n")
    .map((l, i) => parseStep(l.trim(), i))
    .filter((x): x is Record<string, unknown> => x !== null);
  return validateAct({
    slug,
    put: text(data.put),
    touched: text(data.touched),
    intention: sec("the intention"),
    outcome: sec("the best that would come of it"),
    obstacle: sec("what in me would stand in the way"),
    then: sec("if it shows up, i will"),
    steps,
    after: {
      meant: sec("what was meant to happen"),
      happened: sec("what happened"),
      difference: sec("what made the difference"),
      keep: sec("what i would keep"),
    },
    from: data.from ?? null,
  });
}

const ID = /^[a-z0-9]{1,24}$/i;

export function validateAct(input: unknown): Act {
  const r = (input ?? {}) as Record<string, unknown>;
  const intention = str(r.intention, 300);
  if (!intention) throw new Error("say what you mean to do, in a line");
  const today = new Date().toISOString().slice(0, 10);
  const put = day(r.put, today);
  const seen = new Set<string>();
  const steps: Step[] = (Array.isArray(r.steps) ? r.steps : [])
    .slice(0, 40)
    .filter((s) => s && typeof s === "object")
    .map((s: Record<string, unknown>, i) => {
      let id =
        typeof s.id === "string" && ID.test(s.id) && !seen.has(s.id)
          ? s.id
          : `s${i + 1}`;
      while (seen.has(id)) id = `${id}x`;
      seen.add(id);
      const did: Did = s.did === "done" || s.did === "not" ? s.did : "";
      const minutes = Number(s.minutes);
      return {
        id,
        when: field(s.when, 160),
        will: field(s.will, 200),
        where: field(s.where, 120),
        minutes:
          Number.isFinite(minutes) && minutes > 0
            ? Math.min(1440, Math.round(minutes))
            : null,
        day: day(s.day, put),
        moved: (Array.isArray(s.moved) ? s.moved : [])
          .filter((d): d is string => typeof d === "string" && DAY.test(d))
          .slice(-12),
        did,
        on: did ? day(s.on, put) : "",
        lived: str(s.lived, 600).replace(/\s—\s/g, " - "),
        felt:
          did === "done" && FELTS.includes(s.felt as Exclude<Felt, "">)
            ? (s.felt as Felt)
            : "",
        met: did !== "" && s.met === true,
      };
    });
  const f = (r.from ?? null) as Record<string, unknown> | null;
  const from =
    f && typeof f === "object" && str(f.id, 200)
      ? {
          kind: str(f.kind, 40) || "stone",
          id: str(f.id, 200),
          label: str(f.label, 300),
          url:
            typeof f.url === "string" && f.url.startsWith("/")
              ? f.url.slice(0, 400)
              : "",
        }
      : null;
  const af = (r.after ?? {}) as Record<string, unknown>;
  const a: Act = {
    slug: str(r.slug, 120),
    put,
    touched: day(r.touched, put),
    intention,
    outcome: long(r.outcome, 1000),
    obstacle: long(r.obstacle, 1000),
    then: long(r.then, 1000),
    steps,
    after: {
      meant: long(af.meant, 2000),
      happened: long(af.happened, 2000),
      difference: long(af.difference, 2000),
      keep: long(af.keep, 2000),
    },
    from,
  };
  if (!a.slug) a.slug = slugOf(a.intention, a.put);
  return a;
}

export const slugOf = datedSlug;
