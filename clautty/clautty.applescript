-- clautty.applescript
-- Source unique : pilote Ghostty avec split Claude (gauche) + shell/SSH (droit).
-- Pilotage inline (sans `do shell script`) pour que TCC attribue l'Apple Event
-- à Clautty (via Clautty.app) ou osascript (via CLI) et non à un binaire tiers.
--
-- Architecture :
--   on run          → applet GUI (Dock / open -a) : appelle doClautty("")
--   on doClautty(x) → handler public, invoqué en CLI via `load script` + `tell`
--
-- NB : `on run argv` ne fonctionne PAS depuis un applet GUI (échec silencieux),
-- d'où le handler nommé.

on run
    doClautty("")
end run

on doClautty(sshTarget)
    set CLAUDE_CMD to "claude --dangerously-skip-permissions"

    if sshTarget is "" then
        set leftCmd to CLAUDE_CMD
        set rightCmd to ""
    else
        set leftCmd to "ssh -t " & sshTarget & " -- '$SHELL -lic \"" & CLAUDE_CMD & "\"'"
        set rightCmd to "ssh " & sshTarget
    end if

    -- Ghostty expose une commande native `new window` (cf. Ghostty.sdef) qu'il
    -- faut appeler sans le préfixe `make` : `make new window` utilise le verbe
    -- AppleScript générique et échoue (-2710) parce que la classe `window` est
    -- en accès "r" dans le dictionnaire.
    set wasRunning to running of application "Ghostty"

    tell application "Ghostty"
        activate
        if wasRunning then
            set win to new window
        else
            repeat 40 times
                if (count of windows) > 0 then exit repeat
                delay 0.05
            end repeat
            set win to front window
        end if
        set leftPane to terminal 1 of selected tab of win
        set rightPane to split leftPane direction right
        input text leftCmd to leftPane
        send key "enter" to leftPane
        if rightCmd is not "" then
            input text rightCmd to rightPane
            send key "enter" to rightPane
        end if
        focus leftPane
    end tell
end doClautty
