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
  type Stage,
  type World,
} from "@/lib/sieve";
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

/* ── the box ───────────────────────────────────────────────────────────── */

const BW = 300;
const BH = 190;
const TOP = 44;
const LEFT = 8;
const SVG_W = BW + 2 * LEFT;
const SVG_H = TOP + BH + 10;

const short = (s: string, max = 16) => {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max).replace(/\s+\S*$/, "");
  return `${cut || t.slice(0, max - 1)}…`;
};

/**
 * The whole, drawn by hand: worlds as columns as wide as their parts, and —
 * when a sighting is on it — each column shaded from the top by how many in
 * a hundred of that world would show it. The line between two columns can
 * be dragged to reweigh them; the shade's edge can be dragged to say how
 * much passes. Nothing is drawn that the reader did not set.
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
  passes?: number[];
  saw?: string;
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

  const frame = useMemo(
    () => ribbon(roughRect(BW, BH, s, { overshoot: 4 }), 1.7, s),
    [s],
  );
  const lines = useMemo(() => {
    const out: string[] = [];
    for (let i = 1; i < n; i++) {
      const r = rand(s + i * 7);
      const d = stroke([xs[i] - LEFT, -1], [xs[i] - LEFT, BH + 1], r, 1.0, 2);
      out.push(ribbon(d, 1.4, s + i * 7));
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, n, xs.join(",")]);
  const edges = useMemo(() => {
    if (!passes) return [];
    return passes.map((p, i) => {
      const y = (BH * p) / 100;
      const r = rand(s + 101 + i * 13);
      const d = stroke(
        [xs[i] - LEFT, y],
        [xs[i] - LEFT + ws[i], y],
        r,
        0.9,
        1.5,
      );
      return ribbon(d, 1.5, s + 101 + i * 13);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, passes?.join(","), xs.join(","), ws.join(",")]);

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

  const stagger = n > 2 || ws.some((w) => w < 70);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className={`sv-box-svg w-full${dragging ? " sv-dragging" : ""}`}
      style={{ touchAction: "none" }}
      role="img"
      aria-label={
        passes
          ? `The worlds as columns, each shaded by how much of it passes ${saw ?? "the sighting"}`
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
      {/* the names */}
      {names.map((name, i) => {
        const w = ws[i];
        const cx = xs[i] + w / 2;
        const row = stagger ? i % 2 : 0;
        const y = TOP - 9 - row * 14;
        const anchor =
          w < 70 && i === 0
            ? "start"
            : w < 70 && i === n - 1
              ? "end"
              : "middle";
        const lx =
          anchor === "start" ? xs[i] : anchor === "end" ? xs[i] + w : cx;
        return (
          <g key={`n${i}`}>
            {w < 24 && (
              <line
                x1={lx + (anchor === "start" ? 6 : anchor === "end" ? -6 : 0)}
                y1={y + 3}
                x2={cx}
                y2={TOP - 1}
                stroke="var(--faint)"
                strokeWidth={0.8}
              />
            )}
            <text
              x={lx}
              y={y}
              fontSize={13}
              textAnchor={anchor}
              style={hand}
              fill="var(--ink)"
            >
              {inHundred(sh[i])}% {name}
            </text>
          </g>
        );
      })}
      {/* what passes, said in the shade */}
      {passes &&
        passes.map((p, i) => {
          const w = ws[i];
          const h = (BH * p) / 100;
          const cx = xs[i] + w / 2;
          if (w >= 34 && h >= 18)
            return (
              <text
                key={`p${i}`}
                x={cx}
                y={TOP + h - 5}
                fontSize={12}
                textAnchor="middle"
                style={hand}
                fill="var(--ink)"
              >
                {p}%{w >= 120 && saw ? ` ${short(saw)}` : ""}
              </text>
            );
          const right = i < n - 1 || xs[i] + w < SVG_W - 40;
          return (
            <text
              key={`p${i}`}
              x={right ? xs[i] + w + 3 : xs[i] - 3}
              y={TOP + Math.max(h, 10)}
              fontSize={11}
              textAnchor={right ? "start" : "end"}
              style={hand}
              fill="var(--muted)"
            >
              {p}%
            </text>
          );
        })}
      {/* the hands: the shade's edge, then the line between columns on top */}
      {onPasses &&
        passes &&
        passes.map((_, i) => (
          <rect
            key={`hp${i}`}
            x={xs[i] - Math.max(0, (12 - ws[i]) / 2)}
            y={TOP}
            width={Math.max(ws[i], 12)}
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
              x={dx - 7}
              y={TOP - 2}
              width={14}
              height={BH + 4}
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

/** The arithmetic under a sighting, in the hand: before, what passes of each, and what is left. */
function Arith({ stage, names }: { stage: Stage; names: string[] }) {
  const product = stage.before.map((b, i) => b * (stage.passes[i] ?? 50));
  const row = (label: string, value: string, strong = false) => (
    <>
      <span className="text-[14px]" style={{ ...hand, color: "var(--faint)" }}>
        {label}
      </span>
      <span
        className="text-[16px] tracking-[0.02em]"
        style={{ ...hand, color: strong ? "var(--ink)" : "var(--muted)" }}
      >
        {value}
      </span>
    </>
  );
  return (
    <div className="mt-2 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-0.5">
      <span className="meta" style={{ color: "var(--faint)" }}>
        &nbsp;
      </span>
      <span
        className="meta"
        style={{ color: "var(--faint)", textTransform: "none" }}
      >
        {names.join(" : ")}
      </span>
      {row("before", plain(stage.before))}
      {row("passes", stage.passes.join(" : "))}
      <span />
      <span className="relative block h-[3px]">
        <Sketch
          kind="underline"
          seed={`arith-${plain(stage.before)}-${stage.passes.join()}`}
        />
      </span>
      {row("what passes", `${plain(product)} = ${ratio(stage.after)}`, true)}
    </div>
  );
}

/** A row's parts as they stand, as one short bar of the worlds' colours. */
function Bar({
  parts,
  w = 150,
  h = 8,
}: {
  parts: number[];
  w?: number;
  h?: number;
}) {
  const sh = shares(parts);
  let x = 0;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      aria-hidden
      className="shrink-0"
    >
      {sh.map((s, i) => {
        const r = (
          <rect
            key={i}
            x={x}
            y={0}
            width={s * w}
            height={h}
            fill={hue(i)}
            opacity={0.6}
          />
        );
        x += s * w;
        return r;
      })}
      <rect
        x={0.5}
        y={0.5}
        width={w - 1}
        height={h - 1}
        fill="none"
        stroke="var(--rule)"
      />
    </svg>
  );
}

/** How many in a hundred of a world would show this: a hairline track, the accent for the thumb, the number beside it. */
function Dial({
  value,
  onChange,
  label,
  writable,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  writable: boolean;
}) {
  return (
    <div className="mt-1 flex items-center gap-3">
      <span
        className="hand shrink-0 text-[15px]"
        style={{ color: "var(--faint)" }}
      >
        few
      </span>
      <input
        type="range"
        min={1}
        max={99}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={!writable}
        aria-label={label}
        className="a-dial min-w-0 flex-1"
      />
      <span
        className="hand shrink-0 text-[15px]"
        style={{ color: "var(--faint)" }}
      >
        most
      </span>
      <span
        className="meta w-[7ch] shrink-0 text-right"
        style={{ color: "var(--ink)", textTransform: "none" }}
      >
        {value} <span style={{ color: "var(--faint)" }}>/100</span>
      </span>
    </div>
  );
}

/** A world's row: its colour, its name in the hand, its parts. */
function WorldRow({
  i,
  world,
  writable,
  canRemove,
  onChange,
  onBlur,
  onRemove,
}: {
  i: number;
  world: World;
  writable: boolean;
  canRemove: boolean;
  onChange: (w: World) => void;
  onBlur?: () => void;
  onRemove?: () => void;
}) {
  // While the reader is typing, the field holds their text; otherwise it says the parts as kept, so a drag on the box never leaves it stale.
  const [partsText, setPartsText] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span
        aria-hidden
        className="inline-block h-3 w-3 shrink-0 rounded-[2px]"
        style={{ background: hue(i), opacity: 0.7 }}
      />
      <input
        value={world.name}
        onChange={(e) => onChange({ ...world, name: e.target.value })}
        onBlur={onBlur}
        readOnly={!writable}
        placeholder={`world ${i + 1}`}
        aria-label={`World ${i + 1}`}
        className="sv-case hand min-w-0 flex-1 bg-transparent px-0 py-1 text-[19px] leading-[1.2]"
        style={{ color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}
      />
      <label className="flex items-baseline gap-1.5">
        <input
          type="number"
          inputMode="decimal"
          min={0.01}
          step="any"
          value={partsText ?? String(world.parts)}
          onFocus={() => setPartsText(String(world.parts))}
          onChange={(e) => {
            setPartsText(e.target.value);
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v > 0)
              onChange({ ...world, parts: clampParts(v) });
          }}
          onBlur={() => {
            setPartsText(null);
            onBlur?.();
          }}
          readOnly={!writable}
          aria-label={`Parts of ${world.name || `world ${i + 1}`}`}
          className="sv-case sv-in w-[7ch] bg-transparent px-0 py-1 text-right text-[13px]"
          style={{
            ...mono,
            color: "var(--ink)",
            borderBottom: "1px solid var(--rule)",
          }}
        />
        <span
          className="meta"
          style={{ color: "var(--faint)", textTransform: "none" }}
        >
          parts
        </span>
      </label>
      {canRemove && writable && onRemove && (
        <button
          onClick={onRemove}
          className="sv-link text-[11px]"
          style={{ ...mono, color: "var(--faint)" }}
          aria-label={`Take ${world.name || `world ${i + 1}`} off`}
        >
          ×
        </button>
      )}
    </div>
  );
}

/**
 * The sieve: a question and the worlds that could answer it, weighed before
 * looking; then a sighting at a time, sifted through every world at once.
 * The box draws widths and shades from the reader's own numbers, and the
 * areas are compared. The desk reads the areas back and never says which
 * world is so.
 */
export default function Sieve() {
  const [theme, setTheme] = useTheme();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [open, setOpen] = useState<S | null>(null);
  const [question0, setQuestion0] = useState("");
  const [worlds0, setWorlds0] = useState<World[]>(() => emptySieve("").worlds);
  const [sawNew, setSawNew] = useState("");
  const [passesNew, setPassesNew] = useState<number[]>([50, 50]);
  const [trouble, setTrouble] = useState<string | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const openRef = useRef<S | null>(null);
  const slugRef = useRef("");
  const saving = useRef<Promise<void>>(Promise.resolve());
  openRef.current = open;
  const today = useMemo(localToday, []);
  const writable = payload?.writable ?? false;

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
        if (pl.about)
          setQuestion0((q) => q || pl.about!.first || pl.about!.label);
        if (slug) {
          const s = pl.sieves.find((x) => x.slug === slug);
          if (s) {
            slugRef.current = s.slug;
            setOpen(s);
            setPassesNew(s.worlds.map(() => 50));
          }
        }
      })
      .catch(() => setTrouble("the sieve could not be read"));
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (open?.slug) url.searchParams.set("slug", open.slug);
    else url.searchParams.delete("slug");
    window.history.replaceState(null, "", url);
    putOnDesk(
      open ? { kind: "sieve", id: open.slug, label: open.title } : null,
    );
    // Only the address and the desk hang on this; a shade being dragged must not rewrite the URL on every move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open?.slug, open?.title]);
  useEffect(() => () => putOnDesk(null), []);

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
    if (s && writable) void save(s);
  }, [save, writable]);
  const apply = useCallback(
    (fn: (s: S) => S) => {
      const s = openRef.current;
      if (!s || !writable) return;
      const next = fn(s);
      setOpen(next);
      void save(next);
    },
    [save, writable],
  );

  const begin = () => {
    if (!writable) return;
    const question = question0.trim();
    if (!question) {
      setTrouble("a question needs its words");
      return;
    }
    const worlds = worlds0.map((w, i) => ({
      name: w.name.trim() || `world ${i + 1}`,
      parts: clampParts(w.parts),
    }));
    const s: S = {
      ...emptySieve(today),
      question,
      worlds,
      stone: payload?.about?.id ?? null,
    };
    slugRef.current = "";
    setTrouble(null);
    setOpen(s);
    setPassesNew(worlds.map(() => 50));
    setSawNew("");
    void save(s);
  };

  const close = () => {
    setOpen(null);
    slugRef.current = "";
    setSure(null);
    setTrouble(null);
  };

  const sift = () => {
    const saw = sawNew.trim();
    if (!saw) return;
    apply((s) => ({
      ...s,
      sightings: [
        ...s.sightings,
        {
          on: today,
          saw,
          passes: s.worlds.map((_, i) => clampPasses(passesNew[i] ?? 50)),
        },
      ],
    }));
    setSawNew("");
    setPassesNew((open?.worlds ?? []).map(() => 50));
  };

  const takeBack = () => {
    apply((s) => ({ ...s, sightings: s.sightings.slice(0, -1) }));
    setSure(null);
  };

  const addWorld = () =>
    apply((s) =>
      s.worlds.length >= MAX_WORLDS
        ? s
        : {
            ...s,
            worlds: [
              ...s.worlds,
              { name: `world ${s.worlds.length + 1}`, parts: 1 },
            ],
            sightings: s.sightings.map((g) => ({
              ...g,
              passes: [...g.passes, 50],
            })),
          },
    );

  const removeWorld = (i: number) => {
    apply((s) =>
      s.worlds.length <= MIN_WORLDS
        ? s
        : {
            ...s,
            worlds: s.worlds.filter((_, k) => k !== i),
            sightings: s.sightings.map((g) => ({
              ...g,
              passes: g.passes.filter((_, k) => k !== i),
            })),
          },
    );
    setPassesNew((p) => p.filter((_, k) => k !== i));
    setSure(null);
  };

  const remove = useCallback(async () => {
    const s = openRef.current;
    if (!s || !writable) return;
    const r = await fetch(`/api/sieve?slug=${encodeURIComponent(s.slug)}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      setTrouble(`not taken off (${r.status})`);
      return;
    }
    setPayload((p) =>
      p ? { ...p, sieves: p.sieves.filter((x) => x.slug !== s.slug) } : p,
    );
    close();
  }, [writable]);

  useEffect(() => {
    if (open) setPassesNew((p) => open.worlds.map((_, i) => p[i] ?? 50));
  }, [open?.worlds.length, open]);

  /* ── derived ─────────────────────────────────────────────────────────── */

  const values = payload?.values ?? [];
  const stages = useMemo(() => (open ? stagesOf(open) : []), [open]);
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
  const now = open ? partsNow(open) : [];

  return (
    <main className="sieve scroll-thin relative h-dvh w-full overflow-y-auto">
      <div className="mx-auto max-w-[80rem] px-5 pb-16 sm:px-10">
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

        {!open ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="flex min-w-0 flex-col gap-5">
              <section
                className="panel sketched rise relative p-5 sm:p-8"
                style={{ borderRadius: 3, animationDelay: "60ms" }}
                aria-label="Put a question on the sieve"
              >
                <Sketch seed="sieve-begin" draw />
                <div className="meta" style={{ color: "var(--accent)" }}>
                  the question
                </div>
                {payload?.about && (
                  <p
                    className="hand mt-1 text-[16px]"
                    style={{ color: "var(--muted)" }}
                  >
                    about{" "}
                    <Link
                      href={`/catalogue?id=${encodeURIComponent(payload.about.id)}`}
                      className="sv-link"
                      style={{ color: "var(--ink)" }}
                    >
                      “{payload.about.label}”
                    </Link>
                  </p>
                )}
                <textarea
                  value={question0}
                  onChange={(e) => setQuestion0(e.target.value)}
                  readOnly={!writable}
                  rows={2}
                  placeholder={
                    writable
                      ? "what you are trying to tell apart — the thing you saw could be one of these"
                      : "a deployed garden keeps no questions; open the specimen's"
                  }
                  aria-label="The question"
                  className="display sv-case scroll-thin mt-3 w-full resize-none bg-transparent px-0 py-2 text-[24px] leading-[1.25] sm:text-[28px]"
                  style={{
                    color: "var(--ink)",
                    borderBottom: "1px solid var(--rule)",
                  }}
                />

                <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div>
                    <div className="meta" style={{ color: "var(--accent)" }}>
                      the worlds
                    </div>
                    <p
                      className="hand mt-1 text-[15px] leading-[1.3]"
                      style={{ color: "var(--muted)" }}
                    >
                      What could be so, and how you weigh them before looking —
                      in parts. 1 : 100 is one of it for every hundred of the
                      other.
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      {worlds0.map((w, i) => (
                        <WorldRow
                          key={i}
                          i={i}
                          world={w}
                          writable={writable}
                          canRemove={worlds0.length > MIN_WORLDS}
                          onChange={(nw) =>
                            setWorlds0((ws) =>
                              ws.map((x, k) => (k === i ? nw : x)),
                            )
                          }
                          onRemove={() =>
                            setWorlds0((ws) => ws.filter((_, k) => k !== i))
                          }
                        />
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {worlds0.length < MAX_WORLDS && (
                        <Chip
                          onClick={() =>
                            setWorlds0((ws) => [...ws, { name: "", parts: 1 }])
                          }
                          disabled={!writable}
                        >
                          another world
                        </Chip>
                      )}
                      <Chip onClick={begin} disabled={!writable} accent>
                        put it on the sieve
                      </Chip>
                    </div>
                    {trouble && (
                      <p
                        className="meta mt-3"
                        style={{ color: "var(--accent)" }}
                        role="alert"
                      >
                        {trouble}
                      </p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="meta" style={{ color: "var(--faint)" }}>
                      before looking · {ratio(worlds0.map((w) => w.parts))}
                    </div>
                    <div className="mt-2 max-w-[22rem]">
                      <Box
                        parts={worlds0.map((w) => w.parts)}
                        names={worlds0.map(
                          (w, i) => w.name.trim() || `world ${i + 1}`,
                        )}
                        seed="sieve-before"
                        onParts={
                          writable
                            ? (p) =>
                                setWorlds0((ws) =>
                                  ws.map((w, i) => ({
                                    ...w,
                                    parts: p[i] ?? w.parts,
                                  })),
                                )
                            : undefined
                        }
                      />
                    </div>
                    <p
                      className="hand mt-1 text-[14px]"
                      style={{ color: "var(--faint)" }}
                    >
                      drag the line between two columns to reweigh them
                    </p>
                  </div>
                </div>
              </section>

              <section
                className="panel sketched rise relative p-5 sm:p-7"
                style={{ borderRadius: 3, animationDelay: "120ms" }}
                aria-label="On the sieve"
              >
                <Sketch seed="sieve-list" draw />
                <div className="meta" style={{ color: "var(--accent)" }}>
                  on the sieve
                </div>
                {!payload ? (
                  <p className="meta mt-3" style={{ color: "var(--faint)" }}>
                    reading…
                  </p>
                ) : payload.sieves.length === 0 ? (
                  <p
                    className="hand mt-2 text-[16px]"
                    style={{ color: "var(--muted)" }}
                  >
                    nothing yet. put a question down above.
                  </p>
                ) : (
                  <ol className="mt-2 flex flex-col">
                    {payload.sieves.map((s, i) => {
                      const parts = partsNow(s);
                      return (
                        <li
                          key={s.slug}
                          className="sv-box"
                          style={{ ["--i" as string]: i }}
                        >
                          <button
                            onClick={() => {
                              slugRef.current = s.slug;
                              setOpen(s);
                              setPassesNew(s.worlds.map(() => 50));
                              setTrouble(null);
                            }}
                            className="sv-row -mx-2 flex w-[calc(100%+1rem)] flex-wrap items-center gap-x-4 gap-y-1 rounded px-2 py-2.5 text-left"
                            style={{ borderBottom: "1px solid var(--rule)" }}
                          >
                            <span
                              className="display min-w-0 flex-1 text-[19px] leading-[1.2]"
                              style={{ color: "var(--ink)" }}
                            >
                              {s.title}
                            </span>
                            <Bar parts={parts} />
                            <span
                              className="meta shrink-0 text-right whitespace-nowrap"
                              style={{
                                color: "var(--ink)",
                                textTransform: "none",
                              }}
                            >
                              {ratio(parts)}
                            </span>
                            <span
                              className="meta shrink-0 text-right whitespace-nowrap"
                              style={{ color: "var(--faint)" }}
                            >
                              {s.sightings.length} sifted
                            </span>
                            <span
                              className="meta shrink-0 text-right whitespace-nowrap"
                              style={{ color: "var(--faint)" }}
                            >
                              {s.touched}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            </div>

            <aside className="flex min-w-0 flex-col gap-5">
              <section
                className="panel sketched rise relative p-4"
                style={{ borderRadius: 3, animationDelay: "80ms" }}
                aria-label="How it works"
              >
                <Sketch seed="sieve-how" draw />
                <div className="meta" style={{ color: "var(--accent)" }}>
                  how it works
                </div>
                <p
                  className="mt-2 text-[13.5px] leading-[1.6]"
                  style={{ color: "var(--ink)" }}
                >
                  The box is everything that could be the case. Each world is a
                  column as wide as you weigh it before you have looked. Then
                  you sift a sighting: for each world, how many in a hundred of
                  it would show what you saw. That much of the column is shaded.
                  What passes is the shaded area, and only the areas are
                  compared — a world can be wide and pass little of itself, or a
                  sliver and pass most.
                </p>
                <p
                  className="hand mt-3 text-[15px] leading-[1.3]"
                  style={{ color: "var(--faint)" }}
                >
                  the next sighting is sifted through what passed the last
                </p>
              </section>
              <section
                className="panel sketched rise relative p-4"
                style={{ borderRadius: 3, animationDelay: "160ms" }}
                aria-label="The whole sieve"
              >
                <Sketch seed="sieve-whole" draw />
                <div className="meta" style={{ color: "var(--accent)" }}>
                  the whole sieve
                </div>
                <p
                  className="mt-2 text-[13.5px] leading-[1.6]"
                  style={{ color: "var(--ink)" }}
                >
                  {whole.join(" · ")}
                </p>
                <p
                  className="meta mt-4"
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
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <section
              className="flex min-w-0 flex-col gap-5"
              aria-label="The question"
            >
              {/* the question */}
              <div
                className="panel sketched rise relative p-5 sm:p-7"
                style={{ borderRadius: 3, animationDelay: "40ms" }}
              >
                <Sketch seed={`question-${open.slug || "fresh"}`} draw />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    on the sieve · {open.opened}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {open.stone && (
                      <Link
                        href={`/catalogue?id=${encodeURIComponent(open.stone)}`}
                        className={chip}
                        style={{ ...mono, color: "var(--muted)" }}
                      >
                        the stone
                      </Link>
                    )}
                    <Chip onClick={close}>all questions</Chip>
                  </div>
                </div>
                <textarea
                  value={open.question}
                  onChange={(e) => patch({ question: e.target.value })}
                  onBlur={commit}
                  readOnly={!writable}
                  rows={2}
                  aria-label="The question"
                  className="display sv-case scroll-thin mt-3 w-full resize-none bg-transparent px-0 py-2 text-[24px] leading-[1.25] sm:text-[28px]"
                  style={{
                    color: "var(--ink)",
                    borderBottom: "1px solid var(--rule)",
                  }}
                />
                <div className="meta mt-5" style={{ color: "var(--accent)" }}>
                  the worlds · before looking,{" "}
                  {ratio(open.worlds.map((w) => w.parts))}
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {open.worlds.map((w, i) => (
                    <WorldRow
                      key={i}
                      i={i}
                      world={w}
                      writable={writable}
                      canRemove={open.worlds.length > MIN_WORLDS}
                      onChange={(nw) =>
                        patch({
                          worlds: open.worlds.map((x, k) => (k === i ? nw : x)),
                        })
                      }
                      onBlur={commit}
                      onRemove={() =>
                        sure === `world-${i}`
                          ? removeWorld(i)
                          : setSure(`world-${i}`)
                      }
                    />
                  ))}
                </div>
                {sure?.startsWith("world-") && (
                  <p className="meta mt-2" style={{ color: "var(--accent)" }}>
                    press × again to take that world off — every sighting loses
                    its column
                  </p>
                )}
                {writable && open.worlds.length < MAX_WORLDS && (
                  <div className="mt-3">
                    <Chip onClick={addWorld}>another world</Chip>
                  </div>
                )}
              </div>

              {/* the sieve */}
              <div
                className="panel sketched rise relative p-5 sm:p-7"
                style={{ borderRadius: 3, animationDelay: "80ms" }}
              >
                <Sketch seed={`sieve-${open.slug || "fresh"}`} draw />
                <div className="meta" style={{ color: "var(--accent)" }}>
                  the sieve
                </div>
                <p
                  className="hand mt-1 text-[15px] leading-[1.3]"
                  style={{ color: "var(--muted)" }}
                >
                  {stages.length
                    ? "each sighting, sifted through what passed the one before; drag a shade's edge to say again how much passes"
                    : "nothing sifted yet — the widths as you weighed them; drag the line between two columns to reweigh"}
                </p>
                <div className="mt-4 grid gap-x-6 gap-y-8 md:grid-cols-2">
                  {stages.map((st, k) => (
                    <figure
                      key={k}
                      className="sv-box min-w-0"
                      style={{ ["--i" as string]: k }}
                    >
                      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="meta" style={{ color: "var(--ink)" }}>
                          sighting {k + 1} · {open.sightings[k]?.on}
                        </span>
                      </figcaption>
                      <p
                        className="hand mt-0.5 text-[16px] leading-[1.25]"
                        style={{ color: "var(--ink)" }}
                      >
                        {open.sightings[k]?.saw}
                      </p>
                      <div className="mt-2">
                        <Box
                          parts={st.before}
                          names={names}
                          passes={st.passes}
                          saw={open.sightings[k]?.saw}
                          seed={`${open.slug || "fresh"}-${k}`}
                          onParts={
                            writable && k === 0
                              ? (p) =>
                                  patch({
                                    worlds: open.worlds.map((w, i) => ({
                                      ...w,
                                      parts: p[i] ?? w.parts,
                                    })),
                                  })
                              : undefined
                          }
                          onPasses={
                            writable
                              ? (i, v) =>
                                  patch({
                                    sightings: open.sightings.map((g, gi) =>
                                      gi === k
                                        ? {
                                            ...g,
                                            passes: g.passes.map((x, xi) =>
                                              xi === i ? v : x,
                                            ),
                                          }
                                        : g,
                                    ),
                                  })
                              : undefined
                          }
                          onDone={commit}
                        />
                      </div>
                      <Arith stage={st} names={names} />
                    </figure>
                  ))}
                  <figure
                    className="sv-box min-w-0"
                    style={{ ["--i" as string]: stages.length }}
                  >
                    <figcaption
                      className="meta"
                      style={{ color: "var(--accent)" }}
                    >
                      {stages.length ? "what passes" : "before looking"} ·{" "}
                      {ratio(now)}
                    </figcaption>
                    <p
                      className="hand mt-0.5 text-[16px] leading-[1.25]"
                      style={{ color: "var(--muted)" }}
                    >
                      {names
                        .map(
                          (nm, i) =>
                            `${nm} ${inHundred(shares(now)[i])} in 100`,
                        )
                        .join(" · ")}
                    </p>
                    <div className="mt-2">
                      <Box
                        parts={now}
                        names={names}
                        seed={`${open.slug || "fresh"}-now`}
                        onParts={
                          writable && !stages.length
                            ? (p) =>
                                patch({
                                  worlds: open.worlds.map((w, i) => ({
                                    ...w,
                                    parts: p[i] ?? w.parts,
                                  })),
                                })
                            : undefined
                        }
                        onDone={commit}
                      />
                    </div>
                  </figure>
                </div>
              </div>

              {/* sift */}
              <div
                className="panel sketched rise relative p-5 sm:p-7"
                style={{ borderRadius: 3, animationDelay: "120ms" }}
              >
                <Sketch seed={`sift-${open.slug || "fresh"}`} draw />
                <div className="meta" style={{ color: "var(--accent)" }}>
                  sift
                </div>
                <textarea
                  value={sawNew}
                  onChange={(e) => setSawNew(e.target.value)}
                  readOnly={!writable}
                  rows={1}
                  placeholder={
                    writable
                      ? "what did you see?"
                      : "a deployed garden sifts nothing"
                  }
                  aria-label="What was seen"
                  className="display sv-case scroll-thin mt-2 w-full resize-none bg-transparent px-0 py-2 text-[21px] leading-[1.25]"
                  style={{
                    color: "var(--ink)",
                    borderBottom: "1px solid var(--rule)",
                  }}
                />
                <div className="mt-4 flex flex-col gap-3">
                  {open.worlds.map((w, i) => (
                    <div key={i}>
                      <div className="flex items-baseline gap-2">
                        <span
                          aria-hidden
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
                          style={{ background: hue(i), opacity: 0.7 }}
                        />
                        <span
                          className="hand text-[16px]"
                          style={{ color: "var(--ink)" }}
                        >
                          if <b style={{ fontWeight: 600 }}>{w.name}</b> were
                          so, how many in a hundred would show this?
                        </span>
                      </div>
                      <Dial
                        value={passesNew[i] ?? 50}
                        onChange={(v) =>
                          setPassesNew((p) =>
                            open.worlds.map((_, k) =>
                              k === i ? v : (p[k] ?? 50),
                            ),
                          )
                        }
                        label={`How many in a hundred of ${w.name} would show this`}
                        writable={writable}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  <Chip
                    onClick={sift}
                    disabled={!writable || !sawNew.trim()}
                    accent
                  >
                    sift it
                  </Chip>
                  {open.sightings.length > 0 && writable && (
                    <Chip
                      onClick={() =>
                        sure === "last" ? takeBack() : setSure("last")
                      }
                      accent={sure === "last"}
                    >
                      {sure === "last"
                        ? "take back the last — sure?"
                        : "take back the last"}
                    </Chip>
                  )}
                  {sawNew.trim() && (
                    <span
                      className="hand text-[14px]"
                      style={{ color: "var(--faint)" }}
                    >
                      it would weigh{" "}
                      {(() => {
                        const hi = Math.max(
                          ...passesNew.slice(0, open.worlds.length),
                        );
                        const lo = Math.min(
                          ...passesNew.slice(0, open.worlds.length),
                        );
                        return hi === lo
                          ? "nothing either way"
                          : `${plain([hi / lo])} to 1`;
                      })()}
                    </span>
                  )}
                </div>
                {open.sightings.length > 0 && (
                  <ol className="mt-5 flex flex-col">
                    {open.sightings
                      .map((g, i) => ({ g, i }))
                      .reverse()
                      .map(({ g, i }) => (
                        <li
                          key={`${g.on}-${i}`}
                          className="sv-row flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2"
                          style={{ borderTop: "1px solid var(--rule)" }}
                        >
                          <span
                            className="meta shrink-0 whitespace-nowrap"
                            style={{ color: "var(--faint)" }}
                          >
                            {g.on}
                          </span>
                          <span
                            className="hand min-w-0 flex-1 text-[15.5px]"
                            style={{ color: "var(--ink)" }}
                          >
                            {g.saw}
                          </span>
                          <span
                            className="meta"
                            style={{
                              color: "var(--muted)",
                              textTransform: "none",
                            }}
                          >
                            passes {g.passes.join(" : ")}
                          </span>
                        </li>
                      ))}
                  </ol>
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
              </div>
            </section>

            {/* ── the desk ────────────────────────────────────────────────── */}
            <aside className="flex min-w-0 flex-col gap-5">
              <section
                className="panel sketched rise relative p-4"
                style={{ borderRadius: 3, animationDelay: "80ms" }}
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
                  {words.join(" · ")}
                </p>
                {values.length > 0 && (
                  <>
                    <div
                      className="meta mt-4"
                      style={{ color: "var(--faint)" }}
                    >
                      values leaned on, by their terms
                    </div>
                    {vals.length ? (
                      <div className="mt-1.5 flex flex-col gap-1 text-[13px]">
                        {vals.map((v) => (
                          <div
                            key={v.name}
                            className="flex flex-wrap items-baseline gap-x-2"
                          >
                            <span
                              className="hand text-[15px]"
                              style={{ color: "var(--ink)" }}
                            >
                              {v.name}
                            </span>
                            <span
                              className="meta"
                              style={{
                                color: "var(--faint)",
                                textTransform: "none",
                              }}
                            >
                              ({v.hits.join(", ")})
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p
                        className="meta mt-1"
                        style={{ color: "var(--faint)", textTransform: "none" }}
                      >
                        none of your values' terms appear in it yet
                      </p>
                    )}
                  </>
                )}
              </section>

              <section
                className="panel sketched rise relative p-4"
                style={{ borderRadius: 3, animationDelay: "140ms" }}
                aria-label="The sieve's laws"
              >
                <Sketch seed="sieve-laws" draw />
                <div className="meta" style={{ color: "var(--accent)" }}>
                  what the sieve holds to
                </div>
                <p
                  className="mt-2 text-[13.5px] leading-[1.6]"
                  style={{ color: "var(--ink)" }}
                >
                  A sighting is sifted through every world at once, and it is
                  the ratio of what passes that moves the columns — not how much
                  passes of the world you favour. A world a hundredth as wide
                  can still pass most of itself. Nothing passes at 0 or 100: a
                  world that says never cannot come back, and one that says
                  always has stopped looking.
                </p>
                <p
                  className="hand mt-3 text-[15px] leading-[1.3]"
                  style={{ color: "var(--faint)" }}
                >
                  the widths were yours before you looked; the shades are yours
                  now
                </p>
                {writable && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
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
                  className="meta mt-4"
                  style={{ color: "var(--faint)", textTransform: "none" }}
                >
                  {payload?.dir
                    ? `kept as ${open.slug || "…"}.md in ${payload.dir.replace(/^\/Users\/[^/]+/, "~")}`
                    : "fiction, like the rest of the specimen"}
                </p>
              </section>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
