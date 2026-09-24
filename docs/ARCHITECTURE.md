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
    layout.tsx          theme <style> block, generated from lib/palette.ts
    globals.css
    api/
      garden/route.ts   GET the derived graph (full, or public when NIWA_MODE is set)
      watch/route.ts    SSE; emits when the fingerprint of the sources changes
      bearing/route.ts  GET values + decisions; POST/DELETE a decision, PUT the values (404 when deployed)
      taste/route.ts    GET the curves; POST weigh a thing or read a link; PUT/PATCH/DELETE a choice
      course/route.ts   GET courses or a belief's git history; PUT one; DELETE (frozen when deployed)
      chronology/route.ts GET the life and every entry (the specimen when deployed); PUT an entry; PATCH the life; DELETE
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
    BearingSheet.tsx    its SVG: rings in the hand, the flood, the cursor, stones, headings, trails
    ValuesEditor.tsx    the values edited in place, written back to values.json
    ViewSwitch.tsx      garden | catalogue | bearing; useTheme.ts is the theme all share
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
    publish.ts          private graph → public graph. the sanitising projection
    palette.ts          both themes, for CSS and for three.js materials
    garden.test.ts      the regression net for link matching
    publish.test.ts     the regression net for what is allowed to cross over
  content/
    public.ts           the allowlist: which sites and concepts may appear publicly
    specimen.ts         Specimen A — the synthetic life the deployed chronology draws
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
| a pasted link                                | fetch     | once, on the reader's press, boiled to title + words | —              |
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
