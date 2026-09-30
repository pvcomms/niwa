"use client";

import { useEffect, useMemo, useState } from "react";
import type { GardenLink } from "@/lib/garden";
import {
  MARKERS,
  SHARES,
  bulkSaid,
  dayOf,
  growth,
  panel,
  said,
  type Leave,
  type MarkerKey,
  type PanelInput,
} from "@/lib/panel";
import {
  CHECKS,
  DATING,
  LEAD,
  LEAVES,
  LINEAGE,
  MARKER_WORDS,
} from "@/content/panel";
import { putOnDesk } from "./desk";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

const mono = { fontFamily: "var(--font-mono)" } as const;
const chip = "chip px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";

/** The strip's own frame; stretched to its column, strokes kept at one width. */
const W = 1000;
const H = 64;

type Data = PanelInput & {
  links: GardenLink[];
  undated: number;
  dating: keyof typeof DATING;
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="meta" style={{ color: "var(--accent)" }}>
      {children}
    </div>
  );
}

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

/**
 * One marker drawn across the weeks. The line is ink, the ground under it a
 * wash of the same; a day planted in bulk is a faint tick through every strip
 * at its week, and the cursor is the accent, at the same place on every line.
 */
function Strip({
  k,
  values,
  bulkAt,
  at,
  onAt,
}: {
  k: MarkerKey;
  values: number[];
  bulkAt: number[];
  at: number;
  onAt: (i: number) => void;
}) {
  const n = values.length;
  const top = SHARES.has(k) ? 1 : Math.max(...values) * 1.08 || 1;
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * W : W / 2);
  const y = (v: number) => H - 3 - (v / top) * (H - 8);
  const line = values
    .map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join("");
  const area = `${line}L${x(n - 1)},${H}L${x(0)},${H}Z`;
  const pct = n > 1 ? (at / (n - 1)) * 100 : 50;
  const dot = (y(values[at] ?? 0) / H) * 100;

  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    onAt(Math.round(f * (n - 1)));
  };

  return (
    <div
      className="pn-strip"
      onPointerMove={pick}
      onPointerDown={pick}
      role="img"
      aria-label={`${MARKER_WORDS[k].name}, week by week`}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="pn-draw absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <line x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} className="pn-base" />
        {[...new Set(bulkAt)].map((i) => (
          <line key={i} x1={x(i)} x2={x(i)} y1={0} y2={H} className="pn-bulk" />
        ))}
        <path d={area} className="pn-area" />
        <path d={line} className="pn-line" />
      </svg>
      <div
        className="pn-track"
        style={{ "--f": pct / 100 } as React.CSSProperties}
        aria-hidden="true"
      >
        <span className="pn-cursor" />
        <span className="pn-dot" style={{ top: `${dot}%` }} />
      </div>
    </div>
  );
}

/**
 * The panel: the garden read as eight markers over time, each on its own
 * line, never added up. Two checks take stones out before anything is counted
 * — the most threaded, and the ones planted in bulk — so a jump can be seen
 * to belong to the whole or to a few. No model is asked and nothing is kept.
 */
export default function Panel() {
  const [theme, setTheme] = useTheme();
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [leave, setLeave] = useState<Leave>({ hubs: false, bulk: false });
  const [cursor, setCursor] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/panel", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: Data) => setData(d))
      .catch(() => setFailed(true));
  }, []);

  const p = useMemo(() => (data ? panel(data, leave) : null), [data, leave]);
  const last = p ? p.weeks.length - 1 : 0;
  const at = cursor === null ? last : Math.min(cursor, last);
  const week = p?.weeks[at];

  useEffect(() => {
    putOnDesk(
      week
        ? { kind: "panel", id: week, label: `week of ${dayOf(week)}` }
        : null,
    );
  }, [week]);
  useEffect(() => () => putOnDesk(null), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft") setCursor((c) => Math.max(0, (c ?? last) - 1));
      if (e.key === "ArrowRight")
        setCursor((c) => Math.min(last, (c ?? last) + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last]);

  const bulkAt = useMemo(() => {
    if (!p) return [];
    return p.bulk.map((b) => p.weeks.findIndex((w) => w >= b.day));
  }, [p]);

  const months = useMemo(() => {
    if (!p) return [];
    const out: { i: number; name: string }[] = [];
    p.weeks.forEach((w, i) => {
      const m = MONTHS[+w.slice(5, 7) - 1];
      if (!out.length || out[out.length - 1].name !== m)
        out.push({ i, name: m });
    });
    return out;
  }, [p]);

  const pctAt = (i: number) =>
    p && p.weeks.length > 1 ? (i / (p.weeks.length - 1)) * 100 : 50;

  return (
    <main className="pn scroll-thin relative h-dvh w-full overflow-y-auto">
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
                panel
              </div>
              <p
                className="hand mt-1 max-w-[27rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                The garden read as eight markers over time, each on its own
                line. None of them added up.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/panel" />
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

        {/* ── what it is, the headline, the two checks ─────────────────── */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <section
            className="panel sketched rise relative p-5 sm:p-8"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The panel"
          >
            <Sketch seed="panel-lead" draw />
            <Label>the panel</Label>
            <p
              className="display mt-4 max-w-[40rem] text-[25px] leading-[1.22] sm:text-[29px]"
              style={{ color: "var(--ink)" }}
            >
              {LEAD[0]}
            </p>
            <p
              className="mt-4 max-w-[42rem] text-[15px] leading-[1.7]"
              style={{ color: "var(--muted)" }}
            >
              {LEAD[1]}
            </p>
            {p && (
              <p
                key={`${leave.hubs}${leave.bulk}`}
                className="hand pn-after mt-6 max-w-[42rem] text-[19px] leading-[1.35]"
                style={{ color: "var(--accent)" }}
              >
                {growth(p)}
              </p>
            )}
          </section>

          <aside className="flex flex-col gap-5">
            <section
              className="panel sketched rise relative p-4 sm:p-5"
              style={{ borderRadius: 3, animationDelay: "120ms" }}
              aria-label="The checks"
            >
              <Sketch seed="panel-checks" draw />
              <Label>count again without</Label>
              <div className="mt-3 flex flex-col gap-3">
                {(["hubs", "bulk"] as const).map((c) => (
                  <div key={c}>
                    <button
                      onClick={() => setLeave((l) => ({ ...l, [c]: !l[c] }))}
                      aria-pressed={leave[c]}
                      className={chip}
                      style={{
                        ...mono,
                        color: leave[c] ? "var(--accent)" : "var(--muted)",
                        borderColor: leave[c] ? "var(--accent)" : undefined,
                      }}
                    >
                      {CHECKS[c].label}
                    </button>
                    <p
                      className="mt-1.5 text-[12.5px] leading-[1.5]"
                      style={{ color: "var(--faint)" }}
                    >
                      {CHECKS[c].note}
                    </p>
                  </div>
                ))}
              </div>
              {p && p.left > 0 && (
                <p
                  className="mt-4 text-[13px] leading-[1.55]"
                  style={{ ...mono, color: "var(--ink)" }}
                >
                  {p.left} stones left out, and every thread they held.
                </p>
              )}
              {data && (
                <p
                  className="mt-4 text-[12px] leading-[1.55]"
                  style={{ color: "var(--faint)" }}
                >
                  {DATING[data.dating]}
                  {data.undated > 0 &&
                    ` ${data.undated} not yet committed, dated by their last change.`}
                </p>
              )}
            </section>
          </aside>
        </div>

        {/* ── the markers ──────────────────────────────────────────────── */}
        <section
          className="panel sketched rise relative mt-6 p-5 sm:p-8"
          style={{ borderRadius: 3, animationDelay: "180ms" }}
          aria-label="The markers"
        >
          <Sketch seed="panel-markers" draw />
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <Label>the markers</Label>
            <div
              className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px]"
              style={{ ...mono, color: "var(--muted)" }}
            >
              {week && (
                <span style={{ color: "var(--ink)" }}>
                  week of {dayOf(week)}
                </span>
              )}
              <span className="inline-flex items-center gap-2">
                <i className="pn-key pn-key-bulk" /> planted in bulk
              </span>
              <span>← → or point along a line</span>
            </div>
          </div>

          {failed && (
            <p className="mt-6 text-[14px]" style={{ color: "var(--muted)" }}>
              The record could not be read.
            </p>
          )}
          {!p && !failed && (
            <p className="meta breathe mt-6" style={{ color: "var(--faint)" }}>
              reading the record
            </p>
          )}

          {p && (
            <div className="mt-4">
              {MARKERS.map((k, i) => {
                const w = MARKER_WORDS[k];
                const v = p.series[k];
                return (
                  <div
                    key={k}
                    className="pn-row rise grid gap-x-6 gap-y-2 py-4 md:grid-cols-[15rem_minmax(0,1fr)_8rem]"
                    style={{
                      borderTop: "1px solid var(--rule)",
                      animationDelay: `${220 + i * 40}ms`,
                    }}
                  >
                    <div>
                      <div
                        className="display text-[21px] leading-[1.1]"
                        style={{ color: "var(--ink)" }}
                      >
                        {w.name}
                      </div>
                      <p
                        className="mt-1.5 text-[12.5px] leading-[1.5]"
                        style={{ color: "var(--muted)" }}
                      >
                        {w.how}
                      </p>
                      <p
                        className="mt-1.5 text-[11.5px] leading-[1.5]"
                        style={{ color: "var(--faint)" }}
                      >
                        <span className="meta mr-1.5">cannot see</span>
                        {w.cannot}
                      </p>
                    </div>
                    <div className="self-center">
                      <Strip
                        k={k}
                        values={v}
                        bulkAt={bulkAt}
                        at={at}
                        onAt={setCursor}
                      />
                    </div>
                    <div className="self-center md:text-right">
                      <div
                        className="text-[24px] leading-none tabular-nums"
                        style={{ ...mono, color: "var(--ink)" }}
                      >
                        {said(k, v[at])}
                      </div>
                      <div
                        className="mt-1.5 text-[11px] leading-[1.5] tabular-nums"
                        style={{ ...mono, color: "var(--faint)" }}
                      >
                        {at !== last && <div>now {said(k, v[last])}</div>}
                        <div>
                          {dayOf(p.weeks[p.start])} {said(k, v[p.start])}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div
                className="grid gap-x-6 md:grid-cols-[15rem_minmax(0,1fr)_8rem]"
                style={{ borderTop: "1px solid var(--rule)" }}
              >
                <div className="hidden md:block" />
                <div className="relative h-6" aria-hidden="true">
                  {months.map((m) => (
                    <span
                      key={`${m.name}${m.i}`}
                      className="absolute top-1.5 -translate-x-1/2 text-[10px] tracking-[0.14em] uppercase"
                      style={{
                        ...mono,
                        color: "var(--faint)",
                        left: `${pctAt(m.i)}%`,
                      }}
                    >
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── the days, the hubs, what it leaves ───────────────────────── */}
        {p && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <section
              className="panel sketched rise relative p-5 sm:p-8"
              style={{ borderRadius: 3, animationDelay: "300ms" }}
              aria-label="What moves the lines"
            >
              <Sketch seed="panel-days" draw />
              <Label>planted in bulk</Label>
              {p.bulk.length === 0 ? (
                <p
                  className="mt-3 text-[14px]"
                  style={{ color: "var(--muted)" }}
                >
                  No day on which twenty or more stones first appear.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col">
                  {p.bulk.map((b, i) => (
                    <li key={b.day}>
                      <button
                        onClick={() => setCursor(bulkAt[i])}
                        className="pn-pick grid w-full gap-1 py-2.5 text-left sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4"
                        style={{ borderTop: "1px solid var(--rule)" }}
                      >
                        <span
                          className="meta pt-0.5"
                          style={{
                            color:
                              bulkAt[i] === at
                                ? "var(--accent)"
                                : "var(--faint)",
                          }}
                        >
                          {dayOf(b.day)}
                        </span>
                        <span
                          className="text-[14px] leading-[1.6]"
                          style={{ color: "var(--ink)" }}
                        >
                          {bulkSaid(b)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-8">
                <Label>the ten most threaded</Label>
                <ol className="mt-3 flex flex-col">
                  {p.hubs.map((h, i) => (
                    <li
                      key={h.id}
                      className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-baseline gap-3 py-2"
                      style={{ borderTop: "1px solid var(--rule)" }}
                    >
                      <span
                        className="text-[11px] tabular-nums"
                        style={{ ...mono, color: "var(--faint)" }}
                      >
                        {i + 1}
                      </span>
                      <span
                        className="truncate text-[14px]"
                        style={{
                          color: leave.hubs ? "var(--faint)" : "var(--ink)",
                          textDecoration: leave.hubs
                            ? "line-through"
                            : undefined,
                        }}
                      >
                        {h.label}
                      </span>
                      <span
                        className="text-[11px] tabular-nums"
                        style={{ ...mono, color: "var(--muted)" }}
                      >
                        {h.threads} threads
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            <aside className="flex flex-col gap-5">
              <section
                className="panel sketched rise relative p-4 sm:p-5"
                style={{ borderRadius: 3, animationDelay: "360ms" }}
                aria-label="What it leaves to you"
              >
                <Sketch seed="panel-leaves" draw />
                <Label>what it leaves to you</Label>
                <p
                  className="hand mt-3 text-[17px] leading-[1.3]"
                  style={{ color: "var(--ink)" }}
                >
                  {LEAVES}
                </p>
                <p
                  className="mt-5 text-[12px] leading-[1.55]"
                  style={{ color: "var(--faint)" }}
                >
                  {LINEAGE}
                </p>
              </section>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
