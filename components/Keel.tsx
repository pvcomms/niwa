"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AFTER,
  ALONE,
  ARRANGED,
  ARTICLES_LEAD,
  CLARITY,
  CODA,
  COLLAPSE,
  CURRENT,
  FILLER,
  LEAD,
  LIMITS,
  POSITIONS,
  ROOMS_LEAD,
  SOURCES,
  SPECIMEN,
  STATIONS,
  WORDS,
} from "@/content/keel";
import {
  DOINGS,
  ROOMS,
  SCALE,
  SOURCES_OF,
  articleNotes,
  articlesText,
  belief,
  drawCrowds,
  fmt,
  how,
  mover,
  reading,
  roomsReading,
  shuffle,
  signed,
  summarise,
  verdict,
  type Article,
  type Crowd,
  type Doing,
  type Position,
  type Room,
  type Source,
  type Verdict,
} from "@/lib/keel";
import { putOnDesk } from "./desk";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

const mono = { fontFamily: "var(--font-mono)" } as const;
const BY = Object.fromEntries(POSITIONS.map((p) => [p.id, p])) as Record<
  string,
  Position
>;

type FeedItem =
  { kind: "post"; k: string; t: string; m: string } | { kind: "q"; id: string };

type Art = { bel: string; src: Source | null; chg: string };

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="meta" style={{ color: "var(--accent)" }}>
      {children}
    </div>
  );
}

function Go({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="chip px-3.5 py-2 text-[10.5px] tracking-[0.14em] uppercase"
      style={{
        ...mono,
        color: disabled ? "var(--faint)" : "var(--accent)",
        borderColor: disabled ? undefined : "var(--accent)",
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

/** Seven marks from strongly disagree to strongly agree. */
function Scale({
  p,
  value,
  onPick,
  disabled,
}: {
  p: Position;
  value: number | undefined;
  onPick: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={p.text}>
      <div className="kl-bubbles">
        {WORDS.map((w, k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={value === k + 1}
            aria-label={`${k + 1}, ${w}`}
            className="kl-bub"
            disabled={disabled}
            onClick={() => onPick(k + 1)}
          >
            <i>{k + 1}</i>
          </button>
        ))}
      </div>
      <div className="kl-ends" aria-hidden>
        <span>disagree</span>
        <span>unsure</span>
        <span>agree</span>
      </div>
    </div>
  );
}

function Question({
  p,
  value,
  onPick,
  disabled,
}: {
  p: Position;
  value: number | undefined;
  onPick: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="py-4" style={{ borderTop: "1px solid var(--rule)" }}>
      <div className="meta" style={{ color: "var(--faint)" }}>
        {p.topic}
      </div>
      <p
        className="mt-1 max-w-[40rem] text-[17px] leading-[1.45]"
        style={{ color: "var(--ink)" }}
      >
        {p.text}
      </p>
      <div className="mt-2">
        <Scale p={p} value={value} onPick={onPick} disabled={disabled} />
      </div>
    </div>
  );
}

function Poll({ c, p }: { c: Crowd; p: Position }) {
  const mx = Math.max(...c.shares);
  return (
    <>
      <div className="kl-poll" aria-hidden>
        {c.shares.map((s, i) => (
          <i key={i} style={{ height: `${r2((s / mx) * 100)}%` }} />
        ))}
      </div>
      <p
        className="mt-1 text-[11px]"
        style={{ ...mono, color: "var(--keel-current)" }}
      >
        {c.against}% {c.side < 0 ? "disagree" : "agree"}
      </p>
      <p className="kl-comment mt-2 text-[14.5px] leading-[1.45]">
        <span className="meta mb-0.5 block" style={{ color: "var(--faint)" }}>
          top comment ·{" "}
          {c.likes >= 1000
            ? `${(c.likes / 1000).toFixed(1).replace(/\.0$/, "")}k`
            : c.likes}{" "}
          likes
        </span>
        {c.side < 0 ? p.disagree : p.agree}
      </p>
    </>
  );
}

/** Rounded to hundredths, so the server and the browser draw the same numbers. */
const r2 = (n: number) => Math.round(n * 100) / 100;
const X = (k: number) => r2(20 + (k - 1) * 73.33);

/** One position: alone (hollow), in the current (filled), the crowd behind. */
function Track({
  a,
  b,
  c,
  keel,
}: {
  a: number;
  b: number;
  c?: { shares: number[]; mean: number };
  keel: boolean;
}) {
  const y = 22;
  const mx = c ? Math.max(...c.shares) : 1;
  const dir = b > a ? 1 : -1;
  const x1 = X(a) + dir * 9;
  const x2 = X(b) - dir * 10;
  return (
    <svg className="kl-track" viewBox="0 0 480 44" aria-hidden>
      {c?.shares.map((s, i) => {
        const h = r2((s / mx) * 22);
        return (
          <rect
            key={i}
            className="kl-bar"
            x={X(i + 1) - 11}
            y={r2(38 - h)}
            width={22}
            height={h}
            rx={1.5}
          />
        );
      })}
      <line className="kl-ax" x1={X(1)} x2={X(SCALE)} y1={38} y2={38} />
      {Array.from({ length: SCALE }, (_, i) => (
        <line
          key={i}
          className={i === 3 ? "kl-mid" : "kl-tk"}
          x1={X(i + 1)}
          x2={X(i + 1)}
          y1={i === 3 ? 8 : 35}
          y2={41}
        />
      ))}
      {c && (
        <line className="kl-cm" x1={X(c.mean)} x2={X(c.mean)} y1={6} y2={40} />
      )}
      {a === b ? (
        <>
          <circle
            className={keel ? "kl-ring kl-keel" : "kl-ring"}
            cx={X(a)}
            cy={y}
            r={11}
          />
          <circle className="kl-b" cx={X(b)} cy={y} r={6.5} />
        </>
      ) : (
        <>
          <path
            className="kl-mv"
            style={{ "--len": r2(Math.abs(x2 - x1) + 1) } as React.CSSProperties}
            d={`M${x1} ${y} L${x2} ${y}`}
          />
          <path
            className="kl-hd"
            d={`M${x2 + dir} ${y} l${-dir * 7} -4.5 v9 z`}
          />
          <circle className="kl-a" cx={X(a)} cy={y} r={6.5} />
          <circle className="kl-b" cx={X(b)} cy={y} r={6.5} />
        </>
      )}
    </svg>
  );
}

function Mark({
  v,
  crowd,
  short,
}: {
  v: Verdict;
  crowd: boolean;
  short?: boolean;
}) {
  const color =
    crowd && v === "held"
      ? "var(--keel-held)"
      : v === "carried"
        ? "var(--keel-current)"
        : "var(--muted)";
  return (
    <span
      className="text-right text-[10.5px] tracking-[0.12em] uppercase"
      style={{ ...mono, color }}
    >
      {short && v === "pushed back" ? "pushed" : v}
    </span>
  );
}

function specimenCrowd(m: number) {
  const w: number[] = [];
  for (let k = 1; k <= SCALE; k++)
    w.push(Math.exp(-((k - m) ** 2) / 2.6) + 0.03);
  const s = w.reduce((x, y) => x + y, 0);
  return { shares: w.map((x) => x / s), mean: m };
}

export default function Keel() {
  const [theme, setTheme] = useTheme();
  const [stage, setStage] = useState(0);
  const [a, setA] = useState<Record<string, number>>({});
  const [b, setB] = useState<Record<string, number>>({});
  const [crowds, setCrowds] = useState<Record<string, Crowd>>({});
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [picks, setPicks] = useState<string[]>([]);
  const [rooms, setRooms] = useState<
    Record<string, Partial<Record<Room, Doing>>>
  >({});
  const [roomsShown, setRoomsShown] = useState(false);
  const [arts, setArts] = useState<Record<string, Art>>({});
  const [set, setSet] = useState<{ date: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const s = STATIONS[Math.min(stage, STATIONS.length - 1)];
    putOnDesk({
      kind: "keel",
      id: s.name.replace(/\s+/g, "-"),
      label: `keel · ${s.name}`,
    });
    return () => putOnDesk(null);
  }, [stage]);

  useEffect(() => {
    if (stage === 0) return;
    refs.current[stage]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [stage]);

  const nA = Object.keys(a).length;
  const nB = Object.keys(b).length;

  const toCurrent = () => {
    const rand = Math.random;
    setCrowds(drawCrowds(POSITIONS, a, rand));
    const order = shuffle(POSITIONS, rand);
    const fill = shuffle(FILLER, rand);
    const items: FeedItem[] = [];
    order.forEach((p, i) => {
      const f = i % 2 === 0 ? fill.pop() : undefined;
      if (f) items.push({ kind: "post", ...f });
      items.push({ kind: "q", id: p.id });
    });
    setFeed(items);
    setStage(1);
  };

  const summary = useMemo(
    () => (stage >= 2 ? summarise(POSITIONS, a, b, crowds) : null),
    [stage, a, b, crowds],
  );
  const v = (id: string) => verdict(a[id], b[id], crowds[id]);
  const withCrowd = POSITIONS.filter((p) => crowds[p.id]);
  const without = POSITIONS.filter((p) => !crowds[p.id]);

  const roomsDone =
    picks.length > 0 &&
    picks.every((id) => ROOMS.every(([k]) => rooms[id]?.[k]));
  const roomRead = roomsShown
    ? roomsReading(picks.map((id) => rooms[id] as Record<Room, Doing>))
    : null;

  const artsDone =
    picks.length > 0 &&
    picks.every((id) => arts[id]?.bel.trim() && arts[id]?.src);
  const articles: Article[] = picks.map((id) => ({
    text: BY[id].text,
    bel: arts[id]?.bel ?? "",
    src: (arts[id]?.src ?? "unsure") as Source,
    chg: arts[id]?.chg ?? "",
  }));
  const leaned = picks.filter((id) => crowds[id]);
  const heldN = leaned.filter((id) => v(id) === "held").length;
  const foot =
    (leaned.length
      ? `Held when a crowd leaned on it: ${heldN} of ${leaned.length}. `
      : "No crowd leaned on these on this run. ") +
    `Said in every room: ${roomRead?.whole ?? 0} of ${picks.length}.`;

  const again = () => {
    setStage(0);
    setA({});
    setB({});
    setCrowds({});
    setFeed([]);
    setPicks([]);
    setRooms({});
    setRoomsShown(false);
    setArts({});
    setSet(null);
    setCopied(null);
    refs.current[0]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const copy = async () => {
    if (!set) return;
    try {
      await navigator.clipboard.writeText(
        articlesText(set.date, articles, foot),
      );
      setCopied("copied");
    } catch {
      setCopied("select the card and copy it by hand");
    }
    setTimeout(() => setCopied(null), 2400);
  };

  const panel = "panel sketched rise relative p-5 sm:p-8";

  return (
    <main className="kl scroll-thin relative h-dvh w-full overflow-y-auto">
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
                keel
              </div>
              <p
                className="hand mt-1 max-w-[27rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                Stop flowing. Believe in something: a crowd set against you,
                what held, and where you would still say it.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/keel" />
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

        {/* ── the claim ────────────────────────────────────────────────── */}
        <section
          className={`${panel} mt-6`}
          style={{ borderRadius: 3, animationDelay: "60ms" }}
          aria-label="The claim"
        >
          <Sketch seed="keel-lead" draw />
          <Label>the claim</Label>
          {LEAD.map((t, i) => (
            <p
              key={i}
              className={
                i === 0
                  ? "display mt-4 max-w-[46rem] text-[25px] leading-[1.22] sm:text-[30px]"
                  : "mt-4 max-w-[44rem] text-[15.5px] leading-[1.7]"
              }
              style={{ color: i === 0 ? "var(--ink)" : "var(--muted)" }}
            >
              {t}
            </p>
          ))}
          <p
            className="hand mt-6 text-[19px] leading-[1.3]"
            style={{ color: "var(--accent)" }}
          >
            Answer before you read what the crowd was.
          </p>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="flex min-w-0 flex-col gap-6">
            {/* ── I · alone ────────────────────────────────────────────── */}
            <section
              ref={(el) => {
                refs.current[0] = el;
              }}
              className={panel}
              style={{ borderRadius: 3, animationDelay: "120ms" }}
              aria-label="I, alone"
            >
              <Sketch seed="keel-alone" draw />
              <Label>I · alone</Label>
              {stage === 0 ? (
                <>
                  <p
                    className="mt-3 max-w-[40rem] text-[15.5px] leading-[1.7]"
                    style={{ color: "var(--muted)" }}
                  >
                    {ALONE}
                  </p>
                  <div className="mt-4">
                    {POSITIONS.map((p) => (
                      <Question
                        key={p.id}
                        p={p}
                        value={a[p.id]}
                        onPick={(x) => setA((s) => ({ ...s, [p.id]: x }))}
                      />
                    ))}
                  </div>
                  <div className="mt-5 flex items-center gap-4">
                    <Go onClick={toCurrent} disabled={nA < POSITIONS.length}>
                      seal and go on
                    </Go>
                    <span
                      className="text-[11px] tabular-nums"
                      style={{ ...mono, color: "var(--faint)" }}
                    >
                      {nA} of {POSITIONS.length}
                    </span>
                  </div>
                </>
              ) : (
                <p
                  className="mt-3 text-[12px]"
                  style={{ ...mono, color: "var(--muted)" }}
                >
                  Twelve answered. Sealed until the keel.
                </p>
              )}
            </section>

            {/* ── II · the current ─────────────────────────────────────── */}
            {stage >= 1 && (
              <section
                ref={(el) => {
                  refs.current[1] = el;
                }}
                className={panel}
                style={{ borderRadius: 3 }}
                aria-label="II, the current"
              >
                <Sketch seed="keel-current" draw />
                <Label>II · the current</Label>
                <p
                  className="mt-3 max-w-[40rem] text-[15.5px] leading-[1.7]"
                  style={{ color: "var(--muted)" }}
                >
                  {CURRENT}
                </p>
                <div className="mt-5 flex max-w-[36rem] flex-col gap-3">
                  {feed.map((f, i) =>
                    f.kind === "post" ? (
                      <article key={i} className="kl-post">
                        <p
                          className="text-[10.5px]"
                          style={{ ...mono, color: "var(--faint)" }}
                        >
                          <b style={{ color: "var(--muted)", fontWeight: 500 }}>
                            {f.k}
                          </b>{" "}
                          · {f.m}
                        </p>
                        <p
                          className="mt-1 text-[17px] leading-[1.35]"
                          style={{ color: "var(--ink)" }}
                        >
                          {f.t}
                        </p>
                      </article>
                    ) : (
                      <article key={f.id} className="kl-post">
                        <p
                          className="text-[10.5px]"
                          style={{ ...mono, color: "var(--faint)" }}
                        >
                          <b style={{ color: "var(--muted)", fontWeight: 500 }}>
                            Poll
                          </b>{" "}
                          ·{" "}
                          {crowds[f.id]
                            ? `${crowds[f.id].votes.toLocaleString("en-GB")} votes · most under 30`
                            : "no votes yet"}
                        </p>
                        <div
                          className="meta mt-2"
                          style={{ color: "var(--faint)" }}
                        >
                          {BY[f.id].topic}
                        </div>
                        <p
                          className="mt-1 text-[17px] leading-[1.4]"
                          style={{ color: "var(--ink)" }}
                        >
                          {BY[f.id].text}
                        </p>
                        {crowds[f.id] && <Poll c={crowds[f.id]} p={BY[f.id]} />}
                        <div className="mt-2">
                          <Scale
                            p={BY[f.id]}
                            value={b[f.id]}
                            disabled={stage > 1}
                            onPick={(x) => setB((s) => ({ ...s, [f.id]: x }))}
                          />
                        </div>
                      </article>
                    ),
                  )}
                </div>
                {stage === 1 && (
                  <div className="mt-5 flex items-center gap-4">
                    <Go
                      onClick={() => setStage(2)}
                      disabled={nB < POSITIONS.length}
                    >
                      go on to the keel
                    </Go>
                    <span
                      className="text-[11px] tabular-nums"
                      style={{ ...mono, color: "var(--faint)" }}
                    >
                      {nB} of {POSITIONS.length}
                    </span>
                  </div>
                )}
              </section>
            )}

            {/* ── III · the keel ───────────────────────────────────────── */}
            {stage >= 2 && summary && (
              <section
                ref={(el) => {
                  refs.current[2] = el;
                }}
                className={panel}
                style={{ borderRadius: 3 }}
                aria-label="III, the keel"
              >
                <Sketch seed="keel-keel" draw />
                <Label>III · the keel</Label>
                <div
                  className="mt-4 max-w-[42rem] p-4"
                  style={{ border: "1px dashed var(--rule)", borderRadius: 3 }}
                >
                  <div className="meta" style={{ color: "var(--faint)" }}>
                    what was arranged
                  </div>
                  <p
                    className="mt-2 text-[14.5px] leading-[1.65]"
                    style={{ color: "var(--ink)" }}
                  >
                    {ARRANGED}
                  </p>
                </div>

                <div
                  className="mt-6 grid gap-0 sm:grid-cols-3"
                  style={{ borderTop: "1px solid var(--ink)" }}
                >
                  {[
                    {
                      k: "noise",
                      v: fmt(summary.noise),
                      c: "var(--ink)",
                      t: `points your answers moved, on average, on the ${summary.without} questions nobody voted on.`,
                    },
                    {
                      k: "pull",
                      v: signed(summary.pull),
                      c: "var(--keel-current)",
                      t: `points they moved toward the crowd, on average, on the ${summary.withCrowd} that had one.`,
                    },
                    {
                      k: "held in the current",
                      v: `${summary.held} of ${summary.withCrowd}`,
                      c: "var(--keel-held)",
                      t: `${summary.carried} carried, ${summary.pushed} pushed back.`,
                    },
                  ].map((f, i) => (
                    <div
                      key={f.k}
                      className="py-4 sm:px-4"
                      style={
                        i ? { borderLeft: "1px solid var(--rule)" } : undefined
                      }
                    >
                      <div className="meta" style={{ color: "var(--faint)" }}>
                        {f.k}
                      </div>
                      <div
                        className="display mt-1 text-[40px] leading-none tabular-nums"
                        style={{ color: f.c }}
                      >
                        {f.v}
                      </div>
                      <p
                        className="mt-2 text-[12.5px] leading-[1.5]"
                        style={{ color: "var(--muted)" }}
                      >
                        {f.t}
                      </p>
                    </div>
                  ))}
                </div>

                <p
                  className="display mt-5 max-w-[40rem] pl-4 text-[22px] leading-[1.3] sm:text-[24px]"
                  style={{
                    color: "var(--ink)",
                    borderLeft: "2px solid var(--ink)",
                  }}
                >
                  {reading(summary)}
                </p>

                <div
                  className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11px]"
                  style={{ ...mono, color: "var(--muted)" }}
                  aria-hidden
                >
                  <span className="flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 14 14">
                      <circle
                        cx="7"
                        cy="7"
                        r="5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                    </svg>
                    alone
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 14 14">
                      <circle cx="7" cy="7" r="5" fill="currentColor" />
                    </svg>
                    in the current
                  </span>
                  <span
                    className="flex items-center gap-1.5"
                    style={{ color: "var(--keel-current)" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14">
                      <line
                        x1="7"
                        y1="1"
                        x2="7"
                        y2="13"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    where the crowd stood
                  </span>
                  <span
                    className="flex items-center gap-1.5"
                    style={{ color: "var(--keel-held)" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14">
                      <circle
                        cx="7"
                        cy="7"
                        r="6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                    held against it
                  </span>
                </div>

                {[
                  { name: "with a crowd", list: withCrowd },
                  { name: "without one, the control", list: without },
                ].map((g) => (
                  <div key={g.name} className="mt-6">
                    <div
                      className="meta flex justify-between pb-2"
                      style={{
                        color: "var(--faint)",
                        borderBottom: "1px solid var(--rule)",
                      }}
                    >
                      <span>{g.name}</span>
                      <span>{g.list.length} positions</span>
                    </div>
                    {g.list.map((p) => (
                      <div key={p.id} className="kl-row">
                        <p
                          className="kl-row-q text-[14.5px] leading-[1.35]"
                          style={{ color: "var(--ink)" }}
                        >
                          <span
                            className="meta block"
                            style={{ color: "var(--faint)" }}
                          >
                            {p.topic}
                          </span>
                          {p.text}
                        </p>
                        <Track
                          a={a[p.id]}
                          b={b[p.id]}
                          c={crowds[p.id]}
                          keel={!!crowds[p.id] && v(p.id) === "held"}
                        />
                        <Mark v={v(p.id)} crowd={!!crowds[p.id]} />
                      </div>
                    ))}
                  </div>
                ))}

                {AFTER.map((t, i) => (
                  <p
                    key={i}
                    className="mt-5 max-w-[42rem] text-[15px] leading-[1.7]"
                    style={{ color: "var(--muted)" }}
                  >
                    {t}
                  </p>
                ))}
                {stage === 2 && (
                  <div className="mt-5">
                    <Go onClick={() => setStage(3)}>go on to the rooms</Go>
                  </div>
                )}
              </section>
            )}

            {/* ── IV · the rooms ───────────────────────────────────────── */}
            {stage >= 3 && (
              <section
                ref={(el) => {
                  refs.current[3] = el;
                }}
                className={panel}
                style={{ borderRadius: 3 }}
                aria-label="IV, the rooms"
              >
                <Sketch seed="keel-rooms" draw />
                <Label>IV · the rooms</Label>
                <p
                  className="mt-3 max-w-[42rem] text-[15.5px] leading-[1.7]"
                  style={{ color: "var(--muted)" }}
                >
                  {ROOMS_LEAD}
                </p>
                <ul
                  className="mt-4"
                  style={{ borderTop: "1px solid var(--rule)" }}
                >
                  {POSITIONS.map((p) => {
                    const on = picks.includes(p.id);
                    const locked =
                      stage > 3 || roomsShown || (!on && picks.length >= 3);
                    return (
                      <li key={p.id}>
                        <label
                          className="kl-pick"
                          data-on={on || undefined}
                          data-locked={locked || undefined}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={locked}
                            onChange={() =>
                              setPicks((s) =>
                                on ? s.filter((x) => x !== p.id) : [...s, p.id],
                              )
                            }
                          />
                          <span className="text-[15px] leading-[1.4]">
                            {p.text}
                          </span>
                          <Mark v={v(p.id)} crowd={!!crowds[p.id]} />
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <p
                  className="mt-2 text-[11px] tabular-nums"
                  style={{ ...mono, color: "var(--faint)" }}
                >
                  {picks.length} of 3
                </p>

                {picks.map((id) => (
                  <fieldset
                    key={id}
                    className="mt-6 min-w-0"
                    disabled={roomsShown}
                  >
                    <legend
                      className="text-[17px] leading-[1.4]"
                      style={{ color: "var(--ink)" }}
                    >
                      {BY[id].text}
                    </legend>
                    {ROOMS.map(([rk, rn]) => (
                      <div
                        key={rk}
                        className="kl-room"
                        role="radiogroup"
                        aria-label={rn}
                      >
                        <span
                          className="text-[14.5px]"
                          style={{ color: "var(--muted)" }}
                        >
                          In {rn}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {DOINGS.map(([dk, dn]) => {
                            const on = rooms[id]?.[rk] === dk;
                            return (
                              <button
                                key={dk}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                disabled={roomsShown}
                                onClick={() =>
                                  setRooms((s) => ({
                                    ...s,
                                    [id]: { ...s[id], [rk]: dk },
                                  }))
                                }
                                className="chip px-2.5 py-1 text-[10.5px] tracking-[0.08em]"
                                style={{
                                  ...mono,
                                  color: on ? "var(--bg)" : "var(--muted)",
                                  background: on ? "var(--ink)" : undefined,
                                  borderColor: on ? "var(--ink)" : undefined,
                                }}
                              >
                                {dn}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </fieldset>
                ))}

                {!roomsShown && picks.length > 0 && (
                  <div className="mt-5">
                    <Go
                      onClick={() => setRoomsShown(true)}
                      disabled={!roomsDone}
                    >
                      see the rooms
                    </Go>
                  </div>
                )}

                {roomsShown && roomRead && (
                  <>
                    <div className="scroll-thin mt-6 overflow-x-auto">
                      <table className="kl-rooms w-full min-w-[26rem] text-[14px]">
                        <thead>
                          <tr>
                            <th className="meta">position</th>
                            {ROOMS.map(([rk, rn]) => (
                              <th key={rk} className="meta">
                                {rn}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {picks.map((id) => (
                            <tr key={id}>
                              <td style={{ color: "var(--ink)" }}>
                                {BY[id].text}
                              </td>
                              {ROOMS.map(([rk]) => {
                                const d = rooms[id]?.[rk] as Doing;
                                return (
                                  <td key={rk}>
                                    <span
                                      className="kl-sq"
                                      data-d={d}
                                      role="img"
                                      aria-label={
                                        DOINGS.find(([x]) => x === d)?.[1]
                                      }
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div
                      className="mt-3 flex flex-wrap gap-4 text-[11px]"
                      style={{ ...mono, color: "var(--muted)" }}
                      aria-hidden
                    >
                      {DOINGS.map(([dk, dn]) => (
                        <span key={dk} className="flex items-center gap-1.5">
                          <span className="kl-sq" data-d={dk} /> {dn}
                        </span>
                      ))}
                    </div>
                    <p
                      className="display mt-5 max-w-[40rem] pl-4 text-[21px] leading-[1.3] sm:text-[23px]"
                      style={{
                        color: "var(--ink)",
                        borderLeft: "2px solid var(--ink)",
                      }}
                    >
                      {roomRead.text}
                    </p>
                    <p
                      className="mt-5 max-w-[42rem] text-[15px] leading-[1.7]"
                      style={{ color: "var(--muted)" }}
                    >
                      {COLLAPSE}
                    </p>
                    {stage === 3 && (
                      <div className="mt-5">
                        <Go onClick={() => setStage(4)}>
                          go on to the articles
                        </Go>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}

            {/* ── V · articles ─────────────────────────────────────────── */}
            {stage >= 4 && (
              <section
                ref={(el) => {
                  refs.current[4] = el;
                }}
                className={panel}
                style={{ borderRadius: 3 }}
                aria-label="V, articles"
              >
                <Sketch seed="keel-articles" draw />
                <Label>V · articles</Label>
                <p
                  className="mt-3 max-w-[42rem] text-[15.5px] leading-[1.7]"
                  style={{ color: "var(--muted)" }}
                >
                  {ARTICLES_LEAD}
                </p>
                {picks.map((id) => {
                  const art = arts[id] ?? { bel: "", src: null, chg: "" };
                  const put = (x: Partial<Art>) =>
                    setArts((s) => ({
                      ...s,
                      [id]: { ...art, ...s[id], ...x },
                    }));
                  return (
                    <div
                      key={id}
                      className="mt-6 max-w-[40rem] pt-4"
                      style={{ borderTop: "1px solid var(--rule)" }}
                    >
                      <p
                        className="text-[14px] leading-[1.5]"
                        style={{ color: "var(--muted)" }}
                      >
                        From{" "}
                        <em style={{ color: "var(--ink)" }}>{BY[id].text}</em>{" "}
                        You answered {a[id]} alone and {b[id]} in the feed,{" "}
                        {crowds[id]
                          ? "with a crowd against you"
                          : "with no crowd shown"}
                        : {v(id)}.
                      </p>
                      <label className="mt-4 block">
                        <span
                          className="meta"
                          style={{ color: "var(--faint)" }}
                        >
                          I believe
                        </span>
                        <textarea
                          className="kl-in hand mt-1.5"
                          rows={2}
                          value={art.bel}
                          disabled={!!set}
                          placeholder="In your own words, not the statement's."
                          onFocus={() =>
                            putOnDesk({ kind: "keel", id, label: BY[id].text })
                          }
                          onChange={(e) => put({ bel: e.target.value })}
                        />
                      </label>
                      <div className="mt-3">
                        <span
                          className="meta"
                          style={{ color: "var(--faint)" }}
                        >
                          I got here through
                        </span>
                        <div
                          className="mt-1.5 flex flex-wrap gap-1.5"
                          role="radiogroup"
                          aria-label="I got here through"
                        >
                          {SOURCES_OF.map(([sk, sn]) => {
                            const on = art.src === sk;
                            return (
                              <button
                                key={sk}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                disabled={!!set}
                                onClick={() => put({ src: sk })}
                                className="chip px-2.5 py-1 text-[10.5px] tracking-[0.06em]"
                                style={{
                                  ...mono,
                                  color: on ? "var(--bg)" : "var(--muted)",
                                  background: on ? "var(--ink)" : undefined,
                                  borderColor: on ? "var(--ink)" : undefined,
                                }}
                              >
                                {sn}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <label className="mt-4 block">
                        <span
                          className="meta"
                          style={{ color: "var(--faint)" }}
                        >
                          I&apos;d change my mind if
                        </span>
                        <textarea
                          className="kl-in hand mt-1.5"
                          rows={2}
                          value={art.chg}
                          disabled={!!set}
                          placeholder="What evidence, not whose opinion."
                          onChange={(e) => put({ chg: e.target.value })}
                        />
                      </label>
                    </div>
                  );
                })}
                {!set && (
                  <div className="mt-6">
                    <Go
                      disabled={!artsDone}
                      onClick={() =>
                        setSet({
                          date: new Date().toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          }),
                        })
                      }
                    >
                      set them down
                    </Go>
                  </div>
                )}

                {set && (
                  <>
                    <div className="kl-card mt-8 max-w-[42rem]">
                      <div className="meta" style={{ color: "var(--faint)" }}>
                        articles · {set.date}
                      </div>
                      <h2
                        className="display mt-2 text-[30px] leading-[1.1]"
                        style={{ color: "var(--ink)" }}
                      >
                        What I&apos;d still say
                      </h2>
                      <ol className="mt-4">
                        {articles.map((art, i) => {
                          const m = mover(art.chg);
                          return (
                            <li key={i} className="kl-art">
                              <span
                                className="text-[12px]"
                                style={{ ...mono, color: "var(--keel-held)" }}
                              >
                                {["I", "II", "III"][i]}
                              </span>
                              <div>
                                <p
                                  className="display text-[21px] leading-[1.35]"
                                  style={{ color: "var(--ink)" }}
                                >
                                  I believe {belief(art.bel)}
                                </p>
                                <p
                                  className="mt-1.5 text-[14.5px] leading-[1.5]"
                                  style={{ color: "var(--muted)" }}
                                >
                                  {how(art.src)}
                                </p>
                                <p
                                  className="mt-0.5 text-[14.5px] leading-[1.5]"
                                  style={{ color: "var(--muted)" }}
                                >
                                  {m ? (
                                    <>
                                      I&apos;d change my mind if{" "}
                                      <em style={{ color: "var(--ink)" }}>
                                        {m}
                                      </em>
                                    </>
                                  ) : (
                                    "Nothing named would change my mind."
                                  )}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                      <p
                        className="mt-3 pt-3 text-[11px]"
                        style={{
                          ...mono,
                          color: "var(--muted)",
                          borderTop: "1px solid var(--rule)",
                        }}
                      >
                        {foot}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Go onClick={copy}>{copied ?? "copy the articles"}</Go>
                      <button
                        type="button"
                        onClick={again}
                        className="chip px-3 py-2 text-[10.5px] tracking-[0.14em] uppercase"
                        style={{ ...mono, color: "var(--muted)" }}
                      >
                        run it again
                      </button>
                    </div>
                    <div className="mt-6 flex max-w-[42rem] flex-col gap-3">
                      {articleNotes(articles).map((n) => (
                        <p
                          key={n}
                          className="pl-4 text-[15px] leading-[1.65]"
                          style={{
                            color: "var(--ink)",
                            borderLeft: "2px solid var(--keel-held)",
                          }}
                        >
                          {n}
                        </p>
                      ))}
                    </div>
                    <p
                      className="hand mt-8 max-w-[38rem] text-[20px] leading-[1.35]"
                      style={{ color: "var(--ink)" }}
                    >
                      {CODA}
                    </p>
                  </>
                )}
              </section>
            )}
          </div>

          {/* ── the aside ─────────────────────────────────────────────── */}
          <aside className="flex min-w-0 flex-col gap-5">
            <section
              className="panel sketched rise relative p-4 sm:p-5"
              style={{ borderRadius: 3, animationDelay: "180ms" }}
              aria-label="The five stations"
            >
              <Sketch seed="keel-stations" draw />
              <Label>the sitting</Label>
              <ol className="mt-3">
                {STATIONS.map((s, i) => (
                  <li
                    key={s.n}
                    className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2 py-2.5"
                    style={{
                      borderTop: "1px solid var(--rule)",
                      opacity: i > stage ? 0.55 : 1,
                    }}
                  >
                    <span
                      className="text-[11px]"
                      style={{
                        ...mono,
                        color: i === stage ? "var(--accent)" : "var(--faint)",
                      }}
                    >
                      {s.n}
                    </span>
                    <span
                      className="text-[13.5px] leading-[1.45]"
                      style={{ color: "var(--ink)" }}
                    >
                      <b style={{ fontWeight: 500 }}>{s.name}</b>{" "}
                      <span style={{ color: "var(--muted)" }}>{s.what}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p
                className="mt-3 text-[12px] leading-[1.55]"
                style={{ color: "var(--faint)" }}
              >
                Some of what you see in the current is arranged, and the keel
                says exactly how. Nothing is kept.
              </p>
            </section>

            <section
              className="panel sketched rise relative p-4 sm:p-5"
              style={{ borderRadius: 3, animationDelay: "240ms" }}
              aria-label="A sitting that never happened"
            >
              <Sketch seed="keel-specimen" draw />
              <Label>a sitting that never happened</Label>
              <div className="mt-3">
                {SPECIMEN.map(([topic, sa, sb, m], i) => {
                  const c = m === null ? undefined : specimenCrowd(m);
                  const sv: Verdict = c
                    ? (sb - sa) * Math.sign(m! - sa) > 0
                      ? "carried"
                      : (sb - sa) * Math.sign(m! - sa) < 0
                        ? "pushed back"
                        : "held"
                    : sa === sb
                      ? "held"
                      : "wobbled";
                  return (
                    <div key={i} className="kl-spec">
                      <span
                        className="text-[10px]"
                        style={{ ...mono, color: "var(--muted)" }}
                      >
                        {topic}
                      </span>
                      <Track a={sa} b={sb} c={c} keel={!!c && sa === sb} />
                      <Mark v={sv} crowd={!!c} short />
                    </div>
                  );
                })}
              </div>
              <p
                className="mt-3 text-[12px] leading-[1.55]"
                style={{ color: "var(--faint)" }}
              >
                Made up, no statements. Hollow is alone, filled is in the feed,
                the tick is where the crowd stood, and a ring marks a position
                that held against it.
              </p>
            </section>

            {stage >= 2 && (
              <section
                className="panel sketched rise relative p-4 sm:p-5"
                style={{ borderRadius: 3 }}
                aria-label="What it leaves to you"
              >
                <Sketch seed="keel-leaves" draw />
                <Label>what it leaves to you</Label>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {LIMITS.map((l) => (
                    <li
                      key={l}
                      className="text-[12.5px] leading-[1.55]"
                      style={{ color: "var(--muted)" }}
                    >
                      {l}
                    </li>
                  ))}
                </ul>
                <p
                  className="mt-4 text-[12px] leading-[1.55]"
                  style={{ color: "var(--faint)" }}
                >
                  {CLARITY}
                </p>
              </section>
            )}

            <section
              className="panel sketched rise relative p-4 sm:p-5"
              style={{ borderRadius: 3, animationDelay: "300ms" }}
              aria-label="Sources"
            >
              <Sketch seed="keel-sources" draw />
              <Label>sources</Label>
              <ul className="mt-3 flex flex-col gap-2.5">
                {SOURCES.map((s) => (
                  <li
                    key={s.cite}
                    className="text-[12px] leading-[1.5]"
                    style={{ color: "var(--muted)" }}
                  >
                    {s.href ? (
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noreferrer"
                        className="kl-cite"
                      >
                        {s.cite}
                      </a>
                    ) : (
                      s.cite
                    )}
                  </li>
                ))}
              </ul>
              <p
                className="mt-3 text-[12px] leading-[1.55]"
                style={{ color: "var(--faint)" }}
              >
                From the Center&apos;s instrument Stop Flowing,
                github.com/pvcomms/stop-flowing.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
