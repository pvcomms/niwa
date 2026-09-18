---
title: Surface the unplanted ranking in the canvas
status: next
created: 2026-09-19
---

# 002 — Surface the unplanted ranking in the canvas

## Why

`001` makes the ranking available but only to a terminal. The garden is the place a person
actually looks, and the ghost stones are already drawn there — they just carry no weight.

## What changes

- Before: every ghost stone renders identically regardless of how many notes point at it.
- After: ghost stone size reflects the number of distinct notes pointing at it, and the
  Reader panel for a ghost lists those notes by name.

## Where

| File                    | Change                                                        |
| ----------------------- | ------------------------------------------------------------- |
| `components/Garden.tsx` | size ghost stones from the rank, keeping the hollow material  |
| `components/Reader.tsx` | for a ghost, show the pointing notes instead of an empty body |
| `lib/ghosts.ts`         | expose the rank as a map keyed by ghost id for cheap lookup   |

## Out of scope

No new colour. Ghosts stay hollow and stay the ghost colour — weight is the only new channel.
No sorting, filtering or list UI in the canvas; this is about the stones themselves.

## Acceptance checks

```bash
pnpm test
pnpm dev    # then look
```

- [ ] A ghost with one pointer is visibly smaller than one with several
- [ ] Selecting a ghost shows the notes that point at it
- [ ] A garden with no ghosts renders exactly as before
