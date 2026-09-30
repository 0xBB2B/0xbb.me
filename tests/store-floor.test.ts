import { expect, test, describe } from 'bun:test';
import * as THREE from 'three';
import { setCanvasFactory } from '../diorama/materials';
import { createFakeCanvasFactory } from './fake-canvas';

setCanvasFactory(createFakeCanvasFactory());

import { buildStore } from '../diorama/store';
import { createTextures } from '../diorama/textures';

function meshesWithColor(root: THREE.Object3D, hex: string): THREE.Mesh[] {
  const target = new THREE.Color(hex);
  const found: THREE.Mesh[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (materials.some((m) => (m as THREE.MeshToonMaterial).color?.equals(target))) found.push(mesh);
  });
  return found;
}

function overlap(aMin: number, aMax: number, bMin: number, bMax: number): boolean {
  return aMin < bMax - 0.001 && bMin < aMax - 0.001;
}

function coplanarFaces(a: THREE.Mesh, b: THREE.Mesh): string[] {
  const boxA = new THREE.Box3().setFromObject(a, true);
  const boxB = new THREE.Box3().setFromObject(b, true);
  if (!overlap(boxA.min.y, boxA.max.y, boxB.min.y, boxB.max.y)) return [];
  const found: string[] = [];
  for (const axis of ['x', 'z'] as const) {
    const other = axis === 'x' ? 'z' : 'x';
    if (!overlap(boxA.min[other], boxA.max[other], boxB.min[other], boxB.max[other])) continue;
    for (const side of ['min', 'max'] as const) {
      if (Math.abs(boxA[side][axis] - boxB[side][axis]) < 0.004) found.push(`${axis}=${boxA[side][axis].toFixed(3)}`);
    }
  }
  return found;
}

function buildStoreScene(): THREE.Scene {
  const scene = new THREE.Scene();
  buildStore(scene, createTextures());
  scene.updateMatrixWorld(true);
  return scene;
}

describe('the store base does not z-fight between differently colored parts', () => {
  test('no vertical face of the floor is coplanar with an outer wall or metal sill face at the same height', () => {
    const scene = buildStoreScene();
    const floors = meshesWithColor(scene, '#f1ece1');
    const shells = [...meshesWithColor(scene, '#dde2ea'), ...meshesWithColor(scene, '#4b5263')];
    expect(floors.length).toBe(1);
    expect(shells.length).toBeGreaterThan(0);
    expect(shells.flatMap((shell) => coplanarFaces(floors[0], shell))).toEqual([]);
  });

  test('no outer wall face is coplanar with a metal part face at the same height', () => {
    const scene = buildStoreScene();
    const walls = meshesWithColor(scene, '#dde2ea');
    const metals = meshesWithColor(scene, '#4b5263');
    expect(walls.length).toBeGreaterThan(0);
    expect(metals.length).toBeGreaterThan(0);
    expect(walls.flatMap((wall) => metals.flatMap((metal) => coplanarFaces(wall, metal)))).toEqual([]);
  });
});
