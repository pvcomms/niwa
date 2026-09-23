"use client";

import { Fragment, type ReactNode } from "react";
import type { GardenNode } from "@/lib/garden";
import { KIND_LABEL, STAGE_LABEL } from "@/lib/palette";

type Neighbour = { node: GardenNode; kind: string; direction: "in" | "out" };

type Props = {
  node: GardenNode;
  neighbours: Neighbour[];
  resolve: (ref: string) => GardenNode | null;
  onSelect: (id: string) => void;
  onClose: () => void;
};

type Ctx = {
  /** A [[ref]] written in this note, resolved the way the graph resolved it. */
  wiki: (ref: string) => GardenNode | null;
  onSelect: (id: string) => void;
};

/** Notion's attachments are served from the vault by /api/media, never the open web. */
const localMedia = (src: string) => {
  const m = src.match(/^\/notes-media\/([^/?#]+)$/);
  return m ? `/api/media/${m[1]}` : null;
};

const external = (href: string) => /^(https?:|mailto:)/i.test(href);

/**
 * Inline formatting rendered as React elements, never innerHTML — the source is a pile
 * of hand-edited and imported markdown and it should stay incapable of injecting anything.
 */
const INLINE = new RegExp(
  [
    /\[\[([^\]\n|#]{1,120})(?:#[^\]|\n]*)?(?:\|([^\]\n]+))?\]\]/.source, // 1 ref, 2 alias
    /!\[([^\]\n]*)\]\(([^)\s]+)\)/.source, // 3 alt, 4 src
    /\[([^\]\n]+)\]\(([^)\s]+)\)/.source, // 5 text, 6 href
    /\*\*([^*\n]+)\*\*/.source, // 7 bold
    /(?<![\w*])\*([^*\s][^*\n]*?)\*(?![\w*])/.source, // 8 italic
    /(?<![\w])_([^_\n]+)_(?![\w])/.source, // 9 italic
    /~~([^~\n]+)~~/.source, // 10 struck
    /`([^`\n]+)`/.source, // 11 code
    /(https?:\/\/[^\s<>()[\]]+[^\s<>()[\].,;:!?'"])/.source, // 12 bare url
    /\\([\\`*_{}[\]()#+\-.!~|<>&])/.source, // 13 escaped punctuation
  ].join("|"),
  "g",
);

function inline(text: string, ctx: Ctx, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = new RegExp(INLINE.source, "g");
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[1]) {
      const target = ctx.wiki(m[1].trim());
      const label = m[2]?.trim() || target?.label || m[1].trim();
      out.push(
        target ? (
          <button
            key={k}
            onClick={() => ctx.onSelect(target.id)}
            className="cursor-pointer text-left underline decoration-dotted underline-offset-2"
            style={{ color: "var(--accent)" }}
            title={target.description || target.label}
          >
            {label}
          </button>
        ) : (
          <span key={k} style={{ color: "var(--faint)" }}>
            {label}
          </span>
        ),
      );
    } else if (m[4] !== undefined) {
      const src = localMedia(m[4]);
      out.push(
        src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={k} src={src} alt={m[3]} className="md-img inline" />
        ) : (
          m[3] || m[4]
        ),
      );
    } else if (m[5] !== undefined) {
      const href = localMedia(m[6]) ?? m[6];
      out.push(
        external(href) || href.startsWith("/api/media/") ? (
          <a key={k} href={href} target="_blank" rel="noreferrer noopener">
            {inline(m[5], ctx, k)}
          </a>
        ) : (
          <Fragment key={k}>{inline(m[5], ctx, k)}</Fragment>
        ),
      );
    } else if (m[7] !== undefined) {
      out.push(<strong key={k}>{inline(m[7], ctx, k)}</strong>);
    } else if (m[8] !== undefined || m[9] !== undefined) {
      out.push(<em key={k}>{inline(m[8] ?? m[9]!, ctx, k)}</em>);
    } else if (m[10] !== undefined) {
      out.push(<s key={k}>{inline(m[10], ctx, k)}</s>);
    } else if (m[11] !== undefined) {
      out.push(<code key={k}>{m[11]}</code>);
    } else if (m[12] !== undefined) {
      out.push(
        <a key={k} href={m[12]} target="_blank" rel="noreferrer noopener">
          {m[12].replace(/^https?:\/\/(www\.)?/, "")}
        </a>,
      );
    } else if (m[13] !== undefined) {
      out.push(m[13]);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// ── blocks ─────────────────────────────────────────────────────────────────

type Item = {
  depth: number;
  marker: string | null; // "3." for ordered lists, null for bullets
  check: boolean | null;
  text: string;
};

type Block =
  | { t: "h"; level: number; text: string }
  | { t: "p"; lines: string[] }
  | { t: "list"; items: Item[] }
  | { t: "quote"; lines: string[] }
  | { t: "code"; text: string }
  | { t: "table"; rows: string[][] }
  | { t: "img"; alt: string; src: string }
  | { t: "hr" };

const LIST = /^(\s*)([-*+]|\d+[.)])\s+(?:\[([ xX])\]\s+)?(.*)$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^([-*_])(\s*\1){2,}$/;
const IMAGE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;

const startsBlock = (line: string) => {
  const t = line.trim();
  return (
    HEADING.test(t) ||
    t.startsWith("```") ||
    t.startsWith(">") ||
    t.startsWith("|") ||
    LIST.test(line) ||
    RULE.test(t) ||
    IMAGE.test(t)
  );
};

/**
 * Line-based, because Notion's export is not paragraph-shaped: lists nest by
 * indentation, a callout is a run of `>` lines, and a code fence can hold a
 * blank line that a split on blank lines would cut in half.
 */
function parse(body: string): Block[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const out: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (!t) {
      i++;
      continue;
    }

    if (t.startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```"))
        buf.push(lines[i++]);
      i++;
      out.push({ t: "code", text: buf.join("\n") });
      continue;
    }

    const h = t.match(HEADING);
    if (h) {
      out.push({ t: "h", level: h[1].length, text: h[2] });
      i++;
      continue;
    }

    if (RULE.test(t)) {
      out.push({ t: "hr" });
      i++;
      continue;
    }

    const img = t.match(IMAGE);
    if (img) {
      out.push({ t: "img", alt: img[1], src: img[2] });
      i++;
      continue;
    }

    if (t.startsWith("|")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|"))
        buf.push(lines[i++].trim());
      const rows = buf
        .map((l) =>
          l
            .replace(/^\||\|$/g, "")
            .split("|")
            .map((c) => c.trim()),
        )
        .filter((cells) => !cells.every((c) => /^:?-{2,}:?$/.test(c)));
      out.push(
        rows.length >= 2 ? { t: "table", rows } : { t: "p", lines: buf },
      );
      continue;
    }

    if (t.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">"))
        buf.push(lines[i++].trim().replace(/^>\s?/, ""));
      out.push({ t: "quote", lines: buf });
      continue;
    }

    if (LIST.test(line)) {
      const items: Item[] = [];
      const indents: number[] = [];
      const depthOf = (n: number) => {
        while (indents.length && indents.at(-1)! > n) indents.pop();
        if (!indents.length || indents.at(-1)! < n) indents.push(n);
        return indents.length - 1;
      };
      while (i < lines.length) {
        const l = lines[i];
        const m = l.match(LIST);
        if (m) {
          items.push({
            depth: depthOf(m[1].replace(/\t/g, "    ").length),
            marker: /\d/.test(m[2]) ? m[2].replace(")", ".") : null,
            check: m[3] === undefined ? null : m[3] !== " ",
            text: m[4],
          });
          i++;
          continue;
        }
        // A blank line between two items does not end the list.
        if (!l.trim() && i + 1 < lines.length && LIST.test(lines[i + 1])) {
          i++;
          continue;
        }
        // An indented line under an item is that item's continuation.
        if (l.trim() && /^\s{2,}/.test(l) && !startsBlock(l)) {
          items[items.length - 1].text += `\n${l.trim()}`;
          i++;
          continue;
        }
        break;
      }
      out.push({ t: "list", items });
      continue;
    }

    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i]))
      buf.push(lines[i++].trim());
    if (!buf.length) buf.push(lines[i++].trim());
    out.push({ t: "p", lines: buf });
  }
  return out;
}

/** Line breaks inside a block are Notion's own; keep them. */
function withBreaks(lines: string[], ctx: Ctx, key: string): ReactNode[] {
  return lines.flatMap((l, li) => [
    ...(li ? [<br key={`${key}-br${li}`} />] : []),
    ...inline(l, ctx, `${key}-${li}`),
  ]);
}

function Markdown({ body, ctx }: { body: string; ctx: Ctx }) {
  return (
    <div
      className="reader-body"
      style={{ fontSize: 13, color: "var(--muted)" }}
    >
      {parse(body).map((b, bi) => {
        const k = `b${bi}`;
        switch (b.t) {
          case "h":
            return b.level <= 2 ? (
              <h2 key={k}>{inline(b.text, ctx, k)}</h2>
            ) : (
              <h3 key={k}>{inline(b.text, ctx, k)}</h3>
            );
          case "hr":
            return <hr key={k} />;
          case "img": {
            const src = localMedia(b.src);
            return src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={k}
                src={src}
                alt={b.alt}
                loading="lazy"
                className="md-img"
              />
            ) : (
              <p key={k}>{b.alt || b.src}</p>
            );
          }
          case "code":
            return (
              <pre
                key={k}
                className="scroll-thin overflow-x-auto p-3 text-[11px]"
                style={{
                  fontFamily: "var(--font-mono)",
                  background: "color-mix(in srgb, var(--ink) 5%, transparent)",
                  borderRadius: 4,
                }}
              >
                {b.text}
              </pre>
            );
          case "quote":
            return (
              <blockquote key={k}>
                {withBreaks(
                  b.lines.filter((l, li, all) => l || all[li - 1]),
                  ctx,
                  k,
                )}
              </blockquote>
            );
          case "list":
            return (
              <ul key={k}>
                {b.items.map((it, li) => (
                  <li
                    key={li}
                    className={it.marker || it.check !== null ? "plain" : ""}
                    style={{ marginLeft: `${it.depth * 1.15}em` }}
                  >
                    {it.marker && (
                      <span className="md-marker" aria-hidden>
                        {it.marker}
                      </span>
                    )}
                    {it.check !== null && (
                      <span
                        className="md-check"
                        data-done={it.check || undefined}
                        role="img"
                        aria-label={it.check ? "done" : "not done"}
                      />
                    )}
                    {withBreaks(it.text.split("\n"), ctx, `${k}-${li}`)}
                  </li>
                ))}
              </ul>
            );
          case "table": {
            const [head, ...rest] = b.rows;
            return (
              <div key={k} className="scroll-thin my-4 overflow-x-auto">
                <table className="w-full border-collapse text-[11.5px]">
                  <thead>
                    <tr>
                      {head.map((c, ci) => (
                        <th
                          key={ci}
                          className="px-2 py-1.5 text-left font-semibold whitespace-nowrap"
                          style={{
                            color: "var(--ink)",
                            borderBottom: "1px solid var(--rule)",
                          }}
                        >
                          {inline(c, ctx, `${k}-th${ci}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rest.map((cells, ri) => (
                      <tr key={ri}>
                        {cells.map((c, ci) => (
                          <td
                            key={ci}
                            className="px-2 py-1.5 align-top"
                            style={{ borderBottom: "1px solid var(--rule)" }}
                          >
                            {inline(c, ctx, `${k}-td${ri}-${ci}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          default:
            return <p key={k}>{withBreaks(b.lines, ctx, k)}</p>;
        }
      })}
    </div>
  );
}

// ── neighbours ─────────────────────────────────────────────────────────────

/**
 * Written links and prose mentions have a direction worth reading — what this
 * note reaches for is a different list from what reaches for it. The rest are
 * symmetric, so they stay one list.
 */
const GROUPS: { kind: string; direction?: "in" | "out"; label: string }[] = [
  { kind: "link", direction: "out", label: "Links to" },
  { kind: "link", direction: "in", label: "Linked from" },
  { kind: "twin", label: "Same document, filed elsewhere" },
  { kind: "mention", direction: "out", label: "Names in passing" },
  { kind: "mention", direction: "in", label: "Named in passing by" },
  { kind: "concept", label: "Shared vocabulary" },
  { kind: "build", label: "Code on disk" },
  { kind: "seed", label: "Unplanted" },
];

export default function Reader({
  node,
  neighbours,
  resolve,
  onSelect,
  onClose,
}: Props) {
  const groups = GROUPS.map((g) => ({
    ...g,
    items: neighbours.filter(
      (n) => n.kind === g.kind && (!g.direction || n.direction === g.direction),
    ),
  })).filter((g) => g.items.length);

  // Links written in a vault note are slugs of that vault first — the same
  // precedence the graph used, so a click lands where the thread goes.
  const ctx: Ctx = {
    wiki: (ref) =>
      (node.source === "garden" && resolve(`garden:${ref}`)) || resolve(ref),
    onSelect,
  };

  return (
    <aside
      key={node.id}
      className="panel slide-in scroll-thin pointer-events-auto absolute top-0 right-0 bottom-0 z-20 w-full overflow-y-auto sm:w-[min(34rem,54vw)]"
      style={{ borderTop: 0, borderRight: 0, borderBottom: 0 }}
      aria-label={`Detail: ${node.label}`}
    >
      <div
        className="sticky top-0 z-10 flex items-start justify-between gap-4 px-8 pt-7 pb-4"
        style={{
          background: "color-mix(in srgb, var(--surface) 92%, transparent)",
        }}
      >
        <div className="min-w-0">
          <div
            className="meta flex items-center gap-2"
            style={{ color: "var(--faint)" }}
          >
            <span
              aria-hidden
              style={{
                width: 7,
                height: 7,
                borderRadius: 99,
                background: `var(--kind-${node.kind})`,
                display: "inline-block",
              }}
            />
            {KIND_LABEL[node.kind] ?? node.kind}
            <span style={{ opacity: 0.4 }}>/</span>
            {STAGE_LABEL[node.stage] ?? node.stage}
          </div>
          <h2
            className="display mt-2 text-[26px] leading-[1.15] break-words"
            style={{ color: "var(--ink)" }}
          >
            {node.label}
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="chip shrink-0 px-2.5 py-1 text-[11px] leading-none"
          style={{ color: "var(--muted)" }}
        >
          esc
        </button>
      </div>

      <div className="px-8 pb-10">
        {node.description && node.kind !== "notion" && (
          <p
            className="mb-6 text-[13.5px] leading-[1.7]"
            style={{ color: "var(--ink)" }}
          >
            {node.description}
          </p>
        )}

        {node.signed === false && (
          <p
            className="mb-6 px-3 py-2 text-[11.5px] leading-[1.6]"
            style={{
              borderLeft: `2px solid var(--accent)`,
              color: "var(--muted)",
            }}
          >
            Unsigned — this term is still <code>status: seed</code>. Nobody has
            claimed it as theirs.
          </p>
        )}

        {node.kind === "ghost" && (
          <p
            className="mb-6 text-[12.5px] leading-[1.7]"
            style={{ color: "var(--muted)" }}
          >
            Nothing on disk answers to this name. Something links here, so the
            idea exists — it has just never been written down.
          </p>
        )}

        {node.source === "garden" && !node.body && (
          <p
            className="mb-6 text-[12.5px] leading-[1.7]"
            style={{ color: "var(--muted)" }}
          >
            {node.kind === "notion"
              ? "A page that was only ever a title in Notion. It is kept because its parent links here."
              : "Nothing written here yet."}
          </p>
        )}

        {node.body && <Markdown body={node.body} ctx={ctx} />}

        {groups.length > 0 && (
          <div className="mt-9">
            {groups.map(({ kind, direction, label, items }) => (
              <Fragment key={`${kind}-${direction ?? "both"}`}>
                <div
                  className="meta mt-6 mb-2.5"
                  style={{ color: "var(--faint)" }}
                >
                  {label}
                  <span style={{ opacity: 0.5 }}> · {items.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {items.map(({ node: n, direction: d }) => (
                    <button
                      key={`${n.id}-${d}`}
                      onClick={() => onSelect(n.id)}
                      className="chip px-2.5 py-1 text-left text-[11.5px] leading-tight"
                      style={{ color: "var(--muted)" }}
                      title={n.description || n.label}
                    >
                      <span
                        aria-hidden
                        className="mr-1.5 inline-block align-middle"
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 99,
                          background: `var(--kind-${n.kind})`,
                        }}
                      />
                      {n.label.length > 42
                        ? `${n.label.slice(0, 42)}…`
                        : n.label}
                    </button>
                  ))}
                </div>
              </Fragment>
            ))}
          </div>
        )}

        {node.file && (
          <p
            className="mt-10 pt-4 text-[10.5px] break-all"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--faint)",
              borderTop: "1px solid var(--rule)",
            }}
          >
            {node.file.replace(/^\/Users\/[^/]+/, "~")}
          </p>
        )}
      </div>
    </aside>
  );
}
