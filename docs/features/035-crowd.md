---
title: The crowd — a positive result set against how rare the thing is
status: shipped
created: 2026-09-30
---

# 035 — The crowd

## Why

The ask, in the reader's words: an interactive way to show people who have never met the idea how
base rate neglect works. The sieve (025) already draws Bayes as areas, but it is an instrument for
someone who has a question and worlds to weigh; it assumes the idea. Nothing in the garden yet
walks a newcomer from the classic question (a 99% test, one in a thousand, a positive) to the
answer in a form they can count for themselves. Percentages are where the mistake lives; a crowd of
a thousand, one dot each, is the form people read without help (Gigerenzer's natural frequencies).

It does not decide for anyone. The reader's guess is set beside the crowd's count and beside what
the people asked in the studies said, and never graded. The dials do arithmetic; the readings are
counts. The one sentence it leaves the reader with is a question to ask, not what to conclude.

## What changes

- **A twenty-fifth view, `/crowd`.** Four panels down one sheet.
- **The question and your number.** The classic, then a dial from 0 to 100 and _say it_. Once
  said, the crowd's count is shown, the reader's number beside it and beside the typical answer
  (95 in 100), as three thin bars: _You said 50 in 100. The crowd says 9 in 100. Most people asked,
  doctors among them, say 95 in 100 or more._
- **The crowd, a step at a time.** A thousand seats, forty to a row, scattered by a seeded shuffle.
  Four steps, → and ← walk them: the crowd; who has it (one seat filled); everyone tested (a ring
  round the one caught and round the ten flagged without it); only the flagged kept (the rest faded).
  Each step has its sentence.
- **The dials.** How rare (1 in 2 to 1 in 1,000 on a log scale), how often those who have it are
  caught (50–100 in 100), how often those who do not are flagged (0–20 in 100, by tenths). The count
  large: _of the flagged, how many have it_, with a two-colour meter, the story in whole people, and
  _from here_: the same crowd at half the rarity, with half the flags, catching every one. Five
  situations set the dials: a rare illness, a roadside breath test, a camera at a stadium, a common
  illness in season, a spam filter — the last two show the count turning over when the thing is
  common. A second crowd redraws under the dials.
- **The same shape elsewhere**, five cases in a list, and **what it leaves to you**.
- The notice gets the crowd's card and its keys; the margin knows the view's name; the palette gets
  `crowd.so` and `crowd.flag` in both themes; the Mac app gets ⌘R. Nothing is kept and no API route
  is added, so the public build serves the same page.

## What it deliberately does not do

It never says whether the reader has it, whether a guess was good, whether a test was worth taking,
or which dial to turn; the test forbids verdict words in every reading and step. It keeps nothing.
It asks no model. It does not replace the sieve: the sieve is for the reader's own question, the
crowd is for the idea.

## Where

| File                                                        | Change                                                                     |
| ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| `lib/crowd.ts`, `lib/crowd.test.ts`                         | `chance`, `counts`, `order`, the dial, `pct`, `story`, `leans`, `readings` |
| `content/crowd.ts`                                          | the question, the steps, the situations, the cases, what it leaves         |
| `components/Crowd.tsx`, `app/crowd/page.tsx`                | the sheet                                                                  |
| `components/ViewSwitch.tsx`, `lib/margin.ts`                | the tab, the name                                                          |
| `lib/palette.ts`, `app/globals.css` (`.cr-*`)               | the two marks; the seats, the bars, the meter                              |
| `content/notice.ts`, `scripts/NiwaApp.swift`                | the card and keys; ⌘R                                                      |
| `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `CHANGELOG.md` | the map, the decision, the entry                                           |

## Out of scope

The reader's own numbers kept to a file. A stone the crowd is about. A model asked for anything.
Sensitivity and specificity as words on the sheet: the dials are said in people, on purpose.

## Acceptance checks

Run on 2026-09-30 against the launchd stand on 127.0.0.1:5050, from a clean worktree at HEAD.

```bash
pnpm test
# tsc clean · 245 pass · 0 fail (lib/crowd.test.ts: 8)
curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/crowd
# 200
```

- [x] `/crowd` on 127.0.0.1:5050: _say it_ at 50 reads _You said 50 in 100. The crowd says 9 in 100.
      Most people asked, doctors among them, say 95 in 100 or more._; step 3 draws one filled seat
      and ten rings; _a spam filter_ reads _Of 1,000 emails, 500 are spam. The filter catches 495 and
      misses 5. It also flags 5 of the 500 who do not. So of the 500 flagged, 495 are spam: 99 in
      100._; no console errors
- [x] sumi reads; 375px holds (scrollWidth 375)
- [x] the live niwa-public after deploying 0ca8088 (dpl_H2871zzEu2GQ8GKuCyB4nj5ETBnz): `/crowd` 200,
      the question rendered server-side, the tab in the nav, 0 home paths in the page; `/notice` 200

## Notes

Built while another session was adding the half-second (034) in the same tree, so committed from
a clean worktree at HEAD carrying only the crowd's hunks, and deployed from there.
