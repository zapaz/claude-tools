# claude-switch

## Goal

Manage 2 Claude Pro accounts instead of 1 Claude Max account — if you don't reach half of Max limit, that's twice cheaper.

## What it does

- Multi-account switcher for Claude Code on macOS.
- Launch Claude Code with any profile.
- Stores Claude Code tokens in the macOS Keychain
- Already supports mixing account tiers (e.g. 1 Pro + 1 Max),
- Will be extended to multiple accounts.

## Architecture

- **Single bash script**: `scripts/claude-switch`
- **Keychain-based**: tokens stored via `security` CLI — nothing on disk
- **Token refresh**: after a session, if Claude Code refreshed the token, the new value is saved back to the profile's Keychain entry
- **Inline Python**: `python3` used for JSON parsing / token preview (no external dependencies beyond macOS defaults)

## Key constants

- `CC_SERVICE="Claude Code-credentials"` — the Keychain entry Claude Code reads
- `PREFIX="claude-switch"` — prefix for profile Keychain entries (`claude-switch-profile-1`, `claude-switch-profile-2`)

## Commands

```
claude-switch setup 1|2      # capture current Keychain token for a profile
claude-switch 1|2 [args...]  # launch Claude Code with chosen profile
claude-switch status          # show which profiles are configured / active
claude-switch export 1|2     # print token as JSON (debug)
claude-switch clean           # remove claude-switch Keychain entries
```

## Install & test

```bash
chmod +x scripts/claude-switch
cp scripts/claude-switch /usr/local/bin/claude-switch
```

To test: run `claude-switch status` — should show both profiles as "not configured" on a fresh install.

## Conventions

- macOS-only (requires `security` CLI)
- Bash with `set -euo pipefail`
- Colored output helpers: `info`, `ok`, `warn`, `error`
- No external dependencies beyond macOS defaults (Bash, python3, security)
