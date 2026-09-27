import { compose, heldBy, type Pod, type Sitting } from "../lib/wish.ts";

/**
 * The wishes, in the plainest words the practice has; the reader's own
 * `wishes.md` replaces them. Each is said after "May you be".
 */
export const DEFAULT_WISHES = ["safe", "well", "at ease", "happy"];

/**
 * Truths that hold for every being, said of each one held. Nothing here is
 * a belief about anyone in particular; that is the point of them. The
 * reader's own `truths.md` replaces them.
 */
export const DEFAULT_TRUTHS = [
  "Every being wants to be happy and does not want to suffer.",
  "Every being was once a small child.",
  "Every being has been afraid.",
  "Every being has lost someone or something they loved.",
  "Every being has been wrong, and gone on living.",
  "Every being is doing what makes sense from where they stand.",
  "Every being will die, and does not know when.",
  "Every being has been kind at least once, and been shown kindness at least once.",
  "Every being carries something no one else can see.",
  "Every being is more than the worst thing they have done.",
];

/** The six pods every practice begins with, you at the centre. Beings are the reader's to add. */
export const DEFAULT_PODS: Pod[] = [
  { slug: "you", name: "you", kind: "self", order: 0, beings: [] },
  {
    slug: "good-to-you",
    name: "someone who has been good to you",
    kind: "benefactor",
    order: 1,
    beings: [],
  },
  { slug: "a-friend", name: "a friend", kind: "friend", order: 2, beings: [] },
  {
    slug: "passed-by",
    name: "someone you pass without a thought",
    kind: "neutral",
    order: 3,
    beings: [],
  },
  {
    slug: "difficult",
    name: "someone you find difficult",
    kind: "difficult",
    order: 4,
    beings: [],
  },
  { slug: "everyone", name: "everyone", kind: "all", order: 5, beings: [] },
];

/**
 * Specimen A's practice — the synthetic life with its pods filled from the
 * people its other views name, two facts it kept, and two sittings. Fiction,
 * like the rest of the specimen; a deployed garden has no pods to read and
 * shows these.
 */
export const SPECIMEN_PODS: Pod[] = [
  DEFAULT_PODS[0],
  {
    ...DEFAULT_PODS[1],
    beings: [
      {
        name: "Nadia",
        note: "who taught you to ask before you argue",
        stone: null,
      },
    ],
  },
  {
    ...DEFAULT_PODS[2],
    beings: [
      { name: "Tomas", note: "who calls on Sundays", stone: null },
      {
        name: "the junior",
        note: "quiet at standup, clean on the first change",
        stone: null,
      },
    ],
  },
  {
    ...DEFAULT_PODS[3],
    beings: [{ name: "the man at the kiosk", note: "", stone: null }],
  },
  {
    ...DEFAULT_PODS[4],
    beings: [
      {
        name: "the client who shouted",
        note: "on the call in March",
        stone: null,
      },
    ],
  },
  DEFAULT_PODS[5],
];

export const SPECIMEN_FACTS = [
  "You value craft, candour, curiosity, care and quiet, by your own bearing.",
  "You hold to this, chosen 2026-09-23: I ask before I argue.",
  "You are hypersensitive to noise, and you are allowed to want quiet.",
];

const specimenSitting = (
  slug: string,
  on: string,
  minutes: number,
  pods: Pod[],
): Sitting => ({
  slug,
  on,
  minutes,
  pods: pods.map((p) => p.slug),
  held: heldBy(pods),
  wishes: DEFAULT_WISHES,
  truths: DEFAULT_TRUTHS,
  facts: SPECIMEN_FACTS,
  lines: compose({
    pods,
    wishes: DEFAULT_WISHES,
    truths: DEFAULT_TRUTHS,
    facts: SPECIMEN_FACTS,
    minutes,
    seed: slug,
  }),
  cues: [],
  voice: null,
  said: "",
});

export const SPECIMEN_SITTINGS: Sitting[] = [
  {
    ...specimenSitting("2026-09-25-0712", "2026-09-25", 12, SPECIMEN_PODS),
    said: "The client was harder than I expected and easier than last time.",
  },
  specimenSitting(
    "2026-09-23-0705",
    "2026-09-23",
    8,
    SPECIMEN_PODS.filter((p) => p.kind !== "difficult"),
  ),
];
