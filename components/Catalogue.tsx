"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Garden, GardenNode } from "@/lib/garden";
import { KIND_LABEL, KIND_ORDER, STAGE_LABEL } from "@/lib/palette";
import { makeResolver, outline, snippet, trail, type Crumb } from "@/lib/place";
import Field from "./Field";
import Page from "./Page";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

export type Thread = { id: string; kind: string; direction: "in" | "out" };

export type Index = {
  nodes: GardenNode[]; // reading order
  byId: Map<string, GardenNode>;
  threads: Map<string, Thread[]>;
  place: Map<string, { index: number; depth: number }>;
  trails: Map<string, Crumb[]>;
  kids: Map<string, number>;
  resolve: (ref: string, from?: GardenNode | null) => GardenNode | null;
};

type Group = "bed" | "section" | "stage" | "none";
type Sort = "place" | "title" | "tended" | "threads";

const GROUP_BY: { id: Group; label: string }[] = [
  { id: "bed", label: "Bed" },
  { id: "section", label: "Section" },
  { id: "stage", label: "Stage" },
  { id: "none", label: "None" },
];

const SORT_BY: { id: Sort; label: string }[] = [
  { id: "place", label: "Place" },
  { id: "title", label: "Title" },
  { id: "tended", label: "Tended" },
  { id: "threads", label: "Threads" },
];

const STAGES = ["fresh", "tended", "settled", "fallow", "unknown"];

/** Words too common to narrow anything: "theory of mind" should mean theory + mind. */
const FILLER = new Set(
  "a an and as at by for from in into is it of on or the to with".split(" "),
);
const termsOf = (q: string) => {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const kept = words.filter((w) => !FILLER.has(w));
  return kept.length ? kept : words;
};

const day = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
};

/**
 * The region of the whole a note belongs to, for grouping. A treed note is
 * filed under the page just below its root (Projects, The Rail, Readwise); the
 * rest under where they live (Memory / Builds, Fieldnotes / Sources).
 */
const sectionOf = (n: GardenNode, crumbs: Crumb[]) =>
  crumbs.length >= 2 && crumbs[0].id
    ? crumbs[1].label
    : crumbs.length === 1 && crumbs[0].id
      ? n.label
      : crumbs.map((c) => c.label).join(" / ") ||
        (KIND_LABEL[n.kind] ?? n.kind);

export default function Catalogue() {
  const params = useSearchParams();
  const [data, setData] = useState<Garden | null>(null);
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [active, setActive] = useState(0);
  // The keyboard cursor only shows, and only scrolls, once the keyboard moves it.
  const [keyed, setKeyed] = useState(false);
  const [theme, setTheme] = useTheme();
  const search = useRef<HTMLInputElement>(null);
  const body = useRef<HTMLDivElement>(null);

  const group = (params.get("group") as Group) || "bed";
  const sort = (params.get("sort") as Sort) || "place";
  const desc = params.get("dir") === "desc";
  const beds = useMemo(
    () => new Set((params.get("beds") ?? "").split(",").filter(Boolean)),
    [params],
  );
  const openId = params.get("id");

  // ── url state: shareable, and the back button closes a page ─────────────
  const setParams = useCallback(
    (patch: Record<string, string | null>, push = false) => {
      const next = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      const url = `${window.location.pathname}${next.size ? `?${next}` : ""}`;
      if (push) window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    },
    [],
  );

  useEffect(() => {
    const t = window.setTimeout(() => setParams({ q: query.trim() }), 250);
    return () => window.clearTimeout(t);
  }, [query, setParams]);

  // ── data, and the garden moving underneath ───────────────────────────────
  const load = useCallback(async () => {
    const res = await fetch("/api/garden", { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    load();
    const es = new EventSource("/api/watch");
    es.addEventListener("changed", () => load());
    return () => es.close();
  }, [load]);

  const index = useMemo<Index | null>(() => {
    if (!data) return null;
    const byId = new Map(data.nodes.map((n) => [n.id, n]));
    const threads = new Map<string, Thread[]>();
    for (const l of data.links) {
      const s = typeof l.source === "string" ? l.source : (l.source as any).id;
      const t = typeof l.target === "string" ? l.target : (l.target as any).id;
      if (!threads.has(s)) threads.set(s, []);
      if (!threads.has(t)) threads.set(t, []);
      threads.get(s)!.push({ id: t, kind: l.kind, direction: "out" });
      threads.get(t)!.push({ id: s, kind: l.kind, direction: "in" });
    }
    const place = outline(data.nodes);
    const nodes = [...data.nodes].sort(
      (a, b) => place.get(a.id)!.index - place.get(b.id)!.index,
    );
    const trails = new Map(data.nodes.map((n) => [n.id, trail(n, byId)]));
    const kids = new Map<string, number>();
    for (const n of data.nodes)
      if (n.parent) kids.set(n.parent, (kids.get(n.parent) ?? 0) + 1);
    return {
      nodes,
      byId,
      threads,
      place,
      trails,
      kids,
      resolve: makeResolver(data.nodes),
    };
  }, [data]);

  const haystack = useMemo(
    () =>
      new Map(
        (index?.nodes ?? []).map((n) => [
          n.id,
          [
            n.label,
            n.description,
            (n.tags ?? []).join(" "),
            index!.trails
              .get(n.id)!
              .map((c) => c.label)
              .join(" "),
            n.body,
          ]
            .join("\n")
            .toLowerCase(),
        ]),
      ),
    [index],
  );

  // ── the view: filter, sort, group ─────────────────────────────────────────
  const terms = termsOf(query);
  const inView = useMemo(() => {
    if (!index) return [] as GardenNode[];
    return index.nodes.filter(
      (n) =>
        (!beds.size || beds.has(n.kind)) &&
        terms.every((t) => haystack.get(n.id)!.includes(t)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, beds, haystack, terms.join(" ")]);
  const inViewIds = useMemo(() => new Set(inView.map((n) => n.id)), [inView]);

  const rows = useMemo(() => {
    if (!index) return [] as GardenNode[];
    const by = {
      place: (a: GardenNode, b: GardenNode) =>
        index.place.get(a.id)!.index - index.place.get(b.id)!.index,
      title: (a: GardenNode, b: GardenNode) => a.label.localeCompare(b.label),
      tended: (a: GardenNode, b: GardenNode) =>
        (b.modified ?? "").localeCompare(a.modified ?? ""),
      threads: (a: GardenNode, b: GardenNode) => b.degree - a.degree,
    }[sort];
    const sorted = [...inView].sort(by);
    return desc ? sorted.reverse() : sorted;
  }, [index, inView, sort, desc]);

  const groups = useMemo(() => {
    if (!index) return [];
    const keyOf = (n: GardenNode) =>
      group === "bed"
        ? n.kind
        : group === "stage"
          ? n.stage
          : group === "section"
            ? sectionOf(n, index.trails.get(n.id)!)
            : "all";
    const labelOf = (k: string) =>
      group === "bed"
        ? (KIND_LABEL[k] ?? k)
        : group === "stage"
          ? (STAGE_LABEL[k] ?? k)
          : group === "none"
            ? "Everything"
            : k;
    const whole = new Map<string, number>();
    for (const n of index.nodes)
      whole.set(keyOf(n), (whole.get(keyOf(n)) ?? 0) + 1);
    const by = new Map<string, GardenNode[]>();
    for (const n of rows) {
      const k = keyOf(n);
      if (!by.has(k)) by.set(k, []);
      by.get(k)!.push(n);
    }
    const order =
      group === "bed"
        ? (KIND_ORDER as readonly string[])
        : group === "stage"
          ? STAGES
          : [...by.keys()]; // section: first appearance in the current sort
    return order
      .filter((k) => by.has(k))
      .map((k) => ({
        key: k,
        label: labelOf(k),
        rows: by.get(k)!,
        total: whole.get(k) ?? 0,
      }));
  }, [index, rows, group]);

  const flat = useMemo(() => groups.flatMap((g) => g.rows), [groups]);
  const open = openId ? (index?.byId.get(openId) ?? null) : null;
  const openPage = useCallback(
    (id: string) => setParams({ id }, true),
    [setParams],
  );

  useEffect(() => setActive(0), [query, group, sort, desc, beds]);

  // Keep the open page's row in sight: the part stays next to its place in the list.
  useEffect(() => {
    if (!open) return;
    document
      .querySelector(`[data-row="${CSS.escape(open.id)}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing =
        document.activeElement instanceof HTMLInputElement &&
        document.activeElement !== search.current;
      if (typing) return;
      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" && document.activeElement !== search.current)
      ) {
        e.preventDefault();
        search.current?.focus();
        search.current?.select();
      } else if (e.key === "Escape") {
        if (open) setParams({ id: null });
        else if (query) setQuery("");
        else search.current?.blur();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setKeyed(true);
        setActive((i) =>
          Math.max(
            0,
            Math.min(flat.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)),
          ),
        );
      } else if (
        e.key === "Enter" &&
        (keyed || document.activeElement === search.current) &&
        flat[active]
      ) {
        openPage(flat[active].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flat, active, keyed, open, query, openPage, setParams]);

  useEffect(() => {
    const id = flat[active]?.id;
    if (!id || !keyed) return;
    document
      .querySelector(`[data-row="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, flat, keyed]);

  const toggleBed = (k: string) => {
    const next = new Set(beds);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setParams({ beds: [...next].join(",") });
  };

  const sortBy = (s: Sort) =>
    setParams(
      s === sort
        ? { dir: desc ? null : "desc" }
        : { sort: s === "place" ? null : s, dir: null },
    );

  const total = index?.nodes.length ?? 0;
  const bedCounts = useMemo(() => {
    const c = new Map<string, number>();
    for (const n of index?.nodes ?? []) c.set(n.kind, (c.get(n.kind) ?? 0) + 1);
    return c;
  }, [index]);
  const indented = sort === "place" && !desc;

  return (
    <main
      ref={body}
      className="catalogue scroll-thin relative h-dvh w-full overflow-y-auto"
    >
      <div
        className={`transition-[padding] duration-500 ${open ? "lg:pr-[min(44rem,52vw)]" : ""}`}
      >
        {/* masthead */}
        <header className="rise flex flex-wrap items-center justify-between gap-4 px-5 pt-6 sm:px-10 sm:pt-8">
          <div className="flex items-baseline gap-3">
            <span
              className="display text-[34px] leading-none"
              style={{ color: "var(--ink)" }}
            >
              目録
            </span>
            <span className="meta" style={{ color: "var(--accent)" }}>
              catalogue
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/catalogue" />
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

        <section
          className="rise px-5 pt-10 sm:px-10 sm:pt-14"
          style={{ animationDelay: "60ms" }}
        >
          <h1
            className="display max-w-[40rem] text-[34px] leading-[1.08] sm:text-[44px]"
            style={{ color: "var(--ink)" }}
          >
            Every note in the garden, each one shown against the whole.
          </h1>
          <p
            className="mt-4 max-w-[38rem] text-[13px] leading-[1.7]"
            style={{ color: "var(--muted)" }}
          >
            {total
              ? `${total} notes and ${data!.stats.links} threads`
              : "The garden"}
            , from memory, Fieldnotes, the Notion archive and the code on disk.
            Search reads every word. A page opens with the path down to it, the
            notes beside it, and the part of the garden it touches.
          </p>
        </section>

        {/* the whole */}
        <section
          className="rise px-5 pt-10 sm:px-10"
          style={{ animationDelay: "120ms" }}
          aria-label="The whole garden"
        >
          {index && (
            <Field
              nodes={index.nodes}
              tone={(n) => (inViewIds.has(n.id) ? "on" : "off")}
              onPick={openPage}
              describe={(n) =>
                index.trails
                  .get(n.id)!
                  .map((c) => c.label)
                  .join(" › ") ||
                (KIND_LABEL[n.kind] ?? n.kind)
              }
              caption={
                inView.length === total
                  ? "One mark per note, bed by bed, in reading order. Hover to name one; click to open it."
                  : `Lit: the ${inView.length} ${inView.length === 1 ? "note" : "notes"} in view. The rest of the garden stays drawn.`
              }
            />
          )}
        </section>

        {/* controls */}
        <div
          className="controls z-10 mt-8 px-5 py-3 sm:sticky sm:top-0 sm:px-10"
          role="search"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <label className="relative min-w-0 flex-1 sm:max-w-[26rem]">
              <span className="sr-only">Search every note</span>
              <input
                ref={search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search every word"
                className="search w-full py-2 pr-14 pl-3 text-[13px]"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd
                className="meta pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
                style={{ color: "var(--faint)" }}
              >
                ⌘K
              </kbd>
            </label>
            <span
              className="meta shrink-0"
              style={{ color: "var(--faint)" }}
              aria-live="polite"
            >
              {inView.length === total
                ? `${total} notes`
                : `${inView.length} of ${total}`}
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-3">
              <Segmented
                label="Group"
                options={GROUP_BY}
                value={group}
                onChange={(g) => setParams({ group: g === "bed" ? null : g })}
              />
              <Segmented
                label="Sort"
                options={SORT_BY}
                value={sort}
                onChange={(s) => sortBy(s)}
              />
            </div>
          </div>
          <div
            className="scroll-thin -mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
            aria-label="Beds"
          >
            {(KIND_ORDER as readonly string[])
              .filter((k) => bedCounts.get(k))
              .map((k) => {
                const on = beds.has(k);
                return (
                  <button
                    key={k}
                    onClick={() => toggleBed(k)}
                    aria-pressed={on}
                    className="chip flex shrink-0 items-center gap-1.5 px-2 py-[3px] text-[10.5px]"
                    style={{
                      color: on || !beds.size ? "var(--ink)" : "var(--faint)",
                      background: on
                        ? `color-mix(in srgb, var(--kind-${k}) 14%, transparent)`
                        : "transparent",
                      borderColor: on
                        ? `color-mix(in srgb, var(--kind-${k}) 45%, transparent)`
                        : undefined,
                    }}
                  >
                    <span
                      aria-hidden
                      className="inline-block h-[5px] w-[5px] rounded-full"
                      style={{ background: `var(--kind-${k})` }}
                    />
                    {KIND_LABEL[k] ?? k}
                    <span style={{ color: "var(--faint)" }}>
                      {bedCounts.get(k)}
                    </span>
                  </button>
                );
              })}
            {beds.size > 0 && (
              <button
                onClick={() => setParams({ beds: null })}
                className="meta px-2 py-[3px]"
                style={{ color: "var(--accent)" }}
              >
                all beds
              </button>
            )}
          </div>
        </div>

        {/* the table */}
        <div className="px-2 pb-24 sm:px-6">
          {index && flat.length === 0 && (
            <p
              className="px-4 py-16 text-[13px]"
              style={{ color: "var(--muted)" }}
            >
              Nothing in the garden says “{query.trim()}”
              {beds.size ? " in these beds" : ""}.
            </p>
          )}
          {groups.length > 0 && (
            <table className="db w-full border-collapse text-left">
              <thead>
                <tr>
                  {(
                    [
                      ["title", "Name", ""],
                      [null, "Bed", "hidden w-32 md:table-cell"],
                      ["threads", "Out · In", "hidden w-24 sm:table-cell"],
                      ["tended", "Tended", "hidden w-28 md:table-cell"],
                      [null, "Topics", "hidden w-44 xl:table-cell"],
                    ] as [Sort | null, string, string][]
                  ).map(([key, label, cls]) => (
                    <th
                      key={label}
                      className={`meta px-4 pt-2 pb-2 font-normal whitespace-nowrap ${cls}`}
                      style={{ color: "var(--faint)" }}
                      aria-sort={
                        key && key === sort
                          ? desc
                            ? "descending"
                            : "ascending"
                          : undefined
                      }
                    >
                      {key ? (
                        <button
                          onClick={() => sortBy(key)}
                          className="head-sort"
                          style={{
                            color: key === sort ? "var(--ink)" : undefined,
                          }}
                        >
                          {label}
                          {key === sort && (desc ? " ↓" : " ↑")}
                        </button>
                      ) : (
                        label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              {groups.map((g) => (
                <tbody key={g.key}>
                  {group !== "none" && (
                    <tr>
                      <th
                        colSpan={5}
                        className="px-4 pt-8 pb-2 text-left font-normal"
                        scope="rowgroup"
                      >
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span
                            className="display text-[19px] leading-none"
                            style={{ color: "var(--ink)" }}
                          >
                            {g.label}
                          </span>
                          <span
                            className="meta"
                            style={{ color: "var(--faint)" }}
                          >
                            {g.rows.length === g.total
                              ? `${g.total}`
                              : `${g.rows.length} of ${g.total}`}{" "}
                            · {Math.max(1, Math.round((g.total / total) * 100))}
                            % of the garden
                          </span>
                        </div>
                        {/* this group's share of the whole, and how much of it is in view */}
                        <div
                          className="share mt-2.5"
                          aria-hidden
                          style={{ width: "min(100%, 22rem)" }}
                        >
                          <span
                            style={{ width: `${(g.total / total) * 100}%` }}
                          >
                            <span
                              style={{
                                width: `${(g.rows.length / g.total) * 100}%`,
                                background:
                                  group === "bed"
                                    ? `var(--kind-${g.key})`
                                    : "var(--muted)",
                              }}
                            />
                          </span>
                        </div>
                      </th>
                    </tr>
                  )}
                  {g.rows.map((n) => {
                    const i = flat.indexOf(n);
                    return (
                      <Row
                        key={n.id}
                        node={n}
                        index={index!}
                        query={query}
                        depth={indented ? index!.place.get(n.id)!.depth : 0}
                        active={keyed && i === active}
                        open={open?.id === n.id}
                        onOpen={() => {
                          setActive(i);
                          openPage(n.id);
                        }}
                      />
                    );
                  })}
                </tbody>
              ))}
            </table>
          )}
        </div>
      </div>

      {open && index && (
        <Page
          node={open}
          index={index}
          onOpen={openPage}
          onClose={() => setParams({ id: null })}
        />
      )}

      {!index && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="meta breathe" style={{ color: "var(--faint)" }}>
            reading the garden
          </span>
        </div>
      )}
    </main>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <span className="meta" style={{ color: "var(--faint)" }}>
        {label}
      </span>
      <div className="chip flex p-[2px]">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            aria-pressed={o.id === value}
            className="seg rounded-full px-2 py-[2px] text-[11px]"
            style={{
              color: o.id === value ? "var(--ink)" : "var(--faint)",
              background:
                o.id === value
                  ? "color-mix(in srgb, var(--ink) 8%, transparent)"
                  : "transparent",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Row({
  node,
  index,
  query,
  depth,
  active,
  open,
  onOpen,
}: {
  node: GardenNode;
  index: Index;
  query: string;
  depth: number;
  active: boolean;
  open: boolean;
  onOpen: () => void;
}) {
  const crumbs = index.trails.get(node.id)!;
  const threads = index.threads.get(node.id) ?? [];
  const out = threads.filter((t) => t.direction === "out").length;
  const inn = threads.length - out;
  const under = index.kids.get(node.id) ?? 0;
  const q = query.trim();
  const titleHit = q && node.label.toLowerCase().includes(q.toLowerCase());
  // The whole phrase if the note has it, otherwise the first word that counts.
  const hit =
    q && !titleHit
      ? (snippet(node.body, q) ?? snippet(node.body, termsOf(q)[0]))
      : null;

  return (
    <tr
      data-row={node.id}
      data-active={active || undefined}
      data-open={open || undefined}
      onClick={onOpen}
      className="db-row cursor-pointer"
    >
      <td className="w-full max-w-0 px-4 py-2.5 align-top">
        <div
          className="flex min-w-0 items-start gap-2.5"
          style={{ paddingLeft: depth * 16 }}
        >
          <span
            aria-hidden
            className="mt-[7px] inline-block h-[6px] w-[6px] shrink-0 rounded-full"
            style={{ background: `var(--kind-${node.kind})` }}
          />
          <div className="min-w-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }}
              className="row-title text-left text-[13.5px] leading-snug"
              style={{ color: "var(--ink)" }}
            >
              {node.label}
            </button>
            {under > 0 && (
              <span
                className="meta ml-2 align-middle"
                style={{ color: "var(--faint)", fontSize: 9 }}
              >
                {under} under
              </span>
            )}
            {crumbs.length > 0 && (
              <div
                className="mt-0.5 truncate text-[10.5px]"
                style={{
                  color: "var(--faint)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {crumbs.map((c) => c.label).join(" › ")}
              </div>
            )}
            {hit && (
              <div
                className="mt-1 text-[12px] leading-[1.55]"
                style={{ color: "var(--muted)" }}
              >
                {hit.before}
                <mark>{hit.match}</mark>
                {hit.after}
              </div>
            )}
          </div>
        </div>
      </td>
      <td
        className="hidden px-4 py-2.5 align-top text-[11.5px] md:table-cell"
        style={{ color: "var(--muted)" }}
      >
        {KIND_LABEL[node.kind] ?? node.kind}
      </td>
      <td
        className="hidden px-4 py-2.5 align-top text-[11px] whitespace-nowrap sm:table-cell"
        style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
      >
        {out}
        <span style={{ color: "var(--faint)" }}> · </span>
        {inn}
      </td>
      <td
        className="hidden px-4 py-2.5 align-top text-[11px] whitespace-nowrap md:table-cell"
        style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
        title={STAGE_LABEL[node.stage]}
      >
        {day(node.modified)}
      </td>
      <td className="hidden px-4 py-2.5 align-top xl:table-cell">
        <div className="flex flex-wrap gap-1">
          {(node.tags ?? []).map((t) => (
            <span
              key={t}
              className="tag px-1.5 py-[1px] text-[10px]"
              style={{ color: "var(--muted)" }}
            >
              {t}
            </span>
          ))}
        </div>
      </td>
    </tr>
  );
}
