---
title: The form — an argument set out over its rows, on the dialogue's desk
status: shipped
created: 2026-09-30
---

# 033 — The form

## Why

The ask, in the reader's words: validity is about an argument's form, not whether its claims are
true, so let the reader write premises and a conclusion as propositions and show facts rather than
a verdict — "there is a row where every premise holds and the conclusion doesn't", or "these two
assumptions can't both be held".

Nothing in the garden used propositional logic before this. The dialogue (022) was the nearest
thing: it surfaces a thesis's assumptions and never grades them. The form is added there, not as a
view of its own, because a thesis is already broken into assumptions in the dialogue, and one key
of letters can serve both the argument and the ledger. (032 is left for the act, uncommitted in the
tree when this was written.)

## What changes

- **The form**, a panel on the dialogue's desk between the ledger and the terms. The reader gives
  each sentence a letter (_a letter_ proposes the next unused one, p first), writes premises
  (_a premise_) and a conclusion (∴). The notation takes ¬ ∧ ∨ → ↔, the ASCII `~ ! & | -> <->`, and
  the words `not and or implies iff`, `if … then`; brackets group; letters are case-blind. Not binds
  tightest, then and, then or, then → (to the right), then ↔.
- **Read back.** Under every line: the formula in symbols with only the brackets it needs, and said
  back in the reader's sentences — _if (‘I work remotely’ and ‘My firm is cutting staff’), then ‘I am
  on the list’_. A line that does not read says why in plain words, in the accent: _‘remote’ is not a
  letter — give each sentence one letter_.
- **The rows.** Every row over the letters, columns in the order of the reader's key, then each
  premise, then ∴. ● holds, ○ does not. Full ink where every premise holds, faint elsewhere, and the
  accent (with a rule at the left) where every premise holds and the conclusion does not. Over
  sixteen rows only those where every premise holds are drawn, and the legend says so. Ten letters
  at most.
- **The lines the rows show**, under the table and in the dialogue's reading:
  _the form: 1 of the 8 rows has every premise holding and the conclusion not — r holds, c does not,
  l does not_ · _the form: in each of the 3 rows of 8 where every premise holds, the conclusion holds
  too_ (with _— as it does in every row, premises or none_ when it does) · _the form: no row of the 4
  has every premise holding together_ · _the form: 1 line not yet read (premise 2)_.
- **Assumptions with a form.** Each kept assumption in the ledger takes a form over the same
  letters, shown back in symbols. The smallest sets of one, two or three among the premises and kept
  assumptions that no row satisfies are named, each with an assumption in it: _assumption 2 and
  assumption 4 cannot both be held — no row of 2 has both_. A clash that needs more than three is
  said as such.
- **Kept in the file.** `letters:`, `premises:` and `conclusion:` in the dialogue's frontmatter; an
  assumption's `form:` in its line, written only when there is one, so older files are unchanged.
- **The specimen.** Specimen A's dialogue carries a form: `r ∧ c → l`, `r` ∴ `l`, whose one
  counterexample row shows the premise the thesis never said (that the firm is cutting), and a
  fourth assumption, _My firm is nothing like the firms in the survey_ (`¬s`), that can't be held
  with the second (`s`).

## What it deliberately does not do

It does not say valid, invalid, sound, true, false or fallacy; the readings are rows, counted and
named, and the dialogue's no-verdict test runs over them. It does not formalise a sentence or
propose a form — the model is not asked; translation is the reader's act. It does not say whether
any letter's sentence is so. It does not rank premises or say which to drop.

## Where

| File                                                     | Change                                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `lib/form.ts`, `lib/form.test.ts`                        | the parser, `show`, `rowsOf`, `holds`, `argumentForm`, `clashes`, `inWords`                |
| `lib/dialogue.ts`, `lib/dialogue.test.ts`                | `letters`, `premises`, `conclusion`, `Assumption.form`; `formOf`, `formReadings`; the file |
| `content/dialogue.ts`                                    | Specimen A's form and fourth assumption                                                    |
| `components/DialogueForm.tsx`, `components/Dialogue.tsx` | the panel; a form on each kept assumption                                                  |
| `docs/ARCHITECTURE.md`, `DECISIONS.md`, `CHANGELOG.md`   | the map, the decision, the entry                                                           |

## Out of scope

Predicate logic and quantifiers. Natural deduction or proof steps. A model proposing forms. Setting
the form of one dialogue against another's.

## Acceptance checks

Run on 2026-09-30 against the dev server on 127.0.0.1:5050.

```bash
pnpm test
# tsc clean · 237 pass · 0 fail (lib/form.test.ts: 7; lib/dialogue.test.ts: 8)

curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/dialogue
# 200
curl -s -X PUT 127.0.0.1:5050/api/dialogue -H 'content-type: application/json' -d '{"fresh":true,"dialogue":{"thesis":"If it rains the match is off. It is raining.","letters":[{"letter":"r","text":"It rains."},{"letter":"m","text":"The match is on."}],"premises":[{"form":"r -> ~m"},{"form":"~m"}],"conclusion":"r"}}'
# 2026-09-29-if-it-rains-the-match-is-off · 2 letters · 2 premises · conclusion r
#   the file: letters: - { letter: "r", text: "It rains." } … premises: … conclusion: "r"
#   formReadings: the form: 1 of the 4 rows has every premise holding and the conclusion not — r does not, m does not
curl -s -X DELETE '127.0.0.1:5050/api/dialogue?slug=2026-09-29-if-it-rains-the-match-is-off'
# {"gone":true}
```

- [x] A dialogue with the remote-work form opened in the browser: four letters, two premises read
      back in words, eight rows with row 4 (r ●, c ○, l ○) in the accent; _assumption 1 and
      assumption 2 cannot both be held — no row of 2 has both_
- [x] Premise 2 typed as `r and remote`: _‘remote’ is not a letter — give each sentence one letter_,
      the table withdrawn, _the form: 1 line not yet read (premise 2)_; typed as `r and c`: the one
      live row, no row against; kept to the file on blur
- [x] 375px holds (scrollWidth 375); sumi reads (the legend said _dark_ and was changed to _full
      ink_, which holds in both themes)
- [x] Public mode, on the live niwa-public after deploying 6a5b573 (dpl_9nJVE5BnvrQZD98GDCVHyGcTs8Jz):
      `/api/dialogue` serves the specimen with letters rcls, premises `r & c -> l | r`, ∴ `l`,
      writable false; `/dialogue` 200; PUT 404; 0 home paths in the page; the panel reads
      _the form: 1 of the 8 rows has every premise holding and the conclusion not — r holds, c does
      not, l does not_ and _assumption 2 and assumption 4 cannot both be held — no row of 2 has both_

## Notes
