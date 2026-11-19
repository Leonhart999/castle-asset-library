// Dungeon props (stage 4): wooden stocks, standing iron prisoner cage, wall-mounted shackles on chains, straw pallet
// and a wooden bucket. Base sits at y = 0, centred on x = z = 0, +Z is the front (wall mounts back onto z = 0),
// 1 unit = 1 m.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { newBuilder, lathe, ringBand, bevelBlock, bevelBox, rivets } from '../lib/kit.js';
import { makeRand, tube, hoop } from '../lib/props.js';

/**
 * Board W x H x T standing on y = 0, centred on X and Z, with half-round notches of radius r at the given x
 * positions: in the top edge when topEdge is true, otherwise in the bottom edge.
 */
function notchedBoard(W, H, T, xs, r, topEdge) {
  const s = new THREE.Shape();
  if (topEdge) {
    s.moveTo(-W / 2, 0);
    s.lineTo(W / 2, 0);
    s.lineTo(W / 2, H);
    for (const x of [...xs].sort((a, c) => c - a)) {
      s.lineTo(x + r, H);
      s.absarc(x, H, r, 0, Math.PI, true); // clockwise: dips below the top edge
    }
    s.lineTo(-W / 2, H);
    s.closePath();
  } else {
    s.moveTo(-W / 2, 0);
    for (const x of [...xs].sort((a, c) => a - c)) {
      s.lineTo(x - r, 0);
      s.absarc(x, 0, r, Math.PI, 0, true); // clockwise: rises above the bottom edge
    }
    s.lineTo(W / 2, 0);
    s.lineTo(W / 2, H);
    s.lineTo(-W / 2, H);
    s.closePath();
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 14 });
  g.translate(0, 0, -T / 2);
  return G.boxUV(g);
}

/** Oak stocks: two posts on sleepers, a fixed lower and a hinged upper board notched for three ankles, hasp and padlock, plank seat behind. */
function woodenStocks(b) {
  const W = 1.3;
  const T = 0.08;
  const H = 0.12;
  const Y0 = 0.5;
  const holes = [-0.4, 0, 0.4];
  for (const sx of [-1, 1]) {
    const px = sx * 0.71;
    b.add('darkWood', bevelBlock(0.14, 0.07, 0.62, 0.008), [px, 0, 0]);
    b.add('oak', bevelBlock(0.12, 1.1, 0.1, 0.01), [px, 0.07, 0]);
    b.add('darkWood', bevelBlock(0.15, 0.04, 0.13, 0.008), [px, 1.17, 0]);
    for (const sz of [-1, 1]) b.add('oak', G.rod([px, 0.07, sz * 0.28], [px, 0.56, sz * 0.05], 0.022, 8));
  }
  b.add('oak', notchedBoard(W, H, T, holes, 0.055, true), [0, Y0, 0]);
  b.add('oak', notchedBoard(W, H, T, holes, 0.055, false), [0, Y0 + H, 0]);

  // riveted hinge straps on the left, hasp and padlock on the right
  const seam = Y0 + H;
  for (const sz of [-1, 1]) {
    b.add('iron', bevelBox(0.18, 0.055, 0.012, 0.003), [-0.57, seam, sz * (T / 2 + 0.012)]);
    rivets(b, 'steel', [[-0.5, seam, sz * (T / 2 + 0.02)], [-0.64, seam, sz * (T / 2 + 0.02)]], 0.008);
  }
  b.add('iron', bevelBox(0.05, 0.2, 0.012, 0.003), [0.58, seam, T / 2 + 0.012]);
  rivets(b, 'steel', [[0.58, seam + 0.07, T / 2 + 0.02], [0.58, seam - 0.07, T / 2 + 0.02]], 0.008);
  b.add('iron', bevelBox(0.05, 0.065, 0.03, 0.006), [0.58, 0.55, 0.075]);
  b.add('iron', G.boxUV(new THREE.TorusGeometry(0.016, 0.0045, 5, 12, Math.PI)), [0.58, 0.585, 0.075]);

  // plank seat behind the stocks
  b.add('oak', bevelBlock(1.3, 0.04, 0.3, 0.006), [0, 0.34, -0.42]);
  for (const sx of [-1, 1]) b.add('darkWood', bevelBlock(0.08, 0.34, 0.26, 0.006), [sx * 0.5, 0, -0.42]);
}

/** Round standing prisoner cage: sixteen bars, three riveted bands, a barred door with hinges and padlock, ribbed dome and top ring. */
function standingCage(b) {
  const R = 0.45;
  const BARS = 16;
  const Y0 = 0.1;
  const Y1 = 1.75;

  // iron platform on four feet with a plank floor
  b.add('iron', G.cylinder(0.5, 0.5, 0.04, 28, { y0: 0.06 }));
  b.add('darkWood', G.cylinder(0.45, 0.45, 0.03, 24, { y0: 0.1 }));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    b.add('iron', bevelBlock(0.09, 0.06, 0.09, 0.008), [Math.cos(a) * 0.34, 0, Math.sin(a) * 0.34], -a);
  }

  // bars, leaving the front opening for the door
  for (let k = 0; k < BARS; k++) {
    const a = (k / BARS) * Math.PI * 2;
    const x = Math.cos(a) * R;
    const z = Math.sin(a) * R;
    if (z > 0 && Math.abs(x) < 0.21) continue;
    b.add('iron', G.cylinder(0.011, 0.011, Y1 - Y0, 6, { y0: Y0 }), [x, 0, z]);
  }
  const bandPts = [];
  for (const y of [0.24, 0.9, 1.56, Y1 - 0.02]) {
    b.add('iron', ringBand(R + 0.004, 0.014, 0.034, 32), [0, y, 0]);
    for (let k = 0; k < 8; k++) {
      const a = ((k + 0.5) / 8) * Math.PI * 2 + Math.PI / 8;
      if (Math.sin(a) > 0 && Math.abs(Math.cos(a)) < 0.5) continue;
      bandPts.push([Math.cos(a) * (R + 0.016), y + 0.017, Math.sin(a) * (R + 0.016)]);
    }
  }
  rivets(b, 'steel', bandPts, 0.008);

  // door: two heavy verticals, rails, three thin bars, hinges on the left and a padlock on the right
  const dz = Math.sqrt((R + 0.004) * (R + 0.004) - 0.21 * 0.21);
  for (const sx of [-1, 1]) b.add('iron', bevelBlock(0.032, 1.5, 0.032, 0.004), [sx * 0.21, 0.17, dz]);
  for (const y of [0.2, 0.9, 1.6]) b.add('iron', bevelBlock(0.45, 0.03, 0.03, 0.004), [0, y, dz]);
  for (const x of [-0.1, 0, 0.1]) b.add('iron', G.cylinder(0.008, 0.008, 1.38, 6, { y0: 0.23 }), [x, 0, dz]);
  for (const y of [0.4, 1.4]) b.add('iron', bevelBox(0.07, 0.04, 0.02, 0.004), [-0.21, y, dz + 0.02]);
  b.add('iron', bevelBox(0.05, 0.07, 0.03, 0.006), [0.21, 0.84, dz + 0.03]);
  b.add('iron', G.boxUV(new THREE.TorusGeometry(0.016, 0.0045, 5, 12, Math.PI)), [0.21, 0.875, dz + 0.03]);

  // ribbed dome and top ring
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const r = R * Math.cos((t * Math.PI) / 2);
      pts.push([Math.cos(a) * r, Y1 - 0.02 + 0.32 * Math.sin((t * Math.PI) / 2), Math.sin(a) * r]);
    }
    b.add('iron', tube(pts, 0.011, 16));
  }
  b.add('iron', hoop(R * Math.cos(0.6 * Math.PI / 2), 0.008, 24), [0, Y1 - 0.02 + 0.32 * Math.sin(0.6 * Math.PI / 2), 0]);
  b.add('iron', G.boxUV(new THREE.TorusGeometry(0.05, 0.01, 6, 16)), [0, Y1 + 0.35, 0]);
}

/** Wall-mounted iron bar with riveted eye plates and two chains ending in hinged cuffs. The lowest point of the cuffs is y = 0. */
function wallShackles(b) {
  const BAR_Y = 0.72;
  b.add('iron', bevelBox(0.9, 0.08, 0.03, 0.004), [0, BAR_Y, 0.015]);
  rivets(b, 'steel', [-0.4, -0.14, 0.14, 0.4].map((x) => [x, BAR_Y, 0.034]), 0.009);
  for (const sx of [-1, 1]) {
    const x = sx * 0.26;
    b.add('iron', bevelBox(0.04, 0.03, 0.05, 0.004), [x, 0.675, 0.04]);
    b.add('iron', G.boxUV(new THREE.TorusGeometry(0.022, 0.006, 6, 14)), [x, 0.64, 0.04]);
    // thirteen links, alternating planes, hanging from the eye down to the cuff
    for (let k = 0; k < 13; k++) {
      const link = new THREE.TorusGeometry(0.022, 0.0055, 5, 10);
      link.scale(0.62, 1.45, 1);
      if (k % 2 === 0) link.rotateY(Math.PI / 2);
      b.add('iron', G.boxUV(link), [x, 0.6 - k * 0.042, 0.05]);
    }
    // cuff with a lug, hinge pin and lock
    b.add('iron', ringBand(0.04, 0.012, 0.05, 18), [x, 0.046, 0.025], 0, Math.PI / 2);
    b.add('iron', bevelBox(0.025, 0.025, 0.05, 0.004), [x, 0.098, 0.05]);
    b.add('steel', G.cylinder(0.008, 0.008, 0.06, 8, { y0: -0.03 }), [x + 0.046, 0.046, 0.05], 0, Math.PI / 2);
    b.add('iron', bevelBox(0.02, 0.03, 0.06, 0.004), [x - 0.046, 0.046, 0.05]);
  }
}

/** Low plank bed frame with a straw mattress, a thin linen blanket, a rolled pillow and loose straw around it. */
function strawPallet(b) {
  const L = 1.9;
  const W = 0.85;
  for (const sx of [-1, 1]) b.add('timber', bevelBlock(0.07, 0.14, L, 0.008), [sx * (W / 2 - 0.035), 0, 0]);
  for (const sz of [-1, 1]) b.add('timber', bevelBlock(W, 0.14, 0.07, 0.008), [0, 0, sz * (L / 2 - 0.035)]);
  for (let i = 0; i < 7; i++) b.add('oak', bevelBlock(W - 0.1, 0.03, 0.2, 0.004), [0, 0.05, -L / 2 + 0.15 + i * 0.27]);

  b.add('straw', bevelBlock(W - 0.1, 0.12, L - 0.2, 0.05, 3), [0, 0.08, 0]);
  b.add('linen', bevelBlock(W - 0.18, 0.03, 1.0, 0.015, 2), [0, 0.2, 0.4]);
  b.add('linen', G.cylinder(0.075, 0.075, 0.5, 14, { y0: -0.25 }), [0, 0.275, -0.7], 0, 0, Math.PI / 2);

  const rand = makeRand(17);
  for (let i = 0; i < 24; i++) {
    const x = (rand() - 0.5) * 1.3;
    const z = (rand() - 0.5) * 2.4;
    const onBed = Math.abs(x) < 0.38 && Math.abs(z) < 0.9;
    b.add('straw', G.cylinder(0.004, 0.004, 0.25, 5, { y0: -0.125 }), [x, onBed ? 0.205 : 0.006, z], rand() * Math.PI, 0, Math.PI / 2);
  }
}

/** Stave bucket with two iron hoops, a rope bail on iron ears and water inside. */
function woodBucket(b) {
  b.add('barrel', lathe([[0, 0], [0.12, 0], [0.14, 0.02], [0.17, 0.3], [0.16, 0.306], [0.13, 0.04], [0, 0.035]], 28));
  b.add('iron', hoop(0.149, 0.0055, 28), [0, 0.07, 0]);
  b.add('iron', hoop(0.1645, 0.0055, 28), [0, 0.22, 0]);
  b.add('water', G.cylinder(0.14, 0.14, 0.003, 24, { y0: 0.2 }));
  b.add('straw', G.boxUV(new THREE.TorusGeometry(0.168, 0.006, 5, 24, Math.PI)), [0, 0.3, 0]);
  for (const sx of [-1, 1]) b.add('iron', bevelBox(0.02, 0.03, 0.025, 0.003), [sx * 0.172, 0.29, 0]);
}

const def = (id, category, name, description, fn) => ({
  id,
  name,
  category,
  description,
  build(M) {
    const b = newBuilder(M);
    fn(b);
    return b.build(id);
  },
});

export const dungeonModules = [
  def('stocks_wooden', 'dungeon', 'Wooden stocks', 'Oak stocks on sleeper feet: fixed lower and hinged upper board notched for three ankles, riveted iron hinge straps, hasp and padlock, plank seat behind.', woodenStocks),
  def('cage_iron', 'dungeon', 'Iron prisoner cage', 'Standing round cage 2.1 m high: sixteen bars, three riveted bands, plank floor on an iron platform, barred door with hinges and padlock, ribbed dome and top ring.', standingCage),
  def('shackles_wall', 'dungeon', 'Wall shackles', 'Riveted iron bar with two eye plates, thirteen-link chains and hinged cuffs. Wall-mounted with its back at z = 0; place it at the mounting height of the bar minus 0.76 m.', wallShackles),
  def('pallet_straw', 'dungeon', 'Straw pallet', 'Low plank bed frame 1.9 m long with slats, straw mattress, linen blanket, rolled pillow and loose straw around it.', strawPallet),
  def('bucket_wooden', 'dungeon', 'Wooden bucket', 'Stave bucket 0.3 m high with two iron hoops, rope bail on iron ears and a water surface.', woodBucket),
];
