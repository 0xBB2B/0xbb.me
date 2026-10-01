import { expect, test, describe } from 'bun:test';
import * as THREE from 'three';
import { setCanvasFactory } from '../diorama/materials';
import { createTextures } from '../diorama/textures';
import { buildGround, buildRoadMarkings } from '../diorama/ground';
import { buildStore } from '../diorama/store';
import { buildCar } from '../diorama/car';
import { createFakeCanvasFactory } from './fake-canvas';

setCanvasFactory(createFakeCanvasFactory());

const textures = createTextures();

function worldBoxes(scene: THREE.Scene): THREE.Box3[] {
  scene.updateMatrixWorld(true);
  const boxes: THREE.Box3[] = [];
  scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) boxes.push(new THREE.Box3().setFromObject(obj, true));
  });
  return boxes;
}

function size(box: THREE.Box3): THREE.Vector3 {
  return box.getSize(new THREE.Vector3());
}

const groundScene = new THREE.Scene();
buildGround(groundScene, textures);
buildRoadMarkings(groundScene, textures);
const groundBoxes = worldBoxes(groundScene);

const flatLines = groundBoxes.filter((b) => b.min.y >= 0.155 && b.max.y <= 0.17 && Math.min(size(b).x, size(b).z) <= 0.15 && Math.max(size(b).x, size(b).z) >= 2);
const dividers = flatLines.filter((b) => size(b).z >= 4.6 && size(b).z <= 5.0).sort((a, b) => a.min.x - b.min.x);
const frontLines = flatLines.filter((b) => size(b).x > size(b).z);
const wheelStops = groundBoxes
  .filter((b) => {
    const s = size(b);
    return s.x >= 1.4 && s.x <= 1.6 && s.y >= 0.08 && s.y <= 0.2 && s.z <= 0.25 && b.min.y >= 0.14 && b.min.y <= 0.17;
  })
  .sort((a, b) => a.min.x - b.min.x);

const storeScene = new THREE.Scene();
const store = buildStore(storeScene, textures);
storeScene.updateMatrixWorld(true);
const doorBox = new THREE.Box3().setFromObject(store.doorLeft, true).union(new THREE.Box3().setFromObject(store.doorRight, true));
const doorLeftEdge = doorBox.min.x;

const carScene = new THREE.Scene();
const car = buildCar();
carScene.add(car.group, car.ground);
carScene.updateMatrixWorld(true);
const carBody = new THREE.Box3().setFromObject(car.group, true);
const carGround = new THREE.Box3().setFromObject(car.ground, true);

const centerX = (b: THREE.Box3) => (b.min.x + b.max.x) / 2;
const centerZ = (b: THREE.Box3) => (b.min.z + b.max.z) / 2;

describe('parking lot has two 2.5m bays', () => {
  test('there are 3 divider lines', () => {
    expect(dividers.length).toBe(3);
  });

  test('adjacent dividers are 2.5m apart', () => {
    expect(dividers.length).toBe(3);
    for (let i = 1; i < dividers.length; i++) {
      expect(Math.abs(centerX(dividers[i]) - centerX(dividers[i - 1]) - 2.5)).toBeLessThanOrEqual(0.01);
    }
  });

  test('one front line joins the front ends of the dividers across both bays', () => {
    expect(dividers.length).toBe(3);
    expect(frontLines.length).toBe(1);
    const line = frontLines[0];
    const frontZ = Math.max(...dividers.map((d) => d.max.z));
    expect(Math.abs(centerZ(line) - frontZ)).toBeLessThanOrEqual(0.1);
    expect(line.min.x).toBeLessThanOrEqual(dividers[0].min.x + 0.01);
    expect(line.max.x).toBeGreaterThanOrEqual(dividers[2].max.x - 0.01);
  });

  test('there are 2 wheel stops, each centred in its own bay', () => {
    expect(dividers.length).toBe(3);
    expect(wheelStops.length).toBe(2);
    wheelStops.forEach((stop, i) => {
      const mid = (centerX(dividers[i]) + centerX(dividers[i + 1])) / 2;
      expect(Math.abs(centerX(stop) - mid)).toBeLessThanOrEqual(0.05);
    });
  });
});

describe('the walkway in front of the door stays clear', () => {
  test('the door left edge is at world x -0.6', () => {
    expect(doorLeftEdge).toBeCloseTo(-0.6, 1);
  });

  test('the rightmost divider right edge is 3 to 8 cm left of the door left edge', () => {
    expect(dividers.length).toBe(3);
    const gap = doorLeftEdge - dividers[2].max.x;
    expect(gap).toBeGreaterThanOrEqual(0.03);
    expect(gap).toBeLessThanOrEqual(0.08);
  });

  test('every parking line and wheel stop lies left of the door left edge', () => {
    const marks = [...flatLines, ...wheelStops];
    expect(marks.length).toBeGreaterThan(0);
    for (const b of marks) expect(b.max.x).toBeLessThanOrEqual(doorLeftEdge + 1e-6);
  });

  test('the car body and its ground shadow lie left of the door left edge', () => {
    expect(carBody.max.x).toBeLessThanOrEqual(doorLeftEdge + 1e-6);
    expect(carGround.max.x).toBeLessThanOrEqual(doorLeftEdge + 1e-6);
  });
});

describe('the porsche sits centred in the bay next to the door', () => {
  test('its top-view footprint lies between the two dividers of that bay', () => {
    expect(dividers.length).toBe(3);
    expect(carBody.min.x).toBeGreaterThanOrEqual(dividers[1].max.x);
    expect(carBody.max.x).toBeLessThanOrEqual(dividers[2].min.x);
  });

  test('the wheel stop of its bay hides under the tail and does not cover the tail glow', () => {
    expect(wheelStops.length).toBe(2);
    expect(wheelStops[1].min.z).toBeGreaterThanOrEqual(carBody.min.z - 0.01);
  });

  test('its centre is the bay centre in x', () => {
    expect(dividers.length).toBe(3);
    const mid = (centerX(dividers[1]) + centerX(dividers[2])) / 2;
    expect(Math.abs(centerX(carBody) - mid)).toBeLessThanOrEqual(0.05);
  });

  test('the nose points toward the main road (+z): headlights are ahead of the body centre', () => {
    const lensZ: number[] = [];
    car.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const m = mesh.material as THREE.MeshToonMaterial;
      if (mesh.isMesh && !mesh.name.startsWith('license-plate-') && m instanceof THREE.MeshToonMaterial && m.color.r > 0.6 && m.color.g > 0.6 && m.color.b > 0.6) {
        lensZ.push(new THREE.Box3().setFromObject(mesh, true).getCenter(new THREE.Vector3()).z);
      }
    });
    expect(lensZ.length).toBe(2);
    for (const z of lensZ) expect(z).toBeGreaterThan(centerZ(carBody));
  });
});
