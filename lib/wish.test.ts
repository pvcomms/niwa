import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampMinutes,
  compose,
  gardenBeings,
  gardenFacts,
  heldBy,
  parseList,
  parsePod,
  parseSitting,
  pcmOf,
  readings,
  runtime,
  serialiseList,
  serialisePod,
  serialiseSitting,
  tally,
  validatePod,
  validateSitting,
  wavOf,
} from "./wish.ts";
import {
  DEFAULT_PODS,
  DEFAULT_TRUTHS,
  DEFAULT_WISHES,
  SPECIMEN_FACTS,
  SPECIMEN_PODS,
  SPECIMEN_SITTINGS,
} from "../content/wish.ts";

const VERDICT =
  /\b(should|must|good at|bad at|kinder|kindest|unkind|selfish|better|worse|failing|lazy|enough)\b/i;

test("the script settles, holds each pod in turn with a truth and the wishes, and lets go", () => {
  const lines = compose({
    pods: SPECIMEN_PODS,
    wishes: DEFAULT_WISHES,
    truths: DEFAULT_TRUTHS,
    facts: SPECIMEN_FACTS,
    minutes: 12,
    seed: "test",
  });
  const text = lines.map((l) => l.text);
  assert.equal(text[0], "Sit, and let the breath find its own length.");
  assert.ok(
    text.some((t) => t.startsWith("Something true of you, to begin from: ")),
  );
  assert.ok(text.includes("Begin with yourself, as you are today."));
  assert.ok(text.includes("May I be safe."));
  assert.ok(text.includes("Nadia, who taught you to ask before you argue."));
  assert.ok(
    text.some((t) => /^Every being .* Nadia too\.$/.test(t)),
    "a truth said of Nadia",
  );
  assert.ok(text.includes("the man at the kiosk."));
  assert.ok(text.includes("May all beings be at ease."));
  assert.ok(
    text.some((t) => t.startsWith("And something true of you, to carry out: ")),
  );
  assert.equal(text.at(-1), "When you are ready, open your eyes.");
  const kinds = new Set<string>(lines.map((l) => l.kind));
  for (const k of ["settle", "fact", "pod", "being", "truth", "wish", "close"])
    assert.ok(kinds.has(k), k);
  const secs = runtime(lines);
  assert.ok(Math.abs(secs - 12 * 60) < 60, `runs ${secs}s for 12 minutes`);
  const again = compose({
    pods: SPECIMEN_PODS,
    wishes: DEFAULT_WISHES,
    truths: DEFAULT_TRUTHS,
    facts: SPECIMEN_FACTS,
    minutes: 12,
    seed: "test",
  });
  assert.deepEqual(again, lines, "the same seed draws the same sitting");
});

test("a pod with many beings is held together; an empty pod holds whoever comes; wishes are predicates", () => {
  const crowd = {
    ...DEFAULT_PODS[2],
    beings: ["Ana", "Bo", "Cy", "Di"].map((name) => ({
      name,
      note: "",
      stone: null,
    })),
  };
  const lines = compose({
    pods: [crowd, DEFAULT_PODS[3]],
    wishes: ["May you be free from fear.", "held"],
    truths: ["Every being has been afraid."],
    facts: [],
    minutes: 5,
    seed: "x",
  }).map((l) => l.text);
  assert.ok(lines.includes("Ana, Bo, Cy, Di."));
  assert.ok(lines.includes("Every being has been afraid. Every one of them."));
  assert.ok(lines.includes("May you all be free from fear."));
  assert.ok(lines.includes("May you all be held."));
  assert.ok(lines.includes("Whoever comes to mind."));
  assert.ok(
    !lines.some((t) => t.startsWith("Something true of you")),
    "no facts, no fact lines",
  );
});

test("the tally counts sittings, the run and who was held; the readings never grade", () => {
  const t = tally(
    SPECIMEN_SITTINGS,
    SPECIMEN_PODS,
    { wishes: DEFAULT_WISHES, truths: DEFAULT_TRUTHS, facts: SPECIMEN_FACTS },
    "2026-09-26",
  );
  assert.equal(t.n, 2);
  assert.equal(t.minutes, 20);
  assert.equal(t.last, "2026-09-25");
  assert.equal(t.sinceLast, 1);
  assert.equal(t.run, 1);
  assert.equal(t.difficult, 1);
  assert.deepEqual(t.held.slice(0, 2), [
    { name: "Nadia", n: 2 },
    { name: "Tomas", n: 2 },
  ]);
  assert.equal(t.beings, 5);
  const r = readings(t);
  assert.equal(
    r[0],
    "2 sittings, 20 minutes in all · 2 this week, 2 this month · the last yesterday",
  );
  assert.equal(
    r[1],
    "held: Nadia ×2, Tomas ×2, the junior ×2, the man at the kiosk ×2, the client who shouted ×1",
  );
  assert.equal(r[2], "1 held only once");
  assert.equal(r[3], "the difficult one held in 1 of 2");
  assert.equal(
    r[4],
    "6 pods with 5 beings · 4 wishes, 10 truths, 3 facts in the practice",
  );
  for (const s of r) assert.doesNotMatch(s, VERDICT);
  const empty = readings(
    tally(
      [],
      DEFAULT_PODS,
      { wishes: DEFAULT_WISHES, truths: DEFAULT_TRUTHS, facts: [] },
      "2026-09-26",
    ),
  );
  assert.equal(empty[0], "no sittings yet");
  const run = tally(
    ["2026-09-26", "2026-09-25", "2026-09-24"].map((on, i) => ({
      ...SPECIMEN_SITTINGS[0],
      slug: `s${i}`,
      on,
    })),
    SPECIMEN_PODS,
    { wishes: [], truths: [], facts: [] },
    "2026-09-26",
  );
  assert.equal(run.run, 3);
});

test("the garden offers facts in the record's words and people as beings", () => {
  const facts = gardenFacts(
    [
      {
        id: "user_x",
        label: "x",
        description: "Param takes CBD oil every morning for nausea. Daily.",
        file: null,
        kind: "user",
      },
      {
        id: "p",
        label: "Jasmine Sun",
        description: "People",
        file: "/v/People/Jasmine Sun.md",
        kind: "note",
      },
    ],
    [{ name: "taste" }, { name: "privacy" }, { name: "kindness" }],
    [{ text: "I ask before I argue.", chosen: "2026-09-23" }],
  );
  assert.deepEqual(facts, [
    "You value taste, privacy and kindness, by your own bearing.",
    "You hold to this, chosen 2026-09-23: I ask before I argue.",
    "Param takes CBD oil every morning for nausea.",
  ]);
  assert.deepEqual(
    gardenBeings([
      {
        id: "p",
        label: "Jasmine Sun",
        description: "Writer. Met in Berlin.",
        file: "/v/People/Jasmine Sun.md",
        kind: "note",
      },
      {
        id: "q",
        label: "not a person",
        description: "",
        file: "/v/Ideas/x.md",
        kind: "note",
      },
    ]),
    [{ name: "Jasmine Sun", note: "Writer", stone: "p" }],
  );
});

test("pods and sittings survive their files; lists are bullets", () => {
  for (const p of SPECIMEN_PODS)
    assert.deepEqual(parsePod(p.slug, serialisePod(p)), p);
  const raw = serialisePod(SPECIMEN_PODS[2]);
  assert.match(raw, /^- Tomas — who calls on Sundays$/m);
  const withStone = validatePod({
    slug: "s",
    name: "a pod",
    kind: "custom",
    order: 7,
    beings: [{ name: "J", note: "", stone: "note_j" }],
  });
  assert.deepEqual(parsePod("s", serialisePod(withStone)), withStone);
  for (const s of SPECIMEN_SITTINGS)
    assert.deepEqual(parseSitting(s.slug, serialiseSitting(s)), s);
  const voiced = {
    ...SPECIMEN_SITTINGS[0],
    voice: "2026-09-25-0712.wav",
    cues: SPECIMEN_SITTINGS[0].lines.map((_, i) => i * 7.5),
  };
  assert.deepEqual(parseSitting(voiced.slug, serialiseSitting(voiced)), voiced);
  assert.deepEqual(parseList(serialiseList("truths", ["a", " b ", ""])), [
    "a",
    "b",
  ]);
  assert.deepEqual(parseList("# wishes\n\n- safe\n* well\nat ease\n"), [
    "safe",
    "well",
    "at ease",
  ]);
});

test("validation clamps, fills a name, and refuses a sitting with nothing to say", () => {
  assert.equal(clampMinutes(0), 3);
  assert.equal(clampMinutes(500), 60);
  assert.equal(clampMinutes(Number.NaN), 10);
  const p = validatePod({ kind: "self", beings: [{ name: "x" }] });
  assert.equal(p.name, "you");
  assert.deepEqual(p.beings, [], "you and everyone hold no named beings");
  assert.equal(validatePod({ kind: "nonsense", name: "" }).kind, "custom");
  assert.throws(() => validateSitting({ lines: [] }), /needs its lines/);
  const s = validateSitting({
    minutes: "9",
    lines: [{ text: "x", pause: -4, kind: "odd" }],
    cues: [1, 2],
    voice: "../etc",
  });
  assert.equal(s.minutes, 9);
  assert.deepEqual(s.lines, [{ text: "x", pause: 0, kind: "settle" }]);
  assert.deepEqual(s.cues, [], "cues that do not match the lines are dropped");
  assert.equal(s.voice, null);
  assert.deepEqual(heldBy(SPECIMEN_PODS), [
    "Nadia",
    "Tomas",
    "the junior",
    "the man at the kiosk",
    "the client who shouted",
  ]);
});

test("a voice is one wav with silence between the lines, and a cue for each", () => {
  const rate = 24000;
  const tone = (n: number, v: number) => {
    const pcm = new Uint8Array(n * 2);
    const dv = new DataView(pcm.buffer);
    for (let i = 0; i < n; i++) dv.setInt16(i * 2, v, true);
    return pcm;
  };
  const a = wavOf([{ pcm: tone(rate, 1000), silence: 0 }], rate).wav;
  const back = pcmOf(a);
  assert.equal(back.rate, rate);
  assert.equal(back.pcm.length, rate * 2);
  const { wav, cues } = wavOf(
    [
      { pcm: tone(rate, 1), silence: 2 },
      { pcm: tone(rate / 2, 2), silence: 0.5 },
    ],
    rate,
  );
  assert.deepEqual(cues, [0, 3]);
  const out = pcmOf(wav);
  assert.equal(out.pcm.length, (rate + 2 * rate + rate / 2 + rate / 2) * 2);
  const dv = new DataView(out.pcm.buffer, out.pcm.byteOffset);
  assert.equal(dv.getInt16(0, true), 1);
  assert.equal(dv.getInt16((rate + rate) * 2, true), 0, "silence between");
  assert.equal(
    dv.getInt16(3 * rate * 2, true),
    2,
    "the second line starts at its cue",
  );
  assert.throws(() => pcmOf(new Uint8Array([1, 2, 3])), /not a wav/);
});
