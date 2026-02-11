#!/bin/bash
# =============================================================================
# install.sh — Install claude-switch to /usr/local/bin
# =============================================================================
#
# Usage:
#   ./scripts/install.sh            Interactive: choose name(s)
#   ./scripts/install.sh --short    Non-interactive: install as "ccs"
#   ./scripts/install.sh -s         Same as --short
#
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE="${SCRIPT_DIR}/claude-switch"
DEST_DIR="/usr/local/bin"

RED=$'\033[0;31m' GREEN=$'\033[0;32m' YELLOW=$'\033[1;33m'
CYAN=$'\033[0;36m' NC=$'\033[0m'

info()  { echo "${CYAN}ℹ${NC}  $*"; }
ok()    { echo "${GREEN}✓${NC}  $*"; }
error() { echo "${RED}✗${NC}  $*" >&2; }

[[ ! -f "$SOURCE" ]] && { error "Source not found: ${SOURCE}"; exit 1; }

install_as() {
    local name="$1"
    local dest="${DEST_DIR}/${name}"
    sudo cp "$SOURCE" "$dest"
    sudo chmod +x "$dest"
    ok "Installed ${CYAN}${dest}${NC}"
}

if [[ "${1:-}" == "--short" || "${1:-}" == "-s" ]]; then
    install_as "ccs"
else
    echo ""
    echo "Install claude-switch to ${CYAN}${DEST_DIR}${NC}"
    echo ""
    echo "  1) claude-switch   (default)"
    echo "  2) ccs             (short alias)"
    echo "  3) both"
    echo ""
    read -rp "Choice [1]: " choice
    choice="${choice:-1}"

    case "$choice" in
        1) install_as "claude-switch" ;;
        2) install_as "ccs" ;;
        3) install_as "claude-switch"; install_as "ccs" ;;
        *) error "Invalid choice"; exit 1 ;;
    esac
fi

echo ""
