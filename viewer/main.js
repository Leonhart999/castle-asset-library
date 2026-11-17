// Module viewer: lays every module of the kit out in a gallery, lets you focus on one,
// and exposes a small API (window.__list / __show / __exportGLB) for the headless build.
// URL parameters: ?module=<id> focuses one module, ?shot=1 hides the HUD, ?dpr=<n> caps pixel ratio.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { loadMaterialIndex, setMaxAnisotropy, texturesReady } from '../src/lib/materials.js';
import { makeMaterials } from '../src/lib/kit.js';
import { MODULES } from '../src/modules/index.js';

const params = new URLSearchParams(location.search);
const shot = params.has('shot');

function measure(group) {
  const box = new THREE.Box3().setFromObject(group);
  let tris = 0;
  const mats = new Set();
  group.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
    mats.add(o.material.name);
  });
  return { box, size: box.getSize(new THREE.Vector3()), tris, mats: [...mats] };
}

async function main() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: shot });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, Number(params.get('dpr')) || 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xaeb9c4);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.8;

  const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 3000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const sun = new THREE.DirectionalLight(0xfff2e0, 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x8a877e, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  await loadMaterialIndex();
  setMaxAnisotropy(renderer);
  const M = makeMaterials();

  // Build every module once at the origin, measure it, then lay the gallery out in rows.
  const entries = MODULES.map((def) => {
    const group = def.build(M);
    group.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    scene.add(group);
    return { def, group, ...measure(group) };
  });
  const GAP = 3;
  const MAX_ROW = 60;
  let cx = 0;
  let cz = 0;
  let rowDepth = 0;
  const galleryBox = new THREE.Box3();
  for (const e of entries) {
    if (cx > 0 && cx + e.size.x > MAX_ROW) {
      cx = 0;
      cz += rowDepth + GAP;
      rowDepth = 0;
    }
    e.home = new THREE.Vector3(cx - e.box.min.x, 0, cz - e.box.min.z);
    galleryBox.union(e.box.clone().translate(e.home));
    cx += e.size.x + GAP;
    rowDepth = Math.max(rowDepth, e.size.z);
  }

  function frame(box, dir) {
    const c = box.getCenter(new THREE.Vector3());
    const r = box.getSize(new THREE.Vector3()).length() / 2;
    const dist = (r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 0.9;
    camera.position.copy(c).addScaledVector(dir.clone().normalize(), dist);
    controls.target.copy(c);
    controls.update();
    sun.position.copy(c).add(new THREE.Vector3(0.6, 1.0, 0.8).normalize().multiplyScalar(dist));
    sun.target.position.copy(c);
    const e = r * 1.2;
    Object.assign(sun.shadow.camera, { left: -e, right: e, top: e, bottom: -e, near: 0.5, far: dist * 3 });
    sun.shadow.camera.updateProjectionMatrix();
  }

  const hud = document.createElement('div');
  hud.className = 'hud';
  if (shot) hud.style.display = 'none';
  const title = document.createElement('h1');
  title.textContent = 'Castle kit - ' + entries.length + ' modules';
  hud.appendChild(title);
  const buttons = new Map();
  const addButton = (label, id) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.onclick = () => show(id);
    hud.appendChild(btn);
    buttons.set(id, btn);
  };
  addButton('All modules', null);
  let lastCat = '';
  for (const e of entries) {
    if (e.def.category !== lastCat) {
      lastCat = e.def.category;
      const cat = document.createElement('div');
      cat.className = 'cat';
      cat.textContent = lastCat;
      hud.appendChild(cat);
    }
    addButton(e.def.name, e.def.id);
  }
  const info = document.createElement('div');
  info.className = 'info';
  hud.appendChild(info);
  document.body.appendChild(hud);

  function show(id) {
    const only = id ? entries.find((e) => e.def.id === id) : null;
    if (id && !only) throw new Error('Unknown module ' + id);
    for (const e of entries) {
      e.group.visible = !only || e === only;
      if (only) e.group.position.set(0, 0, 0);
      else e.group.position.copy(e.home);
    }
    frame(only ? only.box : galleryBox, only ? new THREE.Vector3(1, 0.55, 1.4) : new THREE.Vector3(0.3, 1, 1.1));
    for (const [key, btn] of buttons) btn.classList.toggle('on', key === id);
    info.textContent = only
      ? only.def.description + '  ' + only.size.toArray().map((v) => v.toFixed(2)).join(' x ') + ' m, ' + only.tris + ' tris'
      : '';
  }

  window.__list = () =>
    entries.map((e) => ({
      id: e.def.id,
      name: e.def.name,
      category: e.def.category,
      description: e.def.description,
      size_m: e.size.toArray().map((v) => Math.round(v * 100) / 100),
      triangles: e.tris,
      materials: e.mats,
    }));
  window.__show = show;
  window.__exportGLB = async (id) => {
    const def = MODULES.find((m) => m.id === id);
    if (!def) throw new Error('Unknown module ' + id);
    const group = def.build(M);
    group.userData = { module: def.id, category: def.category, unit: 'metre' };
    const buf = await new GLTFExporter().parseAsync(group, { binary: true, maxTextureSize: 1024 });
    const res = await fetch('/__save?path=glb/' + id + '.glb', { method: 'POST', body: buf });
    if (!res.ok) throw new Error('save failed: ' + res.status);
    return buf.byteLength;
  };

  await texturesReady();
  show(params.get('module'));
  let frames = 0;
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
    if (++frames === 6) window.__ready = true;
  });
}

main().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', '<pre style=position:fixed;top:0;color:#a00>' + e.stack + '</pre>');
});
