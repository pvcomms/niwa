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
  buildFlow,
  context,
  downstream,
  foundations,
  influences,
  readings,
  upstream,
  type Flow as FlowGraph,
} from "@/lib/flow";
import { rand, ribbon, roughEllipse, seedOf, stroke } from "@/lib/hand";
import { KIND_LABEL, LINK_LABEL, STAGE_LABEL } from "@/lib/palette";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

/** The sheet's frame. */
const W = 900;
const H = 520;
const COLS = { up2: 150, up1: 315, centre: 450, down1: 585, down2: 750 };
const TOP = 56;
const BOTTOM = 470;
const PER_COLUMN = 8;

type Pt = [number, number];
type Placed = { id: string; x: number; y: number; hop: -2 | -1 | 0 | 1 | 2 };
type Edge = {
  from: string;
  to: string;
  kind: string;
  mutual: boolean;
  wave: number;
};
/** What the pointer is over: a stone by id, or an arrow. */
type Hover = { id: string; x: number; y: number; edge?: Edge };

const day = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "undated";

const short = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1)}…` : s;

/** Spread n things down a column, and say how many were left out. */
function column(
  ids: string[],
  x: number,
  hop: Placed["hop"],
): { placed: Placed[]; more: number } {
  const shown = ids.slice(0, PER_COLUMN);
  const n = shown.length;
  return {
    placed: shown.map((id, i) => ({
      id,
      x,
      y: n === 1 ? (TOP + BOTTOM) / 2 : TOP + ((BOTTOM - TOP) * (i + 0.5)) / n,
      hop,
    })),
    more: ids.length - n,
  };
}

/**
 * The flow. One stone at the centre; what flowed into it fans out to the
 * left by hop, what it flowed into to the right. Threads are pen arrows,
 * the ones that run both ways in the accent. Fallow roots are drawn hollow,
 * unwritten ones dashed. The desk reads the structure back — the roots a
 * thought rests on and what would move if it changed — and stops there.
 */
export default function Flow() {
  const [garden, setGarden] = useState<Garden | null>(null);
  const [centre, setCentre] = useState<string | null>(null);
  const [walk, setWalk] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [hover, setHover] = useState<Hover | null>(null);
  const [vocab, setVocab] = useState(true);
  const [reduce, setReduce] = useState(false);
  const [theme, setTheme] = useTheme();
  const search = useRef<HTMLInputElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const walkRef = useRef<string[]>([]);
  walkRef.current = walk;

  useEffect(() => {
    fetch("/api/garden", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((g: Garden | null) => g && setGarden(g));
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const nodes = useMemo(() => {
    const m = new Map<string, GardenNode>();
    for (const n of garden?.nodes ?? []) m.set(n.id, n);
    return m;
  }, [garden]);

  const flow: FlowGraph | null = useMemo(() => {
    if (!garden) return null;
    return buildFlow(
      vocab ? garden.links : garden.links.filter((l) => l.kind !== "concept"),
    );
  }, [garden, vocab]);

  const top = useMemo(
    () => (flow ? influences(flow, nodes, 8) : null),
    [flow, nodes],
  );

  // The centre: the URL's, else what shaped the most.
  useEffect(() => {
    if (!garden || !top || centre) return;
    const fromUrl = new URLSearchParams(window.location.search).get("id");
    const first = fromUrl && nodes.has(fromUrl) ? fromUrl : top.shaped[0]?.id;
    if (first) {
      setCentre(first);
      setWalk([first]);
    }
  }, [garden, top, nodes, centre]);

  const go = useCallback((id: string) => {
    setCentre(id);
    setWalk((w) => (w[w.length - 1] === id ? w : [...w, id]));
    setHover(null);
    const url = `${window.location.pathname}?id=${encodeURIComponent(id)}`;
    window.history.replaceState(null, "", url);
  }, []);

  // Read from the ref, not inside the updater: an updater runs during render,
  // and neither the centre nor the URL may change there.
  const back = useCallback(() => {
    const w = walkRef.current;
    if (w.length < 2) return;
    const next = w.slice(0, -1);
    const id = next[next.length - 1];
    setWalk(next);
    setCentre(id);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?id=${encodeURIComponent(id)}`,
    );
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;
      if (e.key === "Escape") {
        setQuery("");
        setHover(null);
        (e.target as HTMLElement)?.blur?.();
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        search.current?.focus();
      } else if (e.key === "[" && !typing) back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [back]);

  // ── the reading of the centre ────────────────────────────────────────────
  const found = useMemo(
    () => (flow && centre ? foundations(flow, nodes, centre) : null),
    [flow, nodes, centre],
  );
  const ctx = useMemo(
    () => (flow && centre ? context(flow, nodes, centre) : undefined),
    [flow, nodes, centre],
  );
  const words = useMemo(
    () => (found ? readings(found, nodes, ctx) : []),
    [found, nodes, ctx],
  );

  // ── the sheet: columns by hop, edges among what is shown ─────────────────
  const scene = useMemo(() => {
    if (!flow || !centre || !found) return null;
    const up = upstream(flow, centre, 2);
    const down = downstream(flow, centre, 2);
    const byReach = (a: string, b: string) =>
      (flow.outOf.get(b)?.length ?? 0) - (flow.outOf.get(a)?.length ?? 0) ||
      a.localeCompare(b);
    // A stone that both feeds the centre and is fed by it is a loop; it is
    // drawn once, among the roots, and named as a loop on the desk.
    const pick = (m: Map<string, number>, hop: number) =>
      [...m.entries()]
        .filter(([, h]) => h === hop)
        .map(([id]) => id)
        .sort(byReach);
    const u1 = column(pick(up, 1), COLS.up1, -1);
    const u2 = column(pick(up, 2), COLS.up2, -2);
    const d1 = column(pick(down, 1).filter((id) => !up.has(id)), COLS.down1, 1);
    const d2 = column(pick(down, 2).filter((id) => !up.has(id)), COLS.down2, 2);
    const placed: Placed[] = [
      ...u2.placed,
      ...u1.placed,
      { id: centre, x: COLS.centre, y: (TOP + BOTTOM) / 2, hop: 0 },
      ...d1.placed,
      ...d2.placed,
    ];
    const at = new Map(placed.map((p) => [p.id, p]));
    const isMutual = (a: string, b: string) =>
      flow.mutual.get(a)?.has(b) ?? false;
    const edges: Edge[] = [];
    const seen = new Set<string>();
    const add = (from: string, to: string, kind: string, wave: number) => {
      const key = `${from}>${to}`;
      const rev = `${to}>${from}`;
      if (seen.has(key) || seen.has(rev)) return;
      seen.add(key);
      edges.push({ from, to, kind, mutual: isMutual(from, to), wave });
    };
    for (const p of u2.placed)
      for (const a of flow.outOf.get(p.id) ?? [])
        if (at.get(a.to)?.hop === -1) add(p.id, a.to, a.kind, 0);
    for (const p of u1.placed)
      for (const a of flow.outOf.get(p.id) ?? [])
        if (a.to === centre) add(p.id, centre, a.kind, 1);
    for (const p of d1.placed)
      for (const a of flow.into.get(p.id) ?? [])
        if (a.from === centre) add(centre, p.id, a.kind, 2);
    for (const p of d2.placed)
      for (const a of flow.into.get(p.id) ?? [])
        if (at.get(a.from)?.hop === 1) add(a.from, p.id, a.kind, 3);
    return {
      placed,
      at,
      edges,
      more: { u1: u1.more, u2: u2.more, d1: d1.more, d2: d2.more },
      upCount: up.size,
      downCount: down.size,
    };
  }, [flow, centre, found]);

  /** The pen for one arrow: the line, shortened off both discs, and a head at the far end. */
  const inkEdge = (e: Edge) => {
    const a = scene!.at.get(e.from)!;
    const b = scene!.at.get(e.to)!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const gapA = a.hop === 0 ? 14 : 11;
    const gapB = b.hop === 0 ? 14 : 11;
    const p: Pt = [a.x + ux * gapA, a.y + uy * gapA];
    const q: Pt = [b.x - ux * gapB, b.y - uy * gapB];
    const seed = seedOf(`${e.from}>${e.to}`);
    const r = rand(seed);
    const line = stroke(p, q, r, 2.2, 0);
    const head = (end: Pt, dir: 1 | -1, ang: number): string => {
      const hx = ux * dir;
      const hy = uy * dir;
      const s: Pt = [
        end[0] - (hx * Math.cos(ang) - hy * Math.sin(ang)) * 9,
        end[1] - (hx * Math.sin(ang) + hy * Math.cos(ang)) * 9,
      ];
      return ribbon(stroke(s, end, r, 0.5, 0), 1.3, seed + 5);
    };
    let d =
      ribbon(line, e.mutual ? 1.5 : 1.25, seed) +
      head(q, 1, 0.5) +
      head(q, 1, -0.5);
    if (e.mutual) d += head(p, -1, 0.5) + head(p, -1, -0.5);
    return { d, line };
  };

  const showCard = (e: ReactPointerEvent, id: string, edge?: Edge) => {
    const box = sheet.current!.getBoundingClientRect();
    setHover({ id, x: e.clientX - box.left, y: e.clientY - box.top, edge });
  };

  /** Under the pointer, the whole path lights: the stone, its arrows, and their way on to the centre. */
  const lit = useMemo(() => {
    if (!hover || !scene || !centre) return null;
    const key = (e: Edge) => `${e.from}>${e.to}`;
    const edges = new Set<string>();
    const stones = new Set<string>();
    if (hover.edge) {
      edges.add(key(hover.edge));
      stones.add(hover.edge.from);
      stones.add(hover.edge.to);
      return { edges, stones };
    }
    const adj = (id: string) =>
      scene.edges.filter((e) => e.from === id || e.to === id);
    stones.add(hover.id);
    for (const e of adj(hover.id)) {
      edges.add(key(e));
      const other = e.from === hover.id ? e.to : e.from;
      stones.add(other);
      if (other !== centre)
        for (const f of adj(other))
          if (f.from === centre || f.to === centre) {
            edges.add(key(f));
            stones.add(centre);
          }
    }
    return { edges, stones };
  }, [hover, scene, centre]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !garden) return [];
    return garden.nodes
      .filter((n) => n.kind !== "repo" && n.label.toLowerCase().includes(q))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 8);
  }, [query, garden]);

  const centreNode = centre ? nodes.get(centre) : null;
  const hoverNode = hover ? nodes.get(hover.id) : null;
  const hoverHop = hover && scene ? scene.at.get(hover.id)?.hop : undefined;
  const hoverArrow =
    hover && centre && flow && !hover.edge
      ? ((flow.into.get(centre) ?? []).find((a) => a.from === hover.id) ??
        (flow.outOf.get(centre) ?? []).find((a) => a.to === hover.id) ??
        null)
      : null;

  const Stone = ({
    id,
    onPick,
  }: {
    id: string;
    onPick: (id: string) => void;
  }) => {
    const n = nodes.get(id);
    return (
      <button
        onClick={() => onPick(id)}
        className="b-row flex w-full items-baseline gap-2 py-0.5 text-left"
      >
        <span
          aria-hidden
          className="shrink-0"
          style={{
            width: 6,
            height: 6,
            borderRadius: 99,
            background: `var(--kind-${n?.kind ?? "note"})`,
          }}
        />
        <span
          className="min-w-0 flex-1 overflow-hidden text-[12.5px] text-ellipsis whitespace-nowrap"
          style={{ color: "var(--muted)" }}
        >
          {n?.label ?? id}
        </span>
      </button>
    );
  };

  return (
    <main className="flow scroll-thin relative h-dvh w-full overflow-y-auto">
      <div className="mx-auto max-w-[80rem] px-5 pb-16 sm:px-10">
        {/* masthead */}
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
                flow
              </div>
              <p
                className="hand mt-1 max-w-[27rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                Nothing arrives alone. Pick a stone and see what flowed into it
                and what it flowed into — the roots a thought rests on, which of
                them have moved, and what would move if it changed.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/flow" />
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {/* ── the sheet ─────────────────────────────────────────────── */}
          <section
            ref={sheet}
            className="panel sketched rise relative p-2 sm:p-3"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The flow"
          >
            <Sketch seed="flow-sheet" draw />

            {/* the walk, and the vocabulary switch */}
            <div className="relative z-[2] flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <span className="meta" style={{ color: "var(--faint)" }}>
                  walked
                </span>
                {walk.map((id, i) => (
                  <span
                    key={`${id}-${i}`}
                    className="flex items-baseline gap-1.5"
                  >
                    {i > 0 && (
                      <span className="meta" style={{ color: "var(--faint)" }}>
                        ›
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setWalk(walk.slice(0, i + 1));
                        setCentre(id);
                      }}
                      disabled={i === walk.length - 1}
                      className="walk-step hand text-[14px]"
                      style={{
                        color:
                          i === walk.length - 1 ? "var(--ink)" : "var(--muted)",
                      }}
                    >
                      {short(nodes.get(id)?.label ?? id, 28)}
                    </button>
                  </span>
                ))}
                {walk.length > 1 && (
                  <kbd className="meta ml-1" style={{ color: "var(--faint)" }}>
                    [ back
                  </kbd>
                )}
              </div>
              <button
                onClick={() => setVocab((v) => !v)}
                className="chip relative px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: vocab ? "var(--muted)" : "var(--faint)",
                }}
                aria-pressed={vocab}
                title="Whether shared vocabulary counts as a thread"
              >
                vocabulary threads
                {!vocab && <Sketch kind="strike" seed="vocab" draw />}
              </button>
            </div>

            {!scene || !flow ? (
              <div
                className="grid place-items-center"
                style={{ aspectRatio: `${W} / ${H}` }}
              >
                <span
                  className="meta breathe"
                  style={{ color: "var(--faint)" }}
                >
                  following the threads
                </span>
              </div>
            ) : (
              <svg
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="xMidYMid meet"
                className="flow-sheet block w-full select-none"
                style={{ aspectRatio: `${W} / ${H}` }}
                role="img"
                aria-label={`${centreNode?.label ?? ""}: ${scene.upCount} stones flow into it, it flows into ${scene.downCount}`}
              >
                <defs>
                  {!reduce &&
                    scene.edges.map((e) => {
                      const { line } = inkEdge(e);
                      return (
                        <mask
                          key={`m-${e.from}>${e.to}`}
                          id={`fm-${seedOf(`${e.from}>${e.to}`)}`}
                          maskUnits="userSpaceOnUse"
                          x={0}
                          y={0}
                          width={W}
                          height={H}
                        >
                          <path
                            d={line}
                            pathLength={1}
                            fill="none"
                            stroke="#fff"
                            strokeWidth={22}
                            strokeLinecap="round"
                            className="draw"
                            style={{ ["--i" as string]: e.wave }}
                          />
                        </mask>
                      );
                    })}
                </defs>

                {/* the column headings */}
                {[
                  [COLS.up2, "two hops in"],
                  [COLS.up1, "flowed into it"],
                  [COLS.centre, ""],
                  [COLS.down1, "it flowed into"],
                  [COLS.down2, "two hops out"],
                ].map(([x, t]) =>
                  t ? (
                    <text
                      key={String(x)}
                      className="b-mono"
                      x={Number(x)}
                      y={26}
                      textAnchor="middle"
                      fontSize={9.5}
                      letterSpacing={1.6}
                      fill="var(--faint)"
                      style={{ textTransform: "uppercase" }}
                    >
                      {t}
                    </text>
                  ) : null,
                )}
                {(
                  [
                    [COLS.up2, scene.more.u2],
                    [COLS.up1, scene.more.u1],
                    [COLS.down1, scene.more.d1],
                    [COLS.down2, scene.more.d2],
                  ] as [number, number][]
                ).map(([x, n]) =>
                  n > 0 ? (
                    <text
                      key={`more-${x}`}
                      className="b-hand"
                      x={x}
                      y={H - 14}
                      textAnchor="middle"
                      fontSize={13}
                      fill="var(--faint)"
                    >
                      and {n} more
                    </text>
                  ) : null,
                )}

                {/* the threads, as pen arrows in their kind's colour */}
                {scene.edges.map((e) => {
                  const { d, line } = inkEdge(e);
                  const k = `${e.from}>${e.to}`;
                  const on = lit ? lit.edges.has(k) : null;
                  return (
                    <g
                      key={k}
                      className="f-edge"
                      mask={reduce ? undefined : `url(#fm-${seedOf(k)})`}
                      opacity={on === null ? (e.mutual ? 0.95 : 0.8) : on ? 1 : 0.14}
                      onPointerEnter={(ev) => showCard(ev, k, e)}
                      onPointerMove={(ev) => showCard(ev, k, e)}
                      onPointerLeave={() => setHover(null)}
                    >
                      <path
                        d={d}
                        fill={e.mutual ? "var(--accent)" : `var(--link-${e.kind})`}
                      />
                      <path
                        className="hit"
                        d={line}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={12}
                      />
                    </g>
                  );
                })}

                {/* the stones: keyed by id, so one that stays slides to its new place */}
                {scene.placed.map((p) => {
                  const n = nodes.get(p.id);
                  const kind = n?.kind ?? "note";
                  const hollow = n?.stage === "fallow" || kind === "ghost";
                  const isCentre = p.hop === 0;
                  const r = isCentre ? 9 : 6.5;
                  const left = p.hop < 0;
                  const on = lit ? lit.stones.has(p.id) : null;
                  return (
                    <g
                      key={p.id}
                      className="f-stone"
                      opacity={on === null || on ? 1 : 0.3}
                      onPointerEnter={(e) => showCard(e, p.id)}
                      onPointerMove={(e) => showCard(e, p.id)}
                      onPointerLeave={() => setHover(null)}
                      onClick={() => !isCentre && go(p.id)}
                      style={{
                        transform: `translate(${p.x}px, ${p.y}px)`,
                        cursor: isCentre ? "default" : "pointer",
                      }}
                    >
                      {isCentre && (
                        <path
                          transform="translate(-15 -15)"
                          d={ribbon(
                            roughEllipse(30, 30, seedOf(p.id), {
                              wobble: 1.2,
                              pad: 0,
                              steps: 14,
                            }),
                            1.6,
                            seedOf(p.id),
                          )}
                          fill="var(--accent)"
                        />
                      )}
                      <circle
                        r={r}
                        fill={hollow ? "var(--bg)" : `var(--kind-${kind})`}
                        stroke={`var(--kind-${kind})`}
                        strokeWidth={hollow ? 1.6 : 0}
                        strokeDasharray={kind === "ghost" ? "2.5 2.5" : undefined}
                      />
                      <text
                        className="b-hand"
                        x={isCentre ? 0 : left ? -13 : 13}
                        y={isCentre ? 30 : 4.5}
                        textAnchor={isCentre ? "middle" : left ? "end" : "start"}
                        fontSize={isCentre ? 16 : 13.5}
                        fill={isCentre ? "var(--ink)" : "var(--muted)"}
                      >
                        {short(n?.label ?? p.id, isCentre ? 40 : 22)}
                      </text>
                      <circle r={16} fill="transparent" />
                    </g>
                  );
                })}
              </svg>
            )}

            {/* the card over a stone or an arrow */}
            {hover && (hover.edge || hoverNode) && (
              <div
                className="card fade pointer-events-none absolute z-[5] px-3 py-2"
                style={{
                  left: hover.x + 14,
                  top: hover.y - 10,
                  maxWidth: "18rem",
                }}
              >
                {hover.edge ? (
                  <>
                    <div
                      className="meta"
                      style={{
                        color: hover.edge.mutual
                          ? "var(--accent)"
                          : `var(--link-${hover.edge.kind})`,
                      }}
                    >
                      {LINK_LABEL[hover.edge.kind] ?? hover.edge.kind}
                      {hover.edge.mutual && (
                        <span style={{ color: "var(--faint)" }}> · both ways</span>
                      )}
                    </div>
                    <div
                      className="hand mt-0.5 text-[14px] leading-[1.25]"
                      style={{ color: "var(--ink)" }}
                    >
                      {nodes.get(hover.edge.from)?.label ?? hover.edge.from}
                      <span style={{ color: "var(--faint)" }}>
                        {hover.edge.mutual ? " ↔ " : " → "}
                      </span>
                      {nodes.get(hover.edge.to)?.label ?? hover.edge.to}
                    </div>
                  </>
                ) : (
                  hoverNode && (
                    <>
                      <div
                        className="meta"
                        style={{ color: `var(--kind-${hoverNode.kind})` }}
                      >
                        {KIND_LABEL[hoverNode.kind] ?? hoverNode.kind}
                        <span style={{ color: "var(--faint)" }}>
                          {" "}
                          ·{" "}
                          {STAGE_LABEL[hoverNode.stage]?.split(" ·")[0] ??
                            hoverNode.stage}
                          {" · "}
                          {day(hoverNode.modified)}
                        </span>
                      </div>
                      <div
                        className="hand mt-0.5 text-[15px] leading-[1.2]"
                        style={{ color: "var(--ink)" }}
                      >
                        {hoverNode.label}
                      </div>
                      <div
                        className="hand mt-0.5 text-[13px] leading-[1.25]"
                        style={{ color: "var(--muted)" }}
                      >
                        {hoverArrow
                          ? `${LINK_LABEL[hoverArrow.kind] ?? hoverArrow.kind}${flow?.mutual.get(centre!)?.has(hover.id) ? " · runs both ways" : ""}`
                          : hoverHop === 0
                            ? "the centre"
                            : hoverHop === -2
                              ? "two hops in"
                              : hoverHop === 2
                                ? "two hops out"
                                : ""}
                        {" · "}
                        flows into {flow ? downstream(flow, hover.id).size : 0}
                        {" · "}
                        rests on {flow ? upstream(flow, hover.id).size : 0}
                      </div>
                    </>
                  )
                )}
              </div>
            )}

            {/* the caption, and the colours of the threads */}
            <div
              className="relative mt-2 min-h-[3.4rem] pl-3"
              style={{ borderLeft: "2px solid var(--rule)" }}
            >
              <div className="meta" style={{ color: "var(--faint)" }}>
                what flows, and which way
              </div>
              <p
                className="hand mt-1 text-[15px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                a note that links to, names or seeds a thing was fed by it; a
                term practised in a note fed the note; a note that points at
                code fed the code. hollow stones have gone fallow, dashed ones
                were never written. hover to light a path, click to walk.
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                {Object.entries(LINK_LABEL).map(([k, label]) => (
                  <li key={k} className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      style={{
                        width: 14,
                        height: 2,
                        background: `var(--link-${k})`,
                        borderRadius: 1,
                      }}
                    />
                    <span className="meta" style={{ color: "var(--faint)" }}>
                      {label}
                    </span>
                  </li>
                ))}
                <li className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    style={{
                      width: 14,
                      height: 2,
                      background: "var(--accent)",
                      borderRadius: 1,
                    }}
                  />
                  <span className="meta" style={{ color: "var(--accent)" }}>
                    both ways
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* ── the desk ──────────────────────────────────────────────── */}
          <aside
            className="rise flex flex-col gap-5"
            style={{ animationDelay: "140ms" }}
          >
            <div className="relative">
              <label
                className="meta block"
                htmlFor="flow-search"
                style={{ color: "var(--faint)" }}
              >
                put a stone at the centre
              </label>
              <input
                id="flow-search"
                ref={search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search the garden  /"
                className="search mt-2 w-full px-3 py-2 text-[13px]"
                autoComplete="off"
              />
              {results.length > 0 && (
                <ul
                  className="panel sketched relative mt-2 p-1.5"
                  style={{ borderRadius: 3 }}
                >
                  <Sketch seed="flow-found" draw />
                  {results.map((n) => (
                    <li key={n.id}>
                      <Stone
                        id={n.id}
                        onPick={(id) => {
                          go(id);
                          setQuery("");
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* the reading */}
            {centreNode && found && (
              <section
                className="panel sketched relative p-4"
                style={{ borderRadius: 3 }}
                aria-label="The reading"
              >
                <Sketch
                  seed={`flow-${centreNode.id}`}
                  color="var(--accent)"
                  draw
                />
                <div
                  className="meta"
                  style={{ color: `var(--kind-${centreNode.kind})` }}
                >
                  {KIND_LABEL[centreNode.kind] ?? centreNode.kind}
                  <span style={{ color: "var(--faint)" }}>
                    {" "}
                    ·{" "}
                    {STAGE_LABEL[centreNode.stage]?.split(" ·")[0] ??
                      centreNode.stage}{" "}
                    · {day(centreNode.modified)}
                  </span>
                </div>
                <h2
                  className="hand mt-1 text-[22px] leading-[1.15]"
                  style={{ color: "var(--ink)" }}
                >
                  {centreNode.label}
                </h2>
                <ul className="mt-3">
                  {words.map((w, i) => (
                    <li
                      key={i}
                      className="text-[13px] leading-[1.55]"
                      style={{ color: "var(--ink)" }}
                    >
                      {w}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/catalogue?id=${encodeURIComponent(centreNode.id)}`}
                  className="chip mt-3 inline-block px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted)",
                  }}
                >
                  read it
                </Link>

                {found.fallow.length > 0 && (
                  <div className="mt-4 border-t pt-3 rule">
                    <div className="meta" style={{ color: "var(--faint)" }}>
                      roots that may have moved · {found.fallow.length}
                    </div>
                    <ul className="mt-1">
                      {found.fallow.slice(0, 6).map((id) => (
                        <li key={id} className="flex items-baseline gap-2">
                          <div className="min-w-0 flex-1">
                            <Stone id={id} onPick={go} />
                          </div>
                          <span
                            className="meta shrink-0"
                            style={{
                              color: "var(--faint)",
                              textTransform: "none",
                            }}
                          >
                            {found.roots.get(id)} hop
                            {found.roots.get(id) === 1 ? "" : "s"} ·{" "}
                            {day(nodes.get(id)?.modified ?? null)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {found.unwritten.length > 0 && (
                  <div className="mt-4 border-t pt-3 rule">
                    <div className="meta" style={{ color: "var(--faint)" }}>
                      never written down · {found.unwritten.length}
                    </div>
                    <ul className="mt-1">
                      {found.unwritten.slice(0, 6).map((id) => (
                        <li key={id}>
                          <Stone id={id} onPick={go} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {found.linchpins.length > 0 && (
                  <div className="mt-4 border-t pt-3 rule">
                    <div className="meta" style={{ color: "var(--faint)" }}>
                      linchpins
                    </div>
                    <ul className="mt-1">
                      {found.linchpins.slice(0, 4).map((l) => (
                        <li key={l.id} className="flex items-baseline gap-2">
                          <div className="min-w-0 flex-1">
                            <Stone id={l.id} onPick={go} />
                          </div>
                          <span
                            className="meta shrink-0"
                            style={{
                              color: "var(--faint)",
                              textTransform: "none",
                            }}
                          >
                            {l.exclusive} roots only through it
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(found.loops.length > 0 || found.mutual.length > 0) && (
                  <div className="mt-4 border-t pt-3 rule">
                    {found.mutual.length > 0 && (
                      <>
                        <div
                          className="meta"
                          style={{ color: "var(--accent)" }}
                        >
                          runs both ways with · {found.mutual.length}
                        </div>
                        <ul className="mt-1 mb-2">
                          {found.mutual.slice(0, 6).map((id) => (
                            <li key={id}>
                              <Stone id={id} onPick={go} />
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    {found.loops.length > 0 && (
                      <>
                        <div className="meta" style={{ color: "var(--faint)" }}>
                          loops · fed by this, and feeding it ·{" "}
                          {found.loops.length}
                        </div>
                        <ul className="mt-1">
                          {found.loops.slice(0, 6).map((id) => (
                            <li key={id}>
                              <Stone id={id} onPick={go} />
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}

                <div className="mt-4 border-t pt-3 rule">
                  <div className="meta" style={{ color: "var(--faint)" }}>
                    what would move · {found.reach}
                  </div>
                  {found.directOut.length ? (
                    <ul className="mt-1">
                      {found.directOut.slice(0, 8).map((id) => (
                        <li key={id}>
                          <Stone id={id} onPick={go} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p
                      className="hand mt-1 text-[13.5px]"
                      style={{ color: "var(--faint)" }}
                    >
                      nothing yet — a leaf.
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* the influences, from data */}
            {top && (
              <section aria-label="The influences">
                <div className="meta" style={{ color: "var(--faint)" }}>
                  what shaped the most
                </div>
                <ul className="mt-1">
                  {top.shaped.map((s) => (
                    <li key={s.id} className="flex items-baseline gap-2">
                      <div className="min-w-0 flex-1">
                        <Stone id={s.id} onPick={go} />
                      </div>
                      <span
                        className="meta shrink-0"
                        style={{ color: "var(--faint)", textTransform: "none" }}
                      >
                        {s.reach}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="meta mt-4" style={{ color: "var(--accent)" }}>
                  what runs both ways
                </div>
                {top.argued.length ? (
                  <ul className="mt-1">
                    {top.argued.map((a) => (
                      <li key={a.id} className="flex items-baseline gap-2">
                        <div className="min-w-0 flex-1">
                          <Stone id={a.id} onPick={go} />
                        </div>
                        <span
                          className="meta shrink-0"
                          style={{
                            color: "var(--faint)",
                            textTransform: "none",
                          }}
                        >
                          {a.mutual}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p
                    className="hand mt-1 text-[13.5px]"
                    style={{ color: "var(--faint)" }}
                  >
                    nothing runs both ways yet.
                  </p>
                )}
              </section>
            )}

            <p
              className="hand text-[13.5px] leading-[1.35]"
              style={{ color: "var(--faint)" }}
            >
              how it is read: the garden's threads, given a direction, walked up
              to six hops. a linchpin is a direct root through which other roots
              reach the centre and no other way. what would move is everything
              downstream. nothing here is a grade.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
