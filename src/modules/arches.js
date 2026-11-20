// Standalone architectural arches and vaulting (stage 5):
// Gothic pointed arch, Romanesque round arch, moulded Gothic rib arch and quadripartite rib vault bay.
// Conventions: 1 unit = 1 m, base at y = 0, centred on x = z = 0, front faces +Z.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { lathe, bevelBlock, bevelBox } from '../lib/kit.js';
import { newArchBuilder, archCurvePts, archNormals, sweepProfile, voussoirBlock, columnBase, columnCapital } from '../lib/archKit.js';

/** Octagonal carved floral keystone boss centred at the origin, radius r, projection depth along Z. */
function carvedBoss(b, pos, r = 0.22, thick = 0.18, rotX = 0) {
  b.push(pos, 0, rotX);
  b.add('dressed', G.cylinder(r, r * 0.85, thick, 8, { y0: -thick / 2 }), [0, 0, 0], 0, Math.PI / 2);
  b.add('dressed', G.cylinder(r * 0.52, r * 0.65, thick + 0.05, 8, { y0: -(thick + 0.05) / 2 }), [0, 0, 0], 0, Math.PI / 2);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    b.add('dressed', bevelBox(r * 1.55, 0.055, thick + 0.03, 0.008), [0, 0, 0], 0, 0, a);
  }
  b.pop();
}

/** Standalone Gothic pointed stone arch bay with clustered jamb shafts, capitals, double-order voussoirs and hood mould. */
function buildArchPointed(b) {
  const span = 2.4;
  const springY = 2.25;
  const rise = 1.95; // pointed gothic rise (> span/2 = 1.2)
  const depth = 0.78;
  const jambW = 0.42;
  const xJamb = span / 2 + jambW / 2;

  for (const sx of [-1, 1]) {
    // chamfered stone plinth base + jamb core
    b.add('dressed', bevelBlock(jambW + 0.16, 0.28, depth + 0.16, 0.015), [sx * xJamb, 0, 0]);
    b.add('stone', bevelBlock(jambW, springY - 0.54, depth, 0.01), [sx * xJamb, 0.28, 0]);

    // clustered gothic nook-shafts on inner reveal and front/back corners
    const shafts = [
      [sx * (span / 2 + 0.06), 0],
      [sx * (span / 2 + 0.16), depth / 2 - 0.06],
      [sx * (span / 2 + 0.16), -(depth / 2 - 0.06)],
    ];
    for (const [cx, cz] of shafts) {
      columnBase(b, 'dressed', [cx, 0.28, cz], 0.075, 0.18);
      b.add('dressed', G.cylinder(0.072, 0.072, springY - 0.74, 14, { y0: 0.46 }), [cx, 0, cz]);
      columnCapital(b, 'dressed', [cx, springY - 0.28, cz], 0.075, 0.28);
    }

    // moulded impost/abacus slab at spring line
    b.add('dressed', bevelBlock(jambW + 0.2, 0.14, depth + 0.2, 0.014), [sx * xJamb, springY - 0.14, 0]);
    // label-stop corbel blocks where the hood mould terminates (tight to the outer extrados)
    for (const sz of [-1, 1]) {
      b.add('dressed', bevelBlock(0.16, 0.16, 0.14, 0.012), [sx * (span / 2 + 0.44), springY - 0.06, sz * (depth / 2 + 0.04)]);
    }
  }

  // arch curve from (-span/2, springY) to (+span/2, springY)
  const pts = archCurvePts(span, springY, rise, 12);
  const nors = archNormals(pts);

  // inner order: continuous moulded gothic rib profile
  const innerProf = [
    [0, -0.26],
    [0.14, -0.26],
    [0.14, 0.26],
    [0, 0.26],
    [-0.04, 0.14],
    [-0.07, 0],
    [-0.04, -0.14],
  ];
  b.add('dressed', sweepProfile(innerProf, pts, { up: [0, 0, 1], closeCaps: true }));

  // outer order: chamfered radial stone voussoirs (skipping middle pair for the carved keystone)
  const midIdx = Math.floor((pts.length - 1) / 2);
  for (let i = 0; i < pts.length - 1; i++) {
    if (i === midIdx - 1 || i === midIdx) continue;
    b.add('dressed', voussoirBlock(pts[i], pts[i + 1], nors[i], nors[i + 1], 0.13, 0.44, depth, 0.012));
  }
  // pointed keystone crown block tall enough to meet the hood mould apex seamlessly
  const apexPt = pts[midIdx];
  b.add('dressed', bevelBox(0.32, 0.56, depth + 0.08, 0.014), [apexPt[0], apexPt[1] + 0.3, 0]);

  // projecting chamfered drip/hood mould hugging the outer voussoir extrados on both faces
  const hoodPts = pts.map((p, i) => [p[0] + nors[i][0] * 0.41, p[1] + nors[i][1] * 0.41, 0]);
  const hoodProf = [
    [0, -0.06],
    [0.085, -0.06],
    [0.105, 0.04],
    [0, 0.07],
  ];
  for (const sz of [-1, 1]) {
    const hMesh = sweepProfile(hoodProf, hoodPts, { up: [0, 0, 1], closeCaps: true });
    hMesh.translate(0, 0, sz * (depth / 2 + 0.01));
    b.add('dressed', hMesh);
  }
}

/** Standalone Romanesque round arch with nook shafts, cushion capitals, stepped concentric voussoirs and hood mould. */
function buildArchRound(b) {
  const span = 2.4;
  const springY = 2.1;
  const rise = span / 2; // exact semicircular arch (1.2 m rise -> crown at 3.3 m)
  const depth = 0.84;
  const pierW = 0.48;
  const xPier = span / 2 + pierW / 2;

  for (const sx of [-1, 1]) {
    // heavy stepped Romanesque plinth & masonry pier
    b.add('dressed', bevelBlock(pierW + 0.16, 0.3, depth + 0.16, 0.015), [sx * xPier, 0, 0]);
    b.add('stone', bevelBlock(pierW, springY - 0.52, depth, 0.01), [sx * xPier, 0.3, 0]);
    // recessed cylindrical nook-shafts on front and back inner corners
    for (const sz of [-1, 1]) {
      const cx = sx * (span / 2 + 0.1);
      const cz = sz * (depth / 2 - 0.07);
      columnBase(b, 'dressed', [cx, 0.3, cz], 0.085, 0.18);
      b.add('dressed', G.cylinder(0.082, 0.082, springY - 0.72, 16, { y0: 0.48 }), [cx, 0, cz]);
      // cushion capital block
      b.add('dressed', bevelBlock(0.24, 0.24, 0.24, 0.02), [cx, springY - 0.24, cz]);
    }
    // heavy chamfered impost cornice at spring line
    b.add('dressed', bevelBlock(pierW + 0.22, 0.16, depth + 0.22, 0.015), [sx * xPier, springY - 0.16, 0]);
  }

  const pts = archCurvePts(span, springY, rise, 11);
  const nors = archNormals(pts);
  const midIdx = Math.floor((pts.length - 1) / 2);

  // inner recessed ring of bevelled voussoirs
  for (let i = 0; i < pts.length - 1; i++) {
    b.add('stone', voussoirBlock(pts[i], pts[i + 1], nors[i], nors[i + 1], 0, 0.2, depth - 0.18, 0.01));
  }
  // outer projecting dressed archivolt ring (leave central slot for oversized Romanesque keystone)
  for (let i = 0; i < pts.length - 1; i++) {
    if (i === midIdx - 1 || i === midIdx) continue;
    b.add('dressed', voussoirBlock(pts[i], pts[i + 1], nors[i], nors[i + 1], 0.19, 0.46, depth, 0.013));
  }
  // projecting stepped keystone at crown
  b.add('dressed', bevelBox(0.32, 0.38, depth + 0.1, 0.014), [0, springY + rise + 0.32, 0]);

  // outer billet/roll hood mould on both faces
  const hoodPts = pts.map((p, i) => [p[0] + nors[i][0] * 0.46, p[1] + nors[i][1] * 0.46, 0]);
  const hoodProf = [
    [0, -0.055],
    [0.07, -0.055],
    [0.09, 0.03],
    [0, 0.055],
  ];
  for (const sz of [-1, 1]) {
    const hm = sweepProfile(hoodProf, hoodPts, { up: [0, 0, 1], closeCaps: true });
    hm.translate(0, 0, sz * (depth / 2 + 0.035));
    b.add('dressed', hm);
  }
}

/** Gothic moulded rib arch spanning 4 m with wall responds, annulets, triple-roll profile and carved boss. */
function buildArchRibbed(b) {
  const span = 3.5;
  const springY = 2.05;
  const rise = 2.15;
  const topSpandrelY = springY + rise + 0.14; // 4.34 m
  const pierX = 1.82;

  for (const sx of [-1, 1]) {
    // continuous stone wall-respond pier from plinth (0.32) right up to spring line (2.05) — zero gap
    b.add('dressed', bevelBlock(0.46, 0.32, 0.72, 0.015), [sx * pierX, 0, 0]);
    b.add('stone', bevelBlock(0.38, springY - 0.32, 0.62, 0.01), [sx * pierX, 0.32, 0]);
    // tripled engaged shaft bundle facing inward toward the arch
    const xShaft = sx * (span / 2 + 0.04);
    for (const sz of [-0.12, 0, 0.12]) {
      const r = sz === 0 ? 0.085 : 0.062;
      const off = sz === 0 ? -sx * 0.04 : 0;
      columnBase(b, 'dressed', [xShaft + off, 0.32, sz], r, 0.18);
      b.add('dressed', G.cylinder(r, r, springY - 0.72, 12, { y0: 0.5 }), [xShaft + off, 0, sz]);
      // mid-height stone annulet ring
      b.add('dressed', G.cylinder(r * 1.28, r * 1.28, 0.06, 12, { y0: 1.2 }), [xShaft + off, 0, sz]);
    }
    columnCapital(b, 'dressed', [xShaft, springY - 0.24, 0], 0.105, 0.28);
  }

  // compound Gothic keel-and-roll rib profile swept along pointed arch curve
  const pts = archCurvePts(span, springY, rise, 14);
  const ribProf = [
    [0.24, -0.17],
    [0.24, 0.17],
    [0.06, 0.17],
    [0.02, 0.11],
    [-0.08, 0.11],
    [-0.14, 0.05],
    [-0.18, 0],
    [-0.14, -0.05],
    [-0.08, -0.11],
    [0.02, -0.11],
    [0.06, -0.17],
  ];
  b.add('dressed', sweepProfile(ribProf, pts, { up: [0, 0, 1], closeCaps: true }));

  // solid extruded stone spandrel wall above the arch extrados up to horizontal cornice (4.34 m)
  const spandrel = new THREE.Shape();
  spandrel.moveTo(-2.0, springY);
  spandrel.lineTo(-2.0, topSpandrelY);
  spandrel.lineTo(2.0, topSpandrelY);
  spandrel.lineTo(2.0, springY);
  // trace arch extrados right -> left (pts + ~0.18 upward/outward offset) so spandrel hugs the rib cleanly
  for (let i = pts.length - 1; i >= 0; i--) {
    spandrel.lineTo(pts[i][0] * 1.03, Math.min(topSpandrelY - 0.05, pts[i][1] + 0.16));
  }
  spandrel.closePath();
  const sg = new THREE.ExtrudeGeometry(spandrel, { depth: 0.56, bevelEnabled: false });
  sg.translate(0, 0, -0.28);
  b.add('stone', G.boxUV(sg));

  // top horizontal stone tie/spandrel cornice across full 4 m span
  b.add('dressed', bevelBlock(4.0, 0.24, 0.68, 0.012), [0, topSpandrelY, 0]);

  // carved floral keystone boss at the crown
  carvedBoss(b, [0, springY + rise - 0.02, 0], 0.21, 0.38, 0);
}

/** Quadripartite Gothic rib vault bay (4 x 4 m): corner clustered piers, transverse & diagonal ribs, stone vault webbing & central boss. */
function buildVaultRibbed(b) {
  const half = 1.78;
  const springY = 2.95;
  const transCrown = 4.55;
  const diagCrown = 5.02;

  // four corner clustered piers on octagonal/square bases (footprint 4.0 x 4.0 m)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const px = sx * half;
      const pz = sz * half;
      b.add('dressed', bevelBlock(0.46, 0.3, 0.46, 0.015), [px, 0, pz]);
      b.add('stone', bevelBlock(0.36, springY - 0.56, 0.36, 0.01), [px, 0.3, pz]);
      // engaged inward shafts for transverse + diagonal ribs
      for (const [dx, dz] of [[-sx * 0.16, 0], [0, -sz * 0.16], [-sx * 0.13, -sz * 0.13]]) {
        columnBase(b, 'dressed', [px + dx, 0.3, pz + dz], 0.065, 0.16);
        b.add('dressed', G.cylinder(0.062, 0.062, springY - 0.7, 12, { y0: 0.46 }), [px + dx, 0, pz + dz]);
      }
      columnCapital(b, 'dressed', [px, springY - 0.28, pz], 0.15, 0.28);
      // masonry tas-de-charge springer block behind the rib convergence
      b.add('stone', bevelBlock(0.48, 0.55, 0.48, 0.01), [px, springY, pz]);
    }
  }

  // Sample the ribs by distance from their crown out to the spring. Using the same
  // samples for the masonry web ensures its edges meet the ribs all the way down.
  const halfRib = (radius, crown, steps) => {
    const rise = crown - springY;
    if (rise >= radius) {
      const centerX = (radius * radius - rise * rise) / (2 * radius);
      const circle = radius - centerX;
      const crownAngle = Math.atan2(rise, -centerX);
      return Array.from({ length: steps + 1 }, (_, i) => {
        const a = crownAngle * (1 - i / steps);
        return [centerX + circle * Math.cos(a), springY + circle * Math.sin(a), 0];
      });
    }
    const circle = (radius * radius + rise * rise) / (2 * rise);
    const angle = Math.atan2(radius, circle - rise);
    return Array.from({ length: steps + 1 }, (_, i) => {
      const a = angle * i / steps;
      return [circle * Math.sin(a), crown - circle * (1 - Math.cos(a)), 0];
    });
  };
  const fullRib = (points) => [
    ...points.slice(1).reverse().map(([x, y, z]) => [-x, y, z]),
    ...points,
  ];
  const edge = halfRib(half, transCrown, 12);
  const diag = halfRib(half * Math.SQRT2, diagCrown, 12);

  // rib cross-section: +u goes up into webbing, -u hangs down cleanly as chamfered rib soffit
  const ribProf = [
    [0.14, -0.11],
    [0.14, 0.11],
    [0.02, 0.11],
    [-0.08, 0.07],
    [-0.14, 0],
    [-0.08, -0.07],
    [0.02, -0.11],
  ];

  // Four perimeter arches around the square bay.
  const transPtsLocal = fullRib(edge);
  for (let side = 0; side < 4; side++) {
    const rot = (side * Math.PI) / 2;
    const gRib = sweepProfile(ribProf, transPtsLocal, { up: [0, 0, 1], closeCaps: true });
    gRib.translate(0, 0, half);
    gRib.rotateY(rot);
    b.add('dressed', gRib);
  }

  // 2 crossing diagonal ribs spanning corner-to-corner through [0, diagCrown, 0]
  const diagLocal = fullRib(diag);
  for (const ang of [Math.PI / 4, -Math.PI / 4]) {
    const dRib = sweepProfile(ribProf, diagLocal, { up: [0, 0, 1], closeCaps: true });
    dRib.rotateY(ang);
    b.add('dressed', dRib);
  }

  // 4 stone vault webbing cells (severies) with thickness 0.15 m matching both ribs & transverse arches
  const nu = diag.length - 1;
  const nt = transPtsLocal.length - 1;
  const thick = 0.15;

  for (let side = 0; side < 4; side++) {
    const rot = (side * Math.PI) / 2;
    const verts = [];
    const tri = (a, b2, c) => verts.push(...a, ...b2, ...c);
    const bot = [];
    const top = [];
    for (let iu = 0; iu <= nu; iu++) {
      const z = diag[iu][0] / Math.SQRT2;
      const u = z / half;
      bot[iu] = [];
      top[iu] = [];
      for (let it = 0; it <= nt; it++) {
        const [edgeX, edgeY] = transPtsLocal[it];
        const x = u * edgeX;
        const ridgeY = THREE.MathUtils.lerp(diagCrown, transCrown, u * u);
        const across = (edgeY - springY) / (transCrown - springY);
        const y = THREE.MathUtils.lerp(diag[iu][1], ridgeY, across) + 0.025;
        bot[iu][it] = [x, y, z];
        top[iu][it] = [x, y + thick, z];
      }
    }
    // inner apex fan (iu = 0 -> iu = 1)
    const apexBot = bot[0][0];
    const apexTop = top[0][0];
    for (let it = 0; it < nt; it++) {
      tri(apexTop, top[1][it], top[1][it + 1]);
      tri(apexBot, bot[1][it + 1], bot[1][it]);
    }
    // regular quads for iu >= 1
    for (let iu = 1; iu < nu; iu++) {
      for (let it = 0; it < nt; it++) {
        tri(top[iu][it], top[iu + 1][it], top[iu + 1][it + 1]);
        tri(top[iu][it], top[iu + 1][it + 1], top[iu][it + 1]);
        tri(bot[iu][it], bot[iu + 1][it + 1], bot[iu + 1][it]);
        tri(bot[iu][it], bot[iu][it + 1], bot[iu + 1][it + 1]);
      }
    }
    // close outer transverse arch rim (iu = nu)
    for (let it = 0; it < nt; it++) {
      tri(bot[nu][it], bot[nu][it + 1], top[nu][it + 1]);
      tri(bot[nu][it], top[nu][it + 1], top[nu][it]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.computeVertexNormals();
    g.rotateY(rot);
    b.add('stone', G.boxUV(g));
  }

  // carved stone keystone boss hanging at central diagonal intersection
  carvedBoss(b, [0, diagCrown - 0.04, 0], 0.25, 0.28, Math.PI / 2);
}

export const archModules = [
  {
    id: 'arch_pointed',
    name: 'Gothic pointed arch',
    category: 'arch',
    description: 'Standalone 3.4 m Gothic pointed stone arch bay with clustered nook-shafts, capitals, chamfered inner rib, radial voussoirs and hood mould.',
    build(M) {
      const b = newArchBuilder(M);
      buildArchPointed(b);
      return b.build('arch_pointed');
    },
  },
  {
    id: 'arch_round',
    name: 'Romanesque round arch',
    category: 'arch',
    description: 'Standalone 3.5 m Romanesque semicircular arch with cushion capitals, recessed inner ring, stepped dressed voussoirs and keystone.',
    build(M) {
      const b = newArchBuilder(M);
      buildArchRound(b);
      return b.build('arch_round');
    },
  },
  {
    id: 'arch_ribbed',
    name: 'Gothic ribbed arch',
    category: 'arch',
    description: '4 m span Gothic transverse rib arch with tripled wall-shaft responds, annulet rings, keel-moulded rib profile and carved keystone boss.',
    build(M) {
      const b = newArchBuilder(M);
      buildArchRibbed(b);
      return b.build('arch_ribbed');
    },
  },
  {
    id: 'vault_ribbed',
    name: 'Quadripartite rib vault',
    category: 'arch',
    description: '4 x 4 m Gothic quadripartite stone rib-vaulted ceiling bay on clustered corner piers, with diagonal and transverse ribs, stone webbing and central boss.',
    build(M) {
      const b = newArchBuilder(M);
      buildVaultRibbed(b);
      return b.build('vault_ribbed');
    },
  },
];
