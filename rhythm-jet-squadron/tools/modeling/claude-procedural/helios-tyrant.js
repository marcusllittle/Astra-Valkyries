import * as THREE from 'three';
import { kit, finish } from './lib/parts.js';

const stage = document.querySelector('three-d-stage');
await stage.ready;

/* Palette off boss_helios_tyrant.png: copper radial arms, burnt-brown
   armour ring, blinding cream core. */
const M = {
  copper: new THREE.MeshStandardMaterial({ name: 'arm_copper', color: 0xb9773f, roughness: 0.4, metalness: 0.35 }),
  copperDark: new THREE.MeshStandardMaterial({ name: 'arm_copper_shadow', color: 0x7d4a25, roughness: 0.5, metalness: 0.3 }),
  shell: new THREE.MeshStandardMaterial({ name: 'shell_burnt_brown', color: 0x4e2e1e, roughness: 0.55, metalness: 0.3 }),
  shellRim: new THREE.MeshStandardMaterial({ name: 'shell_rim_copper', color: 0xd08a4a, roughness: 0.32, metalness: 0.42 }),
  insert: new THREE.MeshStandardMaterial({ name: 'panel_insert_dark', color: 0x241610, roughness: 0.6, metalness: 0.2 }),
  core: new THREE.MeshStandardMaterial({ name: 'core_solar', color: 0xfff3d2, roughness: 0.4, metalness: 0, emissive: 0xffd08a, emissiveIntensity: 2.6 }),
  vent: new THREE.MeshStandardMaterial({ name: 'vent_glow_rose', color: 0xffd0cc, roughness: 0.45, metalness: 0, emissive: 0xff8d84, emissiveIntensity: 1.8 })
};

const { group, add, pair } = kit('helios_tyrant');

/* ---------- faceted drum hull, face toward -Z ---------- */
add('shell_drum', new THREE.CylinderGeometry(9.2, 9.2, 6.6, 12), M.shell, [0, 0, 0.6], [Math.PI / 2, 0, 0]);
add('shell_rim_front', new THREE.TorusGeometry(9.0, 0.62, 10, 12), M.shellRim, [0, 0, -2.7]);
add('shell_rim_back', new THREE.TorusGeometry(8.9, 0.5, 10, 12), M.copperDark, [0, 0, 3.9]);
add('shell_backplate', new THREE.CylinderGeometry(8.6, 7.4, 2.2, 12), M.copperDark, [0, 0, 4.9], [Math.PI / 2, 0, 0]);

/* ---------- core well ---------- */
add('core_throat', new THREE.CylinderGeometry(7.0, 5.6, 3.2, 12, 1, true), M.insert, [0, 0, -1.6], [Math.PI / 2, 0, 0]);
add('core_bezel', new THREE.TorusGeometry(6.9, 0.4, 10, 12), M.shellRim, [0, 0, -3.0]);
add('core_iris', new THREE.CylinderGeometry(6.0, 6.0, 0.5, 12), M.core, [0, 0, -2.2], [Math.PI / 2, 0, 0]);
add('core_lens', new THREE.SphereGeometry(5.6, 26, 18), M.core, [0, 0, 0.2], [0, 0, 0], [1, 1, 0.45]);

/* ---------- radial arms ---------- */
const ARMS = 8;
const armGeo = new THREE.BoxGeometry(11.0, 1.5, 1.8).translate(13.6, 0, 0);
const shoeGeo = new THREE.BoxGeometry(1.6, 2.0, 2.2).translate(19.6, 0, 0);
const collarGeo = new THREE.BoxGeometry(2.6, 2.2, 2.4).translate(8.6, 0, 0);
const ventGeo = new THREE.BoxGeometry(0.5, 0.9, 0.9).translate(20.6, 0, 0);
for (let i = 0; i < ARMS; i++) {
  const a = (i / ARMS) * Math.PI * 2 + Math.PI / 8;
  add('radial_arm_' + i, armGeo, M.copper, [0, 0, -0.4], [0, 0, a]);
  add('radial_arm_shoe_' + i, shoeGeo, M.copperDark, [0, 0, -0.4], [0, 0, a]);
  add('arm_root_collar_' + i, collarGeo, M.shell, [0, 0, -0.4], [0, 0, a]);
  add('arm_vent_' + i, ventGeo, M.vent, [0, 0, -0.4], [0, 0, a]);
}

/* ---------- armour studs around the drum ---------- */
for (let i = 0; i < 12; i++) {
  const a = (i / 12) * Math.PI * 2;
  const stud = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 1.0), M.insert);
  stud.name = 'armour_stud_' + i;
  stud.position.set(Math.cos(a) * 8.7, Math.sin(a) * 8.7, -2.0);
  stud.rotation.z = a;
  group.add(stud);
  const plateGreeble = new THREE.Mesh(new THREE.BoxGeometry(1.1 + (i % 3) * 0.5, 0.9, 0.4), M.copperDark);
  plateGreeble.name = 'shell_greeble_' + i;
  plateGreeble.position.set(Math.cos(a) * 7.2, Math.sin(a) * 7.2, -2.9);
  plateGreeble.rotation.z = a;
  group.add(plateGreeble);
}

/* ---------- twin descending prongs with plasma tips ---------- */
pair('prong', new THREE.BoxGeometry(1.3, 12.5, 1.3), M.insert, [3.2, -11.0, 0.2]);
pair('prong_channel', new THREE.BoxGeometry(0.5, 12.0, 0.4), M.copperDark, [3.2, -11.0, -0.5]);
pair('prong_shoulder', new THREE.BoxGeometry(1.8, 2.2, 1.8), M.copper, [3.2, -4.6, 0.2]);
pair('prong_tip', new THREE.ConeGeometry(0.7, 2.4, 10), M.vent, [3.2, -18.2, 0.2], [Math.PI, 0, 0]);
pair('prong_brace', new THREE.BoxGeometry(2.6, 0.9, 1.1), M.copperDark, [2.2, -6.6, 0.2]);

/* ---------- aft thruster cluster ---------- */
add('aft_hub', new THREE.CylinderGeometry(3.4, 2.8, 2.6, 12), M.shell, [0, 0, 6.6], [Math.PI / 2, 0, 0]);
add('aft_hub_glow', new THREE.CylinderGeometry(2.2, 2.2, 0.4, 12), M.vent, [0, 0, 7.9], [Math.PI / 2, 0, 0]);
pair('aft_thruster', new THREE.CylinderGeometry(0.9, 0.75, 2.2, 12), M.copperDark, [4.4, 0, 6.2], [Math.PI / 2, 0, 0]);
pair('aft_thruster_glow', new THREE.CylinderGeometry(0.62, 0.62, 0.3, 12), M.vent, [4.4, 0, 7.4], [Math.PI / 2, 0, 0]);

finish(stage, group, 34, 'helios_tyrant_root');
