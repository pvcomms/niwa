---
title: Sketched — the garden drawn by hand, and a way to walk it
status: shipped
created: 2026-09-24
---

# 010 — Sketched

## Why

The garden was computed to the pixel: smooth spheres, ruled hairlines, one system voice in
mono. That is honest about what it is — a graph — and cold about what it is for, which is
one person reading their own notes. The Center's identity is "drawn, not computed"; Niwa
is its sibling and had none of the hand in it.

Two things were also missing from how it is driven. Hovering a stone dimmed the others and
said nothing about the stone; you had to open it to learn what it was. And opening stones
one after another left no trace: there was no way back along the path you had walked.

## What changes

- **One generator, `lib/hand.ts`.** Seeded strokes (mulberry32, seed from the id of the
  thing being framed): a box whose sides run past their corners, a ring that closes past
  its own start, an underline, a strike, a long sheet edge, and a stipple jitter. Same seed,
  same line, so a border never redraws on a re-render and the server and client agree.
  `ribbon()` turns any centreline into the pen's pressure: a filled shape, thin where the
  pen lands and lifts, fullest through the middle, with a few knots of pressure along it.
- **`components/Sketch.tsx`** lays one ribbon over its parent and re-draws only when the
  parent changes size. `draw` reveals the ink through a mask that is the same line stroked
  wide and drawn from one end (`pathLength=1`, dash offset — the one stroke property that
  animates here, because the line *is* the motion).
- **A grammar for the marks.** Underline = which one of several (view tabs, group/sort).
  Ring = these, chosen (catalogue bed chips, which are opt-in). Strike = not these (the
  garden's filters, which are all on by default). The catalogue's headline rings
  "the whole" in the accent.
- **Stones are drawn, not modelled.** Each is a disc drawn on a canvas — filled in its
  bed's colour, hatched on the side away from the light, inked round the edge with a pen
  that presses unevenly and runs a little past its own start — used as a sprite that
  always faces the reader. One drawing per kind × size × state × variant (378 at most),
  cached per theme. A lit stone (searched, gathered, or open) is ringed in the accent.
  Labels are lettered in Caveat.
- **Threads are pen lines**: one pixel, each bowed its own way (`linkCurvature` and
  `linkCurveRotation` from the thread's seed), with per-thread opacity carried in the
  colour so the ones touching the open stone stay full while the rest fade.
- **A fourth voice.** Caveat (`--font-hand`) for marginalia: the masthead blurb, the
  colophon's "watching disk", the field's captions, empty-state notes, "In the whole".
- **Paper grain**: one fixed sheet of SVG noise at 6% (multiply on paper, screen on sumi).
- **The hover card.** Over a stone: bed, threads, title, the first breath of the note, in a
  sketched box that follows the pointer. Placed on every pointer move without a render.
  Hover only counts while the pointer is on the canvas and the camera is at rest, so a
  stone passing under a still pointer during a fly, or behind an open sheet, is not "hovered".
- **The walk.** Every stone opened is remembered in order. The reader shows
  `walked A › B › C`; each step is a button that returns there and forgets what came after.
  `[` steps back one, the way `⌘[` does in the Mac app. The walk is also drawn on the map:
  a dashed pencil line in the accent through the stones in order, over everything, re-laid
  on every engine tick while the stones settle.
- **The lasso.** Hold ⇧ and draw a ring round some stones. A capture-phase listener on the
  canvas stops the orbit controls and node drag from seeing the press, so the hand draws
  instead of the camera turning. On release the ring is inked (the same `ribbon()`), every
  visible stone whose screen position falls inside it is gathered, the rest of the garden
  dims, and a panel lists what was circled. `esc` or "let go" clears it.
- **The sheets** (reader, catalogue page) carry a drawn left edge instead of a ruled one,
  kept in a sticky zero-height wrapper so it stays put while the sheet scrolls.
- **The design sheet.** `scripts/design-sheet.mts` renders `docs/design/sketched.svg` from
  the same generator: strokes at 1× and 1.6×, the four voices, the pieces, the stones in
  both themes, the ink. Drag it onto the Figma file `庭 niwa — sketched`
  (`ObusrDL0a1SlB6GvsFkCgy`) and text stays text, strokes stay paths. The Figma MCP write
  tool ran into the Starter plan's call cap this session, so the file is empty until then.

## Where

| File                          | Change                                                    |
| ----------------------------- | --------------------------------------------------------- |
| `lib/hand.ts`, `hand.test.ts` | the strokes; deterministic, bounded                       |
| `components/Sketch.tsx`       | the overlay, and `SheetEdge`                              |
| `components/Garden.tsx`       | drawn discs, pen threads, hover card, walk + trail, lasso |
| `components/Reader.tsx`       | sheet edge, the walk row, hand marginalia                 |
| `components/Catalogue.tsx`    | ringed beds, underlined group/sort, "the whole" ringed    |
| `components/Page.tsx`         | sheet edge, hand "In the whole"                           |
| `components/Field.tsx`        | each mark set down a little off and turned                |
| `components/ViewSwitch.tsx`   | underline for the current view                            |
| `app/layout.tsx`, `globals.css` | Caveat, `--pen`, grain, `.sketch`, `.card`, `.walk-step` |
| `scripts/design-sheet.mts`    | `docs/design/sketched.svg`                                |

## Out of scope

Dashed threads by kind — the installed 3d-force-graph has no `linkLineDash`; kinds stay
told apart by colour. Editing. Figma frames built by the MCP — blocked by the plan cap,
not by the design.

## Acceptance checks

Run on 2026-09-24.

```bash
pnpm test
# ℹ tests 48 · pass 48 · fail 0   (tsc clean first)

node --experimental-strip-types scripts/design-sheet.mts
# docs/design/sketched.svg · 311 KB

curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/ ; curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/catalogue
# 200
# 200
```

- [x] Every stone is a drawn disc — inked edge, hatching — and labels are in the hand face
- [x] ⇧-drag draws a ring; on release it is inked, the stones inside are listed and the rest dim
- [x] Hovering a stone shows the card; it does not show over an open sheet or during a fly
- [x] Clicking a filter off strikes it through, drawn on; the fold header counts it
- [x] Opening three stones in turn shows `walked A › B › C` and a dashed trail through them
      on the map; `[` returns to B and drops C
- [x] Catalogue: "the whole" ringed; a chosen bed ringed in its colour; group/sort underlined
- [x] Sumi: rim lit, grain screened, and with a search open 606 of 609 stones stay dimmed
      after the theme rebuilds them; 375px: nothing overflows, the ring row is not clipped
