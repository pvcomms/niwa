---
title: Rank the unplanted ideas
status: shipped
created: 2026-09-19
---

# 001 — Rank the unplanted ideas

## Why

The garden already knows something that nothing currently surfaces. A ghost stone is an idea
named often enough to link to and never written down — `lib/garden.ts` creates one for every
unresolved `[[wikilink]]` and joins it with a `seed` link. On the canvas they are visible but
undifferentiated: a ghost referred to once looks exactly like a ghost referred to nine times.

The one referred to nine times is not a gap in a graph. It is a thing you keep reaching for
and have never made yourself say. That is the most useful signal this tool holds and it is
currently unreadable.

This surfaces and does not decide. It reports a count and names the notes doing the pointing.
It does not tell anyone what to write, rank ideas by importance, or suggest anything.

## What changes

- Before: ghosts are counted in `stats.ghosts` and drawn as hollow stones. Which ones matter
  can only be guessed by eye, by rotating the graph.
- After: a pure function ranks them by how many distinct notes point at each one, and a
  script prints that list with the pointing notes named.

## Where

| File                    | Change                                                        |
| ----------------------- | ------------------------------------------------------------- |
| `lib/ghosts.ts`         | new. `rankUnplanted(garden)` → ranked list, pure, no I/O      |
| `lib/ghosts.test.ts`    | new. fixture graph → expected ranking, including the tie rule |
| `scripts/unplanted.mjs` | new. derives the garden, prints the ranked list               |

## Out of scope

No canvas or Reader changes — that is `002`. No writing of stub notes for ghosts: creating
the note is the person's work, and a tool that drafts it has taken the exact thing this
repo exists to protect. No persistence; the list is derived on each run like everything else.

## Acceptance checks

```bash
pnpm test                                        # tsc clean, all tests pass incl. ghosts.test.ts
node --experimental-strip-types scripts/unplanted.mjs   # prints the real ranked list
```

- [x] Ranking is by count of **distinct** source notes, not by raw link count
- [x] Ties break alphabetically by label, so output is stable between runs
- [x] A garden with no ghosts prints a clear line rather than an empty void
- [x] `rankUnplanted` does no file I/O — it takes a `Garden` and returns data

## Notes

`seed` links point _from_ the note _to_ the ghost, so the source side of the link is the
pointing note. Ghost ids are `ghost:${norm(ref)}`.

**Shipped 2026-09-19.** `pnpm test` — 28 pass, 0 fail, tsc clean. Against the real garden:
17 unplanted ideas across 322 stones.

`rankUnplanted` tolerates link ends that are node objects as well as ids, because
3d-force-graph mutates links in place once rendered and `002` will call this client-side.
Covered by a test rather than left as a surprise.

**Discovered while building, and it matters:** the ranking is polluted. Four of the top
entries — `links`, `wikilinks`, `double brackets`, `Note\` — are not ideas. They come from
course and cheatsheet notes containing literal `[[wikilink]]` examples as _instruction_,
which the parser cannot tell from a reference. The signal underneath is real
(`Non-Algorithmic Life` is a genuine unplanted concept; `2026-07-31 — No slop. No AI` is a
missing daily note reached for seven times) but it sits under noise. `003` fixes it. The
output was not quietly filtered to make this feature look better.
