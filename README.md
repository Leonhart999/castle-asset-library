# Castle Asset Library

A reusable asset library for realistic European medieval castles (3D, glTF/GLB, PBR).

## Stage 1: PBR materials

346 curated CC0 material sets from [Poly Haven](https://polyhaven.com) in 11 categories, each with
`diff` (base colour), `nor` (OpenGL normal) and `arm` (AO / roughness / metalness packed in R/G/B).

| Category | Sets | What it covers | Res |
| --- | --- | --- | --- |
| `masonry-wall` | 63 | castle and church blocks, ashlar, rubble, sandstone, mossy and broken stone | 2k |
| `brick-wall` | 32 | red, dark, yellow and worn brick walls | 2k |
| `rock-cliff` | 15 | cliff faces, boulders, lichen and dark rock | 2k |
| `stone-floor` | 41 | cobblestone, flagstone, slate, monastery floors, paving | 2k |
| `fine-stone` | 13 | marble, granite tiles, mosaic, terrazzo | 2k |
| `plaster` | 38 | lime plaster, stucco, worn, damaged and peeling render | 2k |
| `wood` | 52 | planks, beams, gates, doors, tables, shutters, floors, bark | 2k |
| `roof` | 19 | slate, clay tile, thatch, reed | 2k |
| `metal` | 18 | rusty iron, plates, grates, shutters | 1k |
| `fabric-leather` | 13 | leather, wool, carpet, jacquard, linen | 1k |
| `ground` | 42 | mud, gravel, grass, forest floor, snow, dirt paths | 1k |

Some ids were picked by name and not looked at yet (for example the modern-looking `brick_wall_*` sets), so prune
`manifest/materials.json` if a set looks out of place.

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

## Stage 2: modular architecture

Procedurally modelled three.js modules built on this library's own PBR materials and exported as GLB.

| Family | Modules |
| --- | --- |
| wall | `wall_straight`, `wall_straight_crenellated`, `wall_straight_loophole`, `wall_corner` |
| battlement | `battlement_straight`, `battlement_corner` |
| arch | `wall_arch_round`, `wall_arch_pointed` |
| tower | `tower_round`, `tower_round_roofed`, `tower_square` |
| gate | `gatehouse` (portcullis half raised, doors open), `gatehouse_closed` |

Conventions: 1 unit = 1 m, base at y = 0, centred on x = z = 0, +Z is the outer (field) face. Straight wall
modules are 4 m long and 2 m thick with the walkway at y = 8; the towers have it at y = 12 and the gatehouse at
y = 11. Wall modules centred 5.2 m from a round tower, 5 m from a square tower or 6 m from the gatehouse join them
flush, and the corner's two arms end at x = -2 and z = -2. `src/modules/demo.js` assembles a run of castle from
these modules to check that the joins line up.

```bash
npm install
npm run build:models             # GLBs in library/models/glb (gitignored), previews/*.png and index.json
npm run build:models gatehouse   # only modules whose id contains the filter
npm run dev                      # viewer on http://127.0.0.1:5174/viewer/index.html
```

Viewer parameters: `?module=<id>` focuses one module, `?demo=1` shows the assembled run, `?view=front|back|side|top`
gives a narrow-field-of-view elevation. `node scripts/shot.mjs <out.png> [module-id]` takes a headless screenshot
while the dev server runs (`VIEW=` and `DEMO=1` env vars match the parameters), and
`node scripts/ascii-preview.mjs <png> [cols] [rows] ['' diff]` prints a rough text map of a render.

Material slots are shared by every module (`src/lib/kit.js`): `stone`, `dressed`, `timber`, `iron`, `roof`, `gilt`,
`void`. Change the library ids there to re-skin the whole kit. Material names in the exported GLBs equal the library
ids, so they can be traced back to `library/materials/<category>/<id>`.

## Planned next stages

Props (furniture, barrels, weapons, lighting).
