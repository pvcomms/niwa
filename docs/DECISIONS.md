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

