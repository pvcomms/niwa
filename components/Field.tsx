"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { GardenNode } from "@/lib/garden";
import { jitter, seedOf } from "@/lib/hand";
import { KIND_LABEL, KIND_ORDER } from "@/lib/palette";

/**
 * How a mark reads against the whole:
 *   self — the note in hand          near — one thread away
 *   kin  — same parent, or under it  on   — in the current view
 *   off  — the rest of the garden, always drawn, never hidden
 */
export type Tone = "self" | "near" | "kin" | "on" | "off";

type Props = {
  /** Every note, already in reading order. */
  nodes: GardenNode[];
  tone: (n: GardenNode) => Tone;
  onPick: (id: string) => void;
  /** One line about a hovered mark, e.g. its trail. */
  describe?: (n: GardenNode) => ReactNode;
  compact?: boolean;
  caption?: ReactNode;
};

/**
 * The whole garden as beds of marks, one mark per note. Nothing is ever left
 * out of it: filtering and opening a page only change which marks are lit, so
 * the part is always seen against everything it is part of.
 */
export default function Field({
  nodes,
  tone,
  onPick,
  describe,
  compact = false,
  caption,
}: Props) {
  const [hover, setHover] = useState<GardenNode | null>(null);
  const cols = compact ? 18 : 24;

  const beds = useMemo(() => {
    const by = new Map<string, GardenNode[]>();
    for (const n of nodes) {
      if (!by.has(n.kind)) by.set(n.kind, []);
      by.get(n.kind)!.push(n);
    }
    return (KIND_ORDER as readonly string[])
      .filter((k) => by.has(k))
      .map((k) => ({ kind: k, nodes: by.get(k)! }));
  }, [nodes]);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const target = (e: React.SyntheticEvent) =>
    (e.target as HTMLElement).closest<HTMLElement>("[data-id]")?.dataset.id;

  return (
    <figure className="m-0">
      <div
        className={`flex flex-wrap ${compact ? "gap-x-4 gap-y-3" : "gap-x-7 gap-y-5"}`}
        onClick={(e) => {
          const id = target(e);
          if (id) onPick(id);
        }}
        onMouseOver={(e) => {
          const id = target(e);
          setHover(id ? (byId.get(id) ?? null) : null);
        }}
        onMouseLeave={() => setHover(null)}
        aria-hidden
      >
        {beds.map(({ kind, nodes: bed }) => {
          const lit = bed.filter((n) => tone(n) !== "off").length;
          return (
            <div key={kind}>
              <div
                className="meta mb-1.5 flex items-baseline gap-1.5"
                style={{ color: "var(--faint)", fontSize: compact ? 9 : 9.5 }}
              >
                <span style={{ color: lit ? "var(--muted)" : "var(--faint)" }}>
                  {KIND_LABEL[kind] ?? kind}
                </span>
                <span style={{ opacity: 0.7 }}>
                  {lit && lit !== bed.length ? `${lit}/` : ""}
                  {bed.length}
                </span>
              </div>
              <div
                className="grid gap-[2px]"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(bed.length, cols)}, ${compact ? 5 : 6}px)`,
                }}
              >
                {bed.map((n) => {
                  const t = tone(n);
                  const j = jitter(seedOf(n.id), 0.5, 16);
                  const set = {
                    "--dx": `${j.dx}px`,
                    "--dy": `${j.dy}px`,
                    "--tilt": `${j.rot}deg`,
                  } as React.CSSProperties;
                  return (
                    <span
                      key={n.id}
                      data-id={n.id}
                      data-tone={t}
                      className="field-mark"
                      style={{
                        ...set,
                        width: compact ? 5 : 6,
                        height: compact ? 5 : 6,
                        background:
                          t === "self"
                            ? "var(--accent)"
                            : t === "off"
                              ? "var(--rule)"
                              : `var(--kind-${n.kind})`,
                        opacity: t === "kin" ? 0.5 : 1,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <figcaption
        className="hand mt-3 min-h-[1.2em] text-[14.5px] leading-snug"
        style={{ color: "var(--faint)" }}
      >
        {hover ? (
          <>
            <span style={{ color: "var(--ink)" }}>{hover.label}</span>
            {describe && <span> · {describe(hover)}</span>}
          </>
        ) : (
          caption
        )}
      </figcaption>
    </figure>
  );
}
