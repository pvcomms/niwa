"use client";

import { Fragment, type ReactNode } from "react";
import type { GardenNode } from "@/lib/garden";
import { KIND_LABEL, STAGE_LABEL } from "@/lib/palette";

type Props = {
  node: GardenNode;
  neighbours: { node: GardenNode; kind: string; direction: "in" | "out" }[];
  onSelect: (id: string) => void;
  onClose: () => void;
};

/**
 * Inline formatting rendered as React elements, never innerHTML — the source is a pile
 * of hand-edited markdown and it should stay incapable of injecting anything.
 */
function inline(
  text: string,
  onSelect: (id: string) => void,
  key: string,
): ReactNode[] {
  const out: ReactNode[] = [];
  const re =
    /\[\[([^\]\n|#]{1,80})(?:[|#][^\]\n]*)?\]\]|\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      const ref = m[1].trim();
      out.push(
        <button
          key={`${key}-w${i++}`}
          onClick={() => onSelect(ref)}
          className="cursor-pointer underline decoration-dotted underline-offset-2"
          style={{ color: "var(--accent)" }}
        >
          {ref}
        </button>,
      );
    } else if (m[2]) {
      out.push(<strong key={`${key}-b${i++}`}>{m[2]}</strong>);
    } else if (m[3]) {
      out.push(<code key={`${key}-c${i++}`}>{m[3]}</code>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Markdown({
  body,
  onSelect,
}: {
  body: string;
  onSelect: (id: string) => void;
}) {
  const blocks = body.split(/\n{2,}/).slice(0, 60);

  return (
    <div
      className="reader-body"
      style={{ fontSize: 13, color: "var(--muted)" }}
    >
      {blocks.map((block, bi) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
        if (heading)
          return <h3 key={bi}>{inline(heading[2], onSelect, `h${bi}`)}</h3>;

        const lines = trimmed.split("\n");

        // Several glossary notes are mostly tables; without this they render as
        // a wall of pipes. Tables get their own scroll box so the page cannot
        // scroll sideways on a phone.
        if (
          lines.length >= 2 &&
          lines.filter((l) => l.trim().startsWith("|")).length >= 2
        ) {
          const rows = lines
            .filter((l) => l.trim().startsWith("|"))
            .map((l) =>
              l
                .trim()
                .replace(/^\||\|$/g, "")
                .split("|")
                .map((c) => c.trim()),
            )
            .filter((cells) => !cells.every((c) => /^:?-{2,}:?$/.test(c)));
          const [head, ...rest] = rows;
          return (
            <div key={bi} className="scroll-thin my-4 overflow-x-auto">
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
                        {inline(c, onSelect, `th${bi}-${ci}`)}
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
                          {inline(c, onSelect, `td${bi}-${ri}-${ci}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
          return (
            <ul key={bi}>
              {lines.map((l, li) => (
                <li key={li}>
                  {inline(
                    l.replace(/^\s*[-*]\s+/, ""),
                    onSelect,
                    `l${bi}-${li}`,
                  )}
                </li>
              ))}
            </ul>
          );
        }

        if (/^\s*```/.test(trimmed)) {
          return (
            <pre
              key={bi}
              className="scroll-thin overflow-x-auto p-3 text-[11px]"
              style={{
                fontFamily: "var(--font-mono)",
                background: "color-mix(in srgb, var(--ink) 5%, transparent)",
                borderRadius: 4,
              }}
            >
              {trimmed.replace(/```[a-z]*\n?/g, "")}
            </pre>
          );
        }

        return <p key={bi}>{inline(trimmed, onSelect, `p${bi}`)}</p>;
      })}
    </div>
  );
}

export default function Reader({ node, neighbours, onSelect, onClose }: Props) {
  const grouped = ["link", "concept", "build", "seed"]
    .map((kind) => ({ kind, items: neighbours.filter((n) => n.kind === kind) }))
    .filter((g) => g.items.length);

  return (
    <aside
      key={node.id}
      className="panel slide-in scroll-thin pointer-events-auto absolute top-0 right-0 bottom-0 z-20 w-full overflow-y-auto sm:w-[min(30rem,52vw)]"
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
        {node.description && (
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

        {node.body && <Markdown body={node.body} onSelect={onSelect} />}

        {grouped.length > 0 && (
          <div className="mt-9">
            {grouped.map(({ kind, items }) => (
              <Fragment key={kind}>
                <div
                  className="meta mt-6 mb-2.5"
                  style={{ color: "var(--faint)" }}
                >
                  {kind === "link"
                    ? "Written links"
                    : kind === "concept"
                      ? "Shared vocabulary"
                      : kind === "build"
                        ? "Code on disk"
                        : "Unplanted"}
                  <span style={{ opacity: 0.5 }}> · {items.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {items.map(({ node: n, direction }) => (
                    <button
                      key={`${n.id}-${direction}`}
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
