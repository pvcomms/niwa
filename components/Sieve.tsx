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
  MAX_WORLDS,
  MIN_WORLDS,
  clampParts,
  clampPasses,
  emptySieve,
  fmt,
  inHundred,
  leansOnValues,
  partsNow,
  plain,
  ratio,
  readings,
  shares,
  splitPair,
  stagesOf,
  tally,
  wholeReadings,
  type Sieve as S,
} from "@/lib/sieve";
import { EXAMPLE_SIEVES } from "@/content/sieve";
import { rand, ribbon, roughRect, seedOf, stroke } from "@/lib/hand";
import { putOnDesk } from "./desk";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

type Payload = {
  sieves: S[];
  values: { name: string; terms: string[] }[];
  about: { id: string; label: string; first: string } | null;
  writable: boolean;
  dir: string | null;
};

const mono = { fontFamily: "var(--font-mono)" } as const;
const hand = { fontFamily: "var(--font-hand)" } as const;
const chip = "chip sv-seg px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";
const hue = (i: number) => `var(--value-${i % 6})`;
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const short = (s: string, max = 14) => {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max).replace(/\s+\S*$/, "");
  return `${cut || t.slice(0, max - 1)}…`;
};

function Chip({
  children,
  on,
  onClick,
  disabled,
  accent,
  title,
}: {
  children: React.ReactNode;
  on?: boolean;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
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
        borderColor: on ? "var(--ink)" : accent ? "var(--accent)" : undefined,
      }}
      aria-pressed={on}
    >
      {children}
    </button>
  );
}

/* ── the steps ─────────────────────────────────────────────────────────── */

type Step =
  { kind: "before" } | { kind: "sighting"; i: number } | { kind: "now" };

/** Before looking, then each sighting in order, then what passes — when anything has. */
const stepsOf = (s: S): Step[] => [
  { kind: "before" },
  ...s.sightings.map((_, i) => ({ kind: "sighting" as const, i })),
  ...(s.sightings.length ? [{ kind: "now" as const }] : []),
];

/** What the box draws at one step: the widths, and the shades if a sighting is on it. */
function viewOf(s: S, step: Step) {
  const stages = stagesOf(s);
  if (step.kind === "before")
    return { parts: s.worlds.map((w) => w.parts), passes: null, saw: "" };
  if (step.kind === "now") return { parts: partsNow(s), passes: null, saw: "" };
  const st = stages[step.i];
  return st
    ? {
        parts: st.before,
        passes: st.passes,
        saw: s.sightings[step.i]?.saw ?? "",
      }
    : { parts: s.worlds.map((w) => w.parts), passes: null, saw: "" };
}

/* ── the box ───────────────────────────────────────────────────────────── */

const BW = 700;
const BH = 372;
const TOP = 84;
const LEFT = 30;
const W = BW + 2 * LEFT;
const H = TOP + BH + 16;

/**
 * The whole, drawn large and by hand: worlds as columns as wide as their
 * parts; with a sighting on it, each column shaded from the top by how many
 * in a hundred of that world would show it. The line between two columns
 * drags to reweigh them; a shade's edge drags to say how much passes. Every
 * mark on it is a number the reader set.
 */
function Box({
  parts,
  names,
  passes,
  saw,
  seed,
  onParts,
  onPasses,
  onDone,
}: {
  parts: number[];
  names: string[];
  passes: number[] | null;
  saw: string;
  seed: string;
  onParts?: (p: number[]) => void;
  onPasses?: (i: number, v: number) => void;
  onDone?: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const n = parts.length;
  const sh = shares(parts);
  const xs: number[] = [];
  const ws: number[] = [];
  let x = LEFT;
  for (let i = 0; i < n; i++) {
    xs.push(x);
    ws.push(sh[i] * BW);
    x += sh[i] * BW;
  }
  const s = seedOf(seed);
  const key = xs.map((v) => v.toFixed(1)).join(",");

  const frame = useMemo(
    () => ribbon(roughRect(BW, BH, s, { overshoot: 5, wobble: 1.3 }), 2, s),
    [s],
  );
  const lines = useMemo(() => {
    const out: string[] = [];
    for (let i = 1; i < n; i++) {
      const r = rand(s + i * 7);
      const d = stroke([xs[i] - LEFT, -2], [xs[i] - LEFT, BH + 2], r, 1.1, 3);
      out.push(ribbon(d, 1.6, s + i * 7));
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, n, key]);
  const edges = useMemo(() => {
    if (!passes) return [];
    return passes.map((p, i) => {
      const y = (BH * p) / 100;
      const r = rand(s + 101 + i * 13);
      const d = stroke([xs[i] - LEFT, y], [xs[i] - LEFT + ws[i], y], r, 1.0, 2);
      return ribbon(d, 1.7, s + 101 + i * 13);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, passes?.join(","), key]);

  const toSvg = (cx: number, cy: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const m = svg.getScreenCTM();
    if (!m) return null;
    const pt = svg.createSVGPoint();
    pt.x = cx;
    pt.y = cy;
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };

  const start = (
    e: ReactPointerEvent<SVGRectElement>,
    move: (p: { x: number; y: number }) => void,
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    setDragging(true);
    const onMove = (ev: PointerEvent) => {
      const p = toSvg(ev.clientX, ev.clientY);
      if (p) move(p);
    };
    const onUp = () => {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      setDragging(false);
      onDone?.();
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    const p = toSvg(e.clientX, e.clientY);
    if (p) move(p);
  };

  const stagger = n > 2 || ws.some((w) => w < 150);
  const word = short(saw, 16);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className={`sv-box-svg w-full${dragging ? " sv-dragging" : ""}`}
      style={{ touchAction: "none" }}
      role="img"
      aria-label={
        passes
          ? `The worlds as columns, each shaded by how much of it passes ${saw || "the sighting"}`
          : "The worlds as columns, as wide as their parts"
      }
    >
      {/* the shades */}
      {passes &&
        passes.map((p, i) => (
          <rect
            key={`s${i}`}
            className="sv-shade"
            x={xs[i]}
            y={TOP}
            width={ws[i]}
            height={(BH * p) / 100}
            fill={hue(i)}
            opacity={0.34}
          />
        ))}
      <g transform={`translate(${LEFT} ${TOP})`}>
        {edges.map((d, i) => (
          <path key={`e${i}`} d={d} fill={hue(i)} />
        ))}
        {lines.map((d, i) => (
          <path key={`l${i}`} d={d} fill="var(--pen)" />
        ))}
        <path d={frame} fill="var(--pen)" />
      </g>
      {/* the names, in the hand */}
      {names.map((name, i) => {
        const w = ws[i];
        const cx = xs[i] + w / 2;
        const row = stagger ? i % 2 : 0;
        const y = TOP - 16 - row * 28;
        const anchor =
          w < 150 && i === 0
            ? "start"
            : w < 150 && i === n - 1
              ? "end"
              : "middle";
        const lx =
          anchor === "start" ? xs[i] : anchor === "end" ? xs[i] + w : cx;
        return (
          <g key={`n${i}`}>
            {w < 60 && (
              <line
                x1={lx + (anchor === "start" ? 14 : anchor === "end" ? -14 : 0)}
                y1={y + 6}
                x2={cx}
                y2={TOP - 3}
                stroke="var(--muted)"
                strokeWidth={1}
              />
            )}
            <text
              x={lx}
              y={y}
              fontSize={22}
              textAnchor={anchor}
              style={{
                ...hand,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
              fill="var(--ink)"
            >
              {inHundred(sh[i])}% {name}
            </text>
          </g>
        );
      })}
      {/* what passes, written in the shade */}
      {passes &&
        passes.map((p, i) => {
          const w = ws[i];
          const h = (BH * p) / 100;
          const cx = xs[i] + w / 2;
          const label = `${p}%${word ? ` ${word}` : ""}`;
          if (w >= 150 && h >= 34)
            return (
              <text
                key={`p${i}`}
                x={cx}
                y={TOP + h - 12}
                fontSize={20}
                textAnchor="middle"
                style={hand}
                fill="var(--ink)"
              >
                {label}
              </text>
            );
          if (w >= 60 && h >= 34)
            return (
              <text
                key={`p${i}`}
                x={cx}
                y={TOP + h - 12}
                fontSize={19}
                textAnchor="middle"
                style={hand}
                fill="var(--ink)"
              >
                {p}%
              </text>
            );
          const right = i < n - 1 || xs[i] + w < W - 200;
          const lx = right ? xs[i] + w + 22 : xs[i] - 22;
          const ly = TOP + Math.max(h, 28);
          return (
            <g key={`p${i}`}>
              <line
                x1={right ? lx - 4 : lx + 4}
                y1={ly - 6}
                x2={right ? xs[i] + w + 2 : xs[i] - 2}
                y2={TOP + h}
                stroke="var(--muted)"
                strokeWidth={1}
              />
              <text
                x={lx}
                y={ly}
                fontSize={19}
                textAnchor={right ? "start" : "end"}
                style={hand}
                fill="var(--muted)"
              >
                {label}
              </text>
            </g>
          );
        })}
      {/* the hands: the shade's edge, then the line between columns on top */}
      {onPasses &&
        passes &&
        passes.map((_, i) => (
          <rect
            key={`hp${i}`}
            x={xs[i] - Math.max(0, (18 - ws[i]) / 2)}
            y={TOP}
            width={Math.max(ws[i], 18)}
            height={BH}
            fill="transparent"
            style={{ cursor: "ns-resize" }}
            onPointerDown={(e) =>
              start(e, (p) =>
                onPasses(i, clampPasses(((p.y - TOP) / BH) * 100)),
              )
            }
            aria-label={`How much of ${names[i]} passes`}
          />
        ))}
      {onParts &&
        xs.slice(1).map((dx, k) => {
          const i = k + 1;
          const left = xs[i - 1];
          const span = ws[i - 1] + ws[i];
          return (
            <rect
              key={`hd${i}`}
              x={dx - 10}
              y={TOP - 4}
              width={20}
              height={BH + 8}
              fill="transparent"
              style={{ cursor: "ew-resize" }}
              onPointerDown={(e) =>
                start(e, (p) =>
                  onParts(splitPair(parts, i - 1, (p.x - left) / span)),
                )
              }
              aria-label={`Reweigh ${names[i - 1]} against ${names[i]}`}
            />
          );
        })}
    </svg>
  );
}

/** One step, small: the columns and their shades and nothing else. */
function Thumb({
  parts,
  passes,
  w = 124,
  h = 76,
}: {
  parts: number[];
  passes: number[] | null;
  w?: number;
  h?: number;
}) {
  const sh = shares(parts);
  let x = 1;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      aria-hidden
      className="shrink-0"
    >
      {sh.map((s, i) => {
        const cw = s * (w - 2);
        const el = (
          <g key={i}>
            {passes && (
              <rect
                x={x}
                y={1}
                width={cw}
                height={((h - 2) * (passes[i] ?? 0)) / 100}
                fill={hue(i)}
                opacity={0.42}
              />
            )}
            {i > 0 && (
              <line
                x1={x}
                x2={x}
                y1={1}
                y2={h - 1}
                stroke="var(--pen)"
                strokeWidth={1}
              />
            )}
          </g>
        );
        x += cw;
        return el;
      })}
      <rect
        x={1}
        y={1}
        width={w - 2}
        height={h - 2}
        fill="none"
        stroke="var(--pen)"
        strokeWidth={1.2}
      />
    </svg>
  );
}

/** A number written in the hand that can be clicked and retyped; it commits on blur or return. */
function Num({
  value,
  clamp,
  onCommit,
  writable,
  size = 27,
  label,
  accent,
}: {
  value: number;
  clamp: (n: number) => number;
  onCommit: (n: number) => void;
  writable: boolean;
  size?: number;
  label: string;
  accent?: boolean;
}) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? fmt(value);
  return (
    <input
      value={shown}
      readOnly={!writable}
      inputMode="decimal"
      aria-label={label}
      onFocus={(e) => {
        if (!writable) return;
        setText(fmt(value));
        e.currentTarget.select();
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text !== null) {
          const v = Number(text);
          if (Number.isFinite(v) && v > 0 && clamp(v) !== value)
            onCommit(clamp(v));
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
      className="sv-num hand"
      style={{
        fontSize: size,
        width: `${Math.max(1.4, shown.length * 0.62 + 0.6)}em`,
        color: accent ? "var(--accent)" : "var(--ink)",
      }}
    />
  );
}

/** Numbers side by side with the colon between, like a ratio said aloud. */
function Ratio({
  values,
  clamp,
  onCommit,
  writable,
  label,
  size = 27,
  accent,
}: {
  values: number[];
  clamp: (n: number) => number;
  onCommit?: (i: number, n: number) => void;
  writable: boolean;
  label: string;
  size?: number;
  accent?: boolean;
}) {
  return (
    <span className="inline-flex flex-wrap items-baseline">
      {values.map((v, i) => (
        <span key={i} className="inline-flex items-baseline">
          {i > 0 && (
            <span
              className="hand mx-1.5"
              style={{ fontSize: size * 0.8, color: "var(--faint)" }}
            >
              :
            </span>
          )}
          {onCommit ? (
            <Num
              value={v}
              clamp={clamp}
              onCommit={(n) => onCommit(i, n)}
              writable={writable}
              size={size}
              label={`${label}, world ${i + 1}`}
              accent={accent}
            />
          ) : (
            <span
              className="hand"
              style={{
                fontSize: size,
                color: accent ? "var(--accent)" : "var(--ink)",
              }}
            >
              {fmt(v)}
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

/** A world's name in the hand: the field is exactly as wide as the word, measured on a mirror. */
function Name({
  value,
  onChange,
  onBlur,
  writable,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  writable: boolean;
  label: string;
}) {
  const mirror = useRef<HTMLSpanElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (mirror.current) setW(mirror.current.offsetWidth + 6);
  }, [value]);
  return (
    <span className="relative inline-block">
      <span
        ref={mirror}
        aria-hidden
        className="sv-name pointer-events-none absolute left-0 top-0 whitespace-pre opacity-0"
      >
        {value || "world"}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        readOnly={!writable}
        placeholder="world"
        aria-label={label}
        className="sv-name hand min-w-0 bg-transparent"
        style={{ width: w ? `${w}px` : "6ch", color: "var(--ink)" }}
      />
    </span>
  );
}

/** A short arrow drawn down the page, the way the primer draws the step to what passes. */
function Down() {
  const d = useMemo(() => {
    const r = rand(7);
    return (
      ribbon(stroke([7, 0], [7, 30], r, 0.9, 0), 1.6, 7) +
      ribbon(stroke([1, 23], [7, 31], r, 0.6, 0), 1.4, 8) +
      ribbon(stroke([13, 23], [7, 31], r, 0.6, 0), 1.4, 9)
    );
  }, []);
  return (
    <svg
      viewBox="-1 -1 16 34"
      width={12}
      height={26}
      aria-hidden
      className="shrink-0"
    >
      <path d={d} fill="var(--muted)" />
    </svg>
  );
}

/**
 * The sieve: Bayes drawn as areas, the way a primer draws it, with the pen in
 * the reader's hand. One question at a time, one big box, the ratio ladder
 * beside it, the steps underneath. Every number on the sheet is the reader's;
 * the sheet multiplies and draws, and never says which world is so.
 */
export default function Sieve() {
  const [theme, setTheme] = useTheme();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [open, setOpen] = useState<S | null>(null);
  const [kept, setKept] = useState(false);
  const [step, setStep] = useState(0);
  const [trouble, setTrouble] = useState<string | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const openRef = useRef<S | null>(null);
  const keptRef = useRef(false);
  const slugRef = useRef("");
  const sawRef = useRef<HTMLInputElement>(null);
  const focusSaw = useRef(false);
  const saving = useRef<Promise<void>>(Promise.resolve());
  openRef.current = open;
  keptRef.current = kept;
  const today = useMemo(localToday, []);
  const writable = payload?.writable ?? false;

  const load = useCallback((s: S, isKept: boolean, at?: number) => {
    slugRef.current = isKept ? s.slug : "";
    setKept(isKept);
    setOpen(s);
    setStep(at ?? (s.sightings.length ? s.sightings.length : 0));
    setSure(null);
    setTrouble(null);
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const slug = p.get("slug");
    const id = p.get("id");
    fetch(`/api/sieve${id ? `?id=${encodeURIComponent(id)}` : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((pl: Payload | null) => {
        if (!pl) {
          setTrouble("the sieve could not be read");
          return;
        }
        setPayload(pl);
        const wanted = slug ? pl.sieves.find((x) => x.slug === slug) : null;
        if (wanted) load(wanted, true);
        else if (pl.about)
          load(
            {
              ...emptySieve(localToday()),
              question: pl.about.first || pl.about.label,
              stone: pl.about.id,
            },
            false,
            0,
          );
        else if (pl.sieves[0]) load(pl.sieves[0], true);
        else
          load(
            {
              ...EXAMPLE_SIEVES[0],
              opened: localToday(),
              touched: localToday(),
            },
            false,
          );
      })
      .catch(() => setTrouble("the sieve could not be read"));
  }, [load]);

  // Only once the questions are read: in development React mounts twice, and a sync on the
  // first mount would take the slug off the address before the second could read it.
  const loaded = payload !== null;
  useEffect(() => {
    if (!loaded) return;
    const url = new URL(window.location.href);
    if (kept && open?.slug) url.searchParams.set("slug", open.slug);
    else url.searchParams.delete("slug");
    window.history.replaceState(null, "", url);
    putOnDesk(
      kept && open ? { kind: "sieve", id: open.slug, label: open.title } : null,
    );
    // The address and the desk hang on the slug and the title only; a drag must not rewrite them on every move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, kept, open?.slug, open?.title]);
  useEffect(() => () => putOnDesk(null), []);

  useEffect(() => {
    if (focusSaw.current && sawRef.current) {
      sawRef.current.focus();
      focusSaw.current = false;
    }
  });

  /* ── keeping ─────────────────────────────────────────────────────────── */

  const save = useCallback(
    (s: S) =>
      new Promise<S | null>((resolve) => {
        saving.current = saving.current.then(async () => {
          const fresh = !slugRef.current;
          try {
            const r = await fetch("/api/sieve", {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                sieve: { ...s, slug: slugRef.current || s.slug },
                fresh,
              }),
            });
            const out = (await r.json().catch(() => null)) as
              S | { error: string } | null;
            if (!r.ok || !out || "error" in out) {
              setTrouble(
                out && "error" in out ? out.error : `not kept (${r.status})`,
              );
              resolve(null);
              return;
            }
            slugRef.current = out.slug;
            setKept(true);
            setTrouble(null);
            setOpen((cur) =>
              cur
                ? {
                    ...cur,
                    slug: out.slug,
                    title: out.title,
                    touched: out.touched,
                  }
                : cur,
            );
            setPayload((p) =>
              p
                ? {
                    ...p,
                    sieves: p.sieves.some((x) => x.slug === out.slug)
                      ? p.sieves.map((x) =>
                          x.slug === out.slug ? { ...s, ...out } : x,
                        )
                      : [{ ...s, ...out }, ...p.sieves],
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

  const patch = useCallback((p: Partial<S>) => {
    setOpen((cur) => (cur ? { ...cur, ...p } : cur));
  }, []);
  const commit = useCallback(() => {
    const s = openRef.current;
    if (s && keptRef.current && writable) void save(s);
  }, [save, writable]);
  const apply = useCallback(
    (fn: (s: S) => S) => {
      const s = openRef.current;
      if (!s) return;
      const next = fn(s);
      setOpen(next);
      if (keptRef.current && writable) void save(next);
    },
    [save, writable],
  );

  const keep = () => {
    const s = openRef.current;
    if (!s || !writable) return;
    if (!s.question.trim()) {
      setTrouble("a question needs its words before it is kept");
      return;
    }
    slugRef.current = "";
    void save({ ...s, opened: s.opened || today, touched: today });
  };

  const remove = useCallback(async () => {
    const s = openRef.current;
    if (!s || !writable || !keptRef.current) return;
    const r = await fetch(`/api/sieve?slug=${encodeURIComponent(s.slug)}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      setTrouble(`not taken off (${r.status})`);
      return;
    }
    const rest = (payload?.sieves ?? []).filter((x) => x.slug !== s.slug);
    setPayload((p) => (p ? { ...p, sieves: rest } : p));
    if (rest[0]) load(rest[0], true);
    else load({ ...EXAMPLE_SIEVES[0], opened: today, touched: today }, false);
  }, [writable, payload?.sieves, load, today]);

  /* ── the worlds and the sightings ────────────────────────────────────── */

  const setName = (i: number, name: string) =>
    patch({
      worlds: (openRef.current?.worlds ?? []).map((w, k) =>
        k === i ? { ...w, name } : w,
      ),
    });
  const setParts = (parts: number[]) =>
    patch({
      worlds: (openRef.current?.worlds ?? []).map((w, i) => ({
        ...w,
        parts: parts[i] ?? w.parts,
      })),
    });
  const setPass = (k: number, i: number, v: number) =>
    patch({
      sightings: (openRef.current?.sightings ?? []).map((g, gi) =>
        gi === k
          ? { ...g, passes: g.passes.map((x, xi) => (xi === i ? v : x)) }
          : g,
      ),
    });
  const setSaw = (k: number, saw: string) =>
    patch({
      sightings: (openRef.current?.sightings ?? []).map((g, gi) =>
        gi === k ? { ...g, saw } : g,
      ),
    });

  const sift = () => {
    const s = openRef.current;
    if (!s) return;
    focusSaw.current = true;
    apply((cur) => ({
      ...cur,
      sightings: [
        ...cur.sightings,
        { on: today, saw: "", passes: cur.worlds.map(() => 50) },
      ],
    }));
    setStep(s.sightings.length + 1);
    setSure(null);
  };

  const takeBack = (k: number) => {
    apply((cur) => ({
      ...cur,
      sightings: cur.sightings.filter((_, i) => i !== k),
    }));
    const left = (openRef.current?.sightings.length ?? 1) - 1;
    setStep(left >= 1 ? Math.min(k, left - 1) + 1 : 0);
    setSure(null);
  };

  const addWorld = () =>
    apply((cur) =>
      cur.worlds.length >= MAX_WORLDS
        ? cur
        : {
            ...cur,
            worlds: [
              ...cur.worlds,
              { name: `world ${cur.worlds.length + 1}`, parts: 1 },
            ],
            sightings: cur.sightings.map((g) => ({
              ...g,
              passes: [...g.passes, 50],
            })),
          },
    );

  const removeWorld = (i: number) => {
    apply((cur) =>
      cur.worlds.length <= MIN_WORLDS
        ? cur
        : {
            ...cur,
            worlds: cur.worlds.filter((_, k) => k !== i),
            sightings: cur.sightings.map((g) => ({
              ...g,
              passes: g.passes.filter((_, k) => k !== i),
            })),
          },
    );
    setSure(null);
  };

  /* ── derived ─────────────────────────────────────────────────────────── */

  const values = payload?.values ?? [];
  const steps = useMemo(() => (open ? stepsOf(open) : []), [open]);
  const at: Step = steps[Math.min(step, Math.max(0, steps.length - 1))] ?? {
    kind: "before",
  };
  const view = useMemo(() => (open ? viewOf(open, at) : null), [open, at]);
  const stage = at.kind === "sighting" && open ? stagesOf(open)[at.i] : null;
  const t = useMemo(() => (open ? tally(open) : null), [open]);
  const vals = useMemo(
    () => (open ? leansOnValues(open, values) : []),
    [open, values],
  );
  const words = useMemo(
    () => (open && t ? readings(open, t, vals) : []),
    [open, t, vals],
  );
  const whole = useMemo(
    () => (payload ? wholeReadings(payload.sieves) : []),
    [payload],
  );
  const names = open ? open.worlds.map((w) => w.name) : [];
  const canDragParts =
    writable &&
    (at.kind === "before" || (at.kind === "sighting" && at.i === 0));
  const sighting = at.kind === "sighting" && open ? open.sightings[at.i] : null;
  const seed = `${open?.slug || open?.title || "draft"}-${at.kind}${at.kind === "sighting" ? at.i : ""}`;

  return (
    <main className="sieve scroll-thin relative h-dvh w-full overflow-y-auto">
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
                sieve
              </div>
              <p
                className="hand mt-1 max-w-[27rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                Widths are how you weigh the worlds before looking. A sighting
                shades each column by how much of that world would show it. Only
                the shaded areas are compared.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/sieve" />
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
            className="panel sketched rise relative min-w-0 p-5 sm:p-7"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The sieve"
          >
            <Sketch seed={`sheet-${open?.slug || "draft"}`} draw />
            {!open || !view ? (
              <p className="meta" style={{ color: "var(--faint)" }}>
                {trouble ?? "reading…"}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    {kept
                      ? `on the sieve · ${open.opened}`
                      : "a draft · not kept"}
                    {open.stone && (
                      <>
                        {" · about "}
                        <Link
                          href={`/catalogue?id=${encodeURIComponent(open.stone)}`}
                          className="sv-link"
                          style={{ color: "var(--ink)", textTransform: "none" }}
                        >
                          the stone
                        </Link>
                      </>
                    )}
                  </div>
                  {!kept && (
                    <Chip onClick={keep} disabled={!writable} accent>
                      {writable
                        ? "keep this question"
                        : "a deployed garden keeps nothing"}
                    </Chip>
                  )}
                </div>
                <textarea
                  value={open.question}
                  onChange={(e) => patch({ question: e.target.value })}
                  onBlur={commit}
                  readOnly={!writable}
                  rows={2}
                  placeholder="what are you trying to tell apart? the thing you saw could be one of these"
                  aria-label="The question"
                  className="display sv-case scroll-thin mt-2 w-full resize-none bg-transparent px-0 py-1 text-[24px] leading-[1.2] sm:text-[29px]"
                  style={{ color: "var(--ink)" }}
                />

                <div className="mt-5 grid gap-x-8 gap-y-5 xl:grid-cols-[minmax(15rem,19rem)_minmax(0,1fr)]">
                  {/* the ladder */}
                  <div className="order-2 min-w-0 xl:order-1">
                    <div className="flex flex-wrap items-baseline gap-x-1 gap-y-1">
                      {open.worlds.map((w, i) => (
                        <span key={i} className="inline-flex items-baseline">
                          {i > 0 && (
                            <span
                              className="hand mx-1 text-[20px]"
                              style={{ color: "var(--faint)" }}
                            >
                              :
                            </span>
                          )}
                          <span
                            aria-hidden
                            className="mr-1.5 inline-block h-2.5 w-2.5 shrink-0 self-center rounded-[2px]"
                            style={{ background: hue(i), opacity: 0.75 }}
                          />
                          <Name
                            value={w.name}
                            onChange={(v) => setName(i, v)}
                            onBlur={commit}
                            writable={writable}
                            label={`World ${i + 1}`}
                          />
                          {writable && open.worlds.length > MIN_WORLDS && (
                            <button
                              onClick={() =>
                                sure === `world-${i}`
                                  ? removeWorld(i)
                                  : setSure(`world-${i}`)
                              }
                              className="sv-link ml-0.5 text-[11px]"
                              style={{
                                ...mono,
                                color:
                                  sure === `world-${i}`
                                    ? "var(--accent)"
                                    : "var(--faint)",
                              }}
                              aria-label={`Take ${w.name} off`}
                              title={
                                sure === `world-${i}`
                                  ? "again to take it off"
                                  : "take this world off"
                              }
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                      {writable && open.worlds.length < MAX_WORLDS && (
                        <button
                          onClick={addWorld}
                          className="sv-link ml-1 text-[11px]"
                          style={{ ...mono, color: "var(--faint)" }}
                          aria-label="Another world"
                          title="another world"
                        >
                          + world
                        </button>
                      )}
                    </div>
                    {sure?.startsWith("world-") && (
                      <p
                        className="meta mt-1"
                        style={{
                          color: "var(--accent)",
                          textTransform: "none",
                        }}
                      >
                        again to take it off — every sighting loses its column
                      </p>
                    )}

                    <div className="mt-4 grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1">
                      {at.kind === "before" && (
                        <>
                          <span
                            className="hand text-[16px]"
                            style={{ color: "var(--faint)" }}
                          >
                            before looking
                          </span>
                          <Ratio
                            values={view.parts}
                            clamp={clampParts}
                            onCommit={
                              writable
                                ? (i, n) => {
                                    setParts(
                                      view.parts.map((p, k) =>
                                        k === i ? n : p,
                                      ),
                                    );
                                    commit();
                                  }
                                : undefined
                            }
                            writable={writable}
                            label="Parts before looking"
                          />
                        </>
                      )}
                      {at.kind === "sighting" && stage && sighting && (
                        <>
                          <span
                            className="hand text-[16px]"
                            style={{ color: "var(--faint)" }}
                          >
                            before
                          </span>
                          <Ratio
                            values={stage.before}
                            clamp={clampParts}
                            onCommit={
                              writable && at.i === 0
                                ? (i, n) => {
                                    setParts(
                                      stage.before.map((p, k) =>
                                        k === i ? n : p,
                                      ),
                                    );
                                    commit();
                                  }
                                : undefined
                            }
                            writable={writable && at.i === 0}
                            label="Parts before"
                          />
                          <span
                            className="hand text-[16px]"
                            style={{ color: "var(--faint)" }}
                          >
                            {short(sighting.saw, 12) || "passes"}
                          </span>
                          <Ratio
                            values={stage.passes}
                            clamp={clampPasses}
                            onCommit={
                              writable
                                ? (i, n) => {
                                    setPass(at.i, i, n);
                                    commit();
                                  }
                                : undefined
                            }
                            writable={writable}
                            label={`In a hundred that show ${sighting.saw || "it"}`}
                          />
                          <span />
                          <span className="relative mt-1 block h-[3px] max-w-[14rem]">
                            <Sketch kind="underline" seed={`rule-${seed}`} />
                          </span>
                          <span className="flex items-center gap-2 self-center">
                            <Down />
                            <span
                              className="hand text-[16px]"
                              style={{ color: "var(--faint)" }}
                            >
                              what passes
                            </span>
                          </span>
                          <span className="flex flex-wrap items-baseline gap-x-3">
                            <Ratio
                              values={stage.before.map(
                                (b, i) => b * (stage.passes[i] ?? 50),
                              )}
                              clamp={clampParts}
                              writable={false}
                              label="What passes"
                              size={22}
                            />
                            <span
                              className="hand text-[18px]"
                              style={{ color: "var(--faint)" }}
                            >
                              =
                            </span>
                            <Ratio
                              values={stage.after}
                              clamp={clampParts}
                              writable={false}
                              label="What passes, reduced"
                              accent
                            />
                          </span>
                        </>
                      )}
                      {at.kind === "now" && (
                        <>
                          <span
                            className="hand text-[16px]"
                            style={{ color: "var(--faint)" }}
                          >
                            what passes
                          </span>
                          <Ratio
                            values={view.parts}
                            clamp={clampParts}
                            writable={false}
                            label="What passes now"
                            accent
                          />
                        </>
                      )}
                    </div>
                    <p
                      className="hand mt-3 text-[15.5px] leading-[1.35]"
                      style={{ color: "var(--muted)" }}
                    >
                      {names
                        .map(
                          (nm, i) =>
                            `${nm} ${inHundred(shares(at.kind === "sighting" && stage ? stage.after : view.parts)[i])} in 100`,
                        )
                        .join(" · ")}
                    </p>
                    {at.kind === "sighting" && (
                      <p
                        className="hand mt-1 text-[15.5px]"
                        style={{ color: "var(--faint)" }}
                      >
                        {(() => {
                          const hi = Math.max(...(stage?.passes ?? [1]));
                          const lo = Math.min(...(stage?.passes ?? [1]));
                          const who =
                            names[(stage?.passes ?? []).indexOf(hi)] ?? "";
                          return hi === lo
                            ? "it weighs nothing either way"
                            : `it weighs ${plain([hi / lo])} to 1 for ${who}`;
                        })()}
                      </p>
                    )}
                  </div>

                  {/* the box */}
                  <div className="order-1 min-w-0 xl:order-2">
                    <Box
                      parts={view.parts}
                      names={names}
                      passes={view.passes}
                      saw={view.saw}
                      seed={seed}
                      onParts={canDragParts ? setParts : undefined}
                      onPasses={
                        writable && at.kind === "sighting"
                          ? (i, v) => setPass(at.i, i, v)
                          : undefined
                      }
                      onDone={commit}
                    />
                    {sighting && at.kind === "sighting" && (
                      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1">
                        <span
                          className="meta shrink-0"
                          style={{ color: "var(--accent)" }}
                        >
                          sighting {at.i + 1}
                          {sighting.on ? ` · ${sighting.on}` : ""}
                        </span>
                        <input
                          ref={sawRef}
                          value={sighting.saw}
                          onChange={(e) => setSaw(at.i, e.target.value)}
                          onBlur={commit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                          }}
                          readOnly={!writable}
                          placeholder="what did you see? a word or two — snooping"
                          aria-label="What was seen"
                          className="sv-saw hand min-w-0 flex-1 bg-transparent text-[20px]"
                          style={{ color: "var(--ink)" }}
                        />
                        {writable && (
                          <button
                            onClick={() =>
                              sure === `back-${at.i}`
                                ? takeBack(at.i)
                                : setSure(`back-${at.i}`)
                            }
                            className="sv-link meta shrink-0"
                            style={{
                              color:
                                sure === `back-${at.i}`
                                  ? "var(--accent)"
                                  : "var(--faint)",
                              textTransform: "none",
                            }}
                          >
                            {sure === `back-${at.i}`
                              ? "take it back — sure?"
                              : "take it back"}
                          </button>
                        )}
                      </div>
                    )}
                    {at.kind === "before" && (
                      <p
                        className="hand mt-1 px-1 text-[15.5px]"
                        style={{ color: "var(--faint)" }}
                      >
                        {open.sightings.length
                          ? "how you weighed them before anything was seen"
                          : "nothing sifted yet — weigh the worlds, then sift what you saw"}
                      </p>
                    )}
                    {at.kind === "now" && (
                      <p
                        className="hand mt-1 px-1 text-[15.5px]"
                        style={{ color: "var(--faint)" }}
                      >
                        what passes after{" "}
                        {open.sightings.length === 1
                          ? "one sighting"
                          : `${open.sightings.length} sightings`}
                        , by your numbers
                      </p>
                    )}
                  </div>
                </div>

                {/* the steps */}
                <div className="scroll-thin mt-6 flex items-start gap-3 overflow-x-auto pb-2 pt-1">
                  {steps.map((st, k) => {
                    const v = viewOf(open, st);
                    const on = k === Math.min(step, steps.length - 1);
                    const label =
                      st.kind === "before"
                        ? "before"
                        : st.kind === "now"
                          ? "what passes"
                          : `${st.i + 1} · ${short(open.sightings[st.i]?.saw ?? "", 11) || "unnamed"}`;
                    return (
                      <button
                        key={k}
                        onClick={() => {
                          setStep(k);
                          setSure(null);
                        }}
                        className="sv-step relative shrink-0 rounded-[3px] p-1.5 text-left"
                        aria-pressed={on}
                        aria-label={label}
                        style={{ ["--i" as string]: k }}
                      >
                        {on && (
                          <Sketch
                            seed={`step-${k}-${open.slug || "draft"}`}
                            color="var(--accent)"
                          />
                        )}
                        <Thumb parts={v.parts} passes={v.passes} />
                        <div
                          className="meta mt-1 max-w-[124px] truncate"
                          style={{
                            color: on ? "var(--ink)" : "var(--faint)",
                            textTransform: "none",
                          }}
                        >
                          {label}
                        </div>
                      </button>
                    );
                  })}
                  {writable && (
                    <button
                      onClick={sift}
                      className="sv-step sv-sift relative shrink-0 rounded-[3px] p-1.5 text-left"
                      aria-label="Sift another sighting"
                    >
                      <div
                        className="flex h-[76px] w-[124px] items-center justify-center"
                        style={{
                          border: "1px dashed var(--faint)",
                          borderRadius: 2,
                        }}
                      >
                        <span
                          className="hand text-[18px]"
                          style={{ color: "var(--muted)" }}
                        >
                          + sift
                        </span>
                      </div>
                      <div
                        className="meta mt-1"
                        style={{ color: "var(--faint)", textTransform: "none" }}
                      >
                        another sighting
                      </div>
                    </button>
                  )}
                </div>

                <p
                  className="hand mt-3 text-[15px] leading-[1.35]"
                  style={{
                    color: "var(--faint)",
                    borderTop: "1px solid var(--rule)",
                    paddingTop: 10,
                  }}
                >
                  drag the line between two columns to reweigh them · drag a
                  shade&apos;s edge to say how much of that world passes · click
                  any number to type it · + sift to pass the next thing you saw
                  through what passed the last
                </p>
                {trouble && (
                  <p
                    className="meta mt-2"
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
              <Sketch seed="sieve-reading" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                the reading
              </div>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                {words.length ? words.join(" · ") : "reading…"}
              </p>
              {values.length > 0 && vals.length > 0 && (
                <p
                  className="meta mt-3"
                  style={{ color: "var(--faint)", textTransform: "none" }}
                >
                  leans on{" "}
                  {vals
                    .map((v) => `${v.name} (${v.hits.join(", ")})`)
                    .join(" · ")}
                </p>
              )}
            </section>

            <section
              className="panel sketched rise relative p-4"
              style={{ borderRadius: 3, animationDelay: "160ms" }}
              aria-label="On the sieve"
            >
              <Sketch seed="sieve-list" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                on the sieve
              </div>
              {payload && payload.sieves.length > 0 ? (
                <ol className="mt-2 flex flex-col">
                  {payload.sieves.map((s) => {
                    const on = kept && open?.slug === s.slug;
                    return (
                      <li key={s.slug}>
                        <button
                          onClick={() => load(s, true)}
                          className="sv-row -mx-1.5 flex w-[calc(100%+0.75rem)] items-baseline gap-x-3 rounded px-1.5 py-1.5 text-left"
                          aria-current={on ? "true" : undefined}
                        >
                          <span
                            className="display min-w-0 flex-1 truncate text-[16px]"
                            style={{
                              color: on ? "var(--accent)" : "var(--ink)",
                            }}
                          >
                            {s.title}
                          </span>
                          <span
                            className="meta shrink-0"
                            style={{
                              color: "var(--faint)",
                              textTransform: "none",
                            }}
                          >
                            {ratio(partsNow(s))}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p
                  className="hand mt-2 text-[15.5px]"
                  style={{ color: "var(--muted)" }}
                >
                  {payload
                    ? "nothing kept yet — the snooper is on the sheet to start from"
                    : "reading…"}
                </p>
              )}
              <p
                className="meta mt-3"
                style={{ color: "var(--faint)", textTransform: "none" }}
              >
                {whole.join(" · ")}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Chip
                  onClick={() => load({ ...emptySieve(today) }, false, 0)}
                  disabled={!payload}
                >
                  new question
                </Chip>
                <Chip
                  onClick={() =>
                    load(
                      { ...EXAMPLE_SIEVES[0], opened: today, touched: today },
                      false,
                    )
                  }
                  disabled={!payload}
                >
                  the snooper
                </Chip>
                <Chip
                  onClick={() =>
                    load(
                      { ...EXAMPLE_SIEVES[1], opened: today, touched: today },
                      false,
                    )
                  }
                  disabled={!payload}
                >
                  the quiet one
                </Chip>
              </div>
            </section>

            <section
              className="panel sketched rise relative p-4"
              style={{ borderRadius: 3, animationDelay: "220ms" }}
              aria-label="What the sieve holds to"
            >
              <Sketch seed="sieve-laws" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                what the sieve holds to
              </div>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                A sighting is sifted through every world at once, and it is the
                ratio of what passes that moves the columns, not how much passes
                of the world you favour. A world a hundredth as wide can still
                pass most of itself. Nothing passes at 0 or 100: a world that
                says never cannot come back.
              </p>
              {kept && writable && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Chip
                    onClick={() =>
                      sure === "sieve" ? void remove() : setSure("sieve")
                    }
                    accent={sure === "sieve"}
                  >
                    {sure === "sieve"
                      ? "take it off the sieve — sure?"
                      : "take it off the sieve"}
                  </Chip>
                </div>
              )}
              <p
                className="meta mt-3"
                style={{ color: "var(--faint)", textTransform: "none" }}
              >
                {kept && open
                  ? payload?.dir
                    ? `kept as ${open.slug}.md in ${payload.dir.replace(/^\/Users\/[^/]+/, "~")}`
                    : "fiction, like the rest of the specimen"
                  : payload?.dir
                    ? `kept questions go to ${payload.dir.replace(/^\/Users\/[^/]+/, "~")}`
                    : "a deployed garden keeps nothing"}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
