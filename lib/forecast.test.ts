import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MIN_SCORED,
  baseRate,
  brier,
  evidence,
  parseSeal,
  readings,
  reveal,
  score,
  seal,
  sealLine,
  type Called,
  type Seal,
} from "./forecast.ts";
import { parseChoice, serialiseChoice } from "./taste.ts";

const s = (garden: number, base: number): Seal => ({
  garden,
  base,
  weight: 1,
  near: 2,
  nearIn: 1,
});

test("with no record the guess is even odds and says it rests on the base rate alone", () => {
  const x = seal([]);
  assert.equal(x.garden, 0.5);
  assert.equal(x.base, 0.5);
  assert.equal(x.near, 0);
  assert.match(evidence(x), /base rate alone/);
});

test("the base rate is Laplace's rule", () => {
  assert.equal(baseRate(0, 0), 0.5);
  assert.equal(baseRate(3, 4), 4 / 6);
  assert.equal(baseRate(0, 8), 0.1);
});

test("near things let in pull the guess up, and far ones are not asked", () => {
  const past = [
    { sim: 0.6, letIn: true },
    { sim: 0.5, letIn: true },
    { sim: 0.02, letIn: false },
    { sim: 0.01, letIn: false },
    { sim: 0.01, letIn: false },
  ];
  const x = seal(past);
  assert.equal(x.base, baseRate(2, 5));
  assert.equal(x.near, 2);
  assert.equal(x.nearIn, 2);
  assert.ok(x.garden > x.base);
  // (1.1 + 2 × 3/7) / (1.1 + 2)
  assert.ok(Math.abs(x.garden - (1.1 + (2 * 3) / 7) / 3.1) < 1e-9);
});

test("thin evidence stays near the base rate; a lot of it moves away", () => {
  const thin = seal([{ sim: 0.1, letIn: true }, ...Array(6).fill({ sim: 0, letIn: false })]);
  const thick = seal([
    ...Array(8).fill({ sim: 0.5, letIn: true }),
    ...Array(10).fill({ sim: 0, letIn: false }),
  ]);
  assert.ok(Math.abs(thin.garden - thin.base) < 0.1);
  assert.ok(thick.garden - thick.base > 0.3);
  assert.match(evidence(thin), /thin/);
  assert.match(evidence(thick), /fair amount/);
});

test("only the eight nearest are asked", () => {
  const x = seal([
    ...Array(8).fill({ sim: 0.9, letIn: false }),
    ...Array(8).fill({ sim: 0.8, letIn: true }),
  ]);
  assert.equal(x.near, 8);
  assert.equal(x.nearIn, 0);
});

test("brier is the squared distance from what happened", () => {
  assert.equal(brier(1, true), 0);
  assert.equal(brier(1, false), 1);
  assert.equal(brier(0.5, true), 0.25);
});

test("the record is scored against the base rate that stood each day", () => {
  const calls: Called[] = [
    ...Array(6).fill({ seal: s(0.9, 0.5), verdict: "let in" }),
    ...Array(6).fill({ seal: s(0.1, 0.5), verdict: "passed" }),
    { seal: null, verdict: "let in" },
    { seal: s(0.5, 0.5), verdict: "" },
  ];
  const r = score(calls);
  assert.equal(r.n, 12);
  assert.equal(r.unscored, 2);
  assert.equal(r.letIn, 6);
  assert.ok(Math.abs(r.garden - 0.01) < 1e-9);
  assert.equal(r.base, 0.25);
  assert.ok(Math.abs(r.skill! - 0.96) < 1e-9);
  assert.equal(r.leaned, 6);
  assert.equal(r.leanedIn, 6);
  assert.equal(r.bins[4].n, 6);
  assert.equal(r.bins[4].letIn, 1);
  assert.equal(r.bins[0].letIn, 0);
});

test("below the minimum a skill is counted, not said", () => {
  const r = score(Array(MIN_SCORED - 1).fill({ seal: s(0.7, 0.5), verdict: "let in" }));
  assert.equal(r.skill, null);
  assert.ok(readings(r).some((l) => l.includes(`after ${MIN_SCORED} calls`)));
});

test("a guess worse than the base rate reads as further, not as a failure", () => {
  const r = score(Array(12).fill({ seal: s(0.1, 0.5), verdict: "let in" }));
  assert.ok(r.skill! < 0);
  assert.ok(readings(r).some((l) => l.includes("further from what you did")));
});

test("no reading or reveal carries a verdict on the reader", () => {
  const verdict =
    /\b(should|wrong|right|good|bad|mistake|correct|incorrect|fail|failed|failure|better|worse|smart|poor|great)\b/i;
  const records: Called[][] = [
    [],
    Array(4).fill({ seal: s(0.7, 0.5), verdict: "passed" }),
    Array(12).fill({ seal: s(0.9, 0.5), verdict: "let in" }),
    Array(12).fill({ seal: s(0.1, 0.5), verdict: "let in" }),
    Array(12).fill({ seal: s(0.5, 0.5), verdict: "passed" }),
  ];
  for (const rec of records)
    for (const l of readings(score(rec))) assert.doesNotMatch(l, verdict, l);
  for (const x of [seal([]), s(0.8, 0.4), seal([{ sim: 0.1, letIn: true }])])
    for (const y of [true, false]) assert.doesNotMatch(reveal(x, y), verdict);
});

test("a seal round-trips through a choice file, and a choice without one still reads", () => {
  const seal0: Seal = { garden: 0.62, base: 0.45, weight: 1.84, near: 3, nearIn: 2 };
  assert.match(sealLine(seal0), /^forecast: \{garden: 0.62, base: 0.45/);
  const c = {
    slug: "a-thing",
    title: "A thing",
    source: "",
    weighed: "2026-09-30",
    verdict: "passed" as const,
    z: { themes_all: 1.2 },
    forecast: seal0,
    note: "",
    text: "Some words about a thing worth weighing.",
  };
  assert.deepEqual(parseChoice(c.slug, serialiseChoice(c)), c);
  const old = parseChoice("x", '---\ntitle: "x"\nverdict: "let in"\n---\nwords\n');
  assert.equal(old.forecast, null);
});

test("a seal from outside is refused unless every part of it is one", () => {
  assert.equal(parseSeal(null), null);
  assert.equal(parseSeal({ garden: 1.2, base: 0.5, weight: 1, near: 1, nearIn: 0 }), null);
  assert.equal(parseSeal({ garden: 0.5, base: 0.5, weight: 1, near: 1, nearIn: 2 }), null);
  assert.deepEqual(parseSeal({ garden: "0.5", base: 0.5, weight: 0, near: 0, nearIn: 0 }), {
    garden: 0.5,
    base: 0.5,
    weight: 0,
    near: 0,
    nearIn: 0,
  });
});
