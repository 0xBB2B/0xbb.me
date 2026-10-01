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
    const wet = createWetGround(s, 800, 600, 1);
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

  test('both layers stay visible in high and low tier', () => {
    const { s, wet } = setup();
    for (const enabled of [false, true]) {
      wet.setReflections(enabled);
      for (const { name } of ROOFS) expect(s.getObjectByName(name)?.visible).toBe(true);
    }
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
    const wet = createWetGround(s, 800, 600, 1);
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

function hash(ix: number, iy: number): number {
  const a = (ix + 4104) >>> 0;
  const b = (iy + 4152) >>> 0;
  const n = Math.imul((Math.imul(a, 1597334673) ^ Math.imul(b, 3812015801)) >>> 0, 1597334673) >>> 0;
  return n / 4294967296;
}

function vnoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const bottom = hash(ix, iy) * (1 - ux) + hash(ix + 1, iy) * ux;
  const top = hash(ix, iy + 1) * (1 - ux) + hash(ix + 1, iy + 1) * ux;
  return bottom * (1 - uy) + top * uy;
}

function shrink(x: number, z: number): number {
  return 1 - 0.42 * (vnoise(x * 2.3, z * 2.3) * 0.65 + vnoise(x * 5.7, z * 5.7) * 0.35);
}

function contourRatio(p: RoofPuddle, angle: number): number {
  const steps = 1000;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = p.x + Math.cos(angle) * t * p.rx;
    const z = p.z + Math.sin(angle) * t * p.rz;
    if (t >= shrink(x, z)) return t;
  }
  return 1;
}

function fragmentOf(name: string): string {
  const s = assembleScene();
  const wet = createWetGround(s, 800, 600, 1);
  const text = ((s.getObjectByName(name) as THREE.Mesh).material as THREE.ShaderMaterial).fragmentShader;
  wet.dispose();
  return text;
}

function vnoiseArguments(source: string): string[] {
  const args: string[] = [];
  const re = /\bvnoise\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < source.length && depth > 0) {
      if (source[i] === '(') depth++;
      if (source[i] === ')') depth--;
      i++;
    }
    args.push(source.slice(re.lastIndex, i - 1));
  }
  return args;
}

describe('irregular puddle outline: shader', () => {
  test.each(PUDDLE_CASES)('$name: the fragment shader has no sin() and still carries the integer hash', ({ name }) => {
    const text = fragmentOf(name);
    expect(text).not.toMatch(/\bsin\s*\(/);
    expect(text).toContain('1597334673u');
    expect(text).toContain('3812015801u');
    expect(text).toMatch(/4104/);
  });

  test.each(PUDDLE_CASES)('$name: the outline samples vnoise at 2.3x and 5.7x of the position, never with time', ({ name }) => {
    const text = fragmentOf(name);
    const args = vnoiseArguments(text.slice(text.indexOf('void main')));
    expect(args.some((a) => /(?<![\d.])2\.3(?!\d)/.test(a))).toBe(true);
    expect(args.some((a) => /(?<![\d.])5\.7(?!\d)/.test(a))).toBe(true);
    for (const a of args) expect(a).not.toMatch(/uTime/);
  });

  test.each(PUDDLE_CASES)('$name: the shrink factor uses the 0.42, 0.65 and 0.35 weights', ({ name }) => {
    const text = fragmentOf(name);
    const main = text.slice(text.indexOf('void main'));
    for (const weight of ['42', '65', '35']) expect(main).toMatch(new RegExp(`(?<![\\d])0?\\.${weight}(?!\\d)`));
  });

  test.each(PUDDLE_CASES)('$name: the outline test compares length against the vnoise shrink factor, not a plain ellipse', ({ name }) => {
    const text = fragmentOf(name);
    const main = text.slice(text.indexOf('void main')).replace(/\s+/g, '');
    const shrinkVar = main.match(/(?:float)?([A-Za-z_]\w*)=[^;]*vnoise\(/)?.[1];
    expect(shrinkVar).toBeDefined();
    const smoothstepCalls = main.match(/smoothstep\(.*/g) ?? [];
    expect(smoothstepCalls.some((call) => call.includes(`(${shrinkVar}-length(`))).toBe(true);
    expect(main).not.toContain('(1.-length(');
  });
});

describe('irregular puddle outline: shape per puddle', () => {
  const cases = PUDDLE_CASES.flatMap(({ name, zone }) => zone.puddles.map((puddle, i) => ({ name, i, puddle })));

  test.each(cases)('$name puddle $i: 72 contour ratios stay within 0.5 to 1 and vary by at least 0.15', ({ puddle }) => {
    const ratios = Array.from({ length: 72 }, (_, k) => contourRatio(puddle, (k / 72) * Math.PI * 2));
    expect(Math.min(...ratios)).toBeGreaterThanOrEqual(0.5);
    expect(Math.max(...ratios)).toBeLessThanOrEqual(1);
    expect(Math.max(...ratios) - Math.min(...ratios)).toBeGreaterThanOrEqual(0.15);
  });
});
