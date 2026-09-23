"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Garden, GardenNode } from "@/lib/garden";
import { KIND_LABEL, KIND_ORDER, LINK_LABEL, themes } from "@/lib/palette";
import Reader from "./Reader";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

type Sim = GardenNode & { x?: number; y?: number; z?: number };

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/\.md$/, "")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
const PREFIXES = ["project_", "feedback_", "user_", "reference_", "routine_"];

export default function Garden() {
  const mount = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const threeRef = useRef<any>(null);
  const spriteRef = useRef<any>(null);
  const framed = useRef(false);
  const resizeRef = useRef<ResizeObserver | null>(null);
  const objects = useRef(
    new Map<string, { group: any; material: any; sprite: any }>(),
  );
  const master = useRef(new Map<string, Sim>());
  const [data, setData] = useState<Garden | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useTheme();
  const [kinds, setKinds] = useState<Set<string>>(new Set(KIND_ORDER));
  const [edgeKinds, setEdgeKinds] = useState<Set<string>>(
    new Set(Object.keys(LINK_LABEL)),
  );
  const [showOrphans, setShowOrphans] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [pulse, setPulse] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // ── data ────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const res = await fetch("/api/garden", { cache: "no-store" });
    if (!res.ok) return;
    const fresh: Garden = await res.json();
    // Reuse live node objects so the simulation keeps its positions and new
    // material drifts in rather than the whole garden snapping to a new layout.
    for (const n of fresh.nodes) {
      const existing = master.current.get(n.id);
      if (existing) Object.assign(existing, n);
      else master.current.set(n.id, { ...n });
    }
    for (const id of [...master.current.keys()]) {
      if (!fresh.nodes.some((n) => n.id === id)) {
        master.current.delete(id);
        objects.current.delete(id);
      }
    }
    setData(fresh);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── live: the garden changes while nobody is looking ─────────────────────
  useEffect(() => {
    const es = new EventSource("/api/watch");
    es.addEventListener("changed", () => {
      setPulse(new Date().toISOString());
      load();
      window.setTimeout(() => setPulse(null), 4000);
    });
    return () => es.close();
  }, [load]);

  // The filters cover a third of a phone; fold them there unless asked not to.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("niwa-filters");
    } catch {
      /* private window */
    }
    setFiltersOpen(stored ? stored === "open" : window.innerWidth >= 640);
  }, []);
  const toggleFilters = () =>
    setFiltersOpen((open) => {
      try {
        localStorage.setItem("niwa-filters", open ? "closed" : "open");
      } catch {
        /* private window */
      }
      return !open;
    });

  // Arriving from the catalogue with ?focus=<id>: select that stone once the
  // simulation has given it a position, so the camera has somewhere to fly.
  useEffect(() => {
    const focus = new URLSearchParams(window.location.search).get("focus");
    if (!focus || !ready) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      const node = master.current.get(focus);
      if ((node && node.x !== undefined) || ++tries > 40) {
        window.clearInterval(timer);
        if (node) setSelected(focus);
        window.history.replaceState(null, "", "/");
      }
    }, 150);
    return () => window.clearInterval(timer);
  }, [ready]);

  // ── lookups ─────────────────────────────────────────────────────────────
  const nodeIndex = useMemo(() => {
    const byId = new Map<string, GardenNode>();
    const byKey = new Map<string, string>();
    for (const n of data?.nodes ?? []) {
      byId.set(n.id, n);
      for (const key of [norm(n.id), norm(n.label)]) {
        if (key && !byKey.has(key)) byKey.set(key, n.id);
        for (const p of PREFIXES)
          if (key.startsWith(p) && !byKey.has(key.slice(p.length)))
            byKey.set(key.slice(p.length), n.id);
      }
    }
    return { byId, byKey };
  }, [data]);

  const resolveRef = useCallback(
    (ref: string): string | null => {
      if (nodeIndex.byId.has(ref)) return ref;
      const k = norm(ref);
      if (nodeIndex.byKey.has(k)) return nodeIndex.byKey.get(k)!;
      for (const p of PREFIXES)
        if (nodeIndex.byKey.has(p + k)) return nodeIndex.byKey.get(p + k)!;
      return null;
    },
    [nodeIndex],
  );

  const adjacency = useMemo(() => {
    const map = new Map<
      string,
      { node: string; kind: string; direction: "in" | "out" }[]
    >();
    for (const l of data?.links ?? []) {
      const s = typeof l.source === "string" ? l.source : (l.source as any).id;
      const t = typeof l.target === "string" ? l.target : (l.target as any).id;
      if (!map.has(s)) map.set(s, []);
      if (!map.has(t)) map.set(t, []);
      map.get(s)!.push({ node: t, kind: l.kind, direction: "out" });
      map.get(t)!.push({ node: s, kind: l.kind, direction: "in" });
    }
    return map;
  }, [data]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return new Set<string>();
    const hits = new Set<string>();
    for (const n of data?.nodes ?? []) {
      if (
        n.label.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q)
      )
        hits.add(n.id);
    }
    return hits;
  }, [query, data]);

  const visible = useMemo(() => {
    if (!data) return { nodes: [] as Sim[], links: [] as any[] };
    const keep = new Set(
      data.nodes
        .filter((n) => kinds.has(n.kind))
        .filter((n) => showOrphans || n.degree > 0)
        .map((n) => n.id),
    );
    const links = data.links.filter((l) => {
      const s = typeof l.source === "string" ? l.source : (l.source as any).id;
      const t = typeof l.target === "string" ? l.target : (l.target as any).id;
      return edgeKinds.has(l.kind) && keep.has(s) && keep.has(t);
    });
    const nodes = [...keep]
      .map((id) => master.current.get(id)!)
      .filter(Boolean);
    return { nodes, links: links.map((l) => ({ ...l })) };
  }, [data, kinds, edgeKinds, showOrphans]);

  // ── scene ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mount.current || graphRef.current) return;
    let disposed = false;

    (async () => {
      const [{ default: ForceGraph3D }, THREE, { default: SpriteText }] =
        await Promise.all([
          import("3d-force-graph"),
          import("three"),
          import("three-spritetext"),
        ]);
      const el = mount.current;
      if (disposed || !el) return;
      threeRef.current = THREE;
      spriteRef.current = SpriteText;

      const graph = new (ForceGraph3D as any)(el)
        .showNavInfo(false)
        .nodeLabel(() => "")
        .nodeRelSize(1)
        .linkOpacity(0.5)
        .warmupTicks(24)
        .cooldownTime(9000)
        .enableNodeDrag(true);

      // Keep the garden compact enough that a stone still reads as a stone: at 316 nodes
      // a looser charge spreads the layout past the point where anything is legible.
      graph.d3Force("charge").strength(-78).distanceMax(340);
      graph
        .d3Force("link")
        .distance((l: any) =>
          l.kind === "concept"
            ? 64
            : l.kind === "mention"
              ? 58
              : l.kind === "build"
                ? 34
                : l.kind === "twin"
                  ? 22
                  : 48,
        );

      // Frame the garden once, on the first settle that actually has positions —
      // an early stop reports every node at the origin and flies the camera inside it.
      // Unplanted stones drift far out, so fit to the connected ontology only.
      graph.onEngineStop(() => {
        if (framed.current) return;
        const placed = graph
          .graphData()
          .nodes.filter(
            (n: Sim) =>
              (n.degree ?? 0) > 0 && Number.isFinite(n.x) && n.x !== 0,
          );
        if (placed.length < 10) return;
        framed.current = true;
        graph.zoomToFit(1500, 60, (n: Sim) => (n.degree ?? 0) > 0);
      });

      // The renderer sizes itself once, at construction. Opened in a hidden or
      // zero-width container — a background tab, a collapsed pane — it locks to 0×0
      // and never recovers, because no window resize follows the container growing.
      const resize = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) graph.width(width).height(height);
      });
      resize.observe(el);
      resizeRef.current = resize;

      graphRef.current = graph;
      // Local tool: keep the instance reachable from the console for poking at layout.
      (window as any).__niwa = graph;
      setReady(true);
    })();

    return () => {
      disposed = true;
      resizeRef.current?.disconnect();
      resizeRef.current = null;
      graphRef.current?._destructor?.();
      graphRef.current = null;
    };
  }, []);

  // ── node objects, theme-aware (materials live in JS, so they must be re-set) ──
  useEffect(() => {
    const graph = graphRef.current;
    const THREE = threeRef.current;
    const SpriteText = spriteRef.current;
    if (!graph || !THREE || !SpriteText || !ready) return;
    const p = themes[theme];

    const geometryFor = (r: number) => new THREE.SphereGeometry(r, 18, 14);

    graph
      .backgroundColor(p.bg)
      .nodeThreeObject((node: Sim) => {
        const group = new THREE.Group();
        const degree = node.degree ?? 0;
        const base = 5 + Math.sqrt(degree) * 2.8;
        const ghost = node.kind === "ghost";

        const material = new THREE.MeshLambertMaterial({
          color: new THREE.Color(p.kind[node.kind] ?? p.ink),
          transparent: true,
          opacity: ghost ? 0.3 : node.degree === 0 ? 0.55 : 0.95,
          wireframe: ghost,
          emissive: new THREE.Color(p.kind[node.kind] ?? p.ink),
          emissiveIntensity: theme === "sumi" ? 0.25 : 0,
        });

        const mesh = new THREE.Mesh(geometryFor(base), material);
        group.add(mesh);

        const sprite = new SpriteText(
          node.label.length > 34 ? `${node.label.slice(0, 34)}…` : node.label,
        );
        sprite.color = p.ink;
        sprite.textHeight = 7;
        sprite.fontFace = "Georgia, serif";
        sprite.fontWeight = "400";
        sprite.position.set(0, base + 6, 0);
        sprite.material.transparent = true;
        sprite.material.opacity = 0.85;
        sprite.visible = degree >= 7;
        group.add(sprite);

        objects.current.set(node.id, { group, material, sprite });
        return group;
      })
      .onNodeHover((node: Sim | null) => setHovered(node?.id ?? null))
      .onNodeClick((node: Sim) => setSelected(node.id))
      // Clicking empty ground puts the stone down, the way esc does.
      .onBackgroundClick(() => setSelected(null));

    const scene = graph.scene();
    scene.fog = new THREE.Fog(p.bg, p.fogNear, p.fogFar);
    for (const child of scene.children) {
      // three r155+ is physically lit — anything past ~1.4 clips Lambert colour to white.
      if (child.isAmbientLight) child.intensity = theme === "sumi" ? 0.8 : 1.15;
      if (child.isDirectionalLight)
        child.intensity = theme === "sumi" ? 0.95 : 1.15;
    }
  }, [theme, ready]);

  // ── feed data in ────────────────────────────────────────────────────────
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !ready || !data) return;
    graph.graphData({ nodes: visible.nodes, links: visible.links });
  }, [visible, ready, data]);

  // ── links respond to the focused node ───────────────────────────────────
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !ready) return;
    const p = themes[theme];
    const focus = selected;

    const touches = (l: any) => {
      if (!focus) return false;
      const s = typeof l.source === "string" ? l.source : l.source?.id;
      const t = typeof l.target === "string" ? l.target : l.target?.id;
      return s === focus || t === focus;
    };

    graph
      .linkColor((l: any) =>
        touches(l) ? p.accent : (p.link[l.kind] ?? p.link.link),
      )
      .linkWidth((l: any) => (touches(l) ? 2.4 : 0.9))
      .linkOpacity(focus ? 0.22 : 0.62)
      .linkDirectionalParticles((l: any) => (touches(l) ? 3 : 0))
      .linkDirectionalParticleWidth(1.3)
      .linkDirectionalParticleSpeed(0.006)
      .linkDirectionalParticleColor(() => p.accent);
  }, [selected, theme, ready]);

  // ── hover + search dimming: mutate materials directly, no data round-trip ──
  useEffect(() => {
    if (!ready) return;
    const focus = hovered ?? selected;
    const near = new Set<string>(
      (focus ? (adjacency.get(focus) ?? []) : []).map((a) => a.node),
    );
    const searching = matches.size > 0;

    for (const [id, o] of objects.current) {
      const node = master.current.get(id);
      if (!node) continue;
      const isFocus = id === focus;
      const isNear = near.has(id);
      const isHit = matches.has(id);

      let opacity =
        node.kind === "ghost" ? 0.3 : node.degree === 0 ? 0.55 : 0.95;
      if (focus) opacity = isFocus ? 1 : isNear ? 0.85 : 0.08;
      if (searching) opacity = isHit ? 1 : Math.min(opacity, 0.07);

      o.material.opacity = opacity;
      o.sprite.visible =
        isFocus ||
        isNear ||
        isHit ||
        (!focus && !searching && (node.degree ?? 0) >= 7);
      o.sprite.material.opacity = isFocus ? 1 : 0.8;
      const scale = isFocus ? 1.55 : isHit ? 1.25 : 1;
      o.group.scale.setScalar(scale);
    }
  }, [hovered, selected, adjacency, matches, ready, visible]);

  // ── fly to the selected stone ───────────────────────────────────────────
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !selected || !ready) return;
    const node = master.current.get(selected) as Sim | undefined;
    if (!node || node.x === undefined) return;
    // Hub stones are drawn large and sit inside dense neighbourhoods, so a fixed
    // distance fills the frame with colour. Back off in proportion to degree.
    const dist = 240 + Math.sqrt(node.degree ?? 0) * 30;
    const ratio = 1 + dist / Math.hypot(node.x!, node.y!, node.z!);
    graph.cameraPosition(
      { x: node.x! * ratio, y: node.y! * ratio, z: node.z! * ratio },
      node,
      900,
    );
  }, [selected, ready]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setQuery("");
      }
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        document.getElementById("niwa-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const selectByRef = useCallback(
    (ref: string) => {
      const id = resolveRef(ref);
      if (id) setSelected(id);
    },
    [resolveRef],
  );

  const hiddenCount =
    KIND_ORDER.filter((k) => (data?.stats.byKind[k] ?? 0) > 0 && !kinds.has(k))
      .length +
    Object.keys(LINK_LABEL).filter((k) => !edgeKinds.has(k)).length +
    (showOrphans ? 0 : 1);

  const toggle = (
    set: Set<string>,
    value: string,
    apply: (s: Set<string>) => void,
  ) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    apply(next);
  };

  const selectedNode = selected ? nodeIndex.byId.get(selected) : null;
  // Two notes that link to each other produce two edges; list the neighbour once.
  const neighbours = selected
    ? [
        ...new Map(
          (adjacency.get(selected) ?? [])
            .map((a) => ({
              node: nodeIndex.byId.get(a.node)!,
              kind: a.kind,
              direction: a.direction,
            }))
            .filter((n) => n.node)
            .map((n) => [`${n.node.id}:${n.kind}`, n] as const),
        ).values(),
      ].sort((a, b) => b.node.degree - a.node.degree)
    : [];

  // A note named what you typed comes before one that only mentions it: exact
  // title, then a title that starts with it, then one containing it, then the rest.
  const fit = useCallback(
    (n: GardenNode) => {
      const q = query.trim().toLowerCase();
      const t = n.label.toLowerCase();
      return t === q ? 0 : t.startsWith(q) ? 1 : t.includes(q) ? 2 : 3;
    },
    [query],
  );
  const searchResults = useMemo(
    () =>
      query.trim().length >= 2
        ? [...matches]
            .map((id) => nodeIndex.byId.get(id)!)
            .filter(Boolean)
            .sort((a, b) => fit(a) - fit(b) || b.degree - a.degree)
            .slice(0, 8)
        : [],
    [matches, nodeIndex, query, fit],
  );

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <div ref={mount} className="absolute inset-0" />

      {/* A scrim, not decoration: the masthead sits directly over moving stones. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background:
            "radial-gradient(34rem 20rem at 0% 0%, var(--bg) 0%, color-mix(in srgb, var(--bg) 82%, transparent) 40%, transparent 72%)",
        }}
      />

      {/* masthead */}
      <header className="rise pointer-events-none absolute top-0 left-0 z-10 p-8">
        <div className="pointer-events-auto flex items-baseline gap-3">
          <h1
            className="display text-[40px] leading-none"
            style={{ color: "var(--ink)" }}
          >
            庭
          </h1>
          <div>
            <div className="meta" style={{ color: "var(--accent)" }}>
              niwa
            </div>
            <p
              className="mt-1 max-w-[19rem] text-[11.5px] leading-[1.55]"
              style={{ color: "var(--muted)" }}
            >
              {data?.stats.blurb ??
                "Everything you know you know — memory, vocabulary and code, drawn as one garden."}
            </p>
          </div>
        </div>

        <div className="pointer-events-auto mt-5">
          <ViewSwitch current="/" />
        </div>

        <div className="pointer-events-auto mt-3 flex items-center gap-2">
          <input
            id="niwa-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search everything  /"
            className="search w-56 px-3 py-1.5 text-[12px]"
          />
          <button
            onClick={() => {
              setSelected(null);
              // Fit twice: a filter change leaves the simulation mid-flight, and a
              // single fit would frame wherever the stones happened to be passing.
              const fit = () =>
                graphRef.current?.zoomToFit(
                  700,
                  60,
                  (n: Sim) => (n.degree ?? 0) > 0,
                );
              fit();
              window.setTimeout(fit, 900);
            }}
            className="chip px-2.5 py-1.5 text-[10px] tracking-[0.14em] uppercase"
            style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
            aria-label="Frame the whole garden"
          >
            fit
          </button>
          <button
            onClick={() => setTheme(theme === "paper" ? "sumi" : "paper")}
            className="chip px-2.5 py-1.5 text-[10px] tracking-[0.14em] uppercase"
            style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
            aria-label="Toggle theme"
          >
            {theme === "paper" ? "sumi" : "paper"}
          </button>
        </div>

        {searchResults.length > 0 && (
          <ul
            className="panel pointer-events-auto mt-2 w-[19rem] p-1.5"
            style={{ borderRadius: 4 }}
          >
            {searchResults.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => setSelected(n.id)}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[12px]"
                  style={{ color: "var(--muted)" }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 99,
                      background: `var(--kind-${n.kind})`,
                    }}
                  />
                  <span className="truncate">{n.label}</span>
                  <span
                    className="meta ml-auto shrink-0"
                    style={{ color: "var(--faint)" }}
                  >
                    {n.degree}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </header>

      {/* filters */}
      <section
        className="rise panel pointer-events-auto absolute right-4 bottom-4 left-4 z-10 px-4 py-3 sm:right-auto sm:bottom-8 sm:left-8 sm:w-[23rem]"
        style={{ borderRadius: 6, animationDelay: "120ms" }}
        aria-label="Filters"
      >
        <button
          onClick={toggleFilters}
          aria-expanded={filtersOpen}
          aria-controls="niwa-filters"
          className="fold meta flex w-full items-center justify-between gap-3 text-left"
          style={{ color: "var(--faint)" }}
        >
          <span>
            Beds &amp; threads
            {hiddenCount > 0 && (
              <span style={{ color: "var(--accent)" }}>
                {" "}
                · {hiddenCount} off
              </span>
            )}
          </span>
          <span aria-hidden className="fold-mark">
            {filtersOpen ? "−" : "+"}
          </span>
        </button>
        <div id="niwa-filters" hidden={!filtersOpen} className="mt-3">
          <div className="meta mb-2.5" style={{ color: "var(--faint)" }}>
            Beds
          </div>
          <div className="flex flex-wrap gap-1.5">
            {KIND_ORDER.filter((k) => (data?.stats.byKind[k] ?? 0) > 0).map(
              (k) => {
                const on = kinds.has(k);
                return (
                  <button
                    key={k}
                    onClick={() => toggle(kinds, k, setKinds)}
                    className="chip px-2 py-[3px] text-[10.5px]"
                    style={{
                      color: on ? "var(--ink)" : "var(--faint)",
                      opacity: on ? 1 : 0.5,
                      background: on
                        ? `color-mix(in srgb, var(--kind-${k}) 13%, transparent)`
                        : "transparent",
                      borderColor: on
                        ? `color-mix(in srgb, var(--kind-${k}) 38%, transparent)`
                        : "var(--rule)",
                    }}
                    aria-pressed={on}
                  >
                    {KIND_LABEL[k]}
                    <span style={{ opacity: 0.55 }}>
                      {" "}
                      {data?.stats.byKind[k]}
                    </span>
                  </button>
                );
              },
            )}
          </div>

          <div className="meta mt-4 mb-2.5" style={{ color: "var(--faint)" }}>
            Threads
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(LINK_LABEL).map(([k, label]) => {
              const on = edgeKinds.has(k);
              return (
                <button
                  key={k}
                  onClick={() => toggle(edgeKinds, k, setEdgeKinds)}
                  className="chip px-2 py-[3px] text-[10.5px]"
                  style={{
                    color: on ? "var(--ink)" : "var(--faint)",
                    opacity: on ? 1 : 0.5,
                  }}
                  aria-pressed={on}
                >
                  {label}
                </button>
              );
            })}
            <button
              onClick={() => setShowOrphans(!showOrphans)}
              className="chip px-2 py-[3px] text-[10.5px]"
              style={{
                color: showOrphans ? "var(--ink)" : "var(--faint)",
                opacity: showOrphans ? 1 : 0.5,
              }}
              aria-pressed={showOrphans}
            >
              Unconnected {data?.stats.orphans}
            </button>
          </div>
        </div>
      </section>

      {/* colophon */}
      <footer
        className="rise pointer-events-none absolute right-8 bottom-8 z-10 hidden text-right sm:block"
        style={{ animationDelay: "220ms" }}
      >
        {data && (
          <div className="meta leading-[1.9]" style={{ color: "var(--faint)" }}>
            <div>
              {visible.nodes.length} stones · {visible.links.length} threads
            </div>
            <div>
              {data.stats.byStage.fresh ?? 0} fresh ·{" "}
              {data.stats.byStage.fallow ?? 0} fallow · {data.stats.ghosts}{" "}
              unwritten
            </div>
            <div
              style={{
                color:
                  data.stats.signedTerms === 0
                    ? "var(--accent)"
                    : "var(--faint)",
              }}
            >
              {data.stats.signedTerms} of {data.stats.totalTerms} terms signed
            </div>
            <div className="mt-1 flex items-center justify-end gap-1.5">
              <span
                aria-hidden
                className={pulse ? "breathe" : ""}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 99,
                  background: pulse ? "var(--accent)" : "var(--faint)",
                  display: "inline-block",
                  transition: `background-color 400ms ${EASE}`,
                }}
              />
              {data.stats.live === false
                ? `snapshot · ${new Date(data.stats.builtAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                : pulse
                  ? "the garden moved"
                  : "watching disk"}
            </div>
          </div>
        )}
      </footer>

      {selectedNode && (
        <Reader
          node={selectedNode}
          neighbours={neighbours}
          resolve={(ref) => {
            const id = resolveRef(ref);
            return id ? (nodeIndex.byId.get(id) ?? null) : null;
          }}
          onSelect={selectByRef}
          onClose={() => setSelected(null)}
        />
      )}

      {!data && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="meta breathe" style={{ color: "var(--faint)" }}>
            reading the garden
          </span>
        </div>
      )}
    </main>
  );
}
