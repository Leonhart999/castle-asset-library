// Checks the geometry independently of the renderer and validates the on-disk exports.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { MODULES } from '../src/modules/index.js';

const assets = MODULES.filter((def) => def.category === 'defence');
const ids = MODULES.map((def) => def.id);
assert.equal(new Set(ids).size, ids.length, 'Module IDs must be unique');
assert.ok(assets.length >= 24, 'The defence set is incomplete');
const material = new Proxy({ _defenceReady: true }, {
  get(slots, key) { return slots[key] ??= new THREE.MeshStandardMaterial({ name: key }); },
});
const groups = new Map(), bounds = new Map(), counts = new Map();
const originalWarn = console.warn;
console.warn = (message, ...args) => {
  if (!String(message).startsWith('BVH: "maxLeafSize"')) originalWarn(message, ...args);
};
try {
  for (const { id, build } of assets) {
    const group = build(material);
    group.updateMatrixWorld();
    const box = new THREE.Box3().setFromObject(group, true);
    assert.ok(Math.abs(box.min.y) < 1e-3, `${id}: does not sit on y = 0`);
    let count = 0;
    group.traverse((mesh) => {
      if (!mesh.isMesh) return;
      const { attributes, index } = mesh.geometry;
      for (const key of ['position', 'normal', 'uv']) {
        assert.ok(attributes[key].array.every(Number.isFinite), `${id}: invalid ${key}`);
      }
      const a = new THREE.Vector3(), b = a.clone(), c = a.clone();
      count += index.count / 3;
      for (let i = 0; i < index.count; i += 3) {
        a.fromBufferAttribute(attributes.position, index.getX(i));
        b.fromBufferAttribute(attributes.position, index.getX(i + 1));
        c.fromBufferAttribute(attributes.position, index.getX(i + 2));
        assert.ok(b.sub(a).cross(c.sub(a)).lengthSq() >= 1e-14, `${id}: zero-area triangle`);
      }
    });
    assert.ok(count > 0 && count <= 40000, `${id}: outside triangle budget`);
    if (id.startsWith('wall_') || id.startsWith('bailey_') || id === 'hoarding_straight' || id === 'battlement_shuttered') {
      assert.ok(Math.abs(box.min.x + 2) < 1e-3 && Math.abs(box.max.x - 2) < 1e-3, `${id}: breaches or misses the 4 m join`);
    }
    groups.set(id, group);
    bounds.set(id, box);
    counts.set(id, count);
  }
} finally { console.warn = originalWarn; }

function hits(id, origin, direction, distance) {
  const ray = new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction), 0, distance);
  return ray.intersectObject(groups.get(id), true);
}
assert.equal(hits('wall_loophole_cross', [0, 4.4, 2], [0, 0, -1], 4).length, 0, 'The crosslet must pass through the wall');
assert.ok(hits('wall_loophole_cross', [0.46, 4.4, 2], [0, 0, -1], 4).length > 0, 'Solid wall must remain around the crosslet');
assert.equal(hits('wall_machicolation', [0.4, 11, 1.18], [0, -1, 0], 6).length, 0, 'Stone gallery slot is filled');
assert.ok(hits('wall_machicolation', [0, 11, 1.18], [0, -1, 0], 6).length > 0, 'Missing transverse floor stone');
assert.equal(hits('gatehouse_barbican', [0, 1.25, 4], [0, 0, -1], 8).length, 0, 'Raised gatehouse grille blocks the passage');
assert.ok(hits('bailey_gate_stone', [0.27, 1, 2], [0, 0, -1], 4).length > 0, 'Closed bailey door is missing');
assert.equal(hits('moat_bridge_stone', [3.5, 1, 0], [-1, 0, 0], 7).length, 0, 'The causeway arch must be open');
assert.ok(hits('drawbridge_lowered', [0, 2, 1.5], [0, -1, 0], 2).length > 0, 'Lowered deck is missing');
assert.equal(hits('drawbridge_raised', [0, 2, 1.5], [0, -1, 0], 2).length, 0, 'Raised deck still occupies the ditch');
assert.ok(bounds.get('drawbridge_raised').equals(bounds.get('drawbridge_lowered')), 'Drawbridge poses must share the same footprint');

// Compare wet surface and shore positions at both stagger-free miter joins.
const wet = (id) => groups.get(id).children.find((mesh) => mesh.material.name === 'moatWater').geometry.attributes.position;
function profile(points, axis, end) {
  const values = new Set();
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i), y = points.getY(i), z = points.getZ(i);
    if (Math.abs((axis === 'x' ? x : z) - end) < 1e-3) values.add(`${(axis === 'x' ? z : x).toFixed(3)},${y.toFixed(3)}`);
  }
  return [...values].sort();
}
for (const axis of ['x', 'z']) assert.deepEqual(profile(wet('moat_corner'), axis, -4.5), profile(wet('moat_straight'), 'x', 2));
console.log(`${assets.length} defence modules passed geometry, clearance and modular join checks.`);

if (!process.argv.includes('--geometry-only')) {
  const root = new URL('../library/models/', import.meta.url);
  const index = new Map(JSON.parse(fs.readFileSync(new URL('index.json', root), 'utf8')).map((entry) => [entry.id, entry]));
  let bytes = 0;
  for (const { id } of assets) {
    const entry = index.get(id);
    assert.ok(entry && entry.triangles === counts.get(id), `${id}: missing or stale index entry`);
    const png = fs.readFileSync(new URL(entry.preview, root));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${id}: invalid PNG`);
    const glb = fs.readFileSync(new URL(entry.file, root));
    assert.equal(glb.toString('ascii', 0, 4), 'glTF', `${id}: invalid GLB`);
    assert.equal(glb.readUInt32LE(4), 2);
    assert.equal(glb.readUInt32LE(8), glb.length);
    assert.equal(glb.length, entry.glb_bytes);
    const json = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)));
    assert.ok(json.meshes?.length && json.materials?.length && json.images?.length, `${id}: incomplete export`);
    assert.ok(json.images.every((image) => Number.isInteger(image.bufferView) && !image.uri), `${id}: textures must be embedded`);
    bytes += glb.length;
  }
  console.log(`${assets.length} GLBs with embedded textures and ${assets.length} PNGs verified (${(bytes / 1e6).toFixed(1)} MB of GLBs).`);
}
