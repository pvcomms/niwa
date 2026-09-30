import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BODY,
  CARDS,
  METERS_AT_REST,
  VERDICT,
  WEIGHTS_AT_REST,
  emptyTrace,
  hailed,
  learn,
  nameOf,
  orderCards,
  parseTrace,
  readings,
  recordReadings,
  sediment,
  serialiseTrace,
  settle,
  shows,
  stimulate,
  tally,
  thinks,
  validateTrace,
  weightOf,
} from "./half-second.ts";
import { SPECIMEN_TRACES } from "../content/half-second.ts";

const [NIGHT, MORNING] = SPECIMEN_TRACES;
const outrage = CARDS.find((c) => c.tech === "outrage")!;
const comparison = CARDS.find((c) => c.tech === "comparison")!;
const buzz = CARDS.find((c) => c.tech === "buzz")!;

test("a card moves the body before anything is named, and a repeat lands softer", () => {
  const first = stimulate(BODY.base, outrage, 1, "pager");
  assert.ok(first.target.hr > BODY.base.hr + 10);
  assert.ok(first.k > 0.8 && first.k <= 1);
  const fifth = stimulate(BODY.base, outrage, 5, "pager");
  assert.ok(fifth.k < first.k * 0.3, "the fifth tap habituates");
});

test("texture has a history: the same cue lands at a different weight under each preset", () => {
  assert.ok(weightOf(buzz.tech, "pager") > weightOf(buzz.tech, "whatsapp"));
  assert.ok(weightOf(buzz.tech, "late") < weightOf(buzz.tech, "whatsapp"));
  assert.equal(weightOf("none", "late"), 1);
});

test("the gauges settle back; the meters do not", () => {
  let { target } = stimulate(BODY.base, outrage, 1, "pager");
  let g = { ...BODY.base };
  for (let i = 0; i < 12 * 120; i++)
    ({ g, target } = settle(g, target, 1 / 12));
  assert.ok(
    Math.abs(g.hr - BODY.base.hr) < 1,
    "two minutes on, the heart is back",
  );
  const m = sediment(METERS_AT_REST, outrage, 0.85, "followers");
  assert.ok(m.threat > METERS_AT_REST.threat + 15);
  assert.equal(m.standing, METERS_AT_REST.standing);
});

test("comparison only hurts under a norm that is shared", () => {
  const rafe = CARDS.find((c) => c.id === "c7")!;
  const underFitness = sediment(METERS_AT_REST, rafe, 0.6, "fitness");
  const underIncome = sediment(METERS_AT_REST, rafe, 0.6, "income");
  assert.ok(underFitness.standing < underIncome.standing);
  assert.ok(underIncome.standing > METERS_AT_REST.standing - 2);
});

test("the hail answered takes agency; let go, it gives a little back", () => {
  assert.equal(hailed(METERS_AT_REST, true).agency, 62);
  assert.equal(hailed(METERS_AT_REST, false).agency, 73);
});

test("the feed learns from a dwell and a tap, forgets a little on a skip, and orders by what it thinks", () => {
  let w = { ...WEIGHTS_AT_REST };
  w = learn(w, "outrage", "tap");
  w = learn(w, "outrage", "dwell");
  w = learn(w, "comparison", "skip");
  assert.equal(w.threat, 0.45);
  assert.equal(w.comparison, 0.22);
  assert.equal(learn(w, "none", "tap"), w, "a plain card teaches nothing");
  const order = orderCards(
    CARDS.map((c) => c.id),
    w,
    () => 0,
  );
  assert.equal(order[0], outrage.id);
  assert.match(thinks(w), /threat-responsive first/);
  const zero = { threat: 0, comparison: 0, hail: 0, reward: 0 };
  assert.deepEqual(
    orderCards(
      CARDS.map((c) => c.id),
      zero,
    ),
    ["c4", "c10", "c12"],
    "with nothing to serve, only the plain cards are left",
  );
  assert.match(thinks(zero), /nobody in particular/);
});

test("the same bloom under two vocabularies", () => {
  assert.equal(nameOf(0.71, "coarse"), "bad");
  assert.equal(nameOf(0.71, "granular"), "summoned");
  assert.equal(nameOf(0.05, "granular"), "unbothered");
});

test("what the trace shows is counts and times, never a reason", () => {
  const s = shows(NIGHT);
  assert.equal(s[0], "8 cards seen in 44 s");
  assert.equal(s[1], "the hail answered at 1.4 s");
  assert.ok(s.includes("3 pulls, the good card on pull 3"));
  assert.ok(s.includes("standing down 19 under income"));
  assert.ok(s.includes("put down at 44 s; the meters did not move"));
  assert.deepEqual(shows(emptyTrace("2026-09-30T10:00:00+02:00")), [
    "no trace yet",
  ]);
  for (const line of [...s, ...shows(MORNING)])
    assert.doesNotMatch(line, VERDICT, line);
});

test("the reading and the record count; neither passes a verdict", () => {
  const r = readings(NIGHT);
  assert.equal(r[0], "the feed's guess: threat-responsive first");
  assert.match(r[1], /^3 of 3 meters moved: standing reads I'm slipping/);
  assert.match(
    r[r.length - 1],
    /^what you would say: 28 words · what the trace shows: \d+ lines$/,
  );
  const m = readings(MORNING);
  assert.equal(m[0], "the feed's guess: comparison-responsive first");
  const rec = recordReadings(tally(SPECIMEN_TRACES));
  assert.deepEqual(rec, [
    "2 traces kept",
    "the hail answered in 1 of 2",
    "put down in 2 of 2",
    "standing down in 2, threat up in 1",
    "the feed's first guess: threat-responsive 1×, comparison-responsive 1×",
    "said in your own words in 2 of 2",
  ]);
  for (const line of [...r, ...m, ...rec])
    assert.doesNotMatch(line, VERDICT, line);
  assert.deepEqual(recordReadings(tally([])), ["no trace kept yet"]);
});

test("a trace survives the file", () => {
  for (const t of SPECIMEN_TRACES) {
    const back = parseTrace(t.slug, serialiseTrace(t));
    assert.deepEqual(back.events, t.events);
    assert.equal(back.say, t.say);
    assert.equal(back.after, t.after);
    assert.equal(back.preset, t.preset);
    assert.equal(back.norm, t.norm);
    assert.equal(back.vocab, t.vocab);
    assert.equal(back.meters.standing, Math.round(t.meters.standing * 10) / 10);
    assert.equal(back.weights.threat, t.weights.threat);
    assert.equal(back.peak, t.peak);
  }
});

test("validation keeps a trace honest and names it by the minute it began", () => {
  const t = validateTrace({
    at: "2026-09-30T23:41:00+02:00",
    events: [
      { kind: "tap", at: 100, card: "c3", n: 1 },
      { kind: "nonsense", at: 5 },
      { kind: "tap", at: 200, card: "not-a-card" },
    ],
    meters: { standing: 400, threat: -3 },
    weights: { threat: 9 },
    preset: "vinyl",
    say: "x".repeat(3000),
  });
  assert.equal(t.slug, "2026-09-30-2341");
  assert.equal(t.events.length, 2);
  assert.equal(t.events[1].card, undefined);
  assert.equal(t.meters.standing, 100);
  assert.equal(t.meters.threat, 0);
  assert.equal(t.weights.threat, 1);
  assert.equal(t.preset, "pager");
  assert.equal(t.say.length, 2000);
  assert.throws(() => validateTrace({ at: "yesterday" }), /needs the time/);
});
