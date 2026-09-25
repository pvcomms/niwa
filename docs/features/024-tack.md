---
title: The tack — directional accuracy as an instrument; beliefs in the sails, commitments in the hull
status: shipped
created: 2026-09-25
---

# 024 — The tack

## Why

The ask, in the reader's words: "this idea of directional accuracy with truth … to be an
artifact or way of knowing as well", pointing at a note of theirs (_Claude view_, in the
vault) that lays the stance out. Beliefs are tools, not possessions, and pay rent in what
they expect to see. Update, don't flip. Keep the identity small. Scout, not soldier: degrees
of confidence, and 0 and 1 are not probabilities. The map is not the territory. And the
correction the same note reaches: that stance is world-class at not losing and makes
finishing hard, because beliefs and commitments obey opposite laws — a belief is held in
proportion to evidence, a commitment is chosen and held regardless — and the paralysis
comes from applying the rules of one to the other. Hull and sails. The flinch test sorts
them: do you want evidence to be able to change this? If even asking felt like a small
betrayal, it is a commitment.

The instrument follows the note rather than adding to it. You cannot sail straight at what
is so; you hold a heading, see what the water does, and correct — a tack at a time. So a
claim is set down, sorted by the flinch (the reader's answer, never the tool's), and kept in
one of two layers with different laws. In the sails a belief carries a lean on a line from
_not so_ to _so_ that stops at 1 and 99, the rent it pays (what it expects to see if so and
if not), and its tacks — each a dated move with what was seen and what that matched. In
the hull a commitment carries why it is held, with no evidence owed, and a window: the day
before which the reader will not reopen it, and the record of when they did. The tool draws
the path and counts the record. It never says whether a claim is so, how likely, or what to
hold — see DECISIONS.

## What changes

- **A sixteenth view, `/tack`.** The claim, the flinch with its two chips (_yes — a belief,
  into the sails_ · _no — a commitment, into the hull_) and a line for what the flinch said.
  Choosing the sails opens _where you lean now_ (a dial from 1 to 99); choosing the hull
  opens _the window_ (a date, with 30 days / 90 days / a year to hand). _Put it in the sails_
  / _put it in the hull_. Opened from a stone (`?id=`, _its tack_ from the reader and the
  catalogue page), the claim is prefilled with the stone's first line.
- **The sheet.** The sails: each belief with a short line showing every lean it has held
  (hollow) and where it leans now (filled), its tacks and its last. A drawn waterline. The
  hull: each commitment with its window as a bar from the day chosen to the day named,
  today's mark on it, the accent once open; let go is struck.
- **A belief, open.** _What it expects to see_ — if so / if not. _Where you lean_: the path
  the tacks drew (so at top, not at bottom, the middle dashed), any step across the middle
  inked again in the accent; then _tack_: what did you see, what it was (_as expected if
  so_ · _as expected if not_ · _said nothing either way_), and now you lean; the size of the
  step is said before it is made. The tacks listed newest first with their step; the last
  can be taken back. _What would move it_: looks — yours, the garden's, proposed — each
  with which way seeing it would move you, kept or hollow, _I looked_ dated.
- **A commitment, open.** _Why you hold it_ — an axiom, not a theorem. _The window_: chosen
  and not-before dates, the bar, days held and to go. _Reopen the question_: what would you
  say now, then _hold it again, not before_ a date or _let it go_; a reopening before the
  window is written down as early. Reopenings listed.
- **Ask the flinch again** moves a claim between layers: into the hull sets the day chosen;
  up into the sails adds a tack saying so.
- **The garden offers** stones that share two rare content words with the claim (a word the
  whole garden uses says nothing about kinship), as looks, hollow. **Ask what to look at**
  has the model on this machine propose 3–6 looks with which way each would move the
  reader; the system prompt forbids likelihoods, advice and verdicts, the validator drops
  any look carrying one, and a commitment is refused outright. Everything arrives hollow.
- **The desk.** _The reading_: _first put 2026-09-25 at 35 · now at 55 after 1 tack · moved
  toward so ×1, toward not ×0 · largest step 20 · crossed the middle 1 time in one step ·
  last tack today · what it expects to see is named both ways · 1 sighting: ×0 as expected
  if so, ×0 as expected if not, ×1 that said nothing either way · what would move it: 1 look
  kept, 4 proposed and hollow_; for a commitment, _chosen 2026-09-23, held 2 days so far ·
  you said not before 2026-12-24 — 90 days to go · reopened 1 time, 1 of them early: held
  again ×1, let go ×0 · why you hold it is written_. Values leaned on, by the bearing's
  terms. _The two layers_, said plainly for whichever the claim is in. The list view's desk
  reads the whole sheet — _1 belief in the sails · 1 commitment in the hull_, the sails that
  expect nothing, the ones never tacked, _the hull is empty_ when it is.
- **Kept as files.** One markdown file per claim in `niwa-vault/content/tack/`
  (`NIWA_TACK_DIR`): the claim, if so, if not, why as sections; the tacks and the
  reopenings as dated `###` entries a person can read; layer, flinch, window and looks in the
  frontmatter.
- **The specimen.** Under `NIWA_MODE` the route serves Specimen A's two claims — the belief
  its mask turned up, tacked twice after asking, and the commitment the mask taught it — and
  the sample values, read-only; the model is not there.

## Files

| File                                                                  | Change                                                                                                                                                                           |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/tack.ts`                                                         | the two layers, the lean clamped to 1–99, the tally (tacks, steps, crossings, rent, looks, window), the readings, the garden's offers, the ask and its validation, the file form |
| `lib/tack.test.ts`                                                    | 8 tests: the clamp, the tally and readings (no verdict word), the hull's window, the whole sheet, the round-trip, validation, the proposal, the garden's offers                  |
| `lib/tack-store.ts`                                                   | one file per claim, `NIWA_TACK_DIR`                                                                                                                                              |
| `content/tack.ts`                                                     | Specimen A's two claims                                                                                                                                                          |
| `app/api/tack/route.ts`                                               | GET (claims, values, `?id=` about, `?q=` the garden's looks), PUT, DELETE, POST asks the model; 404 deployed                                                                     |
| `app/tack/page.tsx`, `components/Tack.tsx`                            | the route and the view                                                                                                                                                           |
| `components/ViewSwitch.tsx`, `lib/margin.ts`, `scripts/NiwaApp.swift` | sixteenth tab, the view's name, ⌘L                                                                                                                                               |
| `components/Reader.tsx`, `components/Page.tsx`                        | _its tack_                                                                                                                                                                       |
| `content/notice.ts`                                                   | the tack's card, step and key; the model line now names five views                                                                                                               |
| `app/globals.css`                                                     | the path drawing on, rows, the arrivals                                                                                                                                          |
| `docs/ARCHITECTURE.md`, `DECISIONS.md`, `CHANGELOG.md`, `README.md`   | the map, the decision, the entry, the section                                                                                                                                    |

## Out of scope

A probability, a calibration score, a Brier anything. Telling the reader a step was too
large or too small. Sorting a claim into a layer for them. Asking the model about a
commitment. Reminders when a window opens (the sheet shows it; nothing pings).

## Acceptance checks

Run on 2026-09-25 against the dev server on 127.0.0.1:5050 and a frozen scratch copy
(`NIWA_MODE=public`, hard-linked) on 127.0.0.1:5079.

```bash
pnpm test
# tsc clean · 160 pass · 0 fail (lib/tack.test.ts: 8)

curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/tack
# 200
curl -s 127.0.0.1:5050/api/tack
# claims 0 · values [taste, privacy, uncertainty, kindness, individuality] · writable true · model qwen3.6:35b-a3b
curl -s -X PUT 127.0.0.1:5050/api/tack -H 'content-type: application/json' -d '{"claim":{"text":"Test commitment: I ask before I argue.","layer":"hull","why":"…","chosen":"2026-09-23","until":"2026-12-23"},"fresh":true}'
# 2026-09-25-test-commitment-i-ask-before-i-argue · hull · 2026-12-23
curl -s '127.0.0.1:5050/api/tack?q=Juniors%20learn%20more%20in%20the%20office%20than%20at%20home.'
# looks: [] — no stone shares two rare words with it (before the rare-word rule it offered 'more', 'home', 'test': fixed)

# frozen
curl -s 127.0.0.1:5079/api/tack
# claims [(2026-09-21-juniors-learn-more-in-the-office-than-at-home, sail), (2026-09-23-i-ask-before-i-argue, hull)] · values [craft, candour, curiosity, care, quiet] · writable false · model null
# PUT 404 · POST 404 · DELETE 404 · ?q= → looks [] · /tack 200 · 0 home paths in the page
```

- [x] A belief begun from the sheet: the claim typed, _yes — a belief_, the dial moved to 35
      with the arrow keys, _put it in the sails_; the file on disk holds `### 2026-09-25 · at
    35` under _the tacks_ with _First put._
- [x] If so / if not written and kept on blur; a tack made — what was seen, _said nothing
      either way_, the dial to 55 — the desk said _a step of 20 — across the middle_ before,
      and after: _now at 55 after 1 tack … crossed the middle 1 time in one step_; the path
      drawn with the crossing in the accent
- [x] A look named by hand (kept, _I looked_ to hand); _ask the garden_ offered 5 stones,
      hollow — but on weak words (_more_, _home_, _test_), so the rule became two rare words
      and the test was updated; _ask what to look at_: 4 proposed in 5s, hollow, each with
      its way (_Count the number of office badge swipes versus logged-in hours for each
      junior — either way_), none carrying a verdict
- [x] A commitment kept by PUT and opened: the accent frame, why, the window bar with 89
      days to go; _reopen the question_ before the window → what would you say now → _hold
      it again, not before_ 2026-12-24: the file gained `### 2026-09-25 · held again until
    2026-12-24 · early`, the reading _reopened 1 time, 1 of them early_
- [x] The list: the sail with its hollow 35 and filled 55, the waterline, the hull with the
      window bar; sumi holds; 375px scrollWidth 375 on both the list and an open belief
- [x] The notice test passes with the tack's card and step; the readings name no verdict
      (tested)
- [x] A range input declared inside the component remounted on every render and lost the
      keyboard mid-nudge — moved to module level (the alarm's `.a-dial` styling reused)

## Notes

The lean is the reader's mark and nothing is derived from it but its own history; the
number is shown because the reader set it, and because 1 and 99 being the ends is the
point. The garden's offers are by shared rare words and will miss kinship said in other
words — the flow and the distribution are the views for that. A commitment's window is a
date the reader named; nothing fires when it opens.
