---
title: The slice — thin slicing and the first second
status: shipped
created: 2026-09-30
---

# 042 — The slice

## Why

The ask, in the reader's words: build a game that shows thin slicing, the concept, for cognitive
bias. Thin slicing is judging from a very small sample of someone's behavior. The finding that
gave it the name is that such judgments can predict a real outcome (Ambady and Rosenthal's
silent clips of teachers). The finding that makes it a bias question is that the first second
carries other things too — how someone came in, how sure they sounded, whether they were like
you — and that confidence grows with more of the same faster than accuracy does (Oskamp;
Willis and Todorov). Kahneman and Klein's conditions say when a snap judgment is worth
trusting: a regular environment, and a chance to learn it. The game lets the reader make the
judgments and then counts what they did.

It does not decide for anyone. The debrief reports counts beside a coin and beside two plain
rules, never that the reader was swayed. A test runs every reading past a list of verdict words.

## What changes

- **A view, `/slice`.** One panel that says what is about to happen, then sixteen people, then the
  debrief. ⇧⌘S in the app. Slot 042 because 041 is the toll, being built in another session.
- **The play.** Sixteen invented people start a job, eight on Ash and eight on Birch. Each is met
  three times: the first second and one moment, then three moments, then all six. At each meeting
  the reader calls in or out, one to four from _surely in_ to _surely out_ (keys work). After the
  third call the year passes and the reader is told, with their three calls set beside it.
- **The first second** is one of five kinds — how they came in, how sure they sounded, how much
  they were like you, where they had come from, whether they looked the part — drawn with a pole
  (points toward doing well, or away). None names a person's sex, colour, age, accent, body or
  money. It stays on the page at every call.
- **The moments** are twenty-four short lines about a person's first weeks, twelve leaning each
  way, mild on purpose. Most people have six that lean the same way; five have one against the
  rest; two begin against how they go on, so a thin slice misleads for them and the thick one does
  not.
- **The deal is fixed.** On each team the six moments agree with the year for six of eight. The
  first second agrees with it for six of eight on Ash and four of eight on Birch. Half of each
  team is dealt with the first second pointing away from where the six moments come to. Eight of
  sixteen do well. Who is on which team, the words and the order are drawn fresh each sitting.
- **The debrief.** (1) Calls that matched the year at 1, 3 and 6 moments as bars against the band a
  coin lands in over sixteen (5 to 11), with two marks for what a reader going only by the moments
  so far, and only by the first second, would have matched; calls the reader was sure of and how
  many of those went against the year. (2) The eight people whose first second pointed away from
  their moments: each of the three calls as a circle, whose way it went and whether it was sure,
  and which way the year went. (3) Ash and Birch side by side, with the coin's band for eight. (4)
  How the deal was made, with every number read off the deal. (5) Five findings and what each
  shows, and what the sheet cannot tell. (6) Nine sources with DOIs. _Deal sixteen new people_.

## What it keeps

Nothing. The calls stay in page memory until the reader leaves. The public build serves the same
page.

## Checked

Every source was checked against Crossref on 30 Sep 2026. The figures quoted were read in the
paper or its abstract: Oskamp (confidence 33.2, 39.2, 46.0, 52.8 percent and accuracy 26.0, 23.0,
28.4, 27.8 percent across four stages, chance 20, 32 judges of whom 8 clinical psychologists, 25
questions); Ambady and Rosenthal 1993 (clips under 30 s, and 6 s and 15 s, against end-of-semester
ratings; attractiveness not as strongly related); Willis and Todorov (100 ms; more time did not
significantly raise correlations and did raise confidence); Todorov et al. (68.8% of 2004 Senate
races; within a 1-second exposure); Kahneman and Klein (predictability, and the chance to learn;
"subjective experience is not a reliable indicator of judgment accuracy"); Thorndike (ratings of
one person's separate traits "very highly correlated and very evenly correlated", a halo). Ambady
and Rosenthal 1992 is cited as the meta-analysis of the thin-slice studies and no figure from it
is quoted.

## Files

`lib/slice.ts` (the deal, the tally, the coin's band, the readings — client-safe),
`content/slice.ts` (the words, the studies, the sources), `components/Slice.tsx`,
`app/slice/page.tsx`, `.sl-*` in `app/globals.css`, `slice` in `lib/palette.ts`,
`lib/slice.test.ts`.

## Acceptance

- `pnpm test` — tsc clean, 321 tests pass, 14 of them in `lib/slice.test.ts`: the deal holds its
  design over eight seeds (sixteen people, eight to a team, eight doing well; the six moments
  match the year for six of eight on each team; the first second for six on Ash and four on
  Birch; four people per team with the first second pointing away from the moments), no tie at
  one, three or six moments, two turned and five wobbled, the words come from the pole they
  claim, the coin's band for sixteen is 5 to 11 (92 in 100) and for eight 2 to 6 (93 in 100), a
  reader going only by the first second matches ten at every call and follows it for all eight
  conflict people, no reading or line of copy contains a verdict word, every study points at a
  source with a DOI.
- `NIWA_MODE=public pnpm exec next build` compiles with `/slice` static; `next start -p 5079`
  serves `/slice`, `/toll`, `/voice` and `/notice` with 200 and no home path in the body, and the
  nav carries slice.
- In the browser, by keys 1 to 4 and Enter: sixteen people met, the year shown after the third
  call with the three calls beside it, then the debrief with every section; no console errors; no
  horizontal overflow at 375 px; paper and sumi.
- Live, after `scripts/deploy-public.sh` from a clean worktree at 60bcea5 (`dpl_BSfSsFKkUhE7Mbmk9AgN6n8H7uuc`,
  aliased to niwa-public.vercel.app): `/`, `/slice`, `/toll`, `/voice`, `/notice`, `/panel` and `/crowd`
  return 200 with no home path and no memory id in the body; `/api/bearing` PUT returns 404;
  `/api/watch` answers and closes. A full sitting played on the live page by keys shows sixteen
  people, the year after each third call and all five debrief sections (six bars, eight conflict
  rows, five team rows, nine sources).

