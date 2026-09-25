import type { Claim } from "../lib/tack.ts";

/**
 * Specimen A's tack — the synthetic life with one belief in the sails and one
 * commitment in the hull. The belief came out of its mask (the office-days
 * rule): a claim it did not hold, put down low and tacked twice after asking.
 * The commitment is what the mask taught it, chosen for three months, no
 * evidence owed. Fiction, like the rest of the specimen; a deployed garden
 * has no claims to read and shows these.
 */
export const SPECIMEN_CLAIMS: Claim[] = [
  {
    slug: "2026-09-21-juniors-learn-more-in-the-office-than-at-home",
    title: "Juniors learn more in the office than at home",
    text: "Juniors learn more in the office than at home.",
    layer: "sail",
    flinch:
      "yes — I want to be moved on this; it came out of the mask and I had never asked",
    ifSo: "Ask three juniors what they learned last month and where. If it is so, most of it happened in the room: overheard, asked in passing, shown by someone who happened to be there.",
    ifNot:
      "The same three name things they learned from documents, calls and their own mistakes, and cannot place any of it in the office.",
    tacks: [
      {
        on: "2026-09-21",
        at: 35,
        saw: "First put. I argued against the office rule last week and did not believe this.",
        rent: "",
      },
      {
        on: "2026-09-23",
        at: 55,
        saw: "Asked two juniors. One named a corridor argument she learned from; the other said the office is where he gets interrupted.",
        rent: "neither",
      },
      {
        on: "2026-09-24",
        at: 60,
        saw: "The second one wrote later: the thing he learned most from this year was watching a senior handle a client in the room.",
        rent: "so",
      },
    ],
    looks: [
      {
        id: "sl1",
        text: "Ask the third junior — the one who started remote and has never had an office week.",
        moves: "either",
        by: "you",
        kept: true,
        looked: "",
        stone: null,
      },
      {
        id: "sl2",
        text: "Read last year's exit interviews: does anyone say they never learned how things are done here?",
        moves: "so",
        by: "proposed",
        kept: false,
        looked: "",
        stone: null,
      },
    ],
    why: "",
    chosen: "",
    until: "",
    letGo: "",
    reopened: [],
    stone: null,
    opened: "2026-09-21",
    touched: "2026-09-24",
    note: "",
  },
  {
    slug: "2026-09-23-i-ask-before-i-argue",
    title: "I ask before I argue",
    text: "I ask before I argue.",
    layer: "hull",
    flinch:
      "no — asking whether evidence could change this felt like a small betrayal",
    ifSo: "",
    ifNot: "",
    tacks: [],
    looks: [],
    why: "Not because it works. Because the person I argued with last week was a junior I had not asked, and I do not want to be that again whatever the numbers say.",
    chosen: "2026-09-23",
    until: "2026-12-23",
    letGo: "",
    reopened: [],
    stone: null,
    opened: "2026-09-23",
    touched: "2026-09-23",
    note: "",
  },
];
