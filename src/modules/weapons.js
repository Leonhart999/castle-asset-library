// Weapon and armoury props: arming sword, medieval halberd, curved heater shield, weapon rack and archery target.
// All pieces sit with base at y = 0, centred on x = z = 0, 1 unit = 1 m.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { newBuilder, lathe } from '../lib/kit.js';

/** Builds a diamond-section double-edged blade from tip at y=0 up to y=len. */
function bladeGeom(len = 0.88, maxW = 0.056, thick = 0.01) {
  // cross-section rings from tip (y=0) to base (y=len)
  const stations = [
    [0, 0.001, 0.001],
    [0.09, maxW * 0.62, thick * 0.72],
    [0.25, maxW * 0.78, thick * 0.85],
    [len, maxW, thick],
  ];
  const v = [];
  const pushTri = (a, b, c) => v.push(...a, ...b, ...c);
  for (let i = 0; i < stations.length - 1; i++) {
    const [y0, w0, t0] = stations[i];
    const [y1, w1, t1] = stations[i + 1];
    const r0 = [
      [w0 / 2, y0, 0],
      [0, y0, t0 / 2],
      [-w0 / 2, y0, 0],
      [0, y0, -t0 / 2],
    ];
    const r1 = [
      [w1 / 2, y1, 0],
      [0, y1, t1 / 2],
      [-w1 / 2, y1, 0],
      [0, y1, -t1 / 2],
    ];
    for (let k = 0; k < 4; k++) {
      const n = (k + 1) % 4;
      pushTri(r0[k], r1[k], r1[n]);
      pushTri(r0[k], r1[n], r0[n]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return G.boxUV(g);
}

/** Places an arming sword with tip at y = 0. */
export function addSword(b) {
  b.add('steel', bladeGeom(0.88, 0.056, 0.012));
  // crossguard (quillon) with flared tips
  b.add('iron', G.block(0.24, 0.02, 0.028), [0, 0.88, 0]);
  for (const sx of [-1, 1]) b.add('iron', G.cylinder(0.015, 0.015, 0.028, 8), [sx * 0.125, 0.89, 0], 0, Math.PI / 2);
  // leather-wrapped grip
  const grip = G.cylinder(0.015, 0.018, 0.17, 10, { y0: 0.9 });
  grip.scale(1.15, 1, 0.72);
  b.add('leather', grip);
  // wheel pommel
  const pommel = G.cylinder(0.032, 0.032, 0.024, 16);
  pommel.rotateX(Math.PI / 2);
  b.add('gilt', pommel, [0, 1.1, 0]);
  b.add('iron', G.cylinder(0.008, 0.008, 0.032, 8), [0, 1.13, 0]);
}

/** Places a medieval halberd with butt spike at y = 0. */
export function addHalberd(b) {
  b.add('iron', G.cylinder(0.018, 0.004, 0.07, 8, { y0: 0 })); // butt spike
  b.add('darkWood', G.cylinder(0.019, 0.02, 1.78, 8, { y0: 0.07 })); // octagonal haft
  // iron langets flanking the head mount
  for (const sx of [-1, 1]) b.add('iron', G.block(0.008, 0.34, 0.02), [sx * 0.02, 1.56, 0]);
  b.add('steel', G.cylinder(0.022, 0.022, 0.16, 8, { y0: 1.76 })); // socket collar
  // top spear spike (four-sided)
  b.add('steel', G.cylinder(0.002, 0.026, 0.36, 4, { y0: 1.91 }));
  // crescent axe blade on +X
  const axe = new THREE.Shape();
  axe.moveTo(0.015, 1.74);
  axe.lineTo(0.17, 1.69);
  axe.quadraticCurveTo(0.22, 1.82, 0.16, 1.94);
  axe.lineTo(0.015, 1.89);
  axe.closePath();
  const axeG = new THREE.ExtrudeGeometry(axe, { depth: 0.012, bevelEnabled: false, curveSegments: 10 });
  axeG.translate(0, 0, -0.006);
  b.add('steel', G.boxUV(axeG));
  // rear fluke hook on -X
  const fluke = new THREE.Shape();
  fluke.moveTo(-0.015, 1.86);
  fluke.lineTo(-0.14, 1.82);
  fluke.lineTo(-0.12, 1.77);
  fluke.lineTo(-0.015, 1.81);
  fluke.closePath();
  const flukeG = new THREE.ExtrudeGeometry(fluke, { depth: 0.012, bevelEnabled: false });
  flukeG.translate(0, 0, -0.006);
  b.add('steel', G.boxUV(flukeG));
}

/** Curves any geometry gently around the Y axis so shields wrap around the bearer. */
function bendX(geom, k = 0.45) {
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, pos.getZ(i) - k * x * x);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

/** Places a curved heater shield with its point at y = 0, front facing +Z. */
export function addShield(b) {
  const W = 0.62;
  const H = 0.84;
  const hw = W / 2;
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(hw * 0.92, H * 0.28, hw, H * 0.62);
  s.lineTo(hw, H);
  s.lineTo(-hw, H);
  s.lineTo(-hw, H * 0.62);
  s.quadraticCurveTo(-hw * 0.92, H * 0.28, 0, 0);
  // subdivide horizontally via a thin bevel or grid? ExtrudeGeometry front face uses shape points;
  // sample the top edge in 6 steps so bendX curves the shield smoothly across its width
  const smooth = new THREE.Shape();
  smooth.moveTo(0, 0);
  const segs = 8;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const x = t * hw;
    const y = t < 0.6 ? (t / 0.6) * H * 0.62 * (0.65 + 0.35 * (t / 0.6)) : H * 0.62 + ((t - 0.6) / 0.4) * H * 0.38;
    smooth.lineTo(x, y);
  }
  for (let i = 1; i <= 6; i++) smooth.lineTo(hw - (i / 6) * W, H);
  for (let i = segs; i >= 1; i--) {
    const t = i / segs;
    const x = -t * hw;
    const y = t < 0.6 ? (t / 0.6) * H * 0.62 * (0.65 + 0.35 * (t / 0.6)) : H * 0.62 + ((t - 0.6) / 0.4) * H * 0.38;
    smooth.lineTo(x, y);
  }
  smooth.closePath();

  const body = new THREE.ExtrudeGeometry(smooth, { depth: 0.028, bevelEnabled: false });
  body.translate(0, 0, -0.014);
  b.add('oak', bendX(G.boxUV(body)));

  // crimson fabric face overlay + gilt heraldic cross + central iron boss
  const face = new THREE.ExtrudeGeometry(smooth, { depth: 0.006, bevelEnabled: false });
  face.scale(0.92, 0.92, 1);
  face.translate(0, H * 0.04, 0.014);
  b.add('fabric', bendX(G.boxUV(face)));

  b.add('gilt', bendX(G.block(0.06, H * 0.88, 0.01).translate(0, H * 0.06, 0.022)));
  b.add('gilt', bendX(G.block(W * 0.88, 0.06, 0.01).translate(0, H * 0.62, 0.022)));
  b.add('iron', G.cylinder(0.05, 0.065, 0.025, 16), [0, H * 0.65, 0.032], 0, Math.PI / 2);

  // leather grip straps on the back (-Z)
  for (const x of [-0.08, 0.1]) {
    const strap = G.block(0.035, 0.22, 0.025).translate(x, H * 0.5, -0.028);
    b.add('leather', bendX(strap));
  }
}

function weaponRack(b) {
  const W = 1.56;
  const D = 0.56;
  const H = 1.46;
  // two A-frame timber standards
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 - 0.08);
    b.add('darkWood', G.block(0.08, 0.07, D), [x, 0, 0]);
    b.add('oak', G.beamXY(0, 0.06, 0, H - 0.08, 0.065, 0.065, 0), [x, 0, 0.06], Math.PI / 2);
    // front & rear A-legs
    b.push([x, 0, 0], Math.PI / 2);
    b.add('oak', G.beamXY(-D / 2 + 0.04, 0.06, -0.02, H, 0.065, 0.065, 0));
    b.add('oak', G.beamXY(D / 2 - 0.04, 0.06, 0.02, H, 0.065, 0.065, 0));
    b.pop();
  }
  // bottom trough and upper notched rail
  b.add('darkWood', G.block(W - 0.12, 0.05, 0.24), [0, 0.12, 0]);
  b.add('oak', G.block(W - 0.12, 0.07, 0.07), [0, 1.04, -0.06]);
  b.add('iron', G.block(W - 0.12, 0.04, 0.08), [0, H - 0.06, 0]);

  // place 3 halberds on the left-centre and 2 swords on the right
  for (const x of [-0.46, -0.18, 0.1]) {
    b.push([x, 0.17, 0.02], 0, -0.1);
    addHalberd(b);
    b.pop();
  }
  for (const x of [0.36, 0.54]) {
    b.push([x, 0.17, 0.03], 0, -0.1);
    addSword(b);
    b.pop();
  }
  // heater shield leaning against the right standard
  b.push([W / 2 + 0.06, 0.02, 0.06], 0.35, 0, -0.14);
  addShield(b);
  b.pop();
}

function archeryTarget(b) {
  // wooden A-tripod stand leaning back slightly (y=0.032 keeps rotated beam corners above y=0)
  for (const sx of [-1, 1]) {
    b.add('darkWood', G.beamXY(sx * 0.4, 0.032, sx * 0.08, 1.56, 0.06, 0.06, 0.18), [0, 0, 0], 0, 0.12);
  }
  // rear support leg
  b.add('darkWood', G.beamXY(0, 0.032, 0, 1.46, 0.06, 0.06, 0), [0, 0, -0.45], Math.PI / 2, -0.32);
  // horizontal crossbar supporting the target boss
  b.add('oak', G.block(0.86, 0.07, 0.06), [0, 0.62, 0.1]);

  // straw target disc tilted slightly back at centre y = 1.05
  b.push([0, 1.05, 0.12], 0, -0.12);
  const disc = G.cylinder(0.42, 0.42, 0.12, 28);
  disc.rotateX(Math.PI / 2);
  b.add('straw', disc);
  // coloured target rings on the front (+Z) face, stepped forward by 2 mm each
  const ring = (r, z, mat) => {
    const c = G.cylinder(r, r, 0.006, 24);
    c.rotateX(Math.PI / 2);
    b.add(mat, c, [0, 0, z]);
  };
  ring(0.36, 0.061, 'linen');
  ring(0.24, 0.064, 'fabric');
  ring(0.11, 0.067, 'gilt');

  // 3 arrows embedded in the straw boss
  for (const [ax, ay, rx, ry] of [
    [-0.04, 0.03, 0.08, -0.1],
    [0.09, -0.05, -0.05, 0.12],
    [0.18, 0.14, 0.1, 0.08],
  ]) {
    b.push([ax, ay, 0.06], ry, rx);
    b.add('oak', G.cylinder(0.005, 0.005, 0.56, 6), [0, 0, 0.25], 0, Math.PI / 2);
    // fletching feathers at the tail
    b.add('fabric', G.block(0.025, 0.003, 0.1), [0, 0, 0.49]);
    b.add('linen', G.block(0.003, 0.025, 0.1), [0, 0, 0.49]);
    b.pop();
  }
  b.pop();
}

export const weaponModules = [
  {
    id: 'sword_arming',
    name: 'Arming sword',
    category: 'weapon',
    description: '1.15 m medieval knightly sword with diamond-section steel blade, crossguard, leather grip and gilt wheel pommel.',
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
    description: '2.27 m polearm with octagonal haft, iron langets, top spike, crescent axe blade and rear fluke.',
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
    description: 'Curved oak and crimson damask knightly heater shield with gilt heraldic cross and leather arm straps.',
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
    description: 'Timber A-frame rack holding three halberds, two arming swords and a leaning heater shield.',
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
    description: 'Woven straw target boss on a timber tripod stand, with painted rings and three embedded arrows.',
    build(M) {
      const b = newBuilder(M);
      archeryTarget(b);
      return b.build('archery_target');
    },
  },
];
