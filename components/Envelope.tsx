"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  OPS,
  OP_WORD,
  above,
  axisOf,
  breakDown,
  flatten,
  fmt,
  insertAfter,
  newLine,
  nudge,
  opOf,
  outdent,
  patchLine,
  place,
  readGuess,
  removeLine,
  shift,
  stackDots,
  summarise,
  swingOf,
  unplace,
  work,
  writeEnd,
  writeGuess,
  type Axis,
  type Botec,
  type Guess,
  type Line,
  type Summary,
} from "@/lib/botec";
import { rand, seedOf, stroke } from "@/lib/hand";

const mono = { fontFamily: "var(--font-mono)" } as const;
const hand = { fontFamily: "var(--font-hand)" } as const;
type Which = "lo" | "hi" | "both";

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

/** Keeps a scale still while something is being dragged, widening it only if the drawing runs off it. */
function useSteadyAxis(values: number[], hold: boolean): Axis | null {
  const kept = useRef<Axis | null>(null);
  const fresh = useMemo(() => axisOf(values), [values]);
  if (!hold || !kept.current || !fresh) {
    kept.current = fresh;
    return fresh;
  }
  const k = kept.current;
  const inside = values.every(
    (v) => !Number.isFinite(v) || (v >= k.lo && v <= k.hi && (!k.log || v > 0)),
  );
  if (!inside) kept.current = axisOf([...values, k.lo, k.hi]);
  return kept.current;
}

/**
 * The back of an envelope: the top flap's V in the band above the question and
 * the bottom flap's in the band under the last line, drawn faintly and never
 * through anything written; the top one is drawn on when the envelope opens.
 */
function Folds({ seed, band }: { seed: string; band: number }) {
  const [size, setSize] = useState<[number, number] | null>(null);
  const ro = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: SVGSVGElement | null) => {
    ro.current?.disconnect();
    ro.current = null;
    const parent = el?.parentElement;
    if (!parent) return;
    const measure = () =>
      setSize((s) =>
        s && s[0] === parent.offsetWidth && s[1] === parent.offsetHeight
          ? s
          : [parent.offsetWidth, parent.offsetHeight],
      );
    measure();
    ro.current = new ResizeObserver(measure);
    ro.current.observe(parent);
  }, []);
  const d = useMemo(() => {
    if (!size) return null;
    const [w, h] = size;
    const r = rand(seedOf(`folds ${seed}`));
    const v = band - 6;
    return {
      top: `${stroke([0, 1], [w / 2, v], r, 1, 3)}${stroke([w / 2, v], [w, 1], r, 1, 3).replace(/^M/, "L")}`,
      low: `${stroke([0, h - 1], [w / 2, h - v], r, 1, 3)}${stroke([w / 2, h - v], [w, h - 1], r, 1, 3).replace(/^M/, "L")}`,
    };
  }, [size, seed, band]);
  return (
    <svg ref={ref} className="bt-folds" aria-hidden>
      {d && (
        <>
          <path d={d.top} className="bt-flap" pathLength={1} />
          <path d={d.low} pathLength={1} />
        </>
      )}
    </svg>
  );
}

/** A tick on a scale: a thousand as 1k, so the powers of ten read alike. */
const tickWords = (t: number) =>
  t >= 1000 && t < 1e4 ? `${Number((t / 1000).toPrecision(2))}k` : fmt(t);

/** A drag along a number: by ratio for a number above nothing, by amount otherwise; ⇧ or ⌥ for fine. */
function scrubbed(g: Guess, which: Which, dx: number, fine: boolean): Guess {
  const ends =
    g.kind === "range" ? [g.lo.v, g.hi.v] : g.kind === "point" ? [g.at.v] : [];
  if (ends.every((v) => v > 0))
    return nudge(g, which, 2 ** (dx / (fine ? 360 : 90)));
  const scale = Math.max(1, ...ends.map(Math.abs));
  return shift(g, which, (dx * scale) / (fine ? 400 : 100));
}

/**
 * A line's number: typed in place, and — once it reads as a number — shown as
 * it was understood, each end a handle that is dragged sideways. A click that
 * does not drag goes back to the words.
 */
function GuessField({
  value,
  guess,
  writable,
  inputRef,
  onText,
  onScrub,
  onKeyDown,
  onBlur,
  label,
}: {
  value: string;
  guess: Guess;
  writable: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onText: (text: string, done: boolean) => void;
  onScrub: (on: boolean) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  label: string;
}) {
  const [editing, setEditing] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);
  const shown = guess.kind === "point" || guess.kind === "range";
  const minus = (s: string) =>
    s.replace(/^-/, "−").replace(/([^\d])-(\d)/g, "$1−$2");
  const parts: { text: string; which: Which | null }[] =
    guess.kind === "point"
      ? [{ text: minus(`${guess.cur}${writeEnd(guess.at, 4)}`), which: "both" }]
      : guess.kind === "range"
        ? [
            {
              text: minus(`${guess.cur}${writeEnd(guess.lo, 4)}`),
              which: "lo",
            },
            { text: " to ", which: "both" },
            {
              text: minus(`${guess.cur}${writeEnd(guess.hi, 4)}`),
              which: "hi",
            },
          ]
        : [];
  const unit = shown ? guess.unit : "";
  const text = parts.map((p) => p.text).join("") + (unit ? ` ${unit}` : "");
  const chars = Math.max(value.length, shown ? text.length : 0, value ? 1 : 9);

  const start = (e: ReactPointerEvent<HTMLSpanElement>, which: Which) => {
    if (!writable || e.button !== 0) return;
    e.preventDefault();
    const g0 = guess;
    const x0 = e.clientX;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    let moved = false;
    let last = value;
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - x0;
      if (!moved && Math.abs(dx) < 3) return;
      if (!moved) {
        moved = true;
        onScrub(true);
        document.body.classList.add("bt-scrubbing");
      }
      last = writeGuess(scrubbed(g0, which, dx, ev.shiftKey || ev.altKey));
      onText(last, false);
    };
    const onUp = () => {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      document.body.classList.remove("bt-scrubbing");
      if (moved) {
        onScrub(false);
        onText(last, true);
      } else {
        input.current?.focus();
        const n = input.current?.value.length ?? 0;
        input.current?.setSelectionRange(n, n);
      }
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  };

  return (
    <span
      className="bt-guess relative inline-block shrink-0"
      style={{ width: `${chars * 0.46 + 0.6}em` }}
      data-bad={guess.kind === "bad" || undefined}
    >
      <input
        ref={(el) => {
          input.current = el;
          inputRef(el);
        }}
        value={value}
        readOnly={!writable}
        onFocus={() => setEditing(true)}
        onBlur={() => {
          setEditing(false);
          onBlur();
        }}
        onChange={(e) => onText(e.target.value, false)}
        onKeyDown={onKeyDown}
        placeholder={writable ? "20 to 50" : ""}
        aria-label={`${label}: the number, or a range`}
        spellCheck={false}
        autoComplete="off"
        className="bt-value hand w-full"
        style={{ opacity: editing || !shown ? 1 : 0 }}
        title={guess.kind === "bad" ? "this reads as no number" : undefined}
      />
      {!editing && shown && (
        <span className="bt-shown hand" aria-hidden>
          {parts.map((p, i) => (
            <span
              key={i}
              onPointerDown={(e) => p.which && start(e, p.which)}
              className={p.which && p.text.trim() !== "to" ? "bt-num" : "bt-to"}
            >
              {p.text}
            </span>
          ))}
          {unit && (
            <span
              className="bt-unit"
              onPointerDown={(e) => writable && start(e, "both")}
            >{` ${unit}`}</span>
          )}
        </span>
      )}
    </span>
  );
}

/** One row of the ladder: where the chain stands after this line, on the envelope's one scale. */
function Rung({
  ax,
  s,
  w,
  depth,
  answer,
  seed,
}: {
  ax: Axis | null;
  s: Summary | null;
  w: number;
  depth: number;
  answer: boolean;
  seed: string;
}) {
  const H = 30;
  const pad = 6;
  if (!ax || w <= 0)
    return <svg width={w} height={H} className="shrink-0" aria-hidden />;
  const x = (v: number) =>
    pad + Math.min(1.02, Math.max(-0.02, place(ax, v))) * (w - 2 * pad);
  const y = H / 2 + 2;
  const ticks = ax.ticks.map((t) => x(t));
  const ok = s && s.lo > 0;
  const colour = answer
    ? "var(--accent)"
    : depth
      ? "var(--faint)"
      : "var(--ink)";
  const [x1, x2, xm] = ok ? [x(s.lo), x(s.hi), x(s.mid)] : [0, 0, 0];
  const d =
    ok && x2 - x1 > 1.5
      ? stroke([x1, y], [x2, y], rand(seedOf(seed)), 0.5, 0)
      : "";
  const right = xm < w - 64;
  return (
    <svg width={w} height={H} className="shrink-0" aria-hidden>
      {ticks.map((tx, i) => (
        <line key={i} x1={tx} x2={tx} y1={2} y2={H - 2} className="bt-grid" />
      ))}
      {ok && (
        <g className="bt-rung" style={{ color: colour }}>
          {d && (
            <path
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth={answer ? 2.4 : depth ? 1.4 : 1.9}
              strokeLinecap="round"
            />
          )}
          <circle cx={xm} cy={y} r={answer ? 3.4 : 2.6} fill="currentColor" />
          <text
            x={right ? x2 + 6 : x1 - 6}
            y={y + 4.5}
            textAnchor={right ? "start" : "end"}
            style={{ ...hand, fontSize: answer ? 16 : 14.5 }}
            fill="currentColor"
          >
            {fmt(s.mid)}
          </text>
        </g>
      )}
    </svg>
  );
}

type Props = {
  botec: Botec;
  /** A change: `done` when it is finished — a drag let go, a field left, a line added. */
  edit: (f: (b: Botec) => Botec, done?: boolean) => void;
  writable: boolean;
  /** The ladder beside the lines, and more room for the drawing. */
  wide: boolean;
  seed: string;
  /** Bumped to put the cursor on the envelope: the question if it is empty, else the first gap. */
  focus?: number;
  onKeep?: () => void;
};

/**
 * The envelope: the question, the lines as an outline — a sign, what the line
 * is, its number — with where the page stands after each, and the answer as a
 * hundred dots with what it leans on under them. Shared by the strip on every
 * view and the sheet at /botec.
 */
export default function Envelope({
  botec: b,
  edit,
  writable,
  wide,
  seed,
  focus = 0,
  onKeep,
}: Props) {
  const [scrub, setScrub] = useState(false);
  const [dragLine, setDragLine] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const fields = useRef(
    new Map<string, HTMLInputElement | HTMLTextAreaElement>(),
  );
  const pending = useRef<string | null>(null);
  const question = useRef<HTMLTextAreaElement | null>(null);
  const [plotRef, W] = useWidth<HTMLDivElement>();
  const [rootRef, EW] = useWidth<HTMLDivElement>();

  const flat = useMemo(() => flatten(b.lines), [b.lines]);
  // The draws are taken again only when a sign, a number or the shape changes — not a label.
  const shape = useMemo(
    () =>
      JSON.stringify(
        flat.map((f) => [
          f.path,
          f.line.op,
          f.line.lines.length ? "=" : f.line.value,
        ]),
      ),
    [flat],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const worked = useMemo(() => work(b.lines), [shape]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const swing = useMemo(() => swingOf(b.lines), [shape]);
  const s = useMemo(() => summarise(worked.out), [worked]);
  const runs = useMemo(() => {
    const m = new Map<string, Summary | null>();
    for (const r of worked.rows) m.set(r.key, summarise(r.run, 0));
    return m;
  }, [worked]);
  const guesses = useMemo(() => {
    const m = new Map<string, Guess>();
    for (const r of worked.rows) m.set(r.key, r.guess);
    return m;
  }, [worked]);
  const answerKey = useMemo(() => {
    const top = worked.rows.filter((r) => r.depth === 0 && r.run);
    return top.at(-1)?.key ?? null;
  }, [worked]);

  const shown = swing.swings.slice(0, wide ? 6 : 4);
  const plotValues = useMemo(
    () =>
      s
        ? [
            ...s.dots,
            s.lo,
            s.hi,
            ...(b.line !== null && !dragLine ? [b.line] : []),
            ...(b.came !== null ? [b.came] : []),
            ...shown.flatMap((x) => [x.lo, x.hi]),
          ]
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s, b.line, b.came, swing, dragLine],
  );
  const ax = useSteadyAxis(plotValues, scrub || dragLine);
  const ladderValues = useMemo(() => {
    const v: number[] = [];
    for (const r of runs.values()) if (r && r.lo > 0) v.push(r.lo, r.hi);
    return v;
  }, [runs]);
  const ladder = useSteadyAxis(ladderValues, scrub);

  /* ── the cursor ─────────────────────────────────────────────────────── */

  const setField =
    (id: string) => (el: HTMLInputElement | HTMLTextAreaElement | null) => {
      if (el) fields.current.set(id, el);
      else fields.current.delete(id);
    };
  const focusField = (id: string) => {
    pending.current = id;
  };
  useLayoutEffect(() => {
    const id = pending.current;
    if (!id) return;
    const el = fields.current.get(id);
    if (!el) return;
    pending.current = null;
    el.focus();
    const n = el.value.length;
    el.setSelectionRange(n, n);
  });
  // An envelope that opens already asked for the cursor gets it.
  const lastFocus = useRef(0);
  useLayoutEffect(() => {
    if (focus === lastFocus.current) return;
    lastFocus.current = focus;
    if (!b.question.trim()) {
      question.current?.focus();
      return;
    }
    const gap = flat.find(
      (f) =>
        !f.line.label.trim() || (!f.line.lines.length && !f.line.value.trim()),
    );
    const el = gap
      ? fields.current.get(
          `${gap.line.key}:${gap.line.label.trim() ? "value" : "label"}`,
        )
      : question.current;
    el?.focus();
  });

  /* ── editing the lines ──────────────────────────────────────────────── */

  const lines = (f: (ls: Line[]) => Line[], done = true) =>
    edit((x) => ({ ...x, lines: f(x.lines) }), done);
  const add = (after: string | null) => {
    const l = newLine("×");
    if (after) lines((ls) => insertAfter(ls, after, l));
    else lines((ls) => [...ls, l]);
    focusField(`${l.key}:label`);
  };
  const take = (key: string) => {
    const i = flat.findIndex((f) => f.line.key === key);
    const prev = flat[i - 1];
    lines((ls) => {
      const next = removeLine(ls, key);
      return next.length ? next : [newLine()];
    });
    if (prev)
      focusField(
        `${prev.line.key}:${prev.line.lines.length ? "label" : "value"}`,
      );
  };
  const down = (key: string) => {
    const c = newLine("×");
    lines((ls) => breakDown(ls, key, c));
    focusField(`${c.key}:label`);
  };
  const out = (key: string) => {
    lines((ls) => outdent(ls, key));
    focusField(`${key}:label`);
  };
  const setLabel = (key: string, was: string, text: string, first: boolean) => {
    // A sign typed first is the line's sign: `/ people to a household`. The first line has none.
    const m =
      !first && !was && text.match(/^([*×/÷+−])\s*(.*)$|^([x\-–])\s+(.*)$/);
    if (m) {
      const op = opOf(m[1] ?? m[3])!;
      lines(
        (ls) => patchLine(ls, key, { op, label: m[2] ?? m[4] ?? "" }),
        false,
      );
      return;
    }
    lines((ls) => patchLine(ls, key, { label: text }), false);
  };
  const setValue = (key: string, text: string, done: boolean) => {
    const l = flat.find((f) => f.line.key === key)?.line;
    if (text.trim() === "=" && l && !l.lines.length) {
      down(key);
      return;
    }
    lines((ls) => patchLine(ls, key, { value: text }), done);
  };
  const cycle = (key: string, op: Line["op"]) =>
    lines((ls) =>
      patchLine(ls, key, { op: OPS[(OPS.indexOf(op) + 1) % OPS.length] }),
    );
  const pick = (key: string) => {
    const el = fields.current.get(`${key}:value`);
    el?.focus();
    setFlash(key);
    window.setTimeout(() => setFlash((k) => (k === key ? null : k)), 1200);
  };

  const labelKeys = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    const f = flat[i];
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onKeep?.();
      return;
    }
    if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      if (e.key === "Enter" && !f.line.label && !f.line.value && f.depth > 0)
        out(f.line.key);
      else if (f.line.lines.length)
        fields.current.get(`${f.line.lines[0].key}:label`)?.focus();
      else fields.current.get(`${f.line.key}:value`)?.focus();
      return;
    }
    if (
      e.key === "Backspace" &&
      !f.line.label &&
      !f.line.value &&
      !f.line.lines.length &&
      flat.length > 1
    ) {
      e.preventDefault();
      take(f.line.key);
      return;
    }
    if (e.key === "ArrowDown" && flat[i + 1]) {
      e.preventDefault();
      fields.current.get(`${flat[i + 1].line.key}:label`)?.focus();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      (i
        ? fields.current.get(`${flat[i - 1].line.key}:label`)
        : question.current
      )?.focus();
    }
  };
  const valueKeys = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    const f = flat[i];
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onKeep?.();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (!f.line.label && !f.line.value && f.depth > 0) out(f.line.key);
      else add(f.line.key);
      return;
    }
    if (e.key === "Backspace" && !f.line.value) {
      e.preventDefault();
      fields.current.get(`${f.line.key}:label`)?.focus();
      return;
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const g = readGuess(f.line.value);
      if (g.kind !== "point" && g.kind !== "range") return;
      e.preventDefault();
      const up = e.key === "ArrowUp";
      const k = e.shiftKey ? 10 : 1.1;
      const ends = g.kind === "range" ? [g.lo.v, g.hi.v] : [g.at.v];
      const next = ends.every((v) => v > 0)
        ? nudge(g, "both", up ? k : 1 / k)
        : shift(
            g,
            "both",
            (up ? 1 : -1) *
              Math.max(1, ...ends.map(Math.abs)) *
              (e.shiftKey ? 1 : 0.1),
          );
      setValue(f.line.key, writeGuess(next), true);
    }
  };

  /* ── the line across the answer ─────────────────────────────────────── */

  const PH = wide ? 146 : 116;
  const pad = 12;
  const base = PH - 24;
  const x = (v: number) => (ax ? pad + place(ax, v) * (W - 2 * pad) : 0);
  const dots = useMemo(() => {
    if (!s || !ax || W <= 0)
      return { at: [] as { x: number; k: number }[], d: 8 };
    const xs = s.dots.map((v) => pad + place(ax, v) * (W - 2 * pad));
    // One number, no spread: one dot, not a hundred in a column.
    if (s.lo === s.hi) return { at: [{ x: xs[0], k: 0 }], d: 12 };
    // The largest dot that lets the tallest stack stand in the room there is.
    for (let d = wide ? 14 : 12; d >= 3; d -= 0.5) {
      const at = stackDots(xs, d);
      if ((Math.max(...at.map((p) => p.k)) + 1) * d <= base - 16 || d <= 3)
        return { at, d };
    }
    return { at: stackDots(xs, 3), d: 3 };
  }, [s, ax, W, base, wide]);
  const dragOnPlot = (e: ReactPointerEvent<SVGElement>) => {
    if (!writable || !ax || e.button !== 0) return;
    e.preventDefault();
    const svg =
      e.currentTarget.ownerSVGElement ?? (e.currentTarget as SVGSVGElement);
    const box = svg.getBoundingClientRect();
    const hold = ax;
    const at = (cx: number) => {
      const t = Math.min(
        1,
        Math.max(0, (cx - box.left - pad) / (box.width - 2 * pad)),
      );
      return Number(unplace(hold, t).toPrecision(2));
    };
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    setDragLine(true);
    edit((x) => ({ ...x, line: at(e.clientX) }), false);
    const move = (ev: PointerEvent) =>
      edit((x) => ({ ...x, line: at(ev.clientX) }), false);
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      setDragLine(false);
      edit((x) => x, true);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
  const aboveLine =
    s && worked.out && b.line !== null
      ? Math.round(above(worked.out, b.line) * 100)
      : null;

  const unit = b.unit.trim();
  // The ladder takes a little over a quarter of a wide sheet; a narrow one says where it stands in words.
  const ladderW =
    wide && EW >= 620 ? Math.round(Math.min(300, Math.max(170, EW * 0.28))) : 0;
  const band = wide ? 34 : 24;
  // On a phone a line takes two: what it is, then its number and where the page stands.
  const narrow = EW > 0 && EW < 460;
  const axisSeed = seedOf(`${seed} axis`);

  return (
    <div
      ref={rootRef}
      className={`bt-envelope relative ${scrub ? "bt-live" : ""}`}
      style={{ paddingTop: band, paddingBottom: band + 6 }}
    >
      <Folds seed={seed} band={band} />
      <div className="relative z-[1]">
        <textarea
          ref={(el) => {
            question.current = el;
            if (el) {
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }
          }}
          value={b.question}
          readOnly={!writable}
          onChange={(e) =>
            edit((x) => ({ ...x, question: e.target.value }), false)
          }
          onInput={(e) => {
            e.currentTarget.style.height = "auto";
            e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
          }}
          onBlur={() => edit((x) => x, true)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              onKeep?.();
            } else if (
              e.key === "Enter" ||
              (e.key === "ArrowDown" && flat[0])
            ) {
              e.preventDefault();
              if (flat[0])
                fields.current.get(`${flat[0].line.key}:label`)?.focus();
            }
          }}
          rows={1}
          placeholder="what are you working out?"
          aria-label="What you are working out"
          className={`bt-question display w-full resize-none overflow-hidden bg-transparent px-0 py-1 ${wide ? "text-[28px] sm:text-[32px]" : "text-[23px]"} leading-[1.18]`}
          style={{ color: "var(--ink)" }}
        />

        {wide && ladder && ladderW > 0 && (
          <div className="bt-rows-head mt-3 flex items-end gap-2" aria-hidden>
            <span
              className="meta min-w-0 flex-1"
              style={{ color: "var(--faint)" }}
            >
              the lines, taken down the page
            </span>
            <svg width={ladderW} height={18} className="shrink-0">
              {ladder.ticks.map((t) => (
                <text
                  key={t}
                  x={6 + place(ladder, t) * (ladderW - 12)}
                  y={13}
                  textAnchor="middle"
                  style={{ ...hand, fontSize: 13 }}
                  fill="var(--faint)"
                >
                  {tickWords(t)}
                </text>
              ))}
            </svg>
          </div>
        )}

        <ol
          className={`bt-lines ${wide ? "mt-1" : "mt-3"}`}
          aria-label="The lines"
        >
          {flat.map((f, i) => {
            const l = f.line;
            const g = guesses.get(l.key) ?? readGuess(l.value);
            const run = runs.get(l.key) ?? null;
            const answer = l.key === answerKey;
            return (
              <li
                key={l.key}
                className={`bt-row group relative flex items-center gap-2 ${narrow ? "flex-wrap gap-y-0 pb-1" : ""}`}
                data-flash={flash === l.key || undefined}
                style={{ paddingLeft: `${f.depth * 1.35}rem` }}
              >
                {f.depth > 0 && (
                  <span
                    className="bt-branch"
                    aria-hidden
                    style={{ left: `${f.depth * 1.35 - 0.7}rem` }}
                  />
                )}
                {f.index === 0 ? (
                  <span className="bt-op" aria-hidden />
                ) : (
                  <button
                    onClick={() => writable && cycle(l.key, l.op)}
                    disabled={!writable}
                    className="bt-op hand"
                    aria-label={`${OP_WORD[l.op]}; change it`}
                    title={`${OP_WORD[l.op]} · click for ${OP_WORD[OPS[(OPS.indexOf(l.op) + 1) % OPS.length]]}`}
                  >
                    {l.op}
                  </button>
                )}
                <input
                  ref={setField(`${l.key}:label`)}
                  value={l.label}
                  readOnly={!writable}
                  onChange={(e) =>
                    setLabel(l.key, l.label, e.target.value, f.index === 0)
                  }
                  onKeyDown={(e) => labelKeys(e, i)}
                  onBlur={() => edit((x) => x, true)}
                  placeholder={
                    writable
                      ? f.depth
                        ? "part of it"
                        : i === 0
                          ? "what you start from"
                          : "what it is"
                      : ""
                  }
                  aria-label={`Line ${f.path}: what it is`}
                  spellCheck={false}
                  autoComplete="off"
                  className={`bt-label hand min-w-0 flex-1 ${wide ? "text-[20px]" : "text-[18.5px]"}`}
                  style={
                    narrow ? { flexBasis: "calc(100% - 2rem)" } : undefined
                  }
                />
                {l.lines.length ? (
                  <span
                    className={`bt-eq hand shrink-0 ${wide ? "text-[20px]" : "text-[18.5px]"} ${narrow ? "ml-auto" : ""}`}
                    title="worked out from its own lines, below"
                  >
                    = its lines
                  </span>
                ) : (
                  <span
                    className={`${wide ? "text-[20px]" : "text-[18.5px]"} ${narrow ? "ml-auto" : ""}`}
                  >
                    <GuessField
                      value={l.value}
                      guess={g}
                      writable={writable}
                      inputRef={setField(`${l.key}:value`)}
                      onText={(t, done) => setValue(l.key, t, done)}
                      onScrub={setScrub}
                      onKeyDown={(e) => valueKeys(e, i)}
                      onBlur={() => edit((x) => x, true)}
                      label={l.label || `line ${f.path}`}
                    />
                  </span>
                )}
                {wide && ladderW > 0 ? (
                  <Rung
                    ax={ladder}
                    s={run}
                    w={ladderW}
                    depth={f.depth}
                    answer={answer}
                    seed={`${seed}-${l.key}`}
                  />
                ) : (
                  <span
                    className="bt-so hand shrink-0 text-right text-[15.5px]"
                    style={{
                      color: answer
                        ? "var(--accent)"
                        : f.depth
                          ? "var(--faint)"
                          : "var(--muted)",
                    }}
                    title={
                      run && run.lo !== run.hi
                        ? `nine in ten between ${fmt(run.lo)} and ${fmt(run.hi)}`
                        : undefined
                    }
                  >
                    {run ? `≈ ${fmt(run.mid)}` : ""}
                  </span>
                )}
                {writable && (
                  <span className="bt-tools">
                    {!l.lines.length && f.depth < 2 && (
                      <button
                        onClick={() => down(l.key)}
                        className="bt-tool"
                        style={mono}
                        title="break it down into lines of its own"
                        aria-label="Break it down"
                      >
                        =
                      </button>
                    )}
                    <button
                      onClick={() => take(l.key)}
                      className="bt-tool"
                      style={mono}
                      title="take the line off"
                      aria-label="Take the line off"
                    >
                      ×
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        {writable && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              onClick={() =>
                add(flat.filter((f) => f.depth === 0).at(-1)?.line.key ?? null)
              }
              className="bt-add hand text-[17px]"
            >
              + a line
            </button>
            <span
              className="meta"
              style={{
                color: "var(--faint)",
                textTransform: "none",
                letterSpacing: "0.02em",
              }}
            >
              ↵ next line · = breaks one down · drag a number sideways, or ↑ ↓ ·
              ⌘↵ keeps
            </span>
          </div>
        )}

        {/* ── the answer ─────────────────────────────────────────────────── */}
        <div className={`bt-answer ${wide ? "mt-7" : "mt-5"}`}>
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span
              className={`hand leading-none ${wide ? "text-[48px]" : "text-[40px]"}`}
              style={{ color: s ? "var(--ink)" : "var(--faint)" }}
            >
              ≈ {s ? fmt(s.mid) : "?"}
            </span>
            <input
              value={b.unit}
              readOnly={!writable}
              onChange={(e) =>
                edit((x) => ({ ...x, unit: e.target.value }), false)
              }
              onBlur={() => edit((x) => x, true)}
              placeholder={writable ? "in what?" : ""}
              aria-label="What the answer is in"
              spellCheck={false}
              className={`bt-unit-in hand ${wide ? "text-[24px]" : "text-[21px]"}`}
              style={{
                width: `${Math.max(4.2, (unit || "in what?").length * 0.5 + 0.6)}em`,
              }}
            />
            <span
              className="hand text-[17px] leading-tight"
              style={{ color: "var(--muted)" }}
            >
              {s
                ? s.lo === s.hi
                  ? "every line is one number — a range shows how far it could run"
                  : `nine in ten between ${fmt(s.lo)} and ${fmt(s.hi)}`
                : flat.length && flat.some((f) => f.line.value.trim())
                  ? "no line reads as a number yet"
                  : "a number on a line, and it works itself out"}
            </span>
          </div>

          <div ref={plotRef} className="relative mt-2 w-full">
            {s && ax && W > 0 && (
              <svg
                width={W}
                height={PH}
                className={`bt-plot block ${scrub || dragLine ? "bt-still" : ""}`}
                role="img"
                aria-label={`A hundred dots, one for each hundredth of ${worked.out?.length ?? 0} draws: the middle ${fmt(s.mid)}, nine in ten between ${fmt(s.lo)} and ${fmt(s.hi)}`}
              >
                {writable && (
                  <rect
                    x={0}
                    y={0}
                    width={W}
                    height={base}
                    fill="transparent"
                    className="bt-plot-hit"
                    onPointerDown={dragOnPlot}
                  >
                    <title>drag across the dots to draw a line</title>
                  </rect>
                )}
                <path
                  d={stroke(
                    [pad - 4, base + 1],
                    [W - pad + 4, base + 1],
                    rand(axisSeed),
                    0.6,
                    0,
                  )}
                  fill="none"
                  stroke="var(--faint)"
                  strokeWidth={1.1}
                />
                {ax.ticks.map((t) => (
                  <g key={t} transform={`translate(${x(t)} ${base})`}>
                    <line y1={1} y2={5} stroke="var(--faint)" strokeWidth={1} />
                    <text
                      y={19}
                      textAnchor="middle"
                      style={{ ...hand, fontSize: 14 }}
                      fill="var(--faint)"
                    >
                      {tickWords(t)}
                    </text>
                  </g>
                ))}
                <g className="bt-dots" key={seed}>
                  {dots.at.map((p, i) => {
                    const v = s.dots[i];
                    const lit = b.line === null || v > b.line;
                    return (
                      <g
                        key={i}
                        className="bt-dot"
                        style={{
                          transform: `translate(${p.x}px, ${base - (p.k + 0.5) * dots.d - 1}px)`,
                        }}
                      >
                        <circle
                          r={Math.max(1.2, dots.d / 2 - 0.55)}
                          className="bt-dot-ink"
                          style={{
                            animationDelay: `${Math.round(p.x / 3)}ms`,
                            fill: lit ? "var(--ink)" : "var(--faint)",
                          }}
                        />
                      </g>
                    );
                  })}
                </g>
                <path
                  d={`M${x(s.mid)} ${base + 3} l-4 6 h8 z`}
                  fill="var(--accent)"
                />
                {b.came !== null && (
                  <g
                    className="bt-came"
                    transform={`translate(${x(b.came)} 0)`}
                  >
                    <line
                      y1={8}
                      y2={base}
                      stroke="var(--ink)"
                      strokeWidth={1.3}
                    />
                    <path d="M0 8 l9 4 l-9 4 z" fill="var(--ink)" />
                    <text
                      x={x(b.came) > W - 90 ? -6 : 12}
                      y={17}
                      textAnchor={x(b.came) > W - 90 ? "end" : "start"}
                      style={{ ...hand, fontSize: 15 }}
                      fill="var(--ink)"
                    >
                      came to {fmt(b.came)}
                    </text>
                  </g>
                )}
                {b.line !== null && (
                  <g
                    className="bt-line"
                    transform={`translate(${x(b.line)} 0)`}
                  >
                    <line
                      y1={4}
                      y2={base}
                      stroke="var(--accent)"
                      strokeWidth={1.4}
                      strokeDasharray="4 4"
                    />
                    <circle
                      cy={6}
                      r={5}
                      fill="var(--surface)"
                      stroke="var(--accent)"
                      strokeWidth={1.4}
                      className={writable ? "bt-handle" : undefined}
                      onPointerDown={dragOnPlot}
                    />
                    {aboveLine !== null && (
                      <text
                        x={x(b.line) > W - 150 ? -10 : 10}
                        y={b.came !== null ? 36 : 17}
                        textAnchor={x(b.line) > W - 150 ? "end" : "start"}
                        style={{ ...hand, fontSize: 15 }}
                        fill="var(--accent)"
                      >
                        {`${aboveLine} above · ${100 - aboveLine} below`}
                      </text>
                    )}
                  </g>
                )}
              </svg>
            )}
          </div>

          {s && (b.line !== null || writable) && (
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[16px]">
              {b.line === null ? (
                <button
                  onClick={() =>
                    edit(
                      (x) => ({ ...x, line: Number(s.mid.toPrecision(2)) }),
                      true,
                    )
                  }
                  className="bt-add hand text-[16.5px]"
                >
                  + a line across it
                </button>
              ) : (
                <>
                  <span className="hand" style={{ color: "var(--muted)" }}>
                    your line at
                  </span>
                  <LineNumber
                    value={b.line}
                    writable={writable}
                    onCommit={(v) => edit((x) => ({ ...x, line: v }), true)}
                  />
                  <input
                    value={b.lineName}
                    readOnly={!writable}
                    onChange={(e) =>
                      edit((x) => ({ ...x, lineName: e.target.value }), false)
                    }
                    onBlur={() => edit((x) => x, true)}
                    placeholder={
                      writable ? "call it — it pays for itself, say" : ""
                    }
                    aria-label="What the line is"
                    spellCheck={false}
                    className="bt-label hand min-w-[10rem] flex-1 text-[16.5px]"
                  />
                  {writable && (
                    <button
                      onClick={() =>
                        edit((x) => ({ ...x, line: null, lineName: "" }), true)
                      }
                      className="bt-tool"
                      style={mono}
                      aria-label="Take the line off"
                      title="take the line off"
                    >
                      ×
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {s && s.lo !== s.hi && shown.length > 0 && ax && W > 0 && (
            <div className="mt-4">
              <div className="meta" style={{ color: "var(--accent)" }}>
                what it leans on
              </div>
              <p
                className="hand mt-0.5 text-[15px] leading-tight"
                style={{ color: "var(--faint)" }}
              >
                each range from its bottom to its top, every other line at its
                middle
              </p>
              <ol className="mt-1.5">
                {shown.map((w, i) => {
                  const x1 = x(w.lo);
                  const x2 = x(w.hi);
                  const xb = swing.base !== null ? x(swing.base) : null;
                  return (
                    <li key={w.key}>
                      <button
                        onClick={() => pick(w.key)}
                        className="bt-swing block w-full text-left"
                        title={`${w.written}: the answer from ${fmt(w.lo)} to ${fmt(w.hi)}`}
                      >
                        <span
                          className="hand block truncate text-[15.5px] leading-tight"
                          style={{
                            color: i === 0 ? "var(--ink)" : "var(--muted)",
                          }}
                        >
                          {w.label}
                        </span>
                        <svg
                          width={W}
                          height={14}
                          className="block"
                          aria-hidden
                        >
                          <path
                            d={
                              x2 - x1 > 1.5
                                ? stroke(
                                    [x1, 7],
                                    [x2, 7],
                                    rand(seedOf(`${seed} ${w.key}`)),
                                    0.5,
                                    0,
                                  )
                                : `M${x1} 7h1`
                            }
                            fill="none"
                            stroke={i === 0 ? "var(--ink)" : "var(--muted)"}
                            strokeWidth={i === 0 ? 2.6 : 1.8}
                            strokeLinecap="round"
                            className="bt-swing-bar"
                          />
                          <line
                            x1={x1}
                            x2={x1}
                            y1={3}
                            y2={11}
                            stroke="currentColor"
                            strokeWidth={1}
                            style={{ color: "var(--muted)" }}
                          />
                          <line
                            x1={x2}
                            x2={x2}
                            y1={3}
                            y2={11}
                            stroke="currentColor"
                            strokeWidth={1}
                            style={{ color: "var(--muted)" }}
                          />
                          {xb !== null && (
                            <line
                              x1={xb}
                              x2={xb}
                              y1={1}
                              y2={13}
                              stroke="var(--accent)"
                              strokeWidth={1.2}
                            />
                          )}
                          <text
                            x={x2 + 6 < W - 40 ? x2 + 6 : x1 - 6}
                            y={11}
                            textAnchor={x2 + 6 < W - 40 ? "start" : "end"}
                            style={{ ...hand, fontSize: 13 }}
                            fill="var(--faint)"
                          >
                            {`${fmt(w.lo)} – ${fmt(w.hi)}`}
                          </text>
                        </svg>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** The line's number, typed in place. */
function LineNumber({
  value,
  writable,
  onCommit,
}: {
  value: number;
  writable: boolean;
  onCommit: (v: number) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? fmt(value).replace("−", "-");
  return (
    <input
      value={shown}
      readOnly={!writable}
      onFocus={(e) => {
        if (!writable) return;
        setText(fmt(value).replace("−", "-"));
        e.currentTarget.select();
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text !== null) {
          const g = readGuess(text);
          if (g.kind === "point" && g.at.v !== value) onCommit(g.at.v);
        }
        setText(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setText(null);
          e.currentTarget.blur();
        }
      }}
      aria-label="Your line"
      className="bt-value hand text-[18px]"
      style={{
        width: `${Math.max(2.2, shown.length * 0.5 + 0.6)}em`,
        color: "var(--accent)",
      }}
    />
  );
}
