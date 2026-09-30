import type { Canon, How, Kept } from "../lib/canon.ts";

/**
 * Specimen A's canon — two strands from the synthetic life. The first grew
 * from a note about what leaves the studio, was read as one story that
 * moved, and was kept in the canon with three touchpoints. The second grew
 * from the year by the harbour and was left out: more than one story, the
 * reader said, and wrote which. Fiction, like the rest of the specimen; a
 * deployed garden has no strands to read and shows these.
 */
const k = (
  id: string,
  label: string,
  how: How,
  day: string | null,
  extra: Partial<Kept> = {},
): Kept => ({ id, label, how, day, approx: false, touch: false, out: false, ...extra });

export const SPECIMEN_CANON: Canon[] = [
  {
    slug: "2026-09-21-what-leaves-the-studio",
    put: "2026-09-21",
    touched: "2026-09-26",
    name: "What leaves the studio",
    root: {
      id: "note:what-leaves-the-studio",
      label: "What leaves the studio",
      kind: "note",
      day: "2025-11-03",
      approx: false,
    },
    members: [
      k("note:the-wrong-drafts", "The week the wrong drafts went out", "links", "2025-11-10", { touch: true }),
      k("note:marta-on-checks", "Marta on checks", "links", "2025-12-02"),
      k("note:the-friday-file-check", "The Friday file check", "links", "2026-01-15", { touch: true }),
      k("note:juniors-see-everything", "Juniors see everything", "names", "2026-02-20"),
      k("note:send-on-tuesday", "Send it on the Tuesday", "links", "2026-06-04", { touch: true }),
      k("note:the-client-who-never-opens-pdfs", "The client who never opens PDFs", "names", "2026-07-11", { out: true }),
      k("concept:review", "Review", "term", "2025-10-28"),
      k("note:two-pairs-of-eyes", "Two pairs of eyes", "kin", "2026-03-08"),
      k("note:what-a-proof-is-for", "What a proof is for", "kin", "2026-08-19"),
    ],
    one: "one",
    moved: "moved",
    use: "use",
    oneNote: "Every one of them is about the gap between done and sent.",
    movedNote: "It starts as a rule after the wrong drafts and ends as a habit that does not need a day.",
    useNote: "To the juniors, when they ask why we check at all.",
    story:
      "A mistake made a rule; the rule outlived the mistake; the check stayed and the wait went. The studio still looks twice at what leaves, but it looks on the day the work is ready.",
    call: "in",
    called: "2026-09-26",
    threads: 7,
    builds: ["studio-checklist"],
  },
  {
    slug: "2026-09-24-the-year-by-the-harbour",
    put: "2026-09-24",
    touched: "2026-09-24",
    name: "The year by the harbour",
    root: {
      id: "note:the-year-by-the-harbour",
      label: "The year by the harbour",
      kind: "note",
      day: "2026-04-02",
      approx: false,
    },
    members: [
      k("note:the-ferry-in-the-mornings", "The ferry in the mornings", "links", "2026-04-20", { touch: true }),
      k("note:a-piano-that-came-with-the-flat", "A piano that came with the flat", "links", "2026-05-03"),
      k("note:telling-my-father", "Telling my father the month", "names", "2026-05-17", { touch: true }),
      k("note:the-two-retainers", "The two retainers", "names", "2026-06-01"),
      k("note:bremen", "His year in Bremen", "kin", "2026-06-22"),
      k("note:money-for-a-year", "Money for a year", "kin", null),
    ],
    one: "many",
    moved: "unsure",
    use: "notyet",
    oneNote: "Two stories: the practice, and the father. The retainers belong to neither.",
    movedNote: "",
    useNote: "",
    story: "",
    call: "out",
    called: "2026-09-24",
    threads: 3,
    builds: [],
  },
];

/** The line under the name, and the questions as the sheet asks them. */
export const CANON_WORDS = {
  blurb:
    "Which stories the garden actually tells. A stone many others reach for, what gathers round it, and whether it is one story.",
  one: "Is it one story?",
  moved: "Did the idea move along it?",
  use: "Is it of use — to you, or to anyone?",
  story: "what the story is, in your words — the thing a newcomer would need to hear",
  specimen:
    "A deployed garden has no stones to read. These are Specimen A's two strands, read-only.",
};

/** What the canon holds to, said on its desk. */
export const CANON_HOLDS = [
  "The order of the roots is a count of who reaches for each, not how much it matters.",
  "Kin by words is a likeness of vocabulary, shown with the words it rests on. It is not a claim that two notes say the same thing.",
  "A touchpoint the garden offers is drawn dashed, with why it was offered, and is nothing until you keep it.",
  "Whether a strand is one story, whether it moved, whether it is of use, and whether it belongs in the canon are yours to say. Nothing here says them for you.",
];
