// Small helpers shared by the room-specific prop modules (kitchen, chapel, ...).
// Same conventions as kit.js: 1 unit = 1 m, UVs in metres.

import * as THREE from 'three';
import * as G from './geo.js';

/** Deterministic pseudo-random numbers, so every build produces identical geometry. */
export function makeRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Round tube through points [x, y, z?] (z defaults to 0), used for handles and hooks. */
export function tube(pts, r, segs = 24) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z = 0]) => new THREE.Vector3(x, y, z)));
  return G.boxUV(new THREE.TubeGeometry(curve, segs, r, 8, false));
}

/** Horizontal torus ring around the Y axis, centred on the origin. */
export function hoop(r, tubeR, segs = 32) {
  const g = new THREE.TorusGeometry(r, tubeR, 5, segs);
  g.rotateX(Math.PI / 2);
  return G.boxUV(g);
}
