import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampParts,
  clampPasses,
  heaviest,
  inHundred,
  parseSieve,
  partsNow,
  ratio,
  readings,
  serialiseSieve,
  shares,
  splitPair,
  stagesOf,
  tally,
  validateSieve,
  weight,
  wholeReadings,
} from "./sieve.ts";
import { SPECIMEN_SIEVES } from "../content/sieve.ts";

const [JUNIOR, ROBBER] = SPECIMEN_SIEVES;
const VERDICT =
  /\b(right|wrong|correct|true|false|likely|unlikely|probab\w*|should|better|worse|rational|irrational|calibrated|good|bad|guilty|innocent)\b/i;

test("nothing passes at 0 or 100, and a width is always some parts", () => {
  assert.equal(clampPasses(0), 1);
  assert.equal(clampPasses(100), 99);
  assert.equal(clampPasses(79.6), 80);
  assert.equal(clampPasses(Number.NaN), 50);
  assert.equal(clampParts(0), 1);
  assert.equal(clampParts(-3), 1);
  assert.equal(clampParts(Number.NaN), 1);
  assert.equal(clampParts(0.0001), 0.01);
  assert.equal(clampParts(12.3456), 12.346);
});

test("the primer's numbers: 1 : 100 sifted at 80 : 10 leaves 1 : 12.5", () => {
  const [st] = stagesOf(ROBBER);
  assert.deepEqual(st.before, [1, 100]);
  assert.deepEqual(st.product, [0.8, 10]);
  assert.deepEqual(st.after, [1, 12.5]);
  assert.equal(ratio(st.after), "1 : 12.5");
  assert.equal(ratio([80, 1000]), "1 : 12.5");
  assert.deepEqual(shares([1, 12.5]).map(inHundred), ["7.4", "92.6"]);
  assert.equal(inHundred(0.004), "<1");
  assert.equal(inHundred(0.996), ">99");
  assert.deepEqual(weight([80, 10], 0, 1), { for: 0, against: 1, factor: 8 });
  assert.deepEqual(weight([10, 80], 0, 1), { for: 1, against: 0, factor: 8 });
  assert.deepEqual(heaviest([30, 10, 60]), { for: 2, against: 1, factor: 6 });
});

test("each sighting is sifted through what passed the one before", () => {
  const [a, b] = stagesOf(JUNIOR);
  assert.deepEqual(a.before, [1, 3]);
  assert.deepEqual(a.product, [0.7, 1.2]);
  assert.deepEqual(b.before, a.after);
  const now = partsNow(JUNIOR);
  // 1·0.7·0.15 : 3·0.4·0.6 = 0.105 : 0.72 → 1 : 6.857…
  assert.equal(ratio(now), "1 : 6.86");
  assert.deepEqual(partsNow({ ...JUNIOR, sightings: [] }), [1, 3]);
});

test("the tally counts turns and the heaviest sighting; the readings never judge", () => {
  const t = tally(JUNIOR);
  assert.equal(t.n, 2);
  assert.equal(t.ledBefore, 1);
  assert.equal(t.lead, 1);
  assert.deepEqual(t.turns, []);
  assert.deepEqual(t.heaviest, { i: 1, for: 1, against: 0, factor: 4 });
  assert.ok(t.level && Math.abs(t.level.factor - 6.857) < 0.01);
  const r = readings(JUNIOR, t, [{ name: "care", hits: ["junior"] }]);
  assert.equal(r[0], "before looking, lost : quiet at 1 : 3");
  assert.equal(
    r[1],
    "2 sightings sifted: ‘A whole week without a question, in t…’ passed 70 in 100 of lost and 40 in 100 of quiet — 1.75 to 1 for lost; ‘His first change came in clean, with…’ passed 15 in 100 of lost and 60 in 100 of quiet — 4 to 1 for quiet",
  );
  assert.equal(
    r[2],
    "what passes, by your numbers: 1 : 6.86 — lost 12.7 in 100, quiet 87.3 in 100",
  );
  assert.equal(r[3], "quiet was widest before looking and is widest now");
  assert.equal(
    r[4],
    "the sighting that weighed most was ‘His first change came in clean, with…’, 4 to 1 for quiet",
  );
  assert.equal(
    r[5],
    "for lost to draw level with quiet would take a sighting weighing 6.86 to 1 for it",
  );
  assert.equal(r[6], "leans on 'care', by their terms");
  for (const s of r) assert.doesNotMatch(s, VERDICT);
});

test("a sighting can turn the widest column, and an empty sieve says so", () => {
  const turned = {
    ...ROBBER,
    sightings: [
      ...ROBBER.sightings,
      {
        on: "2026-09-21",
        saw: "He climbed in through the window.",
        passes: [95, 5],
      },
    ],
  };
  const t = tally(turned);
  assert.deepEqual(t.turns, [{ after: 1, lead: 0 }]);
  const r = readings(turned, t, []);
  assert.equal(
    r[3],
    "the widest column changed hands 1 time: after ‘He climbed in through the window.’, robber",
  );
  assert.equal(
    r[4],
    "the sighting that weighed most was ‘He climbed in through the window.’, 19 to 1 for robber",
  );
  for (const s of r) assert.doesNotMatch(s, VERDICT);
  const bare = readings(
    { ...ROBBER, sightings: [] },
    tally({ ...ROBBER, sightings: [] }),
    [],
  );
  assert.equal(bare[0], "nothing sifted yet");
  assert.equal(
    bare[1],
    "before looking, robber : honest at 1 : 100 — robber <1 in 100, honest >99 in 100",
  );
  const level = tally({
    ...ROBBER,
    worlds: [
      { name: "a", parts: 2 },
      { name: "b", parts: 2 },
    ],
    sightings: [],
  });
  assert.equal(level.level, null);
});

test("the whole sieve is counted", () => {
  assert.deepEqual(wholeReadings([]), ["nothing on the sieve yet"]);
  assert.deepEqual(wholeReadings(SPECIMEN_SIEVES), [
    "2 questions on the sieve · 3 sightings sifted in all",
  ]);
  const w = wholeReadings([
    ...SPECIMEN_SIEVES,
    {
      ...ROBBER,
      slug: "x",
      sightings: [],
      worlds: [...ROBBER.worlds, { name: "cat", parts: 20 }],
    },
  ]);
  assert.equal(w[1], "1 with nothing sifted yet");
  assert.equal(w[2], "1 with more than two worlds");
});

test("dragging the line between two columns keeps their parts between them", () => {
  assert.deepEqual(splitPair([1, 100], 0, 0.5), [51, 50]);
  assert.deepEqual(splitPair([1, 100], 0, 0.001), [1, 100]);
  assert.deepEqual(splitPair([1, 3], 0, 0.5), [2, 2]);
  assert.deepEqual(splitPair([1, 3, 6], 1, 0.25), [1, 2.3, 6.7]);
  assert.deepEqual(splitPair([1, 3], 5, 0.5), [1, 3]);
});

test("a sieve survives the round trip through its file", () => {
  for (const s of SPECIMEN_SIEVES) {
    const back = parseSieve(s.slug, serialiseSieve(s));
    assert.deepEqual(back, s);
  }
  const raw = serialiseSieve(ROBBER);
  assert.match(raw, /^### 2026-09-20 · passes 80 : 10$/m);
  assert.match(raw, /- \{ name: "robber", parts: 1 \}/);
});

test("validation clamps, pads and refuses what is not a sieve", () => {
  assert.throws(
    () => validateSieve({ question: "  " }, "2026-09-26"),
    /needs its words/,
  );
  assert.throws(
    () =>
      validateSieve(
        { question: "Which?", worlds: [{ name: "a", parts: 1 }] },
        "2026-09-26",
      ),
    /at least two worlds/,
  );
  const s = validateSieve(
    {
      question: "Which is it?",
      worlds: [
        { name: "", parts: 0 },
        { name: "b", parts: "4" },
        { name: "c", parts: 2 },
      ],
      sightings: [
        { on: "not a day", saw: "a thing", passes: [120, -4] },
        { on: "2026-09-25", saw: "   ", passes: [50, 50, 50] },
      ],
    },
    "2026-09-26",
  );
  assert.deepEqual(s.worlds, [
    { name: "world 1", parts: 1 },
    { name: "b", parts: 4 },
    { name: "c", parts: 2 },
  ]);
  assert.equal(s.sightings.length, 2, "an unnamed sighting is kept — it is being drawn");
  assert.deepEqual(s.sightings[0], {
    on: "2026-09-26",
    saw: "a thing",
    passes: [99, 1, 50],
  });
  assert.deepEqual(s.sightings[1], {
    on: "2026-09-25",
    saw: "",
    passes: [50, 50, 50],
  });
  assert.equal(s.title, "Which is it?");
  assert.equal(s.slug, "2026-09-26-which-is-it");
});
