// Furniture props: banquet table, wooden bench, lord's high-back chair, canopy bed and oak bookshelf.
// All pieces sit with base at y = 0, centred on x = z = 0, 1 unit = 1 m.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { newBuilder, lathe } from '../lib/kit.js';

function banquetTable(b) {
  const L = 2.6;
  const W = 0.96;
  const H = 0.78;
  // three thick oak planks with slight gaps between them
  const pw = (W - 0.02) / 3;
  for (let i = -1; i <= 1; i++) {
    b.add('oak', G.block(L, 0.065, pw), [0, H - 0.065, i * (pw + 0.01)]);
  }
  // end cleats + corner iron straps
  for (const sx of [-1, 1]) {
    b.add('darkWood', G.block(0.08, 0.07, W + 0.02), [sx * (L / 2 - 0.04), H - 0.068, 0]);
    for (const sz of [-1, 1]) {
      b.add('iron', G.block(0.18, 0.074, 0.08), [sx * (L / 2 - 0.09), H - 0.07, sz * (W / 2 - 0.02)]);
    }
  }
  // trestle legs at x = +-0.9
  for (const sx of [-1, 1]) {
    const lx = sx * 0.9;
    b.add('darkWood', G.block(0.12, 0.08, 0.86), [lx, 0, 0]); // foot rail
    b.add('darkWood', G.block(0.14, 0.08, 0.84), [lx, H - 0.14, 0]); // top bearer
    for (const sz of [-1, 1]) {
      b.add('oak', G.block(0.11, H - 0.2, 0.11), [lx, 0.08, sz * 0.28]);
    }
    // chamfered feet pads
    for (const sz of [-1, 1]) b.add('darkWood', G.block(0.16, 0.04, 0.14), [lx, 0, sz * 0.36]);
  }
  // central stretcher rail with wedged tenons protruding outside the legs
  b.add('darkWood', G.block(2.1, 0.09, 0.08), [0, 0.22, 0]);
  for (const sx of [-1, 1]) {
    b.add('oak', G.block(0.03, 0.14, 0.03), [sx * 0.99, 0.2, 0], 0, 0, sx * 0.15);
    // angled knee braces
    b.add('oak', G.beamXY(sx * 0.9, 0.28, sx * 0.52, H - 0.12, 0.07, 0.07, 0));
  }
}

function woodenBench(b) {
  const L = 2.0;
  const W = 0.4;
  const H = 0.46;
  b.add('oak', G.block(L, 0.055, W), [0, H - 0.055, 0]);
  for (const sx of [-1, 1]) {
    const lx = sx * 0.72;
    b.add('darkWood', G.block(0.09, 0.05, W + 0.04), [lx, 0, 0]);
    for (const sz of [-1, 1]) {
      b.add('oak', G.beamXY(0, 0.05, 0, H - 0.05, 0.07, 0.07, 0), [lx, 0, sz * 0.11]);
    }
    b.add('darkWood', G.block(0.09, 0.05, W - 0.06), [lx, H - 0.105, 0]);
    b.add('oak', G.beamXY(sx * 0.72, 0.16, sx * 0.42, H - 0.09, 0.055, 0.055, 0));
  }
  b.add('darkWood', G.block(1.64, 0.06, 0.06), [0, 0.14, 0]);
}

function lordChair(b) {
  const W = 0.68;
  const D = 0.62;
  const seatY = 0.46;
  const backH = 1.38;
  // four corner posts (rear posts rise all the way to the finial)
  for (const sx of [-1, 1]) {
    b.add('darkWood', G.block(0.075, 0.72, 0.075), [sx * (W / 2 - 0.04), 0, D / 2 - 0.04]);
    b.add('darkWood', G.block(0.08, backH - 0.08, 0.08), [sx * (W / 2 - 0.04), 0, -D / 2 + 0.04]);
    // turned finials on the rear posts
    b.add('gilt', lathe([[0, 0], [0.03, 0.02], [0.048, 0.07], [0.025, 0.12], [0, 0.15]], 14), [sx * (W / 2 - 0.04), backH - 0.08, -D / 2 + 0.04]);
    // armrests + lower side stretchers
    b.add('oak', G.block(0.09, 0.05, D), [sx * (W / 2 - 0.04), 0.7, 0]);
    b.add('darkWood', G.block(0.05, 0.06, D - 0.08), [sx * (W / 2 - 0.04), 0.14, 0]);
    b.add('oak', G.block(0.05, 0.24, D - 0.08), [sx * (W / 2 - 0.04), seatY - 0.1, 0]);
  }
  // front & back aprons + lower stretchers
  b.add('darkWood', G.block(W - 0.08, 0.1, 0.05), [0, seatY - 0.1, D / 2 - 0.04]);
  b.add('darkWood', G.block(W - 0.08, 0.07, 0.05), [0, 0.14, -D / 2 + 0.04]);
  b.add('oak', G.block(W - 0.08, 0.04, D - 0.06), [0, seatY - 0.02, 0]);
  // crimson damask seat cushion and high backrest
  b.add('fabric', G.block(W - 0.14, 0.075, D - 0.12), [0, seatY + 0.02, 0.02]);
  b.add('oak', G.block(W - 0.12, backH - seatY - 0.18, 0.05), [0, seatY + 0.05, -D / 2 + 0.04]);
  b.add('fabric', G.block(W - 0.22, backH - seatY - 0.34, 0.055), [0, seatY + 0.14, -D / 2 + 0.075]);
  // carved crown rail at the top of the backrest
  b.add('darkWood', G.block(W - 0.04, 0.12, 0.065), [0, backH - 0.2, -D / 2 + 0.04]);
  b.add('gilt', G.block(0.14, 0.08, 0.03), [0, backH - 0.18, -D / 2 + 0.07]);
}

function canopyBed(b) {
  const W = 1.5;
  const L = 2.15;
  const H = 2.1;
  // four heavy posts with carved base blocks
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const px = sx * (W / 2 - 0.06);
      const pz = sz * (L / 2 - 0.06);
      b.add('darkWood', G.block(0.15, 0.36, 0.15), [px, 0, pz]);
      b.add('oak', G.cylinder(0.055, 0.065, H - 0.36, 12, { y0: 0.36 }), [px, 0, pz]);
      b.add('darkWood', G.block(0.14, 0.1, 0.14), [px, H - 0.08, pz]);
    }
  }
  // bed frame & headboard
  b.add('darkWood', G.block(W - 0.12, 0.22, 0.06), [0, 0.28, L / 2 - 0.06]);
  b.add('darkWood', G.block(W - 0.12, 0.95, 0.07), [0, 0.28, -L / 2 + 0.06]);
  for (const sx of [-1, 1]) b.add('darkWood', G.block(0.06, 0.22, L - 0.12), [sx * (W / 2 - 0.06), 0.28, 0]);
  // mattress + linen sheet + folded crimson wool blanket + two pillows
  b.add('linen', G.block(W - 0.16, 0.18, L - 0.18), [0, 0.4, 0]);
  b.add('fabric', G.block(W - 0.13, 0.19, L * 0.62), [0, 0.41, 0.28]);
  // blanket overhang at the foot and sides
  b.add('fabric', G.block(W - 0.1, 0.16, 0.06), [0, 0.34, L / 2 - 0.09]);
  for (const sx of [-1, 1]) b.add('fabric', G.block(0.05, 0.15, L * 0.62), [sx * (W / 2 - 0.07), 0.34, 0.28]);
  for (const sx of [-1, 1]) {
    const pillow = G.box(0.56, 0.13, 0.36);
    pillow.rotateX(0.22);
    b.add('linen', pillow, [sx * 0.34, 0.64, -L / 2 + 0.32]);
  }
  // canopy cornice and hanging fabric valance
  b.add('darkWood', G.block(W + 0.04, 0.12, 0.08), [0, H, L / 2 - 0.06]);
  b.add('darkWood', G.block(W + 0.04, 0.12, 0.08), [0, H, -L / 2 + 0.06]);
  for (const sx of [-1, 1]) b.add('darkWood', G.block(0.08, 0.12, L + 0.04), [sx * (W / 2 - 0.06), H, 0]);
  b.add('linen', G.block(W - 0.12, 0.03, L - 0.12), [0, H + 0.08, 0]);
  for (const sz of [-1, 1]) b.add('fabric', G.block(W + 0.06, 0.24, 0.03), [0, H - 0.2, sz * (L / 2 - 0.02)]);
  for (const sx of [-1, 1]) b.add('fabric', G.block(0.03, 0.24, L + 0.06), [sx * (W / 2 - 0.02), H - 0.2, 0]);
}

function bookshelfOak(b) {
  const W = 1.42;
  const D = 0.42;
  const H = 2.12;
  // base plinth, back panel, uprights and crown cornice
  b.add('darkWood', G.block(W + 0.04, 0.12, D + 0.04), [0, 0, 0]);
  b.add('darkWood', G.block(W - 0.04, H - 0.16, 0.035), [0, 0.12, -D / 2 + 0.02]);
  for (const sx of [-1, 1]) b.add('oak', G.block(0.06, H - 0.2, D - 0.02), [sx * (W / 2 - 0.03), 0.12, 0]);
  b.add('darkWood', G.block(W + 0.08, 0.1, D + 0.08), [0, H - 0.1, 0]);
  // 5 shelves (bottom, 3 middle, top)
  const ys = [0.12, 0.56, 1.0, 1.44, 1.98];
  for (const y of ys) b.add('oak', G.block(W - 0.08, 0.04, D - 0.04), [0, y, 0]);
  // fill shelves with varied leather- and fabric-bound tomes
  const mats = ['leather', 'fabric', 'darkWood', 'linen', 'oak'];
  let seed = 7;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let s = 0; s < 4; s++) {
    const sy = ys[s] + 0.04;
    let x = -W / 2 + 0.08;
    const endX = W / 2 - 0.08;
    while (x < endX - 0.08) {
      if (rand() < 0.14) {
        x += 0.08 + rand() * 0.08; // occasional gap
        continue;
      }
      const bw = 0.038 + rand() * 0.035;
      const bh = 0.24 + rand() * 0.12;
      const bd = 0.22 + rand() * 0.07;
      const mat = mats[Math.floor(rand() * mats.length)];
      b.add(mat, G.block(bw, bh, bd), [x + bw / 2, sy, -D / 2 + 0.05 + bd / 2]);
      // slightly recessed cream page block showing along the top edge (spine faces +Z)
      b.add('linen', G.block(bw * 0.78, bh - 0.01, bd - 0.015), [x + bw / 2, sy + 0.014, -D / 2 + 0.045 + bd / 2]);
      x += bw + 0.004;
    }
  }
}

export const furnitureModules = [
  {
    id: 'table_banquet',
    name: 'Banquet table',
    category: 'furniture',
    description: '2.6 m oak hall table with trestle legs, iron corner brackets, stretcher rail and wedged tenons.',
    build(M) {
      const b = newBuilder(M);
      banquetTable(b);
      return b.build('table_banquet');
    },
  },
  {
    id: 'bench_wooden',
    name: 'Wooden bench',
    category: 'furniture',
    description: '2.0 m oak trestle bench sized to pair with the banquet table.',
    build(M) {
      const b = newBuilder(M);
      woodenBench(b);
      return b.build('bench_wooden');
    },
  },
  {
    id: 'chair_lord',
    name: 'Lord high-back chair',
    category: 'furniture',
    description: 'High-back carved oak armchair with crimson fabric cushions and gilt post finials.',
    build(M) {
      const b = newBuilder(M);
      lordChair(b);
      return b.build('chair_lord');
    },
  },
  {
    id: 'bed_canopy',
    name: 'Four-poster bed',
    category: 'furniture',
    description: 'Oak four-poster bed with linen mattress, pillows, crimson wool blanket and hanging valance.',
    build(M) {
      const b = newBuilder(M);
      canopyBed(b);
      return b.build('bed_canopy');
    },
  },
  {
    id: 'bookshelf_oak',
    name: 'Oak bookshelf',
    category: 'furniture',
    description: 'Four-tier oak bookcase with cornice and varied leather- and cloth-bound medieval volumes.',
    build(M) {
      const b = newBuilder(M);
      bookshelfOak(b);
      return b.build('bookshelf_oak');
    },
  },
];
