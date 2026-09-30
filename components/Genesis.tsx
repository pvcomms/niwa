"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ROUTES,
  ROUTE_KEYS,
  count,
  countOf,
  normaliseSplit,
  placed,
  readings,
  share,
  type By,
  type Guess,
  type Mark,
  type Route,
  type Row,
} from "@/lib/genesis";
import { putOnDesk } from "./desk";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

type Stone = Row & { label: string; modified: string | null; why: string };
type Payload = {
  frozen?: boolean;
  error?: string;
  stones: Stone[];
  guess: Guess | null;
  model: string;
  dir: string;
};

const mono = { fontFamily: "var(--font-mono)" } as const;
const chip = "chip px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";
const ellipsis = "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap";
const shortHome = (p: string) => p.replace(/^\/Users\/[^/]+/, "~");

/** The beds, gathered the way a reader would ask: my writing, what I keep for the machine, what I read. */
const BEDS: { key: string; name: string; kinds: string[] | null }[] = [
  { key: "all", name: "everything", kinds: null },
  {
    key: "writing",
    name: "your writing",
    kinds: ["garden", "notion", "note", "concept"],
  },
  {
    key: "memory",
    name: "memory",
    kinds: ["project", "feedback", "reference", "user"],
  },
  { key: "reading", name: "reading", kinds: ["reading"] },
];

const BY_WORD: Record<By, string> = {
  you: "yours",
  rule: "read off the file",
  model: "proposed",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="meta" style={{ color: "var(--accent)" }}>
      {children}
    </div>
  );
}

function Chip({
  children,
  onClick,
  on,
  accent,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  on?: boolean;
  accent?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={chip}
      style={{
        ...mono,
        color: accent ? "var(--accent)" : on ? "var(--ink)" : "var(--muted)",
        borderColor: accent ? "var(--accent)" : on ? "var(--ink)" : undefined,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

/**
 * One route's bar: the reader's marks solid, the rules' in ink, the model's
 * proposals hatched — laid end to end, as a share of everything placed — and
 * the reader's own number as a pen tick across it.
 */
function Bar({
  parts,
  total,
  guess,
  max,
  route,
}: {
  parts: Record<By, number>;
  total: number;
  guess: number | null;
  max: number;
  route: Route;
}) {
  const x = (n: number) => (total ? (n / total) * 100 * (100 / max) : 0);
  const you = x(parts.you);
  const rule = x(parts.rule);
  const model = x(parts.model);
  return (
    <svg
      viewBox="0 0 100 12"
      preserveAspectRatio="none"
      className="block h-3 w-full overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={`gn-hatch-${route}`}
          width="2.2"
          height="12"
          patternUnits="userSpaceOnUse"
          patternTransform="skewX(-30)"
        >
          <rect width="0.7" height="12" fill="var(--accent)" opacity="0.55" />
        </pattern>
      </defs>
      <rect
        x="0"
        y="2"
        width="100"
        height="8"
        fill="none"
        stroke="var(--rule)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <rect
        className="gn-seg"
        x="0"
        y="2"
        width={you}
        height="8"
        fill="var(--accent)"
      />
      <rect
        className="gn-seg"
        x={you}
        y="2"
        width={rule}
        height="8"
        fill="var(--muted)"
      />
      <rect
        className="gn-seg"
        x={you + rule}
        y="2"
        width={model}
        height="8"
        fill={`url(#gn-hatch-${route})`}
        stroke="var(--accent)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      {guess !== null && (
        <line
          x1={guess * (100 / max)}
          x2={guess * (100 / max)}
          y1="0"
          y2="12"
          stroke="var(--ink)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

/**
 * The stones: how each came into the garden, and how that sits beside where
 * the reader thinks their ideas come from. The reader says their split
 * first; then the garden's counts, with the reader's marks, the rules' and
 * the model's proposals kept apart; then any route opened to its stones,
 * each with its reason, to keep or change. Counts, never a grade.
 */
export default function Genesis() {
  const [theme, setTheme] = useTheme();
  const [data, setData] = useState<Payload | null>(null);
  const [draft, setDraft] = useState<Record<Route, number>>(
    () =>
      Object.fromEntries(ROUTE_KEYS.map((k) => [k, 17])) as Record<
        Route,
        number
      >,
  );
  const [skipped, setSkipped] = useState(false);
  const [bed, setBed] = useState("all");
  const [open, setOpen] = useState<Route | "unplaced" | null>(null);
  const [run, setRun] = useState<{
    on: boolean;
    read: number;
    left: number | null;
    ms: number;
    error: string;
  }>({ on: false, read: 0, left: null, ms: 0, error: "" });
  const stop = useRef(false);

  const load = () =>
    fetch("/api/genesis", { cache: "no-store" })
      .then((r) => r.json())
      .then((p: Payload) => {
        setData(p);
        if (p.guess) setDraft(p.guess.split);
      })
      .catch(() => setData({ error: "the garden did not answer" } as Payload));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    putOnDesk(
      open && open !== "unplaced"
        ? { kind: "route", id: open, label: open }
        : null,
    );
    return () => putOnDesk(null);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const kinds = BEDS.find((b) => b.key === bed)!.kinds;
  const shown = useMemo(
    () => (data?.stones ?? []).filter((s) => !kinds || kinds.includes(s.kind)),
    [data, kinds],
  );
  const t = useMemo(() => count(shown), [shown]);
  const all = useMemo(() => count(data?.stones ?? []), [data]);
  const guess = data?.guess ?? null;
  const said = guess !== null || skipped;
  const total = placed(t);
  const max = Math.max(
    50,
    Math.ceil(
      Math.max(
        ...ROUTE_KEYS.map((k) => Math.max(share(t, k), guess?.split[k] ?? 0)),
      ) / 10,
    ) * 10,
  );
  const draftSplit = normaliseSplit(draft);
  const waiting = all.unread;

  const say = async () => {
    const res = await fetch("/api/genesis", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ split: draft }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok) setData((d) => (d ? { ...d, guess: j.guess } : d));
  };

  const readOn = async () => {
    stop.current = false;
    setRun((r) => ({ ...r, on: true, error: "" }));
    for (;;) {
      if (stop.current) break;
      const res = await fetch("/api/genesis", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRun((r) => ({
          ...r,
          on: false,
          error: j.error ?? "the model did not answer",
        }));
        return;
      }
      await load();
      setRun((r) => ({
        ...r,
        read: r.read + (j.read ?? 0),
        left: j.left ?? 0,
        ms: j.ms ?? r.ms,
      }));
      if (!j.read || !j.left) break;
    }
    setRun((r) => ({ ...r, on: false }));
  };

  const mark = async (id: string, from: Route | null) => {
    const res = await fetch("/api/genesis", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, from }),
    });
    if (!res.ok) return;
    const j = (await res.json()) as { mark: Mark | null };
    setData((d) =>
      d
        ? {
            ...d,
            stones: d.stones.map((s) =>
              s.id === id
                ? { ...s, mark: j.mark, untold: j.mark ? false : s.untold }
                : s,
            ),
          }
        : d,
    );
  };

  const opened = useMemo(() => {
    if (!open) return [];
    const order: Record<By, number> = { you: 0, rule: 1, model: 2 };
    return shown
      .filter((s) => (open === "unplaced" ? !s.mark : s.mark?.from === open))
      .sort(
        (a, b) =>
          (a.mark ? order[a.mark.by] : 3) - (b.mark ? order[b.mark.by] : 3) ||
          a.label.localeCompare(b.label),
      );
  }, [open, shown]);

  const lines = readings(t, guess);

  return (
    <main className="gn scroll-thin relative h-dvh w-full overflow-y-auto">
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
              <div className="meta flex gap-3">
                <Link
                  href="/provenance"
                  className="gn-route"
                  style={{ color: "var(--faint)" }}
                >
                  provenance · a claim
                </Link>
                <span style={{ color: "var(--accent)" }}>the stones</span>
              </div>
              <p
                className="hand mt-1 max-w-[31rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                How did each thing in the garden get here? Read, told, asked,
                made, lived or thought. Say where you think your ideas come from
                first; then the count.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/provenance" />
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

        {data?.frozen ? (
          <p
            className="hand mt-16 text-center text-[15px]"
            style={{ color: "var(--faint)" }}
          >
            the stones need the private garden — a deployed sheet has none to
            read.
          </p>
        ) : data?.error ? (
          <p
            className="hand mt-16 text-center text-[15px]"
            style={{ color: "var(--accent)" }}
          >
            {data.error}
          </p>
        ) : !data ? (
          <p
            className="meta breathe mt-16 text-center"
            style={{ color: "var(--faint)" }}
          >
            reading the garden
          </p>
        ) : (
          <>
            <div className="mt-6 grid gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
              {/* ── the reader's split ───────────────────────────────────── */}
              <section
                className="panel sketched rise relative p-4 sm:p-5"
                style={{ borderRadius: 3, animationDelay: "60ms" }}
                aria-label="Where you think they come from"
              >
                <Sketch seed="genesis-guess" draw />
                <Label>where you think they come from</Label>
                <p
                  className="mt-2 text-[12.5px] leading-[1.55]"
                  style={{ color: "var(--muted)" }}
                >
                  {guess
                    ? `Said ${guess.on || "before"}. Move the dials and say it again to replace it.`
                    : "Before any count. Weigh the six against each other; they are said in 100."}
                </p>
                <div className="mt-4 flex flex-col gap-3.5">
                  {ROUTES.map((r) => (
                    <div key={r.key}>
                      <label
                        htmlFor={`gn-${r.key}`}
                        className="flex items-baseline justify-between gap-3"
                      >
                        <span
                          className="text-[13.5px]"
                          style={{ color: "var(--ink)" }}
                        >
                          {r.name}
                          <span
                            className="ml-2 text-[12px]"
                            style={{ color: "var(--faint)" }}
                          >
                            {r.says}
                          </span>
                        </span>
                        <span
                          className="text-[13px] tabular-nums"
                          style={{ ...mono, color: "var(--ink)" }}
                        >
                          {draftSplit[r.key]}
                        </span>
                      </label>
                      <input
                        id={`gn-${r.key}`}
                        type="range"
                        className="a-dial mt-1"
                        min={0}
                        max={100}
                        value={draft[r.key]}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, [r.key]: +e.target.value }))
                        }
                        aria-label={`${r.name}, weight`}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Chip onClick={say} accent>
                    {guess ? "say it again" : "say it"}
                  </Chip>
                  {!said && (
                    <Chip onClick={() => setSkipped(true)}>
                      show the count without saying
                    </Chip>
                  )}
                </div>
              </section>

              {/* ── the count ──────────────────────────────────────────────── */}
              <section
                className="panel sketched rise relative p-5 sm:p-8"
                style={{ borderRadius: 3, animationDelay: "120ms" }}
                aria-label="Where they came from"
              >
                <Sketch seed="genesis-count" draw />
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <Label>where they came from</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {BEDS.map((b) => (
                      <Chip
                        key={b.key}
                        on={bed === b.key}
                        onClick={() => setBed(b.key)}
                      >
                        {b.name}
                      </Chip>
                    ))}
                  </div>
                </div>

                {!said ? (
                  <p
                    className="hand mt-10 mb-8 text-[17px] leading-[1.35]"
                    style={{ color: "var(--faint)" }}
                  >
                    the count waits until you have said yours.
                  </p>
                ) : (
                  <div className="gn-after">
                    <ul className="mt-5 flex flex-col">
                      {ROUTES.map((r) => {
                        const n = countOf(t, r.key);
                        const on = open === r.key;
                        return (
                          <li
                            key={r.key}
                            style={{ borderTop: "1px solid var(--rule)" }}
                          >
                            <button
                              onClick={() => setOpen(on ? null : r.key)}
                              aria-expanded={on}
                              className="gn-row grid w-full grid-cols-[4.5rem_minmax(0,1fr)_5.5rem] items-center gap-3 py-2.5 text-left sm:grid-cols-[5.5rem_minmax(0,1fr)_7rem]"
                            >
                              <span
                                className="relative text-[14px]"
                                style={{ color: "var(--ink)" }}
                              >
                                {r.name}
                                {on && (
                                  <Sketch
                                    kind="underline"
                                    seed={`gn-${r.key}`}
                                    color="var(--accent)"
                                  />
                                )}
                              </span>
                              <Bar
                                parts={t.byRoute[r.key]}
                                total={total}
                                guess={guess ? guess.split[r.key] : null}
                                max={max}
                                route={r.key}
                              />
                              <span
                                className="text-right text-[12px] tabular-nums"
                                style={{ ...mono, color: "var(--ink)" }}
                              >
                                {n}
                                <span style={{ color: "var(--faint)" }}>
                                  {" "}
                                  · {share(t, r.key)}<span className="hidden sm:inline"> in 100</span>
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <div
                      className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[10.5px]"
                      style={{ ...mono, color: "var(--muted)" }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <i
                          className="gn-key"
                          style={{ background: "var(--accent)" }}
                        />{" "}
                        yours
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <i
                          className="gn-key"
                          style={{ background: "var(--muted)" }}
                        />{" "}
                        read off the file
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <i className="gn-key gn-key-hatch" /> proposed by the
                        model
                      </span>
                      {guess && (
                        <span className="inline-flex items-center gap-2">
                          <i className="gn-key gn-key-tick" /> what you said
                        </span>
                      )}
                      <span>bars are in 100 of the placed, to {max}</span>
                    </div>
                    <ul className="mt-5 flex flex-col gap-1.5">
                      {lines.map((l) => (
                        <li
                          key={l}
                          className="text-[13.5px] leading-[1.6]"
                          style={{ color: "var(--ink)" }}
                        >
                          {l}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div
                  className="mt-5 flex flex-wrap items-center gap-3 pt-4"
                  style={{ borderTop: "1px solid var(--rule)" }}
                >
                  {run.on ? (
                    <Chip onClick={() => (stop.current = true)}>
                      stop after this batch
                    </Chip>
                  ) : (
                    <Chip
                      onClick={readOn}
                      disabled={waiting === 0}
                      accent={waiting > 0}
                    >
                      {waiting
                        ? `ask the model to read ${waiting} unread`
                        : "all read"}
                    </Chip>
                  )}
                  <span
                    className="text-[11px]"
                    style={{ ...mono, color: "var(--faint)" }}
                  >
                    {run.on
                      ? `reading · ${run.read} read this sitting${run.left !== null ? ` · ${run.left} left` : ""}${run.ms ? ` · ${Math.round(run.ms / 1000)}s a batch of 8` : ""}`
                      : run.read
                        ? `${run.read} read this sitting`
                        : `${data.model}, on this machine`}
                  </span>
                  {run.error && (
                    <span
                      className="hand text-[14px]"
                      style={{ color: "var(--accent)" }}
                    >
                      {run.error}
                    </span>
                  )}
                  {(t.unread > 0 || t.untold > 0) && said && (
                    <button
                      onClick={() =>
                        setOpen(open === "unplaced" ? null : "unplaced")
                      }
                      className="meta ml-auto"
                      style={{
                        color:
                          open === "unplaced" ? "var(--ink)" : "var(--faint)",
                      }}
                    >
                      the unplaced · {t.unread + t.untold}
                    </button>
                  )}
                </div>
              </section>
            </div>

            {/* ── a route opened to its stones ──────────────────────────────── */}
            {open && said && (
              <section
                className="panel sketched rise relative mt-6 p-5 sm:p-8"
                style={{ borderRadius: 3 }}
                aria-label={
                  open === "unplaced"
                    ? "The stones not placed"
                    : `The stones by ${open}`
                }
              >
                <Sketch seed={`genesis-open-${open}`} draw />
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <Label>
                    {open === "unplaced"
                      ? `not placed · ${opened.length}`
                      : `${open} · ${ROUTES.find((r) => r.key === open)!.says} · ${opened.length}`}
                  </Label>
                  <button
                    onClick={() => setOpen(null)}
                    className="meta"
                    style={{ color: "var(--faint)" }}
                  >
                    esc
                  </button>
                </div>
                <ul className="mt-3 flex flex-col">
                  {opened.slice(0, 150).map((s) => (
                    <li
                      key={s.id}
                      className="grid gap-1 py-3 sm:grid-cols-[minmax(0,17rem)_minmax(0,1fr)_auto] sm:gap-5"
                      style={{ borderTop: "1px solid var(--rule)" }}
                    >
                      <div className="flex min-w-0 items-baseline gap-2">
                        <span
                          aria-hidden
                          className="shrink-0"
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 99,
                            background: `var(--kind-${s.kind})`,
                          }}
                        />
                        <Link
                          href={`/catalogue?id=${encodeURIComponent(s.id)}`}
                          className={`b-stone-link text-[13.5px] ${ellipsis}`}
                          style={{ color: "var(--ink)" }}
                        >
                          {s.label}
                        </Link>
                      </div>
                      <div className="min-w-0">
                        <p
                          className="hand text-[15px] leading-[1.25]"
                          style={{
                            color: s.mark ? "var(--muted)" : "var(--faint)",
                          }}
                        >
                          {s.mark
                            ? s.mark.by === "model"
                              ? `“${s.mark.because}”`
                              : s.mark.because || "your word"
                            : s.why || "not yet read"}
                        </p>
                        {s.mark && (
                          <span
                            className="meta"
                            style={{
                              color: "var(--faint)",
                              textTransform: "none",
                            }}
                          >
                            {BY_WORD[s.mark.by]}
                            {s.mark.on ? ` · ${s.mark.on}` : ""}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        {ROUTE_KEYS.map((k) => {
                          const here = s.mark?.from === k;
                          const mine = here && s.mark?.by === "you";
                          return (
                            <button
                              key={k}
                              onClick={() => mark(s.id, mine ? null : k)}
                              aria-pressed={mine}
                              title={
                                mine
                                  ? "take your word back"
                                  : here
                                    ? "keep it as yours"
                                    : `say it came by ${k}`
                              }
                              className="gn-route relative rounded-full px-2 py-0.5 text-[10px] tracking-[0.1em] uppercase"
                              style={{
                                ...mono,
                                color: here ? "var(--ink)" : "var(--faint)",
                              }}
                            >
                              {k}
                              {here && (
                                <Sketch
                                  kind="ring"
                                  seed={`${s.id}-${k}`}
                                  color={
                                    mine ? "var(--accent)" : "var(--faint)"
                                  }
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
                {opened.length > 150 && (
                  <p
                    className="hand mt-2 text-[13.5px]"
                    style={{ color: "var(--faint)" }}
                  >
                    and {opened.length - 150} more — narrow the bed.
                  </p>
                )}
                <p
                  className="hand mt-4 text-[13.5px] leading-[1.3]"
                  style={{ color: "var(--faint)" }}
                >
                  a ring in the accent is yours; a pale ring is a rule or a
                  proposal. press the pale one to keep it, another to change it,
                  yours again to take it back.
                </p>
              </section>
            )}

            <p
              className="hand mt-8 max-w-[46rem] text-[13.5px] leading-[1.35]"
              style={{ color: "var(--faint)" }}
            >
              how it is read: two things say where a stone came from outright —
              the Reader archive and Fieldnotes Sources — and those are read off
              the file. The rest the model on this machine reads, eight at a
              time, and proposes a route only with a phrase copied from the
              stone that shows it; a proposal whose phrase is not in the stone
              is dropped. Six routes, chosen beforehand, not found in the data.
              Nothing here says one is the better way for an idea to arrive.
              {data.dir
                ? ` marks are kept at ${shortHome(data.dir)}/marks.json.`
                : ""}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
