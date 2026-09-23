"use client";

import { Fragment } from "react";
import type { GardenNode } from "@/lib/garden";
import { KIND_LABEL, STAGE_LABEL } from "@/lib/palette";
import { Markdown, type Ctx } from "./Markdown";

type Neighbour = { node: GardenNode; kind: string; direction: "in" | "out" };

type Props = {
  node: GardenNode;
  neighbours: Neighbour[];
  resolve: (ref: string) => GardenNode | null;
  onSelect: (id: string) => void;
  onClose: () => void;
};

// ── neighbours ─────────────────────────────────────────────────────────────

/**
 * Written links and prose mentions have a direction worth reading — what this
 * note reaches for is a different list from what reaches for it. The rest are
 * symmetric, so they stay one list.
 */
export const GROUPS: {
  kind: string;
  direction?: "in" | "out";
  label: string;
}[] = [
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

        <a
          href={`/catalogue?id=${encodeURIComponent(node.id)}`}
          className="chip mt-10 inline-block px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
        >
          <span className="mr-1.5 tracking-normal normal-case">目録</span>
          Open in catalogue
        </a>

        {node.file && (
          <p
            className="mt-6 pt-4 text-[10.5px] break-all"
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
