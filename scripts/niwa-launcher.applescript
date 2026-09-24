-- niwa launcher.
--
-- The stand is owned by launchd (com.param.niwa, KeepAlive), so it is normally
-- already up and this opens instantly. Nothing here may block: an AppleScript
-- applet that waits inside `run` stops pumping its event loop and macOS paints it
-- "not responding". So: one fast probe, an instant kickstart if it is down, and a
-- short bounded wait — never the 45-second poll this used to do.

property gardenURL : "http://127.0.0.1:5050/"
property agentLabel : "com.param.niwa"

on serverUp()
	try
		do shell script "/usr/bin/curl -s -o /dev/null -m 2 " & quoted form of gardenURL
		return true
	on error
		return false
	end try
end serverUp

on run
	if not serverUp() then
		-- Returns immediately; launchd does the starting.
		try
			do shell script "/bin/launchctl kickstart gui/$(id -u)/" & agentLabel
		end try

		-- launchd needs ~2s. Cap the wait hard rather than looping until success.
		repeat 8 times
			delay 0.5
			if serverUp() then exit repeat
		end repeat
	end if

	open location gardenURL
end run
