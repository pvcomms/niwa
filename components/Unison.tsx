"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ARRANGEMENTS,
  AVERAGE_WPM,
  FOR_YOU,
  PASSAGES,
  SOURCES,
  TRY_LINE,
  WHO,
} from "@/content/unison";
import {
  HOLDS,
  WAYS,
  WAY_NAME,
  draw,
  guessing,
  load,
  matched,
  paceReading,
  roundsReading,
  sentences,
  spreadReading,
  wordAt,
  words,
  wpm,
  type Arrangement,
  type Finding,
  type Round,
  type Way,
  type Who,
} from "@/lib/unison";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

const mono = { fontFamily: "var(--font-mono)" } as const;
const chip = "chip px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";
const BY_ID = Object.fromEntries(PASSAGES.map((p) => [p.id, p]));
const SRC = Object.fromEntries(SOURCES.map((s, i) => [s.key, i + 1]));
const lede = "mt-3 max-w-[38rem] text-[15.5px] leading-[1.7]";
const para = "mt-4 max-w-[40rem] text-[15.5px] leading-[1.7]";
const h3 = "display mt-10 text-[24px] leading-[1.15]";

/** macOS ships voices that sing, bubble or whisper. The rounds use a speaking voice. */
const NOVELTY =
  /^(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|pipe organ|superstar|trinoids|whisper|wobble|zarvox)\b/i;

type Step = "ready" | "running" | "heard" | "questions";
type Phase = "A" | "B";

type Result = {
  way: Way;
  passage: string;
  answers: (number | null)[];
  matched: number;
  ms: number;
  wpm: number | null;
  /** Seconds of the voice still to come when the reader went on, in the round with both. */
  leftEarly: number | null;
};

type Speaking = { stop: () => void; pause: () => void; resume: () => void };

/**
 * Say a passage a sentence at a time in a voice on this machine, reporting
 * the word it is on. Voices that send word boundaries are followed exactly;
 * for one that does not, the word is estimated from the time into the
 * sentence at the pace measured so far.
 */
function sayPassage(
  text: string,
  o: {
    voice: SpeechSynthesisVoice | null;
    rate: number;
    volume: number;
    onWord: (i: number) => void;
    onEnd: (ms: number) => void;
    onError: () => void;
  },
): Speaking {
  const synth = window.speechSynthesis;
  synth.cancel();
  const ws = words(text);
  const ss = sentences(text);
  let t0 = 0;
  let pausedAt = 0;
  let pausedMs = 0;
  let paused = false;
  let boundary = false;
  let done = false;
  let msPerChar = 1000 / (14 * o.rate);
  let spokenChars = 0;
  let spokenMs = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  const clear = () => {
    if (timer) clearInterval(timer);
    timer = undefined;
  };
  const keep: SpeechSynthesisUtterance[] = [];
  ss.forEach((s, k) => {
    const u = new SpeechSynthesisUtterance(s.text);
    if (o.voice) {
      u.voice = o.voice;
      u.lang = o.voice.lang;
    }
    u.rate = o.rate;
    u.volume = o.volume;
    let began = 0;
    let beganPaused = 0;
    u.onstart = () => {
      if (done) return;
      began = performance.now();
      beganPaused = pausedMs;
      if (!t0) t0 = began;
      o.onWord(wordAt(ws, s.start));
      if (boundary) return;
      clear();
      timer = setInterval(() => {
        if (paused || boundary || done) return;
        const into = performance.now() - began - (pausedMs - beganPaused);
        const c = Math.min(s.text.length - 1, into / msPerChar);
        o.onWord(wordAt(ws, s.start + c));
      }, 60);
    };
    u.onboundary = (e) => {
      if (done || (e.name && e.name !== "word")) return;
      boundary = true;
      clear();
      o.onWord(wordAt(ws, s.start + e.charIndex));
    };
    u.onend = () => {
      if (done) return;
      clear();
      const now = performance.now();
      spokenChars += s.text.length;
      spokenMs += now - began - (pausedMs - beganPaused);
      if (spokenChars > 0 && spokenMs > 0) msPerChar = spokenMs / spokenChars;
      if (k === ss.length - 1) {
        done = true;
        o.onWord(ws.length);
        o.onEnd(now - t0 - pausedMs);
      }
    };
    u.onerror = (e) => {
      if (done || e.error === "interrupted" || e.error === "canceled") return;
      done = true;
      clear();
      o.onError();
    };
    keep.push(u);
    synth.speak(u);
  });
  return {
    stop: () => {
      done = true;
      clear();
      keep.length = 0;
      synth.cancel();
    },
    pause: () => {
      if (paused) return;
      paused = true;
      pausedAt = performance.now();
      synth.pause();
    },
    resume: () => {
      if (!paused) return;
      paused = false;
      pausedMs += performance.now() - pausedAt;
      synth.resume();
    },
  };
}

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
  code: string;
  name: string;
  title: string;
  state: "locked" | "active" | "done";
  after?: string;
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
      {state !== "locked" && <Sketch seed={`unison-${code}`} draw />}
      <div className="flex items-center gap-3">
        <span className="un-code" data-state={state} aria-hidden>
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

/** The ways as three marks: done inked, the current one open in its colour. */
function RoundMarks({ rounds, at }: { rounds: Round[]; at: number }) {
  return (
    <ol className="un-marks" aria-label="The rounds">
      {rounds.map((r, i) => (
        <li
          key={r.way}
          data-way={r.way}
          data-state={i < at ? "done" : i === at ? "now" : "later"}
        >
          <i aria-hidden />
          <span>
            {i + 1} · {WAY_NAME[r.way]}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Cite({ keys }: { keys: string[] }) {
  return (
    <span className="un-cite">
      {keys.map((k, i) => {
        const s = SOURCES[SRC[k] - 1];
        return (
          <a key={k} href={`#un-src-${k}`} title={s ? s.cite : k}>
            {i > 0 && "; "}
            {s ? s.short : k}
          </a>
        );
      })}
    </span>
  );
}

const DIR: Record<Finding["dir"], string> = {
  higher: "higher",
  same: "about the same",
  lower: "lower",
  mixed: "both ways",
  note: "note",
};

function Findings({ list, who }: { list: Finding[]; who: Who | null }) {
  return (
    <ul className="un-findings">
      {list.map((f) => (
        <li
          key={f.says}
          data-dim={who && f.who && f.who !== who ? "" : undefined}
        >
          <span className="un-dir" data-dir={f.dir}>
            {DIR[f.dir]}
          </span>
          <span>
            {f.who && (
              <span className="un-who">
                {WHO.find((w) => w.id === f.who)?.name}
              </span>
            )}
            <span
              className="block text-[15px] leading-[1.6]"
              style={{ color: "var(--ink)" }}
            >
              {f.says} <Cite keys={f.src} />
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The channels, drawn: what is on the page goes in at the eye, what is said
 * at the ear. Printed words are turned to sound and share a store with heard
 * ones; pictures keep their own. A toy of the account, not a measurement.
 */
function Channels({ a }: { a: Arrangement }) {
  const l = load(a);
  const K = 140;
  const X = 420;
  const cap = X + HOLDS * K;
  const words = l.wordsEye + l.wordsEar;
  const over = Math.max(0, words - HOLDS);
  const bar = (x: number, s: number) =>
    ({ transform: `translateX(${x}px) scaleX(${s})` }) as React.CSSProperties;
  const on = (b: boolean) => (b ? 1 : 0.16);
  const earLines =
    a.ear === "other" ? [44, 86, 60] : a.ear === "same" ? [80, 72, 80] : [];
  return (
    <div className="un-chan-wrap scroll-thin">
      <svg
        viewBox="0 0 720 290"
        className="un-chan"
        role="img"
        aria-label={`${a.name}: ${a.line}`}
      >
        <defs>
          <pattern
            id="un-hatch"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="2" height="6" fill="var(--accent)" />
          </pattern>
        </defs>

        {/* the page */}
        <rect
          x="16"
          y="20"
          width="170"
          height="112"
          rx="3"
          className="un-box"
        />
        <text x="28" y="38" className="un-t">
          on the page
        </text>
        <g style={{ opacity: on(a.page.words) }} className="un-fade">
          {[80, 72, 80, 50].map((w, i) => (
            <line
              key={i}
              x1="30"
              x2={30 + w}
              y1={60 + i * 13}
              y2={60 + i * 13}
              className="un-ink"
            />
          ))}
        </g>
        <g style={{ opacity: on(a.page.picture) }} className="un-fade">
          <rect
            x="126"
            y="52"
            width="50"
            height="52"
            rx="2"
            className="un-pic"
          />
          <circle cx="163" cy="64" r="5" className="un-pic-sun" />
          <polyline
            points="128,100 143,78 152,90 160,82 174,100"
            className="un-pic-hill"
          />
        </g>
        <text x="28" y="124" className="un-t un-t-faint">
          {a.page.words && a.page.picture
            ? "words and a picture"
            : a.page.words
              ? "words"
              : a.page.picture
                ? "a picture"
                : "nothing"}
        </text>

        {/* the ear */}
        <rect
          x="16"
          y="160"
          width="170"
          height="112"
          rx="3"
          className="un-box"
        />
        <text x="28" y="178" className="un-t">
          in the ear
        </text>
        <path
          d={
            a.ear === "none"
              ? "M30 200 L176 200"
              : "M30 200 C38 188 44 212 52 200 S66 186 74 200 S88 214 96 200 S110 190 118 200 S132 210 140 200 S156 192 164 200 L176 200"
          }
          className="un-wave"
          style={{ opacity: a.ear === "none" ? 0.3 : 1 }}
        />
        {earLines.map((w, i) => (
          <line
            key={`${a.ear}-${i}`}
            x1="30"
            x2={30 + w}
            y1={224 + i * 12}
            y2={224 + i * 12}
            className="un-ink un-ink-ear"
          />
        ))}
        <text x="28" y="264" className="un-t un-t-faint">
          {a.ear === "same"
            ? a.page.words
              ? "the same words"
              : "words"
            : a.ear === "other"
              ? "other words"
              : "nothing"}
        </text>

        {/* the gates */}
        <path
          d="M186 76 L246 76"
          className={`un-path${a.page.words || a.page.picture ? " un-flow un-eye" : ""}`}
        />
        <path
          d="M186 216 L246 216"
          className={`un-path${a.ear !== "none" ? " un-flow un-ear" : ""}`}
        />
        <path
          d="M232 76 C236 66 256 66 262 76 C256 86 236 86 232 76 Z"
          transform="translate(4 0)"
          className="un-gate"
        />
        <circle cx="251" cy="76" r="3.5" className="un-gate-dot" />
        <text x="251" y="104" textAnchor="middle" className="un-t">
          eye
        </text>
        <path
          d="M245 209 C245 199 259 197 262 206 C264 213 256 215 255 221 C254 227 248 228 246 224"
          className="un-gate"
        />
        <text x="252" y="246" textAnchor="middle" className="un-t">
          ear
        </text>
        <text
          x="251"
          y="120"
          textAnchor="middle"
          className="un-t un-t-accent un-fade"
          style={{ opacity: l.split ? 1 : 0 }}
        >
          one place at a time
        </text>

        {/* to the stores */}
        <path
          d="M268 72 C320 60 360 58 420 62"
          className={`un-path${a.page.picture ? " un-flow un-eye" : ""}`}
        />
        <path
          d="M268 80 C300 110 312 150 348 160 L420 162"
          className={`un-path${a.page.words ? " un-flow un-eye" : ""}`}
        />
        <path
          d="M268 214 C330 216 380 202 420 180"
          className={`un-path${a.ear !== "none" ? " un-flow un-ear" : ""}`}
        />
        <circle
          cx="348"
          cy="160"
          r="4"
          className="un-node un-fade"
          style={{ opacity: on(a.page.words) }}
        />
        <text
          x="336"
          y="184"
          textAnchor="middle"
          className="un-t un-t-faint un-fade"
          style={{ opacity: on(a.page.words) }}
        >
          print turned to sound
        </text>

        {/* the stores */}
        <text x={X} y="42" className="un-t">
          pictures, and where things are
        </text>
        <rect x={X} y="50" width="260" height="24" rx="2" className="un-lane" />
        <rect
          x="0"
          y="50"
          width={K}
          height="24"
          className="un-fill un-fill-eye"
          style={bar(X, l.pictures)}
        />
        <rect
          x="0"
          y="50"
          width={K}
          height="24"
          className="un-fill un-fill-missed"
          style={bar(X + l.pictures * K, l.missed)}
        />
        <text
          x={X}
          y="90"
          className="un-t un-t-faint un-fade"
          style={{ opacity: l.missed > 0 ? 1 : 0 }}
        >
          what went unlooked-at while reading the words
        </text>
        <text x={X} y="146" className="un-t">
          words, as sound
        </text>
        <rect
          x={X}
          y="152"
          width="260"
          height="36"
          rx="2"
          className="un-lane"
        />
        <rect
          x="0"
          y="152"
          width={K}
          height="36"
          className="un-fill un-fill-eye"
          style={bar(X, l.wordsEye)}
        />
        <rect
          x="0"
          y="152"
          width={K}
          height="36"
          className="un-fill un-fill-ear"
          style={bar(X + l.wordsEye * K, l.wordsEar)}
        />
        <rect
          x="0"
          y="152"
          width={K}
          height="36"
          fill="url(#un-hatch)"
          className="un-fill"
          style={bar(cap, over)}
        />
        <line x1={cap} x2={cap} y1="44" y2="196" className="un-cap" />
        <text x={cap - 4} y="210" textAnchor="end" className="un-t un-t-faint">
          what it holds
        </text>
        <text
          x={X}
          y="228"
          className="un-t un-t-accent un-fade"
          style={{ opacity: over > 0 ? 1 : 0 }}
        >
          two streams of words, one store
        </text>
        <text
          x={X}
          y="228"
          className="un-t un-t-faint un-fade"
          style={{ opacity: a.ear === "same" && a.page.words ? 1 : 0 }}
        >
          the same words twice, kept in step
        </text>
      </svg>
    </div>
  );
}

/** Where the reader's pace and the voice's fall on one line of words a minute. */
function PaceLine({
  you,
  voice,
}: {
  you: number | null;
  voice: number | null;
}) {
  const lo = 100;
  const hi = 400;
  const x = (v: number) =>
    24 + ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * 632;
  const all = [
    you ? { v: you, name: `you, reading · ${you}`, cls: "un-pm-you" } : null,
    voice ? { v: voice, name: `the voice · ${voice}`, cls: "un-pm-voice" } : null,
    {
      v: AVERAGE_WPM,
      name: `average, non-fiction · ${AVERAGE_WPM}`,
      cls: "un-pm-avg",
    },
  ].filter((m) => m !== null);
  // Labels take the first level where nothing on it sits within reach.
  const LEVELS = [26, 110, 10, 126];
  const placed: { v: number; name: string; cls: string; y: number }[] = [];
  for (const m of all.sort((a, b) => a.v - b.v)) {
    const y =
      LEVELS.find(
        (l) => !placed.some((p) => p.y === l && Math.abs(x(p.v) - x(m.v)) < 170),
      ) ?? LEVELS[0];
    placed.push({ ...m, y });
  }
  return (
    <div className="un-chan-wrap scroll-thin">
      <svg
        viewBox="0 0 680 136"
        className="un-pace"
        role="img"
        aria-label={placed.map((m) => m.name).join(", ")}
      >
        <line x1="24" x2="656" y1="68" y2="68" className="un-axis" />
        {[100, 150, 200, 250, 300, 350, 400].map((v) => (
          <g key={v}>
            <line x1={x(v)} x2={x(v)} y1="64" y2="72" className="un-axis" />
            <text
              x={x(v)}
              y="88"
              textAnchor="middle"
              className="un-t un-t-faint"
            >
              {v === hi ? `${v}+` : v}
            </text>
          </g>
        ))}
        {placed.map((m) => {
          const up = m.y < 68;
          const anchor = x(m.v) > 520 ? "end" : x(m.v) < 150 ? "start" : "middle";
          return (
            <g key={m.cls}>
              <line
                x1={x(m.v)}
                x2={x(m.v)}
                y1={up ? m.y + 5 : 68}
                y2={up ? 68 : m.y - 12}
                className={`un-pm-stem ${m.cls}`}
              />
              <circle cx={x(m.v)} cy="68" r="5.5" className={m.cls} />
              <text x={x(m.v)} y={m.y} textAnchor={anchor} className="un-t">
                {m.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function Unison() {
  const [theme, setTheme] = useTheme();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceState, setVoiceState] = useState<"looking" | "ready" | "none">(
    "looking",
  );
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(0.6);
  const [trying, setTrying] = useState(false);
  const [tryWpm, setTryWpm] = useState<number | null>(null);
  const [broke, setBroke] = useState(false);

  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [ri, setRi] = useState(0);
  const [step, setStep] = useState<Step>("ready");
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [pressed, setPressed] = useState<number | null>(null);
  const [cur, setCur] = useState(-1);
  const [paused, setPaused] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [phase, setPhase] = useState<Phase>("A");

  const [arr, setArr] = useState("both");
  const [who, setWho] = useState<Who | null>(null);

  const speaking = useRef<Speaking | null>(null);
  const started = useRef(0);
  const voiceMs = useRef<number | null>(null);
  const leftEarly = useRef<number | null>(null);
  const roundMs = useRef(0);
  const busy = useRef(false);
  const shownPhase = useRef<Phase>("A");
  const [reduced, setReduced] = useState(false);

  // The voices on this machine. Nothing is said until the reader presses a play.
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (!("speechSynthesis" in window)) {
      setVoiceState("none");
      return;
    }
    const synth = window.speechSynthesis;
    const read = () => {
      const local = synth
        .getVoices()
        .filter(
          (v) =>
            v.localService &&
            /^en([-_]|$)/i.test(v.lang) &&
            !NOVELTY.test(v.name),
        );
      if (local.length === 0) return;
      setVoices(local);
      setVoiceURI(
        (u) =>
          u ||
          (
            local.find((v) => v.default) ??
            local.find(
              (v) => v.lang.replace("_", "-") === navigator.language,
            ) ??
            local[0]
          ).voiceURI,
      );
      setVoiceState("ready");
    };
    read();
    synth.addEventListener("voiceschanged", read);
    const t = setTimeout(
      () => setVoiceState((s) => (s === "looking" ? "none" : s)),
      2500,
    );
    const hush = () => synth.cancel();
    window.addEventListener("pagehide", hush);
    return () => {
      clearTimeout(t);
      synth.removeEventListener("voiceschanged", read);
      window.removeEventListener("pagehide", hush);
      speaking.current?.stop();
      synth.cancel();
    };
  }, []);

  // The sitting is drawn once it is known whether a voice can take part, and
  // drawn again with all three ways if a voice turns up before anything is sat.
  useEffect(() => {
    if (voiceState === "looking") return;
    const full = voiceState === "ready";
    if (rounds && (rounds.length === WAYS.length || !full)) return;
    if (rounds && (results.length > 0 || step !== "ready")) return;
    setRounds(draw(PASSAGES, Math.random, full ? WAYS : ["eyes"]));
  }, [voiceState, rounds, results.length, step]);

  useEffect(() => {
    if (shownPhase.current === phase) return;
    shownPhase.current = phase;
    const sec = document.getElementById(`un-${phase}`);
    sec?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
    sec?.querySelector("h2")?.focus({ preventScroll: true });
  }, [phase, reduced]);

  const voice = voices.find((v) => v.voiceURI === voiceURI) ?? null;
  const round = rounds?.[ri] ?? null;
  const passage = round ? BY_ID[round.passage] : null;
  const ws = useMemo(() => (passage ? words(passage.text) : []), [passage]);

  const speak = (text: string, onEnd: (ms: number) => void) => {
    setBroke(false);
    speaking.current?.stop();
    speaking.current = sayPassage(text, {
      voice,
      rate,
      volume,
      onWord: setCur,
      onEnd,
      onError: () => {
        setBroke(true);
        setTrying(false);
      },
    });
  };

  const tryVoice = () => {
    if (trying) {
      speaking.current?.stop();
      setTrying(false);
      return;
    }
    setTrying(true);
    speak(TRY_LINE, (ms) => {
      setTryWpm(wpm(words(TRY_LINE).length, ms));
      setTrying(false);
      setCur(-1);
    });
  };

  const begin = () => {
    if (!round || !passage) return;
    setTrying(false);
    voiceMs.current = null;
    leftEarly.current = null;
    started.current = performance.now();
    setCur(-1);
    setPaused(false);
    setStep("running");
    if (round.way === "eyes") return;
    speak(passage.text, (ms) => {
      voiceMs.current = ms;
      setStep((s) => (s === "running" ? "heard" : s));
    });
  };

  const togglePause = () => {
    if (!speaking.current) return;
    if (paused) speaking.current.resume();
    else speaking.current.pause();
    setPaused(!paused);
  };

  const toQuestions = () => {
    if (!round) return;
    const now = performance.now();
    if (round.way === "eyes") roundMs.current = now - started.current;
    else if (voiceMs.current != null) roundMs.current = voiceMs.current;
    else {
      // Went on before the voice finished: what was left, at the voice's
      // measured pace if there is one, else at the pace it kept so far.
      const at = Math.max(1, cur + 1);
      const so = now - started.current;
      const pace =
        results.find((r) => r.way === "ears")?.wpm ?? tryWpm ?? null;
      leftEarly.current = pace
        ? ((ws.length - at) / pace) * 60
        : ((ws.length - at) * (so / at)) / 1000;
      roundMs.current = so;
      speaking.current?.stop();
    }
    speaking.current = null;
    setPaused(false);
    setQi(0);
    setAnswers([]);
    setStep("questions");
  };

  const answer = (shown: number) => {
    if (!round || !passage || busy.current || step !== "questions") return;
    const authored = round.orders[qi][shown];
    busy.current = true;
    setPressed(shown);
    setTimeout(
      () => {
        busy.current = false;
        setPressed(null);
        const next = [...answers, authored];
        if (qi + 1 < passage.questions.length) {
          setAnswers(next);
          setQi(qi + 1);
          return;
        }
        const heard = round.way !== "eyes";
        const res: Result = {
          way: round.way,
          passage: passage.id,
          answers: next,
          matched: matched(next),
          ms: roundMs.current,
          wpm:
            round.way === "eyes"
              ? wpm(ws.length, roundMs.current)
              : heard && voiceMs.current != null
                ? wpm(ws.length, voiceMs.current)
                : null,
          leftEarly: leftEarly.current,
        };
        setResults((r) => [...r, res]);
        setAnswers([]);
        setQi(0);
        setCur(-1);
        setStep("ready");
        if (rounds && ri + 1 < rounds.length) setRi(ri + 1);
        else setPhase("B");
      },
      reduced ? 60 : 220,
    );
  };

  const answerRef = useRef(answer);
  answerRef.current = answer;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT")) return;
      const v = Number(e.key);
      if (step === "questions" && Number.isInteger(v) && v >= 1 && v <= 3)
        answerRef.current(v - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const again = () => {
    speaking.current?.stop();
    speaking.current = null;
    setRounds(
      draw(PASSAGES, Math.random, voiceState === "ready" ? WAYS : ["eyes"]),
    );
    setRi(0);
    setStep("ready");
    setQi(0);
    setAnswers([]);
    setCur(-1);
    setResults([]);
    setPhase("A");
    shownPhase.current = "A";
    document
      .getElementById("un-top")
      ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  };

  const stateA = phase === "A" ? "active" : "done";
  const stateB = phase === "B" ? "active" : "locked";
  const q = passage && step === "questions" ? passage.questions[qi] : null;
  const order = round && step === "questions" ? round.orders[qi] : [];

  const scored = results.map((r) => ({ way: r.way, matched: r.matched }));
  const byWay = Object.fromEntries(results.map((r) => [r.way, r])) as Partial<
    Record<Way, Result>
  >;
  const youWpm = byWay.eyes?.wpm ?? null;
  const voiceWpm = byWay.ears?.wpm ?? byWay.both?.wpm ?? tryWpm;
  const current = ARRANGEMENTS.find((a) => a.id === arr) ?? ARRANGEMENTS[0];

  return (
    <main className="un scroll-thin relative h-dvh w-full overflow-y-auto">
      <div id="un-top" className="mx-auto max-w-[80rem] px-5 pb-24 sm:px-10">
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
                unison
              </div>
              <p
                className="hand mt-1 max-w-[27rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                The same words to the eye and the ear at once. Whether it helps
                turns on who is reading and what else is on the page.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/unison" />
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

        {/* ── the sitting, and the voice ──────────────────────────────── */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <section
            className="panel sketched rise relative p-5 sm:p-8"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The sitting"
          >
            <Sketch seed="unison-sitting" draw />
            <Label>reading while listening</Label>
            <p
              className="display mt-4 max-w-[38rem] text-[25px] leading-[1.22] sm:text-[30px]"
              style={{ color: "var(--ink)" }}
            >
              Three short passages: one to read, one to hear, one to read while
              it is read to you.
            </p>
            <p className={lede} style={{ color: "var(--muted)" }}>
              Four questions after each, with no looking back. Then your three
              side by side, and what the studies found for people like the ones
              in them. It keeps nothing.
            </p>
            <ol className="un-protocol mt-6">
              {[
                {
                  code: "A",
                  name: "three rounds",
                  does: "Read, heard, and both at once, in an order drawn for this sitting. The passages are invented, so nothing you already knew answers for you.",
                },
                {
                  code: "B",
                  name: "side by side",
                  does: "How many of the twelve you answered as the passage had it, each way; your pace and the voice's; how far chance alone would spread three rounds.",
                },
                {
                  code: "C",
                  name: "the channels",
                  does: "Seven ways to split words and pictures between the eye and the ear, drawn, with what the studies found for each.",
                },
              ].map((p) => (
                <li key={p.code}>
                  <span className="un-code un-code-small" aria-hidden>
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
            aria-label="The voice"
          >
            <Sketch seed="unison-voice" draw />
            <Label>the voice</Label>
            <p
              className="mt-1 text-[11px]"
              style={{ ...mono, color: "var(--faint)" }}
            >
              {voiceState === "looking"
                ? "looking for a voice on this machine"
                : voiceState === "none"
                  ? "no speaking voice on this machine"
                  : `${voices.length} on this machine · nothing leaves it`}
            </p>
            {voiceState === "none" ? (
              <p
                className="mt-3 text-[13.5px] leading-[1.5]"
                style={{ color: "var(--muted)" }}
              >
                This browser has no voice on this machine to read aloud with, so
                only the reading round can run here. Everything else on the page
                works.
              </p>
            ) : (
              <>
                <p
                  className="mt-3 text-[13.5px] leading-[1.5]"
                  style={{ color: "var(--muted)" }}
                >
                  Nothing plays until you press a play. Set the loudness first.
                </p>
                <label
                  htmlFor="un-voice"
                  className="meta mt-4 block"
                  style={{ color: "var(--muted)" }}
                >
                  voice
                </label>
                <select
                  id="un-voice"
                  className="un-select mt-1"
                  value={voiceURI}
                  disabled={voiceState !== "ready"}
                  onChange={(e) => {
                    setVoiceURI(e.target.value);
                    setTryWpm(null);
                  }}
                >
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} · {v.lang}
                    </option>
                  ))}
                </select>
                <label
                  htmlFor="un-rate"
                  className="meta mt-4 block"
                  style={{ color: "var(--muted)" }}
                >
                  pace ×{rate.toFixed(2)}
                  {tryWpm ? ` · ${tryWpm} words a minute` : ""}
                </label>
                <input
                  id="un-rate"
                  type="range"
                  className="a-dial mt-2"
                  min={0.8}
                  max={1.3}
                  step={0.05}
                  value={rate}
                  disabled={step === "running"}
                  onChange={(e) => {
                    setRate(+e.target.value);
                    setTryWpm(null);
                  }}
                />
                <label
                  htmlFor="un-vol"
                  className="meta mt-4 block"
                  style={{ color: "var(--muted)" }}
                >
                  loudness {Math.round(volume * 100)} of 100
                </label>
                <input
                  id="un-vol"
                  type="range"
                  className="a-dial mt-2"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={volume}
                  disabled={step === "running"}
                  onChange={(e) => setVolume(+e.target.value)}
                />
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Chip
                    onClick={tryVoice}
                    on={trying}
                    disabled={voiceState !== "ready" || step === "running"}
                  >
                    {trying ? "stop" : "hear a line"}
                  </Chip>
                  {broke && (
                    <span
                      role="alert"
                      className="text-[12px]"
                      style={{ ...mono, color: "var(--accent)" }}
                    >
                      the voice stopped; try another
                    </span>
                  )}
                </div>
              </>
            )}
          </section>
        </div>

        {/* ── A · three rounds ────────────────────────────────────────── */}
        <Stage
          id="un-A"
          code="A"
          name="three rounds"
          title={
            phase === "A" && round
              ? rounds && rounds.length > 1
                ? `Round ${ri + 1}: ${WAY_NAME[round.way]}`
                : "One round: read"
              : "Three rounds"
          }
          state={stateA}
        >
          {phase !== "A" ? (
            <p className="un-done">
              {results.length === 1
                ? "One round sat."
                : `${results.length} rounds sat.`}
            </p>
          ) : !rounds || !round || !passage ? (
            <p className="un-done">Drawing the sitting…</p>
          ) : (
            <>
              <RoundMarks rounds={rounds} at={ri} />

              {step === "ready" && (
                <div key={`ready-${ri}`} className="un-in">
                  <p className={lede} style={{ color: "var(--muted)" }}>
                    {round.way === "eyes"
                      ? "Read it once at your own pace, the way you usually read. The passage goes away when you say you are done."
                      : round.way === "ears"
                        ? "The passage is read to you and never shown. You can pause it but not go back."
                        : "The passage is shown and read to you at once, the word being said marked as it goes. Go on whenever you like; the voice stops."}
                  </p>
                  <p
                    className="display mt-5 text-[22px] leading-[1.25]"
                    style={{ color: "var(--ink)" }}
                  >
                    {passage.title}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Chip onClick={begin} accent>
                      {round.way === "eyes" ? "show the passage" : "play"}
                    </Chip>
                    {round.way !== "eyes" && (
                      <span
                        className="text-[12.5px]"
                        style={{ color: "var(--muted)" }}
                      >
                        {voice ? voice.name : "the voice"}, loudness{" "}
                        {Math.round(volume * 100)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {(step === "running" || step === "heard") && (
                <div key={`run-${ri}`} className="un-sheet un-in mt-5">
                  <div className="meta" style={{ color: "var(--muted)" }}>
                    {passage.title}
                  </div>
                  {round.way === "eyes" && (
                    <p className="un-passage mt-3">{passage.text}</p>
                  )}
                  {round.way === "both" && (
                    <p className="un-passage mt-3" aria-live="off">
                      {ws.map((w, i) => (
                        <span key={i}>
                          <span
                            className="un-w"
                            data-now={i === cur ? "" : undefined}
                          >
                            {w.text}
                          </span>{" "}
                        </span>
                      ))}
                    </p>
                  )}
                  {round.way === "ears" && (
                    <p
                      className="un-slugs mt-4"
                      aria-label={`${Math.max(0, Math.min(cur + 1, ws.length))} of ${ws.length} words said`}
                    >
                      {ws.map((w, i) => (
                        <span
                          key={i}
                          className="un-slug"
                          data-said={i <= cur ? "" : undefined}
                          data-now={i === cur ? "" : undefined}
                          style={{
                            width: `${Math.max(2, w.text.length) * 0.46}em`,
                          }}
                        />
                      ))}
                    </p>
                  )}
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    {round.way !== "eyes" && step === "running" && (
                      <Chip onClick={togglePause} on={paused}>
                        {paused ? "go on" : "pause"}
                      </Chip>
                    )}
                    {round.way === "eyes" && (
                      <Chip onClick={toQuestions} accent>
                        done reading
                      </Chip>
                    )}
                    {round.way === "both" && (
                      <Chip onClick={toQuestions} accent>
                        {step === "heard" ? "the questions" : "done, go on"}
                      </Chip>
                    )}
                    {round.way === "ears" && step === "heard" && (
                      <Chip onClick={toQuestions} accent>
                        the questions
                      </Chip>
                    )}
                    {broke && (
                      <span
                        role="alert"
                        className="text-[12px]"
                        style={{ ...mono, color: "var(--accent)" }}
                      >
                        the voice stopped
                        {round.way === "ears" ? "" : "; go on when ready"}
                      </span>
                    )}
                    {broke && round.way === "ears" && (
                      <Chip onClick={toQuestions}>the questions anyway</Chip>
                    )}
                  </div>
                </div>
              )}

              {step === "questions" && q && (
                <div key={`q-${ri}-${qi}`} className="un-sheet un-in mt-5">
                  <div className="meta" style={{ color: "var(--muted)" }}>
                    {passage.title} · question {qi + 1} of{" "}
                    {passage.questions.length}
                  </div>
                  <p
                    className="display mt-2 text-[23px] leading-[1.3] sm:text-[26px]"
                    style={{ color: "var(--ink)" }}
                  >
                    {q.q}
                  </p>
                  <div className="un-opts mt-4" role="group" aria-label={q.q}>
                    {order.map((o, k) => (
                      <button
                        key={o}
                        type="button"
                        className="un-opt"
                        aria-pressed={pressed === k}
                        onClick={() => answer(k)}
                      >
                        <i>{k + 1}</i>
                        <span>{q.options[o]}</span>
                      </button>
                    ))}
                  </div>
                  <p
                    className="mt-3 text-[12.5px]"
                    style={{ color: "var(--muted)" }}
                  >
                    Keys 1 to 3 work too. If you do not know, pick the one that
                    feels nearest.
                  </p>
                </div>
              )}
            </>
          )}
        </Stage>

        {/* ── B · side by side ────────────────────────────────────────── */}
        <Stage
          id="un-B"
          code="B"
          name="side by side"
          title="Side by side"
          state={stateB}
          after="A"
        >
          {phase === "B" && (
            <div className="un-after">
              <div className="un-figs">
                {WAYS.filter((w) => byWay[w]).map((w) => {
                  const r = byWay[w]!;
                  return (
                    <div key={w} data-way={w}>
                      <div className="meta" style={{ color: "var(--muted)" }}>
                        {WAY_NAME[w]}
                      </div>
                      <div className="un-fig">
                        {r.matched}
                        <span className="un-fig-of"> of 4</span>
                      </div>
                      <div className="un-cells" aria-hidden>
                        {r.answers.map((a, i) => (
                          <i key={i} data-on={a === 0 ? "" : undefined} />
                        ))}
                      </div>
                      <div
                        className="mt-2 text-[12.5px] leading-[1.45]"
                        style={{ color: "var(--muted)" }}
                      >
                        {Math.round(r.ms / 1000)} s
                        {r.wpm
                          ? ` · ${r.wpm} words a minute${w === "eyes" ? ", yours" : ", the voice's"}`
                          : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className={para} style={{ color: "var(--ink)" }}>
                {roundsReading(scored)}{" "}
                {scored.length > 1 && spreadReading(scored)}
              </p>
              <p
                className="mt-1 max-w-[40rem] text-[13.5px] leading-[1.55]"
                style={{ color: "var(--muted)" }}
              >
                Guessing alone averages {guessing().toFixed(1)} of 4. Four
                questions a way can say little about you; the studies below used
                dozens to hundreds of readers, and many passages each.
              </p>

              <h3 className={h3} style={{ color: "var(--ink)" }}>
                Who set the pace
              </h3>
              <PaceLine you={youWpm} voice={voiceWpm} />
              <p className={para} style={{ color: "var(--ink)" }}>
                {paceReading({
                  you: youWpm,
                  voice: voiceWpm,
                  average: AVERAGE_WPM,
                  leftEarly: byWay.both?.leftEarly ?? null,
                })}
              </p>

              <h3 className={h3} style={{ color: "var(--ink)" }}>
                What the studies found, for readers like you
              </h3>
              <p className={para} style={{ color: "var(--muted)" }}>
                Adults reading a language they read well. For readers who find
                reading hard, are learning to read, or are learning the
                language, the findings differ; they are with the channels
                below.
              </p>
              <Findings list={FOR_YOU} who={null} />

              <div className="mt-8 flex flex-wrap gap-3">
                <Chip onClick={again}>sit it again with a new draw</Chip>
              </div>
            </div>
          )}
        </Stage>

        {/* ── C · the channels ────────────────────────────────────────── */}
        <Stage
          id="un-C"
          code="C"
          name="the channels"
          title="Seven ways to split it"
          state="active"
        >
          <p className={lede} style={{ color: "var(--muted)" }}>
            What is on the page comes in at the eye and what is said at the ear,
            but printed words are turned into sound on the way in, so they end
            up beside heard ones. Pictures keep a place of their own. Pick an
            arrangement.
          </p>
          <div
            className="mt-5 flex flex-wrap gap-2"
            role="group"
            aria-label="Arrangements"
          >
            {ARRANGEMENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                className="un-pick"
                aria-pressed={arr === a.id}
                onClick={() => setArr(a.id)}
              >
                {a.name}
              </button>
            ))}
          </div>
          <div key={current.id} className="un-in mt-5">
            <Channels a={current} />
            <p
              className="mt-2 max-w-[40rem] text-[12.5px] leading-[1.5]"
              style={{ color: "var(--muted)" }}
            >
              {current.line} A sketch of the working-memory account the studies
              argue from, not a measurement.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="meta mr-1" style={{ color: "var(--muted)" }}>
              the reader
            </span>
            {WHO.map((w) => (
              <Chip
                key={w.id}
                on={who === w.id}
                onClick={() => setWho(who === w.id ? null : w.id)}
              >
                {w.name}
              </Chip>
            ))}
          </div>
          <Findings list={current.findings} who={who} />

          <h3 className={h3} style={{ color: "var(--ink)" }}>
            Sources
          </h3>
          <ol className="un-sources">
            {SOURCES.map((s) => (
              <li key={s.key} id={`un-src-${s.key}`}>
                {s.cite} <em>{s.venue}</em>
                {(s.doi || s.id) && (
                  <>
                    {" "}
                    <span style={mono} className="text-[11.5px]">
                      {s.doi ? `doi:${s.doi}` : s.id}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ol>
        </Stage>
      </div>
    </main>
  );
}
