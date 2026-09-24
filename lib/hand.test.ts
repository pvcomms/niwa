import { test } from "node:test";
import assert from "node:assert/strict";
import {
  jitter,
  rand,
  ribbon,
  roughEdge,
  roughEllipse,
  roughRect,
  roughUnderline,
  seedOf,
  stroke,
} from "./hand.ts";

const numbers = (d: string) => d.match(/-?\d+(\.\d+)?/g)!.map(Number);

test("a seed always draws the same line, and two seeds draw different ones", () => {
  assert.equal(roughRect(200, 40, 7), roughRect(200, 40, 7));
  assert.notEqual(roughRect(200, 40, 7), roughRect(200, 40, 8));
  assert.equal(seedOf("garden:the-rail"), seedOf("garden:the-rail"));
  assert.notEqual(seedOf("a"), seedOf("b"));
  const r = rand(1);
  const a = r();
  assert.ok(a >= 0 && a < 1);
});

test("every path is well-formed and finite", () => {
  for (const d of [
    stroke([0, 0], [100, 0], rand(3)),
    roughRect(320, 120, 11),
    roughEllipse(64, 22, 5),
    roughUnderline(180, 9),
    roughEdge(900, 2),
  ]) {
    assert.match(d, /^M/);
    assert.ok(numbers(d).every(Number.isFinite), d);
  }
});

test("a box stays within its overshoot of the box it was asked for", () => {
  const w = 300;
  const h = 80;
  const d = roughRect(w, h, 42, { overshoot: 3, wobble: 1.1 });
  const xs = numbers(d).filter((_, i) => i % 2 === 0);
  const ys = numbers(d).filter((_, i) => i % 2 === 1);
  const slack = 3 + 1.1 * 2 + 1;
  assert.ok(Math.min(...xs) >= -slack && Math.max(...xs) <= w + slack);
  assert.ok(Math.min(...ys) >= -slack && Math.max(...ys) <= h + slack);
});

test("the circling closes past its own start and stays just outside the box", () => {
  const d = roughEllipse(100, 30, 1, { pad: 4 });
  const xs = numbers(d).filter((_, i) => i % 2 === 0);
  const ys = numbers(d).filter((_, i) => i % 2 === 1);
  assert.ok(Math.min(...xs) < 0 && Math.max(...xs) > 100);
  assert.ok(Math.min(...ys) < 0 && Math.max(...ys) > 30);
  assert.ok(Math.min(...xs) > -12 && Math.max(...xs) < 112);
});

test("jitter is bounded", () => {
  const j = jitter(seedOf("x"), 0.6, 14);
  assert.ok(Math.abs(j.dx) <= 0.6 && Math.abs(j.dy) <= 0.6 && Math.abs(j.rot) <= 14);
});

test("a ribbon is a closed filled shape that hugs its centreline", () => {
  const line = roughRect(120, 40, 3);
  const ink = ribbon(line, 2, 3);
  const strokes = ink.split("M").filter(Boolean);
  assert.equal(strokes.length, 4); // one closed shape per side
  assert.ok(strokes.every((s) => s.endsWith("Z")));
  // never wider than the pen, never far from the box
  const xs = numbers(ink).filter((_, i) => i % 2 === 0);
  const ys = numbers(ink).filter((_, i) => i % 2 === 1);
  assert.ok(Math.min(...xs) > -8 && Math.max(...xs) < 128);
  assert.ok(Math.min(...ys) > -8 && Math.max(...ys) < 48);
  assert.equal(ribbon(line, 2, 3), ink);
});
