# Contributing

## Run it

```bash
pnpm install
pnpm dev     # 127.0.0.1:5050
pnpm test    # tsc --noEmit, then node --test over lib/**/*.test.ts
```

`pnpm test` is the proof. It typechecks first and then runs the unit tests — 28 of them at the
time of writing, all in `lib/`. A change that does not keep it green is not finished, and the
number going up is the normal outcome of new work.

Node 25 and pnpm 10 are required. Tests and scripts run TypeScript directly through
`--experimental-strip-types`, so imports inside `lib/` and `scripts/` carry explicit `.ts`
extensions. That is not a style preference; the runtime needs them.

## How work is specified

One feature, one file: `docs/features/NNN-slug.md`. Numbers are allocated in creation order
and never reused or renumbered, so `niwa 004` still means something in a year. Copy the shape
of an existing spec.

Frontmatter carries `title` and `status`, and status is one of:

| status     | meaning                                                        |
| ---------- | -------------------------------------------------------------- |
| `draft`    | written down, not thought through, not ready to hand to anyone |
| `next`     | specified well enough that someone could start now             |
| `building` | someone is on it                                               |
| `shipped`  | acceptance checks were run and passed                          |
| `parked`   | deliberately not doing this, with the reason in the body       |

Every spec ends in acceptance checks that are **commands with expected output**. "Feels
responsive" is not a check; `pnpm test` passing is. A spec moves to `shipped` only when those
commands were actually run and the output reported. A feature that could not be finished stays
`building` with a note on what blocked it, rather than being quietly narrowed.

If you find a bug while building something else, write it as a spec. Do not fix it in the same
change — the repo's history is easier to read when one commit answers one question.

## Privacy rules

This tool reads someone's private notes. The rules below are not advisory.

- No personal data in the repo. No home directory paths, no hostnames, no IP addresses, no
  email addresses, no health or family terms. The only exceptions are the synthetic fixtures in
  `lib/publish.test.ts`, which exist to prove the tripwire catches them.
- `data/` is gitignored and has never been committed. Snapshots are generated output derived
  from a live corpus. Do not commit one, and do not "temporarily" un-ignore the directory.
- Topology crosses the public seam, strings do not. `lib/publish.ts` may emit only text that
  was already public: a GitHub description, a live URL, or the author's own glossary writing.
  It must never read a memory node's body, description or filename.
- Changing what the public garden contains means editing `content/public.ts`, the allowlist,
  never the builder.
- Never weaken the tripwire audit in `lib/publish.ts` or the artefact check in
  `scripts/deploy-public.sh`. They are deliberately redundant: one tests the code, the other
  tests the file that actually ships.
- Never deploy the private garden. Reachability from another device is a tailnet, not a host.

Before opening a pull request:

```bash
git grep -nE '/Users/|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' -- ':!lib/publish.test.ts'
git ls-files data
```

Both should print nothing. The first is the same shape as the home-path and contact tripwires
in `lib/publish.ts`; widen it to whatever else is true of your machine before you push.

## Commits

The subject says what changed and why it mattered, in one line. `middleware.ts -> proxy.ts:
the gate was silently breaking local dev` is the standard: the change and the reason. No
conventional-commit prefixes. Keep commits small enough that the subject can be true.

Code written by an agent carries a `Co-Authored-By:` line naming the model.

## Style

Plain declarative prose in documentation. No emoji. Code matches its neighbours. Colour comes
from `lib/palette.ts` in TypeScript, never a hex literal in a component — three.js reads
materials from the same module the CSS does, and a hardcoded colour desyncs on theme change.

`AGENTS.md` is the contract if you are a coding agent. `docs/ARCHITECTURE.md` is the map; read
it instead of crawling the tree.
