import { expect, test, describe } from 'bun:test';
import * as THREE from 'three';
import { setCanvasFactory } from '../diorama/materials';
import { createFakeCanvasFactory } from './fake-canvas';
import { BASE_HALF } from '../diorama/layout';

setCanvasFactory(createFakeCanvasFactory());

import { buildGround } from '../diorama/ground';
import { createTextures } from '../diorama/textures';

function buildGroundScene(): THREE.Scene {
  const scene = new THREE.Scene();
  buildGround(scene, createTextures());
  scene.updateMatrixWorld(true);
  return scene;
}

function meshesWithColor(scene: THREE.Scene, hex: string): THREE.Mesh[] {
  const target = new THREE.Color(hex);
  const found: THREE.Mesh[] = [];
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const color = (material as THREE.MeshStandardMaterial | THREE.MeshToonMaterial).color;
      if (color && color.equals(target)) found.push(mesh);
    }
  });
  return found;
}

interface VerticalFace {
  axis: 'x' | 'z';
  coord: number;
  rangeMin: number;
  rangeMax: number;
}

function verticalFaces(mesh: THREE.Mesh): VerticalFace[] {
  const box = new THREE.Box3().setFromObject(mesh, true);
  return [
    { axis: 'x', coord: box.min.x, rangeMin: box.min.z, rangeMax: box.max.z },
    { axis: 'x', coord: box.max.x, rangeMin: box.min.z, rangeMax: box.max.z },
    { axis: 'z', coord: box.min.z, rangeMin: box.min.x, rangeMax: box.max.x },
    { axis: 'z', coord: box.max.z, rangeMin: box.min.x, rangeMax: box.max.x },
  ];
}

function coplanar(a: VerticalFace, b: VerticalFace): boolean {
  return a.axis === b.axis && Math.abs(a.coord - b.coord) < 0.004 && a.rangeMin < b.rangeMax - 0.001 && b.rangeMin < a.rangeMax - 0.001;
}

describe('curb boxes do not share an outer vertical face with adjacent lot/sidewalk slabs', () => {
  test('no curb face is coplanar with a lot or sidewalk face', () => {
    const scene = buildGroundScene();
    const curbMeshes = meshesWithColor(scene, '#9aa0ad');
    const groundMeshes = [...meshesWithColor(scene, '#2a2f3f'), ...meshesWithColor(scene, '#4b5164')];
    expect(curbMeshes.length).toBeGreaterThan(0);
    expect(groundMeshes.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const curb of curbMeshes) {
      for (const ground of groundMeshes) {
        for (const curbFace of verticalFaces(curb)) {
          for (const groundFace of verticalFaces(ground)) {
            if (coplanar(curbFace, groundFace)) {
              offenders.push(`curb ${curbFace.axis}=${curbFace.coord.toFixed(3)} vs ground ${groundFace.axis}=${groundFace.coord.toFixed(3)}`);
            }
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

function tileBandMeshes(scene: THREE.Scene): THREE.Mesh[] {
  const found: THREE.Mesh[] = [];
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const std = material as THREE.MeshStandardMaterial;
      if (std.map && Math.abs(new THREE.Box3().setFromObject(mesh, true).min.y - 0.156) < 0.01) found.push(mesh);
    }
  });
  return found;
}

describe('the curbs stay within the pedestal footprint', () => {
  test('every curb bounding box stays within BASE_HALF on x and z', () => {
    const scene = buildGroundScene();
    const curbMeshes = meshesWithColor(scene, '#9aa0ad');
    expect(curbMeshes.length).toBeGreaterThan(0);
    for (const curb of curbMeshes) {
      const box = new THREE.Box3().setFromObject(curb, true);
      expect(box.min.x).toBeGreaterThanOrEqual(-BASE_HALF - 1e-6);
      expect(box.max.x).toBeLessThanOrEqual(BASE_HALF + 1e-6);
      expect(box.min.z).toBeGreaterThanOrEqual(-BASE_HALF - 1e-6);
      expect(box.max.z).toBeLessThanOrEqual(BASE_HALF + 1e-6);
    }
  });
});

describe('the sidewalk tile meets the curb without a gap', () => {
  test('every tile band that borders a curb touches its inner face within 2mm', () => {
    const scene = buildGroundScene();
    const curbMeshes = meshesWithColor(scene, '#9aa0ad');
    const tileMeshes = tileBandMeshes(scene);
    expect(curbMeshes.length).toBeGreaterThan(0);
    expect(tileMeshes.length).toBeGreaterThan(0);

    const adjacentGaps: number[] = [];
    for (const tile of tileMeshes) {
      const tileBox = new THREE.Box3().setFromObject(tile, true);
      let nearestGap: number | null = null;
      for (const curb of curbMeshes) {
        const curbBox = new THREE.Box3().setFromObject(curb, true);
        const overlapZ = Math.min(tileBox.max.z, curbBox.max.z) - Math.max(tileBox.min.z, curbBox.min.z);
        if (overlapZ > 0.05) {
          for (const gap of [Math.abs(tileBox.max.x - curbBox.min.x), Math.abs(curbBox.max.x - tileBox.min.x)]) {
            if (gap < 1 && (nearestGap === null || gap < nearestGap)) nearestGap = gap;
          }
        }
        const overlapX = Math.min(tileBox.max.x, curbBox.max.x) - Math.max(tileBox.min.x, curbBox.min.x);
        if (overlapX > 0.05) {
          for (const gap of [Math.abs(tileBox.max.z - curbBox.min.z), Math.abs(curbBox.max.z - tileBox.min.z)]) {
            if (gap < 1 && (nearestGap === null || gap < nearestGap)) nearestGap = gap;
          }
        }
      }
      if (nearestGap !== null) adjacentGaps.push(nearestGap);
    }

    expect(adjacentGaps.length).toBeGreaterThan(0);
    for (const gap of adjacentGaps) {
      expect(gap).toBeLessThan(0.002);
    }
  });
});
