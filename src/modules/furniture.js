// Realistic medieval furniture: carved trestle banquet table, mortised bench, gothic lord's chair,
// turned four-poster bed with draped wool blanket & pleated valance, and dentil oak bookcase with bound tomes.
// Base sits at y = 0, centred on x = z = 0, 1 unit = 1 m.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { newBuilder, lathe, bevelBlock, bevelBox, rivets, candle } from '../lib/kit.js';

/** Soft pillow mesh: pinched corners, slight central dimple and plump waist. */
function softPillow(w = 0.54, h = 0.14, d = 0.36, nx = 14, nz = 10) {
  const g = new THREE.BoxGeometry(w, h, d, nx, 4, nz);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const u = (x / (w / 2));
    const v = (z / (d / 2));
    const r2 = Math.min(1, u * u * 0.72 + v * v * 0.72);
    // puff up the centre, flatten toward seams, add slight head hollow in the middle
    const puff = Math.cos(r2 * Math.PI * 0.46);
    const hollow = Math.exp(-(u * u * 3.5 + v * v * 4.0)) * 0.28;
    const cornerPinch = Math.max(0.18, 1 - 0.85 * Math.pow(Math.max(Math.abs(u), Math.abs(v)), 3.2));
    pos.setY(i, y * (cornerPinch + 0.55 * puff - hollow));
    // gently pull waist inward at corners for ear tips
    const pinch = 1 - 0.08 * (1 - Math.abs(u) * Math.abs(v)) * Math.sin(r2 * Math.PI);
    pos.setX(i, x * pinch);
  }
  g.computeVertexNormals();
  return G.boxUV(g);
}

/**
 * Thick blanket resting over a mattress (width W, top length L) and draping smoothly down
 * the left, right and foot edges with natural sine-wave folds.
 */
function drapedBlanket(W, L, thick = 0.032, drop = 0.24) {
  const nx = 26;
  const nz = 20;
  const verts = [];
  const uvs = [];
  const totalW = W + drop * 2;
  const totalL = L + drop;
  const sample = (iu, iv) => {
    const sx = (iu / nx - 0.5) * totalW;
    const sz = (iv / nz) * totalL; // 0 = head fold, totalL = foot hem
    const hw = W / 2;
    let x = sx;
    let y = 0;
    let z = sz;
    // drape over left/right edges
    const ax = Math.abs(sx);
    if (ax > hw) {
      const over = ax - hw;
      const rad = 0.055;
      if (over < rad * (Math.PI / 2)) {
        const a = over / rad;
        x = Math.sign(sx) * (hw + Math.sin(a) * rad);
        y = -(1 - Math.cos(a)) * rad;
      } else {
        const down = over - rad * (Math.PI / 2);
        x = Math.sign(sx) * (hw + rad + Math.sin(sz * 14) * 0.008 * (down / drop));
        y = -rad - down;
      }
    }
    // drape over foot edge (sz > L)
    if (sz > L) {
      const overZ = sz - L;
      const rad = 0.055;
      if (overZ < rad * (Math.PI / 2)) {
        const a = overZ / rad;
        z = L + Math.sin(a) * rad;
        y -= (1 - Math.cos(a)) * rad;
      } else {
        const down = overZ - rad * (Math.PI / 2);
        z = L + rad + Math.sin(sx * 14) * 0.009 * (down / drop);
        y -= rad + down;
      }
    }
    // gentle bedding ripples across top surface
    y += Math.sin(sx * 9 + sz * 5) * 0.004;
    return [x, y, z];
  };
  const topGrid = [];
  for (let iv = 0; iv <= nz; iv++) {
    topGrid[iv] = [];
    for (let iu = 0; iu <= nx; iu++) topGrid[iv][iu] = sample(iu, iv);
  }
  const addQuad = (a, b2, c, d, flip = false) => {
    if (flip) {
      verts.push(...a, ...c, ...b2, ...a, ...d, ...c);
    } else {
      verts.push(...a, ...b2, ...c, ...a, ...c, ...d);
    }
    uvs.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
  };
  for (let iv = 0; iv < nz; iv++) {
    for (let iu = 0; iu < nx; iu++) {
      const a = topGrid[iv][iu];
      const b2 = topGrid[iv][iu + 1];
      const c = topGrid[iv + 1][iu + 1];
      const d = topGrid[iv + 1][iu];
      addQuad(a, b2, c, d, true);
      // inner underside offset inward/downward
      const off = (p) => [p[0] * 0.985, p[1] - thick, p[2] * 0.99];
      addQuad(off(a), off(b2), off(c), off(d), false);
    }
  }
  // seal head fold edge (iv = 0)
  for (let iu = 0; iu < nx; iu++) {
    const a = topGrid[0][iu];
    const b2 = topGrid[0][iu + 1];
    const oa = [a[0] * 0.985, a[1] - thick, a[2] * 0.99];
    const ob = [b2[0] * 0.985, b2[1] - thick, b2[2] * 0.99];
    addQuad(a, b2, ob, oa, false);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return G.boxUV(g);
}

/** Turned baluster column (base at y = 0, total height h). */
function baluster(rBase, h) {
  const pts = [
    [0, 0],
    [rBase, 0],
    [rBase, h * 0.08],
    [rBase * 0.68, h * 0.16],
    [rBase * 1.15, h * 0.36],
    [rBase * 1.18, h * 0.44],
    [rBase * 0.65, h * 0.65],
    [rBase * 0.88, h * 0.78],
    [rBase * 0.6, h * 0.86],
    [rBase * 0.95, h * 0.94],
    [rBase * 0.95, h],
    [0, h],
  ];
  return lathe(pts, 18);
}

function banquetTable(b) {
  const L = 2.62;
  const W = 0.98;
  const H = 0.78;
  // 4 bevelled oak planks with real joints and subtle height micro-variation
  const gap = 0.004;
  const pw = (W - gap * 3) / 4;
  for (let i = 0; i < 4; i++) {
    const z = -W / 2 + pw / 2 + i * (pw + gap);
    const dy = (i % 2 ? 0.001 : -0.001);
    b.add('oak', bevelBlock(L - 0.16, 0.064, pw, 0.007, 1), [0, H - 0.064 + dy, z]);
  }
  // breadboard end cleats with bevelled edges & exposed tenons
  for (const sx of [-1, 1]) {
    b.add('oak', bevelBlock(0.095, 0.068, W + 0.015, 0.008, 1), [sx * (L / 2 - 0.045), H - 0.066, 0]);
    for (const sz of [-0.3, 0, 0.3]) {
      b.add('darkWood', bevelBlock(0.025, 0.024, 0.05, 0.004), [sx * (L / 2 + 0.003), H - 0.042, sz]);
    }
    // forged iron corner straps + rivets on the breadboard ends
    for (const sz of [-1, 1]) {
      b.add('iron', bevelBlock(0.18, 0.074, 0.045, 0.004), [sx * (L / 2 - 0.08), H - 0.07, sz * (W / 2 - 0.015)]);
      rivets(b, 'iron', [
        [sx * (L / 2 - 0.03), H - 0.035, sz * (W / 2 + 0.008)],
        [sx * (L / 2 - 0.13), H - 0.035, sz * (W / 2 + 0.008)],
      ]);
    }
  }
  // under-table apron rails
  for (const sz of [-1, 1]) b.add('darkWood', bevelBlock(L - 0.65, 0.085, 0.045, 0.005), [0, H - 0.15, sz * 0.32]);
  // two trestle assemblies with twin turned balusters and chamfered sledge feet
  for (const sx of [-1, 1]) {
    const lx = sx * 0.92;
    // sledge foot with chamfered ends (extruded trapezoid)
    const footShape = new THREE.Shape();
    footShape.moveTo(-0.46, 0);
    footShape.lineTo(0.46, 0);
    footShape.lineTo(0.42, 0.075);
    footShape.lineTo(-0.42, 0.075);
    footShape.closePath();
    const fg = new THREE.ExtrudeGeometry(footShape, { depth: 0.13, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 });
    fg.translate(0, 0, -0.065);
    fg.rotateY(Math.PI / 2);
    b.add('darkWood', G.boxUV(fg), [lx, 0, 0]);
    // top cross-bearer
    b.add('darkWood', bevelBlock(0.14, 0.085, 0.84, 0.007), [lx, H - 0.15, 0]);
    // twin turned oak balusters per trestle
    for (const sz of [-1, 1]) {
      b.add('oak', baluster(0.062, H - 0.22), [lx, 0.075, sz * 0.26]);
    }
    // central square post between the balusters to receive the stretcher
    b.add('darkWood', bevelBlock(0.12, H - 0.22, 0.14, 0.007), [lx, 0.075, 0]);
  }
  // heavy central stretcher rail with protruding tenon ends & wooden wedges
  b.add('darkWood', bevelBlock(2.22, 0.095, 0.085, 0.007), [0, 0.2, 0]);
  for (const sx of [-1, 1]) {
    b.add('oak', bevelBlock(0.032, 0.145, 0.032, 0.004), [sx * 1.03, 0.18, 0], 0, 0, sx * 0.14);
    b.add('oak', G.beamXY(sx * 0.92, 0.26, sx * 0.5, H - 0.13, 0.07, 0.07, 0));
  }
}

function woodenBench(b) {
  const L = 2.0;
  const W = 0.4;
  const H = 0.46;
  // two bevelled planks
  for (const sz of [-0.102, 0.102]) {
    b.add('oak', bevelBlock(L, 0.055, 0.194, 0.007), [0, H - 0.055, sz]);
  }
  // arched trestle board legs (carved profile with gothic arch cutout at the bottom)
  const legShape = new THREE.Shape();
  legShape.moveTo(-0.19, 0);
  legShape.lineTo(-0.11, 0);
  legShape.quadraticCurveTo(0, 0.14, 0.11, 0);
  legShape.lineTo(0.19, 0);
  legShape.lineTo(0.15, H - 0.055);
  legShape.lineTo(-0.15, H - 0.055);
  legShape.closePath();
  const legG = new THREE.ExtrudeGeometry(legShape, { depth: 0.065, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 });
  legG.translate(0, 0, -0.0325);
  legG.rotateY(Math.PI / 2);
  for (const sx of [-1, 1]) {
    const lx = sx * 0.72;
    b.add('oak', G.boxUV(legG.clone()), [lx, 0, 0]);
    b.add('darkWood', bevelBlock(0.11, 0.04, W + 0.04, 0.005), [lx, 0, 0]);
    // wedged through-tenons visible on seat top
    for (const sz of [-0.08, 0.08]) b.add('darkWood', bevelBlock(0.045, 0.014, 0.065, 0.003), [lx, H - 0.008, sz]);
    b.add('oak', bevelBlock(0.025, 0.1, 0.025, 0.003), [sx * 0.81, 0.13, 0], 0, 0, sx * 0.15);
    b.add('oak', G.beamXY(sx * 0.72, 0.16, sx * 0.42, H - 0.08, 0.05, 0.05, 0));
  }
  b.add('darkWood', bevelBlock(1.68, 0.065, 0.055, 0.006), [0, 0.15, 0]);
}

function lordChair(b) {
  const W = 0.7;
  const D = 0.64;
  const seatY = 0.46;
  const backH = 1.42;
  // front turned legs + high rear square/chamfered posts
  for (const sx of [-1, 1]) {
    const px = sx * (W / 2 - 0.045);
    b.add('darkWood', bevelBlock(0.08, 0.14, 0.08, 0.007), [px, 0, D / 2 - 0.045]);
    b.add('oak', baluster(0.038, 0.56), [px, 0.14, D / 2 - 0.045]);
    b.add('darkWood', bevelBlock(0.08, backH - 0.08, 0.08, 0.008), [px, 0, -D / 2 + 0.045]);
    // brass finials on top of rear posts
    b.add('gilt', lathe([[0, 0], [0.028, 0.015], [0.046, 0.06], [0.022, 0.11], [0.03, 0.135], [0, 0.16]], 16), [px, backH - 0.08, -D / 2 + 0.045]);
    // curved shaped armrests
    b.add('oak', bevelBlock(0.085, 0.045, D - 0.02, 0.01), [px, 0.69, 0]);
    b.add('darkWood', bevelBlock(0.05, 0.06, D - 0.09, 0.006), [px, 0.14, 0]);
    // carved panel rail under armrests
    b.add('oak', bevelBlock(0.04, 0.2, D - 0.14, 0.006), [px, seatY - 0.08, 0]);
  }
  // front carved apron & rear/lower stretchers
  b.add('darkWood', bevelBlock(W - 0.09, 0.1, 0.045, 0.006), [0, seatY - 0.1, D / 2 - 0.045]);
  b.add('darkWood', bevelBlock(W - 0.09, 0.065, 0.05, 0.006), [0, 0.14, -D / 2 + 0.045]);
  b.add('darkWood', bevelBlock(W - 0.09, 0.055, 0.055, 0.006), [0, 0.16, 0]);
  b.add('oak', bevelBlock(W - 0.09, 0.04, D - 0.08, 0.006), [0, seatY - 0.02, 0]);

  // plump tufted crimson damask seat cushion with brass studs around the sides
  b.add('fabric', softPillow(W - 0.15, 0.095, D - 0.12, 12, 10), [0, seatY + 0.055, 0.02]);
  for (let i = -3; i <= 3; i++) {
    rivets(b, 'gilt', [[i * 0.08, seatY - 0.05, D / 2 - 0.02]], 0.007);
  }
  // panelled gothic backrest + arched cresting rail + tufted padded panel
  b.add('oak', bevelBlock(W - 0.11, backH - seatY - 0.2, 0.048, 0.007), [0, seatY + 0.04, -D / 2 + 0.045]);
  b.add('fabric', softPillow(W - 0.24, 0.07, backH - seatY - 0.36, 10, 10), [0, seatY + 0.14 + (backH - seatY - 0.36) / 2, -D / 2 + 0.075], 0, Math.PI / 2);
  // arched cresting rail at top of backrest
  const crest = new THREE.Shape();
  crest.moveTo(-(W / 2 - 0.04), 0);
  crest.lineTo(W / 2 - 0.04, 0);
  crest.lineTo(W / 2 - 0.04, 0.09);
  crest.quadraticCurveTo(0, 0.21, -(W / 2 - 0.04), 0.09);
  crest.closePath();
  const cg = new THREE.ExtrudeGeometry(crest, { depth: 0.056, bevelEnabled: true, bevelThickness: 0.007, bevelSize: 0.007, bevelSegments: 1, curveSegments: 14 });
  cg.translate(0, 0, -0.028);
  b.add('darkWood', G.boxUV(cg), [0, backH - 0.22, -D / 2 + 0.045]);
  b.add('gilt', bevelBlock(0.11, 0.09, 0.02, 0.004), [0, backH - 0.17, -D / 2 + 0.072]);
}

function canopyBed(b) {
  const W = 1.54;
  const L = 2.18;
  const H = 2.15;
  // four ornate multi-stage turned corner posts
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const px = sx * (W / 2 - 0.07);
      const pz = sz * (L / 2 - 0.07);
      b.add('darkWood', bevelBlock(0.16, 0.32, 0.16, 0.01), [px, 0, pz]);
      b.add('oak', baluster(0.068, 0.45), [px, 0.32, pz]);
      b.add('oak', G.cylinder(0.048, 0.058, H - 0.92, 16, { y0: 0.77 }), [px, 0, pz]);
      b.add('darkWood', bevelBlock(0.15, 0.12, 0.15, 0.01), [px, H - 0.15, pz]);
      b.add('gilt', lathe([[0, 0], [0.04, 0.02], [0.048, 0.06], [0, 0.11]], 14), [px, H + 0.08, pz]);
    }
  }
  // side rails & footboard with chamfered moulding
  b.add('darkWood', bevelBlock(W - 0.14, 0.24, 0.065, 0.008), [0, 0.26, L / 2 - 0.07]);
  for (const sx of [-1, 1]) b.add('darkWood', bevelBlock(0.065, 0.24, L - 0.14, 0.008), [sx * (W / 2 - 0.07), 0.26, 0]);
  // panelled gothic headboard (backing + 3 raised arched panels + top cornice)
  b.add('darkWood', bevelBlock(W - 0.14, 1.05, 0.06, 0.008), [0, 0.26, -L / 2 + 0.07]);
  for (const x of [-0.4, 0, 0.4]) {
    b.add('oak', bevelBlock(0.32, 0.72, 0.04, 0.007), [x, 0.42, -L / 2 + 0.09]);
  }
  b.add('darkWood', bevelBlock(W - 0.08, 0.08, 0.09, 0.008), [0, 1.31, -L / 2 + 0.07]);

  // plump linen mattress with rounded bevels
  b.add('linen', bevelBlock(W - 0.18, 0.2, L - 0.2, 0.045, 2), [0, 0.39, 0]);
  // two soft organic pillows
  for (const sx of [-1, 1]) {
    const p = softPillow(0.56, 0.15, 0.38, 12, 10);
    p.rotateX(0.2);
    b.add('linen', p, [sx * 0.34, 0.63, -L / 2 + 0.35]);
  }
  // naturally draped crimson wool blanket covering the lower 62% and falling down the sides & foot
  const blanket = drapedBlanket(W - 0.16, L * 0.56, 0.028, 0.25);
  b.add('fabric', blanket, [0, 0.605, -0.15]);

  // stepped canopy cornice
  b.add('darkWood', bevelBlock(W + 0.08, 0.11, 0.09, 0.01), [0, H - 0.03, L / 2 - 0.07]);
  b.add('darkWood', bevelBlock(W + 0.08, 0.11, 0.09, 0.01), [0, H - 0.03, -L / 2 + 0.07]);
  for (const sx of [-1, 1]) b.add('darkWood', bevelBlock(0.09, 0.11, L + 0.08, 0.01), [sx * (W / 2 - 0.07), H - 0.03, 0]);
  b.add('linen', bevelBlock(W - 0.14, 0.03, L - 0.14, 0.005), [0, H + 0.04, 0]);
  // wavy pleated solid hanging valance strips around the canopy perimeter
  const valance = (len) => {
    const s = new THREE.Shape();
    const nx = Math.round(len * 22);
    const t = 0.006;
    for (let i = 0; i <= nx; i++) {
      const u = i / nx;
      const x = -len / 2 + u * len;
      const z = Math.sin(u * Math.PI * 18) * 0.02;
      if (i === 0) s.moveTo(x, z + t / 2);
      else s.lineTo(x, z + t / 2);
    }
    for (let i = nx; i >= 0; i--) {
      const u = i / nx;
      const x = -len / 2 + u * len;
      const z = Math.sin(u * Math.PI * 18) * 0.02;
      s.lineTo(x, z - t / 2);
    }
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.24, bevelEnabled: false });
    g.rotateX(Math.PI / 2); // extrude +Z becomes -Y hanging down from y = 0
    return G.boxUV(g);
  };
  const vf = valance(W + 0.04);
  b.add('fabric', vf.clone(), [0, H - 0.02, L / 2 - 0.02]);
  b.add('fabric', vf.clone().rotateY(Math.PI), [0, H - 0.02, -L / 2 + 0.02]);
  const vs = valance(L + 0.04);
  b.add('fabric', vs.clone().rotateY(Math.PI / 2), [W / 2 - 0.02, H - 0.02, 0]);
  b.add('fabric', vs.clone().rotateY(-Math.PI / 2), [-W / 2 + 0.02, H - 0.02, 0]);
}

/** Realistic bound medieval book: rounded spine, raised binding ribs and visible page edges. */
function addBook(b, pos, w, h, d, coverMat, tilt = 0) {
  b.push(pos, 0, 0, tilt);
  b.add('linen', G.block(w - 0.008, h - 0.014, d - 0.01), [0, 0.007, -0.002]);
  for (const sx of [-1, 1]) {
    b.add(coverMat, G.block(0.005, h, d), [sx * (w / 2 - 0.0025), 0, 0]);
  }
  const spine = G.cylinder(w / 2, w / 2, h, 8, { y0: 0 });
  b.add(coverMat, spine, [0, 0, d / 2 - 0.006]);
  for (const f of [0.22, 0.5, 0.78]) {
    b.add('gilt', G.cylinder(w / 2 + 0.003, w / 2 + 0.003, 0.007, 8), [0, h * f, d / 2 - 0.006]);
  }
  b.pop();
}

function bookshelfOak(b) {
  const W = 1.44;
  const D = 0.44;
  const H = 2.14;
  // stepped base plinth & plank back panel
  b.add('darkWood', bevelBlock(W + 0.08, 0.1, D + 0.08, 0.008), [0, 0, 0]);
  b.add('oak', bevelBlock(W + 0.02, 0.05, D + 0.02, 0.006), [0, 0.1, 0]);
  b.add('darkWood', bevelBlock(W - 0.04, H - 0.24, 0.035, 0.005), [0, 0.15, -D / 2 + 0.02]);
  // uprights + fluted front pilasters
  for (const sx of [-1, 1]) {
    b.add('oak', bevelBlock(0.06, H - 0.26, D - 0.02, 0.007), [sx * (W / 2 - 0.03), 0.15, 0]);
    b.add('darkWood', bevelBlock(0.075, H - 0.28, 0.04, 0.006), [sx * (W / 2 - 0.03), 0.15, D / 2 - 0.01]);
  }
  // stepped cornice with dentils
  b.add('darkWood', bevelBlock(W + 0.06, 0.05, D + 0.06, 0.007), [0, H - 0.13, 0]);
  b.add('darkWood', bevelBlock(W + 0.14, 0.08, D + 0.14, 0.009), [0, H - 0.08, 0]);
  for (let x = -W / 2 + 0.05; x <= W / 2 - 0.05; x += 0.07) {
    b.add('oak', bevelBlock(0.032, 0.032, 0.025, 0.003), [x, H - 0.115, D / 2 + 0.035]);
  }
  // 5 shelves with front edge moulding
  const ys = [0.15, 0.59, 1.03, 1.47, 1.98];
  for (const y of ys) {
    b.add('oak', bevelBlock(W - 0.08, 0.04, D - 0.04, 0.006), [0, y, 0]);
    b.add('darkWood', bevelBlock(W - 0.08, 0.028, 0.025, 0.004), [0, y + 0.005, D / 2 - 0.015]);
  }
  // bound medieval volumes: upright, leaning and stacked flat
  const mats = ['leather', 'fabric', 'darkWood', 'oak'];
  let seed = 13;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let s = 0; s < 4; s++) {
    const sy = ys[s] + 0.04;
    let x = -W / 2 + 0.09;
    const endX = W / 2 - 0.09;
    while (x < endX - 0.12) {
      const r = rand();
      if (r < 0.12) {
        // stack of 2-3 flat volumes
        const stackW = 0.22;
        const stackD = 0.28;
        let yy = sy;
        const count = 2 + Math.floor(rand() * 2);
        for (let k = 0; k < count; k++) {
          const bh = 0.045 + rand() * 0.02;
          const m = mats[Math.floor(rand() * mats.length)];
          b.add(m, bevelBlock(stackW, bh, stackD, 0.004), [x + stackW / 2, yy, 0.03]);
          b.add('linen', bevelBlock(stackW - 0.014, bh - 0.008, stackD - 0.012, 0.002), [x + stackW / 2 + 0.004, yy + 0.004, 0.032]);
          yy += bh + 0.002;
        }
        x += stackW + 0.05;
        continue;
      }
      const bw = 0.042 + rand() * 0.032;
      const bh = 0.25 + rand() * 0.11;
      const bd = 0.22 + rand() * 0.06;
      const m = mats[Math.floor(rand() * mats.length)];
      addBook(b, [x + bw / 2, sy, 0.04], bw, bh, bd, m, 0);
      x += bw + 0.005;
    }
  }
  // small brass candlestick and rolled parchment scroll on top shelf
  candle(b, [0.46, 1.51, 0.06], { h: 0.16, r: 0.018, panR: 0.045, matPan: 'gilt', seed: 4 });
}

export const furnitureModules = [
  {
    id: 'table_banquet',
    name: 'Banquet table',
    category: 'furniture',
    description: '2.6 m carved oak hall table with four bevelled planks, breadboard ends, turned baluster trestles and iron corner straps.',
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
    description: '2.0 m oak trestle bench with arched carved standards, wedged through-tenons and chamfered plank top.',
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
    description: 'Gothic carved oak armchair with turned front legs, arched crest rail, tufted damask cushions, brass studs and finials.',
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
    description: 'Turned oak four-poster bed with panelled headboard, soft pillows, naturally draped wool blanket and pleated valance.',
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
    description: 'Dentil-corniced oak bookcase with fluted pilasters, rounded-spine bound volumes with raised bands, flat stacks and a brass candle.',
    build(M) {
      const b = newBuilder(M);
      bookshelfOak(b);
      return b.build('bookshelf_oak');
    },
  },
];
