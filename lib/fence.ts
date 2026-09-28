import matter from "gray-matter";
import type { GardenNode } from "./garden.ts";
import { slugOf as datedSlug, uid } from "./way.ts";

/**
 * The fence: Chesterton's fence as an instrument. A thing the reader means
 * to clear away — a rule, a habit, a step, a custom, a line of code — set
 * down with what it costs to keep. Then what it might be for, each use
 * marked for how the reader knows it (a guess, or found out: asked, found
 * written, seen at work) and whether the reason still holds; what would come
 * through if it came down; whether it could go back up. Then the reader's
 * call, dated: keep it, move it, take it down, or take it down for a while
 * and look again on a day they name — and afterwards, what came through of
 * what they listed. The one lean is Chesterton's: taking a fence down before
 * any use is found asks once more and is kept on the record as such. Nothing
 * here says whether a fence should come down, and nothing keeps one for
 * being old: a reason that no longer holds is drawn as a broken rail.
 */

export type Maker = "" | "me" | "ask" | "gone" | "unknown";
export const MAKERS: Exclude<Maker, "">[] = ["me", "ask", "gone", "unknown"];
export const MAKER_LABEL: Record<Exclude<Maker, "">, string> = {
  me: "I did",
  ask: "someone I can ask",
  gone: "someone I can't ask",
  unknown: "no one knows",
};

/** How the reader knows what a fence is for: a guess, or found out one of three ways. */
export type Known = "guess" | "asked" | "written" | "seen";
export const KNOWN: Known[] = ["guess", "asked", "written", "seen"];
export const KNOWN_LABEL: Record<Known, string> = {
  guess: "a guess",
  asked: "asked",
  written: "found it written",
  seen: "saw it at work",
};

export type Holds = "" | "holds" | "gone" | "unsure";
export const HOLDS: Exclude<Holds, "">[] = ["holds", "gone", "unsure"];
export const HOLDS_LABEL: Record<Exclude<Holds, "">, string> = {
  holds: "still holds",
  gone: "no longer holds",
  unsure: "not sure",
};

export type Use = {
  id: string;
  /** What it might be for, in the reader's words. */
  text: string;
  known: Known;
  holds: Holds;
  /** What else does this job now, if anything. */
  instead: string;
  /** The garden's arrive from the record and are hollow until kept. */
  by: "you" | "garden";
  kept: boolean;
};

export type Came = "" | "came" | "not";
export type Through = { id: string; text: string; came: Came };

export type Back = "" | "easily" | "cost" | "never";
export const BACKS: Exclude<Back, "">[] = ["easily", "cost", "never"];
export const BACK_LABEL: Record<Exclude<Back, "">, string> = {
  easily: "easily",
  cost: "at a cost",
  never: "not at all",
};

export type CallKind = "keep" | "move" | "down" | "trial" | "back";
export const CALL_KINDS: CallKind[] = ["keep", "move", "down", "trial", "back"];
/** How a call made is written: on the record, in the file, in the readings. */
export const CALL_LABEL: Record<CallKind, string> = {
  keep: "kept",
  move: "moved",
  down: "taken down",
  trial: "down for a while",
  back: "put back up",
};
/** How the call is asked for, before it is made. */
export const CALL_ASK: Record<CallKind, string> = {
  keep: "keep it",
  move: "move it",
  down: "take it down",
  trial: "down for a while",
  back: "put it back up",
};

export type Call = {
  on: string;
  call: CallKind;
  /** A trial's day to look again; empty for every other call. */
  until: string;
  note: string;
  /** Taken down while no use had been found. */
  unseen: boolean;
};

export type Fence = {
  slug: string;
  /** The day it was set down. */
  put: string;
  touched: string;
  /** What would be cleared away, in a line. */
  fence: string;
  /** What it costs to keep, as it stands. */
  cost: string;
  maker: Maker;
  by: string;
  when: string;
  uses: Use[];
  through: Through[];
  back: Back;
  backHow: string;
  calls: Call[];
  after: string;
  stone: string | null;
};

export const emptyFence = (day: string): Fence => ({
  slug: "",
  put: day,
  touched: day,
  fence: "",
  cost: "",
  maker: "",
  by: "",
  when: "",
  uses: [],
  through: [],
  back: "",
  backHow: "",
  calls: [],
  after: "",
  stone: null,
});

export const newUse = (text: string): Use => ({
  id: uid(),
  text,
  known: "guess",
  holds: "",
  instead: "",
  by: "you",
  kept: true,
});

export const newThrough = (text: string): Through => ({
  id: uid(),
  text,
  came: "",
});

/* ── where it stands ───────────────────────────────────────────────────── */

export type State = "open" | CallKind;
export const stateOf = (f: Fence): State => f.calls.at(-1)?.call ?? "open";
/** Whether the fence is up: every state but down and down for a while. */
export const isUp = (s: State) => s !== "down" && s !== "trial";
/** A use is found when it is kept and known by more than a guess. */
export const isFound = (u: Use) => u.kept && u.known !== "guess";
export const hasUse = (f: Fence) => f.uses.some(isFound);
/** Whether the fence has ever come down, so that afterwards can be asked. */
export const cameDown = (f: Fence) =>
  f.calls.some((c) => c.call === "down" || c.call === "trial");

/** The calls a fence can take from where it stands. */
export function callsFrom(s: State): CallKind[] {
  if (s === "down") return ["back", "move"];
  if (s === "trial") return ["back", "move", "down"];
  return ["keep", "move", "down", "trial"];
}

/* ── days ──────────────────────────────────────────────────────────────── */

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const utc = (d: string) =>
  Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
export function daysBetween(a: string, b: string): number {
  if (!DAY.test(a) || !DAY.test(b)) return 0;
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}
export function addDays(d: string, k: number): string {
  if (!DAY.test(d)) return d;
  return new Date(utc(d) + k * 86_400_000).toISOString().slice(0, 10);
}
const MON = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
export const dayWords = (d: string): string =>
  DAY.test(d) ? `${+d.slice(8, 10)} ${MON[+d.slice(5, 7) - 1]}` : d;
/** A when as written: a day with its year, anything else as the reader put it. */
export const whenWords = (w: string): string =>
  DAY.test(w.trim())
    ? `${dayWords(w.trim())} ${w.trim().slice(0, 4)}`
    : w.trim();

/** A trial whose day to look again has come. */
export const isDue = (f: Fence, today: string): boolean => {
  const c = f.calls.at(-1);
  return (
    c?.call === "trial" && DAY.test(c.until) && daysBetween(c.until, today) >= 0
  );
};

/* ── what the record says ──────────────────────────────────────────────── */

const clip = (s: string, max: number) =>
  s.length <= max ? s : `${s.slice(0, max).replace(/\s+\S*$/, "")}…`;

/**
 * The reason a note gives for itself: the paragraph after its **Why:**, the
 * way memory's rules are written, with its links unwrapped. Empty when the
 * note gives none.
 */
export function whyOf(body: string): string {
  const m = body.match(
    /\*\*Why:?\*\*:?[ \t]*([\s\S]*?)(?=\n[ \t]*\n|\*\*How to apply|$)/i,
  );
  if (!m) return "";
  const t = m[1]
    .replace(/\s*\(\s*\[\[[^\]]+\]\]\s*\)/g, "")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, (_, s: string) => s.replace(/[_-]+/g, " "))
    .replace(/[*`]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return clip(t, 320);
}

/** A rule in the reader's record: a fence they put up, with the reason they gave then. */
export type Standing = {
  id: string;
  label: string;
  why: string;
  /** The day its file first appears in the record's history. */
  since: string | null;
};

/** The rules in the record, oldest first; those with no day on record last. */
export function standingOf(
  nodes: GardenNode[],
  since: (file: string | null) => string | null,
): Standing[] {
  return nodes
    .filter((n) => n.kind === "feedback")
    .map((n) => ({
      id: n.id,
      label: n.label,
      why: whyOf(n.body ?? ""),
      since: since(n.file),
    }))
    .sort((a, b) => {
      const x = a.since ?? "9";
      const y = b.since ?? "9";
      return x < y ? -1 : x > y ? 1 : a.label < b.label ? -1 : 1;
    });
}

/** The stone a fence is about, as the route hands it over. */
export type About = {
  id: string;
  label: string;
  why: string;
  since: string | null;
  /** A rule the reader gave: they put this fence up themselves. */
  mine: boolean;
};

export const aboutOf = (n: GardenNode, since: string | null): About => ({
  id: n.id,
  label: n.label,
  why: whyOf(n.body ?? ""),
  since,
  mine: n.source === "memory" && n.kind === "feedback",
});

/** A fresh fence about a stone: its name as the fence, its recorded reason offered hollow. */
export const fenceAbout = (a: About, day: string): Fence => ({
  ...emptyFence(day),
  fence: a.label,
  maker: a.mine ? "me" : "",
  when: a.since ?? "",
  uses: a.why
    ? [
        {
          id: "u1",
          text: a.why,
          known: "written",
          holds: "",
          instead: "",
          by: "garden",
          kept: false,
        },
      ]
    : [],
  stone: a.id,
});

/* ── the readings ──────────────────────────────────────────────────────── */

const n = (k: number, one: string, many = `${one}s`) =>
  `${k} ${k === 1 ? one : many}`;
const FOUND_WORDS: Record<Exclude<Known, "guess">, string> = {
  asked: "found by asking",
  written: "found written",
  seen: "seen at work",
};

function made(f: Fence): string {
  const who =
    f.maker === "me"
      ? `you put it up${f.by.trim() ? ` — ${f.by.trim()}` : ""}`
      : f.by.trim()
        ? `put up by ${f.by.trim()}`
        : f.maker === "unknown"
          ? "no one knows who put it up"
          : "";
  const parts = [`set down ${dayWords(f.put)}`];
  if (who) parts.push(who);
  if (f.when.trim()) parts.push(whenWords(f.when));
  if (f.maker === "ask") parts.push("someone you can ask");
  if (f.maker === "gone") parts.push("someone you cannot ask");
  return parts.join(" · ");
}

function callWords(c: Call, today: string): string {
  if (c.call === "trial") {
    const left = daysBetween(today, c.until);
    const when = DAY.test(c.until)
      ? left > 0
        ? `, until ${dayWords(c.until)} — ${n(left, "day")} to go`
        : left === 0
          ? `, until ${dayWords(c.until)} — the day to look again is today`
          : `, until ${dayWords(c.until)} — the day to look again was ${n(-left, "day")} ago`
      : "";
    return `down for a while since ${dayWords(c.on)}${when}`;
  }
  // A move and a putting back say where the fence went; the other calls' notes are
  // reasons, and stay on the sheet.
  const where =
    (c.call === "move" || c.call === "back") && c.note.trim()
      ? `: ${c.note.trim()}`
      : "";
  return `${CALL_LABEL[c.call]} ${dayWords(c.on)}${where}`;
}

/** Facts about one fence, in the order the sheet asks for them; never a verdict. */
export function readings(f: Fence, today: string): string[] {
  const out = [made(f)];
  const kept = f.uses.filter((u) => u.kept);
  const hollow = f.uses.length - kept.length;
  if (!f.uses.length) out.push("nothing set down yet that it might be for");
  else {
    const found = (["asked", "written", "seen"] as const)
      .map((k) => [k, kept.filter((u) => u.known === k).length] as const)
      .filter(([, c]) => c)
      .map(([k, c]) => `${c} ${FOUND_WORDS[k]}`);
    const guesses = kept.filter((u) => u.known === "guess").length;
    if (guesses) found.push(n(guesses, "guess", "guesses"));
    if (hollow) found.push(`${hollow} from the record, not yet kept`);
    out.push(
      `${n(f.uses.length, "thing")} it might be for: ${found.join(", ")}`,
    );
    const first = f.uses.find(isFound);
    out.push(
      first
        ? `a use found: ${clip(first.text, 90)}`
        : kept.length
          ? "no use found yet: every one is a guess"
          : "no use found yet",
    );
    const fu = f.uses.filter(isFound);
    const marks = HOLDS.map(
      (h) => [h, fu.filter((u) => u.holds === h).length] as const,
    )
      .filter(([, c]) => c)
      .map(([h, c]) =>
        h === "unsure"
          ? `${c} not sure`
          : `${c} ${h === "holds" ? "still" : "no longer"} ${c === 1 ? "holds" : "hold"}`,
      );
    if (marks.length) out.push(`of what was found: ${marks.join(", ")}`);
    const instead = kept.filter((u) => u.instead.trim());
    if (instead.length)
      out.push(
        `something else does this now for ${instead.length}: ${instead.map((u) => u.instead.trim()).join("; ")}`,
      );
  }
  out.push(
    f.through.length
      ? `if it came down: ${n(f.through.length, "thing")} you said would come through`
      : "not said yet what would come through",
  );
  out.push(
    f.back
      ? `if it has to go back up: ${BACK_LABEL[f.back]}${f.backHow.trim() ? ` — ${f.backHow.trim()}` : ""}`
      : "not said yet whether it could go back up",
  );
  const c = f.calls.at(-1);
  if (!c) out.push("no call yet");
  else {
    const earlier = f.calls
      .slice(0, -1)
      .map((x) => `${CALL_LABEL[x.call]} ${dayWords(x.on)}`);
    out.push(
      `${callWords(c, today)}${c.unseen ? ", before a use was found" : ""}${earlier.length ? ` · before that: ${earlier.join(", ")}` : ""}`,
    );
  }
  if (cameDown(f) && f.through.length) {
    const came = f.through.filter((t) => t.came === "came").length;
    const not = f.through.filter((t) => t.came === "not").length;
    const open = f.through.length - came - not;
    if (came || not)
      out.push(
        `afterwards: of the ${f.through.length} you listed, ${came} came through, ${not} did not${open ? `, ${open} not marked` : ""}`,
      );
  }
  return out;
}

export type Tally = {
  n: number;
  found: number;
  state: Record<State, number>;
  /** Fences taken down, at least once, before a use was found. */
  unseen: number;
  uses: number;
  guesses: number;
  by: Record<Exclude<Known, "guess">, number>;
  holds: number;
  gone: number;
  unsure: number;
  /** Fences that came down and were looked at again: something marked came or not. */
  looked: number;
  /** Of those, the fences where something the reader listed came through. */
  listed: number;
  due: { slug: string; fence: string; until: string }[];
};

export function tally(fences: Fence[], today: string): Tally {
  const state: Record<State, number> = {
    open: 0,
    keep: 0,
    move: 0,
    down: 0,
    trial: 0,
    back: 0,
  };
  const by = { asked: 0, written: 0, seen: 0 };
  let uses = 0;
  let guesses = 0;
  let holds = 0;
  let gone = 0;
  let unsure = 0;
  let looked = 0;
  let listed = 0;
  for (const f of fences) {
    state[stateOf(f)]++;
    for (const u of f.uses.filter((x) => x.kept)) {
      uses++;
      if (u.known === "guess") guesses++;
      else {
        by[u.known]++;
        if (u.holds === "holds") holds++;
        if (u.holds === "gone") gone++;
        if (u.holds === "unsure") unsure++;
      }
    }
    if (cameDown(f) && f.through.some((t) => t.came)) {
      looked++;
      if (f.through.some((t) => t.came === "came")) listed++;
    }
  }
  return {
    n: fences.length,
    found: fences.filter(hasUse).length,
    state,
    unseen: fences.filter((f) => f.calls.some((c) => c.unseen)).length,
    uses,
    guesses,
    by,
    holds,
    gone,
    unsure,
    looked,
    listed,
    due: fences
      .filter((f) => isDue(f, today))
      .map((f) => ({
        slug: f.slug,
        fence: f.fence,
        until: f.calls.at(-1)!.until,
      })),
  };
}

const STATE_WORDS: Record<State, string> = {
  open: "no call yet",
  keep: "kept",
  move: "moved",
  down: "down",
  trial: "down for a while",
  back: "put back up",
};

/** Facts about the record of fences; none a verdict on a fence or the reader. */
export function recordReadings(t: Tally): string[] {
  if (!t.n) return ["no fences set down yet"];
  const out = [`${n(t.n, "fence")} set down · a use found for ${t.found}`];
  out.push(
    `where they stand: ${(Object.keys(STATE_WORDS) as State[])
      .filter((s) => t.state[s])
      .map((s) => `${STATE_WORDS[s]} ${t.state[s]}`)
      .join(" · ")}`,
  );
  if (t.unseen) out.push(`taken down before a use was found: ${t.unseen}`);
  if (t.uses) {
    const found = t.uses - t.guesses;
    const how = (["asked", "written", "seen"] as const)
      .filter((k) => t.by[k])
      .map((k) => `${FOUND_WORDS[k]} ${t.by[k]}`);
    const marks = [
      t.holds ? `${t.holds} still ${t.holds === 1 ? "holds" : "hold"}` : "",
      t.gone ? `${t.gone} no longer` : "",
      t.unsure ? `${t.unsure} not sure` : "",
    ].filter(Boolean);
    out.push(
      `what they might be for: ${t.uses} — ${n(t.guesses, "guess", "guesses")}, ${found} found${how.length ? ` (${how.join(", ")})` : ""}${marks.length ? ` · of the found, ${marks.join(", ")}` : ""}`,
    );
  }
  if (t.looked)
    out.push(
      `looked at again after coming down: ${t.looked} — something you listed came through for ${t.listed} of ${t.looked}`,
    );
  if (t.due.length)
    out.push(
      `a day to look again has come: ${t.due.map((d) => `${d.fence.replace(/[.!?]+$/, "")} (${dayWords(d.until)})`).join(", ")}`,
    );
  return out;
}

/* ── the file ──────────────────────────────────────────────────────────── */

const y = (s: string | null) => JSON.stringify(s);
const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
const long = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const day = (v: unknown, or: string) =>
  typeof v === "string" && DAY.test(v) ? v : or;

const KNOWN_OF = Object.fromEntries(
  KNOWN.map((k) => [KNOWN_LABEL[k], k]),
) as Record<string, Known>;
const HOLDS_OF = Object.fromEntries(
  HOLDS.map((h) => [HOLDS_LABEL[h], h]),
) as Record<string, Holds>;
const CALL_OF = Object.fromEntries(
  CALL_KINDS.map((c) => [CALL_LABEL[c], c]),
) as Record<string, CallKind>;
const RECORD = "from the record";
const HOLLOW = "hollow";
const INSTEAD = "something else does this now: ";
const UNSEEN = " · before a use was found";

function useLine(u: Use): string {
  const marks = [
    KNOWN_LABEL[u.known],
    u.holds ? HOLDS_LABEL[u.holds] : "",
    u.by === "garden" ? RECORD : "",
    u.kept ? "" : HOLLOW,
  ].filter(Boolean);
  const line = `- [${marks.join(" · ")}] ${u.text}`;
  return u.instead.trim() ? `${line}\n  - ${INSTEAD}${u.instead.trim()}` : line;
}

const throughLine = (t: Through) =>
  `- ${t.came === "came" ? "[came through] " : t.came === "not" ? "[did not come] " : ""}${t.text}`;

const callLine = (c: Call) =>
  `- ${c.on}: ${CALL_LABEL[c.call]}${c.call === "trial" && c.until ? ` until ${c.until}` : ""}${c.unseen ? UNSEEN : ""}${c.note.trim() ? ` — ${c.note.trim()}` : ""}`;

export function serialiseFence(f: Fence): string {
  const fm = [`put: ${y(f.put)}`, `touched: ${y(f.touched)}`];
  if (f.maker) fm.push(`maker: ${f.maker}`);
  if (f.by.trim()) fm.push(`by: ${y(f.by.trim())}`);
  if (f.when.trim()) fm.push(`when: ${y(f.when.trim())}`);
  if (f.back) fm.push(`back: ${f.back}`);
  if (f.stone) fm.push(`stone: ${y(f.stone)}`);
  const body = [`## the fence\n\n${f.fence.trim()}`];
  if (f.cost.trim()) body.push(`## what it costs\n\n${f.cost.trim()}`);
  if (f.uses.length)
    body.push(`## what it might be for\n\n${f.uses.map(useLine).join("\n")}`);
  if (f.through.length)
    body.push(
      `## what would come through\n\n${f.through.map(throughLine).join("\n")}`,
    );
  if (f.backHow.trim()) body.push(`## putting it back\n\n${f.backHow.trim()}`);
  if (f.calls.length)
    body.push(`## the calls\n\n${f.calls.map(callLine).join("\n")}`);
  if (f.after.trim()) body.push(`## afterwards\n\n${f.after.trim()}`);
  return `---\n${fm.join("\n")}\n---\n\n${body.join("\n\n")}\n`;
}

export function parseFence(slug: string, raw: string): Fence {
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

  const uses: Record<string, unknown>[] = [];
  for (const line of sec("what it might be for").split("\n")) {
    const sub = line.match(/^\s+- (.*)$/);
    if (sub && uses.length) {
      const i = sub[1].startsWith(INSTEAD) ? INSTEAD.length : 0;
      uses[uses.length - 1].instead = sub[1].slice(i);
      continue;
    }
    const m = line.match(/^- (?:\[([^\]]*)\] )?(.*)$/);
    if (!m) continue;
    const marks = (m[1] ?? "").split(" · ").map((s) => s.trim());
    uses.push({
      text: m[2],
      known: marks.map((s) => KNOWN_OF[s]).find(Boolean) ?? "guess",
      holds: marks.map((s) => HOLDS_OF[s]).find(Boolean) ?? "",
      by: marks.includes(RECORD) ? "garden" : "you",
      kept: !marks.includes(HOLLOW),
      instead: "",
    });
  }
  const through = sec("what would come through")
    .split("\n")
    .map((l) => l.match(/^- (?:\[(came through|did not come)\] )?(.*)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({
      text: m[2],
      came:
        m[1] === "came through" ? "came" : m[1] === "did not come" ? "not" : "",
    }));
  const calls = sec("the calls")
    .split("\n")
    .map((l) =>
      l.match(
        /^- (\d{4}-\d{2}-\d{2}): (kept|moved|taken down|down for a while|put back up)(?: until (\d{4}-\d{2}-\d{2}))?( · before a use was found)?(?: — (.*))?$/,
      ),
    )
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({
      on: m[1],
      call: CALL_OF[m[2]],
      until: m[3] ?? "",
      unseen: Boolean(m[4]),
      note: m[5] ?? "",
    }));
  // A file edited by hand may carry a bare date or a bare year, which YAML reads as a
  // Date or a number; both are taken back as the text the person wrote.
  const text = (v: unknown) =>
    v instanceof Date
      ? v.toISOString().slice(0, 10)
      : typeof v === "number"
        ? String(v)
        : v;
  return validateFence({
    slug,
    put: text(data.put),
    touched: text(data.touched),
    fence: sec("the fence"),
    cost: sec("what it costs"),
    maker: data.maker,
    by: text(data.by),
    when: text(data.when),
    uses,
    through,
    back: data.back,
    backHow: sec("putting it back"),
    calls,
    after: sec("afterwards"),
    stone: data.stone ?? null,
  });
}

const ID = /^[a-z0-9]{1,24}$/;
const oneOf = <T extends string>(v: unknown, xs: readonly T[], or: T): T =>
  (xs as readonly string[]).includes(String(v)) ? (v as T) : or;

export function validateFence(input: unknown): Fence {
  const r = (input ?? {}) as Record<string, unknown>;
  const fence = str(r.fence, 300);
  if (!fence) throw new Error("a fence needs what it is, in a line");
  const today = new Date().toISOString().slice(0, 10);
  const put = day(r.put, today);
  const list = (v: unknown) =>
    (Array.isArray(v) ? v : []).slice(0, 12) as Record<string, unknown>[];
  const uses: Use[] = list(r.uses)
    .filter((u) => str(u.text, 400))
    .map((u, i) => ({
      id: typeof u.id === "string" && ID.test(u.id) ? u.id : `u${i + 1}`,
      text: str(u.text, 400),
      known: oneOf(u.known, KNOWN, "guess"),
      holds: oneOf(u.holds, ["", ...HOLDS] as Holds[], ""),
      instead: str(u.instead, 200),
      by: u.by === "garden" ? ("garden" as const) : ("you" as const),
      kept: u.kept !== false,
    }));
  const through: Through[] = list(r.through)
    .filter((t) => str(t.text, 200))
    .map((t, i) => ({
      id: typeof t.id === "string" && ID.test(t.id) ? t.id : `t${i + 1}`,
      text: str(t.text, 200),
      came: oneOf(t.came, ["", "came", "not"] as Came[], ""),
    }));
  // A call of no kind the sheet knows is dropped rather than read as some other call.
  // Same-day calls keep the order they were made in: the sort is stable.
  const calls: Call[] = (Array.isArray(r.calls) ? r.calls : [])
    .slice(0, 30)
    .filter((c: Record<string, unknown>) =>
      (CALL_KINDS as string[]).includes(String(c?.call)),
    )
    .map((c: Record<string, unknown>) => {
      const call = c.call as CallKind;
      return {
        on: day(c.on, put),
        call,
        until: call === "trial" ? day(c.until, "") : "",
        note: str(c.note, 400),
        unseen: (call === "down" || call === "trial") && c.unseen === true,
      };
    })
    .sort((a, b) => (a.on < b.on ? -1 : a.on > b.on ? 1 : 0));
  const f: Fence = {
    slug: str(r.slug, 120),
    put,
    touched: day(r.touched, put),
    fence,
    cost: long(r.cost, 2000),
    maker: oneOf(r.maker, ["", ...MAKERS] as Maker[], ""),
    by: str(r.by, 200),
    when: str(r.when, 80),
    uses,
    through,
    back: oneOf(r.back, ["", ...BACKS] as Back[], ""),
    backHow: long(r.backHow, 600),
    calls,
    after: long(r.after, 2000),
    stone: str(r.stone, 200) || null,
  };
  if (!f.slug) f.slug = slugOf(f.fence, f.put);
  return f;
}

export const slugOf = datedSlug;
