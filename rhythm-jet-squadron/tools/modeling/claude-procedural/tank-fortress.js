import * as THREE from 'three';
import { kit, finish } from './lib/parts.js';

const stage = document.querySelector('three-d-stage');
await stage.ready;

/* Palette off enemy_tank_fortress.png: dark teal octagonal armour,
   near-black turret, pale cyan corner nodes. */
const M = {
  armour: new THREE.MeshStandardMaterial({ name: 'armour_teal', color: 0x2c4f56, roughness: 0.44, metalness: 0.3 }),
  armourDark: new THREE.MeshStandardMaterial({ name: 'armour_teal_shadow', color: 0x1a3238, roughness: 0.54, metalness: 0.3 }),
  bezel: new THREE.MeshStandardMaterial({ name: 'bezel_slate', color: 0x5d7d85, roughness: 0.35, metalness: 0.35 }),
  turret: new THREE.MeshStandardMaterial({ name: 'turret_black', color: 0x121a1d, roughness: 0.6, metalness: 0.25 }),
  node: new THREE.MeshStandardMaterial({ name: 'node_glow_cyan', color: 0xd6f6f6, roughness: 0.3, metalness: 0, emissive: 0x7fd6d6, emissiveIntensity: 1.9 }),
  barrel: new THREE.MeshStandardMaterial({ name: 'barrel_steel', color: 0x9fb4b8, roughness: 0.3, metalness: 0.4 })
};

const { group, add, pair } = kit('tank_fortress');

/* ---------- octagonal armour block, face toward -Z ---------- */
add('armour_block', new THREE.CylinderGeometry(5.0, 5.0, 4.2, 8), M.armour, [0, 0, 0], [Math.PI / 2, Math.PI / 8, 0]);
add('armour_face_plate', new THREE.CylinderGeometry(4.4, 4.4, 0.5, 8), M.armourDark, [0, 0, -2.3], [Math.PI / 2, Math.PI / 8, 0]);
add('armour_rim_front', new THREE.TorusGeometry(4.9, 0.28, 8, 8), M.bezel, [0, 0, -2.0], [0, 0, Math.PI / 8]);
add('armour_rim_back', new THREE.TorusGeometry(4.9, 0.24, 8, 8), M.armourDark, [0, 0, 2.0], [0, 0, Math.PI / 8]);
add('armour_backplate', new THREE.CylinderGeometry(4.6, 3.8, 1.4, 8), M.armourDark, [0, 0, 2.6], [Math.PI / 2, Math.PI / 8, 0]);

/* ---------- central turret and twin barrels ---------- */
add('turret_ball', new THREE.CylinderGeometry(2.1, 2.1, 1.6, 20), M.turret, [0, 0.2, -2.6], [Math.PI / 2, 0, 0]);
add('turret_shroud', new THREE.SphereGeometry(2.1, 24, 16), M.turret, [0, 0.2, -2.1], [0, 0, 0], [1, 1, 0.7]);
add('turret_ring', new THREE.TorusGeometry(2.3, 0.16, 8, 24), M.bezel, [0, 0.2, -2.0]);
pair('barrel', new THREE.CylinderGeometry(0.28, 0.28, 6.6, 14), M.barrel, [0.62, -0.4, -5.6], [Math.PI / 2, 0, 0]);
pair('barrel_shroud', new THREE.CylinderGeometry(0.38, 0.38, 1.4, 14), M.turret, [0.62, -0.4, -3.4], [Math.PI / 2, 0, 0]);
pair('muzzle_glow', new THREE.CylinderGeometry(0.34, 0.34, 0.3, 14), M.node, [0.62, -0.4, -8.9], [Math.PI / 2, 0, 0]);

/* ---------- corner nodes ---------- */
[[3.1, 3.1], [-3.1, 3.1], [3.1, -3.1], [-3.1, -3.1]].forEach(([x, y], i) => {
  add('node_housing_' + i, new THREE.CylinderGeometry(1.0, 1.1, 1.2, 12), M.armourDark, [x, y, -1.9], [Math.PI / 2, 0, 0]);
  add('node_lens_' + i, new THREE.SphereGeometry(0.72, 18, 14), M.node, [x, y, -2.5]);
});

/* ---------- dorsal mounts and greebles ---------- */
pair('dorsal_mount', new THREE.BoxGeometry(1.6, 1.6, 2.0), M.armourDark, [2.6, 4.4, -0.4]);
pair('dorsal_mount_cap', new THREE.BoxGeometry(1.8, 0.4, 2.2), M.bezel, [2.6, 5.3, -0.4]);
add('dorsal_vent', new THREE.BoxGeometry(2.4, 0.5, 1.6), M.node, [0, 4.9, 0.4]);
add('ventral_skirt', new THREE.CylinderGeometry(3.6, 4.2, 1.0, 8), M.armourDark, [0, -4.4, 0.2], [Math.PI / 2, Math.PI / 8, 0]);
for (let i = 0; i < 6; i++) {
  const a = (i / 6) * Math.PI * 2;
  add('face_greeble_' + i, new THREE.BoxGeometry(0.8 + (i % 3) * 0.5, 0.7, 0.4), M.armourDark, [Math.cos(a) * 3.4, Math.sin(a) * 3.4, -2.6], [0, 0, a]);
}
pair('flank_insert', new THREE.BoxGeometry(0.3, 2.2, 2.6), M.armourDark, [4.8, 0, 0.2]);
add('aft_thruster_hub', new THREE.CylinderGeometry(1.5, 1.2, 1.6, 16), M.armourDark, [0, 0, 3.6], [Math.PI / 2, 0, 0]);
add('aft_thruster_glow', new THREE.CylinderGeometry(1.0, 1.0, 0.3, 16), M.node, [0, 0, 4.5], [Math.PI / 2, 0, 0]);

finish(stage, group, 14, 'tank_fortress_root');
