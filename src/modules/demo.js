// Assembly demo: places kit modules in a short run of castle wall to check that they join up.
// The front (+Z) line has the gatehouse in the middle, arched and plain walls either side, a round
// roofed tower on the right and a square tower on the left. On the right an outer corner turns the
// wall back along -Z.
// Only the viewer uses it (?demo=1); it is not exported as a module.

import * as THREE from 'three';
import { byId } from './index.js';

export function buildDemo(M) {
  const g = new THREE.Group();
  g.name = 'demo_run';
  const put = (id, x, z, rotY = 0) => {
    const m = byId(id).build(M);
    m.position.set(x, 0, z);
    m.rotation.y = rotY;
    g.add(m);
  };
  const Q = Math.PI / 2;
  put('gatehouse', 0, 0); // spans x -4..4
  // right of the gate: wall modules are 4 m long, each centred 2 m past the previous end
  put('wall_straight_crenellated', 6, 0);
  put('wall_arch_round', 10, 0);
  put('tower_round_roofed', 15.2, 0); // shaft centre 3.2 m past the last wall end at x = 12
  put('wall_straight_loophole', 20.4, 0); // 5.2 m from the tower centre
  put('wall_corner', 24.4, 0); // its x arm ends at x = 22.4
  put('wall_straight_crenellated', 24.4, -4, Q); // runs back along -Z from the corner z arm
  put('wall_straight_loophole', 24.4, -8, Q);
  // left of the gate
  put('wall_straight_loophole', -6, 0);
  put('wall_arch_pointed', -10, 0);
  put('tower_square', -15, 0); // east face at x = -12
  put('wall_straight_crenellated', -20, 0); // 5 m from the tower centre
  return g;
}
