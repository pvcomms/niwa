"use client";

import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  FACES,
  FACE_LABEL,
  FIGHTS,
  FROMS,
  FROM_LABEL,
  GOLD,
  GOLD_LABEL,
  KINDS,
  METS,
  MET_LABEL,
  PLURAL,
  ROOM_MAX,
  ROUNDS,
  WAYS,
  WAY_LABEL,
  WEIGHTS,
  WEIGHT_LABEL,
  clampPct,
  emptyMuster,
  logit,
  middleOf,
  musterAbout,
  newOther,
  newPiece,
  pathsOf,
  pctOf,
  pw,
  quarterOf,
  readings,
  recordReadings,
  roomReadings,
  roomTally,
  roomsBeside,
  roundWords,
  runRoom,
  seatsOf,
  shuffled,
  tally,
  type About,
  type Comparison,
  type Kind,
  type Muster as M,
  type Other,
  type Piece,
  type Room,
  type Run,
} from "@/lib/muster";
import { dayWords } from "@/lib/fence";
import { EXAMPLE_MUSTER } from "@/content/muster";
import { rand, ribbon, roughEllipse, seedOf, stroke } from "@/lib/hand";
import { putOnDesk } from "./desk";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

type Payload = {
  musters: M[];
  about: About | null;
  writable: boolean;
  dir: string | null;
};

const mono = { fontFamily: "var(--font-mono)" } as const;
const hand = { fontFamily: "var(--font-hand)" } as const;
const chip = "chip ms-seg px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";
const localToday = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
/** A textarea as tall as what is in it; called on every render and on every keystroke. */
const grow = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};
const clip = (s: string, max: number) =>
  s.length <= max ? s : `${s.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
const f1 = (n: number) => Math.round(n * 10) / 10;
const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** What each figure does, in a line, for the field. */
const FIGURE_WORDS: Record<Kind, string> = {
  soldier:
    "after its side, and fights. says only what is for its side, challenges what goes against it, and takes a quarter of what goes against it.",
  paladin:
    "after what is so, and fights. says all it has, challenges what goes against it, and moves by a piece's weight either way. one in two starts on the far side.",
  pacifist:
    "after its side, and keeps the peace. says nothing, notices a third of what comes to it, and takes a quarter of what goes against it.",
  scout:
    "after what is so, and keeps the peace. says what it has to half the room, challenges nothing, and moves by a piece's weight either way.",
};

/** The two halves by hue: after what is so, after its side. The top row fights and is drawn solid. */
const HUE: Record<Kind, string> = {
  soldier: "var(--muster-side)",
  pacifist: "var(--muster-side)",
  paladin: "var(--muster-so)",
  scout: "var(--muster-so)",
};

function Chip({
  children,
  on,
  onClick,
  disabled,
  accent,
  title,
}: {
  children: React.ReactNode;
  on?: boolean;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={chip}
      style={{
        ...mono,
        color: accent ? "var(--accent)" : on ? "var(--ink)" : "var(--muted)",
        borderColor: on ? "var(--ink)" : accent ? "var(--accent)" : undefined,
      }}
      aria-pressed={on}
    >
      {children}
    </button>
  );
}

/** A choice written out as words, the one chosen inked and underlined by hand. */
function Seg<T extends string | number>({
  options,
  labels,
  value,
  onPick,
  disabled,
  label,
}: {
  options: readonly T[];
  labels: Record<string, string>;
  value: T | "";
  onPick: (v: T) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <span
      role="group"
      aria-label={label}
      className="inline-flex flex-wrap items-baseline gap-y-1"
    >
      {options.map((o, i) => (
        <span key={String(o)} className="inline-flex items-baseline">
          <button
            onClick={() => onPick(o)}
            disabled={disabled}
            aria-pressed={value === o}
            className="ms-seg relative text-[11px]"
            style={{
              ...mono,
              letterSpacing: "0.04em",
              color: value === o ? "var(--ink)" : "var(--faint)",
            }}
          >
            {labels[String(o)]}
            {value === o && (
              <Sketch
                kind="underline"
                seed={`${label}-${o}`}
                color="var(--accent)"
                draw
              />
            )}
          </button>
          {i < options.length - 1 && (
            <span
              aria-hidden
              className="px-1.5 text-[11px]"
              style={{ color: "var(--faint)" }}
            >
              ·
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="meta" style={{ color: "var(--accent)" }}>
      {children}
    </div>
  );
}

/** A percent typed in place: click, type, enter. Empty is allowed where a mark may be left unsaid. */
function Pct({
  value,
  onCommit,
  writable,
  label,
  size = 22,
  empty = false,
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
  writable: boolean;
  label: string;
  size?: number;
  empty?: boolean;
}) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? (value === null ? "—" : String(value));
  return (
    <span className="inline-flex items-baseline">
      <input
        value={shown}
        readOnly={!writable}
        inputMode="numeric"
        aria-label={label}
        onFocus={(e) => {
          if (!writable) return;
          setText(value === null ? "" : String(value));
          e.currentTarget.select();
        }}
        onChange={(e) => setText(e.target.value.replace(/[^\d.]/g, ""))}
        onBlur={() => {
          if (text !== null) {
            if (!text.trim()) {
              if (empty && value !== null) onCommit(null);
            } else {
              const v = Math.round(clampPct(Number(text)));
              if (Number.isFinite(v) && v !== value) onCommit(v);
            }
          }
          setText(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setText(null);
            e.currentTarget.blur();
          }
        }}
        className="ms-num hand"
        style={{
          fontSize: size,
          width: `${Math.max(1.1, shown.length * 0.5 + 0.2)}em`,
          color: value === null ? "var(--faint)" : "var(--ink)",
        }}
      />
      <span
        className="hand"
        style={{ fontSize: size * 0.8, color: "var(--muted)" }}
      >
        %
      </span>
    </span>
  );
}

/** The width an element is drawn at, so a drawing can be laid out in real pixels and its words stay legible. */
function useWidth<T extends HTMLElement>(): [
  React.RefObject<T | null>,
  number,
] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(el.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** A drag on an SVG handle, in the drawing's own units. */
function useDrag(svgRef: React.RefObject<SVGSVGElement | null>) {
  const [dragging, setDragging] = useState<string | null>(null);
  const toSvg = (cx: number, cy: number) => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    const pt = svg.createSVGPoint();
    pt.x = cx;
    pt.y = cy;
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  const start = (
    e: ReactPointerEvent<SVGElement>,
    what: string,
    move: (p: { x: number; y: number }) => void,
    done?: () => void,
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    setDragging(what);
    const onMove = (ev: PointerEvent) => {
      const p = toSvg(ev.clientX, ev.clientY);
      if (p) move(p);
    };
    const onUp = () => {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      setDragging(null);
      done?.();
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  };
  return { dragging, start };
}

/**
 * Numbers eased from where they were drawn to where they are now when the key
 * changes; otherwise the numbers as they are, with no frame's lag — a drag
 * draws where the pointer is.
 */
function useTweened(target: number[][], key: string): number[][] {
  const [anim, setAnim] = useState<number[][] | null>(null);
  const drawn = useRef(target);
  const lastKey = useRef(key);
  useEffect(() => {
    if (lastKey.current === key) {
      drawn.current = target;
      setAnim(null);
      return;
    }
    lastKey.current = key;
    const from = drawn.current;
    const same =
      from.length === target.length &&
      from.every((r, i) => r.length === target[i].length);
    if (!same || reducedMotion()) {
      drawn.current = target;
      setAnim(null);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 820);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const now = target.map((row, i) =>
        row.map((v, j) => from[i][j] + (v - from[i][j]) * e),
      );
      drawn.current = now;
      if (k < 1) {
        setAnim(now);
        raf = requestAnimationFrame(tick);
      } else setAnim(null);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, key]);
  const fits =
    anim !== null &&
    anim.length === target.length &&
    anim.every((r, i) => r.length === target[i].length);
  return fits ? anim : target;
}

/* ── pen lines ─────────────────────────────────────────────────────────── */

type Pt = [number, number];
const fmt = (n: number) => String(Math.round(n * 10) / 10);

/** One continuous pen line through the points, each span bowed a little off straight. */
function handPath(pts: Pt[], seed: number, wobble = 0.9): string {
  if (!pts.length) return "";
  const r = rand(seed);
  let d = `M${fmt(pts[0][0])} ${fmt(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const b = (r() * 2 - 1) * wobble;
    d += `C${fmt(x0 + dx / 3 + nx * b)} ${fmt(y0 + dy / 3 + ny * b)} ${fmt(x0 + (2 * dx) / 3 + nx * b * 0.7)} ${fmt(y0 + (2 * dy) / 3 + ny * b * 0.7)} ${fmt(x1)} ${fmt(y1)}`;
  }
  return d;
}

/** One strand of two twisted round each other: crossing at every point, apart between them. */
function strand(pts: Pt[], amp: number, phase: 1 | -1): Pt[] {
  if (pts.length < 2) return pts;
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const s = (i % 2 ? 1 : -1) * phase * amp;
    out.push([(ax + bx) / 2 - (dy / len) * s, (ay + by) / 2 + (dx / len) * s]);
    out.push([bx, by]);
  }
  return out;
}

/* ── the path: alone with the evidence ─────────────────────────────────── */

const LMAX = logit(99);

type LineKey = "weights" | "soldier" | "pacifist" | "you";

/**
 * The reader's prior, then every piece in the order it came, on a scale spaced
 * by odds — so a piece is a step of its own size wherever it lands. The scout
 * and the paladin braided on the reader's weights; the soldier and the pacifist
 * by their rules; the reader's own marks in ink. The line they would act at,
 * with the ground above it lightly shaded. The prior, the line and every mark
 * can be dragged.
 */
function PathChart({
  m,
  figures,
  order,
  writable,
  onPrior,
  onAct,
  onMark,
  onDone,
  onPick,
}: {
  m: M;
  figures: number[][];
  /** The order the pieces are replayed in; null as they came. */
  order: number[] | null;
  writable: boolean;
  onPrior: (p: number) => void;
  onAct: (p: number) => void;
  onMark: (i: number, p: number) => void;
  onDone: () => void;
  onPick: (i: number) => void;
}) {
  const [wrapRef, W] = useWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const { dragging, start } = useDrag(svgRef);
  const [hover, setHover] = useState<number | null>(null);
  const clipId = `ms${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  // The lines are drawn on from the prior each time a claim is opened.
  const revealRef = useRef<SVGAnimateElement>(null);
  const opened = m.slug || `draft-${m.put}`;
  useLayoutEffect(() => {
    // Only where it will be seen: a hidden page holds its clock, and the lines would wait at nothing.
    if (!reducedMotion() && document.visibilityState === "visible")
      revealRef.current?.beginElement();
  }, [opened]);
  const shuffledNow = order !== null;
  /** Which piece stands in column k (from 1). */
  const at = (k: number) => (order ? order[k - 1] : k - 1);
  const width = Math.max(300, W || 640);
  const narrow = width < 540;
  const H = narrow ? 250 : 292;
  const PL = 40;
  const PR = narrow ? 18 : 146;
  const PT = 14;
  const PB = 48;
  const PW = width - PL - PR;
  const PH = H - PT - PB;
  const n = m.pieces.length;
  const step = n ? PW / n : PW;
  const xOf = (k: number) => PL + k * step;
  const yOf = (p: number) =>
    PT +
    (1 - (logit(Math.min(99.4, Math.max(0.6, p))) + LMAX) / (2 * LMAX)) * PH;
  const pOf = (y: number) =>
    Math.round(clampPct(pctOf(((1 - (y - PT) / PH) * 2 - 1) * LMAX)));
  const [weights, soldier, pacifist] = figures;
  const you = m.pieces.map((p) => p.at);
  const seed = seedOf(m.slug || m.claim || "muster");

  const pts = (line: number[]) => line.map((v, k) => [xOf(k), yOf(v)] as Pt);
  const lines = useMemo(() => {
    const w = pts(weights);
    return {
      paladin: ribbon(
        handPath(strand(w, 2.2, 1), seed + 1, 0.6),
        2.3,
        seed + 1,
      ),
      scout: handPath(strand(w, 2.2, -1), seed + 2, 0.6),
      soldier: ribbon(handPath(pts(soldier), seed + 3), 2.3, seed + 3),
      pacifist: handPath(pts(pacifist), seed + 4),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [figures, width, n, seed]);
  // The reader's marks: joined where both ends are said, dotted across a gap.
  const yours = useMemo(() => {
    const known: Pt[] = [[xOf(0), yOf(m.prior)]];
    const solid: string[] = [];
    const gaps: string[] = [];
    let last: Pt = known[0];
    let gap = false;
    you.forEach((v, i) => {
      if (v === null) {
        gap = true;
        return;
      }
      const p: Pt = [xOf(i + 1), yOf(v)];
      const d = handPath([last, p], seed + 11 + i, 0.5);
      (gap ? gaps : solid).push(d);
      known.push(p);
      last = p;
      gap = false;
    });
    return {
      solid: solid.length ? ribbon(solid.join(""), 2.5, seed + 9) : "",
      gaps: gaps.join(""),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.prior, you.join(","), width, n, seed]);
  const actY = yOf(m.act);
  const lastMark = [...you].reverse().find((v) => v !== null) ?? null;

  // Where each line ends, its label nudged clear of the others.
  const ends = useMemo(() => {
    if (narrow || !n) return [];
    const out: { key: LineKey; text: string; y: number; color: string }[] = [
      {
        key: "weights",
        text: `scout · paladin ${pw(weights[n])}`,
        y: yOf(weights[n]),
        color: "var(--muster-so)",
      },
      {
        key: "soldier",
        text: `soldier ${pw(soldier[n])}`,
        y: yOf(soldier[n]),
        color: "var(--muster-side)",
      },
      {
        key: "pacifist",
        text: `pacifist ${pw(pacifist[n])}`,
        y: yOf(pacifist[n]),
        color: "var(--muster-side)",
      },
    ];
    if (!shuffledNow && lastMark !== null)
      out.push({
        key: "you",
        text: `you ${pw(lastMark)}`,
        y: yOf(lastMark),
        color: "var(--ink)",
      });
    out.sort((a, b) => a.y - b.y);
    for (let i = 1; i < out.length; i++)
      if (out[i].y - out[i - 1].y < 14) out[i].y = out[i - 1].y + 14;
    const over = out.at(-1)!.y - (PT + PH);
    if (over > 0) for (const o of out) o.y -= over;
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [figures, lastMark, shuffledNow, width, n]);

  const ticks = [1, 10, 25, 50, 75, 90, 99];
  const glyphBase = PT + PH + 12;
  const glyphs = useMemo(
    () =>
      m.pieces.map((_, i) => {
        const p = m.pieces[at(i + 1)];
        const x = xOf(i + 1);
        const len = 7 + 5 * Math.log(p.weight);
        const r = rand(seed + 40 + i);
        const up = p.way === "for";
        const tip: Pt = up ? [x, glyphBase] : [x, glyphBase + len];
        const tail: Pt = up ? [x, glyphBase + len] : [x, glyphBase];
        const h = up ? 4 : -4;
        return {
          shaft: stroke(tail, tip, r, 0.4, 0),
          head:
            stroke(tip, [x - 3.2, tip[1] + h], r, 0.2, 0) +
            stroke(tip, [x + 3.2, tip[1] + h], r, 0.2, 0),
          cross:
            p.met === "argued"
              ? stroke(
                  [x - 4, glyphBase + len / 2 - 3],
                  [x + 4, glyphBase + len / 2 + 3],
                  r,
                  0.2,
                  0,
                ) +
                stroke(
                  [x + 4, glyphBase + len / 2 - 3],
                  [x - 4, glyphBase + len / 2 + 3],
                  r,
                  0.2,
                  0,
                )
              : "",
          faint: p.met === "passed",
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.pieces, order, width, n, seed],
  );

  const hoverBox =
    hover !== null && hover > 0
      ? {
          x: xOf(hover),
          lines: [
            `${at(hover) + 1} · ${m.pieces[at(hover)].way} · ${WEIGHT_LABEL[m.pieces[at(hover)].weight] ?? `×${m.pieces[at(hover)].weight}`} · ${MET_LABEL[m.pieces[at(hover)].met]}`,
            `weights ${pw(weights[hover])} · soldier ${pw(soldier[hover])} · pacifist ${pw(pacifist[hover])}${!shuffledNow && you[hover - 1] !== null ? ` · you ${pw(you[hover - 1]!)}` : ""}`,
          ],
        }
      : null;

  // Laid out in real pixels, so nothing is drawn until the width is known: a guess would slide into place.
  if (!W) return <div ref={wrapRef} className="w-full" style={{ height: H }} />;
  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${H}`}
        width="100%"
        height={H}
        className={`ms-path${dragging ? " ms-dragging" : ""}`}
        style={{
          touchAction: dragging ? "none" : "pan-y",
          overflow: "visible",
        }}
        role="img"
        aria-label={`Your prior at ${pw(m.prior)}, ${n} pieces, your weights ending at ${pw(weights[n])}, the soldier at ${pw(soldier[n])}, the pacifist at ${pw(pacifist[n])}${lastMark !== null ? `, you at ${pw(lastMark)}` : ""}; you would act at ${pw(m.act)}`}
        onPointerLeave={() => setHover(null)}
      >
        {/* where you would act */}
        <rect
          x={PL}
          y={PT}
          width={PW}
          height={Math.max(0, actY - PT)}
          fill="color-mix(in srgb, var(--accent) 5%, transparent)"
        />
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PL}
              x2={PL + PW}
              y1={yOf(t)}
              y2={yOf(t)}
              stroke="var(--rule)"
              strokeWidth={t === 50 ? 1 : 0.6}
              strokeDasharray={t === 50 ? "4 4" : undefined}
            />
            <text
              x={PL - 7}
              y={yOf(t) + 3}
              textAnchor="end"
              fontSize={9}
              style={{ ...mono, letterSpacing: "0.04em" }}
              fill="var(--faint)"
            >
              {t}%
            </text>
          </g>
        ))}

        {/* the columns, one per piece */}
        {m.pieces.map((_, i) => (
          <rect
            key={`col-${i}`}
            x={xOf(i + 1) - step / 2}
            y={PT}
            width={step}
            height={PH + PB}
            fill="transparent"
            onPointerEnter={() => setHover(i + 1)}
            onClick={() => onPick(at(i + 1))}
            style={{ cursor: "pointer" }}
          />
        ))}
        {hoverBox && (
          <line
            x1={hoverBox.x}
            x2={hoverBox.x}
            y1={PT}
            y2={PT + PH}
            stroke="var(--faint)"
            strokeWidth={0.8}
            strokeDasharray="2 3"
            pointerEvents="none"
          />
        )}

        {/* the four, drawn on from the prior each time a claim is opened */}
        <clipPath id={`${clipId}-reveal`}>
          <rect x={0} y={0} width={width} height={H}>
            <animate
              ref={revealRef}
              attributeName="width"
              from="0"
              to={String(width)}
              dur="1.5s"
              begin="indefinite"
              fill="remove"
              calcMode="spline"
              keyTimes="0;1"
              keySplines="0.65 0 0.35 1"
            />
          </rect>
        </clipPath>
        <g pointerEvents="none" clipPath={`url(#${clipId}-reveal)`}>
          <path
            d={lines.scout}
            fill="none"
            stroke="var(--muster-so)"
            strokeWidth={1.1}
            opacity={0.9}
          />
          <path d={lines.paladin} fill="var(--muster-so)" />
          <path
            d={lines.pacifist}
            fill="none"
            stroke="var(--muster-side)"
            strokeWidth={1.3}
            strokeDasharray="4 3.5"
            strokeLinecap="round"
          />
          <path d={lines.soldier} fill="var(--muster-side)" />
          <g className="ms-you" style={{ opacity: shuffledNow ? 0 : 1 }}>
            {yours.gaps && (
              <path
                d={yours.gaps}
                fill="none"
                stroke="var(--ink)"
                strokeWidth={1.2}
                strokeDasharray="1.5 4"
                strokeLinecap="round"
              />
            )}
            {yours.solid && <path d={yours.solid} fill="var(--ink)" />}
          </g>
        </g>

        {/* the line you would act at */}
        <line
          x1={PL}
          x2={PL + PW}
          y1={actY}
          y2={actY}
          stroke="var(--accent)"
          strokeWidth={1.2}
          strokeDasharray="6 4"
          pointerEvents="none"
        />
        <text
          x={PL + 6}
          y={actY - 5}
          fontSize={9}
          style={{ ...mono, letterSpacing: "0.1em" }}
          fill="var(--accent)"
          pointerEvents="none"
        >
          {`ACT AT ${m.act}%`}
        </text>
        <g
          className={writable ? "ms-handle" : undefined}
          onPointerDown={
            writable
              ? (e) => start(e, "act", (p) => onAct(pOf(p.y)), onDone)
              : undefined
          }
          role={writable ? "slider" : undefined}
          aria-label="The line you would act at"
          aria-valuenow={m.act}
        >
          <rect x={PL} y={actY - 6} width={PW} height={12} fill="transparent" />
          <path
            d={`M${PL + PW + 1} ${actY} l-8 -4.5 0 9 Z`}
            fill="var(--accent)"
          />
        </g>

        {/* your marks */}
        {!shuffledNow &&
          you.map((v, i) =>
            v === null ? null : (
              <g
                key={`mark-${i}`}
                className={writable ? "ms-handle" : undefined}
                transform={`translate(${xOf(i + 1)} ${yOf(v)})`}
                onPointerDown={
                  writable
                    ? (e) =>
                        start(
                          e,
                          `mark-${i}`,
                          (p) => onMark(i, pOf(p.y)),
                          onDone,
                        )
                    : undefined
                }
                onPointerEnter={() => setHover(i + 1)}
              >
                <circle r={11} fill="transparent" />
                <circle
                  r={4.2}
                  fill="var(--ink)"
                  stroke="var(--surface)"
                  strokeWidth={1.5}
                />
              </g>
            ),
          )}
        {/* the prior, where every line starts */}
        <g
          className={writable ? "ms-handle" : undefined}
          transform={`translate(${xOf(0)} ${yOf(m.prior)})`}
          onPointerDown={
            writable
              ? (e) => start(e, "prior", (p) => onPrior(pOf(p.y)), onDone)
              : undefined
          }
          role={writable ? "slider" : undefined}
          aria-label="Your prior"
          aria-valuenow={m.prior}
        >
          <circle r={13} fill="transparent" />
          <circle
            r={6.2}
            fill="var(--surface)"
            stroke="var(--ink)"
            strokeWidth={1.8}
          />
          <circle r={2.2} fill="var(--ink)" />
        </g>

        {/* the pieces, along the foot: up for, down against; crossed where you argued, faint where you let it pass */}
        {glyphs.map((g, i) => (
          <g
            key={`glyph-${i}`}
            pointerEvents="none"
            opacity={hover === i + 1 ? 1 : g.faint ? 0.45 : 0.8}
          >
            <path
              d={g.shaft + g.head}
              fill="none"
              stroke="var(--ink)"
              strokeWidth={1.3}
              strokeLinecap="round"
              strokeDasharray={g.faint ? "2 2.5" : undefined}
            />
            {g.cross && (
              <path
                d={g.cross}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={1.2}
                strokeLinecap="round"
              />
            )}
            <text
              x={xOf(i + 1)}
              y={H - 3}
              textAnchor="middle"
              fontSize={9}
              style={mono}
              fill={hover === i + 1 ? "var(--ink)" : "var(--faint)"}
            >
              {at(i + 1) + 1}
            </text>
          </g>
        ))}
        {!n && (
          <text
            x={xOf(0) + 16}
            y={yOf(m.prior) + 4}
            fontSize={17}
            style={hand}
            fill="var(--faint)"
          >
            nothing has come in yet — every line starts here
          </text>
        )}

        {/* where each ends */}
        {ends.map((e) => (
          <text
            key={e.key}
            x={PL + PW + 18}
            y={e.y + 4}
            fontSize={15}
            style={hand}
            fill={e.color}
            pointerEvents="none"
          >
            {e.text}
          </text>
        ))}

        {hoverBox && (
          <g pointerEvents="none">
            {hoverBox.lines.map((t, j) => (
              <text
                key={j}
                x={hoverBox.x > PL + PW / 2 ? hoverBox.x - 8 : hoverBox.x + 8}
                y={PT + 12 + j * 13}
                textAnchor={hoverBox.x > PL + PW / 2 ? "end" : "start"}
                fontSize={10}
                style={{
                  ...mono,
                  letterSpacing: "0.02em",
                  paintOrder: "stroke",
                }}
                stroke="var(--surface)"
                strokeWidth={4}
                strokeLinejoin="round"
                fill={j ? "var(--muted)" : "var(--ink)"}
              >
                {t}
              </text>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}

/** The four lines in words, with a swatch each. */
function Legend({
  m,
  figures,
  shuffledNow,
}: {
  m: M;
  figures: number[][];
  shuffledNow: boolean;
}) {
  const n = m.pieces.length;
  const last = [...m.pieces].reverse().find((p) => p.at !== null)?.at ?? null;
  const item = (sw: React.ReactNode, text: string, key: string) => (
    <span key={key} className="inline-flex items-center gap-1.5">
      <svg width={26} height={10} aria-hidden>
        {sw}
      </svg>
      {text}
    </span>
  );
  return (
    <p
      className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] leading-[1.5]"
      style={{ color: "var(--muted)" }}
    >
      {!shuffledNow &&
        item(
          <path
            d="M1 5 L25 5"
            stroke="var(--ink)"
            strokeWidth={2.4}
            strokeLinecap="round"
          />,
          `you${last !== null ? `, ${pw(last)}` : ""}`,
          "you",
        )}
      {item(
        <>
          <path
            d="M1 5 C7 1, 13 9, 19 5 S 25 3, 25 5"
            stroke="var(--muster-so)"
            strokeWidth={2.2}
            fill="none"
          />
          <path
            d="M1 5 C7 9, 13 1, 19 5 S 25 7, 25 5"
            stroke="var(--muster-so)"
            strokeWidth={1}
            fill="none"
          />
        </>,
        `the scout and the paladin, braided on your weights: ${pw(figures[0][n])}`,
        "weights",
      )}
      {item(
        <path
          d="M1 5 L25 5"
          stroke="var(--muster-side)"
          strokeWidth={2.4}
          strokeLinecap="round"
        />,
        `the soldier: ${pw(figures[1][n])}`,
        "soldier",
      )}
      {item(
        <path
          d="M1 5 L25 5"
          stroke="var(--muster-side)"
          strokeWidth={1.3}
          strokeDasharray="4 3"
        />,
        `the pacifist: ${pw(figures[2][n])}`,
        "pacifist",
      )}
    </p>
  );
}

/* ── the field: the four quarters, and a room of them ─────────────────── */

const FV = 440;
const X0 = 30;
const Y0 = 26;
const S = 380;
const Q = S / 2;
const CORNER: Record<Kind, [number, number]> = {
  soldier: [X0, Y0],
  paladin: [X0 + Q, Y0],
  pacifist: [X0, Y0 + Q],
  scout: [X0 + Q, Y0 + Q],
};
/** Where a quarter's members sit: drawn a little in from the corner its name is written in. */
const SEAT_AT: Record<Kind, [number, number]> = {
  soldier: [10, 14],
  paladin: [-10, 14],
  pacifist: [10, -14],
  scout: [-10, -14],
};
function seatXY(kind: Kind, j: number, count: number): Pt {
  const [cx0, cy0] = CORNER[kind];
  const [ox, oy] = SEAT_AT[kind];
  const cols = Math.min(3, count);
  const rows = Math.ceil(count / 3);
  const col = j % 3;
  const row = Math.floor(j / 3);
  const inRow = row === rows - 1 ? count - row * 3 : cols;
  return [
    cx0 + Q / 2 + ox + (col - (inRow - 1) / 2) * 56,
    cy0 + Q / 2 + oy + (row - (rows - 1) / 2) * 54,
  ];
}
const fieldXY = (x: number, y: number): Pt => [X0 + x * S, Y0 + (1 - y) * S];

function Field({
  run,
  round,
  room,
  self,
  writable,
  playingKey,
  onSeat,
  onUnseat,
  onSelf,
  onSelfDone,
}: {
  run: Run;
  round: number;
  room: Room;
  self: [number, number] | null;
  writable: boolean;
  playingKey: string;
  onSeat: (k: Kind) => void;
  onUnseat: (k: Kind) => void;
  onSelf: (s: [number, number]) => void;
  onSelfDone: () => void;
}) {
  const [wrapRef, W] = useWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const { dragging, start } = useDrag(svgRef);
  const [over, setOver] = useState<Kind | null>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const k = FV / Math.max(240, W || FV);
  // On a narrow sheet the axes' words are set smaller and closer, so the two halves' fit in their quarters.
  const narrowField = !!W && W < 360;
  const axisPx = narrowField ? 8 : 9;
  const kinds = seatsOf(room);
  const counts = Object.fromEntries(KINDS.map((q) => [q, room[q]])) as Room;
  const at = run.rounds[Math.min(round, run.rounds.length - 1)].at;
  const pos: Pt[] = [];
  const idx: Record<Kind, number> = {
    soldier: 0,
    paladin: 0,
    pacifist: 0,
    scout: 0,
  };
  for (const q of kinds) pos.push(seatXY(q, idx[q]++, counts[q]));

  const frame = useMemo(() => {
    const s = seedOf("muster-field");
    const r = rand(s);
    const up = stroke([X0 + Q, Y0 + S + 8], [X0 + Q, Y0 - 6], r, 1.2, 2);
    const right = stroke([X0 - 8, Y0 + Q], [X0 + S + 6, Y0 + Q], r, 1.2, 2);
    return {
      up: ribbon(up, 1.8, s),
      right: ribbon(right, 1.8, s + 1),
      upHead:
        stroke([X0 + Q, Y0 - 7], [X0 + Q - 6, Y0 + 3], r, 0.3, 0) +
        stroke([X0 + Q, Y0 - 7], [X0 + Q + 6, Y0 + 3], r, 0.3, 0),
      rightHead:
        stroke([X0 + S + 7, Y0 + Q], [X0 + S - 3, Y0 + Q - 6], r, 0.3, 0) +
        stroke([X0 + S + 7, Y0 + Q], [X0 + S - 3, Y0 + Q + 6], r, 0.3, 0),
    };
  }, []);
  const rings = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) =>
        roughEllipse(28, 28, seedOf(`muster-member-${i}`), {
          pad: 1,
          wobble: 0.7,
          steps: 12,
        }),
      ),
    [],
  );
  const youRing = useMemo(
    () =>
      roughEllipse(30, 30, seedOf("muster-you"), {
        pad: 1,
        wobble: 1,
        steps: 14,
      }),
    [],
  );
  const events = round > 0 ? (run.rounds[round]?.events ?? []) : [];
  const posOf = (seat: number) => pos[seat] ?? [0, 0];
  const selfAt: Pt = self
    ? fieldXY(self[0], self[1])
    : [X0 + S - 8, Y0 + S + 22];
  const t = (px: number) => px * k;

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${FV} ${FV + 20}`}
        className={`ms-field w-full${dragging ? " ms-dragging" : ""}`}
        style={{
          touchAction: dragging ? "none" : "pan-y",
          overflow: "visible",
        }}
        role="img"
        aria-label={`The four quarters, with a room of ${kinds.length}: ${KINDS.filter(
          (q) => counts[q],
        )
          .map((q) => `${counts[q]} ${counts[q] === 1 ? q : PLURAL[q]}`)
          .join(", ")}`}
      >
        <defs>
          <pattern
            id={`${uid}-hatch`}
            width={7}
            height={7}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={7}
              stroke="var(--ink)"
              strokeWidth={0.6}
              opacity={0.07}
            />
          </pattern>
          {kinds.map((_, seat) => (
            <clipPath key={seat} id={`${uid}-c${seat}`}>
              <circle cx={posOf(seat)[0]} cy={posOf(seat)[1]} r={13.6} />
            </clipPath>
          ))}
        </defs>
        {/* the two halves by what they are after, the top row by whether they fight */}
        <rect
          x={X0}
          y={Y0}
          width={Q}
          height={S}
          fill="color-mix(in srgb, var(--muster-side) 8%, transparent)"
        />
        <rect
          x={X0 + Q}
          y={Y0}
          width={Q}
          height={S}
          fill="color-mix(in srgb, var(--muster-so) 8%, transparent)"
        />
        <rect x={X0} y={Y0} width={S} height={Q} fill={`url(#${uid}-hatch)`} />
        {KINDS.map((q) => (
          <rect
            key={`seat-${q}`}
            x={CORNER[q][0]}
            y={CORNER[q][1]}
            width={Q}
            height={Q}
            fill="transparent"
            className="ms-quarter"
            onClick={() => onSeat(q)}
            onPointerEnter={() => setOver(q)}
            onPointerLeave={() => setOver((o) => (o === q ? null : o))}
          >
            <title>
              {counts[q] < ROOM_MAX
                ? `seat another ${q}`
                : `the ${PLURAL[q]} are full`}
            </title>
          </rect>
        ))}
        <path d={frame.up} fill="var(--pen)" pointerEvents="none" />
        <path d={frame.right} fill="var(--pen)" pointerEvents="none" />
        <path
          d={frame.upHead + frame.rightHead}
          fill="none"
          stroke="var(--pen)"
          strokeWidth={1.6}
          strokeLinecap="round"
          pointerEvents="none"
        />

        {/* the axes, in Askell's words */}
        <g
          pointerEvents="none"
          style={{ ...mono, letterSpacing: narrowField ? "0.04em" : "0.12em" }}
          fill="var(--faint)"
        >
          <text x={X0 + Q + t(9)} y={Y0 + t(8)} fontSize={t(9)}>
            COMBATIVE
          </text>
          <text x={X0 + Q + t(9)} y={Y0 + S - t(4)} fontSize={t(9)}>
            NOT COMBATIVE
          </text>
          {/* Below the line, so on a narrow sheet the two halves' words never run into each other. */}
          <text
            x={X0 + S - t(2)}
            y={Y0 + Q + t(15)}
            fontSize={t(axisPx)}
            textAnchor="end"
          >
            ACCURACY-MOTIVATED
          </text>
          <text x={X0 + t(3)} y={Y0 + Q - t(7)} fontSize={t(axisPx)}>
            NOT ACCURACY-MOTIVATED
          </text>
        </g>
        {KINDS.map((q) => {
          const left = q === "soldier" || q === "pacifist";
          const top = q === "soldier" || q === "paladin";
          return (
            <text
              key={`name-${q}`}
              x={left ? X0 + t(10) : X0 + S - t(10)}
              y={top ? Y0 + t(34) : Y0 + S - t(22)}
              textAnchor={left ? "start" : "end"}
              fontSize={t(24)}
              style={hand}
              fill={HUE[q]}
              pointerEvents="none"
            >
              {q}
            </text>
          );
        })}

        {/* the room */}
        {kinds.map((q, seat) => {
          const [x, y] = posOf(seat);
          const v = at[seat] ?? 50;
          const member = run.members[seat];
          return (
            <g
              key={`${q}-${seat - kinds.indexOf(q)}`}
              className="ms-member"
              onClick={(e) => {
                e.stopPropagation();
                onUnseat(q);
              }}
              onPointerEnter={() => setOver(q)}
            >
              <title>{`a ${q}${member?.far ? ", who started on the far side" : ""}: ${pw(v)}`}</title>
              <circle cx={x} cy={y} r={20} fill="transparent" />
              <rect
                x={x - 14}
                y={y - 14}
                width={28}
                height={28}
                clipPath={`url(#${uid}-c${seat})`}
                fill={HUE[q]}
                opacity={FIGHTS[q] ? 0.55 : 0.32}
                className="ms-fill"
                style={{
                  transform: `scaleY(${f1(v / 100)})`,
                  transformOrigin: `${x}px ${y + 13.6}px`,
                }}
              />
              {FIGHTS[q] ? (
                <path
                  d={ribbon(
                    rings[seat % 24],
                    2.2,
                    seedOf(`muster-member-${seat}`),
                  )}
                  transform={`translate(${x - 14} ${y - 14})`}
                  fill={HUE[q]}
                />
              ) : (
                <path
                  d={rings[seat % 24]}
                  transform={`translate(${x - 14} ${y - 14})`}
                  fill="none"
                  stroke={HUE[q]}
                  strokeWidth={1.15}
                />
              )}
              {member?.far && (
                <circle cx={x + 13} cy={y - 13} r={2.8} fill="var(--accent)" />
              )}
            </g>
          );
        })}

        {/* what happened this round */}
        <g key={`${round}-${playingKey}`} pointerEvents="none">
          {events.slice(0, 48).map((ev, i) => {
            const delay = `${
              ev.e === "deal"
                ? 0
                : ev.e === "say" || ev.e === "keep"
                  ? 260
                  : ev.e === "challenge"
                    ? 520 + Math.min(8, i) * 70
                    : 1000
            }ms`;
            if (ev.e === "deal") {
              const [x, y] = posOf(ev.seat);
              const d = run.rounds[round].dealt.find((p) => p.id === ev.piece);
              const miss = ev.noticed ? 0 : 15;
              return d?.gold ? (
                <path
                  key={i}
                  className="ms-drop"
                  style={{ animationDelay: delay }}
                  d={`M${x + miss} ${y - 4} l3.5 4 -3.5 4 -3.5 -4 Z`}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={1.3}
                />
              ) : (
                <circle
                  key={i}
                  className="ms-drop"
                  style={{ animationDelay: delay }}
                  cx={x + miss}
                  cy={y}
                  r={2.6}
                  fill="var(--ink)"
                />
              );
            }
            if (ev.e === "say") {
              const [x, y] = posOf(ev.seat);
              return (
                <circle
                  key={i}
                  className={`ms-ripple${ev.loud ? " ms-loud" : ""}`}
                  style={{ animationDelay: delay }}
                  cx={x}
                  cy={y}
                  r={16}
                  fill="none"
                  stroke={HUE[kinds[ev.seat]]}
                  strokeWidth={ev.loud ? 1.4 : 0.9}
                />
              );
            }
            if (ev.e === "challenge") {
              const piece = run.rounds[round].dealt.find(
                (p) => p.id === ev.piece,
              );
              if (!piece) return null;
              const [x0, y0] = posOf(ev.seat);
              const [x1, y1] = posOf(piece.seat);
              return (
                <path
                  key={i}
                  className="ms-argue"
                  style={{ animationDelay: delay }}
                  d={handPath(
                    [
                      [x0, y0],
                      [x1, y1],
                    ],
                    seedOf(`${ev.piece}-${ev.seat}`),
                    5,
                  )}
                  pathLength={1}
                  fill="none"
                  stroke={ev.shown ? "var(--accent)" : "var(--muted)"}
                  strokeWidth={ev.shown ? 1.5 : 0.9}
                  strokeLinecap="round"
                />
              );
            }
            if (ev.e === "strike") {
              const piece = run.rounds[round].dealt.find(
                (p) => p.id === ev.piece,
              );
              if (!piece) return null;
              const [x, y] = posOf(piece.seat);
              return (
                <path
                  key={i}
                  className="ms-strike"
                  style={{ animationDelay: delay }}
                  d={`M${x - 7} ${y - 7} L${x + 7} ${y + 7} M${x + 7} ${y - 7} L${x - 7} ${y + 7}`}
                  stroke="var(--accent)"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              );
            }
            return null;
          })}
        </g>

        {/* where you put yourself */}
        <g
          className={writable ? "ms-handle ms-you-ring" : "ms-you-ring"}
          transform={`translate(${selfAt[0]} ${selfAt[1]})`}
          onPointerDown={
            writable
              ? (e) =>
                  start(
                    e,
                    "self",
                    (p) =>
                      onSelf([
                        Math.min(1, Math.max(0, (p.x - X0) / S)),
                        Math.min(1, Math.max(0, 1 - (p.y - Y0) / S)),
                      ]),
                    onSelfDone,
                  )
              : undefined
          }
          role={writable ? "slider" : undefined}
          aria-label="Where you put yourself"
        >
          <circle r={19} fill="transparent" />
          <path
            d={youRing}
            transform="translate(-15 -15)"
            fill="none"
            stroke="var(--ink)"
            strokeWidth={1.3}
            strokeDasharray={self ? undefined : "3 3"}
          />
          <text
            y={t(5)}
            textAnchor="middle"
            fontSize={t(15)}
            style={hand}
            fill="var(--ink)"
          >
            you
          </text>
        </g>
      </svg>
      <p
        className="hand mt-1 min-h-[2.6em] text-center text-[14.5px] leading-[1.3]"
        style={{ color: over ? HUE[over] : "var(--faint)" }}
        aria-live="polite"
      >
        {over
          ? `the ${over}: ${FIGURE_WORDS[over]}`
          : "hover a quarter for what its figure does"}
      </p>
    </div>
  );
}

/** Each quarter's members as beads on a line from not so to so, sliding as the rounds go. */
function Lanes({
  run,
  round,
  act,
  truth,
  room,
  onSeat,
  onUnseat,
}: {
  run: Run;
  round: number;
  act: number;
  truth: "so" | "not";
  room: Room;
  onSeat: (k: Kind) => void;
  onUnseat: (k: Kind) => void;
}) {
  const [wrapRef, W] = useWidth<HTMLDivElement>();
  const width = Math.max(260, W || 420);
  const LX0 = 108;
  const LX1 = width - 12;
  const TOP = 28;
  const LANE = 42;
  const H = TOP + 4 * LANE + 30;
  const xOf = (p: number) => LX0 + (p / 100) * (LX1 - LX0);
  const kinds = seatsOf(room);
  const at = run.rounds[Math.min(round, run.rounds.length - 1)].at;
  const mid = middleOf(at);
  const laneY = (q: Kind) => TOP + KINDS.indexOf(q) * LANE + LANE / 2;
  const nth: Record<Kind, number> = {
    soldier: 0,
    paladin: 0,
    pacifist: 0,
    scout: 0,
  };
  const rule = useMemo(() => {
    const r = rand(seedOf("muster-lanes"));
    return KINDS.map((q) =>
      stroke([LX0, laneY(q)], [LX1, laneY(q)], r, 0.5, 1),
    ).join("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);
  // Laid out in real pixels, so nothing is drawn until the width is known: a guess would slide into place.
  if (!W) return <div ref={wrapRef} className="w-full" style={{ height: H }} />;
  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label={`Where the room stands in round ${round}: the middle at ${pw(mid)}`}
      >
        <text
          x={LX0}
          y={12}
          fontSize={9}
          style={{ ...mono, letterSpacing: "0.1em" }}
          fill="var(--faint)"
        >
          NOT SO
        </text>
        <text
          x={LX1}
          y={12}
          textAnchor="end"
          fontSize={9}
          style={{ ...mono, letterSpacing: "0.1em" }}
          fill="var(--faint)"
        >
          SO
        </text>
        <text
          x={xOf(50)}
          y={12}
          textAnchor="middle"
          fontSize={9}
          style={{ ...mono, letterSpacing: "0.1em" }}
          fill="var(--faint)"
        >
          50%
        </text>
        {/* what is so, in this room */}
        <line
          x1={xOf(truth === "so" ? 100 : 0)}
          x2={xOf(truth === "so" ? 100 : 0)}
          y1={TOP - 8}
          y2={TOP + 4 * LANE}
          stroke="var(--ink)"
          strokeWidth={2}
          opacity={0.35}
        />
        <line
          x1={xOf(50)}
          x2={xOf(50)}
          y1={TOP - 6}
          y2={TOP + 4 * LANE}
          stroke="var(--rule)"
          strokeDasharray="3 4"
        />
        <line
          x1={xOf(act)}
          x2={xOf(act)}
          y1={TOP - 6}
          y2={TOP + 4 * LANE + 6}
          stroke="var(--accent)"
          strokeWidth={1.1}
          strokeDasharray="5 4"
        />
        <text
          x={xOf(act) + 4}
          y={TOP + 4 * LANE + 14}
          fontSize={9}
          style={{ ...mono, letterSpacing: "0.1em" }}
          fill="var(--accent)"
        >
          {`ACT ${act}%`}
        </text>
        <path d={rule} fill="none" stroke="var(--rule)" strokeWidth={1.2} />
        {kinds.map((q, seat) => {
          const j = nth[q]++;
          const c = room[q];
          const y = laneY(q) + (j - (c - 1) / 2) * 5.5;
          const v = at[seat] ?? 50;
          // Keyed by who it is, not where it sits, so seating another never slides a bead across lanes.
          return (
            <g
              key={`${q}-${j}`}
              className="ms-bead"
              style={{ transform: `translate(${f1(xOf(v))}px, ${f1(y)}px)` }}
            >
              <circle
                r={5.4}
                fill={FIGHTS[q] ? HUE[q] : "var(--surface)"}
                stroke={HUE[q]}
                strokeWidth={1.3}
                opacity={0.92}
              />
              {run.members[seat]?.far && (
                <circle cx={4.5} cy={-4.5} r={1.8} fill="var(--accent)" />
              )}
            </g>
          );
        })}
        {/* the room's middle */}
        <g
          className="ms-bead"
          style={{
            transform: `translate(${f1(xOf(mid))}px, ${TOP + 4 * LANE + 4}px)`,
          }}
        >
          <path d="M0 0 L-5 9 L5 9 Z" fill="var(--ink)" />
        </g>
        <text
          x={Math.min(LX1 - 40, Math.max(LX0, xOf(mid) - 18))}
          y={H - 2}
          fontSize={9}
          style={{ ...mono, letterSpacing: "0.1em" }}
          fill="var(--muted)"
        >
          {`MIDDLE ${Math.round(mid)}%`}
        </text>
      </svg>
      {/* who sits in each lane, and how many */}
      {KINDS.map((q) => (
        <div
          key={q}
          className="absolute left-0 flex items-baseline gap-1.5"
          style={{ top: laneY(q) - 13, width: LX0 - 10 }}
        >
          <span
            className="hand text-[17px] leading-none"
            style={{ color: HUE[q] }}
          >
            {PLURAL[q]}
          </span>
          <span
            className="ml-auto inline-flex items-baseline gap-1"
            style={{ ...mono, fontSize: 10 }}
          >
            <button
              className="ms-link px-0.5"
              style={{ color: "var(--faint)" }}
              onClick={() => onUnseat(q)}
              disabled={!room[q] || kinds.length <= 1}
              aria-label={`One fewer ${q}`}
            >
              −
            </button>
            <span style={{ color: "var(--ink)" }}>{room[q]}</span>
            <button
              className="ms-link px-0.5"
              style={{ color: "var(--faint)" }}
              onClick={() => onSeat(q)}
              disabled={room[q] >= ROOM_MAX}
              aria-label={`One more ${q}`}
            >
              +
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}

/** The same deal to five rooms: the reader's, and one of each kind the same size. */
function Beside({
  comps,
  round,
  act,
  truth,
}: {
  comps: Comparison[];
  round: number;
  act: number;
  truth: "so" | "not";
}) {
  const BW = 170;
  const BH = 86;
  const x = (r: number) => 6 + (r / ROUNDS) * (BW - 12);
  const y = (p: number) => 6 + (1 - p / 100) * (BH - 14);
  const styleOf = (
    c: Comparison,
  ): { color: string; width: number; dash?: string } => {
    const only = KINDS.find(
      (k) => c.room[k] && KINDS.every((o) => o === k || !c.room[o]),
    );
    if (c.label === "this room" || !only)
      return { color: "var(--ink)", width: 2.2 };
    return {
      color: HUE[only],
      width: FIGHTS[only] ? 2.2 : 1.3,
      dash: only === "pacifist" ? "4 3" : undefined,
    };
  };
  return (
    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-5">
      {comps.map((c, i) => {
        const st = styleOf(c);
        const pts = c.middle.map((v, r) => [x(r), y(v)] as Pt);
        const band =
          `M${c.high.map((v, r) => `${fmt(x(r))} ${fmt(y(v))}`).join("L")}` +
          `L${[...c.low]
            .reverse()
            .map((v, r) => `${fmt(x(ROUNDS - r))} ${fmt(y(v))}`)
            .join("L")}Z`;
        const end = c.middle[Math.min(round, ROUNDS)];
        return (
          <figure
            key={c.label}
            className="ms-row min-w-0"
            style={{ ["--i" as string]: i }}
          >
            <svg
              viewBox={`0 0 ${BW} ${BH}`}
              className="w-full"
              role="img"
              aria-label={`${c.label}: the middle at ${pw(end)} in round ${round}`}
            >
              <rect
                x={6}
                y={6}
                width={BW - 12}
                height={BH - 14}
                fill="none"
                stroke="var(--rule)"
                strokeWidth={0.8}
              />
              <line
                x1={6}
                x2={BW - 6}
                y1={y(truth === "so" ? 100 : 0)}
                y2={y(truth === "so" ? 100 : 0)}
                stroke="var(--ink)"
                strokeWidth={1.6}
                opacity={0.3}
              />
              <line
                x1={6}
                x2={BW - 6}
                y1={y(act)}
                y2={y(act)}
                stroke="var(--accent)"
                strokeWidth={0.9}
                strokeDasharray="4 3"
              />
              <path d={band} fill={st.color} opacity={0.12} />
              <path
                d={handPath(pts, seedOf(`beside-${c.label}`), 0.4)}
                fill="none"
                stroke={st.color}
                strokeWidth={st.width}
                strokeDasharray={st.dash}
                strokeLinecap="round"
              />
              <line
                x1={x(round)}
                x2={x(round)}
                y1={6}
                y2={BH - 8}
                stroke="var(--faint)"
                strokeWidth={0.8}
                strokeDasharray="2 2"
              />
              <circle cx={x(round)} cy={y(end)} r={3} fill={st.color} />
            </svg>
            <figcaption className="mt-0.5 flex items-baseline justify-between gap-2">
              <span
                className="hand text-[15px] leading-tight"
                style={{
                  color: st.color === "var(--ink)" ? "var(--ink)" : st.color,
                }}
              >
                {c.label}
              </span>
              <span
                className="meta"
                style={{ color: "var(--muted)", textTransform: "none" }}
              >
                {pw(end)}
              </span>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

/* ── the view ──────────────────────────────────────────────────────────── */

/**
 * The muster: Askell's four quarters as an instrument. A claim, the prior and
 * where it came from, which way the reader would rather, the line they would
 * act at; the evidence as it came, run through the scout and the paladin, the
 * soldier and the pacifist beside the reader's own marks; then the four in
 * company — a room the reader composes on the field and runs round by round,
 * and the same deal to rooms of one kind each. The desk reads the claim and
 * the record back in counts; nothing places the reader in a quarter.
 */
export default function Muster() {
  const [theme, setTheme] = useTheme();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [open, setOpen] = useState<M | null>(null);
  const [kept, setKept] = useState(false);
  const [example, setExample] = useState(false);
  const [trouble, setTrouble] = useState<string | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const [pieceText, setPieceText] = useState("");
  const [otherText, setOtherText] = useState("");
  const [order, setOrder] = useState<number[] | null>(null);
  const [shuffles, setShuffles] = useState(0);
  // The room: a toy run on dealt evidence, not kept.
  const [truth, setTruth] = useState<"so" | "not">("so");
  const [gold, setGold] = useState<number>(0.2);
  const [court, setCourt] = useState(true);
  const [deal, setDeal] = useState(0);
  const [round, setRound] = useState(0);
  const [playing, setPlaying] = useState(false);
  const openRef = useRef<M | null>(null);
  const keptRef = useRef(false);
  const slugRef = useRef("");
  const sheetRef = useRef<HTMLElement>(null);
  const saving = useRef<Promise<void>>(Promise.resolve());
  openRef.current = open;
  keptRef.current = kept;
  const today = useMemo(localToday, []);
  const writable = payload?.writable ?? false;

  const reset = () => {
    setSure(null);
    setTrouble(null);
    setOrder(null);
  };
  const fresh = useCallback((asExample = false, about?: About | null) => {
    const day = localToday();
    slugRef.current = "";
    setKept(false);
    setExample(asExample && !about);
    setOpen(
      about
        ? musterAbout(about, day)
        : asExample
          ? {
              ...EXAMPLE_MUSTER,
              put: day,
              touched: day,
              pieces: EXAMPLE_MUSTER.pieces.map((p) => ({ ...p, on: day })),
            }
          : emptyMuster(day),
    );
    reset();
  }, []);
  const load = useCallback((m: M) => {
    slugRef.current = m.slug;
    setKept(true);
    setExample(false);
    setOpen(m);
    reset();
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const slug = p.get("slug");
    const id = p.get("id");
    fetch(`/api/muster${id ? `?id=${encodeURIComponent(id)}` : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((pl: Payload | null) => {
        if (!pl) {
          setTrouble("the claims could not be read");
          return;
        }
        setPayload(pl);
        const wanted = slug ? pl.musters.find((x) => x.slug === slug) : null;
        const about = pl.about
          ? pl.musters.find((x) => x.stone === pl.about!.id)
          : null;
        const going = pl.musters.find((m) => !m.came);
        if (wanted) load(wanted);
        else if (about) load(about);
        else if (pl.about) fresh(false, pl.about);
        else if (going) load(going);
        else if (!pl.writable && pl.musters[0]) load(pl.musters[0]);
        else fresh(pl.musters.length === 0);
      })
      .catch(() => setTrouble("the claims could not be read"));
  }, [fresh, load]);

  // Only once the claims are read: in development React mounts twice, and a sync on the
  // first mount would take the slug off the address before the second could read it.
  const loaded = payload !== null;
  useEffect(() => {
    if (!loaded) return;
    const url = new URL(window.location.href);
    if (kept && open?.slug) url.searchParams.set("slug", open.slug);
    else url.searchParams.delete("slug");
    if (kept) url.searchParams.delete("id");
    window.history.replaceState(null, "", url);
    putOnDesk(
      kept && open
        ? { kind: "muster", id: open.slug, label: open.claim.slice(0, 60) }
        : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, kept, open?.slug]);
  useEffect(() => () => putOnDesk(null), []);

  /* ── keeping ─────────────────────────────────────────────────────────── */

  const save = useCallback(
    (m: M) =>
      new Promise<M | null>((resolve) => {
        saving.current = saving.current.then(async () => {
          const isFresh = !slugRef.current;
          try {
            const r = await fetch("/api/muster", {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                muster: { ...m, slug: slugRef.current, touched: localToday() },
                fresh: isFresh,
              }),
            });
            const out = (await r.json().catch(() => null)) as
              M | { error: string } | null;
            if (!r.ok || !out || "error" in out) {
              setTrouble(
                out && "error" in out ? out.error : `not kept (${r.status})`,
              );
              resolve(null);
              return;
            }
            slugRef.current = out.slug;
            setKept(true);
            setExample(false);
            setTrouble(null);
            setOpen((cur) =>
              cur
                ? { ...cur, slug: out.slug, put: out.put, touched: out.touched }
                : cur,
            );
            setPayload((p) =>
              p
                ? {
                    ...p,
                    musters: [
                      out,
                      ...p.musters.filter((x) => x.slug !== out.slug),
                    ],
                  }
                : p,
            );
            resolve(out);
          } catch {
            setTrouble("not kept — the garden did not answer");
            resolve(null);
          }
        });
      }),
    [],
  );

  /** A change on the sheet, not yet kept: typing, and a drag while it is moving. */
  const patch = useCallback((p: Partial<M>) => {
    const m = openRef.current;
    if (!m) return;
    const next = { ...m, ...p };
    openRef.current = next;
    setExample(false);
    setOpen(next);
  }, []);
  const commit = useCallback(() => {
    const m = openRef.current;
    if (m && keptRef.current && writable) void save(m);
  }, [save, writable]);
  const set = (p: Partial<M>) => {
    const m = openRef.current;
    if (!m) return;
    const next = { ...m, ...p };
    setExample(false);
    // The ref moves now, not on the next render, so a second edit before then builds on this one.
    openRef.current = next;
    setOpen(next);
    if (keptRef.current && writable) void save(next);
  };
  const setPiece = (id: string, p: Partial<Piece>, keep = true) => {
    const m = openRef.current;
    if (!m) return;
    const next = {
      ...m,
      pieces: m.pieces.map((x) => (x.id === id ? { ...x, ...p } : x)),
    };
    setExample(false);
    openRef.current = next;
    setOpen(next);
    if (keep && keptRef.current && writable) void save(next);
  };
  const setOther = (id: string, p: Partial<Other>, keep = true) => {
    const m = openRef.current;
    if (!m) return;
    const next = {
      ...m,
      others: m.others.map((x) => (x.id === id ? { ...x, ...p } : x)),
    };
    setExample(false);
    openRef.current = next;
    setOpen(next);
    if (keep && keptRef.current && writable) void save(next);
  };
  const addPiece = () => {
    const t = pieceText.trim();
    const m = openRef.current;
    if (!t || !m) return;
    set({ pieces: [...m.pieces, newPiece(t, localToday())] });
    setPieceText("");
    setOrder(null);
  };
  const addOther = () => {
    const t = otherText.trim();
    const m = openRef.current;
    if (!t || !m) return;
    set({ others: [...m.others, newOther(t)] });
    setOtherText("");
  };
  const setDown = () => {
    const m = openRef.current;
    if (!m || !writable) return;
    if (!m.claim.trim()) {
      setTrouble("say the claim, in a line");
      return;
    }
    void save(m);
  };
  const remove = useCallback(async () => {
    const m = openRef.current;
    if (!m || !writable || !keptRef.current) return;
    const r = await fetch(`/api/muster?slug=${encodeURIComponent(m.slug)}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      setTrouble(`not taken off (${r.status})`);
      return;
    }
    setPayload((p) =>
      p ? { ...p, musters: p.musters.filter((x) => x.slug !== m.slug) } : p,
    );
    fresh();
  }, [writable, fresh]);

  /** The room's make-up changes on the sheet, and is kept with the claim. */
  const seat = (k: Kind) => {
    const m = openRef.current;
    if (!m || m.room[k] >= ROOM_MAX) return;
    set({ room: { ...m.room, [k]: m.room[k] + 1 } });
  };
  const unseat = (k: Kind) => {
    const m = openRef.current;
    if (!m || !m.room[k] || seatsOf(m.room).length <= 1) return;
    set({ room: { ...m.room, [k]: m.room[k] - 1 } });
  };

  /* ── derived ─────────────────────────────────────────────────────────── */

  const musters = useMemo(() => payload?.musters ?? [], [payload]);
  const n = open?.pieces.length ?? 0;
  useEffect(() => setOrder(null), [n, open?.slug]);
  const paths = useMemo(
    () => (open ? pathsOf(open, order ?? undefined) : null),
    [open, order],
  );
  const target = useMemo(
    () => (paths ? [paths.weights, paths.soldier, paths.pacifist] : []),
    [paths],
  );
  const figures = useTweened(
    target,
    order ? `order-${shuffles}` : "as-it-came",
  );
  // A draft is not on the record yet, so the reading does not say when it was set down.
  const words = useMemo(() => {
    if (!open) return [];
    const r = readings(open);
    if (!kept)
      r[0] = r[0].replace(/^set down [^·]*?(?= · |$)/, "not set down yet");
    return r;
  }, [open, kept]);
  const record = useMemo(() => recordReadings(tally(musters)), [musters]);

  const setup = useMemo(
    () =>
      open
        ? {
            room: open.room,
            prior: open.prior,
            act: open.act,
            truth,
            gold,
            court,
            rounds: ROUNDS,
            seed: seedOf(open.slug || open.claim || "muster") + deal,
          }
        : null,
    [
      open?.room,
      open?.prior,
      open?.act,
      open?.slug,
      open?.claim,
      truth,
      gold,
      court,
      deal,
    ],
  );
  const lazySetup = useDeferredValue(setup);
  const run = useMemo(
    () => (lazySetup ? runRoom(lazySetup) : null),
    [lazySetup],
  );
  const beside = useMemo(
    () => (lazySetup ? roomsBeside(lazySetup) : []),
    [lazySetup],
  );
  const roomWords = useMemo(
    () =>
      run && open
        ? roomReadings(roomTally(run, open.act, round), truth, open.act, ROUNDS)
        : [],
    [run, round, open?.act, truth],
  );

  useEffect(() => {
    if (!playing) return;
    if (round >= ROUNDS) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(
      () => setRound((r) => Math.min(ROUNDS, r + 1)),
      round === 0 ? 420 : reducedMotion() ? 700 : 1500,
    );
    return () => clearTimeout(t);
  }, [playing, round]);

  const pickPiece = (i: number) => {
    const el = document.getElementById(`ms-piece-${i}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    (el?.querySelector("textarea") as HTMLTextAreaElement | null)?.focus({
      preventScroll: true,
    });
  };
  const self = open?.self ? quarterOf(open.self[0], open.self[1]) : null;

  return (
    <main className="muster scroll-thin relative h-dvh w-full overflow-y-auto">
      <div className="mx-auto max-w-[86rem] px-5 pb-16 sm:px-10">
        <header className="rise flex flex-wrap items-start justify-between gap-4 pt-6 sm:pt-8">
          <div className="flex items-baseline gap-3">
            <h1
              className="display text-[40px] leading-none"
              style={{ color: "var(--ink)" }}
            >
              niwa
            </h1>
            <div>
              <div className="meta" style={{ color: "var(--accent)" }}>
                muster
              </div>
              <p
                className="hand mt-1 max-w-[31rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                Four ways to hold a view: after what is so or after your side,
                fighting for it or keeping the peace. Put a claim to all four —
                your prior, the evidence as it came, the line you would act at —
                then run a room of them.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/muster" />
            <button
              onClick={() => setTheme(theme === "paper" ? "sumi" : "paper")}
              className="chip px-2.5 py-1.5 text-[10px] tracking-[0.14em] uppercase"
              style={{ ...mono, color: "var(--muted)" }}
              aria-label="Toggle theme"
            >
              {theme === "paper" ? "sumi" : "paper"}
            </button>
          </div>
        </header>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          {/* ── the sheet ─────────────────────────────────────────────────── */}
          <section
            ref={sheetRef}
            className="panel sketched rise relative min-w-0 scroll-mt-4 p-5 sm:p-7"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The claim"
          >
            <Sketch seed={`muster-${open?.slug || "fresh"}`} draw />
            {!open || !paths ? (
              <p className="meta" style={{ color: "var(--faint)" }}>
                {trouble ?? "reading…"}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    {kept
                      ? `a claim · set down ${dayWords(open.put)}`
                      : example
                        ? "an example — a walk on Saturday"
                        : "now"}
                    {open.stone && (
                      <>
                        {" · about "}
                        <Link
                          href={`/catalogue?id=${encodeURIComponent(open.stone)}`}
                          className="ms-link"
                          style={{ color: "var(--ink)", textTransform: "none" }}
                        >
                          the stone
                        </Link>
                      </>
                    )}
                  </div>
                  {(kept || example) && writable && (
                    <Chip onClick={() => fresh()}>a new claim</Chip>
                  )}
                </div>

                <textarea
                  ref={(el) => grow(el)}
                  onInput={(e) => grow(e.currentTarget)}
                  value={open.claim}
                  onChange={(e) => patch({ claim: e.target.value })}
                  onBlur={commit}
                  readOnly={!writable}
                  rows={1}
                  placeholder="what do you hold to be so? a claim, in a line"
                  aria-label="The claim"
                  className="display ms-case mt-2 w-full resize-none overflow-hidden bg-transparent px-0 py-1 text-[26px] leading-[1.2] sm:text-[31px]"
                  style={{ color: "var(--ink)" }}
                />
                {example && (
                  <p
                    className="hand mt-1 text-[14.5px] leading-[1.3]"
                    style={{ color: "var(--faint)" }}
                  >
                    an example, drawn so the sheet is on the table — write over
                    it, or start a new claim
                  </p>
                )}

                {/* ── before anything came in ─────────────────────────────── */}
                <div
                  className="mt-4 flex flex-col gap-2 text-[15px] leading-[1.7]"
                  style={{ color: "var(--ink)" }}
                >
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span>Before anything came in you put it at</span>
                    <Pct
                      value={open.prior}
                      writable={writable}
                      label="Your prior, in percent"
                      onCommit={(v) => v !== null && set({ prior: v })}
                    />
                    <span style={{ color: "var(--muted)" }}>— from</span>
                    <Seg
                      label="where the prior came from"
                      options={FROMS}
                      labels={FROM_LABEL}
                      value={open.from}
                      disabled={!writable}
                      onPick={(f) => set({ from: open.from === f ? "" : f })}
                    />
                  </p>
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span>You would rather it were</span>
                    <Seg
                      label="which way you would rather"
                      options={["so", "not", ""] as const}
                      labels={{ so: "so", not: "not so", "": "either way" }}
                      value={open.like}
                      disabled={!writable}
                      onPick={(l) => set({ like: l })}
                    />
                  </p>
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span>You would act at</span>
                    <Pct
                      value={open.act}
                      writable={writable}
                      label="The line you would act at, in percent"
                      onCommit={(v) => v !== null && set({ act: v })}
                    />
                    <input
                      value={open.would}
                      onChange={(e) => patch({ would: e.target.value })}
                      onBlur={commit}
                      readOnly={!writable}
                      placeholder="and do what?"
                      aria-label="What you would do"
                      className="ms-case hand min-w-[12rem] flex-1 bg-transparent text-[18px] leading-[1.25]"
                      style={{ color: "var(--ink)" }}
                    />
                  </p>
                </div>

                {/* ── alone with the evidence ─────────────────────────────── */}
                <div
                  className="mt-6"
                  style={{ borderTop: "1px solid var(--rule)", paddingTop: 14 }}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <Label>alone with the evidence</Label>
                    {n > 1 && (
                      <span className="flex flex-wrap items-baseline gap-2">
                        <button
                          className="ms-link meta"
                          style={{
                            color: order ? "var(--muted)" : "var(--ink)",
                          }}
                          onClick={() => setOrder(null)}
                          aria-pressed={!order}
                        >
                          as it came
                        </button>
                        <button
                          className="ms-link meta"
                          style={{
                            color: order ? "var(--ink)" : "var(--muted)",
                          }}
                          onClick={() => {
                            const s = shuffles + 1;
                            setShuffles(s);
                            setOrder(
                              shuffled(
                                n,
                                seedOf(`${open.slug || open.claim}-${s}`),
                              ),
                            );
                          }}
                        >
                          {order ? "another order" : "in another order"}
                        </button>
                      </span>
                    )}
                  </div>
                  <p
                    className="hand mt-1 text-[15px] leading-[1.3]"
                    style={{ color: "var(--muted)" }}
                  >
                    {order
                      ? `the same pieces in another order: ${order.map((i) => i + 1).join(", ")}. the scout and the paladin end where they did — the soldier and the pacifist may not. your marks stay with the order they came in.`
                      : writable
                        ? "the same pieces through each figure's rule. drag your prior, the line you would act at, or where you stood after a piece."
                        : "the same pieces through each figure's rule. hover a piece for where each stood after it."}
                  </p>
                  <div className="mt-2">
                    <PathChart
                      m={open}
                      figures={figures}
                      order={order}
                      writable={writable}
                      onPrior={(p) => patch({ prior: p })}
                      onAct={(p) => patch({ act: p })}
                      onMark={(i, p) =>
                        setPiece(open.pieces[i].id, { at: p }, false)
                      }
                      onDone={commit}
                      onPick={pickPiece}
                    />
                    <Legend m={open} figures={figures} shuffledNow={!!order} />
                  </div>
                </div>

                {/* ── what came in ────────────────────────────────────────── */}
                <div
                  className="mt-6"
                  style={{ borderTop: "1px solid var(--rule)", paddingTop: 14 }}
                >
                  <Label>what came in</Label>
                  <p
                    className="hand mt-1 text-[15px] leading-[1.3]"
                    style={{ color: "var(--muted)" }}
                  >
                    each piece as it came: which way it points, how much more
                    likely you would see it if that way were so, how you met it,
                    and where you stood after.
                  </p>
                  <ol className="mt-3 flex flex-col gap-4">
                    {open.pieces.map((p, i) => (
                      <li
                        key={p.id}
                        id={`ms-piece-${i}`}
                        className="ms-row"
                        style={{ ["--i" as string]: i }}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className="mt-1 w-6 shrink-0 text-right"
                            style={{
                              ...mono,
                              fontSize: 11,
                              color: "var(--faint)",
                            }}
                          >
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <textarea
                              ref={(el) => grow(el)}
                              onInput={(e) => grow(e.currentTarget)}
                              rows={1}
                              value={p.text}
                              onChange={(e) =>
                                setPiece(p.id, { text: e.target.value }, false)
                              }
                              onBlur={commit}
                              readOnly={!writable}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                }
                              }}
                              placeholder="what came in, in a line"
                              aria-label={`Piece ${i + 1}`}
                              className="ms-case hand w-full resize-none overflow-hidden bg-transparent text-[19px] leading-[1.25]"
                              style={{ color: "var(--ink)" }}
                            />
                            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-5 gap-y-1.5">
                              <Seg
                                label={`which way ${p.id}`}
                                options={WAYS}
                                labels={WAY_LABEL}
                                value={p.way}
                                disabled={!writable}
                                onPick={(w) => setPiece(p.id, { way: w })}
                              />
                              <Seg
                                label={`how much ${p.id}`}
                                options={
                                  (WEIGHTS as readonly number[]).includes(
                                    p.weight,
                                  )
                                    ? WEIGHTS
                                    : [...WEIGHTS, p.weight]
                                }
                                labels={{
                                  ...WEIGHT_LABEL,
                                  [p.weight]:
                                    WEIGHT_LABEL[p.weight] ?? `×${p.weight}`,
                                }}
                                value={p.weight}
                                disabled={!writable}
                                onPick={(w) => setPiece(p.id, { weight: w })}
                              />
                              <Seg
                                label={`how you met ${p.id}`}
                                options={METS}
                                labels={MET_LABEL}
                                value={p.met}
                                disabled={!writable}
                                onPick={(k) => setPiece(p.id, { met: k })}
                              />
                              <span className="inline-flex items-baseline gap-1.5">
                                <span
                                  className="text-[13px]"
                                  style={{ color: "var(--muted)" }}
                                >
                                  then
                                </span>
                                <Pct
                                  value={p.at}
                                  size={19}
                                  empty
                                  writable={writable}
                                  label={`Where you stood after piece ${i + 1}`}
                                  onCommit={(v) => setPiece(p.id, { at: v })}
                                />
                              </span>
                            </div>
                            {p.on && (
                              <div
                                className="meta mt-1"
                                style={{
                                  color: "var(--faint)",
                                  textTransform: "none",
                                }}
                              >
                                {dayWords(p.on)}
                              </div>
                            )}
                          </div>
                          {writable && (
                            <button
                              onClick={() =>
                                set({
                                  pieces: open.pieces.filter(
                                    (x) => x.id !== p.id,
                                  ),
                                })
                              }
                              className="ms-link meta mt-2 shrink-0 px-1"
                              style={{ color: "var(--faint)" }}
                              aria-label="Take this piece off"
                              title="take this piece off"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                  {writable && (
                    <div className="mt-4 flex items-center gap-3">
                      <span className="w-6 shrink-0" aria-hidden />
                      <input
                        value={pieceText}
                        onChange={(e) => setPieceText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addPiece();
                        }}
                        placeholder={
                          n
                            ? "another piece, as it came"
                            : "the first piece of evidence, in a line"
                        }
                        aria-label="Another piece"
                        className="ms-case hand min-w-0 flex-1 bg-transparent text-[19px] leading-[1.25]"
                        style={{ color: "var(--ink)" }}
                      />
                      <Chip onClick={addPiece} disabled={!pieceText.trim()}>
                        add
                      </Chip>
                    </div>
                  )}
                  {!kept && writable && (
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <Chip onClick={setDown} accent>
                        set it down
                      </Chip>
                      <span
                        className="hand text-[14.5px]"
                        style={{ color: "var(--faint)" }}
                      >
                        nothing is kept until you set it down
                      </span>
                    </div>
                  )}
                </div>

                {/* ── in company ──────────────────────────────────────────── */}
                {run && (
                  <div
                    className="mt-7"
                    style={{
                      borderTop: "1px solid var(--rule)",
                      paddingTop: 14,
                    }}
                  >
                    <Label>in company</Label>
                    <p
                      className="hand mt-1 text-[15px] leading-[1.3]"
                      style={{ color: "var(--muted)" }}
                    >
                      alone, the scout and the paladin move as one. they part in
                      a room. seat one by clicking its quarter, see one out by
                      clicking it, and run the room on dealt evidence — most of
                      it pointing at what is so, some of it fool&apos;s gold.
                    </p>
                    <div
                      className="mt-3 grid gap-x-8 gap-y-4 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]"
                      style={{ ["--ms-lag" as string]: playing ? "560ms" : "0ms" }}
                    >
                      <div className="mx-auto w-full max-w-[26rem] min-w-0">
                        <Field
                          run={run}
                          round={round}
                          room={open.room}
                          self={open.self}
                          writable={writable}
                          playingKey={`${deal}-${truth}-${gold}-${court}`}
                          onSeat={seat}
                          onUnseat={unseat}
                          onSelf={(s) => patch({ self: s })}
                          onSelfDone={commit}
                        />
                        <p
                          className="hand mt-1 text-center text-[14.5px] leading-[1.3]"
                          style={{ color: "var(--muted)" }}
                        >
                          {open.self
                            ? self!.between
                              ? `you put yourself on the line between the ${PLURAL[self!.kind]} and the ${PLURAL[self!.between]}`
                              : `you put yourself among the ${PLURAL[self!.kind]}`
                            : writable
                              ? "where would you put yourself, on this one? drag your ring onto the field"
                              : "not put on the field"}
                          {open.self && writable && (
                            <>
                              {" · "}
                              <button
                                className="ms-link"
                                style={{ color: "var(--faint)" }}
                                onClick={() => set({ self: null })}
                              >
                                take it off
                              </button>
                            </>
                          )}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <div className="mb-2 min-h-[3.2em]">
                          <div className="meta" style={{ color: "var(--faint)" }}>
                            {round ? `round ${round} of ${ROUNDS}` : "before the first round"}
                          </div>
                          <p
                            key={`${round}-${deal}`}
                            className="hand ms-arrive mt-0.5 text-[16.5px] leading-[1.25]"
                            style={{ color: "var(--ink)" }}
                          >
                            {roundWords(run, round, court)}
                          </p>
                        </div>
                        <Lanes
                          run={run}
                          round={round}
                          act={open.act}
                          truth={truth}
                          room={open.room}
                          onSeat={seat}
                          onUnseat={unseat}
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Chip
                            on={playing}
                            onClick={() => {
                              if (playing) setPlaying(false);
                              else {
                                if (round >= ROUNDS) setRound(0);
                                setPlaying(true);
                              }
                            }}
                          >
                            {playing
                              ? "pause"
                              : round >= ROUNDS
                                ? "run it again"
                                : round
                                  ? "go on"
                                  : "run the room"}
                          </Chip>
                          <Chip
                            onClick={() => {
                              setPlaying(false);
                              setRound((r) => Math.min(ROUNDS, r + 1));
                            }}
                            disabled={round >= ROUNDS}
                          >
                            a round
                          </Chip>
                          <Chip
                            onClick={() => {
                              setPlaying(false);
                              setRound(0);
                            }}
                            disabled={!round}
                          >
                            back to the start
                          </Chip>
                          <Chip
                            onClick={() => {
                              setDeal((d) => d + 1);
                            }}
                          >
                            deal again
                          </Chip>
                        </div>
                        <label className="mt-3 flex items-center gap-3">
                          <span
                            className="meta shrink-0"
                            style={{ color: "var(--faint)" }}
                          >
                            round {round}
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={ROUNDS}
                            value={round}
                            onChange={(e) => {
                              setPlaying(false);
                              setRound(Number(e.target.value));
                            }}
                            className="ms-range min-w-0 flex-1"
                            aria-label="Round"
                          />
                          <span
                            className="meta shrink-0"
                            style={{ color: "var(--faint)" }}
                          >
                            {ROUNDS}
                          </span>
                        </label>
                        <div
                          className="mt-3 flex flex-col gap-1.5 text-[13px]"
                          style={{ color: "var(--muted)" }}
                        >
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span>suppose it is</span>
                            <Seg
                              label="suppose it is"
                              options={["so", "not"] as const}
                              labels={{ so: "so", not: "not so" }}
                              value={truth}
                              onPick={setTruth}
                            />
                          </div>
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span>fool&apos;s gold</span>
                            <Seg
                              label="fool's gold"
                              options={GOLD}
                              labels={GOLD_LABEL}
                              value={gold}
                              onPick={setGold}
                            />
                          </div>
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span>the room is</span>
                            <Seg
                              label="the room is"
                              options={["court", "stage"] as const}
                              labels={{ court: "a court", stage: "a stage" }}
                              value={court ? "court" : "stage"}
                              onPick={(v) => setCourt(v === "court")}
                            />
                            <span className="hand text-[14px]" style={{ color: "var(--faint)" }}>
                              {court
                                ? "what is shown up is struck for everyone; whoever fought what held takes it whole"
                                : "nothing is ruled; each takes a challenge as it likes"}
                            </span>
                          </div>
                        </div>
                        <p
                          className="mt-3 text-[13px] leading-[1.6]"
                          style={{ color: "var(--ink)" }}
                        >
                          {roomWords.join(" · ")}
                        </p>
                        <details className="ms-rules mt-2">
                          <summary
                            className="ms-link meta"
                            style={{ color: "var(--muted)" }}
                          >
                            the rules the room runs on
                          </summary>
                          <ol
                            className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-[12.5px] leading-[1.55]"
                            style={{ color: "var(--muted)" }}
                          >
                            <li>
                              Each round one of the room is dealt a piece, a little or some. Most point at what is so, the stronger the more often; fool&apos;s gold looks like some and points either way.</li>
                            <li>
                              The paladin and the scout say what they have — the
                              paladin to everyone, the scout to half the room.
                              The soldier says only what is for its side. The
                              pacifist says nothing; it notices a third of what
                              comes to it and hears a third of what is said.
                            </li>
                            <li>
                              The soldier and the paladin fight: each challenges
                              what goes against its side. A challenge shows
                              fool&apos;s gold up two times in three; real
                              evidence holds.
                            </li>
                            <li>
                              In a court what is shown up is struck for everyone, and whoever challenged a piece that held takes the whole of it — they fought it and lost. On a stage nothing is ruled: those after what is so drop what was shown up, and those after their side drop whatever against them was challenged at all.
                            </li>
                            <li>
                              Whoever is after what is so moves by a
                              piece&apos;s weight, either way. Whoever is after
                              its side moves by the whole of what is for it and
                              a quarter of what is against.
                            </li>
                            <li>
                              Every other paladin starts on the far side, for
                              the credit of being right where the others were
                              not — marked with a dot.
                            </li>
                            <li>
                              The room starts around your prior; the line is the
                              one you would act at. It is a model: the rules are
                              written out here so they can be argued with.
                            </li>
                          </ol>
                        </details>
                      </div>
                    </div>

                    <div className="mt-6">
                      <Label>the same deal, five rooms</Label>
                      <p
                        className="hand mt-1 text-[15px] leading-[1.3]"
                        style={{ color: "var(--muted)" }}
                      >
                        this room beside rooms of one kind each, the same size,
                        dealt the same pieces — the line is the room&apos;s
                        middle, the shading where most of it stands
                      </p>
                      <Beside
                        comps={beside}
                        round={round}
                        act={open.act}
                        truth={truth}
                      />
                    </div>
                  </div>
                )}

                {/* ── who else holds a view · afterwards ──────────────────── */}
                <div
                  className="mt-7 grid gap-x-8 gap-y-6 md:grid-cols-2"
                  style={{ borderTop: "1px solid var(--rule)", paddingTop: 14 }}
                >
                  <div className="min-w-0">
                    <Label>who else holds a view</Label>
                    <ul className="mt-2 flex flex-col gap-2.5">
                      {open.others.map((o, i) => (
                        <li
                          key={o.id}
                          className="ms-row"
                          style={{ ["--i" as string]: i }}
                        >
                          <div className="flex items-baseline gap-2">
                            <input
                              value={o.name}
                              onChange={(e) =>
                                setOther(o.id, { name: e.target.value }, false)
                              }
                              onBlur={commit}
                              readOnly={!writable}
                              aria-label="Who"
                              className="ms-case hand min-w-0 flex-1 bg-transparent text-[18px] leading-[1.25]"
                              style={{ color: "var(--ink)" }}
                            />
                            <Pct
                              value={o.at}
                              size={18}
                              empty
                              writable={writable}
                              label={`Where ${o.name} stands`}
                              onCommit={(v) => setOther(o.id, { at: v })}
                            />
                            {writable && (
                              <button
                                onClick={() =>
                                  set({
                                    others: open.others.filter(
                                      (x) => x.id !== o.id,
                                    ),
                                  })
                                }
                                className="ms-link meta shrink-0 px-1"
                                style={{ color: "var(--faint)" }}
                                aria-label="Take them off"
                                title="take them off"
                              >
                                ×
                              </button>
                            )}
                          </div>
                          <div className="mt-1">
                            <Seg
                              label={`how you met ${o.id}`}
                              options={FACES}
                              labels={FACE_LABEL}
                              value={o.met}
                              disabled={!writable}
                              onPick={(k) => setOther(o.id, { met: k })}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                    {writable ? (
                      <div className="mt-3 flex items-baseline gap-2">
                        <input
                          value={otherText}
                          onChange={(e) => setOtherText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addOther();
                          }}
                          placeholder="someone who holds a view on it"
                          aria-label="Someone who holds a view"
                          className="ms-case hand min-w-0 flex-1 bg-transparent text-[18px] leading-[1.25]"
                          style={{ color: "var(--ink)" }}
                        />
                        <Chip onClick={addOther} disabled={!otherText.trim()}>
                          add
                        </Chip>
                      </div>
                    ) : (
                      !open.others.length && (
                        <p
                          className="hand mt-1 text-[15px]"
                          style={{ color: "var(--muted)" }}
                        >
                          no one set down
                        </p>
                      )
                    )}
                  </div>
                  <div className="min-w-0">
                    <Label>afterwards</Label>
                    <div
                      className="mt-2 flex flex-col gap-2 text-[14px]"
                      style={{ color: "var(--ink)" }}
                    >
                      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span style={{ color: "var(--muted)" }}>
                          did you act?
                        </span>
                        {open.acted ? (
                          <>
                            <span className="hand text-[17px]">
                              you acted {dayWords(open.acted)}
                            </span>
                            {writable && (
                              <button
                                className="ms-link meta"
                                style={{ color: "var(--faint)" }}
                                onClick={() => set({ acted: "" })}
                              >
                                undo
                              </button>
                            )}
                          </>
                        ) : (
                          <Chip
                            onClick={() => set({ acted: localToday() })}
                            disabled={!writable}
                          >
                            I acted today
                          </Chip>
                        )}
                      </p>
                      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span style={{ color: "var(--muted)" }}>
                          how did it come out?
                        </span>
                        <Seg
                          label="how it came out"
                          options={["so", "not"] as const}
                          labels={{ so: "so", not: "not so" }}
                          value={open.came}
                          disabled={!writable}
                          onPick={(c) =>
                            open.came === c
                              ? set({ came: "", cameOn: "" })
                              : set({
                                  came: c,
                                  cameOn: open.cameOn || localToday(),
                                })
                          }
                        />
                        {open.came && open.cameOn && (
                          <span
                            className="meta"
                            style={{
                              color: "var(--faint)",
                              textTransform: "none",
                            }}
                          >
                            {dayWords(open.cameOn)}
                          </span>
                        )}
                      </p>
                    </div>
                    <textarea
                      ref={(el) => grow(el)}
                      onInput={(e) => grow(e.currentTarget)}
                      value={open.after}
                      onChange={(e) => patch({ after: e.target.value })}
                      onBlur={commit}
                      readOnly={!writable}
                      rows={2}
                      placeholder="afterwards, in your words"
                      aria-label="Afterwards"
                      className="ms-case mt-3 w-full resize-none overflow-hidden bg-transparent px-0 py-1 text-[15.5px] leading-[1.55]"
                      style={{ color: "var(--ink)" }}
                    />
                  </div>
                </div>

                {kept && writable && (
                  <div className="mt-6 flex flex-wrap gap-1.5">
                    <Chip
                      onClick={() =>
                        sure === "off" ? void remove() : setSure("off")
                      }
                      accent={sure === "off"}
                    >
                      {sure === "off"
                        ? "take it off the record — sure?"
                        : "take it off the record"}
                    </Chip>
                  </div>
                )}
                {trouble && (
                  <p
                    className="meta mt-3"
                    style={{ color: "var(--accent)" }}
                    role="alert"
                  >
                    {trouble}
                  </p>
                )}
              </>
            )}
          </section>

          {/* ── the desk ──────────────────────────────────────────────────── */}
          <aside className="flex min-w-0 flex-col gap-5">
            <section
              className="panel sketched rise relative p-4"
              style={{ borderRadius: 3, animationDelay: "100ms" }}
              aria-label="The reading"
            >
              <Sketch seed="muster-reading" draw />
              <Label>the reading</Label>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                {payload ? words.join(" · ") : "reading…"}
              </p>
            </section>

            <section
              className="panel sketched rise relative p-4"
              style={{ borderRadius: 3, animationDelay: "140ms" }}
              aria-label="The record"
            >
              <Sketch seed="muster-record" draw />
              <Label>the record</Label>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                {payload ? record.join(" · ") : "reading…"}
              </p>
              {musters.length > 0 && (
                <ol className="mt-2 flex flex-col">
                  {musters.slice(0, 24).map((m, i) => {
                    const on = kept && open?.slug === m.slug;
                    const w = pathsOf(m).weights.at(-1)!;
                    const last =
                      [...m.pieces].reverse().find((p) => p.at !== null)?.at ??
                      null;
                    return (
                      <li
                        key={m.slug}
                        className="ms-row"
                        style={{ ["--i" as string]: i }}
                      >
                        <button
                          onClick={() => load(m)}
                          className="-mx-1.5 flex w-[calc(100%+0.75rem)] flex-col gap-0.5 rounded px-1.5 py-1.5 text-left"
                          aria-current={on ? "true" : undefined}
                        >
                          <span
                            className="meta"
                            style={{
                              color: on ? "var(--accent)" : "var(--faint)",
                              textTransform: "none",
                            }}
                          >
                            {dayWords(m.put)} ·{" "}
                            {m.came
                              ? `came out ${m.came === "so" ? "so" : "not so"}`
                              : "open"}
                          </span>
                          <span
                            className="display text-[15.5px] leading-[1.25]"
                            style={{ color: "var(--ink)" }}
                          >
                            {m.claim}
                          </span>
                          <span
                            className="hand text-[14.5px]"
                            style={{ color: "var(--muted)" }}
                          >
                            {m.pieces.length
                              ? `your weights ${pw(w)}${last !== null ? ` · you ${pw(last)}` : ""}`
                              : `put at ${pw(m.prior)}, nothing in yet`}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            <section
              className="panel sketched rise relative p-4"
              style={{ borderRadius: 3, animationDelay: "180ms" }}
              aria-label="What the muster holds to"
            >
              <Sketch seed="muster-laws" draw />
              <Label>what the muster holds to</Label>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                The four quarters are Amanda Askell&apos;s. Julia Galef split
                reasoning into the soldier&apos;s, which defends a side, and the
                scout&apos;s, which wants to see what is there; Askell pointed
                out that the soldier does two things — it is after what it would
                like to be so, and it fights — and crossed them. The paladin
                fights and is after what is so; the pacifist is after its side
                and keeps the peace.
              </p>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                The sheet multiplies your own weights and sets the product
                beside your own marks, and runs the four figures&apos; rules on
                the same pieces. It never places you in a quarter — you put
                yourself there — and never says a move was too large or too
                small. The room is a model with its rules written out; its
                numbers are the garden&apos;s, not Askell&apos;s.
              </p>
              <p
                className="meta mt-3"
                style={{ color: "var(--faint)", textTransform: "none" }}
              >
                Amanda Askell, Paladin, pacifist, soldier, scout (2022) · Julia
                Galef, The Scout Mindset (2021)
              </p>
              <p
                className="meta mt-3"
                style={{ color: "var(--faint)", textTransform: "none" }}
              >
                {payload?.dir
                  ? `kept in ${payload.dir.replace(/^\/Users\/[^/]+/, "~")}`
                  : payload
                    ? "fiction, like the rest of the specimen"
                    : ""}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
