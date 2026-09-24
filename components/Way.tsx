"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Domain } from "@/lib/chronology";
import {
  formatDay,
  timeOf,
  validDay,
  yearsWords,
  YEAR_MS,
} from "@/lib/chronology";
import {
  STATUS_LABEL,
  adopt,
  differs,
  emptyWay,
  lookingAhead,
  memoir,
  ordered,
  readings,
  titleOf,
  uid,
  type Change,
  type Obstacle,
  type Proposal,
  type Status,
  type Step,
  type Way as WayFile,
} from "@/lib/way";
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
const LY = 92;

type Payload = {
  ways: WayFile[];
  writable: boolean;
  dir: string | null;
  model: string | null;
};
type Mark = { s: Step; x: number; y: number };

const todayStr = () => new Date().toISOString().slice(0, 10);
const short = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1)}…` : s;
const shortHome = (p: string) => p.replace(/^\/Users\/[^/]+/, "~");
const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

/**
 * The way. Two texts in the reader's own words — where they are, and where
 * they mean to be, written as if it is already so — with the way between
 * them drawn as a line from now to then: the first moves below it, what had
 * to be true right before above it, what stands in the way underneath. A
 * model on this machine can propose the way; every proposal stays hollow
 * until the reader keeps it. Standing at the then, the sheet turns into the
 * memoir: it is so, and this is what had to be true. One file per way.
 */
export default function Way() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [ways, setWays] = useState<WayFile[]>([]);
  const [lanes, setLanes] = useState<Domain[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState<WayFile | null>(null);
  const [fresh, setFresh] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [stand, setStand] = useState(false);
  const [asking, setAsking] = useState<"structure" | "colour" | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [query, setQuery] = useState("");
  const [cap, setCap] = useState<string | null>(null);
  const [sure, setSure] = useState(false);
  const [kept, setKept] = useState<"idle" | "saving" | "kept" | "error">(
    "idle",
  );
  const [theme, setTheme] = useTheme();

  const search = useRef<HTMLInputElement>(null);
  const capTimer = useRef<number | null>(null);
  const keptTimer = useRef<number | null>(null);
  const saveTimer = useRef<number | null>(null);
  const lastSaved = useRef<string>("");
  const draftRef = useRef<WayFile | null>(null);
  draftRef.current = draft;

  const today = todayStr();
  const writable = payload?.writable === true;
  const specimen = payload !== null && !payload.writable;

  // ── data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/way", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Payload | null) => {
        if (!p) return;
        setPayload(p);
        setWays(p.ways);
        const asked = new URLSearchParams(window.location.search).get("id");
        const first =
          (asked && p.ways.find((w) => w.slug === asked)) || p.ways[0];
        if (first) {
          setSlug(first.slug);
          setDraft(first);
          lastSaved.current = JSON.stringify(first);
        } else if (p.writable) {
          setDraft(emptyWay(todayStr()));
          setFresh(true);
        }
      });
    fetch("/api/chronology", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((c: { life?: { domains?: Domain[] } } | null) => {
        if (c?.life?.domains) setLanes(c.life.domains);
      });
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set("id", slug);
    else url.searchParams.delete("id");
    window.history.replaceState(null, "", url);
  }, [slug]);

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

  const put = useCallback(
    async (w: WayFile, isFresh: boolean): Promise<WayFile | null> => {
      if (!writable) return null;
      if (!w.thenText.trim() && !w.nowText.trim()) return null;
      setKept("saving");
      const r = await fetch("/api/way", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ way: w, fresh: isFresh }),
      }).catch(() => null);
      if (!r || !r.ok) {
        const j = r ? await r.json().catch(() => null) : null;
        settleKept("error");
        say(j?.error ? String(j.error).replace(/^way: /, "") : "not kept.");
        return null;
      }
      const k: WayFile = await r.json();
      lastSaved.current = JSON.stringify(k);
      setWays((ws) =>
        ws.some((x) => x.slug === k.slug)
          ? ws.map((x) => (x.slug === k.slug ? k : x))
          : [k, ...ws],
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
    },
    [writable, settleKept, say],
  );

  // the texts keep themselves a moment after the typing stops
  useEffect(() => {
    if (!draft || !writable) return;
    if (JSON.stringify(draft) === lastSaved.current) return;
    if (!draft.thenText.trim() && !draft.nowText.trim()) return;
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
    (next: WayFile) => {
      setDraft(next);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      put(next, !next.slug);
    },
    [put],
  );

  const open = useCallback((w: WayFile) => {
    setSlug(w.slug);
    setDraft(w);
    setFresh(false);
    setSelected(null);
    setStand(false);
    setSure(false);
    lastSaved.current = JSON.stringify(w);
  }, []);

  const begin = useCallback(() => {
    if (!writable) return;
    setSlug(null);
    setDraft(emptyWay(todayStr()));
    setFresh(true);
    setSelected(null);
    setStand(false);
    lastSaved.current = "";
  }, [writable]);

  const remove = useCallback(async () => {
    if (!draft?.slug || !writable) return;
    const r = await fetch(`/api/way?slug=${encodeURIComponent(draft.slug)}`, {
      method: "DELETE",
    }).catch(() => null);
    if (!r || !r.ok) {
      settleKept("error");
      return;
    }
    const rest = ways.filter((w) => w.slug !== draft.slug);
    setWays(rest);
    setSure(false);
    say("let go of the file.");
    if (rest[0]) open(rest[0]);
    else begin();
  }, [draft, writable, ways, settleKept, say, open, begin]);

  const ask = useCallback(
    async (what: "structure" | "colour") => {
      const d = draftRef.current;
      if (!d || !writable || asking) return;
      if (!d.thenText.trim() && !d.nowText.trim()) {
        say("say where you are, or where you mean to be, first.");
        return;
      }
      if (what === "colour" && !d.thenText.trim()) {
        say("there is no then to say again.");
        return;
      }
      setAsking(what);
      const r = await fetch("/api/way", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          way: d,
          ask: what,
          lanes: lanes.map((l) => ({ id: l.id, label: l.label })),
        }),
      }).catch(() => null);
      setAsking(null);
      if (!r || !r.ok) {
        const j = r ? await r.json().catch(() => null) : null;
        say(j?.error ? String(j.error) : "the model did not answer.");
        return;
      }
      const j = (await r.json()) as {
        proposal?: Proposal;
        colour?: string;
        ms?: number;
      };
      const now = draftRef.current ?? d;
      if (what === "colour") {
        keepNow({ ...now, colour: j.colour ?? "" });
        say(
          `the then, said again — ${Math.round((j.ms ?? 0) / 1000)}s on this machine.`,
        );
        return;
      }
      if (!j.proposal) return;
      const next = adopt(now, j.proposal);
      const added =
        next.steps.length -
        now.steps.length +
        (next.obstacles.length - now.obstacles.length) +
        (next.changes.length - now.changes.length);
      keepNow(next);
      say(
        added
          ? `${added} proposed — hollow until you keep them.`
          : "nothing new to propose.",
      );
    },
    [writable, asking, lanes, say, keepNow],
  );

  // ── the way's pieces ────────────────────────────────────────────────────
  const setStep = useCallback(
    (id: string, patch: Partial<Step> | null) => {
      setDraft((d) =>
        d
          ? {
              ...d,
              steps: patch
                ? d.steps.map((s) => (s.id === id ? { ...s, ...patch } : s))
                : d.steps.filter((s) => s.id !== id),
            }
          : d,
      );
      if (!patch) setSelected((sel) => (sel === id ? null : sel));
    },
    [],
  );
  const setObstacle = useCallback(
    (id: string, patch: Partial<Obstacle> | null) =>
      setDraft((d) =>
        d
          ? {
              ...d,
              obstacles: patch
                ? d.obstacles.map((o) => (o.id === id ? { ...o, ...patch } : o))
                : d.obstacles.filter((o) => o.id !== id),
            }
          : d,
      ),
    [],
  );
  const setChange = useCallback(
    (id: string, patch: Partial<Change> | null) =>
      setDraft((d) =>
        d
          ? {
              ...d,
              changes: patch
                ? d.changes.map((c) => (c.id === id ? { ...c, ...patch } : c))
                : d.changes.filter((c) => c.id !== id),
            }
          : d,
      ),
    [],
  );

  const keepAll = useCallback(
    (yes: boolean) =>
      setDraft((d) =>
        d
          ? {
              ...d,
              steps: yes
                ? d.steps.map((s) => ({
                    ...s,
                    kept: true,
                    by: s.kept ? s.by : s.by,
                  }))
                : d.steps.filter((s) => s.kept),
              obstacles: yes
                ? d.obstacles.map((o) => ({ ...o, kept: true }))
                : d.obstacles.filter((o) => o.kept),
              changes: yes
                ? d.changes.map((c) => ({ ...c, kept: true }))
                : d.changes.filter((c) => c.kept),
            }
          : d,
      ),
    [],
  );

  const addStep = useCallback((dir: Step["dir"]) => {
    const id = uid();
    setDraft((d) =>
      d
        ? {
            ...d,
            steps: [
              ...d.steps,
              {
                id,
                text: "",
                day: null,
                dir,
                by: "you",
                kept: true,
                entry: null,
              },
            ],
          }
        : d,
    );
    setSelected(id);
  }, []);

  /** Set a kept, dated step down on the chronology as an expected entry, and remember which. */
  const setDown = useCallback(
    async (s: Step) => {
      const d = draftRef.current;
      if (!d || !writable || !s.day || !validDay(s.day) || !s.text.trim())
        return;
      const lane =
        lanes.find((l) => l.register === "outer")?.id ?? lanes[0]?.id ?? "work";
      const r = await fetch("/api/chronology", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entry: {
            title: s.text,
            day: s.day,
            lane,
            looms: 2,
            tags: ["way", d.slug].filter(Boolean),
            note: `On the way: ${titleOf(d)}`,
          },
          fresh: true,
        }),
      }).catch(() => null);
      if (!r || !r.ok) {
        say("the chronology did not take it.");
        return;
      }
      const e = (await r.json()) as { slug: string };
      keepNow({
        ...d,
        steps: d.steps.map((x) =>
          x.id === s.id ? { ...x, entry: e.slug } : x,
        ),
      });
      say("set down on the chronology.");
    },
    [writable, lanes, keepNow, say],
  );

  // ── the drawing ─────────────────────────────────────────────────────────
  const thenMs =
    draft?.then && validDay(draft.then) ? timeOf(draft.then, "mid") : null;
  const nowMs = timeOf(today, "mid");
  const marks: Mark[] = useMemo(() => {
    if (!draft) return [];
    const steps = ordered(draft.steps);
    const xs = new Array<number | null>(steps.length).fill(null);
    if (thenMs && thenMs > nowMs)
      steps.forEach((s, i) => {
        if (s.day && validDay(s.day))
          xs[i] =
            X0 +
            (X1 - X0) *
              clamp((timeOf(s.day, "mid") - nowMs) / (thenMs - nowMs), 0, 1);
      });
    // undated steps sit evenly between the dated ones around them
    let i = 0;
    while (i < steps.length) {
      if (xs[i] !== null) {
        i++;
        continue;
      }
      let j = i;
      while (j < steps.length && xs[j] === null) j++;
      const left = i === 0 ? X0 : xs[i - 1]!;
      const right = j >= steps.length ? X1 : xs[j]!;
      const n = j - i;
      for (let k = 0; k < n; k++)
        xs[i + k] = left + ((right - left) * (k + 1)) / (n + 1);
      i = j;
    }
    return steps.map((s, k) => ({
      s,
      x: xs[k]!,
      y: s.dir === "back" ? LY - 26 : LY + 26,
    }));
  }, [draft, thenMs, nowMs]);

  const line = useMemo(() => {
    const r = rand(seedOf("way-line"));
    const d = stroke([X0, LY], [X1, LY], r, 1.6, 4);
    return { d, ink: ribbon(d, 2.2, seedOf("way-ink")) };
  }, []);

  const labels = useMemo(() => {
    const taken: [number, number, number, number][] = [];
    const hit = (b: [number, number, number, number]) =>
      taken.some(
        (t) =>
          b[0] < t[0] + t[2] &&
          b[0] + b[2] > t[0] &&
          b[1] < t[1] + t[3] &&
          b[1] + b[3] > t[1],
      );
    const out: { id: string; x: number; y: number; text: string }[] = [];
    const order = [...marks].sort(
      (a, b) =>
        Number(b.s.id === selected) - Number(a.s.id === selected) ||
        Number(b.s.kept) - Number(a.s.kept),
    );
    for (const m of order) {
      const must = m.s.id === selected;
      for (const text of must
        ? [short(m.s.text, 70)]
        : [short(m.s.text, 44), short(m.s.text, 22)]) {
        const w = text.length * 5.6 + 6;
        const ys =
          m.s.dir === "back" ? [m.y - 14, m.y - 26] : [m.y + 19, m.y + 31];
        let placed = false;
        for (const ly of ys) {
          const bx = clamp(m.x - w / 2, 8, W - w - 8);
          const box: [number, number, number, number] = [bx, ly - 9, w, 12];
          if (!must && hit(box)) continue;
          taken.push(box);
          out.push({ id: m.s.id, x: bx + w / 2, y: ly, text });
          placed = true;
          break;
        }
        if (placed) break;
      }
    }
    return out;
  }, [marks, selected]);

  const words = useMemo(
    () => (draft ? readings(draft, today) : []),
    [draft, today],
  );
  const diff = useMemo(
    () =>
      draft ? differs(draft.thenText, draft.nowText) : { only: [], gone: [] },
    [draft],
  );
  const ahead = useMemo(
    () => (draft ? lookingAhead(draft.thenText) : { n: 0, of: 0, words: [] }),
    [draft],
  );
  const tale = useMemo(() => (draft ? memoir(draft) : null), [draft]);
  const proposed = useMemo(
    () =>
      draft
        ? {
            steps: draft.steps.filter((s) => !s.kept),
            obstacles: draft.obstacles.filter((o) => !o.kept),
            changes: draft.changes.filter((c) => !c.kept),
          }
        : { steps: [], obstacles: [], changes: [] },
    [draft],
  );
  const nProposed =
    proposed.steps.length + proposed.obstacles.length + proposed.changes.length;
  const chosen = draft?.steps.find((s) => s.id === selected) ?? null;
  const laneLabel = (id: string | null) =>
    lanes.find((l) => l.id === id)?.label ?? id ?? "";
  const laneColor = (id: string | null) => {
    const i = lanes.findIndex((l) => l.id === id);
    return i >= 0 ? `var(--value-${i % 6})` : "var(--faint)";
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return ways
      .filter(
        (w) =>
          titleOf(w).toLowerCase().includes(q) ||
          w.thenText.toLowerCase().includes(q) ||
          w.nowText.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [query, ways]);

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
        setSure(false);
      } else if (e.key === "s") setStand((v) => !v);
      else if (e.key === "n") begin();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [begin]);

  const d = draft;
  const thenIn = thenMs ? (thenMs - nowMs) / YEAR_MS : null;

  return (
    <main className="way scroll-thin relative h-dvh w-full overflow-y-auto">
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
                way
              </div>
              <p
                className="hand mt-1 max-w-[31rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                Say where you are. Say where you mean to be — as it is, not as
                it will be. A model on this machine can propose the way between;
                you keep what is yours. Then stand at the then and look back.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/way" />
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
            Specimen A&rsquo;s way — the year away a synthetic life keeps
            postponing. Fiction, to show the instrument; read-only, and no model
            on a deployed garden.
          </p>
        )}

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
          {/* ── the sheet ─────────────────────────────────────────────── */}
          <section
            className="panel sketched rise relative self-start p-2 sm:p-3"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The way"
          >
            <Sketch seed="way-sheet" draw />

            <div className="relative z-[2] flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span
                  className="hand text-[17px] leading-none"
                  style={{ color: "var(--ink)" }}
                >
                  {d ? titleOf(d) : "a way"}
                </span>
                <span className="meta" style={{ color: "var(--muted)" }}>
                  {d
                    ? `· ${d.steps.filter((s) => s.kept).length} steps yours${nProposed ? ` · ${nProposed} proposed` : ""}${d.then ? ` · then ${formatDay(d.then)}` : ""}`
                    : ""}
                </span>
                {d && d.status !== "open" && (
                  <span className="meta" style={{ color: "var(--accent)" }}>
                    · {STATUS_LABEL[d.status]}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip
                  on={stand}
                  onClick={() => setStand((v) => !v)}
                  color="var(--accent)"
                  title="s"
                >
                  {stand ? "back to the way" : "stand at the then"}
                </Chip>
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
            </div>

            {cap && (
              <div
                className="hand fade pointer-events-none absolute top-9 right-4 z-[4] text-[15px]"
                style={{ color: "var(--accent)" }}
              >
                — {cap}
              </div>
            )}

            {d && stand && tale ? (
              /* ── standing at the then ───────────────────────────────── */
              <div className="w-memoir relative z-[2] px-3 pt-6 pb-4 sm:px-8">
                <div className="meta" style={{ color: "var(--accent)" }}>
                  looking back
                </div>
                <h2
                  className="display mt-1 text-[34px] leading-[1.05]"
                  style={{ color: "var(--ink)" }}
                >
                  {tale.dateline}
                </h2>
                <p
                  className="hand mt-5 max-w-[44rem] text-[19px] leading-[1.4]"
                  style={{ color: "var(--ink)" }}
                >
                  {d.colour.trim() || d.thenText.trim() || "…"}
                </p>
                {d.colour.trim() && (
                  <p
                    className="meta mt-1"
                    style={{ color: "var(--faint)", textTransform: "none" }}
                  >
                    the then, said again by the model — your own words are below
                  </p>
                )}
                {d.colour.trim() && (
                  <p
                    className="mt-2 max-w-[44rem] text-[13px] leading-[1.55]"
                    style={{ color: "var(--muted)" }}
                  >
                    {d.thenText}
                  </p>
                )}
                {tale.changes.length > 0 && (
                  <div className="mt-6">
                    <div className="meta" style={{ color: "var(--faint)" }}>
                      what is different now
                    </div>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {tale.changes.map((c) => (
                        <li
                          key={c.id}
                          className="chip px-2.5 py-1 text-[13px]"
                          style={{
                            borderColor: laneColor(c.lane),
                            color: "var(--ink)",
                            fontFamily: "var(--font-hand)",
                          }}
                        >
                          {c.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div>
                    <div className="meta" style={{ color: "var(--faint)" }}>
                      what had to be true, latest first
                    </div>
                    {tale.hadToBe.length ? (
                      <ol className="mt-2 flex flex-col gap-2">
                        {tale.hadToBe.map((s) => (
                          <li key={s.id} className="flex items-baseline gap-2">
                            <span
                              className="meta shrink-0"
                              style={{
                                color: "var(--accent)",
                                textTransform: "none",
                                minWidth: "4.6rem",
                              }}
                            >
                              {s.day && validDay(s.day)
                                ? formatDay(s.day)
                                : "—"}
                            </span>
                            <span
                              className="hand text-[15.5px] leading-[1.3]"
                              style={{ color: "var(--ink)" }}
                            >
                              {s.text}
                            </span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p
                        className="hand mt-2 text-[14px]"
                        style={{ color: "var(--faint)" }}
                      >
                        nothing kept yet — ask for the way, or write a step.
                      </p>
                    )}
                    {tale.first && (
                      <p
                        className="hand mt-4 text-[15px] leading-[1.35]"
                        style={{ color: "var(--muted)" }}
                      >
                        the first thing I did
                        {tale.first.day && validDay(tale.first.day)
                          ? `, ${formatDay(tale.first.day)}`
                          : ""}
                        :{" "}
                        <span style={{ color: "var(--ink)" }}>
                          {tale.first.text}
                        </span>
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="meta" style={{ color: "var(--faint)" }}>
                      what nearly stopped it, and what I did
                    </div>
                    {tale.nearly.length ? (
                      <ul className="mt-2 flex flex-col gap-2">
                        {tale.nearly.map((o) => (
                          <li key={o.id}>
                            <div
                              className="hand text-[15.5px] leading-[1.3]"
                              style={{ color: "var(--ink)" }}
                            >
                              {o.text}
                            </div>
                            {o.plan && (
                              <div
                                className="hand text-[14px] leading-[1.3]"
                                style={{ color: "var(--accent)" }}
                              >
                                {o.plan}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p
                        className="hand mt-2 text-[14px]"
                        style={{ color: "var(--faint)" }}
                      >
                        nothing named in the way.
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-1.5">
                  <Link
                    href="/chronology"
                    className="chip px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted)",
                    }}
                  >
                    the line
                  </Link>
                  <span
                    className="hand text-[13px]"
                    style={{ color: "var(--faint)" }}
                  >
                    stay a minute, then go back to the way — the steps are the
                    point.
                  </span>
                </div>
              </div>
            ) : (
              <>
                {/* ── the line from now to then ─────────────────────────── */}
                <svg
                  viewBox={`0 0 ${W} ${H}`}
                  className="w-sheet relative z-[2] block h-auto w-full"
                  role="img"
                  aria-label="The way from now to then"
                >
                  <defs>
                    <pattern
                      id="w-hatch"
                      patternUnits="userSpaceOnUse"
                      width="6"
                      height="6"
                      patternTransform="rotate(-45)"
                    >
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="6"
                        stroke="var(--ink)"
                        strokeWidth="0.8"
                        strokeOpacity="0.35"
                      />
                    </pattern>
                    <mask
                      id="w-line-mask"
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
                    x={X0 - 10}
                    y={LY - 30}
                    textAnchor="end"
                    fontSize={8.5}
                    fill="var(--faint)"
                    style={{
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    looking back
                  </text>
                  <text
                    x={X0 - 10}
                    y={LY + 30}
                    textAnchor="end"
                    fontSize={8.5}
                    fill="var(--faint)"
                    style={{
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    first moves
                  </text>
                  <path
                    d={line.ink}
                    fill="var(--ink)"
                    mask="url(#w-line-mask)"
                  />
                  {/* now */}
                  <path
                    d={roughEllipse(14, 14, seedOf("way-now"), {
                      pad: 0,
                      steps: 12,
                    })}
                    transform={`translate(${X0 - 7} ${LY - 7})`}
                    fill="var(--ink)"
                    fillOpacity={0.9}
                    stroke="var(--ink)"
                    strokeWidth={0.8}
                  />
                  <text
                    x={X0}
                    y={LY + 4}
                    textAnchor="middle"
                    fontSize={7.5}
                    fill="var(--surface)"
                    style={{
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    now
                  </text>
                  <text
                    x={X0}
                    y={LY + 52}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--muted)"
                    style={{ fontFamily: "var(--font-hand)" }}
                  >
                    {formatDay(today)}
                  </text>
                  {/* then */}
                  <path
                    d={roughEllipse(18, 18, seedOf("way-then"), {
                      pad: 0,
                      steps: 14,
                      wobble: 1.4,
                    })}
                    transform={`translate(${X1 - 9} ${LY - 9})`}
                    fill="var(--accent)"
                    fillOpacity={0.15}
                    stroke="var(--accent)"
                    strokeWidth={1.4}
                  />
                  <path
                    d={roughEllipse(26, 26, seedOf("way-then-ring"), {
                      pad: 0,
                      steps: 14,
                      wobble: 1.6,
                    })}
                    transform={`translate(${X1 - 13} ${LY - 13})`}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={0.9}
                    strokeOpacity={0.6}
                  />
                  <text
                    x={X1}
                    y={LY + 52}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--accent)"
                    style={{ fontFamily: "var(--font-hand)" }}
                  >
                    then{d?.then ? ` · ${formatDay(d.then)}` : ""}
                    {thenIn !== null && thenIn > 0
                      ? ` · ${yearsWords(thenIn)}`
                      : ""}
                  </text>
                  {/* the steps */}
                  {marks.map((m, i) => {
                    const on = m.s.id === selected;
                    const r = 6;
                    return (
                      <g
                        key={m.s.id}
                        className="w-mark"
                        style={{ cursor: "pointer", ["--i" as string]: i }}
                        onClick={() => {
                          setSelected(on ? null : m.s.id);
                          setSure(false);
                        }}
                      >
                        <line
                          x1={m.x}
                          x2={m.x}
                          y1={LY}
                          y2={m.y}
                          stroke={m.s.kept ? "var(--ink)" : "var(--faint)"}
                          strokeWidth={0.8}
                          strokeDasharray={m.s.kept ? undefined : "2 2"}
                          strokeOpacity={0.6}
                        />
                        <path
                          d={roughEllipse(r * 2, r * 2, seedOf(m.s.id), {
                            pad: 0,
                            steps: 12,
                            wobble: 0.9,
                          })}
                          transform={`translate(${m.x - r} ${m.y - r})`}
                          fill={
                            m.s.kept
                              ? m.s.dir === "back"
                                ? "var(--accent)"
                                : "var(--ink)"
                              : "var(--surface)"
                          }
                          fillOpacity={m.s.kept ? 0.85 : 1}
                          stroke={
                            on
                              ? "var(--accent)"
                              : m.s.kept
                                ? "var(--ink)"
                                : "var(--faint)"
                          }
                          strokeWidth={on ? 1.6 : 0.9}
                          strokeDasharray={m.s.kept ? undefined : "2.5 2"}
                        />
                        {on && (
                          <path
                            d={roughEllipse(
                              r * 2 + 10,
                              r * 2 + 10,
                              seedOf(`${m.s.id}-ring`),
                              { pad: 0, steps: 14, wobble: 1.2 },
                            )}
                            transform={`translate(${m.x - r - 5} ${m.y - r - 5})`}
                            fill="none"
                            stroke="var(--accent)"
                            strokeWidth={1.2}
                          />
                        )}
                        {m.s.entry && (
                          <circle
                            cx={m.x + r + 2}
                            cy={m.y - r - 2}
                            r={1.8}
                            fill="var(--accent)"
                          />
                        )}
                        <rect
                          x={m.x - 12}
                          y={m.y - 12}
                          width={24}
                          height={24}
                          fill="transparent"
                        />
                      </g>
                    );
                  })}
                  {labels.map((l) => {
                    const on = l.id === selected;
                    return (
                      <text
                        key={l.id}
                        x={l.x}
                        y={l.y}
                        textAnchor="middle"
                        fontSize={on ? 12.5 : 11}
                        fill={on ? "var(--ink)" : "var(--muted)"}
                        stroke="var(--surface)"
                        strokeWidth={3}
                        strokeOpacity={0.85}
                        paintOrder="stroke"
                        style={{ fontFamily: "var(--font-hand)" }}
                      >
                        {l.text}
                      </text>
                    );
                  })}
                  {/* what stands in the way */}
                  {d && d.obstacles.length > 0 && (
                    <g>
                      <text
                        x={X0 - 10}
                        y={H - 14}
                        textAnchor="end"
                        fontSize={8.5}
                        fill="var(--faint)"
                        style={{
                          fontFamily: "var(--font-mono)",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                        }}
                      >
                        in the way
                      </text>
                      {d.obstacles.slice(0, 8).map((o, i) => {
                        const x = X0 + 20 + i * 108;
                        return (
                          <g key={o.id}>
                            <rect
                              x={x}
                              y={H - 26}
                              width={16}
                              height={12}
                              fill={o.kept ? "url(#w-hatch)" : "none"}
                            />
                            <path
                              d={roughRect(16, 12, seedOf(o.id), {
                                wobble: 0.8,
                                overshoot: 1.5,
                              })}
                              transform={`translate(${x} ${H - 26})`}
                              fill="none"
                              stroke={o.kept ? "var(--ink)" : "var(--faint)"}
                              strokeWidth={0.9}
                              strokeDasharray={o.kept ? undefined : "2.5 2"}
                            />
                            <text
                              x={x + 21}
                              y={H - 16}
                              fontSize={10.5}
                              fill={o.kept ? "var(--muted)" : "var(--faint)"}
                              style={{ fontFamily: "var(--font-hand)" }}
                            >
                              {short(o.text, 16)}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  )}
                  {d && d.steps.length === 0 && (
                    <text
                      x={(X0 + X1) / 2}
                      y={LY - 44}
                      textAnchor="middle"
                      fontSize={14}
                      fill="var(--faint)"
                      style={{ fontFamily: "var(--font-hand)" }}
                    >
                      {writable
                        ? "write the two texts, then ask for the way — or add a step yourself"
                        : "nothing on the way"}
                    </text>
                  )}
                </svg>

                {/* ── the two texts ──────────────────────────────────────── */}
                {d && (
                  <div className="relative z-[2] mt-2 grid gap-3 px-1 pb-2 sm:grid-cols-2">
                    <div
                      className="panel sketched relative p-3"
                      style={{ borderRadius: 3 }}
                    >
                      <Sketch seed={`now-${d.slug || "fresh"}`} draw />
                      <div className="meta" style={{ color: "var(--muted)" }}>
                        now · where you are
                      </div>
                      <textarea
                        value={d.nowText}
                        onChange={(e) =>
                          setDraft({ ...d, nowText: e.target.value })
                        }
                        readOnly={!writable}
                        rows={7}
                        maxLength={20_000}
                        placeholder="honestly, in your own words. the place, the work, the body, the money, the people, the mind."
                        className="search hand mt-2 w-full resize-y px-3 py-2 text-[15px] leading-[1.35]"
                      />
                      <Words label="speaks of" list={diff.gone} />
                    </div>
                    <div
                      className="panel sketched relative p-3"
                      style={{ borderRadius: 3 }}
                    >
                      <Sketch
                        seed={`then-${d.slug || "fresh"}`}
                        color="var(--accent)"
                        draw
                      />
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div
                          className="meta"
                          style={{ color: "var(--accent)" }}
                        >
                          then · as it is
                        </div>
                        <label
                          className="meta flex items-baseline gap-1.5"
                          style={{ color: "var(--faint)" }}
                        >
                          set in
                          <input
                            value={d.then ?? ""}
                            onChange={(e) =>
                              setDraft({
                                ...d,
                                then: e.target.value.trim() || null,
                              })
                            }
                            readOnly={!writable}
                            placeholder="2027-09"
                            className="search w-[6.5rem] px-2 py-0.5 text-[11px]"
                            style={{
                              fontFamily: "var(--font-mono)",
                              borderColor:
                                !d.then || validDay(d.then)
                                  ? undefined
                                  : "var(--accent)",
                            }}
                          />
                        </label>
                      </div>
                      <textarea
                        value={d.thenText}
                        onChange={(e) =>
                          setDraft({ ...d, thenText: e.target.value })
                        }
                        readOnly={!writable}
                        rows={7}
                        maxLength={20_000}
                        placeholder="present tense. it is so. where you wake, what is on the desk, who is there. not 'I will' — 'I do'."
                        className="search hand mt-2 w-full resize-y px-3 py-2 text-[15px] leading-[1.35]"
                      />
                      <Words label="speaks of" list={diff.only} />
                      {ahead.n > 0 && (
                        <p
                          className="hand mt-1.5 text-[13px]"
                          style={{ color: "var(--faint)" }}
                        >
                          {ahead.n} of {ahead.of} sentences still look ahead (
                          {ahead.words.join(", ")}) — say them as they are.
                        </p>
                      )}
                      {d.colour.trim() && (
                        <div
                          className="mt-2 border-t pt-2"
                          style={{ borderColor: "var(--rule)" }}
                        >
                          <div
                            className="meta"
                            style={{ color: "var(--faint)" }}
                          >
                            the then, said again by the model
                          </div>
                          <p
                            className="hand mt-1 text-[14px] leading-[1.35]"
                            style={{ color: "var(--ink)" }}
                          >
                            {d.colour}
                          </p>
                          {writable && (
                            <div className="mt-1.5 flex gap-1.5">
                              <Chip
                                onClick={() =>
                                  keepNow({
                                    ...d,
                                    thenText: d.colour,
                                    colour: "",
                                  })
                                }
                                on
                                color="var(--accent)"
                              >
                                take it as mine
                              </Chip>
                              <Chip
                                onClick={() => keepNow({ ...d, colour: "" })}
                              >
                                drop it
                              </Chip>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
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
                  htmlFor="way-search"
                  style={{ color: "var(--faint)" }}
                >
                  the ways · {ways.length}
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
                id="way-search"
                ref={search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="a way  /"
                className="search mt-2 w-full px-3 py-2 text-[13px]"
                autoComplete="off"
              />
              {(results.length > 0 ||
                (query.trim().length < 2 && ways.length > 1)) && (
                <ul className="mt-2 flex flex-col">
                  {(results.length ? results : ways.slice(0, 6)).map((w) => (
                    <li key={w.slug}>
                      <button
                        onClick={() => open(w)}
                        className="w-row flex w-full items-baseline gap-2 rounded px-1.5 py-0.5 text-left"
                        style={{
                          background:
                            w.slug === slug
                              ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                              : undefined,
                        }}
                      >
                        <span
                          className="hand min-w-0 flex-1 truncate text-[14px]"
                          style={{ color: "var(--ink)" }}
                        >
                          {titleOf(w)}
                        </span>
                        <span
                          className="meta shrink-0"
                          style={{
                            color: "var(--faint)",
                            textTransform: "none",
                          }}
                        >
                          {w.then ? formatDay(w.then) : STATUS_LABEL[w.status]}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ask the model on this machine */}
            {d && (
              <section
                className="panel sketched relative p-4"
                style={{ borderRadius: 3 }}
                aria-label="Ask"
              >
                <Sketch seed="way-ask" draw />
                <div className="meta" style={{ color: "var(--faint)" }}>
                  a model on this machine
                  {payload?.model ? ` · ${payload.model}` : ""}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Chip
                    onClick={() => ask("structure")}
                    disabled={!writable || asking !== null}
                    on={writable}
                    color="var(--accent)"
                  >
                    {asking === "structure"
                      ? `thinking · ${elapsed}s`
                      : "ask for the way"}
                  </Chip>
                  <Chip
                    onClick={() => ask("colour")}
                    disabled={
                      !writable || asking !== null || !d.thenText.trim()
                    }
                    on={writable && !!d.thenText.trim()}
                  >
                    {asking === "colour"
                      ? `thinking · ${elapsed}s`
                      : "say the then again"}
                  </Chip>
                </div>
                <p
                  className="hand mt-2 text-[13px] leading-[1.35]"
                  style={{ color: "var(--faint)" }}
                >
                  {writable
                    ? "it proposes what changes, what had to be true right before, the first moves, and what stands in the way — hollow until you keep them. nothing leaves this machine."
                    : "no model on a deployed garden."}
                </p>
                {nProposed > 0 && writable && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="meta" style={{ color: "var(--muted)" }}>
                      {nProposed} proposed
                    </span>
                    <Chip
                      onClick={() => keepNow({ ...d, ...keepAllOf(d, true) })}
                      on
                      color="var(--accent)"
                    >
                      keep all
                    </Chip>
                    <Chip
                      onClick={() => keepNow({ ...d, ...keepAllOf(d, false) })}
                    >
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
              <Sketch seed="way-reading" draw />
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

            {/* the step on the desk */}
            {d && chosen && (
              <section
                className="panel sketched relative p-4"
                style={{ borderRadius: 3 }}
                aria-label="The step"
              >
                <Sketch seed={`step-${chosen.id}`} color="var(--accent)" draw />
                <div className="flex items-baseline justify-between">
                  <div
                    className="meta"
                    style={{
                      color:
                        chosen.dir === "back" ? "var(--accent)" : "var(--ink)",
                    }}
                  >
                    {chosen.dir === "back"
                      ? "had to be true before"
                      : "a first move"}
                    <span style={{ color: "var(--faint)" }}>
                      {" "}
                      · {chosen.kept ? "yours" : "proposed"}
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
                <textarea
                  value={chosen.text}
                  onChange={(e) =>
                    setStep(chosen.id, { text: e.target.value, by: "you" })
                  }
                  readOnly={!writable}
                  rows={2}
                  maxLength={300}
                  className="search hand mt-2 w-full resize-none px-3 py-2 text-[15px] leading-[1.3]"
                  placeholder={
                    chosen.dir === "back"
                      ? "what had to be true right before?"
                      : "the next concrete move"
                  }
                  autoFocus={!chosen.text}
                />
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <input
                    value={chosen.day ?? ""}
                    onChange={(e) =>
                      setStep(chosen.id, { day: e.target.value.trim() || null })
                    }
                    readOnly={!writable}
                    placeholder="2027-03"
                    className="search w-[6.5rem] px-2 py-1 text-[11.5px]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      borderColor:
                        !chosen.day || validDay(chosen.day)
                          ? undefined
                          : "var(--accent)",
                    }}
                  />
                  <Chip
                    onClick={() =>
                      writable &&
                      setStep(chosen.id, {
                        dir: chosen.dir === "back" ? "forward" : "back",
                      })
                    }
                    disabled={!writable}
                  >
                    {chosen.dir === "back" ? "looking back" : "first move"}
                  </Chip>
                  {writable && (
                    <Chip
                      onClick={() =>
                        keepNow({
                          ...d,
                          steps: d.steps.map((s) =>
                            s.id === chosen.id ? { ...s, kept: !s.kept } : s,
                          ),
                        })
                      }
                      on={!chosen.kept}
                      color="var(--accent)"
                    >
                      {chosen.kept ? "unkeep" : "keep it"}
                    </Chip>
                  )}
                  {writable &&
                    chosen.kept &&
                    chosen.day &&
                    validDay(chosen.day) &&
                    !chosen.entry && (
                      <Chip onClick={() => setDown(chosen)}>
                        set down on the line
                      </Chip>
                    )}
                  {chosen.entry && (
                    <Link
                      href={`/chronology?id=${encodeURIComponent(chosen.entry)}`}
                      className="chip px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--accent)",
                      }}
                    >
                      on the line
                    </Link>
                  )}
                  {writable && (
                    <button
                      onClick={() =>
                        keepNow({
                          ...d,
                          steps: d.steps.filter((s) => s.id !== chosen.id),
                        })
                      }
                      className="meta px-1"
                      style={{ color: "var(--faint)" }}
                    >
                      take it back
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* the way, listed */}
            {d &&
              (d.steps.length > 0 ||
                d.obstacles.length > 0 ||
                d.changes.length > 0 ||
                writable) && (
                <section aria-label="The way, listed">
                  <div
                    className="meta flex flex-wrap items-baseline gap-2"
                    style={{ color: "var(--faint)" }}
                  >
                    the way
                    {writable && (
                      <>
                        <button
                          onClick={() => addStep("forward")}
                          className="underline"
                          style={{ color: "var(--muted)" }}
                        >
                          + a first move
                        </button>
                        <button
                          onClick={() => addStep("back")}
                          className="underline"
                          style={{ color: "var(--muted)" }}
                        >
                          + what had to be true
                        </button>
                      </>
                    )}
                  </div>
                  <ul className="mt-1 flex flex-col">
                    {ordered(d.steps).map((s) => (
                      <li key={s.id}>
                        <button
                          onClick={() => {
                            setSelected(s.id === selected ? null : s.id);
                            setSure(false);
                          }}
                          className="w-row flex w-full items-baseline gap-2 rounded px-1.5 py-0.5 text-left"
                          style={{
                            background:
                              selected === s.id
                                ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                                : undefined,
                          }}
                        >
                          <span
                            aria-hidden
                            className="inline-block h-2 w-2 shrink-0 rounded-full"
                            style={{
                              background: s.kept
                                ? s.dir === "back"
                                  ? "var(--accent)"
                                  : "var(--ink)"
                                : "transparent",
                              border: `1px ${s.kept ? "solid" : "dashed"} ${s.dir === "back" ? "var(--accent)" : "var(--ink)"}`,
                              transform: "translateY(-1px)",
                            }}
                          />
                          <span
                            className="hand min-w-0 flex-1 truncate text-[14px] leading-[1.25]"
                            style={{
                              color: s.kept ? "var(--ink)" : "var(--muted)",
                            }}
                          >
                            {s.text || "…"}
                          </span>
                          <span
                            className="meta shrink-0"
                            style={{
                              color: "var(--faint)",
                              textTransform: "none",
                            }}
                          >
                            {s.day && validDay(s.day) ? formatDay(s.day) : ""}
                          </span>
                          {!s.kept && writable && (
                            <span
                              role="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                keepNow({
                                  ...d,
                                  steps: d.steps.map((x) =>
                                    x.id === s.id ? { ...x, kept: true } : x,
                                  ),
                                });
                              }}
                              className="meta shrink-0"
                              style={{ color: "var(--accent)" }}
                            >
                              keep
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>

                  {(d.obstacles.length > 0 || writable) && (
                    <div className="mt-3">
                      <div
                        className="meta flex items-baseline gap-2"
                        style={{ color: "var(--faint)" }}
                      >
                        in the way · when–then
                        {writable && (
                          <button
                            onClick={() =>
                              setDraft({
                                ...d,
                                obstacles: [
                                  ...d.obstacles,
                                  {
                                    id: uid(),
                                    text: "",
                                    plan: "",
                                    by: "you",
                                    kept: true,
                                  },
                                ],
                              })
                            }
                            className="underline"
                            style={{ color: "var(--muted)" }}
                          >
                            + name one
                          </button>
                        )}
                      </div>
                      <ul className="mt-1 flex flex-col gap-1.5">
                        {d.obstacles.map((o) => (
                          <li key={o.id} className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <input
                                value={o.text}
                                onChange={(e) =>
                                  setObstacle(o.id, {
                                    text: e.target.value,
                                    by: "you",
                                  })
                                }
                                readOnly={!writable}
                                placeholder="what stands in the way"
                                className="search hand min-w-0 flex-1 px-2 py-1 text-[14px]"
                                style={{
                                  color: o.kept ? "var(--ink)" : "var(--muted)",
                                  borderStyle: o.kept ? undefined : "dashed",
                                }}
                              />
                              {writable && (
                                <>
                                  <Chip
                                    onClick={() =>
                                      keepNow({
                                        ...d,
                                        obstacles: d.obstacles.map((x) =>
                                          x.id === o.id
                                            ? { ...x, kept: !x.kept }
                                            : x,
                                        ),
                                      })
                                    }
                                    on={!o.kept}
                                    color="var(--accent)"
                                  >
                                    {o.kept ? "yours" : "keep"}
                                  </Chip>
                                  <button
                                    onClick={() =>
                                      keepNow({
                                        ...d,
                                        obstacles: d.obstacles.filter(
                                          (x) => x.id !== o.id,
                                        ),
                                      })
                                    }
                                    className="meta px-1"
                                    style={{ color: "var(--faint)" }}
                                    aria-label="Remove"
                                  >
                                    ×
                                  </button>
                                </>
                              )}
                            </div>
                            <input
                              value={o.plan}
                              onChange={(e) =>
                                setObstacle(o.id, { plan: e.target.value })
                              }
                              readOnly={!writable}
                              placeholder="when …, I …"
                              className="search hand ml-4 px-2 py-1 text-[13.5px]"
                              style={{ color: "var(--accent)" }}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(d.changes.length > 0 || writable) && (
                    <div className="mt-3">
                      <div
                        className="meta flex items-baseline gap-2"
                        style={{ color: "var(--faint)" }}
                      >
                        what changes
                        {writable && (
                          <button
                            onClick={() =>
                              setDraft({
                                ...d,
                                changes: [
                                  ...d.changes,
                                  {
                                    id: uid(),
                                    text: "",
                                    lane: null,
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
                      <ul className="mt-1 flex flex-col gap-1">
                        {d.changes.map((c) => (
                          <li key={c.id} className="flex items-center gap-1.5">
                            <span
                              aria-hidden
                              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{
                                background: c.kept
                                  ? laneColor(c.lane)
                                  : "transparent",
                                border: `1px ${c.kept ? "solid" : "dashed"} ${laneColor(c.lane)}`,
                              }}
                              title={laneLabel(c.lane)}
                            />
                            <input
                              value={c.text}
                              onChange={(e) =>
                                setChange(c.id, {
                                  text: e.target.value,
                                  by: "you",
                                })
                              }
                              readOnly={!writable}
                              placeholder="what is different"
                              className="search hand min-w-0 flex-1 px-2 py-1 text-[14px]"
                              style={{
                                color: c.kept ? "var(--ink)" : "var(--muted)",
                                borderStyle: c.kept ? undefined : "dashed",
                              }}
                            />
                            <select
                              value={c.lane ?? ""}
                              onChange={(e) =>
                                setChange(c.id, {
                                  lane: e.target.value || null,
                                })
                              }
                              disabled={!writable}
                              className="search px-1.5 py-1 text-[10px]"
                              style={{
                                fontFamily: "var(--font-mono)",
                                maxWidth: "6.5rem",
                              }}
                              aria-label="Lane"
                            >
                              <option value="">lane</option>
                              {lanes.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.label.toLowerCase()}
                                </option>
                              ))}
                            </select>
                            {writable && (
                              <>
                                {!c.kept && (
                                  <Chip
                                    onClick={() =>
                                      keepNow({
                                        ...d,
                                        changes: d.changes.map((x) =>
                                          x.id === c.id
                                            ? { ...x, kept: true }
                                            : x,
                                        ),
                                      })
                                    }
                                    on
                                    color="var(--accent)"
                                  >
                                    keep
                                  </Chip>
                                )}
                                <button
                                  onClick={() =>
                                    keepNow({
                                      ...d,
                                      changes: d.changes.filter(
                                        (x) => x.id !== c.id,
                                      ),
                                    })
                                  }
                                  className="meta px-1"
                                  style={{ color: "var(--faint)" }}
                                  aria-label="Remove"
                                >
                                  ×
                                </button>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              )}

            {/* the way's standing */}
            {d && writable && (
              <section aria-label="Standing">
                <div className="meta" style={{ color: "var(--faint)" }}>
                  this way
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(["open", "arrived", "let-go"] as Status[]).map((s) => (
                    <Chip
                      key={s}
                      on={d.status === s}
                      onClick={() => keepNow({ ...d, status: s })}
                      color={s === "arrived" ? "var(--accent)" : undefined}
                    >
                      {STATUS_LABEL[s]}
                    </Chip>
                  ))}
                  {d.slug && (
                    <button
                      onClick={() => (sure ? remove() : setSure(true))}
                      className="chip px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: sure ? "var(--accent)" : "var(--faint)",
                        borderColor: sure ? "var(--accent)" : undefined,
                      }}
                    >
                      {sure ? "yes, let go of the file" : "let go of the file"}
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
              how it is read: the then is written as if it is already so — that
              is the whole trick; imagining an outcome as having happened makes
              its causes easier to name, and the desk counts the sentences that
              still look ahead. what the model proposes is hollow until you keep
              it, and it is asked for the way, never for a verdict. the
              obstacles are the part that turns a picture into effort — each
              with a when–then. standing at the then is a mode, not a home: stay
              a minute, then come back to the steps.
              {payload?.dir ? ` files at ${shortHome(payload.dir)}.` : ""}
            </p>
            <p
              className="meta"
              style={{ color: "var(--faint)", textTransform: "none" }}
            >
              / find · n new · s stand at the then · esc
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}

function keepAllOf(
  d: WayFile,
  yes: boolean,
): Pick<WayFile, "steps" | "obstacles" | "changes"> {
  return {
    steps: yes
      ? d.steps.map((s) => ({ ...s, kept: true }))
      : d.steps.filter((s) => s.kept),
    obstacles: yes
      ? d.obstacles.map((o) => ({ ...o, kept: true }))
      : d.obstacles.filter((o) => o.kept),
    changes: yes
      ? d.changes.map((c) => ({ ...c, kept: true }))
      : d.changes.filter((c) => c.kept),
  };
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
      className="chip w-seg relative px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase disabled:opacity-50"
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

function Words({ label, list }: { label: string; list: string[] }) {
  if (!list.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      <span className="meta" style={{ color: "var(--faint)" }}>
        {label}
      </span>
      {list.slice(0, 8).map((w) => (
        <span
          key={w}
          className="hand text-[13px]"
          style={{
            color: "var(--accent)",
            borderBottom:
              "1px solid color-mix(in srgb, var(--accent) 45%, transparent)",
          }}
        >
          {w}
        </span>
      ))}
    </div>
  );
}
