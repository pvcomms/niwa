---
title: Declare the package ESM and stop the reparse warning
status: next
created: 2026-09-19
---

# 004 — Declare the package ESM and stop the reparse warning

## Why

Every test run prints this, twice:

```
(node:93410) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///…/lib/ghosts.test.ts
is not specified and it doesn't parse as CommonJS. Reparsing as ES module because module syntax
was detected. This incurs a performance overhead.
```

The warning is correct. `package.json` has no `"type"`, so Node parses each test file as
CommonJS, fails, and parses it again as ESM. The cost is small. The damage is that the proof
command prints a warning nobody is going to act on, and a test suite whose normal output
contains noise is a test suite whose real warnings get skimmed past.

It has not been fixed in passing because `"type": "module"` changes how Node parses every file
in the repository, and that is a behaviour change wearing the costume of a one-line cleanup.

## What changes

- Before: `pnpm test` prints two `MODULE_TYPELESS_PACKAGE_JSON` warnings.
- After: `pnpm test` prints none, and everything that ran before still runs.

## Where

| File                       | Change                                                                       |
| -------------------------- | ---------------------------------------------------------------------------- |
| `package.json`             | add `"type": "module"`                                                        |
| `next.config.ts`           | verify only — Next loads this itself; confirm it still loads under type:module |
| `postcss.config.mjs`       | verify only — already `.mjs`, already ESM                                     |
| `scripts/snapshot.mjs`     | verify only — already ESM                                                     |
| `scripts/unplanted.mjs`    | verify only                                                                   |
| `scripts/shot.mjs`         | verify only — uses `createRequire`, which keeps working                       |
| `scripts/deploy-public.sh` | check the inline `node -e` block: it calls `require("./data/garden.json")`    |

The last row is the one that can actually break. `node -e` is CommonJS unless told otherwise,
but that inline script is the artefact audit standing between the snapshot and a deploy, so it
gets run, not reasoned about.

## Out of scope

No conversion of `.mjs` scripts to `.ts`, no change to the `--experimental-strip-types` setup,
no change to `tsconfig.json`. This is one key in one file plus the verification that earns it.

## Acceptance checks

```bash
pnpm test 2>&1 | grep -c "Reparsing as ES module"          # 0
pnpm test                                                   # tsc clean; 28 pass, 0 fail
pnpm build                                                  # completes
node --experimental-strip-types scripts/unplanted.mjs       # prints the ranked list
node --experimental-strip-types scripts/snapshot.mjs public # audit clean, writes the snapshot
bash -n scripts/deploy-public.sh && node -e 'require("./data/garden.json")'   # no error
```

- [ ] `pnpm dev` starts and the garden renders
- [ ] No file gained a `.cjs` extension to work around the change
