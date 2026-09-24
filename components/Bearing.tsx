"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Garden, GardenNode } from "@/lib/garden";
import {
  FRAME,
  LAYOUTS,
  expression,
  headingProse,
  keyOf,
  prose,
  regionName,
  setDown,
  slotsAt,
  slugOf,
  stonesFor,
  type Bearing as Decision,
  type Pt,
  type ValuesConfig,
} from "@/lib/bearing";
import BearingSheet from "./BearingSheet";
import Sketch from "./Sketch";
import ValuesEditor, { type Focus } from "./ValuesEditor";
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
  /** Where it was before the drag, so a move across days keeps its trail. */
  origin: Pt | null;
};

type Mote = { x: number; y: number; vx: number; vy: number };

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

/** The margin the motes keep, and a stone is kept inside. */
const EDGE = { x0: 28, y0: 26, x1: FRAME.w - 28, y1: FRAME.h - 28 };

const today = () => new Date().toISOString().slice(0, 10);

const shortHome = (p: string) => p.replace(/^\/Users\/[^/]+/, "~");

const day = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || "—";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
};

const same = (a: number[], b: number[]) =>
  a.length === b.length && a.every((n, i) => n === b[i]);

const short = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n)}…` : s;

/**
 * 指針 — the bearing. The reader's values drawn as overlapping circles on one
 * sheet; a decision typed in becomes a stone, and where the reader sets it
 * down is their judgment. The sheet reads the placement back — which values
 * it sits in, which it leaves untouched, what the region is called, what the
 * garden has to say about each value — and never scores it. The values are
 * the reader's own file, edited here or by hand.
 */
export default function Bearing() {
  const [data, setData] = useState<Payload | null>(null);
  const [garden, setGarden] = useState<Garden | null>(null);
  const [config, setConfig] = useState<ValuesConfig | null>(null);
  const [bearings, setBearings] = useState<Decision[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [held, setHeld] = useState<number[]>([]);
  const [hov, setHov] = useState<number[]>([]);
  const [pointer, setPointer] = useState<Pt | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [hoverSlug, setHoverSlug] = useState<string | null>(null);
  const [pendingAt, setPendingAt] = useState<Pt | null>(null);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [focus, setFocus] = useState<Focus>(null);
  const [kept, setKept] = useState<"idle" | "saving" | "kept" | "error">(
    "idle",
  );
  const [gone, setGone] = useState<Decision | null>(null);
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
  const saveTimers = useRef(new Map<string, number>());
  const configTimer = useRef<number | null>(null);
  const goneTimer = useRef<number | null>(null);

  bearingsRef.current = bearings;

  // ── data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/bearing", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Payload | null) => {
        if (!p) return;
        setData(p);
        setConfig(p.config);
        setBearings(p.bearings);
      });
    fetch("/api/garden", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((g: Garden | null) => g && setGarden(g));
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const layout = config ? LAYOUTS[config.layout] : null;
  const values = useMemo(() => config?.values ?? [], [config]);
  const writable = data?.writable ?? false;

  const stones = useMemo(() => {
    const m = new Map<string, GardenNode[]>();
    if (!garden) return m;
    for (const v of values) m.set(v.id, stonesFor(v, garden.nodes, 999));
    return m;
  }, [garden, values]);

  const motes = useMemo(() => {
    if (!garden) return ["", ""];
    return garden.nodes
      .filter((n) => n.modified && n.kind !== "ghost" && n.kind !== "repo")
      .sort((a, b) => (b.modified! > a.modified! ? 1 : -1))
      .slice(0, 2)
      .map((n) => n.label);
  }, [garden]);

  const current = useMemo(
    () => bearings.find((b) => b.slug === selected) ?? null,
    [bearings, selected],
  );

  useEffect(() => {
    setNote(current?.note ?? "");
  }, [current?.slug, current?.note]);

  /** Which circles are lit: the ones under the pointer, else the held region. */
  const lit = hov.length ? hov : held;

  // ── writes: decisions ───────────────────────────────────────────────────
  const save = useCallback(
    async (b: Decision) => {
      if (!writable) return;
      const res = await fetch("/api/bearing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(b),
      });
      if (!res.ok) return;
      const saved = (await res.json()) as Decision;
      setBearings((bs) => bs.map((x) => (x.slug === saved.slug ? saved : x)));
    },
    [writable],
  );

  /** A write that can wait: arrow keys would otherwise write once per press. */
  const saveSoon = useCallback(
    (b: Decision) => {
      const t = saveTimers.current.get(b.slug);
      if (t) window.clearTimeout(t);
      saveTimers.current.set(
        b.slug,
        window.setTimeout(() => {
          saveTimers.current.delete(b.slug);
          save(b);
        }, 500),
      );
    },
    [save],
  );

  const create = useCallback(
    async (title: string, at: Pt | null) => {
      const t = title.trim();
      if (!t) return;
      let b: Decision = {
        slug: slugOf(t),
        title: t,
        placed: today(),
        since: today(),
        at,
        leads: null,
        note: "",
        trail: [],
      };
      if (writable) {
        const res = await fetch("/api/bearing", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: t, at }),
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
      setPendingAt(null);
      setDraft("");
    },
    [writable],
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
      const b = bearingsRef.current.find((x) => x.slug === slug);
      if (!b) return;
      if (writable)
        await fetch(`/api/bearing?slug=${encodeURIComponent(slug)}`, {
          method: "DELETE",
        });
      setBearings((bs) => bs.filter((x) => x.slug !== slug));
      setSelected((s) => (s === slug ? null : s));
      setGone(b);
      if (goneTimer.current) window.clearTimeout(goneTimer.current);
      goneTimer.current = window.setTimeout(() => setGone(null), 9000);
    },
    [writable],
  );

  const putBack = useCallback(async () => {
    if (!gone) return;
    const b = gone;
    setGone(null);
    if (writable) {
      const res = await fetch("/api/bearing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(b),
      });
      if (!res.ok) return;
    }
    setBearings((bs) => [b, ...bs.filter((x) => x.slug !== b.slug)]);
    setSelected(b.slug);
  }, [gone, writable]);

  // ── writes: the values ──────────────────────────────────────────────────
  const updateConfig = useCallback(
    (next: ValuesConfig) => {
      setConfig(next);
      if (!writable) return;
      setKept("saving");
      if (configTimer.current) window.clearTimeout(configTimer.current);
      configTimer.current = window.setTimeout(async () => {
        const res = await fetch("/api/bearing", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ config: next }),
        });
        setKept(res.ok ? "kept" : "error");
        if (res.ok) setData((d) => (d ? { ...d, own: true } : d));
      }, 700);
    },
    [writable],
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
    const b = bearingsRef.current.find((x) => x.slug === slug);
    const start = toFrame(e);
    dragRef.current = {
      slug,
      part,
      moved: false,
      start,
      last: start,
      origin: b?.[part] ?? null,
    };
    skipClick.current = true;
    setSelected(slug);
    setHeld([]);
    setPendingAt(null);
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
      d.last = at;
      patch(d.slug, { [d.part]: at }, false);
      setHov(slotsAt(layout, at));
      setPointer(null);
      if (dragging !== d.slug) setDragging(d.slug);
      return;
    }
    setPointer(p);
    setHov(slotsAt(layout, p));
  };

  const onUp = (e: ReactPointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    setDragging(null);
    try {
      svgRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (!d.moved) return;
    const b = bearingsRef.current.find((x) => x.slug === d.slug);
    if (!b) return;
    const next =
      d.part === "at"
        ? setDown({ ...b, at: d.origin }, d.last, today())
        : { ...b, leads: d.last };
    setBearings((bs) => bs.map((x) => (x.slug === next.slug ? next : x)));
    save(next);
  };

  const onLeave = () => {
    pointerRef.current = null;
    if (dragRef.current) return;
    setPointer(null);
    setHov([]);
  };

  /** Click a region to hold it lit; click it again, or the paper, to let go. */
  const onClick = (e: ReactMouseEvent) => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    if (!layout || !config) return;
    const s = slotsAt(layout, toFrame(e));
    if (s.length === 0) {
      setHeld([]);
      setSelected(null);
      setPendingAt(null);
      return;
    }
    setHeld((h) => (same(h, s) ? [] : s));
    if (editing)
      setFocus(
        s.length === 1
          ? { kind: "value", key: config.values[s[0]].id }
          : { kind: "region", key: keyOf(s.map((i) => config.values[i].id)) },
      );
  };

  /** Double-click where a decision sits; then say what it is. */
  const onDoubleClick = (e: ReactMouseEvent) => {
    if (!layout) return;
    const p = toFrame(e);
    setPendingAt([
      clamp(p[0], EDGE.x0, EDGE.x1),
      clamp(p[1], EDGE.y0, EDGE.y1),
    ]);
    setSelected(null);
    setHeld([]);
    input.current?.focus();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;
      if (e.key === "Escape") {
        if (pendingAt) setPendingAt(null);
        else {
          setSelected(null);
          setHeld([]);
        }
        (e.target as HTMLElement)?.blur?.();
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        input.current?.focus();
      } else if (
        !typing &&
        selected &&
        layout &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        const b = bearingsRef.current.find((x) => x.slug === selected);
        if (!b?.at) return;
        e.preventDefault();
        const step = e.shiftKey ? 16 : 4;
        const dx =
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy =
          e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        const next = setDown(
          b,
          [
            clamp(b.at[0] + dx, EDGE.x0, EDGE.x1),
            clamp(b.at[1] + dy, EDGE.y0, EDGE.y1),
          ],
          today(),
        );
        setBearings((bs) => bs.map((x) => (x.slug === next.slug ? next : x)));
        saveSoon(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingAt, selected, layout, saveSoon]);

  // ── the motes: the two freshest stones, passing through ─────────────────
  useEffect(() => {
    if (!garden || !layout || reduce) return;
    const ms: Mote[] = [
      { x: 120, y: 560, vx: 32, vy: -22 },
      { x: 800, y: 120, vx: -27, vy: 30 },
    ];
    const hues = layout.slots.map((_, i) => values[i]?.hue ?? i);
    let raf = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      if (last === null) last = now;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const pt = pointerRef.current;
      ms.forEach((m, i) => {
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
            inside.length ? `var(--value-${hues[inside[0]]})` : "var(--faint)",
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
  }, [garden, layout, reduce, values]);

  // ── readings ────────────────────────────────────────────────────────────
  const placed = bearings.filter((b) => b.at);
  const unplaced = bearings.filter((b) => !b.at);
  const currentAt = current?.at && layout ? slotsAt(layout, current.at) : null;
  const currentLeads =
    current?.leads && layout ? slotsAt(layout, current.leads) : null;
  const captionIds = hov.length ? hov : held.length ? held : null;
  const captionRegion =
    captionIds && config ? regionName(captionIds, config) : null;
  const captionKey =
    captionIds && config
      ? keyOf(captionIds.map((i) => config.values[i].id))
      : null;
  const isHeld = captionIds !== null && hov.length === 0;
  const hueOf = (i: number) => `var(--value-${values[i]?.hue ?? i})`;
  const litColour =
    captionIds && captionIds.length === 1 ? hueOf(captionIds[0]) : null;
  const pendingIds = pendingAt && layout ? slotsAt(layout, pendingAt) : null;

  const stoneLinks = (list: GardenNode[], n: number) => (
    <ul className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
      {list.slice(0, n).map((node) => (
        <li key={node.id}>
          <Link
            href={`/catalogue?id=${encodeURIComponent(node.id)}`}
            className="b-stone-link text-[12px]"
            style={{ color: "var(--muted)" }}
          >
            {short(node.label, 36)}
          </Link>
        </li>
      ))}
    </ul>
  );

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
          <div className="flex flex-wrap items-center gap-2">
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {/* ── the sheet ─────────────────────────────────────────────── */}
          <section
            className="panel sketched rise relative self-start p-2 sm:p-3"
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
              <BearingSheet
                layout={layout}
                config={config}
                bearings={bearings}
                selected={selected}
                hoverSlug={hoverSlug}
                lit={lit}
                pointer={pointer}
                dragging={dragging}
                pendingAt={pendingAt}
                editing={editing}
                reduce={reduce}
                motes={motes}
                svgRef={svgRef}
                moteEls={moteEls}
                moteTxt={moteTxt}
                onMove={onMove}
                onUp={onUp}
                onLeave={onLeave}
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                beginDrag={beginDrag}
              />
            )}

            {/* the caption: what is under the pointer, or held */}
            <div
              className="relative mt-2 min-h-[4.6rem] pl-3"
              style={{
                borderLeft: `2px solid ${litColour ?? (captionIds ? "var(--accent)" : "var(--rule)")}`,
                transition: "border-color 220ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              aria-live="polite"
            >
              {!captionIds || !config ? (
                <>
                  <div className="meta" style={{ color: "var(--faint)" }}>
                    𝒰 · your values
                  </div>
                  <p
                    className="hand mt-1 text-[15px] leading-[1.3]"
                    style={{ color: "var(--muted)" }}
                  >
                    hover a value to read it, click a region to hold it.
                    double-click where a decision sits, or type one on the right
                    and drag its stone in — the sheet reads the placement back.
                    arrow keys nudge the chosen stone.
                  </p>
                </>
              ) : captionIds.length === 1 ? (
                <>
                  <div
                    className="meta"
                    style={{ color: litColour ?? "var(--ink)" }}
                  >
                    {values[captionIds[0]].name || "unnamed"}
                    <span style={{ color: "var(--faint)" }}>
                      {" "}
                      · {stones.get(values[captionIds[0]].id)?.length ?? 0}{" "}
                      stones in the garden
                      {isHeld ? " · held" : " · click to hold"}
                    </span>
                  </div>
                  <p
                    className="mt-1 text-[13px] leading-[1.55]"
                    style={{ color: "var(--ink)" }}
                  >
                    {values[captionIds[0]].blurb || "no words for it yet."}
                  </p>
                </>
              ) : (
                <>
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    {expression(captionIds, values)}
                    <span style={{ color: "var(--faint)" }}>
                      {"  "}
                      {captionIds.map((i) => values[i].name).join(" · ")}
                      {isHeld ? " · held" : ""}
                    </span>
                  </div>
                  {captionRegion ? (
                    <>
                      <div
                        className="display mt-0.5 text-[21px] leading-[1.15]"
                        style={{ color: "var(--ink)" }}
                      >
                        {captionRegion.name}
                      </div>
                      <p
                        className="hand mt-0.5 text-[15px] leading-[1.3]"
                        style={{ color: "var(--muted)" }}
                      >
                        {captionRegion.blurb}
                      </p>
                    </>
                  ) : (
                    <p
                      className="hand mt-1 text-[15px] leading-[1.3]"
                      style={{ color: "var(--muted)" }}
                    >
                      rare air — a region you have not named yet.
                      {isHeld && captionKey && (
                        <>
                          {" "}
                          <button
                            onClick={() => {
                              setEditing(true);
                              setFocus({ kind: "region", key: captionKey });
                            }}
                            className="b-inline"
                            style={{ color: "var(--accent)" }}
                          >
                            name it
                          </button>
                        </>
                      )}
                    </p>
                  )}
                </>
              )}
            </div>
          </section>

          {/* ── the desk ──────────────────────────────────────────────── */}
          <aside
            className="rise flex flex-col gap-6"
            style={{ animationDelay: "140ms" }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                create(draft, pendingAt);
              }}
            >
              <label
                className="meta block"
                htmlFor="bearing-draft"
                style={{ color: pendingAt ? "var(--accent)" : "var(--faint)" }}
              >
                {pendingAt
                  ? `name the stone at ${pendingIds?.length ? expression(pendingIds, values) : "the edge"}`
                  : "set a decision down"}
              </label>
              <input
                id="bearing-draft"
                ref={input}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  pendingAt
                    ? "what is it?  enter to set it down"
                    : "the thing you are weighing  /"
                }
                className="search mt-2 w-full px-3 py-2 text-[13px]"
                autoComplete="off"
                maxLength={200}
              />
              <p
                className="hand mt-1.5 text-[13.5px] leading-[1.3]"
                style={{ color: "var(--faint)" }}
              >
                {pendingAt
                  ? "esc to think again."
                  : "enter, then drag the stone to where it sits. outside every circle is allowed to be the honest answer."}
              </p>
            </form>

            {/* the reading of the chosen decision */}
            {current && config && (
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
                    {regionName(currentAt, config) && currentAt.length > 1 && (
                      <div
                        className="display mt-1 text-[20px] leading-[1.15]"
                        style={{ color: "var(--ink)" }}
                      >
                        {regionName(currentAt, config)!.name}
                      </div>
                    )}
                    <p
                      className="mt-1.5 text-[13px] leading-[1.55]"
                      style={{ color: "var(--ink)" }}
                    >
                      {prose(currentAt, values)}
                    </p>
                    {current.trail.length > 0 && (
                      <p
                        className="hand mt-1.5 text-[13.5px] leading-[1.3]"
                        style={{ color: "var(--faint)" }}
                      >
                        moved {current.trail.length}{" "}
                        {current.trail.length === 1 ? "time" : "times"} since{" "}
                        {day(current.placed)} · here since {day(current.since)}
                      </p>
                    )}

                    {current.leads && currentLeads ? (
                      <div className="mt-3 border-t pt-3 rule">
                        <div
                          className="meta"
                          style={{ color: "var(--accent)" }}
                        >
                          → leads into{" "}
                          {currentLeads.length
                            ? expression(currentLeads, values)
                            : "no value"}
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
                              <div className="meta" style={{ color: hueOf(i) }}>
                                {v.name}
                                <span style={{ color: "var(--faint)" }}>
                                  {" "}
                                  ·{" "}
                                  {list.length
                                    ? `${list.length} stones`
                                    : "nothing yet"}
                                </span>
                              </div>
                              {list.length > 0 && stoneLinks(list, 5)}
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
                    set down {day(current.placed)}
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

            {gone && (
              <div
                className="fade flex items-center justify-between gap-3 border-t border-b py-2 rule"
                role="status"
              >
                <span
                  className="hand min-w-0 flex-1 text-[14px]"
                  style={{
                    color: "var(--muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  let go of “{gone.title}”
                </span>
                <button
                  onClick={putBack}
                  className="meta shrink-0"
                  style={{ color: "var(--accent)" }}
                >
                  put it back
                </button>
              </div>
            )}

            {/* every decision on the sheet */}
            {bearings.length > 0 && (
              <section aria-label="Decisions">
                <div className="meta" style={{ color: "var(--faint)" }}>
                  decisions · {placed.length} placed
                  {unplaced.length ? ` · ${unplaced.length} waiting` : ""}
                </div>
                <ul
                  className="mt-1.5"
                  onPointerLeave={() => setHoverSlug(null)}
                >
                  {bearings.map((b) => {
                    const ids = b.at && layout ? slotsAt(layout, b.at) : null;
                    const on = b.slug === selected;
                    return (
                      <li key={b.slug}>
                        <button
                          onClick={() => setSelected(on ? null : b.slug)}
                          onPointerEnter={() => setHoverSlug(b.slug)}
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
                              className="hand block text-[15px] leading-[1.25]"
                              style={{
                                color: on ? "var(--ink)" : "var(--muted)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
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
                            {ids
                              ? ids.length
                                ? expression(ids, values)
                                : "outside"
                              : "waiting"}
                            <span style={{ opacity: 0.7 }}>
                              {" "}
                              · {day(b.since || b.placed)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* the values, and where they come from */}
            {config &&
              (editing ? (
                <ValuesEditor
                  config={config}
                  onChange={updateConfig}
                  focus={focus}
                  state={kept}
                  dir={data?.dir ?? null}
                  writable={writable}
                  onDone={() => {
                    setEditing(false);
                    setFocus(null);
                  }}
                />
              ) : (
                <section aria-label="Values">
                  <div className="flex items-center justify-between">
                    <div className="meta" style={{ color: "var(--faint)" }}>
                      the values
                    </div>
                    <button
                      onClick={() => setEditing(true)}
                      className="chip px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--muted)",
                      }}
                    >
                      edit
                    </button>
                  </div>
                  <ul className="mt-1.5">
                    {values.map((v, i) => {
                      const on = same(held, [i]);
                      return (
                        <li key={v.id}>
                          <button
                            onClick={() => setHeld(on ? [] : [i])}
                            onPointerEnter={() =>
                              !dragRef.current && setHov([i])
                            }
                            onPointerLeave={() =>
                              !dragRef.current && setHov([])
                            }
                            className="b-row flex w-full items-center gap-2 py-1 text-left"
                            aria-pressed={on}
                          >
                            <span
                              aria-hidden
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: 99,
                                background: hueOf(i),
                              }}
                            />
                            <span className="relative">
                              <span
                                className="text-[13px]"
                                style={{
                                  color: on ? "var(--ink)" : "var(--muted)",
                                }}
                              >
                                {v.name || "unnamed"}
                              </span>
                              {on && (
                                <Sketch
                                  kind="ring"
                                  seed={v.id}
                                  color={hueOf(i)}
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
                            <div className="mb-2 ml-4">
                              {stoneLinks(stones.get(v.id)!, 8)}
                            </div>
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
                        ? `the sample five. edit them and they become yours, at ${shortHome(data.dir)}/values.json`
                        : "the sample five — a deployed sheet keeps no decisions."}
                  </p>
                </section>
              ))}
          </aside>
        </div>
      </div>
    </main>
  );
}
