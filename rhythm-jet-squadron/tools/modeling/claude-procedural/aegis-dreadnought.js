import * as THREE from 'three';
import { kit, plate, finPlate, finish } from './lib/parts.js';

const stage = document.querySelector('three-d-stage');
await stage.ready;

/* Palette off boss_aegis_dreadnought.png: violet armour, dark plum plating,
   blush-white core, amber muzzle glow. */
const AMBER_GLOW = 0xFFA96A;
const M = {
  hull: new THREE.MeshStandardMaterial({ name: 'hull_violet', color: 0x7b6da4, roughness: 0.42, metalness: 0.3 }),
  hullDark: new THREE.MeshStandardMaterial({ name: 'hull_plum', color: 0x3d3555, roughness: 0.52, metalness: 0.3 }),
  hullLight: new THREE.MeshStandardMaterial({ name: 'hull_lilac_plate', color: 0x9b8fc0, roughness: 0.38, metalness: 0.26 }),
  insert: new THREE.MeshStandardMaterial({ name: 'panel_insert_dark', color: 0x241f33, roughness: 0.6, metalness: 0.22 }),
  core: new THREE.MeshStandardMaterial({ name: 'core_plasma', color: 0xffe2ea, roughness: 0.4, metalness: 0, emissive: 0xff9fc0, emissiveIntensity: 2.2 }),
  muzzle: new THREE.MeshStandardMaterial({ name: 'muzzle_glow_amber', color: 0xffd9b0, roughness: 0.45, metalness: 0, emissive: AMBER_GLOW, emissiveIntensity: 1.8 })
};

const { group, add, pair } = kit('aegis_dreadnought');

/* ---------- central spine hull ---------- */
add('spine_hull', new THREE.CylinderGeometry(2.6, 3.0, 26, 8), M.hull, [0, 0, 1.0], [Math.PI / 2, Math.PI / 8, 0], [1, 1, 0.62]);
add('spine_prow', new THREE.CylinderGeometry(1.2, 2.6, 8, 8), M.hull, [0, 0, -16.0], [Math.PI / 2, Math.PI / 8, 0], [1, 1, 0.62]);
add('prow_blade', new THREE.ConeGeometry(1.25, 7.0, 8), M.hullDark, [0, 0, -23.0], [-Math.PI / 2, 0, 0], [1, 0.62, 1]);
add('prow_edge', new THREE.ConeGeometry(0.75, 5.0, 8), M.insert, [0, 0, -25.0], [-Math.PI / 2, 0, 0], [1, 0.5, 1]);
add('dorsal_deck_fwd', new THREE.BoxGeometry(4.4, 0.7, 7.0), M.hullLight, [0, 1.5, -9.5]);
add('dorsal_deck_fwd_insert', new THREE.BoxGeometry(2.4, 0.16, 4.6), M.insert, [0, 1.88, -9.5]);
add('dorsal_deck_aft', new THREE.BoxGeometry(4.4, 0.7, 8.0), M.hullLight, [0, 1.5, 7.4]);
add('dorsal_deck_aft_insert', new THREE.BoxGeometry(2.4, 0.16, 5.4), M.insert, [0, 1.88, 7.4]);
add('ventral_deck', new THREE.BoxGeometry(4.0, 0.6, 15), M.hullDark, [0, -1.5, 2.0]);

/* ---------- bridge blister ---------- */
add('bridge_dome', new THREE.SphereGeometry(1.5, 20, 14), M.hullLight, [0, 1.5, -7.5], [0, 0, 0], [1, 0.75, 1.5]);
add('bridge_visor', new THREE.SphereGeometry(1.5, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2.4), M.insert, [0, 1.62, -7.9], [-0.25, 0, 0], [0.92, 0.7, 1.35]);

/* ---------- glowing core well ---------- */
add('core_ring', new THREE.CylinderGeometry(5.4, 5.4, 2.4, 8), M.hullDark, [0, 0.2, -1.0], [0, Math.PI / 8, 0]);
add('core_ring_lip', new THREE.TorusGeometry(5.2, 0.28, 8, 8), M.hullLight, [0, 1.35, -1.0], [Math.PI / 2, 0, Math.PI / 8]);
add('core_plasma', new THREE.CylinderGeometry(4.4, 4.4, 0.5, 8), M.core, [0, 1.5, -1.0], [0, Math.PI / 8, 0]);
add('core_plasma_under', new THREE.CylinderGeometry(4.0, 4.0, 0.4, 8), M.core, [0, -1.0, -1.0], [0, Math.PI / 8, 0]);

/* ---------- shoulder slabs (aft wings) ---------- */
const slab = plate([[2.6, 3.6], [12.4, 5.2], [12.4, -5.0], [2.6, -6.4]], 1.5, 0.2);
slab.translate(0, -0.75, 6.0);
pair('shoulder_slab', slab, M.hull, [0, 0.6, 0], [0, 0, -0.06]);
pair('shoulder_slab_top_insert', new THREE.BoxGeometry(6.6, 0.2, 1.5), M.hullLight, [7.4, 1.45, 3.4], [0, 0.14, 0]);
pair('shoulder_slab_bar', new THREE.BoxGeometry(5.4, 0.24, 1.1), M.hullLight, [7.0, 1.45, 8.4], [0, 0.1, 0]);
pair('shoulder_slab_edge', new THREE.BoxGeometry(0.5, 1.7, 9.6), M.hullDark, [12.3, 0.6, 6.2], [0, 0.06, 0]);

/* ---------- mid weapon barbettes ---------- */
const barb = plate([[3.0, 3.0], [9.6, 2.2], [9.6, -4.6], [3.0, -4.2]], 1.9, 0.18);
barb.translate(0, -0.95, -3.0);
pair('barbette', barb, M.hullLight, [0.4, -0.2, 0], [0, 0, -0.05]);
pair('barbette_insert', new THREE.BoxGeometry(4.4, 0.2, 2.0), M.insert, [6.6, 0.72, -4.6], [0, 0.06, 0]);
pair('barbette_turret_base', new THREE.CylinderGeometry(1.9, 2.1, 1.3, 8), M.hullDark, [6.6, 1.1, -2.4]);
pair('barbette_turret_cap', new THREE.CylinderGeometry(1.5, 1.9, 0.5, 8), M.insert, [6.6, 1.8, -2.4]);
pair('barbette_barrel', new THREE.CylinderGeometry(0.2, 0.2, 5.6, 12), M.hullLight, [6.2, 1.2, -5.4], [Math.PI / 2, 0, 0]);
pair('barbette_muzzle', new THREE.CylinderGeometry(0.28, 0.28, 0.5, 12), M.muzzle, [6.2, 1.2, -8.3], [Math.PI / 2, 0, 0]);

/* ---------- flanking gun pods around the core ---------- */
function gunPod(n, x, z) {
  pair(n + '_base', new THREE.CylinderGeometry(1.5, 1.7, 1.2, 8), M.hullDark, [x, 1.2, z]);
  pair(n + '_cap', new THREE.CylinderGeometry(1.15, 1.5, 0.45, 8), M.insert, [x, 1.85, z]);
  pair(n + '_barrel_a', new THREE.CylinderGeometry(0.16, 0.16, 5.0, 10), M.hullLight, [x - 0.35, 1.2, z - 3.0], [Math.PI / 2, 0, 0]);
  pair(n + '_barrel_b', new THREE.CylinderGeometry(0.16, 0.16, 5.0, 10), M.hullLight, [x + 0.35, 1.2, z - 3.0], [Math.PI / 2, 0, 0]);
  pair(n + '_muzzle_a', new THREE.CylinderGeometry(0.24, 0.24, 0.45, 10), M.muzzle, [x - 0.35, 1.2, z - 5.6], [Math.PI / 2, 0, 0]);
  pair(n + '_muzzle_b', new THREE.CylinderGeometry(0.24, 0.24, 0.45, 10), M.muzzle, [x + 0.35, 1.2, z - 5.6], [Math.PI / 2, 0, 0]);
}
gunPod('fore_pod', 3.1, -4.6);
gunPod('aft_pod', 3.3, 5.6);

/* ---------- engine block bank ---------- */
[-4.4, -1.5, 1.5, 4.4].forEach((x, i) => {
  add('engine_block_' + i, new THREE.BoxGeometry(2.3, 2.5, 5.2), M.hullDark, [x, 0.3, 14.2]);
  add('engine_block_cowl_' + i, new THREE.BoxGeometry(2.5, 0.5, 3.0), M.hullLight, [x, 1.6, 14.6]);
  add('engine_glow_' + i, new THREE.BoxGeometry(1.7, 1.9, 0.4), M.muzzle, [x, 0.3, 16.9]);
  add('engine_insert_' + i, new THREE.BoxGeometry(0.35, 2.2, 4.4), M.insert, [x + 1.1, 0.3, 14.2]);
});

/* ---------- greebles: hull clutter blocks ---------- */
for (let i = 0; i < 7; i++) {
  const z = -9 + i * 3.1;
  pair('hull_greeble_' + i, new THREE.BoxGeometry(0.9 + (i % 3) * 0.4, 0.4, 1.4), M.hullDark, [2.3 + (i % 2) * 0.5, 1.5, z]);
}
pair('flank_rib', new THREE.BoxGeometry(0.4, 1.6, 8.0), M.hullDark, [2.9, 0, 2.0]);
add('aft_spine_block', new THREE.BoxGeometry(3.4, 1.6, 3.2), M.hullLight, [0, 1.3, 11.4]);
add('aft_spine_insert', new THREE.BoxGeometry(1.6, 0.2, 2.2), M.insert, [0, 2.15, 11.4]);

finish(stage, group, 62, 'aegis_dreadnought_root');
