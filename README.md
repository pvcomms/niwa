# 庭 niwa

A live 3D graph of everything you know you know — memory, vocabulary and code, drawn as one
garden.

**Local-only. Never deploy this.** It reads your memory directory, your vault and your code
tree at request time. Nothing it renders belongs on the internet.

```bash
pnpm dev   # 127.0.0.1:5050
```

## What it reads

| Source                                              | Becomes                                                |
| --------------------------------------------------- | ------------------------------------------------------ |
| `~/.claude/memory`                                  | builds, rules, self, reference, routines, root, agents |
| `~/Fieldnotes/Glossary`                             | concepts — with `status: mine` surfaced as _signed_    |
| `~/Fieldnotes/{Ideas,Sources,Course,People}` + root | fieldnotes                                             |
| `~/Code/*`                                          | repos                                                  |

Nothing is cached to disk and there is no build step. `/api/garden` re-reads and re-derives on
every request, memoised only against file mtimes.

## Four kinds of thread

A written link is one of several ways two things can be related, so the graph draws all four:

- **Written link** — an explicit `[[wikilink]]`, resolved across the four slug styles actually
  in use (`project_suji`, `project-suji`, `suji`, `suji.md`)
- **Shared vocabulary** — a glossary term appearing literally in a note: where an idea is
  _practised_, not merely defined. Multi-word terms match case-insensitively; a single word
  must be capitalised, or ordinary words like `keep`, `edge` and `still` poison everything
- **Points at code** — a note naming a `~/Code/x` path that exists on disk
- **Unplanted** — a wikilink pointing at nothing. These render as hollow **ghost stones**: the
  idea is real enough to link to, and has never been written down

## Reading the garden

Stone size is degree. Colour is kind. Opacity and the four stages (fresh / tended / settled /
fallow) come from when the file was last touched — a fallow bed is a real signal, not a defect.

`/` focuses search · `esc` clears · **fit** re-frames the connected ontology · **paper / sumi**
switches theme. Click any stone to open it, and follow its links from the reader.

## It moves on its own

`/api/watch` is server-sent events over `fs.watch`, with a 15-second poll as backstop. A write
anywhere in memory or the glossary refetches and the graph grows **in place** — node objects
are reused, so the simulation keeps its positions and only new stones drift in. Memory
auto-commits hourly and seven scheduled agents write into it, so this happens unattended.
The colophon says `watching disk` until it does, then `the garden moved`.
