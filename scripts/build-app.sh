#!/bin/bash
# Builds niwa.app and installs it. The app is only a window onto the launchd
# stand (com.param.niwa); it holds no data of its own.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
BUILD="${TMPDIR:-/tmp}/niwa-app-build"
APP="$BUILD/niwa.app"
DEST_APPS="/Applications/niwa.app"
DEST_DESK="$HOME/Desktop/niwa.app"

rm -rf "$BUILD"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

echo "→ compiling"
swiftc -O -o "$APP/Contents/MacOS/niwa" "$HERE/NiwaApp.swift" \
  -framework Cocoa -framework WebKit -target arm64-apple-macosx13.0

echo "→ icon"
swiftc -O -o "$BUILD/make-icon" "$HERE/make-icon.swift" -framework AppKit
"$BUILD/make-icon" "$BUILD/icon.png" >/dev/null
ICONSET="$BUILD/niwa.iconset"
mkdir -p "$ICONSET"
for s in 16 32 64 128 256 512 1024; do
  sips -z $s $s "$BUILD/icon.png" --out "$ICONSET/icon_${s}x${s}.png" >/dev/null 2>&1
done
# Retina variants are the @2x names, not separate art.
cp "$ICONSET/icon_32x32.png"     "$ICONSET/icon_16x16@2x.png"
cp "$ICONSET/icon_64x64.png"     "$ICONSET/icon_32x32@2x.png"
cp "$ICONSET/icon_256x256.png"   "$ICONSET/icon_128x128@2x.png"
cp "$ICONSET/icon_512x512.png"   "$ICONSET/icon_256x256@2x.png"
cp "$ICONSET/icon_1024x1024.png" "$ICONSET/icon_512x512@2x.png"
rm -f "$ICONSET/icon_64x64.png" "$ICONSET/icon_1024x1024.png"
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/niwa.icns"

echo "→ bundle"
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>niwa</string>
  <key>CFBundleDisplayName</key><string>niwa</string>
  <key>CFBundleIdentifier</key><string>com.param.niwa.app</string>
  <key>CFBundleExecutable</key><string>niwa</string>
  <key>CFBundleIconFile</key><string>niwa</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSHumanReadableCopyright</key><string>Param Vaswani — local only</string>
  <!-- The stand is plain http on loopback; ATS blocks that without an exception. -->
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsLocalNetworking</key><true/>
  </dict>
</dict>
PLIST
echo '</plist>' >> "$APP/Contents/Info.plist"

# Ad-hoc signature: unsigned bundles get killed on arm64.
codesign --force --deep --sign - "$APP" 2>/dev/null || true

echo "→ installing"
# Real copies in both places. A Finder alias needs automation permission this
# script does not have, and a failed one leaves a broken stub on the Desktop.
# Re-run this script to update both.
# The Desktop copy is only refreshed if it is still there — a rebuild should not
# put back one that was deliberately cleared away.
for dest in "$DEST_APPS" "$DEST_DESK"; do
  if [ "$dest" = "$DEST_DESK" ] && [ ! -e "$dest" ]; then continue; fi
  rm -rf "$dest"
  cp -R "$APP" "$dest"
  codesign --force --deep --sign - "$dest" 2>/dev/null || true
  echo "✓ $dest"
done
