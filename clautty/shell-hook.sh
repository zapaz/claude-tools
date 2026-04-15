# clautty shell hook — remembers the working directory of Ghostty shells so
# `clautty` (and the Dock icon) can reopen in the dir of the last closed window.
#
# Source this from your shell rc, e.g. in ~/.zshrc or ~/.bashrc:
#
#     [ -f /path/to/claude-tools/clautty/shell-hook.sh ] \
#         && . /path/to/claude-tools/clautty/shell-hook.sh
#
# The hook only activates inside Ghostty. It writes $PWD to
# ~/.config/clautty/last-dir on every prompt; whichever shell updates the file
# last (typically the last window you were working in) wins.

if [ -n "${GHOSTTY_RESOURCES_DIR-}" ] || [ "${TERM_PROGRAM-}" = "ghostty" ]; then
    _clautty_save_dir() {
        local d="${HOME}/.config/clautty"
        [ -d "$d" ] || mkdir -p "$d" 2>/dev/null || return 0
        printf '%s\n' "$PWD" >"$d/last-dir.tmp" 2>/dev/null \
            && mv "$d/last-dir.tmp" "$d/last-dir" 2>/dev/null
    }

    if [ -n "${ZSH_VERSION-}" ]; then
        autoload -Uz add-zsh-hook 2>/dev/null \
            && add-zsh-hook precmd _clautty_save_dir
    elif [ -n "${BASH_VERSION-}" ]; then
        case ";${PROMPT_COMMAND-};" in
            *";_clautty_save_dir;"*) ;;
            *) PROMPT_COMMAND="_clautty_save_dir${PROMPT_COMMAND:+;$PROMPT_COMMAND}" ;;
        esac
    fi
fi
