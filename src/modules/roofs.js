// Modular castle roof bays (stage 5):
// Overlapping slate roof, curved terracotta barrel-tile roof, and thick bundled reed thatch roof.
// All bays are 4.0 m long along X (matching DIM.unit) with base at y = 0, centred on x = z = 0.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { bevelBlock, bevelBox } from '../lib/kit.js';
import { newArchBuilder, loftRings } from '../lib/archKit.js';

/** Builds the supporting stone wall-beds, oak wall plates, 5 pairs of rafters, collar ties and ridge beam for a 4 m bay. */
function addTimberFrame(b, { wallZ = 2.0, plateTop = 0.48, pitchDeg = 42, overhang = 0.44, roundPoles = false } = {}) {
  const L = 4.0;
  const tan = Math.tan((pitchDeg * Math.PI) / 180);
  const cos = Math.cos((pitchDeg * Math.PI) / 180);
  const ridgeY = plateTop + wallZ * tan;
  const eaveZ = wallZ + overhang;
  const eaveY = plateTop - overhang * tan;

  for (const sz of [-1, 1]) {
    b.add('stone', bevelBlock(L, 0.28, 0.42, 0.012), [0, 0, sz * wallZ]);
    if (roundPoles) {
      b.add('darkWood', G.cylinder(0.11, 0.11, L, 10, { y0: -L / 2 }), [0, 0.38, sz * wallZ], 0, 0, Math.PI / 2);
    } else {
      b.add('oak', bevelBlock(L, 0.2, 0.24, 0.01), [0, 0.28, sz * wallZ]);
    }
  }

  // ridge beam
  if (roundPoles) {
    b.add('darkWood', G.cylinder(0.09, 0.09, L, 10, { y0: -L / 2 }), [0, ridgeY - 0.06, 0], 0, 0, Math.PI / 2);
  } else {
    b.add('oak', bevelBlock(L, 0.2, 0.14, 0.008), [0, ridgeY - 0.16, 0]);
  }

  // 5 rafter trusses spaced every 0.9 m along X
  const xs = [-1.8, -0.9, 0, 0.9, 1.8];
  const slopeLen = Math.hypot(eaveZ, ridgeY - eaveY);
  const ang = (pitchDeg * Math.PI) / 180;
  for (const x of xs) {
    for (const sz of [-1, 1]) {
      const p0 = [x, eaveY + 0.06, sz * eaveZ];
      const p1 = [x, ridgeY - 0.02, 0];
      if (roundPoles) {
        b.add('darkWood', G.rod(p0, p1, 0.065, 8));
      } else {
        const mx = x;
        const my = (p0[1] + p1[1]) / 2;
        const mz = (p0[2] + p1[2]) / 2;
        b.add('oak', bevelBox(0.11, 0.15, slopeLen, 0.008), [mx, my, mz], 0, sz * ang);
      }
    }
    // horizontal collar tie across upper third
    const collarY = ridgeY - 0.85;
    const collarSpan = (ridgeY - collarY) / tan;
    if (roundPoles) {
      b.add('darkWood', G.rod([x, collarY, -collarSpan], [x, collarY, collarSpan], 0.055, 8));
    } else {
      b.add('oak', bevelBlock(0.1, 0.14, collarSpan * 2, 0.008), [x, collarY - 0.07, 0]);
    }
  }

  // sheathing / purlin boarding under roof cover
  for (const sz of [-1, 1]) {
    const midY = (eaveY + ridgeY) / 2 + 0.09 / cos;
    const midZ = sz * (eaveZ / 2);
    b.add('timber', bevelBox(L, 0.04, slopeLen, 0.004), [0, midY, midZ], 0, sz * ang);
  }
  return { ridgeY, eaveZ, eaveY, tan, cos, ang, slopeLen };
}

/** Single curved half-barrel terracotta tile oriented along Z (from -len/2 to +len/2), arch convex up (+Y). */
function barrelTileGeom(r = 0.085, thick = 0.02, len = 0.42, segs = 5) {
  const prof = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI;
    prof.push([Math.cos(a) * (r + thick), Math.sin(a) * (r + thick)]);
  }
  for (let i = segs; i >= 0; i--) {
    const a = (i / segs) * Math.PI;
    prof.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const s = new THREE.Shape(prof.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
  g.translate(0, 0, -len / 2);
  return G.boxUV(g);
}

/** Modular 4 m overlapping slate roof bay with dressed gable coping and saddle ridge tiles. */
function buildRoofSlate(b) {
  const L = 4.0;
  const info = addTimberFrame(b, { pitchDeg: 43, overhang: 0.42 });
  const { ridgeY, eaveZ, eaveY, tan, cos } = info;
  const slopeLen = Math.hypot(eaveZ, ridgeY - eaveY);

  // 7 stepped overlapping courses of dark slate up each pitch
  const courses = 7;
  const stepS = slopeLen / courses;
  const ang = Math.atan2(ridgeY - eaveY, eaveZ);
  const slatePitch = ang - 0.055; // slightly flatter so every lower course casts an authentic stepped shadow edge
  for (const sz of [-1, 1]) {
    for (let c = 0; c < courses; c++) {
      const sMid = (c + 0.5) * stepS;
      const distFromRidge = slopeLen - sMid;
      const zMid = sz * distFromRidge * Math.cos(ang);
      const yMid = ridgeY - distFromRidge * Math.sin(ang) + 0.14 / cos;
      b.add('roof', bevelBox(L, 0.045, stepS + 0.08, 0.005), [0, yMid, zMid], 0, sz * slatePitch);
    }
  }

  // dressed stone ridge crest saddle tiles along apex
  const tiles = 8;
  const tw = L / tiles;
  const ridgeCap = barrelTileGeom(0.14, 0.04, tw - 0.015, 6);
  ridgeCap.rotateY(Math.PI / 2);
  for (let i = 0; i < tiles; i++) {
    b.add('dressed', ridgeCap.clone(), [-L / 2 + (i + 0.5) * tw, ridgeY + 0.12, 0]);
  }
}

/** Modular 4 m medieval terracotta barrel-tile roof bay with battens and curved 3D clay tiles. */
function buildRoofClayTile(b) {
  const L = 4.0;
  const info = addTimberFrame(b, { pitchDeg: 38, overhang: 0.42 });
  const { ridgeY, eaveZ, eaveY, cos } = info;
  const ang = Math.atan2(ridgeY - eaveY, eaveZ);
  const slopeLen = Math.hypot(eaveZ, ridgeY - eaveY);

  const cols = 15;
  const rows = 7;
  const colStep = (L - 0.12) / cols;
  const rowStep = slopeLen / rows;
  const tileSlope = ang - 0.05;
  const coverTile = barrelTileGeom(0.072, 0.02, rowStep + 0.07, 5);
  const panTile = barrelTileGeom(0.076, 0.018, rowStep + 0.07, 4);
  panTile.rotateZ(Math.PI); // concave pan trough underneath cover tiles

  for (const sz of [-1, 1]) {
    for (let r = 0; r < rows; r++) {
      const sMid = (r + 0.5) * rowStep;
      const distFromRidge = slopeLen - sMid;
      const zBase = sz * distFromRidge * Math.cos(ang);
      const yBase = ridgeY - distFromRidge * Math.sin(ang) + 0.15 / cos;
      for (let c = 0; c < cols; c++) {
        const x = -L / 2 + 0.06 + (c + 0.5) * colStep;
        b.add('clayTile', coverTile.clone(), [x, yBase, zBase], sz > 0 ? 0 : Math.PI, sz > 0 ? tileSlope : tileSlope);
        if (c < cols - 1) {
          b.add('clayTile', panTile.clone(), [x + colStep / 2, yBase + 0.02, zBase], sz > 0 ? 0 : Math.PI, tileSlope);
        }
      }
    }
  }

  // large semicircular terracotta ridge cap tiles
  const ridgeCols = 10;
  const rw = L / ridgeCols;
  const rCap = barrelTileGeom(0.145, 0.032, rw - 0.01, 6);
  rCap.rotateY(Math.PI / 2);
  for (let i = 0; i < ridgeCols; i++) {
    b.add('clayTile', rCap.clone(), [-L / 2 + (i + 0.5) * rw, ridgeY + 0.16, 0]);
  }
}

/** Modular 4 m medieval bundled reed thatch roof bay with thick curved eaves, hazel liggers and crossed spars. */
function buildRoofThatch(b) {
  const L = 4.0;
  const info = addTimberFrame(b, { pitchDeg: 46, overhang: 0.38, roundPoles: true });
  const { ridgeY, eaveZ, eaveY } = info;

  // loft thick organic curved thatch blanket along X so eaves droop softly and carry gentle reed-bundle contour
  const nx = 18;
  const rings = [];
  for (let ix = 0; ix <= nx; ix++) {
    const x = -L / 2 + (ix / nx) * L;
    const wave = Math.sin(x * 3.1) * 0.014 + Math.cos(x * 7.2) * 0.008;
    // CCW cross-section loop in YZ plane (facing -X -> +X: +Z is left, +Y is up -> outward winding)
    const t = 0.34;
    const ez = eaveZ + 0.14;
    const ey = Math.max(0.06, eaveY + 0.02);
    const ry = ridgeY + 0.14;
    // Trace loop with outward normals along +X sweep: top from -Z -> apex -> +Z, then soffit +Z -> -Z
    rings.push([
      [x, ey + t + wave, -ez],
      [x, (ey + ry) * 0.52 + t + wave * 0.8, -ez * 0.54],
      [x, ry + t + 0.06, -0.22],
      [x, ry + t + 0.09, 0],
      [x, ry + t + 0.06, 0.22],
      [x, (ey + ry) * 0.52 + t + wave * 0.8, ez * 0.54],
      [x, ey + t + wave, ez],
      [x, ey, ez],
      [x, ey + 0.08, ez - 0.18],
      [x, ry + 0.04, 0],
      [x, ey + 0.08, -ez + 0.18],
      [x, ey, -ez],
    ]);
  }
  b.add('thatch', loftRings(rings, { closeStart: true, closeEnd: true, smooth: true }));

  // braided straw ridge cap + decorative hazel ledger rod & crossed thatch spars seated cleanly above ridge
  const ryCap = ridgeY + 0.4;
  b.add('straw', G.cylinder(0.22, 0.22, L + 0.08, 12, { y0: -(L + 0.08) / 2 }), [0, ryCap, 0], 0, 0, Math.PI / 2);
  for (const sz of [-1, 1]) {
    b.add('darkWood', G.cylinder(0.022, 0.022, L - 0.08, 8, { y0: -(L - 0.08) / 2 }), [0, ryCap - 0.06, sz * 0.32], 0, 0, Math.PI / 2);
    for (let x = -1.65; x <= 1.65; x += 0.55) {
      b.add('darkWood', G.rod([x - 0.16, ryCap - 0.2, sz * 0.44], [x + 0.16, ryCap + 0.04, sz * 0.2], 0.017, 6));
      b.add('darkWood', G.rod([x + 0.16, ryCap - 0.2, sz * 0.44], [x - 0.16, ryCap + 0.04, sz * 0.2], 0.017, 6));
    }
  }
  // crossed wooden finial spars at both gable ridge ends
  for (const sx of [-1, 1]) {
    b.add('darkWood', G.rod([sx * 1.9, ryCap - 0.24, -0.34], [sx * 1.9, ryCap + 0.44, 0.32], 0.032, 8));
    b.add('darkWood', G.rod([sx * 1.9, ryCap - 0.24, 0.34], [sx * 1.9, ryCap + 0.44, -0.32], 0.032, 8));
  }
}

export const roofModules = [
  {
    id: 'roof_slate',
    name: 'Slate gable roof bay',
    category: 'roof',
    description: '4 m modular steep-pitched castle slate roof bay over oak rafters and collar ties, with 7 stepped slate courses and dressed ridge saddle tiles.',
    build(M) {
      const b = newArchBuilder(M);
      buildRoofSlate(b);
      return b.build('roof_slate');
    },
  },
  {
    id: 'roof_clay_tile',
    name: 'Clay barrel-tile roof bay',
    category: 'roof',
    description: '4 m modular terracotta clay tile roof bay over oak rafters, built with curved 3D pan-and-cover barrel tiles and ridge cap tiles.',
    build(M) {
      const b = newArchBuilder(M);
      buildRoofClayTile(b);
      return b.build('roof_clay_tile');
    },
  },
  {
    id: 'roof_thatch',
    name: 'Reed thatch roof bay',
    category: 'roof',
    description: '4 m modular medieval reed thatch roof bay on round pole rafters, with thick bell-cast eaves, braided straw ridge, hazel liggers and crossed gable finials.',
    build(M) {
      const b = newArchBuilder(M);
      buildRoofThatch(b);
      return b.build('roof_thatch');
    },
  },
];
