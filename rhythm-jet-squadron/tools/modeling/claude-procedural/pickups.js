import * as THREE from 'three';
import { finish } from './lib/parts.js';

const stage = document.querySelector('three-d-stage');
await stage.ready;

/* Palette off power_chip.png and pulse_ring.png: brushed gold chip with
   an orbit ring, and a cold white pulse ring. */
const M = {
  gold: new THREE.MeshStandardMaterial({ name: 'chip_gold', color: 0xd8bd72, roughness: 0.3, metalness: 0.4 }),
  goldDark: new THREE.MeshStandardMaterial({ name: 'chip_gold_shadow', color: 0xa88f45, roughness: 0.4, metalness: 0.38 }),
  goldGlow: new THREE.MeshStandardMaterial({ name: 'chip_core_glow', color: 0xfff2cd, roughness: 0.35, metalness: 0, emissive: 0xffd98a, emissiveIntensity: 1.9 }),
  ring: new THREE.MeshStandardMaterial({ name: 'pulse_ring_white', color: 0xf4f7ff, roughness: 0.24, metalness: 0.15, emissive: 0xc9d8ff, emissiveIntensity: 1.4 }),
  ringStud: new THREE.MeshStandardMaterial({ name: 'pulse_ring_stud', color: 0xb9c4d6, roughness: 0.35, metalness: 0.3 })
};

const pickups = new THREE.Group();
pickups.name = 'pickups';

function unit(name, x, z) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, 0, z);
  pickups.add(g);
  const add = (n, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale) => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name + '_' + n;
    m.position.set(...pos);
    m.rotation.set(...rot);
    if (scale) m.scale.set(...scale);
    g.add(m);
    return m;
  };
  return { g, add };
}

/* ---------- power chip: hex nut plate with orbit ring ---------- */
{
  const { g, add } = unit('power_chip', -2.6, 0);
  add('chip_plate', new THREE.CylinderGeometry(1.5, 1.5, 0.42, 6), M.gold, [0, 1.5, 0]);
  add('chip_plate_under', new THREE.CylinderGeometry(1.35, 1.2, 0.3, 6), M.goldDark, [0, 1.24, 0]);
  add('chip_bezel', new THREE.TorusGeometry(1.42, 0.1, 8, 6), M.goldDark, [0, 1.72, 0], [Math.PI / 2, 0, 0]);
  add('chip_core', new THREE.CylinderGeometry(0.72, 0.72, 0.5, 20), M.goldGlow, [0, 1.56, 0]);
  add('chip_core_rim', new THREE.TorusGeometry(0.74, 0.09, 8, 22), M.gold, [0, 1.78, 0], [Math.PI / 2, 0, 0]);
  add('orbit_ring', new THREE.TorusGeometry(1.95, 0.09, 10, 40), M.gold, [0, 1.5, 0], [0.5, 0.35, 0]);
  add('orbit_ring_inner', new THREE.TorusGeometry(1.7, 0.06, 8, 36), M.goldDark, [0, 1.5, 0], [-0.4, -0.3, 0]);
  g.rotation.y = 0.4;
  g.rotation.z = 0.2;
}

/* ---------- pulse ring ---------- */
{
  const { add } = unit('pulse_ring', 2.8, 0);
  add('ring_band', new THREE.TorusGeometry(2.0, 0.26, 18, 48), M.ring, [0, 2.1, 0], [Math.PI / 2, 0, 0]);
  add('ring_inner_lip', new THREE.TorusGeometry(1.72, 0.1, 12, 40), M.ringStud, [0, 2.1, 0], [Math.PI / 2, 0, 0]);
  add('ring_outer_lip', new THREE.TorusGeometry(2.24, 0.08, 12, 44), M.ringStud, [0, 2.1, 0], [Math.PI / 2, 0, 0]);
  const stud = new THREE.BoxGeometry(0.4, 0.16, 0.3).translate(2.45, 0, 0);
  for (let i = 0; i < 8; i++) {
    add('stud_' + i, stud, M.ringStud, [0, 2.1, 0], [Math.PI / 2, 0, (i / 8) * Math.PI * 2]);
  }
}

finish(stage, pickups, null, 'pickups_root');
