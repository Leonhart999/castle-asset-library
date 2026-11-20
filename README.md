# Castle Asset Library

A reusable asset library for realistic European medieval castles (3D, glTF/GLB, PBR).

## Stage 1: PBR materials

349 curated CC0 material sets in 11 categories (346 from [Poly Haven](https://polyhaven.com) plus 3 seamless
procedural medieval metals: `forged_steel`, `wrought_iron`, `aged_brass`), each with `diff` (base colour), `nor`
(OpenGL normal) and `arm` (AO / roughness / metalness packed in R/G/B).

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
| `metal` | 21 | forged weapon steel, wrought iron, aged brass, rusty iron, plates, grates | 1k |
| `fabric-leather` | 13 | leather, wool, carpet, jacquard, linen | 1k |
| `ground` | 42 | mud, gravel, grass, forest floor, snow, dirt paths | 1k |

Some ids were picked by name and not looked at yet (for example the modern-looking `brick_wall_*` sets), so prune
`manifest/materials.json` if a set looks out of place.

```bash
node scripts/fetch-materials.mjs          # download everything in manifest/materials.json
node scripts/fetch-materials.mjs wood     # only a category or ids containing "wood"
python scripts/generate-metal-pbr.py      # generate forged_steel, wrought_iron, aged_brass (needs numpy + Pillow)
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

Material slots are shared by every module (`src/lib/kit.js`): `stone`, `dressed`, `timber`, `iron`, `roof`, `oak`,
`darkWood`, `barrel`, `steel`, `leather`, `fabric`, `linen`, `straw`, `gilt`, `wax`, `flameCore`, `flame`, `ember`,
`void`. Change the library ids there to re-skin the kit. Texture-backed material names match the library ids (except
variants like `crimson_fabric`, `beeswax`, `brass_gilt`, `glowing_charcoal`), so maps trace back to
`library/materials/<category>/<id>`.

## Stage 3: props

19 medieval castle props built with the same unit (`1 unit = 1 m`, base at `y = 0`) and export pipeline (`start.bat`
launches the viewer directly on Windows):

| Family | Props |
| --- | --- |
| furniture | `table_banquet`, `bench_wooden`, `chair_lord`, `bed_canopy`, `bookshelf_oak` |
| container | `barrel_oak`, `crate_wooden`, `chest_treasure`, `sack_grain` |
| weapon | `sword_arming`, `halberd`, `shield_heater`, `weapon_rack`, `archery_target` |
| lighting | `torch_wall`, `sconce_candle`, `chandelier_wheel`, `brazier_standing`, `candelabra_floor` |

## Stage 4: room props

14 props for the rooms of a castle, built with the same conventions and export pipeline as stage 3 (shared helpers live in `src/lib/props.js`):

| Family | Props |
| --- | --- |
| workshop | `anvil_smith`, `bellows_hand`, `grindstone_wheel` |
| kitchen | `cauldron_tripod`, `jug_clay`, `amphora_wine`, `tableware_pewter`, `table_butcher` |
| chapel | `altar_stone`, `pew_wooden`, `lectern_book`, `font_baptismal` |
| heraldry | `banner_standing`, `arms_shield_wall` (wall-mounted, back at `z = 0`) |

Review tooling: `npm run review <filter|all> [cols] [rows] [views|none]` checks every matching module (NaN and zero-area triangles, lowest point at y = 0, triangles per material) and prints ASCII renders from several directions. Filters are comma-separated ID substrings, exact IDs (`=id`), or `cat:<category>`, and work the same way in `npm run build:models`, in the viewer (`?filter=`) and in the review script.

## Stage 5: architectural elements

25 standalone European medieval building components. The freestanding arches complement the existing curtain-wall arch modules; window models include their own masonry surrounds.

| Family | Models |
| --- | --- |
| Arches and vault | `arch_pointed`, `arch_round`, `arch_ribbed`, `vault_ribbed` |
| Windows | `window_slit`, `window_pointed`, `window_rose`, `window_stained` |
| Access | `stair_spiral`, `stair_straight`, `ladder_straight`, `landing_platform` |
| Fireplace and chimney | `fireplace_hearth`, `chimney_stack` |
| Roofs | `roof_slate`, `roof_clay_tile`, `roof_thatch` |
| Structures and carving | `truss_timber`, `pillar_beam_stone`, `pillar_beam_timber`, `gargoyle_spout` |
| Door and ironwork | `door_ironbound`, `hardware_knocker`, `hardware_hinge`, `hardware_latch` |

Assets use metres and Y-up. Roof bays have a nominal 4 m repeat along X; the thatch ridge cap projects 4 cm at each end. The straight stair rises 2 m to the landing datum. The timber ladder is exported upright so its angle can be set in the destination scene. Standalone door hardware faces +Z with its mounting plane at z = 0.

```bash
npm run build:models -- "=arch_pointed,=arch_round,=arch_ribbed,=vault_ribbed,cat:window,cat:stair,cat:hearth,cat:roof,cat:structure,cat:door"
```

See [the model index](library/models/index.json) for measured bounds, triangle counts and preview paths.

## Planned next stages

Courtyard, stable and dungeon props, or scene assembly.
