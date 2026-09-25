import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import { SLUG, parseDeck, serialiseDeck, type Deck } from "./oblique.ts";

/**
 * The reader's decks, one markdown file each beside the vault's notes: a
 * title in the frontmatter, then one card per paragraph. Written by hand, or
 * a card at a time from the desk. The garden's starter deck is not a file
 * here — it ships with the garden and is dealt alongside these.
 */
export const OBLIQUE_DIR =
  process.env.NIWA_OBLIQUE_DIR ?? path.join(GARDEN_DIR, "..", "oblique");

const file = (slug: string) => path.join(OBLIQUE_DIR, `${slug}.md`);

export function readDecks(): Deck[] {
  if (!fs.existsSync(OBLIQUE_DIR)) return [];
  return fs
    .readdirSync(OBLIQUE_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => parseDeck(f.slice(0, -3), fs.readFileSync(path.join(OBLIQUE_DIR, f), "utf8")));
}

export function readDeck(slug: string): Deck | null {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  if (!fs.existsSync(file(slug))) return null;
  return parseDeck(slug, fs.readFileSync(file(slug), "utf8"));
}

/** Add one card to a deck, making the deck if it is not there yet. */
export function addCard(slug: string, text: string): Deck {
  const d = readDeck(slug) ?? {
    slug,
    title: slug === "deck" ? "your deck" : slug.replace(/-/g, " "),
    cards: [],
    own: true,
  };
  d.cards.push(text);
  fs.mkdirSync(OBLIQUE_DIR, { recursive: true });
  fs.writeFileSync(file(slug), serialiseDeck(d));
  return d;
}

/** Take a card back out of a deck, by its place. */
export function removeCard(slug: string, index: number): Deck | null {
  const d = readDeck(slug);
  if (!d || index < 0 || index >= d.cards.length) return null;
  d.cards.splice(index, 1);
  fs.writeFileSync(file(slug), serialiseDeck(d));
  return d;
}
