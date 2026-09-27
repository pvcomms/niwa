import type { Moment } from "../lib/break.ts";

/**
 * The workbook's practices, offered as cards: what each is and how it goes,
 * in a sentence or two. The three the sheet holds — the break, the hand,
 * the friend — are marked as such; the rest are for the reader to do on
 * their own, or on the wish. After Kristin Neff and Chris Germer, The
 * Mindful Self-Compassion Workbook, and the eight-week course their Center
 * for Mindful Self-Compassion runs.
 */
export type Exercise = {
  name: string;
  how: string;
  here: "break" | "hand" | "friend" | "letter" | "wish" | null;
};

export const EXERCISES: Exercise[] = [
  {
    name: "the self-compassion break",
    how: "In a moment that hurts, say three things: that it hurts, that others feel this too, and something kind. In your own words, and out loud if you can.",
    here: "break",
  },
  {
    name: "soothing touch",
    how: "A hand on the heart, both hands on the chest, a hand on the cheek, one hand holding the other, arms around yourself. The body reads it before the mind does.",
    here: "hand",
  },
  {
    name: "how would I treat a friend?",
    how: "Write what you would say to a friend in exactly your spot. Then write what you are saying to yourself. Read the two side by side.",
    here: "friend",
  },
  {
    name: "the compassionate letter",
    how: "Write to yourself from the point of view of someone who loves you as you are, who knows your history and your struggles, and who is not trying to fix you.",
    here: "letter",
  },
  {
    name: "affectionate breathing",
    how: "Sit and let the breath find its own rhythm. Let each breath be a kindness you are receiving, then one you are giving.",
    here: "wish",
  },
  {
    name: "soften, soothe, allow",
    how: "Find where the feeling sits in the body. Soften around it. Soothe yourself for having it. Allow it to be there, as it is, for now.",
    here: null,
  },
  {
    name: "the compassionate voice",
    how: "Hear what the critic says, and what it is trying to protect. Then let another voice answer, one that wants the same thing for you and says it kindly.",
    here: null,
  },
  {
    name: "living deeply",
    how: "Name what you most want your life to be about. Ask where you are already living it, and what stands in the way, and treat the obstacle with compassion.",
    here: null,
  },
];

/**
 * Specimen A's breaks — two moments from the synthetic life, the first with
 * only the three, the second with the friend's version and afterwards.
 * Fiction, like the rest of the specimen; a deployed garden has no
 * moments to read and shows these.
 */
export const SPECIMEN_MOMENTS: Moment[] = [
  {
    slug: "2026-09-24-2210",
    at: "2026-09-24T22:10+02:00",
    what: "Sent the wrong file to the client and only saw it two hours later.",
    three: {
      notice: "This is a moment of suffering.",
      shared: "Everyone has sent the wrong file.",
      kind: "May I be kind to myself.",
    },
    touch: "heart",
    need: "",
    hardest: "kind",
    toSelf: "",
    toFriend: "",
    letter: "",
    after: "",
    stone: null,
  },
  {
    slug: "2026-09-26-0740",
    at: "2026-09-26T07:40+02:00",
    what: "Woke up already behind. The list from yesterday, untouched.",
    three: {
      notice: "This is stress.",
      shared: "Anyone in this spot would feel this.",
      kind: "May I give myself what I need.",
    },
    touch: "both",
    need: "That the list is not a verdict.",
    hardest: "shared",
    toSelf:
      "You're so lazy. You always do this. You should have started last night and now the whole day is a mess.",
    toFriend:
      "Of course you're tired, you were up late with the client thing. The list is just a list. Start with one thing and see how it goes; anyone would need a slow morning after yesterday.",
    letter: "",
    after: "Did one thing. The day was not a mess.",
    stone: null,
  },
];
