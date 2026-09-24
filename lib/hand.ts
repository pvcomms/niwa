/**
 * Hand-drawn strokes. Every path is deterministic for its seed, so the server
 * and the client draw the same line and a re-render never redraws a border.
 * Amplitudes are in px and small on purpose: a line that wobbles more than a
 * pixel or two stops reading as drawn and starts reading as broken.
 */

export type Rand = () => number;
type Pt = [number, number];

/** mulberry32 — small, fast, and the same number sequence everywhere. */
export function rand(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable seed from a string, so a note's stroke is its own every time. */
export function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const f = (n: number) => String(Math.round(n * 10) / 10);
const spread = (r: Rand, amp: number) => (r() * 2 - 1) * amp;

/**
 * One pen stroke from a to b: a cubic whose control points sit a little off
 * the straight line, the pen starting and stopping just past the ends the way
 * a quick sketch does. Returns a segment beginning with its own M.
 */
export function stroke(
  a: Pt,
  b: Pt,
  r: Rand,
  wobble = 1.1,
  overshoot = 0,
): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const back = r() * overshoot;
  const past = r() * overshoot;
  const s: Pt = [a[0] - ux * back + nx * spread(r, wobble * 0.4), a[1] - uy * back + ny * spread(r, wobble * 0.4)];
  const e: Pt = [b[0] + ux * past + nx * spread(r, wobble * 0.4), b[1] + uy * past + ny * spread(r, wobble * 0.4)];
  // The bow: both control points lean the same way more often than not, so a
  // long side curves gently rather than kinking.
  const bow = spread(r, wobble);
  const t1 = 0.25 + r() * 0.15;
  const t2 = 0.6 + r() * 0.15;
  const c1: Pt = [
    a[0] + dx * t1 + nx * (bow + spread(r, wobble * 0.6)),
    a[1] + dy * t1 + ny * (bow + spread(r, wobble * 0.6)),
  ];
  const c2: Pt = [
    a[0] + dx * t2 + nx * (bow + spread(r, wobble * 0.6)),
    a[1] + dy * t2 + ny * (bow + spread(r, wobble * 0.6)),
  ];
  return `M${f(s[0])} ${f(s[1])}C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(e[0])} ${f(e[1])}`;
}

/** A box drawn as four strokes, each running a little past its corner. */
export function roughRect(
  w: number,
  h: number,
  seed: number,
  { wobble = 1.1, overshoot = 3, inset = 0.5 } = {},
): string {
  const r = rand(seed);
  const x0 = inset;
  const y0 = inset;
  const x1 = w - inset;
  const y1 = h - inset;
  return [
    stroke([x0, y0], [x1, y0], r, wobble, overshoot),
    stroke([x1, y0], [x1, y1], r, wobble, overshoot),
    stroke([x1, y1], [x0, y1], r, wobble, overshoot),
    stroke([x0, y1], [x0, y0], r, wobble, overshoot),
  ].join("");
}

/** Catmull-Rom through the points, as cubics — a smooth, continuous pen line. */
function smooth(pts: Pt[]): string {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/**
 * The circling: a loop around a w×h box that starts somewhere on the left,
 * goes once round, and runs past its own start — the way a word gets ringed
 * in a notebook. `pad` is how far outside the box the pen stays.
 */
export function roughEllipse(
  w: number,
  h: number,
  seed: number,
  { wobble = 1.3, pad = 4, steps = 14, grow = 1 } = {},
): string {
  const r = rand(seed);
  const cx = w / 2;
  const cy = h / 2;
  // An ellipse that only just clears a box cuts through its corners; `grow`
  // widens it so the ring passes outside the letters at the ends.
  const rx = (w / 2) * grow + pad;
  const ry = (h / 2) * (1 + (grow - 1) * 1.6) + pad * 0.8;
  const tilt = spread(r, 0.06);
  const a0 = Math.PI * (0.8 + r() * 0.4);
  const overlap = 1.08 + r() * 0.06;
  const pts: Pt[] = [];
  const n = Math.round(steps * overlap);
  for (let i = 0; i <= n; i++) {
    const a = a0 + (i / steps) * Math.PI * 2;
    const kx = rx + spread(r, wobble);
    const ky = ry + spread(r, wobble);
    const x = Math.cos(a) * kx;
    const y = Math.sin(a) * ky;
    pts.push([
      cx + x * Math.cos(tilt) - y * Math.sin(tilt),
      cy + x * Math.sin(tilt) + y * Math.cos(tilt),
    ]);
  }
  return smooth(pts);
}

/** A line drawn under something: a touch before, a touch after, a slight sag. */
export function roughUnderline(
  w: number,
  seed: number,
  { wobble = 0.8, y = 0 } = {},
): string {
  const r = rand(seed);
  return stroke([-1 - r() * 2, y], [w + 1 + r() * 2, y + spread(r, 0.8)], r, wobble, 0);
}

/**
 * A long vertical line, like the left edge of a sheet laid on the desk: long
 * lines drift slowly, so the wobble here is low-frequency and the pen lifts
 * once or twice on the way down.
 */
export function roughEdge(h: number, seed: number, { wobble = 1.4, x = 0.5 } = {}): string {
  const r = rand(seed);
  const pts: Pt[] = [];
  const step = 90;
  for (let y = -2; y <= h + 2; y += step) pts.push([x + spread(r, wobble), y]);
  pts.push([x + spread(r, wobble), h + 2]);
  return smooth(pts);
}

/** Where a hand would have set a stipple mark down: a little off, a little turned. */
export function jitter(seed: number, amp = 0.6, turn = 14) {
  const r = rand(seed);
  return { dx: spread(r, amp), dy: spread(r, amp), rot: spread(r, turn) };
}

/** Struck through: a line across the middle that rises a little to the right. */
export function roughStrike(w: number, h: number, seed: number, { wobble = 0.9 } = {}): string {
  const r = rand(seed);
  return stroke([-2 - r() * 2, h * 0.58], [w + 2 + r() * 2, h * 0.42], r, wobble, 0);
}

/**
 * A path from this file (M, C and L only, absolute), sampled into points per
 * subpath — the centreline a pen would have followed.
 */
function sample(d: string): Pt[][] {
  const subs: Pt[][] = [];
  let cur: Pt = [0, 0];
  let pts: Pt[] = [];
  const re = /([MCL])([^MCL]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const n = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (m[1] === "M") {
      if (pts.length > 1) subs.push(pts);
      cur = [n[0], n[1]];
      pts = [cur];
    } else if (m[1] === "L") {
      const b: Pt = [n[0], n[1]];
      for (let i = 1; i <= 3; i++) {
        const t = i / 3;
        pts.push([cur[0] + (b[0] - cur[0]) * t, cur[1] + (b[1] - cur[1]) * t]);
      }
      cur = b;
    } else {
      const [x1, y1, x2, y2, x, y] = n;
      for (let i = 1; i <= 10; i++) {
        const t = i / 10;
        const u = 1 - t;
        pts.push([
          u * u * u * cur[0] + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x,
          u * u * u * cur[1] + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y,
        ]);
      }
      cur = [x, y];
    }
  }
  if (pts.length > 1) subs.push(pts);
  return subs;
}

/**
 * The pen's pressure: a centreline turned into a filled ribbon that is thin
 * where the pen lands and lifts, fullest through the middle, and never quite
 * even — a few knots of pressure along the way, interpolated. `width` is the
 * width at full pressure. Each subpath is its own stroke.
 */
export function ribbon(d: string, width = 1.5, seed = 1): string {
  const r = rand(seed);
  const out: string[] = [];
  for (const pts of sample(d)) {
    const n = pts.length;
    const knots = [0, 1, 2, 3, 4].map(() => 0.78 + r() * 0.44);
    const left: Pt[] = [];
    const right: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0];
      let ty = b[1] - a[1];
      const len = Math.hypot(tx, ty) || 1;
      tx /= len;
      ty /= len;
      const t = i / (n - 1);
      const k = t * 4;
      const ki = Math.min(3, Math.floor(k));
      const press = knots[ki] * (1 - (k - ki)) + knots[ki + 1] * (k - ki);
      const w = Math.max(
        0.45,
        width * (0.42 + 0.58 * Math.pow(Math.sin(Math.PI * t), 0.5)) * press,
      );
      const nx = (-ty * w) / 2;
      const ny = (tx * w) / 2;
      left.push([pts[i][0] + nx, pts[i][1] + ny]);
      right.push([pts[i][0] - nx, pts[i][1] - ny]);
    }
    const poly = [...left, ...right.reverse()];
    out.push(`M${poly.map((q) => `${f(q[0])} ${f(q[1])}`).join("L")}Z`);
  }
  return out.join("");
}
