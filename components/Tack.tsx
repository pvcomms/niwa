"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  LAYER_KIND,
  LAYER_LABEL,
  MOVES,
  MOVES_LABEL,
  MOVES_SHORT,
  RENTS,
  RENT_LABEL,
  adopt,
  clampLean,
  daysBetween,
  emptyClaim,
  keepAll,
  leanNow,
  leansOnValues,
  proposedCount,
  readings,
  tally,
  uid,
  validateProposal,
  wholeReadings,
  type Claim,
  type Layer,
  type Moves,
  type Rent,
  type Tack as T,
} from "@/lib/tack";
import { rand, seedOf, stroke } from "@/lib/hand";
import { putOnDesk } from "./desk";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

type Payload = {
  claims: Claim[];
  values: { name: string; terms: string[] }[];
  about: { id: string; label: string; first: string } | null;
  writable: boolean;
  dir: string | null;
  model: string | null;
};

const mono = { fontFamily: "var(--font-mono)" } as const;
const chip = "chip tk-seg px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const plusDays = (day: string, k: number) => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + k);
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

/** The lean over its tacks: a pen line between the marks, so at top, not so at bottom, the middle dashed. */
function LeanPath({
  tacks,
  seed,
  w = 320,
  h = 132,
}: {
  tacks: T[];
  seed: string;
  w?: number;
  h?: number;
}) {
  const pad = 26;
  const top = 16;
  const bottom = 30;
  const n = tacks.length;
  const yOf = (at: number) => top + ((99 - at) / 98) * (h - top - bottom);
  const xOf = (i: number) =>
    n <= 1 ? pad : pad + (i * (w - 2 * pad)) / (n - 1);
  const { d, crossed } = useMemo(() => {
    const r = rand(seedOf(seed));
    let path = "";
    let cross = "";
    for (let i = 1; i < n; i++) {
      const s = stroke(
        [xOf(i - 1), yOf(tacks[i - 1].at)],
        [xOf(i), yOf(tacks[i].at)],
        r,
        0.9,
      );
      path += s;
      if (
        (tacks[i - 1].at < 50 && tacks[i].at > 50) ||
        (tacks[i - 1].at > 50 && tacks[i].at < 50)
      )
        cross += s;
    }
    return { d: path, crossed: cross };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, n, tacks.map((t) => t.at).join(","), w, h]);
  const mid = yOf(50);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="tk-path w-full"
      role="img"
      aria-label="Where the lean has been, tack by tack"
    >
      <text x={4} y={top + 3} fontSize={7.5} style={mono} fill="var(--faint)">
        so
      </text>
      <text
        x={4}
        y={h - bottom + 3}
        fontSize={7.5}
        style={mono}
        fill="var(--faint)"
      >
        not
      </text>
      <line
        x1={pad - 8}
        x2={w - pad + 8}
        y1={mid}
        y2={mid}
        stroke="var(--rule)"
        strokeDasharray="3 4"
      />
      <line
        x1={pad - 8}
        x2={pad - 8}
        y1={top}
        y2={h - bottom}
        stroke="var(--rule)"
      />
      {d && (
        <path
          d={d}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={1.3}
          strokeLinecap="round"
          pathLength={1}
          className="draw"
        />
      )}
      {crossed && (
        <path
          d={crossed}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.3}
          strokeLinecap="round"
          pathLength={1}
          className="draw"
        />
      )}
      {tacks.map((t, i) => (
        <g key={`${t.on}-${i}`}>
          <circle
            cx={xOf(i)}
            cy={yOf(t.at)}
            r={i === n - 1 ? 3.6 : 2.6}
            fill={i === n - 1 ? "var(--ink)" : "var(--surface)"}
            stroke="var(--ink)"
            strokeWidth={1.2}
          />
          <text
            x={xOf(i)}
            y={yOf(t.at) - 7}
            fontSize={7.5}
            textAnchor="middle"
            style={mono}
            fill={i === n - 1 ? "var(--ink)" : "var(--faint)"}
          >
            {t.at}
          </text>
          {(i === 0 || i === n - 1 || n <= 6) && (
            <text
              x={xOf(i)}
              y={h - 8}
              fontSize={7}
              textAnchor={
                i === 0 && n > 1
                  ? "start"
                  : i === n - 1 && n > 1
                    ? "end"
                    : "middle"
              }
              style={mono}
              fill="var(--faint)"
            >
              {t.on.slice(5)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/** One row's lean along a short line: the marks it has held hollow, the current one filled. */
function LeanLine({
  tacks,
  w = 150,
  h = 16,
}: {
  tacks: T[];
  w?: number;
  h?: number;
}) {
  const pad = 5;
  const xOf = (at: number) => pad + (at / 100) * (w - 2 * pad);
  const n = tacks.length;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      aria-hidden
      className="shrink-0"
    >
      <line x1={pad} x2={w - pad} y1={h / 2} y2={h / 2} stroke="var(--rule)" />
      <line
        x1={xOf(50)}
        x2={xOf(50)}
        y1={h / 2 - 4}
        y2={h / 2 + 4}
        stroke="var(--rule)"
      />
      {tacks.slice(0, -1).map((t, i) => (
        <circle
          key={i}
          cx={xOf(t.at)}
          cy={h / 2}
          r={2.2}
          fill="var(--surface)"
          stroke="var(--faint)"
          strokeWidth={1}
        />
      ))}
      {n > 0 && (
        <circle
          cx={xOf(tacks[n - 1].at)}
          cy={h / 2}
          r={3.2}
          fill="var(--ink)"
        />
      )}
    </svg>
  );
}

/** A commitment's window: from the day it was chosen to the day it may be looked at again; today's tick; the accent once open. */
function WindowBar({
  chosen,
  until,
  letGo,
  today,
  w = 150,
  h = 16,
}: {
  chosen: string;
  until: string;
  letGo: string;
  today: string;
  w?: number;
  h?: number;
}) {
  const pad = 5;
  const end = letGo || today;
  if (!until)
    return (
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width={w > 200 ? undefined : w}
        height={w > 200 ? undefined : h}
        aria-hidden
        className={w > 200 ? "w-full" : "shrink-0"}
      >
        <line
          x1={pad}
          x2={w - pad}
          y1={h / 2}
          y2={h / 2}
          stroke="var(--rule)"
          strokeDasharray="2 4"
        />
        <circle cx={pad} cy={h / 2} r={3} fill="var(--ink)" />
      </svg>
    );
  const span = Math.max(1, daysBetween(chosen, until));
  const t = Math.min(1, Math.max(0, daysBetween(chosen, end) / span));
  const open = !letGo && daysBetween(until, today) >= 0;
  const x = pad + t * (w - 2 * pad);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w > 200 ? undefined : w}
      height={w > 200 ? undefined : h}
      aria-hidden
      className={w > 200 ? "w-full" : "shrink-0"}
    >
      <line x1={pad} x2={w - pad} y1={h / 2} y2={h / 2} stroke="var(--rule)" />
      <line
        x1={pad}
        x2={x}
        y1={h / 2}
        y2={h / 2}
        stroke={open ? "var(--accent)" : letGo ? "var(--faint)" : "var(--ink)"}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <line
        x1={w - pad}
        x2={w - pad}
        y1={h / 2 - 5}
        y2={h / 2 + 5}
        stroke={open ? "var(--accent)" : "var(--ink)"}
      />
      <circle
        cx={x}
        cy={h / 2}
        r={3}
        fill={letGo ? "var(--surface)" : "var(--ink)"}
        stroke="var(--ink)"
        strokeWidth={1}
      />
    </svg>
  );
}

/** Where you lean, between the ends: a hairline track, the accent for the thumb, the number beside it. */
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
    <div className="mt-2 flex items-center gap-3">
      <span className="hand shrink-0 text-[15px]" style={{ color: "var(--faint)" }}>
        not so
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
      <span className="hand shrink-0 text-[15px]" style={{ color: "var(--faint)" }}>
        so
      </span>
      <span className="meta w-[7ch] shrink-0 text-right" style={{ color: "var(--ink)", textTransform: "none" }}>
        {value} <span style={{ color: "var(--faint)" }}>/100</span>
      </span>
    </div>
  );
}

/**
 * The tack: a claim sorted by the flinch into the sails or the hull. In the
 * sails a belief leans on a line and is moved a tack at a time, each move
 * dated with what was seen and what it matched; in the hull a commitment is
 * held until a day the reader named, reopened only on the record. The desk
 * reads the tacks, the steps, the crossings, the rent, the window. Nothing
 * here says whether a claim is so.
 */
export default function Tack() {
  const [theme, setTheme] = useTheme();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [open, setOpen] = useState<Claim | null>(null);
  const [text, setText] = useState("");
  const [layer0, setLayer0] = useState<Layer | null>(null);
  const [flinch0, setFlinch0] = useState("");
  const [at0, setAt0] = useState(50);
  const [until0, setUntil0] = useState("");
  const [saw, setSaw] = useState("");
  const [atNew, setAtNew] = useState<number | null>(null);
  const [rentNew, setRentNew] = useState<Rent>("");
  const [newLook, setNewLook] = useState("");
  const [newMoves, setNewMoves] = useState<Moves>("either");
  const [reopening, setReopening] = useState(false);
  const [saidNew, setSaidNew] = useState("");
  const [untilNew, setUntilNew] = useState("");
  const [asking, setAsking] = useState(false);
  const [askingGarden, setAskingGarden] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [trouble, setTrouble] = useState<string | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const openRef = useRef<Claim | null>(null);
  const slugRef = useRef("");
  const saving = useRef<Promise<void>>(Promise.resolve());
  openRef.current = open;
  const today = useMemo(localToday, []);
  const writable = payload?.writable ?? false;

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const slug = p.get("slug");
    const id = p.get("id");
    fetch(`/api/tack${id ? `?id=${encodeURIComponent(id)}` : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((pl: Payload | null) => {
        if (!pl) {
          setTrouble("the claims could not be read");
          return;
        }
        setPayload(pl);
        if (pl.about) setText((t) => t || pl.about!.first || pl.about!.label);
        if (slug) {
          const c = pl.claims.find((x) => x.slug === slug);
          if (c) {
            slugRef.current = c.slug;
            setOpen(c);
          }
        }
      })
      .catch(() => setTrouble("the claims could not be read"));
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (open?.slug) url.searchParams.set("slug", open.slug);
    else url.searchParams.delete("slug");
    window.history.replaceState(null, "", url);
    putOnDesk(open ? { kind: "tack", id: open.slug, label: open.title } : null);
  }, [open?.slug, open?.title, open]);
  useEffect(() => () => putOnDesk(null), []);

  /* ── keeping ─────────────────────────────────────────────────────────── */

  const save = useCallback(
    (c: Claim) =>
      new Promise<Claim | null>((resolve) => {
        saving.current = saving.current.then(async () => {
          const fresh = !slugRef.current;
          try {
            const r = await fetch("/api/tack", {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                claim: { ...c, slug: slugRef.current || c.slug },
                fresh,
              }),
            });
            const out = (await r.json().catch(() => null)) as
              Claim | { error: string } | null;
            if (!r.ok || !out || "error" in out) {
              setTrouble(
                out && "error" in out ? out.error : `not kept (${r.status})`,
              );
              resolve(null);
              return;
            }
            slugRef.current = out.slug;
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
                    claims: p.claims.some((x) => x.slug === out.slug)
                      ? p.claims.map((x) =>
                          x.slug === out.slug ? { ...c, ...out } : x,
                        )
                      : [{ ...c, ...out }, ...p.claims],
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

  const keepNow = useCallback(
    (next: Claim) => {
      setTrouble(null);
      setOpen(next);
      if (writable) void save(next);
    },
    [save, writable],
  );
  const commit = useCallback(() => {
    if (openRef.current && writable) void save(openRef.current);
  }, [save, writable]);

  const begin = useCallback(() => {
    if (!writable || !text.trim() || !layer0) return;
    slugRef.current = "";
    keepNow({
      ...emptyClaim(today),
      text: text.trim(),
      layer: layer0,
      flinch: flinch0.trim(),
      stone: payload?.about?.id ?? null,
      tacks:
        layer0 === "sail"
          ? [{ on: today, at: clampLean(at0), saw: "First put.", rent: "" }]
          : [],
      chosen: layer0 === "hull" ? today : "",
      until: layer0 === "hull" ? until0 : "",
    });
    setText("");
    setLayer0(null);
    setFlinch0("");
    setAt0(50);
    setUntil0("");
  }, [writable, text, layer0, flinch0, at0, until0, today, keepNow, payload]);

  const openOne = (c: Claim) => {
    slugRef.current = c.slug;
    setOpen(c);
    setSaid(null);
    setSure(null);
    setReopening(false);
    setAtNew(null);
    setSaw("");
    setRentNew("");
  };
  const close = () => {
    slugRef.current = "";
    setOpen(null);
    setSaid(null);
    setSure(null);
    setReopening(false);
  };

  const patch = (p: Partial<Claim>) => setOpen((c) => (c ? { ...c, ...p } : c));

  const addTack = () => {
    const c = openRef.current;
    if (!c || !writable) return;
    const at = clampLean(atNew ?? leanNow(c) ?? 50);
    if (!saw.trim() && at === leanNow(c)) return;
    keepNow({
      ...c,
      tacks: [...c.tacks, { on: today, at, saw: saw.trim(), rent: rentNew }],
    });
    setSaw("");
    setRentNew("");
    setAtNew(null);
  };
  const takeBackTack = () => {
    const c = openRef.current;
    if (!c || !writable || c.tacks.length < 2) return;
    keepNow({ ...c, tacks: c.tacks.slice(0, -1) });
  };

  const addLook = () => {
    const c = openRef.current;
    const t = newLook.trim();
    if (!c || !t || !writable) return;
    keepNow({
      ...c,
      looks: [
        ...c.looks,
        {
          id: uid(),
          text: t,
          moves: newMoves,
          by: "you",
          kept: true,
          looked: "",
          stone: null,
        },
      ],
    });
    setNewLook("");
  };
  const lookPatch = (id: string, p: Partial<Claim["looks"][number]>) => {
    const c = openRef.current;
    if (!c) return;
    keepNow({
      ...c,
      looks: c.looks.map((l) => (l.id === id ? { ...l, ...p } : l)),
    });
  };
  const dropLook = (id: string) => {
    const c = openRef.current;
    if (!c) return;
    keepNow({ ...c, looks: c.looks.filter((l) => l.id !== id) });
  };

  const askGarden = useCallback(async () => {
    const c = openRef.current;
    if (!c || !writable || askingGarden) return;
    setAskingGarden(true);
    setSaid(null);
    setTrouble(null);
    try {
      const r = await fetch(
        `/api/tack?q=${encodeURIComponent(c.text)}${c.stone ? `&except=${encodeURIComponent(c.stone)}` : ""}`,
      );
      const j = (await r.json().catch(() => null)) as {
        looks?: unknown;
      } | null;
      if (!r.ok || !j || !Array.isArray(j.looks)) {
        setTrouble(`the garden did not answer (${r.status})`);
        return;
      }
      const cur = openRef.current ?? c;
      const next = adopt(cur, { looks: j.looks as Claim["looks"] }, today);
      const added = proposedCount(next) - proposedCount(cur);
      keepNow(next);
      setSaid(
        added
          ? `${added} ${added === 1 ? "place" : "places"} the garden offers to go back to — hollow until you keep them`
          : "the garden has no stone that speaks of the same things, or every one it has is already on the sheet",
      );
    } finally {
      setAskingGarden(false);
    }
  }, [writable, askingGarden, keepNow, today]);

  const askModel = useCallback(async () => {
    const c = openRef.current;
    if (!c || !writable || asking) return;
    setAsking(true);
    setSaid(null);
    setTrouble(null);
    try {
      const r = await fetch("/api/tack", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ claim: c }),
      });
      const j = (await r.json().catch(() => null)) as {
        proposal?: unknown;
        ms?: number;
        error?: string;
      } | null;
      if (!r.ok || !j || j.error || !j.proposal) {
        setTrouble(j?.error ?? `the model did not answer (${r.status})`);
        return;
      }
      const cur = openRef.current ?? c;
      const next = adopt(cur, validateProposal(j.proposal), today);
      const added = proposedCount(next) - proposedCount(cur);
      keepNow(next);
      setSaid(
        added
          ? `${added} proposed in ${Math.round((j.ms ?? 0) / 1000)}s — hollow until you keep them. It was asked what to look at, not whether this is so.`
          : "nothing new — every look it named is already on the sheet",
      );
    } finally {
      setAsking(false);
    }
  }, [writable, asking, keepNow, today]);

  const reopen = (went: "held" | "let-go") => {
    const c = openRef.current;
    if (!c || !writable) return;
    const early = Boolean(c.until) && daysBetween(today, c.until) > 0;
    const until = went === "held" ? untilNew : "";
    keepNow({
      ...c,
      reopened: [
        ...c.reopened,
        { on: today, said: saidNew.trim(), went, until, early },
      ],
      until: went === "held" ? until : c.until,
      letGo: went === "let-go" ? today : c.letGo,
    });
    setReopening(false);
    setSaidNew("");
    setUntilNew("");
  };

  const moveLayer = () => {
    const c = openRef.current;
    if (!c || !writable) return;
    if (c.layer === "sail")
      keepNow({ ...c, layer: "hull", chosen: today, until: "", letGo: "" });
    else
      keepNow({
        ...c,
        layer: "sail",
        letGo: "",
        tacks: [
          ...c.tacks,
          {
            on: today,
            at: leanNow(c) ?? 50,
            saw: "Came up out of the hull: the flinch said evidence may move it after all.",
            rent: "",
          },
        ],
      });
    setSure(null);
  };

  const remove = useCallback(async () => {
    const c = openRef.current;
    if (!c || !writable) return;
    const r = await fetch(`/api/tack?slug=${encodeURIComponent(c.slug)}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      setTrouble(`not taken back (${r.status})`);
      return;
    }
    setPayload((p) =>
      p ? { ...p, claims: p.claims.filter((x) => x.slug !== c.slug) } : p,
    );
    close();
  }, [writable]);

  /* ── derived ─────────────────────────────────────────────────────────── */

  const values = payload?.values ?? [];
  const t = useMemo(() => (open ? tally(open, today) : null), [open, today]);
  const vals = useMemo(
    () => (open ? leansOnValues(open, values) : []),
    [open, values],
  );
  const words = useMemo(
    () => (open && t ? readings(open, t, vals) : []),
    [open, t, vals],
  );
  const whole = useMemo(
    () => (payload ? wholeReadings(payload.claims, today) : []),
    [payload, today],
  );
  const nProposed = open ? proposedCount(open) : 0;
  const sails = payload?.claims.filter((c) => c.layer === "sail") ?? [];
  const hull = payload?.claims.filter((c) => c.layer === "hull") ?? [];
  const now = open ? leanNow(open) : null;
  const atShown = atNew ?? now ?? 50;

  return (
    <main className="tack scroll-thin relative h-dvh w-full overflow-y-auto">
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
                tack
              </div>
              <p
                className="hand mt-1 max-w-[27rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                You cannot sail straight at what is so. Hold a heading, see what
                the water does, correct — a tack at a time. Beliefs in the
                sails, loose. Commitments in the hull, fixed.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/tack" />
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
            <section
              className="panel sketched rise relative p-5 sm:p-8"
              style={{ borderRadius: 3, animationDelay: "60ms" }}
              aria-label="Set a claim down"
            >
              <Sketch seed="tack-begin" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                the claim
              </div>
              {payload?.about && (
                <p
                  className="hand mt-1 text-[16px]"
                  style={{ color: "var(--muted)" }}
                >
                  about{" "}
                  <Link
                    href={`/catalogue?id=${encodeURIComponent(payload.about.id)}`}
                    className="tk-link"
                    style={{ color: "var(--ink)" }}
                  >
                    “{payload.about.label}”
                  </Link>
                </p>
              )}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                readOnly={!writable}
                rows={2}
                placeholder={
                  writable
                    ? "what you think is so — or what you will stay loyal to"
                    : "a deployed garden keeps no claims; open the specimen's"
                }
                aria-label="The claim"
                className="display tk-case scroll-thin mt-3 w-full resize-none bg-transparent px-0 py-2 text-[24px] leading-[1.25] sm:text-[28px]"
                style={{
                  color: "var(--ink)",
                  borderBottom: "1px solid var(--rule)",
                }}
              />

              <div className="meta mt-5" style={{ color: "var(--accent)" }}>
                the flinch
              </div>
              <p
                className="display mt-1 text-[19px] leading-[1.3]"
                style={{ color: "var(--ink)" }}
              >
                Do you want evidence to be able to change this?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Chip
                  on={layer0 === "sail"}
                  onClick={() => setLayer0("sail")}
                  disabled={!writable}
                >
                  yes — a belief, into the sails
                </Chip>
                <Chip
                  on={layer0 === "hull"}
                  onClick={() => setLayer0("hull")}
                  disabled={!writable}
                  accent={layer0 === "hull"}
                >
                  no — a commitment, into the hull
                </Chip>
              </div>
              <p
                className="hand mt-2 text-[15px] leading-[1.3]"
                style={{ color: "var(--faint)" }}
              >
                if even asking felt like a small betrayal, that flinch is the
                answer: it is a commitment, not a belief
              </p>
              <input
                value={flinch0}
                onChange={(e) => setFlinch0(e.target.value)}
                readOnly={!writable}
                placeholder="what the flinch said, in your words — optional"
                aria-label="What the flinch said"
                className="mt-3 w-full bg-transparent px-0 py-1 text-[14px]"
                style={{
                  color: "var(--ink)",
                  borderBottom: "1px solid var(--rule)",
                }}
              />

              {layer0 === "sail" && (
                <div className="tk-arrive mt-5">
                  <div className="meta" style={{ color: "var(--faint)" }}>
                    where you lean now
                  </div>
                  <Dial
                    value={at0}
                    onChange={setAt0}
                    label="Where you lean now"
                    writable={writable}
                  />
                  <p
                    className="hand mt-1 text-[15px]"
                    style={{ color: "var(--faint)" }}
                  >
                    never 0, never 100 — the ends are not places you can stand
                  </p>
                </div>
              )}
              {layer0 === "hull" && (
                <div className="tk-arrive mt-5">
                  <div className="meta" style={{ color: "var(--faint)" }}>
                    the window
                  </div>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span
                      className="hand text-[16px]"
                      style={{ color: "var(--muted)" }}
                    >
                      you will not look at this again before
                    </span>
                    <input
                      type="date"
                      value={until0}
                      min={today}
                      onChange={(e) => setUntil0(e.target.value)}
                      aria-label="Until"
                      className="bg-transparent px-0 py-0.5 text-[14px]"
                      style={{
                        ...mono,
                        color: "var(--ink)",
                        borderBottom: "1px solid var(--rule)",
                      }}
                    />
                    <span className="flex gap-1">
                      {[30, 90, 365].map((k) => (
                        <Chip
                          key={k}
                          onClick={() => setUntil0(plusDays(today, k))}
                          on={until0 === plusDays(today, k)}
                        >
                          {k === 365 ? "a year" : `${k} days`}
                        </Chip>
                      ))}
                    </span>
                  </div>
                  <p
                    className="hand mt-1 text-[15px]"
                    style={{ color: "var(--faint)" }}
                  >
                    a day you name — no evidence is owed, and none will be asked
                    for
                  </p>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Chip
                  onClick={begin}
                  disabled={!writable || !text.trim() || !layer0}
                  on={Boolean(text.trim() && layer0)}
                >
                  {layer0 === "hull"
                    ? "put it in the hull"
                    : layer0 === "sail"
                      ? "put it in the sails"
                      : "put it down"}
                </Chip>
                <span
                  className="hand text-[15px]"
                  style={{ color: "var(--faint)" }}
                >
                  sorted by your flinch, not by the tool
                </span>
              </div>

              {payload && payload.claims.length > 0 && (
                <>
                  <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
                    <div className="meta" style={{ color: "var(--accent)" }}>
                      the sails
                    </div>
                    <span
                      className="hand text-[15px]"
                      style={{ color: "var(--faint)" }}
                    >
                      beliefs — held loosely, moved a tack at a time
                    </span>
                  </div>
                  {sails.length ? (
                    <ol className="mt-2 flex flex-col">
                      {sails.map((c, i) => {
                        const tt = tally(c, today);
                        return (
                          <li key={c.slug} className="tk-row rounded-[3px]">
                            <button
                              onClick={() => openOne(c)}
                              className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 px-2 py-2 text-left"
                            >
                              <span
                                className="display min-w-0 flex-1 basis-[14rem] text-[19px] leading-tight"
                                style={{ color: "var(--ink)" }}
                              >
                                {c.title}
                              </span>
                              <LeanLine tacks={c.tacks} />
                              <span
                                className="meta w-full"
                                style={{
                                  color: "var(--faint)",
                                  textTransform: "none",
                                }}
                              >
                                at {tt.now ?? "—"} ·{" "}
                                {tt.n > 1
                                  ? `${tt.n - 1} ${tt.n === 2 ? "tack" : "tacks"}`
                                  : "not tacked"}
                                {tt.last && tt.n > 1
                                  ? ` · last ${tt.last.on}`
                                  : ""}
                                {tt.expects === "none"
                                  ? " · expects nothing yet"
                                  : ""}
                              </span>
                            </button>
                            {i < sails.length - 1 && (
                              <div className="rule mx-2 border-t" />
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p
                      className="meta mt-2"
                      style={{ color: "var(--faint)", textTransform: "none" }}
                    >
                      nothing in the sails
                    </p>
                  )}

                  <div className="relative mt-7 mb-5 h-4" aria-hidden>
                    <Sketch
                      kind="underline"
                      seed="the-waterline"
                      color="var(--accent)"
                      draw
                    />
                    <span
                      className="hand absolute left-1/2 -top-3 -translate-x-1/2 px-2 text-[15px]"
                      style={{
                        color: "var(--accent)",
                        background: "var(--surface)",
                      }}
                    >
                      the waterline
                    </span>
                  </div>

                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="meta" style={{ color: "var(--accent)" }}>
                      the hull
                    </div>
                    <span
                      className="hand text-[15px]"
                      style={{ color: "var(--faint)" }}
                    >
                      commitments — chosen, held until a day you named
                    </span>
                  </div>
                  {hull.length ? (
                    <ol className="mt-2 flex flex-col">
                      {hull.map((c, i) => {
                        const tt = tally(c, today);
                        return (
                          <li key={c.slug} className="tk-row rounded-[3px]">
                            <button
                              onClick={() => openOne(c)}
                              className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 px-2 py-2 text-left"
                            >
                              <span
                                className="display min-w-0 flex-1 basis-[14rem] text-[19px] leading-tight"
                                style={{
                                  color: c.letGo
                                    ? "var(--muted)"
                                    : "var(--ink)",
                                  textDecoration: c.letGo
                                    ? "line-through"
                                    : undefined,
                                  textDecorationColor: "var(--accent)",
                                }}
                              >
                                {c.title}
                              </span>
                              <WindowBar
                                chosen={c.chosen || c.opened}
                                until={c.until}
                                letGo={c.letGo}
                                today={today}
                              />
                              <span
                                className="meta w-full"
                                style={{
                                  color: tt.open
                                    ? "var(--accent)"
                                    : "var(--faint)",
                                  textTransform: "none",
                                }}
                              >
                                {c.letGo
                                  ? `let go ${c.letGo} · held ${tt.held} days`
                                  : !c.until
                                    ? `held ${tt.held} days · no window set`
                                    : tt.open
                                      ? `held ${tt.held} days · the window is open`
                                      : `held ${tt.held} days · opens ${c.until}`}
                              </span>
                            </button>
                            {i < hull.length - 1 && (
                              <div className="rule mx-2 border-t" />
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p
                      className="meta mt-2"
                      style={{ color: "var(--faint)", textTransform: "none" }}
                    >
                      nothing in the hull
                    </p>
                  )}
                </>
              )}
              {payload && !payload.claims.length && (
                <p
                  className="hand mt-8 text-[16px]"
                  style={{ color: "var(--faint)" }}
                >
                  nothing set down yet — the first claim begins above
                </p>
              )}
            </section>

            <aside className="flex min-w-0 flex-col gap-5">
              <section
                className="panel sketched rise relative p-4"
                style={{ borderRadius: 3, animationDelay: "120ms" }}
                aria-label="How to sail it"
              >
                <Sketch seed="tack-how" draw />
                <div className="meta" style={{ color: "var(--accent)" }}>
                  how to sail it
                </div>
                <ol
                  className="mt-3 flex flex-col gap-2.5 text-[13.5px] leading-[1.5]"
                  style={{ color: "var(--ink)" }}
                >
                  <li>
                    Write the claim. Then ask the flinch: do you want evidence
                    to be able to change this? If yes, it is a belief. If even
                    asking felt like a small betrayal, that flinch is the
                    instrument — it is a commitment.
                  </li>
                  <li>
                    A belief goes in the sails. Say where you lean, between the
                    ends. Write what you would expect to see if it is so, and if
                    it is not: a belief that expects nothing is not paying rent.
                  </li>
                  <li>
                    Tack, do not flip. Each time you see something, write what
                    you saw, say what it matched, and move the lean in
                    proportion. The sheet draws the path and marks any step that
                    crossed the middle.
                  </li>
                  <li>
                    A commitment goes in the hull. Write why you hold it — no
                    evidence is owed. Name the day before which you will not
                    look at it again, and hold it through the stretch where the
                    water looks bad.
                  </li>
                  <li>
                    When the window opens, reopen the question on the record:
                    hold it again, or let it go. Reopening early is allowed and
                    is written down as early.
                  </li>
                </ol>
                <p
                  className="hand mt-4 text-[15px] leading-[1.3]"
                  style={{ color: "var(--faint)" }}
                >
                  all sail and no hull is a shipwreck with a good weather
                  report; all hull and no sail does not move
                </p>
              </section>
              <section
                className="panel sketched rise relative p-4"
                style={{ borderRadius: 3, animationDelay: "180ms" }}
                aria-label="The whole sheet"
              >
                <Sketch seed="tack-whole" draw />
                <div className="meta" style={{ color: "var(--accent)" }}>
                  the whole sheet
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
                {trouble && (
                  <p
                    className="meta mt-3"
                    style={{ color: "var(--accent)" }}
                    role="alert"
                  >
                    {trouble}
                  </p>
                )}
              </section>
            </aside>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <section
              className="flex min-w-0 flex-col gap-5"
              aria-label="The claim"
            >
              {/* the claim */}
              <div
                className="panel sketched rise relative p-5 sm:p-7"
                style={{ borderRadius: 3, animationDelay: "40ms" }}
              >
                <Sketch
                  seed={`claim-${open.slug || "fresh"}`}
                  draw
                  color={open.layer === "hull" ? "var(--accent)" : undefined}
                />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    {LAYER_LABEL[open.layer]} · {LAYER_KIND[open.layer]} ·{" "}
                    {open.opened}
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
                    <Chip onClick={close}>all claims</Chip>
                  </div>
                </div>
                <textarea
                  value={open.text}
                  onChange={(e) => patch({ text: e.target.value })}
                  onBlur={commit}
                  readOnly={!writable}
                  rows={Math.max(2, Math.min(6, Math.ceil(open.text.length / 40)))}
                  aria-label="The claim"
                  className="display tk-case scroll-thin mt-3 w-full resize-none bg-transparent px-0 py-1 text-[26px] leading-[1.22] sm:text-[31px]"
                  style={{
                    color: open.letGo ? "var(--muted)" : "var(--ink)",
                    borderBottom: "1px solid var(--rule)",
                    textDecoration: open.letGo ? "line-through" : undefined,
                    textDecorationColor: "var(--accent)",
                  }}
                />
                <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span
                    className="meta shrink-0"
                    style={{ color: "var(--faint)" }}
                  >
                    the flinch ·
                  </span>
                  <input
                    value={open.flinch}
                    onChange={(e) => patch({ flinch: e.target.value })}
                    onBlur={commit}
                    readOnly={!writable}
                    placeholder="what you said when asked whether evidence may change this"
                    aria-label="The flinch"
                    className="min-w-0 flex-1 basis-[10rem] bg-transparent px-0 py-0.5 text-[14px]"
                    style={{
                      color: "var(--ink)",
                      borderBottom: "1px solid var(--rule)",
                    }}
                  />
                  {writable && (
                    <Chip
                      onClick={() =>
                        sure === "layer" ? moveLayer() : setSure("layer")
                      }
                      accent={sure === "layer"}
                    >
                      {sure === "layer"
                        ? open.layer === "sail"
                          ? "into the hull — sure?"
                          : "up into the sails — sure?"
                        : open.layer === "sail"
                          ? "ask the flinch again: into the hull"
                          : "ask the flinch again: into the sails"}
                    </Chip>
                  )}
                </div>
              </div>

              {open.layer === "sail" && (
                <>
                  {/* the rent */}
                  <div
                    className="panel sketched rise relative p-5 sm:p-7"
                    style={{ borderRadius: 3, animationDelay: "90ms" }}
                  >
                    <Sketch seed={`rent-${open.slug || "fresh"}`} draw />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="meta" style={{ color: "var(--accent)" }}>
                        what it expects to see
                      </div>
                      <span
                        className="hand text-[15px]"
                        style={{ color: "var(--faint)" }}
                      >
                        a belief pays rent in what it expects; one that expects
                        nothing is freeloading
                      </span>
                    </div>
                    <div className="mt-2 grid gap-4 sm:grid-cols-2">
                      <div>
                        <div className="meta" style={{ color: "var(--faint)" }}>
                          if so
                        </div>
                        <textarea
                          value={open.ifSo}
                          onChange={(e) => patch({ ifSo: e.target.value })}
                          onBlur={commit}
                          readOnly={!writable}
                          rows={4}
                          placeholder={
                            writable
                              ? "if this is so, you would expect to see…"
                              : ""
                          }
                          aria-label="If so"
                          className="tk-case scroll-thin mt-1 w-full resize-none bg-transparent px-0 py-1 text-[15px] leading-[1.55]"
                          style={{
                            color: "var(--ink)",
                            borderBottom: "1px solid var(--rule)",
                          }}
                        />
                      </div>
                      <div>
                        <div className="meta" style={{ color: "var(--faint)" }}>
                          if not
                        </div>
                        <textarea
                          value={open.ifNot}
                          onChange={(e) => patch({ ifNot: e.target.value })}
                          onBlur={commit}
                          readOnly={!writable}
                          rows={4}
                          placeholder={
                            writable
                              ? "and if it is not, you would expect to see…"
                              : ""
                          }
                          aria-label="If not"
                          className="tk-case scroll-thin mt-1 w-full resize-none bg-transparent px-0 py-1 text-[15px] leading-[1.55]"
                          style={{
                            color: "var(--ink)",
                            borderBottom: "1px solid var(--rule)",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* the lean */}
                  <div
                    className="panel sketched rise relative p-5 sm:p-7"
                    style={{ borderRadius: 3, animationDelay: "140ms" }}
                  >
                    <Sketch seed={`lean-${open.slug || "fresh"}`} draw />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="meta" style={{ color: "var(--accent)" }}>
                        where you lean · now at {now ?? "—"}
                      </div>
                      <span
                        className="hand text-[15px]"
                        style={{ color: "var(--faint)" }}
                      >
                        the path your tacks drew; a step that crossed the middle
                        is in the accent
                      </span>
                    </div>
                    <div className="mt-3 max-w-[40rem]">
                      <LeanPath
                        tacks={open.tacks}
                        seed={open.slug || "fresh"}
                      />
                    </div>

                    {writable && (
                      <div
                        className="mt-4"
                        style={{
                          borderTop: "1px solid var(--rule)",
                          paddingTop: 12,
                        }}
                      >
                        <div className="meta" style={{ color: "var(--faint)" }}>
                          tack
                        </div>
                        <textarea
                          value={saw}
                          onChange={(e) => setSaw(e.target.value)}
                          rows={2}
                          placeholder="what did you see?"
                          aria-label="What you saw"
                          className="tk-case scroll-thin mt-1 w-full resize-none bg-transparent px-0 py-1 text-[15px] leading-[1.55]"
                          style={{
                            color: "var(--ink)",
                            borderBottom: "1px solid var(--rule)",
                          }}
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span
                            className="meta mr-1"
                            style={{ color: "var(--faint)" }}
                          >
                            it was
                          </span>
                          {RENTS.map((r) => (
                            <Chip
                              key={r}
                              on={rentNew === r}
                              onClick={() => setRentNew(rentNew === r ? "" : r)}
                            >
                              {RENT_LABEL[r]}
                            </Chip>
                          ))}
                        </div>
                        <div
                          className="meta mt-3"
                          style={{ color: "var(--faint)" }}
                        >
                          and now you lean
                        </div>
                        <Dial
                          value={atShown}
                          onChange={setAtNew}
                          label="Where you lean now"
                          writable={writable}
                        />
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Chip
                            onClick={addTack}
                            disabled={!saw.trim() && atShown === now}
                            on={Boolean(saw.trim()) || atShown !== now}
                          >
                            tack
                          </Chip>
                          <span
                            className="hand text-[15px]"
                            style={{ color: "var(--faint)" }}
                          >
                            {now !== null && atShown !== now
                              ? `a step of ${Math.abs(atShown - now)}${(now < 50 && atShown > 50) || (now > 50 && atShown < 50) ? " — across the middle" : ""}`
                              : "move it in proportion to what you saw, or not at all"}
                          </span>
                        </div>
                      </div>
                    )}

                    {open.tacks.length > 0 && (
                      <ol className="mt-5 flex flex-col gap-2">
                        {[...open.tacks].reverse().map((tk, i) => {
                          const idx = open.tacks.length - 1 - i;
                          const prev = idx > 0 ? open.tacks[idx - 1] : null;
                          return (
                            <li
                              key={`${tk.on}-${idx}`}
                              className="tk-tack flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[14px] leading-[1.5]"
                              style={{ "--i": Math.min(i, 8) } as CSSProperties}
                            >
                              <span
                                className="meta min-w-0 max-w-full"
                                style={{
                                  color: "var(--faint)",
                                  textTransform: "none",
                                }}
                              >
                                {tk.on} · at {tk.at}
                                {prev
                                  ? ` (${tk.at > prev.at ? "+" : ""}${tk.at - prev.at})`
                                  : " · first put"}
                                {tk.rent ? ` · ${RENT_LABEL[tk.rent]}` : ""}
                              </span>
                              <span
                                className="min-w-0 flex-1"
                                style={{ color: "var(--ink)" }}
                              >
                                {tk.saw || (
                                  <span style={{ color: "var(--faint)" }}>
                                    nothing written of what was seen
                                  </span>
                                )}
                              </span>
                              {writable &&
                                idx === open.tacks.length - 1 &&
                                idx > 0 && (
                                  <button
                                    onClick={takeBackTack}
                                    className="meta ml-auto"
                                    style={{ color: "var(--faint)" }}
                                    aria-label="Take back the last tack"
                                  >
                                    take back
                                  </button>
                                )}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>

                  {/* what would move it */}
                  <div
                    className="panel sketched rise relative p-5 sm:p-7"
                    style={{ borderRadius: 3, animationDelay: "190ms" }}
                  >
                    <Sketch seed={`looks-${open.slug || "fresh"}`} draw />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="meta" style={{ color: "var(--accent)" }}>
                        what would move it
                      </div>
                      <span
                        className="hand text-[15px]"
                        style={{ color: "var(--faint)" }}
                      >
                        places to go and look — yours, the garden's, or proposed
                      </span>
                    </div>
                    {open.looks.length === 0 && (
                      <p
                        className="hand mt-1 text-[15px]"
                        style={{ color: "var(--faint)" }}
                      >
                        nothing yet — name something you could go and see, or
                        ask
                      </p>
                    )}
                    {open.looks.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-2">
                        {open.looks.map((l, i) => (
                          <li
                            key={l.id}
                            className="tk-tack flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[14px] leading-[1.5]"
                            style={{ "--i": Math.min(i, 8) } as CSSProperties}
                          >
                            <span
                              aria-hidden
                              className="mt-[6px] h-2 w-2 shrink-0 rounded-full"
                              style={{
                                background: l.looked
                                  ? "var(--ink)"
                                  : "transparent",
                                border: `1px ${l.kept ? "solid" : "dashed"} var(--ink)`,
                              }}
                              title={
                                l.looked
                                  ? `looked at ${l.looked}`
                                  : l.kept
                                    ? "kept, not yet looked at"
                                    : "proposed, hollow"
                              }
                            />
                            <span
                              className="min-w-0 flex-1 basis-[16rem]"
                              style={{
                                color: l.kept ? "var(--ink)" : "var(--muted)",
                                borderBottom: l.kept
                                  ? undefined
                                  : "1px dashed var(--rule)",
                              }}
                            >
                              {l.text}
                              {l.stone && (
                                <>
                                  {" "}
                                  <Link
                                    href={`/catalogue?id=${encodeURIComponent(l.stone)}`}
                                    className="tk-link meta"
                                    style={{
                                      color: "var(--faint)",
                                      textTransform: "none",
                                    }}
                                  >
                                    open →
                                  </Link>
                                </>
                              )}
                            </span>
                            <span
                              className="meta min-w-0 max-w-full"
                              style={{
                                color: "var(--faint)",
                                textTransform: "none",
                              }}
                            >
                              {MOVES_SHORT[l.moves]} ·{" "}
                              {l.by === "you"
                                ? "yours"
                                : l.by === "garden"
                                  ? "the garden"
                                  : "proposed"}
                              {l.looked ? ` · looked ${l.looked}` : ""}
                            </span>
                            {writable &&
                              (l.kept ? (
                                <span className="ml-auto flex gap-1">
                                  <Chip
                                    on={Boolean(l.looked)}
                                    onClick={() =>
                                      lookPatch(l.id, {
                                        looked: l.looked ? "" : today,
                                      })
                                    }
                                    title={
                                      l.looked
                                        ? "not looked at after all"
                                        : "I went and looked"
                                    }
                                  >
                                    {l.looked ? "looked" : "I looked"}
                                  </Chip>
                                  <button
                                    onClick={() => dropLook(l.id)}
                                    className="meta"
                                    style={{ color: "var(--faint)" }}
                                    aria-label="Drop the look"
                                  >
                                    ×
                                  </button>
                                </span>
                              ) : (
                                <span className="ml-auto flex gap-1">
                                  <Chip
                                    on
                                    onClick={() =>
                                      lookPatch(l.id, { kept: true })
                                    }
                                  >
                                    keep
                                  </Chip>
                                  <Chip onClick={() => dropLook(l.id)}>
                                    drop
                                  </Chip>
                                </span>
                              ))}
                          </li>
                        ))}
                      </ul>
                    )}
                    {writable && (
                      <>
                        <div className="mt-4 flex flex-wrap items-end gap-2">
                          <input
                            value={newLook}
                            onChange={(e) => setNewLook(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addLook()}
                            placeholder="something you could go and see, ask, count or read"
                            aria-label="A look"
                            className="min-w-[12rem] flex-1 bg-transparent px-0 py-1 text-[14px]"
                            style={{
                              color: "var(--ink)",
                              borderBottom: "1px solid var(--rule)",
                            }}
                          />
                          <select
                            value={newMoves}
                            onChange={(e) =>
                              setNewMoves(e.target.value as Moves)
                            }
                            aria-label="Which way it would move you"
                            className="chip bg-transparent px-2 py-1 text-[10px] tracking-[0.14em] uppercase"
                            style={{ ...mono, color: "var(--muted)" }}
                          >
                            {MOVES.map((m) => (
                              <option key={m} value={m}>
                                {MOVES_LABEL[m]}
                              </option>
                            ))}
                          </select>
                          <Chip
                            onClick={addLook}
                            disabled={!newLook.trim()}
                            on={Boolean(newLook.trim())}
                          >
                            name it
                          </Chip>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <Chip
                            onClick={() => void askGarden()}
                            disabled={askingGarden}
                          >
                            {askingGarden ? "looking…" : "ask the garden"}
                          </Chip>
                          <Chip
                            onClick={() => void askModel()}
                            disabled={asking}
                            accent={!asking}
                          >
                            {asking ? "asking…" : "ask what to look at"}
                          </Chip>
                          {nProposed > 0 && (
                            <>
                              <Chip
                                onClick={() => keepNow(keepAll(open, true))}
                              >
                                keep all {nProposed}
                              </Chip>
                              <Chip
                                onClick={() => keepNow(keepAll(open, false))}
                              >
                                drop all
                              </Chip>
                            </>
                          )}
                          <span
                            className="hand text-[14.5px] leading-[1.3]"
                            style={{ color: "var(--faint)" }}
                          >
                            {asking
                              ? `the model on this machine (${payload?.model ?? "local"}) is being asked what to go and look at`
                              : (said ??
                                "the garden offers stones that speak of the same things; the model on this machine is asked only what to look at — never whether")}
                          </span>
                        </div>
                      </>
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
                </>
              )}

              {open.layer === "hull" && (
                <>
                  {/* why */}
                  <div
                    className="panel sketched rise relative p-5 sm:p-7"
                    style={{ borderRadius: 3, animationDelay: "90ms" }}
                  >
                    <Sketch seed={`why-${open.slug || "fresh"}`} draw />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="meta" style={{ color: "var(--accent)" }}>
                        why you hold it
                      </div>
                      <span
                        className="hand text-[15px]"
                        style={{ color: "var(--faint)" }}
                      >
                        an axiom, not a theorem — no evidence is owed, and none
                        is asked for here
                      </span>
                    </div>
                    <textarea
                      value={open.why}
                      onChange={(e) => patch({ why: e.target.value })}
                      onBlur={commit}
                      readOnly={!writable}
                      rows={Math.max(
                        4,
                        Math.min(12, Math.ceil(open.why.length / 100) + 2),
                      )}
                      placeholder={
                        writable
                          ? "in your own words — what you are loyal to, and what you would be if you were not"
                          : ""
                      }
                      aria-label="Why you hold it"
                      className="tk-case scroll-thin mt-2 w-full resize-none bg-transparent px-0 py-1 text-[16px] leading-[1.6]"
                      style={{
                        color: "var(--ink)",
                        borderBottom: "1px solid var(--rule)",
                      }}
                    />
                  </div>

                  {/* the window */}
                  <div
                    className="panel sketched rise relative p-5 sm:p-7"
                    style={{ borderRadius: 3, animationDelay: "140ms" }}
                  >
                    <Sketch
                      seed={`window-${open.slug || "fresh"}`}
                      draw
                      color={t?.open ? "var(--accent)" : undefined}
                    />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="meta" style={{ color: "var(--accent)" }}>
                        the window
                      </div>
                      <span
                        className="hand text-[15px]"
                        style={{ color: "var(--faint)" }}
                      >
                        how long you stay committed before you are allowed to
                        reopen the question
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-[14px]">
                      <label
                        className="flex items-baseline gap-2"
                        style={{ color: "var(--muted)" }}
                      >
                        <span
                          className="meta"
                          style={{ color: "var(--faint)" }}
                        >
                          chosen
                        </span>
                        <input
                          type="date"
                          value={open.chosen || open.opened}
                          onChange={(e) => patch({ chosen: e.target.value })}
                          onBlur={commit}
                          readOnly={!writable}
                          aria-label="Chosen on"
                          className="bg-transparent px-0 py-0.5"
                          style={{
                            ...mono,
                            color: "var(--ink)",
                            borderBottom: "1px solid var(--rule)",
                          }}
                        />
                      </label>
                      <label
                        className="flex items-baseline gap-2"
                        style={{ color: "var(--muted)" }}
                      >
                        <span
                          className="meta"
                          style={{ color: "var(--faint)" }}
                        >
                          not before
                        </span>
                        <input
                          type="date"
                          value={open.until}
                          onChange={(e) => patch({ until: e.target.value })}
                          onBlur={commit}
                          readOnly={!writable}
                          aria-label="Not before"
                          className="bg-transparent px-0 py-0.5"
                          style={{
                            ...mono,
                            color: "var(--ink)",
                            borderBottom: "1px solid var(--rule)",
                          }}
                        />
                      </label>
                    </div>
                    <div className="mt-4 max-w-[40rem]">
                      <WindowBar
                        chosen={open.chosen || open.opened}
                        until={open.until}
                        letGo={open.letGo}
                        today={today}
                        w={600}
                        h={22}
                      />
                    </div>
                    <p
                      className="meta mt-1"
                      style={{
                        color: t?.open ? "var(--accent)" : "var(--faint)",
                        textTransform: "none",
                      }}
                    >
                      {t?.letGo
                        ? `let go ${open.letGo} after ${t.held} days`
                        : !open.until
                          ? `held ${t?.held ?? 0} days · no window set`
                          : t?.open
                            ? `held ${t.held} days · the window opened ${open.until}`
                            : `held ${t?.held ?? 0} days · ${t?.toGo ?? 0} to go`}
                    </p>

                    {writable && !open.letGo && !reopening && (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Chip
                          onClick={() => {
                            setReopening(true);
                            setUntilNew(plusDays(today, 90));
                          }}
                          accent={t?.open}
                        >
                          reopen the question
                        </Chip>
                        <span
                          className="hand text-[15px]"
                          style={{ color: "var(--faint)" }}
                        >
                          {t?.open
                            ? "the window is open; what you say now goes on the record"
                            : "before the window it is allowed, and is written down as early"}
                        </span>
                      </div>
                    )}
                    {writable && reopening && (
                      <div
                        className="tk-arrive mt-4"
                        style={{
                          borderTop: "1px solid var(--rule)",
                          paddingTop: 12,
                        }}
                      >
                        <div
                          className="meta"
                          style={{
                            color: t?.open ? "var(--faint)" : "var(--accent)",
                          }}
                        >
                          {t?.open
                            ? "the question, reopened"
                            : "the question, reopened early"}
                        </div>
                        <textarea
                          value={saidNew}
                          onChange={(e) => setSaidNew(e.target.value)}
                          rows={3}
                          placeholder="what would you say now, having held it this long?"
                          aria-label="What you would say now"
                          className="tk-case scroll-thin mt-1 w-full resize-none bg-transparent px-0 py-1 text-[15px] leading-[1.55]"
                          style={{
                            color: "var(--ink)",
                            borderBottom: "1px solid var(--rule)",
                          }}
                        />
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Chip
                            onClick={() => reopen("held")}
                            on
                            disabled={!untilNew}
                          >
                            hold it again, not before
                          </Chip>
                          <input
                            type="date"
                            value={untilNew}
                            min={today}
                            onChange={(e) => setUntilNew(e.target.value)}
                            aria-label="Hold it again until"
                            className="bg-transparent px-0 py-0.5 text-[14px]"
                            style={{
                              ...mono,
                              color: "var(--ink)",
                              borderBottom: "1px solid var(--rule)",
                            }}
                          />
                          <Chip onClick={() => reopen("let-go")} accent>
                            let it go
                          </Chip>
                          <Chip onClick={() => setReopening(false)}>
                            not now
                          </Chip>
                        </div>
                      </div>
                    )}

                    {open.reopened.length > 0 && (
                      <ol className="mt-5 flex flex-col gap-2">
                        {[...open.reopened].reverse().map((r, i) => (
                          <li
                            key={`${r.on}-${i}`}
                            className="tk-tack flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[14px] leading-[1.5]"
                            style={{ "--i": Math.min(i, 8) } as CSSProperties}
                          >
                            <span
                              className="meta min-w-0 max-w-full"
                              style={{
                                color:
                                  r.went === "let-go"
                                    ? "var(--accent)"
                                    : "var(--faint)",
                                textTransform: "none",
                              }}
                            >
                              {r.on} ·{" "}
                              {r.went === "held"
                                ? `held again${r.until ? ` until ${r.until}` : ""}`
                                : "let go"}
                              {r.early ? " · early" : ""}
                            </span>
                            <span
                              className="min-w-0 flex-1"
                              style={{ color: "var(--ink)" }}
                            >
                              {r.said || (
                                <span style={{ color: "var(--faint)" }}>
                                  nothing said
                                </span>
                              )}
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
                </>
              )}
            </section>

            {/* ── the desk ────────────────────────────────────────────────── */}
            <aside className="flex min-w-0 flex-col gap-5">
              <section
                className="panel sketched rise relative p-4"
                style={{ borderRadius: 3, animationDelay: "80ms" }}
                aria-label="The reading"
              >
                <Sketch seed="tack-reading" draw />
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
                aria-label="The two layers"
              >
                <Sketch seed="tack-layers" draw />
                <div className="meta" style={{ color: "var(--accent)" }}>
                  the two layers
                </div>
                <p
                  className="mt-2 text-[13.5px] leading-[1.6]"
                  style={{ color: "var(--ink)" }}
                >
                  {open.layer === "sail"
                    ? "A belief is a claim about how the world is. Hold it in proportion to what you have seen, and move it a tack at a time. What you expect to see is its rent; what you saw is on the record; the ends are not places you can stand."
                    : "A commitment is a claim about what you will stay loyal to however the world turns out. It is chosen, not derived, so no evidence is owed. What you owe it is the window: the stretch you said you would hold it through before the question is yours to reopen."}
                </p>
                <p
                  className="hand mt-3 text-[15px] leading-[1.3]"
                  style={{ color: "var(--faint)" }}
                >
                  {open.layer === "sail"
                    ? "loyal to the territory, not to the map of it"
                    : "the scout was never meant to scout forever"}
                </p>
                {writable && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <Chip
                      onClick={() =>
                        sure === "claim" ? void remove() : setSure("claim")
                      }
                      accent={sure === "claim"}
                    >
                      {sure === "claim"
                        ? "take it off the sheet — sure?"
                        : "take it off the sheet"}
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
