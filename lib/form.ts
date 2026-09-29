/**
 * The form: an argument's shape in propositional logic, written by the
 * reader. Each sentence gets a letter; the premises and the conclusion are
 * written over the letters with not, and, or, if … then, iff. Validity is
 * about form, not about whether a sentence is so, so what this can say
 * without ever grading a claim is what the rows show: whether there is a
 * row where every premise holds and the conclusion does not, and which
 * sentences can't be held together in any row. Translating a sentence into
 * a letter is the reader's act and an interpretation; nothing here does it.
 */

export type Formula =
  | { k: "atom"; a: string }
  | { k: "not"; x: Formula }
  | { k: "and" | "or" | "if" | "iff"; l: Formula; r: Formula };

export type Parsed = { ok: true; f: Formula } | { ok: false; error: string };

/** Beyond this many letters the rows stop being something a person reads. */
export const MAX_LETTERS = 10;

type Tok = {
  t: "atom" | "not" | "and" | "or" | "if" | "iff" | "ifw" | "then" | "(" | ")";
  a?: string;
};

const WORDS: Record<string, Tok["t"]> = {
  not: "not",
  and: "and",
  or: "or",
  implies: "if",
  iff: "iff",
  if: "ifw",
  then: "then",
};

const SYMBOLS: [string, Tok["t"]][] = [
  ["<->", "iff"],
  ["<=>", "iff"],
  ["->", "if"],
  ["=>", "if"],
  ["&&", "and"],
  ["||", "or"],
  ["↔", "iff"],
  ["≡", "iff"],
  ["→", "if"],
  ["⊃", "if"],
  ["∧", "and"],
  ["&", "and"],
  ["∨", "or"],
  ["|", "or"],
  ["¬", "not"],
  ["~", "not"],
  ["!", "not"],
  ["(", "("],
  ["[", "("],
  [")", ")"],
  ["]", ")"],
];

function lex(src: string): Tok[] | string {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const sym = SYMBOLS.find(([s]) => src.startsWith(s, i));
    if (sym) {
      out.push({ t: sym[1] });
      i += sym[0].length;
      continue;
    }
    const w = src.slice(i).match(/^[A-Za-z]+/);
    if (w) {
      const word = w[0].toLowerCase();
      if (word.length === 1) out.push({ t: "atom", a: word });
      else if (WORDS[word]) out.push({ t: WORDS[word] });
      else return `‘${w[0]}’ is not a letter — give each sentence one letter`;
      i += w[0].length;
      continue;
    }
    return `‘${c}’ is not part of the notation`;
  }
  return out;
}

/**
 * Read a formula. Not binds tightest, then and, then or, then if … then
 * (to the right), then iff. Brackets group. Letters are case-blind.
 */
export function parse(src: string): Parsed {
  const toks = lex(src);
  if (typeof toks === "string") return { ok: false, error: toks };
  if (!toks.length) return { ok: false, error: "nothing written yet" };
  let p = 0;
  const peek = () => toks[p]?.t;
  const fail = (m: string): never => {
    throw new Error(m);
  };

  const iff = (): Formula => {
    let l = imp();
    while (peek() === "iff") {
      p++;
      l = { k: "iff", l, r: imp() };
    }
    return l;
  };
  const imp = (): Formula => {
    if (peek() === "ifw") {
      p++;
      const l = iff();
      if (peek() !== "then") fail("an ‘if’ is waiting for its ‘then’");
      p++;
      return { k: "if", l, r: imp() };
    }
    const l = or();
    if (peek() === "if") {
      p++;
      return { k: "if", l, r: imp() };
    }
    return l;
  };
  const or = (): Formula => {
    let l = and();
    while (peek() === "or") {
      p++;
      l = { k: "or", l, r: and() };
    }
    return l;
  };
  const and = (): Formula => {
    let l = un();
    while (peek() === "and") {
      p++;
      l = { k: "and", l, r: un() };
    }
    return l;
  };
  const un = (): Formula => {
    const t = toks[p];
    if (!t) return fail("it stops before it finishes");
    if (t.t === "not") {
      p++;
      return { k: "not", x: un() };
    }
    if (t.t === "atom") {
      p++;
      return { k: "atom", a: t.a! };
    }
    if (t.t === "(") {
      p++;
      const f = iff();
      if (peek() !== ")") fail("a bracket is opened and never closed");
      p++;
      return f;
    }
    if (t.t === ")") return fail("a bracket closes that was never opened");
    if (t.t === "then") return fail("a ‘then’ with no ‘if’");
    return fail(`a connective with nothing before it`);
  };

  try {
    const f = iff();
    if (p < toks.length)
      return {
        ok: false,
        error:
          toks[p].t === ")"
            ? "a bracket closes that was never opened"
            : "two things side by side with no connective between them",
      };
    return { ok: true, f };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function lettersOf(f: Formula, into = new Set<string>()): Set<string> {
  if (f.k === "atom") into.add(f.a);
  else if (f.k === "not") lettersOf(f.x, into);
  else {
    lettersOf(f.l, into);
    lettersOf(f.r, into);
  }
  return into;
}

export type Row = Record<string, boolean>;

export function holds(f: Formula, row: Row): boolean {
  switch (f.k) {
    case "atom":
      return row[f.a] === true;
    case "not":
      return !holds(f.x, row);
    case "and":
      return holds(f.l, row) && holds(f.r, row);
    case "or":
      return holds(f.l, row) || holds(f.r, row);
    case "if":
      return !holds(f.l, row) || holds(f.r, row);
    case "iff":
      return holds(f.l, row) === holds(f.r, row);
  }
}

/** Every row over the letters, in the textbook order: the first letter held in the top half. */
export function rowsOf(letters: string[]): Row[] {
  const n = letters.length;
  const out: Row[] = [];
  for (let i = 0; i < 1 << n; i++) {
    const row: Row = {};
    letters.forEach((l, j) => (row[l] = !((i >> (n - 1 - j)) & 1)));
    out.push(row);
  }
  return out;
}

const PREC: Record<Formula["k"], number> = {
  iff: 1,
  if: 2,
  or: 3,
  and: 4,
  not: 5,
  atom: 6,
};
const GLYPH = { and: "∧", or: "∨", if: "→", iff: "↔" } as const;

/** The formula in the usual symbols, with only the brackets it needs. */
export function show(f: Formula): string {
  if (f.k === "atom") return f.a;
  if (f.k === "not") {
    const inner = show(f.x);
    return f.x.k === "atom" || f.x.k === "not" ? `¬${inner}` : `¬(${inner})`;
  }
  const side = (c: Formula, right: boolean) => {
    const s = show(c);
    if (PREC[c.k] > PREC[f.k]) return s;
    if (c.k === f.k && (f.k === "and" || f.k === "or")) return s;
    if (c.k === f.k && f.k === "if" && right) return s;
    return `(${s})`;
  };
  return `${side(f.l, false)} ${GLYPH[f.k]} ${side(f.r, true)}`;
}

/* ── the argument ──────────────────────────────────────────────────────── */

export type Line = { label: string; src: string };
export type Unread = { label: string; error: string };

export type ArgumentRows = {
  letters: string[];
  rows: Row[];
  /** Rows where every premise holds together. */
  live: number[];
  /** Live rows where the conclusion does not hold. */
  against: number[];
  /** The conclusion holds in every row, premises or none. */
  always: boolean;
};

export type ArgumentForm =
  | { state: "empty" }
  | { state: "unread"; unread: Unread[] }
  | { state: "wide"; letters: string[] }
  | ({ state: "read" } & ArgumentRows);

/**
 * Premises and a conclusion, as written, set out over every row. What comes
 * back is only what the rows show; there is no verdict in it.
 */
export function argumentForm(premises: Line[], conclusion: Line, order: string[] = []): ArgumentForm {
  const written = premises.filter((p) => p.src.trim());
  if (!written.length || !conclusion.src.trim()) return { state: "empty" };
  const unread: Unread[] = [];
  const read = (l: Line) => {
    const r = parse(l.src);
    if (!r.ok) unread.push({ label: l.label, error: r.error });
    return r.ok ? r.f : null;
  };
  const ps = written.map(read);
  const c = read(conclusion);
  if (unread.length) return { state: "unread", unread };
  const fs = ps as Formula[];
  const set = new Set<string>();
  for (const f of [...fs, c!]) lettersOf(f, set);
  // The reader's key sets the order of the columns; a letter not in it goes after, alphabetically.
  const rank = (l: string) => (order.includes(l) ? order.indexOf(l) : order.length);
  const letters = [...set].sort((x, y) => rank(x) - rank(y) || (x < y ? -1 : 1));
  if (letters.length > MAX_LETTERS) return { state: "wide", letters };
  const rows = rowsOf(letters);
  const live: number[] = [];
  const against: number[] = [];
  let always = true;
  rows.forEach((row, i) => {
    const ch = holds(c!, row);
    if (!ch) always = false;
    if (fs.every((f) => holds(f, row))) {
      live.push(i);
      if (!ch) against.push(i);
    }
  });
  return { state: "read", letters, rows, live, against, always };
}

/* ── what can't be held together ───────────────────────────────────────── */

export type Clash = { ids: string[]; letters: string[]; rows: number };

/** No row over their letters has every one of them holding. */
function together(fs: Formula[]): {
  can: boolean;
  letters: string[];
  rows: number;
} {
  const set = new Set<string>();
  for (const f of fs) lettersOf(f, set);
  const letters = [...set].sort();
  if (letters.length > MAX_LETTERS) return { can: true, letters, rows: 0 };
  const rows = rowsOf(letters);
  return {
    can: rows.some((r) => fs.every((f) => holds(f, r))),
    letters,
    rows: rows.length,
  };
}

/**
 * The smallest sets — one, two or three at a time — that can't all be held
 * in any row, none containing a smaller one already found. `whole` says
 * whether everything written can be held together at all, since a clash
 * may need more than three to show.
 */
export function clashes(items: { id: string; src: string }[]): {
  clashes: Clash[];
  whole: boolean | null;
} {
  const read = items
    .map((x) => ({ id: x.id, p: parse(x.src) }))
    .filter((x): x is { id: string; p: { ok: true; f: Formula } } => x.p.ok);
  const out: Clash[] = [];
  const contains = (ids: string[]) =>
    out.some((c) => c.ids.every((i) => ids.includes(i)));
  const n = read.length;
  const tryIt = (idx: number[]) => {
    const ids = idx.map((i) => read[i].id);
    if (contains(ids)) return;
    const t = together(idx.map((i) => read[i].p.f));
    if (!t.can) out.push({ ids, letters: t.letters, rows: t.rows });
  };
  for (let i = 0; i < n; i++) tryIt([i]);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) tryIt([i, j]);
  if (n <= 24)
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        for (let k = j + 1; k < n; k++) tryIt([i, j, k]);
  const all = n ? together(read.map((x) => x.p.f)) : null;
  return {
    clashes: out,
    whole: all && all.letters.length <= MAX_LETTERS ? all.can : null,
  };
}

/* ── read back in words ────────────────────────────────────────────────── */

/**
 * The formula said back with each letter's sentence in its place, so the
 * reader can hear whether the form says what they meant.
 */
export function inWords(f: Formula, key: Record<string, string>): string {
  const s = (g: Formula, top = false): string => {
    if (g.k === "atom")
      return key[g.a]?.trim()
        ? `‘${key[g.a].trim().replace(/[.!?]+$/, "")}’`
        : g.a;
    if (g.k === "not") return `not ${s(g.x)}`;
    const inner =
      g.k === "if"
        ? `if ${s(g.l)}, then ${s(g.r)}`
        : g.k === "iff"
          ? `${s(g.l)} just when ${s(g.r)}`
          : `${s(g.l)} ${g.k} ${s(g.r)}`;
    return top ? inner : `(${inner})`;
  };
  return s(f, true);
}
