import type { Provenance } from "../lib/provenance.ts";

/**
 * Specimen A's provenance — a claim about remote work that reached the
 * synthetic life through four hands, written to show the instrument on a
 * deployed garden, which has no provenances to read. Every hand, quote,
 * gain and check here is fiction; the survey does not exist.
 */
export const SPECIMEN_PROVENANCE: Provenance = {
  slug: "2026-09-19-remote-workers-are-always-the-first-to-go",
  title: "Remote workers are always the first to go",
  claim:
    "Remote workers are always the first to go when a company cuts — everyone knows it, the data shows it.",
  origin:
    "In a survey of 412 managers at firms with more than 200 staff, 31% said an employee's location would be one factor among several in any future reduction.",
  originWho: "a consultancy's annual workplace survey (2024)",
  stone: null,
  knowing: ["read", "told"],
  hops: [
    {
      id: "ha1",
      who: "a business desk",
      channel: "press",
      where: "a national paper",
      day: "2024-11",
      said: "Remote staff first in line for cuts, survey finds. A new survey has found that remote workers could be first in line when companies cut staff, with nearly a third of managers saying location would be a factor.",
      link: "",
      seen: null,
      gains: "the headline gets the click; the desk is measured on clicks",
      runsOn: "advertising and subscriptions",
      record: "",
      reframed: true,
      turns: [
        {
          id: "ta1",
          was: "one factor among several",
          became: "first in line",
          by: "you",
          kept: true,
        },
      ],
      asked: [],
    },
    {
      id: "ha2",
      who: "@officeguy",
      channel: "post",
      where: "x.com",
      day: "2025-02",
      said: "They're coming for remote work. Wake up. Nobody who WFH is safe — a new study found remote workers are ALWAYS first to be cut. Let that sink in.",
      link: "https://x.com/officeguy/status/1",
      seen: {
        title: "@officeguy on X",
        host: "x.com",
        words:
          "They're coming for remote work. Wake up. Nobody who WFH is safe — a new study found remote workers are ALWAYS first to be cut. Let that sink in. My Presence Playbook is 40% off this week.",
        on: "2026-09-18",
      },
      gains: "sells a 'presence playbook' course; the post links to it",
      runsOn: "course sales · 140k followers",
      record:
        "said the same about 'quiet quitting' in 2023; the study he cited then was a poll of 80 people",
      reframed: true,
      turns: [
        {
          id: "ta2",
          was: "could be first in line",
          became: "ALWAYS first to be cut",
          by: "proposed",
          kept: false,
        },
      ],
      asked: [
        {
          id: "qa1",
          text: "who paid for the survey he calls a study?",
          answer: "",
          by: "you",
          kept: true,
        },
        {
          id: "qa2",
          text: "did he link the survey, or the paper's headline about it?",
          answer: "the paper",
          by: "proposed",
          kept: true,
        },
      ],
    },
    {
      id: "ha3",
      who: "the For You feed",
      channel: "feed",
      where: "x.com",
      day: "2025-02",
      said: "",
      link: "",
      seen: null,
      gains: "keeps me scrolling",
      runsOn: "attention, sold as ads",
      record: "",
      reframed: null,
      turns: [],
      asked: [],
    },
    {
      id: "ha4",
      who: "Dana, at lunch",
      channel: "talk",
      where: "the office",
      day: "2026-03",
      said: "Remote is over. Everyone knows the numbers — first to go.",
      link: "",
      seen: null,
      gains: "",
      runsOn: "",
      record: "",
      reframed: false,
      turns: [],
      asked: [],
    },
  ],
  checks: [
    {
      id: "ca1",
      text: "find the survey and read the question as it was asked",
      how: "the consultancy publishes it as a PDF; look for 'one factor among several'",
      went: "held",
      on: "2026-09-20",
      by: "you",
      kept: true,
    },
    {
      id: "ca2",
      text: "find one firm that cut this year and what it said about location",
      how: "a filing or the firm's own note, not a report of one",
      went: "",
      on: null,
      by: "proposed",
      kept: false,
    },
  ],
  note: "The 31% survived the whole way. 'One factor among several' did not.",
  recorded: "2026-09-19",
  touched: "2026-09-20",
};
