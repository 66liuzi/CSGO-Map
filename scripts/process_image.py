#!/usr/bin/env python3
"""
图片处理：把用户给的一张准心瞄点图，处理成网页用的 WebP。

做四件事：
  1. 按 EXIF 自动修正手机图片方向（竖拍/倒着拍的图不会歪）。
  2. 等比缩放到最长边 1920（不放大小图），保留准心细节。
  3. 输出高质量 WebP 主图 + 列表用缩略图（最长边 640）。
  4. 文件名规范化（英文数字小写短横线）。

用法：
  python3 scripts/process_image.py --src ~/Downloads/xxx.jpg \
      --name dust2-t-mid-ctspawn-smoke-0001 --out public/images/dust2
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys

from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = None


def slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"[^a-z0-9\-]", "", text)
    text = re.sub(r"-{2,}", "-", text)
    return text.strip("-")


def process(src: str, name: str, out_dir: str, max_edge: int, thumb_edge: int, quality: int) -> dict:
    if not os.path.isfile(src):
        raise SystemExit(f"找不到源图片：{src}")

    name = slugify(name)
    if not name:
        raise SystemExit("--name 必须是英文/数字（用于生成稳定文件名）")

    os.makedirs(out_dir, exist_ok=True)

    img = Image.open(src)
    # 1. 自动摆正方向（手机照片常见问题）
    img = ImageOps.exif_transpose(img)
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
    elif img.mode == "RGBA":
        # WebP 支持透明，但准心截图不需要，统一转 RGB 让体积更小
        bg = Image.new("RGB", img.size, (0, 0, 0))
        bg.paste(img, mask=img.split()[-1])
        img = bg

    orig_size = img.size

    # 2. 主图
    main = img.copy()
    if max(main.size) > max_edge:
        main.thumbnail((max_edge, max_edge), Image.LANCZOS)
    main_path = os.path.join(out_dir, f"{name}.webp")
    main.save(main_path, "WEBP", quality=quality, method=6, exact=False)

    # 3. 缩略图（列表页用，避免手机上一次性下载大图）
    thumb = img.copy()
    thumb.thumbnail((thumb_edge, thumb_edge), Image.LANCZOS)
    thumb_path = os.path.join(out_dir, f"{name}-thumb.webp")
    thumb.save(thumb_path, "WEBP", quality=82, method=6)

    return {
        "name": name,
        "original": {"path": src, "size": orig_size, "bytes": os.path.getsize(src)},
        "image": {"path": main_path, "size": main.size, "bytes": os.path.getsize(main_path)},
        "thumbnail": {"path": thumb_path, "size": thumb.size, "bytes": os.path.getsize(thumb_path)},
    }


def main() -> None:
    ap = argparse.ArgumentParser(description="处理准心瞄点图片为 WebP")
    ap.add_argument("--src", required=True, help="源图片路径")
    ap.add_argument("--name", required=True, help="输出文件名（不含扩展名，英文数字）")
    ap.add_argument("--out", default="public/images/dust2", help="输出目录")
    ap.add_argument("--max", type=int, default=1920, help="主图最长边，默认 1920")
    ap.add_argument("--thumb", type=int, default=640, help="缩略图最长边，默认 640")
    ap.add_argument("--quality", type=int, default=90, help="WebP 质量，默认 90")
    args = ap.parse_args()

    result = process(args.src, args.name, args.out, args.max, args.thumb, args.quality)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    sys.exit(main())
