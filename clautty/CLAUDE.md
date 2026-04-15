# clautty — dev notes

See [README.md](README.md) for user-facing install & usage.

## Files

```
clautty.applescript   # Source of truth — handler `doClautty(sshTarget)`
clautty.sh            # CLI wrapper: compiles applescript → .scpt cache, calls handler via osascript
shell-hook.sh         # Optional rc hook — persists Ghostty $PWD to ~/.config/clautty/last-dir
build-app.sh          # Packages the applescript into Clautty.app (optional --install to /Applications)
install.sh            # Installs the CLI as /usr/local/bin/clautty (+ `cl` shortcut)
make-icon.sh          # Generates clautty.icns from a source PNG
apply-icon.sh         # Applies clautty.icns to an existing Clautty.app
clautty.icns          # Dock icon
Clautty.app/          # Built applet bundle (ignored by git)
```

The CLI wrapper recompiles the `.scpt` cache automatically when `clautty.applescript` is newer. `Clautty.app` must be rebuilt manually after editing the applescript (`./build-app.sh --install`).

## Key technical notes

- **`new window` vs `make new window`**: Ghostty exposes a **native** AppleScript command `new window` (see `Ghostty.sdef` inside `/Applications/Ghostty.app/Contents/Resources/`). The generic `make new window` verb fails with error `-2710` ("Impossible de créer la classe Gwnd") because Ghostty declares `window` as read-only elements. Always call `new window` — not `make new window`.
- **Cold start vs running**: on cold start, `activate` opens Ghostty's default window and we reuse it to avoid creating an extra empty window. When Ghostty is already running, we call `new window` for a fresh split target.
- **No System Events / Accessibility**: an earlier iteration used `keystroke "n" using command down` as a fallback, which required Accessibility permission that kept getting revoked on each rebuild (ad-hoc codesign changes the bundle hash). The native `new window` command avoids TCC entirely.
- **TCC identity**: `Clautty.app` is ad-hoc signed with a stable `CFBundleIdentifier` (`com.zapaz.clautty`) so Apple Event permissions survive rebuilds — as long as the bundle content is stable.
- **Single source of truth**: CLI (`clautty.sh`) and applet (`Clautty.app`) both call `doClautty(sshTarget)` from `clautty.applescript` — no duplicated logic.
- **Last-dir memory**: `shell-hook.sh` (sourced from the user's rc, gated on `$GHOSTTY_RESOURCES_DIR` / `TERM_PROGRAM=ghostty`) writes `$PWD` to `~/.config/clautty/last-dir` on every prompt. `doClautty` reads that file via `readLastDir` and, in local mode only, prefixes `cd <dir> &&` to both panes' commands. Ghostty doesn't expose a "window about to close" AppleScript event, so a per-prompt write is the simplest reliable signal — whichever shell updates the file last wins, which matches "the last window I was in" in practice. SSH mode skips the cd (the right pane is `ssh <host>`, a local cd would be meaningless).

## Verification scenarios

Test each scenario from **both** the CLI (`clautty`) and the Dock icon:

1. **Ghostty off** — `osascript -e 'quit app "Ghostty"'` then launch clautty → one Ghostty window with the split, no empty duplicate.
2. **Ghostty on, no window** — open Ghostty, close all windows (⌘W) without quitting, then launch clautty → opens a new window with the split.
3. **Ghostty on, with window** — keep a Ghostty window open, then launch clautty → a **new** window appears with the split; the existing one stays untouched.
4. **Last-dir reuse** (after sourcing `shell-hook.sh` in your rc) — open Ghostty, `cd` to some project, close the window, then launch `clautty` → both panes start in that project's directory. Delete `~/.config/clautty/last-dir` to reset; if the saved path no longer exists `readLastDir` returns `""` and behavior falls back to the old default.
