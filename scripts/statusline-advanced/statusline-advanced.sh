#!/bin/bash
# Advanced status line script for Claude Code
# Features: smart path, rich git status, context bar with colors

# Read JSON input from stdin
input=$(cat)

# Parse basic info
cwd=$(echo "$input" | jq -r '.workspace.current_dir')
model=$(echo "$input" | jq -r '.model.display_name')
output_style=$(echo "$input" | jq -r 'if .output_style | type == "object" then .output_style.name // "default" elif .output_style | type == "array" then .output_style[0].name // "default" elif .output_style | type == "string" then .output_style else "default" end')
vim_mode=$(echo "$input" | jq -r '.vim.mode // empty' | tr '[:upper:]' '[:lower:]')

# Smart directory display: parent/current, with ~ for home
smart_dir() {
    local dir="$1"
    local home="$HOME"

    # Replace home with ~
    dir="${dir/#$home/\~}"

    # Get last 2 components
    local parent=$(dirname "$dir")
    local current=$(basename "$dir")
    local grandparent=$(basename "$parent")

    if [ "$parent" = "~" ] || [ "$parent" = "/" ]; then
        echo "$parent/$current"
    elif [ "$grandparent" = "/" ] || [ "$grandparent" = "~" ]; then
        echo "$current"
    else
        echo "$grandparent/$current"
    fi
}

# Rich git status
get_git_status() {
    local dir="$1"

    # Check if in git repo
    if ! git -C "$dir" rev-parse --git-dir > /dev/null 2>&1; then
        return
    fi

    # Get branch name
    local branch=$(git -C "$dir" -c core.useBuiltinFSMonitor=false branch --show-current 2>/dev/null)
    if [ -z "$branch" ]; then
        # Detached HEAD - show short SHA
        branch=$(git -C "$dir" rev-parse --short HEAD 2>/dev/null)
        branch="@${branch}"
    fi

    local indicators=""

    # Check for dirty working tree (uncommitted changes)
    if ! git -C "$dir" diff --quiet 2>/dev/null || ! git -C "$dir" diff --cached --quiet 2>/dev/null; then
        indicators+=" \033[31m✗\033[0m"
    fi

    # Check for untracked files
    if [ -n "$(git -C "$dir" ls-files --others --exclude-standard 2>/dev/null | head -1)" ]; then
        indicators+=" \033[33m?\033[0m"
    fi

    # Check ahead/behind
    local upstream=$(git -C "$dir" rev-parse --abbrev-ref @{u} 2>/dev/null)
    if [ -n "$upstream" ]; then
        local ahead=$(git -C "$dir" rev-list --count @{u}..HEAD 2>/dev/null)
        local behind=$(git -C "$dir" rev-list --count HEAD..@{u} 2>/dev/null)

        if [ "$ahead" -gt 0 ] 2>/dev/null; then
            indicators+=" \033[32m↑${ahead}\033[0m"
        fi
        if [ "$behind" -gt 0 ] 2>/dev/null; then
            indicators+=" \033[31m↓${behind}\033[0m"
        fi
    fi

    # Check stash
    local stash_count=$(git -C "$dir" stash list 2>/dev/null | wc -l | tr -d ' ')
    if [ "$stash_count" -gt 0 ]; then
        indicators+=" \033[34m✚${stash_count}\033[0m"
    fi

    echo -e "\033[35m(${branch}${indicators}\033[35m)\033[0m"
}

# Abbreviate model name (strip "Claude " prefix)
abbreviate_model() {
    local model="$1"
    echo "${model#Claude }"
}

# Context usage bar with color coding
get_context_bar() {
    local input="$1"

    # Use used_percentage directly if available
    local used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
    if [ -z "$used_pct" ]; then
        return
    fi

    # Get total tokens (input + output)
    local total_in=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
    local total_out=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')
    local total_tokens=$((total_in + total_out))

    local size=$(echo "$input" | jq -r '.context_window.context_window_size // 200000')

    # Convert percentage to integer for comparisons
    local pct_int=${used_pct%.*}

    # Color based on percentage
    local color
    if [ "$pct_int" -lt 50 ]; then
        color="\033[32m"  # Green
    elif [ "$pct_int" -lt 75 ]; then
        color="\033[33m"  # Yellow
    elif [ "$pct_int" -lt 90 ]; then
        color="\033[38;5;208m"  # Orange
    else
        color="\033[31m"  # Red
    fi

    # Build visual bar (10 chars wide)
    local filled=$((pct_int / 10))
    local empty=$((10 - filled))
    local bar=""
    for ((i=0; i<filled; i++)); do bar+="="; done
    if [ "$empty" -gt 0 ]; then
        bar+=">"
        empty=$((empty - 1))
    fi
    for ((i=0; i<empty; i++)); do bar+=" "; done

    # Format token counts (K for thousands)
    local total_k=$((total_tokens / 1000))
    local size_k=$((size / 1000))

    printf "${color}[${bar}] %.0f%% (%dK/%dK)\033[0m" "$used_pct" "$total_k" "$size_k"
}

# Build the status line
short_dir=$(smart_dir "$cwd")
git_info=$(get_git_status "$cwd")
short_model=$(abbreviate_model "$model")
context_bar=$(get_context_bar "$input")

# Start with directory (cyan)
output="\033[36m${short_dir}\033[0m"

# Add git info if present
if [ -n "$git_info" ]; then
    output+=" ${git_info}"
fi

# Add model (green)
output+=" | \033[32m${short_model}\033[0m"

# Add output style if non-default
if [ "$output_style" != "default" ] && [ "$output_style" != "null" ] && [ -n "$output_style" ]; then
    # Capitalize first letter
    style_display="$(echo "${output_style:0:1}" | tr '[:lower:]' '[:upper:]')${output_style:1}"
    output+=" \033[34m[${style_display}]\033[0m"
fi

# Add vim mode if enabled
if [ -n "$vim_mode" ]; then
    if [ "$vim_mode" = "insert" ]; then
        output+=" \033[33m[INS]\033[0m"
    elif [ "$vim_mode" = "normal" ]; then
        output+=" \033[36m[NOR]\033[0m"
    fi
fi

# Add context bar if available
if [ -n "$context_bar" ]; then
    output+=" | ${context_bar}"
fi

echo -e "$output"
