#!/bin/bash
# =============================================================================
# install.sh — Install statusline-advanced for Claude Code
# =============================================================================
#
# Copies the script to ~/.claude/ and configures settings.json to use it.
#
# Usage:
#   ./install.sh
#
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE="${SCRIPT_DIR}/statusline-advanced.sh"
DEST_DIR="${HOME}/.claude"
DEST="${DEST_DIR}/statusline-advanced.sh"
SETTINGS="${DEST_DIR}/settings.json"

RED=$'\033[0;31m' GREEN=$'\033[0;32m' YELLOW=$'\033[1;33m'
CYAN=$'\033[0;36m' NC=$'\033[0m'

info()  { echo "${CYAN}ℹ${NC}  $*"; }
ok()    { echo "${GREEN}✓${NC}  $*"; }
warn()  { echo "${YELLOW}⚠${NC}  $*"; }
error() { echo "${RED}✗${NC}  $*" >&2; }

[[ ! -f "$SOURCE" ]] && { error "Source not found: ${SOURCE}"; exit 1; }

# Check for jq
if ! command -v jq &>/dev/null; then
    error "jq is required but not installed. Install it with: brew install jq"
    exit 1
fi

echo ""
info "Installing statusline-advanced to ${CYAN}${DEST}${NC}"
echo ""

# Copy script
mkdir -p "$DEST_DIR"
cp "$SOURCE" "$DEST"
chmod +x "$DEST"
ok "Copied script to ${CYAN}${DEST}${NC}"

# Update settings.json
if [[ -f "$SETTINGS" ]]; then
    # Check if statusLine.command is already set
    existing=$(jq -r '.statusLine.command // empty' "$SETTINGS" 2>/dev/null)
    if [[ -n "$existing" && "$existing" != "$DEST" ]]; then
        warn "Existing statusLine command: ${CYAN}${existing}${NC}"
        read -rp "   Overwrite? [y/N]: " confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            info "Settings unchanged. To configure manually, add to ${CYAN}${SETTINGS}${NC}:"
            echo "   \"statusLine\": { \"type\": \"command\", \"command\": \"${DEST}\" }"
            echo ""
            exit 0
        fi
    fi
    # Merge statusLine into existing settings
    tmp=$(mktemp)
    jq --arg cmd "$DEST" '.statusLine = {"type": "command", "command": $cmd}' "$SETTINGS" > "$tmp" && mv "$tmp" "$SETTINGS"
else
    # Create new settings file
    jq -n --arg cmd "$DEST" '{"statusLine": {"type": "command", "command": $cmd}}' > "$SETTINGS"
fi
ok "Configured ${CYAN}${SETTINGS}${NC}"

echo ""
ok "Done! Restart Claude Code to use the new status line."
echo ""
