import matter from "gray-matter";
import type { GardenNode } from "./garden.ts";
import { rand, seedOf } from "./hand.ts";

/**
 * The wish: loving-kindness as an instrument. Beings are held in pods —
 * you at the centre, then someone who has been good to you, a friend,
 * someone you pass without a thought, someone you find difficult, and
 * everyone — drawn as rings that widen outward. A sitting is a guided
 * script composed from three things: the wishes in the reader's own words
 * (may you be safe · well · at ease · happy), truths that hold for every
 * being (every being was once a small child), and facts the reader has
 * kept about themselves. The script is said a line at a time with the
 * pauses that make it a practice, and can be written out as one voice
 * through the speech server on this machine. The desk counts sittings
 * and who was held; it never says whether the reader is kind.
 */

export type PodKind =
  "self" | "benefactor" | "friend" | "neutral" | "difficult" | "all" | "custom";
export const POD_KINDS: PodKind[] = [
  "self",
  "benefactor",
  "friend",
  "neutral",
  "difficult",
  "all",
  "custom",
];

/** How each pod is brought to mind, in the script's own voice. */
export const POD_INTRO: Record<PodKind, string> = {
  self: "Begin with yourself, as you are today.",
  benefactor: "Now someone who has been good to you.",
  friend: "Now a friend.",
  neutral: "Now someone you pass and never think about.",
  difficult:
    "Now someone you find difficult. Take only as much of them as you can hold today.",
  all: "Now everyone at once: everyone you have held, and everyone you have not.",
  custom: "",
};

export type Being = { name: string; note: string; stone: string | null };

export type Pod = {
  slug: string;
  name: string;
  kind: PodKind;
  order: number;
  beings: Being[];
};

export type LineKind =
  "settle" | "fact" | "pod" | "being" | "truth" | "wish" | "close";

/** One thing said in a sitting, and the silence that follows it. */
export type Line = { text: string; kind: LineKind; pause: number };

export type Sitting = {
  slug: string;
  on: string;
  minutes: number;
  /** The pods held, by slug, in the order they were held. */
  pods: string[];
  /** The beings held by name, for the count. */
  held: string[];
  wishes: string[];
  truths: string[];
  facts: string[];
  lines: Line[];
  /** Where each line begins in the voice, in seconds; empty until written out. */
  cues: number[];
  /** The voice file beside the sitting, or null. */
  voice: string | null;
  /** What the reader said afterwards. */
  said: string;
};

export const MIN_MINUTES = 3;
export const MAX_MINUTES = 60;
export const clampMinutes = (n: number) =>
  Math.min(
    MAX_MINUTES,
    Math.max(MIN_MINUTES, Math.round(Number.isFinite(n) ? n : 10)),
  );

/* ── the script ────────────────────────────────────────────────────────── */

const shuffle = <T>(xs: T[], r: () => number): T[] => {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
/** A sentence ends with a full stop unless it already ends with something. */
const sentence = (s: string) => {
  const t = clean(s).replace(/\.+$/, "");
  return t ? `${t}.` : "";
};
/** A wish is a predicate — "safe", "at ease" — said after "May you be". */
const predicate = (w: string) =>
  clean(w)
    .replace(/^may (you|i|all beings|we) be /i, "")
    .replace(/[.!]+$/, "")
    .trim();

export type Composition = {
  pods: Pod[];
  wishes: string[];
  truths: string[];
  facts: string[];
  minutes: number;
  /** Anything stable; the same seed draws the same truths for the same beings. */
  seed: string;
};

/**
 * The script: settle, then each pod in turn — brought to mind, a truth that
 * holds for every being said of this one, the wishes — then let go. Every
 * line is composed from the reader's own lists; nothing here is advice.
 */
export function compose(o: Composition): Line[] {
  const r = rand(seedOf(o.seed));
  const truths = shuffle(o.truths.map(sentence).filter(Boolean), r);
  const facts = shuffle(o.facts.map(sentence).filter(Boolean), r);
  const wishes = o.wishes.map(predicate).filter(Boolean);
  let ti = 0;
  let fi = 0;
  const truth = () => (truths.length ? truths[ti++ % truths.length] : "");
  const fact = () => (facts.length && fi < facts.length ? facts[fi++] : "");
  const L: Line[] = [];
  const say = (text: string, kind: LineKind, pause: number) => {
    if (text) L.push({ text, kind, pause });
  };
  const wishAll = (subject: string, pause: number) => {
    for (const w of wishes) say(`May ${subject} be ${w}.`, "wish", pause);
  };

  say("Sit, and let the breath find its own length.", "settle", 10);
  say(
    "Nothing has to be felt. The wishes are said; what they do is theirs.",
    "settle",
    6,
  );
  const f0 = fact();
  if (f0) say(`Something true of you, to begin from: ${f0}`, "fact", 8);

  for (const pod of o.pods) {
    if (pod.kind === "self") {
      say(POD_INTRO.self, "pod", 6);
      const t = truth();
      if (t) say(`${t} You too.`, "truth", 6);
      wishAll("I", 5);
      continue;
    }
    if (pod.kind === "all") {
      say(POD_INTRO.all, "pod", 6);
      const t = truth();
      if (t) say(t, "truth", 6);
      wishAll("all beings", 5);
      continue;
    }
    say(
      pod.kind === "custom" ? `Now ${clean(pod.name)}.` : POD_INTRO[pod.kind],
      "pod",
      5,
    );
    const bs = pod.beings.filter((b) => clean(b.name));
    if (!bs.length) {
      say("Whoever comes to mind.", "being", 5);
      const t = truth();
      if (t) say(`${t} This one too.`, "truth", 5);
      wishAll("you", 5);
    } else if (bs.length <= 3) {
      for (const b of bs) {
        const name = clean(b.name);
        say(
          b.note.trim()
            ? `${name}, ${clean(b.note).replace(/\.+$/, "")}.`
            : `${name}.`,
          "being",
          5,
        );
        const t = truth();
        if (t) say(`${t} ${name} too.`, "truth", 5);
        wishAll("you", 5);
      }
    } else {
      say(`${bs.map((b) => clean(b.name)).join(", ")}.`, "being", 6);
      const t = truth();
      if (t) say(`${t} Every one of them.`, "truth", 5);
      wishAll("you all", 5);
    }
  }

  say("Let the wishes go where they go.", "close", 8);
  const f1 = fact();
  if (f1) say(`And something true of you, to carry out: ${f1}`, "fact", 6);
  say("When you are ready, open your eyes.", "close", 3);
  return timed(L, o.minutes);
}

/** Roughly how long a line takes to say, in seconds. */
export const spoken = (text: string) =>
  Math.max(1.5, text.split(/\s+/).filter(Boolean).length / 2.4);

/** The pauses stretched or shortened so the whole sitting fills its minutes. */
export function timed(lines: Line[], minutes: number): Line[] {
  const target = clampMinutes(minutes) * 60;
  const speak = lines.reduce((a, l) => a + spoken(l.text), 0);
  const base = lines.reduce((a, l) => a + l.pause, 0) || 1;
  const scale = Math.max(0, target - speak) / base;
  return lines.map((l) => ({
    ...l,
    pause: Math.min(45, Math.max(2, Math.round(l.pause * scale))),
  }));
}

/** How long the whole thing runs, said and silent, in seconds. */
export const runtime = (lines: Line[]) =>
  Math.round(lines.reduce((a, l) => a + spoken(l.text) + l.pause, 0));

/** The beings a set of pods holds, by name, for the count. */
export const heldBy = (pods: Pod[]): string[] =>
  pods.flatMap((p) => p.beings.map((b) => clean(b.name)).filter(Boolean));

/* ── the tally and the readings ────────────────────────────────────────── */

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const utc = (d: string) =>
  Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
export function daysBetween(a: string, b: string): number {
  if (!DAY.test(a) || !DAY.test(b)) return 0;
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

export type Tally = {
  n: number;
  week: number;
  month: number;
  minutes: number;
  last: string | null;
  sinceLast: number | null;
  /** Days in a row with a sitting, counting back from today or yesterday. */
  run: number;
  held: { name: string; n: number }[];
  /** Sittings in which a pod of the difficult kind was held. */
  difficult: number;
  pods: number;
  beings: number;
  truths: number;
  facts: number;
  wishes: number;
};

export function tally(
  sittings: Sitting[],
  pods: Pod[],
  lists: { wishes: string[]; truths: string[]; facts: string[] },
  today: string,
): Tally {
  const days = new Set(sittings.map((s) => s.on));
  let run = 0;
  let d = days.has(today) ? today : plus(today, -1);
  while (days.has(d)) {
    run++;
    d = plus(d, -1);
  }
  const counts = new Map<string, number>();
  for (const s of sittings)
    for (const name of s.held) counts.set(name, (counts.get(name) ?? 0) + 1);
  const difficultSlugs = new Set(
    pods.filter((p) => p.kind === "difficult").map((p) => p.slug),
  );
  const last =
    sittings
      .map((s) => s.on)
      .sort()
      .at(-1) ?? null;
  return {
    n: sittings.length,
    week: sittings.filter((s) => daysBetween(s.on, today) < 7).length,
    month: sittings.filter((s) => daysBetween(s.on, today) < 30).length,
    minutes: sittings.reduce((a, s) => a + s.minutes, 0),
    last,
    sinceLast: last ? daysBetween(last, today) : null,
    run,
    held: [...counts]
      .map(([name, n]) => ({ name, n }))
      .sort((a, b) => b.n - a.n || (a.name < b.name ? -1 : 1)),
    difficult: sittings.filter((s) => s.pods.some((p) => difficultSlugs.has(p)))
      .length,
    pods: pods.length,
    beings: heldBy(pods).length,
    truths: lists.truths.filter((t) => t.trim()).length,
    facts: lists.facts.filter((t) => t.trim()).length,
    wishes: lists.wishes.filter((t) => t.trim()).length,
  };
}

function plus(day: string, k: number): string {
  const t = utc(day) + k * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

const n = (k: number, one: string, many = `${one}s`) =>
  `${k} ${k === 1 ? one : many}`;
const ago = (d: number) =>
  d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;

/** Facts about the practice's record; none a verdict on the reader. */
export function readings(t: Tally): string[] {
  const out: string[] = [];
  if (!t.n) out.push("no sittings yet");
  else {
    out.push(
      `${n(t.n, "sitting")}, ${n(t.minutes, "minute")} in all · ${t.week} this week, ${t.month} this month · the last ${ago(t.sinceLast ?? 0)}`,
    );
    if (t.run > 1) out.push(`${t.run} days running`);
    if (t.held.length) {
      const top = t.held
        .slice(0, 5)
        .map((h) => `${h.name} ×${h.n}`)
        .join(", ");
      out.push(
        `held: ${top}${t.held.length > 5 ? `, and ${t.held.length - 5} more` : ""}`,
      );
      const once = t.held.filter((h) => h.n === 1).length;
      if (once && t.n > 1) out.push(`${once} held only once`);
    }
    out.push(
      t.difficult
        ? `the difficult one held in ${t.difficult} of ${t.n}`
        : "the difficult one not yet held",
    );
  }
  out.push(
    `${n(t.pods, "pod")} with ${n(t.beings, "being")} · ${n(t.wishes, "wish", "wishes")}, ${n(t.truths, "truth")}, ${n(t.facts, "fact")} in the practice`,
  );
  return out;
}

/* ── what the garden offers ────────────────────────────────────────────── */

type Stone = Pick<GardenNode, "id" | "label" | "description" | "file" | "kind">;

/**
 * Facts about the reader the garden already holds, offered hollow: what
 * the record says of them, the values on their bearing, what they hold to
 * in the hull. In the record's words; the reader keeps them in their own.
 */
export function gardenFacts(
  nodes: Stone[],
  values: { name: string }[],
  hull: { text: string; chosen: string }[],
): string[] {
  const out: string[] = [];
  if (values.length)
    out.push(
      `You value ${values
        .map((v) => v.name)
        .join(", ")
        .replace(/, ([^,]*)$/, " and $1")}, by your own bearing.`,
    );
  for (const c of hull)
    if (c.text.trim())
      out.push(`You hold to this, chosen ${c.chosen}: ${clean(c.text)}`);
  for (const s of nodes)
    if (s.kind === "user" && s.description?.trim())
      out.push(sentence(s.description.split(/(?<=\.)\s/)[0] ?? s.description));
  return [...new Set(out)].slice(0, 20);
}

/** People the reader has written about, offered as beings to put in a pod. */
export function gardenBeings(nodes: Stone[]): Being[] {
  return nodes
    .filter((s) => s.file && /\/People\//.test(s.file))
    .map((s) => ({
      name: s.label,
      note: clean((s.description ?? "").split(/(?<=\.)\s/)[0] ?? "").replace(
        /\.$/,
        "",
      ),
      stone: s.id,
    }))
    .sort((a, b) => (a.name < b.name ? -1 : 1));
}

/* ── the voice: wav in, wav out ────────────────────────────────────────── */

/** The PCM inside a 16-bit mono WAV and its rate; the header is not trusted for its length. */
export function pcmOf(wav: Uint8Array): { pcm: Uint8Array; rate: number } {
  const dv = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  if (wav.length < 12 || dv.getUint32(0, false) !== 0x52494646)
    throw new Error("not a wav");
  let at = 12;
  let rate = 24000;
  while (at + 8 <= wav.length) {
    const id = String.fromCharCode(
      wav[at],
      wav[at + 1],
      wav[at + 2],
      wav[at + 3],
    );
    const size = dv.getUint32(at + 4, true);
    if (id === "fmt ") rate = dv.getUint32(at + 12, true);
    if (id === "data") {
      const end = Math.min(wav.length, at + 8 + size);
      return { pcm: wav.subarray(at + 8, end), rate };
    }
    at += 8 + size + (size % 2);
  }
  throw new Error("no data chunk");
}

/** One WAV from PCM pieces, 16-bit mono, with silence between them; the cue where each piece starts. */
export function wavOf(
  pieces: { pcm: Uint8Array; silence: number }[],
  rate: number,
): { wav: Uint8Array; cues: number[] } {
  const cues: number[] = [];
  let total = 0;
  const gaps: number[] = [];
  for (const p of pieces) {
    cues.push(total / (rate * 2));
    const gap = Math.round(p.silence * rate) * 2;
    gaps.push(gap);
    total += p.pcm.length + gap;
  }
  const wav = new Uint8Array(44 + total);
  const dv = new DataView(wav.buffer);
  const str = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) wav[at + i] = s.charCodeAt(i);
  };
  str(0, "RIFF");
  dv.setUint32(4, 36 + total, true);
  str(8, "WAVE");
  str(12, "fmt ");
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true);
  dv.setUint32(28, rate * 2, true);
  dv.setUint16(32, 2, true);
  dv.setUint16(34, 16, true);
  str(36, "data");
  dv.setUint32(40, total, true);
  let at = 44;
  pieces.forEach((p, i) => {
    wav.set(p.pcm, at);
    at += p.pcm.length + gaps[i];
  });
  return { wav, cues };
}

/* ── the files ─────────────────────────────────────────────────────────── */

const y = (s: string | number | boolean | null) => JSON.stringify(s);
const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

export function slugOf(title: string, day: string): string {
  const t = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56)
    .replace(/-+$/g, "");
  return `${day}-${t || "pod"}`;
}

export function serialisePod(p: Pod): string {
  const lines = [`name: ${y(p.name)}`, `kind: ${p.kind}`, `order: ${p.order}`];
  const body = p.beings.length
    ? `## beings\n\n${p.beings
        .map(
          (b) =>
            `- ${b.name}${b.note ? ` — ${b.note}` : ""}${b.stone ? ` [[${b.stone}]]` : ""}`,
        )
        .join("\n")}\n`
    : "";
  return `---\n${lines.join("\n")}\n---\n\n${body}`;
}

export function parsePod(slug: string, raw: string): Pod {
  const { data, content } = matter(raw);
  const beings: Being[] = [];
  for (const line of content.split("\n")) {
    const m = line.match(/^- (.+?)(?: — (.+?))?(?: \[\[([^\]]+)\]\])?\s*$/);
    if (m) beings.push({ name: m[1], note: m[2] ?? "", stone: m[3] ?? null });
  }
  return validatePod({
    slug,
    name: data.name,
    kind: data.kind,
    order: data.order,
    beings,
  });
}

export function validatePod(input: unknown): Pod {
  const r = (input ?? {}) as Record<string, unknown>;
  const kind = (POD_KINDS as string[]).includes(String(r.kind))
    ? (r.kind as PodKind)
    : "custom";
  const beings: Being[] =
    kind === "self" || kind === "all"
      ? []
      : (Array.isArray(r.beings) ? r.beings : [])
          .slice(0, 60)
          .map((x) => {
            const o = (x ?? {}) as Record<string, unknown>;
            return {
              name: str(o.name, 80),
              note: str(o.note, 200),
              stone: str(o.stone, 200) || null,
            };
          })
          .filter((b) => b.name);
  const name = str(r.name, 80) || DEFAULT_POD_NAME[kind];
  const slug = str(r.slug, 120);
  return {
    slug: slug || slugOf(name, "pod").replace(/^pod-/, ""),
    name,
    kind,
    order: Number.isFinite(Number(r.order)) ? Math.round(Number(r.order)) : 99,
    beings,
  };
}

export const DEFAULT_POD_NAME: Record<PodKind, string> = {
  self: "you",
  benefactor: "someone who has been good to you",
  friend: "a friend",
  neutral: "someone you pass without a thought",
  difficult: "someone you find difficult",
  all: "everyone",
  custom: "a pod",
};

const LINE_RE = /^(.*?)\s*⟨(\d+)s(?: · ([a-z]+))?⟩\s*$/;

export function serialiseSitting(s: Sitting): string {
  const lines = [
    `on: ${y(s.on)}`,
    `minutes: ${s.minutes}`,
    `pods: [${s.pods.map(y).join(", ")}]`,
    `held: [${s.held.map(y).join(", ")}]`,
    `wishes: [${s.wishes.map(y).join(", ")}]`,
  ];
  if (s.voice) lines.push(`voice: ${y(s.voice)}`);
  if (s.cues.length)
    lines.push(
      `cues: [${s.cues.map((c) => Math.round(c * 10) / 10).join(", ")}]`,
    );
  const body = [
    `## the sitting\n\n${s.lines.map((l) => `${l.text} ⟨${l.pause}s · ${l.kind}⟩`).join("\n\n")}`,
  ];
  if (s.truths.length)
    body.push(`## truths\n\n${s.truths.map((t) => `- ${t}`).join("\n")}`);
  if (s.facts.length)
    body.push(`## facts\n\n${s.facts.map((t) => `- ${t}`).join("\n")}`);
  if (s.said.trim()) body.push(`## said\n\n${s.said.trim()}`);
  return `---\n${lines.join("\n")}\n---\n\n${body.join("\n\n")}\n`;
}

export function parseSitting(slug: string, raw: string): Sitting {
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
  const lines = sec("the sitting")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const m = p.match(LINE_RE);
      return m
        ? {
            text: m[1],
            pause: Number(m[2]),
            kind: (m[3] ?? "settle") as LineKind,
          }
        : { text: p, pause: 5, kind: "settle" as LineKind };
    });
  const list = (k: string) =>
    sec(k)
      .split("\n")
      .map((l) => l.replace(/^- /, "").trim())
      .filter(Boolean);
  return validateSitting({
    slug,
    on: data.on,
    minutes: data.minutes,
    pods: data.pods,
    held: data.held,
    wishes: data.wishes,
    truths: list("truths"),
    facts: list("facts"),
    lines,
    cues: data.cues,
    voice: data.voice ?? null,
    said: sec("said"),
  });
}

export function validateSitting(input: unknown): Sitting {
  const r = (input ?? {}) as Record<string, unknown>;
  const strs = (v: unknown, max: number, n = 200) =>
    (Array.isArray(v) ? v : [])
      .slice(0, n)
      .map((x) => str(x, max))
      .filter(Boolean);
  const on =
    typeof r.on === "string" && DAY.test(r.on)
      ? r.on
      : new Date().toISOString().slice(0, 10);
  const lines: Line[] = (Array.isArray(r.lines) ? r.lines : [])
    .slice(0, 600)
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const kind = String(o.kind ?? "settle");
      return {
        text: str(o.text, 600),
        kind: ([
          "settle",
          "fact",
          "pod",
          "being",
          "truth",
          "wish",
          "close",
        ].includes(kind)
          ? kind
          : "settle") as LineKind,
        pause: Math.min(120, Math.max(0, Math.round(Number(o.pause) || 0))),
      };
    })
    .filter((l) => l.text);
  if (!lines.length) throw new Error("a sitting needs its lines");
  const cues = (Array.isArray(r.cues) ? r.cues : [])
    .map((c) => Number(c))
    .filter((c) => Number.isFinite(c) && c >= 0);
  return {
    slug: str(r.slug, 120),
    on,
    minutes: clampMinutes(Number(r.minutes)),
    pods: strs(r.pods, 120, 30),
    held: strs(r.held, 80, 300),
    wishes: strs(r.wishes, 120, 20),
    truths: strs(r.truths, 300, 60),
    facts: strs(r.facts, 300, 60),
    lines,
    cues: cues.length === lines.length ? cues : [],
    voice: /^[a-z0-9-]+\.wav$/.test(String(r.voice ?? ""))
      ? String(r.voice)
      : null,
    said: typeof r.said === "string" ? r.said.trim().slice(0, 4000) : "",
  };
}

/** A list the reader keeps as markdown bullets: wishes, truths, facts. */
export const parseList = (raw: string): string[] =>
  raw
    .split("\n")
    .map((l) => l.replace(/^[-*]\s+/, "").trim())
    .filter((l) => l && !l.startsWith("#"));

export const serialiseList = (title: string, items: string[]): string =>
  `# ${title}\n\n${items.map((i) => `- ${clean(i)}`).join("\n")}\n`;

export const validateList = (v: unknown, max = 60): string[] =>
  (Array.isArray(v) ? v : [])
    .slice(0, max)
    .map((x) => str(x, 300))
    .filter(Boolean);
