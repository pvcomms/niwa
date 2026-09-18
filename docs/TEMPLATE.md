# Running your own garden

niwa was built against one person's directories. The instrument is general; the paths and the
allowlist are not. This is the seam.

## What is Param's

| Thing                                   | Where                      | Replace with                                                                             |
| --------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------- |
| `~/.claude/memory` as the memory source | `NIWA_MEMORY_DIR`          | any directory of markdown with frontmatter                                               |
| `~/Fieldnotes` as the vault             | `NIWA_VAULT_DIR`           | your notes vault                                                                         |
| `~/Code` as the code tree               | `NIWA_CODE_DIR`            | wherever your repos live                                                                 |
| The public allowlist                    | `content/public.ts`        | your own public sites and withheld concepts — or empty it and never deploy               |
| `data/garden.json`                      | generated, never committed | nothing to replace — `/data/` is gitignored; run `scripts/snapshot.mjs` to bake your own |
| Mac app name, icon, LaunchAgent label   | `scripts/`                 | rename `com.param.niwa` and the bundle; `install-launchd.sh` fills in your own paths     |
| Port 5050                               | `package.json`             | anything free                                                                            |

The three directory vars are already the intended seam — `lib/garden.ts` reads each from the
environment and falls back to Param's layout. Nothing else in `lib/` knows whose machine it
is on.

## What is the instrument

`lib/garden.ts` — the derivation. Source directories in, typed graph out, four kinds of
relation, five stages, ghost stones for unresolved references. This is the actual product and
it is person-agnostic today.

`lib/publish.ts` — the sanitising projection. Topology survives, strings do not. Generic:
it takes an allowlist and a repo list, and has no knowledge of any particular life.

`lib/ghosts.ts` — the unplanted ranking. Pure, generic.

`lib/palette.ts` — both themes, feeding CSS and three.js from one place.

`components/Garden.tsx` — the canvas.

## Running it against your own life

1. Clone, `pnpm install`.
2. Point the three vars at your own directories:
   ```bash
   export NIWA_MEMORY_DIR=~/notes/memory
   export NIWA_VAULT_DIR=~/notes
   export NIWA_CODE_DIR=~/src
   ```
3. `pnpm dev`, open `127.0.0.1:5050`.
4. `node --experimental-strip-types scripts/unplanted.mjs` to see what you keep reaching for
   and have never written.
5. Optional: `./scripts/install-launchd.sh` to keep it running at login, on macOS.

Do not deploy it. If you want it on your phone, put it behind a tailnet.

## What will not work yet

The vault layout is assumed: a `Glossary/` directory for concepts, and
`{Ideas,Sources,Course,People}` plus the root for fieldnotes. Other structures are simply not
read. Making the vault shape configurable is unbuilt.

Frontmatter keys are assumed — `name`, `description`, `type`, and `status: mine` to mark a
concept as your own writing. There is no mapping layer for other conventions.

The stage thresholds (`fresh` / `tended` / `settled` / `fallow`) are hardcoded mtime windows
tuned to one person's writing rhythm.

`content/public.ts` ships populated with Param's public sites. Anyone else must empty it
before running any deploy script, and there is currently no check that enforces that.

The LaunchAgent template assumes macOS and a `launchd` user session. `install-launchd.sh`
takes the `node` on your `PATH` at install time, so switching node versions afterwards
leaves the agent pointing at the old one; re-run the installer rather than editing the
generated plist.
