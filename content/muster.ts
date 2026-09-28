import type { Muster } from "../lib/muster.ts";

/**
 * Specimen A's claims — two from the studio in the synthetic life. The first
 * is still open: the quiet junior and a client account, a claim Specimen A
 * would rather were so, with the pieces as they came and where it stood after
 * each. The second came out: the new rates and a client it feared losing,
 * rather not, and it did not. Fiction, like the rest of the specimen; a
 * deployed garden has no claims to read and shows these.
 */
export const SPECIMEN_MUSTERS: Muster[] = [
  {
    slug: "2026-09-14-the-quiet-junior-is-ready-to-run-a-client-account-on-her-own",
    put: "2026-09-14",
    touched: "2026-09-26",
    claim: "The quiet junior is ready to run a client account on her own.",
    prior: 40,
    from: "seen",
    like: "so",
    act: 65,
    would: "Hand her the Aldgate account from October.",
    acted: "",
    pieces: [
      {
        id: "p1",
        on: "2026-09-14",
        text: "She rebuilt the Harlow deck overnight and nobody had to touch it.",
        way: "for",
        weight: 3,
        met: "took",
        at: 67,
      },
      {
        id: "p2",
        on: "2026-09-17",
        text: "She froze when the client pushed back on the fee, and I took the call over.",
        way: "against",
        weight: 8,
        met: "argued",
        at: 62,
      },
      {
        id: "p3",
        on: "2026-09-21",
        text: "Two clients asked for her by name this month.",
        way: "for",
        weight: 1.5,
        met: "took",
        at: 71,
      },
      {
        id: "p4",
        on: "2026-09-24",
        text: "Marta says she has never once pushed back on a client in two years.",
        way: "against",
        weight: 3,
        met: "argued",
        at: 69,
      },
      {
        id: "p5",
        on: "2026-09-26",
        text: "She ran Tuesday's review without me, and her notes were better than mine.",
        way: "for",
        weight: 3,
        met: "took",
        at: 86,
      },
    ],
    others: [
      { id: "o1", name: "Marta", at: 30, met: "argued" },
      { id: "o2", name: "Tom", at: 75, met: "talked" },
    ],
    self: [0.72, 0.7],
    room: { soldier: 3, paladin: 3, pacifist: 3, scout: 3 },
    came: "",
    cameOn: "",
    after: "",
    stone: null,
  },
  {
    slug: "2026-08-18-the-new-rates-will-lose-us-harlow",
    put: "2026-08-18",
    touched: "2026-09-16",
    claim: "The new rates will lose us Harlow.",
    prior: 35,
    from: "hunch",
    like: "not",
    act: 50,
    would: "Ring Harlow's producer before the invoice goes out.",
    acted: "",
    pieces: [
      {
        id: "p1",
        on: "2026-08-20",
        text: "Their producer went quiet for a week after the rates went out.",
        way: "for",
        weight: 3,
        met: "argued",
        at: 38,
      },
      {
        id: "p2",
        on: "2026-08-29",
        text: "They asked for the next job in two halves, billed separately.",
        way: "for",
        weight: 1.5,
        met: "passed",
        at: 40,
      },
      {
        id: "p3",
        on: "2026-09-09",
        text: "Their finance lead signed the new rates without a comment.",
        way: "against",
        weight: 8,
        met: "took",
        at: 9,
      },
    ],
    others: [{ id: "o1", name: "Ben", at: 60, met: "talked" }],
    self: [0.34, 0.3],
    room: { soldier: 3, paladin: 3, pacifist: 3, scout: 3 },
    came: "not",
    cameOn: "2026-09-16",
    after:
      "They renewed for the year. The quiet week was the producer's holiday.",
    stone: null,
  },
];

/**
 * What an empty sheet draws before a word is typed: a walk on the ridge, the
 * forecast as it came in through the week, and where one would stand after
 * each. Nothing is kept until the reader writes over it and sets it down.
 */
export const EXAMPLE_MUSTER: Muster = {
  slug: "",
  put: "",
  touched: "",
  claim: "It will be dry enough to walk the ridge on Saturday.",
  prior: 50,
  from: "base",
  like: "so",
  act: 70,
  would: "Book the early train.",
  acted: "",
  pieces: [
    {
      id: "p1",
      on: "",
      text: "Tuesday's forecast gave Saturday a thirty per cent chance of rain.",
      way: "for",
      weight: 3,
      met: "took",
      at: 72,
    },
    {
      id: "p2",
      on: "",
      text: "The path was mud all the way up last weekend.",
      way: "against",
      weight: 1.5,
      met: "passed",
      at: 70,
    },
    {
      id: "p3",
      on: "",
      text: "The farmer at the bottom says the ridge holds water for days after a wet week.",
      way: "against",
      weight: 3,
      met: "argued",
      at: 66,
    },
    {
      id: "p4",
      on: "",
      text: "Thursday's forecast moved the front to Sunday.",
      way: "for",
      weight: 8,
      met: "took",
      at: 93,
    },
  ],
  others: [],
  self: null,
  room: { soldier: 3, paladin: 3, pacifist: 3, scout: 3 },
  came: "",
  cameOn: "",
  after: "",
  stone: null,
};
