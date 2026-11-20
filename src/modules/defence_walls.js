import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { DIM, archRing, batteredPlinth, bevelBlock, bevelBox, prismXZ, rivets, slitFrame } from '../lib/kit.js';
import {
  defenceModule, crossletCutter, crossletFrame, embrasureCutter, detailedMerlon,
  heavyDoor, machicolationWallTop, quoinSet, steppedCorbel, timberHoardingGallery,
  walkwayPaving,
} from '../lib/defenceKit.js';

const { unit: L, wallH: WALK, wallT: T, coping: COP } = DIM;
const BODY = WALK - COP;
const OUT = T / 2;
const place = (x, y, z, yaw = 0) => new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeRotationY(yaw));

function wallBody(b, cuts = [], plinths = [[-L / 2, L / 2]]) {
  b.add('stone', G.boxUV(G.carve(G.block(L, BODY, T), cuts)));
  for (const [a, z] of plinths) b.add('dressed', batteredPlinth(a, z, T));
}

function curtainTop(b, { zEdge = 1.5, crenels = true, inner = true, corbels = true } = {}) {
  b.add('dressed', G.block(L, COP, zEdge + OUT), [0, BODY, (zEdge - OUT) / 2]);
  if (corbels) for (const x of [-1.5, -0.5, 0.5, 1.5]) steppedCorbel(b, 'dressed', [x, BODY, OUT], 0, { proj: 0.47, tierH: 0.19 });
  if (inner) b.add('stone', G.block(L, 0.86, 0.37), [0, WALK, -0.815]);
  if (crenels) {
    const z = zEdge - DIM.parapetT / 2;
    b.add('stone', G.block(L, DIM.parapetH, DIM.parapetT), [0, WALK, z]);
    for (const x of [-1, 1]) detailedMerlon(b, 1.19, DIM.parapetT, [x, WALK + DIM.parapetH, z], 0, { slit: true });
  }
  walkwayPaving(b, L, WALK + 0.013, inner ? -0.62 : -OUT, crenels ? zEdge - DIM.parapetT : zEdge, 'cobble');
}

function loophole(b) {
  const y = 3.65;
  wallBody(b, [crossletCutter({ y }, T + 0.25).translate(0, 0, OUT),
    embrasureCutter({ y: y - 0.18, depth: 1.43 }).applyMatrix4(place(0, 0, -OUT, Math.PI))]);
  crossletFrame(b, 0, y, OUT);
  b.push([0, 0, -OUT], Math.PI);
  slitFrame(b, 0, y - 0.18, 1.02, 2.05, 0, { f: 0.18, proud: 0.055 });
  b.pop();
  b.add('dressed', bevelBlock(1.01, 0.15, 0.37, 0.011), [0, y - 0.21, -1.04]);
  curtainTop(b);
}

// Each profile runs from one curtain join to the other, across the field face.
function arc(radius, halfAngle, count) {
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = -halfAngle + 2 * halfAngle * i / count;
    return [radius * Math.sin(t), 0.55 + radius * Math.cos(t)];
  });
}

function addBastion(b, round) {
  const profile = (outer = 0) => round
    ? [[-2, 1 + outer], ...arc(1.82 + outer, 1.21, 24).map(([x, z]) => [THREE.MathUtils.clamp(x, -1.99, 1.99), z]), [2, 1 + outer]]
    : [[-2, 1 + outer], [-1.48 - outer, 1 + outer], [-1.48 - outer, 3.32 + outer], [1.48 + outer, 3.32 + outer], [1.48 + outer, 1 + outer], [2, 1 + outer]];
  const footprint = (out = 0, back = -1) => [[-2, back], [2, back], ...profile(out).reverse()];
  const sights = round ? [-Math.PI / 3, 0, Math.PI / 3].map((a) => [1.81 * Math.sin(a), 0.55 + 1.81 * Math.cos(a), a])
    : [[-1.48, 2.12, -Math.PI / 2], [0, 3.32, 0], [1.48, 2.12, Math.PI / 2]];
  const options = { y: 3.5, h: 1.36, crossW: 0.38, oiletteR: 0.09 };
  const opening = { x: 0, y: 2.85, w: 0.86, h: 2.55, arch: 'round' };
  const cuts = [G.openingCutter(opening, 3.13).applyMatrix4(place(0, 0, -1, Math.PI)),
    G.block(1.6, 2.55, 1.9).translate(0, 2.77, 1.50),
    ...sights.map(([x, z, a]) => crossletCutter(options, 1.49).applyMatrix4(place(x, 0, z, a)))];
  b.add('stone', G.boxUV(G.carve(prismXZ(footprint(), 0, BODY), cuts)));
  // Stepped plinth bands leave the two X-end profiles open for adjoining modules.
  b.add('mossyStone', prismXZ(footprint(0.35, -1.35), 0, 0.34));
  b.add('dressed', prismXZ(footprint(0.23, -1.23), 0.34, 0.66));
  b.add('dressed', prismXZ(footprint(0.15, -1.15), 0.66, 1));
  b.add('dressed', prismXZ(footprint(0.075), 5.45, 5.62));
  for (const [x, z, a] of sights) {
    b.push([x, 0, z], a);
    crossletFrame(b, 0, options.y, 0, { ...options, f: 0.095, proud: 0.045 });
    b.pop();
  }
  if (!round) for (const s of [-1, 1]) quoinSet(b, s * 1.48, 3.32, s, 1, 1, 5.4);
  b.add('dressed', prismXZ(footprint(0.5), BODY, WALK));
  b.add('cobble', prismXZ(footprint(0.10, -0.59), WALK, WALK + 0.018));
  b.add('stone', G.block(L, 0.86, 0.37), [0, WALK, -0.815]);
  const edge = profile(0.50);
  const inside = profile(-0.10);
  b.add('stone', prismXZ([...edge, ...inside.reverse()], WALK, WALK + 1));
  const mounts = round ? [-0.875, -0.44, 0, 0.44, 0.875].map((a) => [1.82 * Math.sin(a), 0.55 + 1.82 * Math.cos(a), a])
    : [[-1.48, 1.58, -Math.PI / 2], [-1.48, 2.55, -Math.PI / 2], [-0.75, 3.32, 0], [0.75, 3.32, 0], [1.48, 2.55, Math.PI / 2], [1.48, 1.58, Math.PI / 2]];
  for (const [i, [x, z, a]] of mounts.entries()) {
    steppedCorbel(b, 'dressed', [x, BODY, z], a, { proj: 0.48, tierH: 0.22 });
    detailedMerlon(b, 0.71, 0.43, [x + 0.15 * Math.sin(a), WALK + 0.95, z + 0.15 * Math.cos(a)], a, { lift: i * 0.001 });
  }
}

function postern(b) {
  const x = -0.36;
  const o = { x, y: 0.17, w: 1.17, h: 2.17, arch: 'pointed' };
  const cut = { ...o, y: -0.24, h: o.h + 0.41 };
  wallBody(b, [G.openingCutter(cut, 2.23).translate(0, 0, OUT),
    crossletCutter({ x, y: 3.36, h: 1.2 }, 0.85).translate(0, 0, OUT)], [[-2, -1.18], [0.47, 2]]);
  b.add('dressed', archRing(o, 0.21, 0.13), [0, 0, 1]);
  b.add('dressed', archRing({ ...o, x: -x }, 0.21, 0.09), [0, 0, -1], Math.PI);
  crossletFrame(b, x, 3.36, OUT, { h: 1.2, f: 0.10 });
  b.push([x, 0.18, 0.11]);
  heavyDoor(b, 1.10, 2.11, 0.13, { arch: 'pointed', doubleLeaf: false });
  b.pop();
  b.add('cobble', bevelBlock(1.12, 0.18, 2.42, 0.008), [x, 0, 0.05]);
  b.add('dressed', bevelBlock(1.3, 0.092, 0.31, 0.008), [x, 0, 1.38]);
  b.add('mossyStone', G.block(0.62, 0.62, 1.23), [0.90, 0, 1.56]);
  b.add('stone', G.block(0.54, 2.70, 1.21), [0.90, 0.62, 1.56]);
  for (const s of [-1, 1]) quoinSet(b, 0.90 + s * 0.27, 2.165, s, 1, 0.67, 3.24, { long: 0.46, short: 0.22, course: 0.41 });
  b.add('dressed', G.roofSlab(0.72, 1.32, 0.29, 0.16), [0.90, 3.41, 2.24]);
  curtainTop(b);
}

function machicolated(b) {
  wallBody(b);
  curtainTop(b, { zEdge: OUT, crenels: false, corbels: false });
  machicolationWallTop(b, L, BODY + 0.07, OUT);
}

function hoarding(b, standalone) {
  const zFace = standalone ? 0 : OUT;
  const bottom = standalone ? 0 : 6.45;
  if (!standalone) {
    const cuts = [-1.73, -1, 0, 1, 1.73].map((x) => G.block(0.21, 0.19, 0.37).translate(x, 6.73, 0.965));
    wallBody(b, cuts);
    curtainTop(b, { zEdge: OUT, crenels: false, inner: false, corbels: false });
  }
  timberHoardingGallery(b, L, bottom + 1.63, zFace);
  for (const x of [-1.86, 0, 1.86]) {
    const y = standalone ? 0 : WALK;
    b.add('darkWood', bevelBlock(0.15, bottom + 4.45 - y, 0.15, 0.008), [x, y, zFace - 0.65]);
  }
}

function shuttered(b) {
  const z = 1.2;
  b.add('stone', G.block(L, 1, 0.60), [0, 0, z]);
  for (const x of [-1, 1]) detailedMerlon(b, 1.18, 0.6, [x, 1, z], 0, { slit: true });
  const pivotY = 1.98;
  const pivotZ = 1.44;
  const angle = -0.61;
  b.push([0, pivotY, pivotZ], 0, angle);
  for (let i = -1; i <= 1; i++) {
    b.add('gateWood', bevelBlock(0.25, 0.76, 0.065, 0.008), [i * 0.256, -0.76, 0], 0, 0, 0);
  }
  const studs = [];
  for (const yy of [-0.58, -0.14]) {
    b.add('iron', bevelBox(0.77, 0.073, 0.09, 0.006), [0, yy, 0]);
    for (const xx of [-0.26, 0, 0.26]) studs.push([xx, yy, 0.045]);
  }
  rivets(b, 'iron', studs, 0.014);
  b.pop();
  b.add('iron', G.rod([-0.49, pivotY, pivotZ], [0.49, pivotY, pivotZ], 0.034, 10));
  b.add('darkWood', G.rod([0.25, 1, 1.10], [0.25, pivotY - 0.63 * Math.cos(angle), pivotZ - 0.63 * Math.sin(angle)], 0.037, 6));
}

export const defenceWallModules = [
  defenceModule('wall_loophole_cross', 'Curtain wall, crosslet loop', '4 m curtain wall with a crosslet opening, tapered courtyard recess and slit merlons; walkway at y = 8.', loophole),
  defenceModule('wall_bastion_square', 'Curtain wall, square flanking spur', 'Square medieval mural projection with three perforated faces and a projecting wall-walk.', (b) => addBastion(b, false)),
  defenceModule('wall_bastion_round', 'Curtain wall, round flanking spur', 'Rounded medieval mural projection, radial corbels and a curved crenellated parapet.', (b) => addBastion(b, true)),
  defenceModule('wall_postern', 'Curtain wall, postern', 'Small recessed side gate with a masonry screen wall, raised threshold and ironbound oak leaf.', postern),
  defenceModule('wall_machicolation', 'Curtain wall, stone machicolation', 'Projecting stone parapet on stepped corbels with open slots between the bridge stones.', machicolated),
  defenceModule('wall_hoarding', 'Curtain wall, timber hoarding', 'Covered cantilevered timber gallery over an 8 m curtain wall.', (b) => hoarding(b, false)),
  defenceModule('hoarding_straight', 'Timber hoarding, separate bay', 'Separate 4 m timber gallery. Set the origin at y = 6.45, z = 1 for a plain curtain wall.', (b) => hoarding(b, true)),
  defenceModule('battlement_shuttered', 'Battlement, hinged timber shutter', '4 m battlement with a partly opened oak shutter. Use at y = 8 over the plain curtain module.', shuttered),
];
