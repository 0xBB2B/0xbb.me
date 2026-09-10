import * as THREE from 'three';

type BoxInstance = { x: number; y: number; z: number; color?: number; scale?: readonly [number, number, number] };

/** Repeated architectural detail shares one draw and one geometry; gameplay anchors remain separate objects. */
export function boxInstances(parent: THREE.Object3D, name: string, color: number,
  size: readonly [number, number, number], instances: readonly BoxInstance[]) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), instances.length);
  mesh.name = name;
  const matrix = new THREE.Matrix4();
  const tint = new THREE.Color();
  instances.forEach((instance, index) => {
    const scale = instance.scale ?? [1, 1, 1];
    matrix.makeScale(...scale).setPosition(instance.x, instance.y, instance.z);
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, tint.set(instance.color ?? color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.receiveShadow = true;
  mesh.computeBoundingBox(); mesh.computeBoundingSphere();
  parent.add(mesh);
  return mesh;
}
