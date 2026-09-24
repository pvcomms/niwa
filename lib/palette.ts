/**
 * One source of truth for colour. The 3D scene sets materials from JS, so a palette
 * that lived only in CSS would silently desync on theme change — these objects feed
 * both the `<style>` block in layout.tsx and every three.js material.
 */

export type ThemeName = "paper" | "sumi";

export type Palette = {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  faint: string;
  rule: string;
  accent: string;
  fogNear: number;
  fogFar: number;
  kind: Record<string, string>;
  link: Record<string, string>;
  /** The bearing's values, one hue per circle, in slot order. */
  value: string[];
};

/** Karesansui at noon: ink on bone, distance dissolving into paper. */
export const paper: Palette = {
  bg: "#F4F2ED",
  surface: "#FAF9F6",
  ink: "#23211E",
  muted: "#6B655C",
  faint: "#9A9287",
  rule: "#E2DED5",
  accent: "#B5532A",
  fogNear: 900,
  fogFar: 3200,
  kind: {
    project: "#2F3437",
    concept: "#B5532A",
    user: "#7B4B3A",
    feedback: "#5B6B52",
    reference: "#4A5A6B",
    routine: "#8A7549",
    meta: "#1A1815",
    note: "#6E6257",
    notion: "#3F6B66",
    garden: "#8E5B55",
    reading: "#8A6F84",
    agent: "#8C6A3F",
    repo: "#A8A49B",
    ghost: "#C6C0B4",
  },
  link: {
    link: "#9B9384",
    concept: "#C08A66",
    build: "#8E9C81",
    seed: "#BDB6A8",
    mention: "#B3AA98",
    twin: "#8FA8A3",
  },
  value: ["#B08A3E", "#4F5F8A", "#5E7A4E", "#7E5A78", "#3F6B66", "#8C5A45"],
};

/** The same garden after dark — sumi ink reversed, stones lit from within. */
export const sumi: Palette = {
  bg: "#16150F",
  surface: "#1F1E17",
  ink: "#EDE9DF",
  muted: "#A39C8E",
  faint: "#6F685C",
  rule: "#302E25",
  accent: "#D9763F",
  fogNear: 950,
  fogFar: 3400,
  kind: {
    project: "#A9A394",
    concept: "#D9763F",
    user: "#BC8064",
    feedback: "#8AA076",
    reference: "#7891AC",
    routine: "#B89751",
    meta: "#EDE9DF",
    note: "#948B7C",
    notion: "#7FA8A1",
    garden: "#C08A82",
    reading: "#B39AAE",
    agent: "#D0A468",
    repo: "#6A665C",
    ghost: "#413E35",
  },
  link: {
    link: "#7D7663",
    concept: "#B06B3F",
    build: "#748561",
    seed: "#514C3C",
    mention: "#666051",
    twin: "#5F7D78",
  },
  value: ["#D2AA5A", "#8393C4", "#8DAE78", "#B48AAD", "#7FA8A1", "#C4876A"],
};

export const themes: Record<ThemeName, Palette> = { paper, sumi };

export const KIND_ORDER = [
  "project",
  "concept",
  "user",
  "feedback",
  "reference",
  "routine",
  "note",
  "notion",
  "garden",
  "reading",
  "meta",
  "agent",
  "repo",
  "ghost",
] as const;

export const KIND_LABEL: Record<string, string> = {
  project: "Builds",
  concept: "Concepts",
  user: "Self",
  feedback: "Rules",
  reference: "Reference",
  routine: "Routines",
  note: "Fieldnotes",
  notion: "Notion",
  garden: "Garden notes",
  reading: "Reading",
  meta: "Root",
  agent: "Agents",
  repo: "Repos",
  ghost: "Unwritten",
};

export const LINK_LABEL: Record<string, string> = {
  link: "Written link",
  concept: "Shared vocabulary",
  build: "Points at code",
  seed: "Unplanted",
  mention: "Named in prose",
  twin: "Same document",
};

export const STAGE_LABEL: Record<string, string> = {
  fresh: "Fresh · 7d",
  tended: "Tended · 30d",
  settled: "Settled · 90d",
  fallow: "Fallow",
  unknown: "Undated",
};

/** Emitted into a server-rendered <style> so first paint already matches the theme. */
export function cssVars(p: Palette): string {
  const kinds = Object.entries(p.kind)
    .map(([k, v]) => `--kind-${k}: ${v};`)
    .join("");
  const values = p.value.map((v, i) => `--value-${i}: ${v};`).join("");
  return `--bg:${p.bg};--surface:${p.surface};--ink:${p.ink};--muted:${p.muted};--faint:${p.faint};--rule:${p.rule};--accent:${p.accent};${kinds}${values}`;
}
