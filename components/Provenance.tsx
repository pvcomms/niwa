"use client";

import { putOnDesk } from "./desk";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDay, validDay } from "@/lib/chronology";
import {
  CHANNELS,
  CHANNEL_LABEL,
  KNOWINGS,
  KNOWING_LABEL,
  WENT_LABEL,
  adopt,
  census,
  censusWords,
  checkedHop,
  driftAlong,
  emptyHop,
  emptyProvenance,
  keepAll,
  proposedCount,
  readings,
  tally,
  titleOf,
  uid,
  wordings,
  type Check,
  type Evidence,
  type Hop,
  type Knowing,
  type Proposal,
  type Provenance as ProvenanceFile,
  type Seen,
  type Went,
} from "@/lib/provenance";
import { KIND_LABEL } from "@/lib/palette";
import {
  rand,
  ribbon,
  roughEllipse,
  roughRect,
  seedOf,
  stroke,
} from "@/lib/hand";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

const W = 1000;
const H = 200;
const X0 = 90;
const X1 = 910;
const LY = 78;

type Payload = {
  provenances: ProvenanceFile[];
  writable: boolean;
  dir: string | null;
  model: string | null;
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const short = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1)}…` : s;
const shortHome = (p: string) => p.replace(/^\/Users\/[^/]+/, "~");

/**
 * The provenance. A claim as it reached the reader, and the chain of hands
 * it came through — each with its channel, its wording, its day, what it
 * gains if the claim is believed, what it runs on, and what it has said
 * before. The sheet draws the chain from the first saying to the reader,
 * solid where a hand was read or seen and hollow where it was not, with a
 * ring on the line where the wording turned. The desk reads the wordings
 * back as facts and never as a verdict; a model on this machine can propose
 * questions to put to each hand and checks that would settle the claim, all
 * hollow until kept. One file per claim.
 */
export default function Provenance() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [provs, setProvs] = useState<ProvenanceFile[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProvenanceFile | null>(null);
  const [fresh, setFresh] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [reading, setReading] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [query, setQuery] = useState("");
  const [cap, setCap] = useState<string | null>(null);
  const [sure, setSure] = useState<"file" | "hand" | null>(null);
  const [kept, setKept] = useState<"idle" | "saving" | "kept" | "error">(
    "idle",
  );
  const [theme, setTheme] = useTheme();

  const search = useRef<HTMLInputElement>(null);
  const capTimer = useRef<number | null>(null);
  const keptTimer = useRef<number | null>(null);
  const saveTimer = useRef<number | null>(null);
  const lastSaved = useRef<string>("");
  const draftRef = useRef<ProvenanceFile | null>(null);
  draftRef.current = draft;

  const today = todayStr();
  const writable = payload?.writable === true;
  const specimen = payload !== null && !payload.writable;

  // ── data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/provenance", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Payload | null) => {
        if (!p) return;
        setPayload(p);
        setProvs(p.provenances);
        const params = new URLSearchParams(window.location.search);
        const asked = params.get("id");
        const stone = params.get("stone");
        const byStone = stone
          ? p.provenances.find((x) => x.stone === stone)
          : null;
        const first =
          (asked && p.provenances.find((x) => x.slug === asked)) ||
          byStone ||
          (stone ? null : p.provenances[0]);
        if (first) {
          setSlug(first.slug);
          setDraft(first);
          lastSaved.current = JSON.stringify(first);
        } else if (p.writable) {
          setDraft({ ...emptyProvenance(todayStr()), stone: stone || null });
          setFresh(true);
        }
      });
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set("id", slug);
    else url.searchParams.delete("id");
    window.history.replaceState(null, "", url);
  }, [slug]);

  // the garden's own evidence for the stone the claim is bound to
  const stoneId = draft?.stone ?? null;
  useEffect(() => {
    if (!stoneId || specimen) {
      setEvidence(null);
      return;
    }
    let live = true;
    fetch(`/api/provenance?stone=${encodeURIComponent(stoneId)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { evidence: Evidence | null } | null) => {
        if (!live) return;
        setEvidence(j?.evidence ?? null);
        // a fresh claim opened from a stone takes the stone's name as its title
        if (j?.evidence)
          setDraft((d) =>
            d && !d.title && !d.claim.trim() && !d.slug
              ? { ...d, title: j.evidence!.stone.label }
              : d,
          );
      });
    return () => {
      live = false;
    };
  }, [stoneId, specimen]);

  useEffect(() => {
    const p = slug ? provs.find((x) => x.slug === slug) : null;
    putOnDesk(p ? { kind: "provenance", id: p.slug, label: titleOf(p) } : null);
    return () => putOnDesk(null);
  }, [slug, provs]);

  useEffect(() => {
    if (!asking) return;
    setElapsed(0);
    const t0 = Date.now();
    const id = window.setInterval(
      () => setElapsed(Math.round((Date.now() - t0) / 1000)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [asking]);

  // ── saying and keeping ──────────────────────────────────────────────────
  const say = useCallback((msg: string) => {
    if (capTimer.current) window.clearTimeout(capTimer.current);
    setCap(msg);
    capTimer.current = window.setTimeout(() => setCap(null), 2600);
  }, []);

  const settleKept = useCallback((state: "kept" | "error") => {
    setKept(state);
    if (keptTimer.current) window.clearTimeout(keptTimer.current);
    keptTimer.current = window.setTimeout(() => setKept("idle"), 1600);
  }, []);

  const worthKeeping = (p: ProvenanceFile) =>
    !!(p.claim.trim() || p.origin.trim() || p.hops.length);

  // A first save still on its way: a second one waits for it and then writes
  // over the file it made — or a chip pressed while the first is in flight
  // makes a second file.
  const inflight = useRef<Promise<ProvenanceFile | null> | null>(null);

  const put = useCallback(
    async (
      p: ProvenanceFile,
      isFresh: boolean,
    ): Promise<ProvenanceFile | null> => {
      if (!writable || !worthKeeping(p)) return null;
      let body = p;
      let fresh = isFresh;
      if (fresh && inflight.current) {
        const first = await inflight.current;
        if (first) {
          body = { ...p, slug: first.slug, recorded: first.recorded };
          fresh = false;
        }
      }
      setKept("saving");
      const task = (async () => {
        const r = await fetch("/api/provenance", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ provenance: body, fresh }),
        }).catch(() => null);
        if (!r || !r.ok) {
          const j = r ? await r.json().catch(() => null) : null;
          settleKept("error");
          say(
            j?.error
              ? String(j.error).replace(/^provenance: /, "")
              : "not kept.",
          );
          return null;
        }
        const k: ProvenanceFile = await r.json();
        lastSaved.current = JSON.stringify(k);
        setProvs((ps) =>
          ps.some((x) => x.slug === k.slug)
            ? ps.map((x) => (x.slug === k.slug ? k : x))
            : [k, ...ps],
        );
        setSlug(k.slug);
        setFresh(false);
        // keep the reader's typing if it moved on while the file was being written
        setDraft((d) =>
          d &&
          JSON.stringify({
            ...d,
            slug: k.slug,
            touched: k.touched,
            title: k.title,
          }) !== JSON.stringify(k)
            ? {
                ...d,
                slug: k.slug,
                touched: k.touched,
                title: d.title || k.title,
              }
            : k,
        );
        settleKept("kept");
        return k;
      })();
      if (fresh) {
        inflight.current = task;
        task.finally(() => {
          if (inflight.current === task) inflight.current = null;
        });
      }
      return task;
    },
    [writable, settleKept, say],
  );

  // the texts keep themselves a moment after the typing stops
  useEffect(() => {
    if (!draft || !writable) return;
    if (JSON.stringify(draft) === lastSaved.current) return;
    if (!worthKeeping(draft)) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const d = draftRef.current;
      if (d) put(d, !d.slug);
    }, 1400);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [draft, writable, put]);

  const keepNow = useCallback(
    (next: ProvenanceFile) => {
      setDraft(next);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      put(next, !next.slug);
    },
    [put],
  );

  const open = useCallback((p: ProvenanceFile) => {
    setSlug(p.slug);
    setDraft(p);
    setFresh(false);
    setSelected(null);
    setSure(null);
    lastSaved.current = JSON.stringify(p);
  }, []);

  const begin = useCallback(() => {
    if (!writable) return;
    setSlug(null);
    setDraft(emptyProvenance(todayStr()));
    setFresh(true);
    setSelected(null);
    setSure(null);
    lastSaved.current = "";
  }, [writable]);

  const remove = useCallback(async () => {
    if (!draft?.slug || !writable) return;
    const r = await fetch(
      `/api/provenance?slug=${encodeURIComponent(draft.slug)}`,
      { method: "DELETE" },
    ).catch(() => null);
    if (!r || !r.ok) {
      settleKept("error");
      return;
    }
    const rest = provs.filter((p) => p.slug !== draft.slug);
    setProvs(rest);
    setSure(null);
    say("let go of the file.");
    if (rest[0]) open(rest[0]);
    else begin();
  }, [draft, writable, provs, settleKept, say, open, begin]);

  const ask = useCallback(async () => {
    const d = draftRef.current;
    if (!d || !writable || asking) return;
    if (!d.claim.trim() && !d.hops.length) {
      say("put the claim down first, or name a hand.");
      return;
    }
    setAsking(true);
    const r = await fetch("/api/provenance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provenance: d }),
    }).catch(() => null);
    setAsking(false);
    if (!r || !r.ok) {
      const j = r ? await r.json().catch(() => null) : null;
      say(j?.error ? String(j.error) : "the model did not answer.");
      return;
    }
    const j = (await r.json()) as { proposal?: Proposal; ms?: number };
    if (!j.proposal) return;
    const now = draftRef.current ?? d;
    const next = adopt(now, j.proposal);
    const added = proposedCount(next) - proposedCount(now);
    keepNow(next);
    say(
      added
        ? `${added} proposed in ${Math.round((j.ms ?? 0) / 1000)}s — hollow until you keep them.`
        : "nothing new to propose.",
    );
  }, [writable, asking, say, keepNow]);

  // ── the hands ───────────────────────────────────────────────────────────
  const setHop = useCallback((id: string, patch: Partial<Hop>) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            hops: d.hops.map((h) => (h.id === id ? { ...h, ...patch } : h)),
          }
        : d,
    );
  }, []);

  const addHop = useCallback((where: "before" | "after") => {
    const h = emptyHop();
    setDraft((d) =>
      d
        ? { ...d, hops: where === "before" ? [h, ...d.hops] : [...d.hops, h] }
        : d,
    );
    setSelected(h.id);
    setSure(null);
  }, []);

  const removeHop = useCallback(
    (id: string) => {
      const d = draftRef.current;
      if (!d) return;
      keepNow({ ...d, hops: d.hops.filter((h) => h.id !== id) });
      setSelected((s) => (s === id ? null : s));
      setSure(null);
    },
    [keepNow],
  );

  const readOnce = useCallback(
    async (h: Hop) => {
      if (!writable || !h.link.trim() || reading) return;
      setReading(h.id);
      const r = await fetch("/api/provenance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ read: h.link.trim() }),
      }).catch(() => null);
      setReading(null);
      if (!r || !r.ok) {
        const j = r ? await r.json().catch(() => null) : null;
        say(j?.error ? String(j.error) : "could not read it.");
        return;
      }
      const j = (await r.json()) as { seen: Seen };
      const d = draftRef.current;
      if (!d) return;
      keepNow({
        ...d,
        hops: d.hops.map((x) =>
          x.id === h.id
            ? { ...x, seen: j.seen, where: x.where.trim() || j.seen.host }
            : x,
        ),
      });
      say(`read once — ${j.seen.host}.`);
    },
    [writable, reading, say, keepNow],
  );

  const setCheck = useCallback((id: string, patch: Partial<Check> | null) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            checks: patch
              ? d.checks.map((c) => (c.id === id ? { ...c, ...patch } : c))
              : d.checks.filter((c) => c.id !== id),
          }
        : d,
    );
  }, []);

  // ── the drawing ─────────────────────────────────────────────────────────
  const line = useMemo(() => {
    const r = rand(seedOf("prov-line"));
    const d = stroke([X0, LY], [X1, LY], r, 1.6, 4);
    return { d, ink: ribbon(d, 2.2, seedOf("prov-ink")) };
  }, []);

  const marks = useMemo(() => {
    if (!draft) return [];
    const n = draft.hops.length;
    return draft.hops.map((h, i) => ({
      h,
      x: X0 + ((X1 - X0) * (i + 1)) / (n + 1),
    }));
  }, [draft]);

  const words = useMemo(
    () => (draft ? readings(draft, today, evidence) : []),
    [draft, today, evidence],
  );
  const drifts = useMemo(() => (draft ? driftAlong(draft) : []), [draft]);
  const wordList = useMemo(() => (draft ? wordings(draft) : []), [draft]);
  const claimCensus = useMemo(
    () => (draft?.claim.trim() ? census(draft.claim) : null),
    [draft],
  );
  const counts = useMemo(() => (draft ? tally(draft) : null), [draft]);
  const nProposed = draft ? proposedCount(draft) : 0;
  const chosen = draft?.hops.find((h) => h.id === selected) ?? null;
  const chosenIndex = draft && chosen ? draft.hops.indexOf(chosen) : -1;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return provs
      .filter(
        (p) =>
          titleOf(p).toLowerCase().includes(q) ||
          p.claim.toLowerCase().includes(q) ||
          p.hops.some((h) => h.who.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [query, provs]);

  // ── keys ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable);
      if (typing) {
        if (e.key === "Escape") el?.blur();
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        search.current?.focus();
      } else if (e.key === "Escape") {
        setSelected(null);
        setSure(null);
      } else if (e.key === "n") begin();
      else if (e.key === "h" && writable) addHop("after");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [begin, addHop, writable]);

  const d = draft;

  return (
    <main className="provenance scroll-thin relative h-dvh w-full overflow-y-auto">
      <div className="mx-auto max-w-[84rem] px-5 pb-16 sm:px-10">
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
                provenance
              </div>
              <p
                className="hand mt-1 max-w-[31rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                How did this reach you? Put the claim down as it arrived, name
                the hands it came through, and say what each one gains. The
                sheet draws the chain and reads the wordings back. It never says
                whether the claim is so.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/provenance" />
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

        {specimen && (
          <p
            className="meta mt-3"
            style={{ color: "var(--accent)", textTransform: "none" }}
          >
            Specimen A&rsquo;s provenance — a claim about remote work that
            reached a synthetic life through four hands. Fiction, to show the
            instrument; read-only, and no model on a deployed garden.
          </p>
        )}

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
          {/* ── the sheet ─────────────────────────────────────────────── */}
          <section
            className="panel sketched rise relative self-start p-2 sm:p-3"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The provenance"
          >
            <Sketch seed="prov-sheet" draw />

            <div className="relative z-[2] flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span
                  className="hand text-[17px] leading-none"
                  style={{ color: "var(--ink)" }}
                >
                  {d ? titleOf(d) : "a claim"}
                </span>
                {counts && (
                  <span className="meta" style={{ color: "var(--muted)" }}>
                    · {counts.hands} {counts.hands === 1 ? "hand" : "hands"} ·{" "}
                    {counts.checked} checked
                    {nProposed ? ` · ${nProposed} proposed` : ""}
                  </span>
                )}
              </div>
              <span
                className="meta"
                style={{
                  color: kept === "error" ? "var(--accent)" : "var(--faint)",
                }}
              >
                {kept === "saving"
                  ? "keeping…"
                  : kept === "kept"
                    ? "kept"
                    : kept === "error"
                      ? "not kept"
                      : writable
                        ? ""
                        : "read-only"}
              </span>
            </div>

            {cap && (
              <div
                className="hand fade pointer-events-none absolute top-9 right-4 z-[4] text-[15px]"
                style={{ color: "var(--accent)" }}
              >
                — {cap}
              </div>
            )}

            {/* ── the chain ─────────────────────────────────────────── */}
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="p-sheet relative z-[2] block h-auto w-full"
              role="img"
              aria-label="The chain of hands from the first saying to you"
            >
              <defs>
                <mask
                  id="p-line-mask"
                  maskUnits="userSpaceOnUse"
                  x={X0 - 20}
                  y={LY - 12}
                  width={X1 - X0 + 40}
                  height={24}
                >
                  <path
                    d={line.d}
                    pathLength={1}
                    className="draw"
                    fill="none"
                    stroke="#fff"
                    strokeWidth={8}
                    strokeLinecap="round"
                  />
                </mask>
              </defs>
              <text
                x={X0}
                y={LY - 34}
                textAnchor="middle"
                fontSize={8.5}
                fill="var(--faint)"
                style={{
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                the first saying
              </text>
              <text
                x={X1}
                y={LY - 34}
                textAnchor="middle"
                fontSize={8.5}
                fill="var(--faint)"
                style={{
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                reached you
              </text>
              <path d={line.ink} fill="var(--ink)" mask="url(#p-line-mask)" />

              {/* the first saying */}
              {d?.origin.trim() ? (
                <>
                  <path
                    d={roughEllipse(18, 18, seedOf("prov-origin"), {
                      pad: 0,
                      steps: 14,
                      wobble: 1.4,
                    })}
                    transform={`translate(${X0 - 9} ${LY - 9})`}
                    fill="var(--accent)"
                    fillOpacity={0.15}
                    stroke="var(--accent)"
                    strokeWidth={1.4}
                  />
                  <path
                    d={roughEllipse(26, 26, seedOf("prov-origin-ring"), {
                      pad: 0,
                      steps: 14,
                      wobble: 1.6,
                    })}
                    transform={`translate(${X0 - 13} ${LY - 13})`}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={0.9}
                    strokeOpacity={0.6}
                  />
                </>
              ) : (
                <path
                  d={roughEllipse(18, 18, seedOf("prov-origin-hollow"), {
                    pad: 0,
                    steps: 14,
                    wobble: 1.4,
                  })}
                  transform={`translate(${X0 - 9} ${LY - 9})`}
                  fill="var(--surface)"
                  stroke="var(--faint)"
                  strokeWidth={1.1}
                  strokeDasharray="3 2.5"
                />
              )}
              <text
                x={X0}
                y={LY + 34}
                textAnchor="middle"
                fontSize={11}
                fill={d?.origin.trim() ? "var(--accent)" : "var(--faint)"}
                style={{ fontFamily: "var(--font-hand)" }}
              >
                {d?.origin.trim()
                  ? short(d.originWho.trim() || "as first said", 22)
                  : "not yet written"}
              </text>

              {/* you */}
              <path
                d={roughEllipse(14, 14, seedOf("prov-you"), {
                  pad: 0,
                  steps: 12,
                })}
                transform={`translate(${X1 - 7} ${LY - 7})`}
                fill="var(--ink)"
                fillOpacity={0.9}
                stroke="var(--ink)"
                strokeWidth={0.8}
              />
              <text
                x={X1}
                y={LY + 34}
                textAnchor="middle"
                fontSize={11}
                fill="var(--muted)"
                style={{ fontFamily: "var(--font-hand)" }}
              >
                you · {formatDay(today)}
              </text>

              {/* the hands */}
              {marks.map((m, i) => {
                const on = m.h.id === selected;
                const solid = checkedHop(m.h);
                const hollowThings =
                  m.h.asked.filter((q) => !q.kept).length +
                  m.h.turns.filter((t) => !t.kept).length;
                const bw = 22;
                const bh = 16;
                return (
                  <g
                    key={m.h.id}
                    className="p-mark"
                    style={{ cursor: "pointer", ["--i" as string]: i }}
                    onClick={() => {
                      setSelected(on ? null : m.h.id);
                      setSure(null);
                    }}
                  >
                    {m.h.reframed === true && (
                      <path
                        d={roughEllipse(9, 9, seedOf(`${m.h.id}-turn`), {
                          pad: 0,
                          steps: 12,
                          wobble: 1,
                        })}
                        transform={`translate(${m.x - bw / 2 - 16} ${LY - 4.5})`}
                        fill="var(--surface)"
                        stroke="var(--accent)"
                        strokeWidth={1.3}
                      />
                    )}
                    <rect
                      x={m.x - bw / 2}
                      y={LY - bh / 2}
                      width={bw}
                      height={bh}
                      fill={solid ? "var(--ink)" : "var(--surface)"}
                      fillOpacity={solid ? 0.88 : 1}
                    />
                    <path
                      d={roughRect(bw, bh, seedOf(m.h.id), {
                        wobble: 0.9,
                        overshoot: 2,
                      })}
                      transform={`translate(${m.x - bw / 2} ${LY - bh / 2})`}
                      fill="none"
                      stroke={
                        on
                          ? "var(--accent)"
                          : solid
                            ? "var(--ink)"
                            : "var(--faint)"
                      }
                      strokeWidth={on ? 1.6 : 1}
                      strokeDasharray={solid ? undefined : "2.5 2"}
                    />
                    {on && (
                      <path
                        d={roughEllipse(
                          bw + 16,
                          bh + 16,
                          seedOf(`${m.h.id}-ring`),
                          {
                            pad: 0,
                            steps: 14,
                            wobble: 1.2,
                          },
                        )}
                        transform={`translate(${m.x - bw / 2 - 8} ${LY - bh / 2 - 8})`}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth={1.2}
                      />
                    )}
                    {hollowThings > 0 && (
                      <circle
                        cx={m.x + bw / 2 + 3}
                        cy={LY - bh / 2 - 3}
                        r={2}
                        fill="var(--surface)"
                        stroke="var(--accent)"
                        strokeWidth={1}
                      />
                    )}
                    <text
                      x={m.x}
                      y={LY + 34}
                      textAnchor="middle"
                      fontSize={on ? 12 : 11}
                      fill={on ? "var(--ink)" : "var(--muted)"}
                      style={{ fontFamily: "var(--font-hand)" }}
                    >
                      {short(m.h.who.trim() || "unnamed", on ? 30 : 18)}
                    </text>
                    <text
                      x={m.x}
                      y={LY + 47}
                      textAnchor="middle"
                      fontSize={7.5}
                      fill="var(--faint)"
                      style={{
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      {CHANNEL_LABEL[m.h.channel]}
                      {m.h.where.trim()
                        ? ` · ${short(m.h.where.trim(), 16)}`
                        : ""}
                    </text>
                    <text
                      x={m.x}
                      y={LY + 61}
                      textAnchor="middle"
                      fontSize={10}
                      fill="var(--faint)"
                      style={{ fontFamily: "var(--font-hand)" }}
                    >
                      {m.h.day && validDay(m.h.day) ? formatDay(m.h.day) : ""}
                    </text>
                    <rect
                      x={m.x - 40}
                      y={LY - 22}
                      width={80}
                      height={90}
                      fill="transparent"
                    />
                  </g>
                );
              })}
              {d && d.hops.length === 0 && (
                <text
                  x={(X0 + X1) / 2}
                  y={LY - 12}
                  textAnchor="middle"
                  fontSize={14}
                  fill="var(--faint)"
                  style={{ fontFamily: "var(--font-hand)" }}
                >
                  {writable
                    ? "name the hands it came through — the last one first, if that is the one you remember"
                    : "no hands named"}
                </text>
              )}
              <text
                x={(X0 + X1) / 2}
                y={H - 10}
                textAnchor="middle"
                fontSize={8.5}
                fill="var(--faint)"
                style={{
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                solid · read once or seen — hollow · not checked — a ring on the
                line · the wording turned here
              </text>
            </svg>

            {/* ── the two wordings ─────────────────────────────────── */}
            {d && (
              <div className="relative z-[2] mt-2 grid gap-3 px-1 pb-2 sm:grid-cols-2">
                <div
                  className="panel sketched relative p-3"
                  style={{ borderRadius: 3 }}
                >
                  <Sketch
                    seed={`origin-${d.slug || "fresh"}`}
                    color="var(--accent)"
                    draw
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="meta" style={{ color: "var(--accent)" }}>
                      the first saying · as first said
                    </div>
                    <input
                      value={d.originWho}
                      onChange={(e) =>
                        setDraft({ ...d, originWho: e.target.value })
                      }
                      readOnly={!writable}
                      placeholder="who said it first"
                      className="search hand w-[11rem] px-2 py-0.5 text-[13px]"
                    />
                  </div>
                  <textarea
                    value={d.origin}
                    onChange={(e) => setDraft({ ...d, origin: e.target.value })}
                    readOnly={!writable}
                    rows={5}
                    maxLength={4000}
                    placeholder="the claim in the first hand's own words, if you can find them — the sentence in the paper, the line in the report, the number as it was given. leave it blank if you cannot see that far back."
                    className="search hand mt-2 w-full resize-y px-3 py-2 text-[15px] leading-[1.35]"
                  />
                </div>
                <div
                  className="panel sketched relative p-3"
                  style={{ borderRadius: 3 }}
                >
                  <Sketch seed={`claim-${d.slug || "fresh"}`} draw />
                  <div className="meta" style={{ color: "var(--muted)" }}>
                    the claim · as it reached you
                  </div>
                  <textarea
                    value={d.claim}
                    onChange={(e) => setDraft({ ...d, claim: e.target.value })}
                    readOnly={!writable}
                    rows={5}
                    maxLength={4000}
                    placeholder="the claim as you would say it now, in the words it arrived in. not what you think is true — what reached you."
                    className="search hand mt-2 w-full resize-y px-3 py-2 text-[15px] leading-[1.35]"
                  />
                  {claimCensus && (
                    <p
                      className="hand mt-1.5 text-[13px] leading-[1.35]"
                      style={{ color: "var(--faint)" }}
                    >
                      {censusWords(claimCensus)
                        ? `leans on ${censusWords(claimCensus)}`
                        : "leans on none of the usual words"}
                      {" · "}
                      {claimCensus.attributed
                        ? `says where it got this ${claimCensus.attributed}×`
                        : "does not say where it got this"}
                      {claimCensus.named.length
                        ? ` · names ${claimCensus.named.slice(0, 4).join(", ")}`
                        : " · names no one"}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── hand to hand ─────────────────────────────────────── */}
            {d && wordList.length > 1 && (
              <div className="relative z-[2] px-2 pb-3">
                <div className="meta" style={{ color: "var(--faint)" }}>
                  hand to hand · what each wording gained and lost
                </div>
                <ol className="mt-1.5 flex flex-col">
                  {wordList.map((w, i) => {
                    const dr = drifts[i - 1];
                    const hop = d.hops.find((h) => h.id === w.at);
                    const on = w.at === selected;
                    return (
                      <li key={w.at} className="flex flex-col">
                        {dr && (dr.gained.length > 0 || dr.lost.length > 0) && (
                          <div
                            className="hand ml-5 flex flex-wrap items-baseline gap-x-2 py-0.5 text-[12.5px]"
                            style={{ color: "var(--faint)" }}
                          >
                            <span aria-hidden>↓</span>
                            {dr.gained.length > 0 && (
                              <span>
                                gained{" "}
                                <span style={{ color: "var(--accent)" }}>
                                  {dr.gained.slice(0, 6).join(", ")}
                                </span>
                              </span>
                            )}
                            {dr.lost.length > 0 && (
                              <span>
                                lost{" "}
                                <span
                                  style={{
                                    color: "var(--muted)",
                                    textDecoration: "line-through",
                                    textDecorationColor: "var(--rule)",
                                  }}
                                >
                                  {dr.lost.slice(0, 6).join(", ")}
                                </span>
                              </span>
                            )}
                          </div>
                        )}
                        <button
                          onClick={() => {
                            if (hop) {
                              setSelected(on ? null : hop.id);
                              setSure(null);
                            }
                          }}
                          className="p-row flex w-full items-baseline gap-2 rounded px-1.5 py-1 text-left"
                          style={{
                            cursor: hop ? "pointer" : "default",
                            background: on
                              ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                              : undefined,
                          }}
                        >
                          <span
                            className="meta shrink-0"
                            style={{
                              color:
                                w.at === "origin"
                                  ? "var(--accent)"
                                  : w.at === "you"
                                    ? "var(--ink)"
                                    : "var(--faint)",
                              textTransform: "none",
                              minWidth: "7.5rem",
                            }}
                          >
                            {short(w.label, 22)}
                          </span>
                          <span
                            className="hand min-w-0 flex-1 text-[14px] leading-[1.3]"
                            style={{ color: "var(--ink)" }}
                          >
                            {w.text}
                          </span>
                        </button>
                        {hop && hop.turns.filter((t) => t.kept).length > 0 && (
                          <div
                            className="hand ml-[8.5rem] text-[12.5px]"
                            style={{ color: "var(--accent)" }}
                          >
                            {hop.turns
                              .filter((t) => t.kept)
                              .map((t) => `‘${t.was}’ → ‘${t.became}’`)
                              .join(" · ")}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {/* ── how you know it · what would settle it ─────────────── */}
            {d && (
              <div className="relative z-[2] grid gap-4 px-2 pb-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                <div>
                  <div className="meta" style={{ color: "var(--faint)" }}>
                    how you know it
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {KNOWINGS.map((k) => {
                      const on = d.knowing.includes(k);
                      return (
                        <Chip
                          key={k}
                          on={on}
                          color="var(--accent)"
                          disabled={!writable}
                          onClick={() =>
                            keepNow({
                              ...d,
                              knowing: on
                                ? d.knowing.filter((x) => x !== k)
                                : [...d.knowing, k as Knowing],
                            })
                          }
                        >
                          {KNOWING_LABEL[k]}
                        </Chip>
                      );
                    })}
                  </div>
                  <textarea
                    value={d.note}
                    onChange={(e) => setDraft({ ...d, note: e.target.value })}
                    readOnly={!writable}
                    rows={3}
                    maxLength={4000}
                    placeholder="a note — what you make of the chain, in your own words"
                    className="search hand mt-3 w-full resize-y px-3 py-2 text-[14px] leading-[1.35]"
                  />
                </div>
                <div>
                  <div
                    className="meta flex flex-wrap items-baseline gap-2"
                    style={{ color: "var(--faint)" }}
                  >
                    what would settle it
                    {writable && (
                      <button
                        onClick={() =>
                          setDraft({
                            ...d,
                            checks: [
                              ...d.checks,
                              {
                                id: uid(),
                                text: "",
                                how: "",
                                went: "",
                                on: null,
                                by: "you",
                                kept: true,
                              },
                            ],
                          })
                        }
                        className="underline"
                        style={{ color: "var(--muted)" }}
                      >
                        + a check
                      </button>
                    )}
                  </div>
                  {d.checks.length === 0 && (
                    <p
                      className="hand mt-1.5 text-[13.5px]"
                      style={{ color: "var(--faint)" }}
                    >
                      nothing named yet. a document to find, a number to look
                      up, a person who could be asked — or say it cannot be.
                    </p>
                  )}
                  <ul className="mt-1.5 flex flex-col gap-2">
                    {d.checks.map((c) => (
                      <li key={c.id} className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            aria-hidden
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{
                              background:
                                c.kept && c.went
                                  ? c.went === "held"
                                    ? "var(--ink)"
                                    : c.went === "fell"
                                      ? "var(--accent)"
                                      : "var(--faint)"
                                  : "transparent",
                              border: `1px ${c.kept ? "solid" : "dashed"} ${c.went === "fell" ? "var(--accent)" : "var(--ink)"}`,
                            }}
                            title={WENT_LABEL[c.went]}
                          />
                          <input
                            value={c.text}
                            onChange={(e) =>
                              setCheck(c.id, {
                                text: e.target.value,
                                by: "you",
                              })
                            }
                            readOnly={!writable}
                            placeholder="what would settle it"
                            className="search hand min-w-0 flex-1 px-2 py-1 text-[14px]"
                            style={{
                              color: c.kept ? "var(--ink)" : "var(--muted)",
                              borderStyle: c.kept ? undefined : "dashed",
                            }}
                          />
                          {writable && !c.kept && (
                            <Chip
                              onClick={() =>
                                keepNow({
                                  ...d,
                                  checks: d.checks.map((x) =>
                                    x.id === c.id ? { ...x, kept: true } : x,
                                  ),
                                })
                              }
                              on
                              color="var(--accent)"
                            >
                              keep
                            </Chip>
                          )}
                          {writable && (
                            <button
                              onClick={() =>
                                keepNow({
                                  ...d,
                                  checks: d.checks.filter((x) => x.id !== c.id),
                                })
                              }
                              className="meta px-1"
                              style={{ color: "var(--faint)" }}
                              aria-label="Remove"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        <div className="ml-4 flex flex-wrap items-center gap-1.5">
                          <input
                            value={c.how}
                            onChange={(e) =>
                              setCheck(c.id, { how: e.target.value })
                            }
                            readOnly={!writable}
                            placeholder="how — where to look, whom to ask"
                            className="search hand min-w-0 flex-1 px-2 py-1 text-[13px]"
                            style={{ color: "var(--muted)" }}
                          />
                          {c.kept &&
                            (["", "held", "fell", "cannot"] as Went[]).map(
                              (w) => (
                                <Chip
                                  key={w || "open"}
                                  on={c.went === w}
                                  disabled={!writable}
                                  color={
                                    w === "fell" ? "var(--accent)" : undefined
                                  }
                                  onClick={() =>
                                    keepNow({
                                      ...d,
                                      checks: d.checks.map((x) =>
                                        x.id === c.id
                                          ? {
                                              ...x,
                                              went: w,
                                              on: w ? today : null,
                                            }
                                          : x,
                                      ),
                                    })
                                  }
                                >
                                  {WENT_LABEL[w]}
                                </Chip>
                              ),
                            )}
                          {c.on && (
                            <span
                              className="meta"
                              style={{
                                color: "var(--faint)",
                                textTransform: "none",
                              }}
                            >
                              {formatDay(c.on)}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>

          {/* ── the desk ──────────────────────────────────────────────── */}
          <aside
            className="rise flex flex-col gap-5"
            style={{ animationDelay: "140ms" }}
          >
            <div className="relative">
              <div className="flex items-baseline justify-between">
                <label
                  className="meta block"
                  htmlFor="prov-search"
                  style={{ color: "var(--faint)" }}
                >
                  the claims · {provs.length}
                </label>
                {writable && (
                  <button
                    onClick={begin}
                    className="meta underline"
                    style={{ color: "var(--muted)" }}
                  >
                    new · n
                  </button>
                )}
              </div>
              <input
                id="prov-search"
                ref={search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="a claim, a hand  /"
                className="search mt-2 w-full px-3 py-2 text-[13px]"
                autoComplete="off"
              />
              {(results.length > 0 ||
                (query.trim().length < 2 && provs.length > 1)) && (
                <ul className="mt-2 flex flex-col">
                  {(results.length ? results : provs.slice(0, 6)).map((p) => (
                    <li key={p.slug}>
                      <button
                        onClick={() => open(p)}
                        className="p-row flex w-full items-baseline gap-2 rounded px-1.5 py-0.5 text-left"
                        style={{
                          background:
                            p.slug === slug
                              ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                              : undefined,
                        }}
                      >
                        <span
                          className="hand min-w-0 flex-1 truncate text-[14px]"
                          style={{ color: "var(--ink)" }}
                        >
                          {titleOf(p)}
                        </span>
                        <span
                          className="meta shrink-0"
                          style={{
                            color: "var(--faint)",
                            textTransform: "none",
                          }}
                        >
                          {p.hops.length}{" "}
                          {p.hops.length === 1 ? "hand" : "hands"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* the hand on the desk */}
            {d && chosen && (
              <section
                className="panel sketched relative p-4"
                style={{ borderRadius: 3 }}
                aria-label="The hand"
              >
                <Sketch seed={`hand-${chosen.id}`} color="var(--accent)" draw />
                <div className="flex items-baseline justify-between">
                  <div className="meta" style={{ color: "var(--accent)" }}>
                    hand {chosenIndex + 1} of {d.hops.length}
                    <span style={{ color: "var(--faint)" }}>
                      {" "}
                      · {checkedHop(chosen) ? "checked" : "not checked"}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="meta"
                    style={{ color: "var(--faint)" }}
                  >
                    esc
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <input
                    value={chosen.who}
                    onChange={(e) => setHop(chosen.id, { who: e.target.value })}
                    readOnly={!writable}
                    placeholder="who — a name, a handle, a masthead"
                    className="search hand min-w-0 flex-1 px-2 py-1 text-[14.5px]"
                    autoFocus={!chosen.who}
                  />
                  <select
                    value={chosen.channel}
                    onChange={(e) =>
                      setHop(chosen.id, {
                        channel: e.target.value as Hop["channel"],
                      })
                    }
                    disabled={!writable}
                    className="search px-1.5 py-1 text-[10px]"
                    style={{ fontFamily: "var(--font-mono)", maxWidth: "8rem" }}
                    aria-label="Channel"
                  >
                    {CHANNELS.map((c) => (
                      <option key={c} value={c}>
                        {CHANNEL_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <input
                    value={chosen.where}
                    onChange={(e) =>
                      setHop(chosen.id, { where: e.target.value })
                    }
                    readOnly={!writable}
                    placeholder="where — a host, a room"
                    className="search hand min-w-0 flex-1 px-2 py-1 text-[13.5px]"
                  />
                  <input
                    value={chosen.day ?? ""}
                    onChange={(e) =>
                      setHop(chosen.id, { day: e.target.value.trim() || null })
                    }
                    readOnly={!writable}
                    placeholder="2025-02"
                    className="search w-[6.5rem] px-2 py-1 text-[11.5px]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      borderColor:
                        !chosen.day || validDay(chosen.day)
                          ? undefined
                          : "var(--accent)",
                    }}
                  />
                </div>
                <textarea
                  value={chosen.said}
                  onChange={(e) => setHop(chosen.id, { said: e.target.value })}
                  readOnly={!writable}
                  rows={3}
                  maxLength={2000}
                  placeholder="what this hand said — the claim in its wording, verbatim if you can"
                  className="search hand mt-1.5 w-full resize-y px-3 py-2 text-[14.5px] leading-[1.3]"
                />
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <input
                    value={chosen.link}
                    onChange={(e) =>
                      setHop(chosen.id, { link: e.target.value })
                    }
                    readOnly={!writable}
                    placeholder="a link, if there is one"
                    className="search min-w-0 flex-1 px-2 py-1 text-[11.5px]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                  {writable && (
                    <Chip
                      onClick={() => readOnce(chosen)}
                      disabled={!chosen.link.trim() || reading !== null}
                      on={!!chosen.link.trim()}
                      color="var(--accent)"
                    >
                      {reading === chosen.id
                        ? "reading…"
                        : chosen.seen
                          ? "read it again"
                          : "read it once"}
                    </Chip>
                  )}
                </div>
                {chosen.seen && (
                  <p
                    className="hand mt-1.5 text-[13px] leading-[1.35]"
                    style={{ color: "var(--muted)" }}
                  >
                    <span style={{ color: "var(--accent)" }}>
                      read once
                      {chosen.seen.on ? `, ${formatDay(chosen.seen.on)}` : ""}
                    </span>
                    {" · "}
                    {chosen.seen.title || chosen.seen.host}
                    {chosen.seen.host && chosen.seen.title
                      ? ` · ${chosen.seen.host}`
                      : ""}
                    {chosen.seen.words
                      ? ` — ${short(chosen.seen.words, 160)}`
                      : ""}
                  </p>
                )}

                <div className="meta mt-3" style={{ color: "var(--faint)" }}>
                  its interests
                </div>
                <input
                  value={chosen.gains}
                  onChange={(e) => setHop(chosen.id, { gains: e.target.value })}
                  readOnly={!writable}
                  placeholder="what it gains if you believe this"
                  className="search hand mt-1.5 w-full px-2 py-1 text-[13.5px]"
                />
                <input
                  value={chosen.runsOn}
                  onChange={(e) =>
                    setHop(chosen.id, { runsOn: e.target.value })
                  }
                  readOnly={!writable}
                  placeholder="what it runs on — who pays it, what it sells"
                  className="search hand mt-1.5 w-full px-2 py-1 text-[13.5px]"
                />
                <textarea
                  value={chosen.record}
                  onChange={(e) =>
                    setHop(chosen.id, { record: e.target.value })
                  }
                  readOnly={!writable}
                  rows={2}
                  maxLength={1000}
                  placeholder="its record — what it said before, and how that went"
                  className="search hand mt-1.5 w-full resize-y px-2 py-1 text-[13.5px] leading-[1.3]"
                />

                <div className="meta mt-3" style={{ color: "var(--faint)" }}>
                  the wording, in this hand
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(
                    [
                      [true, "turned"],
                      [false, "kept as it was"],
                      [null, "not said"],
                    ] as [boolean | null, string][]
                  ).map(([v, label]) => (
                    <Chip
                      key={label}
                      on={chosen.reframed === v}
                      disabled={!writable}
                      color={v === true ? "var(--accent)" : undefined}
                      onClick={() => {
                        const next = {
                          ...d,
                          hops: d.hops.map((h) =>
                            h.id === chosen.id ? { ...h, reframed: v } : h,
                          ),
                        };
                        keepNow(next);
                      }}
                    >
                      {label}
                    </Chip>
                  ))}
                  {writable && (
                    <button
                      onClick={() =>
                        setHop(chosen.id, {
                          turns: [
                            ...chosen.turns,
                            {
                              id: uid(),
                              was: "",
                              became: "",
                              by: "you",
                              kept: true,
                            },
                          ],
                        })
                      }
                      className="meta underline"
                      style={{ color: "var(--muted)" }}
                    >
                      + note a turn
                    </button>
                  )}
                </div>
                {chosen.turns.length > 0 && (
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {chosen.turns.map((t) => (
                      <li key={t.id} className="flex items-center gap-1">
                        <input
                          value={t.was}
                          onChange={(e) =>
                            setHop(chosen.id, {
                              turns: chosen.turns.map((x) =>
                                x.id === t.id
                                  ? { ...x, was: e.target.value, by: "you" }
                                  : x,
                              ),
                            })
                          }
                          readOnly={!writable}
                          placeholder="was"
                          className="search hand min-w-0 flex-1 px-2 py-0.5 text-[13px]"
                          style={{
                            color: t.kept ? "var(--muted)" : "var(--faint)",
                            borderStyle: t.kept ? undefined : "dashed",
                          }}
                        />
                        <span
                          className="meta"
                          style={{ color: "var(--faint)" }}
                        >
                          →
                        </span>
                        <input
                          value={t.became}
                          onChange={(e) =>
                            setHop(chosen.id, {
                              turns: chosen.turns.map((x) =>
                                x.id === t.id
                                  ? { ...x, became: e.target.value, by: "you" }
                                  : x,
                              ),
                            })
                          }
                          readOnly={!writable}
                          placeholder="became"
                          className="search hand min-w-0 flex-1 px-2 py-0.5 text-[13px]"
                          style={{
                            color: t.kept ? "var(--accent)" : "var(--faint)",
                            borderStyle: t.kept ? undefined : "dashed",
                          }}
                        />
                        {writable && !t.kept && (
                          <Chip
                            onClick={() =>
                              keepNow({
                                ...d,
                                hops: d.hops.map((h) =>
                                  h.id === chosen.id
                                    ? {
                                        ...h,
                                        reframed: true,
                                        turns: h.turns.map((x) =>
                                          x.id === t.id
                                            ? { ...x, kept: true }
                                            : x,
                                        ),
                                      }
                                    : h,
                                ),
                              })
                            }
                            on
                            color="var(--accent)"
                          >
                            keep
                          </Chip>
                        )}
                        {writable && (
                          <button
                            onClick={() =>
                              keepNow({
                                ...d,
                                hops: d.hops.map((h) =>
                                  h.id === chosen.id
                                    ? {
                                        ...h,
                                        turns: h.turns.filter(
                                          (x) => x.id !== t.id,
                                        ),
                                      }
                                    : h,
                                ),
                              })
                            }
                            className="meta px-1"
                            style={{ color: "var(--faint)" }}
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <div
                  className="meta mt-3 flex flex-wrap items-baseline gap-2"
                  style={{ color: "var(--faint)" }}
                >
                  questions to put to it
                  {writable && (
                    <button
                      onClick={() =>
                        setHop(chosen.id, {
                          asked: [
                            ...chosen.asked,
                            {
                              id: uid(),
                              text: "",
                              answer: "",
                              by: "you",
                              kept: true,
                            },
                          ],
                        })
                      }
                      className="underline"
                      style={{ color: "var(--muted)" }}
                    >
                      + one
                    </button>
                  )}
                </div>
                {chosen.asked.length === 0 && (
                  <p
                    className="hand mt-1 text-[13px]"
                    style={{ color: "var(--faint)" }}
                  >
                    who pays it? what does it gain? what did it say last time,
                    and how did that go? whom does it cite?
                  </p>
                )}
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {chosen.asked.map((q) => (
                    <li key={q.id} className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <input
                          value={q.text}
                          onChange={(e) =>
                            setHop(chosen.id, {
                              asked: chosen.asked.map((x) =>
                                x.id === q.id
                                  ? { ...x, text: e.target.value, by: "you" }
                                  : x,
                              ),
                            })
                          }
                          readOnly={!writable}
                          placeholder="the question"
                          className="search hand min-w-0 flex-1 px-2 py-1 text-[13.5px]"
                          style={{
                            color: q.kept ? "var(--ink)" : "var(--muted)",
                            borderStyle: q.kept ? undefined : "dashed",
                          }}
                        />
                        {writable && !q.kept && (
                          <Chip
                            onClick={() =>
                              keepNow({
                                ...d,
                                hops: d.hops.map((h) =>
                                  h.id === chosen.id
                                    ? {
                                        ...h,
                                        asked: h.asked.map((x) =>
                                          x.id === q.id
                                            ? { ...x, kept: true }
                                            : x,
                                        ),
                                      }
                                    : h,
                                ),
                              })
                            }
                            on
                            color="var(--accent)"
                          >
                            keep
                          </Chip>
                        )}
                        {writable && (
                          <button
                            onClick={() =>
                              keepNow({
                                ...d,
                                hops: d.hops.map((h) =>
                                  h.id === chosen.id
                                    ? {
                                        ...h,
                                        asked: h.asked.filter(
                                          (x) => x.id !== q.id,
                                        ),
                                      }
                                    : h,
                                ),
                              })
                            }
                            className="meta px-1"
                            style={{ color: "var(--faint)" }}
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      {q.kept && (
                        <input
                          value={q.answer}
                          onChange={(e) =>
                            setHop(chosen.id, {
                              asked: chosen.asked.map((x) =>
                                x.id === q.id
                                  ? { ...x, answer: e.target.value }
                                  : x,
                              ),
                            })
                          }
                          readOnly={!writable}
                          placeholder="what you found"
                          className="search hand ml-4 px-2 py-1 text-[13px]"
                          style={{ color: "var(--accent)" }}
                        />
                      )}
                    </li>
                  ))}
                </ul>

                {writable && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() =>
                        sure === "hand" ? removeHop(chosen.id) : setSure("hand")
                      }
                      className="chip px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color:
                          sure === "hand" ? "var(--accent)" : "var(--faint)",
                        borderColor:
                          sure === "hand" ? "var(--accent)" : undefined,
                      }}
                    >
                      {sure === "hand"
                        ? "yes, take the hand back"
                        : "take it back"}
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* ask the model on this machine */}
            {d && (
              <section
                className="panel sketched relative p-4"
                style={{ borderRadius: 3 }}
                aria-label="Ask"
              >
                <Sketch seed="prov-ask" draw />
                <div className="meta" style={{ color: "var(--faint)" }}>
                  a model on this machine
                  {payload?.model ? ` · ${payload.model}` : ""}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Chip
                    onClick={ask}
                    disabled={!writable || asking}
                    on={writable}
                    color="var(--accent)"
                  >
                    {asking ? `thinking · ${elapsed}s` : "ask what to ask"}
                  </Chip>
                </div>
                <p
                  className="hand mt-2 text-[13px] leading-[1.35]"
                  style={{ color: "var(--faint)" }}
                >
                  {writable
                    ? "it proposes questions to put to each hand, checks that would settle the claim, and where the wording turned — hollow until you keep them. it is never asked whether the claim is so. nothing leaves this machine."
                    : "no model on a deployed garden."}
                </p>
                {nProposed > 0 && writable && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="meta" style={{ color: "var(--muted)" }}>
                      {nProposed} proposed
                    </span>
                    <Chip
                      onClick={() => keepNow(keepAll(d, true))}
                      on
                      color="var(--accent)"
                    >
                      keep all
                    </Chip>
                    <Chip onClick={() => keepNow(keepAll(d, false))}>
                      drop all
                    </Chip>
                  </div>
                )}
              </section>
            )}

            {/* the reading */}
            <section
              className="panel sketched relative p-4"
              style={{ borderRadius: 3 }}
              aria-label="The reading"
            >
              <Sketch seed="prov-reading" draw />
              <div className="meta" style={{ color: "var(--faint)" }}>
                the reading
              </div>
              <ul className="mt-2">
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
            </section>

            {/* the hands, listed */}
            {d && (d.hops.length > 0 || writable) && (
              <section aria-label="The hands">
                <div
                  className="meta flex flex-wrap items-baseline gap-2"
                  style={{ color: "var(--faint)" }}
                >
                  the hands, first to last
                  {writable && (
                    <>
                      <button
                        onClick={() => addHop("before")}
                        className="underline"
                        style={{ color: "var(--muted)" }}
                      >
                        + one before
                      </button>
                      <button
                        onClick={() => addHop("after")}
                        className="underline"
                        style={{ color: "var(--muted)" }}
                      >
                        + one after · h
                      </button>
                    </>
                  )}
                </div>
                <ul className="mt-1 flex flex-col">
                  {d.hops.map((h, i) => (
                    <li key={h.id}>
                      <button
                        onClick={() => {
                          setSelected(h.id === selected ? null : h.id);
                          setSure(null);
                        }}
                        className="p-row flex w-full items-baseline gap-2 rounded px-1.5 py-0.5 text-left"
                        style={{
                          background:
                            selected === h.id
                              ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                              : undefined,
                        }}
                      >
                        <span
                          aria-hidden
                          className="inline-block h-2 w-2.5 shrink-0"
                          style={{
                            background: checkedHop(h)
                              ? "var(--ink)"
                              : "transparent",
                            border: `1px ${checkedHop(h) ? "solid" : "dashed"} ${h.reframed ? "var(--accent)" : "var(--ink)"}`,
                            transform: "translateY(-1px)",
                          }}
                        />
                        <span
                          className="hand min-w-0 flex-1 truncate text-[14px] leading-[1.25]"
                          style={{ color: "var(--ink)" }}
                        >
                          {i + 1}. {h.who.trim() || "unnamed"}
                          <span style={{ color: "var(--faint)" }}>
                            {" "}
                            · {CHANNEL_LABEL[h.channel]}
                            {h.where.trim() ? ` · ${h.where.trim()}` : ""}
                          </span>
                        </span>
                        <span
                          className="meta shrink-0"
                          style={{
                            color: "var(--faint)",
                            textTransform: "none",
                          }}
                        >
                          {h.day && validDay(h.day) ? formatDay(h.day) : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* the garden's evidence */}
            {d && !specimen && (
              <section
                className="panel sketched relative p-4"
                style={{ borderRadius: 3 }}
                aria-label="The garden's evidence"
              >
                <Sketch seed="prov-evidence" draw />
                <div className="meta" style={{ color: "var(--faint)" }}>
                  in the garden
                </div>
                {evidence ? (
                  <>
                    <p
                      className="hand mt-1.5 text-[14px] leading-[1.35]"
                      style={{ color: "var(--ink)" }}
                    >
                      bound to{" "}
                      <Link
                        href={`/flow?id=${encodeURIComponent(evidence.stone.id)}`}
                        className="b-stone-link"
                        style={{ color: "var(--accent)" }}
                      >
                        {evidence.stone.label}
                      </Link>
                      <span style={{ color: "var(--faint)" }}>
                        {" "}
                        ·{" "}
                        {KIND_LABEL[evidence.stone.kind] ?? evidence.stone.kind}
                      </span>
                    </p>
                    <p
                      className="mt-1.5 text-[13px] leading-[1.5]"
                      style={{ color: "var(--muted)" }}
                    >
                      {evidence.n === 0
                        ? "nothing flows into it yet."
                        : `${evidence.n} ${evidence.n === 1 ? "stone flows" : "stones flow"} into it: ${Object.entries(
                            evidence.byKind,
                          )
                            .sort((a, b) => b[1] - a[1])
                            .map(
                              ([k, n]) =>
                                `${n} ${(KIND_LABEL[k] ?? k).toLowerCase()}`,
                            )
                            .join(", ")}.`}
                    </p>
                    {evidence.hosts.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                        <span
                          className="meta"
                          style={{ color: "var(--faint)" }}
                        >
                          they name
                        </span>
                        {evidence.hosts.slice(0, 8).map((h) => (
                          <span
                            key={h.host}
                            className="text-[11.5px]"
                            style={{
                              fontFamily: "var(--font-mono)",
                              color: "var(--ink)",
                              borderBottom: "1px solid var(--rule)",
                            }}
                          >
                            {h.host}
                            {h.n > 1 ? ` ×${h.n}` : ""}
                          </span>
                        ))}
                      </div>
                    )}
                    {writable && (
                      <button
                        onClick={() => keepNow({ ...d, stone: null })}
                        className="meta mt-2 underline"
                        style={{ color: "var(--faint)" }}
                      >
                        unbind
                      </button>
                    )}
                  </>
                ) : (
                  <p
                    className="hand mt-1.5 text-[13.5px] leading-[1.35]"
                    style={{ color: "var(--faint)" }}
                  >
                    {d.stone
                      ? `bound to ${d.stone}, which the garden does not have.`
                      : "bound to no stone. open one in the reader or the catalogue and press its provenance, and the garden says what flows into it."}
                  </p>
                )}
              </section>
            )}

            {/* the file */}
            {d && writable && (
              <section aria-label="The file">
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {d.slug && (
                    <button
                      onClick={() =>
                        sure === "file" ? remove() : setSure("file")
                      }
                      className="chip px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color:
                          sure === "file" ? "var(--accent)" : "var(--faint)",
                        borderColor:
                          sure === "file" ? "var(--accent)" : undefined,
                      }}
                    >
                      {sure === "file"
                        ? "yes, let go of the file"
                        : "let go of the file"}
                    </button>
                  )}
                </div>
                {d.slug && (
                  <p
                    className="meta mt-2"
                    style={{ color: "var(--faint)", textTransform: "none" }}
                  >
                    {d.slug}.md · written{" "}
                    {d.recorded ? formatDay(d.recorded) : "—"}
                  </p>
                )}
              </section>
            )}

            <p
              className="hand text-[13.5px] leading-[1.35]"
              style={{ color: "var(--faint)" }}
            >
              how it is read: nothing here says whether the claim is so. the
              chain is the hands you can name between the first saying and you,
              drawn solid where you read or saw and hollow where you did not;
              the wordings are compared as words, the census counts the usual
              ones, and the interests are what you wrote about each hand. the
              model is asked what to ask, never what to believe. a check settles
              what it settles and nothing more.
              {payload?.dir ? ` files at ${shortHome(payload.dir)}.` : ""}
            </p>
            <p
              className="meta"
              style={{ color: "var(--faint)", textTransform: "none" }}
            >
              / find · n new · h a hand · esc
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Chip({
  on,
  onClick,
  children,
  disabled,
  color,
  title,
}: {
  on?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  color?: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="chip p-seg relative px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase disabled:opacity-50"
      style={{
        fontFamily: "var(--font-mono)",
        color: on ? (color ?? "var(--ink)") : "var(--faint)",
        borderColor: on && color ? color : undefined,
      }}
    >
      {children}
    </button>
  );
}
