import { expect, test, describe } from 'bun:test';
import * as THREE from 'three';
import { setCanvasFactory } from '../diorama/materials';
import { createFakeCanvasFactory } from './fake-canvas';
import { CAR_CENTER } from '../diorama/layout';

setCanvasFactory(createFakeCanvasFactory());

import { buildCar } from '../diorama/car';

type Car = ReturnType<typeof buildCar>;

const FORBIDDEN_NAMES = ['driver-door', 'cabin-interior', 'center-screen', 'steering-wheel', 'door-handle'];

function buildScene(): { scene: THREE.Scene; car: Car } {
  const scene = new THREE.Scene();
  const car = buildCar();
  scene.add(car.group);
  scene.updateMatrixWorld(true);
  return { scene, car };
}

function carBox(scene: THREE.Scene): THREE.Box3 {
  const porsche = scene.getObjectByName('porsche')!;
  return new THREE.Box3().setFromObject(porsche, true);
}

function hazardMeshes(car: Car): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  car.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (materials.includes(car.hazardMaterial)) meshes.push(mesh);
  });
  return meshes;
}

function meshWorldZ(mesh: THREE.Mesh): number {
  const position = new THREE.Vector3();
  mesh.getWorldPosition(position);
  return position.z;
}

describe('the porsche group is findable and positioned in its parking space', () => {
  test('the scene has an object named "porsche"', () => {
    const { scene } = buildScene();
    expect(scene.getObjectByName('porsche')).toBeDefined();
  });

  test('the world bounding box center sits within 0.3m (x,z) of CAR_CENTER', () => {
    const { scene } = buildScene();
    const center = carBox(scene).getCenter(new THREE.Vector3());
    const [cx, , cz] = CAR_CENTER;
    expect(Math.hypot(center.x - cx, center.z - cz)).toBeLessThan(0.3);
  });

  test('the world bounding box bottom sits between 0.1 and 0.25 above ground', () => {
    const { scene } = buildScene();
    const box = carBox(scene);
    expect(box.min.y).toBeGreaterThanOrEqual(0.1);
    expect(box.min.y).toBeLessThanOrEqual(0.25);
  });

  test('the body is longer along z than wide along x (nose faces the main road)', () => {
    const { scene } = buildScene();
    const box = carBox(scene);
    expect(box.max.z - box.min.z).toBeGreaterThan(box.max.x - box.min.x);
  });
});

describe('hazard lights: shared amber material on all four corner markers', () => {
  test('at least 4 meshes use hazardMaterial', () => {
    const { car } = buildScene();
    expect(hazardMeshes(car).length).toBeGreaterThanOrEqual(4);
  });

  test('hazard meshes span both the nose (z > center+1) and the tail (z < center-1)', () => {
    const { scene, car } = buildScene();
    const centerZ = carBox(scene).getCenter(new THREE.Vector3()).z;
    const zs = hazardMeshes(car).map(meshWorldZ);
    expect(Math.max(...zs)).toBeGreaterThan(centerZ + 1);
    expect(Math.min(...zs)).toBeLessThan(centerZ - 1);
  });

  test('hazardMaterial is excluded from the toon outline pass', () => {
    const { car } = buildScene();
    expect(car.hazardMaterial.userData.outlineParameters?.visible).toBe(false);
  });
});

describe('hazard lights: front and rear point lights start off', () => {
  test('exactly 2 hazard point lights are returned', () => {
    const { car } = buildScene();
    expect(car.hazardLights.length).toBe(2);
  });

  test('both start at zero intensity', () => {
    const { car } = buildScene();
    for (const light of car.hazardLights) {
      expect(light.intensity).toBe(0);
    }
  });

  test('both lights are amber-tinted (r > g > b)', () => {
    const { car } = buildScene();
    for (const light of car.hazardLights) {
      expect(light.color.r).toBeGreaterThan(light.color.g);
      expect(light.color.g).toBeGreaterThan(light.color.b);
    }
  });

  test('one light sits ahead of the car center and the other sits behind it', () => {
    const { scene, car } = buildScene();
    const centerZ = carBox(scene).getCenter(new THREE.Vector3()).z;
    const zs = car.hazardLights.map((light) => {
      const position = new THREE.Vector3();
      light.getWorldPosition(position);
      return position.z;
    });
    expect(zs.some((z) => z > centerZ)).toBe(true);
    expect(zs.some((z) => z < centerZ)).toBe(true);
  });
});

describe('exterior-only: no interior or door-opening parts', () => {
  for (const name of FORBIDDEN_NAMES) {
    test(`no object named "${name}" exists`, () => {
      const { scene } = buildScene();
      expect(scene.getObjectByName(name)).toBeUndefined();
    });
  }
});

describe('the body reads as red', () => {
  test('at least one mesh material is a saturated red (r > 0.5, g and b < 0.25)', () => {
    const { car } = buildScene();
    let found = false;
    car.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        const color = (material as THREE.MeshToonMaterial).color;
        if (color && color.r > 0.5 && color.g < 0.25 && color.b < 0.25) found = true;
      }
    });
    expect(found).toBe(true);
  });
});

function meshesWhere(car: Car, match: (mesh: THREE.Mesh, material: THREE.Material) => boolean): THREE.Mesh[] {
  const found: THREE.Mesh[] = [];
  car.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (materials.some((material) => match(mesh, material))) found.push(mesh);
  });
  return found;
}

function worldBox(mesh: THREE.Mesh): THREE.Box3 {
  return new THREE.Box3().setFromObject(mesh, true);
}

describe('the car faces the main road with its tail toward the store', () => {
  test('white daytime running lights sit on the +z side of the car center', () => {
    const { scene, car } = buildScene();
    const centerZ = carBox(scene).getCenter(new THREE.Vector3()).z;
    const drls = meshesWhere(car, (_, m) => m instanceof THREE.MeshBasicMaterial && m.color.r > 0.9 && m.color.g > 0.9 && m.color.b > 0.9);
    expect(drls.length).toBeGreaterThanOrEqual(2);
    for (const drl of drls) expect(worldBox(drl).getCenter(new THREE.Vector3()).z).toBeGreaterThan(centerZ + 1);
  });

  test('the full-width red tail light bar sits on the -z side', () => {
    const { scene, car } = buildScene();
    const centerZ = carBox(scene).getCenter(new THREE.Vector3()).z;
    const bars = meshesWhere(car, (mesh, m) => {
      if (!(m instanceof THREE.MeshBasicMaterial) || !(m.color.r > 0.5 && m.color.g < 0.3 && m.color.b < 0.3)) return false;
      const size = worldBox(mesh).getSize(new THREE.Vector3());
      return size.x >= 1.4;
    });
    expect(bars.length).toBeGreaterThanOrEqual(1);
    for (const bar of bars) expect(worldBox(bar).getCenter(new THREE.Vector3()).z).toBeLessThan(centerZ - 1);
  });

  test('the fixed rear wing is the highest part and sits behind the car center', () => {
    const { scene, car } = buildScene();
    const box = carBox(scene);
    const centerZ = box.getCenter(new THREE.Vector3()).z;
    expect(box.max.y).toBeGreaterThan(1.05);
    let highest: THREE.Mesh | null = null;
    car.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (!highest || worldBox(mesh).max.y > worldBox(highest).max.y) highest = mesh;
    });
    expect(worldBox(highest!).getCenter(new THREE.Vector3()).z).toBeLessThan(centerZ);
  });

  test('the red body paint uses the cel-shaded toon material', () => {
    const { car } = buildScene();
    const paint = meshesWhere(car, (_, m) => m instanceof THREE.MeshToonMaterial && m.color.r > 0.5 && m.color.g < 0.25 && m.color.b < 0.25);
    expect(paint.length).toBeGreaterThan(0);
  });
});
