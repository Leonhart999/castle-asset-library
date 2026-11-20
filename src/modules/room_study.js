// Study props (stage 4): leather-bound books with an open book, parchment scrolls with a basket and a cubby rack,
// alchemist's glassware on a small table and a brass balance scale. Base sits at y = 0, centred on x = z = 0,
// 1 unit = 1 m, front faces +Z.

import * as THREE from 'three';
import { lathe, ringBand, bevelBlock, bevelBox } from '../lib/kit.js';
import { armsBuilder } from '../lib/armsKit.js';
import { makeRand, tube, hoop } from '../lib/props.js';

/** Local material slots (this file only): parchment, translucent lab glass, amber tincture and polished brass. */
const STUDY_MATERIALS = {
  parchment: () => new THREE.MeshStandardMaterial({ name: 'parchment', color: 0xe4d3a6, roughness: 0.88 }),
  glass: () =>
    new THREE.MeshPhysicalMaterial({ name: 'lab_glass', color: 0xe8f4f2, roughness: 0.04, metalness: 0, ior: 1.5, transparent: true, opacity: 0.3, depthWrite: false }),
  amber: () => new THREE.MeshStandardMaterial({ name: 'amber_tincture', color: 0x9a5a14, roughness: 0.2, transparent: true, opacity: 0.85 }),
  brass: () => new THREE.MeshStandardMaterial({ name: 'polished_brass', color: 0xc9a24a, metalness: 1, roughness: 0.32 }),
};

const studyBuilder = (M) => armsBuilder(M, STUDY_MATERIALS);

/** Adds geometry at pos with Euler rotation rot = [rx, ry, rz]. Geometry is translated in its local frame beforehand. */
function place(b, mat, geo, pos = [0, 0, 0], rot = [0, 0, 0]) {
  b.add(mat, geo, pos, rot[1], rot[0], rot[2]); // Builder.add takes (rotY, rotX, rotZ)
}

// ---------------------------------------------------------------------------------------------------------------
// 1. Books
// ---------------------------------------------------------------------------------------------------------------

/** Closed book lying flat, spine towards -X (local), base at pos.y. Covers overhang the page block. */
function book(b, pos, { w = 0.2, h = 0.045, d = 0.14, ry = 0, cover = 'leather' } = {}) {
  const rot = [0, ry, 0];
  const t = 0.006;
  place(b, cover, bevelBlock(w, t, d, 0.002), pos, rot);
  place(b, cover, bevelBlock(w, t, d, 0.002).translate(0, h - t, 0), pos, rot);
  place(b, cover, bevelBlock(0.014, h, d, 0.004).translate(-w / 2 + 0.007, 0, 0), pos, rot);
  place(b, 'parchment', bevelBlock(w - 0.022, h - 2 * t + 0.002, d - 0.014, 0.0008).translate(0.003, t - 0.001, 0), pos, rot);
  for (const k of [-0.3, 0, 0.3]) {
    place(b, 'gilt', bevelBlock(0.004, h + 0.002, 0.008, 0.001).translate(-w / 2 - 0.001, -0.001, k * d), pos, rot);
  }
  place(b, 'gilt', bevelBlock(w - 0.06, 0.0015, d - 0.05, 0.0005).translate(0.01, h, 0), pos, rot);
}

/** Open book: two boards, two page blocks and a fan of loose leaves rising from the spine. */
function openBook(b, pos, ry) {
  const rot = [0, ry, 0];
  for (const s of [-1, 1]) {
    place(b, 'leather', bevelBlock(0.21, 0.006, 0.29, 0.002).translate(s * 0.105, 0, 0), pos, rot);
    place(b, 'parchment', bevelBlock(0.19, 0.022, 0.265, 0.001).translate(s * 0.1, 0.006, 0), pos, rot);
  }
  const hy = 0.0285;
  const L = 0.19;
  const fan = [[1, 0.03], [1, 0.08], [1, 0.16], [1, 0.27], [1, 0.4], [1, 0.55], [-1, 0.03], [-1, 0.09], [-1, 0.16]];
  for (const [s, th] of fan) {
    const g = bevelBox(L, 0.0015, 0.255, 0.0005);
    g.rotateZ(s * th);
    g.translate(s * (L / 2) * Math.cos(th) + s * 0.004, hy + (L / 2) * Math.sin(th), 0);
    place(b, 'parchment', g, pos, rot);
  }
}

function bookStack(b) {
  const rand = makeRand(7);
  const stack = [
    { w: 0.3, h: 0.055, d: 0.21, ry: 0.05, cover: 'leather' },
    { w: 0.27, h: 0.045, d: 0.19, ry: -0.12, cover: 'fabric' },
    { w: 0.25, h: 0.05, d: 0.18, ry: 0.2, cover: 'bellowsLeather' },
    { w: 0.22, h: 0.035, d: 0.16, ry: -0.05, cover: 'azure' },
    { w: 0.19, h: 0.03, d: 0.14, ry: 0.3, cover: 'leather' },
  ];
  let y = 0;
  for (const s of stack) {
    book(b, [-0.2 + (rand() - 0.5) * 0.03, y, -0.12 + (rand() - 0.5) * 0.02], s);
    y += s.h;
  }
  // two loose books lying beside the stack
  book(b, [0.26, 0, -0.1], { w: 0.24, h: 0.04, d: 0.17, ry: -0.45, cover: 'bellowsLeather' });
  book(b, [0.26, 0.04, -0.1], { w: 0.2, h: 0.03, d: 0.14, ry: 0.35, cover: 'fabric' });
  openBook(b, [0.02, 0, 0.2], 0.12);
}

// ---------------------------------------------------------------------------------------------------------------
// 2. Scrolls
// ---------------------------------------------------------------------------------------------------------------

/** Rolled scroll, axis along local +Y from pos; stepped end faces hint at the spiral of the roll. */
function scroll(b, pos, rot, { L = 0.34, r = 0.024, dowel = false, tie = true } = {}) {
  const e = 0.0025;
  const pts = [
    [0, e], [r * 0.28, e], [r * 0.28, 0], [r * 0.5, 0], [r * 0.5, e], [r * 0.72, e], [r * 0.72, 0], [r, 0],
    [r, L],
    [r * 0.72, L], [r * 0.72, L - e], [r * 0.5, L - e], [r * 0.5, L], [r * 0.28, L], [r * 0.28, L - e], [0, L - e],
  ];
  place(b, 'parchment', lathe(pts, 20), pos, rot);
  if (tie) place(b, 'leather', ringBand(r + 0.0025, 0.005, 0.012, 20).translate(0, L * 0.45, 0), pos, rot);
  if (dowel) {
    const knob = lathe([[0, 0], [0.006, 0], [0.006, 0.03], [0.011, 0.03], [0.011, 0.037], [0, 0.037]], 12);
    place(b, 'darkWood', knob.translate(0, L - 0.004, 0), pos, rot);
  }
}

/** Scroll lying along the X axis (rotated by ry about Y), centred on (cx, cz) with its axis at height cy. */
function lyingScroll(b, cx, cy, cz, ry, opts) {
  const L = opts.L ?? 0.34;
  scroll(b, [cx - (L / 2) * Math.cos(ry), cy, cz + (L / 2) * Math.sin(ry)], [0, ry, -Math.PI / 2], opts);
}

function scrollBasket(b, cx, cz) {
  const pts = [[0, 0], [0.135, 0], [0.158, 0.025], [0.176, 0.31], [0.18, 0.32], [0.168, 0.325], [0.15, 0.04], [0, 0.035]];
  b.add('straw', lathe(pts, 32), [cx, 0, cz]);
  for (const [y, r] of [[0.1, 0.163], [0.2, 0.169]]) b.add('darkWood', ringBand(r, 0.012, 0.014, 32), [cx, y, cz]);
  const items = [
    { x: -0.07, z: 0.02, rx: 0.03, rz: 0.12, L: 0.42, r: 0.024, dowel: true },
    { x: 0.0, z: -0.05, rx: -0.14, rz: -0.04, L: 0.4, r: 0.022 },
    { x: 0.06, z: 0.03, rx: 0.05, rz: -0.13, L: 0.44, r: 0.024, dowel: true },
    { x: -0.02, z: 0.07, rx: 0.12, rz: 0.03, L: 0.36, r: 0.022 },
    { x: 0.0, z: 0.0, rx: 0.0, rz: 0.0, L: 0.46, r: 0.02, dowel: true },
  ];
  for (const it of items) scroll(b, [cx + it.x, 0.04, cz + it.z], [it.rx, 0, it.rz], it);
}

/** Open cubby rack, 3 x 2 pigeonholes, with scroll ends peeking out of the front (+Z). */
function cubbyRack(b, cz) {
  const W = 0.9;
  const H = 0.5;
  const D = 0.25;
  const side = 0.03;
  const sh = 0.022;
  for (const sx of [-1, 1]) b.add('oak', bevelBlock(side, H, D, 0.004), [sx * (W / 2 - side / 2), 0, cz]);
  for (const y of [0, 0.24, H - sh]) b.add('oak', bevelBlock(W, sh, D, 0.004), [0, y, cz]);
  b.add('darkWood', bevelBlock(W - 0.01, H, 0.012, 0.002), [0, 0, cz - D / 2 + 0.006]);
  const x0 = -W / 2 + side;
  const cw = (W - 2 * side - 0.04) / 3;
  const cubbyX = (i) => x0 + cw / 2 + i * (cw + 0.02);
  for (const row of [0, 1]) {
    const y0 = row === 0 ? sh : 0.24 + sh;
    const hh = row === 0 ? 0.24 - sh : H - sh - 0.24 - sh;
    for (const i of [0, 1]) b.add('oak', bevelBlock(0.02, hh, D - 0.012, 0.003), [x0 + cw + 0.01 + i * (cw + 0.02), y0, cz + 0.006]);
  }
  const counts = [[2, 1, 2], [1, 2, 1]];
  for (const row of [0, 1]) {
    const y0 = row === 0 ? sh : 0.24 + sh;
    for (let i = 0; i < 3; i++) {
      const n = counts[row][i];
      for (let k = 0; k < n; k++) {
        const r = n === 2 ? 0.04 : 0.045;
        const x = cubbyX(i) + (n === 2 ? (k ? 0.055 : -0.055) : 0);
        scroll(b, [x, y0 + r, cz - 0.1], [Math.PI / 2, 0, 0], { L: 0.25 - (k ? 0.015 : 0), r, dowel: (i + k + row) % 2 === 0 });
      }
    }
  }
}

function scrollsAndRack(b) {
  cubbyRack(b, -0.2);
  lyingScroll(b, -0.28, 0.024, 0.25, 0.06, { L: 0.34, r: 0.024, dowel: true });
  lyingScroll(b, -0.28, 0.024, 0.3, -0.05, { L: 0.36, r: 0.024 });
  lyingScroll(b, -0.28, 0.024, 0.35, 0.08, { L: 0.33, r: 0.024, dowel: true });
  lyingScroll(b, -0.28, 0.07, 0.275, -0.1, { L: 0.35, r: 0.022 });
  lyingScroll(b, -0.28, 0.07, 0.326, 0.12, { L: 0.34, r: 0.022, dowel: true });
  lyingScroll(b, -0.28, 0.114, 0.3, 0.02, { L: 0.36, r: 0.022 });
  scrollBasket(b, 0.32, 0.3);
}

// ---------------------------------------------------------------------------------------------------------------
// 3. Alchemist's glassware
// ---------------------------------------------------------------------------------------------------------------

const TY = 0.78; // table top height

/** Profile of a flat-bottomed round flask: sphere of radius R, neck radius rn and height neckH. */
function flaskPts(R, rn, neckH, flat = 0.4) {
  const a0 = -Math.acos(flat);
  const aEnd = Math.acos(rn / R);
  const y0 = R + R * Math.sin(a0);
  const pts = [[0, 0]];
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((aEnd - a0) * i) / n;
    pts.push([R * Math.cos(a), R + R * Math.sin(a) - y0]);
  }
  const yMouth = pts[pts.length - 1][1] + neckH;
  pts.push([rn, yMouth], [rn + 0.004, yMouth], [rn + 0.004, yMouth + 0.006], [0, yMouth + 0.006]);
  return pts;
}

/** Liquid filling a flask profile up to fillY, slightly inset from the glass. */
function liquidPts(pts, inset, fillY) {
  const out = [[0, 0.002]];
  for (const [r, y] of pts.slice(1)) {
    if (y > fillY) break;
    out.push([Math.max(r - inset, 0.002), Math.max(y, 0.002)]);
  }
  out.push([out[out.length - 1][0], fillY], [0, fillY]);
  return out;
}

function flask(b, x, y, z, R, rn, neckH, liquid, fill) {
  const pts = flaskPts(R, rn, neckH);
  b.add('glass', lathe(pts, 28), [x, y, z]);
  if (liquid) b.add(liquid, lathe(liquidPts(pts, 0.004, fill), 24), [x, y, z]);
}

/** Stoppered apothecary bottle with a cork and a liquid fill. */
function bottle(b, x, z, { r = 0.03, h = 0.1, neckR = 0.011, neckH = 0.03, liquid = 'amber' } = {}) {
  const pts = [
    [0, 0], [r * 0.9, 0], [r, 0.006], [r, h], [neckR + (r - neckR) * 0.3, h + 0.02], [neckR, h + 0.035],
    [neckR, h + neckH], [neckR + 0.003, h + neckH], [neckR + 0.003, h + neckH + 0.006], [0, h + neckH + 0.006],
  ];
  b.add('glass', lathe(pts, 24), [x, TY, z]);
  b.add(liquid, lathe([[0, 0.003], [r - 0.003, 0.003], [r - 0.003, h * 0.62], [0, h * 0.62]], 20), [x, TY, z]);
  const k = neckR * 0.9;
  b.add('oak', lathe([[0, 0], [k, 0], [k * 1.05, 0.02], [k * 1.5, 0.02], [k * 1.5, 0.03], [0, 0.03]], 14), [x, TY + h + neckH - 0.014, z]);
}

function labTable(b) {
  b.add('oak', bevelBlock(0.86, 0.04, 0.5, 0.01), [0, 0.74, 0]);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) b.add('darkWood', bevelBlock(0.05, 0.74, 0.05, 0.006), [sx * 0.37, 0, sz * 0.2]);
  }
  for (const sz of [-1, 1]) b.add('darkWood', bevelBlock(0.72, 0.07, 0.03, 0.005), [0, 0.65, sz * 0.2]);
  for (const sx of [-1, 1]) b.add('darkWood', bevelBlock(0.03, 0.07, 0.34, 0.005), [sx * 0.37, 0.65, 0]);
  b.add('oak', bevelBlock(0.74, 0.02, 0.38, 0.004), [0, 0.2, 0]);
}

/** Small iron ring stand: a hoop on three legs, ring top at y + h + 0.004. */
function trivet(b, x, y, z, r, h) {
  b.add('iron', hoop(r, 0.004), [x, y + h, z]);
  for (let k = 0; k < 3; k++) {
    const a = (k * 2 * Math.PI) / 3 + 0.5;
    b.add('iron', bevelBlock(0.01, h, 0.01, 0.002), [x + r * Math.cos(a), y, z + r * Math.sin(a)]);
  }
}

function glasswareTable(b) {
  labTable(b);
  // alembic: cucurbit on a ring stand, domed head with a beak running down into a receiver
  const ax = -0.27;
  const az = -0.08;
  const ringTop = TY + 0.054;
  trivet(b, ax, TY, az, 0.045, 0.05);
  const CY = ringTop - 0.009;
  flask(b, ax, CY, az, 0.075, 0.028, 0.03, 'amber', 0.07);
  const head = [[0, 0], [0.036, 0], [0.036, 0.012], [0.052, 0.03], [0.05, 0.05], [0.033, 0.075], [0.014, 0.095], [0.008, 0.105], [0, 0.108]];
  b.add('glass', lathe(head, 28), [ax, CY + 0.158, az]);
  b.add('glass', tube([[ax + 0.045, CY + 0.198, az], [ax + 0.08, CY + 0.198, az], [ax + 0.13, CY + 0.18, az], [ax + 0.17, CY + 0.15, az], [ax + 0.2, TY + 0.135, az]], 0.008, 20));
  flask(b, ax + 0.2, TY, az, 0.05, 0.016, 0.03, 'amber', 0.02);
  // retort on a ring stand with its neck bent over a receiver
  const rx = 0.07;
  const rz = -0.1;
  trivet(b, rx, TY, rz, 0.045, 0.05);
  const yc = ringTop + 0.0466;
  b.add('glass', new THREE.SphereGeometry(0.065, 24, 16), [rx, yc, rz]);
  b.add('water', new THREE.SphereGeometry(0.058, 20, 12, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), [rx, yc, rz]);
  b.add('glass', tube([[rx + 0.03, yc + 0.052, rz], [rx + 0.07, yc + 0.092, rz], [rx + 0.12, yc + 0.088, rz], [rx + 0.16, TY + 0.17, rz], [rx + 0.195, TY + 0.135, rz]], 0.011, 20));
  flask(b, rx + 0.2, TY, rz, 0.045, 0.016, 0.03, 'water', 0.025);
  // round flasks
  flask(b, -0.15, TY, 0.14, 0.06, 0.02, 0.05, 'water', 0.06);
  flask(b, -0.02, TY, 0.15, 0.045, 0.016, 0.06, 'amber', 0.04);
  // stoppered bottles
  bottle(b, 0.12, 0.17, { r: 0.03, h: 0.1, liquid: 'wine' });
  bottle(b, 0.21, 0.15, { r: 0.024, h: 0.13, liquid: 'amber' });
  bottle(b, 0.31, 0.16, { r: 0.034, h: 0.08, neckR: 0.013, liquid: 'water' });
}

// ---------------------------------------------------------------------------------------------------------------
// 4. Brass balance scale
// ---------------------------------------------------------------------------------------------------------------

function weight(b, mat, x, y, z, r, h) {
  b.add(mat, lathe([[0, 0], [r, 0], [r, h * 0.75], [r * 0.6, h * 0.85], [r * 0.3, h], [0, h]], 16), [x, y, z]);
}

function balanceScale(b) {
  const yP = 0.36; // beam pivot height
  const yPan = 0.12;
  b.add('darkWood', bevelBlock(0.26, 0.03, 0.15, 0.008));
  b.add('oak', bevelBlock(0.2, 0.012, 0.11, 0.004), [0, 0.03, 0]);
  const col = [[0, 0], [0.045, 0], [0.045, 0.008], [0.026, 0.022], [0.018, 0.05], [0.022, 0.07], [0.014, 0.09], [0.011, 0.26], [0.016, 0.275], [0.016, 0.29], [0, 0.295]];
  b.add('brass', lathe(col, 28), [0, 0.042, 0]);
  for (const sz of [-1, 1]) b.add('brass', bevelBox(0.016, 0.05, 0.004, 0.0015), [0, yP, sz * 0.011]);
  b.add('brass', lathe([[0, 0], [0.004, 0], [0.004, 0.034], [0, 0.034]], 10), [0, yP, -0.017], Math.PI / 2);
  b.add('brass', bevelBox(0.5, 0.011, 0.009, 0.003), [0, yP, 0]);
  b.add('brass', bevelBox(0.05, 0.026, 0.012, 0.004), [0, yP, 0]);
  b.add('brass', bevelBox(0.004, 0.07, 0.003, 0.001), [0, yP + 0.045, 0.009]);
  const pan = [[0, 0], [0.045, 0.002], [0.075, 0.014], [0.082, 0.026], [0.078, 0.026], [0.07, 0.015], [0.045, 0.007], [0, 0.005]];
  for (const s of [-1, 1]) {
    const px = s * 0.25;
    b.add('brass', new THREE.SphereGeometry(0.009, 12, 8), [px * 1.02, yP, 0]);
    b.add('brass', new THREE.SphereGeometry(0.005, 10, 6), [px, yP - 0.01, 0]);
    b.add('brass', lathe(pan, 32), [px, yPan, 0]);
    for (let k = 0; k < 3; k++) {
      const a = Math.PI / 2 + (k * 2 * Math.PI) / 3;
      b.add('gilt', tube([[px, yP - 0.012, 0], [px + 0.078 * Math.cos(a), yPan + 0.024, 0.078 * Math.sin(a)]], 0.0016, 2));
    }
  }
  // load: nested brass weights on the right pan, a leather pouch on the left
  weight(b, 'brass', 0.235, yPan + 0.005, 0.01, 0.022, 0.026);
  weight(b, 'brass', 0.275, yPan + 0.005, -0.015, 0.016, 0.02);
  const pouch = new THREE.SphereGeometry(0.03, 14, 10);
  pouch.scale(1, 0.75, 1);
  b.add('bellowsLeather', pouch, [-0.25, yPan + 0.027, 0]);
  // spare weights on the base
  weight(b, 'brass', -0.085, 0.042, 0.03, 0.014, 0.018);
  weight(b, 'brass', 0.085, 0.042, 0.03, 0.011, 0.015);
  weight(b, 'brass', 0.085, 0.042, -0.03, 0.017, 0.022);
}

export const studyModules = [
  {
    id: 'books_leather_stack',
    name: 'Leather-bound books',
    category: 'study',
    description: 'Stack of five gilt-banded leather and cloth bound books, two loose books and an open book with a fan of loose pages.',
    build(M) {
      const b = studyBuilder(M);
      bookStack(b);
      return b.build('books_leather_stack');
    },
  },
  {
    id: 'scrolls_parchment_rack',
    name: 'Parchment scrolls and rack',
    category: 'study',
    description: 'Pile of tied parchment scrolls with wooden dowels, a wicker scroll basket and a 3 x 2 oak cubby rack holding rolled scrolls.',
    build(M) {
      const b = studyBuilder(M);
      scrollsAndRack(b);
      return b.build('scrolls_parchment_rack');
    },
  },
  {
    id: 'alchemist_glassware',
    name: 'Alchemist glassware table',
    category: 'study',
    description: 'Small oak table (top at 0.78 m) with an alembic and receiver, a retort on a ring stand, round flasks and stoppered bottles of coloured liquids.',
    build(M) {
      const b = studyBuilder(M);
      glasswareTable(b);
      return b.build('alchemist_glassware');
    },
  },
  {
    id: 'balance_scale_brass',
    name: 'Brass balance scale',
    category: 'study',
    description: 'Brass beam balance on a turned column and wooden base, two chained pans with weights and a leather pouch, spare weights on the base.',
    build(M) {
      const b = studyBuilder(M);
      balanceScale(b);
      return b.build('balance_scale_brass');
    },
  },
];
