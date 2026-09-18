# Security and privacy

niwa reads a person's private notes. This document says exactly what it touches, what it
sends, and what to do if you find a hole. Report a problem rather than assuming it is known.

## What it reads

Three directories, at request time, read-only:

| What                  | Default            | Override          |
| --------------------- | ------------------ | ----------------- |
| memory                | `~/.claude/memory` | `NIWA_MEMORY_DIR` |
| the notes vault       | `~/Fieldnotes`     | `NIWA_VAULT_DIR`  |
| the code tree         | `~/Code`           | `NIWA_CODE_DIR`   |

It reads markdown, YAML frontmatter and directory names. `/api/garden` re-reads and re-derives
the whole graph on every request, memoised only against file mtimes, so nothing is retained
between requests. There is no database, no index, no cache on disk.

## What it writes

One file: `data/garden.json`, and only when you run `scripts/snapshot.mjs`. Nothing else is
ever written, and nothing is written to the directories it reads.

`/data/` is gitignored with a warning, and `git ls-files data` returns nothing on every commit
in this repository's history. A snapshot is derived from a live corpus whether it was baked in
public or private mode, so it is treated as private output regardless of mode.

## What leaves the machine

Nothing.

- No telemetry, no analytics, no error reporting, no usage pings. There is no third-party
  script, SDK or beacon in the app.
- Fonts are self-hosted. `app/layout.tsx` uses `next/font/google`, which downloads the font
  files at build time and serves them from the app's own origin — the browser never contacts
  a font host. `app/globals.css` still carries a remote `@import` for one webfont; the
  compiler drops it, so it is dead text rather than a request, and the face it names never
  loads.
- Loading the garden issues requests to its own origin and to no other host. Checked on
  2026-09-19 by driving a headless browser at a running instance and logging every request:
  33 requests, all to the local origin.
- `scripts/snapshot.mjs` calls `gh repo list` when baking a **public** snapshot. That is the
  one outbound call in the repository, it happens only when you run that script in public
  mode, and it asks GitHub which of your repositories are already public. The private garden
  never makes it.

The dev server binds `127.0.0.1` deliberately, never `0.0.0.0`. If you want the garden on
another device, put it behind a tailnet rather than a host.

## The public snapshot

The private garden is never deployed. A separate artefact is:

1. `lib/publish.ts` projects the private graph onto public ground. A node survives only if it
   is a glossary concept you wrote, a repository that is public on GitHub, or a site with a
   live public URL. Surviving nodes carry the already-public string — GitHub's own description,
   the live URL — and file paths are nulled, so a home directory cannot cross.
2. `content/public.ts` is the allowlist and the withheld list. Changing what ships means
   editing that file.
3. `auditPublicGarden` runs a tripwire list over the finished payload: home paths, tilde
   paths, contact addresses, API keys, environment assignments, localhost stands, health
   terms, private infrastructure names, family terms. Any hit refuses the build. Exceptions
   are explicit, scoped to one node and one tripwire, and each carries a written reason for
   why that string is already public.
4. `scripts/deploy-public.sh` re-bakes, then audits the file on disk rather than the code that
   produced it, refusing to ship anything not marked `mode: "public"` or holding a private
   node kind.

The redundancy is deliberate. Never weaken either check, and never deploy with `vercel`
directly.

## Reporting a leak

If you find something private in a public artefact, or a path by which something private could
become public:

- Open an issue at `github.com/pvcomms/niwa/issues` describing the **class** of leak — which
  field, which code path, which kind of string. Do not paste the leaked content itself.
- Or write to hello@paramv.com if the finding cannot be described without the content.

There is no bounty and no formal response window. This is one person's tool, published so
that others can run their own; reports are read and acted on.
