import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AFTER,
  ITEMS,
  PRESETS,
  SEGMENTS,
  TRIVIAL,
  WILD_AGAIN,
} from "../content/familiar-voice.ts";
import {
  WARMEST,
  draw,
  gapReading,
  piecesText,
  reflect,
  reply,
  replyReading,
  replyText,
  rng,
  signed,
  tally,
} from "./familiar-voice.ts";

const said = (s: string) => piecesText(reflect(s));

test("the pool is eight statements that are so and eight that are not, each said word for word", () => {
  assert.equal(ITEMS.length, 16);
  assert.equal(ITEMS.filter((i) => i.so).length, 8);
  assert.equal(new Set(ITEMS.map((i) => i.id)).size, 16);
  for (const i of ITEMS) {
    assert.ok(i.text.endsWith("."), i.id);
    assert.ok(i.note.length > 0, i.id);
  }
});

test("a draw puts four of each into the answers and all sixteen into the judgment", () => {
  for (const seed of [1, 2, 3, 42, 99]) {
    const d = draw(ITEMS, rng(seed));
    const by = new Map(ITEMS.map((i) => [i.id, i]));
    assert.equal(d.exposure.length, 8);
    assert.equal(d.exposure.filter((id) => by.get(id)!.so).length, 4);
    assert.equal(new Set(d.exposure).size, 8);
    assert.deepEqual([...d.judgment].sort(), ITEMS.map((i) => i.id).sort());
  }
  assert.deepEqual(draw(ITEMS, rng(7)), draw(ITEMS, rng(7)));
  assert.notDeepEqual(
    draw(ITEMS, rng(7)).exposure,
    draw(ITEMS, rng(8)).exposure,
  );
});

test("the sentence is handed back with the pronouns turned round", () => {
  assert.equal(
    said(
      "I think I'm falling behind everyone I graduated with, and you keep telling me it's fine.",
    ),
    "you think you’re falling behind everyone you graduated with, and I keep telling you it’s fine",
  );
  assert.equal(
    said("My toaster burns one side of the bread."),
    "your toaster burns one side of the bread",
  );
  assert.equal(said("I was sure I am right"), "you were sure you are right");
  assert.equal(said("Sam never calls me back"), "Sam never calls you back");
  assert.equal(said("   "), "");
  const pieces = reflect("I dropped my grape");
  const swapped = pieces
    .filter((p) => "word" in p && p.swapped)
    .map((p) => ("word" in p ? p.word : ""));
  assert.deepEqual(swapped, ["you", "your"]);
});

test("warmth changes the feeling and never the information", () => {
  for (const s of [...PRESETS, ...TRIVIAL]) {
    const cold = reply(s, 0, SEGMENTS);
    const warm = reply(s, WARMEST, SEGMENTS);
    assert.equal(cold.feel, 0);
    assert.ok(warm.feel > 40);
    assert.equal(cold.yours, warm.yours);
    assert.equal(cold.stock, warm.stock);
    const content = (r: typeof cold) =>
      r.parts.filter((p) => p.content).map((p) => p.k);
    assert.deepEqual(content(cold), content(warm));
    let last = -1;
    for (let l = 0; l <= WARMEST; l++) {
      const f = reply(s, l, SEGMENTS).feel;
      assert.ok(f >= last);
      last = f;
    }
  }
  assert.match(
    replyText(reply(TRIVIAL[2], WARMEST, SEGMENTS)),
    /You mentioned that you dropped a grape under the fridge\./,
  );
  assert.equal(SEGMENTS.filter((s) => !s.content).length, 6);
});

test("the tally sets the eight met before beside the eight met once", () => {
  const exposure = ["T1", "T2", "T3", "T4", "F1", "F2", "F3", "F4"];
  const ratings: Record<string, number> = {};
  for (const i of ITEMS) ratings[i.id] = exposure.includes(i.id) ? 5 : 3;
  const t = tally(ITEMS, exposure, ratings);
  assert.equal(t.seen, 5);
  assert.equal(t.fresh, 3);
  assert.equal(t.gap, 2);
  assert.equal(t.notSoSeen, 5);
  assert.equal(t.notSoFresh, 3);
  assert.equal(t.rows.length, 16);
  assert.equal(signed(0.02), "0.0");
  assert.equal(signed(0.46), "+0.5");
  assert.equal(signed(-0.3), "−0.3");
});

test("no reading grades the reader", () => {
  const verdict =
    /\b(fooled|gullible|naive|should|wrong|mistake|failed|stupid|biased|good|bad|tricked)\b/i;
  for (const g of [-1.2, -0.3, -0.1, 0, 0.1, 0.3, 1.4])
    assert.doesNotMatch(gapReading(g), verdict);
  for (const [w, p] of [
    [6, 1],
    [3, 3],
    [1, 6],
  ])
    assert.doesNotMatch(replyReading(w, p), verdict);
  for (const s of [
    ...AFTER.eliza,
    AFTER.ayers,
    ...AFTER.mechanism,
    ...WILD_AGAIN,
  ])
    assert.doesNotMatch(s, verdict, s);
});
