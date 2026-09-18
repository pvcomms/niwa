---
title: Make the filters say how much they are hiding
status: next
created: 2026-09-19
---

# 005 — Make the filters say how much they are hiding

## Why

The canvas already has the controls. `/` focuses the search box, `esc` clears it, the Beds
chips toggle stones by kind and the Threads chips toggle links by type, all of them real
buttons with `aria-pressed`. What is missing is the number.

Search dims non-matching stones to 7% opacity and lists the top eight hits. A person typing a
word into a graph of 324 stones cannot tell whether they are looking at eight of nine matches
or eight of ninety. The Beds chips each carry a count; the Threads chips carry none, so the
cost of turning one off is invisible until it is gone. And the two systems do not compose:
matches are computed over the whole garden, so a hit inside a bed that is currently filtered
out is still counted and listed, then cannot be found on the canvas.

The instrument's job is to let someone see what is there. A control that hides an unknown
quantity is the instrument making a judgement on their behalf.

## What changes

- Before: search dims and lists eight; Threads chips have no counts; matches ignore the
  active filters.
- After: every chip carries the count it controls, the search reports how many stones matched
  and how many of those are currently visible, and the Reader shows that count while a search
  is active.

## Where

| File                    | Change                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| `components/Garden.tsx` | count links by kind for the Threads chips; intersect `matches` with the visible set; pass the counts down |
| `components/Reader.tsx` | show the match count for the current query above the body, when there is one |
| `lib/garden.ts`         | `stats` already carries `byKind`; add the per-link-kind tally if it is not derivable client-side without a second pass |

## Out of scope

No change to what search matches on — label, description and body stay as they are. No fuzzy
matching, no ranking beyond the existing degree sort. No new filter dimension: stage, source
and signed status are not getting chips here. Search keeps dimming rather than removing, since
seeing a hit in its neighbourhood is the reason the graph exists.

## Acceptance checks

```bash
pnpm test        # tsc clean, all pass
pnpm dev         # then look
```

- [ ] Each Threads chip shows a count, and the four counts sum to the total link count in the
      colophon when every chip is on
- [ ] Typing a two-letter query shows "N matched" where N is the full match count, not 8
- [ ] Turning off a Bed that contains matches lowers the visible count and leaves the matched
      count alone
- [ ] With a stone selected and a query active, the Reader shows the same count as the header
- [ ] Clearing the query with `esc` removes the count rather than showing zero
