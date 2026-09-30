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
import {
  FELTS,
  FELT_LABEL,
  emptyAct,
  inOrder,
  markStep,
  moveStep,
  newStep,
  readings,
  recordOf,
  recordReadings,
  spanOf,
  stateOf,
  tally,
  type Act as A,
  type Did,
  type From,
  type State,
  type Step,
} from "@/lib/act";
import { addDays, dayWords, daysBetween } from "@/lib/fence";
import { rand, roughEllipse, seedOf, stroke } from "@/lib/hand";
import { exampleAct } from "@/content/act";
import { putOnDesk } from "./desk";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

type Payload = {
  acts: A[];
  from: From | null;
  note: string;
  writable: boolean;
  dir: string | null;
};

const mono = { fontFamily: "var(--font-mono)" } as const;
const hand = { fontFamily: "var(--font-hand)" } as const;
const chip = "chip ac-seg px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";
const localToday = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const grow = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};
const clip = (s: string, max: number) =>
  s.length <= max ? s : `${s.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** What a thing set down elsewhere is called, when an intention comes from it. */
const FROM_WORDS: Record<string, string> = {
  botec: "the envelope",
  muster: "the claim",
  fence: "the fence",
  way: "the way",
};
const fromWords = (kind: string) => FROM_WORDS[kind] ?? "the stone";

const STATE_WORDS: Record<State, string> = {
  meant: "meant for",
  today: "meant for today",
  due: "past its day",
  done: "done",
  not: "let go",
};

/** The width an element is drawn at, measured whenever it appears or changes size. */
function useWidth<T extends HTMLElement>(): [(el: T | null) => void, number] {
  const [w, setW] = useState(0);
  const ro = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: T | null) => {
    ro.current?.disconnect();
    ro.current = null;
    if (!el) return;
    const measure = () => setW(el.offsetWidth);
    measure();
    ro.current = new ResizeObserver(measure);
    ro.current.observe(el);
  }, []);
  return [ref, w];
}

function Chip({
  children,
  onClick,
  on,
  accent,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  on?: boolean;
  accent?: boolean;
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
      aria-pressed={on}
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

/* ── meant and lived ──────────────────────────────────────────────────── */

/**
 * What was meant beside what was lived: every step's day as planned on the
 * upper line, the day it was done on the lower, a pen line between. A step
 * still to come is dragged along to another day; the day it was meant for
 * stays behind as a ghost.
 */
function MeantLived({
  act,
  today,
  writable,
  picked,
  onMove,
  onPick,
}: {
  act: A;
  today: string;
  writable: boolean;
  picked: string | null;
  onMove: (id: string, day: string, done: boolean) => void;
  onPick: (id: string) => void;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [dragging, setDragging] = useState<string | null>(null);
  const live = useMemo(() => spanOf(act, today), [act, today]);
  const held = useRef(live);
  if (!dragging) held.current = live;
  const span = held.current;
  const narrow = W > 0 && W < 520;
  const H = narrow ? 176 : 196;
  const L = narrow ? 46 : 64;
  const R = 16;
  const meantY = narrow ? 50 : 58;
  const livedY = narrow ? 118 : 134;
  const axisY = H - 26;
  const inner = Math.max(1, W - L - R);
  const cell = inner / span.days;
  const x = (d: string) => L + (daysBetween(span.from, d) + 0.5) * cell;
  const steps = useMemo(() => inOrder(act.steps), [act.steps]);
  const seed = seedOf(`act ${act.slug || act.put}`);
  const every = cell >= 34 ? 1 : cell >= 17 ? 2 : 7;

  const start = (e: ReactPointerEvent<SVGGElement>, s: Step) => {
    const st = stateOf(s, today);
    if (!writable || e.button !== 0 || st === "done" || st === "not") {
      onPick(s.id);
      return;
    }
    e.preventDefault();
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const x0 = e.clientX;
    let moved = false;
    let last = s.day;
    const at = (cx: number) => {
      const k = Math.floor((cx - box.left - L) / cell);
      return addDays(span.from, Math.max(0, Math.min(span.days - 1, k)));
    };
    const move = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - x0) < 4) return;
      if (!moved) {
        moved = true;
        setDragging(s.id);
      }
      const d = at(ev.clientX);
      if (d !== last) {
        last = d;
        onMove(s.id, d, false);
      }
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      setDragging(null);
      if (moved) onMove(s.id, last, true);
      else onPick(s.id);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  // Labels over the rings, left to right, only where there is room for them.
  let lastLabel = -Infinity;
  const r = rand(seed);
  return (
    <div ref={ref} className="relative w-full">
      {W > 0 && (
        <svg
          width={W}
          height={H}
          className={`ac-plot block ${dragging ? "ac-dragging" : ""}`}
          role="img"
          aria-label={`${steps.length} steps, what was meant above and what was lived below`}
        >
          <text
            x={0}
            y={meantY + 5}
            style={{ ...hand, fontSize: 16 }}
            fill="var(--muted)"
          >
            meant
          </text>
          <text
            x={0}
            y={livedY + 5}
            style={{ ...hand, fontSize: 16 }}
            fill="var(--muted)"
          >
            lived
          </text>
          <path
            d={stroke([L - 6, meantY], [W - R + 4, meantY], r, 0.7, 0)}
            className="ac-rail"
          />
          <path
            d={stroke([L - 6, livedY], [W - R + 4, livedY], r, 0.7, 0)}
            className="ac-rail"
          />
          <path
            d={stroke([L - 6, axisY], [W - R + 4, axisY], r, 0.5, 0)}
            className="ac-axis"
          />
          {Array.from({ length: span.days }, (_, i) => {
            const d = addDays(span.from, i);
            const cx = L + (i + 0.5) * cell;
            const label = i % every === 0 || d === today;
            return (
              <g key={d} transform={`translate(${cx} ${axisY})`}>
                <line y1={-3} y2={3} className="ac-tick" />
                {d === act.put ? (
                  <text
                    y={17}
                    textAnchor="middle"
                    style={{ ...hand, fontSize: 13 }}
                    fill="var(--muted)"
                  >
                    set down
                  </text>
                ) : (
                  label &&
                  d !== today && (
                    <text
                      y={17}
                      textAnchor="middle"
                      style={{ ...hand, fontSize: 13 }}
                      fill="var(--faint)"
                    >
                      {dayWords(d)}
                    </text>
                  )
                )}
              </g>
            );
          })}
          <g transform={`translate(${x(act.put)} ${axisY})`}>
            <path d="M0 -8 L0 0" className="ac-put" />
          </g>
          {daysBetween(span.from, today) >= 0 &&
            daysBetween(today, span.to) > 0 && (
              <g transform={`translate(${x(today)} 0)`}>
                <line y1={16} y2={axisY} className="ac-today" />
                <text
                  y={11}
                  textAnchor="middle"
                  style={{ ...hand, fontSize: 14 }}
                  fill="var(--accent)"
                >
                  today
                </text>
              </g>
            )}
          {steps.map((s, i) => {
            const st = stateOf(s, today);
            const cx = x(s.day);
            const ghosts = s.moved.map((d) => x(d));
            const rr = rand(seedOf(`${s.id} ${seed}`));
            const ring = roughEllipse(20, 20, seedOf(`ring ${s.id}`), {
              wobble: 0.8,
              pad: 0,
              steps: 12,
            });
            const showLabel = cx - lastLabel > 86 && st !== "not";
            if (showLabel) lastLabel = cx;
            const on = s.did === "done" ? x(s.on) : null;
            return (
              <g
                key={s.id}
                className="ac-step"
                data-state={st}
                data-picked={picked === s.id || undefined}
              >
                {ghosts.map((gx, k) => (
                  <g key={k}>
                    <circle cx={gx} cy={meantY} r={9} className="ac-ghost" />
                    <path
                      d={`M${gx + 10} ${meantY}L${(k + 1 < ghosts.length ? ghosts[k + 1] : cx) - 12} ${meantY}`}
                      className="ac-moved"
                    />
                  </g>
                ))}
                {on !== null && (
                  <>
                    <path
                      d={stroke(
                        [cx, meantY + 11],
                        [on, livedY - 7],
                        rr,
                        0.9,
                        0,
                      )}
                      pathLength={1}
                      className="ac-drop"
                      style={{
                        animationDelay: reducedMotion()
                          ? "0ms"
                          : `${120 + i * 90}ms`,
                      }}
                    />
                    <circle cx={on} cy={livedY} r={7} className="ac-lived" />
                  </>
                )}
                {st === "not" && (
                  <>
                    <path
                      d={stroke(
                        [cx, meantY + 11],
                        [cx, (meantY + livedY) / 2],
                        rr,
                        0.6,
                        0,
                      )}
                      className="ac-letgo"
                    />
                    <path
                      d={`M${cx - 4} ${(meantY + livedY) / 2 - 4}l8 8M${cx + 4} ${(meantY + livedY) / 2 - 4}l-8 8`}
                      className="ac-letgo"
                    />
                  </>
                )}
                <g
                  transform={`translate(${cx - 10} ${meantY - 10})`}
                  onPointerDown={(e) => start(e, s)}
                  className={
                    writable && st !== "done" && st !== "not"
                      ? "ac-handle"
                      : "ac-pick"
                  }
                >
                  <title>{`${s.will || "a step"}${s.when ? ` — when ${s.when}` : ""} · ${STATE_WORDS[st]}${st === "meant" ? ` ${dayWords(s.day)}` : st === "done" ? ` ${dayWords(s.on)}` : ""}${s.lived ? ` · ${s.lived}` : ""}`}</title>
                  <rect
                    x={-6}
                    y={-6}
                    width={32}
                    height={32}
                    fill="transparent"
                  />
                  <circle cx={10} cy={10} r={10} className="ac-ring-fill" />
                  <path d={ring} className="ac-ring" />
                  <text
                    x={10}
                    y={14.5}
                    textAnchor="middle"
                    style={{ ...hand, fontSize: 14 }}
                    className="ac-num"
                  >
                    {i + 1}
                  </text>
                </g>
                {showLabel && (
                  <text
                    x={cx}
                    y={meantY - 17}
                    textAnchor="middle"
                    style={{ ...hand, fontSize: 13.5 }}
                    className="ac-label"
                  >
                    {clip(s.will.trim() || "a step", narrow ? 12 : 20)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

/* ── a step ───────────────────────────────────────────────────────────── */

function StepRow({
  s,
  n,
  first,
  today,
  writable,
  picked,
  obstacle,
  onChange,
  onDay,
  onMark,
  onRemove,
  onEnter,
}: {
  s: Step;
  n: number;
  first: boolean;
  today: string;
  writable: boolean;
  picked: boolean;
  obstacle: boolean;
  onChange: (p: Partial<Step>, done: boolean) => void;
  onDay: (day: string) => void;
  onMark: (did: Did) => void;
  onRemove: () => void;
  onEnter: () => void;
}) {
  const st = stateOf(s, today);
  const ink = (on: boolean) => (on ? "var(--ink)" : "var(--faint)");
  // The cue and the action wrap as they grow; the place is a word or two.
  const input = (
    key: "when" | "will" | "where",
    placeholder: string,
    cls: string,
  ) => {
    const common = {
      value: s[key],
      readOnly: !writable,
      onBlur: () => onChange({}, true),
      onKeyDown: (
        e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        if (key === "will") onEnter();
        else if (key === "when")
          (
            e.currentTarget
              .closest("li")
              ?.querySelector("[data-will]") as HTMLElement | null
          )?.focus();
      },
      "data-will": key === "will" || undefined,
      placeholder: writable ? placeholder : "",
      "aria-label": `Step ${n}: ${key === "will" ? "what you will do" : key === "when" ? "when" : "where"}`,
      spellCheck: false,
      autoComplete: "off",
    };
    return key === "where" ? (
      <input
        {...common}
        onChange={(e) => onChange({ where: e.target.value }, false)}
        className={`ac-in hand ${cls}`}
      />
    ) : (
      <textarea
        {...common}
        ref={(el) => grow(el)}
        rows={1}
        onInput={(e) => grow(e.currentTarget)}
        onChange={(e) =>
          onChange({ [key]: e.target.value.replace(/\n/g, " ") }, false)
        }
        className={`ac-in hand resize-none overflow-hidden leading-[1.3] ${cls}`}
      />
    );
  };
  return (
    <li
      id={`ac-step-${s.id}`}
      className="ac-row relative py-3"
      data-state={st}
      data-picked={picked || undefined}
      style={{ borderTop: "1px solid var(--rule)" }}
    >
      <div className="flex items-baseline gap-2">
        <span className="ac-n hand shrink-0 text-[17px]" aria-hidden>
          {n}
        </span>
        {/* Each clause holds together, and a narrow sheet puts the second under the first. */}
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1 text-[19px]">
          <span className="flex min-w-[12.5rem] flex-1 items-baseline gap-1.5">
            <span className="hand shrink-0" style={{ color: "var(--muted)" }}>
              when
            </span>
            {input(
              "when",
              "a time, a place, or after something",
              "min-w-0 flex-1",
            )}
          </span>
          <span className="flex min-w-[14.5rem] flex-[1.4] items-baseline gap-1.5">
            <span className="hand shrink-0" style={{ color: "var(--muted)" }}>
              then I will
            </span>
            {input(
              "will",
              first
                ? "the smallest thing you could do first"
                : "what you will do",
              "min-w-0 flex-1",
            )}
          </span>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 pl-6">
        <input
          type="date"
          value={s.day}
          readOnly={!writable}
          disabled={!writable || s.did !== ""}
          onChange={(e) => e.target.value && onDay(e.target.value)}
          aria-label={`Step ${n}: the day you mean to do it`}
          className="ac-date"
          style={mono}
        />
        <span className="inline-flex items-baseline gap-1.5">
          <span className="hand text-[16px]" style={{ color: "var(--muted)" }}>
            at
          </span>
          {input("where", "where", "w-[8.5rem] text-[16px]")}
        </span>
        <span className="inline-flex items-baseline gap-1.5">
          <input
            value={s.minutes ?? ""}
            readOnly={!writable}
            inputMode="numeric"
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              onChange({ minutes: v ? Number(v) : null }, false);
            }}
            onBlur={() => onChange({}, true)}
            placeholder={writable ? "–" : ""}
            aria-label={`Step ${n}: minutes`}
            className="ac-in hand w-[2.6rem] text-right text-[16px]"
          />
          <span className="hand text-[16px]" style={{ color: "var(--muted)" }}>
            min
          </span>
        </span>
        <span className="flex-1" />
        <span
          className="meta"
          style={{
            color:
              st === "due" || st === "today" ? "var(--accent)" : "var(--faint)",
            textTransform: "none",
            letterSpacing: "0.04em",
          }}
        >
          {st === "meant"
            ? `${STATE_WORDS.meant} ${dayWords(s.day)}`
            : st === "done"
              ? `done ${dayWords(s.on)}${s.on !== s.day ? ` · meant ${dayWords(s.day)}` : ""}`
              : st === "not"
                ? `let go ${dayWords(s.on)}`
                : STATE_WORDS[st]}
          {s.moved.length
            ? ` · moved ${s.moved.length === 1 ? "once" : `${s.moved.length} times`}`
            : ""}
        </span>
        {writable && (
          <span className="inline-flex gap-1">
            {s.did ? (
              <button
                onClick={() => onMark("")}
                className={chip}
                style={{ ...mono, color: "var(--muted)" }}
              >
                take back
              </button>
            ) : (
              <>
                <button
                  onClick={() => onMark("done")}
                  className={chip}
                  style={{
                    ...mono,
                    color: "var(--ink)",
                    borderColor: "var(--ink)",
                  }}
                >
                  done
                </button>
                <button
                  onClick={() => onMark("not")}
                  className={chip}
                  style={{ ...mono, color: "var(--muted)" }}
                >
                  let go
                </button>
              </>
            )}
            <button
              onClick={onRemove}
              className="ac-x"
              style={mono}
              aria-label={`Take step ${n} off`}
              title="take the step off"
            >
              ×
            </button>
          </span>
        )}
      </div>
      {s.did && (
        <div className="ac-lived-row mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1.5 pl-6">
          <input
            value={s.lived}
            readOnly={!writable}
            onChange={(e) => onChange({ lived: e.target.value }, false)}
            onBlur={() => onChange({}, true)}
            placeholder={
              writable
                ? s.did === "done"
                  ? "what it was like, in your words"
                  : "what stood in the way"
                : ""
            }
            aria-label={`Step ${n}: what it was like`}
            spellCheck={false}
            className="ac-in hand min-w-[12rem] flex-1 text-[17px]"
          />
          {s.did === "done" && (
            <span
              role="group"
              aria-label="How it was"
              className="inline-flex flex-wrap items-baseline gap-x-2"
            >
              {FELTS.map((f) => (
                <button
                  key={f}
                  onClick={() =>
                    writable && onChange({ felt: s.felt === f ? "" : f }, true)
                  }
                  disabled={!writable}
                  aria-pressed={s.felt === f}
                  className="ac-felt hand relative text-[15px]"
                  style={{ color: ink(s.felt === f) }}
                >
                  {FELT_LABEL[f]
                    .replace(" than I thought", "")
                    .replace("as I thought", "as thought")}
                  {s.felt === f && (
                    <Sketch
                      kind="underline"
                      seed={`${s.id}-${f}`}
                      color="var(--accent)"
                      draw
                    />
                  )}
                </button>
              ))}
            </span>
          )}
          {obstacle && (
            <label
              className="hand inline-flex items-center gap-1.5 text-[15px]"
              style={{ color: ink(s.met) }}
            >
              <input
                type="checkbox"
                checked={s.met}
                disabled={!writable}
                onChange={(e) => onChange({ met: e.target.checked }, true)}
                className="ac-check"
              />
              what stands in the way showed up
            </label>
          )}
        </div>
      )}
    </li>
  );
}

/* ── the view ─────────────────────────────────────────────────────────── */

/**
 * The act: an intention, what would come of it and what stands in the way,
 * the steps as if-then plans on real days, drawn meant above and lived below;
 * each step marked when it is done in the world, with what it was like; and
 * afterwards, the after-action review. The desk reads it back and keeps the
 * record.
 */
export default function Act() {
  const [theme, setTheme] = useTheme();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [open, setOpen] = useState<A | null>(null);
  const [kept, setKept] = useState(false);
  const [example, setExample] = useState(false);
  const [note, setNote] = useState("");
  const [trouble, setTrouble] = useState<string | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const openRef = useRef<A | null>(null);
  const keptRef = useRef(false);
  const slugRef = useRef("");
  const dirty = useRef(false);
  // Counts the changes, so a save that lands after another change does not mark that one kept.
  const rev = useRef(0);
  const dragFrom = useRef<{ id: string; day: string } | null>(null);
  const saving = useRef<Promise<void>>(Promise.resolve());
  const intentionRef = useRef<HTMLTextAreaElement | null>(null);
  openRef.current = open;
  keptRef.current = kept;
  const writable = payload?.writable ?? false;
  const today = useMemo(localToday, []);

  const fresh = useCallback(
    (asExample = false, from: From | null = null, about = "") => {
      setNote(about);
      const day = localToday();
      slugRef.current = "";
      dirty.current = false;
      setKept(false);
      setExample(asExample && !from);
      setOpen(asExample && !from ? exampleAct(day) : emptyAct(day, from));
      setSure(null);
      setTrouble(null);
      if (!asExample)
        window.setTimeout(() => intentionRef.current?.focus(), 60);
    },
    [],
  );
  const load = useCallback((a: A) => {
    slugRef.current = a.slug;
    dirty.current = false;
    setKept(true);
    setExample(false);
    setNote("");
    setOpen(a);
    setSure(null);
    setTrouble(null);
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const slug = p.get("slug");
    const id = p.get("id");
    const botec = p.get("botec");
    const q = id
      ? `?id=${encodeURIComponent(id)}`
      : botec
        ? `?botec=${encodeURIComponent(botec)}`
        : "";
    fetch(`/api/act${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((pl: Payload | null) => {
        if (!pl) {
          setTrouble("the intentions could not be read");
          return;
        }
        setPayload(pl);
        const wanted = slug ? pl.acts.find((x) => x.slug === slug) : null;
        const t = localToday();
        const going = pl.acts.find((a) =>
          a.steps.some((s) => {
            const st = stateOf(s, t);
            return st === "meant" || st === "today" || st === "due";
          }),
        );
        if (wanted) load(wanted);
        else if (pl.from) {
          fresh(false, pl.from, pl.note);
        } else if (going) load(going);
        else if (pl.acts[0]) load(pl.acts[0]);
        else fresh(true);
      })
      .catch(() => setTrouble("the intentions could not be read"));
  }, [fresh, load]);

  // Only once the intentions are read: in development React mounts twice, and a sync on the
  // first mount would take the slug off the address before the second could read it.
  const loaded = payload !== null;
  useEffect(() => {
    if (!loaded) return;
    const url = new URL(window.location.href);
    if (kept && open?.slug) url.searchParams.set("slug", open.slug);
    else url.searchParams.delete("slug");
    if (kept) {
      url.searchParams.delete("id");
      url.searchParams.delete("botec");
    }
    window.history.replaceState(null, "", url);
    putOnDesk(
      kept && open
        ? { kind: "act", id: open.slug, label: open.intention.slice(0, 60) }
        : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, kept, open?.slug]);
  useEffect(() => () => putOnDesk(null), []);

  /* ── keeping ─────────────────────────────────────────────────────────── */

  const save = useCallback(
    (a: A) =>
      new Promise<A | null>((resolve) => {
        const at = rev.current;
        saving.current = saving.current.then(async () => {
          const isFresh = !slugRef.current;
          try {
            const r = await fetch("/api/act", {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                act: { ...a, slug: slugRef.current, touched: localToday() },
                fresh: isFresh,
              }),
            });
            const out = (await r.json().catch(() => null)) as
              A | { error: string } | null;
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
            setExample(false);
            setTrouble(null);
            setOpen((cur) =>
              cur
                ? { ...cur, slug: out.slug, put: out.put, touched: out.touched }
                : cur,
            );
            setPayload((p) =>
              p
                ? {
                    ...p,
                    acts: [out, ...p.acts.filter((x) => x.slug !== out.slug)],
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

  /** A change on the sheet; kept when it is finished, if the intention is kept. */
  const edit = useCallback(
    (f: (a: A) => A, done?: boolean) => {
      const cur = openRef.current;
      if (!cur) return;
      const next = f(cur);
      if (next !== cur) {
        // The ref moves now, not on the next render, so a second edit before then builds on this one.
        openRef.current = next;
        dirty.current = true;
        rev.current++;
        setOpen(next);
        setExample(false);
        setSure(null);
      }
      if (done && dirty.current && keptRef.current && writable)
        void save(openRef.current!);
    },
    [save, writable],
  );
  const setStep = (id: string, p: Partial<Step>, done: boolean) =>
    edit(
      (a) => ({
        ...a,
        steps: a.steps.map((s) => (s.id === id ? { ...s, ...p } : s)),
      }),
      done,
    );
  const setDay = (id: string, day: string) =>
    edit(
      (a) => ({
        ...a,
        steps: a.steps.map((s) => (s.id === id ? moveStep(s, day) : s)),
      }),
      true,
    );
  const onMove = (id: string, day: string, done: boolean) => {
    const cur = openRef.current?.steps.find((s) => s.id === id);
    if (!cur) return;
    if (!dragFrom.current || dragFrom.current.id !== id)
      dragFrom.current = { id, day: cur.day };
    if (!done) {
      edit(
        (a) => ({
          ...a,
          steps: a.steps.map((s) => (s.id === id ? { ...s, day } : s)),
        }),
        false,
      );
      return;
    }
    const from = dragFrom.current.day;
    dragFrom.current = null;
    edit(
      (a) => ({
        ...a,
        steps: a.steps.map((s) =>
          s.id === id ? moveStep({ ...s, day: from }, day) : s,
        ),
      }),
      true,
    );
  };
  const mark = (id: string, did: Did) =>
    edit(
      (a) => ({
        ...a,
        steps: a.steps.map((s) =>
          s.id === id ? markStep(s, did, localToday()) : s,
        ),
      }),
      true,
    );
  const addStep = () => {
    const a = openRef.current;
    if (!a) return;
    const last = inOrder(a.steps).at(-1);
    const day = last && last.day >= today ? addDays(last.day, 1) : today;
    const s = newStep(day);
    edit((x) => ({ ...x, steps: [...x.steps, s] }), true);
    window.setTimeout(
      () =>
        (
          document.querySelector(
            `#ac-step-${s.id} input`,
          ) as HTMLInputElement | null
        )?.focus(),
      40,
    );
  };
  const removeStep = (id: string) =>
    edit((a) => ({ ...a, steps: a.steps.filter((s) => s.id !== id) }), true);
  const pick = (id: string) => {
    setPicked(id);
    document.getElementById(`ac-step-${id}`)?.scrollIntoView({
      behavior: reducedMotion() ? "auto" : "smooth",
      block: "center",
    });
    window.setTimeout(() => setPicked((p) => (p === id ? null : p)), 1400);
  };
  const setDown = () => {
    const a = openRef.current;
    if (!a || !writable) return;
    if (!a.intention.trim()) {
      setTrouble("say what you mean to do, in a line");
      intentionRef.current?.focus();
      return;
    }
    void save(a);
  };
  const remove = useCallback(async () => {
    const a = openRef.current;
    if (!a || !writable || !keptRef.current) return;
    const r = await fetch(`/api/act?slug=${encodeURIComponent(a.slug)}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      setTrouble(`not taken off (${r.status})`);
      return;
    }
    setPayload((p) =>
      p ? { ...p, acts: p.acts.filter((x) => x.slug !== a.slug) } : p,
    );
    fresh();
  }, [writable, fresh]);

  /* ── the reading ─────────────────────────────────────────────────────── */

  const words = useMemo(
    () => (open ? readings(open, today) : []),
    [open, today],
  );
  const acts = payload?.acts ?? [];
  const record = useMemo(
    () => recordReadings(recordOf(acts, today)),
    [acts, today],
  );
  const steps = useMemo(() => (open ? inOrder(open.steps) : []), [open]);
  const hasObstacle = !!open?.obstacle.trim();

  const field = (
    key: "outcome" | "obstacle" | "then",
    label: string,
    placeholder: string,
  ) =>
    open && (
      <label className="block">
        <span className="meta" style={{ color: "var(--faint)" }}>
          {label}
        </span>
        <textarea
          ref={(el) => grow(el)}
          onInput={(e) => grow(e.currentTarget)}
          value={open[key]}
          readOnly={!writable}
          onChange={(e) =>
            edit((a) => ({ ...a, [key]: e.target.value }), false)
          }
          onBlur={() => edit((a) => a, true)}
          rows={1}
          placeholder={writable ? placeholder : ""}
          className="ac-case hand mt-0.5 w-full resize-none overflow-hidden bg-transparent px-0 py-0.5 text-[18.5px] leading-[1.35]"
          style={{ color: "var(--ink)" }}
        />
      </label>
    );

  const review = (key: keyof A["after"], label: string) =>
    open && (
      <label className="block">
        <span className="meta" style={{ color: "var(--faint)" }}>
          {label}
        </span>
        <textarea
          ref={(el) => grow(el)}
          onInput={(e) => grow(e.currentTarget)}
          value={open.after[key]}
          readOnly={!writable}
          onChange={(e) =>
            edit(
              (a) => ({ ...a, after: { ...a.after, [key]: e.target.value } }),
              false,
            )
          }
          onBlur={() => edit((a) => a, true)}
          rows={2}
          placeholder={writable ? "in your words" : ""}
          className="ac-case mt-1 w-full resize-none overflow-hidden bg-transparent px-0 py-1 text-[15px] leading-[1.55]"
          style={{ color: "var(--ink)" }}
        />
      </label>
    );

  return (
    <main className="act scroll-thin relative h-dvh w-full overflow-y-auto">
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
                act
              </div>
              <p
                className="hand mt-1 max-w-[31rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                From intention to action: what you mean to do, the steps as
                if-then plans on real days, and — once they are done in the
                world — what it was like.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/act" />
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
            aria-label="The intention"
          >
            <Sketch seed={`act-${open?.slug || "fresh"}`} draw />
            {!open ? (
              <p className="meta" style={{ color: "var(--faint)" }}>
                {trouble ?? "reading…"}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    {kept
                      ? `an intention · set down ${dayWords(open.put)}`
                      : example
                        ? "an example — running again"
                        : "a new intention"}
                    {open.from && (
                      <>
                        {` · from ${fromWords(open.from.kind)}: `}
                        <Link
                          href={open.from.url || "/"}
                          className="ac-link"
                          style={{ color: "var(--ink)", textTransform: "none" }}
                        >
                          {clip(open.from.label, 56)}
                        </Link>
                      </>
                    )}
                  </div>
                  {(kept || example) && writable && (
                    <Chip onClick={() => fresh()}>a new intention</Chip>
                  )}
                </div>
                {note && !kept && (
                  <p
                    className="hand mt-1 text-[15px] leading-[1.3]"
                    style={{ color: "var(--muted)" }}
                  >
                    {note}
                  </p>
                )}
                {example && (
                  <p
                    className="hand mt-1 text-[14.5px] leading-[1.3]"
                    style={{ color: "var(--faint)" }}
                  >
                    An example, set from today. Write over it, or start a new
                    one; nothing is kept until you set it down.
                  </p>
                )}

                <textarea
                  ref={(el) => {
                    intentionRef.current = el;
                    grow(el);
                  }}
                  onInput={(e) => grow(e.currentTarget)}
                  value={open.intention}
                  onChange={(e) =>
                    edit((a) => ({ ...a, intention: e.target.value }), false)
                  }
                  onBlur={() => edit((a) => a, true)}
                  readOnly={!writable}
                  rows={1}
                  placeholder={
                    open.from
                      ? "what will you do about it? in a line"
                      : "what do you mean to do? in a line"
                  }
                  aria-label="What you mean to do"
                  className="display ac-case mt-3 w-full resize-none overflow-hidden bg-transparent px-0 py-1 text-[27px] leading-[1.2] sm:text-[32px]"
                  style={{ color: "var(--ink)" }}
                />

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {field(
                    "outcome",
                    "the best that would come of it",
                    "in a line",
                  )}
                  {field(
                    "obstacle",
                    "what in you would stand in the way",
                    "not the weather — you",
                  )}
                  {field(
                    "then",
                    "if it does, I will",
                    "the one thing you will do then",
                  )}
                </div>

                <div className="mt-6">
                  <MeantLived
                    act={open}
                    today={today}
                    writable={writable}
                    picked={picked}
                    onMove={onMove}
                    onPick={pick}
                  />
                </div>

                <div className="mt-4 flex items-baseline justify-between gap-3">
                  <Label>the steps</Label>
                  <span
                    className="meta"
                    style={{
                      color: "var(--faint)",
                      textTransform: "none",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {tally(open, today).steps
                      ? "drag a step along the line to another day"
                      : "when this happens, I will do that — on a day"}
                  </span>
                </div>
                <ol className="mt-2">
                  {steps.map((s, i) => (
                    <StepRow
                      key={s.id}
                      s={s}
                      n={i + 1}
                      first={i === 0}
                      today={today}
                      writable={writable}
                      picked={picked === s.id}
                      obstacle={hasObstacle}
                      onChange={(p, done) => setStep(s.id, p, done)}
                      onDay={(d) => setDay(s.id, d)}
                      onMark={(did) => mark(s.id, did)}
                      onRemove={() => removeStep(s.id)}
                      onEnter={addStep}
                    />
                  ))}
                </ol>
                {writable && (
                  <button
                    onClick={addStep}
                    className="ac-add hand mt-2 text-[17px]"
                  >
                    + a step
                  </button>
                )}

                {!kept && writable && (
                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    <Chip onClick={setDown} on={!!open.intention.trim()}>
                      set it down
                    </Chip>
                    <span
                      className="meta"
                      style={{
                        color: "var(--faint)",
                        textTransform: "none",
                        letterSpacing: "0.02em",
                      }}
                    >
                      one file in the vault; marked as you go
                    </span>
                  </div>
                )}

                {kept && (
                  <div
                    className="mt-8 pt-5"
                    style={{ borderTop: "1px solid var(--rule)" }}
                  >
                    <Label>afterwards</Label>
                    <p
                      className="hand mt-1 text-[14.5px] leading-[1.3]"
                      style={{ color: "var(--faint)" }}
                    >
                      the after-action review: four questions, in your words,
                      whenever you are ready
                    </p>
                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      {review("meant", "what was meant to happen")}
                      {review("happened", "what happened")}
                      {review("difference", "what made the difference")}
                      {review("keep", "what I would keep")}
                    </div>
                  </div>
                )}

                {kept && writable && (
                  <div className="mt-6 flex flex-wrap gap-1.5">
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
                    className="meta mt-3"
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
              <Sketch seed="act-reading" draw />
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
              <Sketch seed="act-record" draw />
              <Label>the record</Label>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                {payload ? record.join(" · ") : "reading…"}
              </p>
              {acts.length > 0 && (
                <ol className="mt-2 flex flex-col">
                  {acts.slice(0, 30).map((a, i) => {
                    const on = kept && open?.slug === a.slug;
                    const t = tally(a, today);
                    const next = inOrder(a.steps).find((s) => {
                      const st = stateOf(s, today);
                      return st === "meant" || st === "today";
                    });
                    return (
                      <li
                        key={a.slug}
                        className="ac-rec"
                        style={{ ["--i" as string]: i }}
                      >
                        <button
                          onClick={() => load(a)}
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
                            {dayWords(a.put)} · {t.done} of {t.steps} done
                            {t.due
                              ? ` · ${t.due} past ${t.due === 1 ? "its" : "their"} day`
                              : ""}
                          </span>
                          <span
                            className="display text-[15.5px] leading-[1.25]"
                            style={{ color: "var(--ink)" }}
                          >
                            {a.intention}
                          </span>
                          {next && (
                            <span
                              className="hand text-[14.5px]"
                              style={{ color: "var(--muted)" }}
                            >
                              next: {clip(next.will || "a step", 40)},{" "}
                              {daysBetween(today, next.day) === 0
                                ? "today"
                                : dayWords(next.day)}
                            </span>
                          )}
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
              aria-label="What the act holds to"
            >
              <Sketch seed="act-laws" draw />
              <Label>what the act holds to</Label>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                About half of the people who mean to do a thing do not do it;
                the gap between intending and doing is where most decisions
                stop. What closes it best in the research is plain: the best
                that would come of it set against what in you would stand in the
                way, and a plan for when it does; then each step as an if-then —
                when this happens, I will do that — on a real day.
              </p>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                The sheet holds what you meant beside what you lived and counts
                the difference. It sends nothing, reminds you of nothing, keeps
                no streak and never says what to do, whether a step was enough,
                or whether you kept to it well.
              </p>
              <p
                className="meta mt-3"
                style={{ color: "var(--faint)", textTransform: "none" }}
              >
                Paschal Sheeran, Intention–behavior relations (2002) · Peter
                Gollwitzer, Implementation intentions (1999) · Gabriele
                Oettingen, Rethinking Positive Thinking (2014) · the
                after-action review
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
