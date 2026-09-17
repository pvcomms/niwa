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
      "Vibecoding × ADHD — a course on building with the attention you actually have.",
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
 * Concepts held back from the public build.
 * Hypercuriosity defines itself as "the ADHD-adjacent trait" — a health
 * disclosure. ADHD is already public via wired-different, so this is a
 * deliberate default, not a hard rule: delete the line to publish it.
 */
export const WITHHELD_CONCEPTS = [
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
      id: "project_wired_different",
      tripwire: "medication or health",
      why: "wired-different.vercel.app is a live public course whose entire subject is ADHD. Naming it discloses nothing that the site does not already say on its landing page.",
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
