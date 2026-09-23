---
title: Grow the garden from niwa-vault
status: shipped
created: 2026-09-23
---

# 008 — Grow the garden from niwa-vault

## Why

The Notion workspace was deleted on 22 September 2026. Its export was imported into
niwa-vault (`pvcomms/niwa-vault`, private): one markdown file per page, linked by slug. The
garden read memory, Fieldnotes and the code tree, and nothing else, so the largest body of
personal writing on the machine was not in it. A garden that leaves that out is not the whole
garden.

Separately, `~/Code` became a directory of symlinks on 20 September and `readdirSync`'s
`isDirectory()` is false for a symlink, so every repo silently left the graph and every
`build` thread went with it.

## What changes

- Before: 240 stones, 524 threads, 0 repos. The Reader previews the first 60 blocks of a note
  and lists neighbours without saying which way a link points.
- After: niwa-vault notes are stones (`notion`, `reading`, `garden`); their slug links resolve
  inside the vault first; `related:` frontmatter is a link; prose that names a note by title is
  a `mention`; the same document in two sources is a `twin`. Repos are back, and a real path
  like `~/personal/garden/niwa` resolves to its repo. The Reader renders the whole note,
  including images, and splits "Links to" from "Linked from".

## Where

| File                            | Change                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| `lib/garden.ts`                 | the vault source, scoped resolution, `related`, `mention`, `twin`, symlinked repos |
| `lib/palette.ts`                | three stone kinds and two thread kinds, both themes                                |
| `components/Reader.tsx`         | line-based markdown; directional neighbour groups                                  |
| `app/api/media/[name]/route.ts` | attachments by bare filename; 404 under `NIWA_MODE`                                |
| `app/api/watch/route.ts`        | watch the vault too                                                                |
| `scripts/NiwaApp.swift`         | outbound links open in the browser                                                 |
| `scripts/deploy-public.sh`      | the three vault kinds are private kinds                                            |

## Out of scope

Writing anything back to the vault — `mention` and `twin` are derived at read time and never
saved. Editing notes from the garden; the vault has its own editor (`pnpm vault` there). The
public garden: vault kinds are dropped by `lib/publish.ts` like every other private kind, and
the audit in `deploy-public.sh` now names them.

## Acceptance checks

Run on 2026-09-23 against the live stand.

```bash
pnpm test
# ℹ tests 34 · pass 34 · fail 0   (tsc clean first)

curl -s 127.0.0.1:5050/api/garden | jq -c '.stats | {nodes, links, notion: .byKind.notion, repo: .byKind.repo}'
# {"nodes":607,"links":1182,"notion":171,"repo":98}

img=$(ls ~/personal/garden/niwa-vault/content/media | head -1)
curl -s -o /dev/null -w '%{http_code}\n' "127.0.0.1:5050/api/media/$img"
# 200
curl -s -o /dev/null -w '%{http_code}\n' '127.0.0.1:5050/api/media/..%2F..%2F..%2F.zshrc'
# 404
```

- [x] Opening a Notion stone shows its full body; its `[[slug]]` links show titles and open
      the vault note, not a memory note that shares the key
- [x] A parent page lists its children under "Links to" and each child lists the parent under
      "Linked from"
- [x] Images in a Notion page load from the vault
- [x] A Fieldnotes source and its Notion highlights page are joined under "Same document"
