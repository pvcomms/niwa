"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  MARKS,
  MARK_LABEL,
  MARK_SHORT,
  TELL_KINDS,
  TELL_LABEL,
  adopt,
  census,
  emptyMask,
  keepAll,
  leans,
  markOf,
  proposedCount,
  readings,
  setMark,
  tally,
  uid,
  validateProposal,
  type Mark,
  type Mask as M,
  type TellKind,
} from "@/lib/mask";
import { putOnDesk } from "./desk";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

type Payload = {
  masks: M[];
  values: { name: string; terms: string[] }[];
  about: { id: string; label: string; first: string } | null;
  writable: boolean;
  dir: string | null;
  model: string | null;
};

const mono = { fontFamily: "var(--font-mono)" } as const;
const chip = "chip k-seg px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * The mask: the other side's case written as they would put it, then marked
 * sentence by sentence for what the reader could mean. Two cases side by
 * side, each with its census of tells; the sentences of the mask with three
 * marks; an adherent's reading, proposed by the model on this machine and
 * hollow until kept; where the reader stands, written last. The desk says
 * what crossed, what was refused, which values each case leans on and what
 * the two share. Nothing here says whether the mask passes.
 */
export default function Mask() {
  const [theme, setTheme] = useTheme();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [open, setOpen] = useState<M | null>(null);
  const [matter, setMatter] = useState("");
  const [side, setSide] = useState("");
  const [other, setOther] = useState("");
  const [newTell, setNewTell] = useState("");
  const [newTellKind, setNewTellKind] = useState<TellKind>("distance");
  const [asking, setAsking] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [trouble, setTrouble] = useState<string | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const openRef = useRef<M | null>(null);
  const slugRef = useRef("");
  const saving = useRef<Promise<void>>(Promise.resolve());
  openRef.current = open;
  const today = useMemo(localToday, []);
  const writable = payload?.writable ?? false;

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const slug = p.get("slug");
    const id = p.get("id");
    fetch(`/api/mask${id ? `?id=${encodeURIComponent(id)}` : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((pl: Payload | null) => {
        if (!pl) {
          setTrouble("the masks could not be read");
          return;
        }
        setPayload(pl);
        if (pl.about) setMatter((t) => t || pl.about!.first || pl.about!.label);
        if (slug) {
          const m = pl.masks.find((x) => x.slug === slug);
          if (m) {
            slugRef.current = m.slug;
            setOpen(m);
          }
        }
      })
      .catch(() => setTrouble("the masks could not be read"));
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (open?.slug) url.searchParams.set("slug", open.slug);
    else url.searchParams.delete("slug");
    window.history.replaceState(null, "", url);
    putOnDesk(open ? { kind: "mask", id: open.slug, label: open.title } : null);
  }, [open?.slug, open?.title, open]);
  useEffect(() => () => putOnDesk(null), []);

  /* ── keeping ─────────────────────────────────────────────────────────── */

  const save = useCallback(
    (m: M) =>
      new Promise<M | null>((resolve) => {
        saving.current = saving.current.then(async () => {
          const fresh = !slugRef.current;
          try {
            const r = await fetch("/api/mask", {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ mask: { ...m, slug: slugRef.current || m.slug }, fresh }),
            });
            const out = (await r.json().catch(() => null)) as M | { error: string } | null;
            if (!r.ok || !out || "error" in out) {
              setTrouble(out && "error" in out ? out.error : `not kept (${r.status})`);
              resolve(null);
              return;
            }
            slugRef.current = out.slug;
            setOpen((cur) => (cur ? { ...cur, slug: out.slug, title: out.title, touched: out.touched } : cur));
            setPayload((p) =>
              p
                ? {
                    ...p,
                    masks: p.masks.some((x) => x.slug === out.slug)
                      ? p.masks.map((x) => (x.slug === out.slug ? { ...m, ...out } : x))
                      : [{ ...m, ...out }, ...p.masks],
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
    (next: M) => {
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
    if (!writable || (!matter.trim() && !side.trim() && !other.trim())) return;
    slugRef.current = "";
    keepNow({
      ...emptyMask(today),
      matter: matter.trim(),
      side: side.trim(),
      other: other.trim(),
      stone: payload?.about?.id ?? null,
    });
    setMatter("");
    setSide("");
    setOther("");
  }, [writable, matter, side, other, today, keepNow, payload]);

  const openOne = (m: M) => {
    slugRef.current = m.slug;
    setOpen(m);
    setSaid(null);
    setSure(null);
  };
  const close = () => {
    slugRef.current = "";
    setOpen(null);
    setSaid(null);
    setSure(null);
  };

  const patch = (p: Partial<M>) => setOpen((m) => (m ? { ...m, ...p } : m));

  const mark = (sentence: string, k: Mark) => {
    const m = openRef.current;
    if (!m || !writable) return;
    const cur = markOf(m.marks, sentence);
    keepNow({ ...m, marks: setMark(m.marks, sentence, cur === k ? "" : k) });
  };

  const addTell = () => {
    const m = openRef.current;
    const quote = newTell.trim();
    if (!m || !quote) return;
    keepNow({ ...m, tells: [...m.tells, { id: uid(), quote, kind: newTellKind, instead: "", by: "you", kept: true }] });
    setNewTell("");
  };

  const askModel = useCallback(async () => {
    const m = openRef.current;
    if (!m || !writable || asking) return;
    setAsking(true);
    setSaid(null);
    setTrouble(null);
    try {
      const r = await fetch("/api/mask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mask: m }),
      });
      const j = (await r.json().catch(() => null)) as { proposal?: unknown; ms?: number; error?: string } | null;
      if (!r.ok || !j || j.error || !j.proposal) {
        setTrouble(j?.error ?? `the model did not answer (${r.status})`);
        return;
      }
      const cur = openRef.current ?? m;
      const next = adopt(cur, validateProposal(j.proposal, cur.otherCase), today);
      const added = proposedCount(next) - proposedCount(cur);
      keepNow(next);
      setSaid(
        added
          ? `${added} proposed in ${Math.round((j.ms ?? 0) / 1000)}s — hollow until you keep them. It was asked what gives you away, not whether you pass.`
          : "nothing new — every tell it saw is already on the sheet",
      );
    } finally {
      setAsking(false);
    }
  }, [writable, asking, keepNow, today]);

  const remove = useCallback(async () => {
    const m = openRef.current;
    if (!m || !writable) return;
    const r = await fetch(`/api/mask?slug=${encodeURIComponent(m.slug)}`, { method: "DELETE" });
    if (!r.ok) {
      setTrouble(`not taken back (${r.status})`);
      return;
    }
    setPayload((p) => (p ? { ...p, masks: p.masks.filter((x) => x.slug !== m.slug) } : p));
    close();
  }, [writable]);

  /* ── derived ─────────────────────────────────────────────────────────── */

  const t = useMemo(() => (open ? tally(open) : null), [open]);
  const values = payload?.values ?? [];
  const ownLeans = useMemo(() => (open ? leans(open.ownCase, values) : []), [open, values]);
  const maskLeans = useMemo(() => (open ? leans(open.otherCase, values) : []), [open, values]);
  const words = useMemo(() => (open && t ? readings(open, t, [ownLeans, maskLeans]) : []), [open, t, ownLeans, maskLeans]);
  const nProposed = open ? proposedCount(open) : 0;
  const ownC = t?.own ?? census("");
  const maskC = t?.mask ?? census("");

  const Chip = ({
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
  }) => (
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

  const CensusLine = ({ c }: { c: ReturnType<typeof census> }) => (
    <p className="meta mt-2" style={{ color: "var(--faint)", textTransform: "none" }}>
      {c.words ? `${c.sentences} sentences · ${c.words} words · 'we' ×${c.stance.we} · 'they' ×${c.stance.they}` : "nothing written yet"}
      {c.n > 0 && (
        <>
          {" · "}
          {TELL_KINDS.filter((k) => c.byKind[k]).map((k, i) => (
            <span key={k}>
              {i ? " · " : ""}
              <span style={{ color: "var(--accent)" }}>{TELL_LABEL[k]}</span> ×{c.byKind[k]}{" "}
              <span className="hand" style={{ fontSize: 14, textTransform: "none", letterSpacing: 0 }}>
                ({[...new Set(c.found.filter((f) => f.kind === k).map((f) => f.phrase))].slice(0, 3).join(", ")})
              </span>
            </span>
          ))}
        </>
      )}
    </p>
  );

  return (
    <main className="mask scroll-thin relative h-dvh w-full overflow-y-auto">
      <div className="mx-auto max-w-[80rem] px-5 pb-16 sm:px-10">
        <header className="rise flex flex-wrap items-start justify-between gap-4 pt-6 sm:pt-8">
          <div className="flex items-baseline gap-3">
            <h1 className="display text-[40px] leading-none" style={{ color: "var(--ink)" }}>
              niwa
            </h1>
            <div>
              <div className="meta" style={{ color: "var(--accent)" }}>
                mask
              </div>
              <p className="hand mt-1 max-w-[27rem] text-[15.5px] leading-[1.3]" style={{ color: "var(--muted)" }}>
                Write the other side's case as they would put it, to be read by them.
                Then mark each sentence for what you could mean. Where the mask slips
                is where you stand.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/mask" />
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
              aria-label="Begin a mask"
            >
              <Sketch seed="mask-begin" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                the matter
              </div>
              {payload?.about && (
                <p className="hand mt-1 text-[16px]" style={{ color: "var(--muted)" }}>
                  about{" "}
                  <Link href={`/catalogue?id=${encodeURIComponent(payload.about.id)}`} className="k-link" style={{ color: "var(--ink)" }}>
                    “{payload.about.label}”
                  </Link>
                </p>
              )}
              <textarea
                value={matter}
                onChange={(e) => setMatter(e.target.value)}
                readOnly={!writable}
                rows={2}
                placeholder={writable ? "the question the two sides disagree about" : "a deployed garden keeps no masks; open the specimen's"}
                aria-label="The matter"
                className="display scroll-thin mt-3 w-full resize-none bg-transparent px-0 py-2 text-[24px] leading-[1.25] sm:text-[28px]"
                style={{ color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}
              />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="meta" style={{ color: "var(--faint)" }}>
                    your side
                  </div>
                  <input
                    value={side}
                    onChange={(e) => setSide(e.target.value)}
                    readOnly={!writable}
                    placeholder="in a few words"
                    aria-label="Your side"
                    className="mt-1 w-full bg-transparent px-0 py-1 text-[15px]"
                    style={{ color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}
                  />
                </div>
                <div>
                  <div className="meta" style={{ color: "var(--faint)" }}>
                    the other side
                  </div>
                  <input
                    value={other}
                    onChange={(e) => setOther(e.target.value)}
                    readOnly={!writable}
                    placeholder="as they would name themselves"
                    aria-label="The other side"
                    className="mt-1 w-full bg-transparent px-0 py-1 text-[15px]"
                    style={{ color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Chip onClick={begin} disabled={!writable || !(matter.trim() || side.trim() || other.trim())} on={Boolean(matter.trim())}>
                  put the mask on
                </Chip>
                <span className="hand text-[15px]" style={{ color: "var(--faint)" }}>
                  you will write your case first, then theirs
                </span>
              </div>
              {payload && payload.masks.length > 0 && (
                <>
                  <div className="meta mt-8" style={{ color: "var(--faint)" }}>
                    {payload.writable ? "masks kept" : "the specimen's mask"}
                  </div>
                  <ol className="mt-2 flex flex-col">
                    {payload.masks.map((m, i) => {
                      const tt = tally(m);
                      const marked = tt.marks.mean + tt.marks.could + tt.marks.refuse;
                      return (
                        <li key={m.slug} className="k-sentence rounded-[3px]">
                          <button
                            onClick={() => openOne(m)}
                            className="flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-2 py-2 text-left"
                          >
                            <span className="display text-[19px] leading-tight" style={{ color: "var(--ink)" }}>
                              {m.title}
                            </span>
                            <span className="meta" style={{ color: "var(--faint)", textTransform: "none" }}>
                              {m.opened} · {m.side || "?"} / {m.other || "?"} · {marked} of {tt.sentences.length} marked
                              {m.stand.trim() ? " · stood" : ""}
                            </span>
                          </button>
                          {i < payload.masks.length - 1 && <div className="rule mx-2 border-t" />}
                        </li>
                      );
                    })}
                  </ol>
                </>
              )}
              {payload && !payload.masks.length && (
                <p className="hand mt-8 text-[16px]" style={{ color: "var(--faint)" }}>
                  no mask kept yet — the first one begins above
                </p>
              )}
            </section>

            <aside className="flex min-w-0 flex-col gap-5">
              <section
                className="panel sketched rise relative p-4"
                style={{ borderRadius: 3, animationDelay: "120ms" }}
                aria-label="How to wear it"
              >
                <Sketch seed="mask-how" draw />
                <div className="meta" style={{ color: "var(--accent)" }}>
                  how to wear it
                </div>
                <ol className="mt-3 flex flex-col gap-2.5 text-[13.5px] leading-[1.5]" style={{ color: "var(--ink)" }}>
                  <li>Write your own case first, in your voice, so it is on the record.</li>
                  <li>Then write theirs as they would — to be read by them, not by you. No “they claim”, no scare quotes, no hedging. Say “we”.</li>
                  <li>Mark each sentence of the mask: could you say it and mean it, say it but not hold it, or not write it straight at all?</li>
                  <li>Ask an adherent what gives you away. Keep what you recognise.</li>
                  <li>Write where you actually stand. The sentences that crossed are the ones you hold; the ones you refused are the line.</li>
                </ol>
                <p className="hand mt-4 text-[15px] leading-[1.3]" style={{ color: "var(--faint)" }}>
                  after the ideological Turing test — turned inward: nothing here judges whether you pass
                </p>
                <p className="meta mt-4" style={{ color: "var(--faint)", textTransform: "none" }}>
                  {payload?.dir ? `kept in ${payload.dir.replace(/^\/Users\/[^/]+/, "~")}` : payload ? "fiction, like the rest of the specimen" : ""}
                </p>
              </section>
            </aside>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <section className="flex min-w-0 flex-col gap-5" aria-label="The mask">
              {/* the matter */}
              <div className="panel sketched rise relative p-5 sm:p-7" style={{ borderRadius: 3, animationDelay: "40ms" }}>
                <Sketch seed={`matter-${open.slug || "fresh"}`} draw />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    the matter · {open.opened}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {open.stone && (
                      <Link href={`/catalogue?id=${encodeURIComponent(open.stone)}`} className={chip} style={{ ...mono, color: "var(--muted)" }}>
                        the stone
                      </Link>
                    )}
                    <Chip onClick={close}>all masks</Chip>
                  </div>
                </div>
                <p className="display mt-3 max-w-[40rem] text-[26px] leading-[1.22] sm:text-[31px]" style={{ color: "var(--ink)" }}>
                  {open.matter || "(the matter is not written)"}
                </p>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                  <span className="text-[14px]" style={{ color: "var(--muted)" }}>
                    <span className="meta" style={{ color: "var(--faint)" }}>
                      your side ·{" "}
                    </span>
                    <input
                      value={open.side}
                      onChange={(e) => patch({ side: e.target.value })}
                      onBlur={commit}
                      readOnly={!writable}
                      aria-label="Your side"
                      className="bg-transparent px-0 py-0.5 text-[14px]"
                      style={{ color: "var(--ink)", borderBottom: "1px solid var(--rule)", width: `${Math.max(8, open.side.length + 2)}ch` }}
                    />
                  </span>
                  <span className="text-[14px]" style={{ color: "var(--muted)" }}>
                    <span className="meta" style={{ color: "var(--faint)" }}>
                      the other side ·{" "}
                    </span>
                    <input
                      value={open.other}
                      onChange={(e) => patch({ other: e.target.value })}
                      onBlur={commit}
                      readOnly={!writable}
                      aria-label="The other side"
                      className="bg-transparent px-0 py-0.5 text-[14px]"
                      style={{ color: "var(--ink)", borderBottom: "1px solid var(--rule)", width: `${Math.max(8, open.other.length + 2)}ch` }}
                    />
                  </span>
                </div>
              </div>

              {/* your case */}
              <div className="panel sketched rise relative p-5 sm:p-7" style={{ borderRadius: 3, animationDelay: "90ms" }}>
                <Sketch seed={`own-${open.slug || "fresh"}`} draw />
                <div className="meta" style={{ color: "var(--accent)" }}>
                  your case, in your voice{open.side ? ` · ${open.side}` : ""}
                </div>
                <textarea
                  value={open.ownCase}
                  onChange={(e) => patch({ ownCase: e.target.value })}
                  onBlur={commit}
                  readOnly={!writable}
                  rows={Math.max(4, Math.min(14, Math.ceil(open.ownCase.length / 100) + 2))}
                  placeholder={writable ? "as you would actually argue it — so it is on the record before you put the mask on" : ""}
                  aria-label="Your case"
                  className="k-case scroll-thin mt-2 w-full resize-none bg-transparent px-0 py-1 text-[16px] leading-[1.6]"
                  style={{ color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}
                />
                <CensusLine c={ownC} />
              </div>

              {/* their case, in the mask */}
              <div className="panel sketched rise relative p-5 sm:p-7" style={{ borderRadius: 3, animationDelay: "140ms" }}>
                <Sketch seed={`mask-${open.slug || "fresh"}`} draw color="var(--accent)" />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    their case, in the mask{open.other ? ` · ${open.other}` : ""}
                  </div>
                  <span className="hand text-[15px]" style={{ color: "var(--faint)" }}>
                    to be read by them — say “we”
                  </span>
                </div>
                <textarea
                  value={open.otherCase}
                  onChange={(e) => patch({ otherCase: e.target.value })}
                  onBlur={commit}
                  readOnly={!writable}
                  rows={Math.max(5, Math.min(16, Math.ceil(open.otherCase.length / 100) + 2))}
                  placeholder={writable ? "their case, as the most thoughtful person on their side would put it — the reasons they actually give, in their words" : ""}
                  aria-label="Their case, in the mask"
                  className="k-case scroll-thin mt-2 w-full resize-none bg-transparent px-0 py-1 text-[16px] leading-[1.6]"
                  style={{ color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}
                />
                <CensusLine c={maskC} />

                {t && t.sentences.length > 0 && (
                  <>
                    <div className="meta mt-6" style={{ color: "var(--accent)" }}>
                      sentence by sentence — could you mean it?
                    </div>
                    <ol className="mt-2 flex flex-col">
                      {t.sentences.map((s, i) => {
                        const k = markOf(open.marks, s);
                        return (
                          <li
                            key={`${i}-${s.slice(0, 24)}`}
                            className="k-sentence flex flex-wrap items-start gap-x-3 gap-y-1 rounded-[3px] px-2 py-2"
                            data-mark={k || undefined}
                          >
                            <span
                              aria-hidden
                              className="mt-[7px] h-2 w-2 shrink-0 rounded-full"
                              style={{
                                background: k === "mean" ? "var(--ink)" : "transparent",
                                border: `1px ${k ? "solid" : "dashed"} ${k === "refuse" ? "var(--accent)" : "var(--ink)"}`,
                              }}
                              title={MARK_LABEL[k]}
                            />
                            <span className="k-text min-w-0 flex-1 text-[15px] leading-[1.5]" style={{ color: k ? undefined : "var(--ink)" }}>
                              {s}
                            </span>
                            <span className="flex shrink-0 flex-wrap gap-1">
                              {MARKS.map((x) => (
                                <Chip key={x} on={k === x} accent={x === "refuse" && k === x} onClick={() => mark(s, x)} disabled={!writable} title={MARK_LABEL[x]}>
                                  {MARK_SHORT[x]}
                                </Chip>
                              ))}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  </>
                )}

                {/* an adherent's reading */}
                <div className="meta mt-6" style={{ color: "var(--accent)" }}>
                  an adherent's reading
                </div>
                {open.tells.length === 0 && open.missing.length === 0 && (
                  <p className="hand mt-1 text-[15px]" style={{ color: "var(--faint)" }}>
                    nothing yet — name a phrase that gives you away, or ask
                  </p>
                )}
                {open.tells.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-2">
                    {open.tells.map((x, i) => (
                      <li key={x.id} className="k-tell text-[14px] leading-[1.5]" style={{ "--i": Math.min(i, 8) } as CSSProperties}>
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="meta shrink-0" style={{ color: "var(--accent)" }}>
                            {TELL_LABEL[x.kind]}
                          </span>
                          <span className="hand text-[16px]" style={{ color: x.kept ? "var(--ink)" : "var(--muted)", borderBottom: x.kept ? undefined : "1px dashed var(--rule)" }}>
                            “{x.quote}”
                          </span>
                          {writable &&
                            (x.kept ? (
                              <button onClick={() => keepNow({ ...open, tells: open.tells.filter((y) => y.id !== x.id) })} className="meta ml-auto" style={{ color: "var(--faint)" }} aria-label="Drop the tell">
                                ×
                              </button>
                            ) : (
                              <span className="ml-auto flex gap-1">
                                <Chip on onClick={() => keepNow({ ...open, tells: open.tells.map((y) => (y.id === x.id ? { ...y, kept: true } : y)) })}>
                                  keep
                                </Chip>
                                <Chip onClick={() => keepNow({ ...open, tells: open.tells.filter((y) => y.id !== x.id) })}>drop</Chip>
                              </span>
                            ))}
                        </div>
                        {(x.instead || writable) && (
                          <input
                            value={x.instead}
                            onChange={(e) => patch({ tells: open.tells.map((y) => (y.id === x.id ? { ...y, instead: e.target.value } : y)) })}
                            onBlur={commit}
                            readOnly={!writable}
                            placeholder="how they would have put it"
                            aria-label="How they would have put it"
                            className="mt-0.5 w-full bg-transparent px-0 py-0.5 pl-4 text-[13.5px]"
                            style={{ color: "var(--muted)" }}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {open.missing.length > 0 && (
                  <>
                    <div className="meta mt-3" style={{ color: "var(--faint)" }}>
                      reasons they give that the mask left out
                    </div>
                    <ul className="mt-1 flex flex-col gap-1.5">
                      {open.missing.map((x) => (
                        <li key={x.id} className="flex flex-wrap items-baseline gap-x-2 text-[14px] leading-[1.5]">
                          <span className="min-w-0 flex-1" style={{ color: x.kept ? "var(--ink)" : "var(--muted)", borderBottom: x.kept ? undefined : "1px dashed var(--rule)" }}>
                            {x.text}
                          </span>
                          {writable &&
                            (x.kept ? (
                              <button onClick={() => keepNow({ ...open, missing: open.missing.filter((y) => y.id !== x.id) })} className="meta" style={{ color: "var(--faint)" }} aria-label="Drop">
                                ×
                              </button>
                            ) : (
                              <span className="flex gap-1">
                                <Chip on onClick={() => keepNow({ ...open, missing: open.missing.map((y) => (y.id === x.id ? { ...y, kept: true } : y)) })}>
                                  keep
                                </Chip>
                                <Chip onClick={() => keepNow({ ...open, missing: open.missing.filter((y) => y.id !== x.id) })}>drop</Chip>
                              </span>
                            ))}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {writable && (
                  <>
                    <div className="mt-4 flex flex-wrap items-end gap-2">
                      <input
                        value={newTell}
                        onChange={(e) => setNewTell(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addTell()}
                        placeholder="a phrase in the mask that gives you away"
                        aria-label="A tell"
                        className="min-w-[12rem] flex-1 bg-transparent px-0 py-1 text-[14px]"
                        style={{ color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}
                      />
                      <select
                        value={newTellKind}
                        onChange={(e) => setNewTellKind(e.target.value as TellKind)}
                        aria-label="Its kind"
                        className="chip bg-transparent px-2 py-1 text-[10px] tracking-[0.14em] uppercase"
                        style={{ ...mono, color: "var(--muted)" }}
                      >
                        {TELL_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {TELL_LABEL[k]}
                          </option>
                        ))}
                      </select>
                      <Chip onClick={addTell} disabled={!newTell.trim()} on={Boolean(newTell.trim())}>
                        name it
                      </Chip>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Chip onClick={() => void askModel()} disabled={asking || !open.otherCase.trim()} accent={!asking}>
                        {asking ? "reading…" : "ask an adherent"}
                      </Chip>
                      {nProposed > 0 && (
                        <>
                          <Chip onClick={() => keepNow(keepAll(open, true))}>keep all {nProposed}</Chip>
                          <Chip onClick={() => keepNow(keepAll(open, false))}>drop all</Chip>
                        </>
                      )}
                      <span className="hand text-[14.5px] leading-[1.3]" style={{ color: "var(--faint)" }}>
                        {asking
                          ? `the model on this machine (${payload?.model ?? "local"}) is reading the mask as one of them`
                          : said ?? "the model on this machine reads the mask as an adherent — what they would never say, what you left out — never whether you pass"}
                      </span>
                    </div>
                  </>
                )}
                {trouble && (
                  <p className="meta mt-3" style={{ color: "var(--accent)" }} role="alert">
                    {trouble}
                  </p>
                )}
              </div>

              {/* where you stand */}
              <div className="panel sketched rise relative p-5 sm:p-7" style={{ borderRadius: 3, animationDelay: "190ms" }}>
                <Sketch seed={`stand-${open.slug || "fresh"}`} draw />
                <div className="meta" style={{ color: "var(--accent)" }}>
                  where you stand
                </div>
                <p className="hand mt-1 text-[15px]" style={{ color: "var(--faint)" }}>
                  written last, after the marks — what you hold, what you refuse, and what the mask taught you about the line between
                </p>
                <textarea
                  value={open.stand}
                  onChange={(e) => patch({ stand: e.target.value })}
                  onBlur={commit}
                  readOnly={!writable}
                  rows={Math.max(3, Math.min(10, Math.ceil(open.stand.length / 100) + 2))}
                  placeholder={writable ? "in your own voice again" : ""}
                  aria-label="Where you stand"
                  className="k-case scroll-thin mt-2 w-full resize-none bg-transparent px-0 py-1 text-[16px] leading-[1.6]"
                  style={{ color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}
                />
              </div>
            </section>

            {/* ── the desk ────────────────────────────────────────────────── */}
            <aside className="flex min-w-0 flex-col gap-5">
              {t && (
                <section className="panel sketched rise relative p-4" style={{ borderRadius: 3, animationDelay: "80ms" }} aria-label="What crossed">
                  <Sketch seed="mask-crossed" draw />
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    what crossed
                  </div>
                  <p className="hand mt-1 text-[15px] leading-[1.3]" style={{ color: "var(--faint)" }}>
                    sentences in their voice you could say and mean — these you hold, whichever side said them
                  </p>
                  {t.crossed.length ? (
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {t.crossed.map((s) => (
                        <li key={s} className="text-[13.5px] leading-[1.5]" style={{ color: "var(--ink)" }}>
                          {s}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="meta mt-2" style={{ color: "var(--faint)", textTransform: "none" }}>
                      none marked yet
                    </p>
                  )}
                  <div className="meta mt-4" style={{ color: "var(--accent)" }}>
                    what you refused
                  </div>
                  {t.refused.length ? (
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {t.refused.map((s) => (
                        <li key={s} className="text-[13.5px] leading-[1.5]" style={{ color: "var(--muted)", textDecoration: "line-through", textDecorationColor: "var(--accent)" }}>
                          {s}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="meta mt-2" style={{ color: "var(--faint)", textTransform: "none" }}>
                      none marked yet
                    </p>
                  )}
                </section>
              )}

              <section className="panel sketched rise relative p-4" style={{ borderRadius: 3, animationDelay: "140ms" }} aria-label="The two voices">
                <Sketch seed="mask-voices" draw />
                <div className="meta" style={{ color: "var(--accent)" }}>
                  the two voices
                </div>
                <table className="mt-2 w-full text-[12.5px]">
                  <thead>
                    <tr className="meta" style={{ color: "var(--faint)" }}>
                      <th className="py-1 text-left font-normal"></th>
                      <th className="py-1 text-right font-normal">yours</th>
                      <th className="py-1 text-right font-normal">the mask</th>
                    </tr>
                  </thead>
                  <tbody style={{ color: "var(--ink)" }}>
                    {TELL_KINDS.map((k) => (
                      <tr key={k}>
                        <td className="py-0.5" style={{ color: "var(--muted)" }}>
                          {TELL_LABEL[k]}
                        </td>
                        <td className="py-0.5 text-right" style={mono}>
                          {ownC.byKind[k] || "·"}
                        </td>
                        <td className="py-0.5 text-right" style={mono}>
                          {maskC.byKind[k] || "·"}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className="py-0.5 pt-2" style={{ color: "var(--muted)" }}>
                        ‘we’
                      </td>
                      <td className="py-0.5 pt-2 text-right" style={mono}>
                        {ownC.stance.we || "·"}
                      </td>
                      <td className="py-0.5 pt-2 text-right" style={mono}>
                        {maskC.stance.we || "·"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-0.5" style={{ color: "var(--muted)" }}>
                        ‘they’
                      </td>
                      <td className="py-0.5 text-right" style={mono}>
                        {ownC.stance.they || "·"}
                      </td>
                      <td className="py-0.5 text-right" style={mono}>
                        {maskC.stance.they || "·"}
                      </td>
                    </tr>
                  </tbody>
                </table>
                {values.length > 0 && (
                  <>
                    <div className="meta mt-4" style={{ color: "var(--faint)" }}>
                      values leaned on, by their terms
                    </div>
                    <div className="mt-1.5 flex flex-col gap-1 text-[13px]">
                      {values.map((v) => {
                        const o = ownLeans.find((l) => l.name === v.name);
                        const k = maskLeans.find((l) => l.name === v.name);
                        if (!o && !k) return null;
                        return (
                          <div key={v.name} className="flex flex-wrap items-baseline gap-x-2">
                            <span className="hand text-[15px]" style={{ color: "var(--ink)" }}>
                              {v.name}
                            </span>
                            <span className="meta" style={{ color: "var(--faint)", textTransform: "none" }}>
                              {o ? `yours (${o.hits.join(", ")})` : ""}
                              {o && k ? " · " : ""}
                              {k ? `the mask (${k.hits.join(", ")})` : ""}
                            </span>
                          </div>
                        );
                      })}
                      {!ownLeans.length && !maskLeans.length && (
                        <span className="meta" style={{ color: "var(--faint)", textTransform: "none" }}>
                          neither case uses a term of any value yet
                        </span>
                      )}
                    </div>
                  </>
                )}
                {t && open.ownCase.trim() && open.otherCase.trim() && (
                  <>
                    <div className="meta mt-4" style={{ color: "var(--faint)" }}>
                      common ground
                    </div>
                    <p className="hand mt-1 text-[15px] leading-[1.3]" style={{ color: "var(--ink)" }}>
                      {t.common.shared.length ? t.common.shared.slice(0, 10).join(" · ") : "no word both cases use"}
                    </p>
                  </>
                )}
              </section>

              <section className="panel sketched rise relative p-4" style={{ borderRadius: 3, animationDelay: "200ms" }} aria-label="The reading">
                <Sketch seed="mask-reading" draw />
                <div className="meta" style={{ color: "var(--accent)" }}>
                  the reading
                </div>
                <p className="mt-2 text-[13.5px] leading-[1.6]" style={{ color: "var(--ink)" }}>
                  {words.join(" · ")}
                </p>
                {writable && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <Chip onClick={() => (sure === "mask" ? void remove() : setSure("mask"))} accent={sure === "mask"}>
                      {sure === "mask" ? "take the mask off — sure?" : "take the mask off"}
                    </Chip>
                  </div>
                )}
                <p className="meta mt-4" style={{ color: "var(--faint)", textTransform: "none" }}>
                  {payload?.dir ? `kept as ${open.slug || "…"}.md in ${payload.dir.replace(/^\/Users\/[^/]+/, "~")}` : "fiction, like the rest of the specimen"}
                </p>
              </section>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
