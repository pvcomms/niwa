import type { Step } from "../lib/overview.ts";

/**
 * Specimen A's steps — two from the synthetic life's year away. The first is
 * the move its way left proposed and never kept: telling the father the
 * month. Put down, let go for today twice, still open. The second, the
 * letter to the two retainers, was taken, and what was said before sits
 * beside what it was after. Fiction, like the rest of the specimen; a
 * deployed garden has no steps to read and shows these.
 */
export const SPECIMEN_STEPS: Step[] = [
  {
    slug: "2026-09-19-tell-my-father-the-month-on-a-sunday-before-i-tell-anyon",
    step: "Tell my father the month, on a Sunday, before I tell anyone else.",
    hurt: 8,
    lasts: 45,
    life: "I live for a year in the town with the harbour. I walk to the ferry in the mornings and practise in the afternoons, on a piano that came with the flat. My father has been out once; we walked the breakwater and he talked about his own year in Bremen.",
    who: "I am someone who goes.",
    horizon: 2,
    marks: [
      { when: "a week", level: 1, line: "He has had a week with it." },
      { when: "a month", level: 3, line: "" },
      { when: "a year", level: 7, line: "I am there." },
      { when: "two years", level: 8, line: "" },
    ],
    without: -2,
    withoutLine: "Still meaning to go. The month moves again.",
    put: "2026-09-19",
    touched: "2026-09-27",
    took: null,
    done: null,
    felt: null,
    feltLasts: null,
    after: "",
    notToday: [
      { on: "2026-09-20", why: "He sounded tired on Saturday." },
      { on: "2026-09-27", why: "" },
    ],
    stone: null,
  },
  {
    slug: "2026-09-21-write-to-the-two-retainers-that-i-am-away-from-march",
    step: "Write to the two retainers that I am away from March.",
    hurt: 6,
    lasts: 120,
    life: "The work that comes with me is the work I chose. March is clear. Both of them planned around it, and one asked for a proposal for when I am back.",
    who: "I am someone who says the month out loud.",
    horizon: 1,
    marks: [
      { when: "a week", level: 2, line: "Both have answered." },
      { when: "a month", level: 3, line: "" },
      { when: "a year", level: 6, line: "" },
    ],
    without: 0,
    withoutLine: "",
    put: "2026-09-21",
    touched: "2026-09-23",
    took: "2026-09-23T10:05+02:00",
    done: "2026-09-23T10:31+02:00",
    felt: 3,
    feltLasts: 26,
    after:
      "Both answered by lunch. One of them said they had wondered when I would.",
    notToday: [],
    stone: null,
  },
];

/**
 * The step the sheet shows before the reader has put one down, so the
 * instrument is on the table before a word is typed. Nothing is kept until
 * the reader writes their own over it.
 */
export const EXAMPLE_STEP: Step = {
  slug: "",
  step: "Send the email to the person whose work I admire, asking for twenty minutes.",
  hurt: 7,
  lasts: 30,
  life: "I have someone to ask. We talk every few months, and the second conversation was easier than the first. The work I make now has one reader who knows the field better than I do, and says so.",
  who: "I am someone who asks.",
  horizon: 5,
  marks: [
    {
      when: "a week",
      level: 1,
      line: "It is sent. The reply came, or it did not.",
    },
    { when: "a month", level: 2, line: "" },
    { when: "a year", level: 5, line: "" },
    { when: "five years", level: 7, line: "" },
  ],
  without: 0,
  withoutLine: "",
  put: "",
  touched: "",
  took: null,
  done: null,
  felt: null,
  feltLasts: null,
  after: "",
  notToday: [],
  stone: null,
};
