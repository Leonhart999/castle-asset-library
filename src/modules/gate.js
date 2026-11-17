// Gate family: gatehouse with a pointed passage, machicolation corbels, battlement,
// portcullis and timber doors. Two states: open (portcullis half raised, doors swung back)
// and closed (portcullis down, doors shut).
// Conventions as in wall.js: base at y = 0, centred on the origin, +Z is the outer face, 1 unit = 1 m.
// Footprint 8 x 6 m, walkway at y = 11. The passage is 3.6 m wide and 5.4 m high.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { DIM, newBuilder, corbelRow, archRing } from '../lib/kit.js';

const W = 8;
const D = 6;
const H = 11;
const BODY_H = H - DIM.coping;
const PASS = { x: 0, y: 0, w: 3.6, h: 5.4, arch: 'pointed' };

function gateBody(b) {
  const fm = (face) => G.faceMatrix(face, W, D);
  const box = new THREE.BoxGeometry(W, BODY_H, D).translate(0, BODY_H / 2, 0);
  // the passage starts below ground so the cut is not coplanar with the base
  const cuts = [G.openingCutter({ ...PASS, y: -0.5, h: PASS.h + 0.5 }, D + 0.2).applyMatrix4(fm('s'))];
  const panes = [];
  const hole = (face, o, depth) => {
    cuts.push(G.openingCutter(o, depth).applyMatrix4(fm(face)));
    panes.push(G.openingPane(o, depth).applyMatrix4(fm(face)));
  };
  for (const x of [-2.6, 2.6]) {
    hole('s', { x, y: 7.3, w: 0.9, h: 1.8, arch: 'round' }, 0.6);
    hole('n', { x, y: 7.3, w: 0.9, h: 1.8, arch: 'round' }, 0.6);
  }
  // murder hole slit above the gate on the outer face
  hole('s', { x: 0, y: 6.3, w: 0.22, h: 1.6, arch: 'rect' }, 1.0);
  b.add('stone', G.boxUV(G.carve(box, cuts)));
  for (const p of panes) b.add('void', p);
  // plinth in two parts, leaving the passage free
  b.add('dressed', G.block(2.4, 1.0, D + 0.4), [-3.0, 0, 0]);
  b.add('dressed', G.block(2.4, 1.0, D + 0.4), [3.0, 0, 0]);
  // dressed arch rings on both faces
  b.add('dressed', archRing(PASS, 0.4, 0.12), [0, 0, D / 2]);
  b.add('dressed', archRing(PASS, 0.4, 0.12), [0, 0, -D / 2], Math.PI);
}

/** Overhanging walkway on corbels (deeper on the outer face) with a merlon parapet all round. */
function gateTop(b) {
  b.add('dressed', G.block(W + 1, DIM.coping, D + 1.5), [0, BODY_H, 0.25]);
  corbelRow(b, 'dressed', [-3.5, D / 2], [1, 0], 8, 1, [0, 1], BODY_H, { size: 0.45, proj: 0.95 });
  corbelRow(b, 'dressed', [3.5, -D / 2], [-1, 0], 8, 1, [0, -1], BODY_H);
  corbelRow(b, 'dressed', [W / 2, -2], [0, 1], 5, 1, [1, 0], BODY_H);
  corbelRow(b, 'dressed', [-W / 2, 2], [0, -1], 5, 1, [-1, 0], BODY_H);
  const ph = DIM.parapetH;
  // slab spans x -4.5..4.5 and z -3.5..4.0; parapet centre lines sit 0.3 m inside the edge
  b.add('stone', G.block(9, ph, 0.6), [0, H, 3.7]);
  b.add('stone', G.block(9, ph, 0.6), [0, H, -3.2]);
  b.add('stone', G.block(0.6, ph, 6.3), [4.2, H, 0.25]);
  b.add('stone', G.block(0.6, ph, 6.3), [-4.2, H, 0.25]);
  const y = H + ph;
  for (const x of [-3.9, -1.95, 0, 1.95, 3.9]) {
    for (const z of [3.7, -3.2]) b.add('stone', G.block(DIM.merlonW, DIM.merlonH, 0.6), [x, y, z]);
  }
  for (const z of [-1.625, 0.25, 2.125]) {
    for (const x of [-4.2, 4.2]) b.add('stone', G.block(0.6, DIM.merlonH, DIM.merlonW), [x, y, z]);
  }
}

/** Iron portcullis in a slot near the outer end of the passage. */
function portcullis(b, bottom, height) {
  const z = D / 2 - 1.2;
  for (let i = -4; i <= 4; i++) {
    b.add('iron', G.box(0.1, height, 0.1), [i * 0.4, bottom + height / 2, z]);
    b.add('iron', new THREE.ConeGeometry(0.07, 0.3, 4), [i * 0.4, bottom - 0.15, z], 0, Math.PI);
  }
  for (let y = bottom + 0.3; y < bottom + height - 0.2; y += 0.6) b.add('iron', G.box(3.7, 0.08, 0.12), [0, y, z]);
}

/** Two door leaves swung open against the passage walls at the inner end. */
function doorsOpen(b) {
  const zHinge = -D / 2 + 0.25;
  for (const sx of [-1, 1]) {
    b.push([sx * 1.58, 0, zHinge], -Math.PI / 2);
    b.add('timber', G.box(1.6, 3.4, 0.16), [0.8, 1.7, 0]);
    for (const y of [0.8, 1.7, 2.6]) b.add('iron', G.box(1.6, 0.14, 0.2), [0.8, y, 0]);
    b.pop();
  }
}

/** One panel filling the pointed arch at the inner end, with a centre seam and iron straps. */
function doorsClosed(b) {
  const o = { x: 0, y: 0, w: 3.5, h: 5.25, arch: 'pointed' };
  const leaf = G.boxUV(new THREE.ExtrudeGeometry(G.openingShape(o), { depth: 0.2, bevelEnabled: false, curveSegments: 8 }));
  b.add('timber', leaf, [0, 0, -D / 2 + 0.4]);
  b.add('void', G.box(0.04, 4.5, 0.24), [0, 2.3, -D / 2 + 0.5]);
  for (const y of [0.9, 2.0]) b.add('iron', G.box(3.2, 0.14, 0.26), [0, y, -D / 2 + 0.5]);
}

export const gateModules = [
  {
    id: 'gatehouse',
    name: 'Gatehouse, open',
    category: 'gate',
    description: 'Gatehouse 8 x 6 m, 11 m to the walkway, pointed passage 3.6 x 5.4 m through the body. Portcullis half raised, timber doors swung back, corbelled battlement, murder hole above the gate.',
    build(M) {
      const b = newBuilder(M);
      gateBody(b);
      gateTop(b);
      portcullis(b, 2.6, 3.5);
      doorsOpen(b);
      return b.build('gatehouse');
    },
  },
  {
    id: 'gatehouse_closed',
    name: 'Gatehouse, closed',
    category: 'gate',
    description: 'Same gatehouse with the portcullis lowered and the timber doors shut.',
    build(M) {
      const b = newBuilder(M);
      gateBody(b);
      gateTop(b);
      portcullis(b, 0.05, 5.8);
      doorsClosed(b);
      return b.build('gatehouse_closed');
    },
  },
];
