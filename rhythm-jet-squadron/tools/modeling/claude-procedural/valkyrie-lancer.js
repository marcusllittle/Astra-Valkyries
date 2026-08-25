import * as THREE from 'three';

const stage = document.querySelector('three-d-stage');
await stage.ready;

/* Palette off the key art: crimson hull, amber trim, black inserts. */
const M = {
  hull: new THREE.MeshStandardMaterial({ name: 'hull_crimson', color: 0xba242b, roughness: 0.36, metalness: 0.3 }),
  hullDark: new THREE.MeshStandardMaterial({ name: 'hull_oxblood', color: 0x6d1116, roughness: 0.46, metalness: 0.28 }),
  amber: new THREE.MeshStandardMaterial({ name: 'accent_amber', color: 0xf08221, roughness: 0.32, metalness: 0.25 }),
  insert: new THREE.MeshStandardMaterial({ name: 'panel_insert_black', color: 0x13161b, roughness: 0.58, metalness: 0.25 }),
  glass: new THREE.MeshStandardMaterial({ name: 'canopy_glass', color: 0x0d1520, roughness: 0.06, metalness: 0.35, transparent: true, opacity: 0.78 }),
  glow: new THREE.MeshStandardMaterial({ name: 'thruster_plasma', color: 0xffc27a, roughness: 0.5, metalness: 0, emissive: 0xff8a2b, emissiveIntensity: 2.4 })
};

const ship = new THREE.Group();
ship.name = 'valkyrie_lancer';

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

/* ---------- forward-weighted fuselage, heavy reactor midbody ---------- */
const prof = [[0.02, 0], [0.16, 1.2], [0.4, 2.8], [0.7, 4.4], [0.98, 6.2], [1.16, 8.2], [1.18, 10.4], [1.06, 12.4], [0.92, 14.2], [0.8, 16.2]];
const fuse = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 14);
fuse.rotateX(Math.PI / 2);
fuse.scale(1.1, 0.6, 1);
fuse.translate(0, 0, -8.6);
add('fuselage', fuse, M.hull);

add('nose_blade', new THREE.ConeGeometry(0.14, 1.8, 12), M.insert, [0, 0, -8.3], [-Math.PI / 2, 0, 0]);
pair('nose_chine', new THREE.BoxGeometry(0.07, 0.12, 5.0), M.hullDark, [0.42, -0.02, -5.6], [0, 0.06, 0]);
pair('flank_insert_fwd', new THREE.BoxGeometry(0.05, 0.62, 2.4), M.insert, [0.92, -0.04, -2.2]);
pair('flank_insert_aft', new THREE.BoxGeometry(0.05, 0.56, 2.6), M.insert, [1.2, -0.08, 3.0]);
pair('flank_amber_stripe', new THREE.BoxGeometry(0.05, 0.13, 3.0), M.amber, [1.02, 0.26, 0.4], [0, 0, 0.06]);

// reactor hump + heat stacks
add('reactor_hump', new THREE.SphereGeometry(1.05, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.hull, [0, 0.32, 1.4], [0, 0, 0], [1, 0.72, 2.6]);
add('reactor_cap', new THREE.BoxGeometry(0.9, 0.16, 3.6), M.insert, [0, 0.98, 1.4]);
pair('heat_stack', new THREE.BoxGeometry(0.34, 0.42, 1.5), M.insert, [0.62, 0.86, 3.4], [0.1, 0, 0]);
pair('heat_stack_rim', new THREE.BoxGeometry(0.4, 0.08, 0.3), M.amber, [0.62, 1.06, 4.1]);
add('ventral_keel', new THREE.BoxGeometry(0.8, 0.3, 8.0), M.hullDark, [0, -0.52, 0.8]);

/* ---------- canopy: small, set back behind the long nose ---------- */
add('canopy_glass', new THREE.SphereGeometry(1, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2), M.glass, [0, 0.24, -3.4], [0, 0, 0], [0.5, 0.54, 1.7]);
add('canopy_frame', new THREE.TorusGeometry(1, 0.05, 8, 36), M.insert, [0, 0.23, -3.4], [Math.PI / 2, 0, 0], [0.52, 1.72, 1]);
add('canopy_spine', new THREE.BoxGeometry(0.07, 0.09, 3.2), M.insert, [0, 0.74, -3.4]);
add('headrest', new THREE.BoxGeometry(0.44, 0.3, 0.32), M.insert, [0, 0.48, -1.8]);

/* ---------- oversized blended delta wing ---------- */
const wing = plate([[0.9, 5.6], [6.9, -1.4], [7.0, -3.0], [2.4, -5.2], [0.9, -5.6]], 0.24, 0.08);
wing.translate(0, -0.08, 1.4);
pair('wing', wing, M.hull, [0.3, 0, 0], [0, 0, -0.04]);

const wingEdge = plate([[1.2, 5.0], [6.7, -1.5], [6.6, -2.1], [1.2, 4.3]], 0.06, 0);
wingEdge.translate(0, 0.13, 1.4);
pair('wing_leading_amber', wingEdge, M.amber, [0.3, 0, 0], [0, 0, -0.04]);

const wingPanel = plate([[1.3, 4.4], [5.9, -1.0], [1.3, -1.9]], 0.06, 0);
wingPanel.translate(0, 0.128, 1.4);
pair('wing_amber_panel', wingPanel, M.amber, [0.3, 0, 0], [0, 0, -0.04]);

const wingInsert = plate([[1.7, -0.2], [4.4, -1.9], [4.4, -3.2], [1.7, -2.2]], 0.06, 0);
wingInsert.translate(0, 0.135, 1.4);
pair('wing_insert', wingInsert, M.insert, [0.3, 0, 0], [0, 0, -0.04]);

pair('wing_fence', new THREE.BoxGeometry(0.08, 0.5, 2.2), M.hullDark, [4.2, 0.2, -0.6], [0, 0.42, -0.04]);
pair('winglet', finPlate([[1.0, 0], [0.2, 1.9], [-0.6, 1.9], [-1.4, 0]], 0.12), M.hull, [6.6, 0.05, 1.0], [0, 0, -0.22]);
pair('winglet_amber', finPlate([[0.6, 0.3], [0.05, 1.6], [-0.35, 1.6], [-0.2, 0.3]], 0.05, 0), M.amber, [6.72, 0.05, 0.95], [0, 0, -0.22]);

/* ---------- side sponson engine pods ---------- */
const PX = 2.75, PY = -0.62, PZ = 3.4;
pair('sponson', new THREE.BoxGeometry(1.35, 1.15, 6.4), M.hull, [PX, PY, PZ], [0, 0, 0]);
pair('sponson_shoulder', new THREE.BoxGeometry(1.2, 0.9, 1.8), M.hullDark, [PX, PY + 0.1, PZ - 3.8], [0.12, 0, 0]);
pair('sponson_intake', new THREE.BoxGeometry(1.0, 0.62, 0.3), M.insert, [PX, PY + 0.1, PZ - 4.6], [0.12, 0, 0]);
pair('sponson_amber_band', new THREE.BoxGeometry(1.4, 0.16, 0.5), M.amber, [PX, PY + 0.5, PZ - 1.4]);
pair('sponson_insert', new THREE.BoxGeometry(0.06, 0.7, 3.2), M.insert, [PX + 0.69, PY, PZ + 0.4]);
pair('nozzle_housing', new THREE.CylinderGeometry(0.62, 0.54, 0.9, 24, 1, true), M.insert, [PX, PY, PZ + 3.4], [Math.PI / 2, 0, 0]);
pair('nozzle_ring', new THREE.TorusGeometry(0.6, 0.07, 10, 26), M.amber, [PX, PY, PZ + 2.95]);
pair('thruster_core', new THREE.CylinderGeometry(0.46, 0.46, 0.18, 22), M.glow, [PX, PY, PZ + 3.7], [Math.PI / 2, 0, 0]);
pair('sponson_pylon', new THREE.BoxGeometry(1.4, 0.7, 3.0), M.hullDark, [PX - 1.1, PY + 0.4, PZ - 0.4]);

/* ---------- main drive between the sponsons ---------- */
add('drive_housing', new THREE.CylinderGeometry(0.78, 0.86, 1.6, 24), M.hullDark, [0, -0.05, 6.7], [Math.PI / 2, 0, 0]);
add('drive_bell', new THREE.CylinderGeometry(0.86, 0.62, 1.1, 24, 1, true), M.insert, [0, -0.05, 7.8], [Math.PI / 2, 0, 0]);
add('drive_core', new THREE.CylinderGeometry(0.58, 0.58, 0.18, 24), M.glow, [0, -0.05, 8.15], [Math.PI / 2, 0, 0]);
add('drive_ring', new THREE.TorusGeometry(0.88, 0.07, 10, 26), M.amber, [0, -0.05, 6.0]);

/* ---------- canted twin fins + forward strakes ---------- */
pair('tail_fin', finPlate([[1.0, 0], [-0.6, 3.0], [-1.6, 3.05], [-2.4, 0]], 0.14), M.hull, [1.5, 0.7, 3.4], [0, 0, -0.24]);
pair('tail_fin_amber', finPlate([[0.5, 0.4], [-0.5, 2.6], [-1.0, 2.6], [-0.4, 0.4]], 0.05, 0), M.amber, [1.63, 0.7, 3.35], [0, 0, -0.24]);
pair('tail_fin_insert', finPlate([[-1.2, 0.3], [-1.6, 2.0], [-2.0, 2.0], [-2.1, 0.3]], 0.04, 0), M.insert, [1.64, 0.7, 3.35], [0, 0, -0.24]);
pair('ventral_strake', finPlate([[0.5, 0], [0.05, -1.1], [-0.8, -1.1], [-1.3, 0]], 0.1), M.hullDark, [1.1, -0.45, 5.0], [0, 0, 0.22]);

const strake = plate([[0.5, 0.9], [2.0, -0.3], [2.0, -0.85], [0.5, -1.3]], 0.14, 0.04);
strake.translate(0, -0.05, -4.4);
pair('forward_strake', strake, M.hullDark, [0.5, 0.14, 0], [0, 0, -0.12]);

/* ---------- greebles ---------- */
for (let i = 0; i < 5; i++) {
  pair('panel_seam_' + i, new THREE.BoxGeometry(0.04, 0.18, 0.44), M.insert, [1.02, 0.2, -1.6 + i * 1.2]);
}
add('rcs_block_dorsal', new THREE.BoxGeometry(0.66, 0.16, 0.42), M.insert, [0, 0.6, -1.1]);
pair('rcs_block_nose', new THREE.BoxGeometry(0.2, 0.26, 0.36), M.insert, [0.5, 0.02, -5.8]);
pair('avionics_blister', new THREE.SphereGeometry(0.22, 16, 12), M.hullDark, [0.66, 0.34, -0.6], [0, 0, 0], [1, 0.55, 1.8]);
add('targeting_pod', new THREE.SphereGeometry(0.3, 20, 14), M.insert, [0, -0.6, -4.8], [0, 0, 0], [1, 0.8, 1.6]);
add('targeting_lens', new THREE.CircleGeometry(0.16, 20), M.amber, [0, -0.86, -4.9], [-Math.PI / 2, 0, 0]);

/* ---------- ground, center, scale to spec length ---------- */
let box = new THREE.Box3().setFromObject(ship);
ship.scale.setScalar(18.2 / (box.max.z - box.min.z));
ship.updateMatrixWorld(true);
box = new THREE.Box3().setFromObject(ship);
const c = box.getCenter(new THREE.Vector3());
ship.position.set(-c.x, -box.min.y, -c.z);

const root = new THREE.Group();
root.name = 'valkyrie_lancer_root';
root.add(ship);
stage.setObject(root);
