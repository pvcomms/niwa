import type { Mask } from "../lib/mask.ts";

/**
 * Specimen A's mask — the synthetic life writing the case for the office
 * rule it argued against, as the people who want it would put it, then
 * marking what it could and could not say. Fiction, like the rest of the
 * specimen; a deployed garden has no masks to read and shows this one.
 */
export const SPECIMEN_MASK: Mask = {
  slug: "2026-09-21-should-the-company-require-two-office-days",
  title: "Should the company require two office days a week",
  matter: "Should the company require two office days a week?",
  side: "against the requirement",
  other: "for the requirement",
  ownCase:
    "The work gets done. Nobody has shown me a number that says otherwise, and the people asking for office days are the people whose jobs are mostly meetings. What they want is to see us; what we want is to finish. A rule that costs everyone two commutes a week so that a few managers feel the room is not a rule about work.",
  otherCase:
    "We are not asking for this because we like the room. We are asking because the parts of the job that are hardest to see are the parts that have gone missing: the junior who learns by overhearing, the disagreement that gets settled in a corridor instead of festering in a thread, the sense that the person you are frustrated with is a person. Two days is not a lot. It is the least that keeps us a team rather than a set of contractors who share a payroll. We would rather have a clear rule than a quiet resentment about who shows up and who never does.",
  stand:
    "I still do not want the rule, and I still think the people asking for it have not counted the commute. But I could not write 'the junior who learns by overhearing' without meaning it, and I have not once asked a junior. Where I stand: against a blanket rule, for finding out what the juniors actually lose.",
  stone: null,
  opened: "2026-09-21",
  touched: "2026-09-23",
  marks: [
    { text: "We are not asking for this because we like the room.", mark: "could" },
    {
      text: "We are asking because the parts of the job that are hardest to see are the parts that have gone missing: the junior who learns by overhearing, the disagreement that gets settled in a corridor instead of festering in a thread, the sense that the person you are frustrated with is a person.",
      mark: "mean",
    },
    { text: "Two days is not a lot.", mark: "refuse" },
    { text: "It is the least that keeps us a team rather than a set of contractors who share a payroll.", mark: "could" },
    { text: "We would rather have a clear rule than a quiet resentment about who shows up and who never does.", mark: "mean" },
  ],
  tells: [
    {
      id: "sm1",
      quote: "because we like the room",
      kind: "sneer",
      instead: "We would not raise that at all; nobody on our side thinks it is about the room.",
      by: "proposed",
      kept: true,
    },
    {
      id: "sm2",
      quote: "who never does",
      kind: "absolute",
      instead: "who is rarely in — we are careful not to name anyone as never.",
      by: "proposed",
      kept: false,
    },
  ],
  missing: [
    {
      id: "sn1",
      text: "New people leave within a year at twice the rate they did when the office was full, and exit interviews say the same thing: they never felt they belonged to anything.",
      by: "proposed",
      kept: true,
    },
  ],
  note: "",
};
