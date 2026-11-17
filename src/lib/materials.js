// PBR materials built from this library's own texture sets
// (library/materials/<category>/<id>/{diff,nor,arm}_<res>.jpg, listed in index.json).
// UVs on every piece are in metres, so one texture repeat covers `tile` metres:
// by default the real-world size recorded in the set's meta.json.

import * as THREE from 'three';

const ROOT = '/library/materials/';
const loader = new THREE.TextureLoader();
const cache = new Map();
let index = null;
let maxAniso = 8;

export function setMaxAnisotropy(renderer) {
  maxAniso = renderer.capabilities.getMaxAnisotropy();
}

/** Loads library/materials/index.json; call once before creating materials. */
export async function loadMaterialIndex() {
  if (index) return index;
  const res = await fetch(`${ROOT}index.json`);
  if (!res.ok) throw new Error(`Cannot load ${ROOT}index.json (${res.status}); run: npm run fetch-materials`);
  index = new Map((await res.json()).map((m) => [m.id, m]));
  return index;
}

function baseTexture(meta, map, srgb) {
  const key = `${meta.id}/${map}`;
  if (cache.has(key)) return cache.get(key);
  const file = meta.maps.find((f) => f.startsWith(`${map}_`) && !f.includes('_alt_'));
  if (!file) throw new Error(`${meta.id}: no ${map} map in meta.json`);
  let done;
  const ready = new Promise((r) => (done = r));
  const url = `${ROOT}${meta.category}/${meta.id}/${file}`;
  const tex = loader.load(url, () => done(), undefined, () => {
    console.error('[castle-lib] missing texture', url);
    done();
  });
  tex.userData.ready = ready;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = maxAniso;
  cache.set(key, tex);
  return tex;
}

/** Waits for every texture requested so far to finish loading. */
export function texturesReady() {
  return Promise.all([...cache.values()].map((t) => t.userData.ready));
}

/**
 * MeshStandardMaterial from a library material id.
 * Options: tile (metres per repeat, default = real-world size), tileX/tileY, rotate,
 * color, roughness, metalness (use 1 for bare metal), normalScale, aoIntensity, side, name.
 * The material name defaults to the library id so exported GLBs can be traced back.
 */
export function pbr(id, o = {}) {
  if (!index) throw new Error('Call loadMaterialIndex() before pbr()');
  const meta = index.get(id);
  if (!meta) throw new Error(`Unknown material "${id}" (not in library/materials/index.json)`);
  const real = meta.dimensions_mm?.[0] ? meta.dimensions_mm[0] / 1000 : 2;
  const tile = o.tile ?? real;
  const make = (map, srgb) => {
    const t = baseTexture(meta, map, srgb).clone();
    t.userData = { mimeType: 'image/jpeg' }; // keep JPEG when exporting GLB
    t.repeat.set(1 / (o.tileX ?? tile), 1 / (o.tileY ?? tile));
    if (o.rotate) t.rotation = o.rotate;
    t.needsUpdate = true;
    return t;
  };
  const arm = make('arm', false);
  const mat = new THREE.MeshStandardMaterial({
    name: o.name ?? id,
    map: make('diff', true),
    normalMap: make('nor', false),
    roughnessMap: arm,
    metalnessMap: arm, // same texture object so the GLB exporter does not re-composite it
    aoMap: arm,
    aoMapIntensity: o.aoIntensity ?? 1,
    roughness: o.roughness ?? 1,
    metalness: o.metalness ?? 0,
    color: new THREE.Color(o.color ?? 0xffffff),
    side: o.side ?? THREE.FrontSide,
  });
  mat.normalScale.set(o.normalScale ?? 1, o.normalScale ?? 1);
  return mat;
}
