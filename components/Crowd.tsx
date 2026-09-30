"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ASKED,
  BITES,
  CLASSIC,
  CLASSIC_WORDS,
  LEAVES,
  NUMBERS_NOTE,
  QUESTION,
  SITUATIONS,
  STEPS,
  TYPICAL,
} from "@/content/crowd";
import {
  N,
  chance,
  counts,
  dialOfRare,
  fmt,
  guessReading,
  leans,
  order,
  pct,
  rareOfDial,
  story,
  type Crowd as C,
  type Words,
} from "@/lib/crowd";
import { putOnDesk } from "./desk";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

const mono = { fontFamily: "var(--font-mono)" } as const;
const chip = "chip px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";
const COLS = 40;
const SEATS = order(7);

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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="meta" style={{ color: "var(--accent)" }}>
      {children}
    </div>
  );
}

/**
 * A thousand seats, forty to a row. The first `so` seats in the shuffled order
 * have the thing; of those the first `caught` are flagged; the next `alarms`
 * seats are flagged without it. `stage` says how much of that is shown yet.
 */
function Seats({
  c,
  stage,
  label,
}: {
  c: C;
  stage: 0 | 1 | 2 | 3;
  label: string;
}) {
  const k = counts(c);
  const cls = useMemo(() => {
    const out = new Array<string>(N).fill("");
    for (let i = 0; i < k.so; i++)
      out[SEATS[i]] = i < k.caught ? "cr-so cr-flag" : "cr-so";
    for (let i = 0; i < k.alarms; i++) out[SEATS[k.so + i]] = "cr-flag";
    return out;
  }, [k.so, k.caught, k.alarms]);
  return (
    <svg
      viewBox={`0 0 ${COLS * 10} ${(N / COLS) * 10}`}
      className="cr-seats block h-auto w-full"
      data-stage={stage}
      role="img"
      aria-label={label}
    >
      {cls.map((c, i) => (
        <circle
          key={i}
          cx={5 + (i % COLS) * 10}
          cy={5 + Math.floor(i / COLS) * 10}
          r={3.3}
          className={c || undefined}
        />
      ))}
    </svg>
  );
}

function Legend({ words }: { words: Words }) {
  return (
    <div
      className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px]"
      style={{ ...mono, color: "var(--muted)" }}
    >
      <span className="inline-flex items-center gap-2">
        <i className="cr-key" /> {words.people}
      </span>
      <span className="inline-flex items-center gap-2">
        <i className="cr-key cr-key-so" /> {words.has[1]}
      </span>
      <span className="inline-flex items-center gap-2">
        <i className="cr-key cr-key-flag" /> flagged by {words.test}
      </span>
    </div>
  );
}

function Dial({
  id,
  name,
  value,
  min,
  max,
  onChange,
  said,
  hint,
}: {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  said: string;
  hint: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3">
        <span className="text-[13.5px]" style={{ color: "var(--ink)" }}>
          {name}
        </span>
        <span
          className="text-[13px] tabular-nums"
          style={{ ...mono, color: "var(--ink)" }}
        >
          {said}
        </span>
      </label>
      <input
        id={id}
        type="range"
        className="a-dial mt-1"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        aria-label={name}
      />
      <p
        className="mt-0.5 text-[12.5px] leading-[1.5]"
        style={{ color: "var(--faint)" }}
      >
        {hint}
      </p>
    </div>
  );
}

/**
 * The crowd: base rate neglect walked through in a thousand people. First the
 * reader's own number, before any arithmetic; then the crowd a step at a time;
 * then three dials and a handful of situations; then where the same shape
 * turns up. Nothing is kept and no model is asked. The readings are counts.
 */
export default function Crowd() {
  const [theme, setTheme] = useTheme();
  const [guess, setGuess] = useState(50);
  const [said, setSaid] = useState<number | null>(null);
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);
  const [rare, setRare] = useState(dialOfRare(CLASSIC.rare));
  const [catches, setCatches] = useState(Math.round(CLASSIC.catches * 100));
  const [flags, setFlags] = useState(Math.round(CLASSIC.flags * 1000));
  const [situation, setSituation] = useState<string | null>(SITUATIONS[0].slug);

  const c: C = useMemo(
    () => ({
      rare: rareOfDial(rare),
      catches: catches / 100,
      flags: flags / 1000,
    }),
    [rare, catches, flags],
  );
  const words =
    SITUATIONS.find((s) => s.slug === situation)?.words ?? CLASSIC_WORDS;
  const k = counts(c);
  const p = chance(c);
  const sit = SITUATIONS.find((s) => s.slug === situation) ?? null;

  useEffect(() => {
    putOnDesk(sit ? { kind: "crowd", id: sit.slug, label: sit.name } : null);
    return () => putOnDesk(null);
  }, [sit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight")
        setStage((s) => (s < 3 ? ((s + 1) as 0 | 1 | 2 | 3) : s));
      if (e.key === "ArrowLeft")
        setStage((s) => (s > 0 ? ((s - 1) as 0 | 1 | 2 | 3) : s));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const set = (s: (typeof SITUATIONS)[number]) => {
    setRare(dialOfRare(s.crowd.rare));
    setCatches(Math.round(s.crowd.catches * 100));
    setFlags(Math.round(s.crowd.flags * 1000));
    setSituation(s.slug);
  };
  const turn = (f: (v: number) => void) => (v: number) => {
    f(v);
    setSituation(null);
  };

  return (
    <main className="cr scroll-thin relative h-dvh w-full overflow-y-auto">
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
                crowd
              </div>
              <p
                className="hand mt-1 max-w-[27rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                A positive result, set against how rare the thing is. Not in
                percentages: in a crowd of a thousand, one dot each.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/crowd" />
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

        {/* ── the question, and the reader's number ────────────────────── */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <section
            className="panel sketched rise relative p-5 sm:p-8"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The question"
          >
            <Sketch seed="crowd-question" draw />
            <Label>the question</Label>
            {QUESTION.lead.map((t, i) => (
              <p
                key={i}
                className={
                  i === 0
                    ? "display mt-4 max-w-[38rem] text-[25px] leading-[1.22] sm:text-[30px]"
                    : "mt-4 max-w-[40rem] text-[15.5px] leading-[1.7]"
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
              {QUESTION.ask}
            </p>
          </section>

          <section
            className="panel sketched rise relative p-4 sm:p-5"
            style={{ borderRadius: 3, animationDelay: "120ms" }}
            aria-label="Your number"
          >
            <Sketch seed="crowd-guess" draw />
            <Label>your number</Label>
            <div className="mt-3 flex items-baseline justify-between gap-3">
              <span className="text-[12.5px]" style={{ color: "var(--muted)" }}>
                {QUESTION.before}
              </span>
              <span
                className="display text-[44px] leading-none tabular-nums"
                style={{ color: "var(--ink)" }}
              >
                {said ?? guess}
                <span className="text-[16px]" style={{ color: "var(--faint)" }}>
                  {" "}
                  in 100
                </span>
              </span>
            </div>
            <input
              id="cr-guess"
              type="range"
              className="a-dial mt-2"
              min={0}
              max={100}
              step={1}
              value={guess}
              disabled={said !== null}
              onChange={(e) => setGuess(+e.target.value)}
              aria-label="Your number, in 100"
            />
            <div className="mt-3">
              <Chip
                onClick={() => setSaid(guess)}
                disabled={said !== null}
                accent={said === null}
                on={said !== null}
              >
                {said === null ? "say it" : "said"}
              </Chip>
            </div>
            {said !== null && (
              <div
                className="cr-after mt-5"
                style={{ borderTop: "1px solid var(--rule)" }}
              >
                <p
                  className="display mt-4 text-[26px] leading-[1.1]"
                  style={{ color: "var(--ink)" }}
                >
                  The crowd says {pct(chance(CLASSIC))} in 100.
                </p>
                <p
                  className="mt-3 text-[13.5px] leading-[1.6]"
                  style={{ color: "var(--muted)" }}
                >
                  {guessReading(said, CLASSIC, ASKED)}
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {[
                    { name: "you", v: said, tone: "var(--ink)" },
                    { name: "most asked", v: TYPICAL, tone: "var(--faint)" },
                    {
                      name: "the crowd",
                      v: Math.round(chance(CLASSIC) * 100),
                      tone: "var(--crowd-so)",
                    },
                  ].map((b) => (
                    <div
                      key={b.name}
                      className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-3 text-[10.5px]"
                      style={mono}
                    >
                      <span
                        className="uppercase tracking-[0.14em]"
                        style={{ color: "var(--muted)" }}
                      >
                        {b.name}
                      </span>
                      <span className="cr-bar">
                        <span
                          style={{ width: `${b.v}%`, background: b.tone }}
                        />
                      </span>
                      <span
                        className="text-right tabular-nums"
                        style={{ color: "var(--ink)" }}
                      >
                        {b.v}
                      </span>
                    </div>
                  ))}
                </div>
                <p
                  className="mt-4 text-[12px] leading-[1.5]"
                  style={{ color: "var(--faint)" }}
                >
                  The next panel is why the crowd's count is what it is.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* ── the crowd, a step at a time ──────────────────────────────── */}
        <section
          className="panel sketched rise relative mt-6 p-5 sm:p-8"
          style={{ borderRadius: 3, animationDelay: "180ms" }}
          aria-label="The crowd"
        >
          <Sketch seed="crowd-seats" draw />
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <Label>the crowd, a step at a time</Label>
            <span
              className="text-[10.5px]"
              style={{ ...mono, color: "var(--faint)" }}
            >
              → and ← walk it
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {STEPS.map((s, i) => (
              <Chip
                key={s.name}
                on={stage === i}
                onClick={() => setStage(i as 0 | 1 | 2 | 3)}
              >
                <span
                  className="mr-2 tabular-nums"
                  style={{ color: "var(--faint)" }}
                >
                  {i + 1}
                </span>
                {s.name}
              </Chip>
            ))}
          </div>
          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <Seats
                c={CLASSIC}
                stage={stage}
                label="A thousand people, forty to a row"
              />
              <Legend words={CLASSIC_WORDS} />
            </div>
            <div className="flex flex-col justify-between gap-4">
              <p
                className="text-[15.5px] leading-[1.65]"
                style={{ color: "var(--ink)" }}
              >
                {STEPS[stage].text}
              </p>
              <div className="flex gap-2">
                <Chip
                  onClick={() =>
                    setStage((s) => (s > 0 ? ((s - 1) as 0 | 1 | 2 | 3) : s))
                  }
                  disabled={stage === 0}
                >
                  back
                </Chip>
                <Chip
                  onClick={() =>
                    setStage((s) => (s < 3 ? ((s + 1) as 0 | 1 | 2 | 3) : 0))
                  }
                  accent={stage < 3}
                >
                  {stage < 3 ? "next" : "again"}
                </Chip>
              </div>
            </div>
          </div>
        </section>

        {/* ── the dials ────────────────────────────────────────────────── */}
        <section
          className="panel sketched rise relative mt-6 p-5 sm:p-8"
          style={{ borderRadius: 3, animationDelay: "240ms" }}
          aria-label="The dials"
        >
          <Sketch seed="crowd-dials" draw />
          <Label>the dials</Label>
          <p
            className="mt-3 max-w-[40rem] text-[15.5px] leading-[1.7]"
            style={{ color: "var(--muted)" }}
          >
            Three things set what a positive means. One is about the test. The
            other two are about the crowd.
          </p>
          <div className="mt-6 grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
            <div className="flex flex-col gap-6">
              <Dial
                id="cr-rare"
                name="how rare the thing is"
                value={rare}
                min={0}
                max={100}
                onChange={turn(setRare)}
                said={`1 in ${fmt(c.rare)}`}
                hint="The base rate: how many in the crowd have it before anyone is tested."
              />
              <Dial
                id="cr-catches"
                name="how often it catches those who have it"
                value={catches}
                min={50}
                max={100}
                onChange={turn(setCatches)}
                said={`${catches} in 100`}
                hint="Of the people who have it, the share the test flags."
              />
              <Dial
                id="cr-flags"
                name="how often it flags those who do not"
                value={flags}
                min={0}
                max={200}
                onChange={turn(setFlags)}
                said={`${(flags / 10).toFixed(1)} in 100`}
                hint="Of the people who do not have it, the share the test flags anyway."
              />
              <div>
                <div className="meta" style={{ color: "var(--faint)" }}>
                  set it to
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SITUATIONS.map((s) => (
                    <Chip
                      key={s.slug}
                      on={situation === s.slug}
                      onClick={() => set(s)}
                    >
                      {s.name}
                    </Chip>
                  ))}
                </div>
                <p
                  className="mt-3 text-[12.5px] leading-[1.55]"
                  style={{ color: "var(--muted)" }}
                >
                  {sit ? sit.note : "Your own numbers."}
                </p>
              </div>
            </div>

            <div>
              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div>
                  <div className="meta" style={{ color: "var(--faint)" }}>
                    of the flagged, how many have it
                  </div>
                  <div
                    className="display mt-1 text-[64px] leading-none tabular-nums sm:text-[76px]"
                    style={{ color: "var(--ink)" }}
                  >
                    {pct(p)}
                    <span
                      className="text-[18px]"
                      style={{ color: "var(--faint)" }}
                    >
                      {" "}
                      in 100
                    </span>
                  </div>
                  <div className="cr-meter mt-4" aria-hidden="true">
                    <span
                      className="cr-meter-so"
                      style={{
                        width: `${k.flagged ? (k.caught / k.flagged) * 100 : 0}%`,
                      }}
                    />
                    <span
                      className="cr-meter-flag"
                      style={{
                        width: `${k.flagged ? (k.alarms / k.flagged) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div
                    className="mt-1.5 flex justify-between text-[10.5px]"
                    style={mono}
                  >
                    <span style={{ color: "var(--crowd-so)" }}>
                      {fmt(k.caught)}{" "}
                      {k.caught === 1 ? words.has[0] : words.has[1]}
                    </span>
                    <span style={{ color: "var(--crowd-flag)" }}>
                      {fmt(k.alarms)} flagged, do not
                    </span>
                  </div>
                </div>
                <div>
                  <div className="meta" style={{ color: "var(--faint)" }}>
                    in whole people
                  </div>
                  <p
                    className="mt-2 text-[14px] leading-[1.65]"
                    style={{ color: "var(--ink)" }}
                  >
                    {story(c, words)}
                  </p>
                  <div className="meta mt-4" style={{ color: "var(--faint)" }}>
                    from here
                  </div>
                  <ul
                    className="mt-1.5 flex flex-col gap-1 text-[12.5px] leading-[1.5]"
                    style={{ color: "var(--muted)" }}
                  >
                    {leans(c).map((l) => (
                      <li key={l.name} className="flex justify-between gap-3">
                        <span>{l.name}</span>
                        <span
                          className="tabular-nums"
                          style={{ ...mono, color: "var(--ink)" }}
                        >
                          {pct(l.chance)} in 100
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="mt-6">
                <Seats c={c} stage={3} label="The crowd at these dials" />
                <Legend words={words} />
              </div>
            </div>
          </div>
        </section>

        {/* ── the same shape elsewhere ─────────────────────────────────── */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <section
            className="panel sketched rise relative p-5 sm:p-8"
            style={{ borderRadius: 3, animationDelay: "300ms" }}
            aria-label="The same shape elsewhere"
          >
            <Sketch seed="crowd-bites" draw />
            <Label>the same shape elsewhere</Label>
            <dl className="mt-4 flex flex-col">
              {BITES.map((b) => (
                <div
                  key={b.where}
                  className="grid gap-1 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4"
                  style={{ borderTop: "1px solid var(--rule)" }}
                >
                  <dt className="meta pt-1" style={{ color: "var(--faint)" }}>
                    {b.where}
                  </dt>
                  <dd
                    className="text-[14px] leading-[1.65]"
                    style={{ color: "var(--ink)" }}
                  >
                    {b.how}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <aside className="flex flex-col gap-5">
            <section
              className="panel sketched rise relative p-4 sm:p-5"
              style={{ borderRadius: 3, animationDelay: "360ms" }}
              aria-label="What it leaves to you"
            >
              <Sketch seed="crowd-leaves" draw />
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
                {NUMBERS_NOTE}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
