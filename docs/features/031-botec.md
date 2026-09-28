---
title: The botec — a back-of-the-envelope calculation on every view: a thing worked out from rough guesses, and how far the answer could run
status: shipped
created: 2026-09-29
---

# 031 — The botec

## Why

The ask, in the reader's words: a back-of-the-envelope calculation — "a rough quantitative model
used to estimate social return on investment or order-of-magnitude values using simplified
assumptions", the kind global health, philanthropy and physics use "to quickly compare potential
benefits against costs" — as "a BOTEC button everywhere so can quickly map out any thing".

Two things follow from "everywhere" and "quickly". The envelope has to open over whatever is being
looked at, without leaving it, the way the margin does (018): a tab at the page's edge and a key
on every view, remembering what was on the desk. And it has to take rough numbers as they are
said — 3M, 20 to 50, 1 in 30, £40 an hour — without a form.

A back-of-the-envelope calculation is Fermi's: break the thing into parts you can guess, guess
each, multiply. The garden adds one thing to the envelope a pencil cannot: a guess may be a range,
and the ranges are carried through, so the answer comes back as a spread rather than a number with
false precision — the convention of Hubbard's calibration training and of Guesstimate and
Squiggle, where "20 to 50" is the middle nine in ten of what a quantity could be. Benefits against
costs is the same arithmetic with a line across the answer: what comes back divided by what goes
in, and the line at 1.

## What changes

- **A tab on every view, and the backslash.** Under the margin's tab at the page's edge; the
  backslash opens it from anywhere the reader is not typing (the back of an envelope); esc closes
  it. It remembers the view it was started at, its address, and what was on the desk — a stone,
  a fence, a claim. The margin and the envelope take turns: one opening closes the other. A
  stone's reader and its catalogue page carry _botec it_, which opens the envelope about that
  stone.
- **The envelope.** The question in the display face, then the lines in the hand, each a sign,
  what the line is and its number, and where the page stands after it. Lines are taken down the
  page in order — times, unless the line says divided by, plus or minus — so ((10 + 5) × 2 − 4) ÷ 2
  is written the way it is said. A sign typed before a line's words is its sign (`/ people to a
household`); a click on the sign turns it. Typing `=` as a line's number breaks it down into
  lines of its own, worked out first and indented under it; ↵ on an empty indented line takes it
  back out. ↵ adds the next line, ⌫ on an empty one takes it off, ⌘↵ keeps.
- **Numbers as said.** `3M`, `2.5M to 3M`, `2 to 3M` (a suffix on the top end is read on both),
  `20–50`, `1 in 20 to 1 in 5`, `3-10%`, `£40 an hour`, `2e6`, `2×10^6`, `1/3`, `~30`, `between 4
and 6 weeks`. Words after a number are its unit, kept and not checked. What reads as no number is
  underlined and said so.
- **Every number is a handle.** Once a line's number reads as one, it is shown as it was
  understood, and each end is dragged sideways: by ratio for a number above nothing (ninety pixels
  doubles it), by odds for a share (so a share stays a share), by amount otherwise; ⇧ or ⌥ for fine.
  A dragged number lands on two figures. ↑ ↓ move a range by a tenth, ⇧ by ten times. The scale
  holds still while a number is dragged, so the dots can be seen to move.
- **The spread.** A range is the middle nine in ten of what the line could be — by ratio when both
  ends are above nothing, by odds when both are shares strictly between nothing and all, evenly
  otherwise, held at nothing when written from nothing up. Five thousand draws are taken, each
  line's laid evenly through its own range and shuffled against the others' (a Latin hypercube, in
  twenty lines), seeded by where the line sits: a line written 20 to 50 draws 20 to 50, and a
  number dragged moves the answer without dealing the other lines again.
- **The answer, as a hundred dots.** The middle and where nine in ten of the draws fall, in the
  hand, with the unit typed beside it; a quantile dotplot — a hundred dots, each a hundredth of the
  draws, stacked where they fall on a scale by ratio — with the middle marked under it. One number
  with no spread is one dot.
- **The ladder.** On the sheet, beside each line, where the page stands after it on the envelope's
  one scale: the number travelling from what you start from to the answer, a line broken down drawn
  in pencil, the answer in the accent. On a narrow sheet or in the strip, the same in words (≈ 1.1M).
- **What it leans on.** Each range taken from its bottom to its top with every other line at its
  middle, and how far the answer runs across it, widest first, drawn on the answer's scale; a click
  puts the cursor on that line's number.
- **A line across it.** Dragged across the dots, or typed, and named in the reader's words — _it
  pays for itself_ at 1, say. The dots on each side are inked and faint, and the count is written on
  the line: 38 above · 62 below.
- **Keep, and afterwards.** Kept from the strip or the sheet as one file; the strip holds the
  envelope in the browser until it is kept or let go (a draft with words on it asks once before it is
  let go). On the sheet, a kept envelope saves as it is changed, and afterwards takes what it came to
  and when, drawn as a flag among the dots, and a note.
- **A twenty-third view, `/botec`.** The envelope at full size with the ladder; the desk: the
  reading, the record of every envelope kept — where it was started, the answer and its range, what
  it came to — and what the botec holds to. An empty sheet draws Fermi's piano tuners in Chicago.

## What it deliberately does not do

It does not supply a number: no model is asked, no base rate is looked up, and the example is
labelled as one. It does not say whether a thing is worth doing or whether an estimate is good: the
readings say where the answer lands, how far it could run, what it leans on and how many draws fall
above the reader's line, which is the reader's. Afterwards, what it came to is placed among the
draws and the record counts how many came in under, inside and over the middle nine in ten — counts,
as the overview keeps them, never an accuracy. It does not check units: they are words kept beside
the number. It does not rank envelopes against each other; the record is in the order they were
touched.

## Files

| File                                                                  | Change                                                                                                                                                                                                             |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/botec.ts`                                                        | reading a guess and writing one back; the spread and the draws; working the lines down the page; the summary and the dots; what it leans on; the scale; the lines as a tree; the readings and the record; the file |
| `lib/botec.test.ts`                                                   | 10 tests: guesses as written, the spread's ends, the working in order, dragging without re-dealing, the swing, the readings (no verdict word), the drawing, the tree, the record, the file                         |
| `lib/botec-store.ts`                                                  | one file per envelope, `NIWA_BOTEC_DIR`                                                                                                                                                                            |
| `content/botec.ts`                                                    | Specimen A's two envelopes; Fermi's piano tuners for an empty sheet                                                                                                                                                |
| `app/api/botec/route.ts`                                              | GET (the envelopes; `?head=1` whether this garden keeps), PUT, DELETE; the specimen and 404s when deployed                                                                                                         |
| `components/Envelope.tsx`                                             | the envelope, shared: the folds, the lines, the handles, the ladder, the dots, the line across, what it leans on                                                                                                   |
| `components/BotecStrip.tsx`, `app/layout.tsx`                         | the tab and the strip on every view, the backslash, the draft in the browser                                                                                                                                       |
| `app/botec/page.tsx`, `components/Botec.tsx`                          | the sheet and the desk: afterwards, the reading, the record, what it holds to                                                                                                                                      |
| `components/MarginStrip.tsx`                                          | the margin and the envelope take turns                                                                                                                                                                             |
| `components/ViewSwitch.tsx`, `lib/margin.ts`, `scripts/NiwaApp.swift` | twenty-third tab, the view's name, ⌘=                                                                                                                                                                              |
| `components/Reader.tsx`, `components/Page.tsx`                        | _botec it_ on every stone                                                                                                                                                                                          |
| `content/notice.ts`                                                   | the botec's card, step and keys                                                                                                                                                                                    |
| `app/globals.css`                                                     | the tab, the strip, the folds, the rows and handles, the dots, the swing, the record                                                                                                                               |
| `docs/ARCHITECTURE.md`, `DECISIONS.md`, `CHANGELOG.md`, `README.md`   | the map, the decision, the entry, the section                                                                                                                                                                      |

## Out of scope

Units checked or converted. Correlated guesses — two lines that rise together are drawn as if they
were not; a line that depends on another is written as its own line. Formulas that refer to other
lines by name; the envelope is taken down the page. Distributions other than the three a range
implies. A model proposing a line or a number. Envelopes compared against each other.

## Acceptance checks

Run on 2026-09-29 against the garden's own dev server on 127.0.0.1:5050.

```bash
pnpm test
# tsc clean · tests 221 · pass 221 · fail 0 (lib/botec.test.ts: 10; the notice test with the botec's card)

curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/botec
# 200
curl -s 127.0.0.1:5050/api/botec
# botecs 0 · writable true · dir ~/personal/garden/niwa-vault/content/botec
curl -s '127.0.0.1:5050/api/botec?head=1'
# {"writable":true}

NIWA_MODE=public npx next build          # in a scratch worktree carrying the change
# compiles; ○ /botec · ƒ /api/botec among the routes
NIWA_MODE=public npx next start --port 5079   # then:
curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5079/botec
# 200
curl -s 127.0.0.1:5079/api/botec
# botecs 2 (Specimen A: the Friday file check · the Harlow hours) · writable false · dir null
curl -s -o /dev/null -w '%{http_code}\n' -X PUT 127.0.0.1:5079/api/botec -d '{"botec":{"question":"x"},"fresh":true}'
# 404
curl -s -o /dev/null -w '%{http_code}\n' -X DELETE '127.0.0.1:5079/api/botec?slug=x'
# 404
# /botec, /api/botec, /notice and /catalogue bodies: 0 home paths
```

- [x] An empty sheet draws Fermi's piano tuners: _the middle of 5,000 draws is 130 tuners; nine in
      ten fall between 52 and 310 · … it leans most on ‘households with a piano’_; the ladder runs
      2.7M → 1.1M → 110k → 81k → 130
- [x] Dragging the top of _1 in 20 to 1 in 5_ ninety pixels right wrote _1 in 3_ and the answer,
      the ladder and the reading followed (≈ 170); on a kept envelope a drag wrote the file in
      place (_1 in 14 to 1 in 5_)
- [x] ↵ on the last indented line added one beside it; ↵ on the empty one took it back out; `/ a
    tuner's share of the work` came in as ÷; `=` as its number broke it down; `60-90%` read as a
      share (≈ 0.79)
- [x] _+ a line across it_ put the line at the middle; dragged to 450 it read _15 above · 85
      below_ and faded the dots under it
- [x] _Keep this envelope_ wrote `2026-09-29-how-many-piano-tuners-work-in-chicago.md`; _it came
      to 290_ wrote `came: 290` and `came_on`, the flag stood among the dots, and the reading said
      _it came to 290 tuners: inside where nine in ten of the draws fell; 92 in 100 came in under
      it_; the record: _1 looked up afterwards: 1 inside the middle nine in ten of its draws_
- [x] On the fence, the backslash (sent as a key event — the browser pane cannot type one) and the
      tab each opened the strip _at the fence · about The gate across the lane to the top field._
      with the cursor in the question; five lines typed with ↵ and ⇥ came to ≈ 460, nine in ten
      between 220 and 980; ⌘↵ kept it with `view`, `url` and `about` in the frontmatter; after a
      reload on the catalogue the strip still held it, and _on the sheet →_ led to it
- [x] _botec it_ on a catalogue page opened the strip _about Cognitive Sovereignty_; the
      apostrophe closed the envelope and opened the margin, the backslash the other way round
- [x] Over the garden, `/` typed into a line stayed in the line; a draft with words on it asked
      _let this one go — sure?_ before it went
- [x] Sumi holds; at 375px the lines take two rows each and the page is 375 wide; one number with no
      spread draws one dot
- [x] _Take it off the record_, twice, on both — the record read _nothing kept yet_; the store's
      `botec/` directory removed and `content/`'s mtime restored: the vault's listing, mtimes and
      git status matched the snapshot taken before the run
- [x] The Mac app rebuilt with ⌘= (`showBotec` in both binaries, /Applications and the Desktop)

## Notes

The draws are a Latin hypercube: each line's five thousand standard normals are one per equal slice
of the curve (Acklam's inverse, in the file), shuffled by a seed from where the line sits. A line's
own draws are then its range almost exactly — _20 to 50_ draws 20.006 to 49.976 — which is what a
reader checking the ladder against what they typed expects. Measured over two hundred seeds,
independent draws put the same line's ends about 1% off (2% at the 95th), enough to turn a written
50 into a shown 49.

Shares are spread by odds rather than by ratio so a range like 50% to 90% does not draw past all;
a range written up to 100% or from 0% is spread evenly and held at the ends.

`next build` warns that the store's filesystem reads trace the whole project, as every store in the
garden does; the deployed route never reaches them. The browser pane's own key sender sends an
empty key for a backslash, so the key was checked with a dispatched event; the tab was clicked.
