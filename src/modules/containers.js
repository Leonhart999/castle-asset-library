// Storage and container props: oak barrel, reinforced wooden crate, iron-bound chest and grain sack.
// All pieces sit with base at y = 0, centred on x = z = 0, 1 unit = 1 m.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { newBuilder, lathe, ringBand } from '../lib/kit.js';

function oakBarrel(b) {
  const H = 0.92;
  const rEnd = 0.27;
  const rMid = 0.34;
  // curved stave profile with recessed top and bottom heads (chime lip)
  const pts = [[0, 0.035], [rEnd - 0.025, 0.035], [rEnd - 0.025, 0]];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const bulge = Math.sin(t * Math.PI);
    const r = rEnd + (rMid - rEnd) * Math.pow(bulge, 0.85);
    pts.push([r, t * H]);
  }
  pts.push([rEnd - 0.025, H], [rEnd - 0.025, H - 0.035], [0, H - 0.035]);
  b.add('barrel', lathe(pts, 28));
  // 4 forged iron hoops matching the barrel radius at each height
  for (const t of [0.06, 0.26, 0.74, 0.94]) {
    const r = rEnd + (rMid - rEnd) * Math.pow(Math.sin(t * Math.PI), 0.85);
    b.add('iron', ringBand(r + 0.005, 0.014, 0.042, 28), [0, t * H - 0.021, 0]);
  }
  // wooden bung stopper on the belly (+Z)
  b.add('darkWood', G.cylinder(0.022, 0.018, 0.035, 10), [0, H * 0.5, rMid + 0.005], 0, Math.PI / 2);
}

function woodenCrate(b) {
  const S = 0.86;
  const H = 0.82;
  // recessed inner plank body
  b.add('oak', G.block(S - 0.08, H - 0.08, S - 0.08), [0, 0.04, 0]);
  // outer perimeter frame rails & vertical corner posts
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.add('timber', G.block(0.08, H, 0.08), [sx * (S / 2 - 0.04), 0, sz * (S / 2 - 0.04)]);
      // iron corner straps
      b.add('iron', G.block(0.1, 0.12, 0.1), [sx * (S / 2 - 0.04), 0, sz * (S / 2 - 0.04)]);
      b.add('iron', G.block(0.1, 0.12, 0.1), [sx * (S / 2 - 0.04), H - 0.12, sz * (S / 2 - 0.04)]);
    }
  }
  for (const y of [0, H - 0.08]) {
    for (const sz of [-1, 1]) b.add('timber', G.block(S, 0.08, 0.07), [0, y, sz * (S / 2 - 0.035)]);
    for (const sx of [-1, 1]) b.add('timber', G.block(0.07, 0.08, S - 0.14), [sx * (S / 2 - 0.035), y, 0]);
  }
  // diagonal cross-braces on all 4 vertical faces
  const brLen = Math.hypot(S - 0.14, H - 0.14);
  const ang = Math.atan2(H - 0.14, S - 0.14);
  for (let side = 0; side < 4; side++) {
    b.push([0, H / 2, 0], (side * Math.PI) / 2);
    const brace = G.box(brLen, 0.065, 0.04);
    brace.rotateZ(ang);
    b.add('timber', brace, [0, 0, S / 2 - 0.025]);
    b.pop();
  }
}

function treasureChest(b) {
  const W = 1.12;
  const D = 0.62;
  const boxH = 0.46;
  const lidR = D / 2;
  // main oak body
  b.add('oak', G.block(W, boxH, D), [0, 0, 0]);
  // half-cylinder arched lid along X (theta 0..PI has x >= 0; rotating +90 deg around Z puts it at y >= 0)
  const lid = new THREE.CylinderGeometry(lidR, lidR, W, 20, 1, false, 0, Math.PI);
  lid.rotateZ(Math.PI / 2);
  b.add('oak', G.boxUV(lid), [0, boxH, 0]);
  // base trim skirt
  b.add('darkWood', G.block(W + 0.04, 0.06, D + 0.04), [0, 0, 0]);
  // 4 forged iron bands wrapping the body and arched lid
  for (const x of [-0.46, -0.16, 0.16, 0.46]) {
    b.add('iron', G.block(0.055, boxH + 0.01, D + 0.03), [x, 0, 0]);
    const band = new THREE.CylinderGeometry(lidR + 0.015, lidR + 0.015, 0.055, 20, 1, false, 0, Math.PI);
    band.rotateZ(Math.PI / 2);
    b.add('iron', G.boxUV(band), [x, boxH, 0]);
  }
  // front lockplate + keyhole + brass trim
  b.add('iron', G.block(0.18, 0.22, 0.03), [0, boxH - 0.12, D / 2 + 0.015]);
  b.add('gilt', G.block(0.04, 0.08, 0.04), [0, boxH - 0.05, D / 2 + 0.02]);
  // side carrying rings
  for (const sx of [-1, 1]) {
    const ring = new THREE.TorusGeometry(0.075, 0.014, 8, 16);
    ring.rotateY(Math.PI / 2);
    b.add('iron', G.boxUV(ring), [sx * (W / 2 + 0.025), 0.28, 0]);
  }
}

function grainSack(b) {
  const H = 0.72;
  // plump organic body tapering to a tied neck, then flared ruffled collar
  const pts = [
    [0, 0],
    [0.2, 0],
    [0.25, 0.08],
    [0.26, 0.24],
    [0.21, 0.44],
    [0.11, 0.56],
    [0.065, 0.6],
    [0.12, 0.7],
    [0.09, 0.72],
    [0.05, 0.62],
    [0, 0.6],
  ];
  const body = lathe(pts, 20);
  body.scale(1.08, 1.0, 0.86); // flatten slightly so it looks heavy and settled
  b.add('linen', body);
  // rope tie at the pinched neck
  const rope = new THREE.TorusGeometry(0.072, 0.014, 8, 18);
  rope.rotateX(Math.PI / 2);
  rope.scale(1.08, 1.0, 0.86);
  b.add('straw', G.boxUV(rope), [0, 0.59, 0]);
}

export const containerModules = [
  {
    id: 'barrel_oak',
    name: 'Oak barrel',
    category: 'container',
    description: '0.92 m bilged oak wine/ale barrel with recessed heads, four iron hoops and bung.',
    build(M) {
      const b = newBuilder(M);
      oakBarrel(b);
      return b.build('barrel_oak');
    },
  },
  {
    id: 'crate_wooden',
    name: 'Wooden crate',
    category: 'container',
    description: '0.86 m reinforced timber supply crate with diagonal cross-braces and iron corner brackets.',
    build(M) {
      const b = newBuilder(M);
      woodenCrate(b);
      return b.build('crate_wooden');
    },
  },
  {
    id: 'chest_treasure',
    name: 'Iron-bound chest',
    category: 'container',
    description: 'Arched-lid oak storage chest bound with four iron straps, front lockplate and side rings.',
    build(M) {
      const b = newBuilder(M);
      treasureChest(b);
      return b.build('chest_treasure');
    },
  },
  {
    id: 'sack_grain',
    name: 'Grain sack',
    category: 'container',
    description: 'Heavy tied linen grain sack with pinched neck, rope binding and flared collar.',
    build(M) {
      const b = newBuilder(M);
      grainSack(b);
      return b.build('sack_grain');
    },
  },
];
