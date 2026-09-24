// Draws the niwa app icon: a ring of ink on a bone squircle, with one rust stone.
// Writes a 1024px PNG; build-app.sh turns it into an .icns.

import AppKit
import Foundation

let size = 1024.0
let out = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "/tmp/niwa-icon.png"

let bone = NSColor(red: 0.957, green: 0.949, blue: 0.929, alpha: 1)
let ink = NSColor(red: 0.137, green: 0.129, blue: 0.118, alpha: 1)
let rust = NSColor(red: 0.710, green: 0.325, blue: 0.165, alpha: 1)
let rule = NSColor(red: 0.886, green: 0.871, blue: 0.835, alpha: 1)

let image = NSImage(size: NSSize(width: size, height: size))
image.lockFocus()

guard let ctx = NSGraphicsContext.current?.cgContext else { exit(1) }
ctx.setShouldAntialias(true)

// macOS icons are inset squircles, not full-bleed squares.
let inset = size * 0.085
let rect = NSRect(x: inset, y: inset, width: size - inset * 2, height: size - inset * 2)
let body = NSBezierPath(roundedRect: rect, xRadius: size * 0.2235, yRadius: size * 0.2235)

bone.setFill()
body.fill()
rule.setStroke()
body.lineWidth = size * 0.006
body.stroke()

// A ring in ink — one stone's outline — set a little off centre and drawn
// with a hand's wobble rather than a compass's.
ink.setStroke()
let ring = NSBezierPath()
let cx = size * 0.5
let cy = size * 0.53
let rr = size * 0.27
for i in 0...48 {
    let a = Double(i) / 48.0 * .pi * 2 + 0.6
    let wob = 1 + 0.018 * sin(a * 3 + 0.4) + 0.012 * sin(a * 7)
    let p = NSPoint(x: cx + cos(a) * rr * wob, y: cy + sin(a) * rr * wob * 0.98)
    if i == 0 { ring.move(to: p) } else { ring.line(to: p) }
}
ring.lineWidth = size * 0.045
ring.lineCapStyle = .round
ring.lineJoinStyle = .round
ring.stroke()

// One stone, bottom right — the accent that runs through the whole tool.
rust.setFill()
let dot = size * 0.072
NSBezierPath(ovalIn: NSRect(x: size * 0.685, y: size * 0.215, width: dot, height: dot)).fill()

image.unlockFocus()

guard
    let tiff = image.tiffRepresentation,
    let rep = NSBitmapImageRep(data: tiff),
    let png = rep.representation(using: .png, properties: [:])
else { exit(1) }

try? png.write(to: URL(fileURLWithPath: out))
print("wrote \(out)")
