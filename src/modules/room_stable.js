// Stable props (stage 4): hay rack with feed trough, hay bales with a loose pile, saddle on a wooden stand and a tack wall.
// Base sits at y = 0, centred on x = z = 0, 1 unit = 1 m, front faces +Z.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import * as G from '../lib/geo.js';
import { newBuilder, bevelBlock, bevelBox, rivets } from '../lib/kit.js';
import { makeRand, tube, hoop } from '../lib/props.js';

/** Deterministic 3D noise that is a pure function of position, so split vertices stay welded. */
function noise3(x, y, z, ph) {
  return Math.sin(x * 6.3 + ph) * Math.cos(y * 5.1 + ph * 1.7) + 0.6 * Math.sin(z * 7.9 - ph * 0.6) * Math.cos(x * 4.3 + y * 3.1 + ph);
}

/** Weld duplicate vertices, rebuild smooth normals and metre UVs. */
function welded(g) {
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const m = mergeVertices(g, 1e-4);
  m.computeVertexNormals();
  return G.boxUV(m);
}

/** Lumpy half-ellipsoid of hay with a flat base at y = 0. */
function lump(rx, ry, rz, seed = 1, rough = 0.35) {
  const g = new THREE.IcosahedronGeometry(1, 3);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = 1 + rough * 0.5 * noise3(x, y, z, seed);
    p.setXYZ(i, x * k * rx, Math.max(y * k * ry, 0), z * k * rz);
  }
  return welded(g);
}

/** One thin straw stalk centred on its own origin, lying along Y. */
function straw(len) {
  return G.cylinder(0.0035, 0.0035, len, 4, { y0: -len / 2 });
}

/** Straws poking out of the surface of an ellipsoidal mound (centre, radii). */
function surfaceStraws(b, rand, n, [cx, cy, cz], [rx, ry, rz], len = 0.22) {
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const c = rand() * 0.92;
    const s = Math.sqrt(1 - c * c) * 0.97;
    b.push([cx + rx * s * Math.cos(a), cy + ry * c * 0.97, cz + rz * s * Math.sin(a)], rand() * Math.PI * 2);
    b.add('straw', straw(len * (0.7 + rand() * 0.6)), [0, 0, 0], 0, 0.8 + rand() * 0.7);
    b.pop();
  }
}

/** Loose straws lying on the floor in a disc around (cx, cz). */
function floorStraws(b, rand, n, [cx, cz], r, len = 0.25) {
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const d = r * Math.sqrt(rand());
    b.push([cx + Math.cos(a) * d, 0.004 + rand() * 0.006, cz + Math.sin(a) * d], rand() * Math.PI);
    b.add('straw', straw(len * (0.6 + rand() * 0.8)), [0, 0, 0], 0, Math.PI / 2 + (rand() - 0.5) * 0.2);
    b.pop();
  }
}

/** Wooden manger: plank feed trough on four legs under a V-shaped slatted hay rack. */
function hayRack(b) {
  const rand = makeRand(11);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) b.add('darkWood', bevelBlock(0.07, 0.68, 0.07, 0.006), [sx * 0.83, 0, sz * 0.18]);
    b.add('darkWood', bevelBlock(0.045, 0.045, 0.36, 0.004), [sx * 0.83, 0.26, 0]);
  }
  for (const sz of [-1, 1]) b.add('darkWood', bevelBlock(1.66, 0.045, 0.045, 0.004), [0, 0.26, sz * 0.18]);
  // trough: floor, two plank courses on each long side, end boards
  b.add('oak', bevelBlock(1.8, 0.03, 0.42, 0.004), [0, 0.68, 0]);
  for (const sz of [-1, 1]) for (const y of [0.71, 0.8]) b.add('oak', bevelBlock(1.8, 0.09, 0.03, 0.004), [0, y, sz * 0.2]);
  for (const sx of [-1, 1]) b.add('oak', bevelBlock(0.03, 0.18, 0.43, 0.004), [sx * 0.885, 0.71, 0]);
  for (const x of [-0.6, 0, 0.6]) {
    b.add('iron', bevelBlock(0.04, 0.2, 0.012, 0.003), [x, 0.71, 0.22]);
    rivets(b, 'steel', [[x, 0.76, 0.229], [x, 0.86, 0.229]], 0.006);
  }
  // V-shaped rack: slats lean out to both sides, wider at the top
  const Y0 = 0.84;
  const H = 0.86;
  const SP = 0.3;
  const L = Math.hypot(H, SP);
  const ang = Math.atan2(SP, H);
  for (const sg of [-1, 1]) {
    for (let i = -8; i <= 8; i++) b.add('oak', bevelBlock(0.032, L, 0.024, 0.004), [i * 0.1, Y0, 0], 0, sg * ang);
    for (const sx of [-1, 1]) b.add('darkWood', bevelBlock(0.055, L, 0.055, 0.005), [sx * 0.88, Y0, 0], 0, sg * ang);
    for (const t of [0.12, 0.5, 0.93]) b.add('oak', bevelBlock(1.84, 0.05, 0.025, 0.004), [0, Y0 + H * t, sg * (SP * t + 0.025)], 0, sg * ang);
  }
  for (const sx of [-1, 1]) b.add('darkWood', bevelBlock(0.055, 0.05, 2 * SP + 0.06, 0.005), [sx * 0.88, Y0 + H - 0.05, 0]);
  // hay: bunch in the rack, heap in the trough, wisps through the slats and on the floor
  b.add('straw', lump(0.8, 0.6, 0.1, 3), [0, 0.98, 0]);
  b.add('straw', lump(0.82, 0.1, 0.17, 5), [0, 0.71, 0]);
  for (let i = 0; i < 70; i++) {
    const y = 0.95 + rand() * 0.65;
    const sg = rand() < 0.5 ? -1 : 1;
    const hw = (SP * (y - Y0)) / H;
    b.add('straw', straw(0.12 + rand() * 0.14), [(rand() - 0.5) * 1.6, y, sg * (hw + 0.012)], 0, sg * ang + (rand() - 0.5) * 0.9);
  }
  floorStraws(b, rand, 30, [0, 0.2], 0.8, 0.28);
}

/** Rounded, noisy bale with twine bands; long axis along local X. Must be called outside any push. */
function bale(b, rand, w, h, d, pos, yaw, seed) {
  const g = new RoundedBoxGeometry(w, h, d, 5, 0.05);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = 1 + 0.018 * noise3(x * 2.2, y * 2.2, z * 2.2, seed);
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.translate(0, h / 2, 0);
  b.push(pos, yaw);
  b.add('straw', welded(g));
  // stalks lie along the bale: on top, on both sides and sticking out of the cut ends
  for (let i = 0; i < 90; i++) {
    const f = rand();
    const len = 0.06 + rand() * 0.1;
    let x = (rand() - 0.5) * w;
    let y = rand() * h;
    let z = (rand() - 0.5) * d;
    if (f < 0.35) y = h + 0.002;
    else if (f < 0.65) z = (rand() < 0.5 ? -1 : 1) * (d / 2 + 0.002);
    else x = (rand() < 0.5 ? -1 : 1) * (w / 2 + 0.01);
    b.add('straw', straw(len), [x, y, z], 0, 0, Math.PI / 2 + (rand() - 0.5) * 0.4);
  }
  for (const bx of [-0.25, 0.25]) {
    b.add('linen', G.block(0.016, 0.008, d + 0.01), [bx, h - 0.003, 0]);
    b.add('linen', G.block(0.016, 0.008, d + 0.01), [bx, 0, 0]);
    for (const sz of [-1, 1]) b.add('linen', G.block(0.016, h, 0.008), [bx, 0, sz * (d / 2)]);
  }
  b.pop();
}

/** Two bales with a third laid across them, plus a loose heap and scattered straw in front. */
function hayBales(b) {
  const rand = makeRand(31);
  bale(b, rand, 0.9, 0.4, 0.45, [-0.47, 0, -0.1], 0.02, 1);
  bale(b, rand, 0.9, 0.4, 0.45, [0.47, 0, -0.1], -0.03, 2);
  bale(b, rand, 0.9, 0.4, 0.45, [0, 0.4, -0.1], Math.PI / 2 + 0.05, 3);
  b.add('straw', lump(0.5, 0.28, 0.38, 4, 0.4), [0.1, 0, 0.75]);
  surfaceStraws(b, rand, 150, [0.1, 0, 0.75], [0.5, 0.28, 0.38], 0.24);
  floorStraws(b, rand, 45, [0.1, 0.75], 0.75, 0.28);
}

/**
 * Thin leather slab over a parameter grid: P(u, v) gives the mid-surface point, the slab is `thick` thick. Both faces and
 * the four edges are built, the result is a non-indexed smooth-shaded geometry with metre UVs.
 */
function slab(nu, nv, P, thick) {
  const pos = [];
  const idx = [];
  const e = 0.004;
  const cl = (t) => Math.min(1, Math.max(0, t));
  const normalAt = (u, v) => {
    const a = P(cl(u - e), v);
    const c = P(cl(u + e), v);
    const d = P(u, cl(v - e));
    const f = P(u, cl(v + e));
    const tu = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const tv = [f[0] - d[0], f[1] - d[1], f[2] - d[2]];
    const n = [tu[1] * tv[2] - tu[2] * tv[1], tu[2] * tv[0] - tu[0] * tv[2], tu[0] * tv[1] - tu[1] * tv[0]];
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    return [n[0] / l, n[1] / l, n[2] / l];
  };
  const layer = (sgn) => {
    const base = pos.length / 3;
    for (let j = 0; j <= nv; j++) {
      for (let i = 0; i <= nu; i++) {
        const p = P(i / nu, j / nv);
        const n = normalAt(i / nu, j / nv);
        pos.push(p[0] + (n[0] * sgn * thick) / 2, p[1] + (n[1] * sgn * thick) / 2, p[2] + (n[2] * sgn * thick) / 2);
      }
    }
    return base;
  };
  const top = layer(1);
  const bot = layer(-1);
  const at = (base, i, j) => base + j * (nu + 1) + i;
  const quad = (a, b2, c, d) => idx.push(a, b2, c, a, c, d);
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      quad(at(top, i, j), at(top, i, j + 1), at(top, i + 1, j + 1), at(top, i + 1, j));
      quad(at(bot, i, j), at(bot, i + 1, j), at(bot, i + 1, j + 1), at(bot, i, j + 1));
    }
  }
  for (let i = 0; i < nu; i++) {
    for (const j of [0, nv]) quad(at(top, i, j), at(top, i + 1, j), at(bot, i + 1, j), at(bot, i, j));
  }
  for (let j = 0; j < nv; j++) {
    for (const i of [0, nu]) quad(at(top, i, j), at(top, i, j + 1), at(bot, i, j + 1), at(bot, i, j));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return G.boxUV(g.toNonIndexed());
}

const SEAT_Y = 0.905;
const SEAT_Z0 = -0.27;
const SEAT_LEN = 0.54;

/** Seat half width along the saddle, v = 0 at the cantle (back), v = 1 at the pommel (front). */
function seatHW(v) {
  return 0.085 + 0.085 * Math.pow(1 - v, 1.6);
}

/** Seat surface height: raised pommel and cantle, dished middle, edges rolling down. */
function seatY(u, v) {
  const c = Math.abs(2 * u - 1);
  const pommel = 0.07 * Math.pow(Math.max(0, (v - 0.84) / 0.16), 2);
  const cantle = 0.045 * Math.pow(Math.max(0, (0.14 - v) / 0.14), 2);
  const dish = -0.028 * Math.exp(-(((v - 0.32) / 0.22) ** 2));
  return SEAT_Y + pommel + cantle + dish - 0.035 * c * c;
}

/** Medieval saddle with seat, two skirts, stirrup leathers and iron stirrups. Seat spans z = -0.27..0.27, pommel at +Z. */
function saddle(b) {
  b.add('bellowsLeather', slab(10, 24, (u, v) => [(2 * u - 1) * seatHW(v), seatY(u, v), SEAT_Z0 + SEAT_LEN * v], 0.035));
  // skirts hang from the seat edges and fan outwards over the sides of the horse
  for (const sg of [-1, 1]) {
    const flap = (u, v) => {
      const hl = 0.21 * (1 - 0.28 * v * v);
      const z = 0.01 + (2 * u - 1) * hl;
      const vz = Math.min(1, Math.max(0, (z - SEAT_Z0) / SEAT_LEN));
      const x0 = seatHW(vz) - 0.012;
      return [sg * (x0 + 0.14 * v * v), seatY(1, vz) - 0.3 * v, z];
    };
    b.add('bellowsLeather', slab(16, 8, flap, 0.007));
    // stirrup leather, buckle and iron stirrup with a flat tread
    const x = sg * 0.245;
    b.add('leather', bevelBlock(0.024, 0.24, 0.007, 0.002), [x, 0.365, 0.02]);
    b.add('steel', bevelBox(0.034, 0.026, 0.014, 0.004), [x, 0.6, 0.02]);
    const loop = [[0, 0.07], [-0.05, 0.05], [-0.07, -0.02], [-0.06, -0.085], [0.06, -0.085], [0.07, -0.02], [0.05, 0.05], [0, 0.07]];
    b.add('iron', tube(loop, 0.006, 40), [x, 0.3, 0.02]);
    b.add('iron', bevelBlock(0.13, 0.012, 0.05, 0.003), [x, 0.3 - 0.097, 0.02]);
  }
  // pommel knob and brass studs along the cantle
  b.add('steel', new THREE.SphereGeometry(0.02, 10, 8), [0, seatY(0.5, 1) + 0.014, 0.26]);
  const studs = [-0.08, -0.04, 0, 0.04, 0.08].map((x) => [x, seatY(0.5 + x / (2 * seatHW(0.03)), 0.03) + 0.019, SEAT_Z0 + SEAT_LEN * 0.03]);
  rivets(b, 'gilt', studs, 0.008);
}

/** Saddle horse: round beam on two splayed A-legs joined by runners and braces. Beam top at y = 0.865. */
function saddleStand(b) {
  const a = Math.atan2(0.2, 0.76);
  const legL = Math.hypot(0.2, 0.76);
  for (const sx of [-1, 1]) {
    b.add('darkWood', bevelBlock(0.07, 0.04, 0.74, 0.005), [sx * 0.25, 0, 0]);
    for (const sz of [-1, 1]) b.add('darkWood', bevelBlock(0.05, legL, 0.05, 0.005), [sx * 0.25, 0.04, sz * 0.3], 0, 0, sx * a);
  }
  for (const sz of [-1, 1]) {
    b.add('darkWood', bevelBlock(0.38, 0.035, 0.035, 0.004), [0, 0.3, sz * 0.3]);
    b.add('darkWood', bevelBlock(0.16, 0.07, 0.1, 0.006), [0, 0.76, sz * 0.3]);
  }
  b.add('darkWood', G.cylinder(0.065, 0.065, 0.82, 16, { y0: -0.41 }), [0, 0.8, 0], 0, Math.PI / 2);
  for (const sz of [-1, 1]) b.add('iron', hoop(0.067, 0.006), [0, 0.8, sz * 0.38], 0, Math.PI / 2);
}

function saddleOnStand(b) {
  saddleStand(b);
  saddle(b);
}

/** Plank wall panel with peg rails holding a bridle, a rope coil and a collar with hames, plus a halter. */
function tackWall(b) {
  const rand = makeRand(21);
  const PY = 1.345;
  const zf = 0.15; // z of hanging straps, near the peg tips
  for (let i = 0; i < 5; i++) b.add('oak', bevelBlock(0.294, 1.6, 0.035, 0.004), [-0.6 + i * 0.3, 0, 0]);
  for (const y of [0.25, 1.25]) b.add('darkWood', bevelBlock(1.52, 0.08, 0.03, 0.004), [0, y, -0.0325]);
  for (const sx of [-1, 1]) b.add('darkWood', bevelBlock(0.07, 0.06, 0.4, 0.005), [sx * 0.68, 0, 0.05]);
  b.add('oak', bevelBlock(1.5, 0.09, 0.03, 0.004), [0, 1.3, 0.0325]);
  b.add('oak', bevelBlock(0.8, 0.09, 0.03, 0.004), [0, 0.705, 0.0325]);
  const peg = (x, y) => b.add('darkWood', G.cylinder(0.014, 0.02, 0.13, 8), [x, y, 0.045], 0, Math.PI / 2);
  for (const x of [-0.55, -0.2, 0.25, 0.65]) peg(x, PY);
  for (const x of [-0.3, 0.3]) peg(x, 0.75);
  rivets(b, 'iron', [-0.7, -0.35, 0.35, 0.7].flatMap((x) => [[x, 1.33, 0.05], [x, 1.36, 0.05]]), 0.006);

  // bridle: crown piece over the peg, cheek straps, browband, noseband loop, snaffle bit and reins
  const BX = -0.55;
  b.add('leather', bevelBlock(0.12, 0.022, 0.008, 0.002), [BX, PY + 0.03, zf]);
  for (const s of [-1, 1]) {
    b.add('leather', bevelBlock(0.022, 0.36, 0.008, 0.002), [BX + s * 0.05, PY - 0.308, zf]);
    b.add('steel', hoop(0.03, 0.004), [BX + s * 0.075, PY - 0.33, zf + 0.005], 0, Math.PI / 2);
    b.add('leather', bevelBlock(0.014, 0.28, 0.006, 0.002), [BX + s * 0.095, PY - 0.61, zf + 0.008]);
  }
  b.add('leather', bevelBlock(0.13, 0.022, 0.008, 0.002), [BX, PY - 0.14, zf + 0.001]);
  rivets(b, 'gilt', [[BX - 0.055, PY - 0.13, zf + 0.006], [BX + 0.055, PY - 0.13, zf + 0.006]], 0.007);
  b.add('leather', hoop(0.045, 0.006), [BX, PY - 0.24, zf + 0.002], 0, Math.PI / 2);
  b.add('steel', G.cylinder(0.007, 0.007, 0.15, 10, { y0: -0.075 }), [BX, PY - 0.33, zf + 0.005], 0, 0, Math.PI / 2);

  // coiled rope hanging over a peg, with a loose tail
  const CX = -0.2;
  for (let k = 0; k < 7; k++) {
    const r = 0.12 + 0.005 * Math.sin(k * 2.1) + rand() * 0.004;
    b.add('linen', hoop(r, 0.009), [CX, PY + 0.031 - r, 0.06 + k * 0.016], 0, Math.PI / 2);
  }
  b.add('linen', tube([[CX + 0.05, PY - 0.2, 0.16], [CX + 0.08, PY - 0.35, 0.165], [CX + 0.05, PY - 0.45, 0.162]], 0.008, 16));

  // padded horse collar with wooden hames, iron rings and trace chains
  const KX = 0.25;
  const collar = new THREE.TorusGeometry(0.2, 0.05, 12, 32);
  collar.scale(0.85, 1.1, 1);
  collar.computeVertexNormals();
  b.add('leather', G.boxUV(collar), [KX, PY - 0.15, 0.11]);
  for (const s of [-1, 1]) {
    b.add('darkWood', bevelBlock(0.035, 0.4, 0.045, 0.006), [KX + s * 0.24, 0.99, 0.11]);
    b.add('iron', hoop(0.022, 0.005), [KX + s * 0.27, 1.05, 0.14], 0, Math.PI / 2);
    b.add('iron', tube([[KX + s * 0.27, 1.03, 0.13], [KX + s * 0.28, 0.9, 0.14], [KX + s * 0.27, 0.75, 0.135]], 0.006, 16));
    rivets(b, 'steel', [[KX + s * 0.24, 1.3, 0.1335], [KX + s * 0.24, 1.1, 0.1335]], 0.007);
  }

  // halter with a lead strap
  const HX = 0.65;
  b.add('leather', bevelBlock(0.1, 0.02, 0.008, 0.002), [HX, PY + 0.03, zf]);
  for (const s of [-1, 1]) b.add('leather', bevelBlock(0.02, 0.3, 0.008, 0.002), [HX + s * 0.04, PY - 0.25, zf]);
  b.add('leather', hoop(0.04, 0.006), [HX, PY - 0.3, zf + 0.002], 0, Math.PI / 2);
  b.add('iron', hoop(0.025, 0.005), [HX, PY - 0.36, zf + 0.005], 0, Math.PI / 2);
  b.add('leather', bevelBlock(0.02, 0.4, 0.007, 0.002), [HX, PY - 0.76, zf + 0.008]);
}

/** Flattens any vertex that the noise pushed below the floor onto y = 0, so lumpy hay rests on the ground. */
function clampToGround(group) {
  group.traverse((o) => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position;
    let moved = false;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < 0) {
        pos.setY(i, 0);
        moved = true;
      }
    }
    if (moved) {
      pos.needsUpdate = true;
      o.geometry.computeBoundingBox();
      o.geometry.computeBoundingSphere();
    }
  });
  return group;
}

export const stableModules = [
  {
    id: 'stable_hay_rack',
    name: 'Hay rack and manger',
    category: 'stable',
    description: 'Plank feed trough on four braced legs with iron straps, under a V-shaped slatted hay rack filled with hay.',
    build(M) {
      const b = newBuilder(M);
      hayRack(b);
      return clampToGround(b.build('stable_hay_rack'));
    },
  },
  {
    id: 'stable_hay_bales',
    name: 'Hay bales and loose hay',
    category: 'stable',
    description: 'Three twine-bound hay bales (two below, one across) with a lumpy loose hay heap and straw scattered on the floor.',
    build(M) {
      const b = newBuilder(M);
      hayBales(b);
      return clampToGround(b.build('stable_hay_bales'));
    },
  },
  {
    id: 'stable_saddle_stand',
    name: 'Saddle on wooden stand',
    category: 'stable',
    description: 'Leather saddle with dished seat, raised pommel and cantle, skirts, stirrup leathers and iron stirrups on a wooden saddle horse.',
    build(M) {
      const b = newBuilder(M);
      saddleOnStand(b);
      return b.build('stable_saddle_stand');
    },
  },
  {
    id: 'stable_tack_wall',
    name: 'Tack wall',
    category: 'stable',
    description: 'Free-standing plank panel with peg rails holding a bridle with bit, a rope coil, a horse collar with hames and trace chains, and a halter.',
    build(M) {
      const b = newBuilder(M);
      tackWall(b);
      return b.build('stable_tack_wall');
    },
  },
];
