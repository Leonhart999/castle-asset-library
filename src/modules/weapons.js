// Realistic medieval weapons & armoury: fullered arming sword with spiral leather grip, bevel-edged halberd,
// rim-bound & riveted heater shield, weapon rack with kettle helmet, and coiled-straw archery target.
// Base sits at y = 0, centred on x = z = 0, 1 unit = 1 m.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { newBuilder, lathe, bevelBlock, bevelBox, rivets, flatScroll } from '../lib/kit.js';

/** Double-edged blade with medial fuller groove and bevelled edges from tip y=0 to shoulder y=len. */
function bladeGeom(len = 0.88, maxW = 0.056, thick = 0.011) {
  const stations = [
    [0, 0.001, 0.001, 0],
    [0.08, maxW * 0.62, thick * 0.72, 0],
    [0.2, maxW * 0.76, thick * 0.86, 0.45],
    [0.55, maxW * 0.88, thick * 0.94, 0.52],
    [0.82, maxW * 0.98, thick, 0.45],
    [len, maxW, thick, 0],
  ];
  const ring = (y, w, t, fuller) => {
    const hw = w / 2;
    const sw = w * 0.16;
    const ht = t / 2;
    const ft = ht * (1 - fuller);
    return [
      [hw, y, 0],
      [sw, y, ht],
      [0, y, ft],
      [-sw, y, ht],
      [-hw, y, 0],
      [-sw, y, -ht],
      [0, y, -ft],
      [sw, y, -ht],
    ];
  };
  const v = [];
  const tri = (a, b2, c) => v.push(...a, ...b2, ...c);
  for (let i = 0; i < stations.length - 1; i++) {
    const r0 = ring(...stations[i]);
    const r1 = ring(...stations[i + 1]);
    for (let k = 0; k < 8; k++) {
      const n = (k + 1) % 8;
      tri(r0[k], r1[k], r1[n]);
      tri(r0[k], r1[n], r0[n]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return G.boxUV(g);
}

/** Places a detailed arming sword with tip at y = 0. */
export function addSword(b) {
  b.add('steel', bladeGeom(0.88, 0.056, 0.011));
  // gently drooped forged quillon crossguard with flared terminals and central ecusson block
  b.add('iron', flatScroll([[-0.125, -0.016], [-0.06, -0.004], [0, 0], [0.06, -0.004], [0.125, -0.016]], 0.016, 0.024, 16), [0, 0.885, 0]);
  for (const sx of [-1, 1]) b.add('iron', new THREE.SphereGeometry(0.014, 10, 8), [sx * 0.128, 0.868, 0]);
  b.add('iron', bevelBox(0.062, 0.028, 0.03, 0.005), [0, 0.885, 0]);

  // spiral cord-wrapped leather grip
  const grip = new THREE.CylinderGeometry(0.0145, 0.018, 0.17, 16, 20);
  grip.translate(0, 0.985, 0);
  const pos = grip.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const rr = Math.hypot(x, z);
    if (rr > 0.005) {
      const a = Math.atan2(z, x);
      const ridge = 1 + 0.075 * Math.sin(y * 145 + a * 2);
      pos.setX(i, x * ridge * 1.15);
      pos.setZ(i, z * ridge * 0.72);
    }
  }
  grip.computeVertexNormals();
  b.add('leather', G.cylUV(grip, 0.018));
  // brass grip ferrule & wheel pommel with raised central boss
  b.add('gilt', G.cylinder(0.019, 0.02, 0.016, 14, { y0: 0.898 }));
  const pommel = lathe(
    [
      [0, -0.014],
      [0.018, -0.014],
      [0.032, -0.007],
      [0.034, 0],
      [0.032, 0.007],
      [0.018, 0.014],
      [0, 0.014],
    ],
    18,
  );
  pommel.rotateX(Math.PI / 2);
  b.add('iron', pommel, [0, 1.1, 0]);
  const boss = G.cylinder(0.016, 0.019, 0.032, 14);
  boss.rotateX(Math.PI / 2);
  b.add('gilt', boss, [0, 1.1, 0]);
  b.add('iron', G.cylinder(0.006, 0.008, 0.022, 8), [0, 1.135, 0]);
}

/** Builds a wedged/bevel-edged blade from a 2D spine-to-edge outline. */
function wedgedBlade(spinePts, edgePts, spineHalfT = 0.007, edgeHalfT = 0.0008) {
  const v = [];
  const tri = (a, b2, c) => v.push(...a, ...b2, ...c);
  for (let i = 0; i < spinePts.length - 1; i++) {
    const [sx0, sy0] = spinePts[i];
    const [sx1, sy1] = spinePts[i + 1];
    const [ex0, ey0] = edgePts[i];
    const [ex1, ey1] = edgePts[i + 1];
    const sf0 = [sx0, sy0, spineHalfT];
    const sb0 = [sx0, sy0, -spineHalfT];
    const sf1 = [sx1, sy1, spineHalfT];
    const sb1 = [sx1, sy1, -spineHalfT];
    const ef0 = [ex0, ey0, edgeHalfT];
    const eb0 = [ex0, ey0, -edgeHalfT];
    const ef1 = [ex1, ey1, edgeHalfT];
    const eb1 = [ex1, ey1, -edgeHalfT];
    // front bevel, back bevel, spine face, cutting edge
    tri(sf0, ef0, ef1);
    tri(sf0, ef1, sf1);
    tri(sb0, sb1, eb1);
    tri(sb0, eb1, eb0);
    tri(sb0, sf0, sf1);
    tri(sb0, sf1, sb1);
    tri(ef0, eb0, eb1);
    tri(ef0, eb1, ef1);
  }
  // top & bottom caps
  const n = spinePts.length - 1;
  tri([spinePts[0][0], spinePts[0][1], spineHalfT], [spinePts[0][0], spinePts[0][1], -spineHalfT], [edgePts[0][0], edgePts[0][1], -edgeHalfT]);
  tri([spinePts[0][0], spinePts[0][1], spineHalfT], [edgePts[0][0], edgePts[0][1], -edgeHalfT], [edgePts[0][0], edgePts[0][1], edgeHalfT]);
  tri([spinePts[n][0], spinePts[n][1], spineHalfT], [edgePts[n][0], edgePts[n][1], edgeHalfT], [edgePts[n][0], edgePts[n][1], -edgeHalfT]);
  tri([spinePts[n][0], spinePts[n][1], spineHalfT], [edgePts[n][0], edgePts[n][1], -edgeHalfT], [spinePts[n][0], spinePts[n][1], -spineHalfT]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return G.boxUV(g);
}

/** Places a detailed medieval halberd with butt spike at y = 0. */
export function addHalberd(b) {
  b.add('iron', G.cylinder(0.019, 0.004, 0.08, 8, { y0: 0 })); // butt spike
  b.add('darkWood', G.cylinder(0.019, 0.02, 1.76, 8, { y0: 0.08 })); // octagonal ash haft
  // iron langets + brass rivets flanking the upper haft
  for (const sx of [-1, 1]) {
    b.add('iron', bevelBlock(0.008, 0.36, 0.022, 0.002), [sx * 0.02, 1.54, 0]);
    rivets(b, 'gilt', [[sx * 0.025, 1.58, 0], [sx * 0.025, 1.68, 0], [sx * 0.025, 1.78, 0]], 0.0045);
  }
  b.add('steel', G.cylinder(0.023, 0.023, 0.22, 8, { y0: 1.72 })); // forged socket collar
  b.add('steel', G.cylinder(0.002, 0.026, 0.38, 4, { y0: 1.93 })); // four-sided armour-piercing spike
  // bevelled crescent axe blade on +X
  b.add(
    'steel',
    wedgedBlade(
      [[0.02, 1.74], [0.075, 1.76], [0.085, 1.82], [0.075, 1.88], [0.02, 1.9]],
      [[0.165, 1.67], [0.205, 1.74], [0.215, 1.82], [0.205, 1.9], [0.16, 1.96]],
    ),
  );
  // bevelled rear armour-piercing fluke on -X
  b.add(
    'steel',
    wedgedBlade(
      [[-0.02, 1.85], [-0.08, 1.84], [-0.155, 1.79]],
      [[-0.02, 1.8], [-0.085, 1.795], [-0.155, 1.788]],
    ),
  );
}

/** Curves any geometry gently around the Y axis so shields wrap around the bearer. */
function bendX(geom, k = 0.45) {
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, pos.getZ(i) - k * x * x);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

/** Places a curved rim-bound & riveted heater shield with point at y = 0, front facing +Z. */
export function addShield(b) {
  const W = 0.62;
  const H = 0.84;
  const hw = W / 2;
  const outlinePts = [];
  const segs = 10;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = t * hw;
    const y = t < 0.6 ? (t / 0.6) * H * 0.62 * (0.65 + 0.35 * (t / 0.6)) : H * 0.62 + ((t - 0.6) / 0.4) * H * 0.38;
    outlinePts.push([x, y]);
  }
  for (let i = 1; i <= 8; i++) outlinePts.push([hw - (i / 8) * W, H]);
  for (let i = segs; i >= 1; i--) {
    const t = i / segs;
    const x = -t * hw;
    const y = t < 0.6 ? (t / 0.6) * H * 0.62 * (0.65 + 0.35 * (t / 0.6)) : H * 0.62 + ((t - 0.6) / 0.4) * H * 0.38;
    outlinePts.push([x, y]);
  }
  const smooth = new THREE.Shape(outlinePts.map(([x, y]) => new THREE.Vector2(x, y)));
  smooth.closePath();

  const body = new THREE.ExtrudeGeometry(smooth, { depth: 0.026, bevelEnabled: false });
  body.translate(0, 0, -0.013);
  b.add('oak', bendX(G.boxUV(body)));

  // crimson fabric front face
  const face = new THREE.ExtrudeGeometry(smooth, { depth: 0.005, bevelEnabled: false });
  face.scale(0.92, 0.92, 1);
  face.translate(0, H * 0.04, 0.013);
  b.add('fabric', bendX(G.boxUV(face)));

  // raised iron perimeter rim binding wrapping the shield edge + brass rivets
  const curvePts = outlinePts.map(([x, y]) => new THREE.Vector3(x * 0.975, y * 0.98 + H * 0.01, 0.002 - 0.45 * (x * 0.975) * (x * 0.975)));
  const rimCurve = new THREE.CatmullRomCurve3(curvePts, true);
  b.add('iron', G.boxUV(new THREE.TubeGeometry(rimCurve, 56, 0.016, 7, true)));
  const rPts = [];
  for (let i = 0; i < 20; i++) {
    const p = rimCurve.getPointAt(i / 20);
    rPts.push([p.x * 0.94, p.y * 0.96 + H * 0.02, p.z + 0.018]);
  }
  rivets(b, 'gilt', rPts, 0.0065);

  // gilt heraldic cross + central steel umbo boss
  b.add('gilt', bendX(bevelBlock(0.055, H * 0.84, 0.01, 0.003).translate(0, H * 0.08, 0.02)));
  b.add('gilt', bendX(bevelBlock(W * 0.84, 0.055, 0.01, 0.003).translate(0, H * 0.59, 0.02)));
  b.add('steel', lathe([[0.068, 0], [0.068, 0.01], [0.045, 0.014], [0.032, 0.042], [0.015, 0.056], [0, 0.06]], 18), [0, H * 0.62, 0.018], 0, Math.PI / 2);

  // padded leather forearm cushion & riveted leather grip straps on the back (-Z)
  b.add('leather', bendX(bevelBox(0.18, 0.24, 0.024, 0.008).translate(0, H * 0.52, -0.022)));
  for (const x of [-0.07, 0.09]) {
    b.add('leather', bendX(bevelBox(0.034, 0.22, 0.024, 0.005).translate(x, H * 0.52, -0.038)));
  }
}

/** Medieval iron kettle helmet (Eisenhut) for hanging on the weapon rack post. */
function addKettleHelmet(b, pos, rotY = 0) {
  b.push(pos, rotY);
  const pts = [
    [0.2, -0.01],
    [0.21, 0.0],
    [0.14, 0.04],
    [0.128, 0.07],
    [0.125, 0.14],
    [0.095, 0.2],
    [0.045, 0.23],
    [0, 0.24],
  ];
  b.add('steel', lathe(pts, 24));
  // riveted brow band + central comb ridge
  b.add('iron', G.cylinder(0.132, 0.132, 0.024, 24, { y0: 0.055 }));
  b.add('steel', bevelBox(0.022, 0.06, 0.25, 0.005), [0, 0.21, 0]);
  b.pop();
}

function weaponRack(b) {
  const W = 1.58;
  const D = 0.58;
  const H = 1.48;
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 - 0.08);
    b.add('darkWood', bevelBlock(0.095, 0.075, D, 0.008), [x, 0, 0]);
    b.push([x, 0, 0], Math.PI / 2);
    b.add('oak', G.beamXY(-D / 2 + 0.045, 0.07, -0.025, H, 0.065, 0.065, 0));
    b.add('oak', G.beamXY(D / 2 - 0.045, 0.07, 0.025, H, 0.065, 0.065, 0));
    b.pop();
    // iron brackets reinforcing the A-frame feet
    b.add('iron', bevelBlock(0.11, 0.085, 0.1, 0.004), [x, 0, 0]);
  }
  // bottom trough with front lip & top notched crossbar
  b.add('darkWood', bevelBlock(W - 0.1, 0.055, 0.25, 0.007), [0, 0.12, 0]);
  b.add('oak', bevelBlock(W - 0.1, 0.045, 0.035, 0.004), [0, 0.16, 0.11]);
  b.add('oak', bevelBlock(W - 0.1, 0.075, 0.075, 0.007), [0, 1.04, -0.055]);
  // decorative iron crest rail at top
  b.add('iron', bevelBlock(W - 0.08, 0.045, 0.085, 0.005), [0, H - 0.055, 0]);
  rivets(b, 'gilt', [[-0.68, H - 0.032, 0.045], [0, H - 0.032, 0.045], [0.68, H - 0.032, 0.045]], 0.008);

  for (const x of [-0.46, -0.18, 0.1]) {
    b.push([x, 0.175, 0.02], 0, -0.095);
    addHalberd(b);
    b.pop();
  }
  for (const x of [0.36, 0.54]) {
    b.push([x, 0.175, 0.03], 0, -0.095);
    addSword(b);
    b.pop();
  }
  // heater shield leaning against the right standard, kettle helmet perched on left horn
  b.push([W / 2 + 0.06, 0.02, 0.06], 0.35, 0, -0.14);
  addShield(b);
  b.pop();
  addKettleHelmet(b, [-W / 2 + 0.08, H - 0.02, 0], 0.25);
}

function archeryTarget(b) {
  // round rough-hewn timber poles forming a tripod (shifted up so lowest tilted edge stays at y >= 0)
  for (const sx of [-1, 1]) {
    b.add('darkWood', G.rod([sx * 0.42, 0.02, 0.22], [sx * 0.05, 1.58, 0.08], 0.032, 10));
  }
  b.add('darkWood', G.rod([0, 0.02, -0.46], [0, 1.54, 0.06], 0.032, 10));
  // rope lashing binding the tripod apex
  for (let i = 0; i < 4; i++) {
    const r = new THREE.TorusGeometry(0.062, 0.009, 6, 16);
    r.rotateX(Math.PI / 2 + 0.25 * (i % 2 ? 1 : -1));
    b.add('straw', G.boxUV(r), [0, 1.46 + i * 0.015, 0.08]);
  }
  // horizontal support peg bar
  b.add('oak', bevelBlock(0.88, 0.065, 0.055, 0.007), [0, 0.62, 0.12]);

  // coiled straw rope boss built from concentric stacked torus coils + timber backing cross
  b.push([0, 1.05, 0.14], 0, -0.12);
  b.add('darkWood', bevelBox(0.68, 0.06, 0.025, 0.004), [0, 0, -0.065]);
  b.add('darkWood', bevelBox(0.06, 0.68, 0.025, 0.004), [0, 0, -0.065]);
  for (let i = 0; i < 10; i++) {
    const r = 0.038 + i * 0.042;
    const coil = new THREE.TorusGeometry(r, 0.026, 8, Math.max(14, Math.round(r * 70)));
    b.add('straw', G.boxUV(coil), [0, 0, 0]);
    const backCoil = new THREE.TorusGeometry(r, 0.024, 7, Math.max(14, Math.round(r * 65)));
    b.add('straw', G.boxUV(backCoil), [0, 0, -0.036]);
  }
  // painted linen target face rings stepped cleanly forward
  const ring = (r, z, mat) => {
    const c = G.cylinder(r, r, 0.006, 28);
    c.rotateX(Math.PI / 2);
    b.add(mat, c, [0, 0, z]);
  };
  ring(0.35, 0.028, 'linen');
  ring(0.23, 0.032, 'fabric');
  ring(0.105, 0.036, 'gilt');

  // 3 arrows with steel bodkin heads, wood shafts and 3-vaned fletching
  for (const [ax, ay, rx, ry] of [
    [-0.03, 0.02, 0.07, -0.09],
    [0.08, -0.04, -0.05, 0.11],
    [0.16, 0.12, 0.09, 0.07],
  ]) {
    b.push([ax, ay, 0.025], ry, rx);
    b.add('oak', G.cylinder(0.0048, 0.0048, 0.56, 8), [0, 0, 0.25], 0, Math.PI / 2);
    b.add('steel', G.cylinder(0.001, 0.007, 0.035, 4), [0, 0, -0.02], 0, -Math.PI / 2);
    for (let f = 0; f < 3; f++) {
      b.push([0, 0, 0.48], 0, 0, (f * Math.PI * 2) / 3);
      b.add(f === 0 ? 'fabric' : 'linen', bevelBox(0.0025, 0.018, 0.095, 0.0005), [0, 0.01, 0]);
      b.pop();
    }
    b.pop();
  }
  b.pop();
}

export const weaponModules = [
  {
    id: 'sword_arming',
    name: 'Arming sword',
    category: 'weapon',
    description: '1.15 m knightly sword with fullered steel blade, drooped quillons, spiral leather grip and bossed wheel pommel.',
    build(M) {
      const b = newBuilder(M);
      addSword(b);
      return b.build('sword_arming');
    },
  },
  {
    id: 'halberd',
    name: 'Medieval halberd',
    category: 'weapon',
    description: '2.31 m polearm with bevel-edged crescent axe, rear fluke, riveted iron langets and octagonal ash haft.',
    build(M) {
      const b = newBuilder(M);
      addHalberd(b);
      return b.build('halberd');
    },
  },
  {
    id: 'shield_heater',
    name: 'Heater shield',
    category: 'weapon',
    description: 'Curved oak and crimson damask shield with iron perimeter binding, brass rivets, steel umbo boss and leather straps.',
    build(M) {
      const b = newBuilder(M);
      addShield(b);
      return b.build('shield_heater');
    },
  },
  {
    id: 'weapon_rack',
    name: 'Armoury weapon rack',
    category: 'weapon',
    description: 'Timber A-frame armoury rack holding three halberds, two swords, a leaning shield and a steel kettle helmet.',
    build(M) {
      const b = newBuilder(M);
      weaponRack(b);
      return b.build('weapon_rack');
    },
  },
  {
    id: 'archery_target',
    name: 'Archery target',
    category: 'weapon',
    description: 'Coiled-straw rope target boss on a rope-lashed timber tripod, with linen rings and three fletched arrows.',
    build(M) {
      const b = newBuilder(M);
      archeryTarget(b);
      return b.build('archery_target');
    },
  },
];
