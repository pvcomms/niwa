import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DIP_AREA,
  MINUTE,
  YEAR,
  altitudeOf,
  closeSpan,
  dipAt,
  farSpan,
  marksFor,
  parseStep,
  readings,
  remark,
  roadsOf,
  serialiseStep,
  shareWords,
  spanAt,
  spanWords,
  stopsOf,
  tally,
  theDip,
  ticksOf,
  validateStep,
  weigh,
  wholeReadings,
} from "./overview.ts";
import { EXAMPLE_STEP, SPECIMEN_STEPS } from "../content/overview.ts";

const [FATHER, LETTER] = SPECIMEN_STEPS;
const VERDICT =
  /\b(should|must|ought|worth it|good job|well done|proud|disappoint\w*|fail\w*|lazy|coward\w*|weak|excuse\w*|shame\w*|better|worse|score|grade|progress|improv\w*|accura\w*|overestimat\w*|underestimat\w*)\b/i;

test("the dip is below now only while it lasts, as deep as said at its worst", () => {
  const L = 40 * MINUTE;
  assert.equal(dipAt(-0.001, 8, 40), 0);
  assert.equal(dipAt(0, 8, 40), 0);
  assert.equal(dipAt(L, 8, 40), 0);
  assert.equal(dipAt(L * 2, 8, 40), 0);
  let worst = 0;
  for (let i = 1; i < 1000; i++)
    worst = Math.min(worst, dipAt((L * i) / 1000, 8, 40));
  assert.ok(Math.abs(worst + 8) < 0.01, `worst ${worst}`);
  // in fast, out slow: the worst comes in the first fifth
  const at = (u: number) => dipAt(L * u, 8, 40);
  assert.ok(at(0.14) < at(0.5) && at(0.5) < at(0.8));
  assert.ok(DIP_AREA > 0.45 && DIP_AREA < 0.55, `area ${DIP_AREA}`);
});

test("the road with the step passes through every mark; the road without it stays at now unless moved", () => {
  const r = roadsOf(EXAMPLE_STEP);
  assert.ok(Math.abs(r.with(7) - 1) < 1e-9);
  assert.ok(Math.abs(r.with(YEAR) - 5) < 1e-9);
  assert.ok(Math.abs(r.with(5 * YEAR) - 7) < 1e-9);
  assert.equal(r.without(YEAR), 0);
  // never overshoots between marks
  for (let t = 7; t < 5 * YEAR; t *= 1.1)
    assert.ok(r.with(t) <= 7 + 1e-9 && r.with(t) >= 0);
  const f = roadsOf(FATHER);
  assert.ok(Math.abs(f.without(2 * YEAR) + 2) < 1e-9);
  assert.ok(f.without(YEAR) < 0 && f.without(YEAR) > -2);
});

test("pulling back multiplies the frame: the dip is two fifths of it up close and a hairline far out", () => {
  const close = closeSpan(40);
  const far = farSpan(5, 40);
  assert.ok(Math.abs(close - 100 * MINUTE) < 1e-12);
  assert.equal(spanAt(0, close, far), close);
  assert.ok(Math.abs(spanAt(1, close, far) - far) < 1e-9);
  assert.ok(
    Math.abs(altitudeOf(spanAt(0.37, close, far), close, far) - 0.37) < 1e-9,
  );
  assert.equal(shareWords(40 * MINUTE, close), "40%");
  assert.equal(shareWords(40 * MINUTE, 5 * YEAR), "1 part in 65,700");
  assert.equal(shareWords(40 * MINUTE, 1), "2.8%");
  assert.equal(theDip(40), "the 40 minutes are");
  assert.equal(theDip(60), "the hour is");
  assert.equal(spanWords(close), "an hour and a half");
  assert.equal(spanWords(1), "a day");
  assert.equal(spanWords(21), "three weeks");
  assert.equal(spanWords(far), "five years");
  const stops = stopsOf(40, 5);
  assert.deepEqual(
    stops.map((s) => s.label),
    ["the dip", "a day", "a week", "a month", "a year", "five years"],
  );
  for (const span of [close, 1, 30, YEAR, far]) {
    const ticks = ticksOf(span);
    assert.ok(
      ticks.length >= 1 && ticks.length <= 6,
      `${span}: ${ticks.length}`,
    );
    assert.ok(ticks.every((t) => t.t > 0 && t.t < span));
  }
  assert.deepEqual(
    ticksOf(close).map((t) => t.label),
    ["30 min", "60 min", "90 min"],
  );
});

test("the two areas are weighed by the reader's own marks", () => {
  const w = weigh(EXAMPLE_STEP);
  const dip = DIP_AREA * 7 * 30 * MINUTE;
  assert.ok(Math.abs(w.cost - dip) / dip < 0.01, `cost ${w.cost} vs ${dip}`);
  assert.ok(w.gain > 5000 && w.gain < 5 * YEAR * 7);
  assert.ok(w.times !== null && w.times > 100_000);
  const flat = weigh({
    ...EXAMPLE_STEP,
    marks: EXAMPLE_STEP.marks.map((m) => ({ ...m, level: 0 })),
  });
  assert.equal(flat.gain, 0);
});

test("the readings say what the reader marked, and never whether it is worth it", () => {
  const r = readings(FATHER);
  assert.equal(
    r[0],
    "the dip: 8 of 10 at its worst, for 45 minutes, as you said before",
  );
  assert.equal(r[1], "45 minutes is 1 part in 23,400 of two years");
  assert.equal(
    r[2],
    "as marked, the road with the step is 7 above now by a year and 8 above now by two years; the road without it is 2 below now by then",
  );
  assert.match(
    r[3],
    /^as marked, what the road with the step has over the other, across two years, is [\d,]+ times the dip$/,
  );
  assert.equal(r[4], "the life: 3 sentences, each written as it is");
  assert.equal(
    r[5],
    "who you are on that road, in your words: I am someone who goes.",
  );
  assert.equal(
    r[6],
    "put down 19 Sep · let go for today 2 times: 20 Sep, 27 Sep",
  );
  const taken = readings(LETTER);
  assert.equal(
    taken.at(-1),
    "taken 23 Sep · before, you said 6 of 10 for two hours; after, 3 of 10 for 26 minutes",
  );
  const ahead = readings({
    ...FATHER,
    life: "I will live by the harbour. I walk to the ferry.",
  });
  assert.equal(
    ahead[4],
    "the life: 2 sentences, 1 still looks ahead — will. it is meant to be written as it is",
  );
  for (const s of [...r, ...taken, ...ahead]) assert.doesNotMatch(s, VERDICT);
});

test("the record sets before beside after and counts, never an accuracy", () => {
  const t = tally(SPECIMEN_STEPS);
  assert.equal(t.n, 2);
  assert.equal(t.open, 1);
  assert.equal(t.taken, 1);
  assert.equal(t.letGo, 2);
  const r = wholeReadings(t);
  assert.equal(r[0], "2 steps put down · 1 taken · 0 in it · 1 open");
  assert.equal(r[1], "let go for today 2 times, across 1 step");
  assert.equal(
    r[2],
    "at the worst, before and after: 6 → 3 — less than said in 1 of 1",
  );
  assert.equal(
    r[3],
    "for how long, before and after: two hours → 26 minutes — shorter than said in 1 of 1",
  );
  for (const s of r) assert.doesNotMatch(s, VERDICT);
  assert.deepEqual(wholeReadings(tally([])), ["no steps put down yet"]);
});

test("a step survives its file; the words are sections a person can read", () => {
  for (const s of SPECIMEN_STEPS)
    assert.deepEqual(parseStep(s.slug, serialiseStep(s)), s);
  const raw = serialiseStep(FATHER);
  assert.match(raw, /^## who I am on that road$/m);
  assert.match(raw, /^- 2026-09-20: He sounded tired on Saturday\.$/m);
  assert.match(raw, /^- 2026-09-27$/m);
  assert.match(
    raw,
    /^ {2}- \{ when: "a year", level: 7, line: "I am there\." \}$/m,
  );
});

test("validation clamps every number, keeps the horizon's marks, and refuses a step with no step", () => {
  assert.throws(
    () => validateStep({ step: " " }, "2026-09-27"),
    /needs the step/,
  );
  const s = validateStep(
    {
      step: "Make the call.",
      hurt: 14,
      lasts: -3,
      horizon: 3,
      without: -40,
      marks: [
        { when: "a month", level: 11, line: "x" },
        { when: "someday", level: 4 },
      ],
      took: "2026-09-27T14:00+02:00",
      done: "2026-09-27T13:00+02:00",
      felt: 4,
      notToday: [
        { on: "2026-09-26", why: "a" },
        { on: "2026-09-26", why: "b" },
        { on: "soon" },
      ],
    },
    "2026-09-27",
  );
  assert.equal(s.slug, "2026-09-27-make-the-call");
  assert.equal(s.hurt, 10);
  assert.equal(s.lasts, 1);
  assert.equal(s.horizon, 2);
  assert.equal(s.without, -10);
  assert.deepEqual(
    s.marks.map((m) => m.when),
    marksFor(2),
  );
  assert.deepEqual(s.marks[1], { when: "a month", level: 10, line: "x" });
  assert.equal(s.done, null, "done before took is dropped");
  assert.equal(s.felt, null, "no felt without done");
  assert.deepEqual(s.notToday, [{ on: "2026-09-26", why: "a" }]);
  const moved = remark(FATHER.marks, 2, 5);
  assert.deepEqual(
    moved.map((m) => m.when),
    ["a week", "a month", "a year", "five years"],
  );
  assert.equal(moved[2].line, "I am there.");
  assert.equal(moved[3].level, 8, "the new horizon takes the old one's level");
});
