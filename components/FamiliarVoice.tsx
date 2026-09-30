"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import {
  AFTER,
  ITEMS,
  PHASES,
  PRESETS,
  SCALES,
  SEGMENTS,
  SOURCES,
  SPECIMEN,
  TRIVIAL,
  WILD_AGAIN,
  WILD_WARM,
  type Scale,
} from "@/content/familiar-voice";
import {
  WARMEST,
  draw,
  fmt,
  gapReading,
  reply,
  replyReading,
  signed,
  tally,
  type Piece,
  type Reply,
} from "@/lib/familiar-voice";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

const mono = { fontFamily: "var(--font-mono)" } as const;
const chip = "chip px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";
const BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
const FEELING_N = SEGMENTS.filter((s) => !s.content).length;

type Phase = "A" | "B" | "C" | "D";
type Step = "input" | "rate" | "reveal";
type Sitting = ReturnType<typeof draw>;

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
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={chip}
      style={{
        ...mono,
        color: accent ? "var(--accent)" : on ? "var(--ink)" : "var(--muted)",
        borderColor: accent ? "var(--accent)" : on ? "var(--ink)" : undefined,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  );
}

/** Answer-sheet bubbles, one per point on the scale. */
function Bubbles({
  scale,
  value,
  onPick,
  disabled,
}: {
  scale: Scale;
  value: number | null;
  onPick: (v: number) => void;
  disabled?: boolean;
}) {
  const n = scale.full.length;
  return (
    <div
      className="fv-bubbles"
      style={{ "--n": n } as React.CSSProperties}
      role="group"
      aria-label={scale.q}
    >
      {scale.full.map((full, k) => {
        const v = k + 1;
        return (
          <button
            key={v}
            type="button"
            className="fv-bub"
            aria-pressed={value === v}
            aria-label={`${v}, ${full}`}
            disabled={disabled}
            onClick={() => onPick(v)}
          >
            <i>{v}</i>
            <small>
              {scale.ab ? (
                <>
                  <span className="fv-fl">{scale.short[k]}</span>
                  <span className="fv-ab">{scale.ab[k]}</span>
                </>
              ) : (
                scale.short[k]
              )}
            </small>
          </button>
        );
      })}
    </div>
  );
}

function Pips({ n, done }: { n: number; done: number }) {
  return (
    <span className="fv-pips" aria-hidden>
      {Array.from({ length: n }, (_, k) => (
        <i
          key={k}
          className={
            k < done ? "fv-pip-on" : k === done ? "fv-pip-now" : undefined
          }
        />
      ))}
    </span>
  );
}

/** The reader's sentence handed back, with the turned-round words marked when shown. */
function Said({ pieces }: { pieces: Piece[] }) {
  return (
    <>
      {pieces.map((x, i) =>
        "raw" in x ? (
          <Fragment key={i}>{x.raw}</Fragment>
        ) : (
          <Fragment key={i}>
            {x.pre}
            {x.swapped ? <span className="fv-sw">{x.word}</span> : x.word}
            {x.post}
          </Fragment>
        ),
      )}
    </>
  );
}

/** A reply. Shown, its feeling phrases are highlighted and every phrase says what it is. */
function ReplyText({ r, shown }: { r: Reply; shown: boolean }) {
  let f = 0;
  return (
    <p className={`fv-reply-text${shown ? " fv-on" : ""}`}>
      {r.parts.map((p, i) => {
        const body = p.pieces ? (
          <>
            {p.text}
            <Said pieces={p.pieces} />.
          </>
        ) : (
          p.text
        );
        return (
          <Fragment key={i}>
            {i > 0 && " "}
            {p.content ? (
              <span className="fv-seg">
                <span className="fv-tag">{p.k}</span>
                {body}
              </span>
            ) : (
              <span className="fv-seg fv-feel">
                <span className="fv-tag">{p.k}</span>
                <span
                  className="fv-hl"
                  style={{ "--d": `${f++ * 110}ms` } as React.CSSProperties}
                >
                  {body}
                </span>
              </span>
            )}
          </Fragment>
        );
      })}
    </p>
  );
}

type Dot = { seen: boolean; so: boolean; r: number; text?: string };

/** Every statement as a dot at how true it felt; the seen row above the new. */
function Strip({ rows, small }: { rows: Dot[]; small?: boolean }) {
  const pos = (r: number) => ((r - 1) / 5) * 100;
  const mean = (a: number[]) =>
    a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
  return (
    <div className={`fv-strip${small ? " fv-strip-small" : ""}`}>
      {[
        { key: true, label: "seen in A" },
        { key: false, label: "new in C" },
      ].map((g) => {
        const rs = rows.filter((r) => r.seen === g.key);
        const m = mean(rs.map((r) => r.r));
        const byV = new Map<number, Dot[]>();
        rs.forEach((r) => byV.set(r.r, [...(byV.get(r.r) ?? []), r]));
        return (
          <div className="fv-srow" key={g.label}>
            <span className="meta" style={{ color: "var(--muted)" }}>
              {g.label}
            </span>
            <div className="fv-track">
              <div className="fv-inner">
                {[1, 2, 3, 4, 5, 6].map((v) => (
                  <span
                    key={v}
                    className="fv-gl"
                    style={{ left: `${pos(v)}%` }}
                  />
                ))}
                {Number.isFinite(m) && (
                  <span
                    className={`fv-mean${g.key ? " fv-mean-seen" : ""}${pos(m) > 72 ? " fv-flip" : ""}`}
                    style={{ left: `${pos(m)}%` }}
                  >
                    <span>mean {fmt(m)}</span>
                  </span>
                )}
                {[...byV.entries()].flatMap(([v, list]) => {
                  const n = list.length;
                  const cols = Math.ceil(n / 4);
                  return list.map((r, k) => {
                    const col = Math.floor(k / 4);
                    const row = k % 4;
                    const inCol = Math.min(4, n - col * 4);
                    const dx = (col - (cols - 1) / 2) * 15;
                    const dy = (row - (inCol - 1) / 2) * 15 + 6;
                    return (
                      <span
                        key={`${v}-${k}`}
                        className={`fv-dot${g.key ? " fv-dot-seen" : ""}${r.so ? "" : " fv-dot-open"}`}
                        style={{
                          left: `calc(${pos(v)}% + ${dx}px)`,
                          top: `calc(50% + ${dy}px)`,
                        }}
                        title={
                          r.text
                            ? `${r.text} (${r.so ? "true" : "false"}; you rated ${r.r})`
                            : undefined
                        }
                      />
                    );
                  });
                })}
              </div>
            </div>
          </div>
        );
      })}
      <div className="fv-srow">
        <span />
        <div className="fv-axis">
          <div className="fv-inner">
            {[1, 2, 3, 4, 5, 6].map((v) => (
              <span key={v} className="fv-tk" style={{ left: `${pos(v)}%` }}>
                {v}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="fv-srow">
        <span />
        <div className="fv-axisnames">
          <span>
            <span className="fv-fl">definitely </span>false
          </span>
          <span>
            <span className="fv-fl">definitely </span>true
          </span>
        </div>
      </div>
      <p className="fv-legend">
        <span>
          <i className="fv-dot-k fv-dot-seen" /> seen before
        </span>
        <span>
          <i className="fv-dot-k" /> new
        </span>
        <span>
          <i className="fv-dot-k fv-dot-open" /> open: a false statement
        </span>
        <span>
          <i className="fv-mean-k" /> mean
        </span>
      </p>
    </div>
  );
}

function Stage({
  id,
  code,
  name,
  title,
  state,
  after,
  children,
}: {
  id: string;
  code: Phase;
  name: string;
  title: string;
  state: "locked" | "active" | "done";
  after?: Phase;
  children?: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="panel sketched rise relative mt-6 scroll-mt-6 p-5 sm:p-8"
      style={{ borderRadius: 3 }}
      data-state={state}
      aria-labelledby={`${id}-h`}
    >
      {state !== "locked" && <Sketch seed={`voice-${code}`} draw />}
      <div className="flex items-center gap-3">
        <span className="fv-code" data-state={state} aria-hidden>
          {code}
        </span>
        <Label>{name}</Label>
      </div>
      <h2
        id={`${id}-h`}
        tabIndex={-1}
        className="display mt-4 text-[30px] leading-[1.08] outline-none sm:text-[36px]"
        style={{ color: state === "locked" ? "var(--faint)" : "var(--ink)" }}
      >
        {title}
      </h2>
      {state === "locked" ? (
        <p
          className="mt-2 text-[12px]"
          style={{ ...mono, color: "var(--faint)" }}
        >
          opens after {after}
        </p>
      ) : (
        children
      )}
    </section>
  );
}

const lede = "mt-3 max-w-[38rem] text-[15.5px] leading-[1.7]";
const para = "mt-4 max-w-[40rem] text-[15.5px] leading-[1.7]";
const h3 = "display mt-10 text-[24px] leading-[1.15]";

export default function FamiliarVoice() {
  const [theme, setTheme] = useTheme();
  const [sit, setSit] = useState<Sitting | null>(null);
  const [phase, setPhase] = useState<Phase>("A");
  const [ai, setAi] = useState(0);
  const [pressed, setPressed] = useState<number | null>(null);
  const [step, setStep] = useState<Step>("input");
  const [input, setInput] = useState(PRESETS[0]);
  const [sent, setSent] = useState("");
  const [empty, setEmpty] = useState(false);
  const [rate, setRate] = useState<{
    plain: number | null;
    warm: number | null;
  }>({
    plain: null,
    warm: null,
  });
  const [src, setSrc] = useState<number | "yours">("yours");
  const [level, setLevel] = useState(WARMEST);
  const [ci, setCi] = useState(0);
  const [truth, setTruth] = useState<Record<string, number>>({});
  const busy = useRef(false);
  const shownPhase = useRef<Phase>("A");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setSit(draw(ITEMS, Math.random));
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (shownPhase.current === phase) return;
    shownPhase.current = phase;
    const sec = document.getElementById(`fv-${phase}`);
    sec?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    sec?.querySelector("h2")?.focus({ preventScroll: true });
  }, [phase, reduced]);

  const advance = (v: number, next: () => void) => {
    if (busy.current) return;
    busy.current = true;
    setPressed(v);
    setTimeout(
      () => {
        busy.current = false;
        setPressed(null);
        next();
      },
      reduced ? 60 : 220,
    );
  };

  const rateA = (v: number) => {
    if (!sit || phase !== "A") return;
    advance(v, () => {
      if (ai + 1 >= sit.exposure.length) setPhase("B");
      else setAi(ai + 1);
    });
  };

  const rateC = (v: number) => {
    if (!sit || phase !== "C") return;
    const id = sit.judgment[ci];
    advance(v, () => {
      setTruth((t) => ({ ...t, [id]: v }));
      if (ci + 1 >= sit.judgment.length) setPhase("D");
      else setCi(ci + 1);
    });
  };

  const rateRef = useRef({ rateA, rateC });
  rateRef.current = { rateA, rateC };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const v = Number(e.key);
      if (!Number.isInteger(v) || v < 1) return;
      if (phase === "A" && v <= 4) rateRef.current.rateA(v);
      if (phase === "C" && v <= 6) rateRef.current.rateC(v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const send = () => {
    const t = input.trim();
    if (t.length < 3) {
      setEmpty(true);
      return;
    }
    setEmpty(false);
    setSent(t.slice(0, 200));
    setStep("rate");
  };

  const again = () => {
    setSit(draw(ITEMS, Math.random));
    setAi(0);
    setStep("input");
    setInput(PRESETS[0]);
    setSent("");
    setRate({ plain: null, warm: null });
    setSrc("yours");
    setLevel(WARMEST);
    setCi(0);
    setTruth({});
    setPhase("A");
    document
      .getElementById("fv-top")
      ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  };

  const order = sit?.warmFirst
    ? (["warm", "plain"] as const)
    : (["plain", "warm"] as const);
  const revealed = step === "reveal";
  const state = (p: Phase) => {
    const i = "ABCD".indexOf(p);
    const cur = "ABCD".indexOf(phase);
    return i < cur ? "done" : i === cur ? "active" : "locked";
  };

  const aItem = sit && phase === "A" ? BY_ID[sit.exposure[ai]] : null;
  const cItem = sit && phase === "C" ? BY_ID[sit.judgment[ci]] : null;
  const dialSrc = src === "yours" ? sent : TRIVIAL[src];
  const dial = reply(dialSrc, level, SEGMENTS);
  const dialFull = reply(dialSrc, WARMEST, SEGMENTS);
  const scale = Math.max(dialFull.feel, dialFull.yours, dialFull.stock, 1);
  const warmReply = reply(sent, WARMEST, SEGMENTS);
  const t = sit && phase === "D" ? tally(ITEMS, sit.exposure, truth) : null;

  return (
    <main className="fv scroll-thin relative h-dvh w-full overflow-y-auto">
      <div id="fv-top" className="mx-auto max-w-[80rem] px-5 pb-24 sm:px-10">
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
                voice
              </div>
              <p
                className="hand mt-1 max-w-[27rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                Hear a claim twice and it starts to feel true. Hear it said
                warmly and it starts to feel like being understood.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/voice" />
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

        {/* ── the session, and what the debrief shows ─────────────────── */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <section
            className="panel sketched rise relative p-5 sm:p-8"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The session"
          >
            <Sketch seed="voice-session" draw />
            <Label>the familiar voice</Label>
            <p
              className="display mt-4 max-w-[38rem] text-[25px] leading-[1.22] sm:text-[30px]"
              style={{ color: "var(--ink)" }}
            >
              This session does both to you, then shows its working.
            </p>
            <p className={lede} style={{ color: "var(--muted)" }}>
              Rate by feel and don’t look anything up. It keeps nothing: what
              you type and rate is gone when you leave the page.
            </p>
            <ol className="fv-protocol mt-6">
              {PHASES.map((p) => (
                <li key={p.code} data-state={state(p.code)}>
                  <span
                    className="fv-code fv-code-small"
                    data-state={state(p.code)}
                    aria-hidden
                  >
                    {p.code}
                  </span>
                  <span>
                    <b className="font-medium" style={{ color: "var(--ink)" }}>
                      {p.name}
                    </b>
                    <span
                      className="block text-[13.5px] leading-[1.45]"
                      style={{ color: "var(--muted)" }}
                    >
                      {p.does}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <section
            className="panel sketched rise relative p-4 sm:p-5"
            style={{ borderRadius: 3, animationDelay: "120ms" }}
            aria-label="What the debrief shows"
          >
            <Sketch seed="voice-specimen" draw />
            <Label>what the debrief shows</Label>
            <p
              className="mt-1 text-[11px]"
              style={{ ...mono, color: "var(--faint)" }}
            >
              a sitting that never happened
            </p>
            <div className="mt-3">
              <Strip rows={SPECIMEN} small />
            </div>
            <p
              className="mt-3 text-[13.5px] leading-[1.5]"
              style={{ color: "var(--muted)" }}
            >
              Each dot is a statement, placed at how true it felt. Statements
              seen once before sit higher than ones met for the first time. That
              gap is the illusory truth effect.
            </p>
          </section>
        </div>

        {/* ── A · exposure ─────────────────────────────────────────────── */}
        <Stage
          id="fv-A"
          code="A"
          name="exposure"
          title="What the assistant said"
          state={state("A")}
        >
          {phase === "A" ? (
            <>
              <p className={lede} style={{ color: "var(--muted)" }}>
                Eight questions someone asked an assistant, with its answers.
                Rate how interesting each answer is. Keys 1 to 4 work too.
              </p>
              <div key={ai} className="fv-sheet fv-in mt-5">
                <div className="meta" style={{ color: "var(--muted)" }}>
                  asked
                </div>
                <p
                  className="mt-1 text-[16px] italic leading-[1.45]"
                  style={{ color: "var(--muted)" }}
                >
                  {aItem?.q ?? " "}
                </p>
                <div className="fv-ans">
                  <div className="meta" style={{ color: "var(--muted)" }}>
                    assistant
                  </div>
                  <p
                    className="display mt-1 text-[23px] leading-[1.3] sm:text-[26px]"
                    style={{ color: "var(--ink)" }}
                  >
                    {aItem ? `${aItem.lead} ${aItem.text}` : " "}
                  </p>
                </div>
              </div>
              <p className="mt-6 text-[14.5px]" style={{ color: "var(--ink)" }}>
                {SCALES.interest.q}
              </p>
              <Bubbles
                scale={SCALES.interest}
                value={pressed}
                onPick={rateA}
                disabled={!sit}
              />
              <div className="fv-meta">
                <span>
                  answer {ai + 1} of {sit?.exposure.length ?? 8}
                </span>
                <Pips n={sit?.exposure.length ?? 8} done={ai} />
              </div>
            </>
          ) : (
            <p className="fv-done">Eight answers rated.</p>
          )}
        </Stage>

        {/* ── B · replies ──────────────────────────────────────────────── */}
        <Stage
          id="fv-B"
          code="B"
          name="replies"
          title="Tell it something"
          state={state("B")}
          after="A"
        >
          {step === "input" ? (
            <>
              <p className={lede} style={{ color: "var(--muted)" }}>
                One sentence about something small that has been on your mind.
                Pick one of these or write your own.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="fv-pick"
                    aria-pressed={input === p}
                    onClick={() => {
                      setInput(p);
                      setEmpty(false);
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <label
                htmlFor="fv-text"
                className="meta mt-5 block"
                style={{ color: "var(--muted)" }}
              >
                your sentence
              </label>
              <textarea
                id="fv-text"
                className="fv-textarea mt-2"
                rows={3}
                maxLength={200}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              {empty && (
                <p
                  role="alert"
                  className="mt-2 text-[12px]"
                  style={{ ...mono, color: "var(--accent)" }}
                >
                  Write a sentence first, or pick one above.
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Chip onClick={send} accent>
                  send
                </Chip>
                <span
                  className="text-[12.5px]"
                  style={{ color: "var(--muted)" }}
                >
                  It stays on this page.
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="meta mt-4" style={{ color: "var(--muted)" }}>
                you wrote
              </div>
              <p className="fv-said mt-2">{sent}</p>
              <p className={`${lede} mt-7`} style={{ color: "var(--muted)" }}>
                Two replies came back. Rate each one.
              </p>
              {order.map((which, i) => (
                <div key={which} className="fv-sheet mt-4">
                  <div className="meta" style={{ color: "var(--muted)" }}>
                    reply {i + 1}
                    {revealed && (which === "warm" ? " · warm" : " · plain")}
                  </div>
                  <ReplyText
                    r={reply(sent, which === "warm" ? WARMEST : 0, SEGMENTS)}
                    shown={revealed}
                  />
                  <p
                    className="mt-4 text-[14.5px]"
                    style={{ color: "var(--ink)" }}
                  >
                    {SCALES.understood.q}
                  </p>
                  <Bubbles
                    scale={SCALES.understood}
                    value={rate[which]}
                    disabled={revealed}
                    onPick={(v) => setRate((r) => ({ ...r, [which]: v }))}
                  />
                </div>
              ))}
              {!revealed && (
                <div className="mt-5">
                  <Chip
                    onClick={() => setStep("reveal")}
                    accent={!!(rate.plain && rate.warm)}
                    disabled={!(rate.plain && rate.warm)}
                  >
                    show how the replies were made
                  </Chip>
                </div>
              )}
              {revealed && rate.plain && rate.warm && (
                <div className="fv-after">
                  <h3 className={h3} style={{ color: "var(--ink)" }}>
                    Same information, twice
                  </h3>
                  <p className={para} style={{ color: "var(--ink)" }}>
                    Both replies say three things: your sentence handed back,
                    one line of stock advice, and one question. Reply{" "}
                    {order.indexOf("warm") + 1} wraps them in {FEELING_N}{" "}
                    phrases about feeling, {warmReply.feel} words in all,
                    written before you typed anything.{" "}
                    {replyReading(rate.warm, rate.plain)}
                  </p>
                  <h3 className={h3} style={{ color: "var(--ink)" }}>
                    Where the understanding came from
                  </h3>
                  <p className={para} style={{ color: "var(--ink)" }}>
                    The only words about your situation are your own. The
                    program swaps <em>I</em> for <em>you</em> and <em>my</em>{" "}
                    for <em>your</em>, then hands the sentence back.
                  </p>
                  <div className="fv-swap">
                    <div>
                      <div className="meta" style={{ color: "var(--muted)" }}>
                        you wrote
                      </div>
                      <p className="mt-1">{sent}</p>
                    </div>
                    <div>
                      <div className="meta" style={{ color: "var(--muted)" }}>
                        it said
                      </div>
                      <p className="fv-on mt-1">
                        You mentioned that{" "}
                        <Said
                          pieces={
                            warmReply.parts.find((p) => p.pieces)?.pieces ?? []
                          }
                        />
                        .
                      </p>
                    </div>
                  </div>
                  {AFTER.eliza.map((s, i) => (
                    <p key={i} className={para} style={{ color: "var(--ink)" }}>
                      {s}
                    </p>
                  ))}
                  <h3 className={h3} style={{ color: "var(--ink)" }}>
                    The warmth dial
                  </h3>
                  <p className={para} style={{ color: "var(--muted)" }}>
                    Same template, any input. Turn it up on something that
                    doesn’t matter.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="fv-pick"
                      aria-pressed={src === "yours"}
                      onClick={() => setSrc("yours")}
                    >
                      Your sentence
                    </button>
                    {TRIVIAL.map((s, i) => (
                      <button
                        key={s}
                        type="button"
                        className="fv-pick"
                        aria-pressed={src === i}
                        onClick={() => setSrc(i)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="mt-5 max-w-[28rem]">
                    <label
                      htmlFor="fv-dial"
                      className="meta block"
                      style={{ color: "var(--muted)" }}
                    >
                      warmth {level} of {WARMEST}
                    </label>
                    <input
                      id="fv-dial"
                      type="range"
                      className="a-dial mt-2"
                      min={0}
                      max={WARMEST}
                      step={1}
                      value={level}
                      onChange={(e) => setLevel(+e.target.value)}
                      aria-valuetext={`warmth ${level} of ${WARMEST}`}
                    />
                    <div className="fv-ticks" aria-hidden>
                      <span>0 plain</span>
                      <span>1</span>
                      <span>2</span>
                      <span>3</span>
                      <span>4 as sent</span>
                    </div>
                  </div>
                  <div className="fv-sheet mt-4">
                    <ReplyText r={dial} shown />
                  </div>
                  <div className="fv-bars">
                    {[
                      {
                        cls: "fv-bar-yours",
                        label: "Your words, pronouns swapped",
                        n: dial.yours,
                      },
                      {
                        cls: "fv-bar-stock",
                        label: "Stock advice and question",
                        n: dial.stock,
                      },
                      {
                        cls: "fv-bar-feel",
                        label: "Stock feeling",
                        n: dial.feel,
                      },
                    ].map((b) => (
                      <div key={b.cls} className={`fv-bar ${b.cls}`}>
                        <span
                          className="text-[13.5px] leading-[1.3]"
                          style={{ color: "var(--muted)" }}
                        >
                          {b.label}
                        </span>
                        <span className="fv-bar-track">
                          <span
                            style={{ transform: `scaleX(${b.n / scale})` }}
                          />
                        </span>
                        <span className="fv-bar-n">{b.n}</span>
                      </div>
                    ))}
                    <p
                      className="text-[12.5px]"
                      style={{ color: "var(--muted)" }}
                    >
                      Word counts. The first two never change with the dial.
                    </p>
                  </div>
                  {phase === "B" && (
                    <div className="mt-8">
                      <Chip onClick={() => setPhase("C")} accent>
                        continue to C
                      </Chip>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </Stage>

        {/* ── C · judgment ─────────────────────────────────────────────── */}
        <Stage
          id="fv-C"
          code="C"
          name="judgment"
          title="True or false?"
          state={state("C")}
          after="B"
        >
          {phase === "C" ? (
            <>
              <p className={lede} style={{ color: "var(--muted)" }}>
                Sixteen statements. Rate how true each one seems, from 1 for
                definitely false to 6 for definitely true. Go with your first
                sense. Keys 1 to 6 work too.
              </p>
              <div key={ci} className="fv-sheet fv-in mt-5">
                <div className="meta" style={{ color: "var(--muted)" }}>
                  statement
                </div>
                <p
                  className="display mt-1 text-[23px] leading-[1.3] sm:text-[26px]"
                  style={{ color: "var(--ink)" }}
                >
                  {cItem?.text ?? " "}
                </p>
              </div>
              <p className="mt-6 text-[14.5px]" style={{ color: "var(--ink)" }}>
                {SCALES.truth.q}
              </p>
              <Bubbles scale={SCALES.truth} value={pressed} onPick={rateC} />
              <div className="fv-meta">
                <span>
                  statement {ci + 1} of {sit?.judgment.length ?? 16}
                </span>
                <Pips n={sit?.judgment.length ?? 16} done={ci} />
              </div>
            </>
          ) : (
            <p className="fv-done">Sixteen statements rated.</p>
          )}
        </Stage>

        {/* ── D · debrief ──────────────────────────────────────────────── */}
        <Stage
          id="fv-D"
          code="D"
          name="debrief"
          title="Debrief"
          state={state("D")}
          after="C"
        >
          {t && (
            <div className="fv-after">
              <p className={para} style={{ color: "var(--ink)" }}>
                Phase A was not about interest. Eight of the sixteen statements
                in Phase C had already appeared, word for word, in the
                assistant’s answers. Half of those eight were false, and it said
                them in the same voice as the true ones.
              </p>
              <div className="fv-figs">
                <div>
                  <div className="meta" style={{ color: "var(--muted)" }}>
                    seen in A
                  </div>
                  <div className="fv-fig">{fmt(t.seen)}</div>
                  <div
                    className="text-[12.5px]"
                    style={{ color: "var(--muted)" }}
                  >
                    mean truth rating
                  </div>
                </div>
                <div>
                  <div className="meta" style={{ color: "var(--muted)" }}>
                    new in C
                  </div>
                  <div className="fv-fig">{fmt(t.fresh)}</div>
                  <div
                    className="text-[12.5px]"
                    style={{ color: "var(--muted)" }}
                  >
                    mean truth rating
                  </div>
                </div>
                <div>
                  <div className="meta" style={{ color: "var(--muted)" }}>
                    difference
                  </div>
                  <div className="fv-fig">
                    <span className="fv-hl fv-hl-on">{signed(t.gap)}</span>
                  </div>
                  <div
                    className="text-[12.5px]"
                    style={{ color: "var(--muted)" }}
                  >
                    what one exposure did
                  </div>
                </div>
              </div>
              <Strip rows={t.rows} />
              <p className={`${para} mt-6`} style={{ color: "var(--ink)" }}>
                {gapReading(t.gap)}
              </p>
              <p
                className="mt-1 text-[13.5px]"
                style={{ color: "var(--muted)" }}
              >
                False statements only: {fmt(t.notSoSeen)} when seen before,{" "}
                {fmt(t.notSoFresh)} when new.
              </p>

              <h3 className={h3} style={{ color: "var(--ink)" }}>
                All sixteen, by how true they felt
              </h3>
              <ul className="fv-items">
                <li className="fv-items-head meta">
                  <span>statement</span>
                  <span>phase A</span>
                  <span style={{ textAlign: "right" }}>you</span>
                  <span>actually</span>
                </li>
                {t.rows
                  .slice()
                  .sort((a, b) => b.r - a.r || Number(b.seen) - Number(a.seen))
                  .map((r) => (
                    <li key={r.id}>
                      <span
                        className="text-[15.5px] leading-[1.45]"
                        style={{ color: "var(--ink)" }}
                      >
                        {r.text}
                        <span
                          className="mt-1 block text-[13.5px]"
                          style={{ color: "var(--muted)" }}
                        >
                          {r.note}
                        </span>
                      </span>
                      <span>
                        {r.seen ? (
                          <span className="fv-seen">seen</span>
                        ) : (
                          <span
                            className="meta"
                            style={{ color: "var(--muted)" }}
                          >
                            new
                          </span>
                        )}
                      </span>
                      <span className="fv-you">
                        <span className="fv-you-pre">you </span>
                        {r.r}
                      </span>
                      <span
                        className="meta"
                        style={{ color: r.so ? "var(--ink)" : "var(--muted)" }}
                      >
                        {r.so ? "true" : "false"}
                      </span>
                    </li>
                  ))}
              </ul>

              <h3 className={h3} style={{ color: "var(--ink)" }}>
                The replies
              </h3>
              <p className={para} style={{ color: "var(--ink)" }}>
                You rated the warm reply {rate.warm} and the plain reply{" "}
                {rate.plain}, out of 6. They carried the same information.{" "}
                {AFTER.ayers}
              </p>

              <h3 className={h3} style={{ color: "var(--ink)" }}>
                One mechanism
              </h3>
              {AFTER.mechanism.map((s, i) => (
                <p key={i} className={para} style={{ color: "var(--ink)" }}>
                  {s}
                </p>
              ))}

              <h3 className={h3} style={{ color: "var(--ink)" }}>
                Outside this page
              </h3>
              <div className="fv-wild">
                <div>
                  <div className="meta" style={{ color: "var(--muted)" }}>
                    said again
                  </div>
                  <ul>
                    {WILD_AGAIN.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="meta" style={{ color: "var(--muted)" }}>
                    said warmly
                  </div>
                  <ul>
                    {WILD_WARM.map(([s, k]) => (
                      <li key={s}>
                        <span className="fv-hl fv-hl-on">{s}</span>
                        <span className="fv-tag-inline">{k}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <h3 className={h3} style={{ color: "var(--ink)" }}>
                Sources
              </h3>
              <ol className="fv-sources">
                {SOURCES.map((s) => (
                  <li key={s.cite}>
                    {s.cite} <em>{s.venue}</em>
                    {s.doi && (
                      <>
                        {" "}
                        <span style={mono} className="text-[11.5px]">
                          doi:{s.doi}
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ol>
              <div className="mt-8">
                <Chip onClick={again}>run it again with a new draw</Chip>
              </div>
            </div>
          )}
        </Stage>
      </div>
    </main>
  );
}
