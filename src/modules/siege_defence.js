// Stage 5 wall-defence stores: a cradle of rolling logs, a bin of drop stones with stone shot, and a tipping
// cauldron of hot pitch over a fire basket. Base sits at y = 0, centred on x = z = 0, 1 unit = 1 m, front +Z
// (the side that faces the parapet / field).
//
// Reference sizes: defenders' logs ~2.2-2.6 m long and 0.25-0.32 m thick (light enough for two or three men
// to lever over a parapet); drop stones 0.2-0.45 m; trebuchet shot 0.3-0.4 m dressed spheres; pitch
// cauldrons 0.6-0.8 m across, hung on trunnions so they can be tipped from behind.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { lathe, ringBand, bevelBlock, bevelBox, rivets, charcoalLump } from '../lib/kit.js';
import { armsBuilder, beam, tube, boulder, makeRand } from '../lib/armsKit.js';
import { pbr } from '../lib/materials.js';

const LOCAL = {
  // debarked, adze-dressed log surface
  debarked: () => pbr('rough_wood', { name: 'debarked_log', tile: 0.9, color: 0xcdb595, normalScale: 1.3 }),
  // pine bark for the rolling logs (coarser than the kit's oak bark)
  pineBark: () => pbr('pine_bark', { name: 'pine_bark', tile: 0.7, color: 0xb9a690, normalScale: 1.4 }),
};

// ---------------------------------------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------------------------------------

/** Radius of a log at angle a (radians around its axis) and t in [0, 1] along its length. */
function logRadius(r, seed, a, t) {
  return (
    r *
    (1 - 0.07 * t) * // natural taper towards the top end
    (1 + 0.045 * Math.sin(a * 3 + seed * 1.7) + 0.025 * Math.sin(a * 5 - seed * 0.9 + t * 4) + 0.02 * Math.sin(t * 9 + seed))
  );
}

/**
 * Log lying along X, centred on the origin, length len, mean radius r. Returns { side, caps, R(a, t) }
 * where the side and both end caps share the same perturbed outline (no gaps).
 */
function logGeoms(len, r, seed, segs = 16, rows = 10) {
  const side = new THREE.CylinderGeometry(r, r, len, segs, rows, true);
  const pos = side.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const a = Math.atan2(x, z); // CylinderGeometry puts theta at (sin, cos)
    const t = y / len + 0.5;
    const R = logRadius(r, seed, a, t);
    pos.setXYZ(i, Math.sin(a) * R, y + 0.012 * Math.sin(a * 2 + seed) * (t < 0.01 || t > 0.99 ? 1 : 0), Math.cos(a) * R);
  }
  side.computeVertexNormals();
  const caps = [];
  for (const end of [0, 1]) {
    const y = (end - 0.5) * len;
    const v = [];
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      const p0 = [Math.sin(a0) * logRadius(r, seed, a0, end), y + 0.012 * Math.sin(a0 * 2 + seed), Math.cos(a0) * logRadius(r, seed, a0, end)];
      const p1 = [Math.sin(a1) * logRadius(r, seed, a1, end), y + 0.012 * Math.sin(a1 * 2 + seed), Math.cos(a1) * logRadius(r, seed, a1, end)];
      const c = [0, y, 0];
      if (end) v.push(...c, ...p0, ...p1);
      else v.push(...c, ...p1, ...p0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.computeVertexNormals();
    caps.push(G.boxUV(g));
  }
  const toX = (g) => g.rotateZ(-Math.PI / 2); // +Y (t = 1) becomes +X
  return { side: toX(G.cylUV(side, r)), caps: caps.map(toX) };
}

/**
 * Adds a log along X centred at pos. `kind` is 'bark', 'debarked' or 'spiked' (debarked with forged iron spikes).
 * Growth rings and a pith check are inlaid on both sawn ends.
 */
function addLog(b, pos, len, r, seed, kind = 'bark', rotY = 0) {
  const { side, caps } = logGeoms(len, r, seed);
  b.push(pos, rotY);
  b.add(kind === 'bark' ? 'pineBark' : 'debarked', side);
  for (const c of caps) b.add('endGrain', c);
  // darker growth rings 1.5 mm proud of each sawn face, plus a heart check (radial crack)
  for (const end of [-1, 1]) {
    const x = end * len * 0.5;
    const rEnd = r * (end > 0 ? 0.93 : 1);
    for (const f of [0.24, 0.5, 0.76]) {
      // flattened torus rings read as darker latewood, cheap compared with extruded ring bands
      const ring = new THREE.TorusGeometry(rEnd * f, 0.004, 3, 20);
      ring.scale(1, 1, 0.35);
      ring.rotateY(Math.PI / 2);
      b.add('darkWood', G.boxUV(ring), [x, 0, 0]);
    }
    b.add('void', G.box(0.004, rEnd * 0.65, 0.005), [x, rEnd * 0.32, 0]); // heart check
  }
  if (kind !== 'bark') {
    // a few strips of bark left on the debarked logs
    const rand = makeRand(seed * 31 + 5);
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      const t0 = 0.1 + rand() * 0.6;
      const t1 = t0 + 0.12 + rand() * 0.15;
      const pts = [];
      for (let i = 0; i <= 6; i++) {
        const t = t0 + ((t1 - t0) * i) / 6;
        const R = logRadius(r, seed, a, t) + 0.004;
        pts.push([(t - 0.5) * len, -Math.sin(a) * R, Math.cos(a) * R]);
      }
      b.add('pineBark', tube(pts, 0.022, 8, 5));
    }
  }
  if (kind === 'spiked') {
    // forged square spikes in staggered rings, each seated in a square iron washer
    for (let ring = 0; ring < 7; ring++) {
      const t = 0.1 + (ring / 6) * 0.8;
      for (let k = 0; k < 5; k++) {
        const a = ((k + (ring % 2) * 0.5) / 5) * Math.PI * 2 + 0.3;
        // a side vertex at angle a sits at (x, z) = (sin a, cos a) before the -90 deg Z turn, i.e. (y, z) = (-sin a, cos a) after it
        const R = logRadius(r, seed, a, t);
        const dir = [0, -Math.sin(a), Math.cos(a)];
        const base = [(t - 0.5) * len, dir[1] * (R - 0.006), dir[2] * (R - 0.006)];
        const rotX = Math.atan2(dir[2], dir[1]);
        b.add('iron', G.cylinder(0.002, 0.012, 0.11, 4), base, 0, rotX);
        b.add('iron', bevelBlock(0.034, 0.008, 0.034, 0.002), base, 0, rotX);
      }
    }
  }
  b.pop();
}

/** Iron-shod wooden pry bar (crow) for levering logs over the parapet, lying on the ground. Origin at its foot. */
function addPryBar(b, pos, rotY) {
  b.push(pos, rotY);
  b.add('oak', G.cylinder(0.022, 0.026, 1.5, 8), [0, 0.026, 0], 0, 0, -Math.PI / 2);
  b.add('iron', G.cylinder(0.026, 0.028, 0.18, 8), [0, 0.028, 0], 0, 0, -Math.PI / 2);
  b.add('iron', beam([-0.02, 0.028, 0], [-0.16, 0.012, 0], 0.03, 0.026, { bevel: 0.004 }));
  b.pop();
}

function logsRolling(b) {
  // two sole beams across the wall walk (along Z), notched chocks at both ends of the stack
  const soleX = 0.88;
  const soleH = 0.12;
  for (const sx of [-1, 1]) {
    b.add('siegeTimber', bevelBlock(0.14, soleH, 1.24, 0.012), [sx * soleX, 0, 0]);
    for (const sz of [-1, 1]) {
      // chock wedge pinned with an iron spike
      const wedge = new THREE.Shape();
      wedge.moveTo(0, 0);
      wedge.lineTo(0.16, 0);
      wedge.lineTo(0.16, 0.2);
      wedge.lineTo(0.06, 0.2);
      wedge.lineTo(0, 0.06);
      wedge.closePath();
      const g = new THREE.ExtrudeGeometry(wedge, { depth: 0.13, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 1 });
      g.translate(0, 0, -0.065);
      g.rotateY(sz > 0 ? -Math.PI / 2 : Math.PI / 2);
      b.add('darkWood', G.boxUV(g), [sx * soleX, soleH, sz * 0.64]);
      b.add('iron', G.cylinder(0.012, 0.012, 0.012, 6), [sx * soleX, soleH + 0.2, sz * 0.72]);
    }
    // iron straps over the sole beam ends
    for (const sz of [-1, 1]) b.add('iron', bevelBlock(0.15, 0.006, 0.05, 0.002), [sx * soleX, soleH, sz * 0.55]);
  }
  // 3-2-1 stack of logs: bark, debarked and two spiked logs on the top rows
  const r = 0.15;
  const gap = 0.002;
  const y0 = soleH + r;
  const dy = (2 * r + gap) * Math.sin(Math.PI / 3);
  const logs = [
    [-0.31, y0, 'bark', 1, 2.5],
    [0, y0, 'bark', 2, 2.45],
    [0.31, y0, 'debarked', 3, 2.5],
    [-0.155, y0 + dy, 'bark', 4, 2.48],
    [0.155, y0 + dy, 'spiked', 5, 2.4],
    [0, y0 + 2 * dy, 'spiked', 6, 2.35],
  ];
  for (const [z, y, kind, seed, len] of logs) addLog(b, [((seed % 3) - 1) * 0.04, y, z], len, kind === 'spiked' ? 0.14 : r, seed, kind);
  // a loose log ready on the front (+Z) side, and a pry bar
  addLog(b, [0.1, 0.158, 0.9], 2.3, 0.14, 9, 'debarked', 0.06);
  addPryBar(b, [-1.0, 0, -0.95], 0.18);
  // cut length of the rope that lashed the stack in storage, lying over one sole beam
  b.add('rope', tube([[-1.02, 0.12, 0.3], [-1.07, 0.06, 0.35], [-1.1, 0.012, 0.48], [-1.05, 0.012, 0.66]], 0.012, 16, 6));
}

// ---------------------------------------------------------------------------------------------------------
// Drop stones and stone shot
// ---------------------------------------------------------------------------------------------------------

/** Dressed round stone shot of radius r, its centre at pos; chisel facets come from a low-detail sphere. */
function addShot(b, pos, r, seed) {
  const g = boulder(r, seed, { detail: 3, rough: 0.035, squash: 1 });
  b.add('hearth', g, pos);
}

function rocksDropPile(b) {
  const W = 1.5;
  const D = 0.8;
  const H = 0.62;
  const post = 0.09;
  // corner posts and bottom boards
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add('siegeTimber', bevelBlock(post, H + 0.06, post, 0.01), [sx * (W / 2 - post / 2), 0, sz * (D / 2 - post / 2)]);
  for (let i = 0; i < 4; i++) b.add('oak', bevelBlock(W - 0.02, 0.04, D / 4 - 0.01, 0.006), [0, 0.04, -D / 2 + D / 8 + (i * D) / 4]);
  for (const sx of [-1, 1]) b.add('siegeTimber', bevelBlock(0.1, 0.04, D, 0.008), [sx * (W / 2 - 0.2), 0, 0]); // skids under the floor
  // horizontal side boards on all four sides, each nailed to the posts
  const boards = 3;
  const bh = (H - 0.06) / boards;
  for (let i = 0; i < boards; i++) {
    const y = 0.07 + i * bh;
    for (const sz of [-1, 1]) {
      b.add('siegeTimber', bevelBlock(W - 0.02, bh - 0.012, 0.035, 0.006), [0, y, sz * (D / 2 + 0.018)]);
      rivets(b, 'iron', [[-(W / 2 - post / 2), y + bh / 2, sz * (D / 2 + 0.036)], [W / 2 - post / 2, y + bh / 2, sz * (D / 2 + 0.036)]], 0.008);
    }
    for (const sx of [-1, 1]) {
      b.add('siegeTimber', bevelBlock(0.035, bh - 0.012, D - 0.02, 0.006), [sx * (W / 2 + 0.018), y, 0]);
    }
  }
  // iron corner straps
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (const y of [0.1, H - 0.08]) {
        b.add('iron', bevelBlock(0.16, 0.04, 0.006, 0.002), [sx * (W / 2 - 0.06), y, sz * (D / 2 + 0.039)]);
        b.add('iron', bevelBlock(0.006, 0.04, 0.16, 0.002), [sx * (W / 2 + 0.039), y, sz * (D / 2 - 0.06)]);
      }
    }
  }
  // rope handles at both ends
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 + 0.045);
    b.add('rope', tube([[x - sx * 0.01, H - 0.12, -0.2], [x + sx * 0.03, H - 0.2, -0.12], [x + sx * 0.04, H - 0.23, 0], [x + sx * 0.03, H - 0.2, 0.12], [x - sx * 0.01, H - 0.12, 0.2]], 0.014, 16, 6));
  }
  // boulders packed in the bin in layers, heaped above the rim towards the middle
  const rand = makeRand(77);
  let seed = 1;
  const inner = { x: W / 2 - 0.05, z: D / 2 - 0.02 };
  const layers = [
    { y: 0.08, nx: 5, nz: 2, rr: [0.12, 0.15] },
    { y: 0.32, nx: 5, nz: 2, rr: [0.12, 0.15] },
    { y: 0.56, nx: 4, nz: 2, rr: [0.12, 0.16] },
    { y: 0.76, nx: 3, nz: 1, rr: [0.13, 0.17] },
  ];
  for (const L of layers) {
    for (let ix = 0; ix < L.nx; ix++) {
      for (let iz = 0; iz < L.nz; iz++) {
        const r = L.rr[0] + rand() * (L.rr[1] - L.rr[0]);
        const sx = (2 * inner.x) / L.nx;
        const sz = (2 * inner.z) / L.nz;
        let x = -inner.x + sx * (ix + 0.5) + (rand() - 0.5) * 0.05;
        let z = -inner.z + sz * (iz + 0.5) + (rand() - 0.5) * 0.05;
        x = Math.max(-inner.x + r * 0.85, Math.min(inner.x - r * 0.85, x));
        z = Math.max(-inner.z + r * 0.8, Math.min(inner.z - r * 0.8, z));
        const g = boulder(r, seed++, { detail: 1, rough: 0.35, squash: 0.7 + rand() * 0.25, cuts: 3, flat: true });
        b.add('boulder', g, [x, L.y + r * 0.75, z], rand() * Math.PI * 2);
      }
    }
  }
  // dressed stone shot stacked beside the bin (front), and two loose drop stones on the ground
  const sr = 0.17;
  for (const [x, z] of [[-0.5, 0.75], [-0.16, 0.75], [-0.33, 1.04]]) addShot(b, [x, sr, z], sr, seed++);
  addShot(b, [-0.33, sr + 2 * sr * 0.8, 0.85], sr, seed++); // fourth ball resting in the hollow of the other three
  for (const [x, z, r] of [[0.45, 0.72, 0.2], [0.78, 0.88, 0.14]]) {
    const g = boulder(r, seed++, { detail: 1, rough: 0.35, squash: 0.72, cuts: 3, flat: true });
    g.computeBoundingBox();
    b.add('boulder', g, [x, -g.boundingBox.min.y, z], 0.7);
  }
}

// ---------------------------------------------------------------------------------------------------------
// Tipping cauldron of hot pitch
// ---------------------------------------------------------------------------------------------------------

/** Flame tongue: bulb at the base narrowing to a curling tip, bent sideways (along X) by `bend` metres. */
function flameTongue(h, r, bend = 0) {
  const g = lathe([[0, 0], [r * 0.8, h * 0.08], [r, h * 0.22], [r * 0.8, h * 0.45], [r * 0.45, h * 0.7], [r * 0.15, h * 0.9], [0, h]], 12);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / h;
    pos.setX(i, pos.getX(i) + bend * t * t);
  }
  g.computeVertexNormals();
  return g;
}

const C = {
  pivotY: 1.08, // trunnion axis height
  rimY: 1.12, // cauldron rim, just above the pivot: the full body hangs below the axis, so it rests upright
  bottomY: 0.6,
  r: 0.36, // rim radius
  postX: 0.6,
};

/** Cauldron profile (radius, height relative to its bottom), outer then inner skin, closed at the rim roll. */
function cauldronGeom() {
  const h = C.rimY - C.bottomY;
  const outer = [
    [0, 0],
    [0.12, 0.004],
    [0.24, 0.05],
    [0.32, 0.15],
    [0.355, 0.28],
    [0.36, h - 0.06],
    [0.372, h - 0.03],
    [0.38, h - 0.008],
    [0.372, h],
  ];
  const inner = [
    [0.345, h - 0.006],
    [0.34, h - 0.06],
    [0.335, 0.28],
    [0.3, 0.16],
    [0.22, 0.068],
    [0.11, 0.024],
    [0, 0.02],
  ];
  return lathe([...outer, ...inner], 36);
}

function oilCauldron(b) {
  const rand = makeRand(5);
  // flagstone hearth pad the whole rig stands on
  for (const [x, z, w, d] of [[-0.32, -0.25, 0.62, 0.5], [0.32, -0.25, 0.62, 0.5], [-0.32, 0.27, 0.62, 0.52], [0.32, 0.27, 0.62, 0.52]]) {
    b.add('hearth', bevelBlock(w - 0.012, 0.07, d - 0.012, 0.012), [x, 0, z]);
  }
  // timber gallows: two sole beams, two posts with knee braces, iron pillow blocks carrying the trunnions
  for (const sx of [-1, 1]) {
    const x = sx * C.postX;
    b.add('siegeTimber', bevelBlock(0.16, 0.14, 1.1, 0.012), [x, 0.07, 0]);
    b.add('siegeTimber', bevelBlock(0.15, C.pivotY - 0.21 + 0.06, 0.15, 0.012), [x, 0.21, 0]);
    for (const sz of [-1, 1]) {
      b.add('siegeTimber', beam([x, 0.21, sz * 0.48], [x, 0.62, sz * 0.07], 0.1, 0.09, { bevel: 0.01, up: [0, 0, sz] }));
      b.add('iron', G.cylinder(0.012, 0.012, 0.18, 6), [x, 0.25, sz * 0.43], 0, 0, Math.PI / 2);
    }
    // pillow block: iron saddle bolted to the post top, open on top
    b.add('iron', bevelBlock(0.17, 0.05, 0.19, 0.006), [x, C.pivotY - 0.08, 0]);
    for (const sz of [-1, 1]) b.add('iron', bevelBlock(0.17, 0.11, 0.045, 0.006), [x, C.pivotY - 0.06, sz * 0.07]);
    for (const sz of [-1, 1]) rivets(b, 'iron', [[x - 0.06, C.pivotY - 0.0, sz * 0.095], [x + 0.06, C.pivotY - 0.0, sz * 0.095]], 0.01);
    // iron strap down each side of the post
    for (const sz of [-1, 1]) b.add('iron', bevelBlock(0.05, 0.4, 0.006, 0.002), [x, C.pivotY - 0.5, sz * 0.078]);
  }
  // tie beam between the sole beams at the back, under the fire basket's reach
  b.add('siegeTimber', beam([-C.postX, 0.21, -0.48], [C.postX, 0.21, -0.48], 0.12, 0.12, { ext: 0.06 }));

  // fire basket: ring grate on three legs over the hearth, charcoal and flames
  const fbY = 0.34;
  b.add('blackIron', ringBand(0.27, 0.03, 0.03, 32), [0, fbY - 0.03, 0]);
  b.add('blackIron', ringBand(0.22, 0.025, 0.025, 32), [0, fbY - 0.17, 0]);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    b.add('blackIron', G.rod([Math.cos(a) * 0.22, fbY - 0.17, Math.sin(a) * 0.22], [Math.cos(a) * 0.27, fbY, Math.sin(a) * 0.27], 0.009, 5));
  }
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.5;
    b.add('blackIron', G.rod([Math.cos(a) * 0.3, 0.07, Math.sin(a) * 0.3], [Math.cos(a) * 0.22, fbY - 0.15, Math.sin(a) * 0.22], 0.014, 6));
    b.add('blackIron', bevelBlock(0.05, 0.012, 0.05, 0.003), [Math.cos(a) * 0.3, 0.07, Math.sin(a) * 0.3]);
  }
  b.add('blackIron', G.cylinder(0.22, 0.22, 0.012, 24, { y0: fbY - 0.17 }));
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand()) * 0.19;
    b.add('ember', charcoalLump(0.035 + rand() * 0.02, i + 3), [Math.cos(a) * rr, fbY - 0.13 + rand() * 0.05 + (0.19 - rr) * 0.25, Math.sin(a) * rr], rand() * 6);
  }
  // flame tongues rising from the coals towards the cauldron belly (cores stay below its bottom)
  const tongues = [
    [0, 0, 0.21, 0.075, 0.0],
    [0.09, 0.04, 0.17, 0.055, 0.03],
    [-0.08, 0.06, 0.15, 0.05, -0.025],
    [0.02, -0.1, 0.16, 0.05, 0.02],
    [-0.1, -0.06, 0.13, 0.045, -0.03],
    [0.13, -0.05, 0.11, 0.04, 0.035],
  ];
  for (const [x, z, h, r, bend] of tongues) {
    const y = fbY - 0.1;
    if (h > 0.14) b.add('flameCore', flameTongue(h * 0.5, r * 0.75, bend * 0.5), [x, y, z]);
    b.add('flame', flameTongue(h, r, bend), [x, y - 0.01, z]);
  }

  // cauldron: hammered iron body, reinforcing hoop, pour lip at the front (+Z), trunnions on both sides
  b.add('blackIron', cauldronGeom(), [0, C.bottomY, 0]);
  b.add('blackIron', ringBand(0.36, 0.022, 0.05, 36), [0, C.rimY - 0.2, 0]);
  rivets(b, 'iron', Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return [Math.cos(a) * 0.372, C.rimY - 0.175, Math.sin(a) * 0.372];
  }), 0.009);
  // pour lip: a short open trough curving out of the rim
  const lip = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const a = Math.PI * (0.15 + 0.7 * t);
    lip.push([Math.cos(a) * 0.085, 0, Math.sin(a) * 0.085 * 0.6]);
  }
  for (let i = 0; i < lip.length - 1; i++) {
    const p0 = lip[i];
    const p1 = lip[i + 1];
    b.add('blackIron', beam([p0[0], C.rimY - 0.035 - p0[2] * 0.4, 0.33 + p0[2]], [p1[0], C.rimY - 0.035 - p1[2] * 0.4, 0.33 + p1[2]], 0.012, 0.03, { up: [0, 0, 1], bevel: 0.003, ext: 0.004 }));
  }
  // hot pitch surface with a few bubbles and a skin wrinkle
  b.add('pitch', G.cylinder(0.338, 0.338, 0.01, 36, { y0: C.rimY - 0.1 }));
  for (let i = 0; i < 6; i++) {
    const a = rand() * Math.PI * 2;
    const rr = rand() * 0.27;
    const s = new THREE.SphereGeometry(0.012 + rand() * 0.018, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    b.add('pitch', G.boxUV(s), [Math.cos(a) * rr, C.rimY - 0.091, Math.sin(a) * rr]);
  }
  // trunnion bosses, pins and a riveted strap plate on each side
  for (const sx of [-1, 1]) {
    b.add('blackIron', bevelBox(0.03, 0.2, 0.16, 0.006), [sx * 0.37, C.pivotY, 0]);
    rivets(b, 'iron', [[sx * 0.388, C.pivotY + 0.07, 0.05], [sx * 0.388, C.pivotY + 0.07, -0.05], [sx * 0.388, C.pivotY - 0.07, 0.05], [sx * 0.388, C.pivotY - 0.07, -0.05]], 0.009);
    b.add('iron', G.cylinder(0.035, 0.035, C.postX - 0.36 + 0.09, 14), [sx * 0.375, C.pivotY, 0], 0, 0, -sx * Math.PI / 2);
    b.add('iron', G.cylinder(0.05, 0.05, 0.03, 14), [sx * (C.postX + 0.085), C.pivotY, 0], 0, 0, -sx * Math.PI / 2); // retaining collar
  }
  // tipping lever: an iron bar welded to the right trunnion, rising backwards to a wooden handle
  const hub = [C.postX + 0.115, C.pivotY, 0];
  b.add('iron', G.cylinder(0.055, 0.055, 0.05, 14), hub, 0, 0, -Math.PI / 2);
  const tip = [C.postX + 0.115, C.pivotY + 0.62, -0.62];
  b.add('iron', beam(hub, tip, 0.05, 0.025, { up: [1, 0, 0], bevel: 0.004 }));
  b.add('oak', G.cylinder(0.028, 0.03, 0.32, 10), tip, 0, -Math.PI / 4);
  b.add('iron', G.cylinder(0.032, 0.032, 0.03, 10), tip, 0, -Math.PI / 4);
  // safety chain from the lever to a ring on the post, so the cauldron cannot tip by itself
  const chainA = [C.postX + 0.115, C.pivotY + 0.3, -0.3];
  const chainB = [C.postX + 0.08, 0.62, -0.05];
  const span = Math.hypot(chainB[0] - chainA[0], chainB[1] - chainA[1], chainB[2] - chainA[2]);
  const links = Math.ceil(span / 0.042);
  const sagAt = (t) => 0.05 * 4 * t * (1 - t);
  const at = (t) => [chainA[0] + (chainB[0] - chainA[0]) * t, chainA[1] + (chainB[1] - chainA[1]) * t - sagAt(t), chainA[2] + (chainB[2] - chainA[2]) * t];
  for (let i = 0; i < links; i++) {
    // oval links along the local chain direction, every other one turned 90 degrees so they interlock
    const p0 = at(i / links);
    const p1 = at((i + 1) / links);
    const dir = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]).normalize();
    const link = new THREE.TorusGeometry(0.018, 0.0055, 5, 10);
    link.scale(1, 1.45, 1);
    if (i % 2) link.rotateY(Math.PI / 2);
    link.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
    b.add('iron', G.boxUV(link), [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2]);
  }
  b.add('iron', new THREE.TorusGeometry(0.03, 0.007, 6, 12), [C.postX + 0.08, 0.6, -0.05], Math.PI / 2);

  // long-handled iron ladle hooked over the left post's knee brace, and a pitch-stained bucket
  b.push([-C.postX - 0.09, 0, 0.38]);
  b.add('iron', tube([[0, 0.62, -0.03], [0, 0.66, 0.0], [0, 0.6, 0.025], [0, 0.2, 0.06]], 0.009, 16, 6));
  b.add('blackIron', lathe([[0, 0], [0.05, 0.004], [0.075, 0.03], [0.08, 0.07], [0.074, 0.07], [0.068, 0.034], [0.046, 0.012], [0, 0.008]], 16), [0, 0.12, 0.08]);
  b.pop();
  b.push([-0.88, 0, 0.62]);
  b.add('barrel', lathe([[0, 0], [0.13, 0], [0.14, 0.02], [0.155, 0.26], [0.147, 0.26], [0.133, 0.03], [0, 0.03]], 20));
  for (const y of [0.04, 0.22]) b.add('iron', ringBand(0.137 + y * 0.06, 0.008, 0.025, 20), [0, y, 0]);
  b.add('pitch', G.cylinder(0.142, 0.142, 0.006, 20, { y0: 0.2 }));
  b.add('rope', tube([[-0.15, 0.25, 0], [-0.12, 0.38, 0], [0, 0.43, 0], [0.12, 0.38, 0], [0.15, 0.25, 0]], 0.009, 14, 6));
  b.pop();
}

export const siegeDefenceModules = [
  {
    id: 'logs_rolling',
    name: 'Rolling logs store',
    category: 'siege-defence',
    description: 'Six 2.4 m pine logs stacked 3-2-1 on chocked sole beams, two of them studded with iron spikes, plus a loose log and an iron-shod pry bar for levering them over the parapet.',
    build(M) {
      const b = armsBuilder(M, LOCAL);
      logsRolling(b);
      return b.build('logs_rolling');
    },
  },
  {
    id: 'rocks_drop_pile',
    name: 'Drop stones bin',
    category: 'siege-defence',
    description: 'Iron-strapped plank bin (1.5 x 0.8 m) heaped with rough drop stones, with four dressed 0.34 m stone shot and two loose boulders beside it.',
    build(M) {
      const b = armsBuilder(M, LOCAL);
      rocksDropPile(b);
      return b.build('rocks_drop_pile');
    },
  },
  {
    id: 'oil_cauldron',
    name: 'Tipping pitch cauldron',
    category: 'siege-defence',
    description: '0.75 m iron cauldron of hot pitch hung on trunnions in a timber gallows over a charcoal fire basket, with a chained tipping lever, pour lip, ladle and pitch bucket.',
    build(M) {
      const b = armsBuilder(M, LOCAL);
      oilCauldron(b);
      return b.build('oil_cauldron');
    },
  },
];
