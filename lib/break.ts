import matter from "gray-matter";

/**
 * The break: mindful self-compassion as an instrument, after Kristin Neff
 * and Chris Germer. When something hurts the reader takes a break: three
 * sentences in their own words — one that notices the hurt, one that
 * remembers they are not the only one, one that is kind — a hand where it
 * helps, and what they need to hear. Then, if they want, the friend: what
 * they are saying to themselves set beside what they would say to a friend
 * in the same spot, and the desk counting the words each leans on. A
 * letter, in the friend's voice. Afterwards, how it went. The desk counts
 * moments, hands, which of the three was hardest, the critic's recurring
 * words; it never says the reader is hard on themselves, and it never
 * scores.
 */

export type Three = "notice" | "shared" | "kind";
export const THREE: Three[] = ["notice", "shared", "kind"];
export const THREE_LABEL: Record<Three, string> = {
  notice: "noticed",
  shared: "shared",
  kind: "kind",
};
/** The three, as Neff and Germer give them; the reader's own words replace them. */
export const THREE_DEFAULT: Record<Three, string> = {
  notice: "This is a moment of suffering.",
  shared: "Suffering is a part of life.",
  kind: "May I be kind to myself.",
};
/** Other ways the workbook offers to say each, to hand. */
export const THREE_OTHERS: Record<Three, string[]> = {
  notice: [
    "This hurts.",
    "Ouch.",
    "This is hard right now.",
    "This is stress.",
  ],
  shared: [
    "Other people feel this way.",
    "I'm not alone.",
    "We all struggle in our lives.",
    "Anyone in this spot would feel this.",
  ],
  kind: [
    "May I give myself what I need.",
    "May I accept myself as I am.",
    "May I forgive myself.",
    "May I be patient.",
    "May I be strong.",
  ],
};

export type Touch = "" | "heart" | "both" | "cheek" | "hand" | "arms" | "none";
export const TOUCHES: Touch[] = [
  "heart",
  "both",
  "cheek",
  "hand",
  "arms",
  "none",
];
export const TOUCH_LABEL: Record<Touch, string> = {
  "": "",
  heart: "a hand on the heart",
  both: "both hands on the chest",
  cheek: "a hand on the cheek",
  hand: "one hand holding the other",
  arms: "arms around yourself",
  none: "no hand",
};

export type Moment = {
  slug: string;
  /** ISO with the machine's offset. */
  at: string;
  /** What hurts, in a line. */
  what: string;
  three: Record<Three, string>;
  touch: Touch;
  need: string;
  hardest: Three | "";
  toSelf: string;
  toFriend: string;
  letter: string;
  after: string;
  stone: string | null;
};

export const emptyMoment = (at: string): Moment => ({
  slug: "",
  at,
  what: "",
  three: { ...THREE_DEFAULT },
  touch: "",
  need: "",
  hardest: "",
  toSelf: "",
  toFriend: "",
  letter: "",
  after: "",
  stone: null,
});

export const dayOf = (at: string) => at.slice(0, 10);

/* ── the two voices ─────────────────────────────────────────────────────── */

export type Family =
  "absolutes" | "shoulds" | "labels" | "contempt" | "you" | "allowance";
export const FAMILIES: Family[] = [
  "absolutes",
  "shoulds",
  "labels",
  "contempt",
  "you",
  "allowance",
];
export const FAMILY_LABEL: Record<Family, string> = {
  absolutes: "absolutes",
  shoulds: "shoulds",
  labels: "labels",
  contempt: "contempt",
  you: "'you', turned on yourself",
  allowance: "allowance",
};

const WORDS: Record<Exclude<Family, "you">, RegExp> = {
  absolutes:
    /\b(always|never|every time|everyone|everybody|no one|nobody|nothing|everything|all the time|completely|totally|forever|again and again)\b/gi,
  shoulds:
    /\b(should(?:n't| not)?|must(?:n't| not)?|have to|has to|had to|ought(?: not)? to|supposed to)\b/gi,
  labels:
    /\b(idiot|stupid|lazy|failure|loser|pathetic|useless|worthless|weak|broken|hopeless|fraud|mess|disaster|coward|selfish|childish|embarrassing|disgusting|incompetent|a joke)\b/gi,
  contempt:
    /\b(hate|hated|disgust(?:ing|ed)?|ridiculous|pathetic|contempt|sick of|can't stand)\b/gi,
  allowance:
    /\b(it'?s ok(?:ay)?|that'?s ok(?:ay)?|of course|makes sense|understandable|anyone would|you'?re allowed|allowed to|not alone|it'?s hard|this is hard|enough|doing your best|did your best|human|take your time|it will pass|gentle|gently)\b/gi,
};

export type Census = Record<Family, string[]>;

/** The words a piece of self-talk leans on, by family, with each hit kept so it can be checked. */
export function census(text: string): Census {
  const out = {} as Census;
  for (const f of FAMILIES) out[f] = [];
  const t = text.replace(/\s+/g, " ");
  for (const f of Object.keys(WORDS) as Exclude<Family, "you">[]) {
    const hits = t.match(WORDS[f]) ?? [];
    out[f] = hits.map((h) => h.toLowerCase());
  }
  out.you = (t.match(/\byou(?:'re|'ve|'ll|r|rself)?\b/gi) ?? []).map((h) =>
    h.toLowerCase(),
  );
  return out;
}

const list = (xs: string[]) => [...new Set(xs)].map((w) => `'${w}'`).join(", ");
const n = (k: number, one: string, many = `${one}s`) =>
  `${k} ${k === 1 ? one : many}`;

/**
 * The two voices side by side, as counts with the words: what the one to
 * yourself leans on that the one to a friend does not, and the other way.
 * Never which voice is right.
 */
export function compare(toSelf: string, toFriend: string): string[] {
  if (!toSelf.trim() && !toFriend.trim()) return [];
  const a = census(toSelf);
  const b = census(toFriend);
  const say = (c: Census, who: string) => {
    const parts: string[] = [];
    for (const f of ["absolutes", "shoulds", "labels", "contempt"] as Family[])
      if (c[f].length)
        parts.push(
          `${n(c[f].length, f === "absolutes" ? "absolute" : f === "shoulds" ? "should" : f === "labels" ? "label" : "word of contempt", f === "absolutes" ? "absolutes" : f === "shoulds" ? "shoulds" : f === "labels" ? "labels" : "words of contempt")} (${list(c[f])})`,
        );
    if (c.allowance.length)
      parts.push(
        `${n(c.allowance.length, "allowance")} (${list(c.allowance)})`,
      );
    return `${who}: ${parts.length ? parts.join(", ") : "none of the counted words"}`;
  };
  const out: string[] = [];
  if (toSelf.trim()) {
    out.push(say(a, "to yourself"));
    if (a.you.length)
      out.push(`'you' turned on yourself ${n(a.you.length, "time")}`);
  }
  if (toFriend.trim()) out.push(say(b, "to a friend"));
  if (toSelf.trim() && toFriend.trim()) {
    const onlySelf = (
      ["absolutes", "shoulds", "labels", "contempt"] as Family[]
    ).filter((f) => a[f].length && !b[f].length);
    const onlyFriend = a.allowance.length === 0 && b.allowance.length > 0;
    if (onlySelf.length && onlyFriend)
      out.push(
        `the friend's version drops the ${onlySelf.join(", ")} and adds allowance`,
      );
    else if (onlySelf.length)
      out.push(`the friend's version drops the ${onlySelf.join(", ")}`);
    else if (onlyFriend) out.push("the friend's version adds allowance");
    const wa = toSelf.trim().split(/\s+/).length;
    const wb = toFriend.trim().split(/\s+/).length;
    if (wb > wa * 1.5) out.push("the friend gets more words");
    else if (wa > wb * 1.5) out.push("you get more words than the friend");
  }
  return out;
}

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
  last: string | null;
  sinceLast: number | null;
  own: number;
  touches: { touch: Touch; n: number }[];
  hardest: Record<Three, number>;
  friend: number;
  letter: number;
  after: number;
  need: number;
  /** The critic's recurring words across every moment's self-talk. */
  critic: { word: string; n: number }[];
};

export function tally(moments: Moment[], today: string): Tally {
  const days = moments.map((m) => dayOf(m.at));
  const last = days.slice().sort().at(-1) ?? null;
  const touches = new Map<Touch, number>();
  const hardest: Record<Three, number> = { notice: 0, shared: 0, kind: 0 };
  const critic = new Map<string, number>();
  let own = 0;
  for (const m of moments) {
    if (m.touch) touches.set(m.touch, (touches.get(m.touch) ?? 0) + 1);
    if (m.hardest) hardest[m.hardest]++;
    if (
      THREE.some(
        (k) => m.three[k].trim() && m.three[k].trim() !== THREE_DEFAULT[k],
      )
    )
      own++;
    const c = census(m.toSelf);
    for (const w of new Set([...c.labels, ...c.contempt, ...c.absolutes]))
      critic.set(w, (critic.get(w) ?? 0) + 1);
  }
  return {
    n: moments.length,
    week: days.filter((d) => daysBetween(d, today) < 7).length,
    month: days.filter((d) => daysBetween(d, today) < 30).length,
    last,
    sinceLast: last ? daysBetween(last, today) : null,
    own,
    touches: [...touches]
      .map(([touch, n]) => ({ touch, n }))
      .sort((a, b) => b.n - a.n),
    hardest,
    friend: moments.filter((m) => m.toFriend.trim()).length,
    letter: moments.filter((m) => m.letter.trim()).length,
    after: moments.filter((m) => m.after.trim()).length,
    need: moments.filter((m) => m.need.trim()).length,
    critic: [...critic]
      .map(([word, n]) => ({ word, n }))
      .filter((c) => c.n > 1)
      .sort((a, b) => b.n - a.n || (a.word < b.word ? -1 : 1))
      .slice(0, 6),
  };
}

const ago = (d: number) =>
  d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;

/** Facts about the record of breaks; none a verdict on the reader. */
export function readings(t: Tally): string[] {
  const out: string[] = [];
  if (!t.n) return ["no breaks taken yet"];
  out.push(
    `${n(t.n, "break")} · ${t.week} this week, ${t.month} this month · the last ${ago(t.sinceLast ?? 0)}`,
  );
  out.push(
    t.own === t.n
      ? "the three sentences were in your own words every time"
      : t.own
        ? `the three sentences were in your own words in ${t.own} of ${t.n}`
        : "the three sentences have been the workbook's so far",
  );
  if (t.touches.length)
    out.push(
      `a hand: ${t.touches.map((x) => `${TOUCH_LABEL[x.touch]} ×${x.n}`).join(", ")}`,
    );
  const h = THREE.filter((k) => t.hardest[k]);
  if (h.length)
    out.push(
      `hardest to say: ${h.map((k) => `the ${THREE_LABEL[k]} one ×${t.hardest[k]}`).join(", ")}`,
    );
  out.push(
    `what you needed to hear written for ${t.need} · the friend's version for ${t.friend} · a letter for ${t.letter} · afterwards for ${t.after}`,
  );
  if (t.critic.length)
    out.push(
      `the words that come back when you talk to yourself: ${t.critic.map((c) => `'${c.word}' ×${c.n}`).join(", ")}`,
    );
  return out;
}

/* ── the file ──────────────────────────────────────────────────────────── */

const y = (s: string | null) => JSON.stringify(s);
const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
const long = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

export function serialiseMoment(m: Moment): string {
  const lines = [`at: ${y(m.at)}`];
  if (m.touch) lines.push(`touch: ${m.touch}`);
  if (m.hardest) lines.push(`hardest: ${m.hardest}`);
  if (m.stone) lines.push(`stone: ${y(m.stone)}`);
  const body = [
    `## what hurts\n\n${m.what.trim()}`,
    `## the three\n\n${THREE.map((k) => `- ${THREE_LABEL[k]}: ${m.three[k].trim()}`).join("\n")}`,
  ];
  if (m.need.trim()) body.push(`## what I need to hear\n\n${m.need.trim()}`);
  if (m.toSelf.trim()) body.push(`## to myself\n\n${m.toSelf.trim()}`);
  if (m.toFriend.trim()) body.push(`## to a friend\n\n${m.toFriend.trim()}`);
  if (m.letter.trim()) body.push(`## the letter\n\n${m.letter.trim()}`);
  if (m.after.trim()) body.push(`## afterwards\n\n${m.after.trim()}`);
  return `---\n${lines.join("\n")}\n---\n\n${body.join("\n\n")}\n`;
}

export function parseMoment(slug: string, raw: string): Moment {
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
  const three: Record<Three, string> = { notice: "", shared: "", kind: "" };
  for (const line of sec("the three").split("\n")) {
    const m = line.match(/^- (noticed|shared|kind): (.*)$/);
    if (m) three[m[1] === "noticed" ? "notice" : (m[1] as Three)] = m[2].trim();
  }
  return validateMoment({
    slug,
    at: data.at,
    what: sec("what hurts"),
    three,
    touch: data.touch,
    need: sec("what i need to hear"),
    hardest: data.hardest,
    toSelf: sec("to myself"),
    toFriend: sec("to a friend"),
    letter: sec("the letter"),
    after: sec("afterwards"),
    stone: data.stone ?? null,
  });
}

const AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)?$/;

export function validateMoment(input: unknown): Moment {
  const r = (input ?? {}) as Record<string, unknown>;
  const what = str(r.what, 600);
  if (!what) throw new Error("a break needs what hurts");
  const t = (r.three ?? {}) as Record<string, unknown>;
  const three: Record<Three, string> = {
    notice: str(t.notice, 300) || THREE_DEFAULT.notice,
    shared: str(t.shared, 300) || THREE_DEFAULT.shared,
    kind: str(t.kind, 300) || THREE_DEFAULT.kind,
  };
  const touch = (TOUCHES as string[]).includes(String(r.touch))
    ? (r.touch as Touch)
    : "";
  const hardest = (THREE as string[]).includes(String(r.hardest))
    ? (r.hardest as Three)
    : "";
  const at =
    typeof r.at === "string" && AT.test(r.at)
      ? r.at
      : new Date().toISOString().slice(0, 16);
  const m: Moment = {
    slug: str(r.slug, 120),
    at,
    what,
    three,
    touch,
    need: long(r.need, 600),
    hardest,
    toSelf: long(r.toSelf, 4000),
    toFriend: long(r.toFriend, 4000),
    letter: long(r.letter, 8000),
    after: long(r.after, 2000),
    stone: str(r.stone, 200) || null,
  };
  if (!m.slug)
    m.slug = `${at.slice(0, 10)}-${at.slice(11, 13)}${at.slice(14, 16)}`;
  return m;
}
