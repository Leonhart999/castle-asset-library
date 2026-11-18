// Lighting props: wall torch bracket, twin candle sconce, wheel chandelier, standing iron brazier and floor candelabra.
// All pieces sit with lowest point at y = 0, centred on x = z = 0 (wall mounts back onto z = 0), 1 unit = 1 m.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { newBuilder, lathe, ringBand, candle } from '../lib/kit.js';

/** Smooth curved iron bar along a 3D Catmull-Rom path. */
function tube(pts, r = 0.014, segs = 18) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  return G.boxUV(new THREE.TubeGeometry(curve, segs, r, 8, false));
}

function wallTorch(b) {
  // iron backplate resting on z = 0, base at y = 0
  b.add('iron', G.block(0.11, 0.4, 0.018), [0, 0, 0.01]);
  b.add('iron', G.cylinder(0.045, 0.045, 0.018, 12), [0, 0.4, 0.01], 0, Math.PI / 2);
  // iron bracket ring holding the angled wooden torch
  b.add('iron', G.block(0.04, 0.03, 0.16), [0, 0.25, 0.09]);
  b.add('iron', ringBand(0.055, 0.015, 0.04, 16), [0, 0.24, 0.18], 0, 0.45);
  // angled wooden torch body + cloth wrap + glowing embers and flame
  b.push([0, 0.04, 0.07], 0, 0.45);
  b.add('darkWood', G.cylinder(0.04, 0.025, 0.56, 12, { y0: 0 }));
  b.add('linen', G.cylinder(0.05, 0.044, 0.14, 12, { y0: 0.45 }));
  b.add('ember', G.cylinder(0.052, 0.045, 0.07, 12, { y0: 0.58 }));
  const fl = lathe([[0, 0], [0.045, 0.03], [0.035, 0.09], [0.012, 0.16], [0, 0.21]], 12);
  b.add('flame', fl, [0, 0.64, 0]);
  b.pop();
}

function candleSconce(b) {
  // shield-shaped wall backplate at z = 0, base at y = 0
  b.add('iron', G.block(0.14, 0.38, 0.016), [0, 0, 0.008]);
  b.add('iron', G.cylinder(0.07, 0.07, 0.016, 16), [0, 0.38, 0.008], 0, Math.PI / 2);
  b.add('gilt', G.block(0.05, 0.12, 0.022), [0, 0.18, 0.012]);
  // twin scrolling iron arms + candles
  for (const sx of [-1, 1]) {
    b.add('iron', tube([[0, 0.18, 0.02], [sx * 0.08, 0.1, 0.14], [sx * 0.16, 0.16, 0.22], [sx * 0.16, 0.23, 0.22]], 0.011, 16));
    candle(b, [sx * 0.16, 0.23, 0.22], { h: 0.19, r: 0.022, panR: 0.05 });
  }
}

function wheelChandelier(b) {
  const R = 0.85;
  const ringY = 0;
  // main forged iron wheel ring
  b.add('iron', ringBand(R, 0.035, 0.09, 48), [0, ringY, 0]);
  b.add('iron', ringBand(R - 0.06, 0.025, 0.03, 48), [0, ringY + 0.02, 0]);
  // 8 candle brackets around the circumference + radial struts to inner ring
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    b.add('iron', G.block(0.025, 0.08, 0.09), [ca * (R - 0.03), ringY + 0.01, sa * (R - 0.03)], Math.PI / 2 - a);
    candle(b, [ca * R, ringY + 0.09, sa * R], { h: 0.22, r: 0.024, panR: 0.055 });
  }
  // 4 chains converging to the top suspension hook (y = 1.45)
  const topY = 1.33;
  b.add('iron', ringBand(0.065, 0.018, 0.03, 20), [0, topY, 0], 0, Math.PI / 2);
  b.add('iron', G.cylinder(0.015, 0.015, 0.12, 8, { y0: topY + 0.04 }));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const p0 = new THREE.Vector3(Math.cos(a) * R, ringY + 0.09, Math.sin(a) * R);
    const p1 = new THREE.Vector3(0, topY, 0);
    const dir = p1.clone().sub(p0);
    const links = 18;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    for (let k = 0; k < links; k++) {
      const pos = p0.clone().lerp(p1, (k + 0.5) / links);
      const link = new THREE.TorusGeometry(0.028, 0.008, 5, 10);
      link.scale(0.65, 1.5, 1);
      if (k % 2) link.rotateY(Math.PI / 2);
      link.applyQuaternion(q);
      b.add('iron', G.boxUV(link), [pos.x, pos.y, pos.z]);
    }
  }
}

function standingBrazier(b) {
  // 4 curved splayed iron legs meeting at two collar rings
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    b.add('iron', tube([[ca * 0.34, 0.02, sa * 0.34], [ca * 0.24, 0.3, sa * 0.24], [ca * 0.2, 0.65, sa * 0.2], [ca * 0.29, 0.85, sa * 0.29]], 0.018, 16));
    b.add('iron', G.cylinder(0.032, 0.038, 0.025, 10, { y0: 0 }), [ca * 0.34, 0, sa * 0.34]);
  }
  b.add('iron', ringBand(0.22, 0.022, 0.04, 24), [0, 0.32, 0]);
  b.add('iron', ringBand(0.21, 0.024, 0.045, 24), [0, 0.66, 0]);
  // flared fire basket with 12 curved iron ribs + top rim
  b.add('iron', G.cylinder(0.2, 0.16, 0.03, 18, { y0: 0.72 }));
  b.add('iron', ringBand(0.35, 0.025, 0.045, 32), [0, 0.98, 0]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    b.add('iron', tube([[ca * 0.18, 0.74, sa * 0.18], [ca * 0.31, 0.86, sa * 0.31], [ca * 0.36, 1.01, sa * 0.36]], 0.011, 10));
  }
  // bed of glowing charcoal embers + low flames inside the basket
  b.add('ember', G.cylinder(0.28, 0.19, 0.14, 16, { y0: 0.75 }));
  for (const [fx, fz, h] of [[-0.08, 0.04, 0.18], [0.09, -0.05, 0.15], [0, 0.01, 0.22]]) {
    const fl = lathe([[0, 0], [0.045, 0.03], [0.032, h * 0.45], [0.01, h * 0.8], [0, h]], 10);
    b.add('flame', fl, [fx, 0.88, fz]);
  }
}

function floorCandelabra(b) {
  // tripod scrolled feet
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    b.add('iron', tube([[ca * 0.26, 0.015, sa * 0.26], [ca * 0.16, 0.07, sa * 0.16], [ca * 0.03, 0.26, sa * 0.03]], 0.016, 14));
  }
  // central wrought-iron shaft with decorative turned collars
  b.add('iron', G.cylinder(0.022, 0.03, 1.18, 12, { y0: 0.08 }));
  for (const y of [0.28, 0.65, 1.02]) {
    b.add('iron', lathe([[0, 0], [0.04, 0.02], [0.045, 0.04], [0.025, 0.06]], 14), [0, y, 0]);
  }
  // centre candle + 4 scrolled branch arms with candles
  candle(b, [0, 1.26, 0], { h: 0.24, r: 0.024, panR: 0.06 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    b.add('iron', tube([[0, 1.05, 0], [ca * 0.12, 1.02, sa * 0.12], [ca * 0.22, 1.12, sa * 0.22], [ca * 0.22, 1.18, sa * 0.22]], 0.011, 14));
    candle(b, [ca * 0.22, 1.18, sa * 0.22], { h: 0.2, r: 0.021, panR: 0.05 });
  }
}

export const lightingModules = [
  {
    id: 'torch_wall',
    name: 'Wall torch & bracket',
    category: 'lighting',
    description: 'Forged iron wall bracket holding an angled timber torch with cloth wrap, embers and flame.',
    build(M) {
      const b = newBuilder(M);
      wallTorch(b);
      return b.build('torch_wall');
    },
  },
  {
    id: 'sconce_candle',
    name: 'Twin candle sconce',
    category: 'lighting',
    description: 'Wall-mounted wrought-iron sconce with gilt crest and two lit beeswax candles.',
    build(M) {
      const b = newBuilder(M);
      candleSconce(b);
      return b.build('sconce_candle');
    },
  },
  {
    id: 'chandelier_wheel',
    name: 'Iron wheel chandelier',
    category: 'lighting',
    description: '1.7 m forged iron wheel chandelier with 8 candles, drip pans and 4 link chains to a top hook.',
    build(M) {
      const b = newBuilder(M);
      wheelChandelier(b);
      return b.build('chandelier_wheel');
    },
  },
  {
    id: 'brazier_standing',
    name: 'Standing iron brazier',
    category: 'lighting',
    description: 'Four-legged wrought-iron fire basket filled with glowing charcoal embers and flames.',
    build(M) {
      const b = newBuilder(M);
      standingBrazier(b);
      return b.build('brazier_standing');
    },
  },
  {
    id: 'candelabra_floor',
    name: 'Floor candelabra',
    category: 'lighting',
    description: '1.5 m tripod wrought-iron standing candelabra holding five lit beeswax candles.',
    build(M) {
      const b = newBuilder(M);
      floorCandelabra(b);
      return b.build('candelabra_floor');
    },
  },
];
