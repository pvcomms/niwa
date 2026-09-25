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

**2026-09-24 — The way asks a model, and the model is the one on this machine.**
Think Forward-Reverse ran on Gemini through a serverless function and scored each step's
confidence. Moving it into the garden meant deciding whether the garden may talk to a model at
all. It may, under two conditions the constellation already states: the host is named, and
the tool never decides. The host is Ollama at `127.0.0.1:11434` — the reader's own machine,
`NIWA_OLLAMA` to point elsewhere knowingly — and the model `qwen3.6:35b-a3b` with thinking
off, which answers a schema'd ask in about eight seconds; gpt-oss returned nothing under JSON
mode and was not chosen. What comes back is a proposal: capped, dated inside the way, lanes
checked against the reader's own, folded in as `proposed` and hollow until kept. No
confidence numbers cross over, because a number on a step is a grade. A deployed garden has
no model and says so rather than reaching for one.

---

**2026-09-24 — Standing at the then is a mode with a way back, not the instrument's home.**
The reader asked for a mode where the brain feels already at the destination. The technique
is real — prospective hindsight makes an outcome's causes easier to name — and so is its
failure: positive fantasy alone drains the effort it seems to summon. So the then is written
in the present tense and the desk counts the sentences that still look ahead; the memoir is
one chip away and says, at its foot, to stay a minute and go back to the steps; and the
obstacles with their when–then plans are on the same sheet as the picture, because they are
what turns it into effort.

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

---

**2026-09-24 — The world is offered, never imposed, and letting it in makes it yours.**
A life is lived under conditions, and the ask was to place events in context — the pandemic,
ChatGPT — so a reader can judge associations for themselves. Shipping a list of public
happenings looks like the tool deciding what mattered. It is not, provided three things hold:
the list is drawn faintly and separately from the reader's own entries; nothing enters the
record until the reader clicks; and what enters is an ordinary entry in their own file,
tagged `world:<id>` only so the sheet knows not to offer it twice, which they can retitle,
move or take back. The reading counts them but never weighs them. Dates are the commonly
recorded ones; a reader who remembers otherwise writes it as they remember it.

---

**2026-09-24 — Associations are threads the reader draws, with four plain verbs.**
The instrument can show what sat beside what — plumb lines through every lane, a list of what
fell within a year — and stop there. Whether one thing led to another is a claim only the
reader can make, so a thread is drawn by hand from one entry to another with one of four
verbs — *led to*, *echoed*, *cut against*, *alongside* — and kept in the entry's own file. No
thread is proposed, none is scored, and the verbs are few on purpose: a richer vocabulary
would start to look like an ontology the tool was asking the reader to fill.

---

**2026-09-24 — Another life is a folder of the same shape, laid alongside read-only.**
The long ask is for people to enter one another's perceived experience. The first honest step
is the smallest: a second life is the same files — `life.json` and `entries/` — dropped under
`others/<name>/`, drawn beneath the reader's own line in their words, never merged and never
edited here. Relations are computed across the two lines the same way as within one. The
specimen serves as the first other, so the mechanism is visible before anyone shares a folder.
Comparing accounts of a shared event, and the consent that needs, is a later feature.

---

**2026-09-24 — The margin is on every view, and a note is filed by what was on the desk.**
An aside is lost if it has to wait for a form, so the margin is one tab at the edge of every
view rather than a page to go to, and the thing it is about is not asked for: each view
already knows what the reader picked, and puts it down for the margin to read. A note is
kept with that, the view, and the view's whole address — enough to go back to where it was
said. Nothing summarises, tags or ranks the notes; the reading counts. A voice note is only
ever written out on the reader's press, through the speech server already on this machine,
because a transcript is a model's proposal and the reader can correct it.

---

**2026-09-24 — The provenance holds the chain of custody; it is not an oracle of truth.**
The ask was an epistemic provenance: how do I know what I know, what is my belief mediated
through, how did the idea spread and who is spreading it across the public square, what are
their incentives, am I being fed a reframe — and a protocol whose objectivity "cannot be
disputed". Two parts of that no local instrument can do honestly. It cannot read the public
square: the garden makes one network call, on a press, to a host the reader pasted, and
crawling platforms would make it a different tool with a different privacy. And it cannot
grade a claim true or false: a truth score is a verdict the constellation forbids, and an
instrument that issued one with a straight face would be a horoscope. What a person *can*
know is the chain of custody — the hands a claim passed through before it reached them —
and that is what the view holds: each hand's channel, day, wording, link, what it gains,
what it runs on, its record, and the reader's own mark on whether the wording turned there.
The undisputable part is the record, not the claim: dated, quoted, drawn solid only where a
link was read once or the reader's own eyes were the channel, hollow everywhere else, so
the sheet cannot show more certainty than was earned. The wordings are compared as words
and the census counts the usual ones, which is checkable in the source; the interests are
what the reader wrote. The model on this machine is asked what to ask and what would settle
it, and its schema pins every answer to a hand that exists; it is never asked whether the
claim is so, and if it said so anyway the desk has nowhere to put it.

---

**2026-09-25 — The notice says the rule to the person it protects, and the round is one way, not the way.**
Every entry above since the bearing ends the same way: it surfaces, it never scores; the
reader's marks drew the line. The rule was written down eleven times and shown to the reader
nowhere — the README is on GitHub, and a masthead says what its view does, not what the whole
is for. The ask was for clear instructions, and for the reader to exercise their own
judgment: a tool to overthink with, on purpose, so as to come away with something informed
and grounded. So the notice is a twelfth view and its first paragraph is the stance, not the
manual. Overthinking is what a decision does with nowhere to go; the garden gives it
somewhere to go and something to check against, which is the reader's own record — dated,
counted, drawn hollow where unchecked — and the judgment stays theirs, said in the third
sentence rather than the last. The manual follows: one way round, ten steps, each an *if*
that names a view, because a reader holding a decision should not have to guess which sheet
it belongs on. It is one way and says so — the steps that apply, in any order, skip the
rest — since a tool that prescribed the order of thinking would be deciding after all. The
text is a content file the reader can rewrite, and the test keeps it honest in two
directions: a view with no card fails it, and so does a notice that stops saying, in so many
words, that it will not score, recommend, or say what is true.

---

**2026-09-25 — The oblique deals from the reader's decks and from the garden; Eno and Schmidt's deck stays theirs.**
The ask was Oblique Strategies inside the garden — a card, a click, a reframe — and the form
is worth having: an instrument that says nothing about the problem and still moves it. Two
decisions. First, the card texts of the 1975 deck are Eno and Schmidt's, and this repository
is public, so the garden does not ship them; it ships a starter deck in its own words and a
deck that is a markdown file the reader writes, one card per paragraph, into which a reader
who owns the deck may type whatever they like. Second, and the reason it belongs here rather
than in a browser tab: the garden already knows things about the reader that no printed deck
can — which stones have lain fallow, which ideas were named and never written, which terms
are theirs, what they said their values were, what they touched this week — and each of
those is a prompt when turned into one. So the garden deals too, and says which stone the
card came from, one press away. Every source is in the shuffle until struck, because a deck
that pre-selected would be the tool choosing; the deal is a seeded shuffle with no repeats,
because a card that keeps coming back looks like advice. The card is put on the desk so the
margin, not a new store, keeps what it turned up. Nothing ranks a card, and the sheet never
says what one means.
