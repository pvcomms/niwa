<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agents

Constellation-wide rules: `~/Code/cfap/AGENTS.md`. Read it once, then this. The map is
`docs/ARCHITECTURE.md` — read that instead of listing files.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript 7 · Tailwind 4 · three.js + 3d-force-graph ·
pnpm. Node 25 type-stripping is used for tests and scripts, so `.ts` runs directly with
`--experimental-strip-types` and imports carry explicit `.ts` extensions.

## Commands

```bash
pnpm test    # tsc --noEmit, then node --test on lib/**/*.test.ts — this is the proof
pnpm dev     # 127.0.0.1:5050, localhost only, never 0.0.0.0
pnpm build   # next build
```

## Invariants

**This is local-only. Never deploy the private garden.** It reads `~/.claude/memory`, the
vault and the code tree at request time. There was a private deployment; it was deleted
deliberately on 18 Sep 2026. Do not recreate it, do not add a `--prod` deploy of the full
graph, do not suggest one. Reachability away from the machine is `tailscale serve`, not
Vercel.

**Only the baked public snapshot ships.** `niwa-public` is fed by
`scripts/deploy-public.sh`, which re-bakes `data/garden.json` through `lib/publish.ts` and
then refuses to ship if the artefact is not `mode: "public"` or contains any private node
kind. Never weaken either check. Never deploy with `vercel` directly — use the script.

**Topology crosses over, strings do not.** `lib/publish.ts` may only emit text that was
already public: a GitHub description, a live URL, or Param's own glossary writing. It must
never read a memory node's body, description or filename. If a feature seems to need private
text on the public side, it does not; say so.

**`content/public.ts` is the allowlist.** Changing what the public garden contains means
editing that file, not the builder.

**No cache on disk, no build step for the graph.** `/api/garden` re-reads and re-derives per
request, memoised only against file mtimes. Do not add a cache layer to "fix" a slowness that
has not been measured.

## Do not touch

`data/garden.json` by hand — it is baked by `scripts/snapshot.mjs`. The
`<!-- BEGIN:nextjs-agent-rules -->` block above — `next dev` rewrites it; commit it with your
work. `.next/`, `node_modules/`, `tsconfig.tsbuildinfo`.

## Traps

**`proxy.ts`, not `middleware.ts`.** The file was renamed because the gate was silently
breaking local dev. It is a no-op when `NIWA_PASSWORD` is unset, which is how dev and the
public build stay open. Do not rename it back.

**Single capitalised words poison the concept index.** Glossary matching treats a multi-word
term case-insensitively, but a one-word term must be capitalised in the note — otherwise
ordinary English like `keep`, `edge` and `still` links everything to everything. If you touch
the matcher, `lib/garden.test.ts` is the thing that catches the regression.

**Colour lives in `lib/palette.ts`, in TypeScript, not CSS.** three.js sets materials from
JS, so a CSS-only palette desyncs on theme change. Both the `<style>` block in `layout.tsx`
and every material read from that module. Never hardcode a hex in a component.

**`/api/watch` must answer once and close when `NIWA_MODE` is set.** A deployed garden has no
home directory to watch, and holding a serverless function open forever is the failure that
guard exists to prevent.

---

<!-- BEGIN:cfap -->

## Constellation rules

This repo is part of the Center for Applied Post-Phenomenology constellation. These rules hold
here and in every sibling repo. This block is generated — edit `cfap/KERNEL.md`, not this copy.

**Read this much, then stop.** This file, then `docs/ARCHITECTURE.md` for the map, then the one
feature spec you were given at `docs/features/NNN-slug.md`. Do not crawl the repo to get
oriented — the architecture doc exists so you do not have to. Do not open a fifth document
without a reason you could state. Token discipline is a product requirement here, not a
preference: a tool about attention that wastes yours is a joke.

**Local by default.** Personal data stays on the machine that made it. No telemetry, no
analytics, no error reporting to a third party, no fonts or scripts from a CDN, no usage pings.
If a feature needs the network it says so in its spec and names the host.

**Flat files are the database.** Markdown with YAML frontmatter for what a human writes, JSON
for what a program writes. No hosted database, no ORM, no migration framework.

**The tool never decides.** Nothing ranks a person's options for them, scores them against a
norm, or recommends. Instruments surface; people judge. If a spec asks for a recommendation
engine, it is out of scope — say so rather than building it.

**No dependency without a written reason** in `docs/DECISIONS.md`. Prefer the standard library.
Prefer thirty lines you can read.

**Three similar lines beat a premature abstraction.** Extract on the third repetition.

**Never invent a fact about the system.** If you need to know what deploys where or whether
something is live, check it. This whole structure exists because hand-written claims drifted
from reality while still reading as authoritative.

**Features** are `docs/features/NNN-slug.md` with frontmatter `status:` of `draft` / `next` /
`building` / `shipped` / `parked`. Acceptance checks are commands with expected output, never
adjectives. Mark `shipped` only when you ran them and they passed — and report the output. A
feature you could not finish stays `building` with a note on what blocked it. Never silently
narrow scope.

**Style.** Plain declarative prose, no emoji, no "comprehensive" or "seamlessly", no summary
paragraph restating what was just said. Code matches its neighbours. Commit subjects say what
changed and why it mattered.

**Before you finish**, run the repo's tests and typecheck, and say plainly what passed, what
failed, and what you did not do.

<!-- END:cfap -->
