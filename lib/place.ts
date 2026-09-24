import type { GardenNode } from "./garden.ts";
import { KIND_LABEL, KIND_ORDER } from "./palette.ts";

/**
 * Where a note sits in the whole. The catalogue never shows a note on its own:
 * it shows the path down to it, the notes beside it, and the region of the
 * garden it belongs to. Everything here is derived from the graph; nothing is
 * stored, and nothing ranks one note above another.
 */

export type Crumb = { label: string; id: string | null };

type Index = Map<string, GardenNode>;

/**
 * The path from the top of the whole down to (not including) this note. Vault
 * notes follow their `parent` chain — Notion's own page tree. Everything else is
 * placed by where it lives: memory by kind, Fieldnotes by folder, code by path.
 */
export function trail(node: GardenNode, byId: Index): Crumb[] {
  const chain: Crumb[] = [];
  const seen = new Set<string>([node.id]);
  let at = node.parent ?? null;
  while (at && byId.has(at) && !seen.has(at)) {
    seen.add(at);
    const n = byId.get(at)!;
    chain.unshift({ label: n.label, id: n.id });
    at = n.parent ?? null;
  }
  if (chain.length) return chain;

  const bed = { label: KIND_LABEL[node.kind] ?? node.kind, id: null };
  switch (node.source) {
    case "memory":
      return [{ label: "Memory", id: null }, bed];
    case "vault": {
      if (node.kind === "concept")
        return [
          { label: "Fieldnotes", id: null },
          { label: "Glossary", id: null },
        ];
      const folder = node.id.match(/^note:([^/]+)\//)?.[1];
      return [
        { label: "Fieldnotes", id: null },
        ...(folder ? [{ label: folder, id: null }] : []),
      ];
    }
    case "code": {
      // "~/personal/tools/apps/kiku" -> personal / tools / apps
      const parts = node.description.replace(/^~\//, "").split("/");
      return parts.slice(0, -1).map((label) => ({ label, id: null }));
    }
    default:
      return [bed];
  }
}

const slugOf = (n: GardenNode) => n.id.replace(/^garden:/, "");

/**
 * A parent's children in the order the parent lists them — which is the order
 * they had in Notion — and alphabetically after that.
 */
export function childrenOf(parent: GardenNode, nodes: GardenNode[]) {
  const at = (n: GardenNode) => {
    const slug = slugOf(n);
    const hits = [`[[${slug}]]`, `[[${slug}|`]
      .map((s) => parent.body.indexOf(s))
      .filter((i) => i >= 0);
    return hits.length ? Math.min(...hits) : Number.POSITIVE_INFINITY;
  };
  return nodes
    .filter((n) => n.parent === parent.id)
    .sort((a, b) => at(a) - at(b) || a.label.localeCompare(b.label));
}

/**
 * One reading order for the whole garden: bed by bed in the legend's order, and
 * inside a bed, trees walked depth-first so a page sits directly under its
 * parent. `depth` is how far down its tree a note is (0 for anything untreed).
 */
export function outline(
  nodes: GardenNode[],
): Map<string, { index: number; depth: number }> {
  const kids = new Map<string, GardenNode[]>();
  const ids = new Set(nodes.map((n) => n.id));
  for (const n of nodes)
    if (n.parent && ids.has(n.parent)) {
      if (!kids.has(n.parent)) kids.set(n.parent, []);
      kids.get(n.parent)!.push(n);
    }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ordered = (p: GardenNode) =>
    childrenOf(p, kids.get(p.id) ?? []).filter((c) => ids.has(c.id));

  const out = new Map<string, { index: number; depth: number }>();
  const visit = (n: GardenNode, depth: number) => {
    if (out.has(n.id)) return;
    out.set(n.id, { index: out.size, depth });
    for (const c of ordered(n)) visit(c, depth + 1);
  };

  const rank = (k: string) => {
    const i = (KIND_ORDER as readonly string[]).indexOf(k);
    return i < 0 ? KIND_ORDER.length : i;
  };
  const roots = nodes
    .filter((n) => !n.parent || !byId.has(n.parent))
    .sort(
      (a, b) =>
        rank(a.kind) - rank(b.kind) ||
        // A root with a tree under it leads its bed, so the tree reads top-down.
        (kids.has(b.id) ? 1 : 0) - (kids.has(a.id) ? 1 : 0) ||
        a.label.localeCompare(b.label),
    );
  for (const r of roots) visit(r, 0);
  // Anything left is inside a cycle; it still gets a place.
  for (const n of nodes) visit(n, 0);
  return out;
}

/** A body match, cut down to the sentence around it. */
export function snippet(body: string, query: string, width = 64) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return null;
  const flat = body
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|]/g, " ")
    .replace(/\s+/g, " ");
  const i = flat.toLowerCase().indexOf(q);
  if (i < 0) return null;
  const start = Math.max(0, i - width);
  const end = Math.min(flat.length, i + q.length + width);
  return {
    before: (start > 0 ? "…" : "") + flat.slice(start, i),
    match: flat.slice(i, i + q.length),
    after: flat.slice(i + q.length, end) + (end < flat.length ? "…" : ""),
  };
}

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/\.md$/, "")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
const PREFIXES = ["project_", "feedback_", "user_", "reference_", "routine_"];

/**
 * A written [[ref]] to the note it means, with the precedence the graph uses:
 * a link inside a vault note is one of that vault's slugs first.
 */
export function makeResolver(nodes: GardenNode[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const byKey = new Map<string, GardenNode>();
  for (const n of nodes)
    for (const key of [
      norm(n.id.replace(/^garden:/, "")),
      norm(n.id),
      norm(n.label),
    ]) {
      if (key && !byKey.has(key)) byKey.set(key, n);
      for (const p of PREFIXES)
        if (key.startsWith(p) && !byKey.has(key.slice(p.length)))
          byKey.set(key.slice(p.length), n);
    }
  return (ref: string, from?: GardenNode | null): GardenNode | null => {
    if (from?.source === "garden") {
      const own = byId.get(`garden:${ref.trim()}`);
      if (own) return own;
    }
    if (byId.has(ref)) return byId.get(ref)!;
    const k = norm(ref);
    if (byKey.has(k)) return byKey.get(k)!;
    for (const p of PREFIXES) if (byKey.has(p + k)) return byKey.get(p + k)!;
    return null;
  };
}

/**
 * The first breath of a note: its description, or the start of its body, as
 * plain words — no markdown, no link targets — cut at `max` characters.
 */
export function gist(
  n: Pick<GardenNode, "description" | "body">,
  max = 120,
): string {
  const text = (n.description || n.body || "")
    .replace(/^---[\s\S]*?---\s*/, "")
    .replace(/\(https?:[^)]*\)/g, "")
    .replace(/[#*_`>[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 2).trimEnd()}…` : text;
}
