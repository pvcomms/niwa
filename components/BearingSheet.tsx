"use client";

import {
  useMemo,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import {
  FRAME,
  expression,
  regionName,
  slotsAt,
  type Bearing as Decision,
  type Layout,
  type Pt,
  type ValuesConfig,
} from "@/lib/bearing";
import { rand, ribbon, roughEllipse, seedOf, stroke } from "@/lib/hand";

export type Props = {
  layout: Layout;
  config: ValuesConfig;
  bearings: Decision[];
  selected: string | null;
  /** A decision the desk's list is hovering. */
  hoverSlug: string | null;
  /** Circles lit: the ones under the pointer, else the held region. */
  lit: number[];
  pointer: Pt | null;
  /** The decision being dragged, if one is. */
  dragging: string | null;
  /** A stone about to be set down where the reader double-clicked. */
  pendingAt: Pt | null;
  editing: boolean;
  reduce: boolean;
  motes: string[];
  svgRef: RefObject<SVGSVGElement | null>;
  moteEls: RefObject<(SVGCircleElement | null)[]>;
  moteTxt: RefObject<(SVGTextElement | null)[]>;
  onMove: (e: ReactPointerEvent) => void;
  onUp: (e: ReactPointerEvent) => void;
  onLeave: () => void;
  onClick: (e: ReactMouseEvent) => void;
  onDoubleClick: (e: ReactMouseEvent) => void;
  beginDrag: (e: ReactPointerEvent, slug: string, part: "at" | "leads") => void;
};

const short = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n)}…` : s;

const shortDay = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/** A small ring in the hand, for the chosen stone. */
const chosenRing = (slug: string) =>
  ribbon(
    roughEllipse(24, 24, seedOf(slug), { wobble: 1.1, pad: 0, steps: 12 }),
    1.5,
    seedOf(slug),
  );

/**
 * The sheet itself: the values as rings in the hand, the flood under the
 * pointer, the lenses, the names, the motes, every decision as a stone with
 * its heading and its trail, and the cursor's reading. Pure of state — the
 * desk owns it and hands it down.
 */
export default function BearingSheet({
  layout,
  config,
  bearings,
  selected,
  hoverSlug,
  lit,
  pointer,
  dragging,
  pendingAt,
  editing,
  reduce,
  motes,
  svgRef,
  moteEls,
  moteTxt,
  onMove,
  onUp,
  onLeave,
  onClick,
  onDoubleClick,
  beginDrag,
}: Props) {
  const values = config.values;
  const hue = (i: number) => `var(--value-${values[i]?.hue ?? i})`;

  const rings = useMemo(
    () =>
      layout.slots.map((s, i) => {
        const seed = seedOf(`ring-${i}-${s.cx}`);
        const line = roughEllipse(s.r * 2, s.r * 2, seed, {
          wobble: 2.6,
          pad: 0,
          steps: 24,
        });
        return {
          line,
          rest: ribbon(line, 2.2, seed),
          lit: ribbon(line, 3.6, seed + 1),
        };
      }),
    [layout],
  );

  const placed = bearings.filter((b) => b.at);
  const unplaced = bearings.filter((b) => !b.at);
  const cursorIds = pointer ? slotsAt(layout, pointer) : null;
  const cursorRegion = cursorIds ? regionName(cursorIds, config) : null;
  const quiet = (slug: string) =>
    (selected !== null && selected !== slug) ||
    (hoverSlug !== null && hoverSlug !== slug);

  const stone = (b: Decision, x: number, y: number, side: "right" | "left") => {
    const isSel = b.slug === selected;
    const isHot = isSel || hoverSlug === b.slug || dragging === b.slug;
    const ids = b.at ? slotsAt(layout, b.at) : null;
    return (
      <g
        key={b.slug}
        className="b-stone"
        transform={`translate(${x} ${y})`}
        opacity={quiet(b.slug) && !isHot ? 0.4 : 1}
      >
        <g className={reduce ? undefined : "b-set"}>
          {isSel && (
            <circle
              r={11}
              fill="var(--accent)"
              opacity={0.18}
              filter="url(#b-bloom)"
            />
          )}
          {isSel && (
            <path
              transform="translate(-12 -12)"
              d={chosenRing(b.slug)}
              fill="var(--pen)"
            />
          )}
          <circle r={6.4} fill="var(--accent)" fillOpacity={b.at ? 1 : 0.85} />
          <text
            className="b-hand"
            x={side === "right" ? 15 : -15}
            y={5}
            textAnchor={side === "right" ? "start" : "end"}
            fontSize={15}
            fill={isHot ? "var(--ink)" : "var(--muted)"}
          >
            {short(b.title, 34)}
          </text>
          {isHot && ids && (
            <text
              className="b-mono"
              x={side === "right" ? 15 : -15}
              y={18}
              textAnchor={side === "right" ? "start" : "end"}
              fontSize={9}
              letterSpacing={1.2}
              fill="var(--accent)"
            >
              {ids.length
                ? `d ∈ ${expression(ids, values)}`
                : "outside every value"}
            </text>
          )}
        </g>
        <circle
          className="b-handle"
          r={15}
          fill="transparent"
          onPointerDown={(e) => beginDrag(e, b.slug, "at")}
        />
      </g>
    );
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${FRAME.w} ${FRAME.h}`}
      preserveAspectRatio="xMidYMid meet"
      className="bearing-sheet block w-full select-none"
      style={{ aspectRatio: "900 / 640", touchAction: "none" }}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={onLeave}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      role="img"
      aria-label={`${values.map((v) => v.name).join(", ")} drawn as overlapping circles, with ${placed.length} decisions placed`}
    >
      <defs>
        <filter id="b-bloom" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        {layout.slots.map((s, i) => (
          <clipPath key={i} id={`b-clip-${i}`}>
            <circle cx={s.cx} cy={s.cy} r={s.r} />
          </clipPath>
        ))}
        {!reduce &&
          rings.map((r, i) => (
            <mask
              key={i}
              id={`b-draw-${i}`}
              maskUnits="userSpaceOnUse"
              x={-20}
              y={-20}
              width={layout.slots[i].r * 2 + 40}
              height={layout.slots[i].r * 2 + 40}
            >
              <path
                d={r.line}
                pathLength={1}
                fill="none"
                stroke="#fff"
                strokeWidth={14}
                strokeLinecap="round"
                className="draw"
                style={{ ["--i" as string]: i }}
              />
            </mask>
          ))}
      </defs>

      {/* the flood: each value's ground, tinted when lit */}
      {layout.slots.map((s, i) => (
        <circle
          key={`t${i}`}
          className="b-tint"
          cx={s.cx}
          cy={s.cy}
          r={s.r}
          fill={hue(i)}
          fillOpacity={lit.includes(i) ? 0.075 : 0.014}
        />
      ))}

      {/* the lenses: a real two-set region, shaded when lit */}
      {layout.pairs.map((p) => {
        const [a, b] = p.ids;
        const both = lit.includes(a) && lit.includes(b) && lit.length === 2;
        const one = lit.length === 1 && (lit[0] === a || lit[0] === b);
        return (
          <g key={`l${a}${b}`} clipPath={`url(#b-clip-${a})`}>
            <circle
              className="b-lens"
              cx={layout.slots[b].cx}
              cy={layout.slots[b].cy}
              r={layout.slots[b].r}
              fill={hue(one && lit[0] === b ? b : a)}
              fillOpacity={both ? 0.12 : one ? 0.05 : 0}
            />
          </g>
        );
      })}

      {/* the rings, in the hand */}
      {layout.slots.map((s, i) => {
        const on = lit.includes(i);
        const dim = lit.length > 0 && !on;
        return (
          <g
            key={`r${i}`}
            className="b-ring"
            transform={`translate(${s.cx - s.r} ${s.cy - s.r})`}
            mask={reduce ? undefined : `url(#b-draw-${i})`}
          >
            <path
              d={rings[i].lit}
              fill={hue(i)}
              filter="url(#b-bloom)"
              opacity={on ? 0.55 : 0}
            />
            <path d={rings[i].rest} fill={hue(i)} opacity={dim ? 0.16 : 0.8} />
            <path d={rings[i].lit} fill={hue(i)} opacity={on ? 1 : 0} />
          </g>
        );
      })}

      {/* the names of the values */}
      {layout.slots.map((s, i) => {
        const on = lit.includes(i);
        const dim = lit.length > 0 && !on;
        return (
          <text
            key={`n${i}`}
            className="b-mono b-label"
            x={s.lx}
            y={s.ly}
            textAnchor={s.anchor}
            fontSize={14}
            letterSpacing={2}
            fill={hue(i)}
            opacity={dim ? 0.3 : 1}
            style={{ textTransform: "uppercase" }}
          >
            {values[i]?.name || "—"}
          </text>
        );
      })}

      {/* the named regions — and, while editing, the ones still waiting for a name */}
      {layout.pairs.map((p) => {
        const [a, b] = p.ids;
        const r = regionName([a, b], config);
        if (!r && !editing) return null;
        const both = lit.includes(a) && lit.includes(b) && lit.length === 2;
        const one = lit.length === 1 && (lit[0] === a || lit[0] === b);
        const op = both ? 1 : one ? 0.9 : lit.length ? 0.18 : 0.62;
        return (
          <g key={`p${a}${b}`} className="b-label" opacity={op}>
            <text
              className="b-hand"
              x={p.ax}
              y={p.ay}
              textAnchor="middle"
              fontSize={r ? 18.5 : 14}
              fill={r ? "var(--ink)" : "var(--faint)"}
            >
              {r ? r.name : "name it"}
            </text>
            <text
              className="b-mono"
              x={p.ax}
              y={p.ay + 13}
              textAnchor="middle"
              fontSize={9}
              letterSpacing={1.4}
              fill="var(--faint)"
            >
              {expression([a, b], values)}
            </text>
          </g>
        );
      })}
      {layout.triple &&
        (() => {
          const r = regionName(layout.triple.ids, config);
          if (!r && !editing) return null;
          const all = layout.triple.ids.every((i) => lit.includes(i));
          return (
            <text
              className="b-hand b-label"
              x={layout.triple.mx}
              y={layout.triple.my}
              textAnchor="middle"
              fontSize={r ? 13.5 : 12}
              fill={r ? "var(--muted)" : "var(--faint)"}
              opacity={all ? 1 : lit.length ? 0.2 : 0.7}
            >
              {r ? r.name : "name it"}
            </text>
          );
        })()}

      {/* the motes: what is freshest in the garden, passing through */}
      {!reduce &&
        [0, 1].map((i) => (
          <g key={`m${i}`} className="b-mote" opacity={0.75}>
            <circle
              ref={(el) => {
                moteEls.current[i] = el;
              }}
              cx={i ? 800 : 120}
              cy={i ? 120 : 560}
              r={4}
              fill="var(--faint)"
            />
            <text
              ref={(el) => {
                moteTxt.current[i] = el;
              }}
              className="b-hand"
              fontSize={11.5}
              fill="var(--faint)"
            >
              {motes[i] ?? ""}
            </text>
          </g>
        ))}

      {/* the trails: where a decision used to sit, in pencil */}
      {placed.map((b) => {
        if (!b.trail.length || !b.at) return null;
        const isSel = b.slug === selected;
        const pts: Pt[] = [...b.trail.map((t): Pt => [t[0], t[1]]), b.at];
        return (
          <g
            key={`tr${b.slug}`}
            className="b-trail"
            opacity={isSel ? 0.75 : quiet(b.slug) ? 0.12 : 0.3}
          >
            <path
              d={pts
                .map(
                  (p, i) =>
                    `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`,
                )
                .join("")}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={1}
              strokeDasharray="3 4"
              strokeLinecap="round"
            />
            {b.trail.map((t, i) => (
              <g key={i} transform={`translate(${t[0]} ${t[1]})`}>
                <circle
                  r={4.5}
                  fill="var(--bg)"
                  stroke="var(--accent)"
                  strokeWidth={1}
                />
                {isSel && (
                  <text
                    className="b-hand"
                    x={8}
                    y={-4}
                    fontSize={10.5}
                    fill="var(--muted)"
                  >
                    {shortDay(t[2])}
                  </text>
                )}
              </g>
            ))}
          </g>
        );
      })}

      {/* the headings: where a decision leads, drawn as one stroke */}
      {placed.map((b) => {
        if (!b.at || !b.leads) return null;
        const r = rand(seedOf(`lead-${b.slug}`));
        const line = stroke(b.at, b.leads, r, 2.4, 0);
        const dx = b.leads[0] - b.at[0];
        const dy = b.leads[1] - b.at[1];
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const head = (a: number): Pt => [
          b.leads![0] - (ux * Math.cos(a) - uy * Math.sin(a)) * 11,
          b.leads![1] - (ux * Math.sin(a) + uy * Math.cos(a)) * 11,
        ];
        const isSel = b.slug === selected;
        const to = slotsAt(layout, b.leads);
        return (
          <g
            key={`h${b.slug}`}
            className="b-lead"
            opacity={quiet(b.slug) ? 0.3 : 1}
          >
            <path d={ribbon(line, 1.6, seedOf(b.slug))} fill="var(--accent)" />
            <path
              d={ribbon(
                stroke(head(0.5), b.leads, r, 0.6, 0),
                1.6,
                seedOf(b.slug) + 2,
              )}
              fill="var(--accent)"
            />
            <path
              d={ribbon(
                stroke(head(-0.5), b.leads, r, 0.6, 0),
                1.6,
                seedOf(b.slug) + 3,
              )}
              fill="var(--accent)"
            />
            {isSel && (
              <text
                className="b-mono"
                x={b.leads[0] + (ux >= 0 ? 12 : -12)}
                y={b.leads[1] + 4}
                textAnchor={ux >= 0 ? "start" : "end"}
                fontSize={9}
                letterSpacing={1.2}
                fill="var(--accent)"
              >
                → {to.length ? expression(to, values) : "outside"}
              </text>
            )}
            <circle
              className="b-handle"
              cx={b.leads[0]}
              cy={b.leads[1]}
              r={13}
              fill="transparent"
              onPointerDown={(e) => beginDrag(e, b.slug, "leads")}
            />
          </g>
        );
      })}

      {/* the stones: decisions, set down by hand */}
      {placed.map((b) =>
        stone(
          b,
          b.at![0],
          b.at![1],
          b.at![0] > FRAME.w - 190 ? "left" : "right",
        ),
      )}

      {/* a stone about to be set down */}
      {pendingAt && (
        <g
          transform={`translate(${pendingAt[0]} ${pendingAt[1]})`}
          pointerEvents="none"
        >
          <circle
            r={7}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={1.2}
            strokeDasharray="2 3"
          />
          <text
            className="b-hand"
            x={14}
            y={5}
            fontSize={14}
            fill="var(--accent)"
          >
            name it, on the right →
          </text>
        </g>
      )}

      {/* the tray: set down nowhere yet */}
      {unplaced.length > 0 ? (
        <g className="b-tray">
          <text
            className="b-hand"
            x={FRAME.w - 24}
            y={30}
            textAnchor="end"
            fontSize={13}
            fill="var(--faint)"
          >
            not yet set down — drag one in
          </text>
          {unplaced
            .slice(0, 9)
            .map((b, i) => stone(b, FRAME.w - 34, 54 + i * 24, "left"))}
        </g>
      ) : (
        bearings.length === 0 && (
          <text
            className="b-hand"
            x={FRAME.w - 24}
            y={30}
            textAnchor="end"
            fontSize={13}
            fill="var(--faint)"
          >
            nothing set down yet — double-click where a decision sits
          </text>
        )
      )}

      {/* the reticle: where the pointer is, and what that means */}
      {pointer && !dragging && (
        <g className="b-reticle" pointerEvents="none">
          <line
            x1={pointer[0]}
            y1={0}
            x2={pointer[0]}
            y2={FRAME.h}
            stroke="var(--faint)"
            strokeOpacity={0.35}
            strokeDasharray="2 5"
          />
          <line
            x1={0}
            y1={pointer[1]}
            x2={FRAME.w}
            y2={pointer[1]}
            stroke="var(--faint)"
            strokeOpacity={0.35}
            strokeDasharray="2 5"
          />
          <circle
            cx={pointer[0]}
            cy={pointer[1]}
            r={3.5}
            fill="none"
            stroke="var(--faint)"
          />
        </g>
      )}
      <text
        className="b-mono"
        x={22}
        y={30}
        fontSize={10.5}
        letterSpacing={1.2}
        fill="var(--muted)"
        opacity={cursorIds && !dragging ? 1 : 0}
        pointerEvents="none"
      >
        cursor ∈ {cursorIds ? expression(cursorIds, values) : ""}
        {cursorRegion && (
          <tspan
            className="b-hand"
            fontSize={14}
            letterSpacing={0}
            fill="var(--ink)"
          >
            {"   "}
            {cursorRegion.name}
          </tspan>
        )}
      </text>
    </svg>
  );
}
