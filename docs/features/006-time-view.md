---
title: Read the garden over a date range
status: draft
created: 2026-09-19
---

# 006 — Read the garden over a date range

## Why

Every stone already knows when it was last touched. `lib/garden.ts` reads `modified` from
frontmatter, falls back to the file's mtime, and buckets it into four stages with fixed
windows: seven days is `fresh`, thirty is `tended`, ninety is `settled`, older is `fallow`.
The canvas spends that on opacity alone, so age reads as a faint wash and nothing more.

The question a person actually has is not "which stones are old". It is "what was I thinking
about in July", or "what have I not touched since I started this job". Those are date ranges,
and the data to answer them is already in every node. The fixed windows also encode one
person's writing rhythm as though it were a fact about gardens.

This surfaces and does not decide. A fallow bed is information, not a chore: nothing here
should nudge anyone to go and water an old note, rank stones by neglect, or suggest what to
revisit.

## What changes

- Before: age is four hardcoded buckets rendered as opacity. There is no way to ask about a
  period.
- After: a range control over the garden's own span of `modified` dates. Stones outside the
  range recede the way a search miss does; the colophon says how many are inside it.

## Where

| File                    | Change                                                                |
| ----------------------- | --------------------------------------------------------------------- |
| `lib/garden.ts`         | `stats.newest` and `stats.oldest` already exist; expose the span       |
| `lib/time.ts`           | new. pure: garden plus a range in, the set of node ids inside it out   |
| `lib/time.test.ts`      | new. fixtures for an empty range, a range with no dated nodes, the ends |
| `components/Garden.tsx` | the control, and the dimming pass that already exists for search       |

## Open questions

Whether the control is a two-handled range, a single "since" date, or a scrubber that plays
the garden forward. A scrubber is the most interesting and the most likely to become a toy
that nobody uses twice.

Whether nodes with `modified: null` — repos with no readable date, ghosts — are always in or
always out. Always out hides real stones for a reason a person cannot see, which is the
failure this repo is organised against.

Whether the four stage thresholds should become configurable at the same time, or whether
that is a separate, smaller change that should land first.

## Out of scope

No animation of the graph's history: niwa reads the current state of the disk and has no
record of what the garden looked like last month. Anything that implies it does is a lie the
data cannot back.

No git history. The vault is not necessarily a repository, and reading one would make the
tool's honesty depend on someone else's commit discipline.

## Acceptance checks

Not written yet — the shape of the control is undecided, and checks written before that are
adjectives pretending to be commands. At minimum this will need:

```bash
pnpm test    # including lib/time.test.ts
```

- [ ] A range covering the whole span leaves the canvas identical to no range at all
