# Architecture

> The map. Read this instead of crawling the repo.

## In one paragraph

niwa is a Next.js app that reads four directories on the machine — memory, the Fieldnotes
vault, niwa-vault's notes and the code tree — derives a graph from them at request time, and renders it as a 3D force-
directed garden. There is no database and no build step for the data: `/api/garden` re-reads
and re-derives on every request, memoised only against file mtimes, and a server-sent-event
stream tells the open canvas when something on disk changed so the garden grows in place. A
second, separate path bakes a **sanitised** snapshot for public deployment, keeping the
topology and discarding every private string.

## The tree

```
niwa/
  app/
    page.tsx            server component; reads the garden, hands it to the canvas
    catalogue/page.tsx  the same garden as a table (Suspense around the URL-state client)
    bearing/page.tsx    the reader's values as one sheet; decisions set down on it
    distribution/page.tsx  the garden's taste as a curve; a thing weighed against it
    flow/page.tsx       the threads given a direction; one stone's roots and reach
    course/page.tsx     a belief steered through what hit it, marked after the fact
    chronology/page.tsx a life as a number line; the conditions it was lived under
    alarm/page.tsx      will this pathway set off the reader's fight or flight? their circuit, a toy body
    way/page.tsx        from where you are to where you mean to be, written as if it is so
    margin/page.tsx     what the reader said to themselves while looking, read back by day
    provenance/page.tsx how a claim reached the reader: the hands, their wordings and interests; never a verdict
    oblique/page.tsx    a card dealt to come at the thing from an angle, from the reader's decks and from the garden itself
    dialogue/page.tsx   a thesis questioned in the open, six families, until its assumptions are on the table; never answered
    mask/page.tsx       the other side's case written in its own voice and marked for what the reader could mean; never judged
    notice/page.tsx     how to use the garden and what it leaves to the reader; reads nothing
    layout.tsx          theme <style> block, generated from lib/palette.ts
    globals.css
    api/
      garden/route.ts   GET the derived graph (full, or public when NIWA_MODE is set)
      watch/route.ts    SSE; emits when the fingerprint of the sources changes
      bearing/route.ts  GET values + decisions; POST/DELETE a decision, PUT the values (404 when deployed)
      taste/route.ts    GET the curves; POST weigh a thing or read a link; PUT/PATCH/DELETE a choice
      course/route.ts   GET courses or a belief's git history; PUT one; DELETE (frozen when deployed)
      chronology/route.ts GET the life and every entry (the specimen when deployed); PUT an entry; PATCH the life; DELETE
      alarm/route.ts    GET the circuit and every pathway (the specimen when deployed); PUT a pathway; PATCH the circuit; DELETE
      way/route.ts      GET the ways; PUT one; DELETE; POST asks the model on this machine (404 when deployed)
      margin/route.ts   GET the notes (the specimen when deployed); POST one, multipart with the audio; PATCH; DELETE
      margin/audio/[name]/ a voice note by name; 404 when deployed
      margin/say/route.ts POST writes a voice note out through the speech server on this machine (404 when deployed)
      provenance/route.ts GET the claims (the specimen when deployed) or `?stone=` the garden's evidence; PUT; DELETE; POST reads a link once or asks the model (404 when deployed)
      oblique/route.ts  GET the decks and every card the garden can deal (`?id=` names the stone it is about); PUT adds a card to a deck of the reader's; DELETE takes one back (404 when deployed)
      dialogue/route.ts GET the dialogues + the bank (the specimen when deployed) or `?stone=` the garden's questions about a stone; PUT; DELETE; POST asks the model what to ask (404 when deployed)
      mask/route.ts     GET the masks + the values' names and terms (the specimen when deployed; `?id=` the stone it is about); PUT; DELETE; POST asks the model to read the mask as an adherent (404 when deployed)
      media/[name]/     serves niwa-vault attachments by bare filename; 404 when deployed
  components/
    Garden.tsx          3d-force-graph + three.js scene; all materials from lib/palette
    Reader.tsx          the panel that reads a stone: markdown, links out, links in
    Markdown.tsx        the note renderer both views share
    Catalogue.tsx       the table: search, group, sort, the whole, URL state
    Page.tsx            a catalogue row opened: trail, siblings, the field, the note
    Field.tsx           every note as one mark, bed by bed; the part lit against the whole
    Bearing.tsx         the bearing's state, writes, drag and keyboard; the desk
    Distribution.tsx    the curve with every stone under it, the bands, the drop, the desk
    Flow.tsx            one stone at the centre, roots left and reach right, the reading
    Course.tsx          the course's sheet, marks and desk
    Chronology.tsx      the number line: lanes, circumstances, gaps, the present, the desk
    Alarm.tsx           the threat circuit, the pathway's line, the run, the desk
    Way.tsx             the line from now to then, the two papers, the memoir, the desk
    Margin.tsx          the notes by day, the desk that reads them by view, thing or word, the reading
    MarginStrip.tsx     the tab at the edge of every view and the strip behind it; mounted in layout.tsx
    Provenance.tsx      the chain of hands, the two wordings, hand to hand, the checks; the hand's card on the desk
    Oblique.tsx         the card, the deal, this sitting's draws; the desk: sources struck from the shuffle, a card added, the reading
    Dialogue.tsx        the thesis as first said and as it stands, the turns, the next question three ways; the desk: the wheel, the ledger of assumptions, the terms, the reading
    Mask.tsx            the matter and the sides, the two cases with their census, the sentences marked, an adherent's reading, where you stand; the desk: what crossed, the two voices, values, common ground
    Notice.tsx          the stance, the grounds, one way round, each view on a card, the keys, not and yours
    desk.ts             what is on the desk right now, put there by each view, read by the strip
    BearingSheet.tsx    its SVG: rings in the hand, the flood, the cursor, stones, headings, trails
    ValuesEditor.tsx    the values edited in place, written back to values.json
    ViewSwitch.tsx      the fifteen tabs; useTheme.ts is the theme all share
    Sketch.tsx          a hand-drawn stroke laid over its parent; SheetEdge for the sheets
  lib/
    garden.ts           THE derivation. sources → nodes → links → stats. pure, testable
    place.ts            where a note sits: trail, children in order, one reading order
    hand.ts             seeded pen strokes: box, ring, underline, strike, edge, jitter
    bearing.ts          the bearing's geometry, readings and file format. pure, testable
    bearing-store.ts    reads values.json and the decisions; where the garden writes
    taste.ts            tokens, tf-idf, kinship, curves, placement, the choice file. pure, testable
    taste-store.ts      reads and writes the choices beside the vault
    flow.ts             threads oriented, walked by hop; roots, linchpins, loops, reach. pure, testable
    course.ts           a belief's inputs in order, the marks tallied and read, the file form. pure, testable
    course-store.ts     one course file per belief, read by the belief's id
    course-history.ts   git, read-only: the days a belief's file changed, the day each input first appeared in it
    chronology.ts       days with precision, two scales, ticks, the tally and readings, the garden's dated moments, the file form. pure, testable
    chronology-store.ts one file per entry under entries/, life.json beside them
    alarm.ts            the sandbox's toy body, the marks' bends, the tally and readings, the files. pure, testable
    alarm-store.ts      circuit.json and one file per pathway under pathways/
    way.ts              the two texts read as facts, the way's order, the memoir, the prompts and what comes back, the file. pure, testable
    way-store.ts        one file per way
    margin.ts           the note, its moment, the file form, filters, by day, the tally and readings. pure, testable
    margin-store.ts     one file per note, the voice note beside it
    speech.ts           the speech server on this machine: is it up; write a voice note out
    provenance.ts       the hands and the claim, the census of a wording, the drift hand to hand, the garden's evidence, the tally and readings, the prompt, the file. pure, testable
    provenance-store.ts one file per claim
    oblique.ts          a deck's file form, the garden's cards, the seeded shuffle, the tally and readings. pure, testable
    oblique-store.ts    one markdown file per deck; a card added or taken back
    dialogue.ts         six families, open questions, the bank's form, the garden's questions from a stone, the tally and readings, the ask and its validation, the file form. pure, testable
    dialogue-store.ts   one file per dialogue; questions.md as the reader's bank
    mask.ts             the tells and stance of a voice, marks by sentence, values leaned on, common ground, the tally and readings, the adherent's ask and its validation, the file form. pure, testable
    mask-store.ts       one file per mask
    notice.ts           the notice's shape and the check that it is whole: a card for every view, no path or address in it. pure, testable
    publish.ts          private graph → public graph. the sanitising projection
    palette.ts          both themes, for CSS and for three.js materials
    garden.test.ts      the regression net for link matching
    publish.test.ts     the regression net for what is allowed to cross over
  content/
    public.ts           the allowlist: which sites and concepts may appear publicly
    specimen.ts         Specimen A — the synthetic life the deployed chronology draws
    world.ts            the world, offered: public happenings and eras a reader may let in
    specimen-alarm.ts   Specimen A's circuit and pathways, for the deployed alarm
    specimen-way.ts     Specimen A's way, for the deployed way
    specimen-margin.ts  Specimen A's asides, for the deployed margin
    specimen-provenance.ts Specimen A's claim and the four hands it came through, for the deployed provenance
    oblique.ts          the starter deck, in the garden's own words
    dialogue.ts         the starter bank of open questions; Specimen A's dialogue, for the deployed view
    mask.ts             Specimen A's mask, for the deployed view
    notice.ts           every word of the notice: what the garden is for, one way round it, each view's card, the keys, what it will not do
  data/
    garden.json         BAKED public snapshot. generated. never edit
  scripts/
    snapshot.mjs        bakes data/garden.json (full or public)
    design-sheet.mts    renders docs/design/sketched.svg from lib/hand.ts, for Figma
    deploy-public.sh    re-bakes, audits the artefact, then deploys niwa-public
    deploy-private.sh   retained; the private deployment is deleted — see DECISIONS
    NiwaApp.swift       the Mac app wrapper
    build-app.sh        builds /Applications/Niwa.app
    com.param.niwa.plist  LaunchAgent so the server is up when the app opens
  proxy.ts              basic-auth gate; no-op unless NIWA_PASSWORD is set
```

## Data flow

```
~/.claude/memory   ┐
~/Fieldnotes       │
niwa-vault notes   ├──▶ lib/garden.ts ──▶ Garden {nodes, links, stats}
~/Code/* (links)   ┘         │
                             ├──▶ /api/garden ──▶ Garden.tsx (three.js)
                             │
                             └──▶ lib/publish.ts ──▶ scripts/snapshot.mjs
                                        │                    │
                                  content/public.ts    data/garden.json
                                   (the allowlist)            │
                                                     deploy-public.sh
                                                    (audits, then ships)
```

## What it reads and writes

| Path                                         | Direction | What                                              | Override          |
| -------------------------------------------- | --------- | ------------------------------------------------- | ----------------- |
| `~/.claude/memory`                           | read      | builds, rules, self, reference, routines, agents  | `NIWA_MEMORY_DIR` |
| `~/Fieldnotes/Glossary`                      | read      | concepts; `status: mine` renders as _signed_      | `NIWA_VAULT_DIR`  |
| `~/Fieldnotes/{Ideas,Sources,Course,People}` | read      | fieldnotes                                        | `NIWA_VAULT_DIR`  |
| `~/personal/garden/niwa-vault/content/notes` | read      | the Notion import, the Reader archive, garden notes | `NIWA_GARDEN_DIR` |
| `…/niwa-vault/content/media`                 | read      | their attachments, via `/api/media/<file>`        | (beside the notes) |
| `~/Code/*`                                   | read      | repos; symlinks followed to the real directory    | `NIWA_CODE_DIR`   |
| `…/niwa-vault/content/bearing/values.json`   | read/write | the reader's values for the bearing; the editor writes it | `NIWA_BEARING_DIR` |
| `…/niwa-vault/content/bearing/*.md`          | read/write | one file per decision set down on the bearing     | `NIWA_BEARING_DIR` |
| `…/niwa-vault/content/taste/*.md`            | read/write | one file per thing weighed on the distribution    | `NIWA_TASTE_DIR`   |
| `…/niwa-vault/content/course/*.md`           | read/write | one file per belief put on the course             | `NIWA_COURSE_DIR`  |
| `…/niwa-vault/content/chronology/entries/*.md`, `life.json` | read/write | one file per entry on the chronology; the birth day, horizon, scale and lanes | `NIWA_CHRONOLOGY_DIR` |
| `…/niwa-vault/content/chronology/others/<name>/` | read | another life of the same shape, laid alongside; never written | (beside the entries) |
| `…/niwa-vault/content/alarm/pathways/*.md`, `circuit.json` | read/write | one file per pathway asked of the alarm; the reader's triggers, defences, brakes and load | `NIWA_ALARM_DIR` |
| `…/niwa-vault/content/way/*.md`              | read/write | one file per way: the then, the now, the steps kept or proposed | `NIWA_WAY_DIR` |
| a pasted link                                | fetch     | once, on the reader's press, boiled to title + words — on the distribution, or a hand's link on the provenance | —              |
| `…/niwa-vault/content/margin/*.md`, the audio beside | read/write | one file per note made in the margin; the voice note under the same name | `NIWA_MARGIN_DIR` |
| `…/niwa-vault/content/provenance/*.md`        | read/write | one file per claim: as it reached the reader, as first said, the hands with their wordings, interests, questions and turns, the checks | `NIWA_PROVENANCE_DIR` |
| `…/niwa-vault/content/oblique/*.md`           | read/write | one file per deck of the reader's cards, one card per paragraph; a card added from the desk is appended | `NIWA_OBLIQUE_DIR` |
| `…/niwa-vault/content/dialogue/*.md`, `questions.md` | read/write | one file per dialogue: the thesis as first said and as it stands, the turns as a transcript, assumptions and terms; the reader's own bank of questions | `NIWA_DIALOGUE_DIR` |
| `…/niwa-vault/content/mask/*.md`              | read/write | one file per mask: the matter, the reader's case, the other side's case in the mask, where they stand; the sides, marks, tells and missing reasons | `NIWA_MASK_DIR` |
| Ollama at `127.0.0.1:11434`                  | call      | on the reader's press, the two texts of a way, a claim and its hands, a thesis and its dialogue, or a mask read as an adherent; proposals come back, nothing is written | `NIWA_OLLAMA`, `NIWA_MODEL` |
| the speech server at `127.0.0.1:8880`         | call      | on the reader's press, one voice note; its words come back under `## said` | `NIWA_SPEECH`, `NIWA_SPEECH_MODEL` |
| `data/garden.json`                           | write     | the baked public snapshot, by `snapshot.mjs` only | —                 |

Nothing else is written. Nothing is cached to disk. The bearing's and the distribution's
writes are the only ones the running app makes, the pasted link is its only network call,
and it makes neither when `NIWA_MODE` is set.

## The model

A **node** has a `kind` (`project`, `concept`, `user`, `feedback`, `reference`, `routine`,
`meta`, `note`, `notion`, `garden`, `reading`, `agent`, `repo`, `ghost`), a `stage` (`fresh`,
`tended`, `settled`, `fallow`, `unknown`) derived from mtime — or, for a niwa-vault note, from
its `tended:` date — a `source` (`memory`, `vault`, `garden`, `code`, `inferred`), and a
`degree`. Concepts carry `signed` — whether the term is Param's own. A niwa-vault note's kind
comes from its `source:` frontmatter: `notion`, `readwise-reader` → `reading`, anything else →
`garden`.

A **link** is one of six kinds, and drawing all of them is the substance of the tool:

- `link` — an explicit `[[wikilink]]`, resolved across the four slug styles actually in use
  (`project_suji`, `project-suji`, `suji`, `suji.md`)
- `concept` — a glossary term appearing literally in a note: where an idea is _practised_
  rather than defined
- `build` — a note naming a `~/Code/x` path that exists on disk
- `seed` — a wikilink pointing at nothing, rendered as a hollow **ghost stone**: an idea real
  enough to name and never written down
- `mention` — one note's prose names another by its title. Titles need two words and ten
  characters, and a two-word title must match its capitals
- `twin` — the same document filed in two sources (a Fieldnotes source and its Notion
  highlights page). Same title, or one a 24+ character prefix of the other, across kinds

`mention` and `twin` are derived and never written back. A niwa-vault note's `[[slug]]`
resolves among that vault's slugs before the global keys, and its `related:` frontmatter is
drawn as a written `link`.

## The bearing

`/bearing` is a third view over the same garden, not a second data source. `lib/bearing.ts`
holds two pre-solved circle layouts, the point-in-set test, the set expressions (`T ∩ P`),
the prose (_serves taste and privacy. silent on …_) and the shape of a decision's file.
The values are the reader's `values.json`; the sample in `DEFAULT_CONFIG` is what a
deployed sheet shows. Nothing in it ranks or scores — the reader places the stone, the
sheet reads the placement back, and the garden's stones about each value are found by
matching the value's terms against titles, tags and first lines, never bodies.

## The distribution

`/distribution` draws the garden's own taste as a curve. `lib/taste.ts` gives every stone
with text a tf-idf vector (title weighted three times, first line, tags, the top of the
body, lightly stemmed), takes each stone's **kinship** as the mean likeness to its eight
nearest, standardises against the spread, and smooths a kernel density over the result —
once per state of the sources, memoised in the route against the garden's fingerprint,
since the pairwise likeness is the expensive part. A candidate is vectorised on the same
vocabulary and placed on each window's curve (everything, 90 days, 30 days). A second
measure, themes, is latent semantic analysis on that same likeness matrix — the top forty
eigenvectors of the Gram matrix by orthogonal iteration, a new text folded in from its
likeness to every stone — so kin can share no words. Neither measure is meaning and the
page says so; the kin are listed so both can be checked. Choices
the reader records are files beside the vault, with where they sat that day.

## The flow

`/flow` gives every thread a direction — a note that links to, names or seeds a thing was
fed by it; a term practised in a note fed the note; a note that points at code fed the
code; twins feed each other — and walks the result from any one stone: what flowed into it
within two hops, what it flows into, which roots have gone fallow or were never written,
which direct root is a linchpin (other roots reach the centre through it and no other
way), what loops back, what runs both ways. Two hops, because in a garden this connected
six reaches nearly everything. It runs in the browser on `/api/garden`; nothing new is
read or written.

## The course

`/course` is the fifth figure made honest with the garden's data. A stone is the belief;
what flowed straight into it (by the flow's direction) is laid across the sheet as bricks in
the order it entered the garden; the reader says, after the fact, which way each one bent
the belief — toward the question it was trying to get right, or away — and the pen draws
the course those marks imply. The bricks are grey until the reader says; the question is
put in words on the desk and kept with its earlier phrasings when it is re-put. The reading
counts, names what kind of thing did the bending, and says what has hit the belief since
it was last rewritten; it never grades. _Arriving_ lists what came in the last thirty days
that speaks the belief's words and is not threaded to it, off the distribution's model.
The field is dated from the belief's own git history — the days its file changed are the
days it was steered; the first commit in which an input's name appears is the day it
arrived — read on this machine only, with the input's own date as the fallback the card
names. Courses are kept one markdown file per belief in `niwa-vault/content/course/`
(`NIWA_COURSE_DIR`), through `/api/course`, which is frozen under `NIWA_MODE`.

## The chronology

`/chronology` is the standalone chronology instrument (pvcomms/chronology) moved into the
garden, with what it could not do there: files it can write, a desk, zoom, and the garden's
own dates. `lib/chronology.ts` is pure: a day is a string of year, month or day precision and
is placed at the middle of the period it names; the two scales (`toU`/`fromU`) are the only
place a horizontal position is computed, and every mark, tick and drag goes through them, so
the proportional scale — ln(1 + age), linear before birth — cannot drift from the clock.
Stretches are packed into rows by a first-fit packer, never by name. The tally counts inner,
outer, circumstances and gaps, finds the stretches of the reader's own life with nothing set
down, and says what was so at the present; `readings` turns it into sentences. `momentsOf`
listens to the notes for the days they speak of. Under `NIWA_MODE` the route serves
`content/specimen.ts` read-only.
The world is offered from `content/world.ts`; letting one in writes an ordinary entry tagged
`world:<id>`, so the sheet knows it is already here. Threads between entries are the reader's
own, kept in the entry's file; `around` lists what sat within a year. Other lives are read
from `others/` by the store and never written.

## The alarm

`/alarm` is the standalone sandbox (pvcomms/nervous-system-sandbox) moved into the garden and
handed the reader's own names. `lib/alarm.ts` carries the sandbox's physics unchanged as a
pure `step(body, knobs, dt)` — `cue` is the low road arriving, `apply` a brake by its reach,
`stateOf` the six named states — so a run can be tested without a screen (`simulate`). The
reader's circuit (triggers with a charge and the defences they pull, defences with a reflex,
brakes with a reach, the four dials as today's load) is `circuit.json`; a pathway is a
markdown file. `bendsOf` adds the marks up into the line's bends and its lean; `tally` and
`readings` say what was marked and never grade it. Under `NIWA_MODE` the route serves
`content/specimen-alarm.ts` read-only.

## The way

`/way` is Think Forward-Reverse (pvcomms/think-forward-reverse) moved into the garden with
its model brought home. `lib/way.ts` is pure: the two texts are read as facts (which
sentences of the then still look ahead, what each text speaks of that the other does not),
steps are ordered by date with undated ones slotted by direction, and `memoir` tells the
kept way backwards from the then. `askStructure` and `askColour` build the prompts and the
JSON schemas; `validateProposal` caps and dates what comes back and `adopt` folds it in as
proposed, never kept. The route's POST is the one place the garden talks to a model, and it
is Ollama on this machine; under `NIWA_MODE` there is no model and the route serves
`content/specimen-way.ts` read-only.

## The margin

`/margin` is the one view that is also on every other view. `components/desk.ts` is a
one-slot registry: each view puts its chosen thing down — kind, id, label — when the reader
picks it and clears it when they let go; `MarginStrip`, mounted under every page in
`layout.tsx`, reads the slot, the path and the address, and files a note with all three.
`lib/margin.ts` is pure: a note's id is its local moment, the file is frontmatter plus the
words plus a `## said` heading for the transcript, `filterNotes`/`byDay`/`tally`/`readings`
read the margin back. Audio is recorded in the window with `MediaRecorder` and kept as a
file beside the note; `lib/speech.ts` is the only place the garden talks to the speech
server, and only when the reader presses _write it out_. Under `NIWA_MODE` the route serves
`content/specimen-margin.ts` read-only and the strip renders nothing.

## The provenance

`/provenance` holds how a claim reached the reader, and nothing about whether it is so. A
claim is one file: the wording as it reached them, the first saying if they have it, and
the hands between — each with a channel (a feed, a post, the press, a text, someone said,
a search, a model, their own eyes), a day, its own wording, a link, what it gains if the
claim is believed, what it runs on, its record, and the reader's mark on whether the
wording turned in it. `lib/provenance.ts` is pure: `census` counts the words a wording
leans on by family (certainty, absolutes, urgency, sides, unnamed authority, reframing,
heat) and whether it says where it got this or names anyone; `driftAlong` compares each
wording with the next as words, numbers first, on a stop list small enough to keep the
hedges; `evidenceOf` sorts what flows into a bound stone the way the course does and lists
the hosts those inputs name; `tally` and `readings` count and never grade. The sheet draws
a hand solid only when its link was read once or the channel is the reader's own eyes —
`checkedHop` — and hollow otherwise. `askQuestions` is the second place the garden talks to
the model on this machine; it asks for questions to put to each hand, checks that would
settle the claim, and turns in the wording, and its schema pins every answer to a hand id
that exists. Under `NIWA_MODE` the route serves `content/specimen-provenance.ts` read-only,
no evidence, and no model.

## The public seam

This is the part to understand before changing anything near it.

`lib/publish.ts` projects the private garden onto public ground. A node survives only if it is
a glossary concept Param wrote, a repo that is public on GitHub, or a site with a live public
URL — and in the last two cases every string is replaced with the already-public one. File
paths are nulled so a home directory can never leak. `content/public.ts` holds the allowlist
and the withheld list.

Then `scripts/deploy-public.sh` audits the artefact on disk, not the code that produced it:
it refuses to ship if `stats.mode !== "public"` or if any private node kind is present. Two
independent checks, deliberately redundant.

## Invariants

Local-only; the private deployment is deleted and stays deleted. Only the audited snapshot
ships. Topology crosses the public seam, strings do not. Colour comes from `lib/palette.ts`.
No disk cache.

## Known sharp edges

`proxy.ts` is the renamed `middleware.ts` — the rename fixed a gate that silently broke local
dev, so it is a no-op unless `NIWA_PASSWORD` is set.

One-word glossary terms must be capitalised in a note to match, or common English poisons the
whole concept index.

`/api/watch` returns a single `frozen` event and closes when `NIWA_MODE` is set, because a
deployed garden has no home directory and an open SSE stream on serverless never ends.

`data/garden.json` is **never committed** — `.gitignore` excludes all of `/data/` with an
explicit warning, because the snapshot is derived from a live memory corpus whether it was
baked in public or private mode. It exists on disk (~57KB), is rebuilt by
`scripts/deploy-public.sh` immediately before each deploy, and reaches Vercel as build output
rather than through git. That gitignore is a second line of defence behind the tripwire
audit: the audit guards the deploy, the gitignore guards the repo.
