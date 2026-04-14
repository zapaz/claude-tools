#!/usr/bin/env bash
# cl — Ghostty split: Claude (left) + Shell/SSH (right)
# Fenêtre fixe carrée 1000x1000
#
# Requiert Ghostty 1.3+ et `claude` dans le PATH (local et distant).
#
# Usage:
#   ./cl              # left = local claude, right = local shell
#   ./cl runbot       # left = ssh -t runbot claude, right = ssh runbot

SSH_TARGET="${1:-}"

if [[ -n "$SSH_TARGET" ]]; then
    LEFT_CMD="ssh -t ${SSH_TARGET} -- '\$SHELL -lic claude'"
    RIGHT_CMD="ssh ${SSH_TARGET}"
else
    LEFT_CMD="claude"
    RIGHT_CMD=""
fi

RIGHT_BLOCK=""
if [[ -n "$RIGHT_CMD" ]]; then
    RIGHT_BLOCK=$(cat <<RIGHTEOF
    input text "${RIGHT_CMD}" to rightPane
    send key "enter" to rightPane
RIGHTEOF
)
fi

osascript <<EOF
tell application "Ghostty"
    activate

    set win to new window
    set leftPane to terminal 1 of selected tab of win
    set rightPane to split leftPane direction right

    input text "${LEFT_CMD}" to leftPane
    send key "enter" to leftPane

    ${RIGHT_BLOCK}

    focus leftPane
end tell

tell application "System Events"
    tell process "Ghostty"
#        set position of front window to {100, 100}
        set size of front window to {1400, 1000}
    end tell
end tell
EOF
