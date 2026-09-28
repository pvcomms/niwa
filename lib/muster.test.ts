import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AFTER_SO,
  FIGHTS,
  ROOM,
  emptyMuster,
  endsInAnyOrder,
  logit,
  movesOf,
  musterAbout,
  parseMuster,
  pathsOf,
  pctOf,
  pw,
  quarterOf,
  readings,
  recordReadings,
  roomReadings,
  roomTally,
  roomsBeside,
  roundWords,
  runRoom,
  seatsOf,
  serialiseMuster,
  shuffled,
  sideSince,
  slugOf,
  stepOf,
  tally,
  validateMuster,
  yourWay,
  type Muster,
  type Room,
  type Setup,
} from "./muster.ts";
import { EXAMPLE_MUSTER, SPECIMEN_MUSTERS } from "../content/muster.ts";

const [JUNIOR, HARLOW] = SPECIMEN_MUSTERS;
const VERDICT =
  /\b(you should|should|wise|unwise|biased|bias|irrational|wrong|mistake|better|worse|good|bad|recommend\w*|score|you are (a|an|the) (soldier|scout|paladin|pacifist)|like (a|the) (soldier|scout|paladin|pacifist))\b/i;
const r1 = (xs: number[]) => xs.map((x) => Math.round(x * 10) / 10);

test("odds: a percent and its log-odds, a piece as a step, and a percent in words that never says 0 or 100", () => {
  for (const p of [1, 12.5, 50, 88, 99])
    assert.ok(Math.abs(pctOf(logit(p)) - p) < 1e-9);
  assert.equal(stepOf({ way: "for", weight: 3 }), Math.log(3));
  assert.equal(stepOf({ way: "against", weight: 8 }), -Math.log(8));
  assert.equal(pw(0.2), "under 1%");
  assert.equal(pw(99.7), "over 99%");
  assert.equal(pw(26.6), "27%");
});

test("alone with the reader's pieces the scout and the paladin move by the weights; the soldier and the pacifist by their side", () => {
  const p = pathsOf(JUNIOR);
  assert.deepEqual(r1(p.weights), [40, 66.7, 20, 27.3, 11.1, 27.3]);
  // Would rather it were so: the whole of what is for, a quarter of what is against.
  assert.deepEqual(r1(p.soldier), [40, 66.7, 54.3, 64.1, 57.5, 80.3]);
  // A third of the soldier's every step.
  assert.deepEqual(r1(p.pacifist), [40, 49, 44.7, 48.1, 45.8, 54.9]);
  assert.deepEqual(p.you, [40, 67, 62, 71, 69, 86]);
  // With no side it would rather, a figure defends the side it stands on, so the order counts
  // for it and never for the weights.
  const either: Muster = { ...JUNIOR, like: "" };
  const e = endsInAnyOrder(either);
  assert.ok(
    Math.abs(e.weights[0] - e.weights[1]) < 1e-9,
    "the weights end in one place",
  );
  assert.ok(
    e.soldier[1] - e.soldier[0] > 20,
    `the soldier spreads: ${e.soldier}`,
  );
  const fixed = endsInAnyOrder(JUNIOR);
  assert.ok(
    Math.abs(fixed.soldier[0] - fixed.soldier[1]) < 1e-9,
    "a side it would rather does not care about order",
  );
  const o = shuffled(5, 42);
  assert.deepEqual([...o].sort(), [0, 1, 2, 3, 4]);
  assert.deepEqual(shuffled(5, 42), o, "the shuffle is seeded");
  assert.equal(
    pathsOf(JUNIOR, o)
      .you.slice(1)
      .every((v) => v === null),
    true,
    "marks are not replayed out of order",
  );
});

test("how far the reader moved, as a share of the weight they gave, split by which way each piece went", () => {
  assert.deepEqual(yourWay(JUNIOR), [true, false, true, false, true]);
  const m = movesOf(JUNIOR);
  assert.equal(m.counted, 5);
  assert.equal(Math.round(m.own!.share * 100), 97);
  assert.equal(Math.round(m.against!.share * 100), 10);
  // A piece needs a mark straight before and after it to count.
  const gaps: Muster = {
    ...JUNIOR,
    pieces: JUNIOR.pieces.map((p, i) => (i === 1 ? { ...p, at: null } : p)),
  };
  const g = movesOf(gaps);
  assert.equal(g.counted, 3);
  assert.equal(g.skipped, 2);
  // With no side it would rather, "your way" is the side the reader stood on before the piece.
  assert.deepEqual(yourWay({ ...JUNIOR, like: "" }), [
    false,
    false,
    true,
    false,
    true,
  ]);
});

test("where a line stands against the line the reader would act at, and since when", () => {
  assert.deepEqual(sideSince([40, 67, 62, 71, 69, 86], 65), {
    over: true,
    since: 3,
  });
  assert.deepEqual(sideSince([35, 38, 40, 9], 50), { over: false, since: 0 });
  assert.deepEqual(sideSince([35, 61.8, 70.8, 23.2], 50), {
    over: false,
    since: 3,
  });
  assert.deepEqual(sideSince([50, 72, null, 93], 70), { over: true, since: 1 });
});

test("a claim reads back its pieces, the weights beside the reader's marks, and the four; never a verdict", () => {
  const a = readings(JUNIOR);
  assert.deepEqual(a, [
    "set down 14 Sep · put at 40% before anything came in, from what you had seen · you would rather it were so",
    "5 pieces came in: 3 for, 2 against",
    "by your weights, 27% · you: 86%",
    "of the weight you gave them, you moved 97% on the 3 that went your way and 10% on the 2 that went against you",
    "you argued with 2 of the 5: 2 of the 2 that went against you, 0 of the 3 that went your way",
    "you would act at 65%: you are over it since the 3rd piece; your weights are under it since the 2nd piece",
    "your weights would reach your line on a piece weighing 5 to 1 for it",
    "alone with these pieces: the scout and the paladin at 27%, the soldier at 80%, the pacifist at 55%",
    "2 others hold a view, from 30% to 75%: argued it out with 1, talked it over with 1",
    "you put yourself among the paladins",
    "it has not come out yet",
  ]);
  const b = readings(HARLOW);
  assert.deepEqual(b, [
    "set down 18 Aug · put at 35% before anything came in, on a hunch · you would rather it were not so",
    "3 pieces came in: 2 for, 1 against",
    "by your weights, 23% · you: 9%",
    "of the weight you gave them, you moved 92% on the one that went your way and 14% on the 2 that went against you",
    "you argued with 1 of the 3: 1 of the 2 that went against you, 0 of the 1 that went your way · let 1 pass",
    "you would act at 50%: you are under it all along; your weights are under it since the 3rd piece",
    "your weights would reach your line on a piece weighing 3.3 to 1 for it",
    "alone with these pieces: the scout and the paladin at 23%, the soldier at 9%, the pacifist at 23%",
    "1 other holds a view, at 60%: talked it over with 1",
    "you put yourself among the pacifists",
    "how it came out: not so, 16 Sep",
  ]);
  const either = readings({ ...JUNIOR, like: "", others: [], self: null });
  assert.match(
    either.find((s) => s.startsWith("in another order"))!,
    /^in another order, the soldier anywhere from \d+% to \d+%; the scout and the paladin end at 27% in any order$/,
  );
  const blank = readings({ ...emptyMuster("2026-09-28"), claim: "x" });
  assert.deepEqual(blank, [
    "set down 28 Sep · put at 50% before anything came in",
    "nothing has come in yet",
    "you would act at 70%",
    "your prior would reach your line on a piece weighing 2.3 to 1 for it",
    "you have not put yourself on the field",
    "it has not come out yet",
  ]);
  for (const s of [...a, ...b, ...either, ...blank])
    assert.doesNotMatch(s, VERDICT);
});

test("the field: a place falls in a quarter, or on the line between two", () => {
  assert.deepEqual(quarterOf(0.8, 0.8), { kind: "paladin", between: null });
  assert.deepEqual(quarterOf(0.2, 0.9), { kind: "soldier", between: null });
  assert.deepEqual(quarterOf(0.1, 0.1), { kind: "pacifist", between: null });
  assert.deepEqual(quarterOf(0.9, 0.2), { kind: "scout", between: null });
  assert.deepEqual(quarterOf(0.52, 0.8), {
    kind: "paladin",
    between: "soldier",
  });
  assert.deepEqual(quarterOf(0.2, 0.48), {
    kind: "pacifist",
    between: "soldier",
  });
});

const SETUP: Setup = {
  room: ROOM,
  prior: 40,
  act: 65,
  truth: "so",
  gold: 0.2,
  court: true,
  rounds: 16,
  seed: 7,
};
const only = (k: keyof Room, n = 12): Room => ({
  soldier: 0,
  paladin: 0,
  pacifist: 0,
  scout: 0,
  [k]: n,
});

test("the room runs by its rules: seeded, the same deal whoever sits in the seat, and each figure saying and fighting as written", () => {
  const run = runRoom(SETUP);
  assert.deepEqual(runRoom(SETUP), run, "a seed is a run");
  assert.equal(run.members.length, 12);
  assert.equal(run.rounds.length, 17);
  // Every other paladin starts on the far side.
  assert.deepEqual(
    run.members.filter((m) => m.kind === "paladin").map((m) => m.far),
    [true, false, true],
  );
  // The same deal to a room of one kind.
  const soldiers = runRoom({ ...SETUP, room: only("soldier") });
  for (let r = 1; r <= 16; r++)
    assert.deepEqual(soldiers.rounds[r].dealt, run.rounds[r].dealt);
  const kinds = seatsOf(ROOM);
  for (const round of run.rounds) {
    const dealt = new Map(round.dealt.map((d) => [d.id, d]));
    for (const ev of round.events) {
      if (ev.e === "say") {
        assert.notEqual(
          kinds[ev.seat],
          "pacifist",
          "the pacifist says nothing",
        );
        assert.equal(ev.loud, FIGHTS[kinds[ev.seat]], "the fighters are loud");
      }
      if (ev.e === "challenge") {
        assert.ok(FIGHTS[kinds[ev.seat]], "only fighters challenge");
        if (ev.shown)
          assert.equal(
            dealt.get(ev.piece)!.gold,
            true,
            "only fool's gold is shown up",
          );
      }
    }
  }
  // A room of pacifists says nothing and challenges nothing.
  const quiet = runRoom({ ...SETUP, room: only("pacifist") });
  assert.equal(
    quiet.rounds
      .flatMap((r) => r.events)
      .filter((e) => e.e === "say" || e.e === "challenge").length,
    0,
  );
  // A stage strikes nothing; a court does.
  const struck = (s: Setup) =>
    runRoom(s)
      .rounds.flatMap((r) => r.events)
      .filter((e) => e.e === "strike").length;
  let court = 0;
  let stage = 0;
  for (let seed = 1; seed <= 20; seed++) {
    court += struck({ ...SETUP, seed });
    stage += struck({ ...SETUP, seed, court: false });
  }
  assert.ok(court > 0);
  assert.equal(stage, 0);
  assert.equal(
    AFTER_SO.scout && !FIGHTS.scout && !AFTER_SO.soldier && FIGHTS.paladin,
    true,
  );
});

test("across sixty deals the room does what the quarters say: the paladins nearest what is so, then the scouts; a split room of soldiers nearer than a room of pacifists; a stage worse than a court", () => {
  const near = (room: Room, prior: number, court = true) => {
    let d = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const run = runRoom({ ...SETUP, room, prior, court, seed });
      const at = run.rounds[16].at;
      d += at.reduce((a, p) => a + (100 - p), 0) / at.length;
    }
    return d / 60;
  };
  const paladins = near(only("paladin"), 40);
  const scouts = near(only("scout"), 40);
  const pacifists = near(only("pacifist"), 40);
  assert.ok(
    paladins < scouts && scouts < pacifists,
    `${paladins} ${scouts} ${pacifists}`,
  );
  assert.ok(near(only("soldier"), 50) < near(only("pacifist"), 50));
  assert.ok(near(only("soldier"), 50) < near(only("soldier"), 50, false));
});

test("the room counts what happened, round by round; facts about the model, not the reader", () => {
  const run = runRoom(SETUP);
  const t = roomTally(run, 65);
  assert.equal(t.round, 16);
  assert.equal(
    t.said + t.quiet,
    t.noticed,
    "every piece noticed is said or kept quiet",
  );
  assert.ok(t.noticed <= t.dealt && t.shown <= t.gold);
  const words = roomReadings(t, "so", 65, 16);
  assert.match(
    words[0],
    /^round 16 of 16 · the room's middle at (\d+%|over 99%), most of it between (\d+%|over 99%) and (\d+%|over 99%) · in this room it is so$/,
  );
  assert.equal(
    words.at(-1),
    `the room's middle reached your line at 65% in round ${t.crossed} · ${t.acting} of 12 would act`,
  );
  const start = roomReadings(roomTally(run, 65, 0), "so", 65, 16);
  assert.equal(
    start.length,
    3,
    "round 0 says where the room starts, by quarter, and the line",
  );
  for (const s of [...words, ...start]) assert.doesNotMatch(s, VERDICT);
  // A round in a line: who was dealt what, what they did, what the room did with it.
  assert.equal(roundWords(run, 0, true), "the room before anything is dealt");
  assert.equal(
    roundWords(run, 5, true),
    "a scout was dealt fool's gold against the claim (looks like some) · said it to half the room · challenged by a soldier and a paladin; shown up by a paladin · struck for everyone",
  );
  assert.equal(
    roundWords(run, 8, true),
    "a pacifist was dealt a piece for the claim (some) · did not notice it",
  );
  const stage = runRoom({ ...SETUP, court: false });
  assert.match(roundWords(stage, 5, false), /shown up by a paladin · dropped by those after what is so$/);
  for (let r = 0; r <= 16; r++) assert.doesNotMatch(roundWords(run, r, true), VERDICT);
  const beside = roomsBeside(SETUP);
  assert.deepEqual(
    beside.map((b) => b.label),
    ["this room", "12 soldiers", "12 paladins", "12 pacifists", "12 scouts"],
  );
  assert.equal(beside[0].middle.length, 17);
});

test("the record counts across claims; it never grades", () => {
  const t = tally(SPECIMEN_MUSTERS);
  assert.equal(t.n, 2);
  assert.equal(t.pieces, 8);
  assert.deepEqual(
    [t.against.n, t.against.argued, t.own.n, t.own.argued],
    [4, 3, 4, 0],
  );
  const r = recordReadings(t);
  assert.deepEqual(r, [
    "2 claims mustered · 8 pieces came in, 5 for, 3 against",
    "of the weight you gave them, across the record you moved 95% on what went your way and 11% on what went against you",
    "you argued with 3 of the 4 that went against you and 0 of the 4 that went your way",
    "came out: 1 (0 so, 1 not so) — The new rates will lose us Harlow: not so, with you at 9% and your weights at 23%",
    "where you put yourself: among the paladins 1, among the pacifists 1",
  ]);
  assert.deepEqual(recordReadings(tally([])), ["no claims mustered yet"]);
  for (const s of r) assert.doesNotMatch(s, VERDICT);
});

test("a claim is a file a person can read, and a hand-written one reads", () => {
  for (const m of SPECIMEN_MUSTERS)
    assert.deepEqual(parseMuster(m.slug, serialiseMuster(m)), m);
  const text = serialiseMuster(JUNIOR);
  assert.match(
    text,
    /^- 2026-09-17 · against · ×8 · argued with it · then 62 — She froze/m,
  );
  assert.match(text, /^- Marta · 30 · argued it out$/m);
  assert.match(text, /^self: "0\.72 0\.70"$/m);
  const hand = parseMuster(
    "2026-09-01-by-hand",
    [
      "---",
      "put: 2026-09-01",
      "prior: 20",
      "act: 80",
      "---",
      "",
      "## the claim",
      "",
      "The river will flood the lower field.",
      "",
      "## what came in",
      "",
      "- for — The gauge at the bridge is up a foot.",
      "- 2026-09-03 · against · ×1.5 — Nothing on the upstream radar.",
      "- a line that is not a piece",
      "",
      "## who else has a view",
      "",
      "- Jo",
    ].join("\n"),
  );
  assert.equal(hand.put, "2026-09-01");
  assert.equal(hand.pieces.length, 2);
  assert.deepEqual(
    hand.pieces.map((p) => [p.on, p.way, p.weight, p.met, p.at]),
    [
      ["2026-09-01", "for", 3, "took", null],
      ["2026-09-03", "against", 1.5, "took", null],
    ],
  );
  assert.deepEqual(
    hand.others.map((o) => [o.name, o.at, o.met]),
    [["Jo", null, "talked"]],
  );
  assert.deepEqual(hand.room, ROOM);
  assert.throws(() => validateMuster({ claim: " " }), /a claim needs saying/);
  const v = validateMuster({
    claim: "x",
    prior: 0,
    act: 140,
    pieces: [
      { way: "sideways", text: "dropped" },
      { way: "for", weight: 0.2, at: 100 },
    ],
    self: [2, -1],
    room: { soldier: 9, paladin: 0, pacifist: 0, scout: 0 },
  });
  assert.equal(v.prior, 1);
  assert.equal(v.act, 99);
  assert.deepEqual(
    v.pieces.map((p) => [p.weight, p.at]),
    [[1.05, 99]],
  );
  assert.deepEqual(v.self, [1, 0]);
  assert.equal(v.room.soldier, 6);
  assert.deepEqual(
    validateMuster({
      claim: "x",
      room: { soldier: 0, paladin: 0, pacifist: 0, scout: 0 },
    }).room,
    ROOM,
    "an empty room is the default room",
  );
  assert.equal(
    slugOf("It will be dry, on Saturday!", "2026-09-28"),
    "2026-09-28-it-will-be-dry-on-saturday",
  );
});

test("a claim about a stone takes its first line when it reads as one", () => {
  const a = musterAbout(
    {
      id: "concept_flood",
      label: "The flood",
      first: "The river rises three days after rain upstream.",
    },
    "2026-09-28",
  );
  assert.equal(a.claim, "The river rises three days after rain upstream.");
  assert.equal(a.stone, "concept_flood");
  assert.equal(
    musterAbout({ id: "x", label: "Short", first: "tiny" }, "2026-09-28").claim,
    "Short",
  );
  assert.equal(
    musterAbout(
      { id: "y", label: "Long", first: "The first sentence reads as a claim. The rest is a summary of other things." },
      "2026-09-28",
    ).claim,
    "The first sentence reads as a claim.",
  );
  assert.equal(EXAMPLE_MUSTER.pieces.length, 4);
});
