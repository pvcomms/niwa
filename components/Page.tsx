"use client";

import { putOnDesk } from "./desk";
import { Fragment, useEffect, useRef } from "react";
import type { GardenNode } from "@/lib/garden";
import { KIND_LABEL, STAGE_LABEL } from "@/lib/palette";
import { childrenOf } from "@/lib/place";
import type { Index } from "./Catalogue";
import Field from "./Field";
import { Markdown } from "./Markdown";
import { GROUPS } from "./Reader";
import { SheetEdge } from "./Sketch";

type Props = {
  node: GardenNode;
  index: Index;
  onOpen: (id: string) => void;
  onClose: () => void;
};

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * A note opened from the catalogue. Before its own words it says where it is:
 * the path down to it, where it sits among its siblings, and which part of the
 * whole its threads reach — so nothing is ever read as if it stood alone.
 */
export default function Page({ node, index, onOpen, onClose }: Props) {
  useEffect(() => {
    putOnDesk({ kind: node.kind, id: node.id, label: node.label });
    return () => putOnDesk(null);
  }, [node.id, node.kind, node.label]);
  const scroller = useRef<HTMLElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [node.id]);

  const crumbs = index.trails.get(node.id) ?? [];
  const threads = index.threads.get(node.id) ?? [];
  const near = new Set(threads.map((t) => t.id));
  const parent = node.parent ? (index.byId.get(node.parent) ?? null) : null;
  const siblings = parent ? childrenOf(parent, index.nodes) : [];
  const children = index.kids.get(node.id) ? childrenOf(node, index.nodes) : [];
  const kin = new Set([
    ...(parent ? [parent.id] : []),
    ...siblings.map((s) => s.id),
    ...children.map((c) => c.id),
  ]);
  const bed = KIND_LABEL[node.kind] ?? node.kind;
  const bedSize = index.nodes.filter((n) => n.kind === node.kind).length;
  const depth = index.place.get(node.id)?.depth ?? 0;
  const bedsReached = new Set(
    [...near].map((id) => index.byId.get(id)?.kind).filter(Boolean),
  ).size;
  const out = threads.filter((t) => t.direction === "out").length;

  const groups = GROUPS.map((g) => {
    const seen = new Set<string>();
    const items = threads
      .filter(
        (t) =>
          t.kind === g.kind && (!g.direction || t.direction === g.direction),
      )
      .map((t) => index.byId.get(t.id))
      .filter((n): n is GardenNode => {
        if (!n || seen.has(n.id)) return false;
        seen.add(n.id);
        return true;
      });
    return { ...g, items };
  }).filter((g) => g.items.length);

  const whereSentence = [
    `One of ${bedSize} in ${bed}`,
    depth > 0 && crumbs[0]
      ? `${plural(depth, "level")} below ${crumbs[0].label}`
      : null,
    threads.length
      ? `${plural(threads.length, "thread")} reaching ${plural(near.size, "note")} in ${plural(bedsReached, "bed")}`
      : "no threads yet — nothing links here, and it links nowhere",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <aside
      ref={scroller}
      className="panel slide-in scroll-thin fixed top-0 right-0 bottom-0 z-30 w-full overflow-y-auto lg:w-[min(44rem,52vw)]"
      style={{ border: 0 }}
      aria-label={`Page: ${node.label}`}
    >
      <SheetEdge seed={node.id} />
      {/* the path down to it */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-6 py-3 sm:px-10"
        style={{
          background: "color-mix(in srgb, var(--surface) 94%, transparent)",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <nav
          aria-label="Where this sits"
          className="min-w-0 flex-1 truncate text-[11px]"
          style={{ fontFamily: "var(--font-mono)", color: "var(--faint)" }}
        >
          {crumbs.map((c, i) => (
            <Fragment key={`${c.label}-${i}`}>
              {i > 0 && <span className="mx-1.5">›</span>}
              {c.id ? (
                <button onClick={() => onOpen(c.id!)} className="crumb">
                  {c.label}
                </button>
              ) : (
                <span>{c.label}</span>
              )}
            </Fragment>
          ))}
        </nav>
        <a
          href={`/?focus=${encodeURIComponent(node.id)}`}
          className="chip shrink-0 px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
        >
          in the garden
        </a>
        <a
          href={`/flow?id=${encodeURIComponent(node.id)}`}
          className="chip shrink-0 px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
        >
          in the flow
        </a>
        <a
          href={`/course?id=${encodeURIComponent(node.id)}`}
          className="chip shrink-0 px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
        >
          its course
        </a>
        <a
          href={`/chronology?stone=${encodeURIComponent(node.id)}`}
          className="chip shrink-0 px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
        >
          its dates
        </a>
        <a
          href={`/alarm?stone=${encodeURIComponent(node.id)}`}
          className="chip shrink-0 px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
        >
          its alarm
        </a>
        <a
          href={`/provenance?stone=${encodeURIComponent(node.id)}`}
          className="chip shrink-0 px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
        >
          its provenance
        </a>
        <a
          href={`/oblique?id=${encodeURIComponent(node.id)}`}
          className="chip shrink-0 px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
        >
          a card
        </a>
        <a
          href={`/dialogue?id=${encodeURIComponent(node.id)}`}
          className="chip shrink-0 px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
        >
          question it
        </a>
        <a
          href={`/mask?id=${encodeURIComponent(node.id)}`}
          className="chip shrink-0 px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
        >
          in the mask
        </a>
        <a
          href={`/tack?id=${encodeURIComponent(node.id)}`}
          className="chip shrink-0 px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
        >
          its tack
        </a>
        <button
          onClick={onClose}
          aria-label="Close"
          className="chip shrink-0 px-2.5 py-1 text-[11px] leading-none"
          style={{ color: "var(--muted)" }}
        >
          esc
        </button>
      </div>

      <article
        key={node.id}
        className="rise px-6 pt-9 pb-16 sm:px-10"
        style={{ animationDuration: "380ms" }}
      >
        <h2
          className="display text-[34px] leading-[1.08] break-words"
          style={{ color: "var(--ink)" }}
        >
          {node.label}
        </h2>
        {node.description && node.kind !== "notion" && (
          <p
            className="mt-3 text-[13.5px] leading-[1.7]"
            style={{ color: "var(--muted)" }}
          >
            {node.description}
          </p>
        )}

        {/* properties, the way a database row carries them */}
        <dl className="props mt-7 grid grid-cols-[7.5rem_1fr] gap-x-4 gap-y-2.5 text-[12px]">
          <dt>Bed</dt>
          <dd className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-[6px] w-[6px] rounded-full"
              style={{ background: `var(--kind-${node.kind})` }}
            />
            {bed}
          </dd>
          <dt>Tended</dt>
          <dd>
            {node.modified
              ? new Date(node.modified).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "—"}
            <span style={{ color: "var(--faint)" }}>
              {" "}
              · {STAGE_LABEL[node.stage] ?? node.stage}
            </span>
          </dd>
          {(node.tags ?? []).length > 0 && (
            <>
              <dt>Topics</dt>
              <dd className="flex flex-wrap gap-1">
                {node.tags!.map((t) => (
                  <span key={t} className="tag px-1.5 py-[1px] text-[10.5px]">
                    {t}
                  </span>
                ))}
              </dd>
            </>
          )}
          <dt>Threads</dt>
          <dd>
            {out} out · {threads.length - out} in
          </dd>
        </dl>

        {/* the part, against the whole */}
        <section className="context mt-9" aria-label="In the whole">
          <div className="meta mb-3" style={{ color: "var(--faint)" }}>
            In the whole
          </div>
          <p
            className="hand mb-5 text-[16px] leading-[1.35]"
            style={{ color: "var(--ink)" }}
          >
            {whereSentence}.
          </p>
          <Field
            compact
            nodes={index.nodes}
            tone={(n) =>
              n.id === node.id
                ? "self"
                : near.has(n.id)
                  ? "near"
                  : kin.has(n.id)
                    ? "kin"
                    : "off"
            }
            onPick={onOpen}
            describe={(n) =>
              (index.trails.get(n.id) ?? []).map((c) => c.label).join(" › ") ||
              (KIND_LABEL[n.kind] ?? n.kind)
            }
            caption={
              <span className="flex flex-wrap gap-x-4 gap-y-1">
                <Key tone="self" label="this note" />
                <Key tone="near" label="one thread away" />
                {kin.size > 0 && <Key tone="kin" label="same parent" />}
              </span>
            }
          />

          {parent && (
            <Family
              title={`Beside it, under ${parent.label}`}
              meta={`${siblings.findIndex((s) => s.id === node.id) + 1} of ${siblings.length}`}
              nodes={siblings}
              current={node.id}
              onOpen={onOpen}
            />
          )}
          {children.length > 0 && (
            <Family
              title="Under this page"
              meta={`${children.length}`}
              nodes={children}
              current={node.id}
              onOpen={onOpen}
            />
          )}
        </section>

        <div
          className="mt-10 pt-8"
          style={{ borderTop: "1px solid var(--rule)" }}
        >
          {node.body ? (
            <Markdown
              body={node.body}
              ctx={{
                wiki: (ref) => index.resolve(ref, node),
                onSelect: onOpen,
              }}
            />
          ) : (
            <p className="hand text-[15.5px]" style={{ color: "var(--muted)" }}>
              {node.kind === "notion"
                ? "Only ever a title in Notion. It is kept because its parent lists it."
                : node.kind === "ghost"
                  ? "Linked to and never written."
                  : "Nothing written here yet."}
            </p>
          )}
        </div>

        {groups.length > 0 && (
          <div className="mt-10">
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
                  {items.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => onOpen(n.id)}
                      className="chip px-2.5 py-1 text-left text-[11.5px] leading-tight"
                      style={{ color: "var(--muted)" }}
                      title={
                        (index.trails.get(n.id) ?? [])
                          .map((c) => c.label)
                          .join(" › ") || n.label
                      }
                    >
                      <span
                        aria-hidden
                        className="mr-1.5 inline-block h-[5px] w-[5px] rounded-full align-middle"
                        style={{ background: `var(--kind-${n.kind})` }}
                      />
                      {n.label.length > 44
                        ? `${n.label.slice(0, 44)}…`
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
            className="mt-12 pt-4 text-[10.5px] break-all"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--faint)",
              borderTop: "1px solid var(--rule)",
            }}
          >
            {node.file.replace(/^\/Users\/[^/]+/, "~")}
          </p>
        )}
      </article>
    </aside>
  );
}

function Key({
  tone,
  label,
}: {
  tone: "self" | "near" | "kin";
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block h-[5px] w-[5px] rounded-[1px]"
        style={{
          background: tone === "self" ? "var(--accent)" : "var(--muted)",
          opacity: tone === "kin" ? 0.45 : 1,
        }}
      />
      {label}
    </span>
  );
}

function Family({
  title,
  meta,
  nodes,
  current,
  onOpen,
}: {
  title: string;
  meta: string;
  nodes: GardenNode[];
  current: string;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="mt-7">
      <div className="meta mb-2" style={{ color: "var(--faint)" }}>
        {title}
        <span style={{ opacity: 0.6 }}> · {meta}</span>
      </div>
      <ol className="family gap-x-6 sm:columns-2">
        {nodes.map((n) => {
          const here = n.id === current;
          return (
            <li key={n.id} className="break-inside-avoid">
              <button
                onClick={() => onOpen(n.id)}
                disabled={here}
                aria-current={here ? "page" : undefined}
                className="family-item flex w-full items-center gap-2 py-[5px] text-left text-[12px]"
                style={{ color: here ? "var(--ink)" : "var(--muted)" }}
              >
                <span
                  aria-hidden
                  className="inline-block h-[5px] w-[5px] shrink-0 rounded-full"
                  style={{
                    background: here
                      ? "var(--accent)"
                      : `var(--kind-${n.kind})`,
                    opacity: here ? 1 : 0.55,
                  }}
                />
                <span className="truncate">{n.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
