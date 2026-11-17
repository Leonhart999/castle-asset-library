// Wall family: straight walls, outer corner, battlements and arched openings.
// Orientation: +Z is the outer face; the wall centre line runs along X through the origin.
// Straight pieces are 4 m long and join end to end at x = +-2.
// The corner piece is an L: one arm ends at x = -2 (joins a straight wall as is), the other
// ends at z = -2 (joins a straight wall rotated 90 degrees about Y). Outer corner at (1, 1).

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { DIM, newBuilder, prismXZ, corbelRow, archRing } from '../lib/kit.js';

const H = DIM.wallH;
const T = DIM.wallT;
const BODY_H = H - DIM.coping;
const PARAPET_Z = T / 2 + DIM.slabOut - DIM.parapetT / 2; // centre line of the outer parapet

/**
 * Wall body with a dressed plinth. `openings` are cut right through the wall,
 * `slits` are arrow loops (narrow outside, splayed inside).
 */
function wallBody(b, len, { openings = [], slits = [], plinth = [[-len / 2, len / 2]] } = {}) {
  const box = new THREE.BoxGeometry(len, BODY_H, T).translate(0, BODY_H / 2, 0);
  const cutters = [];
  for (const q of openings) {
    // start below the ground line so the cut is not coplanar with the base
    const cut = G.openingCutter({ ...q, y: q.y - 0.5, h: q.h + 0.5 }, T + 0.2);
    cutters.push(cut.applyMatrix4(G.faceMatrix('s', len, T)));
  }
  for (const s of slits) {
    const slit = G.openingCutter({ x: s.x, y: s.y, w: 0.16, h: 1.5, arch: 'rect' }, T + 0.2);
    cutters.push(slit.applyMatrix4(G.faceMatrix('s', len, T)));
    const splay = G.openingCutter({ x: -s.x, y: s.y - 0.15, w: 0.85, h: 1.9, arch: 'round' }, 1.15);
    cutters.push(splay.applyMatrix4(G.faceMatrix('n', len, T)));
  }
  b.add('stone', G.boxUV(G.carve(box, cutters)));
  for (const [x0, x1] of plinth) b.add('dressed', G.block(x1 - x0, 1.0, T + 0.4), [(x0 + x1) / 2, 0, 0]);
}

/** Parapet with merlons on the outer edge; one merlon per 2 m cell. */
function battlementStraight(b, len, y = H) {
  const t = DIM.parapetT;
  b.add('stone', G.block(len, DIM.parapetH, t), [0, y, PARAPET_Z]);
  for (let i = 0; i < len / 2; i++) {
    b.add('stone', G.block(DIM.merlonW, DIM.merlonH, t), [-len / 2 + 1 + i * 2, y + DIM.parapetH, PARAPET_Z]);
  }
}

/** Parapet around the outer corner at (1, 1), with an L-shaped corner merlon. */
function battlementCorner(b, y = H) {
  const t = DIM.parapetT;
  const p = DIM.parapetH;
  const m = DIM.merlonH;
  const z = PARAPET_Z;
  b.add('stone', G.block(3.5, p, t), [-0.25, y, z]);
  b.add('stone', G.block(t, p, 2.9), [z, y, -0.55]);
  b.add('stone', G.block(DIM.merlonW, m, t), [-1, y + p, z]);
  b.add('stone', G.block(1.1, m, t), [0.95, y + p, z]);
  b.add('stone', G.block(t, m, 0.5), [z, y + p, 0.65]);
  b.add('stone', G.block(t, m, DIM.merlonW), [z, y + p, -1]);
}

/** Coping slab, corbel table and (optionally) the parapets on top of a straight wall. */
function wallTop(b, len, { battlement = true, innerParapet = true } = {}) {
  b.add('dressed', G.block(len, DIM.coping, T + DIM.slabOut), [0, BODY_H, DIM.slabOut / 2]);
  corbelRow(b, 'dressed', [-len / 2 + 0.5, T / 2], [1, 0], Math.round(len), 1, [0, 1], BODY_H);
  if (battlement) battlementStraight(b, len);
  if (innerParapet) b.add('stone', G.block(len, 0.9, 0.4), [0, H, -T / 2 + 0.2]);
}

function cornerModule(b, { battlement = true } = {}) {
  b.add('stone', prismXZ([[-2, -1], [-1, -1], [-1, -2], [1, -2], [1, 1], [-2, 1]], 0, BODY_H));
  b.add('dressed', prismXZ([[-2, -1.2], [-1.2, -1.2], [-1.2, -2], [1.2, -2], [1.2, 1.2], [-2, 1.2]], 0, 1.0));
  b.add('dressed', prismXZ([[-2, -1], [-1, -1], [-1, -2], [1.5, -2], [1.5, 1.5], [-2, 1.5]], BODY_H, H));
  corbelRow(b, 'dressed', [-1.5, T / 2], [1, 0], 3, 1, [0, 1], BODY_H);
  corbelRow(b, 'dressed', [T / 2, -1.5], [0, 1], 3, 1, [1, 0], BODY_H);
  corbelRow(b, 'dressed', [T / 2, T / 2], [1, 0], 1, 1, [Math.SQRT1_2, Math.SQRT1_2], BODY_H, { size: 0.5, proj: 0.7 });
  if (battlement) {
    battlementCorner(b);
    b.add('stone', G.block(1.4, 0.9, 0.4), [-1.3, H, -0.8]);
    b.add('stone', G.block(0.4, 0.9, 1.0), [-0.8, H, -1.5]);
  }
}

const ARCH_ROUND = { x: 0, y: 0, w: 2.4, h: 4.0, arch: 'round' };
const ARCH_POINTED = { x: 0, y: 0, w: 2.4, h: 4.6, arch: 'pointed' };

function archModule(id, name, description, o) {
  return {
    id,
    name,
    category: 'arch',
    description,
    build(M) {
      const b = newBuilder(M);
      const len = DIM.unit;
      wallBody(b, len, { openings: [o], plinth: [[-len / 2, -o.w / 2 - 0.0], [o.w / 2, len / 2]] });
      b.add('dressed', archRing(o), [0, 0, T / 2]);
      b.add('dressed', archRing(o), [0, 0, -T / 2], Math.PI);
      wallTop(b, len);
      return b.build(id);
    },
  };
}

export const wallModules = [
  {
    id: 'wall_straight',
    name: 'Straight wall, walkway',
    category: 'wall',
    description: '4 m curtain wall with dressed plinth, corbel table and flat coping slab. No parapet, use it under your own top.',
    build(M) {
      const b = newBuilder(M);
      wallBody(b, DIM.unit);
      wallTop(b, DIM.unit, { battlement: false, innerParapet: false });
      return b.build('wall_straight');
    },
  },
  {
    id: 'wall_straight_crenellated',
    name: 'Straight wall, crenellated',
    category: 'wall',
    description: '4 m curtain wall with outer battlement (two merlons) and a low inner parapet.',
    build(M) {
      const b = newBuilder(M);
      wallBody(b, DIM.unit);
      wallTop(b, DIM.unit);
      return b.build('wall_straight_crenellated');
    },
  },
  {
    id: 'wall_straight_loophole',
    name: 'Straight wall, arrow loop',
    category: 'wall',
    description: 'Crenellated 4 m wall with one splayed arrow loop through the body.',
    build(M) {
      const b = newBuilder(M);
      wallBody(b, DIM.unit, { slits: [{ x: 0, y: 3.8 }] });
      wallTop(b, DIM.unit);
      return b.build('wall_straight_loophole');
    },
  },
  {
    id: 'wall_corner',
    name: 'Outer corner, crenellated',
    category: 'wall',
    description: '90 degree L-shaped corner with an L-shaped corner merlon and a diagonal corbel. Arms end at x = -2 and z = -2.',
    build(M) {
      const b = newBuilder(M);
      cornerModule(b);
      return b.build('wall_corner');
    },
  },
  {
    id: 'battlement_straight',
    name: 'Battlement, straight',
    category: 'battlement',
    description: '4 m parapet with two merlons, positioned for the outer edge of a wall top. Place it at y = 8 over wall_straight.',
    build(M) {
      const b = newBuilder(M);
      battlementStraight(b, DIM.unit, 0);
      return b.build('battlement_straight');
    },
  },
  {
    id: 'battlement_corner',
    name: 'Battlement, corner',
    category: 'battlement',
    description: 'L-shaped parapet with a corner merlon, positioned for wall_corner. Place it at y = 8.',
    build(M) {
      const b = newBuilder(M);
      battlementCorner(b, 0);
      return b.build('battlement_corner');
    },
  },
  archModule('wall_arch_round', 'Wall with round arch', '4 m wall module with a 2.4 m round-arched passage (4.0 m high) and dressed voussoir rings.', ARCH_ROUND),
  archModule('wall_arch_pointed', 'Wall with pointed arch', '4 m wall module with a 2.4 m pointed (gothic) passage, 4.6 m high, and dressed rings.', ARCH_POINTED),
];
