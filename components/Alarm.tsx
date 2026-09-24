"use client";

import { putOnDesk } from "./desk";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Garden, GardenNode } from "@/lib/garden";
import {
  EMPTY_CIRCUIT,
  REACHES,
  REFLEXES,
  STATE_LABEL,
  STATE_WORDS,
  VIGILANT,
  WENTS,
  apply,
  bendsOf,
  ceilingOf,
  cue,
  emptyPathway,
  gaugesOf,
  idOf,
  knobsOf,
  leanOf,
  readings,
  rest,
  stateOf,
  step,
  tally,
  type Body,
  type Brake,
  type Charge,
  type Circuit,
  type Defence,
  type Dose,
  type Load,
  type Pathway,
  type Reach,
  type Reflex,
  type StateName,
  type Trigger,
  type Went,
} from "@/lib/alarm";
import { SPECIMEN_CIRCUIT, SPECIMEN_PATHWAYS } from "@/content/specimen-alarm";
import {
  rand,
  ribbon,
  roughEllipse,
  roughRect,
  seedOf,
  stroke,
} from "@/lib/hand";
import { KIND_LABEL } from "@/lib/palette";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

/** The sheet's frame. */
const W = 1000;
const H = 620;
/** The circuit's nodes. */
const CUE: Pt = [64, 236];
const THAL: Pt = [292, 176];
const PFC: Pt = [196, 86];
const AMYG: Pt = [396, 222];
const HYPO: Pt = [470, 300];
const HEART: Pt = [556, 344];
const VAGUS: Pt = [318, 350];
/** Where the pathway's line runs: from the alarm out to the two exits. */
const LX0 = 612;
const LX1 = 958;
const LY_MID = 222;
const LY_SWING = 150;
/** The gauges and the timeline. */
const GY = 424;
const TY0 = 532;
const TY1 = 606;
const SAMPLES = 220;

type Pt = [number, number];
type Payload = {
  circuit: Circuit;
  pathways: Pathway[];
  writable: boolean;
  specimen: boolean;
  dir: string | null;
};
type Draft = { pathway: Pathway; fresh: boolean };
type Sample = { hr: number; symp: number; vagal: number; state: StateName };
type Pulse = {
  el: SVGCircleElement;
  path: SVGPathElement;
  len: number;
  pos: number;
  speed: number;
  onArrive?: () => void;
};
type Hover =
  | { kind: "bend"; i: number; x: number; y: number }
  | { kind: "node"; id: string; x: number; y: number };

const NODE_WORDS: Record<string, [string, string]> = {
  cue: ["sensory cue", "what the pathway puts in front of you"],
  thalamus: [
    "thalamus",
    "the relay: the signal splits here, low road and high road",
  ],
  pfc: [
    "prefrontal cortex",
    "the brake — slow appraisal; sleep debt and stress lower its ceiling",
  ],
  amygdala: [
    "amygdala",
    "the alarm — the low road reaches it first; you flinch before you decide",
  ],
  hypothalamus: ["hypothalamus", "the switch to the body"],
  heart: [
    "the body",
    "sympathetic surge: heart, sweat, pupils, muscle; digestion parked",
  ],
  vagus: ["vagus", "the other brake — a long exhale pulls on it directly"],
};

const REST_WORDS =
  "name what sets your alarm off, what fires when it does, and what brings it down. then mark a pathway against them and poke it. the body here is a toy; the names are yours.";

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
const todayStr = () => new Date().toISOString().slice(0, 10);
const short = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1)}…` : s;
const shortHome = (p: string) => p.replace(/^\/Users\/[^/]+/, "~");
const MON = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const dayOf = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}${d.getUTCFullYear() !== new Date().getUTCFullYear() ? ` ${d.getUTCFullYear()}` : ""}`;
};
const STATE_COLOR: Record<StateName, string> = {
  calm: "var(--alarm-vagal)",
  rest: "var(--alarm-vagal)",
  alert: "var(--alarm-symp)",
  surge: "var(--alarm-symp)",
  hijack: "var(--alarm-amyg)",
  freeze: "var(--alarm-freeze)",
};
const REFLEX_WORDS: Record<Reflex, string> = {
  fight: "fight",
  flight: "flight",
  freeze: "freeze",
  fawn: "fawn",
};

// ── the desk's pieces, kept outside the component so they never remount ──
function Chip({
  on,
  onClick,
  children,
  disabled,
  color,
  title,
}: {
  on?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  color?: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="chip a-seg relative px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase disabled:opacity-50"
      style={{
        fontFamily: "var(--font-mono)",
        color: on ? (color ?? "var(--ink)") : "var(--faint)",
        borderColor: on && color ? color : undefined,
      }}
    >
      {children}
    </button>
  );
}

function Row({
  x,
  selected,
  onPick,
}: {
  x: Pathway;
  selected: string | null;
  onPick: (slug: string) => void;
}) {
  return (
    <button
      onClick={() => onPick(x.slug)}
      className="a-row flex w-full items-baseline gap-2 rounded px-1.5 py-0.5 text-left"
      style={{
        background:
          selected === x.slug
            ? "color-mix(in srgb, var(--accent) 10%, transparent)"
            : undefined,
      }}
    >
      <span
        className="hand min-w-0 flex-1 truncate text-[14px] leading-[1.25]"
        style={{ color: "var(--ink)" }}
      >
        {x.title}
      </span>
      <span
        className="meta shrink-0"
        style={{
          color:
            x.went === "vigilant"
              ? "var(--alarm-symp)"
              : x.went === "calm"
                ? "var(--alarm-vagal)"
                : "var(--faint)",
          textTransform: "none",
        }}
      >
        {x.went ?? dayOf(x.asked)}
      </span>
    </button>
  );
}

function Named({
  label,
  onRemove,
  children,
}: {
  label: React.ReactNode;
  onRemove?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <li
      className="flex flex-col gap-1 py-1.5"
      style={{ borderBottom: "1px solid var(--rule)" }}
    >
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1">{label}</div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="meta px-1"
            style={{ color: "var(--faint)" }}
            aria-label="Remove"
          >
            ×
          </button>
        )}
      </div>
      {children}
    </li>
  );
}

/**
 * The alarm. The sandbox's toy nervous system — a thalamus splitting a cue
 * into the low road to the amygdala and the high road to the prefrontal
 * cortex, two brakes, a surge into the body — driven by what the reader has
 * named about themselves: the triggers they know, the defences that fire,
 * the brakes that work, how loaded they are today. A pathway is marked
 * against those and its line runs from the alarm out to hypervigilance or
 * to calm by the marks alone. Poke it and the toy runs: each touched trigger
 * is a cue, the reader's own brakes are the buttons, the body's gauges and
 * the timeline show what the surge does. The desk reads the marks back and
 * grades nothing. Everything is a file in the vault.
 */
export default function Alarm() {
  const [garden, setGarden] = useState<Garden | null>(null);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [own, setOwn] = useState<Pathway[]>([]);
  const [ownCircuit, setOwnCircuit] = useState<Circuit>(EMPTY_CIRCUIT);
  const [showSpecimen, setShowSpecimen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [sure, setSure] = useState(false);
  const [query, setQuery] = useState("");
  const [stoneQuery, setStoneQuery] = useState("");
  const [circuitOpen, setCircuitOpen] = useState(false);
  const [newTrigger, setNewTrigger] = useState("");
  const [newDefence, setNewDefence] = useState("");
  const [newBrake, setNewBrake] = useState("");
  const [loadDraft, setLoadDraft] = useState<Load | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [cap, setCap] = useState<string | null>(null);
  const [kept, setKept] = useState<"idle" | "saving" | "kept" | "error">(
    "idle",
  );
  const [theme, setTheme] = useTheme();

  // the run
  const [body, setBody] = useState<Body | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [running, setRunning] = useState(false);
  const [pressed, setPressed] = useState<{ at: number; label: string }[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  const svg = useRef<SVGSVGElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const pulsesG = useRef<SVGGElement>(null);
  const paths = useRef<Record<string, SVGPathElement | null>>({});
  const bodyRef = useRef<Body | null>(null);
  const pulses = useRef<Pulse[]>([]);
  const cues = useRef<{ at: number; hit: number; label: string }[]>([]);
  const clock = useRef(0);
  const last = useRef(0);
  const raf = useRef<number | null>(null);
  const accum = useRef({ out: 0, brake: 0, sample: 0, quiet: 0 });
  const heartG = useRef<SVGGElement>(null);
  const heartPhase = useRef(0);
  const capTimer = useRef<number | null>(null);
  const keptTimer = useRef<number | null>(null);
  const ownRef = useRef<Pathway[]>([]);
  ownRef.current = own;

  const today = todayStr();

  // ── data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/garden", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((g: Garden | null) => g && setGarden(g));
    fetch("/api/alarm", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Payload | null) => {
        if (!p) return;
        setPayload(p);
        setOwn(p.pathways);
        setOwnCircuit(p.circuit);
      });
  }, []);

  const specimen = showSpecimen || payload?.specimen === true;
  const pathways = specimen ? SPECIMEN_PATHWAYS : own;
  const circuit = specimen ? SPECIMEN_CIRCUIT : ownCircuit;
  const writable = payload?.writable === true && !showSpecimen;
  const knobs = useMemo(
    () => knobsOf(loadDraft ?? circuit.load),
    [loadDraft, circuit.load],
  );

  const nodes = useMemo(() => {
    const m = new Map<string, GardenNode>();
    for (const n of garden?.nodes ?? []) m.set(n.id, n);
    return m;
  }, [garden]);

  // what is asked for in the address
  const [asked, setAsked] = useState<{
    id: string | null;
    stone: string | null;
  } | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setAsked({ id: q.get("id"), stone: q.get("stone") });
  }, []);
  useEffect(() => {
    if (!asked || !payload) return;
    if (asked.id && pathways.some((p) => p.slug === asked.id))
      setSelected(asked.id);
    else if (asked.stone && writable) {
      const n = nodes.get(asked.stone);
      setDraft({
        pathway: emptyPathway(today, n?.label ?? "", [asked.stone]),
        fresh: true,
      });
    }
    setAsked(null);
  }, [asked, payload, pathways, writable, nodes, today]);

  const chosen = useMemo(
    () => pathways.find((p) => p.slug === selected) ?? null,
    [pathways, selected],
  );
  useEffect(() => {
    putOnDesk(
      chosen ? { kind: "pathway", id: chosen.slug, label: chosen.title } : null,
    );
    return () => putOnDesk(null);
  }, [chosen]);
  useEffect(() => {
    if (!chosen) return;
    setDraft({ pathway: chosen, fresh: false });
    setSure(false);
  }, [chosen]);
  useEffect(() => {
    if (draft?.fresh) titleRef.current?.focus();
  }, [draft?.fresh]);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selected) url.searchParams.set("id", selected);
    else url.searchParams.delete("id");
    url.searchParams.delete("stone");
    window.history.replaceState(null, "", url);
  }, [selected]);

  const p = draft?.pathway ?? null;
  const t = useMemo(() => tally(p, circuit, pathways), [p, circuit, pathways]);
  const words = useMemo(() => readings(t, p, circuit), [t, p, circuit]);
  const bends = useMemo(() => (p ? bendsOf(p, circuit) : null), [p, circuit]);
  const lean = bends ? leanOf(bends.lean) : "between";
  const ceiling = ceilingOf(knobs);

  const triggerById = useMemo(
    () => new Map(circuit.triggers.map((x) => [x.id, x])),
    [circuit],
  );
  const defenceById = useMemo(
    () => new Map(circuit.defences.map((x) => [x.id, x])),
    [circuit],
  );
  const brakeById = useMemo(
    () => new Map(circuit.brakes.map((x) => [x.id, x])),
    [circuit],
  );
  const within = useMemo(
    () =>
      p
        ? p.brakes.map((id) => brakeById.get(id)).filter((b): b is Brake => !!b)
        : [],
    [p, brakeById],
  );

  // ── saying and keeping ──────────────────────────────────────────────────
  const say = useCallback((msg: string) => {
    if (capTimer.current) window.clearTimeout(capTimer.current);
    setCap(msg);
    capTimer.current = window.setTimeout(() => setCap(null), 2600);
  }, []);
  const settleKept = useCallback((state: "kept" | "error") => {
    setKept(state);
    if (keptTimer.current) window.clearTimeout(keptTimer.current);
    keptTimer.current = window.setTimeout(() => setKept("idle"), 1600);
  }, []);

  const putPathway = useCallback(
    async (pw: Pathway, fresh: boolean): Promise<Pathway | null> => {
      if (!writable) return null;
      setKept("saving");
      const r = await fetch("/api/alarm", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pathway: pw, fresh }),
      }).catch(() => null);
      if (!r || !r.ok) {
        const j = r ? await r.json().catch(() => null) : null;
        settleKept("error");
        say(j?.error ? String(j.error).replace(/^pathway: /, "") : "not kept.");
        return null;
      }
      const k: Pathway = await r.json();
      setOwn((ps) =>
        fresh
          ? [k, ...ps.filter((x) => x.slug !== k.slug)]
          : ps.map((x) => (x.slug === k.slug ? k : x)),
      );
      settleKept("kept");
      return k;
    },
    [writable, settleKept, say],
  );

  const putCircuit = useCallback(
    async (next: Circuit) => {
      if (!writable) return;
      const prev = ownCircuit;
      setOwnCircuit(next);
      setKept("saving");
      const r = await fetch("/api/alarm", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ circuit: next }),
      }).catch(() => null);
      if (!r || !r.ok) {
        const j = r ? await r.json().catch(() => null) : null;
        setOwnCircuit(prev);
        settleKept("error");
        say(j?.error ? String(j.error).replace(/^circuit: /, "") : "not kept.");
        return;
      }
      setOwnCircuit((await r.json()) as Circuit);
      settleKept("kept");
    },
    [writable, ownCircuit, settleKept, say],
  );

  const remove = useCallback(
    async (slug: string) => {
      if (!writable) return;
      const r = await fetch(`/api/alarm?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
      }).catch(() => null);
      if (!r || !r.ok) {
        settleKept("error");
        return;
      }
      setOwn((ps) => ps.filter((x) => x.slug !== slug));
      setSelected(null);
      setDraft(null);
      setSure(false);
      say("taken back.");
    },
    [writable, settleKept, say],
  );

  const keepDraft = useCallback(async () => {
    if (!draft || !writable) return;
    if (!draft.pathway.title.trim()) {
      say("it needs a title.");
      titleRef.current?.focus();
      return;
    }
    const k = await putPathway(draft.pathway, draft.fresh);
    if (!k) return;
    say(draft.fresh ? "asked." : "kept.");
    setSelected(k.slug);
    setDraft({ pathway: k, fresh: false });
  }, [draft, writable, putPathway, say]);

  const begin = useCallback(
    (title = "", stones: string[] = []) => {
      if (!writable) {
        say(
          specimen ? "the specimen is not yours to change." : "read-only here.",
        );
        return;
      }
      setSelected(null);
      setDraft({ pathway: emptyPathway(today, title, stones), fresh: true });
      setSure(false);
    },
    [writable, specimen, say, today],
  );

  const setField = useCallback(
    <K extends keyof Pathway>(k: K, v: Pathway[K]) =>
      setDraft((d) => (d ? { ...d, pathway: { ...d.pathway, [k]: v } } : d)),
    [],
  );

  const sayWent = useCallback(
    async (w: Went | null) => {
      if (!draft || !writable) return;
      const next = { ...draft.pathway, went: w, wentDay: w ? today : null };
      setDraft({ ...draft, pathway: next });
      if (!draft.fresh) {
        const k = await putPathway(next, false);
        if (k) say(w ? `went ${w}.` : "unsaid.");
      }
    },
    [draft, writable, putPathway, say, today],
  );

  // ── the run ─────────────────────────────────────────────────────────────
  const pulse = useCallback(
    (
      key: string,
      speed: number,
      color: string,
      r: number,
      onArrive?: () => void,
    ) => {
      const path = paths.current[key];
      const g = pulsesG.current;
      if (!path || !g) return;
      const c = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      c.setAttribute("r", String(r));
      c.setAttribute("fill", color);
      g.appendChild(c);
      pulses.current.push({
        el: c,
        path,
        len: path.getTotalLength(),
        pos: 0,
        speed,
        onArrive,
      });
    },
    [],
  );

  const stopRun = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    setRunning(false);
    for (const q of pulses.current) q.el.remove();
    pulses.current = [];
    cues.current = [];
  }, []);

  const loop = useCallback(
    (now: number) => {
      const b0 = bodyRef.current;
      if (!b0) return;
      const dt = Math.min(0.05, (now - last.current) / 1000);
      last.current = now;
      clock.current += dt;
      let b = b0;
      // cues due
      while (cues.current.length && clock.current >= cues.current[0].at) {
        const c = cues.current.shift()!;
        const hit = c.hit;
        pulse("stim", 660, "var(--muted)", 4, () => {
          pulse("low", 330, "var(--alarm-amyg)", 5.5, () => {
            bodyRef.current = cue(bodyRef.current!, knobs, hit);
          });
          pulse("high", 150, "var(--alarm-pfc)", 5);
        });
      }
      // pulses first, so a cue that arrives this tick lands before the step
      for (let i = pulses.current.length - 1; i >= 0; i--) {
        const q = pulses.current[i];
        q.pos += q.speed * dt;
        if (q.pos >= q.len) {
          q.onArrive?.();
          q.el.remove();
          pulses.current.splice(i, 1);
        } else {
          const pt = q.path.getPointAtLength(q.pos);
          q.el.setAttribute("cx", String(pt.x));
          q.el.setAttribute("cy", String(pt.y));
        }
      }
      b = step(bodyRef.current!, knobs, dt);
      // emissions
      const a = accum.current;
      if (b.amyg > 16) {
        a.out += dt;
        const iv = Math.max(0.26, 0.9 - b.amyg / 140);
        if (a.out > iv) {
          a.out = 0;
          pulse("out", 250, "var(--alarm-symp)", 4);
        }
      }
      if ((b.pfc > 12 || b.vagal > 25) && b.amyg > 18) {
        a.brake += dt;
        const iv = Math.max(0.4, 1.1 - (b.pfc + b.vagal) / 220);
        if (a.brake > iv) {
          a.brake = 0;
          pulse("brake", 270, "var(--alarm-vagal)", 4, () => {
            bodyRef.current = {
              ...bodyRef.current!,
              amyg: Math.max(0, bodyRef.current!.amyg - 5),
            };
          });
        }
      }
      // the heart
      heartPhase.current += dt * (b.hr / 60);
      const beat =
        1 + 0.16 * Math.max(0, Math.sin(heartPhase.current * Math.PI * 2));
      heartG.current?.setAttribute(
        "transform",
        `translate(${HEART[0]} ${HEART[1]}) scale(${beat.toFixed(3)})`,
      );
      bodyRef.current = b;
      // samples, and the render
      a.sample += dt;
      if (a.sample > 0.18) {
        a.sample = 0;
        const bb = bodyRef.current!;
        setBody(bb);
        setSamples((s) => [
          ...s.slice(-(SAMPLES - 1)),
          { hr: bb.hr, symp: bb.symp, vagal: bb.vagal, state: stateOf(bb) },
        ]);
      }
      // done when quiet after the last cue
      const s = stateOf(bodyRef.current!);
      if (
        !cues.current.length &&
        !pulses.current.length &&
        (s === "calm" || s === "rest")
      )
        a.quiet += dt;
      else a.quiet = 0;
      if (a.quiet > 3 || clock.current > 90) {
        setRunning(false);
        raf.current = null;
        return;
      }
      raf.current = requestAnimationFrame(loop);
    },
    [knobs, pulse],
  );

  const poke = useCallback(() => {
    if (!p) {
      say("mark a pathway first — or ask one.");
      return;
    }
    const hits = circuit.triggers
      .filter((x) => p.touches[x.id])
      .map((x) => ({
        hit: Math.min(10, x.charge * (p.touches[x.id] ?? 1) + 1),
        label: x.label,
      }));
    if (!hits.length) {
      say("it touches none of your known triggers — nothing to poke it with.");
      return;
    }
    stopRun();
    bodyRef.current = rest(knobs);
    clock.current = 0;
    last.current = performance.now();
    accum.current = { out: 0, brake: 0, sample: 0, quiet: 0 };
    cues.current = hits.map((h, i) => ({
      at: 0.4 + i * 1.6,
      hit: h.hit,
      label: h.label,
    }));
    setSamples([]);
    setPressed([]);
    setSummary(null);
    setBody(bodyRef.current);
    setRunning(true);
    raf.current = requestAnimationFrame(loop);
  }, [p, circuit.triggers, knobs, stopRun, loop, say]);

  const press = useCallback(
    (b: Brake) => {
      if (!running || !bodyRef.current) return;
      bodyRef.current = apply(bodyRef.current, b.reach);
      setPressed((ps) => [...ps, { at: clock.current, label: b.label }]);
      say(
        `${b.label.toLowerCase()} — ${b.reach === "seconds" ? "the vagus pulls" : b.reach === "hours" ? "reaches in, slower" : "barely reaches a run this short"}.`,
      );
    },
    [running, say],
  );

  const reset = useCallback(() => {
    stopRun();
    bodyRef.current = null;
    setBody(null);
    setSamples([]);
    setPressed([]);
    setSummary(null);
  }, [stopRun]);

  useEffect(() => () => stopRun(), [stopRun]);

  // the run's summary, once it stops
  useEffect(() => {
    if (running || samples.length < 10) return;
    const rank = (s: StateName) =>
      s === "freeze"
        ? 5
        : s === "hijack"
          ? 4
          : s === "surge"
            ? 3
            : s === "alert"
              ? 2
              : 0;
    let peak: StateName = "calm";
    let peakI = 0;
    let peakHr = 0;
    samples.forEach((s, i) => {
      if (rank(s.state) > rank(peak)) {
        peak = s.state;
        peakI = i;
      }
      if (s.hr > peakHr) peakHr = s.hr;
    });
    const secs = (peakI * 0.18).toFixed(0);
    const vig = VIGILANT.includes(peak);
    const pressedWords = pressed.length
      ? ` you pressed ${pressed.map((x) => `${x.label.toLowerCase()} at ${x.at.toFixed(0)} s`).join(", ")}.`
      : " no brake was pressed.";
    setSummary(
      `in the run: it reached ${STATE_LABEL[peak].toLowerCase()} at ${secs} s, heart up to ${Math.round(peakHr)}; ${vig ? "the vigilant path" : "the alarm never had the wheel"}.${pressedWords} a toy body, as loaded as you said you are.`,
    );
  }, [running, samples, pressed]);

  // ── keys ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable);
      if (typing) {
        if (e.key === "Escape") el?.blur();
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        search.current?.focus();
        return;
      }
      if (e.key === "Escape") {
        setSelected(null);
        setDraft(null);
        setSure(false);
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        poke();
        return;
      }
      if (e.key === "r") {
        reset();
        return;
      }
      if (e.key === "b" && within[0]) {
        press(within[0]);
        return;
      }
      if (e.key === "n") {
        e.preventDefault();
        begin();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [poke, reset, press, within, begin]);

  // ── search ──────────────────────────────────────────────────────────────
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return pathways
      .filter(
        (x) =>
          x.title.toLowerCase().includes(q) ||
          x.put.toLowerCase().includes(q) ||
          x.note.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [query, pathways]);
  const stoneResults = useMemo(() => {
    const q = stoneQuery.trim().toLowerCase();
    if (q.length < 2 || !garden) return [];
    const have = new Set(p?.stones ?? []);
    return garden.nodes
      .filter((n) => !have.has(n.id) && n.label.toLowerCase().includes(q))
      .sort((a, b) => {
        const ap = a.label.toLowerCase().startsWith(q) ? 0 : 1;
        const bp = b.label.toLowerCase().startsWith(q) ? 0 : 1;
        return ap - bp || b.degree - a.degree;
      })
      .slice(0, 6);
  }, [stoneQuery, garden, p?.stones]);

  // ── the drawing ─────────────────────────────────────────────────────────
  const wires = useMemo(() => {
    const r = rand(seedOf("alarm-wires"));
    const bez = (a: Pt, c1: Pt, c2: Pt, b: Pt) =>
      `M${a[0]} ${a[1]}C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${b[0]} ${b[1]}`;
    return {
      stim: bez(
        [CUE[0] + 20, CUE[1]],
        [150, 236],
        [230, 205],
        [THAL[0] - 22, THAL[1] + 6],
      ),
      high: bez(
        [THAL[0] - 14, THAL[1] - 14],
        [260, 120],
        [240, 100],
        [PFC[0] + 26, PFC[1] + 14],
      ),
      low: bez(
        [THAL[0] + 16, THAL[1] + 12],
        [330, 200],
        [352, 210],
        [AMYG[0] - 20, AMYG[1] - 6],
      ),
      brake: bez(
        [PFC[0] + 24, PFC[1] + 26],
        [280, 150],
        [340, 200],
        [AMYG[0] - 16, AMYG[1] - 12],
      ),
      vagus: bez(
        [VAGUS[0], VAGUS[1]],
        [340, 300],
        [380, 260],
        [AMYG[0] - 4, AMYG[1] + 14],
      ),
      out: bez(
        [AMYG[0] + 18, AMYG[1] + 8],
        [440, 250],
        [460, 280],
        [HYPO[0] - 2, HYPO[1] - 10],
      ),
      out2: bez(
        [HYPO[0] + 8, HYPO[1] + 8],
        [500, 320],
        [520, 330],
        [HEART[0] - 22, HEART[1] - 6],
      ),
      vagusHeart: bez(
        [VAGUS[0] + 10, VAGUS[1] + 4],
        [400, 372],
        [480, 372],
        [HEART[0] - 20, HEART[1] + 8],
      ),
      axis: stroke([LX0, LY_MID], [LX1, LY_MID], r, 1.0, 3),
    };
  }, []);

  // the pathway's line, from the alarm out to an exit, bending per mark
  const line = useMemo(() => {
    if (!bends) return null;
    const n = bends.bends.length;
    const k = LY_SWING / Math.max(6, bends.up + bends.down);
    const pts: Pt[] = [[LX0, LY_MID]];
    const marks: { x: number; y: number; i: number }[] = [];
    let y = LY_MID;
    for (let i = 0; i < n; i++) {
      const b = bends.bends[i];
      const x = LX0 + ((i + 1) * (LX1 - LX0 - 30)) / (n + 1);
      y = clamp(
        y + (b.kind === "trigger" ? -1 : 1) * b.amount * k,
        LY_MID - LY_SWING,
        LY_MID + LY_SWING,
      );
      pts.push([x, y]);
      marks.push({ x, y, i });
    }
    const endY = clamp(
      LY_MID - bends.lean * LY_SWING,
      LY_MID - LY_SWING,
      LY_MID + LY_SWING,
    );
    pts.push([LX1 - 6, endY]);
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const mx = (a[0] + b[0]) / 2;
      d += `C${mx} ${a[1]} ${mx} ${b[1]} ${b[0]} ${b[1]}`;
    }
    return {
      d,
      ink: ribbon(d, 2.2, seedOf(`line-${p?.slug ?? "fresh"}`)),
      marks,
      endY,
    };
  }, [bends, p?.slug]);

  const shown = body ?? rest(knobs);
  const g = gaugesOf(shown);
  const state = stateOf(shown);
  const hijack = state === "hijack";

  const gauges: {
    key: keyof typeof g;
    label: string;
    unit: string;
    min: number;
    max: number;
    color: string;
    digits?: number;
  }[] = [
    {
      key: "hr",
      label: "heart rate",
      unit: "bpm",
      min: 40,
      max: 190,
      color: "var(--alarm-amyg)",
    },
    {
      key: "hrv",
      label: "HRV",
      unit: "ms",
      min: 0,
      max: 180,
      color: "var(--alarm-vagal)",
    },
    {
      key: "breath",
      label: "breathing",
      unit: "/min",
      min: 4,
      max: 40,
      color: "var(--alarm-symp)",
    },
    {
      key: "sweat",
      label: "skin sweat",
      unit: "µS",
      min: 0,
      max: 22,
      color: "var(--alarm-symp)",
      digits: 1,
    },
    {
      key: "pupil",
      label: "pupil",
      unit: "mm",
      min: 2.5,
      max: 8,
      color: "var(--alarm-amyg)",
      digits: 1,
    },
    {
      key: "bp",
      label: "blood pressure",
      unit: "sys",
      min: 108,
      max: 178,
      color: "var(--alarm-amyg)",
    },
    {
      key: "muscle",
      label: "muscle tension",
      unit: "%",
      min: 0,
      max: 100,
      color: "var(--alarm-amyg)",
    },
    {
      key: "digestion",
      label: "digestion",
      unit: "%",
      min: 0,
      max: 100,
      color: "var(--alarm-vagal)",
    },
  ];

  const tl = useMemo(() => {
    if (samples.length < 2) return null;
    const x = (i: number) => 40 + ((W - 60) * i) / (SAMPLES - 1);
    const y = (v: number, min: number, max: number) =>
      TY1 - ((v - min) / (max - min)) * (TY1 - TY0) * 0.92 - (TY1 - TY0) * 0.04;
    const poly = (key: "hr" | "symp" | "vagal", min: number, max: number) =>
      samples
        .map((s, i) => `${x(i).toFixed(1)},${y(s[key], min, max).toFixed(1)}`)
        .join(" ");
    return {
      vagal: poly("vagal", 0, 100),
      symp: poly("symp", 0, 130),
      hr: poly("hr", 40, 192),
      presses: pressed.map((pr) => ({
        x: x(Math.min(SAMPLES - 1, Math.round(pr.at / 0.18))),
        label: pr.label,
      })),
    };
  }, [samples, pressed]);

  const nodeHover = (id: string) => (ev: React.PointerEvent<SVGGElement>) => {
    const el = svg.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    setHover({
      kind: "node",
      id,
      x: ((ev.clientX - box.left) / box.width) * W,
      y: ((ev.clientY - box.top) / box.height) * H,
    });
  };

  const hoverCard = () => {
    if (!hover) return null;
    const flip = hover.x > W * 0.62;
    const style = {
      left: `${(hover.x / W) * 100}%`,
      top: `${(hover.y / H) * 100}%`,
      transform: flip
        ? "translate(calc(-100% - 12px), -8px)"
        : "translate(12px, -8px)",
      maxWidth: "18rem",
    };
    if (hover.kind === "node") {
      const [name, wordsN] = NODE_WORDS[hover.id] ?? [hover.id, ""];
      return (
        <div
          className="card fade pointer-events-none absolute z-[5] px-3 py-2"
          style={style}
        >
          <div className="meta" style={{ color: "var(--faint)" }}>
            {name}
          </div>
          <div
            className="hand mt-0.5 text-[14px] leading-[1.25]"
            style={{ color: "var(--ink)" }}
          >
            {wordsN}
          </div>
        </div>
      );
    }
    const b = bends?.bends[hover.i];
    if (!b) return null;
    const tr = b.kind === "trigger" ? triggerById.get(b.id) : undefined;
    const br = b.kind === "brake" ? brakeById.get(b.id) : undefined;
    return (
      <div
        className="card fade pointer-events-none absolute z-[5] px-3 py-2"
        style={style}
      >
        <div
          className="meta"
          style={{
            color:
              b.kind === "trigger" ? "var(--alarm-amyg)" : "var(--alarm-vagal)",
          }}
        >
          {b.kind === "trigger" ? "touches" : "within reach"}
          <span style={{ color: "var(--faint)" }}>
            {tr
              ? ` · hits ${"·".repeat(tr.charge)} · ${"·".repeat(p?.touches[tr.id] ?? 0)} of it on this path`
              : ""}
            {br ? ` · works in ${br.reach}` : ""}
          </span>
        </div>
        <div
          className="hand mt-0.5 text-[15px] leading-[1.2]"
          style={{ color: "var(--ink)" }}
        >
          {b.label}
        </div>
        {tr?.signs && (
          <div className="hand text-[13px]" style={{ color: "var(--muted)" }}>
            first sign: {tr.signs}
          </div>
        )}
        {tr && tr.pulls.length > 0 && (
          <div className="hand text-[13px]" style={{ color: "var(--muted)" }}>
            usually pulls{" "}
            {tr.pulls.map((id) => defenceById.get(id)?.label ?? id).join(", ")}
          </div>
        )}
        {br?.note && (
          <div className="hand text-[13px]" style={{ color: "var(--muted)" }}>
            {short(br.note, 120)}
          </div>
        )}
      </div>
    );
  };

  const editLabel = (value: string, onDone: (v: string) => void) => (
    <input
      defaultValue={value}
      key={value}
      onBlur={(e) => {
        const v = e.target.value.trim();
        if (v && v !== value) onDone(v);
      }}
      onKeyDown={(e) =>
        e.key === "Enter" && (e.target as HTMLInputElement).blur()
      }
      readOnly={!writable}
      className="search hand w-full px-2 py-1 text-[14px]"
    />
  );

  const dirty =
    draft && chosen && !draft.fresh
      ? JSON.stringify(draft.pathway) !== JSON.stringify(chosen)
      : Boolean(draft?.fresh);
  const load = loadDraft ?? circuit.load;
  const dialUp = (k: keyof Load, v: number) =>
    setLoadDraft({ ...load, [k]: v });
  const dialDone = () => {
    if (!loadDraft || !writable) return;
    putCircuit({ ...circuit, load: loadDraft, loadDay: today });
    setLoadDraft(null);
  };

  return (
    <main className="alarm scroll-thin relative h-dvh w-full overflow-y-auto">
      <div className="mx-auto max-w-[84rem] px-5 pb-16 sm:px-10">
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
                alarm
              </div>
              <p
                className="hand mt-1 max-w-[30rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                Will this set off your fight or flight? Name what trips your
                alarm, what fires when it does, and what brings it down. Mark a
                pathway against them, then poke a toy body and watch which road
                it takes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/alarm" />
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

        {specimen && (
          <p
            className="meta mt-3"
            style={{ color: "var(--accent)", textTransform: "none" }}
          >
            Specimen A&rsquo;s circuit — a synthetic nervous system, fiction to
            show the instrument; nobody&rsquo;s.
            {showSpecimen && (
              <>
                {" "}
                <button
                  onClick={() => setShowSpecimen(false)}
                  className="underline"
                  style={{ color: "var(--muted)" }}
                >
                  back to your own
                </button>
              </>
            )}
          </p>
        )}

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
          {/* ── the sheet ─────────────────────────────────────────────── */}
          <section
            className="panel sketched rise relative self-start p-2 sm:p-3"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The alarm"
          >
            <Sketch seed="alarm-sheet" draw />

            {/* the state, and the pokes */}
            <div className="relative z-[2] flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="meta" style={{ color: STATE_COLOR[state] }}>
                  {STATE_LABEL[state]}
                </span>
                <span
                  className="hand text-[13.5px]"
                  style={{ color: "var(--muted)" }}
                >
                  {STATE_WORDS[state]}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip
                  onClick={poke}
                  on
                  color="var(--alarm-amyg)"
                  disabled={!p}
                  title="space"
                >
                  {running ? "poke it again" : "poke it"}
                </Chip>
                {within.map((b) => (
                  <Chip
                    key={b.id}
                    onClick={() => press(b)}
                    on={running}
                    color="var(--alarm-vagal)"
                    disabled={!running}
                    title={b.reach}
                  >
                    {short(b.label, 18)}
                  </Chip>
                ))}
                {(body || running) && (
                  <Chip onClick={reset} title="r">
                    reset
                  </Chip>
                )}
                <span
                  className="meta"
                  style={{
                    color: kept === "error" ? "var(--accent)" : "var(--faint)",
                  }}
                >
                  {kept === "saving"
                    ? "keeping…"
                    : kept === "kept"
                      ? "kept"
                      : kept === "error"
                        ? "not kept"
                        : writable
                          ? ""
                          : specimen
                            ? "specimen"
                            : "read-only"}
                </span>
              </div>
            </div>

            {cap && (
              <div
                className="hand fade pointer-events-none absolute top-9 right-4 z-[4] text-[15px]"
                style={{ color: "var(--accent)" }}
              >
                — {cap}
              </div>
            )}

            <div className="relative">
              <svg
                ref={svg}
                viewBox={`0 0 ${W} ${H}`}
                className="a-sheet relative z-[2] block h-auto w-full"
                role="img"
                aria-label="The threat circuit, the pathway's line, the body's gauges and the run"
                onPointerLeave={() => setHover(null)}
              >
                <defs>
                  <marker
                    id="a-arw"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path
                      d="M2 1L8 5L2 9"
                      fill="none"
                      stroke="context-stroke"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </marker>
                  {line && (
                    <mask
                      id="a-line-mask"
                      maskUnits="userSpaceOnUse"
                      x={LX0 - 20}
                      y={0}
                      width={LX1 - LX0 + 60}
                      height={H}
                    >
                      <path
                        d={line.d}
                        pathLength={1}
                        className="draw late"
                        fill="none"
                        stroke="#fff"
                        strokeWidth={10}
                        strokeLinecap="round"
                      />
                    </mask>
                  )}
                </defs>

                {/* the brain, faint */}
                <path
                  d="M120 200 C118 110 190 60 300 56 C420 52 520 66 560 118 C588 154 574 214 500 232 C460 244 420 240 400 240 C360 242 300 244 240 242 C180 240 122 224 120 200 Z"
                  fill={hijack ? "var(--alarm-amyg)" : "var(--ink)"}
                  fillOpacity={hijack ? 0.04 : 0.03}
                  stroke="var(--rule)"
                  strokeWidth={1.2}
                />
                <path
                  d={`M470 246 C466 270 478 290 480 312 C482 326 482 334 480 342`}
                  fill="none"
                  stroke="var(--rule)"
                  strokeWidth={9}
                  strokeLinecap="round"
                  opacity={0.7}
                />

                {/* the wires */}
                <path
                  ref={(el) => {
                    paths.current.stim = el;
                  }}
                  d={wires.stim}
                  fill="none"
                  stroke="var(--faint)"
                  strokeWidth={1.4}
                  strokeDasharray="1 5"
                  strokeLinecap="round"
                  className="draw"
                />
                <path
                  ref={(el) => {
                    paths.current.high = el;
                  }}
                  d={wires.high}
                  fill="none"
                  stroke="var(--alarm-pfc)"
                  strokeWidth={2}
                  opacity={0.6}
                  markerEnd="url(#a-arw)"
                  className="draw"
                />
                <path
                  ref={(el) => {
                    paths.current.low = el;
                  }}
                  d={wires.low}
                  fill="none"
                  stroke="var(--alarm-amyg)"
                  strokeWidth={2.4}
                  opacity={0.7}
                  markerEnd="url(#a-arw)"
                  className="draw"
                />
                <path
                  ref={(el) => {
                    paths.current.brake = el;
                  }}
                  d={wires.brake}
                  fill="none"
                  stroke="var(--alarm-vagal)"
                  strokeWidth={1.8}
                  opacity={0.55}
                  strokeDasharray="5 4"
                  markerEnd="url(#a-arw)"
                  className="draw"
                />
                <path
                  d={wires.vagus}
                  fill="none"
                  stroke="var(--alarm-vagal)"
                  strokeWidth={1.6}
                  opacity={0.5}
                  strokeDasharray="5 4"
                  markerEnd="url(#a-arw)"
                  className="draw"
                />
                <path
                  d={wires.vagusHeart}
                  fill="none"
                  stroke="var(--alarm-vagal)"
                  strokeWidth={1.4}
                  opacity={0.4}
                  strokeDasharray="5 4"
                  className="draw"
                />
                <path
                  ref={(el) => {
                    paths.current.out = el;
                  }}
                  d={`${wires.out}${wires.out2.replace(/^M[^C]*/, "L" + wires.out2.slice(1).split("C")[0])}`}
                  fill="none"
                  stroke="var(--alarm-symp)"
                  strokeWidth={2.2}
                  opacity={0.55}
                  markerEnd="url(#a-arw)"
                  className="draw"
                />

                {/* the nodes */}
                <g
                  className="a-node"
                  onPointerMove={nodeHover("cue")}
                  onPointerLeave={() => setHover(null)}
                >
                  <ellipse
                    cx={CUE[0]}
                    cy={CUE[1]}
                    rx={17}
                    ry={10}
                    fill="none"
                    stroke="var(--muted)"
                    strokeWidth={1.4}
                  />
                  <circle
                    cx={CUE[0]}
                    cy={CUE[1]}
                    r={4.5 + (shown.symp / 130) * 2.5}
                    fill={
                      shown.amyg > 20 ? "var(--alarm-amyg)" : "var(--muted)"
                    }
                  />
                  <text
                    x={CUE[0]}
                    y={CUE[1] + 28}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--faint)"
                    style={{ fontFamily: "var(--font-hand)" }}
                  >
                    sensory cue
                  </text>
                </g>
                <g
                  className="a-node"
                  onPointerMove={nodeHover("thalamus")}
                  onPointerLeave={() => setHover(null)}
                >
                  <path
                    d={roughEllipse(44, 30, seedOf("thalamus"), {
                      pad: 0,
                      steps: 14,
                    })}
                    transform={`translate(${THAL[0] - 22} ${THAL[1] - 15})`}
                    fill="var(--ink)"
                    fillOpacity={0.08}
                    stroke="var(--muted)"
                    strokeWidth={1.2}
                  />
                  <text
                    x={THAL[0] + 30}
                    y={THAL[1] - 2}
                    fontSize={12.5}
                    fill="var(--ink)"
                    style={{ fontFamily: "var(--font-hand)" }}
                  >
                    thalamus
                  </text>
                  <text
                    x={THAL[0] + 30}
                    y={THAL[1] + 12}
                    fontSize={10.5}
                    fill="var(--faint)"
                    style={{ fontFamily: "var(--font-hand)" }}
                  >
                    the relay
                  </text>
                </g>
                <g
                  className="a-node"
                  opacity={hijack ? 0.35 : 1}
                  onPointerMove={nodeHover("pfc")}
                  onPointerLeave={() => setHover(null)}
                >
                  <circle
                    cx={PFC[0]}
                    cy={PFC[1]}
                    r={30}
                    fill="var(--alarm-pfc)"
                    opacity={(shown.pfc / 100) * 0.25}
                  />
                  <path
                    d={roughEllipse(60, 60, seedOf("pfc"), {
                      pad: 0,
                      steps: 16,
                    })}
                    transform={`translate(${PFC[0] - 30} ${PFC[1] - 30})`}
                    fill="var(--alarm-pfc)"
                    fillOpacity={0.1 + (shown.pfc / 100) * 0.45}
                    stroke="var(--alarm-pfc)"
                    strokeWidth={1.5}
                  />
                  <text
                    x={PFC[0] - 38}
                    y={PFC[1] - 4}
                    textAnchor="end"
                    fontSize={12.5}
                    fill="var(--ink)"
                    style={{ fontFamily: "var(--font-hand)" }}
                  >
                    prefrontal cortex
                  </text>
                  <text
                    x={PFC[0] - 38}
                    y={PFC[1] + 10}
                    textAnchor="end"
                    fontSize={10.5}
                    fill="var(--faint)"
                    style={{ fontFamily: "var(--font-hand)" }}
                  >
                    the brake · ceiling {Math.round(ceiling)}
                  </text>
                </g>
                {hijack && (
                  <text
                    x={PFC[0]}
                    y={PFC[1] + 48}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--alarm-amyg)"
                    style={{ fontFamily: "var(--font-hand)" }}
                  >
                    offline
                  </text>
                )}
                <g
                  className="a-node"
                  onPointerMove={nodeHover("amygdala")}
                  onPointerLeave={() => setHover(null)}
                >
                  <circle
                    cx={AMYG[0]}
                    cy={AMYG[1]}
                    r={16 + (shown.amyg / 100) * 24}
                    fill="var(--alarm-amyg)"
                    opacity={(shown.amyg / 100) * 0.4}
                  />
                  <path
                    d={roughEllipse(42, 28, seedOf("amygdala"), {
                      pad: 0,
                      steps: 14,
                    })}
                    transform={`translate(${AMYG[0] - 21} ${AMYG[1] - 14}) rotate(-20 21 14)`}
                    fill="var(--alarm-amyg)"
                    fillOpacity={0.14 + (shown.amyg / 100) * 0.62}
                    stroke="var(--alarm-amyg)"
                    strokeWidth={1.5}
                  />
                  <text
                    x={AMYG[0] + 4}
                    y={AMYG[1] - 22}
                    fontSize={12.5}
                    fill="var(--ink)"
                    style={{ fontFamily: "var(--font-hand)" }}
                  >
                    amygdala
                  </text>
                  <text
                    x={AMYG[0] + 4}
                    y={AMYG[1] - 9}
                    fontSize={10.5}
                    fill="var(--faint)"
                    style={{ fontFamily: "var(--font-hand)" }}
                  >
                    the alarm
                  </text>
                </g>
                <g
                  className="a-node"
                  onPointerMove={nodeHover("hypothalamus")}
                  onPointerLeave={() => setHover(null)}
                >
                  <circle
                    cx={HYPO[0]}
                    cy={HYPO[1]}
                    r={10}
                    fill="var(--alarm-symp)"
                    fillOpacity={0.12 + (shown.symp / 130) * 0.6}
                    stroke="var(--alarm-symp)"
                    strokeWidth={1.2}
                  />
                  <text
                    x={HYPO[0] + 16}
                    y={HYPO[1] + 4}
                    fontSize={10.5}
                    fill="var(--faint)"
                    style={{ fontFamily: "var(--font-hand)" }}
                  >
                    hypothalamus
                  </text>
                </g>
                <g
                  className="a-node"
                  onPointerMove={nodeHover("vagus")}
                  onPointerLeave={() => setHover(null)}
                >
                  <circle
                    cx={VAGUS[0]}
                    cy={VAGUS[1]}
                    r={8}
                    fill="var(--alarm-vagal)"
                    fillOpacity={0.1 + (shown.vagal / 100) * 0.5}
                    stroke="var(--alarm-vagal)"
                    strokeWidth={1.2}
                  />
                  <text
                    x={VAGUS[0] - 14}
                    y={VAGUS[1] + 4}
                    textAnchor="end"
                    fontSize={11}
                    fill="var(--faint)"
                    style={{ fontFamily: "var(--font-hand)" }}
                  >
                    vagus · the other brake
                  </text>
                </g>
                <g
                  className="a-node"
                  onPointerMove={nodeHover("heart")}
                  onPointerLeave={() => setHover(null)}
                >
                  <g
                    ref={heartG}
                    transform={`translate(${HEART[0]} ${HEART[1]})`}
                  >
                    <path
                      d="M0 14 C-18 2 -20 -14 -8 -16 C-2 -17 0 -12 0 -10 C0 -12 2 -17 8 -16 C20 -14 18 2 0 14 Z"
                      fill="var(--alarm-amyg)"
                      fillOpacity={0.25 + (shown.symp / 130) * 0.6}
                      stroke="var(--alarm-amyg)"
                      strokeWidth={1.3}
                    />
                  </g>
                  <text
                    x={HEART[0]}
                    y={HEART[1] + 34}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--faint)"
                    style={{ fontFamily: "var(--font-hand)" }}
                  >
                    the body
                  </text>
                </g>
                <g ref={pulsesG} />

                {/* the two exits, and the line the marks draw */}
                <g>
                  <path
                    d={ribbon(wires.axis, 1.4, seedOf("alarm-axis"))}
                    fill="var(--ink)"
                    opacity={0.25}
                  />
                  <text
                    x={LX1}
                    y={LY_MID - LY_SWING - 12}
                    textAnchor="end"
                    fontSize={9}
                    fill="var(--alarm-symp)"
                    style={{
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    }}
                  >
                    hypervigilance
                  </text>
                  <text
                    x={LX1}
                    y={LY_MID + LY_SWING + 22}
                    textAnchor="end"
                    fontSize={9}
                    fill="var(--alarm-vagal)"
                    style={{
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    }}
                  >
                    calm
                  </text>
                  <line
                    x1={LX1}
                    x2={LX1}
                    y1={LY_MID - LY_SWING}
                    y2={LY_MID + LY_SWING}
                    stroke="var(--rule)"
                    strokeWidth={1}
                    strokeDasharray="2 3"
                  />
                  <text
                    x={LX0}
                    y={LY_MID - LY_SWING - 12}
                    fontSize={9}
                    fill="var(--faint)"
                    style={{
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    }}
                  >
                    {p ? "the pathway, as marked" : "no pathway on the desk"}
                  </text>
                  {line && (
                    <>
                      <path
                        d={line.ink}
                        fill={
                          lean === "vigilant"
                            ? "var(--alarm-symp)"
                            : lean === "calm"
                              ? "var(--alarm-vagal)"
                              : "var(--ink)"
                        }
                        mask="url(#a-line-mask)"
                      />
                      {line.marks.map((m) => {
                        const b = bends!.bends[m.i];
                        const trig = b.kind === "trigger";
                        return (
                          <g
                            key={`${b.kind}-${b.id}`}
                            data-bend={m.i}
                            style={{ cursor: "help" }}
                            onPointerMove={(ev) => {
                              const el = svg.current;
                              if (!el) return;
                              const box = el.getBoundingClientRect();
                              setHover({
                                kind: "bend",
                                i: m.i,
                                x: ((ev.clientX - box.left) / box.width) * W,
                                y: ((ev.clientY - box.top) / box.height) * H,
                              });
                            }}
                            onPointerLeave={() => setHover(null)}
                          >
                            <circle
                              cx={m.x}
                              cy={m.y}
                              r={11}
                              fill="transparent"
                            />
                            <path
                              d={roughEllipse(
                                9 + b.amount * 0.6,
                                9 + b.amount * 0.6,
                                seedOf(b.id),
                                { pad: 0, steps: 12 },
                              )}
                              transform={`translate(${m.x - (9 + b.amount * 0.6) / 2} ${m.y - (9 + b.amount * 0.6) / 2})`}
                              fill={
                                trig
                                  ? "var(--alarm-amyg)"
                                  : "var(--alarm-vagal)"
                              }
                              fillOpacity={0.8}
                              stroke="var(--surface)"
                              strokeWidth={1}
                            />
                            <text
                              x={m.x}
                              y={m.y + (trig ? -12 : 18)}
                              textAnchor="middle"
                              fontSize={10.5}
                              fill="var(--muted)"
                              stroke="var(--surface)"
                              strokeWidth={3}
                              paintOrder="stroke"
                              style={{ fontFamily: "var(--font-hand)" }}
                            >
                              {short(b.label, 22)}
                            </text>
                          </g>
                        );
                      })}
                      <path
                        d={roughEllipse(14, 14, seedOf("line-end"), {
                          pad: 0,
                          steps: 12,
                        })}
                        transform={`translate(${LX1 - 13} ${line.endY - 7})`}
                        fill="none"
                        stroke={
                          lean === "vigilant"
                            ? "var(--alarm-symp)"
                            : lean === "calm"
                              ? "var(--alarm-vagal)"
                              : "var(--ink)"
                        }
                        strokeWidth={1.4}
                      />
                    </>
                  )}
                  {p && !line?.marks.length && (
                    <text
                      x={(LX0 + LX1) / 2}
                      y={LY_MID - 16}
                      textAnchor="middle"
                      fontSize={12.5}
                      fill="var(--faint)"
                      style={{ fontFamily: "var(--font-hand)" }}
                    >
                      nothing marked yet — say what it touches, and what is
                      within reach
                    </text>
                  )}
                </g>

                {/* the autonomic balance */}
                <g>
                  <text
                    x={20}
                    y={GY - 22}
                    fontSize={9}
                    fill="var(--faint)"
                    style={{
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    }}
                  >
                    parasympathetic · rest
                  </text>
                  <text
                    x={W - 20}
                    y={GY - 22}
                    textAnchor="end"
                    fontSize={9}
                    fill="var(--faint)"
                    style={{
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    }}
                  >
                    sympathetic · mobilise
                  </text>
                  <line
                    x1={20}
                    x2={W - 20}
                    y1={GY - 14}
                    y2={GY - 14}
                    stroke="var(--rule)"
                    strokeWidth={1}
                  />
                  <line
                    x1={20 + ((g.balance + 100) / 200) * (W - 40)}
                    x2={20 + ((g.balance + 100) / 200) * (W - 40)}
                    y1={GY - 20}
                    y2={GY - 8}
                    stroke={
                      g.balance > 25
                        ? "var(--alarm-symp)"
                        : g.balance < -25
                          ? "var(--alarm-vagal)"
                          : "var(--ink)"
                    }
                    strokeWidth={2}
                  />
                </g>

                {/* downstream in the body */}
                {gauges.map((ga, i) => {
                  const v = g[ga.key];
                  const w = 112;
                  const x0 = 20 + i * ((W - 40) / 8);
                  const frac = clamp((v - ga.min) / (ga.max - ga.min), 0, 1);
                  return (
                    <g key={ga.key}>
                      <text
                        x={x0}
                        y={GY + 8}
                        fontSize={9}
                        fill="var(--faint)"
                        style={{
                          fontFamily: "var(--font-mono)",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}
                      >
                        {ga.label}
                      </text>
                      <text
                        x={x0}
                        y={GY + 30}
                        fontSize={17}
                        fill="var(--ink)"
                        style={{ fontFamily: "var(--font-hand)" }}
                      >
                        {ga.digits ? v.toFixed(ga.digits) : Math.round(v)}
                        <tspan fontSize={10} fill="var(--faint)">
                          {" "}
                          {ga.unit}
                        </tspan>
                      </text>
                      <line
                        x1={x0}
                        x2={x0 + w}
                        y1={GY + 40}
                        y2={GY + 40}
                        stroke="var(--rule)"
                        strokeWidth={2}
                      />
                      <line
                        x1={x0}
                        x2={x0 + w * frac}
                        y1={GY + 40}
                        y2={GY + 40}
                        stroke={ga.color}
                        strokeWidth={2.4}
                        className="a-gauge"
                      />
                    </g>
                  );
                })}

                {/* the timeline: the last forty seconds of a run */}
                <g>
                  <text
                    x={40}
                    y={TY0 - 8}
                    fontSize={9}
                    fill="var(--faint)"
                    style={{
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    }}
                  >
                    <tspan fill="var(--alarm-amyg)">heart rate</tspan>
                    <tspan fill="var(--faint)"> · </tspan>
                    <tspan fill="var(--alarm-symp)">sympathetic arousal</tspan>
                    <tspan fill="var(--faint)"> · </tspan>
                    <tspan fill="var(--alarm-vagal)">vagal brake</tspan>
                    <tspan fill="var(--faint)">
                      {" "}
                      · the run, last 40 seconds
                    </tspan>
                  </text>
                  {[1, 2, 3].map((k) => (
                    <line
                      key={k}
                      x1={40}
                      x2={W - 20}
                      y1={TY0 + ((TY1 - TY0) * k) / 4}
                      y2={TY0 + ((TY1 - TY0) * k) / 4}
                      stroke="var(--rule)"
                      strokeWidth={0.8}
                    />
                  ))}
                  <line
                    x1={40}
                    x2={W - 20}
                    y1={TY1}
                    y2={TY1}
                    stroke="var(--rule)"
                    strokeWidth={1}
                  />
                  {tl ? (
                    <>
                      <polyline
                        points={tl.vagal}
                        fill="none"
                        stroke="var(--alarm-vagal)"
                        strokeWidth={1.6}
                        strokeLinejoin="round"
                      />
                      <polyline
                        points={tl.symp}
                        fill="none"
                        stroke="var(--alarm-symp)"
                        strokeWidth={1.6}
                        strokeLinejoin="round"
                      />
                      <polyline
                        points={tl.hr}
                        fill="none"
                        stroke="var(--alarm-amyg)"
                        strokeWidth={1.8}
                        strokeLinejoin="round"
                      />
                      {tl.presses.map((pr, i) => (
                        <g key={i}>
                          <line
                            x1={pr.x}
                            x2={pr.x}
                            y1={TY0}
                            y2={TY1}
                            stroke="var(--alarm-vagal)"
                            strokeWidth={1}
                            strokeDasharray="2 3"
                          />
                          <text
                            x={pr.x + 3}
                            y={TY0 + 10}
                            fontSize={10}
                            fill="var(--alarm-vagal)"
                            style={{ fontFamily: "var(--font-hand)" }}
                          >
                            {short(pr.label, 16)}
                          </text>
                        </g>
                      ))}
                    </>
                  ) : (
                    <text
                      x={(W + 20) / 2}
                      y={(TY0 + TY1) / 2 + 4}
                      textAnchor="middle"
                      fontSize={12.5}
                      fill="var(--faint)"
                      style={{ fontFamily: "var(--font-hand)" }}
                    >
                      {p
                        ? "poke it, and the run draws here"
                        : "the run draws here"}
                    </text>
                  )}
                </g>
              </svg>
              {hoverCard()}
            </div>

            <div className="relative z-[2] flex flex-wrap items-center gap-x-3 gap-y-1 px-1 pt-1.5">
              <span className="meta" style={{ color: "var(--faint)" }}>
                a hand-drawn toy of a body, not yours
              </span>
              <span className="meta" style={{ color: "var(--alarm-amyg)" }}>
                · low road, fast
              </span>
              <span className="meta" style={{ color: "var(--alarm-pfc)" }}>
                · high road, slow
              </span>
              <span className="meta" style={{ color: "var(--alarm-vagal)" }}>
                · the brakes
              </span>
              <span className="meta" style={{ color: "var(--alarm-symp)" }}>
                · the surge
              </span>
              <span className="meta" style={{ color: "var(--faint)" }}>
                · space pokes · b presses the first brake · r resets
              </span>
            </div>
            {summary && (
              <p
                className="hand relative z-[2] px-1 pt-1 text-[13.5px] leading-[1.35]"
                style={{ color: "var(--muted)" }}
              >
                {summary}
              </p>
            )}
          </section>

          {/* ── the desk ──────────────────────────────────────────────── */}
          <aside
            className="rise flex flex-col gap-5"
            style={{ animationDelay: "140ms" }}
          >
            <div className="relative">
              <label
                className="meta block"
                htmlFor="alarm-search"
                style={{ color: "var(--faint)" }}
              >
                a pathway asked
                {writable ? (
                  <>
                    {" · "}
                    <button
                      onClick={() => begin()}
                      className="underline"
                      style={{
                        color: "var(--muted)",
                        textTransform: "none",
                        letterSpacing: 0,
                      }}
                    >
                      ask a new one
                    </button>
                  </>
                ) : null}
              </label>
              <input
                id="alarm-search"
                ref={search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="a title, a word  /"
                className="search mt-2 w-full px-3 py-2 text-[13px]"
                autoComplete="off"
              />
              {results.length > 0 && (
                <ul
                  className="panel sketched relative mt-2 p-1.5"
                  style={{ borderRadius: 3 }}
                >
                  <Sketch seed="alarm-found" draw />
                  {results.map((x) => (
                    <li key={x.slug}>
                      <Row x={x} selected={selected} onPick={setSelected} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* the pathway on the desk */}
            {p && (
              <section
                className="panel sketched relative p-4"
                style={{ borderRadius: 3 }}
                aria-label="The pathway"
              >
                <Sketch
                  seed={`pathway-${p.slug || "fresh"}`}
                  color="var(--accent)"
                  draw
                />
                <div className="flex items-baseline justify-between gap-2">
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    {draft?.fresh ? "asking" : "on the desk"}
                    <span style={{ color: "var(--faint)" }}>
                      {" "}
                      ·{" "}
                      {lean === "vigilant"
                        ? "runs to hypervigilance"
                        : lean === "calm"
                          ? "runs to calm"
                          : "hangs between"}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setDraft(null);
                      setSelected(null);
                      setSure(false);
                    }}
                    className="meta"
                    style={{ color: "var(--faint)" }}
                    aria-label="Close"
                  >
                    esc
                  </button>
                </div>
                <input
                  ref={titleRef}
                  value={p.title}
                  onChange={(e) => setField("title", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      keepDraft();
                    }
                  }}
                  readOnly={!writable}
                  maxLength={200}
                  placeholder="the decision, the plan, the road"
                  className="search hand mt-2 w-full px-3 py-2 text-[17px] leading-[1.2]"
                />
                <textarea
                  value={p.put}
                  onChange={(e) => setField("put", e.target.value)}
                  readOnly={!writable}
                  rows={2}
                  maxLength={5000}
                  placeholder="in words — what it would actually be like, day to day"
                  className="search hand mt-2 w-full resize-y px-3 py-2 text-[14.5px] leading-[1.3]"
                />

                <div
                  className="meta mt-3"
                  style={{ color: "var(--alarm-amyg)" }}
                >
                  what it touches{" "}
                  <span style={{ color: "var(--faint)" }}>
                    · how much of each is on it
                  </span>
                </div>
                {circuit.triggers.length === 0 ? (
                  <p
                    className="hand mt-1 text-[13px]"
                    style={{ color: "var(--faint)" }}
                  >
                    no triggers named yet — open your circuit below.
                  </p>
                ) : (
                  <ul className="mt-1 flex flex-col gap-1">
                    {circuit.triggers.map((tr) => {
                      const dose = p.touches[tr.id] ?? 0;
                      return (
                        <li key={tr.id} className="flex items-center gap-2">
                          <span
                            className="hand min-w-0 flex-1 truncate text-[14px]"
                            style={{
                              color: dose ? "var(--ink)" : "var(--muted)",
                            }}
                          >
                            {tr.label}
                            <span style={{ color: "var(--faint)" }}>
                              {" "}
                              {"·".repeat(tr.charge)}
                            </span>
                          </span>
                          <div className="flex gap-1">
                            {([0, 1, 2, 3] as const).map((n) => (
                              <button
                                key={n}
                                onClick={() => {
                                  if (!writable) return;
                                  const next = { ...p.touches };
                                  if (n === 0) delete next[tr.id];
                                  else next[tr.id] = n as Dose;
                                  setField("touches", next);
                                }}
                                disabled={!writable}
                                className="chip a-seg px-1.5 py-0.5 text-[10px]"
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  color:
                                    dose === n
                                      ? n
                                        ? "var(--alarm-amyg)"
                                        : "var(--ink)"
                                      : "var(--faint)",
                                  borderColor:
                                    dose === n && n
                                      ? "var(--alarm-amyg)"
                                      : undefined,
                                  minWidth: 26,
                                }}
                                aria-label={`${tr.label}: ${n ? `${n} of 3` : "not on it"}`}
                              >
                                {n === 0 ? "—" : "·".repeat(n)}
                              </button>
                            ))}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div
                  className="meta mt-3"
                  style={{ color: "var(--alarm-vagal)" }}
                >
                  brakes within reach on it
                </div>
                {circuit.brakes.length === 0 ? (
                  <p
                    className="hand mt-1 text-[13px]"
                    style={{ color: "var(--faint)" }}
                  >
                    no brakes named yet.
                  </p>
                ) : (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {circuit.brakes.map((b) => {
                      const on = p.brakes.includes(b.id);
                      return (
                        <Chip
                          key={b.id}
                          on={on}
                          color="var(--alarm-vagal)"
                          disabled={!writable}
                          title={b.reach}
                          onClick={() =>
                            setField(
                              "brakes",
                              on
                                ? p.brakes.filter((x) => x !== b.id)
                                : [...p.brakes, b.id],
                            )
                          }
                        >
                          {short(b.label, 22)}
                        </Chip>
                      );
                    })}
                  </div>
                )}

                {circuit.defences.length > 0 && (
                  <>
                    <div
                      className="meta mt-3"
                      style={{ color: "var(--alarm-freeze)" }}
                    >
                      what you expect to fire
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {circuit.defences.map((d) => {
                        const on = p.expects.includes(d.id);
                        return (
                          <Chip
                            key={d.id}
                            on={on}
                            color="var(--alarm-freeze)"
                            disabled={!writable}
                            title={REFLEX_WORDS[d.reflex]}
                            onClick={() =>
                              setField(
                                "expects",
                                on
                                  ? p.expects.filter((x) => x !== d.id)
                                  : [...p.expects, d.id],
                              )
                            }
                          >
                            {short(d.label, 22)}
                          </Chip>
                        );
                      })}
                    </div>
                  </>
                )}

                <div className="meta mt-3" style={{ color: "var(--faint)" }}>
                  stones it is bound to
                </div>
                {p.stones.length > 0 && (
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {p.stones.map((id) => {
                      const n = nodes.get(id);
                      return (
                        <li
                          key={id}
                          className="chip flex items-center gap-1.5 px-2.5 py-1"
                        >
                          <Link
                            href={`/catalogue?id=${encodeURIComponent(id)}`}
                            className="hand text-[13px] leading-none"
                            style={{
                              color: n
                                ? `var(--kind-${n.kind})`
                                : "var(--muted)",
                            }}
                          >
                            {short(n?.label ?? id, 26)}
                          </Link>
                          {writable && (
                            <button
                              onClick={() =>
                                setField(
                                  "stones",
                                  p.stones.filter((s) => s !== id),
                                )
                              }
                              className="meta"
                              style={{ color: "var(--faint)" }}
                              aria-label={`Unbind ${n?.label ?? id}`}
                            >
                              ×
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {writable && (
                  <div className="relative">
                    <input
                      value={stoneQuery}
                      onChange={(e) => setStoneQuery(e.target.value)}
                      placeholder="bind a stone from the garden"
                      className="search mt-1.5 w-full px-2.5 py-1.5 text-[12.5px]"
                      autoComplete="off"
                    />
                    {stoneResults.length > 0 && (
                      <ul
                        className="panel sketched relative mt-1.5 p-1.5"
                        style={{ borderRadius: 3 }}
                      >
                        <Sketch seed="alarm-stones" draw />
                        {stoneResults.map((n) => (
                          <li key={n.id}>
                            <button
                              onClick={() => {
                                setField(
                                  "stones",
                                  [...p.stones, n.id].slice(0, 40),
                                );
                                setStoneQuery("");
                              }}
                              className="a-row flex w-full items-baseline gap-2 rounded px-1.5 py-0.5 text-left"
                            >
                              <span
                                className="meta shrink-0"
                                style={{ color: `var(--kind-${n.kind})` }}
                              >
                                {KIND_LABEL[n.kind] ?? n.kind}
                              </span>
                              <span
                                className="hand min-w-0 flex-1 truncate text-[14px]"
                                style={{ color: "var(--ink)" }}
                              >
                                {n.label}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <label
                  className="meta mt-3 block"
                  style={{ color: "var(--faint)" }}
                  htmlFor="a-note"
                >
                  note
                </label>
                <textarea
                  id="a-note"
                  value={p.note}
                  onChange={(e) => setField("note", e.target.value)}
                  readOnly={!writable}
                  rows={2}
                  maxLength={20_000}
                  placeholder="what you know already"
                  className="search hand mt-1 w-full resize-y px-3 py-2 text-[14.5px] leading-[1.3]"
                />

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {writable && (dirty || draft?.fresh) && (
                    <button
                      onClick={keepDraft}
                      className="chip px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--accent)",
                        borderColor: "var(--accent)",
                      }}
                    >
                      {draft?.fresh ? "ask it" : "keep"}
                    </button>
                  )}
                  {writable && !draft?.fresh && chosen && (
                    <button
                      onClick={() =>
                        sure ? remove(chosen.slug) : setSure(true)
                      }
                      className="chip px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: sure ? "var(--accent)" : "var(--faint)",
                        borderColor: sure ? "var(--accent)" : undefined,
                      }}
                    >
                      {sure ? "yes, take it back" : "take it back"}
                    </button>
                  )}
                </div>

                {!draft?.fresh && chosen && (
                  <div className="mt-3">
                    <div className="meta" style={{ color: "var(--faint)" }}>
                      after the fact · how did it go?
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {WENTS.map((w) => (
                        <Chip
                          key={w}
                          on={p.went === w}
                          color={
                            w === "vigilant"
                              ? "var(--alarm-symp)"
                              : w === "calm"
                                ? "var(--alarm-vagal)"
                                : "var(--ink)"
                          }
                          disabled={!writable}
                          onClick={() => sayWent(p.went === w ? null : w)}
                        >
                          {w}
                        </Chip>
                      ))}
                    </div>
                    <p
                      className="meta mt-2"
                      style={{ color: "var(--faint)", textTransform: "none" }}
                    >
                      asked {dayOf(chosen.asked)}
                      {chosen.went
                        ? ` · said ${chosen.went} ${dayOf(chosen.wentDay)}`
                        : ""}{" "}
                      · {chosen.slug}.md
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* the reading */}
            <section
              className="panel sketched relative p-4"
              style={{ borderRadius: 3 }}
              aria-label="The reading"
            >
              <Sketch seed="alarm-reading" draw />
              <div className="meta" style={{ color: "var(--faint)" }}>
                the reading
              </div>
              <ul className="mt-2">
                {words.map((w, i) => (
                  <li
                    key={i}
                    className="text-[13px] leading-[1.55]"
                    style={{ color: "var(--ink)" }}
                  >
                    {w}
                  </li>
                ))}
              </ul>
              {writable && circuit.triggers.length === 0 && !showSpecimen && (
                <div className="mt-3">
                  <Chip onClick={() => setShowSpecimen(true)}>
                    show the specimen · a synthetic circuit
                  </Chip>
                </div>
              )}
              {payload && !writable && !specimen && (
                <p
                  className="hand mt-2 text-[13px]"
                  style={{ color: "var(--faint)" }}
                >
                  read-only here.
                </p>
              )}
            </section>

            {/* the load: as you are today */}
            <section aria-label="As you are today">
              <div
                className="meta flex items-baseline justify-between"
                style={{ color: "var(--faint)" }}
              >
                <span>
                  as you are today
                  {circuit.loadDay ? ` · set ${dayOf(circuit.loadDay)}` : ""}
                </span>
                <span style={{ color: "var(--alarm-pfc)" }}>
                  ceiling {Math.round(ceiling)}
                </span>
              </div>
              <ul className="mt-1 flex flex-col gap-1">
                {(
                  [
                    ["sleep", "sleep debt", "tired = twitchy"],
                    ["stress", "chronic stress", "allostatic wear"],
                    ["caffeine", "caffeine", "tonic sympathetic drive"],
                    ["tone", "vagal tone", "recovery capacity"],
                  ] as [keyof Load, string, string][]
                ).map(([k, label, hint]) => (
                  <li key={k} className="flex items-center gap-2">
                    <span
                      className="hand w-[7.5rem] shrink-0 text-[13.5px]"
                      style={{ color: "var(--ink)" }}
                    >
                      {label}
                      <span
                        className="text-[11.5px]"
                        style={{ color: "var(--faint)" }}
                      >
                        {" "}
                        · {hint}
                      </span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={load[k]}
                      onChange={(e) => dialUp(k, +e.target.value)}
                      onPointerUp={dialDone}
                      onKeyUp={dialDone}
                      onBlur={dialDone}
                      disabled={!writable}
                      className="a-dial min-w-0 flex-1"
                      aria-label={label}
                    />
                    <span
                      className="meta w-7 text-right"
                      style={{ color: "var(--muted)", textTransform: "none" }}
                    >
                      {load[k]}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* the circuit */}
            <section aria-label="Your circuit">
              <button
                onClick={() => setCircuitOpen((o) => !o)}
                className="meta flex items-center gap-1.5"
                style={{ color: "var(--faint)" }}
              >
                <span
                  style={{
                    display: "inline-block",
                    transform: circuitOpen ? "rotate(90deg)" : "none",
                    transition: "transform 180ms cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  ›
                </span>
                your circuit · {circuit.triggers.length} triggers ·{" "}
                {circuit.defences.length} defences · {circuit.brakes.length}{" "}
                brakes
              </button>
              {circuitOpen && (
                <div
                  className="panel sketched relative mt-2 p-3"
                  style={{ borderRadius: 3 }}
                >
                  <Sketch seed="alarm-circuit" draw />
                  <div className="meta" style={{ color: "var(--alarm-amyg)" }}>
                    triggers{" "}
                    <span style={{ color: "var(--faint)" }}>
                      · what sets it off, and how hard
                    </span>
                  </div>
                  <ul className="mt-1">
                    {circuit.triggers.map((tr) => (
                      <Named
                        key={tr.id}
                        label={editLabel(tr.label, (v) =>
                          putCircuit({
                            ...circuit,
                            triggers: circuit.triggers.map((x) =>
                              x.id === tr.id ? { ...x, label: v } : x,
                            ),
                          }),
                        )}
                        onRemove={
                          writable
                            ? () =>
                                putCircuit({
                                  ...circuit,
                                  triggers: circuit.triggers.filter(
                                    (x) => x.id !== tr.id,
                                  ),
                                })
                            : undefined
                        }
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          {([1, 2, 3] as Charge[]).map((n) => (
                            <Chip
                              key={n}
                              on={tr.charge === n}
                              color="var(--alarm-amyg)"
                              disabled={!writable}
                              onClick={() =>
                                putCircuit({
                                  ...circuit,
                                  triggers: circuit.triggers.map((x) =>
                                    x.id === tr.id ? { ...x, charge: n } : x,
                                  ),
                                })
                              }
                            >
                              {"·".repeat(n)}
                            </Chip>
                          ))}
                          <input
                            defaultValue={tr.signs}
                            key={`${tr.id}-${tr.signs}`}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v !== tr.signs)
                                putCircuit({
                                  ...circuit,
                                  triggers: circuit.triggers.map((x) =>
                                    x.id === tr.id ? { ...x, signs: v } : x,
                                  ),
                                });
                            }}
                            onKeyDown={(e) =>
                              e.key === "Enter" &&
                              (e.target as HTMLInputElement).blur()
                            }
                            readOnly={!writable}
                            placeholder="first sign in the body"
                            className="search hand min-w-0 flex-1 px-2 py-0.5 text-[12.5px]"
                          />
                        </div>
                        {circuit.defences.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span
                              className="meta"
                              style={{
                                color: "var(--faint)",
                                textTransform: "none",
                              }}
                            >
                              usually pulls
                            </span>
                            {circuit.defences.map((d) => {
                              const on = tr.pulls.includes(d.id);
                              return (
                                <Chip
                                  key={d.id}
                                  on={on}
                                  color="var(--alarm-freeze)"
                                  disabled={!writable}
                                  onClick={() =>
                                    putCircuit({
                                      ...circuit,
                                      triggers: circuit.triggers.map((x) =>
                                        x.id === tr.id
                                          ? {
                                              ...x,
                                              pulls: on
                                                ? x.pulls.filter(
                                                    (y) => y !== d.id,
                                                  )
                                                : [...x.pulls, d.id],
                                            }
                                          : x,
                                      ),
                                    })
                                  }
                                >
                                  {short(d.label, 18)}
                                </Chip>
                              );
                            })}
                          </div>
                        )}
                      </Named>
                    ))}
                  </ul>
                  {writable && (
                    <input
                      value={newTrigger}
                      onChange={(e) => setNewTrigger(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" || !newTrigger.trim()) return;
                        const label = newTrigger.trim();
                        const id = idOf(
                          label,
                          new Set(
                            [
                              ...circuit.triggers,
                              ...circuit.defences,
                              ...circuit.brakes,
                            ].map((x) => x.id),
                          ),
                        );
                        putCircuit({
                          ...circuit,
                          triggers: [
                            ...circuit.triggers,
                            {
                              id,
                              label,
                              charge: 2,
                              pulls: [],
                              signs: "",
                              note: "",
                            },
                          ],
                        });
                        setNewTrigger("");
                      }}
                      placeholder="a trigger you know · enter"
                      className="search hand mt-2 w-full px-2 py-1 text-[14px]"
                    />
                  )}

                  <div
                    className="meta mt-4"
                    style={{ color: "var(--alarm-freeze)" }}
                  >
                    defences{" "}
                    <span style={{ color: "var(--faint)" }}>
                      · what fires on its own, and its shape
                    </span>
                  </div>
                  <ul className="mt-1">
                    {circuit.defences.map((d) => (
                      <Named
                        key={d.id}
                        label={editLabel(d.label, (v) =>
                          putCircuit({
                            ...circuit,
                            defences: circuit.defences.map((x) =>
                              x.id === d.id ? { ...x, label: v } : x,
                            ),
                          }),
                        )}
                        onRemove={
                          writable
                            ? () =>
                                putCircuit({
                                  ...circuit,
                                  defences: circuit.defences.filter(
                                    (x) => x.id !== d.id,
                                  ),
                                  triggers: circuit.triggers.map((tr) => ({
                                    ...tr,
                                    pulls: tr.pulls.filter((y) => y !== d.id),
                                  })),
                                })
                            : undefined
                        }
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          {REFLEXES.map((r) => (
                            <Chip
                              key={r}
                              on={d.reflex === r}
                              color="var(--alarm-freeze)"
                              disabled={!writable}
                              onClick={() =>
                                putCircuit({
                                  ...circuit,
                                  defences: circuit.defences.map((x) =>
                                    x.id === d.id ? { ...x, reflex: r } : x,
                                  ),
                                })
                              }
                            >
                              {r}
                            </Chip>
                          ))}
                          <input
                            defaultValue={d.cost}
                            key={`${d.id}-${d.cost}`}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v !== d.cost)
                                putCircuit({
                                  ...circuit,
                                  defences: circuit.defences.map((x) =>
                                    x.id === d.id ? { ...x, cost: v } : x,
                                  ),
                                });
                            }}
                            onKeyDown={(e) =>
                              e.key === "Enter" &&
                              (e.target as HTMLInputElement).blur()
                            }
                            readOnly={!writable}
                            placeholder="what it costs"
                            className="search hand min-w-0 flex-1 px-2 py-0.5 text-[12.5px]"
                          />
                        </div>
                      </Named>
                    ))}
                  </ul>
                  {writable && (
                    <input
                      value={newDefence}
                      onChange={(e) => setNewDefence(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" || !newDefence.trim()) return;
                        const label = newDefence.trim();
                        const id = idOf(
                          label,
                          new Set(
                            [
                              ...circuit.triggers,
                              ...circuit.defences,
                              ...circuit.brakes,
                            ].map((x) => x.id),
                          ),
                        );
                        putCircuit({
                          ...circuit,
                          defences: [
                            ...circuit.defences,
                            { id, label, reflex: "flight", cost: "", note: "" },
                          ],
                        });
                        setNewDefence("");
                      }}
                      placeholder="a defence you know · enter"
                      className="search hand mt-2 w-full px-2 py-1 text-[14px]"
                    />
                  )}

                  <div
                    className="meta mt-4"
                    style={{ color: "var(--alarm-vagal)" }}
                  >
                    brakes{" "}
                    <span style={{ color: "var(--faint)" }}>
                      · what brings it down, and how fast
                    </span>
                  </div>
                  <ul className="mt-1">
                    {circuit.brakes.map((b) => (
                      <Named
                        key={b.id}
                        label={editLabel(b.label, (v) =>
                          putCircuit({
                            ...circuit,
                            brakes: circuit.brakes.map((x) =>
                              x.id === b.id ? { ...x, label: v } : x,
                            ),
                          }),
                        )}
                        onRemove={
                          writable
                            ? () =>
                                putCircuit({
                                  ...circuit,
                                  brakes: circuit.brakes.filter(
                                    (x) => x.id !== b.id,
                                  ),
                                })
                            : undefined
                        }
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          {REACHES.map((r) => (
                            <Chip
                              key={r}
                              on={b.reach === r}
                              color="var(--alarm-vagal)"
                              disabled={!writable}
                              onClick={() =>
                                putCircuit({
                                  ...circuit,
                                  brakes: circuit.brakes.map((x) =>
                                    x.id === b.id ? { ...x, reach: r } : x,
                                  ),
                                })
                              }
                            >
                              {r}
                            </Chip>
                          ))}
                        </div>
                      </Named>
                    ))}
                  </ul>
                  {writable && (
                    <input
                      value={newBrake}
                      onChange={(e) => setNewBrake(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" || !newBrake.trim()) return;
                        const label = newBrake.trim();
                        const id = idOf(
                          label,
                          new Set(
                            [
                              ...circuit.triggers,
                              ...circuit.defences,
                              ...circuit.brakes,
                            ].map((x) => x.id),
                          ),
                        );
                        putCircuit({
                          ...circuit,
                          brakes: [
                            ...circuit.brakes,
                            { id, label, reach: "hours", note: "" },
                          ],
                        });
                        setNewBrake("");
                      }}
                      placeholder="a brake you know · enter"
                      className="search hand mt-2 w-full px-2 py-1 text-[14px]"
                    />
                  )}
                  <p
                    className="hand mt-3 text-[12.5px] leading-[1.35]"
                    style={{ color: "var(--faint)" }}
                  >
                    kept in circuit.json. a trigger&rsquo;s dots are how hard it
                    hits; a defence&rsquo;s shape is fight, flight, freeze or
                    fawn; a brake&rsquo;s reach is how fast it works.
                  </p>
                </div>
              )}
            </section>

            {/* pathways asked */}
            {pathways.length > 0 && (
              <section aria-label="Pathways asked">
                <div className="meta" style={{ color: "var(--faint)" }}>
                  pathways asked · {pathways.length}
                </div>
                <ul className="mt-1">
                  {pathways.map((x) => (
                    <li key={x.slug}>
                      <Row x={x} selected={selected} onPick={setSelected} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <p
              className="hand text-[13.5px] leading-[1.35]"
              style={{ color: "var(--faint)" }}
            >
              how it is read: {REST_WORDS} a touched trigger bends the
              pathway&rsquo;s line up by how hard it hits times how much of it
              is on the path; a brake within reach bends it down by how fast it
              works, with less room the more loaded you are today. the line is
              your marks added up and nothing else. the run is the
              sandbox&rsquo;s physics, unchanged: the low road wins the race,
              sleep debt and stress lower the brake&rsquo;s ceiling, hold the
              alarm too high and it flips to freeze. nothing here scores a
              person.
              {!specimen && payload?.dir
                ? ` files at ${shortHome(payload.dir)}.`
                : ""}
            </p>
            <p
              className="meta"
              style={{ color: "var(--faint)", textTransform: "none" }}
            >
              / find · n ask · space poke · b brake · r reset · esc
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
