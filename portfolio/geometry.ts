import * as THREE from 'three';

export function box(parent: THREE.Object3D, color: THREE.ColorRepresentation,
  x: number, y: number, z: number, width: number, height: number, depth: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function contactShadow(parent: THREE.Object3D, x: number, z: number, width: number, depth: number) {
  const group = new THREE.Group();
  group.position.set(x, 0.025, z);
  for (let i = 0; i < 3; i++) {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({
      color: 0x352b38, transparent: true, opacity: 0.09, depthWrite: false,
    }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.scale.set(width * (1 - i * 0.2), depth * (1 - i * 0.2), 1);
    mesh.position.y = i * 0.002;
    group.add(mesh);
  }
  parent.add(group);
  return group;
}

export function disposeScene(scene: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  scene.traverse(object => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    }
    if (object instanceof THREE.Light) object.dispose();
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}
