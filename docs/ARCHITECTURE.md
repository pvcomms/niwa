# Architecture

> The map. Read this instead of crawling the repo.

## In one paragraph

niwa is a Next.js app that reads three directories on the machine — memory, a notes vault and
the code tree — derives a graph from them at request time, and renders it as a 3D force-
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
    layout.tsx          theme <style> block, generated from lib/palette.ts
    globals.css
    api/
      garden/route.ts   GET the derived graph (full, or public when NIWA_MODE is set)
      watch/route.ts    SSE; emits when the fingerprint of the sources changes
  components/
    Garden.tsx          3d-force-graph + three.js scene; all materials from lib/palette
    Reader.tsx          the panel that shows a selected stone's note
  lib/
    garden.ts           THE derivation. sources → nodes → links → stats. pure, testable
    publish.ts          private graph → public graph. the sanitising projection
    palette.ts          both themes, for CSS and for three.js materials
    garden.test.ts      the regression net for link matching
    publish.test.ts     the regression net for what is allowed to cross over
  content/
    public.ts           the allowlist: which sites and concepts may appear publicly
  data/
    garden.json         BAKED public snapshot. generated. never edit
  scripts/
    snapshot.mjs        bakes data/garden.json (full or public)
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
~/Fieldnotes       ├──▶ lib/garden.ts ──▶ Garden {nodes, links, stats}
~/Code/*           ┘         │
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
| `~/Code/*`                                   | read      | repos                                             | `NIWA_CODE_DIR`   |
| `data/garden.json`                           | write     | the baked public snapshot, by `snapshot.mjs` only | —                 |

Nothing else is written. Nothing is cached to disk.

## The model

A **node** has a `kind` (`project`, `concept`, `user`, `feedback`, `reference`, `routine`,
`meta`, `note`, `agent`, `repo`, `ghost`), a `stage` (`fresh`, `tended`, `settled`, `fallow`,
`unknown`) derived from mtime, a `source` (`memory`, `vault`, `code`, `inferred`), and a
`degree`. Concepts carry `signed` — whether the term is Param's own.

A **link** is one of four kinds, and drawing all four is the substance of the tool:

- `link` — an explicit `[[wikilink]]`, resolved across the four slug styles actually in use
  (`project_suji`, `project-suji`, `suji`, `suji.md`)
- `concept` — a glossary term appearing literally in a note: where an idea is _practised_
  rather than defined
- `build` — a note naming a `~/Code/x` path that exists on disk
- `seed` — a wikilink pointing at nothing, rendered as a hollow **ghost stone**: an idea real
  enough to name and never written down

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
