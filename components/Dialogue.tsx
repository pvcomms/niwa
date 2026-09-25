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
  BY_LABEL,
  EXAMINED_LABEL,
  FAMILIES,
  FAMILY_BLURB,
  FAMILY_LABEL,
  adopt,
  emptyDialogue,
  isOpen,
  keepAll,
  proposedCount,
  readings,
  tally,
  uid,
  validateProposal,
  type Assumption,
  type Bank,
  type By,
  type Dialogue as D,
  type Examined,
  type Family,
  type GardenQuestion,
  type Turn,
} from "@/lib/dialogue";
import { putOnDesk } from "./desk";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

type Payload = {
  dialogues: D[];
  bank: Bank;
  ownBank: boolean;
  writable: boolean;
  dir: string | null;
  model: string | null;
};

type Garden = {
  questions: GardenQuestion[];
  stone: { id: string; label: string; kind: string; first: string } | null;
};

const mono = { fontFamily: "var(--font-mono)" } as const;
const chip = "chip d-seg px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * The dialogue: a thesis questioned in the open until its meaning is clearer
 * and its assumptions are on the table. The reader answers every question in
 * their own words; the questions come from the bank, from the garden's own
 * record, from the reader's hand, and — hollow until kept — from the model
 * on this machine, which is asked only what to ask. The desk keeps the six
 * families as a wheel, dashed where not yet asked; the assumptions as a
 * ledger, each examined by the reader; the terms clarified; and the thesis
 * as it stands now against as it was first said. Nothing here answers, and
 * nothing says whether the thesis holds.
 */
export default function Dialogue() {
  const [theme, setTheme] = useTheme();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [open, setOpen] = useState<D | null>(null);
  const [garden, setGarden] = useState<Garden | null>(null);
  const [aboutStone, setAboutStone] = useState<Garden["stone"]>(null);
  const [thesis, setThesis] = useState("");
  const [fam, setFam] = useState<Family | null>(null);
  const [ownQ, setOwnQ] = useState("");
  const [ownFam, setOwnFam] = useState<Family>("clarify");
  const [newA, setNewA] = useState("");
  const [newWord, setNewWord] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [asking, setAsking] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [trouble, setTrouble] = useState<string | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const openRef = useRef<D | null>(null);
  const slugRef = useRef<string>("");
  const saving = useRef<Promise<void>>(Promise.resolve());
  openRef.current = open;

  const today = useMemo(localToday, []);
  const writable = payload?.writable ?? false;

  /* ── loading ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const slug = p.get("slug");
    const id = p.get("id");
    fetch("/api/dialogue")
      .then((r) => (r.ok ? r.json() : null))
      .then((pl: Payload | null) => {
        if (!pl) {
          setTrouble("the dialogues could not be read");
          return;
        }
        setPayload(pl);
        if (slug) {
          const d = pl.dialogues.find((x) => x.slug === slug) ?? null;
          if (d) {
            slugRef.current = d.slug;
            setOpen(d);
          }
        }
      })
      .catch(() => setTrouble("the dialogues could not be read"));
    if (id)
      fetch(`/api/dialogue?stone=${encodeURIComponent(id)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((g: Garden | null) => {
          if (g?.stone) {
            setAboutStone(g.stone);
            setGarden(g);
            setThesis((t) => t || g.stone!.first || g.stone!.label);
          }
        })
        .catch(() => {});
  }, []);

  // The garden's questions about the open dialogue's stone.
  useEffect(() => {
    const s = open?.stone;
    if (!s || !writable) return;
    if (garden?.stone?.id === s) return;
    fetch(`/api/dialogue?stone=${encodeURIComponent(s)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((g: Garden | null) => g && setGarden(g))
      .catch(() => {});
  }, [open?.stone, writable, garden?.stone?.id]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (open?.slug) url.searchParams.set("slug", open.slug);
    else url.searchParams.delete("slug");
    window.history.replaceState(null, "", url);
    putOnDesk(open ? { kind: "dialogue", id: open.slug, label: open.title } : null);
  }, [open?.slug, open?.title, open]);

  useEffect(() => () => putOnDesk(null), []);

  /* ── keeping ─────────────────────────────────────────────────────────── */

  const save = useCallback(
    (d: D) =>
      new Promise<D | null>((resolve) => {
        saving.current = saving.current.then(async () => {
          const fresh = !slugRef.current;
          const body = { dialogue: { ...d, slug: slugRef.current || d.slug }, fresh };
          try {
            const r = await fetch("/api/dialogue", {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(body),
            });
            const out = (await r.json().catch(() => null)) as D | { error: string } | null;
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
                    dialogues: p.dialogues.some((x) => x.slug === out.slug)
                      ? p.dialogues.map((x) => (x.slug === out.slug ? { ...d, ...out } : x))
                      : [{ ...d, ...out }, ...p.dialogues],
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
    (next: D) => {
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
    const t = thesis.trim();
    if (!t || !writable) return;
    slugRef.current = "";
    const d: D = { ...emptyDialogue(today), thesis: t, stone: aboutStone?.id ?? null };
    keepNow(d);
    setThesis("");
  }, [thesis, writable, today, aboutStone, keepNow]);

  const openOne = (d: D) => {
    slugRef.current = d.slug;
    setOpen(d);
    setFam(null);
    setSaid(null);
    setSure(null);
  };

  const close = () => {
    slugRef.current = "";
    setOpen(null);
    setGarden(aboutStone ? garden : null);
    setSaid(null);
    setSure(null);
  };

  /* ── the turns ───────────────────────────────────────────────────────── */

  const ask = useCallback(
    (question: string, family: Family, by: By, stone: string | null = null) => {
      const d = openRef.current;
      if (!d) return;
      const q = question.trim();
      if (!q) return;
      const turn: Turn = { id: uid(), family, question: q, by, kept: true, answer: "", stone, on: today };
      keepNow({ ...d, turns: [...d.turns, turn], touched: today });
      setFam(null);
      window.setTimeout(() => document.getElementById(`ans-${turn.id}`)?.focus(), 60);
    },
    [keepNow, today],
  );

  const setTurn = (id: string, patch: Partial<Turn>) =>
    setOpen((d) => (d ? { ...d, turns: d.turns.map((t) => (t.id === id ? { ...t, ...patch } : t)) } : d));

  const keepTurn = (id: string) => {
    const d = openRef.current;
    if (!d) return;
    keepNow({ ...d, turns: d.turns.map((t) => (t.id === id ? { ...t, kept: true } : t)) });
  };

  const dropTurn = (id: string) => {
    const d = openRef.current;
    if (!d) return;
    keepNow({
      ...d,
      turns: d.turns.filter((t) => t.id !== id),
      assumptions: d.assumptions.map((a) => (a.turn === id ? { ...a, turn: null } : a)),
      terms: d.terms.map((x) => (x.turn === id ? { ...x, turn: null } : x)),
    });
    setSure(null);
  };

  /* ── assumptions and terms ───────────────────────────────────────────── */

  const lastTurn = open?.turns.filter((t) => t.kept).at(-1)?.id ?? null;

  const addAssumption = () => {
    const d = openRef.current;
    const text = newA.trim();
    if (!d || !text) return;
    const a: Assumption = { id: uid(), text, turn: lastTurn, by: "you", kept: true, examined: "", note: "" };
    keepNow({ ...d, assumptions: [...d.assumptions, a] });
    setNewA("");
  };

  const setAssumption = (id: string, patch: Partial<Assumption>, keep = false) => {
    const d = openRef.current;
    if (!d) return;
    const next = { ...d, assumptions: d.assumptions.map((a) => (a.id === id ? { ...a, ...patch } : a)) };
    if (keep) keepNow(next);
    else setOpen(next);
  };

  const dropAssumption = (id: string) => {
    const d = openRef.current;
    if (!d) return;
    keepNow({ ...d, assumptions: d.assumptions.filter((a) => a.id !== id) });
    setSure(null);
  };

  const addTerm = () => {
    const d = openRef.current;
    const word = newWord.trim();
    if (!d || !word) return;
    keepNow({ ...d, terms: [...d.terms, { id: uid(), word, meaning: newMeaning.trim(), turn: lastTurn }] });
    setNewWord("");
    setNewMeaning("");
  };

  const dropTerm = (id: string) => {
    const d = openRef.current;
    if (!d) return;
    keepNow({ ...d, terms: d.terms.filter((x) => x.id !== id) });
  };

  /* ── the model ───────────────────────────────────────────────────────── */

  const askModel = useCallback(async () => {
    const d = openRef.current;
    if (!d || !writable || asking) return;
    setAsking(true);
    setSaid(null);
    setTrouble(null);
    try {
      const r = await fetch("/api/dialogue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dialogue: d }),
      });
      const j = (await r.json().catch(() => null)) as
        | { proposal?: unknown; ms?: number; error?: string }
        | null;
      if (!r.ok || !j || j.error || !j.proposal) {
        setTrouble(j?.error ?? `the model did not answer (${r.status})`);
        return;
      }
      const cur = openRef.current ?? d;
      const p = validateProposal(j.proposal, cur.turns.filter((t) => t.kept).map((t) => t.id));
      const next = adopt(cur, p, today);
      const added = proposedCount(next) - proposedCount(cur);
      keepNow(next);
      setSaid(
        added
          ? `${added} proposed in ${Math.round((j.ms ?? 0) / 1000)}s — hollow until you keep them. It was asked what to ask, not what is so.`
          : "nothing new proposed — every question it had is already on the sheet",
      );
    } finally {
      setAsking(false);
    }
  }, [writable, asking, keepNow, today]);

  const remove = useCallback(async () => {
    const d = openRef.current;
    if (!d || !writable) return;
    const r = await fetch(`/api/dialogue?slug=${encodeURIComponent(d.slug)}`, { method: "DELETE" });
    if (!r.ok) {
      setTrouble(`not taken back (${r.status})`);
      return;
    }
    setPayload((p) => (p ? { ...p, dialogues: p.dialogues.filter((x) => x.slug !== d.slug) } : p));
    close();
  }, [writable]);

  /* ── derived ─────────────────────────────────────────────────────────── */

  const t = useMemo(() => (open ? tally(open) : null), [open]);
  const words = useMemo(() => (open && t ? readings(open, t) : []), [open, t]);
  const nProposed = open ? proposedCount(open) : 0;
  const bank = payload?.bank;
  const asked = useMemo(() => new Set(open?.turns.map((x) => x.question.trim().toLowerCase()) ?? []), [open]);
  const stoneLabel = (id: string) =>
    garden?.stone?.id === id ? garden.stone.label : aboutStone?.id === id ? aboutStone.label : id.split(":").pop() ?? id;

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

  return (
    <main className="dialogue scroll-thin relative h-dvh w-full overflow-y-auto">
      <div className="mx-auto max-w-[80rem] px-5 pb-16 sm:px-10">
        <header className="rise flex flex-wrap items-start justify-between gap-4 pt-6 sm:pt-8">
          <div className="flex items-baseline gap-3">
            <h1 className="display text-[40px] leading-none" style={{ color: "var(--ink)" }}>
              niwa
            </h1>
            <div>
              <div className="meta" style={{ color: "var(--accent)" }}>
                dialogue
              </div>
              <p className="hand mt-1 max-w-[27rem] text-[15.5px] leading-[1.3]" style={{ color: "var(--muted)" }}>
                A thesis of yours, questioned in the open — what you mean, what you
                assume, how you know, who would put it differently, what follows, why
                you are asking — until it stands clearer. You answer; nothing here does.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/dialogue" />
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
          /* ── the dialogues, and a thesis to begin one ─────────────────── */
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <section
              className="panel sketched rise relative p-5 sm:p-8"
              style={{ borderRadius: 3, animationDelay: "60ms" }}
              aria-label="Begin a dialogue"
            >
              <Sketch seed="dialogue-begin" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                the thesis
              </div>
              {aboutStone && (
                <p className="hand mt-1 text-[16px]" style={{ color: "var(--muted)" }}>
                  about{" "}
                  <Link href={`/catalogue?id=${encodeURIComponent(aboutStone.id)}`} className="d-link" style={{ color: "var(--ink)" }}>
                    “{aboutStone.label}”
                  </Link>
                </p>
              )}
              <textarea
                value={thesis}
                onChange={(e) => setThesis(e.target.value)}
                readOnly={!writable}
                rows={4}
                placeholder={
                  writable
                    ? "put it down as you would say it to someone who disagreed — one or two sentences, in your words"
                    : "a deployed garden keeps no dialogues; open the specimen's"
                }
                aria-label="The thesis"
                className="display scroll-thin mt-3 w-full resize-none bg-transparent px-0 py-2 text-[24px] leading-[1.25] sm:text-[28px]"
                style={{ color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Chip onClick={begin} disabled={!writable || !thesis.trim()} on={Boolean(thesis.trim())}>
                  begin the dialogue
                </Chip>
                <span className="hand text-[15px]" style={{ color: "var(--faint)" }}>
                  the first question will be yours to choose
                </span>
              </div>
              {payload && payload.dialogues.length > 0 && (
                <>
                  <div className="meta mt-8" style={{ color: "var(--faint)" }}>
                    {payload.writable ? "dialogues kept" : "the specimen's dialogue"}
                  </div>
                  <ol className="mt-2 flex flex-col">
                    {payload.dialogues.map((d, i) => {
                      const tt = tally(d);
                      return (
                        <li key={d.slug} className="d-row rounded-[3px]">
                          <button
                            onClick={() => openOne(d)}
                            className="flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-2 py-2 text-left"
                          >
                            <span className="display text-[19px] leading-tight" style={{ color: "var(--ink)" }}>
                              {d.title}
                            </span>
                            <span className="meta" style={{ color: "var(--faint)", textTransform: "none" }}>
                              {d.opened} · {tt.turns} asked · {tt.assumptions.surfaced} assumptions
                              {d.now.trim() ? " · re-put" : ""}
                            </span>
                          </button>
                          {i < payload.dialogues.length - 1 && <div className="rule mx-2 border-t" />}
                        </li>
                      );
                    })}
                  </ol>
                </>
              )}
              {payload && !payload.dialogues.length && (
                <p className="hand mt-8 text-[16px]" style={{ color: "var(--faint)" }}>
                  no dialogue kept yet — the first one begins above
                </p>
              )}
            </section>

            <aside className="flex min-w-0 flex-col gap-5">
              <section
                className="panel sketched rise relative p-4"
                style={{ borderRadius: 3, animationDelay: "120ms" }}
                aria-label="The six families"
              >
                <Sketch seed="dialogue-families" draw />
                <div className="meta" style={{ color: "var(--accent)" }}>
                  six families of question
                </div>
                <dl className="mt-3 flex flex-col gap-2.5">
                  {FAMILIES.map((f) => (
                    <div key={f}>
                      <dt className="meta" style={{ color: "var(--ink)" }}>
                        {FAMILY_LABEL[f]}
                      </dt>
                      <dd className="mt-0.5 text-[13.5px] leading-[1.5]" style={{ color: "var(--muted)" }}>
                        {FAMILY_BLURB[f]}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="hand mt-4 text-[15px] leading-[1.3]" style={{ color: "var(--faint)" }}>
                  the discipline is to ask across all six, and to answer each in your own words before the next
                </p>
                <p className="meta mt-4" style={{ color: "var(--faint)", textTransform: "none" }}>
                  {payload?.dir
                    ? `kept in ${payload.dir.replace(/^\/Users\/[^/]+/, "~")} · your own questions go in questions.md there${payload.ownBank ? " (found)" : ""}`
                    : payload
                      ? "fiction, like the rest of the specimen"
                      : ""}
                </p>
              </section>
            </aside>
          </div>
        ) : (
          /* ── the open dialogue ────────────────────────────────────────── */
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <section className="flex min-w-0 flex-col gap-5" aria-label="The dialogue">
              {/* the thesis */}
              <div
                className="panel sketched rise relative p-5 sm:p-7"
                style={{ borderRadius: 3, animationDelay: "40ms" }}
              >
                <Sketch seed={`thesis-${open.slug || "fresh"}`} draw />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    the thesis · as first said · {open.opened}
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
                    <Chip onClick={close}>all dialogues</Chip>
                  </div>
                </div>
                <p className="display mt-3 max-w-[40rem] text-[26px] leading-[1.22] sm:text-[31px]" style={{ color: "var(--ink)" }}>
                  {open.thesis}
                </p>
                <div className="meta mt-6" style={{ color: "var(--accent)" }}>
                  as it stands now
                </div>
                <textarea
                  value={open.now}
                  onChange={(e) => setOpen((d) => (d ? { ...d, now: e.target.value } : d))}
                  onBlur={commit}
                  readOnly={!writable}
                  rows={3}
                  placeholder={
                    writable
                      ? "re-put it when you are ready — the same claim, in the light of what was asked; the desk will read what it gained and lost"
                      : ""
                  }
                  aria-label="The thesis as it stands now"
                  className="d-answer scroll-thin mt-2 w-full resize-none bg-transparent px-0 py-1 text-[17px] leading-[1.5]"
                  style={{ color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}
                />
                {t?.drift && (
                  <p className="hand mt-2 text-[15.5px] leading-[1.3]" style={{ color: "var(--muted)" }}>
                    {t.drift.gained.length ? `gained ${t.drift.gained.slice(0, 8).map((w) => `'${w}'`).join(", ")}` : ""}
                    {t.drift.gained.length && t.drift.lost.length ? " · " : ""}
                    {t.drift.lost.length ? `lost ${t.drift.lost.slice(0, 8).map((w) => `'${w}'`).join(", ")}` : ""}
                    {!t.drift.gained.length && !t.drift.lost.length ? "the same words, so far" : ""}
                  </p>
                )}
              </div>

              {/* the turns */}
              {open.turns.length > 0 && (
                <ol className="flex flex-col gap-4" aria-label="The turns">
                  {open.turns.map((turn, i) => (
                    <li
                      key={turn.id}
                      className="d-turn panel sketched relative p-4 sm:p-6"
                      data-hollow={turn.kept ? undefined : ""}
                      style={{ borderRadius: 3, "--i": Math.min(i, 8) } as CSSProperties}
                    >
                      <Sketch seed={`turn-${turn.id}`} draw color={turn.kept ? "var(--pen)" : "var(--faint)"} />
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <div className="meta flex flex-wrap items-baseline gap-x-2" style={{ color: "var(--faint)" }}>
                          <span style={{ color: "var(--accent)" }}>{FAMILY_LABEL[turn.family]}</span>
                          <span>· {turn.kept ? BY_LABEL[turn.by] : "proposed · hollow until kept"}</span>
                          {turn.on && <span>· {turn.on}</span>}
                          {turn.stone && (
                            <Link href={`/catalogue?id=${encodeURIComponent(turn.stone)}`} className="d-link" style={{ color: "var(--muted)" }}>
                              · {stoneLabel(turn.stone)} →
                            </Link>
                          )}
                        </div>
                        {writable && (
                          <div className="flex flex-wrap gap-1.5">
                            {!turn.kept ? (
                              <>
                                <Chip onClick={() => keepTurn(turn.id)} on>
                                  keep
                                </Chip>
                                <Chip onClick={() => dropTurn(turn.id)}>drop</Chip>
                              </>
                            ) : (
                              <Chip
                                onClick={() => (sure === turn.id ? dropTurn(turn.id) : setSure(turn.id))}
                                accent={sure === turn.id}
                              >
                                {sure === turn.id ? "take it back — sure?" : "take back"}
                              </Chip>
                            )}
                          </div>
                        )}
                      </div>
                      <p
                        className="d-q display mt-2 max-w-[38rem] text-[21px] leading-[1.25] sm:text-[24px]"
                        style={{ color: "var(--ink)", borderBottom: turn.kept ? undefined : "1px dashed var(--rule)", paddingBottom: turn.kept ? 0 : 8 }}
                      >
                        {turn.question}
                      </p>
                      {turn.kept && (
                        <textarea
                          id={`ans-${turn.id}`}
                          value={turn.answer}
                          onChange={(e) => setTurn(turn.id, { answer: e.target.value })}
                          onBlur={commit}
                          readOnly={!writable}
                          rows={Math.max(2, Math.min(8, Math.ceil(turn.answer.length / 90) + 1))}
                          placeholder={writable ? "answer in your own words — then the next question" : ""}
                          aria-label="Your answer"
                          className="d-answer scroll-thin mt-3 w-full resize-none bg-transparent px-0 py-1 text-[15.5px] leading-[1.6]"
                          style={{ color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}
                        />
                      )}
                    </li>
                  ))}
                </ol>
              )}

              {/* the next question */}
              {writable && (
                <div
                  className="panel sketched rise relative p-4 sm:p-6"
                  style={{ borderRadius: 3, animationDelay: "120ms" }}
                >
                  <Sketch seed="dialogue-next" draw />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="meta" style={{ color: "var(--accent)" }}>
                      the next question
                    </div>
                    <span className="hand text-[15px]" style={{ color: "var(--faint)" }}>
                      {t?.unasked.length
                        ? `not yet asked: ${t.unasked.map((f) => FAMILY_LABEL[f]).join(", ")}`
                        : "every family asked at least once"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {FAMILIES.map((f) => (
                      <Chip key={f} on={fam === f} onClick={() => setFam(fam === f ? null : f)}>
                        {FAMILY_LABEL[f]}
                        {t?.byFamily[f] ? ` · ${t.byFamily[f]}` : ""}
                      </Chip>
                    ))}
                  </div>
                  {fam && bank && (
                    <ul className="mt-3 flex flex-col">
                      {bank[fam].map((q, i) => {
                        const done = asked.has(q.trim().toLowerCase());
                        return (
                          <li key={`${fam}-${i}`} className="d-row rounded-[3px]">
                            <button
                              onClick={() => ask(q, fam, "bank")}
                              disabled={done}
                              className="w-full px-2 py-1.5 text-left text-[15px] leading-[1.45]"
                              style={{ color: done ? "var(--faint)" : "var(--ink)", textDecoration: done ? "line-through" : undefined }}
                            >
                              {q}
                            </button>
                          </li>
                        );
                      })}
                      {!bank[fam].length && (
                        <li className="hand px-2 py-1 text-[15px]" style={{ color: "var(--faint)" }}>
                          nothing in the bank for this family yet
                        </li>
                      )}
                    </ul>
                  )}

                  {garden && garden.questions.length > 0 && garden.stone?.id === open.stone && (
                    <>
                      <div className="meta mt-5" style={{ color: "var(--faint)" }}>
                        the garden asks, from “{garden.stone.label}”
                      </div>
                      <ul className="mt-1 flex flex-col">
                        {garden.questions
                          .filter((g) => !fam || g.family === fam)
                          .map((g, i) => {
                            const done = asked.has(g.text.trim().toLowerCase());
                            return (
                              <li key={`g-${i}`} className="d-row rounded-[3px]">
                                <button
                                  onClick={() => ask(g.text, g.family, "garden", g.stone)}
                                  disabled={done}
                                  className="flex w-full flex-wrap items-baseline gap-x-2 px-2 py-1.5 text-left text-[15px] leading-[1.45]"
                                  style={{ color: done ? "var(--faint)" : "var(--ink)", textDecoration: done ? "line-through" : undefined }}
                                >
                                  <span className="meta shrink-0" style={{ color: "var(--accent)" }}>
                                    {FAMILY_LABEL[g.family]}
                                  </span>
                                  <span className="min-w-0 flex-1">{g.text}</span>
                                </button>
                              </li>
                            );
                          })}
                      </ul>
                    </>
                  )}

                  <div className="meta mt-5" style={{ color: "var(--faint)" }}>
                    or in your own words
                  </div>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <input
                      value={ownQ}
                      onChange={(e) => setOwnQ(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && ownQ.trim() && isOpen(ownQ)) {
                          ask(ownQ, ownFam, "you");
                          setOwnQ("");
                        }
                      }}
                      placeholder="an open question — one that cannot be answered yes or no"
                      aria-label="Your own question"
                      className="min-w-[14rem] flex-1 bg-transparent px-0 py-1 text-[15px]"
                      style={{ color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}
                    />
                    <select
                      value={ownFam}
                      onChange={(e) => setOwnFam(e.target.value as Family)}
                      aria-label="Its family"
                      className="chip bg-transparent px-2 py-1 text-[10px] tracking-[0.14em] uppercase"
                      style={{ ...mono, color: "var(--muted)" }}
                    >
                      {FAMILIES.map((f) => (
                        <option key={f} value={f}>
                          {FAMILY_LABEL[f]}
                        </option>
                      ))}
                    </select>
                    <Chip
                      onClick={() => {
                        ask(ownQ, ownFam, "you");
                        setOwnQ("");
                      }}
                      disabled={!ownQ.trim() || !isOpen(ownQ)}
                      on={Boolean(ownQ.trim()) && isOpen(ownQ)}
                      title={ownQ.trim() && !isOpen(ownQ) ? "that one can be answered yes or no — open it up" : undefined}
                    >
                      ask it
                    </Chip>
                  </div>
                  {ownQ.trim() && !isOpen(ownQ) && (
                    <p className="hand mt-1 text-[14.5px]" style={{ color: "var(--accent)" }}>
                      that can be answered yes or no — ask how, why, what or which instead
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <Chip onClick={() => void askModel()} disabled={asking} accent={!asking}>
                      {asking ? "asking…" : "ask what to ask"}
                    </Chip>
                    {nProposed > 0 && (
                      <>
                        <Chip onClick={() => keepNow(keepAll(open, true))}>keep all {nProposed}</Chip>
                        <Chip onClick={() => keepNow(keepAll(open, false))}>drop all</Chip>
                      </>
                    )}
                    <span className="hand text-[14.5px] leading-[1.3]" style={{ color: "var(--faint)" }}>
                      {asking
                        ? `the model on this machine (${payload?.model ?? "local"}) is reading the dialogue`
                        : said ?? "the model on this machine proposes open questions and the assumptions it hears — it is never asked what is so"}
                    </span>
                  </div>
                  {trouble && (
                    <p className="meta mt-3" style={{ color: "var(--accent)" }} role="alert">
                      {trouble}
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* ── the desk ────────────────────────────────────────────────── */}
            <aside className="flex min-w-0 flex-col gap-5">
              <section
                className="panel sketched rise relative p-4"
                style={{ borderRadius: 3, animationDelay: "80ms" }}
                aria-label="The six families"
              >
                <Sketch seed="dialogue-wheel" draw />
                <div className="meta" style={{ color: "var(--accent)" }}>
                  the six families
                </div>
                {t && <Wheel by={t.byFamily} onPick={(f) => setFam(fam === f ? null : f)} lit={fam} />}
                <p className="hand mt-1 text-center text-[15px]" style={{ color: "var(--faint)" }}>
                  dashed where not yet asked · press one to see its questions
                </p>
              </section>

              <section
                className="panel sketched rise relative p-4"
                style={{ borderRadius: 3, animationDelay: "140ms" }}
                aria-label="Assumptions"
              >
                <Sketch seed="dialogue-assumptions" draw />
                <div className="meta" style={{ color: "var(--accent)" }}>
                  assumptions on the table
                </div>
                {open.assumptions.length === 0 && (
                  <p className="hand mt-2 text-[15px]" style={{ color: "var(--faint)" }}>
                    none surfaced yet — write one as you hear it in your own answers, or ask the model what it hears
                  </p>
                )}
                <ol className="mt-2 flex flex-col gap-3">
                  {open.assumptions.map((a) => (
                    <li key={a.id} className="text-[14px] leading-[1.5]">
                      <div className="flex items-start gap-2">
                        <span
                          aria-hidden
                          className="mt-[6px] h-2 w-2 shrink-0 rounded-full"
                          style={{
                            background:
                              a.kept && a.examined
                                ? a.examined === "holds"
                                  ? "var(--ink)"
                                  : a.examined === "fell"
                                    ? "var(--accent)"
                                    : "var(--faint)"
                                : "transparent",
                            border: `1px ${a.kept ? "solid" : "dashed"} ${a.examined === "fell" ? "var(--accent)" : "var(--ink)"}`,
                          }}
                          title={EXAMINED_LABEL[a.examined]}
                        />
                        <input
                          value={a.text}
                          onChange={(e) => setAssumption(a.id, { text: e.target.value, by: "you" })}
                          onBlur={commit}
                          readOnly={!writable}
                          aria-label="An assumption"
                          className="min-w-0 flex-1 bg-transparent px-0 py-0.5"
                          style={{
                            color: a.kept ? "var(--ink)" : "var(--muted)",
                            borderBottom: `1px ${a.kept ? "solid" : "dashed"} var(--rule)`,
                          }}
                        />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-4">
                        {!a.kept && writable ? (
                          <>
                            <Chip onClick={() => setAssumption(a.id, { kept: true }, true)} on>
                              keep
                            </Chip>
                            <Chip onClick={() => dropAssumption(a.id)}>drop</Chip>
                            <span className="meta" style={{ color: "var(--faint)" }}>
                              proposed
                            </span>
                          </>
                        ) : (
                          <>
                            {(["holds", "fell", "cannot"] as Examined[]).map((x) => (
                              <Chip
                                key={x}
                                on={a.examined === x}
                                accent={x === "fell" && a.examined === x}
                                onClick={() => writable && setAssumption(a.id, { examined: a.examined === x ? "" : x }, true)}
                                disabled={!writable}
                              >
                                {EXAMINED_LABEL[x]}
                              </Chip>
                            ))}
                            {a.turn && (
                              <span className="meta" style={{ color: "var(--faint)", textTransform: "none" }}>
                                heard in turn {Math.max(1, open.turns.findIndex((x) => x.id === a.turn) + 1)}
                              </span>
                            )}
                            {writable && (
                              <button
                                onClick={() => (sure === a.id ? dropAssumption(a.id) : setSure(a.id))}
                                className="meta ml-auto"
                                style={{ color: sure === a.id ? "var(--accent)" : "var(--faint)" }}
                              >
                                {sure === a.id ? "sure?" : "×"}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      {a.kept && (a.examined || a.note) && (
                        <input
                          value={a.note}
                          onChange={(e) => setAssumption(a.id, { note: e.target.value })}
                          onBlur={commit}
                          readOnly={!writable}
                          placeholder="how you examined it"
                          aria-label="How it was examined"
                          className="hand mt-1 w-full bg-transparent px-0 py-0.5 pl-4 text-[15px]"
                          style={{ color: "var(--muted)" }}
                        />
                      )}
                    </li>
                  ))}
                </ol>
                {writable && (
                  <div className="mt-3 flex items-end gap-2">
                    <input
                      value={newA}
                      onChange={(e) => setNewA(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addAssumption()}
                      placeholder="something taken for granted, as a plain statement"
                      aria-label="A new assumption"
                      className="min-w-0 flex-1 bg-transparent px-0 py-1 text-[14px]"
                      style={{ color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}
                    />
                    <Chip onClick={addAssumption} disabled={!newA.trim()} on={Boolean(newA.trim())}>
                      surface
                    </Chip>
                  </div>
                )}
              </section>

              <section
                className="panel sketched rise relative p-4"
                style={{ borderRadius: 3, animationDelay: "200ms" }}
                aria-label="Terms clarified"
              >
                <Sketch seed="dialogue-terms" draw />
                <div className="meta" style={{ color: "var(--accent)" }}>
                  terms clarified
                </div>
                {open.terms.length === 0 && (
                  <p className="hand mt-2 text-[15px]" style={{ color: "var(--faint)" }}>
                    none yet — when an answer says what a word means here, keep it
                  </p>
                )}
                <dl className="mt-2 flex flex-col gap-2">
                  {open.terms.map((x) => (
                    <div key={x.id} className="flex items-baseline gap-2 text-[14px] leading-[1.5]">
                      <dt className="hand shrink-0 text-[16px]" style={{ color: "var(--ink)" }}>
                        ‘{x.word}’
                      </dt>
                      <dd className="min-w-0 flex-1" style={{ color: "var(--muted)" }}>
                        {x.meaning || "—"}
                      </dd>
                      {writable && (
                        <button onClick={() => dropTerm(x.id)} className="meta" style={{ color: "var(--faint)" }} aria-label="Drop the term">
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </dl>
                {writable && (
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <input
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      placeholder="the word"
                      aria-label="A term"
                      className="w-[7rem] bg-transparent px-0 py-1 text-[14px]"
                      style={{ color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}
                    />
                    <input
                      value={newMeaning}
                      onChange={(e) => setNewMeaning(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTerm()}
                      placeholder="what it means here"
                      aria-label="Its meaning here"
                      className="min-w-[8rem] flex-1 bg-transparent px-0 py-1 text-[14px]"
                      style={{ color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}
                    />
                    <Chip onClick={addTerm} disabled={!newWord.trim()} on={Boolean(newWord.trim())}>
                      keep
                    </Chip>
                  </div>
                )}
              </section>

              <section
                className="panel sketched rise relative p-4"
                style={{ borderRadius: 3, animationDelay: "260ms" }}
                aria-label="The reading"
              >
                <Sketch seed="dialogue-reading" draw />
                <div className="meta" style={{ color: "var(--accent)" }}>
                  the reading
                </div>
                <p className="mt-2 text-[13.5px] leading-[1.6]" style={{ color: "var(--ink)" }}>
                  {words.join(" · ")}
                </p>
                {writable && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <Chip
                      onClick={() => (sure === "dialogue" ? void remove() : setSure("dialogue"))}
                      accent={sure === "dialogue"}
                    >
                      {sure === "dialogue" ? "take the dialogue back — sure?" : "take the dialogue back"}
                    </Chip>
                  </div>
                )}
                <p className="meta mt-4" style={{ color: "var(--faint)", textTransform: "none" }}>
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

/** Six segments round a ring: filled by how often a family was asked, dashed where it never was. */
function Wheel({
  by,
  onPick,
  lit,
}: {
  by: Record<Family, number>;
  onPick: (f: Family) => void;
  lit: Family | null;
}) {
  const R = 70;
  const r = 42;
  const cx = 150;
  const cy = 100;
  const seg = (i: number) => {
    const a0 = -Math.PI / 2 + (i * Math.PI) / 3 + 0.04;
    const a1 = -Math.PI / 2 + ((i + 1) * Math.PI) / 3 - 0.04;
    const p = (rad: number, a: number) => `${(cx + rad * Math.cos(a)).toFixed(1)} ${(cy + rad * Math.sin(a)).toFixed(1)}`;
    return `M ${p(R, a0)} A ${R} ${R} 0 0 1 ${p(R, a1)} L ${p(r, a1)} A ${r} ${r} 0 0 0 ${p(r, a0)} Z`;
  };
  const labelAt = (i: number) => {
    const a = -Math.PI / 2 + ((i + 0.5) * Math.PI) / 3;
    return { x: cx + (R + 12) * Math.cos(a), y: cy + (R + 12) * Math.sin(a), a };
  };
  const short: Record<Family, string> = {
    clarify: "clarify",
    assume: "assume",
    evidence: "evidence",
    viewpoint: "viewpoint",
    consequence: "follows",
    question: "question",
  };
  return (
    <svg className="d-wheel mt-2 w-full" viewBox="0 0 300 200" role="img" aria-label="How often each family has been asked">
      {FAMILIES.map((f, i) => {
        const n = by[f];
        const { x, y, a } = labelAt(i);
        const anchor = Math.cos(a) > 0.3 ? "start" : Math.cos(a) < -0.3 ? "end" : "middle";
        return (
          <g key={f} onClick={() => onPick(f)}>
            <path
              d={seg(i)}
              fill="var(--ink)"
              fillOpacity={n ? Math.min(0.1 + n * 0.12, 0.7) : 0}
              stroke={lit === f ? "var(--accent)" : "var(--ink)"}
              strokeWidth={lit === f ? 1.6 : 1}
              strokeDasharray={n ? undefined : "3 3"}
              strokeOpacity={n ? 0.9 : 0.5}
            />
            <text
              x={x}
              y={y + 3}
              textAnchor={anchor}
              fontSize="9.5"
              fill={n ? "var(--ink)" : "var(--faint)"}
              style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              {short[f]}
              {n ? ` ${n}` : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
