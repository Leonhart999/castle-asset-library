// Extra materials and helpers for the weapons, armour and siege-engine modules (stage 5).
// Same conventions as kit.js: 1 unit = 1 m, UVs in metres, base at y = 0, front faces +Z.
// Modules call armsBuilder(M) instead of newBuilder(M) so they can use both the shared kit
// materials and the extra slots below without editing kit.js.

import * as THREE from 'three';
import * as G from './geo.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { newBuilder, bevelBox } from './kit.js';
import { pbr } from './materials.js';

const cache = new WeakMap();

/** Set M[PLACEHOLDER] = true to get untextured stand-ins (used by headless geometry checks in Node). */
export const PLACEHOLDER = Symbol('placeholder-materials');

/**
 * Factories for the extra material slots. Texture-backed names trace back to library/materials/<category>/<id>.
 * Module files may define more local slots the same way and pass them to armsBuilder(M, localFactories).
 */
export const ARMS_MATERIALS = {
  // heavy adzed beams for siege engines and frames
  siegeTimber: () => pbr('weathered_brown_planks', { name: 'siege_timber', tile: 1.6, color: 0xb9a690, normalScale: 1.3 }),
  // freshly sawn end grain for log ends and beam ends
  endGrain: () => pbr('rough_wood', { name: 'end_grain', tile: 0.35, color: 0xf2d5a2, normalScale: 0.6 }),
  // twisted hemp rope (fibrous grey straw texture tinted to hemp; rough_linen is blue and turns green when tinted)
  rope: () => pbr('thatch_roof_angled', { name: 'hemp_rope', tile: 0.12, color: 0xe6c48e, normalScale: 1.5 }),
  // raw ox hide stretched over siege towers, rams and quivers; double-sided thin shells
  hide: () => pbr('leather_white', { name: 'rawhide', tile: 0.9, color: 0x9a7b58, roughness: 1, normalScale: 1.4, side: THREE.DoubleSide }),
  // yew self bow, honey sapwood colour
  yew: () => pbr('oak_wood_planks', { name: 'yew_wood', tile: 0.5, color: 0xc98a4e, roughness: 0.75, normalScale: 0.8 }),
  // boulders and shaped stone shot
  boulder: () => pbr('rock_04', { name: 'boulder', tile: 0.8, color: 0xb4b2ae, normalScale: 1.3 }),
  // soot-blackened iron for cauldrons and fire baskets
  blackIron: () => pbr('wrought_iron', { name: 'sooty_iron', tile: 0.5, metalness: 0.85, roughness: 0.95, color: 0x5a5652, normalScale: 1.0 }),
  // hot pitch / oil: dark and glossy
  pitch: () => new THREE.MeshStandardMaterial({ name: 'hot_pitch', color: 0x1c140a, roughness: 0.12, metalness: 0 }),
  // goose feather fletching (light grey, soft), double-sided thin vanes
  feather: () => pbr('leather_white', { name: 'goose_feather', tile: 0.08, color: 0xd8d3c8, roughness: 0.9, normalScale: 0.4, side: THREE.DoubleSide }),
  // waxed linen bowstrings and crossbow strings
  string: () => new THREE.MeshStandardMaterial({ name: 'waxed_string', color: 0xd8cfb5, roughness: 0.55 }),
};

/**
 * Returns the shared kit materials M plus every slot in `factories` (default ARMS_MATERIALS) that M lacks.
 * Created once per M and factory table, so every module shares the same material objects.
 */
export function armsMaterials(M, factories = ARMS_MATERIALS) {
  let perM = cache.get(M);
  if (!perM) cache.set(M, (perM = new Map()));
  if (!perM.has(factories)) {
    const extra = {};
    for (const [k, make] of Object.entries(factories)) {
      if (k in M) continue;
      extra[k] = M[PLACEHOLDER] ? new THREE.MeshBasicMaterial({ name: k }) : make();
    }
    perM.set(factories, extra);
  }
  return perM.get(factories);
}

/** Builder that knows the shared kit materials, the extra arms materials and optional module-local factories. */
export function armsBuilder(M, localFactories = null) {
  return newBuilder({ ...M, ...armsMaterials(M), ...(localFactories ? armsMaterials(M, localFactories) : {}) });
}

/** Deterministic pseudo-random numbers, so every build produces identical geometry. */
export function makeRand(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Bevelled rectangular beam from point a to point c (3D). Cross-section is w (along the "up"
 * side) by d. `up` picks the roll: the w side lies in the plane of the beam and `up`.
 * `ext` lengthens the beam at both ends (for overlapping joints).
 */
export function beam(a, c, w, d, { up = [0, 1, 0], bevel = 0.01, ext = 0 } = {}) {
  const A = new THREE.Vector3(...a);
  const C = new THREE.Vector3(...c);
  const dir = C.clone().sub(A);
  const len = dir.length() + ext * 2;
  dir.normalize();
  let U = new THREE.Vector3(...up);
  let Z = new THREE.Vector3().crossVectors(dir, U);
  if (Z.lengthSq() < 1e-8) {
    U = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    Z = new THREE.Vector3().crossVectors(dir, U);
  }
  Z.normalize();
  const Y = new THREE.Vector3().crossVectors(Z, dir).normalize();
  const g = bevelBox(len, w, d, bevel);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(dir, Y, Z));
  g.translate((A.x + C.x) / 2, (A.y + C.y) / 2, (A.z + C.z) / 2);
  return g;
}

/** Round tube through 3D points (CatmullRom), for ropes, straps and handles. */
export function tube(pts, r, segs = 24, radial = 8, closed = false) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z = 0]) => new THREE.Vector3(x, y, z)), closed);
  return G.boxUV(new THREE.TubeGeometry(curve, segs, r, radial, closed));
}

/** Rope hanging between two points with a parabolic sag (metres, downwards). */
export function ropeSpan(a, c, r = 0.012, sag = 0.05, segs = 16) {
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    pts.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (c[2] - a[2]) * t]);
  }
  return tube(pts, r, segs * 2, 6);
}

/**
 * Helical rope lashing around a cylinder lying along +Y (radius R, from y0 to y1, `turns` turns).
 * Transform it into place with b.add(..., pos, rotY, rotX, rotZ).
 */
export function lashing(R, y0, y1, turns = 6, r = 0.008) {
  const pts = [];
  const n = Math.max(12, Math.round(turns * 14));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * Math.PI * 2;
    pts.push([Math.cos(a) * (R + r * 0.6), y0 + (y1 - y0) * t, Math.sin(a) * (R + r * 0.6)]);
  }
  return tube(pts, r, n * 2, 6);
}

/**
 * Irregular rounded boulder (perturbed icosphere), radius ~r, deterministic per seed; `cuts` adds flat fracture faces.
 * Base is NOT moved to y = 0; the geometry is centred on the origin.
 */
export function boulder(r = 0.25, seed = 1, { detail = 2, rough = 0.18, squash = 0.85, cuts = 0, flat = false } = {}) {
  const rand = makeRand(seed * 7919 + 13);
  const ico = new THREE.IcosahedronGeometry(r, detail);
  ico.deleteAttribute('normal');
  ico.deleteAttribute('uv');
  const g = mergeVertices(ico, 1e-5); // shared vertices, so the boulder is smooth-shaded
  const pos = g.attributes.position;
  // a few random low-frequency lobes, applied consistently to shared vertices
  const lobes = [];
  for (let i = 0; i < 5; i++) {
    const v = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize();
    lobes.push([v, (rand() * 2 - 1) * rough]);
  }
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    let s = 1;
    for (const [d, k] of lobes) s += k * Math.max(0, n.dot(d)) ** 2;
    s += 0.03 * Math.sin(n.x * 9 + seed) * Math.cos(n.z * 7 - seed);
    v.multiplyScalar(s);
    v.y *= squash;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  // `cuts` flat fracture planes: vertices beyond a plane are projected onto it (quarried, broken-stone look)
  const rc = makeRand(seed * 104729 + 7);
  for (let k = 0; k < cuts; k++) {
    const n = new THREE.Vector3(rc() * 2 - 1, (rc() * 2 - 1) * 0.8, rc() * 2 - 1).normalize();
    const d = r * (0.62 + rc() * 0.22);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const e = v.dot(n) - d;
      if (e > 0) {
        v.addScaledVector(n, -e);
        pos.setXYZ(i, v.x, v.y, v.z);
      }
    }
  }
  // flat: faceted rubble (per-face normals) instead of a smooth, water-worn boulder
  const out = flat ? g.toNonIndexed() : g;
  out.computeVertexNormals();
  return G.boxUV(out);
}
