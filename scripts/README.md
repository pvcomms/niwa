# Running niwa as a stand

The garden is owned by **launchd**, matching the other local stands
(`com.param.kiku`, `com.param.shosai-*`). It comes up at login and restarts itself
if it dies.

```bash
cp scripts/com.param.niwa.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.param.niwa.plist
launchctl list | grep niwa          # running?
tail -f ~/Library/Logs/niwa.log     # what it is doing
```

The Desktop app is built from `niwa-launcher.applescript`:

```bash
osacompile -o "$HOME/Desktop/庭 niwa.app" scripts/niwa-launcher.applescript
```

**Why the launcher does no real work.** An AppleScript applet that waits inside its
`run` handler stops pumping its event loop, and macOS paints it *not responding* —
a beachball, no window. The first version started the dev server with
`do shell script "… &"` and then polled for up to 45 seconds; `do shell script`
also blocks until the whole spawned process tree releases its descriptors, so the
applet hung indefinitely and never opened anything. launchd owns the process now
and the applet only probes, kickstarts, and opens a URL. It exits in ~0.3s.
