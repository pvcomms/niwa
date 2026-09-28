---
title: The fence — Chesterton's fence as an instrument
status: shipped
created: 2026-09-28
---

# 029 — The fence

## Why

The ask, in the reader's words: build a Chesterton's fence feature in niwa.

The principle is G. K. Chesterton's (The Thing, 1929, "The Drift from Domesticity"): a reformer
comes on a fence across a road, does not see the use of it, and wants it cleared away; the
answer is that if you do not see the use of it you may not clear it — go away and think, and
when you can come back and say what it was for, it may come down. It is a procedure, not a
verdict: the fence may come down, once its use is known. Three things shape the instrument
against the naive version. First, a reason supposed is not a reason found; the garden already
draws that difference — the provenance draws a hand solid only where the reader looked — and
the fence draws it the same way: a guess in pencil, a use found out in ink. Second, the
principle has a failure mode, which is keeping every fence because it stands — status quo bias
(Samuelson & Zeckhauser 1988) wearing Chesterton's coat — so the sheet asks what the fence costs
to keep before anything else, asks of every reason whether it still holds, and draws a reason
that no longer holds as a broken rail. Third, the cost of an unseen use falls hardest on a
removal that cannot be undone (Arrow & Fisher 1974), so whether it could go back up is asked
beside the call, and taking a fence down for a while, with a day to look again, is a call of
its own; afterwards the reader marks what came through of what they listed, which is what the
next list can stand on. We can never do merely one thing (Hardin 1963): what would come through
is asked as its own list.

The reader's record already holds fences with their reasons: memory's rules are written with
a **Why:** — the reason given when the rule went up — and their files are in git, so the day
each went up is on record. Those are offered as fences already standing.

## What changes

- **A twenty-first view, `/fence`, as one sheet.** The fence in a line, in the display face,
  across the sheet. What it costs to keep. Who put it up — _I did_, _someone I can ask_,
  _someone I can't ask_, _no one knows_ — with who and when in the reader's words.
- **The drawing: the fence across the lane.** Drawn by hand with `lib/hand.ts`: posts, a gate
  with its brace, hinges and latch, the ground line, _the other side_ and _this side_. A rail
  for every use set down — inked when found out, pencilled when a guess, hollow while it is the
  record's and not yet kept, broken where the reason no longer holds, a _?_ where the reader is
  not sure — with the use written along it. With no uses, posts and no rails: _no rails yet —
  what is it for?_ The latch lifts once a use is found. What would come through stands on the
  other side. A caption says what is drawn: _2 rails: 1 inked, 1 pencilled, 1 broken · the
  latch is up · open for a while, until 19 Oct_.
- **What might it be for?** _Go away and think._ Each use in the reader's words, marked for how
  they know it — a guess, asked, found it written, saw it at work — whether it still holds —
  still holds, no longer holds, not sure — and, if they want, what else does this job now. A
  rail glyph beside each row matches its rail in the drawing. Marking a use found redraws its
  rail in ink.
- **What would come through, and putting it back.** A list of what would come through if it
  came down tomorrow; whether it could go back up — easily, at a cost, not at all — and what
  that would take.
- **The call is the reader's, and dated.** Keep it, move it, take it down, or down for a while
  with a day to look again (three weeks out unless changed); from down: put it back up or move
  it; from down for a while: put it back up, move it, or leave it down. Each call keeps a line —
  why, where it moved to, what to watch for. The drawing answers: taken down, the fence lies
  flat; down for a while, the gate stands open on its hinge; moved, it stands a little along from
  dashed ghosts of where it was. When the day to look again comes, the sheet and the record say
  so.
- **The one lean.** Taking a fence down — for good or for a while — before any use is found
  asks once more: _down without knowing what it was for — sure?_ It never refuses. The call is
  kept as _before a use was found_, and the record counts those.
- **Afterwards.** Once a fence has come down, each thing listed is marked _came through_ or
  _did not come_ — what came crosses the ground line to this side, ringed; what did not is
  struck where it stood — and afterwards is written in the reader's words.
- **Fences already standing.** The desk offers the rules in the reader's memory, oldest first,
  each with the reason given then (the paragraph after its **Why:**) and the day its file
  first appears in git — _since 20 Apr 2026_ — or _no reason written down_. Picking one opens a
  fence about it: _I did_, the day it went up, and the recorded reason offered hollow, _the
  record says · hollow until you keep it_. A rule already looked at opens its fence and is
  marked _looked at_. Every stone's reader and catalogue page carry _what was it for_, which
  opens `/fence?id=`.
- **The reading**, facts only: _set down 28 Sep · put up by the last lead · 2024 · someone you
  can ask · 2 things it might be for: 1 found by asking, 1 guess · a use found: So nothing slips
  through the week · if it came down: 2 things you said would come through · if it has to go
  back up: easily · down for a while since 28 Sep, until 19 Oct — 21 days to go · afterwards: of
  the 2 you listed, 1 came through, 1 did not_.
- **The record**: _2 fences set down · a use found for 1 · where they stand: down 1 · put back up
  1 · taken down before a use was found: 1 · what they might be for: 3 — 2 guesses, 1 found
  (found by asking 1) · looked at again after coming down: 1 — something you listed came through
  for 1 of 1_; every fence as a row.
- **Kept as files.** One markdown file per fence in `niwa-vault/content/fence/`
  (`NIWA_FENCE_DIR`): the fence, what it costs, what it might be for as bullets marked with how
  each is known (`- [asked · still holds] …`, a sub-bullet for what else does it now), what
  would come through (`- [came through] …`), putting it back, the calls
  (`- 2026-09-28: down for a while until 2026-10-19 — …`, `· before a use was found`),
  afterwards; who put it up, when, whether it could go back up and the stone in the
  frontmatter. A file written by hand with bare dates, bare years or unmarked bullets reads.
- **An example on an empty sheet.** Before anything is set down the sheet draws Chesterton's
  gate across the lane to the top field, two guesses on it and nothing found; nothing is kept
  until the reader writes over it and sets it down or makes the call.
- **The specimen.** Under `NIWA_MODE` the route serves Specimen A's two fences read-only: the
  Friday file check, looked into and moved; the 9:30 stand-up, down for a while, looked at again
  on the day named, one listed thing come through, back up twice a week.
- **No model.** Every reason and every call is the reader's.
- **The Mac app** gets ⌘F.

## What it deliberately does not do

It does not say whether a fence should come down, rank fences, or weigh a reason. It does not
keep a fence for being old, or count age in its favour. It does not refuse: the lean asks once
and records. It does not turn afterwards into an accuracy of the reader's foresight. It does not
read a rule's reason on the public side: the deployed route reads nothing of the garden.

## Files

| File | Change |
| --- | --- |
| `lib/fence.ts` | the uses and how each is known, where a fence stands and the calls it can take, the reason a note gives for itself, the rules as fences already standing, readings, the record, the file |
| `lib/fence.test.ts` | 7 tests: the recorded reason, the rules standing, the readings (no verdict word), the calls from each state, the record, the file round-trip and a hand-written file, validation |
| `lib/fence-store.ts` | one file per fence, `NIWA_FENCE_DIR`; the day a file first appears in its repository |
| `content/fence.ts` | Specimen A's two fences; the gate an empty sheet draws |
| `app/api/fence/route.ts` | GET (fences, the rules standing, `?id=` about), PUT, DELETE; the specimen and 404s when deployed |
| `app/fence/page.tsx`, `components/Fence.tsx` | the route and the view: the drawing, the uses, the call, afterwards, the desk |
| `components/ViewSwitch.tsx`, `lib/margin.ts`, `scripts/NiwaApp.swift` | twenty-first tab, the view's name, ⌘F |
| `components/Reader.tsx`, `components/Page.tsx` | _what was it for_ on every stone |
| `content/notice.ts` | the fence's card, step and key |
| `app/globals.css` | the fence's rows and links, the fall, the swing, the latch, the crossing, rails drawn on |
| `docs/ARCHITECTURE.md`, `DECISIONS.md`, `CHANGELOG.md`, `README.md` | the map, the decision, the entry, the section |

## Out of scope

A reminder when a day to look again comes, beyond the sheet and the record saying so. Fences
from other kinds of stone than rules offered on the desk (any stone can still be opened with
_what was it for_). Git history of a line of code as a fence's making. A model proposing what a
fence might be for.

## Acceptance checks

Run on 2026-09-28 against the garden's own dev server on 127.0.0.1:5050.

```bash
pnpm test
# tsc clean · tests 199 · pass 199 · fail 0 (lib/fence.test.ts: 7; the notice test with the fence's card)

curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/fence
# 200
curl -s 127.0.0.1:5050/api/fence
# fences 0 · about null · writable true · dir ~/personal/garden/niwa-vault/content/fence
# standing 20 · with a reason 17 · dated 20 · oldest 2026-04-20
curl -s '127.0.0.1:5050/api/fence?id=feedback_no_sounds'
# about: No sounds, ever · since 2026-09-20 · mine true · why "startle response, not mild annoyance — …"

NIWA_MODE=public npx next build          # in a scratch worktree carrying the change
# compiles; ○ /fence · ƒ /api/fence among the routes
NIWA_MODE=public npx next start --port 5079   # then:
curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5079/fence
# 200
curl -s 127.0.0.1:5079/api/fence
# fences 2 (Specimen A: the Friday file check · the 9:30 stand-up) · writable false · dir null · standing 0 · about null · 0 home paths
curl -s -o /dev/null -w '%{http_code}\n' -X PUT 127.0.0.1:5079/api/fence -d '{"fence":{"fence":"x"},"fresh":true}'
# 404
curl -s -o /dev/null -w '%{http_code}\n' -X DELETE '127.0.0.1:5079/api/fence?slug=x'
# 404
```

- [x] An empty sheet draws Chesterton's gate — two pencilled rails, the latch down, _sheep on the
      lane_ and _walkers in the top field_ on the other side; _a new fence_ gives posts and no rails
- [x] Two uses added with ↵; marking the first _asked_ inked its rail and lifted the latch
      (`rotate(-32deg)`), marking the second _no longer holds_ broke its rail; the caption read
      _2 rails: 1 inked, 1 pencilled, 1 broken · the latch is up_
- [x] _Set it down_ wrote `2026-09-28-niwa-test-fence-the-monday-review.md` with
      `- [asked] …` and `- [a guess · no longer holds] …`; `?slug=` reopened it after a reload
- [x] _Down for a while_ defaulted the day to look again to 19 Oct, made the call in one press
      (a use was found), opened the gate (`scaleX(0.28)`) and showed afterwards; the file gained
      `- 2026-09-28: down for a while until 2026-10-19 — …`
- [x] Afterwards: _came through_ crossed _A missed deadline_ to this side, ringed; _did not come_
      struck _Nobody notices_; the file read `- [came through] …` and `- [did not come] …`
- [x] _Put it back up_ closed the gate; the reading read _put back up 28 Sep: Every other Monday,
      half an hour · before that: down for a while 28 Sep_
- [x] A fence with only a guess, _take it down_: the first press asked _down without knowing what
      it was for — sure?_ and wrote nothing; the second laid the fence flat (`scaleY(0.06)`) and
      the record read _taken down before a use was found: 1_; _move it_ from there stood it a
      little along from dashed ghosts
- [x] _No sounds, ever_ from the desk opened a fence about the stone — _I did_, _20 Sep 2026 is
      the day its file first appears in the record_, the reason hollow; _keep_ inked it and lifted
      the latch; set down, the file carried `stone: "feedback_no_sounds"` and
      `- [found it written · from the record] …`; `?id=feedback_no_sounds` then opened that fence,
      and the desk marked the rule _looked at_
- [x] Sumi holds; 375px scrollWidth 375; no console errors through the run
- [x] _Take it off the record_, twice, for each of the three test fences — the record read _no
      fences set down yet_; the vault's listing, mtimes and git status matched the snapshot taken
      before the run
- [x] The Mac app rebuilt with ⌘F (`showFence` in the binary)

## Notes

Two edits made in the same tick — two marks clicked before React re-rendered — lost the first:
the handlers built on `openRef.current`, which only caught up on the next render. Each edit now
moves the ref as it computes the next state. The same pattern is in the break's handlers, where
it has not been seen to bite at human speed.

The address sync waits for the fences to be read, as the overview, the break and the sieve now
do; without the guard the development server's second mount would have lost `?slug=`.

`next build` warns that the store's filesystem reads trace the whole project; every store in the
garden draws the same warning, and the deployed route never reaches them.
