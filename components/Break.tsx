"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  THREE,
  THREE_DEFAULT,
  THREE_LABEL,
  THREE_OTHERS,
  TOUCHES,
  TOUCH_LABEL,
  compare,
  dayOf,
  emptyMoment,
  readings,
  tally,
  type Moment,
  type Three,
  type Touch,
} from "@/lib/break";
import { EXERCISES } from "@/content/break";
import { jitter, ribbon, roughEllipse, seedOf } from "@/lib/hand";
import { putOnDesk } from "./desk";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

type Payload = {
  moments: Moment[];
  about: { id: string; label: string; first: string } | null;
  writable: boolean;
  dir: string | null;
};

const mono = { fontFamily: "var(--font-mono)" } as const;
const hand = { fontFamily: "var(--font-hand)" } as const;
const chip = "chip bk-seg px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";
const hue = (i: number) => `var(--value-${i % 6})`;
const nowIso = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}${sign}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`;
};
const localToday = () => nowIso().slice(0, 10);

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

/* ── the three, drawn ──────────────────────────────────────────────────── */

const TW = 300;
const TH = 250;
const RINGS: { k: Three; cx: number; cy: number }[] = [
  { k: "notice", cx: 105, cy: 92 },
  { k: "shared", cx: 195, cy: 92 },
  { k: "kind", cx: 150, cy: 168 },
];

/**
 * Neff's three, as three rings that overlap: what is noticed, what is
 * shared, what is kind. Every break taken is a mark in the ring that was
 * hardest to say that day; the one open is the filled mark.
 */
function Triad({ moments, open }: { moments: Moment[]; open: Moment | null }) {
  const rings = useMemo(
    () =>
      RINGS.map((r, i) => {
        const s = seedOf(`triad-${r.k}`);
        return {
          ...r,
          i,
          d: ribbon(
            roughEllipse(150, 130, s, {
              pad: 0,
              grow: 1,
              wobble: 1.2,
              steps: 20,
            }),
            1.6,
            s,
          ),
        };
      }),
    [],
  );
  return (
    <svg
      viewBox={`0 0 ${TW} ${TH}`}
      className="w-full"
      role="img"
      aria-label="The three: noticed, shared, kind; a mark for every break in the one hardest to say"
    >
      {rings.map((r) => (
        <g key={r.k}>
          <path
            d={r.d}
            fill={hue(r.i)}
            opacity={0.9}
            transform={`translate(${r.cx - 75} ${r.cy - 65})`}
          />
          <text
            x={r.cx + (r.k === "notice" ? -34 : r.k === "shared" ? 34 : 0)}
            y={r.k === "kind" ? r.cy + 50 : r.cy - 48}
            fontSize={15}
            textAnchor="middle"
            style={{
              ...hand,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
            fill="var(--ink)"
          >
            {THREE_LABEL[r.k]}
          </text>
        </g>
      ))}
      {moments
        .filter((m) => m.hardest)
        .map((m, i) => {
          const r = RINGS.find((x) => x.k === m.hardest)!;
          const j = jitter(seedOf(`mark-${m.slug}`), 22, 0);
          const isOpen = open?.slug === m.slug;
          return (
            <circle
              key={m.slug}
              cx={
                r.cx +
                j.dx * (r.k === "notice" ? -1 : 1) -
                (r.k === "notice" ? 14 : r.k === "shared" ? -14 : 0)
              }
              cy={r.cy + j.dy + (r.k === "kind" ? 8 : -6)}
              r={isOpen ? 4 : 2.6}
              fill={isOpen ? "var(--accent)" : "var(--surface)"}
              stroke={isOpen ? "var(--accent)" : "var(--ink)"}
              strokeWidth={1.1}
              className="bk-mark"
              style={{ ["--i" as string]: i }}
            />
          );
        })}
      <text
        x={TW / 2}
        y={TH - 6}
        fontSize={11}
        textAnchor="middle"
        style={hand}
        fill="var(--faint)"
      >
        a mark for every break, in the one hardest to say
      </text>
    </svg>
  );
}

/**
 * The break: mindful self-compassion as an instrument. What hurts; three
 * sentences in the reader's words; a hand; what they need to hear. Then
 * the friend, the letter, afterwards. The desk counts and never scores.
 */
export default function Break() {
  const [theme, setTheme] = useTheme();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [open, setOpen] = useState<Moment | null>(null);
  const [kept, setKept] = useState(false);
  const [trouble, setTrouble] = useState<string | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const [others, setOthers] = useState<Three | null>(null);
  const openRef = useRef<Moment | null>(null);
  const keptRef = useRef(false);
  const slugRef = useRef("");
  const saving = useRef<Promise<void>>(Promise.resolve());
  openRef.current = open;
  keptRef.current = kept;
  const today = useMemo(localToday, []);
  const writable = payload?.writable ?? false;

  const fresh = useCallback((about?: Payload["about"]) => {
    slugRef.current = "";
    setKept(false);
    setOpen({
      ...emptyMoment(nowIso()),
      what: about ? about.first || about.label : "",
      stone: about?.id ?? null,
    });
    setSure(null);
    setOthers(null);
  }, []);
  const load = useCallback((m: Moment) => {
    slugRef.current = m.slug;
    setKept(true);
    setOpen(m);
    setSure(null);
    setOthers(null);
    setTrouble(null);
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const slug = p.get("slug");
    const id = p.get("id");
    fetch(`/api/break${id ? `?id=${encodeURIComponent(id)}` : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((pl: Payload | null) => {
        if (!pl) {
          setTrouble("the breaks could not be read");
          return;
        }
        setPayload(pl);
        const wanted = slug ? pl.moments.find((x) => x.slug === slug) : null;
        if (wanted) load(wanted);
        else fresh(pl.about);
      })
      .catch(() => setTrouble("the breaks could not be read"));
  }, [fresh, load]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (kept && open?.slug) url.searchParams.set("slug", open.slug);
    else url.searchParams.delete("slug");
    window.history.replaceState(null, "", url);
    putOnDesk(
      kept && open
        ? { kind: "break", id: open.slug, label: open.what.slice(0, 60) }
        : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kept, open?.slug]);
  useEffect(() => () => putOnDesk(null), []);

  /* ── keeping ─────────────────────────────────────────────────────────── */

  const save = useCallback(
    (m: Moment) =>
      new Promise<Moment | null>((resolve) => {
        saving.current = saving.current.then(async () => {
          const isFresh = !slugRef.current;
          try {
            const r = await fetch("/api/break", {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                moment: { ...m, slug: slugRef.current || m.slug },
                fresh: isFresh,
              }),
            });
            const out = (await r.json().catch(() => null)) as
              Moment | { error: string } | null;
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
            setOpen((cur) => (cur ? { ...cur, slug: out.slug } : cur));
            setPayload((p) =>
              p
                ? {
                    ...p,
                    moments: p.moments.some((x) => x.slug === out.slug)
                      ? p.moments.map((x) =>
                          x.slug === out.slug ? { ...m, ...out } : x,
                        )
                      : [{ ...m, ...out }, ...p.moments],
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

  const patch = useCallback((p: Partial<Moment>) => {
    setOpen((cur) => (cur ? { ...cur, ...p } : cur));
  }, []);
  const patchThree = (k: Three, v: string) =>
    setOpen((cur) => (cur ? { ...cur, three: { ...cur.three, [k]: v } } : cur));
  const commit = useCallback(() => {
    const m = openRef.current;
    if (m && keptRef.current && writable) void save(m);
  }, [save, writable]);
  const set = (p: Partial<Moment>) => {
    patch(p);
    const m = openRef.current;
    if (m && keptRef.current && writable) void save({ ...m, ...p });
  };

  const take = () => {
    const m = openRef.current;
    if (!m || !writable) return;
    if (!m.what.trim()) {
      setTrouble("say what hurts, in a line");
      return;
    }
    void save({ ...m, at: m.at || nowIso() });
  };

  const remove = useCallback(async () => {
    const m = openRef.current;
    if (!m || !writable || !keptRef.current) return;
    const r = await fetch(`/api/break?slug=${encodeURIComponent(m.slug)}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      setTrouble(`not taken off (${r.status})`);
      return;
    }
    setPayload((p) =>
      p ? { ...p, moments: p.moments.filter((x) => x.slug !== m.slug) } : p,
    );
    fresh();
  }, [writable, fresh]);

  /* ── derived ─────────────────────────────────────────────────────────── */

  const moments = payload?.moments ?? [];
  const t = useMemo(() => tally(moments, today), [moments, today]);
  const words = useMemo(() => readings(t), [t]);
  const voices = useMemo(
    () => (open ? compare(open.toSelf, open.toFriend) : []),
    [open],
  );
  const marks = useMemo(
    () => (open && !kept ? [...moments, open] : moments),
    [moments, open, kept],
  );

  const field = (
    label: string,
    key: keyof Moment,
    placeholder: string,
    rows = 3,
    big = false,
  ) =>
    open && (
      <div className="mt-5">
        <div className="meta" style={{ color: "var(--accent)" }}>
          {label}
        </div>
        <textarea
          value={String(open[key] ?? "")}
          onChange={(e) => patch({ [key]: e.target.value } as Partial<Moment>)}
          onBlur={commit}
          readOnly={!writable}
          rows={rows}
          placeholder={placeholder}
          aria-label={label}
          className={`bk-case scroll-thin mt-1 w-full resize-none bg-transparent px-0 py-1 ${big ? "display text-[19px] leading-[1.35]" : "text-[15.5px] leading-[1.55]"}`}
          style={{ color: "var(--ink)" }}
        />
      </div>
    );

  return (
    <main className="break scroll-thin relative h-dvh w-full overflow-y-auto">
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
                break
              </div>
              <p
                className="hand mt-1 max-w-[27rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                When it hurts: notice it, remember you are not the only one, be
                kind. Three sentences in your words, a hand where it helps, and
                what you would say to a friend in your spot.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/break" />
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
            aria-label="The break"
          >
            <Sketch seed={`break-${open?.slug || "fresh"}`} draw />
            {!open ? (
              <p className="meta" style={{ color: "var(--faint)" }}>
                {trouble ?? "reading…"}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    {kept
                      ? `a break · ${open.at.slice(0, 16).replace("T", " · ")}`
                      : "now"}
                    {open.stone && (
                      <>
                        {" · about "}
                        <Link
                          href={`/catalogue?id=${encodeURIComponent(open.stone)}`}
                          className="bk-link"
                          style={{ color: "var(--ink)", textTransform: "none" }}
                        >
                          the stone
                        </Link>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {kept && <Chip onClick={() => fresh()}>a new break</Chip>}
                  </div>
                </div>

                <div className="mt-2 grid gap-x-8 gap-y-5 md:grid-cols-[minmax(0,1fr)_18rem]">
                  <div className="min-w-0">
                    <textarea
                      value={open.what}
                      onChange={(e) => patch({ what: e.target.value })}
                      onBlur={commit}
                      readOnly={!writable}
                      rows={2}
                      placeholder="what hurts, right now — in a line"
                      aria-label="What hurts"
                      className="display bk-case scroll-thin w-full resize-none bg-transparent px-0 py-1 text-[24px] leading-[1.2] sm:text-[29px]"
                      style={{ color: "var(--ink)" }}
                    />

                    <div
                      className="mt-5 meta"
                      style={{ color: "var(--accent)" }}
                    >
                      the three · say them, out loud if you can
                    </div>
                    <div className="mt-2 flex flex-col gap-3">
                      {THREE.map((k, i) => (
                        <div key={k}>
                          <div className="flex items-baseline gap-3">
                            <span
                              aria-hidden
                              className="inline-block h-2.5 w-2.5 shrink-0 self-center rounded-[2px]"
                              style={{ background: hue(i), opacity: 0.8 }}
                            />
                            <span
                              className="meta w-[6ch] shrink-0"
                              style={{ color: "var(--faint)" }}
                            >
                              {THREE_LABEL[k]}
                            </span>
                            <input
                              value={open.three[k]}
                              onChange={(e) => patchThree(k, e.target.value)}
                              onBlur={commit}
                              onFocus={() => setOthers(k)}
                              readOnly={!writable}
                              aria-label={`The ${THREE_LABEL[k]} sentence`}
                              className="bk-case hand min-w-0 flex-1 bg-transparent text-[21px] leading-[1.2]"
                              style={{
                                color:
                                  open.three[k] === THREE_DEFAULT[k]
                                    ? "var(--muted)"
                                    : "var(--ink)",
                              }}
                            />
                            {open.hardest === k ? (
                              <button
                                onClick={() => set({ hardest: "" })}
                                className="bk-link meta shrink-0"
                                style={{
                                  color: "var(--accent)",
                                  textTransform: "none",
                                }}
                                title="this one was hardest to say"
                              >
                                hardest
                              </button>
                            ) : (
                              <button
                                onClick={() => set({ hardest: k })}
                                className="bk-link meta shrink-0 opacity-0 hover:opacity-100 focus:opacity-100"
                                style={{
                                  color: "var(--faint)",
                                  textTransform: "none",
                                }}
                                title="mark this one as the hardest to say"
                                aria-label={`Mark the ${THREE_LABEL[k]} one as hardest`}
                              >
                                hardest?
                              </button>
                            )}
                          </div>
                          {others === k && writable && (
                            <div className="bk-arrive mt-1.5 flex flex-wrap gap-1.5 pl-[7.5rem]">
                              {[THREE_DEFAULT[k], ...THREE_OTHERS[k]].map(
                                (o) => (
                                  <Chip
                                    key={o}
                                    onClick={() => patchThree(k, o)}
                                    on={open.three[k] === o}
                                  >
                                    {o}
                                  </Chip>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p
                      className="hand mt-2 text-[14.5px]"
                      style={{ color: "var(--faint)" }}
                    >
                      the workbook&apos;s words are grey until they are yours ·
                      click a sentence for other ways to say it · say which was
                      hardest
                    </p>

                    <div
                      className="mt-5 meta"
                      style={{ color: "var(--accent)" }}
                    >
                      a hand
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {TOUCHES.map((tc) => (
                        <Chip
                          key={tc}
                          on={open.touch === tc}
                          onClick={() =>
                            set({ touch: open.touch === tc ? "" : tc })
                          }
                          disabled={!writable}
                        >
                          {TOUCH_LABEL[tc as Touch]}
                        </Chip>
                      ))}
                    </div>

                    <div
                      className="mt-5 meta"
                      style={{ color: "var(--accent)" }}
                    >
                      what do I need to hear right now?
                    </div>
                    <input
                      value={open.need}
                      onChange={(e) => patch({ need: e.target.value })}
                      onBlur={commit}
                      readOnly={!writable}
                      placeholder="in a line, from someone who has your back"
                      aria-label="What I need to hear"
                      className="bk-case hand mt-1 w-full bg-transparent text-[21px] leading-[1.2]"
                      style={{ color: "var(--ink)" }}
                    />

                    {!kept && (
                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        <Chip onClick={take} disabled={!writable} accent>
                          {writable
                            ? "take the break"
                            : "a deployed garden keeps no breaks"}
                        </Chip>
                        <span
                          className="hand text-[14.5px]"
                          style={{ color: "var(--faint)" }}
                        >
                          that is enough. the rest is there if you want it.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <Triad moments={marks} open={open} />
                  </div>
                </div>

                {/* ── the friend ──────────────────────────────────────────── */}
                <div
                  className="mt-7"
                  style={{ borderTop: "1px solid var(--rule)", paddingTop: 14 }}
                >
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    the friend
                  </div>
                  <p
                    className="hand mt-1 text-[15px] leading-[1.3]"
                    style={{ color: "var(--muted)" }}
                  >
                    what you are saying to yourself, and what you would say to a
                    friend in exactly this spot
                  </p>
                  <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
                    {field(
                      "to myself",
                      "toSelf",
                      "the voice as it actually sounds",
                      4,
                    )}
                    {field(
                      "to a friend",
                      "toFriend",
                      "what you would say to them, and how",
                      4,
                    )}
                  </div>
                  {voices.length > 0 && (
                    <p
                      className="mt-3 text-[13.5px] leading-[1.6]"
                      style={{ color: "var(--ink)" }}
                    >
                      {voices.join(" · ")}
                    </p>
                  )}
                </div>

                {field(
                  "the letter · from someone who loves you as you are",
                  "letter",
                  "who knows your history and your struggles, and is not trying to fix you",
                  6,
                  true,
                )}
                {field("afterwards", "after", "how it went, later — a line", 2)}

                {kept && writable && (
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    <Chip
                      onClick={() =>
                        sure === "moment" ? void remove() : setSure("moment")
                      }
                      accent={sure === "moment"}
                    >
                      {sure === "moment"
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
              <Sketch seed="break-reading" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                the reading
              </div>
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
              <Sketch seed="break-record" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                the record
              </div>
              {moments.length === 0 ? (
                <p
                  className="hand mt-2 text-[15.5px]"
                  style={{ color: "var(--muted)" }}
                >
                  {payload ? "no breaks taken yet" : "reading…"}
                </p>
              ) : (
                <ol className="mt-2 flex flex-col">
                  {moments.slice(0, 20).map((m, i) => {
                    const on = kept && open?.slug === m.slug;
                    return (
                      <li
                        key={m.slug}
                        className="bk-row"
                        style={{ ["--i" as string]: i }}
                      >
                        <button
                          onClick={() => load(m)}
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
                            {dayOf(m.at)}
                            {m.touch ? ` · ${TOUCH_LABEL[m.touch]}` : ""}
                            {m.toFriend.trim() ? " · the friend" : ""}
                            {m.letter.trim() ? " · a letter" : ""}
                          </span>
                          <span
                            className="display text-[15.5px] leading-[1.25]"
                            style={{ color: "var(--ink)" }}
                          >
                            {m.what}
                          </span>
                          {m.after.trim() && (
                            <span
                              className="hand text-[14.5px]"
                              style={{ color: "var(--muted)" }}
                            >
                              afterwards: {m.after}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            <section
              className="panel sketched rise relative p-4"
              style={{ borderRadius: 3, animationDelay: "180ms" }}
              aria-label="The practices, offered"
            >
              <Sketch seed="break-exercises" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                the practices, offered
              </div>
              <ol className="mt-2 flex flex-col gap-2.5">
                {EXERCISES.map((e) => (
                  <li key={e.name}>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span
                        className="hand text-[16.5px]"
                        style={{ color: "var(--ink)" }}
                      >
                        {e.name}
                      </span>
                      {e.here && (
                        <span
                          className="meta"
                          style={{
                            color: "var(--faint)",
                            textTransform: "none",
                          }}
                        >
                          {e.here === "wish" ? (
                            <Link
                              href="/wish"
                              className="bk-link"
                              style={{ color: "var(--faint)" }}
                            >
                              on the wish
                            </Link>
                          ) : (
                            "on this sheet"
                          )}
                        </span>
                      )}
                    </div>
                    <p
                      className="text-[12.5px] leading-[1.5]"
                      style={{ color: "var(--muted)" }}
                    >
                      {e.how}
                    </p>
                  </li>
                ))}
              </ol>
              <p
                className="meta mt-3"
                style={{ color: "var(--faint)", textTransform: "none" }}
              >
                after Kristin Neff and Chris Germer, The Mindful Self-Compassion
                Workbook, and the eight-week course their Center for Mindful
                Self-Compassion runs
              </p>
            </section>

            <section
              className="panel sketched rise relative p-4"
              style={{ borderRadius: 3, animationDelay: "220ms" }}
              aria-label="What the break holds to"
            >
              <Sketch seed="break-laws" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                what the break holds to
              </div>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                The three sentences are enough; everything under them is
                optional. The hurt is not a problem to be solved here. The
                friend&apos;s version is set beside yours and counted, word by
                word, so you can see the difference; nothing says which voice is
                right. The record counts breaks and hands and which sentence was
                hardest; it never says you are hard on yourself, and it never
                scores.
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
