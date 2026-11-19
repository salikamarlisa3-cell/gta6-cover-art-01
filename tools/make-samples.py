#!/usr/bin/env python3
"""Synthesize two original sample scenes for Neon Vice Panels.

Both scenes are drawn from scratch with PIL primitives: layered gradients,
glow discs, and black silhouette shapes (palms, a low car, boardwalk posts).
No photographs and no third-party artwork are used.

Outputs (JPEG, portrait, alongside the kit samples):
  app/samples/neon-boulevard.jpg  - neon night boulevard, palm + car
  app/samples/palm-sunset.jpg     - beach sunset with boardwalk
"""

import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "app", "samples")

W, H = 880, 1160


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def v_gradient(w, h, stops):
    """Vertical gradient from a list of (position, rgb) stops."""
    img = Image.new("RGB", (w, h))
    px = img.load()
    stops = sorted(stops)
    for y in range(h):
        t = y / max(1, h - 1)
        for i in range(len(stops) - 1):
            p0, c0 = stops[i]
            p1, c1 = stops[i + 1]
            if p0 <= t <= p1:
                px_row = lerp(c0, c1, (t - p0) / max(1e-6, p1 - p0))
                break
        else:
            px_row = stops[-1][1]
        for x in range(w):
            px[x, y] = px_row
    return img


def glow(img, cx, cy, radius, color, strength=0.85):
    """Add a soft radial light centred at (cx, cy)."""
    layer = Image.new("RGB", img.size, (0, 0, 0))
    d = ImageDraw.Draw(layer)
    steps = 24
    for i in range(steps, 0, -1):
        r = radius * i / steps
        shade = tuple(int(c * strength * (1 - i / steps) ** 1.6) for c in color)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=shade)
    layer = layer.filter(ImageFilter.GaussianBlur(radius * 0.18))
    base = img.load()
    add = layer.load()
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            r, g, b = base[x, y]
            ar, ag, ab = add[x, y]
            base[x, y] = (min(255, r + ar), min(255, g + ag), min(255, b + ab))
    return img


def palm(d, x, y, scale, lean=0.0, color=(8, 4, 14)):
    """A palm silhouette: curved trunk plus a crown of drooping fronds."""
    pts = []
    steps = 18
    for i in range(steps + 1):
        t = i / steps
        px = x + lean * scale * t * t
        py = y - scale * t
        pts.append((px, py))
    d.line(pts, fill=color, width=max(6, int(scale * 0.075)))
    top_x, top_y = pts[-1]
    for ang in (-168, -140, -112, -84, -56, -28, -4):
        rad = math.radians(ang)
        length = scale * (0.52 + 0.14 * math.sin(ang))
        frond = []
        for i in range(13):
            t = i / 12
            fx = top_x + math.cos(rad) * length * t
            fy = top_y + math.sin(rad) * length * t + scale * 0.34 * t * t
            frond.append((fx, fy))
        d.line(frond, fill=color, width=max(4, int(scale * 0.045)))
    d.ellipse([top_x - scale * 0.05, top_y - scale * 0.02,
               top_x + scale * 0.06, top_y + scale * 0.09], fill=color)


def neon_boulevard():
    img = v_gradient(W, H, [
        (0.0, (16, 6, 38)),
        (0.34, (52, 14, 84)),
        (0.58, (128, 30, 110)),
        (0.78, (232, 84, 120)),
        (1.0, (30, 8, 34)),
    ])
    d = ImageDraw.Draw(img, "RGBA")

    # distant tower blocks with lit windows
    rng = random.Random(41)
    for bx, bw, bh, tone in [(0, 150, 470, 26), (120, 120, 380, 34),
                             (610, 130, 430, 24), (720, 160, 520, 30),
                             (250, 90, 300, 40), (520, 80, 330, 38)]:
        d.rectangle([bx, H * 0.62 - bh, bx + bw, H * 0.62], fill=(tone, 10, tone + 22, 255))
        for _ in range(bw * bh // 2600):
            wx = bx + rng.randrange(8, max(9, bw - 14))
            wy = H * 0.62 - bh + rng.randrange(10, max(11, bh - 16))
            warm = rng.random() < 0.6
            d.rectangle([wx, wy, wx + 5, wy + 7],
                        fill=(255, 196, 110, 235) if warm else (140, 230, 255, 235))

    img = glow(img, W * 0.5, H * 0.60, 430, (255, 90, 150))
    img = glow(img, W * 0.16, H * 0.30, 200, (60, 200, 255))
    img = glow(img, W * 0.86, H * 0.36, 210, (255, 60, 200))
    d = ImageDraw.Draw(img, "RGBA")

    # neon signs: bright rounded bars on the two front buildings
    for x, y, col in [(36, 300, (80, 235, 255)), (52, 380, (255, 90, 210)),
                      (W - 70, 260, (255, 170, 60)), (W - 56, 350, (120, 255, 190))]:
        d.rounded_rectangle([x, y, x + 16, y + 120], radius=8, fill=col + (255,))
        d.rounded_rectangle([x - 5, y - 5, x + 21, y + 125], radius=10, outline=col + (110,), width=3)

    # wet street: dark base with reflected neon streaks
    street_y = int(H * 0.78)
    d.rectangle([0, street_y, W, H], fill=(14, 6, 22, 255))
    for i, (sx, col) in enumerate([(90, (255, 90, 190)), (240, (80, 220, 255)),
                                   (430, (255, 160, 80)), (620, (255, 90, 150)),
                                   (770, (120, 255, 200))]):
        for k in range(7):
            yy = street_y + 18 + k * 26 + (i % 3) * 5
            ln = 90 - k * 9
            d.line([sx - ln // 2, yy, sx + ln // 2, yy], fill=col + (150 - k * 16,), width=5)

    # street lamps
    for lx in (70, W - 70):
        d.line([lx, street_y - 250, lx, street_y + 6], fill=(6, 3, 10, 255), width=9)
        d.ellipse([lx - 13, street_y - 272, lx + 13, street_y - 246], fill=(255, 214, 140, 255))

    # palms flanking the street
    palm(d, 96, street_y + 16, 330, lean=-0.35)
    palm(d, W - 84, street_y + 20, 360, lean=0.4)

    # low sports-car silhouette, side profile, centred low
    cx, cy, s = W * 0.5, street_y + 148, 1.0
    body = [
        (cx - 300 * s, cy), (cx - 292 * s, cy - 34 * s), (cx - 205 * s, cy - 44 * s),
        (cx - 128 * s, cy - 96 * s), (cx - 40 * s, cy - 108 * s), (cx + 92 * s, cy - 92 * s),
        (cx + 168 * s, cy - 52 * s), (cx + 262 * s, cy - 40 * s), (cx + 300 * s, cy - 16 * s),
        (cx + 300 * s, cy), (cx + 218 * s, cy),
    ]
    # rear wheel arch gap, then front wheel arch gap, then sill
    body += [(cx + 196 * s, cy - 26 * s), (cx + 150 * s, cy - 26 * s), (cx + 128 * s, cy),
             (cx - 128 * s, cy), (cx - 150 * s, cy - 26 * s), (cx - 196 * s, cy - 26 * s),
             (cx - 218 * s, cy)]
    d.polygon(body, fill=(5, 2, 9, 255))
    # canopy glass
    d.polygon([(cx - 112 * s, cy - 92 * s), (cx - 34 * s, cy - 100 * s),
               (cx + 74 * s, cy - 88 * s), (cx + 130 * s, cy - 56 * s),
               (cx - 60 * s, cy - 58 * s)], fill=(30, 16, 44, 255))
    # neon underglow + tail light strip
    d.line([cx - 280 * s, cy + 8, cx + 280 * s, cy + 8], fill=(255, 60, 180, 255), width=7)
    d.line([cx - 296 * s, cy - 30 * s, cx - 240 * s, cy - 32 * s], fill=(255, 70, 90, 255), width=8)
    for wx in (cx - 172 * s, cx + 172 * s):
        d.ellipse([wx - 34 * s, cy - 34 * s, wx + 34 * s, cy + 34 * s], fill=(3, 1, 6, 255))
        d.ellipse([wx - 15 * s, cy - 15 * s, wx + 15 * s, cy + 15 * s], outline=(190, 200, 220, 255), width=5)

    return img


def palm_sunset():
    img = v_gradient(W, H, [
        (0.0, (58, 30, 96)),
        (0.30, (166, 62, 128)),
        (0.52, (248, 116, 92)),
        (0.66, (255, 178, 96)),
        (0.78, (120, 90, 110)),
        (1.0, (38, 26, 54)),
    ])
    d = ImageDraw.Draw(img, "RGBA")

    # sun disc low over the water
    img = glow(img, W * 0.52, H * 0.655, 330, (255, 170, 80))
    d = ImageDraw.Draw(img, "RGBA")
    sun_r = 92
    d.ellipse([W * 0.52 - sun_r, H * 0.655 - sun_r, W * 0.52 + sun_r, H * 0.655 + sun_r],
              fill=(255, 214, 130, 255))

    # sea band with a broken sun path
    sea_y = int(H * 0.66)
    d.rectangle([0, sea_y, W, int(H * 0.86)], fill=(96, 52, 96, 255))
    rng = random.Random(7)
    for k in range(46):
        yy = sea_y + 8 + k * 9
        spread = 30 + k * 5
        sx = W * 0.52 + rng.uniform(-14, 14)
        col = (255, 190, 110, 200) if k % 3 else (255, 140, 130, 170)
        d.line([sx - spread / 2, yy, sx + spread / 2, yy], fill=col, width=4)
    for _ in range(60):
        x = rng.uniform(0, W)
        y = rng.uniform(sea_y + 6, H * 0.85)
        d.line([x, y, x + rng.uniform(8, 30), y], fill=(255, 220, 190, 90), width=2)

    # distant headland
    d.polygon([(0, sea_y + 4), (0, sea_y - 66), (150, sea_y - 88), (300, sea_y - 30),
               (360, sea_y + 4)], fill=(40, 20, 58, 255))

    # sand foreground
    d.rectangle([0, int(H * 0.86), W, H], fill=(30, 18, 38, 255))

    # boardwalk: deck, posts and a railing marching to the right
    deck_y = int(H * 0.845)
    d.polygon([(0, deck_y + 66), (0, deck_y + 30), (W, deck_y - 26), (W, deck_y + 8)],
              fill=(16, 9, 24, 255))
    for i in range(9):
        t = i / 8
        x = 30 + t * (W - 60)
        y = deck_y + 34 - t * 52
        d.line([x, y - 120, x, y + 66], fill=(12, 6, 18, 255), width=10)
    for i in range(8):
        t0, t1 = i / 8, (i + 1) / 8
        x0, x1 = 30 + t0 * (W - 60), 30 + t1 * (W - 60)
        y0, y1 = deck_y - 86 - t0 * 52, deck_y - 86 - t1 * 52
        d.line([x0, y0, x1, y1], fill=(12, 6, 18, 255), width=8)
        y0, y1 = deck_y - 40 - t0 * 52, deck_y - 40 - t1 * 52
        d.line([x0, y0, x1, y1], fill=(12, 6, 18, 255), width=6)

    # palms: one big on the left, one smaller on the right
    palm(d, 118, H * 0.90, 430, lean=0.30)
    palm(d, W - 120, H * 0.88, 300, lean=-0.42)

    # two tiny figures strolling on the boardwalk
    for fx, fy, fs in [(W * 0.44, deck_y - 6, 1.0), (W * 0.50, deck_y - 12, 0.9)]:
        d.ellipse([fx - 7 * fs, fy - 62 * fs, fx + 7 * fs, fy - 48 * fs], fill=(10, 5, 16, 255))
        d.line([fx, fy - 48 * fs, fx, fy - 22 * fs], fill=(10, 5, 16, 255), width=int(9 * fs))
        d.line([fx, fy - 22 * fs, fx - 10 * fs, fy], fill=(10, 5, 16, 255), width=int(7 * fs))
        d.line([fx, fy - 22 * fs, fx + 11 * fs, fy - 2 * fs], fill=(10, 5, 16, 255), width=int(7 * fs))

    return img


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    scenes = [("neon-boulevard.jpg", neon_boulevard()), ("palm-sunset.jpg", palm_sunset())]
    for name, img in scenes:
        path = os.path.join(OUT_DIR, name)
        img.save(path, "JPEG", quality=88)
        print(name, img.size, os.path.getsize(path), "bytes")


if __name__ == "__main__":
    main()
