// Architectural castle fireplace and chimney stack (stage 5):
// Great-hall hooded stone fireplace with iron andirons and log fire, and tall battered stone-and-brick chimney stack.
// Conventions: 1 unit = 1 m, base at y = 0, centred on x = z = 0, front faces +Z.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { lathe, bevelBlock, bevelBox, corbelRow, flatScroll, charcoalLump, softFlame } from '../lib/kit.js';
import { newArchBuilder, loftRings } from '../lib/archKit.js';

/** Monumental medieval great-hall hooded stone fireplace with iron andirons, logs, embers and flames. */
function buildFireplaceHearth(b) {
  const W = 2.5;
  const D = 1.24;
  const hearthH = 0.12;
  const backZ = -0.48;

  // raised slate hearth apron slab + chamfered stone fender curb
  b.add('slateFloor', bevelBlock(W, hearthH, D, 0.012), [0, 0, 0]);
  b.add('dressed', bevelBlock(W - 0.12, 0.05, 0.1, 0.008), [0, hearthH, D / 2 - 0.06]);
  for (const sx of [-1, 1]) {
    b.add('dressed', bevelBlock(0.1, 0.05, D - 0.12, 0.008), [sx * (W / 2 - 0.06), hearthH, 0]);
  }

  // stone chimney breast back wall and brick-lined firebox cheeks
  b.add('stone', bevelBlock(2.34, 2.02, 0.24, 0.01), [0, hearthH, backZ]);
  b.add('brick', bevelBlock(1.48, 1.56, 0.12, 0.006), [0, hearthH, backZ + 0.14]);
  // soot-darkened cast-iron / carved stone arched fireback plate
  b.add('soot', bevelBlock(0.84, 0.96, 0.05, 0.008), [0, hearthH + 0.02, backZ + 0.21]);
  b.add('soot', G.cylinder(0.42, 0.42, 0.05, 18, { y0: -0.025 }), [0, hearthH + 0.98, backZ + 0.21], 0, Math.PI / 2);

  for (const sx of [-1, 1]) {
    // splayed inner brick firebox cheeks
    b.add('brick', bevelBlock(0.14, 1.56, 0.66, 0.006), [sx * 0.72, hearthH, -0.14]);
    // massive carved stone jamb piers + stepped plinth + projecting corbel brackets
    const jx = sx * 0.92;
    b.add('dressed', bevelBlock(0.42, 0.24, 0.78, 0.014), [jx, hearthH, -0.12]);
    b.add('dressed', bevelBlock(0.36, 1.06, 0.7, 0.012), [jx, hearthH + 0.24, -0.12]);
    b.add('dressed', bevelBlock(0.42, 0.16, 0.78, 0.012), [jx, hearthH + 1.3, -0.12]);
    b.add('dressed', bevelBlock(0.44, 0.18, 0.88, 0.012), [jx, hearthH + 1.44, -0.07]);
  }

  // massive chamfered stone mantel lintel + 3 recessed shield/panel frieze blocks + mantel shelf
  b.add('dressed', bevelBlock(2.3, 0.36, 0.82, 0.015), [0, 1.72, -0.11]);
  for (const fx of [-0.66, 0, 0.66]) {
    b.add('stone', bevelBlock(0.44, 0.2, 0.05, 0.006), [fx, 1.8, 0.285]);
    b.add('dressed', bevelBlock(0.16, 0.16, 0.035, 0.005), [fx, 1.82, 0.31]);
  }
  b.add('dressed', bevelBlock(2.42, 0.1, 0.94, 0.014), [0, 2.08, -0.07]);

  // tapered trapezoidal stone chimney hood rising to cornice collar at y = 3.60 m
  const hoodZ = -0.14;
  const ringRect = (w, d, y, cz) => [
    [-w / 2, y, cz + d / 2],
    [w / 2, y, cz + d / 2],
    [w / 2, y, cz - d / 2],
    [-w / 2, y, cz - d / 2],
  ];
  const hood = loftRings(
    [
      ringRect(2.22, 0.84, 2.18, hoodZ),
      ringRect(1.8, 0.7, 2.82, hoodZ - 0.06),
      ringRect(1.42, 0.58, 3.44, hoodZ - 0.12),
    ],
    { closeStart: true, closeEnd: true },
  );
  b.add('stone', hood);
  b.add('dressed', bevelBlock(1.56, 0.16, 0.68, 0.014), [0, 3.44, hoodZ - 0.12]);
  b.add('void', G.block(0.8, 0.02, 0.36), [0, 3.59, hoodZ - 0.12]);

  // pair of forged wrought-iron andirons (fire dogs) with scrolled feet and brass finials
  for (const sx of [-1, 1]) {
    const ax = sx * 0.34;
    b.add('iron', bevelBlock(0.055, 0.045, 0.44, 0.005), [ax, hearthH + 0.06, -0.02]);
    // arched front feet
    b.add('iron', flatScroll([[-0.12, 0], [-0.06, 0.065], [0, 0.08], [0.06, 0.065], [0.12, 0]], 0.032, 0.024, 14), [ax, hearthH, 0.2]);
    // vertical forged standard + scrolled top + brass ball finial
    b.add('iron', bevelBlock(0.045, 0.38, 0.045, 0.006), [ax, hearthH + 0.07, 0.2]);
    b.add('gilt', new THREE.SphereGeometry(0.036, 12, 10), [ax, hearthH + 0.47, 0.2]);
    b.add('iron', G.cylinder(0.022, 0.022, 0.08, 10, { y0: hearthH }), [ax, 0, -0.22]);
  }

  // ash bed, clustered glowing charcoal lumps, split logs and warm layered hearth fire
  b.add('soot', G.cylinder(0.35, 0.42, 0.022, 18, { y0: hearthH }), [0, 0, -0.04]);
  b.add('ember', G.cylinder(0.2, 0.25, 0.026, 16, { y0: hearthH + 0.012 }), [0, 0, -0.04]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = 0.06 + (i % 4) * 0.065;
    b.add('ember', charcoalLump(0.04 + (i % 3) * 0.008, 10 + i), [Math.cos(a) * r, hearthH + 0.045, -0.04 + Math.sin(a) * r * 0.7]);
  }
  for (const [lx, ly, lz, ry, rad, len] of [
    [-0.02, hearthH + 0.12, -0.04, 0.08, 0.055, 0.78],
    [0.04, hearthH + 0.13, -0.14, -0.15, 0.05, 0.72],
    [0, hearthH + 0.2, -0.08, 0.24, 0.045, 0.66],
  ]) {
    b.add('bark', G.cylinder(rad, rad * 1.08, len, 10, { y0: -len / 2 }), [lx, ly, lz], ry, 0, Math.PI / 2);
  }
  for (const [fx, fz, sc] of [[0, -0.05, 3.0], [-0.15, -0.03, 2.3], [0.16, -0.07, 2.4]]) {
    softFlame(b, [fx, hearthH + 0.2, fz], sc);
  }
}

/** Tall medieval battered stone-and-brick chimney stack with lead flashing collar and twin crenellated octagonal flues. */
function buildChimneyStack(b) {
  const ringRect = (w, d, y) => [
    [-w / 2, y, d / 2],
    [w / 2, y, d / 2],
    [w / 2, y, -d / 2],
    [-w / 2, y, -d / 2],
  ];

  // lower dressed plinth + battered stone chimney breast rising cleanly to roof-level weathering slope
  b.add('dressed', bevelBlock(1.74, 0.34, 1.28, 0.015), [0, 0, 0]);
  b.add(
    'stone',
    loftRings(
      [
        ringRect(1.64, 1.18, 0.34),
        ringRect(1.5, 1.06, 2.0),
        ringRect(1.24, 0.88, 2.45),
      ],
      { closeStart: true, closeEnd: true },
    ),
  );

  // stepped corner quoins along lower chimney breast
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const y = 0.38 + i * 0.4;
        const t = i / 4;
        const w = 1.62 - t * 0.14;
        const d = 1.16 - t * 0.12;
        const qw = i % 2 ? 0.34 : 0.22;
        const qd = i % 2 ? 0.22 : 0.34;
        b.add('dressed', bevelBlock(qw, 0.34, qd, 0.01), [sx * (w / 2 - qw / 2 + 0.03), y, sz * (d / 2 - qd / 2 + 0.03)]);
      }
    }
  }

  // lead roof-flashing apron collar
  b.add('lead', bevelBlock(1.36, 0.12, 1.0, 0.012), [0, 2.34, 0]);

  // upper weathered brick & dressed stone chimney shaft + corbelled cornice
  b.add('brick', bevelBlock(1.2, 1.66, 0.84, 0.01), [0, 2.45, 0]);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.add('dressed', bevelBlock(0.18, 1.64, 0.18, 0.008), [sx * 0.54, 2.46, sz * 0.36]);
    }
  }
  corbelRow(b, 'dressed', [-0.4, 0.42], [1, 0], 3, 0.4, [0, 1], 4.11, { size: 0.22, proj: 0.18 });
  corbelRow(b, 'dressed', [0.4, -0.42], [-1, 0], 3, 0.4, [0, -1], 4.11, { size: 0.22, proj: 0.18 });
  b.add('dressed', bevelBlock(1.38, 0.2, 1.02, 0.014), [0, 4.11, 0]);

  // twin octagonal medieval brick & carved stone chimney flues with crenellated stone caps
  for (const sx of [-1, 1]) {
    const fx = sx * 0.34;
    b.add('dressed', G.cylinder(0.26, 0.28, 0.12, 8, { y0: 4.31 }), [fx, 0, 0]);
    b.add('brick', G.cylinder(0.22, 0.23, 0.64, 8, { y0: 4.43 }), [fx, 0, 0]);
    b.add('dressed', G.cylinder(0.27, 0.24, 0.12, 8, { y0: 5.05 }), [fx, 0, 0]);
    // 4 small stone crown merlons around each flue top + dark flue throat
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      b.add('dressed', bevelBlock(0.12, 0.1, 0.1, 0.006), [fx + Math.cos(a) * 0.2, 5.17, Math.sin(a) * 0.2], a);
    }
    b.add('soot', G.cylinder(0.16, 0.16, 0.05, 8, { y0: 5.14 }), [fx, 0, 0]);
    b.add('void', G.cylinder(0.12, 0.12, 0.06, 8, { y0: 5.145 }), [fx, 0, 0]);
  }
}

export const hearthModules = [
  {
    id: 'fireplace_hearth',
    name: 'Great hall stone fireplace',
    category: 'hearth',
    description: 'Monumental medieval stone fireplace with raised slate hearth, brick fireback, carved mantel lintel, tapered chimney hood, iron andirons and hearth fire.',
    build(M) {
      const b = newArchBuilder(M);
      buildFireplaceHearth(b);
      return b.build('fireplace_hearth');
    },
  },
  {
    id: 'chimney_stack',
    name: 'Stone & brick chimney stack',
    category: 'hearth',
    description: 'Tall battered stone chimney breast with quoins, lead flashing collar, brick shaft, corbelled cornice and twin crenellated octagonal chimney flues.',
    build(M) {
      const b = newArchBuilder(M);
      buildChimneyStack(b);
      return b.build('chimney_stack');
    },
  },
];
