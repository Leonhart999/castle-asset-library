// Workshop props (stage 4): smith's anvil on a bark stump, hand bellows on a trestle stand and a
// water-trough grindstone. Base sits at y = 0, centred on x = z = 0, 1 unit = 1 m, front faces +Z.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { newBuilder, ringBand, bevelBlock, bevelBox, rivets, prismXZ } from '../lib/kit.js';

/** Chopping stump with lumpy bark, a cut top with growth rings and two iron hoops. Its top surface is at y = 0.464. */
function stump(b) {
  const pts = [[0, 0], [0.25, 0], [0.285, 0.04], [0.268, 0.2], [0.272, 0.35], [0.258, 0.452], [0, 0.46]].map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, 44);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (Math.hypot(x, z) > 0.01 && y > 0.01 && y < 0.455) {
      // whole-number multiples of the angle keep the lathe seam closed
      const a = Math.atan2(z, x);
      const s = 1 + 0.032 * Math.sin(a * 5 + y * 7) + 0.018 * Math.sin(a * 11 - y * 4);
      pos.setX(i, x * s);
      pos.setZ(i, z * s);
    }
  }
  g.computeVertexNormals();
  b.add('bark', G.cylUV(g, 0.27));
  // sawn end grain with darker growth rings
  b.add('oak', G.cylinder(0.252, 0.252, 0.012, 36, { y0: 0.452 }));
  for (const r of [0.05, 0.11, 0.17, 0.225]) b.add('darkWood', ringBand(r, 0.005, 0.0015, 36), [0, 0.4632, 0]);
  b.add('iron', ringBand(0.296, 0.014, 0.05, 36), [0, 0.06, 0]);
  b.add('iron', ringBand(0.287, 0.014, 0.05, 36), [0, 0.36, 0]);
}

/** Forged anvil with its foot at y = 0, horn towards -X, tail with hardy and pritchel holes towards +X. */
function anvil(b) {
  const prof = [[-0.17, 0], [0.17, 0], [0.17, 0.035], [0.11, 0.07], [0.095, 0.13], [0.1, 0.2], [0.14, 0.25], [0.26, 0.25], [0.26, 0.3], [-0.14, 0.3], [-0.14, 0.17], [-0.095, 0.125], [-0.11, 0.07], [-0.17, 0.035]];
  const body = new THREE.ExtrudeGeometry(new THREE.Shape(prof.map(([x, y]) => new THREE.Vector2(x, y))), {
    depth: 0.085,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 1,
  });
  body.translate(0, 0, -0.0425);
  b.add('iron', G.boxUV(body));
  b.add('iron', bevelBlock(0.36, 0.034, 0.15, 0.005)); // wider foot
  b.add('iron', G.cylinder(0.005, 0.037, 0.34, 16), [-0.13, 0.263, 0], 0, 0, Math.PI / 2); // conical horn
  b.add('steel', bevelBlock(0.4, 0.026, 0.11, 0.004), [0.06, 0.298, 0]); // hardened face plate
  b.add('void', G.block(0.028, 0.002, 0.028), [0.18, 0.3245, 0]); // hardy hole
  b.add('void', G.cylinder(0.011, 0.011, 0.002, 14, { y0: 0.3245 }), [0.235, 0, 0]); // pritchel hole
  // iron staples pinning the foot to the stump
  for (const sx of [-1, 1]) {
    b.add('iron', bevelBlock(0.03, 0.04, 0.07, 0.004), [sx * 0.195, 0, 0]);
    rivets(b, 'steel', [[sx * 0.195, 0.042, 0.016], [sx * 0.195, 0.042, -0.016]], 0.006);
  }
}

function anvilOnStump(b) {
  stump(b);
  b.push([0, 0.464, 0]);
  anvil(b);
  b.pop();
}

/** Points along a closed 2D polygon, `per` points on every edge. */
function loopPoints(outline, per) {
  const out = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const c = outline[(i + 1) % outline.length];
    for (let k = 0; k < per; k++) out.push([a[0] + ((c[0] - a[0]) * k) / per, a[1] + ((c[1] - a[1]) * k) / per]);
  }
  return out;
}

/**
 * Pleated leather band between two closed loops of 3D points (same length). Every second ring is pushed outwards so
 * the band reads as folds; non-indexed with flat normals so the pleats stay crisp.
 */
function leatherBand(lower, upper, levels = 6, pleat = 0.03) {
  const rings = [];
  for (let k = 0; k <= levels; k++) {
    const t = k / levels;
    const bulge = k % 2 ? pleat : 0;
    rings.push(
      lower.map((p, i) => {
        const q = upper[i];
        const x = p[0] + (q[0] - p[0]) * t;
        const y = p[1] + (q[1] - p[1]) * t;
        const z = p[2] + (q[2] - p[2]) * t;
        const dz = z + 0.1; // outwards from the middle of the loop
        const len = Math.hypot(x, dz) || 1;
        return [x + (x / len) * bulge, y, z + (dz / len) * bulge];
      }),
    );
  }
  const v = [];
  const n = lower.length;
  for (let k = 0; k < levels; k++) {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const a = rings[k][i];
      const b2 = rings[k][j];
      const c = rings[k + 1][j];
      const d = rings[k + 1][i];
      v.push(...a, ...b2, ...c, ...a, ...c, ...d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return G.boxUV(g);
}

/** Hand bellows on a low trestle: two tapered oak boards hinged at the rear, pleated leather, iron nozzle. */
function handBellows(b) {
  const LOW_Y = 0.52;
  const T = 0.035;
  const LOW_TOP = LOW_Y + T;
  const HY = LOW_TOP + 0.02; // hinge height
  const THETA = 0.2; // opening angle in radians
  const outline = [[-0.26, -0.45], [0.26, -0.45], [0.2, -0.2], [0.1, 0.25], [0.07, 0.45], [-0.07, 0.45], [-0.1, 0.25], [-0.2, -0.2]];

  // trestle stand: four legs, side rails under the board and lower stretchers
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) b.add('darkWood', bevelBlock(0.055, 0.48, 0.055, 0.006), [sx * 0.2, 0, sz * 0.36]);
    b.add('darkWood', bevelBlock(0.05, 0.04, 0.8, 0.005), [sx * 0.2, 0.48, 0]);
    b.add('darkWood', bevelBlock(0.035, 0.035, 0.72, 0.004), [sx * 0.2, 0.16, 0]);
  }
  for (const sz of [-1, 1]) b.add('darkWood', bevelBlock(0.4, 0.035, 0.035, 0.004), [0, 0.16, sz * 0.36]);

  // lower board, upper board hinged about the rear edge
  b.add('oak', prismXZ(outline, LOW_Y, LOW_TOP));
  const inset = loopPoints(outline, 2).map(([x, z]) => [x * 0.88, z * 0.94]);
  rivets(b, 'gilt', inset.map(([x, z]) => [x, LOW_TOP + 0.002, z]), 0.007);
  b.add('darkWood', G.cylinder(0.018, 0.024, 0.32, 10), [0, LOW_Y + 0.018, -0.45], 0, -Math.PI / 2);
  b.add('darkWood', new THREE.SphereGeometry(0.028, 10, 8), [0, LOW_Y + 0.018, -0.77]);

  b.push([0, HY, -0.45], 0, -THETA);
  b.add('oak', prismXZ(outline.map(([x, z]) => [x, z + 0.45]), 0, T));
  rivets(b, 'gilt', inset.map(([x, z]) => [x, T + 0.002, z + 0.45]), 0.007);
  b.add('darkWood', G.cylinder(0.018, 0.024, 0.32, 10), [0, 0.018, 0], 0, THETA - Math.PI / 2); // tilted against the board so the handle stays level and clears the lower one
  b.add('darkWood', new THREE.SphereGeometry(0.028, 10, 8), [0, 0.018 + 0.32 * Math.sin(THETA), -0.32 * Math.cos(THETA)]);
  b.pop();

  // hinge pin and straps
  b.add('iron', G.cylinder(0.014, 0.014, 0.56, 10, { y0: -0.28 }), [0, HY + 0.01, -0.45], 0, 0, Math.PI / 2);
  for (const sx of [-1, 1]) b.add('iron', bevelBox(0.05, 0.02, 0.1, 0.003), [sx * 0.2, HY + 0.01, -0.45]);

  // pleated leather band closing the gap between the boards
  const loop = loopPoints(outline, 4).map(([x, z]) => [x * 0.96, z]);
  const lower = loop.map(([x, z]) => [x, LOW_TOP, z]);
  const upper = loop.map(([x, z]) => {
    const zr = z + 0.45;
    return [x, HY + zr * Math.sin(THETA), -0.45 + zr * Math.cos(THETA)];
  });
  b.add('bellowsLeather', leatherBand(lower, upper, 6, 0.03));

  // iron nozzle with a collar where it leaves the leather
  const ny = (LOW_TOP + HY + 0.9 * Math.sin(THETA)) / 2;
  b.add('iron', G.cylinder(0.016, 0.04, 0.58, 12), [0, ny, 0.38], 0, Math.PI / 2);
  b.add('iron', ringBand(0.04, 0.014, 0.03, 18), [0, ny, 0.45], 0, Math.PI / 2);
}

/** Foot-turned grindstone: sandstone wheel on an iron axle between two A-frame trestles, water trough underneath. */
function grindstone(b) {
  const AX = 0.7; // axle height
  for (const sx of [-1, 1]) {
    const x = sx * 0.42;
    b.push([x, 0, 0], Math.PI / 2);
    b.add('oak', G.beamXY(-0.3, 0.035, 0, 0.78, 0.06, 0.06, 0));
    b.add('oak', G.beamXY(0.3, 0.035, 0, 0.78, 0.06, 0.06, 0));
    b.pop();
    b.add('darkWood', bevelBlock(0.08, 0.04, 0.72, 0.006), [x, 0, 0]); // sill
    b.add('darkWood', bevelBlock(0.09, 0.1, 0.14, 0.008), [x, AX - 0.05, 0]); // bearing block
  }
  for (const sz of [-1, 1]) b.add('darkWood', bevelBlock(0.84, 0.04, 0.04, 0.005), [0, 0.3, sz * 0.185]);

  // water trough: floor, four walls, iron straps and the water surface; 0.56 m deep so the wheel rim (which dips 5 cm
  // into the water) clears the two long walls
  const TD = 0.56;
  b.add('darkWood', bevelBlock(0.32, 0.03, TD, 0.004), [0, 0.34, 0]);
  for (const sx of [-1, 1]) b.add('oak', bevelBlock(0.025, 0.12, TD, 0.004), [sx * 0.1475, 0.37, 0]);
  for (const sz of [-1, 1]) b.add('oak', bevelBlock(0.32, 0.12, 0.025, 0.004), [0, 0.37, sz * (TD / 2 - 0.0125)]);
  for (const sz of [-1, 1]) b.add('iron', bevelBlock(0.335, 0.02, 0.012, 0.003), [0, 0.45, sz * (TD / 2 + 0.002)]);
  b.add('water', G.block(0.266, 0.004, TD - 0.05), [0, 0.45, 0]);

  // axle, wheel, hub flanges with bolts
  b.add('iron', G.cylinder(0.018, 0.018, 1.08, 12, { y0: -0.54 }), [0, AX, 0], 0, 0, Math.PI / 2);
  b.add('grindstone', G.cylinder(0.3, 0.3, 0.1, 44, { y0: -0.05 }), [0, AX, 0], 0, 0, Math.PI / 2);
  for (const sx of [-1, 1]) {
    b.add('iron', G.cylinder(0.075, 0.075, 0.012, 20, { y0: -0.006 }), [sx * 0.056, AX, 0], 0, 0, Math.PI / 2);
    const bolts = [];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      bolts.push([sx * 0.064, AX + Math.cos(a) * 0.052, Math.sin(a) * 0.052]);
    }
    rivets(b, 'steel', bolts, 0.008);
  }

  // hand crank on the +X end of the axle
  b.add('iron', bevelBox(0.02, 0.16, 0.03, 0.004), [0.52, AX + 0.07, 0]);
  b.add('darkWood', G.cylinder(0.02, 0.02, 0.13, 12), [0.52, AX + 0.14, 0], 0, 0, -Math.PI / 2);
  b.add('darkWood', new THREE.SphereGeometry(0.022, 10, 8), [0.65, AX + 0.14, 0]);
}

export const workshopModules = [
  {
    id: 'anvil_smith',
    name: 'Smith anvil on stump',
    category: 'workshop',
    description: 'Forged anvil with conical horn, steel face plate, hardy and pritchel holes, iron staples, on a hooped bark stump. Working height 0.79 m.',
    build(M) {
      const b = newBuilder(M);
      anvilOnStump(b);
      return b.build('anvil_smith');
    },
  },
  {
    id: 'bellows_hand',
    name: 'Hand bellows',
    category: 'workshop',
    description: 'Forge bellows on a trestle stand: tapered oak boards hinged at the rear, pleated leather band, turned handles and an iron nozzle.',
    build(M) {
      const b = newBuilder(M);
      handBellows(b);
      return b.build('bellows_hand');
    },
  },
  {
    id: 'grindstone_wheel',
    name: 'Water grindstone',
    category: 'workshop',
    description: 'Sandstone grinding wheel on an iron axle between two A-frame trestles, hand crank and a water trough with a water surface.',
    build(M) {
      const b = newBuilder(M);
      grindstone(b);
      return b.build('grindstone_wheel');
    },
  },
];
