"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DRAFT,
  emptyBotec,
  fmt,
  hasContent,
  readGuess,
  readings,
  recordReadings,
  summarise,
  swingOf,
  tally,
  titleOf,
  viewWords,
  work,
  type Botec as B,
} from "@/lib/botec";
import { dayWords } from "@/lib/fence";
import { EXAMPLE_BOTEC } from "@/content/botec";
import Envelope from "./Envelope";
import { putOnDesk } from "./desk";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

type Payload = { botecs: B[]; writable: boolean; dir: string | null };

const mono = { fontFamily: "var(--font-mono)" } as const;
const chip = "chip bt-seg px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";
const localToday = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const grow = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};

function Chip({
  children,
  onClick,
  accent,
  on,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  accent?: boolean;
  on?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={chip}
      style={{
        ...mono,
        color: accent ? "var(--accent)" : on ? "var(--ink)" : "var(--muted)",
        borderColor: accent ? "var(--accent)" : on ? "var(--ink)" : undefined,
      }}
    >
      {children}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="meta" style={{ color: "var(--accent)" }}>
      {children}
    </div>
  );
}

/**
 * The botec at full size: one envelope on the sheet — the question, the lines
 * with the ladder beside them, the answer as a hundred dots, what it leans on,
 * a line across it — and afterwards, what it came to. The desk reads it back
 * and keeps the record of every envelope kept, from whichever view it was
 * started at.
 */
export default function Botec() {
  const [theme, setTheme] = useTheme();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [open, setOpen] = useState<B | null>(null);
  const [kept, setKept] = useState(false);
  const [example, setExample] = useState(false);
  const [trouble, setTrouble] = useState<string | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const [focus, setFocus] = useState(0);
  const openRef = useRef<B | null>(null);
  const keptRef = useRef(false);
  const slugRef = useRef("");
  const dirty = useRef(false);
  // Counts the changes, so a save that lands after another change does not mark that one kept.
  const rev = useRef(0);
  const saving = useRef<Promise<void>>(Promise.resolve());
  openRef.current = open;
  keptRef.current = kept;
  const writable = payload?.writable ?? false;
  const today = useMemo(localToday, []);

  const fresh = useCallback((asExample = false) => {
    const day = localToday();
    slugRef.current = "";
    dirty.current = false;
    setKept(false);
    setExample(asExample);
    setOpen(
      asExample
        ? {
            ...EXAMPLE_BOTEC,
            put: day,
            touched: day,
            view: "/botec",
            url: "/botec",
          }
        : emptyBotec(day, { view: "/botec", url: "/botec" }),
    );
    setSure(null);
    setTrouble(null);
    // The example is for looking at; a new envelope is for writing on.
    if (!asExample) setFocus((f) => f + 1);
  }, []);
  const load = useCallback((b: B) => {
    slugRef.current = b.slug;
    dirty.current = false;
    setKept(true);
    setExample(false);
    setOpen(b);
    setSure(null);
    setTrouble(null);
  }, []);

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("slug");
    fetch("/api/botec")
      .then((r) => (r.ok ? r.json() : null))
      .then((pl: Payload | null) => {
        if (!pl) {
          setTrouble("the envelopes could not be read");
          return;
        }
        setPayload(pl);
        const wanted = slug ? pl.botecs.find((x) => x.slug === slug) : null;
        if (wanted) load(wanted);
        else if (pl.botecs[0]) load(pl.botecs[0]);
        else fresh(true);
      })
      .catch(() => setTrouble("the envelopes could not be read"));
  }, [fresh, load]);

  // Only once the envelopes are read: in development React mounts twice, and a sync on the
  // first mount would take the slug off the address before the second could read it.
  const loaded = payload !== null;
  useEffect(() => {
    if (!loaded) return;
    const url = new URL(window.location.href);
    if (kept && open?.slug) url.searchParams.set("slug", open.slug);
    else url.searchParams.delete("slug");
    window.history.replaceState(null, "", url);
    putOnDesk(
      kept && open
        ? { kind: "botec", id: open.slug, label: titleOf(open).slice(0, 60) }
        : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, kept, open?.slug]);
  useEffect(() => () => putOnDesk(null), []);

  /* ── keeping ─────────────────────────────────────────────────────────── */

  const save = useCallback(
    (b: B) =>
      new Promise<B | null>((resolve) => {
        const at = rev.current;
        saving.current = saving.current.then(async () => {
          const isFresh = !slugRef.current;
          try {
            const r = await fetch("/api/botec", {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                botec: { ...b, slug: slugRef.current, touched: localToday() },
                fresh: isFresh,
              }),
            });
            const out = (await r.json().catch(() => null)) as
              B | { error: string } | null;
            if (!r.ok || !out || "error" in out) {
              setTrouble(
                out && "error" in out ? out.error : `not kept (${r.status})`,
              );
              resolve(null);
              return;
            }
            slugRef.current = out.slug;
            if (rev.current === at) dirty.current = false;
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
                    botecs: [
                      out,
                      ...p.botecs.filter((x) => x.slug !== out.slug),
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

  /** A change on the sheet; kept when it is finished, if the envelope is kept. */
  const edit = useCallback(
    (f: (b: B) => B, done?: boolean) => {
      const cur = openRef.current;
      if (!cur) return;
      const next = f(cur);
      if (next !== cur) {
        // The ref moves now, not on the next render, so a second edit before then builds on this one.
        openRef.current = next;
        dirty.current = true;
        rev.current++;
        setOpen(next);
        setExample(false);
        setSure(null);
      }
      if (done && dirty.current && keptRef.current && writable)
        void save(openRef.current!);
    },
    [save, writable],
  );

  const keep = useCallback(() => {
    const b = openRef.current;
    if (!b || !writable) return;
    if (!hasContent(b)) {
      setTrouble("put down what you are working out, or a line");
      return;
    }
    void save(b);
  }, [save, writable]);

  const remove = useCallback(async () => {
    const b = openRef.current;
    if (!b || !writable || !keptRef.current) return;
    const r = await fetch(`/api/botec?slug=${encodeURIComponent(b.slug)}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      setTrouble(`not taken off (${r.status})`);
      return;
    }
    // The strip holds its envelope in this browser; if it was this one, it goes too.
    try {
      const raw = localStorage.getItem(DRAFT);
      if (raw && (JSON.parse(raw) as { slug?: string }).slug === b.slug)
        localStorage.removeItem(DRAFT);
    } catch {}
    setPayload((p) =>
      p ? { ...p, botecs: p.botecs.filter((x) => x.slug !== b.slug) } : p,
    );
    fresh();
  }, [writable, fresh]);

  // On the sheet the backslash starts a new envelope, the way it opens one everywhere else.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing =
        !!el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);
      if (
        e.key === "\\" &&
        !typing &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        writable
      ) {
        e.preventDefault();
        fresh();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fresh, writable]);

  /* ── the reading ─────────────────────────────────────────────────────── */

  const shape = open
    ? JSON.stringify([
        open.lines,
        open.unit,
        open.line,
        open.lineName,
        open.came,
      ])
    : "";
  const words = useMemo(() => {
    if (!open) return [];
    const w = work(open.lines);
    return readings(open, w, summarise(w.out), swingOf(open.lines));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape]);
  const botecs = payload?.botecs ?? [];
  const record = useMemo(
    () => recordReadings(tally(botecs, today)),
    [botecs, today],
  );
  const rows = useMemo(
    () =>
      botecs
        .slice(0, 30)
        .map((b) => ({ b, s: summarise(work(b.lines).out, 0) })),
    [botecs],
  );

  return (
    <main className="botec scroll-thin relative h-dvh w-full overflow-y-auto">
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
                botec
              </div>
              <p
                className="hand mt-1 max-w-[31rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                Work a thing out on the back of an envelope: a line at a time, a
                rough number or a range on each, and see how far the answer
                could run and what it leans on. The backslash opens one on any
                view.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/botec" />
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
            className="panel sketched rise relative min-w-0 p-5 sm:p-8"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The envelope"
          >
            <Sketch seed={`botec-${open?.slug || "fresh"}`} draw />
            {!open ? (
              <p className="meta" style={{ color: "var(--faint)" }}>
                {trouble ?? "reading…"}
              </p>
            ) : (
              <>
                <div className="relative z-[2] flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    {kept
                      ? `an envelope · kept ${dayWords(open.put)}`
                      : example
                        ? "an example — Fermi's piano tuners"
                        : "a new envelope"}
                    {open.view && open.view !== "/botec" && (
                      <>
                        {" · started at the "}
                        <Link
                          href={open.url || open.view}
                          className="bt-link"
                          style={{ color: "var(--ink)", textTransform: "none" }}
                        >
                          {viewWords(open.view)}
                        </Link>
                      </>
                    )}
                    {open.about && (
                      <span
                        style={{ color: "var(--muted)", textTransform: "none" }}
                      >
                        {` · about ${open.about.label.length > 48 ? `${open.about.label.slice(0, 47)}…` : open.about.label}`}
                      </span>
                    )}
                  </div>
                  {(kept || example || hasContent(open)) && writable && (
                    <Chip onClick={() => fresh()}>a new envelope</Chip>
                  )}
                </div>
                {example && (
                  <p
                    className="hand relative z-[2] mt-1 text-[14.5px] leading-[1.3]"
                    style={{ color: "var(--faint)" }}
                  >
                    Enrico Fermi asked his students how many piano tuners there
                    are in Chicago. Drag a number, or write over it; it is kept
                    only when you keep it.
                  </p>
                )}

                <div className="mt-3">
                  <Envelope
                    botec={open}
                    edit={edit}
                    writable={writable}
                    wide
                    seed={open.slug || "fresh"}
                    focus={focus}
                    onKeep={!kept ? keep : undefined}
                  />
                </div>

                {!kept && writable && (
                  <div className="relative z-[2] mt-6 flex flex-wrap items-center gap-2">
                    <Chip
                      onClick={keep}
                      on={hasContent(open)}
                      disabled={!hasContent(open)}
                    >
                      keep this envelope
                    </Chip>
                    <span
                      className="meta"
                      style={{
                        color: "var(--faint)",
                        textTransform: "none",
                        letterSpacing: "0.02em",
                      }}
                    >
                      ⌘↵ · one file in the vault; the draws are taken again from
                      it each time
                    </span>
                  </div>
                )}

                {kept && (
                  <div
                    className="relative z-[2] mt-8"
                    style={{ borderTop: "1px solid var(--rule)" }}
                  >
                    <div className="mt-5">
                      <Label>afterwards</Label>
                    </div>
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span
                        className="hand text-[18px]"
                        style={{ color: "var(--muted)" }}
                      >
                        it came to
                      </span>
                      <Came
                        value={open.came}
                        writable={writable}
                        onCommit={(v) =>
                          edit(
                            (b) => ({
                              ...b,
                              came: v,
                              cameOn:
                                v === null ? "" : b.cameOn || localToday(),
                            }),
                            true,
                          )
                        }
                      />
                      {open.unit.trim() && open.came !== null && (
                        <span
                          className="hand text-[18px]"
                          style={{ color: "var(--muted)" }}
                        >
                          {open.unit.trim()}
                        </span>
                      )}
                      {open.cameOn && (
                        <span
                          className="meta"
                          style={{ color: "var(--faint)" }}
                        >
                          looked up {dayWords(open.cameOn)}
                        </span>
                      )}
                    </div>
                    <textarea
                      ref={(el) => grow(el)}
                      onInput={(e) => grow(e.currentTarget)}
                      value={open.after}
                      onChange={(e) =>
                        edit((b) => ({ ...b, after: e.target.value }), false)
                      }
                      onBlur={() => edit((b) => b, true)}
                      readOnly={!writable}
                      rows={2}
                      placeholder={
                        writable
                          ? "afterwards, in your words — where it came from, what the envelope missed"
                          : ""
                      }
                      aria-label="Afterwards"
                      className="bt-case mt-3 w-full resize-none overflow-hidden bg-transparent px-0 py-1 text-[15.5px] leading-[1.55]"
                      style={{ color: "var(--ink)" }}
                    />
                  </div>
                )}

                {kept && writable && (
                  <div className="relative z-[2] mt-6 flex flex-wrap gap-1.5">
                    <Chip
                      onClick={() =>
                        sure === "off" ? void remove() : setSure("off")
                      }
                      accent={sure === "off"}
                    >
                      {sure === "off"
                        ? "take it off the record — sure?"
                        : "take it off the record"}
                    </Chip>
                  </div>
                )}
                {trouble && (
                  <p
                    className="meta relative z-[2] mt-3"
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
              <Sketch seed="botec-reading" draw />
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
              <Sketch seed="botec-record" draw />
              <Label>the record</Label>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                {payload ? record.join(" · ") : "reading…"}
              </p>
              {rows.length > 0 && (
                <ol className="mt-2 flex flex-col">
                  {rows.map(({ b, s }, i) => {
                    const on = kept && open?.slug === b.slug;
                    const u = b.unit.trim() ? ` ${b.unit.trim()}` : "";
                    return (
                      <li
                        key={b.slug}
                        className="bt-rec"
                        style={{ ["--i" as string]: i }}
                      >
                        <button
                          onClick={() => load(b)}
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
                            {dayWords(b.put)}
                            {b.view ? ` · at the ${viewWords(b.view)}` : ""}
                            {b.came !== null ? " · looked up" : ""}
                          </span>
                          <span
                            className="display text-[15.5px] leading-[1.25]"
                            style={{ color: "var(--ink)" }}
                          >
                            {titleOf(b)}
                          </span>
                          <span
                            className="hand text-[14.5px]"
                            style={{ color: "var(--muted)" }}
                          >
                            {s
                              ? `≈ ${fmt(s.mid)}${u}${s.lo !== s.hi ? ` · ${fmt(s.lo)} to ${fmt(s.hi)}` : ""}`
                              : "no number yet"}
                            {b.came !== null ? ` · came to ${fmt(b.came)}` : ""}
                          </span>
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
              aria-label="What the botec holds to"
            >
              <Sketch seed="botec-laws" draw />
              <Label>what the botec holds to</Label>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                A back-of-the-envelope calculation works a thing out from rough
                guesses, a line at a time, the way Enrico Fermi asked his
                students how many piano tuners there are in Chicago. The lines
                are taken down the page in order, times unless a line says
                otherwise.
              </p>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                A range is read as the middle nine in ten of what the line could
                be, and five thousand draws of every range are taken together,
                so the answer is a spread: a hundred dots, each a hundredth of
                the draws. What it leans on moves one range from its bottom to
                its top with the rest held at their middles.
              </p>
              <p
                className="mt-2 text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink)" }}
              >
                Every number is yours; the envelope multiplies them and draws
                them. It never supplies a number and never says whether a thing
                is worth doing. A line across the answer is yours too — it only
                counts the draws on each side.
              </p>
              <p
                className="meta mt-3"
                style={{ color: "var(--faint)", textTransform: "none" }}
              >
                Douglas Hubbard, How to Measure Anything (2007) · Kay, Kola,
                Hullman and Munson, When (ish) is my bus? (2016), the quantile
                dotplot
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

/** What it came to, typed in place; empty takes it back. */
function Came({
  value,
  writable,
  onCommit,
}: {
  value: number | null;
  writable: boolean;
  onCommit: (v: number | null) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? (value === null ? "" : fmt(value).replace("−", "-"));
  return (
    <input
      value={shown}
      readOnly={!writable}
      onFocus={(e) => {
        if (!writable) return;
        setText(value === null ? "" : fmt(value).replace("−", "-"));
        e.currentTarget.select();
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text !== null) {
          if (!text.trim()) {
            if (value !== null) onCommit(null);
          } else {
            const g = readGuess(text);
            if (g.kind === "point" && g.at.v !== value) onCommit(g.at.v);
          }
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
      placeholder={writable ? "a number" : "—"}
      aria-label="What it came to"
      className="bt-value hand text-[22px]"
      style={{
        width: `${Math.max(3.4, (shown || "a number").length * 0.5 + 0.6)}em`,
        color: "var(--ink)",
      }}
    />
  );
}
