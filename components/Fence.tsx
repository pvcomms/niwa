"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BACKS,
  BACK_LABEL,
  CALL_ASK,
  CALL_LABEL,
  HOLDS,
  HOLDS_LABEL,
  KNOWN,
  KNOWN_LABEL,
  MAKERS,
  MAKER_LABEL,
  addDays,
  callsFrom,
  cameDown,
  dayWords,
  emptyFence,
  fenceAbout,
  hasUse,
  isDue,
  newThrough,
  newUse,
  readings,
  recordReadings,
  stateOf,
  tally,
  whenWords,
  type About,
  type Call,
  type CallKind,
  type Came,
  type Fence as F,
  type Standing,
  type State,
  type Use,
} from "@/lib/fence";
import { EXAMPLE_FENCE } from "@/content/fence";
import { rand, ribbon, roughEllipse, seedOf, stroke } from "@/lib/hand";
import { putOnDesk } from "./desk";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

type Payload = {
  fences: F[];
  about: About | null;
  standing: Standing[];
  writable: boolean;
  dir: string | null;
};

const mono = { fontFamily: "var(--font-mono)" } as const;
const hand = { fontFamily: "var(--font-hand)" } as const;
const chip = "chip fn-seg px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";
const localToday = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
/** A textarea as tall as what is in it; called on every render and on every keystroke. */
const grow = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};
const clip = (s: string, max: number) =>
  s.length <= max ? s : `${s.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;

const NOTE_ASK: Record<CallKind, string> = {
  keep: "why, in a line — if you want",
  move: "moved to what, or where",
  down: "why, in a line — if you want",
  trial: "what you will watch for while it is down",
  back: "how it goes back up — as it was, or changed",
};
const STATE_SHORT: Record<State, string> = {
  open: "no call yet",
  keep: "kept",
  move: "moved",
  down: "down",
  trial: "down for a while",
  back: "put back up",
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

/** A choice written out as words, the one chosen inked and underlined by hand. */
function Seg<T extends string>({
  options,
  labels,
  value,
  onPick,
  disabled,
  label,
}: {
  options: readonly T[];
  labels: Record<T, string>;
  value: string;
  onPick: (v: T) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <span
      role="group"
      aria-label={label}
      className="inline-flex flex-wrap items-baseline gap-y-1"
    >
      {options.map((o, i) => (
        <span key={o} className="inline-flex items-baseline">
          <button
            onClick={() => onPick(o)}
            disabled={disabled}
            aria-pressed={value === o}
            className="fn-seg relative text-[11px]"
            style={{
              ...mono,
              letterSpacing: "0.04em",
              color: value === o ? "var(--ink)" : "var(--faint)",
            }}
          >
            {labels[o]}
            {value === o && (
              <Sketch
                kind="underline"
                seed={`${label}-${o}`}
                color="var(--accent)"
                draw
              />
            )}
          </button>
          {i < options.length - 1 && (
            <span
              aria-hidden
              className="px-1.5 text-[11px]"
              style={{ color: "var(--faint)" }}
            >
              ·
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="meta" style={{ color: "var(--accent)" }}>
      {children}
    </div>
  );
}

/* ── the drawing ───────────────────────────────────────────────────────── */

const GW = 360;
const GH = 292;
const GROUND = 212;
const TOP = 94;
const POSTS = [40, 110, 180, 250, 320];
const HINGE = 180;
const LATCH = 250;
const LATCH_Y = 150;
/**
 * Where the things that would come through stand on the other side: a few are given
 * rows of their own and room for their words; five share the ground and are cut short.
 */
const BEYOND: Record<number, [number, number][]> = {
  1: [[46, 52]],
  2: [
    [46, 40],
    [150, 70],
  ],
  3: [
    [46, 34],
    [176, 56],
    [70, 80],
  ],
  5: [
    [46, 44],
    [178, 34],
    [258, 58],
    [104, 70],
    [214, 80],
  ],
};
const spotsFor = (n: number) => BEYOND[n] ?? BEYOND[5];
const wordsFor = (n: number) => (n <= 3 ? 44 : 26);

type Style = "found" | "guess" | "hollow";
const styleOf = (u: Use): Style =>
  !u.kept ? "hollow" : u.known === "guess" ? "guess" : "found";
const INK: Record<Style, string> = {
  found: "var(--ink)",
  guess: "var(--muted)",
  hollow: "var(--faint)",
};

/** A rail, as its use is known: inked when found, pencilled when guessed, hollow from the record. */
function Rail({ d, style, seed }: { d: string; style: Style; seed: number }) {
  if (style === "found")
    return <path d={ribbon(d, 2.6, seed)} fill="var(--ink)" />;
  if (style === "guess")
    return (
      <path
        d={d}
        fill="none"
        stroke="var(--muted)"
        strokeWidth={1.1}
        strokeDasharray="4 3"
        strokeLinecap="round"
      />
    );
  return (
    <path
      d={ribbon(d, 3.4, seed)}
      fill="none"
      stroke="var(--faint)"
      strokeWidth={0.7}
    />
  );
}

const railYs = (k: number) =>
  k <= 1
    ? [158]
    : Array.from({ length: k }, (_, i) => 120 + (i * 78) / (k - 1));

/** The same rail, small, beside its use on the sheet. */
function RailGlyph({ use }: { use: Use }) {
  const style = styleOf(use);
  const broken = use.holds === "gone";
  const parts = useMemo(() => {
    const r = rand(seedOf(`glyph-${use.id}`));
    return broken
      ? [
          stroke([2, 6], [13, 6], r, 0.7, 1),
          stroke([19, 6], [30, 6], r, 0.7, 1),
        ]
      : [stroke([2, 6], [30, 6], r, 0.7, 1)];
  }, [use.id, broken]);
  return (
    <svg
      viewBox="0 0 32 12"
      width={32}
      height={12}
      aria-hidden
      className="mt-[10px] shrink-0"
    >
      {parts.map((d, i) => (
        <Rail
          key={i}
          d={d}
          style={style}
          seed={seedOf(`glyph-${use.id}`) + i}
        />
      ))}
    </svg>
  );
}

/**
 * The fence across the lane, drawn by hand. A rail for every use set down —
 * inked when found out, pencilled when a guess, hollow while it is the
 * record's and not yet kept, broken where the reason no longer holds. The
 * latch lifts once a use is found. What would come through stands on the
 * other side until it is marked as having come. Taken down, the fence lies
 * flat; down for a while, the gate stands open on its hinge; moved, it stands
 * a little along from where it was.
 */
function Gate({ fence }: { fence: F }) {
  const state = stateOf(fence);
  const found = hasUse(fence);
  const shown = fence.uses.slice(0, 4);
  const more = fence.uses.length - shown.length;
  const railKey = shown
    .map((u) => `${u.id}:${styleOf(u)}:${u.holds === "gone" ? 1 : 0}`)
    .join("|");
  const posts = useMemo(
    () =>
      POSTS.map((x, i) => {
        const s = seedOf(`fence-post-${i}`);
        return ribbon(
          stroke(
            [x, GROUND + 7],
            [x, TOP - (x === HINGE || x === LATCH ? 7 : 0)],
            rand(s),
            0.8,
            2,
          ),
          3.6,
          s,
        );
      }),
    [],
  );
  const rails = useMemo(() => {
    const ys = railYs(shown.length);
    return shown.map((u, i) => {
      const y = ys[i];
      const s = seedOf(`fence-rail-${u.id}-${i}`);
      const r = rand(s);
      const seg = (a: number, b: number) =>
        stroke([a, y + (r() - 0.5) * 2], [b, y + (r() - 0.5) * 2], r, 1.1, 3);
      const broken = u.holds === "gone";
      return {
        u,
        y,
        s,
        style: styleOf(u),
        broken,
        left: broken
          ? [seg(POSTS[0] - 3, 100), seg(120, HINGE + 2)]
          : [seg(POSTS[0] - 3, HINGE + 2)],
        gate: seg(HINGE + 1, LATCH - 1),
        right: seg(LATCH - 2, POSTS[4] + 3),
        splinters: broken
          ? [
              stroke([100, y], [104, y - 4], r, 0.3, 0),
              stroke([120, y], [116, y + 4], r, 0.3, 0),
            ]
          : [],
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [railKey]);
  const frame = useMemo(() => {
    const s = seedOf("fence-frame");
    const r = rand(s);
    return {
      ground: ribbon(
        stroke([8, GROUND + 6], [GW - 8, GROUND + 6], r, 1.4, 4),
        1.3,
        s,
      ),
      brace: ribbon(
        stroke([HINGE + 5, GROUND - 12], [LATCH - 5, TOP + 14], r, 1, 2),
        2,
        s + 1,
      ),
      hinges: [TOP + 22, GROUND - 26].map((y, i) =>
        ribbon(
          stroke([HINGE - 6, y], [HINGE + 9, y], r, 0.4, 1),
          2.2,
          s + 2 + i,
        ),
      ),
      bar: ribbon(
        stroke([LATCH - 20, LATCH_Y - 2], [LATCH + 8, LATCH_Y - 2], r, 0.5, 1),
        2.2,
        s + 5,
      ),
      hook: ribbon(
        stroke([LATCH + 8, LATCH_Y - 2], [LATCH + 9, LATCH_Y + 5], r, 0.3, 0),
        2,
        s + 6,
      ),
    };
  }, []);
  const through = fence.through.slice(0, 5);
  const spots = spotsFor(through.length);
  const words = wordsFor(through.length);
  const fenceMove =
    state === "down"
      ? "scaleY(0.06)"
      : state === "move"
        ? "translateX(24px)"
        : "none";

  return (
    <svg
      viewBox={`0 0 ${GW} ${GH}`}
      className="w-full"
      role="img"
      aria-label={`The fence: ${fence.uses.length} rails, the latch ${found ? "up" : "down"}, ${STATE_SHORT[state]}`}
    >
      <text
        x={10}
        y={16}
        fontSize={9}
        style={{ ...mono, letterSpacing: "0.14em" }}
        fill="var(--faint)"
      >
        THE OTHER SIDE
      </text>
      <text
        x={10}
        y={GH - 6}
        fontSize={9}
        style={{ ...mono, letterSpacing: "0.14em" }}
        fill="var(--faint)"
      >
        THIS SIDE
      </text>

      {state === "move" &&
        POSTS.map((x) => (
          <line
            key={x}
            x1={x}
            x2={x}
            y1={GROUND + 4}
            y2={TOP}
            stroke="var(--faint)"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
        ))}

      <path d={frame.ground} fill="var(--muted)" opacity={0.75} />

      <g
        className="fn-fence"
        style={{
          transformOrigin: `${GW / 2}px ${GROUND + 6}px`,
          transform: fenceMove,
          opacity: state === "down" ? 0.85 : 1,
        }}
      >
        {posts.map((d, i) => (
          <path key={i} d={d} fill="var(--ink)" />
        ))}
        <circle cx={LATCH + 6} cy={LATCH_Y + 3} r={2.3} fill="var(--ink)" />
        {rails.map((r, i) => (
          <g
            key={`${r.u.id}:${r.style}:${r.broken}`}
            className="fn-rail"
            style={{ ["--i" as string]: i }}
          >
            {r.left.map((d, j) => (
              <Rail key={j} d={d} style={r.style} seed={r.s + j} />
            ))}
            <Rail d={r.right} style={r.style} seed={r.s + 7} />
            {r.splinters.map((d, j) => (
              <path
                key={j}
                d={d}
                fill="none"
                stroke={INK[r.style]}
                strokeWidth={1}
                strokeLinecap="round"
              />
            ))}
          </g>
        ))}
        <g
          className="fn-gate"
          style={{
            transformOrigin: `${HINGE}px ${GROUND}px`,
            transform: state === "trial" ? "scaleX(0.28)" : "none",
          }}
        >
          <path d={frame.brace} fill="var(--ink)" opacity={0.8} />
          {frame.hinges.map((d, i) => (
            <path key={i} d={d} fill="var(--ink)" />
          ))}
          {rails.map((r, i) => (
            <g
              key={`${r.u.id}:${r.style}`}
              className="fn-rail"
              style={{ ["--i" as string]: i }}
            >
              <Rail d={r.gate} style={r.style} seed={r.s + 5} />
            </g>
          ))}
          <g
            className="fn-latch"
            style={{
              transformOrigin: `${LATCH - 20}px ${LATCH_Y - 2}px`,
              transform: found ? "rotate(-32deg)" : "none",
            }}
          >
            <path d={frame.bar} fill={found ? "var(--accent)" : "var(--ink)"} />
            <path
              d={frame.hook}
              fill={found ? "var(--accent)" : "var(--ink)"}
            />
          </g>
        </g>
      </g>

      <g
        className="fn-words"
        style={{
          transform: state === "move" ? "translateX(24px)" : "none",
          opacity: state === "down" ? 0 : 1,
        }}
      >
        {rails.map((r) => (
          <g key={r.u.id}>
            <text
              x={POSTS[0] + 5}
              y={r.y - 5}
              fontSize={13}
              style={hand}
              fill={INK[r.style]}
              stroke="var(--surface)"
              strokeWidth={3}
              strokeLinejoin="round"
              paintOrder="stroke"
            >
              {clip(r.u.text, 44)}
            </text>
            {r.u.kept && r.u.holds === "unsure" && (
              <text
                x={POSTS[4] + 9}
                y={r.y + 4}
                fontSize={13}
                style={hand}
                fill="var(--faint)"
              >
                ?
              </text>
            )}
          </g>
        ))}
        {more > 0 && (
          <text
            x={POSTS[4]}
            y={GROUND - 4}
            fontSize={11.5}
            textAnchor="end"
            style={hand}
            fill="var(--faint)"
          >
            and {more} more
          </text>
        )}
        {!fence.uses.length && (
          <text
            x={GW / 2}
            y={160}
            fontSize={13.5}
            textAnchor="middle"
            style={hand}
            fill="var(--muted)"
            stroke="var(--surface)"
            strokeWidth={4}
            strokeLinejoin="round"
            paintOrder="stroke"
          >
            no rails yet — what is it for?
          </text>
        )}
      </g>

      {through.map((t, i) => {
        const [x, y] = spots[i];
        const came = t.came === "came";
        const w = Math.min(290, clip(t.text, words).length * 6.4 + 14);
        const s = seedOf(`through-${t.id}`);
        return (
          <g
            key={t.id}
            className="fn-through"
            style={{
              ["--i" as string]: i,
              transform: `translate(${x}px, ${came ? GROUND + 30 + (i % 3) * 17 : y}px)`,
            }}
          >
            {came && (
              <path
                d={ribbon(
                  roughEllipse(w, 21, s, {
                    pad: 0,
                    grow: 1,
                    wobble: 0.8,
                    steps: 16,
                  }),
                  1.2,
                  s,
                )}
                transform="translate(-7 -15)"
                fill="var(--accent)"
              />
            )}
            <text
              fontSize={13.5}
              style={hand}
              fill={
                came
                  ? "var(--ink)"
                  : t.came === "not"
                    ? "var(--faint)"
                    : "var(--muted)"
              }
            >
              {clip(t.text, words)}
            </text>
            {t.came === "not" && (
              <line
                x1={-2}
                x2={w - 12}
                y1={-4}
                y2={-4}
                stroke="var(--faint)"
                strokeWidth={0.9}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** What the drawing shows, in words, under it. */
function drawn(f: F): string {
  const s = stateOf(f);
  const c = f.calls.at(-1);
  const kept = f.uses.filter((u) => u.kept);
  const inked = kept.filter((u) => u.known !== "guess").length;
  const pencil = kept.length - inked;
  const hollow = f.uses.length - kept.length;
  const broken = kept.filter((u) => u.holds === "gone").length;
  const rails = !f.uses.length
    ? "posts, and no rails yet"
    : [
        inked ? `${inked} inked` : "",
        pencil ? `${pencil} pencilled` : "",
        hollow ? `${hollow} hollow` : "",
        broken ? `${broken} broken` : "",
      ]
        .filter(Boolean)
        .join(", ")
        .replace(
          /^/,
          `${f.uses.length} ${f.uses.length === 1 ? "rail" : "rails"}: `,
        );
  const latch = hasUse(f)
    ? "the latch is up"
    : "the latch is down until a use is found";
  const where = !c
    ? ""
    : s === "trial"
      ? `open for a while, until ${dayWords(c.until)}`
      : s === "down"
        ? `down since ${dayWords(c.on)}`
        : `${STATE_SHORT[s]} ${dayWords(c.on)}`;
  return [rails, latch, where].filter(Boolean).join(" · ");
}

/**
 * The fence: Chesterton's fence as an instrument. What would be cleared away
 * and what it costs to keep; what it might be for, and how each is known;
 * what would come through; whether it could go back up. Then the call,
 * dated, and afterwards. The desk reads the record back and offers the
 * rules the reader already set down as fences already standing.
 */
export default function Fence() {
  const [theme, setTheme] = useTheme();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [open, setOpen] = useState<F | null>(null);
  const [kept, setKept] = useState(false);
  const [example, setExample] = useState(false);
  const [trouble, setTrouble] = useState<string | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    call: CallKind;
    note: string;
    until: string;
  } | null>(null);
  const [useText, setUseText] = useState("");
  const [throughText, setThroughText] = useState("");
  const [insteadFor, setInsteadFor] = useState<string | null>(null);
  const [allStanding, setAllStanding] = useState(false);
  const openRef = useRef<F | null>(null);
  const keptRef = useRef(false);
  const slugRef = useRef("");
  const sheetRef = useRef<HTMLElement>(null);
  const saving = useRef<Promise<void>>(Promise.resolve());
  openRef.current = open;
  keptRef.current = kept;
  const today = useMemo(localToday, []);
  const writable = payload?.writable ?? false;

  const reset = () => {
    setPending(null);
    setSure(null);
    setTrouble(null);
    setInsteadFor(null);
  };
  const fresh = useCallback((asExample = false, about?: About | null) => {
    const day = localToday();
    slugRef.current = "";
    setKept(false);
    setExample(asExample && !about);
    setOpen(
      about
        ? fenceAbout(about, day)
        : asExample
          ? { ...EXAMPLE_FENCE, put: day, touched: day }
          : emptyFence(day),
    );
    reset();
  }, []);
  const load = useCallback((f: F) => {
    slugRef.current = f.slug;
    setKept(true);
    setExample(false);
    setOpen(f);
    reset();
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const slug = p.get("slug");
    const id = p.get("id");
    fetch(`/api/fence${id ? `?id=${encodeURIComponent(id)}` : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((pl: Payload | null) => {
        if (!pl) {
          setTrouble("the fences could not be read");
          return;
        }
        setPayload(pl);
        const wanted = slug ? pl.fences.find((x) => x.slug === slug) : null;
        const about = pl.about
          ? pl.fences.find((x) => x.stone === pl.about!.id)
          : null;
        const going = pl.fences.find((f) =>
          ["open", "trial"].includes(stateOf(f)),
        );
        if (wanted) load(wanted);
        else if (about) load(about);
        else if (pl.about) fresh(false, pl.about);
        else if (going) load(going);
        else if (!pl.writable && pl.fences[0]) load(pl.fences[0]);
        else fresh(pl.fences.length === 0);
      })
      .catch(() => setTrouble("the fences could not be read"));
  }, [fresh, load]);

  // Only once the fences are read: in development React mounts twice, and a sync on the
  // first mount would take the slug off the address before the second could read it.
  const loaded = payload !== null;
  useEffect(() => {
    if (!loaded) return;
    const url = new URL(window.location.href);
    if (kept && open?.slug) url.searchParams.set("slug", open.slug);
    else url.searchParams.delete("slug");
    if (kept) url.searchParams.delete("id");
    window.history.replaceState(null, "", url);
    putOnDesk(
      kept && open
        ? { kind: "fence", id: open.slug, label: open.fence.slice(0, 60) }
        : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, kept, open?.slug]);
  useEffect(() => () => putOnDesk(null), []);

  /* ── keeping ─────────────────────────────────────────────────────────── */

  const save = useCallback(
    (f: F) =>
      new Promise<F | null>((resolve) => {
        saving.current = saving.current.then(async () => {
          const isFresh = !slugRef.current;
          try {
            const r = await fetch("/api/fence", {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                fence: { ...f, slug: slugRef.current, touched: localToday() },
                fresh: isFresh,
              }),
            });
            const out = (await r.json().catch(() => null)) as
              F | { error: string } | null;
            if (!r.ok || !out || "error" in out) {
              setTrouble(
                out && "error" in out ? out.error : `not kept (${r.status})`,
              );
              resolve(null);
              return;
            }
            slugRef.current = out.slug;
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
                    fences: [
                      out,
                      ...p.fences.filter((x) => x.slug !== out.slug),
                    ],
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

  const patch = useCallback((p: Partial<F>) => {
    setExample(false);
    setOpen((cur) => (cur ? { ...cur, ...p } : cur));
  }, []);
  const commit = useCallback(() => {
    const f = openRef.current;
    if (f && keptRef.current && writable) void save(f);
  }, [save, writable]);
  const set = (p: Partial<F>) => {
    const f = openRef.current;
    if (!f) return;
    const next = { ...f, ...p };
    setExample(false);
    // The ref moves now, not on the next render, so a second edit before then builds on this one.
    openRef.current = next;
    setOpen(next);
    if (keptRef.current && writable) void save(next);
  };
  const setUse = (id: string, p: Partial<Use>, keep = true) => {
    const f = openRef.current;
    if (!f) return;
    const next = {
      ...f,
      uses: f.uses.map((u) => (u.id === id ? { ...u, ...p } : u)),
    };
    setExample(false);
    openRef.current = next;
    setOpen(next);
    if (keep && keptRef.current && writable) void save(next);
  };
  const setThrough = (
    id: string,
    p: Partial<{ text: string; came: Came }>,
    keep = true,
  ) => {
    const f = openRef.current;
    if (!f) return;
    const next = {
      ...f,
      through: f.through.map((t) => (t.id === id ? { ...t, ...p } : t)),
    };
    setExample(false);
    openRef.current = next;
    setOpen(next);
    if (keep && keptRef.current && writable) void save(next);
  };
  const addUse = () => {
    const t = useText.trim();
    const f = openRef.current;
    if (!t || !f) return;
    set({ uses: [...f.uses, newUse(t)] });
    setUseText("");
  };
  const addThrough = () => {
    const t = throughText.trim();
    const f = openRef.current;
    if (!t || !f) return;
    set({ through: [...f.through, newThrough(t)] });
    setThroughText("");
  };

  const setDown = () => {
    const f = openRef.current;
    if (!f || !writable) return;
    if (!f.fence.trim()) {
      setTrouble("say what the fence is, in a line");
      return;
    }
    void save(f);
  };

  const makeCall = () => {
    const f = openRef.current;
    if (!f || !pending || !writable) return;
    if (!f.fence.trim()) {
      setTrouble("say what the fence is, in a line");
      return;
    }
    if (
      pending.call === "trial" &&
      !/^\d{4}-\d{2}-\d{2}$/.test(pending.until)
    ) {
      setTrouble("name a day to look again");
      return;
    }
    const downing = pending.call === "down" || pending.call === "trial";
    const unseen = downing && !hasUse(f);
    if (unseen && sure !== "call") {
      setSure("call");
      return;
    }
    const call: Call = {
      on: localToday(),
      call: pending.call,
      until: pending.call === "trial" ? pending.until : "",
      note: pending.note.trim(),
      unseen,
    };
    const next = { ...f, calls: [...f.calls, call] };
    openRef.current = next;
    setOpen(next);
    setPending(null);
    setSure(null);
    void save(next);
  };

  const remove = useCallback(async () => {
    const f = openRef.current;
    if (!f || !writable || !keptRef.current) return;
    const r = await fetch(`/api/fence?slug=${encodeURIComponent(f.slug)}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      setTrouble(`not taken off (${r.status})`);
      return;
    }
    setPayload((p) =>
      p ? { ...p, fences: p.fences.filter((x) => x.slug !== f.slug) } : p,
    );
    fresh();
  }, [writable, fresh]);

  /* ── derived ─────────────────────────────────────────────────────────── */

  const fences = useMemo(() => payload?.fences ?? [], [payload]);
  const state: State = open ? stateOf(open) : "open";
  const found = open ? hasUse(open) : false;
  const due = open ? isDue(open, today) : false;
  // A draft is not on the record yet, so the reading does not say when it was set down.
  const words = useMemo(() => {
    if (!open) return [];
    const r = readings(open, today);
    if (!kept)
      r[0] = r[0].replace(/^set down [^·]*?(?= · |$)/, "not set down yet");
    return r;
  }, [open, today, kept]);
  const record = useMemo(
    () => recordReadings(tally(fences, today)),
    [fences, today],
  );
  const standing = payload?.standing ?? [];
  const shownStanding = allStanding ? standing : standing.slice(0, 6);

  const openRule = (s: Standing) => {
    const existing = fences.find((f) => f.stone === s.id);
    if (existing) load(existing);
    else fresh(false, { ...s, mine: true });
    sheetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const pick = (k: CallKind) => {
    setSure(null);
    setPending((p) =>
      p?.call === k
        ? null
        : { call: k, note: "", until: k === "trial" ? addDays(today, 21) : "" },
    );
  };
  const downing = pending?.call === "down" || pending?.call === "trial";

  return (
    <main className="fence scroll-thin relative h-dvh w-full overflow-y-auto">
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
                fence
              </div>
              <p
                className="hand mt-1 max-w-[29rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                Before a thing is cleared away, find out what it was for. What
                it costs you, what it might be for and how you know, what would
                come through, whether it could go back up — then the call is
                yours.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/fence" />
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
            ref={sheetRef}
            className="panel sketched rise relative min-w-0 scroll-mt-4 p-5 sm:p-7"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The fence"
          >
            <Sketch seed={`fence-${open?.slug || "fresh"}`} draw />
            {!open ? (
              <p className="meta" style={{ color: "var(--faint)" }}>
                {trouble ?? "reading…"}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    {kept
                      ? `a fence · set down ${dayWords(open.put)}`
                      : example
                        ? "an example — Chesterton's gate"
                        : "now"}
                    {open.stone && (
                      <>
                        {" · about "}
                        <Link
                          href={`/catalogue?id=${encodeURIComponent(open.stone)}`}
                          className="fn-link"
                          style={{ color: "var(--ink)", textTransform: "none" }}
                        >
                          the stone
                        </Link>
                      </>
                    )}
                  </div>
                  {(kept || example) && writable && (
                    <Chip onClick={() => fresh()}>a new fence</Chip>
                  )}
                </div>

                <textarea
                  ref={(el) => grow(el)}
                  onInput={(e) => grow(e.currentTarget)}
                  value={open.fence}
                  onChange={(e) => patch({ fence: e.target.value })}
                  onBlur={commit}
                  readOnly={!writable}
                  rows={1}
                  placeholder="what would you clear away? a rule, a habit, a step, a custom, a line of code — in a line"
                  aria-label="The fence"
                  className="display fn-case mt-2 w-full resize-none overflow-hidden bg-transparent px-0 py-1 text-[26px] leading-[1.2] sm:text-[31px]"
                  style={{ color: "var(--ink)" }}
                />
                {example && (
                  <p
                    className="hand mt-1 text-[14.5px] leading-[1.3]"
                    style={{ color: "var(--faint)" }}
                  >
                    an example, drawn so the sheet is on the table — write over
                    it, start a new fence, or pick one already standing in your
                    record
                  </p>
                )}

                <div className="mt-4 grid gap-x-8 gap-y-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
                  <div className="min-w-0 xl:order-2">
                    <div className="mx-auto w-full max-w-[34rem]">
                      <Gate fence={open} />
                      <p
                        className="hand mt-1 text-center text-[14px] leading-[1.3]"
                        style={{ color: "var(--muted)" }}
                      >
                        {drawn(open)}
                      </p>
                    </div>
                  </div>
                  <div className="min-w-0 xl:order-1">
                    <div>
                      <Label>what it costs to keep</Label>
                      <textarea
                        ref={(el) => grow(el)}
                        onInput={(e) => grow(e.currentTarget)}
                        value={open.cost}
                        onChange={(e) => patch({ cost: e.target.value })}
                        onBlur={commit}
                        readOnly={!writable}
                        rows={1}
                        placeholder="what it costs you as it stands — in your words"
                        aria-label="What it costs to keep"
                        className="fn-case mt-1 w-full resize-none overflow-hidden bg-transparent px-0 py-1 text-[15.5px] leading-[1.55]"
                        style={{ color: "var(--ink)" }}
                      />
                    </div>

                    <div className="mt-5">
                      <Label>who put it up</Label>
                      <div className="mt-2">
                        <Seg
                          label="who put it up"
                          options={MAKERS}
                          labels={MAKER_LABEL}
                          value={open.maker}
                          disabled={!writable}
                          onPick={(m) =>
                            set({ maker: open.maker === m ? "" : m })
                          }
                        />
                      </div>
                      <div className="mt-2 grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_11rem]">
                        <input
                          value={open.by}
                          onChange={(e) => patch({ by: e.target.value })}
                          onBlur={commit}
                          readOnly={!writable}
                          placeholder={
                            open.maker === "me"
                              ? "when you did, and what was happening"
                              : "who, or which — a name, a team, a law"
                          }
                          aria-label="Who put it up"
                          className="fn-case hand min-w-0 bg-transparent text-[18px] leading-[1.25]"
                          style={{ color: "var(--ink)" }}
                        />
                        <input
                          value={open.when}
                          onChange={(e) => patch({ when: e.target.value })}
                          onBlur={commit}
                          readOnly={!writable}
                          placeholder="when — a year, a day"
                          aria-label="When it was put up"
                          className="fn-case hand min-w-0 bg-transparent text-[18px] leading-[1.25]"
                          style={{ color: "var(--ink)" }}
                        />
                      </div>
                      {open.stone && /^\d{4}-\d{2}-\d{2}$/.test(open.when) && (
                        <p
                          className="meta mt-1.5"
                          style={{
                            color: "var(--faint)",
                            textTransform: "none",
                          }}
                        >
                          {whenWords(open.when)} is the day its file first
                          appears in the record
                        </p>
                      )}
                    </div>

                    {!kept && writable && (
                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        <Chip onClick={setDown} accent>
                          set it down
                        </Chip>
                        <span
                          className="hand text-[14.5px]"
                          style={{ color: "var(--faint)" }}
                        >
                          nothing is kept until you set it down or make the call
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── what it might be for ────────────────────────────────── */}
                <div
                  className="mt-7"
                  style={{ borderTop: "1px solid var(--rule)", paddingTop: 14 }}
                >
                  <Label>what might it be for?</Label>
                  <p
                    className="hand mt-1 text-[15px] leading-[1.3]"
                    style={{ color: "var(--muted)" }}
                  >
                    go away and think. a guess is a start — then find out: ask
                    whoever put it up, read what was written when it went up, or
                    watch what it does. then say whether each reason still
                    holds.
                  </p>
                  <ol className="mt-3 flex flex-col gap-4">
                    {open.uses.map((u, i) => (
                      <li
                        key={u.id}
                        className="fn-row"
                        style={{ ["--i" as string]: i }}
                      >
                        <div className="flex items-start gap-3">
                          <RailGlyph use={u} />
                          <div className="min-w-0 flex-1">
                            {u.by === "garden" && (
                              <div
                                className="meta"
                                style={{
                                  color: "var(--faint)",
                                  textTransform: "none",
                                }}
                              >
                                the record says
                                {u.kept ? "" : " · hollow until you keep it"}
                              </div>
                            )}
                            <input
                              value={u.text}
                              onChange={(e) =>
                                setUse(u.id, { text: e.target.value }, false)
                              }
                              onBlur={commit}
                              readOnly={!writable}
                              aria-label="What it might be for"
                              className="fn-case hand w-full bg-transparent text-[19px] leading-[1.25]"
                              style={{
                                color: u.kept ? "var(--ink)" : "var(--muted)",
                              }}
                            />
                            {u.kept ? (
                              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-5 gap-y-1">
                                <Seg
                                  label={`how you know ${u.id}`}
                                  options={KNOWN}
                                  labels={KNOWN_LABEL}
                                  value={u.known}
                                  disabled={!writable}
                                  onPick={(k) => setUse(u.id, { known: k })}
                                />
                                <Seg
                                  label={`whether it holds ${u.id}`}
                                  options={HOLDS}
                                  labels={HOLDS_LABEL}
                                  value={u.holds}
                                  disabled={!writable}
                                  onPick={(h) =>
                                    setUse(u.id, {
                                      holds: u.holds === h ? "" : h,
                                    })
                                  }
                                />
                                {(writable || u.instead) && (
                                  <button
                                    onClick={() =>
                                      setInsteadFor(
                                        insteadFor === u.id ? null : u.id,
                                      )
                                    }
                                    disabled={!writable}
                                    className="fn-link text-[11px]"
                                    style={{
                                      ...mono,
                                      letterSpacing: "0.04em",
                                      color: u.instead
                                        ? "var(--muted)"
                                        : "var(--faint)",
                                    }}
                                  >
                                    {u.instead
                                      ? `something else does this now: ${u.instead}`
                                      : "something else does this now?"}
                                  </button>
                                )}
                              </div>
                            ) : (
                              writable && (
                                <div className="mt-1.5 flex gap-1.5">
                                  <Chip
                                    on
                                    onClick={() => setUse(u.id, { kept: true })}
                                  >
                                    keep
                                  </Chip>
                                  <Chip
                                    onClick={() =>
                                      set({
                                        uses: open.uses.filter(
                                          (x) => x.id !== u.id,
                                        ),
                                      })
                                    }
                                  >
                                    drop
                                  </Chip>
                                </div>
                              )
                            )}
                            {insteadFor === u.id && writable && (
                              <input
                                autoFocus
                                value={u.instead}
                                onChange={(e) =>
                                  setUse(
                                    u.id,
                                    { instead: e.target.value },
                                    false,
                                  )
                                }
                                onBlur={commit}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === "Escape")
                                    setInsteadFor(null);
                                }}
                                placeholder="what does this job now, if anything"
                                aria-label="What else does this now"
                                className="fn-case fn-arrive hand mt-1.5 w-full bg-transparent text-[16px] leading-[1.25]"
                                style={{ color: "var(--ink)" }}
                              />
                            )}
                          </div>
                          {writable && u.kept && (
                            <button
                              onClick={() =>
                                set({
                                  uses: open.uses.filter((x) => x.id !== u.id),
                                })
                              }
                              className="fn-link meta mt-2 shrink-0 px-1"
                              style={{ color: "var(--faint)" }}
                              aria-label="Take this one off"
                              title="take this one off"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                  {writable && (
                    <div className="mt-4 flex items-center gap-3">
                      <span className="w-8 shrink-0" aria-hidden />
                      <input
                        value={useText}
                        onChange={(e) => setUseText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addUse();
                        }}
                        placeholder={
                          open.uses.length
                            ? "another thing it might be for"
                            : "what might it be for? a guess is a start"
                        }
                        aria-label="Another thing it might be for"
                        className="fn-case hand min-w-0 flex-1 bg-transparent text-[19px] leading-[1.25]"
                        style={{ color: "var(--ink)" }}
                      />
                      <Chip onClick={addUse} disabled={!useText.trim()}>
                        add
                      </Chip>
                    </div>
                  )}
                </div>

                {/* ── what would come through · putting it back ──────────── */}
                <div
                  className="mt-7 grid gap-x-8 gap-y-6 md:grid-cols-2"
                  style={{ borderTop: "1px solid var(--rule)", paddingTop: 14 }}
                >
                  <div className="min-w-0">
                    <Label>
                      if it came down tomorrow, what would come through?
                    </Label>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {open.through.map((t, i) => (
                        <li
                          key={t.id}
                          className="fn-row flex items-baseline gap-2"
                          style={{ ["--i" as string]: i }}
                        >
                          <input
                            value={t.text}
                            onChange={(e) =>
                              setThrough(t.id, { text: e.target.value }, false)
                            }
                            onBlur={commit}
                            readOnly={!writable}
                            aria-label="What would come through"
                            className="fn-case hand min-w-0 flex-1 bg-transparent text-[18px] leading-[1.25]"
                            style={{ color: "var(--ink)" }}
                          />
                          {writable && (
                            <button
                              onClick={() =>
                                set({
                                  through: open.through.filter(
                                    (x) => x.id !== t.id,
                                  ),
                                })
                              }
                              className="fn-link meta shrink-0 px-1"
                              style={{ color: "var(--faint)" }}
                              aria-label="Take this one off"
                              title="take this one off"
                            >
                              ×
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                    {writable && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          value={throughText}
                          onChange={(e) => setThroughText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addThrough();
                          }}
                          placeholder="something that would come through"
                          aria-label="Something that would come through"
                          className="fn-case hand min-w-0 flex-1 bg-transparent text-[18px] leading-[1.25]"
                          style={{ color: "var(--ink)" }}
                        />
                        <Chip
                          onClick={addThrough}
                          disabled={!throughText.trim()}
                        >
                          add
                        </Chip>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <Label>if it has to go back up</Label>
                    <div className="mt-2">
                      <Seg
                        label="whether it could go back up"
                        options={BACKS}
                        labels={BACK_LABEL}
                        value={open.back}
                        disabled={!writable}
                        onPick={(b) => set({ back: open.back === b ? "" : b })}
                      />
                    </div>
                    <input
                      value={open.backHow}
                      onChange={(e) => patch({ backHow: e.target.value })}
                      onBlur={commit}
                      readOnly={!writable}
                      placeholder="what putting it back would take"
                      aria-label="What putting it back would take"
                      className="fn-case hand mt-2 w-full bg-transparent text-[18px] leading-[1.25]"
                      style={{ color: "var(--ink)" }}
                    />
                  </div>
                </div>

                {/* ── the call ─────────────────────────────────────────────── */}
                <div
                  className="mt-7"
                  style={{ borderTop: "1px solid var(--rule)", paddingTop: 14 }}
                >
                  <Label>the call · yours</Label>
                  {open.calls.length > 0 && (
                    <ol className="mt-2 flex flex-col gap-1">
                      {open.calls.map((c, i) => (
                        <li
                          key={`${c.on}-${i}`}
                          className="fn-row flex flex-wrap items-baseline gap-x-2"
                          style={{
                            ["--i" as string]: i,
                            color:
                              i === open.calls.length - 1
                                ? "var(--ink)"
                                : "var(--muted)",
                          }}
                        >
                          <span
                            className="meta"
                            style={{
                              color: "var(--faint)",
                              textTransform: "none",
                            }}
                          >
                            {dayWords(c.on)}
                          </span>
                          <span className="hand text-[18px] leading-[1.25]">
                            {CALL_LABEL[c.call]}
                            {c.call === "trial" && c.until
                              ? `, until ${dayWords(c.until)}`
                              : ""}
                            {c.unseen ? " · before a use was found" : ""}
                          </span>
                          {c.note && (
                            <span className="text-[13.5px] leading-[1.5]">
                              — {c.note}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                  {due && (
                    <p className="meta mt-2" style={{ color: "var(--accent)" }}>
                      the day to look again,{" "}
                      {dayWords(open.calls.at(-1)!.until)}, has come
                    </p>
                  )}
                  {writable && (
                    <>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {callsFrom(state).map((k) => (
                          <Chip
                            key={k}
                            on={pending?.call === k}
                            onClick={() => pick(k)}
                          >
                            {k === "down" && state === "trial"
                              ? "leave it down"
                              : CALL_ASK[k]}
                          </Chip>
                        ))}
                      </div>
                      {pending && (
                        <div className="fn-arrive mt-3 flex flex-col gap-2.5">
                          <input
                            autoFocus
                            value={pending.note}
                            onChange={(e) =>
                              setPending((p) =>
                                p ? { ...p, note: e.target.value } : p,
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") makeCall();
                            }}
                            placeholder={NOTE_ASK[pending.call]}
                            aria-label="The call, in a line"
                            className="fn-case hand w-full bg-transparent text-[18px] leading-[1.25]"
                            style={{ color: "var(--ink)" }}
                          />
                          {pending.call === "trial" && (
                            <label
                              className="flex flex-wrap items-baseline gap-2 text-[11px]"
                              style={{ ...mono, color: "var(--muted)" }}
                            >
                              look again on
                              <input
                                type="date"
                                value={pending.until}
                                min={today}
                                onChange={(e) =>
                                  setPending((p) =>
                                    p ? { ...p, until: e.target.value } : p,
                                  )
                                }
                                className="fn-case bg-transparent"
                                style={{ ...mono, color: "var(--ink)" }}
                              />
                            </label>
                          )}
                          {downing && !found && (
                            <p
                              className="hand text-[15px] leading-[1.3]"
                              style={{ color: "var(--muted)" }}
                            >
                              no use found yet — every one set down is a guess.
                              it can still come down; the record will say so.
                            </p>
                          )}
                          <div>
                            <Chip onClick={makeCall} accent>
                              {sure === "call"
                                ? "down without knowing what it was for — sure?"
                                : `make the call · ${pending.call === "down" && state === "trial" ? "leave it down" : CALL_ASK[pending.call]}`}
                            </Chip>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* ── afterwards ───────────────────────────────────────────── */}
                {cameDown(open) && (
                  <div
                    className="fn-arrive mt-7"
                    style={{
                      borderTop: "1px solid var(--rule)",
                      paddingTop: 14,
                    }}
                  >
                    <Label>afterwards · what came through</Label>
                    {open.through.length > 0 ? (
                      <ul className="mt-2 flex flex-col gap-2">
                        {open.through.map((t) => (
                          <li
                            key={t.id}
                            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
                          >
                            <span
                              className="hand text-[18px] leading-[1.25]"
                              style={{
                                color:
                                  t.came === "not"
                                    ? "var(--faint)"
                                    : "var(--ink)",
                              }}
                            >
                              {t.text}
                            </span>
                            <Seg
                              label={`came through ${t.id}`}
                              options={["came", "not"] as const}
                              labels={{
                                came: "came through",
                                not: "did not come",
                              }}
                              value={t.came}
                              disabled={!writable}
                              onPick={(c) =>
                                setThrough(t.id, {
                                  came: t.came === c ? "" : c,
                                })
                              }
                            />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p
                        className="hand mt-1 text-[15px]"
                        style={{ color: "var(--muted)" }}
                      >
                        nothing was listed as coming through
                      </p>
                    )}
                    <textarea
                      ref={(el) => grow(el)}
                      onInput={(e) => grow(e.currentTarget)}
                      value={open.after}
                      onChange={(e) => patch({ after: e.target.value })}
                      onBlur={commit}
                      readOnly={!writable}
                      rows={2}
                      placeholder="afterwards, in your words — and anything that came through that you did not list"
                      aria-label="Afterwards"
                      className="fn-case mt-3 w-full resize-none overflow-hidden bg-transparent px-0 py-1 text-[15.5px] leading-[1.55]"
                      style={{ color: "var(--ink)" }}
                    />
                  </div>
                )}

                {kept && writable && (
                  <div className="mt-6 flex flex-wrap gap-1.5">
                    <Chip
                      onClick={() =>
                        sure === "fence" ? void remove() : setSure("fence")
                      }
                      accent={sure === "fence"}
                    >
                      {sure === "fence"
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
              <Sketch seed="fence-reading" draw />
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
              <Sketch seed="fence-record" draw />
              <Label>the record</Label>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                {payload ? record.join(" · ") : "reading…"}
              </p>
              {fences.length > 0 && (
                <ol className="mt-2 flex flex-col">
                  {fences.slice(0, 24).map((f, i) => {
                    const on = kept && open?.slug === f.slug;
                    return (
                      <li
                        key={f.slug}
                        className="fn-row"
                        style={{ ["--i" as string]: i }}
                      >
                        <button
                          onClick={() => load(f)}
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
                            {dayWords(f.put)} · {STATE_SHORT[stateOf(f)]}
                            {isDue(f, today)
                              ? " · a day to look again has come"
                              : ""}
                          </span>
                          <span
                            className="display text-[15.5px] leading-[1.25]"
                            style={{ color: "var(--ink)" }}
                          >
                            {f.fence}
                          </span>
                          <span
                            className="hand text-[14.5px]"
                            style={{ color: "var(--muted)" }}
                          >
                            {hasUse(f)
                              ? "a use found"
                              : f.uses.length
                                ? "no use found yet"
                                : "nothing set down yet that it might be for"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            {standing.length > 0 && (
              <section
                className="panel sketched rise relative p-4"
                style={{ borderRadius: 3, animationDelay: "180ms" }}
                aria-label="Fences already standing"
              >
                <Sketch seed="fence-standing" draw />
                <Label>fences already standing</Label>
                <p
                  className="hand mt-1 text-[14.5px] leading-[1.3]"
                  style={{ color: "var(--muted)" }}
                >
                  the rules in your record, oldest first, each with the reason
                  you gave then
                </p>
                <ol className="mt-2 flex flex-col">
                  {shownStanding.map((s, i) => {
                    const looked = fences.some((f) => f.stone === s.id);
                    return (
                      <li
                        key={s.id}
                        className="fn-row"
                        style={{ ["--i" as string]: i }}
                      >
                        <button
                          onClick={() => openRule(s)}
                          className="-mx-1.5 flex w-[calc(100%+0.75rem)] flex-col gap-0.5 rounded px-1.5 py-1.5 text-left"
                        >
                          <span
                            className="meta"
                            style={{
                              color: "var(--faint)",
                              textTransform: "none",
                            }}
                          >
                            {s.since
                              ? `since ${whenWords(s.since)}`
                              : "not yet in the record's history"}
                            {looked ? " · looked at" : ""}
                          </span>
                          <span
                            className="hand text-[16.5px] leading-[1.2]"
                            style={{ color: "var(--ink)" }}
                          >
                            {s.label}
                          </span>
                          <span
                            className="fn-clamp text-[12.5px] leading-[1.5]"
                            style={{
                              color: s.why ? "var(--muted)" : "var(--faint)",
                            }}
                          >
                            {s.why || "no reason written down"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
                {standing.length > 6 && (
                  <button
                    onClick={() => setAllStanding(!allStanding)}
                    className="fn-link meta mt-2"
                    style={{ color: "var(--muted)" }}
                  >
                    {allStanding ? "fewer" : `all ${standing.length}`}
                  </button>
                )}
              </section>
            )}

            <section
              className="panel sketched rise relative p-4"
              style={{ borderRadius: 3, animationDelay: "220ms" }}
              aria-label="What the fence holds to"
            >
              <Sketch seed="fence-laws" draw />
              <Label>what the fence holds to</Label>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                Before a fence comes down, say what it was for. The sheet asks
                how you know each reason — a guess, or found out by asking,
                reading or watching — and draws the difference: found in ink,
                guessed in pencil, a reason that no longer holds as a broken
                rail. It asks what would come through and whether it could go
                back up. The call is yours, and dated. Nothing here says whether
                a fence should come down, and nothing keeps one for being old.
                The one lean is Chesterton&apos;s: taking a fence down before a
                use is found asks once more, and the record says so.
              </p>
              <blockquote
                className="hand mt-3 text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                &ldquo;If you don&apos;t see the use of it, I certainly
                won&apos;t let you clear it away. Go away and think.&rdquo;
              </blockquote>
              <p
                className="meta mt-1"
                style={{ color: "var(--faint)", textTransform: "none" }}
              >
                G. K. Chesterton, The Thing (1929)
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
