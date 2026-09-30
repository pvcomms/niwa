import type { Round, Rules } from "../lib/toll.ts";

/**
 * Every word of the toll. The four rounds follow Dana, Cain & Dawes (2006),
 * whose door was offered after the split was chosen; the feed is the garden's
 * own round and no study ran it. The room's dollars are illustrative and the
 * sheet says so.
 */

export const LEAD = [
  "Give a person ten dollars and a stranger to share it with, and most send something. It looks like wanting to help.",
  "Then offer them nine dollars to leave before the stranger is told there was a game at all. A third of people in the study took it: a dollar paid so that someone they will never meet, who does not know their name, would not know what they did.",
];

export const ROUNDS: {
  round: Round;
  name: string;
  text: string;
  /** what the door is called in this round, if it has one */
  door?: string;
}[] = [
  {
    round: "envelope",
    name: "the envelope",
    text: "You have ten dollars. In another room sits a stranger you will never meet. They know a game is being played and that someone is deciding. Send them whatever you like, from nothing to all ten. They will see what you sent.",
  },
  {
    round: "door",
    name: "the door",
    text: "Before your split is carried out, the person running the game makes an offer no one mentioned. Take nine dollars and leave now, and the stranger is never told there was a game, a ten, or a you.",
    door: "take $9 and leave",
  },
  {
    round: "feed",
    name: "the feed",
    text: "Ten dollars again, and a new stranger. This time what you send is posted under your name to everyone who follows you, and to everyone they pass it to. The door is there, and it keeps a receipt: take it and the post says you took nine and left.",
    door: "take $9 and leave, posted",
  },
  {
    round: "none",
    name: "no one",
    text: "Ten dollars again, and a new stranger. Whatever you send reaches them as a bonus on their pay for something else. They are never told there was a game, a ten, or a you, and no one else will see it. The door is there too.",
    door: "take $9 and leave",
  },
];

/** What the study found, set beside the reader's rounds. Never over them. */
export const STUDY: { count: string; text: string }[] = [
  {
    count: "11 of 40",
    text: "took the door when it was offered after they had chosen their split (study 1). 9 of the 11 had chosen to send something.",
  },
  {
    count: "43 in 100",
    text: "took it in the second study, with the stranger told of the game as before.",
  },
  {
    count: "almost none",
    text: "took it when the stranger would get the money as a bonus from nowhere and never learn there was a game: the round called no one here.",
  },
];

export const STUDY_NOTE =
  "Dana, Cain & Dawes (2006). The authors read it as giving that is often about not letting down what another person expects, more than about their welfare. The feed is this page's own round; no one in the study was posted.";

/** The claim, before the room. */
export const SIGNAL = [
  "A signal is an act that is cheaper, or more likely, when what it says is so.",
  "“I speak Spanish” costs nothing to say. It is believed where a false claim is found out and held against the one who made it, because then it costs more to say falsely than truly. Take the finding-out away and the words stop carrying anything, and something dearer has to stand in for them.",
];

/** The room walked through, one set of rules at a time. Illustrative dollars. */
export const CHAIN: { name: string; rules: Rules; text: string }[] = [
  {
    name: "high trust",
    rules: { worth: 20, ifSo: 0, ifNot: 60 },
    text: "The act is saying it. Saying it costs nothing if it is so. If it is not, someone will ask you something in Spanish, and your name follows you: sixty dollars of standing. Being believed is worth twenty. The forty say it, the rest keep quiet, and a word is enough. The room spends nothing.",
  },
  {
    name: "low trust",
    rules: { worth: 20, ifSo: 0, ifNot: 5 },
    text: "Now the room is strangers who will not meet again. A false claim is rarely found out and nothing follows anyone home: saying it falsely costs five dollars of unease. Being believed is still worth twenty, so all hundred say it. Of those who say it, forty in a hundred are so — the same as the room. The word has stopped carrying anything.",
  },
  {
    name: "high receipt",
    rules: { worth: 20, ifSo: 10, ifNot: 40 },
    text: "So the listener asks for a receipt: a certificate, a test, a conversation on the spot. It costs ten dollars of time to someone who speaks it and forty to someone who would have to fake it. At twenty, only the forty do it. The act carries the claim again, and the room pays four hundred dollars for what a word used to do.",
  },
  {
    name: "high signalling",
    rules: { worth: 60, ifSo: 10, ifNot: 40 },
    text: "Then everyone is watching. Posted and passed on, being believed is worth sixty. At sixty the forty-dollar receipt is worth faking, so all hundred show one, and of those who do, forty in a hundred are so. The room spends two thousand eight hundred dollars and a stranger learns nothing from the receipt.",
  },
  {
    name: "the rules change",
    rules: { worth: 60, ifSo: 30, ifNot: 90 },
    text: "The receipt that carries the claim now is one that costs more to fake than being believed is worth: thirty to the forty, ninety to the rest. Only the forty show it. It says what a word said in the first room, and the room spends twelve hundred dollars to say it.",
  },
];

/** The same shape elsewhere. */
export const ELSEWHERE: { where: string; how: string }[] = [
  {
    where: "Rapa Nui",
    how: "Jared Diamond told Easter Island as chiefs out-building each other in stone until the island was spent. Hunt and Lipo read the same island otherwise, and the story is contested. As a shape it is the last room: a signal that holds only while it keeps getting dearer.",
  },
  {
    where: "visible goods",
    how: "Black and Hispanic households in the US spend about thirty percent more on what others can see — clothes, jewellery, cars — than White households of like income, and the gap tracks how poor the group around them is. Charles, Hurst and Roussanov find it comes with less spent on education and health.",
  },
  {
    where: "less and fewer",
    how: "Correcting a sentence that was already clear. Paul Fussell's Class (1983) reads that kind of care as a class marker: it costs attention that is cheaper to those who were taught it young.",
  },
  {
    where: "a Super Bowl ad",
    how: "Thirty seconds that say little about the product, except that the firm can afford them and expects to be around long enough to earn them back.",
  },
  {
    where: "the feed",
    how: "Every act leaves a receipt and the audience has no edge. What being believed is worth goes up, and with it what an act must cost before it tells anyone anything. The quiet door of the second round is the thing a feed does not have.",
  },
];

/** What the toll leaves to the reader. */
export const LEAVES =
  "Whether what you sent under watch was for the stranger or for the watching is yours to say. So is which room you would rather live in: one where a word is enough, or one where everything has to be shown.";

export const NUMBERS_NOTE =
  "The four rounds follow the study; the room's dollars are illustrative, set so each rule change shows. Nothing on this page is kept.";

export const SOURCES: { cite: string; href?: string }[] = [
  {
    cite: "Dana, J., Cain, D. M. & Dawes, R. M. (2006). What you don't know won't hurt me: costly (but quiet) exit in dictator games. Organizational Behavior and Human Decision Processes, 100(2), 193–201.",
    href: "https://doi.org/10.1016/j.obhdp.2005.10.001",
  },
  {
    cite: "Spence, M. (1973). Job market signaling. Quarterly Journal of Economics, 87(3), 355–374.",
    href: "https://doi.org/10.2307/1882010",
  },
  {
    cite: "Charles, K. K., Hurst, E. & Roussanov, N. (2009). Conspicuous consumption and race. Quarterly Journal of Economics, 124(2), 425–467.",
    href: "https://doi.org/10.1162/qjec.2009.124.2.425",
  },
  {
    cite: "Fussell, P. (1983). Class: A Guide Through the American Status System. Summit Books.",
  },
  {
    cite: "Diamond, J. (2005). Collapse: How Societies Choose to Fail or Succeed. Viking. Hunt, T. & Lipo, C. (2011). The Statues That Walked. Free Press.",
  },
  {
    cite: "Yvain (2012). What is signaling, really? LessWrong.",
    href: "https://www.lesswrong.com/posts/KheBaeW8Pi7LwewoF/what-is-signaling-really",
  },
];
