// Stage 5 hand weapons: hand-and-a-half sword, the same sword in its scabbard, infantry spear, glaive, poleaxe,
// bearded battle axe and flanged mace. Static display pieces, 1 unit = 1 m, long axis along +Y, front faces +Z.
//
// Reference dimensions (European originals and museum replicas, c. 1300-1500):
// - Hand-and-a-half sword (Oakeshott types XVa/XVIIIb): 1.20 m overall, 0.90 m blade tapering from 50 mm to a point,
//   9 mm thick at the guard, short fuller on the forte; straight guard 0.22 m wide; 0.22 m grip; pommel 50 mm.
// - Scabbard: wood core under stitched leather, brass locket and chape, 30 mm sword belt wrapped round it with an iron buckle.
// - Infantry spear: 2.4 m overall, 2.1 m ash shaft (about 30 mm), 0.25 m leaf head on a 0.15 m socket, nail through the
//   socket, pointed iron butt ferrule.
// - Glaive: 2.4 m, single-edged convex head 0.5 m long with a back fluke, on a socket with langets and a 0.14 m rondel.
// - Poleaxe: 1.92 m, axe blade 0.24 m high, hammer with a four-tooth crown, 0.14 m top spike, langets, rondel guard.
// - Bearded axe: 0.8 m ash haft, 0.22 m edge, beard hanging 0.1 m below the eye.
// - Flanged mace: 0.6 m, seven flanges on a 70 mm round steel head, wrist-strap lug at the butt.

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import * as G from '../lib/geo.js';
import { bevelBox, bevelBlock, lathe, rivets } from '../lib/kit.js';
import { armsBuilder } from '../lib/armsKit.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// Geometry helpers (local to this file)
// ---------------------------------------------------------------------------

/** Ring of n points of an ellipse (half-axes hw along X, ht along Z) at height y, running from +X towards +Z. */
function ell(y, hw, ht, n = 14) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU;
    pts.push([hw * Math.cos(a), y, ht * Math.sin(a)]);
  }
  return pts;
}

/**
 * Lofts closed rings (each a list of [x, y, z] running from +X towards +Z, stacked upwards) into a solid.
 * smooth = shared vertex normals (round parts); false = flat facets (blades). Optional flat end caps.
 */
function loft(rings, { smooth = true, capBottom = false, capTop = false } = {}) {
  const n = rings[0].length;
  const pos = [];
  const idx = [];
  for (const r of rings) for (const p of r) pos.push(p[0], p[1], p[2]);
  for (let i = 0; i < rings.length - 1; i++) {
    for (let k = 0; k < n; k++) {
      const m = (k + 1) % n;
      const a = i * n + k;
      const b2 = (i + 1) * n + k;
      const c = (i + 1) * n + m;
      const d = i * n + m;
      idx.push(a, b2, c, a, c, d);
    }
  }
  const cap = (ring, down) => {
    const base = pos.length / 3;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (const p of ring) {
      pos.push(p[0], p[1], p[2]);
      cx += p[0];
      cy += p[1];
      cz += p[2];
    }
    pos.push(cx / n, cy / n, cz / n);
    for (let k = 0; k < n; k++) {
      const m = (k + 1) % n;
      if (down) idx.push(base + n, base + k, base + m);
      else idx.push(base + n, base + m, base + k);
    }
  };
  if (capBottom) cap(rings[0], true);
  if (capTop) cap(rings[rings.length - 1], false);
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  if (!smooth) g = g.toNonIndexed();
  g.computeVertexNormals();
  return G.boxUV(g);
}

/** Sword blade from stations [y, width, thickness, fuller depth fraction]: hexagonal section, V-groove fuller where f > 0. */
function bladeLoft(stations) {
  return loft(
    stations.map(([y, w, t, f]) => {
      const hw = w / 2;
      const ht = t / 2;
      const s = w * 0.17;
      const ft = ht * (1 - f);
      return [[hw, y, 0], [s, y, ht], [0, y, ft], [-s, y, ht], [-hw, y, 0], [-s, y, -ht], [0, y, -ft], [s, y, -ht]];
    }),
    { smooth: false },
  );
}

/** Wedge-section blade between a spine outline and an edge outline (2D points in XY, thickness along Z). */
function wedged(spinePts, edgePts, spineHalfT = 0.007, edgeHalfT = 0.0008) {
  const v = [];
  const tri = (a, b2, c) => v.push(...a, ...b2, ...c);
  for (let i = 0; i < spinePts.length - 1; i++) {
    const [sx0, sy0] = spinePts[i];
    const [sx1, sy1] = spinePts[i + 1];
    const [ex0, ey0] = edgePts[i];
    const [ex1, ey1] = edgePts[i + 1];
    const sf0 = [sx0, sy0, spineHalfT];
    const sb0 = [sx0, sy0, -spineHalfT];
    const sf1 = [sx1, sy1, spineHalfT];
    const sb1 = [sx1, sy1, -spineHalfT];
    const ef0 = [ex0, ey0, edgeHalfT];
    const eb0 = [ex0, ey0, -edgeHalfT];
    const ef1 = [ex1, ey1, edgeHalfT];
    const eb1 = [ex1, ey1, -edgeHalfT];
    tri(sf0, ef0, ef1);
    tri(sf0, ef1, sf1);
    tri(sb0, sb1, eb1);
    tri(sb0, eb1, eb0);
    tri(sb0, sf0, sf1);
    tri(sb0, sf1, sb1);
    tri(ef0, eb0, eb1);
    tri(ef0, eb1, ef1);
  }
  const n = spinePts.length - 1;
  tri([spinePts[0][0], spinePts[0][1], spineHalfT], [spinePts[0][0], spinePts[0][1], -spineHalfT], [edgePts[0][0], edgePts[0][1], -edgeHalfT]);
  tri([spinePts[0][0], spinePts[0][1], spineHalfT], [edgePts[0][0], edgePts[0][1], -edgeHalfT], [edgePts[0][0], edgePts[0][1], edgeHalfT]);
  tri([spinePts[n][0], spinePts[n][1], spineHalfT], [edgePts[n][0], edgePts[n][1], edgeHalfT], [edgePts[n][0], edgePts[n][1], -edgeHalfT]);
  tri([spinePts[n][0], spinePts[n][1], spineHalfT], [edgePts[n][0], edgePts[n][1], -edgeHalfT], [spinePts[n][0], spinePts[n][1], -spineHalfT]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return G.boxUV(g);
}

/** Flat plate extruded from a THREE.Shape (XY plane), thickness t centred on z = 0, small chamfer bev. */
function plateShape(shape, t, bev = 0.0012) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: t,
    bevelEnabled: bev > 0,
    bevelThickness: bev,
    bevelSize: bev,
    bevelSegments: 1,
    curveSegments: 10,
  });
  g.translate(0, 0, -t / 2);
  return G.boxUV(g);
}

/** Flat plate from a polygon of [x, y] points. */
function plate(pts, t, bev) {
  return plateShape(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), t, bev);
}

/**
 * Cord-ribbed leather grip between y0 and y1: oval section (radii rx, rz), slight swell in the middle and a helical
 * rib (one turn per `pitch` metres) standing for the cord under the leather.
 */
function wrapGrip(rx, rz, y0, y1, { amp = 0.05, pitch = 0.014, swell = 0.06, segs = 12 } = {}) {
  const h = y1 - y0;
  const freq = TAU / pitch;
  let g = new THREE.CylinderGeometry(1, 1, h, segs, Math.max(6, Math.round(h / (pitch / 5))));
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-5);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const r = (1 + swell * Math.sin((y / h + 0.5) * Math.PI)) * (1 + amp * Math.sin(y * freq + a));
    p.setXYZ(i, x * r * rx, y + y0 + h / 2, z * r * rz);
  }
  g.computeVertexNormals();
  return G.cylUV(g, Math.max(rx, rz));
}

/** Pushes a triangle, flipping its winding so the face normal points along `out`. */
function pushTri(v, a, b2, c, out) {
  const ux = b2[0] - a[0];
  const uy = b2[1] - a[1];
  const uz = b2[2] - a[2];
  const wx = c[0] - a[0];
  const wy = c[1] - a[1];
  const wz = c[2] - a[2];
  const nx = uy * wz - uz * wy;
  const ny = uz * wx - ux * wz;
  const nz = ux * wy - uy * wx;
  if (nx * out[0] + ny * out[1] + nz * out[2] < 0) v.push(...a, ...c, ...b2);
  else v.push(...a, ...b2, ...c);
}

/** Leather strap swept along samples { c: centre, n: outward unit normal }; width w along Y, thickness th. */
function strap(samples, w, th) {
  const rings = samples.map(({ c, n }) => {
    const q = (sn, sy) => [c[0] + (sn * n[0] * th) / 2, c[1] + (sn * n[1] * th) / 2 + (sy * w) / 2, c[2] + (sn * n[2] * th) / 2];
    return [q(1, 1), q(1, -1), q(-1, -1), q(-1, 1)];
  });
  const v = [];
  for (let i = 0; i < rings.length - 1; i++) {
    const mid = [0, 1, 2].map((k) => (samples[i].c[k] + samples[i + 1].c[k]) / 2);
    for (let k = 0; k < 4; k++) {
      const m = (k + 1) % 4;
      const a = rings[i][k];
      const b2 = rings[i][m];
      const c2 = rings[i + 1][m];
      const d = rings[i + 1][k];
      const out = [0, 1, 2].map((j) => (a[j] + b2[j] + c2[j] + d[j]) / 4 - mid[j]);
      pushTri(v, a, b2, c2, out);
      pushTri(v, a, c2, d, out);
    }
  }
  const last = rings.length - 1;
  const o0 = [0, 1, 2].map((k) => samples[0].c[k] - samples[1].c[k]);
  const o1 = [0, 1, 2].map((k) => samples[last].c[k] - samples[last - 1].c[k]);
  pushTri(v, rings[0][0], rings[0][1], rings[0][2], o0);
  pushTri(v, rings[0][0], rings[0][2], rings[0][3], o0);
  pushTri(v, rings[last][0], rings[last][1], rings[last][2], o1);
  pushTri(v, rings[last][0], rings[last][2], rings[last][3], o1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return G.boxUV(g);
}

/** Dished iron rondel disc (radius R) with its underside at y = 0, shaft passes through the centre. */
function rondel(R) {
  return lathe([[0, 0.002], [0.022, 0.002], [R - 0.009, 0], [R, 0.0015], [R, 0.0045], [R - 0.009, 0.0065], [0.022, 0.0085], [0, 0.0085]], 24);
}

// ---------------------------------------------------------------------------
// Hand-and-a-half sword and scabbard
// ---------------------------------------------------------------------------

// blade stations: [y, width, thickness, fuller depth fraction]; tip at y = 0, shoulder at y = 0.9
const BLADE = [
  [0, 0.0015, 0.0015, 0],
  [0.02, 0.014, 0.003, 0],
  [0.09, 0.027, 0.0048, 0],
  [0.25, 0.036, 0.0062, 0],
  [0.4, 0.041, 0.007, 0],
  [0.5, 0.0425, 0.0074, 0],
  [0.58, 0.044, 0.0078, 0.6],
  [0.74, 0.0475, 0.0085, 0.6],
  [0.9, 0.05, 0.009, 0.6],
];

/** Blade width and thickness at height y (linear between stations, clamped to the blade). */
function bladeDims(y) {
  for (let i = 0; i < BLADE.length - 1; i++) {
    const a = BLADE[i];
    const c = BLADE[i + 1];
    if (y <= c[0]) {
      const t = Math.max(0, (y - a[0]) / (c[0] - a[0]));
      return [a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t];
    }
  }
  const e = BLADE[BLADE.length - 1];
  return [e[1], e[2]];
}

/** Crossguard, central block, grip and pommel of the sword; coordinates have the blade tip at y = 0. */
function swordHilt(b) {
  // straight crossguard bar 0.22 m wide, slightly swelling to the middle, with a small central block
  b.add(
    'iron',
    plate([[-0.11, -0.007], [-0.11, 0.007], [-0.06, 0.0095], [0, 0.0105], [0.06, 0.0095], [0.11, 0.007], [0.11, -0.007], [0.06, -0.0095], [0, -0.0105], [-0.06, -0.0095]], 0.016, 0.0012),
    [0, 0.905, 0],
  );
  b.add('iron', bevelBox(0.038, 0.032, 0.026, 0.005), [0, 0.905, 0]);
  // leather over cord grip with iron ferrules, 0.22 m
  b.add('leather', wrapGrip(0.0148, 0.0126, 0.921, 1.139, { amp: 0.05, swell: 0.1 }));
  b.add('iron', G.cylinder(0.0172, 0.0172, 0.007, 14, { y0: 0.9205 }));
  b.add('iron', G.cylinder(0.0172, 0.0172, 0.007, 14, { y0: 1.1325 }));
  // pear-shaped pommel narrowing to the peened tang button
  b.add('iron', lathe([[0, 0], [0.0165, 0], [0.023, 0.008], [0.0265, 0.018], [0.0262, 0.028], [0.0215, 0.038], [0.015, 0.046], [0.0115, 0.05], [0, 0.051]], 18), [0, 1.138, 0]);
  b.add('steel', lathe([[0, 0], [0.0125, 0], [0.0125, 0.0025], [0.0085, 0.0075], [0, 0.0095]], 12), [0, 1.1865, 0]);
}

/**
 * Hand-and-a-half sword replica, standing upright on its point.
 * Origin: blade tip at y = 0, centred on x = z = 0; guard runs along X, blade flats face +Z; 1.2 m tall.
 */
export function addLongsword(b) {
  b.add('steel', bladeLoft(BLADE));
  swordHilt(b);
}

const SH = 0.035; // height of the blade tip above the chape bottom in the sheathed model

/** Half-axes (X, Z) of the scabbard section at height Y above the chape bottom. */
function scab(Y) {
  const [w, t] = bladeDims(Y - SH);
  return [w / 2 + 0.0065, t / 2 + 0.0065];
}

/**
 * The same sword sheathed in a leather-covered scabbard with brass chape and locket and a sword belt wrapped round it.
 * Origin: bottom of the chape at y = 0 (the sword stands on it), centred on x = z = 0; hilt up, front +Z; 1.23 m tall.
 */
export function addScabbardedSword(b) {
  // leather-covered wooden body, lenticular section following the blade taper (the blade itself is hidden inside)
  const Ys = [0.03, 0.06, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.86, 0.926];
  b.add('leather', loft(Ys.map((Y) => { const [hw, ht] = scab(Y); return ell(Y, hw, ht, 14); })));

  // brass chape and locket: [Y, growth in X, growth in Z]; the last row is a lip pressed into the leather
  const fitting = (table, opts) => loft(table.map(([Y, gh, gt]) => { const [hw, ht] = scab(Y); return ell(Y, hw + gh, ht + gt, 14); }), opts);
  b.add('gilt', fitting([[0, -0.0035, -0.003], [0.003, -0.0003, -0.0004], [0.01, 0.0022, 0.0022], [0.03, 0.0033, 0.0031], [0.07, 0.0033, 0.0031], [0.107, 0.0033, 0.0031], [0.109, -0.001, -0.001]], { capBottom: true }));
  b.add('gilt', fitting([[0.884, -0.001, -0.001], [0.886, 0.0033, 0.0031], [0.923, 0.0033, 0.0031], [0.925, -0.001, -0.001]]));
  const rv = [];
  for (const Y of [0.045, 0.085]) {
    const [, ht] = scab(Y);
    rv.push([0, Y, ht + 0.0031], [0, Y, -(ht + 0.0031)]);
  }
  const [lhw] = scab(0.905);
  rv.push([lhw + 0.0033, 0.905, 0], [-(lhw + 0.0033), 0.905, 0]);
  rivets(b, 'steel', rv, 0.0026);

  // sword belt wrapped 2.5 times round the scabbard, ending at an iron buckle on the front
  const th = 0.0045;
  const turns = 2.5;
  const rise = 0.033 * turns;
  const total = turns * TAU + 0.55;
  const N = 46;
  const samples = [];
  for (let i = 0; i <= N; i++) {
    const a = -Math.PI / 2 + (i / N) * total;
    const y = 0.64 + (rise * ((i / N) * total)) / (turns * TAU);
    const [hw, ht] = scab(y);
    const A = hw + th / 2 - 0.0003;
    const B = ht + th / 2 - 0.0003;
    const nx = Math.cos(a) / A;
    const nz = Math.sin(a) / B;
    const nl = Math.hypot(nx, nz);
    samples.push({ c: [A * Math.cos(a), y, B * Math.sin(a)], n: [nx / nl, 0, nz / nl] });
  }
  b.add('bellowsLeather', strap(samples, 0.03, th));
  const yB = 0.64 + rise + 0.001;
  const [, htB] = scab(yB);
  const zB = htB + th - 0.0003 + 0.002; // centre of the buckle bars, resting on the belt
  for (const s of [-1, 1]) {
    b.add('iron', bevelBox(0.005, 0.04, 0.005, 0.0012), [s * 0.012, yB, zB]);
    b.add('iron', bevelBox(0.029, 0.005, 0.005, 0.0012), [0, yB + s * 0.0175, zB]);
  }
  b.add('iron', bevelBox(0.026, 0.004, 0.004, 0.001), [0.002, yB, zB + 0.0015]);

  // hilt of the sword above the locket
  b.push([0, SH, 0]);
  swordHilt(b);
  b.pop();
}

// ---------------------------------------------------------------------------
// Polearms
// ---------------------------------------------------------------------------

/**
 * Infantry spear: ash shaft, socketed leaf-shaped head with midrib, nail through the socket, iron straps and butt ferrule.
 * Origin: butt tip at y = 0, centred on x = z = 0; head blades face +Z; total height shaftLen + 0.3 m (2.4 m by default).
 */
export function addSpear(b, shaftLen = 2.1) {
  const top = shaftLen;
  // pointed iron butt ferrule, riveted
  b.add('iron', lathe([[0, 0], [0.004, 0], [0.013, 0.012], [0.0172, 0.035], [0.0172, 0.12], [0.0164, 0.122], [0, 0.122]], 12));
  rivets(b, 'steel', [[0.0172, 0.095, 0], [-0.0172, 0.095, 0], [0, 0.095, 0.0172], [0, 0.095, -0.0172]], 0.0032);
  b.add('oak', G.cylinder(0.0142, 0.0156, top + 0.02 - 0.06, 12, { y0: 0.06 }));
  // two riveted straps running down the shaft from the socket
  for (const s of [-1, 1]) {
    b.add('iron', bevelBlock(0.003, 0.26, 0.012, 0.001), [s * 0.0153, top - 0.34, 0]);
    rivets(b, 'steel', [[s * 0.017, top - 0.3, 0], [s * 0.017, top - 0.22, 0], [s * 0.017, top - 0.14, 0]], 0.0032);
  }
  // socket with swelling mouth and flared shoulder
  const sy = top - 0.08;
  b.add('iron', lathe([[0, 0], [0.0185, 0], [0.0198, 0.006], [0.0178, 0.02], [0.017, 0.06], [0.0182, 0.1], [0.0205, 0.125], [0.0212, 0.139], [0.0188, 0.15], [0, 0.15]], 14), [0, sy, 0]);
  // nail through the socket
  const ny = sy + 0.035;
  b.add('steel', G.rod([-0.027, ny, 0], [0.027, ny, 0], 0.0027, 8));
  rivets(b, 'steel', [[-0.0275, ny, 0], [0.0275, ny, 0]], 0.0042);
  // leaf blade, 0.25 m, with a raised midrib
  const by = top + 0.05;
  const L = [[0, 0.032, 0.013], [0.08, 0.04, 0.0125], [0.22, 0.05, 0.0115], [0.38, 0.0525, 0.0105], [0.55, 0.0465, 0.0085], [0.72, 0.034, 0.0062], [0.88, 0.016, 0.0038], [0.97, 0.0045, 0.0022], [1, 0.0008, 0.0012]];
  b.add(
    'steel',
    loft(
      L.map(([s, w, t]) => {
        const y = by + s * 0.25;
        const hw = w / 2;
        const ht = t / 2;
        return [[hw, y, 0], [hw * 0.42, y, ht * 0.45], [0, y, ht], [-hw * 0.42, y, ht * 0.45], [-hw, y, 0], [-hw * 0.42, y, -ht * 0.45], [0, y, -ht], [hw * 0.42, y, -ht * 0.45]];
      }),
      { smooth: false },
    ),
  );
}

/**
 * Glaive: octagonal ash shaft, socketed single-edged convex head with a back lug, side langets and a rondel disc.
 * Origin: butt at y = 0, centred on x = z = 0; the cutting edge faces +X, the back fluke -X; 2.4 m tall.
 */
export function addGlaive(b) {
  const shaftTop = 1.86;
  b.add('iron', lathe([[0, 0], [0.0035, 0], [0.012, 0.012], [0.0205, 0.04], [0.0212, 0.1], [0.02, 0.104], [0, 0.104]], 12));
  b.add('oak', G.cylinder(0.0185, 0.0198, shaftTop + 0.02 - 0.06, 8, { y0: 0.06 }));
  // rondel guard below the langets
  b.add('iron', rondel(0.07), [0, 1.54, 0]);
  // riveted langets on both sides of the shaft
  for (const s of [-1, 1]) {
    b.add('iron', bevelBlock(0.006, 0.355, 0.026, 0.0012), [s * 0.0222, 1.545, 0]);
    rivets(b, 'steel', [[s * 0.0252, 1.62, 0], [s * 0.0252, 1.72, 0], [s * 0.0252, 1.82, 0]], 0.0042);
  }
  // socket
  b.add('iron', lathe([[0, 0], [0.0205, 0], [0.0218, 0.006], [0.0198, 0.02], [0.0192, 0.06], [0.02, 0.1], [0.0228, 0.128], [0.0235, 0.138], [0.02, 0.15], [0, 0.15]], 14), [0, 1.78, 0]);
  // single-edged blade 0.5 m long: straight back, strongly convex edge on +X, point swept back towards the spine
  const y0 = 1.9;
  const at = (pts) => pts.map(([x, y]) => [x, y0 + y]);
  b.add(
    'steel',
    wedged(
      at([[-0.018, 0], [-0.018, 0.1], [-0.018, 0.2], [-0.017, 0.3], [-0.014, 0.38], [-0.008, 0.44], [-0.003, 0.48], [0, 0.5]]),
      at([[0.02, 0], [0.056, 0.06], [0.073, 0.15], [0.076, 0.25], [0.067, 0.33], [0.048, 0.4], [0.024, 0.46], [0, 0.5]]),
      0.0058,
      0.0008,
    ),
  );
  // back fluke hooking upwards, forged with the blade
  b.add('steel', plate(at([[-0.012, 0.1], [-0.048, 0.112], [-0.074, 0.148], [-0.068, 0.156], [-0.042, 0.138], [-0.012, 0.142]]), 0.008, 0.001));
}

/**
 * Poleaxe: ash shaft, socket with axe blade (+X), crowned hammer (-X) and top spike, four langets, rondel guard, butt cap.
 * Origin: butt at y = 0, centred on x = z = 0; 1.92 m tall.
 */
export function addPoleaxe(b) {
  b.add('iron', lathe([[0, 0], [0.004, 0], [0.015, 0.006], [0.0225, 0.02], [0.0225, 0.11], [0.0215, 0.115], [0, 0.115]], 12));
  b.add('oak', G.cylinder(0.0198, 0.021, 1.68, 8, { y0: 0.06 }));
  b.add('iron', rondel(0.075), [0, 1.195, 0]);
  // four langets with rivets
  for (const s of [-1, 1]) {
    b.add('iron', bevelBlock(0.005, 0.56, 0.024, 0.0012), [s * 0.0225, 1.2, 0]);
    b.add('iron', bevelBlock(0.024, 0.56, 0.005, 0.0012), [0, 1.2, s * 0.0225]);
    rivets(b, 'steel', [[s * 0.025, 1.28, 0], [s * 0.025, 1.4, 0], [s * 0.025, 1.52, 0]], 0.0038);
    rivets(b, 'steel', [[0, 1.28, s * 0.025], [0, 1.4, s * 0.025], [0, 1.52, s * 0.025]], 0.0038);
  }
  // head socket
  b.add('steel', lathe([[0, 0], [0.0265, 0], [0.0287, 0.01], [0.0272, 0.035], [0.0278, 0.12], [0.0298, 0.15], [0.0268, 0.178], [0.017, 0.183], [0, 0.183]], 16), [0, 1.6, 0]);
  // top spike (square section)
  const spike = G.cylinder(0.002, 0.0165, 0.14, 4, { y0: 1.778 });
  spike.rotateY(Math.PI / 4);
  b.add('steel', spike);
  // axe blade on +X, slightly bearded edge
  b.add(
    'steel',
    wedged(
      [[0.026, 1.635], [0.026, 1.67], [0.026, 1.705], [0.026, 1.74], [0.026, 1.775]],
      [[0.145, 1.585], [0.128, 1.645], [0.122, 1.705], [0.128, 1.765], [0.145, 1.825]],
      0.0105,
      0.0008,
    ),
  );
  // hammer on -X with a four-tooth crown
  b.add('steel', bevelBox(0.062, 0.054, 0.054, 0.006), [-0.055, 1.705, 0]);
  for (const dy of [-1, 1]) {
    for (const dz of [-1, 1]) {
      const tooth = G.cylinder(0.0015, 0.0105, 0.014, 4);
      tooth.rotateZ(Math.PI / 2);
      b.add('steel', tooth, [-0.0855, 1.705 + dy * 0.0125, dz * 0.0125]);
    }
  }
}

// ---------------------------------------------------------------------------
// Short weapons
// ---------------------------------------------------------------------------

/**
 * Bearded battle axe: oval ash haft with leather grip wrap, forged head with a lipped eye, wedge, beard and cheek straps.
 * Origin: haft end at y = 0, centred on x = z = 0; the edge faces +X, the poll -X; 0.84 m tall.
 */
export function addBattleAxe(b) {
  // oval haft, flared at the butt, running through the eye
  const hs = [[0, 0.0125, 0.0098], [0.004, 0.0195, 0.015], [0.03, 0.0172, 0.0132], [0.35, 0.0155, 0.0118], [0.62, 0.0162, 0.0124], [0.69, 0.0172, 0.0132], [0.76, 0.0176, 0.0134], [0.81, 0.0176, 0.0134]];
  b.add('oak', loft(hs.map(([y, hw, ht]) => ell(y, hw, ht, 14)), { capBottom: true, capTop: true }));
  b.add('leather', wrapGrip(0.0182, 0.0145, 0.08, 0.42, { amp: 0.05, swell: 0.05 }));
  // iron wedge driven into the haft top
  b.add('steel', bevelBox(0.026, 0.006, 0.0045, 0.001), [0, 0.8125, 0]);
  // eye: elliptical socket (long axis along the blade) with flared lips; the lip rows close the annulus round the haft
  const eye = [[0.71, 0.0165, 0.0122], [0.7105, 0.0285, 0.0205], [0.716, 0.03, 0.0215], [0.804, 0.03, 0.0215], [0.8095, 0.0285, 0.0205], [0.81, 0.0168, 0.0126]];
  b.add('steel', loft(eye.map(([y, hw, ht]) => ell(y, hw, ht, 16))));
  // short square poll behind the eye
  b.add('steel', bevelBox(0.024, 0.07, 0.034, 0.005), [-0.035, 0.76, 0]);
  // bearded blade on +X: straight top, convex 0.22 m edge, beard hooking down below the eye
  b.add(
    'steel',
    wedged(
      [[0.026, 0.806], [0.026, 0.78], [0.026, 0.75], [0.03, 0.72], [0.05, 0.69], [0.075, 0.655], [0.097, 0.6]],
      [[0.15, 0.832], [0.168, 0.79], [0.175, 0.745], [0.172, 0.7], [0.162, 0.66], [0.148, 0.625], [0.126, 0.574]],
      0.0085,
      0.0008,
    ),
  );
  // cheek straps under the eye
  for (const s of [-1, 1]) {
    b.add('iron', bevelBlock(0.018, 0.19, 0.004, 0.001), [0, 0.5, s * 0.0148]);
    rivets(b, 'steel', [[0, 0.54, s * 0.0168], [0, 0.6, s * 0.0168], [0, 0.66, s * 0.0168]], 0.0032);
  }
}

/**
 * Flanged mace: ash haft with leather grip, steel round head with 7 flanges and a spike finial, wrist-strap lug at the butt.
 * Origin: bottom of the strap lug at y = 0, centred on x = z = 0; the lug hole looks along Z; 0.6 m tall.
 */
export function addMace(b) {
  // iron lug with the strap hole
  const lug = new THREE.Shape();
  lug.absarc(0, 0, 0.02, 0, TAU, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.0075, 0, TAU, true);
  lug.holes.push(hole);
  b.add('iron', plateShape(lug, 0.012, 0.0015), [0, 0.0218, 0]);
  // flared butt cap, haft and leather grip
  b.add('iron', lathe([[0, 0], [0.014, 0], [0.0185, 0.008], [0.0178, 0.02], [0.0155, 0.034], [0, 0.034]], 14), [0, 0.03, 0]);
  b.add('oak', G.cylinder(0.0138, 0.0148, 0.44, 12, { y0: 0.05 }));
  b.add('leather', wrapGrip(0.0162, 0.0162, 0.075, 0.325, { amp: 0.055, swell: 0.04 }));
  // socket and round head in one revolved profile (relative to y = 0.42)
  b.add('steel', lathe([[0, 0], [0.0165, 0], [0.0195, 0.006], [0.018, 0.018], [0.0178, 0.032], [0.0215, 0.048], [0.0305, 0.062], [0.0345, 0.078], [0.0345, 0.092], [0.031, 0.106], [0.0225, 0.118], [0.012, 0.126], [0, 0.128]], 20), [0, 0.42, 0]);
  // seven flanges, root inside the head, edge standing 26 mm clear of it
  const flange = [[0.01, 0.01], [0.04, 0.018], [0.0585, 0.032], [0.0605, 0.046], [0.0585, 0.06], [0.04, 0.074], [0.01, 0.08]];
  for (let k = 0; k < 7; k++) b.add('steel', plate(flange, 0.008, 0.0012), [0, 0.465, 0], (k * TAU) / 7);
  // spike finial
  b.add('steel', lathe([[0, 0], [0.012, 0], [0.0115, 0.004], [0.008, 0.018], [0.0035, 0.038], [0, 0.052]], 10), [0, 0.54, 0]);
}

// ---------------------------------------------------------------------------
// Module definitions
// ---------------------------------------------------------------------------

export const bladeModules = [
  {
    id: 'sword_longsword',
    name: 'Hand-and-a-half longsword',
    category: 'weapon',
    description: 'Museum-style hand-and-a-half sword replica, 1.2 m overall: 0.9 m hexagonal-section blade with a short fuller, straight crossguard with central block, cord-ribbed leather grip and pear-shaped pommel with a peened button.',
    build(M) {
      const b = armsBuilder(M);
      addLongsword(b);
      return b.build('sword_longsword');
    },
  },
  {
    id: 'sword_scabbarded',
    name: 'Scabbarded longsword',
    category: 'weapon',
    description: 'The longsword sheathed in a leather-covered wooden scabbard with brass locket and chape, wrapped by a sword belt with an iron buckle; stands on the chape, 1.23 m tall.',
    build(M) {
      const b = armsBuilder(M);
      addScabbardedSword(b);
      return b.build('sword_scabbarded');
    },
  },
  {
    id: 'spear_infantry',
    name: 'Infantry spear',
    category: 'weapon',
    description: 'Infantry spear, 2.4 m overall: ash shaft, leaf-shaped socketed head with midrib, nail through the socket, two riveted iron straps and a pointed iron butt ferrule.',
    build(M) {
      const b = armsBuilder(M);
      addSpear(b);
      return b.build('spear_infantry');
    },
  },
  {
    id: 'glaive',
    name: 'Glaive',
    category: 'weapon',
    description: 'Glaive, 2.4 m: 0.5 m single-edged convex steel head with a back fluke on a socket with riveted side langets, a rondel disc and an octagonal ash shaft with iron butt cap.',
    build(M) {
      const b = armsBuilder(M);
      addGlaive(b);
      return b.build('glaive');
    },
  },
  {
    id: 'poleaxe',
    name: 'Poleaxe',
    category: 'weapon',
    description: 'Poleaxe, 1.92 m: axe blade, four-tooth crowned hammer and top spike on a steel socket with four riveted langets, a rondel guard and an iron butt cap.',
    build(M) {
      const b = armsBuilder(M);
      addPoleaxe(b);
      return b.build('poleaxe');
    },
  },
  {
    id: 'axe_battle',
    name: 'Bearded battle axe',
    category: 'weapon',
    description: 'Bearded battle axe on a 0.8 m oval ash haft with leather grip wrap; forged head with lipped eye, driven wedge, poll and iron cheek straps.',
    build(M) {
      const b = armsBuilder(M);
      addBattleAxe(b);
      return b.build('axe_battle');
    },
  },
  {
    id: 'mace_flanged',
    name: 'Flanged mace',
    category: 'weapon',
    description: 'Flanged mace, 0.6 m: round steel head with seven flanges and a spike finial, ash haft with leather grip and an iron lug with a wrist-strap hole.',
    build(M) {
      const b = armsBuilder(M);
      addMace(b);
      return b.build('mace_flanged');
    },
  },
];
