// Geometry toolkit for procedural architecture.
// All UVs are in metres so a material's `tile` setting gives a consistent
// texel density on every piece, regardless of its size.

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const _v = new THREE.Vector3();

/** Strips a geometry down to position/normal/uv, non-indexed. */
export function normalize(geom) {
  let g = geom.index ? geom.toNonIndexed() : geom;
  for (const name of Object.keys(g.attributes)) {
    if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) {
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((g.attributes.position.count * 2)), 2));
  }
  g.clearGroups();
  return g;
}

/**
 * Box projection per triangle, in local metres. `rot` rotates the texture
 * 90 degrees on side faces (useful for planks/ashlar orientation).
 */
export function boxUV(geom, { offset = [0, 0, 0], rot = false } = {}) {
  const g = normalize(geom);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    n.subVectors(c, b).cross(_v.subVectors(a, b));
    const ax = Math.abs(n.x);
    const ay = Math.abs(n.y);
    const az = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const p = k === 0 ? a : k === 1 ? b : c;
      const x = p.x + offset[0];
      const y = p.y + offset[1];
      const z = p.z + offset[2];
      let u;
      let v;
      if (ay >= ax && ay >= az) {
        u = x;
        v = z;
      } else if (ax >= az) {
        u = n.x > 0 ? -z : z;
        v = y;
      } else {
        u = n.z > 0 ? x : -x;
        v = y;
      }
      if (rot && !(ay >= ax && ay >= az)) [u, v] = [v, u];
      uv.setXY(i + k, u, v);
    }
  }
  uv.needsUpdate = true;
  return g;
}

/**
 * Cylindrical projection around the local Y axis: u = arc length at `radius`,
 * v = height. Horizontal faces fall back to planar XZ.
 */
export function cylUV(geom, radius = null) {
  const g = normalize(geom);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i += 3) {
    let us = [];
    let flat = true;
    for (let k = 0; k < 3; k++) {
      if (Math.abs(nor.getY(i + k)) < 0.7) flat = false;
    }
    for (let k = 0; k < 3; k++) {
      const x = pos.getX(i + k);
      const y = pos.getY(i + k);
      const z = pos.getZ(i + k);
      if (flat) {
        uv.setXY(i + k, x, z);
        continue;
      }
      const r = radius ?? Math.hypot(x, z);
      const ang = Math.atan2(z, x);
      us.push([ang, r, y]);
    }
    if (flat) continue;
    // Fix the wrap-around seam inside a triangle.
    const maxA = Math.max(...us.map((q) => q[0]));
    for (let k = 0; k < 3; k++) {
      let [ang, r, y] = us[k];
      if (maxA - ang > Math.PI) ang += Math.PI * 2;
      uv.setXY(i + k, ang * r, y);
    }
  }
  uv.needsUpdate = true;
  return g;
}

/**
 * Collects geometry per material key and merges them into a few meshes.
 * Pieces are given in local coordinates plus an optional matrix.
 */
export class Builder {
  constructor(materials) {
    this.materials = materials;
    this.parts = new Map();
    this.stack = [new THREE.Matrix4()];
  }

  get matrix() {
    return this.stack[this.stack.length - 1];
  }

  /** Pushes a transform (position, rotationY, scale) for subsequent adds. */
  push(pos = [0, 0, 0], rotY = 0, rotX = 0, rotZ = 0) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...pos),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotY, rotZ, 'YXZ')),
      new THREE.Vector3(1, 1, 1),
    );
    this.stack.push(this.matrix.clone().multiply(m));
    return this;
  }

  pop() {
    this.stack.pop();
    return this;
  }

  add(matKey, geom, pos = null, rotY = 0, rotX = 0, rotZ = 0) {
    if (!this.materials[matKey]) throw new Error(`Unknown material ${matKey}`);
    const g = normalize(geom);
    const m = this.matrix.clone();
    if (pos || rotY || rotX || rotZ) {
      m.multiply(
        new THREE.Matrix4().compose(
          new THREE.Vector3(...(pos || [0, 0, 0])),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotY, rotZ, 'YXZ')),
          new THREE.Vector3(1, 1, 1),
        ),
      );
    }
    g.applyMatrix4(m);
    if (!this.parts.has(matKey)) this.parts.set(matKey, []);
    this.parts.get(matKey).push(g);
    return g;
  }

  build(name = 'building', { castShadow = true, receiveShadow = true } = {}) {
    const group = new THREE.Group();
    group.name = name;
    for (const [key, list] of this.parts) {
      // Merge in chunks to stay below 32-bit index issues and keep culling useful.
      const merged = mergeVertices(mergeGeometries(list, false), 1e-4);
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, this.materials[key]);
      mesh.name = `${name}_${key}`;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      group.add(mesh);
    }
    return group;
  }
}

// ---------------------------------------------------------------------------
// Primitive builders (all return geometries with metre UVs, local space)
// ---------------------------------------------------------------------------

export function box(w, h, d, opts) {
  return boxUV(new THREE.BoxGeometry(w, h, d), opts);
}

/** Box whose bottom sits at y=0. */
export function block(w, h, d, opts) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  return boxUV(g, opts);
}

/** Adds an arch-shaped (or rectangular) path to a THREE.Path / Shape. */
export function openingPath(path, { x, y, w, h, arch = 'round' }) {
  const hw = w / 2;
  path.moveTo(x - hw, y);
  path.lineTo(x + hw, y);
  if (arch === 'round') {
    const springY = y + h - hw;
    path.lineTo(x + hw, springY);
    path.absarc(x, springY, hw, 0, Math.PI, false);
    path.lineTo(x - hw, y);
  } else if (arch === 'pointed') {
    // Equilateral gothic arch: two arcs with radius = w, centres at the jambs.
    const springY = y + h - w * 0.866;
    path.lineTo(x + hw, springY);
    const segs = 10;
    for (let i = 1; i <= segs; i++) {
      const t = (i / segs) * (Math.PI / 3);
      path.lineTo(x - hw + w * Math.cos(t), springY + w * Math.sin(t));
    }
    for (let i = 1; i <= segs; i++) {
      const t = Math.PI - (Math.PI / 3) * (1 - i / segs);
      path.lineTo(x + hw + w * Math.cos(t), springY + w * Math.sin(t));
    }
    path.lineTo(x - hw, y);
  } else if (arch === 'segmental') {
    const rise = w * 0.18;
    const springY = y + h - rise;
    path.lineTo(x + hw, springY);
    const r = (hw * hw + rise * rise) / (2 * rise);
    const cy = springY + rise - r;
    const a0 = Math.atan2(springY - cy, hw);
    const segs = 10;
    for (let i = 1; i <= segs; i++) {
      const a = a0 + (Math.PI - 2 * a0) * (i / segs);
      path.lineTo(x + r * Math.cos(a), cy + r * Math.sin(a));
    }
    path.lineTo(x - hw, y);
  } else if (arch === 'bell') {
    // katomado: flared foot, waisted sides, ogee top with a point
    const pts = [];
    const n = 16;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const yy = y + t * h * 0.62;
      const waist = 1 - 0.14 * Math.sin(t * Math.PI) - 0.1 * (1 - t);
      pts.push([x + hw * waist * (t < 0.08 ? 1.12 : 1), yy]);
    }
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const a = t * Math.PI * 0.5;
      const px = hw * 0.86 * Math.cos(a) * (1 - 0.35 * t * t);
      const py = y + h * 0.62 + h * 0.38 * Math.sin(a) * (0.75 + 0.25 * t);
      pts.push([x + px, py]);
    }
    for (const [px, py] of pts) path.lineTo(px, py);
    for (let i = pts.length - 2; i >= 0; i--) path.lineTo(2 * x - pts[i][0], pts[i][1]);
    path.lineTo(x - hw, y);
  } else {
    path.lineTo(x + hw, y + h);
    path.lineTo(x - hw, y + h);
    path.lineTo(x - hw, y);
  }
  return path;
}

/**
 * A straight wall segment along +X from x=0..len, base at y=0, thickness
 * centred on z=0, with arbitrary openings that go all the way through.
 * openings: [{ x, y, w, h, arch }]
 */
export function wall(len, height, thick, openings = [], opts) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(len, 0);
  shape.lineTo(len, height);
  shape.lineTo(0, height);
  shape.lineTo(0, 0);
  for (const o of openings) {
    const hole = new THREE.Path();
    openingPath(hole, o);
    // ExtrudeGeometry fixes hole winding itself.
    shape.holes.push(hole);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, -thick / 2);
  return boxUV(g, opts);
}

/** Wall with a gable on top: rectangle + triangle (apex height above `height`). */
export function gableWall(len, height, apex, thick, openings = [], opts) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(len, 0);
  shape.lineTo(len, height);
  shape.lineTo(len / 2, height + apex);
  shape.lineTo(0, height);
  shape.lineTo(0, 0);
  for (const o of openings) {
    const hole = new THREE.Path();
    openingPath(hole, o);
    shape.holes.push(hole);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, -thick / 2);
  return boxUV(g, opts);
}

/** Stepped gable (Treppengiebel) silhouette as an extruded slab. */
export function steppedGable(len, height, apex, thick, steps = 5, opts) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(len, 0);
  shape.lineTo(len, height);
  const sw = len / 2 / (steps + 0.5);
  const sh = apex / steps;
  let x = len;
  let y = height;
  for (let i = 0; i < steps; i++) {
    y += sh;
    shape.lineTo(x, y);
    x -= sw;
    shape.lineTo(x, y);
  }
  shape.lineTo(len - x, y);
  x = len - x;
  for (let i = 0; i < steps; i++) {
    shape.lineTo(x, y);
    y -= sh;
    shape.lineTo(x, y);
    x -= sw;
  }
  shape.lineTo(0, height);
  shape.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
  g.translate(0, 0, -thick / 2);
  return boxUV(g, opts);
}

/**
 * Crenellated parapet along +X: continuous lower parapet then merlons.
 * Returns an array of geometries (parapet + merlons).
 */
export function battlement(len, { thick = 0.6, base = 1.0, merlonH = 1.0, merlonW = 1.4, gapW = 0.8, jitter = 0 } = {}) {
  const parts = [];
  parts.push(block(len, base, thick).translate(len / 2, 0, 0));
  const unit = merlonW + gapW;
  const n = Math.max(1, Math.floor((len + gapW) / unit));
  const used = n * unit - gapW;
  const start = (len - used) / 2;
  for (let i = 0; i < n; i++) {
    const h = merlonH + (jitter ? (Math.random() - 0.5) * jitter : 0);
    const g = block(merlonW, h, thick);
    g.translate(start + i * unit + merlonW / 2, base, 0);
    parts.push(g);
  }
  return parts;
}

/** Open (or closed) cylinder with metre UVs. */
export function cylinder(rTop, rBot, h, segs = 32, { open = false, y0 = 0 } = {}) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, segs, Math.max(1, Math.round(h / 2)), open);
  g.translate(0, y0 + h / 2, 0);
  return cylUV(g, Math.max(rTop, rBot));
}

/** Conical roof; slates follow the slant. Base at y=0. */
export function coneRoof(r, h, segs = 32, { flare = 0 } = {}) {
  // Lathe a slightly concave (bell-cast) profile for realism.
  const pts = [];
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const rr = r * (1 - t) + flare * r * Math.pow(1 - t, 6);
    pts.push(new THREE.Vector2(Math.max(rr, 0.001), h * t));
  }
  const g = new THREE.LatheGeometry(pts, segs);
  // u = angle * radius at base, v = slant distance
  const gg = normalize(g);
  const pos = gg.attributes.position;
  const uv = gg.attributes.uv;
  const slant = Math.hypot(r, h);
  for (let i = 0; i < pos.count; i += 3) {
    const angs = [];
    for (let k = 0; k < 3; k++) angs.push(Math.atan2(pos.getZ(i + k), pos.getX(i + k)));
    const maxA = Math.max(...angs);
    for (let k = 0; k < 3; k++) {
      let a = angs[k];
      if (maxA - a > Math.PI) a += Math.PI * 2;
      const y = pos.getY(i + k);
      const rr = Math.hypot(pos.getX(i + k), pos.getZ(i + k));
      uv.setXY(i + k, a * (rr * 0.5 + r * 0.5), (y / h) * slant);
    }
  }
  return gg;
}

/** Simple pyramid / hipped-to-a-point roof over w x d, base at y=0. */
export function pyramidRoof(w, d, h, overhang = 0.4) {
  const hw = w / 2 + overhang;
  const hd = d / 2 + overhang;
  const apex = [0, h, 0];
  const corners = [
    [-hw, 0, hd],
    [hw, 0, hd],
    [hw, 0, -hd],
    [-hw, 0, -hd],
  ];
  const verts = [];
  const uvs = [];
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    verts.push(...a, ...b, ...apex);
    const edge = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const mid = [(a[0] + b[0]) / 2, 0, (a[2] + b[2]) / 2];
    const slant = Math.hypot(Math.hypot(mid[0], mid[2]), h);
    uvs.push(0, 0, edge, 0, edge / 2, slant);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

/**
 * A sloped roof slab as a thick plane. Local frame: eave runs along X
 * (length `len`), the slab rises along -Z by `run` horizontally and `rise`
 * vertically. Thickness extends downward. UV: u along eave, v up the slope.
 */
export function roofSlab(len, run, rise, thick = 0.25) {
  const slope = Math.hypot(run, rise);
  const g = new THREE.BoxGeometry(len, thick, slope);
  // Put the slab's top surface on the slope line.
  g.translate(0, -thick / 2, -slope / 2);
  const gg = boxUV(g);
  // boxUV gives (x, z) on top: z negative going up-slope -> v = -z
  const uv = gg.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, -uv.getY(i));
  gg.rotateX(Math.atan2(rise, run));
  return gg;
}

/**
 * Gable roof over a rectangle centred at origin, ridge along X.
 * Returns { slabs: [geom], gableHeight } with base at y=0.
 */
export function gableRoof(len, span, pitchDeg = 50, { overhang = 0.5, eaveOverhang = 0.6, thick = 0.25 } = {}) {
  const half = span / 2 + eaveOverhang;
  const rise = Math.tan((pitchDeg * Math.PI) / 180) * half;
  const L = len + overhang * 2;
  const s1 = roofSlab(L, half, rise, thick);
  s1.translate(0, -Math.tan((pitchDeg * Math.PI) / 180) * eaveOverhang, half);
  const s2 = roofSlab(L, half, rise, thick);
  s2.rotateY(Math.PI);
  s2.translate(0, -Math.tan((pitchDeg * Math.PI) / 180) * eaveOverhang, -half);
  const ridgeY = rise - Math.tan((pitchDeg * Math.PI) / 180) * eaveOverhang;
  return { slabs: [s1, s2], ridgeY };
}

/** Hip roof (four slopes) over w (x) by d (z), base at y=0, pitch in degrees. */
export function hipRoof(w, d, pitchDeg = 50, overhang = 0.5) {
  const tan = Math.tan((pitchDeg * Math.PI) / 180);
  const hw = w / 2 + overhang;
  const hd = d / 2 + overhang;
  const inset = Math.min(hw, hd);
  const h = inset * tan;
  const rx = hw - inset; // ridge half length along x
  const rz = hd - inset;
  const y0 = -overhang * tan;
  const P = (x, y, z) => [x, y + y0, z];
  const faces = [
    // south (+z)
    [P(-hw, 0, hd), P(hw, 0, hd), P(rx, h, rz), P(-rx, h, rz)],
    // north (-z)
    [P(hw, 0, -hd), P(-hw, 0, -hd), P(-rx, h, -rz), P(rx, h, -rz)],
    // east (+x)
    [P(hw, 0, hd), P(hw, 0, -hd), P(rx, h, -rz), P(rx, h, rz)],
    // west (-x)
    [P(-hw, 0, -hd), P(-hw, 0, hd), P(-rx, h, rz), P(-rx, h, -rz)],
  ];
  const verts = [];
  const uvs = [];
  for (const q of faces) {
    const [a, b, c, d2] = q;
    const ex = [b[0] - a[0], 0, b[2] - a[2]];
    const elen = Math.hypot(ex[0], ex[2]);
    const ux = [ex[0] / elen, ex[2] / elen];
    const slant = Math.hypot(inset, h);
    const uvOf = (p) => {
      const du = (p[0] - a[0]) * ux[0] + (p[2] - a[2]) * ux[1];
      const dv = ((p[1] - a[1]) / h) * slant;
      return [du, dv];
    };
    const tri = (p, q2, r) => {
      verts.push(...p, ...q2, ...r);
      uvs.push(...uvOf(p), ...uvOf(q2), ...uvOf(r));
    };
    tri(a, b, c);
    tri(a, c, d2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return { geom: g, height: h + y0, y0 };
}

/** Polygon prism (e.g. octagonal stair tower) with metre UVs. */
export function prism(sides, r, h, opts = {}) {
  const g = new THREE.CylinderGeometry(r, r, h, sides, 1, false, opts.thetaStart ?? Math.PI / sides);
  g.translate(0, h / 2, 0);
  return boxUVRadial(g);
}

/** Per-face planar projection along each face's own horizontal tangent. */
export function boxUVRadial(geom) {
  const g = normalize(geom);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    n.subVectors(c, b).cross(_v.subVectors(a, b)).normalize();
    if (Math.abs(n.y) > 0.7) {
      for (let k = 0; k < 3; k++) {
        const p = k === 0 ? a : k === 1 ? b : c;
        uv.setXY(i + k, p.x, p.z);
      }
      continue;
    }
    const t = new THREE.Vector3(-n.z, 0, n.x).normalize();
    for (let k = 0; k < 3; k++) {
      const p = k === 0 ? a : k === 1 ? b : c;
      uv.setXY(i + k, p.dot(t), p.y);
    }
  }
  return g;
}

// ---------------------------------------------------------------------------
// CSG carving (three-bvh-csg) and openings
// ---------------------------------------------------------------------------

import { Brush, Evaluator, SUBTRACTION, ADDITION } from 'three-bvh-csg';

const evaluator = new Evaluator();
evaluator.attributes = ['position', 'normal', 'uv'];
evaluator.useGroups = false;

function brushOf(g) {
  const geom = normalize(g.clone());
  const b = new Brush(geom);
  b.updateMatrixWorld();
  return b;
}

/** Subtracts every cutter from geom. Cutters are unioned first for speed. */
export function carve(geom, cutters) {
  if (!cutters.length) return normalize(geom);
  let cut = brushOf(cutters[0]);
  for (let i = 1; i < cutters.length; i++) cut = evaluator.evaluate(cut, brushOf(cutters[i]), ADDITION);
  const res = evaluator.evaluate(brushOf(geom), cut, SUBTRACTION);
  return normalize(res.geometry);
}

/** Shape of an opening in the local XY plane (x centre, y sill). */
export function openingShape(o) {
  const s = new THREE.Shape();
  openingPath(s, o);
  return s;
}

/**
 * Cutter prism for an opening on a face whose outward normal is +Z at z=0.
 * The recess goes `depth` metres into the wall.
 */
export function openingCutter(o, depth) {
  const g = new THREE.ExtrudeGeometry(openingShape(o), { depth: depth + 1, bevelEnabled: false, curveSegments: 8 });
  g.translate(0, 0, -depth);
  return g;
}

/** Flat pane filling an opening at z = -depth (+ a hair). */
export function openingPane(o, depth) {
  const g = new THREE.ShapeGeometry(openingShape(o), 8);
  g.translate(0, 0, -depth + 0.02);
  return boxUV(g);
}

/** Matrix placing face-local space (outward +Z) onto a face of a W x D block. */
export function faceMatrix(face, W, D, y = 0) {
  const r = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[face];
  const off = { s: [0, y, D / 2], n: [0, y, -D / 2], e: [W / 2, y, 0], w: [-W / 2, y, 0] }[face];
  return new THREE.Matrix4().makeTranslation(...off).multiply(new THREE.Matrix4().makeRotationY(r));
}

/** Reverses triangle winding (in place, non-indexed). Optionally negates normals. */
export function reverseWinding(geom, negateNormals = false) {
  const g = normalize(geom);
  for (const name of ['position', 'normal', 'uv']) {
    const a = g.attributes[name];
    const s = a.itemSize;
    for (let i = 0; i < a.count; i += 3) {
      for (let k = 0; k < s; k++) {
        const t = a.array[(i + 1) * s + k];
        a.array[(i + 1) * s + k] = a.array[(i + 2) * s + k];
        a.array[(i + 2) * s + k] = t;
      }
    }
    a.needsUpdate = true;
  }
  if (negateNormals) {
    const n = g.attributes.normal;
    for (let i = 0; i < n.array.length; i++) n.array[i] = -n.array[i];
  }
  return g;
}

/** Turns a closed surface inside out (faces point inward). */
export function flipFaces(geom) {
  return reverseWinding(geom, true);
}

/** Applies a matrix and keeps faces pointing outward if it mirrors. */
export function xform(geom, m) {
  const g = normalize(geom);
  g.applyMatrix4(m);
  if (m.determinant() < 0) reverseWinding(g, false);
  return g;
}

/** Mirrors vertically (e.g. a cone turned into a corbel) with correct winding. */
export function mirrorY(geom) {
  return xform(geom, new THREE.Matrix4().makeScale(1, -1, 1));
}

/** Extrudes a 2D profile (x outward, y up) along local +X, outward = +Z * out. */
export function profileAlongX(shape, length, out = 1) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, out), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
  return boxUV(xform(g, m));
}

/** Cylinder segment along an arbitrary 3D line. */
export function rod(a, c, radius, segs = 6) {
  const A = new THREE.Vector3(...a);
  const C = new THREE.Vector3(...c);
  const d = C.clone().sub(A);
  const g = new THREE.CylinderGeometry(radius, radius, d.length(), segs);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  g.translate((A.x + C.x) / 2, (A.y + C.y) / 2, (A.z + C.z) / 2);
  return cylUV(g);
}

/** Beam (box) between two points in the XY plane, depth along Z. */
export function beamXY(x0, y0, x1, y1, w, d, z = 0) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const g = box(len, w, d, { rot: true });
  g.rotateZ(Math.atan2(y1 - y0, x1 - x0));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, z);
  return g;
}

export { mergeGeometries };
