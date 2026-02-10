# claude-switch

## Goal

Manage multiple Claude Code accounts across subscription tiers from a single Mac — unlimited profiles with subscription labels.

## What it does

- Multi-account switcher for Claude Code on macOS
- **Unlimited profiles** with auto-incrementing IDs
- **Subscription labels** (Pro, Max 5x, Team, etc.) stored per profile
- **Auto-detection** of subscription tier from token, with fallback to manual input
- Launch Claude Code with any profile
- Stores tokens in the macOS Keychain — nothing on disk
- Profile metadata (labels) stored as JSON in a separate Keychain entry

## Architecture

- **Single bash script**: `scripts/claude-switch`
- **Keychain-based**: tokens stored via `security` CLI — nothing on disk
- **Token refresh**: after a session, if Claude Code refreshed the token, the new value is saved back to the profile's Keychain entry
- **Inline Python**: `python3` used for JSON parsing, token preview, plan detection (no external dependencies beyond macOS defaults)

## Key constants

- `CC_SERVICE="Claude Code-credentials"` — the Keychain entry Claude Code reads
- `PREFIX="claude-switch"` — prefix for profile Keychain entries (`claude-switch-profile-1`, `claude-switch-profile-2`, ...)
- `META_SERVICE="claude-switch-meta"` — Keychain entry storing profile metadata as JSON

## Profile meta registry

Profile labels are stored in a single Keychain entry (`claude-switch-meta`) as JSON:

```json
{"1":"Pro","2":"Max 5x","3":"Team"}
```

Functions: `meta_read`, `meta_write`, `meta_set`, `meta_remove`, `meta_next`, `meta_profiles`, `meta_get_label`.

All Python calls use `sys.argv` for safe parameter passing (no shell interpolation).

## Subscription plans

Labels for auto-detection:

| Plan | Label |
|------|-------|
| Free | Free |
| Pro ($20/month) | Pro |
| Max 5x ($100/month) | Max 5x |
| Max 20x ($200/month) | Max 20x |
| Team ($25/seat/month) | Team |
| Enterprise (custom) | Enterprise |
| Education (university) | Education |

## Commands

```
claude-switch setup [N]      # capture current token (auto-assigns N if omitted)
claude-switch N [args...]    # launch Claude Code with profile N
claude-switch status         # show which profiles are configured / active
claude-switch export N       # print token as JSON (debug)
claude-switch clean          # remove claude-switch Keychain entries
```

## Install

```bash
# Interactive — choose name(s): claude-switch, css, or both
./scripts/install.sh

# Non-interactive — install as "css" only
./scripts/install.sh --short
```

Both install to `/usr/local/bin` via `sudo cp`.

## Quick start

```bash
chmod +x scripts/claude-switch
./scripts/install.sh

# Setup profiles
claude → /login account-A → quit → claude-switch setup       # auto-assigns 1, detects plan
claude → /login account-B → quit → claude-switch setup       # auto-assigns 2
claude → /login account-C → quit → claude-switch setup 5     # explicit slot 5

# Use
claude-switch 1    # launches with profile 1 (Pro)
claude-switch 2    # launches with profile 2 (Max 5x)
claude-switch status
```

## Conventions

- macOS-only (requires `security` CLI)
- Bash with `set -euo pipefail`
- Colored output helpers: `info`, `ok`, `warn`, `error`
- No external dependencies beyond macOS defaults (Bash, python3, security)
- Legacy profiles (from v1 with hardcoded 1|2) detected in `status` with a migration hint
