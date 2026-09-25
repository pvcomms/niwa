import type { Bank, Dialogue } from "../lib/dialogue.ts";

/**
 * The starter bank: open questions in the garden's own words, six families,
 * after the shape Socratic questioning has taken in teaching since Paul and
 * Elder set it out. Dealt beside the reader's own bank (`questions.md`),
 * which can say the same things in their words or say other things.
 */
export const STARTER_BANK: Bank = {
  clarify: [
    "What do you mean by that, exactly — say it again in other words.",
    "What is an example of it? And what is something close that does not count?",
    "Which word in the thesis is carrying the most weight, and what does it mean here?",
    "How does this relate to what you said before it?",
    "What is the thing itself, apart from your account of it?",
    "If you had to draw it, what would be in the picture?",
  ],
  assume: [
    "What has to be so for this to be said at all?",
    "What are you taking for granted here that you have not written down?",
    "How did you come to assume that? When did it start?",
    "What if the opposite were the case — what would you have to give up?",
    "Whose assumption is it, first — yours, or someone you heard it from?",
    "What does this thesis need to be true about you?",
  ],
  evidence: [
    "How do you know? What is it resting on?",
    "What would you have to see to give it up?",
    "Where did the reasons come from, and how did each reach you?",
    "Which of your reasons is on the record, and which is only in your head?",
    "What is the strongest thing that could be said against it, in your own words?",
    "What would count as having checked?",
  ],
  viewpoint: [
    "Who would put this differently, and what would their first sentence be?",
    "How would someone who does not share your values read this?",
    "What does it look like from the position of the person it is about?",
    "What did you believe about this a year ago, and what changed?",
    "Whose interest does this way of putting it serve?",
    "What would the fallow version of you — the one who wrote the old notes — say?",
  ],
  consequence: [
    "If this is so, what follows? What would you do differently this month?",
    "What else would have to be so if this is?",
    "What happens to the things that rest on it if it fell?",
    "How does this fit with what you already know — and where does it not?",
    "Who is affected, and how would they describe the effect?",
    "What is the cost of being wrong about it, and who pays?",
  ],
  question: [
    "Why did this need asking today?",
    "What was the point of the question — what will you do with the answer?",
    "Is this the real question, or the one that was easier to ask? What is the real one?",
    "What would an answer have to look like for you to stop asking?",
    "Who else is asking this, and why now?",
    "What does the way you asked it already assume?",
  ],
};

/**
 * Specimen A's dialogue — the synthetic life examining the claim its
 * provenance traced, so a deployed garden, which has no dialogues to read,
 * can show the instrument. Every turn here is fiction.
 */
export const SPECIMEN_DIALOGUE: Dialogue = {
  slug: "2026-09-20-remote-workers-are-always-the-first-to-go",
  title: "Remote workers are always the first to go",
  thesis:
    "Remote workers are always the first to go when a company cuts — everyone knows it, the data shows it.",
  now:
    "At some firms, by some managers' own account, working remotely is one of the things that can count against you when a company cuts. I do not know whether it counts at mine.",
  stone: null,
  opened: "2026-09-20",
  touched: "2026-09-22",
  turns: [
    {
      id: "sd1",
      family: "clarify",
      question: "What do you mean by 'first to go' — first in time, or most likely at all?",
      by: "bank",
      kept: true,
      answer:
        "Most likely, I think. That when the list is drawn up, the remote names are near the top. I did not mean literally the first day.",
      stone: null,
      on: "2026-09-20",
    },
    {
      id: "sd2",
      family: "evidence",
      question: "You wrote 'the data shows it'. Which data, and how did it reach you?",
      by: "you",
      kept: true,
      answer:
        "A post on the feed quoting a survey. When I traced it, the survey said 31% of managers called location one factor among several. That is not the same sentence.",
      stone: null,
      on: "2026-09-20",
    },
    {
      id: "sd3",
      family: "assume",
      question: "You said 'everyone knows it'. Who is everyone, and what would they have to have seen to know it?",
      by: "proposed",
      kept: true,
      answer:
        "The people in my feed, mostly. Three or four of whom I actually know. None of them has run a layoff.",
      stone: null,
      on: "2026-09-21",
    },
    {
      id: "sd4",
      family: "viewpoint",
      question: "How would a manager who has drawn up such a list put it?",
      by: "bank",
      kept: true,
      answer:
        "Probably: we looked at who we could do without. Some of those people were remote. Some were not. I have never asked one.",
      stone: null,
      on: "2026-09-21",
    },
    {
      id: "sd5",
      family: "consequence",
      question: "If it is so at your firm, what would you do differently this month that you are not doing now?",
      by: "garden",
      kept: true,
      answer:
        "Be in the office two days a week, I suppose. Which I have been considering anyway, for other reasons. So the thesis may have been doing that work for me.",
      stone: null,
      on: "2026-09-22",
    },
    {
      id: "sd6",
      family: "question",
      question: "What made this a question today rather than in March, when you first saw the post?",
      by: "proposed",
      kept: false,
      answer: "",
      stone: null,
      on: "2026-09-22",
    },
  ],
  assumptions: [
    {
      id: "sa1",
      text: "A survey of managers' stated factors predicts what firms actually do.",
      turn: "sd2",
      by: "you",
      kept: true,
      examined: "fell",
      note: "the survey asked about intentions, not outcomes; I have no outcome data",
    },
    {
      id: "sa2",
      text: "My firm behaves like the firms in the survey.",
      turn: "sd5",
      by: "proposed",
      kept: true,
      examined: "cannot",
      note: "it has never cut staff while I have been here",
    },
    {
      id: "sa3",
      text: "The people saying it know something I do not.",
      turn: "sd3",
      by: "proposed",
      kept: true,
      examined: "",
      note: "",
    },
  ],
  terms: [
    { id: "st1", word: "first to go", meaning: "most likely to be cut, not earliest", turn: "sd1" },
    { id: "st2", word: "the data", meaning: "one survey of stated intentions, 412 managers, 2024", turn: "sd2" },
  ],
  note: "",
};
