import assert from "node:assert/strict";
import { test } from "node:test";
import { CHAIN, ROUNDS, STUDY } from "../content/toll.ts";
import {
  DOOR,
  POT,
  ROOM,
  SO,
  doorReading,
  outcome,
  payoff,
  readings,
  roomStory,
  roundReading,
  spread,
  type Move,
  type Round,
} from "./toll.ts";

test("the door is beaten in money by the game it leaves", () => {
  const door = payoff({ door: true });
  assert.deepEqual(door, { kept: DOOR, sent: 0 });
  // keep all ten: more for you, the same for them
  const keepAll = payoff({ door: false, give: 0 });
  assert.ok(keepAll.kept > door.kept && keepAll.sent === door.sent);
  // keep nine, send one: the same for you, more for them
  const one = payoff({ door: false, give: 1 });
  assert.ok(one.kept === door.kept && one.sent > door.sent);
});

test("a split is clamped to the ten and to whole dollars", () => {
  assert.deepEqual(payoff({ door: false, give: 12 }), { kept: 0, sent: POT });
  assert.deepEqual(payoff({ door: false, give: -3 }), { kept: POT, sent: 0 });
  assert.deepEqual(payoff({ door: false, give: 3.6 }), { kept: 6, sent: 4 });
});

test("the door is read against the split already chosen", () => {
  assert.match(doorReading(4, true), /chosen to send \$4; the door left you \$9/);
  assert.match(doorReading(4, true), /bought only that they would not know\.$/);
  assert.match(doorReading(0, true), /chosen to keep all \$10; the door left you \$9/);
  assert.match(doorReading(4, false), /\$6 for you, \$4 for them\. The door would have left you \$9/);
  assert.match(roundReading("door", { door: true }), /^You took the door/);
});

test("the spread names the most and the least and every round that ties", () => {
  const played: { round: Round; move: Move }[] = [
    { round: "envelope", move: { door: false, give: 4 } },
    { round: "door", move: { door: true } },
    { round: "feed", move: { door: false, give: 7 } },
    { round: "none", move: { door: false, give: 0 } },
  ];
  const s = spread(played)!;
  assert.match(s, /most that reached a stranger was \$7, when everyone who follows you would see it\./);
  assert.match(s, /least was \$0, in two rounds: with a door to leave by and with no one to know\./);
  assert.equal(spread(played.slice(0, 1)), null);
  const same = spread([
    { round: "envelope", move: { door: false, give: 5 } },
    { round: "none", move: { door: false, give: 5 } },
  ])!;
  assert.match(same, /\$5 in every round/);
});

test("the room separates only when the act costs the rest more than it is worth", () => {
  const sep = outcome({ worth: 20, ifSo: 10, ifNot: 40 });
  assert.equal(sep.kind, "separates");
  assert.equal(sep.tells, 1);
  assert.equal(sep.spent, SO * 10);
  const pool = outcome({ worth: 60, ifSo: 10, ifNot: 40 });
  assert.equal(pool.kind, "pools");
  assert.equal(pool.tells, SO / ROOM);
  assert.equal(pool.spent, SO * 10 + (ROOM - SO) * 40);
  assert.equal(outcome({ worth: 5, ifSo: 10, ifNot: 40 }).kind, "none");
  assert.equal(outcome({ worth: 5, ifSo: 10, ifNot: 40 }).tells, null);
  assert.equal(outcome({ worth: 20, ifSo: 30, ifNot: 5 }).kind, "inverts");
  // worth equal to the cost is not worth it
  assert.equal(outcome({ worth: 10, ifSo: 10, ifNot: 40 }).kind, "none");
});

test("the chain walks trust, receipts and signalling to a dearer room", () => {
  const kinds = CHAIN.map((c) => outcome(c.rules).kind);
  assert.deepEqual(kinds, [
    "separates",
    "pools",
    "separates",
    "pools",
    "separates",
  ]);
  const spent = CHAIN.map((c) => outcome(c.rules).spent);
  assert.deepEqual(spent, [0, 300, 400, 2800, 1200]);
  // the text of each step says the room's spend as it is counted
  assert.match(CHAIN[2].text, /four hundred dollars/);
  assert.match(CHAIN[3].text, /two thousand eight hundred dollars/);
  assert.match(CHAIN[4].text, /twelve hundred dollars/);
  assert.match(roomStory(CHAIN[3].rules), /spends \$2,800/);
});

test("the rounds and the study are the four the sheet walks", () => {
  assert.deepEqual(
    ROUNDS.map((r) => r.round),
    ["envelope", "door", "feed", "none"],
  );
  assert.equal(ROUNDS[0].door, undefined);
  assert.equal(STUDY.length, 3);
});

test("no reading grades the reader or the room", () => {
  const verdict =
    /\b(should|selfish|generous|greedy|kind|good|bad|wrong|right|fair|unfair|cheap|honest|dishonest|hypocrit\w*|fooled|real you)\b/i;
  const rules = [
    ...CHAIN.map((c) => c.rules),
    { worth: 0, ifSo: 0, ifNot: 0 },
    { worth: 20, ifSo: 30, ifNot: 5 },
  ];
  for (const chose of [0, 1, 5, 10])
    for (const took of [true, false]) {
      const played: { round: Round; move: Move }[] = [
        { round: "envelope", move: { door: false, give: chose } },
        {
          round: "door",
          move: took ? { door: true } : { door: false, give: chose },
        },
        {
          round: "feed",
          move: took ? { door: true } : { door: false, give: 10 - chose },
        },
        { round: "none", move: { door: false, give: 0 } },
      ];
      for (const r of readings(played, chose, rules))
        assert.doesNotMatch(r, verdict, r);
      assert.doesNotMatch(roundReading("none", { door: true }), verdict);
    }
  for (const step of CHAIN) assert.doesNotMatch(step.text, verdict, step.text);
  for (const r of ROUNDS) assert.doesNotMatch(r.text, verdict, r.text);
});
