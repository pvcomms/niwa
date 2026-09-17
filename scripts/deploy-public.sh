#!/bin/bash
# Deploys the PUBLIC garden. Re-bakes the snapshot, re-runs the tripwire audit,
# and refuses to ship anything that is not explicitly marked public.
set -euo pipefail

cd "$(dirname "$0")/.."
set -a; . "$HOME/.config/inbox-triage.env"; set +a
export VERCEL_TOKEN="$VERCEL_TOKEN_NEW"

echo "→ baking public snapshot"
node --experimental-strip-types scripts/snapshot.mjs public

# Belt and braces: the audit already ran inside the snapshot script, but the file
# on disk is what actually ships, so check the artefact itself.
node -e '
const g = require("./data/garden.json");
if (g.stats.mode !== "public") {
  console.error("REFUSING: data/garden.json is mode=" + g.stats.mode + ", not public");
  process.exit(1);
}
const kinds = new Set(g.nodes.map(n => n.kind));
for (const k of ["user", "feedback", "reference", "routine", "meta", "agent", "note", "ghost"]) {
  if (kinds.has(k)) {
    console.error("REFUSING: private node kind present: " + k);
    process.exit(1);
  }
}
console.log("artefact check: " + g.nodes.length + " public stones, no private kinds");
'

echo "→ deploying"
# --name was removed from the modern CLI; the project is chosen by linking.
vercel link --yes --scope center-for-applied-post-phenomenology --project niwa-public

vercel deploy --prod --yes --scope center-for-applied-post-phenomenology \
  --env NIWA_MODE=public \
  --build-env NIWA_MODE=public
