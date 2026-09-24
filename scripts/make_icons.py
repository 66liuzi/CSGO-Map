#!/usr/bin/env python3
"""生成 PWA 图标：深色底 + 橙色准心，192 / 512 / maskable / apple-touch-icon / favicon。"""
from __future__ import annotations

import os

from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "icons")
BG = (11, 14, 19)
ACCENT = (243, 156, 18)
INK = (232, 238, 245)


def icon(size: int, padding_ratio: float = 0.24, rounded: bool = False) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if rounded:
        r = int(size * 0.22)
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=BG)
    else:
        d.rectangle([0, 0, size - 1, size - 1], fill=BG)

    pad = int(size * padding_ratio * 0.55)
    d.rounded_rectangle([pad, pad, size - pad, size - pad], radius=int(size * 0.06), outline=(37, 47, 60), width=max(2, size // 128))

    cx = cy = size // 2
    gap = int(size * 0.055)
    arm = int(size * 0.30)
    w = max(3, int(size * 0.035))

    d.line([(cx - gap - arm, cy), (cx - gap, cy)], fill=ACCENT, width=w)
    d.line([(cx + gap, cy), (cx + gap + arm, cy)], fill=ACCENT, width=w)
    d.line([(cx, cy - gap - arm), (cx, cy - gap)], fill=ACCENT, width=w)
    d.line([(cx, cy + gap), (cx, cy + gap + arm)], fill=ACCENT, width=w)
    rr = int(size * 0.13)
    d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=ACCENT, width=max(2, int(size * 0.022)))
    dot = max(2, int(size * 0.018))
    d.ellipse([cx - dot, cy - dot, cx + dot, cy + dot], fill=INK)
    return img


def save(img: Image.Image, name: str) -> None:
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name)
    img.save(path, "PNG", optimize=True)
    print("生成", path)


if __name__ == "__main__":
    save(icon(192, rounded=True), "icon-192.png")
    save(icon(512, rounded=True), "icon-512.png")
    # maskable：内容缩到安全区内，安卓桌面图标不会被裁掉
    save(icon(512, padding_ratio=0.40), "icon-maskable-512.png")
    save(icon(180, rounded=True), "apple-touch-icon.png")
    save(icon(32, padding_ratio=0.10), "favicon-32.png")
