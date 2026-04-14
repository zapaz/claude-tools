#!/usr/bin/env bash
# Installe clautty.sh dans /usr/local/bin comme `clautty`, avec raccourci `cl`.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$DIR/clautty.sh"
DEST="/usr/local/bin/clautty"
SHORTCUT="/usr/local/bin/cl"

if [[ ! -x "$SRC" ]]; then
    echo "Erreur: $SRC introuvable ou non exécutable" >&2
    exit 1
fi

ln -sfn "$SRC"  "$DEST"
ln -sfn "clautty" "$SHORTCUT"
echo "Installé: $DEST -> $SRC"
echo "Raccourci: $SHORTCUT -> clautty"
