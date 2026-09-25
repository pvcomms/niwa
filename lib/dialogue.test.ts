import assert from "node:assert/strict";
import { test } from "node:test";
import type { GardenNode } from "./garden.ts";
import {
  FAMILIES,
  adopt,
  gardenQuestions,
  isOpen,
  parseBank,
  parseDialogue,
  readings,
  serialiseBank,
  serialiseDialogue,
  tally,
  validateDialogue,
  validateProposal,
  type Dialogue,
} from "./dialogue.ts";
import { SPECIMEN_DIALOGUE, STARTER_BANK } from "../content/dialogue.ts";

const node = (id: string, extra: Partial<GardenNode> = {}): GardenNode => ({
  id,
  label: id,
  kind: "note",
  description: "",
  body: "",
  file: null,
  modified: null,
  stage: "settled",
  signed: null,
  degree: 0,
  source: "vault",
  ...extra,
});

test("an open question cannot be answered yes or no", () => {
  assert.ok(isOpen("What do you mean by 'first to go'?"));
  assert.ok(isOpen("How do you know?"));
  assert.ok(!isOpen("Is that true?"));
  assert.ok(!isOpen("Do you believe it?"));
  assert.ok(isOpen("Does it matter, and why?"));
  assert.ok(!isOpen(""));
  assert.ok(!isOpen("That a metaphor implies a literal identity in outcomes."), "a statement is not a question");
  assert.ok(isOpen("Say it again in other words — what is left?"));
  assert.ok(!isOpen("If visibility were kept another way, would that be enough?"), "yes/no behind a clause");
  assert.ok(isOpen("If visibility were kept another way, what would change?"));
});

test("the starter bank is six families of open questions", () => {
  for (const f of FAMILIES) {
    assert.ok(STARTER_BANK[f].length >= 5, f);
    for (const q of STARTER_BANK[f]) assert.ok(isOpen(q), `${f}: ${q}`);
  }
  const back = parseBank(serialiseBank(STARTER_BANK));
  assert.deepEqual(back, STARTER_BANK);
  const own = parseBank("# mine\n\n## clarifying\n\n- What is it, plainly?\nWhich word?\n\n## nonsense\n\n- dropped\n\n### the question itself\n\nWhy now?\n");
  assert.deepEqual(own.clarify, ["What is it, plainly?", "Which word?"]);
  assert.deepEqual(own.question, ["Why now?"]);
  assert.deepEqual(own.assume, []);
});

test("the specimen round-trips through its file, turns as a transcript", () => {
  const raw = serialiseDialogue(SPECIMEN_DIALOGUE);
  assert.match(raw, /## the thesis, as first said/);
  assert.match(raw, /### q sd6 · question · proposed · 2026-09-22 · hollow/);
  assert.match(raw, /#### answer/);
  const back = parseDialogue(SPECIMEN_DIALOGUE.slug, raw);
  assert.deepEqual(back, SPECIMEN_DIALOGUE);
});

test("validation refuses an empty thesis, titles from it, and drops what points nowhere", () => {
  assert.throws(() => validateDialogue({ thesis: "  " }, "2026-09-25"), /thesis/);
  const d = validateDialogue(
    {
      thesis: "Sitting is the new smoking. Everyone knows it.",
      turns: [{ family: "nope", question: "How do you know?", by: "martian", kept: "yes" }],
      assumptions: [{ text: "x", turn: "ghost-turn" }, { text: "" }],
      terms: [{ word: "smoking", meaning: "a slow harm" }],
    },
    "2026-09-25",
  );
  assert.equal(d.title, "Sitting is the new smoking");
  assert.equal(d.slug, "2026-09-25-sitting-is-the-new-smoking");
  assert.equal(d.turns[0].family, "clarify");
  assert.equal(d.turns[0].by, "you");
  assert.equal(d.turns[0].kept, true);
  assert.equal(d.assumptions.length, 1);
  assert.equal(d.assumptions[0].turn, null);
  assert.equal(d.terms.length, 1);
});

test("the garden asks from the record: first sentence, roots, what it flows into, values, when touched", () => {
  const stone = node("belief", {
    label: "Remote first",
    description: "Remote teams ship faster because nobody is interrupted.",
    modified: "2026-06-02T00:00:00.000Z",
  });
  const nodes = new Map<string, GardenNode>([
    ["belief", stone],
    ["old", node("old", { label: "Old office note", stage: "fallow", modified: "2025-11-03T00:00:00.000Z" })],
    ["paper", node("paper", { label: "A paper on interruption", kind: "reading" })],
  ]);
  const qs = gardenQuestions(
    stone,
    [
      { id: "old", threads: ["link"], date: null, dated: null },
      { id: "paper", threads: ["mention"], date: null, dated: null },
    ],
    [{ id: "plan", label: "The hiring plan" }],
    nodes,
    [{ name: "taste" }],
  );
  const fams = new Set(qs.map((x) => x.family));
  assert.deepEqual([...fams].sort(), [...FAMILIES].sort());
  assert.ok(qs.some((x) => x.text.includes("Your note begins") && x.text.includes("nobody is interrupted")));
  assert.ok(qs.some((x) => x.text.includes("Old office note") && x.text.includes("lain fallow since Nov 2025") && x.stone === "old"));
  assert.ok(qs.some((x) => x.text.includes("A paper on interruption") && x.family === "evidence"));
  assert.ok(qs.some((x) => x.text.includes("The hiring plan") && x.family === "consequence"));
  assert.ok(qs.some((x) => x.text.includes("taste") && x.family === "viewpoint" && x.stone === null));
  assert.ok(qs.some((x) => x.text.includes("Jun 2026") && x.family === "question"));
  for (const x of qs) assert.ok(isOpen(x.text), x.text);
});

test("the tally counts and the readings never grade the thesis", () => {
  const t = tally(SPECIMEN_DIALOGUE);
  assert.equal(t.turns, 5);
  assert.equal(t.answered, 5);
  assert.equal(t.hollow, 1);
  assert.deepEqual(t.unasked, ["question"]);
  assert.deepEqual(t.bySource, { you: 1, bank: 2, garden: 1, proposed: 1 });
  assert.deepEqual(t.assumptions, { surfaced: 3, hollow: 0, holds: 0, fell: 1, cannot: 1, open: 1 });
  assert.equal(t.terms, 2);
  assert.ok(t.drift && t.drift.lost.includes("always"));
  const r = readings(SPECIMEN_DIALOGUE, t);
  assert.equal(r[0], "5 questions kept, 5 answered · 1 proposed and still hollow");
  assert.match(r[1], /asked across 5 of 6 families: .* — the question itself not yet asked/);
  assert.match(r[2], /the questions came from: you 1, the bank 2, the garden 1, proposed and kept 1/);
  assert.match(r[3], /3 assumptions surfaced, 2 examined: 1 fell, 1 cannot be said; 1 not yet examined/);
  assert.match(r[4], /2 terms clarified: 'first to go' and 'the data'/);
  assert.match(r[5], /as it stands now, the thesis .*lost .*'always'/);
  const fresh = validateDialogue({ thesis: "A thing." }, "2026-09-25");
  const r0 = readings(fresh, tally(fresh));
  assert.equal(r0[0], "no question kept yet");
  assert.equal(r0[r0.length - 1], "the thesis is not yet re-put");
  for (const s of [...r, ...r0])
    assert.doesNotMatch(s, /\b(true|false|valid|invalid|correct|wrong|right|fallacy|score|sound|weak|strong|good|bad)\b/i);
});

test("a proposal is held to open questions in real families and turns that exist, then folded in hollow", () => {
  const p = validateProposal(
    {
      questions: [
        { family: "assume", text: "What has to be so for 'everyone knows it' to be said?", quote: "everyone knows it" },
        { family: "evidence", text: "Is the data real?", quote: "the data" },
        { family: "astrology", text: "What sign are you?", quote: "" },
        { family: "clarify", text: "What do you mean by 'first to go'?", quote: "first to go" },
      ],
      assumptions: [
        { text: "Surveys predict behaviour.", turn: "sd2" },
        { text: "Nothing.", turn: "nope" },
        { text: "The feed is representative.", turn: "" },
      ],
    },
    ["sd1", "sd2"],
  );
  assert.deepEqual(p.questions.map((q) => q.family), ["assume", "clarify"]);
  assert.deepEqual(p.assumptions.map((a) => a.turn), ["sd2", ""]);
  let n = 0;
  const d: Dialogue = adopt(SPECIMEN_DIALOGUE, p, "2026-09-25", () => `n${++n}`);
  // the clarifying question is already asked in other words? no — it is the same words as sd1 minus a clause, so both stay
  assert.equal(d.turns.length, SPECIMEN_DIALOGUE.turns.length + 2);
  assert.ok(d.turns.slice(-2).every((t) => t.by === "proposed" && !t.kept && t.on === "2026-09-25"));
  assert.equal(d.assumptions.length, SPECIMEN_DIALOGUE.assumptions.length + 2);
  assert.equal(d.assumptions[d.assumptions.length - 1].turn, null);
  const again = adopt(d, p, "2026-09-25", () => `m${++n}`);
  assert.equal(again.turns.length, d.turns.length, "nothing repeated");
});
