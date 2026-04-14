#!/usr/bin/env bash
# Compile clautty.applescript en Clautty.app et (optionnellement) l'installe dans /Applications.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$DIR/clautty.applescript"
OUT="$DIR/Clautty.app"

osacompile -o "$OUT" "$SRC"
echo "Compilé: $OUT"

if [[ "${1:-}" == "--install" ]]; then
    rm -rf "/Applications/Clautty.app"
    cp -R "$OUT" "/Applications/Clautty.app"
    echo "Installé: /Applications/Clautty.app"
fi
