import assert from "node:assert/strict";
import { test } from "node:test";
import type { GardenNode } from "./garden.ts";
import {
  ROUTE_KEYS,
  ask,
  count,
  countOf,
  derive,
  empty,
  inCorpus,
  normaliseSplit,
  opening,
  parse,
  placed,
  readings,
  receive,
  rows,
  serialise,
  share,
  standing,
  tally,
  type Genesis,
} from "./genesis.ts";

const node = (id: string, kind: string, body: string, label = id): GardenNode =>
  ({
    id,
    label,
    kind,
    description: "",
    body,
    file: null,
    modified: "2026-09-01T00:00:00.000Z",
    stage: "tended",
    signed: null,
    degree: 0,
    source: "garden",
  }) as unknown as GardenNode;

const ON = "2026-09-30";
const long = "A note with enough words in it to count as a stone in the garden.";

test("only stones with words in them are counted; repos and ghosts are not", () => {
  assert.ok(inCorpus(node("garden:a", "garden", long)));
  assert.ok(!inCorpus(node("repo:a", "repo", long)));
  assert.ok(!inCorpus(node("garden:b", "garden", "too short")));
});

test("the Reader archive and Fieldnotes Sources are read off the file; nothing else is", () => {
  assert.equal(derive(node("garden:r", "reading", long), ON)?.from, "read");
  assert.equal(derive(node("note:Sources/x", "note", long), ON)?.by, "rule");
  assert.equal(derive(node("garden:x", "garden", long), ON), null);
  assert.equal(derive(node("project_x", "project", long), ON), null);
});

test("a proposal is kept only with a quote that is in the stone", () => {
  const batch = [
    { id: "a", text: "Built overnight during a long session on the hooks server." },
    { id: "b", text: "Mira said over coffee that the map is not the territory, again." },
    { id: "c", text: "A grocery list: eggs, rice, lentils." },
    { id: "d", text: "Some words here that are nothing like the reason it gives." },
  ];
  const raw = {
    marks: [
      { id: "a", from: "made", because: "Built overnight during a long session" },
      { id: "b", from: "told", because: "“Mira said over coffee that the map”" },
      { id: "c", from: "unsaid", because: "A grocery list" },
      { id: "d", from: "read", because: "an article about attention in the feed" },
      { id: "zz", from: "read", because: "not in the batch at all" },
      { id: "a", from: "read", because: "a second answer for the same note" },
    ],
  };
  const r = receive(raw, batch, ON);
  assert.deepEqual(Object.keys(r.marks).sort(), ["a", "b"]);
  assert.equal(r.marks.a.from, "made");
  assert.equal(r.marks.b.by, "model");
  assert.equal(r.untold.c, "the note does not say");
  assert.equal(r.untold.d, "its reason was not in the note");
  assert.ok(!("zz" in r.marks) && !("zz" in r.untold));
});

test("a quote matches through curly quotes, dashes and case", () => {
  const batch = [{ id: "a", text: "Param’s idea — found while “building” the site." }];
  const r = receive(
    { marks: [{ id: "a", from: "made", because: "param's idea - found while \"building\"" }] },
    batch,
    ON,
  );
  assert.equal(r.marks.a?.from, "made");
});

test("a note the model does not answer for is untold, and not asked again", () => {
  const r = receive(null, [{ id: "a", text: long }], ON);
  assert.equal(r.untold.a, "no answer");
});

test("the reader's word stands over a rule, and a rule over a proposal", () => {
  const reading = node("garden:r", "reading", long);
  const g: Genesis = {
    guess: null,
    marks: {
      "garden:r": { from: "told", by: "model", because: "x", on: ON },
      "garden:x": { from: "made", by: "model", because: "y", on: ON },
    },
    untold: {},
  };
  const other = node("garden:x", "garden", long);
  assert.equal(standing([reading, other], g, ON).get("garden:r")?.by, "rule");
  g.marks["garden:r"] = { from: "lived", by: "you", because: "", on: ON };
  const s = standing([reading, other], g, ON);
  assert.equal(s.get("garden:r")?.from, "lived");
  assert.equal(s.get("garden:x")?.by, "model");
});

test("the tally keeps yours, the rules' and the proposals apart, and counts the unplaced", () => {
  const nodes = [
    node("garden:r", "reading", long),
    node("garden:a", "garden", long),
    node("garden:b", "garden", long),
    node("garden:c", "garden", long),
    node("garden:d", "garden", long),
  ];
  const g: Genesis = {
    guess: null,
    marks: {
      "garden:a": { from: "read", by: "you", because: "", on: ON },
      "garden:b": { from: "thought", by: "model", because: "q", on: ON },
    },
    untold: { "garden:c": "the note does not say" },
  };
  const t = tally(nodes, g, ON);
  assert.equal(t.stones, 5);
  assert.deepEqual(t.byRoute.read, { you: 1, rule: 1, model: 0 });
  assert.equal(t.byRoute.thought.model, 1);
  assert.equal(t.unread, 1);
  assert.equal(t.untold, 1);
  assert.equal(placed(t), 3);
  assert.equal(countOf(t, "read"), 2);
  assert.equal(share(t, "read"), 67);
  assert.equal(t.byBed.reading.read, 1);
  assert.deepEqual(count(rows(nodes, g, ON)), t);
});

test("a split is said in whole numbers that add to 100", () => {
  const s = normaliseSplit({ read: 1, told: 1, asked: 1 });
  assert.equal(ROUTE_KEYS.reduce((a, k) => a + s[k], 0), 100);
  assert.deepEqual([s.read, s.told, s.asked, s.made], [34, 33, 33, 0]);
  assert.equal(normaliseSplit({ read: -5 }).read, 0);
});

test("the file round-trips, drops what is not a mark, and never keeps a rule", () => {
  const g: Genesis = {
    guess: { split: normaliseSplit({ read: 50, thought: 50 }), on: ON },
    marks: {
      "garden:b": { from: "made", by: "model", because: "Built it", on: ON },
      "garden:a": { from: "told", by: "you", because: "", on: ON },
    },
    untold: { "garden:c": "no answer" },
  };
  const text = serialise(g);
  assert.ok(text.indexOf("garden:a") < text.indexOf("garden:b"));
  assert.deepEqual(parse(JSON.parse(text)), g);
  const messy = parse({
    marks: {
      x: { from: "dreamed", by: "you" },
      y: { from: "read", by: "rule" },
      z: { from: "lived", by: "someone", on: "yesterday" },
    },
    guess: { split: {} },
  });
  assert.deepEqual(Object.keys(messy.marks), ["z"]);
  assert.equal(messy.marks.z.by, "you");
  assert.equal(messy.marks.z.on, "");
  assert.equal(messy.guess, null);
  assert.deepEqual(parse(null), empty());
});

test("the model is asked with every id pinned and six routes or unsaid", () => {
  const n = node("garden:a", "garden", "## Heading\n\n[[A link|shown]] and **bold** text.", "A");
  assert.equal(opening(n), "A. Heading A link and bold text.");
  const p = ask([{ id: "garden:a", text: opening(n) }]);
  const item = p.schema.properties.marks.items.properties;
  assert.deepEqual(item.id.enum, ["garden:a"]);
  assert.deepEqual(item.from.enum, [...ROUTE_KEYS, "unsaid"]);
  assert.match(p.user, /NOTE garden:a/);
});

test("no reading carries a verdict on the reader or on a route", () => {
  const verdict =
    /\b(should|wrong|right|good|bad|better|worse|best|healthy|unhealthy|too many|too few|mistake|lazy|shallow|derivative|original)\b/i;
  const nodes = ROUTE_KEYS.map((k, i) => node(`garden:${k}`, "garden", `${long} ${i}`));
  const g: Genesis = {
    guess: { split: normaliseSplit({ read: 80, thought: 20 }), on: ON },
    marks: Object.fromEntries(
      ROUTE_KEYS.map((k) => [`garden:${k}`, { from: k, by: "model" as const, because: "q", on: ON }]),
    ),
    untold: {},
  };
  for (const guess of [null, g.guess])
    for (const l of readings(tally(nodes, g, ON), guess)) assert.doesNotMatch(l, verdict, l);
  for (const l of readings(tally(nodes, empty(), ON), null)) assert.doesNotMatch(l, verdict, l);
  assert.ok(readings(tally(nodes, g, ON), g.guess).some((l) => l.includes("widest gap")));
});
