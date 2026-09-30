import type { Trace } from "../lib/half-second.ts";

/**
 * Specimen A's traces — two runs of the synthetic feed by the synthetic
 * life. The first is a night in the harbour town: opened on the hail,
 * carried through the outrage seed and the round-closing card, put down at
 * ninety seconds with what she would say beside it. The second is a
 * morning with the phone on the piano: six cards, the hail let go, put down
 * before a meter moved much. Fiction, like the rest of the specimen; a
 * deployed garden has no traces to read and shows these.
 */
export const SPECIMEN_TRACES: Trace[] = [
  {
    slug: "2026-09-21-2340",
    at: "2026-09-21T23:40:12+02:00",
    preset: "whatsapp",
    norm: "income",
    vocab: "coarse",
    events: [
      { kind: "hail", at: 1400 },
      { kind: "tap", at: 1400, card: "c1", n: 1 },
      { kind: "glance", at: 3900, card: "c1", ms: 2100 },
      { kind: "dwell", at: 11200, card: "c3", ms: 7100 },
      { kind: "tap", at: 9800, card: "c3", n: 1 },
      { kind: "skip", at: 11900, card: "c4", ms: 600 },
      { kind: "dwell", at: 18400, card: "c2", ms: 6400 },
      { kind: "tap", at: 15100, card: "c2", n: 1 },
      { kind: "skip", at: 19100, card: "c5", ms: 650 },
      { kind: "pull", at: 21000 },
      { kind: "pull", at: 24200 },
      { kind: "pull", at: 27900 },
      { kind: "reward", at: 28800 },
      { kind: "dwell", at: 33400, card: "g", ms: 4500 },
      { kind: "glance", at: 35200, card: "c11", ms: 1700 },
      { kind: "dwell", at: 41600, card: "c11", ms: 5900 },
      { kind: "skip", at: 42300, card: "c10", ms: 500 },
      { kind: "down", at: 44000 },
    ],
    meters: { standing: 31.4, threat: 46.8, agency: 62 },
    weights: { threat: 0.57, comparison: 0.45, hail: 0.37, reward: 0.33 },
    peak: 0.87,
    peaks: {
      hr: 79.4,
      eda: 3.61,
      pupil: 4.1,
      breath: 16.2,
      neck: 19.5,
      ant: 0.82,
    },
    say: "I was checking whether he had written back about the month. Then the thing about the panel came up and I wanted to see who was saying it.",
    after:
      "The hail was not him; it was two people from the old office and a stranger. I read the panel piece twice and it was the same piece both times. The card about the round is what I was still thinking about when I put it down, and I had not tapped it on purpose.",
    stone: null,
  },
  {
    slug: "2026-09-27-0715",
    at: "2026-09-27T07:15:03+02:00",
    preset: "whatsapp",
    norm: "income",
    vocab: "granular",
    events: [
      { kind: "skip", at: 800, card: "c1", ms: 800 },
      { kind: "glance", at: 2700, card: "c2", ms: 1900 },
      { kind: "skip", at: 3400, card: "c3", ms: 700 },
      { kind: "dwell", at: 7800, card: "c4", ms: 4400 },
      { kind: "glance", at: 9600, card: "c5", ms: 1800 },
      { kind: "glance", at: 11500, card: "c6", ms: 1900 },
      { kind: "down", at: 12000 },
    ],
    meters: { standing: 47.8, threat: 12, agency: 73 },
    weights: { threat: 0.22, comparison: 0.25, hail: 0.22, reward: 0.25 },
    peak: 0.46,
    peaks: {
      hr: 68.1,
      eda: 2.72,
      pupil: 3.7,
      breath: 13.4,
      neck: 16.8,
      ant: 0.51,
    },
    say: "Nothing. I picked it up to check the time and put it on the piano.",
    after: "",
    stone: null,
  },
];
