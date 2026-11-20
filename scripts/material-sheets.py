"""Render one labelled swatch sheet per material category for quick browsing.

Reads library/materials/index.json and writes library/materials/sheets/<category>.jpg (gitignored like all
textures): a flat crop of each base-colour map with a light relief from its normal map, id and source below.

Usage: python scripts/material-sheets.py [category-filter]
Needs Pillow and numpy.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
LIB = ROOT / "library" / "materials"
TILE, COLS, LABEL = 192, 8, 30


def swatch(meta):
    d = LIB / meta["category"] / meta["id"]
    diff = next((m for m in meta["maps"] if m.startswith("diff_")), None)
    nor = next((m for m in meta["maps"] if m.startswith("nor_")), None)
    if not diff:
        return None
    im = Image.open(d / diff)
    im.draft("RGB", (TILE * 2, TILE * 2))  # fast JPEG downscale on decode
    rgb = np.asarray(im.convert("RGB").resize((TILE, TILE), Image.LANCZOS), dtype=np.float32)
    if nor:
        nim = Image.open(d / nor)
        nim.draft("RGB", (TILE * 2, TILE * 2))
        n = np.asarray(nim.convert("RGB").resize((TILE, TILE), Image.BILINEAR), dtype=np.float32)
        n = n / 127.5 - 1.0
        light = np.array([-0.45, 0.45, 0.77])  # from the upper left, OpenGL normals (+Y up)
        shade = np.clip((n * light).sum(-1), 0, 1)
        rgb *= (0.55 + 0.6 * shade)[..., None]
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))


def main():
    flt = sys.argv[1] if len(sys.argv) > 1 else ""
    index = json.loads((LIB / "index.json").read_text(encoding="utf-8"))
    out = LIB / "sheets"
    out.mkdir(exist_ok=True)
    font = ImageFont.load_default()
    cats = sorted({m["category"] for m in index if flt in m["category"]})
    for cat in cats:
        items = [m for m in index if m["category"] == cat]
        rows = (len(items) + COLS - 1) // COLS
        sheet = Image.new("RGB", (COLS * TILE, rows * (TILE + LABEL)), (24, 24, 24))
        draw = ImageDraw.Draw(sheet)
        for i, m in enumerate(items):
            x, y = (i % COLS) * TILE, (i // COLS) * (TILE + LABEL)
            sw = swatch(m)
            if sw:
                sheet.paste(sw.resize((TILE - 4, TILE - 4)), (x + 2, y + 2))
            src = "ambientCG" if "ambientcg.com" in m["source"] else ("Poly Haven" if "polyhaven" in m["source"] else "procedural")
            draw.text((x + 4, y + TILE + 1), m["id"][:30], fill=(235, 235, 235), font=font)
            draw.text((x + 4, y + TILE + 14), src, fill=(150, 150, 150), font=font)
        sheet.save(out / f"{cat}.jpg", quality=85)
        print(f"sheets/{cat}.jpg  {len(items)} materials")


if __name__ == "__main__":
    main()
