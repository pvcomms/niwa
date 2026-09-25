import matter from "gray-matter";
import type { GardenNode } from "./garden.ts";
import { rand } from "./hand.ts";

/**
 * The oblique: a card dealt at random to come at the thing from an angle.
 * Two sources. A deck is a markdown file, one card per paragraph, in the
 * reader's own words or pasted from a deck they own; the garden ships one
 * starter deck of its own. And the garden itself deals: a stone lying fallow,
 * a ghost named and never written, one of the reader's own terms, one of
 * their values, something touched lately — prompts no other deck could hold.
 * Nothing here weighs a card or says which to follow.
 */

export type Deck = {
  slug: string;
  title: string;
  cards: string[];
  /** Written by the reader (a file in their vault) rather than shipped by the garden. */
  own: boolean;
};

export type GardenKind = "fallow" | "ghost" | "concept" | "value" | "fresh";

export const GARDEN_KINDS: GardenKind[] = ["fallow", "ghost", "concept", "value", "fresh"];

export const GARDEN_KIND_LABEL: Record<GardenKind, string> = {
  fallow: "lying fallow",
  ghost: "unwritten",
  concept: "your terms",
  value: "your values",
  fresh: "touched lately",
};

export type Card = {
  id: string;
  text: string;
  /** The deck's slug, or "garden". */
  from: string;
  kind: GardenKind | null;
  /** The stone the garden dealt it from, when it did. */
  stone: { id: string; label: string } | null;
};

export const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * A deck file: frontmatter with a title, then one card per paragraph. A
 * pasted list works too — a leading dash or star is dropped — and a line
 * beginning with # is a heading the reader left for themselves, not a card.
 */
export function parseDeck(slug: string, raw: string, own = true): Deck {
  const { data, content } = matter(raw);
  const title =
    typeof data.title === "string" && data.title.trim() ? data.title.trim() : slug;
  const cards = content
    .split(/\n\s*\n/)
    .map((p) =>
      p
        .split("\n")
        .map((l) => l.replace(/^\s*[-*]\s+/, "").trim())
        .filter((l) => l && !l.startsWith("#"))
        .join(" "),
    )
    .map(clean)
    .filter(Boolean);
  return { slug, title, cards, own };
}

export function serialiseDeck(d: Deck): string {
  return `---\ntitle: ${JSON.stringify(d.title)}\n---\n\n${d.cards.join("\n\n")}\n`;
}

/** A card is one paragraph, up to 300 characters. */
export function validateCard(text: unknown): string {
  if (typeof text !== "string") throw new Error("a card is text");
  const t = clean(text);
  if (!t) throw new Error("an empty card");
  if (t.length > 300) throw new Error("a card is at most 300 characters");
  return t;
}

export function deckCards(d: Deck): Card[] {
  return d.cards.map((text, i) => ({
    id: `${d.slug}:${i}`,
    text,
    from: d.slug,
    kind: null,
    stone: null,
  }));
}

const q = (s: string) => `“${clean(s)}”`;

/**
 * What the garden can deal. Each is a fact about the reader's own record
 * turned into a prompt; the tool picks none of them over another.
 */
export function gardenCards(
  nodes: GardenNode[],
  values: { name: string }[],
): Card[] {
  const out: Card[] = [];
  const card = (kind: GardenKind, n: GardenNode | null, text: string, id: string) =>
    out.push({
      id: `garden:${kind}:${id}`,
      text,
      from: "garden",
      kind,
      stone: n ? { id: n.id, label: n.label } : null,
    });
  for (const n of nodes) {
    if (!n.label || n.kind === "repo") continue;
    if (n.kind === "ghost") {
      card("ghost", n, `${q(n.label)} was named and never written. Write its first line.`, n.id);
      continue;
    }
    if (n.stage === "fallow")
      card("fallow", n, `Go back to ${q(n.label)}. It has been lying fallow. What did it know?`, n.id);
    if (n.kind === "concept" && n.signed) card("concept", n, `Hold it against ${clean(n.label)}.`, n.id);
    if (n.stage === "fresh")
      card(
        "fresh",
        n,
        `You touched ${q(n.label)} lately. Is this the same thing under another name?`,
        n.id,
      );
  }
  values.forEach((v, i) => {
    if (v.name) card("value", null, `Serve only ${clean(v.name)} for the next hour.`, String(i));
  });
  return out;
}

/** Fisher–Yates on a seed: the same seed deals the same order, and nothing repeats until the pool is out. */
export function shuffle<T>(items: T[], seed: number): T[] {
  const r = rand(seed);
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type Tally = {
  decks: { slug: string; title: string; n: number; own: boolean }[];
  cards: number;
  garden: Record<GardenKind, number>;
  gardenTotal: number;
};

export function tally(decks: Deck[], garden: Card[]): Tally {
  const g: Record<GardenKind, number> = { fallow: 0, ghost: 0, concept: 0, value: 0, fresh: 0 };
  for (const c of garden) if (c.kind) g[c.kind]++;
  return {
    decks: decks.map((d) => ({ slug: d.slug, title: d.title, n: d.cards.length, own: d.own })),
    cards: decks.reduce((s, d) => s + d.cards.length, 0),
    garden: g,
    gardenTotal: garden.length,
  };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Facts about the shuffle, none a verdict on any card. */
export function readings(
  t: Tally,
  { pool, dealt, notes }: { pool: number; dealt: number; notes: number },
): string[] {
  const out: string[] = [];
  out.push(
    t.decks.length
      ? `${plural(t.cards, "card")} in ${plural(t.decks.length, "deck")}: ` +
          t.decks.map((d) => `${d.title} (${d.n})`).join(", ")
      : "no deck",
  );
  if (t.gardenTotal) {
    const parts = GARDEN_KINDS.filter((k) => t.garden[k]).map(
      (k) => `${t.garden[k]} ${GARDEN_KIND_LABEL[k]}`,
    );
    out.push(`the garden can deal ${t.gardenTotal}: ${parts.join(" · ")}`);
  } else out.push("the garden has nothing to deal yet");
  out.push(pool ? `${pool} in the shuffle now` : "nothing in the shuffle — every source is struck");
  out.push(dealt ? `dealt ${dealt} this sitting` : "nothing dealt yet this sitting");
  out.push(
    notes
      ? `${plural(notes, "note")} in the margin about a card`
      : "no note in the margin about a card yet",
  );
  return out;
}
