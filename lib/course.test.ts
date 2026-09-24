import { test } from "node:test";
import assert from "node:assert/strict";
import type { GardenLink, GardenNode } from "./garden.ts";
import { buildFlow } from "./flow.ts";
import {
  dateInputs,
  dayOf,
  emptyCourse,
  inputsOf,
  isBlank,
  parseCourse,
  putQuestion,
  readings,
  serialiseCourse,
  setMark,
  tally,
  timeX,
  validateCourse,
} from "./course.ts";

const node = (id: string, extra: Partial<GardenNode> = {}): GardenNode => ({
  id,
  label: id,
  kind: "note",
  description: "",
  body: "",
  file: null,
  modified: null,
  stage: "settled",
  signed: null,
  degree: 0,
  source: "vault",
  ...extra,
});

const link = (
  source: string,
  target: string,
  kind: GardenLink["kind"],
): GardenLink => ({ source, target, kind });

// essay cites kierkegaard, the feed and a draft; practises Anxiety; seeds a ghost.
const links = [
  link("essay", "kierkegaard", "link"),
  link("essay", "feed", "mention"),
  link("essay", "feed", "link"),
  link("essay", "draft", "link"),
  link("Anxiety", "essay", "concept"),
  link("essay", "ghost", "seed"),
  link("essay", "repo", "build"),
];
const nodes = new Map(
  [
    node("essay", { modified: "2026-08-10T00:00:00.000Z" }),
    node("kierkegaard", {
      kind: "reading",
      modified: "2026-06-01T00:00:00.000Z",
      stage: "fallow",
    }),
    node("feed", { kind: "reading", modified: "2026-09-01T00:00:00.000Z" }),
    node("draft", { modified: "2026-07-15T00:00:00.000Z" }),
    node("Anxiety", { kind: "concept", modified: "2026-09-20T00:00:00.000Z" }),
    node("ghost", { kind: "ghost", stage: "unknown" }),
    node("repo", { kind: "repo", modified: "2026-09-02T00:00:00.000Z" }),
  ].map((n) => [n.id, n]),
);
const NOW = new Date("2026-09-24T12:00:00Z");

test("inputsOf lists what flowed straight in, once each, undated first then by date", () => {
  const flow = buildFlow(links);
  const inputs = inputsOf(flow, nodes, "essay");
  assert.deepEqual(
    inputs.map((i) => i.id),
    ["ghost", "kierkegaard", "draft", "feed", "Anxiety"],
  );
  assert.deepEqual(inputs.find((i) => i.id === "feed")!.threads, [
    "mention",
    "link",
  ]);
  assert.equal(inputs[0].dated, null);
  assert.equal(inputs[1].dated, "changed");
  // code the essay points at is downstream, not an input
  assert.ok(!inputs.some((i) => i.id === "repo"));
});

test("dateInputs prefers the day an input arrived in the belief, and re-sorts", () => {
  const flow = buildFlow(links);
  const inputs = dateInputs(
    inputsOf(flow, nodes, "essay"),
    { ghost: "2026-08-20", kierkegaard: "2026-09-10" },
    nodes,
  );
  assert.deepEqual(
    inputs.map((i) => i.id),
    ["draft", "ghost", "feed", "kierkegaard", "Anxiety"],
  );
  const g = inputs.find((i) => i.id === "ghost")!;
  assert.equal(g.date, "2026-08-20");
  assert.equal(g.dated, "arrived");
  assert.equal(inputs.find((i) => i.id === "draft")!.dated, "changed");
});

test("tally counts marks, provenance, and what came after the belief was last steered", () => {
  const flow = buildFlow(links);
  const inputs = inputsOf(flow, nodes, "essay");
  const marks = {
    kierkegaard: { mark: "toward" as const, day: "2026-09-24" },
    feed: { mark: "away" as const, day: "2026-09-23" },
    Anxiety: { mark: "toward" as const, day: "2026-09-24" },
  };
  const t = tally(inputs, marks, nodes, nodes.get("essay"));
  assert.equal(t.n, 5);
  assert.equal(t.weighed, 3);
  assert.equal(t.toward, 2);
  assert.equal(t.away, 1);
  assert.equal(t.unweighed, 2);
  assert.equal(t.undated, 1);
  assert.equal(t.first, "2026-06-01T00:00:00.000Z");
  assert.equal(t.last, "2026-09-20T00:00:00.000Z");
  // no record: steered on the belief's own date
  assert.equal(t.steered, 0);
  assert.equal(t.recordSince, null);
  assert.equal(t.lastSteered, "2026-08-10");
  assert.equal(t.since, 2);
  assert.equal(t.sinceUnweighed, 0);
  assert.deepEqual(t.run, ["toward", "away", "toward"]);
  assert.deepEqual(t.byKind.toward, { reading: 1, concept: 1 });
  assert.deepEqual(t.byKind.away, { reading: 1 });
  assert.equal(t.own, 2);
  assert.equal(t.read, 2);
  assert.equal(t.unwritten, 1);
  assert.equal(t.fallow, 1);
  assert.equal(t.lastMarked, "2026-09-24");
  // with a record: steered three times, the last time after most inputs
  const r = tally(inputs, marks, nodes, nodes.get("essay"), [
    "2026-07-01",
    "2026-08-10",
    "2026-09-05",
  ]);
  assert.equal(r.recordSince, "2026-07-01");
  assert.equal(r.steered, 2);
  assert.equal(r.lastSteered, "2026-09-05");
  assert.equal(r.since, 1);
  assert.equal(r.sinceUnweighed, 0);
});

test("readings say what the marks and dates say, and never grade", () => {
  const flow = buildFlow(links);
  const inputs = inputsOf(flow, nodes, "essay");
  const bare = tally(inputs, {}, nodes, nodes.get("essay"));
  const w0 = readings(bare, emptyCourse("essay"), nodes.get("essay"), NOW);
  assert.match(w0[0], /^hit by 5 inputs, 1 Jun to 20 Sep; 1 undated\.$/);
  assert.match(w0[1], /none weighed yet/);
  assert.ok(
    w0.some((w) =>
      /2 inputs have hit it since it was last rewritten \(10 Aug\), 2 of them unweighed/.test(
        w,
      ),
    ),
  );
  assert.ok(w0.some((w) => /the last input landed 4 days ago/.test(w)));
  assert.ok(
    w0.some((w) =>
      /its inputs are 2 of your own and 2 things you read/.test(w),
    ),
  );
  assert.ok(w0.some((w) => /1 of the inputs was never written down/.test(w)));
  assert.ok(w0.some((w) => /1 of the inputs has gone fallow/.test(w)));
  assert.ok(w0.some((w) => /the question has not been put in words/.test(w)));

  let c = emptyCourse("essay");
  c = setMark(c, "kierkegaard", "away", "2026-09-24");
  c = setMark(c, "draft", "away", "2026-09-24");
  c = setMark(c, "feed", "away", "2026-09-24");
  c = setMark(c, "Anxiety", "toward", "2026-09-24");
  c = putQuestion(c, "Is anxiety fuel or a symptom?", "2026-09-10");
  c = putQuestion(c, "Is anxiety readiness?", "2026-09-24");
  const t = tally(inputs, c.marks, nodes, nodes.get("essay"), [
    "2026-08-10",
    "2026-09-05",
  ]);
  const w = readings(t, c, nodes.get("essay"), NOW);
  assert.match(
    w[1],
    /^4 weighed: 1 bent it toward the question, 3 away; 1 unweighed\.$/,
  );
  assert.ok(
    w.some((x) =>
      /^on record since 10 Aug; steered once, last on 5 Sep; 1 input has hit it since\.$/.test(x),
    ),
  );
  const one = readings(
    tally(inputs, c.marks, nodes, nodes.get("essay"), ["2026-09-22"]),
    c,
    nodes.get("essay"),
    NOW,
  );
  assert.ok(
    one.some((x) => /^on record since 22 Sep; not steered since; nothing has hit it since\.$/.test(x)),
  );
  assert.ok(w.some((x) => /of the last 4 weighed, 3 bent it away/.test(x)));
  assert.ok(
    w.some((x) =>
      /what bent it toward: a concept · away: 2 readings and a fieldnote/.test(
        x,
      ),
    ),
  );
  assert.ok(
    w.some((x) => /re-put 1 time — it drifts because you moved it/.test(x)),
  );
  assert.ok(!w.some((x) => /correct|wrong|score|good|bad/i.test(x)));

  // a field gone quiet
  const late = readings(
    t,
    c,
    nodes.get("essay"),
    new Date("2026-12-01T00:00:00Z"),
  );
  assert.ok(
    late.some((x) =>
      /nothing has hit it in 72 days — the field has gone quiet/.test(x),
    ),
  );

  const empty = tally([], {}, nodes, nodes.get("essay"));
  assert.match(
    readings(empty, emptyCourse("essay"), nodes.get("essay"), NOW)[0],
    /nothing has hit this yet/,
  );
});

test("timeX places a day among the inputs: before the first, between two, between the last and now", () => {
  const anchors = [
    { date: "2026-08-01", x: 200 },
    { date: "2026-08-11", x: 300 },
    { date: "2026-09-01", x: 500 },
  ];
  assert.equal(timeX(anchors, "2026-07-01", 170, 800, "2026-09-11"), 186);
  assert.equal(timeX(anchors, "2026-08-06", 170, 800, "2026-09-11"), 250);
  assert.equal(timeX(anchors, "2026-09-06", 170, 800, "2026-09-11"), 650);
  assert.equal(timeX(anchors, "2026-09-11", 170, 800, "2026-09-11"), 800);
  assert.equal(timeX([], "2026-09-11", 170, 800, "2026-09-11"), 485);
});

test("putQuestion keeps the old phrasing on the trail; setMark takes a mark back with null", () => {
  let c = emptyCourse("essay");
  c = putQuestion(c, "  one  ", "2026-09-01");
  assert.equal(c.question, "one");
  assert.equal(c.asked, "2026-09-01");
  assert.deepEqual(c.trail, []);
  assert.equal(putQuestion(c, "one", "2026-09-02"), c);
  c = putQuestion(c, "two", "2026-09-02");
  assert.deepEqual(c.trail, [{ question: "one", asked: "2026-09-01" }]);
  c = setMark(c, "x", "toward", "2026-09-02");
  c = setMark(c, "x", null, "2026-09-03");
  assert.deepEqual(c.marks, {});
  assert.ok(!isBlank(c));
  assert.ok(isBlank(emptyCourse("essay")));
});

test("a course survives its file, with dates as strings and keys that YAML would misread", () => {
  let c = emptyCourse("concept:Delegation Discount");
  c = putQuestion(c, 'Is "cheap to check" the whole rule?', "2026-09-10");
  c = putQuestion(c, "Where does the line fall?", "2026-09-24");
  c = setMark(c, "garden:on", "toward", "2026-09-24");
  c = setMark(c, "yes", "away", "2026-09-23");
  c = { ...c, note: "a line under it" };
  const raw = serialiseCourse(c);
  const back = parseCourse(c.slug, raw);
  assert.deepEqual(back, c);
  assert.equal(c.slug, "concept-delegation-discount");
  assert.match(raw, /asked: "2026-09-24"/);
});

test("validateCourse trims, caps and drops what it cannot trust", () => {
  const v = validateCourse(
    {
      belief: " essay ",
      question: "why",
      asked: "not a day",
      trail: [{ question: "old", asked: "2026-01-01" }, { question: "" }, null],
      marks: {
        a: { mark: "toward", day: "2026-09-01" },
        b: { mark: "sideways" },
        c: { mark: "away" },
      },
      note: 42,
      slug: "../etc",
    },
    "2026-09-24",
  );
  assert.equal(v.belief, "essay");
  assert.equal(v.asked, "2026-09-24");
  assert.deepEqual(v.trail, [{ question: "old", asked: "2026-01-01" }]);
  assert.deepEqual(Object.keys(v.marks).sort(), ["a", "c"]);
  assert.equal(v.marks.c.day, "2026-09-24");
  assert.equal(v.note, "");
  assert.equal(v.slug, "essay");
  assert.throws(() => validateCourse({}, "2026-09-24"), /which belief/);
});

test("dayOf prints the year only when it is not this one", () => {
  assert.equal(dayOf("2026-09-03T00:00:00.000Z", NOW), "3 Sep");
  assert.equal(dayOf("2025-12-31T00:00:00.000Z", NOW), "31 Dec 2025");
  assert.equal(dayOf(null, NOW), "undated");
});
