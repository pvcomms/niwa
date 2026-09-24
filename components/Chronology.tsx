"use client";

import { putOnDesk } from "./desk";
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
  THREAD_AS,
  WHYS,
  WHY_LABEL,
  YEAR_MS,
  ageAt,
  ageWords,
  around,
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
  type Other,
  type Precision,
  type ThreadAs,
  type View,
  type Why,
} from "@/lib/chronology";
import { SPECIMEN_ENTRIES, SPECIMEN_LIFE } from "@/content/specimen";
import { WORLD, worldTag, type Offered } from "@/content/world";
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
const X0 = 112;
const X1 = 972;
const LANE_H = 34;
const ROW_H = 14;
const STRIP_H = 24;
const MINI_H = 22;
const DAY_MS = 86_400_000;

type Payload = {
  life: Life;
  entries: Entry[];
  others: Other[];
  writable: boolean;
  specimen: boolean;
  dir: string | null;
};
type Layers = {
  world: boolean;
  offered: boolean;
  bump: boolean;
  garden: boolean;
  expected: boolean;
  labels: boolean;
  threads: boolean;
};
type Hover =
  | { kind: "entry"; slug: string; x: number; y: number }
  | { kind: "other"; slug: string; x: number; y: number }
  | { kind: "offered"; id: string; x: number; y: number }
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
  | {
      kind: "mini";
      x: number;
      win: [number, number];
      moved: boolean;
      edge: "left" | "right" | null;
    };
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
  other: boolean;
};
type Label = {
  key: string;
  x: number;
  y: number;
  text: string;
  anchor: "start" | "middle";
  faint: boolean;
};

const LAYERS_DEFAULT: Layers = {
  world: true,
  offered: true,
  bump: true,
  garden: true,
  expected: true,
  labels: true,
  threads: true,
};
const LAYERS_KEY = "niwa-chronology-layers";
const SPECIMEN_NAME = "Specimen A";

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
const todayStr = () => new Date().toISOString().slice(0, 10);
const short = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1)}…` : s;
const shortHome = (p: string) => p.replace(/^\/Users\/[^/]+/, "~");
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const MONO = {
  fontFamily: "var(--font-mono)",
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
};
const HAND = { fontFamily: "var(--font-hand)" };

/**
 * The chronology: a life as a number line. Above the line, the lanes the
 * reader keeps for the inner life; below it, the ones for the world; over
 * both, the circumstances — what was simply the case, the weather of the
 * era, the dated public events, with the world's own happenings offered
 * faintly for the reader to let in — and, hatched across everything, the
 * stretches the record does not speak for. A day is a mark sized by how
 * large it looms; a stretch is a bar; an entry set down ahead of today is
 * hollow. The present is a line that can be dragged back, and the desk then
 * reads the record as it stood. A chosen entry drops plumb lines through
 * every lane, so what sat beside it can be seen; threads between entries are
 * the reader's own, drawn with a plain verb. Another life can be laid
 * alongside, read-only. Everything set down is one file in the vault.
 */
export default function Chronology() {
  const [garden, setGarden] = useState<Garden | null>(null);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [own, setOwn] = useState<Entry[]>([]);
  const [ownLife, setOwnLife] = useState<Life>(DEFAULT_LIFE);
  const [showSpecimen, setShowSpecimen] = useState(false);
  const [alongside, setAlongside] = useState<string | null>(null);
  const [win, setWin] = useState<[number, number] | null>(null);
  const [present, setPresent] = useState(todayStr);
  const [selected, setSelected] = useState<string | null>(null);
  const [peek, setPeek] = useState<string | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [sure, setSure] = useState(false);
  const [query, setQuery] = useState("");
  const [stoneQuery, setStoneQuery] = useState("");
  const [threadQuery, setThreadQuery] = useState("");
  const [threadAs, setThreadAs] = useState<ThreadAs>("led to");
  const [lens, setLens] = useState<string | null>(null);
  const [layers, setLayers] = useState<Layers>(LAYERS_DEFAULT);
  const [lifeOpen, setLifeOpen] = useState(false);
  const [worldOpen, setWorldOpen] = useState(false);
  const [newLane, setNewLane] = useState("");
  const [cap, setCap] = useState<string | null>(null);
  const [kept, setKept] = useState<"idle" | "saving" | "kept" | "error">(
    "idle",
  );
  const [settled, setSettled] = useState(false);
  const [panning, setPanning] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [theme, setTheme] = useTheme();

  const svg = useRef<SVGSVGElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const drag = useRef<Drag | null>(null);
  const ownRef = useRef<Entry[]>([]);
  const winRef = useRef<[number, number] | null>(null);
  const targetRef = useRef<View | null>(null);
  const animRef = useRef<number | null>(null);
  const capTimer = useRef<number | null>(null);
  const keptTimer = useRef<number | null>(null);
  ownRef.current = own;
  winRef.current = win;

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
        setPayload({ ...p, others: p.others ?? [] });
        setOwn(p.entries);
        setOwnLife(p.life);
      });
    try {
      const raw = localStorage.getItem(LAYERS_KEY);
      if (raw) setLayers({ ...LAYERS_DEFAULT, ...JSON.parse(raw) });
    } catch {
      /* private window */
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onMq = () => setReduce(mq.matches);
    mq.addEventListener("change", onMq);
    const t = window.setTimeout(() => setSettled(true), 1600);
    return () => {
      window.clearTimeout(t);
      mq.removeEventListener("change", onMq);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LAYERS_KEY, JSON.stringify(layers));
    } catch {
      /* private window */
    }
  }, [layers]);

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

  /** The other lives that can be laid alongside: any folder under others/, and the specimen when it is not the life shown. */
  const others: Other[] = useMemo(() => {
    const list = [...(payload?.others ?? [])];
    if (!specimen)
      list.push({
        name: SPECIMEN_NAME,
        life: SPECIMEN_LIFE,
        entries: SPECIMEN_ENTRIES,
      });
    return list;
  }, [payload?.others, specimen]);
  const other = useMemo(
    () => others.find((o) => o.name === alongside) ?? null,
    [others, alongside],
  );

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
  const whole = useMemo(() => {
    const all = other ? [...entries, ...other.entries] : entries;
    return wholeOf(all, life, nowMs);
  }, [entries, other, life, nowMs]);
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
  const um = useCallback(
    (px: number) =>
      wholeU.u0 + ((px - X0) / (X1 - X0)) * (wholeU.u1 - wholeU.u0),
    [wholeU],
  );
  const windowYears = (window_[1] - window_[0]) / YEAR_MS;
  const presentMs = timeOf(present, "mid");
  const minSpanAt = useCallback(
    (ms: number) => toU(ms + 7 * DAY_MS, axis) - toU(ms - 7 * DAY_MS, axis),
    [axis],
  );

  /**
   * Move the window, in time, easing there; the wheel and the keys accumulate
   * onto the last target. Driven by a timer rather than requestAnimationFrame:
   * some embedded views throttle frames to a crawl while still visible, and a
   * zoom that stalls halfway is worse than one that is not butter.
   */
  const animateTo = useCallback(
    (target: View, dur = 320) => {
      if (animRef.current) window.clearTimeout(animRef.current);
      targetRef.current = target;
      const startWin = winRef.current ?? whole;
      const from = { u0: toU(startWin[0], axis), u1: toU(startWin[1], axis) };
      const toWin = (v: View): [number, number] => [
        fromU(v.u0, axis),
        fromU(v.u1, axis),
      ];
      if (dur <= 0 || reduce) {
        setWin(toWin(target));
        targetRef.current = null;
        animRef.current = null;
        return;
      }
      const t0 = performance.now();
      const step = () => {
        const t = Math.min(1, (performance.now() - t0) / dur);
        const k = ease(t);
        setWin(
          toWin({
            u0: from.u0 + (target.u0 - from.u0) * k,
            u1: from.u1 + (target.u1 - from.u1) * k,
          }),
        );
        if (t < 1) animRef.current = window.setTimeout(step, 16);
        else {
          animRef.current = null;
          targetRef.current = null;
        }
      };
      animRef.current = window.setTimeout(step, 0);
    },
    [axis, whole, reduce],
  );
  const currentTarget = useCallback(
    (): View => targetRef.current ?? view,
    [view],
  );

  const zoomBy = useCallback(
    (factor: number, aboutU?: number, dur = 220) => {
      const v = currentTarget();
      const about = aboutU ?? (v.u0 + v.u1) / 2;
      animateTo(
        zoom(v, about, factor, wholeU, minSpanAt(fromU(about, axis))),
        dur,
      );
    },
    [currentTarget, animateTo, wholeU, minSpanAt, axis],
  );

  const wholeLife = useCallback(() => {
    animateTo(wholeU, 420);
    window.setTimeout(() => setWin(null), reduce ? 0 : 440);
  }, [animateTo, wholeU, reduce]);

  const centreOn = useCallback(
    (e: Entry) => {
      const s = startOf(e);
      const en = endOf(e, nowMs);
      const span = window_[1] - window_[0];
      const need = en - s;
      const width = need > span * 0.8 ? need * 1.8 : span;
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
      animateTo({ u0: toU(w0, axis), u1: toU(w1, axis) }, 380);
    },
    [window_, whole, nowMs, animateTo, axis],
  );

  // ── layout ──────────────────────────────────────────────────────────────
  const letIn = useMemo(() => {
    const s = new Set<string>();
    const titles = new Set(entries.map((e) => e.title.toLowerCase()));
    for (const o of WORLD) {
      if (titles.has(o.title.toLowerCase())) s.add(o.id);
    }
    for (const e of entries)
      for (const t of e.tags) if (t.startsWith("world:")) s.add(t.slice(6));
    return s;
  }, [entries]);
  const offered = useMemo(
    () =>
      layers.world && layers.offered
        ? WORLD.filter((o) => !letIn.has(o.id))
        : [],
    [letIn, layers.world, layers.offered],
  );

  const layout = useMemo(() => {
    const structure = entries.filter((e) => e.lane === "structure");
    const conjuncture = entries.filter((e) => e.lane === "conjuncture");
    const offeredSpans = offered.filter((o) => o.lane === "conjuncture");
    const sRows = packRows(structure, startOf, (e) => endOf(e, nowMs));
    const conjAll: { s: number; e: number }[] = [
      ...conjuncture.map((e) => ({ s: startOf(e), e: endOf(e, nowMs) })),
      ...offeredSpans.map((o) => ({
        s: timeOf(o.day, "start"),
        e: o.until === "now" ? nowMs : timeOf(o.until ?? o.day, "end"),
      })),
    ];
    const cRowsAll = packRows(
      conjAll,
      (r) => r.s,
      (r) => r.e,
    );
    const cRows = cRowsAll.slice(0, conjuncture.length);
    const oRows = cRowsAll.slice(conjuncture.length);
    const sN = Math.max(1, ...sRows.map((r) => r + 1));
    const cN = Math.max(1, ...cRowsAll.map((r) => r + 1));
    let y = 20;
    const yStruct = y;
    y += sN * ROW_H + 8;
    const yConj = y;
    y += cN * ROW_H + 10;
    const yHapp = y + 5;
    y += 28;
    const yLanesTop = layers.world ? y + 10 : 30;
    const inner = life.domains.filter((d) => d.register === "inner");
    const outer = life.domains.filter((d) => d.register === "outer");
    const laneY = new Map<string, number>();
    inner.forEach((d, i) =>
      laneY.set(d.id, yLanesTop + i * LANE_H + LANE_H / 2),
    );
    const axisY = yLanesTop + inner.length * LANE_H + 28;
    const outerTop = axisY + 34;
    outer.forEach((d, i) =>
      laneY.set(d.id, outerTop + i * LANE_H + LANE_H / 2),
    );
    const lanesBottom = outerTop + outer.length * LANE_H;
    const yOther = other ? lanesBottom + 22 : null;
    const otherAxis = yOther !== null ? yOther + LANE_H : null;
    const otherBottom = otherAxis !== null ? otherAxis + LANE_H : lanesBottom;
    const yStrip = otherBottom + 14;
    const yMini = layers.garden ? yStrip + STRIP_H + 22 : otherBottom + 26;
    const H = yMini + MINI_H + 16;
    return {
      structure,
      conjuncture,
      offeredSpans,
      sRows,
      cRows,
      oRows,
      yStruct,
      yConj,
      yHapp,
      yLanesTop,
      laneY,
      axisY,
      outerTop,
      lanesBottom,
      yOther,
      otherAxis,
      otherBottom,
      yStrip,
      yMini,
      H,
      inner,
      outer,
    };
  }, [
    entries,
    offered,
    life.domains,
    layers.world,
    layers.garden,
    nowMs,
    other,
  ]);
  const H = layout.H;
  const plumbTop = layers.world ? layout.yStruct - 6 : layout.yLanesTop - 10;

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

  const marks: Mark[] = useMemo(() => {
    const out: Mark[] = [];
    const place = (
      list: Entry[],
      yFor: (e: Entry) => number | undefined,
      isOther: boolean,
    ) => {
      const byLane = new Map<string, Entry[]>();
      for (const e of list) {
        if (yFor(e) === undefined) continue;
        if (!layers.expected && startOf(e) > nowMs) continue;
        const l = byLane.get(e.lane) ?? [];
        l.push(e);
        byLane.set(e.lane, l);
      }
      for (const [, l] of byLane) {
        const spans = l.filter(isSpan);
        const rows = packRows(spans, startOf, (e) => endOf(e, nowMs));
        const rowOf = new Map(spans.map((e, i) => [e.slug, rows[i]]));
        for (const e of l) {
          const y0 = yFor(e)!;
          const span = isSpan(e);
          const xs = x(span ? startOf(e) : midOf(e));
          const xe = x(endOf(e, nowMs));
          if (xe < X0 - 24 || xs > X1 + 24) continue;
          const row = rowOf.get(e.slug) ?? 0;
          const dy = span ? (row === 0 ? 0 : row % 2 ? -10 : 10) : 0;
          out.push({
            e,
            x: xs,
            x1: xe,
            y: y0 + dy,
            r: 3.4 + 1.9 * e.looms,
            span,
            future: startOf(e) > presentMs,
            expected: startOf(e) > nowMs,
            color: isOther ? "var(--muted)" : laneColor(e.lane),
            other: isOther,
          });
        }
      }
    };
    place(entries, (e) => layout.laneY.get(e.lane), false);
    if (other && layout.otherAxis !== null) {
      const reg = new Map(other.life.domains.map((d) => [d.id, d.register]));
      const oy = layout.otherAxis;
      place(
        other.entries.filter((e) => !isLayer(e.lane)),
        (e) =>
          reg.get(e.lane) === "inner" ? oy - LANE_H / 2 : oy + LANE_H / 2,
        true,
      );
    }
    return out;
  }, [entries, other, layout, layers.expected, nowMs, presentMs, x, laneColor]);

  const chosen = useMemo(
    () => entries.find((e) => e.slug === selected) ?? null,
    [entries, selected],
  );
  useEffect(() => {
    putOnDesk(
      chosen ? { kind: "entry", id: chosen.slug, label: chosen.title } : null,
    );
    return () => putOnDesk(null);
  }, [chosen]);
  const peeked = useMemo(
    () =>
      other && peek
        ? (other.entries.find((e) => e.slug === peek) ?? null)
        : null,
    [other, peek],
  );
  const hoverEntry = useMemo(() => {
    if (hover?.kind === "entry")
      return entries.find((e) => e.slug === hover.slug) ?? null;
    if (hover?.kind === "other")
      return other?.entries.find((e) => e.slug === hover.slug) ?? null;
    return null;
  }, [hover, entries, other]);
  const hoverOffered = useMemo(
    () =>
      hover?.kind === "offered"
        ? (WORLD.find((o) => o.id === hover.id) ?? null)
        : null,
    [hover],
  );

  // labels: greedy, the ones that loom largest first; the whole title if it fits
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
      44,
    );
    const isOn = (m: Mark) =>
      (!m.other && m.e.slug === selected) ||
      (m.other && m.e.slug === peek) ||
      (hover?.kind === (m.other ? "other" : "entry") &&
        hover.slug === m.e.slug);
    const order = [...marks].sort(
      (a, b) =>
        Number(isOn(b)) - Number(isOn(a)) ||
        Number(a.other) - Number(b.other) ||
        b.e.looms - a.e.looms ||
        a.x - b.x,
    );
    for (const m of order) {
      const must = isOn(m);
      if (!layers.labels && !must && m.e.looms < 3) continue;
      if (!m.e.title) continue;
      const cands: [number, number, "start" | "middle"][] = m.span
        ? [
            [m.x + 3, m.y - 9, "start"],
            [m.x + 3, m.y + 17, "start"],
            [m.x + 3, m.y - 22, "start"],
          ]
        : [
            [m.x, m.y - m.r - 6, "middle"],
            [m.x, m.y + m.r + 13, "middle"],
            [m.x, m.y - m.r - 19, "middle"],
            [m.x, m.y + m.r + 26, "middle"],
          ];
      const tries = must
        ? [short(m.e.title, 64)]
        : [short(m.e.title, 44), short(m.e.title, maxChars)];
      let placed = false;
      for (const text of tries) {
        const w = text.length * 6.1 + 4;
        for (const [lx, ly, anchor] of cands) {
          const bx = anchor === "middle" ? lx - w / 2 : lx;
          if (bx < X0 - 40 || bx + w > X1 + 40) continue;
          const box: [number, number, number, number] = [bx, ly - 10, w, 13];
          if (!must && hit(box)) continue;
          taken.push(box);
          out.push({
            key: `${m.other ? "o" : "e"}-${m.e.slug}`,
            x: lx,
            y: ly,
            text,
            anchor,
            faint: m.other,
          });
          placed = true;
          break;
        }
        if (placed) break;
      }
      if (!placed && must)
        out.push({
          key: `${m.other ? "o" : "e"}-${m.e.slug}`,
          x: m.x,
          y: m.y - m.r - 6,
          text: short(m.e.title, 64),
          anchor: "middle",
          faint: m.other,
        });
    }
    return out;
  }, [marks, selected, peek, hover, layers.labels]);

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
  const near = useMemo(
    () => (chosen ? around(entries, chosen, nowMs) : []),
    [entries, chosen, nowMs],
  );
  const bySlug = useMemo(
    () => new Map(entries.map((e) => [e.slug, e])),
    [entries],
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    if (selected) url.searchParams.set("id", selected);
    else url.searchParams.delete("id");
    if (lens) url.searchParams.set("stone", lens);
    else url.searchParams.delete("stone");
    window.history.replaceState(null, "", url);
  }, [selected, lens]);

  useEffect(() => {
    if (!chosen) return;
    setDraft({ entry: chosen, fresh: false });
    setSure(false);
    setPeek(null);
  }, [chosen]);

  useEffect(() => {
    if (draft?.fresh) titleRef.current?.focus();
  }, [draft?.fresh]);

  useEffect(() => {
    setPeek(null);
  }, [alongside]);

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
        { method: "DELETE" },
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
      { ...e, recorded: e.recorded || today },
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
      setPeek(null);
      setDraft({ entry: { ...e, stones }, fresh: true });
      setSure(false);
    },
    [writable, specimen, say, today],
  );

  /** Let an offered happening onto the line: it becomes the reader's own file, at once. */
  const admit = useCallback(
    async (o: Offered) => {
      if (!writable) {
        say(
          specimen ? "the specimen is not yours to change." : "read-only here.",
        );
        return;
      }
      const e: Entry = {
        ...emptyEntry(o.day, o.lane, today),
        title: o.title,
        until: o.until ?? null,
        note: o.note,
        tags: [worldTag(o.id)],
      };
      const k = await putEntry(e, true);
      if (!k) return;
      say(`let in: ${short(o.title, 28)}.`);
      setSelected(k.slug);
    },
    [writable, specimen, say, today, putEntry],
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
        if (sy >= L.yConj - 4 && sy < L.yHapp - 12) return "conjuncture";
        if (Math.abs(sy - L.yHapp) <= 13) return "happening";
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
    const edge = el.closest("[data-edge]")?.getAttribute("data-edge") as
      "left" | "right" | null;
    if (el.closest("[data-still]")) return;
    svg.current?.setPointerCapture(ev.pointerId);
    if (animRef.current) {
      window.clearTimeout(animRef.current);
      animRef.current = null;
      targetRef.current = null;
    }
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
      drag.current = { kind: "mini", x: sx, win: window_, moved: false, edge };
      return;
    }
    drag.current = { kind: "pan", x: sx, win: window_, moved: false };
  };

  const onMove = (ev: ReactPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const { sx } = toSheet(ev);
    if (d.kind === "pan") {
      if (Math.abs(sx - d.x) > 2 && !d.moved) {
        d.moved = true;
        setPanning(true);
      }
      if (!d.moved) return;
      const v0 = { u0: toU(d.win[0], axis), u1: toU(d.win[1], axis) };
      const du = -((sx - d.x) / (X1 - X0)) * (v0.u1 - v0.u0);
      const v = pan(v0, du, wholeU);
      setWin([fromU(v.u0, axis), fromU(v.u1, axis)]);
      return;
    }
    if (d.kind === "mini") {
      if (Math.abs(sx - d.x) > 2) d.moved = true;
      if (!d.moved) return;
      const v0 = { u0: toU(d.win[0], axis), u1: toU(d.win[1], axis) };
      let v: View;
      if (d.edge === "left") {
        const u0 = clamp(
          um(sx),
          wholeU.u0,
          v0.u1 - minSpanAt(fromU(v0.u1, axis)),
        );
        v = { u0, u1: v0.u1 };
      } else if (d.edge === "right") {
        const u1 = clamp(
          um(sx),
          v0.u0 + minSpanAt(fromU(v0.u0, axis)),
          wholeU.u1,
        );
        v = { u0: v0.u0, u1 };
      } else {
        const du = ((sx - d.x) / (X1 - X0)) * (wholeU.u1 - wholeU.u0);
        v = pan(v0, du, wholeU);
      }
      setWin([fromU(v.u0, axis), fromU(v.u1, axis)]);
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
    setPanning(false);
    if (!d) return;
    const { sx, sy } = toSheet(ev);
    if (d.kind === "pan" && !d.moved) {
      if (Math.abs(sy - layout.axisY) <= 16 && sx >= X0 && sx <= X1) {
        setPresent(dayAt(clamp(at(sx), whole[0], whole[1])));
        return;
      }
      setSelected(null);
      setPeek(null);
      if (draft && !draft.fresh) setDraft(null);
      return;
    }
    if (d.kind === "mini" && !d.moved) {
      const u = um(sx);
      const span = view.u1 - view.u0;
      animateTo(pan({ u0: u - span / 2, u1: u + span / 2 }, 0, wholeU), 360);
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
      if (e && writable)
        putEntry(e, false).then(
          (k) => k && say(`moved to ${spanWords(k.day, k.until)}.`),
        );
    }
  };

  const onDouble = (ev: React.MouseEvent<SVGSVGElement>) => {
    const { sx, sy } = toSheet(ev);
    if (
      (ev.target as Element).closest(
        "[data-slug],[data-present],[data-mini],[data-moment],[data-offered],[data-still]",
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

  // the wheel: ⌘ or a pinch zooms about the pointer, sideways pans, a plain wheel scrolls the page
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      const sideways = Math.abs(ev.deltaX) > Math.abs(ev.deltaY);
      const pinch = ev.ctrlKey || ev.metaKey;
      if (!sideways && !pinch) return;
      ev.preventDefault();
      const box = el.getBoundingClientRect();
      const sx = ((ev.clientX - box.left) / box.width) * W;
      const v = currentTarget();
      if (sideways) {
        const du = (ev.deltaX / (X1 - X0)) * (v.u1 - v.u0);
        animateTo(pan(v, du, wholeU), 120);
        return;
      }
      const atU = v.u0 + ((v.u1 - v.u0) * (clamp(sx, X0, X1) - X0)) / (X1 - X0);
      const factor = Math.exp(ev.deltaY * 0.0028);
      animateTo(zoom(v, atU, factor, wholeU, minSpanAt(fromU(atU, axis))), 160);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [currentTarget, animateTo, wholeU, minSpanAt, axis]);

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
        setPeek(null);
        setDraft(null);
        setSure(false);
        return;
      }
      if (e.key === "0") {
        wholeLife();
        return;
      }
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        zoomBy(0.6);
        return;
      }
      if (e.key === "-") {
        e.preventDefault();
        zoomBy(1 / 0.6);
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
      if (e.key === "w") {
        setLayers((l) => ({ ...l, offered: !l.offered }));
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
    wholeLife,
    zoomBy,
  ]);

  // ── search ──────────────────────────────────────────────────────────────
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return entries
      .filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.tags.some((tg) => tg.toLowerCase().includes(q)) ||
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

  const threadResults = useMemo(() => {
    const q = threadQuery.trim().toLowerCase();
    if (q.length < 2 || !draft) return [];
    const have = new Set(draft.entry.threads.map((th) => th.to));
    return entries
      .filter(
        (e) =>
          e.slug !== draft.entry.slug &&
          !have.has(e.slug) &&
          e.lane !== "gap" &&
          e.title.toLowerCase().includes(q),
      )
      .sort((a, b) => startOf(a) - startOf(b))
      .slice(0, 6);
  }, [threadQuery, draft, entries]);

  const worldResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return WORLD.filter(
      (o) => !letIn.has(o.id) && o.title.toLowerCase().includes(q),
    ).slice(0, 5);
  }, [query, letIn]);

  // ── the drawing ─────────────────────────────────────────────────────────
  const axisInk = useMemo(() => {
    const r = rand(seedOf("chronology-axis"));
    const d = stroke([X0 - 6, layout.axisY], [X1 + 6, layout.axisY], r, 1.2, 4);
    return { line: d, ink: ribbon(d, 2.6, seedOf("chronology-axis-ink")) };
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
      key: string;
      title: string;
      x: number;
      w: number;
      y: number;
      kind: "structure" | "conjuncture";
      slug: string | null;
      offered: Offered | null;
    }[] = [];
    if (!layers.world) return out;
    const band = (
      title: string,
      s: number,
      e: number,
      y: number,
      kind: "structure" | "conjuncture",
      slug: string | null,
      o: Offered | null,
      key: string,
    ) => {
      const xs = x(s);
      const xe = x(e);
      if (xe < X0 || xs > X1) return;
      out.push({
        key,
        title,
        x: clamp(xs, X0, X1),
        w: clamp(xe, X0, X1) - clamp(xs, X0, X1),
        y,
        kind,
        slug,
        offered: o,
      });
    };
    layout.structure.forEach((e, i) =>
      band(
        e.title,
        startOf(e),
        endOf(e, nowMs),
        layout.yStruct + layout.sRows[i] * ROW_H,
        "structure",
        e.slug,
        null,
        `e-${e.slug}`,
      ),
    );
    layout.conjuncture.forEach((e, i) =>
      band(
        e.title,
        startOf(e),
        endOf(e, nowMs),
        layout.yConj + layout.cRows[i] * ROW_H,
        "conjuncture",
        e.slug,
        null,
        `e-${e.slug}`,
      ),
    );
    layout.offeredSpans.forEach((o, i) =>
      band(
        o.title,
        timeOf(o.day, "start"),
        o.until === "now" ? nowMs : timeOf(o.until ?? o.day, "end"),
        layout.yConj + layout.oRows[i] * ROW_H,
        "conjuncture",
        null,
        o,
        `o-${o.id}`,
      ),
    );
    return out;
  }, [layers.world, layout, x, nowMs]);

  const happenings = useMemo(() => {
    if (!layers.world) return [];
    const list: {
      key: string;
      title: string;
      x: number;
      slug: string | null;
      offered: Offered | null;
    }[] = [
      ...entries
        .filter((e) => e.lane === "happening")
        .map((e) => ({
          key: `e-${e.slug}`,
          title: e.title,
          x: x(midOf(e)),
          slug: e.slug as string | null,
          offered: null as Offered | null,
        })),
      ...offered
        .filter((o) => o.lane === "happening")
        .map((o) => ({
          key: `o-${o.id}`,
          title: o.title,
          x: x(timeOf(o.day, "mid")),
          slug: null,
          offered: o,
        })),
    ]
      .filter((h) => h.x >= X0 - 10 && h.x <= X1 + 10)
      .sort((a, b) => a.x - b.x);
    // labels alternate above and below when they would run into each other; a third is dropped
    let endAbove = -Infinity;
    let endBelow = -Infinity;
    return list.map((h) => {
      const w = short(h.title, 30).length * 5.3 + 10;
      let above = false;
      let show = true;
      if (h.x + 8 >= endBelow) {
        endBelow = h.x + 8 + w;
      } else if (h.x + 8 >= endAbove) {
        above = true;
        endAbove = h.x + 8 + w;
      } else show = false;
      return { ...h, above, show };
    });
  }, [layers.world, entries, offered, x]);

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
          world: isLayer(e.lane),
        })),
    [entries, xm],
  );

  /** The plumb lines: where the chosen or hovered entry sits, dropped through every lane. */
  const plumbs = useMemo(() => {
    const out: {
      key: string;
      x0: number;
      x1: number | null;
      strong: boolean;
    }[] = [];
    const add = (e: Entry, strong: boolean, key: string) => {
      const xs = x(startOf(e));
      const xe = isSpan(e) ? x(endOf(e, nowMs)) : null;
      if ((xe ?? xs) < X0 - 4 || xs > X1 + 4) return;
      out.push({
        key,
        x0: clamp(xs, X0, X1),
        x1: xe === null ? null : clamp(xe, X0, X1),
        strong,
      });
    };
    if (chosen) add(chosen, true, "chosen");
    if (peeked) add(peeked, true, "peeked");
    if (
      hoverEntry &&
      hoverEntry.slug !== chosen?.slug &&
      hoverEntry.slug !== peeked?.slug
    )
      add(hoverEntry, false, "hover");
    if (hoverOffered) {
      const xs = x(timeOf(hoverOffered.day, "start"));
      const xe = hoverOffered.until
        ? x(
            hoverOffered.until === "now"
              ? nowMs
              : timeOf(hoverOffered.until, "end"),
          )
        : null;
      out.push({
        key: "offered",
        x0: clamp(xs, X0, X1),
        x1: xe === null ? null : clamp(xe, X0, X1),
        strong: false,
      });
    }
    return out;
  }, [chosen, peeked, hoverEntry, hoverOffered, x, nowMs]);

  /** The threads the reader drew, as arcs between marks in view — a lane's mark, a happening, or a band. */
  const arcs = useMemo(() => {
    if (!layers.threads) return [];
    const anchor = new Map<string, { x: number; y: number }>();
    for (const m of marks)
      if (!m.other)
        anchor.set(m.e.slug, {
          x: m.span ? (m.x + Math.min(m.x1, X1)) / 2 : m.x,
          y: m.y - (m.span ? 6 : m.r + 1),
        });
    for (const h of happenings)
      if (h.slug) anchor.set(h.slug, { x: h.x, y: layout.yHapp - 5 });
    for (const b of worldBands)
      if (b.slug) anchor.set(b.slug, { x: b.x + b.w / 2, y: b.y });
    const out: {
      key: string;
      d: string;
      from: string;
      to: string;
      as: ThreadAs;
      mx: number;
      my: number;
      on: boolean;
      tip: [number, number, number] | null;
    }[] = [];
    for (const e of entries) {
      for (const th of e.threads) {
        const a = anchor.get(e.slug);
        const b = anchor.get(th.to);
        if (!a || !b) continue;
        const dist = Math.abs(b.x - a.x);
        const lift = Math.min(70, 22 + dist * 0.12);
        const cy = Math.min(a.y, b.y) - lift;
        const cx = (a.x + b.x) / 2;
        const d = `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
        const on =
          selected === e.slug ||
          selected === th.to ||
          (hover?.kind === "entry" && (hover.slug === e.slug || hover.slug === th.to));
        // the tangent at the target end, for an arrowhead on "led to"
        const tx = b.x - cx;
        const ty = b.y - cy;
        const len = Math.hypot(tx, ty) || 1;
        out.push({
          key: `${e.slug}->${th.to}`,
          d,
          from: e.slug,
          to: th.to,
          as: th.as,
          mx: (a.x + 2 * cx + b.x) / 4,
          my: (a.y + 2 * cy + b.y) / 4,
          on,
          tip: th.as === "led to" ? [b.x, b.y, Math.atan2(ty / len, tx / len)] : null,
        });
      }
    }
    return out;
  }, [layers.threads, marks, happenings, worldBands, layout.yHapp, entries, selected, hover]);

  const scaleNote = !life.born
    ? "set the day you were born to read ages, and to draw the proportional scale."
    : null;

  const hoverOn =
    (kind: "entry" | "other", slug: string) => (ev: ReactPointerEvent) => {
      if (drag.current) return;
      const { sx, sy } = toSheet(ev);
      setHover({ kind, slug, x: sx, y: sy });
    };

  const hoverCard = () => {
    if (!hover) return null;
    const left = `${(hover.x / W) * 100}%`;
    const top = `${(hover.y / H) * 100}%`;
    const flip = hover.x > W * 0.64;
    const style = {
      left,
      top,
      transform: flip
        ? "translate(calc(-100% - 12px), -8px)"
        : "translate(12px, -8px)",
      maxWidth: "20rem",
    };
    const card = (children: React.ReactNode) => (
      <div
        className="card fade pointer-events-none absolute z-[5] px-3 py-2"
        style={style}
      >
        {children}
      </div>
    );
    if (hover.kind === "present")
      return card(
        <>
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
        </>,
      );
    if (hover.kind === "offered" && hoverOffered) {
      const o = hoverOffered;
      const ms = timeOf(o.day, "mid");
      const age = ageOf(ms);
      return card(
        <>
          <div className="meta" style={{ color: "var(--faint)" }}>
            the world, offered ·{" "}
            {o.until ? spanWords(o.day, o.until) : formatDay(o.day)}
            {age !== null && age >= 0 ? ` · you were ${age}` : ""}
          </div>
          <div
            className="hand mt-0.5 text-[15.5px] leading-[1.2]"
            style={{ color: "var(--ink)" }}
          >
            {o.title}
          </div>
          {o.note && (
            <p
              className="mt-1 text-[12px] leading-[1.45]"
              style={{ color: "var(--muted)" }}
            >
              {o.note}
            </p>
          )}
          {chosen && (
            <div
              className="hand mt-0.5 text-[13.5px]"
              style={{ color: "var(--accent)" }}
            >
              {relate(
                {
                  ...emptyEntry(o.day, o.lane, today),
                  until: o.until ?? null,
                  title: o.title,
                },
                chosen,
                nowMs,
              )}
            </div>
          )}
          <div
            className="hand mt-1 text-[12.5px]"
            style={{ color: "var(--muted)" }}
          >
            {writable
              ? "click to let it in — it becomes your entry, to keep or retitle"
              : "offered; nothing is imposed"}
          </div>
        </>,
      );
    }
    if (hover.kind === "moment") {
      const list = byDay.get(hover.day) ?? [];
      const said = list.filter((m) => m.how === "said");
      const shown = (said.length ? said : list).slice(0, 5);
      return card(
        <>
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
        </>,
      );
    }
    const e = hoverEntry;
    if (!e) return null;
    const theirs = hover.kind === "other";
    const ms = midOf(e);
    const lifeOf = theirs && other ? other.life : life;
    const ageRaw = ageAt(lifeOf.born, ms);
    const age = ageRaw === null ? null : Math.floor(ageRaw);
    const late = validDay(e.recorded)
      ? (timeOf(e.recorded, "mid") - ms) / YEAR_MS
      : 0;
    const laneName =
      theirs && other
        ? (other.life.domains.find((d) => d.id === e.lane)?.label ?? e.lane)
        : laneLabel(e.lane);
    return card(
      <>
        <div
          className="meta"
          style={{ color: theirs ? "var(--muted)" : laneColor(e.lane) }}
        >
          {theirs ? `${other?.name} · ${laneName}` : laneName}
          <span style={{ color: "var(--faint)" }}>
            {" · "}
            {spanWords(e.day, e.until)}
            {age !== null && !isLayer(e.lane)
              ? ` · ${theirs ? "they were" : "age"} ${age}`
              : ""}
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
            {theirs ? " (yours)" : ""}
          </div>
        )}
        {e.note && (
          <p
            className="mt-1 text-[12px] leading-[1.45]"
            style={{ color: "var(--muted)" }}
          >
            {short(e.note, 180)}
          </p>
        )}
        {(e.again || late > 1 || e.threads.length > 0) && (
          <div
            className="meta mt-1"
            style={{ color: "var(--faint)", textTransform: "none" }}
          >
            {[
              e.again ? `again: ${e.again}` : "",
              late > 1 ? `written down ${yearsWords(late)} after` : "",
              e.threads.length
                ? `${e.threads.length} ${e.threads.length === 1 ? "thread" : "threads"}`
                : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        )}
      </>,
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

  const Row = ({ e, words: w }: { e: Entry; words?: string }) => (
    <button
      onClick={() => {
        setSelected(e.slug);
        const s = startOf(e);
        if (s < window_[0] || s > window_[1]) centreOn(e);
      }}
      onPointerEnter={() => {
        const m = marks.find((mk) => !mk.other && mk.e.slug === e.slug);
        if (m) setHover({ kind: "entry", slug: e.slug, x: m.x, y: m.y });
      }}
      onPointerLeave={() => setHover(null)}
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
        {w && (
          <span className="hand text-[13px]" style={{ color: "var(--accent)" }}>
            {" — "}
            {w}
          </span>
        )}
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
  const worldLetIn = entries.filter((e) =>
    e.tags.some((tg) => tg.startsWith("world:")),
  ).length;

  const metaText = (props: {
    x: number;
    y: number;
    anchor?: "start" | "middle" | "end";
    children: React.ReactNode;
    color?: string;
    size?: number;
  }) => (
    <text
      x={props.x}
      y={props.y}
      textAnchor={props.anchor ?? "start"}
      fontSize={props.size ?? 8.5}
      fill={props.color ?? "var(--faint)"}
      style={MONO}
    >
      {props.children}
    </text>
  );

  return (
    <main className="chronology scroll-thin relative h-dvh w-full overflow-y-auto">
      <div className="mx-auto max-w-[88rem] px-5 pb-16 sm:px-10">
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
                className="hand mt-1 max-w-[31rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                A life as a number line. Set down what happened — the inner life
                above the line, the world below it — under the conditions you
                lived in, with the world&rsquo;s own happenings offered for you
                to let in. Drag the present back and read the record as it
                stood.
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

            {/* the readout, the window, the zoom */}
            <div className="relative z-[2] flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="meta" style={{ color: "var(--muted)" }}>
                  {t.n === 0
                    ? "nothing set down"
                    : `${t.n} set down · ${t.inner} inner · ${t.outer} in the world${t.world ? ` · ${t.world} of the world's` : ""}${t.gaps ? ` · ${t.gaps} ${t.gaps === 1 ? "gap" : "gaps"}` : ""}`}
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
                {other && (
                  <span className="meta" style={{ color: "var(--muted)" }}>
                    · alongside {other.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => zoomBy(1 / 0.6)}
                  className="chip k-seg px-2 py-1 text-[12px] leading-none"
                  style={{ color: "var(--muted)" }}
                  aria-label="Zoom out"
                  title="zoom out  −"
                >
                  −
                </button>
                <button
                  onClick={() => zoomBy(0.6)}
                  className="chip k-seg px-2 py-1 text-[12px] leading-none"
                  style={{ color: "var(--muted)" }}
                  aria-label="Zoom in"
                  title="zoom in  ="
                >
                  +
                </button>
                {win && (
                  <Chip onClick={wholeLife} on>
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
                data-panning={panning ? "" : undefined}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={() => {
                  drag.current = null;
                  setPanning(false);
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

                {/* the reminiscence bump */}
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
                    {bump.x1 - bump.x0 > 130 &&
                      metaText({
                        x: bump.x1 - 6,
                        y: layout.yLanesTop - 13,
                        anchor: "end",
                        color: "var(--accent)",
                        children:
                          "reminiscence bump · 10–30 · density expected here",
                      })}
                  </g>
                )}

                {/* the record's silences, named */}
                {gaps.map((g) => (
                  <g
                    key={g.e.slug}
                    data-slug={g.e.slug}
                    className="k-mark"
                    style={{ cursor: "pointer" }}
                    onPointerMove={hoverOn("entry", g.e.slug)}
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
                    {g.x1 - g.x > 70 &&
                      metaText({
                        x: (g.x + g.x1) / 2,
                        y: layout.yLanesTop - 13,
                        anchor: "middle",
                        color: "var(--muted)",
                        children: `gap · ${spanWords(g.e.day, g.e.until)} · ${WHY_LABEL[g.e.why ?? "no-record"]}`,
                      })}
                  </g>
                ))}

                {/* the future, shaded past the present */}
                {presentX < X1 + 8 && (
                  <rect
                    x={clamp(presentX, X0 - 6, X1 + 8)}
                    y={plumbTop}
                    width={Math.max(
                      0,
                      X1 + 8 - clamp(presentX, X0 - 6, X1 + 8),
                    )}
                    height={layout.otherBottom + 8 - plumbTop}
                    fill={pen}
                    fillOpacity={0.045}
                    aria-hidden
                  />
                )}

                {/* plumb lines: what the chosen sits beside, through every lane */}
                {plumbs.map((p) => (
                  <g
                    key={p.key}
                    className="k-plumb"
                    aria-hidden
                    style={{ opacity: p.strong ? 1 : 0.6 }}
                  >
                    {p.x1 !== null && p.x1 - p.x0 > 1 && (
                      <rect
                        x={p.x0}
                        y={plumbTop}
                        width={p.x1 - p.x0}
                        height={layout.otherBottom + 8 - plumbTop}
                        fill="var(--accent)"
                        fillOpacity={p.strong ? 0.06 : 0.035}
                      />
                    )}
                    <line
                      x1={p.x0}
                      x2={p.x0}
                      y1={plumbTop}
                      y2={layout.otherBottom + 8}
                      stroke="var(--accent)"
                      strokeWidth={p.strong ? 1 : 0.8}
                      strokeDasharray="4 3"
                      strokeOpacity={p.strong ? 0.75 : 0.5}
                    />
                    {p.x1 !== null && (
                      <line
                        x1={p.x1}
                        x2={p.x1}
                        y1={plumbTop}
                        y2={layout.otherBottom + 8}
                        stroke="var(--accent)"
                        strokeWidth={p.strong ? 1 : 0.8}
                        strokeDasharray="4 3"
                        strokeOpacity={p.strong ? 0.75 : 0.5}
                      />
                    )}
                  </g>
                ))}

                {/* the circumstances */}
                {layers.world && (
                  <g>
                    {metaText({
                      x: X0 - 10,
                      y: layout.yStruct + 10,
                      anchor: "end",
                      children: "structure",
                    })}
                    {metaText({
                      x: X0 - 10,
                      y: layout.yConj + 10,
                      anchor: "end",
                      children: "conjuncture",
                    })}
                    {metaText({
                      x: X0 - 10,
                      y: layout.yHapp + 3,
                      anchor: "end",
                      children: "happenings",
                    })}
                    <line
                      x1={X0}
                      x2={X1}
                      y1={layout.yHapp}
                      y2={layout.yHapp}
                      stroke="var(--rule)"
                      strokeWidth={0.8}
                    />
                    {worldBands.map((b) => {
                      const on = b.slug !== null && selected === b.slug;
                      const chars = Math.floor((b.w - 8) / 5.3);
                      const ghost = b.offered !== null;
                      return (
                        <g
                          key={b.key}
                          {...(b.slug
                            ? { "data-slug": b.slug }
                            : { "data-offered": b.offered!.id, "data-still": "" })}
                          className="k-mark"
                          style={{
                            cursor: ghost
                              ? writable
                                ? "copy"
                                : "default"
                              : writable
                                ? "grab"
                                : "pointer",
                          }}
                          onPointerMove={(ev) => {
                            if (drag.current) return;
                            const { sx, sy } = toSheet(ev);
                            setHover(
                              b.slug
                                ? { kind: "entry", slug: b.slug, x: sx, y: sy }
                                : {
                                    kind: "offered",
                                    id: b.offered!.id,
                                    x: sx,
                                    y: sy,
                                  },
                            );
                          }}
                          onPointerLeave={() => setHover(null)}
                          onClick={() => ghost && admit(b.offered!)}
                        >
                          <rect
                            x={b.x}
                            y={b.y}
                            width={Math.max(3, b.w)}
                            height={ROW_H - 2}
                            fill={
                              b.kind === "structure" ? pen : "var(--value-1)"
                            }
                            fillOpacity={
                              ghost
                                ? 0.035
                                : b.kind === "structure"
                                  ? 0.07
                                  : 0.13
                            }
                          />
                          <path
                            d={roughRect(
                              Math.max(3, b.w),
                              ROW_H - 2,
                              seedOf(b.key),
                              { wobble: 0.7, overshoot: 1.5 },
                            )}
                            transform={`translate(${b.x} ${b.y})`}
                            fill="none"
                            stroke={on ? "var(--accent)" : pen}
                            strokeOpacity={on ? 0.95 : ghost ? 0.22 : 0.35}
                            strokeWidth={on ? 1.1 : 0.7}
                            strokeDasharray={ghost ? "2.5 2.5" : undefined}
                          />
                          {chars >= 4 && (
                            <text
                              x={b.x + 5}
                              y={b.y + 9}
                              fontSize={8.5}
                              fill={
                                on
                                  ? "var(--ink)"
                                  : ghost
                                    ? "var(--faint)"
                                    : "var(--muted)"
                              }
                              style={{
                                fontFamily: "var(--font-mono)",
                                letterSpacing: "0.06em",
                              }}
                            >
                              {short(b.title, chars)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                    {happenings.map((h) => {
                      const on = h.slug !== null && selected === h.slug;
                      const ghost = h.offered !== null;
                      return (
                        <g
                          key={h.key}
                          {...(h.slug
                            ? { "data-slug": h.slug }
                            : { "data-offered": h.offered!.id, "data-still": "" })}
                          className="k-mark"
                          style={{
                            cursor: ghost
                              ? writable
                                ? "copy"
                                : "default"
                              : writable
                                ? "grab"
                                : "pointer",
                          }}
                          onPointerMove={(ev) => {
                            if (drag.current) return;
                            const { sx, sy } = toSheet(ev);
                            setHover(
                              h.slug
                                ? { kind: "entry", slug: h.slug, x: sx, y: sy }
                                : {
                                    kind: "offered",
                                    id: h.offered!.id,
                                    x: sx,
                                    y: sy,
                                  },
                            );
                          }}
                          onPointerLeave={() => setHover(null)}
                          onClick={() => ghost && admit(h.offered!)}
                        >
                          <rect
                            x={h.x - 3.8}
                            y={layout.yHapp - 3.8}
                            width={7.6}
                            height={7.6}
                            transform={`rotate(45 ${h.x} ${layout.yHapp})`}
                            fill={
                              ghost
                                ? "var(--surface)"
                                : on
                                  ? "var(--accent)"
                                  : pen
                            }
                            fillOpacity={ghost ? 0.9 : on ? 1 : 0.75}
                            stroke={ghost ? "var(--muted)" : "none"}
                            strokeWidth={0.9}
                            strokeDasharray={ghost ? "1.6 1.4" : undefined}
                          />
                          <rect
                            x={h.x - 9}
                            y={layout.yHapp - 10}
                            width={18}
                            height={20}
                            fill="transparent"
                          />
                          {h.show && (
                            <text
                              x={h.x + 8}
                              y={layout.yHapp + (h.above ? -7 : 4)}
                              fontSize={8.5}
                              fill={
                                ghost
                                  ? "var(--faint)"
                                  : on
                                    ? "var(--ink)"
                                    : "var(--muted)"
                              }
                              style={{
                                fontFamily: "var(--font-mono)",
                                letterSpacing: "0.06em",
                              }}
                            >
                              {short(h.title, 30)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* the lanes */}
                {layout.inner.length > 0 &&
                  metaText({
                    x: X0 - 10,
                    y: layout.yLanesTop - 4,
                    anchor: "end",
                    children: "inner",
                  })}
                {layout.outer.length > 0 &&
                  metaText({
                    x: X0 - 10,
                    y: layout.outerTop - 4,
                    anchor: "end",
                    children: "in the world",
                  })}
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
                        y={y + 4.5}
                        textAnchor="end"
                        fontSize={13.5}
                        fill={laneColor(dm.id)}
                        style={HAND}
                      >
                        {short(dm.label, 14).toLowerCase()}
                      </text>
                    </g>
                  );
                })}

                {/* another life, alongside */}
                {other &&
                  layout.yOther !== null &&
                  layout.otherAxis !== null && (
                    <g>
                      {metaText({
                        x: X0 - 10,
                        y: layout.yOther - 2,
                        anchor: "end",
                        children: `alongside · ${short(other.name, 14)}`,
                      })}
                      <line
                        x1={X0}
                        x2={X1}
                        y1={layout.otherAxis}
                        y2={layout.otherAxis}
                        stroke="var(--muted)"
                        strokeOpacity={0.5}
                        strokeWidth={0.9}
                      />
                      <text
                        x={X0 - 10}
                        y={layout.otherAxis - LANE_H / 2 + 4}
                        textAnchor="end"
                        fontSize={12}
                        fill="var(--faint)"
                        style={HAND}
                      >
                        their inner
                      </text>
                      <text
                        x={X0 - 10}
                        y={layout.otherAxis + LANE_H / 2 + 4}
                        textAnchor="end"
                        fontSize={12}
                        fill="var(--faint)"
                        style={HAND}
                      >
                        their world
                      </text>
                      {other.life.born &&
                        validDay(other.life.born) &&
                        x(timeOf(other.life.born, "mid")) >= X0 &&
                        x(timeOf(other.life.born, "mid")) <= X1 && (
                          <g aria-hidden>
                            <line
                              x1={x(timeOf(other.life.born, "mid"))}
                              x2={x(timeOf(other.life.born, "mid"))}
                              y1={layout.otherAxis - 7}
                              y2={layout.otherAxis + 7}
                              stroke="var(--muted)"
                              strokeWidth={1.2}
                            />
                            <text
                              x={x(timeOf(other.life.born, "mid"))}
                              y={layout.otherAxis - 10}
                              textAnchor="middle"
                              fontSize={10}
                              fill="var(--faint)"
                              style={HAND}
                            >
                              born
                            </text>
                          </g>
                        )}
                    </g>
                  )}

                {/* the garden's dated moments */}
                {layers.garden && (
                  <g>
                    {metaText({
                      x: X0 - 10,
                      y: layout.yStrip + STRIP_H - 2,
                      anchor: "end",
                      children: "the garden",
                    })}
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
                          data-still
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

                {/* the threads the reader drew */}
                {arcs.map((a) => (
                  <g
                    key={a.key}
                    className="k-thread"
                    aria-hidden
                    style={{ opacity: a.on ? 1 : 0.35 }}
                  >
                    <path
                      d={a.d}
                      fill="none"
                      stroke={a.on ? "var(--accent)" : "var(--muted)"}
                      strokeWidth={a.on ? 1.3 : 0.9}
                      strokeDasharray={
                        a.as === "echoed"
                          ? "4 3"
                          : a.as === "alongside"
                            ? "1.5 3"
                            : undefined
                      }
                    />
                    {a.tip && (
                      <path
                        d={`M${(a.tip[0] - 6 * Math.cos(a.tip[2] - 0.45)).toFixed(1)} ${(a.tip[1] - 6 * Math.sin(a.tip[2] - 0.45)).toFixed(1)}L${a.tip[0].toFixed(1)} ${a.tip[1].toFixed(1)}L${(a.tip[0] - 6 * Math.cos(a.tip[2] + 0.45)).toFixed(1)} ${(a.tip[1] - 6 * Math.sin(a.tip[2] + 0.45)).toFixed(1)}`}
                        fill="none"
                        stroke={a.on ? "var(--accent)" : "var(--muted)"}
                        strokeWidth={a.on ? 1.3 : 0.9}
                      />
                    )}
                    {a.as === "cut against" && (
                      <line
                        x1={a.mx - 4}
                        x2={a.mx + 4}
                        y1={a.my + 4}
                        y2={a.my - 4}
                        stroke={a.on ? "var(--accent)" : "var(--muted)"}
                        strokeWidth={1.2}
                      />
                    )}
                    {a.on && (
                      <text
                        x={a.mx}
                        y={a.my - 5}
                        textAnchor="middle"
                        fontSize={11}
                        fill="var(--accent)"
                        stroke="var(--surface)"
                        strokeWidth={3}
                        paintOrder="stroke"
                        style={HAND}
                      >
                        {a.as}
                      </text>
                    )}
                  </g>
                ))}

                {/* the marks: stretches, then days */}
                {marks
                  .filter((m) => m.span)
                  .map((m, i) => {
                    const on = m.other
                      ? peek === m.e.slug
                      : selected === m.e.slug;
                    const lensed =
                      !m.other && lens !== null && m.e.stones.includes(lens);
                    const w = Math.max(3, m.x1 - m.x);
                    return (
                      <g
                        key={`${m.other ? "o" : "e"}-${m.e.slug}`}
                        {...(m.other
                          ? { "data-other": m.e.slug, "data-still": "" }
                          : { "data-slug": m.e.slug })}
                        className={`k-mark ${settled ? "" : "k-arrive"}`}
                        style={{
                          ["--i" as string]: i,
                          cursor: m.other
                            ? "pointer"
                            : writable
                              ? "grab"
                              : "pointer",
                          opacity: m.future ? 0.35 : 1,
                        }}
                        onPointerMove={hoverOn(
                          m.other ? "other" : "entry",
                          m.e.slug,
                        )}
                        onPointerLeave={() => setHover(null)}
                        onClick={() => m.other && setPeek(m.e.slug)}
                      >
                        <rect
                          x={m.x}
                          y={m.y - 5}
                          width={w}
                          height={10}
                          fill={m.color}
                          fillOpacity={m.expected || m.other ? 0 : 0.28}
                        />
                        <path
                          d={roughRect(w, 10, seedOf(m.e.slug), {
                            wobble: 0.8,
                            overshoot: 2,
                          })}
                          transform={`translate(${m.x} ${m.y - 5})`}
                          fill="none"
                          stroke={on || lensed ? "var(--accent)" : m.color}
                          strokeWidth={on ? 1.7 : 1.1}
                          strokeDasharray={
                            m.expected || m.other ? "3 2.5" : undefined
                          }
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
                          y={m.y - 11}
                          width={w + 8}
                          height={22}
                          fill="transparent"
                        />
                      </g>
                    );
                  })}
                {marks
                  .filter((m) => !m.span)
                  .map((m, i) => {
                    const on = m.other
                      ? peek === m.e.slug
                      : selected === m.e.slug;
                    const lensed =
                      !m.other && lens !== null && m.e.stones.includes(lens);
                    const prec = precisionOf(m.e.day);
                    const wx0 = x(timeOf(m.e.day, "start"));
                    const wx1 = x(timeOf(m.e.day, "end"));
                    return (
                      <g
                        key={`${m.other ? "o" : "e"}-${m.e.slug}`}
                        {...(m.other
                          ? { "data-other": m.e.slug, "data-still": "" }
                          : { "data-slug": m.e.slug })}
                        className={`k-mark ${settled ? "" : "k-arrive"}`}
                        style={{
                          ["--i" as string]: i + 4,
                          cursor: m.other
                            ? "pointer"
                            : writable
                              ? "grab"
                              : "pointer",
                          opacity: m.future ? 0.35 : 1,
                        }}
                        onPointerMove={hoverOn(
                          m.other ? "other" : "entry",
                          m.e.slug,
                        )}
                        onPointerLeave={() => setHover(null)}
                        onClick={() => m.other && setPeek(m.e.slug)}
                      >
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
                          fill={
                            m.expected || m.other ? "var(--surface)" : m.color
                          }
                          fillOpacity={m.expected || m.other ? 0.9 : 0.85}
                          stroke={
                            on || lensed
                              ? "var(--accent)"
                              : m.expected || m.other
                                ? m.color
                                : pen
                          }
                          strokeOpacity={on || lensed ? 1 : m.other ? 0.8 : 0.5}
                          strokeWidth={on ? 1.7 : 0.95}
                          strokeDasharray={
                            m.expected ? "2.5 2" : m.other ? "2 1.6" : undefined
                          }
                        />
                        {on && (
                          <path
                            d={roughEllipse(
                              m.r * 2 + 11,
                              m.r * 2 + 11,
                              seedOf(`${m.e.slug}-ring`),
                              { pad: 0, steps: 14, wobble: 1.2 },
                            )}
                            transform={`translate(${m.x - m.r - 5.5} ${m.y - m.r - 5.5})`}
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
                  const slug = l.key.slice(2);
                  const isOther = l.key.startsWith("o-");
                  const on = isOther
                    ? peek === slug ||
                      (hover?.kind === "other" && hover.slug === slug)
                    : selected === slug ||
                      (hover?.kind === "entry" && hover.slug === slug);
                  return (
                    <text
                      key={l.key}
                      x={l.x}
                      y={l.y}
                      textAnchor={l.anchor}
                      fontSize={on ? 13.5 : 12.5}
                      fill={
                        on
                          ? "var(--ink)"
                          : l.faint
                            ? "var(--faint)"
                            : "var(--muted)"
                      }
                      stroke="var(--surface)"
                      strokeWidth={on ? 3.5 : 3}
                      strokeOpacity={0.85}
                      paintOrder="stroke"
                      style={HAND}
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
                          y1={layout.axisY - (tk.major ? 7 : 3.5)}
                          y2={layout.axisY + (tk.major ? 7 : 3.5)}
                          stroke={pen}
                          strokeWidth={tk.major ? 1 : 0.7}
                          strokeOpacity={tk.major ? 0.8 : 0.5}
                        />
                        {tk.label && (
                          <text
                            x={tx}
                            y={layout.axisY + 19}
                            textAnchor="middle"
                            fontSize={9.5}
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
                            y={layout.axisY + 30}
                            textAnchor="middle"
                            fontSize={11}
                            fill="var(--faint)"
                            style={HAND}
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
                      y={layout.axisY + 30}
                      textAnchor="end"
                      fontSize={11}
                      fill="var(--faint)"
                      style={HAND}
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
                          y1={layout.axisY - 11}
                          y2={layout.axisY + 11}
                          stroke={pen}
                          strokeWidth={1.4}
                        />
                        <text
                          x={x(timeOf(life.born, "mid"))}
                          y={layout.axisY - 14}
                          textAnchor="middle"
                          fontSize={11}
                          fill="var(--muted)"
                          style={HAND}
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
                      y={plumbTop - 18}
                      width={24}
                      height={layout.otherBottom + 14 - (plumbTop - 18)}
                      fill="transparent"
                    />
                    <path
                      d={ribbon(
                        stroke(
                          [presentX, plumbTop - 6],
                          [presentX, layout.otherBottom + 10],
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
                      y={plumbTop - 10}
                      textAnchor="middle"
                      fontSize={12}
                      fill="var(--accent)"
                      style={HAND}
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
                    y={layout.axisY - 44}
                    textAnchor="middle"
                    fontSize={15}
                    fill="var(--faint)"
                    style={HAND}
                  >
                    {writable
                      ? "double-click the line where something happened · click a faint happening above to let it in"
                      : "nothing is set down here"}
                  </text>
                )}

                {/* the whole life, small, with the window bracketed; drag it, or its ends */}
                <g data-mini style={{ cursor: "grab" }}>
                  <rect
                    x={X0 - 4}
                    y={layout.yMini - 6}
                    width={X1 - X0 + 8}
                    height={MINI_H + 12}
                    fill="transparent"
                  />
                  {metaText({
                    x: X0 - 10,
                    y: layout.yMini + MINI_H / 2 + 3,
                    anchor: "end",
                    children: "the whole",
                  })}
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
                      Math.max(8, xm(window_[1]) - xm(window_[0])),
                      MINI_H + 4,
                      seedOf("k-window"),
                      { wobble: 0.8, overshoot: 2 },
                    )}
                    transform={`translate(${xm(window_[0])} ${layout.yMini - 2})`}
                    fill="var(--accent)"
                    fillOpacity={0.07}
                    stroke="var(--accent)"
                    strokeWidth={1.1}
                  />
                  {/* the handles */}
                  {(["left", "right"] as const).map((edge) => {
                    const hx =
                      edge === "left" ? xm(window_[0]) : xm(window_[1]);
                    return (
                      <g
                        key={edge}
                        data-edge={edge}
                        style={{ cursor: "ew-resize" }}
                      >
                        <rect
                          x={hx - 7}
                          y={layout.yMini - 6}
                          width={14}
                          height={MINI_H + 12}
                          fill="transparent"
                        />
                        <rect
                          x={hx - 2.5}
                          y={layout.yMini + MINI_H / 2 - 7}
                          width={5}
                          height={14}
                          rx={1.5}
                          fill="var(--surface)"
                          stroke="var(--accent)"
                          strokeWidth={1}
                        />
                        <line
                          x1={hx}
                          x2={hx}
                          y1={layout.yMini + MINI_H / 2 - 4}
                          y2={layout.yMini + MINI_H / 2 + 4}
                          stroke="var(--accent)"
                          strokeWidth={0.8}
                        />
                      </g>
                    );
                  })}
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
                · hollow, dashed: expected · faint above the line: the world,
                offered
              </span>
              <span className="meta" style={{ color: "var(--faint)" }}>
                · hatched: the record does not speak
              </span>
              <span className="meta" style={{ color: "var(--faint)" }}>
                · ⌘ wheel or pinch zooms · drag pans · drag the bracket or its
                ends below · double-click sets down
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
                find on the line, or in the world
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
              {(results.length > 0 || worldResults.length > 0) && (
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
                  {worldResults.map((o) => (
                    <li key={o.id}>
                      <button
                        onClick={() => {
                          admit(o);
                          setQuery("");
                        }}
                        className="k-row flex w-full items-baseline gap-2 rounded px-1.5 py-0.5 text-left"
                      >
                        <span
                          className="meta shrink-0"
                          style={{ color: "var(--faint)" }}
                        >
                          the world
                        </span>
                        <span
                          className="hand min-w-0 flex-1 truncate text-[14px]"
                          style={{ color: "var(--ink)" }}
                        >
                          {o.title}
                        </span>
                        <span
                          className="meta shrink-0"
                          style={{
                            color: "var(--faint)",
                            textTransform: "none",
                          }}
                        >
                          {o.until
                            ? spanWords(o.day, o.until)
                            : formatDay(o.day)}{" "}
                          · let in
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* their entry, peeked */}
            {peeked && other && !d && (
              <section
                className="panel sketched relative p-4"
                style={{ borderRadius: 3 }}
                aria-label="Their entry"
              >
                <Sketch seed={`peek-${peeked.slug}`} draw />
                <div className="flex items-baseline justify-between gap-2">
                  <div className="meta" style={{ color: "var(--muted)" }}>
                    {other.name} ·{" "}
                    {other.life.domains.find((dm) => dm.id === peeked.lane)
                      ?.label ?? peeked.lane}
                    <span style={{ color: "var(--faint)" }}>
                      {" · "}
                      {spanWords(peeked.day, peeked.until)}
                      {ageAt(other.life.born, midOf(peeked)) !== null
                        ? ` · they were ${Math.floor(ageAt(other.life.born, midOf(peeked))!)}`
                        : ""}
                    </span>
                  </div>
                  <button
                    onClick={() => setPeek(null)}
                    className="meta"
                    style={{ color: "var(--faint)" }}
                    aria-label="Close"
                  >
                    esc
                  </button>
                </div>
                <h2
                  className="hand mt-1 text-[21px] leading-[1.15]"
                  style={{ color: "var(--ink)" }}
                >
                  {peeked.title}
                </h2>
                {peeked.note && (
                  <p
                    className="mt-2 text-[13px] leading-[1.5]"
                    style={{ color: "var(--ink)" }}
                  >
                    {peeked.note}
                  </p>
                )}
                {peeked.again && (
                  <p
                    className="meta mt-2"
                    style={{ color: "var(--faint)", textTransform: "none" }}
                  >
                    would they have it again: {peeked.again}
                  </p>
                )}
                <p
                  className="hand mt-2 text-[13px]"
                  style={{ color: "var(--faint)" }}
                >
                  read-only — their file, in their words. choose one of yours to
                  see how they sit against each other.
                </p>
              </section>
            )}

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

                {/* threads: the reader's own, with a plain verb */}
                {d.lane !== "gap" && !draft?.fresh && (
                  <>
                    <div
                      className="meta mt-3"
                      style={{ color: "var(--faint)" }}
                    >
                      threads it drew
                    </div>
                    {d.threads.length > 0 && (
                      <ul className="mt-1 flex flex-col gap-0.5">
                        {d.threads.map((th) => {
                          const to = bySlug.get(th.to);
                          return (
                            <li
                              key={th.to}
                              className="flex items-baseline gap-2"
                            >
                              <span
                                className="hand text-[13px]"
                                style={{ color: "var(--accent)" }}
                              >
                                {th.as}
                              </span>
                              <button
                                onClick={() => to && setSelected(to.slug)}
                                className="hand min-w-0 flex-1 truncate text-left text-[14px]"
                                style={{
                                  color: to ? "var(--ink)" : "var(--faint)",
                                }}
                              >
                                {to ? to.title : `${th.to} (gone)`}
                              </button>
                              {writable && (
                                <button
                                  onClick={() =>
                                    setField(
                                      "threads",
                                      d.threads.filter((x) => x.to !== th.to),
                                    )
                                  }
                                  className="meta"
                                  style={{ color: "var(--faint)" }}
                                  aria-label="Remove the thread"
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
                      <div className="relative mt-1.5">
                        <div className="flex flex-wrap gap-1">
                          {THREAD_AS.map((a) => (
                            <Chip
                              key={a}
                              on={threadAs === a}
                              onClick={() => setThreadAs(a)}
                              color="var(--accent)"
                            >
                              {a}
                            </Chip>
                          ))}
                        </div>
                        <input
                          value={threadQuery}
                          onChange={(e) => setThreadQuery(e.target.value)}
                          placeholder={`this ${threadAs} … which entry?`}
                          className="search mt-1.5 w-full px-2.5 py-1.5 text-[12.5px]"
                          autoComplete="off"
                        />
                        {threadResults.length > 0 && (
                          <ul
                            className="panel sketched relative mt-1.5 p-1.5"
                            style={{ borderRadius: 3 }}
                          >
                            <Sketch seed="chronology-threads" draw />
                            {threadResults.map((e) => (
                              <li key={e.slug}>
                                <button
                                  onClick={() => {
                                    setField(
                                      "threads",
                                      [
                                        ...d.threads,
                                        { to: e.slug, as: threadAs },
                                      ].slice(0, 40),
                                    );
                                    setThreadQuery("");
                                  }}
                                  className="k-row flex w-full items-baseline gap-2 rounded px-1.5 py-0.5 text-left"
                                >
                                  <span
                                    className="hand min-w-0 flex-1 truncate text-[14px]"
                                    style={{ color: "var(--ink)" }}
                                  >
                                    {e.title}
                                  </span>
                                  <span
                                    className="meta shrink-0"
                                    style={{
                                      color: "var(--faint)",
                                      textTransform: "none",
                                    }}
                                  >
                                    {spanWords(e.day, e.until)}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
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

            {/* around it: what sat within a year, across every lane */}
            {chosen && !draft?.fresh && near.length > 0 && (
              <section aria-label="Around it">
                <div className="meta" style={{ color: "var(--faint)" }}>
                  around it · within a year · {near.length}
                </div>
                <ul className="mt-1">
                  {near.slice(0, 10).map((o) => (
                    <li key={o.e.slug}>
                      <Row e={o.e} words={o.words} />
                    </li>
                  ))}
                </ul>
                <p
                  className="hand mt-1 text-[12.5px] leading-[1.35]"
                  style={{ color: "var(--faint)" }}
                >
                  what sat beside it, said plainly. whether any of it led
                  anywhere is yours to thread.
                </p>
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
                {worldLetIn > 0 && (
                  <li
                    className="text-[13px] leading-[1.55]"
                    style={{ color: "var(--ink)" }}
                  >
                    {worldLetIn} of the world&rsquo;s happenings let in;{" "}
                    {WORLD.length - letIn.size} more offered.
                  </li>
                )}
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

            {/* the world, offered */}
            <section aria-label="The world, offered">
              <button
                onClick={() => setWorldOpen((o) => !o)}
                className="meta flex items-center gap-1.5"
                style={{ color: "var(--faint)" }}
              >
                <span
                  style={{
                    display: "inline-block",
                    transform: worldOpen ? "rotate(90deg)" : "none",
                    transition: "transform 180ms cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  ›
                </span>
                the world, offered · {WORLD.length - letIn.size} to let in
              </button>
              {worldOpen && (
                <div
                  className="panel sketched relative mt-2 p-3"
                  style={{ borderRadius: 3 }}
                >
                  <Sketch seed="chronology-world" draw />
                  <p
                    className="hand text-[13px] leading-[1.35]"
                    style={{ color: "var(--muted)" }}
                  >
                    dated public happenings and the eras they sat in. let in the
                    ones that touched you; each becomes your own entry, to
                    retitle, move or take back. nothing here says which
                    mattered.
                  </p>
                  <ul className="scroll-thin mt-2 max-h-[18rem] overflow-y-auto pr-1">
                    {WORLD.map((o) => {
                      const in_ = letIn.has(o.id);
                      return (
                        <li
                          key={o.id}
                          className="flex items-baseline gap-2 py-0.5"
                        >
                          <span
                            className="meta shrink-0"
                            style={{
                              color: "var(--faint)",
                              textTransform: "none",
                              minWidth: "6.5rem",
                            }}
                          >
                            {o.until
                              ? spanWords(o.day, o.until)
                              : formatDay(o.day)}
                          </span>
                          <span
                            className="hand min-w-0 flex-1 truncate text-[14px]"
                            style={{
                              color: in_ ? "var(--faint)" : "var(--ink)",
                            }}
                          >
                            {o.title}
                          </span>
                          {in_ ? (
                            <span
                              className="meta shrink-0"
                              style={{ color: "var(--faint)" }}
                            >
                              in
                            </span>
                          ) : (
                            <button
                              onClick={() => admit(o)}
                              disabled={!writable}
                              className="meta shrink-0 disabled:opacity-40"
                              style={{ color: "var(--accent)" }}
                            >
                              let in
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>

            {/* alongside another life */}
            {others.length > 0 && (
              <section aria-label="Alongside">
                <div className="meta" style={{ color: "var(--faint)" }}>
                  alongside · another life, read-only
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Chip
                    on={alongside === null}
                    onClick={() => setAlongside(null)}
                  >
                    no one
                  </Chip>
                  {others.map((o) => (
                    <Chip
                      key={o.name}
                      on={alongside === o.name}
                      onClick={() =>
                        setAlongside(alongside === o.name ? null : o.name)
                      }
                      color="var(--muted)"
                    >
                      {short(o.name, 22)} · {o.entries.length}
                    </Chip>
                  ))}
                </div>
                <p
                  className="hand mt-1 text-[12.5px] leading-[1.35]"
                  style={{ color: "var(--faint)" }}
                >
                  a folder of the same shape under
                  chronology/others/&lt;name&gt; — life.json and entries — lays
                  their line under yours, in their words. the specimen is the
                  first.
                </p>
              </section>
            )}

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
                    ["offered", "the world, offered"],
                    ["bump", "reminiscence bump"],
                    ["garden", "the garden"],
                    ["threads", "threads"],
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
              how it is read: double-click the line where something happened;
              drag the present back and read the line as it stood. a day is
              placed at the middle of the period it names and drawn with a
              whisker across it, so c. 2011 is honest about what it knows. the
              circumstances are yours to write, and the world&rsquo;s own
              happenings are offered faintly above the line for you to let in —
              none is imposed, none is said to have mattered. a chosen entry
              drops plumb lines through every lane so what sat beside it can be
              seen; threads between entries are yours to draw, with a plain
              verb. the garden strip ticks the days your notes speak of. another
              life laid alongside is read in their words and never changed. the
              desk counts and says what was so; it does not grade a life.
              {!specimen && payload?.dir
                ? ` files at ${shortHome(payload.dir)}.`
                : ""}
            </p>
            <p
              className="meta"
              style={{ color: "var(--faint)", textTransform: "none" }}
            >
              / find · ← → walk · n new · = − zoom · 0 whole life · t scale · g
              garden · w the world · esc
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
