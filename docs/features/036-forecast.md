---
title: The forecast — the garden's guess at your call, sealed when you weigh a thing, scored against the base rate
status: shipped
created: 2026-09-30
---

# 036 — The forecast

## Why

The Epistemic Garden's lab notes (_Agentic Taste Modeling_, lab notes #8) built a benchmark for
how well an agent predicts what a person would endorse from their archive, scored by Brier skill
over a naive baseline. Two findings carry over. Most opportunities are neutral, so a predictor
is only worth anything if it concentrates the good ones; and models were badly calibrated until
they were given explicit bands of evidence strength. The distribution (012) already weighs a
thing and keeps the reader's call on it, with where it sat on the curve. It had the record a
forecast needs and no loop that used it.

## What changes

- **A seal on every weigh.** The taste API's POST now returns `seal`: the garden's guess that
  the reader lets the thing in. Every past call is vectorised on the garden's vocabulary and
  compared with the new thing; the eight nearest (likeness ≥ 0.05) vote by likeness, and the
  vote is pulled toward the Laplace base rate as if that were two more calls. With no record
  the guess is even odds.
- **Sealed, then opened.** Under _your call_ the page says the garden has a guess, sealed until
  the call is made. After _let it in_ or _pass_ it opens: _The garden guessed 73 in 100 that you
  would let it in, from 7 near things you weighed before, 7 let in — a fair amount of evidence.
  The base rate was 50 in 100. You let it in._
- **The seal is kept.** The first keep writes `forecast: {garden, base, weight, near, nearIn}`
  into the choice's frontmatter; a later change of call keeps the seal, so the record is scored
  against what the garden could have known that day.
- **The record, scored.** A panel under _kept before_: calls scored and let in; how far the
  garden's guesses and the base rate's sat from what the reader did (mean squared, Brier); skill
  over the base rate (1 − garden / base) said large once there are ten calls; of the calls it
  leaned toward (above the base rate) how many were let in, beside all of them. Five bins drawn
  as rings against the diagonal, sized by count, with the share let in overall as a level line.
  Choices kept before seals existed are counted, not scored. GET `/api/taste` returns `score` too.

## What it deliberately does not do

It never shows its guess before the call, never ranks things to read, and never says a call was
the one to make. It asks no model: the likeness is the distribution's own tf-idf. It does not
reach into Kiku's inbox; that would be the next step (the benchmark's 80/20 → 30/70
concentration on a real stream), and it needs the reader's word first.

## Where

| File                                                        | Change                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `lib/forecast.ts`, `lib/forecast.test.ts`                   | base rate, the seal, evidence words, reveal, Brier, score, bins, readings, the file form |
| `lib/taste.ts`, `lib/taste.test.ts`                         | `Choice.forecast`, parsed and serialised                                         |
| `app/api/taste/route.ts`                                    | the seal on POST, kept on PUT, the score on GET                                  |
| `components/Distribution.tsx`                               | the sealed line and the reveal under the call; the record panel and its drawing  |
| `app/globals.css` (`.fc-*`)                                 | the reveal's rise, the rings' easing                                              |
| `content/notice.ts`                                         | the distribution's card                                                          |
| `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `CHANGELOG.md` | the map, the decision, the entry                                                 |

## Acceptance checks

Run on 2026-09-30 from a clean worktree at HEAD, on a check server at 127.0.0.1:5086 with
`NIWA_TASTE_DIR` pointed at a scratch directory, so the real record was not touched.

```bash
pnpm test
# tsc clean · 268 pass · 0 fail (lib/forecast.test.ts: 12)
```

Fourteen synthetic weigh-then-call rounds through the API (attention and feeds let in, sport and
celebrity passed), each sealed from only the calls before it: the first guess was 0.50 with
nothing near; by the ninth it rested on four near things and leaned 0.57 against a 0.50 base.
Record after fifteen calls: garden 0.24, base rate 0.29, skill +0.16; of the 7 it leaned toward,
7 let in.

- [x] Weighing shows _the garden has a guess at your call, sealed until you make it_; no number
- [x] _let it in_ opens the reveal with the guess, what it rested on, the base rate and the call
- [x] the choice file carries `forecast:`; an older choice without one reads and is counted as not scored
- [x] the record panel reads the counts, both distances, the skill and the leaned line; the rings sit against the diagonal
- [x] sumi reads; 375px holds (scrollWidth 375); no console errors from the feature
