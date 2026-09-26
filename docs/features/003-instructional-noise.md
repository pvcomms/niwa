---
title: Stop counting example wikilinks as real references
status: shipped
created: 2026-09-19
---

# 003 — Stop counting example wikilinks as real references

## Why

`001` shipped and immediately showed the flaw. Of the seventeen unplanted ideas in the real
garden, four of the highest-ranked are not ideas: `links`, `wikilinks`, `double brackets`,
`Note\`. They come from course notes, cheatsheets and the "Start Here" lesson — documents that
contain `[[wikilink]]` syntax as _instruction about the syntax_, which the parser reads as a
reference to something unwritten.

The consequence is not cosmetic. The whole value of the ghost ranking is that a high count
means "you keep reaching for this". A tutorial mentioning the word `links` four times
outranking a real unplanted concept makes the list untrustworthy, and an untrustworthy
instrument is worse than none — the person stops looking, which is the specific failure this
repo exists to avoid.

## What changes

- Before: every unresolved `[[ref]]` becomes a ghost with equal standing, including refs
  inside fenced code, inline code, and notes whose subject is the syntax itself.
- After: refs that are demonstrations rather than references do not create ghosts.

## Where

| File                 | Change                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| `lib/garden.ts`      | strip fenced and inline code spans before extracting wikilinks         |
| `lib/garden.test.ts` | fixtures covering a code fence, backticks, and a real ref beside them  |
| `lib/ghosts.ts`      | possibly nothing — prefer fixing the source over filtering the symptom |

## Out of scope

No keyword denylist of terms like `links` or `wikilinks`. A denylist would suppress the
symptom in this garden and silently break someone else's, where `Links` may be a real concept.
Fix the parse, not the output.

No change to how _resolved_ wikilinks behave — a real link inside a code fence is a
demonstration too, but removing existing edges is a separate, larger decision.

## Acceptance checks

Run on 2026-09-26 against the real garden and the dev server on 127.0.0.1:5050.

```bash
pnpm test
# tsc clean · 163 pass · 0 fail (lib/garden.test.ts: 3 new; the first two fail on the old parser)

node --experimental-strip-types scripts/unplanted.mjs
# before: 20 unplanted ideas across 611 stones — links 4, slug 2, wikilinks 2 in the top five
# after:  12 unplanted ideas across 603 stones — the missing daily note still first, from 7 notes

curl -s 127.0.0.1:5050/api/garden   # seed threads 32 → 19; every other kind unchanged by this
```

- [x] A `[[ref]]` inside a fenced code block creates no ghost
- [x] A `` `[[ref]]` `` inside inline backticks creates no ghost
- [x] A real `[[ref]]` in the same file still creates its ghost
- [x] `links`, `wikilinks`, `double brackets` and `Note\` are gone from the real output, and
      so are `link`, `wikilink` and `slug`, which were shown in code the same way
- [x] The missing daily note is still present, still first
- [x] `Non-Algorithmic Life` is gone, and this check was wrong to expect it: its one
      occurrence in the garden is inside inline code, in a Course lesson's exercise that tells
      the reader to type the link. By the second check it is a demonstration. It comes back
      the day the link is typed into a note.

## Notes

The `Note\` entry was the second bug: a table escapes the alias pipe as `[[Note\|shown]]`
and the backslash was captured into the ref. It is dropped now, in code or out.

Two vault-root agent files whose only thread was a seed to `wikilinks` are unconnected
now. That is what they are: instructions to an agent, not notes that reach for anything.
