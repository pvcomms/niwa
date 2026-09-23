---
title: The catalogue — every note, each one against the whole
status: shipped
created: 2026-09-23
---

# 009 — The catalogue

## Why

The garden is good at showing that things connect and bad at finding one thing and reading
it. With the Notion archive in, there are 600-odd notes, and the 3D view's search lists eight
hits and dims the rest. What was missing is the database view Notion had: every note as a row,
searchable to the word, sortable, groupable.

A plain table would lose what the garden is for. A row read on its own is a note torn out of
its place. So the rule for this view is that nothing is ever shown alone: a search is drawn
against the whole garden, a group says what share of the whole it is, and an opened page says
where it sits before it says anything else.

## What changes

- Before: one view, the 3D graph. Notion's page tree survives only as which page links to
  which.
- After: `/catalogue`. A table of every note (search reads the full text and shows the matched
  sentence; group by bed, section or stage; sort by place, title, tended or threads; state in
  the URL). Above it, **the whole**: one mark per note, bed by bed, in reading order, lit where
  the current view is. A group header says its share of the garden and how much of it is in
  view. An opened row is a page: the trail down to it, its properties, a sentence on where it
  sits and what its threads reach, the field with it, its neighbours and its family lit, its
  siblings in the order its parent lists them, its children, the note, and its threads.
  `in the garden` flies the 3D view to it; the Reader has `Open in catalogue` back.

## Where

| File                                       | Change                                               |
| ------------------------------------------ | ---------------------------------------------------- |
| `app/catalogue/page.tsx`                   | the route, Suspense around the URL-state client      |
| `components/Catalogue.tsx`                 | table, search, group, sort, keyboard, URL state      |
| `components/Page.tsx`                      | an opened row                                        |
| `components/Field.tsx`                     | the whole as marks                                   |
| `components/Markdown.tsx`                  | the renderer, moved out of Reader so both share it   |
| `components/ViewSwitch.tsx`, `useTheme.ts` | garden / catalogue; one theme hook for both          |
| `lib/place.ts`                             | trail, children in order, outline, snippet, resolver |
| `lib/garden.ts`                            | vault notes carry `parent` and `tags`                |
| `components/Garden.tsx`                    | `?focus=<id>` selects and flies to a stone           |
| `scripts/NiwaApp.swift`                    | View menu: ⌘1 ⌘2 ⌘[                                  |
| niwa-vault `scripts/import-notion.mjs`     | writes `parent:` from the export's folders           |

## Out of scope

Editing. The catalogue reads; notes are written in the vault (its own `pnpm vault` editor, or
any editor — the watcher regrows both views). No ranking of notes against each other: sorting
is by a column the reader chooses, and the page's sentence states counts, never a percentile.

## Acceptance checks

Run on 2026-09-23.

```bash
pnpm test
# ℹ tests 41 · pass 41 · fail 0   (tsc clean first)

curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/catalogue
# 200

curl -s 127.0.0.1:5050/api/garden | jq '[.nodes[] | select(.kind=="notion" and .parent != null)] | length'
# 170   (every Notion page but the workspace root)

next build   # in a clean copy
# ○ /catalogue   prerendered as static content
```

- [x] Searching a word lights exactly the matching marks in the field and shows `N of 609`
- [x] A body match shows the sentence it came from, with the match marked
- [x] Opening a Notion page shows its trail, "Beside it, under <parent> · i of n", its
      children, and the field with this note, its neighbours and its siblings lit
- [x] `in the garden` opens the 3D view with that stone selected and the camera on it
- [x] `⌘K`, `↓`, `enter`, `esc` search, move, open and close; the back button closes a page
- [x] No horizontal scroll at 375px; the page is full-width there
- [x] Sumi set in either view is still sumi after a reload in the other
