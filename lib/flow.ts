import type { GardenLink, GardenNode } from "./garden.ts";

/**
 * The flow — which way influence runs along the garden's threads, and what
 * that says about any one stone: the roots it rests on, the stones that
 * would move if it changed, the roots that have gone fallow, the ones never
 * written down, the linchpins everything passes through, the loops, and the
 * threads that run both ways. All of it is structure the garden already has;
 * none of it is a grade.
 */

export type Arrow = { from: string; to: string; kind: GardenLink["kind"] };

/**
 * Which way a thread carries influence. A note that links to, names or
 * seeds something was fed by it; a concept practised in a note fed the
 * note; a note that points at code fed the code; twins feed each other.
 */
export function orient(l: GardenLink): Arrow[] {
  switch (l.kind) {
    case "link":
    case "mention":
    case "seed":
      return [{ from: l.target, to: l.source, kind: l.kind }];
    case "concept":
    case "build":
      return [{ from: l.source, to: l.target, kind: l.kind }];
    case "twin":
      return [
        { from: l.source, to: l.target, kind: l.kind },
        { from: l.target, to: l.source, kind: l.kind },
      ];
  }
}

export type Flow = {
  /** what flows into X */
  into: Map<string, Arrow[]>;
  /** what X flows into */
  outOf: Map<string, Arrow[]>;
  /** X → the stones it runs both ways with */
  mutual: Map<string, Set<string>>;
};

const SEP = "\u0000";

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const arr = m.get(k);
  if (arr) arr.push(v);
  else m.set(k, [v]);
}

export function buildFlow(links: GardenLink[]): Flow {
  const into = new Map<string, Arrow[]>();
  const outOf = new Map<string, Arrow[]>();
  const pairs = new Set<string>();
  for (const l of links)
    for (const a of orient(l)) {
      push(into, a.to, a);
      push(outOf, a.from, a);
      pairs.add(`${a.from}${SEP}${a.to}`);
    }
  const mutual = new Map<string, Set<string>>();
  for (const p of pairs) {
    const [f, t] = p.split(SEP);
    if (!pairs.has(`${t}${SEP}${f}`)) continue;
    if (!mutual.has(f)) mutual.set(f, new Set());
    mutual.get(f)!.add(t);
  }
  return { into, outOf, mutual };
}

/**
 * How far the garden is walked. Two hops — a root and what fed it — is where
 * a premise still bears on a thought; six is everything reachable, which in a
 * garden this connected is nearly all of it, so it is used only to find loops.
 */
export const NEAR = 2;
export const HOPS = 6;

function walk(
  next: Map<string, Arrow[]>,
  pick: (a: Arrow) => string,
  start: string,
  hops: number,
  block?: string,
): Map<string, number> {
  const seen = new Map<string, number>([[start, 0]]);
  if (block) seen.set(block, -1);
  let frontier = [start];
  for (let h = 1; h <= hops && frontier.length; h++) {
    const out: string[] = [];
    for (const id of frontier)
      for (const a of next.get(id) ?? []) {
        const n = pick(a);
        if (!seen.has(n)) {
          seen.set(n, h);
          out.push(n);
        }
      }
    frontier = out;
  }
  seen.delete(start);
  if (block) seen.delete(block);
  return seen;
}

/** What flows into X within `hops`, with how far away each is. */
export const upstream = (flow: Flow, id: string, hops = NEAR, block?: string) =>
  walk(flow.into, (a) => a.from, id, hops, block);

/** What X flows into within `hops`, with how far away each is. */
export const downstream = (flow: Flow, id: string, hops = NEAR) =>
  walk(flow.outOf, (a) => a.to, id, hops);

/** How much of the garden X moves within two hops. */
export const reach = (flow: Flow, id: string, hops = NEAR) =>
  downstream(flow, id, hops).size;

const unique = <T>(xs: T[]) => [...new Set(xs)];

export type Foundations = {
  /** the stones that flow straight into it */
  direct: string[];
  /** every root, with its hop */
  roots: Map<string, number>;
  /** roots gone fallow: premises that may have moved since */
  fallow: string[];
  /** roots that were never written down */
  unwritten: string[];
  /** roots by provenance */
  own: number;
  read: number;
  code: number;
  /** direct roots through which other roots reach it only */
  linchpins: { id: string; exclusive: number }[];
  /** roots that it feeds in turn */
  loops: string[];
  /** the stones it runs both ways with */
  mutual: string[];
  /** what it flows straight into, and how much moves within two hops */
  directOut: string[];
  reach: number;
};

export function foundations(
  flow: Flow,
  nodes: Map<string, GardenNode>,
  id: string,
  hops = NEAR,
): Foundations {
  const roots = upstream(flow, id, hops);
  const down = downstream(flow, id, hops);
  // Loops need the long walk: what this feeds may take many hops to feed it back.
  const far = downstream(flow, id, HOPS);
  const direct = unique((flow.into.get(id) ?? []).map((a) => a.from));
  const byHop = (a: string, b: string) => roots.get(a)! - roots.get(b)!;
  const kind = (x: string) => nodes.get(x)?.kind;
  const rootIds = [...roots.keys()];
  let own = 0;
  let read = 0;
  let code = 0;
  for (const r of rootIds) {
    const k = kind(r);
    if (k === "reading") read++;
    else if (k === "repo") code++;
    else if (k && k !== "ghost") own++;
  }
  // A linchpin: a direct root whose own roots reach this stone through no
  // other direct root. Walked with the centre blocked, so a loop back through
  // it does not make every root everyone's.
  const sets = direct.map((u) => {
    const s = new Set(upstream(flow, u, Math.max(1, hops - 1), id).keys());
    s.add(u);
    return s;
  });
  const linchpins = direct
    .map((u, i) => {
      let exclusive = 0;
      for (const s of sets[i]) {
        if (s === id) continue;
        if (!sets.some((o, j) => j !== i && o.has(s))) exclusive++;
      }
      return { id: u, exclusive };
    })
    .filter((l) => l.exclusive >= 2)
    .sort((a, b) => b.exclusive - a.exclusive);
  return {
    direct,
    roots,
    fallow: rootIds.filter((r) => nodes.get(r)?.stage === "fallow").sort(byHop),
    unwritten: rootIds.filter((r) => kind(r) === "ghost").sort(byHop),
    own,
    read,
    code,
    linchpins,
    loops: rootIds.filter((r) => far.has(r)).sort(byHop),
    mutual: [...(flow.mutual.get(id) ?? [])],
    directOut: unique((flow.outOf.get(id) ?? []).map((a) => a.to)),
    reach: down.size,
  };
}

const label = (nodes: Map<string, GardenNode>, id: string) =>
  nodes.get(id)?.label ?? id;

/** "a, b and c" */
const list = (xs: string[]) =>
  xs.length <= 1
    ? xs.join("")
    : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

/** The reading, sentence by sentence. Facts about the structure; the judgment is left out. */
export function readings(
  f: Foundations,
  nodes: Map<string, GardenNode>,
): string[] {
  const out: string[] = [];
  const n = f.roots.size;
  if (n === 0) out.push("rests on nothing written here — a root.");
  else
    out.push(
      `rests on ${n} ${n === 1 ? "stone" : "stones"} within two hops, ${f.direct.length} of them directly.`,
    );
  if (n > 0) {
    const total = f.own + f.read + f.code;
    if (total > 0) {
      const ownShare = f.own / total;
      if (f.read === 0) out.push("its roots are entirely your own writing.");
      else if (ownShare >= 0.75)
        out.push(
          `its roots are mostly your own writing — ${f.read} of ${total} are things you read.`,
        );
      else if (ownShare <= 0.25)
        out.push(
          `its roots are mostly things you read — ${f.own} of ${total} are your own.`,
        );
      else
        out.push(
          `its roots are ${f.own} of your own and ${f.read} things you read.`,
        );
    }
  }
  if (f.fallow.length)
    out.push(
      `${f.fallow.length} of its roots ${f.fallow.length === 1 ? "has" : "have"} gone fallow — ${f.fallow.length === 1 ? "a premise" : "premises"} that may have moved since.`,
    );
  if (f.unwritten.length)
    out.push(
      `${f.unwritten.length} of its roots ${f.unwritten.length === 1 ? "was" : "were"} never written down.`,
    );
  if (f.linchpins.length) {
    const l = f.linchpins[0];
    out.push(
      `${label(nodes, l.id)} is a linchpin: ${l.exclusive} roots reach this only through it.`,
    );
  }
  if (f.loops.length)
    out.push(
      `${f.loops.length} of its roots ${f.loops.length === 1 ? "is" : "are"} fed by it in turn — a loop.`,
    );
  if (f.mutual.length)
    out.push(
      `runs both ways with ${list(f.mutual.slice(0, 3).map((m) => label(nodes, m)))}${f.mutual.length > 3 ? ` and ${f.mutual.length - 3} more` : ""}.`,
    );
  if (f.reach === 0) out.push("flows into nothing yet — a leaf.");
  else
    out.push(
      `flows into ${f.directOut.length} ${f.directOut.length === 1 ? "stone" : "stones"} directly, ${f.reach} within two hops; change it and they move.`,
    );
  return out;
}

/** The site's figure, from data: what shaped the most, and what you argued with. */
export function influences(
  flow: Flow,
  nodes: Map<string, GardenNode>,
  n = 8,
): {
  shaped: { id: string; reach: number }[];
  argued: { id: string; mutual: number }[];
} {
  const ids = [...nodes.values()]
    .filter((x) => x.kind !== "meta" && x.kind !== "ghost" && x.kind !== "repo")
    .map((x) => x.id);
  const shaped = ids
    .map((id) => ({ id, reach: reach(flow, id) }))
    .filter((x) => x.reach > 0)
    .sort((a, b) => b.reach - a.reach)
    .slice(0, n);
  const argued = ids
    .map((id) => ({ id, mutual: flow.mutual.get(id)?.size ?? 0 }))
    .filter((x) => x.mutual > 0)
    .sort((a, b) => b.mutual - a.mutual)
    .slice(0, n);
  return { shaped, argued };
}
