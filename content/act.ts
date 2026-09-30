import { addDays } from "../lib/fence.ts";
import type { Act, Step } from "../lib/act.ts";

const step = (s: Partial<Step> & Pick<Step, "id" | "day" | "will">): Step => ({
  when: "",
  where: "",
  minutes: null,
  moved: [],
  did: "",
  on: "",
  lived: "",
  felt: "",
  met: false,
  ...s,
});

/**
 * Specimen A's intentions — two from the studio in the synthetic life, each
 * following something already on its record. The first comes from the
 * envelope about the Friday file check: move the check to Thursday and keep
 * it; three steps done, one still to come. The second comes from the claim
 * about the quiet junior: hand her the Aldgate account from October. Fiction,
 * like the rest of the specimen; a deployed garden has no intentions to read
 * and shows these.
 */
export const SPECIMEN_ACTS: Act[] = [
  {
    slug: "2026-09-12-move-the-friday-file-check-to-thursday-afternoons-and-keep-it",
    put: "2026-09-12",
    touched: "2026-09-25",
    intention:
      "Move the Friday file check to Thursday afternoons, and keep it.",
    outcome:
      "Fridays free for the week's last sends, and nothing half-finished going out.",
    obstacle:
      "I like to see everything myself before it leaves, and Thursday feels too early to let go of it.",
    then: "If I catch myself holding a file back for Friday, I will send it with a note of what is still open.",
    steps: [
      step({
        id: "s1",
        day: "2026-09-14",
        when: "I get in on Monday",
        will: "tell Marta the check moves to Thursday",
        where: "the studio",
        minutes: 10,
        did: "done",
        on: "2026-09-14",
        felt: "easier",
        lived: "She had been meaning to suggest it herself.",
      }),
      step({
        id: "s2",
        day: "2026-09-17",
        when: "the Thursday review ends",
        will: "run the file check with Tom",
        where: "the back table",
        minutes: 30,
        did: "done",
        on: "2026-09-17",
        felt: "harder",
        met: true,
        lived:
          "Fifty minutes, not thirty. Two files were still open and I wanted to leave them for Friday.",
      }),
      step({
        id: "s3",
        day: "2026-09-24",
        when: "the Thursday review ends",
        will: "run it again, and time it",
        minutes: 30,
        did: "done",
        on: "2026-09-25",
        felt: "same",
        lived:
          "A day late. Thirty-five minutes, and Friday was clear for the first time in a month.",
      }),
      step({
        id: "s4",
        day: "2026-10-01",
        when: "the month turns",
        will: "ask Tom whether anything slipped through",
        minutes: 10,
      }),
    ],
    after: {
      meant: "The check on Thursday, and Friday for sending.",
      happened:
        "It moved. The first Thursday ran long; the second was a day late and nearly on time.",
      difference:
        "Telling Marta first. Once she had said yes it was her plan too.",
      keep: "Timing the check.",
    },
    from: {
      kind: "botec",
      id: "2026-09-10-what-does-the-friday-file-check-save-us-for-every-pound-it-costs",
      label:
        "What does the Friday file check save us, for every pound it costs?",
      url: "/botec?slug=2026-09-10-what-does-the-friday-file-check-save-us-for-every-pound-it-costs",
    },
  },
  {
    slug: "2026-09-26-give-the-quiet-junior-the-aldgate-account-from-october",
    put: "2026-09-26",
    touched: "2026-09-28",
    intention:
      "Give the quiet junior the Aldgate account from October, with a week of overlap.",
    outcome:
      "She runs a client of her own, and I stop being the bottleneck on the small accounts.",
    obstacle:
      "I will want to take the call over the first time the client pushes back, the way I did with the fee.",
    then: "If I start to speak on the call, I will write the thought down and tell her afterwards.",
    steps: [
      step({
        id: "s1",
        day: "2026-09-28",
        when: "she is back from the shoot",
        will: "ask what she would need to run Aldgate",
        where: "over lunch",
        minutes: 30,
        did: "done",
        on: "2026-09-28",
        felt: "easier",
        lived:
          "She had a list already. Half of it was things I would have forgotten.",
      }),
      step({
        id: "s2",
        day: "2026-10-01",
        moved: ["2026-09-30"],
        when: "the October plan is drafted",
        will: "put her name on Aldgate",
        minutes: 10,
      }),
      step({
        id: "s3",
        day: "2026-10-06",
        when: "the first Aldgate call is booked",
        will: "sit in and say nothing",
        where: "the call",
        minutes: 45,
      }),
    ],
    after: { meant: "", happened: "", difference: "", keep: "" },
    from: {
      kind: "muster",
      id: "2026-09-14-the-quiet-junior-is-ready-to-run-a-client-account-on-her-own",
      label: "The quiet junior is ready to run a client account on her own.",
      url: "/muster?slug=2026-09-14-the-quiet-junior-is-ready-to-run-a-client-account-on-her-own",
    },
  },
];

/**
 * What an empty sheet draws before a word is typed, set from today: running
 * again, the way mental contrasting is usually taught — the first step small
 * enough to do tonight. Nothing is kept until the reader writes over it and
 * sets it down.
 */
export function exampleAct(today: string): Act {
  return {
    slug: "",
    put: today,
    touched: today,
    intention: "Start running again, twice a week.",
    outcome: "To feel my legs again, and sleep through the night.",
    obstacle: "I will tell myself I am too tired after work.",
    then: "If I feel too tired, I will put my shoes on and walk to the end of the road.",
    steps: [
      step({
        id: "s1",
        day: today,
        when: "I get home tonight",
        will: "put my running shoes by the door",
        where: "the hall",
        minutes: 2,
      }),
      step({
        id: "s2",
        day: addDays(today, 1),
        when: "the alarm goes tomorrow",
        will: "run to the end of the road and back",
        where: "the front step",
        minutes: 10,
      }),
      step({
        id: "s3",
        day: addDays(today, 4),
        when: "I have had my coffee on Saturday",
        will: "run for twenty minutes, slowly",
        where: "the park",
        minutes: 20,
      }),
    ],
    after: { meant: "", happened: "", difference: "", keep: "" },
    from: null,
  };
}
