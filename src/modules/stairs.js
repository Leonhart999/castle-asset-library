// Architectural castle staircases and landing platform (stage 5):
// Stone spiral turnpike stair, straight stone flight, timber ladder and gallery landing.
// Conventions: 1 unit = 1 m, base at y = 0, centred on x = z = 0, entry/front faces +Z.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { bevelBlock, bevelBox } from '../lib/kit.js';
import { newArchBuilder, sweepProfile, columnBase, columnCapital } from '../lib/archKit.js';

/** Builds a solid extruded annular sector from r0 to r1, angle a0 to a1, height y0 to y1. */
function wedgeSector(r0, r1, a0, a1, y0, y1, segs = 4) {
  const s = new THREE.Shape();
  s.moveTo(Math.cos(a0) * r0, -Math.sin(a0) * r0);
  s.lineTo(Math.cos(a0) * r1, -Math.sin(a0) * r1);
  for (let i = 1; i <= segs; i++) {
    const a = a0 + ((a1 - a0) * i) / segs;
    s.lineTo(Math.cos(a) * r1, -Math.sin(a) * r1);
  }
  s.lineTo(Math.cos(a1) * r0, -Math.sin(a1) * r0);
  for (let i = segs - 1; i >= 1; i--) {
    const a = a0 + ((a1 - a0) * i) / segs;
    s.lineTo(Math.cos(a) * r0, -Math.sin(a) * r0);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return G.boxUV(g);
}

/** Stone spiral turnpike staircase: 20 treads climbing 4.0 m (360 deg), central newel, cutaway turret wall & iron rail. */
function buildStairSpiral(b) {
  const steps = 20;
  const rise = 0.2;
  const totalH = steps * rise; // 4.0 m
  const rNewel = 0.16;
  const rIn = 1.06;
  const rOut = 1.32;
  const stepAng = (Math.PI * 2) / steps;

  // central turned stone newel post with moulded base and cap
  b.add('dressed', G.cylinder(rNewel + 0.08, rNewel + 0.1, 0.26, 20, { y0: 0 }));
  b.add('dressed', G.cylinder(rNewel, rNewel, totalH - 0.1, 20, { y0: 0.26 }));
  b.add('dressed', G.cylinder(rNewel + 0.07, rNewel + 0.04, 0.16, 20, { y0: totalH - 0.02 }));

  // 20 solid overlapping stone wedge steps with slate nosing treads
  const startAng = Math.PI * 0.35; // bottom step opens toward +Z
  for (let i = 0; i < steps; i++) {
    const a0 = startAng + i * stepAng;
    const a1 = a0 + stepAng + 0.035;
    const yTop = (i + 1) * rise;
    const yBot = i === 0 ? 0 : Math.max(0, yTop - 0.23);
    b.add('dressed', wedgeSector(rNewel - 0.02, rIn + 0.04, a0, a1, yBot, yTop - 0.04, 3));
    b.add('slateFloor', wedgeSector(rNewel - 0.01, rIn + 0.04, a0 - 0.025, a1 + 0.015, yTop - 0.04, yTop, 3));
  }

  // cutaway outer masonry turret drum spanning 220 deg around the back/sides so steps are clearly visible from +Z
  const arc0 = Math.PI * 0.62;
  const arc1 = Math.PI * 1.88;
  b.add('dressed', wedgeSector(rIn - 0.02, rOut + 0.1, arc0, arc1, 0, 0.32, 24));
  b.add('stone', wedgeSector(rIn, rOut, arc0, arc1, 0.32, totalH - 0.14, 24));
  b.add('dressed', wedgeSector(rIn - 0.04, rOut + 0.06, arc0, arc1, totalH - 0.14, totalH + 0.04, 24));

  // helical forged wrought-iron handrail following the wall interior along the turret arc
  const railPts = [];
  const railSamples = 28;
  for (let i = 0; i <= railSamples; i++) {
    const t = i / railSamples;
    const a = arc0 + 0.08 + t * (arc1 - arc0 - 0.16);
    // find corresponding step height along the climb
    let rel = (a - startAng) % (Math.PI * 2);
    if (rel < 0) rel += Math.PI * 2;
    const y = (rel / (Math.PI * 2)) * totalH + 0.92;
    railPts.push(new THREE.Vector3(Math.cos(a) * (rIn - 0.1), y, Math.sin(a) * (rIn - 0.1)));
  }
  const railCurve = new THREE.CatmullRomCurve3(railPts);
  b.add('iron', G.boxUV(new THREE.TubeGeometry(railCurve, 36, 0.024, 8, false)));

  // iron wall brackets anchoring the handrail to the masonry drum
  for (let i = 1; i < railSamples; i += 4) {
    const p = railPts[i];
    const ang = Math.atan2(p.z, p.x);
    const wallP = [Math.cos(ang) * (rIn + 0.01), p.y - 0.06, Math.sin(ang) * (rIn + 0.01)];
    b.add('iron', G.rod(wallP, [p.x, p.y, p.z], 0.014, 8));
    b.add('iron', bevelBox(0.08, 0.08, 0.02, 0.003), wallP, Math.PI / 2 - ang);
  }
}

/** Straight medieval stone staircase flight (10 steps, 2.0 m rise over 2.8 m run, stepped cheek walls & balustrade). */
function buildStairStraight(b) {
  const steps = 10;
  const rise = 0.2;
  const tread = 0.28;
  const run = steps * tread; // 2.8 m
  const clearW = 1.24;
  const wallT = 0.22;
  const totalW = clearW + wallT * 2; // 1.68 m
  const zFoot = run / 2; // +1.40 (entry at +Z)

  // solid stepped masonry undercarriage core + 10 bullnose slate treads
  for (let i = 0; i < steps; i++) {
    const yTop = (i + 1) * rise;
    const zStart = zFoot - i * tread;
    const zMid = zStart - tread / 2;
    // solid stone support block from y = 0 up to riser top
    b.add('stone', bevelBlock(clearW, yTop - 0.058, tread, 0.006), [0, 0, zMid - 0.005]);
    // dressed stone riser face proud by 4 mm so it never z-fights with the backing stone
    b.add('dressed', bevelBlock(clearW, 0.144, tread, 0.006), [0, yTop - 0.2, zMid + 0.004]);
    b.add('slateFloor', bevelBlock(clearW + 0.02, 0.058, tread + 0.04, 0.008), [0, yTop - 0.058, zMid + 0.016]);
  }

  // flanking sloped stone cheek walls / stringers
  for (const sx of [-1, 1]) {
    const cx = sx * (clearW / 2 + wallT / 2);
    const s = new THREE.Shape();
    s.moveTo(-run / 2, 0);
    s.lineTo(run / 2, 0);
    s.lineTo(run / 2, 0.42);
    s.lineTo(-run / 2, steps * rise + 0.22);
    s.lineTo(-run / 2, 0);
    // rotate so shape +x maps to +Z (foot at +run/2)
    const cg = new THREE.ExtrudeGeometry(s, { depth: wallT, bevelEnabled: false });
    cg.translate(0, 0, -wallT / 2);
    cg.rotateY(-Math.PI / 2);
    b.add('stone', G.boxUV(cg), [cx, 0, 0]);

    // newel pedestals at foot (+Z) and head (-Z)
    b.add('dressed', bevelBlock(wallT + 0.08, 1.15, 0.34, 0.012), [cx, 0, zFoot - 0.14]);
    b.add('dressed', bevelBlock(wallT + 0.12, 0.08, 0.38, 0.012), [cx, 1.15, zFoot - 0.14]);
    b.add('dressed', new THREE.SphereGeometry(0.085, 14, 10), [cx, 1.29, zFoot - 0.14]);

    b.add('dressed', bevelBlock(wallT + 0.08, steps * rise + 0.95, 0.34, 0.012), [cx, 0, -zFoot + 0.14]);
    b.add('dressed', bevelBlock(wallT + 0.12, 0.08, 0.38, 0.012), [cx, steps * rise + 0.95, -zFoot + 0.14]);
    b.add('dressed', new THREE.SphereGeometry(0.085, 14, 10), [cx, steps * rise + 1.09, -zFoot + 0.14]);

    // sloped oak & stone handrail between newels + turned stone balusters
    const p0 = [cx, 1.08, zFoot - 0.2];
    const p1 = [cx, steps * rise + 0.88, -zFoot + 0.2];
    b.add('oak', G.rod(p0, p1, 0.048, 8));
    for (let k = 1; k <= 5; k++) {
      const t = k / 6;
      const bz = p0[2] + (p1[2] - p0[2]) * t;
      const yDeck = 0.2 + t * (steps * rise - 0.2);
      const yRail = p0[1] + (p1[1] - p0[1]) * t;
      b.add('dressed', G.cylinder(0.042, 0.052, Math.max(0.25, yRail - yDeck), 8, { y0: yDeck }), [cx, 0, bz]);
    }
  }

  // clean bottom base plinth step under the foot
  b.add('dressed', bevelBlock(totalW + 0.06, 0.05, 0.34, 0.01), [0, 0, zFoot - 0.12]);
}

/** Modular 4 x 2.5 m stone & timber gallery landing platform at y = 2.0 m, matching stair_straight top height. */
function buildLandingPlatform(b) {
  const W = 4.0;
  const D = 2.5;
  const H = 2.0; // deck top height (matches stair_straight)
  const px = 1.72;
  const pz = 0.98;

  // four octagonal stone corner piers with bases and capitals
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * px;
      const z = sz * pz;
      columnBase(b, 'dressed', [x, 0, z], 0.19, 0.26);
      b.add('dressed', G.cylinder(0.18, 0.18, 1.14, 8, { y0: 0.26 }), [x, 0, z]);
      columnCapital(b, 'dressed', [x, 1.4, z], 0.19, 0.32);
    }
  }

  // shallow segmental stone arches cleanly below the y = 1.82 m deck slab
  const segmentalPts = (span, springY, rise, segs = 16) => {
    const hw = span / 2;
    const r = (hw * hw + rise * rise) / (2 * rise);
    const cy = springY + rise - r;
    const a0 = Math.atan2(springY - cy, hw);
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const a = Math.PI - a0 - (i / segs) * (Math.PI - 2 * a0);
      pts.push([r * Math.cos(a), cy + r * Math.sin(a), 0]);
    }
    return pts;
  };
  const archProf = [
    [0, -0.14],
    [0.2, -0.14],
    [0.2, 0.14],
    [0, 0.14],
  ];
  const frontPts = segmentalPts(px * 2 - 0.36, 1.38, 0.26, 16);
  for (const sz of [-1, 1]) {
    const g = sweepProfile(archProf, frontPts, { up: [0, 0, 1], closeCaps: true });
    g.translate(0, 0, sz * pz);
    b.add('dressed', g);
  }
  const sidePts = segmentalPts(pz * 2 - 0.36, 1.38, 0.26, 12);
  for (const sx of [-1, 1]) {
    const g = sweepProfile(archProf, sidePts, { up: [0, 0, 1], closeCaps: true });
    g.rotateY(Math.PI / 2);
    g.translate(sx * px, 0, 0);
    b.add('dressed', g);
  }

  // exposed oak floor joists spanning Z under the deck + main longitudinal summer beam
  b.add('oak', bevelBlock(W - 0.24, 0.22, 0.22, 0.008), [0, 1.66, 0]);
  for (let i = 0; i < 6; i++) {
    const x = -1.6 + i * 0.64;
    b.add('oak', bevelBlock(0.14, 0.18, D - 0.16, 0.008), [x, 1.72, 0]);
  }

  // dressed chamfered perimeter curb + flagstone slate deck at y = 2.00 m
  b.add('dressed', bevelBlock(W, 0.18, D, 0.012), [0, 1.82, 0]);
  b.add('slateFloor', bevelBlock(W - 0.2, 0.04, D - 0.2, 0.008), [0, 1.98, 0]);

  // stone balustrade parapet along -Z, +-X and flanking +Z (leaving 1.32 m stair entry opening in middle of +Z)
  const railH = 0.88;
  const postPositions = [
    [-px - 0.08, -pz - 0.08],
    [0, -pz - 0.08],
    [px + 0.08, -pz - 0.08],
    [-px - 0.08, pz + 0.08],
    [px + 0.08, pz + 0.08],
    [-0.78, pz + 0.08],
    [0.78, pz + 0.08],
  ];
  for (const [nx, nz] of postPositions) {
    b.add('dressed', bevelBlock(0.24, railH + 0.06, 0.24, 0.012), [nx, H, nz]);
    b.add('dressed', bevelBlock(0.28, 0.06, 0.28, 0.01), [nx, H + railH + 0.06, nz]);
    b.add('dressed', new THREE.SphereGeometry(0.085, 12, 10), [nx, H + railH + 0.19, nz]);
  }
  const addRailSpan = (x0, z0, x1, z1, count) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ang = Math.atan2(x1 - x0, z1 - z0);
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    b.add('dressed', bevelBlock(0.18, 0.1, len, 0.01), [mx, H + railH - 0.05, mz], ang);
    b.add('dressed', bevelBlock(0.18, 0.08, len, 0.008), [mx, H, mz], ang);
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      const bx = x0 + (x1 - x0) * t;
      const bz = z0 + (z1 - z0) * t;
      b.add('dressed', G.cylinder(0.052, 0.06, railH - 0.12, 8, { y0: H + 0.08 }), [bx, 0, bz]);
    }
  };
  addRailSpan(-px - 0.08, -pz - 0.08, 0, -pz - 0.08, 4);
  addRailSpan(0, -pz - 0.08, px + 0.08, -pz - 0.08, 4);
  addRailSpan(-px - 0.08, -pz - 0.08, -px - 0.08, pz + 0.08, 5);
  addRailSpan(px + 0.08, -pz - 0.08, px + 0.08, pz + 0.08, 5);
  addRailSpan(-px - 0.08, pz + 0.08, -0.78, pz + 0.08, 2);
  addRailSpan(0.78, pz + 0.08, px + 0.08, pz + 0.08, 2);
}

/** Straight oak ladder with through-mortised rungs and visible timber wedges. */
function buildLadderStraight(b) {
  const railH = 2.55;
  const railX = 0.28;
  for (const sx of [-1, 1]) {
    b.add('oak', bevelBlock(0.075, railH, 0.095, 0.009), [sx * railX, 0, 0]);
  }
  for (let i = 0; i < 8; i++) {
    const y = 0.25 + i * 0.29;
    b.add('timber', bevelBox(0.65, 0.047, 0.052, 0.007, 1, { offset: [0, y, 0] }), [0, y, 0]);
    for (const sx of [-1, 1]) {
      b.add('darkWood', bevelBox(0.012, 0.039, 0.009, 0.002), [sx * 0.325, y, 0]);
    }
  }
}

export const stairModules = [
  {
    id: 'stair_spiral',
    name: 'Spiral turnpike staircase',
    category: 'stair',
    description: 'Stone spiral staircase rising 4.0 m per full turn (20 wedge treads) with central turned newel, cutaway masonry drum and helical iron handrail.',
    build(M) {
      const b = newArchBuilder(M);
      buildStairSpiral(b);
      return b.build('stair_spiral');
    },
  },
  {
    id: 'stair_straight',
    name: 'Straight stone staircase',
    category: 'stair',
    description: '10-step castle straight stone flight (2.0 m rise over 2.8 m run) with sloped masonry cheek walls, slate bullnose treads and oak-and-stone balustrade.',
    build(M) {
      const b = newArchBuilder(M);
      buildStairStraight(b);
      return b.build('stair_straight');
    },
  },
  {
    id: 'ladder_straight',
    name: 'Straight oak ladder',
    category: 'stair',
    description: '2.55 m timber ladder with eight rounded rungs and visible wedged through-tenons, exported upright for placement at any angle.',
    build(M) {
      const b = newArchBuilder(M);
      buildLadderStraight(b);
      return b.build('ladder_straight');
    },
  },
  {
    id: 'landing_platform',
    name: 'Corbelled landing platform',
    category: 'stair',
    description: '4.0 x 2.5 m arched stone-and-timber gallery landing at y = 2.0 m with octagonal piers, oak joists, flagstone deck and stone balustrade.',
    build(M) {
      const b = newArchBuilder(M);
      buildLandingPlatform(b);
      return b.build('landing_platform');
    },
  },
];
