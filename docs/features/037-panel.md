---
title: The panel — the garden read as eight markers over time, each on its own line, never added up
status: shipped
created: 2026-09-30
---

# 037 — The panel

## Why

The ask, in the reader's words: "do 2", the second of the transfers drawn from the Epistemic
Garden lab (epistemic.garden). Their lab notes #5, _how to measure serendipity online_, measured
an online community without a KPI: "a diverse set of biomarkers to understand the health of
different parts of an ecosystem". They counted bidirectional reply pairs and reply relationships
beside tweet volume, found the relationships grew faster than the volume, and checked a jump after
a gathering by counting again without the ten largest accounts.

The garden has the same shape. Its stones are the accounts, its threads the replies, and a pair of
notes that each link to or name the other is the bidirectional pair. Nothing in the garden yet
reads it over time. The stats line says what the garden is today; it cannot say whether the threads
are growing faster than the stones, or whether a jump belongs to the whole or to one import.

It does not decide. A panel is read line by line, and no line has a direction it is meant to go.
Alone going down may mean joining, or it may mean a hub was written that names everything; the
sheet shows the check that tells the two apart and leaves the reading to the reader.

## What changes

- **A twenty-seventh view, `/panel`.** Eight markers down one sheet, each a strip across the same
  weeks, from the week before the first stone to today.
- **The eight.** Stones; threads between two stones (links, names in prose, shared terms, twins);
  threads per stone; pairs written both ways (each stone links to or names the other); the share of
  non-term stones that use a term of the glossary; the share with no thread to a stone, a repo or an
  unwritten idea; the share whose file changed in the thirty days to that week; ideas linked to and
  never written. Each says how it is counted and what it cannot see.
- **Dated by the record.** A stone's first day is the first commit that holds its file, in
  whichever repository holds it (memory, Fieldnotes, niwa-vault); its changes are every commit that
  touches it. A thread is dated by the later of its two ends, the earliest day it could have been
  drawn. A stone not yet committed is dated by its last change on disk and counted as such. One
  `git log --name-only` per repository per request, about ten milliseconds each; nothing is kept.
- **The cursor.** Point along any strip, or press ← and →, and every strip reads the same week;
  each value sits beside its value now and at the start.
- **Two checks.** Leave out the ten most threaded stones, with every thread they held. Leave out
  every stone that first appears on a day when twenty or more did. Both recount every week. The
  days planted in bulk are ticked through every strip and listed; picking one puts the cursor on its
  week. The ten most threaded are listed, struck through when left out.
- **The headline**, as the lab put theirs: since the first week with ten stones, the stones, the
  threads and the pairs written both ways, each from its start to now and how many times as many.
- The notice gets the panel's card and ←/→; the margin knows the view's name and puts the cursor's
  week on the desk; the Mac app gets ⌘K. Deployed, the route reads the public snapshot and dates
  each stone by its last change, and the sheet says so; no private string is read.

## What it deliberately does not do

It never adds the markers into one number, never calls a line healthy or not, and never says which
way any of them ought to go; the test runs every word and every reading past a list of verdict words.
It does not date a thread by when it was written, because the record cannot say; it says so on the
thread's line. It does not count ideas that were unplanted and later written, and says so. It asks
no model and keeps nothing.

## Where

| File                                                        | Change                                                                       |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `lib/panel.ts`, `lib/panel.test.ts`                         | `panel`, `bulkDays`, `hubsOf`, `weeksOf`, `said`, `growth`, `readings`; pure |
| `lib/panel-store.ts`                                        | each stone's days from git                                                   |
| `app/api/panel/route.ts`                                    | GET the stones, threads and days (the public snapshot when deployed)         |
| `content/panel.ts`                                          | the markers' words, the lead, the checks, the dating, what it leaves         |
| `components/Panel.tsx`, `app/panel/page.tsx`                | the sheet                                                                    |
| `components/ViewSwitch.tsx`, `lib/margin.ts`                | the tab, the name                                                            |
| `app/globals.css` (`.pn-*`)                                 | the strips, the cursor, the ticks                                            |
| `content/notice.ts`, `scripts/NiwaApp.swift`                | the card and key; ⌘K                                                         |
| `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `CHANGELOG.md` | the map, the decision, the entry                                             |

## Out of scope

The genesis of each stone (reading, conversation, making), which is transfer 4 and belongs to the
provenance. A thread's own date from `git log -S`, which would cost a search per thread. Markers for
repos. Any stored history of the panel itself.

## Acceptance checks

Run on 2026-09-30 against the launchd stand on 127.0.0.1:5050; tests from a clean worktree at HEAD.

```bash
pnpm test
# tsc clean · 275 pass · 0 fail (lib/panel.test.ts: 7)
curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/panel
# 200
curl -s 127.0.0.1:5050/api/panel | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['dating'], len(d['born']), d['undated'])"
# record 498 0
```

- [x] `/panel` reads _Since the week of 22 Apr: the stones from 47 to 498, 11 times as many; the
      threads from 18 to 1,083, 60 times as many; the pairs written both ways from none to 86._
- [x] leaving out the ten most threaded reads _10 stones left out, and every thread they held._
      and the vocabulary line falls from 20 in 100 to 8; leaving out what was planted in bulk
      leaves 95 stones and the vocabulary at 3 in 100
- [x] ← twice puts every strip on the same earlier week (stones 188, _now 498_); a click on a
      strip puts them all on the week of 8 Jul; seven days planted in bulk are listed, 20 Apr to
      23 Sep
- [x] sumi reads; 375px holds (the sheet's scrollWidth 375); no console errors from the view

## Notes

Built while two other sessions worked in the same tree: the forecast (036) committed mid-build,
and the canon was still uncommitted and failing its own typecheck. Committed from a clean worktree
at HEAD carrying only the panel's files and hunks. The cursor first overflowed the sheet at 375px
because its track was a full-width box moved by a transform; it is now zero-width and moved by a
share of the strip's width in container units.
