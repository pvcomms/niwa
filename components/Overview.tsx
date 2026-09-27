"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  HORIZONS,
  MINUTE,
  WORST,
  YEAR,
  atOf,
  closeSpan,
  dayWords,
  dipAt,
  emptyStep,
  farSpan,
  frameAt,
  horizonName,
  lastsWords,
  minutesBetween,
  nextWords,
  readings,
  remark,
  roadsOf,
  shareWords,
  spanAt,
  statusOf,
  stopsOf,
  tally,
  theDip,
  ticksOf,
  titleOf,
  wholeReadings,
  type Step,
} from "@/lib/overview";
import { sentencesOf } from "@/lib/way";
import { EXAMPLE_STEP } from "@/content/overview";
import { ribbon, seedOf } from "@/lib/hand";
import { putOnDesk } from "./desk";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

type Payload = {
  steps: Step[];
  about: { id: string; label: string; first: string } | null;
  writable: boolean;
  dir: string | null;
};

type Mode = "draft" | "open" | "in-it" | "taken";
type Unit = "minutes" | "hours" | "days";
const UNIT_MIN: Record<Unit, number> = { minutes: 1, hours: 60, days: 1440 };
const UNITS: Unit[] = ["minutes", "hours", "days"];
const unitOf = (lasts: number): Unit =>
  lasts % 1440 === 0
    ? "days"
    : lasts % 60 === 0 && lasts >= 120
      ? "hours"
      : "minutes";

const mono = { fontFamily: "var(--font-mono)" } as const;
const hand = { fontFamily: "var(--font-hand)" } as const;
const chip = "chip ov-seg px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";
/** How long the reader holds to let a step go for today. */
const HOLD_MS = 2400;

const nowIso = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}${sign}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`;
};
const localToday = () => nowIso().slice(0, 10);
const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

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

/** A number written in the hand that can be clicked and retyped; it commits on blur or return, and escape leaves it as it was. */
function Num({
  value,
  min,
  max,
  onCommit,
  writable,
  label,
  size = 24,
  placeholder = "",
}: {
  value: number | null;
  min: number;
  max: number;
  onCommit: (n: number) => void;
  writable: boolean;
  label: string;
  size?: number;
  placeholder?: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const dropped = useRef(false);
  const shown = text ?? (value === null ? "" : String(value));
  return (
    <input
      value={shown}
      readOnly={!writable}
      inputMode="numeric"
      aria-label={label}
      placeholder={placeholder}
      onFocus={(e) => {
        if (!writable) return;
        dropped.current = false;
        setText(value === null ? "" : String(value));
        e.currentTarget.select();
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text !== null && !dropped.current && text.trim()) {
          const v = Number(text.replace("−", "-"));
          if (Number.isFinite(v)) {
            const c = clamp(Math.round(v), min, max);
            if (c !== value) onCommit(c);
          }
        }
        setText(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          dropped.current = true;
          e.currentTarget.blur();
        }
      }}
      className="ov-num hand"
      style={{
        fontSize: size,
        width: `${Math.max(1.3, (shown || placeholder).length * 0.58 + 0.7)}em`,
      }}
    />
  );
}

/* ── the drawing ───────────────────────────────────────────────────────── */

type Dims = {
  W: number;
  H: number;
  PL: number;
  PR: number;
  PT: number;
  PB: number;
};
const WIDE: Dims = { W: 800, H: 460, PL: 18, PR: 24, PT: 92, PB: 34 };
const TALL: Dims = { W: 800, H: 760, PL: 18, PR: 24, PT: 190, PB: 46 };

type P = [number, number];
const line = (ps: P[]) =>
  ps
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join("");
const area = (top: P[], bottom: P[]) =>
  `${line(top)}L${[...bottom]
    .reverse()
    .map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`)
    .join("L")}Z`;

/** Where to draw the roads across a frame: evenly across it, densely through the dip, and at every mark. */
function timesAcross(x1: number, dips: number[], extra: number[]): number[] {
  const out: number[] = [];
  const N = 240;
  for (let i = 0; i <= N; i++) out.push((x1 * i) / N);
  for (const L of dips) {
    const end = Math.min(L, x1);
    for (let i = 1; i < 72; i++) out.push((end * i) / 72);
    out.push(end);
  }
  for (const t of extra) if (t > 0 && t < x1) out.push(t);
  return [...new Set(out)].sort((a, b) => a - b);
}

/**
 * The step drawn to scale: up close the dip is all there is; pulled back,
 * the frame multiplies through the scales of time until the dip is a
 * hairline that has kept its depth and the life fills the frame. The two
 * roads fork at now. Everything on it is a number the reader set; the
 * trough and the marks drag, and the rail under it is the altitude.
 */
function Scope({
  step,
  mode,
  writable,
  letting,
  elapsed,
  introKey,
  onPatch,
  onCommit,
}: {
  step: Step;
  mode: Mode;
  writable: boolean;
  letting: boolean;
  elapsed: number | null;
  introKey: number;
  onPatch: (p: Partial<Step>) => void;
  onCommit: (p: Partial<Step>) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [railW, setRailW] = useState(0);
  const [tall, setTall] = useState(false);
  const [z, setZ] = useState(0);
  const zRef = useRef(0);
  zRef.current = z;
  const raf = useRef<number | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const d = tall ? TALL : WIDE;
  const { W, H, PL, PR, PT, PB } = d;
  const PW = W - PL - PR;
  const PH = H - PT - PB;
  const MID = PT + PH / 2;
  const UNIT = PH / 2 / 10.6;
  const yOf = (v: number) => MID - v * UNIT;
  const vOf = (y: number) => (MID - y) / UNIT;

  useEffect(() => {
    const el = wrapRef.current;
    const rail = railRef.current;
    if (!el || !rail) return;
    const measure = () => {
      setTall(el.offsetWidth < 460);
      setRailW(rail.offsetWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(rail);
    return () => ro.disconnect();
  }, []);

  const halt = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);

  /** Travel to an altitude at an even pace in log time, the way the Eameses' camera rose. */
  const fly = useCallback(
    (to: number) => {
      halt();
      const from = zRef.current;
      const dz = Math.abs(to - from);
      if (dz < 0.001) return;
      if (reducedMotion()) {
        setZ(to);
        return;
      }
      const dur = 700 + dz * 5600;
      const t0 = performance.now();
      const tick = (now: number) => {
        const u = Math.min(1, (now - t0) / dur);
        const e = 0.5 - 0.5 * Math.cos(Math.PI * u);
        setZ(from + (to - from) * e);
        raf.current = u < 1 ? requestAnimationFrame(tick) : null;
      };
      raf.current = requestAnimationFrame(tick);
    },
    [halt],
  );

  // A step put on the table starts close, and after a breath the drawing pulls back on its own.
  const inIt = mode === "in-it";
  useEffect(() => {
    halt();
    setZ(0);
    if (inIt || reducedMotion()) return;
    const t = window.setTimeout(() => fly(1), 1300);
    return () => {
      window.clearTimeout(t);
      halt();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introKey]);
  // Taking the step brings the drawing close, to the minutes it is in.
  useEffect(() => {
    if (inIt) fly(0);
  }, [inIt, fly]);

  // Space pulls back and comes in close, unless the reader is writing or pressing something.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (
        el?.closest(
          "input, textarea, select, button, [contenteditable], [role=slider]",
        )
      )
        return;
      e.preventDefault();
      fly(zRef.current < 0.98 ? 1 : 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fly]);

  // ⌘ and the wheel (or a pinch) over the drawing go out and in by hand.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      e.preventDefault();
      halt();
      setZ((v) => clamp(v + e.deltaY * 0.0022, 0, 1));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [halt]);

  /* ── what is drawn ── */

  const felt =
    mode === "taken" && step.felt !== null
      ? { hurt: step.felt, lasts: step.feltLasts ?? step.lasts }
      : null;
  const shape = felt ? { ...step, ...felt } : step;
  const roads = roadsOf(shape);
  const L = shape.lasts * MINUTE;
  const close =
    inIt && elapsed !== null
      ? Math.max(closeSpan(step.lasts), elapsed * MINUTE * 1.3)
      : closeSpan(felt ? Math.max(step.lasts, felt.lasts) : step.lasts);
  const far = farSpan(step.horizon, shape.lasts);
  const span = spanAt(z, close, far);
  const [x0, x1] = frameAt(span);
  const xOf = (t: number) => PL + ((t - x0) / (x1 - x0)) * PW;
  const markTs = step.marks.map((m) => atOf(m.when) ?? step.horizon * YEAR);
  const ts = timesAcross(x1, felt ? [L, step.lasts * MINUTE] : [L], markTs);
  const withP: P[] = [
    [xOf(x0), yOf(0)],
    ...ts.map((t) => [xOf(t), yOf(roads.with(t))] as P),
  ];
  const withoutP: P[] = ts.map((t) => [xOf(t), yOf(roads.without(t))] as P);
  const gap = area(
    ts.map(
      (t) => [xOf(t), yOf(Math.max(roads.with(t), roads.without(t)))] as P,
    ),
    withoutP,
  );
  const hollow = area(
    ts.map(
      (t) => [xOf(t), yOf(Math.min(roads.with(t), roads.without(t)))] as P,
    ),
    withoutP,
  );
  const seed = seedOf(`ov-${step.slug || "draft"}`);
  const ink = ribbon(line(withP), 2.4, seed);
  const said = felt
    ? line(ts.map((t) => [xOf(t), yOf(dipAt(t, step.hurt, step.lasts))] as P))
    : null;
  const ticks = ticksOf(span);
  const stops = stopsOf(shape.lasts, step.horizon);
  // The ends are always named; a scale between is named only where its word fits.
  const showStop = new Set([0, stops.length - 1]);
  {
    const extent = (i: number) => {
      const w = stops[i].label.length * 7.4 + 6;
      const x = stops[i].z * railW;
      return i === 0 ? [x, x + w] : i === stops.length - 1 ? [x - w, x] : [x - w / 2, x + w / 2];
    };
    let right = extent(0)[1];
    const endLeft = extent(stops.length - 1)[0];
    for (let i = 1; i < stops.length - 1; i++) {
      const [l, r] = extent(i);
      if (l > right + 12 && r < endLeft - 12) {
        showStop.add(i);
        right = r;
      }
    }
  }
  const nowX = xOf(0);
  const dipW = xOf(L) - nowX;
  const worst: P = [xOf(WORST * L), yOf(-shape.hurt)];
  const dipLabelX =
    Math.max(xOf(L), felt ? xOf(step.lasts * MINUTE) : 0, worst[0]) +
    (tall ? 40 : 26);

  /* ── the hand on the drawing ── */

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
  const grab = (
    e: ReactPointerEvent<SVGElement>,
    what: string,
    move: (y: number) => Partial<Step>,
  ) => {
    if (e.button !== 0 || !writable) return;
    e.preventDefault();
    halt();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    setDragging(what);
    let last: Partial<Step> = {};
    const onMove = (ev: PointerEvent) => {
      const p = toSvg(ev.clientX, ev.clientY);
      if (!p) return;
      last = move(p.y);
      onPatch(last);
    };
    const onUp = () => {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      setDragging(null);
      if (Object.keys(last).length) onCommit(last);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  };
  const markTo = (i: number) => (y: number) => ({
    marks: step.marks.map((m, j) =>
      j === i ? { ...m, level: clamp(Math.round(vOf(y)), 0, 10) } : m,
    ),
  });

  /* ── the words on it ── */

  const pct = (x: number, y: number) => ({
    left: `${(x / W) * 100}%`,
    top: `${(y / H) * 100}%`,
  });
  const inFrame = (x: number) => x >= PL - 1 && x <= W - PR + 1;
  const last = step.marks.length - 1;
  const lifeFirst = sentencesOf(step.life)[0] ?? "";
  const horizonOff = markTs[last] > x1 * 1.001;
  const endLevel = step.marks[last]?.level ?? 0;
  const shown = new Set<number>();
  // With the life still out past the frame, its note holds the right-hand edge.
  let edge = horizonOff ? W - PR - (tall ? 360 : 270) : Infinity;
  for (let i = last; i >= 0; i--) {
    const x = xOf(markTs[i]);
    if (!inFrame(x) || x < nowX + 60) continue;
    if (edge - x < (i === last ? 0 : tall ? 190 : 130)) continue;
    shown.add(i);
    edge = x - (i === last ? (tall ? 330 : 250) : 0);
  }

  return (
    <div>
      <div
        ref={wrapRef}
        className={`ov-drawing relative${letting ? " ov-letting" : ""}${dragging ? " ov-dragging" : ""}`}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full"
          style={{ touchAction: "pan-y" }}
          role="img"
          aria-label={`The step as a dip below now, ${shape.hurt} of 10 at its worst for ${lastsWords(shape.lasts)}; the road with the step rising to ${endLevel} above now by ${horizonName(step.horizon)}; the road without it ${step.without === 0 ? "staying as it is now" : `${step.without > 0 ? "rising" : "falling"} to ${step.without}`}. Showing ${nextWords(span)}.`}
        >
          {/* as it is now, the whole way across */}
          <line
            x1={PL}
            x2={W - PR}
            y1={yOf(0)}
            y2={yOf(0)}
            stroke="var(--rule)"
            strokeWidth={1}
          />
          <line
            x1={nowX}
            x2={nowX}
            y1={PT - 18}
            y2={H - PB + 6}
            stroke="var(--rule)"
            strokeWidth={1}
          />
          {ticks.map((k) => (
            <g key={k.label}>
              <line
                x1={xOf(k.t)}
                x2={xOf(k.t)}
                y1={H - PB}
                y2={H - PB + 6}
                stroke="var(--faint)"
                strokeWidth={1}
              />
              <text
                x={xOf(k.t)}
                y={H - PB + 22}
                fontSize={tall ? 23 : 12}
                textAnchor="middle"
                style={mono}
                fill="var(--faint)"
              >
                {k.label}
              </text>
            </g>
          ))}
          <text
            x={nowX}
            y={H - PB + 22}
            fontSize={tall ? 23 : 12}
            textAnchor="middle"
            style={mono}
            fill="var(--muted)"
          >
            now
          </text>

          {/* the difference between the roads, and the dip */}
          <path
            d={gap}
            className="ov-life ov-gap"
            fill="var(--course-toward)"
          />
          <path d={hollow} className="ov-dip" fill="var(--alarm-amyg)" />
          {said && (
            <path
              d={said}
              fill="none"
              stroke="var(--alarm-amyg)"
              strokeWidth={1.4}
              strokeDasharray="4 4"
            />
          )}

          {/* the road without it, then the road with the step, inked */}
          <path
            d={line([[nowX, yOf(0)], ...withoutP])}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={1.5}
            strokeDasharray="5 6"
            strokeLinecap="round"
          />
          <path d={ink} fill="var(--pen)" className="ov-life-road" />
          <circle cx={nowX} cy={yOf(0)} r={4} fill="var(--ink)" />

          {/* the time the reader is in it */}
          {inIt && elapsed !== null && (
            <line
              x1={xOf(elapsed * MINUTE)}
              x2={xOf(elapsed * MINUTE)}
              y1={PT - 10}
              y2={H - PB}
              stroke="var(--accent)"
              strokeWidth={1.6}
            />
          )}

          {/* the dip's words sit in the empty water past it, on a leader from its worst */}
          <line
            x1={worst[0] + 4}
            y1={worst[1]}
            x2={dipLabelX - 6}
            y2={worst[1]}
            stroke="var(--muted)"
            strokeWidth={1}
          />

          {/* the marks along the road */}
          {step.marks.map((m, i) => {
            const x = xOf(markTs[i]);
            if (!inFrame(x)) return null;
            const y = yOf(roads.with(markTs[i]));
            const end = i === last;
            return (
              <g key={m.when} className="ov-life">
                <circle
                  cx={x}
                  cy={y}
                  r={end ? 6 : 4.5}
                  fill={end ? "var(--accent)" : "var(--surface)"}
                  stroke={end ? "var(--accent)" : "var(--ink)"}
                  strokeWidth={1.3}
                />
                {writable && mode !== "in-it" && (
                  <circle
                    cx={x}
                    cy={y}
                    r={tall ? 26 : 16}
                    fill="transparent"
                    style={{ cursor: "ns-resize" }}
                    onPointerDown={(e) => grab(e, `mark-${i}`, markTo(i))}
                    aria-label={`How far above now by ${m.when}`}
                  />
                )}
              </g>
            );
          })}
          {writable && (mode === "draft" || mode === "open") && dipW >= 18 && (
            <circle
              cx={worst[0]}
              cy={worst[1]}
              r={tall ? 30 : 18}
              fill="transparent"
              style={{ cursor: "ns-resize" }}
              onPointerDown={(e) =>
                grab(e, "hurt", (y) => ({
                  hurt: clamp(Math.round(-vOf(y)), 1, 10),
                }))
              }
              aria-label="How hard at its worst"
            />
          )}
          {writable && mode !== "in-it" && z > 0.97 && (
            <circle
              cx={xOf(step.horizon * YEAR)}
              cy={yOf(step.without)}
              r={tall ? 26 : 16}
              fill="transparent"
              style={{ cursor: "ns-resize" }}
              onPointerDown={(e) =>
                grab(e, "without", (y) => ({
                  without: clamp(Math.round(vOf(y)), -10, 10),
                }))
              }
              aria-label="Where the road without it is by then"
            />
          )}
        </svg>

        {/* the words, over the drawing, so they stay legible at any size */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div
            className="ov-caption absolute"
            style={{ left: `${(PL / W) * 100}%`, top: "3%" }}
          >
            <div className="hand ov-cap" style={{ color: "var(--ink)" }}>
              {inIt && elapsed !== null
                ? `in it · ${elapsed < 1 ? "just now" : `${lastsWords(elapsed)} in`}`
                : nextWords(span)}
            </div>
            <div className="hand ov-cap-sub" style={{ color: "var(--muted)" }}>
              {theDip(shape.lasts)} {shareWords(L, span)} of it
            </div>
          </div>

          <div
            className="ov-label absolute"
            style={{
              ...pct(dipLabelX, worst[1]),
              transform: "translate(0, -50%)",
            }}
          >
            <span className="hand ov-num-l" style={{ color: "var(--ink)" }}>
              {felt ? `was ${felt.hurt}` : `${shape.hurt} of 10`}
            </span>
            <span className="hand ov-sub" style={{ color: "var(--muted)" }}>
              {felt
                ? ` for ${lastsWords(felt.lasts)} · said ${step.hurt} for ${lastsWords(step.lasts)}`
                : ` for ${lastsWords(shape.lasts)}`}
            </span>
          </div>

          {step.marks.map((m, i) => {
            if (!shown.has(i)) return null;
            const t = markTs[i];
            const x = xOf(t);
            const y = yOf(roads.with(t));
            const end = i === last;
            return (
              <div
                key={m.when}
                className={`ov-label ov-life absolute${end ? " ov-end" : ""}`}
                style={{
                  ...pct(x, y),
                  transform: end
                    ? "translate(calc(-100% + 6px), calc(-100% - 12px))"
                    : "translate(-50%, calc(-100% - 10px))",
                  textAlign: end ? "right" : "center",
                }}
              >
                <div className="hand ov-sub" style={{ color: "var(--muted)" }}>
                  {m.when} · {m.level} above now
                </div>
                {end && step.who.trim() ? (
                  <div
                    className="display ov-who"
                    style={{ color: "var(--ink)" }}
                  >
                    {step.who.trim()}
                  </div>
                ) : m.line.trim() ? (
                  <div className="hand ov-line" style={{ color: "var(--ink)" }}>
                    {m.line.trim()}
                  </div>
                ) : end && lifeFirst ? (
                  <div className="hand ov-line" style={{ color: "var(--ink)" }}>
                    {lifeFirst}
                  </div>
                ) : null}
              </div>
            );
          })}

          {horizonOff && (
            <div
              className="ov-label ov-life ov-end absolute"
              style={{
                ...pct(W - PR, yOf(endLevel)),
                transform: "translate(-100%, calc(-100% - 12px))",
                textAlign: "right",
              }}
            >
              <div className="hand ov-sub" style={{ color: "var(--muted)" }}>
                {horizonName(step.horizon)} out · {endLevel} above now →
              </div>
              {(step.who.trim() || lifeFirst) && (
                <div
                  className={
                    step.who.trim() ? "display ov-who" : "hand ov-line"
                  }
                  style={{ color: "var(--ink)" }}
                >
                  {step.who.trim() || lifeFirst}
                </div>
              )}
            </div>
          )}

          <div
            className="ov-label absolute"
            style={{
              ...pct(W - PR, yOf(roads.without(x1))),
              transform: `translate(-100%, ${step.without < 0 && z > 0.6 ? "calc(-100% - 8px)" : "8px"})`,
              textAlign: "right",
            }}
          >
            <span className="hand ov-sub" style={{ color: "var(--muted)" }}>
              without it
              {z > 0.97 && step.without !== 0
                ? `, ${Math.abs(step.without)} ${step.without > 0 ? "above" : "below"} now`
                : ""}
              {step.withoutLine.trim() && z > 0.6
                ? ` · ${step.withoutLine.trim()}`
                : ""}
            </span>
          </div>
        </div>
      </div>

      {/* the altitude */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Chip onClick={() => fly(z < 0.98 ? 1 : 0)} accent={z < 0.98}>
          {z < 0.98 ? "pull back" : "come in close"}
        </Chip>
        <div
          ref={railRef}
          role="slider"
          tabIndex={0}
          aria-label="How far out"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(z * 100)}
          aria-valuetext={nextWords(span)}
          className="ov-rail relative h-11 min-w-[12rem] flex-1 cursor-pointer"
          style={{ touchAction: "none" }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            const el = e.currentTarget;
            halt();
            el.setPointerCapture(e.pointerId);
            const at = (cx: number) => {
              const r = el.getBoundingClientRect();
              let v = clamp((cx - r.left) / r.width, 0, 1);
              const near = stops.find((s) => Math.abs(s.z - v) < 0.022);
              if (near) v = near.z;
              setZ(v);
            };
            at(e.clientX);
            const onMove = (ev: PointerEvent) => at(ev.clientX);
            const onUp = () => {
              el.removeEventListener("pointermove", onMove);
              el.removeEventListener("pointerup", onUp);
              el.removeEventListener("pointercancel", onUp);
            };
            el.addEventListener("pointermove", onMove);
            el.addEventListener("pointerup", onUp);
            el.addEventListener("pointercancel", onUp);
          }}
          onKeyDown={(e) => {
            const next = stops.find((s) => s.z > z + 0.001);
            const prev = [...stops].reverse().find((s) => s.z < z - 0.001);
            const go: Record<string, () => void> = {
              ArrowRight: () => setZ(clamp(z + 0.03, 0, 1)),
              ArrowUp: () => setZ(clamp(z + 0.03, 0, 1)),
              ArrowLeft: () => setZ(clamp(z - 0.03, 0, 1)),
              ArrowDown: () => setZ(clamp(z - 0.03, 0, 1)),
              PageUp: () => next && fly(next.z),
              PageDown: () => prev && fly(prev.z),
              Home: () => fly(0),
              End: () => fly(1),
              " ": () => fly(z < 0.98 ? 1 : 0),
            };
            if (go[e.key]) {
              e.preventDefault();
              halt();
              go[e.key]();
            }
          }}
        >
          <div className="absolute inset-x-0 top-[2px] h-[10px]">
            <Sketch kind="underline" seed="ov-rail" color="var(--pen)" />
          </div>
          {stops.map((s) => (
            <span
              key={`t-${s.label}`}
              aria-hidden
              className="absolute top-[12px] h-[6px] w-px"
              style={{ left: `${s.z * 100}%`, background: "var(--faint)" }}
            />
          ))}
          {stops.map((s, i) =>
            showStop.has(i) ? (
              <span
                key={s.label}
                className="ov-stop absolute top-[22px]"
                style={{
                  left: `${s.z * 100}%`,
                  transform:
                    i === 0
                      ? "translateX(-2px)"
                      : i === stops.length - 1
                        ? "translateX(calc(-100% + 2px))"
                        : "translateX(-50%)",
                }}
              >
                <span
                  className="hand text-[15px] leading-none"
                  style={{
                    color:
                      Math.abs(s.z - z) < 0.03 ? "var(--accent)" : "var(--muted)",
                  }}
                >
                  {s.label}
                </span>
              </span>
            ) : null,
          )}
          <span
            aria-hidden
            className="ov-ring absolute top-[5px] h-[13px] w-[13px] rounded-full"
            style={{ left: `calc(${z * 100}% - 6.5px)` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── the view ──────────────────────────────────────────────────────────── */

/**
 * The overview: a step the reader keeps putting off, the dip it costs and
 * the life it opens, drawn to scale and pulled back. Take it, and say after
 * how it was; or hold to let it go for today.
 */
export default function Overview() {
  const [theme, setTheme] = useTheme();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [open, setOpen] = useState<Step | null>(null);
  const [kept, setKept] = useState(false);
  const [example, setExample] = useState(false);
  const [trouble, setTrouble] = useState<string | null>(null);
  const [sure, setSure] = useState(false);
  const [introKey, setIntroKey] = useState(0);
  const [letting, setLetting] = useState(false);
  const [letGo, setLetGo] = useState(false);
  const [unit, setUnit] = useState<Unit>("minutes");
  const [clock, setClock] = useState(() => Date.now());
  const openRef = useRef<Step | null>(null);
  const keptRef = useRef(false);
  const slugRef = useRef("");
  const saving = useRef<Promise<void>>(Promise.resolve());
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);
  openRef.current = open;
  keptRef.current = kept;
  const today = useMemo(localToday, []);
  const writable = payload?.writable ?? false;

  const fresh = useCallback((about?: Payload["about"], asExample = false) => {
    const day = localToday();
    const base = asExample
      ? { ...EXAMPLE_STEP, put: day, touched: day }
      : emptyStep(day);
    slugRef.current = "";
    setKept(false);
    setExample(asExample && !about);
    setOpen({
      ...base,
      step: about ? about.label : base.step,
      stone: about?.id ?? null,
    });
    setUnit(unitOf(base.lasts));
    setSure(false);
    setLetGo(false);
    setIntroKey((k) => k + 1);
  }, []);
  const load = useCallback((s: Step) => {
    slugRef.current = s.slug;
    setKept(true);
    setExample(false);
    setOpen(s);
    setUnit(unitOf(s.lasts));
    setSure(false);
    setLetGo(false);
    setTrouble(null);
    setIntroKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const slug = p.get("slug");
    const id = p.get("id");
    fetch(`/api/overview${id ? `?id=${encodeURIComponent(id)}` : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((pl: Payload | null) => {
        if (!pl) {
          setTrouble("the steps could not be read");
          return;
        }
        setPayload(pl);
        const wanted = slug ? pl.steps.find((x) => x.slug === slug) : null;
        const going = pl.steps.find((s) => statusOf(s) !== "taken");
        if (wanted) load(wanted);
        else if (pl.about) fresh(pl.about);
        else if (going) load(going);
        else fresh(undefined, pl.steps.length === 0);
      })
      .catch(() => setTrouble("the steps could not be read"));
  }, [fresh, load]);

  // Only once the steps are read: in development React mounts twice, and a sync on the
  // first mount would take the slug off the address before the second could read it.
  const loaded = payload !== null;
  useEffect(() => {
    if (!loaded) return;
    const url = new URL(window.location.href);
    if (kept && open?.slug) url.searchParams.set("slug", open.slug);
    else url.searchParams.delete("slug");
    url.searchParams.delete("id");
    window.history.replaceState(null, "", url);
    putOnDesk(
      kept && open
        ? { kind: "overview", id: open.slug, label: titleOf(open) }
        : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, kept, open?.slug]);
  useEffect(() => () => putOnDesk(null), []);

  const inIt = open ? statusOf(open) === "in-it" : false;
  useEffect(() => {
    if (!inIt) return;
    setClock(Date.now());
    const t = window.setInterval(() => setClock(Date.now()), 5000);
    return () => window.clearInterval(t);
  }, [inIt]);

  /* ── keeping ─────────────────────────────────────────────────────────── */

  const save = useCallback(
    (s: Step) =>
      new Promise<Step | null>((resolve) => {
        saving.current = saving.current.then(async () => {
          const isFresh = !slugRef.current;
          try {
            const r = await fetch("/api/overview", {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                step: { ...s, slug: slugRef.current || "" },
                fresh: isFresh,
              }),
            });
            const out = (await r.json().catch(() => null)) as
              Step | { error: string } | null;
            if (!r.ok || !out || "error" in out) {
              setTrouble(
                out && "error" in out ? out.error : `not kept (${r.status})`,
              );
              resolve(null);
              return;
            }
            slugRef.current = out.slug;
            setKept(true);
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
                    steps: p.steps.some((x) => x.slug === out.slug)
                      ? p.steps.map((x) => (x.slug === out.slug ? out : x))
                      : [out, ...p.steps],
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

  const patch = useCallback((p: Partial<Step>) => {
    setOpen((cur) => (cur ? { ...cur, ...p } : cur));
  }, []);
  /** Change and, if the step is already kept, keep the change. */
  const set = useCallback(
    (p: Partial<Step>) => {
      const s = openRef.current;
      if (!s) return;
      const next = { ...s, ...p };
      setOpen(next);
      if (keptRef.current && writable) void save(next);
    },
    [save, writable],
  );
  const commit = useCallback(() => {
    const s = openRef.current;
    if (s && keptRef.current && writable && s.step.trim()) void save(s);
  }, [save, writable]);

  const needsStep = () => {
    const s = openRef.current;
    if (!s || !writable) return null;
    if (!s.step.trim()) {
      setTrouble("write the step, in a line");
      return null;
    }
    return s;
  };
  const keep = () => {
    const s = needsStep();
    if (s) {
      setExample(false);
      void save(s);
    }
  };
  const take = () => {
    const s = needsStep();
    if (!s) return;
    const next = {
      ...s,
      took: nowIso(),
      done: null,
      felt: null,
      feltLasts: null,
    };
    setExample(false);
    setLetGo(false);
    setOpen(next);
    void save(next);
  };
  const over = () => {
    const s = openRef.current;
    if (!s?.took || !writable) return;
    const done = nowIso();
    const next = {
      ...s,
      done,
      feltLasts: Math.max(1, minutesBetween(s.took, done) ?? 1),
    };
    setOpen(next);
    void save(next);
  };
  const stopClock = () => {
    const s = openRef.current;
    if (!s || !writable) return;
    const next = { ...s, took: null, done: null, felt: null, feltLasts: null };
    setOpen(next);
    void save(next);
  };

  // Letting it go for today is a hold, not a press: the life fades while the reader holds.
  const letItGo = useCallback(() => {
    held.current = true;
    holdTimer.current = null;
    const s = openRef.current;
    if (!s) return;
    const on = localToday();
    const why = s.notToday.find((x) => x.on === on)?.why ?? "";
    const next = {
      ...s,
      notToday: [...s.notToday.filter((x) => x.on !== on), { on, why }],
    };
    setExample(false);
    setOpen(next);
    void save(next);
    setLetGo(true);
    window.setTimeout(() => {
      setLetting(false);
      held.current = false;
    }, 1500);
  }, [save]);
  const startHold = () => {
    if (holdTimer.current !== null || held.current) return;
    if (!needsStep()) return;
    setLetting(true);
    holdTimer.current = window.setTimeout(letItGo, HOLD_MS);
  };
  const cancelHold = () => {
    if (held.current) return;
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setLetting(false);
  };
  useEffect(
    () => () => {
      if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    },
    [],
  );

  const remove = useCallback(async () => {
    const s = openRef.current;
    if (!s || !writable || !keptRef.current) return;
    const r = await fetch(`/api/overview?slug=${encodeURIComponent(s.slug)}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      setTrouble(`not taken off (${r.status})`);
      return;
    }
    setPayload((p) =>
      p ? { ...p, steps: p.steps.filter((x) => x.slug !== s.slug) } : p,
    );
    fresh();
  }, [writable, fresh]);

  /* ── derived ─────────────────────────────────────────────────────────── */

  const steps = payload?.steps ?? [];
  const status = open ? statusOf(open) : "open";
  const mode: Mode =
    status === "in-it"
      ? "in-it"
      : status === "taken"
        ? "taken"
        : kept
          ? "open"
          : "draft";
  const elapsed =
    open?.took && status === "in-it"
      ? Math.max(0, (clock - Date.parse(open.took)) / 60000)
      : null;
  const words = useMemo(
    () =>
      open && open.step.trim()
        ? readings({ ...open, put: open.put || today })
        : [],
    [open, today],
  );
  const whole = useMemo(() => wholeReadings(tally(steps)), [steps]);
  const letToday = open?.notToday.find((x) => x.on === today) ?? null;

  const lastsIn = open ? open.lasts / UNIT_MIN[unit] : 0;

  return (
    <main className="overview scroll-thin relative h-dvh w-full overflow-y-auto">
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
                overview
              </div>
              <p
                className="hand mt-1 max-w-[27rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                A step you keep putting off, drawn to scale against the life it
                opens. Up close it is all there is. Pull back.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/overview" />
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
            className="panel sketched rise relative min-w-0 p-5 sm:p-7"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The overview"
          >
            <Sketch seed={`overview-${open?.slug || "fresh"}`} draw />
            {!open ? (
              <p className="meta" style={{ color: "var(--faint)" }}>
                {trouble ?? "reading…"}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    {!kept
                      ? example
                        ? "an example · write your own step over it"
                        : "a step · not put down yet"
                      : status === "taken"
                        ? `taken · ${dayWords(open.took ?? open.put)}`
                        : status === "in-it"
                          ? `in it · since ${open.took?.slice(11, 16)}`
                          : `a step · put down ${dayWords(open.put)}`}
                    {open.stone && (
                      <>
                        {" · about "}
                        <Link
                          href={`/catalogue?id=${encodeURIComponent(open.stone)}`}
                          className="ov-link"
                          style={{ color: "var(--ink)", textTransform: "none" }}
                        >
                          the stone
                        </Link>
                      </>
                    )}
                  </div>
                  {kept && (
                    <div className="flex flex-wrap gap-1.5">
                      <Chip onClick={() => fresh()}>a new step</Chip>
                    </div>
                  )}
                </div>

                <textarea
                  value={open.step}
                  onChange={(e) => {
                    setExample(false);
                    patch({ step: e.target.value });
                  }}
                  onBlur={commit}
                  readOnly={!writable}
                  rows={2}
                  placeholder="the step you keep putting off — in a line"
                  aria-label="The step"
                  className="display ov-case scroll-thin mt-1 w-full resize-none bg-transparent px-0 py-1 text-[24px] leading-[1.18] sm:text-[31px]"
                  style={{ color: "var(--ink)" }}
                />

                <div className="mt-4">
                  <Scope
                    step={open}
                    mode={mode}
                    writable={writable}
                    letting={letting}
                    elapsed={elapsed}
                    introKey={introKey}
                    onPatch={patch}
                    onCommit={set}
                  />
                </div>
                <p
                  className="hand mt-1 text-[14.5px]"
                  style={{ color: "var(--faint)" }}
                >
                  drawn to scale at every distance · drag the bottom of the dip
                  and the marks on the road · space pulls back and comes in · ⌘
                  and scroll on the drawing to go by hand
                </p>

                {/* ── the numbers, typed ─────────────────────────────────── */}
                <div
                  className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-2"
                  style={{ borderTop: "1px solid var(--rule)", paddingTop: 12 }}
                >
                  <span className="inline-flex items-baseline gap-1.5">
                    <span className="meta" style={{ color: "var(--faint)" }}>
                      at its worst
                    </span>
                    <Num
                      value={open.hurt}
                      min={1}
                      max={10}
                      writable={writable && status !== "taken"}
                      label="How hard at its worst, 1 to 10"
                      onCommit={(hurt) => set({ hurt })}
                    />
                    <span
                      className="hand text-[19px]"
                      style={{ color: "var(--muted)" }}
                    >
                      of 10
                    </span>
                  </span>
                  <span className="inline-flex items-baseline gap-1.5">
                    <span className="meta" style={{ color: "var(--faint)" }}>
                      for
                    </span>
                    <Num
                      value={
                        Number.isInteger(lastsIn)
                          ? lastsIn
                          : Math.round(lastsIn * 10) / 10
                      }
                      min={1}
                      max={Math.floor((60 * 1440) / UNIT_MIN[unit])}
                      writable={writable && status !== "taken"}
                      label={`How long it will last, in ${unit}`}
                      onCommit={(v) => set({ lasts: v * UNIT_MIN[unit] })}
                    />
                    <select
                      value={unit}
                      onChange={(e) => {
                        const next = e.target.value as Unit;
                        setUnit(next);
                        set({
                          lasts: clamp(
                            Math.round(lastsIn) * UNIT_MIN[next],
                            1,
                            60 * 1440,
                          ),
                        });
                      }}
                      disabled={!writable || status === "taken"}
                      aria-label="Minutes, hours or days"
                      className="ov-select hand text-[19px]"
                      style={{ color: "var(--muted)" }}
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </span>
                  <span className="inline-flex items-baseline gap-1.5">
                    <span className="meta" style={{ color: "var(--faint)" }}>
                      the life, set
                    </span>
                    <select
                      value={open.horizon}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        set({
                          horizon: next,
                          marks: remark(open.marks, open.horizon, next),
                        });
                      }}
                      disabled={!writable}
                      aria-label="How far out the life is set"
                      className="ov-select hand text-[21px]"
                      style={{ color: "var(--ink)" }}
                    >
                      {HORIZONS.map((h) => (
                        <option key={h} value={h}>
                          {horizonName(h)}
                        </option>
                      ))}
                    </select>
                    <span
                      className="hand text-[19px]"
                      style={{ color: "var(--muted)" }}
                    >
                      out
                    </span>
                  </span>
                  <span className="inline-flex items-baseline gap-1.5">
                    <span className="meta" style={{ color: "var(--faint)" }}>
                      without it, by then
                    </span>
                    <Num
                      value={open.without}
                      min={-10}
                      max={10}
                      writable={writable}
                      label="Where the road without it is by then, -10 to 10; 0 is as it is now"
                      onCommit={(without) => set({ without })}
                    />
                    <span
                      className="hand text-[19px]"
                      style={{ color: "var(--muted)" }}
                    >
                      {open.without === 0
                        ? "— as it is now"
                        : open.without > 0
                          ? "above now"
                          : "below now"}
                    </span>
                  </span>
                </div>

                {/* ── the life ─────────────────────────────────────────── */}
                <div className="mt-6 grid gap-x-8 gap-y-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
                  <div className="min-w-0">
                    <div className="meta" style={{ color: "var(--accent)" }}>
                      the life, if you take it and it goes as you hope
                    </div>
                    <textarea
                      value={open.life}
                      onChange={(e) => patch({ life: e.target.value })}
                      onBlur={commit}
                      readOnly={!writable}
                      rows={5}
                      placeholder="as it is, in the first person — where you are, what a morning is like, who is there"
                      aria-label="The life"
                      className="display ov-case scroll-thin mt-1 w-full resize-none bg-transparent px-0 py-1 text-[19px] leading-[1.38]"
                      style={{ color: "var(--ink)" }}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="meta" style={{ color: "var(--accent)" }}>
                      who you are on that road
                    </div>
                    <input
                      value={open.who}
                      onChange={(e) => patch({ who: e.target.value })}
                      onBlur={commit}
                      readOnly={!writable}
                      placeholder="I am someone who …"
                      aria-label="Who you are on that road"
                      className="ov-case hand mt-1 w-full bg-transparent text-[22px] leading-[1.25]"
                      style={{ color: "var(--ink)" }}
                    />
                    <div
                      className="meta mt-5"
                      style={{ color: "var(--faint)" }}
                    >
                      along the way
                    </div>
                    <ol className="mt-1 flex flex-col gap-1">
                      {open.marks.map((m, i) => (
                        <li key={m.when} className="flex items-baseline gap-2">
                          <span
                            className="hand w-[6.2rem] shrink-0 text-[16px]"
                            style={{ color: "var(--muted)" }}
                          >
                            {m.when}
                          </span>
                          <Num
                            value={m.level}
                            min={0}
                            max={10}
                            size={19}
                            writable={writable}
                            label={`How far above now by ${m.when}, 0 to 10`}
                            onCommit={(level) =>
                              set({
                                marks: open.marks.map((x, j) =>
                                  j === i ? { ...x, level } : x,
                                ),
                              })
                            }
                          />
                          <input
                            value={m.line}
                            onChange={(e) =>
                              patch({
                                marks: open.marks.map((x, j) =>
                                  j === i ? { ...x, line: e.target.value } : x,
                                ),
                              })
                            }
                            onBlur={commit}
                            readOnly={!writable}
                            placeholder={
                              i === open.marks.length - 1
                                ? "what is true by then"
                                : "what is true by then — if you know"
                            }
                            aria-label={`What is true by ${m.when}`}
                            className="ov-case hand min-w-0 flex-1 bg-transparent text-[17px]"
                            style={{ color: "var(--ink)" }}
                          />
                        </li>
                      ))}
                    </ol>
                    <div
                      className="meta mt-5"
                      style={{ color: "var(--faint)" }}
                    >
                      without it
                    </div>
                    <input
                      value={open.withoutLine}
                      onChange={(e) => patch({ withoutLine: e.target.value })}
                      onBlur={commit}
                      readOnly={!writable}
                      placeholder="as it is now — or say how it goes"
                      aria-label="The road without it"
                      className="ov-case hand mt-1 w-full bg-transparent text-[17px]"
                      style={{ color: "var(--ink)" }}
                    />
                  </div>
                </div>

                {/* ── the choice ───────────────────────────────────────── */}
                <div
                  className="mt-7"
                  style={{ borderTop: "1px solid var(--rule)", paddingTop: 14 }}
                >
                  {status === "open" && (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip onClick={take} disabled={!writable} accent>
                          {writable
                            ? "take the step"
                            : "a deployed garden keeps no steps"}
                        </Chip>
                        <button
                          className={`${chip} ov-hold relative`}
                          style={{
                            ...mono,
                            color: letting ? "var(--ink)" : "var(--muted)",
                          }}
                          disabled={!writable}
                          onPointerDown={(e) => {
                            if (e.button === 0) startHold();
                          }}
                          onPointerUp={cancelHold}
                          onPointerLeave={cancelHold}
                          onPointerCancel={cancelHold}
                          onContextMenu={(e) => e.preventDefault()}
                          onKeyDown={(e) => {
                            if (
                              (e.key === " " || e.key === "Enter") &&
                              !e.repeat
                            ) {
                              e.preventDefault();
                              startHold();
                            }
                          }}
                          onKeyUp={(e) => {
                            if (e.key === " " || e.key === "Enter")
                              cancelHold();
                          }}
                          aria-label="Not today — hold to let it go for today"
                        >
                          not today — hold
                          {letting && (
                            <svg
                              aria-hidden
                              className="pointer-events-none absolute inset-x-2 bottom-[3px] h-[3px] w-[calc(100%-1rem)] overflow-visible"
                              viewBox="0 0 100 3"
                              preserveAspectRatio="none"
                            >
                              <line
                                x1={0}
                                x2={100}
                                y1={1.5}
                                y2={1.5}
                                pathLength={1}
                                stroke="var(--accent)"
                                strokeWidth={1.6}
                                vectorEffect="non-scaling-stroke"
                                className="ov-hold-line"
                              />
                            </svg>
                          )}
                        </button>
                        {!kept && (
                          <Chip onClick={keep} disabled={!writable}>
                            put it down
                          </Chip>
                        )}
                      </div>
                      <p
                        className="hand mt-2 text-[14.5px]"
                        style={{ color: "var(--faint)" }}
                      >
                        {letting
                          ? "holding — the life goes while you hold. let go and it stays."
                          : "take it and the clock runs until you say it is over. not today is a hold: you watch what you are letting go of."}
                      </p>
                      {(letGo || letToday) && (
                        <div className="ov-arrive mt-3">
                          <div
                            className="meta"
                            style={{ color: "var(--accent)" }}
                          >
                            let go for today · what stood in the way?
                          </div>
                          <input
                            value={letToday?.why ?? ""}
                            onChange={(e) =>
                              patch({
                                notToday: open.notToday.map((x) =>
                                  x.on === today
                                    ? { ...x, why: e.target.value }
                                    : x,
                                ),
                              })
                            }
                            onBlur={commit}
                            readOnly={!writable}
                            placeholder="in a line — it will be here tomorrow"
                            aria-label="What stood in the way today"
                            className="ov-case hand mt-1 w-full bg-transparent text-[19px]"
                            style={{ color: "var(--ink)" }}
                          />
                        </div>
                      )}
                    </>
                  )}

                  {status === "in-it" && (
                    <div className="ov-arrive">
                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                        <span
                          className="display text-[26px]"
                          style={{ color: "var(--ink)" }}
                        >
                          {elapsed === null || elapsed < 1
                            ? "in it, just now"
                            : `in it, ${lastsWords(elapsed)}`}
                        </span>
                        <span
                          className="hand text-[17px]"
                          style={{ color: "var(--muted)" }}
                        >
                          you said {open.hurt} of 10 for{" "}
                          {lastsWords(open.lasts)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Chip onClick={over} disabled={!writable} accent>
                          it is over
                        </Chip>
                        <Chip onClick={stopClock} disabled={!writable}>
                          not yet — stop the clock
                        </Chip>
                      </div>
                      <p
                        className="hand mt-2 text-[14.5px]"
                        style={{ color: "var(--faint)" }}
                      >
                        the clock is kept with the step; close this and come
                        back to say it is over
                      </p>
                    </div>
                  )}

                  {status === "taken" && (
                    <div className="ov-arrive">
                      <div className="meta" style={{ color: "var(--accent)" }}>
                        afterwards · said before beside how it was
                      </div>
                      <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-2">
                        <span className="inline-flex items-baseline gap-1.5">
                          <span
                            className="meta"
                            style={{ color: "var(--faint)" }}
                          >
                            at its worst it was
                          </span>
                          <Num
                            value={open.felt}
                            min={1}
                            max={10}
                            writable={writable}
                            placeholder="?"
                            label="How hard it was at its worst, 1 to 10"
                            onCommit={(felt) => set({ felt })}
                          />
                          <span
                            className="hand text-[19px]"
                            style={{ color: "var(--muted)" }}
                          >
                            of 10 · you said {open.hurt}
                          </span>
                        </span>
                        <span className="inline-flex items-baseline gap-1.5">
                          <span
                            className="meta"
                            style={{ color: "var(--faint)" }}
                          >
                            it lasted
                          </span>
                          <Num
                            value={open.feltLasts}
                            min={1}
                            max={60 * 1440}
                            writable={writable}
                            label="How long it lasted, in minutes"
                            onCommit={(feltLasts) => set({ feltLasts })}
                          />
                          <span
                            className="hand text-[19px]"
                            style={{ color: "var(--muted)" }}
                          >
                            {open.feltLasts === 1 ? "minute" : "minutes"} · you said{" "}
                            {lastsWords(open.lasts)}
                          </span>
                        </span>
                      </div>
                      <input
                        value={open.after}
                        onChange={(e) => patch({ after: e.target.value })}
                        onBlur={commit}
                        readOnly={!writable}
                        placeholder="afterwards, in a line — what it was like"
                        aria-label="Afterwards"
                        className="ov-case hand mt-3 w-full bg-transparent text-[19px]"
                        style={{ color: "var(--ink)" }}
                      />
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Chip onClick={() => fresh()}>a new step</Chip>
                      </div>
                    </div>
                  )}

                  {kept && writable && (
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      <Chip
                        onClick={() => (sure ? void remove() : setSure(true))}
                        accent={sure}
                      >
                        {sure
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
                </div>
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
              <Sketch seed="overview-reading" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                the reading
              </div>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                {!payload
                  ? "reading…"
                  : words.length
                    ? words.join(" · ")
                    : "write the step, and the reading begins"}
              </p>
            </section>

            <section
              className="panel sketched rise relative p-4"
              style={{ borderRadius: 3, animationDelay: "140ms" }}
              aria-label="The record"
            >
              <Sketch seed="overview-record" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                the record
              </div>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                {payload ? whole.join(" · ") : "reading…"}
              </p>
              {steps.length > 0 && (
                <ol className="mt-2 flex flex-col">
                  {steps.slice(0, 24).map((s, i) => {
                    const on = kept && open?.slug === s.slug;
                    const st = statusOf(s);
                    return (
                      <li
                        key={s.slug}
                        className="ov-row"
                        style={{ ["--i" as string]: i }}
                      >
                        <button
                          onClick={() => load(s)}
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
                            {st === "taken"
                              ? `taken ${dayWords(s.took ?? s.put)}`
                              : st === "in-it"
                                ? "in it"
                                : `open since ${dayWords(s.put)}`}
                            {s.notToday.length
                              ? ` · not today ×${s.notToday.length}`
                              : ""}
                          </span>
                          <span
                            className="display text-[15.5px] leading-[1.25]"
                            style={{ color: "var(--ink)" }}
                          >
                            {titleOf(s)}
                          </span>
                          {st === "taken" && s.felt !== null && (
                            <span
                              className="hand text-[15px]"
                              style={{ color: "var(--muted)" }}
                            >
                              said {s.hurt} for {lastsWords(s.lasts)} · was{" "}
                              {s.felt}
                              {s.feltLasts !== null
                                ? ` for ${lastsWords(s.feltLasts)}`
                                : ""}
                            </span>
                          )}
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
              aria-label="What the overview holds to"
            >
              <Sketch seed="overview-laws" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                what the overview holds to
              </div>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                Every number on it is yours: how hard, how long, how far out,
                how the road rises. The drawing is to scale at every distance,
                so pulling back makes the dip small only by as much as it is
                short; its depth stays what you said. The dip is always drawn
                beside the life, never the life alone. Not today is allowed and
                kept as a day, never as a verdict; it is a hold because you
                asked for friction, and the life fades while you hold because
                that is what is being let go. After a step is taken, what you
                said before stands beside what it was. Nothing here says you
                should.
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

            <section
              className="panel sketched rise relative p-4"
              style={{ borderRadius: 3, animationDelay: "220ms" }}
              aria-label="Where it comes from"
            >
              <Sketch seed="overview-sources" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                where it comes from
              </div>
              <ul
                className="mt-2 flex flex-col gap-2 text-[12.5px] leading-[1.5]"
                style={{ color: "var(--muted)" }}
              >
                <li>
                  <span style={{ color: "var(--ink)" }}>
                    The overview effect
                  </span>{" "}
                  — Frank White&apos;s name for what astronauts report seeing
                  the Earth whole: what filled the view becomes a small part of
                  something larger.
                </li>
                <li>
                  <span style={{ color: "var(--ink)" }}>
                    Distance and self-control
                  </span>{" "}
                  — seen from farther off, an act is held for why rather than
                  how, and later, larger goods win more often (Fujita, Trope,
                  Liberman &amp; Levin-Sagi 2006).
                </li>
                <li>
                  <span style={{ color: "var(--ink)" }}>The future self</span> —
                  a future self felt as the same person makes costs borne for
                  them easier now (Hershfield 2011).
                </li>
                <li>
                  <span style={{ color: "var(--ink)" }}>
                    The dip beside the life
                  </span>{" "}
                  — the outcome imagined alone drains the effort it should
                  summon; set against what stands in the way, it summons it
                  (Oettingen; Kappes &amp; Oettingen 2011).
                </li>
                <li>
                  <span style={{ color: "var(--ink)" }}>Before and after</span>{" "}
                  — bad feelings are forecast stronger and longer than they turn
                  out (Wilson &amp; Gilbert 2005); the record keeps both.
                </li>
              </ul>
              <p
                className="mt-3 text-[12.5px] leading-[1.5]"
                style={{ color: "var(--muted)" }}
              >
                Losses weigh more than gains of the same size (Kahneman &amp;
                Tversky 1979), which is why the difference between the roads is
                drawn. Shame is left out on purpose: it turns people away from
                what they are ashamed of, where guilt about an act turns them
                toward repair (Tangney &amp; Dearing 2002).
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
