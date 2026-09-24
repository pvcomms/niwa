import type { Way } from "../lib/way.ts";

/**
 * Specimen A's way — the year away the synthetic life keeps postponing —
 * written to show the instrument on a deployed garden, which has no ways to
 * read. Fiction, like the rest of the specimen.
 */
export const SPECIMEN_WAY: Way = {
  slug: "2026-09-19-a-year-away",
  title: "A year away, somewhere I can't drive",
  then: "2028-03",
  status: "open",
  steps: [
    {
      id: "sa1",
      text: "The sublet on the flat is signed and the piano is in storage",
      day: "2027-02",
      dir: "back",
      by: "you",
      kept: true,
      entry: null,
    },
    {
      id: "sa2",
      text: "The two retainers are told, in writing, that I am away from March",
      day: "2026-12",
      dir: "back",
      by: "you",
      kept: true,
      entry: null,
    },
    {
      id: "sa3",
      text: "Pick the town — the one with the harbour, not the one with the airport",
      day: "2026-10",
      dir: "forward",
      by: "you",
      kept: true,
      entry: null,
    },
    {
      id: "sa4",
      text: "Tell my father the month, on a Sunday, before I tell anyone else",
      day: "2026-11",
      dir: "forward",
      by: "proposed",
      kept: false,
      entry: null,
    },
  ],
  obstacles: [
    {
      id: "oa1",
      text: "I keep moving the month",
      plan: "when I catch myself moving it, I book the ferry for the month it was",
      by: "you",
      kept: true,
    },
    {
      id: "oa2",
      text: "The inbox on holidays",
      plan: "when I reach for it, I play the C major scale instead, badly",
      by: "proposed",
      kept: false,
    },
  ],
  changes: [
    {
      id: "ca1",
      text: "Mornings are for the piano, not the inbox",
      lane: "taste",
      by: "you",
      kept: true,
    },
    {
      id: "ca2",
      text: "Sundays with my father are a standing thing",
      lane: "family",
      by: "proposed",
      kept: false,
    },
  ],
  thenText:
    "I live for a year in a town I can't drive around, by a harbour. I play the piano in the mornings, badly, and nobody minds. The work inbox has been closed for eleven months and the two retainers survived it. My father and I talk on Sundays; he asks about the piano.",
  nowText:
    "I'm freelance, mostly at the desk in the flat. The flat is quiet. I keep moving the month for the year away. I still check the inbox on holidays. I talk to my father when something is wrong, and not otherwise.",
  colour: "",
  recorded: "2026-09-19",
  touched: "2026-09-19",
};
