import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CONFIG,
  LAYOUTS,
  codes,
  expression,
  headingProse,
  parseBearing,
  prose,
  regionName,
  regionsOf,
  serialiseBearing,
  serialiseConfig,
  setDown,
  slotsAt,
  slugOf,
  stonesFor,
  validateConfig,
  type Value,
} from "./bearing.ts";
import type { GardenNode } from "./garden.ts";

const V = DEFAULT_CONFIG.values;

test("slotsAt reads the circles a point falls in, in slot order", () => {
  const L = LAYOUTS[5];
  assert.deepEqual(slotsAt(L, [L.slots[0].cx, L.slots[0].cy]), [0]);
  assert.deepEqual(slotsAt(L, [L.triple!.mx, L.triple!.my]), [0, 1, 2]);
  assert.deepEqual(slotsAt(L, [880, 20]), []);
});

test("codes are initials, widened only where two values share one", () => {
  const vals = (["taste", "trust", "privacy"] as const).map((n): Value => ({
    id: n,
    name: n,
    blurb: "",
    terms: [],
  }));
  assert.deepEqual(codes(vals), ["Ta", "Tr", "P"]);
  assert.deepEqual(codes(V), ["Cr", "Can", "Cu", "Car", "Q"]);
});

test("expression names the intersection, or the complement of everything", () => {
  const vals = (["kindness", "uncertainty", "taste"] as const).map(
    (n): Value => ({ id: n, name: n, blurb: "", terms: [] }),
  );
  assert.equal(expression([0, 2], vals), "K ∩ T");
  assert.equal(expression([], vals), "𝒰 ∖ (K ∪ U ∪ T)");
});

test("prose says what a placement serves and what it is silent on", () => {
  assert.equal(
    prose([0, 1], V),
    "serves craft and candour. silent on curiosity, care and quiet.",
  );
  assert.equal(prose([], V), "outside every value you drew.");
  assert.equal(
    prose([0, 1, 2, 3, 4], V),
    "serves craft, candour, curiosity, care and quiet — all of them at once.",
  );
});

test("a heading reads as what it gains, leaves and keeps", () => {
  assert.equal(
    headingProse([0, 1], [1, 3], V),
    "gains care · leaves craft · keeps candour.",
  );
  assert.equal(headingProse([2], [2], V), "stays within curiosity.");
  assert.equal(headingProse([], [], V), "stays outside every value.");
});

test("regionName finds a named region regardless of the order of its ids", () => {
  assert.equal(regionName([1, 0], DEFAULT_CONFIG)?.name, "the honest object");
  assert.equal(regionName([0], DEFAULT_CONFIG)?.name, "craft");
  assert.equal(regionName([3, 4], DEFAULT_CONFIG), null);
});

test("a bearing survives a round trip through its file", () => {
  const b = {
    slug: "move-west",
    title: "Move west by spring: yes?",
    placed: "2026-09-24",
    since: "2026-09-24",
    at: [412.6, 300.2] as [number, number],
    leads: null,
    note: "It costs the quiet.\n\nBut not the exit.",
    trail: [] as [number, number, string][],
  };
  const raw = serialiseBearing(b);
  assert.match(
    raw,
    /^---\ntitle: "Move west by spring: yes\?"\nplaced: "2026-09-24"\nat: \[413, 300\]\n---\n/,
  );
  const back = parseBearing("move-west", raw);
  assert.deepEqual(back, { ...b, at: [413, 300] });
  const unplaced = parseBearing("x", "---\ntitle: x\n---\n");
  assert.equal(unplaced.at, null);
  assert.equal(unplaced.leads, null);
  assert.equal(unplaced.since, "");
  const walked = parseBearing(
    "w",
    "---\ntitle: w\nplaced: 2026-09-01\nat: [100, 100]\nsince: 2026-09-20\ntrail: [[300, 300, 2026-09-01], [200, 200, \"2026-09-10\"]]\n---\n",
  );
  assert.equal(walked.since, "2026-09-20");
  assert.deepEqual(walked.trail, [
    [300, 300, "2026-09-01"],
    [200, 200, "2026-09-10"],
  ]);
  assert.match(serialiseBearing(walked), /since: "2026-09-20"\ntrail: \[\[300, 300, "2026-09-01"\], \[200, 200, "2026-09-10"\]\]/);
});

test("slugOf makes a file name out of a sentence", () => {
  assert.equal(
    slugOf("Say yes to the job — or not?"),
    "say-yes-to-the-job-or-not",
  );
  assert.equal(slugOf("???"), "decision");
});

test("stonesFor ranks by terms hit in title, tags and first line, never the body", () => {
  const node = (
    id: string,
    label: string,
    extra: Partial<GardenNode> = {},
  ): GardenNode => ({
    id,
    label,
    kind: "note",
    description: "",
    body: "",
    file: null,
    modified: null,
    stage: "unknown",
    signed: null,
    degree: 0,
    source: "vault",
    ...extra,
  });
  const nodes = [
    node("a", "On quiet rooms", { degree: 2 }),
    node("b", "The private ledger", { tags: ["quiet"], degree: 9 }),
    node("c", "Loud thing", { body: "quiet quiet quiet" }),
    node("d", "A ghost", { kind: "ghost", description: "quiet" }),
  ];
  const quiet = V.find((v) => v.id === "quiet")!;
  assert.deepEqual(
    stonesFor(quiet, nodes).map((n) => n.id),
    ["b", "a"],
  );
});

test("validateConfig rejects a values file that does not fit its layout", () => {
  assert.throws(
    () => validateConfig({ layout: 5, values: V.slice(0, 3) }),
    /exactly 5/,
  );
  assert.throws(() => validateConfig({ layout: 4, values: [] }), /3 or 5/);
  const ok = validateConfig({
    layout: 3,
    values: [{ name: "A" }, { name: "B" }, { name: "C" }],
    regions: { "b+a": { name: "ab" }, "a+zz": { name: "dropped" } },
  });
  assert.deepEqual(Object.keys(ok.regions), ["a+b"]);
  assert.deepEqual(ok.values[0].terms, ["A"]);
});

test("setDown keeps where a decision was only when a day has passed", () => {
  const b = parseBearing("d", "---\ntitle: d\nplaced: 2026-09-01\n---\n");
  const first = setDown(b, [100, 100], "2026-09-01");
  assert.deepEqual([first.at, first.since, first.trail], [[100, 100], "2026-09-01", []]);
  const sameDay = setDown(first, [120, 120], "2026-09-01");
  assert.deepEqual([sameDay.at, sameDay.trail], [[120, 120], []]);
  const later = setDown(sameDay, [400, 300], "2026-09-10");
  assert.deepEqual(later.trail, [[120, 120, "2026-09-01"]]);
  assert.equal(later.since, "2026-09-10");
});

test("regionsOf lists the pure pairs and the triple", () => {
  assert.equal(regionsOf(LAYOUTS[5]).length, 8);
  assert.deepEqual(regionsOf(LAYOUTS[3])[3], [0, 1, 2]);
});

test("a values file survives the editor's round trip and drops regions of values that are gone", () => {
  const c = validateConfig({
    layout: 3,
    values: [
      { id: "a", name: "A", hue: 4 },
      { id: "b", name: "B", hue: 9 },
      { id: "c", name: "C" },
    ],
    regions: { "a+b": { name: "ab", blurb: "" } },
  });
  assert.equal(c.values[0].hue, 4);
  assert.equal(c.values[1].hue, undefined);
  const raw = serialiseConfig({
    ...c,
    regions: { ...c.regions, "a+zz": { name: "gone", blurb: "" }, "b+c": { name: "", blurb: "" } },
  });
  const back = validateConfig(JSON.parse(raw));
  assert.deepEqual(Object.keys(back.regions), ["a+b"]);
  assert.match(raw, /"hue": 4/);
  assert.doesNotMatch(raw, /"hue": 9/);
});

