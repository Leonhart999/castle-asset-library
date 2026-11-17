# Castle Asset Library

A reusable asset library for realistic European medieval castles (3D, glTF/GLB, PBR).

## Stage 1: PBR materials

Curated CC0 material sets from [Poly Haven](https://polyhaven.com), each with
`diff` (base colour), `nor` (OpenGL normal) and `arm` (AO / roughness / metalness packed in R/G/B).

| Category | What it covers | Res |
| --- | --- | --- |
| `masonry-wall` | castle and church brick, ashlar, rubble, mossy and broken stone | 2k |
| `stone-floor` | cobblestone, flagstone, slate, monastery floors | 2k |
| `plaster` | lime plaster, worn and damaged render | 2k |
| `wood` | planks, beams, gates, doors, tables, shutters | 2k |
| `roof` | slate, clay tile, thatch, reed | 2k |
| `metal` | rusty iron, plates, grates | 1k |
| `fabric-leather` | leather, wool, carpet, jacquard | 1k |
| `ground` | mud, gravel, grass, forest floor, cliff rock | 1k |

```bash
node scripts/fetch-materials.mjs          # download everything in manifest/materials.json
node scripts/fetch-materials.mjs wood     # only a category or ids containing "wood"
```

Layout:

```
manifest/materials.json            what to fetch (edit this to add or remove materials)
scripts/fetch-materials.mjs        downloader, writes meta.json per material and the index
library/materials/<category>/<id>/ diff_*.jpg, nor_*.jpg, arm_*.jpg, meta.json
library/materials/index.json       flat list of every material (id, tags, source, licence)
```

Conventions: 1 unit = 1 metre; `meta.json` has the real-world size in mm when Poly Haven provides it,
so materials can be tiled at the correct scale.

## Planned next stages

Modular architecture (walls, battlements, towers, arches, gates), props (furniture, barrels, weapons,
lighting) and a preview viewer. Models will be exported as GLB.
