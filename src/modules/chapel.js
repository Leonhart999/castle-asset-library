// Chapel and heraldry props (stage 4): stone altar with frontal, candlesticks and chalice, church pew, book lectern,
// octagonal baptismal font, standing processional banner and a wall-hung coat of arms.
// Base sits at y = 0, centred on x = z = 0, +Z is the front (wall mounts back onto z = 0), 1 unit = 1 m.

import * as THREE from 'three';
import * as G from '../lib/geo.js';
import { newBuilder, lathe, ringBand, bevelBlock, bevelBox, rivets, candle } from '../lib/kit.js';
import { hoop } from '../lib/props.js';

/** Brass candlestick with a turned stem; the candle sits on the drip pan 0.34 m above the base. */
function candlestick(b, pos, seed) {
  const prof = [[0, 0], [0.07, 0], [0.072, 0.02], [0.035, 0.06], [0.025, 0.12], [0.04, 0.14], [0.022, 0.17], [0.02, 0.3], [0.042, 0.32], [0.03, 0.34], [0, 0.34]];
  b.add('gilt', lathe(prof, 20), pos);
  candle(b, [pos[0], pos[1] + 0.34, pos[2]], { h: 0.26, r: 0.03, panR: 0.06, matPan: 'gilt', seed });
}

/** Marble-topped stone altar: stepped plinth, solid ends, crimson frontal with gilt orphreys, linen cloth, crucifix, candlesticks, chalice and missal. */
function stoneAltar(b) {
  const H = 0.82; // underside of the mensa
  const top = H + 0.1; // top of the mensa
  b.add('dressed', bevelBlock(1.96, 0.1, 0.96, 0.01)); // step
  for (const sx of [-1, 1]) b.add('dressed', bevelBlock(0.2, H - 0.1, 0.7, 0.01), [sx * 0.7, 0.1, 0]);
  b.add('dressed', bevelBlock(1.2, H - 0.1, 0.12, 0.008), [0, 0.1, -0.29]);
  b.add('marble', bevelBlock(1.8, 0.1, 0.8, 0.012), [0, H, 0]);

  // crimson frontal with gilt orphreys, hung between the end supports
  b.add('fabric', bevelBlock(1.18, 0.62, 0.012, 0.003), [0, 0.2, 0.3]);
  b.add('gilt', bevelBox(0.07, 0.62, 0.016, 0.003), [0, 0.51, 0.3]);
  b.add('gilt', bevelBox(0.5, 0.06, 0.016, 0.003), [0, 0.64, 0.3]);
  b.add('gilt', bevelBox(1.18, 0.03, 0.016, 0.003), [0, 0.215, 0.3]);

  // linen cloth falling over the front and back edges
  const cy = top + 0.012;
  b.add('linen', bevelBlock(1.5, 0.012, 0.9, 0.004), [0, top, 0]);
  for (const sz of [-1, 1]) b.add('linen', bevelBlock(1.5, 0.16, 0.012, 0.004), [0, top - 0.15, sz * 0.45]);

  // brass crucifix on a turned foot
  b.add('gilt', lathe([[0, 0], [0.07, 0], [0.07, 0.02], [0.04, 0.05], [0.03, 0.14], [0.045, 0.16], [0, 0.16]], 20), [0, cy, -0.1]);
  b.add('gilt', bevelBox(0.03, 0.4, 0.016, 0.004), [0, cy + 0.36, -0.1]);
  b.add('gilt', bevelBox(0.2, 0.03, 0.016, 0.004), [0, cy + 0.46, -0.1]);
  rivets(b, 'gilt', [[-0.1, cy + 0.46, -0.1], [0.1, cy + 0.46, -0.1], [0, cy + 0.56, -0.1]], 0.02);

  candlestick(b, [-0.62, cy, -0.12], 1);
  candlestick(b, [0.62, cy, -0.12], 2);

  // chalice with wine
  b.add('gilt', lathe([[0, 0], [0.05, 0], [0.052, 0.01], [0.018, 0.03], [0.014, 0.08], [0.026, 0.09], [0.014, 0.1], [0.048, 0.13], [0.05, 0.17], [0.044, 0.17], [0.042, 0.135], [0, 0.12]], 24), [0.32, cy, 0.14]);
  b.add('wine', G.cylinder(0.041, 0.041, 0.002, 18, { y0: 0.15 }), [0.32, cy, 0.14]);

  // closed missal with a gilt boss
  b.push([-0.3, cy, 0.14], 0.25);
  b.add('leather', bevelBlock(0.22, 0.012, 0.16, 0.004));
  b.add('linen', bevelBlock(0.205, 0.026, 0.145, 0.003), [0, 0.012, 0]);
  b.add('leather', bevelBlock(0.22, 0.012, 0.16, 0.004), [0, 0.038, 0]);
  b.add('gilt', G.cylinder(0.018, 0.02, 0.006, 12, { y0: 0.05 }));
  b.pop();
}

/** Two-seat church pew: gothic-profile end panels with poppyhead finials, plank seat, three back rails, cap rail and foot rail. */
function churchPew(b) {
  const L = 1.8;
  // end panel profile in the z-y plane: seat-height cheek plus a leaning back post with a pointed cap
  const prof = new THREE.Shape();
  prof.moveTo(-0.27, 0);
  prof.lineTo(0.27, 0);
  prof.lineTo(0.27, 0.46);
  prof.lineTo(-0.19, 0.46);
  prof.lineTo(-0.2, 0.96);
  prof.lineTo(-0.235, 1.08);
  prof.lineTo(-0.27, 1.04);
  prof.closePath();
  const endG = new THREE.ExtrudeGeometry(prof, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 });
  endG.translate(0, 0.006, -0.03);
  endG.rotateY(-Math.PI / 2); // shape x becomes world z, extrusion becomes x
  for (const sx of [-1, 1]) {
    b.add('oak', G.boxUV(endG.clone()), [sx * (L / 2 - 0.03), 0, 0]);
    b.add('darkWood', lathe([[0, 0], [0.022, 0], [0.032, 0.03], [0.022, 0.06], [0.027, 0.09], [0, 0.12]], 12), [sx * (L / 2 - 0.03), 1.07, -0.235]);
  }
  b.add('oak', bevelBlock(L - 0.12, 0.04, 0.44, 0.006), [0, 0.42, 0.03]);
  for (const y of [0.5, 0.7, 0.88]) b.add('darkWood', bevelBlock(L - 0.12, 0.14, 0.035, 0.005), [0, y, -0.23]);
  b.add('darkWood', bevelBlock(L - 0.06, 0.05, 0.1, 0.007), [0, 1.02, -0.235]);
  b.add('darkWood', bevelBlock(L - 0.12, 0.06, 0.07, 0.006), [0, 0.1, 0.2]);
}

/** Turned oak lectern with a tilted reading desk, front lip and a closed bound book. */
function bookLectern(b) {
  b.add('darkWood', bevelBlock(0.5, 0.05, 0.5, 0.008));
  b.add('darkWood', lathe([[0, 0.05], [0.1, 0.05], [0.1, 0.09], [0.05, 0.12], [0.042, 0.2], [0.066, 0.25], [0.042, 0.3], [0.038, 0.9], [0.062, 0.94], [0.062, 0.98], [0.046, 1.0], [0.1, 1.02], [0.1, 1.07], [0, 1.07]], 20));
  b.add('darkWood', bevelBlock(0.12, 0.08, 0.14, 0.008), [0, 1.07, 0]);
  // desk tilted towards the reader at +Z, back edge raised
  b.push([0, 1.17, 0], 0, 0.4);
  b.add('oak', bevelBlock(0.56, 0.03, 0.42, 0.006));
  b.add('oak', bevelBlock(0.56, 0.055, 0.03, 0.006), [0, 0, 0.2]);
  b.add('leather', bevelBlock(0.37, 0.012, 0.29, 0.004), [0, 0.03, -0.01]);
  b.add('linen', bevelBlock(0.345, 0.026, 0.265, 0.003), [0, 0.042, -0.01]);
  b.add('leather', bevelBlock(0.37, 0.012, 0.29, 0.004), [0, 0.068, -0.01]);
  b.add('gilt', G.cylinder(0.018, 0.02, 0.008, 12, { y0: 0.08 }), [0, 0, -0.01]);
  b.pop();
}

/** Octagonal stone baptismal font: stepped plinth, stem ringed by eight colonnettes, round bowl with rim moulding and water. */
function baptismalFont(b) {
  b.add('dressed', G.prism(8, 0.5, 0.1));
  b.add('dressed', G.prism(8, 0.4, 0.07), [0, 0.1, 0]);
  b.add('dressed', G.prism(8, 0.14, 0.46), [0, 0.17, 0]);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    b.add('dressed', lathe([[0, 0], [0.032, 0], [0.03, 0.02], [0.022, 0.05], [0.022, 0.36], [0.034, 0.39], [0.034, 0.42], [0, 0.42]], 10), [Math.cos(a) * 0.17, 0.19, Math.sin(a) * 0.17]);
  }
  b.add('dressed', lathe([[0, 0.63], [0.2, 0.63], [0.3, 0.68], [0.4, 0.78], [0.43, 0.9], [0.43, 0.98], [0.37, 0.98], [0.36, 0.9], [0.3, 0.8], [0.2, 0.75], [0, 0.75]], 16));
  b.add('dressed', hoop(0.43, 0.02, 32), [0, 0.98, 0]);
  b.add('water', G.cylinder(0.35, 0.35, 0.003, 28, { y0: 0.9 }));
}

/** Gentle cloth ripple for a box already placed at its final position; the top edge stays almost flat. */
function ripple(g, top, height, amp = 0.014) {
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (top - pos.getY(i)) / height));
    pos.setZ(i, pos.getZ(i) + amp * Math.sin(pos.getX(i) * 9 + t * 2.2) * (0.15 + 0.85 * t));
  }
  g.computeVertexNormals();
  return g;
}

/** Processional banner: azure cloth with a gilt cross hung from a gilt crossbar on a pole with a cross-shaped foot and a spear finial. */
function standingBanner(b) {
  const TOP = 2.18;
  const W = 0.72;
  const H = 1.1;
  b.add('darkWood', bevelBlock(0.62, 0.05, 0.1, 0.006));
  b.add('darkWood', bevelBlock(0.1, 0.05, 0.62, 0.006));
  b.add('iron', ringBand(0.03, 0.014, 0.1, 18), [0, 0.05, 0]);
  b.add('darkWood', G.cylinder(0.02, 0.022, 2.3, 12, { y0: 0.05 }));
  b.add('gilt', lathe([[0, 0], [0.026, 0], [0.03, 0.03], [0.012, 0.06], [0.018, 0.1], [0.002, 0.22]], 12), [0, 2.35, 0]);
  b.add('gilt', G.cylinder(0.014, 0.014, 0.84, 10, { y0: -0.42 }), [0, 2.2, 0], 0, 0, Math.PI / 2);
  for (const sx of [-1, 1]) b.add('gilt', new THREE.SphereGeometry(0.026, 12, 8), [sx * 0.43, 2.2, 0]);

  // cloth, gilt cross on it (both follow the same ripple), hanging straps, bottom bar and tassels
  b.add('azure', G.boxUV(ripple(new THREE.BoxGeometry(W, H, 0.01, 16, 24, 1).translate(0, TOP - H / 2, 0.03), TOP, H)));
  const emblem = (w, h, cx, cy, sx, sy) => ripple(new THREE.BoxGeometry(w, h, 0.012, sx, sy, 1).translate(cx, cy, 0.04), TOP, H);
  b.add('gilt', G.boxUV(emblem(0.07, 0.7, 0, TOP - 0.52, 1, 14)));
  b.add('gilt', G.boxUV(emblem(0.42, 0.07, 0, TOP - 0.3, 10, 1)));
  for (const x of [-0.28, -0.14, 0, 0.14, 0.28]) b.add('azure', bevelBox(0.05, 0.1, 0.06, 0.004), [x, 2.2, 0.015]);
  b.add('gilt', bevelBox(W + 0.02, 0.03, 0.04, 0.004), [0, TOP - H, 0.03]);
  for (let i = 0; i < 9; i++) b.add('gilt', G.cylinder(0.011, 0.004, 0.08, 6, { y0: -0.08 }), [-0.32 + i * 0.08, TOP - H - 0.015, 0.03]);
}

/** Heater-shaped coat of arms for a wall: oak frame with studded rim, azure field, gilt chevron and three gilt roundels, hanging eye. */
function wallArms(b) {
  const outline = () => {
    const s = new THREE.Shape();
    s.moveTo(-0.3, 0.5);
    s.lineTo(0.3, 0.5);
    s.lineTo(0.3, 0.15);
    s.quadraticCurveTo(0.3, -0.2, 0, -0.5);
    s.quadraticCurveTo(-0.3, -0.2, -0.3, 0.15);
    s.closePath();
    return s;
  };
  const frame = new THREE.ExtrudeGeometry(outline(), { depth: 0.04, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1, curveSegments: 14 });
  frame.translate(0, 0.51, 0.008);
  b.add('oak', G.boxUV(frame));
  const face = new THREE.ExtrudeGeometry(outline(), { depth: 0.01, bevelEnabled: false, curveSegments: 14 });
  face.scale(0.9, 0.9, 1);
  face.translate(0, 0.51, 0.056);
  b.add('azure', G.boxUV(face));

  const chev = new THREE.Shape([[0, 0.22], [0.22, 0.02], [0.22, -0.1], [0, 0.1], [-0.22, -0.1], [-0.22, 0.02]].map(([x, y]) => new THREE.Vector2(x, y)));
  const chevG = new THREE.ExtrudeGeometry(chev, { depth: 0.012, bevelEnabled: false });
  chevG.translate(0, 0.51, 0.066);
  b.add('gilt', G.boxUV(chevG));
  for (const [x, y] of [[-0.14, 0.36], [0.14, 0.36], [0, -0.3]]) b.add('gilt', G.cylinder(0.045, 0.045, 0.012, 18), [x, y + 0.51, 0.066], 0, Math.PI / 2);

  // studs around the frame rim and an iron hanging eye
  const studs = outline().getSpacedPoints(24).slice(0, -1).map((p) => [p.x * 0.95, p.y * 0.95 + 0.51, 0.06]);
  rivets(b, 'gilt', studs, 0.008);
  b.add('iron', G.boxUV(new THREE.TorusGeometry(0.03, 0.006, 6, 14)), [0, 1.03, 0.02]);
}

const def = (id, category, name, description, fn) => ({
  id,
  name,
  category,
  description,
  build(M) {
    const b = newBuilder(M);
    fn(b);
    return b.build(id);
  },
});

export const chapelModules = [
  def('altar_stone', 'chapel', 'Stone altar', 'Marble-topped altar 1.8 m wide on a stepped plinth with solid ends, crimson frontal with gilt orphreys, linen cloth, brass crucifix, two candlesticks, chalice and missal.', stoneAltar),
  def('pew_wooden', 'chapel', 'Church pew', 'Two-seat oak pew with gothic-profile end panels, poppyhead finials, plank seat, three back rails, cap rail and foot rail.', churchPew),
  def('lectern_book', 'chapel', 'Book lectern', 'Turned oak lectern with a tilted reading desk, front lip and a closed leather-bound book with a gilt boss.', bookLectern),
  def('font_baptismal', 'chapel', 'Baptismal font', 'Octagonal stone font: stepped plinth, stem ringed by eight colonnettes, round bowl with rim moulding and a water surface.', baptismalFont),
];

export const heraldryModules = [
  def('banner_standing', 'heraldry', 'Standing banner', 'Processional banner on a 2.4 m pole with cross-shaped foot: rippled azure cloth with a gilt cross, gilt crossbar, tassels and spear finial.', standingBanner),
  def('arms_shield_wall', 'heraldry', 'Wall-hung coat of arms', 'Heater-shaped oak frame with studded rim, azure field, gilt chevron and three gilt roundels, hung from an iron eye. Back at z = 0.', wallArms),
];
