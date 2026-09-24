"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ribbon,
  roughEdge,
  roughEllipse,
  roughRect,
  roughStrike,
  roughUnderline,
  seedOf,
} from "@/lib/hand";

type Kind = "box" | "ring" | "underline" | "strike";

type Props = {
  kind?: Kind;
  /** Anything stable — the id of what is being framed. Same seed, same line. */
  seed: string;
  color?: string;
  /** The pen's width at full pressure. */
  width?: number;
  /** Draw the line on as it appears, instead of having it already there. */
  draw?: boolean;
  className?: string;
};

const PEN: Record<Kind, number> = {
  box: 1.7,
  ring: 1.6,
  underline: 1.5,
  strike: 1.5,
};

/**
 * A pen line laid over the element it sits in. The parent is positioned;
 * this fills it, ignores the pointer, and is re-drawn only when the parent
 * changes size. Nothing renders on the server — a line needs a size — so a
 * sketched border is always something that arrives just after the paper.
 *
 * The ink is a ribbon (thin where the pen lands and lifts, full through the
 * middle); drawing on reveals it through a mask that is the same line,
 * stroked wide and drawn from one end.
 *
 *   box       four strokes, each running a little past its corner
 *   ring      circled, the way a word gets ringed in a notebook
 *   underline a line under it, a touch before and after
 *   strike    crossed out
 */
export default function Sketch({
  kind = "box",
  seed,
  color = "var(--pen)",
  width,
  draw = false,
  className = "",
}: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<[number, number] | null>(null);
  const mid = `m${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const pen = width ?? PEN[kind];

  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const measure = () => {
      const next: [number, number] = [el.offsetWidth, el.offsetHeight];
      setSize((s) => (s && s[0] === next[0] && s[1] === next[1] ? s : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { line, ink } = useMemo(() => {
    if (!size) return { line: "", ink: "" };
    const [w, h] = size;
    const s = seedOf(seed);
    const line =
      kind === "box"
        ? roughRect(w, h, s)
        : kind === "ring"
          ? roughEllipse(w, h, s, { pad: 3, grow: 1.18 })
          : kind === "underline"
            ? roughUnderline(w, s, { y: h - 0.5 })
            : roughStrike(w, h, s);
    return { line, ink: ribbon(line, pen, s) };
  }, [size, kind, seed, pen]);

  return (
    <svg
      ref={ref}
      aria-hidden
      className={`sketch ${className}`}
      viewBox={size ? `0 0 ${size[0]} ${size[1]}` : undefined}
    >
      {ink && draw && size && (
        <defs>
          <mask
            id={mid}
            maskUnits="userSpaceOnUse"
            x={-40}
            y={-40}
            width={size[0] + 80}
            height={size[1] + 80}
          >
            <path
              d={line}
              pathLength={1}
              fill="none"
              stroke="#fff"
              strokeWidth={pen * 2 + 4}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="draw"
            />
          </mask>
        </defs>
      )}
      {ink && (
        <path d={ink} fill={color} mask={draw ? `url(#${mid})` : undefined} />
      )}
    </svg>
  );
}

/**
 * The left edge of a sheet laid over the garden: one long drawn line down
 * the whole height. It lives in a sticky, zero-height wrapper so it stays
 * put while the sheet scrolls, and is drawn inside the sheet's box (x=2.5)
 * because a scrolling sheet clips anything outside it.
 */
export function SheetEdge({
  seed,
  color = "var(--pen)",
}: {
  seed: string;
  color?: string;
}) {
  const [h, setH] = useState(0);
  const mid = `e${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  useEffect(() => {
    const measure = () => setH(window.innerHeight);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const { line, ink } = useMemo(() => {
    if (!h) return { line: "", ink: "" };
    const s = seedOf(seed);
    const line = roughEdge(h, s, { x: 2.5, wobble: 1.2 });
    return { line, ink: ribbon(line, 1.8, s) };
  }, [h, seed]);
  return (
    <div aria-hidden className="sticky top-0 z-20 h-0 overflow-visible">
      <svg
        className="sketch pointer-events-none absolute top-0 left-0 w-2 overflow-visible"
        style={{ height: h, inset: "auto" }}
        viewBox={`0 0 8 ${h || 1}`}
      >
        {ink && (
          <>
            <defs>
              <mask
                id={mid}
                maskUnits="userSpaceOnUse"
                x={-10}
                y={-10}
                width={28}
                height={h + 20}
              >
                <path
                  d={line}
                  pathLength={1}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={8}
                  strokeLinecap="round"
                  className="draw"
                />
              </mask>
            </defs>
            <path d={ink} fill={color} mask={`url(#${mid})`} />
          </>
        )}
      </svg>
    </div>
  );
}
