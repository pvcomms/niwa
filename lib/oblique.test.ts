import assert from "node:assert/strict";
import { test } from "node:test";
import type { GardenNode } from "./garden.ts";
import {
  deckCards,
  gardenCards,
  parseDeck,
  readings,
  serialiseDeck,
  shuffle,
  tally,
  validateCard,
} from "./oblique.ts";
import { STARTER } from "../content/oblique.ts";

const node = (id: string, extra: Partial<GardenNode> = {}): GardenNode => ({
  id,
  label: id,
  kind: "note",
  description: "",
  body: "",
  file: null,
  modified: null,
  stage: "settled",
  signed: null,
  degree: 0,
  source: "vault",
  ...extra,
});

test("a deck file is one card per paragraph; a pasted list and a heading are read for what they are", () => {
  const d = parseDeck(
    "mine",
    `---\ntitle: my deck\n---\n\n# for mornings\n\nTurn it over.\n\n- Ask the body\n  first.\n\n* Stop.\n\n\n`,
  );
  assert.equal(d.title, "my deck");
  assert.deepEqual(d.cards, ["Turn it over.", "Ask the body first.", "Stop."]);
  const back = parseDeck("mine", serialiseDeck(d));
  assert.deepEqual(back, d);
  assert.equal(parseDeck("bare", "Just one.").title, "bare");
});

test("a card is one paragraph, never empty, never a page", () => {
  assert.equal(validateCard("  Do it   by hand.\n"), "Do it by hand.");
  assert.throws(() => validateCard(""), /empty/);
  assert.throws(() => validateCard("x".repeat(301)), /300/);
  assert.throws(() => validateCard(3), /text/);
});

test("the garden deals from what is fallow, unwritten, signed, fresh, and from the values", () => {
  const cards = gardenCards(
    [
      node("old idea", { stage: "fallow" }),
      node("never written", { kind: "ghost", stage: "unknown" }),
      node("Delegation Discount", { kind: "concept", signed: true, stage: "fresh" }),
      node("Borrowed term", { kind: "concept", signed: false }),
      node("some repo", { kind: "repo", stage: "fallow" }),
      node("settled note"),
    ],
    [{ name: "taste" }],
  );
  const kinds = cards.map((c) => c.kind);
  assert.deepEqual(kinds, ["fallow", "ghost", "concept", "fresh", "value"]);
  assert.equal(cards[0].stone?.id, "old idea");
  assert.match(cards[0].text, /lying fallow/);
  assert.match(cards[1].text, /never written/);
  assert.match(cards[2].text, /Hold it against Delegation Discount/);
  assert.equal(cards[4].stone, null);
  assert.ok(cards.every((c) => c.from === "garden"));
});

test("a seeded shuffle deals the same order twice and every card once before any again", () => {
  const cards = deckCards(STARTER);
  const a = shuffle(cards, 7);
  const b = shuffle(cards, 7);
  assert.deepEqual(a.map((c) => c.id), b.map((c) => c.id));
  assert.notDeepEqual(a.map((c) => c.id), cards.map((c) => c.id));
  assert.equal(new Set(a.map((c) => c.id)).size, cards.length);
  assert.deepEqual(shuffle([], 1), []);
});

test("the starter deck is whole and in its own words", () => {
  assert.ok(STARTER.cards.length >= 40);
  assert.equal(STARTER.own, false);
  for (const c of STARTER.cards) assert.equal(validateCard(c), c);
  assert.equal(new Set(STARTER.cards).size, STARTER.cards.length, "no card twice");
});

test("the readings count and never grade", () => {
  const t = tally([STARTER, { slug: "mine", title: "mine", cards: ["a", "b"], own: true }], [
    ...gardenCards([node("x", { stage: "fallow" }), node("g", { kind: "ghost" })], [{ name: "taste" }]),
  ]);
  assert.equal(t.cards, STARTER.cards.length + 2);
  assert.equal(t.gardenTotal, 3);
  const r = readings(t, { pool: 12, dealt: 3, notes: 0 });
  assert.match(r[0], /cards in 2 decks: the starter deck \(\d+\), mine \(2\)/);
  assert.match(r[1], /the garden can deal 3: 1 lying fallow · 1 unwritten · 1 your values/);
  assert.equal(r[2], "12 in the shuffle now");
  assert.equal(r[3], "dealt 3 this sitting");
  assert.equal(r[4], "no note in the margin about a card yet");
  const empty = readings(tally([], []), { pool: 0, dealt: 0, notes: 2 });
  assert.equal(empty[0], "no deck");
  assert.match(empty[2], /struck/);
  for (const s of [...r, ...empty])
    assert.doesNotMatch(s, /\b(best|should|score|recommend|better|worse|right|wrong)\b/i);
});
