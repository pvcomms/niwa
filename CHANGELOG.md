# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- The distribution (012): a fourth view, `/distribution`, with the garden's own taste drawn
  as a curve — every stone with text placed by its kinship (mean likeness to its eight
  nearest stones, on shared words) and standardised against the garden's spread, with
  every stone as a mark under the curve in its bed's colour. Three windows (everything,
  90 days, 30 days). σ bands to hover, hold and list. Paste a title and a line, or a link
  read on your press, and the thing drops onto the curve at its place with its kin, the
  words they share, and the glossary terms it speaks. "let it in" / "pass" keeps the
  choice as a file with where it sat, drawn as a tick under the axis.
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
