---
title: Export the graph as a file the person keeps
status: next
created: 2026-09-19
---

# 007 — Export the graph as a file the person keeps

## Why

The garden is derived from someone's own notes and exists only while the server is running.
There is no way to take it with you: no file to hand to a script, to open in a spreadsheet, to
diff against next month's, or to keep after this tool is gone. `data/garden.json` is baked by
a script for deployment and gitignored, which is not the same as a person choosing to save
their own graph.

This matters more than a convenience feature usually would. A tool that reads your private
notes and holds the result only inside itself has made you dependent on it. The exit should be
one click, and it should not be the sort of exit that phones home.

The record leaves as a file the person saves, never as a request. The export is built in the
browser from the graph already loaded and handed to the browser's own download. Nothing is
posted anywhere, no endpoint receives a copy, and no export is written to disk by the server.

## What changes

- Before: the graph exists in a canvas and nowhere else.
- After: two controls, JSON and CSV, each producing a file of what is currently on screen.

## Where

| File                    | Change                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| `lib/export.ts`         | new. pure: garden in, a JSON string and two CSV strings out              |
| `lib/export.test.ts`    | new. quoting, commas and newlines in labels; empty garden; ghost nodes   |
| `components/Garden.tsx` | two chips beside `fit`; build a Blob, trigger the download, revoke the URL |

JSON is the whole graph object as served. CSV is two files, nodes and links, because a graph
does not fit one table and pretending it does loses the links.

## Out of scope

No server-side export route. No GraphML, DOT, Obsidian canvas or any other format until
someone asks for one — three formats guessed at is two formats maintained for nobody.

No "export selection". The export is what the filters currently show, which is already the
thing the person is looking at.

No filename dialog beyond the browser's own. `niwa-YYYY-MM-DD.json` is enough.

## Acceptance checks

```bash
pnpm test    # including lib/export.test.ts
pnpm dev     # then click both
```

- [ ] A label containing a comma, a quote and a newline survives a CSV round trip
- [ ] The JSON export parses and has the same node and link counts as the colophon
- [ ] Filtering to one Bed and exporting yields only that Bed's stones
- [ ] The network tab shows no request when either export is clicked
- [ ] An empty garden exports headers rather than an empty file
