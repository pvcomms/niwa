# 庭 niwa

A live 3D graph of everything you know you know — memory, vocabulary and code, drawn as one
garden.

![The public snapshot: concept and repository stones joined by hairline threads on a paper-coloured field, with the kind filters at the lower left and a colophon reading 53 stones, 90 threads.](docs/img/garden.png)

**Local-only. Never deploy this.** It reads your memory directory, your vault and your code
tree at request time. Nothing it renders belongs on the internet.

There is a public mirror, and it is a different artefact. The live garden stays on the machine
that made it. A separate build bakes a snapshot that keeps the topology and discards the
strings: only concepts you wrote yourself, repositories that are already public on GitHub, and
sites with a live public URL survive, each carrying the text that was already public rather
than anything read off disk. `content/public.ts` is the allowlist, `lib/publish.ts` is the
projection and the tripwire audit, and `scripts/deploy-public.sh` re-bakes, re-audits and
refuses to ship an artefact that is not marked public or that still holds a private node kind.
That snapshot is what `niwa-public.vercel.app` serves, and it is what the picture above shows.

## What it reads

| Source                                              | Becomes                                                |
| --------------------------------------------------- | ------------------------------------------------------ |
| `~/.claude/memory`                                  | builds, rules, self, reference, routines, root, agents |
| `~/Fieldnotes/Glossary`                             | concepts — with `status: mine` surfaced as _signed_    |
| `~/Fieldnotes/{Ideas,Sources,Course,People}` + root | fieldnotes                                             |
| `~/Code/*`                                          | repos                                                  |

Each of the three roots is an environment variable — `NIWA_MEMORY_DIR`, `NIWA_VAULT_DIR`,
`NIWA_CODE_DIR` — so the instrument points at whatever directories are yours.

It reads them, and that is all it does to them. The only file it ever writes is
`data/garden.json`, the baked snapshot, and only when you run the snapshot script. Nothing is
cached to disk and there is no build step: `/api/garden` re-reads and re-derives on every
request, memoised only against file mtimes.

Nothing leaves the machine. No telemetry, no analytics, no error reporting, no fonts or
scripts fetched from a CDN at page load — loading the garden makes requests to its own origin
and to nowhere else. `SECURITY.md` says how that was checked and how to report a leak.

## Prerequisites

Node 25 and pnpm 10. Node 25 is required, not preferred: tests and scripts run TypeScript
directly through `--experimental-strip-types`.

## Run

```bash
pnpm install
pnpm dev     # 127.0.0.1:5050
pnpm test    # typecheck, then the tests — this is the proof
```

On macOS, to keep it up at login instead of running it by hand:

```bash
./scripts/install-launchd.sh
```

That fills the LaunchAgent template with your home directory, this clone's path and your
`node`, writes `~/Library/LaunchAgents/com.param.niwa.plist` and starts it. `scripts/README.md`
covers stopping, restarting and the log.

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

## The catalogue

`/catalogue` (目録) is the same garden as a searchable table, one row per note: search reads
every word and shows the sentence it matched, rows group by bed, section or stage and sort by
place, title, date or threads, and the state lives in the URL. Nothing in it is shown on its
own. Above the table, **the whole** draws every note as one mark, bed by bed, and lights only
what the current search and filters are showing. Opening a row gives its page the path down to
it, its place among its siblings, a sentence on what its threads reach, and the same field with
this note, its neighbours and its family lit. **in the garden** flies the 3D view to it.

`⌘K` or `/` searches · `↑` `↓` move · `enter` opens · `esc` closes. In the Mac app, `⌘1` is the
garden, `⌘2` the catalogue, `⌘[` goes back.

## It moves on its own

`/api/watch` is server-sent events over `fs.watch`, with a 15-second poll as backstop. A write
anywhere in memory or the glossary refetches and the graph grows **in place** — node objects
are reused, so the simulation keeps its positions and only new stones drift in. Memory
auto-commits hourly and seven scheduled agents write into it, so this happens unattended.
The colophon says `watching disk` until it does, then `the garden moved`.

## Part of the constellation

niwa is one instrument of several built under the Center for Applied Post-Phenomenology
([postphenom.com](https://postphenom.com)), which asks what a tool does to the thing it
measures. The published siblings are [kiku](https://github.com/pvcomms/kiku), which reads
anything readable aloud on your own machine, and
[interactive-venn-template](https://github.com/pvcomms/interactive-venn-template). Two others,
terra-cognita and chronology, are still local and unpublished. They share a set of rules
rather than any code: personal data stays on the machine that made it, flat files are the
database, and the tool surfaces rather than decides — nothing here ranks a person's ideas for
them or tells them what to write next.

## Contributing

`CONTRIBUTING.md` for how work is specified and what the privacy rules are. `AGENTS.md` is the
contract for a coding agent, `docs/ARCHITECTURE.md` is the map, and `docs/features/` holds one
file per piece of work.

## License

MIT. See `LICENSE`.
