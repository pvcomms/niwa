import { test } from "node:test";
import assert from "node:assert/strict";
import type { GardenNode } from "./garden.ts";
import {
  MIN_WINDOW,
  boil,
  buildIndex,
  conceptsIn,
  distribution,
  dot,
  kde,
  pairwise,
  parseChoice,
  place,
  placementProse,
  serialiseChoice,
  shared,
  stem,
  tokens,
  topMean,
  vectorise,
  windowMembers,
} from "./taste.ts";

const node = (
  id: string,
  label: string,
  body: string,
  extra: Partial<GardenNode> = {},
): GardenNode => ({
  id,
  label,
  kind: "note",
  description: "",
  body,
  file: null,
  modified: "2026-09-01T00:00:00.000Z",
  stage: "settled",
  signed: null,
  degree: 0,
  source: "vault",
  ...extra,
});

test("stem folds plurals and the common suffixes, and leaves short words alone", () => {
  assert.equal(stem("instruments"), "instrument");
  assert.equal(stem("theories"), "theory");
  assert.equal(stem("watching"), "watch");
  assert.equal(stem("boxes"), "box");
  assert.equal(stem("glass"), "glass");
  assert.equal(stem("bus"), "bus");
});

test("tokens drop stopwords, urls, digits and possessives", () => {
  assert.deepEqual(
    tokens("The machine's taste, at https://x.y/z — and 2026 instruments!"),
    ["machine", "taste", "instrument"],
  );
});

test("an index is unit vectors; alike is one, unalike is nought", () => {
  const nodes = [
    node(
      "a",
      "Taste is security",
      "discernment is the last thing that cannot be generated",
    ),
    node(
      "b",
      "Taste is security",
      "discernment is the last thing that cannot be generated",
    ),
    node("c", "Bread", "flour water salt yeast oven crust crumb"),
    node("r", "repo", "not counted", { kind: "repo" }),
  ];
  const idx = buildIndex(nodes);
  assert.equal(idx.N, 3);
  const [a, b, c] = idx.docs;
  assert.ok(Math.abs(dot(a.vec, a.vec) - 1) < 1e-9);
  assert.ok(Math.abs(dot(a.vec, b.vec) - 1) < 1e-9);
  assert.equal(dot(a.vec, c.vec), 0);
  const M = pairwise(idx.docs);
  assert.equal(M[0 * 3 + 1], M[1 * 3 + 0]);
  assert.equal(M[0], 0);
});

test("topMean averages the k largest, and windows cut by date", () => {
  assert.equal(topMean([0.1, 0.9, 0.5, 0.7], 2), 0.8);
  assert.equal(topMean([], 3), 0);
  const docs = buildIndex([
    node("old", "Old note here", "gravel raked into lines every morning", {
      modified: "2026-01-01T00:00:00.000Z",
    }),
    node("new", "New note here", "gravel raked into lines every morning", {
      modified: "2026-09-20T00:00:00.000Z",
    }),
  ]).docs;
  const now = Date.parse("2026-09-24T00:00:00.000Z");
  assert.deepEqual(windowMembers(docs, null, now), [0, 1]);
  assert.deepEqual(windowMembers(docs, 30, now), [1]);
});

test("a distribution is standardised, its curve peaks at one, and small windows have none", () => {
  const nodes: GardenNode[] = [];
  for (let i = 0; i < 40; i++)
    nodes.push(
      node(
        `n${i}`,
        `Note ${i} on ${i % 3 === 0 ? "attention feeds algorithms" : i % 3 === 1 ? "bread baking ovens" : "stone gardens raked gravel"}`,
        `${"attention feeds algorithms taste ".repeat(i % 4)} ${"bread ovens crumb ".repeat(i % 5)} unique${i} word${i * 7}`,
      ),
    );
  const idx = buildIndex(nodes);
  const M = pairwise(idx.docs);
  const all = windowMembers(idx.docs, null);
  const curve = distribution(idx.docs, M, all)!;
  assert.equal(curve.n, 40);
  const mean = curve.items.reduce((s, it) => s + it.z, 0) / curve.n;
  const sd = Math.sqrt(
    curve.items.reduce((s, it) => s + it.z * it.z, 0) / curve.n,
  );
  assert.ok(Math.abs(mean) < 1e-9);
  assert.ok(Math.abs(sd - 1) < 1e-9);
  assert.ok(curve.items.every((it) => it.d >= 0 && it.d <= 1));
  assert.equal(Math.max(...curve.density.map((p) => p[1])), 1);
  assert.equal(distribution(idx.docs, M, all.slice(0, MIN_WINDOW - 1)), null);
  assert.deepEqual(
    kde([0, 0, 0])
      .reduce((best, p) => (p[1] > best[1] ? p : best))[0]
      .toFixed(1),
    "0.0",
  );
});

test("a candidate is placed on the curve, kin listed with the words they share", () => {
  const nodes: GardenNode[] = [];
  for (let i = 0; i < 30; i++)
    nodes.push(
      node(
        `n${i}`,
        i % 2 ? `Feeds and attention ${i}` : `Ovens and bread ${i}`,
        i % 2
          ? "the feed optimises attention toward sameness algorithms desire"
          : "sourdough crumb crust oven steam flour hydration",
      ),
    );
  const idx = buildIndex(nodes);
  const M = pairwise(idx.docs);
  const all = windowMembers(idx.docs, null);
  const curve = distribution(idx.docs, M, all)!;
  const twin = place(
    idx.docs,
    all,
    curve,
    vectorise(
      idx,
      "Feeds and attention",
      "the feed optimises attention toward sameness",
    ),
  );
  const alien = place(
    idx.docs,
    all,
    curve,
    vectorise(
      idx,
      "Quarterly tax filing",
      "depreciation schedules and withholding",
    ),
  );
  assert.ok(twin.z > alien.z);
  assert.ok(alien.c === 0 && alien.kin.length === 0);
  assert.ok(Math.abs(twin.outer + twin.inner - 1) < 1e-9);
  assert.ok(twin.kin.length > 0 && twin.kin[0].shared.includes("feed"));
  assert.deepEqual(
    shared(
      new Map([
        ["a", 0.5],
        ["b", 0.9],
      ]),
      new Map([
        ["a", 0.9],
        ["b", 0.2],
      ]),
    ),
    ["a", "b"],
  );
});

test("the prose names both tails and never praises either", () => {
  assert.match(placementProse(-2, 0.02, 0.98), /far out/);
  assert.match(
    placementProse(-1, 0.1, 0.9),
    /further from the middle than 90%/,
  );
  assert.match(placementProse(0, 0.5, 0.5), /thick of it/);
  assert.match(placementProse(1, 0.9, 0.1), /closer to the middle than 90%/);
  assert.match(placementProse(2, 0.99, 0.01), /already full/);
});

test("conceptsIn follows the garden's rule: one word only when capitalised, phrases regardless", () => {
  const nodes = [
    node("concept:Keep", "Keep", "", { kind: "concept", signed: true }),
    node("concept:delegation-discount", "delegation discount", "", {
      kind: "concept",
      signed: true,
      aliases: ["the discount"],
    }),
    node("concept:Slop", "Slop", "", { kind: "concept", signed: false }),
  ];
  const hits = conceptsIn(
    nodes,
    "you keep paying The Delegation Discount, and the slop wins",
  );
  assert.deepEqual(
    hits.map((h) => h.id),
    ["concept:delegation-discount"],
  );
  assert.deepEqual(
    conceptsIn(nodes, "Keep the exit; the discount compounds").map((h) => h.id),
    ["concept:Keep", "concept:delegation-discount"],
  );
});

test("a choice survives its file, note and text kept apart", () => {
  const c = {
    slug: "the-sameness-engine",
    title: "The Sameness Engine",
    source: "https://example.org/x",
    weighed: "2026-09-24",
    verdict: "let in" as const,
    z: { all: 0.31, d90: -1.4 },
    note: "more of the same, and I know it",
    text: "Every feed optimises toward the same person.\n\nNotes on wanting your own desires.",
  };
  const raw = serialiseChoice(c);
  assert.match(raw, /^---\ntitle: "The Sameness Engine"\n/);
  assert.match(raw, /\nz: \{all: 0.31, d90: -1.40\}\n/);
  assert.deepEqual(parseChoice(c.slug, raw), c);
  const bare = parseChoice(
    "x",
    '---\ntitle: "x"\nverdict: "maybe"\n---\njust text\n',
  );
  assert.equal(bare.verdict, "");
  assert.equal(bare.note, "");
  assert.equal(bare.text, "just text");
});

test("boil keeps a page's title, description and words, and drops its chrome", () => {
  const html = `<html><head><title> An Essay </title><meta name="description" content="What it says."></head>
  <body><nav>Home Login</nav><script>var x=1</script><h1>An Essay</h1><p>The body &amp; its words.</p><footer>© 2026</footer></body></html>`;
  const b = boil(html);
  assert.equal(b.title, "An Essay");
  assert.equal(b.text, "What it says.\nAn Essay The body & its words.");
});
