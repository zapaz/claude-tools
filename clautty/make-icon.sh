#!/usr/bin/env bash
# Génère cl.icns : moitié gauche = icône Claude, moitié droite = icône Ghostty.
# Puis applique l'icône à /Applications/Clautty.app.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

CLAUDE_ICNS="/Applications/Claude.app/Contents/Resources/electron.icns"
GHOSTTY_ICNS="/Applications/Ghostty.app/Contents/Resources/Ghostty.icns"
APP="/Applications/Clautty.app"

[[ -f "$CLAUDE_ICNS" ]]  || { echo "Claude.icns introuvable"  >&2; exit 1; }
[[ -f "$GHOSTTY_ICNS" ]] || { echo "Ghostty.icns introuvable" >&2; exit 1; }
[[ -d "$APP" ]]       || { echo "$APP introuvable"       >&2; exit 1; }

# Extraire les PNG 1024 depuis chaque .icns
sips -s format png "$CLAUDE_ICNS"  --out "$WORK/claude.png"  >/dev/null
sips -s format png "$GHOSTTY_ICNS" --out "$WORK/ghostty.png" >/dev/null

# Normaliser les deux à 1024x1024
sips -z 1024 1024 "$WORK/claude.png"  >/dev/null
sips -z 1024 1024 "$WORK/ghostty.png" >/dev/null

# Composer via AppleScript/Quartz : carré 1024x1024, moitié G = Claude cropée à droite,
# moitié D = Ghostty cropée à gauche. On utilise sips pour cropper, puis une image combinée.
# sips ne fait pas de compositing → on passe par un petit script Python + CoreGraphics.

swift - <<SWIFT
import AppKit

let work = "$WORK"
let size: CGFloat = 1024

guard
    let claude  = NSImage(contentsOfFile: "\(work)/claude.png"),
    let ghostty = NSImage(contentsOfFile: "\(work)/ghostty.png")
else { fatalError("PNG sources introuvables") }

let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(size), pixelsHigh: Int(size),
    bitsPerSample: 8, samplesPerPixel: 4,
    hasAlpha: true, isPlanar: false,
    colorSpaceName: .calibratedRGB,
    bytesPerRow: 0, bitsPerPixel: 0
)!
NSGraphicsContext.saveGraphicsState()
let ctx = NSGraphicsContext(bitmapImageRep: rep)!
NSGraphicsContext.current = ctx
let cg = ctx.cgContext

let half = size / 2
let shift = size / 4

// Gauche : Claude, logo décalé pour être centré dans la moitié gauche, clippé à gauche.
cg.saveGState()
cg.clip(to: CGRect(x: 0, y: 0, width: half, height: size))
claude.draw(
    in: NSRect(x: -shift, y: 0, width: size, height: size),
    from: .zero, operation: .sourceOver, fraction: 1.0
)
cg.restoreGState()

// Droite : Ghostty AGRANDI pour que le ghost remplisse toute la hauteur ET toute
// la largeur du canvas, centré sur la couture (x=size/2) → ghost coupé en deux,
// moitié droite visible dans la moitié droite du canvas.
let zoom: CGFloat = 1.6
let zSize = size * zoom
let zx = size/2 - zSize/2   // ghost source centré en (size/2, size/2) → destination centrée sur la couture
let zy = size/2 - zSize/2
cg.saveGState()
cg.clip(to: CGRect(x: half, y: 0, width: half, height: size))
ghostty.draw(
    in: NSRect(x: zx, y: zy, width: zSize, height: zSize),
    from: .zero, operation: .sourceOver, fraction: 1.0
)
cg.restoreGState()

NSGraphicsContext.restoreGraphicsState()

let data = rep.representation(using: .png, properties: [:])!
try! data.write(to: URL(fileURLWithPath: "\(work)/combined.png"))
SWIFT

# Construire un iconset à toutes les tailles
ICONSET="$WORK/cl.iconset"
mkdir -p "$ICONSET"
for size in 16 32 64 128 256 512; do
    sips -z $size $size "$WORK/combined.png" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null
    sips -z $((size*2)) $((size*2)) "$WORK/combined.png" --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null
done
cp "$WORK/combined.png" "$ICONSET/icon_512x512@2x.png"

# Compiler en .icns
iconutil -c icns "$ICONSET" -o "$DIR/clautty.icns"
echo "Généré: $DIR/clautty.icns"

# Appliquer à Clautty.app : remplacer applet.icns et supprimer Assets.car
# (Assets.car contient l'icône par défaut d'osacompile et override applet.icns)
cp "$DIR/clautty.icns" "$APP/Contents/Resources/applet.icns"
rm -f "$APP/Contents/Resources/Assets.car"
# Forcer Finder à rafraîchir le cache de l'icône
touch "$APP"
rm -rf "$HOME/Library/Caches/com.apple.iconservices.store" 2>/dev/null || true
killall Dock Finder 2>/dev/null || true

echo "Appliqué à: $APP"
echo "Si l'icône ne se met pas à jour, déplace Clautty.app hors de /Applications puis remets-la."
