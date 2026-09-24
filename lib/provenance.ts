import matter from "gray-matter";
import { formatDay, validDay } from "./chronology.ts";
import type { GardenNode } from "./garden.ts";
import type { Input } from "./course.ts";
import { sentencesOf, slugOf as datedSlug, uid } from "./way.ts";

/**
 * The provenance — how a claim reached the reader. Not whether it is true:
 * no instrument can know that about a claim, and one that pretended to
 * would be a horoscope with a straight face. What a person can know is the
 * chain of custody: every hand the claim passed through before it reached
 * them, what each hand said, on what channel, on what day, what that hand
 * gains if the claim is believed, what it runs on, and what it has said
 * before. The instrument holds that chain in the reader's own words, reads
 * the wordings back as facts — what changed between one hand and the next,
 * which words are certainty, urgency, sides, unnamed authority — and reads
 * the garden for what actually flowed into the belief. A model on this
 * machine can propose questions to put to each hand and checks that would
 * settle the claim; it is never asked whether the claim is so. What is
 * checked is drawn solid; what is not, hollow. Nothing here decides.
 */

export type By = "you" | "proposed";

/** The kind of hand a claim passed through. */
export type Channel =
  | "feed"
  | "post"
  | "press"
  | "text"
  | "talk"
  | "search"
  | "model"
  | "own"
  | "other";

export const CHANNELS: Channel[] = [
  "feed",
  "post",
  "press",
  "text",
  "talk",
  "search",
  "model",
  "own",
  "other",
];

export const CHANNEL_LABEL: Record<Channel, string> = {
  feed: "a feed",
  post: "a post",
  press: "the press",
  text: "a text",
  talk: "someone said",
  search: "a search",
  model: "a model",
  own: "my own eyes",
  other: "somewhere else",
};

/** How the reader knows it — several can be true at once. */
export type Knowing = "saw" | "told" | "read" | "worked-out" | "seems";
export const KNOWINGS: Knowing[] = [
  "saw",
  "told",
  "read",
  "worked-out",
  "seems",
];
export const KNOWING_LABEL: Record<Knowing, string> = {
  saw: "I saw it",
  told: "I was told",
  read: "I read it",
  "worked-out": "I worked it out",
  seems: "it seems so",
};

/** How a check went, once it was made. */
export type Went = "" | "held" | "fell" | "cannot";
export const WENT_LABEL: Record<Went, string> = {
  "": "not yet",
  held: "it held",
  fell: "it fell",
  cannot: "cannot be checked",
};

export type Question = {
  id: string;
  text: string;
  answer: string;
  by: By;
  kept: boolean;
};

/** A change of wording noticed at a hand: what it was before, what it became. */
export type Turn = {
  id: string;
  was: string;
  became: string;
  by: By;
  kept: boolean;
};

/** What the reader saw when they read a hand's link, once, on a press. */
export type Seen = { title: string; host: string; words: string; on: string };

export type Hop = {
  id: string;
  /** who or what carried it — a name, a handle, a masthead */
  who: string;
  channel: Channel;
  /** where — a host, a platform, a room */
  where: string;
  /** the day it reached this hand, or null */
  day: string | null;
  /** the claim as this hand worded it — a quote, verbatim where possible */
  said: string;
  link: string;
  seen: Seen | null;
  /** what this hand gains if the claim is believed — the reader's words */
  gains: string;
  /** what it runs on: who pays it, what it sells */
  runsOn: string;
  /** what the reader knows of this hand's record */
  record: string;
  /** did the wording turn in this hand? the reader's mark; null when not said */
  reframed: boolean | null;
  turns: Turn[];
  asked: Question[];
};

export type Check = {
  id: string;
  /** what would settle the claim */
  text: string;
  /** how — a document to find, a number to look up, a person to ask */
  how: string;
  went: Went;
  /** the day it was made, when it was */
  on: string | null;
  by: By;
  kept: boolean;
};

export type Provenance = {
  slug: string;
  title: string;
  /** the claim as it reached the reader */
  claim: string;
  /** the claim as first said, if the reader has it */
  origin: string;
  /** who first said it, if known */
  originWho: string;
  /** a garden stone bound to it */
  stone: string | null;
  knowing: Knowing[];
  /** first hand first; the last hand is the one that reached the reader */
  hops: Hop[];
  checks: Check[];
  note: string;
  recorded: string;
  touched: string;
};

export type Proposal = {
  checks: { text: string; how: string }[];
  questions: { hop: string; text: string }[];
  turns: { hop: string; was: string; became: string }[];
};

export { uid };

export const emptyHop = (): Hop => ({
  id: uid(),
  who: "",
  channel: "post",
  where: "",
  day: null,
  said: "",
  link: "",
  seen: null,
  gains: "",
  runsOn: "",
  record: "",
  reframed: null,
  turns: [],
  asked: [],
});

export const emptyProvenance = (today: string): Provenance => ({
  slug: "",
  title: "",
  claim: "",
  origin: "",
  originWho: "",
  stone: null,
  knowing: [],
  hops: [],
  checks: [],
  note: "",
  recorded: today,
  touched: today,
});

// ── the wordings, read as facts ───────────────────────────────────────────

export type Family =
  | "certainty"
  | "absolutes"
  | "urgency"
  | "sides"
  | "authority"
  | "reframe"
  | "heat";

export const FAMILIES: Family[] = [
  "certainty",
  "absolutes",
  "urgency",
  "sides",
  "authority",
  "reframe",
  "heat",
];

export const FAMILY_LABEL: Record<Family, string> = {
  certainty: "certainty",
  absolutes: "absolutes",
  urgency: "urgency",
  sides: "sides",
  authority: "unnamed authority",
  reframe: "reframing",
  heat: "heat",
};

/**
 * The words a wording leans on. Each family is a census, not a verdict: the
 * reading says how many and which, and the reader decides what that means.
 */
const PATTERN: Record<Family, RegExp> = {
  certainty:
    /\b(obviously|clearly|undeniabl\w*|no doubt|the truth is|the fact is|proven|proof|definitely|without question|it is known|unquestionabl\w*|100 ?%|guaranteed|plain and simple|period)\b/gi,
  absolutes:
    /\b(always|never|everyone knows|everybody knows|everyone|everybody|nobody|no one|every single|all of them|none of them|the only)\b/gi,
  urgency:
    /\b(breaking|urgent\w*|right now|act now|before it'?s too late|wake up|hurry|last chance|immediately|must (?:see|read|watch|know)|you need to (?:see|know|hear)|this changes everything|time is running out)\b/gi,
  sides:
    /\b(they don'?t want you|the elites?|the establishment|the mainstream media|the media|msm|sheeple|normies|us (?:vs|versus) them|our people|those people|the other side|globalists|the regime|the system|big (?:tech|pharma|media))\b/gi,
  authority:
    /\b(studies show|research shows|science says|experts (?:say|agree|warn)|scientists (?:say|agree|warn)|sources say|people are saying|it has been reported|according to sources|insiders say|many are saying|data shows|the numbers don'?t lie|a (?:new )?study found)\b/gi,
  reframe:
    /\b(so-called|what this really means|in other words|basically|let that sink in|read between the lines|make no mistake|the real (?:story|reason|question|issue)|actually means|translation:|which is to say)\b/gi,
  heat: /\b(outrag\w*|disgust\w*|shocking|terrifying|insane|unbelievable|disgrace\w*|scandal\w*|horrif\w*|destroy\w*|exposed|slammed|humiliat\w*|devastat\w*|catastroph\w*|nightmare)\b/gi,
};

const ATTRIBUTED =
  /\b(according to|citing|cites?|sourced? (?:to|from)|as reported by|as .{2,40}? (?:said|wrote|put it|reports?|found)|per )\b/gi;

export type Census = {
  hits: Record<Family, string[]>;
  n: number;
  /** how many times the wording says where it got this */
  attributed: number;
  /** the names in it — capitalised words not at the start of a sentence */
  named: string[];
  sentences: number;
};

const NOT_NAMES = new Set(
  "I I'm I've I'd I'll The A An And But Or If So It Its This That These Those There Here What Which Who When Where Why How Not No Yes You Your We Our They Their He She His Her My Me Us Them Is Are Was Were Be Been Do Does Did Have Has Had Will Would Can Could Should May Might Must Just Also Even Still Only Then Than As At By For From In Into Of On To With Because While After Before Every Some Any All Most Many Much More Very Too One Two Three Everyone Everybody Nobody Breaking Wake Act".split(
    " ",
  ),
);

export function census(text: string): Census {
  const hits = {} as Record<Family, string[]>;
  let n = 0;
  for (const fam of FAMILIES) {
    const seen = new Set<string>();
    for (const m of text.matchAll(PATTERN[fam])) seen.add(m[1].toLowerCase());
    hits[fam] = [...seen];
    n += hits[fam].length;
  }
  const attributed = [...text.matchAll(ATTRIBUTED)].length;
  const named = new Set<string>();
  for (const s of sentencesOf(text)) {
    const words = s.split(/\s+/);
    for (let i = 1; i < words.length; i++) {
      const w = words[i].replace(/^[("'“‘]+|[)"'”’.,;:!?]+$/g, "");
      if (
        /^[A-Z][A-Za-z'’.-]{1,}$/.test(w) &&
        !NOT_NAMES.has(w) &&
        !/^[A-Z]+$/.test(w)
      )
        named.add(w);
      else if (/^@[A-Za-z0-9_]{2,}$/.test(w)) named.add(w);
    }
  }
  return {
    hits,
    n,
    attributed,
    named: [...named].slice(0, 8),
    sentences: sentencesOf(text).length,
  };
}

const list = (xs: string[]) =>
  xs.length <= 1
    ? xs.join("")
    : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

/** `certainty ×2 (obviously, proven) · urgency ×1 (wake up)` — or nothing. */
export function censusWords(c: Census): string {
  return FAMILIES.filter((f) => c.hits[f].length)
    .map(
      (f) =>
        `${FAMILY_LABEL[f]} ×${c.hits[f].length} (${c.hits[f].slice(0, 4).join(", ")})`,
    )
    .join(" · ");
}

/**
 * The words of a wording, for the drift: a smaller stop list than the way's,
 * because the hedges a reframe removes — could, one, several, first — and
 * the numbers it drops are the substance of the change.
 */
const STOP = new Set(
  "a an the and or but if then than that this these those there here it its i i'm i've i'd my me we our you your he she they them their his her is are was were be been being am do does did done have has had not no nor so as at by for from in into of on to with about over under after before again once also very too just when where why how what which who whom whose because while during through between out up down off".split(
    " ",
  ),
);

export function wordsOf(text: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9'’%-]+/)) {
    const w = raw.replace(/^['’-]+|['’-]+$/g, "");
    if (!w || STOP.has(w)) continue;
    if (!/\d/.test(w) && w.length < 3) continue;
    m.set(w, (m.get(w) ?? 0) + 1);
  }
  return m;
}

/** What the next wording has that the one before did not, and the reverse. */
export function gainedLost(
  next: string,
  prev: string,
): { gained: string[]; lost: string[] } {
  const a = wordsOf(next);
  const b = wordsOf(prev);
  // a number that fell out of a claim is the classic turn, so numbers come first
  const num = (w: string) => (/\d/.test(w) ? 1 : 0);
  const pick = (x: Map<string, number>, y: Map<string, number>) =>
    [...x.entries()]
      .filter(([w]) => !y.has(w))
      .sort(
        (p, q) =>
          q[1] - p[1] ||
          num(q[0]) - num(p[0]) ||
          q[0].length - p[0].length ||
          p[0].localeCompare(q[0]),
      )
      .map(([w]) => w)
      .slice(0, 12);
  return { gained: pick(a, b), lost: pick(b, a) };
}

/** The wordings in the order the claim travelled: the first saying, each hand, then the reader's. */
export function wordings(
  p: Provenance,
): { at: string; label: string; text: string }[] {
  const out: { at: string; label: string; text: string }[] = [];
  if (p.origin.trim())
    out.push({
      at: "origin",
      label: p.originWho.trim() || "the first saying",
      text: p.origin.trim(),
    });
  for (const h of p.hops)
    if (h.said.trim())
      out.push({
        at: h.id,
        label: h.who.trim() || CHANNEL_LABEL[h.channel],
        text: h.said.trim(),
      });
  if (p.claim.trim())
    out.push({ at: "you", label: "as it reached you", text: p.claim.trim() });
  return out;
}

export type Drift = {
  from: string;
  to: string;
  gained: string[];
  lost: string[];
};

/** Between each wording and the next: the words that arrived, the words that went. */
export function driftAlong(p: Provenance): Drift[] {
  const ws = wordings(p);
  const out: Drift[] = [];
  for (let i = 0; i + 1 < ws.length; i++) {
    const { gained, lost } = gainedLost(ws[i + 1].text, ws[i].text);
    out.push({ from: ws[i].at, to: ws[i + 1].at, gained, lost });
  }
  return out;
}

/** The words the arriving claim has that the first saying does not, and the reverse. */
export function drift(p: Provenance): { gained: string[]; lost: string[] } {
  if (!p.origin.trim() || !p.claim.trim()) return { gained: [], lost: [] };
  return gainedLost(p.claim, p.origin);
}

/** Is a hand drawn solid — its link read once, or the reader's own eyes? */
export const checkedHop = (h: Hop) => h.seen !== null || h.channel === "own";

// ── the garden's own evidence ─────────────────────────────────────────────

export type Evidence = {
  stone: { id: string; label: string; kind: string };
  n: number;
  byKind: Record<string, number>;
  own: number;
  read: number;
  code: number;
  unwritten: number;
  hosts: { host: string; n: number }[];
};

const HOST = /https?:\/\/([a-z0-9.-]+\.[a-z]{2,})(?=[/\s"')\]>]|$)/gi;

/** The hosts a text points at, `www.` dropped, most-named first. */
export function hostsIn(texts: string[]): { host: string; n: number }[] {
  const by = new Map<string, number>();
  for (const t of texts)
    for (const m of t.matchAll(HOST)) {
      const h = m[1].toLowerCase().replace(/^www\./, "");
      by.set(h, (by.get(h) ?? 0) + 1);
    }
  return [...by.entries()]
    .map(([host, n]) => ({ host, n }))
    .sort((a, b) => b.n - a.n || a.host.localeCompare(b.host));
}

/**
 * What the garden knows about a belief's provenance: what flowed straight
 * into it, by kind — sorted the way the course sorts it: your own writing,
 * things you read, code, and the unwritten — and which hosts those inputs
 * name. Counts, never weights.
 */
export function evidenceOf(
  stone: GardenNode,
  inputs: Input[],
  nodes: Map<string, GardenNode>,
): Evidence {
  const byKind: Record<string, number> = {};
  let own = 0;
  let read = 0;
  let code = 0;
  let unwritten = 0;
  const texts: string[] = [];
  for (const i of inputs) {
    const n = nodes.get(i.id);
    const k = n?.kind ?? "unknown";
    byKind[k] = (byKind[k] ?? 0) + 1;
    if (k === "ghost") unwritten++;
    else if (k === "reading") read++;
    else if (k === "repo") code++;
    else own++;
    if (n?.body) texts.push(n.body);
    if (n?.description) texts.push(n.description);
  }
  return {
    stone: { id: stone.id, label: stone.label, kind: stone.kind },
    n: inputs.length,
    byKind,
    own,
    read,
    code,
    unwritten,
    hosts: hostsIn(texts).slice(0, 12),
  };
}

// ── the tally and the readings ────────────────────────────────────────────

export type Tally = {
  hands: number;
  dated: number;
  first: string | null;
  checked: number;
  reframed: number;
  turns: number;
  turnsProposed: number;
  gains: number;
  runsOn: number;
  record: number;
  asked: number;
  answered: number;
  askedProposed: number;
  checks: number;
  checksProposed: number;
  held: number;
  fell: number;
  cannot: number;
  byChannel: Record<string, number>;
};

export function tally(p: Provenance): Tally {
  const t: Tally = {
    hands: p.hops.length,
    dated: 0,
    first: null,
    checked: 0,
    reframed: 0,
    turns: 0,
    turnsProposed: 0,
    gains: 0,
    runsOn: 0,
    record: 0,
    asked: 0,
    answered: 0,
    askedProposed: 0,
    checks: 0,
    checksProposed: 0,
    held: 0,
    fell: 0,
    cannot: 0,
    byChannel: {},
  };
  for (const h of p.hops) {
    if (h.day && validDay(h.day)) {
      t.dated++;
      if (!t.first || h.day < t.first) t.first = h.day;
    }
    if (checkedHop(h)) t.checked++;
    if (h.reframed === true) t.reframed++;
    if (h.gains.trim()) t.gains++;
    if (h.runsOn.trim()) t.runsOn++;
    if (h.record.trim()) t.record++;
    for (const q of h.asked) {
      if (q.kept) {
        t.asked++;
        if (q.answer.trim()) t.answered++;
      } else t.askedProposed++;
    }
    for (const u of h.turns) {
      if (u.kept) t.turns++;
      else t.turnsProposed++;
    }
    t.byChannel[h.channel] = (t.byChannel[h.channel] ?? 0) + 1;
  }
  for (const c of p.checks) {
    if (!c.kept) {
      t.checksProposed++;
      continue;
    }
    t.checks++;
    if (c.went === "held") t.held++;
    else if (c.went === "fell") t.fell++;
    else if (c.went === "cannot") t.cannot++;
  }
  return t;
}

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/** Facts about the provenance. None of them is a verdict on the claim. */
export function readings(
  p: Provenance,
  today: string,
  evidence: Evidence | null = null,
): string[] {
  const out: string[] = [];
  if (!p.claim.trim() && !p.hops.length && !p.origin.trim())
    return [
      "put the claim in your own words, as it reached you. then name the hands it came through — the last one first, if that is the one you remember.",
    ];
  const t = tally(p);
  if (p.knowing.length)
    out.push(
      `you know it because: ${list(p.knowing.map((k) => KNOWING_LABEL[k].toLowerCase()))}.`,
    );
  else out.push("you have not said how you know it.");
  if (t.hands) {
    const hands = p.hops.map(
      (h) =>
        `${CHANNEL_LABEL[h.channel]}${h.who.trim() ? ` (${h.who.trim()}${h.where.trim() ? `, ${h.where.trim()}` : ""})` : h.where.trim() ? ` (${h.where.trim()})` : ""}`,
    );
    out.push(
      `${plural(t.hands, "hand")} between the first saying and you: ${list(hands)}.`,
    );
    out.push(
      `${t.dated} of ${t.hands} dated${t.first ? `, the first ${formatDay(t.first)}` : ""} · ${t.checked} read once or seen with your own eyes, ${t.hands - t.checked} not — what is not checked is drawn hollow.`,
    );
  } else
    out.push(
      "no hands named yet — the claim arrived from nowhere you have said.",
    );
  if (p.origin.trim())
    out.push(
      p.originWho.trim()
        ? `the first saying is ${p.originWho.trim()}'s, in their words.`
        : "the first saying is written down; who said it first is not.",
    );
  else
    out.push(
      "the first saying is not written down — the chain begins somewhere you cannot yet see.",
    );
  const d = drift(p);
  if (d.gained.length || d.lost.length) {
    const parts: string[] = [];
    if (d.gained.length)
      parts.push(`gained ${list(d.gained.slice(0, 6).map((w) => `'${w}'`))}`);
    if (d.lost.length)
      parts.push(`lost ${list(d.lost.slice(0, 6).map((w) => `'${w}'`))}`);
    out.push(
      `between the first saying and what reached you, the claim ${parts.join(" and ")}.`,
    );
  }
  if (t.hands)
    out.push(
      `you marked ${plural(t.reframed, "hand")} as turning the wording${t.turns || t.turnsProposed ? `; ${plural(t.turns, "turn")} noted${t.turnsProposed ? `, ${t.turnsProposed} proposed and not yet yours` : ""}` : ""}.`,
    );
  if (p.claim.trim()) {
    const c = census(p.claim);
    const words = censusWords(c);
    out.push(
      `as it reached you it ${words ? `leans on ${words}` : "leans on none of the usual words"}; it ${c.attributed ? `says where it got this ${plural(c.attributed, "time")}` : "does not say where it got this"}${c.named.length ? ` and names ${list(c.named.slice(0, 4))}` : " and names no one"}.`,
    );
  }
  const loudest = p.hops
    .filter((h) => h.said.trim())
    .map((h) => ({ h, c: census(h.said) }))
    .sort((a, b) => b.c.n - a.c.n)[0];
  if (loudest && loudest.c.n)
    out.push(
      `of the hands, ${loudest.h.who.trim() || CHANNEL_LABEL[loudest.h.channel]} leans hardest: ${censusWords(loudest.c)}.`,
    );
  if (t.hands)
    out.push(
      `${t.gains} of ${t.hands} hands have what they gain named; ${t.runsOn} have what they run on; ${t.record} have a record noted · ${plural(t.asked, "question")} put${t.answered ? `, ${t.answered} answered` : ""}${t.askedProposed ? `, ${t.askedProposed} proposed` : ""}.`,
    );
  if (t.checks || t.checksProposed) {
    const done = t.held + t.fell + t.cannot;
    out.push(
      `${plural(t.checks, "check")} named${t.checksProposed ? ` (${t.checksProposed} more proposed)` : ""}: ${done ? `${done} made — ${[t.held ? `${t.held} held` : "", t.fell ? `${t.fell} fell` : "", t.cannot ? `${t.cannot} cannot be` : ""].filter(Boolean).join(", ")}` : "none made yet"}${t.checks - done > 0 ? `; ${t.checks - done} still to make` : ""}.`,
    );
  } else
    out.push("no check named — what would settle it, and who could be asked?");
  if (evidence) {
    if (evidence.n === 0)
      out.push(
        `in the garden, nothing flows into ${evidence.stone.label} yet.`,
      );
    else {
      const kinds: string[] = [];
      if (evidence.own) kinds.push(`${evidence.own} of your own writing`);
      if (evidence.read)
        kinds.push(`${plural(evidence.read, "thing")} you read`);
      if (evidence.code) kinds.push(`${plural(evidence.code, "repo")}`);
      if (evidence.unwritten)
        kinds.push(`${evidence.unwritten} never written down`);
      out.push(
        `in the garden, ${plural(evidence.n, "stone")} ${evidence.n === 1 ? "flows" : "flow"} into ${evidence.stone.label}: ${list(kinds)}${evidence.hosts.length ? ` · they name ${list(evidence.hosts.slice(0, 5).map((h) => `${h.host}${h.n > 1 ? ` (${h.n})` : ""}`))}` : " · they name no host"}.`,
      );
    }
  }
  void today;
  return out;
}

// ── asking the model on this machine ──────────────────────────────────────

const SYSTEM = (today: string) =>
  [
    "You help one person trace how a claim reached them — the hands it passed through, what each hand gains, what would settle it.",
    "You never say whether the claim is true or false, never rank the hands, and never advise what to believe. You propose questions and checks; they decide.",
    "Use their names and words. Invent no facts about the hands or the claim. Be concrete and plain; no praise, no hedging.",
    `Today is ${today}.`,
    "Answer in JSON only.",
  ].join(" ");

export function askQuestions(p: Provenance, today: string) {
  const ids = p.hops.map((h) => h.id);
  const hands = p.hops
    .map(
      (h, i) =>
        `hand ${i + 1} (id ${h.id}): ${h.who.trim() || "unnamed"} · ${CHANNEL_LABEL[h.channel]}${h.where.trim() ? ` · ${h.where.trim()}` : ""}${h.day ? ` · ${h.day}` : ""}` +
        (h.said.trim() ? `\n  said: ${h.said.trim()}` : "") +
        (h.gains.trim() ? `\n  gains: ${h.gains.trim()}` : "") +
        (h.runsOn.trim() ? `\n  runs on: ${h.runsOn.trim()}` : "") +
        (h.record.trim() ? `\n  record: ${h.record.trim()}` : "") +
        (h.asked.filter((q) => q.kept).length
          ? `\n  already asked: ${h.asked
              .filter((q) => q.kept)
              .map((q) => q.text)
              .join(" · ")}`
          : ""),
    )
    .join("\n");
  return {
    system: SYSTEM(today),
    user: [
      `THE CLAIM, as it reached them:\n${p.claim.trim() || "(not written)"}`,
      p.origin.trim()
        ? `THE FIRST SAYING${p.originWho.trim() ? ` (${p.originWho.trim()})` : ""}:\n${p.origin.trim()}`
        : "THE FIRST SAYING: not known.",
      hands
        ? `THE HANDS, first to last:\n${hands}`
        : "THE HANDS: none named yet.",
      p.checks.filter((c) => c.kept).length
        ? `Checks already named: ${p.checks
            .filter((c) => c.kept)
            .map((c) => c.text)
            .join(" · ")}`
        : "",
      "Give three things.",
      "checks: 3 to 5 things that would settle the claim, or part of it — a document to find, a number to look up, a person or office that could be asked. Put what in text and how, in one line, in how.",
      ids.length
        ? "questions: for each hand, 1 or 2 questions to put to it — who pays it, what it gains if this is believed, what it has said before and how that went, whom it cites, what it left out. Put the hand's id in hop."
        : "questions: an empty list.",
      ids.length
        ? "turns: where the wording changed between one quote and the next — only where both quotes are given — as was and became, at the hand whose quote is the became (its id in hop). Empty if nothing changed or there are not two quotes."
        : "turns: an empty list.",
      "Do not repeat what is already asked or named. Do not say whether the claim is true.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    schema: {
      type: "object",
      properties: {
        checks: {
          type: "array",
          items: {
            type: "object",
            properties: { text: { type: "string" }, how: { type: "string" } },
            required: ["text", "how"],
          },
        },
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              hop: ids.length
                ? { type: "string", enum: ids }
                : { type: "string" },
              text: { type: "string" },
            },
            required: ["hop", "text"],
          },
        },
        turns: {
          type: "array",
          items: {
            type: "object",
            properties: {
              hop: ids.length
                ? { type: "string", enum: ids }
                : { type: "string" },
              was: { type: "string" },
              became: { type: "string" },
            },
            required: ["hop", "was", "became"],
          },
        },
      },
      required: ["checks", "questions", "turns"],
    },
  };
}

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

/** What the model sent, made safe: capped, and every hop id one that exists. */
export function validateProposal(raw: unknown, hopIds: string[]): Proposal {
  const r = (raw ?? {}) as Record<string, unknown>;
  const ids = new Set(hopIds);
  const arr = (v: unknown, n: number) =>
    Array.isArray(v) ? v.slice(0, n) : [];
  const checks = arr(r.checks, 6)
    .map((c) => {
      const x = c as Record<string, unknown>;
      return { text: str(x.text, 300), how: str(x.how, 300) };
    })
    .filter((c) => c.text);
  const questions = arr(r.questions, 24)
    .map((q) => {
      const x = q as Record<string, unknown>;
      return { hop: str(x.hop, 24), text: str(x.text, 300) };
    })
    .filter((q) => q.text && ids.has(q.hop));
  const turns = arr(r.turns, 12)
    .map((t) => {
      const x = t as Record<string, unknown>;
      return {
        hop: str(x.hop, 24),
        was: str(x.was, 300),
        became: str(x.became, 300),
      };
    })
    .filter((t) => t.was && t.became && ids.has(t.hop));
  return { checks, questions, turns };
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Fold a proposal in as proposed, not kept; nothing already there is repeated. */
export function adopt(
  p: Provenance,
  pr: Proposal,
  id: () => string = uid,
): Provenance {
  const haveCheck = new Set(p.checks.map((c) => norm(c.text)));
  const checks: Check[] = [
    ...p.checks,
    ...pr.checks
      .filter((c) => !haveCheck.has(norm(c.text)))
      .map((c) => ({
        id: id(),
        text: c.text,
        how: c.how,
        went: "" as Went,
        on: null,
        by: "proposed" as By,
        kept: false,
      })),
  ];
  const hops = p.hops.map((h) => {
    const haveQ = new Set(h.asked.map((q) => norm(q.text)));
    const haveT = new Set(h.turns.map((t) => norm(`${t.was} ${t.became}`)));
    const asked: Question[] = [
      ...h.asked,
      ...pr.questions
        .filter((q) => q.hop === h.id && !haveQ.has(norm(q.text)))
        .map((q) => ({
          id: id(),
          text: q.text,
          answer: "",
          by: "proposed" as By,
          kept: false,
        })),
    ];
    const turns: Turn[] = [
      ...h.turns,
      ...pr.turns
        .filter(
          (t) => t.hop === h.id && !haveT.has(norm(`${t.was} ${t.became}`)),
        )
        .map((t) => ({
          id: id(),
          was: t.was,
          became: t.became,
          by: "proposed" as By,
          kept: false,
        })),
    ];
    return { ...h, asked, turns };
  });
  return { ...p, checks, hops };
}

/** How many things are proposed and not yet the reader's. */
export function proposedCount(p: Provenance): number {
  return (
    p.checks.filter((c) => !c.kept).length +
    p.hops.reduce(
      (n, h) =>
        n +
        h.asked.filter((q) => !q.kept).length +
        h.turns.filter((t) => !t.kept).length,
      0,
    )
  );
}

export function keepAll(p: Provenance, yes: boolean): Provenance {
  return {
    ...p,
    checks: yes
      ? p.checks.map((c) => ({ ...c, kept: true }))
      : p.checks.filter((c) => c.kept),
    hops: p.hops.map((h) => ({
      ...h,
      asked: yes
        ? h.asked.map((q) => ({ ...q, kept: true }))
        : h.asked.filter((q) => q.kept),
      turns: yes
        ? h.turns.map((t) => ({ ...t, kept: true }))
        : h.turns.filter((t) => t.kept),
    })),
  };
}

// ── the file ──────────────────────────────────────────────────────────────

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;
export const slugOf = datedSlug;

/** A title from the claim's first sentence, when none was given. */
export function titleOf(p: { title: string; claim: string }): string {
  if (p.title.trim()) return p.title.trim();
  const first = sentencesOf(p.claim)[0] ?? "";
  return first.replace(/[.!?]$/, "").slice(0, 80) || "a claim";
}

const dayStr = (v: unknown): string => {
  if (v instanceof Date && !Number.isNaN(v.getTime()))
    return v.toISOString().slice(0, 10);
  if (typeof v === "number") return String(v);
  return typeof v === "string" ? v.trim() : "";
};
const by = (v: unknown): By => (v === "proposed" ? "proposed" : "you");
const channel = (v: unknown): Channel =>
  CHANNELS.includes(v as Channel) ? (v as Channel) : "other";
const went = (v: unknown): Went =>
  v === "held" || v === "fell" || v === "cannot" ? v : "";
const knowingOf = (v: unknown): Knowing[] =>
  Array.isArray(v)
    ? [
        ...new Set(
          v.filter((k): k is Knowing => KNOWINGS.includes(k as Knowing)),
        ),
      ]
    : [];

function section(body: string, name: string): string {
  const re = new RegExp(`^## ${name}\\s*$`, "im");
  const m = re.exec(body);
  if (!m) return "";
  const rest = body.slice(m.index + m[0].length);
  const next = /^## /m.exec(rest);
  return (next ? rest.slice(0, next.index) : rest).trim();
}

const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;

function questionOf(v: unknown, strict: boolean): Question | null {
  const x = obj(v);
  if (!x) return null;
  const text = str(x.text, 300);
  if (!text) return null;
  return {
    id: str(x.id, 24) || uid(),
    text,
    answer: str(x.answer, 2000),
    by: by(x.by),
    kept: strict ? x.kept === true : x.kept !== false,
  };
}

function turnOf(v: unknown, strict: boolean): Turn | null {
  const x = obj(v);
  if (!x) return null;
  const was = str(x.was, 300);
  const became = str(x.became, 300);
  if (!was || !became) return null;
  return {
    id: str(x.id, 24) || uid(),
    was,
    became,
    by: by(x.by),
    kept: strict ? x.kept === true : x.kept !== false,
  };
}

function seenOf(v: unknown): Seen | null {
  const x = obj(v);
  if (!x) return null;
  const host = str(x.host, 120);
  const title = str(x.title, 200);
  if (!host && !title) return null;
  const on = dayStr(x.on);
  return {
    title,
    host,
    words: str(x.words, 600),
    on: validDay(on) ? on : "",
  };
}

function hopOf(v: unknown, strict: boolean): Hop | null {
  const x = obj(v);
  if (!x) return null;
  const who = str(x.who, 120);
  const said = str(x.said, 2000);
  const where = str(x.where, 120);
  if (!who && !said && !where && !str(x.link, 600)) return null;
  const d = dayStr(x.day);
  const list = <T>(v: unknown, f: (x: unknown) => T | null): T[] =>
    Array.isArray(v)
      ? v
          .slice(0, 12)
          .map(f)
          .filter((y): y is T => y !== null)
      : [];
  return {
    id: str(x.id, 24) || uid(),
    who,
    channel: channel(x.channel),
    where,
    day: validDay(d) ? d : null,
    said,
    link: str(x.link, 600),
    seen: seenOf(x.seen),
    gains: str(x.gains, 600),
    runsOn: str(x.runsOn, 600),
    record: str(x.record, 1000),
    reframed: x.reframed === true ? true : x.reframed === false ? false : null,
    turns: list(x.turns, (t) => turnOf(t, strict)),
    asked: list(x.asked, (q) => questionOf(q, strict)),
  };
}

function checkOf(v: unknown, strict: boolean): Check | null {
  const x = obj(v);
  if (!x) return null;
  const text = str(x.text, 300);
  if (!text) return null;
  const on = dayStr(x.on);
  return {
    id: str(x.id, 24) || uid(),
    text,
    how: str(x.how, 300),
    went: went(x.went),
    on: validDay(on) ? on : null,
    by: by(x.by),
    kept: strict ? x.kept === true : x.kept !== false,
  };
}

export function parseProvenance(slug: string, raw: string): Provenance {
  const { data, content } = matter(raw);
  const recorded = dayStr(data.recorded);
  const touched = dayStr(data.touched);
  return {
    slug,
    title: str(data.title, 120),
    claim: section(content, "the claim, as it reached you"),
    origin: section(content, "the first saying"),
    originWho: str(data.originWho, 120),
    stone: str(data.stone, 200) || null,
    knowing: knowingOf(data.knowing),
    hops: Array.isArray(data.hops)
      ? data.hops
          .slice(0, 24)
          .map((h: unknown) => hopOf(h, false))
          .filter((h: Hop | null): h is Hop => h !== null)
      : [],
    checks: Array.isArray(data.checks)
      ? data.checks
          .slice(0, 24)
          .map((c: unknown) => checkOf(c, false))
          .filter((c: Check | null): c is Check => c !== null)
      : [],
    note: section(content, "note"),
    recorded: validDay(recorded) ? recorded : "",
    touched: validDay(touched) ? touched : validDay(recorded) ? recorded : "",
  };
}

const q = (s: string | null | boolean) => JSON.stringify(s);

export function serialiseProvenance(p: Provenance): string {
  const lines = [`title: ${q(p.title)}`];
  if (p.originWho) lines.push(`originWho: ${q(p.originWho)}`);
  if (p.stone) lines.push(`stone: ${q(p.stone)}`);
  if (p.knowing.length)
    lines.push(`knowing: [${p.knowing.map((k) => q(k)).join(", ")}]`);
  lines.push(`recorded: ${q(p.recorded)}`, `touched: ${q(p.touched)}`);
  if (p.hops.length) {
    lines.push("hops:");
    for (const h of p.hops) {
      lines.push(
        `  - id: ${q(h.id)}`,
        `    who: ${q(h.who)}`,
        `    channel: ${q(h.channel)}`,
        `    where: ${q(h.where)}`,
        `    day: ${q(h.day)}`,
        `    said: ${q(h.said)}`,
        `    link: ${q(h.link)}`,
      );
      if (h.seen)
        lines.push(
          `    seen: { title: ${q(h.seen.title)}, host: ${q(h.seen.host)}, words: ${q(h.seen.words)}, on: ${q(h.seen.on)} }`,
        );
      lines.push(
        `    gains: ${q(h.gains)}`,
        `    runsOn: ${q(h.runsOn)}`,
        `    record: ${q(h.record)}`,
        `    reframed: ${h.reframed === null ? "null" : q(h.reframed)}`,
      );
      if (h.turns.length) {
        lines.push("    turns:");
        for (const t of h.turns)
          lines.push(
            `      - { id: ${q(t.id)}, was: ${q(t.was)}, became: ${q(t.became)}, by: ${q(t.by)}, kept: ${t.kept} }`,
          );
      }
      if (h.asked.length) {
        lines.push("    asked:");
        for (const a of h.asked)
          lines.push(
            `      - { id: ${q(a.id)}, text: ${q(a.text)}, answer: ${q(a.answer)}, by: ${q(a.by)}, kept: ${a.kept} }`,
          );
      }
    }
  }
  if (p.checks.length) {
    lines.push("checks:");
    for (const c of p.checks)
      lines.push(
        `  - { id: ${q(c.id)}, text: ${q(c.text)}, how: ${q(c.how)}, went: ${q(c.went)}, on: ${q(c.on)}, by: ${q(c.by)}, kept: ${c.kept} }`,
      );
  }
  const body = [
    `## the claim, as it reached you\n\n${p.claim.trim()}`,
    `## the first saying\n\n${p.origin.trim()}`,
  ];
  if (p.note.trim()) body.push(`## note\n\n${p.note.trim()}`);
  return `---\n${lines.join("\n")}\n---\n\n${body.join("\n\n")}\n`;
}

/** Validation at the boundary: a provenance arrives from the desk, or from a hand-edited file. */
export function validateProvenance(input: unknown, today: string): Provenance {
  const p = input as Partial<Provenance> | null;
  if (!p || typeof p !== "object") throw new Error("provenance: not an object");
  const claim =
    typeof p.claim === "string" ? p.claim.trim().slice(0, 4000) : "";
  const origin =
    typeof p.origin === "string" ? p.origin.trim().slice(0, 4000) : "";
  const hops = Array.isArray(p.hops)
    ? p.hops
        .slice(0, 24)
        .map((h) => hopOf(h, true))
        .filter((h): h is Hop => h !== null)
    : [];
  if (!claim && !origin && !hops.length)
    throw new Error(
      "provenance: say the claim as it reached you, or name a hand",
    );
  const title = titleOf({ title: str(p.title, 120), claim: claim || origin });
  const recorded = dayStr(p.recorded);
  const slugIn = str(p.slug, 80);
  const slug = slugIn || slugOf(title, validDay(recorded) ? recorded : today);
  if (!SLUG.test(slug)) throw new Error("provenance: bad slug");
  return {
    slug,
    title,
    claim,
    origin,
    originWho: str(p.originWho, 120),
    stone: str(p.stone, 200) || null,
    knowing: knowingOf(p.knowing),
    hops,
    checks: Array.isArray(p.checks)
      ? p.checks
          .slice(0, 24)
          .map((c) => checkOf(c, true))
          .filter((c): c is Check => c !== null)
      : [],
    note: typeof p.note === "string" ? p.note.trim().slice(0, 4000) : "",
    recorded: validDay(recorded) && recorded.length === 10 ? recorded : today,
    touched: today,
  };
}
