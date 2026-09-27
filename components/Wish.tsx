"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_POD_NAME,
  clampMinutes,
  compose,
  heldBy,
  readings,
  runtime,
  spoken,
  tally,
  type Being,
  type Line,
  type Pod,
  type Sitting,
} from "@/lib/wish";
import { rand, ribbon, roughEllipse, seedOf, stroke } from "@/lib/hand";
import { putOnDesk } from "./desk";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

type Payload = {
  pods: Pod[];
  sittings: Sitting[];
  wishes: string[];
  truths: string[];
  facts: string[];
  offers: { facts: string[]; beings: Being[] };
  speech: boolean;
  writable: boolean;
  dir: string | null;
};

type Sel =
  | { kind: "pod"; slug: string }
  | { kind: "being"; slug: string; i: number }
  | null;

type Run = {
  s: Sitting;
  kept: boolean;
  i: number;
  phase: "say" | "pause";
  /** When this phase began, and how long it runs, in ms; null while paused. */
  since: number | null;
  len: number;
  left: number;
  done: boolean;
};

const mono = { fontFamily: "var(--font-mono)" } as const;
const hand = { fontFamily: "var(--font-hand)" } as const;
const chip = "chip w-seg px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";
const hue = (i: number) => `var(--value-${i % 6})`;
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const hhmm = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
};
const mins = (secs: number) => `${Math.round(secs / 60)} min`;

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

/** A number written in the hand that can be clicked and retyped. */
function Num({
  value,
  clamp,
  onCommit,
  writable,
  label,
}: {
  value: number;
  clamp: (n: number) => number;
  onCommit: (n: number) => void;
  writable: boolean;
  label: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? String(value);
  return (
    <input
      value={shown}
      readOnly={!writable}
      inputMode="numeric"
      aria-label={label}
      onFocus={(e) => {
        if (!writable) return;
        setText(String(value));
        e.currentTarget.select();
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text !== null) {
          const v = Number(text);
          if (Number.isFinite(v) && clamp(v) !== value) onCommit(clamp(v));
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
      className="w-num hand"
      style={{
        width: `${Math.max(1.4, shown.length * 0.62 + 0.6)}em`,
        color: "var(--ink)",
      }}
    />
  );
}

/** A line to add to a list: type, return. */
function Add({
  placeholder,
  onAdd,
  writable,
  label,
}: {
  placeholder: string;
  onAdd: (v: string) => void;
  writable: boolean;
  label: string;
}) {
  const [v, setV] = useState("");
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && v.trim()) {
          onAdd(v.trim());
          setV("");
        }
      }}
      readOnly={!writable}
      placeholder={placeholder}
      aria-label={label}
      className="w-add hand w-full bg-transparent text-[15.5px]"
      style={{ color: "var(--ink)" }}
    />
  );
}

/* ── the rings ─────────────────────────────────────────────────────────── */

const RW = 760;
const RH = 520;
const CX = RW / 2;
const CY = RH / 2 + 12;

/**
 * The pods as rings that widen outward, you at the centre, everyone at the
 * edge; each being's name written on its ring. A pod not in the next
 * sitting is drawn faint. Click a name or a ring's name to pick it.
 */
function Rings({
  pods,
  on,
  sel,
  onPick,
}: {
  pods: Pod[];
  on: Set<string>;
  sel: Sel;
  onPick: (s: Sel) => void;
}) {
  const n = pods.length;
  const stepX = n > 1 ? Math.min(54, (330 - 46) / (n - 1)) : 54;
  const stepY = n > 1 ? Math.min(39, (232 - 36) / (n - 1)) : 39;
  const rings = useMemo(
    () =>
      pods.map((p, k) => {
        const rx = 46 + k * stepX;
        const ry = 36 + k * stepY;
        const s = seedOf(`ring-${p.slug}`);
        return {
          rx,
          ry,
          d: ribbon(
            roughEllipse(rx * 2, ry * 2, s, {
              pad: 0,
              grow: 1,
              wobble: 1.2,
              steps: 22,
            }),
            1.5,
            s,
          ),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pods.map((p) => p.slug).join(","), stepX, stepY],
  );
  return (
    <svg
      viewBox={`0 0 ${RW} ${RH}`}
      className="w-rings w-full"
      role="img"
      aria-label="The pods as rings, you at the centre"
    >
      {pods.map((p, k) => {
        const { rx, ry, d } = rings[k];
        const lit = on.has(p.slug);
        const picked = sel?.kind === "pod" && sel.slug === p.slug;
        return (
          <g
            key={p.slug}
            className="w-ring"
            style={{ opacity: lit ? 1 : 0.32 }}
          >
            <path
              d={d}
              fill="var(--pen)"
              transform={`translate(${CX - rx} ${CY - ry})`}
            />
            {p.kind === "self" ? (
              <text
                x={CX}
                y={CY + 6}
                fontSize={19}
                textAnchor="middle"
                style={{ ...hand, cursor: "pointer" }}
                fill={picked ? "var(--accent)" : "var(--ink)"}
                onClick={() => onPick({ kind: "pod", slug: p.slug })}
              >
                {p.name}
              </text>
            ) : (
              <text
                x={CX}
                y={CY - ry - 7}
                fontSize={15}
                textAnchor="middle"
                style={{
                  ...hand,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  cursor: "pointer",
                }}
                fill={picked ? "var(--accent)" : "var(--ink)"}
                onClick={() => onPick({ kind: "pod", slug: p.slug })}
              >
                {p.name}
              </text>
            )}
            {p.beings.map((b, i) => {
              const m = p.beings.length;
              const a = ((22 + ((i + 0.5) * 136) / m) * Math.PI) / 180;
              const x = CX + rx * Math.cos(a);
              const y = CY + ry * Math.sin(a);
              const w = b.name.length * 7.6 + 12;
              const isSel =
                sel?.kind === "being" && sel.slug === p.slug && sel.i === i;
              return (
                <g
                  key={i}
                  style={{ cursor: "pointer" }}
                  onClick={() => onPick({ kind: "being", slug: p.slug, i })}
                >
                  <rect
                    x={x - w / 2}
                    y={y - 11}
                    width={w}
                    height={20}
                    fill="var(--surface)"
                    opacity={0.92}
                    rx={2}
                  />
                  {isSel && (
                    <path
                      d={ribbon(
                        roughEllipse(w + 6, 24, seedOf(`sel-${b.name}`), {
                          pad: 3,
                          grow: 1.1,
                        }),
                        1.4,
                        seedOf(`sel-${b.name}`),
                      )}
                      fill="var(--accent)"
                      transform={`translate(${x - w / 2 - 3} ${y - 13})`}
                    />
                  )}
                  <text
                    x={x}
                    y={y + 5}
                    fontSize={16}
                    textAnchor="middle"
                    style={hand}
                    fill={isSel ? "var(--accent)" : "var(--ink)"}
                  >
                    {b.name}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

/** The breath: one ring drawn on over the silence after a line. */
function Breath({
  seconds,
  id,
  paused,
}: {
  seconds: number;
  id: string;
  paused: boolean;
}) {
  const { line, ink } = useMemo(() => {
    const s = seedOf(id);
    const line = roughEllipse(200, 200, s, { pad: 0, grow: 1, steps: 24 });
    return { line, ink: ribbon(line, 2, s) };
  }, [id]);
  return (
    <svg
      viewBox="-12 -12 224 224"
      width={150}
      height={150}
      aria-hidden
      className="w-breath"
    >
      <defs>
        <mask
          id={`m-${id}`}
          maskUnits="userSpaceOnUse"
          x={-20}
          y={-20}
          width={240}
          height={240}
        >
          <path
            key={id}
            d={line}
            pathLength={1}
            fill="none"
            stroke="#fff"
            strokeWidth={10}
            strokeLinecap="round"
            className="w-draw"
            style={{
              animationDuration: `${Math.max(1, seconds)}s`,
              animationPlayState: paused ? "paused" : "running",
            }}
          />
        </mask>
      </defs>
      <path d={ink} fill="var(--rule)" />
      <path d={ink} fill="var(--accent)" mask={`url(#m-${id})`} />
    </svg>
  );
}

/**
 * The wish: loving-kindness as an instrument. The pods drawn as rings, the
 * beings named on them; a sitting composed from the reader's wishes, the
 * truths that hold for every being, and the facts they keep about
 * themselves; said a line at a time with the silences that make it a
 * practice, or written out as one voice by the speech server on this
 * machine. The desk counts; it never says whether the reader is kind.
 */
export default function Wish() {
  const [theme, setTheme] = useTheme();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [sel, setSel] = useState<Sel>(null);
  const [minutes, setMinutes] = useState(10);
  const [on, setOn] = useState<Set<string>>(new Set());
  const [truthsOff, setTruthsOff] = useState<Set<string>>(new Set());
  const [factsOff, setFactsOff] = useState<Set<string>>(new Set());
  const [run, setRun] = useState<Run | null>(null);
  const [said, setSaid] = useState("");
  const [voicing, setVoicing] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [newPod, setNewPod] = useState("");
  const [trouble, setTrouble] = useState<string | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const runRef = useRef<Run | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const players = useRef(new Map<string, HTMLAudioElement>());
  runRef.current = run;
  const today = useMemo(localToday, []);
  const writable = payload?.writable ?? false;

  useEffect(() => {
    fetch("/api/wish")
      .then((r) => (r.ok ? r.json() : null))
      .then((pl: Payload | null) => {
        if (!pl) {
          setTrouble("the practice could not be read");
          return;
        }
        setPayload(pl);
        setOn(new Set(pl.pods.map((p) => p.slug)));
      })
      .catch(() => setTrouble("the practice could not be read"));
  }, []);

  useEffect(() => {
    putOnDesk(
      run
        ? { kind: "wish", id: run.s.slug, label: `a sitting · ${run.s.on}` }
        : null,
    );
  }, [run?.s.slug, run?.s.on, run]);
  useEffect(
    () => () => {
      putOnDesk(null);
      audio.current?.pause();
      for (const a of players.current.values()) a.pause();
    },
    [],
  );

  /* ── keeping ─────────────────────────────────────────────────────────── */

  const put = useCallback(
    async (body: Record<string, unknown>) => {
      if (!writable) return null;
      try {
        const r = await fetch("/api/wish", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const out = (await r.json().catch(() => null)) as Record<
          string,
          unknown
        > | null;
        if (!r.ok || !out || "error" in out) {
          setTrouble(
            typeof out?.error === "string"
              ? out.error
              : `not kept (${r.status})`,
          );
          return null;
        }
        setTrouble(null);
        return out;
      } catch {
        setTrouble("not kept — the garden did not answer");
        return null;
      }
    },
    [writable],
  );

  const setPods = (pods: Pod[]) => setPayload((p) => (p ? { ...p, pods } : p));
  const keepPod = (pod: Pod) => {
    setPods((payload?.pods ?? []).map((p) => (p.slug === pod.slug ? pod : p)));
    void put({ pod });
  };
  const addPod = () => {
    const name = newPod.trim();
    if (!name || !payload) return;
    const slug = `${
      name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "pod"
    }-${hhmm()}`;
    const everyone = payload.pods.find((p) => p.kind === "all");
    const others = payload.pods.filter((p) => p.kind !== "all");
    const order = Math.max(0, ...others.map((p) => p.order)) + 1;
    const pod: Pod = { slug, name, kind: "custom", order, beings: [] };
    const pods = [
      ...others,
      pod,
      ...(everyone ? [{ ...everyone, order: order + 1 }] : []),
    ];
    setPods(pods);
    setOn((s) => new Set([...s, slug]));
    setNewPod("");
    setSel({ kind: "pod", slug });
    void put({ pods });
  };
  const removePod = async (slug: string) => {
    setPods((payload?.pods ?? []).filter((p) => p.slug !== slug));
    setSel(null);
    setSure(null);
    if (!writable) return;
    await fetch(`/api/wish?pod=${encodeURIComponent(slug)}`, {
      method: "DELETE",
    });
  };
  const addBeing = (slug: string, being: Being) => {
    const pod = payload?.pods.find((p) => p.slug === slug);
    if (!pod || !being.name.trim()) return;
    if (
      pod.beings.some(
        (b) => b.name.toLowerCase() === being.name.trim().toLowerCase(),
      )
    )
      return;
    keepPod({
      ...pod,
      beings: [...pod.beings, { ...being, name: being.name.trim() }],
    });
    setSel({ kind: "being", slug, i: pod.beings.length });
  };
  const patchBeing = (
    slug: string,
    i: number,
    patch: Partial<Being>,
    keep = false,
  ) => {
    const pod = payload?.pods.find((p) => p.slug === slug);
    if (!pod) return;
    const next = {
      ...pod,
      beings: pod.beings.map((b, k) => (k === i ? { ...b, ...patch } : b)),
    };
    if (keep) keepPod(next);
    else
      setPods((payload?.pods ?? []).map((p) => (p.slug === slug ? next : p)));
  };
  const moveBeing = (from: string, i: number, to: string) => {
    const a = payload?.pods.find((p) => p.slug === from);
    const b = payload?.pods.find((p) => p.slug === to);
    if (!a || !b || from === to) return;
    const being = a.beings[i];
    if (!being) return;
    const pa = { ...a, beings: a.beings.filter((_, k) => k !== i) };
    const pb = { ...b, beings: [...b.beings, being] };
    setPods(
      (payload?.pods ?? []).map((p) =>
        p.slug === from ? pa : p.slug === to ? pb : p,
      ),
    );
    setSel({ kind: "being", slug: to, i: b.beings.length });
    void put({ pods: [pa, pb] });
  };
  const removeBeing = (slug: string, i: number) => {
    const pod = payload?.pods.find((p) => p.slug === slug);
    if (!pod) return;
    keepPod({ ...pod, beings: pod.beings.filter((_, k) => k !== i) });
    setSel({ kind: "pod", slug });
  };
  const keepList = (list: "wishes" | "truths" | "facts", items: string[]) => {
    setPayload((p) => (p ? { ...p, [list]: items } : p));
    void put({ list, items });
  };

  /* ── the sitting ─────────────────────────────────────────────────────── */

  const stopAudio = () => {
    audio.current?.pause();
    audio.current = null;
  };

  const start = (s: Sitting, kept: boolean) => {
    stopAudio();
    setSaid("");
    if (s.voice) {
      const a = new Audio(`/api/wish/audio/${encodeURIComponent(s.voice)}`);
      audio.current = a;
      a.addEventListener("timeupdate", () => {
        const r = runRef.current;
        if (!r || r.s.slug !== s.slug || !s.cues.length) return;
        const t = a.currentTime;
        let i = 0;
        for (let k = 0; k < s.cues.length; k++) if (s.cues[k] <= t) i = k;
        const line = s.lines[i];
        const phase: Run["phase"] =
          t - s.cues[i] < spoken(line?.text ?? "") ? "say" : "pause";
        if (i !== r.i || phase !== r.phase)
          setRun({
            ...r,
            i,
            phase,
            since: performance.now(),
            len: line ? line.pause * 1000 : 0,
            left: 0,
          });
      });
      a.addEventListener("ended", () =>
        setRun((r) => (r ? { ...r, done: true, since: null } : r)),
      );
      void a.play().catch(() => setTrouble("the voice could not be played"));
    }
    const first = s.lines[0];
    setRun({
      s,
      kept,
      i: 0,
      phase: "say",
      since: performance.now(),
      len: spoken(first?.text ?? "") * 1000,
      left: 0,
      done: false,
    });
  };

  const begin = async (withVoice: boolean) => {
    if (!payload) return;
    const pods = payload.pods.filter((p) => on.has(p.slug));
    if (!pods.length) {
      setTrouble("hold at least one pod");
      return;
    }
    const day = localToday();
    const slug = `${day}-${hhmm()}`;
    const truths = payload.truths.filter((t) => !truthsOff.has(t));
    const facts = payload.facts.filter((f) => !factsOff.has(f));
    const s: Sitting = {
      slug,
      on: day,
      minutes,
      pods: pods.map((p) => p.slug),
      held: heldBy(pods),
      wishes: payload.wishes,
      truths,
      facts,
      lines: compose({
        pods,
        wishes: payload.wishes,
        truths,
        facts,
        minutes,
        seed: slug,
      }),
      cues: [],
      voice: null,
      said: "",
    };
    if (!writable) {
      start(s, false);
      return;
    }
    const out = await put({ sitting: s, fresh: true });
    const kept = (out?.sitting as Sitting | undefined) ?? null;
    if (!kept) return;
    setPayload((p) => (p ? { ...p, sittings: [kept, ...p.sittings] } : p));
    if (withVoice) {
      const voiced = await voice(kept.slug);
      start(voiced ?? kept, true);
    } else start(kept, true);
  };

  const voice = async (slug: string): Promise<Sitting | null> => {
    setVoicing(slug);
    try {
      const r = await fetch("/api/wish/say", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const out = (await r.json().catch(() => null)) as {
        sitting?: Sitting;
        error?: string;
      } | null;
      if (!r.ok || !out?.sitting) {
        setTrouble(out?.error ?? `not written out (${r.status})`);
        return null;
      }
      const s = out.sitting;
      setPayload((p) =>
        p
          ? {
              ...p,
              sittings: p.sittings.map((x) => (x.slug === s.slug ? s : x)),
            }
          : p,
      );
      return s;
    } catch {
      setTrouble("not written out — the garden did not answer");
      return null;
    } finally {
      setVoicing(null);
    }
  };

  const listen = (s: Sitting) => {
    if (!s.voice) return;
    let a = players.current.get(s.slug);
    if (!a) {
      a = new Audio(`/api/wish/audio/${encodeURIComponent(s.voice)}`);
      a.addEventListener("ended", () =>
        setPlaying((p) => (p === s.slug ? null : p)),
      );
      players.current.set(s.slug, a);
    }
    if (playing === s.slug) {
      a.pause();
      setPlaying(null);
    } else {
      for (const [k, o] of players.current) if (k !== s.slug) o.pause();
      void a.play();
      setPlaying(s.slug);
    }
  };

  // The silent sitting keeps its own time: say the line for as long as it takes to read, then hold the silence.
  useEffect(() => {
    if (!run || run.done || run.since === null || run.s.voice) return;
    const t = window.setTimeout(() => {
      setRun((r) => {
        if (!r || r.done) return r;
        if (r.phase === "say")
          return {
            ...r,
            phase: "pause",
            since: performance.now(),
            len: r.s.lines[r.i].pause * 1000,
            left: 0,
          };
        const i = r.i + 1;
        if (i >= r.s.lines.length) return { ...r, done: true, since: null };
        return {
          ...r,
          i,
          phase: "say",
          since: performance.now(),
          len: spoken(r.s.lines[i].text) * 1000,
          left: 0,
        };
      });
    }, run.len);
    return () => window.clearTimeout(t);
  }, [run]);

  const pauseOrGo = () => {
    setRun((r) => {
      if (!r || r.done) return r;
      if (r.since !== null) {
        audio.current?.pause();
        return {
          ...r,
          left: Math.max(0, r.len - (performance.now() - r.since)),
          since: null,
        };
      }
      void audio.current?.play();
      return { ...r, since: performance.now(), len: r.left };
    });
  };
  const next = () => {
    setRun((r) => {
      if (!r || r.done) return r;
      const i = r.i + 1;
      if (i >= r.s.lines.length) {
        stopAudio();
        return { ...r, done: true, since: null };
      }
      if (audio.current && r.s.cues[i] !== undefined)
        audio.current.currentTime = r.s.cues[i];
      return {
        ...r,
        i,
        phase: "say",
        since: performance.now(),
        len: spoken(r.s.lines[i].text) * 1000,
        left: 0,
      };
    });
  };
  const end = () => {
    stopAudio();
    setRun((r) => (r ? { ...r, done: true, since: null } : r));
  };
  const close = async (keepSaid: boolean) => {
    const r = runRef.current;
    stopAudio();
    if (r && r.kept && keepSaid && said.trim() && writable) {
      const s = { ...r.s, said: said.trim() };
      const out = await put({ sitting: s, fresh: false });
      if (out?.sitting)
        setPayload((p) =>
          p
            ? {
                ...p,
                sittings: p.sittings.map((x) =>
                  x.slug === s.slug ? (out.sitting as Sitting) : x,
                ),
              }
            : p,
        );
    }
    setRun(null);
    setSaid("");
  };
  const removeSitting = async (slug: string) => {
    setPayload((p) =>
      p ? { ...p, sittings: p.sittings.filter((s) => s.slug !== slug) } : p,
    );
    setSure(null);
    players.current.get(slug)?.pause();
    players.current.delete(slug);
    if (writable)
      await fetch(`/api/wish?sitting=${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
  };

  useEffect(() => {
    if (!run) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) return;
      if (e.key === " ") {
        e.preventDefault();
        pauseOrGo();
      } else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") end();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(run)]);

  /* ── derived ─────────────────────────────────────────────────────────── */

  const pods = payload?.pods ?? [];
  const held = pods.filter((p) => on.has(p.slug));
  const preview = useMemo(
    () =>
      payload
        ? compose({
            pods: held,
            wishes: payload.wishes,
            truths: payload.truths.filter((t) => !truthsOff.has(t)),
            facts: payload.facts.filter((f) => !factsOff.has(f)),
            minutes,
            seed: "preview",
          })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [payload, held.map((p) => p.slug).join(","), truthsOff, factsOff, minutes],
  );
  const t = useMemo(
    () =>
      payload
        ? tally(
            payload.sittings,
            payload.pods,
            {
              wishes: payload.wishes,
              truths: payload.truths,
              facts: payload.facts,
            },
            today,
          )
        : null,
    [payload, today],
  );
  const words = useMemo(() => (t ? readings(t) : []), [t]);
  const selPod = sel ? (pods.find((p) => p.slug === sel.slug) ?? null) : null;
  const selBeing =
    sel?.kind === "being" && selPod ? (selPod.beings[sel.i] ?? null) : null;
  const line: Line | null = run ? (run.s.lines[run.i] ?? null) : null;

  return (
    <main className="wish scroll-thin relative h-dvh w-full overflow-y-auto">
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
                wish
              </div>
              <p
                className="hand mt-1 max-w-[27rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                May you be safe, well, at ease, happy. Said to yourself, then
                outward, ring by ring, to everyone. Your people, truths that
                hold for every being, and what is true of you.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/wish" />
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
            aria-label="The wish"
          >
            <Sketch
              seed={run ? `sitting-${run.s.slug}` : "wish-sheet"}
              draw
              color={run ? "var(--accent)" : undefined}
            />
            {!payload ? (
              <p className="meta" style={{ color: "var(--faint)" }}>
                {trouble ?? "reading…"}
              </p>
            ) : run ? (
              /* ── a sitting ───────────────────────────────────────────── */
              <div className="flex min-h-[32rem] flex-col items-center justify-between gap-6 py-4 text-center">
                <div className="meta" style={{ color: "var(--accent)" }}>
                  a sitting · {run.s.minutes} minutes ·{" "}
                  {run.done ? "done" : `${run.i + 1} of ${run.s.lines.length}`}
                  {run.s.voice ? " · in a voice" : " · in silence"}
                  {!run.kept ? " · not kept" : ""}
                </div>
                {!run.done && line ? (
                  <>
                    <p
                      key={run.i}
                      className="display w-line max-w-[34ch] text-[28px] leading-[1.25] sm:text-[36px]"
                      style={{
                        color:
                          line.kind === "pod" || line.kind === "close"
                            ? "var(--muted)"
                            : "var(--ink)",
                      }}
                    >
                      {line.text}
                    </p>
                    <div className="flex flex-col items-center gap-2">
                      {run.phase === "pause" ? (
                        <Breath
                          seconds={line.pause}
                          id={`b${run.i}`}
                          paused={run.since === null}
                        />
                      ) : (
                        <div className="flex h-[150px] items-center">
                          <span
                            className="hand text-[17px]"
                            style={{ color: "var(--faint)" }}
                          >
                            {run.s.voice ? "…" : "read it, slowly"}
                          </span>
                        </div>
                      )}
                      <span
                        className="meta"
                        style={{ color: "var(--faint)", textTransform: "none" }}
                      >
                        {run.phase === "pause"
                          ? `${line.pause}s of silence`
                          : " "}
                      </span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      <Chip onClick={pauseOrGo} on={run.since === null}>
                        {run.since === null ? "go on" : "hold"}
                      </Chip>
                      <Chip onClick={next}>next line</Chip>
                      <Chip onClick={end} accent>
                        end the sitting
                      </Chip>
                    </div>
                    <p
                      className="hand text-[14px]"
                      style={{ color: "var(--faint)" }}
                    >
                      space holds · → next · esc ends
                    </p>
                  </>
                ) : (
                  <>
                    <p
                      className="display max-w-[30ch] text-[30px] leading-[1.25]"
                      style={{ color: "var(--ink)" }}
                    >
                      That is the sitting.
                    </p>
                    <div className="w-full max-w-[36rem]">
                      <div className="meta" style={{ color: "var(--faint)" }}>
                        how was it — in your words, or none
                      </div>
                      <textarea
                        value={said}
                        onChange={(e) => setSaid(e.target.value)}
                        rows={2}
                        readOnly={!writable || !run.kept}
                        placeholder={
                          run.kept
                            ? "what came up, who was hard to hold, what you noticed"
                            : "a sitting that is not kept has nowhere to keep this"
                        }
                        aria-label="What you said afterwards"
                        className="w-case scroll-thin mt-2 w-full resize-none bg-transparent px-0 py-1 text-[16px] leading-[1.5]"
                        style={{ color: "var(--ink)" }}
                      />
                    </div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      <Chip onClick={() => void close(true)} accent>
                        {run.kept && said.trim()
                          ? "keep it and come back"
                          : "come back"}
                      </Chip>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* ── the rings, the pods, the sittings ──────────────────── */
              <>
                <div className="grid gap-x-8 gap-y-5 xl:grid-cols-[minmax(15rem,19rem)_minmax(0,1fr)]">
                  <div className="order-2 min-w-0 xl:order-1">
                    <div className="meta" style={{ color: "var(--accent)" }}>
                      the next sitting
                    </div>
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
                      <Num
                        value={minutes}
                        clamp={clampMinutes}
                        onCommit={setMinutes}
                        writable
                        label="Minutes"
                      />
                      <span
                        className="hand text-[18px]"
                        style={{ color: "var(--muted)" }}
                      >
                        minutes · {preview.length} lines
                        {Math.abs(runtime(preview) - minutes * 60) > 90
                          ? ` · about ${mins(runtime(preview))}`
                          : ""}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {pods.map((p) => (
                        <Chip
                          key={p.slug}
                          on={on.has(p.slug)}
                          onClick={() =>
                            setOn((s) => {
                              const n = new Set(s);
                              if (n.has(p.slug)) n.delete(p.slug);
                              else n.add(p.slug);
                              return n;
                            })
                          }
                          title={
                            on.has(p.slug)
                              ? "held in the next sitting"
                              : "left out of the next sitting"
                          }
                        >
                          {p.kind === "custom"
                            ? p.name
                            : DEFAULT_POD_NAME[p.kind].split(" ")[0] ===
                                "someone"
                              ? p.name.replace(/^someone /, "")
                              : p.name}
                        </Chip>
                      ))}
                    </div>
                    <p
                      className="hand mt-2 text-[15px] leading-[1.3]"
                      style={{ color: "var(--faint)" }}
                    >
                      {payload.wishes.length} wishes ·{" "}
                      {payload.truths.length - truthsOff.size} of{" "}
                      {payload.truths.length} truths ·{" "}
                      {payload.facts.length - factsOff.size} of{" "}
                      {payload.facts.length} facts — on the desk
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Chip
                        onClick={() => void begin(false)}
                        accent
                        disabled={!held.length}
                      >
                        begin, in silence
                      </Chip>
                      {payload.speech && writable && (
                        <Chip
                          onClick={() => void begin(true)}
                          disabled={!held.length || voicing !== null}
                        >
                          {voicing
                            ? "writing it out…"
                            : "write it out, then begin"}
                        </Chip>
                      )}
                    </div>
                    {!writable && (
                      <p
                        className="meta mt-2"
                        style={{ color: "var(--faint)", textTransform: "none" }}
                      >
                        a deployed garden keeps no sittings; this one runs and
                        is let go
                      </p>
                    )}

                    {/* the pod or being picked */}
                    {selPod && (
                      <div
                        className="mt-6"
                        style={{
                          borderTop: "1px solid var(--rule)",
                          paddingTop: 12,
                        }}
                      >
                        <div
                          className="meta"
                          style={{ color: "var(--accent)" }}
                        >
                          {selBeing ? "a being" : "a pod"}
                        </div>
                        {selBeing && sel?.kind === "being" ? (
                          <>
                            <input
                              value={selBeing.name}
                              onChange={(e) =>
                                patchBeing(sel.slug, sel.i, {
                                  name: e.target.value,
                                })
                              }
                              onBlur={() =>
                                patchBeing(sel.slug, sel.i, {}, true)
                              }
                              readOnly={!writable}
                              aria-label="The being's name"
                              className="w-case hand mt-1 w-full bg-transparent text-[22px]"
                              style={{ color: "var(--ink)" }}
                            />
                            <input
                              value={selBeing.note}
                              onChange={(e) =>
                                patchBeing(sel.slug, sel.i, {
                                  note: e.target.value,
                                })
                              }
                              onBlur={() =>
                                patchBeing(sel.slug, sel.i, {}, true)
                              }
                              readOnly={!writable}
                              placeholder="a note, said after the name — who calls on Sundays"
                              aria-label="A note on the being"
                              className="w-case hand mt-1 w-full bg-transparent text-[16px]"
                              style={{ color: "var(--muted)" }}
                            />
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span
                                className="meta"
                                style={{
                                  color: "var(--faint)",
                                  textTransform: "none",
                                }}
                              >
                                in {selPod.name} · move to
                              </span>
                              {pods
                                .filter(
                                  (p) =>
                                    p.kind !== "self" &&
                                    p.kind !== "all" &&
                                    p.slug !== selPod.slug,
                                )
                                .map((p) => (
                                  <Chip
                                    key={p.slug}
                                    onClick={() =>
                                      moveBeing(sel.slug, sel.i, p.slug)
                                    }
                                    disabled={!writable}
                                  >
                                    {p.kind === "custom"
                                      ? p.name
                                      : p.name.replace(/^someone /, "")}
                                  </Chip>
                                ))}
                              <Chip
                                onClick={() => removeBeing(sel.slug, sel.i)}
                                disabled={!writable}
                                accent
                              >
                                let go
                              </Chip>
                            </div>
                          </>
                        ) : (
                          <>
                            {selPod.kind === "custom" ? (
                              <input
                                value={selPod.name}
                                onChange={(e) =>
                                  setPods(
                                    pods.map((p) =>
                                      p.slug === selPod.slug
                                        ? { ...p, name: e.target.value }
                                        : p,
                                    ),
                                  )
                                }
                                onBlur={() =>
                                  keepPod(
                                    pods.find((p) => p.slug === selPod.slug)!,
                                  )
                                }
                                readOnly={!writable}
                                aria-label="The pod's name"
                                className="w-case hand mt-1 w-full bg-transparent text-[22px]"
                                style={{ color: "var(--ink)" }}
                              />
                            ) : (
                              <p
                                className="hand mt-1 text-[22px]"
                                style={{ color: "var(--ink)" }}
                              >
                                {selPod.name}
                              </p>
                            )}
                            {selPod.kind === "self" || selPod.kind === "all" ? (
                              <p
                                className="hand mt-1 text-[15px]"
                                style={{ color: "var(--faint)" }}
                              >
                                {selPod.kind === "self"
                                  ? "this ring holds you; nothing else goes on it"
                                  : "this ring holds everyone, named or not"}
                              </p>
                            ) : (
                              <div className="mt-2">
                                <Add
                                  placeholder="a name to hold here, then return"
                                  onAdd={(v) =>
                                    addBeing(selPod.slug, {
                                      name: v,
                                      note: "",
                                      stone: null,
                                    })
                                  }
                                  writable={writable}
                                  label={`A being for ${selPod.name}`}
                                />
                                {selPod.beings.length === 0 && (
                                  <p
                                    className="hand mt-1 text-[15px]"
                                    style={{ color: "var(--faint)" }}
                                  >
                                    empty rings hold whoever comes to mind
                                  </p>
                                )}
                              </div>
                            )}
                            {selPod.kind === "custom" && writable && (
                              <div className="mt-2">
                                <Chip
                                  onClick={() =>
                                    sure === `pod-${selPod.slug}`
                                      ? void removePod(selPod.slug)
                                      : setSure(`pod-${selPod.slug}`)
                                  }
                                  accent={sure === `pod-${selPod.slug}`}
                                >
                                  {sure === `pod-${selPod.slug}`
                                    ? "take the ring off — sure?"
                                    : "take the ring off"}
                                </Chip>
                              </div>
                            )}
                          </>
                        )}
                        {payload.offers.beings.length > 0 &&
                          selPod.kind !== "self" &&
                          selPod.kind !== "all" && (
                            <div className="mt-3">
                              <div
                                className="meta"
                                style={{ color: "var(--faint)" }}
                              >
                                people in your notes
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {payload.offers.beings
                                  .filter(
                                    (b) =>
                                      !pods.some((p) =>
                                        p.beings.some((x) => x.name === b.name),
                                      ),
                                  )
                                  .slice(0, 12)
                                  .map((b) => (
                                    <Chip
                                      key={b.name}
                                      onClick={() => addBeing(selPod.slug, b)}
                                      disabled={!writable}
                                      title={b.note || undefined}
                                    >
                                      + {b.name}
                                    </Chip>
                                  ))}
                              </div>
                            </div>
                          )}
                      </div>
                    )}
                    {!selPod && (
                      <p
                        className="hand mt-6 text-[15px] leading-[1.35]"
                        style={{
                          color: "var(--faint)",
                          borderTop: "1px solid var(--rule)",
                          paddingTop: 12,
                        }}
                      >
                        click a ring&apos;s name to hold someone on it, or a
                        name to move or let it go
                      </p>
                    )}
                    <div className="mt-4 flex items-baseline gap-2">
                      <input
                        value={newPod}
                        onChange={(e) => setNewPod(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addPod();
                        }}
                        readOnly={!writable}
                        placeholder="a ring of your own — the people at the Küfa"
                        aria-label="A new pod"
                        className="w-add hand min-w-0 flex-1 bg-transparent text-[15.5px]"
                        style={{ color: "var(--ink)" }}
                      />
                      <Chip
                        onClick={addPod}
                        disabled={!writable || !newPod.trim()}
                      >
                        + ring
                      </Chip>
                    </div>
                  </div>

                  <div className="order-1 min-w-0 xl:order-2">
                    <Rings
                      pods={pods}
                      on={on}
                      sel={sel}
                      onPick={(s) =>
                        setSel((cur) =>
                          JSON.stringify(cur) === JSON.stringify(s) ? null : s,
                        )
                      }
                    />
                  </div>
                </div>

                {/* the sittings */}
                <div
                  className="mt-6"
                  style={{ borderTop: "1px solid var(--rule)", paddingTop: 12 }}
                >
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    sittings
                  </div>
                  {payload.sittings.length === 0 ? (
                    <p
                      className="hand mt-1 text-[15.5px]"
                      style={{ color: "var(--faint)" }}
                    >
                      none yet
                    </p>
                  ) : (
                    <ol className="mt-1 flex flex-col">
                      {payload.sittings.slice(0, 12).map((s, i) => (
                        <li
                          key={s.slug}
                          className="w-row flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2"
                          style={{
                            borderTop: i ? "1px solid var(--rule)" : undefined,
                            ["--i" as string]: i,
                          }}
                        >
                          <span
                            className="meta shrink-0"
                            style={{
                              color: "var(--ink)",
                              textTransform: "none",
                            }}
                          >
                            {s.on}
                          </span>
                          <span
                            className="meta shrink-0"
                            style={{
                              color: "var(--faint)",
                              textTransform: "none",
                            }}
                          >
                            {s.minutes} min · {s.pods.length} rings ·{" "}
                            {s.held.length} held
                          </span>
                          {s.said && (
                            <span
                              className="hand min-w-0 flex-1 text-[15.5px]"
                              style={{ color: "var(--muted)" }}
                            >
                              {s.said}
                            </span>
                          )}
                          <span className="ml-auto flex flex-wrap gap-1.5">
                            {s.voice && (
                              <Chip
                                onClick={() => listen(s)}
                                on={playing === s.slug}
                              >
                                {playing === s.slug ? "stop" : "listen"}
                              </Chip>
                            )}
                            {!s.voice && payload.speech && writable && (
                              <Chip
                                onClick={() => void voice(s.slug)}
                                disabled={voicing !== null}
                              >
                                {voicing === s.slug
                                  ? "writing it out…"
                                  : "write it out"}
                              </Chip>
                            )}
                            <Chip onClick={() => start(s, true)}>
                              sit it again
                            </Chip>
                            {writable && (
                              <Chip
                                onClick={() =>
                                  sure === `sit-${s.slug}`
                                    ? void removeSitting(s.slug)
                                    : setSure(`sit-${s.slug}`)
                                }
                                accent={sure === `sit-${s.slug}`}
                              >
                                {sure === `sit-${s.slug}` ? "sure?" : "×"}
                              </Chip>
                            )}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
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
              <Sketch seed="wish-reading" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                the reading
              </div>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                {words.length ? words.join(" · ") : "reading…"}
              </p>
            </section>

            {payload && (
              <>
                <section
                  className="panel sketched rise relative p-4"
                  style={{ borderRadius: 3, animationDelay: "140ms" }}
                  aria-label="The wishes"
                >
                  <Sketch seed="wish-wishes" draw />
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    the wishes
                  </div>
                  <p
                    className="hand mt-1 text-[14px]"
                    style={{ color: "var(--faint)" }}
                  >
                    each said after &ldquo;may you be&rdquo;
                  </p>
                  <ul className="mt-1.5 flex flex-col">
                    {payload.wishes.map((w, i) => (
                      <li key={i} className="flex items-baseline gap-2">
                        <span
                          className="hand flex-1 text-[17px]"
                          style={{ color: "var(--ink)" }}
                        >
                          may you be {w}
                        </span>
                        {writable && payload.wishes.length > 1 && (
                          <button
                            onClick={() =>
                              keepList(
                                "wishes",
                                payload.wishes.filter((_, k) => k !== i),
                              )
                            }
                            className="w-link text-[11px]"
                            style={{ ...mono, color: "var(--faint)" }}
                            aria-label={`Let go of ${w}`}
                          >
                            ×
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-1.5">
                    <Add
                      placeholder="+ free from fear"
                      onAdd={(v) => keepList("wishes", [...payload.wishes, v])}
                      writable={writable}
                      label="A wish"
                    />
                  </div>
                </section>

                <section
                  className="panel sketched rise relative p-4"
                  style={{ borderRadius: 3, animationDelay: "180ms" }}
                  aria-label="The truths"
                >
                  <Sketch seed="wish-truths" draw />
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    truths of every being
                  </div>
                  <p
                    className="hand mt-1 text-[14px]"
                    style={{ color: "var(--faint)" }}
                  >
                    said of each one held · click to leave one out of the next
                    sitting
                  </p>
                  <ul className="mt-1.5 flex flex-col gap-0.5">
                    {payload.truths.map((tr, i) => (
                      <li key={i} className="flex items-baseline gap-2">
                        <button
                          onClick={() =>
                            setTruthsOff((s) => {
                              const n = new Set(s);
                              if (n.has(tr)) n.delete(tr);
                              else n.add(tr);
                              return n;
                            })
                          }
                          className="w-item flex-1 text-left text-[13px] leading-[1.45]"
                          style={{
                            color: truthsOff.has(tr)
                              ? "var(--faint)"
                              : "var(--ink)",
                            textDecoration: truthsOff.has(tr)
                              ? "line-through"
                              : "none",
                          }}
                        >
                          {tr}
                        </button>
                        {writable && (
                          <button
                            onClick={() =>
                              keepList(
                                "truths",
                                payload.truths.filter((_, k) => k !== i),
                              )
                            }
                            className="w-link text-[11px]"
                            style={{ ...mono, color: "var(--faint)" }}
                            aria-label="Let go of this truth"
                          >
                            ×
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-1.5">
                    <Add
                      placeholder="+ every being …"
                      onAdd={(v) => keepList("truths", [...payload.truths, v])}
                      writable={writable}
                      label="A truth"
                    />
                  </div>
                </section>

                <section
                  className="panel sketched rise relative p-4"
                  style={{ borderRadius: 3, animationDelay: "220ms" }}
                  aria-label="What is true of you"
                >
                  <Sketch seed="wish-facts" draw />
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    true of you
                  </div>
                  <p
                    className="hand mt-1 text-[14px]"
                    style={{ color: "var(--faint)" }}
                  >
                    one to begin from, one to carry out · in your own words
                  </p>
                  {payload.facts.length === 0 && (
                    <p
                      className="hand mt-1 text-[15px]"
                      style={{ color: "var(--muted)" }}
                    >
                      nothing kept yet
                    </p>
                  )}
                  <ul className="mt-1.5 flex flex-col gap-0.5">
                    {payload.facts.map((f, i) => (
                      <li key={i} className="flex items-baseline gap-2">
                        <button
                          onClick={() =>
                            setFactsOff((s) => {
                              const n = new Set(s);
                              if (n.has(f)) n.delete(f);
                              else n.add(f);
                              return n;
                            })
                          }
                          className="w-item flex-1 text-left text-[13px] leading-[1.45]"
                          style={{
                            color: factsOff.has(f)
                              ? "var(--faint)"
                              : "var(--ink)",
                            textDecoration: factsOff.has(f)
                              ? "line-through"
                              : "none",
                          }}
                        >
                          {f}
                        </button>
                        {writable && (
                          <button
                            onClick={() =>
                              keepList(
                                "facts",
                                payload.facts.filter((_, k) => k !== i),
                              )
                            }
                            className="w-link text-[11px]"
                            style={{ ...mono, color: "var(--faint)" }}
                            aria-label="Let go of this fact"
                          >
                            ×
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-1.5">
                    <Add
                      placeholder="+ something true of you"
                      onAdd={(v) => keepList("facts", [...payload.facts, v])}
                      writable={writable}
                      label="A fact"
                    />
                  </div>
                  {payload.offers.facts.length > 0 && (
                    <>
                      <div
                        className="meta mt-3"
                        style={{ color: "var(--faint)" }}
                      >
                        the garden offers, in the record&apos;s words
                      </div>
                      <ul className="mt-1 flex flex-col gap-1">
                        {payload.offers.facts.slice(0, 8).map((f) => (
                          <li key={f} className="flex items-baseline gap-2">
                            <span
                              className="flex-1 text-[12.5px] leading-[1.45]"
                              style={{ color: "var(--muted)" }}
                            >
                              {f}
                            </span>
                            <Chip
                              onClick={() => {
                                keepList("facts", [...payload.facts, f]);
                                setPayload((p) =>
                                  p
                                    ? {
                                        ...p,
                                        offers: {
                                          ...p.offers,
                                          facts: p.offers.facts.filter(
                                            (x) => x !== f,
                                          ),
                                        },
                                      }
                                    : p,
                                );
                              }}
                              disabled={!writable}
                            >
                              keep
                            </Chip>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </section>

                <section
                  className="panel sketched rise relative p-4"
                  style={{ borderRadius: 3, animationDelay: "260ms" }}
                  aria-label="What the wish holds to"
                >
                  <Sketch seed="wish-laws" draw />
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    what the wish holds to
                  </div>
                  <p
                    className="mt-2 text-[13.5px] leading-[1.6]"
                    style={{ color: "var(--ink)" }}
                  >
                    Nothing has to be felt; the wishes are said, and what they
                    do is theirs. The difficult ring is held only as far as you
                    can hold it today, and left out when you cannot. The truths
                    are true of every being, so saying one of someone is not a
                    claim about them. The desk counts sittings and who was held;
                    it never says whether you are kind.
                  </p>
                  <p
                    className="meta mt-3"
                    style={{ color: "var(--faint)", textTransform: "none" }}
                  >
                    {payload.dir
                      ? `kept in ${payload.dir.replace(/^\/Users\/[^/]+/, "~")} · ${payload.speech ? "the speech server is up" : "no speech server answering; sittings run in silence"}`
                      : "fiction, like the rest of the specimen"}
                  </p>
                </section>
              </>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
