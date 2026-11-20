import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { ensureDefenceMaterials } from '../lib/defenceKit.js';
import { byId } from './index.js';

const Q = Math.PI / 2;
const GRADE = 2.40;

export function buildDefenceDemo(M) {
  ensureDefenceMaterials(M);
  const scene = new THREE.Group();
  scene.name = 'defence_assembly';
  const prototypes = new Map();
  function put(id, x, y, z, a = 0) {
    if (!prototypes.has(id)) prototypes.set(id, byId(id).build(M));
    const model = prototypes.get(id).clone();
    model.position.set(x, y, z);
    model.rotation.y = a;
    scene.add(model);
  }
  const block = (mat, w, h, d, x, y, z) => {
    const mesh = new THREE.Mesh(G.block(w, h, d), M[mat]);
    mesh.position.set(x, y, z);
    scene.add(mesh);
  };

  // Castle-side fill and approaches are scenery, not part of any exported asset.
  block('earth', 48, GRADE - 0.045, 23.45, 0, 0, -8.595);
  block('turf', 48, 0.045, 23.45, 0, GRADE - 0.045, -8.595);
  block('cobble', 3.36, 0.02, 13.02, 0, GRADE, -3.01);
  block('mossyStone', 3.86, GRADE - 0.02, 0.55, 0, 0, 3.225);
  block('dressed', 3.92, 0.02, 0.55, 0, GRADE - 0.02, 3.225);
  block('earth', 57, 1.98, 3.26, 0, 0, 13.78);
  block('turf', 57, 0.06, 3.26, 0, 1.98, 13.78);
  const ramp = new THREE.Shape([[-0.08, 0], [0.91, 0], [0.91, 2.04], [-0.08, GRADE]].map(([z, y]) => new THREE.Vector2(z, y)));
  const rampMesh = new THREE.Mesh(G.profileAlongX(ramp, 3.75), M.cobble);
  rampMesh.position.set(-1.875, 0, 11.79);
  scene.add(rampMesh);

  put('gatehouse_barbican', 0, GRADE, 0);
  put('wall_machicolation', -7.8, GRADE, 0);
  put('wall_hoarding', 7.8, GRADE, 0);
  put('wall_bastion_square', -11.8, GRADE, 0);
  put('wall_bastion_round', 11.8, GRADE, 0);
  put('wall_postern', -15.8, GRADE, 0);
  put('wall_loophole_cross', 15.8, GRADE, 0);
  for (const side of [-1, 1]) {
    put('tower_corner_round', side * 21.18, GRADE, 0, side < 0 ? -Q : 0);
    for (const z of [-5.40, -9.40, -13.40]) put('wall_straight_crenellated', side * 21.18, GRADE, z, side * Q);
    put('moat_corner', side * 24.5, 0, 7.63, side < 0 ? -Q : 0);
    for (const z of [1.13, -2.87, -6.87, -10.87, -14.87, -18.87]) put('moat_straight', side * 24.5, 0, z, side * Q);
    for (const x of [4, 8, 12]) put('bailey_wall_stone', side * x, GRADE, -7.3);
  }
  // Open the front of the lower partition with its matching gate at the centre.
  put('bailey_gate_stone', 0, GRADE, -7.3);
  for (let x = -18; x <= 18; x += 4) put('moat_straight', x, 0, 7.63);
  put('moat_bridge_stone', 0, 0, 7.63);
  put('keep_norman', -2.35, GRADE, -14.7);
  return scene;
}
