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
import type { Garden, GardenNode } from "@/lib/garden";
import { buildFlow, type Flow as FlowGraph } from "@/lib/flow";
import {
  dateInputs,
  dayKey,
  dayOf,
  emptyCourse,
  inputsOf,
  isBlank,
  putQuestion,
  readings,
  setMark,
  tally,
  timeX,
  type Course as CourseFile,
  type Input,
  type Mark,
} from "@/lib/course";
import type { History } from "@/lib/course-history";
import {
  rand,
  ribbon,
  roughEllipse,
  roughRect,
  seedOf,
  stroke,
} from "@/lib/hand";
import { KIND_LABEL, LINK_LABEL, STAGE_LABEL } from "@/lib/palette";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

/** The sheet's frame. */
const W = 900;
const H = 484;
/** The question's line, across the top. */
const QY = 74;
/** The field the inputs are laid across, and where the belief is now. */
const FX0 = 170;
const FX1 = 780;
const END_X = 802;
/** Where the belief starts — on the paddle — and its height at the first input. */
const LAUNCH: Pt = [110, 392];
const Y0 = 250;
const Y_MIN = 100;
const Y_MAX = 386;
const BH = 22;
/** The months, and under them the days the belief was steered. */
const TICK_Y = 428;
const STEER_Y = 462;
/** Above this many inputs, labels show only on marked, chosen or hovered bricks. */
const LABELS_UP_TO = 22;

type Pt = [number, number];
type Brick = Input & { i: number; x: number; y: number; mark: Mark | null };
type Hover =
  | { kind: "brick"; id: string; x: number; y: number }
  | { kind: "steer"; day: string; x: number; y: number };
type Kin = {
  id: string;
  label: string;
  kind: string;
  sim: number;
  shared: string[];
};
type HoverSeed = { kind: "brick"; id: string } | { kind: "steer"; day: string };
type Payload = { courses: CourseFile[]; writable: boolean; dir: string | null };

const REST =
  "click an input and say, after the fact, which way it bent you. the course is your marks, drawn; nothing here is a grade.";

/** What counts as the reader's own writing about ideas, for choosing a first belief. */
const OWN = new Set([
  "note",
  "project",
  "user",
  "feedback",
  "concept",
  "reference",
]);

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
const today = () => new Date().toISOString().slice(0, 10);
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

const upsert = (cs: CourseFile[], c: CourseFile) => {
  const i = cs.findIndex((x) => x.belief === c.belief);
  return i < 0 ? [...cs, c] : cs.map((x, j) => (j === i ? c : x));
};

/** The most recent day anything was said about a course. */
const lastSaid = (c: CourseFile) =>
  Object.values(c.marks).reduce((m, x) => (x.day > m ? x.day : m), c.asked);

/**
 * The course. A stone is the belief; what flowed into it are the inputs,
 * laid across the sheet in the order they came — dated, where the belief's
 * own history says, by the day each first appeared in it; the question it is
 * trying to get right runs along the top. The reader says which way each
 * input bent the belief — toward the question or away — and the pen draws
 * the course those marks imply, launched from the paddle and pointed
 * wherever the last bend left it. The days the belief was steered are
 * ticked underneath. The desk reads the marks and the dates back and never
 * grades them. The marks and the question are kept as one file per belief.
 */
export default function Course() {
  const [garden, setGarden] = useState<Garden | null>(null);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [courses, setCourses] = useState<CourseFile[]>([]);
  const [belief, setBelief] = useState<string | null>(null);
  const [walk, setWalk] = useState<string[]>([]);
  const [history, setHistory] = useState<History | null>(null);
  const [dating, setDating] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [cap, setCap] = useState<string | null>(null);
  const [qDraft, setQDraft] = useState("");
  const [trailOpen, setTrailOpen] = useState(false);
  const [steerOpen, setSteerOpen] = useState(false);
  const [arriving, setArriving] = useState<Kin[] | null>(null);
  const [kept, setKept] = useState<"idle" | "saving" | "kept" | "error">(
    "idle",
  );
  const [reduce, setReduce] = useState(false);
  const [theme, setTheme] = useTheme();

  const sheet = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const coursesRef = useRef<CourseFile[]>([]);
  const walkRef = useRef<string[]>([]);
  const capTimer = useRef<number | null>(null);
  const keptTimer = useRef<number | null>(null);
  coursesRef.current = courses;
  walkRef.current = walk;

  // ── data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/garden", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((g: Garden | null) => g && setGarden(g));
    fetch("/api/course", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Payload | null) => {
        if (!p) return;
        setPayload(p);
        setCourses(p.courses);
      });
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onMq = () => setReduce(mq.matches);
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  const nodes = useMemo(() => {
    const m = new Map<string, GardenNode>();
    for (const n of garden?.nodes ?? []) m.set(n.id, n);
    return m;
  }, [garden]);

  const flow: FlowGraph | null = useMemo(
    () => (garden ? buildFlow(garden.links) : null),
    [garden],
  );

  /** Put a belief on the sheet, and remember the way here. */
  const go = useCallback((id: string) => {
    setWalk((w) => {
      const i = w.indexOf(id);
      return i >= 0 ? w.slice(0, i + 1) : [...w, id];
    });
    setBelief(id);
  }, []);

  const back = useCallback(() => {
    const w = walkRef.current;
    if (w.length < 2) return;
    setWalk(w.slice(0, -1));
    setBelief(w[w.length - 2]);
  }, []);

  // The first belief: the one asked for, else the one last steered here,
  // else the reader's own stone that the most has flowed into.
  useEffect(() => {
    if (!garden || !flow || !payload || belief) return;
    const asked = new URLSearchParams(window.location.search).get("id");
    if (asked && nodes.has(asked)) {
      go(asked);
      return;
    }
    const steered = [...payload.courses]
      .filter((c) => nodes.has(c.belief) && !isBlank(c))
      .sort((a, b) =>
        lastSaid(a) < lastSaid(b) ? 1 : lastSaid(a) > lastSaid(b) ? -1 : 0,
      )[0];
    if (steered) {
      go(steered.belief);
      return;
    }
    let best: string | null = null;
    let most = -1;
    for (const n of garden.nodes) {
      if (!OWN.has(n.kind)) continue;
      const k = new Set((flow.into.get(n.id) ?? []).map((a) => a.from)).size;
      if (k > most) {
        most = k;
        best = n.id;
      }
    }
    if (best) go(best);
  }, [garden, flow, payload, belief, nodes, go]);

  // What the belief's own file remembers: the days it was steered, and when
  // each input first appeared in it.
  useEffect(() => {
    setHistory(null);
    if (!belief || !garden) return;
    const ctl = new AbortController();
    setDating(true);
    fetch(`/api/course?belief=${encodeURIComponent(belief)}`, {
      cache: "no-store",
      signal: ctl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((h: History | null) => {
        if (h) setHistory(h);
        setDating(false);
      })
      .catch(() => setDating(false));
    return () => ctl.abort();
  }, [belief, garden]);

  const beliefNode = belief ? nodes.get(belief) : undefined;
  useEffect(() => {
    putOnDesk(
      beliefNode
        ? { kind: beliefNode.kind, id: beliefNode.id, label: beliefNode.label }
        : null,
    );
    return () => putOnDesk(null);
  }, [beliefNode]);
  const course = useMemo(
    () =>
      belief
        ? (courses.find((c) => c.belief === belief) ?? emptyCourse(belief))
        : null,
    [courses, belief],
  );
  const inputs = useMemo(
    () =>
      flow && belief
        ? dateInputs(
            inputsOf(flow, nodes, belief),
            history?.arrivals ?? {},
            nodes,
          )
        : [],
    [flow, nodes, belief, history],
  );
  const t = useMemo(
    () =>
      tally(
        inputs,
        course?.marks ?? {},
        nodes,
        beliefNode,
        history?.rewrites ?? [],
      ),
    [inputs, course, nodes, beliefNode, history],
  );
  const words = useMemo(
    () => (course ? readings(t, course, beliefNode) : []),
    [t, course, beliefNode],
  );

  // The belief in the address, so it can be come back to.
  useEffect(() => {
    if (!belief) return;
    const url = new URL(window.location.href);
    url.searchParams.set("id", belief);
    window.history.replaceState(null, "", url);
    setSelected(null);
    setTrailOpen(false);
    setSteerOpen(false);
  }, [belief]);

  useEffect(() => {
    setQDraft(course?.question ?? "");
  }, [course?.question, belief]);

  // What has arrived lately that speaks the belief's words and is not yet
  // threaded to it — the field repopulating. Read off the distribution's
  // model; nothing is written and nothing leaves the machine.
  useEffect(() => {
    setArriving(null);
    if (!beliefNode || !flow || payload?.writable === false) return;
    const text =
      `${beliefNode.description ?? ""}\n${beliefNode.body ?? ""}`.trim();
    if (text.split(/\s+/).length < 8) return;
    const have = new Set(
      (flow.into.get(beliefNode.id) ?? []).map((a) => a.from),
    );
    const ctl = new AbortController();
    fetch("/api/taste", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: beliefNode.label,
        text: text.slice(0, 20_000),
      }),
      signal: ctl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (!res?.reading?.measures?.words) return;
        const w = res.reading.measures.words;
        const p = w.d30 ?? w.d90 ?? w.all;
        if (!p?.kin) return;
        setArriving(
          (p.kin as Kin[])
            .filter((k) => k.id !== beliefNode.id && !have.has(k.id))
            .slice(0, 6),
        );
      })
      .catch(() => {});
    return () => ctl.abort();
  }, [beliefNode, flow, payload?.writable]);

  // ── saying and keeping ──────────────────────────────────────────────────
  const say = useCallback((msg: string) => {
    if (capTimer.current) window.clearTimeout(capTimer.current);
    setCap(msg);
    capTimer.current = window.setTimeout(() => setCap(null), 2400);
  }, []);

  const save = useCallback(
    (next: CourseFile) => {
      const prev = coursesRef.current;
      setCourses(upsert(prev, next));
      setKept("saving");
      fetch("/api/course", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      })
        .then(async (r) => {
          if (!r.ok) throw new Error(String(r.status));
          const back = (await r.json()) as CourseFile & { gone?: boolean };
          setCourses((cs) =>
            back.gone
              ? cs.filter((c) => c.belief !== next.belief)
              : upsert(cs, back),
          );
          setKept("kept");
          if (keptTimer.current) window.clearTimeout(keptTimer.current);
          keptTimer.current = window.setTimeout(() => setKept("idle"), 1600);
        })
        .catch(() => {
          setCourses(prev);
          setKept("error");
          say("could not keep it — is the vault there?");
        });
    },
    [say],
  );

  const mark = useCallback(
    (id: string, m: Mark | null) => {
      if (!course || !payload?.writable) return;
      const cur = course.marks[id]?.mark ?? null;
      const next = cur === m ? null : m;
      save(setMark(course, id, next, today()));
      const label = short(nodes.get(id)?.label ?? id, 40).toLowerCase();
      say(
        next === "toward"
          ? `${label} — course corrected.`
          : next === "away"
            ? `${label} — drift.`
            : `${label} — unweighed again.`,
      );
    },
    [course, payload?.writable, save, say, nodes],
  );

  const put = useCallback(() => {
    if (!course || !payload?.writable) return;
    const next = putQuestion(course, qDraft, today());
    if (next === course) return;
    save(next);
    say(
      next.question ? "the question, as now put." : "the question, taken back.",
    );
  }, [course, payload?.writable, qDraft, save, say]);

  // ── keys ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
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
      if (e.key === "[") {
        e.preventDefault();
        back();
        return;
      }
      if (e.key === "Escape") {
        setSelected(null);
        return;
      }
      if (!inputs.length) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const i = selected ? inputs.findIndex((x) => x.id === selected) : -1;
        const n = inputs.length;
        const j =
          e.key === "ArrowRight"
            ? i < 0
              ? 0
              : (i + 1) % n
            : i < 0
              ? n - 1
              : (i - 1 + n) % n;
        setSelected(inputs[j].id);
        return;
      }
      if (selected && (e.key === "t" || e.key === "a" || e.key === "u")) {
        e.preventDefault();
        mark(
          selected,
          e.key === "t" ? "toward" : e.key === "a" ? "away" : null,
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inputs, selected, mark, back]);

  // ── the scene ───────────────────────────────────────────────────────────
  const scene = useMemo(() => {
    if (!course) return null;
    const n = inputs.length;
    const step = clamp(210 / Math.max(n, 1), 8, 32);
    const slot = (FX1 - FX0) / Math.max(n, 1);
    const bw = clamp(slot - 8, 22, 96);
    let y = Y0;
    const pts: Pt[] = [LAUNCH];
    const bricks: Brick[] = inputs.map((inp, i) => {
      const x = FX0 + (i + 0.5) * slot;
      const m = course.marks[inp.id]?.mark ?? null;
      const b: Brick = { ...inp, i, x, y, mark: m };
      pts.push([x, y]);
      if (m === "toward") y = Math.max(Y_MIN, y - step);
      else if (m === "away") y = Math.min(Y_MAX, y + step);
      return b;
    });
    pts.push([END_X, y]);
    const seed = seedOf(`course:${course.belief}`);
    const r = rand(seed);
    let line = "";
    for (let i = 0; i < pts.length - 1; i++)
      line += stroke(pts[i], pts[i + 1], r, 1.0, 0);
    const ink = ribbon(line, 1.7, seed);
    // where it is pointed: the way the last bend left it
    const a = pts[pts.length - 2];
    const b = pts[pts.length - 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ux = (b[0] - a[0]) / len;
    const uy = (b[1] - a[1]) / len;
    const tip: Pt = [b[0] + ux * 34, b[1] + uy * 34];
    const head = (ang: number) => {
      const s: Pt = [
        tip[0] - (ux * Math.cos(ang) - uy * Math.sin(ang)) * 9,
        tip[1] - (ux * Math.sin(ang) + uy * Math.cos(ang)) * 9,
      ];
      return ribbon(stroke(s, tip, r, 0.5, 0), 1.3, seed + 3);
    };
    const heading =
      ribbon(
        stroke([b[0] + ux * 11, b[1] + uy * 11], tip, r, 0.6, 0),
        1.4,
        seed + 2,
      ) +
      head(0.5) +
      head(-0.5);
    // the ticks: where the month changes, and the undated
    const ticks: { x: number; label: string }[] = [];
    let last = "";
    for (const brick of bricks) {
      const d = brick.date ? new Date(brick.date) : null;
      const key = d ? `${d.getFullYear()}-${d.getMonth()}` : "undated";
      if (key === last) continue;
      last = key;
      ticks.push({
        x: brick.x,
        label: d
          ? `${MON[d.getMonth()]}${d.getFullYear() === new Date().getFullYear() ? "" : ` ${d.getFullYear()}`}`
          : "undated",
      });
    }
    // the days it was steered, placed among the inputs by time
    const anchors = bricks
      .filter((k) => k.date)
      .map((k) => ({ date: dayKey(k.date!), x: k.x }));
    const steers = (history?.rewrites ?? []).map((day) => ({
      day,
      x: timeX(anchors, day, FX0, END_X, today()),
    }));
    // Labels: each takes the first free place among near and far, above and
    // below, so a bent course does not pile its names on one another.
    const cw = 6.1;
    const maxChars = clamp(
      Math.floor((4 * (FX1 - FX0)) / Math.max(n, 1) / cw),
      8,
      26,
    );
    const taken: [number, number, number, number][] = bricks.map((k) => [
      k.x - bw / 2 - 2,
      k.y - BH / 2 - 2,
      k.x + bw / 2 + 2,
      k.y + BH / 2 + 2,
    ]);
    const labels = new Map<string, { x: number; y: number; text: string }>();
    const slots = [-7, BH + 15, -21, BH + 29, -35, BH + 43];
    for (const brick of bricks) {
      const text = short(nodes.get(brick.id)?.label ?? brick.id, maxChars);
      const w = text.length * cw;
      for (const dy of slots) {
        const ly = brick.y - BH / 2 + dy;
        const box: [number, number, number, number] = [
          brick.x - w / 2 - 3,
          ly - 11,
          brick.x + w / 2 + 3,
          ly + 3,
        ];
        const clear = !taken.some(
          (k) =>
            box[0] < k[2] && box[2] > k[0] && box[1] < k[3] && box[3] > k[1],
        );
        if (clear) {
          taken.push(box);
          labels.set(brick.id, { x: brick.x, y: ly, text });
          break;
        }
      }
    }
    return {
      bricks,
      pts,
      line,
      ink,
      end: b,
      heading,
      ticks,
      steers,
      bw,
      seed,
      labels,
    };
  }, [course, inputs, nodes, history]);

  const showCard = (e: ReactPointerEvent, h: HoverSeed) => {
    const box = sheet.current!.getBoundingClientRect();
    setHover({
      ...h,
      x: e.clientX - box.left,
      y: e.clientY - box.top,
    } as Hover);
  };
  const hoverNode = hover?.kind === "brick" ? nodes.get(hover.id) : undefined;
  const hoverInput =
    hover?.kind === "brick" ? inputs.find((i) => i.id === hover.id) : undefined;
  const selectedInput = selected
    ? inputs.find((i) => i.id === selected)
    : undefined;
  const selectedNode = selected ? nodes.get(selected) : undefined;
  const selectedBrick = selected
    ? scene?.bricks.find((b) => b.id === selected)
    : undefined;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !garden) return [];
    return garden.nodes
      .filter(
        (n) =>
          n.kind !== "ghost" &&
          n.id !== belief &&
          n.label.toLowerCase().includes(q),
      )
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 8);
  }, [query, garden, belief]);

  const keptCourses = useMemo(
    () =>
      courses
        .filter((c) => !isBlank(c) && nodes.has(c.belief))
        .sort((a, b) =>
          lastSaid(a) < lastSaid(b) ? 1 : lastSaid(a) > lastSaid(b) ? -1 : 0,
        ),
    [courses, nodes],
  );

  const writable = payload?.writable ?? false;
  const colourOf = (m: Mark | null) =>
    m === "toward"
      ? "var(--course-toward)"
      : m === "away"
        ? "var(--course-away)"
        : "var(--faint)";
  const when = (i: Input | undefined) =>
    !i || !i.date
      ? "undated"
      : `${i.dated === "arrived" ? "arrived" : "changed"} ${dayOf(i.date)}`;

  const Stone = ({
    id,
    onPick,
  }: {
    id: string;
    onPick: (id: string) => void;
  }) => {
    const n = nodes.get(id);
    return (
      <button
        onClick={() => onPick(id)}
        className="b-row flex w-full items-baseline gap-2 py-0.5 text-left"
      >
        <span
          aria-hidden
          className="shrink-0"
          style={{
            width: 6,
            height: 6,
            borderRadius: 99,
            background: `var(--kind-${n?.kind ?? "note"})`,
          }}
        />
        <span
          className="min-w-0 flex-1 overflow-hidden text-[12.5px] text-ellipsis whitespace-nowrap"
          style={{ color: "var(--muted)" }}
        >
          {n?.label ?? id}
        </span>
      </button>
    );
  };

  /** The two marks as chips, for one input. */
  const Marks = ({ id, size = "sm" }: { id: string; size?: "sm" | "lg" }) => {
    const cur = course?.marks[id]?.mark ?? null;
    const pad =
      size === "lg" ? "px-2.5 py-1 text-[10px]" : "px-1.5 py-[2px] text-[9px]";
    return (
      <span className="inline-flex shrink-0 items-center gap-1">
        {(["toward", "away"] as Mark[]).map((m) => (
          <button
            key={m}
            onClick={(e) => {
              e.stopPropagation();
              mark(id, m);
            }}
            disabled={!writable}
            aria-pressed={cur === m}
            title={
              writable
                ? m === "toward"
                  ? "it bent the belief toward the question"
                  : "it bent the belief away from it"
                : "read-only here"
            }
            className={`chip c-mark relative ${pad} tracking-[0.14em] uppercase`}
            style={{
              fontFamily: "var(--font-mono)",
              color: cur === m ? colourOf(m) : "var(--faint)",
              borderColor: cur === m ? colourOf(m) : undefined,
              background:
                cur === m
                  ? `color-mix(in srgb, ${colourOf(m)} 10%, transparent)`
                  : undefined,
              opacity: writable ? 1 : 0.5,
            }}
          >
            {m}
          </button>
        ))}
      </span>
    );
  };

  const status = !payload
    ? ""
    : !writable
      ? "read-only here"
      : kept === "saving"
        ? "keeping"
        : kept === "kept"
          ? "kept"
          : kept === "error"
            ? "not kept"
            : dating
              ? "dating the inputs"
              : payload.dir
                ? shortHome(payload.dir)
                : "";

  return (
    <main className="course scroll-thin relative h-dvh w-full overflow-y-auto">
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
                course
              </div>
              <p
                className="hand mt-1 max-w-[27rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                You don&rsquo;t arrive; you stay pointed. Pick a belief, see
                what hit it in the order it came, and say — after the fact —
                which way each one bent you. The course is drawn from your
                marks.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/course" />
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

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {/* ── the sheet ─────────────────────────────────────────────── */}
          <section
            className="panel sketched rise relative p-2 sm:p-3"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The course"
          >
            <Sketch seed="course-sheet" draw />

            {/* the readout, the walk, and the keeping */}
            <div className="relative z-[2] flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="meta" style={{ color: "var(--muted)" }}>
                  {t.n === 0
                    ? "nothing has hit this"
                    : `weighed ${t.weighed} of ${t.n} · toward ${t.toward} · away ${t.away}`}
                </span>
                {walk.length > 1 && (
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
                    <span className="meta" style={{ color: "var(--faint)" }}>
                      · walked
                    </span>
                    {walk.map((id, i) => (
                      <span
                        key={`${id}-${i}`}
                        className="flex items-baseline gap-1.5"
                      >
                        {i > 0 && (
                          <span
                            className="meta"
                            style={{ color: "var(--faint)" }}
                          >
                            ›
                          </span>
                        )}
                        <button
                          onClick={() => go(id)}
                          disabled={i === walk.length - 1}
                          className="walk-step hand text-[13.5px]"
                          style={{
                            color:
                              i === walk.length - 1
                                ? "var(--ink)"
                                : "var(--muted)",
                          }}
                        >
                          {short(nodes.get(id)?.label ?? id, 24)}
                        </button>
                      </span>
                    ))}
                    <kbd className="meta" style={{ color: "var(--faint)" }}>
                      [ back
                    </kbd>
                  </span>
                )}
              </div>
              <span
                className={`meta ${dating && kept === "idle" ? "breathe" : ""}`}
                style={{
                  color: kept === "error" ? "var(--accent)" : "var(--faint)",
                }}
              >
                {status}
              </span>
            </div>

            {!scene || !garden || !beliefNode ? (
              <div
                className="grid place-items-center"
                style={{ aspectRatio: `${W} / ${H}` }}
              >
                <span
                  className="meta breathe"
                  style={{ color: "var(--faint)" }}
                >
                  {garden && payload && !belief
                    ? "nothing has flowed into anything yet"
                    : "laying the field"}
                </span>
              </div>
            ) : (
              <div ref={sheet} className="relative">
                <svg
                  key={course!.belief}
                  viewBox={`0 0 ${W} ${H}`}
                  preserveAspectRatio="xMidYMid meet"
                  className="course-sheet block w-full select-none"
                  style={{ aspectRatio: `${W} / ${H}` }}
                  role="img"
                  aria-label={`${beliefNode.label}: hit by ${t.n} inputs, ${t.weighed} weighed`}
                >
                  <defs>
                    {!reduce && (
                      <mask
                        id={`cm-${scene.seed}`}
                        maskUnits="userSpaceOnUse"
                        x={0}
                        y={0}
                        width={W}
                        height={H}
                      >
                        <path
                          key={JSON.stringify(course!.marks)}
                          d={scene.line}
                          pathLength={1}
                          fill="none"
                          stroke="#fff"
                          strokeWidth={26}
                          strokeLinecap="round"
                          className="draw"
                        />
                      </mask>
                    )}
                  </defs>

                  {/* the belief, named where the site kept its readout */}
                  <text
                    className="b-mono"
                    x={18}
                    y={24}
                    fontSize={9.5}
                    letterSpacing={1.6}
                    fill="var(--faint)"
                    style={{ textTransform: "uppercase" }}
                  >
                    the belief
                  </text>
                  <circle cx={22} cy={40} r={4.5} fill="var(--accent)" />
                  <text
                    className="b-hand"
                    x={32}
                    y={45}
                    fontSize={15}
                    fill="var(--ink)"
                  >
                    {short(beliefNode.label, 44)}
                  </text>

                  {/* the question, as a horizon, with its earlier phrasings settled under it */}
                  <text
                    className="b-mono"
                    x={850}
                    y={QY - 16}
                    textAnchor="end"
                    fontSize={9.5}
                    letterSpacing={1.6}
                    fill="var(--faint)"
                    style={{ textTransform: "uppercase" }}
                  >
                    the question · approx.
                  </text>
                  <path
                    d={stroke(
                      [FX0 - 10, QY],
                      [850, QY],
                      rand(scene.seed + 7),
                      1.2,
                      0,
                    )}
                    fill="none"
                    stroke="var(--muted)"
                    strokeWidth={1}
                    strokeDasharray="3 5"
                    opacity={0.8}
                  />
                  <g transform={`translate(866 ${QY})`} fill="var(--ink)">
                    {(
                      [
                        [
                          [0, -8],
                          [0, 8],
                        ],
                        [
                          [-8, 0],
                          [8, 0],
                        ],
                        [
                          [-4.5, -4.5],
                          [4.5, 4.5],
                        ],
                        [
                          [-4.5, 4.5],
                          [4.5, -4.5],
                        ],
                      ] as [Pt, Pt][]
                    ).map(([a, b], i) => (
                      <path
                        key={i}
                        d={ribbon(
                          stroke(a, b, rand(scene.seed + 11 + i), 0.5, 0),
                          1.4,
                          scene.seed + i,
                        )}
                      />
                    ))}
                  </g>
                  <text
                    className="b-hand"
                    x={FX0 - 6}
                    y={QY - 9}
                    fontSize={14.5}
                    fill={course!.question ? "var(--ink)" : "var(--faint)"}
                  >
                    {course!.question
                      ? short(course!.question, 78)
                      : "not yet put in words — put it on the desk"}
                  </text>
                  {[...course!.trail]
                    .reverse()
                    .slice(0, 3)
                    .map((tr, k) => (
                      <text
                        key={`${tr.asked}-${k}`}
                        className="b-hand"
                        x={FX0 - 6}
                        y={QY + 15 + k * 13}
                        fontSize={12}
                        fill="var(--muted)"
                        opacity={0.55 - k * 0.14}
                      >
                        {short(tr.question, 70)}
                        {tr.asked
                          ? ` · until ${dayOf(tr.asked === course!.asked ? tr.asked : k === 0 ? course!.asked : [...course!.trail].reverse()[k - 1].asked)}`
                          : ""}
                      </text>
                    ))}

                  {/* the months under the field */}
                  {scene.ticks.map((tk, i) => (
                    <g key={`${tk.label}-${i}`}>
                      <line
                        x1={tk.x}
                        y1={TICK_Y}
                        x2={tk.x}
                        y2={TICK_Y + 6}
                        stroke="var(--rule)"
                        strokeWidth={1}
                      />
                      <text
                        className="b-mono"
                        x={tk.x}
                        y={TICK_Y + 18}
                        textAnchor="middle"
                        fontSize={9}
                        letterSpacing={1.2}
                        fill="var(--faint)"
                        style={{ textTransform: "uppercase" }}
                      >
                        {tk.label}
                      </text>
                    </g>
                  ))}
                  {t.n > 0 && (
                    <text
                      className="b-mono"
                      x={END_X}
                      y={TICK_Y + 18}
                      textAnchor="middle"
                      fontSize={9}
                      letterSpacing={1.2}
                      fill="var(--faint)"
                      style={{ textTransform: "uppercase" }}
                    >
                      now
                    </text>
                  )}

                  {/* the days it was steered: the paddle's touches, on record */}
                  {scene.steers.length > 0 && (
                    <>
                      <text
                        className="b-mono"
                        x={FX0 - 12}
                        y={STEER_Y + 4}
                        textAnchor="end"
                        fontSize={9}
                        letterSpacing={1.2}
                        fill="var(--faint)"
                        style={{ textTransform: "uppercase" }}
                      >
                        steered · {Math.max(0, scene.steers.length - 1)}
                      </text>
                      <line
                        x1={FX0 - 4}
                        y1={STEER_Y}
                        x2={END_X}
                        y2={STEER_Y}
                        stroke="var(--rule)"
                        strokeWidth={1}
                      />
                      {scene.steers.map((s, i) => {
                        const lastOne =
                          i === scene.steers.length - 1 && scene.steers.length > 1;
                        const firstOne = i === 0;
                        return (
                          <g
                            key={`${s.day}-${i}`}
                            className="c-steer"
                            style={{ cursor: "help" }}
                            onPointerEnter={(e) =>
                              showCard(e, { kind: "steer", day: s.day })
                            }
                            onPointerMove={(e) =>
                              showCard(e, { kind: "steer", day: s.day })
                            }
                            onPointerLeave={() => setHover(null)}
                          >
                            <path
                              d={ribbon(
                                stroke(
                                  [s.x, STEER_Y - 7],
                                  [s.x, STEER_Y + 7],
                                  rand(scene.seed + 40 + i),
                                  0.5,
                                  1,
                                ),
                                lastOne ? 2.6 : 1.8,
                                scene.seed + 40 + i,
                              )}
                              fill={
                                lastOne
                                  ? "var(--accent)"
                                  : firstOne
                                    ? "var(--faint)"
                                    : "var(--ink)"
                              }
                              opacity={lastOne ? 0.95 : firstOne ? 0.6 : 0.7}
                            />
                            {lastOne && (
                              <line
                                x1={s.x}
                                y1={STEER_Y - 12}
                                x2={s.x}
                                y2={Y_MAX + 8}
                                stroke="var(--accent)"
                                strokeWidth={1}
                                strokeDasharray="2 6"
                                opacity={0.4}
                              />
                            )}
                            <rect
                              x={s.x - 10}
                              y={STEER_Y - 16}
                              width={20}
                              height={32}
                              fill="transparent"
                            />
                          </g>
                        );
                      })}
                    </>
                  )}

                  {/* the paddle: judgment, where the belief is launched from */}
                  <path
                    d={ribbon(
                      stroke(
                        [70, 404],
                        [150, 404],
                        rand(scene.seed + 5),
                        0.8,
                        1,
                      ),
                      3.4,
                      scene.seed + 5,
                    )}
                    fill="var(--ink)"
                  />
                  <text
                    className="b-mono"
                    x={110}
                    y={422}
                    textAnchor="middle"
                    fontSize={9}
                    letterSpacing={1.6}
                    fill="var(--faint)"
                    style={{ textTransform: "uppercase" }}
                  >
                    judgment
                  </text>

                  {/* the guide: from the belief straight up to the question */}
                  <line
                    x1={scene.end[0]}
                    y1={scene.end[1] - 12}
                    x2={scene.end[0]}
                    y2={QY + 6}
                    stroke="var(--accent)"
                    strokeWidth={1}
                    strokeDasharray="2 6"
                    opacity={0.45}
                  />

                  {/* the course */}
                  <g mask={reduce ? undefined : `url(#cm-${scene.seed})`}>
                    <path d={scene.ink} fill="var(--ink)" opacity={0.92} />
                  </g>

                  {/* the bricks: what hit it, in the order it came */}
                  {scene.bricks.map((b) => {
                    const n = nodes.get(b.id);
                    const kind = n?.kind ?? "note";
                    const ghost = kind === "ghost";
                    const fallow = n?.stage === "fallow";
                    const on = selected === b.id;
                    const lit = hover?.kind === "brick" && hover.id === b.id;
                    const col = colourOf(b.mark);
                    const seed = seedOf(`brick:${b.id}`);
                    const box = roughRect(scene.bw, BH, seed, {
                      wobble: 0.9,
                      overshoot: 2,
                    });
                    const placed = scene.labels.get(b.id);
                    const label = placed ?? {
                      x: b.x,
                      y: b.y - BH / 2 - 7,
                      text: short(n?.label ?? b.id, 26),
                    };
                    const showLabel =
                      on ||
                      lit ||
                      (placed && (inputs.length <= LABELS_UP_TO || b.mark));
                    return (
                      <g
                        key={b.id}
                        style={{
                          transform: `translate(${b.x - scene.bw / 2}px, ${b.y - BH / 2}px)`,
                          cursor: "pointer",
                        }}
                        onPointerEnter={(e) =>
                          showCard(e, { kind: "brick", id: b.id })
                        }
                        onPointerMove={(e) =>
                          showCard(e, { kind: "brick", id: b.id })
                        }
                        onPointerLeave={() => setHover(null)}
                        onClick={() => setSelected(on ? null : b.id)}
                      >
                        <g
                          className="c-brick"
                          style={{ ["--i" as string]: b.i }}
                        >
                          {on && (
                            <path
                              transform="translate(-8 -8)"
                              d={ribbon(
                                roughEllipse(scene.bw + 16, BH + 16, seed + 1, {
                                  wobble: 1.1,
                                  pad: 0,
                                  steps: 16,
                                }),
                                1.5,
                                seed + 1,
                              )}
                              fill="var(--accent)"
                            />
                          )}
                          <rect
                            x={1}
                            y={1}
                            width={scene.bw - 2}
                            height={BH - 2}
                            fill="var(--bg)"
                            opacity={0.6}
                          />
                          {ghost ? (
                            <path
                              d={box}
                              fill="none"
                              stroke={col}
                              strokeWidth={1.2}
                              strokeDasharray="3 3"
                            />
                          ) : (
                            <path
                              d={ribbon(box, 1.5, seed)}
                              fill={col}
                              opacity={b.mark || lit || on ? 1 : 0.75}
                            />
                          )}
                          {b.dated === "arrived" && (
                            <circle
                              cx={scene.bw - 3}
                              cy={3}
                              r={1.6}
                              fill="var(--ink)"
                              opacity={0.55}
                            />
                          )}
                          {showLabel && (
                            <text
                              className="b-hand"
                              x={scene.bw / 2}
                              y={label.y - (b.y - BH / 2)}
                              textAnchor="middle"
                              fontSize={12.5}
                              fontStyle={fallow ? "italic" : undefined}
                              fill={
                                b.mark
                                  ? col
                                  : on || lit
                                    ? "var(--ink)"
                                    : "var(--muted)"
                              }
                            >
                              {label.text}
                            </text>
                          )}
                          <rect
                            x={-5}
                            y={-5}
                            width={scene.bw + 10}
                            height={BH + 10}
                            fill="transparent"
                          />
                        </g>
                      </g>
                    );
                  })}

                  {/* the belief, where the marks have left it, and where it is pointed */}
                  <g transform={`translate(${scene.end[0]} ${scene.end[1]})`}>
                    <path
                      transform="translate(-14 -14)"
                      d={ribbon(
                        roughEllipse(28, 28, scene.seed, {
                          wobble: 1.2,
                          pad: 0,
                          steps: 14,
                        }),
                        1.4,
                        scene.seed,
                      )}
                      fill="var(--accent)"
                      opacity={0.9}
                    />
                    <circle
                      r={6.5}
                      fill="var(--accent)"
                      className={reduce ? undefined : "breathe"}
                    />
                  </g>
                  {t.n > 0 && <path d={scene.heading} fill="var(--accent)" />}
                </svg>

                {/* the marks, over the chosen brick */}
                {selectedBrick && writable && (
                  <div
                    className="c-float fade absolute z-[4] flex items-center gap-1.5"
                    style={{
                      left: `${clamp((selectedBrick.x / W) * 100, 16, 84)}%`,
                      top: `${((Math.max(selectedBrick.y - BH / 2 - 62, 8)) / H) * 100}%`,
                      transform: "translate(-50%, 0)",
                    }}
                  >
                    <Marks id={selectedBrick.id} size="lg" />
                  </div>
                )}

                {/* the card over a brick or a steering */}
                {hover && (hover.kind === "steer" || hoverNode) && (
                  <div
                    className="card fade pointer-events-none absolute z-[5] px-3 py-2"
                    style={{
                      left: hover.x + 14,
                      top: hover.y - 10,
                      maxWidth: "18rem",
                    }}
                  >
                    {hover.kind === "steer" ? (
                      <>
                        <div className="meta" style={{ color: "var(--faint)" }}>
                          {history?.since === hover.day ? "the record begins" : "steered"}
                        </div>
                        <div
                          className="hand mt-0.5 text-[15px] leading-[1.2]"
                          style={{ color: "var(--ink)" }}
                        >
                          {dayOf(hover.day)}
                        </div>
                        <div
                          className="hand mt-0.5 text-[13px]"
                          style={{ color: "var(--muted)" }}
                        >
                          {history?.since === hover.day
                            ? "the file was already here when its history starts"
                            : "the belief\u2019s file changed this day"}
                        </div>
                      </>
                    ) : (
                      hoverNode && (
                        <>
                          <div
                            className="meta"
                            style={{ color: `var(--kind-${hoverNode.kind})` }}
                          >
                            {KIND_LABEL[hoverNode.kind] ?? hoverNode.kind}
                            <span style={{ color: "var(--faint)" }}>
                              {" · "}
                              {STAGE_LABEL[hoverNode.stage]?.split(" ·")[0] ??
                                hoverNode.stage}
                              {" · "}
                              {when(hoverInput)}
                            </span>
                          </div>
                          <div
                            className="hand mt-0.5 text-[15px] leading-[1.2]"
                            style={{ color: "var(--ink)" }}
                          >
                            {hoverNode.label}
                          </div>
                          <div
                            className="hand mt-0.5 text-[13px] leading-[1.25]"
                            style={{ color: "var(--muted)" }}
                          >
                            {hoverInput?.threads
                              .map((k) => LINK_LABEL[k] ?? k)
                              .join(" · ")}
                            {" · "}
                            {course?.marks[hover.id] ? (
                              <span
                                style={{
                                  color: colourOf(course.marks[hover.id].mark),
                                }}
                              >
                                bent it {course.marks[hover.id].mark} · said{" "}
                                {dayOf(course.marks[hover.id].day)}
                              </span>
                            ) : (
                              "unweighed"
                            )}
                          </div>
                        </>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {/* the caption, or the chosen input */}
            <div
              className="relative mt-2 min-h-[3.6rem] pl-3"
              style={{ borderLeft: "2px solid var(--rule)" }}
            >
              {selectedInput && selectedNode ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <div className="min-w-0">
                    <div
                      className="meta"
                      style={{ color: `var(--kind-${selectedNode.kind})` }}
                    >
                      {KIND_LABEL[selectedNode.kind] ?? selectedNode.kind}
                      <span style={{ color: "var(--faint)" }}>
                        {" · "}
                        {when(selectedInput)}
                        {" · "}
                        {selectedInput.threads
                          .map((k) => (LINK_LABEL[k] ?? k).toLowerCase())
                          .join(" · ")}
                      </span>
                    </div>
                    <div
                      className="hand text-[16px] leading-[1.2]"
                      style={{ color: "var(--ink)" }}
                    >
                      {selectedNode.label}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="hand text-[13.5px]"
                      style={{ color: "var(--muted)" }}
                    >
                      it bent the belief
                    </span>
                    <Marks id={selectedInput.id} size="lg" />
                    <Link
                      href={`/catalogue?id=${encodeURIComponent(selectedInput.id)}`}
                      className="chip px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--muted)",
                      }}
                    >
                      open
                    </Link>
                    {selectedNode.kind !== "ghost" && (
                      <button
                        onClick={() => go(selectedInput.id)}
                        className="chip px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--muted)",
                        }}
                        title="Put this input on the sheet as the belief"
                      >
                        its course
                      </button>
                    )}
                    <kbd className="meta" style={{ color: "var(--faint)" }}>
                      ← → · t a u · esc
                    </kbd>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="meta"
                    style={{ color: cap ? "var(--accent)" : "var(--faint)" }}
                  >
                    {cap ? "said" : "the rule"}
                  </div>
                  <p
                    key={cap ?? "rest"}
                    className="hand fade mt-1 text-[15px] leading-[1.3]"
                    style={{ color: cap ? "var(--ink)" : "var(--muted)" }}
                  >
                    {cap ?? REST}
                  </p>
                </>
              )}
              <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                {(
                  [
                    ["var(--course-toward)", "bent it toward the question"],
                    ["var(--course-away)", "bent it away"],
                    ["var(--faint)", "unweighed"],
                  ] as [string, string][]
                ).map(([c, label]) => (
                  <li key={label} className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      style={{
                        width: 14,
                        height: 2,
                        background: c,
                        borderRadius: 1,
                      }}
                    />
                    <span className="meta" style={{ color: "var(--faint)" }}>
                      {label}
                    </span>
                  </li>
                ))}
                <li className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    style={{
                      width: 14,
                      height: 0,
                      borderTop: "1.5px dashed var(--faint)",
                    }}
                  />
                  <span className="meta" style={{ color: "var(--faint)" }}>
                    never written
                  </span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span
                    className="hand text-[12px] italic"
                    style={{ color: "var(--faint)" }}
                  >
                    italic
                  </span>
                  <span className="meta" style={{ color: "var(--faint)" }}>
                    gone fallow
                  </span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 99,
                      background: "var(--ink)",
                      opacity: 0.55,
                    }}
                  />
                  <span className="meta" style={{ color: "var(--faint)" }}>
                    dated by its arrival
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* ── the desk ──────────────────────────────────────────────── */}
          <aside
            className="rise flex flex-col gap-5"
            style={{ animationDelay: "140ms" }}
          >
            <div className="relative">
              <label
                className="meta block"
                htmlFor="course-search"
                style={{ color: "var(--faint)" }}
              >
                put a belief on the sheet
              </label>
              <input
                id="course-search"
                ref={search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="any stone  /"
                className="search mt-2 w-full px-3 py-2 text-[13px]"
                autoComplete="off"
              />
              {results.length > 0 && (
                <ul
                  className="panel sketched relative mt-2 p-1.5"
                  style={{ borderRadius: 3 }}
                >
                  <Sketch seed="course-found" draw />
                  {results.map((n) => (
                    <li key={n.id}>
                      <Stone
                        id={n.id}
                        onPick={(id) => {
                          go(id);
                          setQuery("");
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* the reading */}
            {beliefNode && course && (
              <section
                className="panel sketched relative p-4"
                style={{ borderRadius: 3 }}
                aria-label="The reading"
              >
                <Sketch
                  seed={`course-${beliefNode.id}`}
                  color="var(--accent)"
                  draw
                />
                <div
                  className="meta"
                  style={{ color: `var(--kind-${beliefNode.kind})` }}
                >
                  {KIND_LABEL[beliefNode.kind] ?? beliefNode.kind}
                  <span style={{ color: "var(--faint)" }}>
                    {" · "}
                    {STAGE_LABEL[beliefNode.stage]?.split(" ·")[0] ??
                      beliefNode.stage}{" "}
                    · {dayOf(beliefNode.modified)}
                  </span>
                </div>
                <h2
                  className="hand mt-1 text-[22px] leading-[1.15]"
                  style={{ color: "var(--ink)" }}
                >
                  {beliefNode.label}
                </h2>
                <ul className="mt-3">
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
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Link
                    href={`/catalogue?id=${encodeURIComponent(beliefNode.id)}`}
                    className="chip inline-block px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted)",
                    }}
                  >
                    read it
                  </Link>
                  <Link
                    href={`/flow?id=${encodeURIComponent(beliefNode.id)}`}
                    className="chip inline-block px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted)",
                    }}
                  >
                    in the flow
                  </Link>
                  {history && history.rewrites.length > 0 && (
                    <button
                      onClick={() => setSteerOpen((v) => !v)}
                      className="chip inline-block px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--muted)",
                      }}
                      aria-expanded={steerOpen}
                    >
                      steered · {Math.max(0, history.rewrites.length - 1)}
                    </button>
                  )}
                </div>
                {steerOpen && history && (
                  <p
                    className="hand mt-2 text-[13.5px] leading-[1.3]"
                    style={{ color: "var(--muted)" }}
                  >
                    on record since {dayOf(history.since)}
                    {history.rewrites.length > 1
                      ? `; steered ${history.rewrites
                          .slice(1)
                          .map((d) => dayOf(d))
                          .join(" · ")}`
                      : "; not steered since"}
                  </p>
                )}

                {/* the question */}
                <div className="mt-4 border-t pt-3 rule">
                  <label
                    className="meta block"
                    htmlFor="course-question"
                    style={{ color: "var(--faint)" }}
                  >
                    the question · approx.
                  </label>
                  <textarea
                    id="course-question"
                    value={qDraft}
                    onChange={(e) => setQDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        put();
                      }
                    }}
                    readOnly={!writable}
                    rows={2}
                    maxLength={500}
                    placeholder={
                      writable
                        ? "what is this belief trying to get right?"
                        : "read-only here"
                    }
                    className="search hand mt-2 w-full resize-none px-3 py-2 text-[15px] leading-[1.3]"
                  />
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {writable && qDraft.trim() !== (course.question ?? "") && (
                      <button
                        onClick={put}
                        className="chip px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--accent)",
                        }}
                      >
                        {qDraft.trim()
                          ? course.question
                            ? "re-put it"
                            : "put it"
                          : "take it back"}
                      </button>
                    )}
                    {course.asked && (
                      <span
                        className="meta"
                        style={{ color: "var(--faint)", textTransform: "none" }}
                      >
                        put {dayOf(course.asked)}
                      </span>
                    )}
                    {course.trail.length > 0 && (
                      <button
                        onClick={() => setTrailOpen((v) => !v)}
                        className="meta"
                        style={{ color: "var(--faint)", textTransform: "none" }}
                        aria-expanded={trailOpen}
                      >
                        as put before · {course.trail.length}{" "}
                        {trailOpen ? "▴" : "▾"}
                      </button>
                    )}
                  </div>
                  {trailOpen && (
                    <ul className="mt-2">
                      {[...course.trail].reverse().map((tr, i) => (
                        <li key={i} className="py-0.5">
                          <div
                            className="hand text-[13.5px] leading-[1.25]"
                            style={{ color: "var(--muted)" }}
                          >
                            {tr.question}
                          </div>
                          <div
                            className="meta"
                            style={{
                              color: "var(--faint)",
                              textTransform: "none",
                            }}
                          >
                            put {dayOf(tr.asked)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* what hit it */}
                <div className="mt-4 border-t pt-3 rule">
                  <div className="meta" style={{ color: "var(--faint)" }}>
                    what hit it · {t.n}
                    {t.n > 0 ? " · in the order it came" : ""}
                  </div>
                  {t.n === 0 ? (
                    <p
                      className="hand mt-1 text-[13.5px]"
                      style={{ color: "var(--faint)" }}
                    >
                      nothing flows into this yet. write toward it, and it will.
                    </p>
                  ) : (
                    <ul className="scroll-thin mt-1 max-h-[26rem] overflow-y-auto">
                      {inputs.map((inp) => {
                        const n = nodes.get(inp.id);
                        const m = course.marks[inp.id]?.mark ?? null;
                        const on = selected === inp.id;
                        const late =
                          inp.date && t.lastSteered
                            ? dayKey(inp.date) > t.lastSteered
                            : false;
                        return (
                          <li
                            key={inp.id}
                            className="c-row flex items-center gap-2 py-[3px]"
                            style={{
                              background: on
                                ? "color-mix(in srgb, var(--accent) 8%, transparent)"
                                : undefined,
                              borderRadius: 3,
                            }}
                          >
                            <button
                              onClick={() => setSelected(on ? null : inp.id)}
                              className="b-row flex min-w-0 flex-1 items-baseline gap-2 text-left"
                            >
                              <span
                                aria-hidden
                                className="shrink-0"
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: 99,
                                  background: m
                                    ? colourOf(m)
                                    : `var(--kind-${n?.kind ?? "note"})`,
                                  outline:
                                    n?.kind === "ghost"
                                      ? "1px dashed var(--faint)"
                                      : undefined,
                                }}
                              />
                              <span
                                className="min-w-0 flex-1 overflow-hidden text-[12.5px] text-ellipsis whitespace-nowrap"
                                style={{
                                  color: m
                                    ? colourOf(m)
                                    : on
                                      ? "var(--ink)"
                                      : "var(--muted)",
                                  fontStyle:
                                    n?.stage === "fallow"
                                      ? "italic"
                                      : undefined,
                                }}
                              >
                                {n?.label ?? inp.id}
                              </span>
                              <span
                                className="meta shrink-0"
                                style={{
                                  color: late
                                    ? "var(--accent)"
                                    : "var(--faint)",
                                  textTransform: "none",
                                }}
                                title={
                                  inp.dated === "arrived"
                                    ? "the day it first appeared in the belief"
                                    : inp.dated === "changed"
                                      ? "the day the input itself last changed"
                                      : "undated"
                                }
                              >
                                {inp.date ? dayOf(inp.date) : "—"}
                                {inp.dated === "arrived" ? "·" : ""}
                              </span>
                            </button>
                            <Marks id={inp.id} />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {t.since > 0 && (
                    <p
                      className="hand mt-1.5 text-[12.5px] leading-[1.25]"
                      style={{ color: "var(--faint)" }}
                    >
                      dates in the accent came after it was last steered.
                    </p>
                  )}
                </div>

                {/* the field repopulates */}
                {arriving && arriving.length > 0 && (
                  <div className="mt-4 border-t pt-3 rule">
                    <div className="meta" style={{ color: "var(--faint)" }}>
                      arriving · {arriving.length}
                    </div>
                    <p
                      className="hand mt-0.5 text-[13px] leading-[1.25]"
                      style={{ color: "var(--faint)" }}
                    >
                      speaks its words, came lately, not threaded to it yet.
                    </p>
                    <ul className="mt-1">
                      {arriving.map((k) => (
                        <li key={k.id} className="py-0.5">
                          <Link
                            href={`/catalogue?id=${encodeURIComponent(k.id)}`}
                            className="b-stone-link flex items-baseline gap-2"
                          >
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
                            <span
                              className="min-w-0 flex-1 overflow-hidden text-[12.5px] text-ellipsis whitespace-nowrap"
                              style={{ color: "var(--muted)" }}
                            >
                              {k.label}
                            </span>
                          </Link>
                          <div
                            className="hand ml-[14px] text-[12.5px] leading-[1.2]"
                            style={{ color: "var(--faint)" }}
                          >
                            {k.shared.slice(0, 4).join(" · ") ||
                              "almost nothing in common"}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* the courses kept */}
            {keptCourses.length > 0 && (
              <section aria-label="Courses kept">
                <div className="meta" style={{ color: "var(--faint)" }}>
                  courses kept · {keptCourses.length}
                </div>
                <ul className="mt-1">
                  {keptCourses.map((c) => {
                    const tw = Object.values(c.marks).filter(
                      (m) => m.mark === "toward",
                    ).length;
                    const aw = Object.values(c.marks).length - tw;
                    return (
                      <li key={c.belief} className="flex items-baseline gap-2">
                        <div className="min-w-0 flex-1">
                          <Stone id={c.belief} onPick={go} />
                        </div>
                        <span
                          className="meta shrink-0"
                          style={{
                            color: "var(--faint)",
                            textTransform: "none",
                          }}
                        >
                          {tw + aw ? (
                            <>
                              <span style={{ color: "var(--course-toward)" }}>
                                {tw}
                              </span>
                              {" · "}
                              <span style={{ color: "var(--course-away)" }}>
                                {aw}
                              </span>
                            </>
                          ) : (
                            "asked"
                          )}
                        </span>
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
              how it is read: what flowed straight into the belief, by the
              flow&rsquo;s direction. each input is dated by the day it first
              appeared in the belief&rsquo;s file, from that file&rsquo;s own
              history; where the record cannot say — no history, or already
              there when the record begins — by the day the input itself last
              changed, and the card says which. the days the belief was steered
              are the days its file changed. the bricks are grey until you say
              what each was worth, after it has already bent you; toward bends
              the course up to the question, away bends it down; the desk
              counts, and says what kind of thing did the bending. nothing here
              is a grade.
              {payload?.dir ? ` files at ${shortHome(payload.dir)}.` : ""}
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
