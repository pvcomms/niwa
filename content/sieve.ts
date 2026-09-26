import type { Sieve } from "../lib/sieve.ts";

/**
 * Specimen A's sieve — the synthetic life with two questions on it. The
 * first is its own: the quiet junior from the mask and the tack, two worlds
 * weighed by its own count and sifted twice. The second is the one every
 * primer draws, kept because the numbers are the point: a world a hundredth
 * as wide can still pass most of itself. Fiction, like the rest of the
 * specimen; a deployed garden has no questions to read and shows these.
 */
export const SPECIMEN_SIEVES: Sieve[] = [
  {
    slug: "2026-09-22-is-the-quiet-junior-lost-or-quiet",
    title: "Is the quiet junior lost, or quiet",
    question:
      "The new junior says nothing at standup. Is he lost, or is he quiet by nature?",
    worlds: [
      { name: "lost", parts: 1 },
      { name: "quiet", parts: 3 },
    ],
    sightings: [
      {
        on: "2026-09-22",
        saw: "A whole week without a question, in the room or in the channel.",
        passes: [70, 40],
      },
      {
        on: "2026-09-24",
        saw: "His first change came in clean, with a note explaining a choice nobody had asked about.",
        passes: [15, 60],
      },
    ],
    stone: null,
    opened: "2026-09-22",
    touched: "2026-09-24",
    note: "",
  },
  {
    slug: "2026-09-20-someone-round-the-side-of-the-house",
    title: "Someone round the side of the house",
    question:
      "Someone is snooping round the side of the house at night. A robber, or someone honest looking for a cat?",
    worlds: [
      { name: "robber", parts: 1 },
      { name: "honest", parts: 100 },
    ],
    sightings: [
      {
        on: "2026-09-20",
        saw: "Snooping: along the fence with a torch, twice, without calling anything.",
        passes: [80, 10],
      },
    ],
    stone: null,
    opened: "2026-09-20",
    touched: "2026-09-20",
    note: "",
  },
];
