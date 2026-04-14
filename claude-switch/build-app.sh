#!/usr/bin/env bash
# Compile clautty.applescript en Clautty.app et (optionnellement) l'installe dans /Applications.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$DIR/clautty.applescript"
OUT="$DIR/Clautty.app"

rm -rf "$OUT"
osacompile -o "$OUT" "$SRC"

# Info.plist : identité stable pour TCC + nom affiché dans les prompts d'autorisation.
/usr/libexec/PlistBuddy -c "Add :CFBundleIdentifier string com.zapaz.clautty" "$OUT/Contents/Info.plist" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.zapaz.clautty" "$OUT/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Add :CFBundleDisplayName string Clautty" "$OUT/Contents/Info.plist" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Clautty" "$OUT/Contents/Info.plist"

if [[ -f "$DIR/clautty.icns" ]]; then
    cp "$DIR/clautty.icns" "$OUT/Contents/Resources/applet.icns"
    rm -f "$OUT/Contents/Resources/Assets.car"
fi

codesign --force --deep --sign - "$OUT"
echo "Compilé: $OUT"

if [[ "${1:-}" == "--install" ]]; then
    rm -rf "/Applications/Clautty.app"
    cp -R "$OUT" "/Applications/Clautty.app"
    codesign --force --deep --sign - "/Applications/Clautty.app"
    echo "Installé: /Applications/Clautty.app"
fi
