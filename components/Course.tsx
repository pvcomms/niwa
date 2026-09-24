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
import type { Garden, GardenNode } from "@/lib/garden";
import { buildFlow, type Flow as FlowGraph } from "@/lib/flow";
import {
  dayOf,
  emptyCourse,
  inputsOf,
  isBlank,
  putQuestion,
  readings,
  setMark,
  tally,
  type Course as CourseFile,
  type Input,
  type Mark,
} from "@/lib/course";
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
const H = 460;
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
/** Above this many inputs, labels show only on marked, chosen or hovered bricks. */
const LABELS_UP_TO = 22;

type Pt = [number, number];
type Brick = Input & { i: number; x: number; y: number; mark: Mark | null };
type Hover = { id: string; x: number; y: number };
type Kin = {
  id: string;
  label: string;
  kind: string;
  sim: number;
  shared: string[];
};
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

/**
 * The course. A stone is the belief; what flowed into it are the inputs,
 * laid across the sheet in the order they came; the question it is trying to
 * get right runs along the top. The reader says which way each input bent
 * the belief — toward the question or away — and the pen draws the course
 * those marks imply, launched from the paddle and pointed wherever the last
 * bend left it. The desk reads the marks and the dates back and never grades
 * them. The marks and the question are kept as one file per belief.
 */
export default function Course() {
  const [garden, setGarden] = useState<Garden | null>(null);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [courses, setCourses] = useState<CourseFile[]>([]);
  const [belief, setBelief] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [cap, setCap] = useState<string | null>(null);
  const [qDraft, setQDraft] = useState("");
  const [trailOpen, setTrailOpen] = useState(false);
  const [arriving, setArriving] = useState<Kin[] | null>(null);
  const [kept, setKept] = useState<"idle" | "saving" | "kept" | "error">(
    "idle",
  );
  const [reduce, setReduce] = useState(false);
  const [theme, setTheme] = useTheme();

  const sheet = useRef<HTMLElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const coursesRef = useRef<CourseFile[]>([]);
  const capTimer = useRef<number | null>(null);
  coursesRef.current = courses;

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

  // The first belief: the one asked for, else the one last steered, else the
  // reader's own stone that the most has flowed into.
  useEffect(() => {
    if (!garden || !flow || !payload || belief) return;
    const asked = new URLSearchParams(window.location.search).get("id");
    if (asked && nodes.has(asked)) {
      setBelief(asked);
      return;
    }
    const steered = [...payload.courses]
      .filter((c) => nodes.has(c.belief) && !isBlank(c))
      .sort((a, b) => {
        const la = Object.values(a.marks).reduce(
          (m, x) => (x.day > m ? x.day : m),
          a.asked,
        );
        const lb = Object.values(b.marks).reduce(
          (m, x) => (x.day > m ? x.day : m),
          b.asked,
        );
        return la < lb ? 1 : la > lb ? -1 : 0;
      })[0];
    if (steered) {
      setBelief(steered.belief);
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
    setBelief(best);
  }, [garden, flow, payload, belief, nodes]);

  const beliefNode = belief ? nodes.get(belief) : undefined;
  const course = useMemo(
    () =>
      belief
        ? (courses.find((c) => c.belief === belief) ?? emptyCourse(belief))
        : null,
    [courses, belief],
  );
  const inputs = useMemo(
    () => (flow && belief ? inputsOf(flow, nodes, belief) : []),
    [flow, nodes, belief],
  );
  const t = useMemo(
    () => tally(inputs, course?.marks ?? {}, nodes, beliefNode),
    [inputs, course, nodes, beliefNode],
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
  }, [belief]);

  useEffect(() => {
    setQDraft(course?.question ?? "");
  }, [course?.question, belief]);

  // What has arrived lately that speaks the belief's words and is not yet
  // threaded to it — the field repopulating. Read off the distribution's
  // model; nothing is written and nothing leaves the machine.
  useEffect(() => {
    setArriving(null);
    if (!beliefNode || payload?.writable === false) return;
    const text =
      `${beliefNode.description ?? ""}\n${beliefNode.body ?? ""}`.trim();
    if (text.split(/\s+/).length < 8) return;
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
        const have = new Set(inputs.map((i) => i.id));
        setArriving(
          (p.kin as Kin[])
            .filter((k) => k.id !== beliefNode.id && !have.has(k.id))
            .slice(0, 6),
        );
      })
      .catch(() => {});
    return () => ctl.abort();
    // inputs change only with the belief
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beliefNode, payload?.writable]);

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
  }, [inputs, selected, mark]);

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
    // Labels: each takes the first free place among near and far, above and
    // below, so a bent course does not pile its names on one another.
    const cw = 6.1;
    const maxChars = clamp(Math.floor((4 * (FX1 - FX0)) / Math.max(n, 1) / cw), 8, 26);
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
        const y = brick.y - BH / 2 + dy;
        const box: [number, number, number, number] = [brick.x - w / 2 - 3, y - 11, brick.x + w / 2 + 3, y + 3];
        const clear = !taken.some(
          (t) => box[0] < t[2] && box[2] > t[0] && box[1] < t[3] && box[3] > t[1],
        );
        if (clear) {
          taken.push(box);
          labels.set(brick.id, { x: brick.x, y, text });
          break;
        }
      }
    }
    return { bricks, pts, line, ink, end: b, heading, ticks, bw, seed, labels };
  }, [course, inputs, nodes]);

  const showCard = (e: ReactPointerEvent, id: string) => {
    const box = sheet.current!.getBoundingClientRect();
    setHover({ id, x: e.clientX - box.left, y: e.clientY - box.top });
  };
  const hoverNode = hover ? nodes.get(hover.id) : undefined;
  const hoverInput = hover ? inputs.find((i) => i.id === hover.id) : undefined;
  const selectedInput = selected
    ? inputs.find((i) => i.id === selected)
    : undefined;
  const selectedNode = selected ? nodes.get(selected) : undefined;

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
        .sort((a, b) => {
          const la = Object.values(a.marks).reduce(
            (m, x) => (x.day > m ? x.day : m),
            a.asked,
          );
          const lb = Object.values(b.marks).reduce(
            (m, x) => (x.day > m ? x.day : m),
            b.asked,
          );
          return la < lb ? 1 : la > lb ? -1 : 0;
        }),
    [courses, nodes],
  );

  const writable = payload?.writable ?? false;
  const colourOf = (m: Mark | null) =>
    m === "toward"
      ? "var(--course-toward)"
      : m === "away"
        ? "var(--course-away)"
        : "var(--faint)";

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

  /** The three marks as chips, for one input. */
  const Marks = ({ id, size = "sm" }: { id: string; size?: "sm" | "lg" }) => {
    const cur = course?.marks[id]?.mark ?? null;
    const pad =
      size === "lg" ? "px-2.5 py-1 text-[10px]" : "px-1.5 py-[2px] text-[9px]";
    return (
      <span className="inline-flex shrink-0 items-center gap-1">
        {(
          [
            ["toward", "toward"],
            ["away", "away"],
          ] as [Mark, string][]
        ).map(([m, label]) => (
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
              opacity: writable ? 1 : 0.5,
            }}
          >
            {label}
          </button>
        ))}
      </span>
    );
  };

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
            ref={sheet}
            className="panel sketched rise relative p-2 sm:p-3"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The course"
          >
            <Sketch seed="course-sheet" draw />

            {/* the readout, and the keeping */}
            <div className="relative z-[2] flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
              <span className="meta" style={{ color: "var(--muted)" }}>
                {t.n === 0
                  ? "nothing has hit this"
                  : `weighed ${t.weighed} of ${t.n} · toward ${t.toward} · away ${t.away}`}
              </span>
              <span
                className="meta"
                style={{
                  color: kept === "error" ? "var(--accent)" : "var(--faint)",
                }}
              >
                {!payload
                  ? ""
                  : !writable
                    ? "read-only here"
                    : kept === "saving"
                      ? "keeping"
                      : kept === "kept"
                        ? "kept"
                        : kept === "error"
                          ? "not kept"
                          : payload.dir
                            ? shortHome(payload.dir)
                            : ""}
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

                {/* the question, as a horizon */}
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

                {/* the ticks under the field */}
                {scene.ticks.map((tk, i) => (
                  <g key={`${tk.label}-${i}`}>
                    <line
                      x1={tk.x}
                      y1={428}
                      x2={tk.x}
                      y2={434}
                      stroke="var(--rule)"
                      strokeWidth={1}
                    />
                    <text
                      className="b-mono"
                      x={tk.x}
                      y={446}
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
                    y={446}
                    textAnchor="middle"
                    fontSize={9}
                    letterSpacing={1.2}
                    fill="var(--faint)"
                    style={{ textTransform: "uppercase" }}
                  >
                    now
                  </text>
                )}

                {/* the paddle: judgment, where the belief is launched from */}
                <path
                  d={ribbon(
                    stroke([70, 404], [150, 404], rand(scene.seed + 5), 0.8, 1),
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
                  const lit = hover?.id === b.id;
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
                    on || lit || (placed && (inputs.length <= LABELS_UP_TO || b.mark));
                  return (
                    <g
                      key={b.id}
                      style={{
                        transform: `translate(${b.x - scene.bw / 2}px, ${b.y - BH / 2}px)`,
                        cursor: "pointer",
                      }}
                      onPointerEnter={(e) => showCard(e, b.id)}
                      onPointerMove={(e) => showCard(e, b.id)}
                      onPointerLeave={() => setHover(null)}
                      onClick={() => setSelected(on ? null : b.id)}
                    >
                    <g className="c-brick" style={{ ["--i" as string]: b.i }}>
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
                  <circle r={6.5} fill="var(--accent)" />
                </g>
                {t.n > 0 && (
                  <path
                    d={scene.heading}
                    fill="var(--accent)"
                    className="c-heading"
                  />
                )}
              </svg>
            )}

            {/* the card over a brick */}
            {hover && hoverNode && (
              <div
                className="card fade pointer-events-none absolute z-[5] px-3 py-2"
                style={{
                  left: hover.x + 14,
                  top: hover.y - 10,
                  maxWidth: "18rem",
                }}
              >
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
                    {dayOf(hoverNode.modified)}
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
                      style={{ color: colourOf(course.marks[hover.id].mark) }}
                    >
                      bent it {course.marks[hover.id].mark} · said{" "}
                      {dayOf(course.marks[hover.id].day)}
                    </span>
                  ) : (
                    "unweighed"
                  )}
                </div>
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
                        {dayOf(selectedNode.modified)}
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
                  <div className="flex items-center gap-2">
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
                          setBelief(id);
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
                </div>

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
                            {dayOf(tr.asked)}
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
                                  color: "var(--faint)",
                                  textTransform: "none",
                                }}
                              >
                                {inp.date ? dayOf(inp.date) : "—"}
                              </span>
                            </button>
                            <Marks id={inp.id} />
                          </li>
                        );
                      })}
                    </ul>
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
                    const n = Object.keys(c.marks).length;
                    return (
                      <li key={c.belief} className="flex items-baseline gap-2">
                        <div className="min-w-0 flex-1">
                          <Stone id={c.belief} onPick={setBelief} />
                        </div>
                        <span
                          className="meta shrink-0"
                          style={{
                            color: "var(--faint)",
                            textTransform: "none",
                          }}
                        >
                          {n ? `${n} weighed` : "asked"}
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
              flow&rsquo;s direction, in the order it entered the garden. the
              bricks are grey until you say what each was worth — after it has
              already bent you. toward bends the course up to the question, away
              bends it down; the desk counts, and says what kind of thing did
              the bending. the question is kept as put and as put before.
              nothing here is a grade.
              {payload?.dir ? ` files at ${shortHome(payload.dir)}.` : ""}
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
