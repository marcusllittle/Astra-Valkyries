import * as THREE from 'three';
import { finish } from './lib/parts.js';

const stage = document.querySelector('three-d-stage');
await stage.ready;

/* One material set shared by the whole squadron, colours read off the
   enemy sprite sheet. */
const M = {
  magenta: new THREE.MeshStandardMaterial({ name: 'shell_magenta', color: 0x7d2244, roughness: 0.4, metalness: 0.3 }),
  indigo: new THREE.MeshStandardMaterial({ name: 'shell_indigo', color: 0x39337f, roughness: 0.4, metalness: 0.3 }),
  amber: new THREE.MeshStandardMaterial({ name: 'shell_amber', color: 0xc07a2c, roughness: 0.4, metalness: 0.3 }),
  crimson: new THREE.MeshStandardMaterial({ name: 'shell_crimson', color: 0x992026, roughness: 0.42, metalness: 0.3 }),
  copper: new THREE.MeshStandardMaterial({ name: 'shell_copper', color: 0xa9662f, roughness: 0.42, metalness: 0.32 }),
  ice: new THREE.MeshStandardMaterial({ name: 'shell_pale_blue', color: 0x9cc4de, roughness: 0.32, metalness: 0.25 }),
  green: new THREE.MeshStandardMaterial({ name: 'shell_green', color: 0x1f7a42, roughness: 0.4, metalness: 0.3 }),
  grey: new THREE.MeshStandardMaterial({ name: 'shell_grey', color: 0x8d959c, roughness: 0.4, metalness: 0.3 }),
  violet: new THREE.MeshStandardMaterial({ name: 'shell_violet', color: 0x5b4a7a, roughness: 0.45, metalness: 0.3 }),
  dark: new THREE.MeshStandardMaterial({ name: 'plate_dark', color: 0x191b22, roughness: 0.58, metalness: 0.25 }),
  coreWarm: new THREE.MeshStandardMaterial({ name: 'core_glow_warm', color: 0xffe0d2, roughness: 0.4, metalness: 0, emissive: 0xffb0a0, emissiveIntensity: 1.9 }),
  coreCool: new THREE.MeshStandardMaterial({ name: 'core_glow_cool', color: 0xdfeaff, roughness: 0.4, metalness: 0, emissive: 0x9fc0ff, emissiveIntensity: 1.9 })
};

const fleet = new THREE.Group();
fleet.name = 'void_collective_squadron';

function unit(name, x, z) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, 0, z);
  fleet.add(g);
  const add = (n, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale) => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name + '_' + n;
    m.position.set(...pos);
    m.rotation.set(...rot);
    if (scale) m.scale.set(...scale);
    g.add(m);
    return m;
  };
  const pair = (n, geo, mat, pos, rot = [0, 0, 0], scale = [1, 1, 1]) => {
    add(n + '_stbd', geo, mat, pos, rot, scale);
    add(n + '_port', geo, mat, [-pos[0], pos[1], pos[2]], [rot[0], -rot[1], -rot[2]], [-scale[0], scale[1], scale[2]]);
  };
  return { g, add, pair };
}

/* ---------- hex-plate drones: drifter and sine ---------- */
function hexDrone(name, x, z, shell, core) {
  const { add, pair } = unit(name, x, z);
  add('hex_shell', new THREE.CylinderGeometry(2.0, 2.0, 0.9, 6), shell, [0, 0.9, 0], [Math.PI / 2, 0, 0]);
  add('hex_bezel', new THREE.TorusGeometry(1.85, 0.16, 8, 6), shell, [0, 0.9, -0.5]);
  add('core_lens', new THREE.CylinderGeometry(1.0, 1.0, 0.3, 20), core, [0, 0.9, -0.55], [Math.PI / 2, 0, 0]);
  add('core_bulb', new THREE.SphereGeometry(0.9, 20, 14), core, [0, 0.9, -0.1], [0, 0, 0], [1, 1, 0.6]);
  pair('flank_plate', new THREE.BoxGeometry(0.34, 1.7, 1.0), shell, [1.75, 0.9, 0.1], [0, 0, -0.15]);
  pair('shoulder_vane', new THREE.BoxGeometry(0.3, 0.9, 1.6), M.dark, [1.4, 1.9, 0.4], [0.3, 0, -0.35]);
  pair('foot_block', new THREE.BoxGeometry(0.55, 0.5, 0.6), M.dark, [0.95, -0.1, 0.2]);
  pair('tip_flare', new THREE.BoxGeometry(0.22, 0.7, 0.22), core, [1.9, 2.6, 0.6], [0.35, 0, -0.4]);
  add('aft_thruster', new THREE.CylinderGeometry(0.42, 0.34, 0.5, 12), M.dark, [0, 0.9, 1.0], [Math.PI / 2, 0, 0]);
  add('aft_glow', new THREE.CylinderGeometry(0.3, 0.3, 0.14, 12), core, [0, 0.9, 1.3], [Math.PI / 2, 0, 0]);
}
hexDrone('enemy_drifter', -14, -5, M.magenta, M.coreWarm);
hexDrone('enemy_sine', -7, -5, M.indigo, M.coreCool);

/* ---------- zigzag: amber arrow ---------- */
{
  const { add, pair } = unit('enemy_zigzag', 0, -5);
  add('spine', new THREE.CylinderGeometry(0.34, 0.5, 3.2, 8), M.amber, [0, 1.0, -0.4], [Math.PI / 2, 0, 0]);
  add('nose_spike', new THREE.ConeGeometry(0.4, 2.6, 8), M.amber, [0, 1.0, -3.2], [-Math.PI / 2, 0, 0]);
  add('nose_tip', new THREE.ConeGeometry(0.16, 0.9, 8), M.dark, [0, 1.0, -4.7], [-Math.PI / 2, 0, 0]);
  add('core_bulb', new THREE.SphereGeometry(0.55, 18, 14), M.coreWarm, [0, 1.0, -1.5], [0, 0, 0], [1, 1, 1.4]);
  pair('wing', new THREE.BoxGeometry(2.9, 0.28, 0.9), M.dark, [1.7, 1.0, 0.9], [0, -0.55, 0.12]);
  pair('wing_root', new THREE.BoxGeometry(0.9, 0.34, 1.5), M.amber, [0.6, 1.0, 0.2], [0, -0.3, 0]);
  pair('tail_stub', new THREE.BoxGeometry(0.36, 0.3, 1.4), M.amber, [0.42, 1.0, 1.7]);
  pair('tail_glow', new THREE.BoxGeometry(0.3, 0.24, 0.2), M.coreWarm, [0.42, 1.0, 2.5]);
}

/* ---------- charger: blocky crimson ram ---------- */
{
  const { add, pair } = unit('enemy_charger', 7, -5);
  add('body', new THREE.BoxGeometry(1.5, 1.1, 3.8), M.crimson, [0, 1.1, 0]);
  add('nose_wedge', new THREE.ConeGeometry(0.85, 2.4, 4), M.crimson, [0, 1.1, -2.6], [-Math.PI / 2, Math.PI / 4, 0]);
  add('nose_canopy', new THREE.ConeGeometry(0.6, 1.8, 4), M.coreWarm, [0, 1.45, -2.5], [-Math.PI / 2, Math.PI / 4, 0]);
  add('core_lens', new THREE.CylinderGeometry(0.62, 0.62, 0.26, 18), M.coreWarm, [0, 1.1, -0.85], [Math.PI / 2, 0, 0]);
  pair('side_block', new THREE.BoxGeometry(0.8, 1.3, 2.6), M.crimson, [1.1, 1.05, 0.4]);
  pair('side_insert', new THREE.BoxGeometry(0.3, 0.9, 1.4), M.dark, [1.5, 1.05, 0.2]);
  pair('shoulder_fin', new THREE.BoxGeometry(0.4, 0.5, 1.6), M.dark, [1.05, 1.95, -0.4], [0.2, 0, 0]);
  pair('exhaust_cone', new THREE.ConeGeometry(0.45, 1.5, 12), M.coreWarm, [0.7, 1.05, 2.4], [Math.PI / 2, 0, 0]);
}

/* ---------- sniper: slim crimson dart ---------- */
{
  const { add, pair } = unit('enemy_sniper', 14, -5);
  add('body', new THREE.CylinderGeometry(0.34, 0.42, 4.4, 12), M.crimson, [0, 1.1, 0], [Math.PI / 2, 0, 0]);
  add('nose_cone', new THREE.ConeGeometry(0.34, 2.0, 12), M.crimson, [0, 1.1, -3.2], [-Math.PI / 2, 0, 0]);
  add('nose_glow', new THREE.ConeGeometry(0.18, 0.9, 12), M.coreWarm, [0, 1.1, -4.4], [-Math.PI / 2, 0, 0]);
  add('core_band', new THREE.SphereGeometry(0.5, 18, 14), M.coreWarm, [0, 1.1, 0.9], [0, 0, 0], [1, 1, 1.3]);
  pair('mid_fin', new THREE.BoxGeometry(0.3, 0.8, 1.2), M.crimson, [0.5, 1.1, -0.4]);
  pair('rear_fin', new THREE.BoxGeometry(0.26, 0.9, 2.0), M.dark, [0.42, 1.1, 1.8], [0, 0, 0.1]);
  pair('rear_fin_tip', new THREE.ConeGeometry(0.22, 1.0, 8), M.coreWarm, [0.42, 0.5, 3.1], [Math.PI / 2 + 0.3, 0, 0]);
  add('aft_glow', new THREE.CylinderGeometry(0.3, 0.3, 0.16, 12), M.coreWarm, [0, 1.1, 2.3], [Math.PI / 2, 0, 0]);
}

/* ---------- bomber: bulbous copper hull ---------- */
{
  const { add, pair } = unit('enemy_bomber', -14, 4);
  add('hull', new THREE.SphereGeometry(1.9, 24, 18, 0, Math.PI * 2), M.copper, [0, 1.9, 0], [0, 0, 0], [0.85, 0.8, 1.35]);
  add('hull_crest', new THREE.SphereGeometry(1.0, 18, 12), M.copper, [0, 3.0, -0.6], [0, 0, 0], [0.8, 0.7, 1.5]);
  add('cockpit_lens', new THREE.SphereGeometry(0.6, 18, 12), M.coreWarm, [0, 2.3, -1.3], [0, 0, 0], [1, 1, 0.7]);
  add('nose_chin', new THREE.ConeGeometry(0.7, 1.8, 10), M.copper, [0, 1.2, -2.4], [-Math.PI / 2 + 0.3, 0, 0]);
  pair('engine_pod', new THREE.SphereGeometry(0.8, 18, 14), M.dark, [1.35, 1.6, 1.4], [0, 0, 0], [0.9, 0.9, 1.5]);
  pair('engine_glow', new THREE.CylinderGeometry(0.44, 0.44, 0.18, 14), M.coreWarm, [1.35, 1.6, 2.6], [Math.PI / 2, 0, 0]);
  pair('wing_stub', new THREE.BoxGeometry(1.7, 0.34, 1.3), M.copper, [1.5, 1.9, 0.1], [0, 0.2, -0.08]);
  pair('belly_fin', new THREE.ConeGeometry(0.4, 1.5, 8), M.coreWarm, [0.7, 0.6, 1.4], [Math.PI - 0.4, 0, 0]);
}

/* ---------- orbiter: ringed disc with paddles ---------- */
{
  const { add } = unit('enemy_orbiter', -7, 4);
  add('outer_ring', new THREE.TorusGeometry(2.1, 0.2, 12, 32), M.ice, [0, 2.1, 0]);
  add('inner_ring', new THREE.TorusGeometry(1.55, 0.14, 10, 28), M.ice, [0, 2.1, -0.2]);
  add('core_disc', new THREE.CylinderGeometry(1.3, 1.3, 0.5, 24), M.coreCool, [0, 2.1, 0], [Math.PI / 2, 0, 0]);
  add('core_dome', new THREE.SphereGeometry(1.2, 22, 16), M.coreCool, [0, 2.1, -0.3], [0, 0, 0], [1, 1, 0.6]);
  add('hub_collar', new THREE.CylinderGeometry(1.45, 1.5, 0.7, 24), M.ice, [0, 2.1, 0.4], [Math.PI / 2, 0, 0]);
  const paddle = new THREE.BoxGeometry(1.5, 0.5, 0.26).translate(2.7, 0, 0);
  const tip = new THREE.BoxGeometry(0.5, 0.6, 0.3).translate(3.6, 0, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    add('paddle_' + i, paddle, M.dark, [0, 2.1, 0.15], [0, 0, a]);
    add('paddle_tip_' + i, tip, M.ice, [0, 2.1, 0.15], [0, 0, a]);
  }
}

/* ---------- splitter: green faceted pod, split seam ---------- */
{
  const { add, pair } = unit('enemy_splitter', 0, 4);
  pair('half_shell', new THREE.CylinderGeometry(1.8, 1.8, 1.5, 7, 1, false, 0, Math.PI), M.green, [0.18, 1.8, 0], [Math.PI / 2, 0, 0]);
  add('seam_glow', new THREE.BoxGeometry(0.34, 3.3, 1.2), M.coreCool, [0, 1.8, -0.2]);
  pair('shell_rib', new THREE.BoxGeometry(0.3, 2.4, 0.5), M.green, [1.5, 1.8, -0.5], [0, 0, 0.2]);
  pair('shell_plate', new THREE.BoxGeometry(1.1, 0.9, 0.4), M.dark, [1.0, 1.8, 0.8]);
  pair('split_thruster', new THREE.ConeGeometry(0.42, 1.4, 12), M.coreCool, [0.8, 1.2, 1.6], [Math.PI / 2, 0, 0]);
  add('crown_block', new THREE.BoxGeometry(1.0, 0.5, 0.9), M.dark, [0, 3.5, 0.1]);
}

/* ---------- swarm: small grey hex with spikes ---------- */
{
  const { add } = unit('enemy_swarm', 7, 4);
  add('hex_shell', new THREE.CylinderGeometry(1.5, 1.5, 0.75, 6), M.grey, [0, 1.5, 0], [Math.PI / 2, 0, 0]);
  add('core_lens', new THREE.CylinderGeometry(0.78, 0.78, 0.26, 18), M.coreCool, [0, 1.5, -0.45], [Math.PI / 2, 0, 0]);
  add('core_bulb', new THREE.SphereGeometry(0.68, 18, 14), M.coreCool, [0, 1.5, -0.05], [0, 0, 0], [1, 1, 0.6]);
  const spike = new THREE.BoxGeometry(1.4, 0.34, 0.3).translate(2.1, 0, 0);
  [Math.PI / 2, Math.PI * 1.17, Math.PI * 1.83].forEach((a, i) => {
    add('spike_' + i, spike, M.dark, [0, 1.5, 0.1], [0, 0, a]);
  });
  add('aft_glow', new THREE.CylinderGeometry(0.26, 0.26, 0.14, 12), M.coreCool, [0, 1.5, 0.55], [Math.PI / 2, 0, 0]);
}

/* ---------- enemy dreadnought: copper spire with violet slabs ---------- */
{
  const { add, pair } = unit('enemy_dreadnought', 14, 4);
  add('spine', new THREE.CylinderGeometry(0.72, 0.95, 5.6, 8), M.copper, [0, 1.6, 0.4], [Math.PI / 2, 0, 0]);
  add('prow', new THREE.ConeGeometry(0.8, 3.0, 8), M.copper, [0, 1.6, -4.0], [-Math.PI / 2, 0, 0]);
  add('prow_tip', new THREE.ConeGeometry(0.34, 1.2, 8), M.dark, [0, 1.6, -5.6], [-Math.PI / 2, 0, 0]);
  add('core_lens', new THREE.SphereGeometry(0.7, 18, 14), M.coreWarm, [0, 1.6, -1.2], [0, 0, 0], [1, 1, 1.2]);
  pair('side_slab', new THREE.BoxGeometry(1.3, 1.5, 3.4), M.violet, [1.7, 1.9, 0.2], [0, 0, -0.06]);
  pair('slab_insert', new THREE.BoxGeometry(0.6, 0.3, 2.2), M.dark, [1.7, 2.7, 0.2]);
  pair('slab_pylon', new THREE.BoxGeometry(0.9, 0.4, 1.0), M.copper, [1.0, 1.9, 0.0]);
  pair('engine', new THREE.CylinderGeometry(0.5, 0.44, 1.6, 14), M.copper, [0.7, 1.2, 3.4], [Math.PI / 2, 0, 0]);
  pair('engine_glow', new THREE.CylinderGeometry(0.34, 0.34, 0.16, 14), M.coreWarm, [0.7, 1.2, 4.3], [Math.PI / 2, 0, 0]);
  pair('gun_barrel', new THREE.CylinderGeometry(0.13, 0.13, 2.4, 10), M.dark, [0.9, 1.6, -2.4], [Math.PI / 2, 0, 0]);
}

finish(stage, fleet, null, 'void_collective_squadron_root');
