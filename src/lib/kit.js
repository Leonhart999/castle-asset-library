// Shared dimensions, materials and helpers for the modular castle kit.
// 1 unit = 1 metre. Straight wall modules are 4 m long, 8 m high to the walkway and
// 2 m thick. +Z is the outer (field) face, -Z the inner (courtyard) face. Every module
// is centred on x = 0 and z = 0 (wall centre line) with its base at y = 0.

import * as THREE from 'three';
import * as G from './geo.js';
import { pbr } from './materials.js';

export const DIM = {
  unit: 4, // length of a straight wall module
  wallH: 8, // walkway level (top of the coping slab)
  wallT: 2, // wall thickness
  coping: 0.35, // coping slab thickness
  slabOut: 0.5, // coping overhang on the outer face
  parapetH: 1.0, // solid parapet below the merlons
  parapetT: 0.6,
  merlonH: 1.2,
  merlonW: 1.2,
};

/**
 * Materials shared by every module. Material names equal the library ids, so an
 * exported GLB can always be traced back to library/materials/<category>/<id>.
 * Change the ids here to re-skin the whole kit.
 */
export function makeMaterials() {
  return {
    stone: pbr('castle_wall_slates'),
    dressed: pbr('large_sandstone_blocks', { color: 0xe6e0d4 }),
    timber: pbr('weathered_planks', { color: 0xb8a58c }),
    iron: pbr('rusty_metal_03', { metalness: 1, color: 0x9a9a9a }),
    // double-sided: hip and cone roofs are thin shells that are also seen from below
    roof: pbr('roof_slates_02', { side: THREE.DoubleSide }),
    void: new THREE.MeshStandardMaterial({ name: 'void', color: 0x050505, roughness: 1 }),
  };
}

export function newBuilder(M) {
  return new G.Builder(M);
}

/** Prism from a polygon in the XZ plane, from y0 to y1, with metre UVs. */
export function prismXZ(pts, y0, y1) {
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false });
  g.rotateX(-Math.PI / 2); // (x, y, z) -> (x, z, -y): shape y = -z_world, extrusion becomes height
  g.translate(0, y0, 0);
  return G.boxUV(g);
}

/**
 * Row of stepped corbels. `p` is the first position (XZ), `dir` the step direction,
 * `out` the unit vector the corbels point along, `y` the top of the corbel stack.
 */
export function corbelRow(b, mat, p, dir, count, step, out, y, { size = 0.34, proj = 0.5 } = {}) {
  const rotY = Math.atan2(out[0], out[1]);
  for (let i = 0; i < count; i++) {
    const x = p[0] + dir[0] * step * i;
    const z = p[1] + dir[1] * step * i;
    const upper = G.block(size, 0.3, proj).translate(0, 0, proj / 2);
    const lower = G.block(size, 0.3, proj * 0.6).translate(0, 0, proj * 0.3);
    b.add(mat, upper, [x, y - 0.3, z], rotY);
    b.add(mat, lower, [x, y - 0.6, z], rotY);
  }
}

/**
 * Dressed-stone ring around an opening (voussoirs and jambs) on one face.
 * Returned geometry spans z = 0..proud; place it on the face with b.add.
 */
export function archRing(o, width = 0.35, proud = 0.1) {
  const outer = new THREE.Shape();
  G.openingPath(outer, { x: o.x, y: o.y, w: o.w + width * 2, h: o.h + width, arch: o.arch });
  const hole = new THREE.Path();
  G.openingPath(hole, o);
  outer.holes.push(hole);
  return G.boxUV(new THREE.ExtrudeGeometry(outer, { depth: proud, bevelEnabled: false, curveSegments: 12 }));
}
