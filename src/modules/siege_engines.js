// Siege engines (stage 5): a 13th-century counterweight trebuchet and a wheeled field ballista.
// Reference dimensions (metres, 1 unit = 1 m):
//  trebuchet: pivot axle 5.8 m high, arm 9.5 m (short end 1.75 m, long end 7.75 m, ratio 4.4:1) tapering from 0.52 m deep
//   at the axle to 0.23 m at the tip, A-frame trestles 5.4 m wide at the foot on 3.5 m + 3.5 m sole beams, hinged counterweight
//   box 1.3 x 0.95 x 1.55 m (about 2 m3 of stone), round stone shot 0.4 m. Cocked pose: arm at 41.6 degrees, long tip 0.65 m
//   above the ground, counterweight box hanging plumb from the short end (0.13 m clear of the front legs).
//  ballista: about 2.6 m long, 2.0 m wide, bolt 1.1 m, skeins 0.32 m tall, arms 0.69 m, wheels 0.95 m diameter.
// Throwing / firing direction is +Z. Both engines are shifted in Z so the bounding box is centred on x = z = 0.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { bevelBox, bevelBlock, rivets, ringBand, lathe } from '../lib/kit.js';
import { armsBuilder, beam, ropeSpan, lashing, boulder, makeRand, tube } from '../lib/armsKit.js';

const TAU = Math.PI * 2;

/** Beam in the YZ plane: wx wide along X, t thick inside the plane. */
function tbeam(a, c, wx, t, bevel = 0.012, ext = 0) {
  return beam(a, c, wx, t, { up: [1, 0, 0], bevel, ext });
}

/** Cylinder along X, centred on pos. */
function xcyl(b, mat, r, len, pos, segs = 12) {
  b.add(mat, G.cylinder(r, r, len, segs, { y0: -len / 2 }), pos, 0, 0, Math.PI / 2);
}

/** Rectangular beam with chamfered corners along local Z through stations [z, width(x), height(y)]. */
function taperBeam(st, chamfer = 0.012) {
  const ring = ([z, w, h]) => {
    const hw = w / 2;
    const hh = h / 2;
    const c = Math.min(chamfer, hw * 0.5, hh * 0.5);
    return [[hw - c, hh], [hw, hh - c], [hw, -hh + c], [hw - c, -hh], [-hw + c, -hh], [-hw, -hh + c], [-hw, hh - c], [-hw + c, hh]].map(([x, y]) => [x, y, z]);
  };
  const rings = st.map(ring);
  const v = [];
  const tri = (a, b, c) => v.push(...a, ...b, ...c);
  for (let i = 0; i < rings.length - 1; i++) {
    for (let k = 0; k < 8; k++) {
      const n = (k + 1) % 8;
      const a = rings[i][k];
      const bb = rings[i][n];
      const c = rings[i + 1][n];
      const d = rings[i + 1][k];
      tri(a, c, bb);
      tri(a, d, c);
    }
  }
  const L = rings[rings.length - 1];
  for (let k = 1; k < 7; k++) {
    tri(rings[0][0], rings[0][k], rings[0][k + 1]);
    tri(L[0], L[k + 1], L[k]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return G.boxUV(g);
}

/** Rectangular iron band (hole w x h, wall t, length len) along local Z, centred on the origin. */
function rectBand(w, h, t, len) {
  const s = new THREE.Shape();
  const ow = w / 2 + t;
  const oh = h / 2 + t;
  s.moveTo(-ow, -oh);
  s.lineTo(ow, -oh);
  s.lineTo(ow, oh);
  s.lineTo(-ow, oh);
  s.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-w / 2, -h / 2);
  hole.lineTo(-w / 2, h / 2);
  hole.lineTo(w / 2, h / 2);
  hole.lineTo(w / 2, -h / 2);
  hole.closePath();
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
  g.translate(0, 0, -len / 2);
  return G.boxUV(g);
}

/** Helical rope lashing around a w x h rectangular section, running along local Z from z0 to z1. */
function rectLash(w, h, z0, z1, turns = 4, r = 0.013) {
  const hw = w / 2 + r * 0.7;
  const hh = h / 2 + r * 0.7;
  const per = 4 * (hw + hh);
  const perim = (s) => {
    if (s < 2 * hh) return [hw, -hh + s];
    s -= 2 * hh;
    if (s < 2 * hw) return [hw - s, hh];
    s -= 2 * hw;
    if (s < 2 * hh) return [-hw, hh - s];
    s -= 2 * hh;
    return [-hw + s, -hh];
  };
  const pts = [];
  const n = Math.round(turns * 18);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [x, y] = perim(((t * turns) % 1) * per);
    pts.push([x, y, z0 + (z1 - z0) * t]);
  }
  return tube(pts, r, n, 5);
}

/** Wheel in the YZ plane (axis X) centred on (cx, cy, cz); outer radius R (+0.015 with the iron tire). */
function spokedWheel(b, cx, cy, cz, R, { spokes = 8, rimT = 0.07, width = 0.1, hubR = 0.08, tire = false, spokeR = 0.022 } = {}) {
  const rim = ringBand(R - rimT / 2, rimT, width, 28);
  rim.translate(0, -width / 2, 0);
  b.add('siegeTimber', rim, [cx, cy, cz], 0, 0, Math.PI / 2);
  if (tire) {
    const t = ringBand(R + 0.0075, 0.015, width + 0.016, 28);
    t.translate(0, -(width + 0.016) / 2, 0);
    b.add('iron', t, [cx, cy, cz], 0, 0, Math.PI / 2);
  }
  xcyl(b, 'darkWood', hubR, width * 2, [cx, cy, cz], 12);
  for (const s of [-1, 1]) xcyl(b, 'iron', hubR * 1.15, 0.02, [cx + s * width * 0.9, cy, cz], 12);
  for (let k = 0; k < spokes; k++) {
    const a = (k / spokes) * TAU;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    b.add('oak', G.rod([cx, cy + ca * hubR * 0.7, cz + sa * hubR * 0.7], [cx, cy + ca * (R - rimT + 0.03), cz + sa * (R - rimT + 0.03)], spokeR, 6));
  }
}

/** Toothed ratchet disc with its axis along X (thickness thick, centred on the origin). */
function ratchetWheel(rIn, rOut, teeth, thick) {
  const s = new THREE.Shape();
  const d = TAU / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * d;
    const x0 = Math.cos(a) * rIn;
    const y0 = Math.sin(a) * rIn;
    if (i === 0) s.moveTo(x0, y0);
    else s.lineTo(x0, y0);
    s.lineTo(Math.cos(a + 0.12 * d) * rOut, Math.sin(a + 0.12 * d) * rOut);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false });
  g.translate(0, 0, -thick / 2);
  g.rotateY(Math.PI / 2);
  return G.boxUV(g);
}

// ---------------------------------------------------------------------------------------------------------------
// Trebuchet
// ---------------------------------------------------------------------------------------------------------------

const PIV_Y = 5.8; // axle height
const SHORT = 1.75;
const LONG = 7.75;
const TIP_Y = 0.65; // height of the cocked long tip
const SINA = (PIV_Y - TIP_Y) / LONG;
const THETA = Math.asin(SINA);
const COSA = Math.cos(THETA);
const SHIFT_T = 2.84;
/** World position of a point given in the arm frame (x across, y up from the arm axis, z along the arm, short end +). */
const wp = (x, y, z) => [x, PIV_Y + y * COSA + z * SINA, -y * SINA + z * COSA];

const TX = 1.1; // trestle centre x
const FOOT_Z = 2.7;
const FOOT_Y = 0.2;
const TOP_Y = 6.0;
const TOP_Z = 0.12;
/** Z of the axis of the front (+Z foot) leg at height y. */
const legZ = (y) => FOOT_Z - ((FOOT_Z + TOP_Z) * (y - FOOT_Y)) / (TOP_Y - FOOT_Y);

const ARM_ST = [[-LONG, 0.22, 0.23], [-5, 0.31, 0.33], [-2.5, 0.4, 0.43], [0, 0.46, 0.52], [SHORT, 0.36, 0.38]];
function armSec(z) {
  for (let i = 0; i < ARM_ST.length - 1; i++) {
    const [z0, w0, h0] = ARM_ST[i];
    const [z1, w1, h1] = ARM_ST[i + 1];
    if (z <= z1) {
      const t = (z - z0) / (z1 - z0);
      return [w0 + (w1 - w0) * t, h0 + (h1 - h0) * t];
    }
  }
  return [ARM_ST[4][1], ARM_ST[4][2]];
}

const PIN = wp(0, 0, 1.55); // counterweight hinge pin
const EYE_Z = -7.4; // arm-frame z of the underside eye plate
const EYE_A = wp(0, -(armSec(EYE_Z)[1] / 2 + 0.03), EYE_Z); // attachment point of the hook ring
const WZ = -8.35; // windlass z

function trestle(b, sx) {
  const X = sx * TX;
  b.add('siegeTimber', tbeam([X, 0.15, -3.45], [X, 0.15, 3.45], 0.52, 0.3, 0.015));
  for (const s of [-1, 1]) b.add('endGrain', bevelBox(0.52, 0.3, 0.012, 0.004), [X, 0.15, s * 3.456]);
  // legs cross at the apex (halving joint under the iron straps)
  for (const s of [-1, 1]) {
    b.add('siegeTimber', tbeam([X, FOOT_Y, s * FOOT_Z], [X, TOP_Y, -s * TOP_Z], s > 0 ? 0.26 : 0.25, 0.26, 0.012));
  }
  for (const o of [-1, 1]) {
    const x = X + o * 0.139;
    b.add('iron', bevelBox(0.018, 0.5, 0.56, 0.004), [x, PIV_Y, 0]);
    const pts = [];
    for (const y of [5.6, 5.8, 6.0]) for (const z of [-0.2, 0.2]) pts.push([x + o * 0.009, y, z]);
    rivets(b, 'steel', pts, 0.012);
  }
  // collar beam between the legs and two diagonal struts down to the sole
  const zc = legZ(3.2);
  b.add('siegeTimber', tbeam([X, 3.2, -zc], [X, 3.2, zc], 0.2, 0.2, 0.01));
  for (const s of [-1, 1]) b.add('siegeTimber', tbeam([X, 3.2, 0], [X, 0.33, s * 1.75], 0.16, 0.16, 0.01, 0.02));
  // wedged pegs through the leg joints
  for (const s of [-1, 1]) {
    for (const y of [1.0, 3.2]) {
      b.add('darkWood', G.cylinder(0.02, 0.02, 0.07, 8, { y0: -0.035 }), [X + sx * 0.13, y, s * legZ(y)], 0, 0, Math.PI / 2);
    }
  }
}

function frame(b) {
  trestle(b, -1);
  trestle(b, 1);
  // cross ties between the trestles, pegged into the leg faces
  for (const y of [1.0, 3.2]) {
    for (const s of [-1, 1]) b.add('siegeTimber', beam([-0.94, y, s * legZ(y)], [0.94, y, s * legZ(y)], 0.22, 0.2, { bevel: 0.01 }));
  }
  // axle with collars and end caps
  xcyl(b, 'iron', 0.065, 3.1, [0, PIV_Y, 0], 12);
  for (const s of [-1, 1]) {
    xcyl(b, 'iron', 0.095, 0.05, [s * (TX + 0.2), PIV_Y, 0], 12);
    xcyl(b, 'iron', 0.095, 0.05, [s * 0.33, PIV_Y, 0], 12);
    xcyl(b, 'iron', 0.09, 0.04, [s * 1.57, PIV_Y, 0], 12);
  }
}

function arm(b) {
  b.push([0, PIV_Y, 0], 0, -THETA);
  b.add('siegeTimber', taperBeam(ARM_ST));
  for (const [z, dir] of [[-LONG, -1], [SHORT, 1]]) {
    const [w, h] = armSec(z);
    b.add('endGrain', bevelBox(w, h, 0.01, 0.004), [0, 0, z + dir * 0.005]);
  }
  for (const z of [1.55, 0.95, 0.4, -0.4, -0.95, -2.2, -3.6, -5.0, -6.4, -7.62]) {
    const [w0, h0] = armSec(z - 0.06);
    const [w1, h1] = armSec(z + 0.06);
    const w = Math.min(w0, w1) - 0.004;
    const h = Math.min(h0, h1) - 0.004;
    b.add('iron', rectBand(w, h, 0.014, 0.12), [0, 0, z]);
    const rx = w / 2 + 0.014;
    rivets(b, 'steel', [[rx, 0.05, z + 0.03], [rx, -0.05, z - 0.03], [-rx, 0.05, z - 0.03], [-rx, -0.05, z + 0.03]], 0.008);
  }
  for (const z of [-1.55, -2.9, -4.3, -5.7, -7.0]) {
    const [w, h] = armSec(z);
    b.add('rope', rectLash(w, h, z - 0.08, z + 0.08, 4, 0.013));
  }
  // eye plate on the underside for the cocking hook ring
  const eh = armSec(EYE_Z)[1];
  b.add('iron', bevelBox(0.07, 0.03, 0.14, 0.005), [0, -(eh / 2 + 0.015), EYE_Z]);
  rivets(b, 'steel', [[0.025, -(eh / 2 + 0.03), EYE_Z + 0.05], [-0.025, -(eh / 2 + 0.03), EYE_Z - 0.05]], 0.008);
  b.pop();
  // eye bolt and ring at the very tip for the sling cords
  b.add('iron', G.rod(wp(0, 0, -LONG + 0.03), wp(0, 0, -LONG - 0.05), 0.012, 8));
  const ring = new THREE.TorusGeometry(0.035, 0.009, 6, 14);
  ring.rotateY(Math.PI / 2);
  b.add('iron', G.boxUV(ring), wp(0, 0, -LONG - 0.08));
}

function counterweight(b) {
  const zc = PIN[2];
  const W = 1.3;
  const D = 0.95;
  const H = 1.55;
  const yb = 4.95;
  const rimY = yb + H;
  b.add('siegeTimber', bevelBlock(W, 0.08, D, 0.006), [0, yb, zc]);
  for (let i = 0; i < 10; i++) {
    const x = -0.585 + i * 0.13;
    for (const s of [-1, 1]) b.add('siegeTimber', bevelBlock(0.128, H - 0.08, 0.07, 0.005), [x, yb + 0.08, zc + s * (D / 2 - 0.035)]);
  }
  for (let i = 0; i < 6; i++) {
    const z = zc - 0.3375 + i * 0.135;
    for (const s of [-1, 1]) b.add('siegeTimber', bevelBlock(0.07, H - 0.08, 0.133, 0.005), [s * (W / 2 - 0.035), yb + 0.08, z]);
  }
  for (const dy of [0.3, 0.8, 1.3]) b.add('iron', rectBand(W - 0.004, D - 0.004, 0.012, 0.1), [0, yb + dy, zc], 0, -Math.PI / 2);
  b.add('iron', rectBand(W - 0.004, D - 0.004, 0.02, 0.06), [0, rimY - 0.03, zc], 0, -Math.PI / 2);
  // hanger straps up to the hinge pin
  const yTop = PIN[1] + 0.05;
  for (const s of [-1, 1]) {
    const x = s * 0.67;
    b.add('iron', bevelBox(0.016, yTop - (yb + 0.1), 0.08, 0.004), [x, (yTop + yb + 0.1) / 2, zc]);
    rivets(b, 'steel', [[x + s * 0.008, yb + 0.35, zc + 0.02], [x + s * 0.008, yb + 0.85, zc - 0.02], [x + s * 0.008, yb + 1.3, zc + 0.02]], 0.01);
    xcyl(b, 'iron', 0.07, 0.05, [x, PIN[1], zc], 14);
    xcyl(b, 'iron', 0.065, 0.03, [s * 0.745, PIN[1], zc], 14);
  }
  xcyl(b, 'iron', 0.045, 1.48, [0, PIN[1], zc], 12);
  // stone ballast showing above the rim
  b.add('boulder', bevelBlock(1.16, 0.1, 0.81, 0.01), [0, rimY - 0.2, zc]);
  const rand = makeRand(11);
  for (let i = 0; i < 15; i++) {
    const gx = (i % 5) - 2;
    const gz = Math.floor(i / 5) - 1;
    const r = 0.13 + rand() * 0.06;
    const x = gx * 0.2 + (rand() - 0.5) * 0.06;
    const z = zc + gz * 0.24 + (rand() - 0.5) * 0.06;
    b.add('boulder', boulder(r, 20 + i, { detail: 1, rough: 0.3, squash: 0.8 }), [x, rimY - 0.09 + r * 0.6, z], rand() * TAU);
  }
}

function trigger(b) {
  const z = EYE_A[2];
  b.add('siegeTimber', bevelBlock(1.3, 0.2, 0.34, 0.012), [0, 0, z]);
  for (const s of [-1, 1]) {
    b.add('iron', bevelBox(0.3, 0.012, 0.36, 0.004), [s * 0.45, 0.206, z]);
    rivets(b, 'steel', [[s * 0.35, 0.214, z + 0.12], [s * 0.35, 0.214, z - 0.12], [s * 0.55, 0.214, z + 0.12], [s * 0.55, 0.214, z - 0.12]], 0.01);
  }
  // ring hanging from the arm and the pelican hook that holds it
  const ringY = EYE_A[1] - 0.04;
  const ring = new THREE.TorusGeometry(0.035, 0.009, 6, 14);
  ring.rotateY(Math.PI / 2);
  b.add('iron', G.boxUV(ring), [0, ringY, z]);
  b.add('iron', bevelBox(0.14, 0.02, 0.14, 0.004), [0.07, 0.21, z]);
  b.add('iron', G.rod([0.07, 0.2, z], [0.07, ringY, z], 0.016, 8));
  b.add('iron', G.rod([0.075, ringY, z], [-0.045, ringY, z], 0.012, 8));
  // release lever hinged on the hook post
  b.add('iron', G.rod([0.07, 0.33, z], [0.07, 0.56, z - 0.7], 0.015, 6));
  b.add('iron', new THREE.SphereGeometry(0.03, 8, 6), [0.07, 0.56, z - 0.7]);
}

function sling(b) {
  const zt = -3.05;
  b.add('siegeTimber', bevelBlock(0.68, 0.05, 4.4, 0.006), [0, 0, zt]);
  for (const s of [-1, 1]) b.add('siegeTimber', bevelBlock(0.06, 0.13, 4.4, 0.006), [s * 0.31, 0, zt]);
  for (let i = 0; i < 6; i++) b.add('siegeTimber', bevelBlock(0.7, 0.04, 0.08, 0.005), [0, 0.05, zt - 2.0 + i * 0.8]);
  // leather pouch cradling the stone shot
  const pz = -1.8;
  b.add('leather', lathe([[0, 0], [0.12, 0.004], [0.21, 0.05], [0.262, 0.12], [0.272, 0.13], [0.252, 0.125], [0.2, 0.06], [0.11, 0.014], [0, 0.01]], 20), [0, 0.05, pz]);
  b.add('boulder', boulder(0.2, 3, { detail: 2, rough: 0.16, squash: 0.92 }), [0, 0.272, pz]);
  // two cords from the arm-tip ring to the pouch
  const s0 = wp(0, 0, -LONG - 0.115);
  for (const s of [-1, 1]) b.add('rope', ropeSpan(s0, [s * 0.12, 0.1, pz - 0.25], 0.011, 0.03, 16));
}

function windlass(b) {
  const z = WZ;
  for (const sx of [-1, 1]) {
    const x = sx * 0.85;
    b.add('siegeTimber', tbeam([x, 0.1, z - 0.85], [x, 0.1, z + 0.85], 0.24, 0.2, 0.012));
    b.add('siegeTimber', tbeam([x, 0.18, z], [x, 1.32, z], 0.2, 0.2, 0.012));
    for (const s of [-1, 1]) b.add('siegeTimber', tbeam([x, 0.24, z + s * 0.72], [x, 0.86, z + s * 0.08], 0.14, 0.13, 0.01, 0.02));
    for (const o of [-1, 1]) b.add('iron', bevelBox(0.016, 0.22, 0.24, 0.004), [x + o * 0.108, 0.95, z]);
  }
  xcyl(b, 'siegeTimber', 0.16, 1.3, [0, 0.95, z], 14);
  for (const s of [-1, 1]) xcyl(b, 'iron', 0.2, 0.03, [s * 0.6, 0.95, z], 16);
  xcyl(b, 'iron', 0.04, 2.7, [0, 0.95, z], 10);
  b.add('rope', lashing(0.16, -0.5, -0.1, 5, 0.022), [0, 0.95, z], 0, 0, Math.PI / 2);
  // spoked drive wheel on the left, ratchet wheel and pawl on the right
  spokedWheel(b, -1.12, 0.95, z, 0.62, { spokes: 8, rimT: 0.06, width: 0.07, hubR: 0.07, spokeR: 0.025 });
  xcyl(b, 'darkWood', 0.07, 0.1, [-1.0, 0.95, z], 12);
  xcyl(b, 'darkWood', 0.06, 0.1, [1.0, 0.95, z], 12);
  b.add('iron', ratchetWheel(0.17, 0.2, 14, 0.04), [1.07, 0.95, z]);
  xcyl(b, 'iron', 0.015, 0.2, [1.05, 1.24, z - 0.08], 8);
  b.add('iron', G.rod([1.07, 1.24, z - 0.08], [1.07, 1.128, z + 0.1], 0.014, 6));
  // slack winding rope from the hook ring to the drum
  b.add('rope', ropeSpan([0, EYE_A[1] - 0.04, EYE_A[2] - 0.04], [0.1, 1.0, z + 0.19], 0.02, 0.12, 24));
}

/** Places the cocked counterweight trebuchet, throwing towards +Z. Origin: ground below the pivot axle at x = z = 0. */
export function addTrebuchet(b) {
  frame(b);
  arm(b);
  counterweight(b);
  trigger(b);
  sling(b);
  windlass(b);
}

// ---------------------------------------------------------------------------------------------------------------
// Ballista
// ---------------------------------------------------------------------------------------------------------------

const BY = 1.4; // height of arms, string and bolt axis
const SHIFT_B = 0.45;

/** Plate in the XZ plane with a round hole, from y0 to y0 + t. */
function holePlate(x0, x1, z0, z1, hx, hz, hr, y0, t) {
  const s = new THREE.Shape();
  s.moveTo(x0, -z0);
  s.lineTo(x1, -z0);
  s.lineTo(x1, -z1);
  s.lineTo(x0, -z1);
  s.closePath();
  const h = new THREE.Path();
  h.absarc(hx, -hz, hr, 0, TAU, true);
  s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 16 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return G.boxUV(g);
}

/** Twisted rope skein: waisted cylinder with spiral ridges, axis along Y, from y0 to y1. */
function skeinGeom(y0, y1) {
  const g = new THREE.CylinderGeometry(0.1, 0.1, y1 - y0, 18, 22);
  g.translate(0, (y0 + y1) / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const waist = 1 - 0.1 * Math.sin(((y - y0) / (y1 - y0)) * Math.PI);
    const k = waist * (1 + 0.05 * Math.sin(a * 6 + y * 42));
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  g.computeVertexNormals();
  return G.cylUV(g, 0.1);
}

function ballistaBody(b) {
  // stock, slider and saddle
  b.add('siegeTimber', bevelBlock(0.28, 0.16, 1.7, 0.012), [0, 1.12, 0.05]);
  b.add('siegeTimber', bevelBlock(0.15, 0.109, 0.98, 0.008), [0, 1.28, -0.09]);
  b.add('iron', bevelBlock(0.1, 0.05, 0.06, 0.006), [0, 1.12, 0.9]);
  b.add('darkWood', bevelBlock(0.24, 0.04, 1.0, 0.006), [0, 1.08, 0.12]);
  for (const z of [-0.25, 0.48]) b.add('iron', rectBand(0.276, 0.196, 0.012, 0.05), [0, 1.18, z]);
  // cross beam carrying the two spring frames
  b.add('siegeTimber', bevelBlock(2.0, 0.14, 0.34, 0.012), [0, 1.02, 0.5]);
  for (const sx of [-1, 1]) {
    const hx = sx * 0.61;
    const x0 = Math.min(sx * 0.2, sx * 1.0);
    const x1 = Math.max(sx * 0.2, sx * 1.0);
    b.add('siegeTimber', holePlate(x0, x1, 0.3, 0.7, hx, 0.5, 0.118, 1.16, 0.07));
    b.add('siegeTimber', holePlate(x0, x1, 0.3, 0.7, hx, 0.5, 0.118, 1.55, 0.07));
    for (const px of [0.3, 0.92]) b.add('siegeTimber', bevelBlock(0.11, 0.32, 0.11, 0.008), [sx * px, 1.23, 0.5]);
    // rope skein through iron washers, tension lever across the top
    b.add('rope', skeinGeom(1.17, 1.65), [hx, 0, 0.5]);
    b.add('iron', ringBand(0.13, 0.05, 0.02, 20), [hx, 1.23, 0.5]);
    b.add('iron', ringBand(0.13, 0.05, 0.02, 20), [hx, 1.53, 0.5]);
    b.add('iron', G.cylinder(0.125, 0.125, 0.02, 18, { y0: 1.65 }), [hx, 0, 0.5]);
    b.add('iron', bevelBox(0.52, 0.035, 0.045, 0.006), [hx, 1.685, 0.5], sx * 0.55);
    const rv = [];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU;
      rv.push([hx + Math.cos(a) * 0.17, 1.62, 0.5 + Math.sin(a) * 0.17]);
    }
    rivets(b, 'steel', rv, 0.01);
    // arm through the skein, pulled back to the string
    const dx = -sx * 0.47;
    const dz = -0.5;
    const len = Math.hypot(dx, dz);
    const rot = Math.atan2(dx, dz);
    b.add('darkWood', taperBeam([[-0.1, 0.1, 0.07], [len, 0.045, 0.04]], 0.01), [hx, BY, 0.5], rot);
    b.add('iron', bevelBox(0.05, 0.055, 0.07, 0.006), [sx * 0.14, BY, 0.0], rot);
    b.add('iron', rectBand(0.09, 0.06, 0.01, 0.04), [hx, BY, 0.5], rot);
  }
}

function ballistaFiring(b) {
  // claw and trigger on the slider, bowstring drawn back to the claw
  const cz = -0.37;
  for (const s of [-1, 1]) b.add('iron', bevelBox(0.012, 0.055, 0.07, 0.003), [s * 0.024, 1.389 + 0.0265, cz - 0.035]);
  b.add('iron', bevelBox(0.06, 0.04, 0.05, 0.005), [0, 1.389 + 0.02, cz - 0.08]);
  b.add('iron', G.rod([0.03, 1.41, cz - 0.1], [0.1, 1.3, cz - 0.36], 0.012, 6));
  const claw = [0, BY, cz];
  for (const s of [-1, 1]) b.add('string', ropeSpan([s * 0.14, BY, 0.0], claw, 0.006, 0, 6));
  // loaded bolt with iron head and three vanes
  b.add('oak', G.rod([0, BY, cz], [0, BY, 0.74], 0.0115, 8));
  b.add('steel', G.cylinder(0.002, 0.02, 0.1, 4, { y0: 0 }), [0, BY, 0.74], 0, Math.PI / 2);
  b.push([0, BY, -0.26]);
  for (let k = 0; k < 3; k++) {
    const vane = G.box(0.003, 0.034, 0.16);
    vane.translate(0, 0.026, 0);
    b.add('feather', vane, [0, 0, 0], 0, 0, (k * TAU) / 3);
  }
  b.pop();
}

function ballistaWinch(b) {
  const z = -0.96;
  const y = 1.23;
  for (const s of [-1, 1]) b.add('darkWood', bevelBlock(0.05, 0.33, 0.52, 0.006), [s * 0.165, 1.1, -0.86]);
  xcyl(b, 'darkWood', 0.07, 0.28, [0, y, z], 12);
  xcyl(b, 'iron', 0.022, 0.6, [0, y, z], 8);
  b.add('rope', lashing(0.07, -0.09, 0.09, 3, 0.012), [0, y, z], 0, 0, Math.PI / 2);
  b.add('rope', ropeSpan([0, 1.318, -0.93], [0, 1.31, -0.6], 0.011, 0.01, 8));
  b.add('iron', bevelBox(0.06, 0.04, 0.05, 0.006), [0, 1.3, -0.605]);
  // ratchet wheel and pawl on the left, handspikes on the right
  b.add('iron', ratchetWheel(0.085, 0.105, 12, 0.03), [-0.205, y, z]);
  xcyl(b, 'iron', 0.012, 0.08, [-0.23, 1.4, -1.05], 8);
  b.add('iron', G.rod([-0.205, 1.4, -1.05], [-0.205, 1.325, -0.97], 0.012, 6));
  xcyl(b, 'darkWood', 0.045, 0.1, [0.24, y, z], 10);
  for (let k = 0; k < 4; k++) {
    const a = (k * TAU) / 4 + 0.4;
    b.add('darkWood', G.rod([0.24, y + Math.cos(a) * 0.03, z + Math.sin(a) * 0.03], [0.24, y + Math.cos(a) * 0.24, z + Math.sin(a) * 0.24], 0.014, 6));
  }
}

function ballistaCarriage(b) {
  const AZ = 0.12;
  b.add('darkWood', beam([-0.98, 0.475, AZ], [0.98, 0.475, AZ], 0.1, 0.1, { bevel: 0.01 }));
  b.add('darkWood', bevelBlock(0.42, 0.1, 0.26, 0.01), [0, 0.525, AZ]);
  b.add('darkWood', bevelBlock(0.16, 0.14, 1.17, 0.012), [0, 0.625, 0.135]);
  b.add('darkWood', beam([0, 0.695, -0.45], [0, 0.2, -1.55], 0.14, 0.16, { bevel: 0.012, ext: 0.03 }));
  b.add('iron', bevelBlock(0.2, 0.125, 0.5, 0.01), [0, 0, -1.48]);
  for (const s of [-1, 1]) {
    b.add('iron', bevelBox(0.012, 0.2, 0.34, 0.004), [s * 0.086, 0.695, -0.45]);
    xcyl(b, 'iron', 0.04, 0.02, [s * 0.99, 0.475, AZ], 10);
    spokedWheel(b, s * 0.84, 0.475, AZ, 0.46, { spokes: 8, rimT: 0.075, width: 0.11, hubR: 0.08, tire: true });
  }
  // pivot post and turntable under the stock
  b.add('darkWood', G.cylinder(0.1, 0.11, 0.255, 12, { y0: 0.765 }), [0, 0, AZ]);
  b.add('siegeTimber', G.cylinder(0.3, 0.3, 0.06, 24, { y0: 1.02 }), [0, 0, AZ]);
  b.add('iron', ringBand(0.305, 0.02, 0.065, 24), [0, 1.02, AZ]);
  b.add('iron', G.cylinder(0.11, 0.11, 0.02, 12, { y0: 0.765 }), [0, 0, AZ]);
}

/** Places the wheeled field ballista aiming towards +Z. Origin: ground at the centre of the axle (x = 0, z = 0). */
export function addBallista(b) {
  ballistaCarriage(b);
  ballistaBody(b);
  ballistaFiring(b);
  ballistaWinch(b);
}

export const siegeEngineModules = [
  {
    id: 'trebuchet',
    name: 'Counterweight trebuchet',
    category: 'siege',
    description: 'Cocked 13th-century counterweight trebuchet about 12.6 m long: 9.5 m tapered arm with iron bands and rope lashings on a 5.8 m axle between two A-frame trestles, hinged stone-filled counterweight box, windlass, release hook and a stone shot in its sling.',
    build(M) {
      const b = armsBuilder(M);
      b.push([0, 0, SHIFT_T]);
      addTrebuchet(b);
      b.pop();
      return b.build('trebuchet');
    },
  },
  {
    id: 'ballista',
    name: 'Field ballista',
    category: 'siege',
    description: 'Wheeled field ballista about 2.6 m long and 2 m wide: oak frame with two rope torsion skeins, iron washers and levers, bowstring drawn to the claw, a 1.1 m iron-headed bolt, ratchet winch and a pivoting two-wheeled carriage with trail.',
    build(M) {
      const b = armsBuilder(M);
      b.push([0, 0, SHIFT_B]);
      addBallista(b);
      b.pop();
      return b.build('ballista');
    },
  },
];
