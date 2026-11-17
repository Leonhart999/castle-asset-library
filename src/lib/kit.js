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
  merlonH: 1.1,
  capH: 0.1, // dressed cap slab on every merlon (merlon plus cap is still 1.2 m)
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

/**
 * Merlon with a dressed cap slab on top. `pos` is the centre of its base, rotY turns it about Y.
 * `lift` raises the cap by a few millimetres where two caps overlap, so they do not z-fight.
 */
export function merlon(b, w, d, pos, rotY = 0, lift = 0) {
  b.add('stone', G.block(w, DIM.merlonH, d), pos, rotY);
  b.add('dressed', G.block(w + 0.12, DIM.capH, d + 0.12), [pos[0], pos[1] + DIM.merlonH + lift, pos[2]], rotY);
}

/**
 * Quoins: alternating long and short corner stones standing 6 cm proud of a vertical corner.
 * The corner is at (cx, cz); (ox, oz) are +-1 and point away from the wall body; y0..y1 is the height range.
 */
export function quoins(b, cx, cz, ox, oz, y0, y1, { long = 0.9, short = 0.4, course = 0.5, proud = 0.06 } = {}) {
  const n = Math.floor((y1 - y0) / course);
  for (let i = 0; i < n; i++) {
    const wx = i % 2 ? short : long;
    const wz = i % 2 ? long : short;
    b.add('dressed', G.block(wx, course - 0.04, wz), [cx + ox * (proud - wx / 2), y0 + i * course + 0.02, cz + oz * (proud - wz / 2)]);
  }
}

/** Dressed frame around an arrow loop on the outer (+Z) face of a wall; z is the face position. */
export function slitFrame(b, x, y, w, h, z, { f = 0.16, proud = 0.07 } = {}) {
  const depth = proud + 0.05;
  const cz = z - 0.05 + depth / 2;
  b.add('dressed', G.block(f, h, depth), [x - (w + f) / 2, y, cz]);
  b.add('dressed', G.block(f, h, depth), [x + (w + f) / 2, y, cz]);
  b.add('dressed', G.block(w + 2 * f, f, depth), [x, y + h, cz]);
  b.add('dressed', G.block(w + 2 * f, f, depth), [x, y - f, cz]);
}

/** Dressed plinth along X from x0 to x1 with sloped faces: T + 2 * proud wide at the foot, T + 2 * top at height h. */
export function batteredPlinth(x0, x1, T, { h = 1.0, proud = 0.35, top = 0.15 } = {}) {
  const lo = T / 2 + proud;
  const hi = T / 2 + top;
  const s = new THREE.Shape();
  s.moveTo(-lo, 0);
  s.lineTo(lo, 0);
  s.lineTo(hi, h);
  s.lineTo(-hi, h);
  s.lineTo(-lo, 0);
  return G.profileAlongX(s, x1 - x0, 1).translate(x0, 0, 0);
}

/**
 * Plinth for the L-shaped corner module in wall.js: its outline offset by d0 at the foot and d1 at the top, mitred
 * at the corners. The two end faces (x = -2 and z = -2) do not move, so the profile matches batteredPlinth.
 * Returns two geometries: the sloped skirt and the flat top.
 */
export function cornerPlinth(h = 1.0, d0 = 0.35, d1 = 0.15) {
  const ring = (d) => [[-2, -1 - d], [-1 - d, -1 - d], [-1 - d, -2], [1 + d, -2], [1 + d, 1 + d], [-2, 1 + d]];
  const lo = ring(d0);
  const hi = ring(d1);
  const v = [];
  for (let i = 0; i < lo.length; i++) {
    const j = (i + 1) % lo.length;
    const a = [lo[i][0], 0, lo[i][1]];
    const b2 = [lo[j][0], 0, lo[j][1]];
    const c = [hi[j][0], h, hi[j][1]];
    const d = [hi[i][0], h, hi[i][1]];
    v.push(...a, ...d, ...c, ...a, ...c, ...b2);
  }
  const skirt = new THREE.BufferGeometry();
  skirt.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  const top = new THREE.ShapeGeometry(new THREE.Shape(hi.map(([x, z]) => new THREE.Vector2(x, -z))));
  top.rotateX(-Math.PI / 2);
  top.translate(0, h, 0);
  return [G.boxUV(skirt), G.boxUV(top)];
}
