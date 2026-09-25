---
title: The oblique — a card dealt to come at the thing from an angle
status: shipped
created: 2026-09-25
---

# 021 — The oblique

## Why

The ask, in the reader's words: Oblique Strategies, the Brian Eno thing, as a tool for a
reframe or a redirection or to think differently — powerful in action, something like the
one-card-per-click sites that deal the deck — built into niwa.

The form is worth having exactly because it says nothing about the problem. A card that
reads _turn it over_ knows nothing of what is on the desk, and that is why it moves it: the
reader does the work of making it apply, and the work is the reframe. It sits well beside
the other views, which all read the reader's own record back; this one throws something
in from the side.

Two things had to be decided honestly. The card texts of the 1975 deck are Eno and
Schmidt's, and this repository is public, so the garden does not ship them; a reader who
owns the deck can type its cards into a deck of their own, which is a markdown file beside
the vault. And the garden should not only be a card viewer, because it knows things no
printed deck can: which stones have lain fallow, which ideas were named and never written,
which terms are the reader's own, what they said their values were, what they touched this
week. Each of those is an oblique prompt when turned into one, and the stone is one press
away. The tool deals; it never picks a card over another or says what one means.

## What changes

- **A thirteenth view, `/oblique`.** One card at a time on a drawn sheet, set large in the
  display face; the source and _n of m this sitting_ above it in the meta voice. Click,
  space, enter or → deals the next; ← goes back along this sitting's draws; the draws are
  listed under the card in the hand and any one can be returned to. The deal is a seeded
  Fisher–Yates over the pool, so nothing repeats until the shuffle is out, and then it is
  shuffled again. _shuffle_ reshuffles on demand.
- **Two sources, all in the shuffle until struck.** The decks: the garden's **starter deck**
  (56 cards in its own words, `content/oblique.ts`) and the reader's own, one markdown file
  each in `niwa-vault/content/oblique/` (`NIWA_OBLIQUE_DIR`), frontmatter `title`, one card
  per paragraph; a pasted list works, a `#` line is the reader's heading. The **garden
  deals** from the reader's record: _Go back to "…". It has been lying fallow. What did it
  know?_ · _"…" was named and never written. Write its first line._ · _Hold it against
  <signed term>._ · _Serve only <value> for the next hour._ · _You touched "…" lately. Is
  this the same thing under another name?_ Each carries its stone, and the card offers
  _open the stone →_. The desk shows every source as a chip with its count; a struck source
  is crossed out by hand and left out of the pool. Nothing is weighted: one card, one chance.
- **Add a card.** A line on the desk, kept into _your deck_ (`deck.md`, made on first use) or
  any deck of the reader's; _take this card back_ on a dealt card of theirs asks once. The
  starter cannot be written to — strike it instead.
- **About a stone.** `/oblique?id=<stone>` says _about "…"_ under the masthead; _a card_ is
  offered from the reader and the catalogue page beside _its provenance_.
- **The margin sees the card.** The dealt card is put on the desk (`kind: card`), so the
  apostrophe files what it turned up about that card. The desk reads those notes back —
  _what cards turned up_ — newest first, with the card in the hand above each, and links to
  the margin filtered to this view.
- **The reading.** Counts, no verdict: _56 cards in 1 deck: the starter deck (56) · the
  garden can deal 332: 54 lying fallow · 20 unwritten · 5 your values · 253 touched lately ·
  388 in the shuffle now · dealt 3 this sitting · no note in the margin about a card yet._
- **Deployed**, the route deals the starter deck and the public snapshot's stones with the
  sample values, says nothing is kept, and refuses PUT and DELETE.
- **The notice** gets the oblique's card, a step of the round (_if you are going round in
  circles_) and its keys; **the margin** knows the view's name; **the Mac app** gets ⌘O.

## What it deliberately does not do

It does not ship Eno and Schmidt's cards. It does not weight the garden's cards against the
deck's, prefer a fallow stone to a fresh one, or avoid dealing the same kind twice — a
weighting would be the tool choosing, and a reader who wants fewer of a kind strikes it. It
does not keep a record of draws beyond this sitting: the margin is where a card that turned
something up is kept, in the reader's words, and a bare log of deals would only tempt a
frequency reading. It does not say what a card means or whether it applied.

## Where

| File                                                                | Change                                                                                             |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `lib/oblique.ts`, `lib/oblique.test.ts`                             | `parseDeck`/`serialiseDeck`, `validateCard`, `deckCards`, `gardenCards`, `shuffle`, `tally`, `readings` |
| `lib/oblique-store.ts`                                              | one file per deck; `addCard`, `removeCard`                                                         |
| `content/oblique.ts`                                                | the starter deck                                                                                   |
| `app/api/oblique/route.ts`                                          | GET (decks, the garden's cards, `?id=` about); PUT adds a card; DELETE takes one back; 404 deployed |
| `app/oblique/page.tsx`, `components/Oblique.tsx`                    | the route and the view                                                                             |
| `components/ViewSwitch.tsx`, `lib/margin.ts`, `scripts/NiwaApp.swift` | thirteenth tab, the view's name, ⌘O                                                              |
| `components/Reader.tsx`, `components/Page.tsx`                      | _a card_                                                                                           |
| `content/notice.ts`                                                 | the oblique's card, step and keys                                                                  |
| `app/globals.css`                                                   | the deal, the card's lift                                                                          |
| `docs/ARCHITECTURE.md`, `DECISIONS.md`, `CHANGELOG.md`, `README.md` | the map, the decision, the entry, the section                                                      |

## Out of scope

Shipping any published deck. A log of draws. Weighting or sequencing cards. Asking the
model on this machine to write cards (the reader's own words, or a deck they own, are the
point). Dealing from the margin's notes or the chronology's entries — plausible sources for
a later spec.

## Acceptance checks

Run on 2026-09-25 against the dev server on 127.0.0.1:5050.

```bash
pnpm test
# tsc clean · 138 pass · 0 fail (lib/oblique.test.ts: 6)

curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/oblique
# 200
curl -s 127.0.0.1:5050/api/oblique | python3 -c "import json,sys; p=json.load(sys.stdin); print([(d['slug'],len(d['cards']),d['own']) for d in p['decks']], len(p['garden']), p['writable'])"
# [('starter', 56, False)] 332 True     (garden: fresh 253 · fallow 54 · ghost 20 · value 5 · concept 0 — no glossary term is marked mine yet)

curl -s -X PUT 127.0.0.1:5050/api/oblique -H 'content-type: application/json' -d '{"text":"Ask the fallow bed what it knows.  "}'
# {"slug":"deck","title":"your deck","cards":["Ask the fallow bed what it knows."],"own":true}
# → niwa-vault/content/oblique/deck.md: frontmatter title, one paragraph
curl -s -X PUT 127.0.0.1:5050/api/oblique -H 'content-type: application/json' -d '{"text":"","deck":"starter"}'
# {"error":"bad deck"}
curl -s -o /dev/null -w '%{http_code}\n' -X DELETE '127.0.0.1:5050/api/oblique?deck=deck&index=9'
# 404
curl -s -X DELETE '127.0.0.1:5050/api/oblique?deck=deck&index=0'
# {"slug":"deck","title":"your deck","cards":[],"own":true}
curl -s '127.0.0.1:5050/api/oblique?id=garden:the-delegation-discount' | python3 -c "import json,sys; print(json.load(sys.stdin)['about'])"
# {'id': 'garden:the-delegation-discount', 'label': 'The Delegation Discount', 'kind': 'garden'}
```

- [x] The empty sheet reads _Deal a card._ with the pool's count (388); a click deals, → and
      space deal again, ← returns to the earlier card and _n of m this sitting_ follows (3 of 3
      → 2 of 3). Found and fixed during the checks: with the card button focused after a click,
      the arrows were ignored along with space and enter; now only space and enter defer to a
      focused control
- [x] Striking _touched lately_ takes its 252 cards out of the pool (387 → 135); the chip is
      crossed out by hand
- [x] A card the garden dealt reads _from the garden · lying fallow_ and offers _open the
      stone →_
- [x] `/oblique?id=garden:the-delegation-discount` says _about "The Delegation Discount"_
      under the masthead
- [x] Sumi and 375px hold (scrollWidth 375, empty and dealt)
- [x] `content/notice.ts` has the oblique's card, step and keys; the notice test passes

## Notes

_Your terms_ is dealt from glossary entries marked `status: mine`. None are marked today,
so the chip reads 0 and sits struck; marking a term makes it a source without any change
here.
