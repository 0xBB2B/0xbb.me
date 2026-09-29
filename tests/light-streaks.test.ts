import { expect, test, describe } from 'bun:test';
import * as THREE from 'three';
import { setCanvasFactory } from '../diorama/materials';
import { createTextures } from '../diorama/textures';
import { buildPedestal, buildGround, buildRoadMarkings } from '../diorama/ground';
import { buildStore } from '../diorama/store';
import { buildStreet } from '../diorama/street';
import { createFakeCanvasFactory } from './fake-canvas';
import { createWetGround, contactShadow } from '../diorama/wet-ground';
import { streakAnchor, STORE_STREAK_SOURCES, signalStreakSources, createLightStreaks } from '../diorama/light-streaks';

setCanvasFactory(createFakeCanvasFactory());

function assemble() {
  const scene = new THREE.Scene();
  const textures = createTextures();
  buildPedestal(scene, null);
  buildGround(scene, textures);
  buildRoadMarkings(scene, textures);
  buildStore(scene, textures);
  const street = buildStreet(scene, textures);
  scene.updateMatrixWorld(true);
  return { scene, street };
}

function quadCount(geometry: THREE.BufferGeometry): number {
  return geometry.index ? geometry.index.count / 6 : geometry.attributes.position.count / 4;
}

function colorAttribute(mesh: THREE.Mesh): THREE.BufferAttribute {
  const attrs = mesh.geometry.attributes;
  return (attrs.color ?? attrs.aColor) as THREE.BufferAttribute;
}

function quadColors(mesh: THREE.Mesh, i: number): THREE.Color[] {
  const attr = colorAttribute(mesh);
  return [0, 1, 2, 3].map((k) => new THREE.Color(attr.getX(4 * i + k), attr.getY(4 * i + k), attr.getZ(4 * i + k)));
}

function segmentCount(source: { width: number; along?: unknown }): number {
  return source.along ? Math.ceil(source.width / 1.0) : 1;
}

function meshNamed(scene: THREE.Scene, name: string): THREE.Mesh {
  return scene.getObjectByName(name) as THREE.Mesh;
}

describe('streakAnchor: 相机与镜像点连线和地面层的交点', () => {
  const cases: [string, THREE.Vector3, THREE.Vector3, number][] = [
    ['相机在斜上方远处，停车场层', new THREE.Vector3(33, 23, 40), new THREE.Vector3(-1.25, 3.22, -2.66), 0.166],
    ['相机较低，路面层', new THREE.Vector3(-10, 2, 12), new THREE.Vector3(-8.8, 5.12, 4.95), 0.012],
    ['相机在灯正上方偏移', new THREE.Vector3(3.2, 30, -1.5), new THREE.Vector3(3, 4, -1.5), 0.012],
  ];
  for (const [name, camera, light, groundY] of cases) {
    test(name, () => {
      const anchor = streakAnchor(camera, light, groundY);
      const mirrored = new THREE.Vector3(light.x, 2 * groundY - light.y, light.z);
      expect(anchor.y).toBe(groundY);
      const toAnchor = anchor.clone().sub(camera);
      const toMirror = mirrored.clone().sub(camera);
      const cross = toAnchor.clone().cross(toMirror).length();
      expect(cross).toBeLessThanOrEqual(1e-6 * toAnchor.length() * toMirror.length());
      const t = toAnchor.dot(toMirror) / toMirror.lengthSq();
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(1);
    });
  }
});

describe('STORE_STREAK_SOURCES', () => {
  test('共 11 项，名字集合符合约定', () => {
    expect(STORE_STREAK_SOURCES).toHaveLength(11);
    expect(new Set(STORE_STREAK_SOURCES.map((s) => s.name))).toEqual(
      new Set([
        'fascia', 'store-front-glass', 'store-side-glass', 'kissa-front', 'kissa-lightbox', 'vending-1', 'vending-2',
        'street-lamp-1', 'street-lamp-2', 'street-lamp-3', 'pylon',
      ]),
    );
  });

  test('店铺类光源分段后合计 35 段', () => {
    expect(STORE_STREAK_SOURCES.reduce((sum, s) => sum + segmentCount(s), 0)).toBe(35);
  });

  test('四个宽光源带沿墙方向 along', () => {
    const along = (name: string) => STORE_STREAK_SOURCES.find((s) => s.name === name)!.along;
    expect(along('fascia')).toEqual([1, 0]);
    expect(along('store-front-glass')).toEqual([1, 0]);
    expect(along('kissa-front')).toEqual([1, 0]);
    expect(along('store-side-glass')).toEqual([0, 1]);
  });

  test('灯箱与立式招牌的高度', () => {
    const y = (name: string) => STORE_STREAK_SOURCES.find((s) => s.name === name)!.position[1];
    expect(y('kissa-lightbox')).toBe(0.65);
    expect(y('pylon')).toBe(5.2);
  });

  test('每项有长度 3 的 position、大于 0 的 width 和 color', () => {
    for (const source of STORE_STREAK_SOURCES) {
      expect(source.position).toHaveLength(3);
      expect(source.width).toBeGreaterThan(0);
      expect(source.color).toBeDefined();
    }
  });
});

describe('signalStreakSources', () => {
  test('数量等于车辆信号灯与行人信号灯的总数且大于 0', () => {
    const { street } = assemble();
    const total = [...street.vehicleSignals, ...street.pedestrianSignals].reduce((sum, group) => sum + group.length, 0);
    const sources = signalStreakSources(street);
    expect(sources.length).toBe(total);
    expect(sources.length).toBeGreaterThan(0);
  });
});

describe('createLightStreaks', () => {
  function build() {
    const { scene, street } = assemble();
    const sources = [...STORE_STREAK_SOURCES, ...signalStreakSources(street)];
    const streaks = createLightStreaks(scene, sources);
    return { scene, street, sources, streaks };
  }

  test('场景里有路面层与停车场层两个网格，四边形数都等于分段后的总段数', () => {
    const { scene, sources } = build();
    const segments = sources.reduce((sum, s) => sum + segmentCount(s), 0);
    for (const name of ['light-streaks-road', 'light-streaks-lot']) {
      const mesh = meshNamed(scene, name);
      expect(mesh).toBeDefined();
      expect(quadCount(mesh.geometry)).toBe(segments);
    }
  });

  test('fascia 的 10 段沿 x 均匀排开，z 固定，每段宽 0.99', () => {
    const { scene } = build();
    const geometry = meshNamed(scene, 'light-streaks-road').geometry;
    const light = geometry.attributes.aLight as THREE.BufferAttribute;
    const width = geometry.attributes.aWidth as THREE.BufferAttribute;
    const xs: number[] = [];
    for (let k = 0; k < 10; k++) {
      xs.push(light.getX(4 * k));
      expect(light.getZ(4 * k)).toBeCloseTo(-2.66, 3);
      expect(width.getX(4 * k)).toBeCloseTo(0.99, 3);
    }
    expect(new Set(xs.map((x) => x.toFixed(3))).size).toBe(10);
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(-1.25 - 9.9 / 2);
      expect(x).toBeLessThanOrEqual(-1.25 + 9.9 / 2);
    }
    const sorted = [...xs].sort((a, b) => a - b);
    for (let k = 1; k < 10; k++) expect(sorted[k] - sorted[k - 1]).toBeCloseTo(0.99, 2);
  });

  test('信号灯亮时光带颜色与灯色同色相，灯灭时全黑', () => {
    const { scene, street, streaks } = build();
    const lamp = street.vehicleSignals[0][0];
    const index = STORE_STREAK_SOURCES.reduce((sum, s) => sum + segmentCount(s), 0);
    const road = meshNamed(scene, 'light-streaks-road');
    const base = new THREE.Color(lamp.base);

    lamp.m.color.copy(base).multiplyScalar(2.4);
    streaks.update();
    const lit = quadColors(road, index);
    const peak = lit.reduce((a, b) => (Math.max(a.r, a.g, a.b) >= Math.max(b.r, b.g, b.b) ? a : b));
    const peakMax = Math.max(peak.r, peak.g, peak.b);
    const baseMax = Math.max(base.r, base.g, base.b);
    expect(peakMax).toBeGreaterThan(0);
    expect(peak.r / peakMax).toBeCloseTo(base.r / baseMax, 2);
    expect(peak.g / peakMax).toBeCloseTo(base.g / baseMax, 2);
    expect(peak.b / peakMax).toBeCloseTo(base.b / baseMax, 2);

    lamp.m.color.copy(base).multiplyScalar(0.1);
    streaks.update();
    for (const color of quadColors(road, index)) {
      expect(color.r).toBe(0);
      expect(color.g).toBe(0);
      expect(color.b).toBe(0);
    }
  });

  function wetAndShadowOrder() {
    const scene = new THREE.Scene();
    const wet = createWetGround(scene, new THREE.CubeTexture());
    const shadow = contactShadow(scene, 1, 1, 0, 0.02, 0);
    const order = {
      wet: Math.max(scene.getObjectByName('wet-ground-road')!.renderOrder, scene.getObjectByName('wet-ground-lot')!.renderOrder),
      shadow: shadow.renderOrder,
    };
    wet.dispose();
    return order;
  }

  test('两个网格取最大值混合、不写深度、测深度、renderOrder 为 2、描边关闭', () => {
    const { scene } = build();
    const { wet: wetOrder, shadow: shadowOrder } = wetAndShadowOrder();
    for (const name of ['light-streaks-road', 'light-streaks-lot']) {
      const mesh = meshNamed(scene, name);
      const material = mesh.material as THREE.Material;
      expect(material.blending).toBe(THREE.CustomBlending);
      expect(material.blendEquation).toBe(THREE.MaxEquation);
      expect(material.depthWrite).toBe(false);
      expect(material.depthTest).toBe(true);
      expect(mesh.renderOrder).toBeGreaterThan(wetOrder);
      expect(mesh.renderOrder).toBeLessThan(shadowOrder);
      expect(material.userData.outlineParameters.visible).toBe(false);
    }
  });

  test('dispose 后两个网格从场景移除', () => {
    const { scene, streaks } = build();
    streaks.dispose();
    expect(scene.getObjectByName('light-streaks-road')).toBeUndefined();
    expect(scene.getObjectByName('light-streaks-lot')).toBeUndefined();
  });
});
