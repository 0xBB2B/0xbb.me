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
import { fresnel, createWetGround, captureEnvironment, contactShadow } from '../diorama/wet-ground';
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

describe('createWetGround', () => {
  const ROAD = 'wet-ground-road';
  const LOT = 'wet-ground-lot';

  function setup() {
    const scene = new THREE.Scene();
    const envMap = new THREE.CubeTexture();
    const wet = createWetGround(scene, envMap);
    return { scene, envMap, wet };
  }

  const material = (scene: THREE.Scene, name: string) =>
    (scene.getObjectByName(name) as THREE.Mesh).material as THREE.ShaderMaterial;

  test('no object in the scene re-renders the scene each frame', () => {
    const { scene, wet } = setup();
    scene.traverse((o) => expect((o as { isReflector?: boolean }).isReflector).not.toBe(true));
    wet.dispose();
  });

  test('adds only the two wet layers and the two roof puddle layers', () => {
    const { scene, wet } = setup();
    expect(scene.children.map((o) => o.name).sort()).toEqual([
      'roof-puddles-konbini',
      'roof-puddles-neighbor',
      LOT,
      ROAD,
    ].sort());
    wet.dispose();
  });

  test('both wet layers use the given environment map', () => {
    const { scene, envMap, wet } = setup();
    for (const name of [ROAD, LOT]) expect(material(scene, name).uniforms.envMap.value).toBe(envMap);
    wet.dispose();
  });

  test.each([
    [ROAD, 0.012],
    [LOT, 0.166],
  ])('%s sits at height %f', (name, y) => {
    const { scene, wet } = setup();
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene.getObjectByName(name)!);
    expect(Math.abs((box.min.y + box.max.y) / 2 - y)).toBeLessThanOrEqual(0.005);
    wet.dispose();
  });

  test('update(t) writes t into both wet layers uTime', () => {
    const { scene, wet } = setup();
    wet.update(12.5);
    for (const name of [ROAD, LOT]) expect(material(scene, name).uniforms.uTime.value).toBe(12.5);
    wet.dispose();
  });

  test('dispose removes all four objects', () => {
    const { scene, wet } = setup();
    wet.dispose();
    for (const name of [ROAD, LOT, 'roof-puddles-konbini', 'roof-puddles-neighbor']) {
      expect(scene.getObjectByName(name)).toBeUndefined();
    }
  });

  test.each([
    [ROAD, 0],
    [LOT, 1],
  ])('%s has uMask %d', (name, mask) => {
    const { scene, wet } = setup();
    expect(material(scene, name).uniforms.uMask.value).toBe(mask);
    wet.dispose();
  });

  test('both wet layers draw before a contact shadow', () => {
    const { scene, wet } = setup();
    const shadow = contactShadow(scene, 1, 1, 0, 0.02, 0);
    for (const name of [ROAD, LOT]) {
      expect(scene.getObjectByName(name)!.renderOrder).toBeLessThan(shadow.renderOrder);
    }
    wet.dispose();
  });

  test.each(['pow(1.-cosT,5.)', '0.04', '0.25'])('wet layer fragment shader contains %s', (literal) => {
    const { scene, wet } = setup();
    expect(material(scene, ROAD).fragmentShader).toContain(literal);
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

describe('captureEnvironment', () => {
  function run(setupScene?: (scene: THREE.Scene) => void) {
    const scene = new THREE.Scene();
    const background = new THREE.Texture();
    scene.background = background;
    const shown = new THREE.Object3D();
    const alsoShown = new THREE.Object3D();
    const alreadyHidden = new THREE.Object3D();
    alreadyHidden.visible = false;
    scene.add(shown, alsoShown, alreadyHidden);
    setupScene?.(scene);

    const seen = { shown: [] as boolean[], hiddenAlready: [] as boolean[], background: [] as unknown[] };
    const renderer = {
      coordinateSystem: THREE.WebGLCoordinateSystem,
      isWebGLRenderer: false,
      reversedDepthBuffer: false,
      autoClear: true,
      xr: { enabled: false },
      getRenderTarget: () => null,
      getActiveCubeFace: () => 0,
      getActiveMipmapLevel: () => 0,
      setRenderTarget: () => {},
      render: (s: THREE.Scene) => {
        seen.shown.push(shown.visible);
        seen.hiddenAlready.push(alreadyHidden.visible);
        seen.background.push(s.background);
      },
    };
    const capture = captureEnvironment(renderer as unknown as THREE.WebGLRenderer, scene, [shown, alreadyHidden]);
    return { scene, background, shown, alsoShown, alreadyHidden, seen, capture };
  }

  test('listed objects are hidden while rendering and restored afterwards', () => {
    const { seen, shown, alsoShown, alreadyHidden, capture } = run();
    expect(seen.shown.length).toBeGreaterThan(0);
    expect(seen.shown.every((v) => v === false)).toBe(true);
    expect(shown.visible).toBe(true);
    expect(alsoShown.visible).toBe(true);
    expect(alreadyHidden.visible).toBe(false);
    capture.dispose();
  });

  test('the 2D background is swapped out while rendering and restored afterwards', () => {
    const { seen, scene, background, capture } = run();
    expect(seen.background.length).toBeGreaterThan(0);
    for (const bg of seen.background) expect(bg).not.toBe(background);
    expect(scene.background).toBe(background);
    capture.dispose();
  });

  test('returns a half-float cube texture', () => {
    const { capture } = run();
    expect(capture.texture.type).toBe(THREE.HalfFloatType);
    expect((capture.texture as { isCubeTexture?: boolean }).isCubeTexture === true || capture.texture.isRenderTargetTexture).toBe(true);
    capture.dispose();
  });

  test('dispose does not throw', () => {
    const { capture } = run();
    expect(() => capture.dispose()).not.toThrow();
  });
});
