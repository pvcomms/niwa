#!/bin/bash
# Deploys the PRIVATE garden — the whole thing, behind a password.
# Never run this without NIWA_PASSWORD set on the project, or memory goes public.
set -euo pipefail

cd "$(dirname "$0")/.."
set -a; . "$HOME/.config/inbox-triage.env"; set +a
export VERCEL_TOKEN="$VERCEL_TOKEN_NEW"

if [ -z "${NIWA_PASSWORD:-}" ]; then
  echo "REFUSING: NIWA_PASSWORD is not set in ~/.config/inbox-triage.env." >&2
  echo "The private garden contains the full memory corpus; it does not ship unguarded." >&2
  exit 1
fi

echo "→ baking private snapshot"
node --experimental-strip-types scripts/snapshot.mjs private

node -e '
const g = require("./data/garden.json");
if (g.stats.mode !== "private") {
  console.error("REFUSING: data/garden.json is mode=" + g.stats.mode);
  process.exit(1);
}
console.log("artefact check: " + g.nodes.length + " stones (full corpus)");
'

echo "→ deploying behind basic auth"
# --name was removed from the modern CLI; the project is chosen by linking.
vercel link --yes --scope center-for-applied-post-phenomenology --project niwa-private

vercel deploy --prod --yes --scope center-for-applied-post-phenomenology \
  --env NIWA_MODE=private \
  --env "NIWA_PASSWORD=$NIWA_PASSWORD" \
  --build-env NIWA_MODE=private


# Leave the working tree holding the PUBLIC snapshot again. Otherwise the full
# corpus sits in data/garden.json where a later commit — or a careless
# `vercel deploy` — would pick it up.
echo
echo "→ restoring the public snapshot to the working tree"
node --experimental-strip-types scripts/snapshot.mjs public >/dev/null
echo "   data/garden.json is public again"

echo
echo "Guarded by basic auth. Any username; the password is NIWA_PASSWORD."
