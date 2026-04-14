-- clautty.applescript
-- Icône macOS qui lance `clautty` (Ghostty split Claude + shell).

on run
    do shell script "/usr/local/bin/clautty > /dev/null 2>&1 &"
end run
