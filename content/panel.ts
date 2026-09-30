import type { MarkerKey } from "../lib/panel.ts";

/**
 * Every word of the panel. The method is the Community Archive's measure of
 * serendipity (Epistemic Garden, "how to measure serendipity online", lab
 * notes #5, 2026): markers rather than a KPI, relationships beside volume,
 * pairs that reply both ways, and the same count with the ten largest
 * accounts taken out. Here the accounts are stones and a reply is a thread.
 */

export type MarkerWords = {
  name: string;
  /** How it is counted, in a sentence. */
  how: string;
  /** What the count cannot see. */
  cannot: string;
};

export const MARKER_WORDS: Record<MarkerKey, MarkerWords> = {
  stones: {
    name: "stones",
    how: "Every note, page, term and memory with words in it, from the day its file first appears in the record.",
    cannot:
      "When a thought began. A file reaches the record when it is committed, and an import plants a year of pages on one day.",
  },
  threads: {
    name: "threads",
    how: "Links, names in prose, shared terms and twins between two stones, each dated by the later of its two ends.",
    cannot:
      "When a thread was written. A link added to an old note today is dated by the note, so this is the earliest a thread could have been drawn.",
  },
  per: {
    name: "threads per stone",
    how: "The threads divided by the stones: whether what joins the garden grows faster than what is in it.",
    cannot:
      "Which threads carry weight. A page that names everything counts as many times as it names.",
  },
  both: {
    name: "written both ways",
    how: "Pairs in which each stone links to or names the other in its own words. The nearest thing the garden has to two people answering each other.",
    cannot:
      "What a term shares with a note. A glossary term cannot name a note back, so vocabulary is counted on its own line.",
  },
  vocab: {
    name: "in the vocabulary",
    how: "Of the stones that are not terms, how many use at least one term of the glossary.",
    cannot:
      "Whether a stone with no term is about something the glossary does not cover, or the same thing worded another way.",
  },
  alone: {
    name: "alone",
    how: "Of the stones, how many have no thread to another stone, a repo or an unwritten idea. The index that lists every memory is not counted as a thread.",
    cannot:
      "Why. A stone alone may be finished, new, or set aside, and the count is the same.",
  },
  tended: {
    name: "tended in the month",
    how: "Of the stones, how many had their file changed in the thirty days up to that week.",
    cannot:
      "What changed. A comma counts the same as a rewrite, and a file changed and not yet committed is not in the record.",
  },
  unplanted: {
    name: "unplanted",
    how: "Ideas linked to and never written, from the first day a stone linked them.",
    cannot:
      "Ideas once unplanted and since written. A written idea leaves no trace of having waited, so the past of this line is always low.",
  },
};

export const NAMES = Object.fromEntries(
  Object.entries(MARKER_WORDS).map(([k, w]) => [k, w.name]),
) as Record<MarkerKey, string>;

export const LEAD = [
  "Eight markers, each read week by week, each on its own line. None of them is added to another, and none has a direction it is meant to go.",
  "The method is borrowed from a lab that measured an online community without a single number to push up: count the relationships beside the volume, count the pairs that answer each other, then count again with the largest hubs taken out to see whether a jump belongs to the whole or to a few.",
];

export const CHECKS = {
  hubs: {
    label: "leave out the ten most threaded",
    note: "The ten stones with the most threads today, and every thread they hold, taken out of every week.",
  },
  bulk: {
    label: "leave out what was planted in bulk",
    note: "Every stone that first appears on a day when twenty or more did, taken out of every week.",
  },
};

export const DATING = {
  record:
    "Dated from git: a stone by the first commit that holds its file, a change by every commit that touches it. A stone not yet committed is dated by its last change on disk.",
  "last change":
    "On the public garden there is no record to read, so each stone is dated by its last change. The lines here show when things were last touched, not when they arrived.",
};

export const LEAVES =
  "Read the lines against each other, not against a target. If the threads rise with the stones, the garden is joining what it gathers; if a line moves only when a day of planting is left in, the move belongs to that day. What any of it asks of you is yours to say.";

export const LINEAGE =
  "After the Community Archive's measure of serendipity: bidirectional replies, replies above a threshold, and the jump after a gathering checked again without the ten largest accounts (Epistemic Garden, lab notes #5).";
