---
title: The break — mindful self-compassion as an instrument; three sentences, a hand, and how you would treat a friend
status: shipped
created: 2026-09-27
---

# 027 — The break

## Why

The ask was a paragraph from a column, "build this as a feature": the writer had got a grip on
their scrupulosity through Kristin Neff and Chris Germer's Mindful Self-Compassion Workbook
and the eight-week course their Center for Mindful Self-Compassion runs. The practice has a
shape that fits a sheet. Its signature exercise is the self-compassion break — in a moment
that hurts, three sentences: that it hurts (mindfulness), that others feel this too (common
humanity), and something kind (self-kindness) — with a soothing touch, a hand on the heart.
Its working question is "how would I treat a friend?": write what you would say to a friend
in exactly your spot, then what you are saying to yourself, and read the two side by side.
Its longer exercise is the compassionate letter, written from someone who loves you as you
are. The garden already holds the loving-kindness half on the wish; this is the other half,
turned inward.

Two of the workbook's things are left out on purpose. The Self-Compassion Scale is a score of
the reader against a norm, and the garden scores nothing. And the meditations — affectionate
breathing, the compassionate body scan — belong to the wish, which has a sitting player and
a voice; the break is a workbook, written.

## What changes

- **A nineteenth view, `/break`, as one sheet.** _Now_: what hurts, in a line, in the display
  face. _The three_: three sentences with the workbook's words shown grey until the reader
  rewrites them; clicking one shows the workbook's other wordings as chips (_This hurts._
  _Ouch._ _I'm not alone._ _May I forgive myself._ …); _hardest?_ on each marks the one that
  was hardest to say. _A hand_: a hand on the heart, both hands on the chest, a hand on the
  cheek, one hand holding the other, arms around yourself, no hand. _What do I need to hear
  right now?_ in a line. _Take the break_ keeps it, and the sheet says: that is enough; the
  rest is there if you want it.
- **The triad.** Beside the form, Neff's three drawn as three rings that overlap — noticed,
  shared, kind — in the values' hues, with a mark for every break taken in the ring that was
  hardest to say, the open one filled in the accent.
- **The friend.** Under the break, two columns: _to myself_ (the voice as it actually sounds)
  and _to a friend_ (what you would say to them, and how). Beneath, the reading of the two:
  _to yourself: 1 absolute ('always'), 1 should ('should'), 2 labels ('lazy', 'mess') · 'you'
  turned on yourself 3 times · to a friend: 2 allowances ('of course', 'anyone would') · the
  friend's version drops the absolutes, shoulds, labels and adds allowance · the friend gets
  more words_. Every hit quoted; never which voice is right.
- **The letter**, from someone who loves you as you are, who knows your history and your
  struggles and is not trying to fix you. **Afterwards**, how it went, in a line, added later.
- **The record**, on the desk: every break by day with its hand and what was written; click
  to open. _A new break_ from an open one. _Take it off the record_, twice.
- **The reading.** _3 breaks · 3 this week, 3 this month · the last today · the three
  sentences were in your own words every time · a hand: a hand on the heart ×2, both hands on
  the chest ×1 · hardest to say: the shared one ×2, the kind one ×1 · what you needed to hear
  written for 2 · the friend's version for 2 · a letter for 0 · afterwards for 2 · the words
  that come back when you talk to yourself: 'lazy' ×2_. Counts, never a grade.
- **The practices, offered.** The workbook's eight as cards with how each goes, marked _on
  this sheet_ or _on the wish_ where the garden holds them; the source named plainly.
- **What the break holds to.** The three are enough. The hurt is not a problem to be solved
  here. The two voices are counted, not judged. It never says you are hard on yourself, and
  never scores.
- **Kept as files.** One markdown file per break in `niwa-vault/content/break/`
  (`NIWA_BREAK_DIR`): _what hurts_, _the three_ as bullets, _what I need to hear_, _to
  myself_, _to a friend_, _the letter_, _afterwards_ as sections; the hand and the hardest in
  the frontmatter. Opened from a stone (`?id=`), what hurts is prefilled with its first line.
- **The specimen.** Under `NIWA_MODE` the route serves Specimen A's two breaks read-only.
- **No model.** The words are the reader's.

## Files

| File                                                                  | Change                                                                                                                                             |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/break.ts`                                                        | the three and their other wordings, the hands, the census by family with hits kept, the two voices compared, the tally and readings, the file form |
| `lib/break.test.ts`                                                   | 5 tests: the census, the two voices (no verdict word), the tally and readings, the file round-trip, validation                                     |
| `lib/break-store.ts`                                                  | one file per moment, `NIWA_BREAK_DIR`                                                                                                              |
| `content/break.ts`                                                    | the workbook's practices as cards; Specimen A's two breaks                                                                                         |
| `app/api/break/route.ts`                                              | GET (moments, `?id=` about), PUT, DELETE; 404 deployed                                                                                             |
| `app/break/page.tsx`, `components/Break.tsx`                          | the route and the view; the triad                                                                                                                  |
| `components/ViewSwitch.tsx`, `lib/margin.ts`, `scripts/NiwaApp.swift` | nineteenth tab, the view's name, ⌘B                                                                                                                |
| `content/notice.ts`                                                   | the break's card, step and key                                                                                                                     |
| `app/globals.css`                                                     | the fields, the other wordings arriving, the marks and rows                                                                                        |
| `docs/ARCHITECTURE.md`, `DECISIONS.md`, `CHANGELOG.md`, `README.md`   | the map, the decision, the entry, the section                                                                                                      |

## Out of scope

The Self-Compassion Scale, or any score. A model writing the friend's voice or the letter.
The meditations (they are the wish's). A reminder. _Take a break_ chips on the reader and the
catalogue page.

## Acceptance checks

Run on 2026-09-27 against the garden's own dev server on 127.0.0.1:5050.

```bash
pnpm test
# tsc clean · 184 pass · 0 fail (lib/break.test.ts: 5)

curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/break
# 200
curl -s 127.0.0.1:5050/api/break
# moments 0 · writable true · dir ~/personal/garden/niwa-vault/content/break
```

- [x] What hurts typed; the kind sentence swapped for _May I forgive myself._ by chip and turned
      to ink; _hardest?_ on the shared one; a hand on the heart; what I need to hear; _take the
      break_ — `2026-09-27-1728.md` held all of it, the three as bullets, the hand and the
      hardest in the frontmatter
- [x] The two voices written; the reading beneath: _to yourself: 1 absolute ('always'), 1
      should ('should'), 1 label ('mess') · 'you' turned on yourself 3 times · to a friend: 2
      allowances ('of course', 'anyone would') · the friend's version drops the absolutes,
      shoulds, labels and adds allowance_; the file gained _to myself_ and _to a friend_
- [x] The triad marked the break in the shared ring, filled in the accent while open; the record
      listed it; _take it off the record_ twice — the file gone, _no breaks taken yet_
- [x] 375px scrollWidth 375; sumi holds; no console errors through the run
- [x] The notice test passes with the break's card, step and key (in `pnpm test`); the Mac app
      rebuilt with ⌘B

## Notes

The census families are small and literal on purpose: a word is counted only if it is there,
and every hit is shown, so the reader can disagree with the count by looking. 'Mess' is a
label when it names a person and an ordinary word when it names a desk; the sheet does not
know which, and says so by quoting it. The triad is three rings and not a scale.
