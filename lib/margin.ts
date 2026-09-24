import matter from "gray-matter";

/**
 * The margin: what the reader says to themselves while looking at the garden.
 * A note is a moment, the view it was made in, that view's address, whatever
 * was on the desk at the time, and the words — typed, spoken, or spoken and
 * later written out. Nothing here weighs a note; the tally counts and the
 * readings say what was counted.
 */

export type About = { kind: string; id: string; label: string };

export type Note = {
  /** `YYYYMMDD-HHMMSS-salt`, local time; also the file's name. */
  id: string;
  /** ISO with the machine's offset: `2026-09-24T21:41:08+02:00`. */
  at: string;
  /** The view's path: `/alarm`. */
  view: string;
  /** The view's whole address at the time: `/alarm?id=the-open-plan-job`. */
  url: string;
  /** What was on the desk — a stone, a pathway, an entry — or nothing. */
  about: About | null;
  /** The typed words. */
  text: string;
  /** The voice note's file name, beside the note, or null. */
  audio: string | null;
  seconds: number | null;
  /** The voice note written out, once the reader asked for it. */
  said: string | null;
};

export const VIEW_NAME: Record<string, string> = {
  "/": "garden",
  "/catalogue": "catalogue",
  "/bearing": "bearing",
  "/distribution": "distribution",
  "/flow": "flow",
  "/course": "course",
  "/chronology": "chronology",
  "/alarm": "alarm",
  "/way": "way",
  "/margin": "margin",
  "/provenance": "provenance",
  "/notice": "notice",
};

export const viewName = (view: string): string =>
  VIEW_NAME[view] ?? (view.replace(/^\//, "") || "garden");

export const ID = /^[0-9]{8}-[0-9]{6}-[a-z0-9]{2,6}$/;
export const AUDIO = /^[0-9]{8}-[0-9]{6}-[a-z0-9]{2,6}\.(m4a|webm|ogg|wav|mp3)$/;
const VIEW = /^\/[a-z0-9/-]*$/;

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** The moment as the machine keeps it: local time with its offset, so the day is the reader's day. */
export function localIso(d: Date): string {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const a = Math.abs(off);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`
  );
}

export function idOf(d: Date, salt: string): string {
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${salt}`
  );
}

export const dayOf = (at: string) => at.slice(0, 10);
export const timeOf = (at: string) => at.slice(11, 16);

const MONTHS = [
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
];

/** `19 Sep`, or `19 Sep 2025` when it is not this year. */
export function dayWords(at: string, now: string): string {
  const y = at.slice(0, 4);
  const m = MONTHS[Number(at.slice(5, 7)) - 1] ?? at.slice(5, 7);
  const d = Number(at.slice(8, 10));
  return y === now.slice(0, 4) ? `${d} ${m}` : `${d} ${m} ${y}`;
}

/** The audio container the recorder produced, as a file extension. */
export function extOf(mime: string): "m4a" | "webm" | "ogg" | "wav" | "mp3" {
  const m = mime.toLowerCase();
  if (m.includes("mp4") || m.includes("aac") || m.includes("m4a")) return "m4a";
  if (m.includes("webm")) return "webm";
  if (m.includes("ogg") || m.includes("opus")) return "ogg";
  if (m.includes("wav")) return "wav";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  return "webm";
}

export const MIME: Record<string, string> = {
  m4a: "audio/mp4",
  webm: "audio/webm",
  ogg: "audio/ogg",
  wav: "audio/wav",
  mp3: "audio/mpeg",
};

export const aboutKey = (a: About | null): string | null =>
  a ? `${a.kind}:${a.id}` : null;

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

export function validateAbout(input: unknown): About | null {
  if (!input || typeof input !== "object") return null;
  const a = input as Record<string, unknown>;
  const kind = str(a.kind, 40);
  const id = str(a.id, 400);
  const label = str(a.label, 300);
  if (!kind || !id || !label) return null;
  return { kind, id, label };
}

/** A note as it may be kept. The words may be typed, spoken, or both; never neither. */
export function validateNote(input: unknown, id: string, at: string): Note {
  if (!ID.test(id)) throw new Error("bad id");
  const n = (input ?? {}) as Record<string, unknown>;
  let view = str(n.view, 80);
  if (!VIEW.test(view)) view = "/";
  let url = str(n.url, 2000);
  if (!url.startsWith(view)) url = view;
  const text = str(n.text, 20000);
  const audio = str(n.audio, 80) || null;
  if (audio && !AUDIO.test(audio)) throw new Error("bad audio name");
  const secondsRaw = Number(n.seconds);
  const seconds =
    audio && Number.isFinite(secondsRaw)
      ? Math.max(0, Math.min(3600, Math.round(secondsRaw * 10) / 10))
      : null;
  const said = audio ? str(n.said, 20000) || null : null;
  if (!text && !audio) throw new Error("nothing to keep");
  return {
    id,
    at,
    view,
    url,
    about: validateAbout(n.about),
    text,
    audio,
    seconds,
    said,
  };
}

// ── the file ───────────────────────────────────────────────────────────────

export function parseNote(id: string, raw: string): Note {
  const { data, content } = matter(raw);
  // The heading may be the first thing in the body, when nothing was typed.
  const m = /(^|\n)## said\n/.exec(content);
  const text = (m ? content.slice(0, m.index) : content).trim();
  const said = m ? content.slice(m.index + m[0].length).trim() || null : null;
  const at = typeof data.at === "string" ? data.at : String(data.at ?? "");
  const audio = typeof data.audio === "string" ? data.audio : null;
  return {
    id,
    at,
    view: typeof data.view === "string" ? data.view : "/",
    url: typeof data.url === "string" ? data.url : "/",
    about: validateAbout(data.about),
    text,
    audio,
    seconds:
      audio && typeof data.seconds === "number" ? data.seconds : null,
    said: audio ? said : null,
  };
}

const q = (s: string) => JSON.stringify(s);

export function serialiseNote(n: Note): string {
  const lines = [
    "---",
    `at: ${q(n.at)}`,
    `view: ${q(n.view)}`,
    `url: ${q(n.url)}`,
  ];
  if (n.about) {
    lines.push("about:");
    lines.push(`  kind: ${q(n.about.kind)}`);
    lines.push(`  id: ${q(n.about.id)}`);
    lines.push(`  label: ${q(n.about.label)}`);
  }
  if (n.audio) {
    lines.push(`audio: ${q(n.audio)}`);
    if (n.seconds !== null) lines.push(`seconds: ${n.seconds}`);
  }
  lines.push("---", "");
  let out = `${lines.join("\n")}\n`;
  if (n.text) out += `${n.text}\n`;
  if (n.audio && n.said) out += `${n.text ? "\n" : ""}## said\n\n${n.said}\n`;
  return out;
}

// ── reading the margin back ────────────────────────────────────────────────

export type Filter = {
  view?: string | null;
  about?: string | null;
  q?: string;
};

export function filterNotes(notes: Note[], f: Filter): Note[] {
  const q = (f.q ?? "").trim().toLowerCase();
  return notes.filter((n) => {
    if (f.view && n.view !== f.view) return false;
    if (f.about && aboutKey(n.about) !== f.about) return false;
    if (!q) return true;
    const hay = [n.text, n.said ?? "", n.about?.label ?? "", viewName(n.view)]
      .join("\n")
      .toLowerCase();
    return hay.includes(q);
  });
}

/** Newest first, kept in the order given. */
export function byDay(notes: Note[]): { day: string; notes: Note[] }[] {
  const out: { day: string; notes: Note[] }[] = [];
  for (const n of notes) {
    const day = dayOf(n.at);
    const last = out[out.length - 1];
    if (last && last.day === day) last.notes.push(n);
    else out.push({ day, notes: [n] });
  }
  return out;
}

export type Tally = {
  total: number;
  spoken: number;
  written: number;
  both: number;
  unsaid: number;
  days: number;
  first: string | null;
  last: string | null;
  byView: { view: string; n: number }[];
  byAbout: { about: About; n: number }[];
};

export function tally(notes: Note[]): Tally {
  const views = new Map<string, number>();
  const abouts = new Map<string, { about: About; n: number }>();
  const days = new Set<string>();
  let spoken = 0;
  let written = 0;
  let both = 0;
  let unsaid = 0;
  let first: string | null = null;
  let last: string | null = null;
  for (const n of notes) {
    if (n.audio && n.text) both++;
    else if (n.audio) spoken++;
    else written++;
    if (n.audio && !n.said) unsaid++;
    days.add(dayOf(n.at));
    if (first === null || n.at < first) first = n.at;
    if (last === null || n.at > last) last = n.at;
    views.set(n.view, (views.get(n.view) ?? 0) + 1);
    const k = aboutKey(n.about);
    if (k && n.about) {
      const cur = abouts.get(k);
      if (cur) cur.n++;
      else abouts.set(k, { about: n.about, n: 1 });
    }
  }
  return {
    total: notes.length,
    spoken,
    written,
    both,
    unsaid,
    days: days.size,
    first,
    last,
    byView: [...views]
      .map(([view, n]) => ({ view, n }))
      .sort((a, b) => b.n - a.n || (a.view < b.view ? -1 : 1)),
    byAbout: [...abouts.values()].sort(
      (a, b) => b.n - a.n || (a.about.label < b.about.label ? -1 : 1),
    ),
  };
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/** Facts about the margin. Never a grade. */
export function readings(t: Tally, now: string): string[] {
  if (t.total === 0 || !t.first || !t.last)
    return [
      "nothing in the margin yet. from any view, press ' or the tab at the edge, and say what comes to mind.",
    ];
  const words: string[] = [];
  words.push(
    `${plural(t.total, "note")} since ${dayWords(t.first, now)}: ${t.spoken} spoken, ${t.written} written${
      t.both ? `, ${t.both} both` : ""
    }.`,
  );
  words.push(
    t.days === 1
      ? `all on ${dayWords(t.first, now)}; the last at ${timeOf(t.last)}.`
      : `made on ${plural(t.days, "day")}; the last ${dayWords(t.last, now)} at ${timeOf(t.last)}.`,
  );
  const [v0, v1, v2] = t.byView;
  if (v0)
    words.push(
      `most at the ${viewName(v0.view)} (${v0.n})` +
        (v1 ? `, then the ${viewName(v1.view)} (${v1.n})` : "") +
        (v2 ? ` and the ${viewName(v2.view)} (${v2.n})` : "") +
        ".",
    );
  const [a0, a1] = t.byAbout;
  if (a0)
    words.push(
      `most often about ${a0.about.label} (${a0.n})` +
        (a1 ? `, then ${a1.about.label} (${a1.n})` : "") +
        ".",
    );
  if (t.unsaid)
    words.push(`${plural(t.unsaid, "spoken note")} not yet written out.`);
  return words;
}
