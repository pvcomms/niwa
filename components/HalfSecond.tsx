"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BODY,
  CARDS,
  CLASSES,
  CLS_LABEL,
  GAUGE_KEYS,
  GAUGE_LABEL,
  GOOD,
  METER_KEYS,
  NORMS,
  NORM_LABEL,
  PRESETS,
  PRESET_LABEL,
  TECH,
  WEIGHTS_AT_REST,
  cardById,
  emptyTrace,
  fade,
  flat,
  hailed,
  hasContent,
  learn,
  nameOf,
  orderCards,
  readMeter,
  readings,
  recordReadings,
  sediment,
  settle,
  shows,
  stimulate,
  tally,
  thinks,
  titleOf,
  type Card,
  type Channel,
  type Ev,
  type Gauges,
  type Loc,
  type Trace,
} from "@/lib/half-second";
import { dayWords } from "@/lib/fence";
import { putOnDesk } from "./desk";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

type Payload = { traces: Trace[]; writable: boolean; dir: string | null };

const mono = { fontFamily: "var(--font-mono)" } as const;
const chip = "chip bt-seg px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";
const localNow = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const oh = p(Math.floor(Math.abs(off) / 60));
  const om = p(Math.abs(off) % 60);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${sign}${oh}:${om}`;
};
const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const grow = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};
const LOC: Record<Loc, [number, number, number, number]> = {
  head: [130, 42, 34, 30],
  eye: [138, 38, 20, 16],
  chest: [130, 118, 44, 40],
  gut: [130, 152, 40, 34],
  hands: [130, 166, 70, 26],
};

function Chip({
  children,
  onClick,
  accent,
  on,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  accent?: boolean;
  on?: boolean;
  disabled?: boolean;
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
        borderColor: accent ? "var(--accent)" : on ? "var(--ink)" : undefined,
      }}
    >
      {children}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="meta" style={{ color: "var(--accent)" }}>
      {children}
    </div>
  );
}

/** The gauges and the bloom, as the sheet is about to paint them. */
type Sim = {
  g: Gauges;
  target: Gauges;
  bloom: { i: number; loc: Loc; tech: Card["tech"] | null };
  taps: Record<string, number>;
  t0: number;
  down: boolean;
  downLeft: number;
  scrub: number | null;
};
const restSim = (): Sim => ({
  g: { ...BODY.base },
  target: { ...BODY.base },
  bloom: { i: 0, loc: "chest", tech: null },
  taps: {},
  t0: 0,
  down: false,
  downLeft: 90,
  scrub: null,
});

/**
 * The half-second: a synthetic feed run against a toy body, the trace of
 * what the reader did with it, and the question asked twice — what they
 * would say, in their own words, beside what the trace shows. The desk
 * counts; it never says the reader was hooked or should put it down.
 */
export default function HalfSecond() {
  const [theme, setTheme] = useTheme();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [open, setOpen] = useState<Trace | null>(null);
  const [kept, setKept] = useState(false);
  const [trouble, setTrouble] = useState<string | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const [engineered, setEngineered] = useState(false);
  const [lit, setLit] = useState<Channel[]>([]);
  const [order, setOrder] = useState<string[]>(CARDS.map((c) => c.id));
  const [pulling, setPulling] = useState(false);
  const [, setFrame] = useState(0);
  const sim = useRef<Sim>(restSim());
  const openRef = useRef<Trace | null>(null);
  const keptRef = useRef(false);
  const slugRef = useRef("");
  const dirty = useRef(false);
  const rev = useRef(0);
  const saving = useRef<Promise<void>>(Promise.resolve());
  const feedRef = useRef<HTMLDivElement | null>(null);
  const phoneRef = useRef<HTMLDivElement | null>(null);
  openRef.current = open;
  keptRef.current = kept;
  const writable = payload?.writable ?? false;
  /** The feed only runs on a trace that is not yet kept. */
  const live = !!open && !kept;

  const fresh = useCallback(() => {
    slugRef.current = "";
    dirty.current = false;
    sim.current = restSim();
    sim.current.t0 = performance.now();
    setKept(false);
    setOpen(emptyTrace(localNow()));
    setOrder(CARDS.map((c) => c.id));
    setSure(null);
    setTrouble(null);
    feedRef.current?.scrollTo({ top: 0 });
  }, []);
  const load = useCallback((t: Trace) => {
    slugRef.current = t.slug;
    dirty.current = false;
    sim.current = restSim();
    setKept(true);
    setOpen(t);
    setOrder(
      orderCards(
        CARDS.map((c) => c.id),
        t.weights,
      ),
    );
    setSure(null);
    setTrouble(null);
  }, []);

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("slug");
    fetch("/api/half-second")
      .then((r) => (r.ok ? r.json() : null))
      .then((pl: Payload | null) => {
        if (!pl) {
          setTrouble("the traces could not be read");
          return;
        }
        setPayload(pl);
        const wanted = slug ? pl.traces.find((x) => x.slug === slug) : null;
        if (wanted) load(wanted);
        else if (!pl.writable && pl.traces[0]) load(pl.traces[0]);
        else fresh();
      })
      .catch(() => setTrouble("the traces could not be read"));
  }, [fresh, load]);

  const loaded = payload !== null;
  useEffect(() => {
    if (!loaded) return;
    const url = new URL(window.location.href);
    if (kept && open?.slug) url.searchParams.set("slug", open.slug);
    else url.searchParams.delete("slug");
    window.history.replaceState(null, "", url);
    putOnDesk(
      kept && open
        ? { kind: "half-second", id: open.slug, label: titleOf(open) }
        : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, kept, open?.slug]);
  useEffect(() => () => putOnDesk(null), []);

  /* ── the body ticks ──────────────────────────────────────────────────── */

  useEffect(() => {
    const id = setInterval(() => {
      const s = sim.current;
      const dt = 1 / 12;
      const next = settle(s.g, s.target, dt, s.down);
      s.g = next.g;
      s.target = next.target;
      s.bloom.i = fade(s.bloom.i, dt);
      setFrame((f) => f + 1);
    }, 1000 / 12);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const s = sim.current;
    if (!s.down) return;
    const id = setInterval(() => {
      s.downLeft--;
      if (s.downLeft <= 0) pickUp();
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim.current.down]);

  /* ── keeping ─────────────────────────────────────────────────────────── */

  const save = useCallback(
    (t: Trace) =>
      new Promise<Trace | null>((resolve) => {
        const at = rev.current;
        saving.current = saving.current.then(async () => {
          const isFresh = !slugRef.current;
          try {
            const r = await fetch("/api/half-second", {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                trace: { ...t, slug: slugRef.current },
                fresh: isFresh,
              }),
            });
            const out = (await r.json().catch(() => null)) as
              Trace | { error: string } | null;
            if (!r.ok || !out || "error" in out) {
              setTrouble(
                out && "error" in out ? out.error : `not kept (${r.status})`,
              );
              resolve(null);
              return;
            }
            slugRef.current = out.slug;
            if (rev.current === at) dirty.current = false;
            setKept(true);
            setTrouble(null);
            setOpen((cur) => (cur ? { ...cur, slug: out.slug } : cur));
            setPayload((p) =>
              p
                ? {
                    ...p,
                    traces: [
                      out,
                      ...p.traces.filter((x) => x.slug !== out.slug),
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

  const edit = useCallback(
    (f: (t: Trace) => Trace, done?: boolean) => {
      const cur = openRef.current;
      if (!cur) return;
      const next = f(cur);
      if (next !== cur) {
        openRef.current = next;
        dirty.current = true;
        rev.current++;
        setOpen(next);
        setSure(null);
      }
      if (done && dirty.current && keptRef.current && writable)
        void save(openRef.current!);
    },
    [save, writable],
  );

  const keep = useCallback(() => {
    const t = openRef.current;
    if (!t || !writable) return;
    if (!hasContent(t)) {
      setTrouble("run the feed, or say what you were doing");
      return;
    }
    void save(t);
  }, [save, writable]);

  const remove = useCallback(async () => {
    const t = openRef.current;
    if (!t || !writable || !keptRef.current) return;
    const r = await fetch(
      `/api/half-second?slug=${encodeURIComponent(t.slug)}`,
      {
        method: "DELETE",
      },
    );
    if (!r.ok) {
      setTrouble(`not taken off (${r.status})`);
      return;
    }
    setPayload((p) =>
      p ? { ...p, traces: p.traces.filter((x) => x.slug !== t.slug) } : p,
    );
    fresh();
  }, [writable, fresh]);

  /* ── the feed ────────────────────────────────────────────────────────── */

  const now = () => Math.round(performance.now() - sim.current.t0);
  const log = useCallback(
    (e: Omit<Ev, "at">) => {
      edit((t) => ({ ...t, events: [...t.events, { ...e, at: now() }] }));
    },
    [edit],
  );

  const stim = useCallback(
    (c: Card) => {
      const t = openRef.current;
      const s = sim.current;
      if (!t) return;
      const taps = s.taps[c.id] ?? 0;
      const { target, k } = stimulate(s.target, c, taps, t.preset);
      s.target = target;
      s.bloom = { i: k, loc: c.loc, tech: c.tech };
      edit((cur) => {
        const peaks = { ...cur.peaks };
        for (const g of GAUGE_KEYS) peaks[g] = Math.max(peaks[g], target[g]);
        return {
          ...cur,
          peak: Math.max(cur.peak, k),
          peaks,
          meters: sediment(cur.meters, c, k, cur.norm),
        };
      });
    },
    [edit],
  );

  const tap = useCallback(
    (c: Card) => {
      if (!live) return;
      const s = sim.current;
      s.taps[c.id] = (s.taps[c.id] ?? 0) + 1;
      log({ kind: "tap", card: c.id, n: s.taps[c.id] });
      edit((t) => ({ ...t, weights: learn(t.weights, c.tech, "tap") }));
      if (c.tech === "hail") answerHail();
      stim(c);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live, log, edit, stim],
  );

  const answerHail = useCallback(() => {
    const t = openRef.current;
    if (!t || t.events.some((e) => e.kind === "hail")) return;
    log({ kind: "hail" });
    edit((cur) => ({ ...cur, meters: hailed(cur.meters, true) }));
  }, [log, edit]);

  const leave = useCallback(
    (c: Card, ms: number) => {
      if (!live) return;
      const kind = ms < 900 ? "skip" : ms > 2500 ? "dwell" : "glance";
      log({ kind, card: c.id, ms });
      if (kind !== "glance")
        edit((t) => ({ ...t, weights: learn(t.weights, c.tech, kind) }));
      if (c.tech === "hail" && kind === "skip")
        edit((t) =>
          t.events.some((e) => e.kind === "hail")
            ? t
            : { ...t, meters: hailed(t.meters, false) },
        );
    },
    [live, log, edit],
  );

  const arrive = useCallback(
    (c: Card, el: HTMLElement) => {
      if (!live) return;
      if (c.tech === "buzz" && !reduced() && phoneRef.current) {
        phoneRef.current.classList.remove("hs-buzz");
        void phoneRef.current.offsetWidth;
        phoneRef.current.classList.add("hs-buzz");
      }
      if (c.tech === "spinner" && !el.classList.contains("resolved"))
        setTimeout(() => el.classList.add("resolved"), 1400);
      if (c.tech !== "none") stim(c);
    },
    [live, stim],
  );

  // Which card is in view, for how long: a dwell, a skip or a glance when it goes.
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    let inview: HTMLElement | null = null;
    let since = 0;
    const obs = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          const el = e.target as HTMLElement;
          const c = cardById(el.dataset.id ?? "");
          if (!c) continue;
          if (e.isIntersecting) {
            el.classList.add("inview");
            if (inview && inview !== el) {
              const prev = cardById(inview.dataset.id ?? "");
              if (prev) leave(prev, performance.now() - since);
            }
            inview = el;
            since = performance.now();
            arrive(c, el);
          } else {
            el.classList.remove("inview");
            if (inview === el) {
              leave(c, performance.now() - since);
              inview = null;
            }
          }
        }
      },
      { root: feed, threshold: 0.6 },
    );
    feed
      .querySelectorAll<HTMLElement>(".hs-card")
      .forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [order, leave, arrive, open?.slug]);

  const pull = useCallback(() => {
    if (!live || pulling) return;
    setPulling(true);
    log({ kind: "pull" });
    const wait = 400 + Math.random() * 1600;
    setTimeout(() => {
      setPulling(false);
      const t = openRef.current;
      if (!t) return;
      const lucky = Math.random() < 0.3;
      let ids = order.filter((i) => i !== "g");
      ids = orderCards(ids, t.weights);
      if (lucky) {
        ids = ["g", ...ids];
        log({ kind: "reward" });
      }
      setOrder(ids);
      feedRef.current?.scrollTo({ top: 0 });
      stim(
        lucky ? GOOD : { ...CARDS[5], tech: "reward", i: 0.35, loc: "hands" },
      );
    }, wait);
  }, [live, pulling, log, order, stim]);

  const putDown = useCallback(() => {
    if (!live || sim.current.down) return;
    sim.current.down = true;
    sim.current.downLeft = 90;
    log({ kind: "down" });
    setFrame((f) => f + 1);
  }, [live, log]);
  const pickUp = useCallback(() => {
    if (!sim.current.down) return;
    sim.current.down = false;
    sim.current.downLeft = 90;
    if (live) log({ kind: "up" });
    setFrame((f) => f + 1);
  }, [live, log]);

  /* ── the half-second ─────────────────────────────────────────────────── */

  const scrubTo = (t: number | null) => {
    sim.current.scrub = t;
    setFrame((f) => f + 1);
  };
  const fire = useCallback(() => {
    if (!open) return;
    const c =
      (sim.current.bloom.tech &&
        CARDS.find((x) => x.tech === sim.current.bloom.tech)) ||
      CARDS[2];
    stim(c);
    if (reduced()) {
      scrubTo(600);
      return;
    }
    const t0 = performance.now();
    const step = () => {
      const t = Math.min(600, ((performance.now() - t0) / 2400) * 600);
      scrubTo(Math.round(t));
      if (t < 600) requestAnimationFrame(step);
      else scrubTo(null);
    };
    requestAnimationFrame(step);
  }, [open, stim]);

  /* ── what is painted ─────────────────────────────────────────────────── */

  const s = sim.current;
  const scrubbing = s.scrub !== null;
  const f =
    s.scrub === null
      ? 1
      : s.scrub < 120
        ? 0
        : s.scrub < 200
          ? (s.scrub - 120) / 80
          : 1;
  const shown: Gauges = { ...BODY.base };
  for (const k of GAUGE_KEYS)
    shown[k] = BODY.base[k] + (s.g[k] - BODY.base[k]) * f;
  const bloomI = s.bloom.i * f;
  const L = LOC[s.bloom.loc];
  const lines = useMemo(() => (open ? shows(open) : []), [open]);
  const words = useMemo(() => (open ? readings(open) : []), [open]);
  const traces = payload?.traces ?? [];
  const record = useMemo(() => recordReadings(tally(traces)), [traces]);
  const isFlat = !!open && flat(open.weights);
  const hailGone =
    !!open && (isFlat || open.events.some((e) => e.kind === "hail"));
  const bloomName = open && bloomI > 0.05 ? nameOf(bloomI, open.vocab) : "";
  const wordsBlank = scrubbing && (s.scrub ?? 0) < 500;
  const ids = isFlat
    ? order.filter((id) => cardById(id)?.tech === "none")
    : order;

  return (
    <main className="half-second scroll-thin relative h-dvh w-full overflow-y-auto">
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
                half-second
              </div>
              <p
                className="hand mt-1 max-w-[31rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                The screen does not persuade you. It moves you, and you write
                the story afterwards. A synthetic feed against a toy body: the
                gauges move at 150 ms, you arrive at 500, and the trace keeps
                what you did in between.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/half-second" />
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
            className="panel sketched rise relative min-w-0 p-5 sm:p-8"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The half-second"
          >
            <Sketch seed={`half-second-${open?.slug || "fresh"}`} draw />
            {!open ? (
              <p className="meta" style={{ color: "var(--faint)" }}>
                {trouble ?? "reading…"}
              </p>
            ) : (
              <>
                <div className="relative z-[2] flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    {kept
                      ? `a trace · kept ${dayWords(open.at.slice(0, 10))}`
                      : "a new trace · the feed is running"}
                    {open.stone && (
                      <span
                        style={{ color: "var(--muted)", textTransform: "none" }}
                      >
                        {` · about ${open.stone}`}
                      </span>
                    )}
                  </div>
                  {(kept || hasContent(open)) && writable && (
                    <Chip onClick={fresh}>a new trace</Chip>
                  )}
                </div>
                {kept && (
                  <p
                    className="hand relative z-[2] mt-1 text-[14.5px] leading-[1.3]"
                    style={{ color: "var(--faint)" }}
                  >
                    A kept trace is read, not run: the body is at rest and the
                    feed stands as the trace left it. Start a new one to run it
                    again.
                  </p>
                )}

                {/* the knobs */}
                <div className="relative z-[2] mt-4 flex flex-wrap items-center gap-1.5">
                  {PRESETS.map((p) => (
                    <Chip
                      key={p}
                      on={open.preset === p}
                      onClick={() => live && edit((t) => ({ ...t, preset: p }))}
                      title="Texture has a history: the same cue lands at a different weight"
                    >
                      {PRESET_LABEL[p]}
                    </Chip>
                  ))}
                  <span className="meta mx-1" style={{ color: "var(--faint)" }}>
                    ·
                  </span>
                  <Chip
                    on={engineered}
                    onClick={() => setEngineered((e) => !e)}
                  >
                    {engineered
                      ? "hide the engineering"
                      : "show the engineering"}
                  </Chip>
                </div>

                {/* the apparatus */}
                <div className="relative z-[2] mt-5 grid gap-5 sm:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[250px_240px_minmax(0,1fr)]">
                  <div
                    ref={phoneRef}
                    className={`hs-phone relative flex h-[500px] w-[250px] flex-col overflow-hidden ${engineered ? "engineered" : ""}`}
                    aria-label="The feed"
                  >
                    <div
                      className="flex items-center justify-between px-4 pb-1.5 pt-2.5 text-[12px]"
                      style={{ ...mono, color: "var(--muted)" }}
                    >
                      <span>{open.at.slice(11, 16)}</span>
                      <button
                        onClick={() => {
                          if (!live) return;
                          tap(CARDS[0]);
                          feedRef.current?.scrollTo({
                            top: 0,
                            behavior: "smooth",
                          });
                        }}
                        className="hs-badge"
                        style={{ visibility: hailGone ? "hidden" : "visible" }}
                        aria-label="Three mentions"
                      >
                        3
                      </button>
                    </div>
                    <button
                      onClick={pull}
                      disabled={!live}
                      className="chip mx-3 mb-1.5 mt-1 px-2.5 py-1 text-[12px]"
                      style={{
                        ...mono,
                        color: "var(--muted)",
                        opacity: pulling ? 0.5 : 1,
                      }}
                    >
                      {pulling ? "…" : "pull to refresh"}
                    </button>
                    <div
                      ref={feedRef}
                      className="hs-feed relative flex-1 overflow-y-auto"
                    >
                      {ids.map((id) => {
                        const c = cardById(id)!;
                        const info = TECH[c.tech];
                        const init = c.who
                          .split(/\s+/)
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase();
                        return (
                          <article
                            key={id}
                            data-id={id}
                            className={`hs-card ${c.tech} ${id === "g" ? "good" : ""}`}
                            onClick={() => tap(c)}
                            onMouseEnter={() => setLit(info.ch)}
                            onMouseLeave={() => setLit([])}
                          >
                            {c.tech !== "none" && (
                              <span className="hs-tag" style={mono}>
                                {info.label}
                                <small>{info.sense}</small>
                              </span>
                            )}
                            <div className="flex items-center gap-2.5">
                              <span className="hs-avatar" style={mono}>
                                {init}
                              </span>
                              <div>
                                <div
                                  className="text-[14px]"
                                  style={{ color: "var(--ink)" }}
                                >
                                  {c.who}
                                </div>
                                <div
                                  className="text-[11px]"
                                  style={{ ...mono, color: "var(--faint)" }}
                                >
                                  {c.handle}
                                </div>
                              </div>
                            </div>
                            {c.tech === "face" && (
                              <svg
                                className="hs-eyes"
                                viewBox="0 0 120 56"
                                aria-hidden="true"
                              >
                                <g
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.4"
                                >
                                  <path d="M6 28 q28 -26 56 0 q-28 26 -56 0z" />
                                  <path d="M58 28 q28 -26 56 0 q-28 26 -56 0z" />
                                </g>
                                <circle
                                  cx="34"
                                  cy="28"
                                  r="8"
                                  fill="currentColor"
                                />
                                <circle
                                  cx="86"
                                  cy="28"
                                  r="8"
                                  fill="currentColor"
                                />
                                <circle
                                  cx="37"
                                  cy="25"
                                  r="2.5"
                                  style={{ fill: "var(--surface)" }}
                                />
                                <circle
                                  cx="89"
                                  cy="25"
                                  r="2.5"
                                  style={{ fill: "var(--surface)" }}
                                />
                              </svg>
                            )}
                            {c.tech === "autoplay" && (
                              <div className="hs-frame">
                                <div className="hs-bar" />
                              </div>
                            )}
                            <div
                              className="text-[15px] leading-[1.45]"
                              style={{ color: "var(--ink)" }}
                            >
                              {c.text}
                            </div>
                            {c.metric && (
                              <div
                                className="mt-auto text-[11px]"
                                style={{ ...mono, color: "var(--faint)" }}
                              >
                                {c.metric}
                              </div>
                            )}
                            {c.tech === "spinner" && (
                              <div className="hs-spin">
                                <i />
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                    {s.down && (
                      <div className="hs-off">
                        <div className="meta" style={{ opacity: 0.7 }}>
                          screen off
                        </div>
                        <div className="text-[32px]" style={mono}>
                          {s.downLeft}
                        </div>
                        <div className="text-[13px]" style={{ opacity: 0.8 }}>
                          seconds for the body to settle
                        </div>
                        <button
                          onClick={pickUp}
                          className={chip}
                          style={{
                            ...mono,
                            color: "inherit",
                            borderColor: "currentColor",
                          }}
                        >
                          pick it up
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="hs-body">
                      <svg
                        viewBox="0 0 260 250"
                        aria-label="A line figure with sensory channels and an intensity bloom"
                      >
                        <defs>
                          <radialGradient id="hs-rg">
                            <stop
                              offset="0"
                              style={{ stopColor: "var(--accent)" }}
                              stopOpacity=".85"
                            />
                            <stop
                              offset=".55"
                              style={{ stopColor: "var(--accent)" }}
                              stopOpacity=".3"
                            />
                            <stop
                              offset="1"
                              style={{ stopColor: "var(--accent)" }}
                              stopOpacity="0"
                            />
                          </radialGradient>
                        </defs>
                        <ellipse
                          cx={L[0]}
                          cy={L[1]}
                          rx={L[2] * (0.6 + bloomI * 0.6)}
                          ry={L[3] * (0.6 + bloomI * 0.6)}
                          fill="url(#hs-rg)"
                          opacity={bloomI.toFixed(2)}
                        />
                        <g className="hs-fig">
                          <circle cx="130" cy="42" r="22" />
                          <path d="M130 64 v22" />
                          <path d="M96 92 h68" />
                          <path d="M96 92 l-14 74 M164 92 l14 74" />
                          <path d="M100 92 c-2 40 -2 80 4 108 h52 c6 -28 6 -68 4 -108" />
                          <path d="M112 200 l-4 44 M148 200 l4 44" />
                        </g>
                        {(
                          [
                            ["eye", [[138, 38]], [165, 41]],
                            ["ear", [[109, 42]], [60, 45]],
                            ["neck", [[130, 76]], [165, 79]],
                            ["gut", [[130, 150]], [165, 153]],
                            [
                              "skin",
                              [
                                [82, 166],
                                [178, 166],
                              ],
                              [40, 186],
                            ],
                          ] as [Channel, [number, number][], [number, number]][]
                        ).map(([ch, dots, at]) => {
                          const on = lit.includes(ch);
                          const dim = lit.length > 0 && !on;
                          return (
                            <g
                              key={ch}
                              className="hs-ch"
                              style={{ opacity: dim ? 0.35 : 1 }}
                            >
                              {dots.map(([x, y]) => (
                                <circle
                                  key={`${x}-${y}`}
                                  cx={x}
                                  cy={y}
                                  r="3.5"
                                  style={{
                                    fill: on
                                      ? "var(--accent)"
                                      : "var(--surface)",
                                    stroke: on
                                      ? "var(--accent)"
                                      : "var(--faint)",
                                  }}
                                />
                              ))}
                              <text
                                x={at[0]}
                                y={at[1]}
                                style={{
                                  ...mono,
                                  fill: on ? "var(--accent)" : "var(--faint)",
                                }}
                              >
                                {ch}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span
                          className="meta"
                          style={{ color: "var(--faint)" }}
                        >
                          the body
                        </span>
                        <span
                          className="text-[12px]"
                          style={{ ...mono, color: "var(--muted)" }}
                        >
                          {scrubbing ? `t = ${s.scrub} ms` : "t = — ms"}
                        </span>
                      </div>
                      <div
                        className="hand min-h-[1.4em] text-[16px]"
                        style={{ color: "var(--muted)" }}
                      >
                        {bloomName}
                      </div>
                  </div>

                  <div className="hs-gauges grid content-start gap-1.5 self-center">
                      {GAUGE_KEYS.map((k) => {
                        const [name, unit, dp] = GAUGE_LABEL[k];
                        const v = shown[k];
                        const frac = Math.max(
                          0,
                          Math.min(1, (v - BODY.base[k]) / BODY.max[k]),
                        );
                        return (
                          <div
                            key={k}
                            className="grid grid-cols-[96px_1fr_58px] items-center gap-2.5 text-[12.5px]"
                          >
                            <span style={{ color: "var(--muted)" }}>
                              {name}
                            </span>
                            <span className="hs-track">
                              <i style={{ width: `${frac * 100}%` }} />
                            </span>
                            <span
                              className="text-right text-[11.5px]"
                              style={{ ...mono, color: "var(--muted)" }}
                            >
                              {v.toFixed(dp)}
                              {unit ? ` ${unit}` : ""}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* the half-second */}
                <div
                  className="relative z-[2] mt-6"
                  style={{ borderTop: "1px solid var(--rule)" }}
                >
                  <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
                    <Label>the half-second</Label>
                    <Chip onClick={fire} disabled={!open}>
                      fire a card, slowed four times
                    </Chip>
                  </div>
                  <p
                    className="hand mt-1 text-[15.5px] leading-[1.3]"
                    style={{ color: "var(--muted)" }}
                  >
                    You are late to your own reaction. The feed is built for the
                    part you are late to. Scrub: below 500 the body is live and
                    the words are blank.
                  </p>
                  <div className="hs-tl mt-3 max-w-[40em]">
                    <div className="hs-tltrack">
                      <div
                        className="hs-zone"
                        style={{ left: "25%", width: "58.3%" }}
                      >
                        <span style={mono}>the platform works here</span>
                      </div>
                      {(
                        [
                          ["0 ms", "stimulus", "0%"],
                          ["150 ms", "body has moved", "25%"],
                          ["500 ms", "you arrive", "83.3%"],
                        ] as const
                      ).map(([t, w, left]) => (
                        <div
                          key={t}
                          className="hs-mark"
                          style={{ left, ...mono }}
                        >
                          <b>{t}</b>
                          {w}
                        </div>
                      ))}
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={600}
                      step={10}
                      value={s.scrub ?? 0}
                      onChange={(e) => scrubTo(+e.target.value)}
                      onPointerUp={(e) => {
                        if (+(e.target as HTMLInputElement).value >= 600)
                          scrubTo(null);
                      }}
                      onKeyUp={(e) => {
                        if (+(e.target as HTMLInputElement).value >= 600)
                          scrubTo(null);
                      }}
                      className="mt-3 w-full"
                      style={{ accentColor: "var(--accent)" }}
                      aria-label="Scrub the half-second"
                    />
                  </div>
                </div>

                {/* the question, twice */}
                <div
                  className="relative z-[2] mt-6"
                  style={{ borderTop: "1px solid var(--rule)" }}
                >
                  <div className="mt-5">
                    <Label>why did you keep scrolling?</Label>
                  </div>
                  <div className="mt-2 grid gap-5 md:grid-cols-2">
                    <div>
                      <div
                        className="meta"
                        style={{
                          color: "var(--faint)",
                          textTransform: "none",
                          letterSpacing: "0.02em",
                        }}
                      >
                        what you would say
                      </div>
                      <textarea
                        ref={(el) => grow(el)}
                        onInput={(e) => grow(e.currentTarget)}
                        value={open.say}
                        onChange={(e) =>
                          edit((t) => ({ ...t, say: e.target.value }), false)
                        }
                        onBlur={() => edit((t) => t, true)}
                        readOnly={!writable}
                        rows={2}
                        placeholder={
                          writable
                            ? "in your own words — what were you doing?"
                            : ""
                        }
                        aria-label="What you would say"
                        className="bt-case mt-1 w-full resize-none overflow-hidden bg-transparent px-0 py-1 text-[15.5px] leading-[1.55]"
                        style={{ color: "var(--ink)" }}
                      />
                    </div>
                    <div>
                      <div
                        className="meta"
                        style={{
                          color: "var(--faint)",
                          textTransform: "none",
                          letterSpacing: "0.02em",
                        }}
                      >
                        what the trace shows{wordsBlank ? " (nothing yet)" : ""}
                      </div>
                      <ul
                        className="mt-1 flex flex-col gap-0.5 text-[12px] leading-[1.55]"
                        style={{
                          ...mono,
                          color: "var(--muted)",
                          opacity: wordsBlank ? 0 : 1,
                          transition:
                            "opacity 400ms cubic-bezier(0.16,1,0.3,1)",
                        }}
                      >
                        {lines.map((l, i) => (
                          <li key={i}>{l}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <p
                    className="hand mt-3 text-[15.5px] leading-[1.3]"
                    style={{ color: "var(--muted)" }}
                  >
                    The first answer is not a lie. It is what introspection
                    produces. It is also the theory you use on everyone else.
                  </p>
                </div>

                {/* downstream */}
                <div
                  className="relative z-[2] mt-6"
                  style={{ borderTop: "1px solid var(--rule)" }}
                >
                  <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
                    <Label>downstream</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {NORMS.map((n) => (
                        <Chip
                          key={n}
                          on={open.norm === n}
                          onClick={() =>
                            live && edit((t) => ({ ...t, norm: n }))
                          }
                        >
                          {NORM_LABEL[n]}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <p
                    className="hand mt-1 text-[15.5px] leading-[1.3]"
                    style={{ color: "var(--muted)" }}
                  >
                    These do not reset when a card leaves the screen. Comparison
                    only hurts against an expectation, and the expectation is
                    shared; pick the norm the feed is scored against.
                  </p>
                  <div className="mt-3 grid max-w-[36em] gap-2">
                    {METER_KEYS.map((k) => (
                      <div
                        key={k}
                        className="grid grid-cols-[90px_1fr_150px] items-center gap-3 text-[14px]"
                      >
                        <span style={{ color: "var(--ink)" }}>{k}</span>
                        <span className="hs-track tall">
                          <i style={{ width: `${open.meters[k]}%` }} />
                        </span>
                        <span
                          className="hand text-[16px]"
                          style={{ color: "var(--muted)" }}
                        >
                          {readMeter(k, open.meters[k])}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Chip onClick={putDown} disabled={!live || s.down}>
                      put it down
                    </Chip>
                    <span
                      className="meta"
                      style={{
                        color: "var(--faint)",
                        textTransform: "none",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {s.down
                        ? "the gauges are settling; the meters did not move"
                        : "the gauges take ninety seconds to return. the meters do not return at all."}
                    </span>
                  </div>
                </div>

                {/* the model of you */}
                <div
                  className="relative z-[2] mt-6"
                  style={{ borderTop: "1px solid var(--rule)" }}
                >
                  <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
                    <Label>what it thinks you are</Label>
                    {live && (
                      <Chip
                        onClick={() =>
                          edit((t) => ({
                            ...t,
                            weights: isFlat
                              ? { ...WEIGHTS_AT_REST }
                              : {
                                  threat: 0,
                                  comparison: 0,
                                  hail: 0,
                                  reward: 0,
                                },
                          }))
                        }
                      >
                        {isFlat ? "let it learn again" : "zero it"}
                      </Chip>
                    )}
                  </div>
                  <div className="mt-2 grid max-w-[36em] gap-1.5">
                    {CLASSES.map((c) => (
                      <div
                        key={c}
                        className="grid grid-cols-[150px_1fr_44px] items-center gap-3 text-[14px]"
                      >
                        <span style={{ color: "var(--ink)" }}>
                          {CLS_LABEL[c]}
                        </span>
                        <span className="hs-track">
                          <i style={{ width: `${open.weights[c] * 100}%` }} />
                        </span>
                        <span
                          className="text-right text-[11.5px]"
                          style={{ ...mono, color: "var(--muted)" }}
                        >
                          {open.weights[c].toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p
                    className="hand mt-3 max-w-[30em] text-[18px] leading-[1.3]"
                    style={{ color: "var(--ink)" }}
                  >
                    {thinks(open.weights)}
                  </p>
                  <p
                    className="mt-2 text-[13.5px] leading-[1.6]"
                    style={{ color: "var(--muted)" }}
                  >
                    Every dwell, tap and skip moved these four weights, and the
                    next card served was chosen from them. The world acts on you
                    through the world&apos;s perception of you; this is the
                    perception. Zeroed, the feed goes flat, and that flatness is
                    the baseline everything above was measured against.
                  </p>
                </div>

                {/* language */}
                <div
                  className="relative z-[2] mt-6"
                  style={{ borderTop: "1px solid var(--rule)" }}
                >
                  <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
                    <Label>language</Label>
                    <div className="flex gap-1.5">
                      <Chip
                        on={open.vocab === "coarse"}
                        onClick={() =>
                          edit((t) => ({ ...t, vocab: "coarse" }), true)
                        }
                      >
                        coarse · three words
                      </Chip>
                      <Chip
                        on={open.vocab === "granular"}
                        onClick={() =>
                          edit((t) => ({ ...t, vocab: "granular" }), true)
                        }
                      >
                        granular · twelve words
                      </Chip>
                    </div>
                  </div>
                  <p
                    className="hand mt-2 text-[18px] leading-[1.3]"
                    style={{ color: "var(--ink)" }}
                  >
                    {open.peak < 0.05
                      ? "No bloom yet. Tap a card, then come back."
                      : `The bloom at its highest, ${open.peak.toFixed(2)}: “${nameOf(open.peak, open.vocab)}.”`}
                  </p>
                  <p
                    className="mt-2 text-[13.5px] leading-[1.6]"
                    style={{ color: "var(--muted)" }}
                  >
                    The bloom did not change. The sentence did. This is the one
                    lever you hold: not what moves you, but what you can say
                    about it, and so what you can do next.
                  </p>
                </div>

                {!kept && writable && (
                  <div className="relative z-[2] mt-6 flex flex-wrap items-center gap-2">
                    <Chip
                      onClick={keep}
                      on={hasContent(open)}
                      disabled={!hasContent(open)}
                    >
                      keep this trace
                    </Chip>
                    <span
                      className="meta"
                      style={{
                        color: "var(--faint)",
                        textTransform: "none",
                        letterSpacing: "0.02em",
                      }}
                    >
                      one file in the vault: the events, the meters, the
                      weights, your words
                    </span>
                  </div>
                )}

                {kept && (
                  <div
                    className="relative z-[2] mt-8"
                    style={{ borderTop: "1px solid var(--rule)" }}
                  >
                    <div className="mt-5">
                      <Label>afterwards</Label>
                    </div>
                    <textarea
                      ref={(el) => grow(el)}
                      onInput={(e) => grow(e.currentTarget)}
                      value={open.after}
                      onChange={(e) =>
                        edit((t) => ({ ...t, after: e.target.value }), false)
                      }
                      onBlur={() => edit((t) => t, true)}
                      readOnly={!writable}
                      rows={2}
                      placeholder={
                        writable
                          ? "afterwards, in your words — what the trace had that you did not, and the other way round"
                          : ""
                      }
                      aria-label="Afterwards"
                      className="bt-case mt-3 w-full resize-none overflow-hidden bg-transparent px-0 py-1 text-[15.5px] leading-[1.55]"
                      style={{ color: "var(--ink)" }}
                    />
                  </div>
                )}

                {kept && writable && (
                  <div className="relative z-[2] mt-6 flex flex-wrap gap-1.5">
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
                    className="meta relative z-[2] mt-3"
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
              <Sketch seed="half-second-reading" draw />
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
              <Sketch seed="half-second-record" draw />
              <Label>the record</Label>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                {payload ? record.join(" · ") : "reading…"}
              </p>
              {traces.length > 0 && (
                <ol className="mt-2 flex flex-col">
                  {traces.slice(0, 30).map((t, i) => {
                    const on = kept && open?.slug === t.slug;
                    const seen = new Set(
                      t.events.filter((e) => e.card).map((e) => e.card),
                    ).size;
                    return (
                      <li
                        key={t.slug}
                        className="bt-rec"
                        style={{ ["--i" as string]: i }}
                      >
                        <button
                          onClick={() => load(t)}
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
                            {dayWords(t.at.slice(0, 10))} · {t.at.slice(11, 16)}
                            {t.events.some((e) => e.kind === "down")
                              ? " · put down"
                              : ""}
                          </span>
                          <span
                            className="display text-[15.5px] leading-[1.25]"
                            style={{ color: "var(--ink)" }}
                          >
                            {titleOf(t)}
                          </span>
                          <span
                            className="hand text-[14.5px]"
                            style={{ color: "var(--muted)" }}
                          >
                            {seen} card{seen === 1 ? "" : "s"} · standing{" "}
                            {readMeter("standing", t.meters.standing)} · threat{" "}
                            {readMeter("threat", t.meters.threat)}
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
              aria-label="What the half-second holds to"
            >
              <Sketch seed="half-second-laws" draw />
              <Label>what the half-second holds to</Label>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                Affect is autonomic and prior to anyone being there to have it.
                A body registers a card about 150 ms after it lands; the person
                becomes aware about 500 ms after. The feed is engineered for the
                gap. What arrives on the far side as a decision, a mood, a sense
                of where you stand is downstream of a body that was already
                moved, and the narrating mind then supplies a reason and feels
                the reason as the cause.
              </p>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                The feed is twelve invented cards and the body is a toy: the
                gauges are illustrative and the numbers are round. Nothing is
                measured from you. The trace is what you did with the sheet; the
                words beside it are yours. The desk counts cards, seconds, taps
                and what moved, and never says what it means.
              </p>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                It never says you were hooked, that the reason you gave was
                wrong, or that you should put it down. An installed affect is
                not an incentive you must obey; seeing the mechanism confers no
                obligation to it.
              </p>
              <p
                className="meta mt-3"
                style={{ color: "var(--faint)", textTransform: "none" }}
              >
                Massumi, The Autonomy of Affect (1995) · Libet (1983) · Nisbett
                and Wilson, Telling More Than We Can Know (1977) · Cooley (1902)
                — all unverified against a primary source
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
