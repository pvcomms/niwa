import type { Fence } from "../lib/fence.ts";

/**
 * Specimen A's fences — two from the studio in the synthetic life. The first
 * was looked into and moved: the check stays, the wait goes. The second was
 * taken down for a while and looked at again on the day named; one thing
 * listed came through, and it went back up twice a week. Fiction, like the
 * rest of the specimen; a deployed garden has no fences to read and shows
 * these.
 */
export const SPECIMEN_FENCES: Fence[] = [
  {
    slug: "2026-09-08-the-friday-file-check-before-anything-goes-to-a-client",
    put: "2026-09-08",
    touched: "2026-09-12",
    fence: "The Friday file check before anything goes to a client.",
    cost: "Half an hour every Friday for two of us, and a send that is ready on a Tuesday waits until the end of the week.",
    maker: "ask",
    by: "Marta, who ran the studio before me",
    when: "2021",
    uses: [
      {
        id: "u1",
        text: "So nothing half-finished goes out.",
        known: "guess",
        holds: "",
        instead: "",
        by: "you",
        kept: true,
      },
      {
        id: "u2",
        text: "After the week a client was sent another client's drafts.",
        known: "asked",
        holds: "holds",
        instead: "",
        by: "you",
        kept: true,
      },
      {
        id: "u3",
        text: "So the juniors see everything that leaves the studio.",
        known: "seen",
        holds: "unsure",
        instead: "the Thursday review, partly",
        by: "you",
        kept: true,
      },
    ],
    through: [
      { id: "t1", text: "A wrong file, to the wrong client.", came: "" },
      { id: "t2", text: "The juniors never seeing finished work.", came: "" },
    ],
    back: "easily",
    backHow: "A line back in the Friday calendar.",
    calls: [
      {
        on: "2026-09-12",
        call: "move",
        until: "",
        note: "To the day a send is ready — the check stays, the wait goes.",
        unseen: false,
      },
    ],
    after: "",
    stone: null,
  },
  {
    slug: "2026-09-15-the-9-30-stand-up-every-day",
    put: "2026-09-15",
    touched: "2026-09-26",
    fence: "The 9:30 stand-up, every day.",
    cost: "Fifteen minutes that break the best hour of the morning, for four people.",
    maker: "me",
    by: "the week we all went home",
    when: "March 2020",
    uses: [
      {
        id: "u1",
        text: "So the ones working from home were not forgotten.",
        known: "written",
        holds: "gone",
        instead: "",
        by: "you",
        kept: true,
      },
      {
        id: "u2",
        text: "So blocked work surfaces the same day, not on Friday.",
        known: "guess",
        holds: "",
        instead: "",
        by: "you",
        kept: true,
      },
    ],
    through: [
      { id: "t1", text: "Blocked work sitting for days.", came: "came" },
      { id: "t2", text: "The quiet junior going quieter.", came: "not" },
    ],
    back: "easily",
    backHow: "One message on a Monday.",
    calls: [
      {
        on: "2026-09-15",
        call: "trial",
        until: "2026-09-26",
        note: "Two weeks without it, watching the board.",
        unseen: false,
      },
      {
        on: "2026-09-26",
        call: "back",
        until: "",
        note: "Twice a week, Monday and Thursday.",
        unseen: false,
      },
    ],
    after:
      "Two tasks sat blocked for three days before anyone said. Nobody missed the ritual itself.",
    stone: null,
  },
];

/**
 * What an empty sheet draws before a word is typed: the gate Chesterton had
 * in mind, across a lane, with two guesses at what it is for and nothing
 * found yet. Nothing is kept until the reader writes over it and sets it down.
 */
export const EXAMPLE_FENCE: Fence = {
  slug: "",
  put: "",
  touched: "",
  fence: "The gate across the lane to the top field.",
  cost: "Out of the car to open it, and out again to shut it, twice a day.",
  maker: "unknown",
  by: "",
  when: "before we came",
  uses: [
    {
      id: "u1",
      text: "To keep the sheep off the lane.",
      known: "guess",
      holds: "",
      instead: "",
      by: "you",
      kept: true,
    },
    {
      id: "u2",
      text: "To mark where the right of way ends.",
      known: "guess",
      holds: "",
      instead: "",
      by: "you",
      kept: true,
    },
  ],
  through: [
    { id: "t1", text: "Sheep on the lane.", came: "" },
    { id: "t2", text: "Walkers in the top field.", came: "" },
  ],
  back: "cost",
  backHow: "A new gate and two posts, and a day to hang it.",
  calls: [],
  after: "",
  stone: null,
};
