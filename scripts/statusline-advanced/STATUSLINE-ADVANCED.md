# statusline-advanced

Advanced status line script for Claude Code that displays a compact, ANSI-colored summary of your current session.

> Script generated with Claude Code.

## Features

- **Smart directory display** — Shows `parent/current` path with `~` substitution for home
- **Rich git status** — Branch name, dirty indicator, untracked files, ahead/behind counts, stash count
- **Model abbreviation** — Strips "Claude " prefix for compact display
- **Context usage bar** — Visual `[===>      ]` bar with percentage and token counts, color-coded by usage level
- **Output style** — Shows active output style when non-default
- **Vim mode** — Displays `[INS]`/`[NOR]` when vim mode is enabled

## Setup

Run the installer:

```bash
./install.sh
```

This copies the script to `~/.claude/statusline-advanced.sh` and configures `~/.claude/settings.json` with the `status_line.command` entry. Restart Claude Code after installing.

To configure manually, add to `~/.claude/settings.json`:

```json
{
  "status_line": {
    "command": "~/.claude/statusline-advanced.sh"
  }
}
```

## Input / Output

**Input**: Claude Code pipes a JSON object to stdin containing session state (`workspace`, `model`, `output_style`, `vim`, `context_window`).

**Output**: A single ANSI-colored line to stdout.

Example output (without colors):

```
~/DEV/project (main ✗ ? ↑2) | Opus 4.6 [Verbose] [NOR] | [====>     ] 42% (84K/200K)
```

## Git indicators

| Symbol | Color   | Meaning                          |
|--------|---------|----------------------------------|
| `✗`    | Red     | Uncommitted changes (dirty tree) |
| `?`    | Yellow  | Untracked files                  |
| `↑N`   | Green   | N commits ahead of upstream      |
| `↓N`   | Red     | N commits behind upstream        |
| `✚N`   | Blue    | N stash entries                  |

Detached HEAD is shown as `@<short-sha>` instead of a branch name.

## Context bar colors

| Usage    | Color  |
|----------|--------|
| < 50%    | Green  |
| 50–74%   | Yellow |
| 75–89%   | Orange |
| ≥ 90%    | Red    |

## Dependencies

- `bash`
- `jq`
- `git`
