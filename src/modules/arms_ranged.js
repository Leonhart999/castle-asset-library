// Ranged weapons: English yew longbow, 15th-century steel-prod crossbow, archer's leather quiver,
// crossbowman's hide-covered bolt quiver and a bound sheaf of 24 war arrows.
// 1 unit = 1 m, base at y = 0, centred on x = z = 0, front faces +Z.
//
// Reference dimensions (Mary Rose finds, Royal Armouries / Wallace Collection crossbows):
// - longbow: 1.9 m nock to nock, 32 x 28 mm D-section at the handle, sapwood back / heartwood belly,
//   horn nocks, brace height ~0.17 m (string to belly of the grip).
// - war arrow: 0.76 m, 10-11 mm ash/poplar shaft tapering to ~8 mm at the nock, horn nock insert,
//   three goose vanes ~0.16 m long, silk/linen binding, bodkin or barbed broadhead.
// - steel crossbow: stock ~0.9 m, prod span ~0.75 m (35 x 12 mm section), power stroke ~0.15-0.2 m,
//   horn/bone revolving nut, ~0.35 m trigger lever, iron stirrup; bolt ~0.34 m, 12-14 mm shaft.
// - quivers: archer's leather quiver ~0.62 m body; crossbowman's wooden hide-covered quiver ~0.32 m box.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { lathe, bevelBox, rivets, flatScroll } from '../lib/kit.js';
import { pbr } from '../lib/materials.js';
import { armsBuilder, makeRand, tube } from '../lib/armsKit.js';

// module-local material slots
const LOCAL_MATERIALS = {
  // pale yew sapwood for the back of the longbow
  sapwood: () => pbr('oak_wood_planks', { name: 'yew_sapwood', tile: 0.5, color: 0xf0d9a8, roughness: 0.7, normalScale: 0.6 }),
  // polished cow horn (bow nocks, arrow nock inserts, crossbow nut)
  horn: () => new THREE.MeshStandardMaterial({ name: 'polished_horn', color: 0x3b2a1c, roughness: 0.32, metalness: 0 }),
  // bone / stag-horn inlay plaques on crossbow stocks
  bone: () => new THREE.MeshStandardMaterial({ name: 'bone_inlay', color: 0xe6dcc4, roughness: 0.5, metalness: 0 }),
  // pale ash / poplar arrow shafts
  shaftWood: () => pbr('oak_wood_planks', { name: 'arrow_shaft_ash', tile: 0.4, color: 0xe2c79a, roughness: 0.7, normalScale: 0.4 }),
};

const V3 = (a) => new THREE.Vector3(...a);

/**
 * Lofts a closed tube through 3D `centers`. `side` (vector or function i -> vector) fixes the roll,
 * `section(i)` returns a ring of [u, v] points (u along side, v along normal = side x tangent).
 * Every ring must have the same number of points. Ends are capped; winding is fixed automatically.
 */
function loft(centers, section, side = [1, 0, 0], { caps = true } = {}) {
  const C = centers.map(V3);
  const rings = [];
  for (let i = 0; i < C.length; i++) {
    const T = C[Math.min(C.length - 1, i + 1)].clone().sub(C[Math.max(0, i - 1)]).normalize();
    let S = V3(typeof side === 'function' ? side(i) : side);
    const N = new THREE.Vector3().crossVectors(S, T).normalize();
    S = new THREE.Vector3().crossVectors(T, N).normalize();
    rings.push(section(i).map(([u, v]) => C[i].clone().addScaledVector(S, u).addScaledVector(N, v)));
  }
  const v = [];
  const tri = (a, b2, c) => v.push(a.x, a.y, a.z, b2.x, b2.y, b2.z, c.x, c.y, c.z);
  const n = rings[0].length;
  for (let i = 0; i < rings.length - 1; i++) {
    for (let k = 0; k < n; k++) {
      const k1 = (k + 1) % n;
      tri(rings[i][k], rings[i + 1][k], rings[i + 1][k1]);
      tri(rings[i][k], rings[i + 1][k1], rings[i][k1]);
    }
  }
  if (caps) {
    for (const [ring, flip] of [[rings[0], true], [rings[rings.length - 1], false]]) {
      const c = ring.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / n);
      for (let k = 0; k < n; k++) {
        const k1 = (k + 1) % n;
        if (flip) tri(c, ring[k1], ring[k]);
        else tri(c, ring[k], ring[k1]);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  if (signedVolume(g) < 0) flipWinding(g);
  g.computeVertexNormals();
  return G.boxUV(g);
}

function signedVolume(g) {
  const p = g.attributes.position;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let vol = 0;
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    vol += a.dot(b.cross(c));
  }
  return vol;
}

function flipWinding(g) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i += 3) {
    const x = p.getX(i + 1);
    const y = p.getY(i + 1);
    const z = p.getZ(i + 1);
    p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
    p.setXYZ(i + 2, x, y, z);
  }
}

/** Ellipse ring of n points, half-sizes a (u) and c (v), optional v offset. */
function ellipse(a, c, n = 8, off = 0) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2;
    out.push([Math.cos(t) * a, Math.sin(t) * c + off]);
  }
  return out;
}

/** Moves every geometry collected so far so the lowest vertex sits at y = 0 and the footprint is centred on x = z = 0. */
function groundAll(b) {
  const box = new THREE.Box3();
  for (const list of b.parts.values()) {
    for (const g of list) {
      g.computeBoundingBox();
      box.union(g.boundingBox);
    }
  }
  const c = box.getCenter(new THREE.Vector3());
  for (const list of b.parts.values()) for (const g of list) g.translate(-c.x, -box.min.y, -c.z);
}

// ---------------------------------------------------------------- arrows and bolts

const geoCache = new Map();
/** Memoised small geometries (shared shapes are rebuilt only once per key; Builder.add clones via normalize). */
function cached(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key).clone();
}

/** Square-section pyramid / needle along +Y from tip (y = 0, half-size t0) to base (y = h, half-size t1). */
function needle(h, t0, t1, n = 4) {
  return loft([[0, 0, 0], [0, h * 0.5, 0], [0, h, 0]], (i) => {
    const s = [t0, (t0 + t1) / 2 + t1 * 0.12, t1][i];
    return ellipse(s, s, n).map(([u, v]) => [u, v]);
  }, [1, 0, 0]);
}

/** Flat barbed broadhead blade in the XY plane, tip at the origin pointing -Y, 2.4 mm thick. */
function broadheadBlade() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(0.019, 0.05);
  s.lineTo(0.021, 0.068); // barb tip, swept back
  s.lineTo(0.011, 0.056);
  s.lineTo(0.005, 0.06);
  s.lineTo(-0.005, 0.06);
  s.lineTo(-0.011, 0.056);
  s.lineTo(-0.021, 0.068);
  s.lineTo(-0.019, 0.05);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.0012, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0012, bevelSegments: 1 });
  g.translate(0, 0, -0.0006);
  return G.boxUV(g);
}

/** One fletching vane in the local XY plane: x = radial distance from the axis, y = along the shaft. */
function vane(r0, y0, y1, h) {
  const L = y1 - y0;
  const s = new THREE.Shape();
  s.moveTo(r0, y0);
  s.lineTo(r0 + h * 0.25, y0 + L * 0.06);
  s.lineTo(r0 + h * 0.85, y0 + L * 0.45);
  s.lineTo(r0 + h, y0 + L * 0.75);
  s.lineTo(r0 + h * 0.95, y1 - L * 0.04);
  s.lineTo(r0 + h * 0.4, y1);
  s.lineTo(r0, y1);
  s.closePath();
  return G.boxUV(new THREE.ShapeGeometry(s));
}

/**
 * Places one arrow (or crossbow bolt) lying along local +Y with the head tip at the origin and the
 * nock at y = len. Use b.push(pos, rotY, rotX, rotZ) first to place it.
 * opts: len (0.76), r shaft radius (0.0055), head 'bodkin' | 'broad' | 'bolt', vaneLen (0.16),
 * vaneH (0.013), vanes (3), roll (radians, turns the fletching about the shaft), bolt (true = short
 * heavy crossbow bolt defaults: len 0.34, r 0.0068, head 'bolt', vaneLen 0.075, vaneH 0.012).
 */
export function addArrow(b, opts = {}) {
  const bolt = !!opts.bolt;
  const len = opts.len ?? (bolt ? 0.34 : 0.76);
  const r = opts.r ?? (bolt ? 0.0068 : 0.0055);
  const head = opts.head ?? (bolt ? 'bolt' : 'bodkin');
  const vaneLen = opts.vaneLen ?? (bolt ? 0.075 : 0.16);
  const vaneH = opts.vaneH ?? (bolt ? 0.012 : 0.013);
  const nV = opts.vanes ?? 3;
  b.push([0, 0, 0], opts.roll ?? 0);

  // head with its socket; the shaft starts inside the socket
  let shaftY0;
  if (head === 'bolt') {
    b.add('steel', cached('boltTip', () => needle(0.026, 0.0006, 0.0072)));
    b.add('steel', cached('boltSock' + r, () => lathe([[0.0072, 0.025], [r + 0.0012, 0.05], [r + 0.0008, 0.056], [0, 0.056]], 8)));
    shaftY0 = 0.045;
  } else if (head === 'broad') {
    b.add('steel', cached('broad', broadheadBlade));
    b.add('steel', cached('broadSock' + r, () => lathe([[0.0005, 0.035], [0.0048, 0.05], [r + 0.0011, 0.085], [0, 0.085]], 8)));
    shaftY0 = 0.07;
  } else {
    b.add('steel', cached('bodkin', () => needle(0.055, 0.0004, 0.0042)), null, Math.PI / 4);
    b.add('steel', cached('bodSock' + r, () => lathe([[0.0042, 0.052], [0.0052, 0.06], [r + 0.0011, 0.085], [0, 0.085]], 8)));
    shaftY0 = 0.07;
  }

  // barrelled shaft (thickest a third of the way back, tapering to the nock)
  const yN = len - 0.022;
  const yB = shaftY0 + (yN - shaftY0) * 0.35;
  const shaftR = (y) => (y < yB ? r + (r * 0.02 * (y - shaftY0)) / (yB - shaftY0) : r * 1.02 + ((r * 0.82 - r * 1.02) * (y - yB)) / (yN - yB));
  b.add('shaftWood', cached(`shaft${len}_${r}`, () =>
    lathe([[0, shaftY0], [r, shaftY0], [r * 1.02, yB], [r * 0.82, yN], [0, yN]], 7)));

  // horn nock insert with a string slot (two ears either side of the slot)
  const rn = r * 0.86;
  b.add('horn', cached(`nock${r}`, () => lathe([[0, yN - 0.0005], [r * 0.83, yN - 0.0005], [rn, yN + 0.01], [rn * 0.9, len - 0.006], [0, len - 0.006]], 7)), [0, 0, 0], Math.PI / 7);
  for (const s of [-1, 1]) {
    b.add('horn', cached(`ear${r}`, () => G.box(rn * 0.62, 0.0065, rn * 1.6)), [s * rn * 0.62, len - 0.0035, 0]);
  }

  // fletching: vanes plus thread bindings at both ends
  const fy1 = len - (bolt ? 0.012 : 0.03);
  const fy0 = fy1 - vaneLen;
  const rr = shaftR(fy1) * 0.9;
  for (let k = 0; k < nV; k++) {
    b.add('feather', cached(`vane${rr}_${fy0}_${fy1}_${vaneH}`, () => vane(rr, fy0, fy1, vaneH)), null, (k / nV) * Math.PI * 2 + Math.PI / 2);
  }
  if (!bolt) {
    for (const [y, h] of [[fy0 - 0.006, 0.012], [fy1 - 0.002, 0.008]]) {
      const r0 = shaftR(y) + 0.0007;
      const r1 = shaftR(y + h) + 0.0007;
      b.add('string', G.cylinder(r1, r0, h, 7, { y0: y, open: true }));
    }
  }
  b.pop();
}

/** Pushes a transform whose local +Y runs from `from` along `dir`, rolled by `roll` about that axis. */
function pushAlong(b, from, dir, roll = 0) {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), V3(dir).normalize());
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), roll));
  const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
  b.push(from, e.y, e.x, e.z);
}

// ---------------------------------------------------------------- arrow sheaf

/** Sheaf of 24 war arrows bound with two linen ties, lying along X (heads -X), centred on the origin axis. */
function buildSheaf(b) {
  const L = 0.76;
  const twist = Math.PI * 0.5; // each arrow turns 90 degrees about the bundle axis from head to nock
  const rand = makeRand(24);
  const layers = [[3, 0.0072], [8, 0.0175], [13, 0.0285]];
  let n = 0;
  for (const [count, rho] of layers) {
    for (let k = 0; k < count; k++) {
      const th = (k / count) * Math.PI * 2 + rho * 40 + (rand() - 0.5) * 0.12;
      const sp = 1 / Math.cos(twist / 2);
      const a0 = th - twist / 2;
      const a1 = th + twist / 2;
      const slip = (rand() - 0.5) * 0.03; // arrows are not perfectly level at the ends
      const A = [-L / 2 + slip, Math.cos(a0) * rho * sp, Math.sin(a0) * rho * sp];
      const B = [L / 2 + slip, Math.cos(a1) * rho * sp, Math.sin(a1) * rho * sp];
      const dir = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
      pushAlong(b, A, dir, rand() * Math.PI * 2);
      addArrow(b, { len: L, head: n % 6 === 5 ? 'broad' : 'bodkin' });
      b.pop();
      n++;
    }
  }
  // two linen ties at the waist, three turns each, with a knot
  const Rt = 0.0285 * Math.hypot(1, Math.tan(twist / 2) * (2 * 0.05) / L) + 0.0055 + 0.002;
  for (const x of [-0.05, 0.05]) {
    b.push([x, 0, 0], 0, 0, Math.PI / 2);
    const turns = [];
    for (let i = 0; i <= 42; i++) {
      const t = i / 42;
      const a = t * Math.PI * 2 * 3;
      turns.push([Math.cos(a) * Rt, -0.006 + 0.012 * t, Math.sin(a) * Rt]);
    }
    b.add('linen', tube(turns, 0.0018, 60, 5));
    b.add('linen', new THREE.SphereGeometry(0.004, 7, 5), [Rt + 0.002, 0.006, 0]);
    b.add('linen', tube([[Rt + 0.003, 0.007, 0], [Rt + 0.01, 0.012, 0.004], [Rt + 0.018, 0.013, 0.01]], 0.0014, 6, 4));
    b.pop();
  }
}

// ---------------------------------------------------------------- longbow

/**
 * D-section ring: back (flat, slightly crowned) at v = 0, belly rounded down to v = -t.
 * part: 'all', 'back' (sapwood, v 0 .. -k t) or 'belly' (heartwood, v -k t .. -t).
 */
function dRing(w, t, part = 'all', k = 0.32, grow = 0) {
  const hw = w / 2 + grow;
  const T = t + grow;
  const crown = Math.min(0.0015, t * 0.08);
  const side = (v) => hw * Math.sqrt(Math.max(0, 1 - ((v + grow) / -T) ** 2) * 0.9 + 0.1 * (v > -T * 0.5 ? 1 : 0));
  const back = [];
  for (let i = 0; i <= 4; i++) {
    const u = -hw * 0.92 + (hw * 1.84 * i) / 4;
    back.push([u, grow + crown * (1 - (u / hw) ** 2)]);
  }
  const belly = (v0, v1, n) => {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI; // 0 -> right side, PI -> left side, through the belly
      const vv = v0 + (v1 - v0) * Math.sin(a / 2) ** 2;
      out.push(vv);
    }
    return out;
  };
  if (part === 'all') {
    // back from left to right, then belly half-ellipse from right to left
    const ring = back.slice();
    for (let i = 1; i < 8; i++) {
      const a = (i / 8) * Math.PI;
      ring.push([hw * Math.cos(a) * (i === 0 ? 1 : 1), -T * Math.sin(a)]);
    }
    return ring.reverse();
  }
  // split sections: elliptical side wall between v = 0 and v = -T
  const vk = -T * k;
  const uAt = (v) => hw * Math.sqrt(Math.max(0, 1 - (v / -T) ** 2));
  if (part === 'back') {
    return [...back, [uAt(vk * 0.5), vk * 0.5], [uAt(vk), vk], [0, vk], [-uAt(vk), vk], [-uAt(vk * 0.5), vk * 0.5]].reverse();
  }
  const ring = [[-uAt(vk), vk], [0, vk], [uAt(vk), vk]];
  const a0 = Math.asin(k);
  for (let i = 1; i < 7; i++) {
    const a = a0 + ((Math.PI - 2 * a0) * i) / 7;
    ring.push([hw * Math.cos(a), -T * Math.sin(a)]);
  }
  void side;
  void belly;
  return ring.reverse();
}

/**
 * Places a strung English longbow, 1.9 m nock to nock. Origin: lower horn nock tip at y = 0, the back
 * of the handle at z = 0 (back faces +Z), the string on the -Z side (brace height ~0.17 m), x = 0.
 */
export function addLongbow(b) {
  const L = 1.9;
  const mid = L / 2;
  const D = 0.187; // tip deflection towards the string
  const g = 0.07; // stiff handle half-fraction
  const dz = (y) => {
    const s = Math.abs(y - mid) / mid;
    const q = Math.max(0, s - g) / (1 - g);
    return -D * q * q * (1 + 0.12 * q);
  };
  const tanAt = (y) => new THREE.Vector3(0, 0.002, dz(y + 0.001) - dz(y - 0.001)).normalize();
  // width and depth along the bow (s = 0 handle, 1 tip)
  const wAt = (s) => 0.0335 - 0.0205 * Math.max(0, (s - 0.06) / 0.94) ** 1.2;
  const tAt = (s) => (s < 0.06 ? 0.036 - 0.06 * s : 0.0324 - 0.0214 * ((s - 0.06) / 0.94) ** 1.1);
  const y0 = 0.045;
  const y1 = L - 0.045;
  const n = 72;
  const ys = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // denser stations near the handle and tips
    ys.push(y0 + (y1 - y0) * (0.5 - 0.5 * Math.cos(t * Math.PI) * 0.15 + (t - 0.5) * 0.85));
  }
  ys.sort((a, b2) => a - b2);
  const centers = ys.map((y) => [0, y, dz(y)]);
  const sec = (part) => (i) => {
    const s = Math.abs(ys[i] - mid) / mid;
    return dRing(wAt(s), tAt(s), part);
  };
  b.add('sapwood', loft(centers, sec('back')));
  b.add('yew', loft(centers, sec('belly')));

  // leather-wrapped grip (13 cm), slight ridges where the strip edges overlap
  const gy = [];
  for (let i = 0; i <= 26; i++) gy.push(mid - 0.07 + (0.14 * i) / 26);
  b.add('leather', loft(gy.map((y) => [0, y, dz(y)]), (i) => {
    const s = Math.abs(gy[i] - mid) / mid;
    const ridge = i === 0 || i === 26 ? 0.0012 : 0.0019 + 0.0007 * Math.cos(i * Math.PI * 0.5);
    return dRing(wAt(s), tAt(s), 'all', 0.32, ridge);
  }));
  // horn arrow-pass plate on the left (+X) side just above the grip
  b.add('horn', bevelBox(0.0024, 0.034, 0.02, 0.001), [wAt(0.08) / 2 + 0.0008, mid + 0.088, -0.014]);

  // horn nocks over the tapered tips, with a string groove
  const nockProfile = [[0, 0], [0.0035, 0.004], [0.0082, 0.014], [0.0084, 0.019], [0.0062, 0.023], [0.0062, 0.029], [0.0094, 0.034], [0.0098, 0.045], [0.0086, 0.072], [0, 0.072]];
  const nockGeo = lathe(nockProfile, 12);
  const grooves = [];
  for (const [yb, sgn] of [[0.075, -1], [L - 0.075, 1]]) {
    const s = 1;
    void s;
    const T = tanAt(yb).multiplyScalar(sgn); // pointing outwards to the tip
    const Nrm = new THREE.Vector3(1, 0, 0).cross(T.clone().multiplyScalar(sgn)).normalize();
    const base = new THREE.Vector3(0, yb, dz(yb)).addScaledVector(Nrm, -tAt(0.92) * 0.45);
    const tip = base.clone().addScaledVector(T, 0.072);
    pushAlong(b, tip.toArray(), T.clone().negate().toArray());
    b.add('horn', nockGeo);
    b.pop();
    grooves.push({ c: tip.clone().addScaledVector(T, -0.026), T });
  }
  // waxed linen string: loops round both nock grooves, straight between them, whipped centre serving
  const rs = 0.0016;
  const zS = Math.min(grooves[0].c.z, grooves[1].c.z) - 0.0062 - rs;
  for (const { c, T } of grooves) {
    const loop = [];
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      loop.push([Math.cos(a) * (0.0062 + rs), 0, Math.sin(a) * (0.0062 + rs)]);
    }
    pushAlong(b, c.toArray(), T.toArray());
    b.add('string', tube(loop, rs, 16, 5, true));
    b.pop();
  }
  const sy0 = grooves[0].c.y;
  const sy1 = grooves[1].c.y;
  b.add('string', G.rod([0, sy0, zS], [0, sy1, zS], rs, 6));
  b.add('string', G.cylinder(rs + 0.0007, rs + 0.0007, 0.12, 6, { y0: mid - 0.04, open: true }), [0, 0, zS]);
  return { zString: zS, zBelly: -tAt(0) };
}

export const rangedModules = [
  {
    id: 'bow_longbow',
    name: 'English Yew Longbow',
    category: 'weapon',
    description:
      'A strung English yew longbow, 1.9 m nock to nock, with a D-section stave of pale sapwood back and dark heartwood belly, horn nocks, a leather-wrapped grip and a waxed linen string at about 0.17 m brace height.',
    build(M) {
      const b = armsBuilder(M, LOCAL_MATERIALS);
      addLongbow(b);
      groundAll(b);
      return b.build('bow_longbow');
    },
  },
  {
    id: 'arrow_sheaf',
    name: 'Sheaf of War Arrows',
    category: 'weapon',
    description:
      'A sheaf of 24 ash war arrows, 0.76 m long with bodkin and barbed heads and grey goose fletching, bound at the waist with two linen ties and lying on the ground.',
    build(M) {
      const b = armsBuilder(M, LOCAL_MATERIALS);
      buildSheaf(b);
      groundAll(b);
      return b.build('arrow_sheaf');
    },
  },
];
