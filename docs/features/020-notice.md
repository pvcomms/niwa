---
title: The notice — how to use the garden, and what it leaves to you
status: shipped
created: 2026-09-25
---

# 020 — The notice

## Why

The ask, in the reader's words: clear instructions on how to use it, and on exercising your
own judgement — this is a tool to help you overthink so you come away with an informed
output, grounded in reality, that guides you toward more aligned choices and decisions.

Eleven views in, the garden had no page that said what it was for. Each view's masthead
says what that view does in a sentence; the README says the rest, and the README is on
GitHub, not in the app. A reader who arrives at the bearing with a decision has to work out
for themselves whether it belongs there or on the alarm, and nowhere in the app is the
constellation's rule — the tool surfaces, the person judges — said to the person it protects.
The rule was in every DECISIONS entry and on no sheet.

The stance matters more than the manual. Overthinking is what a decision does with nowhere
to go; the garden's claim is that it gives it somewhere to go and something to check
against — the reader's own record, dated, counted, drawn hollow where unchecked — so that
the going round ends in something grounded rather than in more going round. That is the
thesis paragraph the template asks for, and here it is the whole feature: a page that says
it, plainly, to the reader, and then tells them which sheet to reach for. The judgment stays
theirs, and the page says so in the third sentence rather than the last.

## What changes

- **A twelfth view, `/notice`.** The same masthead as the others, the twelfth tab, the
  theme chip. Nothing on it reads a file or calls a host, so a deployed garden carries the
  same notice as the one at home.
- **What this is for.** Three paragraphs, the first set large in the display face: the
  instrument for overthinking on purpose; the aim of coming out the other side with
  something checked against what is actually so rather than against how it feels; and the
  judgment being the reader's — nothing here scores, ranks, recommends or says whether a
  thing is true; where a sheet draws a line, the reader's marks drew it. Under them, in the
  hand, the model: two views ask one, it is the one on this machine, everything it says
  arrives hollow until kept, and it is never asked what the reader should do.
- **What it is grounded in.** On the desk, six grounds: your writing (read from disk on
  every request, nothing cached), dates (a belief's inputs dated by the first commit they
  appear in), what you checked (a hand solid only where its link was read once), words
  counted (the census, hand to hand, the distribution's kinship — all checkable against the
  source), your own marks, and the limit: it is only as grounded as the record, and a
  fallow bed, a hollow hand and an empty margin are signals, not defects.
- **One way round.** Ten steps for when something is on your mind, each an _if_ that names
  the view it goes to, with a link and the key: say it first (the margin, `'`) · find what
  you already have (the catalogue, ⌘2) · if it is a decision (the bearing, ⌘3) · if it sets
  you off (the alarm, ⌘8) · if a belief is under it (the course, ⌘6; the flow, ⌘5) · if a
  claim is doing the work (the provenance, ⌘P) · if something new is coming in (the
  distribution, ⌘4) · put it in time (the chronology, ⌘7) · write the then (the way, ⌘9) ·
  read yourself back, then decide (the margin, ⌘M). The heading says: take the steps that
  apply, in any order; skip the rest. Each number is ringed by hand; the steps arrive one
  after another.
- **Each view, on one card.** Eleven cards, each with _for_, _do_, _reads back_ and
  _never_ — the one thing that view will not do, in the accent. The name links to the view;
  the key is printed as on the cap.
- **The keys.** One table: `/`, `⌘K`, `esc`, `[`, `⇧ drag`, `'`, double-click, the arrows,
  `⌘ wheel`, `⌘1 – ⌘9 · ⌘M · ⌘P · ⌘?`, `⌘0`, paper · sumi — what each does and where it
  works.
- **What it will not do**, seven lines: score, rank or grade; recommend; say whether a
  claim is true, likely, credible or trustworthy; decide what mattered or draw a thread the
  reader did not draw; write their interests, marks or reasons; leave the machine; keep
  anything they did not write. **What is yours to do**, seven lines, ending with deciding
  and then writing it down so the garden has it next time.
- **The text is content.** `content/notice.ts` holds every word; `components/Notice.tsx`
  only sets it. `lib/notice.ts` gives it a shape and `validateNotice` says, as sentences,
  every way it is incomplete: a view with no card, a card for a view that went away, a step
  to nowhere, an empty field, a home path or an address in the text. The test also insists
  the notice keeps the promises in so many words — _score_, _recommend_, _true_, _yours_ —
  so a rewrite that quietly drops them fails.
- **The Mac app** gets ⌘? (_Notice_ in the View menu). **The margin** knows the view's
  name, so an aside made here is filed _at the notice_. **ViewSwitch** has a twelfth tab.

## What it deliberately does not do

It does not put a "how to read this" fold on each view: the cards live here and every view
is one tab away. It does not run a first-visit tour, highlight anything, or open itself
unasked. It does not tell the reader what to decide, which step to take first, or which
view suits their case beyond the plain _if_; the round is one way, not the way, and says
so. It does not read the reader's garden to personalise itself — the same notice for
everyone, since it is about the instrument and not about them.

## Where

| File                                                                 | Change                                                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `content/notice.ts`                                                  | every word of the notice                                                                   |
| `lib/notice.ts`, `lib/notice.test.ts`                                | the shape, `validateNotice`, and the four tests                                            |
| `components/Notice.tsx`                                              | the stance, the grounds, the round, the cards, the keys, not and yours                     |
| `app/notice/page.tsx`                                                | the route                                                                                  |
| `components/ViewSwitch.tsx`                                          | twelfth tab                                                                                |
| `lib/margin.ts`                                                      | the view's name for the margin                                                             |
| `scripts/NiwaApp.swift`                                              | ⌘?                                                                                         |
| `app/globals.css`                                                    | the steps' and cards' arrival, the key cap, the card's lift                                |
| `docs/ARCHITECTURE.md`, `DECISIONS.md`, `CHANGELOG.md`, `README.md`  | the map, the decision, the entry, the section                                              |

## Out of scope

A help fold on each of the eleven views (eleven components, one of them 4,600 lines; a
feature of its own if wanted). A first-run tour. Localising the text. Reading the notice
aloud through the speech server. Linking a card to its spec in `docs/features/`.

## Acceptance checks

Run on 2026-09-25 against the dev server on 127.0.0.1:5050.

```bash
pnpm test
# tsc clean · 132 pass · 0 fail (lib/notice.test.ts: 4)

curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/notice
# 200
curl -s 127.0.0.1:5050/notice | grep -o "one way round\|what this is for\|each view, on one card" | sort -u
# each view, on one card
# one way round
# what this is for

git grep -nE '/Users/|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' -- ':!lib/publish.test.ts' content/notice.ts lib/notice.ts components/Notice.tsx
# (nothing)
```

- [x] The twelfth tab reads _notice_ and is underlined by hand on `/notice`; the eleven
      others still lead where they did
- [x] The stance's first paragraph is set large; the third says the judgment is yours and
      names what the garden will not do
- [x] Every step of the round links to a view that exists and the link goes there; every
      card's name goes to its view
- [x] Sumi holds: ink, rule, accent and the key caps all follow the palette
- [x] 375px holds: the tabs wrap, the grids stack, the keys table scrolls inside its own
      panel and the page does not scroll sideways
- [x] `validateNotice` names a missing card, a step to nowhere and a home path (the third
      test); an empty notice fails, a whole one returns nothing
- [x] `pnpm build` is not run here — the garden is served by `next dev` under launchd — but
      `tsc --noEmit` is clean under `pnpm test`

## Notes

The name. The instructions posted at a garden's gate are a notice; and to notice is the
whole of what the Center asks of a tool's user. Both readings were wanted. _Manual_ was
considered and dropped as a word that promises the tool works the same for everyone;
_help_ as a word that implies something went wrong.
