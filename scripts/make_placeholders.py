#!/usr/bin/env python3
"""
生成 5 张「示例占位图」。

需求明确要求：示例图片必须一眼看出是占位图，不能伪装成真实教学截图。
所以这里画的是深色底 + 网格 + 准心示意 + 大大的「示例占位图」字样。
真实点位图由用户提供，占位图只在初始体验时使用，界面上可一键删除示例。
"""
from __future__ import annotations

import os

from PIL import Image, ImageDraw, ImageFont

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "images", "dust2")
FONT_CANDIDATES = [
    "/System/Library/Fonts/PingFang.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/System/Library/Fonts/Supplemental/Songti.ttc",
]

W, H = 1600, 900


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def draw_grid(d: ImageDraw.ImageDraw) -> None:
    for x in range(0, W, 80):
        d.line([(x, 0), (x, H)], fill=(28, 36, 46), width=1)
    for y in range(0, H, 60):
        d.line([(0, y), (W, y)], fill=(28, 36, 46), width=1)


def crosshair(d: ImageDraw.ImageDraw, cx: int, cy: int) -> None:
    color = (243, 156, 18)
    d.line([(cx - 46, cy), (cx - 10, cy)], fill=color, width=4)
    d.line([(cx + 10, cy), (cx + 46, cy)], fill=color, width=4)
    d.line([(cx, cy - 46), (cx, cy - 10)], fill=color, width=4)
    d.line([(cx, cy + 10), (cx, cy + 46)], fill=color, width=4)
    d.ellipse([cx - 26, cy - 26, cx + 26, cy + 26], outline=color, width=3)


def make(slug: str, title: str, meta: str) -> None:
    img = Image.new("RGB", (W, H), (14, 19, 26))
    d = ImageDraw.Draw(img)
    draw_grid(d)

    # 顶部色条
    d.rectangle([0, 0, W, 8], fill=(243, 156, 18))

    # 大标题
    f_title = load_font(64)
    f_meta = load_font(34)
    f_big = load_font(96)
    f_small = load_font(26)

    d.text((60, 64), title, font=f_title, fill=(232, 238, 245))
    d.text((60, 152), meta, font=f_meta, fill=(150, 165, 180))

    # 准心示意
    crosshair(d, W // 2, H // 2 + 40)

    # 「示例占位图」水印
    text = "示例占位图"
    bbox = d.textbbox((0, 0), text, font=f_big)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) / 2, H // 2 + 150), text, font=f_big, fill=(243, 156, 18))

    tip = "非真实教学截图，正式点位请由作者提供准心截图后替换"
    bbox2 = d.textbbox((0, 0), tip, font=f_small)
    d.text(((W - (bbox2[2] - bbox2[0])) / 2, H // 2 + 270), tip, font=f_small, fill=(120, 135, 150))

    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, f"{slug}.webp")
    img.save(path, "WEBP", quality=88, method=6)

    thumb = img.copy()
    thumb.thumbnail((640, 640), Image.LANCZOS)
    thumb.save(os.path.join(OUT_DIR, f"{slug}-thumb.webp"), "WEBP", quality=82, method=6)
    print(f"生成 {path}")


SAMPLES = [
    ("sample-9001", "A大外 → 警家烟", "T 方 · 烟雾弹 · 站投"),
    ("sample-9002", "匪家 → Xbox烟", "T 方 · 烟雾弹 · 跑跳投"),
    ("sample-9003", "B门 → B洞火", "CT 方 · 燃烧弹 · 站投"),
    ("sample-9004", "警家 → A大闪", "CT 方 · 闪光弹 · 跳投"),
    ("sample-9005", "中路 → 中门雷", "T 方 · 手雷 · 跑投"),
]

if __name__ == "__main__":
    for slug, title, meta in SAMPLES:
        make(slug, title, meta)
