---
title: The stones — how each thing came into the garden, beside where you think your ideas come from
status: shipped
created: 2026-09-30
---

# 039 — The stones

## Why

The Epistemic Garden's _how to measure serendipity online_ (lab notes #5) read the first
exchanges of a thousand relationships in the Community Archive and found three ways they start:
a thread that sparked (55–60%), a shared arena (15–18%), a request for help (12–15%). The same
question, put to one garden, is where its ideas come from. The provenance (019) already asks how
one claim reached the reader, hand by hand. Nothing asked it of the garden as a whole, and the
reader has a picture of where their ideas come from that nothing checks.

## What changes

- **A second sheet on the provenance, `/provenance/stones`.** The claim sheet links to it and it
  links back. No new tab.
- **Your split first.** Six dials, one per route — read, told, asked, made, lived, thought —
  weighed against each other and said in 100. The count waits until it is said, or until _show
  the count without saying_.
- **The count.** Every stone with words in it (the distribution's beds: concepts, fieldnotes,
  Notion, garden notes, reading, memory). One bar per route as a share of the placed: yours solid,
  read off the file in ink, proposed by the model hatched. Your split is a pen tick across each
  bar. Filter by bed: everything, your writing, memory, reading. The reading counts who placed
  what, what is unread and what the model could not place, the routes by count, and the widest
  gap between your split and the garden's.
- **Read off the file.** The Reader archive and Fieldnotes Sources are _read_ by rule, fresh each
  time.
- **The model reads the rest.** _Ask the model to read N unread_ sends the next eight stones'
  openings to the model on this machine and loops until none are left or you stop it (about 14 s
  a batch with `qwen3.6:35b-a3b`). A route is kept only with a phrase copied from the stone that is
  found in it; otherwise the stone is marked not placed, with why, and not asked again.
- **A route opened.** Its stones, yours first, each with its reason (the model's quote, the rule's
  name or your word) and the six routes as rings: press the pale one to keep it as yours, another
  to change it, yours again to take it back. _The unplaced_ lists what is left.
- **Kept as one file**, `niwa-vault/content/genesis/marks.json` (`NIWA_GENESIS_DIR`): the split,
  a mark per stone, the stones not placed. Your marks are never written over; a broken file is
  refused.

## What it deliberately does not do

It never says one route is a better way for an idea to arrive, or that a split is off. It does
not find its routes in the data. It does not treat a proposal as known: the quote shows the
reason is real, not that the route is right. It does not deploy: the public garden has no stones
to read.

## Where

| File                                                        | Change                                                                  |
| ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| `lib/genesis.ts`, `lib/genesis.test.ts`                     | routes, rules, the prompt and the quote check, standing, tally, split, readings, the file |
| `lib/genesis-store.ts`                                      | one JSON file; broken is refused                                        |
| `app/api/genesis/route.ts`                                  | GET, PUT the split, PATCH a mark, POST a batch to the model             |
| `app/provenance/stones/page.tsx`, `components/Genesis.tsx`  | the sheet                                                               |
| `components/Provenance.tsx`                                 | the link to the stones                                                  |
| `app/globals.css` (`.gn-*`)                                 | the reveal, the bars' easing, the legend keys                           |
| `content/notice.ts`                                         | the provenance card                                                     |
| `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `CHANGELOG.md` | the map, the decision, the entry                                        |

## Acceptance checks

Run on 2026-09-30 from a clean worktree on ab03de2, on a check server at 127.0.0.1:5087 with
`NIWA_GENESIS_DIR` in a scratch directory.

```bash
pnpm test
# tsc clean · 286 pass · 0 fail (lib/genesis.test.ts: 11)
curl -s 127.0.0.1:5087/api/genesis   # 461 stones; 35 read off the file, 426 unplaced
curl -s -X POST 127.0.0.1:5087/api/genesis
# {"read":8,"placed":7,"left":418,"ms":14320,"model":"qwen3.6:35b-a3b"}
curl -s -X PUT 127.0.0.1:5087/api/genesis -d '{"split":{}}'   # 400 put something on at least one route
```

Probing three batches before building: the quote check held on every kept mark; a first prompt
filed an overnight build as _lived_ and a daily reminder as _told_, and a sharper definition of
each route (a note that records a build is _made_; a reminder or list with no origin is unsaid)
fixed both. Some proposals still read the route loosely — a deploy gotcha as _lived_, a course
lesson as _told_ — which is why they are counted apart until kept.

- [x] the count waits for the split; once said, six bars with the ticks and the reading's widest gap
- [x] keeping a proposal makes it yours with its quote; changing moves it; taking it back returns it to unread
- [x] the file carries the split, yours as `by: you`, proposals as `by: model`, and no rules
- [x] the claim sheet links to the stones and back
- [x] sumi reads; 375px holds (scrollWidth 375, one line a route); no console errors
