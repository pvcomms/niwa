# Decisions

Append-only. Newest last. One entry per decision that would otherwise be re-litigated.

---

**2026-09-17 — The garden is local-only.**
It reads memory, the vault and the code tree at request time. Everything it renders is
private by construction. Reachability from other devices is `tailscale serve` plus a
LaunchAgent, not a host.

---

**2026-09-17 — Colour lives in TypeScript, not CSS.**
three.js sets materials from JS. A palette defined only in CSS silently desynced on theme
change. `lib/palette.ts` is now the single source and feeds both the `<style>` block in
`layout.tsx` and every material.

---

**2026-09-17 — Four kinds of thread, not one.**
A written `[[wikilink]]` is only one way two things relate. Shared vocabulary (a glossary
term _practised_ in a note), a pointer at real code on disk, and an unplanted link to
something that does not exist are each real relations and each render differently. The ghost
stone — an idea named often enough to link to and never written down — is the most valuable
of the four and was the reason for the feature.

---

**2026-09-17 — One-word glossary terms must be capitalised to match.**
Case-insensitive matching on single words made `keep`, `edge` and `still` link everything to
everything. Multi-word terms stay case-insensitive. `lib/garden.test.ts` guards this.

---

**2026-09-18 — The private deployment is deleted, permanently.**
A password-gated Vercel deployment of the full garden existed. It was deleted at Param's
instruction. The full garden stays on the machine; only the audited public snapshot ships.
`scripts/deploy-private.sh` is retained as a record of what was removed, not as a path to
re-enable it.

---

**2026-09-18 — The public seam is two independent checks, on purpose.**
`lib/publish.ts` projects topology without strings, and `scripts/deploy-public.sh` then
audits the baked artefact on disk for `mode: "public"` and for the absence of private node
kinds. The redundancy is deliberate: the second check tests the file that actually ships
rather than the code believed to have produced it.

---

**2026-09-18 — `middleware.ts` became `proxy.ts`.**
The gate was silently breaking local dev. It is now a no-op unless `NIWA_PASSWORD` is set,
which keeps dev and the public build open while the gate still exists for any future private
context.

---

**2026-09-19 — Doc set adopted.**
Repo joined the `CAPP` constellation standard: `AGENTS.md`, `docs/ARCHITECTURE.md`, this
file, `docs/TEMPLATE.md`, `docs/features/`. `~/work/capp/spine/bin/scan.py` reports on it.

---

**2026-09-19 — The health disclosures leave the public allowlist.**
`content/public.ts` named one health condition three times: in a course blurb, in the reason a
concept was withheld, and in the audit exception that let the blurb past the health tripwire.
Two of those were arguments that the disclosure was already public elsewhere. That reasoning
is sound and still the wrong default: a graph that aggregates is exactly the artefact where
"already public somewhere" stops being true. The course keeps its entry with a neutral
description, and the exception is deleted, so that node is now guarded by the tripwire like
every other. The tripwire regexes and the synthetic fixtures that prove they fire are
unchanged.

---

**2026-09-19 — The LaunchAgent is a template, not a plist.**
`scripts/com.param.niwa.plist` hardcoded one home directory six times. Copied by anyone else
it produced an agent pointing at a user who does not exist, failing quietly at login. It is
now `com.param.niwa.plist.template` with `__HOME__`, `__ROOT__` and `__NODE__`, filled in by
`scripts/install-launchd.sh` from the running shell. Keeping the checked-in file unusable as
written is the point: the previous version was copyable and wrong.

---

**2026-09-19 — `"type": "module"` is deferred to a spec, not done in passing.**
Every test run prints a warning asking for it. Adding it changes how Node parses every file in
the repository, including `next.config.ts`, `postcss.config.mjs` and the `scripts/*.mjs`, so
it is a behaviour change wearing the costume of a one-line cleanup. It is written up as
`docs/features/004-esm-and-package-manager.md` with its own acceptance check.

---

**2026-09-24 — The garden writes one thing: a decision set down on the bearing.**
Until now the running app wrote nothing, and `data/garden.json` was baked by a script. The
bearing needs a decision to still be there tomorrow, and the constellation's rule is flat
files, so each is one markdown file in the vault (`content/bearing/<slug>.md`: title,
date, where it sits, where it leads, the note as the body). `POST` and `DELETE /api/bearing`
are the only writes, they are refused under `NIWA_MODE`, and the values themselves are
read-only from `values.json` — the file is the editor.

---

**2026-09-24 — The bearing surfaces; it never scores.**
A values instrument that graded a decision would be a recommendation engine wearing the
reader's conscience. The sheet prints which values a placement sits in, which it leaves
untouched, what the reader named that region, and what they have written about each value.
The placement itself is the reader's judgment, made by hand. No number, no arrow that means
"better", no ranking of decisions against each other.

---

**2026-09-24 — The values file is edited in the page, and still a file.**
The first cut made `values.json` hand-edit only. That is honest and unkind: naming a region
means leaving the sheet, finding a key like `privacy+taste`, and coming back. The editor on
the desk writes the same file, pretty-printed, after a short pause, and the sheet redraws on
every keystroke. The file stays the source: it can be edited by hand, diffed, and carried to
another machine, and the page reads it fresh on load. No second store.

---

**2026-09-24 — The distribution measures words, not meaning, and says so.**
The garden's taste as a curve needs a likeness between texts. An embedding model would be
a dependency with a network call or a download, and a black box under a page whose whole
argument is that the reader can check the instrument. tf-idf cosine over titles, tags and
first lines is thirty lines, runs on the machine, and is wrong in ways the kin list makes
visible. If it is ever replaced, the kin list stays.

---

**2026-09-24 — One network call, on a press, to the pasted host.**
Reading the page behind a link is the only time the running garden leaves the machine. It
happens only when the reader presses "read the page", only to the host they pasted, and
only to boil the page down to a title and its first words. The spec names it; nothing else
fetches.

---

**2026-09-24 — No Japanese or Chinese characters anywhere in niwa.**
The garden, catalogue, bearing and the app's name carried glyphs — 庭, 目録, 指針 — as
titles. Param asked for them gone: the tool is his and the words should be his. The views
are named in English, the masthead reads `niwa` with the view's name under it, the app is
`niwa.app`, and its icon is a drawn ring with one rust stone instead of a glyph. This entry
is the one place the old glyphs remain, as the record of what was removed.

---

**2026-09-24 — Themes come from the garden's own likeness matrix, not a model.**
Word overlap missed the obvious: "feed" and "algorithm" never matched. The fix that keeps
the instrument checkable and on the machine is latent semantic analysis on the likeness
matrix the distribution already computes — the top forty eigenvectors of the Gram matrix,
by orthogonal iteration, in eighty lines of TypeScript with no dependency. The themes are
whatever this garden's words co-occur as; they are not named, and a curve on them is
still a position. Words stay as the second measure so the two can disagree in the open.
One guard: a text the themes cannot hold (its projection shorter than 0.09, where the
garden's own stones sit at 0.08 at the least) gets no theme placement, because folding
a near-zero vector in and normalising it would place noise with a straight face — the
first alien text tried, a baking guide, came out 0.70 kin to an essay on work. It reads
on words instead, and the reading says why.

---

**2026-09-24 — Threads have a direction, and it is the one writing gives them.**
A written link, a name in prose and a seed all point from the note that made them to the
thing they point at, and the influence ran the other way: the thing fed the note. A term
practised in a note fed the note; a note that points at code fed the code; twins feed each
other. The flow reads the garden with that orientation and no other, so "what does this
rest on" is answered by the writing rather than by a hand-drawn portrait. Roots and reach
are read within two hops: at six, nearly every stone reaches nearly every other, which is
true of the garden and useless to a reader.

---

**2026-09-24 — The bricks are grey until the reader says; the course is drawn from the marks.**
The site's fifth figure pre-labels its inputs signal and noise, and its own audit calls that
the hole: you never know what an input was worth until after it has bent you. In the garden
the inputs to any stone have already hit — they are the threads that flow into it, each with
the day it entered — so the fix the audit asked for can be literal: lay them in order, keep
them grey, and let the reader mark each one *toward* or *away* after the fact. The tool holds
and draws the marks and reads the counts back; it never suggests a mark, never weighs an
input by kind or age, and never shows the angle as a number — the site's degree was physics,
and here a number on the course would be a grade. The question the belief is trying to get
right is a line the reader puts in words; re-putting it keeps the old phrasing with its day,
so the target drifts the way the site's does, but because the reader moved it and the trail
says when.

---

**2026-09-24 — An input is dated by the day it arrived in the belief, read from git; the input's own date only when the record cannot say.**
The course's spine is the order the inputs came, and the garden's nearest date for that
— the day the input itself last changed — is the wrong event: a reading last touched in
September may have hit the belief in July. The belief's file has a history, because every
source the garden reads is a git repository, and the first commit in which an input's name
appears in that file is the day it actually arrived. That is what the sheet uses, marked
with a dot, and the card says _arrived_. Two cases cannot be dated this way and are not
pretended to be: a file with no history, and a name already present in the first commit on
record, which says only that it came before the record begins. Those keep the input's own
date and the card says _changed_. The same history gives the days the belief was steered.
The whole of it is `git log` on this machine; nothing is written to any repository.

---

**2026-09-24 — The chronology moves into the garden; the standalone stays as the specimen's home.**
The standalone number line (pvcomms/chronology) argued that a life has structure, conjuncture
and event layers and that self-narration collapses them into one. It could not load a person's
own dated notes, could not be edited in the page, could not zoom, and had nowhere to keep
anything — its own four specs. The garden already has flat files beside the vault, a desk that
writes them, stones an entry can be bound to, and, because it reads dated notes, a record of
which days the reader's writing speaks of. So the instrument moves in as the seventh view and
the four specs are met here: entries are markdown files with absolute dates at whatever
precision the reader knows, the desk sets down and edits, the wheel zooms, and the slug is a
stable id in the address. The standalone keeps its synthetic life, which the deployed garden
now serves read-only so a stranger can learn the instrument. Nothing seeds the reader's life
from memory: the garden strip shows every day the notes speak of, and which of them were
events is the reader's to say.

---

**2026-09-24 — A day is placed at the middle of the period it names, and its precision is drawn.**
Life events are rarely known to the day. Forcing a full date invents one; refusing coarse
dates loses the event. So a day is a string at year, month or day precision, placed at the
middle of its period and drawn with a whisker across it, and written back as `c. 2011`. The
one place this bites is the record's first age: taken at the middle of a coarse year, so a
life born in May 2001 whose first entry is `2001` reads _from age 0_, not _before you were
born_.

---

**2026-09-24 — The alarm never decides whether a pathway will set the reader off; the reader's marks draw the line, and the toy body is a toy.**
The ask was an instrument to tell whether a decision will activate a person's defence and
coping mechanisms and put their nervous system on the hypervigilant road. No instrument can
know that about a person, and one that pretended to would be a horoscope. What it can do is
hold what the person knows about themselves — the triggers they have named and how hard each
hits, the defences that fire and what they cost, the brakes that work and how fast, how
loaded they are today — and let a pathway be marked against exactly that. The line the sheet
draws is the marks added up: charge times dose up, reach times room down, nothing weighted by
the tool. The run is the sandbox's physics, kept unchanged and named as a toy on the sheet,
driven by the person's own cues and braked by the person's own brakes. _How it went_ is asked
after the fact and counted; it is never turned into a score of the person's forecasts,
because a person learning their own alarm does not need a grade for it.
