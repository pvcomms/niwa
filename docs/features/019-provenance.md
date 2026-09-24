---
title: The provenance — how a claim reached you, and nothing about whether it is so
status: shipped
created: 2026-09-24
---

# 019 — The provenance

## Why

The ask, in the reader's words: an epistemic provenance. How do I know what I know? What is
my belief mediated through? How did this idea spread across the information universe, by
what means, and who is spreading it in the public square and across the platforms? What is
the level of truth — fact, or perception packaged as reality? Examine the incentives, the
interested parties, their history, how they talk. Am I being gaslit, fed a reframe, sold a
repurposed claim to advance someone else's agenda? "Don't believe everything you read", made
into an instrument for a low-trust society — and a protocol whose objectivity cannot be
disputed.

Two parts of that no honest local instrument can do, and the spec says so rather than
pretending. It cannot read the public square: the garden makes one network call, on a press,
to a host the reader pasted, and crawling platforms would be a different tool with a
different privacy. And it cannot grade a claim true or false: the constellation's rule is
that the tool never decides, and an oracle that issued a truth score with a straight face
would be a horoscope.

What a person _can_ know, and what no one else can dispute because it is their own record, is
the **chain of custody**: the hands the claim passed through before it reached them. Who
carried it, on what channel, on what day, in what words; what each hand gains if the claim
is believed, what it runs on, what it has said before. Whether the wording turned in a
given hand. Whether they ever went and looked. That is what the view holds, in the reader's
words, and reads back as facts: what changed between one wording and the next, which words
the claim leans on, what the garden itself flows into the belief. The model on this machine
is asked what to _ask_ — never what to believe.

## What changes

- **An eleventh view, `/provenance`.** The chain drawn as a pen line from the first saying
  (left) to the reader (right), each hand a small drawn card on the line, labelled with who,
  the channel and where, and the day. A hand is **solid** only when its link was read once or
  the channel is _my own eyes_; otherwise it is **hollow**, dashed. A small **ring on the
  line** before a hand marks the wording as turned there. The first saying is an accent
  ring when it is written down and a hollow dashed one when it is not; the reader is a
  filled stone with today's date. The legend under the line says exactly this.
- **Two wordings.** _The first saying · as first said_, with who said it first, and _the
  claim · as it reached you_. Under the claim, the census: the words it leans on by family —
  certainty, absolutes, urgency, sides, unnamed authority, reframing, heat — how many times
  it says where it got this, and whom it names. Never a score.
- **Hand to hand.** Every wording in the order the claim travelled, with what each one
  **gained** and **lost** in words against the one before it — numbers first, since a number
  falling out of a claim is the classic turn — and the turns the reader kept at that hand
  (_'one factor among several' → 'first in line'_).
- **How you know it** — I saw it, I was told, I read it, I worked it out, it seems so;
  several at once. A note in the reader's words.
- **What would settle it** — checks, each with a _how_ (a document to find, a number to look
  up, a person who could be asked), and how each went: not yet, it held, it fell, cannot be
  checked, dated when said.
- **A hand on the desk.** Who, channel, where, day, what it said, a link and _read it once_
  (the page boiled to title, host and first words, dated — the one network call, to that
  host), its interests (what it gains, what it runs on, its record), the wording in this
  hand (turned / kept as it was / not said, and turns noted as was → became), and questions
  to put to it with what was found. _Take it back_ asks once.
- **In the garden.** Opened from a stone (_its provenance_ in the reader and the catalogue),
  the desk says what flows straight into that stone by kind — sorted as the course sorts it:
  your own writing, things you read, repos, the unwritten — and which hosts those inputs
  name. Counts, never weights. A fresh claim opened from a stone takes the stone's name.
- **Ask what to ask.** The model on this machine (`qwen3.6:35b-a3b`, the way's) proposes
  checks, one or two questions per hand, and turns in the wording where two quotes are
  given. Its schema pins every hop id to a hand that exists; the system prompt forbids a
  verdict; everything arrives proposed and hollow until kept. _Keep all_ / _drop all_.
- **The reading.** Facts, none a verdict: _you know it because: I read it and I was told · 4
  hands between the first saying and you: the press (a business desk, a national paper), a
  post (@officeguy, x.com), a feed (the For You feed, x.com) and someone said (Dana, at
  lunch, the office) · 4 of 4 dated, the first Nov 2024 · 1 read once or seen with your own
  eyes, 3 not — what is not checked is drawn hollow · the first saying is a consultancy's
  annual workplace survey (2024)'s, in their words · between the first saying and what
  reached you, the claim gained 'everyone', 'company', 'workers', 'always', 'remote' and
  'first' and lost '200', '31%', '412', 'employee's', 'reduction' and 'location' · you marked
  2 hands as turning the wording; 1 turn noted, 1 proposed and not yet yours · as it reached
  you it leans on absolutes ×2 (always, everyone knows) · unnamed authority ×1 (data shows);
  it does not say where it got this and names no one · of the hands, @officeguy leans
  hardest: … · 2 of 4 hands have what they gain named … · 1 check named (1 more proposed): 1
  made — 1 held._
- **The specimen.** Under `NIWA_MODE` the route serves Specimen A's claim — remote workers
  are always the first to go — through four hands, read-only, no evidence, no model, with a
  banner saying it is fiction.
- **Kept as files.** One markdown file per claim at `niwa-vault/content/provenance/<slug>.md`
  (`NIWA_PROVENANCE_DIR`): the claim and the first saying as sections, the hands with their
  wordings, interests, turns and questions in the frontmatter, the checks beside them. The
  file is readable and editable by hand.
- **The margin** sees the claim on the desk. **The Mac app** gets ⌘P.

## What it deliberately does not do

It does not say whether the claim is true, likely, credible or trustworthy, and the tests
assert that none of those words appear in a reading. It does not crawl any platform, search
the web, or infer who is behind a hand. It does not rank the hands or weigh one channel over
another. It does not suggest what a hand gains — that is the reader's to write — and the
model, when asked, proposes questions and checks and never an answer to them.

## Where

| File                                                                | Change                                                                                                                                                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/provenance.ts`, its test                                       | the hands and the claim, `census`, `wordsOf`/`gainedLost`/`driftAlong`, `evidenceOf`, `tally`, `readings`, `askQuestions`, `validateProposal`, `adopt`, the file form, `validateProvenance` |
| `lib/provenance-store.ts`                                           | one file per claim                                                                                                                                                                          |
| `content/specimen-provenance.ts`                                    | Specimen A's claim and its four hands                                                                                                                                                       |
| `app/api/provenance/route.ts`                                       | GET (list; `?stone=` evidence), PUT, DELETE; POST `{read}` reads a link once, POST `{provenance}` asks the model; 404 under `NIWA_MODE`                                                     |
| `app/provenance/page.tsx`                                           | the route                                                                                                                                                                                   |
| `components/Provenance.tsx`                                         | the chain, the two wordings, hand to hand, knowing and checks, the desk                                                                                                                     |
| `components/ViewSwitch.tsx`                                         | eleventh tab                                                                                                                                                                                |
| `lib/margin.ts`                                                     | the view's name for the margin                                                                                                                                                              |
| `components/Reader.tsx`, `Page.tsx`                                 | "its provenance"                                                                                                                                                                            |
| `scripts/NiwaApp.swift`                                             | ⌘P                                                                                                                                                                                          |
| `app/globals.css`                                                   | the chain's draw-on, the hands' settle                                                                                                                                                      |
| `docs/ARCHITECTURE.md`, `DECISIONS.md`, `CHANGELOG.md`, `README.md` | the map, the decision, the entry, the section                                                                                                                                               |

## Out of scope

Reading any platform. A truth score of any kind. Suggesting a hand's interests. Bringing a
hand's link into the garden as a stone (paste it on the distribution). A provenance for a
bearing decision (011) — decisions are not stones.

## Acceptance checks

Run on 2026-09-24 against the dev server on 127.0.0.1:5050 and a frozen scratch copy
(`NIWA_MODE=public`) on 127.0.0.1:5079.

```bash
pnpm test
# tsc clean · 128 pass · 0 fail (lib/provenance.test.ts: 7)

curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/provenance
# 200

curl -s 127.0.0.1:5050/api/provenance
# {"provenances":[],"writable":true,"dir":"/Users/p/personal/garden/niwa-vault/content/provenance","model":"qwen3.6:35b-a3b"}

curl -s -X PUT 127.0.0.1:5050/api/provenance -H 'content-type: application/json' \
  -d '{"provenance":{"claim":"Sitting is the new smoking. Everyone knows it.","hops":[{"who":"a friend","channel":"talk","where":"the Küfa","day":"2026-09","said":"sitting is literally the new smoking"}],"knowing":["told"]},"fresh":true}'
# {"slug":"2026-09-24-sitting-is-the-new-smoking","title":"Sitting is the new smoking",…"hops":[{"id":"aruk0hcq0","who":"a friend","channel":"talk",…
# → niwa-vault/content/provenance/2026-09-24-sitting-is-the-new-smoking.md, frontmatter + two sections

curl -s -X POST 127.0.0.1:5050/api/provenance -H 'content-type: application/json' -d '{"read":"http://127.0.0.1:5050/way"}'
# {"seen":{"title":"way · niwa","host":"127.0.0.1","words":"The garden — a live map …","on":"2026-09-24"}}

curl -s '127.0.0.1:5050/api/provenance?stone=garden:the-delegation-discount'
# {"evidence":{"stone":{"id":"garden:the-delegation-discount","label":"The Delegation Discount","kind":"garden"},"n":4,"byKind":{"concept":1,"garden":3},"own":4,"read":0,"code":0,"unwritten":0,"hosts":[]}}
curl -s -o /dev/null -w '%{http_code}\n' '127.0.0.1:5050/api/provenance?stone=nope'
# 404

curl -s -X POST 127.0.0.1:5050/api/provenance -H 'content-type: application/json' --data-binary @specimen.json
# {"proposal":{"checks":[{"text":"Locate the original 2024 consultancy report and read the full methodology…","how":"Search for the specific survey title and publisher from hand 1's source citation."},…3],
#   "questions":[{"hop":"ha1","text":"Did the desk select this story because it confirmed a pre-existing editorial bias…"},{"hop":"ha2",…},{"hop":"ha3",…},{"hop":"ha4",…}],
#   "turns":[{"hop":"ha2","was":"nearly a third of managers saying location would be a factor","became":"remote workers are ALWAYS first to be cut"},{"hop":"ha4",…}]},
#  "model":"qwen3.6:35b-a3b","ms":17707}

curl -s -X DELETE '127.0.0.1:5050/api/provenance?slug=2026-09-24-sitting-is-the-new-smoking'
# {"gone":true}

# frozen
curl -s 127.0.0.1:5079/api/provenance | head -c 120
# {"provenances":[{"slug":"2026-09-19-remote-workers-are-always-the-first-to-go","title":"Remote workers are always the first to go"…  ("writable":false,"dir":null,"model":null)
curl -s '127.0.0.1:5079/api/provenance?stone=anything'
# {"evidence":null}
# PUT 404 · DELETE 404 · POST {read} 404 · /provenance 200 · 0 home paths in the payload
```

- [x] The empty desk reads _put the claim in your own words…_; a hand added with `h` opens
      its card; who, channel, where, day, said, gains, _turned_ and _I was told_ are kept to
      one file and the chain redraws with one hollow hand and a ring before it
- [x] Hand to hand shows what the wording gained (_everyone, studies, knows, show_) and lost;
      the census under the claim reads _absolutes ×1 (everyone knows) · unnamed authority ×1
      (studies show) · does not say where it got this · names no one_
- [x] The specimen draws four hands — @officeguy solid, the rest hollow, rings before the
      press and the post — and its reading counts without grading
- [x] _Ask what to ask_ folds in 3 checks, 4 questions and 2 turns as proposed; the answer
      names no verdict
- [x] A second save fired while the first fresh one was in flight no longer makes a second
      file (found and fixed during the checks: a chip pressed within the autosave's window
      wrote `…-2.md`; the desk now waits for the first save and writes over its file)
- [x] Sumi and 375px hold (scrollWidth 375)
- [x] Under `NIWA_MODE` the route serves the specimen, no evidence, no model, and refuses
      every write and the link read
