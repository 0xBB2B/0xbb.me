import { expect, test, describe } from 'bun:test';
import * as THREE from 'three';
import { setCanvasFactory } from '../diorama/materials';
import { createTextures } from '../diorama/textures';
import { buildPedestal, buildGround, buildRoadMarkings } from '../diorama/ground';
import { buildStore } from '../diorama/store';
import { buildStreet } from '../diorama/street';
import { buildLights } from '../diorama/lights';
import { createPlaque } from '../diorama/plaque';
import { buildCar } from '../diorama/car';
import { fresnel, streakGain, createWetGround, WET_SHADER } from '../diorama/wet-ground';
import { createFakeCanvasFactory } from './fake-canvas';

setCanvasFactory(createFakeCanvasFactory());

const rad = (deg: number) => (deg * Math.PI) / 180;

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
  return scene;
}

describe('fresnel', () => {
  test('looking almost straight down reflects at most 5%', () => {
    expect(fresnel(Math.cos(rad(10)))).toBeLessThanOrEqual(0.05);
  });

  test('a grazing 80 degree view reflects at least 40%', () => {
    expect(fresnel(Math.cos(rad(80)))).toBeGreaterThanOrEqual(0.4);
  });

  test('65 degrees reflects about 10%', () => {
    expect(Math.abs(fresnel(Math.cos(rad(65))) - 0.1)).toBeLessThanOrEqual(0.02);
  });

  test('strictly increases every 5 degrees from 10 to 80', () => {
    for (let deg = 10; deg < 80; deg += 5) {
      expect(fresnel(Math.cos(rad(deg + 5)))).toBeGreaterThan(fresnel(Math.cos(rad(deg))));
    }
  });
});

describe('streakGain', () => {
  test('is zero at and below 0.35', () => {
    expect(streakGain(0.3)).toBeCloseTo(0, 6);
    expect(streakGain(0.35)).toBeCloseTo(0, 6);
  });

  test('is 3 at full brightness', () => {
    expect(streakGain(1)).toBeCloseTo(3, 6);
  });

  test('strictly increases between 0.35 and 1', () => {
    let prev = streakGain(0.35);
    for (let l = 0.4; l <= 1.0001; l += 0.05) {
      const g = streakGain(Math.min(l, 1));
      expect(g).toBeGreaterThan(prev);
      prev = g;
    }
  });
});

describe('WET_SHADER constants', () => {
  test.each(['pow(1.-cosT,5.)', '0.04', '0.35', '3.0', '0.25'])('fragment shader contains %s', (literal) => {
    expect(WET_SHADER.fragmentShader).toContain(literal);
  });
});

describe('createWetGround reflection settings', () => {
  type Mirror = THREE.Mesh & { getRenderTarget(): THREE.WebGLRenderTarget };

  function setup() {
    const scene = new THREE.Scene();
    const wet = createWetGround(scene, 800, 600, 1);
    const mirrors: Mirror[] = [];
    scene.traverse((o) => {
      if ((o as { isReflector?: boolean }).isReflector === true && !o.name.startsWith('roof-puddles')) {
        mirrors.push(o as Mirror);
      }
    });
    return { scene, wet, mirrors };
  }

  const map = (m: Mirror) => (m.material as THREE.ShaderMaterial).uniforms.tDiffuse.value;

  test('the scene holds two ground mirrors', () => {
    const { mirrors, wet } = setup();
    expect(mirrors.length).toBe(2);
    wet.dispose();
  });

  test('low tier: both mirrors visible, one shared texture at quarter size', () => {
    const { mirrors, wet } = setup();
    wet.setReflection({ scale: 0.25, shared: true });
    expect(mirrors.every((m) => m.visible)).toBe(true);
    expect(map(mirrors[0])).toBe(map(mirrors[1]));
    for (const m of mirrors) {
      expect(m.getRenderTarget().width).toBe(200);
      expect(m.getRenderTarget().height).toBe(150);
    }
    wet.dispose();
  });

  test('high tier: separate textures at half size', () => {
    const { mirrors, wet } = setup();
    wet.setReflection({ scale: 0.5, shared: false });
    expect(mirrors.every((m) => m.visible)).toBe(true);
    expect(map(mirrors[0])).not.toBe(map(mirrors[1]));
    for (const m of mirrors) {
      expect(m.getRenderTarget().width).toBe(400);
      expect(m.getRenderTarget().height).toBe(300);
    }
    wet.dispose();
  });

  const matrix = (m: Mirror) => (m.material as THREE.ShaderMaterial).uniforms.textureMatrix.value;

  test('shared mode shares the texture matrix; separate mode restores each own texture and matrix', () => {
    const { mirrors, wet } = setup();
    wet.setReflection({ scale: 0.25, shared: true });
    expect(matrix(mirrors[0])).toBe(matrix(mirrors[1]));
    wet.setReflection({ scale: 0.5, shared: false });
    expect(matrix(mirrors[0])).not.toBe(matrix(mirrors[1]));
    for (const m of mirrors) expect(map(m)).toBe(m.getRenderTarget().texture);
    wet.dispose();
  });

  test('switching from high back to low shares the texture again', () => {
    const { mirrors, wet } = setup();
    wet.setReflection({ scale: 0.5, shared: false });
    wet.setReflection({ scale: 0.25, shared: true });
    expect(map(mirrors[0])).toBe(map(mirrors[1]));
    wet.dispose();
  });

  test('no ripple-only overlay is added besides the mirrors and roof puddles', () => {
    const { scene, mirrors, wet } = setup();
    const others = scene.children.filter((o) => !mirrors.includes(o as Mirror) && !o.name.startsWith('roof-puddles'));
    expect(others).toEqual([]);
    wet.dispose();
  });
});

describe('contact shadows', () => {
  const scene = assembleScene();
  const car = buildCar();
  scene.add(car.group);
  scene.updateMatrixWorld(true);

  const shadows: THREE.Mesh[] = [];
  scene.traverse((o) => {
    if (o.name === 'contact-shadow' && (o as THREE.Mesh).isMesh) shadows.push(o as THREE.Mesh);
  });
  const centers = shadows.map((m) => new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()));

  function shadowsNear(x: number, z: number, radius: number): number {
    return centers.filter((c) => Math.hypot(c.x - x, c.z - z) <= radius).length;
  }

  test('one shadow lies under the car footprint', () => {
    const box = new THREE.Box3();
    car.group.traverse((o) => {
      if (o.name !== 'contact-shadow' && (o as THREE.Mesh).isMesh) box.expandByObject(o);
    });
    expect(centers.filter((c) => c.x >= box.min.x && c.x <= box.max.x && c.z >= box.min.z && c.z <= box.max.z).length).toBeGreaterThanOrEqual(1);
  });

  test.each([
    ['vending machine A', 3.96, -8.42],
    ['vending machine B', 3.96, -7.48],
    ['bicycle 1', -4.8, -2.4],
    ['bicycle 2', -10.9, -1.5],
    ['bicycle 3', -10.1, -1.6],
  ])('%s has a shadow within 0.6 of its position', (_name, x, z) => {
    expect(shadowsNear(x, z, 0.6)).toBeGreaterThanOrEqual(1);
  });

  test('the recycling bin row has a shadow along x 1.75 to 3.0', () => {
    expect(centers.filter((c) => c.x >= 1.75 - 0.6 && c.x <= 3.0 + 0.6 && Math.abs(c.z + 2.72) <= 0.6).length).toBeGreaterThanOrEqual(1);
  });

  test('there are shadows at all', () => {
    expect(shadows.length).toBeGreaterThanOrEqual(7);
  });

  test('every shadow is a transparent alpha-mapped basic material drawn after the reflection, hugging the ground', () => {
    expect(shadows.length).toBeGreaterThan(0);
    shadows.forEach((m, i) => {
      const material = m.material as THREE.MeshBasicMaterial;
      expect(material).toBeInstanceOf(THREE.MeshBasicMaterial);
      expect(material.transparent).toBe(true);
      expect(material.alphaMap).toBeTruthy();
      expect(m.renderOrder).toBeGreaterThan(2);
      const lift = [0.15, 0.156].map((g) => centers[i].y - g);
      expect(lift.some((d) => d >= 0 && d <= 0.03)).toBe(true);
    });
  });

  test('every shadow samples its alpha map with linear filtering', () => {
    expect(shadows.length).toBeGreaterThan(0);
    for (const m of shadows) {
      const map = (m.material as THREE.MeshBasicMaterial).alphaMap!;
      expect(map.magFilter).toBe(THREE.LinearFilter);
      expect(map.minFilter).toBe(THREE.LinearFilter);
    }
  });

  test('alpha map is opaque within half the radius and zero at the corner', () => {
    expect(shadows.length).toBeGreaterThan(0);
    for (const m of shadows) {
      const { data, width, height } = (m.material as THREE.MeshBasicMaterial).alphaMap!.image as {
        data: ArrayLike<number>;
        width: number;
        height: number;
      };
      const stride = data.length / (width * height);
      const g = (x: number, y: number) => data[(y * width + x) * stride + 1];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const r = Math.hypot(x + 0.5 - width / 2, y + 0.5 - height / 2) / (width / 2);
          if (r <= 0.5) expect(g(x, y)).toBeGreaterThanOrEqual(0.9 * 255);
        }
      }
      expect(g(0, 0)).toBe(0);
    }
  });
});
