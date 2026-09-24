---
title: The flow — the threads given a direction, so a stone's roots and reach can be read
status: shipped
created: 2026-09-24
---

# 013 — The flow

## Why

paramv.com's third figure is an influence graph: eleven names around "me", each edge one
way or both, with a caption for every node — _kierkegaard → me, one way_; _the feed ↔ me,
both ways_. The site's own audit called it the figure that was overclaiming: the edges are
asserted, the nodes are chosen, and "both ways" was a metaphor until the captions were
made honest. It is a good figure about the wrong dataset.

The garden has the right one. Its threads are real (726 written links, 218 names in
prose, 193 shared terms, 95 pointers at code, 32 seeds, 14 twins), they were made one at
a time by writing, and each has a direction that was never drawn: a note that cites a
thing was fed by it. Given that direction, the figure becomes an instrument rather than a
portrait, and it answers the question a decision actually turns on — _what does this
thought rest on, and has any of it moved?_ — with structure the garden already holds.

## What changes

- **A fifth view, `/flow`.** Every thread is oriented: a note that links to, names or
  seeds a thing was fed by it; a term practised in a note fed the note; a note that points
  at code fed the code; twins feed each other. `lib/flow.ts` builds the directed graph
  and walks it. All of it runs in the browser on the garden it already fetches; there is
  no new route and nothing is written.
- **One stone at the centre.** What flowed into it fans out to the left by hop, what it
  flowed into to the right; eight to a column, sorted by how much each moves, with _and n
  more_ for the rest. Threads are pen arrows in their kind's colour, the garden's own (a
  legend sits under the sheet), drawn on wave by wave; the ones that run both ways are in
  the accent with a head at each end. Fallow stones are drawn hollow, unwritten ones
  dashed. Hover a stone and its whole path to the centre lights while the rest dims; the
  card gives its bed, stage, date, the thread it has to the centre, and how much it rests
  on and moves. Hover an arrow to name it: _named in prose · A → B_. Click a stone to walk
  to it; stones that stay on the sheet slide to their new places rather than jumping. The
  walk is kept — _walked A › B › C_ — and `[` steps back. `?id=` puts any stone at the
  centre, and the reader and the catalogue's page both carry an **in the flow** chip.
- **The reading.** Sentences about the structure, none of them a grade, each rooted-ness
  and reach set against the rest of the garden so a number means something:
  _rests on 14 stones within two hops, 6 of them directly — more rooted than 91% of the
  garden · its roots are mostly your own
  writing — 3 of 14 are things you read · 4 of its roots have gone fallow — premises that
  may have moved since · 1 of its roots was never written down · X is a linchpin: 5 roots
  reach this only through it · 2 of its roots are fed by it in turn — a loop · runs both
  ways with Y · flows into 3 stones directly, 11 within two hops — more than 62% of the
  garden; change it and they move._
  Under it, the lists: the fallow roots with their hop and date, the unwritten ones, the
  linchpins with their counts, what runs both ways, the loops, and what would move.
- **Two hops, not six.** In a garden this connected, everything reaches nearly everything
  within six hops — the first build reported 263 for every concept, which is true and
  useless. Roots, reach, fallow, unwritten and linchpins are read within two hops (a root
  and what fed it); the six-hop walk is kept only to find loops, which can be long.
- **The influences, from data.** _What shaped the most_ (by two-hop reach) and _what runs
  both ways_ (by mutual threads) — the site's list, measured. **Vocabulary threads** can
  be struck off, since shared terms link a great deal and sometimes the question is about
  what was read and written rather than what was named.
- **The Mac app** gets ⌘5.

## Where

| File                                | Change                                                    |
| ----------------------------------- | --------------------------------------------------------- |
| `lib/flow.ts`, `flow.test.ts` | orientation, the walks, foundations, context, readings, influences |
| `app/flow/page.tsx`                 | the route                                                 |
| `components/Flow.tsx`               | the sheet, the walk, the desk                             |
| `components/ViewSwitch.tsx`         | fifth tab                                                 |
| `components/Reader.tsx`, `Page.tsx` | "in the flow"                                             |
| `scripts/NiwaApp.swift`             | ⌘5                                                        |
| `app/globals.css` | the sheet's draw-on, the slide |
| `lib/palette.ts` | thread colours emitted as `--link-*` |

## Out of scope

Weighting threads by kind or age. A "me" node — the garden has no single stone that is the
reader, and pretending one is would put the site's portrait back. Decisions set down on the
bearing as stones in the flow (they are not garden stones yet; see 011). Automatic
suggestions of what to reread.

## Acceptance checks

Run on 2026-09-24.

```bash
pnpm test
# ℹ tests 77 · pass 77 · fail 0   (tsc clean first)

curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/flow
# 200
```

- [x] A centre with roots shows them to the left by hop and what it feeds to the right;
      arrows point the way influence runs; the ones that run both ways are in the accent
- [x] Hovering a stone lights its path to the centre and names it, its thread and how much
      it rests on and moves; hovering an arrow names it; clicking walks to it, the stones
      that stay slide, and `[` walks back; `?id=` opens on that stone
- [x] The reading names fallow roots, unwritten roots, a linchpin, loops and reach, each
      with its list, and none of it is a grade
- [x] Striking vocabulary threads changes the roots and the influences
- [x] Sumi and 375px hold
