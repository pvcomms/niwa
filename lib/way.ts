import matter from "gray-matter";
import {
  YEAR_MS,
  formatDay,
  timeOf,
  validDay,
  yearsWords,
} from "./chronology.ts";

/**
 * The way: from where the reader is — the now — to where they mean to be —
 * the then, written as if it is already so. The instrument holds the two
 * texts in the reader's own words, reads them back as facts (which sentences
 * still look ahead, what the then speaks of that the now does not), and
 * holds what a model on this machine proposes for the way between: what
 * changes, what had to be true right before, the first moves, what stands in
 * the way. Every proposal stays proposed until the reader keeps it. This file
 * is the pure part; nothing here decides anything or leaves the machine.
 *
 * The mode the reader asked for — standing at the then and looking back — is
 * prospective hindsight: imagining an outcome as already having happened
 * makes its causes easier to name (Mitchell, Russo & Pennington 1989; Klein's
 * pre-mortem). Contrasting the wished-for future with what in the present
 * stands in its way, and giving each obstacle a when–then plan, is what turns
 * the picture into effort rather than draining it (Oettingen; Gollwitzer).
 * Dwelling in the outcome alone does the opposite (Kappes & Oettingen 2011),
 * which is why the steps are the point and the memoir is a mode, not a home.
 */

export type By = "you" | "proposed";
export type Dir = "back" | "forward";
export type Status = "open" | "arrived" | "let-go";

export type Step = {
  id: string;
  text: string;
  /** `YYYY-MM` or a day; null when not dated. */
  day: string | null;
  /** `back`: what had to be true right before, from the then. `forward`: a first move from the now. */
  dir: Dir;
  by: By;
  /** A proposal is not the reader's until kept. */
  kept: boolean;
  /** The chronology entry this step was set down as, if it was. */
  entry: string | null;
};
export type Obstacle = {
  id: string;
  text: string;
  plan: string;
  by: By;
  kept: boolean;
};
export type Change = {
  id: string;
  text: string;
  lane: string | null;
  by: By;
  kept: boolean;
};

export type Way = {
  slug: string;
  title: string;
  /** The day the then is set in. */
  then: string | null;
  status: Status;
  steps: Step[];
  obstacles: Obstacle[];
  changes: Change[];
  thenText: string;
  nowText: string;
  /** The then said again by the model, kept only if the reader keeps it. */
  colour: string;
  recorded: string;
  touched: string;
};

export type Proposal = {
  changes: { text: string; lane: string | null }[];
  back: { text: string; day: string | null }[];
  forward: { text: string; day: string | null }[];
  obstacles: { text: string; plan: string }[];
};

export const STATUS_LABEL: Record<Status, string> = {
  open: "on the way",
  arrived: "arrived",
  "let-go": "let go",
};

export const uid = () =>
  Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);

export const emptyWay = (today: string): Way => ({
  slug: "",
  title: "",
  then: null,
  status: "open",
  steps: [],
  obstacles: [],
  changes: [],
  thenText: "",
  nowText: "",
  colour: "",
  recorded: today,
  touched: today,
});

// ── the texts, read as facts ──────────────────────────────────────────────

export function sentencesOf(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

const AHEAD =
  /\b(will|won't|going to|gonna|would|someday|one day|eventually|i want|i hope|i wish|i'd like|i would like|by then|in the future|i plan to)\b/gi;

/** Which sentences of a then still look ahead instead of standing there. */
export function lookingAhead(text: string): {
  n: number;
  of: number;
  words: string[];
} {
  const ss = sentencesOf(text);
  const words = new Set<string>();
  let n = 0;
  for (const s of ss) {
    const m = s.match(AHEAD);
    if (m) {
      n++;
      for (const w of m) words.add(w.toLowerCase());
    }
  }
  return { n, of: ss.length, words: [...words].slice(0, 5) };
}

const STOP = new Set(
  "a an the and or but if then than that this these those there here it its it's i i'm i've i'd my me mine we our you your he she they them their his her is are was were be been being am do does did done have has had having will would can could should may might must not no nor so as at by for from in into of on to with without about over under after before again once only own same such very too more most much many some any each few both all just also still yet ever never now when where why how what which who whom whose because while during through between out up down off above below one two three first last new old day days year years month months time thing things way much".split(
    " ",
  ),
);

export function contentWords(text: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9'’-]+/)) {
    const w = raw.replace(/^['’-]+|['’-]+$/g, "");
    if (w.length < 4 || STOP.has(w) || /^\d+$/.test(w)) continue;
    m.set(w, (m.get(w) ?? 0) + 1);
  }
  return m;
}

/** What the then speaks of that the now does not, and the reverse — the vocabulary of the change. */
export function differs(
  thenText: string,
  nowText: string,
): { only: string[]; gone: string[] } {
  const a = contentWords(thenText);
  const b = contentWords(nowText);
  const pick = (x: Map<string, number>, y: Map<string, number>) =>
    [...x.entries()]
      .filter(([w]) => !y.has(w))
      .sort(
        (p, q) =>
          q[1] - p[1] || q[0].length - p[0].length || p[0].localeCompare(q[0]),
      )
      .map(([w]) => w)
      .slice(0, 10);
  return { only: pick(a, b), gone: pick(b, a) };
}

const list = (xs: string[]) =>
  xs.length <= 1
    ? xs.join("")
    : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

const dayMs = (d: string | null) => (d && validDay(d) ? timeOf(d, "mid") : NaN);

/** The steps in the order they happen: dated ones by day, undated back steps after, then undated forward. */
export function ordered(steps: Step[]): Step[] {
  const dated = steps
    .filter((s) => s.day && validDay(s.day))
    .sort((a, b) => dayMs(a.day) - dayMs(b.day));
  const fwd = steps.filter(
    (s) => !(s.day && validDay(s.day)) && s.dir === "forward",
  );
  const back = steps.filter(
    (s) => !(s.day && validDay(s.day)) && s.dir === "back",
  );
  return [...fwd, ...dated, ...[...back].reverse()];
}

/** Facts about the way. None of them is a verdict. */
export function readings(w: Way, today: string): string[] {
  const out: string[] = [];
  if (!w.thenText.trim() && !w.nowText.trim())
    return [
      "say where you are, and say where you mean to be — as it is, not as it will be.",
    ];
  const nowMs = timeOf(today, "mid");
  if (w.then && validDay(w.then)) {
    const d = (timeOf(w.then, "mid") - nowMs) / YEAR_MS;
    out.push(
      d < 0
        ? `the then was set in ${formatDay(w.then)} — ${yearsWords(-d)} ago.`
        : `the then is set in ${formatDay(w.then)} — ${yearsWords(d)} from today.`,
    );
  } else
    out.push(
      "the then has no day yet; give it one and the steps can be dated.",
    );
  if (w.status === "arrived") out.push("arrived — the then is now.");
  if (w.status === "let-go") out.push("let go.");
  if (w.thenText.trim()) {
    const a = lookingAhead(w.thenText);
    if (a.n)
      out.push(
        `${a.n} of the then's ${a.of} sentences still look ahead — ${list(a.words)}. it is meant to be written as it is.`,
      );
    else out.push("the then stands in the present tense throughout.");
  }
  if (w.thenText.trim() && w.nowText.trim()) {
    const { only, gone } = differs(w.thenText, w.nowText);
    if (only.length)
      out.push(
        `the then speaks of ${list(only.slice(0, 6))}; the now does not.`,
      );
    if (gone.length)
      out.push(
        `the now speaks of ${list(gone.slice(0, 6))}; the then has let them go.`,
      );
  }
  const kept = w.steps.filter((s) => s.kept);
  const proposed = w.steps.length - kept.length;
  if (w.steps.length) {
    const dated = kept.filter((s) => s.day && validDay(s.day)).length;
    out.push(
      `${kept.length} ${kept.length === 1 ? "step" : "steps"} yours${proposed ? `, ${proposed} proposed and not yet yours` : ""}; ${dated} dated.`,
    );
    const next = kept
      .filter((s) => s.day && validDay(s.day) && timeOf(s.day, "end") >= nowMs)
      .sort((a, b) => dayMs(a.day) - dayMs(b.day))[0];
    if (next)
      out.push(`the next dated step: ${next.text} — ${formatDay(next.day!)}.`);
    const before = ordered(kept).at(-1);
    if (before && before.dir === "back")
      out.push(
        `looking back from the then, what had to be true right before: ${before.text}`,
      );
  }
  const ob = w.obstacles.filter((o) => o.kept);
  if (ob.length)
    out.push(
      `${ob.length} in the way, named; ${ob.filter((o) => o.plan.trim()).length} with a when–then.`,
    );
  const ch = w.changes.filter((c) => c.kept);
  if (ch.length) {
    const lanes = [
      ...new Set(ch.map((c) => c.lane).filter((l): l is string => !!l)),
    ];
    out.push(
      `${ch.length} ${ch.length === 1 ? "thing changes" : "things change"} between the now and the then${lanes.length ? `, across ${list(lanes)}` : ""}.`,
    );
  }
  return out;
}

/** Standing at the then and looking back: the way told as if it has already been walked. */
export function memoir(w: Way): {
  dateline: string;
  hadToBe: Step[];
  nearly: Obstacle[];
  first: Step | null;
  changes: Change[];
} {
  const kept = w.steps.filter((s) => s.kept);
  const inOrder = ordered(kept);
  return {
    dateline:
      w.then && validDay(w.then)
        ? `It is ${formatDay(w.then)}. It is so.`
        : "It is so.",
    hadToBe: [...inOrder].reverse(),
    nearly: w.obstacles.filter((o) => o.kept),
    first: inOrder[0] ?? null,
    changes: w.changes.filter((c) => c.kept),
  };
}

// ── asking the model on this machine ──────────────────────────────────────

export type Lane = { id: string; label: string };

const SYSTEM = (today: string, then: string | null, lanes: Lane[]) =>
  [
    "You help one person see the way from where they are — the now — to where they mean to be — the then, which they have written as if it is already so.",
    "Use their own words and names. Invent no facts about their life. Propose; they decide. Be concrete and plain; no praise, no hedging, no advice about feelings.",
    `Today is ${today}.${then ? ` The then is set in ${then}.` : ""}`,
    lanes.length
      ? `Their lanes are: ${lanes.map((l) => `${l.id} (${l.label})`).join(", ")}. A lane is one of those ids.`
      : "",
    "Answer in JSON only.",
  ]
    .filter(Boolean)
    .join(" ");

export function askStructure(w: Way, lanes: Lane[], today: string) {
  const laneIds = lanes.map((l) => l.id);
  return {
    system: SYSTEM(today, w.then, lanes),
    user: [
      `THEN — as it is:\n${w.thenText.trim() || "(not written)"}`,
      `NOW:\n${w.nowText.trim() || "(not written)"}`,
      w.changes.filter((c) => c.kept).length
        ? `Already kept as changes: ${w.changes
            .filter((c) => c.kept)
            .map((c) => c.text)
            .join(" · ")}`
        : "",
      w.steps.filter((s) => s.kept).length
        ? `Already kept as steps: ${w.steps
            .filter((s) => s.kept)
            .map((s) => `${s.text}${s.day ? ` (${s.day})` : ""}`)
            .join(" · ")}`
        : "",
      "Give four things.",
      "changes: what is different between the now and the then — one line each, 4 to 8, each with the lane it belongs to.",
      `back: standing at the then and looking back, what had to be true right before, then before that, step by step toward the now — 3 to 6, each with a month as YYYY-MM${w.then ? " between today and the then" : ""}, latest first.`,
      "forward: the first moves from the now, concrete enough to do in a week — 3 to 5, each with a month as YYYY-MM.",
      "obstacles: what in the now stands in the way — 2 to 4; for each, a plan in the form 'when X, I Y'. Put the obstacle in text and the plan in plan.",
      "Do not repeat what is already kept.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    schema: {
      type: "object",
      properties: {
        changes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              lane: laneIds.length
                ? { type: "string", enum: laneIds }
                : { type: "string" },
            },
            required: ["text", "lane"],
          },
        },
        back: {
          type: "array",
          items: {
            type: "object",
            properties: { text: { type: "string" }, day: { type: "string" } },
            required: ["text", "day"],
          },
        },
        forward: {
          type: "array",
          items: {
            type: "object",
            properties: { text: { type: "string" }, day: { type: "string" } },
            required: ["text", "day"],
          },
        },
        obstacles: {
          type: "array",
          items: {
            type: "object",
            properties: { text: { type: "string" }, plan: { type: "string" } },
            required: ["text", "plan"],
          },
        },
      },
      required: ["changes", "back", "forward", "obstacles"],
    },
  };
}

export function askColour(w: Way, today: string) {
  return {
    system: SYSTEM(today, w.then, []),
    user: [
      `THEN — as they wrote it:\n${w.thenText.trim()}`,
      w.nowText.trim() ? `NOW, for what has changed:\n${w.nowText.trim()}` : "",
      "Say the then again: first person, present tense, as it is. Specific and sensory — a place, a time of day, a thing in the hand. Keep their words and names; add no facts they did not give. No 'will', no 'someday', no promises. At most 160 words.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    schema: {
      type: "object",
      properties: { then: { type: "string" } },
      required: ["then"],
    },
  };
}

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const monthOf = (
  v: unknown,
  today: string,
  then: string | null,
): string | null => {
  const s = str(v, 10);
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(s);
  if (!m) return null;
  const day = m[2] ? `${m[1]}-${m[2]}` : `${m[1]}-01`;
  if (!validDay(day)) return null;
  const ms = timeOf(day, "mid");
  const lo = timeOf(today.slice(0, 7), "start");
  const hi = then && validDay(then) ? timeOf(then, "end") : Infinity;
  if (ms < lo) return today.slice(0, 7);
  if (ms > hi) return then!.slice(0, 7);
  return day;
};

/** What the model sent, made safe: capped, dated inside the way, lanes that exist. */
export function validateProposal(
  raw: unknown,
  today: string,
  then: string | null,
  lanes: Lane[],
): Proposal {
  const r = (raw ?? {}) as Record<string, unknown>;
  const ids = new Set(lanes.map((l) => l.id));
  const arr = (v: unknown) => (Array.isArray(v) ? v.slice(0, 8) : []);
  const changes = arr(r.changes)
    .map((c) => {
      const x = c as Record<string, unknown>;
      const lane = str(x.lane, 40).toLowerCase();
      return { text: str(x.text, 300), lane: ids.has(lane) ? lane : null };
    })
    .filter((c) => c.text);
  const steps = (v: unknown) =>
    arr(v)
      .map((s) => {
        const x = s as Record<string, unknown>;
        return { text: str(x.text, 300), day: monthOf(x.day, today, then) };
      })
      .filter((s) => s.text);
  const obstacles = arr(r.obstacles)
    .map((o) => {
      const x = o as Record<string, unknown>;
      return { text: str(x.text, 300), plan: str(x.plan, 300) };
    })
    .filter((o) => o.text);
  return { changes, back: steps(r.back), forward: steps(r.forward), obstacles };
}

export function validateColour(raw: unknown): string {
  const r = (raw ?? {}) as Record<string, unknown>;
  return str(r.then, 2000);
}

/** Fold a proposal into the way as proposed, not kept; nothing already there is repeated. */
export function adopt(w: Way, p: Proposal, id: () => string = uid): Way {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const haveStep = new Set(w.steps.map((s) => norm(s.text)));
  const haveOb = new Set(w.obstacles.map((o) => norm(o.text)));
  const haveCh = new Set(w.changes.map((c) => norm(c.text)));
  const steps: Step[] = [
    ...p.forward.map((s) => ({ ...s, dir: "forward" as Dir })),
    ...p.back.map((s) => ({ ...s, dir: "back" as Dir })),
  ]
    .filter((s) => !haveStep.has(norm(s.text)))
    .map((s) => ({
      id: id(),
      text: s.text,
      day: s.day,
      dir: s.dir,
      by: "proposed" as By,
      kept: false,
      entry: null,
    }));
  const obstacles: Obstacle[] = p.obstacles
    .filter((o) => !haveOb.has(norm(o.text)))
    .map((o) => ({
      id: id(),
      text: o.text,
      plan: o.plan,
      by: "proposed",
      kept: false,
    }));
  const changes: Change[] = p.changes
    .filter((c) => !haveCh.has(norm(c.text)))
    .map((c) => ({
      id: id(),
      text: c.text,
      lane: c.lane,
      by: "proposed",
      kept: false,
    }));
  return {
    ...w,
    steps: [...w.steps, ...steps],
    obstacles: [...w.obstacles, ...obstacles],
    changes: [...w.changes, ...changes],
  };
}

// ── the file ──────────────────────────────────────────────────────────────

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function slugOf(title: string, day: string): string {
  const t = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56)
    .replace(/-+$/g, "");
  return `${day.slice(0, 10)}-${t || "way"}`;
}

/** A title from the then's first sentence, when none was given. */
export function titleOf(w: { title: string; thenText: string }): string {
  if (w.title.trim()) return w.title.trim();
  const first = sentencesOf(w.thenText)[0] ?? "";
  return first.replace(/[.!?]$/, "").slice(0, 80) || "a way";
}

const dayStr = (v: unknown): string => {
  if (v instanceof Date && !Number.isNaN(v.getTime()))
    return v.toISOString().slice(0, 10);
  if (typeof v === "number") return String(v);
  return typeof v === "string" ? v.trim() : "";
};
const by = (v: unknown): By => (v === "proposed" ? "proposed" : "you");
const dir = (v: unknown): Dir => (v === "back" ? "back" : "forward");

function section(body: string, name: string): string {
  const re = new RegExp(`^## ${name}\\s*$`, "im");
  const m = re.exec(body);
  if (!m) return "";
  const rest = body.slice(m.index + m[0].length);
  const next = /^## /m.exec(rest);
  return (next ? rest.slice(0, next.index) : rest).trim();
}

export function parseWay(slug: string, raw: string): Way {
  const { data, content } = matter(raw);
  const then = dayStr(data.then);
  const steps: Step[] = Array.isArray(data.steps)
    ? data.steps.flatMap((s: unknown) => {
        const x = s as Record<string, unknown> | null;
        if (!x || typeof x !== "object" || !str(x.text, 300)) return [];
        const d = dayStr(x.day);
        return [
          {
            id: str(x.id, 24) || uid(),
            text: str(x.text, 300),
            day: validDay(d) ? d : null,
            dir: dir(x.dir),
            by: by(x.by),
            kept: x.kept !== false,
            entry: str(x.entry, 120) || null,
          },
        ];
      })
    : [];
  const obstacles: Obstacle[] = Array.isArray(data.obstacles)
    ? data.obstacles.flatMap((o: unknown) => {
        const x = o as Record<string, unknown> | null;
        if (!x || typeof x !== "object" || !str(x.text, 300)) return [];
        return [
          {
            id: str(x.id, 24) || uid(),
            text: str(x.text, 300),
            plan: str(x.plan, 300),
            by: by(x.by),
            kept: x.kept !== false,
          },
        ];
      })
    : [];
  const changes: Change[] = Array.isArray(data.changes)
    ? data.changes.flatMap((c: unknown) => {
        const x = c as Record<string, unknown> | null;
        if (!x || typeof x !== "object" || !str(x.text, 300)) return [];
        return [
          {
            id: str(x.id, 24) || uid(),
            text: str(x.text, 300),
            lane: str(x.lane, 40) || null,
            by: by(x.by),
            kept: x.kept !== false,
          },
        ];
      })
    : [];
  const recorded = dayStr(data.recorded);
  const touched = dayStr(data.touched);
  return {
    slug,
    title: str(data.title, 120),
    then: validDay(then) ? then : null,
    status:
      data.status === "arrived" || data.status === "let-go"
        ? data.status
        : "open",
    steps,
    obstacles,
    changes,
    thenText: section(content, "then"),
    nowText: section(content, "now"),
    colour: section(content, "the then, said again"),
    recorded: validDay(recorded) ? recorded : "",
    touched: validDay(touched) ? touched : validDay(recorded) ? recorded : "",
  };
}

const q = (s: string | null) => JSON.stringify(s);

export function serialiseWay(w: Way): string {
  const lines = [`title: ${q(w.title)}`];
  if (w.then) lines.push(`then: ${q(w.then)}`);
  lines.push(
    `status: ${q(w.status)}`,
    `recorded: ${q(w.recorded)}`,
    `touched: ${q(w.touched)}`,
  );
  if (w.steps.length) {
    lines.push("steps:");
    for (const s of w.steps)
      lines.push(
        `  - { id: ${q(s.id)}, text: ${q(s.text)}, day: ${q(s.day)}, dir: ${q(s.dir)}, by: ${q(s.by)}, kept: ${s.kept}, entry: ${q(s.entry)} }`,
      );
  }
  if (w.obstacles.length) {
    lines.push("obstacles:");
    for (const o of w.obstacles)
      lines.push(
        `  - { id: ${q(o.id)}, text: ${q(o.text)}, plan: ${q(o.plan)}, by: ${q(o.by)}, kept: ${o.kept} }`,
      );
  }
  if (w.changes.length) {
    lines.push("changes:");
    for (const c of w.changes)
      lines.push(
        `  - { id: ${q(c.id)}, text: ${q(c.text)}, lane: ${q(c.lane)}, by: ${q(c.by)}, kept: ${c.kept} }`,
      );
  }
  const body = [
    `## then\n\n${w.thenText.trim()}`,
    `## now\n\n${w.nowText.trim()}`,
  ];
  if (w.colour.trim())
    body.push(`## the then, said again\n\n${w.colour.trim()}`);
  return `---\n${lines.join("\n")}\n---\n\n${body.join("\n\n")}\n`;
}

/** Validation at the boundary: a way arrives from the desk, or from a hand-edited file. */
export function validateWay(input: unknown, today: string): Way {
  const w = input as Partial<Way> | null;
  if (!w || typeof w !== "object") throw new Error("way: not an object");
  const thenText =
    typeof w.thenText === "string" ? w.thenText.trim().slice(0, 20_000) : "";
  const nowText =
    typeof w.nowText === "string" ? w.nowText.trim().slice(0, 20_000) : "";
  if (!thenText && !nowText)
    throw new Error("way: say where you are, or where you mean to be");
  const then = dayStr(w.then);
  if (then && !validDay(then))
    throw new Error("way: the then's day — a year, a month or a day");
  const title = titleOf({ title: str(w.title, 120), thenText });
  const recorded = dayStr(w.recorded);
  const slugIn = str(w.slug, 80);
  const slug = slugIn || slugOf(title, validDay(recorded) ? recorded : today);
  if (!SLUG.test(slug)) throw new Error("way: bad slug");
  const list = <T>(
    v: unknown,
    f: (x: Record<string, unknown>) => T | null,
  ): T[] =>
    Array.isArray(v)
      ? v
          .slice(0, 60)
          .map((x) =>
            x && typeof x === "object" ? f(x as Record<string, unknown>) : null,
          )
          .filter((x): x is T => x !== null)
      : [];
  return {
    slug,
    title,
    then: then || null,
    status: w.status === "arrived" || w.status === "let-go" ? w.status : "open",
    steps: list(w.steps, (x) => {
      const text = str(x.text, 300);
      if (!text) return null;
      const d = dayStr(x.day);
      return {
        id: str(x.id, 24) || uid(),
        text,
        day: validDay(d) ? d : null,
        dir: dir(x.dir),
        by: by(x.by),
        kept: x.kept === true,
        entry: str(x.entry, 120) || null,
      };
    }),
    obstacles: list(w.obstacles, (x) => {
      const text = str(x.text, 300);
      return text
        ? {
            id: str(x.id, 24) || uid(),
            text,
            plan: str(x.plan, 300),
            by: by(x.by),
            kept: x.kept === true,
          }
        : null;
    }),
    changes: list(w.changes, (x) => {
      const text = str(x.text, 300);
      return text
        ? {
            id: str(x.id, 24) || uid(),
            text,
            lane: str(x.lane, 40) || null,
            by: by(x.by),
            kept: x.kept === true,
          }
        : null;
    }),
    thenText,
    nowText,
    colour: typeof w.colour === "string" ? w.colour.trim().slice(0, 4000) : "",
    recorded: validDay(recorded) && recorded.length === 10 ? recorded : today,
    touched: today,
  };
}
