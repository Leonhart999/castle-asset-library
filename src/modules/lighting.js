// Realistic medieval lighting: forged iron wall torch with wrapped cloth, gothic twin candle sconce,
// spoked iron wheel chandelier, scrolled standing brazier with charcoal chunks, and floor candelabra.
// All pieces sit with lowest point at y = 0, centred on x = z = 0 (wall mounts back onto z = 0), 1 unit = 1 m.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { newBuilder, lathe, ringBand, candle, bevelBox, rivets, flatScroll, charcoalLump, softFlame } from '../lib/kit.js';

function wallTorch(b) {
  // pointed gothic iron backplate at z = 0, flush at y = 0
  const plate = new THREE.Shape();
  plate.moveTo(0, 0.005);
  plate.lineTo(0.055, 0.07);
  plate.lineTo(0.055, 0.38);
  plate.quadraticCurveTo(0.055, 0.45, 0, 0.49);
  plate.quadraticCurveTo(-0.055, 0.45, -0.055, 0.38);
  plate.lineTo(-0.055, 0.07);
  plate.closePath();
  const pg = new THREE.ExtrudeGeometry(plate, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1, curveSegments: 10 });
  b.add('iron', G.boxUV(pg), [0, 0, 0.003]);
  rivets(b, 'iron', [[0, 0.06, 0.02], [0, 0.43, 0.02], [-0.032, 0.25, 0.02], [0.032, 0.25, 0.02]], 0.007);

  // brackets connect backplate (z = 0.015) straight to the two tight collar rings on the angled shaft
  // shaft local origin at [0, 0.03, 0.075], tilted +0.45 rad around X: y(h)=0.03+h*0.9004, z(h)=0.075+h*0.4350
  b.add('iron', flatScroll([[0.015, 0.32], [0.09, 0.31], [0.16, 0.29], [0.195, 0.285]], 0.02, 0.008, 16), [0, 0, 0], -Math.PI / 2);
  b.add('iron', flatScroll([[0.015, 0.14], [0.07, 0.13], [0.12, 0.125]], 0.018, 0.008, 12), [0, 0, 0], -Math.PI / 2);

  // angled carved timber torch + tight coaxial collar rings + oil-soaked linen + embers
  b.push([0, 0.03, 0.075], 0, 0.45);
  b.add('darkWood', lathe([[0, 0], [0.018, 0], [0.023, 0.12], [0.03, 0.32], [0.042, 0.48], [0, 0.48]], 14));
  // coaxial iron collar bands gripping the shaft tightly at h = 0.11 (r~0.023) and h = 0.285 (r~0.029)
  b.add('iron', ringBand(0.027, 0.01, 0.032, 16), [0, 0.095, 0]);
  b.add('iron', ringBand(0.034, 0.012, 0.038, 18), [0, 0.27, 0]);
  for (let i = 0; i < 4; i++) {
    const t = new THREE.TorusGeometry(0.045, 0.013, 7, 16);
    t.rotateX(Math.PI / 2 + (i % 2 ? 0.14 : -0.14));
    b.add('linen', G.boxUV(t), [0, 0.46 + i * 0.03, 0]);
  }
  b.add('ember', charcoalLump(0.056, 7), [0, 0.59, 0]);
  b.add('ember', charcoalLump(0.042, 12), [0.018, 0.62, -0.01]);
  b.pop();

  // flame burns vertically upward in world space at the torch head (h = 0.63)
  softFlame(b, [0, 0.03 + 0.63 * Math.cos(0.45), 0.075 + 0.63 * Math.sin(0.45)], 2.4);
}

function candleSconce(b) {
  // pointed gothic backplate with brass crest shield and forged rivets
  const plate = new THREE.Shape();
  plate.moveTo(0, 0.01);
  plate.lineTo(0.07, 0.07);
  plate.lineTo(0.075, 0.34);
  plate.quadraticCurveTo(0.07, 0.43, 0, 0.47);
  plate.quadraticCurveTo(-0.07, 0.43, -0.075, 0.34);
  plate.lineTo(-0.07, 0.07);
  plate.closePath();
  const pg = new THREE.ExtrudeGeometry(plate, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1, curveSegments: 10 });
  b.add('iron', G.boxUV(pg), [0, 0, 0.003]);
  b.add('gilt', bevelBox(0.05, 0.11, 0.012, 0.003), [0, 0.22, 0.018]);
  rivets(b, 'iron', [[0, 0.05, 0.02], [0, 0.41, 0.02], [-0.045, 0.33, 0.02], [0.045, 0.33, 0.02]], 0.007);

  // twin scrolling wrought-iron flat-bar arms sweeping forward & outward
  for (const sx of [-1, 1]) {
    b.add('iron', flatScroll([[0.01, 0.15], [0.07, 0.09], [0.16, 0.11], [0.22, 0.19], [0.22, 0.24]], 0.018, 0.008, 22), [0, 0, 0], -Math.PI / 2 + sx * 0.68);
    // small decorative inner scroll curl
    b.add('iron', flatScroll([[0.05, 0.11], [0.09, 0.16], [0.12, 0.13]], 0.012, 0.006, 12), [0, 0, 0], -Math.PI / 2 + sx * 0.68);
    const px = Math.sin(sx * 0.68) * 0.22;
    const pz = Math.cos(sx * 0.68) * 0.22;
    candle(b, [px, 0.24, pz], { h: 0.19, r: 0.022, panR: 0.054, seed: sx + 3 });
  }
}

function wheelChandelier(b) {
  const R = 0.85;
  const ringY = 0.01;
  // main forged iron band with upper & lower flanged rims
  b.add('iron', ringBand(R, 0.032, 0.095, 48), [0, ringY, 0]);
  b.add('iron', ringBand(R, 0.046, 0.016, 48), [0, ringY, 0]);
  b.add('iron', ringBand(R, 0.046, 0.016, 48), [0, ringY + 0.082, 0]);
  // 4 radial iron cross-spokes meeting at a central turned hub & lower drop finial
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    b.add('iron', bevelBox(R * 2 - 0.04, 0.035, 0.026, 0.004), [0, ringY + 0.045, 0], a);
  }
  b.add('iron', lathe([[0, -0.14], [0.025, -0.1], [0.055, -0.02], [0.075, 0.04], [0.045, 0.14], [0.035, 0.35], [0, 0.38]], 16), [0, ringY + 0.14, 0]);
  // 8 candle brackets with decorative riveted clamp plates + 8 drip-candles
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    b.add('iron', bevelBox(0.06, 0.11, 0.05, 0.004), [ca * (R + 0.01), ringY + 0.048, sa * (R + 0.01)], Math.PI / 2 - a);
    rivets(b, 'gilt', [[ca * (R + 0.036), ringY + 0.03, sa * (R + 0.036)], [ca * (R + 0.036), ringY + 0.07, sa * (R + 0.036)]], 0.006);
    candle(b, [ca * R, ringY + 0.098, sa * R], { h: 0.22, r: 0.024, panR: 0.058, seed: i + 1 });
  }
  // 4 forged eyelets on top of the band + chains converging to top suspension ring & hook
  const topY = 1.33;
  b.add('iron', ringBand(0.07, 0.018, 0.03, 20), [0, topY, 0], 0, Math.PI / 2);
  b.add('iron', flatScroll([[0, topY + 0.06], [0.04, topY + 0.12], [0, topY + 0.18], [-0.03, topY + 0.14]], 0.016, 0.012, 14));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const eye = new THREE.TorusGeometry(0.026, 0.008, 6, 14);
    b.add('iron', G.boxUV(eye), [Math.cos(a) * R, ringY + 0.105, Math.sin(a) * R], Math.PI / 2 - a);
    const p0 = new THREE.Vector3(Math.cos(a) * R, ringY + 0.115, Math.sin(a) * R);
    const p1 = new THREE.Vector3(0, topY, 0);
    const dir = p1.clone().sub(p0);
    const links = 18;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    for (let k = 0; k < links; k++) {
      const pos = p0.clone().lerp(p1, (k + 0.5) / links);
      const link = new THREE.TorusGeometry(0.028, 0.0075, 5, 10);
      link.scale(0.65, 1.5, 1);
      if (k % 2) link.rotateY(Math.PI / 2);
      link.applyQuaternion(q);
      b.add('iron', G.boxUV(link), [pos.x, pos.y, pos.z]);
    }
  }
}

function standingBrazier(b) {
  // 4 scrolled wrought-iron legs with outward curled feet and upper rivets
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = flatScroll(
      [[0.36, 0.04], [0.34, 0.012], [0.3, 0.04], [0.23, 0.3], [0.2, 0.65], [0.28, 0.84], [0.35, 0.96]],
      0.024,
      0.014,
      24,
    );
    b.add('iron', leg, [0, 0, 0], -a);
    rivets(b, 'iron', [[Math.cos(a) * 0.225, 0.32, Math.sin(a) * 0.225], [Math.cos(a) * 0.215, 0.66, Math.sin(a) * 0.215]], 0.009);
  }
  b.add('iron', ringBand(0.225, 0.02, 0.042, 28), [0, 0.3, 0]);
  b.add('iron', ringBand(0.21, 0.022, 0.048, 28), [0, 0.64, 0]);
  // fire basket: perforated hearth plate + 16 curved iron ribs with flared spear finials + heavy rim
  b.add('iron', G.cylinder(0.2, 0.16, 0.032, 20, { y0: 0.72 }));
  b.add('iron', ringBand(0.355, 0.024, 0.046, 36), [0, 0.96, 0]);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rib = flatScroll([[0.18, 0.73], [0.29, 0.83], [0.35, 0.96], [0.38, 1.03]], 0.016, 0.01, 14);
    b.add('iron', rib, [0, 0, 0], -a);
  }
  // bed of 20 irregular glowing charcoal chunks + 3 soft flickering flames
  b.add('ember', G.cylinder(0.22, 0.18, 0.06, 16, { y0: 0.75 }));
  let seed = 31;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 20; i++) {
    const r = Math.sqrt(rand()) * 0.24;
    const a = rand() * Math.PI * 2;
    const rad = 0.042 + rand() * 0.032;
    const y = 0.79 + (1 - r / 0.26) * 0.09 + rand() * 0.03;
    b.add('ember', charcoalLump(rad, i + 1), [Math.cos(a) * r, y, Math.sin(a) * r], rand() * Math.PI, rand() * Math.PI);
  }
  for (const [fx, fz, sc] of [[-0.08, 0.04, 2.3], [0.09, -0.05, 1.9], [0, 0.01, 2.7]]) {
    softFlame(b, [fx, 0.89, fz], sc);
  }
}

function floorCandelabra(b) {
  // tripod scrolled wrought-iron base feet (raised slightly so flat-bar thickness rests at y = 0)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const foot = flatScroll([[0.27, 0.048], [0.25, 0.012], [0.2, 0.032], [0.12, 0.08], [0.03, 0.28]], 0.022, 0.014, 18);
    b.add('iron', foot, [0, 0, 0], -a);
  }
  // turned multi-collar iron shaft
  b.add('iron', lathe([[0, 0.08], [0.045, 0.1], [0.03, 0.26], [0.048, 0.3], [0.026, 0.34], [0.025, 0.62], [0.048, 0.66], [0.023, 0.7], [0.022, 1.0], [0.045, 1.04], [0.02, 1.08], [0.02, 1.26], [0, 1.26]], 18));
  candle(b, [0, 1.26, 0], { h: 0.24, r: 0.024, panR: 0.06, seed: 1 });
  // 4 scrolled S-curve wrought-iron branch arms
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const arm = flatScroll([[0.02, 1.04], [0.11, 0.99], [0.2, 1.08], [0.23, 1.18]], 0.016, 0.008, 18);
    b.add('iron', arm, [0, 0, 0], -a);
    candle(b, [Math.cos(a) * 0.23, 1.18, Math.sin(a) * 0.23], { h: 0.2, r: 0.021, panR: 0.052, seed: i + 5 });
  }
}

export const lightingModules = [
  {
    id: 'torch_wall',
    name: 'Wall torch & bracket',
    category: 'lighting',
    description: 'Gothic iron wall plate with rivets, scrolled bracket, carved timber torch, wrapped cloth, embers and dual-layer flame.',
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
    description: 'Gothic iron sconce with brass crest, twin flat-bar scrolled arms, drip pans and beeswax candles.',
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
    description: '1.7 m flanged iron wheel chandelier with cross-spokes, turned hub, 8 dripping candles and 4 suspension chains.',
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
    description: 'Four-legged scrolled iron fire basket filled with faceted glowing charcoal chunks and soft flames.',
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
    description: '1.5 m tripod scrolled wrought-iron standing candelabra with turned collars and five dripping beeswax candles.',
    build(M) {
      const b = newBuilder(M);
      floorCandelabra(b);
      return b.build('candelabra_floor');
    },
  },
];
