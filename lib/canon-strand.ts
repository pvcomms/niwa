import type { GardenLink, GardenNode } from "./garden.ts";
import { CORPUS_KINDS, dot, shared, type Index } from "./taste.ts";
import {
  HOW_RANK,
  KIN_FLOOR,
  KIN_MAX,
  MIN_REACHED,
  ROOTS_MAX,
  reaches,
  type Dated,
  type How,
  type Member,
  type Root,
  type Stone,
  type Strand,
} from "./canon.ts";

/**
 * The canon's strands, derived from the garden: who reaches for whom, the
 * roots, and the strand that grows from one. Kept apart from lib/canon.ts
 * because it reads the word index, which the page must not import.
 */

/* ── who reaches for whom ──────────────────────────────────────────────── */

/**
 * For every stone, the stones that reach for it and how: a written link to
 * it, its name in prose, its term in use, or the same piece kept elsewhere.
 * Where two stones are threaded more than one way, the strongest is kept.
 */
export function reachers(links: GardenLink[]): Map<string, Map<string, How>> {
  const out = new Map<string, Map<string, How>>();
  const add = (to: string, from: string, how: How) => {
    if (to === from) return;
    let m = out.get(to);
    if (!m) out.set(to, (m = new Map()));
    const prev = m.get(from);
    if (!prev || HOW_RANK[how] < HOW_RANK[prev]) m.set(from, how);
  };
  for (const l of links) {
    if (l.kind === "link") add(l.target, l.source, "links");
    else if (l.kind === "mention") add(l.target, l.source, "names");
    else if (l.kind === "concept") add(l.source, l.target, "term");
    else if (l.kind === "twin") {
      add(l.target, l.source, "twin");
      add(l.source, l.target, "twin");
    }
  }
  return out;
}

type Reach = Map<string, Map<string, How>>;

const isStone = (n: GardenNode | undefined): n is GardenNode =>
  !!n && CORPUS_KINDS.has(n.kind);

/** The stones that reach for `id`, as stones that exist and have text. */
function reachersOf(
  id: string,
  reach: Reach,
  byId: Map<string, GardenNode>,
): [GardenNode, How][] {
  return [...(reach.get(id) ?? [])]
    .map(([from, how]) => [byId.get(from), how] as const)
    .filter((x): x is [GardenNode, How] => isStone(x[0]));
}

const reachedOf = (id: string, reach: Reach, byId: Map<string, GardenNode>) =>
  reachersOf(id, reach, byId).filter(([, h]) => reaches(h)).length;

const stoneOf = (
  n: GardenNode,
  reach: Reach,
  byId: Map<string, GardenNode>,
  dayOf: (n: GardenNode) => Dated,
): Stone => {
  const d = dayOf(n);
  return {
    id: n.id,
    label: n.label,
    kind: n.kind,
    day: d.day,
    approx: d.approx,
    reached: reachedOf(n.id, reach, byId),
  };
};

/**
 * The roots: every stone with text reached for by at least `min` others, most
 * reached-for first, then by name. The order is a count; it says nothing
 * about which matters.
 */
export function rootsOf(
  nodes: GardenNode[],
  reach: Reach,
  dayOf: (n: GardenNode) => Dated,
  min = MIN_REACHED,
  max = ROOTS_MAX,
): Root[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: Root[] = [];
  for (const n of nodes) {
    if (!isStone(n)) continue;
    const by = { links: 0, names: 0, term: 0 };
    for (const [, h] of reachersOf(n.id, reach, byId))
      if (h === "links" || h === "names" || h === "term") by[h]++;
    const reached = by.links + by.names + by.term;
    if (reached < min) continue;
    const d = dayOf(n);
    out.push({
      id: n.id,
      label: n.label,
      kind: n.kind,
      day: d.day,
      approx: d.approx,
      reached,
      by,
    });
  }
  return out
    .sort((a, b) => b.reached - a.reached || (a.label < b.label ? -1 : 1))
    .slice(0, max);
}

const byDay = (a: Stone, b: Stone) =>
  a.day === b.day
    ? a.label < b.label
      ? -1
      : 1
    : a.day === null
      ? 1
      : b.day === null
        ? -1
        : a.day < b.day
          ? -1
          : 1;

/** How many kin by words to gather beside `reached` reachers: about three for every seven. */
export const kinWanted = (reached: number) =>
  Math.min(KIN_MAX, Math.max(2, Math.round((reached * 3) / 7)));

/**
 * A strand: a root and what gathers round it. First the stones that reach
 * for it, then its nearest kin by words that do not already — each marked
 * for how it got in — in the order they arrived. `index` may be null, in
 * which case the strand is only what reaches for the root.
 */
export function strandOf(
  rootId: string,
  nodes: GardenNode[],
  links: GardenLink[],
  reach: Reach,
  index: Index | null,
  dayOf: (n: GardenNode) => Dated,
): Strand | null {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const rootNode = byId.get(rootId);
  if (!isStone(rootNode)) return null;
  const root = stoneOf(rootNode, reach, byId, dayOf);

  const members: Member[] = reachersOf(rootId, reach, byId).map(([n, how]) => ({
    ...stoneOf(n, reach, byId, dayOf),
    how,
    shared: [],
    threads: 0,
  }));
  const taken = new Set([rootId, ...members.map((m) => m.id)]);

  const rootDoc = index?.docs.find((d) => d.id === rootId);
  if (index && rootDoc) {
    const want = kinWanted(members.filter((m) => reaches(m.how)).length);
    const kin = index.docs
      .filter((d) => !taken.has(d.id))
      .map((d) => ({ d, sim: dot(rootDoc.vec, d.vec) }))
      .filter((x) => x.sim >= KIN_FLOOR)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, want);
    for (const { d } of kin) {
      const n = byId.get(d.id);
      if (!isStone(n)) continue;
      members.push({
        ...stoneOf(n, reach, byId, dayOf),
        how: "kin",
        shared: shared(rootDoc.vec, d.vec, 4),
        threads: 0,
      });
      taken.add(d.id);
    }
  }

  // Threads between the strand's own stones, whichever way and whatever kind.
  const inside = new Set(members.map((m) => m.id));
  const pairs = new Set<string>();
  const count = new Map<string, number>();
  for (const l of links) {
    if (l.source === l.target) continue;
    if (!inside.has(l.source) || !inside.has(l.target)) continue;
    const key =
      l.source < l.target
        ? `${l.source}\u0000${l.target}`
        : `${l.target}\u0000${l.source}`;
    if (pairs.has(key)) continue;
    pairs.add(key);
    count.set(l.source, (count.get(l.source) ?? 0) + 1);
    count.set(l.target, (count.get(l.target) ?? 0) + 1);
  }
  for (const m of members) m.threads = count.get(m.id) ?? 0;

  const builds = new Set<string>();
  const strandIds = new Set([rootId, ...inside]);
  for (const l of links)
    if (l.kind === "build" && strandIds.has(l.source)) {
      const r = byId.get(l.target);
      builds.add(r?.label ?? l.target);
    }

  const reaching = members.filter((m) => m.how !== "kin").sort(byDay);
  const kin = members.filter((m) => m.how === "kin").sort(byDay);
  return {
    root,
    members: [...reaching, ...kin],
    threads: pairs.size,
    builds: [...builds].sort(),
  };
}

