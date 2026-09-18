import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPublicGarden,
  auditPublicGarden,
  type PublicRepo,
} from "./publish.ts";
import type { Garden, GardenNode } from "./garden.ts";

function node(
  partial: Partial<GardenNode> & Pick<GardenNode, "id" | "kind">,
): GardenNode {
  return {
    label: partial.id,
    description: "",
    body: "",
    file: null,
    modified: null,
    stage: "unknown",
    signed: null,
    degree: 0,
    source: "memory",
    ...partial,
  };
}

function garden(nodes: GardenNode[], links: Garden["links"] = []): Garden {
  return {
    nodes,
    links,
    stats: {
      nodes: nodes.length,
      links: links.length,
      byKind: {},
      byStage: {},
      orphans: 0,
      ghosts: 0,
      signedTerms: 0,
      totalTerms: 0,
      newest: null,
      oldest: null,
      builtAt: new Date(0).toISOString(),
    },
  };
}

// ── auditPublicGarden: the last line of defence before a public deploy ─────

test("audit catches a home directory path", () => {
  const g = garden([
    node({ id: "a", kind: "note", body: "see /Users/param/notes.md" }),
  ]);
  const hits = auditPublicGarden(g);
  assert.ok(hits.some((h) => h.tripwire === "home directory path"));
});

test("audit catches an email address", () => {
  const g = garden([
    node({ id: "a", kind: "note", description: "reach me at me@example.com" }),
  ]);
  const hits = auditPublicGarden(g);
  assert.ok(hits.some((h) => h.tripwire === "email address"));
});

test("audit catches API keys across providers", () => {
  const keys = [
    "sk-abcdefgh12345678",
    "ghp_abcdefgh12345678",
    "AIzaSyAbcdefgh12345678",
  ];
  for (const key of keys) {
    const g = garden([node({ id: "a", kind: "note", body: `token: ${key}` })]);
    const hits = auditPublicGarden(g);
    assert.ok(
      hits.some((h) => h.tripwire === "api key or token"),
      `expected a hit for ${key}`,
    );
  }
});

test("audit catches health, family, and infrastructure terms", () => {
  const cases = [
    { body: "took my ADHD meds today", tripwire: "medication or health" },
    { body: "my mother called", tripwire: "family or estrangement" },
    {
      body: "restarted the shosai stand",
      tripwire: "private stand or infrastructure",
    },
    { body: "served on 127.0.0.1:5050", tripwire: "localhost stand" },
  ];
  for (const { body, tripwire } of cases) {
    const g = garden([node({ id: "a", kind: "note", body })]);
    const hits = auditPublicGarden(g);
    assert.ok(
      hits.some((h) => h.tripwire === tripwire),
      `expected "${tripwire}" for: ${body}`,
    );
  }
});

test("audit is silent on an ordinary public-safe node", () => {
  const g = garden([
    node({
      id: "concept:delegation-discount",
      kind: "concept",
      label: "Delegation Discount",
      description:
        "The gap between doing a thing and checking that it was done.",
      body: "An idea practised across several essays.",
    }),
  ]);
  assert.deepEqual(auditPublicGarden(g), []);
});

test("audit exceptions suppress only the named node+tripwire pair, not others", () => {
  // AUDIT_EXCEPTIONS excuses repo:kiku for "private stand or infrastructure",
  // because that repo is public on GitHub and the node is built from GitHub's
  // own response. No other node gets that pass, and no other tripwire does.
  const excused = garden([
    node({
      id: "repo:kiku",
      kind: "repo",
      label: "kiku",
      description: "Hear it, on your own machine.",
    }),
  ]);
  assert.deepEqual(auditPublicGarden(excused), []);

  const otherNode = garden([
    node({
      id: "repo:some-other-stand",
      kind: "repo",
      description: "Runs alongside kiku.",
    }),
  ]);
  assert.ok(
    auditPublicGarden(otherNode).some(
      (h) => h.tripwire === "private stand or infrastructure",
    ),
  );

  const otherTripwire = garden([
    node({
      id: "repo:kiku",
      kind: "repo",
      label: "kiku",
      description: "Notes on my ADHD.",
    }),
  ]);
  assert.ok(
    auditPublicGarden(otherTripwire).some(
      (h) => h.tripwire === "medication or health",
    ),
  );
});

// ── buildPublicGarden: topology survives, private text never does ─────────

const repos: PublicRepo[] = [
  {
    name: "bonp",
    description: "Signed envelopes for biometric claims.",
    url: "https://github.com/pvcomms/bonp",
  },
];

test("a public repo ships with GitHub's own description, not the local one", () => {
  const full = garden([
    node({
      id: "repo:bonp",
      kind: "repo",
      label: "bonp",
      description: "~/Code/bonp", // what lib/garden.ts actually writes locally
      file: "/Users/param/Code/bonp",
    }),
  ]);
  const pub = buildPublicGarden(full, repos);
  const shipped = pub.nodes.find((n) => n.id === "repo:bonp");
  assert.ok(shipped);
  assert.equal(shipped!.description, "Signed envelopes for biometric claims.");
  assert.equal(shipped!.file, "https://github.com/pvcomms/bonp");
});

test("a repo with no public counterpart on GitHub is dropped entirely", () => {
  const full = garden([
    node({ id: "repo:private-thing", kind: "repo", label: "private-thing" }),
  ]);
  const pub = buildPublicGarden(full, repos);
  assert.equal(
    pub.nodes.find((n) => n.id === "repo:private-thing"),
    undefined,
  );
});

test("a concept ships as itself but never with its home-directory file path", () => {
  const full = garden([
    node({
      id: "concept:foo",
      kind: "concept",
      label: "Foo",
      description: "An idea.",
      file: "/Users/param/Fieldnotes/Glossary/Foo.md",
    }),
  ]);
  const pub = buildPublicGarden(full, repos);
  const shipped = pub.nodes.find((n) => n.id === "concept:foo");
  assert.ok(shipped);
  assert.equal(shipped!.file, null);
});

test("a withheld concept never survives the public build", () => {
  const full = garden([
    node({
      id: "concept:hypercuriosity",
      kind: "concept",
      label: "Hypercuriosity",
    }),
  ]);
  const pub = buildPublicGarden(full, repos);
  assert.equal(
    pub.nodes.find((n) => n.id === "concept:hypercuriosity"),
    undefined,
  );
});

test("private node kinds (memory notes, fieldnotes, ghosts) never survive", () => {
  const full = garden([
    node({ id: "user_self", kind: "user" }),
    node({ id: "note:idea", kind: "note" }),
    node({ id: "ghost:unwritten", kind: "ghost" }),
  ]);
  // No repos passed: buildPublicGarden always injects the full public-repo list
  // (see "add the rest from GitHub directly"), which isn't what this case tests.
  const pub = buildPublicGarden(full, []);
  assert.equal(pub.nodes.length, 0);
  const findings = auditPublicGarden(pub);
  assert.deepEqual(findings, []);
});

test("a wikilink to a note that didn't survive is flattened to plain text", () => {
  const full = garden([
    node({
      id: "concept:foo",
      kind: "concept",
      label: "Foo",
      body: "See [[Some Private Note|the writeup]] for more.",
    }),
  ]);
  const pub = buildPublicGarden(full, repos);
  const shipped = pub.nodes.find((n) => n.id === "concept:foo")!;
  assert.ok(!shipped.body.includes("[["));
  assert.ok(shipped.body.includes("the writeup"));
});

test("a link between two surviving public nodes is kept", () => {
  const full = garden(
    [
      node({ id: "concept:foo", kind: "concept", label: "Foo" }),
      node({ id: "repo:bonp", kind: "repo", label: "bonp" }),
    ],
    [{ source: "concept:foo", target: "repo:bonp", kind: "build" }],
  );
  const pub = buildPublicGarden(full, repos);
  assert.equal(pub.links.length, 1);
});

test("seed (ghost) links never survive, even between two surviving nodes", () => {
  const full = garden(
    [
      node({ id: "concept:foo", kind: "concept", label: "Foo" }),
      node({ id: "repo:bonp", kind: "repo", label: "bonp" }),
    ],
    [{ source: "concept:foo", target: "repo:bonp", kind: "seed" }],
  );
  const pub = buildPublicGarden(full, repos);
  assert.equal(pub.links.length, 0);
});
