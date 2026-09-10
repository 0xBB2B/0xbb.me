import * as THREE from 'three';

// Only these scene-owned roots are immutable. Doors, actors and animated machinery stay separate.
const ROOTS = ['Scene_town', 'Scene_workshop', 'Scene_gallery'];
const EXCLUDED = new Set(['NPC_greeter', 'Factory_conveyor', 'Workshop_ground', 'Coastal_meteors', 'Lighthouse_beam']);

type Box = THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;

export function batchStaticScenery(scene: THREE.Scene) {
  const removedGeometries = new Set<THREE.BufferGeometry>();
  const removedMaterials = new Set<THREE.Material>();
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  let batches = 0, boxes = 0;
  scene.updateMatrixWorld(true);
  for (const name of ROOTS) {
    const root = scene.getObjectByName(name);
    if (!root) continue;
    const toRoot = root.matrixWorld.clone().invert();
    const groups = new Map<string, Box[]>();
    const collect = (object: THREE.Object3D) => {
      if (EXCLUDED.has(object.name) || (object !== root && !object.visible)) return;
      if (object instanceof THREE.Mesh && !(object instanceof THREE.InstancedMesh)
        && object.geometry instanceof THREE.BoxGeometry && object.material.type === 'MeshStandardMaterial') {
        const mesh = object as Box, material = mesh.material, geometry = mesh.geometry;
        const p = geometry.parameters;
        const position = geometry.getAttribute('position');
        if (!material.transparent && !material.vertexColors && position instanceof THREE.BufferAttribute && position.version === 0
          && p.widthSegments === 1 && p.heightSegments === 1 && p.depthSegments === 1
          && !Object.values(material).some(value => value instanceof THREE.Texture)
          && mesh.matrixWorld.determinant() > 0) {
          const properties = material.toJSON();
          delete properties.uuid; delete properties.metadata; delete properties.color; delete properties.name;
          const cell = Math.floor(mesh.matrixWorld.elements[12] / 8);
          const key = JSON.stringify([cell, mesh.castShadow, mesh.receiveShadow, mesh.renderOrder, mesh.layers.mask, properties]);
          const group = groups.get(key) ?? []; group.push(mesh); groups.set(key, group);
        }
      }
      for (const child of object.children) collect(child);
    };
    collect(root);
    for (const meshes of groups.values()) {
      if (meshes.length < 3) continue;
      const material = meshes[0].material.clone(); material.color.set(0xffffff);
      const batch = new THREE.InstancedMesh(unitBox, material, meshes.length);
      batch.name = `Static_batch_${name}_${batches++}`;
      batch.castShadow = meshes[0].castShadow; batch.receiveShadow = meshes[0].receiveShadow;
      batch.renderOrder = meshes[0].renderOrder; batch.layers.mask = meshes[0].layers.mask;
      const matrix = new THREE.Matrix4(), dimensions = new THREE.Vector3();
      meshes.forEach((mesh, index) => {
        const { width, height, depth } = mesh.geometry.parameters;
        matrix.multiplyMatrices(toRoot, mesh.matrixWorld).scale(dimensions.set(width, height, depth));
        batch.setMatrixAt(index, matrix); batch.setColorAt(index, mesh.material.color);
        removedGeometries.add(mesh.geometry); removedMaterials.add(mesh.material);
        mesh.removeFromParent(); boxes++;
      });
      batch.instanceMatrix.needsUpdate = true;
      batch.instanceColor!.needsUpdate = true;
      batch.computeBoundingBox(); batch.computeBoundingSphere();
      root.add(batch);
    }
  }
  // A resource can also belong to an excluded animated object. Never dispose a live reference.
  scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    removedGeometries.delete(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) removedMaterials.delete(material);
  });
  for (const geometry of removedGeometries) geometry.dispose();
  for (const material of removedMaterials) material.dispose();
  if (!batches) unitBox.dispose();
  return { boxes, batches };
}
