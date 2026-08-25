import * as THREE from 'three';

const stage = document.querySelector('three-d-stage');
await stage.ready;

/* Palette read off the in-game key art: cerulean hull, deep blue shadow
   panels, near-black inserts, white chevrons, cyan/teal glow. */
const M = {
  hull: new THREE.MeshStandardMaterial({ name: 'hull_cerulean', color: 0x2f7fc4, roughness: 0.34, metalness: 0.32 }),
  hullDark: new THREE.MeshStandardMaterial({ name: 'hull_deep_blue', color: 0x1a4c86, roughness: 0.42, metalness: 0.3 }),
  insert: new THREE.MeshStandardMaterial({ name: 'panel_insert_black', color: 0x14171c, roughness: 0.58, metalness: 0.25 }),
  white: new THREE.MeshStandardMaterial({ name: 'accent_white', color: 0xe8eef5, roughness: 0.3, metalness: 0.15 }),
  accent: new THREE.MeshStandardMaterial({ name: 'accent_slipstream', color: 0x6fb1fc, roughness: 0.3, metalness: 0.2, emissive: 0x1b3f7a, emissiveIntensity: 0.7 }),
  glass: new THREE.MeshStandardMaterial({ name: 'canopy_glass', color: 0x0b1420, roughness: 0.06, metalness: 0.35, transparent: true, opacity: 0.78 }),
  glow: new THREE.MeshStandardMaterial({ name: 'thruster_plasma', color: 0xa8d4ff, roughness: 0.5, metalness: 0, emissive: 0x6fb1fc, emissiveIntensity: 2.6 })
};

const ship = new THREE.Group();
ship.name = 'astra_interceptor';

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
// flat panel-like part: shape drawn in plan view (x = span, y = forward), thickness in Y
function plate(pts, depth, bevel = 0.05) {
  const g = new THREE.ExtrudeGeometry(shape(pts), { depth, bevelEnabled: bevel > 0, bevelThickness: bevel * 0.7, bevelSize: bevel, bevelSegments: 2 });
  g.rotateX(-Math.PI / 2);
  return g;
}
// vertical fin: shape drawn in side view (x = forward, y = up), thickness in X
function finPlate(pts, depth, bevel = 0.04) {
  const g = new THREE.ExtrudeGeometry(shape(pts), { depth, bevelEnabled: bevel > 0, bevelThickness: bevel * 0.7, bevelSize: bevel, bevelSegments: 1 });
  g.rotateY(Math.PI / 2);
  return g;
}

/* ---------- fuselage: long dart, sharp nose at -Z ---------- */
const prof = [[0.012, 0], [0.1, 1.1], [0.26, 2.5], [0.46, 4.0], [0.7, 5.6], [0.9, 7.4], [1.0, 9.4], [1.0, 11.4], [0.94, 13.0], [0.82, 15.4]];
const fuse = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 14);
fuse.rotateX(Math.PI / 2);
fuse.scale(1.12, 0.6, 1);
fuse.translate(0, 0, -8.2);
add('fuselage', fuse, M.hull);

add('nose_blade', new THREE.ConeGeometry(0.1, 1.6, 12), M.hullDark, [0, 0, -7.9], [-Math.PI / 2, 0, 0]);
pair('nose_chine', new THREE.BoxGeometry(0.06, 0.1, 5.2), M.hullDark, [0.34, -0.02, -5.4], [0, 0.055, 0]);
pair('nose_avionics_hatch', new THREE.BoxGeometry(0.04, 0.34, 1.3), M.insert, [0.46, 0.08, -4.6]);
pair('forward_flank_insert', new THREE.BoxGeometry(0.05, 0.62, 2.6), M.insert, [0.82, -0.02, -1.4]);
pair('aft_flank_insert', new THREE.BoxGeometry(0.05, 0.5, 2.0), M.insert, [1.06, -0.06, 2.4]);
pair('flank_chevron', new THREE.BoxGeometry(0.05, 0.14, 2.2), M.white, [0.9, 0.24, 0.4], [0, 0, 0.07]);
add('spine_fairing', new THREE.BoxGeometry(0.62, 0.3, 5.4), M.hullDark, [0, 0.5, 1.6]);
add('ventral_keel', new THREE.BoxGeometry(0.6, 0.26, 6.6), M.hullDark, [0, -0.48, 1.0]);
add('targeting_pod', new THREE.SphereGeometry(0.28, 20, 14), M.insert, [0, -0.58, -4.6], [0, 0, 0], [1, 0.8, 1.6]);
add('targeting_lens', new THREE.CircleGeometry(0.15, 20), M.accent, [0, -0.82, -4.7], [-Math.PI / 2, 0, 0]);

/* ---------- canopy: long dark teardrop ---------- */
add('canopy_glass', new THREE.SphereGeometry(1, 30, 20, 0, Math.PI * 2, 0, Math.PI / 2), M.glass, [0, 0.26, -3.6], [0, 0, 0], [0.52, 0.56, 2.1]);
add('canopy_frame', new THREE.TorusGeometry(1, 0.05, 8, 40), M.insert, [0, 0.25, -3.6], [Math.PI / 2, 0, 0], [0.54, 2.12, 1]);
add('canopy_spine', new THREE.BoxGeometry(0.07, 0.09, 4.0), M.insert, [0, 0.8, -3.6]);
add('hud_glow', new THREE.BoxGeometry(0.34, 0.02, 0.5), M.accent, [0, 0.5, -4.9]);
add('headrest', new THREE.BoxGeometry(0.42, 0.3, 0.3), M.insert, [0, 0.5, -1.7]);

/* ---------- wings: mid-set, sharply swept ---------- */
const wing = plate([[0.66, 2.2], [5.3, -1.6], [5.35, -2.6], [2.4, -3.6], [0.66, -3.9]], 0.2, 0.07);
wing.translate(0, -0.06, 1.5);
pair('wing', wing, M.hull, [0.3, 0, 0], [0, 0, -0.05]);

const wingChevron = plate([[1.5, 0.55], [4.7, -1.55], [4.75, -2.05], [1.5, -0.05]], 0.05, 0);
wingChevron.translate(0, 0.115, 1.5);
pair('wing_chevron', wingChevron, M.white, [0.3, 0, 0], [0, 0, -0.05]);

const wingInsert = plate([[1.3, -1.5], [3.4, -2.5], [3.4, -3.1], [1.3, -2.6]], 0.05, 0);
wingInsert.translate(0, 0.113, 1.5);
pair('wing_insert', wingInsert, M.insert, [0.3, 0, 0], [0, 0, -0.05]);
pair('wing_root_scoop', new THREE.BoxGeometry(0.6, 0.3, 1.4), M.insert, [1.0, -0.12, -1.0], [0, 0.1, 0]);

// wingtip missile spindles
pair('wingtip_pod', new THREE.CylinderGeometry(0.22, 0.22, 3.6, 16), M.hullDark, [5.3, -0.16, 0.4], [Math.PI / 2, 0, 0]);
pair('wingtip_pod_nose', new THREE.ConeGeometry(0.22, 1.5, 16), M.hull, [5.3, -0.16, -2.15], [-Math.PI / 2, 0, 0]);
pair('wingtip_pod_tail', new THREE.ConeGeometry(0.22, 0.9, 16), M.insert, [5.3, -0.16, 2.65], [Math.PI / 2, 0, 0]);
pair('wingtip_pod_band', new THREE.TorusGeometry(0.24, 0.04, 8, 20), M.accent, [5.3, -0.16, -0.9]);
pair('wingtip_pylon', new THREE.BoxGeometry(0.5, 0.16, 0.9), M.insert, [5.05, -0.08, 0.9]);

/* ---------- canards, high and forward ---------- */
const canard = plate([[0.5, 0.8], [2.5, -0.5], [2.5, -1.15], [0.5, -1.5]], 0.14, 0.04);
canard.translate(0, -0.06, -3.2);
pair('canard', canard, M.hullDark, [0.42, 0.2, 0], [0, 0, -0.16]);
pair('canard_chevron', plate([[1.0, 0.1], [2.2, -0.7], [2.2, -0.95], [1.0, -0.35]], 0.04, 0).translate(0, 0.09, -3.2), M.white, [0.42, 0.2, 0], [0, 0, -0.16]);

/* ---------- twin dorsal nacelles riding the aft hull ---------- */
const NX = 1.05, NY = 0.5, NZ = 3.5;
pair('nacelle', new THREE.CylinderGeometry(0.72, 0.68, 5.6, 26), M.hull, [NX, NY, NZ], [Math.PI / 2, 0, 0]);
pair('nacelle_shoulder', new THREE.SphereGeometry(0.72, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.hull, [NX, NY, NZ - 2.8], [-Math.PI / 2, 0, 0], [1, 1, 1.6]);
pair('nacelle_intake', new THREE.BoxGeometry(0.7, 0.42, 1.5), M.insert, [NX, NY + 0.42, NZ - 2.6], [0.12, 0, 0]);
pair('nacelle_dorsal_insert', new THREE.BoxGeometry(0.5, 0.06, 2.6), M.insert, [NX, NY + 0.7, NZ + 0.4]);
pair('nacelle_chevron', new THREE.BoxGeometry(0.1, 0.5, 1.4), M.white, [NX + 0.66, NY + 0.1, NZ - 1.0], [0, 0, 0], [1, 1, 1]);
pair('nozzle_housing', new THREE.CylinderGeometry(0.7, 0.6, 1.0, 26, 1, true), M.insert, [NX, NY, NZ + 3.1], [Math.PI / 2, 0, 0]);
pair('nozzle_ring', new THREE.TorusGeometry(0.62, 0.055, 10, 26), M.accent, [NX, NY, NZ + 2.6]);
pair('thruster_core', new THREE.CylinderGeometry(0.5, 0.5, 0.18, 24), M.glow, [NX, NY, NZ + 3.45], [Math.PI / 2, 0, 0]);
pair('nacelle_root_fairing', new THREE.BoxGeometry(0.5, 0.9, 4.4), M.hullDark, [NX - 0.5, NY - 0.4, NZ - 0.4]);

/* ---------- twin canted tail fins + ventral strakes ---------- */
const fin = finPlate([[0.8, 0], [-0.7, 2.5], [-1.5, 2.55], [-2.0, 0]], 0.12);
pair('tail_fin', fin, M.hull, [1.42, 0.85, 4.9], [0, 0, -0.26]);
pair('tail_fin_chevron', finPlate([[0.1, 0.4], [-0.6, 2.1], [-1.05, 2.1], [-0.5, 0.4]], 0.05, 0), M.white, [1.53, 0.85, 4.85], [0, 0, -0.26]);
pair('tail_fin_insert', finPlate([[-0.95, 0.25], [-1.3, 1.6], [-1.65, 1.6], [-1.7, 0.25]], 0.04, 0), M.insert, [1.54, 0.85, 4.85], [0, 0, -0.26]);
pair('ventral_strake', finPlate([[0.45, 0], [0.05, -0.95], [-0.7, -0.95], [-1.15, 0]], 0.09), M.hullDark, [0.95, -0.4, 5.2], [0, 0, 0.24]);

/* ---------- greebles ---------- */
for (let i = 0; i < 5; i++) {
  const z = -2.0 + i * 1.25;
  pair('panel_seam_' + i, new THREE.BoxGeometry(0.04, 0.16, 0.42), M.insert, [0.95, 0.22, z]);
}
add('rcs_block_dorsal', new THREE.BoxGeometry(0.62, 0.16, 0.4), M.insert, [0, 0.62, -1.0]);
pair('rcs_block_nose', new THREE.BoxGeometry(0.18, 0.24, 0.34), M.insert, [0.44, 0.04, -5.6]);
pair('avionics_blister', new THREE.SphereGeometry(0.2, 16, 12), M.hullDark, [0.6, 0.36, 1.2], [0, 0, 0], [1, 0.55, 1.8]);
add('drive_heat_ring', new THREE.TorusGeometry(0.66, 0.06, 10, 26), M.accent, [0, -0.1, 6.9]);
add('aft_drive_core', new THREE.CylinderGeometry(0.44, 0.44, 0.16, 22), M.glow, [0, -0.1, 7.05], [Math.PI / 2, 0, 0]);

/* ---------- ground, center, and scale to the 15.4 m spec length ---------- */
let box = new THREE.Box3().setFromObject(ship);
const len = box.max.z - box.min.z;
ship.scale.setScalar(15.4 / len);
ship.updateMatrixWorld(true);
box = new THREE.Box3().setFromObject(ship);
const c = box.getCenter(new THREE.Vector3());
ship.position.set(-c.x, -box.min.y, -c.z);

const root = new THREE.Group();
root.name = 'astra_interceptor_root';
root.add(ship);
stage.setObject(root);
