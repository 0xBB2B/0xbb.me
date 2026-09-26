import * as THREE from 'three';
import { toon } from './materials';

export function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export function pick<T>(a: T[]): T {
  return a[(Math.random() * a.length) | 0];
}

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

export function acUnit(parent: THREE.Object3D, x: number, y: number, z: number, ry = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  box(g, 0.85, 0.62, 0.32, toon('#d4d9e0'), 0, 0, 0);
  const fan = add(g, new THREE.CylinderGeometry(0.22, 0.22, 0.02, 20), toon('#3b404c'), -0.13, 0.31, 0.165);
  fan.rotation.x = Math.PI / 2;
  for (let i = 0; i < 5; i++) box(g, 0.02, 0.44, 0.01, toon('#8d94a1'), -0.33 + i * 0.1, 0.09, 0.175);
  box(g, 0.2, 0.3, 0.02, toon('#c3c8cf'), 0.28, 0.16, 0.165);
  return g;
}
