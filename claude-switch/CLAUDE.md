# claude-switch — dev notes

See [README.md](README.md) for user-facing install & usage.

## Architecture

- **Single bash script**: `claude-switch/claude-switch`
- **Keychain-based**: tokens stored via `security` CLI — nothing on disk
- **Token refresh**: after a session, if Claude Code refreshed the token, the new value is saved back to the subscription's Keychain entry
- **Inline Python**: `python3` used for JSON parsing, token preview, plan detection (no external dependencies beyond macOS defaults)

## Key constants

- `CC_SERVICE="Claude Code-credentials"` — the Keychain entry Claude Code reads
- `PREFIX="claude-switch"` — prefix for subscription Keychain entries (`claude-switch-subscription-1`, `claude-switch-subscription-2`, ...)
- `META_SERVICE="claude-switch-meta"` — Keychain entry storing subscription metadata as JSON

## Subscription meta registry

Subscription labels are stored in a single Keychain entry (`claude-switch-meta`) as JSON:

```json
{"1":"Pro","2":"Max 5x","3":"Team"}
```

Functions: `meta_read`, `meta_write`, `meta_set`, `meta_remove`, `meta_next`, `meta_subscriptions`, `meta_get_label`.

All Python calls use `sys.argv` for safe parameter passing (no shell interpolation).

## Conventions

- macOS-only (requires `security` CLI)
- Bash with `set -euo pipefail`
- Colored output helpers: `info`, `ok`, `warn`, `error`
- No external dependencies beyond macOS defaults (Bash, python3, security)
- Bump `VERSION` when editing the script (patch for fixes, minor for features)
