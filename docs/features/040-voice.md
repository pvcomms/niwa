---
title: The voice — a claim said twice, a reply said warmly
status: shipped
created: 2026-09-30
---

# 040 — The voice

## Why

The ask, in the reader's words: push the Center's familiar-voice instrument to NIWA. The instrument
argues that the feeling a claim is true and the feeling of being understood are both felt as ease,
and that a machine can supply the ease without the truth or the care. It does this to the reader
first and shows its working after, which is the only way the argument lands: told about the
illusory truth effect, people agree and remain subject to it.

It does not decide for anyone. The debrief reports two means and their difference, the same for
the false statements alone, and the reader's two ratings of the replies beside the words each
held. A test runs every reading past a list of verdict words (fooled, gullible, wrong, should).

## What changes

- **A view, `/voice`.** Two panels at the head — the session with its four phases, and a sitting
  that never happened drawn as the debrief would draw it, with no statement text — then four
  phases down the sheet. ⌘Y in the app.
- **A · exposure.** Eight questions put to an assistant, with its answers; rate how interesting
  each is, 1–4 as answer-sheet bubbles (keys work). Four of the embedded statements are so and four
  are not, drawn from sixteen, and the assistant says all eight in the same voice.
- **B · replies.** One sentence from the reader (three offered), then two replies with the same
  information — the sentence handed back with its pronouns turned round, one line of stock advice,
  one question — one of them wrapped in six stock phrases about feeling. Rate each for how
  understood you feel. Shown, every phrase says what it is and the six take a highlighter; the
  sentence is set beside what it became; ELIZA is named; and a warmth dial, 0–4, runs the same
  template on the reader's sentence or on a burnt piece of toast, with word counts for what came
  from the reader, what is stock advice and what is stock feeling.
- **C · judgment.** All sixteen statements in a new order, rated 1–6 from definitely false to
  definitely true.
- **D · debrief.** The mean for the eight met before, the mean for the eight met once, their
  difference; a strip of every rating; the false statements alone; all sixteen with what is the
  case; the reply ratings; one mechanism; the same two moves in ordinary software; seven sources
  with DOIs. _Run it again_ draws a new eight.

## What it keeps

Nothing. A record across sittings would measure little: after one debrief the reader knows which
of the sixteen are so. The sentence typed in B stays in page memory. The public build serves the
same page.

## Checked

Every statement and source was checked on 30 Sep 2026 against Crossref, PubMed and the primary
pages. Three statements from the instrument's first draft were replaced because their truth turns
on a definition or a historian (the Eiffel Tower's summer growth, the Sahara as largest desert,
Napoleon's height).

## Files

`lib/familiar-voice.ts` (draw, reflection, reply, tally, readings — client-safe),
`content/familiar-voice.ts` (statements, phrases, sources), `components/FamiliarVoice.tsx`,
`app/voice/page.tsx`, `.fv-*` in `app/globals.css`, `voice` in `lib/palette.ts`,
`lib/familiar-voice.test.ts`.
