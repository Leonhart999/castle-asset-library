"""
Generates three seamless (tileable) 1024x1024 CC0 PBR metal material sets in
library/materials/metal/:
  - forged_steel : clean brushed & lightly hand-forged medieval weapon steel (no tread pattern)
  - wrought_iron : dark charcoal hand-hammered iron with subtle peen dimples and metallic sheen
  - aged_brass   : warm aged brass with fine polish marks and light patina

Each set writes diff_1k.jpg, nor_1k.jpg, arm_1k.jpg (R=AO, G=Roughness, B=Metalness) and meta.json.
"""

import json
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_METAL = os.path.join(ROOT, "library", "materials", "metal")
SIZE = 1024


def tileable_fbm(size, octaves, seed, power=1.6):
    """Generates a strictly seamless [0, 1] 2D fractal noise via periodic FFT spectrum."""
    rng = np.random.default_rng(seed)
    fy = np.fft.fftfreq(size)[:, None]
    fx = np.fft.rfftfreq(size)[None, :]
    freq = np.hypot(fx, fy)
    freq[0, 0] = 1.0
    amp = 1.0 / (freq ** power)
    amp[0, 0] = 0.0
    # band-limit by octaves
    cutoff = octaves / size
    amp *= np.exp(-0.5 * (freq / max(cutoff, 1e-4)) ** 2)
    phase = rng.uniform(0, 2 * np.pi, size=freq.shape)
    spec = amp * (np.cos(phase) + 1j * np.sin(phase))
    field = np.fft.irfft2(spec, s=(size, size))
    lo, hi = field.min(), field.max()
    return (field - lo) / max(hi - lo, 1e-8)


def tileable_scratches(size, count, seed, min_len=24, max_len=140, directional=0.0):
    """Draws thin seamless wrap-around micro-scratches into a [-1, 1] height delta field."""
    rng = np.random.default_rng(seed)
    acc = np.zeros((size, size), dtype=np.float32)
    for _ in range(count):
        x0 = rng.uniform(0, size)
        y0 = rng.uniform(0, size)
        if directional > 0 and rng.random() < directional:
            ang = rng.normal(0.0, 0.08)
        else:
            ang = rng.uniform(0, 2 * np.pi)
        length = rng.uniform(min_len, max_len)
        depth = rng.uniform(-1.0, -0.3)
        steps = int(length * 1.5)
        ts = np.linspace(0, length, steps)
        xs = np.round(x0 + np.cos(ang) * ts).astype(int) % size
        ys = np.round(y0 + np.sin(ang) * ts).astype(int) % size
        # fade ends smoothly
        fade = np.sin(np.linspace(0, np.pi, steps)).astype(np.float32)
        acc[ys, xs] += depth * fade
    # soft anti-alias via 3x3 wrap blur
    padded = np.pad(acc, 1, mode="wrap")
    blurred = (
        0.4 * acc
        + 0.1 * (padded[:-2, 1:-1] + padded[2:, 1:-1] + padded[1:-1, :-2] + padded[1:-1, 2:])
        + 0.05 * (padded[:-2, :-2] + padded[:-2, 2:] + padded[2:, :-2] + padded[2:, 2:])
    )
    return blurred


def tileable_hammer_dimples(size, count, seed, r_min=18, r_max=42):
    """Creates soft overlapping hand-forged hammer peen indentations, seamlessly wrapped."""
    rng = np.random.default_rng(seed)
    h = np.zeros((size, size), dtype=np.float32)
    yy, xx = np.mgrid[0:size, 0:size]
    for _ in range(count):
        cx = rng.uniform(0, size)
        cy = rng.uniform(0, size)
        r = rng.uniform(r_min, r_max)
        depth = rng.uniform(0.45, 1.0)
        dx = np.abs(xx - cx)
        dx = np.minimum(dx, size - dx)
        dy = np.abs(yy - cy)
        dy = np.minimum(dy, size - dy)
        d2 = (dx * dx + dy * dy) / (r * r)
        mask = d2 < 1.0
        h[mask] -= depth * (1.0 - d2[mask]) ** 2
    lo, hi = h.min(), h.max()
    if hi > lo:
        h = (h - lo) / (hi - lo)
    return h


def height_to_normal_gl(h, strength=2.0):
    """OpenGL tangent-space normal map (+Y up) from a seamless height field in [0, 1]."""
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * 0.5 * strength
    dy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * 0.5 * strength
    # In image coords y increases downward, so +Y up means dy flips sign
    nx = -dx
    ny = dy
    nz = np.ones_like(h)
    inv = 1.0 / np.sqrt(nx * nx + ny * ny + nz * nz)
    rgb = np.stack([(nx * inv * 0.5 + 0.5), (ny * inv * 0.5 + 0.5), (nz * inv * 0.5 + 0.5)], axis=-1)
    return np.clip(rgb * 255.0, 0, 255).astype(np.uint8)


def save_set(mat_id, name, tags, diff_rgb, nor_rgb, ao_u8, rough_u8, metal_u8):
    d = os.path.join(OUT_METAL, mat_id)
    os.makedirs(d, exist_ok=True)
    Image.fromarray(np.clip(diff_rgb, 0, 255).astype(np.uint8), "RGB").save(os.path.join(d, "diff_1k.jpg"), quality=94)
    Image.fromarray(nor_rgb, "RGB").save(os.path.join(d, "nor_1k.jpg"), quality=94)
    arm = np.stack([ao_u8, rough_u8, metal_u8], axis=-1)
    Image.fromarray(arm, "RGB").save(os.path.join(d, "arm_1k.jpg"), quality=94)
    meta = {
        "id": mat_id,
        "name": name,
        "category": "metal",
        "tags": tags,
        "polyhaven_categories": ["metal"],
        "dimensions_mm": [500, 500],
        "res": "1k",
        "maps": ["arm_1k.jpg", "diff_1k.jpg", "nor_1k.jpg"],
        "license": "CC0",
        "source": "procedural (scripts/generate-metal-pbr.py)",
    }
    with open(os.path.join(d, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
        f.write("\n")
    print(f"generated {mat_id:14} diff_mean={[round(float(diff_rgb[...,c].mean())) for c in range(3)]} rough_mean={round(float(rough_u8.mean()))} metal_mean={round(float(metal_u8.mean()))}")


def build_forged_steel():
    # Smooth brushed weapon steel with subtle organic forging variation and fine micro-scratches
    macro = tileable_fbm(SIZE, octaves=14, seed=101, power=1.7)
    fine = tileable_fbm(SIZE, octaves=160, seed=102, power=1.2)
    aniso_grain = tileable_fbm(SIZE, octaves=240, seed=103, power=1.1)
    # stretch grain gently along X without periodicity
    grain = 0.7 * aniso_grain + 0.3 * np.roll(aniso_grain, 3, axis=1)
    scratches = tileable_scratches(SIZE, 420, seed=104, min_len=18, max_len=110, directional=0.35)

    height = 0.55 * macro + 0.25 * fine + 0.2 * grain + 0.14 * scratches
    height = (height - height.min()) / (height.max() - height.min())
    nor = height_to_normal_gl(height, strength=1.4)

    base = 178 + 30 * macro + 12 * fine + 18 * np.clip(scratches, -0.5, 0)
    diff = np.stack([base * 0.96, base * 0.98, base * 1.02], axis=-1)

    ao = np.clip(235 + 20 * height, 200, 255).astype(np.uint8)
    rough = np.clip(68 + 38 * (1.0 - macro) + 22 * fine - 18 * scratches, 45, 145).astype(np.uint8)
    metal = np.full((SIZE, SIZE), 252, dtype=np.uint8)
    save_set("forged_steel", "Forged Weapon Steel", ["steel", "forged", "sword", "armour", "procedural"], diff, nor, ao, rough, metal)


def build_wrought_iron():
    # Charcoal hand-hammered medieval wrought iron
    dimples = tileable_hammer_dimples(SIZE, 220, seed=201, r_min=20, r_max=48)
    macro = tileable_fbm(SIZE, octaves=22, seed=202, power=1.6)
    grain = tileable_fbm(SIZE, octaves=180, seed=203, power=1.2)
    height = 0.62 * dimples + 0.24 * macro + 0.14 * grain
    height = (height - height.min()) / (height.max() - height.min())
    nor = height_to_normal_gl(height, strength=2.8)

    # Dark charcoal iron in hammer valleys, brighter cold iron on hammer ridges, subtle warm scale
    tone = 44 + 34 * height + 10 * macro
    warmth = np.clip(1.0 - height, 0, 1) * 8
    diff = np.stack([tone + warmth, tone + warmth * 0.4, tone + 2], axis=-1)

    ao = np.clip(195 + 60 * height, 175, 255).astype(np.uint8)
    rough = np.clip(165 - 55 * height + 25 * grain, 95, 205).astype(np.uint8)
    metal = np.clip(215 + 38 * height, 195, 255).astype(np.uint8)
    save_set("wrought_iron", "Hammered Wrought Iron", ["iron", "forged", "hammered", "blacksmith", "procedural"], diff, nor, ao, rough, metal)


def build_aged_brass():
    # Warm aged brass with light polish marks and recessed tarnish
    macro = tileable_fbm(SIZE, octaves=16, seed=301, power=1.7)
    fine = tileable_fbm(SIZE, octaves=140, seed=302, power=1.2)
    scratches = tileable_scratches(SIZE, 260, seed=303, min_len=16, max_len=90, directional=0.2)
    height = 0.6 * macro + 0.28 * fine + 0.12 * scratches
    height = (height - height.min()) / (height.max() - height.min())
    nor = height_to_normal_gl(height, strength=1.2)

    t = 0.45 + 0.55 * macro
    r = 150 + 62 * t + 10 * fine
    g = 118 + 52 * t + 8 * fine
    b = 58 + 30 * t + 5 * fine
    diff = np.stack([r, g, b], axis=-1)

    ao = np.clip(225 + 30 * height, 195, 255).astype(np.uint8)
    rough = np.clip(75 + 48 * (1.0 - macro) + 18 * fine, 52, 148).astype(np.uint8)
    metal = np.full((SIZE, SIZE), 248, dtype=np.uint8)
    save_set("aged_brass", "Aged Medieval Brass", ["brass", "bronze", "gilt", "polished", "procedural"], diff, nor, ao, rough, metal)


if __name__ == "__main__":
    build_forged_steel()
    build_wrought_iron()
    build_aged_brass()
    print("done")
