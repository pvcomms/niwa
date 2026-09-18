import type { Garden, GardenLink } from "./garden";

/**
 * Unplanted ideas, ranked.
 *
 * A ghost stone is an idea named often enough to link to and never written down.
 * The garden already creates one per unresolved wikilink; what it does not say is
 * which ghosts are reached for repeatedly. One note pointing at an idea is a
 * loose end. Six notes pointing at the same idea is a thing you keep needing and
 * have never made yourself say.
 *
 * This reports and stops there. No ordering by importance, no suggestion about
 * what to write — the count and the sources, and the person reads them.
 */

export type Unplanted = {
  id: string;
  /** The term as it was written in the wikilink. */
  label: string;
  /** Distinct notes pointing here. The rank. */
  count: number;
  /** Labels of those notes, alphabetical. */
  pointedFrom: string[];
};

/**
 * Link ends are ids when the garden comes off the server, but 3d-force-graph
 * replaces them with node objects in place once a graph has been rendered. Both
 * shapes reach this module — 002 calls it client-side — so neither is assumed.
 */
function idOf(end: GardenLink["source"]): string {
  return typeof end === "string" ? end : ((end as { id: string })?.id ?? "");
}

export function rankUnplanted(garden: Garden): Unplanted[] {
  const labels = new Map(garden.nodes.map((n) => [n.id, n.label]));
  const sources = new Map<string, Set<string>>();

  for (const link of garden.links) {
    if (link.kind !== "seed") continue;
    const target = idOf(link.target);
    const source = idOf(link.source);
    if (!target || !source) continue;
    const seen = sources.get(target) ?? new Set<string>();
    seen.add(source);
    sources.set(target, seen);
  }

  return garden.nodes
    .filter((n) => n.kind === "ghost")
    .map((n) => {
      const from = [...(sources.get(n.id) ?? [])].map(
        (id) => labels.get(id) ?? id,
      );
      from.sort((a, b) => a.localeCompare(b));
      return {
        id: n.id,
        label: n.label,
        count: from.length,
        pointedFrom: from,
      };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Ghost id → rank, for cheap lookup while drawing. Used by 002. */
export function unplantedById(garden: Garden): Map<string, number> {
  return new Map(rankUnplanted(garden).map((u) => [u.id, u.count]));
}
