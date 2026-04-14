#!/usr/bin/env bash
# Applique un PNG fourni comme icône de Clautty.app.
# Usage: ./apply-icon.sh <chemin.png>
set -euo pipefail

SRC="${1:-}"
[[ -f "$SRC" ]] || { echo "Usage: $0 <image.png>" >&2; exit 1; }

DIR="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
APP="/Applications/Clautty.app"

# Détourer : détecter la bbox des pixels non-transparents et recadrer dessus,
# puis scaler à 1024x1024 pour que l'icône remplisse toute la surface.
cp "$SRC" "$WORK/src.png"
swift - "$WORK/src.png" "$WORK/base.png" <<'SWIFT'
import AppKit
import CoreGraphics

let args = CommandLine.arguments
let src = URL(fileURLWithPath: args[1])
let dst = URL(fileURLWithPath: args[2])

guard
    let data = try? Data(contentsOf: src),
    let provider = CGDataProvider(data: data as CFData),
    let img = CGImage(pngDataProviderSource: provider, decode: nil, shouldInterpolate: false, intent: .defaultIntent)
else { fatalError("Lecture PNG échouée") }

let w = img.width, h = img.height
let bytesPerRow = w * 4
var pixels = [UInt8](repeating: 0, count: h * bytesPerRow)
let ctx = CGContext(
    data: &pixels, width: w, height: h, bitsPerComponent: 8,
    bytesPerRow: bytesPerRow, space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
)!
ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))

// bbox alpha > threshold
var minX = w, minY = h, maxX = -1, maxY = -1
let threshold: UInt8 = 200
for y in 0..<h {
    for x in 0..<w {
        let a = pixels[y*bytesPerRow + x*4 + 3]
        if a > threshold {
            if x < minX { minX = x }
            if y < minY { minY = y }
            if x > maxX { maxX = x }
            if y > maxY { maxY = y }
        }
    }
}
guard maxX >= minX && maxY >= minY else { fatalError("Image entièrement transparente") }

let bw = maxX - minX + 1, bh = maxY - minY + 1
let side = max(bw, bh)
// Carré centré sur la bbox
let cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
let sx = max(0, cx - side/2)
let sy = max(0, cy - side/2)
let cropRect = CGRect(x: sx, y: sy, width: min(side, w - sx), height: min(side, h - sy))

guard let cropped = img.cropping(to: cropRect) else { fatalError("Crop échoué") }

// Rendre en 1024x1024
let out = CGContext(
    data: nil, width: 1024, height: 1024, bitsPerComponent: 8,
    bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
)!
out.interpolationQuality = .high
out.draw(cropped, in: CGRect(x: 0, y: 0, width: 1024, height: 1024))

guard
    let final = out.makeImage(),
    let dest = CGImageDestinationCreateWithURL(dst as CFURL, "public.png" as CFString, 1, nil)
else { fatalError("Export échoué") }
CGImageDestinationAddImage(dest, final, nil)
CGImageDestinationFinalize(dest)
SWIFT

# Générer iconset toutes tailles
ICONSET="$WORK/clautty.iconset"
mkdir -p "$ICONSET"
for s in 16 32 64 128 256 512; do
    sips -z $s $s "$WORK/base.png" --out "$ICONSET/icon_${s}x${s}.png" >/dev/null
    sips -z $((s*2)) $((s*2)) "$WORK/base.png" --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null
done
cp "$WORK/base.png" "$ICONSET/icon_512x512@2x.png"

iconutil -c icns "$ICONSET" -o "$DIR/clautty.icns"
echo "Généré: $DIR/clautty.icns"

# Appliquer
cp "$DIR/clautty.icns" "$APP/Contents/Resources/applet.icns"
rm -f "$APP/Contents/Resources/Assets.car"
touch "$APP"
rm -rf "$HOME/Library/Caches/com.apple.iconservices.store" 2>/dev/null || true
killall Dock Finder 2>/dev/null || true

echo "Appliqué à: $APP"
