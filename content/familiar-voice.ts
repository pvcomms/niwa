import type { Item, Segment } from "../lib/familiar-voice.ts";

/**
 * The statements, the reply's phrases and the sources for the voice, ported
 * from ~/work/capp/instruments/familiar-voice. Every statement and source was
 * checked on 30 Sep 2026 against Crossref, PubMed and the primary pages; three
 * statements whose truth turns on a definition or a historian were replaced.
 */

/** Eight that are so and eight that are not. Four of each go into the answers. */
export const ITEMS: Item[] = [
  {
    id: "T1",
    so: true,
    text: "Oxford University was teaching students before the Aztec capital, Tenochtitlan, was founded.",
    q: "Which came first, Oxford University or the Aztec capital?",
    lead: "Oxford, comfortably.",
    note: "Oxford says teaching existed there in some form by 1096. Tenochtitlan was founded around 1325.",
  },
  {
    id: "T2",
    so: true,
    text: "Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid of Giza.",
    q: "Give me a fact that scrambles my sense of time.",
    lead: "Here is a good one.",
    note: "The Great Pyramid dates to about 2560 BCE. Cleopatra died in 30 BCE. Apollo 11 landed in 1969.",
  },
  {
    id: "T3",
    so: true,
    text: "Sharks were swimming in the oceans before the first trees grew on land.",
    q: "Which are older, sharks or trees?",
    lead: "Sharks.",
    note: "Shark fossils go back more than 400 million years. The oldest known fossil forests are about 390 million years old.",
  },
  {
    id: "T4",
    so: true,
    text: "The Pacific Ocean is wider than the Moon.",
    q: "How big is the Pacific, really?",
    lead: "Bigger than maps make it look.",
    note: "The Pacific is about 19,000 km across at its widest. The Moon is about 3,475 km across.",
  },
  {
    id: "T5",
    so: true,
    text: "Nintendo was founded in 1889 as a maker of playing cards.",
    q: "How old is Nintendo?",
    lead: "Older than most people guess.",
    note: "It began in Kyoto making hanafuda cards.",
  },
  {
    id: "T6",
    so: true,
    text: "The man who designed the Pringles can had some of his ashes buried in one.",
    q: "Tell me something strange about packaging.",
    lead: "A favourite:",
    note: "Fredric Baur, who died in 2008.",
  },
  {
    id: "T7",
    so: true,
    text: "Bananas are measurably radioactive.",
    q: "Is any ordinary food radioactive?",
    lead: "A few are.",
    note: "They contain potassium-40, a naturally radioactive isotope. The dose is tiny.",
  },
  {
    id: "T8",
    so: true,
    text: "Scotland’s national animal is the unicorn.",
    q: "Does Scotland have a national animal?",
    lead: "It does.",
    note: "The unicorn is Scotland’s national animal and a supporter on its royal coat of arms.",
  },
  {
    id: "F1",
    so: false,
    text: "Mount Everest is the tallest mountain on Earth when measured from base to peak.",
    q: "Which mountain is tallest if you measure from its base?",
    lead: "Still Everest.",
    note: "Mauna Kea, measured from its base on the sea floor, is taller.",
  },
  {
    id: "F2",
    so: false,
    text: "Albert Einstein failed mathematics at school.",
    q: "Was Einstein good at maths as a boy?",
    lead: "Not at first.",
    note: "He was strong at mathematics from boyhood. Shown the story in 1935, he said he had never failed in it.",
  },
  {
    id: "F3",
    so: false,
    text: "Viking warriors wore horned helmets into battle.",
    q: "What did Viking helmets look like?",
    lead: "Horned, mostly.",
    note: "No horned helmet has been found from the Viking Age; the one near-complete helmet, from Gjermundbu in Norway, is a plain iron cap. The horns owe much to the costumes for the first staging of Wagner’s Ring cycle in 1876.",
  },
  {
    id: "F4",
    so: false,
    text: "Canberra has been Australia’s capital since federation in 1901.",
    q: "When did Canberra become Australia’s capital?",
    lead: "From the very start.",
    note: "The site was chosen in 1908 and Parliament moved there in 1927. Melbourne was the seat of government until then.",
  },
  {
    id: "F5",
    so: false,
    text: "Glass is a very slow-flowing liquid, which is why old church windows are thicker at the bottom.",
    q: "Why are old church windows thicker at the bottom?",
    lead: "It comes down to what glass is.",
    note: "Glass is an amorphous solid at room temperature. Old panes are uneven because of how they were made.",
  },
  {
    id: "F6",
    so: false,
    text: "Bulls charge at a matador’s cape because the colour red enrages them.",
    q: "Why do bulls charge the cape?",
    lead: "It is the colour.",
    note: "Cattle are red–green colour-blind. The bull charges the cape because it moves.",
  },
  {
    id: "F7",
    so: false,
    text: "Mercury, being closest to the Sun, is the hottest planet in the solar system.",
    q: "Which planet is the hottest?",
    lead: "Mercury.",
    note: "Venus is hotter, about 464 °C at the surface, because its thick atmosphere traps heat.",
  },
  {
    id: "F8",
    so: false,
    text: "The Great Wall of China is visible to the naked eye from the Moon.",
    q: "Can you see the Great Wall of China from the Moon?",
    lead: "You can.",
    note: "It is far too narrow; astronauts report it is hard to pick out even from low orbit. The claim was in print long before anyone went to space, and repetition is much of why it feels true.",
  },
];

export const PRESETS = [
  "I’ve been putting off a hard conversation with my brother and it’s eating at me.",
  "I moved to a new city and I don’t really know anyone yet.",
  "I think I’m falling behind everyone I graduated with.",
];

/** Things that do not matter, for the dial. */
export const TRIVIAL = [
  "My toaster burns one side of the bread.",
  "The bus was two minutes late this morning.",
  "I dropped a grape under the fridge.",
];

/** The reply, in order. The three content phrases are there at every warmth; the six others come on by level. */
export const SEGMENTS: Segment[] = [
  {
    k: "gratitude",
    level: 2,
    content: false,
    text: "Thank you for telling me this.",
  },
  {
    k: "validation",
    level: 1,
    content: false,
    text: "That sounds really hard.",
  },
  { k: "paraphrase", level: 0, content: true },
  {
    k: "normalizing",
    level: 3,
    content: false,
    text: "It makes complete sense that this would weigh on you, and a lot of people feel the same way.",
  },
  {
    k: "stock advice",
    level: 0,
    content: true,
    text: "One place to start is the smallest step you could take today.",
  },
  {
    k: "permission",
    level: 3,
    content: false,
    text: "There is no rush, and there is no wrong way to begin.",
  },
  {
    k: "presence",
    level: 4,
    content: false,
    text: "I’m here with you in this.",
  },
  {
    k: "question",
    level: 0,
    content: true,
    text: "What would that first step be?",
  },
  {
    k: "affirmation",
    level: 4,
    content: false,
    text: "Reaching out like this already took courage.",
  },
];

export type Scale = {
  q: string;
  full: string[];
  short: string[];
  ab?: string[];
};

export const SCALES: Record<"interest" | "understood" | "truth", Scale> = {
  interest: {
    q: "How interesting is this answer?",
    full: [
      "dull",
      "a little interesting",
      "quite interesting",
      "very interesting",
    ],
    short: ["dull", "a little", "quite", "very"],
  },
  understood: {
    q: "How understood do you feel?",
    full: [
      "not at all understood",
      "slightly understood",
      "somewhat understood",
      "fairly understood",
      "very understood",
      "completely understood",
    ],
    short: ["not at all", "", "", "", "", "completely"],
  },
  truth: {
    q: "How true is this?",
    full: [
      "definitely false",
      "probably false",
      "possibly false",
      "possibly true",
      "probably true",
      "definitely true",
    ],
    short: [
      "definitely false",
      "probably false",
      "possibly false",
      "possibly true",
      "probably true",
      "definitely true",
    ],
    ab: [
      "def. false",
      "prob. false",
      "poss. false",
      "poss. true",
      "prob. true",
      "def. true",
    ],
  },
};

export const PHASES = [
  {
    code: "A" as const,
    name: "Exposure",
    does: "Eight questions and an assistant’s answers. Rate how interesting each answer is.",
  },
  {
    code: "B" as const,
    name: "Replies",
    does: "Tell it one small thing on your mind. Rate two replies.",
  },
  {
    code: "C" as const,
    name: "Judgment",
    does: "Sixteen statements. Rate how true each one seems.",
  },
  {
    code: "D" as const,
    name: "Debrief",
    does: "What the session was measuring, with your numbers.",
  },
];

/** A sitting that never happened, for the figure at the top. No statement text, so nothing is given away. */
export const SPECIMEN = (
  [
    [1, 1, 5],
    [1, 1, 4],
    [1, 1, 5],
    [1, 1, 4],
    [1, 0, 4],
    [1, 0, 3],
    [1, 0, 5],
    [1, 0, 3],
    [0, 1, 4],
    [0, 1, 5],
    [0, 1, 4],
    [0, 1, 3],
    [0, 0, 3],
    [0, 0, 2],
    [0, 0, 4],
    [0, 0, 4],
  ] as const
).map(([seen, so, r]) => ({ seen: !!seen, so: !!so, r }));

export const AFTER = {
  eliza: [
    "This is the method of ELIZA, the program Joseph Weizenbaum wrote at MIT and described in 1966. It matched keywords and turned pronouns around, and it understood nothing. In Computer Power and Human Reason (1976) he recalls his secretary, who had watched him work on it for months, asking him to leave the room after only a few exchanges with it.",
    "Call this ostensible feeling: feeling shown on the surface of a reply, with no one behind it having it. A current assistant reads your words far better than ELIZA did. Its warmth is still a separate layer, tuned by whoever trained it, and the layer can be turned up without the reading getting any better.",
  ],
  ayers:
    "In a 2023 study, health professionals compared a chatbot’s answers to patients’ questions with physicians’ answers, and rated the chatbot’s empathetic or very empathetic 45 per cent of the time, against 5 per cent for the physicians’ (Ayers and colleagues). The warmth you rated here was six fixed phrases.",
  mechanism: [
    "Both feelings come from how easily something goes in. A sentence you have met before is easier to process the second time, and the mind reads that ease as a sign of truth. Reber and Schwarz found the same with colour: statements printed in easier-to-read colours were judged true more often. A reply shaped like care is easy to receive as care. Neither feeling checks the source.",
    "So a system can give you both without knowing whether a claim is true and without feeling anything about you. The feeling forms between you and the device, and it arrives already feeling like your own judgment. Knowing better helps less than you would hope: Fazio and colleagues found repetition raised belief even in statements that contradicted what people already knew.",
  ],
};

export const WILD_AGAIN = [
  "An assistant says something false once, then restates it in every follow-up. Each restatement is another exposure.",
  "A headline you scrolled past yesterday. One earlier exposure raised belief in false headlines, even ones flagged as disputed by fact-checkers (Pennycook, Cannon and Rand).",
  "The same claim in an ad that follows you from site to site for a month.",
];

export const WILD_WARM: [string, string][] = [
  ["We miss you! Come back and pick up where you left off.", "presence"],
  ["Thanks for being with us. We’re sorry to see you go.", "gratitude"],
  ["Oops, that’s on us. We’re on it.", "apology"],
  ["Great job! You’re on a roll.", "affirmation"],
  ["Take your time. We’ll be right here.", "permission"],
];

export const SOURCES: { cite: string; venue: string; doi?: string }[] = [
  {
    cite: "Hasher, Goldstein and Toppino (1977). Frequency and the conference of referential validity.",
    venue: "Journal of Verbal Learning and Verbal Behavior 16, 107–112.",
    doi: "10.1016/S0022-5371(77)80012-1",
  },
  {
    cite: "Reber and Schwarz (1999). Effects of perceptual fluency on judgments of truth.",
    venue: "Consciousness and Cognition 8, 338–342.",
    doi: "10.1006/ccog.1999.0386",
  },
  {
    cite: "Fazio, Brashier, Payne and Marsh (2015). Knowledge does not protect against illusory truth.",
    venue: "Journal of Experimental Psychology: General 144, 993–1002.",
    doi: "10.1037/xge0000098",
  },
  {
    cite: "Pennycook, Cannon and Rand (2018). Prior exposure increases perceived accuracy of fake news.",
    venue: "Journal of Experimental Psychology: General 147, 1865–1880.",
    doi: "10.1037/xge0000465",
  },
  {
    cite: "Weizenbaum (1966). ELIZA: a computer program for the study of natural language communication between man and machine.",
    venue: "Communications of the ACM 9, 36–45.",
    doi: "10.1145/365153.365168",
  },
  {
    cite: "Weizenbaum (1976). Computer Power and Human Reason: From Judgment to Calculation.",
    venue: "W. H. Freeman, San Francisco.",
  },
  {
    cite: "Ayers and colleagues (2023). Comparing physician and artificial intelligence chatbot responses to patient questions posted to a public social media forum.",
    venue: "JAMA Internal Medicine 183, 589–596.",
    doi: "10.1001/jamainternmed.2023.1838",
  },
];
