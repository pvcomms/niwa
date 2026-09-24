import matter from "gray-matter";
import type { GardenLink, GardenNode } from "./garden.ts";
import type { Flow } from "./flow.ts";
import { slugOf } from "./bearing.ts";

/**
 * The course — a belief steered through what hit it. One stone is the belief;
 * the stones that flowed into it are the inputs, laid in the order they came;
 * the reader says, after the fact, which way each one bent the belief; the
 * question the belief is trying to get right is put in words and kept when
 * it is re-put. The sheet draws the course the marks imply and reads the
 * structure back. The marks are the reader's; none of it is a grade.
 */

export type Mark = "toward" | "away";
export type Marked = { mark: Mark; day: string };

export type Course = {
  /** the stone that is the belief */
  belief: string;
  /** the file it is kept in */
  slug: string;
  /** the question, as now put */
  question: string;
  /** the day it was put; empty when it never was */
  asked: string;
  /** earlier phrasings, oldest first */
  trail: { question: string; asked: string }[];
  /** input id → how it bent the belief, and when that was said */
  marks: Record<string, Marked>;
  note: string;
};

export type Input = {
  id: string;
  /** the kinds of thread it reached the belief by */
  threads: GardenLink["kind"][];
  /** the input's own date — when it entered the garden — or null */
  date: string | null;
};

export const emptyCourse = (belief: string): Course => ({
  belief,
  slug: slugOf(belief),
  question: "",
  asked: "",
  trail: [],
  marks: {},
  note: "",
});

/**
 * What hit the belief, in the order it came: everything that flows straight
 * into it, one entry per stone, undated first, then by date.
 */
export function inputsOf(
  flow: Flow,
  nodes: Map<string, GardenNode>,
  belief: string,
): Input[] {
  const by = new Map<string, Input>();
  for (const a of flow.into.get(belief) ?? []) {
    if (a.from === belief) continue;
    const cur = by.get(a.from);
    if (cur) {
      if (!cur.threads.includes(a.kind)) cur.threads.push(a.kind);
    } else
      by.set(a.from, {
        id: a.from,
        threads: [a.kind],
        date: nodes.get(a.from)?.modified ?? null,
      });
  }
  const label = (id: string) => nodes.get(id)?.label ?? id;
  return [...by.values()].sort((x, y) => {
    if (x.date === null && y.date === null)
      return label(x.id).localeCompare(label(y.id));
    if (x.date === null) return -1;
    if (y.date === null) return 1;
    return x.date < y.date
      ? -1
      : x.date > y.date
        ? 1
        : label(x.id).localeCompare(label(y.id));
  });
}

export type Tally = {
  n: number;
  weighed: number;
  toward: number;
  away: number;
  unweighed: number;
  undated: number;
  first: string | null;
  last: string | null;
  /** inputs dated after the belief was last rewritten, and how many of those are unweighed */
  since: number;
  sinceUnweighed: number;
  /** the marks in the order the inputs came */
  run: Mark[];
  byKind: { toward: Record<string, number>; away: Record<string, number> };
  unwritten: number;
  fallow: number;
  /** the most recent day a mark was made */
  lastMarked: string | null;
};

export function tally(
  inputs: Input[],
  marks: Record<string, Marked>,
  nodes: Map<string, GardenNode>,
  belief: GardenNode | undefined,
): Tally {
  const t: Tally = {
    n: inputs.length,
    weighed: 0,
    toward: 0,
    away: 0,
    unweighed: 0,
    undated: 0,
    first: null,
    last: null,
    since: 0,
    sinceUnweighed: 0,
    run: [],
    byKind: { toward: {}, away: {} },
    unwritten: 0,
    fallow: 0,
    lastMarked: null,
  };
  const rewritten = belief?.modified ?? null;
  for (const i of inputs) {
    const n = nodes.get(i.id);
    const m = marks[i.id];
    if (m) {
      t.weighed++;
      t[m.mark]++;
      t.run.push(m.mark);
      const kind = n?.kind ?? "note";
      t.byKind[m.mark][kind] = (t.byKind[m.mark][kind] ?? 0) + 1;
      if (!t.lastMarked || m.day > t.lastMarked) t.lastMarked = m.day;
    } else t.unweighed++;
    if (i.date === null) t.undated++;
    else {
      if (!t.first || i.date < t.first) t.first = i.date;
      if (!t.last || i.date > t.last) t.last = i.date;
      if (rewritten && i.date > rewritten) {
        t.since++;
        if (!m) t.sinceUnweighed++;
      }
    }
    if (n?.kind === "ghost") t.unwritten++;
    if (n?.stage === "fallow") t.fallow++;
  }
  return t;
}

/** A day, the way the desk prints one: "3 Aug", with the year when it is not this one. */
export function dayOf(iso: string | null, now = new Date()): string {
  if (!iso) return "undated";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mon = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][d.getMonth()];
  const year =
    d.getFullYear() === now.getFullYear() ? "" : ` ${d.getFullYear()}`;
  return `${d.getDate()} ${mon}${year}`;
}

const NOUN: Record<string, [string, string]> = {
  project: ["build", "builds"],
  concept: ["concept", "concepts"],
  user: ["self note", "self notes"],
  feedback: ["rule", "rules"],
  reference: ["reference", "references"],
  routine: ["routine", "routines"],
  note: ["fieldnote", "fieldnotes"],
  notion: ["Notion note", "Notion notes"],
  garden: ["garden note", "garden notes"],
  reading: ["reading", "readings"],
  meta: ["root", "roots"],
  agent: ["agent", "agents"],
  repo: ["repo", "repos"],
  ghost: ["unwritten thing", "unwritten things"],
};

const count = (n: number, kind: string) => {
  const [one, many] = NOUN[kind] ?? [kind, `${kind}s`];
  return n === 1 ? `a ${one}` : `${n} ${many}`;
};

/** "a, b and c" */
const list = (xs: string[]) =>
  xs.length <= 1
    ? xs.join("")
    : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

const kinds = (by: Record<string, number>) =>
  list(
    Object.entries(by)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([k, n]) => count(n, k)),
  );

/** The reading, sentence by sentence: what the marks and the dates say. The judgment stays the reader's. */
export function readings(
  t: Tally,
  course: Course,
  belief: GardenNode | undefined,
  now = new Date(),
): string[] {
  const out: string[] = [];
  const day = (iso: string | null) => dayOf(iso, now);
  const s = (n: number) => (n === 1 ? "" : "s");
  if (t.n === 0) {
    out.push("nothing has hit this yet — it rests on nothing written here.");
  } else {
    const span =
      t.first && t.last
        ? t.first === t.last
          ? `, all on ${day(t.first)}`
          : `, ${day(t.first)} to ${day(t.last)}`
        : "";
    const undated = t.undated ? `; ${t.undated} undated` : "";
    out.push(`hit by ${t.n} input${s(t.n)}${span}${undated}.`);
    if (t.weighed === 0)
      out.push(
        "none weighed yet — say, after the fact, which way each one bent you.",
      );
    else
      out.push(
        `${t.weighed} weighed: ${t.toward} bent it toward the question, ${t.away} away${
          t.unweighed ? `; ${t.unweighed} unweighed` : ""
        }.`,
      );
  }
  if (t.since > 0 && belief?.modified)
    out.push(
      `${t.since} input${s(t.since)} ${t.since === 1 ? "has" : "have"} hit it since it was last rewritten (${day(belief.modified)})${
        t.sinceUnweighed ? `, ${t.sinceUnweighed} of them unweighed` : ""
      }.`,
    );
  if (t.run.length >= 3) {
    const k = Math.min(t.run.length, 5);
    const last = t.run.slice(-k);
    const toward = last.filter((m) => m === "toward").length;
    const away = k - toward;
    if (toward === k || away === k)
      out.push(
        `the last ${k} weighed all bent it ${toward === k ? "toward" : "away"}.`,
      );
    else if (k >= 4 && Math.max(toward, away) / k >= 0.75)
      out.push(
        `of the last ${k} weighed, ${Math.max(toward, away)} bent it ${toward > away ? "toward" : "away"}.`,
      );
  }
  if (t.toward > 0 || t.away > 0) {
    const parts: string[] = [];
    if (t.toward > 0) parts.push(`toward: ${kinds(t.byKind.toward)}`);
    if (t.away > 0) parts.push(`away: ${kinds(t.byKind.away)}`);
    out.push(`what bent it ${parts.join(" · ")}.`);
  }
  if (t.unwritten > 0)
    out.push(
      `${t.unwritten} of the inputs ${t.unwritten === 1 ? "was" : "were"} never written down.`,
    );
  if (t.fallow > 0)
    out.push(
      `${t.fallow} of the inputs ${t.fallow === 1 ? "has" : "have"} gone fallow since.`,
    );
  if (!course.question) out.push("the question has not been put in words.");
  else if (course.trail.length === 0)
    out.push(`the question was put ${day(course.asked)}.`);
  else
    out.push(
      `the question as now put dates from ${day(course.asked)}; it was re-put ${course.trail.length} time${s(course.trail.length)} — it drifts because you moved it.`,
    );
  return out;
}

const TRAIL_MAX = 40;

/** Put the question in words. The old phrasing is kept, with its day. */
export function putQuestion(
  c: Course,
  question: string,
  today: string,
): Course {
  const q = question.trim().slice(0, 500);
  if (q === c.question) return c;
  const trail = c.question
    ? [...c.trail, { question: c.question, asked: c.asked }].slice(-TRAIL_MAX)
    : c.trail;
  return { ...c, question: q, asked: q ? today : "", trail };
}

/** Say which way an input bent the belief; null takes the mark back. */
export function setMark(
  c: Course,
  id: string,
  mark: Mark | null,
  today: string,
): Course {
  const marks = { ...c.marks };
  if (mark === null) delete marks[id];
  else marks[id] = { mark, day: today };
  return { ...c, marks };
}

/** The belief has a course worth keeping when anything was said about it. */
export const isBlank = (c: Course) =>
  !c.question && !c.trail.length && !Object.keys(c.marks).length && !c.note;

// js-yaml reads a bare date as a Date; a quoted one stays a string.
const day = (v: unknown, fallback = ""): string =>
  v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v) : fallback;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** One course, read back from its file. Anything malformed is dropped rather than guessed at. */
export function parseCourse(slug: string, raw: string): Course {
  const { data, content } = matter(raw);
  const trail: Course["trail"] = Array.isArray(data.trail)
    ? data.trail.flatMap((e: unknown) => {
        const t = e as { question?: unknown; asked?: unknown } | null;
        return t && typeof t === "object" && t.question
          ? [{ question: String(t.question), asked: day(t.asked) }]
          : [];
      })
    : [];
  const marks: Record<string, Marked> = {};
  if (data.marks && typeof data.marks === "object")
    for (const [id, v] of Object.entries(
      data.marks as Record<string, unknown>,
    )) {
      const m = v as { mark?: unknown; day?: unknown } | null;
      if (
        m &&
        typeof m === "object" &&
        (m.mark === "toward" || m.mark === "away")
      )
        marks[id] = { mark: m.mark, day: day(m.day) };
    }
  return {
    belief: String(data.belief ?? slug),
    slug,
    question: String(data.question ?? ""),
    asked: day(data.asked),
    trail,
    marks,
    note: content.trim(),
  };
}

const q = (s: string) => JSON.stringify(s);

/** The file a course is kept in: frontmatter a person can edit, note below. */
export function serialiseCourse(c: Course): string {
  const lines = [`belief: ${q(c.belief)}`];
  if (c.question)
    lines.push(`question: ${q(c.question)}`, `asked: ${q(c.asked)}`);
  if (c.trail.length) {
    lines.push("trail:");
    for (const t of c.trail)
      lines.push(`  - question: ${q(t.question)}`, `    asked: ${q(t.asked)}`);
  }
  const ids = Object.keys(c.marks).sort();
  if (ids.length) {
    lines.push("marks:");
    for (const id of ids)
      lines.push(
        `  ${q(id)}: { mark: ${q(c.marks[id].mark)}, day: ${q(c.marks[id].day)} }`,
      );
  }
  return `---\n${lines.join("\n")}\n---\n${c.note ? `${c.note}\n` : ""}`;
}

/** Validation at the boundary: a course arrives from the desk, or from a hand-edited file. */
export function validateCourse(input: unknown, today: string): Course {
  const c = input as Partial<Course> | null;
  if (!c || typeof c !== "object") throw new Error("course: not an object");
  if (typeof c.belief !== "string" || !c.belief.trim() || c.belief.length > 200)
    throw new Error("course: which belief?");
  const belief = c.belief.trim();
  const question =
    typeof c.question === "string" ? c.question.trim().slice(0, 500) : "";
  const asked =
    question && typeof c.asked === "string" && DAY.test(c.asked)
      ? c.asked
      : question
        ? today
        : "";
  const trail: Course["trail"] = Array.isArray(c.trail)
    ? c.trail
        .flatMap((t) =>
          t &&
          typeof t === "object" &&
          typeof t.question === "string" &&
          t.question.trim()
            ? [
                {
                  question: t.question.trim().slice(0, 500),
                  asked:
                    typeof t.asked === "string" && DAY.test(t.asked)
                      ? t.asked
                      : "",
                },
              ]
            : [],
        )
        .slice(-TRAIL_MAX)
    : [];
  const marks: Record<string, Marked> = {};
  if (c.marks && typeof c.marks === "object") {
    let n = 0;
    for (const [id, v] of Object.entries(c.marks)) {
      if (!id || id.length > 200) continue;
      const m = v as Partial<Marked> | null;
      if (!m || (m.mark !== "toward" && m.mark !== "away")) continue;
      marks[id] = {
        mark: m.mark,
        day: typeof m.day === "string" && DAY.test(m.day) ? m.day : today,
      };
      if (++n >= 500) break;
    }
  }
  return {
    belief,
    slug:
      typeof c.slug === "string" && /^[a-z0-9][a-z0-9-]{0,80}$/.test(c.slug)
        ? c.slug
        : slugOf(belief),
    question,
    asked,
    trail,
    marks,
    note: typeof c.note === "string" ? c.note.slice(0, 20_000) : "",
  };
}
