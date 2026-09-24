---
title: The distribution — the garden's taste as a curve, a thing weighed against it
status: shipped
created: 2026-09-24
---

# 012 — The distribution

## Why

paramv.com's second figure says taste is distance from the mean, chosen on purpose, and
draws the claim as a bell curve with μ, ±1σ and the feed's thumb on the mean. It is a
figure about a population nobody has measured. The garden, though, _is_ a measured
population: every stone Param has read, kept or written, with its words. So the same
figure can be drawn from data rather than asserted — and then it can answer the question
the site only poses: _when I am about to give something my attention, where does it fall
on my own curve?_

The answer is a position, never a grade. Both tails are real. The left tail is "little
here is like it", which is either the thing that will stretch you or noise. The right
tail is "the garden is already full of this", which is either your beat or the sameness
engine. Which is which is the reader's judgment, and the instrument leaves it there.

## What changes

- **A fourth view, `/distribution`.** Every stone with text (concepts, fieldnotes, vault
  notes, reading, memory builds and rules — not repos or ghosts) is given a **kinship**:
  the mean likeness to its eight nearest stones, on shared words. Likeness is tf-idf
  cosine over the title (weighted three times), first line, tags and the top of the body,
  after a light stem. Kinships are standardised against the garden's own spread, so the
  axis is in σ and μ is the garden's middle.
- **The curve is drawn from the stones.** A kernel density (Gaussian, Silverman's
  bandwidth) in the hand, and under it every stone as one mark in its bed's colour,
  laid at its z and jittered under the curve's height. Hover a mark to name it. The
  curve is the data; nothing is a metaphor.
- **Three windows.** Everything, the last 90 days, the last 30 — each its own curve,
  because taste drifts and "against everything" and "against lately" can disagree. A
  window with fewer than 24 tended stones has no curve.
- **σ bands.** Under the pointer a band lights with the site's readings (the middle, a
  step out, the far tail, both tails named). Click to hold it and the desk lists what
  lives there; drag for a band of your own. `esc` lets go.
- **Weighing.** Paste a title and a line or two, or a link — reading a link is the one
  network call this garden makes, on the reader's press, to the pasted host only, boiled
  down to a title, description and the first words. The thing is vectorised on the
  garden's vocabulary (words the garden has never seen count against likeness, as they
  should) and placed on each window's curve: `+1.4σ`, _closer to the middle than 91% of
  the garden — more of the same_, or `−1.2σ`, _out toward the tail — further from the
  middle than 88% of what is here_. The stone drops onto the sheet at its place and
  moves when the window changes.
- **The reading shows its working.** Its kin (the nearest stones, with their likeness and
  the words shared with the nearest), **speaks your words** (which glossary terms it uses,
  by the garden's own matching rule, the signed ones ringed), and **weighed on** (the
  heaviest terms). The kin are listed so the measure can be checked against the reader's
  own sense of it.
- **A record, not a verdict.** _let it in_ / _pass_ keeps the choice as one markdown
  file in the vault, with where it sat on each curve that day and a note in the reader's
  hand. Kept choices are drawn as ticks under the axis — let in in the accent, passed in
  grey — so over time the reader can see whether they have been choosing the middle or
  the tails. Any kept choice can be weighed again against today's garden.

## Where

| File                              | Change                                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `lib/taste.ts`, `taste.test.ts`   | tokens, tf-idf, pairwise likeness, kinship, curves, placement, prose, the choice file, `boil`   |
| `lib/taste-store.ts`              | reads and writes the choices beside the vault                                                   |
| `app/api/taste/route.ts`          | GET the curves; POST weigh or read a link; PUT / PATCH / DELETE a choice                        |
| `app/distribution/page.tsx`       | the route                                                                                       |
| `components/Distribution.tsx`     | the sheet, the bands, the drop, the desk                                                        |
| `components/ViewSwitch.tsx`       | fourth tab                                                                                      |
| `lib/garden.ts`, `lib/publish.ts` | `conceptMatchers` exported; concept aliases carried on the node, and dropped at the public seam |

## Out of scope

Meaning. The measure is word overlap and says so on the page; an embedding model would
be a dependency with a written reason and a network or a download, and the kin list makes
the cheap measure checkable. A population curve ("the feed") — there is no honest local
source for one. Ranking candidates against each other.

## Acceptance checks

Run on 2026-09-24.

```bash
pnpm test
# ℹ tests 70 · pass 70 · fail 0   (tsc clean first)

curl -s 127.0.0.1:5050/api/taste | python3 -c 'import json,sys; d=json.load(sys.stdin); w=d["windows"]; print(d["corpus"], {k:(v and v["n"]) for k,v in w.items()})'
# 492 {'all': 492, 'd90': …, 'd30': …}

curl -s -X POST 127.0.0.1:5050/api/taste -H 'content-type: application/json' \
  -d '{"title":"The Sameness Engine","text":"Every feed optimises toward the same person. Notes on wanting your own desires."}' \
  | python3 -c 'import json,sys; r=json.load(sys.stdin)["reading"]; print(round(r["windows"]["all"]["z"],2), [k["label"] for k in r["windows"]["all"]["kin"][:3]])'
```

- [x] The curve draws from the stones; hovering a mark names it; the σ marks and μ are lettered
- [x] Clicking a band holds it and lists its stones; dragging makes a band of your own
- [x] Weighing drops a stone at its z with `±n.nσ` above it; the desk reads all three windows, the kin, the shared words, the glossary terms spoken
- [x] "let it in" writes a file to the vault with `z:` for each window; the tick appears under the axis
- [x] Sumi and 375px hold
