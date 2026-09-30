import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ARRANGEMENTS,
  AVERAGE_WPM,
  FOR_YOU,
  PASSAGES,
  SOURCES,
  TRY_LINE,
  WHO,
} from "../content/unison.ts";
import {
  HOLDS,
  WAYS,
  draw,
  load,
  matched,
  paceReading,
  rng,
  roundsReading,
  sentences,
  spreadChance,
  spreadReading,
  wordAt,
  words,
  wpm,
} from "./unison.ts";

test("three passages of about the same length, four questions each with three different options", () => {
  assert.equal(PASSAGES.length, 3);
  assert.equal(new Set(PASSAGES.map((p) => p.id)).size, 3);
  const lens = PASSAGES.map((p) => p.text.length);
  assert.ok(Math.max(...lens) / Math.min(...lens) < 1.1, String(lens));
  for (const p of PASSAGES) {
    assert.equal(p.questions.length, 4, p.id);
    for (const q of p.questions) {
      assert.equal(new Set(q.options).size, 3, q.q);
      assert.ok(q.q.endsWith("?"), q.q);
    }
  }
});

test("the answer the passage has is in the passage, for every question about a detail", () => {
  const find = (id: string, needle: string) =>
    assert.ok(
      PASSAGES.find((p) => p.id === id)!
        .text.toLowerCase()
        .includes(needle),
      `${id}: ${needle}`,
    );
  find("ferry", "wet linen sheet");
  find("ferry", "four crossings");
  find("ferry", "one jar in every nine");
  find("ferry", "row the ferry once the following spring");
  find("clock", "eleven minutes slow");
  find("clock", "by the first librarian");
  find("clock", "fell by a third");
  find("clock", "only in latin");
  find("moss", "four iron pins");
  find("moss", "more than half green");
  find("moss", "walkers who step off the path");
  find("moss", "they counted forty-one");
});

test("a draw gives each way once and each passage once, with every option shown", () => {
  for (const seed of [1, 2, 3, 42, 99]) {
    const d = draw(PASSAGES, rng(seed));
    assert.deepEqual(d.map((r) => r.way).sort(), [...WAYS].sort());
    assert.deepEqual(
      d.map((r) => r.passage).sort(),
      PASSAGES.map((p) => p.id).sort(),
    );
    for (const r of d)
      for (const o of r.orders) assert.deepEqual([...o].sort(), [0, 1, 2]);
  }
  assert.deepEqual(draw(PASSAGES, rng(7)), draw(PASSAGES, rng(7)));
  const ways = new Set(
    [1, 2, 3, 4, 5, 6, 7, 8].map((s) =>
      draw(PASSAGES, rng(s))
        .map((r) => r.way)
        .join(),
    ),
  );
  assert.ok(ways.size > 1, "the order of the ways changes between sittings");
  const one = draw(PASSAGES, rng(3), ["eyes"]);
  assert.equal(one.length, 1);
  assert.equal(one[0].way, "eyes");
});

test("a voice's character index lands on the word it is in", () => {
  const ws = words("The first jar  is never sold.");
  assert.deepEqual(
    ws.map((w) => w.text),
    ["The", "first", "jar", "is", "never", "sold."],
  );
  assert.equal(wordAt(ws, 0), 0);
  assert.equal(wordAt(ws, 4), 1);
  assert.equal(wordAt(ws, 6), 1);
  assert.equal(wordAt(ws, 13), 2, "between two words: the last begun");
  assert.equal(wordAt(ws, 15), 3);
  assert.equal(wordAt(ws, 99), 5);
  assert.equal(wordAt(words("  lead"), 0), -1);
  assert.equal(wordAt([], 3), -1);
});

test("sentences keep their place in the passage, so a sentence's boundary maps back", () => {
  for (const p of PASSAGES) {
    const ss = sentences(p.text);
    assert.ok(ss.length >= 5, p.id);
    for (const s of ss)
      assert.equal(p.text.slice(s.start, s.start + s.text.length), s.text);
    assert.equal(
      ss.map((s) => s.text).join(" "),
      p.text,
      "nothing dropped between sentences",
    );
  }
  assert.deepEqual(
    sentences("One. Two, 1.5 more! “Three.” Four").map((s) => s.text),
    ["One.", "Two, 1.5 more!", "“Three.”", "Four"],
  );
  assert.ok(sentences(TRY_LINE).length === 1);
});

test("words a minute", () => {
  assert.equal(wpm(120, 30000), 240);
  assert.equal(wpm(129, 45000), 172);
  assert.equal(wpm(10, 0), null);
  assert.equal(wpm(0, 1000), null);
});

test("an answer counts when it is the one the passage has", () => {
  assert.equal(matched([0, 1, 0, null]), 2);
  assert.equal(matched([]), 0);
});

test("how often chance alone spreads the rounds that far", () => {
  assert.equal(spreadChance([3, 3, 3]), 1);
  assert.ok(Number.isNaN(spreadChance([3])));
  // At one in two, a round of four lands on none or all once in sixteen each.
  assert.ok(Math.abs(spreadChance([0, 4]) - 2 / 256) < 1e-12);
  const a = spreadChance([2, 3, 4]);
  assert.ok(a > 0 && a < 1);
  assert.equal(spreadChance([4, 3, 2]), a, "order does not matter");
  assert.ok(spreadChance([1, 2, 3]) > spreadChance([0, 2, 4]));
  // Checked against a thousand thousand draws at 9 in 12.
  const r = rng(11);
  let far = 0;
  const N = 200000;
  for (let i = 0; i < N; i++) {
    const s = [0, 0, 0].map(() => {
      let k = 0;
      for (let j = 0; j < 4; j++) if (r() < 0.75) k++;
      return k;
    });
    if (Math.max(...s) - Math.min(...s) >= 2) far++;
  }
  assert.ok(Math.abs(far / N - a) < 0.006, `${far / N} vs ${a}`);
});

test("the readings say counts and paces, never a verdict on the reader", () => {
  const verdict =
    /\b(better|worse|best|worst|should|wrong|right|correct|incorrect|good|bad|failed|poor|slow reader|fast reader|winner|score)\b/i;
  const sets = [
    [
      { way: "ears" as const, matched: 2 },
      { way: "eyes" as const, matched: 3 },
      { way: "both" as const, matched: 4 },
    ],
    [
      { way: "both" as const, matched: 1 },
      { way: "eyes" as const, matched: 1 },
      { way: "ears" as const, matched: 1 },
    ],
    [{ way: "eyes" as const, matched: 0 }],
    [
      { way: "eyes" as const, matched: 4 },
      { way: "ears" as const, matched: 0 },
    ],
  ];
  for (const s of sets) {
    assert.doesNotMatch(roundsReading(s), verdict);
    assert.doesNotMatch(spreadReading(s), verdict);
  }
  assert.equal(
    roundsReading(sets[0]),
    "You answered two of four as the passage had it after hearing, three after reading, and four after both at once.",
  );
  assert.equal(
    spreadReading(sets[1]),
    "All three rounds came out the same, one of four each.",
  );
  assert.match(spreadReading(sets[0]), /in \d+ sittings out of 100\.$/);
  for (const [you, voice, left] of [
    [320, 170, 12],
    [180, 175, null],
    [140, 190, 0],
    [null, 170, null],
    [250, null, null],
  ] as const) {
    const s = paceReading({
      you,
      voice,
      average: AVERAGE_WPM,
      leftEarly: left,
    });
    assert.doesNotMatch(s, verdict, s);
    assert.match(s, /Brysbaert, 2019/);
  }
  assert.match(
    paceReading({ you: 320, voice: 160, average: 238 }),
    /about 2 times as long/,
  );
});

test("the sketch's toy load: the same words twice fit, other words spill, a picture has its own store", () => {
  const at = (id: string) => {
    const a = ARRANGEMENTS.find((x) => x.id === id);
    assert.ok(a, id);
    return load(a);
  };
  const both = at("both");
  assert.ok(both.wordsEye + both.wordsEar <= HOLDS);
  const other = at("other");
  assert.ok(other.wordsEye + other.wordsEar > HOLDS);
  const narrated = at("narrated");
  assert.equal(narrated.wordsEye, 0);
  assert.ok(narrated.pictures > 0 && !narrated.split);
  assert.ok(at("printed").split);
  assert.ok(at("printed").missed > 0 && narrated.missed === 0);
  assert.ok(at("printed").pictures < narrated.pictures);
  assert.ok(at("redundant").split && at("redundant").wordsEar > 0);
});

test("seven arrangements, every finding sourced, every source cited", () => {
  assert.equal(ARRANGEMENTS.length, 7);
  assert.equal(new Set(ARRANGEMENTS.map((a) => a.id)).size, 7);
  const keys = new Set(SOURCES.map((s) => s.key));
  assert.equal(keys.size, SOURCES.length);
  const cited = new Set<string>();
  const whos = new Set(WHO.map((w) => w.id));
  for (const f of [...ARRANGEMENTS.flatMap((a) => a.findings), ...FOR_YOU]) {
    assert.ok(f.src.length > 0, f.says);
    for (const k of f.src) {
      assert.ok(keys.has(k), `${k} in ${f.says}`);
      cited.add(k);
    }
    if (f.who) assert.ok(whos.has(f.who), f.who);
    assert.ok(f.says.endsWith("."), f.says);
  }
  for (const a of ARRANGEMENTS) assert.ok(a.findings.length > 0, a.id);
  for (const k of keys) assert.ok(cited.has(k), `${k} is never cited`);
  for (const s of SOURCES) assert.ok(s.doi || s.venue, s.key);
});
