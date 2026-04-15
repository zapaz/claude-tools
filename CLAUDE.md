# claude-tools

Collection of utilities for Claude Code.

Every tool directory ships two docs:
- `README.md` — user-facing (install, usage, features).
- `CLAUDE.md` — developer / Claude Code notes (architecture, gotchas, conventions).

## Tools

- **claude-switch** — Multi-account switcher for Claude Code on macOS. Stores OAuth tokens in the macOS Keychain and lets you launch Claude Code with any subscription. See [claude-switch/README.md](claude-switch/README.md) · [claude-switch/CLAUDE.md](claude-switch/CLAUDE.md).
- **clautty** — Ghostty split launcher for Claude (local + ssh). Ships a CLI (`clautty`) and a `Clautty.app` applet for the Dock. See [clautty/README.md](clautty/README.md) · [clautty/CLAUDE.md](clautty/CLAUDE.md).
- **statusline-advanced** — Advanced status line with smart directory display, rich git status, context usage bar, output style and vim mode. See [statusline-advanced/README.md](statusline-advanced/README.md) · [statusline-advanced/CLAUDE.md](statusline-advanced/CLAUDE.md).

## Test project

- **test-project/** — "notable", a self-contained Python note manager. Used as a sandbox for exercising Claude Code features (editing, debugging, refactoring, tests, code review). See [test-project/README.md](test-project/README.md) · [test-project/CLAUDE.md](test-project/CLAUDE.md).

## Directory structure

```
claude-switch/              # Multi-account switcher
├── claude-switch           # Main script
├── install.sh              # Installer
├── README.md               # User doc
└── CLAUDE.md               # Dev / Claude Code notes
clautty/                    # Ghostty split launcher
├── clautty.sh              # CLI wrapper
├── clautty.applescript     # Shared AppleScript source (CLI + .app)
├── build-app.sh            # Builds Clautty.app
├── install.sh              # Installs the CLI
├── README.md
└── CLAUDE.md
statusline-advanced/        # Advanced status line
├── statusline-advanced.sh  # Main script
├── install.sh              # Installer
├── README.md
└── CLAUDE.md
test-project/               # Python sandbox project
├── src/notable/            # Library + CLI source
├── tests/                  # Pytest test suite
├── sample_notes/           # Example Markdown notes
├── README.md
└── CLAUDE.md
```

## Versioning

When modifying `claude-switch/claude-switch`, bump the `VERSION` variable (patch for fixes, minor for features).
