// Kitchen props (stage 4): cauldron on a tripod over an open fire, clay jug, wine amphora on a stand, pewter
// tableware on a serving board and a butcher table. Base sits at y = 0, centred on x = z = 0, 1 unit = 1 m.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { newBuilder, lathe, ringBand, bevelBlock, bevelBox, rivets, charcoalLump, softFlame } from '../lib/kit.js';

/** Deterministic pseudo-random numbers, so every build produces identical geometry. */
function makeRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Round tube through points [x, y, z?] (z defaults to 0), used for handles and hooks. */
function tube(pts, r, segs = 24) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z = 0]) => new THREE.Vector3(x, y, z)));
  return G.boxUV(new THREE.TubeGeometry(curve, segs, r, 8, false));
}

/** Horizontal torus ring around the Y axis, centred on the origin. */
function hoop(r, tubeR, segs = 32) {
  const g = new THREE.TorusGeometry(r, tubeR, 5, segs);
  g.rotateX(Math.PI / 2);
  return G.boxUV(g);
}

/** Iron-bladed table knife with an oak handle, lying flat with the handle end at x = 0 and the tip at x = 0.24. */
function addKnife(b) {
  b.add('oak', G.cylinder(0.0125, 0.011, 0.1, 10, { y0: -0.05 }), [0.05, 0.0125, 0], 0, 0, Math.PI / 2);
  b.add('gilt', G.cylinder(0.014, 0.014, 0.01, 10, { y0: -0.005 }), [0.103, 0.0125, 0], 0, 0, Math.PI / 2);
  b.add('steel', bevelBox(0.13, 0.004, 0.018, 0.0015), [0.173, 0.0125, 0]);
}

/** Iron cauldron hanging on a chain from a lashed timber tripod over a log fire in a ring of stones. */
function cauldronTripod(b) {
  const APEX = 1.75;
  const FOOT = 0.85;
  const CY = 0.26; // underside of the cauldron
  const rand = makeRand(7);

  // three timber poles, lashed with rope just below where they cross
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    b.add('darkWood', G.rod([Math.cos(a) * FOOT, 0.02, Math.sin(a) * FOOT], [0, APEX, 0], 0.03, 10));
  }
  for (const [y, r] of [[1.57, 0.13], [1.62, 0.103], [1.67, 0.078]]) b.add('straw', hoop(r, 0.011, 18), [0, y, 0]);

  // ash bed, glowing coals and a ring of rough hearth stones
  b.add('void', G.cylinder(0.4, 0.42, 0.012, 28));
  b.add('ember', G.cylinder(0.24, 0.27, 0.03, 22, { y0: 0.012 }));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rand() * 0.25;
    const r = 0.45 + rand() * 0.03;
    b.add('hearth', charcoalLump(0.082 + rand() * 0.012, 20 + i), [Math.cos(a) * r, 0.075, Math.sin(a) * r], rand() * Math.PI);
  }

  // two layers of logs, loose embers and flames
  for (const [ang, len, y, rad] of [[0, 0.56, 0.045, 0.042], [1.05, 0.52, 0.045, 0.04], [2.1, 0.54, 0.045, 0.041], [0.5, 0.42, 0.125, 0.034], [1.6, 0.4, 0.122, 0.033]]) {
    b.add('bark', G.cylinder(rad, rad * 1.08, len, 10, { y0: -len / 2 }), [0, y, 0], ang, 0, Math.PI / 2);
  }
  for (let i = 0; i < 6; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.2;
    b.add('ember', charcoalLump(0.036 + rand() * 0.014, 40 + i), [Math.cos(a) * r, 0.05 + rand() * 0.04, Math.sin(a) * r], rand() * Math.PI);
  }
  for (const [x, z, s] of [[0.06, 0.03, 2.0], [-0.09, -0.05, 1.8], [0.0, 0.11, 1.9], [-0.04, -0.12, 1.6]]) softFlame(b, [x, 0.12, z], s);

  // cauldron: bellied pot with a rolled rim, inner wall and broth surface
  const outer = [[0, 0], [0.12, 0.004], [0.22, 0.04], [0.285, 0.12], [0.31, 0.22], [0.3, 0.3], [0.285, 0.34], [0.3, 0.352], [0.298, 0.362]];
  const inner = [[0.286, 0.362], [0.274, 0.335], [0.296, 0.22], [0.272, 0.12], [0.21, 0.05], [0.11, 0.016], [0, 0.014]];
  b.add('iron', lathe(outer.concat(inner), 40), [0, CY, 0]);
  b.add('broth', G.cylinder(0.278, 0.278, 0.003, 28, { y0: CY + 0.29 }));
  b.add('iron', ringBand(0.296, 0.012, 0.03, 40), [0, CY + 0.3, 0]);
  const rv = [];
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    rv.push([Math.cos(a) * 0.304, CY + 0.315, Math.sin(a) * 0.304]);
  }
  rivets(b, 'iron', rv, 0.0075);
  for (const sx of [-1, 1]) b.add('iron', bevelBox(0.05, 0.045, 0.024, 0.004), [sx * 0.31, CY + 0.33, 0]);
  const bail = new THREE.TorusGeometry(0.31, 0.011, 6, 32, Math.PI);
  bail.scale(1, 0.62, 1);
  b.add('iron', G.boxUV(bail), [0, CY + 0.33, 0]);

  // chain from the bail up to an iron eye under the lashing
  const y0 = CY + 0.33 + 0.19;
  const y1 = 1.6;
  const n = 20;
  for (let k = 0; k < n; k++) {
    const y = y0 + ((k + 0.5) / n) * (y1 - y0);
    const link = new THREE.TorusGeometry(0.022, 0.0055, 5, 10);
    link.scale(0.62, 1.45, 1);
    if (k % 2) link.rotateY(Math.PI / 2);
    b.add('iron', G.boxUV(link), [0, y, 0]);
  }
  b.add('iron', G.boxUV(new THREE.TorusGeometry(0.03, 0.007, 6, 14)), [0, 1.62, 0]);
}

/** Terracotta jug with a flared neck, loop handle, cork and two incised bands. */
function clayJug(b) {
  const prof = [[0, 0], [0.07, 0], [0.1, 0.03], [0.125, 0.12], [0.128, 0.18], [0.112, 0.26], [0.062, 0.3], [0.05, 0.335], [0.062, 0.352], [0.054, 0.36], [0.043, 0.352], [0.04, 0.32], [0, 0.31]];
  b.add('clay', lathe(prof, 36));
  b.add('clay', tube([[0.056, 0.332], [0.11, 0.345], [0.15, 0.295], [0.146, 0.22], [0.122, 0.17]], 0.0105));
  b.add('darkWood', hoop(0.127, 0.0035, 36), [0, 0.12, 0]);
  b.add('darkWood', hoop(0.13, 0.0035, 36), [0, 0.18, 0]);
  b.add('oak', G.cylinder(0.045, 0.04, 0.03, 14, { y0: 0.34 }));
}

/** Wine amphora with two strap handles, wax seal and a three-legged oak stand with a ring. */
function amphora(b) {
  const prof = [[0, 0], [0.022, 0.01], [0.05, 0.09], [0.14, 0.25], [0.19, 0.42], [0.2, 0.5], [0.17, 0.62], [0.1, 0.72], [0.065, 0.76], [0.06, 0.84], [0.075, 0.862], [0.086, 0.876], [0.062, 0.884], [0.046, 0.872], [0.049, 0.78], [0, 0.7]];
  b.add('clay', lathe(prof, 40));
  for (const sx of [-1, 1]) {
    b.add('clay', tube([[sx * 0.06, 0.832], [sx * 0.12, 0.845], [sx * 0.155, 0.775], [sx * 0.135, 0.705], [sx * 0.108, 0.69]], 0.014));
  }
  b.add('darkWood', hoop(0.197, 0.005, 40), [0, 0.46, 0]);
  b.add('darkWood', hoop(0.2, 0.006, 40), [0, 0.5, 0]);
  b.add('darkWood', hoop(0.192, 0.005, 40), [0, 0.54, 0]);
  b.add('wax', G.cylinder(0.044, 0.04, 0.03, 14, { y0: 0.856 }));
  b.add('oak', ringBand(0.19, 0.04, 0.05, 36), [0, 0.33, 0]);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    b.add('oak', G.rod([Math.cos(a) * 0.2, 0.345, Math.sin(a) * 0.2], [Math.cos(a) * 0.34, 0.025, Math.sin(a) * 0.34], 0.024, 8));
  }
}

/** Oak serving board with a pewter plate and round loaf, tankard, goblet of wine and a table knife. */
function pewterTableware(b) {
  const Y = 0.03;
  b.add('oak', bevelBlock(0.62, Y, 0.42, 0.007));

  // plate, loaf and bread slashes
  b.add('pewter', lathe([[0, 0.003], [0.1, 0.003], [0.125, 0.012], [0.142, 0.018], [0.14, 0.022], [0.127, 0.018], [0.1, 0.009], [0, 0.009]], 36), [-0.14, Y, 0.04]);
  const loaf = new THREE.SphereGeometry(0.074, 24, 14);
  loaf.scale(1, 0.58, 0.96);
  b.add('bread', G.boxUV(loaf), [-0.14, Y + 0.05, 0.04]);
  for (const dx of [-0.024, 0, 0.024]) b.add('darkWood', bevelBox(0.05, 0.006, 0.007, 0.0015), [-0.14 + dx, Y + 0.089, 0.04], 0.8);

  // tankard with a loop handle and two bands
  b.add('pewter', lathe([[0, 0], [0.047, 0], [0.052, 0.012], [0.059, 0.13], [0.061, 0.134], [0.055, 0.134], [0.051, 0.12], [0.046, 0.014], [0, 0.014]], 30), [0.12, Y, -0.08]);
  b.add('pewter', tube([[0.058, 0.12], [0.1, 0.12], [0.108, 0.075], [0.075, 0.03], [0.052, 0.028]], 0.0075), [0.12, Y, -0.08]);
  b.add('pewter', hoop(0.0538, 0.003, 28), [0.12, Y + 0.04, -0.08]);
  b.add('pewter', hoop(0.0575, 0.003, 28), [0.12, Y + 0.1, -0.08]);

  // goblet with a knopped stem and wine
  const gob = [[0, 0], [0.035, 0], [0.038, 0.008], [0.014, 0.022], [0.01, 0.07], [0.019, 0.078], [0.011, 0.09], [0.038, 0.11], [0.049, 0.14], [0.048, 0.165], [0.043, 0.165], [0.043, 0.14], [0.033, 0.11], [0, 0.1]];
  b.add('pewter', lathe(gob, 30), [0.17, Y, 0.1]);
  b.add('wine', G.cylinder(0.04, 0.04, 0.002, 18, { y0: 0.145 }), [0.17, Y, 0.1]);

  b.push([-0.12, Y, -0.175], 0.12);
  addKnife(b);
  b.pop();
}

/** Butcher table: thick plank top, apron and lower shelf, cleaver stuck in the top, cutting board with a knife and a hook rail. */
function butcherTable(b) {
  const L = 1.2;
  const W = 0.62;
  const H = 0.84;
  const T = 0.07;
  const pw = (W - 0.006) / 3;
  for (let i = 0; i < 3; i++) b.add('oak', bevelBlock(L, T, pw, 0.006), [0, H - T, -W / 2 + pw / 2 + i * (pw + 0.003)]);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) b.add('darkWood', bevelBlock(0.07, H - T, 0.07, 0.007), [sx * (L / 2 - 0.06), 0, sz * (W / 2 - 0.06)]);
    b.add('darkWood', bevelBlock(0.035, 0.08, W - 0.2, 0.005), [sx * (L / 2 - 0.06), H - T - 0.08, 0]);
  }
  for (const sz of [-1, 1]) {
    b.add('darkWood', bevelBlock(L - 0.2, 0.08, 0.035, 0.005), [0, H - T - 0.08, sz * (W / 2 - 0.06)]);
    b.add('darkWood', bevelBlock(L - 0.2, 0.05, 0.035, 0.005), [0, 0.14, sz * (W / 2 - 0.06)]);
  }
  b.add('oak', bevelBlock(L - 0.16, 0.024, W - 0.14, 0.004), [0, 0.19, 0]);

  // cleaver stuck into the top, handle tilted up
  b.push([-0.3, H - 0.015, 0.05], 0.4, 0, 0.18);
  b.add('steel', bevelBox(0.17, 0.1, 0.006, 0.002), [0, 0.05, 0]);
  b.add('steel', bevelBox(0.17, 0.012, 0.014, 0.002), [0, 0.1, 0]);
  b.add('gilt', G.cylinder(0.018, 0.018, 0.012, 10, { y0: -0.006 }), [0.09, 0.08, 0], 0, 0, Math.PI / 2);
  b.add('oak', G.cylinder(0.014, 0.016, 0.13, 10, { y0: -0.065 }), [0.155, 0.08, 0], 0, 0, Math.PI / 2);
  b.pop();

  // cutting board with a knife
  b.add('darkWood', bevelBlock(0.42, 0.03, 0.3, 0.006), [0.28, H, 0.04], 0.2);
  b.push([0.2, H + 0.03, 0.06], 0.15);
  addKnife(b);
  b.pop();

  // rail over the back edge with four iron hooks
  const zr = -(W / 2 - 0.06);
  for (const sx of [-1, 1]) b.add('darkWood', bevelBlock(0.045, 0.62, 0.045, 0.006), [sx * (L / 2 - 0.06), H, zr]);
  b.add('darkWood', bevelBlock(L - 0.02, 0.05, 0.045, 0.006), [0, H + 0.58, zr]);
  for (const x of [-0.36, -0.12, 0.12, 0.36]) {
    b.add('iron', G.boxUV(new THREE.TorusGeometry(0.014, 0.0045, 5, 10)), [x, H + 0.572, zr]);
    b.add('iron', tube([[0, 0], [0, -0.1], [0.005, -0.17], [0.035, -0.205], [0.062, -0.175], [0.055, -0.145]], 0.0055), [x, H + 0.57, zr]);
  }
}

const def = (id, name, description, fn) => ({
  id,
  name,
  category: 'kitchen',
  description,
  build(M) {
    const b = newBuilder(M);
    fn(b);
    return b.build(id);
  },
});

export const kitchenModules = [
  def('cauldron_tripod', 'Cauldron on tripod', 'Bellied iron cauldron with rivet band, bail and chain, hung from a rope-lashed timber tripod over a log fire in a ring of hearth stones.', cauldronTripod),
  def('jug_clay', 'Clay jug', 'Terracotta jug 0.36 m high with flared neck, loop handle, cork stopper and two incised bands.', clayJug),
  def('amphora_wine', 'Wine amphora on stand', 'Pointed 0.88 m terracotta amphora with strap handles, painted bands and wax seal, on a three-legged oak ring stand.', amphora),
  def('tableware_pewter', 'Pewter tableware board', 'Oak serving board with a pewter plate and round loaf, tankard, wine goblet and a table knife.', pewterTableware),
  def('table_butcher', 'Butcher table', 'Plank-top butcher table with apron and lower shelf, a cleaver stuck in the top, a cutting board with knife and a rail with four iron hooks.', butcherTable),
];
