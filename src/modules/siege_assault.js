// Assault siege gear (stage 5): wheeled siege tower (belfry), covered battering ram ("sow"),
// hand-carried ram log and a wheeled mantlet. Front (direction of attack) faces +Z.
// Reference dimensions (metres, 1 unit = 1 m), from 12th-15th century accounts and reconstructions:
//  siege_tower: sized for this kit's curtain wall (walkway y = 8, merlon tops ~10.2). 4.2 m square oak frame,
//   0.3 m corner posts, long sills 0.34 m on four axles with eight 1.1 m plank wheels; floors at 1.35 / 3.95 /
//   6.5 / 9.0, open fighting platform at 11.4 with a 0.9 m breastwork; 3 m drawbridge hinged at 9.07 so it lands
//   on the wall-walk; front and sides boarded and hung with raw ox hides against fire arrows.
//  battering_ram: covered ram about 6 m long and 2.6 m wide, eaves ~2.3 m, ridge ~3.5 m; 0.8 m wheels;
//   6.5 m oak ram (0.36 m thick) slung from two tie beams by chains, blunt iron head.
//  ram_log: hand ram about 4 m long, 0.34 m thick (10-12 men on rope handles), iron cap with flange straps.
//  mantlet: pavise-like wheeled screen 2.2 m wide, 2 m tall, 7 cm planks, viewing slot with shutter.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { rivets, ringBand, lathe } from '../lib/kit.js';
import { armsBuilder, makeRand, tube } from '../lib/armsKit.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// Local geometry helpers
// ---------------------------------------------------------------------------

/** Builds a non-indexed geometry from triangles, flipping each so its normal points along `out(centroid)`. */
function trisOut(tris, out) {
  const v = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (const [p, q, r] of tris) {
    a.set(...p);
    b.set(...q);
    c.set(...r);
    n.subVectors(b, a).cross(c.clone().sub(a));
    const m = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    if (n.dot(out(m)) < 0) v.push(...p, ...r, ...q);
    else v.push(...p, ...q, ...r);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

/** Octagonal (chamfered) prism along local X, centred on the origin: length len, height h (Y), depth d (Z). */
function chamferPrism(len, h, d, ch = 0.015) {
  const hh = h / 2;
  const hd = d / 2;
  const c = Math.min(ch, hh * 0.45, hd * 0.45);
  const sec = [[hd - c, hh], [hd, hh - c], [hd, -hh + c], [hd - c, -hh], [-hd + c, -hh], [-hd, -hh + c], [-hd, hh - c], [-hd + c, hh]];
  const x0 = -len / 2;
  const x1 = len / 2;
  const tris = [];
  for (let k = 0; k < 8; k++) {
    const [z0, y0] = sec[k];
    const [z1, y1] = sec[(k + 1) % 8];
    tris.push([[x0, y0, z0], [x1, y0, z0], [x1, y1, z1]], [[x0, y0, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  for (let k = 1; k < 7; k++) {
    for (const x of [x0, x1]) tris.push([[x, sec[0][1], sec[0][0]], [x, sec[k][1], sec[k][0]], [x, sec[k + 1][1], sec[k + 1][0]]]);
  }
  const g = trisOut(tris, (m) => (Math.abs(m.x) > len / 2 - 1e-6 ? new THREE.Vector3(Math.sign(m.x), 0, 0) : new THREE.Vector3(0, m.y, m.z)));
  return G.boxUV(g);
}

/**
 * Chamfered beam from point a to point c: w is the side lying in the plane of the beam and `up`, d the other side.
 * `ext` lengthens it at both ends (for joints that run into the next member).
 */
function cbeam(a, c, w, d, { up = [0, 1, 0], ch = 0.015, ext = 0 } = {}) {
  const A = new THREE.Vector3(...a);
  const C = new THREE.Vector3(...c);
  const dir = C.clone().sub(A);
  const len = dir.length() + ext * 2;
  dir.normalize();
  let U = new THREE.Vector3(...up);
  let Z = new THREE.Vector3().crossVectors(dir, U);
  if (Z.lengthSq() < 1e-8) {
    U = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    Z = new THREE.Vector3().crossVectors(dir, U);
  }
  Z.normalize();
  const Y = new THREE.Vector3().crossVectors(Z, dir).normalize();
  const g = chamferPrism(len, w, d, ch);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(dir, Y, Z));
  g.translate((A.x + C.x) / 2, (A.y + C.y) / 2, (A.z + C.z) / 2);
  return g;
}

/** Adds a chamfered beam (see cbeam). */
function B(b, mat, a, c, w, d, o) {
  return b.add(mat, cbeam(a, c, w, d, o));
}

/** Axis-aligned chamfered block given by its min/max corners. */
function blockMM(b, mat, [x0, y0, z0], [x1, y1, z1], ch = 0.012) {
  const g = chamferPrism(x1 - x0, y1 - y0, z1 - z0, ch);
  return b.add(mat, g, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]);
}

/** Round rod between two points. */
function rod(b, mat, a, c, r, segs = 8) {
  return b.add(mat, G.rod(a, c, r, segs));
}

/**
 * Solid plank wheel in a local frame whose axis is local X (centre at the origin): `strips` planks with
 * dark seams, two clamping battens on the outer face (+X side when side = 1), iron tyre, hub and hub hoops.
 * Outer radius including the tyre is R.
 */
function plankWheel(b, R, width, { strips = 3, side = 1, hubR = 0.11, hubLen = 0.3, segs = 24 } = {}) {
  const tyreT = 0.016;
  const Rw = R - tyreT + 0.002; // wood radius (tyre bites 2 mm into it)
  const gap = 0.004;
  for (let i = 0; i < strips; i++) {
    const u0 = Math.max(-Rw + 1e-3, -Rw + (i * 2 * Rw) / strips + (i ? gap / 2 : 0));
    const u1 = Math.min(Rw - 1e-3, -Rw + ((i + 1) * 2 * Rw) / strips - (i < strips - 1 ? gap / 2 : 0));
    const v0 = Math.sqrt(Rw * Rw - u0 * u0);
    const v1 = Math.sqrt(Rw * Rw - u1 * u1);
    const a0 = Math.atan2(v0, u0);
    const a1 = Math.atan2(v1, u1);
    const s = new THREE.Shape();
    s.moveTo(u0, -v0);
    s.lineTo(u0, v0);
    s.absarc(0, 0, Rw, a0, a1, true);
    s.lineTo(u1, -v1);
    s.absarc(0, 0, Rw, -a1, -a0, true);
    const nseg = Math.max(3, Math.round((segs * (a0 - a1)) / TAU) + 1);
    const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false, curveSegments: nseg });
    g.translate(0, 0, -width / 2);
    g.rotateY(Math.PI / 2);
    b.add('oak', G.boxUV(g));
  }
  // clamping battens across the seams on the outer face (run along local Z)
  for (const v of [-0.42, 0.42]) {
    const len = 2 * Math.sqrt(Rw * Rw - (v * Rw + 0.06) ** 2) - 0.08;
    blockMM(b, 'darkWood', [side * (width / 2) - (side < 0 ? 0.035 : 0), v * Rw - 0.05, -len / 2], [side * (width / 2) + (side > 0 ? 0.035 : 0), v * Rw + 0.05, len / 2], 0.01);
  }
  // iron tyre with nail heads
  const tyre = ringBand(Rw - 0.002 + tyreT / 2, tyreT, width + 0.008, segs + 4);
  tyre.translate(0, -(width + 0.008) / 2, 0);
  b.add('iron', tyre, null, 0, 0, Math.PI / 2);
  // hub with iron hoops on both ends
  rod(b, 'darkWood', [-hubLen / 2, 0, 0], [hubLen / 2, 0, 0], hubR, 12);
  for (const sx of [-1, 1]) {
    const hoop = ringBand(hubR + 0.006, 0.014, 0.04, 14);
    hoop.translate(0, -0.02, 0);
    b.add('iron', hoop, [sx * (hubLen / 2 - 0.025), 0, 0], 0, 0, Math.PI / 2);
  }
}

/**
 * Irregular raw-hide sheet: top edge at local y = 0, hanging down to about y = -h, x in [-w/2, w/2],
 * thickness t from z = 0 (back) to z = t. Ragged lower edge and slightly wavy sides.
 */
function hideSheet(w, h, t, seed, jag = 0.035) {
  const r = makeRand(seed);
  const s = new THREE.Shape();
  const n = Math.max(3, Math.round(w / 0.25));
  s.moveTo(-w / 2, 0);
  for (let i = 1; i <= n; i++) s.lineTo(-w / 2 + (w * i) / n, -r() * 0.01);
  s.lineTo(w / 2 - r() * 0.015, -h * 0.5);
  for (let i = n; i >= 0; i--) s.lineTo(-w / 2 + (w * i) / n + (r() - 0.5) * 0.04, -h + (r() - 0.3) * jag);
  s.lineTo(-w / 2 + r() * 0.015, -h * 0.5);
  s.closePath();
  return G.boxUV(new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false }));
}

/** Tube surface through rings [{ z, pts: [[x, y], ...] }] of equal length; optional flat end caps (fan from the centroid). */
function loftRings(rings, { caps = true } = {}) {
  const tris = [];
  const n = rings[0].pts.length;
  for (let i = 0; i < rings.length - 1; i++) {
    const A = rings[i];
    const C = rings[i + 1];
    for (let k = 0; k < n; k++) {
      const m = (k + 1) % n;
      const p = [...A.pts[k], A.z];
      const q = [...A.pts[m], A.z];
      const r = [...C.pts[m], C.z];
      const s = [...C.pts[k], C.z];
      tris.push([p, q, r], [p, r, s]);
    }
  }
  const z0 = rings[0].z;
  const z1 = rings[rings.length - 1].z;
  if (caps) {
    for (const R of [rings[0], rings[rings.length - 1]]) {
      const cx = R.pts.reduce((s, p) => s + p[0], 0) / n;
      const cy = R.pts.reduce((s, p) => s + p[1], 0) / n;
      for (let k = 0; k < n; k++) tris.push([[cx, cy, R.z], [...R.pts[k], R.z], [...R.pts[(k + 1) % n], R.z]]);
    }
  }
  const g = trisOut(tris, (m) => {
    if (caps && Math.abs(m.z - z0) < 1e-7) return new THREE.Vector3(0, 0, -1);
    if (caps && Math.abs(m.z - z1) < 1e-7) return new THREE.Vector3(0, 0, 1);
    return new THREE.Vector3(m.x, m.y, 0);
  });
  return G.boxUV(g);
}

/**
 * Hewn oak log lying along local Z (axis at x = y = 0, z from -len/2 to len/2): eight adzed flats with the
 * round (waney) log surface left at the corners. Radius tapers from R0 (rear, -Z) to R1 (front).
 * Returns helpers: ring(z, off) gives the outline offset by `off`, F(z) the distance of the bottom flat,
 * cornerArcs = angular ranges where the round surface remains (for bark patches).
 */
function hewnLog(len, R0, R1, seed = 3) {
  const rnd = makeRand(seed);
  const facets = 8;
  const thc = [];
  for (let k = 0; k < facets; k++) thc.push(0.2 + rnd() * 0.12); // half-angle of each flat (rad), < pi/8
  thc[0] = 0.3; // bottom flat (k = 0, pointing down) wide enough to lie on
  const R = (z) => R0 + ((R1 - R0) * (z + len / 2)) / len;
  const step = TAU / facets;
  const angles = [];
  for (let k = 0; k < facets; k++) {
    const c = -Math.PI / 2 + k * step;
    const nxt = thc[(k + 1) % facets];
    angles.push(c - thc[k], c + thc[k]);
    const a0 = c + thc[k];
    const a1 = c + step - nxt;
    angles.push(a0 + (a1 - a0) / 3, a0 + (2 * (a1 - a0)) / 3);
  }
  const ring = (z, off = 0, wob = 0) => {
    const r = R(z) * (1 + wob) + off;
    return angles.map((a) => [Math.cos(a) * r, Math.sin(a) * r]);
  };
  const cornerArcs = [];
  for (let k = 0; k < facets; k++) {
    const c = -Math.PI / 2 + k * step;
    cornerArcs.push([c + thc[k], c + step - thc[(k + 1) % facets]]);
  }
  const F = (z) => R(z) * Math.cos(thc[0]);
  return { R, ring, F, thc, cornerArcs, facetAngle: (k) => -Math.PI / 2 + k * step };
}

/** Annular sector (bark slab) around the Z axis: radii r0..r1, angles a0..a1, from z0 to z1. */
function sectorSlab(r0, r1, a0, a1, z0, z1, n = 3) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r1, a0, a1, false);
  s.absarc(0, 0, r0, a1, a0, true);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: z1 - z0, bevelEnabled: false, curveSegments: n });
  g.translate(0, 0, z0);
  return G.boxUV(g);
}

/** Small low-poly dome head (nail, rivet) facing +Y. */
const nailHead = (r) => new THREE.SphereGeometry(r, 6, 3, 0, TAU, 0, Math.PI / 2);

/** Rope lashing of `turns` turns hugging an outline ring (local XY points) at z = zc, drifting over `dz`. */
function ringLashing(pts, zc, dz, ropeR, turns = 1.3) {
  const n = pts.length;
  const out = [];
  const steps = Math.round(n * turns);
  for (let i = 0; i <= steps; i++) {
    const p = pts[i % n];
    const L = Math.hypot(p[0], p[1]);
    const s = (L + ropeR * 0.85) / L;
    out.push([p[0] * s, p[1] * s, zc - dz / 2 + (dz * i) / steps]);
  }
  return tube(out, ropeR, steps * 2, 5);
}

/**
 * Hewn oak ram with iron cap, flange straps and iron bands, built along local Z (axis at the origin,
 * striking end towards +Z, total length len + cap). Returns the log helper for further fittings.
 */
function ramBody(b, { len, R0, R1, seed, bands, capLen = 0.28, straps = 4, bark = 6 }) {
  const L = hewnLog(len, R0, R1, seed);
  const rnd = makeRand(seed * 31 + 5);
  const z0 = -len / 2;
  const z1 = len / 2;
  const rings = [];
  const nr = Math.max(6, Math.round(len / 0.45));
  // rear end slightly chamfered
  rings.push({ z: z0, pts: L.ring(z0, -0.02) });
  for (let i = 0; i <= nr; i++) {
    const z = z0 + 0.02 + ((z1 - z0 - 0.02) * i) / nr;
    rings.push({ z, pts: L.ring(z, 0, i === 0 || i === nr ? 0 : (rnd() - 0.5) * 0.025) });
  }
  b.add('oak', loftRings(rings, { caps: false }));
  // sawn rear face
  b.add('endGrain', loftRings([{ z: z0, pts: L.ring(z0, -0.02) }, { z: z0 + 1e-4, pts: L.ring(z0, -0.02) }]));
  // bark left in some of the round corners
  for (let i = 0; i < bark; i++) {
    const k = Math.floor(rnd() * 8);
    const [a0, a1] = L.cornerArcs[k];
    const za = z0 + 0.3 + rnd() * (len - capLen - 1.2);
    const zb = za + 0.25 + rnd() * 0.6;
    const r = L.R((za + zb) / 2) * 1.015;
    b.add('bark', sectorSlab(r - 0.02, r + 0.009, a0 - 0.03, a1 + 0.03, za, zb));
  }
  // iron bands following the hewn outline
  for (const zb of bands) {
    b.add('iron', loftRings([{ z: zb - 0.03, pts: L.ring(zb - 0.03, 0.008) }, { z: zb + 0.03, pts: L.ring(zb + 0.03, 0.008) }]));
    const off = L.R(zb) + 0.009;
    const head = nailHead(0.008);
    for (let k = 0; k < 8; k += 2) {
      const a = L.facetAngle(k) + Math.PI / 8 - 0.4;
      b.add('iron', head, [Math.cos(a) * off * 0.97, Math.sin(a) * off * 0.97, zb], 0, 0, a - Math.PI / 2);
    }
  }
  // blunt iron cap over the striking end
  const Rc = R1 + 0.014;
  const cap = lathe([[R1 * 0.85, 0], [Rc, 0], [Rc, capLen - 0.07], [Rc * 0.97, capLen - 0.035], [Rc * 0.86, capLen - 0.008], [Rc * 0.6, capLen], [0.001, capLen + 0.004]], 24);
  cap.rotateX(Math.PI / 2);
  b.add('iron', cap, [0, 0, z1 - capLen + 0.06]);
  // flange straps running back from the cap along four flats, riveted
  const zc = z1 - capLen + 0.06;
  for (let k = 0; k < 8; k += 8 / straps) {
    const a = L.facetAngle(k);
    const d = L.R(zc) * Math.cos(L.thc[k]) + 0.005;
    const g = new THREE.BoxGeometry(0.06, 0.008, 0.5);
    b.push([Math.cos(a) * d, Math.sin(a) * d, zc - 0.24], 0, 0, a - Math.PI / 2);
    b.add('iron', G.boxUV(g));
    for (const zz of [-0.2, -0.05, 0.12]) b.add('iron', nailHead(0.011), [0, 0.003, zz]);
    b.pop();
  }
  return L;
}

/**
 * Hand-carried ram log lying on the ground along Z. Origin: on the ground under the middle of the log;
 * striking (iron-capped) end towards +Z, sawn end grain at the rear.
 */
export function addRamLog(b) {
  const len = 3.92;
  const R0 = 0.16;
  const R1 = 0.172;
  const L0 = hewnLog(len, R0, R1, 7);
  // the log lies on its bottom flat; lift so that flat is at y = 0 (taper: lowest at the thick front end)
  const lift = L0.F(len / 2);
  b.push([0, lift, -0.05]);
  // the bottom flat is not level along a tapered log: tilt so it lies flat
  const tilt = Math.atan2(L0.F(len / 2) - L0.F(-len / 2), len);
  b.push([0, 0, 0], 0, tilt);
  const L = ramBody(b, { len, R0, R1, seed: 7, bands: [-1.86, -0.46, 0.93], capLen: 0.26, bark: 7 });
  // five pairs of rope carrying handles: a lashing round the log and a loop flopped down on each side
  const ropeR = 0.014;
  for (const zh of [-1.5, -0.8, -0.1, 0.55, 1.2]) {
    b.add('rope', ringLashing(L.ring(zh), zh, 0.05, ropeR, 1.25));
    for (const s of [-1, 1]) {
      const d = L.R(zh) * Math.cos(L.thc[2]) + ropeR;
      const yG = -L.F(zh) + ropeR + 0.001; // ground in log-local coordinates (ignoring the tiny tilt)
      const pts = [
        [s * d, 0.02, zh - 0.03],
        [s * (d + 0.06), -0.02, zh - 0.07],
        [s * (d + 0.15), yG + 0.03, zh - 0.08],
        [s * (d + 0.24), yG, zh - 0.02],
        [s * (d + 0.25), yG, zh + 0.04],
        [s * (d + 0.15), yG + 0.03, zh + 0.08],
        [s * (d + 0.06), -0.02, zh + 0.06],
        [s * d, 0.02, zh + 0.02],
      ];
      b.add('rope', tube(pts, ropeR, 22, 5));
    }
  }
  b.pop();
  b.pop();
}

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------

export const siegeAssaultModules = [
  {
    id: 'ram_log',
    name: 'Ram Log',
    category: 'siege',
    description: 'Hand-carried oak battering ram about 4 m long and 0.34 m thick, hewn with bark left in places, with an iron striking cap, flange straps, three iron bands and five pairs of rope handles.',
    build(M) {
      const b = armsBuilder(M);
      addRamLog(b);
      return b.build('ram_log');
    },
  },
];
