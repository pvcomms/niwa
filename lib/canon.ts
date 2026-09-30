import matter from "gray-matter";
import { slugOf as datedSlug } from "./way.ts";

/**
 * The canon: which stories the garden actually tells. The method is the one
 * the Epistemic Garden used to find a community's canon in its archive —
 * take the things most reached for, gather what quotes each and what reads
 * like it, and ask of every strand whether it is one story, whether the idea
 * moved along it, and whether it is of use; then mark the touchpoints — and
 * it is turned over to the reader. The garden counts who reaches for a
 * stone and gathers the strand; which strands are canon, what the story is
 * and which stones carry it are the reader's to say. A stone's count is how
 * many stones reach for it, not how much it matters; kin by words is a
 * likeness of vocabulary, drawn with the words it rests on; a touchpoint the
 * garden offers is hollow until it is kept.
 */

export type How = "links" | "names" | "term" | "twin" | "kin";
export const HOWS: How[] = ["links", "names", "term", "twin", "kin"];
export const HOW_LABEL: Record<How, string> = {
  links: "links to it",
  names: "names it",
  term: "uses the term",
  twin: "the same piece elsewhere",
  kin: "kin by words",
};
/** The same, said of more than one: "4 link to it". */
export const HOW_MANY: Record<How, string> = {
  links: "link to it",
  names: "name it",
  term: "use the term",
  twin: "the same piece elsewhere",
  kin: "kin by words",
};
/** A written link says more than a name in passing, which says more than a shared term. */
export const HOW_RANK: Record<How, number> = {
  links: 0,
  names: 1,
  term: 2,
  twin: 3,
  kin: 4,
};
/** The ways a stone reaches for another; kin by words is likeness, not reaching. */
export const reaches = (h: How) =>
  h === "links" || h === "names" || h === "term";

/** A stone must be reached for by at least this many to be offered as a root. */
export const MIN_REACHED = 3;
/** The roots offered, most reached-for first — the Epistemic Garden took a hundred. */
export const ROOTS_MAX = 100;
/** Kin by words, at most, and never below this likeness (cosine on the garden's tf-idf). */
export const KIN_MAX = 5;
export const KIN_FLOOR = 0.05;
/** The touchpoints a strand can carry: ten, as the method had it. */
export const TOUCH_MAX = 10;

/** When a stone arrived: the day its file first appears in history, or only its last change. */
export type Dated = { day: string | null; approx: boolean };

export type Stone = {
  id: string;
  label: string;
  kind: string;
  day: string | null;
  /** Dated only by its last change, not by when it first appeared. */
  approx: boolean;
  /** How many stones reach for it. */
  reached: number;
};

export type Member = Stone & {
  how: How;
  /** Kin only: the words it shares with the root, heaviest first. */
  shared: string[];
  /** How many other stones in the strand it is threaded to, the root not counted. */
  threads: number;
};

export type Root = Stone & {
  by: { links: number; names: number; term: number };
};

export type Strand = {
  root: Stone;
  members: Member[];
  /** Threads between the strand's stones, the root not counted. */
  threads: number;
  /** The builds the strand reaches: repos pointed at by the root or a member. */
  builds: string[];
};

/* ── touchpoints the garden can offer ──────────────────────────────────── */

export type Proposal = { id: string; because: string };

/**
 * Which stones to ask about as touchpoints. The statistics choose only which
 * to ask: the first on record, the latest, the ones reached for elsewhere
 * too, the ones threaded to others in the strand. Each comes with its
 * because, and each is hollow until the reader keeps it.
 */
export function proposals(
  members: {
    id: string;
    day: string | null;
    approx: boolean;
    reached: number;
    threads?: number;
  }[],
  skip: Set<string>,
  n = 5,
): Proposal[] {
  const pool = members.filter((m) => !skip.has(m.id));
  const out = new Map<string, string[]>();
  const add = (id: string | undefined, because: string) => {
    if (!id) return;
    const b = out.get(id);
    if (b) b.push(because);
    else out.set(id, [because]);
  };
  const dated = pool
    .filter((m) => m.day && !m.approx)
    .sort((a, b) => (a.day! < b.day! ? -1 : 1));
  if (dated.length)
    add(dated[0].id, `the first on record, ${dayWords(dated[0].day!)}`);
  if (dated.length > 1)
    add(dated.at(-1)!.id, `the latest, ${dayWords(dated.at(-1)!.day!)}`);
  for (const m of pool
    .filter((m) => m.reached >= 2)
    .sort((a, b) => b.reached - a.reached)
    .slice(0, 2))
    add(m.id, `${m.reached} stones reach for it too`);
  const threaded = pool
    .filter((m) => (m.threads ?? 0) >= 2)
    .sort((a, b) => (b.threads ?? 0) - (a.threads ?? 0))[0];
  if (threaded)
    add(threaded.id, `threaded to ${threaded.threads} others in the strand`);
  return [...out]
    .slice(0, n)
    .map(([id, because]) => ({ id, because: because.join(" · ") }));
}

/* ── what is kept ──────────────────────────────────────────────────────── */

export type One = "" | "one" | "many" | "none";
export type Moved = "" | "moved" | "held" | "unsure";
export type Use = "" | "use" | "notyet" | "unsure";
export type Call = "" | "in" | "out";

export const ONES: Exclude<One, "">[] = ["one", "many", "none"];
export const MOVEDS: Exclude<Moved, "">[] = ["moved", "held", "unsure"];
export const USES: Exclude<Use, "">[] = ["use", "notyet", "unsure"];
export const ONE_LABEL: Record<Exclude<One, "">, string> = {
  one: "one story",
  many: "more than one",
  none: "not a story",
};
export const MOVED_LABEL: Record<Exclude<Moved, "">, string> = {
  moved: "it moved",
  held: "it held still",
  unsure: "can't tell",
};
export const USE_LABEL: Record<Exclude<Use, "">, string> = {
  use: "of use",
  notyet: "not yet",
  unsure: "can't tell",
};
export const CALL_LABEL: Record<Exclude<Call, "">, string> = {
  in: "in the canon",
  out: "left out",
};

/** A stone as it stood in the strand when it was kept. */
export type Kept = {
  id: string;
  label: string;
  how: How;
  day: string | null;
  approx: boolean;
  /** Kept as a touchpoint. */
  touch: boolean;
  /** Struck from the story by the reader. */
  out: boolean;
};

export type Canon = {
  slug: string;
  put: string;
  touched: string;
  /** The strand in the reader's words; the root's name until they write one. */
  name: string;
  root: {
    id: string;
    label: string;
    kind: string;
    day: string | null;
    approx: boolean;
  };
  members: Kept[];
  one: One;
  moved: Moved;
  use: Use;
  oneNote: string;
  movedNote: string;
  useNote: string;
  /** What the story is, in the reader's words. */
  story: string;
  call: Call;
  /** The day of the call. */
  called: string;
  /** As the strand stood when last kept. */
  threads: number;
  builds: string[];
};

export const canonFrom = (s: Strand, day: string): Canon => ({
  slug: "",
  put: day,
  touched: day,
  name: s.root.label,
  root: {
    id: s.root.id,
    label: s.root.label,
    kind: s.root.kind,
    day: s.root.day,
    approx: s.root.approx,
  },
  members: s.members.map((m) => ({
    id: m.id,
    label: m.label,
    how: m.how,
    day: m.day,
    approx: m.approx,
    touch: false,
    out: false,
  })),
  one: "",
  moved: "",
  use: "",
  oneNote: "",
  movedNote: "",
  useNote: "",
  story: "",
  call: "",
  called: "",
  threads: s.threads,
  builds: s.builds,
});

/** Mark a stone a touchpoint, or not. A touchpoint past the tenth is refused; a struck stone is put back first. */
export function toggleTouch(c: Canon, id: string): Canon {
  const m = c.members.find((x) => x.id === id);
  if (!m) return c;
  if (!m.touch && c.members.filter((x) => x.touch).length >= TOUCH_MAX)
    return c;
  return {
    ...c,
    members: c.members.map((x) =>
      x.id === id ? { ...x, touch: !x.touch, out: x.touch ? x.out : false } : x,
    ),
  };
}

/** Strike a stone from the story, or put it back. A struck stone is no touchpoint. */
export const toggleOut = (c: Canon, id: string): Canon => ({
  ...c,
  members: c.members.map((x) =>
    x.id === id ? { ...x, out: !x.out, touch: x.out ? x.touch : false } : x,
  ),
});

/** What reaches for the root now that did not when the strand was kept, and what no longer does. */
export function sinceKept(
  c: Canon,
  s: Strand,
): { joined: Member[]; gone: Kept[] } {
  const was = new Set(
    c.members.filter((m) => m.how !== "kin").map((m) => m.id),
  );
  const now = new Set(
    s.members.filter((m) => m.how !== "kin").map((m) => m.id),
  );
  return {
    joined: s.members.filter((m) => m.how !== "kin" && !was.has(m.id)),
    gone: c.members.filter((m) => m.how !== "kin" && !now.has(m.id)),
  };
}

/** Take the stones that joined since into the kept strand, unmarked; the ones that left stay, as they were kept. */
export const takeIn = (c: Canon, joined: Member[]): Canon => ({
  ...c,
  members: [
    ...c.members,
    ...joined
      .filter((m) => !c.members.some((x) => x.id === m.id))
      .map((m) => ({
        id: m.id,
        label: m.label,
        how: m.how,
        day: m.day,
        approx: m.approx,
        touch: false,
        out: false,
      })),
  ],
});

/* ── days ──────────────────────────────────────────────────────────────── */

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MON = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
export const dayWords = (d: string): string =>
  DAY.test(d) ? `${+d.slice(8, 10)} ${MON[+d.slice(5, 7) - 1]}` : d;
export const dayYear = (d: string): string =>
  DAY.test(d) ? `${dayWords(d)} ${d.slice(0, 4)}` : d;
const utc = (d: string) =>
  Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
export const daysBetween = (a: string, b: string) =>
  DAY.test(a) && DAY.test(b) ? Math.round((utc(b) - utc(a)) / 86_400_000) : 0;

/** The first and last day on record among the root and the stones not struck. */
export function spanOf(c: Canon): {
  first: string | null;
  last: string | null;
  approx: number;
  undated: number;
  /** The day most of them share, when four or more first appear on it. */
  crowded: { day: string; n: number } | null;
} {
  const all = [
    { day: c.root.day, approx: c.root.approx },
    ...c.members.filter((m) => !m.out),
  ];
  const days = all
    .filter((x) => x.day)
    .map((x) => x.day!)
    .sort();
  return {
    first: days[0] ?? null,
    last: days.at(-1) ?? null,
    approx: all.filter((x) => x.day && x.approx).length,
    undated: all.filter((x) => !x.day).length,
    crowded: crowdedDay(days),
  };
}

/** The day four or more share, the most shared first; a folder planted at once looks like this. */
function crowdedDay(days: string[]): { day: string; n: number } | null {
  const c = new Map<string, number>();
  for (const d of days) c.set(d, (c.get(d) ?? 0) + 1);
  let best: { day: string; n: number } | null = null;
  for (const [day, k] of c)
    if (k >= 4 && (!best || k > best.n || (k === best.n && day < best.day)))
      best = { day, n: k };
  return best;
}

/* ── the readings ──────────────────────────────────────────────────────── */

const n = (k: number, one: string, many = `${one}s`) =>
  `${k} ${k === 1 ? one : many}`;
const clip = (s: string, max: number) =>
  s.length <= max ? s : `${s.slice(0, max).replace(/\s+\S*$/, "")}…`;
const names = (xs: { label: string }[], max = 3) =>
  xs.length <= max
    ? xs.map((x) => x.label).join(", ")
    : `${xs
        .slice(0, max)
        .map((x) => x.label)
        .join(", ")} and ${xs.length - max} more`;

/** Facts about one strand, in the order the sheet asks for them; never a verdict. */
export function readings(
  c: Canon,
  since?: { joined: { label: string }[]; gone: { label: string }[] } | null,
): string[] {
  const reaching = c.members.filter((m) => m.how !== "kin");
  const counts = (["links", "names", "term", "twin"] as const)
    .map((h) => [h, reaching.filter((m) => m.how === h).length] as const)
    .filter(([, k]) => k)
    .map(([h, k]) => `${k} ${k === 1 ? HOW_LABEL[h] : HOW_MANY[h]}`);
  const kin = c.members.length - reaching.length;
  const out = [
    `grown from ${c.root.label} · ${n(reaching.length, "stone")} reach for it${counts.length ? ` (${counts.join(", ")})` : ""} · ${kin} kin by words`,
  ];
  const s = spanOf(c);
  if (s.first && s.last) {
    const d = daysBetween(s.first, s.last);
    out.push(
      `first on record ${dayYear(s.first)} · the latest ${dayYear(s.last)} · ${n(d, "day")} between` +
        (s.approx ? ` · ${s.approx} dated only by their last change` : "") +
        (s.undated ? ` · ${s.undated} undated` : ""),
    );
    if (s.crowded)
      out.push(
        `${s.crowded.n} of them first appear on the same day, ${dayYear(s.crowded.day)}`,
      );
  } else out.push("no day on record for any of it");
  out.push(
    c.threads
      ? `the strand's stones thread each other ${n(c.threads, "time")}, the root not counted`
      : "the strand's stones do not thread each other, the root not counted",
  );
  out.push(
    c.builds.length
      ? `put to work: ${n(c.builds.length, "build")} reached from the strand — ${c.builds.slice(0, 4).join(", ")}${c.builds.length > 4 ? ` and ${c.builds.length - 4} more` : ""}`
      : "no build reached from the strand",
  );
  const touch = c.members.filter((m) => m.touch).length;
  const struck = c.members.filter((m) => m.out).length;
  out.push(
    `${n(touch, "touchpoint")} of at most ${TOUCH_MAX}${struck ? ` · ${struck} struck from the story` : ""}`,
  );
  const said = (q: string, mark: string, note: string) =>
    mark
      ? `${q} ${mark}${note.trim() ? ` — ${clip(note.trim(), 90)}` : ""}`
      : `${q} not said yet`;
  out.push(said("one story?", c.one ? ONE_LABEL[c.one] : "", c.oneNote));
  out.push(
    said("did it move?", c.moved ? MOVED_LABEL[c.moved] : "", c.movedNote),
  );
  out.push(said("of use?", c.use ? USE_LABEL[c.use] : "", c.useNote));
  out.push(
    c.call === "in"
      ? `in the canon since ${dayWords(c.called)}`
      : c.call === "out"
        ? `left out ${dayWords(c.called)}`
        : "not called yet",
  );
  if (since) {
    if (!since.joined.length && !since.gone.length)
      out.push(
        "since it was kept: nothing has come to reach for it or stopped",
      );
    else
      out.push(
        `since it was kept: ${[
          since.joined.length
            ? `${since.joined.length} more reach for it — ${names(since.joined)}`
            : "",
          since.gone.length
            ? `${since.gone.length} no longer ${since.gone.length === 1 ? "does" : "do"} — ${names(since.gone)}`
            : "",
        ]
          .filter(Boolean)
          .join(" · ")}`,
      );
  }
  return out;
}

export type Tally = {
  n: number;
  in: number;
  out: number;
  open: number;
  touch: number;
  /** Distinct stones, root included, held in strands called in and not struck. */
  held: number;
  /** Roots that have a strand looked at. */
  looked: number;
};

export function tally(canon: Canon[], roots: { id: string }[]): Tally {
  const held = new Set<string>();
  for (const c of canon)
    if (c.call === "in") {
      held.add(c.root.id);
      for (const m of c.members) if (!m.out) held.add(m.id);
    }
  const seen = new Set(canon.map((c) => c.root.id));
  return {
    n: canon.length,
    in: canon.filter((c) => c.call === "in").length,
    out: canon.filter((c) => c.call === "out").length,
    open: canon.filter((c) => !c.call).length,
    touch: canon.reduce(
      (s, c) => s + c.members.filter((m) => m.touch).length,
      0,
    ),
    held: held.size,
    looked: roots.filter((r) => seen.has(r.id)).length,
  };
}

/** Facts about the canon as a whole; none a verdict on a strand or the reader. */
export function recordReadings(
  t: Tally,
  roots: number,
  corpus: number,
): string[] {
  const out: string[] = [];
  if (!t.n) out.push("no strand looked at yet");
  else {
    out.push(
      `${n(t.n, "strand")} looked at · ${t.in} in the canon · ${t.out} left out · ${t.open} not called`,
    );
    out.push(`${n(t.touch, "touchpoint")} kept across them`);
    if (corpus)
      out.push(
        `${n(t.held, "stone")} of the garden's ${corpus} held in strands in the canon`,
      );
  }
  if (roots)
    out.push(
      `of the ${roots} stones reached for by ${MIN_REACHED} or more, ${t.looked} ${t.looked === 1 ? "has" : "have"} a strand looked at`,
    );
  return out;
}

/* ── the file ──────────────────────────────────────────────────────────── */

const y = (s: string | null) => JSON.stringify(s);
const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
const long = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const dayOr = (v: unknown, or: string) =>
  typeof v === "string" && DAY.test(v) ? v : or;
const oneOf = <T extends string>(v: unknown, xs: readonly T[], or: T): T =>
  (xs as readonly string[]).includes(String(v)) ? (v as T) : or;
/** An id or label: one line, no backtick (the file quotes ids in backticks). */
const token = (v: unknown, max: number) => str(v, max).replace(/`/g, "'");

const HOW_OF = Object.fromEntries(HOWS.map((h) => [HOW_LABEL[h], h])) as Record<
  string,
  How
>;
const TOUCH = "touchpoint";
const STRUCK = "struck";
const UNDATED = "undated";

const dayMark = (day: string | null, approx: boolean) =>
  day ? `${approx ? "~" : ""}${day}` : UNDATED;

const memberLine = (m: Kept) =>
  `- [${[HOW_LABEL[m.how], dayMark(m.day, m.approx), m.touch ? TOUCH : "", m.out ? STRUCK : ""].filter(Boolean).join(" · ")}] ${m.label} \`${m.id}\``;

export function serialiseCanon(c: Canon): string {
  const fm = [
    `put: ${y(c.put)}`,
    `touched: ${y(c.touched)}`,
    `root: ${y(c.root.id)}`,
    `root_label: ${y(c.root.label)}`,
    `root_kind: ${y(c.root.kind)}`,
    `root_day: ${y(c.root.day ? dayMark(c.root.day, c.root.approx) : null)}`,
  ];
  if (c.call) fm.push(`call: ${c.call}`, `called: ${y(c.called)}`);
  if (c.one) fm.push(`one: ${c.one}`);
  if (c.moved) fm.push(`moved: ${c.moved}`);
  if (c.use) fm.push(`use: ${c.use}`);
  fm.push(`threads: ${c.threads}`, `builds: ${JSON.stringify(c.builds)}`);
  const body = [`## the strand\n\n${c.name.trim()}`];
  if (c.story.trim()) body.push(`## the story\n\n${c.story.trim()}`);
  if (c.members.length)
    body.push(`## the stones\n\n${c.members.map(memberLine).join("\n")}`);
  if (c.oneNote.trim()) body.push(`## one story\n\n${c.oneNote.trim()}`);
  if (c.movedNote.trim()) body.push(`## how it moved\n\n${c.movedNote.trim()}`);
  if (c.useNote.trim()) body.push(`## of use\n\n${c.useNote.trim()}`);
  return `---\n${fm.join("\n")}\n---\n\n${body.join("\n\n")}\n`;
}

const readDay = (v: unknown): { day: string | null; approx: boolean } => {
  const s =
    v instanceof Date
      ? v.toISOString().slice(0, 10)
      : typeof v === "string"
        ? v.trim()
        : "";
  const approx = s.startsWith("~");
  const d = approx ? s.slice(1) : s;
  return DAY.test(d) ? { day: d, approx } : { day: null, approx: false };
};

export function parseCanon(slug: string, raw: string): Canon {
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
  const members = sec("the stones")
    .split("\n")
    .map((l) => l.match(/^- (?:\[([^\]]*)\] )?(.*?)\s*`([^`]+)`\s*$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => {
      const marks = (m[1] ?? "").split(" · ").map((s) => s.trim());
      const d = marks.map(readDay).find((x) => x.day) ?? {
        day: null,
        approx: false,
      };
      return {
        id: m[3],
        label: m[2] || m[3],
        how: marks.map((s) => HOW_OF[s]).find(Boolean) ?? "links",
        day: d.day,
        approx: d.approx,
        touch: marks.includes(TOUCH),
        out: marks.includes(STRUCK),
      };
    });
  const rd = readDay(data.root_day);
  const text = (v: unknown) =>
    v instanceof Date ? v.toISOString().slice(0, 10) : v;
  return validateCanon({
    slug,
    put: text(data.put),
    touched: text(data.touched),
    name: sec("the strand"),
    root: {
      id: data.root,
      label: data.root_label,
      kind: data.root_kind,
      day: rd.day,
      approx: rd.approx,
    },
    members,
    one: data.one,
    moved: data.moved,
    use: data.use,
    oneNote: sec("one story"),
    movedNote: sec("how it moved"),
    useNote: sec("of use"),
    story: sec("the story"),
    call: data.call,
    called: text(data.called),
    threads: data.threads,
    builds: data.builds,
  });
}

export function validateCanon(input: unknown): Canon {
  const r = (input ?? {}) as Record<string, unknown>;
  const root = (r.root ?? {}) as Record<string, unknown>;
  const rootId = token(root.id, 200);
  if (!rootId) throw new Error("a strand needs the stone it grew from");
  const today = new Date().toISOString().slice(0, 10);
  const put = dayOr(r.put, today);
  const rootLabel = token(root.label, 200) || rootId;
  const name = str(r.name, 200) || rootLabel;
  let touches = 0;
  const seen = new Set<string>();
  const members: Kept[] = [];
  for (const m of Array.isArray(r.members) ? r.members.slice(0, 80) : []) {
    const x = (m ?? {}) as Record<string, unknown>;
    const id = token(x.id, 200);
    if (!id || seen.has(id) || id === rootId) continue;
    seen.add(id);
    const out = x.out === true;
    const touch = x.touch === true && !out && touches < TOUCH_MAX;
    if (touch) touches++;
    const d = readDay(x.day);
    members.push({
      id,
      label: token(x.label, 200) || id,
      how: oneOf(x.how, HOWS, "links"),
      day: d.day,
      approx: d.day ? x.approx === true || d.approx : false,
      touch,
      out,
    });
  }
  const call = oneOf(r.call, ["", "in", "out"] as const, "");
  const rd = readDay(root.day);
  const c: Canon = {
    slug: str(r.slug, 100),
    put,
    touched: dayOr(r.touched, put),
    name,
    root: {
      id: rootId,
      label: rootLabel,
      kind: str(root.kind, 40) || "note",
      day: rd.day,
      approx: rd.day ? root.approx === true || rd.approx : false,
    },
    members,
    one: oneOf(r.one, ["", ...ONES] as const, ""),
    moved: oneOf(r.moved, ["", ...MOVEDS] as const, ""),
    use: oneOf(r.use, ["", ...USES] as const, ""),
    oneNote: long(r.oneNote, 2000),
    movedNote: long(r.movedNote, 2000),
    useNote: long(r.useNote, 2000),
    story: long(r.story, 6000),
    call,
    called: call ? dayOr(r.called, today) : "",
    threads:
      typeof r.threads === "number" && Number.isFinite(r.threads)
        ? Math.max(0, Math.round(r.threads))
        : 0,
    builds: Array.isArray(r.builds)
      ? r.builds
          .map((b) => str(b, 120))
          .filter(Boolean)
          .slice(0, 40)
      : [],
  };
  if (!c.slug) c.slug = slugOf(c.name, c.put);
  return c;
}

export const slugOf = datedSlug;
