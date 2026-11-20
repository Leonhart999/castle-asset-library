// Structural framing and sculptural stonework (stage 5):
// Medieval oak hammerbeam/king-post roof truss, stone & timber pillar-and-beam bays, and Gothic gargoyle waterspout.
// Conventions: 1 unit = 1 m, base at y = 0, centred on x = z = 0, front faces +Z.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { bevelBlock, bevelBox, rivets } from '../lib/kit.js';
import { newArchBuilder, sweepProfile, loftRings, columnBase, columnCapital } from '../lib/archKit.js';

/** Medieval 6 m span oak king-post & arch-braced roof truss standing on stone wall-post corbels. */
function buildTrussTimber(b) {
  const span = 5.8;
  const hw = span / 2; // 2.9 m
  const postX = hw - 0.22; // 2.68 m
  const corbelH = 0.56;
  const tieY = 1.28;
  const tieH = 0.28;
  const apexY = 3.85;

  // flanking stone corbel pedestals so the truss stands at y = 0 and shows masonry bearing
  for (const sx of [-1, 1]) {
    b.add('dressed', bevelBlock(0.46, 0.24, 0.56, 0.014), [sx * postX, 0, 0]);
    b.add('dressed', bevelBlock(0.38, corbelH - 0.24, 0.48, 0.012), [sx * postX, 0.24, 0]);
    // heavy oak wall post rising to tie beam
    b.add('oak', bevelBlock(0.24, tieY - corbelH + 0.04, 0.24, 0.01), [sx * postX, corbelH, 0]);
  }

  // heavy cambered oak tie beam spanning full width
  const tiePts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = -hw + t * span;
    const camber = Math.sin(t * Math.PI) * 0.1;
    tiePts.push([x, tieY + camber, 0]);
  }
  const tieProf = [
    [-0.14, -0.13],
    [0.14, -0.13],
    [0.14, 0.13],
    [-0.14, 0.13],
  ];
  b.add('oak', sweepProfile(tieProf, tiePts, { up: [0, 0, 1], closeCaps: true }));

  // curved oak arch-braces springing from wall posts up into the tie beam
  for (const sx of [-1, 1]) {
    const bPts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const x = sx * (postX - 0.1 - Math.sin((t * Math.PI) / 2) * 1.15);
      const y = corbelH + 0.12 + (1 - Math.cos((t * Math.PI) / 2)) * (tieY - corbelH - 0.1);
      bPts.push([x, y, 0]);
    }
    const braceProf = [
      [-0.09, -0.09],
      [0.09, -0.09],
      [0.09, 0.09],
      [-0.09, 0.09],
    ];
    b.add('oak', sweepProfile(braceProf, bPts, { up: [0, 0, 1], closeCaps: true }));
  }

  // central chamfered octagonal king-post with flared jowl head & base
  const kpBot = tieY + 0.22;
  b.add('oak', bevelBlock(0.28, 0.14, 0.28, 0.01), [0, kpBot, 0]);
  b.add('oak', G.cylinder(0.11, 0.11, apexY - kpBot - 0.36, 8, { y0: kpBot + 0.14 }), [0, 0, 0]);
  b.add('oak', bevelBlock(0.28, 0.28, 0.28, 0.01), [0, apexY - 0.26, 0]);

  // upper collar beam & twin principal rafters + raking queen struts
  const collarY = 2.52;
  const collarW = 2.55;
  b.add('oak', bevelBlock(collarW, 0.18, 0.2, 0.01), [0, collarY, 0]);

  for (const sx of [-1, 1]) {
    // principal rafter from eaves foot to apex
    const p0 = [sx * (hw + 0.14), tieY + 0.08, 0];
    const p1 = [0, apexY + 0.04, 0];
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
    b.add('oak', bevelBox(len, 0.22, 0.22, 0.01), [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, 0], 0, 0, ang);

    // diagonal raking strut from king-post base out to principal rafter
    const s0 = [sx * 0.12, kpBot + 0.12, 0];
    const s1 = [sx * 1.38, collarY + 0.08, 0];
    const slen = Math.hypot(s1[0] - s0[0], s1[1] - s0[1]);
    const sang = Math.atan2(s1[1] - s0[1], s1[0] - s0[0]);
    b.add('oak', bevelBox(slen, 0.15, 0.16, 0.008), [(s0[0] + s1[0]) / 2, (s0[1] + s1[1]) / 2, 0], 0, 0, sang);

    // projecting purlin cleats seated on the principal rafters
    b.add('darkWood', bevelBox(0.22, 0.16, 0.56, 0.008), [sx * 1.48, 2.72, 0], 0, 0, -sx * 0.72);
    // draw-bore oak pegs at major joints
    for (const [px, py] of [[sx * postX, tieY], [sx * 1.5, tieY], [sx * 1.15, collarY + 0.09], [sx * 0.14, kpBot + 0.14]]) {
      b.add('darkWood', G.cylinder(0.016, 0.016, 0.29, 8, { y0: -0.145 }), [px, py, 0], 0, Math.PI / 2);
    }
  }

  // forged wrought-iron T-strap reinforcement plates + rivets at central king-post & wall-post tie joints
  for (const sz of [-1, 1]) {
    b.add('iron', bevelBox(0.46, 0.08, 0.016, 0.003), [0, tieY + 0.1, sz * 0.138]);
    b.add('iron', bevelBox(0.1, 0.36, 0.016, 0.003), [0, tieY + 0.28, sz * 0.138]);
    rivets(b, 'iron', [[-0.16, tieY + 0.1, sz * 0.148], [0.16, tieY + 0.1, sz * 0.148], [0, tieY + 0.38, sz * 0.148]], 0.009);
  }
}

/** Stone arcade pier and moulded girder beam bay (4 m span x 3.85 m high). */
function buildPillarBeamStone(b) {
  const span = 4.0;
  const px = 1.6;
  const shaftTop = 2.86;
  const beamBot = 3.26;

  for (const sx of [-1, 1]) {
    const x = sx * px;
    b.add('dressed', bevelBlock(0.7, 0.22, 0.7, 0.016), [x, 0, 0]);
    columnBase(b, 'dressed', [x, 0.22, 0], 0.24, 0.24);
    b.add('dressed', G.cylinder(0.24, 0.25, shaftTop - 0.46, 8, { y0: 0.46 }), [x, 0, 0]);
    columnCapital(b, 'dressed', [x, shaftTop, 0], 0.25, 0.4);
    // stepped stone corbel bolster reducing span under the beam
    b.add('dressed', bevelBlock(0.76, 0.22, 0.58, 0.014), [x - sx * 0.22, beamBot - 0.22, 0]);
  }

  // heavy chamfered stone lintel/architrave beam + overhanging stone cornice cap
  b.add('stone', bevelBlock(span, 0.42, 0.56, 0.014), [0, beamBot, 0]);
  b.add('dressed', bevelBlock(span + 0.06, 0.16, 0.76, 0.015), [0, beamBot + 0.42, 0]);

  // wrought-iron tie-rod patress anchor bars at pier capitals
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.add('iron', bevelBox(0.08, 0.44, 0.025, 0.004), [sx * px, beamBot + 0.21, sz * 0.29]);
      b.add('iron', bevelBox(0.18, 0.06, 0.03, 0.004), [sx * px, beamBot + 0.21, sz * 0.29]);
    }
  }
}

/** Heavy oak timber post-and-beam structural bay (4 m span) with stone plinths, knee-braces, floor joists and iron stirrups. */
function buildPillarBeamTimber(b) {
  const span = 4.0;
  const px = 1.62;
  const beamY = 2.92;

  for (const sx of [-1, 1]) {
    const x = sx * px;
    // stone damp-course pad base
    b.add('dressed', bevelBlock(0.42, 0.3, 0.42, 0.014), [x, 0, 0]);
    // heavy oak vertical post + flared bolster cap
    b.add('oak', bevelBlock(0.26, beamY - 0.3, 0.26, 0.01), [x, 0.3, 0]);
    b.add('oak', bevelBlock(0.68, 0.2, 0.28, 0.012), [x - sx * 0.1, beamY - 0.2, 0]);

    // curved oak knee-brace from post up to summer beam
    const kPts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const kx = x - sx * (0.1 + Math.sin((t * Math.PI) / 2) * 0.78);
      const ky = 2.02 + (1 - Math.cos((t * Math.PI) / 2)) * (beamY - 2.02);
      kPts.push([kx, ky, 0]);
    }
    const kProf = [
      [-0.08, -0.08],
      [0.08, -0.08],
      [0.08, 0.08],
      [-0.08, 0.08],
    ];
    b.add('oak', sweepProfile(kProf, kPts, { up: [0, 0, 1], closeCaps: true }));
    b.add('darkWood', G.cylinder(0.015, 0.015, 0.3, 8, { y0: -0.15 }), [x - sx * 0.75, beamY + 0.1, 0], 0, Math.PI / 2);

    // forged iron U-stirrup bracket wrapping post head & summer beam
    b.add('iron', bevelBox(0.055, 0.38, 0.305, 0.004), [x, beamY - 0.05, 0]);
    rivets(b, 'iron', [[x, beamY - 0.14, 0.158], [x, beamY + 0.12, 0.158], [x, beamY - 0.14, -0.158], [x, beamY + 0.12, -0.158]], 0.009);
  }

  // main chamfered oak summer-beam girder + 5 transverse ceiling floor joists
  b.add('oak', bevelBlock(span, 0.3, 0.28, 0.012), [0, beamY, 0]);
  for (let i = 0; i < 5; i++) {
    const jx = -1.6 + i * 0.8;
    b.add('darkWood', bevelBlock(0.16, 0.22, 0.92, 0.008), [jx, beamY + 0.3, 0]);
  }
}

/** Carved Gothic stone gargoyle waterspout crouching on a stepped cornice corbel block. */
function buildGargoyleSpout(b) {
  // base stepped plinth, projecting corbel bracket and top stone water-drain channel
  b.add('dressed', bevelBlock(0.66, 0.22, 0.96, 0.014), [0, 0, -0.1]);
  b.add('dressed', bevelBlock(0.58, 0.24, 0.82, 0.012), [0, 0.22, -0.14]);
  // projecting front corbel console supporting the gargoyle claws
  b.add('dressed', bevelBlock(0.52, 0.18, 0.56, 0.012), [0, 0.28, 0.24]);
  b.add('dressed', bevelBlock(0.46, 0.14, 0.4, 0.012), [0, 0.16, 0.14]);
  // side cheeks of the rear stone gutter runnel
  for (const sx of [-1, 1]) {
    b.add('dressed', bevelBlock(0.14, 0.16, 0.44, 0.01), [sx * 0.18, 0.46, -0.34]);
  }
  b.add('void', G.block(0.22, 0.02, 0.42), [0, 0.46, -0.34]);

  // organic sculpted beast torso, arched neck and upper skull lofted along S-curve centerline
  const stations = [
    // [z, y, rx, ry, ridgeY]
    [-0.14, 0.56, 0.14, 0.11, 0.02],
    [-0.02, 0.61, 0.18, 0.14, 0.03],
    [0.12, 0.64, 0.16, 0.13, 0.03],
    [0.24, 0.69, 0.19, 0.16, 0.04],
    [0.36, 0.74, 0.15, 0.14, 0.04],
    [0.48, 0.79, 0.11, 0.11, 0.03],
    [0.6, 0.82, 0.12, 0.11, 0.02],
    [0.7, 0.8, 0.09, 0.08, 0.01],
    [0.79, 0.77, 0.065, 0.055, 0.0],
    [0.85, 0.75, 0.03, 0.03, 0.0],
  ];
  const segs = 14;
  const rings = stations.map(([z, y, rx, ry, ridge]) => {
    const loop = [];
    for (let k = 0; k < segs; k++) {
      const a = (k / segs) * Math.PI * 2;
      const sx = Math.cos(a) * rx;
      const spineBoost = Math.sin(a) > 0.75 ? ridge * Math.pow(Math.sin(a), 3) : 0;
      const sy = y + Math.sin(a) * ry + spineBoost;
      loop.push([sx, sy, z]);
    }
    return loop;
  });
  b.add('dressed', loftRings(rings, { closeStart: true, closeEnd: true, smooth: true }));

  // hinged roaring lower jaw & recessed throat waterspout bore + four sculpted stone fangs
  const jawPts = [
    [0, 0.75, 0.62],
    [0, 0.71, 0.72],
    [0, 0.66, 0.82],
  ];
  const jawProf = [
    [-0.03, -0.055],
    [0.03, -0.055],
    [0.025, 0.055],
    [-0.025, 0.055],
  ];
  b.add('dressed', sweepProfile(jawProf, jawPts, { up: [1, 0, 0], closeCaps: true, smooth: true }));
  b.add('void', G.cylinder(0.026, 0.026, 0.06, 10), [0, 0.72, 0.69], 0, Math.PI / 2 - 0.18);
  for (const sx of [-1, 1]) {
    b.add('dressed', G.cylinder(0.002, 0.012, 0.045, 6), [sx * 0.032, 0.72, 0.78], 0, Math.PI);
    b.add('dressed', G.cylinder(0.002, 0.01, 0.036, 6), [sx * 0.028, 0.69, 0.78]);
  }

  // swept tapered curved demonic horns and pointed stone ears
  for (const sx of [-1, 1]) {
    const hSpine = [
      [sx * 0.075, 0.87, 0.63],
      [sx * 0.105, 0.93, 0.59],
      [sx * 0.132, 0.98, 0.52],
      [sx * 0.148, 1.0, 0.44],
      [sx * 0.142, 0.96, 0.36],
    ];
    const hRads = [0.03, 0.026, 0.021, 0.015, 0.008];
    const hRings = hSpine.map(([hx, hy, hz], idx) => {
      const r = hRads[idx];
      const loop = [];
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        loop.push([hx + Math.cos(a) * r, hy + Math.sin(a) * r, hz]);
      }
      return loop;
    });
    b.add('dressed', loftRings(hRings, { closeStart: true, closeEnd: true, smooth: true }));
    b.add('dressed', G.cylinder(0.004, 0.022, 0.11, 6), [sx * 0.105, 0.86, 0.58], -sx * 0.35, -0.55);
  }

  // braced muscular forelegs with clawed paws gripping the stone ledge, plus tucked hind haunches
  for (const sx of [-1, 1]) {
    // upper & lower foreleg segments
    b.add('dressed', G.rod([sx * 0.16, 0.71, 0.25], [sx * 0.19, 0.58, 0.36], 0.048, 10));
    b.add('dressed', G.rod([sx * 0.19, 0.58, 0.36], [sx * 0.18, 0.47, 0.44], 0.038, 10));
    // 3 clawed talons gripping the front cornice edge
    for (const dx of [-0.028, 0, 0.028]) {
      b.add('dressed', G.cylinder(0.004, 0.013, 0.08, 6), [sx * 0.18 + dx, 0.46, 0.49], 0, Math.PI * 0.65);
    }
    // tucked muscular hind haunch and clawed hind foot
    b.add('dressed', G.rod([sx * 0.16, 0.58, -0.02], [sx * 0.19, 0.48, 0.06], 0.058, 10));
    b.add('dressed', bevelBlock(0.08, 0.05, 0.12, 0.015), [sx * 0.19, 0.46, 0.08]);

    // folded bat-like carved stone wings (ribbed wing-bones + stone web)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(-0.34, 0.26);
    wingShape.lineTo(-0.4, 0.02);
    wingShape.lineTo(-0.24, -0.1);
    wingShape.closePath();
    const wg = new THREE.ExtrudeGeometry(wingShape, { depth: 0.032, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 });
    wg.translate(0, 0, -0.016);
    wg.rotateY(-Math.PI / 2 - sx * 0.36);
    b.add('dressed', G.boxUV(wg), [sx * 0.16, 0.76, 0.2]);
    // upper sculpted wing-bone strut
    b.add('dressed', G.rod([sx * 0.14, 0.77, 0.22], [sx * 0.28, 1.03, -0.08], 0.026, 8));
  }

  // curled stone tail wrapping down onto the plinth
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.55, -0.12),
    new THREE.Vector3(0.1, 0.5, -0.22),
    new THREE.Vector3(0.22, 0.47, -0.14),
    new THREE.Vector3(0.24, 0.48, -0.02),
  ]);
  b.add('dressed', G.boxUV(new THREE.TubeGeometry(tailCurve, 14, 0.026, 7, false)));
}

export const structureModules = [
  {
    id: 'truss_timber',
    name: 'Oak roof truss',
    category: 'structure',
    description: '6 m span medieval oak king-post & arch-braced roof truss on stone corbels with cambered tie beam, raking struts, draw-bore pegs and iron T-straps.',
    build(M) {
      const b = newArchBuilder(M);
      buildTrussTimber(b);
      return b.build('truss_timber');
    },
  },
  {
    id: 'pillar_beam_stone',
    name: 'Stone pillar & beam bay',
    category: 'structure',
    description: '4 m castle stone arcade pier & lintel bay with octagonal shaft bases, bell capitals, corbel haunches, moulded stone cornice and iron tie anchors.',
    build(M) {
      const b = newArchBuilder(M);
      buildPillarBeamStone(b);
      return b.build('pillar_beam_stone');
    },
  },
  {
    id: 'pillar_beam_timber',
    name: 'Timber post & beam bay',
    category: 'structure',
    description: '4 m medieval oak post-and-beam bay on stone damp-course pads with curved knee-braces, chamfered summer beam, ceiling joists and iron stirrup straps.',
    build(M) {
      const b = newArchBuilder(M);
      buildPillarBeamTimber(b);
      return b.build('pillar_beam_timber');
    },
  },
  {
    id: 'gargoyle_spout',
    name: 'Gothic stone gargoyle',
    category: 'structure',
    description: 'Carved limestone Gothic winged gargoyle waterspout crouching on a stepped cornice corbel with drainage runnel, clawed paws, horns and roaring spout.',
    build(M) {
      const b = newArchBuilder(M);
      buildGargoyleSpout(b);
      return b.build('gargoyle_spout');
    },
  },
];
