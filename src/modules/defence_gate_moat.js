import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { archRing, batteredPlinth, bevelBlock, bevelBox, prismXZ, rivets } from '../lib/kit.js';
import { defenceModule, crossletCutter, crossletFrame, detailedMerlon, heavyDoor, ironChain, steppedCorbel, walkwayPaving } from '../lib/defenceKit.js';

const Q = Math.PI / 2;
const arch = (w, h, y = 0, kind = 'pointed') => ({ x: 0, y, w, h, arch: kind });
const cutThrough = (o, depth) => G.openingCutter({ ...o, y: -0.22, h: o.h + o.y + 0.22 }, depth + 0.25).translate(0, 0, depth / 2);

function drawbridge(b, raised) {
  const pivot = [0, 0.75, -1.12];
  const angle = raised ? -1.50 : 0;
  const deckLength = 4.13;
  const opening = arch(3.40, 4.48, 0.75);
  const faceZ = -1.32;
  b.add('stone', G.boxUV(G.carve(G.block(5.4, 6.66, 1.6), [cutThrough(opening, 1.6)])), [0, 0, faceZ - 0.8]);
  b.add('dressed', archRing(opening, 0.28, 0.12), [0, 0, faceZ]);
  for (const s of [-1, 1]) {
    b.add('mossyStone', G.block(0.99, 0.46, 1.74), [s * 2.22, 0, faceZ - 0.8]);
    b.add('dressed', bevelBlock(0.22, 0.55, 0.23, 0.013), [s * 1.57, 5.13, faceZ + 0.035]);
  }
  // Leave a narrow hinge joint and keep the landing clear of the lowered deck.
  b.add('cobble', G.block(3.36, 0.75, 1.77), [0, 0, -2.02]);
  const landingDepth = 1.035;
  const landingZ = pivot[2] + deckLength + 0.015 + landingDepth / 2;
  b.add('mossyStone', G.block(4.10, 0.49, landingDepth), [0, 0, landingZ]);
  b.add('cobble', bevelBlock(4.10, 0.26, landingDepth, 0.012), [0, 0.49, landingZ]);
  for (let i = 0; i < 3; i++) b.add('dressed', bevelBlock(3.95 + i * 0.03, 0.56 - 0.18 * i, 0.25, 0.01), [0, 0, 4.17 + 0.24 * i]);
  b.add('iron', G.rod([-1.73, pivot[1] - 0.11, pivot[2]], [1.73, pivot[1] - 0.11, pivot[2]], 0.074, 12));
  b.push(pivot, 0, angle);
  const bolts = [];
  for (let i = -5; i <= 5; i++) {
    b.add('gateWood', bevelBox(0.28, 0.13, deckLength, 0.009), [i * 0.288, -0.065, deckLength / 2]);
    for (const z of [0.47, 1.64, 2.78, 3.91]) bolts.push([i * 0.288, -0.177, z]);
  }
  for (const [i, z] of [0.47, 1.64, 2.78, 3.91].entries()) {
    b.add('darkWood', bevelBox(3.27, 0.10, 0.18, 0.012), [0, -0.142, z]);
    if (i % 2 === 0) b.add('iron', G.box(3.28, 0.024, 0.10), [0, -0.195, z]);
  }
  for (const x of [-1.55, 1.55]) {
    b.add('iron', bevelBox(0.12, 0.18, deckLength, 0.008), [x, -0.064, deckLength / 2]);
    b.add('iron', G.boxUV(new THREE.TorusGeometry(0.077, 0.019, 6, 14)), [x, 0.048, 3.89], Q);
  }
  rivets(b, 'iron', bolts, 0.017);
  b.pop();
  for (const s of [-1, 1]) {
    const x = 1.55 * s;
    const boom = [x, raised ? 5.94 : 5.40, raised ? -0.66 : 2.12];
    b.add('darkWood', G.rod([x, 5.36, faceZ - 0.28], boom, 0.14, 4));
    b.add('iron', G.box(0.18, 0.19, 0.15), boom);
    const tie = new THREE.Vector3(x, 0.048, 3.89).applyAxisAngle(new THREE.Vector3(1, 0, 0), angle).add(new THREE.Vector3(...pivot));
    ironChain(b, boom, tie.toArray(), { linkLen: 0.17 });
  }
}

function portcullis(b) {
  const w = 4.73, d = 1.43;
  const o = arch(3.18, 4.63);
  b.add('stone', G.boxUV(G.carve(G.block(w, 5.12, d), [cutThrough(o, d)])));
  for (const s of [-1, 1]) {
    b.add('dressed', archRing(o, 0.26, 0.11), [0, 0, s * d / 2], s < 0 ? Math.PI : 0);
    b.add('cobble', G.block(0.66, 0.13, 1.67), [s * 1.93, 0, 0]);
    for (const z of [-0.15, 0.15]) b.add('iron', G.block(0.11, 4.38, 0.12), [s * 1.55, 0, z]);
    for (const z of [-0.57, 0.57]) b.add('darkWood', bevelBlock(0.22, 2.05, 0.22, 0.012), [s * 1.74, 5.12, z]);
    b.add('darkWood', bevelBox(0.21, 0.22, 1.38, 0.012), [s * 1.74, 6.57, 0]);
  }
  for (const z of [-0.57, 0.57]) b.add('darkWood', bevelBox(3.73, 0.24, 0.21, 0.012), [0, 7.18, z]);
  const bolts = [];
  for (let i = -3; i <= 3; i++) {
    const x = i * 0.465;
    b.add('gateWood', bevelBlock(0.13, 4.16, 0.13, 0.009), [x, 0.48, 0]);
    b.add('iron', G.boxUV(new THREE.ConeGeometry(0.095, 0.22, 4)), [x, 0.37, 0], 0, Math.PI);
    for (const y of [0.85, 1.62, 2.39, 3.16, 3.93]) bolts.push([x, y, 0.14]);
  }
  for (const y of [0.85, 1.62, 2.39, 3.16, 3.93]) {
    b.add('gateWood', bevelBox(3.12, 0.145, 0.11, 0.008), [0, y, 0.068]);
    b.add('iron', G.box(3.12, 0.07, 0.028), [0, y, 0.131]);
  }
  rivets(b, 'iron', bolts, 0.021);
  b.add('darkWood', G.cylinder(0.21, 0.21, 3.46, 16, { y0: -1.73 }), [0, 6.56, 0], 0, 0, Q);
  const wheelX = 1.41;
  b.add('timber', G.boxUV(new THREE.TorusGeometry(0.48, 0.047, 8, 24).rotateY(Q)), [wheelX, 6.56, 0]);
  for (let i = 0; i < 8; i++) {
    const a = Math.PI * i / 4;
    b.add('darkWood', G.rod([wheelX, 6.56, 0], [wheelX, 6.56 + 0.47 * Math.sin(a), 0.47 * Math.cos(a)], 0.032, 6));
  }
  for (const x of [-0.96, 0.96]) ironChain(b, [x, 6.56, 0.19], [x, 4.63, 0], { linkLen: 0.15 });
}

const BANK = 4.5;
const WATER = 1.45;
const scarp = [[-4.5, 2.39], [-3.92, 2.39], [-3.72, 2.14], [-3.58, 1.52], [-3.35, 0.92], [-3.12, 0.48]];
const outerBank = [[2.62, 0.48], [2.86, 0.87], [3.06, 1.23], [3.4, 1.59], [3.93, 1.93], [4.5, 2.04]];
const scarpMaterials = ['dressed', 'dressed', 'stone', 'mossyStone', 'mossyStone'];
const outerMaterials = ['earth', 'mossyStone', 'earth', 'turf', 'turf'];

function moatPath(offset, y, corner) {
  return corner ? [[-BANK, y, offset], [offset, y, offset], [offset, y, -BANK]] : [[-2, y, offset], [2, y, offset]];
}

function strip(b, material, p, q, corner, reverse = false) {
  const a = moatPath(...p, corner), d = moatPath(...q, corner);
  const verts = [];
  for (let i = 1; i < a.length; i++) {
    const quad = [a[i - 1], a[i], d[i], d[i - 1]];
    if (!reverse) quad.reverse();
    verts.push(...quad[0], ...quad[1], ...quad[2], ...quad[0], ...quad[2], ...quad[3]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  b.add(material, G.boxUV(g));
}

function moat(b, corner, wet) {
  const end = corner ? BANK : 2;
  b.add('earth', G.block(end * 2, 0.48, BANK * 2), [0, 0, 0]);
  for (let i = 1; i < scarp.length; i++) strip(b, scarpMaterials[i - 1], scarp[i - 1], scarp[i], corner);
  for (let i = 1; i < outerBank.length; i++) strip(b, outerMaterials[i - 1], outerBank[i - 1], outerBank[i], corner);
  strip(b, 'earth', [BANK, 2.04], [BANK, 0.48], corner);
  // The single-sided top leaves the reusable module open only at its join planes.
  strip(b, 'mossyStone', [-BANK, 0.48], scarp[0], corner);
  if (wet) strip(b, 'moatWater', [-3.61, WATER], [3.30, WATER], corner);
}

function stoneBridge(b) {
  const w = 3.98, len = 8.28, deck = 2.40;
  const o = arch(4.43, 1.98, -0.08, 'segmental');
  const body = G.carve(G.block(len, deck - 0.06, w), [G.openingCutter(o, w + 0.25).translate(0, 0, w / 2)]);
  b.add('stone', G.boxUV(body).rotateY(Q));
  b.push([0, 0, 0], Q);
  for (const s of [-1, 1]) b.add('dressed', archRing(o, 0.22, 0.11), [0, 0.08, s * w / 2], s < 0 ? Math.PI : 0);
  b.pop();
  for (const s of [-1, 1]) {
    const x = s * (w / 2 - 0.18);
    b.add('stone', G.block(0.37, 0.69, len), [x, deck, 0]);
    b.add('dressed', bevelBlock(0.49, 0.13, len + 0.04, 0.022), [x, deck + 0.69, 0]);
    for (const z of [-3.1, 3.1]) b.add('mossyStone', prismXZ([[x - 0.34, z - 0.56], [x + 0.34, z - 0.56], [x + s * 0.70, z], [x + 0.34, z + 0.56], [x - 0.34, z + 0.56]], 0, 0.63));
  }
  b.add('cobble', G.block(w, 0.06, len), [0, deck - 0.06, 0]);
}

function bailey(b, hasGate) {
  const d = 1.4, full = 5.50, body = 5.28;
  const o = arch(2.07, 3.44);
  const cross = { y: 2.05, h: 1.28, crossW: 0.43, oiletteR: 0.09 };
  const cutters = [hasGate ? cutThrough(o, d) : crossletCutter(cross, d + 0.21).translate(0, 0, d / 2)];
  b.add('stone', G.boxUV(G.carve(G.block(4, body, d), cutters)));
  for (const [x, z] of (hasGate ? [[-2, -1.28], [1.28, 2]] : [[-2, 2]])) {
    b.add('dressed', batteredPlinth(x, z, d, { h: 0.85, proud: 0.21, top: 0.11 }));
  }
  b.add('dressed', G.block(4, 0.15, d + 0.13), [0, 4.17, 0]);
  b.add('dressed', G.block(4, full - body, 1.78), [0, body, 0]);
  walkwayPaving(b, 4, full + 0.015, -0.46, 0.44);
  for (const s of [-1, 1]) {
    const z = s * 0.645;
    b.add('stone', G.block(4, s > 0 ? 0.82 : 0.58, 0.47), [0, full, z]);
    if (s > 0) for (const x of [-1, 1]) detailedMerlon(b, 1.06, 0.47, [x, full + 0.82, z]);
    else for (const x of [-1, 1]) b.add('dressed', bevelBlock(1.03, 0.35, 0.49, 0.01), [x, full + 0.58, z]);
    for (const x of [-1.5, -0.5, 0.5, 1.5]) steppedCorbel(b, 'dressed', [x, body, s * 0.7], s < 0 ? Math.PI : 0, { proj: 0.18, tiers: 2, tierH: 0.15 });
  }
  if (hasGate) {
    for (const s of [-1, 1]) b.add('dressed', archRing(o, 0.22, 0.09), [0, 0, s * 0.7], s < 0 ? Math.PI : 0);
    b.add('cobble', G.block(o.w, 0.035, 1.70));
    b.push([0, 0.035, -0.36]);
    heavyDoor(b, 2.0, 3.38, 0.17, { arch: 'pointed' });
    b.pop();
    for (const x of [-1.03, 1.03]) b.add('iron', G.box(0.17, 0.26, 0.16), [x, 1.18, -0.51]);
    b.add('darkWood', bevelBox(2.12, 0.16, 0.12, 0.009), [0, 1.19, -0.52]);
  } else crossletFrame(b, 0, cross.y, 0.70, { ...cross, f: 0.11 });
}

function palisade(b) {
  const half = 2;
  const bank = new THREE.Shape([[-1.25, 0], [1.14, 0], [0.56, 0.63], [-0.54, 0.63]].map(p => new THREE.Vector2(...p)));
  b.add('earth', G.profileAlongX(bank, 4).translate(-2, 0, 0));
  b.add('turf', G.block(4, 0.065, 0.97), [0, 0.62, 0]);
  const pins = [];
  for (let i = 0; i < 16; i++) {
    const x = -half + (i + 0.5) * 0.25;
    const r = 0.118 + (i % 3) * 0.003;
    const tip = 3.06 + Math.sin(i * 12.39) * 0.13;
    b.add('palisadeBark', G.cylinder(r * 0.93, r, tip, 8, { y0: 0.49 }), [x, 0, 0.26]);
    b.add('oak', G.cylinder(0.009, r * 0.93, 0.24 + (i % 4) * 0.027, 8), [x, tip + 0.49, 0.26]);
    for (const y of [1.59, 2.78]) pins.push([x, y, 0.409]);
  }
  for (const y of [1.59, 2.78]) b.add('darkWood', bevelBox(4, 0.14, 0.14, 0.012), [0, y, 0.346]);
  rivets(b, 'iron', pins, 0.026);
  for (const x of [-1.7, -0.56, 0.56, 1.70]) {
    b.add('darkWood', bevelBlock(0.12, 1.30, 0.13, 0.01), [x, 0.12, -0.77]);
    b.add('darkWood', G.rod([x, 0.35, -0.14], [x, 1.36, -0.77], 0.052, 4));
  }
  for (const z of [-0.79, -0.56, -0.33, -0.10]) b.add('oak', bevelBlock(3.99, 0.10, 0.223, 0.007), [0, 1.36, z]);
  for (const x of [0.94, 1.56]) b.add('oak', G.rod([x, 0.09, -1.52], [x, 1.43, -0.86], 0.052, 4));
  for (let i = 1; i <= 4; i++) b.add('oak', bevelBox(0.68, 0.065, 0.10, 0.006), [1.25, 0.09 + i * 0.267, -1.52 + i * 0.132]);
}

export const defenceGateMoatModules = [
  defenceModule('drawbridge_lowered', 'Drawbridge, lowered', 'Lowered plank deck between a stone portal and landing pier, with iron furniture and two lifting chains.', (b) => drawbridge(b, false)),
  defenceModule('drawbridge_raised', 'Drawbridge, raised', 'Companion raised pose. Portal, hinge origin and opposing landing align with the lowered model.', (b) => drawbridge(b, true)),
  defenceModule('portcullis_gate', 'Portcullis and loft', 'Ironbound timber grille in a stone arch, with an open upper timber loft and windlass.', portcullis),
  defenceModule('moat_straight', 'Wet moat, straight', '4 m repeating wet ditch module. Water at y = 1.45; join at x = ±2.', (b) => moat(b, false, true)),
  defenceModule('moat_corner', 'Wet moat, corner', 'Mitered 9 m square corner. Straight sections centre at (-6.5, 0) and (0, -6.5) in XZ; rotate the latter +90°.', (b) => moat(b, true, true)),
  defenceModule('moat_dry', 'Dry ditch, straight', 'Same scarp and turf bank profile as the wet straight module, without the water surface.', (b) => moat(b, false, false)),
  defenceModule('moat_bridge_stone', 'Fixed stone causeway', 'Cobble-topped causeway with a segmental barrel arch, wet stone at the feet and parapet coping.', stoneBridge),
  defenceModule('bailey_wall_stone', 'Bailey partition wall', 'Lower 4 m stone partition for the inner and outer baileys, with a crosslet opening and walkway at y = 5.5.', (b) => bailey(b, false)),
  defenceModule('bailey_gate_stone', 'Bailey partition gate', 'Arched stone partition with a recessed ironbound oak gate. Matches the bailey wall profile.', (b) => bailey(b, true)),
  defenceModule('bailey_palisade', 'Bailey timber palisade', '4 m timber stockade with a turf bank, oak walkway and access ladder.', palisade),
];
