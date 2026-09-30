---
title: The half-second — a feed engineered against a toy body, and the trace of what you did before you knew
status: shipped
created: 2026-09-30
---

# 034 — The half-second

## Why

Every other sheet in the garden starts after the reader has a thought. This one starts before.
A body registers a card about 150 ms after it lands and the reader becomes aware about 500 ms
after; a feed is engineered for the gap, and what arrives on the far side as a mood or a decision
is downstream of a body already moved. The Center's instrument of the same name
(`~/work/capp/instruments/half-second`, public on pvcomms) makes that argument on one offline
page. The garden wants the same apparatus with what the garden adds: a trace kept, the reader's
own words beside it, and a desk that counts.

## What changes

- **A twenty-fifth view, `/half-second`.** The phone with the twelve invented cards and the pull
  to refresh; the line figure with five channels, six gauges and the bloom; the knobs (the years
  the reader grew up in, show the engineering); the half-second scrubbed, with a card fired slowed
  four times; the question twice; the three meters under a norm; put it down; what the feed thinks
  the reader is, with zero it; language, coarse or granular.
- **The trace.** Every dwell, skip, glance, tap, pull, the good card, the hail, put down and
  picked up, as events with a time since the trace began. The meters, the weights, the bloom and
  gauges at their highest. Kept as one markdown file with the events as a list, what the reader
  would say, what the trace shows, afterwards.
- **The reading and the record.** The feed's first guess, which meters moved and what each reads,
  the bloom at its highest under both vocabularies, words said beside lines shown; across traces,
  the hail answered in how many, put down in how many, standing down and threat up in how many.
  Counts, never a grade; `lib/half-second.test.ts` runs every line past the verdict words.
- **The notice** gets the card, a step and the key; the Mac app gets ⌘J.
- **The specimen.** Under `NIWA_MODE` the route serves Specimen A's two traces, read-only; PUT and
  DELETE 404.

## What it deliberately does not do

It measures nothing from the reader: the feed is fiction and the body is a toy, and the page says
so. It never says the reader was hooked, that the reason they gave was wrong, or that they should
put it down. No model is asked. A kept trace is read, not re-run.

## Acceptance

```bash
pnpm test                                   # 256 tests pass, tsc clean (ran 30 Sep 2026 on the staged tree)
curl -s localhost:5050/api/half-second | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['writable'], len(d['traces']))"
                                            # True <n>
NIWA_MODE=public … GET /api/half-second     # {"traces":[2 specimen], "writable":false}; PUT, DELETE → 404
```

## Where

`lib/half-second.ts` (pure: the feed, the body, the trace, the readings) · `lib/half-second-store.ts` ·
`content/half-second.ts` · `app/api/half-second/route.ts` · `app/half-second/page.tsx` ·
`components/HalfSecond.tsx` · `.hs-*` in `app/globals.css`.
