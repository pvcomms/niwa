# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- The margin (018): a tenth view, `/margin`, and a tab at the edge of every other one. Open
  it — the tab, or the apostrophe — and say what comes to mind while looking: typed, or
  spoken into the microphone. A note keeps its moment, the view it was made at and that
  view's whole address, and what was on the desk — the stone in the reader, the pathway on
  the alarm, the entry on the chronology — as _about_. A spoken note can be _written out_
  through the speech server already on the machine (Parakeet on 127.0.0.1:8880) and the
  words corrected by hand. `/margin` reads it all back newest first, by day, filtered by
  view, by thing, or by a word, with a reading that counts and never grades. One markdown
  file per note in `niwa-vault/content/margin`, the audio beside it. ⌘M in the app.
- The alarm (017): an eighth view, `/alarm`, the fight-or-flight sandbox moved into the
  garden and handed the reader's own names. The circuit is theirs — triggers with how hard
  each hits and the defences it pulls, defences with their shape (fight, flight, freeze,
  fawn) and cost, brakes with how fast they work, and the sandbox's four dials as how loaded
  they are today — kept in `circuit.json`. A pathway is marked against it: what it touches
  and how much, which brakes are within reach, which defences are expected; its line runs
  from the alarm to hypervigilance or calm by the marks alone, beads on the line for each.
  _Poke it_ runs the toy body with the reader's triggers as cues and their brakes as the
  buttons: the hand-drawn circuit lights, a heart beats at rate, eight gauges and a
  forty-second timeline show the surge, and a sentence sums the run. _How did it go?_ is
  asked after the fact and counted. Pathways are one markdown file each; the deployed
  garden serves Specimen A's circuit read-only. ⌘8 in the app; "its alarm" from the reader
  and the catalogue.
- The way (016): a ninth view, `/way`, Think Forward-Reverse moved into the garden with its
  model brought home. Two papers in the reader's own words — where they are, and where they
  mean to be, written as if it is already so — with the line from now to then between them:
  first moves below, what had to be true right before above, what stands in the way hatched
  underneath. The texts are read back as facts: which sentences of the then still look ahead,
  and the vocabulary of the change. _ask for the way_ has Ollama on this machine propose what
  changes, the steps back and forward with months, and the obstacles with when–then plans —
  all hollow until kept; _say the then again_ retells it in the present tense for the reader
  to take or drop. A kept, dated step can be set down on the chronology. _stand at the then_
  turns the sheet into the memoir. One markdown file per way in the vault. ⌘9 in the app.
- The chronology (015): a seventh view, `/chronology`, the standalone number line moved into
  the garden. A life as a line, the inner life above it and the world below in lanes the
  reader names; a day is a hand-drawn mark sized by how large it looms, a stretch a bar, a
  coarse day placed at the middle of its period with a whisker across it, an entry ahead of
  today hollow. The circumstances run over the lanes — structure and conjuncture as bands
  packed into rows, happenings on a rule — and gaps the record does not speak for are hatched
  and named for why. Two scales, clock and proportional (ln(1 + age)), invert exactly. The
  present drags and the reading says what was so at that day. ⌘ wheel zooms, drag pans, a
  strip brackets the window on the whole. Double-click sets down; drag re-dates; the desk
  edits everything and asks _would you have it again?_ without totalling it. Under the lanes,
  every day the garden's notes speak of; _its dates_ from the reader and the catalogue. Entries
  are one markdown file each in the vault, the life is `life.json`. The deployed garden serves
  the synthetic Specimen A read-only. ⌘7 in the app.
- The course (014): a sixth view, `/course`, the site's breakout figure made honest with
  the garden's data. A stone is the belief; what flowed straight into it is laid across the
  sheet as hand-drawn bricks in the order it came, months ticked underneath; the belief is
  launched from a paddle labelled _judgment_ and drawn as a pen line through every brick,
  bending up at each input the reader marks _toward_ the question and down at each marked
  _away_, straight through the unweighed, ending at a disc with a short arrow the way the
  last bend left it. The bricks are grey until the reader says. The question runs along the
  top as a horizon, put in words on the desk and kept with its earlier phrasings when it is
  re-put. The reading counts the marks, names what kind of thing did the bending, says what
  has hit the belief since it was last rewritten, and grades nothing. _Arriving_ lists what
  came lately that speaks the belief's words and is not threaded to it yet. The belief's
  own git history dates the field: the days its file changed are ticked underneath as the
  days it was steered, and each input is dated by the day its name first appeared in the
  file, falling back to the input's own date where the record cannot say — the card says
  which. Courses are kept one markdown file per belief in the vault. Marks float over the
  chosen brick; _its course_ walks to an input and `[` walks back. ⌘6 in the app; "its
  course" from the reader and the catalogue.
- The flow (013): a fifth view, `/flow`, with the garden's threads given a direction — a
  note that cites a thing was fed by it — and walked from any one stone: what flowed into
  it fans left by hop, what it flows into fans right, pen arrows in their kind's colour,
  the ones that run both ways in the accent, fallow roots hollow, unwritten ones dashed;
  hover lights a whole path, stones slide when the centre moves. The reading names what
  it rests on, which roots have moved or were never written, the linchpin other roots
  pass through, the loops, and what would move if it changed. _What shaped the most_ and
  _what runs both ways_, measured. ⌘5 in the app; "in the flow" from the reader and the
  catalogue.
- The distribution (012): a fourth view, `/distribution`, with the garden's own taste drawn
  as a curve — every stone with text placed by its kinship (mean likeness to its eight
  nearest stones, on shared words) and standardised against the garden's spread, with
  every stone as a mark under the curve in its bed's colour. Three windows (everything,
  90 days, 30 days). σ bands to hover, hold and list. Paste a title and a line, or a link
  read on your press, and the thing drops onto the curve at its place with its kin, the
  words they share, and the glossary terms it speaks. "let it in" / "pass" keeps the
  choice as a file with where it sat, drawn as a tick under the axis. Two measures —
  words, and themes from the garden's own co-occurrence (latent semantic analysis, no
  dependency) — with the reading saying what a gap between them means, and a text the
  themes cannot hold refused a theme placement rather than given a noisy one. The thing moves
  on the curve as you type; a press pins it to a tray so several can be weighed
  together, with threads drawn from the one in view to its kin.
- The bearing (011): a third view, `/bearing`, with the reader's values drawn by hand
  as overlapping circles on one sheet. Hover floods a value, click holds it, a membership
  cursor prints `cursor ∈ T ∩ P · keep the exit`. A decision typed on the desk becomes a
  stone; dragging it to where it sits is the judgment, and the desk reads the placement
  back — the set expression, the region's name, what it is silent on, and the garden's
  stones about each value it touches. An optional heading reads as what it gains and
  leaves. Decisions are kept one markdown file each in the vault; values come from the
  reader's `values.json`, edited in place on the desk (names, meanings, terms, hues,
  region names, three circles or five) and written back. Double-click the sheet to set a
  stone down where you point; arrow keys nudge it; a stone moved on a later day keeps its
  trail in pencil; _let go_ can be undone for nine seconds. Nothing is scored.
- Drawn, not computed (010). One seeded stroke generator, `lib/hand.ts`, draws the panel
  borders, the rings, underlines and strikes, and the sheets' left edges, every line a
  pressed ribbon rather than a ruled stroke. Stones are discs drawn on paper — inked edge,
  hatching away from the light — that always face the reader; threads are one-pixel pen
  lines, each bowed its own way. Map labels, captions and marginalia are in a hand face
  (Caveat); the paper has grain. `docs/design/sketched.svg` is the design sheet, rendered
  from the same generator for import into Figma.
- The lasso: hold ⇧ and draw a ring round stones to gather them. The ring is inked, the
  stones inside are listed, the rest of the garden dims.
- A card follows the pointer over a stone: bed, threads, title and the first breath of the
  note, before it is opened.
- The walk: stones opened in turn are remembered as `walked A › B › C` in the reader and
  drawn on the map as a dashed pencil trail; each step returns there, and `[` steps back one.
- From the Figma Make pass: every catalogue row carries the first line of its note under the
  name, the open row is underlined by hand instead of barred, and the garden's filters have
  an `all on` reset beside the fold.

### Changed

- No Japanese or Chinese characters anywhere: the views are named in English, the masthead
  reads `niwa` with the view's name under it, the app is `niwa.app` (⌘4 opens the
  distribution) and its icon is a drawn ring with one rust stone.

- Memory notes whose `name:` is only a filename slug take their title from `MEMORY.md`,
  the index a person reads: 88 of 90 labels now read as words.
- Garden search puts a note named what you typed before notes that only mention it.
- The garden's Beds & threads panel folds away, remembers it, starts folded on a phone,
  and says how many filters are off while folded.
- The Mac app's window title follows the page, so garden and catalogue are told apart in
  the window switcher.

### Fixed

- Clicking empty ground in the garden now puts the selected stone down, as `esc` did.
- The Next.js dev badge no longer sits over the filters in the Mac app (`devIndicators`).
- The garden search had `outline-none` with the ring supplied only by accident; it shares
  the catalogue's explicit focus ring. The view tabs meet the 24px target size.

### Added

- The catalogue, `/catalogue`: every note as a row, searchable to the word, grouped by bed,
  section or stage, sortable, with its state in the URL. A field of one mark per note shows
  what a search or filter is looking at against the whole garden; an opened page carries its
  trail, its siblings in order, and the same field with its neighbourhood lit. `lib/place.ts`
  holds the placing logic, tested on its own.
- Vault notes carry `parent` and `tags`, so Notion's page tree is data the views can walk.
- The Mac app's View menu: Garden ⌘1, Catalogue ⌘2, Back ⌘[.

- niwa-vault as a fourth source (`NIWA_GARDEN_DIR`): the Notion workspace, the Readwise
  Reader archive and the hand-written garden notes, as `notion`, `reading` and `garden`
  stones. Their slug links resolve inside the vault first; `related:` frontmatter draws a link.
- Two derived thread kinds: `mention`, where a note's prose names another by title, and
  `twin`, the same document filed in two sources.
- The Reader reads rather than previews: nested and numbered lists, checkboxes, callouts,
  links, images from the vault via `/api/media/<file>`, no 60-block cap. Written links and
  mentions are split into what a note reaches for and what reaches for it.
- The Mac app opens a note's outbound links in the browser instead of dropping them.

### Fixed

- The display serif and the mono face never loaded: `--font-display` and `--font-mono` were
  declared on `:root` but reference variables next/font defines on `<body>`, so both resolved
  invalid and fell back to the sans. They are declared on `body` now.
- The theme did not survive a reload: the write effect ran before the read and stored `paper`
  over the saved choice. One hook, `useTheme`, reads first.

- Repos. `~/Code` became a directory of symlinks and every repo silently left the garden;
  links are now followed, and a note naming a repo's real path resolves to it.
- The watcher and the memo fingerprint cover the vault, so editing a note there regrows the
  garden in place.

### Changed

- The chronology (015), second pass: zooming eases instead of jumping, and the strip at the
  bottom is a brush — drag it to pan, drag its ends to resize — with `+` `−` chips on the sheet.
  The world is offered: dated public happenings and eras (the pandemic, lockdowns, ChatGPT,
  the 2008 crash, demonetisation, and more) drawn faintly above the line; click one to let it
  in as your own entry. A chosen entry drops plumb lines through every lane, a stretch a wash
  between its ends, so what sat beside it can be seen; the desk lists what sat within a year.
  Threads between entries are the reader's own, drawn with one of four verbs and kept in the
  file. Another life — a folder of the same shape under `others/` — can be laid alongside,
  read-only, in their words; the specimen is the first.

## [0.1.0] - 2026-09-19

First tagged state. The garden has been in daily use on one machine since 17 September 2026;
this tag is the point at which the repository around it was made legible to someone else.

### Added

- The graph. `lib/garden.ts` reads a memory directory, a notes vault and a code tree at
  request time and derives a typed graph: nodes with a kind, a stage and a degree, and links
  of four kinds. No database, no index, no cache on disk.
- Four kinds of thread, drawn differently: a written `[[wikilink]]` resolved across four slug
  styles, a glossary term practised literally in a note, a note pointing at code that exists
  on disk, and an unresolved link.
- Ghost stones. An unresolved wikilink becomes a hollow stone — an idea named often enough to
  link to and never written down. `lib/ghosts.ts` ranks them by how many distinct notes point
  at each, and `scripts/unplanted.mjs` prints that list.
- The canvas. `components/Garden.tsx` renders the graph with three.js and 3d-force-graph;
  `components/Reader.tsx` opens a stone and lets you follow its links.
- Live updates. `/api/watch` is server-sent events over `fs.watch` with a 15-second poll as
  backstop, and the canvas grows in place rather than reloading.
- Two themes, paper and sumi, defined once in `lib/palette.ts` and fed to both the CSS
  variables and the three.js materials.
- The public seam. `lib/publish.ts` projects topology without strings, `content/public.ts` is
  the allowlist, a tripwire audit refuses to bake anything private, and
  `scripts/deploy-public.sh` re-audits the artefact on disk before shipping it.
- 28 unit tests over `lib/`, run with `node --test` after `tsc --noEmit`, and a GitHub Actions
  workflow that runs them on push and pull request.
- A LaunchAgent template and `scripts/install-launchd.sh`, so the garden comes up at login on
  whatever machine it is installed on.
- Documentation: `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`,
  `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/TEMPLATE.md` and one file per feature
  under `docs/features/`.

### Removed

- The password-gated private deployment, deleted deliberately on 18 September 2026. The full
  garden stays on the machine; only the audited public snapshot ships.

[unreleased]: https://github.com/pvcomms/niwa/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/pvcomms/niwa/releases/tag/v0.1.0
