---
title: The dialogue — a thesis questioned in the open until its assumptions are on the table
status: shipped
created: 2026-09-25
---

# 022 — The dialogue

## Why

The ask, in the reader's words: build a feature framework for Socratic questioning — a
disciplined, cooperative form of argumentative dialogue that uses systematic, open-ended
questions to stimulate critical thinking, clarify meaning, and uncover underlying
assumptions.

Every clause of that definition is a design constraint, and each one lands squarely in what
the garden already does. _Disciplined_ and _systematic_: the questions come in six families
— clarifying, assumptions, reasons and evidence, other viewpoints, implications, the
question itself — and the sheet shows which have been asked and which have not, so the
discipline is visible rather than remembered. _Cooperative_: the reader answers every
question in their own words; the instrument never scores an answer. _Open-ended_: a
question that can be answered yes or no is refused at the door, from the bank, from the
reader's own hand, and from the model. _Clarify meaning_: terms are kept as they are pinned
down, and the thesis is re-put at the end and read against as it was first said. _Uncover
assumptions_: assumptions surface into a ledger as they are heard and are examined by the
reader — held, fell, cannot say — each hollow until examined.

The thesis paragraph the template asks for is the whole method: a Socratic questioner only
asks. So the model on this machine is asked what to ask, never what is so, and its system
prompt forbids it to answer, agree, disagree, evaluate or summarise; every question it
proposes arrives hollow, quoting the phrase it presses on, and stays hollow until kept. The
garden itself asks too, from the record — the stone's first sentence, what flows into it
and how long that has lain fallow, what it flows into, the reader's values, when it was
last touched — which is what a Socratic partner who had read all your notes would do. The
readings count and never grade the thesis; the tests assert no verdict word appears.

## What changes

- **A fourteenth view, `/dialogue`.** The dialogues kept, and a thesis to begin one: _put
  it down as you would say it to someone who disagreed_. Beside it, the six families with a
  line each. Opened from a stone (`?id=`, _question it_ in the reader and the catalogue
  page), the thesis is prefilled with the stone's first line and the dialogue is bound to
  the stone.
- **The thesis, as first said**, set large and never rewritten. Under it, **as it stands
  now**, a text the reader re-puts when ready; the desk reads what it gained and lost in
  words (the provenance's `gainedLost`).
- **The turns.** Each a drawn card: family in the accent, who asked it (you · the bank ·
  the garden · proposed), the day, the stone it was asked from; the question in the display
  face; the answer as a text in the reader's words, kept on blur. A proposed turn is drawn
  hollow with _keep_ / _drop_; a kept turn can be taken back, asked once.
- **The next question, three ways.** The six family chips (with counts) open the **bank**
  for that family — the reader's own `questions.md` first, then the starter's — one press
  asks it; a question already asked is struck through. **The garden asks** from the bound
  stone. **In your own words**, with a family; a closed question is refused with a line
  saying how to open it. **Ask what to ask** has the model propose 3–5 open questions and
  0–4 assumptions it hears, pinned to real families and real turns, folded in hollow; _keep
  all_ / _drop all_.
- **The desk.** The **wheel**: six segments, each filled by how often its family was asked,
  dashed where it never was; press one to see its questions. **Assumptions on the table**:
  a ledger — a hollow dot until examined, filled ink for _holds_, accent for _fell_, faint
  for _cannot say_ — with a note on how it was examined and the turn it was heard in;
  _surface_ one in a line. **Terms clarified**: word and what it means here. **The
  reading.**
- **The reading.** _5 questions kept, 5 answered · 1 proposed and still hollow · asked
  across 5 of 6 families: clarifying ×1, … — the question itself not yet asked · the
  questions came from: you 1, the bank 2, the garden 1, proposed and kept 1 · 3
  assumptions surfaced, 2 examined: 1 fell, 1 cannot be said; 1 not yet examined · 2 terms
  clarified: 'first to go' and 'the data' · as it stands now, the thesis gained … and lost
  'always', 'everyone' …_
- **Kept as files.** One markdown file per dialogue in `niwa-vault/content/dialogue/`
  (`NIWA_DIALOGUE_DIR`): the thesis and the re-putting as sections, the turns as `###`
  sub-sections readable as a transcript (question, then `#### answer`), assumptions and
  terms in the frontmatter. `questions.md` beside them is the reader's own bank: a heading
  per family, a question per line.
- **The specimen.** Under `NIWA_MODE` the route serves Specimen A's dialogue — the remote
  work claim its provenance traced, examined over five turns — and the starter bank,
  read-only; the garden asks nothing and the model is not there.
- **The notice** gets the dialogue's card, a step (_if you are sure_) and its key; **the
  margin** knows the view's name and files a note about the open dialogue; **the Mac app**
  gets ⌘D.

## What it deliberately does not do

It does not answer a question, grade an answer, or say whether the thesis is true, sound,
well-founded or otherwise — the readings are counts and the tests forbid the words. It
does not order the families or insist on one before another: it shows which are unasked
and leaves the order to the reader. It does not let the model ask a closed question, name
a verdict, or write the reader's answer. It does not rewrite the thesis; the reader re-puts
it and both stand.

## Where

| File                                                                 | Change                                                                                                                                  |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/dialogue.ts`, `lib/dialogue.test.ts`                            | the six families, `isOpen`, the bank's file form, `gardenQuestions`, `tally`/`readings`, `askNext`/`validateProposal`/`adopt`, the file |
| `lib/dialogue-store.ts`                                              | one file per dialogue; `questions.md` as the bank                                                                                       |
| `content/dialogue.ts`                                                | the starter bank; Specimen A's dialogue                                                                                                 |
| `app/api/dialogue/route.ts`                                          | GET (list + bank; `?stone=` the garden's questions), PUT, DELETE, POST asks the model; 404 deployed                                     |
| `app/dialogue/page.tsx`, `components/Dialogue.tsx`                   | the route and the view: thesis, turns, the next question, the wheel, the ledger, the terms, the reading                                 |
| `components/ViewSwitch.tsx`, `lib/margin.ts`, `scripts/NiwaApp.swift` | fourteenth tab, the view's name, ⌘D                                                                                                   |
| `components/Reader.tsx`, `components/Page.tsx`                       | _question it_                                                                                                                           |
| `content/notice.ts`                                                  | the dialogue's card, step and key                                                                                                       |
| `app/globals.css`                                                    | the turns' arrival, the wheel, the answers                                                                                              |
| `docs/ARCHITECTURE.md`, `DECISIONS.md`, `CHANGELOG.md`, `README.md`  | the map, the decision, the entry, the section                                                                                           |

## Out of scope

A two-voice transcript where the model also answers. Scoring answers or the thesis. A
fixed order of families. Reading a dialogue aloud through the speech server. Asking the
questions of another person's thesis (consent, and a different privacy).

## Acceptance checks

Run on 2026-09-25 against the dev server on 127.0.0.1:5050 and a frozen scratch copy
(`NIWA_MODE=public`, node_modules hard-linked — Turbopack refuses a symlink out of the root)
on 127.0.0.1:5079.

```bash
pnpm test
# tsc clean · 145 pass · 0 fail (lib/dialogue.test.ts: 7)

curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/dialogue
# 200
curl -s 127.0.0.1:5050/api/dialogue
# dialogues 0 · bank {clarify 6, assume 6, evidence 6, viewpoint 6, consequence 6, question 6} · ownBank false · writable true · model qwen3.6:35b-a3b
curl -s '127.0.0.1:5050/api/dialogue?stone=garden:the-delegation-discount'
# 11 questions across all six families; the first: clarify · Your note begins: “Automate a choice and the capability gain is real; …” How would you say the same thing without any of those words?
curl -s -X PUT 127.0.0.1:5050/api/dialogue -H 'content-type: application/json' -d '{"dialogue":{"thesis":"Sitting is the new smoking. Everyone knows it.","turns":[{"family":"evidence","question":"How do you know?","by":"you","answer":"I read it somewhere."}]},"fresh":true}'
# 2026-09-25-sitting-is-the-new-smoking · Sitting is the new smoking · turns 1  → one file, frontmatter + the thesis, as it stands now, turns
curl -s -X POST 127.0.0.1:5050/api/dialogue -H 'content-type: application/json' -d '{"dialogue":{…the same, with an answer…}}'
# model qwen3.6:35b-a3b · 20556 ms · 3 questions (clarify, assume, viewpoint), each quoting a phrase; 0 assumptions
#   found during the checks: the assume "question" was a statement ("That a metaphorical equivalence…") — isOpen now
#   requires a question mark or a question word, and drops a yes/no question hidden behind a leading clause
curl -s -X DELETE '127.0.0.1:5050/api/dialogue?slug=2026-09-25-sitting-is-the-new-smoking'
# {"gone":true}

# frozen
curl -s 127.0.0.1:5079/api/dialogue
# dialogues: [(2026-09-20-remote-workers-are-always-the-first-to-go, 6 turns)] · bank clarify 6 · writable false · model null
curl -s '127.0.0.1:5079/api/dialogue?stone=x'   # {"questions":[],"stone":null}
# PUT 404 · POST 404 · DELETE 404 · /dialogue 200 · 0 home paths in the page
```

- [x] A thesis begun from the sheet (URL takes `?slug=`); the bank question _What has to be so
      for this to be said at all?_ asked and answered; the wheel's _assume_ segment filled
- [x] _Is remote work really the problem?_ refused with _that can be answered yes or no — ask
      how, why, what or which instead_; _Who, exactly, is 'everyone who matters'…?_ asked and
      answered as turn 2
- [x] An assumption surfaced (_heard in turn 2_) and marked _fell_; a term kept; the thesis
      re-put and the desk read _gained 'visibility', 'decide', 'promotions', … · lost
      'everyone', 'killing', 'matters', 'career', 'office'_
- [x] _Ask what to ask_: 5 proposed in 8s, three questions in the unasked families and two
      assumptions, all drawn hollow; one kept and its answer box appeared
- [x] The file on disk reads as a transcript: `### q <id> · assume · bank · 2026-09-25`, the
      question, `#### answer`, the answer; assumptions and terms in the frontmatter
- [x] Sumi and 375px hold (scrollWidth 375 with five turns on the sheet)
- [x] The notice test passes with the dialogue's card; the readings name no verdict (tested)

## Notes

The open-question check is a heuristic — a question mark or a question word, no leading
auxiliary, no yes/no clause behind a comma — and it will pass some closed questions dressed
as open ones. The reader can drop any turn. The wheel's labels needed a 300-wide viewBox;
at 240 they clipped.
