"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Garden, GardenNode } from "@/lib/garden";
import { rand, ribbon, seedOf } from "@/lib/hand";
import { gist } from "@/lib/place";
import {
  KIND_LABEL,
  KIND_ORDER,
  LINK_LABEL,
  themes,
  type Palette,
} from "@/lib/palette";
import Reader from "./Reader";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

type Sim = GardenNode & { x?: number; y?: number; z?: number };
type Stone = {
  group: any;
  material: any;
  sprite: any;
  kind: string;
  bucket: number;
  variant: number;
};

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/\.md$/, "")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
const PREFIXES = ["project_", "feedback_", "user_", "reference_", "routine_"];

/** "#RRGGBB" with an alpha, in the form the link materials read alpha from. */
const withAlpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};
const endId = (end: any): string =>
  typeof end === "string" ? end : (end?.id ?? "");
const linkSeed = (l: any) => seedOf(`${endId(l.source)}→${endId(l.target)}`);

/** Is the point inside the polygon the hand drew? Ray casting, screen space. */
const inside = (x: number, y: number, poly: [number, number][]) => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      hit = !hit;
  }
  return hit;
};

// ── the stones are drawn, not modelled ──────────────────────────────────────
// A disc on a canvas, inked round the edge with a pen that presses unevenly,
// hatched on the side away from the light, used as a sprite that always faces
// the reader. One drawing per kind × size × state × variant, cached per theme.
const DISC = 160;
const DISC_R = 54;
type DiscState = "plain" | "lit" | "ghost";

function drawDisc(
  THREE: any,
  p: Palette,
  kind: string,
  bucket: number,
  state: DiscState,
  variant: number,
) {
  const c = document.createElement("canvas");
  c.width = c.height = DISC;
  const g = c.getContext("2d")!;
  const r = rand(seedOf(`${kind}·${bucket}·${state}·${variant}`));
  const wob = (amp: number) => (r() * 2 - 1) * amp;
  const cx = DISC / 2;
  const cy = DISC / 2;
  // Small stones are seen small, so their pen is heavier in the drawing.
  const lw = [6.5, 4.2, 2.8][bucket];
  const gap = [11, 9, 7.5][bucket];
  const colour = p.kind[kind] ?? p.ink;

  const n = 30;
  const a0 = r() * Math.PI * 2;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n + 2; i++) {
    const a = a0 + (i / n) * Math.PI * 2;
    const rr = DISC_R + wob(1.6) + Math.sin(i * 1.9 + a0) * 0.7;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  const disc = new Path2D();
  disc.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i <= n; i++) disc.lineTo(pts[i][0], pts[i][1]);
  disc.closePath();

  if (state === "ghost") {
    g.globalAlpha = 0.35;
    g.fillStyle = p.bg;
    g.fill(disc);
  } else {
    g.globalAlpha = 0.92;
    g.fillStyle = colour;
    g.fill(disc);
    // hatching, away from the light at top-left
    g.save();
    g.clip(disc);
    g.globalAlpha = 0.26;
    g.strokeStyle = p.ink;
    g.lineWidth = lw * 0.5;
    g.lineCap = "round";
    for (let k = DISC_R * 0.05; k <= DISC_R; k += gap) {
      const ox = cx + k * 0.7071;
      const oy = cy + k * 0.7071;
      g.beginPath();
      g.moveTo(ox - 70 + wob(1.2), oy + 70 + wob(1.2));
      g.lineTo(ox + 70 + wob(1.2), oy - 70 + wob(1.2));
      g.stroke();
    }
    g.restore();
  }

  // the outline, pressed unevenly, once round and a little past the start
  g.globalAlpha = state === "ghost" ? 0.6 : 0.9;
  g.strokeStyle = state === "ghost" ? p.faint : p.ink;
  g.lineCap = "round";
  if (state === "ghost") g.setLineDash([lw * 1.4, lw * 1.2]);
  for (let i = 0; i < pts.length - 1; i++) {
    const t = i / (pts.length - 2);
    g.lineWidth =
      lw * (0.55 + 0.5 * Math.sin(Math.PI * t)) * (0.9 + r() * 0.2);
    g.beginPath();
    g.moveTo(pts[i][0], pts[i][1]);
    g.lineTo(pts[i + 1][0], pts[i + 1][1]);
    g.stroke();
  }

  // lit: ringed in the accent, the way a hand circles what it wants
  if (state === "lit") {
    g.setLineDash([]);
    g.strokeStyle = p.accent;
    g.globalAlpha = 0.95;
    const R = DISC_R + 15;
    const b0 = r() * Math.PI * 2;
    let px = 0;
    let py = 0;
    for (let i = 0; i <= n + 3; i++) {
      const a = b0 + (i / n) * Math.PI * 2;
      const rr = R + wob(2);
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i) {
        const t = i / (n + 3);
        g.lineWidth = lw * 0.8 * (0.6 + 0.5 * Math.sin(Math.PI * t));
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(x, y);
        g.stroke();
      }
      px = x;
      py = y;
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  return tex;
}

export default function Garden() {
  const mount = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const threeRef = useRef<any>(null);
  const spriteRef = useRef<any>(null);
  const framed = useRef(false);
  const resizeRef = useRef<ResizeObserver | null>(null);
  const objects = useRef(new Map<string, Stone>());
  const master = useRef(new Map<string, Sim>());
  const [data, setData] = useState<Garden | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const [kinds, setKinds] = useState<Set<string>>(new Set(KIND_ORDER));
  const [edgeKinds, setEdgeKinds] = useState<Set<string>>(
    new Set(Object.keys(LINK_LABEL)),
  );
  const [showOrphans, setShowOrphans] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [pulse, setPulse] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  // A theme change re-draws every stone, which comes back at full opacity;
  // this asks the hover/search pass to run again once the redraw has landed.
  const [repaint, setRepaint] = useState(0);
  // The path walked: every stone opened, in order, so a reader can step back.
  const [walk, setWalk] = useState<string[]>([]);
  const walkRef = useRef<string[]>([]);
  const trailRef = useRef<any>(null);
  // What the hand circled on the canvas.
  const [gathered, setGathered] = useState<Set<string>>(new Set());
  const lassoPts = useRef<[number, number][] | null>(null);
  const lassoLine = useRef<SVGPathElement>(null);
  const lassoInk = useRef<SVGPathElement>(null);
  const lassoBox = useRef<SVGSVGElement>(null);
  const handFace = useRef("Georgia, serif");
  const card = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  // The scene raycasts every frame from the last pointer position, so a stone
  // passing under a still pointer — during a camera fly, or behind an open
  // sheet — would read as hovered. Hover only counts while the pointer is
  // really on the canvas and the camera is not moving.
  const overCanvas = useRef(false);
  const flying = useRef(false);
  // The drawings of the stones, per theme. Rebuilt lazily after a theme change.
  const discs = useRef<{ theme: string; cache: Map<string, any> }>({
    theme,
    cache: new Map(),
  });

  const discFor = useCallback(
    (kind: string, bucket: number, state: DiscState, variant: number) => {
      const THREE = threeRef.current;
      const t = themeRef.current;
      if (discs.current.theme !== t) {
        for (const tex of discs.current.cache.values()) tex.dispose();
        discs.current = { theme: t, cache: new Map() };
      }
      const key = `${kind}·${bucket}·${state}·${variant}`;
      let tex = discs.current.cache.get(key);
      if (!tex) {
        tex = drawDisc(THREE, themes[t], kind, bucket, state, variant);
        discs.current.cache.set(key, tex);
      }
      return tex;
    },
    [],
  );

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

  // ── the walk ────────────────────────────────────────────────────────────
  const setWalkBoth = useCallback((w: string[]) => {
    walkRef.current = w;
    setWalk(w);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const w = walkRef.current;
    if (w[w.length - 1] !== selected) setWalkBoth([...w.slice(-9), selected]);
  }, [selected, setWalkBoth]);

  const walkTo = useCallback(
    (i: number) => {
      const back = walkRef.current.slice(0, i + 1);
      setWalkBoth(back);
      setSelected(back[back.length - 1] ?? null);
    },
    [setWalkBoth],
  );

  // The walk, drawn on the map: a pencil line through the stones in the order
  // they were opened. Re-laid on every engine tick while the stones settle.
  const updateTrail = useCallback(() => {
    const trail = trailRef.current;
    const THREE = threeRef.current;
    if (!trail || !THREE) return;
    const pts = walkRef.current
      .map((id) => master.current.get(id))
      .filter((n): n is Sim => !!n && n.x !== undefined)
      .map((n) => new THREE.Vector3(n.x, n.y, n.z));
    if (pts.length < 2) {
      trail.visible = false;
      return;
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const sampled = curve.getPoints(Math.min(pts.length * 14, 199));
    const pos = trail.geometry.getAttribute("position");
    sampled.forEach((v: any, i: number) => pos.setXYZ(i, v.x, v.y, v.z));
    pos.needsUpdate = true;
    trail.geometry.setDrawRange(0, sampled.length);
    trail.computeLineDistances();
    trail.visible = true;
  }, []);
  useEffect(updateTrail, [walk, updateTrail]);

  // The card sits by the pointer, flipped to whichever side has room. Placed
  // by hand on every move — no render — so it never lags the stones.
  const placeCard = useCallback(() => {
    const el = card.current;
    if (!el) return;
    const { x, y } = pointer.current;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = x + 18 + w > window.innerWidth ? x - 18 - w : x + 18;
    const top = y + 18 + h > window.innerHeight ? y - 18 - h : y + 18;
    el.style.transform = `translate(${left}px, ${top}px)`;
  }, []);
  useLayoutEffect(placeCard, [hovered, placeCard]);

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
      const s = endId(l.source);
      const t = endId(l.target);
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
    const links = data.links.filter(
      (l) =>
        edgeKinds.has(l.kind) &&
        keep.has(endId(l.source)) &&
        keep.has(endId(l.target)),
    );
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

      // Labels are lettered by hand: the face next/font put on <body>, fetched
      // now so the first sprite is not drawn in the fallback serif.
      const face = getComputedStyle(document.body)
        .getPropertyValue("--font-hand")
        .trim();
      if (face) {
        try {
          await document.fonts.load(`500 16px ${face}`);
          handFace.current = face;
        } catch {
          /* the serif will do */
        }
      }

      el.addEventListener("pointermove", (e: PointerEvent) => {
        pointer.current = { x: e.clientX, y: e.clientY };
        overCanvas.current = true;
        placeCard();
      });
      el.addEventListener("pointerleave", () => {
        overCanvas.current = false;
        setHovered(null);
      });

      const graph = new (ForceGraph3D as any)(el)
        .showNavInfo(false)
        .nodeLabel(() => "")
        .nodeRelSize(1)
        // Threads are pen lines: one pixel, each bowed its own way, never
        // quite straight. Opacity rides in the colour, per thread.
        .linkWidth(0)
        .linkOpacity(1)
        .linkCurvature((l: any) => 0.05 + ((linkSeed(l) % 1000) / 1000) * 0.18)
        .linkCurveRotation((l: any) => (linkSeed(l) % 6283) / 1000)
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
      graph.onEngineTick(updateTrail);

      // The walk's pencil line. Dashed, in the accent, drawn over everything.
      const trail = new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineDashedMaterial({
          dashSize: 5,
          gapSize: 3.5,
          transparent: true,
          opacity: 0.9,
          depthTest: false,
        }),
      );
      trail.geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(3 * 200), 3).setUsage(
          THREE.DynamicDrawUsage,
        ),
      );
      trail.geometry.setDrawRange(0, 0);
      trail.renderOrder = 10;
      trail.frustumCulled = false;
      trail.visible = false;
      graph.scene().add(trail);
      trailRef.current = trail;

      // The lasso: hold ⇧ and draw a ring round some stones with the pen. The
      // capture listener stops the orbit controls and node drag from seeing
      // the press, so the hand draws instead of the camera turning.
      const setLine = (pts: [number, number][], close: boolean) => {
        const d = pts.length
          ? `M${pts.map((q) => `${q[0]} ${q[1]}`).join("L")}${close ? "Z" : ""}`
          : "";
        lassoLine.current?.setAttribute("d", d);
      };
      let lassoTimer = 0;
      el.addEventListener(
        "pointerdown",
        (e: PointerEvent) => {
          if (!e.shiftKey || e.button !== 0) return;
          e.stopImmediatePropagation();
          e.preventDefault();
          window.clearTimeout(lassoTimer);
          const rect = el.getBoundingClientRect();
          lassoPts.current = [[e.clientX - rect.left, e.clientY - rect.top]];
          lassoInk.current?.setAttribute("d", "");
          lassoBox.current?.removeAttribute("data-gone");
          setLine(lassoPts.current, false);
        },
        { capture: true },
      );
      window.addEventListener("pointermove", (e: PointerEvent) => {
        const pts = lassoPts.current;
        if (!pts) return;
        const rect = el.getBoundingClientRect();
        const q: [number, number] = [e.clientX - rect.left, e.clientY - rect.top];
        const last = pts[pts.length - 1];
        if (Math.hypot(q[0] - last[0], q[1] - last[1]) < 2.5) return;
        pts.push(q);
        setLine(pts, false);
      });
      window.addEventListener("pointerup", () => {
        const pts = lassoPts.current;
        if (!pts) return;
        lassoPts.current = null;
        if (pts.length < 8) {
          setLine([], false);
          return;
        }
        // The hand's own line, inked: the same points as a pressed ribbon.
        const line = `M${pts.map((q) => `${q[0]} ${q[1]}`).join("L")}L${pts[0][0]} ${pts[0][1]}`;
        lassoInk.current?.setAttribute("d", ribbon(line, 2.4, pts.length));
        setLine([], false);
        const got = new Set<string>();
        for (const n of graph.graphData().nodes as Sim[]) {
          if (n.x === undefined) continue;
          const s = graph.graph2ScreenCoords(n.x, n.y, n.z);
          if (inside(s.x, s.y, pts)) got.add(n.id);
        }
        setGathered(got);
        lassoBox.current?.setAttribute("data-gone", "");
        lassoTimer = window.setTimeout(
          () => lassoInk.current?.setAttribute("d", ""),
          1500,
        );
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
  }, [placeCard, updateTrail]);

  // ── node objects, theme-aware (the drawings live in JS, so they are re-made) ──
  useEffect(() => {
    const graph = graphRef.current;
    const THREE = threeRef.current;
    const SpriteText = spriteRef.current;
    if (!graph || !THREE || !SpriteText || !ready) return;
    const p = themes[theme];

    graph
      .backgroundColor(p.bg)
      .nodeThreeObject((node: Sim) => {
        const group = new THREE.Group();
        const degree = node.degree ?? 0;
        const base = 5 + Math.sqrt(degree) * 2.8;
        const bucket = base < 8 ? 0 : base < 16 ? 1 : 2;
        const variant = seedOf(node.id) % 3;
        const ghost = node.kind === "ghost";
        const opacity = ghost ? 0.5 : degree === 0 ? 0.6 : 1;

        const material = new THREE.SpriteMaterial({
          map: discFor(node.kind, bucket, ghost ? "ghost" : "plain", variant),
          transparent: true,
          opacity,
          alphaTest: 0.04,
        });
        const stone = new THREE.Sprite(material);
        stone.scale.setScalar(base * (DISC / DISC_R));
        group.add(stone);

        const sprite = new SpriteText(
          node.label.length > 34 ? `${node.label.slice(0, 34)}…` : node.label,
        );
        sprite.color = p.ink;
        sprite.textHeight = 8.5;
        sprite.fontFace = handFace.current;
        sprite.fontWeight = "500";
        sprite.position.set(0, base * 1.35 + 5, 0);
        sprite.material.transparent = true;
        sprite.material.opacity = 0.85;
        sprite.visible = degree >= 7;
        group.add(sprite);

        objects.current.set(node.id, {
          group,
          material,
          sprite,
          kind: node.kind,
          bucket,
          variant,
        });
        return group;
      })
      .onNodeHover((node: Sim | null) =>
        setHovered(
          node && overCanvas.current && !flying.current ? node.id : null,
        ),
      )
      .onNodeClick((node: Sim) => setSelected(node.id))
      // Clicking empty ground puts the stone down, the way esc does.
      .onBackgroundClick(() => setSelected(null));

    const scene = graph.scene();
    scene.fog = new THREE.Fog(p.bg, p.fogNear, p.fogFar);
    trailRef.current?.material.color.set(p.accent);
    const again = [150, 700].map((ms) =>
      window.setTimeout(() => setRepaint((n) => n + 1), ms),
    );
    return () => again.forEach((t) => window.clearTimeout(t));
  }, [theme, ready, discFor]);

  // ── feed data in ────────────────────────────────────────────────────────
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !ready || !data) return;
    graph.graphData({ nodes: visible.nodes, links: visible.links });
  }, [visible, ready, data]);

  // ── threads respond to the focused stone ────────────────────────────────
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !ready) return;
    const p = themes[theme];
    const focus = selected;

    const touches = (l: any) =>
      !!focus && (endId(l.source) === focus || endId(l.target) === focus);

    graph
      .linkColor((l: any) =>
        touches(l)
          ? withAlpha(p.accent, 1)
          : withAlpha(p.link[l.kind] ?? p.link.link, focus ? 0.12 : 0.6),
      )
      .linkDirectionalParticles((l: any) => (touches(l) ? 3 : 0))
      .linkDirectionalParticleWidth(1.3)
      .linkDirectionalParticleSpeed(0.006)
      .linkDirectionalParticleColor(() => p.accent);
  }, [selected, theme, ready]);

  // ── hover, search and the lasso: mutate materials directly, no data round-trip ──
  useEffect(() => {
    if (!ready) return;
    const focus = hovered ?? selected;
    const near = new Set<string>(
      (focus ? (adjacency.get(focus) ?? []) : []).map((a) => a.node),
    );
    const lit = matches.size ? matches : gathered;
    const looking = lit.size > 0;

    for (const [id, o] of objects.current) {
      const node = master.current.get(id);
      if (!node) continue;
      const ghost = node.kind === "ghost";
      const isFocus = id === focus;
      const isNear = near.has(id);
      const isLit = lit.has(id);

      let opacity = ghost ? 0.5 : node.degree === 0 ? 0.6 : 1;
      if (focus) opacity = isFocus ? 1 : isNear ? 0.9 : 0.08;
      if (looking) opacity = isLit ? 1 : Math.min(opacity, 0.07);

      o.material.opacity = opacity;
      o.material.map = discFor(
        o.kind,
        o.bucket,
        (isLit || id === selected) && !ghost
          ? "lit"
          : ghost
            ? "ghost"
            : "plain",
        o.variant,
      );
      o.sprite.visible =
        isFocus ||
        isNear ||
        isLit ||
        (!focus && !looking && (node.degree ?? 0) >= 7);
      o.sprite.material.opacity = isFocus ? 1 : 0.8;
      const scale = isFocus ? 1.45 : isLit ? 1.2 : 1;
      o.group.scale.setScalar(scale);
    }
  }, [
    hovered,
    selected,
    adjacency,
    matches,
    gathered,
    ready,
    visible,
    discFor,
    repaint,
  ]);

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
    flying.current = true;
    setHovered(null);
    graph.cameraPosition(
      { x: node.x! * ratio, y: node.y! * ratio, z: node.z! * ratio },
      node,
      900,
    );
    const done = window.setTimeout(() => (flying.current = false), 950);
    return () => window.clearTimeout(done);
  }, [selected, ready]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = document.activeElement?.tagName === "INPUT";
      if (e.key === "Escape") {
        setSelected(null);
        setQuery("");
        setGathered(new Set());
      }
      if (e.key === "/" && !typing) {
        e.preventDefault();
        document.getElementById("niwa-search")?.focus();
      }
      // One step back the way you came, like the Mac app's ⌘[.
      if (e.key === "[" && !typing) {
        const w = walkRef.current;
        if (w.length >= 2) walkTo(w.length - 2);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [walkTo]);

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
  const hoveredNode = hovered ? nodeIndex.byId.get(hovered) : null;
  const breath = hoveredNode ? gist(hoveredNode) : "";
  const walkNodes = walk
    .map((id) => nodeIndex.byId.get(id))
    .filter((n): n is GardenNode => !!n);
  const gatheredNodes = useMemo(
    () =>
      [...gathered]
        .map((id) => nodeIndex.byId.get(id))
        .filter((n): n is GardenNode => !!n)
        .sort((a, b) => b.degree - a.degree),
    [gathered, nodeIndex],
  );
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

  const chip = (n: GardenNode, onPick: () => void) => (
    <button
      key={n.id}
      onClick={onPick}
      className="chip px-2 py-[3px] text-left text-[11px] leading-tight"
      style={{ color: "var(--muted)" }}
      title={n.description || n.label}
    >
      <span
        aria-hidden
        className="mr-1.5 inline-block align-middle"
        style={{
          width: 5,
          height: 5,
          borderRadius: 99,
          background: `var(--kind-${n.kind})`,
        }}
      />
      {n.label.length > 30 ? `${n.label.slice(0, 30)}…` : n.label}
    </button>
  );

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <div ref={mount} className="absolute inset-0" />

      {/* the lasso, drawn by hand over the stones */}
      <svg
        ref={lassoBox}
        aria-hidden
        className="lasso pointer-events-none absolute inset-0 z-[6] h-full w-full overflow-visible"
      >
        <path
          ref={lassoLine}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="4 3"
        />
        <path ref={lassoInk} fill="var(--accent)" />
      </svg>

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
              className="hand mt-1 max-w-[20rem] text-[15.5px] leading-[1.3]"
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
        <p
          className="hand mt-1.5 hidden text-[13.5px] sm:block"
          style={{ color: "var(--faint)" }}
        >
          hold ⇧ and draw a ring round stones to gather them
        </p>

        {searchResults.length > 0 && (
          <ul
            className="panel sketched pointer-events-auto relative mt-2 w-[19rem] p-1.5"
            style={{ borderRadius: 3 }}
          >
            <Sketch seed="found" draw />
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

        {/* what the hand circled */}
        {searchResults.length === 0 && gathered.size > 0 && (
          <section
            className="panel sketched pointer-events-auto relative mt-2 w-[19rem] px-3.5 py-3"
            style={{ borderRadius: 3 }}
            aria-label="Gathered"
          >
            <Sketch seed="gathered" draw />
            <div className="flex items-baseline justify-between gap-3">
              <span className="hand text-[15.5px]" style={{ color: "var(--ink)" }}>
                gathered {gatheredNodes.length}{" "}
                {gatheredNodes.length === 1 ? "stone" : "stones"}
              </span>
              <button
                onClick={() => setGathered(new Set())}
                className="meta"
                style={{ color: "var(--accent)" }}
              >
                let go
              </button>
            </div>
            {gatheredNodes.length > 0 ? (
              <div className="scroll-thin mt-2 flex max-h-[38dvh] flex-wrap gap-1.5 overflow-y-auto">
                {gatheredNodes.slice(0, 60).map((n) =>
                  chip(n, () => setSelected(n.id)),
                )}
                {gatheredNodes.length > 60 && (
                  <span className="meta self-center" style={{ color: "var(--faint)" }}>
                    +{gatheredNodes.length - 60}
                  </span>
                )}
              </div>
            ) : (
              <p className="hand mt-1 text-[14px]" style={{ color: "var(--muted)" }}>
                nothing inside the ring
              </p>
            )}
          </section>
        )}
      </header>

      {/* filters */}
      <section
        className="rise panel sketched pointer-events-auto absolute right-4 bottom-4 left-4 z-10 px-4 py-3 sm:right-auto sm:bottom-8 sm:left-8 sm:w-[23rem]"
        style={{ borderRadius: 3, animationDelay: "120ms" }}
        aria-label="Filters"
      >
        <Sketch seed="filters" />
        <div className="flex items-center gap-3">
          <button
            onClick={toggleFilters}
            aria-expanded={filtersOpen}
            aria-controls="niwa-filters"
            className="fold meta min-w-0 flex-1 text-left"
            style={{ color: "var(--faint)" }}
          >
            Beds &amp; threads
            {hiddenCount > 0 && (
              <span style={{ color: "var(--accent)" }}>
                {" "}
                · {hiddenCount} off
              </span>
            )}
          </button>
          {/* One press puts everything back: the struck chips are unstruck. */}
          {hiddenCount > 0 && (
            <button
              onClick={() => {
                setKinds(new Set(KIND_ORDER));
                setEdgeKinds(new Set(Object.keys(LINK_LABEL)));
                setShowOrphans(true);
              }}
              className="meta shrink-0"
              style={{ color: "var(--accent)" }}
            >
              all on
            </button>
          )}
          <button
            onClick={toggleFilters}
            aria-label={filtersOpen ? "Fold the filters" : "Unfold the filters"}
            className="fold fold-mark shrink-0"
            style={{ color: "var(--faint)" }}
          >
            {filtersOpen ? "−" : "+"}
          </button>
        </div>
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
                      opacity: on ? 1 : 0.75,
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
                    {!on && <Sketch kind="strike" seed={`bed-${k}`} draw />}
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
                    opacity: on ? 1 : 0.75,
                  }}
                  aria-pressed={on}
                >
                  {label}
                  {!on && <Sketch kind="strike" seed={`thread-${k}`} draw />}
                </button>
              );
            })}
            <button
              onClick={() => setShowOrphans(!showOrphans)}
              className="chip px-2 py-[3px] text-[10.5px]"
              style={{
                color: showOrphans ? "var(--ink)" : "var(--faint)",
                opacity: showOrphans ? 1 : 0.75,
              }}
              aria-pressed={showOrphans}
            >
              Unconnected {data?.stats.orphans}
              {!showOrphans && <Sketch kind="strike" seed="orphans" draw />}
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
              <span
                className="hand"
                style={{
                  fontSize: 13,
                  letterSpacing: 0,
                  textTransform: "none",
                  color: pulse ? "var(--ink)" : "var(--faint)",
                }}
              >
                {data.stats.live === false
                  ? `snapshot · ${new Date(data.stats.builtAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                  : pulse
                    ? "the garden moved"
                    : "watching disk"}
              </span>
            </div>
          </div>
        )}
      </footer>

      {/* the card that follows the pointer: what a stone is before it is opened */}
      {hoveredNode && hoveredNode.id !== selected && (
        <div
          ref={card}
          className="card fade pointer-events-none absolute top-0 left-0 z-30 w-[15.5rem] px-3.5 py-3"
          role="status"
        >
          <Sketch seed={hoveredNode.id} draw />
          <div
            className="meta flex items-center gap-2"
            style={{ color: "var(--faint)" }}
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: 99,
                background: `var(--kind-${hoveredNode.kind})`,
                display: "inline-block",
              }}
            />
            {KIND_LABEL[hoveredNode.kind] ?? hoveredNode.kind}
            <span className="ml-auto">{hoveredNode.degree} threads</span>
          </div>
          <div
            className="display mt-1.5 text-[16px] leading-[1.2] break-words"
            style={{ color: "var(--ink)" }}
          >
            {hoveredNode.label}
          </div>
          {breath && (
            <p
              className="mt-1.5 text-[11.5px] leading-[1.5]"
              style={{ color: "var(--muted)" }}
            >
              {breath}
            </p>
          )}
        </div>
      )}

      {selectedNode && (
        <Reader
          node={selectedNode}
          neighbours={neighbours}
          walk={walkNodes}
          onWalkTo={walkTo}
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
