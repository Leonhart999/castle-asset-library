import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { archRing, bevelBlock, prismXZ, ringBand } from '../lib/kit.js';
import { defenceModule, crossletCutter, crossletFrame, detailedMerlon, heavyDoor, machicolationWallTop, quoinSet, steppedCorbel } from '../lib/defenceKit.js';

const Q = Math.PI / 2;
const opening = (x, y, w, h, arch = 'round') => ({ x, y, w, h, arch });
const face = (x, z, a = 0) => new THREE.Matrix4().makeTranslation(x, 0, z).multiply(new THREE.Matrix4().makeRotationY(a));
const radial = (r, a) => face(r * Math.sin(a), r * Math.cos(a), a);

function recess(b, cuts, fm, o, { d = 0.59, door = false, trim = 0.19 } = {}) {
  cuts.push(G.openingCutter(o, d).applyMatrix4(fm));
  if (trim > 0) b.add('dressed', archRing(o, trim, 0.11).applyMatrix4(fm));
  if (!door) {
    b.add('void', G.openingPane(o, d).applyMatrix4(fm));
  } else {
    const p = new THREE.Vector3(o.x, o.y, -d + 0.087).applyMatrix4(fm);
    b.push(p.toArray(), Math.atan2(fm.elements[8], fm.elements[10]));
    heavyDoor(b, o.w - 0.035, o.h - 0.04, 0.14, { arch: o.arch, doubleLeaf: o.w > 1.85 });
    b.pop();
  }
}

function loop(b, cuts, fm, y, h = 1.28, curved = false) {
  const o = { y, h, w: 0.11, crossW: 0.35, oiletteR: 0.075, crossH: 0.095 };
  cuts.push(crossletCutter(o, 0.62).applyMatrix4(fm));
  b.add('void', G.boxUV(new THREE.ShapeGeometry(G.openingShape(opening(0, y - 0.01, 0.36, h + 0.02, 'rect')))).translate(0, 0, -0.61).applyMatrix4(fm));
  const p = new THREE.Vector3().setFromMatrixPosition(fm);
  const a = Math.atan2(fm.elements[8], fm.elements[10]);
  b.push(p.toArray(), a);
  crossletFrame(b, 0, y, curved ? -0.025 : 0, { ...o, f: 0.09 });
  b.pop();
}

function crown(b, r, y, { count = 12, segs = 48, slots = false } = {}) {
  const ro = r + 0.53;
  const ct = slots ? 24 : count;
  const inner = slots ? r - 0.045 : r - 0.20;
  for (let i = 0; i < ct; i++) {
    const a = (i * Math.PI * 2) / ct;
    steppedCorbel(b, 'dressed', [r * Math.sin(a), y - 0.22, r * Math.cos(a)], a, { proj: 0.49, tierH: 0.27, width: 0.32 });
    if (slots) b.add('dressed', G.block(0.38, 0.24, 0.43), [(r + 0.12) * Math.sin(a), y - 0.24, (r + 0.12) * Math.cos(a)], a);
  }
  b.add('cobble', G.cylinder(inner, inner, 0.23, segs, { y0: y - 0.23 }));
  const railInner = slots ? r + 0.25 : inner - 0.02;
  b.add('dressed', ringBand((ro + railInner) / 2, ro - railInner, 0.22, segs / 2), [0, y - 0.22, 0]);
  b.add('stone', ringBand(ro - 0.23, 0.43, 0.91, segs / 2), [0, y, 0]);
  for (let i = 0; i < count; i++) {
    const a = (i * Math.PI * 2) / count;
    const rm = ro - 0.23;
    detailedMerlon(b, 0.97, 0.43, [rm * Math.sin(a), y + 0.91, rm * Math.cos(a)], a, { slit: i % 2 === 0 });
  }
}

function finial(b, y, x = 0, z = 0) {
  b.add('iron', G.cylinder(0.025, 0.061, 0.71, 8), [x, y - 0.10, z]);
  b.add('gilt', new THREE.SphereGeometry(0.11, 12, 8), [x, y + 0.45, z]);
  b.add('iron', bevelBlock(0.38, 0.15, 0.023, 0.004), [x + 0.16, y + 0.55, z]);
}

function norman(b) {
  const w = 11.2, d = 9.2, h = 17.4;
  const cuts = [];
  const entry = face(0, -d / 2, Math.PI);
  recess(b, cuts, entry, opening(0.73, 3.55, 1.78, 2.88, 'pointed'), { d: 0.57, door: true });
  for (let side = 0; side < 4; side++) {
    const fm = radial(side % 2 ? w / 2 : d / 2, side * Q);
    for (const x of [-1.6, 1.6]) for (const y of [8.8, 13.1]) {
      recess(b, cuts, fm, opening(x - 0.34, y, 0.51, 1.53), { d: 0.49, trim: 0.077 });
      recess(b, cuts, fm, opening(x + 0.34, y, 0.51, 1.53), { d: 0.49, trim: 0.077 });
    }
    if (side !== 2) loop(b, cuts, fm, 4.3);
  }
  b.add('stone', G.boxUV(G.carve(G.block(w, h, d), cuts)));
  for (const [i, y] of [0, 0.45, 0.93, 1.41].entries()) {
    b.add(i === 0 ? 'mossyStone' : 'dressed', G.block(w + 1.22 - i * 0.28, 0.45 + (i ? 0.03 : 0), d + 1.22 - i * 0.28), [0, y, 0]);
  }
  for (const y of [7.7, 12.65, 16.98]) b.add('dressed', bevelBlock(w + 0.31, 0.20, d + 0.31, 0.02), [0, y, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    quoinSet(b, sx * w / 2, sz * d / 2, sx, sz, 1.9, 17, { course: 0.73 });
    b.add('stone', G.block(1.27, 2.75, 1.27), [sx * (w / 2 - 0.52), h, sz * (d / 2 - 0.52)]);
    b.add('dressed', bevelBlock(1.49, 0.22, 1.49, 0.023), [sx * (w / 2 - 0.52), h + 2.75, sz * (d / 2 - 0.52)]);
  }
  for (const s of [-1, 1]) {
    b.add('stone', G.block(w - 2.23, 0.86, 0.54), [0, h, s * (d / 2 - 0.26)]);
    b.add('stone', G.block(0.54, 0.86, d - 2.23), [s * (w / 2 - 0.26), h, 0]);
    for (const x of [-3.7, -1.85, 0, 1.85, 3.7]) detailedMerlon(b, 1.05, 0.54, [x, h + 0.86, s * (d / 2 - 0.26)]);
    for (const z of [-2.79, -0.93, 0.93, 2.79]) detailedMerlon(b, 1.03, 0.54, [s * (w / 2 - 0.26), h + 0.86, z], Q);
    for (const x of [-3.7, 3.7]) b.add('dressed', G.block(0.44, 13.85, 0.35), [x, 1.86, s * (d / 2 + 0.07)]);
  }
  b.add('cobble', G.block(w - 0.62, 0.037, d - 0.62), [0, h, 0]);
  b.add('oldStone', G.block(6.5, 0.48, 5.65), [0, h + 0.03, 0]);
  const roof = G.gableRoof(6.5, 5.65, 26, { overhang: 0.12, eaveOverhang: 0.14, thick: 0.12 });
  for (const slab of roof.slabs) b.add('slateDark', slab, [0, h + 0.50, 0]);
  for (const x of [-3.20, 3.20]) b.add('oldStone', G.gableWall(5.65, 0.06, roof.ridgeY - 0.10, 0.15).translate(-2.825, 0, 0), [x, h + 0.47, 0], Q);
  // Solid exterior stair and a separate landing at the raised courtyard entry.
  const steps = 18, rise = 3.55 / steps, tread = 0.24;
  for (let i = 0; i < steps; i++) {
    const height = rise * (i + 1);
    b.add('oldStone', G.block(tread, height - 0.075, 1.54), [4.55 - i * tread, 0, -5.55]);
    b.add('dressed', bevelBlock(tread + 0.025, 0.075, 1.62, 0.006), [4.55 - i * tread, height - 0.075, -5.55]);
  }
  b.add('stone', G.block(1.55, 3.41, 1.78), [-0.5, 0, -5.49]);
  b.add('cobble', bevelBlock(1.62, 0.14, 1.81, 0.008), [-0.5, 3.41, -5.47]);
  b.add('stone', G.block(0.23, 0.89, 1.59), [-1.24, 3.55, -5.62]);
}

function roundTower(b, keep) {
  const r = keep ? 5 : 3.58;
  const y = keep ? 17.15 : 12;
  const segs = 48;
  const lower = keep ? 2.64 : 0.98;
  const cuts = [];
  const a = keep ? Math.PI : -Math.PI * 0.75;
  const entry = opening(0, keep ? lower + 0.15 : 0.035, keep ? 1.65 : 1.32, 2.58, 'pointed');
  recess(b, cuts, radial(r - 0.06, a), entry, { d: 0.58, door: true });
  if (!keep) for (const yaw of [-Q, Math.PI]) recess(b, cuts, radial(r - 0.05, yaw), opening(0, 8, 1.3, 2.52, 'pointed'), { d: 0.76 });
  for (const yaw of (keep ? [-Q, -Q / 2, 0, Q / 2, Q] : [-Q / 2, 0, Q / 2, Q])) {
    loop(b, cuts, radial(r - 0.012, yaw), 4.85, 1.32, true);
    if (keep) {
      loop(b, cuts, radial(r - 0.012, yaw + 0.28), 9.35, 1.46, true);
      recess(b, cuts, radial(r - 0.06, yaw), opening(0, 13.05, 0.68, 1.83), { d: 0.56 });
    }
  }
  const shaftBottom = keep ? lower - 0.12 : 0;
  b.add('stone', G.cylUV(G.carve(G.cylinder(r, r, y - 0.23 - shaftBottom, segs, { y0: shaftBottom }), cuts), r));
  const plinth = G.cylinder(r, r + (keep ? 1.15 : 0.30), lower, segs);
  if (!keep) {
    const cutter = G.openingCutter(opening(0, -0.12, entry.w + 0.10, 2.78, 'pointed'), 0.95).applyMatrix4(radial(r + 0.31, a));
    b.add('dressed', G.cylUV(G.carve(plinth, [cutter]), r));
  } else {
    b.add('dressed', plinth);
    b.add('mossyStone', G.cylinder(r + 0.99, r + 1.18, 0.42, segs));
    for (let i = 0; i < 14; i++) {
      const rise = 2.79 / 14, tread = 0.235;
      b.add('dressed', bevelBlock(1.86, rise * (i + 1), tread + 0.018, 0.008), [0, 0, -(r + 0.17 + (13 - i) * tread)]);
    }
  }
  for (const yy of keep ? [7.02, 12.26, 16.32] : [7.0]) b.add('dressed', G.cylinder(r + 0.075, r + 0.075, 0.17, segs, { y0: yy }));
  crown(b, r, y, { count: keep ? 16 : 12, segs, slots: keep });
  if (keep) {
    b.add('oldStone', G.cylinder(3.4, 3.4, 1.47, segs, { y0: y }));
    b.add('dressed', G.cylinder(3.61, 3.61, 0.24, segs, { y0: y + 1.29 }));
    b.add('slateDark', G.coneRoof(3.63, 4.68, segs, { flare: 0.035 }), [0, y + 1.53, 0]);
    finial(b, y + 6.21);
  }
}

function bartizan(b) {
  const outline = [[-2, -1], [-1, -1], [-1, -2], [1, -2], [1, 1], [-2, 1]];
  b.add('stone', prismXZ(outline, 0, 7.65));
  const top = [[-2, -1], [-1, -1], [-1, -2], [1.28, -2], [1.28, 1.28], [-2, 1.28]];
  b.add('dressed', prismXZ(top, 7.65, 8));
  quoinSet(b, 1, 1, 1, 1, 0.15, 5.14);
  for (const [x, z, yy] of [[-0.67, 0.99, 0], [0.99, -0.67, Q]]) {
    b.add('stone', G.block(2.66, 0.93, 0.48), [x, 8, z], yy);
    const px = yy ? x : -1.32;
    const pz = yy ? -1.32 : z;
    detailedMerlon(b, 0.89, 0.48, [px, 8.93, pz], yy, { slit: true });
  }
  const cx = 1.27, cz = 1.27, r = 1.12;
  for (let i = 0; i < 5; i++) b.add('dressed', G.cylinder(0.49 + i * 0.17, 0.39 + i * 0.17, 0.35, 28), [cx, 5.97 + i * 0.35, cz]);
  const cuts = [];
  for (const a of [-0.21, 0.64, 1.50, 2.36]) {
    loop(b, cuts, face(cx + (r - 0.014) * Math.sin(a), cz + (r - 0.014) * Math.cos(a), a), 8.55, 1.12, true);
  }
  b.add('stone', G.cylUV(G.carve(G.cylinder(r, r, 2.98, 32, { y0: 7.71 }).translate(cx, 0, cz), cuts).translate(-cx, 0, -cz), r), [cx, 0, cz]);
  b.add('dressed', G.cylinder(1.26, 1.19, 0.23, 32), [cx, 10.65, cz]);
  b.add('slateDark', G.coneRoof(1.36, 2.85, 32, { flare: 0.08 }), [cx, 10.88, cz]);
  finial(b, 13.73, cx, cz);
}

function octagonal(b) {
  const r = 3.61;
  const flat = r * Math.cos(Math.PI / 8);
  const oct = (rt, rb, h, y = 0) => G.boxUVRadial(new THREE.CylinderGeometry(rt, rb, h, 8, 1, false, Math.PI / 8).translate(0, y + h / 2, 0));
  const cuts = [];
  const door = opening(0, 0.04, 1.48, 2.61, 'pointed');
  recess(b, cuts, radial(flat, Math.PI), door, { d: 0.61, door: true });
  for (const a of [-Q, Q]) recess(b, cuts, radial(flat, a), opening(0, 8, 1.20, 2.28, 'pointed'), { d: 0.75 });
  for (const a of [-Q, -Q / 2, 0, Q / 2, Q]) loop(b, cuts, radial(flat, a), 4.54, 1.54);
  for (let i = 0; i < 8; i++) {
    const a = i * Q / 2;
    recess(b, cuts, radial(flat, a), opening(0, 10.32, 0.91, 1.59), { d: 0.46 });
    const t = a + Math.PI / 8;
    for (let j = 0; j < 14; j++) b.add('dressed', G.block(j % 2 ? 0.26 : 0.42, 0.40, 0.22), [(r - 0.06) * Math.sin(t), 1.23 + j * 0.63, (r - 0.06) * Math.cos(t)], t);
  }
  b.add('stone', G.boxUVRadial(G.carve(oct(r, r, 12.27), cuts)));
  const baseDoor = G.openingCutter(opening(0, -0.15, 1.59, 2.82, 'pointed'), 1.0).applyMatrix4(radial(flat + 0.38, Math.PI));
  b.add('mossyStone', G.boxUVRadial(G.carve(oct(r + 0.29, r + 0.37, 0.36), [baseDoor])));
  b.add('dressed', G.boxUVRadial(G.carve(oct(r + 0.06, r + 0.29, 0.68, 0.36), [baseDoor])));
  b.add('dressed', oct(r + 0.14, r + 0.14, 0.20, 7.25));
  for (let i = 0; i < 8; i++) {
    const a = i * Q / 2;
    for (const x of [-0.97, 0.97]) {
      const p = new THREE.Vector3(x, 12.07, 0).applyMatrix4(radial(flat, a));
      steppedCorbel(b, 'dressed', p.toArray(), a, { proj: 0.47, tierH: 0.20 });
    }
  }
  b.add('dressed', oct(r + 0.49, r + 0.38, 0.32, 12.20));
  const roof = G.cylinder(0.015, r + 0.59, 5.54, 8).rotateY(Math.PI / 8);
  b.add('slateDark', G.boxUVRadial(roof), [0, 12.49, 0]);
  finial(b, 18.03);
}

function barbican(b) {
  const w = 7.6, d = 5.65, h = 10.5;
  const pass = opening(0, -0.22, 3.36, 5.00, 'pointed');
  const cuts = [G.openingCutter(pass, d + 0.4).translate(0, 0, d / 2)];
  for (const x of [-1.71, 1.71]) recess(b, cuts, face(0, d / 2), opening(x, 7.53, 0.77, 1.63));
  b.add('stone', G.boxUV(G.carve(G.block(w, h, d), cuts)));
  for (const s of [-1, 1]) b.add('dressed', archRing({ ...pass, y: 0, h: 4.78 }, 0.31, 0.16), [0, 0, s * d / 2], s < 0 ? Math.PI : 0);
  b.add('cobble', G.block(3.30, 0.042, d + 0.48), [0, 0.001, 0]);
  for (const s of [-1, 1]) {
    b.add('iron', G.block(0.10, 3.09, 0.23), [s * 1.65, 0.05, 1.06]);
    b.add('darkWood', bevelBlock(0.14, 3.07, 1.53, 0.015), [s * 1.54, 0.05, -1.84]);
    for (const y of [0.54, 1.7, 2.51]) b.add('iron', G.box(0.17, 0.068, 1.53), [s * 1.54, y, -1.84]);
  }
  for (let i = -4; i <= 4; i++) b.add('iron', bevelBlock(0.08, 2.3, 0.088, 0.008), [0.39 * i, 2.33, 1.06]);
  for (const y of [2.7, 3.29, 3.88]) b.add('iron', bevelBlock(3.36, 0.085, 0.11, 0.006), [0, y, 1.068]);
  machicolationWallTop(b, 5.23, h - 0.24, d / 2, { proj: 0.83, corbels: 6, merlons: 3 });
  b.add('stone', G.block(w, 1.0, 0.55), [0, h, -2.57]);
  for (const x of [-1.73, 0, 1.73]) detailedMerlon(b, 0.91, 0.55, [x, h + 1, -2.57]);
  b.add('cobble', G.block(w, 0.03, d - 0.62), [0, h, -0.29]);
  for (const s of [-1, 1]) {
    const tx = s * 3.98, tz = 0.57, r = 2.2;
    b.push([tx, 0, tz]);
    const loops = [];
    for (const a of [0, s * Q / 2, s * Q, s * Math.PI * 0.85]) loop(b, loops, radial(r - 0.015, a), 4.29, 1.36, true);
    b.add('stone', G.cylUV(G.carve(G.cylinder(r, r, 11.76, 40), loops), r));
    b.add('mossyStone', G.cylinder(r + 0.22, r + 0.30, 0.43, 48));
    b.add('dressed', G.cylinder(r + 0.04, r + 0.22, 0.53, 48), [0, 0.43, 0]);
    b.add('dressed', G.cylinder(r + 0.075, r + 0.075, 0.21, 48), [0, 7.04, 0]);
    crown(b, r, 12, { count: 8 });
    b.pop();
  }
}

export const defenceTowerModules = [
  defenceModule('keep_norman', 'Norman rectangular keep', 'Rectangular donjon with raised courtyard entry, forebuilding stairs, paired Romanesque windows and corner turrets.', norman),
  defenceModule('keep_round', 'Round stone keep', 'Tall round donjon with battered base, staggered windows, stone crown gallery and a recessed slate roof.', (b) => roundTower(b, true)),
  defenceModule('tower_corner_round', 'Round corner tower', 'Round tower with wall-walk entries facing -X and -Z at y = 8; place adjoining walls about 5.4 m from the tower centre.', (b) => roundTower(b, false)),
  defenceModule('tower_bartizan', 'Corner bartizan', 'Corbelled stone lookout and slate spire over a corner curtain wall. Wall arms end at x = -2 and z = -2.', bartizan),
  defenceModule('tower_octagonal', 'Octagonal watchtower', 'Faceted stone tower with quoins, splayed recesses, bracketed eaves and a slate spire.', octagonal),
  defenceModule('gatehouse_barbican', 'Twin-towered gatehouse', 'Through passage with a raised iron grille, open timber leaves and a stone gallery between projecting flanking towers.', barbican),
];
