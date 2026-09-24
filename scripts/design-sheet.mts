/**
 * The design sheet for 010 — one SVG, drawn by the same generator the app
 * uses, so what is on the sheet is what the garden draws. Import it into
 * Figma (drag onto the canvas): text becomes text layers, strokes stay paths.
 *
 *   node --experimental-strip-types scripts/design-sheet.ts
 *   → docs/design/sketched.svg
 */
import { writeFileSync } from "node:fs";
import {
  ribbon,
  roughEdge,
  roughEllipse,
  roughRect,
  roughStrike,
  roughUnderline,
  seedOf,
  jitter,
  rand,
} from "../lib/hand.ts";
import { paper, sumi, KIND_LABEL, type Palette } from "../lib/palette.ts";

const W = 1440;
const SERIF = "Instrument Serif, Georgia, serif";
const MONO = "JetBrains Mono, ui-monospace, monospace";
const HAND = "Caveat, cursive";
const SANS = "General Sans, Instrument Sans, sans-serif";

const out: string[] = [];
const el = (s: string) => out.push(s);
const pen = (p: Palette) => `${p.ink}e6`;
// Every line is a pressed ribbon: the centreline from the generator, inked.
const path = (d: string, fill: string, w = 1.6) =>
  `<path d="${ribbon(d, w, d.length)}" fill="${fill}"/>`;
const text = (
  x: number,
  y: number,
  s: string,
  { font = SANS, size = 12, fill = "#000", extra = "" } = {},
) =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" fill="${fill}" ${extra}>${s.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`;
const meta = (x: number, y: number, s: string, fill: string) =>
  text(x, y, s.toUpperCase(), { font: MONO, size: 10, fill, extra: 'letter-spacing="1.4"' });

/** A chip: hairline pill with a label; on = ringed, off = struck, plain = as is. */
function chip(
  x: number,
  y: number,
  label: string,
  p: Palette,
  state: "on" | "off" | "plain" = "plain",
  ring = p.accent,
) {
  const w = 14 + label.length * 6.2;
  const h = 20;
  el(
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${state === "on" ? ring + "22" : "none"}" stroke="${state === "on" ? "none" : p.rule}"/>`,
  );
  el(text(x + 7, y + 13.5, label, { size: 10.5, fill: state === "off" ? p.faint : p.ink }));
  const g = `<g transform="translate(${x} ${y})">`;
  if (state === "on") el(g + path(roughEllipse(w, h, seedOf(label), { pad: 3, grow: 1.18 }), ring) + "</g>");
  if (state === "off") el(g + path(roughStrike(w, h, seedOf(label)), pen(p)) + "</g>");
  return w;
}

function section(y: number, title: string, note: string, p: Palette) {
  el(text(64, y, title, { font: SERIF, size: 26, fill: p.ink }));
  el(text(64, y + 22, note, { font: HAND, size: 17, fill: p.muted }));
  return y + 48;
}

// ── the sheet ──────────────────────────────────────────────────────────────
const p = paper;
let y = 80;
el(`<rect width="${W}" height="2140" fill="${p.bg}"/>`);
el(text(64, y, "庭", { font: SERIF, size: 44, fill: p.ink }));
el(meta(120, y - 18, "niwa · 010 sketched", p.accent));
el(text(120, y + 4, "Drawn, not computed. Every line here is lib/hand.ts, the generator the app runs — pressed, not ruled.", { font: HAND, size: 18, fill: p.muted }));
el(meta(W - 64, y - 18, "2026-09-24 · paper", p.faint).replace("<text", '<text text-anchor="end"'));

// 1 · the strokes
y = section(y + 70, "The strokes", "Four gestures a hand makes in a notebook, and one edge. Same seed, same line — a border never redraws on a re-render.", p);
const strokes: [string, string, (w: number, h: number, s: number) => string][] = [
  ["box", "a panel, each side run a little past its corner", (w, h, s) => roughRect(w, h, s)],
  ["ring", "circled — this one, these", (w, h, s) => roughEllipse(w, h, s, { pad: 3, grow: 1.18 })],
  ["underline", "which one, of several", (w, h, s) => roughUnderline(w, s, { y: h - 0.5 })],
  ["strike", "crossed out — not this", (w, h, s) => roughStrike(w, h, s)],
];
strokes.forEach(([name, note, fn], i) => {
  const x = 64 + i * 330;
  el(meta(x, y, name, p.faint));
  el(text(x, y + 16, note, { font: HAND, size: 15, fill: p.muted }));
  const w = 180;
  const h = 44;
  el(`<g transform="translate(${x} ${y + 30})">` + path(fn(w, h, seedOf(name)), pen(p)) + "</g>");
  el(text(x + 14, y + 57, name === "strike" ? "Unconnected 99" : name === "ring" ? "Notion 171" : name === "underline" ? "garden" : "Beds & threads", { size: 11, fill: p.ink }));
  // the same stroke at 1.6×, so the pressure can be read
  el(`<g transform="translate(${x} ${y + 100}) scale(1.6)">` + path(fn(w, h, seedOf(name)), pen(p), 1.6) + "</g>");
});
const edgeX = 64 + 4 * 330 - 60;
el(meta(edgeX, y, "sheet edge", p.faint));
el(`<g transform="translate(${edgeX + 4} ${y + 30})">` + path(roughEdge(150, seedOf("edge"), { x: 2 }), pen(p)) + "</g>");
y += 220;

// 2 · type
y = section(y, "Four voices", "Serif names things. Mono is the system speaking. The hand is the gardener in the margin. Sans reads.", p);
el(text(64, y + 30, "The garden at noon", { font: SERIF, size: 30, fill: p.ink }));
el(meta(64, y + 52, "Instrument Serif · titles, 庭 目録", p.faint));
el(text(420, y + 22, "609 STONES · 1276 THREADS", { font: MONO, size: 10, fill: p.muted, extra: 'letter-spacing="1.4"' }));
el(text(420, y + 40, "8 OF 24 TERMS SIGNED", { font: MONO, size: 10, fill: p.accent, extra: 'letter-spacing="1.4"' }));
el(meta(420, y + 60, "JetBrains Mono · labels, counts, paths", p.faint));
el(text(760, y + 28, "Everything you know you know, drawn as one garden.", { font: HAND, size: 17, fill: p.muted }));
el(text(760, y + 50, "walked  one stone › the next › the one after", { font: HAND, size: 15, fill: p.faint }));
el(meta(760, y + 70, "Caveat 400–600 · marginalia, captions, map labels", p.faint));
el(text(1180, y + 26, "The first breath of a note: its first sentence,", { size: 11.5, fill: p.muted }));
el(text(1180, y + 44, "cut at a hundred and twenty characters.", { size: 11.5, fill: p.muted }));
el(meta(1180, y + 70, "General Sans · body", p.faint));
y += 120;

// 3 · the pieces
y = section(y, "The pieces", "What the garden is made of, sketched. Everything here is in the app today.", p);
// filters panel
{
  const x = 64;
  const w = 368;
  const h = 266;
  el(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${p.surface}"/>`);
  el(`<g transform="translate(${x} ${y})">` + path(roughRect(w, h, seedOf("filters")), pen(p)) + "</g>");
  el(meta(x + 16, y + 24, "Beds & threads · 2 off", p.faint));
  el(text(x + w - 22, y + 25, "−", { font: MONO, size: 13, fill: p.faint }));
  el(meta(x + 16, y + 52, "Beds", p.faint));
  let cx = x + 16;
  let cy = y + 62;
  const beds: [string, "on" | "off" | "plain"][] = [["Builds 123", "plain"], ["Concepts 24", "plain"], ["Self 8", "plain"], ["Rules 19", "plain"], ["Reference 12", "plain"], ["Fieldnotes 33", "plain"], ["Notion 171", "plain"], ["Garden notes 75", "plain"], ["Reading 23", "plain"], ["Root 2", "plain"], ["Agents 1", "plain"], ["Repos 98", "off"], ["Unwritten 20", "off"]];
  for (const [b, s] of beds) {
    const cw = 14 + b.length * 6.2;
    if (cx + cw > x + w - 16) { cx = x + 16; cy += 26; }
    chip(cx, cy, b, p, s);
    cx += cw + 6;
  }
  cy += 40;
  el(meta(x + 16, cy - 4, "Threads", p.faint));
  cx = x + 16; cy += 6;
  for (const t of ["Written link", "Shared vocabulary", "Points at code", "Unplanted", "Named in prose", "Same document", "Unconnected 99"]) {
    const cw = 14 + t.length * 6.2;
    if (cx + cw > x + w - 16) { cx = x + 16; cy += 26; }
    chip(cx, cy, t, p, "plain");
    cx += cw + 6;
  }
  el(text(x, y + h + 22, "The filters. Everything is on by default, so", { font: HAND, size: 15, fill: p.muted }));
  el(text(x, y + h + 40, "the gesture is for what is off: struck through,", { font: HAND, size: 15, fill: p.muted }));
  el(text(x, y + h + 58, "drawn on when you click.", { font: HAND, size: 15, fill: p.muted }));
}
// hover card
{
  const x = 480;
  const w = 248;
  const h = 118;
  el(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${p.surface}"/>`);
  el(`<g transform="translate(${x} ${y})">` + path(roughRect(w, h, seedOf("card")), pen(p)) + "</g>");
  el(`<circle cx="${x + 18}" cy="${y + 20}" r="3" fill="${p.kind.project}"/>`);
  el(meta(x + 28, y + 24, "Builds", p.faint));
  el(meta(x + w - 14, y + 24, "2 threads", p.faint).replace("<text", '<text text-anchor="end"'));
  el(text(x + 14, y + 48, "A stone, hovered", { font: SERIF, size: 16, fill: p.ink }));
  el(text(x + 14, y + 68, "What the note says first, before it is opened:", { size: 11.5, fill: p.muted }));
  el(text(x + 14, y + 85, "a sentence and a half of it, then the rest", { size: 11.5, fill: p.muted }));
  el(text(x + 14, y + 102, "left for the reader…", { size: 11.5, fill: p.muted }));
  el(text(x, y + h + 22, "The card that follows the pointer over a stone: what it is, before it is opened.", { font: HAND, size: 15, fill: p.muted }));
  // view switch + segmented
  const vy = y + 170;
  el(`<rect x="${x}" y="${vy}" width="196" height="26" rx="13" fill="${p.surface}cc" stroke="${p.rule}"/>`);
  el(text(x + 12, vy + 17, "庭", { font: SERIF, size: 11, fill: p.ink }));
  el(meta(x + 28, vy + 17, "garden", p.ink));
  el(`<g transform="translate(${x + 28} ${vy + 8})">` + path(roughUnderline(50, seedOf("garden"), { y: 12 }), p.accent) + "</g>");
  el(text(x + 96, vy + 17, "目録", { font: SERIF, size: 11, fill: p.faint }));
  el(meta(x + 122, vy + 17, "catalogue", p.faint));
  const sy = vy + 40;
  el(meta(x, sy + 15, "Sort", p.faint));
  el(`<rect x="${x + 40}" y="${sy}" width="220" height="24" rx="12" fill="none" stroke="${p.rule}"/>`);
  let sx = x + 52;
  for (const [o, on] of [["Place", true], ["Title", false], ["Tended", false], ["Threads", false]] as [string, boolean][]) {
    el(text(sx, sy + 16, o, { size: 11, fill: on ? p.ink : p.faint }));
    if (on) el(`<g transform="translate(${sx} ${sy + 8})">` + path(roughUnderline(o.length * 6, seedOf("Sort-place"), { y: 11 }), p.accent) + "</g>");
    sx += o.length * 6 + 18;
  }
  el(text(x, sy + 52, "Which one, of several: underlined.", { font: HAND, size: 15, fill: p.muted }));
  el(text(x, sy + 70, "Rings are for these, strikes for not these.", { font: HAND, size: 15, fill: p.muted }));
}
// catalogue: h1 + bed chips + field
{
  const x = 780;
  el(text(x, y + 26, "Every note in the garden,", { font: SERIF, size: 26, fill: p.ink }));
  el(text(x, y + 56, "each one shown against", { font: SERIF, size: 26, fill: p.ink }));
  el(text(x + 272, y + 56, "the whole.", { font: SERIF, size: 26, fill: p.ink }));
  el(`<g transform="translate(${x + 278} ${y + 34})">` + path(roughEllipse(94, 30, seedOf("the-whole"), { pad: 3, grow: 1.18 }), p.accent) + "</g>");
  let cx = x;
  const cy = y + 84;
  for (const [b, s, k] of [["Notion 171", "on", "notion"], ["Garden notes 75", "on", "garden"], ["Reading 23", "plain", "reading"], ["Builds 123", "plain", "project"]] as [string, "on" | "plain", string][]) {
    el(`<circle cx="${cx + 8}" cy="${cy + 10}" r="2.5" fill="${p.kind[k]}"/>`);
    cx += chip(cx, cy, "   " + b, p, s, p.kind[k]) + 6;
  }
  el(text(x, cy + 42, "Beds are opt-in here, so the chosen ones are ringed in their own colour.", { font: HAND, size: 15, fill: p.muted }));
  // the field: stipple
  const fy = cy + 66;
  el(meta(x, fy, "The whole · one mark per note, set down by hand", p.faint));
  let fx = x;
  const r = rand(7);
  for (const [k, n] of [["project", 123], ["concept", 24], ["user", 8], ["feedback", 19], ["reference", 12], ["note", 33], ["notion", 60]] as [string, number][]) {
    const cols = Math.min(n, 24);
    el(meta(fx, fy + 20, `${KIND_LABEL[k]} ${n}`, p.faint));
    for (let i = 0; i < n; i++) {
      const j = jitter(seedOf(`${k}${i}`), 0.5, 16);
      const mx = fx + (i % cols) * 8 + j.dx;
      const my = fy + 28 + Math.floor(i / cols) * 8 + j.dy;
      const lit = r() > 0.55;
      el(`<rect x="${mx}" y="${my}" width="6" height="6" rx="1.5" fill="${lit ? p.kind[k] : p.rule}" transform="rotate(${j.rot} ${mx + 3} ${my + 3})"/>`);
    }
    fx += cols * 8 + 22;
    if (fx > 1330) break;
  }
}
y += 350;

// 4 · the stones
y = section(y, "The stones", "Discs drawn on paper: inked round with a pen that presses unevenly, hatched away from the light. Labels lettered by hand. Both themes.", p);
function stones(x0: number, y0: number, pal: Palette, seed: number) {
  const r = rand(seed);
  const pts: [number, number, number, string][] = [];
  const kinds = Object.keys(pal.kind).filter((k) => k !== "ghost" && k !== "repo");
  for (let i = 0; i < 26; i++) {
    pts.push([x0 + 40 + r() * 560, y0 + 30 + r() * 200, 4 + r() * r() * 16, kinds[Math.floor(r() * kinds.length)]]);
  }
  for (let i = 0; i < 34; i++) {
    const a = pts[Math.floor(r() * pts.length)];
    const b = pts[Math.floor(r() * pts.length)];
    if (a === b) continue;
    // threads bow a little, each its own way
    const mx = (a[0] + b[0]) / 2 + (r() - 0.5) * 40;
    const my = (a[1] + b[1]) / 2 + (r() - 0.5) * 40;
    el(`<path d="M${a[0]} ${a[1]}Q${mx} ${my} ${b[0]} ${b[1]}" fill="none" stroke="${pal.link.link}" stroke-opacity="0.6" stroke-width="0.9"/>`);
  }
  for (const [cx, cy, rad, k] of pts) {
    const c = pal.kind[k];
    const id = `d${Math.round(cx)}${Math.round(cy)}`;
    // the disc, hatched away from the light, then inked round with pressure
    el(`<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${rad}"/></clipPath>`);
    el(`<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${c}" fill-opacity="0.92"/>`);
    const gap = rad > 12 ? 3.2 : 2.4;
    for (let k2 = rad * 0.05; k2 <= rad; k2 += gap) {
      const ox = cx + k2 * 0.7071;
      const oy = cy + k2 * 0.7071;
      el(`<line x1="${ox - rad}" y1="${oy + rad}" x2="${ox + rad}" y2="${oy - rad}" stroke="${pal.ink}" stroke-opacity="0.26" stroke-width="0.7" clip-path="url(#${id})"/>`);
    }
    el(`<g transform="translate(${cx - rad - 2} ${cy - rad - 2})">` + path(roughEllipse(rad * 2 + 4, rad * 2 + 4, seedOf(id), { pad: 0, wobble: 0.6, steps: 18 }), `${pal.ink}e0`, rad > 12 ? 1.3 : 1) + "</g>");
    if (rad > 11) el(text(cx, cy - rad - 6, KIND_LABEL[k], { font: HAND, size: 14, fill: pal.ink, extra: 'text-anchor="middle" font-weight="500"' }));
  }
}
el(`<rect x="64" y="${y}" width="640" height="260" fill="${paper.bg}" stroke="${paper.rule}"/>`);
stones(64, y, paper, 3);
el(`<rect x="736" y="${y}" width="640" height="260" fill="${sumi.bg}"/>`);
stones(736, y, sumi, 3);
el(text(64, y + 282, "paper — ink on bone", { font: HAND, size: 15, fill: paper.muted }));
el(text(736, y + 282, "sumi — ink reversed, the rim lit", { font: HAND, size: 15, fill: paper.muted }));
y += 320;

// 5 · ink
y = section(y, "Ink", "Colour is lib/palette.ts and nowhere else. The pen is the ink let down to 90%; the paper has tooth at 6%.", p);
let sx = 64;
for (const [name, v] of [["bg", p.bg], ["surface", p.surface], ["ink", p.ink], ["muted", p.muted], ["faint", p.faint], ["rule", p.rule], ["accent", p.accent], ["pen", pen(p)]]) {
  el(`<rect x="${sx}" y="${y}" width="72" height="44" fill="${v}" stroke="${p.rule}"/>`);
  el(meta(sx, y + 60, name, p.faint));
  el(text(sx, y + 74, v, { font: MONO, size: 9, fill: p.faint }));
  sx += 84;
}
sx = 64;
for (const k of Object.keys(p.kind)) {
  el(`<circle cx="${sx + 8}" cy="${y + 108}" r="7" fill="${p.kind[k]}" stroke="${p.ink}" stroke-opacity="0.85"/>`);
  el(meta(sx + 22, y + 112, KIND_LABEL[k] ?? k, p.faint));
  sx += 98;
}
y += 150;
el(text(64, y, "The Center's identity is 'drawn, not computed' — brush-pen ribbon strokes, hand stipple. Niwa is its sibling: the same hand, a finer pen, on a dry garden.", { font: HAND, size: 16, fill: p.faint }));
el(text(64, y + 24, "Hold ⇧ and draw a ring round stones to gather them; the ring you draw is inked the same way. Every stone opened is a step on a pencil trail; [ walks back.", { font: HAND, size: 16, fill: p.faint }));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="2140" viewBox="0 0 ${W} 2140" font-family="${SANS}">\n${out.join("\n")}\n</svg>\n`;
writeFileSync(new URL("../docs/design/sketched.svg", import.meta.url), svg);
console.log(`docs/design/sketched.svg · ${(svg.length / 1024).toFixed(0)} KB`);
