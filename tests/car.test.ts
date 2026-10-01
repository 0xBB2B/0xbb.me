import { expect, test, describe } from 'bun:test';
import * as THREE from 'three';
import { setCanvasFactory } from '../diorama/materials';
import { createFakeCanvas, createFakeCanvasFactory } from './fake-canvas';
import { CAR_CENTER } from '../diorama/layout';
import { drawLicensePlate, drawRearWordmark } from '../diorama/textures';

setCanvasFactory(createFakeCanvasFactory());

import { buildCar } from '../diorama/car';

type Car = ReturnType<typeof buildCar>;


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

  test('the body world bounding box bottom is within 0.01m of CAR_CENTER y', () => {
    const { scene } = buildScene();
    expect(Math.abs(carBox(scene).min.y - CAR_CENTER[1])).toBeLessThanOrEqual(0.01);
  });

  test('the body footprint is 1.98m wide and 4.19m long, within 5cm', () => {
    const { scene } = buildScene();
    const size = carBox(scene).getSize(new THREE.Vector3());
    expect(Math.abs(size.x - 1.98)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(size.z - 4.19)).toBeLessThanOrEqual(0.05);
  });

  test('the ground shadow and tail glow are scaled down with the body (at most 2.45m wide, 5.25m long)', () => {
    const { scene, car } = buildScene();
    scene.add(car.ground);
    scene.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(car.ground, true).getSize(new THREE.Vector3());
    expect(size.x).toBeLessThanOrEqual(2.45);
    expect(size.z).toBeLessThanOrEqual(5.25);
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

describe('hazard lights: four corner markers start off', () => {
  test('exactly 4 hazard point lights are returned', () => {
    const { car } = buildScene();
    expect(car.hazardLights.length).toBe(4);
  });

  test('all four start at zero intensity', () => {
    const { car } = buildScene();
    for (const light of car.hazardLights) {
      expect(light.intensity).toBe(0);
    }
  });

  test('all four are amber-tinted (r > g > b)', () => {
    const { car } = buildScene();
    for (const light of car.hazardLights) {
      expect(light.color.r).toBeGreaterThan(light.color.g);
      expect(light.color.g).toBeGreaterThan(light.color.b);
    }
  });

  test('two lights sit ahead of the car center (world z) and two sit behind it', () => {
    const { scene, car } = buildScene();
    const centerZ = carBox(scene).getCenter(new THREE.Vector3()).z;
    const zs = car.hazardLights.map((light) => {
      const position = new THREE.Vector3();
      light.getWorldPosition(position);
      return position.z;
    });
    expect(zs.filter((z) => z > centerZ).length).toBe(2);
    expect(zs.filter((z) => z < centerZ).length).toBe(2);
  });

  test('every light sits at least 0.7m from the car center along the width axis (world x)', () => {
    const { scene, car } = buildScene();
    const centerX = carBox(scene).getCenter(new THREE.Vector3()).x;
    for (const light of car.hazardLights) {
      const position = new THREE.Vector3();
      light.getWorldPosition(position);
      expect(Math.abs(position.x - centerX)).toBeGreaterThanOrEqual(0.7);
    }
  });

  test('every light sits low on the body, below the roofline (local y)', () => {
    const { scene, car } = buildScene();
    const box = carBox(scene);
    const localRoofY = box.max.y - CAR_CENTER[1];
    for (const light of car.hazardLights) {
      expect(light.position.y).toBeLessThan(localRoofY);
    }
  });
});

const GROUND_TOP_Y = 0.15;
const CURB_INNER_Z = 4.79;
const CURB_INNER_X = 4.79;

function groundRadius(light: THREE.PointLight, worldY: number): number {
  const h = worldY - GROUND_TOP_Y;
  if (light.distance <= h) return 0;
  return Math.sqrt(light.distance * light.distance - h * h);
}

describe('hazard lights: ground illumination stays within 1m and clear of the lot curb', () => {
  test('every hazard light has a finite falloff distance (0 means unlimited, not allowed)', () => {
    const { car } = buildScene();
    for (const light of car.hazardLights) {
      expect(light.distance).toBeGreaterThan(0);
    }
  });

  test('every hazard light ground radius does not exceed 1 meter', () => {
    const { car } = buildScene();
    for (const light of car.hazardLights) {
      const position = new THREE.Vector3();
      light.getWorldPosition(position);
      const radius = groundRadius(light, position.y);
      expect(radius).toBeLessThanOrEqual(1.0);
    }
  });

  test('every hazard light ground radius stays short of the nearest curb inside face (+z and +x sides)', () => {
    const { car } = buildScene();
    for (const light of car.hazardLights) {
      const position = new THREE.Vector3();
      light.getWorldPosition(position);
      const radius = groundRadius(light, position.y);
      const distanceToCurb = Math.min(CURB_INNER_Z - position.z, CURB_INNER_X - position.x);
      expect(radius).toBeLessThan(distanceToCurb);
    }
  });
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
  test('each headlight lens keeps a large oval footprint (not a slit)', () => {
    const { car } = buildScene();
    const lenses = paleLensMeshes(car);
    expect(lenses.length).toBe(2);
    for (const lens of lenses) {
      const size = worldBox(lens).getSize(new THREE.Vector3());
      expect(size.x).toBeGreaterThanOrEqual(0.21);
      expect(Math.max(size.y, size.z)).toBeGreaterThanOrEqual(0.18);
    }
  });

  test('pale headlight lenses sit on the +z side of the car center', () => {
    const { scene, car } = buildScene();
    const centerZ = carBox(scene).getCenter(new THREE.Vector3()).z;
    const lenses = paleLensMeshes(car);
    expect(lenses.length).toBeGreaterThanOrEqual(2);
    for (const lens of lenses) expect(worldBox(lens).getCenter(new THREE.Vector3()).z).toBeGreaterThan(centerZ + 1);
  });

  test('the full-width red tail light bar sits on the -z side', () => {
    const { scene, car } = buildScene();
    const centerZ = carBox(scene).getCenter(new THREE.Vector3()).z;
    const bars = meshesWhere(car, (mesh, m) => {
      if (!(m instanceof THREE.MeshBasicMaterial) || !(m.color.r > 0.5 && m.color.g < 0.3 && m.color.b < 0.3)) return false;
      const size = worldBox(mesh).getSize(new THREE.Vector3());
      return size.x >= 1.2;
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

describe('the car is parked with the engine off: headlights dark, only hazards blink', () => {
  test('no mesh uses a near-white glowing MeshBasicMaterial (a lit headlight/DRL)', () => {
    const { car } = buildScene();
    const litWhite = meshesWhere(car, (_, m) => m instanceof THREE.MeshBasicMaterial && m.color.r > 0.85 && m.color.g > 0.85 && m.color.b > 0.85);
    expect(litWhite).toEqual([]);
  });

  test('every pale toon/standard mesh (headlight housings) has zero effective emissive', () => {
    const { car } = buildScene();
    const paleMeshes = meshesWhere(
      car,
      (_, m) =>
        (m instanceof THREE.MeshToonMaterial || m instanceof THREE.MeshStandardMaterial) &&
        m.color.r > 0.6 &&
        m.color.g > 0.6 &&
        m.color.b > 0.6,
    );
    expect(paleMeshes.length).toBeGreaterThan(0);
    for (const mesh of paleMeshes) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials as (THREE.MeshToonMaterial | THREE.MeshStandardMaterial)[]) {
        const emissive = material.emissive;
        const maxComponent = Math.max(emissive.r, emissive.g, emissive.b);
        expect(maxComponent * material.emissiveIntensity).toBe(0);
      }
    }
  });
});

function raycastFirst(origin: THREE.Vector3, direction: THREE.Vector3, targets: THREE.Object3D[]): THREE.Intersection | undefined {
  const raycaster = new THREE.Raycaster(origin, direction.clone().normalize());
  return raycaster.intersectObjects(targets, false)[0];
}

function bodyPaintMeshes(car: Car): THREE.Mesh[] {
  return meshesWhere(car, (_, m) => m instanceof THREE.MeshToonMaterial && m.color.r > 0.5 && m.color.g < 0.25 && m.color.b < 0.25);
}

function allCarMeshes(car: Car): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  car.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) meshes.push(mesh);
  });
  return meshes;
}

function tailLightMeshes(car: Car): THREE.Mesh[] {
  return meshesWhere(car, (_, m) => m instanceof THREE.MeshBasicMaterial && m.color.r > 0.5 && m.color.g < 0.3 && m.color.b < 0.3);
}

function outwardHorizontalDirection(point: THREE.Vector3, center: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(point.x - center.x, 0, point.z - center.z).normalize();
}

function wheelGroups(car: Car): THREE.Group[] {
  const groups: THREE.Group[] = [];
  for (const child of car.group.children) {
    if (!(child instanceof THREE.Group)) continue;
    const hasTire = child.children.some((c) => {
      const mesh = c as THREE.Mesh;
      if (!mesh.isMesh) return false;
      const geo = mesh.geometry as THREE.CylinderGeometry;
      return geo.type === 'CylinderGeometry' && Math.abs(geo.parameters.radiusTop - 0.34) < 0.01;
    });
    if (hasTire) groups.push(child);
  }
  return groups;
}

function namedMeshes(car: Car, name: string): THREE.Mesh[] {
  return allCarMeshes(car).filter((mesh) => mesh.name === name);
}

function paleLensMeshes(car: Car): THREE.Mesh[] {
  return namedMeshes(car, 'headlight-lens');
}

function allLightMeshes(car: Car): THREE.Mesh[] {
  return [...hazardMeshes(car), ...tailLightMeshes(car), ...paleLensMeshes(car)];
}

function worldTriangles(meshes: THREE.Mesh[]): THREE.Triangle[] {
  const triangles: THREE.Triangle[] = [];
  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false);
    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position;
    const index = geo.index;
    const count = index ? index.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      const ia = index ? index.getX(i) : i;
      const ib = index ? index.getX(i + 1) : i + 1;
      const ic = index ? index.getX(i + 2) : i + 2;
      const a = new THREE.Vector3().fromBufferAttribute(pos, ia).applyMatrix4(mesh.matrixWorld);
      const b = new THREE.Vector3().fromBufferAttribute(pos, ib).applyMatrix4(mesh.matrixWorld);
      const c = new THREE.Vector3().fromBufferAttribute(pos, ic).applyMatrix4(mesh.matrixWorld);
      triangles.push(new THREE.Triangle(a, b, c));
    }
  }
  return triangles;
}

function worldVertices(mesh: THREE.Mesh): THREE.Vector3[] {
  mesh.updateWorldMatrix(true, false);
  const pos = (mesh.geometry as THREE.BufferGeometry).attributes.position;
  const verts: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i++) {
    verts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
  }
  return verts;
}

function sortedByHorizontalDistance(mesh: THREE.Mesh, center: THREE.Vector3): THREE.Vector3[] {
  return worldVertices(mesh)
    .map((v) => ({ v, d: Math.hypot(v.x - center.x, v.z - center.z) }))
    .sort((a, b) => a.d - b.d)
    .map((x) => x.v);
}

function innerHalfVertices(mesh: THREE.Mesh, center: THREE.Vector3): THREE.Vector3[] {
  const sorted = sortedByHorizontalDistance(mesh, center);
  return sorted.slice(0, Math.max(1, Math.floor(sorted.length / 2)));
}

function lensRimVertices(lens: THREE.Mesh, body: THREE.Mesh[], bodyTriangles: THREE.Triangle[]): THREE.Vector3[] {
  const verts = worldVertices(lens);
  const apex = verts.reduce((best, v) => (distanceToBody(v, body, bodyTriangles) > distanceToBody(best, body, bodyTriangles) ? v : best));
  const byDistance = verts.slice().sort((a, b) => b.distanceTo(apex) - a.distanceTo(apex));
  return byDistance.slice(0, Math.max(1, Math.ceil(verts.length * 0.2)));
}

function outermostVertex(mesh: THREE.Mesh, center: THREE.Vector3): THREE.Vector3 {
  const sorted = sortedByHorizontalDistance(mesh, center);
  return sorted[sorted.length - 1];
}

function isInsideBody(point: THREE.Vector3, bodyMeshes: THREE.Mesh[]): boolean {
  const ray = new THREE.Ray(point, new THREE.Vector3(0.57, 0.61, 0.55).normalize());
  const hit = new THREE.Vector3();
  return bodyMeshes.some((mesh) => {
    let crossings = 0;
    for (const tri of worldTriangles([mesh])) {
      if (ray.intersectTriangle(tri.a, tri.b, tri.c, false, hit)) crossings++;
    }
    return crossings % 2 === 1;
  });
}

function distanceToBody(point: THREE.Vector3, bodyMeshes: THREE.Mesh[], bodyTriangles: THREE.Triangle[]): number {
  if (isInsideBody(point, bodyMeshes)) return 0;
  const closest = new THREE.Vector3();
  let min = Infinity;
  for (const tri of bodyTriangles) {
    tri.closestPointToPoint(point, closest);
    const d = closest.distanceTo(point);
    if (d < min) min = d;
  }
  return min;
}

describe('every car light sits on the body surface, neither floating nor buried', () => {
  test('the inward-facing back of every light mesh sits within 2cm of the red body surface', () => {
    const { scene, car } = buildScene();
    const centerWorld = carBox(scene).getCenter(new THREE.Vector3());
    const body = bodyPaintMeshes(car);
    const bodyTriangles = worldTriangles(body);
    const lights = allLightMeshes(car);
    expect(lights.length).toBeGreaterThan(0);
    const lenses = paleLensMeshes(car);
    for (const light of lights) {
      const backVertices = lenses.includes(light) ? lensRimVertices(light, body, bodyTriangles) : innerHalfVertices(light, centerWorld);
      for (const point of backVertices) {
        expect(distanceToBody(point, body, bodyTriangles)).toBeLessThanOrEqual(0.02);
      }
    }
  });

  test('no light mesh is buried in the body: from outside (level or looking down) the light is the first thing hit', () => {
    const { scene, car } = buildScene();
    const centerWorld = carBox(scene).getCenter(new THREE.Vector3());
    const all = allCarMeshes(car);
    const lights = allLightMeshes(car);
    const throughTailBar = tailLightBar(car);
    const wordmark = oneNamed(car, 'rear-wordmark');
    expect(lights.length).toBeGreaterThan(0);
    for (const light of lights) {
      const c = worldBox(light).getCenter(new THREE.Vector3());
      const d = outwardHorizontalDirection(c, centerWorld);
      const visible = [0, Math.PI / 6, Math.PI / 3].some((tilt) => {
        const dir = d.clone().multiplyScalar(Math.cos(tilt)).add(new THREE.Vector3(0, Math.sin(tilt), 0)).normalize();
        const hit = raycastFirst(c.clone().addScaledVector(dir, 1), dir.clone().negate(), all);
        return hit?.object === light || (light === throughTailBar && hit?.object === wordmark);
      });
      expect(visible).toBe(true);
    }
  });

  test('no light mesh juts out more than 3cm past the body surface, except the front headlight lens which may reach 7cm', () => {
    const { scene, car } = buildScene();
    const centerWorld = carBox(scene).getCenter(new THREE.Vector3());
    const body = bodyPaintMeshes(car);
    const bodyTriangles = worldTriangles(body);
    const lights = allLightMeshes(car);
    const lenses = paleLensMeshes(car);
    expect(lights.length).toBeGreaterThan(0);
    for (const light of lights) {
      const outer = outermostVertex(light, centerWorld);
      const limit = lenses.includes(light) ? 0.07 : 0.03;
      expect(distanceToBody(outer, body, bodyTriangles)).toBeLessThanOrEqual(limit);
    }
  });
});

const SIDES = [-1, 1] as const;

function sideOfMesh(car: Car, mesh: THREE.Mesh): number {
  return centerOf(mesh).x > bodyCenterX(car) ? 1 : -1;
}

function outwardX(box: THREE.Box3, side: number): number {
  return side > 0 ? box.max.x : box.min.x;
}

function bodySurfaceX(car: Car, side: number): number {
  return outwardX(bodyMainBox(car), side);
}

function meshesOnSide(car: Car, name: string, side: number): THREE.Mesh[] {
  return namedMeshes(car, name).filter((mesh) => sideOfMesh(car, mesh) === side);
}

function tiresOnSide(car: Car, side: number): THREE.Mesh[] {
  return wheelGroups(car)
    .map(tireMesh)
    .filter((tire) => sideOfMesh(car, tire) === side)
    .sort((a, b) => centerOf(a).z - centerOf(b).z);
}

function tireGap(car: Car, side: number): { rearEdge: number; frontEdge: number } {
  const [rear, front] = tiresOnSide(car, side);
  return { rearEdge: worldBox(rear).max.z, frontEdge: worldBox(front).min.z };
}

function isVisibleFromSide(car: Car, mesh: THREE.Mesh, side: number): boolean {
  const c = centerOf(mesh);
  const origin = new THREE.Vector3(bodySurfaceX(car, side) + side, c.y, c.z);
  const hit = raycastFirst(origin, new THREE.Vector3(-side, 0, 0), allCarMeshes(car));
  return hit !== undefined && hit.object === mesh;
}

function isDeepRed(c: THREE.Color): boolean {
  return c.r > 0.04 && c.r <= 0.5 && c.r >= 2 * c.g && c.r >= 2 * c.b;
}

function isBlack(c: THREE.Color): boolean {
  return c.r <= 0.08 && c.g <= 0.08 && c.b <= 0.08;
}

function colorOf(mesh: THREE.Mesh): THREE.Color {
  return materialsOf(mesh)[0].color;
}

function sideWindowBox(car: Car, side: number): THREE.Box3 {
  const panes = glassMeshes(car).filter((mesh) => worldXSpan(mesh) < 0.3 && sideOfMesh(car, mesh) === side);
  expect(panes.length).toBeGreaterThan(0);
  return panes.map(worldBox).reduce((all, box) => all.union(box));
}

function wheelCenterOf(wheel: THREE.Group): THREE.Vector3 {
  return centerOf(tireMesh(wheel));
}

function wheelSide(car: Car, wheel: THREE.Group): number {
  return sideOfMesh(car, tireMesh(wheel));
}

function wheelPartsNamed(wheel: THREE.Group, name: string): THREE.Mesh[] {
  return wheel.children.filter((c) => c.name === name) as THREE.Mesh[];
}

function rimMesh(wheel: THREE.Group): THREE.Mesh {
  return wheel.children.find((c) => c.name === '' && c !== tireMesh(wheel)) as THREE.Mesh;
}

function radialDistance(point: THREE.Vector3, center: THREE.Vector3): number {
  return Math.hypot(point.y - center.y, point.z - center.z);
}

function rimRadius(wheel: THREE.Group): number {
  return sizeOf(rimMesh(wheel)).y / 2;
}

function isUnlit(mesh: THREE.Mesh): boolean {
  return materialsOf(mesh).every((m) => (!m.emissive || m.emissive.getHex() === 0) && luminanceOf(m.color) < 0.97);
}

function wheelOutwardOffset(car: Car, wheel: THREE.Group, part: THREE.Mesh): number {
  const side = wheelSide(car, wheel);
  return (outwardX(worldBox(part), side) - outwardX(worldBox(tireMesh(wheel)), side)) * side;
}

const SIDE_PART_COUNTS: [string, number][] = [['door-line', 6], ['door-handle', 2], ['side-skirt', 2], ['window-pillar', 2]];

describe('the porsche side carries door seams, door handles, side skirts and window pillars', () => {
  test.each(SIDE_PART_COUNTS)('the car has the expected number of meshes named %s (%i)', (name, count) => {
    const { car } = buildScene();
    expect(namedMeshes(car, name).length).toBe(count);
  });

  test('each side has 3 door seams: 2 vertical and 1 horizontal', () => {
    const { car } = buildScene();
    for (const side of SIDES) {
      const lines = meshesOnSide(car, 'door-line', side);
      expect(lines.length).toBe(3);
      expect(lines.filter((l) => sizeOf(l).y > sizeOf(l).z).length).toBe(2);
      expect(lines.filter((l) => sizeOf(l).z > sizeOf(l).y).length).toBe(1);
    }
  });

  test('door seams are deep red, not the body paint red', () => {
    const { car } = buildScene();
    const lines = namedMeshes(car, 'door-line');
    expect(lines.length).toBe(6);
    for (const line of lines) {
      expect(isDeepRed(colorOf(line))).toBe(true);
      expect(bodyPaintMeshes(car)).not.toContain(line);
    }
  });

  test('door seams lie between the front and rear tires and stand at most 1cm proud of the body side', () => {
    const { car } = buildScene();
    for (const side of SIDES) {
      const { rearEdge, frontEdge } = tireGap(car, side);
      const lines = meshesOnSide(car, 'door-line', side);
      expect(lines.length).toBe(3);
      for (const line of lines) {
        const box = worldBox(line);
        expect(box.min.z).toBeGreaterThanOrEqual(rearEdge);
        expect(box.max.z).toBeLessThanOrEqual(frontEdge);
        expect((outwardX(box, side) - bodySurfaceX(car, side)) * side).toBeLessThanOrEqual(0.01);
      }
    }
  });

  test('door seams are visible from straight outside the side', () => {
    const { car } = buildScene();
    const lines = namedMeshes(car, 'door-line');
    expect(lines.length).toBe(6);
    for (const line of lines) {
      expect(isVisibleFromSide(car, line, sideOfMesh(car, line))).toBe(true);
    }
  });

  test('each door handle is 10 to 16cm long, between the two vertical seams and above the horizontal seam', () => {
    const { car } = buildScene();
    for (const side of SIDES) {
      const handles = meshesOnSide(car, 'door-handle', side);
      expect(handles.length).toBe(1);
      const lines = meshesOnSide(car, 'door-line', side);
      const vertical = lines.filter((l) => sizeOf(l).y > sizeOf(l).z).map((l) => centerOf(l).z).sort((a, b) => a - b);
      const horizontal = lines.filter((l) => sizeOf(l).z > sizeOf(l).y)[0];
      expect(vertical.length).toBe(2);
      expect(horizontal).toBeDefined();
      const box = worldBox(handles[0]);
      const length = Math.max(...box.getSize(new THREE.Vector3()).toArray());
      expect(length).toBeGreaterThanOrEqual(0.1);
      expect(length).toBeLessThanOrEqual(0.16);
      expect(box.min.z).toBeGreaterThanOrEqual(vertical[0]);
      expect(box.max.z).toBeLessThanOrEqual(vertical[1]);
      expect(box.min.y).toBeGreaterThanOrEqual(centerOf(horizontal).y);
    }
  });

  test('door handles are visible from straight outside the side', () => {
    const { car } = buildScene();
    const handles = namedMeshes(car, 'door-handle');
    expect(handles.length).toBe(2);
    for (const handle of handles) {
      expect(isVisibleFromSide(car, handle, sideOfMesh(car, handle))).toBe(true);
    }
  });

  test('each side skirt is black, at least 1.3m long, at most 6cm tall, between the tires and no further out than the tire outer face', () => {
    const { car } = buildScene();
    for (const side of SIDES) {
      const skirts = meshesOnSide(car, 'side-skirt', side);
      expect(skirts.length).toBe(1);
      const box = worldBox(skirts[0]);
      const { rearEdge, frontEdge } = tireGap(car, side);
      const tireOuter = Math.max(...tiresOnSide(car, side).map((t) => (outwardX(worldBox(t), side)) * side));
      expect(isBlack(colorOf(skirts[0]))).toBe(true);
      expect(box.max.z - box.min.z).toBeGreaterThanOrEqual(1.3);
      expect(box.max.y - box.min.y).toBeLessThanOrEqual(0.06);
      expect(box.min.z).toBeGreaterThanOrEqual(rearEdge);
      expect(box.max.z).toBeLessThanOrEqual(frontEdge);
      expect(outwardX(box, side) * side).toBeLessThanOrEqual(tireOuter);
    }
  });

  test('side skirts are visible from straight outside the side', () => {
    const { car } = buildScene();
    const skirts = namedMeshes(car, 'side-skirt');
    expect(skirts.length).toBe(2);
    for (const skirt of skirts) {
      expect(isVisibleFromSide(car, skirt, sideOfMesh(car, skirt))).toBe(true);
    }
  });

  test('each window pillar is black, inside the side window front-back and height range, within 1cm of the window surface', () => {
    const { car } = buildScene();
    for (const side of SIDES) {
      const pillars = meshesOnSide(car, 'window-pillar', side);
      expect(pillars.length).toBe(1);
      const box = worldBox(pillars[0]);
      const window = sideWindowBox(car, side);
      expect(isBlack(colorOf(pillars[0]))).toBe(true);
      expect(box.min.z).toBeGreaterThanOrEqual(window.min.z);
      expect(box.max.z).toBeLessThanOrEqual(window.max.z);
      expect(box.min.y).toBeGreaterThanOrEqual(window.min.y);
      expect(box.max.y).toBeLessThanOrEqual(window.max.y);
      const gapX = Math.max(0, box.min.x - window.max.x, window.min.x - box.max.x);
      expect(gapX).toBeLessThanOrEqual(0.01);
    }
  });

  test('window pillars are visible from straight outside the side', () => {
    const { car } = buildScene();
    const pillars = namedMeshes(car, 'window-pillar');
    expect(pillars.length).toBe(2);
    for (const pillar of pillars) {
      expect(isVisibleFromSide(car, pillar, sideOfMesh(car, pillar))).toBe(true);
    }
  });

  test('side parts are not emissive and their color luminance is below 0.97', () => {
    const { car } = buildScene();
    const parts = SIDE_PART_COUNTS.flatMap(([name]) => namedMeshes(car, name));
    expect(parts.length).toBe(12);
    for (const part of parts) expect(isUnlit(part)).toBe(true);
  });
});

describe('each wheel has a tire, a rim, 5 spokes, a hub cap and a caliper', () => {
  test('there are exactly 4 wheel groups (one per corner)', () => {
    const { car } = buildScene();
    expect(wheelGroups(car).length).toBe(4);
  });

  test('each wheel group has exactly 9 meshes: 1 tire, 1 rim, 5 spokes, 1 hub cap, 1 caliper', () => {
    const { car } = buildScene();
    for (const wheel of wheelGroups(car)) {
      expect(wheel.children.length).toBe(9);
      expect(wheel.children.filter((c) => c === tireMesh(wheel)).length).toBe(1);
      expect(wheel.children.filter((c) => c.name === '' && c !== tireMesh(wheel)).length).toBe(1);
      expect(wheelPartsNamed(wheel, 'wheel-spoke').length).toBe(5);
      expect(wheelPartsNamed(wheel, 'wheel-hub').length).toBe(1);
      expect(wheelPartsNamed(wheel, 'wheel-caliper').length).toBe(1);
    }
  });

  test.each([['wheel-spoke', 20], ['wheel-hub', 4], ['wheel-caliper', 4]] as [string, number][])('the car has the expected number of meshes named %s (%i)', (name, count) => {
    const { car } = buildScene();
    expect(namedMeshes(car, name).length).toBe(count);
  });

  test('the 5 spokes are 72 degrees apart around the wheel center, within 2 degrees', () => {
    const { car } = buildScene();
    expect(wheelGroups(car).length).toBe(4);
    for (const wheel of wheelGroups(car)) {
      const center = wheelCenterOf(wheel);
      const spokes = wheelPartsNamed(wheel, 'wheel-spoke');
      expect(spokes.length).toBe(5);
      const angles = spokes
        .map((s) => {
          const c = centerOf(s);
          return (Math.atan2(c.y - center.y, c.z - center.z) * 180) / Math.PI;
        })
        .sort((a, b) => a - b);
      for (let i = 0; i < 5; i++) {
        const next = i === 4 ? angles[0] + 360 : angles[i + 1];
        expect(Math.abs(next - angles[i] - 72)).toBeLessThanOrEqual(2);
      }
    }
  });

  test('every spoke vertex stays within the rim radius of the wheel center', () => {
    const { car } = buildScene();
    expect(wheelGroups(car).length).toBe(4);
    for (const wheel of wheelGroups(car)) {
      const center = wheelCenterOf(wheel);
      const radius = rimRadius(wheel);
      const spokes = wheelPartsNamed(wheel, 'wheel-spoke');
      expect(spokes.length).toBe(5);
      for (const spoke of spokes) {
        for (const v of worldVertices(spoke)) expect(radialDistance(v, center)).toBeLessThanOrEqual(radius + 0.002);
      }
    }
  });

  test('looking straight at each wheel from outside, every spoke is the first thing hit at its center', () => {
    const { car } = buildScene();
    expect(wheelGroups(car).length).toBe(4);
    for (const wheel of wheelGroups(car)) {
      const side = wheelSide(car, wheel);
      const spokes = wheelPartsNamed(wheel, 'wheel-spoke');
      expect(spokes.length).toBe(5);
      for (const spoke of spokes) {
        expect(isVisibleFromSide(car, spoke, side)).toBe(true);
      }
    }
  });

  test('each caliper is reddish, centered above the wheel center and within the rim radius', () => {
    const { car } = buildScene();
    expect(wheelGroups(car).length).toBe(4);
    for (const wheel of wheelGroups(car)) {
      const calipers = wheelPartsNamed(wheel, 'wheel-caliper');
      expect(calipers.length).toBe(1);
      const color = colorOf(calipers[0]);
      const c = centerOf(calipers[0]);
      const center = wheelCenterOf(wheel);
      expect(color.r).toBeGreaterThan(color.g);
      expect(color.r).toBeGreaterThan(color.b);
      expect(c.y).toBeGreaterThan(center.y);
      expect(radialDistance(c, center)).toBeLessThanOrEqual(rimRadius(wheel));
    }
  });

  test('looking straight at each wheel from outside, part of the caliper is not hidden by spokes or the hub cap', () => {
    const { car } = buildScene();
    expect(wheelGroups(car).length).toBe(4);
    for (const wheel of wheelGroups(car)) {
      const side = wheelSide(car, wheel);
      const calipers = wheelPartsNamed(wheel, 'wheel-caliper');
      expect(calipers.length).toBe(1);
      const box = worldBox(calipers[0]);
      const targets = allCarMeshes(car);
      let seen = false;
      for (let i = 0; i <= 6 && !seen; i++) {
        for (let j = 0; j <= 6 && !seen; j++) {
          const origin = new THREE.Vector3(bodySurfaceX(car, side) + side, box.min.y + ((box.max.y - box.min.y) * i) / 6, box.min.z + ((box.max.z - box.min.z) * j) / 6);
          const hit = raycastFirst(origin, new THREE.Vector3(-side, 0, 0), targets);
          seen = hit !== undefined && hit.object === calipers[0];
        }
      }
      expect(seen).toBe(true);
    }
  });

  test('spokes, hub cap and caliper stay within 2cm past the tire outer face', () => {
    const { car } = buildScene();
    expect(wheelGroups(car).length).toBe(4);
    for (const wheel of wheelGroups(car)) {
      const parts = [...wheelPartsNamed(wheel, 'wheel-spoke'), ...wheelPartsNamed(wheel, 'wheel-hub'), ...wheelPartsNamed(wheel, 'wheel-caliper')];
      expect(parts.length).toBe(7);
      for (const part of parts) expect(wheelOutwardOffset(car, wheel, part)).toBeLessThanOrEqual(0.02);
    }
  });

  test('every wheel part is not emissive and its color luminance is below 0.97', () => {
    const { car } = buildScene();
    expect(wheelGroups(car).length).toBe(4);
    for (const wheel of wheelGroups(car)) {
      expect(wheel.children.length).toBe(9);
      for (const part of wheel.children) expect(isUnlit(part as THREE.Mesh)).toBe(true);
    }
  });
});

describe('the body does not overhang the outer face of the tires', () => {
  test('a ray from above and outboard of each wheel, aimed inward, hits the wheel before the red body', () => {
    const { scene, car } = buildScene();
    const centerWorld = carBox(scene).getCenter(new THREE.Vector3());
    const body = bodyPaintMeshes(car);
    const groups = wheelGroups(car);
    expect(groups.length).toBeGreaterThan(0);
    for (const wheel of groups) {
      const wheelCenter = new THREE.Vector3();
      wheel.getWorldPosition(wheelCenter);
      const d = outwardHorizontalDirection(wheelCenter, centerWorld);
      const origin = wheelCenter.clone().addScaledVector(d, 1);
      origin.y += 0.22;
      const wheelMeshes = wheel.children.filter((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh[];
      const hit = raycastFirst(origin, d.clone().negate(), [...wheelMeshes, ...body]);
      expect(hit && wheelMeshes.includes(hit.object as THREE.Mesh)).toBe(true);
    }
  });
});

function glassMeshes(car: Car): THREE.Mesh[] {
  const glassColor = new THREE.Color('#1b2436');
  return meshesWhere(
    car,
    (_, m) =>
      m instanceof THREE.MeshToonMaterial &&
      Math.abs(m.color.r - glassColor.r) < 0.02 &&
      Math.abs(m.color.g - glassColor.g) < 0.02 &&
      Math.abs(m.color.b - glassColor.b) < 0.02,
  );
}

function localX(car: Car, worldPoint: THREE.Vector3): number {
  return car.group.worldToLocal(worldPoint.clone()).x;
}

function worldXSpan(mesh: THREE.Mesh): number {
  const xs = worldVertices(mesh).map((v) => v.x);
  return Math.max(...xs) - Math.min(...xs);
}

describe('windows hug the body: windshield, rear window and side glass sit within 1 cm of the body surface', () => {
  test('at least 4 meshes use the dark glass material (windshield, rear window, two side windows)', () => {
    const { car } = buildScene();
    expect(glassMeshes(car).length).toBeGreaterThanOrEqual(4);
  });

  test('glass spans both the nose side and the tail side along the body length (local x)', () => {
    const { car } = buildScene();
    const xs = glassMeshes(car).map((mesh) => localX(car, worldBox(mesh).getCenter(new THREE.Vector3())));
    expect(Math.max(...xs)).toBeGreaterThan(0);
    expect(Math.min(...xs)).toBeLessThan(0);
  });

  test('every glass vertex sits within 1cm of the body surface', () => {
    const { car } = buildScene();
    const body = bodyPaintMeshes(car);
    const bodyTriangles = worldTriangles(body);
    const glass = glassMeshes(car);
    expect(glass.length).toBeGreaterThan(0);
    for (const pane of glass) {
      for (const point of worldVertices(pane)) {
        expect(distanceToBody(point, body, bodyTriangles)).toBeLessThanOrEqual(0.01);
      }
    }
  });

  test('each glass pane has at least 90% of its vertices outside the body', () => {
    const { car } = buildScene();
    const body = bodyPaintMeshes(car);
    for (const pane of glassMeshes(car)) {
      const verts = worldVertices(pane);
      const inside = verts.filter((v) => isInsideBody(v, body)).length;
      expect(inside / verts.length).toBeLessThan(0.1);
    }
  });

  test('the windshield spans at least 0.8m across the body width (world x)', () => {
    const { car } = buildScene();
    const nonSideWindows = glassMeshes(car).filter((mesh) => worldXSpan(mesh) > 0.05);
    const windshield = nonSideWindows.reduce((nose, mesh) =>
      localX(car, worldBox(mesh).getCenter(new THREE.Vector3())) > localX(car, worldBox(nose).getCenter(new THREE.Vector3())) ? mesh : nose,
    );
    expect(worldXSpan(windshield)).toBeGreaterThanOrEqual(0.8);
  });
});

function tireMesh(wheel: THREE.Group): THREE.Mesh {
  return wheel.children.find((c) => {
    const geo = (c as THREE.Mesh).geometry as THREE.CylinderGeometry | undefined;
    return geo?.type === 'CylinderGeometry' && Math.abs(geo.parameters.radiusTop - 0.34) < 0.01;
  }) as THREE.Mesh;
}

function bodyMainBox(car: Car): THREE.Box3 {
  const volume = (box: THREE.Box3) => {
    const size = box.getSize(new THREE.Vector3());
    return size.x * size.y * size.z;
  };
  return bodyPaintMeshes(car)
    .map(worldBox)
    .reduce((largest, box) => (volume(box) > volume(largest) ? box : largest));
}

function wheelSpecs(car: Car) {
  const mainBox = bodyMainBox(car);
  const bodyCenterX = mainBox.getCenter(new THREE.Vector3()).x;
  return wheelGroups(car).map((wheel) => {
    const box = worldBox(tireMesh(wheel));
    const center = box.getCenter(new THREE.Vector3());
    const side = center.x > bodyCenterX ? 1 : -1;
    return {
      radius: (box.max.y - box.min.y) / 2,
      centerY: center.y,
      centerZ: center.z,
      top: box.max.y,
      side,
      outerX: side > 0 ? mainBox.max.x : mainBox.min.x,
    };
  });
}

describe('wheel arch hugs the tire and does not cut through the body top edge', () => {
  test('on the side view, paint 4cm outside the tire between 30 and 60 degrees from straight up is within 0.3cm of the outer face', () => {
    const { car } = buildScene();
    const specs = wheelSpecs(car);
    expect(specs.length).toBe(4);
    for (const spec of specs) {
      for (const direction of [-1, 1]) {
        for (const degrees of [30, 45, 60]) {
          const angle = (degrees * Math.PI) / 180;
          const r = spec.radius + 0.04;
          const origin = new THREE.Vector3(
            spec.outerX + spec.side,
            spec.centerY + r * Math.cos(angle),
            spec.centerZ + direction * r * Math.sin(angle),
          );
          const hit = raycastFirst(origin, new THREE.Vector3(-spec.side, 0, 0), allCarMeshes(car));
          expect(hit !== undefined && bodyPaintMeshes(car).includes(hit.object as THREE.Mesh)).toBe(true);
          expect(Math.abs(spec.outerX - hit!.point.x)).toBeLessThanOrEqual(0.003);
        }
      }
    }
  });

  test('the paint top above each tire is at least 3cm higher than the tire top', () => {
    const { car } = buildScene();
    for (const spec of wheelSpecs(car)) {
      const origin = new THREE.Vector3(spec.outerX - spec.side * 0.03, spec.top + 3, spec.centerZ);
      const hit = raycastFirst(origin, new THREE.Vector3(0, -1, 0), bodyPaintMeshes(car));
      expect(hit).toBeDefined();
      expect(hit!.point.y).toBeGreaterThanOrEqual(spec.top + 0.03);
    }
  });

  test('2.5cm above each tire top, a ray along world x from outside hits the paint', () => {
    const { car } = buildScene();
    for (const spec of wheelSpecs(car)) {
      const origin = new THREE.Vector3(spec.outerX + spec.side, spec.top + 0.025, spec.centerZ);
      const hit = raycastFirst(origin, new THREE.Vector3(-spec.side, 0, 0), bodyPaintMeshes(car));
      expect(hit).toBeDefined();
      expect(Math.abs(spec.outerX - hit!.point.x)).toBeLessThanOrEqual(0.003);
    }
  });
});

type PlateSide = 'front' | 'rear';

function platesOf(car: Car): THREE.Mesh[] {
  return allCarMeshes(car).filter((mesh) => mesh.name.startsWith('license-plate-'));
}

function plate(car: Car, side: PlateSide): THREE.Mesh {
  const mesh = car.group.getObjectByName(`license-plate-${side}`) as THREE.Mesh | undefined;
  expect(mesh).toBeDefined();
  return mesh!;
}

function plateMaterial(mesh: THREE.Mesh): any {
  return Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
}

function luminanceOf(c: THREE.Color): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

function colorNear(a: THREE.Color, hex: string): boolean {
  const b = new THREE.Color(hex);
  return Math.abs(a.r - b.r) < 0.02 && Math.abs(a.g - b.g) < 0.02 && Math.abs(a.b - b.b) < 0.02;
}

function nonPlateMeshes(car: Car): THREE.Mesh[] {
  return allCarMeshes(car).filter((mesh) => !mesh.name.startsWith('license-plate-'));
}

function raycastBothSides(origin: THREE.Vector3, direction: THREE.Vector3, targets: THREE.Mesh[], keepSingleSided: THREE.Mesh[] = []): THREE.Intersection | undefined {
  const doubled = targets.filter((mesh) => !keepSingleSided.includes(mesh));
  const originalSides = doubled.map((mesh) => plateMaterialSides(mesh));
  for (const mesh of doubled) setSides(mesh, THREE.DoubleSide);
  const hit = raycastFirst(origin, direction, targets);
  doubled.forEach((mesh, i) => restoreSides(mesh, originalSides[i]));
  return hit;
}

function plateMaterialSides(mesh: THREE.Mesh): THREE.Side[] {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.map((m) => m.side);
}

function setSides(mesh: THREE.Mesh, side: THREE.Side): void {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const m of materials) m.side = side;
}

function restoreSides(mesh: THREE.Mesh, sides: THREE.Side[]): void {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((m, i) => { m.side = sides[i]; });
}

describe('the porsche carries two Japanese license plates, one on the nose and one on the tail', () => {
  test('exactly 2 meshes are named license-plate-*', () => {
    const { car } = buildScene();
    expect(platesOf(car).length).toBe(2);
  });

  test('the front plate sits on the +z side of the body center and the rear plate on the -z side', () => {
    const { scene, car } = buildScene();
    const centerZ = carBox(scene).getCenter(new THREE.Vector3()).z;
    expect(worldBox(plate(car, 'front')).getCenter(new THREE.Vector3()).z).toBeGreaterThan(centerZ);
    expect(worldBox(plate(car, 'rear')).getCenter(new THREE.Vector3()).z).toBeLessThan(centerZ);
  });

  test.each(['front', 'rear'] as PlateSide[])('the %s plate is 0.297m wide and 0.149m tall in the world, within 1cm', (side) => {
    const { car } = buildScene();
    const size = worldBox(plate(car, side)).getSize(new THREE.Vector3());
    expect(Math.abs(size.x - 0.297)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(size.y - 0.149)).toBeLessThanOrEqual(0.01);
  });

  test.each(['front', 'rear'] as PlateSide[])('the %s plate is centered on the body center line within 1cm', (side) => {
    const { scene, car } = buildScene();
    const bodyX = carBox(scene).getCenter(new THREE.Vector3()).x;
    expect(Math.abs(worldBox(plate(car, side)).getCenter(new THREE.Vector3()).x - bodyX)).toBeLessThanOrEqual(0.01);
  });

  test.each(['front', 'rear'] as PlateSide[])('the %s plate center is 0.40 to 0.50m above the parking lot ground', (side) => {
    const { car } = buildScene();
    const height = worldBox(plate(car, side)).getCenter(new THREE.Vector3()).y - CAR_CENTER[1];
    expect(height).toBeGreaterThanOrEqual(0.4);
    expect(height).toBeLessThanOrEqual(0.5);
  });

  test('the rear plate is entirely below the full-width tail light bar and above the exhaust pipes', () => {
    const { car } = buildScene();
    const bars = tailLightMeshes(car).filter((mesh) => worldBox(mesh).getSize(new THREE.Vector3()).x >= 1.2);
    const exhausts = namedMeshes(car, 'exhaust-tip');
    expect(bars.length).toBeGreaterThan(0);
    expect(exhausts.length).toBeGreaterThan(0);
    const box = worldBox(plate(car, 'rear'));
    expect(box.max.y).toBeLessThan(Math.min(...bars.map((mesh) => worldBox(mesh).min.y)));
    expect(box.min.y).toBeGreaterThan(Math.max(...exhausts.map((mesh) => worldBox(mesh).max.y)));
  });

  test('the front plate is entirely above the air intakes and its top is not higher than the headlight lenses bottom', () => {
    const { scene, car } = buildScene();
    const centerZ = carBox(scene).getCenter(new THREE.Vector3()).z;
    const intakes = meshesWhere(
      car,
      (mesh, m) =>
        m instanceof THREE.MeshToonMaterial &&
        colorNear(m.color, '#16171d') &&
        worldBox(mesh).getCenter(new THREE.Vector3()).z > centerZ + 1.5,
    );
    const lenses = paleLensMeshes(car);
    expect(intakes.length).toBeGreaterThan(0);
    expect(lenses.length).toBeGreaterThan(0);
    const box = worldBox(plate(car, 'front'));
    expect(box.min.y).toBeGreaterThan(Math.max(...intakes.map((mesh) => worldBox(mesh).max.y)));
    expect(box.max.y).toBeLessThanOrEqual(Math.min(...lenses.map((mesh) => worldBox(mesh).min.y)));
  });

  test.each([['front', -1], ['rear', 1]] as [PlateSide, number][])('the %s plate back is within 3cm of the car part right behind it', (side, inward) => {
    const { car } = buildScene();
    const mesh = plate(car, side);
    const center = worldBox(mesh).getCenter(new THREE.Vector3());
    const hit = raycastBothSides(center, new THREE.Vector3(0, 0, inward), nonPlateMeshes(car));
    expect(hit).toBeDefined();
    expect(hit!.distance).toBeLessThanOrEqual(0.03);
  });

  test.each([['front', 1], ['rear', -1]] as [PlateSide, number][])('looking at the %s plate from 1m in front, the center and the four corners hit the plate first', (side, outward) => {
    const { car } = buildScene();
    const mesh = plate(car, side);
    const box = worldBox(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const targets = [mesh, ...nonPlateMeshes(car)];
    const points = [
      center,
      new THREE.Vector3(box.min.x + 0.01, box.min.y + 0.01, center.z),
      new THREE.Vector3(box.max.x - 0.01, box.min.y + 0.01, center.z),
      new THREE.Vector3(box.min.x + 0.01, box.max.y - 0.01, center.z),
      new THREE.Vector3(box.max.x - 0.01, box.max.y - 0.01, center.z),
    ];
    for (const point of points) {
      const origin = point.clone().add(new THREE.Vector3(0, 0, outward));
      const hit = raycastBothSides(origin, new THREE.Vector3(0, 0, -outward), targets, [mesh]);
      expect(hit?.object).toBe(mesh);
    }
  });

  test.each(['front', 'rear'] as PlateSide[])('the %s plate does not glow: not a basic material, black emissive, color luminance under 0.97', (side) => {
    const { car } = buildScene();
    const material = plateMaterial(plate(car, side));
    expect(material instanceof THREE.MeshBasicMaterial).toBe(false);
    if (material.emissive) expect(Math.max(material.emissive.r, material.emissive.g, material.emissive.b) * material.emissiveIntensity).toBe(0);
    expect(luminanceOf(material.color)).toBeLessThan(0.97);
  });

  test('the plates add no lights: the car group still has exactly 4 point lights', () => {
    const { car } = buildScene();
    expect(platesOf(car).length).toBe(2);
    let lights = 0;
    car.group.traverse((obj) => {
      if ((obj as THREE.PointLight).isPointLight) lights++;
    });
    expect(lights).toBe(4);
  });

  test.each(['front', 'rear'] as PlateSide[])('the %s plate is a thin slab with its characters on a texture map', (side) => {
    const { car } = buildScene();
    const mesh = plate(car, side);
    expect(worldBox(mesh).getSize(new THREE.Vector3()).z).toBeLessThanOrEqual(0.05);
    expect(plateMaterial(mesh).map).toBeTruthy();
  });
});

function oneNamed(car: Car, name: string): THREE.Mesh {
  const found = namedMeshes(car, name);
  expect(found.length).toBe(1);
  return found[0];
}

function tailLightBar(car: Car): THREE.Mesh {
  const bars = tailLightMeshes(car).filter((mesh) => worldBox(mesh).getSize(new THREE.Vector3()).x >= 1.2);
  expect(bars.length).toBe(1);
  return bars[0];
}

function highBrakeLight(car: Car): THREE.Mesh {
  const lamps = tailLightMeshes(car).filter((mesh) => {
    const x = worldBox(mesh).getSize(new THREE.Vector3()).x;
    return x > 0.3 && x < 0.6;
  });
  expect(lamps.length).toBeGreaterThan(0);
  return lamps.reduce((top, mesh) => (worldBox(mesh).getCenter(new THREE.Vector3()).y > worldBox(top).getCenter(new THREE.Vector3()).y ? mesh : top));
}

function rearWindow(car: Car): THREE.Mesh {
  return glassMeshes(car).reduce((rear, mesh) => (worldBox(mesh).getCenter(new THREE.Vector3()).z < worldBox(rear).getCenter(new THREE.Vector3()).z ? mesh : rear));
}

function bodyCenterX(car: Car): number {
  return bodyMainBox(car).getCenter(new THREE.Vector3()).x;
}

function centerOf(mesh: THREE.Mesh): THREE.Vector3 {
  return worldBox(mesh).getCenter(new THREE.Vector3());
}

function sizeOf(mesh: THREE.Mesh): THREE.Vector3 {
  return worldBox(mesh).getSize(new THREE.Vector3());
}

const REAR_PART_NAMES = ['rear-wordmark', 'plate-recess', 'rear-diffuser', 'exhaust-tip', 'exhaust-inner', 'rear-reflector', 'engine-grille-slat'];

describe('the porsche tail carries a wordmark, a plate recess, a diffuser, exhaust tips, reflectors and engine-cover slats', () => {
  test.each([['rear-wordmark', 1], ['plate-recess', 1], ['rear-diffuser', 1], ['exhaust-tip', 2], ['exhaust-inner', 2], ['rear-reflector', 2], ['engine-grille-slat', 9]] as [string, number][])('there is the expected number of meshes named %s', (name, count) => {
    const { car } = buildScene();
    expect(namedMeshes(car, name).length).toBe(count);
  });

  test('the wordmark is at least 0.40m wide and centered on the body center line within 2cm', () => {
    const { car } = buildScene();
    const mesh = oneNamed(car, 'rear-wordmark');
    expect(sizeOf(mesh).x).toBeGreaterThanOrEqual(0.4);
    expect(Math.abs(centerOf(mesh).x - bodyCenterX(car))).toBeLessThanOrEqual(0.02);
  });

  test('the wordmark lies inside the height range of the full-width tail light bar and within 1cm of its surface', () => {
    const { car } = buildScene();
    const word = worldBox(oneNamed(car, 'rear-wordmark'));
    const bar = worldBox(tailLightBar(car));
    expect(word.min.y).toBeGreaterThanOrEqual(bar.min.y);
    expect(word.max.y).toBeLessThanOrEqual(bar.max.y);
    const gap = Math.max(0, word.min.z - bar.max.z, bar.min.z - word.max.z);
    expect(gap).toBeLessThanOrEqual(0.01);
  });

  test('the wordmark characters are on a texture map', () => {
    const { car } = buildScene();
    expect(plateMaterial(oneNamed(car, 'rear-wordmark')).map).toBeTruthy();
  });

  test('looking at the wordmark from 1m behind the car, the center and the four corners hit the wordmark first', () => {
    const { car } = buildScene();
    const mesh = oneNamed(car, 'rear-wordmark');
    const box = worldBox(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const targets = [mesh, ...allCarMeshes(car).filter((m) => m !== mesh)];
    const points = [
      center,
      new THREE.Vector3(box.min.x + 0.01, box.min.y + 0.01, center.z),
      new THREE.Vector3(box.max.x - 0.01, box.min.y + 0.01, center.z),
      new THREE.Vector3(box.min.x + 0.01, box.max.y - 0.01, center.z),
      new THREE.Vector3(box.max.x - 0.01, box.max.y - 0.01, center.z),
    ];
    for (const point of points) {
      const hit = raycastBothSides(point.clone().add(new THREE.Vector3(0, 0, -1)), new THREE.Vector3(0, 0, 1), targets, [mesh]);
      expect(hit?.object).toBe(mesh);
    }
  });

  test('the plate recess is deep red, 0.43m wide and 0.19m tall within 2cm, centered on the body', () => {
    const { car } = buildScene();
    const mesh = oneNamed(car, 'plate-recess');
    const color = plateMaterial(mesh).color as THREE.Color;
    expect(color.r).toBeGreaterThan(0.15);
    expect(color.r).toBeLessThan(0.5);
    expect(color.g).toBeLessThan(color.r * 0.4);
    expect(color.b).toBeLessThan(color.r * 0.4);
    const size = sizeOf(mesh);
    expect(Math.abs(size.x - 0.43)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(size.y - 0.19)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(centerOf(mesh).x - bodyCenterX(car))).toBeLessThanOrEqual(0.02);
  });

  test('the plate recess is entirely below the tail light bar and above the exhaust tips', () => {
    const { car } = buildScene();
    const recess = worldBox(oneNamed(car, 'plate-recess'));
    expect(recess.max.y).toBeLessThanOrEqual(worldBox(tailLightBar(car)).min.y);
    expect(recess.min.y).toBeGreaterThanOrEqual(Math.max(...namedMeshes(car, 'exhaust-tip').map((mesh) => worldBox(mesh).max.y)));
  });

  test('the rear plate front projection lies inside the plate recess', () => {
    const { car } = buildScene();
    const recess = worldBox(oneNamed(car, 'plate-recess'));
    const box = worldBox(plate(car, 'rear'));
    expect(box.min.x).toBeGreaterThanOrEqual(recess.min.x);
    expect(box.max.x).toBeLessThanOrEqual(recess.max.x);
    expect(box.min.y).toBeGreaterThanOrEqual(recess.min.y);
    expect(box.max.y).toBeLessThanOrEqual(recess.max.y);
  });

  test('the rear plate back at its center and four corners is within 3cm of the recess surface', () => {
    const { car } = buildScene();
    const recess = oneNamed(car, 'plate-recess');
    const triangles = worldTriangles([recess]);
    const box = worldBox(plate(car, 'rear'));
    const z = box.max.z;
    const points = [
      new THREE.Vector3((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, z),
      new THREE.Vector3(box.min.x + 0.01, box.min.y + 0.01, z),
      new THREE.Vector3(box.max.x - 0.01, box.min.y + 0.01, z),
      new THREE.Vector3(box.min.x + 0.01, box.max.y - 0.01, z),
      new THREE.Vector3(box.max.x - 0.01, box.max.y - 0.01, z),
    ];
    for (const point of points) {
      expect(distanceToBody(point, [recess], triangles)).toBeLessThanOrEqual(0.03);
    }
  });

  test('the diffuser is black, 0.18m tall within 2cm, and at least 70% as wide as the body', () => {
    const { car } = buildScene();
    const mesh = oneNamed(car, 'rear-diffuser');
    const color = plateMaterial(mesh).color as THREE.Color;
    expect(Math.max(color.r, color.g, color.b)).toBeLessThan(0.12);
    const size = sizeOf(mesh);
    expect(Math.abs(size.y - 0.18)).toBeLessThanOrEqual(0.02);
    expect(size.x).toBeGreaterThanOrEqual(0.7 * bodyMainBox(car).getSize(new THREE.Vector3()).x);
  });

  test('both exhaust tip centers are inside the diffuser height range', () => {
    const { car } = buildScene();
    const diffuser = worldBox(oneNamed(car, 'rear-diffuser'));
    for (const tip of namedMeshes(car, 'exhaust-tip')) {
      const y = centerOf(tip).y;
      expect(y).toBeGreaterThanOrEqual(diffuser.min.y);
      expect(y).toBeLessThanOrEqual(diffuser.max.y);
    }
  });

  test('each exhaust inner ring is concentric with a tip, smaller across and darker', () => {
    const { car } = buildScene();
    const tips = namedMeshes(car, 'exhaust-tip');
    for (const inner of namedMeshes(car, 'exhaust-inner')) {
      const c = centerOf(inner);
      const tip = tips.reduce((near, mesh) => (Math.hypot(centerOf(mesh).x - c.x, centerOf(mesh).y - c.y) < Math.hypot(centerOf(near).x - c.x, centerOf(near).y - c.y) ? mesh : near));
      expect(Math.abs(centerOf(tip).x - c.x)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(centerOf(tip).y - c.y)).toBeLessThanOrEqual(0.01);
      expect(sizeOf(inner).x).toBeLessThan(sizeOf(tip).x);
      expect(sizeOf(inner).y).toBeLessThan(sizeOf(tip).y);
      expect(luminanceOf(plateMaterial(inner).color)).toBeLessThan(luminanceOf(plateMaterial(tip).color));
    }
    expect(new Set(namedMeshes(car, 'exhaust-inner').map((mesh) => Math.sign(centerOf(mesh).x - bodyCenterX(car)))).size).toBe(2);
  });

  test('the reflectors are mirror images, between the diffuser top and the plate bottom, outside the recess', () => {
    const { car } = buildScene();
    expect(namedMeshes(car, 'rear-reflector').length).toBe(2);
    const [a, b] = namedMeshes(car, 'rear-reflector');
    const bodyX = bodyCenterX(car);
    expect(Math.abs(centerOf(a).x + centerOf(b).x - 2 * bodyX)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(centerOf(a).y - centerOf(b).y)).toBeLessThanOrEqual(0.01);
    const diffuserTop = worldBox(oneNamed(car, 'rear-diffuser')).max.y;
    const plateBottom = worldBox(plate(car, 'rear')).min.y;
    const recess = worldBox(oneNamed(car, 'plate-recess'));
    for (const mesh of [a, b]) {
      const box = worldBox(mesh);
      expect(box.min.y).toBeGreaterThanOrEqual(diffuserTop);
      expect(box.max.y).toBeLessThanOrEqual(plateBottom);
      expect(box.min.x >= recess.max.x || box.max.x <= recess.min.x).toBe(true);
    }
  });

  test('the reflectors are red: red component above green and blue', () => {
    const { car } = buildScene();
    for (const mesh of namedMeshes(car, 'rear-reflector')) {
      const color = plateMaterial(mesh).color as THREE.Color;
      expect(color.r).toBeGreaterThan(color.g);
      expect(color.r).toBeGreaterThan(color.b);
    }
  });

  test('the nine engine-cover slats are mirror symmetric about the body center line', () => {
    const { car } = buildScene();
    const bodyX = bodyCenterX(car);
    const offsets = namedMeshes(car, 'engine-grille-slat').map((mesh) => centerOf(mesh).x - bodyX).sort((a, b) => a - b);
    expect(offsets.length).toBe(9);
    offsets.forEach((offset, i) => expect(Math.abs(offset + offsets[offsets.length - 1 - i])).toBeLessThanOrEqual(0.01));
  });

  test('the slats lie between the rear window rear end and the high brake light along the body', () => {
    const { car } = buildScene();
    const windowRear = worldBox(rearWindow(car)).min.z;
    const brakeZ = centerOf(highBrakeLight(car)).z;
    const lo = Math.min(windowRear, brakeZ);
    const hi = Math.max(windowRear, brakeZ);
    expect(namedMeshes(car, 'engine-grille-slat').length).toBe(9);
    for (const slat of namedMeshes(car, 'engine-grille-slat')) {
      const z = centerOf(slat).z;
      expect(z).toBeGreaterThanOrEqual(lo);
      expect(z).toBeLessThanOrEqual(hi);
    }
  });

  test('each slat touches the trunk lid surface within 1cm', () => {
    const { car } = buildScene();
    const body = bodyPaintMeshes(car);
    const triangles = worldTriangles(body);
    expect(namedMeshes(car, 'engine-grille-slat').length).toBe(9);
    for (const slat of namedMeshes(car, 'engine-grille-slat')) {
      const nearest = Math.min(...worldVertices(slat).map((v) => distanceToBody(v, body, triangles)));
      expect(nearest).toBeLessThanOrEqual(0.01);
    }
  });

  test('none of the rear parts glow: no basic material, black emissive, color luminance under 0.97', () => {
    const { car } = buildScene();
    for (const name of REAR_PART_NAMES) {
      expect(namedMeshes(car, name).length).toBeGreaterThan(0);
      for (const mesh of namedMeshes(car, name)) {
        const material = plateMaterial(mesh);
        expect(material instanceof THREE.MeshBasicMaterial).toBe(false);
        if (material.emissive) expect(Math.max(material.emissive.r, material.emissive.g, material.emissive.b) * material.emissiveIntensity).toBe(0);
        expect(luminanceOf(material.color)).toBeLessThan(0.97);
      }
    }
  });
});

const FRONT_PART_NAMES = ['intake-side', 'intake-center', 'intake-slat', 'drl-strip', 'headlight-lens', 'headlight-bezel', 'headlight-dot', 'hood-badge', 'front-lip'];

function intakes(car: Car): THREE.Mesh[] {
  return [...namedMeshes(car, 'intake-side'), ...namedMeshes(car, 'intake-center')];
}

function sideIntakes(car: Car): THREE.Mesh[] {
  return namedMeshes(car, 'intake-side');
}

function topmostVertex(mesh: THREE.Mesh): THREE.Vector3 {
  return worldVertices(mesh).reduce((best, v) => (v.y > best.y ? v : best));
}

function hoodHeightBelow(car: Car, point: THREE.Vector3): number {
  const hit = raycastFirst(new THREE.Vector3(point.x, point.y + 1, point.z), new THREE.Vector3(0, -1, 0), bodyPaintMeshes(car));
  expect(hit).toBeDefined();
  return hit!.point.y;
}

function materialsOf(mesh: THREE.Mesh): any[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function insideTopViewOutline(inner: THREE.Box3, outer: THREE.Box3): boolean {
  return inner.min.x >= outer.min.x - 1e-6 && inner.max.x <= outer.max.x + 1e-6 && inner.min.z >= outer.min.z - 1e-6 && inner.max.z <= outer.max.z + 1e-6;
}

function nearestByXZ(mesh: THREE.Mesh, candidates: THREE.Mesh[]): THREE.Mesh {
  const c = worldBox(mesh).getCenter(new THREE.Vector3());
  return candidates.reduce((best, m) => {
    const a = worldBox(m).getCenter(new THREE.Vector3());
    const b = worldBox(best).getCenter(new THREE.Vector3());
    return Math.hypot(a.x - c.x, a.z - c.z) < Math.hypot(b.x - c.x, b.z - c.z) ? m : best;
  });
}

describe('the porsche front carries intakes, slats, daytime strips, headlight lenses, badge and lip', () => {
  test.each([['intake-side', 2], ['intake-center', 1], ['drl-strip', 2], ['headlight-lens', 2], ['headlight-bezel', 2], ['headlight-dot', 8], ['hood-badge', 1], ['front-lip', 1]] as [string, number][])('the car has the expected number of meshes named %s (%i)', (name, count) => {
    const { car } = buildScene();
    expect(namedMeshes(car, name).length).toBe(count);
  });

  test('there are 3 intakes: one in the middle and one on each side, with front faces within 1cm of each other in z', () => {
    const { scene, car } = buildScene();
    const bodyX = carBox(scene).getCenter(new THREE.Vector3()).x;
    expect(sideIntakes(car).length).toBe(2);
    expect(namedMeshes(car, 'intake-center').length).toBe(1);
    const xs = sideIntakes(car).map((m) => worldBox(m).getCenter(new THREE.Vector3()).x - bodyX);
    expect(xs[0] * xs[1]).toBeLessThan(0);
    expect(Math.abs(worldBox(namedMeshes(car, 'intake-center')[0]).getCenter(new THREE.Vector3()).x - bodyX)).toBeLessThanOrEqual(0.02);
    const fronts = intakes(car).map((m) => worldBox(m).max.z);
    expect(fronts.length).toBe(3);
    expect(Math.max(...fronts) - Math.min(...fronts)).toBeLessThanOrEqual(0.01);
  });

  test('each side intake is 0.50m wide and 0.14m tall in the world, within 2cm', () => {
    const { car } = buildScene();
    expect(sideIntakes(car).length).toBe(2);
    for (const mesh of sideIntakes(car)) {
      const size = worldBox(mesh).getSize(new THREE.Vector3());
      expect(Math.abs(size.x - 0.5)).toBeLessThanOrEqual(0.02);
      expect(Math.abs(size.y - 0.14)).toBeLessThanOrEqual(0.02);
    }
  });

  test('looking at each intake center from 1m in front, the first thing hit is the intake or a slat, not the paint', () => {
    const { car } = buildScene();
    expect(intakes(car).length).toBe(3);
    const slatsAndIntakes = [...intakes(car), ...namedMeshes(car, 'intake-slat'), ...namedMeshes(car, 'drl-strip')];
    for (const mesh of intakes(car)) {
      const box = worldBox(mesh);
      const center = box.getCenter(new THREE.Vector3());
      const inset = 0.03;
      const points = [
        center,
        new THREE.Vector3(box.min.x + inset, box.min.y + inset, 0),
        new THREE.Vector3(box.max.x - inset, box.min.y + inset, 0),
        new THREE.Vector3(box.min.x + inset, box.max.y - inset, 0),
        new THREE.Vector3(box.max.x - inset, box.max.y - inset, 0),
      ];
      for (const point of points) {
        const hit = raycastFirst(new THREE.Vector3(point.x, point.y, box.max.z + 1), new THREE.Vector3(0, 0, -1), allCarMeshes(car));
        expect(hit).toBeDefined();
        expect(slatsAndIntakes).toContain(hit!.object as THREE.Mesh);
      }
    }
  });

  test('each intake has at least 2 slats inside its area, dark gray, sticking out at most 1.5cm past the intake front', () => {
    const { car } = buildScene();
    expect(intakes(car).length).toBe(3);
    const slats = namedMeshes(car, 'intake-slat');
    for (const intake of intakes(car)) {
      const box = worldBox(intake);
      const inside = slats.filter((s) => {
        const c = worldBox(s).getCenter(new THREE.Vector3());
        return c.x >= box.min.x && c.x <= box.max.x && c.y >= box.min.y && c.y <= box.max.y;
      });
      expect(inside.length).toBeGreaterThanOrEqual(2);
      for (const slat of inside) {
        expect(worldBox(slat).max.z - box.max.z).toBeLessThanOrEqual(0.015);
      }
    }
    for (const slat of slats) {
      for (const m of materialsOf(slat)) expect(luminanceOf(m.color)).toBeLessThan(0.35);
    }
  });

  test('2 daytime strips, each at least 30cm long, in the upper half of the side intake height range', () => {
    const { car } = buildScene();
    const strips = namedMeshes(car, 'drl-strip');
    expect(strips.length).toBe(2);
    const sides = sideIntakes(car);
    expect(sides.length).toBe(2);
    const low = Math.min(...sides.map((m) => worldBox(m).min.y));
    const high = Math.max(...sides.map((m) => worldBox(m).max.y));
    for (const strip of strips) {
      const box = worldBox(strip);
      const size = box.getSize(new THREE.Vector3());
      expect(Math.max(size.x, size.z)).toBeGreaterThanOrEqual(0.3);
      const y = box.getCenter(new THREE.Vector3()).y;
      expect(y).toBeGreaterThanOrEqual((low + high) / 2);
      expect(y).toBeLessThanOrEqual(high);
    }
  });

  test('each headlight lens top is 4.5 to 6.5cm above the hood paint straight below it', () => {
    const { car } = buildScene();
    const lenses = namedMeshes(car, 'headlight-lens');
    expect(lenses.length).toBe(2);
    for (const lens of lenses) {
      const top = topmostVertex(lens);
      const height = top.y - hoodHeightBelow(car, top);
      expect(height).toBeGreaterThanOrEqual(0.045);
      expect(height).toBeLessThanOrEqual(0.065);
    }
  });

  test('each headlight lens and its dots reach at most 7cm past the body surface, and the lens rim is within 2cm of it', () => {
    const { car } = buildScene();
    const body = bodyPaintMeshes(car);
    const bodyTriangles = worldTriangles(body);
    const lenses = namedMeshes(car, 'headlight-lens');
    expect(lenses.length).toBe(2);
    expect(namedMeshes(car, 'headlight-dot').length).toBe(8);
    for (const mesh of [...lenses, ...namedMeshes(car, 'headlight-dot')]) {
      expect(distanceToBody(topmostVertex(mesh), body, bodyTriangles)).toBeLessThanOrEqual(0.07);
    }
    for (const lens of lenses) {
      for (const point of lensRimVertices(lens, body, bodyTriangles)) {
        expect(distanceToBody(point, body, bodyTriangles)).toBeLessThanOrEqual(0.02);
      }
    }
  });

  test('each lens has one dark bezel ring 1 to 3cm wider than the lens on every side seen from above', () => {
    const { car } = buildScene();
    const lenses = namedMeshes(car, 'headlight-lens');
    const bezels = namedMeshes(car, 'headlight-bezel');
    expect(lenses.length).toBe(2);
    expect(bezels.length).toBe(2);
    for (const lens of lenses) {
      const bezel = nearestByXZ(lens, bezels);
      const l = worldBox(lens).getSize(new THREE.Vector3());
      const b = worldBox(bezel).getSize(new THREE.Vector3());
      for (const [bigger, smaller] of [[b.x, l.x], [b.z, l.z]]) {
        expect((bigger - smaller) / 2).toBeGreaterThanOrEqual(0.01);
        expect((bigger - smaller) / 2).toBeLessThanOrEqual(0.03);
      }
    }
    for (const bezel of bezels) {
      for (const m of materialsOf(bezel)) expect(luminanceOf(m.color)).toBeLessThan(0.25);
    }
  });

  test('each lens holds 4 gray dots inside its top-view outline', () => {
    const { car } = buildScene();
    const lenses = namedMeshes(car, 'headlight-lens');
    const dots = namedMeshes(car, 'headlight-dot');
    expect(lenses.length).toBe(2);
    expect(dots.length).toBe(8);
    for (const lens of lenses) {
      const lensBox = worldBox(lens);
      expect(dots.filter((d) => insideTopViewOutline(worldBox(d), lensBox)).length).toBe(4);
    }
    for (const dot of dots) {
      for (const m of materialsOf(dot)) {
        const spread = Math.max(m.color.r, m.color.g, m.color.b) - Math.min(m.color.r, m.color.g, m.color.b);
        expect(spread).toBeLessThanOrEqual(0.08);
        expect(luminanceOf(m.color)).toBeGreaterThanOrEqual(0.2);
        expect(luminanceOf(m.color)).toBeLessThanOrEqual(0.8);
      }
    }
  });

  test('each headlight dot is seen first from 0.5m outside along the lens bulge direction, not covered by the lens', () => {
    const { car } = buildScene();
    const bezels = namedMeshes(car, 'headlight-bezel');
    const dots = namedMeshes(car, 'headlight-dot');
    expect(dots.length).toBe(8);
    for (const dot of dots) {
      const c = worldBox(dot).getCenter(new THREE.Vector3());
      const base = worldBox(nearestByXZ(dot, bezels)).getCenter(new THREE.Vector3());
      const outward = c.clone().sub(base).normalize();
      const hit = raycastFirst(c.clone().addScaledVector(outward, 0.5), outward.clone().negate(), allCarMeshes(car));
      expect(hit?.object).toBe(dot);
    }
  });

  test('looking straight down, at least 22 of 24 points on the ring between lens and bezel outlines hit the bezel first', () => {
    const { car } = buildScene();
    const lenses = namedMeshes(car, 'headlight-lens');
    const bezels = namedMeshes(car, 'headlight-bezel');
    expect(lenses.length).toBe(2);
    expect(bezels.length).toBe(2);
    for (const lens of lenses) {
      const bezel = nearestByXZ(lens, bezels);
      const bezelBox = worldBox(bezel);
      const lensSize = worldBox(lens).getSize(new THREE.Vector3());
      const bezelSize = bezelBox.getSize(new THREE.Vector3());
      const center = bezelBox.getCenter(new THREE.Vector3());
      const rx = (lensSize.x + bezelSize.x) / 4;
      const rz = (lensSize.z + bezelSize.z) / 4;
      let onBezel = 0;
      for (let k = 0; k < 24; k++) {
        const angle = (k * 15 * Math.PI) / 180;
        const origin = new THREE.Vector3(center.x + rx * Math.cos(angle), 5, center.z + rz * Math.sin(angle));
        if (raycastFirst(origin, new THREE.Vector3(0, -1, 0), allCarMeshes(car))?.object === bezel) onBezel++;
      }
      expect(onBezel).toBeGreaterThanOrEqual(22);
    }
  });

  test('one hood badge: centered, above the front plate, below the lens tops, at most 5cm by 5cm, within 1cm of the hood', () => {
    const { scene, car } = buildScene();
    const badges = namedMeshes(car, 'hood-badge');
    expect(badges.length).toBe(1);
    const badge = badges[0];
    const box = worldBox(badge);
    const size = box.getSize(new THREE.Vector3());
    const lenses = namedMeshes(car, 'headlight-lens');
    expect(lenses.length).toBe(2);
    expect(Math.abs(box.getCenter(new THREE.Vector3()).x - carBox(scene).getCenter(new THREE.Vector3()).x)).toBeLessThanOrEqual(0.01);
    expect(box.min.y).toBeGreaterThan(worldBox(plate(car, 'front')).max.y);
    expect(box.min.y).toBeLessThan(Math.min(...lenses.map((m) => worldBox(m).max.y)));
    expect(size.x).toBeLessThanOrEqual(0.05);
    expect(size.y).toBeLessThanOrEqual(0.05);
    const body = bodyPaintMeshes(car);
    const triangles = worldTriangles(body);
    expect(Math.max(...worldVertices(badge).map((v) => distanceToBody(v, body, triangles)))).toBeLessThanOrEqual(0.01);
  });

  test('one front lip: at least 70% of the body width, not above the intake bottoms, not past the intake front', () => {
    const { car } = buildScene();
    const lips = namedMeshes(car, 'front-lip');
    expect(lips.length).toBe(1);
    expect(intakes(car).length).toBe(3);
    const box = worldBox(lips[0]);
    const bodyWidth = bodyMainBox(car).getSize(new THREE.Vector3()).x;
    expect(box.getSize(new THREE.Vector3()).x).toBeGreaterThanOrEqual(bodyWidth * 0.7);
    expect(box.max.y).toBeLessThanOrEqual(Math.min(...intakes(car).map((m) => worldBox(m).min.y)));
    expect(box.max.z).toBeLessThanOrEqual(Math.max(...intakes(car).map((m) => worldBox(m).max.z)) + 1e-6);
  });

  test('none of the front parts glows: no basic material, black emissive, color luminance under 0.97', () => {
    const { car } = buildScene();
    for (const name of FRONT_PART_NAMES) {
      const meshes = namedMeshes(car, name);
      expect(meshes.length).toBeGreaterThan(0);
      for (const mesh of meshes) {
        for (const m of materialsOf(mesh)) {
          expect(m instanceof THREE.MeshBasicMaterial).toBe(false);
          if (m.emissive) expect(Math.max(m.emissive.r, m.emissive.g, m.emissive.b) * m.emissiveIntensity).toBe(0);
          expect(luminanceOf(m.color)).toBeLessThan(0.97);
        }
      }
    }
  });

});

describe('drawLicensePlate paints the Japanese plate text and colors', () => {
  function drawPlate() {
    const canvas = createFakeCanvas();
    drawLicensePlate(canvas.getContext('2d') as CanvasRenderingContext2D, 330, 165);
    return canvas;
  }

  test('the four text pieces are the place name, class number, hiragana and the serial number', () => {
    expect([...drawPlate().fillTextCalls].sort()).toEqual(['310', '・9 92', 'み', '秋葉原'].sort());
  });

  test('a pale background and a green text color are used', () => {
    const colors = drawPlate().fillStyleCalls.filter((v): v is string => typeof v === 'string').map((v) => new THREE.Color(v));
    expect(colors.some((c) => c.r > 0.85 && c.g > 0.85 && c.b > 0.85)).toBe(true);
    expect(colors.some((c) => c.g > c.r && c.g > c.b)).toBe(true);
  });
});

describe('drawLicensePlate draws no outline', () => {
  test('no stroke, strokeRect or strokeText call is made', () => {
    const canvas = createFakeCanvas();
    drawLicensePlate(canvas.getContext('2d') as CanvasRenderingContext2D, 330, 165);
    expect(canvas.strokeCalls).toEqual([]);
  });
});

describe('drawRearWordmark paints PORSCHE in light grey on a dark ground', () => {
  function drawWordmark() {
    const canvas = createFakeCanvas();
    drawRearWordmark(canvas.getContext('2d') as CanvasRenderingContext2D, 512, 64);
    return canvas;
  }

  test('the only text drawn is PORSCHE', () => {
    expect(drawWordmark().fillTextCalls).toEqual(['PORSCHE']);
  });

  test('a dark ground color and a light grey text color are used', () => {
    const colors = drawWordmark().fillStyleCalls.filter((v): v is string => typeof v === 'string').map((v) => new THREE.Color(v));
    expect(colors.some((c) => luminanceOf(c) < 0.15)).toBe(true);
    expect(colors.some((c) => c.r > 0.7 && c.g > 0.7 && c.b > 0.7)).toBe(true);
  });
});
