"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CALL_LABEL,
  HOW_LABEL,
  HOW_MANY,
  MOVEDS,
  MOVED_LABEL,
  ONES,
  ONE_LABEL,
  TOUCH_MAX,
  USES,
  USE_LABEL,
  canonFrom,
  dayWords,
  dayYear,
  daysBetween,
  proposals,
  readings,
  recordReadings,
  sinceKept,
  spanOf,
  takeIn,
  tally,
  toggleOut,
  toggleTouch,
  type Canon as C,
  type Kept,
  type Member,
  type Proposal,
  type Root,
  type Strand,
} from "@/lib/canon";
import { CANON_HOLDS, CANON_WORDS } from "@/content/canon";
import { rand, ribbon, roughEllipse, seedOf, stroke } from "@/lib/hand";
import { putOnDesk } from "./desk";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

type Payload = {
  canon: C[];
  roots: Root[];
  strand: Strand | null;
  corpus: number;
  writable: boolean;
  dir: string | null;
};

const mono = { fontFamily: "var(--font-mono)" } as const;
const localToday = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const grow = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};
const clip = (s: string, max: number) =>
  s.length <= max ? s : `${s.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="meta" style={{ color: "var(--accent)" }}>
      {children}
    </div>
  );
}

function Chip({
  children,
  on,
  onClick,
  disabled,
  accent,
}: {
  children: React.ReactNode;
  on?: boolean;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className="chip cn-seg px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
      style={{
        ...mono,
        color: accent ? "var(--accent)" : on ? "var(--ink)" : "var(--muted)",
        borderColor: on ? "var(--ink)" : accent ? "var(--accent)" : undefined,
      }}
    >
      {children}
    </button>
  );
}

/** A choice written out as words, the one chosen inked and underlined by hand. */
function Seg<T extends string>({
  options,
  labels,
  value,
  onPick,
  disabled,
  label,
}: {
  options: readonly T[];
  labels: Record<T, string>;
  value: string;
  onPick: (v: T | "") => void;
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
        <span key={o} className="inline-flex items-baseline">
          <button
            onClick={() => onPick(value === o ? "" : o)}
            disabled={disabled}
            aria-pressed={value === o}
            className="cn-seg relative text-[11.5px]"
            style={{
              ...mono,
              letterSpacing: "0.04em",
              color: value === o ? "var(--ink)" : "var(--faint)",
            }}
          >
            {labels[o]}
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

/* ── the drawing ───────────────────────────────────────────────────────── */

const W = 720;
const H = 268;
const AXIS = 150;
const X0 = 30;
const X1 = 640;
const UNDATED_X = 692;
const GAP = 15;
const LANE = 19;

type Placed = { m: Kept; x: number; at: number; y: number; lane: number };

/** Marks along time: what reaches for the root above the line, kin below, stacked where they crowd. */
function layout(c: C): {
  placed: Placed[];
  rootX: number;
  first: string | null;
  last: string | null;
} {
  const days = [c.root.day, ...c.members.map((m) => m.day)]
    .filter((d): d is string => !!d)
    .sort();
  const first = days[0] ?? null;
  const last = days.at(-1) ?? null;
  const span = first && last ? Math.max(1, daysBetween(first, last)) : 1;
  const xOf = (d: string | null) =>
    !d || !first
      ? UNDATED_X
      : first === last
        ? (X0 + X1) / 2
        : X0 + ((X1 - X0) * daysBetween(first, d)) / span;
  const placed: Placed[] = [];
  for (const side of ["up", "down"] as const) {
    const lanes: number[][] = [];
    const max = side === "up" ? 5 : 3;
    const ms = c.members
      .filter((m) => (side === "up" ? m.how !== "kin" : m.how === "kin"))
      .map((m) => ({ m, at: xOf(m.day) }))
      .sort((a, b) => a.at - b.at);
    const free = (xs: number[] | undefined, x: number) =>
      !xs || xs.every((v) => Math.abs(v - x) >= GAP);
    for (const { m, at } of ms) {
      // The nearest free place: the stone's own day in the first lane with room, and
      // when every lane is full there, a step to either side, its stem slanting back to
      // the day it arrived.
      let x = at;
      let lane = -1;
      for (let k = 0; lane === -1 && k < 40; k++) {
        x = at + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * GAP;
        if (x < X0 - 10 || x > UNDATED_X + 10) continue;
        for (let l = 0; l < max; l++)
          if (free(lanes[l], x)) {
            lane = l;
            break;
          }
      }
      if (lane === -1) {
        x = at;
        lane = max - 1;
      }
      (lanes[lane] ??= []).push(x);
      const y = side === "up" ? AXIS - 24 - lane * LANE : AXIS + 28 + lane * LANE;
      placed.push({ m, x, at, y, lane });
    }
  }
  return { placed, rootX: xOf(c.root.day), first, last };
}

function StrandDrawing({
  c,
  offered,
  onTouch,
  writable,
}: {
  c: C;
  offered: Map<string, string>;
  onTouch: (id: string) => void;
  writable: boolean;
}) {
  const seed = seedOf(c.root.id);
  const { placed, rootX, first, last } = useMemo(() => layout(c), [c]);
  const axis = useMemo(() => {
    const r = rand(seed);
    return ribbon(
      stroke([X0 - 12, AXIS], [X1 + 12, AXIS], r, 1.2, 4),
      1.6,
      seed,
    );
  }, [seed]);
  const undated = placed.some((p) => p.at === UNDATED_X);
  // Touchpoints near each other would write over each other; every other one is lifted.
  const touchOrder = new Map(
    placed
      .filter((p) => p.m.touch)
      .sort((a, b) => a.x - b.x)
      .map((p, i) => [p.m.id, i] as const),
  );
  const rootMark = useMemo(
    () => ribbon(roughEllipse(18, 18, seed + 7, { pad: 3 }), 1.8, seed + 7),
    [seed],
  );
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="cn-drawing block h-auto w-full"
      role="img"
      aria-label={`The strand along time: ${c.members.filter((m) => m.how !== "kin").length} reach for ${c.root.label}, drawn above the line; kin by words below`}
    >
      <text x={X0 - 12} y={16} className="cn-side" style={mono}>
        reach for it
      </text>
      <text x={X0 - 12} y={H - 8} className="cn-side" style={mono}>
        kin by words
      </text>
      <path d={axis} fill="var(--ink)" opacity={0.55} />
      {undated && (
        <text
          x={UNDATED_X}
          y={AXIS + 14}
          textAnchor="middle"
          className="cn-tick"
          style={mono}
        >
          undated
        </text>
      )}
      {first && (
        <text
          x={X0}
          y={AXIS + 14}
          textAnchor="start"
          className="cn-tick"
          style={mono}
        >
          {dayYear(first)}
        </text>
      )}
      {last && last !== first && (
        <text
          x={X1}
          y={AXIS + 14}
          textAnchor="end"
          className="cn-tick"
          style={mono}
        >
          {dayYear(last)}
        </text>
      )}
      {placed.map(({ m, x, at, y }) => (
        <line
          key={`s-${m.id}`}
          x1={x}
          y1={y}
          x2={at}
          y2={AXIS}
          stroke="var(--rule)"
          strokeWidth={1}
          opacity={m.out ? 0.4 : 1}
        />
      ))}
      <g transform={`translate(${rootX - 12} ${AXIS - 12})`}>
        <circle cx={12} cy={12} r={6.5} fill="var(--accent)" />
        <path d={rootMark} fill="var(--accent)" />
      </g>
      <text
        x={Math.min(Math.max(rootX, 80), W - 80)}
        y={AXIS + 34}
        textAnchor="middle"
        className="cn-root-label hand"
      >
        {clip(c.root.label, 30)}
      </text>
      {placed.map(({ m, x, y }) => {
        const kin = m.how === "kin";
        const lift = (touchOrder.get(m.id) ?? 0) % 2 ? 12 : 0;
        const filled = m.how === "links" || m.how === "names";
        const offer = offered.get(m.id);
        const s = seedOf(m.id);
        return (
          <g
            key={m.id}
            className={`cn-mark${writable ? " cn-mark-live" : ""}`}
            opacity={m.out ? 0.28 : 1}
            onClick={writable ? () => onTouch(m.id) : undefined}
          >
            <title>
              {`${m.label} · ${HOW_LABEL[m.how]} · ${m.day ? dayYear(m.day) : "undated"}${m.approx ? " (last change)" : ""}${m.touch ? " · a touchpoint" : offer ? ` · offered: ${offer}` : ""}${m.out ? " · struck" : ""}`}
            </title>
            <circle cx={x} cy={y} r={11} fill="transparent" />
            <circle
              cx={x}
              cy={y}
              r={4.2}
              fill={
                filled
                  ? m.how === "links"
                    ? "var(--ink)"
                    : "var(--muted)"
                  : "var(--surface)"
              }
              stroke={kin ? "var(--faint)" : "var(--ink)"}
              strokeWidth={1.2}
              strokeDasharray={m.approx ? "1.6 1.6" : undefined}
            />
            {m.touch && (
              <path
                d={ribbon(roughEllipse(14, 14, s, { pad: 2 }), 1.5, s)}
                transform={`translate(${x - 7} ${y - 7})`}
                fill="var(--accent)"
              />
            )}
            {!m.touch && offer && !m.out && (
              <circle
                cx={x}
                cy={y}
                r={9}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={1}
                strokeDasharray="2.2 2.4"
                opacity={0.8}
              />
            )}
            {m.touch && (
              <text
                x={x}
                y={kin ? y + 22 + lift : y - 14 - lift}
                textAnchor={x < 110 ? "start" : x > W - 110 ? "end" : "middle"}
                className="cn-touch-label hand"
              >
                {clip(m.label, 24)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** The small ring beside a stone's row: inked when a touchpoint, dashed when offered. */
function Ring({ touch, offered }: { touch: boolean; offered: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width={18} height={18} aria-hidden>
      <circle
        cx={10}
        cy={10}
        r={6.5}
        fill={touch ? "var(--accent)" : "none"}
        stroke={touch || offered ? "var(--accent)" : "var(--faint)"}
        strokeWidth={1.3}
        strokeDasharray={!touch && offered ? "2 2.2" : undefined}
      />
    </svg>
  );
}

/* ── the view ──────────────────────────────────────────────────────────── */

/**
 * The canon: which stories the garden tells. A root — a stone many others
 * reach for — and its strand drawn along time: what reaches for it above
 * the line, kin by words below. The reader marks touchpoints, strikes what
 * is not the story, answers three questions in their own words, writes the
 * story, and makes the call: in the canon, or left out. The desk reads the
 * strand back, keeps the canon, lists the roots, and says what it holds to.
 */
export default function Canon() {
  const [theme, setTheme] = useTheme();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [open, setOpen] = useState<C | null>(null);
  const [live, setLive] = useState<Strand | null>(null);
  const [kept, setKept] = useState(false);
  const [trouble, setTrouble] = useState<string | null>(null);
  const [sure, setSure] = useState(false);
  const [q, setQ] = useState("");
  const [allRoots, setAllRoots] = useState(false);
  const openRef = useRef<C | null>(null);
  const keptRef = useRef(false);
  const slugRef = useRef("");
  const liveRef = useRef<Strand | null>(null);
  const saving = useRef<Promise<void>>(Promise.resolve());
  openRef.current = open;
  keptRef.current = kept;
  liveRef.current = live;
  const writable = payload?.writable ?? false;

  const fresh = useCallback((s: Strand) => {
    slugRef.current = "";
    setKept(false);
    setSure(false);
    setLive(s);
    setOpen(canonFrom(s, localToday()));
  }, []);

  const fetchStrand = useCallback(
    async (id: string): Promise<Strand | null> => {
      try {
        const r = await fetch(`/api/canon?root=${encodeURIComponent(id)}`);
        if (!r.ok) return null;
        const pl = (await r.json()) as Payload;
        return pl.strand;
      } catch {
        return null;
      }
    },
    [],
  );

  const load = useCallback(
    (c: C, canFetch: boolean) => {
      slugRef.current = c.slug;
      setKept(true);
      setSure(false);
      setTrouble(null);
      setOpen(c);
      setLive(null);
      if (canFetch)
        void fetchStrand(c.root.id).then((s) => {
          if (s && openRef.current?.root.id === c.root.id) setLive(s);
        });
    },
    [fetchStrand],
  );

  const openRoot = useCallback(
    async (id: string, pl: Payload) => {
      const had = pl.canon.find((c) => c.root.id === id);
      if (had) return load(had, pl.writable);
      const s = await fetchStrand(id);
      if (s) fresh(s);
      else setTrouble("that stone has no strand to read");
    },
    [fetchStrand, fresh, load],
  );

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const slug = p.get("slug");
    const id = p.get("root") ?? p.get("id");
    fetch(`/api/canon${id ? `?root=${encodeURIComponent(id)}` : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((pl: Payload | null) => {
        if (!pl) return setTrouble("the canon could not be read");
        setPayload(pl);
        const wanted = slug ? pl.canon.find((c) => c.slug === slug) : null;
        const had = id ? pl.canon.find((c) => c.root.id === id) : null;
        if (wanted) load(wanted, pl.writable);
        else if (had) load(had, pl.writable);
        else if (pl.strand) fresh(pl.strand);
        else if (pl.canon[0]) load(pl.canon[0], pl.writable);
        else if (pl.roots[0]) void openRoot(pl.roots[0].id, pl);
      })
      .catch(() => setTrouble("the canon could not be read"));
  }, [fresh, load, openRoot]);

  const loaded = payload !== null;
  useEffect(() => {
    if (!loaded || !open) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("id");
    if (kept && open.slug) {
      url.searchParams.set("slug", open.slug);
      url.searchParams.delete("root");
    } else {
      url.searchParams.delete("slug");
      url.searchParams.set("root", open.root.id);
    }
    window.history.replaceState(null, "", url);
    putOnDesk({
      kind: "canon",
      id: kept ? open.slug : open.root.id,
      label: open.name,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, kept, open?.slug, open?.root.id, open?.name]);
  useEffect(() => () => putOnDesk(null), []);

  /* ── keeping ─────────────────────────────────────────────────────────── */

  const save = useCallback(
    (c: C) =>
      new Promise<C | null>((resolve) => {
        saving.current = saving.current.then(async () => {
          const isFresh = !slugRef.current;
          const s = liveRef.current;
          const body =
            s && s.root.id === c.root.id
              ? { ...c, threads: s.threads, builds: s.builds }
              : c;
          try {
            const r = await fetch("/api/canon", {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                canon: {
                  ...body,
                  slug: slugRef.current || "",
                  touched: localToday(),
                },
                fresh: isFresh,
              }),
            });
            const out = (await r.json().catch(() => null)) as
              C | { error: string } | null;
            if (!r.ok || !out || "error" in out) {
              setTrouble(
                out && "error" in out ? out.error : `not kept (${r.status})`,
              );
              return resolve(null);
            }
            slugRef.current = out.slug;
            setKept(true);
            setTrouble(null);
            setOpen((cur) =>
              cur && cur.root.id === out.root.id
                ? {
                    ...cur,
                    slug: out.slug,
                    put: out.put,
                    touched: out.touched,
                    threads: out.threads,
                    builds: out.builds,
                  }
                : cur,
            );
            setPayload((p) =>
              p
                ? {
                    ...p,
                    canon: p.canon.some((x) => x.slug === out.slug)
                      ? p.canon.map((x) => (x.slug === out.slug ? out : x))
                      : [out, ...p.canon],
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

  const patch = useCallback((p: Partial<C>) => {
    setOpen((cur) => (cur ? { ...cur, ...p } : cur));
  }, []);
  /** Change, and if the strand is already kept, keep the change. */
  const set = useCallback(
    (next: C) => {
      setOpen(next);
      if (keptRef.current && writable) void save(next);
    },
    [save, writable],
  );
  const commit = useCallback(() => {
    const c = openRef.current;
    if (c && keptRef.current && writable) void save(c);
  }, [save, writable]);

  const touch = useCallback(
    (id: string) => {
      const c = openRef.current;
      if (!c || !writable) return;
      const next = toggleTouch(c, id);
      if (next === c)
        return setTrouble(
          `${TOUCH_MAX} touchpoints at most — let one go first`,
        );
      setTrouble(null);
      set(next);
    },
    [set, writable],
  );
  const strike = (id: string) => {
    const c = openRef.current;
    if (c && writable) set(toggleOut(c, id));
  };
  const call = (k: "in" | "out" | "") => {
    const c = openRef.current;
    if (!c || !writable) return;
    const next = { ...c, call: k, called: k ? localToday() : "" };
    setOpen(next);
    void save(next);
  };
  const keepIt = () => {
    const c = openRef.current;
    if (c && writable) void save(c);
  };
  const remove = async () => {
    const c = openRef.current;
    if (!c || !kept || !writable) return;
    if (!sure) return setSure(true);
    const r = await fetch(`/api/canon?slug=${encodeURIComponent(c.slug)}`, {
      method: "DELETE",
    });
    if (!r.ok) return setTrouble(`not taken off (${r.status})`);
    setPayload((p) =>
      p ? { ...p, canon: p.canon.filter((x) => x.slug !== c.slug) } : p,
    );
    const s = liveRef.current;
    if (s && s.root.id === c.root.id) fresh(s);
    else setOpen(null);
  };

  /* ── what the sheet reads ────────────────────────────────────────────── */

  const liveBy = useMemo(
    () => new Map((live?.members ?? []).map((m) => [m.id, m])),
    [live],
  );
  const since = useMemo(
    () =>
      kept && open && live && live.root.id === open.root.id
        ? sinceKept(open, live)
        : null,
    [kept, open, live],
  );
  const offered: Proposal[] = useMemo(() => {
    if (!open) return [];
    const skip = new Set(
      open.members.filter((m) => m.touch || m.out).map((m) => m.id),
    );
    return proposals(
      open.members.map((m) => ({
        id: m.id,
        day: m.day,
        approx: m.approx,
        reached: liveBy.get(m.id)?.reached ?? 0,
        threads: liveBy.get(m.id)?.threads ?? 0,
      })),
      skip,
    );
  }, [open, liveBy]);
  const offeredMap = useMemo(
    () => new Map(offered.map((p) => [p.id, p.because])),
    [offered],
  );
  const words = useMemo(() => {
    if (!open) return [];
    const r = readings(open, since);
    return kept ? r : r.filter((l) => l !== "not called yet");
  }, [open, since, kept]);
  const canon = payload?.canon ?? [];
  const roots = payload?.roots ?? [];
  const record = useMemo(
    () =>
      recordReadings(tally(canon, roots), roots.length, payload?.corpus ?? 0),
    [canon, roots, payload?.corpus],
  );
  const callOf = useMemo(
    () => new Map(canon.map((c) => [c.root.id, c.call || "looked"])),
    [canon],
  );
  const shownRoots = useMemo(() => {
    const t = q.trim().toLowerCase();
    const hit = t
      ? roots.filter((r) => r.label.toLowerCase().includes(t))
      : roots;
    return allRoots || t ? hit : hit.slice(0, 18);
  }, [roots, q, allRoots]);

  const span = open ? spanOf(open) : null;
  const reachingN = open
    ? open.members.filter((m) => m.how !== "kin").length
    : 0;
  const kinN = open ? open.members.length - reachingN : 0;
  const touchN = open ? open.members.filter((m) => m.touch).length : 0;
  const threads =
    live && open && live.root.id === open.root.id
      ? live.threads
      : (open?.threads ?? 0);
  const builds =
    live && open && live.root.id === open.root.id
      ? live.builds
      : (open?.builds ?? []);

  const groups: [string, C[]][] = [
    ["in the canon", canon.filter((c) => c.call === "in")],
    ["not called", canon.filter((c) => !c.call)],
    ["left out", canon.filter((c) => c.call === "out")],
  ];

  return (
    <main className="cn scroll-thin relative h-dvh w-full overflow-y-auto">
      <div className="mx-auto max-w-[80rem] px-5 pb-24 sm:px-10">
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
                canon
              </div>
              <p
                className="hand mt-1 max-w-[27rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                {CANON_WORDS.blurb}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/canon" />
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          {/* ── the sheet ───────────────────────────────────────────────── */}
          <section
            className="panel sketched rise relative min-w-0 p-5 sm:p-7"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The strand"
          >
            <Sketch seed="canon-sheet" draw />
            {!open ? (
              <p className="hand text-[17px]" style={{ color: "var(--muted)" }}>
                {trouble ?? "reading the garden…"}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Label>the strand</Label>
                  <span
                    className="meta"
                    style={{ color: "var(--faint)", textTransform: "none" }}
                  >
                    {kept
                      ? `kept ${dayWords(open.put)}${open.call ? ` · ${CALL_LABEL[open.call]}` : ""}`
                      : "looked at, not kept"}
                  </span>
                </div>
                <textarea
                  ref={(el) => grow(el)}
                  onInput={(e) => grow(e.currentTarget)}
                  value={open.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  onBlur={commit}
                  readOnly={!writable}
                  rows={1}
                  aria-label="The strand, in your words"
                  className="display cn-case mt-2 w-full resize-none overflow-hidden bg-transparent px-0 py-1 text-[26px] leading-[1.2] sm:text-[31px]"
                  style={{ color: "var(--ink)" }}
                />
                <p
                  className="mt-2 text-[13px] leading-[1.55]"
                  style={{ color: "var(--muted)" }}
                >
                  grown from{" "}
                  {writable ? (
                    <Link
                      href={`/catalogue?id=${encodeURIComponent(open.root.id)}`}
                      className="cn-link"
                      style={{ color: "var(--ink)" }}
                    >
                      {open.root.label}
                    </Link>
                  ) : (
                    <span style={{ color: "var(--ink)" }}>
                      {open.root.label}
                    </span>
                  )}
                  {" · "}
                  {reachingN} reach for it · {kinN} kin by words
                  {open.root.day
                    ? ` · on record since ${dayYear(open.root.day)}${open.root.approx ? " (last change)" : ""}`
                    : ""}
                </p>
                {!writable && (
                  <p
                    className="hand mt-2 text-[14.5px]"
                    style={{ color: "var(--faint)" }}
                  >
                    {CANON_WORDS.specimen}
                  </p>
                )}

                <div className="mt-5 -mx-1 overflow-x-auto">
                  <div className="min-w-[34rem] px-1">
                    <StrandDrawing
                      c={open}
                      offered={offeredMap}
                      onTouch={touch}
                      writable={writable}
                    />
                  </div>
                </div>
                <p
                  className="meta mt-1"
                  style={{
                    color: "var(--faint)",
                    textTransform: "none",
                    letterSpacing: "0.04em",
                  }}
                >
                  {reachingN} reach for it, above the line · {kinN} kin by
                  words, below · {touchN} touchpoints ringed
                  {offered.length ? ` · ${offered.length} offered, dashed` : ""}
                  {span?.first && span.last
                    ? ` · ${dayWords(span.first)} → ${dayWords(span.last)}`
                    : ""}
                  {writable ? " · click a stone to ring it" : ""}
                </p>

                {/* ── the stones ─────────────────────────────────────────── */}
                <div className="mt-7">
                  <Label>the stones</Label>
                  <ol className="mt-2 flex flex-col">
                    {open.members.map((m, i) => {
                      const offer = offeredMap.get(m.id);
                      const lm: Member | undefined = liveBy.get(m.id);
                      return (
                        <li
                          key={m.id}
                          className="cn-row grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-2 py-2"
                          style={{
                            borderTop: "1px solid var(--rule)",
                            ["--i" as string]: Math.min(i, 16),
                            opacity: m.out ? 0.5 : 1,
                          }}
                        >
                          <button
                            onClick={() => touch(m.id)}
                            disabled={!writable || m.out}
                            aria-pressed={m.touch}
                            aria-label={
                              m.touch
                                ? `${m.label}: a touchpoint — let it go`
                                : `${m.label}: make it a touchpoint`
                            }
                            className="cn-ring mt-0.5"
                          >
                            <Ring touch={m.touch} offered={!!offer} />
                          </button>
                          <div className="min-w-0">
                            <div
                              className="text-[14px] leading-[1.4]"
                              style={{
                                color: "var(--ink)",
                                textDecoration: m.out
                                  ? "line-through"
                                  : undefined,
                              }}
                            >
                              {writable ? (
                                <Link
                                  href={`/catalogue?id=${encodeURIComponent(m.id)}`}
                                  className="cn-link"
                                >
                                  {m.label}
                                </Link>
                              ) : (
                                m.label
                              )}
                            </div>
                            <div
                              className="mt-0.5 text-[11.5px] leading-[1.5]"
                              style={{ ...mono, color: "var(--faint)" }}
                            >
                              {HOW_LABEL[m.how]} ·{" "}
                              {m.day ? dayYear(m.day) : "undated"}
                              {m.approx ? " (last change)" : ""}
                              {lm && lm.reached > 0
                                ? ` · ${lm.reached} reach for it`
                                : ""}
                              {lm && lm.shared.length
                                ? ` · shares: ${lm.shared.join(", ")}`
                                : ""}
                            </div>
                            {offer && !m.touch && !m.out && (
                              <div
                                className="hand mt-0.5 text-[14px]"
                                style={{ color: "var(--accent)", opacity: 0.8 }}
                              >
                                offered as a touchpoint: {offer}
                              </div>
                            )}
                          </div>
                          {writable && (
                            <button
                              onClick={() => strike(m.id)}
                              className="cn-link mt-0.5 text-[10.5px]"
                              style={{ ...mono, color: "var(--faint)" }}
                            >
                              {m.out ? "put back" : "not the story"}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                  {since && since.joined.length > 0 && (
                    <div
                      className="cn-arrive mt-4 rounded p-3"
                      style={{ border: "1px dashed var(--rule)" }}
                    >
                      <div className="meta" style={{ color: "var(--faint)" }}>
                        since it was kept
                      </div>
                      <p
                        className="mt-1 text-[13px] leading-[1.55]"
                        style={{ color: "var(--muted)" }}
                      >
                        {since.joined.length} more reach for it:{" "}
                        {since.joined.map((m) => m.label).join(", ")}.
                      </p>
                      {writable && (
                        <div className="mt-2">
                          <Chip onClick={() => set(takeIn(open, since.joined))}>
                            take them in
                          </Chip>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── the three questions ───────────────────────────────── */}
                <div className="mt-8 grid gap-6">
                  {(
                    [
                      {
                        key: "one",
                        q: CANON_WORDS.one,
                        because: `the stones thread each other ${threads} ${threads === 1 ? "time" : "times"}, the root not counted · ${kinN} of ${open.members.length} came in on words alone`,
                        options: ONES,
                        labels: ONE_LABEL,
                        note: "oneNote",
                      },
                      {
                        key: "moved",
                        q: CANON_WORDS.moved,
                        because:
                          span?.first && span.last
                            ? `${dayYear(span.first)} to ${dayYear(span.last)}, ${daysBetween(span.first, span.last)} days · ${touchN} touchpoints along it`
                            : "no day on record",
                        options: MOVEDS,
                        labels: MOVED_LABEL,
                        note: "movedNote",
                      },
                      {
                        key: "use",
                        q: CANON_WORDS.use,
                        because: builds.length
                          ? `put to work in ${builds.length} ${builds.length === 1 ? "build" : "builds"}: ${builds.slice(0, 4).join(", ")}`
                          : "no build reached from the strand",
                        options: USES,
                        labels: USE_LABEL,
                        note: "useNote",
                      },
                    ] as const
                  ).map((row) => (
                    <div key={row.key}>
                      <div
                        className="display text-[19px] leading-[1.25]"
                        style={{ color: "var(--ink)" }}
                      >
                        {row.q}
                      </div>
                      <div
                        className="mt-1 text-[11.5px] leading-[1.5]"
                        style={{ ...mono, color: "var(--faint)" }}
                      >
                        {row.because}
                      </div>
                      <div className="mt-2">
                        <Seg
                          options={row.options}
                          labels={row.labels as Record<string, string>}
                          value={open[row.key]}
                          onPick={(v) => set({ ...open, [row.key]: v } as C)}
                          disabled={!writable}
                          label={row.q}
                        />
                      </div>
                      <textarea
                        ref={(el) => grow(el)}
                        onInput={(e) => grow(e.currentTarget)}
                        value={open[row.note]}
                        onChange={(e) =>
                          patch({ [row.note]: e.target.value } as Partial<C>)
                        }
                        onBlur={commit}
                        readOnly={!writable}
                        rows={1}
                        placeholder={writable ? "in a line, if you want" : ""}
                        aria-label={`${row.q} In your words`}
                        className="hand cn-case mt-2 w-full resize-none overflow-hidden bg-transparent px-0 py-1 text-[16px] leading-[1.35]"
                        style={{ color: "var(--ink)" }}
                      />
                    </div>
                  ))}
                </div>

                {/* ── the story ─────────────────────────────────────────── */}
                <div className="mt-8">
                  <Label>the story</Label>
                  <textarea
                    ref={(el) => grow(el)}
                    onInput={(e) => grow(e.currentTarget)}
                    value={open.story}
                    onChange={(e) => patch({ story: e.target.value })}
                    onBlur={commit}
                    readOnly={!writable}
                    rows={2}
                    placeholder={writable ? CANON_WORDS.story : ""}
                    aria-label="The story, in your words"
                    className="hand cn-case mt-2 w-full resize-none overflow-hidden bg-transparent px-0 py-1 text-[18px] leading-[1.35]"
                    style={{ color: "var(--ink)" }}
                  />
                </div>

                {/* ── the call ──────────────────────────────────────────── */}
                <div className="mt-8 flex flex-wrap items-center gap-2">
                  <Label>the call</Label>
                  <span className="w-2" />
                  <Chip
                    on={open.call === "in"}
                    onClick={() => call(open.call === "in" ? "" : "in")}
                    disabled={!writable}
                  >
                    into the canon
                  </Chip>
                  <Chip
                    on={open.call === "out"}
                    onClick={() => call(open.call === "out" ? "" : "out")}
                    disabled={!writable}
                  >
                    leave it out
                  </Chip>
                  {writable && !kept && (
                    <Chip onClick={keepIt}>
                      keep it on the record, uncalled
                    </Chip>
                  )}
                  {writable && kept && (
                    <Chip onClick={remove} accent={sure}>
                      {sure
                        ? "take it off the record — sure?"
                        : "take it off the record"}
                    </Chip>
                  )}
                </div>
                {trouble && (
                  <p
                    className="hand mt-3 text-[15px]"
                    style={{ color: "var(--accent)" }}
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
              <Sketch seed="canon-reading" draw />
              <Label>the reading</Label>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                {open ? words.join(" · ") : "reading…"}
              </p>
            </section>

            {canon.length > 0 && (
              <section
                className="panel sketched rise relative p-4"
                style={{ borderRadius: 3, animationDelay: "140ms" }}
                aria-label="The canon"
              >
                <Sketch seed="canon-shelf" draw />
                <Label>the canon</Label>
                {groups
                  .filter(([, cs]) => cs.length)
                  .map(([name, cs]) => (
                    <div key={name} className="mt-3">
                      <div className="meta" style={{ color: "var(--faint)" }}>
                        {name} · {cs.length}
                      </div>
                      <ol className="mt-1 flex flex-col">
                        {cs.map((c, i) => {
                          const on = kept && open?.slug === c.slug;
                          const t = c.members.filter((m) => m.touch).length;
                          return (
                            <li
                              key={c.slug}
                              className="cn-row"
                              style={{ ["--i" as string]: i }}
                            >
                              <button
                                onClick={() => load(c, writable)}
                                aria-current={on ? "true" : undefined}
                                className="-mx-1.5 flex w-[calc(100%+0.75rem)] flex-col gap-0.5 rounded px-1.5 py-1.5 text-left"
                              >
                                <span
                                  className="display text-[15.5px] leading-[1.25]"
                                  style={{
                                    color: on ? "var(--accent)" : "var(--ink)",
                                  }}
                                >
                                  {c.name}
                                </span>
                                <span
                                  className="meta"
                                  style={{
                                    color: "var(--faint)",
                                    textTransform: "none",
                                  }}
                                >
                                  {c.members.length} stones · {t}{" "}
                                  {t === 1 ? "touchpoint" : "touchpoints"}
                                  {c.called ? ` · ${dayWords(c.called)}` : ""}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  ))}
              </section>
            )}

            {roots.length > 0 && (
              <section
                className="panel sketched rise relative p-4"
                style={{ borderRadius: 3, animationDelay: "180ms" }}
                aria-label="The roots"
              >
                <Sketch seed="canon-roots" draw />
                <Label>the roots</Label>
                <p
                  className="mt-1 text-[12.5px] leading-[1.5]"
                  style={{ color: "var(--muted)" }}
                >
                  every stone three or more others reach for; the number is how
                  many
                </p>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="find a root"
                  aria-label="Find a root"
                  className="cn-case mt-2 w-full bg-transparent px-0 py-1 text-[13px]"
                  style={{ ...mono, color: "var(--ink)" }}
                />
                <ol className="mt-2 flex flex-col">
                  {shownRoots.map((r, i) => {
                    const on = open?.root.id === r.id;
                    const mark = callOf.get(r.id);
                    return (
                      <li
                        key={r.id}
                        className="cn-row"
                        style={{ ["--i" as string]: Math.min(i, 16) }}
                      >
                        <button
                          onClick={() =>
                            payload && void openRoot(r.id, payload)
                          }
                          aria-current={on ? "true" : undefined}
                          className="-mx-1.5 grid w-[calc(100%+0.75rem)] grid-cols-[2rem_minmax(0,1fr)] items-baseline gap-2 rounded px-1.5 py-1 text-left"
                        >
                          <span
                            className="text-[12px] tabular-nums"
                            style={{ ...mono, color: "var(--faint)" }}
                          >
                            {r.reached}
                          </span>
                          <span
                            className="min-w-0 text-[13.5px] leading-[1.35]"
                            style={{
                              color: on ? "var(--accent)" : "var(--ink)",
                            }}
                          >
                            {r.label}
                            {mark && (
                              <span
                                className="hand ml-2 text-[13px]"
                                style={{ color: "var(--faint)" }}
                              >
                                {mark === "in"
                                  ? "in the canon"
                                  : mark === "out"
                                    ? "left out"
                                    : "looked at"}
                              </span>
                            )}
                            <span className="block text-[10.5px]" style={{ ...mono, color: "var(--faint)" }}>
                              {(["links", "names", "term"] as const)
                                .map((h) => r.by[h] ? `${r.by[h]} ${r.by[h] === 1 ? HOW_LABEL[h] : HOW_MANY[h]}` : "")
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
                {!q.trim() && roots.length > 18 && (
                  <button
                    onClick={() => setAllRoots((v) => !v)}
                    className="cn-link mt-2 text-[11px]"
                    style={{ ...mono, color: "var(--muted)" }}
                  >
                    {allRoots ? "fewer" : `all ${roots.length}`}
                  </button>
                )}
              </section>
            )}

            <section
              className="panel sketched rise relative p-4"
              style={{ borderRadius: 3, animationDelay: "220ms" }}
              aria-label="The record"
            >
              <Sketch seed="canon-record" draw />
              <Label>the record</Label>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                {payload ? record.join(" · ") : "reading…"}
              </p>
            </section>

            <section
              className="panel sketched rise relative p-4"
              style={{ borderRadius: 3, animationDelay: "260ms" }}
              aria-label="What it holds to"
            >
              <Sketch seed="canon-holds" draw />
              <Label>what it holds to</Label>
              <ul className="mt-2 flex flex-col gap-2">
                {CANON_HOLDS.map((h) => (
                  <li
                    key={h}
                    className="text-[13px] leading-[1.55]"
                    style={{ color: "var(--muted)" }}
                  >
                    {h}
                  </li>
                ))}
              </ul>
              {payload?.dir && (
                <p
                  className="mt-3 text-[11px] leading-[1.5]"
                  style={{ ...mono, color: "var(--faint)" }}
                >
                  one file per strand, in the canon folder beside your notes
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
