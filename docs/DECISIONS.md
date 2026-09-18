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
Repo joined the `cfap` constellation standard: `AGENTS.md`, `docs/ARCHITECTURE.md`, this
file, `docs/TEMPLATE.md`, `docs/features/`. `~/Code/cfap/bin/scan.py` reports on it.
