import { createHash } from 'node:crypto';
import * as THREE from 'three';

// Compare visible model data independently of construction order, material UUIDs or local pivots.
export function modelFingerprint(model: THREE.Object3D) {
  model.updateMatrixWorld(true);
  const rows: string[] = [];
  const round = (value: number) => Math.round(value * 1e6) / 1e6;
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = object.geometry, position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal'), color = geometry.getAttribute('color');
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(object.matrixWorld);
    const vertices: number[][] = [];
    for (let i = 0; i < position.count; i++) {
      const p = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld);
      const n = new THREE.Vector3().fromBufferAttribute(normal, i).applyNormalMatrix(normalMatrix);
      vertices.push([...p.toArray(), ...n.toArray(), color.getX(i), color.getY(i), color.getZ(i)].map(round));
    }
    const material = object.material as THREE.MeshStandardMaterial;
    rows.push(JSON.stringify({ name: object.name, parent: object.parent?.name, vertices,
      indices: geometry.index ? Array.from(geometry.index.array) : null,
      castShadow: object.castShadow, receiveShadow: object.receiveShadow,
      material: { type: material.type, color: material.color.getHex(), vertexColors: material.vertexColors,
        roughness: material.roughness, metalness: material.metalness, side: material.side, transparent: material.transparent, opacity: material.opacity } }));
  });
  return createHash('sha256').update(rows.sort().join('\n')).digest('hex');
}
