import type { Position } from "../lib/keel.ts";

/**
 * Every word of the keel: the claim, the twelve positions with the comment a
 * crowd on either side would post, the feed between them, what was arranged,
 * what the studies found, the rooms, the articles, the coda, the sources.
 * From the Center's instrument Stop Flowing (github.com/pvcomms/stop-flowing).
 */

export const LEAD = [
  "A self put together from the feed has no keel. Its positions sit wherever the current last left them. From the inside, a position you drifted into feels exactly like one you hold. You can only tell them apart by moving the crowd and watching which ones go with it.",
  "Gen Z is the first cohort to grow up with the crowd in the room all the time: a count under every post, a poll under every opinion, a separate audience in every app and a separate self for each. Kenneth Gergen described the condition in 1991, before any of it fit in a pocket, as a self spread across more relationships than it can hold together. Zygmunt Bauman called the period liquid. A liquid takes the shape of whatever it is poured into, and keeps no shape of its own.",
  "On this account, believing in something is less a feeling than a behaviour. It is a position that stays where it is when the room turns, and that you would say out loud in every room you're in. Both halves can be measured, roughly, on one person in one sitting.",
];

export const STATIONS = [
  { n: "I", name: "alone", what: "Twelve positions. Nobody else in the room." },
  {
    n: "II",
    name: "the current",
    what: "The same twelve inside a feed. Six arrive with a crowd.",
  },
  {
    n: "III",
    name: "the keel",
    what: "What moved, which way, measured against your own noise.",
  },
  {
    n: "IV",
    name: "the rooms",
    what: "The positions you'd defend, and where you'd actually say them.",
  },
  {
    n: "V",
    name: "articles",
    what: "Written down, with what would change your mind.",
  },
] as const;

export const POSITIONS: Position[] = [
  {
    id: "album",
    topic: "taste",
    text: "An album should be heard start to finish, in order, at least once.",
    agree:
      "the album is the unit. shuffle is how you end up with no taste of your own",
    disagree:
      "nobody has fifty minutes for one artist. singles are the format now, let it go",
  },
  {
    id: "taste",
    topic: "taste",
    text: "Someone's music taste tells you something real about them.",
    agree:
      "show me your top five and i'll tell you who you are. it's never wrong",
    disagree:
      "judging people by playlists is so 2014. your taste is whatever the algorithm fed you that year",
  },
  {
    id: "product",
    topic: "the feed",
    text: "If a product keeps turning up in your feed, it's probably good.",
    agree:
      "if everyone's buying it there's a reason. the crowd isn't that dumb",
    disagree:
      "it's in your feed because someone paid for it to be. that's the whole trick",
  },
  {
    id: "brand",
    topic: "the feed",
    text: "Paying more for the brand gets you something real.",
    agree:
      "quality, resale, how people read you. it's not nothing, it's the point",
    disagree: "you're paying for the logo and the ad budget. same factory",
  },
  {
    id: "take",
    topic: "the news cycle",
    text: "You should have a view on the big story of the week.",
    agree:
      "silence is a position. if you're not saying anything you've already picked a side",
    disagree:
      "you don't owe anyone a take on something you read about for four minutes",
  },
  {
    id: "reply",
    topic: "the news cycle",
    text: "A message deserves a reply within the hour.",
    agree: "leaving people on read for a day is a choice and everyone knows it",
    disagree:
      "being reachable all the time isn't a virtue. reply when you have something to say",
  },
  {
    id: "meaning",
    topic: "work",
    text: "Work should mean something, even if it pays less.",
    agree:
      "life's too short to sell your hours to something you don't care about",
    disagree: "meaning is a luxury. get paid, find the meaning on the weekend",
  },
  {
    id: "public",
    topic: "work",
    text: "Posting your work in public is part of doing it.",
    agree:
      "if no one sees it, it didn't happen. build in public or don't build",
    disagree: "the best work i know was done by people nobody was watching",
  },
  {
    id: "friend",
    topic: "people",
    text: "One close friend is worth more than a wide circle.",
    agree:
      "one person who'd pick up at 3am beats four hundred followers. not close",
    disagree:
      "putting everything on one person is fragile. a wide circle is how people actually get through things",
  },
  {
    id: "there",
    topic: "people",
    text: "Being at the thing matters more than being seen at it.",
    agree: "put the phone away. if you were filming it you weren't there",
    disagree:
      "if you didn't post it, half the people you'd have met there never find you",
  },
  {
    id: "same",
    topic: "self",
    text: "Who you are online and who you are offline should be the same person.",
    agree:
      "if your account and your actual self would hate each other, that's a problem",
    disagree:
      "everyone has an online version. different rooms, different selves. that's just being a person",
  },
  {
    id: "mind",
    topic: "self",
    text: "Changing your mind often is better than being set in your ways.",
    agree:
      "strong opinions, loosely held. if you haven't changed your mind this year you weren't paying attention",
    disagree:
      "people who change their minds every week don't have minds, they have feeds",
  },
];

/** The current between the questions. All invented. */
export const FILLER = [
  { k: "Trending", t: "“main character energy” is back", m: "1.1M posts" },
  {
    k: "Sponsored",
    t: "The only notebook you'll need this year.",
    m: "38,000 sold this week",
  },
  {
    k: "Breaking",
    t: "Everyone is talking about it. Here's what to think.",
    m: "updated 4 min ago",
  },
  {
    k: "For you",
    t: "“if you're still doing this in 2026 we need to talk”",
    m: "212k likes",
  },
  {
    k: "Sponsored",
    t: "Your friends already switched.",
    m: "9 people you know",
  },
  {
    k: "Trending",
    t: "Take of the day, quoted 48,000 times.",
    m: "you haven't weighed in",
  },
];

export const WORDS = [
  "strongly disagree",
  "disagree",
  "slightly disagree",
  "unsure",
  "slightly agree",
  "agree",
  "strongly agree",
];

export const ALONE =
  "Answer as yourself, and don't deliberate. There are no right answers and nobody is counting yet. When you go on, these twelve are sealed until the keel.";

export const CURRENT =
  "A feed. Scroll it the way you would scroll one. The twelve come back in a different order among the posts, and you answer each again. You don't have to remember what you said.";

export const ARRANGED =
  "The polls in the current were made on this page after you finished alone. Each was placed on the far side of your first answer, with roughly four votes in five against you, and its top comment was written to argue that side. There were no voters. The six marked no votes yet were the control: the same questions, asked twice, with nobody in the room. One of each pair of topics got a crowd, chosen at random.";

export const AFTER = [
  "Carried means you moved toward the crowd. Pushed back means you moved away from it. Neither one held. A position that moves away from a crowd is still being placed by the crowd. Jack Brehm called the push-back reactance in 1966: the urge to take back a freedom someone seems to be removing. The contrarian is carried by the same current, only the other way.",
  "None of this is new, only the scale of it. In Solomon Asch's line-judging studies about a third of the answers on the critical trials went with a unanimous, plainly wrong majority, and about a quarter of people never went along at all. Deutsch and Gerard split the pull in two: informational, they probably know something; normative, you'd like them to like you. A feed runs both at once, all day. When Salganik, Dodds and Watts let 14,341 people see what others had downloaded, success in their music market became more unequal and less predictable; the best songs rarely did badly and the worst rarely did well, but anything between could happen. On a news site, a single planted up-vote made the next rating 32 percent more likely to be positive, and the herding lifted final ratings by a quarter. Planted down-votes got corrected.",
];

export const ROOMS_LEAD =
  "Holding a position is half of it. The other half is whether it comes with you. The Center's working line is that coherence between your online and offline self is the purest act of protest still available. Choose up to three of the twelve you would defend, and say what you'd do with each in four rooms.";

export const COLLAPSE =
  "Alice Marwick and danah boyd called the problem of one post reaching every audience at once context collapse. The usual fix is to keep the rooms apart: an account for each audience and a version of you for each account. It works. It also means no single room ever sees the whole of you, and that includes you. The fragmentation is less in what you believe than in where you let it show.";

export const ARTICLES_LEAD =
  "James Marcia sorted identity by two questions: have you looked around, and have you committed? Diffusion is neither. Foreclosure is commitment without looking, a belief handed to you whole. Achievement is both. So each article asks for both at once: what you believe in your own words, where it came from, and what would move it. A belief can say what would change it. A current needs no reason to move, only a crowd.";

export const CODA =
  "“Believe in something” ran as a Nike advertising line in September 2018. The current will carry even the instruction to stand still. So the test was never whether you believe in something. It is whether the thing stays put when the room turns, and whether you would say it in every room you are in.";

export const LIMITS = [
  "Twelve positions, one sitting. Noise rests on six questions, so it is rough, and the pull can come out at zero or below by chance.",
  "The name warned you and the crowd is plainly a page's crowd. Asch's participants had no warning. A warning makes people stiffer, so whatever moved here moved with your guard up.",
  "You may have remembered your first answers and matched them on purpose. That counts: choosing to be consistent is one of the ways a keel gets built.",
  "This measures where you stand on twelve statements. It says nothing about who you are.",
];

export const SOURCES = [
  {
    cite: "Asch, S. E. (1956). Studies of independence and conformity: I. A minority of one against a unanimous majority. Psychological Monographs, 70(9), 1–70.",
    href: "https://doi.org/10.1037/h0093718",
  },
  {
    cite: "Deutsch, M., & Gerard, H. B. (1955). A study of normative and informational social influences upon individual judgment. Journal of Abnormal and Social Psychology, 51(3), 629–636.",
    href: "https://doi.org/10.1037/h0046408",
  },
  {
    cite: "Salganik, M. J., Dodds, P. S., & Watts, D. J. (2006). Experimental study of inequality and unpredictability in an artificial cultural market. Science, 311(5762), 854–856.",
    href: "https://doi.org/10.1126/science.1121066",
  },
  {
    cite: "Muchnik, L., Aral, S., & Taylor, S. J. (2013). Social influence bias: A randomized experiment. Science, 341(6146), 647–651.",
    href: "https://doi.org/10.1126/science.1240466",
  },
  {
    cite: "Brehm, J. W. (1966). A Theory of Psychological Reactance. Academic Press.",
  },
  {
    cite: "Marwick, A. E., & boyd, d. (2011). I tweet honestly, I tweet passionately: Twitter users, context collapse, and the imagined audience. New Media & Society, 13(1), 114–133.",
    href: "https://doi.org/10.1177/1461444810365313",
  },
  {
    cite: "Marcia, J. E. (1966). Development and validation of ego-identity status. Journal of Personality and Social Psychology, 3(5), 551–558.",
    href: "https://doi.org/10.1037/h0023281",
  },
  {
    cite: "Campbell, J. D., et al. (1996). Self-concept clarity: Measurement, personality correlates, and cultural boundaries. Journal of Personality and Social Psychology, 70(1), 141–156.",
    href: "https://doi.org/10.1037/0022-3514.70.1.141",
  },
  {
    cite: "Gergen, K. J. (1991). The Saturated Self: Dilemmas of Identity in Contemporary Life. Basic Books.",
  },
  { cite: "Bauman, Z. (2000). Liquid Modernity. Polity." },
];

export const CLARITY =
  "Self-concept clarity (Campbell and colleagues) is the research name for what this sheet calls a keel: how clearly and consistently a person's beliefs about themselves are defined, and how stable they stay over time.";

/**
 * A sitting that never happened, drawn as the keel would draw it: topic, first
 * answer, second answer, and where the crowd stood (null for the control).
 */
export const SPECIMEN: [string, number, number, number | null][] = [
  ["taste", 6, 6, 2.3],
  ["taste", 5, 5, null],
  ["the feed", 2, 4, 5.8],
  ["the feed", 3, 3, null],
  ["news", 5, 3, 2.1],
  ["news", 4, 5, null],
  ["work", 7, 7, 2.2],
  ["work", 3, 4, null],
  ["people", 6, 6, null],
  ["people", 5, 6, 2.4],
  ["self", 6, 6, 1.9],
  ["self", 3, 2, null],
];
