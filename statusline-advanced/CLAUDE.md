# statusline-advanced — dev notes

See [README.md](README.md) for user-facing features & setup.

## Input / Output contract

**Input**: Claude Code pipes a JSON object to stdin with session state:

- `workspace.current_dir` — absolute path of the current workspace
- `model.display_name` — model shown to the user (e.g. `Claude Opus 4.6`)
- `output_style.name` — active output style
- `vim.enabled`, `vim.mode` — vim integration state
- `context_window.input_tokens`, `context_window.max_input_tokens` — for the usage bar

**Output**: a single ANSI-colored line on stdout. No stderr, no trailing newline beyond the usual.

Example (without ANSI):

```
~/DEV/project (main ✗ ? ↑2) | Opus 4.6 [Verbose] [NOR] | [====>     ] 42% (84K/200K)
```

## Implementation notes

- Single bash script (`statusline-advanced.sh`), no external runtime beyond `bash`, `jq`, `git`.
- JSON parsing via `jq` — every field read is guarded (`// empty`) so missing keys don't break the line.
- Directory display: substitutes `$HOME` with `~`, then keeps only the last two path components (`parent/current`).
- Git block is rendered only when `git rev-parse` succeeds in the current dir. Symbols are emitted in this order: `✗` (dirty), `?` (untracked), `↑N` (ahead), `↓N` (behind), `✚N` (stash).
- Detached HEAD shows `@<short-sha>` instead of a branch name.
- Model name has the `Claude ` prefix stripped for compactness.
- Context bar is 10 characters wide; color thresholds: <50% green, 50–74% yellow, 75–89% orange, ≥90% red.

## Conventions

- Bash with `set -euo pipefail`.
- ANSI escapes via a tiny helpers table at the top of the script — no `tput`, no external color libs.
- Keep the script side-effect free (no files written, no network). It's called on every Claude Code prompt.
