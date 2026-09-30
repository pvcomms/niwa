import type { Crowd, Words } from "../lib/crowd.ts";

/**
 * Every word of the crowd. The question is the one the literature has asked
 * doctors since Casscells (1978); the situations are illustrative numbers,
 * not clinical ones, and say so on the sheet.
 */

/** The classic: one in a thousand, a test that catches 99 in 100 and flags 1 in 100 of the rest. */
export const CLASSIC: Crowd = { rare: 1000, catches: 0.99, flags: 0.01 };

export const CLASSIC_WORDS: Words = {
  people: "people",
  has: ["has the illness", "have the illness"],
  test: "the test",
};

export const QUESTION = {
  lead: [
    "A screening test for a rare illness is 99% accurate. It catches 99 of every 100 people who have the illness, and it flags only 1 in 100 of the people who do not.",
    "About 1 person in 1,000 has the illness. You take the test. It comes back positive.",
  ],
  ask: "What is the chance you actually have it?",
  before: "No arithmetic yet. Say what it feels like.",
};

/** What the people asked in the studies said. Set beside the reader's number, never over it. */
export const ASKED =
  "Most people asked, doctors among them, say 95 in 100 or more.";

/** The typical answer, for the bar beside the reader's. */
export const TYPICAL = 95;

/** The crowd walked through, one step at a time. */
export const STEPS: { name: string; text: string }[] = [
  {
    name: "1,000 people",
    text: "Here are 1,000 people. No one has been tested yet. You are one of these dots.",
  },
  {
    name: "who has it",
    text: "About 1 in 1,000 has the illness, so in this crowd one person has it. No one knows which dot, including them.",
  },
  {
    name: "test everyone",
    text: "Now everyone takes the 99% test. It catches the one who has it. It also flags 1 in 100 of the 999 who do not, which is about 10 of them. A ring marks everyone the test flagged.",
  },
  {
    name: "keep only the flagged",
    text: "Only the flagged matter now, because you are one of them. 11 were flagged; 1 has it. That is 1 in 11, about 9 in 100. The test did what it said. The crowd without the illness was simply enormous, and 1 in 100 of an enormous number is more than 99 in 100 of one.",
  },
];

export type Situation = {
  slug: string;
  name: string;
  crowd: Crowd;
  words: Words;
  /** Where the numbers come from, in a sentence. */
  note: string;
};

/** Situations to set the dials to. Illustrative numbers. */
export const SITUATIONS: Situation[] = [
  {
    slug: "illness",
    name: "a rare illness",
    crowd: CLASSIC,
    words: CLASSIC_WORDS,
    note: "The classic. A very good test, a very rare illness: of every eleven flagged, one has it.",
  },
  {
    slug: "breath",
    name: "a roadside breath test",
    crowd: { rare: 100, catches: 1, flags: 0.05 },
    words: {
      people: "drivers",
      has: ["is over the limit", "are over the limit"],
      test: "the device",
    },
    note: "Say 1 driver in 100 at a night checkpoint is over the limit, and the device flags 5 in 100 of those who are not. Of every six flagged, one is over.",
  },
  {
    slug: "faces",
    name: "a camera at a stadium",
    crowd: { rare: 1000, catches: 0.95, flags: 0.005 },
    words: {
      people: "faces",
      has: ["is on the list", "are on the list"],
      test: "the match",
    },
    note: "Looking for 1 face in 1,000 with a strong match, wrong on only 1 in 200 of the rest. Of every six matches, five are someone else.",
  },
  {
    slug: "season",
    name: "a common illness, in season",
    crowd: { rare: 4, catches: 0.9, flags: 0.05 },
    words: CLASSIC_WORDS,
    note: "When the thing is common, the same kind of test reads the other way: most of the flagged have it.",
  },
  {
    slug: "spam",
    name: "a spam filter",
    crowd: { rare: 2, catches: 0.99, flags: 0.01 },
    words: {
      people: "emails",
      has: ["is spam", "are spam"],
      test: "the filter",
    },
    note: "Half of all email is spam, so a flag is almost always spam. The same 99 and 1 as the rare illness; a different crowd.",
  },
];

/** The same shape elsewhere. */
export const BITES: { where: string; how: string }[] = [
  {
    where: "screening",
    how: "A positive mammogram, PSA or prenatal screen in a low-risk person is, more often than not, a person who does not have it. That is why the next step is a better test rather than a diagnosis.",
  },
  {
    where: "fraud alerts",
    how: "Fraud is rare, so even a fine detector freezes mostly innocent cards. The bank texts you rather than cancelling the card for the same reason.",
  },
  {
    where: "face matching",
    how: "Point a camera at a stadium looking for a handful of people, and nearly every match it makes is someone who resembles them.",
  },
  {
    where: "checkpoints",
    how: "A device that flags a few in a hundred of the sober, used on thousands of sober drivers in a night, flags a good many sober drivers.",
  },
  {
    where: "reading people",
    how: "Quiet and fond of puzzles, so probably a programmer. Perhaps. There are far more quiet people who are not programmers than quiet people who are.",
  },
];

/** What the crowd leaves to the reader. */
export const LEAVES =
  "Before you take a positive at its word, ask how rare the thing was to begin with. The rarer it is, the more of the flagged do not have it, however the test is described. Whether this one is the rare case is yours to weigh.";

export const NUMBERS_NOTE =
  "The 99% example is the one the psychology literature has asked doctors since 1978. The situations are illustrative numbers, not clinical or legal ones.";
