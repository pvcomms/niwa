---
title: The sieve — Bayes drawn as areas, built by hand; only the shaded areas compared
status: shipped
created: 2026-09-26
---

# 025 — The sieve

## Why

The ask, in the reader's words: "build your own diagram that helps u make visualizations of
bayes theorem and determine and compare relative probability to get towards the truth", with
two sketches of the mechanism from a primer — the population as a box, the hypotheses as
columns as wide as the prior (1 : 100, robbers to honest), the evidence as a shade down each
column (80% of robbers snoop, 10% of the honest do), and the posterior as the shaded areas
compared, written out beside the box as a ratio multiplied: prior odds × likelihood ratio =
posterior odds.

The instrument is that mechanism with the pen in the reader's hand. A question is put down
with the worlds that could answer it; each is given a width in parts, how the reader weighs
them before looking; then a sighting is sifted — for each world, how many in a hundred of it
would show what was seen — and the box shades that much of each column. What passes is the
shaded area, and only the areas are compared; the next sighting is sifted through what passed
the last. The garden's rule that the tool never decides holds because every number is the
reader's: the tool has no prior, asks no model, and what the desk reads back is the arithmetic
of the reader's numbers — see DECISIONS.

## What changes

- **A seventeenth view, `/sieve`, as one sheet.** Like the bearing: the drawing is the page.
  The question across the top in the display face, editable in place. Below it the ratio
  ladder on the left, the way the primer writes it — the worlds' names in the hand as small
  capitals, then _before 1 : 100_, _snooping 80 : 10_, a drawn rule, an arrow and _what passes
  80 : 1000 = 1 : 12.5_ — and the box drawn large on the right. Every number on the ladder is
  a field: click it, type, return. Under the box the sighting's caption (_sighting 1 · day ·
  what you saw_) and the steps as thumbnails — _before_, each sighting, _what passes_, and
  _+ sift_ — the chosen one framed in the accent. Below `xl` the ladder moves under the box so
  the box keeps the width.
- **The box.** Drawn with `lib/hand.ts` at 700 × 372: a rough frame, the lines between
  columns, each world's share and name above in the hand (staggered when narrow, a leader to a
  sliver); with a sighting on it, each column shaded from the top in that world's colour with
  the pen's edge along the shade, the percentage and the sighting's word in the shade, or
  beside a sliver with a leader. Drag the line between two columns to reweigh them (the pair
  keeps its parts between them; only before looking or on the first sighting, since later
  widths are what passed); drag a shade's edge to say again how much passes.
- **Drafts.** The page opens on the last question kept; when nothing is kept, on the snooper
  from the primer, as a draft. _New question_, _the snooper_ and _the quiet one_ (the shy
  student at the party, 1 : 10 and 75 : 15) on the desk each put a draft on the sheet; a draft
  is played with freely and written to disk only on _keep this question_. A kept question saves
  on every change. Opened from a stone (`?id=`, _sift it_ from the reader and the catalogue
  page), the draft's question is the stone's first line.
- **Sifting.** _+ sift_ adds a sighting at even shades and puts the pen in its caption; drag
  the shades or type the numbers; the ladder says what it weighs before anything else does.
  _Take it back_ (twice) removes any sighting. _+ world_ and _×_ (twice) add and remove worlds;
  every sighting gains or loses its column.
- **The desk.** _The reading_: _before looking, robber : honest at 1 : 100 · 1 sighting
  sifted: ‘snooping’ passed 80 in 100 of robber and 10 in 100 of honest — 8 to 1 for robber ·
  what passes, by your numbers: 1 : 12.5 — robber 7.4 in 100, honest 92.6 in 100 · honest was
  widest before looking and is widest now · for robber to draw level with honest would take a
  sighting weighing 12.5 to 1 for it_; when the widest column changed hands, after what; the
  sighting that weighed most; the values leaned on. _On the sieve_: every question kept, the
  whole sieve counted, and the three starts. _What the sieve holds to_, said plainly.
- **Two boundaries.** A shade stops at 1 and 99: a world that says never cannot come back, and
  one that says always has stopped looking. A width is any positive number of parts.
- **Kept as files.** One markdown file per question in `niwa-vault/content/sieve/`
  (`NIWA_SIEVE_DIR`): the question as a section, the sightings as dated `###` entries with
  what passed of each world in the heading; the worlds and their parts in the frontmatter.
- **The specimen.** Under `NIWA_MODE` the route serves Specimen A's two questions — its quiet
  junior, sifted twice, and the primer's snooper — and the sample values, read-only; drafts can
  be played with there but not kept.
- **No model.** The route has no POST. Nothing proposes a width or a shade.

The first version of this view, shipped earlier the same day, put the question, the worlds,
the boxes and the sift in four panels with sliders, and drew the boxes small. The reader used
it and said so. The rebuild put the drawing back at the centre, the way the sketch has it.

## Files

| File                                                                  | Change                                                                                                                                                                                       |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/sieve.ts`                                                        | the clamps, what passes and the reduction, the stages in order, the drag between two columns, the tally (turns, the heaviest, what it would take to draw level), the readings, the file form |
| `lib/sieve.test.ts`                                                   | 9 tests: the clamps, the primer's numbers, sifting in sequence, the tally and readings (no verdict word), a turn, the whole sieve, the drag, the round-trip, validation                      |
| `lib/sieve-store.ts`                                                  | one file per question, `NIWA_SIEVE_DIR`                                                                                                                                                      |
| `content/sieve.ts`                                                    | Specimen A's two questions                                                                                                                                                                   |
| `app/api/sieve/route.ts`                                              | GET (questions, values, `?id=` about), PUT, DELETE; 404 deployed                                                                                                                             |
| `app/sieve/page.tsx`, `components/Sieve.tsx`                          | the route and the view; the box, the arithmetic, the dials, the desk                                                                                                                         |
| `components/ViewSwitch.tsx`, `lib/margin.ts`, `scripts/NiwaApp.swift` | seventeenth tab, the view's name, ⌘S                                                                                                                                                         |
| `components/Reader.tsx`, `components/Page.tsx`                        | _sift it_                                                                                                                                                                                    |
| `content/notice.ts`                                                   | the sieve's card, step and key                                                                                                                                                               |
| `app/globals.css`                                                     | the shade settling, rows, the parts typed not spun, the boxes arriving                                                                                                                       |
| `docs/ARCHITECTURE.md`, `DECISIONS.md`, `CHANGELOG.md`, `README.md`   | the map, the decision, the entry, the section                                                                                                                                                |

## Out of scope

A default prior, a suggested likelihood, or a model asked for either. Calling any world
likely. A calibration score. Continuous evidence (a shade is one number per world). More than
five worlds. The horizontal form of the same diagram (rows instead of columns) — one
orientation, kept consistent.

## Acceptance checks

Run on 2026-09-26 against the garden's own dev server on 127.0.0.1:5050 and a frozen
hard-linked copy (`NIWA_MODE=public`) on 127.0.0.1:5079.

```bash
pnpm test
# tsc clean · 172 pass · 0 fail (lib/sieve.test.ts: 9)

curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/sieve
# 200
curl -s 127.0.0.1:5050/api/sieve
# sieves 0 · values [taste, privacy, uncertainty, kindness, individuality] · writable true · dir ~/personal/garden/niwa-vault/content/sieve
curl -s '127.0.0.1:5050/api/sieve?id=project_claude_code_hooks_mcp'
# about: { id, label 'claude-code-hooks-mcp server', first '…' }

# frozen
curl -s 127.0.0.1:5079/api/sieve
# sieves [(2026-09-22-is-the-quiet-junior-lost-or-quiet, 2 sightings), (2026-09-20-someone-round-the-side-of-the-house, 1)] · values [craft, candour, curiosity, care, quiet] · writable false · dir null
# PUT 404 · DELETE 404 · /sieve 200 · 0 home paths in the page
```

- [x] The primer's question typed, _robber_ and _honest_ named, parts 1 and 100; the box
      before looking drew the sliver with its leader (_<1% robber_, _>99% honest_); _put it on
      the sieve_ wrote `2026-09-26-someone-is-snooping-round-the-side-of-the-house-at-night.md`
      with the worlds in the frontmatter
- [x] _Snooping…_ sifted at 80 : 10: the sliver shaded to 80 with the number beside it, honest
      shaded to 10 with _10% Snooping: along…_ in the shade; the arithmetic read _before 1 :
      100 · passes 80 : 10 · what passes 80 : 1000 = 1 : 12.5_; what passes drew 7.4 : 92.6; the
      file gained `### 2026-09-26 · passes 80 : 10`; the reading as in the spec, _8 to 1 for
      robber_, _12.5 to 1_ to draw level
- [x] A shade's edge dragged to 51: the box, the arithmetic and the reading followed and the
      file was rewritten; a line between columns dragged: the pair kept its total (1 + 100 →
      21 + 80 → 7 + 94), the parts fields followed — after a fix: the field had kept its own
      text and lagged the drag, so it now shows the parts as kept unless focused
- [x] The URL-sync effect had depended on the whole question and rewrote the address on every
      pointer move during a drag; narrowed to the slug and title
- [x] _Another world_: three columns with staggered names, the reading _7 : 94 : 1_ and _1.6 to
      1 for robber_ across the three; _×_ twice took it off and every sighting lost its column
- [x] The list: the row with its bar and _1 : 8.56_, _1 sifted_; paper and sumi both hold;
      375px scrollWidth 375 on the list and on an open question
- [x] The notice test passes with the sieve's card and step; the readings name no verdict
      (tested)

## Notes

The readings say _widest_ rather than _leads_ or _ahead_ because a column's width is a fact
about the reader's parts and the other words start to sound like a race. _What it would take
to draw level_ is stated as a ratio and never as a thing to go and look for; the tack is the
view for that. The drag on the line between two columns rounds to whole parts once the pair
holds twenty or more, and to tenths below, because those are the numbers a person would have
typed.
