// 庭 niwa — native shell around the local stand.
//
// The stand itself is owned by launchd (com.param.niwa). This is only a window:
// it probes the port, kickstarts the agent if it is down, and shows the garden.
// Nothing here blocks the main thread — that was the bug in the AppleScript
// launcher, which waited inside its run handler and beachballed.

import Cocoa
import WebKit

let gardenURL = URL(string: "http://127.0.0.1:5050/")!
let agentLabel = "com.param.niwa"
// Matches the garden's paper ground, so there is no white flash before first paint.
let boneColor = NSColor(red: 0.957, green: 0.949, blue: 0.929, alpha: 1)

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    var window: NSWindow!
    var web: WKWebView!
    var attempts = 0

    func applicationDidFinishLaunching(_ note: Notification) {
        buildMenu()

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1340, height: 880),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "庭 niwa"
        window.titlebarAppearsTransparent = true
        window.backgroundColor = boneColor
        window.minSize = NSSize(width: 720, height: 520)
        window.setFrameAutosaveName("NiwaMainWindow")
        window.center()

        let config = WKWebViewConfiguration()
        config.suppressesIncrementalRendering = false
        web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
        web.setValue(false, forKey: "drawsBackground")
        window.contentView = web

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        start()
    }

    // MARK: - bringing the stand up

    func start() {
        probe { [weak self] up in
            guard let self else { return }
            if up {
                self.web.load(URLRequest(url: gardenURL))
                return
            }
            if self.attempts == 0 { self.kickstart() }
            self.attempts += 1
            if self.attempts > 24 {
                self.showFailure()
                return
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { self.start() }
        }
    }

    func probe(_ done: @escaping (Bool) -> Void) {
        var request = URLRequest(url: gardenURL)
        request.httpMethod = "HEAD"
        request.timeoutInterval = 2
        request.cachePolicy = .reloadIgnoringLocalCacheData
        URLSession.shared.dataTask(with: request) { _, response, _ in
            let ok = (response as? HTTPURLResponse)?.statusCode == 200
            DispatchQueue.main.async { done(ok) }
        }.resume()
    }

    func kickstart() {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/bin/launchctl")
        task.arguments = ["kickstart", "gui/\(getuid())/\(agentLabel)"]
        try? task.run()
    }

    func showFailure() {
        let alert = NSAlert()
        alert.messageText = "庭 niwa could not reach the stand"
        alert.informativeText = """
        Nothing is answering on 127.0.0.1:5050.

        Check the agent:
            launchctl list | grep niwa
            tail -f ~/Library/Logs/niwa.log
        """
        alert.alertStyle = .warning
        alert.runModal()
    }

    // MARK: - menu

    func buildMenu() {
        let main = NSMenu()
        let appItem = NSMenuItem()
        main.addItem(appItem)

        let appMenu = NSMenu()
        appMenu.addItem(
            withTitle: "About 庭 niwa",
            action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)),
            keyEquivalent: ""
        )
        appMenu.addItem(.separator())

        let reloadItem = NSMenuItem(title: "Reload", action: #selector(reload), keyEquivalent: "r")
        reloadItem.target = self
        appMenu.addItem(reloadItem)

        let fitItem = NSMenuItem(title: "Frame the garden", action: #selector(fit), keyEquivalent: "0")
        fitItem.target = self
        appMenu.addItem(fitItem)

        appMenu.addItem(.separator())
        appMenu.addItem(
            withTitle: "Hide 庭 niwa",
            action: #selector(NSApplication.hide(_:)),
            keyEquivalent: "h"
        )
        appMenu.addItem(
            withTitle: "Quit 庭 niwa",
            action: #selector(NSApplication.terminate(_:)),
            keyEquivalent: "q"
        )
        appItem.submenu = appMenu

        // Edit menu, or cmd-C/V/A do not work in the search field.
        let editItem = NSMenuItem()
        main.addItem(editItem)
        let editMenu = NSMenu(title: "Edit")
        editMenu.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = editMenu

        NSApp.mainMenu = main
    }

    @objc func reload() {
        web.reloadFromOrigin()
    }

    @objc func fit() {
        web.evaluateJavaScript(
            "window.__niwa && window.__niwa.zoomToFit(700, 60, n => (n.degree||0) > 0)",
            completionHandler: nil
        )
    }

    // MARK: - delegate

    func applicationShouldTerminateAfterLastWindowClosed(_ app: NSApplication) -> Bool { true }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation nav: WKNavigation!, withError error: Error) {
        // The stand may still be warming up; fall back into the retry loop.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { [weak self] in self?.start() }
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
