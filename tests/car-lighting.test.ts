import { expect, test, describe } from 'bun:test';
import * as THREE from 'three';
import { setCanvasFactory, toon } from '../diorama/materials';
import { createFakeCanvasFactory } from './fake-canvas';

setCanvasFactory(createFakeCanvasFactory());

import { buildCar } from '../diorama/car';

type Car = ReturnType<typeof buildCar>;

function buildScene(): Car {
  const scene = new THREE.Scene();
  const car = buildCar();
  scene.add(car.group, car.ground);
  scene.updateMatrixWorld(true);
  return car;
}

function carBox(car: Car): THREE.Box3 {
  return new THREE.Box3().setFromObject(car.group, true);
}

function groundMeshes(car: Car, name: string): THREE.Mesh[] {
  expect(car.ground.name).toBe('porsche-ground');
  const found: THREE.Mesh[] = [];
  car.ground.traverse((obj) => {
    if (obj.name === name && (obj as THREE.Mesh).isMesh) found.push(obj as THREE.Mesh);
  });
  return found;
}

function only(car: Car, name: string): THREE.Mesh {
  const meshes = groundMeshes(car, name);
  expect(meshes.length).toBe(1);
  return meshes[0];
}

function box(mesh: THREE.Object3D): THREE.Box3 {
  return new THREE.Box3().setFromObject(mesh, true);
}

function mat(mesh: THREE.Mesh): any {
  return Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
}

function luminance(c: THREE.Color): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

function worldY(mesh: THREE.Mesh): number {
  return mesh.getWorldPosition(new THREE.Vector3()).y;
}

function expectDarkFlatDecal(m: any) {
  expect(m.transparent).toBe(true);
  expect(m.depthWrite).toBe(false);
  expect(m.side).toBe(THREE.FrontSide);
  expect(m.userData.outlineParameters?.visible).toBe(false);
  expect(luminance(m.color)).toBeLessThan(0.1);
  if (m.emissive) expect(Math.max(m.emissive.r, m.emissive.g, m.emissive.b) * (m.emissiveIntensity ?? 1)).toBe(0);
}

function carMaterials(car: Car): THREE.Material[] {
  const set = new Set<THREE.Material>();
  car.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) set.add(m);
  });
  return [...set];
}

function isPaint(m: THREE.Material): boolean {
  return m instanceof THREE.MeshToonMaterial && m.customProgramCacheKey?.() === 'car-paint-rim';
}

function compile(m: THREE.Material) {
  const shader: any = {
    uniforms: THREE.UniformsUtils.clone(THREE.ShaderLib.toon.uniforms),
    vertexShader: THREE.ShaderLib.toon.vertexShader,
    fragmentShader: THREE.ShaderLib.toon.fragmentShader,
  };
  m.onBeforeCompile?.(shader, {} as any);
  return shader;
}

const ORIGINAL_FRAGMENT = THREE.ShaderLib.toon.fragmentShader;

describe('contact shadow under the car', () => {
  test('it covers the body footprint in x and z with at most 0.3m margin per side', () => {
    const car = buildScene();
    const body = carBox(car);
    const shadow = box(only(car, 'car-contact-shadow'));
    for (const axis of ['x', 'z'] as const) {
      expect(shadow.min[axis]).toBeLessThanOrEqual(body.min[axis]);
      expect(shadow.max[axis]).toBeGreaterThanOrEqual(body.max[axis]);
      expect(body.min[axis] - shadow.min[axis]).toBeLessThanOrEqual(0.3);
      expect(shadow.max[axis] - body.max[axis]).toBeLessThanOrEqual(0.3);
    }
  });

  test('it lies flat on the ground between y=0.15 and y=0.2', () => {
    const car = buildScene();
    const y = worldY(only(car, 'car-contact-shadow'));
    expect(y).toBeGreaterThanOrEqual(0.15);
    expect(y).toBeLessThanOrEqual(0.2);
  });

  test('it is a dark, non-emissive, outline-free, front-face-only transparent decal', () => {
    const car = buildScene();
    expectDarkFlatDecal(mat(only(car, 'car-contact-shadow')));
  });

  test('it is at least half opaque at the center and fades out through a texture', () => {
    const car = buildScene();
    const m = mat(only(car, 'car-contact-shadow'));
    expect(m.opacity).toBeGreaterThanOrEqual(0.5);
    expect(m.map ?? m.alphaMap).toBeTruthy();
  });

  test('it renders after the wet ground reflection layer', () => {
    const car = buildScene();
    expect(only(car, 'car-contact-shadow').renderOrder).toBeGreaterThan(2);
  });

  test('every ground effect faces up in world space', () => {
    const car = buildScene();
    const meshes = ['car-contact-shadow', 'car-tire-shadow', 'car-tail-glow'].flatMap((n) => groundMeshes(car, n));
    expect(meshes.length).toBe(6);
    for (const mesh of meshes) {
      const normal = new THREE.Vector3(0, 0, 1).transformDirection(mesh.matrixWorld);
      expect(normal.y).toBeGreaterThan(0.99);
    }
  });
});

describe('tire shadows', () => {
  test('there are exactly 4 tire shadows', () => {
    const car = buildScene();
    expect(groundMeshes(car, 'car-tire-shadow').length).toBe(4);
  });

  test('each is at most 0.6m by 0.4m seen from above', () => {
    const car = buildScene();
    const shadows = groundMeshes(car, 'car-tire-shadow');
    expect(shadows.length).toBe(4);
    for (const s of shadows) {
      const size = box(s).getSize(new THREE.Vector3());
      expect(Math.max(size.x, size.z)).toBeLessThanOrEqual(0.6);
      expect(Math.min(size.x, size.z)).toBeLessThanOrEqual(0.4);
    }
  });

  test('they occupy the four body quadrants, one each', () => {
    const car = buildScene();
    const center = carBox(car).getCenter(new THREE.Vector3());
    const shadows = groundMeshes(car, 'car-tire-shadow');
    expect(shadows.length).toBe(4);
    const quadrants = shadows.map((s) => {
      const c = box(s).getCenter(new THREE.Vector3());
      return `${c.x > center.x ? 'R' : 'L'}${c.z > center.z ? 'F' : 'B'}`;
    });
    expect(new Set(quadrants).size).toBe(4);
  });

  test('all sit inside the body footprint seen from above', () => {
    const car = buildScene();
    const body = carBox(car);
    const shadows = groundMeshes(car, 'car-tire-shadow');
    expect(shadows.length).toBe(4);
    for (const s of shadows) {
      const b = box(s);
      expect(b.min.x).toBeGreaterThanOrEqual(body.min.x - 1e-6);
      expect(b.max.x).toBeLessThanOrEqual(body.max.x + 1e-6);
      expect(b.min.z).toBeGreaterThanOrEqual(body.min.z - 1e-6);
      expect(b.max.z).toBeLessThanOrEqual(body.max.z + 1e-6);
    }
  });

  test('they are dark, non-emissive, outline-free, front-face-only transparent decals', () => {
    const car = buildScene();
    const shadows = groundMeshes(car, 'car-tire-shadow');
    expect(shadows.length).toBe(4);
    for (const s of shadows) expectDarkFlatDecal(mat(s));
  });

  test('they are at least as opaque as the contact shadow', () => {
    const car = buildScene();
    const base = mat(only(car, 'car-contact-shadow')).opacity;
    const shadows = groundMeshes(car, 'car-tire-shadow');
    expect(shadows.length).toBe(4);
    for (const s of shadows) expect(mat(s).opacity).toBeGreaterThanOrEqual(base);
  });
});

describe('paint rim light', () => {
  test('the red paint gets a warm-white rim color and a world direction pointing to the store', () => {
    const car = buildScene();
    const shaders = carMaterials(car).filter(isPaint).map(compile).filter((s) => s.uniforms.uRimColor);
    expect(shaders.length).toBeGreaterThan(0);
    for (const s of shaders) {
      const c: THREE.Color = s.uniforms.uRimColor.value;
      expect(c).toBeInstanceOf(THREE.Color);
      expect(c.r).toBeGreaterThanOrEqual(c.g);
      expect(c.g).toBeGreaterThanOrEqual(c.b);
      expect(c.b).toBeGreaterThan(0.5);
      const d: THREE.Vector3 = s.uniforms.uRimDir.value;
      expect(d.length()).toBeCloseTo(1, 3);
      expect(d.z).toBeLessThan(-0.5);
      expect(d.y).toBeGreaterThanOrEqual(0);
      expect(s.fragmentShader).not.toBe(ORIGINAL_FRAGMENT);
    }
  });

  test('the shared cached toon("#c8102a") material is not affected', () => {
    buildCar();
    const shader = compile(toon('#c8102a'));
    expect(shader.uniforms.uRimColor).toBeUndefined();
    expect(shader.fragmentShader).toBe(ORIGINAL_FRAGMENT);
  });

  test('no other body material gets a rim uniform', () => {
    const car = buildScene();
    const others = carMaterials(car).filter((m) => !isPaint(m));
    expect(others.length).toBeGreaterThan(0);
    expect(carMaterials(car).some((m) => isPaint(m) && compile(m).uniforms.uRimColor)).toBe(true);
    for (const m of others) expect(compile(m).uniforms.uRimColor).toBeUndefined();
  });
});

describe('tail light glow on the ground', () => {
  test('it hugs the tail: front edge within 0.15m of the body rear, back edge within 1m behind it', () => {
    const car = buildScene();
    const body = carBox(car);
    const glow = box(only(car, 'car-tail-glow'));
    expect(glow.max.z).toBeLessThanOrEqual(body.min.z + 0.15);
    expect(glow.min.z).toBeGreaterThanOrEqual(body.min.z - 1.0);
  });

  test('it is no wider than the body and does not reach the store door at z=-3.2', () => {
    const car = buildScene();
    const body = carBox(car);
    const glow = box(only(car, 'car-tail-glow'));
    expect(glow.max.x - glow.min.x).toBeLessThanOrEqual(body.max.x - body.min.x);
    expect(glow.min.z).toBeGreaterThan(-3.2);
  });

  test('it lies flat on the ground between y=0.15 and y=0.2', () => {
    const car = buildScene();
    const y = worldY(only(car, 'car-tail-glow'));
    expect(y).toBeGreaterThanOrEqual(0.15);
    expect(y).toBeLessThanOrEqual(0.2);
  });

  test('it is a red, additive, outline-free transparent decal with a fading texture', () => {
    const car = buildScene();
    const m = mat(only(car, 'car-tail-glow'));
    expect(m.color.r).toBeGreaterThan(0.3);
    expect(m.color.r).toBeGreaterThan(m.color.g);
    expect(m.color.r).toBeGreaterThan(m.color.b);
    expect(m.transparent).toBe(true);
    expect(m.depthWrite).toBe(false);
    expect(m.userData.outlineParameters?.visible).toBe(false);
    expect(m.map ?? m.alphaMap).toBeTruthy();
    expect(m.blending).toBe(THREE.AdditiveBlending);
  });

  test('its brightest pixel stays under the bloom threshold', () => {
    const car = buildScene();
    const m = mat(only(car, 'car-tail-glow'));
    expect(luminance(m.color) * m.opacity).toBeLessThan(0.97);
  });

  test('it renders after the wet ground reflection layer', () => {
    const car = buildScene();
    expect(only(car, 'car-tail-glow').renderOrder).toBeGreaterThan(2);
  });
});

describe('lighting effects add no scene lights', () => {
  test('the car and its ground group hold exactly the 4 hazard point lights', () => {
    const car = buildScene();
    let lights = 0;
    for (const root of [car.group, car.ground]) {
      root.traverse((obj) => {
        if ((obj as THREE.Light).isLight) lights++;
      });
    }
    expect(lights).toBe(4);
  });
});
