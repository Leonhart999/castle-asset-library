// Tower family: round tower with battlement, round tower with conical roof, square tower.
// Conventions as in wall.js: base at y = 0, centred on the origin, +Z is the outer face, 1 unit = 1 m.
// The walkway of a tower is at y = 12, 4 m above the curtain walls (y = 8).
// Round towers (R = 3.5): a wall module centred at x = +-5.2 meets the shaft flush.
// Square tower (6 x 6): a wall module centred at x = +-5 meets the east and west faces flush.
// Both have a courtyard door on the -Z side and a doorway to the wall walk at wall level.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { DIM, newBuilder, corbelRow, archRing, merlon, quoins } from '../lib/kit.js';

const R = 3.5; // round tower radius
const S = 6; // square tower side
const H = 12; // walkway level (top of the coping slab)
const BODY_H = H - DIM.coping;
const A = Math.PI / 2; // angle of the outer (+Z) direction, measured from +X toward +Z

const slit = (y, x = 0) => ({ x, y, w: 0.2, h: 1.6, arch: 'rect' });
const win = (y, x = 0) => ({ x, y, w: 0.9, h: 1.8, arch: 'round' });
const DOOR = { x: 0, y: -0.5, w: 1.7, h: 3.2, arch: 'pointed' };
const DOOR_RING = { x: 0, y: 0, w: 1.7, h: 2.7, arch: 'pointed' };
const WALK_DOOR = { x: 0, y: DIM.wallH, w: 1.2, h: 2.3, arch: 'pointed' };

// Places face-local space (outward +Z) on the surface of the round shaft at angle ang.
const cylMatrix = (ang) =>
  new THREE.Matrix4().makeRotationY(A - ang).multiply(new THREE.Matrix4().makeTranslation(0, 0, R - 0.05));

/** Shaft and plinth of a round tower; openings: [{ ang, o, depth, fill, door }]. */
function roundBody(b, openings) {
  const body = new THREE.CylinderGeometry(R, R, BODY_H, 40, Math.ceil(BODY_H / 3)).translate(0, BODY_H / 2, 0);
  const plinth = new THREE.CylinderGeometry(R + 0.2, R + 0.25, 1.0, 40).translate(0, 0.5, 0);
  const cuts = [];
  const plinthCuts = [];
  const fills = [];
  for (const q of openings) {
    const m = cylMatrix(q.ang);
    cuts.push(G.openingCutter(q.o, q.depth).applyMatrix4(m));
    const paneO = q.o.y < 0 ? { ...q.o, y: 0, h: q.o.h + q.o.y } : q.o;
    fills.push([q.fill, G.openingPane(paneO, q.depth).applyMatrix4(m)]);
    // the plinth must not close the door
    if (q.door) plinthCuts.push(G.openingCutter(q.o, q.depth + 0.5).applyMatrix4(m));
  }
  b.add('stone', G.cylUV(G.carve(body, cuts)));
  b.add('dressed', G.cylUV(G.carve(plinth, plinthCuts)));
  for (const [mat, g] of fills) b.add(mat, g);
}

/** Corbelled battlement, or an eaves ring with a conical slate roof. */
function roundTop(b, roofed) {
  if (roofed) {
    b.add('dressed', G.cylinder(R + 0.15, R + 0.15, 0.4, 40, { y0: H - 0.4 }));
    b.add('roof', G.coneRoof(R + 0.7, 7.5, 40, { flare: 0.12 }), [0, H - 0.2, 0]);
    const soffit = new THREE.RingGeometry(R, R + 0.7, 40);
    soffit.rotateX(Math.PI / 2);
    b.add('timber', G.boxUV(soffit), [0, H - 0.2, 0]);
    b.add('iron', G.cylinder(0.05, 0.08, 1.8, 6), [0, H + 7.0, 0]);
    b.add('gilt', new THREE.SphereGeometry(0.2, 16, 12), [0, H + 8.9, 0]);
    b.add('iron', G.box(0.7, 0.3, 0.02), [0.4, H + 8.45, 0]); // small weather vane
    return;
  }
  // corbel ring under the overhanging walkway
  const n = Math.round((Math.PI * 2 * R) / 0.95);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    b.push([Math.cos(a) * R, 0, Math.sin(a) * R], A - a);
    b.add('dressed', G.block(0.34, 0.3, 0.4), [0, BODY_H - 0.6, 0.12]);
    b.add('dressed', G.block(0.34, 0.3, 0.65), [0, BODY_H - 0.3, 0.25]);
    b.pop();
  }
  b.add('dressed', G.cylinder(R + 0.55, R + 0.55, DIM.coping, 40, { y0: BODY_H }));
  const ro = R + 0.5;
  const ri = R - 0.1;
  const ph = DIM.parapetH;
  b.add('stone', G.cylinder(ro, ro, ph, 40, { open: true, y0: H }));
  b.add('stone', G.flipFaces(G.cylinder(ri, ri, ph, 40, { open: true, y0: H })));
  const cap = new THREE.RingGeometry(ri, ro, 40);
  cap.rotateX(-Math.PI / 2);
  b.add('stone', G.boxUV(cap), [0, H + ph, 0]);
  const rm = (ro + ri) / 2;
  const count = 12;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    b.push([Math.cos(a) * rm, H + ph, Math.sin(a) * rm], A - a);
    merlon(b, DIM.merlonW, 0.6, [0, 0, 0]);
    b.pop();
  }
}

function roundTower(b, roofed) {
  const openings = [
    { ang: -A, o: DOOR, depth: 1.0, fill: 'timber', door: true },
    { ang: A, o: slit(4.5), depth: 1.3, fill: 'void' },
    { ang: A + 2.2, o: slit(5), depth: 1.3, fill: 'void' },
    { ang: A - 2.2, o: slit(5), depth: 1.3, fill: 'void' },
    { ang: A + 1.0, o: slit(8), depth: 1.3, fill: 'void' },
    { ang: A - 1.0, o: slit(8), depth: 1.3, fill: 'void' },
    { ang: 0, o: WALK_DOOR, depth: 1.0, fill: 'void' },
    { ang: Math.PI, o: WALK_DOOR, depth: 1.0, fill: 'void' },
    roofed ? { ang: A, o: win(9.2), depth: 0.6, fill: 'void' } : { ang: A, o: slit(9.2), depth: 1.3, fill: 'void' },
  ];
  roundBody(b, openings);
  b.add('dressed', archRing(DOOR_RING, 0.3, 0.35), [0, 0, -(R - 0.3)], Math.PI);
  // string course between the loops and iron straps + door rings flush against the courtyard door (pane at z = -0.98)
  b.add('dressed', G.cylinder(R + 0.08, R + 0.08, 0.25, 40, { y0: 7.0 }));
  b.add('void', G.box(0.03, 2.5, 0.02).translate(0, 1.25, -0.97).applyMatrix4(cylMatrix(-A)));
  for (const yy of [0.7, 1.6]) b.add('iron', G.box(1.5, 0.12, 0.04).translate(0, yy, -0.955).applyMatrix4(cylMatrix(-A)));
  for (const sx of [-0.24, 0.24]) {
    const r = new THREE.TorusGeometry(0.075, 0.013, 7, 16);
    b.add('iron', G.boxUV(r).translate(sx, 1.15, -0.945).applyMatrix4(cylMatrix(-A)));
  }
  roundTop(b, roofed);
}

function squareTower(b) {
  const fm = (face) => G.faceMatrix(face, S, S);
  const body = new THREE.BoxGeometry(S, BODY_H, S).translate(0, BODY_H / 2, 0);
  const cuts = [];
  const fills = [];
  const hole = (face, o, depth, mat) => {
    cuts.push(G.openingCutter(o, depth).applyMatrix4(fm(face)));
    const paneO = o.y < 0 ? { ...o, y: 0, h: o.h + o.y } : o;
    fills.push([mat, G.openingPane(paneO, depth).applyMatrix4(fm(face))]);
  };
  hole('n', DOOR, 1.0, 'timber');
  hole('n', win(7.5), 0.6, 'void');
  hole('s', slit(4.5), 1.3, 'void');
  hole('s', slit(8, -1.5), 1.3, 'void');
  hole('s', slit(8, 1.5), 1.3, 'void');
  hole('s', win(9.0), 0.6, 'void');
  hole('e', WALK_DOOR, 1.0, 'void');
  hole('w', WALK_DOOR, 1.0, 'void');
  b.add('stone', G.boxUV(G.carve(body, cuts)));
  for (const [mat, g] of fills) b.add(mat, g);
  const plinth = G.block(S + 0.4, 1.0, S + 0.4);
  b.add('dressed', G.boxUV(G.carve(plinth, [G.openingCutter(DOOR, 1.5).applyMatrix4(fm('n'))])));
  b.add('dressed', archRing(DOOR_RING, 0.3, 0.12), [0, 0, -S / 2], Math.PI);
  // string course (belt) below the wall-walk doorways; the x-face pieces stop short of the corners to avoid coplanar overlap
  for (const z of [-1, 1]) b.add('dressed', G.block(S + 0.2, 0.25, 0.2), [0, 6.6, (z * S) / 2]);
  for (const x of [-1, 1]) b.add('dressed', G.block(0.2, 0.25, S - 0.2), [(x * S) / 2, 6.6, 0]);
  // quoins on the four corners (stopping below the corbel tables) and iron straps + door rings flush on the courtyard door
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) quoins(b, (sx * S) / 2, (sz * S) / 2, sx, sz, 1.1, BODY_H - 0.8);
  b.add('void', G.box(0.03, 2.5, 0.02).translate(0, 1.25, -0.97).applyMatrix4(fm('n')));
  for (const yy of [0.7, 1.6]) b.add('iron', G.box(1.5, 0.12, 0.04).translate(0, yy, -0.955).applyMatrix4(fm('n')));
  for (const sx of [-0.24, 0.24]) {
    const r = new THREE.TorusGeometry(0.075, 0.013, 7, 16);
    b.add('iron', G.boxUV(r).translate(sx, 1.15, -0.945).applyMatrix4(fm('n')));
  }

  // coping slab, corbel tables on all four sides, parapet with merlons
  b.add('dressed', G.block(S + 1, DIM.coping, S + 1), [0, BODY_H, 0]);
  corbelRow(b, 'dressed', [-2.5, S / 2], [1, 0], 6, 1, [0, 1], BODY_H);
  corbelRow(b, 'dressed', [2.5, -S / 2], [-1, 0], 6, 1, [0, -1], BODY_H);
  corbelRow(b, 'dressed', [S / 2, -2.5], [0, 1], 6, 1, [1, 0], BODY_H);
  corbelRow(b, 'dressed', [-S / 2, 2.5], [0, -1], 6, 1, [-1, 0], BODY_H);
  const ph = DIM.parapetH;
  b.add('stone', G.block(7.0, ph, 0.6), [0, H, 3.2]);
  b.add('stone', G.block(7.0, ph, 0.6), [0, H, -3.2]);
  b.add('stone', G.block(0.6, ph, 5.8), [3.2, H, 0]);
  b.add('stone', G.block(0.6, ph, 5.8), [-3.2, H, 0]);
  const y = H + ph;
  for (const x of [-2.9, -0.967, 0.967, 2.9]) {
    for (const z of [-3.2, 3.2]) merlon(b, DIM.merlonW, 0.6, [x, y, z]);
  }
  for (const z of [-1.75, 0, 1.75]) {
    for (const x of [-3.2, 3.2]) merlon(b, 0.6, DIM.merlonW, [x, y, z]);
  }
}

export const towerModules = [
  {
    id: 'tower_round',
    name: 'Round tower, crenellated',
    category: 'tower',
    description: 'Round tower, radius 3.5 m, walkway at 12 m on a corbel ring with 12 merlons. Arrow loops, courtyard door on -Z, wall-walk doors on +-X. Wall modules centred at x = +-5.2 join it.',
    build(M) {
      const b = newBuilder(M);
      roundTower(b, false);
      return b.build('tower_round');
    },
  },
  {
    id: 'tower_round_roofed',
    name: 'Round tower, conical roof',
    category: 'tower',
    description: 'Round tower, radius 3.5 m, with an eaves ring, bell-cast slate cone roof and finial. Same openings as tower_round plus a window under the roof.',
    build(M) {
      const b = newBuilder(M);
      roundTower(b, true);
      return b.build('tower_round_roofed');
    },
  },
  {
    id: 'tower_square',
    name: 'Square tower, crenellated',
    category: 'tower',
    description: 'Square tower 6 x 6 m, walkway at 12 m with corbels on all sides and a merlon parapet. Courtyard door on -Z, wall-walk doors on +-X. Wall modules centred at x = +-5 join it.',
    build(M) {
      const b = newBuilder(M);
      squareTower(b);
      return b.build('tower_square');
    },
  },
];
