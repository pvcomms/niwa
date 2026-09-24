---
title: The bearing — values drawn as one sheet, a decision set down among them
status: shipped
created: 2026-09-24
---

# 011 — 指針 The bearing

## Why

The garden shows what Param knows he knows. It had no way to ask the question he actually
brings to it: _is this decision pointed the way my values point?_ paramv.com carries an
interactive Venn of five domains — hover floods a set, click holds it, a membership cursor
prints `cursor ∈ M ∩ T`, two motes drift through and take the colour of whatever they cross
— and that figure was later packaged as the public `interactive-venn-template`. The
mechanism is exactly right for values: sets that overlap, regions with names, a point that
is either in or out. What the template lacks is the thing Niwa has — the notes. A value is
not a label; it is everything you have written while holding it.

The constellation rule applies with force here: **the tool never decides.** A values
instrument that scored a decision would be the worst kind of recommendation engine, one
that sounds like conscience. So the bearing surfaces — where the stone sits, what that
region is called, which values it leaves untouched, what the garden says — and stops.

## What changes

- **A third view, `/bearing` (指針).** The reader's values as overlapping circles on one
  sheet, in the hand: each ring a `roughEllipse` ribbon, seeded so it never redraws, drawn
  on one after another at load. Two pre-solved layouts (three and five circles) carried
  over from the paramv.com figure, because placing circles so that named overlaps are real
  regions is geometry, not a slider.
- **Values are the reader's own file.** `values.json` in the vault
  (`niwa-vault/content/bearing/`, `NIWA_BEARING_DIR` to move it): name, blurb and the terms
  that mark a stone as being about that value; named regions keyed by the value ids they
  lie in. The repo ships five generic sample values; a deployed sheet only ever shows those.
- **The hover flood.** Under the pointer a value's ring thickens and blooms, its ground
  tints, the lens of a real two-set region shades, the rest dims. Click holds a value lit;
  click it again or the paper to let go. The caption under the sheet carries the value's
  blurb, or the region's name and blurb, or `rare air` for a region left unnamed.
- **The membership cursor.** `cursor ∈ T ∩ P · keep the exit`, with a crosshair, printed
  as the pointer moves — the same point-in-set test the placement uses.
- **A decision is a stone.** Typed on the desk, it waits in the sheet's top corner; the
  reader drags it to where they judge it sits. That placement is the judgment. The desk reads
  it back: `d ∈ T ∩ P`, the region's name, _serves taste and privacy. silent on uncertainty,
  kindness and individuality_, and under **what the garden says** the stones about each
  value it touches — title, tags and first line matched against the value's terms, never
  the body — each a link into the catalogue. Dropped outside every circle it reads
  _outside every value you drew_, which is allowed to be the honest answer.
- **Where it leads.** One press draws a heading from the stone; drag its head. The reading
  adds `→ leads into K` and _gains kindness · leaves taste and privacy_. Directionally
  correct becomes a literal question with the answer left to the reader.
- **A note in the reader's hand** under each decision, saved on blur. **let go** removes it.
- **Kept as files.** One markdown file per decision — title, date, `at`, `leads`,
  the note as the body — written by `POST /api/bearing`, the one thing the garden writes.
  Deleted by `DELETE`. Both answer 404 under `NIWA_MODE`; `GET` there serves the sample and
  no decisions.
- **Two motes** cross the sheet carrying the titles of the two freshest stones in the
  garden, tinted by the value they are passing through, shied by the pointer. Off under
  reduced motion, as is the draw-on.
- **The Mac app** gets ⌘3 for the bearing.

## Where

| File                                | Change                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `lib/bearing.ts`, `bearing.test.ts` | layouts, point-in-set, codes, expressions, prose, file format, validation |
| `lib/bearing-store.ts`              | reads `values.json` and the decisions; writes and deletes them            |
| `app/api/bearing/route.ts`          | GET / POST / DELETE; refuses writes when deployed                         |
| `app/bearing/page.tsx`              | the route                                                                 |
| `components/Bearing.tsx`            | the sheet, the desk, the drag, the motes                                  |
| `components/ViewSwitch.tsx`         | third tab                                                                 |
| `lib/palette.ts`                    | six value hues per theme, emitted as `--value-N`                          |
| `app/globals.css`                   | the sheet's draw-on and transitions                                       |
| `scripts/NiwaApp.swift`             | ⌘3                                                                        |

## Out of scope

Editing values in the page — the file is the editor. Decisions as stones in the garden
graph (a `bearing` kind with threads to the values' stones) — worth a spec of its own once
a few have accumulated. A four-circle layout. Scoring of any kind, by rule.

## Acceptance checks

Run on 2026-09-24.

```bash
pnpm test
# ℹ tests 59 · pass 59 · fail 0   (tsc clean first)

curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/bearing
# 200

curl -s 127.0.0.1:5050/api/bearing | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["own"], len(d["config"]["values"]), d["writable"])'
# True 5 True

# Not run live: the deployed behaviour (NIWA_MODE → sample values, no decisions,
# writable false, POST/DELETE 404) is three guards in app/api/bearing/route.ts, read, not exercised.
```

- [x] Five rings in the hand, lettered; hovering one blooms it, dims the rest, and the
      caption shows its blurb; hovering a pure two-set region shades the lens and names it
- [x] `cursor ∈ T ∩ P · keep the exit` prints as the pointer crosses that region
- [x] Typing a decision puts a stone in the top corner; dragging it into taste ∩ privacy
      writes `at: [431, 225]` to its file and the desk reads `d ∈ T ∩ P`, `keep the exit`,
      the prose, and stones about taste and privacy
- [x] "draw where it leads" draws a heading; dragging its head into kindness writes
      `leads:` and the reading adds `→ leads into K · gains kindness · leaves taste and privacy`
- [x] Sumi: rings lit from within, the sheet stays legible; 375px: nothing overflows
- [x] A note typed under the decision is in the file body after blur
