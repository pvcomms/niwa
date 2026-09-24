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
import type { Garden, GardenNode } from "@/lib/garden";
import {
  FRAME,
  LAYOUTS,
  expression,
  headingProse,
  prose,
  regionName,
  slotsAt,
  slugOf,
  stonesFor,
  type Bearing as Decision,
  type Pt,
  type ValuesConfig,
} from "@/lib/bearing";
import { rand, ribbon, roughEllipse, seedOf, stroke } from "@/lib/hand";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

type Payload = {
  config: ValuesConfig;
  own: boolean;
  bearings: Decision[];
  writable: boolean;
  dir: string | null;
};

type Drag = {
  slug: string;
  part: "at" | "leads";
  moved: boolean;
  start: Pt;
  last: Pt;
};

type Mote = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  label: string;
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

/** The margin the motes keep, and a stone is kept inside. */
const EDGE = { x0: 28, y0: 26, x1: FRAME.w - 28, y1: FRAME.h - 28 };

const shortHome = (p: string) =>
  typeof p === "string" ? p.replace(/^\/Users\/[^/]+/, "~") : p;

/**
 * 指針 — the bearing. The reader's values drawn as overlapping circles on one
 * sheet; a decision typed in becomes a stone, and where the reader sets it
 * down is their judgment. The sheet reads the placement back — which values
 * it sits in, which it leaves untouched, what the region is called, what the
 * garden has to say about each value — and never scores it.
 */
export default function Bearing() {
  const [data, setData] = useState<Payload | null>(null);
  const [garden, setGarden] = useState<Garden | null>(null);
  const [bearings, setBearings] = useState<Decision[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [hov, setHov] = useState<number[]>([]);
  const [pointer, setPointer] = useState<Pt | null>(null);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [reduce, setReduce] = useState(false);
  const [theme, setTheme] = useTheme();

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const skipClick = useRef(false);
  const pointerRef = useRef<Pt | null>(null);
  const bearingsRef = useRef<Decision[]>([]);
  const moteEls = useRef<(SVGCircleElement | null)[]>([]);
  const moteTxt = useRef<(SVGTextElement | null)[]>([]);
  const input = useRef<HTMLInputElement>(null);

  bearingsRef.current = bearings;

  // ── data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/bearing", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Payload | null) => {
        if (!p) return;
        setData(p);
        setBearings(p.bearings);
      });
    fetch("/api/garden", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((g: Garden | null) => g && setGarden(g));
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const config = data?.config ?? null;
  const layout = config ? LAYOUTS[config.layout] : null;
  const values = config?.values ?? [];

  // ── the rings, drawn once per layout ────────────────────────────────────
  const rings = useMemo(() => {
    if (!layout) return [];
    return layout.slots.map((s, i) => {
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
    });
  }, [layout]);

  const stones = useMemo(() => {
    const m = new Map<string, GardenNode[]>();
    if (!garden) return m;
    for (const v of values) m.set(v.id, stonesFor(v, garden.nodes, 999));
    return m;
  }, [garden, values]);

  const current = useMemo(
    () => bearings.find((b) => b.slug === selected) ?? null,
    [bearings, selected],
  );

  useEffect(() => {
    setNote(current?.note ?? "");
  }, [current?.slug, current?.note]);

  /** Which circles are lit: the ones under the pointer, else the held one. */
  const lit = hov.length ? hov : pinned !== null ? [pinned] : [];
  const litKey = lit.join("+");

  // ── writes ──────────────────────────────────────────────────────────────
  const save = useCallback(
    async (b: Decision) => {
      if (!data?.writable) return;
      const res = await fetch("/api/bearing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(b),
      });
      if (!res.ok) return;
      const saved = (await res.json()) as Decision;
      setBearings((bs) => bs.map((x) => (x.slug === saved.slug ? saved : x)));
    },
    [data?.writable],
  );

  const create = useCallback(
    async (title: string) => {
      const t = title.trim();
      if (!t) return;
      let b: Decision = {
        slug: slugOf(t),
        title: t,
        placed: new Date().toISOString().slice(0, 10),
        at: null,
        leads: null,
        note: "",
      };
      if (data?.writable) {
        const res = await fetch("/api/bearing", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: t }),
        });
        if (!res.ok) return;
        b = (await res.json()) as Decision;
      } else {
        const taken = new Set(bearingsRef.current.map((x) => x.slug));
        let n = 2;
        const base = b.slug;
        while (taken.has(b.slug)) b.slug = `${base}-${n++}`;
      }
      setBearings((bs) => [b, ...bs]);
      setSelected(b.slug);
      setDraft("");
    },
    [data?.writable],
  );

  /** Change one decision. Computed from the ref, not inside the updater, so the write never depends on React running it eagerly. */
  const patch = useCallback(
    (slug: string, change: Partial<Decision>, persist = true) => {
      const cur = bearingsRef.current.find((b) => b.slug === slug);
      if (!cur) return;
      const next = { ...cur, ...change };
      setBearings((bs) => bs.map((b) => (b.slug === slug ? next : b)));
      if (persist) save(next);
    },
    [save],
  );

  const letGo = useCallback(
    async (slug: string) => {
      if (data?.writable)
        await fetch(`/api/bearing?slug=${encodeURIComponent(slug)}`, {
          method: "DELETE",
        });
      setBearings((bs) => bs.filter((b) => b.slug !== slug));
      setSelected((s) => (s === slug ? null : s));
    },
    [data?.writable],
  );

  // ── the pointer on the sheet ────────────────────────────────────────────
  const toFrame = useCallback((e: { clientX: number; clientY: number }): Pt => {
    const box = svgRef.current!.getBoundingClientRect();
    return [
      ((e.clientX - box.left) / box.width) * FRAME.w,
      ((e.clientY - box.top) / box.height) * FRAME.h,
    ];
  }, []);

  const beginDrag = (
    e: ReactPointerEvent,
    slug: string,
    part: "at" | "leads",
  ) => {
    e.stopPropagation();
    e.preventDefault();
    svgRef.current?.setPointerCapture(e.pointerId);
    const start = toFrame(e);
    dragRef.current = { slug, part, moved: false, start, last: start };
    skipClick.current = true;
    setSelected(slug);
    setPinned(null);
  };

  const onMove = (e: ReactPointerEvent) => {
    if (!layout) return;
    const p = toFrame(e);
    pointerRef.current = p;
    const d = dragRef.current;
    if (d) {
      if (!d.moved && Math.hypot(p[0] - d.start[0], p[1] - d.start[1]) < 3)
        return;
      d.moved = true;
      const at: Pt = [
        clamp(p[0], EDGE.x0, EDGE.x1),
        clamp(p[1], EDGE.y0, EDGE.y1),
      ];
      patch(d.slug, { [d.part]: at }, false);
      setHov(slotsAt(layout, at));
      setPointer(null);
      return;
    }
    setPointer(p);
    setHov(slotsAt(layout, p));
  };

  const onUp = (e: ReactPointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    try {
      svgRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (d.moved) {
      const b = bearingsRef.current.find((x) => x.slug === d.slug);
      if (b) save({ ...b, [d.part]: d.last });
    }
  };

  const onLeave = () => {
    pointerRef.current = null;
    if (dragRef.current) return;
    setPointer(null);
    setHov([]);
  };

  /** Click a value to hold it lit; click it again, or the paper, to let go. */
  const onClick = (e: React.MouseEvent) => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    if (!layout) return;
    const s = slotsAt(layout, toFrame(e));
    if (s.length === 1) setPinned((p) => (p === s[0] ? null : s[0]));
    else if (s.length === 0) {
      setPinned(null);
      setSelected(null);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;
      if (e.key === "Escape") {
        setSelected(null);
        setPinned(null);
        (e.target as HTMLElement)?.blur?.();
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── the motes: the two freshest stones, passing through ─────────────────
  useEffect(() => {
    if (!garden || !layout || reduce) return;
    const fresh = garden.nodes
      .filter((n) => n.modified && n.kind !== "ghost" && n.kind !== "repo")
      .sort((a, b) => (b.modified! > a.modified! ? 1 : -1))
      .slice(0, 2);
    const motes: Mote[] = [
      { x: 120, y: 560, vx: 32, vy: -22, label: fresh[0]?.label ?? "" },
      { x: 800, y: 120, vx: -27, vy: 30, label: fresh[1]?.label ?? "" },
    ];
    let raf = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      if (last === null) last = now;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const pt = pointerRef.current;
      motes.forEach((m, i) => {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.x < EDGE.x0 || m.x > EDGE.x1) {
          m.vx *= -1;
          m.x = clamp(m.x, EDGE.x0, EDGE.x1);
        }
        if (m.y < EDGE.y0 || m.y > EDGE.y1) {
          m.vy *= -1;
          m.y = clamp(m.y, EDGE.y0, EDGE.y1);
        }
        if (pt) {
          const dx = m.x - pt[0];
          const dy = m.y - pt[1];
          const d = Math.max(Math.hypot(dx, dy), 4);
          if (d < 100) {
            const press = (1 - d / 100) * 220;
            m.vx += (dx / d) * press * dt;
            m.vy += (dy / d) * press * dt;
          }
        }
        const spd = Math.hypot(m.vx, m.vy);
        if (spd > 130) {
          m.vx *= 130 / spd;
          m.vy *= 130 / spd;
        } else if (spd > 34) {
          const settle = Math.pow(0.055, dt);
          const k = (34 + (spd - 34) * settle) / Math.max(spd, 0.0001);
          m.vx *= k;
          m.vy *= k;
        }
        const inside = slotsAt(layout, [m.x, m.y]);
        const el = moteEls.current[i];
        const tx = moteTxt.current[i];
        if (el) {
          el.setAttribute("cx", m.x.toFixed(1));
          el.setAttribute("cy", m.y.toFixed(1));
          el.setAttribute(
            "fill",
            inside.length ? `var(--value-${inside[0]})` : "var(--faint)",
          );
        }
        if (tx) {
          tx.setAttribute("x", (m.x + 8).toFixed(1));
          tx.setAttribute("y", (m.y + 3.5).toFixed(1));
        }
      });
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      last = null;
      raf = requestAnimationFrame(tick);
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) start();
    };
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [garden, layout, reduce]);

  // ── readings ────────────────────────────────────────────────────────────
  const readingOf = (ids: number[]) =>
    config
      ? {
          expr: expression(ids, values),
          region: regionName(ids, config),
          words: prose(ids, values),
        }
      : null;

  const placed = bearings.filter((b) => b.at);
  const unplaced = bearings.filter((b) => !b.at);
  const currentAt = current?.at && layout ? slotsAt(layout, current.at) : null;
  const currentLeads =
    current?.leads && layout ? slotsAt(layout, current.leads) : null;
  const cursorReading =
    pointer && layout ? readingOf(slotsAt(layout, pointer)) : null;
  const captionIds = hov.length ? hov : pinned !== null ? [pinned] : null;
  const caption = captionIds ? readingOf(captionIds) : null;
  const litColour =
    captionIds && captionIds.length === 1
      ? `var(--value-${captionIds[0]})`
      : null;

  const motesFresh = useMemo(() => {
    if (!garden) return ["", ""];
    return garden.nodes
      .filter((n) => n.modified && n.kind !== "ghost" && n.kind !== "repo")
      .sort((a, b) => (b.modified! > a.modified! ? 1 : -1))
      .slice(0, 2)
      .map((n) => n.label);
  }, [garden]);

  return (
    <main className="bearing scroll-thin relative h-dvh w-full overflow-y-auto">
      <div className="mx-auto max-w-[80rem] px-5 pb-16 sm:px-10">
        {/* masthead */}
        <header className="rise flex flex-wrap items-start justify-between gap-4 pt-6 sm:pt-8">
          <div className="flex items-baseline gap-3">
            <h1
              className="display text-[40px] leading-none"
              style={{ color: "var(--ink)" }}
            >
              指針
            </h1>
            <div>
              <div className="meta" style={{ color: "var(--accent)" }}>
                bearing
              </div>
              <p
                className="hand mt-1 max-w-[26rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                Your values, drawn as one sheet. Set a decision down where you
                judge it sits and read what that placement says. The sheet
                surfaces; you decide.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/bearing" />
            <button
              onClick={() => setTheme(theme === "paper" ? "sumi" : "paper")}
              className="chip px-2.5 py-1.5 text-[10px] tracking-[0.14em] uppercase"
              style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
              aria-label="Toggle theme"
            >
              {theme === "paper" ? "sumi" : "paper"}
            </button>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
          {/* ── the sheet ─────────────────────────────────────────────── */}
          <section
            className="panel sketched rise relative p-2 sm:p-3"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The bearing"
          >
            <Sketch seed="bearing-sheet" draw />
            {!layout || !config ? (
              <div
                className="grid place-items-center"
                style={{ aspectRatio: "900 / 640" }}
              >
                <span
                  className="meta breathe"
                  style={{ color: "var(--faint)" }}
                >
                  reading the values
                </span>
              </div>
            ) : (
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
                role="img"
                aria-label={`${values.map((v) => v.name).join(", ")} drawn as overlapping circles, with ${placed.length} decisions placed`}
              >
                <defs>
                  <filter
                    id="b-bloom"
                    x="-20%"
                    y="-20%"
                    width="140%"
                    height="140%"
                  >
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
                    fill={`var(--value-${i})`}
                    fillOpacity={lit.includes(i) ? 0.075 : 0.014}
                  />
                ))}

                {/* the lenses: a real two-set region, shaded when named or lit */}
                {layout.pairs.map((p) => {
                  const [a, b] = p.ids;
                  const both =
                    lit.includes(a) && lit.includes(b) && lit.length === 2;
                  const one =
                    lit.length === 1 && (lit[0] === a || lit[0] === b);
                  return (
                    <g key={`l${a}${b}`} clipPath={`url(#b-clip-${a})`}>
                      <circle
                        className="b-lens"
                        cx={layout.slots[b].cx}
                        cy={layout.slots[b].cy}
                        r={layout.slots[b].r}
                        fill={`var(--value-${one && lit[0] === b ? b : a})`}
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
                        fill={`var(--value-${i})`}
                        filter="url(#b-bloom)"
                        opacity={on ? 0.55 : 0}
                      />
                      <path
                        d={rings[i].rest}
                        fill={`var(--value-${i})`}
                        opacity={dim ? 0.16 : 0.8}
                      />
                      <path
                        d={rings[i].lit}
                        fill={`var(--value-${i})`}
                        opacity={on ? 1 : 0}
                      />
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
                      fill={`var(--value-${i})`}
                      opacity={dim ? 0.3 : 1}
                      style={{ textTransform: "uppercase" }}
                    >
                      {values[i].name}
                    </text>
                  );
                })}

                {/* the named regions */}
                {layout.pairs.map((p) => {
                  const [a, b] = p.ids;
                  const r = regionName([a, b], config);
                  if (!r) return null;
                  const both =
                    lit.includes(a) && lit.includes(b) && lit.length === 2;
                  const one =
                    lit.length === 1 && (lit[0] === a || lit[0] === b);
                  const op = both ? 1 : one ? 0.9 : lit.length ? 0.18 : 0.62;
                  return (
                    <g key={`p${a}${b}`} className="b-label" opacity={op}>
                      <text
                        className="b-hand"
                        x={p.ax}
                        y={p.ay}
                        textAnchor="middle"
                        fontSize={18.5}
                        fill="var(--ink)"
                      >
                        {r.name}
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
                    if (!r) return null;
                    const all = layout.triple.ids.every((i) => lit.includes(i));
                    return (
                      <text
                        className="b-hand b-label"
                        x={layout.triple.mx}
                        y={layout.triple.my}
                        textAnchor="middle"
                        fontSize={13.5}
                        fill="var(--muted)"
                        opacity={all ? 1 : lit.length ? 0.2 : 0.7}
                      >
                        {r.name}
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
                        {motesFresh[i]}
                      </text>
                    </g>
                  ))}

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
                  return (
                    <g
                      key={`h${b.slug}`}
                      className="b-lead"
                      opacity={selected && !isSel ? 0.35 : 1}
                    >
                      <path
                        d={ribbon(line, 1.6, seedOf(b.slug))}
                        fill="var(--accent)"
                      />
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
                {placed.map((b) => {
                  const isSel = b.slug === selected;
                  const dim = selected !== null && !isSel;
                  return (
                    <g
                      key={b.slug}
                      className="b-stone"
                      transform={`translate(${b.at![0]} ${b.at![1]})`}
                      opacity={dim ? 0.45 : 1}
                    >
                      {isSel && (
                        <path
                          transform="translate(-12 -12)"
                          d={ribbon(
                            roughEllipse(24, 24, seedOf(b.slug), {
                              wobble: 1.1,
                              pad: 0,
                              steps: 12,
                            }),
                            1.5,
                            seedOf(b.slug),
                          )}
                          fill="var(--pen)"
                        />
                      )}
                      <circle r={6.4} fill="var(--accent)" />
                      <text
                        className="b-hand"
                        x={15}
                        y={5}
                        fontSize={15}
                        fill={isSel ? "var(--ink)" : "var(--muted)"}
                      >
                        {b.title.length > 34
                          ? `${b.title.slice(0, 34)}…`
                          : b.title}
                      </text>
                      <circle
                        className="b-handle"
                        r={15}
                        fill="transparent"
                        onPointerDown={(e) => beginDrag(e, b.slug, "at")}
                      />
                    </g>
                  );
                })}

                {/* the tray: set down nowhere yet */}
                {unplaced.length > 0 && (
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
                    {unplaced.slice(0, 9).map((b, i) => {
                      const isSel = b.slug === selected;
                      const y = 54 + i * 24;
                      return (
                        <g
                          key={b.slug}
                          className="b-stone"
                          transform={`translate(${FRAME.w - 34} ${y})`}
                          opacity={selected && !isSel ? 0.5 : 1}
                        >
                          {isSel && (
                            <path
                              transform="translate(-12 -12)"
                              d={ribbon(
                                roughEllipse(24, 24, seedOf(b.slug), {
                                  wobble: 1.1,
                                  pad: 0,
                                  steps: 12,
                                }),
                                1.5,
                                seedOf(b.slug),
                              )}
                              fill="var(--pen)"
                            />
                          )}
                          <circle
                            r={6.4}
                            fill="var(--accent)"
                            fillOpacity={0.85}
                          />
                          <text
                            className="b-hand"
                            x={-14}
                            y={5}
                            textAnchor="end"
                            fontSize={14}
                            fill={isSel ? "var(--ink)" : "var(--muted)"}
                          >
                            {b.title.length > 28
                              ? `${b.title.slice(0, 28)}…`
                              : b.title}
                          </text>
                          <circle
                            className="b-handle"
                            r={15}
                            fill="transparent"
                            onPointerDown={(e) => beginDrag(e, b.slug, "at")}
                          />
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* the reticle: where the pointer is, and what that means */}
                {pointer && (
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
                  opacity={cursorReading ? 1 : 0}
                  pointerEvents="none"
                >
                  cursor ∈ {cursorReading?.expr}
                  {cursorReading?.region && (
                    <tspan
                      className="b-hand"
                      fontSize={14}
                      letterSpacing={0}
                      fill="var(--ink)"
                    >
                      {"   "}
                      {cursorReading.region.name}
                    </tspan>
                  )}
                </text>
              </svg>
            )}

            {/* the caption: what is under the pointer, or held */}
            <div
              className="relative mt-2 min-h-[4.6rem] pl-3"
              style={{
                borderLeft: `2px solid ${litColour ?? "var(--rule)"}`,
                transition: "border-color 220ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              aria-live="polite"
            >
              {!caption ? (
                <>
                  <div className="meta" style={{ color: "var(--faint)" }}>
                    𝒰 · your values
                  </div>
                  <p
                    className="hand mt-1 text-[15px] leading-[1.3]"
                    style={{ color: "var(--muted)" }}
                  >
                    hover a value to read it, click to hold it. type a decision
                    on the right, then drag its stone to where you judge it sits
                    — the sheet reads the placement back.
                  </p>
                </>
              ) : captionIds!.length === 1 ? (
                <>
                  <div
                    className="meta"
                    style={{ color: litColour ?? "var(--ink)" }}
                  >
                    {values[captionIds![0]].name}
                    <span style={{ color: "var(--faint)" }}>
                      {" "}
                      · {stones.get(values[captionIds![0]].id)?.length ??
                        0}{" "}
                      stones in the garden
                      {pinned === captionIds![0]
                        ? " · held"
                        : " · click to hold"}
                    </span>
                  </div>
                  <p
                    className="mt-1 text-[13px] leading-[1.55]"
                    style={{ color: "var(--ink)" }}
                  >
                    {values[captionIds![0]].blurb}
                  </p>
                </>
              ) : (
                <>
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    {caption.expr}
                    <span style={{ color: "var(--faint)" }}>
                      {"  "}
                      {captionIds!.map((i) => values[i].name).join(" · ")}
                    </span>
                  </div>
                  {caption.region ? (
                    <>
                      <div
                        className="display mt-0.5 text-[21px] leading-[1.15]"
                        style={{ color: "var(--ink)" }}
                      >
                        {caption.region.name}
                      </div>
                      <p
                        className="hand mt-0.5 text-[15px] leading-[1.3]"
                        style={{ color: "var(--muted)" }}
                      >
                        {caption.region.blurb}
                      </p>
                    </>
                  ) : (
                    <p
                      className="hand mt-1 text-[15px] leading-[1.3]"
                      style={{ color: "var(--muted)" }}
                    >
                      rare air — a region you have not named yet.
                    </p>
                  )}
                </>
              )}
            </div>
          </section>

          {/* ── the desk ──────────────────────────────────────────────── */}
          <aside
            className="rise flex flex-col gap-5"
            style={{ animationDelay: "140ms" }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                create(draft);
              }}
            >
              <label
                className="meta block"
                htmlFor="bearing-draft"
                style={{ color: "var(--faint)" }}
              >
                set a decision down
              </label>
              <input
                id="bearing-draft"
                ref={input}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="the thing you are weighing  /"
                className="search mt-2 w-full px-3 py-2 text-[13px]"
                autoComplete="off"
                maxLength={200}
              />
              <p
                className="hand mt-1.5 text-[13.5px] leading-[1.3]"
                style={{ color: "var(--faint)" }}
              >
                enter, then drag the stone to where it sits. drop it outside
                every circle if that is the honest answer.
              </p>
            </form>

            {/* the reading of the chosen decision */}
            {current && (
              <section
                className="panel sketched relative p-4"
                style={{ borderRadius: 3 }}
                aria-label="The reading"
              >
                <Sketch
                  seed={`read-${current.slug}`}
                  color="var(--accent)"
                  draw
                />
                <div className="flex items-start justify-between gap-3">
                  <h2
                    className="hand text-[22px] leading-[1.15]"
                    style={{ color: "var(--ink)" }}
                  >
                    {current.title}
                  </h2>
                  <button
                    onClick={() => setSelected(null)}
                    className="meta shrink-0"
                    style={{ color: "var(--faint)" }}
                    aria-label="Close the reading"
                  >
                    esc
                  </button>
                </div>

                {!current.at || !currentAt ? (
                  <p
                    className="hand mt-3 text-[15px] leading-[1.3]"
                    style={{ color: "var(--muted)" }}
                  >
                    not set down yet — it waits in the top corner of the sheet.
                    drag it in.
                  </p>
                ) : (
                  <>
                    <div
                      className="meta mt-3"
                      style={{ color: "var(--accent)" }}
                    >
                      d ∈ {expression(currentAt, values)}
                    </div>
                    {regionName(currentAt, config!) && currentAt.length > 1 && (
                      <div
                        className="display mt-1 text-[20px] leading-[1.15]"
                        style={{ color: "var(--ink)" }}
                      >
                        {regionName(currentAt, config!)!.name}
                      </div>
                    )}
                    <p
                      className="mt-1.5 text-[13px] leading-[1.55]"
                      style={{ color: "var(--ink)" }}
                    >
                      {prose(currentAt, values)}
                    </p>

                    {current.leads && currentLeads ? (
                      <div className="mt-3 border-t pt-3 rule">
                        <div
                          className="meta"
                          style={{ color: "var(--accent)" }}
                        >
                          → leads into {expression(currentLeads, values)}
                        </div>
                        <p
                          className="mt-1 text-[13px] leading-[1.55]"
                          style={{ color: "var(--ink)" }}
                        >
                          {headingProse(currentAt, currentLeads, values)}
                        </p>
                        <button
                          onClick={() => patch(current.slug, { leads: null })}
                          className="meta mt-2"
                          style={{ color: "var(--faint)" }}
                        >
                          let go of the heading
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          patch(current.slug, {
                            leads: [
                              clamp(current.at![0] + 80, EDGE.x0, EDGE.x1),
                              clamp(current.at![1] - 56, EDGE.y0, EDGE.y1),
                            ],
                          })
                        }
                        className="chip mt-3 px-2.5 py-1.5 text-[10px] tracking-[0.14em] uppercase"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--muted)",
                        }}
                      >
                        draw where it leads →
                      </button>
                    )}

                    {/* what the garden has to say */}
                    {currentAt.length > 0 && garden && (
                      <div className="mt-4 border-t pt-3 rule">
                        <div className="meta" style={{ color: "var(--faint)" }}>
                          what the garden says
                        </div>
                        {currentAt.map((i) => {
                          const v = values[i];
                          const list = stones.get(v.id) ?? [];
                          return (
                            <div key={v.id} className="mt-2">
                              <div
                                className="meta"
                                style={{ color: `var(--value-${i})` }}
                              >
                                {v.name}
                                <span style={{ color: "var(--faint)" }}>
                                  {" "}
                                  ·{" "}
                                  {list.length
                                    ? `${list.length} stones`
                                    : "nothing yet"}
                                </span>
                              </div>
                              {list.length > 0 && (
                                <ul className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                                  {list.slice(0, 5).map((n) => (
                                    <li key={n.id}>
                                      <Link
                                        href={`/catalogue?id=${encodeURIComponent(n.id)}`}
                                        className="b-stone-link text-[12px]"
                                        style={{ color: "var(--muted)" }}
                                      >
                                        {n.label.length > 36
                                          ? `${n.label.slice(0, 36)}…`
                                          : n.label}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={() => {
                    if (note !== current.note) patch(current.slug, { note });
                  }}
                  placeholder="your working, in your own hand"
                  rows={3}
                  className="search hand mt-4 w-full resize-y px-3 py-2 text-[15px] leading-[1.3]"
                />
                <div className="mt-3 flex items-center justify-between">
                  <span className="meta" style={{ color: "var(--faint)" }}>
                    set down {current.placed}
                  </span>
                  <button
                    onClick={() => letGo(current.slug)}
                    className="meta"
                    style={{ color: "var(--faint)" }}
                  >
                    let go
                  </button>
                </div>
              </section>
            )}

            {/* every decision on the sheet */}
            {bearings.length > 0 && (
              <section aria-label="Decisions">
                <div className="meta" style={{ color: "var(--faint)" }}>
                  decisions · {placed.length} placed
                  {unplaced.length ? ` · ${unplaced.length} waiting` : ""}
                </div>
                <ul className="mt-1.5">
                  {bearings.map((b) => {
                    const ids = b.at && layout ? slotsAt(layout, b.at) : null;
                    const on = b.slug === selected;
                    return (
                      <li key={b.slug}>
                        <button
                          onClick={() => setSelected(on ? null : b.slug)}
                          className="b-row flex w-full items-baseline gap-2 py-1 text-left"
                          aria-current={on ? "true" : undefined}
                        >
                          <span
                            aria-hidden
                            className="shrink-0"
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 99,
                              background: "var(--accent)",
                              opacity: ids ? 1 : 0.45,
                              transform: "translateY(-1px)",
                            }}
                          />
                          <span className="relative min-w-0 flex-1">
                            <span
                              className="hand block truncate text-[15px] leading-[1.25]"
                              style={{
                                color: on ? "var(--ink)" : "var(--muted)",
                              }}
                            >
                              {b.title}
                            </span>
                            {on && (
                              <Sketch
                                kind="underline"
                                seed={b.slug}
                                color="var(--accent)"
                                draw
                              />
                            )}
                          </span>
                          <span
                            className="meta shrink-0"
                            style={{
                              color: "var(--faint)",
                              textTransform: "none",
                            }}
                          >
                            {ids ? expression(ids, values) : "waiting"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* the values, and where they come from */}
            {config && (
              <section aria-label="Values">
                <div className="meta" style={{ color: "var(--faint)" }}>
                  the values
                </div>
                <ul className="mt-1.5">
                  {values.map((v, i) => {
                    const on = pinned === i;
                    return (
                      <li key={v.id}>
                        <button
                          onClick={() => setPinned(on ? null : i)}
                          onPointerEnter={() => !dragRef.current && setHov([i])}
                          onPointerLeave={() => !dragRef.current && setHov([])}
                          className="b-row flex w-full items-center gap-2 py-1 text-left"
                          aria-pressed={on}
                        >
                          <span
                            aria-hidden
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: 99,
                              background: `var(--value-${i})`,
                            }}
                          />
                          <span className="relative">
                            <span
                              className="text-[13px]"
                              style={{
                                color: on ? "var(--ink)" : "var(--muted)",
                              }}
                            >
                              {v.name}
                            </span>
                            {on && (
                              <Sketch
                                kind="ring"
                                seed={v.id}
                                color={`var(--value-${i})`}
                                draw
                              />
                            )}
                          </span>
                          <span
                            className="meta ml-auto"
                            style={{ color: "var(--faint)" }}
                          >
                            {stones.get(v.id)?.length ?? 0} stones
                          </span>
                        </button>
                        {on && (stones.get(v.id)?.length ?? 0) > 0 && (
                          <ul className="mb-2 ml-4 flex flex-wrap gap-x-2 gap-y-0.5">
                            {stones.get(v.id)!.slice(0, 8).map((n) => (
                              <li key={n.id}>
                                <Link
                                  href={`/catalogue?id=${encodeURIComponent(n.id)}`}
                                  className="b-stone-link text-[12px]"
                                  style={{ color: "var(--muted)" }}
                                >
                                  {n.label.length > 36
                                    ? `${n.label.slice(0, 36)}…`
                                    : n.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p
                  className="hand mt-3 text-[13.5px] leading-[1.3]"
                  style={{ color: "var(--faint)" }}
                >
                  {data?.own
                    ? `your own, from ${shortHome(data.dir ?? "")}/values.json`
                    : data?.dir
                      ? `the sample five. write your own at ${shortHome(data.dir)}/values.json`
                      : "the sample five — a deployed sheet keeps no decisions."}
                </p>
              </section>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
