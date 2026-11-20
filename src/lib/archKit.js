// Shared materials and procedural geometry helpers for architectural element modules.
// Kept self-contained so it extends kit.js without touching shared material definitions.

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import * as G from './geo.js';
import { pbr } from './materials.js';
import { lathe, bevelBlock } from './kit.js';

const extraCache = new WeakMap();

/** Returns a material map extending the base kit with masonry, roof, door and glass materials. */
export function withArchMaterials(M) {
  let extra = extraCache.get(M);
  if (!extra) {
    extra = {
      brick: pbr('medieval_red_brick', { color: 0xd2c4b8, normalScale: 1.15 }),
      slateFloor: pbr('monastery_stone_floor', { color: 0xd4d2cc, normalScale: 1.1 }),
      clayTile: pbr('clay_roof_tiles_02', { side: THREE.DoubleSide, normalScale: 1.25 }),
      thatch: pbr('thatch_roof_angled', { tile: 0.95, color: 0xd0bc8e, side: THREE.DoubleSide, normalScale: 1.35 }),
      doorWood: pbr('wooden_gate', { tile: 1.5, color: 0xbfa88d, normalScale: 1.25 }),
      lead: pbr('wrought_iron', { name: 'lead_came', tile: 0.35, color: 0x454b52, metalness: 0.85, roughness: 0.65, normalScale: 0.45 }),
      soot: pbr('dark_rock', { name: 'soot_stone', tile: 1.0, color: 0x383430, roughness: 0.96, normalScale: 1.1 }),
      glassClear: new THREE.MeshStandardMaterial({
        name: 'leaded_glass',
        color: 0xb8cfd6,
        emissive: 0x16262a,
        emissiveIntensity: 0.14,
        roughness: 0.12,
        metalness: 0.08,
        transparent: true,
        opacity: 0.48,
        side: THREE.DoubleSide,
      }),
      glassRuby: new THREE.MeshStandardMaterial({
        name: 'stained_glass_ruby',
        color: 0x861422,
        emissive: 0x520a14,
        emissiveIntensity: 0.34,
        roughness: 0.14,
        metalness: 0.06,
        transparent: true,
        opacity: 0.84,
        side: THREE.DoubleSide,
      }),
      glassCobalt: new THREE.MeshStandardMaterial({
        name: 'stained_glass_cobalt',
        color: 0x173a82,
        emissive: 0x0d2254,
        emissiveIntensity: 0.34,
        roughness: 0.14,
        metalness: 0.06,
        transparent: true,
        opacity: 0.84,
        side: THREE.DoubleSide,
      }),
      glassAmber: new THREE.MeshStandardMaterial({
        name: 'stained_glass_amber',
        color: 0xb87616,
        emissive: 0x6e4206,
        emissiveIntensity: 0.34,
        roughness: 0.14,
        metalness: 0.06,
        transparent: true,
        opacity: 0.84,
        side: THREE.DoubleSide,
      }),
      glassEmerald: new THREE.MeshStandardMaterial({
        name: 'stained_glass_emerald',
        color: 0x185c35,
        emissive: 0x0b381b,
        emissiveIntensity: 0.34,
        roughness: 0.14,
        metalness: 0.06,
        transparent: true,
        opacity: 0.84,
        side: THREE.DoubleSide,
      }),
    };
    extraCache.set(M, extra);
  }
  return { ...M, ...extra };
}

export function newArchBuilder(M) {
  return new G.Builder(withArchMaterials(M));
}

/**
 * Points along a symmetrical two-centred arch (pointed when rise > span/2, round when rise === span/2)
 * in the XY plane, starting at (-span/2, springY) and ending at (+span/2, springY).
 */
export function archCurvePts(span, springY, rise, stepsPerSide = 14) {
  const hw = span / 2;
  const rVal = Math.max(hw, rise);
  const cx = (hw * hw - rVal * rVal) / (2 * hw);
  const rad = hw - cx;
  const apexAng = Math.atan2(rVal, -cx);
  const pts = [];
  for (let i = 0; i <= stepsPerSide; i++) {
    const t = i / stepsPerSide;
    const a = Math.PI - t * apexAng;
    pts.push([-cx + rad * Math.cos(a), springY + rad * Math.sin(a), 0]);
  }
  for (let i = 1; i <= stepsPerSide; i++) {
    const t = i / stepsPerSide;
    const a = apexAng * (1 - t);
    pts.push([cx + rad * Math.cos(a), springY + rad * Math.sin(a), 0]);
  }
  return pts;
}

/** Computes unit outward normals [nx, ny, 0] in XY for an arch curve ordered left (-X) to right (+X). */
export function archNormals(pts) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[Math.min(pts.length - 1, i + 1)];
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const len = Math.hypot(dx, dy) || 1;
    // Left-to-right tangent rotated -90 deg gives upward/outward normal
    out.push([-dy / len, dx / len, 0]);
  }
  return out;
}

/**
 * Lofts a sequence of closed 3D loops (identical vertex count M, wound CCW looking along +tangent).
 * Filters zero-area triangles so tight tip/pole rings stay clean. When `smooth` is true, merges shared
 * ring vertices before computing vertex normals.
 */
export function loftRings(rings, { closeStart = true, closeEnd = true, smooth = false } = {}) {
  const m = rings[0].length;
  const n = rings.length;
  const v = [];
  const aVec = new THREE.Vector3();
  const bVec = new THREE.Vector3();
  const cVec = new THREE.Vector3();
  const tri = (a, b2, c) => {
    aVec.set(a[0], a[1], a[2]);
    bVec.set(b2[0], b2[1], b2[2]);
    cVec.set(c[0], c[1], c[2]);
    if (bVec.sub(aVec).cross(cVec.sub(aVec)).lengthSq() < 1e-12) return;
    v.push(...a, ...b2, ...c);
  };
  for (let i = 0; i < n - 1; i++) {
    const r0 = rings[i];
    const r1 = rings[i + 1];
    for (let k = 0; k < m; k++) {
      const kn = (k + 1) % m;
      tri(r0[k], r0[kn], r1[kn]);
      tri(r0[k], r1[kn], r1[k]);
    }
  }
  const cap = (ring, reverse) => {
    const c = [0, 0, 0];
    for (const p of ring) {
      c[0] += p[0];
      c[1] += p[1];
      c[2] += p[2];
    }
    c[0] /= m;
    c[1] /= m;
    c[2] /= m;
    for (let k = 0; k < m; k++) {
      const kn = (k + 1) % m;
      if (reverse) tri(c, ring[kn], ring[k]);
      else tri(c, ring[k], ring[kn]);
    }
  };
  if (closeStart) cap(rings[0], true);
  if (closeEnd) cap(rings[n - 1], false);
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  if (smooth) {
    g = mergeVertices(g, 1e-5);
    g.computeVertexNormals();
    return G.boxUV(g);
  }
  g.computeVertexNormals();
  return G.boxUV(g);
}

/**
 * Sweeps a closed CCW 2D cross-section [[u, v], ...] along 3D polyline `pts`.
 * `up` sets the local `v` axis (default +Z, so for XY arches +u points outward and +v along +Z).
 */
export function sweepProfile(profile, pts, { up = [0, 0, 1], closeCaps = true, smooth = false } = {}) {
  const upVec = new THREE.Vector3(...up).normalize();
  const vecs = pts.map((p) => new THREE.Vector3(p[0], p[1], p[2] ?? 0));
  const rings = [];
  for (let i = 0; i < vecs.length; i++) {
    const prev = vecs[Math.max(0, i - 1)];
    const next = vecs[Math.min(vecs.length - 1, i + 1)];
    const T = next.clone().sub(prev).normalize();
    let B = upVec.clone().sub(T.clone().multiplyScalar(upVec.dot(T)));
    if (B.lengthSq() < 1e-6) B.set(0, 1, 0);
    B.normalize();
    const N = new THREE.Vector3().crossVectors(B, T).normalize();
    rings.push(
      profile.map(([u, v]) => {
        const p = vecs[i].clone().addScaledVector(N, u).addScaledVector(B, v);
        return [p.x, p.y, p.z];
      }),
    );
  }
  return loftRings(rings, { closeStart: closeCaps, closeEnd: closeCaps, smooth });
}

/**
 * Chamfered radial stone voussoir wedge between points a and b on an arch intrados curve (XY plane),
 * extending from `innerOff` to `outerOff` along outward normals na/nb across `depth` in Z.
 */
export function voussoirBlock(a, b, na, nb, innerOff, outerOff, depth, bevel = 0.012, gapFrac = 0.016) {
  const pt = (p, n, off, z) => [p[0] + n[0] * off, p[1] + n[1] * off, z];
  const hz = depth / 2;
  const ib = innerOff + bevel;
  const ob = outerOff - bevel;
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const shrink = (p) => [p[0] + (mid[0] - p[0]) * gapFrac, p[1] + (mid[1] - p[1]) * gapFrac];
  const aS = shrink(a);
  const bS = shrink(b);

  return loftRings(
    [
      [pt(aS, na, ib, -hz), pt(bS, nb, ib, -hz), pt(bS, nb, ob, -hz), pt(aS, na, ob, -hz)],
      [pt(aS, na, innerOff, -hz + bevel), pt(bS, nb, innerOff, -hz + bevel), pt(bS, nb, outerOff, -hz + bevel), pt(aS, na, outerOff, -hz + bevel)],
      [pt(aS, na, innerOff, hz - bevel), pt(bS, nb, innerOff, hz - bevel), pt(bS, nb, outerOff, hz - bevel), pt(aS, na, outerOff, hz - bevel)],
      [pt(aS, na, ib, hz), pt(bS, nb, ib, hz), pt(bS, nb, ob, hz), pt(aS, na, ob, hz)],
    ],
    { closeStart: true, closeEnd: true },
  );
}

/** Moulded attic column base (square plinth + double torus moulding) with bottom at y = 0. */
export function columnBase(b, mat, pos, rShaft = 0.09, h = 0.22, rotY = 0) {
  b.push(pos, rotY);
  const w = rShaft * 2.9;
  b.add(mat, bevelBlock(w, h * 0.45, w, 0.01));
  b.add(
    mat,
    lathe(
      [
        [0, h * 0.44],
        [rShaft * 1.42, h * 0.44],
        [rShaft * 1.44, h * 0.58],
        [rShaft * 1.18, h * 0.72],
        [rShaft * 1.28, h * 0.86],
        [rShaft * 1.02, h],
        [0, h],
      ],
      16,
    ),
  );
  b.pop();
}

/** Moulded medieval bell capital + square abacus slab, bottom at y = 0, top at y = h. */
export function columnCapital(b, mat, pos, rShaft = 0.09, h = 0.28, rotY = 0) {
  b.push(pos, rotY);
  b.add(
    mat,
    lathe(
      [
        [0, 0],
        [rShaft * 1.18, 0],
        [rShaft * 1.24, h * 0.14],
        [rShaft * 1.04, h * 0.24],
        [rShaft * 1.16, h * 0.48],
        [rShaft * 1.48, h * 0.74],
        [0, h * 0.75],
      ],
      16,
    ),
  );
  const aw = rShaft * 3.1;
  b.add(mat, bevelBlock(aw, h * 0.26, aw, 0.01), [0, h * 0.74, 0]);
  b.pop();
}
