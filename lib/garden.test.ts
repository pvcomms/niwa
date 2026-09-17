import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// NIWA_MEMORY_DIR / NIWA_VAULT_DIR / NIWA_CODE_DIR are read once at module load,
// so the fixture tree and env vars must exist before garden.ts is first imported.
const root = fs.mkdtempSync(path.join(os.tmpdir(), "niwa-test-"));
const memoryDir = path.join(root, "memory");
const vaultDir = path.join(root, "vault");
const codeDir = path.join(root, "code");
fs.mkdirSync(memoryDir, { recursive: true });
fs.mkdirSync(path.join(vaultDir, "Glossary"), { recursive: true });
fs.mkdirSync(path.join(codeDir, "somerepo"), { recursive: true });

fs.writeFileSync(
  path.join(memoryDir, "project_alpha.md"),
  `---
name: Alpha Project
description: A tool for reading: works offline
type: project
---

Links to [[project_beta]] and also [[Nonexistent Thing]].
Mentions SomeConcept in passing, and points at code in ~/Code/somerepo.
`,
);

fs.writeFileSync(
  path.join(memoryDir, "project_beta.md"),
  `---
name: Beta Project
type: project
---

A minimal second project, linked back via [[project_alpha]].
`,
);

fs.writeFileSync(
  path.join(vaultDir, "Glossary", "SomeConcept.md"),
  `---
status: mine
meaning: A concept used to test matching.
---

The concept itself, defined here.
`,
);

process.env.NIWA_MEMORY_DIR = memoryDir;
process.env.NIWA_VAULT_DIR = vaultDir;
process.env.NIWA_CODE_DIR = codeDir;

const { buildGarden } = await import("./garden.ts");
const garden = buildGarden();

test("reads frontmatter that real YAML would reject", () => {
  // "description: A tool for reading: works offline" is a plain scalar with an
  // embedded ": " — js-yaml throws "mapping values are not allowed in this
  // context" on that. safeMatter's lenient fallback must still recover it whole.
  const alpha = garden.nodes.find((n) => n.id === "project_alpha");
  assert.ok(alpha, "project_alpha should exist despite malformed frontmatter");
  assert.equal(alpha!.label, "Alpha Project");
  assert.equal(alpha!.description, "A tool for reading: works offline");
  assert.equal(alpha!.kind, "project");
});

test("resolves an explicit wikilink to the target node", () => {
  const hit = garden.links.find(
    (l) =>
      l.source === "project_alpha" &&
      l.target === "project_beta" &&
      l.kind === "link",
  );
  assert.ok(hit, "project_alpha should link to project_beta");
});

test("an unresolved wikilink becomes a ghost stone, not a crash", () => {
  const ghost = garden.nodes.find(
    (n) => n.kind === "ghost" && n.label === "Nonexistent Thing",
  );
  assert.ok(ghost, "unresolved wikilink should produce a ghost node");
  const seed = garden.links.find(
    (l) =>
      l.source === "project_alpha" &&
      l.target === ghost!.id &&
      l.kind === "seed",
  );
  assert.ok(seed, "the ghost should be reached by a seed link");
});

test("a glossary concept is signed when status: mine, and links to where it's used", () => {
  const concept = garden.nodes.find((n) => n.id === "concept:SomeConcept");
  assert.ok(concept);
  assert.equal(concept!.signed, true);
  const used = garden.links.find(
    (l) =>
      l.source === "concept:SomeConcept" &&
      l.target === "project_alpha" &&
      l.kind === "concept",
  );
  assert.ok(
    used,
    "a concept mentioned in a note's body should link to that note",
  );
});

test("a ~/Code/x mention resolves to the repo actually on disk", () => {
  const repo = garden.nodes.find((n) => n.id === "repo:somerepo");
  assert.ok(repo, "a directory under NIWA_CODE_DIR should become a repo node");
  const build = garden.links.find(
    (l) =>
      l.source === "project_alpha" &&
      l.target === "repo:somerepo" &&
      l.kind === "build",
  );
  assert.ok(
    build,
    "a note naming ~/Code/somerepo should link to the repo node",
  );
});

test("stats are internally consistent", () => {
  assert.equal(garden.stats.nodes, garden.nodes.length);
  assert.equal(garden.stats.links, garden.links.length);
});
