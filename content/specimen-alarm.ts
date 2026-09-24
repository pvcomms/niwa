import type { Circuit, Pathway } from "../lib/alarm.ts";

/**
 * Specimen A's circuit: what the synthetic life from the chronology's
 * specimen might have named about itself — triggers, defences, brakes, and
 * a day's load — with two pathways marked against it. Fiction, written to
 * exercise every mechanic. It is what a deployed garden draws, since a server
 * has no reader to read, and what the desk can show a reader who has named
 * nothing yet. Nothing here is anyone's nervous system.
 */
export const SPECIMEN_CIRCUIT: Circuit = {
  triggers: [
    {
      id: "being-watched-while-working",
      label: "Being watched while working",
      charge: 3,
      pulls: ["over-preparing", "going-quiet"],
      signs: "shoulders up, breath high in the chest",
      note: "Since the open-plan job. I can feel a gaze on the back of my neck before I see it.",
    },
    {
      id: "unanswered-messages",
      label: "Unanswered messages",
      charge: 2,
      pulls: ["checking"],
      signs: "a hollow under the ribs",
      note: "",
    },
    {
      id: "raised-voices",
      label: "Raised voices",
      charge: 3,
      pulls: ["going-quiet", "keeping-the-peace"],
      signs: "everything goes very still and very clear",
      note: "The back of his head, again.",
    },
    {
      id: "a-room-i-cant-leave",
      label: "A room I can't leave",
      charge: 2,
      pulls: ["sarcasm"],
      signs: "counting the exits",
      note: "",
    },
  ],
  defences: [
    {
      id: "over-preparing",
      label: "Over-preparing",
      reflex: "flight",
      cost: "the evening before, every time",
      note: "",
    },
    {
      id: "going-quiet",
      label: "Going quiet",
      reflex: "freeze",
      cost: "people read it as agreement",
      note: "",
    },
    {
      id: "keeping-the-peace",
      label: "Agreeing to keep the peace",
      reflex: "fawn",
      cost: "I find out what I wanted a week later",
      note: "",
    },
    {
      id: "sarcasm",
      label: "Sarcasm",
      reflex: "fight",
      cost: "it lands on the wrong person",
      note: "",
    },
    {
      id: "checking",
      label: "Checking the phone",
      reflex: "flight",
      cost: "an hour, in pieces",
      note: "",
    },
  ],
  brakes: [
    {
      id: "long-exhale",
      label: "A long exhale",
      reach: "seconds",
      note: "Four in, eight out. Works when I remember it exists.",
    },
    { id: "a-walk", label: "A walk", reach: "hours", note: "" },
    {
      id: "telling-one-person",
      label: "Telling one person",
      reach: "hours",
      note: "",
    },
    { id: "sleep", label: "Sleep", reach: "days", note: "" },
    { id: "the-piano", label: "The piano, badly", reach: "hours", note: "" },
  ],
  load: { sleep: 35, stress: 40, caffeine: 25, tone: 50 },
  loadDay: "2026-09-19",
};

export const SPECIMEN_PATHWAYS: Pathway[] = [
  {
    slug: "take-the-job-with-the-open-plan-office",
    title: "Take the job with the open-plan office",
    put: "Better money, a team I like, and a desk in the middle of forty people with a manager who walks the floor.",
    touches: {
      "being-watched-while-working": 3,
      "raised-voices": 1,
      "a-room-i-cant-leave": 1,
    },
    brakes: ["a-walk", "long-exhale"],
    expects: ["over-preparing", "going-quiet"],
    stones: [],
    asked: "2026-09-12",
    went: "vigilant",
    wentDay: "2026-09-19",
    note: "Three weeks in: the exhale works for about a minute. I have started arriving at seven to have the room to myself.",
  },
  {
    slug: "a-month-at-the-coast",
    title: "A month at the coast, working half days",
    put: "The flat sublet, the work done by lunch, the phone in a drawer after that.",
    touches: { "unanswered-messages": 1 },
    brakes: ["sleep", "a-walk", "the-piano"],
    expects: [],
    stones: [],
    asked: "2026-09-14",
    went: "calm",
    wentDay: "2026-09-19",
    note: "",
  },
  {
    slug: "ask-my-father-about-the-job-loss",
    title: "Ask my father about the job loss",
    put: "At his kitchen table, with the letter I found.",
    touches: { "raised-voices": 2, "a-room-i-cant-leave": 2 },
    brakes: ["telling-one-person", "long-exhale"],
    expects: ["going-quiet", "keeping-the-peace"],
    stones: [],
    asked: "2026-09-18",
    went: null,
    wentDay: null,
    note: "Not walked yet.",
  },
];
