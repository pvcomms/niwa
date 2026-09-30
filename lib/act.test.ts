import assert from "node:assert/strict";
import { test } from "node:test";
import {
  emptyAct,
  inOrder,
  markStep,
  moveStep,
  newStep,
  parseAct,
  readings,
  recordOf,
  recordReadings,
  serialiseAct,
  spanOf,
  stateOf,
  tally,
  validateAct,
  type Act,
} from "./act.ts";
import { SPECIMEN_ACTS, exampleAct } from "../content/act.ts";

const [CHECK, JUNIOR] = SPECIMEN_ACTS;
const TODAY = "2026-09-29";
const VERDICT =
  /\b(you should|should|good|bad|better|worse|fail\w*|success\w*|streak|lazy|discipline\w*|procrastinat\w*|well done|great|keep it up|behind|on track|recommend\w*|score)\b/i;

test("a step stands where its marks and its day put it", () => {
  const s = { ...newStep("2026-10-01"), will: "x" };
  assert.equal(stateOf(s, TODAY), "meant");
  assert.equal(stateOf(s, "2026-10-01"), "today");
  assert.equal(stateOf(s, "2026-10-03"), "due");
  assert.equal(stateOf(markStep(s, "done", "2026-10-02"), TODAY), "done");
  assert.equal(stateOf(markStep(s, "not", TODAY), TODAY), "not");
  const done = markStep(s, "done", "2026-10-02");
  assert.equal(done.on, "2026-10-02");
  assert.equal(
    markStep(done, "done", "2026-10-09").on,
    "2026-10-02",
    "marking it again keeps the day it was done",
  );
  const back = markStep({ ...done, felt: "harder", met: true }, "", TODAY);
  assert.deepEqual(
    [back.did, back.on, back.felt, back.met],
    ["", "", "", false],
  );
});

test("a step moved keeps the days it was meant for", () => {
  const s = { ...newStep("2026-10-01"), will: "x" };
  const once = moveStep(s, "2026-10-03");
  assert.deepEqual([once.day, once.moved], ["2026-10-03", ["2026-10-01"]]);
  assert.deepEqual(moveStep(once, "2026-10-05").moved, [
    "2026-10-01",
    "2026-10-03",
  ]);
  assert.equal(moveStep(once, "2026-10-03"), once, "the same day is no move");
  const order = inOrder([
    { ...s, id: "a", day: "2026-10-04" },
    { ...s, id: "b", day: "2026-10-02" },
    { ...s, id: "c", day: "2026-10-04" },
  ]).map((x) => x.id);
  assert.deepEqual(order, ["b", "a", "c"]);
});

test("the tally counts what was meant, done, when, and what it was like", () => {
  const t = tally(CHECK, TODAY);
  assert.deepEqual(
    [
      t.steps,
      t.done,
      t.onDay,
      t.late,
      t.early,
      t.not,
      t.due,
      t.minutes,
      t.easier,
      t.same,
      t.harder,
      t.met,
      t.first,
    ],
    [4, 3, 2, 1, 0, 0, 0, 80, 1, 1, 1, 1, 2],
  );
  const j = tally(JUNIOR, TODAY);
  assert.deepEqual([j.done, j.moved, j.first], [1, 1, 2]);
  const later = tally(JUNIOR, "2026-10-02");
  assert.equal(later.due, 1, "a day gone by unmarked is past its day");
});

test("the readings say what was meant and lived, and never what it means", () => {
  const words = readings(CHECK, TODAY);
  assert.deepEqual(words, [
    "4 steps meant, 80 minutes between them",
    "3 done (2 on the day meant, 1 later)",
    "the first step was done 2 days after the intention was set down",
    "of what was done: 1 easier than you thought, 1 as you thought, 1 harder",
    "what stands in the way showed up on 1 step",
    "next: ask Tom whether anything slipped through, 1 Oct — when the month turns",
  ]);
  const junior = readings(JUNIOR, TODAY);
  assert.ok(junior.includes("1 step moved to another day"), junior.join("\n"));
  assert.ok(junior.includes("1 done, on the day meant"), junior.join("\n"));
  const empty = readings(
    { ...emptyAct(TODAY), intention: "Call my sister." },
    TODAY,
  );
  assert.deepEqual(empty, ["no step set down yet"]);
  const waiting = readings({ ...exampleAct("2026-09-20") }, TODAY);
  assert.ok(
    waiting.includes("3 past their day and not marked"),
    waiting.join("\n"),
  );
  assert.ok(
    waiting.includes(
      "nothing done yet, 9 days after the intention was set down",
    ),
    waiting.join("\n"),
  );
  for (const r of [...words, ...junior, ...empty, ...waiting])
    assert.doesNotMatch(r, VERDICT, r);
});

test("the drawing covers the intention, every day meant or moved or lived, and today", () => {
  const s = spanOf(CHECK, TODAY);
  assert.deepEqual([s.from, s.to, s.days], ["2026-09-12", "2026-10-02", 20]);
  const short = spanOf({ ...emptyAct(TODAY), intention: "x" }, TODAY);
  assert.equal(short.days, 7, "a week at least");
});

test("the record counts intentions acted on and the first step's day", () => {
  const r = recordOf(SPECIMEN_ACTS, TODAY);
  assert.deepEqual(
    [r.acts, r.actedOn, r.whole, r.steps, r.done, r.onDay, r.middle],
    [2, 2, 0, 7, 4, 3, 2],
  );
  const words = recordReadings(r);
  assert.deepEqual(words, [
    "2 intentions set down, 2 acted on",
    "4 of 7 steps done, 3 on the day meant",
    "in at least half of those acted on, the first step came within 2 days of the intention",
    "what was done: 2 easier than thought, 1 as thought, 1 harder",
  ]);
  assert.deepEqual(recordReadings(recordOf([], TODAY)), [
    "nothing set down yet",
  ]);
  for (const w of words) assert.doesNotMatch(w, VERDICT, w);
});

test("the file carries every step with its moves, marks and what it was like", () => {
  for (const a of SPECIMEN_ACTS) {
    const again = parseAct(a.slug, serialiseAct(a));
    assert.deepEqual(again, a);
  }
  const file = serialiseAct(CHECK);
  assert.match(
    file,
    /^- 2026-09-17 · when the Thursday review ends · I will run the file check with Tom · at the back table · 30 min · done 2026-09-17 · harder than I thought · it showed up — Fifty minutes, not thirty\./m,
  );
  assert.match(
    serialiseAct(JUNIOR),
    /^- 2026-10-01 \(was 2026-09-30\) · when the October plan is drafted/m,
  );
  assert.match(file, /^from:\n {2}kind: "botec"/m);
  // A step written by hand, loosely.
  const loose = parseAct(
    "by-hand",
    "---\nput: 2026-09-20\n---\n\n## the intention\n\nCall my sister.\n\n## the steps\n\n- 2026-09-21 · ring her after dinner\n- 2026-09-22 · I will send the photos · done 2026-09-23 — She laughed.\n",
  );
  assert.deepEqual(
    loose.steps.map((s) => [s.day, s.will, s.did, s.on, s.lived]),
    [
      ["2026-09-21", "ring her after dinner", "", "", ""],
      ["2026-09-22", "send the photos", "done", "2026-09-23", "She laughed."],
    ],
  );
});

test("an intention needs saying, and a step's words cannot break its line", () => {
  assert.throws(() => validateAct({ steps: [] }), /what you mean to do/);
  const a: Act = validateAct({
    intention: "Write the letter",
    steps: [
      {
        will: "draft it · then send it — soon",
        when: "after tea",
        day: "2026-09-30",
        did: "done",
        felt: "bouncy",
        minutes: -5,
      },
    ],
  });
  assert.equal(a.steps[0].will, "draft it - then send it - soon");
  assert.deepEqual(
    [a.steps[0].felt, a.steps[0].minutes, a.steps[0].on],
    ["", null, a.put],
  );
  assert.match(a.slug, /^\d{4}-\d{2}-\d{2}-write-the-letter$/);
});
