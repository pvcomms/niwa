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
  DEFAULT_LIFE,
  LAYER_LABEL,
  WHYS,
  WHY_LABEL,
  YEAR_MS,
  ageAt,
  ageWords,
  dayAt,
  domainIdOf,
  emptyEntry,
  endOf,
  formatDay,
  fromU,
  isLayer,
  isSpan,
  midOf,
  momentsOf,
  msAt,
  packRows,
  pan,
  precisionOf,
  readings,
  relate,
  spanWords,
  startOf,
  tally,
  ticksFor,
  timeOf,
  toU,
  validDay,
  wholeOf,
  xOf,
  yearsWords,
  zoom,
  type Again,
  type Domain,
  type Entry,
  type Life,
  type Looms,
  type Moment,
  type Precision,
  type View,
  type Why,
} from "@/lib/chronology";
import { SPECIMEN_ENTRIES, SPECIMEN_LIFE } from "@/content/specimen";
import {
  rand,
  ribbon,
  roughEllipse,
  roughRect,
  seedOf,
  stroke,
} from "@/lib/hand";
import { KIND_LABEL } from "@/lib/palette";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

/** The sheet's frame; its height follows the lanes. */
const W = 1000;
const X0 = 108;
const X1 = 972;
const LANE_H = 28;
const ROW_H = 13;
const STRIP_H = 22;
const MINI_H = 20;

type Payload = {
  life: Life;
  entries: Entry[];
  writable: boolean;
  specimen: boolean;
  dir: string | null;
};
type Layers = {
  world: boolean;
  bump: boolean;
  garden: boolean;
  expected: boolean;
  labels: boolean;
};
type Hover =
  | { kind: "entry"; slug: string; x: number; y: number }
  | { kind: "moment"; day: string; x: number; y: number }
  | { kind: "present"; x: number; y: number };
type Drag =
  | { kind: "pan"; x: number; win: [number, number]; moved: boolean }
  | { kind: "present"; moved: boolean }
  | {
      kind: "entry";
      slug: string;
      x: number;
      day: string;
      until: string | null;
      moved: boolean;
    }
  | { kind: "mini"; x: number; win: [number, number]; moved: boolean };
type Draft = { entry: Entry; fresh: boolean };
type Mark = {
  e: Entry;
  x: number;
  x1: number;
  y: number;
  r: number;
  span: boolean;
  future: boolean;
  expected: boolean;
  color: string;
};
type Label = {
  slug: string;
  x: number;
  y: number;
  text: string;
  anchor: "start" | "middle";
};

const LAYERS_DEFAULT: Layers = {
  world: true,
  bump: true,
  garden: true,
  expected: true,
  labels: true,
};
const LAYERS_KEY = "niwa-chronology-layers";

const REST =
  "double-click the line where something happened; drag the present back and read the line as it stood. nothing here is a verdict.";

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
const todayStr = () => new Date().toISOString().slice(0, 10);
const short = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1)}…` : s;
const shortHome = (p: string) => p.replace(/^\/Users\/[^/]+/, "~");
const DAY_MS = 86_400_000;

/**
 * The chronology: a life as a number line. Above the line, the lanes the
 * reader keeps for the inner life; below it, the ones for the world; over
 * both, the circumstances — what was simply the case, the weather of the
 * era, the dated public events — and, hatched across everything, the
 * stretches the record does not speak for. A day is a mark sized by how
 * large it looms; a stretch is a bar; an entry set down ahead of today is
 * hollow. The present is a line that can be dragged back, and the desk then
 * reads the record as it stood. Under the lanes, the garden's own notes tick
 * the days they speak of. Everything set down is one file in the vault.
 */
export default function Chronology() {
  const [garden, setGarden] = useState<Garden | null>(null);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [own, setOwn] = useState<Entry[]>([]);
  const [ownLife, setOwnLife] = useState<Life>(DEFAULT_LIFE);
  const [showSpecimen, setShowSpecimen] = useState(false);
  const [win, setWin] = useState<[number, number] | null>(null);
  const [present, setPresent] = useState(todayStr);
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [sure, setSure] = useState(false);
  const [query, setQuery] = useState("");
  const [stoneQuery, setStoneQuery] = useState("");
  const [lens, setLens] = useState<string | null>(null);
  const [layers, setLayers] = useState<Layers>(LAYERS_DEFAULT);
  const [lifeOpen, setLifeOpen] = useState(false);
  const [newLane, setNewLane] = useState("");
  const [cap, setCap] = useState<string | null>(null);
  const [kept, setKept] = useState<"idle" | "saving" | "kept" | "error">(
    "idle",
  );
  const [settled, setSettled] = useState(false);
  const [theme, setTheme] = useTheme();

  const svg = useRef<SVGSVGElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const drag = useRef<Drag | null>(null);
  const ownRef = useRef<Entry[]>([]);
  const capTimer = useRef<number | null>(null);
  const keptTimer = useRef<number | null>(null);
  ownRef.current = own;

  const today = todayStr();
  const nowMs = timeOf(today, "mid");

  // ── data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/garden", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((g: Garden | null) => g && setGarden(g));
    fetch("/api/chronology", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Payload | null) => {
        if (!p) return;
        setPayload(p);
        setOwn(p.entries);
        setOwnLife(p.life);
      });
    try {
      const raw = localStorage.getItem(LAYERS_KEY);
      if (raw) setLayers({ ...LAYERS_DEFAULT, ...JSON.parse(raw) });
    } catch {
      /* private window */
    }
    const t = window.setTimeout(() => setSettled(true), 1600);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LAYERS_KEY, JSON.stringify(layers));
    } catch {
      /* private window */
    }
  }, [layers]);

  // what is asked for in the address
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const stone = q.get("stone");
    if (stone) setLens(stone);
    const id = q.get("id");
    if (id) setSelected(id);
  }, []);

  const specimen = showSpecimen || payload?.specimen === true;
  const entries = specimen ? SPECIMEN_ENTRIES : own;
  const life = specimen ? SPECIMEN_LIFE : ownLife;
  const writable = payload?.writable === true && !showSpecimen;

  const nodes = useMemo(() => {
    const m = new Map<string, GardenNode>();
    for (const n of garden?.nodes ?? []) m.set(n.id, n);
    return m;
  }, [garden]);

  // ── the line ────────────────────────────────────────────────────────────
  const axis = useMemo(
    () => ({ born: life.born, scale: life.scale }),
    [life.born, life.scale],
  );
  const whole = useMemo(
    () => wholeOf(entries, life, nowMs),
    [entries, life, nowMs],
  );
  const wholeU: View = useMemo(
    () => ({ u0: toU(whole[0], axis), u1: toU(whole[1], axis) }),
    [whole, axis],
  );
  const window_: [number, number] = useMemo(() => {
    if (!win) return whole;
    return [Math.max(whole[0], win[0]), Math.min(whole[1], win[1])];
  }, [win, whole]);
  const view: View = useMemo(
    () => ({ u0: toU(window_[0], axis), u1: toU(window_[1], axis) }),
    [window_, axis],
  );
  const x = useCallback(
    (ms: number) => xOf(ms, view, axis, X0, X1),
    [view, axis],
  );
  const at = useCallback(
    (px: number) => msAt(px, view, axis, X0, X1),
    [view, axis],
  );
  const xm = useCallback(
    (ms: number) => xOf(ms, wholeU, axis, X0, X1),
    [wholeU, axis],
  );
  const windowYears = (window_[1] - window_[0]) / YEAR_MS;
  const presentMs = timeOf(present, "mid");

  const setView = useCallback(
    (v: View) => setWin([fromU(v.u0, axis), fromU(v.u1, axis)]),
    [axis],
  );

  const centreOn = useCallback(
    (e: Entry) => {
      const s = startOf(e);
      const en = endOf(e, nowMs);
      const span = window_[1] - window_[0];
      const need = en - s;
      const width = need > span * 0.8 ? need * 1.6 : span;
      const mid = (s + en) / 2;
      let w0 = mid - width / 2;
      let w1 = mid + width / 2;
      if (w0 < whole[0]) {
        w0 = whole[0];
        w1 = w0 + width;
      }
      if (w1 > whole[1]) {
        w1 = whole[1];
        w0 = Math.max(whole[0], w1 - width);
      }
      setWin([w0, w1]);
    },
    [window_, whole, nowMs],
  );

  // ── layout ──────────────────────────────────────────────────────────────
  const layout = useMemo(() => {
    const structure = entries.filter((e) => e.lane === "structure");
    const conjuncture = entries.filter((e) => e.lane === "conjuncture");
    const sRows = packRows(structure, startOf, (e) => endOf(e, nowMs));
    const cRows = packRows(conjuncture, startOf, (e) => endOf(e, nowMs));
    const sN = Math.max(1, ...sRows.map((r) => r + 1));
    const cN = Math.max(1, ...cRows.map((r) => r + 1));
    let y = 18;
    const yStruct = y;
    y += sN * ROW_H + 8;
    const yConj = y;
    y += cN * ROW_H + 10;
    const yHapp = y + 4;
    y += 26;
    const yLanesTop = layers.world ? y + 8 : 26;
    const inner = life.domains.filter((d) => d.register === "inner");
    const outer = life.domains.filter((d) => d.register === "outer");
    const laneY = new Map<string, number>();
    inner.forEach((d, i) =>
      laneY.set(d.id, yLanesTop + i * LANE_H + LANE_H / 2),
    );
    const axisY = yLanesTop + inner.length * LANE_H + 26;
    const outerTop = axisY + 30;
    outer.forEach((d, i) =>
      laneY.set(d.id, outerTop + i * LANE_H + LANE_H / 2),
    );
    const lanesBottom = outerTop + outer.length * LANE_H;
    const yStrip = lanesBottom + 12;
    const yMini = layers.garden ? yStrip + STRIP_H + 18 : lanesBottom + 20;
    const H = yMini + MINI_H + 14;
    return {
      structure,
      conjuncture,
      sRows,
      cRows,
      yStruct,
      yConj,
      yHapp,
      yLanesTop,
      laneY,
      axisY,
      outerTop,
      lanesBottom,
      yStrip,
      yMini,
      H,
      inner,
      outer,
    };
  }, [entries, life.domains, layers.world, layers.garden, nowMs]);
  const H = layout.H;

  const laneColor = useCallback(
    (lane: string) => {
      const i = life.domains.findIndex((d) => d.id === lane);
      if (i >= 0) return `var(--value-${i % 6})`;
      return lane === "gap" ? "var(--muted)" : "var(--faint)";
    },
    [life.domains],
  );
  const laneLabel = useCallback(
    (lane: string) =>
      life.domains.find((d) => d.id === lane)?.label ??
      (isLayer(lane) ? LAYER_LABEL[lane] : lane),
    [life.domains],
  );

  // the marks in view
  const marks: Mark[] = useMemo(() => {
    const out: Mark[] = [];
    const byLane = new Map<string, Entry[]>();
    for (const e of entries) {
      if (!layout.laneY.has(e.lane)) continue;
      if (!layers.expected && startOf(e) > nowMs) continue;
      const list = byLane.get(e.lane) ?? [];
      list.push(e);
      byLane.set(e.lane, list);
    }
    for (const [lane, list] of byLane) {
      const y0 = layout.laneY.get(lane)!;
      const spans = list.filter(isSpan);
      const rows = packRows(spans, startOf, (e) => endOf(e, nowMs));
      const rowOf = new Map(spans.map((e, i) => [e.slug, rows[i]]));
      for (const e of list) {
        const span = isSpan(e);
        const xs = x(span ? startOf(e) : midOf(e));
        const xe = x(endOf(e, nowMs));
        if (xe < X0 - 24 || xs > X1 + 24) continue;
        const row = rowOf.get(e.slug) ?? 0;
        const dy = span ? (row === 0 ? 0 : row % 2 ? -9 : 9) : 0;
        out.push({
          e,
          x: xs,
          x1: xe,
          y: y0 + dy,
          r: 3 + 1.7 * e.looms,
          span,
          future: startOf(e) > presentMs,
          expected: startOf(e) > nowMs,
          color: laneColor(e.lane),
        });
      }
    }
    return out;
  }, [entries, layout, layers.expected, nowMs, presentMs, x, laneColor]);

  // labels: greedy, the ones that loom largest first
  const labels: Label[] = useMemo(() => {
    const taken: [number, number, number, number][] = [];
    const hit = (b: [number, number, number, number]) =>
      taken.some(
        (t) =>
          b[0] < t[0] + t[2] &&
          b[0] + b[2] > t[0] &&
          b[1] < t[1] + t[3] &&
          b[1] + b[3] > t[1],
      );
    for (const m of marks)
      taken.push(
        m.span
          ? [m.x, m.y - 5, Math.max(4, m.x1 - m.x), 10]
          : [m.x - m.r, m.y - m.r, m.r * 2, m.r * 2],
      );
    const out: Label[] = [];
    const maxChars = clamp(
      Math.floor((X1 - X0) / Math.max(1, marks.length) / 3.2),
      14,
      40,
    );
    const order = [...marks].sort(
      (a, b) =>
        Number(b.e.slug === selected) - Number(a.e.slug === selected) ||
        b.e.looms - a.e.looms ||
        a.x - b.x,
    );
    for (const m of order) {
      const must =
        m.e.slug === selected ||
        (hover?.kind === "entry" && hover.slug === m.e.slug);
      if (!layers.labels && !must && m.e.looms < 3) continue;
      if (!m.e.title) continue;
      const cands: [number, number, "start" | "middle"][] = m.span
        ? [
            [m.x + 3, m.y - 8, "start"],
            [m.x + 3, m.y + 15, "start"],
            [m.x + 3, m.y - 20, "start"],
          ]
        : [
            [m.x, m.y - m.r - 5, "middle"],
            [m.x, m.y + m.r + 12, "middle"],
            [m.x, m.y - m.r - 17, "middle"],
            [m.x, m.y + m.r + 24, "middle"],
          ];
      // the whole title if it fits, a shorter one if it must, nothing rather than a collision
      const tries = must ? [short(m.e.title, 60)] : [short(m.e.title, 40), short(m.e.title, maxChars)];
      let placed = false;
      for (const text of tries) {
        const w = text.length * 5.7 + 4;
        for (const [lx, ly, anchor] of cands) {
          const bx = anchor === "middle" ? lx - w / 2 : lx;
          if (bx < X0 - 40 || bx + w > X1 + 40) continue;
          const box: [number, number, number, number] = [bx, ly - 9, w, 12];
          if (!must && hit(box)) continue;
          taken.push(box);
          out.push({ slug: m.e.slug, x: lx, y: ly, text, anchor });
          placed = true;
          break;
        }
        if (placed) break;
      }
      if (!placed && must)
        out.push({
          slug: m.e.slug,
          x: m.x,
          y: m.y - m.r - 5,
          text: short(m.e.title, 60),
          anchor: "middle",
        });

    }
    return out;
  }, [marks, selected, hover, layers.labels]);

  const ticks = useMemo(() => ticksFor(window_[0], window_[1]), [window_]);

  // the garden's dated moments, by day
  const moments = useMemo(
    () => (garden ? momentsOf(garden.nodes, today) : []),
    [garden, today],
  );
  const byDay = useMemo(() => {
    const m = new Map<string, Moment[]>();
    for (const mo of moments) {
      const l = m.get(mo.day) ?? [];
      l.push(mo);
      m.set(mo.day, l);
    }
    return m;
  }, [moments]);
  const strip = useMemo(() => {
    if (!layers.garden) return [];
    const out: {
      day: string;
      x: number;
      n: number;
      said: number;
      lensed: boolean;
    }[] = [];
    for (const [day, list] of byDay) {
      const ms = timeOf(day, "mid");
      if (ms < window_[0] || ms > window_[1]) continue;
      out.push({
        day,
        x: x(ms),
        n: list.length,
        said: list.filter((m) => m.how === "said").length,
        lensed: lens !== null && list.some((m) => m.id === lens),
      });
    }
    return out;
  }, [byDay, window_, x, layers.garden, lens]);

  const t = useMemo(
    () => tally(entries, life, present, today),
    [entries, life, present, today],
  );
  const words = useMemo(
    () => readings(t, life, present, today),
    [t, life, present, today],
  );
  const ordered = useMemo(
    () =>
      [...entries]
        .filter((e) => e.lane !== "gap")
        .sort((a, b) => startOf(a) - startOf(b)),
    [entries],
  );
  const chosen = useMemo(
    () => entries.find((e) => e.slug === selected) ?? null,
    [entries, selected],
  );
  const hoverEntry = useMemo(
    () =>
      hover?.kind === "entry"
        ? (entries.find((e) => e.slug === hover.slug) ?? null)
        : null,
    [hover, entries],
  );

  // the chosen entry in the address, so it can be come back to
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selected) url.searchParams.set("id", selected);
    else url.searchParams.delete("id");
    if (lens) url.searchParams.set("stone", lens);
    else url.searchParams.delete("stone");
    window.history.replaceState(null, "", url);
  }, [selected, lens]);

  // choosing an entry opens it on the desk
  useEffect(() => {
    if (!chosen) return;
    setDraft({ entry: chosen, fresh: false });
    setSure(false);
  }, [chosen]);

  useEffect(() => {
    if (draft?.fresh) titleRef.current?.focus();
  }, [draft?.fresh]);

  // ── saying and keeping ──────────────────────────────────────────────────
  const say = useCallback((msg: string) => {
    if (capTimer.current) window.clearTimeout(capTimer.current);
    setCap(msg);
    capTimer.current = window.setTimeout(() => setCap(null), 2600);
  }, []);

  const settleKept = useCallback((state: "kept" | "error") => {
    setKept(state);
    if (keptTimer.current) window.clearTimeout(keptTimer.current);
    keptTimer.current = window.setTimeout(() => setKept("idle"), 1600);
  }, []);

  const refetch = useCallback(() => {
    fetch("/api/chronology", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Payload | null) => {
        if (!p) return;
        setOwn(p.entries);
        setOwnLife(p.life);
      });
  }, []);

  const putEntry = useCallback(
    async (entry: Entry, fresh: boolean): Promise<Entry | null> => {
      if (!writable) return null;
      setKept("saving");
      const r = await fetch("/api/chronology", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entry, fresh }),
      }).catch(() => null);
      if (!r || !r.ok) {
        const j = r ? await r.json().catch(() => null) : null;
        settleKept("error");
        say(j?.error ? String(j.error).replace(/^entry: /, "") : "not kept.");
        refetch();
        return null;
      }
      const k: Entry = await r.json();
      setOwn((es) =>
        fresh
          ? [...es.filter((e) => e.slug !== k.slug), k]
          : es.map((e) => (e.slug === k.slug ? k : e)),
      );
      settleKept("kept");
      return k;
    },
    [writable, settleKept, say, refetch],
  );

  const putLife = useCallback(
    async (next: Life) => {
      if (!writable) return;
      const prev = ownLife;
      setOwnLife(next);
      setKept("saving");
      const r = await fetch("/api/chronology", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ life: next }),
      }).catch(() => null);
      if (!r || !r.ok) {
        const j = r ? await r.json().catch(() => null) : null;
        setOwnLife(prev);
        settleKept("error");
        say(j?.error ? String(j.error).replace(/^life: /, "") : "not kept.");
        return;
      }
      setOwnLife((await r.json()) as Life);
      settleKept("kept");
    },
    [writable, ownLife, settleKept, say],
  );

  const remove = useCallback(
    async (slug: string) => {
      if (!writable) return;
      const r = await fetch(
        `/api/chronology?slug=${encodeURIComponent(slug)}`,
        {
          method: "DELETE",
        },
      ).catch(() => null);
      if (!r || !r.ok) {
        settleKept("error");
        return;
      }
      setOwn((es) => es.filter((e) => e.slug !== slug));
      setSelected(null);
      setDraft(null);
      setSure(false);
      say("taken back.");
    },
    [writable, settleKept, say],
  );

  const keepDraft = useCallback(async () => {
    if (!draft || !writable) return;
    const e = draft.entry;
    if (!e.title.trim() && e.lane !== "gap") {
      say("it needs a title.");
      titleRef.current?.focus();
      return;
    }
    if (!validDay(e.day)) {
      say("when? a year, a month or a day.");
      return;
    }
    const k = await putEntry(
      { ...e, slug: e.slug, recorded: e.recorded || today },
      draft.fresh,
    );
    if (!k) return;
    say(
      draft.fresh
        ? e.lane === "gap"
          ? "a gap, named."
          : "set down."
        : "kept.",
    );
    setSelected(k.slug);
    setDraft({ entry: k, fresh: false });
  }, [draft, writable, putEntry, say, today]);

  const begin = useCallback(
    (day: string, lane: string, stones: string[] = []) => {
      if (!writable) {
        say(
          specimen ? "the specimen is not yours to change." : "read-only here.",
        );
        return;
      }
      const e = emptyEntry(day, lane, today);
      setSelected(null);
      setDraft({ entry: { ...e, stones }, fresh: true });
      setSure(false);
    },
    [writable, specimen, say, today],
  );

  const setField = useCallback(
    <K extends keyof Entry>(k: K, v: Entry[K]) =>
      setDraft((d) => (d ? { ...d, entry: { ...d.entry, [k]: v } } : d)),
    [],
  );

  // ── pointer ─────────────────────────────────────────────────────────────
  const toSheet = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const el = svg.current;
      if (!el) return { sx: 0, sy: 0 };
      const box = el.getBoundingClientRect();
      return {
        sx: ((e.clientX - box.left) / box.width) * W,
        sy: ((e.clientY - box.top) / box.height) * H,
      };
    },
    [H],
  );

  const precisionForZoom = (): Precision =>
    windowYears > 40 ? "year" : windowYears > 4 ? "month" : "day";

  const laneAt = useCallback(
    (sy: number): string | null => {
      const L = layout;
      if (layers.world) {
        if (sy >= L.yStruct - 4 && sy < L.yConj - 4) return "structure";
        if (sy >= L.yConj - 4 && sy < L.yHapp - 10) return "conjuncture";
        if (Math.abs(sy - L.yHapp) <= 12) return "happening";
      }
      let best: string | null = null;
      let d = Infinity;
      for (const [lane, y] of L.laneY) {
        const dd = Math.abs(y - sy);
        if (dd < d) {
          d = dd;
          best = lane;
        }
      }
      return d <= LANE_H * 0.9 ? best : null;
    },
    [layout, layers.world],
  );

  const onDown = (ev: ReactPointerEvent<SVGSVGElement>) => {
    if (ev.button !== 0) return;
    const { sx } = toSheet(ev);
    const el = ev.target as Element;
    const markEl = el.closest("[data-slug]");
    const presentEl = el.closest("[data-present]");
    const miniEl = el.closest("[data-mini]");
    svg.current?.setPointerCapture(ev.pointerId);
    if (presentEl) {
      drag.current = { kind: "present", moved: false };
      return;
    }
    if (markEl) {
      const slug = markEl.getAttribute("data-slug")!;
      const e = entries.find((x) => x.slug === slug);
      if (!e) return;
      drag.current = {
        kind: "entry",
        slug,
        x: sx,
        day: e.day,
        until: e.until,
        moved: false,
      };
      return;
    }
    if (miniEl) {
      drag.current = { kind: "mini", x: sx, win: window_, moved: false };
      return;
    }
    drag.current = { kind: "pan", x: sx, win: window_, moved: false };
  };

  const onMove = (ev: ReactPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const { sx } = toSheet(ev);
    if (d.kind === "pan") {
      if (Math.abs(sx - d.x) > 2) d.moved = true;
      if (!d.moved) return;
      const v0 = { u0: toU(d.win[0], axis), u1: toU(d.win[1], axis) };
      const du = -((sx - d.x) / (X1 - X0)) * (v0.u1 - v0.u0);
      setView(pan(v0, du, wholeU));
      return;
    }
    if (d.kind === "mini") {
      if (Math.abs(sx - d.x) > 2) d.moved = true;
      if (!d.moved) return;
      const v0 = { u0: toU(d.win[0], axis), u1: toU(d.win[1], axis) };
      const du = ((sx - d.x) / (X1 - X0)) * (wholeU.u1 - wholeU.u0);
      setView(pan(v0, du, wholeU));
      return;
    }
    if (d.kind === "present") {
      d.moved = true;
      setPresent(dayAt(clamp(at(sx), whole[0], whole[1])));
      setHover(null);
      return;
    }
    if (d.kind === "entry") {
      if (!writable) return;
      if (Math.abs(sx - d.x) > 3) d.moved = true;
      if (!d.moved) return;
      const dms = at(sx) - at(d.x);
      const day = dayAt(
        timeOf(d.day, "start") + dms + DAY_MS / 2,
        precisionOf(d.day),
      );
      const until =
        d.until && d.until !== "now"
          ? dayAt(
              timeOf(d.until, "start") + dms + DAY_MS / 2,
              precisionOf(d.until),
            )
          : d.until;
      setOwn((es) =>
        es.map((e) => (e.slug === d.slug ? { ...e, day, until } : e)),
      );
      setHover(null);
    }
  };

  const onUp = (ev: ReactPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const { sx, sy } = toSheet(ev);
    if (d.kind === "pan" && !d.moved) {
      if (Math.abs(sy - layout.axisY) <= 14 && sx >= X0 && sx <= X1) {
        setPresent(dayAt(clamp(at(sx), whole[0], whole[1])));
        return;
      }
      setSelected(null);
      if (draft && !draft.fresh) setDraft(null);
      return;
    }
    if (d.kind === "mini" && !d.moved) {
      const u = wholeU.u0 + ((sx - X0) / (X1 - X0)) * (wholeU.u1 - wholeU.u0);
      const span = view.u1 - view.u0;
      setView(pan({ u0: u - span / 2, u1: u + span / 2 }, 0, wholeU));
      return;
    }
    if (d.kind === "entry") {
      const e =
        ownRef.current.find((x) => x.slug === d.slug) ??
        entries.find((x) => x.slug === d.slug);
      if (!d.moved) {
        setSelected(d.slug);
        return;
      }
      if (e && writable) {
        putEntry(e, false).then(
          (k) => k && say(`moved to ${spanWords(k.day, k.until)}.`),
        );
      }
    }
  };

  const onDouble = (ev: React.MouseEvent<SVGSVGElement>) => {
    const { sx, sy } = toSheet(ev);
    if (
      (ev.target as Element).closest(
        "[data-slug],[data-present],[data-mini],[data-moment]",
      )
    )
      return;
    if (sx < X0 || sx > X1) return;
    const lane = laneAt(sy) ?? layout.outer[0]?.id ?? life.domains[0]?.id;
    if (!lane) return;
    const day = dayAt(
      at(sx),
      lane === "structure" || lane === "conjuncture"
        ? "year"
        : precisionForZoom(),
    );
    begin(day, lane);
  };

  // wheel: zoom about the pointer; sideways, pan
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      const sideways = Math.abs(ev.deltaX) > Math.abs(ev.deltaY);
      const pinch = ev.ctrlKey || ev.metaKey;
      // a plain wheel scrolls the page, as it does everywhere else
      if (!sideways && !pinch) return;
      ev.preventDefault();
      const box = el.getBoundingClientRect();
      const sx = ((ev.clientX - box.left) / box.width) * W;
      if (sideways) {
        const du = (ev.deltaX / (X1 - X0)) * (view.u1 - view.u0);
        setView(pan(view, du, wholeU));
        return;
      }
      const atMs = at(clamp(sx, X0, X1));
      const atU = toU(atMs, axis);
      const minSpan =
        toU(atMs + 7 * DAY_MS, axis) - toU(atMs - 7 * DAY_MS, axis);
      const factor = Math.exp(ev.deltaY * 0.0022);
      setView(zoom(view, atU, factor, wholeU, minSpan));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [view, wholeU, axis, at, setView]);

  // ── keys ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable);
      if (typing) {
        if (e.key === "Escape") el?.blur();
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        search.current?.focus();
        return;
      }
      if (e.key === "Escape") {
        setSelected(null);
        setDraft(null);
        setSure(false);
        return;
      }
      if (e.key === "0") {
        setWin(null);
        return;
      }
      if (e.key === "=" || e.key === "+" || e.key === "-") {
        e.preventDefault();
        const mid = (view.u0 + view.u1) / 2;
        const midMs = fromU(mid, axis);
        const minSpan =
          toU(midMs + 7 * DAY_MS, axis) - toU(midMs - 7 * DAY_MS, axis);
        setView(zoom(view, mid, e.key === "-" ? 1.6 : 0.625, wholeU, minSpan));
        return;
      }
      if (e.key === "t" && life.born) {
        putLife({
          ...life,
          scale: life.scale === "clock" ? "proportional" : "clock",
        });
        return;
      }
      if (e.key === "g") {
        setLayers((l) => ({ ...l, garden: !l.garden }));
        return;
      }
      if (e.key === "n") {
        e.preventDefault();
        begin(present, layout.outer[0]?.id ?? life.domains[0]?.id ?? "work");
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (!ordered.length) return;
        e.preventDefault();
        const i = selected ? ordered.findIndex((x) => x.slug === selected) : -1;
        const n = ordered.length;
        const j =
          i < 0
            ? e.key === "ArrowRight"
              ? 0
              : n - 1
            : (i + (e.key === "ArrowRight" ? 1 : -1) + n) % n;
        const next = ordered[j];
        setSelected(next.slug);
        const s = startOf(next);
        if (s < window_[0] || s > window_[1]) centreOn(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    life,
    putLife,
    begin,
    present,
    layout.outer,
    ordered,
    selected,
    window_,
    centreOn,
    view,
    axis,
    wholeU,
    setView,
  ]);

  // ── search ──────────────────────────────────────────────────────────────
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return entries
      .filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q)) ||
          e.note.toLowerCase().includes(q),
      )
      .sort((a, b) => startOf(a) - startOf(b))
      .slice(0, 8);
  }, [query, entries]);

  const stoneResults = useMemo(() => {
    const q = stoneQuery.trim().toLowerCase();
    if (q.length < 2 || !garden) return [];
    const have = new Set(draft?.entry.stones ?? []);
    return garden.nodes
      .filter((n) => !have.has(n.id) && n.label.toLowerCase().includes(q))
      .sort((a, b) => {
        const ap = a.label.toLowerCase().startsWith(q) ? 0 : 1;
        const bp = b.label.toLowerCase().startsWith(q) ? 0 : 1;
        return ap - bp || b.degree - a.degree;
      })
      .slice(0, 6);
  }, [stoneQuery, garden, draft?.entry.stones]);

  // ── the drawing ─────────────────────────────────────────────────────────
  const axisInk = useMemo(() => {
    const r = rand(seedOf("chronology-axis"));
    const d = stroke([X0 - 6, layout.axisY], [X1 + 6, layout.axisY], r, 1.2, 4);
    return { line: d, ink: ribbon(d, 2.4, seedOf("chronology-axis-ink")) };
  }, [layout.axisY]);

  const bump = useMemo(() => {
    if (!layers.bump || !life.born || !validDay(life.born)) return null;
    const b = timeOf(life.born, "mid");
    const x10 = x(b + 10 * YEAR_MS);
    const x30 = x(b + 30 * YEAR_MS);
    if (x30 < X0 || x10 > X1) return null;
    return { x0: clamp(x10, X0, X1), x1: clamp(x30, X0, X1) };
  }, [layers.bump, life.born, x]);

  const ageOf = (ms: number) => {
    const a = ageAt(life.born, ms);
    return a === null ? null : Math.floor(a);
  };

  const presentX = x(presentMs);
  const presentAge = ageAt(life.born, presentMs);
  const lensNode = lens ? nodes.get(lens) : undefined;
  const pen = "var(--ink)";

  const worldBands = useMemo(() => {
    const out: {
      e: Entry;
      x: number;
      w: number;
      y: number;
      row: number;
      kind: "structure" | "conjuncture";
    }[] = [];
    if (!layers.world) return out;
    layout.structure.forEach((e, i) => {
      const xs = x(startOf(e));
      const xe = x(endOf(e, nowMs));
      if (xe < X0 || xs > X1) return;
      out.push({
        e,
        x: clamp(xs, X0, X1),
        w: clamp(xe, X0, X1) - clamp(xs, X0, X1),
        y: layout.yStruct + layout.sRows[i] * ROW_H,
        row: layout.sRows[i],
        kind: "structure",
      });
    });
    layout.conjuncture.forEach((e, i) => {
      const xs = x(startOf(e));
      const xe = x(endOf(e, nowMs));
      if (xe < X0 || xs > X1) return;
      out.push({
        e,
        x: clamp(xs, X0, X1),
        w: clamp(xe, X0, X1) - clamp(xs, X0, X1),
        y: layout.yConj + layout.cRows[i] * ROW_H,
        row: layout.cRows[i],
        kind: "conjuncture",
      });
    });
    return out;
  }, [layers.world, layout, x, nowMs]);

  const happenings = useMemo(() => {
    if (!layers.world) return [];
    const list = entries
      .filter((e) => e.lane === "happening")
      .map((e) => ({ e, x: x(midOf(e)) }))
      .filter((h) => h.x >= X0 - 10 && h.x <= X1 + 10)
      .sort((a, b) => a.x - b.x);
    let lastEnd = -Infinity;
    let flip = false;
    return list.map((h) => {
      const w = short(h.e.title, 28).length * 4.9;
      const above = h.x - w / 2 < lastEnd ? !flip : false;
      if (!above) lastEnd = h.x + w / 2;
      flip = above;
      return { ...h, above };
    });
  }, [layers.world, entries, x]);

  const gaps = useMemo(
    () =>
      entries
        .filter((e) => e.lane === "gap")
        .map((e) => ({ e, x: x(startOf(e)), x1: x(endOf(e, nowMs)) }))
        .filter((g) => g.x1 >= X0 && g.x <= X1)
        .map((g) => ({ ...g, x: clamp(g.x, X0, X1), x1: clamp(g.x1, X0, X1) })),
    [entries, x, nowMs],
  );

  const miniTicks = useMemo(
    () =>
      entries
        .filter((e) => e.lane !== "gap")
        .map((e) => ({
          e,
          x: xm(isSpan(e) ? startOf(e) : midOf(e)),
          x1: xm(endOf(e, nowMs)),
          world: isLayer(e.lane),
        })),
    [entries, xm, nowMs],
  );

  const scaleNote = !life.born
    ? "set the day you were born to read ages, and to draw the proportional scale."
    : null;

  const hoverCard = () => {
    if (!hover) return null;
    const left = `${(hover.x / W) * 100}%`;
    const top = `${(hover.y / H) * 100}%`;
    const flip = hover.x > W * 0.66;
    const style = {
      left,
      top,
      transform: flip
        ? "translate(calc(-100% - 12px), -8px)"
        : "translate(12px, -8px)",
      maxWidth: "19rem",
    };
    if (hover.kind === "present")
      return (
        <div
          className="card fade pointer-events-none absolute z-[5] px-3 py-2"
          style={style}
        >
          <div className="meta" style={{ color: "var(--accent)" }}>
            the present
          </div>
          <div
            className="hand mt-0.5 text-[15px] leading-[1.2]"
            style={{ color: "var(--ink)" }}
          >
            {formatDay(present)}
            {presentAge !== null ? ` · ${ageWords(presentAge)}` : ""}
          </div>
          <div
            className="hand mt-0.5 text-[13px]"
            style={{ color: "var(--muted)" }}
          >
            {present === today
              ? "drag it back to read the line as it stood"
              : "the line past here is greyed; drag it home to today"}
          </div>
        </div>
      );
    if (hover.kind === "moment") {
      const list = byDay.get(hover.day) ?? [];
      const said = list.filter((m) => m.how === "said");
      const shown = (said.length ? said : list).slice(0, 5);
      return (
        <div
          className="card fade pointer-events-none absolute z-[5] px-3 py-2"
          style={style}
        >
          <div className="meta" style={{ color: "var(--faint)" }}>
            the garden · {formatDay(hover.day)}
            {ageOf(timeOf(hover.day, "mid")) !== null
              ? ` · age ${ageOf(timeOf(hover.day, "mid"))}`
              : ""}
          </div>
          <ul className="mt-1">
            {shown.map((m) => (
              <li
                key={`${m.id}-${m.how}`}
                className="hand text-[14px] leading-[1.25]"
                style={{ color: "var(--ink)" }}
              >
                <span style={{ color: `var(--kind-${m.kind})` }}>
                  {m.how === "said" ? "speaks of it" : "touched"}
                </span>
                {" · "}
                {short(m.label, 40)}
              </li>
            ))}
          </ul>
          {list.length > shown.length && (
            <div
              className="meta mt-1"
              style={{ color: "var(--faint)", textTransform: "none" }}
            >
              and {list.length - shown.length} more
            </div>
          )}
          {writable && (
            <div
              className="hand mt-1 text-[12.5px]"
              style={{ color: "var(--muted)" }}
            >
              click to set this day down
            </div>
          )}
        </div>
      );
    }
    const e = hoverEntry;
    if (!e) return null;
    const ms = midOf(e);
    const age = ageOf(ms);
    const late = validDay(e.recorded)
      ? (timeOf(e.recorded, "mid") - ms) / YEAR_MS
      : 0;
    return (
      <div
        className="card fade pointer-events-none absolute z-[5] px-3 py-2"
        style={style}
      >
        <div className="meta" style={{ color: laneColor(e.lane) }}>
          {laneLabel(e.lane)}
          <span style={{ color: "var(--faint)" }}>
            {" · "}
            {spanWords(e.day, e.until)}
            {age !== null && !isLayer(e.lane) ? ` · age ${age}` : ""}
            {e.lane === "gap" ? ` · ${WHY_LABEL[e.why ?? "no-record"]}` : ""}
          </span>
        </div>
        <div
          className="hand mt-0.5 text-[15.5px] leading-[1.2]"
          style={{ color: "var(--ink)" }}
        >
          {e.title ||
            (e.lane === "gap"
              ? "the record does not speak for this"
              : "untitled")}
        </div>
        {isSpan(e) && (
          <div className="hand text-[13px]" style={{ color: "var(--muted)" }}>
            {yearsWords((endOf(e, nowMs) - startOf(e)) / YEAR_MS)}
            {e.until === "now" ? ", and not ended" : ""}
          </div>
        )}
        {chosen && chosen.slug !== e.slug && (
          <div
            className="hand mt-0.5 text-[13.5px]"
            style={{ color: "var(--accent)" }}
          >
            {relate(e, chosen, nowMs)}
          </div>
        )}
        {e.note && (
          <p
            className="mt-1 text-[12px] leading-[1.45]"
            style={{ color: "var(--muted)" }}
          >
            {short(e.note, 160)}
          </p>
        )}
        {(e.again || late > 1) && (
          <div
            className="meta mt-1"
            style={{ color: "var(--faint)", textTransform: "none" }}
          >
            {e.again ? `again: ${e.again}` : ""}
            {e.again && late > 1 ? " · " : ""}
            {late > 1 ? `written down ${yearsWords(late)} after` : ""}
          </div>
        )}
      </div>
    );
  };

  // ── the desk's pieces ───────────────────────────────────────────────────
  const Chip = ({
    on,
    onClick,
    children,
    disabled,
    color,
    title,
  }: {
    on?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
    color?: string;
    title?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="chip k-seg relative px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase disabled:opacity-50"
      style={{
        fontFamily: "var(--font-mono)",
        color: on ? (color ?? "var(--ink)") : "var(--faint)",
        borderColor: on && color ? color : undefined,
      }}
    >
      {children}
    </button>
  );

  const Row = ({ e }: { e: Entry }) => (
    <button
      onClick={() => {
        setSelected(e.slug);
        const s = startOf(e);
        if (s < window_[0] || s > window_[1]) centreOn(e);
      }}
      className="k-row flex w-full items-baseline gap-2 rounded px-1.5 py-0.5 text-left"
      style={{
        background:
          selected === e.slug
            ? "color-mix(in srgb, var(--accent) 10%, transparent)"
            : undefined,
      }}
    >
      <span
        aria-hidden
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{
          background: isLayer(e.lane) ? "transparent" : laneColor(e.lane),
          border: `1px solid ${laneColor(e.lane)}`,
          transform: "translateY(-1px)",
        }}
      />
      <span
        className="hand min-w-0 flex-1 truncate text-[14px] leading-[1.25]"
        style={{ color: "var(--ink)" }}
      >
        {e.title ||
          (e.lane === "gap"
            ? `gap · ${WHY_LABEL[e.why ?? "no-record"]}`
            : "untitled")}
      </span>
      <span
        className="meta shrink-0"
        style={{ color: "var(--faint)", textTransform: "none" }}
      >
        {spanWords(e.day, e.until)}
      </span>
    </button>
  );

  const byYear = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const e of [...entries].sort((a, b) => startOf(a) - startOf(b))) {
      const y = e.day.slice(0, 4);
      const l = m.get(y) ?? [];
      l.push(e);
      m.set(y, l);
    }
    return [...m.entries()];
  }, [entries]);

  const d = draft?.entry ?? null;
  const dirty =
    draft && chosen && !draft.fresh
      ? JSON.stringify(draft.entry) !== JSON.stringify(chosen)
      : Boolean(draft?.fresh);
  const dLate =
    d && validDay(d.day) && validDay(d.recorded)
      ? (timeOf(d.recorded, "mid") - timeOf(d.day, "mid")) / YEAR_MS
      : 0;

  return (
    <main className="chronology scroll-thin relative h-dvh w-full overflow-y-auto">
      <div className="mx-auto max-w-[84rem] px-5 pb-16 sm:px-10">
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
                chronology
              </div>
              <p
                className="hand mt-1 max-w-[30rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                A life as a number line. Set down what happened — the inner life
                above the line, the world below it — under the conditions you
                lived in. Drag the present back and read the record as it stood.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/chronology" />
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

        {specimen && (
          <p
            className="meta mt-3"
            style={{ color: "var(--accent)", textTransform: "none" }}
          >
            Specimen A — a synthetic life, born 1988 and told at 38. Fiction, to
            show the instrument; nobody&rsquo;s history.
            {showSpecimen && (
              <>
                {" "}
                <button
                  onClick={() => setShowSpecimen(false)}
                  className="underline"
                  style={{ color: "var(--muted)" }}
                >
                  back to your own
                </button>
              </>
            )}
          </p>
        )}

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
          {/* ── the sheet ─────────────────────────────────────────────── */}
          <section
            className="panel sketched rise relative self-start p-2 sm:p-3"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The chronology"
          >
            <Sketch seed="chronology-sheet" draw />

            {/* the readout and the window */}
            <div className="relative z-[2] flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="meta" style={{ color: "var(--muted)" }}>
                  {t.n === 0
                    ? "nothing set down"
                    : `${t.n} set down · ${t.inner} inner · ${t.outer} in the world${t.gaps ? ` · ${t.gaps} ${t.gaps === 1 ? "gap" : "gaps"}` : ""}`}
                </span>
                <span className="meta" style={{ color: "var(--faint)" }}>
                  ·{" "}
                  {formatDay(
                    dayAt(window_[0], windowYears > 6 ? "year" : "month"),
                  )}{" "}
                  –{" "}
                  {formatDay(
                    dayAt(window_[1], windowYears > 6 ? "year" : "month"),
                  )}
                  {" · "}
                  {yearsWords(windowYears)} in view
                </span>
                {lensNode && (
                  <span className="flex items-baseline gap-1.5">
                    <span className="meta" style={{ color: "var(--accent)" }}>
                      · through {short(lensNode.label, 28)}
                    </span>
                    <button
                      onClick={() => setLens(null)}
                      className="meta"
                      style={{ color: "var(--faint)" }}
                      aria-label="Clear the lens"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {win && (
                  <Chip onClick={() => setWin(null)} on>
                    whole life
                  </Chip>
                )}
                {present !== today && (
                  <Chip
                    onClick={() => setPresent(today)}
                    on
                    color="var(--accent)"
                  >
                    back to today
                  </Chip>
                )}
                <span
                  className="meta"
                  style={{
                    color: kept === "error" ? "var(--accent)" : "var(--faint)",
                  }}
                >
                  {kept === "saving"
                    ? "keeping…"
                    : kept === "kept"
                      ? "kept"
                      : kept === "error"
                        ? "not kept"
                        : writable
                          ? ""
                          : specimen
                            ? "specimen"
                            : "read-only"}
                </span>
              </div>
            </div>

            {cap && (
              <div
                className="hand fade pointer-events-none absolute top-9 right-4 z-[4] text-[15px]"
                style={{ color: "var(--accent)" }}
              >
                — {cap}
              </div>
            )}

            <div className="relative">
              <svg
                ref={svg}
                viewBox={`0 0 ${W} ${H}`}
                className="k-sheet relative z-[2] block h-auto w-full"
                style={{
                  cursor: drag.current?.kind === "pan" ? "grabbing" : "default",
                }}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={() => {
                  drag.current = null;
                }}
                onDoubleClick={onDouble}
                onPointerLeave={() => setHover(null)}
                role="img"
                aria-label="A number line of a life"
              >
                <defs>
                  <pattern
                    id="k-hatch"
                    patternUnits="userSpaceOnUse"
                    width="7"
                    height="7"
                    patternTransform="rotate(-45)"
                  >
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="7"
                      stroke={pen}
                      strokeWidth="0.8"
                      strokeOpacity="0.35"
                    />
                  </pattern>
                  <mask
                    id="k-axis-mask"
                    maskUnits="userSpaceOnUse"
                    x={X0 - 20}
                    y={layout.axisY - 12}
                    width={X1 - X0 + 40}
                    height={24}
                  >
                    <path
                      d={axisInk.line}
                      pathLength={1}
                      className="draw"
                      fill="none"
                      stroke="#fff"
                      strokeWidth={8}
                      strokeLinecap="round"
                    />
                  </mask>
                </defs>

                {/* the reminiscence bump: where memory clusters for everyone */}
                {bump && (
                  <g aria-hidden>
                    <rect
                      x={bump.x0}
                      y={layout.yLanesTop - 8}
                      width={Math.max(0, bump.x1 - bump.x0)}
                      height={layout.lanesBottom - layout.yLanesTop + 14}
                      fill="var(--accent)"
                      fillOpacity={0.05}
                    />
                    {bump.x1 - bump.x0 > 120 && (
                      <text
                        x={bump.x1 - 6}
                        y={layout.yLanesTop - 12}
                        textAnchor="end"
                        className="meta"
                        fontSize={8.5}
                        fill="var(--accent)"
                        fillOpacity={0.7}
                        style={{
                          fontFamily: "var(--font-mono)",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                        }}
                      >
                        reminiscence bump · 10–30 · density expected here
                      </text>
                    )}
                  </g>
                )}

                {/* the record's silences, named */}
                {gaps.map((g) => (
                  <g
                    key={g.e.slug}
                    data-slug={g.e.slug}
                    className="k-mark"
                    style={{ cursor: "pointer" }}
                    onPointerMove={(ev) => {
                      if (drag.current) return;
                      const { sx, sy } = toSheet(ev);
                      setHover({ kind: "entry", slug: g.e.slug, x: sx, y: sy });
                    }}
                    onPointerLeave={() => setHover(null)}
                  >
                    <rect
                      x={g.x}
                      y={layout.yLanesTop - 8}
                      width={Math.max(2, g.x1 - g.x)}
                      height={layout.lanesBottom - layout.yLanesTop + 14}
                      fill="url(#k-hatch)"
                    />
                    <path
                      d={roughRect(
                        Math.max(2, g.x1 - g.x),
                        layout.lanesBottom - layout.yLanesTop + 14,
                        seedOf(g.e.slug),
                        { wobble: 0.9, overshoot: 2 },
                      )}
                      transform={`translate(${g.x} ${layout.yLanesTop - 8})`}
                      fill="none"
                      stroke={selected === g.e.slug ? "var(--accent)" : pen}
                      strokeOpacity={selected === g.e.slug ? 0.9 : 0.4}
                      strokeWidth={0.9}
                      strokeDasharray="3 2.5"
                    />
                    {g.x1 - g.x > 70 && (
                      <text
                        x={(g.x + g.x1) / 2}
                        y={layout.yLanesTop - 12}
                        textAnchor="middle"
                        fontSize={8.5}
                        fill="var(--muted)"
                        style={{
                          fontFamily: "var(--font-mono)",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                        }}
                      >
                        gap · {spanWords(g.e.day, g.e.until)} ·{" "}
                        {WHY_LABEL[g.e.why ?? "no-record"]}
                      </text>
                    )}
                  </g>
                ))}

                {/* the future, shaded past the present */}
                {presentX < X1 + 8 && (
                  <rect
                    x={clamp(presentX, X0 - 6, X1 + 8)}
                    y={layout.yLanesTop - 10}
                    width={Math.max(
                      0,
                      X1 + 8 - clamp(presentX, X0 - 6, X1 + 8),
                    )}
                    height={layout.lanesBottom - layout.yLanesTop + 18}
                    fill={pen}
                    fillOpacity={0.045}
                    aria-hidden
                  />
                )}

                {/* the circumstances */}
                {layers.world && (
                  <g>
                    <text
                      x={X0 - 10}
                      y={layout.yStruct + 9}
                      textAnchor="end"
                      fontSize={8.5}
                      fill="var(--faint)"
                      style={{
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                      }}
                    >
                      structure
                    </text>
                    <text
                      x={X0 - 10}
                      y={layout.yConj + 9}
                      textAnchor="end"
                      fontSize={8.5}
                      fill="var(--faint)"
                      style={{
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                      }}
                    >
                      conjuncture
                    </text>
                    <text
                      x={X0 - 10}
                      y={layout.yHapp + 3}
                      textAnchor="end"
                      fontSize={8.5}
                      fill="var(--faint)"
                      style={{
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                      }}
                    >
                      happenings
                    </text>
                    <line
                      x1={X0}
                      x2={X1}
                      y1={layout.yHapp}
                      y2={layout.yHapp}
                      stroke="var(--rule)"
                      strokeWidth={0.8}
                    />
                    {worldBands.map((b) => {
                      const on = selected === b.e.slug;
                      const chars = Math.floor((b.w - 8) / 5.1);
                      return (
                        <g
                          key={b.e.slug}
                          data-slug={b.e.slug}
                          className="k-mark"
                          style={{ cursor: writable ? "grab" : "pointer" }}
                          onPointerMove={(ev) => {
                            if (drag.current) return;
                            const { sx, sy } = toSheet(ev);
                            setHover({
                              kind: "entry",
                              slug: b.e.slug,
                              x: sx,
                              y: sy,
                            });
                          }}
                          onPointerLeave={() => setHover(null)}
                        >
                          <rect
                            x={b.x}
                            y={b.y}
                            width={Math.max(3, b.w)}
                            height={ROW_H - 2}
                            fill={
                              b.kind === "structure" ? pen : "var(--value-1)"
                            }
                            fillOpacity={b.kind === "structure" ? 0.07 : 0.13}
                          />
                          <path
                            d={roughRect(
                              Math.max(3, b.w),
                              ROW_H - 2,
                              seedOf(b.e.slug),
                              { wobble: 0.7, overshoot: 1.5 },
                            )}
                            transform={`translate(${b.x} ${b.y})`}
                            fill="none"
                            stroke={on ? "var(--accent)" : pen}
                            strokeOpacity={on ? 0.95 : 0.35}
                            strokeWidth={on ? 1.1 : 0.7}
                          />
                          {chars >= 4 && (
                            <text
                              x={b.x + 5}
                              y={b.y + 8.5}
                              fontSize={8.5}
                              fill={on ? "var(--ink)" : "var(--muted)"}
                              style={{
                                fontFamily: "var(--font-mono)",
                                letterSpacing: "0.06em",
                              }}
                            >
                              {short(b.e.title, chars)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                    {happenings.map((h) => {
                      const on = selected === h.e.slug;
                      return (
                        <g
                          key={h.e.slug}
                          data-slug={h.e.slug}
                          className="k-mark"
                          style={{ cursor: writable ? "grab" : "pointer" }}
                          onPointerMove={(ev) => {
                            if (drag.current) return;
                            const { sx, sy } = toSheet(ev);
                            setHover({
                              kind: "entry",
                              slug: h.e.slug,
                              x: sx,
                              y: sy,
                            });
                          }}
                          onPointerLeave={() => setHover(null)}
                        >
                          <rect
                            x={h.x - 3.5}
                            y={layout.yHapp - 3.5}
                            width={7}
                            height={7}
                            transform={`rotate(45 ${h.x} ${layout.yHapp})`}
                            fill={on ? "var(--accent)" : pen}
                            fillOpacity={on ? 1 : 0.7}
                          />
                          <rect
                            x={h.x - 8}
                            y={layout.yHapp - 9}
                            width={16}
                            height={18}
                            fill="transparent"
                          />
                          <text
                            x={h.x + 7}
                            y={layout.yHapp + (h.above ? -6 : 3.5)}
                            fontSize={8.5}
                            fill="var(--muted)"
                            style={{
                              fontFamily: "var(--font-mono)",
                              letterSpacing: "0.06em",
                            }}
                          >
                            {short(h.e.title, 28)}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* the lanes */}
                <text
                  x={X0 - 10}
                  y={layout.yLanesTop - 4}
                  textAnchor="end"
                  fontSize={8.5}
                  fill="var(--faint)"
                  style={{
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  {layout.inner.length ? "inner" : ""}
                </text>
                <text
                  x={X0 - 10}
                  y={layout.outerTop - 4}
                  textAnchor="end"
                  fontSize={8.5}
                  fill="var(--faint)"
                  style={{
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  {layout.outer.length ? "in the world" : ""}
                </text>
                {life.domains.map((dm) => {
                  const y = layout.laneY.get(dm.id)!;
                  return (
                    <g key={dm.id}>
                      <line
                        x1={X0}
                        x2={X1}
                        y1={y}
                        y2={y}
                        stroke="var(--rule)"
                        strokeWidth={0.8}
                        strokeDasharray="1.5 4"
                      />
                      <text
                        x={X0 - 10}
                        y={y + 4}
                        textAnchor="end"
                        fontSize={12.5}
                        fill={laneColor(dm.id)}
                        style={{ fontFamily: "var(--font-hand)" }}
                      >
                        {short(dm.label, 14).toLowerCase()}
                      </text>
                    </g>
                  );
                })}

                {/* the garden's dated moments */}
                {layers.garden && (
                  <g>
                    <text
                      x={X0 - 10}
                      y={layout.yStrip + STRIP_H - 2}
                      textAnchor="end"
                      fontSize={8.5}
                      fill="var(--faint)"
                      style={{
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                      }}
                    >
                      the garden
                    </text>
                    <line
                      x1={X0}
                      x2={X1}
                      y1={layout.yStrip + STRIP_H}
                      y2={layout.yStrip + STRIP_H}
                      stroke="var(--rule)"
                      strokeWidth={0.8}
                    />
                    {strip.map((s) => {
                      const h = Math.min(STRIP_H - 2, 3 + s.n * 1.4);
                      return (
                        <g
                          key={s.day}
                          data-moment={s.day}
                          style={{ cursor: writable ? "pointer" : "default" }}
                          onPointerMove={(ev) => {
                            if (drag.current) return;
                            const { sx, sy } = toSheet(ev);
                            setHover({
                              kind: "moment",
                              day: s.day,
                              x: sx,
                              y: sy,
                            });
                          }}
                          onPointerLeave={() => setHover(null)}
                          onPointerDown={(ev) => ev.stopPropagation()}
                          onClick={() => {
                            if (!writable) return;
                            const said = (byDay.get(s.day) ?? [])
                              .filter((m) => m.how === "said")
                              .map((m) => m.id);
                            begin(
                              s.day,
                              layout.outer[0]?.id ??
                                life.domains[0]?.id ??
                                "work",
                              said.slice(0, 6),
                            );
                          }}
                        >
                          <rect
                            x={s.x - 3}
                            y={layout.yStrip}
                            width={6}
                            height={STRIP_H}
                            fill="transparent"
                          />
                          <line
                            x1={s.x}
                            x2={s.x}
                            y1={layout.yStrip + STRIP_H}
                            y2={layout.yStrip + STRIP_H - h}
                            stroke={
                              s.lensed
                                ? "var(--accent)"
                                : s.said
                                  ? "var(--muted)"
                                  : "var(--faint)"
                            }
                            strokeWidth={s.lensed ? 1.6 : 1}
                            strokeOpacity={s.lensed ? 1 : s.said ? 0.8 : 0.5}
                          />
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* the marks: stretches, then days */}
                {marks
                  .filter((m) => m.span)
                  .map((m, i) => {
                    const on = selected === m.e.slug;
                    const lensed = lens !== null && m.e.stones.includes(lens);
                    const w = Math.max(3, m.x1 - m.x);
                    return (
                      <g
                        key={m.e.slug}
                        data-slug={m.e.slug}
                        className={`k-mark ${settled ? "" : "k-arrive"}`}
                        style={{
                          ["--i" as string]: i,
                          cursor: writable ? "grab" : "pointer",
                          opacity: m.future ? 0.35 : 1,
                        }}
                        onPointerMove={(ev) => {
                          if (drag.current) return;
                          const { sx, sy } = toSheet(ev);
                          setHover({
                            kind: "entry",
                            slug: m.e.slug,
                            x: sx,
                            y: sy,
                          });
                        }}
                        onPointerLeave={() => setHover(null)}
                      >
                        <rect
                          x={m.x}
                          y={m.y - 4.5}
                          width={w}
                          height={9}
                          fill={m.color}
                          fillOpacity={m.expected ? 0 : 0.28}
                        />
                        <path
                          d={roughRect(w, 9, seedOf(m.e.slug), {
                            wobble: 0.8,
                            overshoot: 2,
                          })}
                          transform={`translate(${m.x} ${m.y - 4.5})`}
                          fill="none"
                          stroke={on || lensed ? "var(--accent)" : m.color}
                          strokeWidth={on ? 1.6 : 1.1}
                          strokeDasharray={m.expected ? "3 2.5" : undefined}
                        />
                        {m.e.until === "now" && (
                          <path
                            d={`M${m.x1 - 5} ${m.y - 5}L${m.x1 + 1} ${m.y}L${m.x1 - 5} ${m.y + 5}`}
                            fill="none"
                            stroke={m.color}
                            strokeWidth={1.1}
                          />
                        )}
                        <rect
                          x={m.x - 4}
                          y={m.y - 10}
                          width={w + 8}
                          height={20}
                          fill="transparent"
                        />
                      </g>
                    );
                  })}
                {marks
                  .filter((m) => !m.span)
                  .map((m, i) => {
                    const on = selected === m.e.slug;
                    const lensed = lens !== null && m.e.stones.includes(lens);
                    const prec = precisionOf(m.e.day);
                    const wx0 = x(timeOf(m.e.day, "start"));
                    const wx1 = x(timeOf(m.e.day, "end"));
                    return (
                      <g
                        key={m.e.slug}
                        data-slug={m.e.slug}
                        className={`k-mark ${settled ? "" : "k-arrive"}`}
                        style={{
                          ["--i" as string]: i + 4,
                          cursor: writable ? "grab" : "pointer",
                          opacity: m.future ? 0.35 : 1,
                        }}
                        onPointerMove={(ev) => {
                          if (drag.current) return;
                          const { sx, sy } = toSheet(ev);
                          setHover({
                            kind: "entry",
                            slug: m.e.slug,
                            x: sx,
                            y: sy,
                          });
                        }}
                        onPointerLeave={() => setHover(null)}
                      >
                        {/* the precision, shown: a whisker across the period the day names */}
                        {prec !== "day" && wx1 - wx0 > m.r * 2 + 6 && (
                          <line
                            x1={wx0}
                            x2={wx1}
                            y1={m.y}
                            y2={m.y}
                            stroke={m.color}
                            strokeWidth={0.8}
                            strokeOpacity={0.55}
                          />
                        )}
                        <path
                          d={roughEllipse(m.r * 2, m.r * 2, seedOf(m.e.slug), {
                            pad: 0,
                            steps: 12,
                            wobble: 0.9,
                          })}
                          transform={`translate(${m.x - m.r} ${m.y - m.r})`}
                          fill={m.expected ? "var(--surface)" : m.color}
                          fillOpacity={m.expected ? 0.9 : 0.85}
                          stroke={
                            on || lensed
                              ? "var(--accent)"
                              : m.expected
                                ? m.color
                                : pen
                          }
                          strokeOpacity={on || lensed ? 1 : 0.5}
                          strokeWidth={on ? 1.6 : 0.9}
                          strokeDasharray={m.expected ? "2.5 2" : undefined}
                        />
                        {on && (
                          <path
                            d={roughEllipse(
                              m.r * 2 + 10,
                              m.r * 2 + 10,
                              seedOf(`${m.e.slug}-ring`),
                              { pad: 0, steps: 14, wobble: 1.2 },
                            )}
                            transform={`translate(${m.x - m.r - 5} ${m.y - m.r - 5})`}
                            fill="none"
                            stroke="var(--accent)"
                            strokeWidth={1.2}
                          />
                        )}
                        <rect
                          x={m.x - m.r - 5}
                          y={m.y - m.r - 5}
                          width={m.r * 2 + 10}
                          height={m.r * 2 + 10}
                          fill="transparent"
                        />
                      </g>
                    );
                  })}

                {/* the labels */}
                {labels.map((l) => {
                  const on =
                    selected === l.slug ||
                    (hover?.kind === "entry" && hover.slug === l.slug);
                  return (
                    <text
                      key={l.slug}
                      x={l.x}
                      y={l.y}
                      textAnchor={l.anchor}
                      fontSize={on ? 13 : 11.5}
                      fill={on ? "var(--ink)" : "var(--muted)"}
                      stroke="var(--surface)"
                      strokeWidth={on ? 3.5 : 3}
                      strokeOpacity={0.85}
                      paintOrder="stroke"
                      style={{ fontFamily: "var(--font-hand)" }}
                    >
                      {l.text}
                    </text>
                  );
                })}

                {/* the axis */}
                <g>
                  <path d={axisInk.ink} fill={pen} mask="url(#k-axis-mask)" />
                  {ticks.map((tk) => {
                    const tx = x(tk.ms);
                    const age = tk.major ? ageOf(tk.ms) : null;
                    return (
                      <g key={tk.ms}>
                        <line
                          x1={tx}
                          x2={tx}
                          y1={layout.axisY - (tk.major ? 6 : 3)}
                          y2={layout.axisY + (tk.major ? 6 : 3)}
                          stroke={pen}
                          strokeWidth={tk.major ? 1 : 0.7}
                          strokeOpacity={tk.major ? 0.8 : 0.5}
                        />
                        {tk.label && (
                          <text
                            x={tx}
                            y={layout.axisY + 17}
                            textAnchor="middle"
                            fontSize={9}
                            fill={tk.major ? "var(--muted)" : "var(--faint)"}
                            style={{
                              fontFamily: "var(--font-mono)",
                              letterSpacing: "0.06em",
                            }}
                          >
                            {tk.label}
                          </text>
                        )}
                        {tk.label && age !== null && age >= 0 && (
                          <text
                            x={tx}
                            y={layout.axisY + 27}
                            textAnchor="middle"
                            fontSize={10.5}
                            fill="var(--faint)"
                            style={{ fontFamily: "var(--font-hand)" }}
                          >
                            {age}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  {life.born && (
                    <text
                      x={X0 - 10}
                      y={layout.axisY + 27}
                      textAnchor="end"
                      fontSize={10.5}
                      fill="var(--faint)"
                      style={{ fontFamily: "var(--font-hand)" }}
                    >
                      age
                    </text>
                  )}
                  {life.born &&
                    validDay(life.born) &&
                    x(timeOf(life.born, "mid")) >= X0 &&
                    x(timeOf(life.born, "mid")) <= X1 && (
                      <g aria-hidden>
                        <line
                          x1={x(timeOf(life.born, "mid"))}
                          x2={x(timeOf(life.born, "mid"))}
                          y1={layout.axisY - 10}
                          y2={layout.axisY + 10}
                          stroke={pen}
                          strokeWidth={1.4}
                        />
                        <text
                          x={x(timeOf(life.born, "mid"))}
                          y={layout.axisY - 13}
                          textAnchor="middle"
                          fontSize={10.5}
                          fill="var(--muted)"
                          style={{ fontFamily: "var(--font-hand)" }}
                        >
                          born
                        </text>
                      </g>
                    )}
                  {x(nowMs) >= X0 && x(nowMs) <= X1 && present !== today && (
                    <line
                      x1={x(nowMs)}
                      x2={x(nowMs)}
                      y1={layout.axisY - 8}
                      y2={layout.axisY + 8}
                      stroke="var(--faint)"
                      strokeWidth={1}
                      strokeDasharray="2 2"
                      aria-hidden
                    />
                  )}
                </g>

                {/* the present, draggable */}
                {presentX >= X0 - 8 && presentX <= X1 + 8 && (
                  <g
                    data-present
                    style={{ cursor: "ew-resize" }}
                    onPointerMove={(ev) => {
                      if (drag.current) return;
                      const { sx, sy } = toSheet(ev);
                      setHover({ kind: "present", x: sx, y: sy });
                    }}
                    onPointerLeave={() => setHover(null)}
                  >
                    <rect
                      x={presentX - 12}
                      y={layout.yLanesTop - 26}
                      width={24}
                      height={layout.lanesBottom - layout.yLanesTop + 40}
                      fill="transparent"
                    />
                    <path
                      d={ribbon(
                        stroke(
                          [presentX, layout.yLanesTop - 14],
                          [presentX, layout.lanesBottom + 10],
                          rand(seedOf(`present-${present}`)),
                          0.9,
                          2,
                        ),
                        2,
                        seedOf("present-ink"),
                      )}
                      fill="var(--accent)"
                    />
                    <text
                      x={presentX}
                      y={layout.yLanesTop - 18}
                      textAnchor="middle"
                      fontSize={11.5}
                      fill="var(--accent)"
                      style={{ fontFamily: "var(--font-hand)" }}
                    >
                      {present === today ? "today" : formatDay(present)}
                      {presentAge !== null && presentAge >= 0
                        ? ` · ${Math.floor(presentAge)}`
                        : ""}
                    </text>
                  </g>
                )}

                {/* nothing yet */}
                {entries.length === 0 && (
                  <text
                    x={(X0 + X1) / 2}
                    y={layout.axisY - 40}
                    textAnchor="middle"
                    fontSize={15}
                    fill="var(--faint)"
                    style={{ fontFamily: "var(--font-hand)" }}
                  >
                    {writable
                      ? "double-click the line where something happened"
                      : "nothing is set down here"}
                  </text>
                )}

                {/* the whole life, small, with the window bracketed */}
                <g data-mini style={{ cursor: "pointer" }}>
                  <rect
                    x={X0 - 4}
                    y={layout.yMini - 4}
                    width={X1 - X0 + 8}
                    height={MINI_H + 8}
                    fill="transparent"
                  />
                  <text
                    x={X0 - 10}
                    y={layout.yMini + MINI_H / 2 + 3}
                    textAnchor="end"
                    fontSize={8.5}
                    fill="var(--faint)"
                    style={{
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    the whole
                  </text>
                  <line
                    x1={X0}
                    x2={X1}
                    y1={layout.yMini + MINI_H / 2}
                    y2={layout.yMini + MINI_H / 2}
                    stroke={pen}
                    strokeOpacity={0.5}
                    strokeWidth={0.8}
                  />
                  {miniTicks.map((m) => (
                    <line
                      key={m.e.slug}
                      x1={m.x}
                      x2={m.x}
                      y1={layout.yMini + MINI_H / 2 - (m.world ? 3 : 6)}
                      y2={layout.yMini + MINI_H / 2 + (m.world ? 3 : 6)}
                      stroke={m.world ? "var(--faint)" : laneColor(m.e.lane)}
                      strokeWidth={m.world ? 0.8 : 1.2}
                      strokeOpacity={m.world ? 0.6 : 0.9}
                    />
                  ))}
                  <line
                    x1={xm(presentMs)}
                    x2={xm(presentMs)}
                    y1={layout.yMini - 2}
                    y2={layout.yMini + MINI_H + 2}
                    stroke="var(--accent)"
                    strokeWidth={1}
                  />
                  <path
                    d={roughRect(
                      Math.max(6, xm(window_[1]) - xm(window_[0])),
                      MINI_H + 4,
                      seedOf("k-window"),
                      { wobble: 0.8, overshoot: 2 },
                    )}
                    transform={`translate(${xm(window_[0])} ${layout.yMini - 2})`}
                    fill="var(--accent)"
                    fillOpacity={0.06}
                    stroke="var(--accent)"
                    strokeWidth={1}
                  />
                </g>
              </svg>

              {hoverCard()}
            </div>

            {/* the legend */}
            <div className="relative z-[2] flex flex-wrap items-center gap-x-3 gap-y-1 px-1 pt-1.5">
              <span className="meta" style={{ color: "var(--faint)" }}>
                a mark is a day, sized by how large it looms
              </span>
              <span className="meta" style={{ color: "var(--faint)" }}>
                · a bar is a stretch; › not ended
              </span>
              <span className="meta" style={{ color: "var(--faint)" }}>
                · hollow, dashed: expected
              </span>
              <span className="meta" style={{ color: "var(--faint)" }}>
                · hatched: the record does not speak
              </span>
              <span className="meta" style={{ color: "var(--faint)" }}>
                · ⌘ wheel or pinch zooms, sideways pans, drag pans, double-click sets down
              </span>
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
                htmlFor="chronology-search"
                style={{ color: "var(--faint)" }}
              >
                find on the line
              </label>
              <input
                id="chronology-search"
                ref={search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="a title, a tag, a word in a note  /"
                className="search mt-2 w-full px-3 py-2 text-[13px]"
                autoComplete="off"
              />
              {results.length > 0 && (
                <ul
                  className="panel sketched relative mt-2 p-1.5"
                  style={{ borderRadius: 3 }}
                >
                  <Sketch seed="chronology-found" draw />
                  {results.map((e) => (
                    <li key={e.slug}>
                      <Row e={e} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* the entry on the desk */}
            {d && (
              <section
                className="panel sketched relative p-4"
                style={{ borderRadius: 3 }}
                aria-label="The entry"
              >
                <Sketch
                  seed={`entry-${d.slug || "fresh"}`}
                  color="var(--accent)"
                  draw
                />
                <div className="flex items-baseline justify-between gap-2">
                  <div className="meta" style={{ color: laneColor(d.lane) }}>
                    {draft?.fresh ? "setting down" : "on the desk"}
                    <span style={{ color: "var(--faint)" }}>
                      {" "}
                      · {laneLabel(d.lane)}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setDraft(null);
                      setSelected(null);
                      setSure(false);
                    }}
                    className="meta"
                    style={{ color: "var(--faint)" }}
                    aria-label="Close"
                  >
                    esc
                  </button>
                </div>
                {d.lane !== "gap" && (
                  <input
                    ref={titleRef}
                    value={d.title}
                    onChange={(e) => setField("title", e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        keepDraft();
                      }
                    }}
                    readOnly={!writable}
                    maxLength={200}
                    placeholder="what happened"
                    className="search hand mt-2 w-full px-3 py-2 text-[17px] leading-[1.2]"
                  />
                )}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <label
                      className="meta block"
                      style={{ color: "var(--faint)" }}
                      htmlFor="k-day"
                    >
                      when
                    </label>
                    <input
                      id="k-day"
                      value={d.day}
                      onChange={(e) => setField("day", e.target.value.trim())}
                      readOnly={!writable}
                      placeholder="2019 · 2019-06 · 2019-06-12"
                      className="search mt-1 w-full px-2.5 py-1.5 text-[12.5px]"
                      style={{
                        fontFamily: "var(--font-mono)",
                        borderColor: validDay(d.day)
                          ? undefined
                          : "var(--accent)",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="meta block"
                      style={{ color: "var(--faint)" }}
                      htmlFor="k-until"
                    >
                      until
                    </label>
                    <input
                      id="k-until"
                      value={d.until ?? ""}
                      onChange={(e) =>
                        setField("until", e.target.value.trim() || null)
                      }
                      readOnly={!writable}
                      placeholder={
                        d.lane === "gap"
                          ? "a gap is a stretch"
                          : "a day, or now"
                      }
                      className="search mt-1 w-full px-2.5 py-1.5 text-[12.5px]"
                      style={{
                        fontFamily: "var(--font-mono)",
                        borderColor:
                          !d.until || d.until === "now" || validDay(d.until)
                            ? undefined
                            : "var(--accent)",
                      }}
                    />
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                  <span
                    className="meta"
                    style={{ color: "var(--faint)", textTransform: "none" }}
                  >
                    {validDay(d.day)
                      ? formatDay(d.day)
                      : "a year, a month or a day — as precise as you know"}
                    {validDay(d.day) &&
                    ageAt(life.born, timeOf(d.day, "mid")) !== null
                      ? ` · ${ageWords(ageAt(life.born, timeOf(d.day, "mid")))}`
                      : ""}
                    {d.until &&
                    (d.until === "now" || validDay(d.until)) &&
                    validDay(d.day)
                      ? ` · ${yearsWords((endOf(d, nowMs) - startOf(d)) / YEAR_MS)}`
                      : ""}
                  </span>
                </div>

                <label
                  className="meta mt-3 block"
                  style={{ color: "var(--faint)" }}
                  htmlFor="k-lane"
                >
                  lane
                </label>
                <select
                  id="k-lane"
                  value={d.lane}
                  onChange={(e) => {
                    const lane = e.target.value;
                    setDraft((dr) =>
                      dr
                        ? {
                            ...dr,
                            entry: {
                              ...dr.entry,
                              lane,
                              why:
                                lane === "gap"
                                  ? (dr.entry.why ?? "no-record")
                                  : null,
                              until:
                                lane === "gap" && !dr.entry.until
                                  ? dr.entry.day
                                  : dr.entry.until,
                            },
                          }
                        : dr,
                    );
                  }}
                  disabled={!writable}
                  className="search mt-1 w-full px-2.5 py-1.5 text-[12.5px]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  <optgroup label="inner">
                    {layout.inner.map((dm) => (
                      <option key={dm.id} value={dm.id}>
                        {dm.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="in the world">
                    {layout.outer.map((dm) => (
                      <option key={dm.id} value={dm.id}>
                        {dm.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="the circumstances">
                    <option value="structure">
                      structure · what was simply the case
                    </option>
                    <option value="conjuncture">
                      conjuncture · the weather of the era
                    </option>
                    <option value="happening">
                      happening · a dated public event
                    </option>
                  </optgroup>
                  <optgroup label="the record">
                    <option value="gap">
                      gap · the record does not speak for this
                    </option>
                  </optgroup>
                </select>

                {d.lane === "gap" ? (
                  <div className="mt-3">
                    <div className="meta" style={{ color: "var(--faint)" }}>
                      what kind of silence
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {WHYS.map((w) => (
                        <Chip
                          key={w}
                          on={d.why === w}
                          onClick={() => writable && setField("why", w as Why)}
                          disabled={!writable}
                        >
                          {WHY_LABEL[w]}
                        </Chip>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <div className="meta" style={{ color: "var(--faint)" }}>
                        how large it looms
                      </div>
                      <div className="mt-1 flex gap-1.5">
                        {([1, 2, 3] as Looms[]).map((n) => (
                          <Chip
                            key={n}
                            on={d.looms === n}
                            onClick={() => writable && setField("looms", n)}
                            disabled={!writable}
                            color={laneColor(d.lane)}
                          >
                            {"·".repeat(n)}
                          </Chip>
                        ))}
                      </div>
                    </div>
                    {!isLayer(d.lane) && (
                      <div>
                        <div className="meta" style={{ color: "var(--faint)" }}>
                          would you have it again?
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {(["yes", "no", "unsure"] as Again[]).map((a) => (
                            <Chip
                              key={a}
                              on={d.again === a}
                              onClick={() =>
                                writable &&
                                setField("again", d.again === a ? null : a)
                              }
                              disabled={!writable}
                            >
                              {a}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!isLayer(d.lane) && (
                  <>
                    <label
                      className="meta mt-3 block"
                      style={{ color: "var(--faint)" }}
                      htmlFor="k-tags"
                    >
                      tags
                    </label>
                    <input
                      id="k-tags"
                      value={d.tags.join(", ")}
                      onChange={(e) =>
                        setField(
                          "tags",
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean)
                            .slice(0, 20),
                        )
                      }
                      readOnly={!writable}
                      placeholder="move, city, …"
                      className="search mt-1 w-full px-2.5 py-1.5 text-[12.5px]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    />
                  </>
                )}

                <div className="meta mt-3" style={{ color: "var(--faint)" }}>
                  stones it is bound to
                </div>
                {d.stones.length > 0 && (
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {d.stones.map((id) => {
                      const n = nodes.get(id);
                      return (
                        <li
                          key={id}
                          className="chip flex items-center gap-1.5 px-2.5 py-1"
                        >
                          <Link
                            href={`/catalogue?id=${encodeURIComponent(id)}`}
                            className="hand text-[13px] leading-none"
                            style={{
                              color: n
                                ? `var(--kind-${n.kind})`
                                : "var(--muted)",
                            }}
                          >
                            {short(n?.label ?? id, 26)}
                          </Link>
                          {writable && (
                            <button
                              onClick={() =>
                                setField(
                                  "stones",
                                  d.stones.filter((s) => s !== id),
                                )
                              }
                              className="meta"
                              style={{ color: "var(--faint)" }}
                              aria-label={`Unbind ${n?.label ?? id}`}
                            >
                              ×
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {writable && (
                  <div className="relative">
                    <input
                      value={stoneQuery}
                      onChange={(e) => setStoneQuery(e.target.value)}
                      placeholder="bind a stone from the garden"
                      className="search mt-1.5 w-full px-2.5 py-1.5 text-[12.5px]"
                      autoComplete="off"
                    />
                    {stoneResults.length > 0 && (
                      <ul
                        className="panel sketched relative mt-1.5 p-1.5"
                        style={{ borderRadius: 3 }}
                      >
                        <Sketch seed="chronology-stones" draw />
                        {stoneResults.map((n) => (
                          <li key={n.id}>
                            <button
                              onClick={() => {
                                setField(
                                  "stones",
                                  [...d.stones, n.id].slice(0, 40),
                                );
                                setStoneQuery("");
                              }}
                              className="k-row flex w-full items-baseline gap-2 rounded px-1.5 py-0.5 text-left"
                            >
                              <span
                                className="meta shrink-0"
                                style={{ color: `var(--kind-${n.kind})` }}
                              >
                                {KIND_LABEL[n.kind] ?? n.kind}
                              </span>
                              <span
                                className="hand min-w-0 flex-1 truncate text-[14px]"
                                style={{ color: "var(--ink)" }}
                              >
                                {n.label}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <label
                  className="meta mt-3 block"
                  style={{ color: "var(--faint)" }}
                  htmlFor="k-note"
                >
                  note
                </label>
                <textarea
                  id="k-note"
                  value={d.note}
                  onChange={(e) => setField("note", e.target.value)}
                  readOnly={!writable}
                  rows={3}
                  maxLength={20_000}
                  placeholder={
                    d.lane === "gap"
                      ? "what you know about the silence"
                      : "what it was like; what it did"
                  }
                  className="search hand mt-1 w-full resize-y px-3 py-2 text-[14.5px] leading-[1.3]"
                />

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {writable && (dirty || draft?.fresh) && (
                    <button
                      onClick={keepDraft}
                      className="chip px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--accent)",
                        borderColor: "var(--accent)",
                      }}
                    >
                      {draft?.fresh
                        ? d.lane === "gap"
                          ? "name the gap"
                          : "set it down"
                        : "keep"}
                    </button>
                  )}
                  {writable && !draft?.fresh && chosen && (
                    <button
                      onClick={() =>
                        sure ? remove(chosen.slug) : setSure(true)
                      }
                      className="chip px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: sure ? "var(--accent)" : "var(--faint)",
                        borderColor: sure ? "var(--accent)" : undefined,
                      }}
                    >
                      {sure ? "yes, take it back" : "take it back"}
                    </button>
                  )}
                  {!draft?.fresh && chosen && (
                    <Chip onClick={() => centreOn(chosen)}>
                      find it on the line
                    </Chip>
                  )}
                  {!draft?.fresh && chosen && chosen.stones.length > 0 && (
                    <Chip
                      onClick={() =>
                        setLens(
                          lens === chosen.stones[0] ? null : chosen.stones[0],
                        )
                      }
                      on={lens === chosen.stones[0]}
                      color="var(--accent)"
                    >
                      through its stone
                    </Chip>
                  )}
                </div>
                {!draft?.fresh && chosen && validDay(chosen.recorded) && (
                  <p
                    className="meta mt-2"
                    style={{ color: "var(--faint)", textTransform: "none" }}
                  >
                    written down {formatDay(chosen.recorded)}
                    {dLate > 1
                      ? ` — ${yearsWords(dLate)} after it happened`
                      : ""}
                    {chosen.slug ? ` · ${chosen.slug}.md` : ""}
                  </p>
                )}
                {hoverEntry && chosen && hoverEntry.slug !== chosen.slug && (
                  <p
                    className="hand mt-1 text-[13.5px]"
                    style={{ color: "var(--accent)" }}
                  >
                    {short(hoverEntry.title || "that", 30)} —{" "}
                    {relate(hoverEntry, chosen, nowMs)}
                  </p>
                )}
              </section>
            )}

            {/* the reading */}
            <section
              className="panel sketched relative p-4"
              style={{ borderRadius: 3 }}
              aria-label="The reading"
            >
              <Sketch seed="chronology-reading" draw />
              <div className="meta" style={{ color: "var(--faint)" }}>
                the reading
                {present !== today ? (
                  <span style={{ color: "var(--accent)" }}>
                    {" "}
                    · as of {formatDay(present)}
                  </span>
                ) : (
                  ""
                )}
              </div>
              <ul className="mt-2">
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
              {scaleNote && (
                <p
                  className="hand mt-2 text-[13px] leading-[1.35]"
                  style={{ color: "var(--faint)" }}
                >
                  {scaleNote}
                </p>
              )}
              {payload && !writable && !specimen && (
                <p
                  className="hand mt-2 text-[13px]"
                  style={{ color: "var(--faint)" }}
                >
                  read-only here.
                </p>
              )}
              {writable && own.length === 0 && !showSpecimen && (
                <div className="mt-3">
                  <Chip onClick={() => setShowSpecimen(true)}>
                    show the specimen · a synthetic life
                  </Chip>
                </div>
              )}
            </section>

            {/* the scale and the layers */}
            <section aria-label="The scale and the layers">
              <div className="meta" style={{ color: "var(--faint)" }}>
                the scale
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Chip
                  on={life.scale === "clock"}
                  onClick={() =>
                    writable && putLife({ ...life, scale: "clock" })
                  }
                  disabled={!writable}
                >
                  clock · every year the same width
                </Chip>
                <Chip
                  on={life.scale === "proportional"}
                  onClick={() =>
                    writable &&
                    life.born &&
                    putLife({ ...life, scale: "proportional" })
                  }
                  disabled={!writable || !life.born}
                  title={
                    life.born
                      ? "a year at seven is not a year at thirty-seven"
                      : "needs the day you were born"
                  }
                >
                  proportional · ln(1 + age)
                </Chip>
              </div>
              <div className="meta mt-3" style={{ color: "var(--faint)" }}>
                the layers
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(
                  [
                    ["world", "circumstances"],
                    ["bump", "reminiscence bump"],
                    ["garden", "the garden"],
                    ["expected", "expected"],
                    ["labels", "labels"],
                  ] as [keyof Layers, string][]
                ).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setLayers((l) => ({ ...l, [k]: !l[k] }))}
                    className="chip relative px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: layers[k] ? "var(--ink)" : "var(--faint)",
                    }}
                    aria-pressed={layers[k]}
                  >
                    <span className="relative inline-block">
                      {label}
                      {!layers[k] && (
                        <Sketch
                          kind="strike"
                          seed={`layer-${k}`}
                          color="var(--accent)"
                        />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* the life */}
            <section aria-label="The life">
              <button
                onClick={() => setLifeOpen((o) => !o)}
                className="meta flex items-center gap-1.5"
                style={{ color: "var(--faint)" }}
              >
                <span
                  style={{
                    display: "inline-block",
                    transform: lifeOpen ? "rotate(90deg)" : "none",
                    transition: "transform 180ms cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  ›
                </span>
                the life · born {life.born ? formatDay(life.born) : "—"} ·{" "}
                {life.domains.length} lanes
              </button>
              {lifeOpen && (
                <div
                  className="panel sketched relative mt-2 p-3"
                  style={{ borderRadius: 3 }}
                >
                  <Sketch seed="chronology-life" draw />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label
                        className="meta block"
                        style={{ color: "var(--faint)" }}
                        htmlFor="k-born"
                      >
                        born
                      </label>
                      <input
                        id="k-born"
                        defaultValue={life.born ?? ""}
                        key={`born-${life.born}`}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v === (life.born ?? "")) return;
                          if (v && !validDay(v)) {
                            say("born — a year, a month or a day.");
                            return;
                          }
                          putLife({
                            ...life,
                            born: v || null,
                            scale: v ? life.scale : "clock",
                          });
                        }}
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          (e.target as HTMLInputElement).blur()
                        }
                        readOnly={!writable}
                        placeholder="2001 · 2001-05 · 2001-05-14"
                        className="search mt-1 w-full px-2.5 py-1.5 text-[12.5px]"
                        style={{ fontFamily: "var(--font-mono)" }}
                      />
                    </div>
                    <div>
                      <label
                        className="meta block"
                        style={{ color: "var(--faint)" }}
                        htmlFor="k-horizon"
                      >
                        horizon
                      </label>
                      <input
                        id="k-horizon"
                        defaultValue={life.horizon ?? ""}
                        key={`horizon-${life.horizon}`}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v === (life.horizon ?? "")) return;
                          if (v && !validDay(v)) {
                            say("horizon — a year, a month or a day.");
                            return;
                          }
                          putLife({ ...life, horizon: v || null });
                        }}
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          (e.target as HTMLInputElement).blur()
                        }
                        readOnly={!writable}
                        placeholder="how far ahead the line runs"
                        className="search mt-1 w-full px-2.5 py-1.5 text-[12.5px]"
                        style={{ fontFamily: "var(--font-mono)" }}
                      />
                    </div>
                  </div>
                  <div className="meta mt-3" style={{ color: "var(--faint)" }}>
                    the lanes · yours to name
                  </div>
                  <ul className="mt-1 flex flex-col gap-1">
                    {life.domains.map((dm) => (
                      <li key={dm.id} className="flex items-center gap-1.5">
                        <span
                          aria-hidden
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: laneColor(dm.id) }}
                        />
                        <input
                          defaultValue={dm.label}
                          key={`${dm.id}-${dm.label}`}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (!v || v === dm.label) return;
                            putLife({
                              ...life,
                              domains: life.domains.map((x) =>
                                x.id === dm.id ? { ...x, label: v } : x,
                              ),
                            });
                          }}
                          onKeyDown={(e) =>
                            e.key === "Enter" &&
                            (e.target as HTMLInputElement).blur()
                          }
                          readOnly={!writable}
                          className="search hand min-w-0 flex-1 px-2 py-1 text-[14px]"
                        />
                        <Chip
                          onClick={() =>
                            writable &&
                            putLife({
                              ...life,
                              domains: life.domains.map((x) =>
                                x.id === dm.id
                                  ? {
                                      ...x,
                                      register:
                                        x.register === "inner"
                                          ? "outer"
                                          : "inner",
                                    }
                                  : x,
                              ),
                            })
                          }
                          disabled={!writable}
                          on
                        >
                          {dm.register === "inner" ? "inner" : "world"}
                        </Chip>
                        {writable && life.domains.length > 1 && (
                          <button
                            onClick={() => {
                              if (entries.some((e) => e.lane === dm.id)) {
                                say(
                                  `${dm.label} still holds ${t.byLane[dm.id] ?? 0} — move them first.`,
                                );
                                return;
                              }
                              putLife({
                                ...life,
                                domains: life.domains.filter(
                                  (x) => x.id !== dm.id,
                                ),
                              });
                            }}
                            className="meta px-1"
                            style={{ color: "var(--faint)" }}
                            aria-label={`Remove the lane ${dm.label}`}
                          >
                            ×
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {writable && life.domains.length < 24 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <input
                        value={newLane}
                        onChange={(e) => setNewLane(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          const label = newLane.trim();
                          if (!label) return;
                          const id = domainIdOf(
                            label,
                            new Set(life.domains.map((x) => x.id)),
                          );
                          const dm: Domain = { id, label, register: "outer" };
                          putLife({ ...life, domains: [...life.domains, dm] });
                          setNewLane("");
                        }}
                        placeholder="a new lane · enter"
                        className="search hand min-w-0 flex-1 px-2 py-1 text-[14px]"
                      />
                    </div>
                  )}
                  <p
                    className="hand mt-2 text-[12.5px] leading-[1.35]"
                    style={{ color: "var(--faint)" }}
                  >
                    inner lanes draw above the line, world lanes below. the
                    scale and the lanes are kept in life.json.
                  </p>
                </div>
              )}
            </section>

            {/* everything set down, by year */}
            {entries.length > 0 && (
              <section aria-label="Set down">
                <div className="meta" style={{ color: "var(--faint)" }}>
                  set down · {entries.length}
                  {writable ? (
                    <>
                      {" · "}
                      <button
                        onClick={() =>
                          begin(
                            present,
                            layout.outer[0]?.id ??
                              life.domains[0]?.id ??
                              "work",
                          )
                        }
                        className="underline"
                        style={{ color: "var(--muted)" }}
                      >
                        new
                      </button>
                      {" · "}
                      <button
                        onClick={() =>
                          begin(dayAt(presentMs - 2 * YEAR_MS, "year"), "gap")
                        }
                        className="underline"
                        style={{ color: "var(--muted)" }}
                      >
                        name a gap
                      </button>
                    </>
                  ) : null}
                </div>
                <div className="scroll-thin mt-1 max-h-[24rem] overflow-y-auto pr-1">
                  {byYear.map(([y, list]) => (
                    <div key={y} className="mt-1.5">
                      <div
                        className="meta flex items-baseline gap-2"
                        style={{ color: "var(--faint)", textTransform: "none" }}
                      >
                        <span>{y}</span>
                        {ageOf(timeOf(y, "mid")) !== null &&
                          ageOf(timeOf(y, "mid"))! >= 0 && (
                            <span className="hand text-[12px]">
                              age {ageOf(timeOf(y, "mid"))}
                            </span>
                          )}
                      </div>
                      <ul>
                        {list.map((e) => (
                          <li key={e.slug}>
                            <Row e={e} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <p
              className="hand text-[13.5px] leading-[1.35]"
              style={{ color: "var(--faint)" }}
            >
              how it is read: {REST} a day is placed at the middle of the period
              it names and drawn with a whisker across it, so c. 2011 is honest
              about what it knows. the circumstances are yours to write — what
              was simply the case, the weather of the era, the dated public
              events; a gap is a stretch the record does not speak for, with a
              name for why. the garden strip ticks the days your notes speak of;
              click one to set it down. the desk counts and says what was so at
              the present; it does not grade a life.
              {!specimen && payload?.dir
                ? ` files at ${shortHome(payload.dir)}.`
                : ""}
            </p>
            <p
              className="meta"
              style={{ color: "var(--faint)", textTransform: "none" }}
            >
              / find · ← → walk · n new · 0 whole life · t scale · g garden ·
              esc
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
