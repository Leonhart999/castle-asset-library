// Courtyard props (stage 4): stone well with windlass and bucket, stone horse trough and a hand cart with a hay load.
// Base sits at y = 0, centred on x = z = 0, +Z is the front, 1 unit = 1 m.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { newBuilder, lathe, ringBand, bevelBlock, bevelBox, rivets } from '../lib/kit.js';
import { makeRand, tube, hoop } from '../lib/props.js';

/** Round stone well with a dressed capstone, two oak posts, a windlass with rope coils and crank, a hanging bucket and a slate roof. */
function stoneWell(b) {
  const R = 0.78;
  b.add('stone', ringBand(R, 0.34, 0.9, 40));
  b.add('dressed', ringBand(R, 0.44, 0.1, 40), [0, 0.9, 0]);
  b.add('void', G.cylinder(0.58, 0.58, 0.01, 28));
  b.add('water', G.cylinder(0.58, 0.58, 0.004, 28, { y0: 0.18 }));

  // posts, top beam and gable roof
  for (const sx of [-1, 1]) b.add('darkWood', bevelBlock(0.13, 1.72, 0.13, 0.012), [sx * 0.9, 1.0, 0]);
  b.add('darkWood', bevelBlock(2.1, 0.12, 0.15, 0.01), [0, 2.72, 0]);
  const roof = G.gableRoof(2.4, 1.6, 32, { overhang: 0.15, eaveOverhang: 0.2, thick: 0.07 });
  for (const s of roof.slabs) b.add('roof', s, [0, 2.84, 0]);

  // windlass with six coils of rope, iron crank stub, crank arm and wooden handle
  const WY = 2.1;
  b.add('darkWood', G.cylinder(0.09, 0.09, 1.7, 14, { y0: -0.85 }), [0, WY, 0], 0, 0, Math.PI / 2);
  b.push([0, WY, 0], 0, 0, Math.PI / 2); // local Y runs along -X
  for (let i = 0; i < 6; i++) b.add('straw', hoop(0.104, 0.012, 18), [0, 0.1 + i * 0.045, 0]);
  b.pop();
  b.add('iron', G.cylinder(0.02, 0.02, 0.26, 10, { y0: 0.82 }), [0, WY, 0], 0, 0, -Math.PI / 2);
  b.add('iron', bevelBox(0.03, 0.34, 0.03, 0.004), [1.07, WY - 0.12, 0]);
  b.add('darkWood', G.cylinder(0.025, 0.025, 0.18, 10, { y0: -0.09 }), [1.14, WY - 0.27, 0], 0, 0, Math.PI / 2);

  // rope and bucket with two iron hoops and a bail
  const BY = 1.18;
  b.add('straw', tube([[-0.12, WY - 0.1, 0], [-0.12, 1.85, 0.02], [-0.12, BY + 0.37, 0]], 0.012, 12));
  b.push([-0.12, BY, 0]);
  b.add('barrel', lathe([[0, 0], [0.11, 0], [0.13, 0.02], [0.15, 0.22], [0.142, 0.226], [0.12, 0.2], [0.102, 0.03], [0, 0.03]], 24));
  b.add('iron', hoop(0.136, 0.005, 24), [0, 0.05, 0]);
  b.add('iron', hoop(0.148, 0.005, 24), [0, 0.17, 0]);
  b.add('iron', G.boxUV(new THREE.TorusGeometry(0.15, 0.006, 5, 16, Math.PI)), [0, 0.222, 0]);
  b.pop();
}

/** Dressed-stone horse trough with four walls, a water surface and two iron tie rods with riveted heads. */
function stoneTrough(b) {
  const L = 1.7;
  const W = 0.58;
  const H = 0.5;
  const t = 0.1;
  b.add('dressed', bevelBlock(L, 0.1, W, 0.01));
  for (const sz of [-1, 1]) b.add('dressed', bevelBlock(L, H - 0.1, t, 0.012), [0, 0.1, sz * (W / 2 - t / 2)]);
  for (const sx of [-1, 1]) b.add('dressed', bevelBlock(t, H - 0.1, W - 2 * t, 0.012), [sx * (L / 2 - t / 2), 0.1, 0]);
  b.add('water', G.block(L - 2 * t, 0.004, W - 2 * t), [0, 0.38, 0]);
  for (const x of [-0.5, 0.5]) {
    b.add('iron', G.cylinder(0.011, 0.011, W + 0.04, 8, { y0: -(W + 0.04) / 2 }), [x, H - 0.02, 0], 0, Math.PI / 2);
    rivets(b, 'iron', [[x, H - 0.02, W / 2 + 0.022], [x, H - 0.02, -W / 2 - 0.022]], 0.02);
  }
}

/** Iron-tyred spoked wheel on an X-axis axle at (x, y); the lowest point of the tyre is at y - R - 0.016. */
function cartWheel(b, x, y, R = 0.4) {
  b.push([x, y, 0], 0, 0, Math.PI / 2); // local Y becomes the axle direction
  b.add('oak', ringBand(R - 0.015, 0.05, 0.06, 32), [0, -0.03, 0]);
  b.add('iron', ringBand(R + 0.01, 0.012, 0.066, 32), [0, -0.033, 0]);
  for (let i = 0; i < 4; i++) b.add('oak', bevelBox(2 * R - 0.08, 0.04, 0.04, 0.005), [0, 0, 0], (i * Math.PI) / 4);
  b.add('darkWood', G.cylinder(0.065, 0.075, 0.13, 14, { y0: -0.065 }));
  b.add('iron', ringBand(0.077, 0.01, 0.02, 14), [0, -0.07, 0]);
  b.add('iron', ringBand(0.077, 0.01, 0.02, 14), [0, 0.05, 0]);
  b.pop();
}

/** Two-wheeled hand cart: plank bed with boarded sides, long shafts with a cross bar, a front stand and a loose hay load. */
function handCart(b) {
  const AY = 0.416;
  for (const sx of [-1, 1]) cartWheel(b, sx * 0.57, AY);
  b.add('iron', G.cylinder(0.022, 0.022, 1.3, 10, { y0: -0.65 }), [0, AY, 0], 0, 0, Math.PI / 2);
  b.add('darkWood', bevelBlock(0.86, 0.09, 0.12, 0.008), [0, AY + 0.02, 0]);
  b.add('oak', bevelBlock(0.9, 0.04, 1.3, 0.006), [0, 0.52, 0]);
  for (const sx of [-1, 1]) b.add('timber', bevelBlock(0.045, 0.26, 1.3, 0.006), [sx * 0.4375, 0.56, 0]);
  for (const sz of [-1, 1]) b.add('timber', bevelBlock(0.9, 0.26, 0.045, 0.006), [0, 0.56, sz * 0.6275]);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) b.add('darkWood', bevelBlock(0.07, 0.34, 0.07, 0.01), [sx * 0.43, 0.52, sz * 0.62]);
  }

  // shafts under the bed, cross bar, and a stand with a flat foot on each shaft
  for (const sx of [-1, 1]) {
    b.add('darkWood', G.rod([sx * 0.3, 0.47, -0.55], [sx * 0.3, 0.47, 1.95], 0.03, 8));
    b.add('darkWood', G.rod([sx * 0.3, 0.47, 1.7], [sx * 0.3, 0.04, 1.78], 0.025, 8));
    b.add('darkWood', bevelBlock(0.06, 0.03, 0.09, 0.005), [sx * 0.3, 0, 1.78]);
  }
  b.add('oak', bevelBlock(0.66, 0.04, 0.045, 0.006), [0, 0.45, 1.3]);

  // hay load with loose stalks
  b.add('straw', bevelBlock(0.78, 0.28, 1.1, 0.09, 3), [0, 0.56, 0]);
  const rand = makeRand(5);
  for (let i = 0; i < 16; i++) {
    b.add('straw', G.cylinder(0.004, 0.004, 0.2, 5), [(rand() - 0.5) * 0.7, 0.8, (rand() - 0.5) * 1.0], rand() * Math.PI, (rand() - 0.5) * 1.2, (rand() - 0.5) * 1.2);
  }
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

export const courtyardModules = [
  def('well_stone', 'courtyard', 'Stone well', 'Round stone well 3.3 m high with dressed capstone, oak posts, slate gable roof, windlass with rope coils and crank, iron-hooped bucket and a water surface.', stoneWell),
  def('trough_stone', 'courtyard', 'Stone horse trough', 'Dressed-stone trough 1.7 m long with four walls, a water surface and two iron tie rods with riveted heads.', stoneTrough),
  def('cart_hand', 'courtyard', 'Hand cart', 'Two-wheeled cart with iron-tyred spoked wheels, boarded bed, long shafts, front stand and a hay load. Shafts point towards +Z.', handCart),
];

