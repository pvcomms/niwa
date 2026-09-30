import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ASKED,
  CLASSIC,
  CLASSIC_WORDS,
  SITUATIONS,
  STEPS,
} from "../content/crowd.ts";
import {
  chance,
  counts,
  dialOfRare,
  leans,
  order,
  pct,
  rareOfDial,
  readings,
  story,
} from "./crowd.ts";

test("the classic crowd: one in a thousand, a 99% test, nine in a hundred", () => {
  assert.ok(Math.abs(chance(CLASSIC) - 0.0902) < 0.001);
  assert.deepEqual(counts(CLASSIC), {
    so: 1,
    not: 999,
    caught: 1,
    missed: 0,
    alarms: 10,
    flagged: 11,
  });
  assert.equal(pct(chance(CLASSIC)), "9");
});

test("when the thing is common the same test's positives are mostly so", () => {
  const spam = SITUATIONS.find((s) => s.slug === "spam")!;
  assert.equal(pct(chance(spam.crowd)), "99");
  assert.ok(chance(spam.crowd) > chance(CLASSIC) * 10);
});

test("the seats are a stable permutation", () => {
  const a = order(7);
  assert.equal(a.length, 1000);
  assert.deepEqual(
    [...a].sort((x, y) => x - y),
    Array.from({ length: 1000 }, (_, i) => i),
  );
  assert.deepEqual(order(7), a);
  assert.notDeepEqual(order(8), a);
});

test("the rare dial round-trips the numbers a person would say", () => {
  for (const n of [2, 10, 100, 500, 1000])
    assert.equal(rareOfDial(dialOfRare(n)), n);
  assert.equal(rareOfDial(0), 2);
  assert.equal(rareOfDial(100), 1000);
});

test("a share is said as a person would", () => {
  assert.equal(pct(0.0902), "9");
  assert.equal(pct(0.168), "17");
  assert.equal(pct(0.005), "0.5");
  assert.equal(pct(0.999), "99+");
});

test("the story is whole people and ends on the count that matters", () => {
  const s = story(CLASSIC, CLASSIC_WORDS);
  assert.match(s, /^Of 1,000 people, 1 has the illness\./);
  assert.match(s, /flags 10 of the 999 who do not/);
  assert.match(s, /of the 11 flagged, 1 has the illness: 9 in 100\.$/);
  const none = story({ rare: 1000, catches: 0, flags: 0 }, CLASSIC_WORDS);
  assert.match(none, /flags no one/);
});

test("the leans are three counts beside the count, and the rare one moves it most here", () => {
  const l = leans(CLASSIC);
  assert.equal(l.length, 3);
  assert.ok(l[0].chance > chance(CLASSIC));
  assert.ok(l[1].chance > chance(CLASSIC));
  assert.ok(Math.abs(l[2].chance - chance(CLASSIC)) < 0.002);
});

test("no reading grades the reader or the test", () => {
  const verdict =
    /\b(should|wrong|right|true|false|good|bad|worry|worried|mistake|correct|incorrect|accurate)\b/i;
  for (const s of SITUATIONS)
    for (const guess of [null, 5, 60, 99])
      for (const r of readings(s.crowd, s.words, guess, ASKED))
        assert.doesNotMatch(r, verdict, r);
  for (const step of STEPS) assert.doesNotMatch(step.text, verdict, step.text);
});
