import * as THREE from 'three';

export function add(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material | THREE.Material[],
  x = 0,
  y = 0,
  z = 0,
  ry = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  parent.add(mesh);
  return mesh;
}

export function box(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  mat: THREE.Material | THREE.Material[],
  x = 0,
  y = 0,
  z = 0,
  ry = 0,
): THREE.Mesh {
  return add(parent, new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, ry);
}

export function cyl(
  parent: THREE.Object3D,
  radiusTop: number,
  radiusBottom: number,
  h: number,
  mat: THREE.Material | THREE.Material[],
  x = 0,
  y = 0,
  z = 0,
  seg = 16,
): THREE.Mesh {
  return add(parent, new THREE.CylinderGeometry(radiusTop, radiusBottom, h, seg), mat, x, y + h / 2, z);
}

export function plane(
  parent: THREE.Object3D,
  w: number,
  h: number,
  mat: THREE.Material | THREE.Material[],
  x = 0,
  y = 0,
  z = 0,
  ry = 0,
): THREE.Mesh {
  return add(parent, new THREE.PlaneGeometry(w, h), mat, x, y, z, ry);
}

export function flat(
  parent: THREE.Object3D,
  w: number,
  d: number,
  mat: THREE.Material | THREE.Material[],
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const mesh = add(parent, new THREE.PlaneGeometry(w, d), mat, x, y, z);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function rod(
  parent: THREE.Object3D,
  a: THREE.Vector3,
  b: THREE.Vector3,
  r: number,
  mat: THREE.Material | THREE.Material[],
  seg = 8,
): THREE.Mesh {
  const v = new THREE.Vector3().subVectors(b, a);
  const len = v.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  mesh.position.copy(a).addScaledVector(v, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
  parent.add(mesh);
  return mesh;
}
