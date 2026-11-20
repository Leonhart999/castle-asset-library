"""Download CC0 PBR material sets from ambientCG (https://ambientcg.com) listed in manifest/materials.json.

Each category in the manifest may list ambientCG asset ids under "ambientcg". For every id this script downloads
the <res>-JPG zip, keeps the colour and OpenGL normal maps, packs ambient occlusion / roughness / metalness into
one ARM texture (R/G/B, the same layout as the Poly Haven sets), keeps the opacity map when there is one and
writes meta.json. The index (library/materials/index.json) is then rebuilt by fetch-materials.mjs --index.

Usage: python scripts/fetch-ambientcg.py [filter]
  filter: optional substring matched against the category or the asset id.
Downloads go through curl, so HTTPS_PROXY / ALL_PROXY are honoured if ambientCG is slow on your network.
Needs Pillow.
"""
import io
import json
import os
import subprocess
import sys
import time
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "library" / "materials"
CACHE = ROOT / "scratch" / "ambientcg-cache"
API = "https://ambientcg.com/api/v2/full_json?id={id}&include=tagData,displayData,dimensionsData"
ZIP = "https://ambientcg.com/get?file={id}_{res}-JPG.zip"

# ambientCG gives no physical size for many sets; these are rough real-world repeats (mm) by id prefix,
# recorded with "dimensions_estimated": true so they can be told apart from measured sizes.
SIZE_HINTS_MM = {
    "Chainmail": 300,
    "Rope": 500,
    "TreeEnd": 600,
    "Leather": 1000,
    "Fabric": 1000,
    "Metal": 1000,
    "Rust": 1000,
    "MetalPlates": 2000,
}


def curl(url, dest=None, tries=4):
    args = ["curl", "-sSL", "--fail", "-m", "900", "-A", "castle-asset-library-fetcher", url]
    if dest:
        args += ["-o", str(dest)]
    for attempt in range(tries):
        r = subprocess.run(args, capture_output=True)
        if r.returncode == 0:
            return r.stdout
        if attempt == tries - 1:
            raise RuntimeError(f"curl {url}: {r.stderr.decode(errors='replace').strip()}")
        time.sleep(2 * (attempt + 1))


def size_hint(asset_id):
    for prefix in sorted(SIZE_HINTS_MM, key=len, reverse=True):
        if asset_id.startswith(prefix) and asset_id[len(prefix) : len(prefix) + 1].isdigit():
            return SIZE_HINTS_MM[prefix]
    return None


def member(zf, suffix):
    for name in zf.namelist():
        if name.endswith(suffix):
            return name
    return None


def grey(zf, suffix, size, fill):
    name = member(zf, suffix)
    if not name:
        return Image.new("L", size, fill)
    im = Image.open(io.BytesIO(zf.read(name))).convert("L")
    return im if im.size == size else im.resize(size, Image.LANCZOS)


def fetch(category, asset_id, res):
    d = OUT / category / asset_id
    meta_path = d / "meta.json"
    if meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        if all((d / m).exists() for m in meta["maps"]):
            return f"  = {category}/{asset_id}"

    info = json.loads(curl(API.format(id=asset_id)))["foundAssets"]
    info = next((a for a in info if a["assetId"] == asset_id), None)
    if not info:
        raise RuntimeError(f"{asset_id}: not found on ambientCG")

    tag = res.upper()  # 1k -> 1K
    CACHE.mkdir(parents=True, exist_ok=True)
    zpath = CACHE / f"{asset_id}_{tag}-JPG.zip"
    if not zpath.exists():
        part = zpath.with_suffix(".part")
        curl(ZIP.format(id=asset_id, res=tag), part)
        part.replace(zpath)

    d.mkdir(parents=True, exist_ok=True)
    maps = []
    with zipfile.ZipFile(zpath) as zf:
        color = member(zf, "_Color.jpg")
        normal = member(zf, "_NormalGL.jpg")
        if not color or not normal:
            raise RuntimeError(f"{asset_id}: zip has no Color or NormalGL map")
        # ambientCG ships near-lossless JPEGs (2-3x the size of the Poly Haven ones); re-encode at q92 4:4:4.
        diff_im = Image.open(io.BytesIO(zf.read(color))).convert("RGB")
        diff_im.save(d / f"diff_{res}.jpg", quality=92, subsampling=0)
        Image.open(io.BytesIO(zf.read(normal))).convert("RGB").save(d / f"nor_{res}.jpg", quality=92, subsampling=0)
        maps += [f"diff_{res}.jpg", f"nor_{res}.jpg"]

        size = diff_im.size
        ao = grey(zf, "_AmbientOcclusion.jpg", size, 255)
        rough = grey(zf, "_Roughness.jpg", size, 200)
        metal = grey(zf, "_Metalness.jpg", size, 0)
        Image.merge("RGB", (ao, rough, metal)).save(d / f"arm_{res}.jpg", quality=92, subsampling=0)
        maps.append(f"arm_{res}.jpg")

        if member(zf, "_Opacity.jpg"):
            grey(zf, "_Opacity.jpg", size, 255).save(d / f"opacity_{res}.jpg", quality=92)
            maps.append(f"opacity_{res}.jpg")
        has = {k: bool(member(zf, f"_{k}.jpg")) for k in ("AmbientOcclusion", "Roughness", "Metalness")}

    dims, estimated = None, False
    if info.get("dimensionX") and info.get("dimensionY"):
        dims = [int(info["dimensionX"]) * 10, int(info["dimensionY"]) * 10]  # ambientCG sizes are in cm
    elif size_hint(asset_id):
        dims, estimated = [size_hint(asset_id)] * 2, True

    meta = {
        "id": asset_id,
        "name": info.get("displayName") or asset_id,
        "category": category,
        "tags": [t for t in info.get("tags", []) if not t.isdigit() and t.lower() != asset_id.lower()],
        "ambientcg_category": info.get("displayCategory"),
        "dimensions_mm": dims,
        "res": res,
        "maps": sorted(maps),
        "license": "CC0",
        "source": f"https://ambientcg.com/a/{asset_id}",
    }
    if estimated:
        meta["dimensions_estimated"] = True
    # Channels the zip had no map for were filled with a constant (0-255), noted here.
    defaults = {"AmbientOcclusion": 255, "Roughness": 200, "Metalness": 0}
    filled = {k: defaults[k] for k, present in has.items() if not present}
    if filled:
        meta["arm_filled"] = filled
    meta_path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    zpath.unlink()
    return f"  + {category}/{asset_id} ({len(maps)} maps{', size estimated' if estimated else ''})"


def main():
    flt = sys.argv[1] if len(sys.argv) > 1 else ""
    manifest = json.loads((ROOT / "manifest" / "materials.json").read_text(encoding="utf-8"))
    jobs = [
        (cat, aid, spec["res"])
        for cat, spec in manifest["categories"].items()
        for aid in spec.get("ambientcg", [])
        if flt in cat or flt in aid
    ]
    print(f"{len(jobs)} ambientCG sets")
    failed = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(fetch, *j): j for j in jobs}
        for f in as_completed(futures):
            try:
                print(f.result(), flush=True)
            except Exception as err:  # noqa: BLE001
                failed.append(futures[f][1])
                print(f"  x {err}", flush=True)
    subprocess.run(["node", str(ROOT / "scripts" / "fetch-materials.mjs"), "--index"], check=True)
    if failed:
        print("failed:", " ".join(failed))
        sys.exit(1)


if __name__ == "__main__":
    main()
