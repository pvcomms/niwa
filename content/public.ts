/**
 * What the public garden is allowed to contain. Edit this file, not the builder.
 *
 * The rule the public build follows: the private graph supplies *topology only*
 * — which idea is practised where. Every string that ships comes from something
 * already public (a GitHub description, a live URL) or from Param's own glossary
 * essays. No memory body, description or filename ever crosses over.
 */

/** Live public surfaces, keyed by the memory node whose edges they inherit. */
export const PUBLIC_SITES: {
  id: string;
  label: string;
  description: string;
  url: string;
}[] = [
  {
    id: "project_keep",
    label: "Keep",
    description:
      "Biometric commitment markets — self-directed stakes, charity forfeit on a miss.",
    url: "https://keep-wine.vercel.app",
  },
  {
    id: "project_pickless",
    label: "Pickless",
    description:
      "A food-decision agent that returns one dish, one restaurant, one link.",
    url: "https://picklessai.vercel.app",
  },
  {
    id: "project_bonp",
    label: "BONP",
    description:
      "Biometric Oracle Network Protocol — signed envelopes for biometric claims.",
    url: "https://biometric-oracle-protocol.vercel.app",
  },
  {
    id: "project_arxiv_digest",
    label: "arxiv-digest",
    description:
      "An arXiv URL in, a digest written for one particular stack out.",
    url: "https://arxiv-digest-hazel.vercel.app",
  },
  {
    id: "project_param_hub_v2",
    label: "Param Hub",
    description: "Personal life-OS dashboard, warm-paper and warm-obsidian.",
    url: "https://likehearted.life",
  },
  {
    id: "project_wired_different",
    label: "Wired Different",
    description:
      "A course on building software with the attention you actually have.",
    url: "https://wired-different.vercel.app",
  },
  {
    id: "project_board_of_directors_app",
    label: "Board of Directors",
    description:
      "A standing advisory board of agents that deliberates before it answers.",
    url: "https://board-of-directors-app.vercel.app",
  },
  {
    id: "project_postphenom",
    label: "postphenom",
    description:
      "Center for Applied Postphenomenology — how instruments shape what they measure.",
    url: "https://postphenom.com",
  },
  {
    id: "project_cohort_study",
    label: "Cohort Study",
    description: "A long-form study of one cohort, run in public.",
    url: "https://cohortstudy.co",
  },
];

/**
 * Concepts held back from the public build. A term belongs here when its own
 * glossary definition says something about the person rather than the idea.
 */
export const WITHHELD_CONCEPTS = [
  // Its definition is about how one person's attention works, not about the idea.
  "Hypercuriosity",
  // Names the private stands and their ports (shosai :4646, yomu :4545), the
  // Tailscale arrangement, which registrars hold the domains, and the VPS.
  // That is an infrastructure map, not an idea. Not publishable as written.
  "Shipping Stack",
];

/**
 * Deliberate, reviewable holes in the tripwire audit. Each one needs a reason
 * that says why the term is *already* public — never "it's probably fine".
 */
export const AUDIT_EXCEPTIONS: { id: string; tripwire: string; why: string }[] =
  [
    {
      id: "repo:kiku",
      tripwire: "private stand or infrastructure",
      why: "kiku was a local-only stand when the tripwire list was written; github.com/pvcomms/kiku is public as of 2026-09-17. The node is built entirely from GitHub's own API response, so its name and URL are public by construction.",
    },
    {
      id: "repo:niwa",
      tripwire: "private stand or infrastructure",
      why: "Same: github.com/pvcomms/niwa is public as of 2026-09-17. Publishing the tool's own source is not the same as publishing the corpus it reads — /data/ is gitignored and has never been committed.",
    },
    {
      id: "repo:mcp-fleet",
      tripwire: "private stand or infrastructure",
      why: "The description names Spaceship as one of four APIs the repo wraps. That sentence is already the public description on github.com/pvcomms/mcp-fleet — it names a product the code talks to, not where the domains actually live.",
    },
  ];

/** Shown on the public colophon instead of the private findings. */
export const PUBLIC_BLURB =
  "A map of the vocabulary behind the work — which ideas are load-bearing, and where each one is actually practised.";
