// Realistic medieval containers: stave-ribbed oak barrel with tap & rivets, slatted timber crate,
// arched plank chest with padlock & hinges, and organically folded grain sack with exposed grain.
// Base sits at y = 0, centred on x = z = 0, 1 unit = 1 m.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { newBuilder, lathe, ringBand, bevelBlock, bevelBox, rivets } from '../lib/kit.js';

function oakBarrel(b) {
  const H = 0.92;
  const rEnd = 0.27;
  const rMid = 0.345;
  const staves = 20;
  // build individual stave ribs by displacing radius around a recessed-head lathe mesh
  const segs = staves * 4;
  const pts = [[0, 0.038], [rEnd - 0.024, 0.038], [rEnd - 0.024, 0]];
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const r = rEnd + (rMid - rEnd) * Math.pow(Math.sin(t * Math.PI), 0.84);
    pts.push([r, t * H]);
  }
  pts.push([rEnd - 0.024, H], [rEnd - 0.024, H - 0.038], [0, H - 0.038]);
  const body = new THREE.LatheGeometry(
    pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0), y)),
    segs,
  );
  // crease every stave seam so each wooden stave reads as a distinct curved plank
  const pos = body.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const rr = Math.hypot(x, z);
    if (rr > rEnd - 0.02 && y > 0.005 && y < H - 0.005) {
      const ang = Math.atan2(z, x);
      const stavePhase = Math.abs(Math.sin(ang * (staves / 2)));
      const groove = -0.003 + 0.004 * Math.pow(stavePhase, 0.35);
      const s = (rr + groove) / rr;
      pos.setX(i, x * s);
      pos.setZ(i, z * s);
    }
  }
  body.computeVertexNormals();
  b.add('barrel', G.cylUV(body, rMid));

  // 4 forged iron hoops with lap joints and circumferential rivets
  for (const t of [0.06, 0.27, 0.73, 0.94]) {
    const y = t * H;
    const r = rEnd + (rMid - rEnd) * Math.pow(Math.sin(t * Math.PI), 0.84);
    b.add('iron', ringBand(r + 0.006, 0.012, 0.044, 36), [0, y - 0.022, 0]);
    // lap-joint plate on +X
    b.add('iron', bevelBox(0.014, 0.046, 0.06, 0.002), [r + 0.012, y, 0]);
    const rPts = [];
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      rPts.push([Math.cos(a) * (r + 0.013), y, Math.sin(a) * (r + 0.013)]);
    }
    rivets(b, 'iron', rPts, 0.0065);
  }
  // wooden bung on top head and brass/oak tap spigot on lower front (+Z)
  b.add('darkWood', G.cylinder(0.022, 0.019, 0.025, 12), [0.1, H - 0.032, 0.06]);
  b.push([0, 0.16, rEnd + 0.01]);
  b.add('darkWood', G.cylinder(0.026, 0.022, 0.055, 12), [0, 0, 0.02], 0, Math.PI / 2);
  b.add('gilt', G.cylinder(0.012, 0.012, 0.07, 10), [0, 0, 0.055], 0, Math.PI / 2);
  b.add('gilt', G.cylinder(0.008, 0.008, 0.04, 10), [0, 0.028, 0.075]);
  b.add('gilt', bevelBox(0.055, 0.014, 0.014, 0.003), [0, 0.048, 0.075]);
  b.add('gilt', G.cylinder(0.009, 0.007, 0.032, 10), [0, -0.018, 0.085]);
  b.pop();
}

function woodenCrate(b) {
  const S = 0.88;
  const H = 0.84;
  // individual horizontal slats with real gaps on all 4 sides + top & bottom
  const slats = 5;
  const gap = 0.005;
  const innerH = H - 0.14;
  const slatH = (innerH - gap * (slats - 1)) / slats;
  for (let side = 0; side < 4; side++) {
    b.push([0, 0, 0], (side * Math.PI) / 2);
    for (let i = 0; i < slats; i++) {
      const y = 0.07 + i * (slatH + gap);
      b.add('oak', bevelBlock(S - 0.14, slatH, 0.024, 0.004), [0, y, S / 2 - 0.045]);
    }
    // outer diagonal brace fitted neatly inside the frame
    const br = G.beamXY(-S / 2 + 0.09, 0.09, S / 2 - 0.09, H - 0.09, 0.068, 0.032, 0);
    b.add('timber', br, [0, 0, S / 2 - 0.022]);
    // top & bottom horizontal outer frame rails
    for (const y of [0, H - 0.075]) {
      b.add('timber', bevelBlock(S - 0.04, 0.075, 0.055, 0.006), [0, y, S / 2 - 0.0275]);
    }
    b.pop();
  }
  // top & bottom lid slats
  const lidW = (S - 0.14 - gap * 3) / 4;
  for (const y of [0.025, H - 0.05]) {
    for (let i = 0; i < 4; i++) {
      const z = -(S - 0.14) / 2 + lidW / 2 + i * (lidW + gap);
      b.add('oak', bevelBlock(S - 0.12, 0.025, lidW, 0.004), [0, y, z]);
    }
  }
  // 4 corner uprights + 8 forged L-shaped iron corner brackets with rivets
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const cx = sx * (S / 2 - 0.038);
      const cz = sz * (S / 2 - 0.038);
      b.add('timber', bevelBlock(0.076, H, 0.076, 0.007), [cx, 0, cz]);
      for (const y of [0.004, H - 0.11]) {
        b.add('iron', bevelBlock(0.095, 0.105, 0.095, 0.004), [cx, y, cz]);
        rivets(b, 'iron', [
          [cx + sx * 0.049, y + 0.03, cz],
          [cx + sx * 0.049, y + 0.075, cz],
          [cx, y + 0.03, cz + sz * 0.049],
          [cx, y + 0.075, cz + sz * 0.049],
        ], 0.007);
      }
    }
  }
}

function treasureChest(b) {
  const W = 1.14;
  const D = 0.64;
  const boxH = 0.46;
  const lidR = D / 2;
  // stepped dark oak base skirt
  b.add('darkWood', bevelBlock(W + 0.05, 0.065, D + 0.05, 0.008), [0, 0, 0]);
  // planked front/back/side walls (4 horizontal oak planks per side)
  for (let i = 0; i < 4; i++) {
    const y = 0.06 + i * 0.1;
    b.add('oak', bevelBlock(W - 0.02, 0.095, D - 0.02, 0.005), [0, y, 0]);
  }
  // end stile frames on left & right walls
  for (const sx of [-1, 1]) {
    b.add('darkWood', bevelBlock(0.045, boxH - 0.06, D + 0.01, 0.005), [sx * (W / 2 - 0.015), 0.06, 0]);
  }
  // arched lid built from 7 separate chamfered staves over solid arched end panels
  const endPanel = new THREE.CylinderGeometry(lidR - 0.015, lidR - 0.015, W - 0.06, 18, 1, false, 0, Math.PI);
  endPanel.rotateZ(Math.PI / 2);
  b.add('darkWood', G.boxUV(endPanel), [0, boxH, 0]);
  const lidStaves = 7;
  for (let i = 0; i < lidStaves; i++) {
    const a = ((i + 0.5) / lidStaves) * Math.PI - Math.PI / 2;
    const y = boxH + Math.cos(a) * lidR;
    const z = Math.sin(a) * lidR;
    b.add('oak', bevelBox(W, 0.026, (Math.PI * lidR) / lidStaves - 0.006, 0.004), [0, y, z], 0, -a);
  }
  // 4 forged iron bands with domed rivets wrapping body and arched lid
  for (const x of [-0.46, -0.16, 0.16, 0.46]) {
    b.add('iron', bevelBlock(0.052, boxH + 0.01, D + 0.026, 0.004), [x, 0, 0]);
    const band = new THREE.CylinderGeometry(lidR + 0.022, lidR + 0.022, 0.052, 20, 1, false, 0, Math.PI);
    band.rotateZ(Math.PI / 2);
    b.add('iron', G.boxUV(band), [x, boxH, 0]);
    // rivets up the front, back and over the arch
    const rPts = [];
    for (const sz of [-1, 1]) {
      for (const ry of [0.13, 0.28, 0.41]) rPts.push([x, ry, sz * (D / 2 + 0.014)]);
    }
    for (const a of [-1.05, -0.45, 0, 0.45, 1.05]) {
      rPts.push([x, boxH + Math.cos(a) * (lidR + 0.023), Math.sin(a) * (lidR + 0.023)]);
    }
    rivets(b, 'gilt', rPts, 0.0075);
  }
  // gothic forged lock escutcheon, keyhole, hasp and hanging iron padlock on +Z
  const esc = new THREE.Shape();
  esc.moveTo(0, -0.13);
  esc.quadraticCurveTo(0.09, -0.06, 0.085, 0.06);
  esc.lineTo(0.06, 0.1);
  esc.lineTo(-0.06, 0.1);
  esc.lineTo(-0.085, 0.06);
  esc.quadraticCurveTo(-0.09, -0.06, 0, -0.13);
  const escG = new THREE.ExtrudeGeometry(esc, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1 });
  b.add('iron', G.boxUV(escG), [0, boxH - 0.11, D / 2]);
  b.add('gilt', bevelBox(0.038, 0.075, 0.014, 0.003), [0, boxH - 0.09, D / 2 + 0.018]);
  // hinged hasp dropping from lid + hanging padlock
  b.add('iron', bevelBox(0.044, 0.13, 0.018, 0.003), [0, boxH + 0.01, D / 2 + 0.024]);
  b.add('iron', bevelBox(0.075, 0.085, 0.032, 0.006), [0, boxH - 0.13, D / 2 + 0.035]);
  const shackle = new THREE.TorusGeometry(0.024, 0.006, 6, 14, Math.PI);
  b.add('iron', G.boxUV(shackle), [0, boxH - 0.09, D / 2 + 0.035]);
  // side iron carrying rings mounted on riveted backplates
  for (const sx of [-1, 1]) {
    b.add('iron', bevelBox(0.02, 0.14, 0.12, 0.004), [sx * (W / 2 + 0.008), 0.28, 0]);
    const ring = new THREE.TorusGeometry(0.07, 0.012, 8, 18);
    ring.rotateY(Math.PI / 2);
    ring.rotateZ(sx * -0.22); // hangs naturally against the chest side
    b.add('iron', G.boxUV(ring), [sx * (W / 2 + 0.032), 0.24, 0]);
  }
}

function grainSack(b) {
  const H = 0.72;
  // high-res lathe deformed with slouch, belly droop and 10 radial gathers at the tied neck
  const pts = [
    [0, 0],
    [0.19, 0],
    [0.245, 0.06],
    [0.26, 0.18],
    [0.23, 0.34],
    [0.15, 0.48],
    [0.065, 0.56],
    [0.055, 0.59],
    [0.115, 0.69],
    [0.105, 0.72],
    [0.075, 0.65],
    [0.045, 0.58],
    [0, 0.56],
  ];
  const g = new THREE.LatheGeometry(
    pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0), y)),
    32,
  );
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const rr = Math.hypot(x, z);
    if (rr > 0.005) {
      const a = Math.atan2(z, x);
      const t = y / H;
      // slouch & corner bulges at base, deep radial pleats near neck & collar
      const slouch = Math.sin(a * 2 + 0.5) * 0.018 * (1 - t);
      const neckPleats = Math.sin(a * 9 + 0.4) * 0.015 * Math.exp(-Math.pow((t - 0.82) / 0.16, 2));
      const bellySag = Math.sin(a * 3 - 0.7) * 0.012 * Math.sin(t * Math.PI);
      const s = (rr + slouch + neckPleats + bellySag) / rr;
      x *= s;
      z *= s * 0.88; // slightly oval footprint
      // slight lean of the upper neck
      x += Math.pow(Math.max(0, t - 0.4), 2) * 0.06;
    }
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  b.add('linen', G.cylUV(g, 0.25));
  // exposed grain mound inside the open ruffled collar
  b.add('straw', lathe([[0, 0.56], [0.06, 0.57], [0.04, 0.62], [0, 0.63]], 14), [0.01, 0, 0]);
  // 3-turn twisted hemp rope binding around the pinched neck + knot ends
  for (const dy of [-0.014, 0, 0.014]) {
    const rope = new THREE.TorusGeometry(0.068, 0.0085, 7, 20);
    rope.rotateX(Math.PI / 2);
    rope.scale(1.0, 1.0, 0.88);
    b.add('straw', G.boxUV(rope), [0.012, 0.58 + dy, 0]);
  }
  b.add('straw', G.cylinder(0.008, 0.006, 0.09, 6), [0.055, 0.54, 0.05], 0.3, 0.25, -0.4);
  b.add('straw', G.cylinder(0.008, 0.006, 0.08, 6), [0.075, 0.55, 0.03], -0.2, 0.3, -0.6);
}

export const containerModules = [
  {
    id: 'barrel_oak',
    name: 'Oak barrel',
    category: 'container',
    description: '0.92 m bilged barrel with individually creased oak staves, riveted lap-joint iron hoops, bung and brass spigot.',
    build(M) {
      const b = newBuilder(M);
      oakBarrel(b);
      return b.build('barrel_oak');
    },
  },
  {
    id: 'crate_wooden',
    name: 'Wooden crate',
    category: 'container',
    description: '0.88 m slatted supply crate with bevelled planks, diagonal bracing and riveted forged iron corner brackets.',
    build(M) {
      const b = newBuilder(M);
      woodenCrate(b);
      return b.build('crate_wooden');
    },
  },
  {
    id: 'chest_treasure',
    name: 'Iron-bound chest',
    category: 'container',
    description: 'Arched plank-stave chest bound with four riveted iron bands, gothic lock escutcheon, padlock and side rings.',
    build(M) {
      const b = newBuilder(M);
      treasureChest(b);
      return b.build('chest_treasure');
    },
  },
  {
    id: 'sack_grain',
    name: 'Grain sack',
    category: 'container',
    description: 'Heavy pleated linen grain sack with organic slouch, triple rope binding, ruffled collar and visible grain.',
    build(M) {
      const b = newBuilder(M);
      grainSack(b);
      return b.build('sack_grain');
    },
  },
];
