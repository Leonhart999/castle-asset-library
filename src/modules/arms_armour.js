// Stage 5 armour and helmets (modules: armour_stand_plate, armour_stand_mail, helmet_great, helmet_sallet).
// Historical dimensions used (metres, 1 unit = 1 m): standing man 1.80 m (sole to crown 1.76 m, armet comb 1.83 m); shoulder
// joints at y 1.44, x +-0.22; knee 0.50; hip joint 0.92; waist 1.10; chest 0.37 wide x 0.27 deep. Plate thickness 3 mm.
// Great helm (c. 1250): 0.317 m high, 0.235 m across, eye slit 13 mm, flat top. Sallet (c. 1470): 0.27 m long with tail,
// bevor 0.15 m high. Mail rings about 10 mm; hauberk hem at the knee. Armour pieces are thin shells lofted from
// superellipse sections (shell) with rolled-edge tubes, dome rivets and leather straps.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { lathe, bevelBox, bevelBlock, rivets } from '../lib/kit.js';
import { armsBuilder, tube, beam } from '../lib/armsKit.js';
import { pbr } from '../lib/materials.js';

const PI = Math.PI;
const TAU = PI * 2;
const sgnPow = (v, p) => Math.sign(v) * Math.pow(Math.abs(v), p);

/** Linear interpolation in a table of rows [key, v1, v2, ...]; keys may run up or down. Returns [v1, v2, ...]. */
function interp(tab, y) {
  const n = tab.length;
  for (let i = 0; i < n - 1; i++) {
    const y0 = tab[i][0];
    const y1 = tab[i + 1][0];
    if ((y - y0) * (y - y1) <= 0) {
      const t = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
      return tab[i].slice(1).map((v, k) => v + (tab[i + 1][k + 1] - v) * t);
    }
  }
  return (Math.abs(y - tab[0][0]) < Math.abs(y - tab[n - 1][0]) ? tab[0] : tab[n - 1]).slice(1);
}

// ---------------------------------------------------------------------------
// Local materials
// ---------------------------------------------------------------------------

/** Mail: procedural interlocked-ring colour and normal maps (canvas), tinted steel, high metalness. */
function mailMaterial() {
  if (typeof document === 'undefined') return new THREE.MeshStandardMaterial({ name: 'steel_mail_rings', color: 0x9aa0a8, metalness: 0.8, roughness: 0.55 });
  const S = 256;
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    return c;
  };
  const hc = mk();
  const dc = mk();
  const hx = hc.getContext('2d');
  const dx = dc.getContext('2d');
  hx.fillStyle = '#000000';
  hx.fillRect(0, 0, S, S);
  dx.fillStyle = '#0c0d0f';
  dx.fillRect(0, 0, S, S);
  const ring = (ctx, cx, cy, dark, light) => {
    for (const ox of [-S, 0, S]) {
      for (const oy of [-S, 0, S]) {
        ctx.beginPath();
        ctx.arc(cx + ox, cy + oy, 14, 0, TAU);
        ctx.strokeStyle = dark;
        ctx.lineWidth = 8;
        ctx.stroke();
        ctx.strokeStyle = light;
        ctx.lineWidth = 4.5;
        ctx.stroke();
      }
    }
  };
  for (let pass = 0; pass < 2; pass++) {
    for (let row = pass; row < 16; row += 2) {
      for (let col = 0; col < 8; col++) {
        const cx = col * 32 + (row % 2) * 16 + 8;
        const cy = row * 16 + 8;
        ring(hx, cx, cy, 'rgba(0,0,0,0.6)', row % 2 ? '#ffffff' : '#c8c8c8');
        ring(dx, cx, cy, 'rgba(0,0,0,0.75)', row % 2 ? '#d2d6dc' : '#aeb3ba');
      }
    }
  }
  const hd = hx.getImageData(0, 0, S, S).data;
  const nc = mk();
  const nx = nc.getContext('2d');
  const img = nx.createImageData(S, S);
  const H = (x, y) => hd[(((y + S) % S) * S + ((x + S) % S)) * 4];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const gx = ((H(x - 1, y) - H(x + 1, y)) / 255) * 3;
      const gy = ((H(x, y + 1) - H(x, y - 1)) / 255) * 3;
      const l = Math.hypot(gx, gy, 1);
      const o = (y * S + x) * 4;
      img.data[o] = ((gx / l) * 0.5 + 0.5) * 255;
      img.data[o + 1] = ((gy / l) * 0.5 + 0.5) * 255;
      img.data[o + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
  }
  nx.putImageData(img, 0, 0);
  const dif = new THREE.CanvasTexture(dc);
  dif.colorSpace = THREE.SRGBColorSpace;
  const nor = new THREE.CanvasTexture(nc);
  nor.colorSpace = THREE.NoColorSpace;
  for (const t of [dif, nor]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / 0.08, 1 / 0.08);
    t.anisotropy = 8;
    t.needsUpdate = true;
  }
  return new THREE.MeshStandardMaterial({ name: 'steel_mail_rings', map: dif, normalMap: nor, normalScale: new THREE.Vector2(1.3, 1.3), metalness: 0.8, roughness: 0.55 });
}

const LOCAL = {
  mail: mailMaterial,
  gambeson: () => pbr('wool_boucle', { name: 'gambeson_quilt', tile: 0.4, color: 0xcdbf9f, normalScale: 1.2 }),
};

// ---------------------------------------------------------------------------
// Thin plate geometry
// ---------------------------------------------------------------------------

/** Indexed triangle collector; each triangle is wound to face the given hint direction. */
function meshBuilder() {
  const pos = [];
  const idx = [];
  return {
    v(p) {
      pos.push(p[0], p[1], p[2]);
      return pos.length / 3 - 1;
    },
    tri(a, b, c, h) {
      const ax = pos[a * 3];
      const ay = pos[a * 3 + 1];
      const az = pos[a * 3 + 2];
      const ux = pos[b * 3] - ax;
      const uy = pos[b * 3 + 1] - ay;
      const uz = pos[b * 3 + 2] - az;
      const vx = pos[c * 3] - ax;
      const vy = pos[c * 3 + 1] - ay;
      const vz = pos[c * 3 + 2] - az;
      const d = (uy * vz - uz * vy) * h[0] + (uz * vx - ux * vz) * h[1] + (ux * vy - uy * vx) * h[2];
      if (d < 0) idx.push(a, c, b);
      else idx.push(a, b, c);
    },
    quad(a, b, c, d, h) {
      this.tri(a, b, c, h);
      this.tri(a, c, d, h);
    },
    geom() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return G.boxUV(g);
    },
  };
}

/**
 * Thin plate lofted along Y. Stations are [y, rx, rz, cx, cz, e]: a superellipse section (exponent e, default 2) of
 * half-widths rx, rz centred on (cx, cz). Angle 0 faces +Z and grows towards +X; a0..a1 selects an arc (default the
 * full ring). Plate thickness th; wave = [k, amplitude] ripples the radius (quilting, cloth folds).
 */
function shell(sts, o = {}) {
  const { a0 = -PI, a1 = PI, n = 16, th = 0.003, e = 2, wave = null } = o;
  const full = Math.abs(a1 - a0 - TAU) < 1e-6;
  const cols = full ? n : n + 1;
  const S = sts.length;
  const mid = sts.reduce((s, q) => s + q[0], 0) / S;
  const pt = (q, j, inner) => {
    const t = a0 + ((a1 - a0) * j) / n;
    const k = 2 / (q[5] || e);
    const f = wave ? 1 + wave[1] * Math.sin(wave[0] * t) : 1;
    const d = inner ? Math.min(th, q[1] * 0.4, q[2] * 0.4) : 0;
    return [(q[3] || 0) + (q[1] * f - d) * sgnPow(Math.sin(t), k), q[0], (q[4] || 0) + (q[2] * f - d) * sgnPow(Math.cos(t), k)];
  };
  const m = meshBuilder();
  const O = [];
  const I = [];
  const PO = [];
  const PN = [];
  for (let i = 0; i < S; i++) {
    O.push([]);
    I.push([]);
    PO.push([]);
    PN.push([]);
    for (let j = 0; j < cols; j++) {
      const po = pt(sts[i], j, false);
      const pn = pt(sts[i], j, true);
      PO[i].push(po);
      PN[i].push(pn);
      O[i].push(m.v(po));
      I[i].push(m.v(pn));
    }
  }
  for (let i = 0; i < S - 1; i++) {
    for (let j = 0; j < n; j++) {
      const j1 = full ? (j + 1) % n : j + 1;
      const p = PO[i][j];
      const h = [p[0] - (sts[i][3] || 0), p[1] - mid, p[2] - (sts[i][4] || 0)];
      m.quad(O[i][j], O[i][j1], O[i + 1][j1], O[i + 1][j], h);
      m.quad(I[i][j], I[i][j1], I[i + 1][j1], I[i + 1][j], [-h[0], -h[1], -h[2]]);
    }
  }
  const rim = (a, b, c, d, h) => m.quad(m.v(a), m.v(b), m.v(c), m.v(d), h);
  for (const [i, hy] of [[S - 1, 1], [0, -1]]) {
    for (let j = 0; j < n; j++) {
      const j1 = full ? (j + 1) % n : j + 1;
      rim(PO[i][j], PO[i][j1], PN[i][j1], PN[i][j], [0, hy, 0]);
    }
  }
  if (!full) {
    for (let i = 0; i < S - 1; i++) {
      const a = PO[i][0];
      const a2 = PO[i][1];
      rim(PO[i][0], PO[i + 1][0], PN[i + 1][0], PN[i][0], [a[0] - a2[0], a[1] - a2[1], a[2] - a2[2]]);
      const c = PO[i][n];
      const c2 = PO[i][n - 1];
      rim(PO[i][n], PO[i + 1][n], PN[i + 1][n], PN[i][n], [c[0] - c2[0], c[1] - c2[1], c[2] - c2[2]]);
    }
  }
  return m.geom();
}

/** Short band between two stations (y0 -> y1) with its own radii; o carries cx, cz and shell options. */
function band(y0, y1, rx0, rz0, rx1, rz1, o = {}) {
  return shell([[y0, rx0, rz0, o.cx || 0, o.cz || 0], [y1, rx1, rz1, o.cx || 0, o.cz || 0]], o);
}

/** Round rolled edge following a section (same parameters as shell stations). */
function rimTube(y, rx, rz, o = {}) {
  const { cx = 0, cz = 0, a0 = -PI, a1 = PI, n = 18, r = 0.0035, e = 2, lift = 0 } = o;
  const full = Math.abs(a1 - a0 - TAU) < 1e-6;
  const cnt = full ? n : n + 1;
  const k = 2 / e;
  const pts = [];
  for (let j = 0; j < cnt; j++) {
    const t = a0 + ((a1 - a0) * j) / n;
    pts.push([cx + (rx + lift) * sgnPow(Math.sin(t), k), y, cz + (rz + lift) * sgnPow(Math.cos(t), k)]);
  }
  return tube(pts, r, n * 2, 5, full);
}

/** Curved strip plate along a path in the YZ plane (x = 0), half widths per path point, arched across its width. */
function plateStrip(path, hws, { curl = 0.012, th = 0.003, m = 6 } = {}) {
  const mb = meshBuilder();
  const S = path.length;
  const L = new THREE.Vector3(1, 0, 0);
  const T = path.map((p, i) => {
    const a = path[Math.max(0, i - 1)];
    const c = path[Math.min(S - 1, i + 1)];
    return new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]).normalize();
  });
  const N = T.map((t) => {
    const n = new THREE.Vector3().crossVectors(L, t).normalize();
    return n.y < 0 ? n.negate() : n;
  });
  const top = [];
  const bot = [];
  const ti = [];
  const bi = [];
  for (let i = 0; i < S; i++) {
    top.push([]);
    bot.push([]);
    ti.push([]);
    bi.push([]);
    for (let k = 0; k <= m; k++) {
      const u = -1 + (2 * k) / m;
      const a = curl * (1 - u * u);
      const p = [path[i][0] + u * hws[i] + N[i].x * a, path[i][1] + N[i].y * a, path[i][2] + N[i].z * a];
      const q = [p[0] - N[i].x * th, p[1] - N[i].y * th, p[2] - N[i].z * th];
      top[i].push(p);
      bot[i].push(q);
      ti[i].push(mb.v(p));
      bi[i].push(mb.v(q));
    }
  }
  const nh = (i) => [N[i].x, N[i].y, N[i].z];
  const neg = (h) => [-h[0], -h[1], -h[2]];
  for (let i = 0; i < S - 1; i++) {
    for (let k = 0; k < m; k++) {
      mb.quad(ti[i][k], ti[i][k + 1], ti[i + 1][k + 1], ti[i + 1][k], nh(i));
      mb.quad(bi[i][k], bi[i][k + 1], bi[i + 1][k + 1], bi[i + 1][k], neg(nh(i)));
    }
    for (const [k, s] of [[0, -1], [m, 1]]) {
      mb.quad(mb.v(top[i][k]), mb.v(top[i + 1][k]), mb.v(bot[i + 1][k]), mb.v(bot[i][k]), [s, 0, 0]);
    }
  }
  for (const [i, s] of [[0, -1], [S - 1, 1]]) {
    for (let k = 0; k < m; k++) mb.quad(mb.v(top[i][k]), mb.v(top[i][k + 1]), mb.v(bot[i][k + 1]), mb.v(bot[i][k]), [T[i].x * s, T[i].y * s, T[i].z * s]);
  }
  return mb.geom();
}

/** Buckle on a strap whose outside faces +X (sx = 1) or -X (sx = -1). */
function sideBuckle(b, x, y, z, sx) {
  b.add('gilt', bevelBox(0.008, 0.026, 0.028, 0.002), [x + sx * 0.002, y, z]);
  b.add('void', bevelBox(0.008, 0.014, 0.016, 0.001), [x + sx * 0.0035, y, z]);
}

// ---------------------------------------------------------------------------
// Great helm (13th century)
// ---------------------------------------------------------------------------

const GH = [[0, 0.112], [0.02, 0.115], [0.1, 0.118], [0.22, 0.112], [0.29, 0.104], [0.305, 0.1]];
const ghR = (y) => interp(GH, y)[0];

/** Flat-topped 13th-century great helm with brass cross reinforcement. Origin: centre of the base rim at y = 0, face towards +Z. 0.32 m high. */
export function addGreatHelm(b) {
  const prof = GH.map(([y, R]) => [R, y]).concat([[0.092, 0.313], [0.045, 0.316], [0, 0.317]]);
  b.add('steel', lathe(prof, 30));
  const arcOver = (y0, y1, off, h, mat, th, n) => {
    const ys = [y0, (y0 + y1) / 2, y1];
    b.add(mat, shell(ys.map((y) => [y, ghR(y) + off, ghR(y) + off]), { a0: -h, a1: h, n, th }));
  };
  arcOver(0.166, 0.206, 0.0025, 1.05, 'gilt', 0.002, 20); // horizontal strap across the face
  arcOver(0.178, 0.191, 0.0036, 0.4, 'void', 0.0004, 8); // eye slit
  arcOver(0.0, 0.305, 0.0048, 0.085, 'gilt', 0.002, 4); // vertical strap
  const rv = [];
  for (const y of [0.17, 0.202]) for (const t of [-0.9, -0.65, -0.4, 0.4, 0.65, 0.9]) rv.push([(ghR(y) + 0.0025) * Math.sin(t), y, (ghR(y) + 0.0025) * Math.cos(t)]);
  for (const y of [0.04, 0.08, 0.12, 0.24, 0.28]) rv.push([0, y, ghR(y) + 0.0048]);
  rivets(b, 'gilt', rv, 0.0035);
  // breathing holes on both cheeks
  for (const sx of [-1, 1]) {
    for (const t of [0.55, 0.75, 0.95]) {
      b.push([0, 0, 0], sx * t);
      for (const y of [0.06, 0.09, 0.12]) b.add('void', G.cylinder(0.0042, 0.0042, 0.003, 6), [0, y, ghR(y) + 0.0003], 0, PI / 2);
      b.pop();
    }
  }
  b.add('iron', rimTube(0.006, 0.1135, 0.1135, { n: 28, r: 0.0055 }));
  b.add('gilt', bevelBox(0.2, 0.003, 0.013, 0.0012), [0, 0.3185, 0]);
  b.add('gilt', bevelBox(0.2, 0.0031, 0.013, 0.0012), [0, 0.3187, 0], PI / 2);
}

// ---------------------------------------------------------------------------
// Sallet and bevor (German, c. 1470)
// ---------------------------------------------------------------------------

/** German sallet with long tail and closed visor. Origin: centre of the skull base; visor and tail tip rest at y = 0, face towards +Z. */
export function addSallet(b) {
  const prof = [[0.082, 0.05], [0.092, 0.09], [0.098, 0.14], [0.093, 0.19], [0.072, 0.225], [0.038, 0.243], [0, 0.249]];
  const sk = lathe(prof, 28);
  sk.scale(1, 1, 1.22);
  b.add('steel', sk, [0, 0, 0.01]);
  b.add('gilt', rimTube(0.05, 0.082, 0.1, { cz: 0.01, n: 24, r: 0.004 }));
  // visor with sight slit
  b.add('steel', shell([[0, 0.086, 0.104, 0, 0.012], [0.06, 0.094, 0.115, 0, 0.012], [0.115, 0.098, 0.12, 0, 0.012]], { a0: -1.3, a1: 1.3, n: 14 }));
  b.add('void', band(0.064, 0.078, 0.0978, 0.1187, 0.0985, 0.1195, { cz: 0.012, a0: -0.85, a1: 0.85, n: 10, th: 0.0008 }));
  b.add('gilt', rimTube(0.0035, 0.086, 0.104, { cz: 0.012, a0: -1.3, a1: 1.3, n: 14, r: 0.0035 }));
  b.add('gilt', rimTube(0.115, 0.098, 0.12, { cz: 0.012, a0: -1.3, a1: 1.3, n: 14, r: 0.0035 }));
  rivets(b, 'gilt', [[0.1, 0.1, 0.012], [-0.1, 0.1, 0.012]], 0.007);
  // tail plate and comb
  b.add('steel', plateStrip([[0, 0.12, -0.09], [0, 0.085, -0.14], [0, 0.052, -0.19], [0, 0.022, -0.238], [0, 0.0035, -0.268]], [0.062, 0.058, 0.052, 0.045, 0.04], { curl: 0.012, th: 0.003, m: 6 }));
  b.add('steel', tube([[0, 0.196, 0.118], [0, 0.236, 0.07], [0, 0.258, 0.0], [0, 0.245, -0.07], [0, 0.2, -0.115]], 0.005, 14, 5));
  b.add('steel', tube([[0, 0.205, -0.112], [0, 0.145, -0.125], [0, 0.098, -0.15], [0, 0.07, -0.19]], 0.0045, 12, 5));
  rivets(b, 'gilt', [[0.03, 0.062, -0.205], [-0.03, 0.062, -0.205]], 0.004);
}

/** Sallet bevor (chin and throat guard of three lames). Origin: centre of the base, opening towards -Z, resting on its lower edge at y = 0. */
export function addBevor(b) {
  const lames = [[0, 0.06, 0.064, 0.072, 0.07, 0.078], [0.045, 0.105, 0.075, 0.084, 0.082, 0.09], [0.09, 0.15, 0.088, 0.094, 0.098, 0.104]];
  for (const [y0, y1, rx0, rz0, rx1, rz1] of lames) b.add('steel', band(y0, y1, rx0, rz0, rx1, rz1, { a0: -2.0, a1: 2.0, n: 16 }));
  b.add('gilt', rimTube(0.0035, 0.064, 0.072, { a0: -2.0, a1: 2.0, n: 16, r: 0.0035 }));
  b.add('gilt', rimTube(0.15, 0.098, 0.104, { a0: -2.0, a1: 2.0, n: 16, r: 0.0035 }));
  b.add('steel', rimTube(0.105, 0.082, 0.09, { a0: -2.0, a1: 2.0, n: 16, r: 0.003 }));
  b.add('steel', tube([[0, 0.01, 0.076], [0, 0.07, 0.092], [0, 0.14, 0.108]], 0.004, 10, 5));
  rivets(b, 'gilt', [[0.066, 0.05, 0.0], [-0.066, 0.05, 0.0], [0.082, 0.095, 0.0], [-0.082, 0.095, 0.0], [0.094, 0.138, 0.0], [-0.094, 0.138, 0.0]], 0.0045);
}

// ---------------------------------------------------------------------------
// Late-15th-century plate harness (body coordinates: sole at y = 0, front +Z)
// ---------------------------------------------------------------------------

/** Torso section table [y, rx, rz, cz]. */
const BODY = [[1.5, 0.12, 0.085, 0], [1.46, 0.16, 0.1, 0], [1.4, 0.178, 0.124, 0.004], [1.33, 0.182, 0.136, 0.01], [1.25, 0.168, 0.13, 0.01], [1.17, 0.15, 0.114, 0.006], [1.1, 0.144, 0.105, 0.002], [1.02, 0.158, 0.108, 0], [0.95, 0.17, 0.114, 0]];
const bodyAt = (y) => interp(BODY, y);

function sabaton(b, sx) {
  const x = sx * 0.1;
  b.add('leather', bevelBox(0.094, 0.014, 0.34, 0.004), [x, 0.007, 0.105]);
  b.push([x, 0, 0], 0, PI / 2);
  const cz = -0.014;
  const arc = { a0: PI / 2, a1: PI * 1.5, n: 8, th: 0.003 };
  const lames = [
    [[-0.07, 0.044, 0.058], [-0.005, 0.048, 0.062]],
    [[-0.025, 0.051, 0.066], [0.045, 0.05, 0.06]],
    [[0.025, 0.052, 0.058], [0.095, 0.05, 0.052]],
    [[0.075, 0.051, 0.05], [0.145, 0.047, 0.044]],
    [[0.125, 0.047, 0.044], [0.195, 0.04, 0.036]],
  ];
  for (const [p, q] of lames) {
    b.add('steel', shell([[p[0], p[1], p[2], 0, cz], [q[0], q[1], q[2], 0, cz]], arc));
    const ym = (p[0] + q[0]) / 2;
    rivets(b, 'gilt', [[p[1], ym, cz + 0.002], [-p[1], ym, cz + 0.002]], 0.0042);
  }
  b.add('steel', shell([[0.17, 0.041, 0.036, 0, cz], [0.235, 0.028, 0.024, 0, cz], [0.3, 0.005, 0.008, 0, cz]], arc));
  b.pop();
}

function legGear(b, sx) {
  const x = sx * 0.1;
  sabaton(b, sx);
  // greave with leather straps
  const GR = [[0.072, 0.048, 0.052, 0.004], [0.14, 0.052, 0.054, 0.003], [0.24, 0.056, 0.062, 0.002], [0.34, 0.058, 0.064, 0.004], [0.47, 0.054, 0.058, 0.008]];
  b.add('steel', shell(GR.map(([y, rx, rz, cz]) => [y, rx, rz, 0, cz]), { n: 18, e: 2.2 }), [x, 0, 0]);
  b.add('steel', rimTube(0.072, 0.048, 0.052, { cz: 0.004, e: 2.2, n: 18 }), [x, 0, 0]);
  b.add('steel', rimTube(0.47, 0.054, 0.058, { cz: 0.008, e: 2.2, n: 18 }), [x, 0, 0]);
  for (const y of [0.17, 0.27, 0.38]) {
    const [rx, rz, cz] = interp(GR, y);
    b.add('leather', band(y - 0.011, y + 0.011, rx + 0.003, rz + 0.003, rx + 0.003, rz + 0.003, { cz, e: 2.2, n: 18, th: 0.0025 }), [x, 0, 0]);
    sideBuckle(b, x + sx * (rx + 0.003), y, cz, sx);
  }
  // poleyn with side wing
  b.add('steel', shell([[0.45, 0.056, 0.06, 0, 0.012], [0.478, 0.062, 0.072, 0, 0.02], [0.51, 0.062, 0.072, 0, 0.02], [0.54, 0.054, 0.062, 0, 0.014]], { a0: -1.5, a1: 1.5, n: 12 }), [x, 0, 0]);
  b.add('gilt', rimTube(0.45, 0.056, 0.06, { cz: 0.012, a0: -1.5, a1: 1.5, n: 12 }), [x, 0, 0]);
  b.add('gilt', rimTube(0.54, 0.054, 0.062, { cz: 0.014, a0: -1.5, a1: 1.5, n: 12 }), [x, 0, 0]);
  b.add('steel', lathe([[0, 0], [0.034, 0], [0.037, 0.003], [0.031, 0.008], [0.013, 0.012], [0, 0.0135]], 12), [x + sx * 0.058, 0.5, 0.012], 0, 0, -sx * PI / 2);
  rivets(b, 'gilt', [[x + sx * 0.0715, 0.5, 0.012]], 0.006);
  // cuisse with two articulating lames above the poleyn
  const TH = [[0.93, 0.09, 0.095, 0.01], [0.8, 0.084, 0.09, 0.012], [0.68, 0.074, 0.08, 0.012], [0.6, 0.066, 0.072, 0.012], [0.52, 0.06, 0.066, 0.012]];
  b.add('steel', shell(TH.slice(0, 4).map(([y, rx, rz, cz]) => [y, rx, rz, 0, cz]), { n: 20 }), [x, 0, 0]);
  b.add('gilt', rimTube(0.93, 0.09, 0.095, { cz: 0.01, n: 20 }), [x, 0, 0]);
  b.add('steel', rimTube(0.6, 0.066, 0.072, { cz: 0.012, n: 20 }), [x, 0, 0]);
  for (const [yt, yb, d] of [[0.625, 0.56, 0.004], [0.585, 0.52, 0.008]]) {
    const [ax, az, acz] = interp(TH, yt);
    const [bx, bz, bcz] = interp(TH, yb);
    b.add('steel', shell([[yt, ax - d, az - d, 0, acz], [yb, bx - d, bz - d, 0, bcz]], { n: 20 }), [x, 0, 0]);
    b.add('steel', rimTube(yb, bx - d, bz - d, { cz: bcz, n: 20 }), [x, 0, 0]);
  }
  // tassets: four lames hanging from the fauld
  const a = sx > 0 ? [0.05, 1.75] : [-1.75, -0.05];
  for (let k = 0; k < 4; k++) {
    const yt = 0.97 - 0.062 * k;
    const rx = 0.197 - 0.003 * k;
    const rz = 0.142 - 0.004 * k;
    b.add('steel', band(yt, yt - 0.088, rx, rz, rx - 0.002, rz - 0.002, { a0: a[0], a1: a[1], n: 10 }));
    b.add(k === 3 ? 'gilt' : 'steel', rimTube(yt - 0.088, rx - 0.002, rz - 0.002, { a0: a[0], a1: a[1], n: 10 }));
    const t = sx * 0.9;
    rivets(b, 'gilt', [[rx * Math.sin(t), yt - 0.014, rz * Math.cos(t)]], 0.005);
  }
}

function torso(b) {
  const ys = [1.46, 1.4, 1.33, 1.25, 1.17, 1.1];
  const fr = ys.map((y) => {
    const [rx, rz, cz] = bodyAt(y);
    return [y, rx, rz, 0, cz];
  });
  const bk = ys.map((y) => {
    const [rx, rz, cz] = bodyAt(y);
    return [y, rx - 0.012, rz * 0.88, 0, cz - 0.004];
  });
  b.add('steel', shell(fr, { a0: -1.8, a1: 1.8, n: 22, e: 2.3 }));
  b.add('steel', shell(bk, { a0: PI - 1.5, a1: PI + 1.5, n: 18, e: 2.4 }));
  const [r0x, r0z, c0] = bodyAt(1.46);
  b.add('gilt', rimTube(1.46, r0x, r0z, { cz: c0, a0: -1.8, a1: 1.8, n: 22, e: 2.3 }));
  b.add('gilt', rimTube(1.46, r0x - 0.012, r0z * 0.88, { cz: c0 - 0.004, a0: PI - 1.5, a1: PI + 1.5, n: 18, e: 2.4 }));
  b.add('steel', tube(ys.map((y) => { const [rx, rz, cz] = bodyAt(y); return [0, y, cz + rz + 0.002]; }), 0.0055, 12, 5));
  b.add('steel', tube(ys.map((y) => { const [rx, rz, cz] = bodyAt(y); return [0, y, cz - 0.004 - rz * 0.88 - 0.002]; }), 0.0055, 12, 5));
  // plackart over the lower breast
  const pk = [1.27, 1.2, 1.13, 1.06].map((y) => {
    const [rx, rz, cz] = bodyAt(y);
    return [y, rx + 0.008, rz + 0.008, 0, cz];
  });
  b.add('steel', shell(pk, { a0: -1.5, a1: 1.5, n: 16, e: 2.3 }));
  b.add('gilt', rimTube(1.27, pk[0][1], pk[0][2], { cz: pk[0][4], a0: -1.5, a1: 1.5, n: 16, e: 2.3 }));
  // fauld lames
  for (let k = 0; k < 3; k++) {
    const y0 = 1.085 - 0.04 * k;
    const y1 = y0 - 0.06;
    const [ax, az, acz] = bodyAt(y0);
    const [bx, bz, bcz] = bodyAt(y1);
    const d = 0.015 - 0.003 * k;
    b.add('steel', shell([[y0, ax + d, az + d, 0, acz], [y1, bx + d, bz + d, 0, bcz]], { n: 22, e: 2.3, th: 0.0028 }));
    b.add(k === 2 ? 'gilt' : 'steel', rimTube(y1, bx + d, bz + d, { cz: bcz, n: 22, e: 2.3 }));
  }
  for (const sx of [-1, 1]) {
    b.add('leather', bevelBox(0.006, 0.15, 0.022, 0.002), [sx * (bodyAt(1.0)[0] + 0.022), 1.0, 0]);
    // shoulder straps over the top edges
    b.add('leather', bevelBox(0.03, 0.006, 0.14, 0.002), [sx * 0.14, 1.466, 0]);
    b.add('gilt', bevelBox(0.026, 0.008, 0.024, 0.002), [sx * 0.14, 1.469, 0.075]);
  }
  // gorget lames
  const gb = [[1.455, 1.505, 0.115, 0.09, 0.1, 0.09], [1.49, 1.54, 0.1, 0.09, 0.088, 0.08], [1.525, 1.575, 0.088, 0.082, 0.078, 0.074]];
  for (const [y0, y1, rx0, rz0, rx1, rz1] of gb) {
    b.add('steel', band(y0, y1, rx0, rz0, rx1, rz1, { n: 20, th: 0.0028 }));
    b.add('steel', rimTube(y1, rx1, rz1, { n: 20, r: 0.003 }));
  }
  b.add('gilt', rimTube(1.455, 0.115, 0.09, { n: 20 }));
}

function arm(b, sx) {
  b.push([sx * 0.222, 1.44, 0], 0, -0.12, sx * 0.12);
  const cx = sx * 0.008;
  const pa = sx > 0 ? [-0.6, PI + 0.6] : [-PI - 0.6, 0.6];
  const ar = { a0: pa[0], a1: pa[1], n: 14, cx };
  b.add('steel', shell([[0.062, 0.03, 0.03, cx], [0.05, 0.07, 0.068, cx], [0.02, 0.094, 0.09, cx], [-0.02, 0.1, 0.095, cx], [-0.045, 0.1, 0.095, cx]], ar));
  b.add('gilt', rimTube(-0.045, 0.1, 0.095, { ...ar, r: 0.0035 }));
  for (let k = 0; k < 4; k++) {
    const yt = -0.035 - 0.05 * k;
    const r = 0.098 - 0.008 * k;
    b.add('steel', band(yt, yt - 0.058, r, r * 0.96, r - 0.004, (r - 0.004) * 0.96, ar));
    b.add(k === 3 ? 'gilt' : 'steel', rimTube(yt - 0.058, r - 0.004, (r - 0.004) * 0.96, { ...ar, r: 0.0035 }));
    const rv = [];
    for (const d of [-0.6, 0.6]) {
      const t = sx * (PI / 2) + d;
      rv.push([cx + (r + 0.001) * Math.sin(t), yt - 0.012, (r + 0.001) * 0.96 * Math.cos(t)]);
    }
    rivets(b, 'gilt', rv, 0.0045);
  }
  // rerebrace, couter with fan
  b.add('steel', shell([[-0.15, 0.052, 0.052], [-0.22, 0.05, 0.05], [-0.28, 0.048, 0.048]], { n: 14 }));
  b.add('steel', rimTube(-0.15, 0.052, 0.052, { n: 14 }));
  b.add('leather', band(-0.2, -0.178, 0.053, 0.053, 0.053, 0.053, { n: 14, th: 0.0025 }));
  b.add('steel', shell([[-0.265, 0.05, 0.05], [-0.285, 0.057, 0.06, 0, -0.012], [-0.315, 0.057, 0.06, 0, -0.012], [-0.345, 0.05, 0.05]], { n: 16 }));
  b.add('steel', G.cylinder(0.004, 0.028, 0.045, 8), [0, -0.3, -0.05], 0, -PI / 2);
  b.add('steel', lathe([[0, 0], [0.036, 0], [0.04, 0.004], [0.034, 0.009], [0.016, 0.013], [0, 0.014]], 14), [sx * 0.063, -0.3, 0], 0, 0, -sx * PI / 2);
  rivets(b, 'gilt', [[sx * 0.0775, -0.3, 0]], 0.006);
  // forearm bends forward
  b.push([0, -0.3, 0], 0, -0.25);
  b.add('steel', shell([[-0.02, 0.047, 0.047], [-0.1, 0.05, 0.05], [-0.19, 0.043, 0.043], [-0.265, 0.04, 0.04]], { n: 14 }));
  b.add('steel', rimTube(-0.02, 0.047, 0.047, { n: 14 }));
  b.add('steel', rimTube(-0.265, 0.04, 0.04, { n: 14 }));
  for (const y of [-0.08, -0.17]) {
    const r = interp([[-0.02, 0.047], [-0.1, 0.05], [-0.19, 0.043], [-0.265, 0.04]], y)[0];
    b.add('leather', band(y - 0.011, y + 0.011, r + 0.003, r + 0.003, r + 0.003, r + 0.003, { n: 14, th: 0.0025 }));
    sideBuckle(b, sx * (r + 0.003), y, 0, sx);
  }
  // gauntlet: cuff, back plate, curled finger lames, thumb
  b.add('steel', band(-0.255, -0.31, 0.043, 0.04, 0.052, 0.046, { n: 14 }));
  b.add('gilt', rimTube(-0.31, 0.052, 0.046, { n: 14 }));
  b.add('steel', bevelBox(0.086, 0.07, 0.03, 0.006), [0, -0.335, 0.0]);
  rivets(b, 'gilt', [[0.03, -0.335, 0.0155], [-0.03, -0.335, 0.0155], [0, -0.31, 0.0155]], 0.004);
  b.add('steel', bevelBox(0.022, 0.05, 0.024, 0.005), [-sx * 0.044, -0.335, 0.016], 0, 0, -sx * 0.4);
  let n = 0;
  b.push([0, -0.375, 0.01], 0, -0.15);
  n++;
  for (let k = 0; k < 3; k++) {
    b.add('steel', bevelBox(0.078 - 0.004 * k, 0.032 - 0.003 * k, 0.028, 0.005), [0, -0.016, 0]);
    rivets(b, 'gilt', [[0.028, -0.016, 0.0145], [-0.028, -0.016, 0.0145]], 0.0035);
    b.push([0, -0.032 + 0.002 * k, 0], 0, -0.5);
    n++;
  }
  while (n-- > 0) b.pop();
  b.pop();
  b.pop();
}

/** Armet in body coordinates (sole = 0): skull, face guard with bevor, brow visor with sight slit, rear lames, comb. */
function addArmet(b) {
  const sk = [[0.084, 1.548], [0.094, 1.58], [0.099, 1.63], [0.1, 1.68], [0.097, 1.73], [0.085, 1.775], [0.055, 1.806], [0, 1.82]];
  const SKT = sk.map(([r, y]) => [y, r]);
  const SX = 0.94;
  const SZ = 1.12;
  const CZ = 0.006;
  const g = lathe(sk, 28);
  g.scale(SX, 1, SZ);
  b.add('steel', g, [0, 0, CZ]);
  const st = (y, off) => {
    const r = interp(SKT, y)[0];
    return [y, r * SX + off, r * SZ + off, 0, CZ];
  };
  const guard = (ys, off, h, n, mat) => b.add(mat, shell(ys.map((y) => st(y, off)), { a0: -h, a1: h, n, th: 0.003 }));
  const edge = (y, off, h, n, mat) => {
    const s = st(y, off);
    b.add(mat, rimTube(y, s[1], s[2], { cz: CZ, a0: -h, a1: h, n }));
  };
  guard([1.535, 1.6, 1.648], 0.008, 1.55, 18, 'steel');
  guard([1.662, 1.7, 1.745], 0.006, 1.35, 16, 'steel');
  guard([1.646, 1.655, 1.664], 0.0035, 1.0, 10, 'void');
  edge(1.535, 0.008, 1.55, 18, 'gilt');
  edge(1.648, 0.008, 1.55, 18, 'steel');
  edge(1.662, 0.006, 1.35, 16, 'gilt');
  edge(1.745, 0.006, 1.35, 16, 'gilt');
  guard([1.525, 1.55, 1.58], 0.006, 1.1, 10, 'steel');
  b.pop;
  b.push([0, 0, 0], PI);
  b.pop();
  // rear lames protect the neck
  b.add('steel', shell([1.525, 1.55, 1.58].map((y) => st(y, 0.006)), { a0: PI - 1.1, a1: PI + 1.1, n: 10, th: 0.003 }));
  edge(1.525, 0.006, 1.1, 10, 'gilt');
  // pivots and breathing holes
  rivets(b, 'gilt', [[0.101, 1.69, CZ], [-0.101, 1.69, CZ]], 0.008);
  for (const sx of [-1, 1]) {
    for (const t of [0.5, 0.75, 1.0]) {
      for (const y of [1.575, 1.6]) {
        const s = st(y, 0.008);
        const px = s[1] * Math.sin(t);
        const pz = s[2] * Math.cos(t);
        b.push([0, 0, CZ], sx * Math.atan2(px, pz));
        b.add('void', G.cylinder(0.004, 0.004, 0.003, 6), [0, y, Math.hypot(px, pz) + 0.0005], 0, PI / 2);
        b.pop();
      }
    }
  }
  b.add('steel', tube([[0, 1.772, 0.108], [0, 1.812, 0.06], [0, 1.832, 0.0], [0, 1.815, -0.06], [0, 1.768, -0.108]], 0.007, 14, 5));
}

function plateStand(b) {
  b.add('oak', bevelBlock(0.74, 0.04, 0.62, 0.007));
  b.add('darkWood', bevelBlock(0.6, 0.03, 0.48, 0.006), [0, 0.04, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) rivets(b, 'gilt', [[sx * 0.28, 0.07, sz * 0.2]], 0.006);
  b.push([0, 0.07, 0]);
  for (const sx of [-1, 1]) {
    legGear(b, sx);
    b.add('oak', G.cylinder(0.017, 0.017, 0.9, 8), [sx * 0.1, 0, 0.01]);
    arm(b, sx);
  }
  torso(b);
  addArmet(b);
  // stand parts inside the harness: hip bar, post, shoulder yoke, head knob
  b.add('oak', bevelBox(0.26, 0.04, 0.04, 0.005), [0, 0.9, 0.0]);
  b.add('oak', G.cylinder(0.022, 0.022, 0.72, 10, { y0: 0.9 }), [0, 0, -0.02]);
  b.add('oak', bevelBox(0.46, 0.034, 0.04, 0.005), [0, 1.425, -0.02]);
  b.add('darkWood', G.boxUV(new THREE.SphereGeometry(0.055, 12, 10)), [0, 1.64, 0.005]);
  b.pop();
}

// ---------------------------------------------------------------------------
// Mail hauberk on a T-stand
// ---------------------------------------------------------------------------

function mailStand(b) {
  // cross feet, post, braces, crossbar
  b.add('oak', bevelBlock(0.7, 0.07, 0.075, 0.006));
  b.add('oak', bevelBlock(0.075, 0.066, 0.7, 0.006));
  b.add('iron', bevelBlock(0.13, 0.006, 0.13, 0.002), [0, 0.07, 0]);
  rivets(b, 'gilt', [[0.04, 0.076, 0.04], [-0.04, 0.076, 0.04], [0.04, 0.076, -0.04], [-0.04, 0.076, -0.04]], 0.006);
  b.add('oak', bevelBlock(0.06, 1.5, 0.06, 0.006), [0, 0.07, 0]);
  for (const s of [-1, 1]) {
    b.add('oak', beam([s * 0.27, 0.07, 0], [s * 0.025, 0.46, 0], 0.05, 0.04));
    b.add('oak', beam([0, 0.07, s * 0.27], [0, 0.46, s * 0.025], 0.05, 0.04));
    b.add('darkWood', G.cylinder(0.024, 0.02, 0.04, 10), [s * 0.29, 1.43, 0], 0, 0, -s * PI / 2);
  }
  b.add('oak', bevelBox(0.58, 0.04, 0.05, 0.006), [0, 1.43, 0]);
  b.add('darkWood', G.boxUV(new THREE.SphereGeometry(0.055, 12, 10)), [0, 1.62, 0]);

  // hauberk body (knee length), with quilted gambeson showing below the hem
  const HB = [[1.36, 0.205, 0.13], [1.12, 0.2, 0.125], [0.95, 0.23, 0.148], [0.78, 0.26, 0.168], [0.6, 0.285, 0.19]];
  b.add('mail', shell(HB.map(([y, rx, rz]) => [y, rx, rz]), { n: 28, th: 0.004 }));
  b.add('gambeson', shell([[0.545, 0.27, 0.178], [0.61, 0.277, 0.182]], { n: 28, th: 0.004, wave: [24, 0.016] }));
  // coif and shoulder cape
  b.add('mail', shell([[1.325, 0.225, 0.145], [1.4, 0.17, 0.125], [1.44, 0.125, 0.108], [1.47, 0.103, 0.102], [1.51, 0.095, 0.095]], { n: 24, th: 0.004 }));
  // short sleeves hang from the crossbar ends, with gambeson cuffs
  for (const sx of [-1, 1]) {
    b.push([sx * 0.17, 1.4, 0], 0, 0, sx * 1.15);
    b.add('mail', shell([[0, 0.088, 0.088], [-0.17, 0.078, 0.082], [-0.34, 0.07, 0.07]], { n: 18, th: 0.004 }));
    b.add('gambeson', band(-0.325, -0.385, 0.064, 0.064, 0.064, 0.064, { n: 18, th: 0.004, wave: [12, 0.04] }));
    b.pop();
  }
  // belted crimson surcoat over the hauberk
  const sc = [1.31, 1.12, 0.95, 0.78, 0.64].map((y) => {
    const [rx, rz] = interp(HB, y);
    return [y, rx + 0.016, rz + 0.016];
  });
  b.add('fabric', shell(sc, { n: 32, th: 0.004, wave: [10, 0.012] }));
  const [bx, bz] = interp(sc.map(([y, rx, rz]) => [y, rx, rz]), 1.1);
  b.add('leather', band(1.085, 1.115, bx + 0.004, bz + 0.004, bx + 0.004, bz + 0.004, { n: 32, th: 0.003 }));
  b.add('gilt', bevelBox(0.034, 0.036, 0.008, 0.002), [0, 1.1, bz + 0.009]);
  b.add('void', bevelBox(0.02, 0.022, 0.0085, 0.001), [0, 1.1, bz + 0.0105]);
  b.add('leather', bevelBox(0.022, 0.2, 0.005, 0.002), [0.02, 1.0, bz + 0.013]);
  // great helm resting over the coif
  b.push([0, 1.46, 0]);
  addGreatHelm(b);
  b.pop();
}

export const armourModules = [
  {
    id: 'armour_stand_plate',
    name: 'Plate armour on stand',
    category: 'armour',
    description: 'Late-15th-century Gothic plate harness at human scale (about 1.9 m) on a wooden stand with square plinth: armet with bevor, gorget, breastplate with plackart, fauld, tassets, pauldrons, couters, gauntlets, cuisses, poleyns, greaves and sabatons.',
    build(M) {
      const b = armsBuilder(M, LOCAL);
      plateStand(b);
      return b.build('armour_stand_plate');
    },
  },
  {
    id: 'armour_stand_mail',
    name: 'Mail hauberk on T-stand',
    category: 'armour',
    description: 'Knee-length short-sleeved mail hauberk with mail coif, gambeson hems and a belted crimson surcoat on a T-shaped oak stand, topped by a flat-topped great helm.',
    build(M) {
      const b = armsBuilder(M, LOCAL);
      mailStand(b);
      return b.build('armour_stand_mail');
    },
  },
  {
    id: 'helmet_great',
    name: 'Great helm',
    category: 'armour',
    description: '13th-century flat-topped great helm, 0.32 m high, with eye slit, breathing holes, and a brass cross of riveted straps; standing on its base rim.',
    build(M) {
      const b = armsBuilder(M, LOCAL);
      addGreatHelm(b);
      return b.build('helmet_great');
    },
  },
  {
    id: 'helmet_sallet',
    name: 'Sallet with bevor',
    category: 'armour',
    description: 'German sallet with long tail and closed visor slit, 0.27 m long, with a separate three-lame bevor lying beside it.',
    build(M) {
      const b = armsBuilder(M, LOCAL);
      b.push([-0.12, 0, 0.09]);
      addSallet(b);
      b.pop();
      b.push([0.17, 0, 0], -0.5);
      addBevor(b);
      b.pop();
      return b.build('helmet_sallet');
    },
  },
];
