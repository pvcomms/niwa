import assert from "node:assert/strict";
import { test } from "node:test";
import {
  adopt,
  clampLean,
  daysBetween,
  gardenLooks,
  keepAll,
  parseClaim,
  readings,
  serialiseClaim,
  tally,
  validateClaim,
  validateProposal,
  wholeReadings,
} from "./tack.ts";
import { SPECIMEN_CLAIMS } from "../content/tack.ts";

const [SAIL, HULL] = SPECIMEN_CLAIMS;
const VERDICT =
  /\b(right|wrong|correct|true|false|likely|unlikely|should|better|worse|rational|irrational|calibrated|good|bad)\b/i;

test("a lean lives strictly between the ends", () => {
  assert.equal(clampLean(0), 1);
  assert.equal(clampLean(100), 99);
  assert.equal(clampLean(62.4), 62);
  assert.equal(clampLean(Number.NaN), 50);
  assert.equal(daysBetween("2026-09-23", "2026-12-23"), 91);
  assert.equal(daysBetween("2026-12-23", "2026-09-23"), -91);
});

test("the tally counts tacks, steps and crossings; the readings never judge", () => {
  const t = tally(SAIL, "2026-09-25");
  assert.equal(t.n, 3);
  assert.equal(t.now, 60);
  assert.equal(t.towardSo, 2);
  assert.equal(t.towardNot, 0);
  assert.equal(t.largest, 20);
  assert.equal(t.crossed, 1, "35 → 55 crossed the middle in one step");
  assert.equal(t.sinceLast, 1);
  assert.deepEqual(t.rent, { "": 0, so: 1, not: 0, neither: 1 });
  assert.equal(t.expects, "both");
  assert.equal(t.looksKept, 1);
  assert.equal(t.looksHollow, 1);
  const r = readings(SAIL, t, [{ name: "care", hits: ["juniors"] }]);
  assert.match(
    r[0],
    /^first put 2026-09-21 at 35 · now at 60 after 2 tacks · moved toward so ×2, toward not ×0 · largest step 20 · crossed the middle 1 time in one step$/,
  );
  assert.equal(r[1], "last tack yesterday");
  assert.equal(r[2], "what it expects to see is named both ways");
  assert.equal(
    r[3],
    "2 sightings: ×1 as expected if so, ×0 as expected if not, ×1 that said nothing either way",
  );
  assert.equal(r[4], "what would move it: 1 look kept, 1 proposed and hollow");
  assert.equal(r[5], "leans on 'care', by their terms");
  for (const s of r) assert.doesNotMatch(s, VERDICT);
});

test("the hull is read as a window: held, to go, open, early", () => {
  const before = tally(HULL, "2026-09-25");
  assert.equal(before.held, 2);
  assert.equal(before.toGo, 89);
  assert.equal(before.open, false);
  const r = readings(HULL, before, []);
  assert.equal(r[0], "chosen 2026-09-23, held 2 days so far");
  assert.equal(r[1], "you said not before 2026-12-23 — 89 days to go");
  assert.equal(r[2], "never reopened");
  assert.equal(r[3], "why you hold it is written");
  for (const s of r) assert.doesNotMatch(s, VERDICT);
  const after = tally(HULL, "2026-12-24");
  assert.equal(after.open, true);
  assert.match(
    readings(HULL, after, [])[1],
    /^the window opened 2026-12-23, yesterday/,
  );
  const reopened = {
    ...HULL,
    reopened: [
      {
        on: "2026-10-01",
        said: "Still.",
        went: "held" as const,
        until: "2027-01-01",
        early: true,
      },
    ],
    until: "2027-01-01",
  };
  const tr = tally(reopened, "2026-10-02");
  assert.equal(tr.reopens, 1);
  assert.equal(tr.early, 1);
  assert.equal(
    readings(reopened, tr, [])[2],
    "reopened 1 time, 1 of them early: held again ×1, let go ×0",
  );
  const gone = { ...HULL, letGo: "2026-10-05" };
  assert.equal(
    readings(gone, tally(gone, "2026-10-09"), [])[0],
    "chosen 2026-09-23, held 12 days, let go 2026-10-05",
  );
});

test("the whole sheet is counted, and an empty hull is said so", () => {
  assert.deepEqual(wholeReadings([], "2026-09-25"), ["nothing set down yet"]);
  const w = wholeReadings(SPECIMEN_CLAIMS, "2026-09-25");
  assert.equal(w[0], "1 belief in the sails · 1 commitment in the hull");
  const sailsOnly = wholeReadings(
    [
      SAIL,
      {
        ...SAIL,
        slug: "x",
        ifSo: "",
        ifNot: "",
        tacks: SAIL.tacks.slice(0, 1),
      },
    ],
    "2026-11-01",
  );
  assert.equal(
    sailsOnly[0],
    "2 beliefs in the sails · 0 commitments in the hull",
  );
  assert.ok(
    sailsOnly.includes(
      "1 of the sails has named nothing it would expect to see",
    ),
  );
  assert.ok(sailsOnly.includes("1 put down once and never tacked"));
  assert.ok(sailsOnly.includes("the hull is empty"));
  for (const s of [...w, ...sailsOnly]) assert.doesNotMatch(s, VERDICT);
});

test("the specimen round-trips through its file, tacks and reopenings as dated entries", () => {
  for (const c of SPECIMEN_CLAIMS) {
    const raw = serialiseClaim(c);
    assert.match(raw, /## the claim/);
    assert.deepEqual(parseClaim(c.slug, raw), c);
  }
  assert.match(
    serialiseClaim(SAIL),
    /### 2026-09-24 · at 60 · as expected if so\n\nThe second one wrote later/,
  );
  const reopened = {
    ...HULL,
    reopened: [
      {
        on: "2026-10-01",
        said: "Still.",
        went: "held" as const,
        until: "2027-01-01",
        early: true,
      },
    ],
  };
  const raw = serialiseClaim(reopened);
  assert.match(
    raw,
    /### 2026-10-01 · held again until 2027-01-01 · early\n\nStill\./,
  );
  assert.deepEqual(parseClaim(reopened.slug, raw), reopened);
});

test("validation needs the words, clamps every lean, titles from the first sentence", () => {
  assert.throws(() => validateClaim({ text: "  " }, "2026-09-25"), /words/);
  const c = validateClaim(
    {
      text: "Cars should be banned from the centre. Really.",
      layer: "astrology",
      tacks: [{ on: "nope", at: 150, saw: "x", rent: "maybe" }],
      looks: [{ text: "", moves: "so" }],
    },
    "2026-09-25",
  );
  assert.equal(c.layer, "sail");
  assert.equal(c.title, "Cars should be banned from the centre");
  assert.equal(c.slug, "2026-09-25-cars-should-be-banned-from-the-centre");
  assert.deepEqual(c.tacks, [{ on: "2026-09-25", at: 99, saw: "x", rent: "" }]);
  assert.equal(c.looks.length, 0);
});

test("a proposal is places to look, never a verdict; it folds in hollow and never repeats", () => {
  const p = validateProposal({
    looks: [
      {
        text: "Ask the third junior what she learned last month.",
        moves: "either",
      },
      { text: "The claim is likely true.", moves: "so" },
      {
        text: "Count the corridor conversations in one office week.",
        moves: "weather",
      },
      {
        text: "Read last year's exit interviews: does anyone say they never learned how things are done here?",
        moves: "so",
      },
      { text: "", moves: "not" },
    ],
  });
  assert.deepEqual(
    p.looks.map((l) => l.text),
    [
      "Ask the third junior what she learned last month.",
      "Read last year's exit interviews: does anyone say they never learned how things are done here?",
    ],
  );
  let n = 0;
  const c = adopt(SAIL, p, "2026-09-25", () => `n${++n}`);
  assert.equal(
    c.looks.length,
    SAIL.looks.length + 1,
    "the exit interviews are already on the sheet",
  );
  assert.ok(c.looks.at(-1)!.by === "proposed" && !c.looks.at(-1)!.kept);
  assert.equal(adopt(c, p, "2026-09-25").looks.length, c.looks.length);
  assert.equal(keepAll(c, true).looks.filter((l) => !l.kept).length, 0);
  assert.equal(keepAll(c, false).looks.length, 1);
});

test("the garden offers stones that share two content words with the claim, fallow ones named", () => {
  const nodes = [
    {
      id: "a",
      label: "The junior who learned in the corridor",
      description: "office days and what juniors learn",
      body: "",
      stage: "fallow" as const,
      modified: "2026-06-02T10:00:00Z",
    },
    {
      id: "b",
      label: "Coffee",
      description: "a note about beans",
      body: "",
      stage: "fresh" as const,
      modified: null,
    },
    {
      id: "me",
      label: "Juniors learn in the office",
      description: "",
      body: "",
      stage: "fresh" as const,
      modified: null,
    },
  ];
  const looks = gardenLooks(
    "Juniors learn more in the office than at home.",
    nodes,
    "me",
  );
  assert.equal(looks.length, 1);
  assert.equal(looks[0].stone, "a");
  assert.equal(looks[0].by, "garden");
  assert.match(
    looks[0].text,
    /^Go back to “The junior who learned in the corridor”: it speaks of 'juniors', 'learn', 'office' too, and has lain fallow since Jun 2026\./,
  );
  assert.deepEqual(gardenLooks("", nodes), []);
});
