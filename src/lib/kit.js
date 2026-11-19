// Shared dimensions, materials and helpers for the modular castle kit.
// 1 unit = 1 metre. Straight wall modules are 4 m long, 8 m high to the walkway and
// 2 m thick. +Z is the outer (field) face, -Z the inner (courtyard) face. Every module
// is centred on x = 0 and z = 0 (wall centre line) with its base at y = 0.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
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
    iron: pbr('wrought_iron', { tile: 0.5, metalness: 0.96, roughness: 0.92, normalScale: 0.9 }),
    // double-sided: hip and cone roofs are thin shells that are also seen from below
    roof: pbr('roof_slates_02', { side: THREE.DoubleSide }),
    gilt: pbr('aged_brass', { tile: 0.4, metalness: 0.98, roughness: 0.85, normalScale: 0.55 }),
    void: new THREE.MeshStandardMaterial({ name: 'void', color: 0x050505, roughness: 1 }),
    // Prop materials (all texture-backed entries trace back to library/materials/<cat>/<id>)
    oak: pbr('oak_wood_planks', { tile: 1.2, color: 0xc8b193, normalScale: 1.25 }),
    darkWood: pbr('dark_wood', { tile: 1.4, color: 0x907f70, normalScale: 1.25 }),
    barrel: pbr('wooden_barrel', { tile: 1.1, color: 0xcbb9a0, normalScale: 1.3 }),
    steel: pbr('forged_steel', { tile: 0.45, metalness: 1.0, roughness: 0.85, color: 0xe8ecf2, normalScale: 0.55 }),
    leather: pbr('brown_leather', { tile: 0.4, color: 0xb59172, normalScale: 1.3 }),
    fabric: pbr('quatrefoil_jacquard_fabric', { name: 'crimson_fabric', tile: 0.32, color: 0x761d1d, normalScale: 1.35 }),
    linen: pbr('rough_linen', { tile: 0.35, color: 0xd9ceb8, normalScale: 1.25 }),
    straw: pbr('thatch_roof_angled', { tile: 0.7, color: 0xd6c192, normalScale: 1.35 }),
    wax: pbr('white_plaster_rough_01', { name: 'beeswax', tile: 0.25, color: 0xe7d6aa, roughness: 0.62, normalScale: 0.12 }),
    flameCore: new THREE.MeshStandardMaterial({ name: 'flame_core', color: 0xfff4c2, emissive: 0xffd260, emissiveIntensity: 3.0, roughness: 0.3 }),
    flame: new THREE.MeshStandardMaterial({ name: 'flame_outer', color: 0xff7818, emissive: 0xff5208, emissiveIntensity: 1.8, transparent: true, opacity: 0.46, depthWrite: false, roughness: 1 }),
    ember: pbr('dark_rock', { name: 'glowing_charcoal', tile: 0.3, color: 0x2c1b15, emissive: 0xb82e06, emissiveIntensity: 0.85, roughness: 0.92, normalScale: 1.4 }),
    // Workshop props (stage 4)
    bark: pbr('bark_brown_01', { tile: 0.9, color: 0xb8a58c, normalScale: 1.3 }),
    grindstone: pbr('old_sandstone_02', { tile: 0.6, color: 0xcfc4ae, normalScale: 1.2 }),
    // double-sided: the pleated bellows band is a thin shell seen from both sides
    bellowsLeather: pbr('brown_leather', { name: 'bellows_leather', tile: 0.4, color: 0x8f6a48, normalScale: 1.3, side: THREE.DoubleSide }),
    water: new THREE.MeshStandardMaterial({ name: 'water', color: 0x3f6670, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.8 }),
    // Kitchen props (stage 4)
    clay: pbr('clay_plaster', { name: 'terracotta', tile: 0.5, color: 0xb86a42, roughness: 0.9, normalScale: 0.7 }),
    pewter: pbr('forged_steel', { name: 'pewter', tile: 0.4, metalness: 0.85, roughness: 0.62, color: 0xb4b8bd, normalScale: 0.5 }),
    bread: pbr('white_plaster_rough_02', { name: 'bread_crust', tile: 0.3, color: 0xc4883f, roughness: 0.95, normalScale: 0.7 }),
    hearth: pbr('rock_boulder_dry', { name: 'hearth_stone', tile: 0.8, color: 0xc2b8aa, normalScale: 1.1 }),
    wine: new THREE.MeshStandardMaterial({ name: 'wine', color: 0x4a0f18, roughness: 0.15 }),
    broth: new THREE.MeshStandardMaterial({ name: 'broth', color: 0x5e3b1e, roughness: 0.3 }),
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

/**
 * Closed cylinder-like lathe from [r, y] points (ascending in y so normals point outward).
 */
export function lathe(pts, segs = 28) {
  const vecs = pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0), y));
  return G.cylUV(new THREE.LatheGeometry(vecs, segs));
}

/** Solid circular ring band centred at the origin, base at y = 0, radius r to centre of ring. */
export function ringBand(r, thick, h, segs = 36) {
  const ro = r + thick / 2;
  const ri = Math.max(0.005, r - thick / 2);
  const shape = new THREE.Shape();
  shape.absarc(0, 0, ro, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, ri, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: segs });
  g.rotateX(-Math.PI / 2);
  return G.cylUV(g, ro);
}

/** Chamfered/bevelled block centred on X and Z with base at y = 0. */
export function bevelBlock(w, h, d, bevel = 0.008, segs = 1, uvOpts) {
  const r = Math.min(bevel, w * 0.35, h * 0.35, d * 0.35);
  const g = new RoundedBoxGeometry(w, h, d, segs, r);
  g.translate(0, h / 2, 0);
  return G.boxUV(g, uvOpts);
}

/** Chamfered/bevelled box centred on X, Y and Z. */
export function bevelBox(w, h, d, bevel = 0.008, segs = 1, uvOpts) {
  const r = Math.min(bevel, w * 0.35, h * 0.35, d * 0.35);
  return G.boxUV(new RoundedBoxGeometry(w, h, d, segs, r), uvOpts);
}

/** Places small dome rivets at every [x, y, z] position (or oriented [x, y, z, rotY, rotX]). */
export function rivets(b, mat, pts, r = 0.007) {
  const dome = new THREE.SphereGeometry(r, 7, 5);
  for (const p of pts) b.add(mat, dome, [p[0], p[1], p[2]], p[3] || 0, p[4] || 0);
}

/**
 * Sweeps a rectangular flat bar (width w in XY plane, thickness t along Z) along a 2D curve,
 * capped at both ends. Never twists like Frenet frames, ideal for forged iron scrollwork.
 */
export function flatScroll(pts, w = 0.022, t = 0.008, steps = 20) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)));
  const sp = curve.getSpacedPoints(steps);
  const hw = w / 2;
  const ht = t / 2;
  const ring = [];
  for (let i = 0; i < sp.length; i++) {
    const prev = sp[Math.max(0, i - 1)];
    const next = sp[Math.min(sp.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const cx = sp[i].x;
    const cy = sp[i].y;
    ring.push([
      [cx + nx * hw, cy + ny * hw, ht],
      [cx - nx * hw, cy - ny * hw, ht],
      [cx - nx * hw, cy - ny * hw, -ht],
      [cx + nx * hw, cy + ny * hw, -ht],
    ]);
  }
  const v = [];
  const tri = (a, b2, c) => v.push(...a, ...b2, ...c);
  for (let i = 0; i < ring.length - 1; i++) {
    const r0 = ring[i];
    const r1 = ring[i + 1];
    for (let k = 0; k < 4; k++) {
      const n = (k + 1) % 4;
      tri(r0[k], r0[n], r1[n]);
      tri(r0[k], r1[n], r1[k]);
    }
  }
  // end caps
  const s = ring[0];
  tri(s[0], s[3], s[2]);
  tri(s[0], s[2], s[1]);
  const e = ring[ring.length - 1];
  tri(e[0], e[1], e[2]);
  tri(e[0], e[2], e[3]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return G.boxUV(g);
}

/** Irregular faceted charcoal lump built from a perturbed sphere's convex hull. */
export function charcoalLump(radius = 0.045, seed = 1) {
  let s = seed * 9301 + 49297;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const pts = [];
  for (let i = 0; i < 14; i++) {
    const u = rand() * 2 - 1;
    const th = rand() * Math.PI * 2;
    const sq = Math.sqrt(1 - u * u);
    const r = radius * (0.65 + rand() * 0.55);
    pts.push(new THREE.Vector3(sq * Math.cos(th) * r, u * r * 0.72, sq * Math.sin(th) * r));
  }
  return G.boxUV(new ConvexGeometry(pts));
}

/** Dual-layer candle flame (bright core + soft translucent outer halo). Base at pos. */
export function softFlame(b, pos, scale = 1) {
  const core = lathe([[0, 0], [0.008 * scale, 0.01 * scale], [0.006 * scale, 0.025 * scale], [0, 0.042 * scale]], 10);
  const outer = lathe([[0, 0], [0.016 * scale, 0.015 * scale], [0.013 * scale, 0.036 * scale], [0.004 * scale, 0.058 * scale], [0, 0.072 * scale]], 12);
  b.add('flameCore', core, pos);
  b.add('flame', outer, [pos[0], pos[1] - 0.004 * scale, pos[2]]);
}

/** Candle with scalloped drip pan, sunken wax pool, wax drips, burnt wick and soft dual-layer flame. */
export function candle(b, pos, { h = 0.22, r = 0.024, panR = 0.058, matPan = 'iron', seed = 1 } = {}) {
  const [x, y, z] = pos;
  // flared wrought-iron drip pan with raised candle cup collar
  b.add(
    matPan,
    lathe(
      [
        [0, 0],
        [panR * 0.55, 0],
        [panR, 0.018],
        [panR * 0.94, 0.024],
        [r + 0.006, 0.012],
        [r + 0.007, 0.034],
        [r + 0.002, 0.036],
        [0, 0.01],
      ],
      18,
    ),
    [x, y, z],
  );
  // wax pillar with slightly flared top rim and sunken melted pool
  const wPts = [
    [0, 0.01],
    [r, 0.01],
    [r * 0.96, 0.01 + h * 0.55],
    [r * 0.94, 0.01 + h * 0.96],
    [r, 0.01 + h],
    [r * 0.72, 0.01 + h - 0.012],
    [0, 0.01 + h - 0.014],
  ];
  b.add('wax', lathe(wPts, 16), [x, y, z]);
  // 2 solidified wax drips running down the side
  for (let d = 0; d < 2; d++) {
    const a = seed * 2.1 + d * 2.6;
    const dl = h * (0.32 + ((seed + d) % 3) * 0.14);
    b.add(
      'wax',
      G.cylinder(0.003, 0.005, dl, 6),
      [x + Math.cos(a) * (r - 0.001), y + 0.01 + h - dl / 2, z + Math.sin(a) * (r - 0.001)],
    );
  }
  // slightly bent burnt wick + dual-layer flame
  b.add('void', G.cylinder(0.0025, 0.003, 0.028, 6, { y0: 0.01 + h - 0.012 }), [x, y, z], 0, 0.14);
  softFlame(b, [x, y + 0.01 + h + 0.008, z], 0.95);
}
