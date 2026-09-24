import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_CIRCUIT,
  apply,
  bendsOf,
  ceilingOf,
  cue,
  emptyPathway,
  gaugesOf,
  idOf,
  knobsOf,
  leanOf,
  parsePathway,
  readings,
  rest,
  serialisePathway,
  simulate,
  slugOf,
  stateOf,
  step,
  tally,
  validateCircuit,
  validatePathway,
  type Circuit,
  type Knobs,
  type Pathway,
} from "./alarm.ts";
import {
  SPECIMEN_CIRCUIT,
  SPECIMEN_PATHWAYS,
} from "../content/specimen-alarm.ts";

const TODAY = "2026-09-24";
const QUIET: Knobs = { tone: 55, sleep: 25, stress: 25, caffeine: 20 };
const LOADED: Knobs = { tone: 35, sleep: 80, stress: 70, caffeine: 60 };

test("a rested body is calm, and a small cue only alerts it", () => {
  let b = rest(QUIET);
  assert.equal(stateOf(b), "calm");
  b = cue(b, QUIET, 1);
  for (let i = 0; i < 20; i++) b = step(b, QUIET, 0.05);
  assert.equal(stateOf(b), "alert");
  for (let i = 0; i < 600; i++) b = step(b, QUIET, 0.05);
  assert.ok(["calm", "rest"].includes(stateOf(b)));
});

test("a hard cue surges; loaded, the same cue hijacks and the brake has less room", () => {
  const quiet = simulate(QUIET, [3]);
  assert.equal(quiet.peak, "surge");
  const loaded = simulate(LOADED, [3]);
  assert.ok(["hijack", "freeze"].includes(loaded.peak), loaded.peak);
  assert.ok(ceilingOf(LOADED) < ceilingOf(QUIET));
  assert.equal(ceilingOf(QUIET), 100 - 25 * 0.45 - 25 * 0.4);
});

test("a brake pressed brings it down sooner", () => {
  const alone = simulate(QUIET, [6, 6]);
  const braked = simulate(QUIET, [6, 6], {
    brake: { at: 4, reach: "seconds" },
  });
  assert.ok(alone.calmAt !== null && braked.calmAt !== null);
  assert.ok(
    braked.calmAt! < alone.calmAt!,
    `${braked.calmAt} < ${alone.calmAt}`,
  );
  // sustained extreme threat flips into freeze
  const held = simulate(LOADED, [10, 10, 10, 10, 10, 10, 10, 10, 10], {
    gap: 0.35,
  });
  assert.equal(held.peak, "freeze");
  const g = gaugesOf(cue(rest(QUIET), QUIET, 9));
  assert.ok(
    g.hr >= 58 && g.digestion <= 100 && g.balance >= -100 && g.balance <= 100,
  );
  assert.equal(apply(rest(QUIET), "seconds").breatheT, 4.6);
});

test("the marks add up: triggers bend up by charge times dose, brakes down by reach and room", () => {
  const c = SPECIMEN_CIRCUIT;
  const p = SPECIMEN_PATHWAYS[0];
  const { bends, up, down, lean } = bendsOf(p, c);
  assert.equal(up, 3 * 3 + 3 * 1 + 2 * 1);
  const room = ceilingOf(knobsOf(c.load)) / 100;
  assert.ok(Math.abs(down - (2 + 3) * room) < 1e-9);
  assert.equal(bends.filter((b) => b.kind === "trigger").length, 3);
  assert.equal(leanOf(lean), "vigilant");
  const coast = bendsOf(SPECIMEN_PATHWAYS[1], c);
  assert.equal(leanOf(coast.lean), "calm");
  const none = bendsOf(emptyPathway(TODAY), c);
  assert.equal(none.lean, 0);
  assert.equal(leanOf(none.lean), "between");
});

test("the tally and readings say what the marks are, and never grade", () => {
  const c = SPECIMEN_CIRCUIT;
  const p = SPECIMEN_PATHWAYS[0];
  const t = tally(p, c, SPECIMEN_PATHWAYS);
  assert.equal(t.known, 4);
  assert.equal(t.touched.length, 3);
  assert.deepEqual(
    t.hardest.map((x) => x.id),
    ["being-watched-while-working"],
  );
  assert.equal(t.within.length, 2);
  assert.equal(t.fastest, "seconds");
  assert.equal(t.walked, 2);
  assert.equal(t.went.vigilant, 1);
  const words = readings(t, p, c);
  assert.match(
    words[0],
    /^touches 3 of your 4 known triggers: Being watched while working \(hits hard\), Raised voices and A room I can't leave\.$/,
  );
  assert.ok(
    words.some(
      (w) =>
        w ===
        "you said Being watched while working usually pulls Over-preparing and Going quiet.",
    ),
  );
  assert.ok(
    words.some(
      (w) => w === "you expect Over-preparing and Going quiet to fire.",
    ),
  );
  assert.ok(
    words.some(
      (w) =>
        w ===
        "2 of your 5 brakes are within reach: A long exhale and A walk — the fastest works in seconds.",
    ),
  );
  assert.ok(
    words.some((w) =>
      /^as you are today: sleep debt 35, chronic stress 40, caffeine 25, vagal tone 50 — the brake has 68 of 100 to work with\.$/.test(
        w,
      ),
    ),
  );
  assert.ok(
    words.some((w) => w === "as marked, the line runs to hypervigilance."),
  );
  assert.ok(
    words.some(
      (w) =>
        w ===
        "3 pathways asked; you said how 2 went: 1 calm, 1 vigilant, 0 mixed.",
    ),
  );
  for (const w of words)
    assert.doesNotMatch(w, /should|score|risk|safe|recommend|avoid/i);
  const empty = readings(tally(null, EMPTY_CIRCUIT, []), null, EMPTY_CIRCUIT);
  assert.match(empty[0], /^name what sets your alarm off first/);
});

test("the pathway file round-trips, and the circuit validates its ids", () => {
  const p: Pathway = {
    ...SPECIMEN_PATHWAYS[0],
    note: "Three weeks in.\n\nStill here.",
  };
  const raw = serialisePathway(p);
  assert.ok(raw.includes('"being-watched-while-working": 3'));
  assert.deepEqual(parsePathway(p.slug, raw), p);
  const v = validatePathway(
    {
      title: "  Move to the coast ",
      touches: { "unanswered-messages": 2, unknown: 3 },
      brakes: ["sleep", "nope"],
      expects: ["checking"],
    },
    SPECIMEN_CIRCUIT,
    TODAY,
  );
  assert.equal(v.slug, "move-to-the-coast");
  assert.deepEqual(v.touches, { "unanswered-messages": 2 });
  assert.deepEqual(v.brakes, ["sleep"]);
  assert.equal(v.asked, TODAY);
  assert.equal(v.went, null);
  assert.throws(
    () => validatePathway({ title: "" }, SPECIMEN_CIRCUIT, TODAY),
    /title/,
  );
  const c: Circuit = validateCircuit({
    triggers: [
      { id: "Noise", label: "Noise", charge: 3, pulls: ["leaving", "ghost"] },
    ],
    defences: [{ id: "leaving", label: "Leaving early", reflex: "flight" }],
    brakes: [{ id: "earplugs", label: "Earplugs", reach: "seconds" }],
    load: { sleep: 140, stress: -3, caffeine: "12", tone: 55 },
    loadDay: "2026-09-24",
  });
  assert.deepEqual(c.triggers[0].pulls, ["leaving"]);
  assert.equal(c.triggers[0].id, "noise");
  assert.deepEqual(c.load, { sleep: 100, stress: 0, caffeine: 12, tone: 55 });
  assert.throws(
    () =>
      validateCircuit({
        triggers: [{ id: "a", label: "A" }],
        defences: [{ id: "a", label: "A" }],
      }),
    /two things/,
  );
  assert.equal(slugOf("Père — Noël!"), "pere-noel");
  assert.equal(idOf("A room I can't leave", new Set()), "a-room-i-can-t-leave");
  assert.equal(idOf("A walk", new Set(["a-walk"])), "a-walk-2");
});
