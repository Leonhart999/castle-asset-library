// Shared helpers, builders and local PBR materials for Category 1 (Defence & Fortifications).
// Never modifies kit.js or existing modules; extra materials are lazily attached to M so
// viewer/main.js awaits texturesReady() cleanly and exported GLBs trace back to library/materials/.
// Conventions: 1 unit = 1 m, base at y = 0, +Z is outer (field) face, -Z is inner (courtyard) face.

import * as THREE from 'three';
import * as G from './geo.js';
import { pbr } from './materials.js';
import { DIM, bevelBlock, bevelBox, rivets, merlon, newBuilder } from './kit.js';

export function defenceModule(id, name, description, model, category = 'defence') {
  return { id, name, category, description, build(M) {
    const b = newBuilder(ensureDefenceMaterials(M));
    model(b);
    return b.build(id);
  } };
}

/**
 * Lazily ensures defence-specific PBR materials exist on M without touching src/lib/kit.js.
 * Every texture-backed entry traces back to library/materials/<category>/<id>.
 */
export function ensureDefenceMaterials(M) {
  if (M._defenceReady) return M;
  M._defenceReady = true;
  if (!M.mossyStone) M.mossyStone = pbr('mossy_stone_wall', { tile: 2.2, color: 0xd6ded0, normalScale: 1.15 });
  if (!M.oldStone) M.oldStone = pbr('old_stone_wall', { tile: 2.2, color: 0xd8d2c7, normalScale: 1.15 });
  if (!M.cobble) M.cobble = pbr('cobblestone_floor_01', { tile: 1.8, color: 0xd4cfc5, normalScale: 1.15 });
  if (!M.gateWood) M.gateWood = pbr('wooden_gate', { tile: 1.9, color: 0xc2ad92, normalScale: 1.25 });
  if (!M.palisadeBark) M.palisadeBark = pbr('pine_bark', { tile: 1.4, color: 0xb09d84, normalScale: 1.35 });
  if (!M.roofPlanks) M.roofPlanks = pbr('roof_planks', { tile: 1.5, color: 0xbda88e, normalScale: 1.2, side: THREE.DoubleSide });
  if (!M.slateDark) M.slateDark = pbr('roof_slates_03', { tile: 2.2, color: 0xc5c4be, normalScale: 1.1, side: THREE.DoubleSide });
  if (!M.earth) M.earth = pbr('brown_mud_rocks_01', { tile: 2.0, color: 0xb5a898, normalScale: 1.2 });
  if (!M.turf) M.turf = pbr('grass_ground', { tile: 2.5, color: 0x99ab78, normalScale: 1.1 });
  if (!M.rope) M.rope = pbr('thatch_roof_angled', { name: 'hemp_rope', tile: 0.4, color: 0xcab485, normalScale: 1.3 });
  if (!M.moatWater) {
    M.moatWater = new THREE.MeshStandardMaterial({
      name: 'moat_water',
      color: 0x243b33,
      roughness: 0.08,
      metalness: 0.14,
      transparent: true,
      opacity: 0.84,
      side: THREE.DoubleSide,
    });
  }
  return M;
}

/**
 * Creates a clean, non-self-intersecting 2D shape for a medieval crosslet arrow loop
 * (vertical slit + horizontal cross-bar + circular oilette at the base), centred on x.
 * y is the sill (bottom of the oilette / slit).
 */
export function crossletShape({ x = 0, y = 0, w = 0.13, h = 1.65, crossY = null, crossW = 0.56, crossH = 0.12, oiletteR = 0.11 } = {}) {
  const hw = w / 2;
  const hcw = crossW / 2;
  const cy = crossY ?? y + h * 0.62;
  const ch = crossH / 2;
  const oy = y + oiletteR;
  const ox = Math.max(hw, oiletteR * 0.88);
  const pts = [
    [x - ox, y],
    [x + ox, y],
    [x + ox, oy + oiletteR * 0.72],
    [x + hw, oy + oiletteR * 0.9],
    [x + hw, cy - ch],
    [x + hcw, cy - ch],
    [x + hcw, cy + ch],
    [x + hw, cy + ch],
    [x + hw, y + h],
    [x - hw, y + h],
    [x - hw, cy + ch],
    [x - hcw, cy + ch],
    [x - hcw, cy - ch],
    [x - hw, cy - ch],
    [x - hw, oy + oiletteR * 0.9],
    [x - ox, oy + oiletteR * 0.72],
  ];
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  return s;
}

/**
 * Cutter prism for a crosslet arrow loop on a face whose outward normal is +Z at z = 0.
 * Extends inward to z = -depth and outward to z = +0.5 for clean CSG subtraction.
 */
export function crossletCutter(opts, depth) {
  const g = new THREE.ExtrudeGeometry(crossletShape(opts), { depth: depth + 0.6, bevelEnabled: false });
  g.translate(0, 0, -depth);
  return g;
}

/**
 * Splayed inner archer embrasure cutter (trapezoidal niche narrowing from the inner wall face
 * toward the exterior slit). Built in face-local space (+Z outward, face at z = 0, cuts into -Z).
 */
export function embrasureCutter({ x = 0, y = 0, innerW = 1.05, outerW = 0.42, h = 2.05, depth = 1.3 } = {}) {
  const hw0 = innerW / 2;
  const hw1 = outerW / 2;
  const shape = new THREE.Shape();
  // Trapezoid in XZ extruded upward along Y, built directly as prism
  const pts = [
    [x - hw0, 0.35],
    [x + hw0, 0.35],
    [x + hw1, -depth],
    [x - hw1, -depth],
  ];
  shape.moveTo(pts[0][0], -pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], -pts[i][1]);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

/**
 * Dressed ashlar stone frame around a crosslet arrow loop on a +Z face at z = faceZ.
 */
export function crossletFrame(b, x, y, faceZ, { w = 0.13, h = 1.65, crossY = null, crossW = 0.56, crossH = 0.12, oiletteR = 0.11, f = 0.14, proud = 0.06 } = {}) {
  const cy = crossY ?? y + h * 0.62;
  const d = proud + 0.06;
  const cz = faceZ - 0.04 + d / 2;
  const fh = f * 0.7;
  // Top lintel and sill block
  b.add('dressed', bevelBlock(w + 2 * f, f, d, 0.008), [x, y + h, cz]);
  b.add('dressed', bevelBlock(oiletteR * 2 + 2 * f, f, d, 0.008), [x, y - f, cz]);
  // Lower oilette side cheeks (y .. y + oiletteR * 1.5)
  const oilTop = y + oiletteR * 1.5;
  for (const sx of [-1, 1]) {
    b.add('dressed', bevelBlock(f, oiletteR * 1.5, d, 0.008), [x + sx * (oiletteR * 0.9 + f / 2), y, cz]);
  }
  // Vertical jambs below and above cross-bar lintels (no overlap with cross-bar ledges or oilette cheeks)
  const armBot = cy - crossH / 2 - fh;
  const armTop = cy + crossH / 2 + fh;
  const lowH = armBot - oilTop;
  if (lowH > 0.04) {
    for (const sx of [-1, 1]) {
      b.add('dressed', bevelBlock(f, lowH, d, 0.008), [x + sx * (w / 2 + f / 2), oilTop, cz]);
    }
  }
  const hiH = y + h - armTop;
  if (hiH > 0.04) {
    for (const sx of [-1, 1]) {
      b.add('dressed', bevelBlock(f, hiH, d, 0.008), [x + sx * (w / 2 + f / 2), armTop, cz]);
    }
  }
  // Cross-bar horizontal sills/lintels spanning w/2..crossW/2 and outer end caps
  const armLen = Math.max(0.04, (crossW - w) / 2);
  for (const sx of [-1, 1]) {
    b.add('dressed', bevelBlock(armLen, fh, d, 0.006), [x + sx * (w / 2 + armLen / 2), cy + crossH / 2, cz]);
    b.add('dressed', bevelBlock(armLen, fh, d, 0.006), [x + sx * (w / 2 + armLen / 2), armBot, cz]);
    b.add('dressed', bevelBlock(f, crossH + 2 * fh, d, 0.008), [x + sx * (crossW / 2 + f / 2), armBot, cz]);
  }
}

/**
 * Multi-tier stepped stone corbel bracket pointing along local +Z from z = 0, top at yTop.
 * `tiers` defaults to 3 for crisp medieval machicolation silhouettes.
 */
export function steppedCorbel(b, mat, pos, rotY = 0, { tiers = 3, width = 0.34, tierH = 0.28, proj = 0.78 } = {}) {
  b.push(pos, rotY);
  for (let i = 0; i < tiers; i++) {
    const t = (tiers - i) / tiers; // top tier (i = 0) projects furthest
    const p = proj * t;
    const y = -(i + 1) * tierH;
    const g = bevelBlock(width, tierH - 0.005, p + 0.08, 0.012);
    g.translate(0, 0, p / 2 - 0.04);
    b.add(mat, g, [0, y, 0]);
  }
  b.pop();
}

/**
 * Row of multi-tier stepped stone corbels along a start point `p` [x, z] stepping by `dir`.
 */
export function steppedCorbelRow(b, mat, p, dir, count, step, out, yTop, opts = {}) {
  const rotY = Math.atan2(out[0], out[1]);
  for (let i = 0; i < count; i++) {
    steppedCorbel(b, mat, [p[0] + dir[0] * step * i, yTop, p[1] + dir[1] * step * i], rotY, opts);
  }
}

/**
 * Chamfered saddle-coped merlon with a recessed arrow slit in the middle (optional).
 */
export function detailedMerlon(b, w, d, pos, rotY = 0, { slit = false, lift = 0 } = {}) {
  b.push(pos, rotY);
  if (slit && w >= 1.0) {
    const sw = 0.13;
    const wing = (w - sw) / 2;
    b.add('stone', G.block(wing, DIM.merlonH, d), [-(sw + wing) / 2, 0, 0]);
    b.add('stone', G.block(wing, DIM.merlonH, d), [(sw + wing) / 2, 0, 0]);
    b.add('stone', G.block(sw, 0.34, d), [0, 0, 0]);
    b.add('stone', G.block(sw, 0.2, d), [0, DIM.merlonH - 0.2, 0]);
  } else {
    b.add('stone', G.block(w, DIM.merlonH, d), [0, 0, 0]);
  }
  // Stepped bevelled coping cap
  b.add('dressed', bevelBlock(w + 0.12, DIM.capH * 0.6, d + 0.12, 0.01), [0, DIM.merlonH + lift, 0]);
  b.add('dressed', bevelBlock(w + 0.02, DIM.capH * 0.4, d + 0.02, 0.01), [0, DIM.merlonH + DIM.capH * 0.6 + lift, 0]);
  b.pop();
}

/**
 * Forged iron link chain running from 3D point p0 to p1.
 * Alternating links rotate 90 degrees about the chain axis so each link interlocks cleanly.
 */
export function ironChain(b, p0, p1, { linkLen = 0.13, linkR = 0.038, tubeR = 0.011, mat = 'iron' } = {}) {
  const A = new THREE.Vector3(...p0);
  const B = new THREE.Vector3(...p1);
  const delta = B.clone().sub(A);
  const dist = delta.length();
  if (dist < 0.05) return;
  const dir = delta.clone().normalize();
  const n = Math.max(2, Math.round(dist / (linkLen * 0.72)));
  const qAxis = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const center = A.clone().lerp(B, t);
    const link = new THREE.TorusGeometry(linkR, tubeR, 5, 10);
    link.scale(0.68, (linkLen * 0.52) / linkR, 1);
    if (i % 2 === 1) link.rotateY(Math.PI / 2);
    const m = new THREE.Matrix4().compose(center, qAxis, new THREE.Vector3(1, 1, 1));
    b.add(mat, G.boxUV(link).applyMatrix4(m));
  }
}

/**
 * Heavy timber door leaf (or double-leaf pair) framed with vertical plank seams,
 * forged iron hinge straps, corner brackets, dome rivets and pull rings.
 * Local space: centred at x = 0, bottom at y = 0, thickness centred on z = 0 (faces +-Z).
 */
export function heavyDoor(b, w, h, thick = 0.16, { doubleLeaf = true, arch = 'rect', matWood = 'gateWood', addRings = true } = {}) {
  if (arch !== 'rect') {
    const o = { x: 0, y: 0, w, h, arch };
    const leaf = G.boxUV(new THREE.ExtrudeGeometry(G.openingShape(o), { depth: thick, bevelEnabled: false, curveSegments: 10 }));
    leaf.translate(0, 0, -thick / 2);
    b.add(matWood, leaf);
  } else {
    b.add(matWood, bevelBlock(w, h, thick, 0.012));
  }

  // Plank joint grooves on both faces + central meeting stile when double-leaf
  const plankCount = Math.max(4, Math.round(w / 0.28));
  for (let i = 1; i < plankCount; i++) {
    const px = -w / 2 + (i / plankCount) * w;
    const isCenter = doubleLeaf && Math.abs(px) < 0.08;
    let ph = h - 0.04;
    if (arch === 'pointed') {
      const springY = Math.max(0.2, h - w * 0.866);
      const dx = Math.abs(px) + w / 2;
      const arcTop = springY + Math.sqrt(Math.max(0, w * w - dx * dx));
      ph = Math.max(0.2, arcTop - 0.06);
    } else if (arch === 'round') {
      const hw = w / 2;
      const springY = Math.max(0.2, h - hw);
      const arcTop = springY + Math.sqrt(Math.max(0, hw * hw - px * px));
      ph = Math.max(0.2, arcTop - 0.06);
    }
    b.add('void', G.block(isCenter ? 0.032 : 0.012, ph, thick + 0.01), [px, 0.02, 0]);
  }
  if (doubleLeaf) {
    b.add('void', G.block(0.034, arch === 'rect' ? h - 0.02 : h * 0.94, thick + 0.014), [0, 0.01, 0]);
  }

  // Horizontal forged iron straps with dome rivets on both faces
  const strapYs = [h * 0.16, h * 0.45, h * 0.72].filter((yy) => yy < h - 0.25);
  const strapW = doubleLeaf ? w * 0.46 : w * 0.92;
  const strapCenters = doubleLeaf ? [-w * 0.26, w * 0.26] : [0];
  const rvPts = [];
  for (const sy of strapYs) {
    for (const sx of strapCenters) {
      b.add('iron', bevelBox(strapW, 0.09, thick + 0.035, 0.008), [sx, sy, 0]);
      for (const fz of [-1, 1]) {
        for (let r = -2; r <= 2; r++) {
          rvPts.push([sx + r * (strapW * 0.18), sy, fz * (thick / 2 + 0.02)]);
        }
      }
    }
  }
  rivets(b, 'iron', rvPts, 0.015);

  if (addRings) {
    const ringXs = doubleLeaf ? [-w * 0.14, w * 0.14] : [w * 0.34];
    for (const rx of ringXs) {
      for (const fz of [-1, 1]) {
        const esc = G.cylinder(0.055, 0.055, 0.02, 12, { y0: -0.01 }).rotateX(Math.PI / 2);
        b.add('iron', esc, [rx, Math.min(1.45, h * 0.48), fz * (thick / 2 + 0.01)]);
        const tor = G.boxUV(new THREE.TorusGeometry(0.085, 0.015, 7, 16));
        b.add('iron', tor, [rx, Math.min(1.38, h * 0.48 - 0.07), fz * (thick / 2 + 0.025)]);
      }
    }
  }
}

/**
 * Cobblestone/flagstone walkway surface with recessed drain gutter for wall tops.
 */
export function walkwayPaving(b, len, yWalk, zMin = -1, zMax = 1.5, mat = 'cobble') {
  const depth = zMax - zMin;
  b.add(mat, G.block(len - 0.01, 0.025, depth - 0.04), [0, yWalk - 0.012, (zMin + zMax) / 2]);
}

/**
 * Putlog scaffolding sockets along a wall face (used for hoarding cantilevers or construction holes).
 */
export function putlogSockets(b, xList, y, zFace, { w = 0.18, h = 0.18, depth = 0.18 } = {}) {
  for (const x of xList) {
    b.add('void', G.block(w, h, depth), [x, y, zFace - depth / 2 + 0.02]);
    b.add('dressed', bevelBlock(w + 0.1, 0.06, 0.06, 0.006), [x, y + h, zFace + 0.01]);
  }
}

/**
 * Stone machicolation bay along +X (centred on x = 0) at height yCorbelTop on a face at zFace (+Z outward).
 * Builds stepped triple corbels, stone floor slabs separated by drop slots, and an overhanging crenellated breastwork.
 */
export function machicolationWallTop(b, len, yCorbelTop, zFace, { corbels = 5, step = null, proj = 0.85, merlons = 2, parapetH = 1.0, parapetT = 0.55 } = {}) {
  const s = step ?? len / corbels;
  const x0 = -((corbels - 1) * s) / 2;
  steppedCorbelRow(b, 'dressed', [x0, zFace], [1, 0], corbels, s, [0, 1], yCorbelTop, { tiers: 3, width: 0.34, tierH: 0.28, proj });

  // Stone lintel slabs bridging each pair of corbels, leaving clear open drop slots along the inner gap
  const slabD = 0.44;
  const zOuterSlab = zFace + proj - slabD / 2;
  b.add('dressed', bevelBlock(len, 0.28, slabD, 0.012), [0, yCorbelTop, zOuterSlab]);
  // Transverse bridge stones directly over each corbel back to the main wall face, creating crisp drop holes between them
  for (let i = 0; i < corbels; i++) {
    const cx = x0 + i * s;
    const bridgeD = proj - slabD + 0.06;
    b.add('dressed', bevelBlock(0.36, 0.274, bridgeD, 0.01), [cx, yCorbelTop + 0.003, zFace + bridgeD / 2 - 0.04]);
  }

  // Overhanging parapet and merlons sitting on the machicolation outer edge
  const yParapet = yCorbelTop + 0.28;
  const zParapet = zFace + proj - parapetT / 2;
  b.add('stone', G.block(len, parapetH, parapetT), [0, yParapet, zParapet]);
  const cellW = len / merlons;
  for (let i = 0; i < merlons; i++) {
    const mx = -len / 2 + cellW * (i + 0.5);
    detailedMerlon(b, Math.min(1.25, cellW * 0.62), parapetT, [mx, yParapet + parapetH, zParapet], 0, { slit: true });
  }
}

/**
 * Timber hoarding gallery (hourds) mounted on cantilevered oak beams over a wall top.
 * Base rests on putlog beams at y = yBase; outer face overhangs +Z by `proj`.
 */
export function timberHoardingGallery(b, len, yBase, zWallOuter, { proj = 1.15, bays = 4, roofMat = 'roofPlanks' } = {}) {
  const step = len / bays;
  const beamY = yBase - 0.25;
  const floorY = beamY + 0.22;
  const zFront = zWallOuter + proj - 0.08;
  const wallH = 1.85;

  // Symmetric post/beam positions along X (inset slightly at the two module ends so adjacent modules do not overlap)
  const postXs = [];
  for (let i = 0; i <= bays; i++) {
    let x = -len / 2 + i * step;
    if (i === 0) x += 0.14;
    else if (i === bays) x -= 0.14;
    postXs.push(x);
  }

  // Cantilevered heavy floor beams, diagonal timber struts and stone corbel shoes aligned under each post
  for (const xPos of postXs) {
    b.add('darkWood', bevelBlock(0.18, 0.22, proj + 1.3, 0.01), [xPos, beamY, zWallOuter + proj / 2 - 0.65]);
    b.add('darkWood', G.rod([xPos, beamY - 1.15, zWallOuter - 0.05], [xPos, beamY + 0.04, zWallOuter + proj - 0.14], 0.08, 6));
    b.add('dressed', bevelBlock(0.26, 0.28, 0.24, 0.01), [xPos, beamY - 1.38, zWallOuter + 0.05]);
    b.add('darkWood', bevelBlock(0.14, wallH + 0.22, 0.14, 0.008), [xPos, floorY + 0.06, zFront]);
  }

  // Planked hoarding floor with an open drop gap along the inner edge beside the wall face
  const floorD = proj - 0.26;
  for (let i = 0; i < 5; i++) {
    const d = floorD / 5;
    b.add('oak', bevelBlock(len, 0.07, d - 0.005, 0.007), [0, floorY, zWallOuter + 0.26 + (i + 0.5) * d]);
  }

  // Outer timber gallery wall (with arrow-shooting shutter ports) between posts
  for (let i = 0; i < bays; i++) {
    const xL = postXs[i] + 0.07;
    const xR = postXs[i + 1] - 0.07;
    const baySpan = xR - xL;
    const cx = (xL + xR) / 2;
    b.add('timber', bevelBlock(baySpan, 0.95, 0.08, 0.006), [cx, floorY + 0.06, zFront]);
    b.add('timber', bevelBlock(baySpan, 0.42, 0.08, 0.006), [cx, floorY + 1.45, zFront]);
    const portW = Math.min(0.36, baySpan * 0.45);
    const wingW = (baySpan - portW) / 2;
    if (wingW > 0.03) {
      b.add('timber', bevelBlock(wingW, 0.44, 0.08, 0.006), [cx - (portW + wingW) / 2, floorY + 1.01, zFront]);
      b.add('timber', bevelBlock(wingW, 0.44, 0.08, 0.006), [cx + (portW + wingW) / 2, floorY + 1.01, zFront]);
    }
    // Propped-open wooden shutter flap with iron strap
    b.push([cx, floorY + 1.44, zFront + 0.04], 0, -0.52);
    b.add('gateWood', bevelBlock(portW + 0.05, 0.44, 0.045, 0.005), [0, -0.44, 0]);
    b.add('iron', bevelBlock(portW + 0.06, 0.045, 0.06, 0.004), [0, -0.1, 0]);
    b.pop();
  }

  // Top plate beam + pent roof sloping down toward +Z (deflects fire arrows and rain)
  const eaveY = floorY + wallH + 0.05;
  b.add('darkWood', bevelBlock(len, 0.16, 0.16, 0.008), [0, eaveY - 0.12, zFront]);
  b.add('darkWood', bevelBlock(len, 0.16, 0.16, 0.008), [0, eaveY + 0.85, zWallOuter - 0.65]);
  for (const xPos of postXs) {
    b.add('darkWood', G.rod([xPos, eaveY + 0.92, zWallOuter - 0.7], [xPos, eaveY - 0.02, zFront + 0.25], 0.065, 6));
  }
  const run = zFront + 0.35 - (zWallOuter - 0.75);
  const rise = 0.98;
  b.add(roofMat, G.roofSlab(len, run, rise, 0.1), [0, eaveY + 0.045, zFront + 0.35]);
}

/**
 * Corner quoins helper re-exported cleanly for towers/keeps with custom dimensions.
 */
export function quoinSet(b, cx, cz, ox, oz, y0, y1, opts = {}) {
  const { long = 0.95, short = 0.45, course = 0.52, proud = 0.06 } = opts;
  const n = Math.floor((y1 - y0) / course);
  for (let i = 0; i < n; i++) {
    const wx = i % 2 ? short : long;
    const wz = i % 2 ? long : short;
    b.add(
      'dressed',
      bevelBlock(wx, course - 0.04, wz, 0.01),
      [cx + ox * (proud - wx / 2), y0 + i * course + 0.02, cz + oz * (proud - wz / 2)],
    );
  }
}

export { merlon };
