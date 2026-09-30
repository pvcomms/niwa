---
title: The keel — stop flowing, believe in something
status: shipped
created: 2026-09-30
---

# 044 — The keel

## Why

The ask, in the reader's words: add the Center's instrument Stop Flowing to NIWA. The instrument
is about Gen Z and a self that has come apart. A self put together from the feed has no keel: its
positions sit wherever the current last left them, and from the inside a position drifted into
feels exactly like one that is held. The only way to tell them apart is to move the crowd and
watch. Believing in something is then a behaviour. A held position stays put when the room turns,
and the reader would say it in every room they are in.

The toll (041) asks for a choice with only who would know changed; the keel asks for the same
position twice with only the crowd changed. It does not decide for anyone. The readings are
noise, pull and counts, and a test runs every reading past a list of verdict words.

## What changes

- **A view, `/keel`.** One sheet, ⇧⌘K in the app.
- **The claim.** Three paragraphs: no keel; Gergen's saturated self and Bauman's liquid modernity;
  believing as a behaviour. _Answer before you read what the crowd was._
- **I · alone.** Twelve positions, two in each of six topics (taste, the feed, the news cycle,
  work, people, self), 1–7. Sealed on going on.
- **II · the current.** The twelve again in a new order, inside a feed of invented posts. One
  position per topic gets a poll made on the spot on the far side of the first answer (about four
  in five against) and a top comment arguing that side; the other six say _no votes yet_ and are
  the control.
- **III · the keel.** What was arranged, said plainly first. Noise (mean absolute move on the
  control), pull (mean signed move toward the crowd), held of six. One reading. Every position on
  its own track: alone hollow, in the current filled, the crowd's votes and its mean behind, a ring
  in the held colour on a position that held against a crowd. Held, carried, pushed back; wobbled on
  the control. Reactance, Asch, Deutsch and Gerard, Salganik, Muchnik.
- **IV · the rooms.** Up to three positions, each in the group chat, at the family table, in a
  public post and with someone you just met: say it, soften it, keep quiet. How many go into every
  room whole; context collapse.
- **V · articles.** For each: _I believe_ in the reader's words, _I got here through_ (lived,
  someone I trust, read or studied, the feed, can't say), _I'd change my mind if_. Set down on a
  card with the counts beneath; copy the articles out. Notes on what the articles show about
  themselves; the coda on "Believe in something" as a 2018 advertising line.
- **Beside it:** the sitting, a sitting that never happened (topics only), what it leaves to you,
  ten sources with DOIs where they have them.

## What it keeps

Nothing. The articles are the reader's and stay in page memory until they copy them out. A record
across sittings would mostly measure memory of the twelve. The public build serves the same page.

## Checked

Sources checked on 30 Sep 2026 for the instrument: seven DOIs resolve on Crossref as cited, and the
Salganik (14,341 participants) and Muchnik (+32%, +25%) figures were read from their PubMed abstracts.
The Asch figures (about a third, about a quarter) are the monograph's commonly reported summary,
not re-derived from its tables.

## Acceptance

```bash
pnpm test                                   # tsc clean; 341 pass, 0 fail (9 in lib/keel.test.ts)
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5050/keel   # 200
```

## Files

`lib/keel.ts` (crowds, verdicts, noise and pull, readings, rooms, articles — pure),
`content/keel.ts` (every word), `components/Keel.tsx`, `app/keel/page.tsx`, `.kl-*` in
`app/globals.css`, `keel` in `lib/palette.ts`, `lib/keel.test.ts`.
