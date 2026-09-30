---
title: The canon — which stories the garden tells, as strands grown from what is most reached for
status: shipped
created: 2026-09-30
---

# 038 — The canon

## Why

The ask, in the reader's words: build the canon in niwa. It comes from the Epistemic Garden's
lab notes (_discovering the postrat canon in the community archive_, lab notes #4): take the
hundred tweets most quoted by the archive's own users, gather what quotes each and its semantic
neighbours (about seventy to thirty), have a model rate each strand on cohesion, evolution and
utility, and have it mark ten touchpoints. Their word for the result is metabolising: separating
the wheat from the chaff so a community can digest what it has made.

The garden has the same material and none of the move. Six hundred stones and twelve hundred
threads, and no view that asks which stories they add up to. The InPhO note of 29 Sep named the
gap: every thread relates a note to a note, nothing relates a body of notes to a story, and the
statistics may only choose which question to put to the reader. So the method comes across with
each judgement handed back: the garden counts and gathers; the reader says what is canon.

## What changes

- **A view, `/canon`.** One sheet and a desk.
- **The roots.** Every stone three or more others reach for — a written link, its name in prose,
  its term in use — up to a hundred, most reached-for first, each with how it is reached for
  (_1 links to it · 46 use the term_). The order is a count and the desk says so.
- **The strand, drawn along time.** Grown from a root: what reaches for it, above a hand-drawn
  line, at the day each first appears in git; its nearest kin by words below, at most five, with
  the words each shares. Where a day is crowded the marks step aside and their stems slant back.
  A stone dated only by its last change is drawn dashed.
- **Touchpoints.** Ring up to ten by clicking a stone or its row. The garden offers a few, dashed,
  each with why — _the first on record, 5 Sep_ · _13 stones reach for it too_ · _threaded to 5
  others in the strand_ — chosen by position only; nothing is kept until it is rung.
- **Not the story.** Strike a stone; it stays on the record, faint.
- **Three questions**, each beside the facts that bear on it: _Is it one story?_ (threads inside
  the strand, how many came in on words alone) · _Did the idea move along it?_ (the span in days,
  the touchpoints along it) · _Is it of use?_ (the builds it reaches). Three words each and a line
  in the reader's words.
- **The story**, in the reader's words, and **the call**: into the canon, or leave it out; or keep
  it on the record uncalled. Taking it off the record asks once more.
- **Since it was kept.** A kept strand is a snapshot. Opened again, it reads what has come to reach
  for the root since and what has stopped, and the new ones can be taken in.
- **The reading**, facts only: _grown from The Delegation Discount · 15 stones reach for it (5 link
  to it, 10 name it) · 5 kin by words · first on record 3 Aug 2026 · the latest 22 Sep 2026 · 50
  days between · 8 of them first appear on the same day, 19 Sep 2026 · the strand's stones thread
  each other 37 times, the root not counted · put to work: 3 builds reached from the strand · 2
  touchpoints of at most 10 · one story? one story · in the canon since 30 Sep_. The same-day line
  is there because a folder imported at once draws a line that looks like an idea moving.
- **The record**: strands looked at, in and out, touchpoints kept, how many of the garden's stones
  the canon holds, how many of the roots have been looked at.
- **Kept as files.** One markdown file per strand in `niwa-vault/content/canon/`
  (`NIWA_CANON_DIR`): the name, the story, the stones as bullets marked with how each got in, its
  day, touchpoint or struck, and the id in backticks; the three answers and the call in the
  frontmatter. A file written by hand with bare dates or unmarked bullets reads.
- **The specimen.** Under `NIWA_MODE` the route serves Specimen A's two strands read-only: what
  leaves the studio, in the canon with three touchpoints; the year by the harbour, left out as more
  than one story.
- Every stone's reader and catalogue page carry _its strand_, which opens `/canon?id=`. The notice
  gets the canon's card, a step of the round and ⌘N; the margin knows the view's name; the Mac app
  gets ⌘N. No model is asked. No palette entry: the marks use ink, muted, faint and the accent.

## What it deliberately does not do

It does not say which strands belong in the canon, whether a strand is one story, whether it moved
or whether it is of use. It does not treat a stone as more important for being reached for. It does
not read a strand's kin as meaning the same thing: kin is shared vocabulary, shown with the words.
It asks no model, where the method it comes from asked one for every rating.

## Where

| File | Change |
| --- | --- |
| `lib/canon.ts`, `lib/canon.test.ts` | the kept strand, its file, touchpoints offered and toggled, since kept, the span and the crowded day, readings, the record; 7 tests |
| `lib/canon-strand.ts` | who reaches for whom, the roots, the strand; server-side because it reads the word index |
| `lib/canon-store.ts` | one file per strand |
| `app/api/canon/route.ts`, `app/canon/page.tsx`, `components/Canon.tsx` | the route (memoised against the fingerprint), the page, the sheet and desk |
| `content/canon.ts` | Specimen A's two strands; the sheet's words; what it holds to |
| `components/ViewSwitch.tsx`, `lib/margin.ts`, `scripts/NiwaApp.swift` | the tab, the view's name, ⌘N |
| `components/Reader.tsx`, `components/Page.tsx` | _its strand_ on every stone |
| `content/notice.ts` | the card, a step of the round, the key |
| `app/globals.css` (`.cn-*`) | the rows, the rings, the drawing |
| `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `CHANGELOG.md` | the map, the decision, the entry |

## Out of scope

A model asked to rate a strand or pick its touchpoints. Strands grown from two roots at once, or
merged. A relation between strands. The canon on the public garden's graph.

## Acceptance checks

Run on 2026-09-30 from a clean worktree at ab03de2 carrying only the canon's hunks, against the
launchd stand on 127.0.0.1:5050 and a second stand of the worktree under `NIWA_MODE=public` on :5099.

```bash
pnpm test
# tsc clean · 282 pass · 0 fail (lib/canon.test.ts: 7)
curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/canon
# 200
curl -s -o /dev/null -w '%{http_code} %{time_total}\n' '127.0.0.1:5050/api/canon?root=garden:the-delegation-discount'
# 200 0.026
```

- [x] `/api/canon` on :5050: 100 roots, the first _Git_ at 47 (1 links to it, 46 use the term); the
      strand from The Delegation Discount: 15 reachers, 5 kin by words, 37 threads inside it, 3
      builds; the reading carries _8 of them first appear on the same day, 19 Sep 2026_
- [x] on :5050, two stones rung, one struck, _one story_ marked, _into the canon_: the address
      moved to `?slug=2026-09-30-the-delegation-discount`, the file written to
      `niwa-vault/content/canon/` with `call: in`, `one: one`, two `touchpoint` and one `struck`
      bullet; reopened, the drawing rings and labels both, the shelf lists it, the reading ends
      _since it was kept: nothing has come to reach for it or stopped_; _take it off the record_
      asked _sure?_ and on the second press the file was gone (the test strand removed)
- [x] sumi reads; 375px holds (main scrollWidth 375), the drawing scrolls in its own frame
- [x] under `NIWA_MODE=public` on :5099: `/canon` 200, `writable: false`, 0 roots, Specimen A's two
      strands (in, out), PUT 404, DELETE 404, 0 home paths in the page; every `/api/canon` request
      200 and no console error from the view (the only 500s were `/api/garden` on `/`, which needs
      the baked snapshot a fresh worktree does not have)

## Notes

Built while two other sessions worked in the same tree: one shipped the forecast as 036 and one
the panel as 037, both taken from the same Epistemic Garden reading, so this is 038 and takes ⌘N
(the panel took ⌘K). Committed from a clean worktree carrying only the canon's hunks.
