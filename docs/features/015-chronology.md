---
title: The chronology — a life as a number line, with the conditions it was lived under
status: shipped
created: 2026-09-24
---

# 015 — The chronology

## Why

The standalone chronology (`pvcomms/chronology`) is one HTML file and one JSON file: an age
axis with a clock or a proportional scale, lanes for the conditions a person lived under,
hatched gaps where the record stops, a reminiscence bump, and a draggable present. It draws a
synthetic life and its own roadmap names what it cannot do: load a person's own dated notes
(001), add and edit in the page (002), zoom and pan and mark a stretch as a period (003), and
be addressed by event id from another instrument (004). Its data must be written as JSON with
ages hand-computed, and there is nowhere for anything to be kept.

The garden has all of that already: flat files beside the vault, a desk that writes them,
stones an entry can be bound to, and — because the garden reads dated notes — a record of
which days the reader's own writing speaks of. So the instrument moves in. The ask, in the
reader's words: place events, see the part against the whole, gauge, make intuitive
associations, and see the inner life and the physical life against actual events,
constraints and trajectory. The tool draws what is set down and reads it back; it never
grades a life.

## What changes

- **A seventh view, `/chronology`.** A number line with the inner life above it and the
  world below, in lanes the reader names. A day is a hand-drawn mark sized by how large it
  looms (1 to 3, the reader's number); a stretch is a bar, with `›` when it has not ended; a
  day of coarse precision — `c. 2011`, `Jun 2019` — is placed at the middle of the period it
  names and drawn with a whisker across it. An entry set down ahead of today is hollow and
  dashed: expected, not happened.
- **Two scales.** Clock gives every year the same width. Proportional gives year _n_ a width
  proportional to ln(1 + n), so childhood widens, and runs linearly before birth so
  inherited things have a place. Both invert exactly, and the window is kept in time across
  a switch. `t` toggles; it needs a birth day.
- **The circumstances**, over the lanes: _structure_ (what was simply the case) and
  _conjuncture_ (the weather of the era) as bands packed into rows so two that overlap never
  print on one line; _happenings_ as dated public events on a rule. And **gaps**: a stretch
  the record does not speak for, hatched across every lane and named for why — no record,
  refused, unexamined.
- **The present**, draggable. Everything past it greys; the reading says what was so at that
  day — the conditions live, the entries that year, the age. Click the axis to set it; _back
  to today_ brings it home. Today stays marked as a dashed tick while it is elsewhere.
- **Zoom and pan.** ⌘ or ctrl with the wheel — a pinch on a trackpad — zooms about the
  pointer, down to a fortnight; a plain wheel scrolls the page as it does everywhere else;
  drag pans; sideways wheel pans; `=` and `-` zoom about the centre; `0` is the whole life. Ticks thin from days to decades as the window
  widens; ages sit under the years. A strip at the bottom is the whole life with the window
  bracketed on it — click it to go there, drag it to pan.
- **Setting down.** Double-click the line where something happened and an entry opens on the
  desk with the day and the lane already filled from where the click landed. Drag a mark to
  re-date it; its precision and its length are kept. The desk edits title, when, until
  (`now` for not ended), lane, how large it looms, _would you have it again?_ (yes / no /
  unsure, asked and never totalled), tags, the stones it is bound to, and the note. _Take it
  back_ asks twice. Every entry is one markdown file at
  `niwa-vault/content/chronology/entries/<slug>.md`; the slug is the year and the title,
  once, and does not change on a retitle. The birth day, horizon, scale and lanes are
  `life.json`. `NIWA_CHRONOLOGY_DIR` moves the folder.
- **The garden's own dates.** Under the lanes a strip ticks every day the garden's notes
  speak of — a date written in a note's prose, in the year the note was last changed unless
  that would put it more than a month ahead — and the day each note was last touched. Hover
  names the notes; click sets that day down with those notes already bound. _Its dates_ from
  the reader and the catalogue page opens the line through one stone: its days in the accent,
  the entries bound to it ringed.
- **Gauging.** Hover an entry with another chosen and the card says how they sit: _during
  First job_, _11 months after Panic attack_, _right after First job ended_, _holds_,
  _runs into_. The desk repeats it.
- **The reading.** Facts, none of them a verdict: _26 set down: 8 inner, 9 in the world, 8
  of the circumstances, 1 gap named · from c. 1988 to 24 Sep 2026 — 38 years and 9 months
  of record, from age 0 · today, age 38: under First-generation university family and Feed
  era · the longest stretch set down is First job — 10 years and 7 months · between Sep 1997
  and Jan 2002 nothing is set down — 4 years and 4 months the record does not speak for · 1
  set down ahead of today — expected, not happened · 15 were written down more than a year
  after they happened · asked whether you would have it again: 4 yes, 1 no, 0 unsure._
- **The layers**: circumstances, the reminiscence bump (ages 10–30, shaded so a cluster of
  memories there reads as the expected shape rather than a finding), the garden strip,
  expected entries, labels — each struck through when off, remembered in the browser.
- **The life** is editable on the desk: born, horizon, the lanes (add, rename, inner or
  world, remove when empty).
- **The specimen.** A deployed garden has no life to read, so under `NIWA_MODE` the route
  serves Specimen A — the synthetic life from the standalone, born 1988 and told at 38 —
  read-only, with a banner saying it is fiction. Locally a reader who has set nothing down
  can show the same specimen to learn the instrument; nothing is written.
- **The Mac app** gets ⌘7.

## What it deliberately does not do

It does not seed the reader's life from memory. The garden knows many dates, and the strip
shows them; which of them were events is the reader's to say. It does not detect gaps or
eras, cluster entries, or suggest a lane, an intensity or a tag. It does not total _again_
into anything. It does not read git history: a life is not a repository, and the instrument
should not need one.

## Where

| File                                | Change                                                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `lib/chronology.ts`, its test       | days with precision, two scales, ticks, packing, tally, readings, relations, the garden's moments, the file form |
| `lib/chronology-store.ts`           | one file per entry under `entries/`, `life.json` beside them                                                     |
| `content/specimen.ts`               | Specimen A in the garden's shape                                                                                 |
| `app/api/chronology/route.ts`       | GET life + entries (the specimen under `NIWA_MODE`), PUT an entry, PATCH the life, DELETE                        |
| `app/chronology/page.tsx`           | the route                                                                                                        |
| `components/Chronology.tsx`         | the sheet, the present, the desk                                                                                 |
| `components/ViewSwitch.tsx`         | seventh tab                                                                                                      |
| `components/Reader.tsx`, `Page.tsx` | "its dates"                                                                                                      |
| `scripts/NiwaApp.swift`             | ⌘7                                                                                                               |
| `app/globals.css`                   | the line's draw-on, the marks' settling                                                                          |

## Out of scope

Importing the standalone's `events.json` (it is the specimen, and a reader's own file can be
hand-written in the markdown shape). Linking to terra-cognita by id — the slug is stable and
in the address, which is the half of 004 this side can do. Circumstances generated from a
birth year against public timelines. Whoop or any other device data. Anything that scores.

## Acceptance checks

Run on 2026-09-24.

```bash
pnpm test
# ℹ tests 101 · pass 101 · fail 0   (tsc clean first)

curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/chronology
# 200

curl -s 127.0.0.1:5050/api/chronology | head -c 120
# {"life":{"born":"2001","horizon":null,"scale":"clock","domains":[{"id":"mind","label":"Mind","register":"inner"},{"id":"fe

curl -s -X PUT 127.0.0.1:5050/api/chronology -H 'content-type: application/json' \
  -d '{"entry":{"title":"Check","day":"2019-06","lane":"work"},"fresh":true}' | head -c 160
# {"slug":"2019-check","title":"Check","day":"2019-06","until":null,"lane":"work","looms":2,"again":null,"why":null,"tags":[],"stones":[],"recorded":"2026-09-24",
ls ~/personal/garden/niwa-vault/content/chronology/entries/
# 2019-check.md
curl -s -X DELETE '127.0.0.1:5050/api/chronology?slug=2019-check'
# {"gone":true}

# the public build, in a scratch copy: NIWA_MODE=public pnpm build && pnpm next start --port 5077
# /chronology 200 · /api/chronology serves the specimen · PUT 404 · every other route 200 · no home path in any payload
```

- [x] The specimen draws with lanes above and below the line, bands packed in rows, the gap
      hatched, the bump shaded, ages under the years, the present at today
- [x] Dragging the present greys the line past it and the reading says _as of_
- [x] The wheel zooms about the pointer and the ticks thin; `0` returns to the whole; the
      strip's bracket follows
- [x] Double-click opens an entry with the day and the lane from the click; _set it down_
      writes a file that reloads to the same mark
- [x] Dragging a mark re-dates it and the file follows; precision and length are kept
- [x] Hover with another entry chosen says how they sit
- [x] The garden strip ticks the days the notes speak of; _its dates_ lights one stone's
- [x] Switching the scale keeps the window in time and the marks land where the pointer says
- [x] Sumi and 375px hold
- [x] Under `NIWA_MODE` the route serves the specimen and refuses every write

## Second pass — 2026-09-24

The reader's verdict on the first pass: the zoom was not smooth and the line did not yet
place a life in context. What changed:

- **Zoom that eases.** Every move of the window — wheel, keys, the chips, _find it on the
  line_, _whole life_ — tweens in axis units, so it eases on both scales. `+` and `−` sit on
  the sheet. The whole-life strip is a **brush**: drag it to pan, drag its ends to resize.
- **The world, offered.** `content/world.ts` ships dated public happenings and the eras they
  sat in, drawn faintly above the line — hollow diamonds and dashed bands packed into the same
  rows as your own. Click one to let it in: it becomes your entry, tagged `world:<id>`, to
  retitle, move or take back. The desk lists them all; search finds them. Nothing is imposed.
- **Plumb lines.** A chosen or hovered entry drops dashed lines through every lane; a stretch
  gets a wash between its ends. That is the bookend: the pandemic, chosen, shows what of yours
  sat inside it. _Around it_ on the desk lists what fell within a year, with how it sits.
- **Threads.** From an entry on the desk, thread it to another with one of four verbs — _led
  to_, _echoed_, _cut against_, _alongside_ — drawn as an arc between the marks, an arrowhead
  on _led to_. Kept in the entry's file. Never proposed.
- **Alongside.** Another life is a folder of the same shape under `others/<name>/`, drawn
  beneath yours in their words, read-only; click one of theirs to read it; relations to your
  chosen entry are said the same way. The specimen is the first other.
- Lanes are taller, labels try their full title before shortening, a plain wheel scrolls the
  page, and the tween is driven by a timer because some embedded views throttle frames.

Additional checks, run on 2026-09-24:

- [x] `+` then `−` returns to the whole exactly; the readout moves through frames, not a jump
- [x] Clicking an offered happening writes an entry tagged `world:<id>` and the diamond turns solid
- [x] Hovering an offered era drops plumb lines at both ends with a wash between
- [x] Laying the specimen alongside draws its two lanes and a plumb line crosses them
- [x] A thread drawn on the desk appears as an arc and survives the file
- [x] tsc clean; 116 tests pass
