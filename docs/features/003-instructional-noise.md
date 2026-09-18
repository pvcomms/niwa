---
title: Stop counting example wikilinks as real references
status: next
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

```bash
pnpm test
node --experimental-strip-types scripts/unplanted.mjs
```

- [ ] A `[[ref]]` inside a fenced code block creates no ghost
- [ ] A `` `[[ref]]` `` inside inline backticks creates no ghost
- [ ] A real `[[ref]]` in the same file still creates its ghost
- [ ] `links`, `wikilinks`, `double brackets` and `Note\` are gone from the real output
- [ ] `Non-Algorithmic Life` and the missing daily note are still present

## Notes

The `Note\` entry suggests a second, smaller bug: a trailing backslash is being captured into
the ref. Worth checking the wikilink regex while in there.
