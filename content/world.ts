/**
 * The world, offered. Dated public happenings and the eras they sat in,
 * drawn faintly on the line so a reader can let in the ones that touched
 * them and set their own days against them. Nothing here is imposed: an
 * offered happening becomes the reader's only when they let it in, and it
 * is then their file, retitled or removed as they like. The instrument never
 * says which of these mattered. Dates are the commonly recorded ones; a
 * reader who remembers it differently should write it as they remember it.
 */
export type Offered = {
  id: string;
  title: string;
  day: string;
  until?: string;
  lane: "happening" | "conjuncture";
  note: string;
};

export const WORLD: Offered[] = [
  // ── eras: the weather people lived in ──
  {
    id: "dial-up",
    title: "The dial-up web",
    day: "1995",
    until: "2004",
    lane: "conjuncture",
    note: "Browsers, modems, the first inboxes.",
  },
  {
    id: "smartphone-era",
    title: "The smartphone era",
    day: "2008",
    until: "now",
    lane: "conjuncture",
    note: "From the App Store onward, the internet in every pocket.",
  },
  {
    id: "zero-rates",
    title: "Zero-interest-rate era",
    day: "2009",
    until: "2022",
    lane: "conjuncture",
    note: "Cheap money after the crash, until inflation ended it.",
  },
  {
    id: "feed-era",
    title: "The feed era",
    day: "2010",
    until: "now",
    lane: "conjuncture",
    note: "Algorithmic timelines: Instagram, the ranked feed, the infinite scroll.",
  },
  {
    id: "recession-2008",
    title: "The recession after 2008",
    day: "2008-09",
    until: "2012",
    lane: "conjuncture",
    note: "The financial crisis and the slow years after it.",
  },
  {
    id: "pandemic",
    title: "The pandemic",
    day: "2020-03",
    until: "2023-05",
    lane: "conjuncture",
    note: "From the WHO's declaration to the end of the global emergency.",
  },
  {
    id: "lockdowns",
    title: "Lockdowns",
    day: "2020-03",
    until: "2021-06",
    lane: "conjuncture",
    note: "Stay-at-home orders, closed borders, the year indoors.",
  },
  {
    id: "remote-work",
    title: "The remote-work turn",
    day: "2020-03",
    until: "now",
    lane: "conjuncture",
    note: "Offices emptied and only partly refilled.",
  },
  {
    id: "generative-ai",
    title: "The generative-AI era",
    day: "2022-11",
    until: "now",
    lane: "conjuncture",
    note: "From ChatGPT onward: models that write, draw and code.",
  },

  // ── happenings: dated public events ──
  {
    id: "web-public",
    title: "The web goes public",
    day: "1991-08-06",
    lane: "happening",
    note: "Tim Berners-Lee posts the World Wide Web summary to Usenet.",
  },
  {
    id: "netscape",
    title: "Netscape Navigator 1.0",
    day: "1994-12-15",
    lane: "happening",
    note: "The browser that took the web mainstream.",
  },
  {
    id: "google",
    title: "Google founded",
    day: "1998-09-04",
    lane: "happening",
    note: "",
  },
  {
    id: "9-11",
    title: "September 11 attacks",
    day: "2001-09-11",
    lane: "happening",
    note: "",
  },
  {
    id: "iraq",
    title: "Invasion of Iraq begins",
    day: "2003-03-20",
    lane: "happening",
    note: "",
  },
  {
    id: "facebook",
    title: "Facebook launches",
    day: "2004-02-04",
    lane: "happening",
    note: "",
  },
  {
    id: "tsunami-2004",
    title: "Indian Ocean tsunami",
    day: "2004-12-26",
    lane: "happening",
    note: "",
  },
  {
    id: "youtube",
    title: "YouTube launches",
    day: "2005-02-14",
    lane: "happening",
    note: "",
  },
  {
    id: "twitter",
    title: "Twitter opens to the public",
    day: "2006-07-15",
    lane: "happening",
    note: "",
  },
  {
    id: "iphone",
    title: "The iPhone is announced",
    day: "2007-01-09",
    lane: "happening",
    note: "",
  },
  {
    id: "lehman",
    title: "Lehman Brothers collapses",
    day: "2008-09-15",
    lane: "happening",
    note: "The moment the financial crisis became undeniable.",
  },
  {
    id: "obama",
    title: "Obama elected",
    day: "2008-11-04",
    lane: "happening",
    note: "",
  },
  {
    id: "bitcoin",
    title: "Bitcoin's first block",
    day: "2009-01-03",
    lane: "happening",
    note: "",
  },
  {
    id: "instagram",
    title: "Instagram launches",
    day: "2010-10-06",
    lane: "happening",
    note: "",
  },
  {
    id: "tahrir",
    title: "Tahrir Square: the Egyptian revolution begins",
    day: "2011-01-25",
    lane: "happening",
    note: "The Arab Spring's largest uprising.",
  },
  {
    id: "fukushima",
    title: "Tōhoku earthquake and Fukushima",
    day: "2011-03-11",
    lane: "happening",
    note: "",
  },
  {
    id: "snowden",
    title: "The Snowden disclosures begin",
    day: "2013-06-06",
    lane: "happening",
    note: "",
  },
  {
    id: "brexit",
    title: "Brexit referendum",
    day: "2016-06-23",
    lane: "happening",
    note: "",
  },
  {
    id: "demonetisation",
    title: "India demonetises ₹500 and ₹1000 notes",
    day: "2016-11-08",
    lane: "happening",
    note: "Announced at 8 pm; the notes ceased to be legal tender at midnight.",
  },
  {
    id: "trump-2016",
    title: "Trump elected",
    day: "2016-11-08",
    lane: "happening",
    note: "",
  },
  {
    id: "metoo",
    title: "#MeToo spreads",
    day: "2017-10-15",
    lane: "happening",
    note: "",
  },
  {
    id: "cambridge-analytica",
    title: "Cambridge Analytica revealed",
    day: "2018-03-17",
    lane: "happening",
    note: "",
  },
  {
    id: "covid-reported",
    title: "COVID-19 first reported to the WHO",
    day: "2019-12-31",
    lane: "happening",
    note: "",
  },
  {
    id: "pandemic-declared",
    title: "WHO declares a pandemic",
    day: "2020-03-11",
    lane: "happening",
    note: "",
  },
  {
    id: "india-lockdown",
    title: "India's nationwide lockdown announced",
    day: "2020-03-24",
    lane: "happening",
    note: "Twenty-one days, at four hours' notice; it ran far longer.",
  },
  {
    id: "george-floyd",
    title: "George Floyd killed",
    day: "2020-05-25",
    lane: "happening",
    note: "",
  },
  {
    id: "biden",
    title: "Biden elected",
    day: "2020-11-03",
    lane: "happening",
    note: "",
  },
  {
    id: "capitol",
    title: "US Capitol attacked",
    day: "2021-01-06",
    lane: "happening",
    note: "",
  },
  {
    id: "india-second-wave",
    title: "India's second wave",
    day: "2021-04",
    until: "2021-06",
    lane: "conjuncture",
    note: "The Delta wave; oxygen shortages; the cremation grounds.",
  },
  {
    id: "ukraine",
    title: "Russia invades Ukraine",
    day: "2022-02-24",
    lane: "happening",
    note: "",
  },
  {
    id: "chatgpt",
    title: "ChatGPT released",
    day: "2022-11-30",
    lane: "happening",
    note: "The research preview that made language models a public fact.",
  },
  {
    id: "gpt-4",
    title: "GPT-4 released",
    day: "2023-03-14",
    lane: "happening",
    note: "",
  },
  {
    id: "who-emergency-ends",
    title: "WHO ends the COVID-19 global emergency",
    day: "2023-05-05",
    lane: "happening",
    note: "",
  },
  {
    id: "gaza",
    title: "Hamas attacks Israel; the Gaza war begins",
    day: "2023-10-07",
    lane: "happening",
    note: "",
  },
  {
    id: "india-2024",
    title: "India's 2024 election results",
    day: "2024-06-04",
    lane: "happening",
    note: "A third term for Modi, without a majority of his own.",
  },
  {
    id: "trump-2024",
    title: "Trump elected again",
    day: "2024-11-05",
    lane: "happening",
    note: "",
  },
  {
    id: "deepseek",
    title: "DeepSeek shock",
    day: "2025-01-27",
    lane: "happening",
    note: "A cheap open model and a bad day for chip stocks.",
  },
];

/** The tag a let-in happening carries, so the line knows it is already here. */
export const worldTag = (id: string) => `world:${id}`;
