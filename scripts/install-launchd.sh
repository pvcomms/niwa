#!/bin/bash
# Installs the niwa LaunchAgent for whoever runs it: fills the template with this
# machine's home directory, this clone's path and this shell's node, writes the
# plist into ~/Library/LaunchAgents, and starts it.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"

LABEL="com.param.niwa"
TEMPLATE="$ROOT/scripts/$LABEL.plist.template"
DEST="$HOME/Library/LaunchAgents/$LABEL.plist"

NODE="$(command -v node)" || { echo "node is not on PATH" >&2; exit 1; }
[ -x "$ROOT/node_modules/next/dist/bin/next" ] || {
  echo "no next binary in $ROOT/node_modules — run pnpm install first" >&2
  exit 1
}

mkdir -p "$HOME/Library/LaunchAgents"
sed -e "s|__HOME__|$HOME|g" -e "s|__ROOT__|$ROOT|g" -e "s|__NODE__|$NODE|g" \
  "$TEMPLATE" >"$DEST"
echo "wrote $DEST"

# bootstrap is the modern verb; load is what older macOS has. Either failing
# usually means the agent is already installed and running.
if launchctl bootstrap "gui/$(id -u)" "$DEST" 2>/dev/null; then
  echo "bootstrapped $LABEL"
elif launchctl load "$DEST" 2>/dev/null; then
  echo "loaded $LABEL"
else
  echo "$LABEL was already loaded; run 'launchctl kickstart -k gui/$(id -u)/$LABEL' to restart it"
fi

launchctl list | grep "$LABEL" || echo "not running — see $HOME/Library/Logs/niwa.log"
