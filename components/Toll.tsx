"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CHAIN,
  ELSEWHERE,
  LEAD,
  LEAVES,
  NUMBERS_NOTE,
  ROUNDS,
  SIGNAL,
  SOURCES,
  STUDY,
  STUDY_NOTE,
} from "@/content/toll";
import { order } from "@/lib/crowd";
import {
  DOOR,
  POT,
  ROOM,
  SO,
  WHO,
  doorReading,
  fmt,
  outcome,
  payoff,
  roomStory,
  roundReading,
  spread,
  type Move,
  type Round,
  type Rules,
} from "@/lib/toll";
import { putOnDesk } from "./desk";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

const mono = { fontFamily: "var(--font-mono)" } as const;
const chip = "chip px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";
const COLS = 20;
const SEATS = order(11, ROOM);

type Played = { round: Round; move: Move };

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
 * Ten coins in a row: the reader's on the left, the stranger's shifted right.
 * A coin clicked on the reader's side goes across with every coin to its
 * right; a coin clicked on the stranger's side comes back with every coin to
 * its left. `door` draws the door instead: nine kept, the tenth paid away.
 */
function Purse({
  give,
  onGive,
  door,
  small,
}: {
  give: number;
  onGive?: (g: number) => void;
  door?: boolean;
  small?: boolean;
}) {
  return (
    <div
      className="tl-purse"
      data-small={small ? "" : undefined}
      role={onGive ? "group" : "img"}
      aria-label={
        door
          ? `The door: ${DOOR} dollars kept, one paid, nothing sent`
          : `${POT - give} dollars kept, ${give} sent`
      }
    >
      {Array.from({ length: POT }, (_, i) => {
        const side = door
          ? i < DOOR
            ? "mine"
            : "toll"
          : i < POT - give
            ? "mine"
            : "theirs";
        const next = side === "mine" ? POT - i : POT - i - 1;
        return onGive ? (
          <button
            key={i}
            className="tl-coin"
            data-side={side}
            onClick={() => onGive(next)}
            aria-label={`Send ${next} of the ten`}
          />
        ) : (
          <span key={i} className="tl-coin" data-side={side} />
        );
      })}
    </div>
  );
}

function Split({ kept, sent }: { kept: number; sent: number }) {
  return (
    <div
      className="flex items-baseline gap-5 text-[11px]"
      style={{ ...mono, color: "var(--muted)" }}
    >
      <span>
        you{" "}
        <b
          className="display text-[28px] font-normal tabular-nums"
          style={{ color: "var(--toll-coin)" }}
        >
          ${kept}
        </b>
      </span>
      <span>
        them{" "}
        <b
          className="display text-[28px] font-normal tabular-nums"
          style={{ color: "var(--toll-mark)" }}
        >
          ${sent}
        </b>
      </span>
    </div>
  );
}

/** One row of the receipt: ten cells, kept, sent, or the dollar the door took. */
function Cells({ move }: { move: Move }) {
  const p = payoff(move);
  return (
    <span className="tl-cells" aria-hidden="true">
      {Array.from({ length: POT }, (_, i) => (
        <span
          key={i}
          data-side={
            move.door
              ? i < DOOR
                ? "mine"
                : "toll"
              : i < p.kept
                ? "mine"
                : "theirs"
          }
        />
      ))}
    </span>
  );
}

/** The room: a hundred people, the claim so for the first forty seats in a shuffled order. */
function Room({ rules, label }: { rules: Rules; label: string }) {
  const o = outcome(rules);
  const cls = useMemo(() => {
    const out = new Array<string>(ROOM).fill("");
    for (let i = 0; i < ROOM; i++) {
      const so = i < SO;
      const does = so ? o.so > 0 : o.not > 0;
      out[SEATS[i]] = [so ? "tl-so" : "", does ? "tl-does" : ""]
        .filter(Boolean)
        .join(" ");
    }
    return out;
  }, [o.so, o.not]);
  return (
    <svg
      viewBox={`0 0 ${COLS * 10} ${(ROOM / COLS) * 10}`}
      className="tl-room block h-auto w-full"
      role="img"
      aria-label={label}
    >
      {cls.map((c, i) => (
        <circle
          key={i}
          cx={5 + (i % COLS) * 10}
          cy={5 + Math.floor(i / COLS) * 10}
          r={3.2}
          className={c || undefined}
        />
      ))}
    </svg>
  );
}

function Dial({
  id,
  name,
  value,
  onChange,
  hint,
}: {
  id: string;
  name: string;
  value: number;
  onChange: (v: number) => void;
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
          ${value}
        </span>
      </label>
      <input
        id={id}
        type="range"
        className="a-dial mt-1"
        min={0}
        max={100}
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
 * The toll: the dictator game four times — seen, offered a quiet door, posted
 * to a feed, and with no one to know — and the reader's four rounds set side by
 * side on a receipt, beside what the study found. Then a room of a hundred and
 * a claim, and the rules of the room walked from a word being enough to a
 * signal that has to keep getting dearer. Nothing is kept and no model is
 * asked. The readings are dollars and counts.
 */
export default function Toll() {
  const [theme, setTheme] = useTheme();
  const [stage, setStage] = useState(0);
  const [give, setGive] = useState(0);
  const [chose, setChose] = useState(0);
  const [played, setPlayed] = useState<Played[]>([]);
  const [step, setStep] = useState<number | null>(0);
  const [rules, setRules] = useState<Rules>(CHAIN[0].rules);

  const round = ROUNDS[stage];
  const done = stage >= ROUNDS.length;
  const o = outcome(rules);

  useEffect(() => {
    const s = step === null ? null : CHAIN[step];
    putOnDesk(
      s
        ? { kind: "toll", id: s.name.replace(/\s+/g, "-"), label: s.name }
        : null,
    );
    return () => putOnDesk(null);
  }, [step]);

  const walk = (to: number) => {
    const i = Math.max(0, Math.min(CHAIN.length - 1, to));
    setStep(i);
    setRules(CHAIN[i].rules);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" || t.tagName === "TEXTAREA")
      )
        return;
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      setStep((s) => {
        const i = Math.max(
          0,
          Math.min(
            CHAIN.length - 1,
            (s ?? 0) + (e.key === "ArrowRight" ? 1 : -1),
          ),
        );
        setRules(CHAIN[i].rules);
        return i;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const play = (m: Move) => {
    setPlayed((p) => [...p, { round: round.round, move: m }]);
    // Each later round starts where the reader left the envelope: give stays.
    if (round.round === "envelope") setChose(give);
    setStage((s) => s + 1);
  };
  const again = () => {
    setPlayed([]);
    setStage(0);
    setGive(0);
    setChose(0);
  };
  const turn = (k: keyof Rules) => (v: number) => {
    setRules((r) => ({ ...r, [k]: v }));
    setStep(null);
  };

  const split = payoff({ door: false, give });

  return (
    <main className="tl scroll-thin relative h-dvh w-full overflow-y-auto">
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
                toll
              </div>
              <p
                className="hand mt-1 max-w-[27rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                What a dollar buys when it buys silence, and what a signal has
                to cost once no one takes your word for it.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/toll" />
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

        {/* ── the lead ─────────────────────────────────────────────────── */}
        <section
          className="panel sketched rise relative mt-6 p-5 sm:p-8"
          style={{ borderRadius: 3, animationDelay: "60ms" }}
          aria-label="The game"
        >
          <Sketch seed="toll-lead" draw />
          <Label>the game</Label>
          {LEAD.map((t, i) => (
            <p
              key={i}
              className={
                i === 0
                  ? "display mt-4 max-w-[44rem] text-[25px] leading-[1.22] sm:text-[30px]"
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
            Play it before you read what they did.
          </p>
        </section>

        {/* ── the rounds, and the receipt ──────────────────────────────── */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          {!done ? (
            <section
              key={round.round}
              className="panel sketched tl-round relative p-5 sm:p-8"
              style={{ borderRadius: 3 }}
              aria-label={`Round ${stage + 1}: ${round.name}`}
            >
              <Sketch seed={`toll-${round.round}`} draw />
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <Label>
                  {stage + 1} · {round.name}
                </Label>
                <span
                  className="text-[10.5px]"
                  style={{ ...mono, color: "var(--faint)" }}
                >
                  round {stage + 1} of {ROUNDS.length}
                </span>
              </div>
              <p
                className="mt-4 max-w-[40rem] text-[16px] leading-[1.7]"
                style={{ color: "var(--ink)" }}
              >
                {round.text}
              </p>

              {round.round === "door" ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      door: false,
                      name: "carry out my split",
                      note: "They learn there was a game, and what you sent.",
                    },
                    {
                      door: true,
                      name: round.door!,
                      note: "They are never told. The tenth dollar goes back to the game.",
                    },
                  ].map((opt) => {
                    const p = payoff(
                      opt.door ? { door: true } : { door: false, give: chose },
                    );
                    return (
                      <button
                        key={opt.name}
                        onClick={() =>
                          play(
                            opt.door
                              ? { door: true }
                              : { door: false, give: chose },
                          )
                        }
                        className="tl-option text-left"
                      >
                        <span
                          className="meta block"
                          style={{
                            color: opt.door ? "var(--accent)" : "var(--ink)",
                          }}
                        >
                          {opt.name}
                        </span>
                        <span className="mt-4 block">
                          <Purse give={chose} door={opt.door} small />
                        </span>
                        <span className="mt-3 block">
                          <Split kept={p.kept} sent={p.sent} />
                        </span>
                        <span
                          className="mt-2 block text-[12.5px] leading-[1.5]"
                          style={{ color: "var(--muted)" }}
                        >
                          {opt.note}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-6">
                  <Purse give={give} onGive={setGive} />
                  <input
                    type="range"
                    className="a-dial mt-4 max-w-[20rem]"
                    min={0}
                    max={POT}
                    step={1}
                    value={give}
                    onChange={(e) => setGive(+e.target.value)}
                    aria-label="Dollars sent to the stranger"
                  />
                  <div className="mt-4">
                    <Split kept={split.kept} sent={split.sent} />
                  </div>
                  <p
                    className="mt-2 text-[12px] leading-[1.5]"
                    style={{ color: "var(--faint)" }}
                  >
                    {round.round === "envelope"
                      ? "Click a coin to send it across, and every coin beyond it."
                      : "It starts where you left the envelope."}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Chip accent onClick={() => play({ door: false, give })}>
                      send ${give}
                    </Chip>
                    {round.door && (
                      <Chip onClick={() => play({ door: true })}>
                        {round.door}
                      </Chip>
                    )}
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section
              className="panel sketched tl-round relative p-5 sm:p-8"
              style={{ borderRadius: 3 }}
              aria-label="What it came to"
            >
              <Sketch seed="toll-came" draw />
              <Label>what it came to</Label>
              <p
                className="display mt-4 max-w-[40rem] text-[24px] leading-[1.25] sm:text-[27px]"
                style={{ color: "var(--ink)" }}
              >
                {spread(played)}
              </p>
              <p
                className="mt-4 max-w-[40rem] text-[15px] leading-[1.7]"
                style={{ color: "var(--muted)" }}
              >
                {doorReading(chose, played[1]?.move.door ?? false)}
              </p>
              <div className="meta mt-7" style={{ color: "var(--faint)" }}>
                in the study
              </div>
              <dl className="mt-2 flex flex-col">
                {STUDY.map((s) => (
                  <div
                    key={s.count}
                    className="grid gap-1 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-4"
                    style={{ borderTop: "1px solid var(--rule)" }}
                  >
                    <dt
                      className="display text-[22px] leading-[1.1] tabular-nums"
                      style={{ color: "var(--ink)" }}
                    >
                      {s.count}
                    </dt>
                    <dd
                      className="text-[14px] leading-[1.6]"
                      style={{ color: "var(--muted)" }}
                    >
                      {s.text}
                    </dd>
                  </div>
                ))}
              </dl>
              <p
                className="mt-3 max-w-[40rem] text-[12.5px] leading-[1.55]"
                style={{ color: "var(--faint)" }}
              >
                {STUDY_NOTE}
              </p>
              <div className="mt-5">
                <Chip onClick={again}>again</Chip>
              </div>
            </section>
          )}

          <aside
            className="panel sketched rise relative p-4 sm:p-5"
            style={{ borderRadius: 3, animationDelay: "120ms" }}
            aria-label="Your receipt"
          >
            <Sketch seed="toll-receipt" draw />
            <Label>your receipt</Label>
            <ol className="mt-3 flex flex-col">
              {ROUNDS.map((r, i) => {
                const p = played[i];
                return (
                  <li
                    key={r.round}
                    className="py-3"
                    style={{ borderTop: "1px solid var(--rule)" }}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span
                        className="text-[13.5px]"
                        style={{
                          color: p
                            ? "var(--ink)"
                            : i === stage
                              ? "var(--accent)"
                              : "var(--faint)",
                        }}
                      >
                        {i + 1} · {r.name}
                      </span>
                      <span
                        className="text-[10px] uppercase tracking-[0.12em]"
                        style={{ ...mono, color: "var(--faint)" }}
                      >
                        {WHO[r.round]}
                      </span>
                    </div>
                    {p ? (
                      <div className="tl-row">
                        <div className="mt-2 flex items-center gap-3">
                          <Cells move={p.move} />
                          <span
                            className="text-[11px] tabular-nums"
                            style={{ ...mono, color: "var(--ink)" }}
                          >
                            {p.move.door ? "door" : `$${payoff(p.move).sent}`}
                          </span>
                        </div>
                        <p
                          className="mt-1.5 text-[12.5px] leading-[1.5]"
                          style={{ color: "var(--muted)" }}
                        >
                          {roundReading(p.round, p.move)}
                        </p>
                      </div>
                    ) : (
                      <p
                        className="mt-1 text-[12px]"
                        style={{ color: "var(--faint)" }}
                      >
                        {i === stage ? "now" : "not yet"}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
            <div
              className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px]"
              style={{ ...mono, color: "var(--muted)" }}
            >
              <span className="inline-flex items-center gap-1.5">
                <i className="tl-key" data-side="mine" /> kept
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="tl-key" data-side="theirs" /> sent
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="tl-key" data-side="toll" /> the door's dollar
              </span>
            </div>
          </aside>
        </div>

        {/* ── the signal ───────────────────────────────────────────────── */}
        <section
          className="panel sketched rise relative mt-6 p-5 sm:p-8"
          style={{ borderRadius: 3, animationDelay: "180ms" }}
          aria-label="The signal"
        >
          <Sketch seed="toll-signal" draw />
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <Label>the signal</Label>
            <span
              className="text-[10.5px]"
              style={{ ...mono, color: "var(--faint)" }}
            >
              → and ← change the rules
            </span>
          </div>
          <p
            className="display mt-4 max-w-[40rem] text-[23px] leading-[1.25] sm:text-[26px]"
            style={{ color: "var(--ink)" }}
          >
            {SIGNAL[0]}
          </p>
          <p
            className="mt-3 max-w-[44rem] text-[15px] leading-[1.7]"
            style={{ color: "var(--muted)" }}
          >
            {SIGNAL[1]}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {CHAIN.map((c, i) => (
              <Chip key={c.name} on={step === i} onClick={() => walk(i)}>
                <span
                  className="mr-2 tabular-nums"
                  style={{ color: "var(--faint)" }}
                >
                  {i + 1}
                </span>
                {c.name}
              </Chip>
            ))}
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
            <div className="flex flex-col gap-6">
              <p
                key={step ?? "own"}
                className="tl-step text-[15px] leading-[1.65]"
                style={{ color: "var(--ink)" }}
              >
                {step === null ? "Your own rules." : CHAIN[step].text}
              </p>
              <Dial
                id="tl-worth"
                name="what being believed is worth"
                value={rules.worth}
                onChange={turn("worth")}
                hint="The more who are watching, the more it is worth."
              />
              <Dial
                id="tl-so"
                name="what the act costs if it is so"
                value={rules.ifSo}
                onChange={turn("ifSo")}
                hint="To someone who does speak Spanish."
              />
              <Dial
                id="tl-not"
                name="what the act costs if it is not"
                value={rules.ifNot}
                onChange={turn("ifNot")}
                hint="To someone who would have to fake it, being found out included. Trust lives here."
              />
              <div className="flex gap-2">
                <Chip
                  onClick={() => walk((step ?? 0) - 1)}
                  disabled={step === 0}
                >
                  back
                </Chip>
                <Chip
                  onClick={() =>
                    walk(
                      step === null || step >= CHAIN.length - 1 ? 0 : step + 1,
                    )
                  }
                  accent={step !== null && step < CHAIN.length - 1}
                >
                  {step !== null && step < CHAIN.length - 1
                    ? "next rule"
                    : "from the top"}
                </Chip>
              </div>
            </div>

            <div>
              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div>
                  <div className="meta" style={{ color: "var(--faint)" }}>
                    of those who do it, how many it is so for
                  </div>
                  <div
                    className="display mt-1 text-[64px] leading-none tabular-nums sm:text-[76px]"
                    style={{ color: "var(--ink)" }}
                  >
                    {o.tells === null ? "—" : Math.round(o.tells * 100)}
                    <span
                      className="text-[18px]"
                      style={{ color: "var(--faint)" }}
                    >
                      {o.tells === null ? " no one does it" : " in 100"}
                    </span>
                  </div>
                  <div className="tl-meter mt-4" aria-hidden="true">
                    <span
                      className="tl-meter-so"
                      style={{
                        width: `${o.doers ? (o.so / o.doers) * 100 : 0}%`,
                      }}
                    />
                    <span
                      className="tl-meter-not"
                      style={{
                        width: `${o.doers ? (o.not / o.doers) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div
                    className="mt-1.5 flex justify-between text-[10.5px]"
                    style={mono}
                  >
                    <span style={{ color: "var(--toll-mark)" }}>
                      {o.so} it is so for
                    </span>
                    <span style={{ color: "var(--muted)" }}>
                      {o.not} it is not
                    </span>
                  </div>
                  <div className="meta mt-6" style={{ color: "var(--faint)" }}>
                    what the room spends on it
                  </div>
                  <div
                    className="display mt-1 text-[40px] leading-none tabular-nums"
                    style={{ color: "var(--toll-coin)" }}
                  >
                    ${fmt(o.spent)}
                  </div>
                </div>
                <div>
                  <div className="meta" style={{ color: "var(--faint)" }}>
                    in people and dollars
                  </div>
                  <p
                    className="mt-2 text-[14px] leading-[1.65]"
                    style={{ color: "var(--ink)" }}
                  >
                    {roomStory(rules)}
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <Room rules={rules} label="A hundred people and who does it" />
                <div
                  className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px]"
                  style={{ ...mono, color: "var(--muted)" }}
                >
                  <span className="inline-flex items-center gap-2">
                    <i className="tl-dot" /> it is not so
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <i className="tl-dot tl-dot-so" /> it is so
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <i className="tl-dot tl-dot-does" /> does the act
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── the same shape elsewhere ─────────────────────────────────── */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <section
            className="panel sketched rise relative p-5 sm:p-8"
            style={{ borderRadius: 3, animationDelay: "240ms" }}
            aria-label="The same shape elsewhere"
          >
            <Sketch seed="toll-elsewhere" draw />
            <Label>the same shape elsewhere</Label>
            <dl className="mt-4 flex flex-col">
              {ELSEWHERE.map((b) => (
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
              style={{ borderRadius: 3, animationDelay: "300ms" }}
              aria-label="What it leaves to you"
            >
              <Sketch seed="toll-leaves" draw />
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
            <section
              className="panel sketched rise relative p-4 sm:p-5"
              style={{ borderRadius: 3, animationDelay: "360ms" }}
              aria-label="Sources"
            >
              <Sketch seed="toll-sources" draw />
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
                        className="tl-cite"
                      >
                        {s.cite}
                      </a>
                    ) : (
                      s.cite
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
