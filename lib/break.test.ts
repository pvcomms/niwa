import assert from "node:assert/strict";
import { test } from "node:test";
import {
  THREE_DEFAULT,
  census,
  compare,
  parseMoment,
  readings,
  serialiseMoment,
  tally,
  validateMoment,
} from "./break.ts";
import { EXERCISES, SPECIMEN_MOMENTS } from "../content/break.ts";

const [FIRST, SECOND] = SPECIMEN_MOMENTS;
const VERDICT =
  /\b(you should|too hard on|harsh|cruel|unkind|kinder|better|worse|good job|well done|progress|improv\w*|healthy|unhealthy|score)\b/i;

test("the census counts the words a voice leans on, with each hit kept", () => {
  const c = census(SECOND.toSelf);
  assert.deepEqual(c.absolutes, ["always"]);
  assert.deepEqual(c.shoulds, ["should"]);
  assert.deepEqual(c.labels, ["lazy", "mess"]);
  assert.deepEqual(c.contempt, []);
  assert.deepEqual(c.you, ["you're", "you", "you"]);
  assert.deepEqual(c.allowance, []);
  const f = census(SECOND.toFriend);
  assert.deepEqual(f.absolutes, []);
  assert.deepEqual(f.labels, []);
  assert.deepEqual(f.allowance, ["of course", "anyone would"]);
});

test("the two voices are read side by side as counts, never as a verdict", () => {
  const r = compare(SECOND.toSelf, SECOND.toFriend);
  assert.equal(
    r[0],
    "to yourself: 1 absolute ('always'), 1 should ('should'), 2 labels ('lazy', 'mess')",
  );
  assert.equal(r[1], "'you' turned on yourself 3 times");
  assert.equal(r[2], "to a friend: 2 allowances ('of course', 'anyone would')");
  assert.equal(
    r[3],
    "the friend's version drops the absolutes, shoulds, labels and adds allowance",
  );
  assert.equal(r[4], "the friend gets more words");
  for (const s of r) assert.doesNotMatch(s, VERDICT);
  assert.deepEqual(compare("", ""), []);
  assert.deepEqual(compare("I did what I could.", ""), [
    "to yourself: none of the counted words",
  ]);
});

test("the tally counts breaks, hands, the hardest one and the critic's words; the readings never grade", () => {
  const more = [
    ...SPECIMEN_MOMENTS,
    {
      ...SECOND,
      slug: "x",
      at: "2026-09-27T09:00+02:00",
      toSelf: "Lazy again. You never learn.",
      hardest: "shared" as const,
      touch: "heart" as const,
    },
  ];
  const t = tally(more, "2026-09-27");
  assert.equal(t.n, 3);
  assert.equal(t.week, 3);
  assert.equal(t.last, "2026-09-27");
  assert.equal(t.sinceLast, 0);
  assert.equal(t.own, 3);
  assert.deepEqual(t.touches, [
    { touch: "heart", n: 2 },
    { touch: "both", n: 1 },
  ]);
  assert.deepEqual(t.hardest, { notice: 0, shared: 2, kind: 1 });
  assert.equal(t.friend, 2);
  assert.equal(t.after, 2);
  assert.deepEqual(t.critic, [{ word: "lazy", n: 2 }]);
  const r = readings(t);
  assert.equal(r[0], "3 breaks · 3 this week, 3 this month · the last today");
  assert.equal(r[1], "the three sentences were in your own words every time");
  assert.equal(
    r[2],
    "a hand: a hand on the heart ×2, both hands on the chest ×1",
  );
  assert.equal(r[3], "hardest to say: the shared one ×2, the kind one ×1");
  assert.equal(
    r[4],
    "what you needed to hear written for 2 · the friend's version for 2 · a letter for 0 · afterwards for 2",
  );
  assert.equal(
    r[5],
    "the words that come back when you talk to yourself: 'lazy' ×2",
  );
  for (const s of r) assert.doesNotMatch(s, VERDICT);
  assert.deepEqual(readings(tally([], "2026-09-27")), ["no breaks taken yet"]);
  const stock = tally(
    [{ ...FIRST, three: { ...THREE_DEFAULT } }],
    "2026-09-27",
  );
  assert.equal(
    readings(stock)[1],
    "the three sentences have been the workbook's so far",
  );
});

test("a moment survives its file; the three are bullets a person can read", () => {
  for (const m of SPECIMEN_MOMENTS)
    assert.deepEqual(parseMoment(m.slug, serialiseMoment(m)), m);
  const raw = serialiseMoment(SECOND);
  assert.match(raw, /^- noticed: This is stress\.$/m);
  assert.match(raw, /^## to a friend$/m);
  assert.match(raw, /^touch: both$/m);
});

test("validation fills the three, clamps the rest, and refuses a break with nothing that hurts", () => {
  assert.throws(() => validateMoment({ what: " " }), /needs what hurts/);
  const m = validateMoment({
    what: "x",
    at: "2026-09-27T09:05+02:00",
    touch: "elbow",
    hardest: "all",
    three: { notice: "Ouch." },
  });
  assert.equal(m.slug, "2026-09-27-0905");
  assert.equal(m.touch, "");
  assert.equal(m.hardest, "");
  assert.deepEqual(m.three, {
    notice: "Ouch.",
    shared: THREE_DEFAULT.shared,
    kind: THREE_DEFAULT.kind,
  });
  assert.equal(EXERCISES.filter((e) => e.here).length, 5);
});
