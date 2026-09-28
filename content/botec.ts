import type { Botec, Line, Op } from "../lib/botec.ts";

let k = 0;
/** A line for the pages below: an op, a label, a number, and its own lines. */
const l = (op: Op, label: string, value: string, lines: Line[] = []): Line => ({
  key: `s${++k}`,
  op,
  label,
  value: lines.length ? "=" : value,
  lines,
});

/**
 * Specimen A's envelopes — two from the studio in the synthetic life. The
 * first was worked out beside the fence about the Friday file check: what it
 * saves for every pound it costs, with a line across the answer at one. The
 * second was an estimate of a month's hours on the Harlow account, looked up
 * afterwards. Fiction, like the rest of the specimen; a deployed garden has no
 * envelopes to read and shows these.
 */
export const SPECIMEN_BOTECS: Botec[] = [
  {
    slug: "2026-09-10-what-does-the-friday-file-check-save-us-for-every-pound-it-costs",
    put: "2026-09-10",
    touched: "2026-09-10",
    question:
      "What does the Friday file check save us, for every pound it costs?",
    unit: "per pound",
    lines: [
      l(
        "×",
        "chance a wrong file goes out in a year, without it",
        "1 in 12 to 1 in 3",
      ),
      l("×", "what that would cost us", "£5k to £40k"),
      l("÷", "what the check costs a year", "", [
        l("×", "people at the check", "2"),
        l("×", "hours each, each Friday", "0.5"),
        l("×", "Fridays a year", "44 to 48"),
        l("×", "what an hour of ours is worth", "£40 to £70"),
      ]),
    ],
    line: 1,
    lineName: "it pays for itself",
    came: null,
    cameOn: "",
    after: "",
    view: "/fence",
    url: "/fence?slug=2026-09-08-the-friday-file-check-before-anything-goes-to-a-client",
    about: {
      kind: "fence",
      id: "2026-09-08-the-friday-file-check-before-anything-goes-to-a-client",
      label: "The Friday file check before anything goes to a client.",
    },
  },
  {
    slug: "2026-08-03-how-many-hours-a-month-will-the-harlow-account-take",
    put: "2026-08-03",
    touched: "2026-09-01",
    question: "How many hours a month will the Harlow account take?",
    unit: "hours",
    lines: [
      l("×", "jobs a month", "2 to 3"),
      l("×", "rounds on each", "2 to 3"),
      l("×", "hours a round", "5 to 8"),
      l("+", "calls and email, in hours", "4 to 8"),
    ],
    line: null,
    lineName: "",
    came: 64,
    cameOn: "2026-09-01",
    after:
      "It came to 64 in August. Two rounds became four on the launch film, and I never counted the calls.",
    view: "/catalogue",
    url: "/catalogue",
    about: null,
  },
];

/**
 * What an empty sheet draws before a word is typed: Enrico Fermi's question to
 * his students, how many piano tuners work in Chicago, broken down the way it
 * is usually told. Nothing is kept until the reader writes over it and keeps it.
 */
export const EXAMPLE_BOTEC: Botec = {
  slug: "",
  put: "",
  touched: "",
  question: "How many piano tuners work in Chicago?",
  unit: "tuners",
  lines: [
    l("×", "people in Chicago", "2.5M to 3M"),
    l("÷", "people to a household", "2 to 3"),
    l("×", "households with a piano", "1 in 20 to 1 in 5"),
    l("×", "tunings a piano gets a year", "0.5 to 1"),
    l("÷", "tunings one tuner does a year", "", [
      l("×", "tunings a day", "2 to 4"),
      l("×", "working days a year", "200 to 250"),
    ]),
  ],
  line: null,
  lineName: "",
  came: null,
  cameOn: "",
  after: "",
  view: "",
  url: "",
  about: null,
};
