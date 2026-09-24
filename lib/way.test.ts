import { test } from "node:test";
import assert from "node:assert/strict";
import {
  adopt,
  askStructure,
  differs,
  emptyWay,
  lookingAhead,
  memoir,
  ordered,
  parseWay,
  readings,
  serialiseWay,
  titleOf,
  validateProposal,
  validateWay,
  type Way,
} from "./way.ts";

const TODAY = "2026-09-24";

const way = (over: Partial<Way> = {}): Way => ({
  ...emptyWay(TODAY),
  slug: "2026-09-24-berlin",
  title: "Berlin, a desk by the window",
  then: "2027-09",
  thenText:
    "I live in a small flat in Berlin with a desk by the window. I write every morning. I will publish an essay a fortnight. Someday the Center has two paying readers.",
  nowText:
    "I am in Berlin for a month on a tourist stay. The Bangalore lease is still running. I write in bursts. No readers yet.",
  ...over,
});

test("a then that still looks ahead is read as a fact, not corrected", () => {
  const a = lookingAhead(way().thenText);
  assert.equal(a.of, 4);
  assert.equal(a.n, 2);
  assert.deepEqual(a.words, ["will", "someday"]);
  assert.equal(lookingAhead("I live here. I write in the morning.").n, 0);
});

test("the vocabulary of the change: what the then speaks of that the now does not", () => {
  const { only, gone } = differs(way().thenText, way().nowText);
  assert.ok(only.includes("window") && only.includes("essay"));
  assert.ok(!only.includes("readers")); // both texts speak of readers
  assert.ok(gone.includes("lease") && gone.includes("bursts"));
  assert.ok(!only.includes("berlin"));
});

test("the readings say where the then sits, how it is written, and what changes", () => {
  const w = way();
  const words = readings(w, TODAY);
  assert.match(
    words[0],
    /^the then is set in Sep 2027 — (a year|11 months|12 months) from today\.$/,
  );
  assert.match(
    words[1],
    /^2 of the then's 4 sentences still look ahead — will and someday\. it is meant to be written as it is\.$/,
  );
  assert.ok(
    words.some((s) =>
      /^the then speaks of .*publish.*; the now does not\.$/.test(s),
    ),
  );
  assert.ok(
    words.some((s) =>
      /^the now speaks of .*; the then has let them go\.$/.test(s),
    ),
  );
  for (const s of words)
    assert.doesNotMatch(s, /should|score|rank|best|good|bad/i);
  assert.deepEqual(readings(emptyWay(TODAY), TODAY), [
    "say where you are, and say where you mean to be — as it is, not as it will be.",
  ]);
});

test("proposals are folded in as proposed, capped, dated inside the way, and never repeated", () => {
  const w = way({
    steps: [
      {
        id: "s1",
        text: "Give notice on the Bangalore lease",
        day: "2026-11",
        dir: "forward",
        by: "you",
        kept: true,
        entry: null,
      },
    ],
  });
  const p = validateProposal(
    {
      changes: [
        { text: "A desk by the window", lane: "Place" },
        { text: "Readers who pay", lane: "nowhere" },
        { text: "" },
      ],
      back: [
        { text: "The second reader signed on", day: "2027-08" },
        { text: "The flat was mine", day: "2028-06" },
        { text: "Undated", day: "soon" },
      ],
      forward: [
        { text: "give notice on the bangalore lease", day: "2026-10" },
        { text: "Write on Monday", day: "2020-01" },
      ],
      obstacles: [
        {
          text: "The tourist stay ends",
          plan: "when it ends, I fly back for the visa and keep the morning",
        },
      ],
    },
    TODAY,
    "2027-09",
    [
      { id: "place", label: "Place" },
      { id: "work", label: "Work" },
    ],
  );
  assert.deepEqual(p.changes, [
    { text: "A desk by the window", lane: "place" },
    { text: "Readers who pay", lane: null },
  ]);
  assert.equal(p.back[1].day, "2027-09"); // clamped to the then
  assert.equal(p.back[2].day, null);
  assert.equal(p.forward[1].day, "2026-09"); // clamped to today's month
  let n = 0;
  const w2 = adopt(w, p, () => `p${++n}`);
  assert.equal(w2.steps.length, 1 + 1 + 3); // the repeated forward step is dropped
  assert.ok(w2.steps.slice(1).every((s) => s.by === "proposed" && !s.kept));
  assert.equal(
    w2.obstacles[0].plan,
    "when it ends, I fly back for the visa and keep the morning",
  );
  assert.equal(w2.changes.length, 2);
  const again = adopt(w2, p, () => `q${++n}`);
  assert.equal(again.steps.length, w2.steps.length);
});

test("the way is told in order, and the memoir tells it backwards from the then", () => {
  const steps = [
    {
      id: "a",
      text: "Write on Monday",
      day: null,
      dir: "forward" as const,
      by: "you" as const,
      kept: true,
      entry: null,
    },
    {
      id: "b",
      text: "The flat was mine",
      day: "2027-06",
      dir: "back" as const,
      by: "you" as const,
      kept: true,
      entry: null,
    },
    {
      id: "c",
      text: "Gave notice",
      day: "2026-11",
      dir: "forward" as const,
      by: "you" as const,
      kept: true,
      entry: null,
    },
    {
      id: "d",
      text: "The first reader paid",
      day: null,
      dir: "back" as const,
      by: "you" as const,
      kept: true,
      entry: null,
    },
    {
      id: "e",
      text: "Proposed and not kept",
      day: "2027-01",
      dir: "back" as const,
      by: "proposed" as const,
      kept: false,
      entry: null,
    },
  ];
  assert.deepEqual(
    ordered(steps.filter((s) => s.kept)).map((s) => s.id),
    ["a", "c", "b", "d"],
  );
  const m = memoir(way({ steps }));
  assert.equal(m.dateline, "It is Sep 2027. It is so.");
  assert.deepEqual(
    m.hadToBe.map((s) => s.id),
    ["d", "b", "c", "a"],
  );
  assert.equal(m.first?.id, "a");
});

test("the prompt carries their words, the lanes and the dates, and asks for JSON", () => {
  const a = askStructure(way(), [{ id: "place", label: "Place" }], TODAY);
  assert.match(a.system, /Today is 2026-09-24\. The then is set in 2027-09\./);
  assert.match(a.system, /place \(Place\)/);
  assert.match(a.user, /THEN — as it is:\nI live in a small flat/);
  assert.match(a.user, /when X, I Y/);
  assert.deepEqual((a.schema as { required: string[] }).required, [
    "changes",
    "back",
    "forward",
    "obstacles",
  ]);
});

test("the file round-trips, with the two texts as sections a person can edit", () => {
  const w = way({
    steps: [
      {
        id: "s1",
        text: "Give notice",
        day: "2026-11",
        dir: "forward",
        by: "you",
        kept: true,
        entry: "2026-give-notice",
      },
    ],
    obstacles: [
      {
        id: "o1",
        text: "The stay ends",
        plan: "when it ends, I fly back",
        by: "proposed",
        kept: false,
      },
    ],
    changes: [
      {
        id: "c1",
        text: "A desk by the window",
        lane: "place",
        by: "you",
        kept: true,
      },
    ],
    colour: "I wake before the light and the desk is already warm.",
    recorded: TODAY,
    touched: TODAY,
  });
  const raw = serialiseWay(w);
  assert.ok(raw.includes("## then\n\nI live in a small flat"));
  assert.ok(raw.includes("## the then, said again"));
  assert.deepEqual(parseWay(w.slug, raw), w);
  const hand = parseWay(
    "x",
    "---\ntitle: Hand\nthen: 2027\nsteps:\n  - text: Just a text\n---\n## then\n\nHere.\n\n## now\n\nThere.\n",
  );
  assert.equal(hand.then, "2027");
  assert.equal(hand.steps[0].text, "Just a text");
  assert.equal(hand.steps[0].kept, true);
  assert.equal(hand.nowText, "There.");
});

test("validation refuses an empty way and titles one from the then", () => {
  assert.throws(
    () => validateWay({ thenText: "", nowText: "" }, TODAY),
    /say where/,
  );
  assert.throws(
    () => validateWay({ thenText: "x", then: "next year" }, TODAY),
    /then's day/,
  );
  const v = validateWay(
    {
      thenText: "I live by the sea. It is quiet.",
      steps: [{ text: "Move", kept: "yes" }],
    },
    TODAY,
  );
  assert.equal(v.title, "I live by the sea");
  assert.equal(v.slug, "2026-09-24-i-live-by-the-sea");
  assert.equal(v.steps[0].kept, false);
  assert.equal(v.recorded, TODAY);
  assert.equal(titleOf({ title: "", thenText: "" }), "a way");
});
