---
title: The wish — loving-kindness as an instrument; your people on rings, a sitting composed from wishes, truths and facts
status: shipped
created: 2026-09-27
---

# 026 — The wish

## Why

The ask, in the reader's words: "lets build a love and kindness meditation practice in this
and have it based on universal truths + custom pods and guided meditations being made based
on ur true facts". Loving-kindness (metta) has a shape that is the practice: goodwill said
first to yourself, then to someone who has been good to you, a friend, someone you pass
without a thought, someone you find difficult, and then to everyone — the circles widening.
Three things the reader asked for map onto it exactly. Pods are the circles, with the
reader's own people named on them and rings of their own between. Universal truths are what
makes the difficult ring holdable: "Every being was once a small child" is true of the
person who shouted, and saying it of them is not a claim about them. True facts about the
reader are what the sitting begins from and carries out, and the garden already holds some
— the values on the bearing, what is held in the hull, what the memory notes say — which it
can offer, hollow, in the record's words.

The instrument composes rather than writes: every word of a sitting comes from a list the
reader keeps, so no model is asked to be kind on their behalf, and the script is a pure
seeded function that can be tested. The speech server on this machine can read a sitting out
as one voice with the silences kept as silence, because the pauses are the practice.

## What changes

- **An eighteenth view, `/wish`, as one sheet.** The rings drawn large by hand — you at the
  centre, everyone at the edge, the pods between in order — each ring named at its top, each
  being's name written on its ring. Click a ring's name to pick the pod (add a name, take a
  custom ring off); click a name to pick the being (its note, move it to another ring, let it
  go). _+ ring_ adds a ring of the reader's own before _everyone_. The people the garden has
  notes on are offered under the picked pod as chips.
- **The next sitting.** Minutes (3–60, typed in place), which rings are held (chips, in
  order; a ring left out is drawn faint), how many wishes, truths and facts are in, the line
  count. _Begin, in silence_ composes the script, keeps the sitting, and runs it: one line at
  a time in the display face, read for as long as it takes to say, then the silence with the
  breath — a ring drawn on over exactly that many seconds. _Hold_, _next line_, _end the
  sitting_; space, →, esc. At the end, _how was it_ in the reader's words, kept under
  `## said`. _Write it out, then begin_ has the speech server say every line and splices the
  silences in, then runs the sitting to the voice, the lines following the cues.
- **The script.** Settle (two lines), a fact to begin from; then each ring: brought to mind
  in the script's voice (_Now someone who has been good to you._), each being named with
  their note, a truth said of them (_Every being has been afraid. Nadia too._), then the
  wishes (_May you be safe._ …); yourself in the first person, everyone as _all beings_, a
  crowded ring held together (_Ana, Bo, Cy, Di._ … _May you all be_); let go, a fact to carry
  out, open your eyes. The pauses are stretched to fill the minutes.
- **The three lists, on the desk.** The wishes (each said after _may you be_), the truths of
  every being (click one to leave it out of the next sitting), what is true of you (the same)
  — each with _+_ and _×_, kept as `wishes.md`, `truths.md`, `facts.md`. Under the facts,
  _the garden offers, in the record's words_: the bearing's values as one line, each
  commitment in the hull with its day, the first sentence of each memory note about the
  reader; _keep_ moves one into the reader's list, where it can be reworded.
- **Sittings.** Listed with the day, minutes, rings, beings held, what was said; _listen_ /
  _stop_ when there is a voice, _write it out_ when there is not, _sit it again_ (the same
  lines, in the voice if there is one), _×_.
- **The desk's reading.** _2 sittings, 20 minutes in all · 2 this week, 2 this month · the
  last yesterday · held: Nadia ×2, Tomas ×2 … · 1 held only once · the difficult one held in
  1 of 2 · 6 pods with 5 beings · 4 wishes, 10 truths, 3 facts in the practice_; _no
  sittings yet_; _the difficult one not yet held_ as a fact. _What the wish holds to_: nothing
  has to be felt; the difficult ring only as far as you can hold it; a truth is never a claim
  about anyone; the desk counts and never says whether you are kind.
- **Kept as files.** `niwa-vault/content/wish/` (`NIWA_WISH_DIR`): `pods/<slug>.md` (name,
  kind, order; the beings as `- Name — note [[stone]]` bullets), `sittings/<slug>.md` (day,
  minutes, rings, held, wishes, cues and the voice's name in the frontmatter; the script as
  said, one line per paragraph with its silence, `## truths`, `## facts`, `## said`),
  `sittings/<slug>.wav` beside a voiced sitting, and the three lists.
- **The specimen.** Under `NIWA_MODE` the route serves Specimen A's pods (Nadia, Tomas, the
  junior, the man at the kiosk, the client who shouted), three facts and two sittings,
  read-only; a sitting runs in the browser and is let go; there is no voice.
- **The speech server, the other way.** `lib/speech.ts` gains `speak`: one line to
  `/v1/audio/speech` with the `kokoro` model and the `af_heart` voice at speed 0.85, a 16-bit
  mono WAV back (`NIWA_VOICE_MODEL`, `NIWA_VOICE`). `lib/wish.ts` reads the PCM out of each
  and writes one WAV with the silences as zero samples and a cue per line.

## Files

| File                                                                  | Change                                                                                                                                                                                       |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/wish.ts`                                                         | the script composed and timed, the tally and readings, what the garden offers, wav in and out, the file forms for pods, sittings and lists, validation                                       |
| `lib/wish.test.ts`                                                    | 7 tests: the script's shape and its seed, a crowded and an empty ring, the tally and readings (no verdict word), the garden's offers, the files, validation, the voice's splice and its cues |
| `lib/wish-store.ts`                                                   | pods/, sittings/ and the voice beside each, the three lists, `NIWA_WISH_DIR`                                                                                                                 |
| `lib/speech.ts`                                                       | `speak`, `VOICE_MODEL`, `VOICE`                                                                                                                                                              |
| `content/wish.ts`                                                     | the wishes and truths every practice begins with, the six pods, Specimen A's practice                                                                                                        |
| `app/api/wish/route.ts`, `say/route.ts`, `audio/[name]/route.ts`      | GET, PUT, DELETE; the voice written out; the voice served; 404 deployed                                                                                                                      |
| `app/wish/page.tsx`, `components/Wish.tsx`                            | the route and the view                                                                                                                                                                       |
| `components/ViewSwitch.tsx`, `lib/margin.ts`, `scripts/NiwaApp.swift` | eighteenth tab, the view's name, ⌘G                                                                                                                                                          |
| `content/notice.ts`                                                   | the wish's card, step and keys                                                                                                                                                               |
| `app/globals.css`                                                     | the rings, the breath drawn on, a line arriving, the lists                                                                                                                                   |
| `docs/ARCHITECTURE.md`, `DECISIONS.md`, `CHANGELOG.md`, `README.md`   | the map, the decision, the entry, the section                                                                                                                                                |

## Out of scope

A model writing the script, or proposing a wish, a truth or a fact. Any sound the reader did
not press for: the voice plays only on _begin_ or _listen_. A streak that scolds; a reminder.
Reading anyone's notes for beings beyond the vault's `People/`. A calibration of feeling.
_Hold them_ chips on the reader and the catalogue page (a stone is rarely a person).

## Acceptance checks

Run on 2026-09-27 against the garden's own dev server on 127.0.0.1:5050, with the speech
server (`com.param.speech`, mlx-audio, `kokoro`) up on 127.0.0.1:8880.

```bash
pnpm test
# tsc clean · 179 pass · 0 fail (lib/wish.test.ts: 7)

curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/wish
# 200
curl -s 127.0.0.1:5050/api/wish
# pods [(you,0), (good-to-you,0), (a-friend,0), (passed-by,0), (difficult,1), (everyone,0)] · sittings 1 · facts 1 · offers.facts 8 · offers.beings [Jasmine Sun] · speech true · writable true

# after "write it out" on the kept sitting
ls -la niwa-vault/content/wish/sittings/
# 2026-09-27-1518.md (3714 bytes) · 2026-09-27-1518.wav (29350844 bytes)
file 2026-09-27-1518.wav
# RIFF WAVE audio, Microsoft PCM, 16 bit, mono 24000 Hz · 611.5 seconds for a 10-minute sitting · 45 cues in the frontmatter, 45 lines in the body
```

- [x] _someone you find difficult_ picked on its ring; a name typed and returned; the name drawn on
      the ring, ringed in the accent while picked; `pods/difficult.md` holds it as a bullet
- [x] A fact kept from the garden's offers (_You value taste, privacy, uncertainty, kindness and
      individuality, by your own bearing._) moved into `facts.md` and out of the offers
- [x] Only the touched pod was on disk and the route fell back to the defaults only when nothing
      was — so a reload would have shown one ring. Fixed: the six defaults are always there,
      a kept file replaces its default by slug, and rings of the reader's own sit among them by
      order
- [x] _Begin, in silence_: _a sitting · 10 minutes · 1 of 45 · in silence_, the first line in the
      display face, _read it, slowly_; _next line_ twice; at _4 of 45_ the breath drawn on over
      _12s of silence_; _end the sitting_; _how was it_ typed and kept — the file's `## said`
      holds it
- [x] _Write it out_: 45 lines said through the speech server, the silences spliced in, one wav
      beside the sitting, cues in the frontmatter; _listen_ appears; _sit it again_ runs the
      sitting to the voice — at 7 s the first silence's ring was drawing, at 27 s further along,
      in time with the 20 s pause — and esc ends it
- [x] The notice test passes with the wish's card, step and keys (in `pnpm test`)
- [x] 375px scrollWidth 375, the rings above the setup; sumi holds; the sitting taken off with
      its voice (`×` twice; the md and the wav both gone); the test being let go; no console
      errors through the whole run

## Notes

The rings are drawn as ellipses because a page is wider than it is tall and six circles
would not fit; the practice's picture is still the widening circle. A crowded ring is held
together rather than one by one because a sitting with twelve names said singly is a list,
not a practice; the names are still all said. The garden's facts are offered in the third
person as the record has them, deliberately, so the reader has to keep them in the second
person themselves.
