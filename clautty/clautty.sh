#!/usr/bin/env bash
# clautty — wrapper CLI qui délègue à clautty.applescript (source unique).
# Usage:
#   clautty           # claude local à gauche, shell vide à droite
#   clautty runbot    # ssh runbot claude à gauche, ssh runbot à droite
#
# `load script` exige un .scpt compilé ; on le recompile à la demande si la
# source a changé (ou si le cache est absent).
set -euo pipefail

SCRIPT="${BASH_SOURCE[0]}"
while [ -L "$SCRIPT" ]; do
    LINK_DIR="$(cd -P "$(dirname "$SCRIPT")" && pwd)"
    SCRIPT="$(readlink "$SCRIPT")"
    [[ $SCRIPT != /* ]] && SCRIPT="$LINK_DIR/$SCRIPT"
done
DIR="$(cd -P "$(dirname "$SCRIPT")" && pwd)"

SRC="$DIR/clautty.applescript"
CACHE="${TMPDIR:-/tmp}/clautty.scpt"
if [[ ! -f "$CACHE" || "$SRC" -nt "$CACHE" ]]; then
    osacompile -o "$CACHE" "$SRC"
fi

TARGET="${1:-}"
exec osascript \
    -e "tell (load script POSIX file \"$CACHE\") to doClautty(\"$TARGET\")"
