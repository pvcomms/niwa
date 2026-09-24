"use client";

import { putOnDesk } from "./desk";
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
type Measure = "words" | "themes";

const WINDOWS: { key: WinKey; label: string; against: string }[] = [
  { key: "all", label: "everything", against: "against everything" },
  { key: "d90", label: "90 days", against: "against the last 90 days" },
  { key: "d30", label: "30 days", against: "against the last 30 days" },
];

const MEASURES: { key: Measure; label: string; what: string }[] = [
  {
    key: "themes",
    label: "themes",
    what: "what the garden's words co-occur as",
  },
  { key: "words", label: "words", what: "shared words and phrases, no more" },
];

type Payload = {
  frozen?: boolean;
  measures: Record<Measure, Record<WinKey, Curve | null>>;
  k: number;
  themesK: number;
  anchorMin: number;
  anchorTypical: number;
  corpus: number;
  choices: Choice[];
  dir: string | null;
};

type Reading = {
  title: string;
  terms: string[];
  unknown: string[];
  concepts: { id: string; label: string; signed: boolean }[];
  /** how much of it the garden's themes could hold, against a typical stone */
  anchor: number;
  anchorTypical: number;
  measures: Record<Measure, Record<WinKey, Placement | null>>;
};

/** One thing weighed this session. */
type Item = {
  id: string;
  title: string;
  text: string;
  source: string;
  reading: Reading;
  kept: Choice | null;
  note: string;
};

type Hover = {
  label: string;
  kind: string;
  z: number;
  x: number;
  y: number;
  extra?: string;
};

/** The sheet's frame. */
const W = 900;
const H = 372;
const X0 = 60;
const X1 = 840;
const BASE = 292;
const RISE = 216;
const ZMIN = -3.2;
const ZMAX = 3.2;
const TOP = BASE - RISE - 28;

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
const X = (z: number) =>
  X0 + ((clamp(z, ZMIN, ZMAX) - ZMIN) / (ZMAX - ZMIN)) * (X1 - X0);
const Z = (x: number) => ZMIN + ((x - X0) / (X1 - X0)) * (ZMAX - ZMIN);
const sig = (z: number) => `${z >= 0 ? "+" : "−"}${Math.abs(z).toFixed(1)}σ`;
const shortHome = (p: string) => p.replace(/^\/Users\/[^/]+/, "~");
const words = (s: string) => s.split(/\s+/).filter((w) => w.length > 2).length;
const zKey = (m: Measure, w: WinKey) => `${m}_${w}`;
const ellipsis = "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap";

/** The bands of the curve, the way the site reads them, both tails named. */
function bandOf(z: number): [number, number] {
  if (z < -2) return [-4, -2];
  if (z < -1) return [-2, -1];
  if (z < 0) return [-1, 0];
  if (z < 1) return [0, 1];
  if (z < 2) return [1, 2];
  return [2, 4];
}

function bandWords([, hi]: [number, number]): string {
  if (hi <= -2) return "the far tail · unlike the garden · the unexpected";
  if (hi <= -1) return "a step out · less like what is here";
  if (hi <= 1)
    return "the middle · where most of what you keep sits · base rates";
  if (hi <= 2) return "a step in · more like the rest";
  return "the far tail · more of the same · the garden already full of it";
}

const bandLabel = ([lo, hi]: [number, number]) =>
  `${lo <= -4 ? "←" : sig(lo)} to ${hi >= 4 ? "→" : sig(hi)}`;

/** Where a kept choice sat, on this measure and window, if it was weighed on it. */
const choiceZ = (c: Choice, m: Measure, w: WinKey): number | undefined =>
  c.z[zKey(m, w)] ?? (m === "words" ? c.z[w] : undefined);

/** What a gap between the two measures says. */
function gapWords(measure: Measure, here: number, there: number): string {
  const closer = here > there;
  if (measure === "themes")
    return closer
      ? "closer on themes than on words: about your things, in other words."
      : "further on themes than on words: your words, about something else.";
  return closer
    ? "closer on words than on themes: your words, about something else."
    : "further on words than on themes: about your things, in other words.";
}

/**
 * The distribution. Every stone in the garden placed by its kinship — how
 * alike its nearest stones are, on words or on the themes the garden's
 * words co-occur as — standardised against the garden's own spread and
 * drawn as a curve with the stones under it. A thing the reader is about to
 * read is weighed the same way and dropped onto the curve, with threads to
 * its kin. Both tails are real, neither is praised.
 */
export default function Distribution() {
  const [data, setData] = useState<Payload | null>(null);
  const [win, setWin] = useState<WinKey>("all");
  const [measure, setMeasure] = useState<Measure>("themes");
  const [hover, setHover] = useState<Hover | null>(null);
  const [band, setBand] = useState<[number, number] | null>(null);
  const [under, setUnder] = useState<[number, number] | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<"" | "reading" | "weighing" | "keeping">("");
  const [error, setError] = useState("");
  const [live, setLive] = useState<Reading | null>(null);
  const [tray, setTray] = useState<Item[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    const it = sel ? tray.find((i) => i.id === sel) : null;
    putOnDesk(it ? { kind: "weighed", id: it.id, label: it.title } : null);
    return () => putOnDesk(null);
  }, [sel, tray]);
  const [note, setNote] = useState("");
  const [reduce, setReduce] = useState(false);
  const [theme, setTheme] = useTheme();

  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ z0: number; z1: number; moved: boolean } | null>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const liveSeq = useRef(0);

  useEffect(() => {
    fetch("/api/taste", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Payload | null) => p && setData(p));
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const curve = data?.measures[measure][win] ?? null;

  /** What the desk reads: the tray item picked, else the thing being typed. */
  const current: Item | null = useMemo(() => {
    const picked = tray.find((t) => t.id === sel);
    if (picked) return picked;
    if (live)
      return {
        id: "live",
        title: live.title || title,
        text,
        source: url,
        reading: live,
        kept: null,
        note: "",
      };
    return null;
  }, [tray, sel, live, title, text, url]);
  const placement = current?.reading.measures[measure][win] ?? null;
  const other: Measure = measure === "words" ? "themes" : "words";
  const otherPlacement = current?.reading.measures[other][win] ?? null;
  const against = WINDOWS.find((w) => w.key === win)!.against;

  useEffect(() => {
    setNote(current?.kept?.note ?? current?.note ?? "");
  }, [current?.id, current?.kept?.note, current?.note]);

  // ── the curve, drawn once per measure and window ─────────────────────────
  const drawn = useMemo(() => {
    if (!curve) return null;
    const seed = seedOf(`curve-${measure}-${win}-${curve.n}`);
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
      at: new Map(stipple.map((s) => [s.id, s])),
    };
  }, [curve, measure, win]);

  const inBand = useMemo(() => {
    if (!curve || !band) return [];
    return curve.items
      .filter((it) => it.z >= band[0] && it.z < band[1])
      .sort((a, b) => a.z - b.z);
  }, [curve, band]);

  const kinIds = useMemo(
    () => new Set((placement?.kin ?? []).map((k) => k.id)),
    [placement],
  );

  // ── the pointer on the sheet ─────────────────────────────────────────────
  const zAt = useCallback((e: { clientX: number }) => {
    const box = svgRef.current!.getBoundingClientRect();
    return Z(((e.clientX - box.left) / box.width) * W);
  }, []);

  const onDown = (e: ReactPointerEvent) => {
    if ((e.target as Element).closest(".t-dot, .t-tab, .t-hit")) return;
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
        setSel(null);
        (e.target as HTMLElement)?.blur?.();
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        titleInput.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── weighing: live as you type, then pinned to the tray on a press ───────
  const weighText = useCallback(
    async (t: string, body: string): Promise<Reading> => {
      const res = await fetch("/api/taste", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: t, text: body }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "could not weigh it");
      return j.reading as Reading;
    },
    [],
  );

  useEffect(() => {
    if (words(`${title} ${text}`) < 4) {
      setLive(null);
      return;
    }
    const seq = ++liveSeq.current;
    const timer = window.setTimeout(async () => {
      try {
        const r = await weighText(title.trim() || url.trim(), text);
        if (seq === liveSeq.current) {
          setLive(r);
          setSel(null);
        }
      } catch {
        /* the pinned weigh will say why */
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [title, text, url, weighText]);

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
    try {
      const r = await weighText(title.trim() || url.trim(), text);
      const item: Item = {
        id: `w${Date.now()}`,
        title: r.title || title || url,
        text,
        source: url.trim(),
        reading: r,
        kept: null,
        note: "",
      };
      liveSeq.current++;
      setLive(null);
      setTray((t) => [item, ...t]);
      setSel(item.id);
      setTitle("");
      setText("");
      setUrl("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const patchItem = (id: string, change: Partial<Item>) =>
    setTray((t) => t.map((it) => (it.id === id ? { ...it, ...change } : it)));

  const swapChoice = (c: Choice) =>
    setData((d) =>
      d
        ? { ...d, choices: d.choices.map((x) => (x.slug === c.slug ? c : x)) }
        : d,
    );

  const keep = async (verdict: Verdict) => {
    if (!current || current.id === "live") return;
    if (current.kept) {
      const res = await fetch("/api/taste", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: current.kept.slug, verdict }),
      });
      if (!res.ok) return;
      const c = (await res.json()) as Choice;
      patchItem(current.id, { kept: c });
      swapChoice(c);
      return;
    }
    setBusy("keeping");
    const z: Record<string, number> = {};
    for (const m of MEASURES)
      for (const w of WINDOWS) {
        const p = current.reading.measures[m.key][w.key];
        if (p) z[zKey(m.key, w.key)] = p.z;
      }
    const res = await fetch("/api/taste", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: current.title,
        source: current.source,
        text: current.text,
        verdict,
        note,
        z,
      }),
    });
    setBusy("");
    if (!res.ok) return;
    const c = (await res.json()) as Choice;
    patchItem(current.id, { kept: c, note });
    setData((d) => (d ? { ...d, choices: [c, ...d.choices] } : d));
  };

  const saveNote = async () => {
    if (!current || current.id === "live") return;
    patchItem(current.id, { note });
    if (!current.kept || note === current.kept.note) return;
    const res = await fetch("/api/taste", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: current.kept.slug, note }),
    });
    if (!res.ok) return;
    const c = (await res.json()) as Choice;
    patchItem(current.id, { kept: c });
    swapChoice(c);
  };

  const letGo = async (slug: string) => {
    await fetch(`/api/taste?slug=${encodeURIComponent(slug)}`, {
      method: "DELETE",
    });
    setData((d) =>
      d ? { ...d, choices: d.choices.filter((c) => c.slug !== slug) } : d,
    );
    setTray((t) =>
      t.map((it) => (it.kept?.slug === slug ? { ...it, kept: null } : it)),
    );
  };

  const again = (c: Choice) => {
    setSel(null);
    setTitle(c.title);
    setText(c.text);
    setUrl(c.source);
    titleInput.current?.focus();
  };

  const captionBand = band ?? under;
  const bandCount =
    captionBand && curve
      ? curve.items.filter(
          (it) => it.z >= captionBand[0] && it.z < captionBand[1],
        ).length
      : 0;
  const measureOf = (m: Measure) => MEASURES.find((x) => x.key === m)!;

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

            {/* the measure and the windows */}
            <div className="relative z-[2] flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1 pt-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="meta" style={{ color: "var(--faint)" }}>
                  {curve
                    ? `${curve.n} stones · kinship over the ${data?.k ?? 8} nearest, on`
                    : ""}
                </span>
                {MEASURES.map((m) => {
                  const on = m.key === measure;
                  return (
                    <button
                      key={m.key}
                      onClick={() => setMeasure(m.key)}
                      className="t-tab meta relative"
                      style={{
                        color: on ? "var(--ink)" : "var(--faint)",
                        textTransform: "none",
                      }}
                      aria-pressed={on}
                      title={m.what}
                    >
                      {m.label}
                      {on && (
                        <Sketch
                          kind="underline"
                          seed={`m-${m.key}`}
                          color="var(--accent)"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3">
                {WINDOWS.map((w) => {
                  const on = w.key === win;
                  const has = !!data?.measures[measure][w.key];
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
                aria-label={`${curve.n} stones on a curve of kinship on ${measure}; ${placement && current ? `${current.title} sits at ${sig(placement.z)}` : "nothing weighed yet"}`}
              >
                {/* the band under the pointer, or held */}
                {captionBand && (
                  <rect
                    className="t-band"
                    x={X(captionBand[0])}
                    y={TOP - 4}
                    width={X(captionBand[1]) - X(captionBand[0])}
                    height={BASE - TOP + 4}
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
                  y1={TOP - 10}
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
                  const kin = kinIds.has(it.id);
                  return (
                    <circle
                      key={it.id}
                      className="t-dot"
                      cx={it.x}
                      cy={it.y}
                      r={kin ? 3.2 : 2.4}
                      fill={`var(--kind-${it.kind})`}
                      opacity={
                        dim
                          ? 0.14
                          : band
                            ? 0.95
                            : kin
                              ? 1
                              : placement
                                ? 0.42
                                : 0.6
                      }
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

                {/* what has been kept before, as ticks under the axis */}
                {data?.choices.map((c) => {
                  const z = choiceZ(c, measure, win);
                  if (z === undefined) return null;
                  const r = rand(seedOf(`tick-${c.slug}`));
                  const colour =
                    c.verdict === "let in"
                      ? "var(--accent)"
                      : c.verdict === "passed"
                        ? "var(--faint)"
                        : "var(--muted)";
                  return (
                    <g key={c.slug} className="t-tick">
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
                        fill={colour}
                      />
                      <circle
                        className="t-hit"
                        cx={X(z)}
                        cy={BASE + 37}
                        r={9}
                        fill="transparent"
                        style={{ cursor: "pointer" }}
                        onPointerEnter={(e) =>
                          showCard(e, {
                            label: c.title,
                            kind: "choice",
                            z,
                            extra: `${c.verdict || "undecided"} · ${c.weighed} · click to weigh again`,
                          })
                        }
                        onPointerLeave={() => setHover(null)}
                        onClick={() => again(c)}
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
                    kept before: let in in the accent, passed in grey
                  </text>
                )}

                {/* threads from the weighed thing to its kin */}
                {placement &&
                  placement.kin.map((k, i) => {
                    const at = drawn.at.get(k.id);
                    if (!at) return null;
                    const r = rand(seedOf(`thread-${k.id}`));
                    return (
                      <g
                        key={k.id}
                        className="t-thread"
                        opacity={0.26 - i * 0.02}
                      >
                        <path
                          d={ribbon(
                            stroke(
                              [X(placement.z), TOP],
                              [at.x, at.y],
                              r,
                              6,
                              0,
                            ),
                            1.1,
                            seedOf(k.id),
                          )}
                          fill="var(--accent)"
                        />
                        <circle
                          cx={at.x}
                          cy={at.y}
                          r={5.5}
                          fill="none"
                          stroke="var(--accent)"
                          strokeWidth={1}
                        />
                      </g>
                    );
                  })}

                {/* the rest of the tray, small */}
                {tray.map((it) => {
                  if (it.id === current?.id) return null;
                  const p = it.reading.measures[measure][win];
                  if (!p) return null;
                  return (
                    <g
                      key={it.id}
                      className="t-cand t-hit"
                      transform={`translate(${X(p.z)} 0)`}
                      style={{ cursor: "pointer" }}
                      opacity={0.55}
                      onClick={() => setSel(it.id)}
                      onPointerEnter={(e) =>
                        showCard(e, {
                          label: it.title,
                          kind: "weighed",
                          z: p.z,
                          extra: it.kept
                            ? `kept · ${it.kept.verdict || "undecided"}`
                            : "this sitting · click to read",
                        })
                      }
                      onPointerLeave={() => setHover(null)}
                    >
                      <line
                        x1={0}
                        y1={TOP + 8}
                        x2={0}
                        y2={BASE - 2}
                        stroke="var(--accent)"
                        strokeWidth={1}
                        strokeDasharray="2 4"
                      />
                      <circle cy={TOP} r={4.5} fill="var(--accent)" />
                    </g>
                  );
                })}

                {/* the weighed thing, dropped onto its place */}
                {placement && current && (
                  <g
                    className="t-cand"
                    transform={`translate(${X(placement.z)} 0)`}
                    style={{
                      transition: reduce
                        ? undefined
                        : "transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  >
                    <g
                      key={current.id}
                      className={
                        reduce || current.id === "live" ? undefined : "t-drop"
                      }
                    >
                      <path
                        d={ribbon(
                          stroke(
                            [0, BASE - 2],
                            [0, TOP + 6],
                            rand(seedOf(`cand-${current.id}`)),
                            1.4,
                            0,
                          ),
                          1.5,
                          seedOf(`cand-${current.id}`),
                        )}
                        fill="var(--accent)"
                        opacity={0.8}
                      />
                      {current.id === "live" ? (
                        <circle
                          cy={TOP}
                          r={6.4}
                          fill="var(--bg)"
                          stroke="var(--accent)"
                          strokeWidth={2}
                        />
                      ) : (
                        <circle cy={TOP} r={6.4} fill="var(--accent)" />
                      )}
                      <text
                        className="b-mono"
                        y={TOP - 14}
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
                      y={TOP + 4}
                      textAnchor={placement.z > 1.6 ? "end" : "start"}
                      fontSize={15}
                      fill="var(--ink)"
                    >
                      {current.title.slice(0, 40)}
                      {current.title.length > 40 ? "…" : ""}
                      {current.id === "live" ? "  · as you type" : ""}
                    </text>
                  </g>
                )}
              </svg>
            )}

            {/* the card over a stone, a tick or a weighed thing */}
            {hover && (
              <div
                className="card fade pointer-events-none absolute z-[5] px-3 py-2"
                style={{
                  left: hover.x + 14,
                  top: hover.y - 10,
                  maxWidth: "16rem",
                }}
              >
                <div
                  className="meta"
                  style={{
                    color:
                      hover.kind === "choice" || hover.kind === "weighed"
                        ? "var(--accent)"
                        : `var(--kind-${hover.kind})`,
                  }}
                >
                  {hover.kind === "choice"
                    ? "kept"
                    : hover.kind === "weighed"
                      ? "weighed"
                      : (KIND_LABEL[hover.kind] ?? hover.kind)}
                  <span
                    style={{ color: "var(--faint)", textTransform: "none" }}
                  >
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
                {hover.extra && (
                  <div
                    className="meta mt-0.5"
                    style={{ color: "var(--faint)", textTransform: "none" }}
                  >
                    {hover.extra}
                  </div>
                )}
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
                  <div
                    className="meta"
                    style={{ color: "var(--accent)", textTransform: "none" }}
                  >
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
                    the curve is the garden · on {measure}
                  </div>
                  <p
                    className="hand mt-1 text-[15px] leading-[1.3]"
                    style={{ color: "var(--muted)" }}
                  >
                    {measureOf(measure).what}. each mark is one stone, in its
                    bed's colour, placed by how alike its nearest stones are.
                    hover one to name it; click a band to list what lives there;
                    weigh something on the right to drop it in — the threads run
                    to its kin.
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
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    weigh();
                  }
                }}
                placeholder="a line or two of it — the blurb, the opening, the description. it moves on the curve as you type"
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
                <span
                  className="meta"
                  style={{ color: "var(--faint)", textTransform: "none" }}
                >
                  ⌘↩
                </span>
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
            {current && (
              <section
                className="panel sketched relative p-4"
                style={{ borderRadius: 3 }}
                aria-label="The reading"
              >
                <Sketch
                  seed={`reading-${current.id}`}
                  color="var(--accent)"
                  draw
                />
                <div className="flex items-start justify-between gap-3">
                  <h2
                    className="hand text-[21px] leading-[1.15]"
                    style={{ color: "var(--ink)" }}
                  >
                    {current.title || "untitled"}
                  </h2>
                  {current.id === "live" ? (
                    <span
                      className="meta shrink-0"
                      style={{ color: "var(--faint)" }}
                    >
                      as you type
                    </span>
                  ) : (
                    <button
                      onClick={() => setSel(null)}
                      className="meta shrink-0"
                      style={{ color: "var(--faint)" }}
                    >
                      esc
                    </button>
                  )}
                </div>

                {/* one measure against the other, on the window in view */}
                <div
                  className="meta mt-3"
                  style={{ color: "var(--faint)", textTransform: "none" }}
                >
                  {against}: on {measure}{" "}
                  <span style={{ color: "var(--ink)" }}>
                    {placement ? sig(placement.z) : "—"}
                  </span>
                  {otherPlacement && (
                    <>
                      {" "}
                      · on {other}{" "}
                      <span style={{ color: "var(--ink)" }}>
                        {sig(otherPlacement.z)}
                      </span>
                    </>
                  )}
                </div>
                {placement &&
                  otherPlacement &&
                  Math.abs(otherPlacement.z - placement.z) >= 0.8 && (
                    <p
                      className="hand mt-1 text-[13.5px] leading-[1.3]"
                      style={{ color: "var(--muted)" }}
                    >
                      {gapWords(measure, placement.z, otherPlacement.z)}
                    </p>
                  )}
                <p
                  className="meta mt-1"
                  style={{ color: "var(--faint)", textTransform: "none" }}
                >
                  themes hold {current.reading.anchor.toFixed(2)} of it · a
                  typical stone {current.reading.anchorTypical.toFixed(2)}
                </p>
                {measure === "themes" &&
                  !placement &&
                  current.reading.anchor < (data?.anchorMin ?? 0.09) && (
                    <p
                      className="hand mt-1 text-[14px] leading-[1.3]"
                      style={{ color: "var(--accent)" }}
                    >
                      too little of it lives in the garden's themes to place it
                      on them — its direction would be noise. read it on words.
                    </p>
                  )}

                <dl className="mt-3">
                  {WINDOWS.map((w) => {
                    const p = current.reading.measures[measure][w.key];
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
                            : data?.measures[measure][w.key]
                              ? "not held by the themes — see words."
                              : "too few stones tended in this window to draw a curve."}
                        </dd>
                      </div>
                    );
                  })}
                </dl>

                {placement && placement.kin.length > 0 && (
                  <div className="mt-4 border-t pt-3 rule">
                    <div className="meta" style={{ color: "var(--faint)" }}>
                      its kin, on {measure},{" "}
                      {against.replace("against ", "in ")}
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
                              className={`b-stone-link text-[12.5px] ${ellipsis}`}
                              style={{ color: "var(--muted)" }}
                            >
                              {k.label}
                            </Link>
                            <span
                              className="meta ml-auto shrink-0"
                              style={{
                                color: "var(--faint)",
                                textTransform: "none",
                              }}
                            >
                              {k.sim.toFixed(2)}
                            </span>
                          </div>
                          <div
                            className="hand ml-[14px] text-[12.5px] leading-[1.2]"
                            style={{ color: "var(--faint)" }}
                          >
                            {k.shared.slice(0, 4).join(" · ") ||
                              "no words in common — kin on themes alone"}
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
                  {current.reading.concepts.length ? (
                    <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                      {current.reading.concepts.map((c) => (
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
                    weighed on: {current.reading.terms.join(" · ")}
                  </p>
                  {current.reading.unknown.length > 0 && (
                    <p
                      className="meta mt-1"
                      style={{
                        color: "var(--faint)",
                        textTransform: "none",
                        letterSpacing: "0.04em",
                      }}
                    >
                      the garden has never seen:{" "}
                      {current.reading.unknown.join(" · ")}
                    </p>
                  )}
                </div>

                <div className="mt-4 border-t pt-3 rule">
                  <div className="meta" style={{ color: "var(--faint)" }}>
                    your call — a record, not a verdict
                  </div>
                  {current.id === "live" ? (
                    <p
                      className="hand mt-1.5 text-[13.5px] leading-[1.3]"
                      style={{ color: "var(--faint)" }}
                    >
                      weigh it to pin it, then let it in or pass.
                    </p>
                  ) : (
                    <>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {(["let in", "passed"] as const).map((v) => {
                          const on = current.kept?.verdict === v;
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
                        {current.kept && (
                          <span
                            className="meta"
                            style={{ color: "var(--faint)" }}
                          >
                            kept · {current.kept.weighed}
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
                    </>
                  )}
                </div>
              </section>
            )}

            {/* weighed this sitting */}
            {tray.length > 0 && (
              <section aria-label="Weighed this sitting">
                <div className="flex items-baseline justify-between">
                  <div className="meta" style={{ color: "var(--faint)" }}>
                    weighed now · {tray.length}
                  </div>
                  <button
                    onClick={() => {
                      setTray([]);
                      setSel(null);
                    }}
                    className="meta"
                    style={{ color: "var(--faint)" }}
                  >
                    clear
                  </button>
                </div>
                <ul className="mt-1.5">
                  {tray.map((it) => {
                    const p = it.reading.measures[measure][win];
                    const on = it.id === current?.id;
                    return (
                      <li
                        key={it.id}
                        className="flex items-baseline gap-2 py-1"
                      >
                        <span
                          aria-hidden
                          className="shrink-0"
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 99,
                            background: "var(--accent)",
                            opacity: it.kept ? 1 : 0.5,
                          }}
                        />
                        <button
                          onClick={() => setSel(on ? null : it.id)}
                          className={`b-row hand relative flex-1 text-left text-[15px] leading-[1.25] ${ellipsis}`}
                          style={{ color: on ? "var(--ink)" : "var(--muted)" }}
                        >
                          {it.title}
                        </button>
                        <span
                          className="meta shrink-0"
                          style={{
                            color: "var(--faint)",
                            textTransform: "none",
                          }}
                        >
                          {p ? sig(p.z) : "—"}
                          {it.kept ? ` · ${it.kept.verdict || "kept"}` : ""}
                        </span>
                        <button
                          onClick={() => {
                            setTray((t) => t.filter((x) => x.id !== it.id));
                            if (sel === it.id) setSel(null);
                          }}
                          className="meta shrink-0"
                          style={{ color: "var(--faint)" }}
                          aria-label={`drop ${it.title} from the tray`}
                        >
                          ×
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* what lives in the held band */}
            {band && curve && (
              <section aria-label="In the band">
                <div
                  className="meta"
                  style={{ color: "var(--faint)", textTransform: "none" }}
                >
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
                        className={`b-stone-link text-[12.5px] ${ellipsis}`}
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

            {/* kept before */}
            {data && data.choices.length > 0 && (
              <section aria-label="Kept before">
                <div className="meta" style={{ color: "var(--faint)" }}>
                  kept before · {data.choices.length}
                </div>
                <ul className="mt-1.5">
                  {data.choices.slice(0, 30).map((c) => {
                    const z = choiceZ(c, measure, win);
                    return (
                      <li
                        key={c.slug}
                        className="flex items-baseline gap-2 py-1"
                      >
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
                          className={`b-row hand flex-1 text-left text-[15px] leading-[1.25] ${ellipsis}`}
                          style={{ color: "var(--muted)" }}
                          title="weigh it again"
                        >
                          {c.title}
                        </button>
                        <span
                          className="meta shrink-0"
                          style={{
                            color: "var(--faint)",
                            textTransform: "none",
                          }}
                        >
                          {z !== undefined ? sig(z) : "—"} ·{" "}
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
                    );
                  })}
                </ul>
              </section>
            )}

            <p
              className="hand text-[13.5px] leading-[1.35]"
              style={{ color: "var(--faint)" }}
            >
              how it is measured: a stone's kinship is the mean likeness to its{" "}
              {data?.k ?? 8} nearest stones. on words, likeness is shared words
              and phrases (tf-idf cosine over titles, tags and first lines). on
              themes, it is the {data?.themesK ?? 40} directions the garden's
              own words co-occur along (latent semantic analysis of that same
              likeness) — so two stones with no words in common can still be
              kin. neither is meaning; the kin are listed so you can check.
              {data?.dir ? ` choices are kept at ${shortHome(data.dir)}.` : ""}
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
