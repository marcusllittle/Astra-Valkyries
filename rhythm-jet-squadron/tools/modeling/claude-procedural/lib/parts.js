import * as THREE from 'three';

/* Shared part-building kit for the Astra Valkyries model set.
   Every mesh gets a name so OBJ/GLB exports stay readable. */
export function kit(name) {
  const group = new THREE.Group();
  group.name = name;

  function add(n, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale) {
    const m = new THREE.Mesh(geo, mat);
    m.name = n;
    m.position.set(...pos);
    m.rotation.set(...rot);
    if (scale) m.scale.set(...scale);
    group.add(m);
    return m;
  }
  function pair(n, geo, mat, pos, rot = [0, 0, 0], scale = [1, 1, 1]) {
    add(n + '_stbd', geo, mat, pos, rot, scale);
    add(n + '_port', geo, mat, [-pos[0], pos[1], pos[2]], [rot[0], -rot[1], -rot[2]], [-scale[0], scale[1], scale[2]]);
  }
  function radial(n, count, geoFn, mat, radius, z, extra) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const m = new THREE.Mesh(geoFn(i), mat);
      m.name = n + '_' + i;
      m.position.set(Math.cos(a) * radius, Math.sin(a) * radius, z);
      m.rotation.z = a;
      if (extra) extra(m, i, a);
      group.add(m);
    }
  }
  return { group, add, pair, radial };
}

export function shape(pts) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  pts.slice(1).forEach(([x, y]) => s.lineTo(x, y));
  s.closePath();
  return s;
}
// plan-view plate: shape x = span, y = forward; thickness in Y
export function plate(pts, depth, bevel = 0.05) {
  const g = new THREE.ExtrudeGeometry(shape(pts), { depth, bevelEnabled: bevel > 0, bevelThickness: bevel * 0.7, bevelSize: bevel, bevelSegments: 2 });
  g.rotateX(-Math.PI / 2);
  return g;
}
// side-view fin: shape x = forward, y = up; thickness in X
export function finPlate(pts, depth, bevel = 0.04) {
  const g = new THREE.ExtrudeGeometry(shape(pts), { depth, bevelEnabled: bevel > 0, bevelThickness: bevel * 0.7, bevelSize: bevel, bevelSegments: 1 });
  g.rotateY(Math.PI / 2);
  return g;
}

/* Scale to a target length along Z, center in X/Z, rest the base on y=0,
   and hand the result to the stage. */
export function finish(stage, group, targetLength, rootName) {
  let box = new THREE.Box3().setFromObject(group);
  if (targetLength) {
    group.scale.setScalar(targetLength / (box.max.z - box.min.z));
    group.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(group);
  }
  const c = box.getCenter(new THREE.Vector3());
  group.position.set(-c.x, -box.min.y, -c.z);
  const root = new THREE.Group();
  root.name = rootName || group.name + '_root';
  root.add(group);
  stage.setObject(root);
  return root;
}
