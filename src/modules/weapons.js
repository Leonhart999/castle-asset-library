// Realistic medieval weapons & armoury: fullered arming sword with spiral leather grip & riser ring,
// bevel-edged halberd, mesh-curved rim-bound heater shield, weapon rack with kettle helmet, and coiled-straw target.
// Base sits at y = 0, centred on x = z = 0, 1 unit = 1 m.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { newBuilder, lathe, bevelBlock, bevelBox, rivets, flatScroll } from '../lib/kit.js';

/** Double-edged blade with medial fuller groove and bevelled edges from tip y=0 to shoulder y=len. */
function bladeGeom(len = 0.88, maxW = 0.056, thick = 0.011) {
  const stations = [
    [0, 0.001, 0.001, 0],
    [0.08, maxW * 0.62, thick * 0.72, 0],
    [0.2, maxW * 0.76, thick * 0.86, 0.45],
    [0.55, maxW * 0.88, thick * 0.94, 0.52],
    [0.82, maxW * 0.98, thick, 0.45],
    [len, maxW, thick, 0],
  ];
  const ring = (y, w, t, fuller) => {
    const hw = w / 2;
    const sw = w * 0.16;
    const ht = t / 2;
    const ft = ht * (1 - fuller);
    return [
      [hw, y, 0],
      [sw, y, ht],
      [0, y, ft],
      [-sw, y, ht],
      [-hw, y, 0],
      [-sw, y, -ht],
      [0, y, -ft],
      [sw, y, -ht],
    ];
  };
  const v = [];
  const tri = (a, b2, c) => v.push(...a, ...b2, ...c);
  for (let i = 0; i < stations.length - 1; i++) {
    const r0 = ring(...stations[i]);
    const r1 = ring(...stations[i + 1]);
    for (let k = 0; k < 8; k++) {
      const n = (k + 1) % 8;
      tri(r0[k], r1[k], r1[n]);
      tri(r0[k], r1[n], r0[n]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return G.boxUV(g);
}

/** Places a detailed arming sword with tip at y = 0. */
export function addSword(b) {
  b.add('steel', bladeGeom(0.88, 0.056, 0.011));
  // gently drooped forged quillon crossguard with flared terminals and central ecusson block
  b.add('iron', flatScroll([[-0.125, -0.016], [-0.06, -0.004], [0, 0], [0.06, -0.004], [0.125, -0.016]], 0.016, 0.024, 16), [0, 0.885, 0]);
  for (const sx of [-1, 1]) b.add('iron', new THREE.SphereGeometry(0.014, 10, 8), [sx * 0.128, 0.868, 0]);
  b.add('iron', bevelBox(0.064, 0.03, 0.032, 0.005), [0, 0.885, 0]);

  // spiral cord-wrapped leather grip with central brass riser ring
  const grip = new THREE.CylinderGeometry(0.0145, 0.018, 0.17, 16, 20);
  grip.translate(0, 0.985, 0);
  const pos = grip.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const rr = Math.hypot(x, z);
    if (rr > 0.005) {
      const a = Math.atan2(z, x);
      const ridge = 1 + 0.075 * Math.sin(y * 145 + a * 2);
      pos.setX(i, x * ridge * 1.15);
      pos.setZ(i, z * ridge * 0.72);
    }
  }
  grip.computeVertexNormals();
  b.add('leather', G.cylUV(grip, 0.018));
  const riser = G.cylinder(0.0185, 0.0185, 0.012, 14, { y0: 0.98 });
  riser.scale(1.15, 1, 0.74);
  b.add('gilt', riser);
  b.add('gilt', G.cylinder(0.019, 0.02, 0.016, 14, { y0: 0.898 }));

  // wheel pommel with raised central boss
  const pommel = lathe(
    [
      [0, -0.014],
      [0.018, -0.014],
      [0.032, -0.007],
      [0.034, 0],
      [0.032, 0.007],
      [0.018, 0.014],
      [0, 0.014],
    ],
    18,
  );
  pommel.rotateX(Math.PI / 2);
  b.add('iron', pommel, [0, 1.1, 0]);
  const boss = G.cylinder(0.016, 0.019, 0.032, 14);
  boss.rotateX(Math.PI / 2);
  b.add('gilt', boss, [0, 1.1, 0]);
  b.add('iron', G.cylinder(0.006, 0.008, 0.022, 8), [0, 1.135, 0]);
}

/** Builds a wedged/bevel-edged blade from a 2D spine-to-edge outline. */
function wedgedBlade(spinePts, edgePts, spineHalfT = 0.007, edgeHalfT = 0.0008) {
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

/** Places a detailed medieval halberd with butt spike at y = 0. */
export function addHalberd(b, haftLen = 1.76) {
  const headBase = haftLen + 0.08; // y where the steel socket starts (default 1.84)
  const dy = headBase - 1.84;
  b.add('iron', G.cylinder(0.019, 0.004, 0.08, 8, { y0: 0 })); // butt spike
  b.add('darkWood', G.cylinder(0.019, 0.02, haftLen, 8, { y0: 0.08 })); // octagonal ash haft
  for (const sx of [-1, 1]) {
    b.add('iron', bevelBlock(0.008, 0.36, 0.022, 0.002), [sx * 0.02, 1.54 + dy, 0]);
    rivets(b, 'gilt', [[sx * 0.025, 1.58 + dy, 0], [sx * 0.025, 1.68 + dy, 0], [sx * 0.025, 1.78 + dy, 0]], 0.0045);
  }
  b.add('steel', G.cylinder(0.023, 0.023, 0.22, 8, { y0: 1.72 + dy }));
  b.add('steel', G.cylinder(0.002, 0.026, 0.38, 4, { y0: 1.93 + dy }));
  b.add(
    'steel',
    wedgedBlade(
      [[0.02, 1.74 + dy], [0.075, 1.76 + dy], [0.085, 1.82 + dy], [0.075, 1.88 + dy], [0.02, 1.9 + dy]],
      [[0.165, 1.67 + dy], [0.205, 1.74 + dy], [0.215, 1.82 + dy], [0.205, 1.9 + dy], [0.16, 1.96 + dy]],
    ),
  );
  b.add(
    'steel',
    wedgedBlade(
      [[-0.02, 1.85 + dy], [-0.08, 1.84 + dy], [-0.155, 1.79 + dy]],
      [[-0.02, 1.8 + dy], [-0.085, 1.795 + dy], [-0.155, 1.788 + dy]],
    ),
  );
}

/**
 * Builds a truly subdivided closed parabolic-curved slab bounded vertically by yBot(x)..yTop(x)
 * across x in [xMin, xMax]. Prevents flat-chord penetration across curved shields.
 */
function curvedSlab(xMin, xMax, yBotFn, yTopFn, zFront, zBack, bendK = 0.45, nx = 20, ny = 8) {
  const f = [];
  const bk = [];
  for (let ix = 0; ix <= nx; ix++) {
    f[ix] = [];
    bk[ix] = [];
    const x = xMin + (ix / nx) * (xMax - xMin);
    const yb = yBotFn(x);
    const yt = Math.max(yb + 0.001, yTopFn(x));
    const dz = -bendK * x * x;
    for (let iy = 0; iy <= ny; iy++) {
      const y = yb + (iy / ny) * (yt - yb);
      f[ix][iy] = [x, y, zFront + dz];
      bk[ix][iy] = [x, y, zBack + dz];
    }
  }
  const v = [];
  const tri = (a, b2, c) => v.push(...a, ...b2, ...c);
  for (let ix = 0; ix < nx; ix++) {
    for (let iy = 0; iy < ny; iy++) {
      // front (+Z) and back (-Z) faces
      tri(f[ix][iy], f[ix + 1][iy], f[ix + 1][iy + 1]);
      tri(f[ix][iy], f[ix + 1][iy + 1], f[ix][iy + 1]);
      tri(bk[ix][iy], bk[ix + 1][iy + 1], bk[ix + 1][iy]);
      tri(bk[ix][iy], bk[ix][iy + 1], bk[ix + 1][iy + 1]);
    }
    // bottom & top edges
    tri(bk[ix][0], f[ix + 1][0], f[ix][0]);
    tri(bk[ix][0], bk[ix + 1][0], f[ix + 1][0]);
    tri(f[ix][ny], f[ix + 1][ny], bk[ix + 1][ny]);
    tri(f[ix][ny], bk[ix + 1][ny], bk[ix][ny]);
  }
  // left & right side edges
  for (let iy = 0; iy < ny; iy++) {
    tri(bk[0][iy], f[0][iy], f[0][iy + 1]);
    tri(bk[0][iy], f[0][iy + 1], bk[0][iy + 1]);
    tri(f[nx][iy], bk[nx][iy], bk[nx][iy + 1]);
    tri(f[nx][iy], bk[nx][iy + 1], f[nx][iy + 1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return G.boxUV(g);
}

/** Places a mesh-curved, rim-bound & riveted heater shield with point at y = 0, front facing +Z. */
export function addShield(b) {
  const W = 0.62;
  const H = 0.84;
  const hw = W / 2;
  const k = 0.45;
  const shieldBot = (x, pad = 0) => pad + (H - pad) * 0.62 * Math.pow(Math.min(1, Math.abs(x) / hw), 1.35);

  // curved oak board & crimson damask front overlay
  b.add('oak', curvedSlab(-hw, hw, (x) => shieldBot(x, 0), () => H, 0.013, -0.013, k, 20, 8));
  b.add('fabric', curvedSlab(-hw * 0.94, hw * 0.94, (x) => shieldBot(x, 0.028), () => H - 0.024, 0.018, 0.008, k, 18, 8));

  // gilt heraldic cross conforming strictly to the curved front face
  b.add('gilt', curvedSlab(-0.028, 0.028, (x) => shieldBot(x, 0.045), () => H - 0.03, 0.023, 0.014, k, 4, 8));
  b.add('gilt', curvedSlab(-hw * 0.9, hw * 0.9, () => H * 0.59, () => H * 0.65, 0.023, 0.014, k, 18, 2));

  // steel central umbo boss (closed base)
  b.add('steel', lathe([[0, 0], [0.068, 0], [0.068, 0.01], [0.045, 0.014], [0.032, 0.042], [0.015, 0.056], [0, 0.06]], 18), [0, H * 0.62, 0.017], 0, Math.PI / 2);

  // iron perimeter rim binding built directly as piecewise rod segments + joints (sharp corners, zero overshoot)
  const rimPts = [];
  for (let i = 0; i <= 16; i++) {
    const x = -hw + (i / 16) * W;
    rimPts.push([x, shieldBot(x, 0.01), -k * x * x]);
  }
  for (let i = 1; i <= 5; i++) rimPts.push([hw, H * 0.62 + (i / 5) * H * 0.38, -k * hw * hw]);
  for (let i = 1; i <= 10; i++) {
    const x = hw - (i / 10) * W;
    rimPts.push([x, H, -k * x * x]);
  }
  for (let i = 1; i < 5; i++) rimPts.push([-hw, H - (i / 5) * H * 0.38, -k * hw * hw]);
  for (let i = 0; i < rimPts.length; i++) {
    const a = rimPts[i];
    const c = rimPts[(i + 1) % rimPts.length];
    b.add('iron', G.rod(a, c, 0.015, 7));
    b.add('iron', new THREE.SphereGeometry(0.015, 7, 6), a);
  }
  // brass rivets seated cleanly on the curved front perimeter (z = 0.02 - k * x^2)
  const rPts = [];
  for (let i = 0; i < rimPts.length; i += 2) {
    const [rx, ry] = rimPts[i];
    const x = rx * 0.9;
    const y = Math.min(H - 0.04, Math.max(shieldBot(x, 0.06), ry * 0.96 + 0.02));
    rPts.push([x, y, 0.02 - k * x * x]);
  }
  rivets(b, 'gilt', rPts, 0.0065);

  // curved padded leather forearm cushion & grip straps on the back (-Z)
  b.add('leather', curvedSlab(-0.085, 0.085, () => H * 0.4, () => H * 0.64, -0.01, -0.026, k, 8, 2));
  for (const sx of [-0.08, 0.08]) {
    b.add('leather', curvedSlab(sx - 0.016, sx + 0.016, () => H * 0.42, () => H * 0.62, -0.018, -0.042, k, 4, 2));
  }
}

/** Medieval iron kettle helmet (Eisenhut) for hanging on the weapon rack peg. */
function addKettleHelmet(b, pos, rotY = 0) {
  b.push(pos, rotY);
  const pts = [
    [0.2, -0.01],
    [0.21, 0.0],
    [0.14, 0.04],
    [0.128, 0.07],
    [0.125, 0.14],
    [0.095, 0.2],
    [0.045, 0.23],
    [0, 0.24],
  ];
  b.add('steel', lathe(pts, 24));
  b.add('iron', G.cylinder(0.132, 0.132, 0.024, 24, { y0: 0.055 }));
  b.add('steel', bevelBox(0.022, 0.06, 0.25, 0.005), [0, 0.21, 0]);
  b.pop();
}

function weaponRack(b) {
  const W = 1.58;
  const D = 0.58;
  const H = 1.48;
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 - 0.08);
    b.add('darkWood', bevelBlock(0.095, 0.075, D, 0.008), [x, 0, 0]);
    b.push([x, 0, 0], Math.PI / 2);
    b.add('oak', G.beamXY(-D / 2 + 0.045, 0.07, -0.025, H, 0.065, 0.065, 0));
    b.add('oak', G.beamXY(D / 2 - 0.045, 0.07, 0.025, H, 0.065, 0.065, 0));
    b.pop();
    b.add('iron', bevelBlock(0.11, 0.085, 0.1, 0.004), [x, 0, 0]);
  }
  b.add('darkWood', bevelBlock(W - 0.1, 0.055, 0.25, 0.007), [0, 0.12, 0]);
  b.add('oak', bevelBlock(W - 0.1, 0.045, 0.035, 0.004), [0, 0.16, 0.11]);
  b.add('oak', bevelBlock(W - 0.1, 0.075, 0.075, 0.007), [0, 1.04, -0.055]);
  b.add('iron', bevelBlock(W - 0.08, 0.045, 0.085, 0.005), [0, H - 0.055, 0]);
  rivets(b, 'gilt', [[-0.68, H - 0.032, 0.045], [0, H - 0.032, 0.045], [0.68, H - 0.032, 0.045]], 0.008);

  // slightly shorter halberds (1.92 m) so the rack stays well-proportioned (~2.1 m tall overall)
  for (const x of [-0.46, -0.18, 0.1]) {
    b.push([x, 0.175, 0.02], 0, -0.095);
    addHalberd(b, 1.38);
    b.pop();
  }
  for (const x of [0.36, 0.54]) {
    b.push([x, 0.175, 0.03], 0, -0.095);
    addSword(b);
    b.pop();
  }
  // shield leaning on the right, kettle helmet resting cleanly on a wooden peg at top-left
  b.push([W / 2 + 0.06, 0.02, 0.06], 0.35, 0, -0.14);
  addShield(b);
  b.pop();
  b.add('darkWood', G.cylinder(0.022, 0.028, 0.14, 10, { y0: H - 0.02 }), [-W / 2 + 0.08, 0, 0]);
  addKettleHelmet(b, [-W / 2 + 0.08, H + 0.01, 0], 0.25);
}

function archeryTarget(b) {
  // round rough-hewn timber poles forming a tripod flush at y = 0
  for (const sx of [-1, 1]) {
    b.add('darkWood', G.rod([sx * 0.42, 0.01, 0.22], [sx * 0.05, 1.58, 0.08], 0.032, 10));
  }
  b.add('darkWood', G.rod([0, 0.01, -0.46], [0, 1.54, 0.06], 0.032, 10));
  for (let i = 0; i < 4; i++) {
    const r = new THREE.TorusGeometry(0.06, 0.009, 6, 16);
    r.rotateX(Math.PI / 2 + 0.25 * (i % 2 ? 1 : -1));
    b.add('straw', G.boxUV(r), [0, 1.46 + i * 0.015, 0.08]);
  }
  b.add('oak', bevelBlock(0.88, 0.065, 0.055, 0.007), [0, 0.62, 0.12]);

  // solid coiled-straw target boss (lathe profile with 9 sculpted straw coil ribs, zero gaps)
  b.push([0, 1.05, 0.14], 0, -0.12);
  b.add('darkWood', bevelBox(0.68, 0.06, 0.025, 0.004), [0, 0, -0.065]);
  b.add('darkWood', bevelBox(0.06, 0.68, 0.025, 0.004), [0, 0, -0.065]);
  const bossPts = [[0, -0.052], [0.41, -0.052], [0.435, -0.03], [0.44, 0.02], [0.425, 0.048]];
  for (let i = 9; i >= 1; i--) {
    const rOut = (i / 9) * 0.41;
    const rMid = ((i - 0.5) / 9) * 0.41;
    bossPts.push([rOut, 0.046], [rMid, 0.058]);
  }
  bossPts.push([0, 0.056]);
  const strawBoss = lathe(bossPts, 36);
  strawBoss.rotateX(Math.PI / 2);
  b.add('straw', strawBoss);

  // painted linen target face rings seated over the boss front
  const ring = (r, z, mat) => {
    const c = G.cylinder(r, r, 0.006, 28);
    c.rotateX(Math.PI / 2);
    b.add(mat, c, [0, 0, z]);
  };
  ring(0.32, 0.059, 'linen');
  ring(0.21, 0.063, 'fabric');
  ring(0.095, 0.067, 'gilt');

  // 3 arrows with steel bodkin points, wooden shafts and swept 3-vane fletching
  for (const [ax, ay, rx, ry] of [
    [-0.03, 0.02, 0.07, -0.09],
    [0.08, -0.04, -0.05, 0.11],
    [0.15, 0.11, 0.09, 0.07],
  ]) {
    b.push([ax, ay, 0.055], ry, rx);
    b.add('oak', G.cylinder(0.0048, 0.0048, 0.56, 8), [0, 0, 0.25], 0, Math.PI / 2);
    b.add('steel', G.cylinder(0.001, 0.007, 0.035, 4), [0, 0, -0.02], 0, -Math.PI / 2);
    const vane = new THREE.Shape();
    vane.moveTo(0, 0);
    vane.lineTo(0.085, 0);
    vane.lineTo(0.095, 0.017);
    vane.lineTo(0.02, 0.013);
    vane.closePath();
    const vg = new THREE.ExtrudeGeometry(vane, { depth: 0.002, bevelEnabled: false });
    vg.rotateY(-Math.PI / 2);
    for (let f = 0; f < 3; f++) {
      b.push([0, 0, 0.43], 0, 0, (f * Math.PI * 2) / 3);
      b.add(f === 0 ? 'fabric' : 'linen', G.boxUV(vg.clone()), [0.001, 0.004, 0]);
      b.pop();
    }
    b.pop();
  }
  b.pop();
}

export const weaponModules = [
  {
    id: 'sword_arming',
    name: 'Arming sword',
    category: 'weapon',
    description: '1.15 m knightly sword with fullered forged-steel blade, drooped quillons, spiral leather grip with riser ring and bossed wheel pommel.',
    build(M) {
      const b = newBuilder(M);
      addSword(b);
      return b.build('sword_arming');
    },
  },
  {
    id: 'halberd',
    name: 'Medieval halberd',
    category: 'weapon',
    description: '2.31 m polearm with bevel-edged crescent axe, rear fluke, riveted iron langets and octagonal ash haft.',
    build(M) {
      const b = newBuilder(M);
      addHalberd(b);
      return b.build('halberd');
    },
  },
  {
    id: 'shield_heater',
    name: 'Heater shield',
    category: 'weapon',
    description: 'Subdivided parabolic-curved oak & crimson damask shield with iron perimeter binding, brass rivets, steel umbo boss and leather straps.',
    build(M) {
      const b = newBuilder(M);
      addShield(b);
      return b.build('shield_heater');
    },
  },
  {
    id: 'weapon_rack',
    name: 'Armoury weapon rack',
    category: 'weapon',
    description: 'Timber A-frame armoury rack holding three halberds, two swords, a leaning shield and a steel kettle helmet.',
    build(M) {
      const b = newBuilder(M);
      weaponRack(b);
      return b.build('weapon_rack');
    },
  },
  {
    id: 'archery_target',
    name: 'Archery target',
    category: 'weapon',
    description: 'Ribbed coiled-straw target boss on a rope-lashed timber tripod, with linen target rings and three feathered arrows.',
    build(M) {
      const b = newBuilder(M);
      archeryTarget(b);
      return b.build('archery_target');
    },
  },
];
