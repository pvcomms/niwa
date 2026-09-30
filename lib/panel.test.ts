import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CHECKS,
  DATING,
  LEAD,
  LEAVES,
  MARKER_WORDS,
  NAMES,
} from "../content/panel.ts";
import type { GardenLink } from "./garden.ts";
import {
  BULK,
  MARKERS,
  addDays,
  bulkDays,
  growth,
  hubsOf,
  panel,
  readings,
  said,
  times,
  weeksOf,
  type PanelInput,
} from "./panel.ts";

const link = (
  source: string,
  target: string,
  kind: GardenLink["kind"],
): GardenLink => ({ source, target, kind });

/**
 * Four notes and a term over three weeks. a and b name each other; c links
 * a one way; d is alone until the term reaches it; e seeds an unwritten idea
 * and points at a repo. The index links everything and must count for nothing.
 */
const fixture = (): PanelInput => ({
  today: "2026-09-21",
  nodes: [
    { id: "a", label: "A", kind: "note" },
    { id: "b", label: "B", kind: "garden" },
    { id: "c", label: "C", kind: "project" },
    { id: "d", label: "D", kind: "note" },
    { id: "e", label: "E", kind: "reading" },
    { id: "term", label: "Term", kind: "concept" },
    { id: "idx", label: "MEMORY", kind: "meta" },
    { id: "ghost:x", label: "x", kind: "ghost" },
    { id: "repo:r", label: "r", kind: "repo" },
  ],
  born: {
    a: "2026-09-01",
    b: "2026-09-01",
    c: "2026-09-08",
    d: "2026-09-08",
    e: "2026-09-15",
    term: "2026-09-15",
  },
  touched: {
    a: ["2026-09-01", "2026-09-20"],
    b: ["2026-09-01"],
    c: ["2026-09-08"],
    d: ["2026-09-08"],
    e: ["2026-09-15"],
    term: ["2026-09-15"],
  },
  links: [
    link("a", "b", "link"),
    link("b", "a", "mention"),
    link("c", "a", "link"),
    link("term", "d", "concept"),
    link("e", "ghost:x", "seed"),
    link("e", "repo:r", "build"),
    link("idx", "a", "link"),
    link("idx", "d", "link"),
  ],
});

test("weeks run back from today a week apart, ending with the empty week before the first stone", () => {
  const w = weeksOf("2026-09-01", "2026-09-21");
  assert.deepEqual(w, ["2026-08-31", "2026-09-07", "2026-09-14", "2026-09-21"]);
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});

test("each marker is counted at each week from the day its stones reached the record", () => {
  const p = panel(fixture());
  assert.deepEqual(p.weeks, ["2026-08-31", "2026-09-07", "2026-09-14", "2026-09-21"]);
  assert.deepEqual(p.series.stones, [0, 2, 4, 6]);
  // a–b both ways (2 threads), c→a, term→d
  assert.deepEqual(p.series.threads, [0, 2, 3, 4]);
  assert.deepEqual(p.series.both, [0, 1, 1, 1]);
  assert.deepEqual(p.series.unplanted, [0, 0, 0, 1]);
  // d has no thread until the term arrives; the index is not a thread
  assert.deepEqual(p.series.alone, [0, 0, 1 / 4, 0]);
  // of the five stones that are not terms, only d uses the term
  assert.equal(p.series.vocab.at(-1), 1 / 5);
  // every stone was changed in the thirty days to 21 Sep
  assert.equal(p.series.tended.at(-1), 1);
  // on 10 Oct only a (20 Sep), e and the term (15 Sep) were changed in the month
  assert.equal(panel({ ...fixture(), today: "2026-10-10" }).series.tended.at(-1), 3 / 6);
  assert.equal(p.series.per.at(-1), 4 / 6);
});

test("leaving out the most threaded takes their threads with them", () => {
  const input = fixture();
  const hubs = hubsOf(input, 1);
  assert.equal(hubs[0].id, "a");
  const all = panel(input);
  const without = panel(input, { hubs: true, bulk: false });
  assert.ok(without.left >= 1);
  assert.ok(without.series.threads.at(-1)! < all.series.threads.at(-1)!);
  assert.equal(
    without.series.both.at(-1),
    0,
    "the only pair both ways went with a",
  );
});

test("a day on which many stones appear is planting in bulk, and can be left out", () => {
  const input = fixture();
  for (let i = 0; i < BULK; i++) {
    input.nodes.push({ id: `imp${i}`, label: `Imported ${i}`, kind: "notion" });
    input.born[`imp${i}`] = "2026-09-19";
  }
  const bulk = bulkDays(input);
  assert.equal(bulk.length, 1);
  assert.equal(bulk[0].day, "2026-09-19");
  assert.equal(bulk[0].count, BULK);
  assert.deepEqual(bulk[0].kinds[0], ["notion", BULK]);
  const all = panel(input);
  const without = panel(input, { hubs: false, bulk: true });
  assert.equal(all.series.stones.at(-1)! - without.series.stones.at(-1)!, BULK);
  assert.equal(without.left, BULK);
});

test("a stone with no day in the record is not counted", () => {
  const input = fixture();
  input.nodes.push({ id: "undated", label: "U", kind: "note" });
  assert.equal(panel(input).series.stones.at(-1), 6);
});

test("values are said as a person would", () => {
  assert.equal(said("vocab", 0.243), "24 in 100");
  assert.equal(said("per", 1.96), "2.0");
  assert.equal(said("stones", 1234), "1,234");
  assert.equal(times(0, 5), null);
  assert.equal(times(10, 25), "2.5 times");
  assert.equal(times(10, 250), "25 times");
  assert.match(
    growth(panel(fixture())),
    /^Since the week of 7 Sep: the stones /,
  );
});

test("every marker has its words, and none of the words pass a verdict", () => {
  const verdict =
    /\b(should|must|good|bad|better|worse|best|worst|healthy|unhealthy|health|improv\w*|declin\w*|concern\w*|worr\w*|scor\w*|grade\w*|problem\w*|fail\w*|succe\w*|thriv\w*|decay\w*|neglect\w*)\b/i;
  for (const k of MARKERS) {
    const w = MARKER_WORDS[k];
    assert.ok(w.name && w.how && w.cannot, k);
    for (const s of [w.name, w.how, w.cannot])
      assert.doesNotMatch(s, verdict, s);
  }
  for (const s of [
    ...LEAD,
    LEAVES,
    CHECKS.hubs.label,
    CHECKS.hubs.note,
    CHECKS.bulk.label,
    CHECKS.bulk.note,
    ...Object.values(DATING),
  ])
    assert.doesNotMatch(s, verdict, s);

  const input = fixture();
  for (let i = 0; i < BULK; i++) {
    input.nodes.push({ id: `imp${i}`, label: `Imported ${i}`, kind: "notion" });
    input.born[`imp${i}`] = "2026-09-19";
  }
  for (const leave of [
    { hubs: false, bulk: false },
    { hubs: true, bulk: false },
    { hubs: false, bulk: true },
    { hubs: true, bulk: true },
  ])
    for (const r of readings(panel(input, leave), NAMES))
      assert.doesNotMatch(r, verdict, r);
});
