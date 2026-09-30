---
title: The unison — the same words to the eye and the ear at once
status: shipped
created: 2026-09-30
---

# 043 — The unison

## Why

The ask, in the reader's words: multi-channel processing can be valuable (see studies) — reading
while listening to a book; cite the studies, show it, make it a game. The studies say it depends on
who is reading and how the channels are split. For adults reading a language they read well at
their own pace, hearing the words adds almost nothing (g = 0.06 across the self-paced studies in
Clinton-Lisell's 2023 meta-analysis; no difference in Rogowsky et al., 2016). It helps where the
pace is set for the reader (g = 0.41), for students with reading disabilities (d = 0.35, Wood et
al., 2018) and for struggling readers; for people learning a language the studies split, from
gains in vocabulary and reading rate to a 2026 registered report where it did worse than reading
silently. Split differently — a picture with the words spoken rather than printed — a second
channel helps, by less than first reported; the same words printed and spoken over a picture, or
other words playing while one reads, cost. So the view does it to the reader first, three ways,
then shows seven arrangements and what the studies found for each, marked with the readers each
study was about.

It does not decide for anyone. Twelve questions cannot say which way a person reads best, and the
view says so with the reader's own numbers: how often three rounds would spread as far as theirs
did if the way made no difference. A test runs every reading past a list of verdict words.

## What changes

- **A view, `/unison`.** Two panels at the head — the sitting with its three stages, and the voice:
  a speaking voice on this machine, its pace and its loudness, and a line to hear it by. Nothing
  plays until the reader presses play; voices that sing or whisper are left out. ⇧⌘U in the app.
- **A · three rounds.** Three invented passages of about 125 words, one read at the reader's own
  pace, one heard and never shown (a slug for each word fills as it is said), one shown and heard at
  once with the word being said marked. The order of the ways and of the passages is drawn fresh.
  Four questions after each, three options, keys 1–3, no looking back. Without a voice on this
  machine only the reading round runs.
- **B · side by side.** Each way's count of four with a cell per question, its seconds and words a
  minute (the reader's own for reading, the voice's for the other two); the rounds in a sentence;
  how often chance alone spreads three rounds that far at the reader's overall rate (exact, over
  every outcome); what guessing averages. Then a line of words a minute with the reader, the voice
  and the average adult on it, and what the studies found for adults reading in their own language.
- **C · the channels.** Seven arrangements — read, heard, read while heard, a picture with the words
  spoken, a picture with the words printed, a picture with the words printed and spoken, reading
  while other words play — each drawn: the page and the ear, the eye and its one place at a time,
  printed words turned to sound, the store for words and the store for pictures filling, and
  spilling when two streams of words meet in one. Below, what the studies found, each marked with
  the readers it was about; pick a reader to bring theirs forward. The sources, with DOIs.

## What it keeps

Nothing. The rounds are in page memory; the voice is the browser's, on this machine. The public
build serves the same page.

## Checked

Every source was checked on 30 Sep 2026: all 28 DOIs against Crossref (title, authors, venue,
volume, pages), every finding against the abstract, and the numbers from Clinton-Lisell (2023),
Brysbaert (2019), Martin et al. (1988), Brown et al. (2008), Moreno and Mayer (2002), Varao Sousa et
al. (2013) and Wood et al. (2018) against the full text. Clinton-Lisell (2023) has no journal DOI and
is cited by its ERIC number; Brown et al. (2008) by its handle. Left out as unconfirmed: the
per-condition effect sizes in Adesope and Nesbit (2012) and Ginns (2005), and any peer-reviewed
measure of audiobook narration rate (Brysbaert's 140–180 words a minute is given without a source,
and the page says so).

## Files

`lib/unison.ts` (draw, words and sentences, words a minute, the spread, the toy load, readings —
client-safe), `content/unison.ts` (passages, arrangements, findings, sources),
`components/Unison.tsx`, `app/unison/page.tsx`, `.un-*` in `app/globals.css`, `unison` in
`lib/palette.ts`, `lib/unison.test.ts`.

## Acceptance checks

Run on 2026-09-30 in a clean worktree on top of 042, dev server on 127.0.0.1:5082.

```bash
pnpm exec tsc --noEmit && pnpm test
# tsc clean · 332 pass · 0 fail (lib/unison.test.ts: 11)
curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5082/unison
# 200
```

- [x] a whole sitting in the browser with the voice's volume forced to 0 (Samantha, one of 10 speaking
      voices left of 25 English ones on this machine): both round with the word marked as it is
      said, heard round as slugs that fill, pause holds, reading round timed; B reads _You answered
      none of four as the passage had it after both at once, four after hearing, and three after
      reading … would spread at least this far in 2 sittings out of 100_; going on early in the
      both round reads _you went on N seconds before the voice finished_; no console errors
- [x] the seven arrangements drawn, the spill for other words, what the eye misses of a picture;
      picking a reader dims the findings about other readers
- [x] sumi reads; 375px holds (scrollWidth 375)
