"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  aboutKey,
  byDay,
  dayWords,
  filterNotes,
  localIso,
  readings,
  tally,
  timeOf,
  viewName,
  type Note,
} from "@/lib/margin";
import { putOnDesk } from "./desk";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

type Payload = {
  notes: Note[];
  writable: boolean;
  specimen: boolean;
  speech: boolean;
  dir: string | null;
};

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const weekdayOf = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return WEEKDAY[new Date(y, m - 1, d).getDay()] ?? "";
};

/**
 * The margin read back: every note the reader made at the edge of a view,
 * newest first, by day — when, where, about what, and the words. Read by
 * view, by what it was about, or by a word; a spoken note can be written out
 * through the speech server on this machine, and any note's words changed or
 * taken back. Nothing here weighs a note.
 */
export default function Margin() {
  const [theme, setTheme] = useTheme();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [view, setView] = useState<string | null>(null);
  const [about, setAbout] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [lit, setLit] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    id: string;
    field: "text" | "said";
    draft: string;
  } | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const [trouble, setTrouble] = useState<string | null>(null);
  const players = useRef(new Map<string, HTMLAudioElement>());
  const now = useMemo(() => localIso(new Date()), []);

  useEffect(() => {
    putOnDesk(null);
    const p = new URLSearchParams(window.location.search);
    setView(p.get("view"));
    setAbout(p.get("about"));
    setLit(p.get("id"));
    fetch("/api/margin")
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Payload | null) => {
        if (!p) return;
        setPayload(p);
        setNotes(p.notes);
      })
      .catch(() => setTrouble("the margin could not be read"));
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (view) url.searchParams.set("view", view);
    else url.searchParams.delete("view");
    if (about) url.searchParams.set("about", about);
    else url.searchParams.delete("about");
    url.searchParams.delete("id");
    window.history.replaceState(null, "", url);
  }, [view, about]);

  useEffect(() => {
    if (!lit) return;
    const el = document.getElementById(`note-${lit}`);
    el?.scrollIntoView({ block: "center" });
    const t = window.setTimeout(() => setLit(null), 2400);
    return () => window.clearTimeout(t);
  }, [lit, notes.length]);

  const all = useMemo(() => tally(notes), [notes]);
  const shown = useMemo(
    () => filterNotes(notes, { view, about, q }),
    [notes, view, about, q],
  );
  const days = useMemo(() => byDay(shown), [shown]);
  const t = useMemo(() => tally(shown), [shown]);
  const words = useMemo(() => readings(t, now), [t, now]);
  const aboutLabel = useMemo(
    () =>
      about ? (notes.find((n) => aboutKey(n.about) === about)?.about?.label ?? about) : null,
    [about, notes],
  );
  const writable = payload?.writable ?? false;
  const speech = payload?.speech ?? false;

  const patch = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      setTrouble(null);
      const r = await fetch("/api/margin", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const out = (await r.json().catch(() => null)) as
        | (Note & { error?: undefined })
        | { error: string }
        | null;
      if (!r.ok || !out || "error" in out) {
        setTrouble(out && "error" in out && out.error ? out.error : `not kept (${r.status})`);
        return null;
      }
      setNotes((ns) => ns.map((n) => (n.id === id ? out : n)));
      return out;
    },
    [],
  );

  const say = useCallback(async (id: string) => {
    setBusy(id);
    setTrouble(null);
    try {
      const r = await fetch("/api/margin/say", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const out = (await r.json().catch(() => null)) as
        | (Note & { error?: undefined })
        | { error: string }
        | null;
      if (!r.ok || !out || "error" in out) {
        setTrouble(
          out && "error" in out && out.error ? out.error : `could not write it out (${r.status})`,
        );
        return;
      }
      setNotes((ns) => ns.map((n) => (n.id === id ? out : n)));
    } finally {
      setBusy(null);
    }
  }, []);

  const takeBack = useCallback(async (id: string) => {
    setTrouble(null);
    const r = await fetch(`/api/margin?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      setTrouble(`not taken back (${r.status})`);
      return;
    }
    players.current.get(id)?.pause();
    players.current.delete(id);
    setNotes((ns) => ns.filter((n) => n.id !== id));
    setSure(null);
  }, []);

  const toggle = useCallback(
    (n: Note) => {
      if (!n.audio) return;
      let a = players.current.get(n.id);
      if (!a) {
        a = new Audio(`/api/margin/audio/${encodeURIComponent(n.audio)}`);
        a.preload = "none";
        a.onended = () => setPlaying((p) => (p === n.id ? null : p));
        a.onerror = () => {
          setPlaying(null);
          setTrouble("the voice note could not be played");
        };
        players.current.set(n.id, a);
      }
      if (playing === n.id) {
        a.pause();
        setPlaying(null);
        return;
      }
      for (const [id, other] of players.current)
        if (id !== n.id) other.pause();
      a.currentTime = 0;
      a.play().catch(() => setTrouble("the voice note could not be played"));
      setPlaying(n.id);
    },
    [playing],
  );

  useEffect(() => {
    const map = players.current;
    return () => {
      for (const a of map.values()) a.pause();
      map.clear();
    };
  }, []);

  const commitEdit = useCallback(async () => {
    if (!editing) return;
    const cur = notes.find((n) => n.id === editing.id);
    const draft = editing.draft.trim();
    setEditing(null);
    if (!cur) return;
    if (editing.field === "text") {
      if (draft === cur.text) return;
      if (!draft && !cur.audio) {
        setTrouble("a note needs words; take it back instead");
        return;
      }
      await patch(cur.id, { text: draft });
    } else {
      if (draft === (cur.said ?? "")) return;
      await patch(cur.id, { said: draft });
    }
  }, [editing, notes, patch]);

  const chip =
    "chip m-seg px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";
  const mono = { fontFamily: "var(--font-mono)" } as const;

  return (
    <main className="margin scroll-thin relative h-dvh w-full overflow-y-auto">
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
                margin
              </div>
              <p
                className="hand mt-1 max-w-[27rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                What you said to yourself while you were looking. Every view
                has a margin — the tab at the edge, or the apostrophe — and
                this is where it lands: when, where, about what, in your words
                or your voice.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/margin" />
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {/* ── the notes ─────────────────────────────────────────────── */}
          <section
            className="panel sketched rise relative p-4 sm:p-6"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The margin's notes"
          >
            <Sketch seed="margin-sheet" draw />
            {payload?.specimen && (
              <p className="meta mb-4" style={{ color: "var(--faint)" }}>
                the specimen's margin · a deployed garden keeps none of its own
              </p>
            )}
            {(view || about || q) && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="meta" style={{ color: "var(--muted)" }}>
                  showing {shown.length} of {notes.length}
                </span>
                {view && (
                  <button
                    onClick={() => setView(null)}
                    className={chip}
                    style={{ ...mono, color: "var(--ink)" }}
                  >
                    at the {viewName(view)} ×
                  </button>
                )}
                {about && (
                  <button
                    onClick={() => setAbout(null)}
                    className={chip}
                    style={{ ...mono, color: "var(--ink)", textTransform: "none" }}
                  >
                    about {aboutLabel} ×
                  </button>
                )}
              </div>
            )}
            {payload && shown.length === 0 && (
              <p
                className="hand py-10 text-center text-[20px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                {notes.length === 0
                  ? "nothing in the margin yet. from any view, press ' — or the tab at the edge — and say what comes to mind."
                  : "nothing here reads that way."}
              </p>
            )}
            {days.map((d, di) => (
              <div key={d.day} className={di ? "mt-8" : ""}>
                <div className="flex items-baseline gap-3">
                  <h2
                    className="display text-[24px] leading-none"
                    style={{ color: "var(--ink)" }}
                  >
                    {dayWords(d.day, now)}
                  </h2>
                  <span className="meta" style={{ color: "var(--faint)" }}>
                    {weekdayOf(d.day)} · {d.notes.length}
                  </span>
                </div>
                <ol className="mt-3">
                  {d.notes.map((n) => {
                    const key = aboutKey(n.about);
                    const isEditing = editing?.id === n.id;
                    return (
                      <li
                        key={n.id}
                        id={`note-${n.id}`}
                        className="m-row relative grid gap-x-4 gap-y-1.5 rounded px-2 py-3 sm:grid-cols-[3.2rem_minmax(0,1fr)]"
                        style={{
                          borderBottom: "1px solid var(--rule)",
                          background:
                            lit === n.id
                              ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                              : undefined,
                        }}
                      >
                        <span
                          className="meta pt-1"
                          style={{ color: "var(--faint)" }}
                        >
                          {timeOf(n.at)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              onClick={() =>
                                setView(view === n.view ? null : n.view)
                              }
                              className={chip}
                              style={{
                                ...mono,
                                color:
                                  view === n.view ? "var(--ink)" : "var(--muted)",
                              }}
                              title="read only this view's notes"
                            >
                              {viewName(n.view)}
                            </button>
                            {n.about && key && (
                              <button
                                onClick={() =>
                                  setAbout(about === key ? null : key)
                                }
                                className={`${chip} max-w-[18rem] overflow-hidden text-ellipsis whitespace-nowrap`}
                                style={{
                                  ...mono,
                                  color:
                                    about === key ? "var(--ink)" : "var(--muted)",
                                  textTransform: "none",
                                }}
                                title={`read only the notes about ${n.about.label}`}
                              >
                                {n.about.label}
                              </button>
                            )}
                            <a
                              href={n.url}
                              className="meta"
                              style={{ color: "var(--faint)", textTransform: "none" }}
                              title={n.url}
                            >
                              go there →
                            </a>
                          </div>
                          {n.text && !(isEditing && editing.field === "text") && (
                            <p
                              className="mt-2 text-[15.5px] leading-[1.55] whitespace-pre-wrap"
                              style={{ color: "var(--ink)" }}
                              onDoubleClick={() =>
                                writable &&
                                setEditing({ id: n.id, field: "text", draft: n.text })
                              }
                              title={writable ? "double-click to change the words" : undefined}
                            >
                              {n.text}
                            </p>
                          )}
                          {isEditing && (
                            <textarea
                              autoFocus
                              value={editing.draft}
                              onChange={(e) =>
                                setEditing({ ...editing, draft: e.target.value })
                              }
                              onBlur={commitEdit}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  e.stopPropagation();
                                  setEditing(null);
                                }
                                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                  e.preventDefault();
                                  commitEdit();
                                }
                              }}
                              rows={Math.max(2, Math.min(10, editing.draft.split("\n").length + 1))}
                              aria-label={editing.field === "text" ? "The words" : "What was said"}
                              className="mt-2 w-full resize-none bg-transparent px-0 py-1 text-[15.5px] leading-[1.55]"
                              style={{
                                color: "var(--ink)",
                                borderBottom: "1px solid var(--accent)",
                              }}
                            />
                          )}
                          {n.audio && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {writable ? (
                                <button
                                  onClick={() => toggle(n)}
                                  className={`${chip} inline-flex items-center gap-1.5`}
                                  style={{
                                    ...mono,
                                    color:
                                      playing === n.id ? "var(--accent)" : "var(--muted)",
                                    borderColor:
                                      playing === n.id ? "var(--accent)" : undefined,
                                  }}
                                  aria-pressed={playing === n.id}
                                >
                                  <span
                                    className="m-dot"
                                    data-on={playing === n.id}
                                    aria-hidden
                                  />
                                  {playing === n.id ? "pause" : "play"}
                                  {n.seconds !== null ? ` · ${clock(n.seconds)}` : ""}
                                </button>
                              ) : (
                                <span className="meta" style={{ color: "var(--muted)" }}>
                                  spoken{n.seconds !== null ? ` · ${clock(n.seconds)}` : ""}
                                </span>
                              )}
                              {writable && !n.said && speech && (
                                <button
                                  onClick={() => say(n.id)}
                                  disabled={busy === n.id}
                                  className={`${chip} disabled:opacity-50`}
                                  style={{ ...mono, color: "var(--muted)" }}
                                >
                                  {busy === n.id ? "writing it out…" : "write it out"}
                                </button>
                              )}
                              {writable && !n.said && !speech && (
                                <span className="meta" style={{ color: "var(--faint)" }}>
                                  no speech server on this machine
                                </span>
                              )}
                            </div>
                          )}
                          {n.said && !(isEditing && editing.field === "said") && (
                            <div className="mt-2">
                              <span className="meta" style={{ color: "var(--faint)" }}>
                                said
                              </span>
                              <p
                                className="mt-1 text-[15.5px] leading-[1.55] whitespace-pre-wrap"
                                style={{ color: "var(--ink)" }}
                                onDoubleClick={() =>
                                  writable &&
                                  setEditing({ id: n.id, field: "said", draft: n.said ?? "" })
                                }
                                title={writable ? "double-click to correct it" : undefined}
                              >
                                {n.said}
                              </p>
                            </div>
                          )}
                          {writable && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {sure === n.id ? (
                                <>
                                  <span className="meta" style={{ color: "var(--muted)" }}>
                                    take it back — sure?
                                  </span>
                                  <button
                                    onClick={() => takeBack(n.id)}
                                    className={chip}
                                    style={{ ...mono, color: "var(--accent)", borderColor: "var(--accent)" }}
                                  >
                                    yes, take it back
                                  </button>
                                  <button
                                    onClick={() => setSure(null)}
                                    className={chip}
                                    style={{ ...mono, color: "var(--muted)" }}
                                  >
                                    keep it
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setSure(n.id)}
                                  className="meta m-seg"
                                  style={{ color: "var(--faint)" }}
                                >
                                  take it back
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </section>

          {/* ── the desk ──────────────────────────────────────────────── */}
          <aside className="flex flex-col gap-5">
            <section
              className="panel sketched rise relative p-4"
              style={{ borderRadius: 3, animationDelay: "120ms" }}
              aria-label="Read the margin by"
            >
              <Sketch seed="margin-desk" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                read by
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="a word"
                aria-label="Search the margin"
                className="mt-3 w-full bg-transparent px-0 py-1 text-[14.5px]"
                style={{ color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}
              />
              {all.byView.length > 0 && (
                <>
                  <div className="meta mt-4" style={{ color: "var(--faint)" }}>
                    where
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {all.byView.map((v) => (
                      <button
                        key={v.view}
                        onClick={() => setView(view === v.view ? null : v.view)}
                        className={chip}
                        style={{
                          ...mono,
                          color: view === v.view ? "var(--ink)" : "var(--muted)",
                          borderColor: view === v.view ? "var(--ink)" : undefined,
                        }}
                      >
                        {viewName(v.view)} · {v.n}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {all.byAbout.length > 0 && (
                <>
                  <div className="meta mt-4" style={{ color: "var(--faint)" }}>
                    about
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {all.byAbout.slice(0, 10).map((a) => {
                      const k = aboutKey(a.about)!;
                      return (
                        <button
                          key={k}
                          onClick={() => setAbout(about === k ? null : k)}
                          className={`${chip} max-w-full overflow-hidden text-ellipsis whitespace-nowrap`}
                          style={{
                            ...mono,
                            color: about === k ? "var(--ink)" : "var(--muted)",
                            borderColor: about === k ? "var(--ink)" : undefined,
                            textTransform: "none",
                          }}
                          title={a.about.label}
                        >
                          {a.about.label} · {a.n}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            <section
              className="panel sketched rise relative p-4"
              style={{ borderRadius: 3, animationDelay: "180ms" }}
              aria-label="The reading"
            >
              <Sketch seed="margin-reading" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                the reading{view || about || q ? " · of what is shown" : ""}
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {words.map((w) => (
                  <li
                    key={w}
                    className="hand text-[15.5px] leading-[1.3]"
                    style={{ color: "var(--ink)" }}
                  >
                    {w}
                  </li>
                ))}
              </ul>
              {trouble && (
                <p
                  className="hand fade mt-3 text-[14.5px]"
                  style={{ color: "var(--accent)" }}
                  role="alert"
                >
                  {trouble}
                </p>
              )}
              <p className="meta mt-4" style={{ color: "var(--faint)", textTransform: "none" }}>
                {payload?.dir
                  ? `kept in ${payload.dir.replace(/^\/Users\/[^/]+/, "~")}`
                  : payload?.specimen
                    ? "fiction, like the rest of the specimen"
                    : ""}
                {payload?.writable
                  ? speech
                    ? " · speech server on this machine"
                    : " · no speech server found; spoken notes stay spoken"
                  : ""}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
