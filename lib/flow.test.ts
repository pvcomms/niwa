import { test } from "node:test";
import assert from "node:assert/strict";
import type { GardenLink, GardenNode } from "./garden.ts";
import {
  buildFlow,
  downstream,
  foundations,
  influences,
  orient,
  reach,
  readings,
  upstream,
} from "./flow.ts";

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

test("orient sends influence the right way for every kind of thread", () => {
  assert.deepEqual(orient(link("note", "cited", "link")), [
    { from: "cited", to: "note", kind: "link" },
  ]);
  assert.deepEqual(orient(link("note", "named", "mention"))[0].from, "named");
  assert.deepEqual(orient(link("note", "ghost", "seed"))[0].from, "ghost");
  assert.deepEqual(orient(link("concept", "note", "concept")), [
    { from: "concept", to: "note", kind: "concept" },
  ]);
  assert.deepEqual(orient(link("note", "repo", "build"))[0].to, "repo");
  assert.equal(orient(link("a", "b", "twin")).length, 2);
});

// kierkegaard → anxiety-note → essay → repo ; essay ↔ draft ; feed → essay ; ghost → essay
const links = [
  link("anxiety-note", "kierkegaard", "link"),
  link("essay", "anxiety-note", "link"),
  link("essay", "repo", "build"),
  link("essay", "draft", "link"),
  link("draft", "essay", "link"),
  link("essay", "feed", "mention"),
  link("essay", "ghost", "seed"),
  link("Anxiety", "essay", "concept"),
];
const nodes = new Map(
  [
    node("kierkegaard", { kind: "reading", stage: "fallow" }),
    node("anxiety-note", { stage: "fallow" }),
    node("essay"),
    node("draft"),
    node("feed", { kind: "reading" }),
    node("ghost", { kind: "ghost", stage: "unknown" }),
    node("Anxiety", { kind: "concept" }),
    node("repo", { kind: "repo" }),
  ].map((n) => [n.id, n]),
);

test("buildFlow walks upstream and downstream by hop, and finds what runs both ways", () => {
  const flow = buildFlow(links);
  const up = upstream(flow, "essay");
  assert.equal(up.get("anxiety-note"), 1);
  assert.equal(up.get("kierkegaard"), 2);
  assert.equal(up.get("feed"), 1);
  assert.equal(up.get("Anxiety"), 1);
  assert.equal(up.get("draft"), 1);
  assert.equal(up.has("repo"), false);
  assert.deepEqual([...downstream(flow, "kierkegaard").keys()].sort(), [
    "anxiety-note",
    "essay",
  ]);
  assert.equal(reach(flow, "kierkegaard"), 2);
  assert.equal(reach(flow, "kierkegaard", 6), 4);
  assert.deepEqual([...flow.mutual.get("essay")!], ["draft"]);
  assert.equal(flow.mutual.has("kierkegaard"), false);
});

test("foundations names the fallow, the unwritten, the linchpin, the loop and the reach", () => {
  const flow = buildFlow(links);
  const f = foundations(flow, nodes, "essay");
  assert.deepEqual(f.direct.sort(), [
    "Anxiety",
    "anxiety-note",
    "draft",
    "feed",
    "ghost",
  ]);
  assert.equal(f.roots.size, 6);
  assert.deepEqual(f.fallow, ["anxiety-note", "kierkegaard"]);
  assert.deepEqual(f.unwritten, ["ghost"]);
  assert.equal(f.read, 2);
  assert.equal(f.own, 3);
  assert.deepEqual(f.linchpins, [{ id: "anxiety-note", exclusive: 2 }]);
  assert.deepEqual(f.loops, ["draft"]);
  assert.deepEqual(f.mutual, ["draft"]);
  assert.equal(f.reach, 2);
  const words = readings(f, nodes);
  assert.match(words[0], /rests on 6 stones within two hops, 5 of them directly/);
  assert.ok(words.some((w) => /2 of its roots have gone fallow/.test(w)));
  assert.ok(words.some((w) => /never written down/.test(w)));
  assert.ok(words.some((w) => /anxiety-note is a linchpin: 2 roots/.test(w)));
  assert.ok(words.some((w) => /a loop/.test(w)));
  assert.ok(words.some((w) => /runs both ways with draft/.test(w)));
  assert.ok(words.some((w) => /flows into 2 stones directly, 2 within two hops/.test(w)));
  const root = foundations(flow, nodes, "kierkegaard");
  assert.match(readings(root, nodes)[0], /a root/);
});

test("influences ranks what shaped the most and what was argued with", () => {
  const flow = buildFlow(links);
  const inf = influences(flow, nodes, 3);
  assert.equal(inf.shaped[0].reach, 3);
  assert.ok(["anxiety-note", "Anxiety", "feed"].includes(inf.shaped[0].id));
  assert.ok(inf.shaped.every((s) => s.id !== "repo" && s.id !== "ghost"));
  assert.deepEqual(inf.argued.map((a) => a.id).sort(), ["draft", "essay"]);
});
