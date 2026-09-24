import { test } from "node:test";
import assert from "node:assert/strict";
import type { GardenNode } from "./garden.ts";
import {
  childrenOf,
  gist,
  makeResolver,
  outline,
  snippet,
  trail,
} from "./place.ts";

const node = (
  partial: Partial<GardenNode> & Pick<GardenNode, "id" | "kind">,
): GardenNode => ({
  label: partial.id,
  description: "",
  body: "",
  file: null,
  modified: null,
  stage: "unknown",
  signed: null,
  degree: 0,
  source: "garden",
  parent: null,
  ...partial,
});

// A small Notion tree: root > section > (b, a) — listed b first in the section.
const root = node({
  id: "garden:root",
  kind: "notion",
  label: "Workspace",
  body: "- [[section]]",
});
const section = node({
  id: "garden:section",
  kind: "notion",
  label: "Section",
  parent: "garden:root",
  body: "[[b|Bee]]\n\n[[a]]",
});
const a = node({
  id: "garden:a",
  kind: "notion",
  label: "Alpha",
  parent: "garden:section",
});
const b = node({
  id: "garden:b",
  kind: "notion",
  label: "Beta",
  parent: "garden:section",
});
const memo = node({
  id: "project_x",
  kind: "project",
  label: "X",
  source: "memory",
});
const source = node({
  id: "note:Sources/An Article",
  kind: "note",
  label: "An Article",
  source: "vault",
});
const repo = node({
  id: "repo:kiku",
  kind: "repo",
  label: "kiku",
  source: "code",
  description: "~/personal/tools/apps/kiku",
});
const all = [memo, b, a, section, root, source, repo];
const byId = new Map(all.map((n) => [n.id, n]));

test("a vault note's trail is its parent chain, top first", () => {
  assert.deepEqual(
    trail(a, byId).map((c) => c.label),
    ["Workspace", "Section"],
  );
  assert.equal(trail(a, byId)[0].id, "garden:root");
});

test("untreed notes are placed by where they live", () => {
  assert.deepEqual(
    trail(memo, byId).map((c) => c.label),
    ["Memory", "Builds"],
  );
  assert.deepEqual(
    trail(source, byId).map((c) => c.label),
    ["Fieldnotes", "Sources"],
  );
  assert.deepEqual(
    trail(repo, byId).map((c) => c.label),
    ["personal", "tools", "apps"],
  );
});

test("a parent cycle cannot hang the trail", () => {
  const p = node({ id: "garden:p", kind: "notion", parent: "garden:q" });
  const q = node({ id: "garden:q", kind: "notion", parent: "garden:p" });
  const idx = new Map([p, q].map((n) => [n.id, n]));
  assert.equal(trail(p, idx).length, 1);
});

test("children come in the order their parent lists them", () => {
  assert.deepEqual(
    childrenOf(section, all).map((n) => n.id),
    ["garden:b", "garden:a"],
  );
});

test("the outline walks each tree depth-first, bed by bed", () => {
  const o = outline(all);
  const order = [...o.entries()]
    .sort((x, y) => x[1].index - y[1].index)
    .map(([id]) => id);
  // project (Builds) is the first bed in the legend; the Notion tree reads top-down.
  assert.deepEqual(order.slice(0, 5), [
    "project_x",
    "note:Sources/An Article",
    "garden:root",
    "garden:section",
    "garden:b",
  ]);
  assert.equal(o.get("garden:a")!.depth, 2);
  assert.equal(o.size, all.length);
});

test("a snippet is the sentence around the match, links flattened", () => {
  const s = snippet(
    "Before the [[slug|named thing]] there was a long quiet stretch of garden.",
    "quiet",
    12,
  );
  assert.ok(s);
  assert.equal(s!.match, "quiet");
  assert.ok(s!.before.includes("a long"));
  assert.equal(snippet("nothing here", "absent"), null);
});

test("a vault note's [[slug]] resolves inside the vault before anywhere else", () => {
  const vaultBeta = node({ id: "garden:beta", kind: "notion", label: "Beta" });
  const memoryBeta = node({
    id: "project_beta",
    kind: "project",
    label: "Beta Project",
    source: "memory",
  });
  const resolve = makeResolver([memoryBeta, vaultBeta]);
  assert.equal(resolve("beta", vaultBeta)?.id, "garden:beta");
  assert.equal(resolve("beta", memoryBeta)?.id, "project_beta");
  assert.equal(resolve("project_beta")?.id, "project_beta");
  assert.equal(resolve("nothing at all"), null);
});

test("gist is the description, or the body as plain words, cut short", () => {
  const withDescription = node({ id: "a", kind: "note", description: "A note.", body: "# Ignored" });
  assert.equal(gist(withDescription), "A note.");
  const fromBody = node({
    id: "b",
    kind: "note",
    body: "---\ntitle: x\n---\n## Heading\n\nSome **bold** words, a [link](https://x.y/z), and `code`.",
  });
  assert.equal(gist(fromBody), "Heading Some bold words, a link, and code.");
  assert.equal(gist(fromBody, 12), "Heading So…");
  assert.equal(gist(node({ id: "c", kind: "note" })), "");
});
