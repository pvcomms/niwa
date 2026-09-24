---
title: The course — a belief steered through what hit it, marked after the fact
status: shipped
created: 2026-09-24
---

# 014 — The course

## Why

paramv.com's fifth figure is a breakout game. The ball is a belief; the bricks are
epistemic inputs — _evidence_, _base rate_, _the feed_, _vibes_ — that bend its path rather
than block it, green toward a truth marker that drifts, violet away; the paddle is
_judgment_, and the readout is the angle between where the belief is heading and where
truth sits. It says, honestly, that you never arrive and that the score is a direction, not
a total. The site's own audit names its hole: **the bricks are pre-labelled.** You know
which input is signal before it hits you, which is exactly what you never get. The fix it
proposes is to grey the bricks and reveal what each was worth only after impact.

The garden can make that fix literal. For any stone, the things that flowed into it are
known, one at a time, with the day each entered the garden — the inputs have already hit.
What is missing is the after-the-fact judgment: which of them bent the belief toward the
question it was trying to get right, and which bent it away. That judgment is the reader's,
and the instrument's job is to hold it, draw it, and read it back — never to make it.

## What changes

- **A sixth view, `/course`.** A stone is the belief. What flowed straight into it (the
  flow's direction, 013) is laid across the sheet as bricks in the order it came, undated
  first, with the months ticked underneath. The belief is launched from a paddle labelled
  _judgment_ and drawn as a pen line through every brick; it bends up at each input marked
  **toward**, down at each marked **away**, and runs straight through the unweighed. It
  ends at a disc — the belief now — with a short arrow the way the last bend left it, and a
  dashed guide up to the question. Unwritten inputs are dashed bricks, fallow ones italic.
- **Dated by arrival, from the record.** The garden's sources are git repositories, so a
  belief's file has a history. `GET /api/course?belief=` reads it: the days the file
  changed are the days the belief was **steered** — the first commit on record is drawn
  faint and counted as where the record begins, not as a steering — ticked under the
  field with the last one in the accent and a faint line up through the inputs that came after it; and the
  first commit in which an input's name appears in the file is the day that input
  actually **arrived** — a small dot on its brick, and the card says _arrived 17 Sep_
  rather than _changed_. Where the record cannot say (no history, or the name was already
  there when the record begins) the input keeps the day it itself last changed, and the
  card says so. Nothing is written; git is read on this machine only.
- **The question, as a horizon.** _the question · approx._ runs along the top. It is put in
  words on the desk, and when it is re-put the old phrasing is kept with its day — it drifts
  because you moved it. The last three phrasings settle under the horizon, fainter as they
  age, each with the day it held until.
- **The marks are yours.** Click a brick and the two marks float above it on the sheet; say
  _toward_ or _away_, click again to take it back. Rows on the desk carry the same chips.
  `←` `→` walk the bricks, `t` `a` `u` mark, `esc` clears. The bricks are grey until you
  say. The caption answers the way the site did — _course corrected_, _drift_.
- **A walk.** _its course_ puts a chosen input on the sheet as the belief; the way there is
  kept as _walked A › B_, and `[` steps back.
- **The reading.** Facts, none of them a grade: _hit by 16 inputs, 9 Jul to 17 Sep · 5
  weighed: 2 bent it toward the question, 3 away; 11 unweighed · on record since 5 Sep;
  steered twice, last on 20 Sep; nothing has hit it since · the last input landed 6 days ago_ (or, past 45
  days, _nothing has hit it in N days — the field has gone quiet_) _· the last 4 weighed
  all bent it away · what bent it toward: a concept and a build; away: 2 builds and a rule
  · its inputs are all your own writing · 1 of the inputs was never written down · the
  question was re-put 2 times — it drifts because you moved it._ The readout above the
  sheet keeps the count.
- **The field repopulates.** _arriving_: the stones from the last thirty days that speak the
  belief's words (the distribution's model, 012) and are not threaded to it yet, with the
  words they share. Nothing is threaded for you.
- **Kept as files.** One markdown file per belief at
  `niwa-vault/content/course/<slug>.md`: the belief's id, the question and its day, the
  trail, and the marks with the day each was made — all quoted, so a hand edit and YAML
  agree. A course with nothing said in it is removed rather than kept empty.
  `NIWA_COURSE_DIR` moves the folder. The route serves nothing and refuses writes under
  `NIWA_MODE`.
- **Which belief first.** `?id=` from anywhere (the reader and the catalogue page carry
  _its course_); else the belief last steered; else the reader's own stone that the most has
  flowed into.
- **The Mac app** gets ⌘6.

## What it deliberately does not do

It does not show the angle as a number. The site's degree was physics; here the course is
whatever the marks draw, and a number on it would be a grade. It does not weigh inputs by
kind or age, does not suggest which to mark, and does not decide which way anything bent.

## Where

| File                                | Change                                                      |
| ----------------------------------- | ----------------------------------------------------------- |
| `lib/course.ts`, `course.test.ts`   | inputs in order, tally, readings, question trail, file form |
| `lib/course-store.ts`               | one file per belief, read by the belief's id                |
| `lib/course-history.ts`, its test   | git: the days a belief changed, the day each input arrived  |
| `app/api/course/route.ts`           | GET all or `?belief=` history, PUT one, DELETE; frozen under `NIWA_MODE` |
| `app/course/page.tsx`               | the route                                                   |
| `components/Course.tsx`             | the sheet, the marks, the desk                              |
| `lib/palette.ts`                    | `--course-toward`, `--course-away`                          |
| `components/ViewSwitch.tsx`         | sixth tab                                                   |
| `components/Reader.tsx`, `Page.tsx` | "its course"                                                |
| `scripts/NiwaApp.swift`             | ⌘6                                                          |
| `app/globals.css`                   | the bricks' arrival, the course's draw-on                   |

## Out of scope

Threading an arriving stone to the belief from the desk (write in the note). Marks on
inputs two hops out. A course for a decision set down on the bearing (011) — decisions are
not garden stones yet.

## Acceptance checks

Run on 2026-09-24.

```bash
pnpm test
# ℹ tests 88 · pass 88 · fail 0   (tsc clean first)

curl -s '127.0.0.1:5050/api/course?belief=project_sensemaking_instruments' | head -c 160
# {"rewrites":["2026-09-05","2026-09-17","2026-09-20"],"arrivals":{"feedback_analogy_explanations":"2026-09-17",...},"since":"2026-09-05"}

curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/course
# 200

curl -s 127.0.0.1:5050/api/course | head -c 120
# {"courses":[...],"writable":true,"dir":".../niwa-vault/content/course"}
```

- [x] The belief's inputs lie across the sheet in date order with the months ticked; the
      course bends up at a _toward_, down at an _away_, straight through the unweighed
- [x] A mark made on the desk or the sheet is kept as a file in the vault and survives a
      reload; clicking it again takes it back
- [x] The question put on the desk appears on the horizon; re-putting it keeps the old
      phrasing on the trail with its day
- [x] The reading counts the marks, names what kind of thing did the bending, says what
      has hit the belief since it was last rewritten, and grades nothing
- [x] `←` `→` choose a brick, `t` `a` `u` mark it; hover names an input and its thread
- [x] The days the belief was steered are ticked under the field; an input the record can
      date carries a dot and its card says _arrived_; one it cannot says _changed_
- [x] _its course_ walks to an input as the belief and `[` walks back
- [x] Sumi and 375px hold
