import type { Garden, GardenNode } from "./garden";
import {
  PUBLIC_SITES,
  WITHHELD_CONCEPTS,
  AUDIT_EXCEPTIONS,
} from "../content/public.ts";

export type PublicRepo = { name: string; description: string; url: string };

/**
 * Projects the private garden onto public ground.
 *
 * Topology survives, text does not. A node only appears if it is a glossary
 * concept (Param's own writing), a repo that is public on GitHub, or a site with
 * a live public URL — and in the last two cases every string is replaced with the
 * already-public one. Nothing reads a memory body, description or filename.
 */
export function buildPublicGarden(full: Garden, repos: PublicRepo[]): Garden {
  const withheld = new Set(WITHHELD_CONCEPTS.map((c) => c.toLowerCase()));
  const repoByName = new Map(repos.map((r) => [r.name.toLowerCase(), r]));
  const siteById = new Map(PUBLIC_SITES.map((s) => [s.id, s]));

  const nodes = new Map<string, GardenNode>();
  const survives = new Set<string>();

  for (const n of full.nodes) {
    if (n.kind === "concept") {
      if (withheld.has(n.label.toLowerCase())) continue;
      // A concept ships as itself: Param wrote it, and it is about an idea.
      nodes.set(n.id, {
        ...n,
        file: null, // never leak a home-directory path
        degree: 0,
      });
      survives.add(n.id);
      continue;
    }

    if (n.kind === "repo") {
      const repo = repoByName.get(n.label.toLowerCase());
      if (!repo) continue; // private repo — drop it, name included
      nodes.set(n.id, {
        id: n.id,
        label: repo.name,
        kind: "repo",
        description: repo.description,
        body: "",
        file: repo.url,
        modified: n.modified,
        stage: n.stage,
        signed: null,
        degree: 0,
        source: "code",
      });
      survives.add(n.id);
      continue;
    }

    const site = siteById.get(n.id);
    if (site) {
      nodes.set(n.id, {
        id: n.id,
        label: site.label,
        kind: "project",
        description: site.description,
        body: "",
        file: site.url,
        modified: n.modified,
        stage: n.stage,
        signed: null,
        degree: 0,
        source: "memory",
      });
      survives.add(n.id);
    }
  }

  // A public repo with no local checkout has no node in the private graph, so it
  // would silently vanish from the public one. Add the rest from GitHub directly.
  for (const repo of repos) {
    const id = `repo:${repo.name}`;
    if (nodes.has(id)) continue;
    nodes.set(id, {
      id,
      label: repo.name,
      kind: "repo",
      description: repo.description,
      body: "",
      file: repo.url,
      modified: null,
      stage: "unknown",
      signed: null,
      degree: 0,
      source: "code",
    });
    survives.add(id);
  }

  const links = full.links.filter((l) => {
    const s = typeof l.source === "string" ? l.source : (l.source as any).id;
    const t = typeof l.target === "string" ? l.target : (l.target as any).id;
    return survives.has(s) && survives.has(t) && l.kind !== "seed";
  });

  // Concepts also reach repos through their public GitHub description — public
  // text matched against public text, so this adds edges without adding exposure.
  const seen = new Set(
    links.map((l) => {
      const s = typeof l.source === "string" ? l.source : (l.source as any).id;
      const t = typeof l.target === "string" ? l.target : (l.target as any).id;
      return `${s}→${t}`;
    }),
  );
  for (const concept of [...nodes.values()].filter(
    (n) => n.kind === "concept",
  )) {
    const term = concept.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const multiword = /\s/.test(concept.label);
    const re = new RegExp(`(?<![\\w-])${term}(?![\\w-])`, multiword ? "i" : "");
    for (const repo of repos) {
      if (!re.test(repo.description)) continue;
      const key = `${concept.id}→repo:${repo.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({
        source: concept.id,
        target: `repo:${repo.name}`,
        kind: "concept",
      });
    }
  }

  for (const l of links) {
    const s = typeof l.source === "string" ? l.source : (l.source as any).id;
    const t = typeof l.target === "string" ? l.target : (l.target as any).id;
    const sn = nodes.get(s);
    const tn = nodes.get(t);
    if (sn) sn.degree++;
    if (tn) tn.degree++;
  }

  // A wikilink to a note that is not public leaks that note's title and renders
  // as a link to nowhere. Keep the ones that resolve; flatten the rest to prose.
  const publicLabels = new Set(
    [...nodes.values()].map((n) => n.label.toLowerCase().replace(/[\s_-]+/g, "")),
  );
  for (const n of nodes.values()) {
    if (!n.body) continue;
    n.body = n.body.replace(
      /\[\[([^\]\n|#]{1,80})(?:\|([^\]\n]*))?\]\]/g,
      (_whole, target: string, alias?: string) => {
        const key = target.trim().toLowerCase().replace(/[\s_-]+/g, "");
        const shown = (alias ?? target).trim();
        return publicLabels.has(key) ? `[[${target.trim()}]]` : shown;
      },
    );
  }

  const list = [...nodes.values()];
  const byKind: Record<string, number> = {};
  const byStage: Record<string, number> = {};
  for (const n of list) {
    byKind[n.kind] = (byKind[n.kind] ?? 0) + 1;
    byStage[n.stage] = (byStage[n.stage] ?? 0) + 1;
  }
  const terms = list.filter((n) => n.kind === "concept");

  return {
    nodes: list,
    links,
    stats: {
      nodes: list.length,
      links: links.length,
      byKind,
      byStage,
      orphans: list.filter((n) => n.degree === 0).length,
      ghosts: 0,
      signedTerms: terms.filter((n) => n.signed).length,
      totalTerms: terms.length,
      newest: full.stats.newest,
      oldest: full.stats.oldest,
      builtAt: new Date().toISOString(),
    },
  };
}

/**
 * Last line of defence. Runs over the finished public payload and refuses to
 * ship if anything that looks private survived — a home path, a private host, a
 * key, a contact. Cheap to run, and it has to pass before a deploy.
 */
const TRIPWIRES: { name: string; re: RegExp }[] = [
  { name: "home directory path", re: /\/Users\/[a-z]/i },
  { name: "tilde path", re: /~\/(?:\.claude|Fieldnotes|Code|Library)/ },
  { name: "email address", re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i },
  {
    name: "api key or token",
    re: /\b(?:sk-|ghp_|gho_|vercel_|pplx-|AIza)[A-Za-z0-9_-]{8,}/,
  },
  { name: "env var assignment", re: /\b[A-Z][A-Z0-9_]{6,}=(?!$)\S/ },
  { name: "localhost stand", re: /127\.0\.0\.1:\d+|localhost:\d+/ },
  {
    name: "medication or health",
    re: /\b(?:adhd|cbd|medication|meds|dosage|prescri\w*)\b/i,
  },
  {
    name: "private stand or infrastructure",
    re: /\b(?:shosai|yomu|suji|kiku|niwa|tailscale|myclaw|openclaw|spaceship|godaddy|namecheap)\b/i,
  },
  {
    name: "local port",
    re: /\b:(?:4\d{3}|5\d{3}|3\d{3})\b/,
  },
  {
    name: "family or estrangement",
    re: /\b(?:estrange\w*|my (?:mother|father|mum|dad|parents))\b/i,
  },
];

export function auditPublicGarden(
  garden: Garden,
): { node: string; field: string; tripwire: string; sample: string }[] {
  const findings: {
    node: string;
    field: string;
    tripwire: string;
    sample: string;
  }[] = [];
  const excused = new Set(
    AUDIT_EXCEPTIONS.map((e) => `${e.id}::${e.tripwire}`),
  );

  for (const n of garden.nodes) {
    for (const [field, value] of Object.entries({
      label: n.label,
      description: n.description,
      body: n.body,
      file: n.file ?? "",
    })) {
      if (!value) continue;
      for (const { name, re } of TRIPWIRES) {
        if (excused.has(`${n.id}::${name}`)) continue;
        const m = value.match(re);
        if (m) {
          findings.push({
            node: n.id,
            field,
            tripwire: name,
            sample: value
              .slice(Math.max(0, (m.index ?? 0) - 30), (m.index ?? 0) + 50)
              .replace(/\s+/g, " "),
          });
        }
      }
    }
  }
  return findings;
}
