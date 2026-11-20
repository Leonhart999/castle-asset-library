// Architectural castle window units (stage 5):
// Splayed arrow-slit window, two-light Gothic pointed tracery window, circular rose window, and tall stained-glass lancet.
// Conventions: 1 unit = 1 m, base at y = 0, centred on x = z = 0, exterior face toward +Z.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { bevelBlock, bevelBox } from '../lib/kit.js';
import { newArchBuilder, archCurvePts, sweepProfile, columnBase, columnCapital } from '../lib/archKit.js';

/** Builds a thin flat sector/ring wedge in the XY plane extruded to thickness `thick` centred on z = 0. */
function annularSector(r0, r1, a0, a1, thick = 0.008, segs = 4) {
  const s = new THREE.Shape();
  s.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
  s.lineTo(Math.cos(a0) * r1, Math.sin(a0) * r1);
  for (let i = 1; i <= segs; i++) {
    const a = a0 + ((a1 - a0) * i) / segs;
    s.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
  }
  s.lineTo(Math.cos(a1) * r0, Math.sin(a1) * r0);
  for (let i = segs - 1; i >= 1; i--) {
    const a = a0 + ((a1 - a0) * i) / segs;
    s.lineTo(Math.cos(a) * r0, Math.sin(a) * r0);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false });
  g.translate(0, 0, -thick / 2);
  return G.boxUV(g);
}

/** Builds a stone ring in XY plane (outer R, inner R, depth along Z centred at 0). */
function stoneRingXY(rIn, rOut, depth, segs = 32) {
  const s = new THREE.Shape();
  s.absarc(0, 0, rOut, 0, Math.PI * 2, false);
  const h = new THREE.Path();
  h.absarc(0, 0, rIn, 0, Math.PI * 2, true);
  s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: segs });
  g.translate(0, 0, -depth / 2);
  return G.boxUV(g);
}

/** Deeply splayed stone arrow-slit / lancet embrasure window with exterior chamfered jambs and iron grille. */
function buildWindowSlit(b) {
  const W = 1.4;
  const H = 2.8;
  const D = 0.8;
  // wall surround carved with exterior slit + deep splayed interior embrasure
  const body = new THREE.BoxGeometry(W, H, D).translate(0, H / 2, 0);
  const slitCut = G.openingCutter({ x: 0, y: 0.65, w: 0.16, h: 1.55, arch: 'rect' }, D + 0.3).applyMatrix4(G.faceMatrix('s', W, D));
  const splayCut = G.openingCutter({ x: 0, y: 0.5, w: 0.9, h: 1.92, arch: 'round' }, 0.62).applyMatrix4(G.faceMatrix('n', W, D));
  b.add('stone', G.boxUV(G.carve(body, [slitCut, splayCut])));

  // dressed plinth, sloped exterior sill and chamfered exterior jamb/lintel frame
  b.add('dressed', bevelBlock(W + 0.08, 0.24, D + 0.08, 0.015), [0, 0, 0]);
  b.add('dressed', bevelBlock(0.54, 0.16, 0.24, 0.012), [0, 0.5, D / 2 - 0.04]);
  for (const sx of [-1, 1]) {
    b.add('dressed', bevelBlock(0.18, 1.55, 0.18, 0.014), [sx * 0.17, 0.65, D / 2 - 0.03]);
  }
  b.add('dressed', bevelBlock(0.54, 0.18, 0.18, 0.014), [0, 2.2, D / 2 - 0.03]);

  // interior stepped rear arch ring
  b.add('dressed', stoneRingXY(0.45, 0.58, 0.14, 18), [0, 1.97, -D / 2 + 0.02]);

  // forged iron security grille bars inside the slit + slim leaded quarry pane
  b.add('iron', G.cylinder(0.012, 0.012, 1.54, 8, { y0: 0.65 }), [0, 0, D / 2 - 0.18]);
  for (const gy of [1.05, 1.45, 1.85]) {
    b.add('iron', G.cylinder(0.01, 0.01, 0.22, 8, { y0: -0.11 }), [0, gy, D / 2 - 0.18], 0, 0, Math.PI / 2);
  }
  const glass = new THREE.ExtrudeGeometry(G.openingShape({ x: 0, y: 0.65, w: 0.16, h: 1.55, arch: 'rect' }), { depth: 0.006, bevelEnabled: false });
  b.add('glassClear', G.boxUV(glass), [0, 0, D / 2 - 0.24]);
}

/** Two-light Gothic pointed stone tracery window with central mullion, oculus and leaded diamond glass. */
function buildWindowPointed(b) {
  const W = 2.0;
  const H = 3.4;
  const D = 0.65;
  const open = { x: 0, y: 0.62, w: 1.22, h: 2.42, arch: 'pointed' };

  const body = new THREE.BoxGeometry(W, H, D).translate(0, H / 2, 0);
  const cut = G.openingCutter(open, D + 0.3).applyMatrix4(G.faceMatrix('s', W, D));
  b.add('stone', G.boxUV(G.carve(body, [cut])));

  // dressed plinth and projecting moulded window sill
  b.add('dressed', bevelBlock(W + 0.1, 0.24, D + 0.1, 0.015), [0, 0, 0]);
  b.add('dressed', bevelBlock(open.w + 0.48, 0.14, D + 0.14, 0.014), [0, 0.52, 0]);

  // outer chamfered pointed arch surround & hood mould on both faces
  const pts = archCurvePts(open.w, open.y + open.h - open.w * 0.866, open.w * 0.866, 12);
  const frameProf = [
    [0, -0.14],
    [0.18, -0.14],
    [0.18, 0.14],
    [0, 0.14],
    [-0.04, 0.08],
    [-0.04, -0.08],
  ];
  for (const sz of [-1, 1]) {
    const f = sweepProfile(frameProf, pts, { up: [0, 0, 1], closeCaps: true });
    f.translate(0, 0, sz * (D / 2 - 0.04));
    b.add('dressed', f);
    // vertical jamb mouldings
    for (const sx of [-1, 1]) {
      b.add('dressed', bevelBlock(0.14, open.h - open.w * 0.866, 0.18, 0.012), [sx * (open.w / 2 + 0.05), open.y, sz * (D / 2 - 0.04)]);
      b.add('dressed', bevelBlock(0.12, 0.12, 0.14, 0.01), [sx * (open.w / 2 + 0.2), open.y + open.h - open.w * 0.866 - 0.06, sz * (D / 2 + 0.02)]);
    }
  }

  // central octagonal stone mullion + base/capital + twin pointed sub-arches
  const springSub = 1.98;
  columnBase(b, 'dressed', [0, 0.66, 0], 0.055, 0.12);
  b.add('dressed', G.cylinder(0.052, 0.052, springSub - 0.9, 8, { y0: 0.78 }), [0, 0, 0]);
  columnCapital(b, 'dressed', [0, springSub - 0.12, 0], 0.055, 0.14);

  const subProf = [
    [-0.045, -0.09],
    [0.045, -0.09],
    [0.045, 0.09],
    [-0.045, 0.09],
  ];
  for (const sx of [-1, 1]) {
    const sPts = archCurvePts(0.58, springSub, 0.48, 8).map(([x, y, z]) => [x + sx * 0.305, y, z]);
    b.add('dressed', sweepProfile(subProf, sPts, { up: [0, 0, 1], closeCaps: true }));
  }

  // pierced spandrel tracery oculus ring + 4 quatrefoil cusps
  const ocy = 2.6;
  b.add('dressed', stoneRingXY(0.16, 0.24, 0.18, 24), [0, ocy, 0]);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    b.add('dressed', G.cylinder(0.032, 0.032, 0.16, 8), [Math.cos(a) * 0.15, ocy + Math.sin(a) * 0.15, 0], 0, Math.PI / 2);
  }

  // recessed translucent leaded diamond glass + lead lattice + iron saddle bars
  const glassGeom = new THREE.ExtrudeGeometry(G.openingShape(open), { depth: 0.008, bevelEnabled: false, curveSegments: 10 });
  glassGeom.translate(0, 0, -0.004);
  b.add('glassClear', G.boxUV(glassGeom));

  // diamond lead cames clipped strictly inside each lower lancet [x0..x1] x [y0..y1] + horizontal quarry bars
  const addClippedBar = (xA, yA, xB, yB, x0, x1, y0, y1) => {
    let t0 = 0;
    let t1 = 1;
    const dx = xB - xA;
    const dy = yB - yA;
    const clip = (p, q) => {
      if (Math.abs(p) < 1e-8) return q >= 0;
      const r = q / p;
      if (p < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
      return true;
    };
    if (clip(-dx, xA - x0) && clip(dx, x1 - xA) && clip(-dy, yA - y0) && clip(dy, y1 - yA) && t1 > t0) {
      const p0x = xA + t0 * dx;
      const p0y = yA + t0 * dy;
      const p1x = xA + t1 * dx;
      const p1y = yA + t1 * dy;
      const len = Math.hypot(p1x - p0x, p1y - p0y);
      if (len > 0.03) {
        b.add('lead', bevelBox(len, 0.014, 0.018, 0.002), [(p0x + p1x) / 2, (p0y + p1y) / 2, 0], 0, 0, Math.atan2(p1y - p0y, p1x - p0x));
      }
    }
  };
  for (const sx of [-1, 1]) {
    const cx = sx * 0.305;
    const x0 = cx - 0.255;
    const x1 = cx + 0.255;
    const y0 = open.y + 0.02;
    const y1 = springSub + 0.02;
    for (let y = y0 - 0.45; y < y1 + 0.45; y += 0.24) {
      addClippedBar(x0 - 0.1, y - 0.36, x1 + 0.1, y + 0.36, x0, x1, y0, y1);
      addClippedBar(x0 - 0.1, y + 0.36, x1 + 0.1, y - 0.36, x0, x1, y0, y1);
    }
  }
  for (const y of [1.05, 1.5, 1.95]) {
    b.add('iron', G.cylinder(0.01, 0.01, open.w + 0.04, 8, { y0: -(open.w + 0.04) / 2 }), [0, y, -0.02], 0, 0, Math.PI / 2);
  }
}

/** Circular Gothic rose window framed in dressed stone spandrel wall on moulded sill, with 12 spokes and stained glass. */
function buildWindowRose(b) {
  const W = 3.0;
  const H = 3.2;
  const D = 0.62;
  const cy = 1.76;
  const R = 1.14;

  // wall spandrel carved cleanly with circular cylinder cutter
  const wallBox = new THREE.BoxGeometry(W, H, D).translate(0, H / 2, 0);
  const cylCut = new THREE.CylinderGeometry(R, R, D + 0.4, 36);
  cylCut.rotateX(Math.PI / 2);
  cylCut.translate(0, cy, 0);
  b.add('stone', G.boxUV(G.carve(wallBox, [cylCut])));

  // stepped plinth & horizontal sill/cornice courses
  b.add('dressed', bevelBlock(W + 0.12, 0.28, D + 0.12, 0.015), [0, 0, 0]);
  b.add('dressed', bevelBlock(W + 0.08, 0.12, D + 0.08, 0.012), [0, H - 0.12, 0]);

  // concentric moulded outer stone ring on front and back + inner tracery rim
  for (const sz of [-1, 1]) {
    b.add('dressed', stoneRingXY(R - 0.06, R + 0.14, 0.14, 36), [0, cy, sz * (D / 2 - 0.02)]);
    b.add('dressed', stoneRingXY(R + 0.13, R + 0.22, 0.08, 36), [0, cy, sz * (D / 2 + 0.02)]);
  }
  b.add('dressed', stoneRingXY(R - 0.1, R + 0.02, D * 0.55, 36), [0, cy, 0]);

  // central carved stone hub ring
  b.add('dressed', stoneRingXY(0.18, 0.26, 0.22, 24), [0, cy, 0]);

  // 12 radiating turned stone colonnette spokes + outer cusped tracery lobes + sealed stained glass
  const N = 12;
  const glassMats = ['glassRuby', 'glassCobalt', 'glassAmber', 'glassEmerald'];
  b.push([0, cy, 0]);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const midA = ((i + 0.5) / N) * Math.PI * 2;
    // radial colonnette spoke (axis along angle a)
    b.push([0, 0, 0], 0, 0, a - Math.PI / 2);
    b.add('dressed', G.cylinder(0.032, 0.038, 0.68, 10, { y0: 0.24 }), [0, 0, 0]);
    b.add('dressed', G.cylinder(0.056, 0.04, 0.09, 10, { y0: 0.87 }), [0, 0, 0]);
    b.pop();

    // radial lead spoke bar spanning full hub-to-rim width so zero gap leaks around spokes
    b.add('lead', bevelBox(0.92, 0.026, 0.024, 0.003), [Math.cos(a) * 0.64, Math.sin(a) * 0.64, 0], 0, 0, a);

    // stone trefoil cusp arch bridge linking adjacent spoke capitals near outer stone rim
    const px = Math.cos(midA) * (R - 0.16);
    const py = Math.sin(midA) * (R - 0.16);
    b.add('dressed', stoneRingXY(0.11, 0.145, 0.16, 14), [px, py, 0]);

    // translucent stained glass sectors overlapping cleanly beneath the lead cames (zero white pinholes)
    const mat = glassMats[i % glassMats.length];
    b.add(mat, annularSector(0.22, R - 0.05, a - 0.005, a + (Math.PI * 2) / N + 0.005, 0.008, 4));
    b.add(glassMats[(i + 2) % glassMats.length], annularSector(0.02, 0.2, a - 0.008, a + (Math.PI * 2) / N + 0.008, 0.008, 3));
    b.add('lead', bevelBox(0.2, 0.016, 0.022, 0.002), [Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0], 0, 0, a);
  }
  // concentric lead hub ring, iron saddle ring and outer glazing lead rim
  b.add('lead', stoneRingXY(0.19, 0.24, 0.022, 24), [0, 0, 0]);
  b.add('iron', stoneRingXY(0.62, 0.648, 0.024, 32), [0, 0, 0]);
  b.add('lead', stoneRingXY(R - 0.11, R - 0.06, 0.024, 36), [0, 0, 0]);
  b.pop();
}

/** Tall pointed Gothic stained-glass lancet window with jewel-toned leaded mosaic panels, lead cames and iron bars. */
function buildWindowStained(b) {
  const W = 1.8;
  const H = 3.8;
  const D = 0.62;
  const open = { x: 0, y: 0.56, w: 1.04, h: 2.86, arch: 'pointed' };

  const wallBox = new THREE.BoxGeometry(W, H, D).translate(0, H / 2, 0);
  const cut = G.openingCutter(open, D + 0.3).applyMatrix4(G.faceMatrix('s', W, D));
  b.add('stone', G.boxUV(G.carve(wallBox, [cut])));

  // dressed base plinth, sloped sill and clustered jamb colonnettes
  b.add('dressed', bevelBlock(W + 0.1, 0.24, D + 0.1, 0.015), [0, 0, 0]);
  b.add('dressed', bevelBlock(open.w + 0.42, 0.14, D + 0.14, 0.014), [0, 0.46, 0]);

  const springY = open.y + open.h - open.w * 0.866;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const cx = sx * (open.w / 2 + 0.07);
      const cz = sz * (D / 2 - 0.05);
      columnBase(b, 'dressed', [cx, 0.58, cz], 0.055, 0.12);
      b.add('dressed', G.cylinder(0.052, 0.052, springY - 0.82, 12, { y0: 0.7 }), [cx, 0, cz]);
      columnCapital(b, 'dressed', [cx, springY - 0.12, cz], 0.055, 0.14);
    }
  }

  // pointed moulded hood arch on front and back + carved apex finial
  const pts = archCurvePts(open.w, springY, open.w * 0.866, 12);
  const archProf = [
    [0, -0.12],
    [0.16, -0.12],
    [0.16, 0.12],
    [0, 0.12],
    [-0.04, 0.06],
    [-0.04, -0.06],
  ];
  for (const sz of [-1, 1]) {
    const m = sweepProfile(archProf, pts, { up: [0, 0, 1], closeCaps: true });
    m.translate(0, 0, sz * (D / 2 - 0.03));
    b.add('dressed', m);
    b.add('dressed', bevelBlock(0.16, 0.24, 0.14, 0.01), [0, open.y + open.h + 0.08, sz * (D / 2)]);
  }

  // stained-glass mosaic inside the lancet (centred at z = 0) with lead cames sealing every seam
  const borderMats = ['glassAmber', 'glassCobalt'];
  const bw = 0.13;
  const fieldW = open.w - bw * 2;
  const rows = 5;
  const topY = springY + 0.02;
  const rowH = (topY - open.y) / rows;
  for (let r = 0; r < rows; r++) {
    const yMid = open.y + (r + 0.5) * rowH;
    // border blocks tucked into stone jambs and vertical lead border came
    for (const sx of [-1, 1]) {
      const bx = sx * (open.w / 2 - bw / 2);
      b.add(borderMats[r % 2], bevelBox(bw + 0.02, rowH + 0.01, 0.008, 0.001), [bx, yMid, 0]);
    }
    // central mosaic diamond & corner triangles (two alternating jewel colors per bay)
    const centerMat = ['glassRuby', 'glassCobalt', 'glassEmerald', 'glassRuby', 'glassAmber'][r];
    const cornerMat = ['glassCobalt', 'glassAmber', 'glassRuby', 'glassEmerald', 'glassCobalt'][r];
    const hw = fieldW / 2 + 0.008;
    const hh = rowH / 2 + 0.008;
    // central diamond panel
    const dia = new THREE.Shape();
    dia.moveTo(0, -hh);
    dia.lineTo(hw, 0);
    dia.lineTo(0, hh);
    dia.lineTo(-hw, 0);
    dia.closePath();
    const dg = new THREE.ExtrudeGeometry(dia, { depth: 0.008, bevelEnabled: false });
    dg.translate(0, yMid, -0.004);
    b.add(centerMat, G.boxUV(dg));
    // 4 flanking corner triangle panels overlapping slightly into the lead cames (zero white gaps)
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const triS = new THREE.Shape();
        triS.moveTo(sx * hw, sy * hh);
        triS.lineTo(0, sy * hh);
        triS.lineTo(sx * hw, 0);
        triS.closePath();
        const tg = new THREE.ExtrudeGeometry(triS, { depth: 0.008, bevelEnabled: false });
        tg.translate(0, yMid, -0.004);
        b.add(cornerMat, G.boxUV(tg));
      }
    }
    // thick lead horizontal transom bar and diagonal X cames sealing the glass joints
    b.add('lead', bevelBox(open.w + 0.02, 0.024, 0.022, 0.002), [0, open.y + r * rowH, 0]);
    const diagLen = Math.hypot(fieldW, rowH) + 0.02;
    const diagAng = Math.atan2(rowH, fieldW);
    b.add('lead', bevelBox(diagLen, 0.02, 0.02, 0.002), [0, yMid, 0], 0, 0, diagAng);
    b.add('lead', bevelBox(diagLen, 0.02, 0.02, 0.002), [0, yMid, 0], 0, 0, -diagAng);
  }
  b.add('lead', bevelBox(open.w + 0.02, 0.026, 0.024, 0.002), [0, topY, 0]);
  // vertical border lead cames
  for (const sx of [-1, 1]) b.add('lead', bevelBox(0.024, topY - open.y, 0.022, 0.002), [sx * (fieldW / 2), (open.y + topY) / 2, 0]);

  // upper pointed head glazing + central stained rosette medallion (with circular hole cut for clean non-overlap)
  const headShape = new THREE.Shape();
  const headPts = archCurvePts(open.w, springY, open.w * 0.866, 10);
  headShape.moveTo(headPts[0][0], headPts[0][1]);
  for (let i = 1; i < headPts.length; i++) headShape.lineTo(headPts[i][0], headPts[i][1]);
  headShape.closePath();
  const medHole = new THREE.Path();
  medHole.absarc(0, springY + 0.34, 0.19, 0, Math.PI * 2, true);
  headShape.holes.push(medHole);
  const headG = new THREE.ExtrudeGeometry(headShape, { depth: 0.008, bevelEnabled: false });
  headG.translate(0, 0, -0.004);
  b.add('glassCobalt', G.boxUV(headG));
  b.add('lead', stoneRingXY(0.18, 0.21, 0.018, 20), [0, springY + 0.34, 0]);
  b.add('glassRuby', G.cylinder(0.18, 0.18, 0.008, 18), [0, springY + 0.34, 0], 0, Math.PI / 2);

  // horizontal wrought-iron saddle bars
  for (const y of [0.95, 1.55, 2.15, 2.75]) {
    b.add('iron', G.cylinder(0.011, 0.011, open.w + 0.08, 8, { y0: -(open.w + 0.08) / 2 }), [0, y, -0.02], 0, 0, Math.PI / 2);
  }
}

export const windowModules = [
  {
    id: 'window_slit',
    name: 'Splayed arrow-slit window',
    category: 'window',
    description: 'Masonry arrow-slit window bay with deeply splayed interior embrasure, chamfered exterior frame, wrought-iron security grille and leaded pane.',
    build(M) {
      const b = newArchBuilder(M);
      buildWindowSlit(b);
      return b.build('window_slit');
    },
  },
  {
    id: 'window_pointed',
    name: 'Gothic pointed tracery window',
    category: 'window',
    description: 'Two-light Gothic pointed stone window with central octagonal mullion, trefoil sub-arches, quatrefoil oculus and leaded diamond glass.',
    build(M) {
      const b = newArchBuilder(M);
      buildWindowPointed(b);
      return b.build('window_pointed');
    },
  },
  {
    id: 'window_rose',
    name: 'Gothic rose window',
    category: 'window',
    description: 'Circular Gothic wheel/rose window in a dressed stone spandrel frame with 12 radiating colonnette spokes, cusp arches and jewel stained glass.',
    build(M) {
      const b = newArchBuilder(M);
      buildWindowRose(b);
      return b.build('window_rose');
    },
  },
  {
    id: 'window_stained',
    name: 'Stained-glass lancet window',
    category: 'window',
    description: 'Tall pointed Gothic stained-glass window with ruby, cobalt, amber and emerald leaded glass mosaic, lead cames and iron saddle bars.',
    build(M) {
      const b = newArchBuilder(M);
      buildWindowStained(b);
      return b.build('window_stained');
    },
  },
];
