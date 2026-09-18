import { test } from "node:test";
import assert from "node:assert/strict";
import { rankUnplanted, unplantedById } from "./ghosts.ts";
import type { Garden, GardenNode, GardenLink } from "./garden.ts";

// A hand-built graph rather than a fixture tree on disk: rankUnplanted is pure,
// and going through the filesystem would test garden.ts a second time instead.
function node(id: string, label: string, kind: GardenNode["kind"]): GardenNode {
  return {
    id,
    label,
    kind,
    description: "",
    body: "",
    file: null,
    modified: null,
    stage: "unknown",
    signed: null,
    degree: 0,
    source: "memory",
  };
}

function garden(nodes: GardenNode[], links: GardenLink[]): Garden {
  return {
    nodes,
    links,
    stats: {
      nodes: nodes.length,
      links: links.length,
      byKind: {},
      byStage: {},
      orphans: 0,
      ghosts: nodes.filter((n) => n.kind === "ghost").length,
      signedTerms: 0,
      totalTerms: 0,
      newest: null,
      oldest: null,
      builtAt: "2026-09-19T00:00:00.000Z",
    },
  };
}

const g = garden(
  [
    node("a", "Alpha", "project"),
    node("b", "Beta", "project"),
    node("c", "Gamma", "note"),
    node("ghost:taste", "Taste", "ghost"),
    node("ghost:coherence", "Coherence", "ghost"),
    node("ghost:attention", "Attention", "ghost"),
  ],
  [
    { source: "a", target: "ghost:taste", kind: "seed" },
    { source: "b", target: "ghost:taste", kind: "seed" },
    { source: "c", target: "ghost:taste", kind: "seed" },
    { source: "a", target: "ghost:coherence", kind: "seed" },
    { source: "b", target: "ghost:attention", kind: "seed" },
    // Not a seed link — must not count toward any ghost.
    { source: "a", target: "b", kind: "link" },
  ],
);

test("ranks ghosts by how many distinct notes point at them", () => {
  const ranked = rankUnplanted(g);
  assert.deepEqual(
    ranked.map((u) => [u.label, u.count]),
    [
      ["Taste", 3],
      ["Attention", 1],
      ["Coherence", 1],
    ],
  );
});

test("ties break alphabetically, so output is stable between runs", () => {
  const ranked = rankUnplanted(g);
  const tied = ranked.filter((u) => u.count === 1).map((u) => u.label);
  assert.deepEqual(tied, ["Attention", "Coherence"]);
});

test("counts distinct sources, not raw links", () => {
  const dup = garden(
    [node("a", "Alpha", "project"), node("ghost:x", "X", "ghost")],
    [
      { source: "a", target: "ghost:x", kind: "seed" },
      { source: "a", target: "ghost:x", kind: "seed" },
    ],
  );
  assert.equal(rankUnplanted(dup)[0].count, 1);
});

test("names the notes doing the pointing, alphabetically", () => {
  const taste = rankUnplanted(g).find((u) => u.label === "Taste");
  assert.deepEqual(taste?.pointedFrom, ["Alpha", "Beta", "Gamma"]);
});

test("non-seed links never contribute", () => {
  const beta = rankUnplanted(g).find((u) => u.label === "Beta");
  assert.equal(beta, undefined); // Beta is a project, not a ghost
});

test("tolerates link ends that force-graph has replaced with node objects", () => {
  const mutated = garden(
    [node("a", "Alpha", "project"), node("ghost:x", "X", "ghost")],
    [
      {
        source: { id: "a" },
        target: { id: "ghost:x" },
        kind: "seed",
      } as unknown as GardenLink,
    ],
  );
  assert.deepEqual(rankUnplanted(mutated)[0].pointedFrom, ["Alpha"]);
});

test("a garden with no ghosts ranks to nothing", () => {
  const bare = garden([node("a", "Alpha", "project")], []);
  assert.deepEqual(rankUnplanted(bare), []);
});

test("unplantedById keys the rank by ghost id", () => {
  const byId = unplantedById(g);
  assert.equal(byId.get("ghost:taste"), 3);
  assert.equal(byId.get("ghost:coherence"), 1);
  assert.equal(byId.get("a"), undefined);
});
