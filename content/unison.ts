import type { Arrangement, Finding, Passage, Who } from "../lib/unison.ts";

/**
 * The passages for the unison's rounds, and the arrangements and sources for
 * the channels. The passages are invented — places, people and numbers — so
 * nothing the reader already knew can answer for them. Each is about the same
 * length and carries four questions of the same kinds: two details, a cause,
 * and one that asks what follows. The first option is always the one the
 * passage has; the draw shuffles the order they are shown in.
 */

export const PASSAGES: Passage[] = [
  {
    id: "ferry",
    title: "The ferry at Tarrow Sound",
    text: "Every spring the ferry at Tarrow Sound carries the village's bees across the water. The hives travel at dawn, while the bees are still inside, and each one is wrapped in a wet linen sheet to keep it cool. The ferry makes four crossings and never a fifth, because the ferryman believes a fifth would turn the tide against him. On the far shore the hives are set out in clover fields owned by the Maddox family, who are paid not in money but in honey: one jar in every nine. In autumn the ferry brings the hives home. The first jar of the year is never sold. It is left on the ferry's bench, and whoever takes it is expected to row the ferry once the following spring.",
    questions: [
      {
        q: "What is each hive wrapped in for the crossing?",
        options: ["A wet linen sheet", "A straw mat", "A canvas sack"],
      },
      {
        q: "How many crossings does the ferry make?",
        options: ["Four", "Three", "Nine"],
      },
      {
        q: "How are the Maddox family paid?",
        options: [
          "One jar of honey in every nine",
          "In money, each autumn",
          "With the first jar of the year",
        ],
      },
      {
        q: "Someone who takes the first jar has agreed to what?",
        options: [
          "Row the ferry the next spring",
          "Keep a hive of their own",
          "Pay the ferryman in honey",
        ],
      },
    ],
  },
  {
    id: "clock",
    title: "The clock in the reading room",
    text: "The library on Ansel Street keeps a clock that runs eleven minutes slow, on purpose. It was set that way in 1904 by the first librarian, Edith Carrow, so that people who arrived late for the evening lectures would think they were early and come in anyway. When the clock was cleaned in 1961, the repairman corrected it, and attendance at the lectures fell by a third that winter. The library's committee ordered the eleven minutes put back. A small card under the clock now tells the story, but only in Latin, which the present librarian says keeps the joke safe from most visitors. The lectures still begin when the clock says seven, whatever the time is outside.",
    questions: [
      {
        q: "How slow does the clock run?",
        options: ["Eleven minutes", "Seven minutes", "A third of an hour"],
      },
      {
        q: "Who first set it slow?",
        options: [
          "The first librarian",
          "The repairman",
          "The library's committee",
        ],
      },
      {
        q: "What happened after the clock was corrected?",
        options: [
          "Fewer people came to the lectures",
          "The lectures moved to seven",
          "The card was written in Latin",
        ],
      },
      {
        q: "Why is the card written in Latin?",
        options: [
          "So that most visitors cannot read it",
          "Because the first librarian wrote it",
          "Because the lectures are given in Latin",
        ],
      },
    ],
  },
  {
    id: "moss",
    title: "The moss on Mount Serrel",
    text: "On the north face of Mount Serrel, three volunteers have counted the same patch of moss every August since 1987. The patch is marked by four iron pins, one at each corner of a square two metres wide. They count it by dividing the square into a hundred small cells and noting each cell that is more than half green. In the first year sixty-two cells were green. The number rose through the 1990s and has fallen every year since a footpath was cut nearby, which the volunteers put down to walkers who step off the path to photograph the view. Last August they counted forty-one. Two of the three founders have since died, and the third, now eighty, still climbs up each summer to read out the count.",
    questions: [
      {
        q: "What marks the corners of the patch?",
        options: ["Iron pins", "Painted stones", "Wooden stakes"],
      },
      {
        q: "When does a cell count as green?",
        options: [
          "When more than half of it is green",
          "When any of it is green",
          "When all of it is green",
        ],
      },
      {
        q: "What do the volunteers think made the count fall?",
        options: [
          "Walkers stepping off the new path",
          "A run of dry summers",
          "The iron pins rusting",
        ],
      },
      {
        q: "How many cells were green last August?",
        options: ["Forty-one", "Sixty-two", "A hundred"],
      },
    ],
  },
];

/** What the voice says when the reader asks to hear it before the rounds. */
export const TRY_LINE =
  "This is the voice the rounds will use, at the pace and loudness you have set.";

/** Adults reading non-fiction silently, words a minute (Brysbaert, 2019). */
export const AVERAGE_WPM = 238;

export const WHO: { id: Who; name: string }[] = [
  { id: "own", name: "reads well in the language" },
  { id: "learning", name: "is learning the language" },
  { id: "hard", name: "finds reading hard" },
  { id: "young", name: "is learning to read" },
];

/**
 * Checked on 30 Sep 2026: every DOI against Crossref (title, authors, venue,
 * volume, pages), every finding against the abstract, and the numbers from
 * Clinton-Lisell (2023), Brysbaert (2019), Martin et al. (1988), Brown et al.
 * (2008), Moreno and Mayer (2002), Varao Sousa et al. (2013) and Wood et al.
 * (2018) against the full text. Online-first papers are cited by their issue's year.
 */
export const SOURCES: {
  key: string;
  short: string;
  cite: string;
  venue: string;
  doi?: string;
  /** Where there is no DOI. */
  id?: string;
}[] = [
  {
    key: "clinton23",
    short: "Clinton-Lisell, 2023",
    cite: "Clinton-Lisell (2023). Does reading while listening to text improve comprehension compared to reading only? A systematic review and meta-analysis.",
    venue: "Educational Research: Theory and Practice 34(3), 133–155.",
    id: "ERIC EJ1403866",
  },
  {
    key: "clinton22",
    short: "Clinton-Lisell, 2022",
    cite: "Clinton-Lisell (2022). Listening ears or reading eyes: A meta-analysis of reading and listening comprehension comparisons.",
    venue: "Review of Educational Research 92(4), 543–582.",
    doi: "10.3102/00346543211060871",
  },
  {
    key: "rogowsky",
    short: "Rogowsky et al., 2016",
    cite: "Rogowsky, Calhoun and Tallal (2016). Does modality matter? The effects of reading, listening, and dual modality on comprehension.",
    venue: "SAGE Open 6(3).",
    doi: "10.1177/2158244016669550",
  },
  {
    key: "kopp",
    short: "Kopp and D’Mello, 2016",
    cite: "Kopp and D’Mello (2016). The impact of modality on mind wandering during comprehension.",
    venue: "Applied Cognitive Psychology 30(1), 29–40.",
    doi: "10.1002/acp.3163",
  },
  {
    key: "conklin",
    short: "Conklin et al., 2020",
    cite: "Conklin, Alotaibi, Pellicer-Sánchez and Vilkaitė-Lozdienė (2020). What eye-tracking tells us about reading-only and reading-while-listening in a first and second language.",
    venue: "Second Language Research 36(3), 257–276.",
    doi: "10.1177/0267658320921496",
  },
  {
    key: "varao",
    short: "Varao Sousa et al., 2013",
    cite: "Varao Sousa, Carriere and Smilek (2013). The way we encounter reading material influences how frequently we mind wander.",
    venue: "Frontiers in Psychology 4, 892.",
    doi: "10.3389/fpsyg.2013.00892",
  },
  {
    key: "schotter",
    short: "Schotter et al., 2014",
    cite: "Schotter, Tran and Rayner (2014). Don’t believe what you read (only once): Comprehension is supported by regressions during reading.",
    venue: "Psychological Science 25(6), 1218–1226.",
    doi: "10.1177/0956797614531148",
  },
  {
    key: "brysbaert",
    short: "Brysbaert, 2019",
    cite: "Brysbaert (2019). How many words do we read per minute? A review and meta-analysis of reading rate.",
    venue: "Journal of Memory and Language 109, 104047.",
    doi: "10.1016/j.jml.2019.104047",
  },
  {
    key: "wood",
    short: "Wood et al., 2018",
    cite: "Wood, Moxley, Tighe and Wagner (2018). Does use of text-to-speech and related read-aloud tools improve reading comprehension for students with reading disabilities? A meta-analysis.",
    venue: "Journal of Learning Disabilities 51(1), 73–84.",
    doi: "10.1177/0022219416688170",
  },
  {
    key: "singh",
    short: "Singh and Alexander, 2022",
    cite: "Singh and Alexander (2022). Audiobooks, print, and comprehension: What we know and what we need to know.",
    venue: "Educational Psychology Review 34(2), 677–715.",
    doi: "10.1007/s10648-021-09653-2",
  },
  {
    key: "brown",
    short: "Brown et al., 2008",
    cite: "Brown, Waring and Donkaewbua (2008). Incidental vocabulary acquisition from reading, reading-while-listening, and listening to stories.",
    venue: "Reading in a Foreign Language 20(2), 136–163.",
    id: "hdl:10125/66816",
  },
  {
    key: "webb",
    short: "Webb and Chang, 2012",
    cite: "Webb and Chang (2012). Vocabulary learning through assisted and unassisted repeated reading.",
    venue: "The Canadian Modern Language Review 68(3), 267–290.",
    doi: "10.3138/cmlr.1204.1",
  },
  {
    key: "chang",
    short: "Chang and Millett, 2015",
    cite: "Chang and Millett (2015). Improving reading rates and comprehension through audio-assisted extensive reading for beginner learners.",
    venue: "System 52, 91–102.",
    doi: "10.1016/j.system.2015.05.003",
  },
  {
    key: "hui",
    short: "Hui and Godfroid, 2026",
    cite: "Hui and Godfroid (2026). Listening, reading, or both? Rethinking the comprehension benefits of reading-while-listening.",
    venue: "Language Learning 76(1), 311–351.",
    doi: "10.1111/lang.12721",
  },
  {
    key: "diao",
    short: "Diao and Sweller, 2007",
    cite: "Diao and Sweller (2007). Redundancy in foreign language reading comprehension instruction: Concurrent written and spoken presentations.",
    venue: "Learning and Instruction 17(1), 78–88.",
    doi: "10.1016/j.learninstruc.2006.11.007",
  },
  {
    key: "moreno",
    short: "Moreno and Mayer, 2002",
    cite: "Moreno and Mayer (2002). Verbal redundancy in multimedia learning: When reading helps listening.",
    venue: "Journal of Educational Psychology 94(1), 156–163.",
    doi: "10.1037/0022-0663.94.1.156",
  },
  {
    key: "adesope",
    short: "Adesope and Nesbit, 2012",
    cite: "Adesope and Nesbit (2012). Verbal redundancy in multimedia learning environments: A meta-analysis.",
    venue: "Journal of Educational Psychology 104(1), 250–263.",
    doi: "10.1037/a0026147",
  },
  {
    key: "kalyuga04",
    short: "Kalyuga et al., 2004",
    cite: "Kalyuga, Chandler and Sweller (2004). When redundant on-screen text in multimedia technical instruction can interfere with learning.",
    venue: "Human Factors 46(3), 567–581.",
    doi: "10.1518/hfes.46.3.567.50405",
  },
  {
    key: "ginns",
    short: "Ginns, 2005",
    cite: "Ginns (2005). Meta-analysis of the modality effect.",
    venue: "Learning and Instruction 15(4), 313–331.",
    doi: "10.1016/j.learninstruc.2005.07.001",
  },
  {
    key: "reinwein",
    short: "Reinwein, 2012",
    cite: "Reinwein (2012). Does the modality effect exist? And if so, which modality effect?",
    venue: "Journal of Psycholinguistic Research 41(1), 1–32.",
    doi: "10.1007/s10936-011-9180-4",
  },
  {
    key: "mousavi",
    short: "Mousavi et al., 1995",
    cite: "Mousavi, Low and Sweller (1995). Reducing cognitive load by mixing auditory and visual presentation modes.",
    venue: "Journal of Educational Psychology 87(2), 319–334.",
    doi: "10.1037/0022-0663.87.2.319",
  },
  {
    key: "tabbers",
    short: "Tabbers et al., 2004",
    cite: "Tabbers, Martens and van Merriënboer (2004). Multimedia instructions and cognitive load theory: Effects of modality and cueing.",
    venue: "British Journal of Educational Psychology 74(1), 71–81.",
    doi: "10.1348/000709904322848824",
  },
  {
    key: "kalyuga99",
    short: "Kalyuga et al., 1999",
    cite: "Kalyuga, Chandler and Sweller (1999). Managing split-attention and redundancy in multimedia instruction.",
    venue: "Applied Cognitive Psychology 13(4), 351–371.",
    doi: "10.1002/(SICI)1099-0720(199908)13:4<351::AID-ACP589>3.0.CO;2-6",
  },
  {
    key: "mayer01",
    short: "Mayer et al., 2001",
    cite: "Mayer, Heiser and Lonn (2001). Cognitive constraints on multimedia learning: When presenting more material results in less understanding.",
    venue: "Journal of Educational Psychology 93(1), 187–198.",
    doi: "10.1037/0022-0663.93.1.187",
  },
  {
    key: "mayer08",
    short: "Mayer and Johnson, 2008",
    cite: "Mayer and Johnson (2008). Revising the redundancy principle in multimedia learning.",
    venue: "Journal of Educational Psychology 100(2), 380–386.",
    doi: "10.1037/0022-0663.100.2.380",
  },
  {
    key: "yue",
    short: "Yue et al., 2013",
    cite: "Yue, Bjork and Bjork (2013). Reducing verbal redundancy in multimedia learning: An undesired desirable difficulty?",
    venue: "Journal of Educational Psychology 105(2), 266–277.",
    doi: "10.1037/a0031971",
  },
  {
    key: "gernsbacher",
    short: "Gernsbacher, 2015",
    cite: "Gernsbacher (2015). Video captions benefit everyone.",
    venue: "Policy Insights from the Behavioral and Brain Sciences 2(1), 195–202.",
    doi: "10.1177/2372732215602130",
  },
  {
    key: "martin",
    short: "Martin et al., 1988",
    cite: "Martin, Wogalter and Forlano (1988). Reading comprehension in the presence of unattended speech and music.",
    venue: "Journal of Memory and Language 27(4), 382–398.",
    doi: "10.1016/0749-596X(88)90063-0",
  },
  {
    key: "salame",
    short: "Salamé and Baddeley, 1982",
    cite: "Salamé and Baddeley (1982). Disruption of short-term memory by unattended speech: Implications for the structure of working memory.",
    venue: "Journal of Verbal Learning and Verbal Behavior 21(2), 150–164.",
    doi: "10.1016/S0022-5371(82)90521-7",
  },
  {
    key: "wickens",
    short: "Wickens, 2002",
    cite: "Wickens (2002). Multiple resources and performance prediction.",
    venue: "Theoretical Issues in Ergonomics Science 3(2), 159–177.",
    doi: "10.1080/14639220210123806",
  },
];

const SELF_PACED: Finding = {
  who: "own",
  dir: "same",
  says: "Across 30 studies and 1,945 readers, hearing the words while reading them added little to understanding (g = 0.18, which the author calls trivial). Where readers set their own pace, the difference was g = 0.06, indistinguishable from none.",
  src: ["clinton23"],
};

const SET_PACE: Finding = {
  dir: "higher",
  says: "Where the experimenter set the pace of the reading, adding the voice helped (g = 0.41, from 9 studies).",
  src: ["clinton23"],
};

const ROGOWSKY: Finding = {
  who: "own",
  dir: "same",
  says: "91 adults given non-fiction as an audiobook, as an e-text or as both at once understood it about equally, straight after and two weeks later.",
  src: ["rogowsky"],
};

const WANDER: Finding = {
  who: "own",
  dir: "mixed",
  says: "Heard alone, a text drew the most mind wandering. Heard while read, about as much as reading alone in two experiments; in a third, fast readers going at their own pace wandered more than readers kept to the voice.",
  src: ["kopp"],
};

/** Shown in B: what the studies found for adults reading a language they read well. */
export const FOR_YOU: Finding[] = [
  SELF_PACED,
  SET_PACE,
  ROGOWSKY,
  WANDER,
  {
    dir: "note",
    says: "Eye-tracking shows readers seldom look at the word being said. Their eyes usually run ahead of the voice; second-language readers keep closer to it, and fall behind it more often.",
    src: ["conklin"],
  },
];

export const ARRANGEMENTS: Arrangement[] = [
  {
    id: "read",
    name: "read",
    page: { words: true, picture: false },
    ear: "none",
    line: "Words at the eye, nothing at the ear: printed words are turned to sound and held with other words.",
    findings: [
      {
        dir: "note",
        says: "Adults read non-fiction silently at about 238 words a minute and fiction at about 260 (190 studies, 18,573 readers), and aloud at about 183. The same paper puts audiobooks at 140 to 180, without a source for that figure.",
        src: ["brysbaert"],
      },
      {
        dir: "note",
        says: "Looking back is part of reading. When each word was masked once the eyes had passed it, so it could not be read again, understanding fell, and not only for ambiguous sentences.",
        src: ["schotter"],
      },
    ],
  },
  {
    id: "heard",
    name: "heard",
    page: { words: false, picture: false },
    ear: "same",
    line: "Nothing at the eye, the words at the ear, at the voice's pace and never twice.",
    findings: [
      {
        who: "own",
        dir: "mixed",
        says: "Across 46 studies and 4,687 people, reading and listening came out about even (g = 0.07). Reading at one's own pace did slightly better than listening (g = 0.13), mainly on questions that ask for an inference (g = 0.36) rather than for what was said (g = −0.01).",
        src: ["clinton22"],
      },
      {
        who: "own",
        dir: "lower",
        says: "Listening drew the most mind wandering, about half of the probes against about a third for silent reading, and left the least memory of the text.",
        src: ["varao"],
      },
      {
        dir: "note",
        says: "A sentence heard cannot be read again. When readers were kept from looking back, understanding fell.",
        src: ["schotter"],
      },
      {
        who: "young",
        dir: "higher",
        says: "For younger students, audiobooks alone did better than print (g = 0.28 to 0.58 across the studies reviewed).",
        src: ["singh"],
      },
    ],
  },
  {
    id: "both",
    name: "read while heard",
    page: { words: true, picture: false },
    ear: "same",
    line: "The same words at the eye and the ear. They land in the same place, so the two have to be kept in step, and the voice sets the pace.",
    findings: [
      SELF_PACED,
      SET_PACE,
      ROGOWSKY,
      WANDER,
      {
        who: "own",
        dir: "higher",
        says: "College students learning how lightning forms from a narrated lesson with no pictures learned more when the words were also on screen (effect sizes 0.78 for retention, 1.62 for transfer).",
        src: ["moreno"],
      },
      {
        dir: "mixed",
        says: "Across 57 studies, mostly of university students, words both spoken and written did better than spoken alone, for learners new to the topic, for lessons that ran at a set pace and for lessons without pictures, and no better than written alone.",
        src: ["adesope"],
      },
      {
        dir: "lower",
        says: "For 25 technical apprentices, a technical text both spoken and written, with no diagram, was significantly less efficient than the text spoken alone.",
        src: ["kalyuga04"],
      },
      {
        who: "hard",
        dir: "higher",
        says: "For students with reading disabilities, text-to-speech and read-aloud tools raised comprehension (d = 0.35 across 22 studies): 0.61 between groups, and 0.15, not reliable, within the same students.",
        src: ["wood"],
      },
      {
        who: "hard",
        dir: "higher",
        says: "Audio with print did better than print alone for struggling readers and for learners of English as a foreign language (g = 0.32 to 1.67 across the studies reviewed). The review found few studies of older readers with no reading difficulty.",
        src: ["singh"],
      },
      {
        who: "learning",
        dir: "same",
        says: "35 Japanese university students learning English picked up about as many new words reading a story while hearing it (16% of 28) as reading it (15%); listening alone, 2%. 72% preferred reading while listening.",
        src: ["brown"],
      },
      {
        who: "learning",
        dir: "higher",
        says: "82 Taiwanese students aged 15 and 16 learning English learned more vocabulary from repeated reading with audio than from repeated reading alone.",
        src: ["webb"],
      },
      {
        who: "learning",
        dir: "higher",
        says: "Over 26 weeks, 64 beginner learners of English who read graded readers with audio gained substantially more in reading rate and comprehension than those who read them silently.",
        src: ["chang"],
      },
      {
        who: "learning",
        dir: "lower",
        says: "In a registered report, 86 intermediate-to-advanced Chinese learners of English understood novel excerpts less well reading while listening than reading silently, against the authors’ own prediction. Both did better than listening alone.",
        src: ["hui"],
      },
      {
        who: "learning",
        dir: "lower",
        says: "First-year university learners of English understood a text less well when it was also read aloud word for word than when they only read it.",
        src: ["diao"],
      },
    ],
  },
  {
    id: "narrated",
    name: "a picture, the words spoken",
    page: { words: false, picture: true },
    ear: "same",
    line: "A picture at the eye and the words at the ear: each lands in a place of its own.",
    findings: [
      {
        dir: "higher",
        says: "Across 43 effects, a picture with its words spoken did better than the same picture with the words printed (d = 0.72), most of all when the lesson set the pace.",
        src: ["ginns"],
      },
      {
        dir: "mixed",
        says: "A re-analysis of 86 effects nearly halved that (d = 0.38), and correcting for studies left unpublished brought it to d = 0.20.",
        src: ["reinwein"],
      },
      {
        dir: "higher",
        says: "In six experiments with geometry worked examples, a diagram with its statements spoken did better than the same material all on the page.",
        src: ["mousavi"],
      },
      {
        dir: "higher",
        says: "With diagrams, spoken text did better than the same text printed.",
        src: ["kalyuga99"],
      },
      {
        dir: "lower",
        says: "In a web lesson of about an hour that 111 university students paced for themselves, spoken text lowered retention and transfer against printed text: the effect reversed.",
        src: ["tabbers"],
      },
    ],
  },
  {
    id: "printed",
    name: "a picture, the words printed",
    page: { words: true, picture: true },
    ear: "none",
    line: "A picture and words both at the eye, which can look at one of them at a time.",
    findings: [
      {
        dir: "lower",
        says: "This is what the spoken version is measured against: the same words printed beside a picture did worse than spoken, most of all when the lesson set the pace (d = 0.72 across 43 effects; 0.38 on re-analysis).",
        src: ["ginns", "reinwein"],
      },
      {
        dir: "higher",
        says: "When learners set their own pace through a long lesson, printed words did better than spoken ones.",
        src: ["tabbers"],
      },
    ],
  },
  {
    id: "redundant",
    name: "a picture, the words printed and spoken",
    page: { words: true, picture: true },
    ear: "same",
    line: "A picture and words at the eye, the same words at the ear: the eye leaves the picture to read what the ear already has.",
    findings: [
      {
        dir: "lower",
        says: "College students watching a narrated animation of how lightning forms retained and transferred less when on-screen text summarising or repeating the narration was added.",
        src: ["mayer01"],
      },
      {
        dir: "lower",
        says: "With diagrams, the advantage of spoken text disappeared when the text was also written; the written copy was redundant and interfered with learning.",
        src: ["kalyuga99"],
      },
      {
        dir: "lower",
        says: "On-screen text that helped a narrated lesson with no pictures hurt when an animation played at the same time.",
        src: ["moreno"],
      },
      {
        dir: "mixed",
        says: "On-screen text identical to the narration impaired learning, and slightly reworded text helped. Learners preferred the identical text.",
        src: ["yue"],
      },
      {
        dir: "higher",
        says: "Two or three printed words from the narration, placed beside the diagram, improved retention (d = 0.47 and 0.70) but not transfer.",
        src: ["mayer08"],
      },
      {
        dir: "higher",
        says: "Captions on video, the words printed over moving pictures while they are spoken, improved comprehension of, attention to and memory for the video across more than 100 studies, most for viewers not native to the language, people learning to read, and deaf or hard-of-hearing viewers. A narrative review, with no pooled size.",
        src: ["gernsbacher"],
      },
    ],
  },
  {
    id: "other",
    name: "reading while other words play",
    page: { words: true, picture: false },
    ear: "other",
    line: "Words at the eye and different words at the ear: two streams of words for the one place words are held.",
    findings: [
      {
        dir: "lower",
        says: "Readers answered 57.8% correctly with English speech playing, against 69.4% in quiet; Russian speech cost less (63.8%), and instrumental music and white noise cost nothing reliable. Random real words cost more than spoken nonwords: what did the damage was the speech’s meaning.",
        src: ["martin"],
      },
      {
        dir: "lower",
        says: "Unattended speech disrupted memory for digits read off a screen, by how much it sounded like them and not by what it meant.",
        src: ["salame"],
      },
      {
        dir: "note",
        says: "The multiple-resource model predicts more interference between two tasks the more they share: the stage of processing, the sense, and the code. Two streams of words share the verbal code, even when one comes in at the eye and the other at the ear.",
        src: ["wickens"],
      },
    ],
  },
];
