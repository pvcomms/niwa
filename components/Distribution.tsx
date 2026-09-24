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
import type { Choice, Curve, Placement, Verdict } from "@/lib/taste";
import { rand, ribbon, seedOf, stroke } from "@/lib/hand";
import { KIND_LABEL } from "@/lib/palette";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

type WinKey = "all" | "d90" | "d30";

const WINDOWS: { key: WinKey; label: string; against: string }[] = [
  { key: "all", label: "everything", against: "against everything" },
  { key: "d90", label: "90 days", against: "against the last 90 days" },
  { key: "d30", label: "30 days", against: "against the last 30 days" },
];

type Payload = {
  frozen?: boolean;
  windows: Record<WinKey, Curve | null>;
  k: number;
  corpus: number;
  choices: Choice[];
  dir: string | null;
};

type Reading = {
  title: string;
  terms: string[];
  concepts: { id: string; label: string; signed: boolean }[];
  windows: Record<WinKey, Placement | null>;
};

type Hover = { label: string; kind: string; z: number; x: number; y: number };

/** The sheet's frame. */
const W = 900;
const H = 372;
const X0 = 60;
const X1 = 840;
const BASE = 292;
const RISE = 216;
const ZMIN = -3.2;
const ZMAX = 3.2;

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
const X = (z: number) =>
  X0 + ((clamp(z, ZMIN, ZMAX) - ZMIN) / (ZMAX - ZMIN)) * (X1 - X0);
const Z = (x: number) => ZMIN + ((x - X0) / (X1 - X0)) * (ZMAX - ZMIN);
const sig = (z: number) => `${z >= 0 ? "+" : "−"}${Math.abs(z).toFixed(1)}σ`;
const shortHome = (p: string) => p.replace(/^\/Users\/[^/]+/, "~");

/** The bands of the curve, the way the site reads them, both tails named. */
function bandOf(z: number): [number, number] {
  if (z < -2) return [-4, -2];
  if (z < -1) return [-2, -1];
  if (z < 0) return [-1, 0];
  if (z < 1) return [0, 1];
  if (z < 2) return [1, 2];
  return [2, 4];
}

function bandWords([lo, hi]: [number, number]): string {
  if (hi <= -2) return "the far tail · unlike the garden · the unexpected";
  if (hi <= -1) return "a step out · less like what is here";
  if (hi <= 1)
    return "the middle · where most of what you keep sits · base rates";
  if (hi <= 2) return "a step in · more like the rest";
  return "the far tail · more of the same · the garden already full of it";
}

const bandLabel = ([lo, hi]: [number, number]) =>
  `${lo <= -4 ? "←" : sig(lo)} to ${hi >= 4 ? "→" : sig(hi)}`;

/**
 * The distribution. Every stone in the garden placed by its kinship — how
 * alike its nearest stones are on shared words — standardised against the
 * garden's own spread and drawn as a curve with the stones under it. A thing
 * the reader is about to read is weighed the same way and dropped onto the
 * curve. Both tails are real, neither is praised: the left is "little here
 * is like it", the right is "the garden is already full of this".
 */
export default function Distribution() {
  const [data, setData] = useState<Payload | null>(null);
  const [win, setWin] = useState<WinKey>("all");
  const [hover, setHover] = useState<Hover | null>(null);
  const [band, setBand] = useState<[number, number] | null>(null);
  const [under, setUnder] = useState<[number, number] | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<"" | "reading" | "weighing" | "keeping">("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState<Reading | null>(null);
  const [kept, setKept] = useState<Choice | null>(null);
  const [note, setNote] = useState("");
  const [drops, setDrops] = useState(0);
  const [reduce, setReduce] = useState(false);
  const [theme, setTheme] = useTheme();

  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ z0: number; z1: number; moved: boolean } | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/taste", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Payload | null) => p && setData(p));
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const curve = data?.windows[win] ?? null;
  const placement = reading?.windows[win] ?? null;

  // ── the curve, drawn once per window ─────────────────────────────────────
  const drawn = useMemo(() => {
    if (!curve) return null;
    const seed = seedOf(`curve-${win}-${curve.n}`);
    const pts = curve.density.map(([z, d]) => [X(z), BASE - d * RISE] as const);
    const line = `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L")}`;
    const fill = `${line}L${X1} ${BASE}L${X0} ${BASE}Z`;
    const r = rand(seed);
    const stipple = curve.items.map((it) => {
      const rr = rand(seedOf(it.id));
      return {
        ...it,
        x: X(it.z) + (rr() * 2 - 1) * 3.2,
        y: BASE - 5 - rr() * Math.max(2, it.d * RISE * 0.86),
      };
    });
    return {
      ink: ribbon(line, 2, seed),
      fill,
      axis: ribbon(
        stroke([X0 - 12, BASE], [X1 + 12, BASE], r, 1.6, 0),
        1.6,
        seed + 1,
      ),
      stipple,
    };
  }, [curve, win]);

  const inBand = useMemo(() => {
    if (!curve || !band) return [];
    return curve.items
      .filter((it) => it.z >= band[0] && it.z < band[1])
      .sort((a, b) => a.z - b.z);
  }, [curve, band]);

  // ── the pointer on the sheet ─────────────────────────────────────────────
  const zAt = useCallback((e: { clientX: number }) => {
    const box = svgRef.current!.getBoundingClientRect();
    return Z(((e.clientX - box.left) / box.width) * W);
  }, []);

  const onDown = (e: ReactPointerEvent) => {
    if ((e.target as Element).closest(".t-dot, .t-tab")) return;
    const z = zAt(e);
    drag.current = { z0: z, z1: z, moved: false };
    svgRef.current?.setPointerCapture(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent) => {
    const z = zAt(e);
    const d = drag.current;
    if (d) {
      if (!d.moved && Math.abs(z - d.z0) < 0.08) return;
      d.moved = true;
      d.z1 = z;
      setBand([Math.min(d.z0, d.z1), Math.max(d.z0, d.z1)]);
      return;
    }
    setUnder(bandOf(z));
  };
  const onUp = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    try {
      svgRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (!d.moved)
      setBand((b) => (b && b[0] === bandOf(d.z0)[0] ? null : bandOf(d.z0)));
  };
  const onLeave = () => {
    if (!drag.current) setUnder(null);
    setHover(null);
  };

  const showCard = (e: ReactPointerEvent, h: Omit<Hover, "x" | "y">) => {
    const box = svgRef.current!.parentElement!.getBoundingClientRect();
    setHover({ ...h, x: e.clientX - box.left, y: e.clientY - box.top });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;
      if (e.key === "Escape") {
        setBand(null);
        setHover(null);
        (e.target as HTMLElement)?.blur?.();
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        titleInput.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── weighing, reading pages, keeping ─────────────────────────────────────
  const readPage = async () => {
    if (!url.trim()) return;
    setBusy("reading");
    setError("");
    const res = await fetch("/api/taste", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: url.trim() }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setError(
        j.error ?? "the page could not be read — paste its words instead",
      );
      return;
    }
    if (j.fetched.title && !title.trim()) setTitle(j.fetched.title);
    setText(j.fetched.text);
  };

  const weigh = async () => {
    setBusy("weighing");
    setError("");
    setKept(null);
    const res = await fetch("/api/taste", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: title.trim() || url.trim(), text }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setError(j.error ?? "could not weigh it");
      return;
    }
    setReading(j.reading as Reading);
    setDrops((n) => n + 1);
  };

  const keep = async (verdict: Verdict) => {
    if (!reading) return;
    if (kept) {
      const res = await fetch("/api/taste", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: kept.slug, verdict }),
      });
      if (res.ok) {
        const c = (await res.json()) as Choice;
        setKept(c);
        setData((d) =>
          d
            ? {
                ...d,
                choices: d.choices.map((x) => (x.slug === c.slug ? c : x)),
              }
            : d,
        );
      }
      return;
    }
    setBusy("keeping");
    const z: Record<string, number> = {};
    for (const w of WINDOWS) {
      const p = reading.windows[w.key];
      if (p) z[w.key] = p.z;
    }
    const res = await fetch("/api/taste", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: reading.title || title,
        source: url.trim(),
        text,
        verdict,
        note,
        z,
      }),
    });
    setBusy("");
    if (!res.ok) return;
    const c = (await res.json()) as Choice;
    setKept(c);
    setData((d) => (d ? { ...d, choices: [c, ...d.choices] } : d));
  };

  const saveNote = async () => {
    if (!kept || note === kept.note) return;
    const res = await fetch("/api/taste", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: kept.slug, note }),
    });
    if (res.ok) setKept((await res.json()) as Choice);
  };

  const letGo = async (slug: string) => {
    await fetch(`/api/taste?slug=${encodeURIComponent(slug)}`, {
      method: "DELETE",
    });
    setData((d) =>
      d ? { ...d, choices: d.choices.filter((c) => c.slug !== slug) } : d,
    );
    if (kept?.slug === slug) setKept(null);
  };

  const again = (c: Choice) => {
    setTitle(c.title);
    setText(c.text);
    setUrl(c.source);
    setNote(c.note);
    setKept(c);
    setReading(null);
    titleInput.current?.focus();
  };

  const captionBand = band ?? under;
  const bandCount =
    captionBand && curve
      ? curve.items.filter(
          (it) => it.z >= captionBand[0] && it.z < captionBand[1],
        ).length
      : 0;

  return (
    <main className="distribution scroll-thin relative h-dvh w-full overflow-y-auto">
      <div className="mx-auto max-w-[80rem] px-5 pb-16 sm:px-10">
        {/* masthead */}
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
                distribution
              </div>
              <p
                className="hand mt-1 max-w-[27rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                Taste is distance from the mean, chosen on purpose. Every stone
                here is placed by how alike its nearest stones are; weigh a
                thing you are about to read and see where it lands on your own
                curve.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/distribution" />
            <button
              onClick={() => setTheme(theme === "paper" ? "sumi" : "paper")}
              className="chip px-2.5 py-1.5 text-[10px] tracking-[0.14em] uppercase"
              style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
              aria-label="Toggle theme"
            >
              {theme === "paper" ? "sumi" : "paper"}
            </button>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {/* ── the sheet ─────────────────────────────────────────────── */}
          <section
            className="panel sketched rise relative p-2 sm:p-3"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The distribution"
          >
            <Sketch seed="distribution-sheet" draw />

            {/* the windows */}
            <div className="relative z-[2] flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
              <span className="meta" style={{ color: "var(--faint)" }}>
                {curve
                  ? `${curve.n} stones · kinship over the ${data?.k ?? 8} nearest`
                  : ""}
              </span>
              <div className="flex items-center gap-3">
                {WINDOWS.map((w) => {
                  const on = w.key === win;
                  const has = !!data?.windows[w.key];
                  return (
                    <button
                      key={w.key}
                      onClick={() => has && setWin(w.key)}
                      disabled={!has}
                      className="t-tab meta relative"
                      style={{
                        color: on
                          ? "var(--ink)"
                          : has
                            ? "var(--faint)"
                            : "var(--rule)",
                        textTransform: "none",
                        cursor: has ? "pointer" : "default",
                      }}
                      aria-pressed={on}
                      title={has ? undefined : "too few stones in this window"}
                    >
                      {w.label}
                      {on && (
                        <Sketch
                          kind="underline"
                          seed={w.key}
                          color="var(--accent)"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {data?.frozen ? (
              <p
                className="hand px-2 py-16 text-center text-[15px]"
                style={{ color: "var(--faint)" }}
              >
                the distribution needs the private garden — a deployed sheet has
                no text to weigh.
              </p>
            ) : !curve || !drawn ? (
              <div
                className="grid place-items-center"
                style={{ aspectRatio: `${W} / ${H}` }}
              >
                <span
                  className="meta breathe"
                  style={{ color: "var(--faint)" }}
                >
                  weighing the garden against itself
                </span>
              </div>
            ) : (
              <svg
                ref={svgRef}
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="xMidYMid meet"
                className="distribution-sheet block w-full select-none"
                style={{ aspectRatio: `${W} / ${H}`, touchAction: "none" }}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                onPointerLeave={onLeave}
                role="img"
                aria-label={`${curve.n} stones on a curve of kinship; ${placement ? `the candidate sits at ${sig(placement.z)}` : "nothing weighed yet"}`}
              >
                {/* the band under the pointer, or held */}
                {captionBand && (
                  <rect
                    className="t-band"
                    x={X(captionBand[0])}
                    y={BASE - RISE - 26}
                    width={X(captionBand[1]) - X(captionBand[0])}
                    height={RISE + 26}
                    fill="var(--accent)"
                    fillOpacity={band ? 0.08 : 0.045}
                  />
                )}

                {/* the ground under the curve */}
                <path d={drawn.fill} fill="var(--ink)" fillOpacity={0.035} />

                {/* σ marks */}
                {[-2, -1, 1, 2].map((s) => (
                  <g key={s}>
                    <line
                      x1={X(s)}
                      y1={BASE - 6}
                      x2={X(s)}
                      y2={BASE + 6}
                      stroke="var(--faint)"
                      strokeWidth={1}
                    />
                    <text
                      className="b-mono"
                      x={X(s)}
                      y={BASE + 22}
                      textAnchor="middle"
                      fontSize={9.5}
                      letterSpacing={1}
                      fill="var(--faint)"
                    >
                      {sig(s)}
                    </text>
                  </g>
                ))}
                <line
                  x1={X(0)}
                  y1={BASE - RISE - 18}
                  x2={X(0)}
                  y2={BASE + 8}
                  stroke="var(--faint)"
                  strokeDasharray="2 5"
                  strokeOpacity={0.7}
                />
                <text
                  className="b-mono"
                  x={X(0)}
                  y={BASE + 22}
                  textAnchor="middle"
                  fontSize={9.5}
                  letterSpacing={1}
                  fill="var(--muted)"
                >
                  μ · the middle of the garden
                </text>
                <text
                  className="b-hand"
                  x={X0 - 4}
                  y={BASE + 40}
                  fontSize={13.5}
                  fill="var(--faint)"
                >
                  ← unlike the garden
                </text>
                <text
                  className="b-hand"
                  x={X1 + 4}
                  y={BASE + 40}
                  textAnchor="end"
                  fontSize={13.5}
                  fill="var(--faint)"
                >
                  more of the same →
                </text>

                {/* every stone, under the curve, in its bed's colour */}
                {drawn.stipple.map((it) => {
                  const dim = band ? it.z < band[0] || it.z >= band[1] : false;
                  return (
                    <circle
                      key={it.id}
                      className="t-dot"
                      cx={it.x}
                      cy={it.y}
                      r={2.4}
                      fill={`var(--kind-${it.kind})`}
                      opacity={dim ? 0.14 : band ? 0.95 : 0.6}
                      onPointerEnter={(e) =>
                        showCard(e, { label: it.label, kind: it.kind, z: it.z })
                      }
                      onPointerLeave={() => setHover(null)}
                    />
                  );
                })}

                {/* the curve, in the hand */}
                <path d={drawn.axis} fill="var(--pen)" />
                <path d={drawn.ink} fill="var(--pen)" />

                {/* what has been weighed before, as ticks under the axis */}
                {data?.choices.map((c) => {
                  const z = c.z[win];
                  if (z === undefined) return null;
                  const r = rand(seedOf(`tick-${c.slug}`));
                  return (
                    <g key={c.slug} className="t-tick">
                      <title>{`${c.title} · ${sig(z)} · ${c.verdict || "undecided"}`}</title>
                      <path
                        d={ribbon(
                          stroke(
                            [X(z), BASE + 30],
                            [X(z), BASE + 44],
                            r,
                            0.7,
                            0,
                          ),
                          1.4,
                          seedOf(c.slug),
                        )}
                        fill={
                          c.verdict === "let in"
                            ? "var(--accent)"
                            : c.verdict === "passed"
                              ? "var(--faint)"
                              : "var(--muted)"
                        }
                      />
                    </g>
                  );
                })}
                {data && data.choices.length > 0 && (
                  <text
                    className="b-hand"
                    x={X0 - 4}
                    y={BASE + 62}
                    fontSize={12.5}
                    fill="var(--faint)"
                  >
                    weighed before: let in in the accent, passed in grey
                  </text>
                )}

                {/* the candidate, dropped onto its place */}
                {placement && (
                  <g
                    className="t-cand"
                    transform={`translate(${X(placement.z)} 0)`}
                    style={{
                      transition: reduce
                        ? undefined
                        : "transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  >
                    <g key={drops} className={reduce ? undefined : "t-drop"}>
                      <path
                        d={ribbon(
                          stroke(
                            [0, BASE - 2],
                            [0, BASE - RISE - 22],
                            rand(seedOf(`cand-${drops}`)),
                            1.4,
                            0,
                          ),
                          1.5,
                          seedOf(`cand-${drops}`),
                        )}
                        fill="var(--accent)"
                        opacity={0.8}
                      />
                      <circle
                        cy={BASE - RISE - 28}
                        r={6.4}
                        fill="var(--accent)"
                      />
                      <text
                        className="b-mono"
                        y={BASE - RISE - 42}
                        textAnchor="middle"
                        fontSize={10.5}
                        letterSpacing={1.2}
                        fill="var(--accent)"
                      >
                        {sig(placement.z)}
                      </text>
                    </g>
                    <text
                      className="b-hand"
                      x={placement.z > 1.6 ? -14 : 14}
                      y={BASE - RISE - 24}
                      textAnchor={placement.z > 1.6 ? "end" : "start"}
                      fontSize={15}
                      fill="var(--ink)"
                    >
                      {(reading?.title || "this").slice(0, 40)}
                      {(reading?.title?.length ?? 0) > 40 ? "…" : ""}
                    </text>
                  </g>
                )}
              </svg>
            )}

            {/* the card over a stone */}
            {hover && (
              <div
                ref={card}
                className="card fade pointer-events-none absolute z-[5] px-3 py-2"
                style={{
                  left: hover.x + 14,
                  top: hover.y - 10,
                  maxWidth: "16rem",
                }}
              >
                <div
                  className="meta"
                  style={{ color: `var(--kind-${hover.kind})` }}
                >
                  {KIND_LABEL[hover.kind] ?? hover.kind}
                  <span style={{ color: "var(--faint)", textTransform: "none" }}>
                    {" "}
                    · {sig(hover.z)}
                  </span>
                </div>
                <div
                  className="hand mt-0.5 text-[15px] leading-[1.2]"
                  style={{ color: "var(--ink)" }}
                >
                  {hover.label}
                </div>
              </div>
            )}

            {/* the caption: the band under the pointer, or held */}
            <div
              className="relative mt-2 min-h-[3.6rem] pl-3"
              style={{
                borderLeft: `2px solid ${captionBand ? "var(--accent)" : "var(--rule)"}`,
                transition: "border-color 220ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              aria-live="polite"
            >
              {captionBand ? (
                <>
                  <div className="meta" style={{ color: "var(--accent)", textTransform: "none" }}>
                    {bandLabel(captionBand)}
                    <span style={{ color: "var(--faint)" }}>
                      {" "}
                      · {bandCount} stones
                      {band
                        ? " · held — esc lets go"
                        : " · click to hold, drag for your own band"}
                    </span>
                  </div>
                  <p
                    className="hand mt-1 text-[15px] leading-[1.3]"
                    style={{ color: "var(--muted)" }}
                  >
                    {band && (band[1] - band[0]) % 1 !== 0
                      ? "your own band."
                      : bandWords(captionBand)}
                  </p>
                </>
              ) : (
                <>
                  <div className="meta" style={{ color: "var(--faint)" }}>
                    the curve is the garden
                  </div>
                  <p
                    className="hand mt-1 text-[15px] leading-[1.3]"
                    style={{ color: "var(--muted)" }}
                  >
                    each mark is one stone, in its bed's colour, placed by how
                    alike its nearest stones are. hover one to name it; click a
                    band to list what lives there; weigh something on the right
                    to drop it in.
                  </p>
                </>
              )}
            </div>
          </section>

          {/* ── the desk ──────────────────────────────────────────────── */}
          <aside
            className="rise flex flex-col gap-5"
            style={{ animationDelay: "140ms" }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                weigh();
              }}
            >
              <label
                className="meta block"
                htmlFor="taste-title"
                style={{ color: "var(--faint)" }}
              >
                weigh a thing before you let it in
              </label>
              <input
                id="taste-title"
                ref={titleInput}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="its title  /"
                className="search mt-2 w-full px-3 py-2 text-[13px]"
                autoComplete="off"
                maxLength={200}
              />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="a line or two of it — the blurb, the opening, the description"
                rows={4}
                className="search mt-2 w-full resize-y px-3 py-2 text-[13px] leading-[1.5]"
              />
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="or paste a link"
                  className="search min-w-0 flex-1 px-3 py-1.5 text-[12px]"
                  autoComplete="off"
                  inputMode="url"
                />
                <button
                  type="button"
                  onClick={readPage}
                  disabled={!url.trim() || busy !== ""}
                  className="chip shrink-0 px-2.5 py-1.5 text-[10px] tracking-[0.14em] uppercase"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted)",
                  }}
                >
                  {busy === "reading" ? "reading…" : "read the page"}
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={busy !== "" || !(title.trim() || text.trim())}
                  className="chip px-3 py-1.5 text-[10px] tracking-[0.14em] uppercase"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--ink)",
                    background:
                      "color-mix(in srgb, var(--accent) 12%, transparent)",
                    borderColor:
                      "color-mix(in srgb, var(--accent) 40%, var(--rule))",
                  }}
                >
                  {busy === "weighing" ? "weighing…" : "weigh it"}
                </button>
                {error && (
                  <span
                    className="hand text-[13.5px]"
                    style={{ color: "var(--accent)" }}
                  >
                    {error}
                  </span>
                )}
              </div>
              <p
                className="hand mt-1.5 text-[13.5px] leading-[1.3]"
                style={{ color: "var(--faint)" }}
              >
                reading a link is the one thing here that leaves the machine,
                and only when you press it.
              </p>
            </form>

            {/* the reading */}
            {reading && (
              <section
                className="panel sketched relative p-4"
                style={{ borderRadius: 3 }}
                aria-label="The reading"
              >
                <Sketch
                  seed={`reading-${reading.title}`}
                  color="var(--accent)"
                  draw
                />
                <h2
                  className="hand text-[21px] leading-[1.15]"
                  style={{ color: "var(--ink)" }}
                >
                  {reading.title || "untitled"}
                </h2>

                <dl className="mt-3">
                  {WINDOWS.map((w) => {
                    const p = reading.windows[w.key];
                    return (
                      <div key={w.key} className="mt-2 first:mt-0">
                        <dt
                          className="meta"
                          style={{
                            color:
                              w.key === win ? "var(--accent)" : "var(--faint)",
                          }}
                        >
                          {w.against}
                          {p && (
                            <span
                              className="ml-2"
                              style={{
                                color: "var(--ink)",
                                textTransform: "none",
                                letterSpacing: 0,
                              }}
                            >
                              {sig(p.z)}
                            </span>
                          )}
                        </dt>
                        <dd
                          className="mt-0.5 text-[13px] leading-[1.5]"
                          style={{ color: p ? "var(--ink)" : "var(--faint)" }}
                        >
                          {p
                            ? p.words
                            : "too few stones tended in this window to draw a curve."}
                        </dd>
                      </div>
                    );
                  })}
                </dl>

                {placement && placement.kin.length > 0 && (
                  <div className="mt-4 border-t pt-3 rule">
                    <div className="meta" style={{ color: "var(--faint)" }}>
                      its kin,{" "}
                      {WINDOWS.find((w) => w.key === win)!.against.replace(
                        "against ",
                        "in ",
                      )}
                    </div>
                    <ul className="mt-1.5">
                      {placement.kin.slice(0, 6).map((k) => (
                        <li key={k.id} className="py-0.5">
                          <div className="flex items-baseline gap-2">
                            <span
                              aria-hidden
                              className="shrink-0"
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: 99,
                                background: `var(--kind-${k.kind})`,
                              }}
                            />
                            <Link
                              href={`/catalogue?id=${encodeURIComponent(k.id)}`}
                              className="b-stone-link min-w-0 truncate text-[12.5px]"
                              style={{ color: "var(--muted)" }}
                            >
                              {k.label}
                            </Link>
                            <span
                              className="meta ml-auto shrink-0"
                              style={{ color: "var(--faint)", textTransform: "none" }}
                            >
                              {k.sim.toFixed(2)}
                            </span>
                          </div>
                          <div
                            className="hand ml-[14px] text-[12.5px] leading-[1.2]"
                            style={{ color: "var(--faint)" }}
                          >
                            {k.shared.slice(0, 4).join(" · ") || "almost nothing in common"}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 border-t pt-3 rule">
                  <div className="meta" style={{ color: "var(--faint)" }}>
                    speaks your words
                  </div>
                  {reading.concepts.length ? (
                    <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                      {reading.concepts.map((c) => (
                        <li key={c.id} className="relative">
                          <Link
                            href={`/catalogue?id=${encodeURIComponent(c.id)}`}
                            className="b-stone-link text-[12.5px]"
                            style={{
                              color: c.signed ? "var(--ink)" : "var(--muted)",
                            }}
                          >
                            {c.label}
                          </Link>
                          {c.signed && (
                            <Sketch
                              kind="ring"
                              seed={c.id}
                              color="var(--accent)"
                              draw
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p
                      className="hand mt-1 text-[13.5px]"
                      style={{ color: "var(--faint)" }}
                    >
                      none of your glossary, ringed or not.
                    </p>
                  )}
                  <p
                    className="meta mt-2"
                    style={{
                      color: "var(--faint)",
                      textTransform: "none",
                      letterSpacing: "0.04em",
                    }}
                  >
                    weighed on: {reading.terms.join(" · ")}
                  </p>
                </div>

                <div className="mt-4 border-t pt-3 rule">
                  <div className="meta" style={{ color: "var(--faint)" }}>
                    your call — a record, not a verdict
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {(["let in", "passed"] as const).map((v) => {
                      const on = kept?.verdict === v;
                      return (
                        <button
                          key={v}
                          onClick={() => keep(v)}
                          disabled={busy !== ""}
                          className="chip relative px-2.5 py-1.5 text-[10px] tracking-[0.14em] uppercase"
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: on ? "var(--ink)" : "var(--muted)",
                            borderColor: on ? "transparent" : undefined,
                          }}
                          aria-pressed={on}
                        >
                          {v === "let in" ? "let it in" : "pass"}
                          {on && (
                            <Sketch
                              kind="ring"
                              seed={`${v}-on`}
                              color="var(--accent)"
                              draw
                            />
                          )}
                        </button>
                      );
                    })}
                    {kept && (
                      <span className="meta" style={{ color: "var(--faint)" }}>
                        kept · {kept.weighed}
                      </span>
                    )}
                  </div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onBlur={saveNote}
                    placeholder="why, in your own hand"
                    rows={2}
                    className="search hand mt-3 w-full resize-y px-3 py-2 text-[15px] leading-[1.3]"
                  />
                </div>
              </section>
            )}

            {/* what lives in the held band */}
            {band && curve && (
              <section aria-label="In the band">
                <div className="meta" style={{ color: "var(--faint)", textTransform: "none" }}>
                  {inBand.length} stones · {bandLabel(band)}
                </div>
                <ul className="mt-1.5 max-h-[22rem] overflow-y-auto scroll-thin">
                  {inBand.slice(0, 80).map((it) => (
                    <li
                      key={it.id}
                      className="flex items-baseline gap-2 py-0.5"
                    >
                      <span
                        aria-hidden
                        className="shrink-0"
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 99,
                          background: `var(--kind-${it.kind})`,
                        }}
                      />
                      <Link
                        href={`/catalogue?id=${encodeURIComponent(it.id)}`}
                        className="b-stone-link min-w-0 truncate text-[12.5px]"
                        style={{ color: "var(--muted)" }}
                      >
                        {it.label}
                      </Link>
                      <span
                        className="meta ml-auto shrink-0"
                        style={{ color: "var(--faint)", textTransform: "none" }}
                      >
                        {sig(it.z)}
                      </span>
                    </li>
                  ))}
                </ul>
                {inBand.length > 80 && (
                  <p
                    className="hand mt-1 text-[13px]"
                    style={{ color: "var(--faint)" }}
                  >
                    and {inBand.length - 80} more — narrow the band.
                  </p>
                )}
              </section>
            )}

            {/* weighed before */}
            {data && data.choices.length > 0 && (
              <section aria-label="Weighed before">
                <div className="meta" style={{ color: "var(--faint)" }}>
                  weighed before · {data.choices.length}
                </div>
                <ul className="mt-1.5">
                  {data.choices.slice(0, 30).map((c) => (
                    <li key={c.slug} className="flex items-baseline gap-2 py-1">
                      <span
                        aria-hidden
                        className="shrink-0"
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 99,
                          background:
                            c.verdict === "let in"
                              ? "var(--accent)"
                              : c.verdict === "passed"
                                ? "var(--faint)"
                                : "var(--muted)",
                        }}
                      />
                      <button
                        onClick={() => again(c)}
                        className="b-row hand min-w-0 flex-1 truncate text-left text-[15px] leading-[1.25]"
                        style={{
                          color:
                            kept?.slug === c.slug
                              ? "var(--ink)"
                              : "var(--muted)",
                        }}
                        title="weigh it again"
                      >
                        {c.title}
                      </button>
                      <span
                        className="meta shrink-0"
                        style={{ color: "var(--faint)", textTransform: "none" }}
                      >
                        {c.z.all !== undefined ? sig(c.z.all) : "—"} ·{" "}
                        {c.verdict || "undecided"}
                      </span>
                      <button
                        onClick={() => letGo(c.slug)}
                        className="meta shrink-0"
                        style={{ color: "var(--faint)" }}
                        aria-label={`let go of ${c.title}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <p
              className="hand text-[13.5px] leading-[1.35]"
              style={{ color: "var(--faint)" }}
            >
              how it is measured: a stone's kinship is the mean likeness to its{" "}
              {data?.k ?? 8} nearest stones, on shared words (tf-idf cosine over
              titles, tags and the first lines) — never on meaning. the kin are
              listed so you can check the measure against your own sense of it.
              {data?.dir ? ` choices are kept at ${shortHome(data.dir)}.` : ""}
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
