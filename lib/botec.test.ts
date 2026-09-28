import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DRAWS,
  Z90,
  above,
  axisOf,
  breakDown,
  distOf,
  emptyBotec,
  flatten,
  fmt,
  newLine,
  nudge,
  outdent,
  parseBotec,
  place,
  readGuess,
  readings,
  recordReadings,
  removeLine,
  serialiseBotec,
  stackDots,
  summarise,
  swingOf,
  tally,
  validateBotec,
  work,
  writeGuess,
  zOf,
  type Botec,
  type Line,
} from "./botec.ts";
import { EXAMPLE_BOTEC, SPECIMEN_BOTECS } from "../content/botec.ts";

const [CHECK, HARLOW] = SPECIMEN_BOTECS;
const VERDICT =
  /\b(you should|should|worth|wise|unwise|good|bad|better|worse|mistake|wrong|recommend\w*|score|accura\w*|too (high|low|much|little))\b/i;
const line = (
  op: Line["op"],
  label: string,
  value: string,
  lines: Line[] = [],
): Line => ({
  ...newLine(op, label, value),
  lines,
});

test("a guess is read the way it is written", () => {
  const point = (t: string) => {
    const g = readGuess(t);
    assert.equal(g.kind, "point", t);
    return g.kind === "point" ? g : null!;
  };
  const range = (t: string) => {
    const g = readGuess(t);
    assert.equal(g.kind, "range", t);
    return g.kind === "range" ? g : null!;
  };
  assert.equal(point("3.7M").at.v, 3.7e6);
  assert.equal(point("3m people").at.v, 3e6);
  assert.equal(point("3m people").unit, "people");
  assert.equal(
    point("5km").at.v,
    5,
    "a letter that starts a word is a unit, not a thousand",
  );
  assert.equal(point("1,200").at.v, 1200);
  assert.equal(point("2×10^6").at.v, 2e6);
  assert.equal(point("10^6").at.v, 1e6);
  assert.equal(point("~30").at.v, 30);
  assert.ok(Math.abs(point("1/3").at.v - 1 / 3) < 1e-12);
  const pay = point("£40 an hour");
  assert.deepEqual([pay.at.v, pay.cur, pay.unit], [40, "£", "an hour"]);
  const m = range("2 to 3M");
  assert.deepEqual(
    [m.lo.v, m.hi.v],
    [2e6, 3e6],
    "a suffix on the top end is read on both",
  );
  const pct = range("3-10%");
  assert.deepEqual([pct.lo.v, pct.hi.v, pct.share], [0.03, 0.1, true]);
  const odds = range("1 in 20 to 1 in 5");
  assert.deepEqual([odds.lo.v, odds.hi.v, odds.share], [0.05, 0.2, true]);
  assert.deepEqual([range("20–50").lo.v, range("50 to 20").lo.v], [20, 20]);
  assert.equal(range("between 4 and 6 weeks").unit, "weeks");
  assert.equal(range("-5 to 10").lo.v, -5);
  assert.equal(range("£5k-£40k").cur, "£");
  assert.equal(readGuess("").kind, "empty");
  assert.equal(readGuess("=").kind, "down");
  assert.equal(readGuess("a lot").kind, "bad");
  assert.equal(
    readGuess("3 x 4").kind,
    "bad",
    "arithmetic in a line is not a number",
  );
});

test("a range is the middle nine in ten of its draws, laid evenly through it", () => {
  const draws = (t: string) => {
    return work([line("×", "", t)]).out!;
  };
  for (const [t, lo, hi] of [
    ["20 to 50", 20, 50],
    ["1 in 20 to 1 in 5", 0.05, 0.2],
    ["-5 to 10", -5, 10],
  ] as const) {
    const s = summarise(draws(t))!;
    assert.ok(
      Math.abs(s.lo - lo) / Math.abs(hi - lo) < 0.01,
      `${t}: bottom ${s.lo}`,
    );
    assert.ok(
      Math.abs(s.hi - hi) / Math.abs(hi - lo) < 0.01,
      `${t}: top ${s.hi}`,
    );
  }
  assert.ok(
    Math.abs(summarise(draws("20 to 50"))!.mid - Math.sqrt(1000)) < 0.5,
    "by ratio, the middle is 32",
  );
  assert.equal(distOf(readGuess("1 in 20 to 1 in 5"))!.kind, "logit");
  const share = summarise(draws("50% to 100%"))!;
  assert.ok(
    share.hi <= 1 && share.lo >= 0.4,
    "a share written up to all never draws past it",
  );
  assert.ok(
    summarise(draws("0 to 10"))!.lo >= 0,
    "a range written from nothing never draws below it",
  );
  assert.deepEqual(zOf("3"), zOf("3"), "the same place, the same draws");
  assert.equal(Z90.toFixed(4), "1.6449");
});

test("the lines are worked down the page, a broken-down line first", () => {
  const w = work(EXAMPLE_BOTEC.lines);
  assert.equal(w.rows.length, 7);
  assert.deepEqual(
    w.rows.map((r) => r.path),
    ["0", "1", "2", "3", "4", "4.0", "4.1"],
  );
  const s = summarise(w.out)!;
  // Every line multiplies or divides, so the middle is the middles multiplied: about 129.
  assert.ok(s.mid > 118 && s.mid < 140, `the middle ${s.mid}`);
  assert.ok(s.lo > 40 && s.hi < 380 && s.lo < s.mid && s.mid < s.hi);
  const sum = work([
    line("×", "", "10"),
    line("+", "", "5"),
    line("×", "", "2"),
    line("−", "", "4"),
    line("÷", "", "2"),
  ]);
  assert.equal(
    sum.out![0],
    13,
    "((10 + 5) × 2 − 4) ÷ 2: taken in order, not by precedence",
  );
  const gaps = work([
    line("×", "", "10"),
    line("×", "", ""),
    line("×", "", "a lot"),
    line("×", "", "3"),
  ]);
  assert.deepEqual([gaps.out![0], gaps.empty, gaps.bad], [30, 1, ["a lot"]]);
  const nothing = work([line("×", "", "1"), line("÷", "", "-1 to 1")]);
  assert.ok(
    nothing.lost === 0 || nothing.lost < DRAWS,
    "division by a range across nothing keeps most draws",
  );
});

test("dragging one line moves the answer without dealing the others again", () => {
  const before = work(EXAMPLE_BOTEC.lines);
  const moved = EXAMPLE_BOTEC.lines.map((l, i) =>
    i === 2 ? { ...l, value: "1 in 10 to 1 in 4" } : l,
  );
  const after = work(moved);
  assert.deepEqual(before.rows[0].own, after.rows[0].own);
  assert.deepEqual(before.rows[5].own, after.rows[5].own);
  assert.notDeepEqual(before.out, after.out);
  const g = readGuess("1 in 20 to 1 in 5");
  assert.equal(
    writeGuess(nudge(g, "both", 2)),
    "1 in 11 to 1 in 3",
    "a share moves by its odds",
  );
  assert.equal(
    writeGuess(nudge(readGuess("2.5M to 3M"), "hi", 2)),
    "2.5M to 6M",
  );
  assert.equal(
    writeGuess(nudge(readGuess("20 to 50"), "lo", 4)),
    "50 to 50",
    "the ends never cross",
  );
  assert.equal(
    writeGuess(nudge(readGuess("£40 an hour"), "both", 1.5)),
    "£60 an hour",
  );
  assert.equal(writeGuess(nudge(readGuess("30%"), "both", 1.5)), "39%");
  assert.equal(
    writeGuess(readGuess("£5k to £40k"), 4),
    "£5k to £40k",
    "shown as written",
  );
  assert.equal(writeGuess(nudge(readGuess("5k"), "both", 1.2)), "6k");
});

test("the swing: each range from bottom to top with the rest at their middles, widest first", () => {
  const { base, swings } = swingOf(EXAMPLE_BOTEC.lines);
  assert.ok(base! > 118 && base! < 140);
  assert.equal(swings[0].label, "households with a piano");
  assert.ok(
    swings.every(
      (s, i) => i === 0 || s.hi - s.lo <= swings[i - 1].hi - swings[i - 1].lo,
    ),
  );
  assert.ok(swings.every((s) => s.lo <= base! && base! <= s.hi));
  assert.equal(
    swings.length,
    6,
    "every range, the broken-down line's own included",
  );
  assert.equal(
    swingOf([line("×", "", "3"), line("×", "", "4")]).swings.length,
    0,
    "one number has no swing",
  );
  assert.equal(swingOf(CHECK.lines).swings[0].label, "what that would cost us");
});

test("the readings say where it lands and never what it means", () => {
  const read = (b: Botec) => {
    const w = work(b.lines);
    const s = summarise(w.out);
    return readings(b, w, s, swingOf(b.lines));
  };
  const example = read(EXAMPLE_BOTEC);
  assert.match(
    example[0],
    /^the middle of 5,000 draws is 1\d\d tuners; nine in ten fall between \d+ and \d+$/,
  );
  assert.ok(
    example.some((r) =>
      r.startsWith(
        "it leans most on ‘households with a piano’: across your range for it, 1 in 20 to 1 in 5",
      ),
    ),
  );
  const check = read(CHECK);
  assert.ok(
    check.some((r) =>
      /^\d+ in 100 draws land above your line at 1 — it pays for itself$/.test(
        r,
      ),
    ),
    check.join("\n"),
  );
  const harlow = read(HARLOW);
  assert.ok(
    harlow.some((r) =>
      /^it came to 64 hours: above 9\d in 100 of the draws$/.test(r),
    ),
    harlow.join("\n"),
  );
  const points = read({
    ...emptyBotec("2026-09-29"),
    lines: [line("×", "", "3"), line("×", "", "4")],
  });
  assert.match(
    points[0],
    /^every line is one number, so it comes to 12 exactly/,
  );
  const blank = read({
    ...emptyBotec("2026-09-29"),
    lines: [line("×", "a", ""), line("×", "b", "lots")],
  });
  assert.deepEqual(blank, [
    "no line has a number yet",
    "1 line has no number yet",
    "‘lots’ reads as no number",
  ]);
  // The reader's own words are quoted, and are theirs to choose.
  for (const r of [...example, ...check, ...harlow, ...points, ...blank])
    assert.doesNotMatch(r.replace(/‘[^’]*’/g, "‘…’"), VERDICT, r);
});

test("the drawing: a scale by ratio with its powers of ten, dots stacked where they fall", () => {
  const ax = axisOf([52, 310])!;
  assert.ok(ax.log && ax.lo < 52 && ax.hi > 310);
  assert.deepEqual(ax.ticks, [50, 100, 200]);
  assert.ok(place(ax, 52) > 0 && place(ax, 310) < 1);
  assert.ok(
    Math.abs(
      place(ax, 100) - place(ax, 50) - (place(ax, 200) - place(ax, 100)),
    ) < 1e-9,
    "doubling is one width",
  );
  const wide = axisOf([0.001, 1e9])!;
  assert.ok(
    wide.ticks.length <= 7,
    "a wide scale gets every other power of ten",
  );
  assert.equal(axisOf([-5, 10])!.log, false);
  const dots = stackDots([1, 1.2, 1.5, 3, 3.1, 3.2, 3.3, 8], 1);
  assert.deepEqual(
    dots.map((d) => d.k),
    [0, 1, 2, 0, 1, 2, 3, 0],
  );
  const xs = [...new Set(dots.map((d) => d.x))];
  assert.ok(
    xs.every((x, i) => i === 0 || x - xs[i - 1] >= 1),
    "stacks at least a dot apart",
  );
  assert.equal(summarise(work(EXAMPLE_BOTEC.lines).out)!.dots.length, 100);
  const out = work(CHECK.lines).out!;
  assert.ok(Math.abs(above(out, 1) - 0.5) < 0.1);
  assert.deepEqual(
    [fmt(3.7e6), fmt(123456), fmt(999999), fmt(1234), fmt(0.0344), fmt(-42000)],
    ["3.7M", "120k", "1M", "1,200", "0.034", "−42k"],
  );
});

test("lines are broken down, taken back out and taken off", () => {
  const a = line("×", "a", "2");
  const b = line("×", "b", "3");
  const c = line("×", "c", "4");
  let ls = breakDown([a, b], b.key, c);
  assert.deepEqual(
    flatten(ls).map((f) => `${f.path}:${f.line.label}:${f.line.value}`),
    ["0:a:2", "1:b:=", "1.0:c:4"],
  );
  assert.equal(work(ls).out![0], 8);
  ls = outdent(ls, c.key);
  assert.deepEqual(
    flatten(ls).map((f) => `${f.path}:${f.line.label}:${f.line.value}`),
    ["0:a:2", "1:b:", "2:c:4"],
    "left with none of its own, a line is a guess again",
  );
  ls = removeLine(
    breakDown(ls, a.key, line("×", "d", "5")),
    ls[0].lines[0]?.key ?? "none",
  );
  const d = flatten(ls).find((f) => f.line.label === "d")!;
  ls = removeLine(ls, d.line.key);
  assert.deepEqual(
    flatten(ls).map((f) => f.line.value),
    ["", "", "4"],
  );
});

test("the record counts what was kept and where what it came to fell", () => {
  const t = tally(SPECIMEN_BOTECS, "2026-09-12");
  assert.deepEqual(
    [t.kept, t.week, t.looked, t.over, t.inside, t.under],
    [2, 1, 1, 1, 0, 0],
  );
  const words = recordReadings(t);
  assert.deepEqual(words, [
    "2 envelopes kept, 1 this week",
    "1 looked up afterwards: 1 over the middle nine in ten of its draws",
    "most made at the fence (1), then the catalogue (1)",
  ]);
  assert.deepEqual(recordReadings(tally([], "2026-09-12")), [
    "nothing kept yet",
  ]);
  for (const r of words) assert.doesNotMatch(r, VERDICT, r);
});

test("the file carries every line, its sign and its own lines, and what was on the desk", () => {
  for (const b of [
    ...SPECIMEN_BOTECS,
    { ...EXAMPLE_BOTEC, slug: "x", put: "2026-09-29", touched: "2026-09-29" },
  ]) {
    const again = parseBotec(b.slug, serialiseBotec(b));
    const shape = (x: Botec) => ({
      ...x,
      lines: flatten(x.lines).map((f) => [
        f.path,
        f.index === 0 ? "" : f.line.op,
        f.line.label,
        f.line.value,
      ]),
    });
    assert.deepEqual(shape(again), shape(b));
  }
  const file = serialiseBotec(CHECK);
  assert.match(file, /^- ÷ what the check costs a year · =$/m);
  assert.match(file, /^ {2}- × Fridays a year · 44 to 48$/m);
  assert.match(file, /^about:\n {2}kind: "fence"/m);
  // A file set down by hand, loosely.
  const loose = parseBotec(
    "by-hand",
    "---\nput: 2026-09-20\nline: 1\n---\n\n## the question\n\nHow far?\n\n## the envelope\n\n- miles · 3 to 5\n- / hours · 1\n    - nested too deep? · 2\n- * · 2\n",
  );
  assert.deepEqual(
    [loose.put, loose.line, loose.question],
    ["2026-09-20", 1, "How far?"],
  );
  assert.deepEqual(
    flatten(loose.lines).map((f) => [f.line.op, f.line.label, f.line.value]),
    [
      ["×", "miles", "3 to 5"],
      ["÷", "hours", "="],
      ["×", "nested too deep?", "2"],
      ["×", "", "2"],
    ],
  );
  assert.throws(() => validateBotec({ lines: [] }), /what you are working out/);
  const odd = validateBotec({
    question: "q",
    lines: [{ op: "/", label: "a · b", value: "3 · 4" }],
  });
  assert.deepEqual(
    [odd.lines[0].op, odd.lines[0].label, odd.lines[0].value],
    ["÷", "a - b", "3  4"],
  );
  assert.match(odd.slug, /^\d{4}-\d{2}-\d{2}-q$/);
});
