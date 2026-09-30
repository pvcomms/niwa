import assert from "node:assert/strict";
import { test } from "node:test";
import { POSITIONS, SPECIMEN } from "../content/keel.ts";
import {
  MID,
  SCALE,
  articleNotes,
  articlesText,
  belief,
  crowdAgainst,
  drawCrowds,
  how,
  mover,
  reading,
  roomsReading,
  summarise,
  verdict,
  type Crowd,
  type Summary,
} from "./keel.ts";

/** A seeded generator, so a failure can be run again. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("twelve positions, two in each of six topics", () => {
  assert.equal(POSITIONS.length, 12);
  const topics = new Map<string, number>();
  for (const p of POSITIONS)
    topics.set(p.topic, (topics.get(p.topic) ?? 0) + 1);
  assert.equal(topics.size, 6);
  for (const n of topics.values()) assert.equal(n, 2);
  assert.equal(new Set(POSITIONS.map((p) => p.id)).size, 12);
  assert.equal(SPECIMEN.length, 12);
});

test("the crowd always stands on the far side of the first answer", () => {
  const rand = seeded(7);
  for (let a = 1; a <= SCALE; a++) {
    for (let i = 0; i < 40; i++) {
      const c = crowdAgainst(a, rand);
      const sum = c.shares.reduce((x, y) => x + y, 0);
      assert.ok(Math.abs(sum - 1) < 1e-9);
      if (a > MID) assert.ok(c.side === -1 && c.mean < MID, `a=${a}`);
      if (a < MID) assert.ok(c.side === 1 && c.mean > MID, `a=${a}`);
      assert.ok(c.against >= 70 && c.against <= 92, `against ${c.against}`);
      assert.ok(c.votes >= 1600 && c.votes < 4400);
    }
  }
});

test("one position in each topic gets a crowd, the other is the control", () => {
  const first = Object.fromEntries(POSITIONS.map((p) => [p.id, 5]));
  for (let seed = 1; seed < 30; seed++) {
    const crowds = drawCrowds(POSITIONS, first, seeded(seed));
    assert.equal(Object.keys(crowds).length, 6);
    const topics = POSITIONS.filter((p) => crowds[p.id]).map((p) => p.topic);
    assert.equal(new Set(topics).size, 6);
  }
});

const against = (mean: number): Crowd => ({
  side: mean < MID ? -1 : 1,
  shares: [0, 0, 0, 1, 0, 0, 0],
  mean,
  votes: 2000,
  against: 80,
  likes: 1000,
});

test("toward the crowd is carried, away is pushed back, still is held", () => {
  assert.equal(verdict(6, 4, against(2.2)), "carried");
  assert.equal(verdict(6, 7, against(2.2)), "pushed back");
  assert.equal(verdict(6, 6, against(2.2)), "held");
  assert.equal(verdict(2, 3, against(5.8)), "carried");
  assert.equal(verdict(3, 3), "held");
  assert.equal(verdict(3, 5), "wobbled");
});

test("noise is measured on the control, pull toward the crowd on the rest", () => {
  const ps = POSITIONS.slice(0, 4);
  const a = { album: 6, taste: 5, product: 2, brand: 3 };
  const b = { album: 4, taste: 4, product: 2, brand: 3 };
  const crowds = { album: against(2.2), product: against(5.8) };
  const s = summarise(ps, a, b, crowds);
  assert.equal(s.withCrowd, 2);
  assert.equal(s.without, 2);
  assert.equal(s.noise, 0.5); // taste moved one, brand none
  assert.equal(s.pull, 1); // album moved two toward, product none
  assert.deepEqual([s.held, s.carried, s.pushed], [1, 1, 0]);
});

const base: Summary = {
  noise: 0.5,
  pull: 0,
  held: 3,
  carried: 2,
  pushed: 1,
  withCrowd: 6,
  without: 6,
};

test("the reading follows the run", () => {
  assert.match(reading({ ...base, pull: 1.2 }), /further than asking twice/);
  assert.match(reading({ ...base, pull: -0.8 }), /moved away from the crowd/);
  assert.match(
    reading({ ...base, held: 6, carried: 0, pushed: 0 }),
    /6 of the 6/,
  );
  assert.match(reading(base), /beyond your own noise/);
});

test("the rooms count who goes in whole, and say it in the right number", () => {
  const whole = {
    chat: "say",
    family: "say",
    post: "say",
    stranger: "say",
  } as const;
  const soft = {
    chat: "say",
    family: "soft",
    post: "say",
    stranger: "say",
  } as const;
  const hush = {
    chat: "say",
    family: "say",
    post: "quiet",
    stranger: "say",
  } as const;
  assert.match(roomsReading([whole, whole]).text, /^All 2/);
  assert.equal(roomsReading([whole, hush, soft]).whole, 1);
  assert.match(
    roomsReading([whole, hush, soft]).text,
    /1 of 3 .* One goes quiet somewhere\.$/,
  );
  assert.match(
    roomsReading([hush, hush]).text,
    /None of the 2 .* Every one goes quiet/,
  );
  assert.match(
    roomsReading([hush]).text,
    /^It does not go .* It goes quiet somewhere\.$/,
  );
});

test("an article reads on from its lead words", () => {
  assert.equal(
    belief("I believe that The album is the unit"),
    "the album is the unit.",
  );
  assert.equal(
    belief("I think minds should move on evidence"),
    "minds should move on evidence.",
  );
  assert.equal(belief("  "), "");
  assert.equal(
    mover("I'd change my mind if I found out otherwise"),
    "I found out otherwise.",
  );
  assert.equal(how("unsure"), "I can't say how I got here.");
  assert.equal(how("feed"), "I got here through the feed.");
  const t = articlesText(
    "30 September 2026",
    [{ text: "x", bel: "presence beats proof", src: "lived", chg: "" }],
    "Said in every room: 1 of 1.",
  );
  assert.match(
    t,
    /^ARTICLES · 30 September 2026\n\nI\. I believe presence beats proof\./,
  );
  assert.match(t, /Nothing named would change my mind\./);
});

test("nothing it says is a verdict on the reader", () => {
  const words =
    /\b(fooled|gullible|naive|should|wrong|weak|sheep|failed|stupid|good|bad|better|worse|fake)\b/i;
  const summaries: Summary[] = [
    { ...base, pull: 1.2 },
    { ...base, pull: -0.8 },
    { ...base, held: 6 },
    base,
  ];
  for (const s of summaries) assert.doesNotMatch(reading(s), words);
  const rows = [
    { chat: "say", family: "say", post: "say", stranger: "say" },
    { chat: "quiet", family: "soft", post: "quiet", stranger: "say" },
  ] as const;
  assert.doesNotMatch(roomsReading([...rows]).text, words);
  for (const src of ["feed", "unsure", "lived"] as const)
    for (const n of articleNotes([
      { text: "x", bel: "y", src, chg: src === "lived" ? "z" : "" },
    ]))
      assert.doesNotMatch(n, words, n);
});
