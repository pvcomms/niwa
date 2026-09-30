import type { DoorKind, Pools } from "../lib/slice.ts";

/**
 * Every word of the slice. The people are invented and say so on the sheet.
 * Nothing in the wording of a first second names anyone's sex, colour, age,
 * accent, body or money: the five kinds are the ones the halo, similarity and
 * confidence literatures name, and each is something a room can be swayed by
 * without anyone deciding to be.
 */

export const DOOR_NAME: Record<DoorKind, string> = {
  entrance: "how they came in",
  voice: "how sure they sounded",
  likeness: "how much they were like you",
  record: "where they had come from",
  part: "whether they looked the part",
};

export const POOLS: Pools = {
  door: {
    entrance: {
      in: [
        "Walked in early, shook every hand and remembered two names.",
        "Arrived first, held the door and introduced themselves to the whole row.",
        "Came in early and had everyone’s name by the time the coffee was made.",
      ],
      out: [
        "Came in last and sat nearest the door.",
        "Arrived after the introductions had started and said little.",
        "Slipped in at the back and stayed by the wall.",
      ],
    },
    voice: {
      in: [
        "Spoke first, at length, and was sure of every number.",
        "Answered before the question had ended, in a steady voice.",
        "Talked easily, without a pause, and never said “I think”.",
      ],
      out: [
        "Spoke last, briefly, and hedged every number.",
        "Answered slowly and began most sentences with “I think”.",
        "Said very little and asked whether that was what was wanted.",
      ],
    },
    likeness: {
      in: [
        "Turned out to share your school and your taste in music.",
        "Turned out to come from your home town and follow your team.",
        "Turned out to have read the book you were halfway through.",
      ],
      out: [
        "Turned out to share nothing with you but the building.",
        "Turned out to have no interest in anything you brought up.",
        "Turned out to be from somewhere you had never been, into things you had never tried.",
      ],
    },
    record: {
      in: [
        "Came from the firm everyone wants on a CV.",
        "Had a famous company’s name at the top of their history.",
        "Arrived with a recommendation from someone you had heard of.",
      ],
      out: [
        "Came from a firm nobody in the room had heard of.",
        "Had no famous names in their history.",
        "Arrived with no one to speak for them.",
      ],
    },
    part: {
      in: [
        "Looked just like the person you would have pictured for the job.",
        "Looked, to the room, like someone who belonged.",
        "Looked the part from the first glance.",
      ],
      out: [
        "Looked nothing like the person you would have pictured for the job.",
        "Looked, to the room, like someone who had come to the wrong floor.",
        "Did not look the part at first glance.",
      ],
    },
  },
  moment: {
    in: [
      "Asked what the last person had run into before starting.",
      "Read the note back before sending it.",
      "Said they did not know yet, and came back the next day with an answer.",
      "Thanked the person whose idea it had been.",
      "Fixed a small thing nobody had asked about.",
      "Checked the number a second time.",
      "Asked for a look at the first draft rather than the last.",
      "Sent round what had been agreed.",
      "Said on Tuesday that Monday’s estimate had been too low.",
      "Asked the quietest person in the room what they thought.",
      "Left the shared folder tidier than they found it.",
      "Stayed until the handover was finished.",
    ],
    out: [
      "Started before the question was finished.",
      "Sent the number as it came.",
      "Said the report was late because of the tool.",
      "Called it “basically done” on the second day.",
      "Mentioned the idea as though it had been theirs.",
      "Replied after the second reminder.",
      "Answered the feedback point by point.",
      "Said they had already known that.",
      "Changed the plan and mentioned it afterwards.",
      "Went quiet when a mistake was found.",
      "Left as soon as their part was done.",
      "Took the interesting task and left the rest.",
    ],
  },
};

export const CALL_NAMES = [
  { key: 1, name: "surely in", short: "sure in" },
  { key: 2, name: "lean in", short: "lean in" },
  { key: 3, name: "lean out", short: "lean out" },
  { key: 4, name: "surely out", short: "sure out" },
] as const;

export const YEAR_WORDS = {
  in: "A year on, doing well.",
  out: "A year on, not doing well.",
};

/** What the sheet says before the sitting, and what it says the three slices are. */
export const FRAME = {
  tagline:
    "Meet sixteen people a little at a time. See what the first second did to your calls, and what more of the same did to how sure you were.",
  title:
    "Sixteen invented people start a job, on one of two teams. Call each three times.",
  lede: [
    "The call is whether they will be doing well a year on: surely in, lean in, lean out, surely out. Keys 1 to 4 make it. After the third call the year passes and you are told.",
    "Nothing is kept. What you call is gone when you leave the page.",
  ],
  slices: [
    {
      name: "The first second, and one moment",
      does: "How they came in or what they were like, then the first thing they did.",
    },
    {
      name: "Three moments",
      does: "Two more of the first weeks.",
    },
    {
      name: "All six",
      does: "The rest of what they did in their first weeks. Then the year.",
    },
  ],
  door: "Each person arrives with a first second: how they came in, how sure they sounded, whether they were like you, where they had come from, or whether they looked the part. It stays on the page at every call. The moments are what they did in their first weeks.",
  begin: "Meet the first",
  ask: "A year on, will they be doing well?",
  hidden: "not met yet",
  first: "the first second",
  moments: "the moments",
  next: "Meet the next",
  finish: "See what the calls did",
};

/** What the debrief is, section by section. */
export const DEBRIEF = {
  called: {
    title: "What you called",
    lede: "One bar for each call. The band is what a coin would do over sixteen people. The two marks are what two plain rules would have done on the same sixteen.",
  },
  conflict: {
    title: "When the first second and the moments pulled apart",
    lede: "Half of each team was dealt so that the first second pointed away from where the six moments came to. Each row is one of them; each circle is your call at one moment, three and six.",
  },
  teams: {
    title: "Ash and Birch",
    lede: "You were never told the two teams differed. On Ash the first second was dealt to go with the year for six of eight, on Birch for four of eight.",
  },
  deal: {
    title: "How the deal was made",
  },
  studies: {
    title: "What the studies say",
    lede: "Five findings this sheet leans on, each as far as its authors took it.",
  },
  limits: {
    title: "What this cannot tell you",
    body: [
      "Sixteen people is few. Counts that differ by a person or two are inside what a coin does, which is why the band is drawn.",
      "The people are invented and the deal is fixed. It says nothing about how well thin slices work in the world; the studies do that. It shows what your calls did here, with these people, when the first second was sometimes a guide and sometimes not.",
    ],
  },
  again: "Deal sixteen new people",
};

export type Study = {
  id: string;
  head: string;
  body: string;
  sources: string[];
};

export const STUDIES: Study[] = [
  {
    id: "clips",
    head: "A thin slice can carry a lot",
    body: "Ambady and Rosenthal showed people silent clips of college teachers, under thirty seconds each. Strangers’ ratings of the teachers’ nonverbal behavior predicted the students’ end-of-semester ratings of them, and clips of six and fifteen seconds were still strongly related. Their ratings of the teachers’ physical attractiveness were not as strongly related. That is the finding behind the phrase ‘thin slice’. It is a finding about one kind of behavior and one kind of outcome.",
    sources: ["ar1993", "ar1992"],
  },
  {
    id: "hundred",
    head: "A first second can be enough to form a view, and more time adds confidence",
    body: "Willis and Todorov showed strangers’ faces for 100 milliseconds. Judgments of attractiveness, likeability, trustworthiness, competence and aggressiveness after that correlated highly with judgments made with no time limit, and longer exposure did not significantly raise the correlations. Confidence in the judgments did rise with more time. The authors suggest that additional time may simply boost confidence.",
    sources: ["wt2006"],
  },
  {
    id: "more",
    head: "More information can raise confidence without raising accuracy",
    body: "Oskamp gave thirty-two judges, eight of them clinical psychologists, a case history in four stages, and after each stage twenty-five questions about the man, each with five answers to choose from and how confident they were. Their confidence rose from 33% at the first stage to 53% at the fourth. The share of answers that matched the record was 26, 23, 28 and 28 percent, where guessing gives 20. The sure calls on your bar chart are the same kind of measure, taken on you.",
    sources: ["o1965"],
  },
  {
    id: "environment",
    head: "Whether a snap judgment is worth trusting depends on the room, not the feeling",
    body: "Kahneman and Klein set out two conditions for trusting an intuitive judgment: the environment has regularities that can be learned, and the judge has had the chance to learn them. Their summary is that how a judgment feels is not a reliable indicator of whether it is accurate. Nothing on the page said which team was which. On Ash the first second went with the year for six of eight, on Birch for four.",
    sources: ["kk2009"],
  },
  {
    id: "halo",
    head: "What sits in the first second tends to color the rest",
    body: "Thorndike found that superiors’ ratings of the same person on separate qualities, intelligence and reliability among them, ran very high and very even, as if a general impression colored each one; he described it as a halo. Dion, Berscheid and Walster found that people rated better-looking strangers as having more desirable personalities. Nisbett and Wilson showed students the same instructor once warm and once cold: their views of his appearance, mannerisms and accent followed how warm he had been, and they did not know it. Todorov and colleagues found that judgments of competence from faces alone predicted 68.8% of the 2004 US Senate races, and that they were formed within a second of seeing the face.",
    sources: ["t1920", "dbw1972", "nw1977", "t2005"],
  },
];

export type Source = {
  id: string;
  cite: string;
  doi: string;
};

export const SOURCES: Source[] = [
  {
    id: "ar1993",
    cite: "Ambady, N., & Rosenthal, R. (1993). Half a minute: Predicting teacher evaluations from thin slices of nonverbal behavior and physical attractiveness. Journal of Personality and Social Psychology, 64(3), 431–441.",
    doi: "10.1037/0022-3514.64.3.431",
  },
  {
    id: "ar1992",
    cite: "Ambady, N., & Rosenthal, R. (1992). Thin slices of expressive behavior as predictors of interpersonal consequences: A meta-analysis. Psychological Bulletin, 111(2), 256–274.",
    doi: "10.1037/0033-2909.111.2.256",
  },
  {
    id: "wt2006",
    cite: "Willis, J., & Todorov, A. (2006). First impressions: Making up your mind after a 100-ms exposure to a face. Psychological Science, 17(7), 592–598.",
    doi: "10.1111/j.1467-9280.2006.01750.x",
  },
  {
    id: "o1965",
    cite: "Oskamp, S. (1965). Overconfidence in case-study judgments. Journal of Consulting Psychology, 29(3), 261–265.",
    doi: "10.1037/h0022125",
  },
  {
    id: "kk2009",
    cite: "Kahneman, D., & Klein, G. (2009). Conditions for intuitive expertise: A failure to disagree. American Psychologist, 64(6), 515–526.",
    doi: "10.1037/a0016755",
  },
  {
    id: "t1920",
    cite: "Thorndike, E. L. (1920). A constant error in psychological ratings. Journal of Applied Psychology, 4(1), 25–29.",
    doi: "10.1037/h0071663",
  },
  {
    id: "dbw1972",
    cite: "Dion, K., Berscheid, E., & Walster, E. (1972). What is beautiful is good. Journal of Personality and Social Psychology, 24(3), 285–290.",
    doi: "10.1037/h0033731",
  },
  {
    id: "nw1977",
    cite: "Nisbett, R. E., & Wilson, T. D. (1977). The halo effect: Evidence for unconscious alteration of judgments. Journal of Personality and Social Psychology, 35(4), 250–256.",
    doi: "10.1037/0022-3514.35.4.250",
  },
  {
    id: "t2005",
    cite: "Todorov, A., Mandisodza, A. N., Goren, A., & Hall, C. C. (2005). Inferences of competence from faces predict election outcomes. Science, 308(5728), 1623–1626.",
    doi: "10.1126/science.1110589",
  },
];
