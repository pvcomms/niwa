import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import matter from "gray-matter";

const HOME = os.homedir();
// Defaults match Param's own layout; override any of the three to point the
// garden at a different memory / vault / code tree.
export const MEMORY_DIR =
  process.env.NIWA_MEMORY_DIR ?? path.join(HOME, ".claude", "memory");
export const VAULT_DIR =
  process.env.NIWA_VAULT_DIR ?? path.join(HOME, "Fieldnotes");
export const CODE_DIR = process.env.NIWA_CODE_DIR ?? path.join(HOME, "Code");
// niwa-vault: the Notion workspace, the Reader archive and the hand-written
// garden notes, one markdown file per note, linked by slug.
export const GARDEN_DIR =
  process.env.NIWA_GARDEN_DIR ??
  path.join(HOME, "personal", "garden", "niwa-vault", "content", "notes");

export type NodeKind =
  | "project"
  | "concept"
  | "user"
  | "feedback"
  | "reference"
  | "routine"
  | "meta"
  | "note"
  | "notion"
  | "garden"
  | "reading"
  | "agent"
  | "repo"
  | "ghost";

export type Stage = "fresh" | "tended" | "settled" | "fallow" | "unknown";

export type GardenNode = {
  id: string;
  label: string;
  kind: NodeKind;
  description: string;
  body: string;
  file: string | null;
  modified: string | null;
  stage: Stage;
  signed: boolean | null; // glossary only: is the term Param's own (status: mine)?
  degree: number;
  source: "memory" | "vault" | "garden" | "code" | "inferred";
  /** Vault notes only: the note this one sat under (Notion's page tree). */
  parent?: string | null;
  /** Vault notes only: their `topics:`. */
  tags?: string[];
};

export type GardenLink = {
  source: string;
  target: string;
  kind: "link" | "concept" | "build" | "seed" | "mention" | "twin";
};

export type Garden = {
  nodes: GardenNode[];
  links: GardenLink[];
  stats: {
    nodes: number;
    links: number;
    byKind: Record<string, number>;
    byStage: Record<string, number>;
    orphans: number;
    ghosts: number;
    signedTerms: number;
    totalTerms: number;
    newest: string | null;
    oldest: string | null;
    builtAt: string;
    /** Set by scripts/snapshot.mjs: a deployed garden is frozen, not watching disk. */
    live?: boolean;
    mode?: "public" | "private";
    /** Public builds carry their own framing; the private one keeps the default. */
    blurb?: string;
  };
};

const MEMORY_PREFIXES = [
  "project_",
  "feedback_",
  "user_",
  "reference_",
  "routine_",
];

/**
 * Hand-written frontmatter is not always valid YAML — several memory files carry an
 * unquoted `description:` containing a colon, which throws in js-yaml. Fall back to a
 * lenient line reader so one malformed file can't blank the whole garden.
 */
function safeMatter(raw: string): {
  data: Record<string, any>;
  content: string;
} {
  try {
    const parsed = matter(raw);
    return { data: parsed.data ?? {}, content: parsed.content };
  } catch {
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) return { data: {}, content: raw };
    const data: Record<string, any> = {};
    let parent: string | null = null;
    for (const line of m[1].split(/\r?\n/)) {
      if (!line.trim() || line.trim().startsWith("#")) continue;
      const field = line.match(/^(\s*)([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!field) continue;
      const [, indent, key, rawValue] = field;
      const value = rawValue.trim().replace(/^["']|["']$/g, "");
      if (indent.length > 0 && parent) {
        if (typeof data[parent] !== "object" || data[parent] === null)
          data[parent] = {};
        data[parent][key] = value;
        continue;
      }
      if (!value) {
        parent = key;
        data[key] = {};
        continue;
      }
      parent = null;
      data[key] = value.startsWith("[")
        ? value
            .slice(1, -1)
            .split(",")
            .map((s) => s.trim().replace(/^["']|["']$/g, ""))
            .filter(Boolean)
        : value;
    }
    return { data, content: m[2] };
  }
}

/** Wikilinks in this vault are written four ways: project_suji, project-suji, suji, suji.md. */
const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/\.md$/, "")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const stripPrefix = (key: string) => {
  for (const p of MEMORY_PREFIXES)
    if (key.startsWith(p)) return key.slice(p.length);
  return key;
};

function walk(dir: string, depth = 0): string[] {
  if (depth > 2 || !fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name.startsWith("_attachments"))
      continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, depth + 1));
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

function stageOf(modified: Date | null): Stage {
  if (!modified) return "unknown";
  const days = (Date.now() - modified.getTime()) / 86_400_000;
  if (days <= 7) return "fresh";
  if (days <= 30) return "tended";
  if (days <= 90) return "settled";
  return "fallow";
}

/** Type lives at the frontmatter root in some files and under `metadata:` in others. */
function frontmatterType(data: Record<string, any>): string | null {
  const t = data?.type ?? data?.metadata?.type;
  return typeof t === "string" ? t.toLowerCase() : null;
}

function frontmatterModified(data: Record<string, any>, fallback: Date): Date {
  const raw = data?.metadata?.modified ?? data?.modified ?? data?.updated;
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return fallback;
}

function kindFromMemoryFile(base: string, fmType: string | null): NodeKind {
  const known: NodeKind[] = [
    "project",
    "feedback",
    "user",
    "reference",
    "routine",
  ];
  if (fmType && (known as string[]).includes(fmType)) return fmType as NodeKind;
  for (const p of MEMORY_PREFIXES) {
    if (base.startsWith(p)) return p.slice(0, -1) as NodeKind;
  }
  return "meta";
}

/** Single-word glossary terms only match capitalised, or `keep`/`still`/`edge` poison everything. */
function conceptMatchers(title: string, aliases: string[]): RegExp[] {
  const terms = [title, ...aliases].filter((t) => t && t.length >= 4);
  return terms.map((t) => {
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const multiword = /\s/.test(t);
    // Multi-word terms are distinctive enough to match case-insensitively; a
    // single word must appear capitalised to count as the concept, not the noun.
    return new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, multiword ? "i" : "");
  });
}

let cache: { fingerprint: string; garden: Garden } | null = null;

export function fingerprint(): string {
  const parts: string[] = [];
  for (const dir of [
    MEMORY_DIR,
    path.join(VAULT_DIR, "Glossary"),
    GARDEN_DIR,
  ]) {
    for (const f of walk(dir)) {
      try {
        parts.push(`${f}:${fs.statSync(f).mtimeMs}`);
      } catch {
        /* file vanished mid-scan */
      }
    }
  }
  return parts.join("|");
}

export function buildGarden(): Garden {
  const fp = fingerprint();
  if (cache && cache.fingerprint === fp) return cache.garden;

  const nodes = new Map<string, GardenNode>();
  const links: GardenLink[] = [];
  const byKey = new Map<string, string>(); // normalised key -> node id
  const byBare = new Map<string, string>(); // prefix-stripped key -> node id

  const register = (node: GardenNode, extraKeys: string[] = []) => {
    nodes.set(node.id, node);
    const keys = [norm(node.id), ...extraKeys.map(norm)];
    for (const k of keys) {
      if (k && !byKey.has(k)) byKey.set(k, node.id);
      const bare = stripPrefix(k);
      if (bare && !byBare.has(bare)) byBare.set(bare, node.id);
    }
  };

  // ── 1. Memory: the ontology spine ────────────────────────────────────────
  const memoryFiles = walk(MEMORY_DIR);
  const bodies = new Map<string, string>();

  for (const file of memoryFiles) {
    const raw = fs.readFileSync(file, "utf8");
    const { data, content } = safeMatter(raw);
    const base = path.basename(file, ".md");
    const rel = path.relative(MEMORY_DIR, file);
    const isAgent = rel.startsWith("agents/");
    const stat = fs.statSync(file);
    const modified = frontmatterModified(data, stat.mtime);
    const id = base;

    const kind: NodeKind = isAgent
      ? "agent"
      : kindFromMemoryFile(base, frontmatterType(data));
    const label =
      typeof data.name === "string" && data.name.trim()
        ? data.name.trim()
        : base
            .replace(/^(project|feedback|user|reference|routine)_/, "")
            .replace(/[_-]/g, " ");

    register(
      {
        id,
        label,
        kind,
        description:
          typeof data.description === "string" ? data.description : "",
        body: content.trim(),
        file,
        modified: modified.toISOString(),
        stage: stageOf(modified),
        signed: null,
        degree: 0,
        source: "memory",
      },
      [
        base,
        stripPrefix(norm(base)),
        typeof data.name === "string" ? data.name : "",
      ],
    );
    bodies.set(id, content);
  }

  // ── 2. Glossary: the controlled vocabulary ───────────────────────────────
  const glossaryDir = path.join(VAULT_DIR, "Glossary");
  const concepts: { id: string; matchers: RegExp[] }[] = [];

  for (const file of walk(glossaryDir)) {
    const base = path.basename(file, ".md");
    if (base.startsWith("_")) continue;
    const { data, content } = safeMatter(fs.readFileSync(file, "utf8"));
    const stat = fs.statSync(file);
    const modified = frontmatterModified(data, stat.mtime);
    const id = `concept:${base}`;
    const aliases = Array.isArray(data.aliases)
      ? data.aliases.filter((a: any) => typeof a === "string")
      : [];

    register(
      {
        id,
        label: base,
        kind: "concept",
        description: typeof data.meaning === "string" ? data.meaning : "",
        body: content.trim(),
        file,
        modified: modified.toISOString(),
        stage: stageOf(modified),
        signed: String(data.status ?? "").toLowerCase() === "mine",
        degree: 0,
        source: "vault",
      },
      [base, ...aliases],
    );
    bodies.set(id, content);
    concepts.push({ id, matchers: conceptMatchers(base, aliases) });
  }

  // ── 3. Vault notes: ideas, sources, curriculum, and the vault's own root pages ──
  const vaultRoot = fs.existsSync(VAULT_DIR)
    ? fs
        .readdirSync(VAULT_DIR, { withFileTypes: true })
        .filter(
          (e) =>
            e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("_"),
        )
        .map((e) => ["", path.join(VAULT_DIR, e.name)] as [string, string])
    : [];

  const vaultFiles: [string, string][] = [
    ...vaultRoot,
    ...["Ideas", "Sources", "Course", "People"].flatMap((sub) =>
      walk(path.join(VAULT_DIR, sub)).map((f) => [sub, f] as [string, string]),
    ),
  ];

  {
    for (const [sub, file] of vaultFiles) {
      const base = path.basename(file, ".md");
      if (base.startsWith("_")) continue;
      const { data, content } = safeMatter(fs.readFileSync(file, "utf8"));
      const stat = fs.statSync(file);
      const modified = frontmatterModified(data, stat.mtime);
      const id = sub ? `note:${sub}/${base}` : `note:${base}`;
      register(
        {
          id,
          label: base,
          kind: "note",
          description:
            typeof data.description === "string"
              ? data.description
              : sub || "Fieldnotes",
          body: content.trim(),
          file,
          modified: modified.toISOString(),
          stage: stageOf(modified),
          signed: null,
          degree: 0,
          source: "vault",
        },
        [base],
      );
      bodies.set(id, content);
    }
  }

  // ── 3b. niwa-vault: Notion, the Reader archive, the hand-written garden ──
  // One file per note, named by slug, and every [[link]] in them is a slug. A
  // slug like `reading-list` also normalises to a memory note's bare key, so
  // links written *in* these notes resolve among them first (resolveFrom).
  const gardenBySlug = new Map<string, string>();
  const related = new Map<string, string[]>();
  const parentSlug = new Map<string, string>();

  for (const file of walk(GARDEN_DIR)) {
    const slug = path.basename(file, ".md");
    if (slug.startsWith("_")) continue;
    const { data, content } = safeMatter(fs.readFileSync(file, "utf8"));
    // `tended` is the vault's own record of when a note was last worked on; a
    // file's mtime only says when it was last cloned or re-imported.
    const tended = data.tended ? new Date(data.tended) : null;
    const modified =
      tended && !Number.isNaN(tended.getTime())
        ? tended
        : fs.statSync(file).mtime;
    const src = String(data.source ?? "");
    const kind: NodeKind =
      src === "notion"
        ? "notion"
        : src === "readwise-reader"
          ? "reading"
          : "garden";
    const label =
      typeof data.title === "string" && data.title.trim()
        ? data.title.trim()
        : slug;
    const summary = typeof data.summary === "string" ? data.summary : "";
    const id = `garden:${slug}`;

    register(
      {
        id,
        label,
        kind,
        description: summary === label ? "" : summary,
        body: content.trim(),
        file,
        modified: modified.toISOString(),
        stage: stageOf(modified),
        signed: null,
        degree: 0,
        source: "garden",
        parent: null,
        tags: Array.isArray(data.topics) ? data.topics.map(String) : [],
      },
      [slug, label],
    );
    if (typeof data.parent === "string") parentSlug.set(id, data.parent);
    bodies.set(id, content);
    gardenBySlug.set(slug, id);
    if (Array.isArray(data.related))
      related.set(
        id,
        data.related.filter((r: unknown) => typeof r === "string"),
      );
  }

  // A parent is only kept if it is a note that exists; the tree stays a tree.
  for (const [id, slug] of parentSlug) {
    const parent = gardenBySlug.get(slug);
    if (parent && parent !== id) nodes.get(id)!.parent = parent;
  }

  // ── 4. Repos: the things actually built ──────────────────────────────────
  // ~/Code has been a farm of symlinks since the work/personal split, so follow
  // the link instead of trusting the dirent, and remember where each repo
  // really lives: anything written since the split names the real path.
  const repoIds = new Map<string, string>();
  const repoByPath = new Map<string, string>(); // "~/personal/garden/niwa" -> id
  const tilde = (p: string) =>
    p.startsWith(HOME + path.sep) ? `~${p.slice(HOME.length)}` : p;
  if (fs.existsSync(CODE_DIR)) {
    for (const entry of fs.readdirSync(CODE_DIR, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(CODE_DIR, entry.name);
      let stat: fs.Stats;
      let real: string;
      try {
        stat = fs.statSync(full);
        real = fs.realpathSync(full);
      } catch {
        continue; // a dangling link, or unreadable
      }
      if (!stat.isDirectory()) continue;
      const id = `repo:${entry.name}`;
      repoIds.set(entry.name.toLowerCase(), id);
      if (real !== full) repoByPath.set(tilde(real), id);
      nodes.set(id, {
        id,
        label: entry.name,
        kind: "repo",
        description: real !== full ? tilde(real) : `~/Code/${entry.name}`,
        body: "",
        file: real,
        modified: stat.mtime.toISOString(),
        stage: stageOf(stat.mtime),
        signed: null,
        degree: 0,
        source: "code",
      });
    }
  }

  // ── 5. Edges ─────────────────────────────────────────────────────────────
  const seen = new Set<string>();
  const addLink = (
    source: string,
    target: string,
    kind: GardenLink["kind"],
  ) => {
    if (source === target) return;
    const key = `${source}→${target}:${kind}`;
    if (seen.has(key)) return;
    seen.add(key);
    links.push({ source, target, kind });
  };

  const resolve = (ref: string): string | null => {
    const k = norm(ref);
    if (!k) return null;
    if (byKey.has(k)) return byKey.get(k)!;
    const bare = stripPrefix(k);
    if (byBare.has(bare)) return byBare.get(bare)!;
    for (const p of MEMORY_PREFIXES)
      if (byKey.has(p + k)) return byKey.get(p + k)!;
    return null;
  };
  const resolveFrom = (from: string, ref: string): string | null =>
    (from.startsWith("garden:") && gardenBySlug.get(ref.trim())) ||
    resolve(ref);

  // Matches either the `~/Code/x` shorthand or this machine's actual CODE_DIR,
  // so a note pointing at code resolves the same way under NIWA_CODE_DIR too.
  const codeDirEscaped = CODE_DIR.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const repoRe = new RegExp(
    `(?:~/Code|${codeDirEscaped})/([A-Za-z0-9][A-Za-z0-9._-]*)`,
    "g",
  );
  // ...and any home-relative path, walked up until it lands on a repo root.
  const homeEscaped = HOME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const homePathRe = new RegExp(`(?:~|${homeEscaped})(/[A-Za-z0-9._/-]+)`, "g");

  for (const [id, refs] of related)
    for (const ref of refs) {
      const target = resolveFrom(id, ref);
      if (target) addLink(id, target, "link");
    }

  for (const [id, body] of bodies) {
    // explicit wikilinks — unresolved ones become ghosts (a garden's unplanted seeds)
    // No newlines or backticks: the Course notes *teach* `[[ ]]` syntax inside code fences.
    for (const m of body.matchAll(
      /\[\[([^\]\[\n`|#]{2,80})(?:[|#][^\]\n]*)?\]\]/g,
    )) {
      const ref = m[1].trim();
      if (!ref || /^[^A-Za-z0-9]/.test(ref)) continue;
      const target = resolveFrom(id, ref);
      if (target) {
        addLink(id, target, "link");
      } else {
        const ghostId = `ghost:${norm(ref)}`;
        if (!nodes.has(ghostId)) {
          nodes.set(ghostId, {
            id: ghostId,
            label: ref,
            kind: "ghost",
            description: "Linked to, never written.",
            body: "",
            file: null,
            modified: null,
            stage: "unknown",
            signed: null,
            degree: 0,
            source: "inferred",
          });
        }
        addLink(id, ghostId, "seed");
      }
    }

    // repo mentions — which notes point at something actually on disk
    for (const m of body.matchAll(repoRe)) {
      // The name class allows "." for repos like "foo.bar", so a mention at the
      // end of a sentence ("~/Code/kiku.") would otherwise capture the period.
      const name = m[1].replace(/[.,;:!?]+$/, "");
      const repo = repoIds.get(name.toLowerCase());
      if (repo) addLink(id, repo, "build");
    }
    if (repoByPath.size)
      for (const m of body.matchAll(homePathRe)) {
        let p = `~${m[1].replace(/[.,;:!?/]+$/, "")}`;
        while (p.lastIndexOf("/") > 0) {
          const repo = repoByPath.get(p);
          if (repo) {
            addLink(id, repo, "build");
            break;
          }
          p = p.slice(0, p.lastIndexOf("/"));
        }
      }

    // glossary vocabulary — where each concept is actually practised
    for (const { id: conceptId, matchers } of concepts) {
      if (conceptId === id) continue;
      if (matchers.some((re) => re.test(body)))
        addLink(conceptId, id, "concept");
    }
  }

  // ── 6. Relations nobody wrote down ───────────────────────────────────────
  // Two notes can be related without a [[link]]: one names the other in prose,
  // or they are the same document filed in two places. Both are derived here,
  // at read time, and never written back into a note.
  const pair = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const joined = new Set(links.map((l) => pair(l.source, l.target)));

  // twin — the same title in two sources. Notion cut filenames at ~50
  // characters, so a long enough title also matches as a prefix.
  const PAGES: NodeKind[] = ["note", "notion", "garden", "reading"];
  const titleKey = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const pages = [...nodes.values()]
    .filter((n) => PAGES.includes(n.kind))
    .map((n) => ({ id: n.id, kind: n.kind, key: titleKey(n.label) }))
    .filter((p) => p.key.length >= 10);
  for (let i = 0; i < pages.length; i++)
    for (let j = i + 1; j < pages.length; j++) {
      const [a, b] = [pages[i], pages[j]];
      const [short, long] =
        a.key.length <= b.key.length ? [a.key, b.key] : [b.key, a.key];
      // Same kind means same source, where a near-identical title is a
      // different page ("Notes (Draft)" and "Notes Draft"), not a copy.
      const same =
        a.kind !== b.kind &&
        (short === long || (short.length >= 24 && long.startsWith(short)));
      if (same && !joined.has(pair(a.id, b.id))) {
        addLink(a.id, b.id, "twin");
        joined.add(pair(a.id, b.id));
      }
    }

  // mention — a note's prose names another note by its title. Titles must be
  // at least two words and ten characters, the same guard the glossary needs:
  // single words ("Films", "Scripts", "Work") would join everything to everything.
  // A two-word title must also match its capitals, or "To Resolve" is named by
  // every sentence that means to resolve something.
  const nameable = [...nodes.values()].filter(
    (n) =>
      !["concept", "repo", "ghost"].includes(n.kind) &&
      /\s/.test(n.label.trim()) &&
      n.label.trim().length >= 10 &&
      /^[A-Za-z]/.test(n.label) &&
      !/_/.test(n.label),
  );
  const named = nameable.map((n) => ({
    id: n.id,
    label: n.label.trim(),
    lower: n.label.trim().toLowerCase(),
    exact: n.label.trim().split(/\s+/).length <= 2,
    re: null as RegExp | null,
  }));
  for (const [id, body] of bodies) {
    // Prose only: a [[link]] already joined these two, and a URL is not a name.
    const prose = body
      .replace(/\[\[[^\]\n]*\]\]/g, " ")
      .replace(/\]\([^)\n]*\)/g, "]");
    const lower = prose.toLowerCase();
    for (const t of named) {
      if (t.id === id || !lower.includes(t.lower)) continue;
      if (joined.has(pair(id, t.id))) continue;
      t.re ??= new RegExp(
        `(?<![\\w-])${t.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`,
        t.exact ? "" : "i",
      );
      if (t.re.test(prose)) {
        addLink(id, t.id, "mention");
        joined.add(pair(id, t.id));
      }
    }
  }

  for (const l of links) {
    const s = nodes.get(l.source);
    const t = nodes.get(l.target);
    if (s) s.degree++;
    if (t) t.degree++;
  }

  const list = [...nodes.values()];
  const byKind: Record<string, number> = {};
  const byStage: Record<string, number> = {};
  for (const n of list) {
    byKind[n.kind] = (byKind[n.kind] ?? 0) + 1;
    byStage[n.stage] = (byStage[n.stage] ?? 0) + 1;
  }
  const dated = list
    .filter((n) => n.modified)
    .sort((a, b) => a.modified!.localeCompare(b.modified!));
  const terms = list.filter((n) => n.kind === "concept");

  const garden: Garden = {
    nodes: list,
    links,
    stats: {
      nodes: list.length,
      links: links.length,
      byKind,
      byStage,
      orphans: list.filter((n) => n.degree === 0).length,
      ghosts: list.filter((n) => n.kind === "ghost").length,
      signedTerms: terms.filter((n) => n.signed).length,
      totalTerms: terms.length,
      newest: dated.at(-1)?.modified ?? null,
      oldest: dated[0]?.modified ?? null,
      builtAt: new Date().toISOString(),
    },
  };

  cache = { fingerprint: fp, garden };
  return garden;
}
