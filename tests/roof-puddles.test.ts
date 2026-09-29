import { expect, test, describe } from 'bun:test';
import * as THREE from 'three';
import { setCanvasFactory } from '../diorama/materials';
import { createTextures } from '../diorama/textures';
import { buildPedestal, buildGround, buildRoadMarkings } from '../diorama/ground';
import { buildStore } from '../diorama/store';
import { buildStreet } from '../diorama/street';
import { buildLights } from '../diorama/lights';
import { createPlaque } from '../diorama/plaque';
import { rainSeeds, createSplashes } from '../diorama/weather';
import { ROOF_ZONES, type RoofPuddle } from '../diorama/layout';
import { createWetGround } from '../diorama/wet-ground';
import { createFakeCanvasFactory } from './fake-canvas';

setCanvasFactory(createFakeCanvasFactory());

function mulberry32(seed: number): () => number {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function assembleScene(): THREE.Scene {
  const scene = new THREE.Scene();
  const textures = createTextures();
  buildPedestal(scene, null);
  buildGround(scene, textures);
  buildRoadMarkings(scene, textures);
  buildStore(scene, textures);
  buildStreet(scene, textures);
  buildLights(scene);
  createPlaque(scene, 'zh', null);
  scene.updateMatrixWorld(true);
  return scene;
}

function findRoofSlab(scene: THREE.Scene, groupName: string, w: number, h: number, d: number): THREE.Box3 {
  let found: THREE.Mesh | undefined;
  scene.getObjectByName(groupName)!.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || mesh.geometry.type !== 'BoxGeometry') return;
    const p = (mesh.geometry as THREE.BoxGeometry).parameters;
    if (p.width === w && p.height === h && p.depth === d) found = mesh;
  });
  expect(found).toBeDefined();
  return new THREE.Box3().setFromObject(found!);
}

const scene = assembleScene();
const konbiniRoof = findRoofSlab(scene, 'store', 9.9, 0.3, 6.4);
const neighborRoof = findRoofSlab(scene, 'neighbor-building', 5.6, 0.25, 9.7);
const ROOFS = [
  { name: 'roof-puddles-konbini', slab: konbiniRoof },
  { name: 'roof-puddles-neighbor', slab: neighborRoof },
];

describe('rain landing on the real roof slabs', () => {
  const seeds = rainSeeds(40000, mulberry32(42));

  test.each([
    ['konbini', konbiniRoof],
    ['neighbor', neighborRoof],
  ] as const)('drops over the %s roof land within 3 cm of its top face', (_name, slab) => {
    const inside = seeds.filter(
      (s) => s.x > slab.min.x + 0.2 && s.x < slab.max.x - 0.2 && s.z > slab.min.z + 0.2 && s.z < slab.max.z - 0.2
    );
    expect(inside.length).toBeGreaterThan(10);
    for (const s of inside) expect(Math.abs(s.floorY - slab.max.y)).toBeLessThanOrEqual(0.03);
  });
});

describe('roof puddles', () => {
  function setup() {
    const s = assembleScene();
    const wet = createWetGround(s, new THREE.CubeTexture());
    return { s, wet };
  }

  test.each(ROOFS)('$name exists, sits on the roof top face and stays within its footprint', ({ name, slab }) => {
    const { s, wet } = setup();
    const layer = s.getObjectByName(name);
    expect(layer).toBeDefined();
    s.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(layer!);
    expect(box.min.x).toBeGreaterThanOrEqual(slab.min.x - 0.05);
    expect(box.max.x).toBeLessThanOrEqual(slab.max.x + 0.05);
    expect(box.min.z).toBeGreaterThanOrEqual(slab.min.z - 0.05);
    expect(box.max.z).toBeLessThanOrEqual(slab.max.z + 0.05);
    expect(box.min.y - slab.max.y).toBeGreaterThanOrEqual(0);
    expect(box.max.y - slab.max.y).toBeLessThanOrEqual(0.03);
    wet.dispose();
  });

  test('both layers are visible', () => {
    const { s, wet } = setup();
    for (const { name } of ROOFS) expect(s.getObjectByName(name)?.visible).toBe(true);
    wet.dispose();
  });

  test('update(t) writes t into both layers uTime', () => {
    const { s, wet } = setup();
    wet.update(12.5);
    for (const { name } of ROOFS) {
      const material = (s.getObjectByName(name) as THREE.Mesh).material as THREE.ShaderMaterial;
      expect(material.uniforms.uTime.value).toBe(12.5);
    }
    wet.dispose();
  });

  test('dispose removes both layers from the scene', () => {
    const { s, wet } = setup();
    for (const { name } of ROOFS) expect(s.getObjectByName(name)).toBeDefined();
    wet.dispose();
    for (const { name } of ROOFS) expect(s.getObjectByName(name)).toBeUndefined();
  });
});

const konbiniZone = ROOF_ZONES.find((z) => Math.abs(z.y - 4.1) < 0.05)!;
const neighborZone = ROOF_ZONES.find((z) => z.x0 === -13)!;
const awningZone = ROOF_ZONES.find((z) => Math.abs(z.y - 2.72) < 0.05)!;

function equipmentBoxes(scene: THREE.Scene, groupName: string, minBottom: number): THREE.Box3[] {
  const boxes: THREE.Box3[] = [];
  scene.getObjectByName(groupName)!.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const box = new THREE.Box3().setFromObject(obj);
    if (box.min.y < minBottom) return;
    const dx = box.max.x - box.min.x;
    const dz = box.max.z - box.min.z;
    const isParapet = Math.min(dx, dz) <= 0.15 && Math.max(dx, dz) > 1;
    if (!isParapet) boxes.push(box);
  });
  return boxes;
}

function rectOverlapsBox(p: RoofPuddle, box: THREE.Box3): boolean {
  return p.x - p.rx < box.max.x && p.x + p.rx > box.min.x && p.z - p.rz < box.max.z && p.z + p.rz > box.min.z;
}

const PUDDLE_CASES = [
  { name: 'roof-puddles-konbini', zone: konbiniZone, slab: konbiniRoof, group: 'store', minBottom: 4.05 },
  { name: 'roof-puddles-neighbor', zone: neighborZone, slab: neighborRoof, group: 'neighbor-building', minBottom: 7.15 },
];

describe('fixed puddle layout data', () => {
  test('the awning has no puddles', () => {
    expect(awningZone.puddles).toEqual([]);
  });

  test.each(PUDDLE_CASES)('$name: 2 to 4 puddles, each at most 2 square metres', ({ zone }) => {
    expect(zone.puddles.length).toBeGreaterThanOrEqual(2);
    expect(zone.puddles.length).toBeLessThanOrEqual(4);
    for (const p of zone.puddles) expect(Math.PI * p.rx * p.rz).toBeLessThanOrEqual(2);
  });

  test.each(PUDDLE_CASES)('$name: every puddle sits inside the slab inset by 0.15', ({ zone, slab }) => {
    for (const p of zone.puddles) {
      expect(p.x - p.rx).toBeGreaterThanOrEqual(slab.min.x + 0.15);
      expect(p.x + p.rx).toBeLessThanOrEqual(slab.max.x - 0.15);
      expect(p.z - p.rz).toBeGreaterThanOrEqual(slab.min.z + 0.15);
      expect(p.z + p.rz).toBeLessThanOrEqual(slab.max.z - 0.15);
    }
  });

  test.each(PUDDLE_CASES)('$name: no puddle lies under rooftop equipment', ({ zone, group, minBottom }) => {
    const boxes = equipmentBoxes(scene, group, minBottom);
    expect(boxes.length).toBeGreaterThan(0);
    for (const p of zone.puddles) {
      for (const box of boxes) expect(rectOverlapsBox(p, box)).toBe(false);
    }
  });
});

describe('puddle shader uniforms', () => {
  const components4 = (v: { x: number; y: number; z: number; w: number }) => [v.x, v.y, v.z, v.w];

  test.each(PUDDLE_CASES)('$name: uCount, uPuddles and uSheen match the layout data', ({ name, zone }) => {
    const s = assembleScene();
    const wet = createWetGround(s, new THREE.CubeTexture());
    const material = (s.getObjectByName(name) as THREE.Mesh).material as THREE.ShaderMaterial;
    const { uCount, uPuddles, uSheen } = material.uniforms;
    expect(uCount.value).toBe(zone.puddles.length);
    zone.puddles.forEach((p, i) => {
      expect(components4(uPuddles.value[i])).toEqual([p.x, p.z, p.rx, p.rz]);
    });
    const sheen = uSheen.value;
    for (const c of [sheen.r, sheen.g, sheen.b]) expect(c).toBeGreaterThan(0);
    wet.dispose();
  });
});

describe('splashes landing on the roofs', () => {
  const samples = { konbini: [] as number[], neighbor: [] as number[] };
  const slabs = { konbini: konbiniRoof, neighbor: neighborRoof };

  for (let i = 0; i < 30; i++) {
    const geometry = createSplashes(1).mesh.geometry;
    const seed = geometry.getAttribute('seed');
    const floorY = geometry.getAttribute('floorY');
    for (let j = 0; j < seed.count; j++) {
      for (const key of ['konbini', 'neighbor'] as const) {
        const slab = slabs[key];
        const x = seed.getX(j);
        const z = seed.getY(j);
        if (x > slab.min.x + 0.4 && x < slab.max.x - 0.4 && z > slab.min.z + 0.4 && z < slab.max.z - 0.4) {
          samples[key].push(Math.abs(floorY.getX(j) - slab.max.y));
        }
      }
    }
  }

  test.each(['konbini', 'neighbor'] as const)('splashes over the %s roof appear within 3 cm of its top face', (key) => {
    expect(samples[key].length).toBeGreaterThan(10);
    for (const diff of samples[key]) expect(diff).toBeLessThanOrEqual(0.03);
  });
});
