# claude-tools

Collection of utilities for Claude Code.

## Tools

- **claude-switch** — Multi-account switcher for Claude Code on macOS. Stores OAuth tokens in macOS Keychain and lets you launch Claude Code with any subscription. Supports multiple subscriptions of any type (Pro, Max 5x, Team, etc.) with auto-detection. See [CLAUDE-SWITCH.md](scripts/claude-switch/CLAUDE-SWITCH.md) for details.
- **statusline-advanced** — Advanced status line for Claude Code with smart directory display, rich git status indicators, model abbreviation, context usage bar with color coding, output style, and vim mode support. See [STATUSLINE-ADVANCED.md](scripts/statusline-advanced/STATUSLINE-ADVANCED.md) for details.

## Directory structure

```
scripts/
├── claude-switch/          # Multi-account switcher
│   ├── claude-switch       # Main script
│   ├── install.sh          # Installer
│   └── CLAUDE-SWITCH.md    # Documentation
└── statusline-advanced/    # Advanced status line
    ├── statusline-advanced.sh  # Main script
    ├── install.sh              # Installer
    └── STATUSLINE-ADVANCED.md  # Documentation
```

## Versioning

When modifying `scripts/claude-switch/claude-switch`, bump the `VERSION` variable (patch for fixes, minor for features).
