"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GARDEN_KINDS,
  GARDEN_KIND_LABEL,
  deckCards,
  readings,
  shuffle,
  tally,
  type Card,
  type Deck,
} from "@/lib/oblique";
import type { Note } from "@/lib/margin";
import { putOnDesk } from "./desk";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

type Payload = {
  decks: Deck[];
  garden: Card[];
  about: { id: string; label: string; kind: string } | null;
  writable: boolean;
  dir: string | null;
};

const mono = { fontFamily: "var(--font-mono)" } as const;
const chip = "chip o-seg px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";

/**
 * The oblique: one card at a time, dealt from the decks and from the garden
 * itself, to come at whatever is on the desk from an angle. Click, space or
 * → deals; ← goes back along this sitting's draws. Sources are struck from
 * the shuffle rather than chosen into it, since every card is fair game
 * until the reader says otherwise. The card is put on the desk so a note in
 * the margin can say what it turned up. Nothing here picks a card over
 * another, or says what one means.
 */
export default function Oblique() {
  const [theme, setTheme] = useTheme();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [off, setOff] = useState<Set<string>>(() => new Set());
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [history, setHistory] = useState<Card[]>([]);
  const [at, setAt] = useState(-1);
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [deckSlug, setDeckSlug] = useState("deck");
  const [busy, setBusy] = useState(false);
  const [sure, setSure] = useState(false);
  const [trouble, setTrouble] = useState<string | null>(null);
  const pos = useRef(0);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    fetch(`/api/oblique${id ? `?id=${encodeURIComponent(id)}` : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Payload | null) => {
        if (p) setPayload(p);
        else setTrouble("the deck could not be read");
      })
      .catch(() => setTrouble("the deck could not be read"));
    fetch("/api/margin")
      .then((r) => (r.ok ? r.json() : null))
      .then((m: { notes?: Note[] } | null) => {
        if (m?.notes) setNotes(m.notes.filter((n) => n.view === "/oblique"));
      })
      .catch(() => {});
  }, []);

  const pool = useMemo(() => {
    if (!payload) return [];
    const out: Card[] = [];
    for (const d of payload.decks) if (!off.has(d.slug)) out.push(...deckCards(d));
    for (const c of payload.garden)
      if (c.kind && !off.has(`garden:${c.kind}`)) out.push(c);
    return out;
  }, [payload, off]);

  const order = useMemo(() => shuffle(pool, seed), [pool, seed]);
  useEffect(() => {
    pos.current = 0;
  }, [pool]);

  const card = at >= 0 ? history[at] : null;

  useEffect(() => {
    putOnDesk(card ? { kind: "card", id: card.id, label: card.text } : null);
    return () => putOnDesk(null);
  }, [card]);

  const deal = useCallback(() => {
    if (at < history.length - 1) {
      setAt(at + 1);
      return;
    }
    if (!order.length) return;
    let next: Card;
    if (pos.current >= order.length) {
      const again = shuffle(pool, seed + 1);
      setSeed(seed + 1);
      next = again[0];
      pos.current = 1;
    } else {
      next = order[pos.current++];
    }
    const h = [...history, next];
    setHistory(h);
    setAt(h.length - 1);
    setSure(false);
  }, [at, history, order, pool, seed]);

  const back = useCallback(() => {
    if (at > 0) setAt(at - 1);
    setSure(false);
  }, [at]);

  const again = useCallback(() => {
    setSeed((s) => s + 7);
    pos.current = 0;
    setSure(false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // A focused button or link takes space and enter itself — the card is one.
      const onControl = t && (t.tagName === "BUTTON" || t.tagName === "A");
      if (e.key === "ArrowRight" || (!onControl && (e.key === " " || e.key === "Enter"))) {
        e.preventDefault();
        deal();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deal, back]);

  const toggle = (k: string) =>
    setOff((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const add = useCallback(async () => {
    const text = draft.trim();
    if (!text || !payload?.writable) return;
    setBusy(true);
    setTrouble(null);
    try {
      const r = await fetch("/api/oblique", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deck: deckSlug, text }),
      });
      const out = (await r.json().catch(() => null)) as Deck | { error: string } | null;
      if (!r.ok || !out || "error" in out) {
        setTrouble(out && "error" in out ? out.error : `not kept (${r.status})`);
        return;
      }
      setPayload((p) =>
        p
          ? {
              ...p,
              decks: p.decks.some((d) => d.slug === out.slug)
                ? p.decks.map((d) => (d.slug === out.slug ? out : d))
                : [...p.decks, out],
            }
          : p,
      );
      setDraft("");
    } finally {
      setBusy(false);
    }
  }, [draft, deckSlug, payload]);

  const takeBack = useCallback(async () => {
    if (!card || card.from === "garden") return;
    const deck = payload?.decks.find((d) => d.slug === card.from);
    if (!deck?.own) return;
    const index = Number(card.id.split(":")[1]);
    setBusy(true);
    setTrouble(null);
    try {
      const r = await fetch(
        `/api/oblique?deck=${encodeURIComponent(card.from)}&index=${index}`,
        { method: "DELETE" },
      );
      const out = (await r.json().catch(() => null)) as Deck | null;
      if (!r.ok || !out) {
        setTrouble(`not taken back (${r.status})`);
        return;
      }
      setPayload((p) =>
        p ? { ...p, decks: p.decks.map((d) => (d.slug === out.slug ? out : d)) } : p,
      );
      setSure(false);
    } finally {
      setBusy(false);
    }
  }, [card, payload]);

  const t = useMemo(
    () => (payload ? tally(payload.decks, payload.garden) : null),
    [payload],
  );
  const words = useMemo(
    () =>
      t
        ? readings(t, { pool: pool.length, dealt: history.length, notes: notes.length })
        : [],
    [t, pool.length, history.length, notes.length],
  );
  const ownDecks = payload?.decks.filter((d) => d.own) ?? [];
  const cardDeck = card ? payload?.decks.find((d) => d.slug === card.from) : undefined;
  const dealtSoFar = Math.min(pos.current, order.length);

  return (
    <main className="oblique scroll-thin relative h-dvh w-full overflow-y-auto">
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
                oblique
              </div>
              <p
                className="hand mt-1 max-w-[27rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                A card, dealt, to come at the thing from an angle. Some are from
                a deck; some the garden deals from what you have let lie. Take
                it literally for ten minutes, then say what it turned up.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/oblique" />
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

        {payload?.about && (
          <p
            className="hand rise mt-4 text-[17px]"
            style={{ color: "var(--muted)", animationDelay: "40ms" }}
          >
            about{" "}
            <Link
              href={`/catalogue?id=${encodeURIComponent(payload.about.id)}`}
              className="o-link"
              style={{ color: "var(--ink)" }}
            >
              “{payload.about.label}”
            </Link>
          </p>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {/* ── the card ──────────────────────────────────────────────── */}
          <section
            className="rise flex min-w-0 flex-col gap-4"
            style={{ animationDelay: "60ms" }}
            aria-label="The card"
          >
            <button
              onClick={deal}
              className="o-card panel sketched relative flex min-h-[22rem] w-full flex-col justify-between p-6 text-left sm:min-h-[26rem] sm:p-10"
              style={{ borderRadius: 3 }}
              aria-label={card ? "Deal the next card" : "Deal a card"}
              disabled={!pool.length}
            >
              {card ? (
                <div key={card.id} className="o-dealt relative flex h-full flex-1 flex-col justify-between">
                  <Sketch seed={card.id} draw />
                  <div className="meta flex flex-wrap items-baseline gap-x-3" style={{ color: "var(--accent)" }}>
                    <span>
                      {card.from === "garden"
                        ? `from the garden · ${card.kind ? GARDEN_KIND_LABEL[card.kind] : ""}`
                        : cardDeck?.title ?? card.from}
                    </span>
                    <span style={{ color: "var(--faint)" }}>
                      {at + 1} of {history.length} this sitting
                    </span>
                  </div>
                  <p
                    className="display my-8 max-w-[30rem] text-[30px] leading-[1.15] sm:text-[40px]"
                    style={{ color: "var(--ink)" }}
                  >
                    {card.text}
                  </p>
                  <div className="hand flex flex-wrap items-baseline justify-between gap-2 text-[15px]" style={{ color: "var(--faint)" }}>
                    <span>click, space or → for the next · ← back</span>
                    {card.stone && (
                      <Link
                        href={`/catalogue?id=${encodeURIComponent(card.stone.id)}`}
                        className="o-link"
                        style={{ color: "var(--muted)" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        open the stone →
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative flex h-full flex-1 flex-col items-center justify-center text-center">
                  <Sketch seed="oblique-empty" draw />
                  <p
                    className="display text-[30px] leading-[1.15] sm:text-[38px]"
                    style={{ color: "var(--ink)" }}
                  >
                    {payload
                      ? pool.length
                        ? "Deal a card."
                        : "Every source is struck. Unstrike one."
                      : "Reading the deck…"}
                  </p>
                  {payload && pool.length > 0 && (
                    <p className="hand mt-3 text-[17px]" style={{ color: "var(--muted)" }}>
                      click here, or press space · {pool.length} in the shuffle
                    </p>
                  )}
                </div>
              )}
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={deal}
                disabled={!pool.length}
                className={chip}
                style={{ ...mono, color: "var(--ink)" }}
              >
                deal
              </button>
              <button
                onClick={back}
                disabled={at <= 0}
                className={chip}
                style={{ ...mono, color: at > 0 ? "var(--muted)" : "var(--faint)" }}
              >
                ← back
              </button>
              <button
                onClick={again}
                disabled={!pool.length}
                className={chip}
                style={{ ...mono, color: "var(--muted)" }}
                title="Shuffle the pool again"
              >
                shuffle
              </button>
              {payload?.writable && card && cardDeck?.own && (
                <button
                  onClick={() => (sure ? void takeBack() : setSure(true))}
                  disabled={busy}
                  className={chip}
                  style={{ ...mono, color: sure ? "var(--accent)" : "var(--muted)" }}
                >
                  {sure ? "take it back — sure?" : "take this card back"}
                </button>
              )}
              <span className="meta ml-auto" style={{ color: "var(--faint)" }}>
                {pool.length ? `${dealtSoFar} of ${pool.length} in this shuffle` : ""}
              </span>
            </div>

            {history.length > 1 && (
              <div
                className="flex flex-wrap items-baseline gap-x-2 gap-y-1"
                aria-label="Dealt this sitting"
              >
                <span className="meta" style={{ color: "var(--faint)" }}>
                  dealt
                </span>
                {history.map((c, i) => (
                  <button
                    key={`${c.id}-${i}`}
                    onClick={() => {
                      setAt(i);
                      setSure(false);
                    }}
                    className="o-draw hand relative max-w-[16rem] overflow-hidden text-left text-[15px] text-ellipsis whitespace-nowrap"
                    style={{ color: i === at ? "var(--ink)" : "var(--faint)" }}
                    aria-current={i === at ? "true" : undefined}
                  >
                    {c.text}
                    {i === at && <Sketch kind="underline" seed={`draw-${i}`} color="var(--accent)" />}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ── the desk ──────────────────────────────────────────────── */}
          <aside className="flex min-w-0 flex-col gap-5">
            <section
              className="panel sketched rise relative p-4"
              style={{ borderRadius: 3, animationDelay: "120ms" }}
              aria-label="The shuffle"
            >
              <Sketch seed="oblique-desk" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                in the shuffle
              </div>
              <p className="hand mt-1 text-[15px]" style={{ color: "var(--faint)" }}>
                strike a source to leave it out
              </p>
              <div className="meta mt-3" style={{ color: "var(--faint)" }}>
                decks
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {payload?.decks.map((d) => {
                  const on = !off.has(d.slug);
                  return (
                    <button
                      key={d.slug}
                      onClick={() => toggle(d.slug)}
                      className={chip}
                      style={{
                        ...mono,
                        color: on ? "var(--ink)" : "var(--faint)",
                        borderColor: on ? "var(--ink)" : undefined,
                      }}
                      aria-pressed={on}
                    >
                      {d.title} · {d.cards.length}
                      {!on && <Sketch kind="strike" seed={`deck-${d.slug}`} draw />}
                    </button>
                  );
                })}
              </div>
              <div className="meta mt-4" style={{ color: "var(--faint)" }}>
                the garden deals
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {GARDEN_KINDS.map((k) => {
                  const n = t?.garden[k] ?? 0;
                  const on = !off.has(`garden:${k}`);
                  return (
                    <button
                      key={k}
                      onClick={() => toggle(`garden:${k}`)}
                      disabled={!n}
                      className={chip}
                      style={{
                        ...mono,
                        color: !n ? "var(--faint)" : on ? "var(--ink)" : "var(--faint)",
                        borderColor: n && on ? "var(--ink)" : undefined,
                        opacity: n ? 1 : 0.5,
                      }}
                      aria-pressed={on}
                    >
                      {GARDEN_KIND_LABEL[k]} · {n}
                      {n > 0 && !on && <Sketch kind="strike" seed={`garden-${k}`} draw />}
                    </button>
                  );
                })}
              </div>

              {payload?.writable && (
                <>
                  <div className="meta mt-5" style={{ color: "var(--accent)" }}>
                    add a card
                  </div>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void add();
                      }
                    }}
                    rows={2}
                    placeholder="in your words, one card"
                    aria-label="A new card"
                    className="scroll-thin mt-2 w-full resize-none bg-transparent px-0 py-1 text-[14.5px] leading-[1.5]"
                    style={{ color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="meta" style={{ color: "var(--faint)" }}>
                      into
                    </span>
                    {[...new Set(["deck", ...ownDecks.map((d) => d.slug)])].map((s) => (
                      <button
                        key={s}
                        onClick={() => setDeckSlug(s)}
                        className={chip}
                        style={{
                          ...mono,
                          color: deckSlug === s ? "var(--ink)" : "var(--muted)",
                          borderColor: deckSlug === s ? "var(--ink)" : undefined,
                        }}
                        aria-pressed={deckSlug === s}
                      >
                        {ownDecks.find((d) => d.slug === s)?.title ?? "your deck"}
                      </button>
                    ))}
                    <button
                      onClick={() => void add()}
                      disabled={busy || !draft.trim()}
                      className={`${chip} ml-auto`}
                      style={{ ...mono, color: draft.trim() ? "var(--ink)" : "var(--faint)" }}
                    >
                      keep
                    </button>
                  </div>
                  <p className="hand mt-2 text-[14.5px] leading-[1.3]" style={{ color: "var(--faint)" }}>
                    or paste a whole deck you own into a file beside it — one card per paragraph
                  </p>
                </>
              )}
              {trouble && (
                <p className="meta mt-3" style={{ color: "var(--accent)" }} role="alert">
                  {trouble}
                </p>
              )}
            </section>

            <section
              className="panel sketched rise relative p-4"
              style={{ borderRadius: 3, animationDelay: "180ms" }}
              aria-label="The reading"
            >
              <Sketch seed="oblique-reading" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                the reading
              </div>
              <p className="mt-2 text-[13.5px] leading-[1.6]" style={{ color: "var(--ink)" }}>
                {words.join(" · ")}
              </p>
              {notes.length > 0 && (
                <>
                  <div className="meta mt-4" style={{ color: "var(--faint)" }}>
                    what cards turned up
                  </div>
                  <ol className="mt-2 flex flex-col gap-2.5">
                    {notes.slice(0, 8).map((n) => (
                      <li key={n.id} className="text-[13.5px] leading-[1.5]">
                        {n.about && (
                          <div className="hand text-[15px]" style={{ color: "var(--muted)" }}>
                            {n.about.label}
                          </div>
                        )}
                        <div style={{ color: "var(--ink)" }}>{n.said ?? n.text}</div>
                        <div className="meta mt-0.5" style={{ color: "var(--faint)", textTransform: "none" }}>
                          {n.at.slice(0, 10)}
                        </div>
                      </li>
                    ))}
                  </ol>
                  <Link
                    href="/margin?view=%2Foblique"
                    className="o-link meta mt-3 inline-block"
                    style={{ color: "var(--muted)" }}
                  >
                    all of them in the margin →
                  </Link>
                </>
              )}
              <p className="meta mt-4" style={{ color: "var(--faint)", textTransform: "none" }}>
                {payload?.dir
                  ? `decks kept in ${payload.dir.replace(/^\/Users\/[^/]+/, "~")}`
                  : payload && !payload.writable
                    ? "a deployed garden deals the starter deck and its public stones; nothing is kept"
                    : ""}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
