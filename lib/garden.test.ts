import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// NIWA_MEMORY_DIR / NIWA_VAULT_DIR / NIWA_CODE_DIR / NIWA_GARDEN_DIR and HOME are
// read once at module load, so the fixture tree and env vars must exist before
// garden.ts is first imported. realpath: on macOS tmpdir is behind /private.
const root = fs.realpathSync(
  fs.mkdtempSync(path.join(os.tmpdir(), "niwa-test-")),
);
const memoryDir = path.join(root, "memory");
const vaultDir = path.join(root, "vault");
const codeDir = path.join(root, "code");
const gardenDir = path.join(root, "niwa-vault", "content", "notes");
fs.mkdirSync(memoryDir, { recursive: true });
fs.mkdirSync(path.join(vaultDir, "Glossary"), { recursive: true });
fs.mkdirSync(path.join(vaultDir, "Sources"), { recursive: true });
fs.mkdirSync(path.join(codeDir, "somerepo"), { recursive: true });
fs.mkdirSync(gardenDir, { recursive: true });
// ~/Code is a farm of symlinks now; the repo really lives somewhere else.
fs.mkdirSync(path.join(root, "personal", "tools", "linked-repo"), {
  recursive: true,
});
fs.symlinkSync(
  path.join(root, "personal", "tools", "linked-repo"),
  path.join(codeDir, "linked"),
);

const note = (dir: string, name: string, text: string) =>
  fs.writeFileSync(path.join(dir, name), text);

note(
  memoryDir,
  "project_survey.md",
  `---
name: project_survey
type: project
---

The Field Survey is kept in the vault; there is nothing to resolve here yet.
Code lives at ~/personal/tools/linked-repo/src/index.ts.
`,
);

note(
  path.join(vaultDir, "Sources"),
  "The Long Article Title About Things - Some Magazine.md",
  "An article, filed in Fieldnotes.\n",
);

// The vault: one file per note, linked by slug.
note(
  gardenDir,
  "survey.md",
  `---
title: "Field Survey"
stage: seed
source: notion
---
Parent page. [[beta]] is a child.
`,
);
note(
  gardenDir,
  "beta.md",
  `---
title: "A Child Page"
source: notion
---
`,
);
note(
  gardenDir,
  "to-resolve.md",
  `---
title: "To Resolve"
source: notion
---
Open questions.
`,
);
note(
  gardenDir,
  "long-article.md",
  `---
title: "The Long Article Title About Thi"
source: notion
---
Highlights.
`,
);
note(
  gardenDir,
  "bridge.md",
  `---
title: "Bridge"
source: notion
related: [project_alpha]
---
Nothing in the body links anywhere.
`,
);
note(
  gardenDir,
  "essay.md",
  `---
title: "An Essay"
tended: 2020-01-01
---
Written about the Beta Project, in prose.
`,
);

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

// The index a person reads: its link text is the readable title for slug-named notes.
note(
  memoryDir,
  "project_slugged.md",
  `---
name: project-slugged
type: project
---

A note whose name is only its filename.
`,
);
note(
  memoryDir,
  "MEMORY.md",
  "- [Slugged Thing — a readable title](project_slugged.md) — hook\n",
);

process.env.NIWA_MEMORY_DIR = memoryDir;
process.env.NIWA_VAULT_DIR = vaultDir;
process.env.NIWA_CODE_DIR = codeDir;
process.env.NIWA_GARDEN_DIR = gardenDir;
process.env.HOME = root;

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

const has = (source: string, target: string, kind: string) =>
  garden.links.some(
    (l) =>
      ((l.source === source && l.target === target) ||
        (kind === "twin" && l.source === target && l.target === source)) &&
      l.kind === kind,
  );

test("vault notes become stones, kinded by where they were imported from", () => {
  const byId = new Map(garden.nodes.map((n) => [n.id, n]));
  assert.equal(byId.get("garden:survey")?.kind, "notion");
  assert.equal(byId.get("garden:survey")?.label, "Field Survey");
  assert.equal(byId.get("garden:essay")?.kind, "garden");
  // `tended` is the vault's record of work; the fixture file was written today.
  assert.equal(byId.get("garden:essay")?.stage, "fallow");
  assert.equal(byId.get("garden:beta")?.body, "");
});

test("a [[slug]] in a vault note resolves inside the vault first", () => {
  // "beta" is also project_beta's bare key; from a vault note it means beta.md.
  assert.ok(has("garden:survey", "garden:beta", "link"));
  assert.ok(!has("garden:survey", "project_beta", "link"));
});

test("related: frontmatter draws a written link across sources", () => {
  assert.ok(has("garden:bridge", "project_alpha", "link"));
});

test("prose that names a note by title becomes a mention", () => {
  assert.ok(has("project_survey", "garden:survey", "mention"));
  assert.ok(has("garden:essay", "project_beta", "mention"));
  // Two-word titles must match their capitals: "to resolve" is not "To Resolve".
  assert.ok(!has("project_survey", "garden:to-resolve", "mention"));
});

test("the same document filed in two sources is a twin, truncated title or not", () => {
  assert.ok(
    has(
      "garden:long-article",
      "note:Sources/The Long Article Title About Things - Some Magazine",
      "twin",
    ),
  );
});

test("a symlinked repo is followed, and its real path resolves as code", () => {
  const repo = garden.nodes.find((n) => n.id === "repo:linked");
  assert.ok(repo, "a symlink under NIWA_CODE_DIR should become a repo node");
  assert.equal(repo!.description, "~/personal/tools/linked-repo");
  assert.ok(has("project_survey", "repo:linked", "build"));
});

test("a slug-only memory name reads as its MEMORY.md title", () => {
  const n = garden.nodes.find((x) => x.id === "project_slugged");
  assert.equal(n?.label, "Slugged Thing — a readable title");
  // A name somebody wrote stays as written.
  assert.equal(
    garden.nodes.find((x) => x.id === "project_alpha")?.label,
    "Alpha Project",
  );
});
