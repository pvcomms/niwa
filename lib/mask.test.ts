import assert from "node:assert/strict";
import { test } from "node:test";
import {
  adopt,
  census,
  censusWords,
  common,
  leans,
  markOf,
  parseMask,
  readings,
  serialiseMask,
  setMark,
  stance,
  tally,
  tells,
  validateMask,
  validateProposal,
} from "./mask.ts";
import { SPECIMEN_MASK } from "../content/mask.ts";

test("the tells that give a writer away are found by kind", () => {
  const t = tells(
    `They claim the office "culture" matters, but supposedly everyone knows that is nonsense. Arguably, so-called collaboration is kind of a fantasy. "The junior who learns by overhearing a long argument in the corridor" is their phrase.`,
  );
  const kinds = t.map((x) => x.kind);
  assert.ok(kinds.includes("distance"), "they claim / supposedly");
  assert.ok(kinds.includes("scare"), '"culture", so-called collaboration');
  assert.ok(kinds.includes("hedge"), "arguably / kind of");
  assert.ok(kinds.includes("sneer"), "nonsense / fantasy");
  assert.ok(kinds.includes("absolute"), "everyone knows");
  assert.ok(t.some((x) => x.kind === "scare" && x.phrase === "culture"));
  assert.ok(t.some((x) => x.kind === "scare" && x.phrase === "collaboration"));
  assert.ok(!t.some((x) => x.phrase.startsWith("The junior who learns")), "a long quotation is a quotation, not a scare quote");
  assert.ok(!t.some((x) => x.kind === "sneer" && x.phrase === "culture"), "'culture' is not a cult");
  assert.deepEqual(stance("We think they are wrong about us and them."), { we: 2, they: 2 });
  assert.equal(censusWords(census("")), "no tells found");
});

test("marks are kept by sentence and survive edits elsewhere", () => {
  let marks = setMark([], "Two days is not a lot.", "refuse");
  marks = setMark(marks, "It is the least.", "mean");
  assert.equal(markOf(marks, "two days is not a lot"), "refuse");
  assert.equal(markOf(marks, "It is the least."), "mean");
  marks = setMark(marks, "Two days is not a lot.", "");
  assert.equal(markOf(marks, "Two days is not a lot."), "");
  assert.equal(marks.length, 1);
});

test("values are leaned on by their terms; common ground is what both cases say", () => {
  const values = [
    { name: "candour", terms: ["honest", "plain"] },
    { name: "care", terms: ["people", "kind"] },
  ];
  assert.deepEqual(leans("Be honest with people.", values), [
    { name: "candour", hits: ["honest"] },
    { name: "care", hits: ["people"] },
  ]);
  const c = common("The work gets done at home.", "The work suffers without the office.");
  assert.deepEqual(c.shared, ["work"]);
  assert.ok(c.ownOnly.includes("home") && c.otherOnly.includes("office"));
});

test("the specimen round-trips through its file", () => {
  const raw = serialiseMask(SPECIMEN_MASK);
  assert.match(raw, /## their case, in the mask/);
  assert.match(raw, /## where you stand/);
  assert.deepEqual(parseMask(SPECIMEN_MASK.slug, raw), SPECIMEN_MASK);
});

test("validation needs the matter or the sides, titles from the matter, and drops what is empty", () => {
  assert.throws(() => validateMask({ matter: "", side: "", other: "" }, "2026-09-25"), /matter/);
  const m = validateMask(
    { matter: "Should we ban cars from the centre?", side: "for", other: "against", marks: [{ text: "x", mark: "nope" }], tells: [{ quote: "", kind: "sneer" }] },
    "2026-09-25",
  );
  assert.equal(m.title, "Should we ban cars from the centre?");
  assert.equal(m.slug, "2026-09-25-should-we-ban-cars-from-the-centre");
  assert.equal(m.marks.length, 0);
  assert.equal(m.tells.length, 0);
  const sides = validateMask({ side: "for", other: "against" }, "2026-09-25");
  assert.equal(sides.title, "for · against");
});

test("the tally counts the marks and the readings never judge the mask", () => {
  const t = tally(SPECIMEN_MASK);
  assert.equal(t.sentences.length, 5);
  assert.deepEqual(t.marks, { "": 0, mean: 2, could: 2, refuse: 1 });
  assert.equal(t.crossed.length, 2);
  assert.equal(t.refused[0], "Two days is not a lot.");
  assert.equal(t.tellsKept, 1);
  assert.equal(t.tellsHollow, 1);
  assert.equal(t.missingKept, 1);
  assert.ok(t.own.byKind.absolute >= 1, "'everyone' in the own case");
  const values = [{ name: "care", terms: ["people", "person", "team"] }];
  const r = readings(SPECIMEN_MASK, t, [leans(SPECIMEN_MASK.ownCase, values), leans(SPECIMEN_MASK.otherCase, values)]);
  assert.match(r[0], /^your case: 4 sentences/);
  assert.match(r[1], /^the mask: 5 sentences/);
  assert.equal(r[2], "5 of 5 marked: 2 you could say and mean, 2 you can say but do not, 1 you could not write straight");
  assert.match(r[3], /an adherent's reading: 1 tell kept, 1 proposed and hollow, 1 missing reason kept/);
  assert.match(r[4], /both lean on 'care'/);
  assert.match(r[5], /words the two cases share/);
  assert.equal(r[6], "where you stand is written");
  for (const s of r)
    assert.doesNotMatch(s, /\b(pass|passed|passes|fail|failed|fails|score|better|worse|right|wrong|win|wins|convincing|persuasive|correct)\b/i);
});

test("a proposal must quote the mask; it folds in hollow and never repeats", () => {
  const p = validateProposal(
    {
      tells: [
        { quote: "because we like the room", kind: "sneer", instead: "we would not say it" },
        { quote: "not in the text at all", kind: "hedge", instead: "x" },
        { quote: "Two days is not a lot", kind: "astrology", instead: "x" },
        { quote: "two days is not a lot", kind: "absolute", instead: "two days a week" },
      ],
      missing: ["Juniors leave sooner.", ""],
    },
    SPECIMEN_MASK.otherCase,
  );
  assert.deepEqual(p.tells.map((t) => t.kind), ["sneer", "absolute"]);
  assert.deepEqual(p.missing, ["Juniors leave sooner."]);
  let n = 0;
  const m = adopt(SPECIMEN_MASK, p, "2026-09-25", () => `n${++n}`);
  assert.equal(m.tells.length, SPECIMEN_MASK.tells.length + 1, "the room tell is already there");
  assert.equal(m.missing.length, SPECIMEN_MASK.missing.length + 1);
  assert.ok(m.tells.at(-1)!.by === "proposed" && !m.tells.at(-1)!.kept);
  assert.equal(adopt(m, p, "2026-09-25").tells.length, m.tells.length);
});
