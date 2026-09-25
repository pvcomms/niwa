---
title: The mask — the other side's case in its own voice, marked for what you could mean
status: shipped
created: 2026-09-25
---

# 023 — The mask

## Why

The ask, in the reader's words: a working ideological Turing test for curious people to
figure out their true beliefs and values.

Caplan's test asks whether you can state the other side's position so well that its
adherents cannot tell you from one of their own. The reader's turn on it is the useful one:
passing is not the point, the attempt is the instrument. Trying to write the other side's
case in their voice, to be read by them, shows you two things you cannot see from your own
side of the table — which of their sentences you could write and mean, and which you cannot
write without a qualifier creeping in. The first set is belief you hold whichever side said
it; the second is the line. Both are facts about you that no amount of arguing your own case
would have produced.

Two things had to be decided. There is no judge: in the original, adherents grade the
rendition, and a grade is a verdict the constellation forbids. So nothing here says whether
the mask passes. The reader marks each sentence of the mask themselves — _I could say this
and mean it_ · _I can say it, but do not_ · _I could not write it straight_ — and those
marks, not a score, are the output. And the model on this machine may be asked to read the
mask as a committed adherent, because that is a role that only points: at the phrases its
side would never use, quoted exactly, with how they would have put it; and at the reasons
its side gives that the mask left out. It is forbidden to grade, to argue the matter, or to
describe the writer, every tell it names must actually be in the text, and everything
arrives hollow. The tool counts the tells in both voices, says which of the reader's
values each case leans on and what the two share, and never says which side is right.

## What changes

- **A fifteenth view, `/mask`.** The masks kept, and one to begin: the matter, your side,
  the other side as they would name themselves. _Put the mask on._ Beside it, how to wear
  it in five lines. Opened from a stone (`?id=`, _in the mask_ from the reader and the
  catalogue page), the matter is prefilled with the stone's first line.
- **Your case, in your voice**, first, so it is on the record. Under it the census of that
  voice: sentences, words, _'we'_ and _'they'_ counts, and the tells by kind — distancing
  (_they claim_, _supposedly_), scare quotes (a short phrase in quotation marks, _so-called_),
  hedging (_arguably_, _kind of_), sneer (_nonsense_, _naive_, _predictably_), absolutes
  (_everyone_, _never_, _obviously_) — with examples.
- **Their case, in the mask**, framed in the accent: _to be read by them — say “we”_. The
  same census. Then **sentence by sentence — could you mean it?**: every sentence of the
  mask with three chips. _mean it_ fills the dot in ink; _could say it_ leaves a ring;
  _refuse it_ strikes the sentence through in the accent. Marks are kept by the sentence's
  text, so editing another sentence does not lose them.
- **An adherent's reading.** Tells named by the reader (a phrase, its kind) or proposed by
  the model, each with _how they would have put it_; reasons their side gives that the mask
  left out. _Ask an adherent_ has the model on this machine read the mask as one of them
  and propose 2–6 tells and 1–4 missing reasons, hollow until kept; a tell that does not
  quote the mask is dropped at validation. _Keep all_ / _drop all_.
- **Where you stand**, written last, in the reader's own voice again.
- **The desk.** **What crossed**: the sentences in their voice you could say and mean —
  _these you hold, whichever side said them_ — and **what you refused**, struck. **The two
  voices**: a small table of the tells by kind in your voice and in the mask, and the
  _'we'_/_'they'_ counts side by side. **Values leaned on, by their terms**: which of the
  bearing's values each case touches, with the terms that hit. **Common ground**: the
  content words both cases use. **The reading**.
- **The reading.** _your case: 4 sentences, 78 words · absolutes ×1 (everyone) · 'we' ×2,
  'they' ×3 · the mask: 5 sentences, 112 words · no tells found · 'we' ×6, 'they' ×0 · 5 of
  5 marked: 2 you could say and mean, 2 you can say but do not, 1 you could not write
  straight · an adherent's reading: 1 tell kept, 1 proposed and hollow, 1 missing reason
  kept · values leaned on — your case: 'care'; the mask: 'care'; both lean on 'care' · 3
  words the two cases share: 'rule', 'want', 'work' · where you stand is written._ Counts,
  never a grade.
- **Kept as files.** One markdown file per mask in `niwa-vault/content/mask/`
  (`NIWA_MASK_DIR`): the matter, your case, their case in the mask and where you stand as
  sections; the sides, marks, tells and missing reasons in the frontmatter.
- **The specimen.** Under `NIWA_MODE` the route serves Specimen A's mask — the office-days
  rule its provenance and dialogue circled, written for once from the other side — and the
  sample values, read-only; the model is not there.
- **The notice** gets the mask's card, a step (_if you cannot see how anyone thinks
  otherwise_) and its key; **the margin** knows the view's name; **the Mac app** gets ⌘T.

## What it deliberately does not do

It does not say whether the mask passes, would fool anyone, or is fair to the other side.
It does not say which side is right, or move the reader toward either. It does not mark a
sentence for the reader, or infer where they stand from the marks — the reader writes that.
The tells are a census with examples, not a fault list: a hedge in one's own voice may be
honesty. The model is never asked what it thinks of the matter.

## Where

| File                                                                 | Change                                                                                                                       |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `lib/mask.ts`, `lib/mask.test.ts`                                    | the tells and stance, `census`, marks by sentence, `leans`, `common`, `tally`/`readings`, `askAdherent`/`validateProposal`/`adopt`, the file |
| `lib/mask-store.ts`                                                  | one file per mask                                                                                                            |
| `content/mask.ts`                                                    | Specimen A's mask                                                                                                            |
| `app/api/mask/route.ts`                                              | GET (masks, the values' names and terms, `?id=` about), PUT, DELETE, POST asks the model; 404 deployed                        |
| `app/mask/page.tsx`, `components/Mask.tsx`                           | the route and the view                                                                                                       |
| `components/ViewSwitch.tsx`, `lib/margin.ts`, `scripts/NiwaApp.swift` | fifteenth tab, the view's name, ⌘T                                                                                          |
| `components/Reader.tsx`, `components/Page.tsx`                       | _in the mask_                                                                                                                |
| `content/notice.ts`                                                  | the mask's card, step and key                                                                                                |
| `app/globals.css`                                                    | the marked sentences, the tells' arrival                                                                                     |
| `docs/ARCHITECTURE.md`, `DECISIONS.md`, `CHANGELOG.md`, `README.md`  | the map, the decision, the entry, the section                                                                                |

## Out of scope

A judge of any kind, human or model. Scoring the two cases against each other. Sending
the mask to a real adherent (consent, and a different privacy). Reading a mask aloud.
Inferring the reader's position from the marks.

## Acceptance checks

Run on 2026-09-25 against the dev server on 127.0.0.1:5050 and a frozen scratch copy
(`NIWA_MODE=public`, node_modules hard-linked) on 127.0.0.1:5079.

```bash
pnpm test
# tsc clean · 152 pass · 0 fail (lib/mask.test.ts: 7)

curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/mask
# 200
curl -s 127.0.0.1:5050/api/mask
# masks 1 · values [taste, privacy, uncertainty, kindness, individuality] · writable true · model qwen3.6:35b-a3b
curl -s -X PUT 127.0.0.1:5050/api/mask -H 'content-type: application/json' -d '{"mask":{"matter":"Should cars be banned from the centre?","side":"for the ban","other":"against the ban","ownCase":"…","otherCase":"…"},"fresh":true}'
# 2026-09-25-should-cars-be-banned-from-the-centre · Should cars be banned from the centre?
curl -s -X POST 127.0.0.1:5050/api/mask -H 'content-type: application/json' -d '{"mask":{…the same, the mask carrying "Supposedly this is about clean air, but they claim a lot of things."…}}'
# 6650 ms · 3 tells · 4 missing
#   T sneer · 'Supposedly this is about clean air' → We prioritize personal mobility and access over restrictive measures.
#   T sneer · 'they claim a lot of things' → Proponents rely on unproven environmental benefits to justify their agenda.
#   M Banning cars destroys local businesses that rely on customer parking. · Rural residents have no viable alternative… · …
#   found during the checks: the first framing ("THEIR SIDE (yours, for this reading)") had the model give the
#   writer's side's reasons; the prompt now says YOU ARE / THE WRITER IS and forbids the writer's side's reasons
curl -s -X DELETE '127.0.0.1:5050/api/mask?slug=2026-09-25-should-cars-be-banned-from-the-centre'
# {"gone":true}

# frozen
curl -s 127.0.0.1:5079/api/mask
# masks: [(2026-09-21-should-the-company-require-two-office-days, 5 marks)] · values [craft, candour, curiosity, care, quiet] · writable false · model null
# PUT 404 · POST 404 · DELETE 404 · /mask 200 · 0 home paths in the page
```

- [x] A mask begun from the sheet (matter, _build first_ / _write first_); both cases written
      and kept on blur; the census read _absolutes ×2 (nobody)_ in the own voice and
      _distancing ×1 (they claim)_ in the mask, with the 'we'/'they' counts
- [x] Sentences marked three ways: the first _mean it_ (ink dot), the second _refuse it_
      (struck in the accent), the third _could say it_ (ring); the reading read _3 of 4
      marked: 1 you could say and mean, 1 you can say but do not, 1 you could not write
      straight; 1 unmarked_
- [x] _Ask an adherent_: 8 proposed in 7s — four tells each quoting the mask with _how they
      would have put it_, four missing reasons — all hollow; one kept
- [x] Where you stand written; the file on disk holds the matter, both cases and the stand as
      sections, the marks, tells and missing reasons in the frontmatter
- [x] Sumi and 375px hold (scrollWidth 375)
- [x] The notice test passes with the mask's card; the readings name no verdict (tested)

## Notes

The tells are a census by pattern and will miss a sneer that uses no listed word and flag
a hedge that is honesty; the reader's marks, not the census, are the instrument. The
model's _instead_ lines are its own side's register and may be flatter than the reader's
mask — that is information too.
