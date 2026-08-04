#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Generate 6 branded article covers (PNG) for the GridLens zh articles."""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "covers")
os.makedirs(OUT, exist_ok=True)

W, H = 1200, 675
REG = "C:/Windows/Fonts/msyh.ttc"      # Microsoft YaHei (index 0)
BOLD = "C:/Windows/Fonts/msyhbd.ttc"   # Microsoft YaHei Bold (index 0)

# (filename, kicker, title, accent_hex)
ARTICLES = [
    ("cover-01.png", "实战复盘 · 6 个月", "我拿 Gate.io BTC 网格机器人实跑了 6 个月", "#f59e0b"),
    ("cover-02.png", "风控指南", "网格策略如何设置保证金告警", "#38bdf8"),
    ("cover-03.png", "监控架构", "加密组合回撤监控：从 SQLite 到实时看板", "#a78bfa"),
    ("cover-04.png", "避坑手册", "为什么大多数网格机器人会爆仓", "#f43f5e"),
    ("cover-05.png", "安全边界", "用 AI Agent 管理加密资产的风险边界", "#34d399"),
    ("cover-06.png", "产品解析", "GridLens 是怎么工作的", "#60a5fa"),
]


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def v_gradient(draw, top, bottom):
    for y in range(H):
        t = y / H
        col = lerp(top, bottom, t)
        draw.line([(0, y), (W, y)], fill=col)


def wrap_text(text, font, max_w):
    lines, cur = [], ""
    for ch in text:
        test = cur + ch
        if font.getlength(test) > max_w and cur:
            lines.append(cur)
            cur = ch
        else:
            cur = test
    if cur:
        lines.append(cur)
    return lines


def draw_grid_pattern(draw, accent, alpha=28):
    """Subtle grid lines evoking a grid bot."""
    step = 60
    a = hex2rgb(accent)
    for x in range(0, W + 1, step):
        draw.line([(x, 0), (x, H)], fill=(a[0], a[1], a[2], alpha))
    for y in range(0, H + 1, step):
        draw.line([(0, y), (W, y)], fill=(a[0], a[1], a[2], alpha))


def gen(fname, kicker, title, accent):
    img = Image.new("RGB", (W, H), (15, 23, 42))
    img = img.convert("RGBA")
    draw = ImageDraw.Draw(img, "RGBA")

    top = hex2rgb("#0f172a")
    bottom = lerp(hex2rgb("#1e293b"), hex2rgb(accent), 0.12)
    v_gradient(draw, top, bottom)
    draw_grid_pattern(draw, accent)

    # accent glow block on the left
    accent_rgb = hex2rgb(accent)
    draw.rectangle([0, 0, 12, H], fill=(accent_rgb[0], accent_rgb[1], accent_rgb[2], 255))

    reg = ImageFont.truetype(REG, 30)
    bold = ImageFont.truetype(BOLD, 58)
    foot = ImageFont.truetype(REG, 26)

    # kicker
    kx, ky = 70, 120
    draw.text((kx, ky), kicker, font=reg, fill=(accent_rgb[0], accent_rgb[1], accent_rgb[2], 255))

    # title (wrapped)
    lines = wrap_text(title, bold, W - 2 * 70)
    ty = 180
    lh = 76
    for ln in lines[:3]:
        draw.text((70, ty), ln, font=bold, fill=(241, 245, 249, 255))
        ty += lh

    # footer
    draw.text((70, H - 80), "GridLens · 加密网格监控", font=foot, fill=(148, 163, 184, 255))

    out = os.path.join(OUT, fname)
    img.convert("RGB").save(out, "PNG")
    print("wrote", out)


if __name__ == "__main__":
    for f, k, t, a in ARTICLES:
        gen(f, k, t, a)
    print("done")
