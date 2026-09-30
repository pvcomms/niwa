import assert from "node:assert/strict";
import { test } from "node:test";
import type { GardenLink, GardenNode } from "./garden.ts";
import { buildIndex } from "./taste.ts";
import {
  KIN_FLOOR,
  TOUCH_MAX,
  canonFrom,
  parseCanon,
  proposals,
  readings,
  recordReadings,
  serialiseCanon,
  sinceKept,
  takeIn,
  tally,
  toggleOut,
  toggleTouch,
  validateCanon,
  type Dated,
} from "./canon.ts";
import { reachers, rootsOf, strandOf } from "./canon-strand.ts";
import { SPECIMEN_CANON } from "../content/canon.ts";

const VERDICT =
  /\b(you should|should (keep|drop|cut|read)|wise|unwise|good|bad|better|worse|best|worst|mistake|wrong|recommend\w*|score|important|matters most|essential|weak|strong)\b/i;

const node = (
  id: string,
  kind: GardenNode["kind"],
  body = "",
  modified: string | null = "2026-09-01T00:00:00Z",
): GardenNode => ({
  id,
  label: id.replace(/^\w+:/, "").replace(/-/g, " "),
  kind,
  description: "",
  body,
  file: `/g/${id}.md`,
  modified,
  stage: "tended",
  signed: null,
  degree: 0,
  source: "garden",
});
const L = (source: string, target: string, kind: GardenLink["kind"]): GardenLink => ({ source, target, kind });

const DAYS: Record<string, string> = {
  "garden:root": "2026-01-05",
  "garden:a": "2026-02-01",
  "garden:b": "2026-03-01",
  "garden:c": "2026-04-01",
};
const dayOf = (n: GardenNode): Dated =>
  DAYS[n.id]
    ? { day: DAYS[n.id], approx: false }
    : n.modified
      ? { day: n.modified.slice(0, 10), approx: true }
      : { day: null, approx: false };

const TEXT =
  "delegation discount cognitive sovereignty the cost of handing judgment to a machine delegation atrophy";
const NODES: GardenNode[] = [
  node("garden:root", "garden", TEXT),
  node("garden:a", "garden", "a note on something"),
  node("garden:b", "garden", "another note entirely"),
  node("garden:c", "note", "a third one"),
  node("concept:Delegation", "concept", "delegation as a term"),
  node("garden:twin", "garden", "the same piece"),
  node("garden:kin", "note", `${TEXT} again, said differently`),
  node("garden:far", "note", "gardening tomatoes in august soil water"),
  node("ghost:x", "ghost"),
  node("repo:tool", "repo"),
];
const LINKS: GardenLink[] = [
  L("garden:a", "garden:root", "link"),
  L("garden:a", "garden:root", "mention"), // the link wins
  L("garden:b", "garden:root", "mention"),
  L("concept:Delegation", "garden:root", "concept"), // root uses the term: the concept does not reach for root
  L("garden:root", "concept:Delegation", "link"),
  L("concept:Delegation", "garden:c", "concept"), // c uses the term
  L("garden:c", "garden:root", "link"),
  L("garden:twin", "garden:root", "twin"),
  L("ghost:x", "garden:root", "link"), // a ghost reaches for nothing
  L("garden:a", "garden:b", "link"),
  L("garden:b", "garden:c", "mention"),
  L("garden:a", "repo:tool", "build"),
];

test("who reaches for whom: the strongest thread wins, a concept is reached for by its uses, ghosts do not reach", () => {
  const r = reachers(LINKS);
  const root = r.get("garden:root")!;
  assert.equal(root.get("garden:a"), "links");
  assert.equal(root.get("garden:b"), "names");
  assert.equal(root.get("garden:c"), "links");
  assert.equal(root.get("garden:twin"), "twin");
  assert.equal(r.get("concept:Delegation")!.get("garden:c"), "term");
  assert.equal(r.get("concept:Delegation")!.get("garden:root"), "links");
  const roots = rootsOf(NODES, r, dayOf, 3);
  assert.deepEqual(
    roots.map((x) => [x.id, x.reached, x.by]),
    [["garden:root", 3, { links: 2, names: 1, term: 0 }]],
    "a twin and a ghost are not counted as reaching",
  );
});

test("a strand is what reaches for the root, then kin by words, each marked for how it got in and in the order it arrived", () => {
  const index = buildIndex(NODES);
  const s = strandOf("garden:root", NODES, LINKS, reachers(LINKS), index, dayOf)!;
  assert.deepEqual(
    s.members.map((m) => [m.id, m.how]),
    [
      ["garden:a", "links"],
      ["garden:b", "names"],
      ["garden:c", "links"],
      ["garden:twin", "twin"],
      ["garden:kin", "kin"],
    ],
  );
  const kin = s.members.find((m) => m.how === "kin")!;
  assert.ok(kin.shared.length > 0, "kin carries the words it shares");
  assert.ok(!s.members.some((m) => m.id === "garden:far"), `nothing under ${KIN_FLOOR} is kin`);
  assert.equal(s.threads, 2, "a–b and b–c, the root not counted");
  assert.equal(s.members.find((m) => m.id === "garden:b")!.threads, 2);
  assert.deepEqual(s.builds, ["tool"]);
  assert.equal(strandOf("repo:tool", NODES, LINKS, reachers(LINKS), index, dayOf), null);
});

test("touchpoints offered carry their because; ten at most; a struck stone is no touchpoint", () => {
  const s = strandOf("garden:root", NODES, LINKS, reachers(LINKS), buildIndex(NODES), dayOf)!;
  const p = proposals(s.members, new Set());
  assert.equal(p[0].id, "garden:a");
  assert.match(p[0].because, /first on record, 1 Feb/);
  assert.ok(p.some((x) => x.id === "garden:c" && /latest/.test(x.because)));
  assert.ok(p.some((x) => /threaded to 2 others/.test(x.because)));
  assert.ok(!proposals(s.members, new Set(["garden:a"])).some((x) => x.id === "garden:a"));

  let c = canonFrom(s, "2026-09-30");
  c = toggleTouch(c, "garden:a");
  assert.equal(c.members.find((m) => m.id === "garden:a")!.touch, true);
  c = toggleOut(c, "garden:a");
  const a = c.members.find((m) => m.id === "garden:a")!;
  assert.deepEqual([a.touch, a.out], [false, true]);

  const many = {
    ...c,
    members: Array.from({ length: 14 }, (_, i) => ({ ...a, id: `x${i}`, out: false })),
  };
  let m = many;
  for (let i = 0; i < 14; i++) m = toggleTouch(m, `x${i}`);
  assert.equal(m.members.filter((x) => x.touch).length, TOUCH_MAX);
});

test("since it was kept: what has come to reach for it and what has stopped, kin aside", () => {
  const s = strandOf("garden:root", NODES, LINKS, reachers(LINKS), buildIndex(NODES), dayOf)!;
  const c = canonFrom(s, "2026-09-30");
  const was = { ...c, members: [...c.members.filter((m) => m.id !== "garden:c"), { ...c.members[0], id: "garden:gone", label: "Gone" }] };
  const d = sinceKept(was, s);
  assert.deepEqual(d.joined.map((m) => m.id), ["garden:c"]);
  assert.deepEqual(d.gone.map((m) => m.id), ["garden:gone"]);
  const merged = takeIn(was, d.joined);
  assert.ok(merged.members.some((m) => m.id === "garden:c"));
  assert.ok(merged.members.some((m) => m.id === "garden:gone"), "what left stays as it was kept");
  assert.match(
    readings(was, d).at(-1)!,
    /since it was kept: 1 more reach for it — c · 1 no longer does — Gone/,
  );
});

test("the readings and the record are facts, never a verdict", () => {
  // The reader's own words are theirs; the check is on what the garden says.
  for (const c of SPECIMEN_CANON) {
    const bare = { ...c, oneNote: "", movedNote: "", useNote: "" };
    const r = readings(bare, { joined: [], gone: [] });
    for (const line of r) assert.doesNotMatch(line, VERDICT, line);
  }
  const [IN, OUT] = SPECIMEN_CANON;
  const r = readings(IN);
  assert.equal(r[0], "grown from What leaves the studio · 7 stones reach for it (4 link to it, 2 name it, 1 uses the term) · 2 kin by words");
  assert.match(r[1], /^first on record 28 Oct 2025 · the latest 19 Aug 2026 · 295 days between$/);
  assert.equal(r[2], "the strand's stones thread each other 7 times, the root not counted");
  assert.equal(r[4], "3 touchpoints of at most 10 · 1 struck from the story");
  assert.equal(r.at(-1), "in the canon since 26 Sep");
  assert.match(readings(OUT)[1], /1 undated$/);
  const bulk = {
    ...IN,
    members: IN.members.map((m, i) => (i < 4 ? { ...m, day: "2026-09-22" } : m)),
  };
  assert.equal(readings(bulk)[2], "4 of them first appear on the same day, 22 Sep 2026");
  assert.ok(!readings(IN).some((l) => /the same day/.test(l)), "three on a day is not said");
  const t = tally(SPECIMEN_CANON, [{ id: IN.root.id }, { id: "elsewhere" }]);
  const rec = recordReadings(t, 2, 40);
  assert.deepEqual(rec, [
    "2 strands looked at · 1 in the canon · 1 left out · 0 not called",
    "5 touchpoints kept across them",
    "9 stones of the garden's 40 held in strands in the canon",
    "of the 2 stones reached for by 3 or more, 1 has a strand looked at",
  ]);
  for (const line of rec) assert.doesNotMatch(line, VERDICT, line);
  assert.deepEqual(recordReadings(tally([], []), 0, 0), ["no strand looked at yet"]);
});

test("the file round-trips, and a hand-written one reads", () => {
  for (const c of SPECIMEN_CANON)
    assert.deepEqual(parseCanon(c.slug, serialiseCanon(c)), c);
  const hand = `---
put: 2026-09-30
root: garden:x
root_label: X
root_day: ~2026-08-01
call: in
---

## the strand

X, as I read it

## the stones

- [links to it · 2026-09-01 · touchpoint] A \`garden:a\`
- B \`garden:b\`
- [kin by words · undated] C \`note:People/C d\`
`;
  const c = parseCanon("2026-09-30-x", hand);
  assert.equal(c.name, "X, as I read it");
  assert.deepEqual([c.root.day, c.root.approx], ["2026-08-01", true]);
  assert.equal(c.call, "in");
  assert.equal(c.called, new Date().toISOString().slice(0, 10), "a call with no day is dated today");
  assert.deepEqual(
    c.members.map((m) => [m.id, m.how, m.day, m.touch]),
    [
      ["garden:a", "links", "2026-09-01", true],
      ["garden:b", "links", null, false],
      ["note:People/C d", "kin", null, false],
    ],
  );
});

test("validation: a strand needs its root; ids stay one line; the root is not its own member", () => {
  assert.throws(() => validateCanon({ name: "x" }), /the stone it grew from/);
  const c = validateCanon({
    root: { id: "garden:r`oot", label: "R" },
    members: [
      { id: "garden:r'oot", label: "self" },
      { id: "a", label: "A\nB", touch: true, out: true },
      { id: "a", label: "dup" },
    ],
    call: "maybe",
    threads: -3,
  });
  assert.equal(c.root.id, "garden:r'oot");
  assert.deepEqual(c.members.map((m) => [m.id, m.label, m.touch, m.out]), [["a", "A B", false, true]]);
  assert.equal(c.call, "");
  assert.equal(c.threads, 0);
  assert.match(c.slug, /^\d{4}-\d{2}-\d{2}-r$/);
});
