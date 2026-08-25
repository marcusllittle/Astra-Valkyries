import * as THREE from 'three';
import { kit, finish } from './lib/parts.js';

const stage = document.querySelector('three-d-stage');
await stage.ready;

/* Palette off boss_cryo_leviathan.png: faceted steel-blue carapace,
   pale translucent ice spikes, frost-white nodes. */
const M = {
  carapace: new THREE.MeshStandardMaterial({ name: 'carapace_steel_blue', color: 0x3e78a6, roughness: 0.35, metalness: 0.25, flatShading: true }),
  carapaceDark: new THREE.MeshStandardMaterial({ name: 'carapace_deep_blue', color: 0x21496f, roughness: 0.45, metalness: 0.25, flatShading: true }),
  ice: new THREE.MeshStandardMaterial({ name: 'ice_spike', color: 0xcfe4f2, roughness: 0.16, metalness: 0.1, transparent: true, opacity: 0.82, flatShading: true }),
  frost: new THREE.MeshStandardMaterial({ name: 'frost_node', color: 0xeff7fd, roughness: 0.3, metalness: 0.05, emissive: 0x6fa8d0, emissiveIntensity: 0.5 }),
  chitin: new THREE.MeshStandardMaterial({ name: 'chitin_plate', color: 0x8fb8d4, roughness: 0.3, metalness: 0.2, flatShading: true })
};

const { group, add, pair } = kit('cryo_leviathan');

/* ---------- segmented body: head at -Z, tail at +Z ---------- */
const segs = [
  { z: -13.0, r: 3.4, y: 0.0 },
  { z: -8.0, r: 4.1, y: 0.1 },
  { z: -3.0, r: 4.6, y: 0.15 },
  { z: 2.2, r: 4.4, y: 0.1 },
  { z: 7.2, r: 3.8, y: 0.0 },
  { z: 11.6, r: 2.9, y: -0.1 }
];
segs.forEach((s, i) => {
  add('body_segment_' + i, new THREE.IcosahedronGeometry(s.r, 1), M.carapace, [0, s.y, s.z], [0, i * 0.3, 0], [1, 0.86, 1.18]);
  add('segment_collar_' + i, new THREE.TorusGeometry(s.r * 0.86, 0.34, 8, 14), M.carapaceDark, [0, s.y, s.z + s.r * 0.9]);
  add('segment_node_' + i, new THREE.SphereGeometry(0.62, 16, 12), M.frost, [0, s.y + s.r * 0.82, s.z]);
  // dorsal spike pairs
  pair('segment_spike_' + i, new THREE.ConeGeometry(0.62, 3.4, 7), M.ice, [s.r * 0.62, s.y + s.r * 0.66, s.z - 0.4], [-0.5, 0, -0.7]);
  pair('segment_plate_' + i, new THREE.BoxGeometry(2.4, 0.5, 3.0), M.chitin, [s.r * 0.66, s.y + 0.2, s.z], [0, 0, -0.45]);
});

/* ---------- head ---------- */
add('head', new THREE.IcosahedronGeometry(3.9, 1), M.carapace, [0, 0, -17.6], [0, 0.4, 0], [1.0, 0.82, 1.3]);
add('head_crest', new THREE.IcosahedronGeometry(1.9, 1), M.carapaceDark, [0, 2.4, -17.0], [0, 0.2, 0], [1, 0.7, 1.6]);
add('head_core_node', new THREE.SphereGeometry(1.15, 20, 14), M.frost, [0, 1.4, -19.4]);
pair('head_eye_node', new THREE.SphereGeometry(0.62, 16, 12), M.frost, [1.9, 0.1, -20.0]);
pair('mandible', new THREE.ConeGeometry(0.9, 5.2, 8), M.ice, [1.5, -0.9, -22.6], [-Math.PI / 2 + 0.16, 0, 0.12]);
pair('head_horn', new THREE.ConeGeometry(0.72, 4.6, 8), M.ice, [2.3, 1.5, -16.6], [-0.9, 0, -0.5]);

/* ---------- arms: segmented limbs sweeping outward ---------- */
function arm(side) {
  const s = side;
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const x = s * (5.0 + t * 9.2);
    const y = 0.5 + Math.sin(t * Math.PI) * 1.3;
    const z = -3.0 - t * 3.6;
    const r = 2.0 - t * 0.9;
    add('arm_seg_' + (s > 0 ? 'stbd_' : 'port_') + i, new THREE.IcosahedronGeometry(r, 1), M.carapace, [x, y, z], [0, i * 0.4, 0], [1.15, 0.9, 1.0]);
    add('arm_frost_' + (s > 0 ? 'stbd_' : 'port_') + i, new THREE.SphereGeometry(r * 0.42, 14, 10), M.frost, [x, y + r * 0.55, z + 0.2]);
    add('arm_spike_' + (s > 0 ? 'stbd_' : 'port_') + i, new THREE.ConeGeometry(0.5, 2.6, 7), M.ice, [x, y + r * 0.4, z - 1.0], [-1.1, 0, s * -0.4]);
  }
  add('arm_claw_' + (s > 0 ? 'stbd' : 'port'), new THREE.ConeGeometry(1.5, 6.4, 8), M.ice, [s * 16.6, 1.0, -7.6], [-0.5, 0, s * -1.15]);
  add('arm_claw_spur_' + (s > 0 ? 'stbd' : 'port'), new THREE.ConeGeometry(0.8, 3.4, 7), M.ice, [s * 15.0, 2.0, -6.0], [-0.8, 0, s * -1.4]);
}
arm(1);
arm(-1);

/* ---------- abdomen and tail thrusters ---------- */
add('abdomen', new THREE.IcosahedronGeometry(4.6, 1), M.carapace, [0, -0.2, 15.6], [0, 0.6, 0], [1, 0.9, 1.25]);
add('abdomen_node', new THREE.SphereGeometry(1.3, 20, 14), M.frost, [0, 2.4, 14.4]);
pair('abdomen_node_small', new THREE.SphereGeometry(0.7, 16, 12), M.frost, [1.8, 0.4, 18.6]);
pair('abdomen_fin', new THREE.ConeGeometry(1.1, 6.0, 8), M.ice, [2.6, 1.6, 12.4], [1.0, 0, 0.5]);
pair('tail_spur', new THREE.ConeGeometry(0.8, 4.4, 8), M.carapaceDark, [1.5, -1.2, 20.6], [Math.PI / 2 - 0.2, 0, 0]);
add('thorax_collar', new THREE.TorusGeometry(3.6, 0.5, 8, 14), M.carapaceDark, [0, 0, 13.0]);

finish(stage, group, 46, 'cryo_leviathan_root');
