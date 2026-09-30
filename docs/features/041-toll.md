---
title: The toll — what a dollar buys when it buys silence, and what a signal has to cost
status: shipped
created: 2026-09-30
---

# 041 — The toll

## Why

The ask, in the reader's words: a game that shows that generosity in the dictator game is not
always about wanting to help — that people will pay a dollar so a stranger never learns what they
did — that social media amplifies it, and how signalling works: a word believed because a false
one is penalised, destructive signalling (Rapa Nui, conspicuous consumption), everyday signalling
(less and fewer), and a chain the reader wrote down: low trust, high receipt, high signalling,
changing rules of the game.

Nothing in the garden yet lets the reader do the thing first and read the finding after. The crowd
(035) asks for a guess; the toll asks for a choice, four times, with only who would know changed.

## What changes

- **A thirtieth view, `/toll`.** One sheet.
- **The game.** Two lines: most send something; a third of the study's dictators paid a dollar so
  the stranger would never know. _Play it before you read what they did._
- **Four rounds, a panel at a time.** Ten coins, clicked across (a coin and every coin beyond it) or
  set by a dial. _The envelope_: the stranger will see. _The door_: offered after the split is
  chosen, as in the study, drawn as two whole outcomes — carry out the split, or $9 and they are
  never told. _The feed_: posted under the reader's name; the door keeps a receipt. _No one_: the
  money arrives as a bonus from nowhere. Each later round starts where the envelope was left.
- **The receipt**, beside the rounds: each round as ten cells (kept, sent, the door's dollar), who
  would know, and a sentence.
- **What it came to**: the most and the least that reached a stranger and under whom (ties named);
  the door set against the two outcomes of the game it cannot beat; the study's three counts —
  11 of 40, 43 in 100, almost none — with its reading, and a note that no one in the study was
  posted.
- **The signal.** A signal is an act cheaper or more likely when what it says is so. A room of a
  hundred, the claim so for forty. Three dials in dollars; five rules walked with ← → or chips,
  each with its sentence: high trust ($0 spent, the word separates), low trust (all say it; 40 in
  100), high receipt ($400, separates again), high signalling ($2,800, pools), the rules change
  ($1,200, separates). Of those who do it, how many it is so for, large, with a meter; what the
  room spends; the room in people and dollars; the hundred seats, filled where it is so, ringed
  where they do the act.
- **The same shape elsewhere** (Rapa Nui, contested; visible goods; less and fewer; a Super Bowl
  ad; the feed), **what it leaves to you**, and **sources** with DOIs.
- The notice gets the toll's card, a step in the round and its keys; the margin knows the view's
  name; the palette gets `toll.coin` and `toll.mark` in both themes; the Mac app gets ⇧⌘T. Nothing
  is kept and no API route is added, so the public build serves the same page.

## What it deliberately does not do

It never says which round is the reader, whether a split was fair, or which rules a room should
keep. The test forbids verdict words in every round, reading and step. It keeps nothing. It asks
no model. It does not print a count for the study's private condition, which could not be reached
to check; it says "almost none", as the paper's abstract-level summaries do.

## Where

| File                                                        | Change                                                               |
| ----------------------------------------------------------- | -------------------------------------------------------------------- |
| `lib/toll.ts`, `lib/toll.test.ts`                           | payoff, the door and round readings, the spread, the room, readings  |
| `content/toll.ts`                                           | the lead, the rounds, the study, the signal, the chain, the sources  |
| `components/Toll.tsx`, `app/toll/page.tsx`                  | the sheet                                                            |
| `components/ViewSwitch.tsx`, `lib/margin.ts`                | the tab, the name                                                    |
| `lib/palette.ts`, `app/globals.css` (`.tl-*`)               | the coin and the mark; the purse, the cells, the room, the meter     |
| `content/notice.ts`, `scripts/NiwaApp.swift`                | the card, the step and the keys; ⇧⌘T                                 |
| `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `CHANGELOG.md` | the map, the decision, the entry                                     |

## Out of scope

The reader's rounds kept to a file. A model asked anything. A count for the private condition.

## Acceptance checks

Run on 2026-09-30 against the launchd stand on 127.0.0.1:5050.

```bash
pnpm exec tsc --noEmit && pnpm test
# tsc clean · 307 pass · 0 fail (lib/toll.test.ts: 8)
curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/toll
# 200
```

- [x] `/toll` on 127.0.0.1:5050: send $4, take the door, send $7 on the feed, $0 to no one → _The
      most that reached a stranger was $7, when everyone who follows you would see it. The least was
      $0, in two rounds: with a door to leave by and with no one to know._; the door reads _You had
      chosen to send $4; the door left you $9 and them nothing …_; the five rules read 100 · 40 ·
      100 · 40 · 100 in 100 and $0 · $300 · $400 · $2,800 · $1,200; no console errors
- [x] sumi reads; 375px holds (scrollWidth 375)
- [x] the live niwa-public after deploying 46189db from a clean worktree (dpl_7DB2L1i68mdsLxDQ5BBoGEx4bt4L):
      `/toll` 200, the lead rendered server-side, the tab in the nav, 0 home paths in the page;
      `/`, `/notice`, `/crowd`, `/voice`, `/canon`, `/panel`, `/provenance/stones` 200; four rounds
      and the second rule played in the browser, no console errors
