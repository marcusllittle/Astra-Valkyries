import * as THREE from 'three';

const stage = document.querySelector('three-d-stage');
await stage.ready;

/* Palette off the key art: white ceramic armour, warm grey shadow plate,
   brushed gold trim and nozzle rims, black inserts, cool glass. */
const M = {
  hull: new THREE.MeshStandardMaterial({ name: 'hull_ceramic_white', color: 0xeceff3, roughness: 0.32, metalness: 0.22 }),
  hullGrey: new THREE.MeshStandardMaterial({ name: 'hull_shadow_grey', color: 0xa9b1ba, roughness: 0.44, metalness: 0.28 }),
  gold: new THREE.MeshStandardMaterial({ name: 'trim_gold', color: 0xd0a244, roughness: 0.26, metalness: 0.4 }),
  insert: new THREE.MeshStandardMaterial({ name: 'panel_insert_black', color: 0x14171c, roughness: 0.56, metalness: 0.25 }),
  glass: new THREE.MeshStandardMaterial({ name: 'canopy_glass', color: 0x101c2c, roughness: 0.06, metalness: 0.35, transparent: true, opacity: 0.76 }),
  glow: new THREE.MeshStandardMaterial({ name: 'thruster_plasma', color: 0xffd9a0, roughness: 0.5, metalness: 0, emissive: 0xffb257, emissiveIntensity: 2.2 })
};

const ship = new THREE.Group();
ship.name = 'seraph_guard';

function add(name, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale) {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.position.set(...pos);
  m.rotation.set(...rot);
  if (scale) m.scale.set(...scale);
  ship.add(m);
  return m;
}
function pair(name, geo, mat, pos, rot = [0, 0, 0], scale = [1, 1, 1]) {
  add(name + '_stbd', geo, mat, pos, rot, scale);
  add(name + '_port', geo, mat, [-pos[0], pos[1], pos[2]], [rot[0], -rot[1], -rot[2]], [-scale[0], scale[1], scale[2]]);
}
function shape(pts) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  pts.slice(1).forEach(([x, y]) => s.lineTo(x, y));
  s.closePath();
  return s;
}
function plate(pts, depth, bevel = 0.05) {
  const g = new THREE.ExtrudeGeometry(shape(pts), { depth, bevelEnabled: bevel > 0, bevelThickness: bevel * 0.7, bevelSize: bevel, bevelSegments: 2 });
  g.rotateX(-Math.PI / 2);
  return g;
}
function finPlate(pts, depth, bevel = 0.04) {
  const g = new THREE.ExtrudeGeometry(shape(pts), { depth, bevelEnabled: bevel > 0, bevelThickness: bevel * 0.7, bevelSize: bevel, bevelSegments: 1 });
  g.rotateY(Math.PI / 2);
  return g;
}

/* ---------- armoured command fuselage, long nose with black tip ---------- */
const prof = [[0.02, 0], [0.18, 1.4], [0.44, 3.0], [0.74, 4.8], [1.0, 6.6], [1.16, 8.6], [1.2, 11.0], [1.12, 13.4], [1.0, 15.4], [0.86, 17.4]];
const fuse = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 14);
fuse.rotateX(Math.PI / 2);
fuse.scale(1.06, 0.62, 1);
fuse.translate(0, 0, -9.2);
add('fuselage', fuse, M.hull);

add('nose_tip', new THREE.ConeGeometry(0.42, 3.4, 18), M.insert, [0, 0, -7.9], [-Math.PI / 2, 0, 0]);
add('nose_underplate', new THREE.BoxGeometry(0.34, 0.07, 2.8), M.gold, [0, -0.3, -7.6], [-0.12, 0, 0]);
pair('nose_chine', new THREE.BoxGeometry(0.07, 0.12, 5.4), M.gold, [0.46, -0.06, -5.6], [0, 0.055, 0]);
pair('flank_armour_fwd', new THREE.BoxGeometry(0.07, 0.66, 3.0), M.hullGrey, [0.96, -0.04, -2.6]);
pair('flank_insert', new THREE.BoxGeometry(0.05, 0.42, 1.8), M.insert, [1.2, 0.02, 1.2]);
pair('flank_gold_line', new THREE.BoxGeometry(0.05, 0.1, 3.4), M.gold, [1.06, 0.3, -0.2], [0, 0, 0.05]);
add('ventral_gold_plate', new THREE.BoxGeometry(1.2, 0.16, 7.6), M.gold, [0, -0.62, -1.4]);
add('ventral_keel', new THREE.BoxGeometry(0.7, 0.3, 6.4), M.hullGrey, [0, -0.5, 3.0]);

/* ---------- canopy: tall dark bubble, gold surround ---------- */
add('canopy_glass', new THREE.SphereGeometry(1, 30, 20, 0, Math.PI * 2, 0, Math.PI / 2), M.glass, [0, 0.3, -3.9], [0, 0, 0], [0.56, 0.68, 1.9]);
add('canopy_frame', new THREE.TorusGeometry(1, 0.055, 8, 40), M.gold, [0, 0.29, -3.9], [Math.PI / 2, 0, 0], [0.58, 1.92, 1]);
add('canopy_spine', new THREE.BoxGeometry(0.08, 0.1, 3.6), M.gold, [0, 0.94, -3.9]);
add('headrest', new THREE.BoxGeometry(0.48, 0.34, 0.34), M.insert, [0, 0.56, -2.0]);
pair('cheek_window', new THREE.BoxGeometry(0.06, 0.3, 0.9), M.glass, [0.86, 0.16, -5.0], [0, 0, 0.1]);

/* ---------- broad forward-swept wing planks with tip winglets ---------- */
const wing = plate([[0.9, 1.4], [6.2, 3.0], [6.4, 1.4], [3.0, -2.6], [0.9, -3.2]], 0.28, 0.08);
wing.translate(0, -0.06, 2.0);
pair('wing', wing, M.hull, [0.3, 0, 0], [0, 0, -0.03]);

const wingGold = plate([[1.4, 1.2], [6.1, 2.7], [6.15, 2.2], [1.4, 0.7]], 0.06, 0);
wingGold.translate(0, 0.15, 2.0);
pair('wing_gold_edge', wingGold, M.gold, [0.3, 0, 0], [0, 0, -0.03]);

const wingInsert = plate([[1.6, 0.2], [4.6, 0.6], [4.6, -1.4], [1.6, -1.8]], 0.06, 0);
wingInsert.translate(0, 0.155, 2.0);
pair('wing_insert', wingInsert, M.insert, [0.3, 0, 0], [0, 0, -0.03]);

pair('wing_armour_rib', new THREE.BoxGeometry(0.14, 0.44, 3.2), M.hullGrey, [3.2, 0.2, 1.6], [0, -0.28, -0.03]);
pair('winglet', finPlate([[1.6, 0], [1.0, 2.4], [0.2, 2.4], [-1.0, 0]], 0.14), M.hull, [6.15, 0.1, 3.6], [0, 0, -0.08]);
pair('winglet_gold', finPlate([[1.1, 0.4], [0.75, 2.1], [0.35, 2.1], [0.3, 0.4]], 0.05, 0), M.gold, [6.29, 0.1, 3.55], [0, 0, -0.08]);
pair('winglet_spike', new THREE.ConeGeometry(0.07, 1.4, 10), M.hullGrey, [6.2, 0.1, 2.3], [-Math.PI / 2, 0, 0]);
pair('hardpoint', new THREE.BoxGeometry(0.5, 0.26, 1.6), M.hullGrey, [3.6, -0.28, 2.6], [0, -0.26, 0]);

/* ---------- twin dorsal engine drums with gold rims ---------- */
const NX = 1.45, NY = 0.52, NZ = 3.4;
pair('engine_drum', new THREE.CylinderGeometry(0.95, 0.9, 4.6, 30), M.hull, [NX, NY, NZ], [Math.PI / 2, 0, 0]);
pair('engine_drum_collar', new THREE.CylinderGeometry(1.0, 1.0, 0.5, 30), M.hullGrey, [NX, NY, NZ + 1.2], [Math.PI / 2, 0, 0]);
pair('intake_rim', new THREE.TorusGeometry(0.86, 0.13, 14, 32), M.gold, [NX, NY, NZ - 2.3], [0.16, 0, 0]);
pair('intake_throat', new THREE.CylinderGeometry(0.78, 0.6, 0.9, 28, 1, true), M.insert, [NX, NY, NZ - 2.0], [Math.PI / 2 + 0.16, 0, 0]);
pair('intake_face', new THREE.CircleGeometry(0.62, 28), M.insert, [NX, NY - 0.05, NZ - 1.6], [-0.16, 0, 0]);
pair('drum_dorsal_insert', new THREE.BoxGeometry(0.6, 0.06, 2.4), M.insert, [NX, NY + 0.94, NZ + 0.4]);
pair('drum_gold_band', new THREE.TorusGeometry(0.92, 0.05, 10, 30), M.gold, [NX, NY, NZ + 0.4]);
pair('nozzle_housing', new THREE.CylinderGeometry(0.9, 0.74, 1.1, 30, 1, true), M.hullGrey, [NX, NY, NZ + 2.7], [Math.PI / 2, 0, 0]);
pair('nozzle_rim', new THREE.TorusGeometry(0.76, 0.07, 10, 30), M.gold, [NX, NY, NZ + 3.2]);
pair('thruster_core', new THREE.CylinderGeometry(0.62, 0.62, 0.18, 26), M.glow, [NX, NY, NZ + 3.1], [Math.PI / 2, 0, 0]);
pair('drum_pylon', new THREE.BoxGeometry(0.6, 1.0, 3.6), M.hullGrey, [NX - 0.55, NY - 0.5, NZ - 0.2]);

/* ---------- tall twin fins + dorsal spine fin ---------- */
pair('tail_fin', finPlate([[1.4, 0], [0.5, 3.6], [-0.5, 3.6], [-1.8, 0]], 0.14), M.hull, [0.95, 1.1, 1.6], [0, 0, -0.12]);
pair('tail_fin_gold', finPlate([[0.9, 0.5], [0.35, 3.1], [-0.1, 3.1], [-0.4, 0.5]], 0.05, 0), M.gold, [1.09, 1.1, 1.55], [0, 0, -0.12]);
pair('tail_fin_insert', finPlate([[-0.7, 0.4], [-0.35, 2.2], [-0.9, 2.2], [-1.25, 0.4]], 0.04, 0), M.insert, [1.1, 1.1, 1.55], [0, 0, -0.12]);
add('spine_fin', finPlate([[1.2, 0], [0.4, 1.5], [-0.6, 1.5], [-1.6, 0]], 0.16), M.hullGrey, [0, 0.66, 6.2]);
pair('ventral_strake', finPlate([[0.6, 0], [0.1, -1.2], [-0.9, -1.2], [-1.5, 0]], 0.12), M.hullGrey, [1.0, -0.44, 6.0], [0, 0, 0.2]);

/* ---------- armour greebles ---------- */
for (let i = 0; i < 6; i++) {
  pair('armour_seam_' + i, new THREE.BoxGeometry(0.05, 0.2, 0.5), M.insert, [1.06, 0.24, -2.6 + i * 1.25]);
}
add('rcs_block_dorsal', new THREE.BoxGeometry(0.7, 0.18, 0.44), M.insert, [0, 0.66, -1.4]);
pair('rcs_block_nose', new THREE.BoxGeometry(0.22, 0.28, 0.38), M.insert, [0.52, 0.04, -6.2]);
pair('avionics_blister', new THREE.SphereGeometry(0.24, 16, 12), M.hullGrey, [0.7, 0.4, 0.2], [0, 0, 0], [1, 0.55, 1.9]);
add('sensor_mast', new THREE.CylinderGeometry(0.05, 0.05, 2.6, 10), M.hullGrey, [0, 1.1, -1.0], [0.4, 0, 0]);
add('targeting_pod', new THREE.SphereGeometry(0.32, 20, 14), M.insert, [0, -0.62, -5.2], [0, 0, 0], [1, 0.8, 1.6]);
add('targeting_lens', new THREE.CircleGeometry(0.17, 20), M.gold, [0, -0.9, -5.3], [-Math.PI / 2, 0, 0]);

/* ---------- ground, center, scale to spec length ---------- */
let box = new THREE.Box3().setFromObject(ship);
ship.scale.setScalar(19.6 / (box.max.z - box.min.z));
ship.updateMatrixWorld(true);
box = new THREE.Box3().setFromObject(ship);
const c = box.getCenter(new THREE.Vector3());
ship.position.set(-c.x, -box.min.y, -c.z);

const root = new THREE.Group();
root.name = 'seraph_guard_root';
root.add(ship);
stage.setObject(root);
