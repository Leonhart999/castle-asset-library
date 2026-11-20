// Castle doorway and forged iron door hardware (stage 5):
// Heavy ironbound oak door in chamfered stone frame, wrought-iron knocker ring, scrolled strap hinge, and sliding bolt latch.
// Conventions: 1 unit = 1 m, base at y = 0, centred on x = z = 0 (hardware mounts flat onto z = 0, facing +Z).

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { lathe, bevelBlock, bevelBox, rivets, flatScroll } from '../lib/kit.js';
import { newArchBuilder, archCurvePts, archNormals, sweepProfile, voussoirBlock } from '../lib/archKit.js';

/** Height of a symmetric pointed two-centred arch of span `w`, spring `springY`, rise `rise` at horizontal offset `x`. */
function archYAt(x, w, springY, rise) {
  const hw = w / 2;
  const rVal = Math.max(hw, rise);
  const cx = (hw * hw - rVal * rVal) / (2 * hw);
  const rad = hw - cx;
  const ax = Math.min(hw, Math.abs(x));
  return springY + Math.sqrt(Math.max(0, rad * rad - (ax + Math.abs(cx)) * (ax + Math.abs(cx))));
}

/** Heavy planked oak castle door with forged iron straps, studs, ring pull & rear Z-bracing inside a pointed stone doorway. */
function buildDoorIronbound(b) {
  const frameW = 2.04;
  const openW = 1.24;
  const sillH = 0.12;
  const springY = 2.02;
  const rise = 0.72;
  const frameD = 0.56;
  const jambW = (frameW - openW) / 2; // 0.40 m

  // chamfered dressed stone threshold step + flanking stone jamb piers
  b.add('dressed', bevelBlock(frameW + 0.12, sillH, frameD + 0.14, 0.012), [0, 0, 0]);
  for (const sx of [-1, 1]) {
    const jx = sx * (openW / 2 + jambW / 2);
    b.add('stone', bevelBlock(jambW, springY - sillH, frameD, 0.01), [jx, sillH, 0]);
    b.add('dressed', bevelBlock(0.18, springY - sillH, frameD + 0.04, 0.012), [sx * (openW / 2 + 0.08), sillH, 0]);
  }

  // pointed arch stone surround: spandrel backing + dressed voussoirs + keystone
  const pts = archCurvePts(openW, springY, rise, 10);
  const nors = archNormals(pts);
  const midIdx = Math.floor((pts.length - 1) / 2);
  for (let i = 0; i < pts.length - 1; i++) {
    if (i === midIdx - 1 || i === midIdx) continue;
    b.add('dressed', voussoirBlock(pts[i], pts[i + 1], nors[i], nors[i + 1], 0, 0.34, frameD + 0.04, 0.012));
  }
  b.add('dressed', bevelBox(0.28, 0.42, frameD + 0.08, 0.014), [0, springY + rise + 0.18, 0]);
  // solid masonry spandrel wall above the arch extrados up to horizontal head level (y = 3.12)
  const topY = 3.12;
  const spandrel = new THREE.Shape();
  spandrel.moveTo(-frameW / 2, springY);
  spandrel.lineTo(-frameW / 2, topY);
  spandrel.lineTo(frameW / 2, topY);
  spandrel.lineTo(frameW / 2, springY);
  for (let i = pts.length - 1; i >= 0; i--) {
    spandrel.lineTo(pts[i][0] * 1.15, Math.min(topY - 0.02, pts[i][1] + 0.14));
  }
  spandrel.closePath();
  const sg = new THREE.ExtrudeGeometry(spandrel, { depth: frameD - 0.02, bevelEnabled: false });
  sg.translate(0, 0, -(frameD - 0.02) / 2);
  b.add('stone', G.boxUV(sg));
  b.add('dressed', bevelBlock(frameW + 0.08, 0.14, frameD + 0.06, 0.012), [0, topY, 0]);

  // 6 individual vertical oak door planks trimmed cleanly along the pointed arch curve
  const nPlanks = 6;
  const pw = (openW - 0.01) / nPlanks;
  const leafT = 0.095;
  for (let i = 0; i < nPlanks; i++) {
    const x0 = -openW / 2 + 0.005 + i * pw + 0.003;
    const x1 = x0 + pw - 0.006;
    const xm = (x0 + x1) / 2;
    const y0 = sillH + 0.005;
    const s = new THREE.Shape();
    s.moveTo(x0, y0);
    s.lineTo(x1, y0);
    s.lineTo(x1, archYAt(x1, openW, springY, rise) + 0.01);
    s.lineTo(xm, archYAt(xm, openW, springY, rise) + 0.01);
    s.lineTo(x0, archYAt(x0, openW, springY, rise) + 0.01);
    s.closePath();
    const pg = new THREE.ExtrudeGeometry(s, { depth: leafT - 0.006, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.002, bevelSegments: 1 });
    pg.translate(0, 0, -(leafT - 0.006) / 2);
    b.add('doorWood', G.boxUV(pg));
  }

  // rear (-Z) heavy oak horizontal ledges and diagonal Z-brace
  const zBack = -leafT / 2 - 0.022;
  for (const ry of [0.58, 1.24, 1.88]) {
    b.add('darkWood', bevelBox(openW - 0.08, 0.14, 0.045, 0.006), [0, ry, zBack]);
  }
  const bLen = Math.hypot(openW - 0.22, 1.88 - 0.58);
  const bAng = Math.atan2(1.88 - 0.58, openW - 0.22);
  b.add('darkWood', bevelBox(bLen, 0.11, 0.04, 0.006), [0, (0.58 + 1.88) / 2, zBack], 0, 0, bAng);

  // front (+Z) forged iron strap hinges with scrolling foliate curls, lock plate, ring pull and studs
  const zFront = leafT / 2 + 0.008;
  for (const hy of [0.58, 1.88]) {
    b.add('iron', bevelBox(openW * 0.84, 0.068, 0.014, 0.003), [-0.07, hy, zFront]);
    // hinge pintle knuckle at left jamb
    b.add('iron', G.cylinder(0.024, 0.024, 0.1, 10, { y0: -0.05 }), [-openW / 2 + 0.02, hy, zFront + 0.01]);
    // foliate curl branches at right tip of strap
    for (const sy of [-1, 1]) {
      b.add('iron', flatScroll([[0.25, 0], [0.36, sy * 0.06], [0.44, sy * 0.11], [0.39, sy * 0.13]], 0.02, 0.012, 14), [0, hy, zFront]);
    }
    const rPts = [];
    for (let k = -4; k <= 3; k++) rPts.push([k * 0.13 - 0.02, hy, zFront + 0.009]);
    rivets(b, 'iron', rPts, 0.01);
  }

  // gothic lock escutcheon plate and forged iron ring pull on the right opening side
  b.add('iron', bevelBox(0.14, 0.28, 0.016, 0.004), [0.41, 1.24, zFront]);
  b.add('gilt', bevelBox(0.045, 0.075, 0.01, 0.002), [0.41, 1.18, zFront + 0.012]);
  b.add('iron', G.cylinder(0.022, 0.022, 0.04, 10), [0.41, 1.31, zFront + 0.018], 0, Math.PI / 2);
  const ring = new THREE.TorusGeometry(0.068, 0.012, 8, 18);
  b.add('iron', G.boxUV(ring), [0.41, 1.25, zFront + 0.036], 0, -0.18);

  // perimeter dome studs along top arch edge
  const archStuds = [];
  for (let i = 1; i < pts.length - 1; i += 2) {
    archStuds.push([pts[i][0] * 0.88, pts[i][1] - 0.08, zFront + 0.005]);
  }
  rivets(b, 'iron', archStuds, 0.011);
}

/** Ornate wrought-iron & aged-brass castle door knocker ring mounted on a gothic backplate (back at z = 0). */
function buildHardwareKnocker(b) {
  // pointed gothic iron backplate (lifted +0.003 so bevel bottom sits exactly at y = 0)
  const plate = new THREE.Shape();
  plate.moveTo(0, 0.003);
  plate.lineTo(0.095, 0.08);
  plate.lineTo(0.115, 0.22);
  plate.quadraticCurveTo(0.11, 0.31, 0, 0.34);
  plate.quadraticCurveTo(-0.11, 0.31, -0.115, 0.22);
  plate.lineTo(-0.095, 0.08);
  plate.closePath();
  const pg = new THREE.ExtrudeGeometry(plate, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1, curveSegments: 12 });
  b.add('iron', G.boxUV(pg), [0, 0, 0.003]);

  // pyramid-headed mounting rivets
  rivets(b, 'iron', [[-0.072, 0.24, 0.02], [0.072, 0.24, 0.02], [-0.062, 0.1, 0.02], [0.062, 0.1, 0.02]], 0.01);

  // aged brass decorative rosette medallion and sculpted pivot boss
  b.add('gilt', G.cylinder(0.056, 0.062, 0.014, 12), [0, 0.23, 0.02], 0, Math.PI / 2);
  b.add('iron', G.cylinder(0.026, 0.032, 0.042, 10), [0, 0.23, 0.036], 0, Math.PI / 2);
  b.add('iron', G.cylinder(0.016, 0.016, 0.06, 10, { y0: -0.03 }), [0, 0.23, 0.055], 0, 0, Math.PI / 2);

  // heavy forged octagonal/beaded iron knocker ring hanging cleanly against strike anvil
  const ringR = 0.088;
  const ring = new THREE.TorusGeometry(ringR, 0.016, 8, 22);
  b.push([0, 0.23, 0.055], 0, -0.18);
  b.add('iron', G.boxUV(ring), [0, -ringR, 0]);
  // enlarged forged strike bead at bottom of the ring
  b.add('gilt', new THREE.SphereGeometry(0.022, 10, 8), [0, -ringR * 2, 0]);
  b.pop();

  // forged anvil strike stud on lower backplate
  b.add('iron', G.cylinder(0.016, 0.024, 0.026, 10), [0, 0.062, 0.026], 0, Math.PI / 2);
}

/** Ornate medieval wrought-iron scrolled strap hinge with pintle bracket & fleur-de-lis finial (back at z = 0). */
function buildHardwareHinge(b) {
  // vertical pintle gudgeon bracket at -X edge (y = 0..0.24)
  b.add('iron', bevelBlock(0.048, 0.24, 0.018, 0.003), [-0.41, 0, 0.009]);
  rivets(b, 'iron', [[-0.41, 0.032, 0.02], [-0.41, 0.208, 0.02]], 0.009);
  // forged gudgeon arm + cylindrical pintle pin + rolled knuckle barrel
  b.add('iron', bevelBox(0.036, 0.036, 0.044, 0.003), [-0.39, 0.085, 0.026]);
  b.add('iron', G.cylinder(0.014, 0.014, 0.105, 12, { y0: 0.085 }), [-0.39, 0, 0.042]);
  b.add('iron', G.cylinder(0.023, 0.023, 0.072, 14, { y0: 0.1 }), [-0.39, 0, 0.042]);

  // tapered main hammered iron strap bar sweeping along +X from knuckle to fleur-de-lis spear tip
  b.add('iron', bevelBox(0.76, 0.048, 0.016, 0.003), [-0.01, 0.136, 0.014]);
  b.add('iron', bevelBox(0.045, 0.036, 0.036, 0.004), [-0.38, 0.136, 0.026]);
  // spear/fleur-de-lis terminal at +X tip
  const tip = new THREE.Shape();
  tip.moveTo(0, -0.024);
  tip.lineTo(0.04, -0.05);
  tip.lineTo(0.11, 0);
  tip.lineTo(0.04, 0.05);
  tip.lineTo(0, 0.024);
  tip.closePath();
  const tg = new THREE.ExtrudeGeometry(tip, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1 });
  b.add('iron', G.boxUV(tg), [0.36, 0.136, 0.007]);

  // 4 symmetric scrolled foliate C-tendrils branching above and below the main strap
  for (const sy of [-1, 1]) {
    b.add(
      'iron',
      flatScroll([[-0.22, 0.136], [-0.14, 0.136 + sy * 0.06], [-0.02, 0.136 + sy * 0.11], [0.06, 0.136 + sy * 0.08], [0.03, 0.136 + sy * 0.05]], 0.02, 0.012, 18),
      [0, 0, 0.012],
    );
    b.add(
      'iron',
      flatScroll([[0.08, 0.136], [0.16, 0.136 + sy * 0.055], [0.27, 0.136 + sy * 0.095], [0.32, 0.136 + sy * 0.06]], 0.018, 0.012, 16),
      [0, 0, 0.012],
    );
  }

  // forged domed iron & brass rivets along the strap spine
  const rv = [];
  for (let i = 0; i < 6; i++) rv.push([-0.3 + i * 0.125, 0.136, 0.024]);
  rivets(b, 'gilt', rv, 0.0085);
}

/** Heavy medieval forged iron sliding door bolt & thumb-latch assembly (back at z = 0). */
function buildHardwareLatch(b) {
  // main mounting plate (x = -0.10) + separate strike catch plate (x = +0.23), lowest tab at y = 0
  for (const [cx, w] of [[-0.08, 0.42], [0.24, 0.13]]) {
    b.add('iron', bevelBlock(w, 0.16, 0.014, 0.003), [cx, 0.02, 0.007]);
    // forged triangular top & bottom strap finials touching y = 0
    b.add('iron', bevelBlock(0.052, 0.2, 0.014, 0.003), [cx - w * 0.34, 0, 0.007]);
    b.add('iron', bevelBlock(0.052, 0.2, 0.014, 0.003), [cx + w * 0.34, 0, 0.007]);
  }
  rivets(
    b,
    'iron',
    [
      [-0.22, 0.025, 0.016],
      [-0.22, 0.175, 0.016],
      [0.06, 0.025, 0.016],
      [0.06, 0.175, 0.016],
      [0.2, 0.025, 0.016],
      [0.2, 0.175, 0.016],
      [0.28, 0.025, 0.016],
      [0.28, 0.175, 0.016],
    ],
    0.0085,
  );

  // two bridged keeper staples on main plate + catch-keep box on strike plate
  for (const kx of [-0.21, 0.02]) {
    b.add('iron', flatScroll([[0, 0.04], [0.036, 0.04], [0.046, 0.1], [0.036, 0.16], [0, 0.16]], 0.036, 0.012, 14), [kx, 0, 0.014], -Math.PI / 2);
  }
  b.add('iron', flatScroll([[0, 0.04], [0.038, 0.04], [0.048, 0.1], [0.038, 0.16], [0, 0.16]], 0.056, 0.014, 14), [0.24, 0, 0.014], -Math.PI / 2);

  // sliding forged square-section bolt bar with tapered nose engaging the strike keep
  b.add('iron', bevelBox(0.52, 0.034, 0.03, 0.004), [0.02, 0.1, 0.032]);
  b.add('iron', G.cylinder(0.008, 0.019, 0.045, 4), [0.278, 0.1, 0.032], 0, 0, -Math.PI / 2);

  // upright forged S-scroll handle grip with turned brass finial knob
  b.add('iron', flatScroll([[0, 0.1], [0.01, 0.145], [0.038, 0.18], [0.026, 0.215]], 0.022, 0.014, 14), [-0.11, 0, 0.032], -Math.PI / 2);
  b.add('gilt', new THREE.SphereGeometry(0.019, 10, 8), [-0.11, 0.222, 0.058]);

  // pivoted drop-latch security catch resting cleanly between keepers
  b.add('iron', bevelBox(0.07, 0.024, 0.016, 0.003), [-0.09, 0.068, 0.028], 0, 0, -0.22);
  rivets(b, 'gilt', [[-0.12, 0.074, 0.038]], 0.007);
}

export const doorModules = [
  {
    id: 'door_ironbound',
    name: 'Iron-bound oak door',
    category: 'door',
    description: 'Pointed stone doorway with planked oak castle door, rear Z-bracing, scrolled wrought-iron strap hinges, dome studs, lock plate and ring pull.',
    build(M) {
      const b = newArchBuilder(M);
      buildDoorIronbound(b);
      return b.build('door_ironbound');
    },
  },
  {
    id: 'hardware_knocker',
    name: 'Forged door knocker',
    category: 'door',
    description: 'Gothic wrought-iron & aged-brass rosette door knocker with pyramid rivets, heavy ring pull and strike anvil.',
    build(M) {
      const b = newArchBuilder(M);
      buildHardwareKnocker(b);
      return b.build('hardware_knocker');
    },
  },
  {
    id: 'hardware_hinge',
    name: 'Scrolled iron strap hinge',
    category: 'door',
    description: 'Medieval wrought-iron door strap hinge with vertical pintle bracket, barrel knuckle, fleur-de-lis finial, symmetric foliate scrolls and brass rivets.',
    build(M) {
      const b = newArchBuilder(M);
      buildHardwareHinge(b);
      return b.build('hardware_hinge');
    },
  },
  {
    id: 'hardware_latch',
    name: 'Forged sliding door latch',
    category: 'door',
    description: 'Heavy wrought-iron sliding deadbolt latch with riveted backplates, bridged keeper staples, strike catch, scrolled upright handle and brass knob.',
    build(M) {
      const b = newArchBuilder(M);
      buildHardwareLatch(b);
      return b.build('hardware_latch');
    },
  },
];
