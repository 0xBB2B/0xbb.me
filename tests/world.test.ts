import { expect, test, describe } from 'bun:test';
import * as THREE from 'three';
import { setCanvasFactory } from '../diorama/materials';
import { createTextures, drawPlaque, PLAQUE_LAYOUT, CANVAS_TEXT } from '../diorama/textures';
import { buildPedestal, buildGround, buildRoadMarkings } from '../diorama/ground';
import { buildStore } from '../diorama/store';
import { buildStreet } from '../diorama/street';
import { buildLights } from '../diorama/lights';
import { createPlaque, setPlaqueLanguage, PLAQUE_PANEL } from '../diorama/plaque';
import { DEFAULT_CAMERA } from '../diorama/layout';
import type { FakeCanvas } from './fake-canvas';
import { createFakeCanvas, createFakeCanvasFactory } from './fake-canvas';

setCanvasFactory(createFakeCanvasFactory());

const REQUIRED_NAMES = [
  'pedestal',
  'plaque',
  'store',
  'crosswalk-main',
  'crosswalk-side',
  'stop-marking-side',
  'stop-marking-alley',
  'stop-sign-side',
  'signal-main',
  'neighbor-building',
];

const ZH_LINES = ['FUBUKI_BB', '全栈工程师 · 系统架构师 · AI Agent开发者', '点击红色跑车，坐进驾驶座'];
const EN_LINES = ['FUBUKI_BB', 'Full Stack Engineer · System Architect · AI Agent Developer', "Tap the red car to take the driver's seat"];

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

function namedObjects(scene: THREE.Scene, name: string): THREE.Object3D[] {
  const found: THREE.Object3D[] = [];
  scene.traverse((obj) => {
    if (obj.name === name) found.push(obj);
  });
  return found;
}

function assertOrderedLines(fillTextCalls: string[], lines: string[]): void {
  let cursor = -1;
  for (const line of lines) {
    const index = fillTextCalls.indexOf(line, cursor + 1);
    expect(index).toBeGreaterThan(cursor);
    cursor = index;
  }
}

describe('static diorama scene assembly', () => {
  test('building the full scene through the injected fake canvas does not throw', () => {
    expect(() => assembleScene()).not.toThrow();
  });

  for (const name of REQUIRED_NAMES) {
    test(`the scene has an object named "${name}"`, () => {
      const scene = assembleScene();
      expect(scene.getObjectByName(name)).toBeDefined();
    });
  }
});

describe('pedestal and display platform footprint', () => {
  test('the pedestal (26m base on a wider display stand) is square and wider than the base', () => {
    const scene = assembleScene();
    const pedestal = scene.getObjectByName('pedestal')!;
    const box = new THREE.Box3().setFromObject(pedestal, true);
    const width = box.max.x - box.min.x;
    expect(width).toBeGreaterThan(27);
    expect(width).toBeLessThanOrEqual(29.6);
    expect(box.max.z - box.min.z).toBeCloseTo(width, 1);
  });

  test('no mesh extends past the display platform outer edge (|x| <= 14.8 and |z| <= 14.8)', () => {
    const scene = assembleScene();
    scene.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const box = new THREE.Box3().setFromObject(obj, true);
      expect(Math.abs(box.min.x)).toBeLessThanOrEqual(14.8);
      expect(Math.abs(box.max.x)).toBeLessThanOrEqual(14.8);
      expect(Math.abs(box.min.z)).toBeLessThanOrEqual(14.8);
      expect(Math.abs(box.max.z)).toBeLessThanOrEqual(14.8);
    });
  });
});

describe('the plaque is a single object on the platform front face', () => {
  test('exactly one object is named "plaque"', () => {
    const scene = assembleScene();
    expect(namedObjects(scene, 'plaque')).toHaveLength(1);
  });

  test('the plaque sits in front of the pedestal, past the platform edge (world z > 14)', () => {
    const scene = assembleScene();
    const plaque = scene.getObjectByName('plaque')!;
    const worldPosition = new THREE.Vector3();
    plaque.getWorldPosition(worldPosition);
    expect(worldPosition.z).toBeGreaterThan(14);
  });

  test('switching the plaque language after creation does not throw and keeps a single plaque object', () => {
    const scene = new THREE.Scene();
    const plaque = createPlaque(scene, 'zh', null);
    expect(() => setPlaqueLanguage(plaque, 'en')).not.toThrow();
    expect(namedObjects(scene, 'plaque')).toHaveLength(1);
  });
});

describe('the side street has no vehicle signal light', () => {
  test('no object named with a "signal-" prefix centers over the side lane (x in [5,11], z < 4)', () => {
    const scene = assembleScene();
    const offenders: string[] = [];
    scene.traverse((obj) => {
      if (!obj.name.startsWith('signal-')) return;
      const box = new THREE.Box3().setFromObject(obj, true);
      const center = box.getCenter(new THREE.Vector3());
      if (center.x >= 5 && center.x <= 11 && center.z < 4) offenders.push(obj.name);
    });
    expect(offenders).toEqual([]);
  });

  test('the main road keeps its vehicle signal ("signal-main" exists)', () => {
    const scene = assembleScene();
    expect(scene.getObjectByName('signal-main')).toBeDefined();
  });
});

describe('the plaque draws its three fixed lines onto the canvas', () => {
  test('drawPlaque(ctx, "zh") records the three Chinese lines in order', () => {
    const canvas = createFakeCanvas();
    drawPlaque(canvas.getContext('2d')!, 'zh');
    assertOrderedLines(canvas.fillTextCalls, ZH_LINES);
  });

  test('drawPlaque(ctx, "en") records the three English lines in order', () => {
    const canvas = createFakeCanvas();
    drawPlaque(canvas.getContext('2d')!, 'en');
    assertOrderedLines(canvas.fillTextCalls, EN_LINES);
  });
});

describe('pedestal and plaque dimensions', () => {
  test('the pedestal holds a 26m square base', () => {
    const scene = assembleScene();
    const pedestal = scene.getObjectByName('pedestal')!;
    let found = false;
    pedestal.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const box = new THREE.Box3().setFromObject(obj, true);
      if (Math.abs(box.max.x - box.min.x - 26) < 0.05 && Math.abs(box.max.z - box.min.z - 26) < 0.05) found = true;
    });
    expect(found).toBe(true);
  });

  test('the plaque panel fits on the stand front below the brass line', () => {
    expect(PLAQUE_PANEL.width).toBeLessThanOrEqual(10);
    expect(PLAQUE_PANEL.height).toBeLessThanOrEqual(1.9);
    const [, y, z] = PLAQUE_PANEL.center;
    expect(y - PLAQUE_PANEL.height / 2).toBeGreaterThanOrEqual(-3.84);
    expect(y + PLAQUE_PANEL.height / 2).toBeLessThanOrEqual(-1.9);
    expect(z).toBeGreaterThan(14);
  });

  test('the plaque hint glyphs (cap height ~0.7em) are at least 10px tall across the whole line in the default 1440x900 view', () => {
    const camera = new THREE.PerspectiveCamera(DEFAULT_CAMERA.fov, 1440 / 900, 0.5, 260);
    camera.position.set(...DEFAULT_CAMERA.position);
    camera.lookAt(new THREE.Vector3(...DEFAULT_CAMERA.target));
    camera.updateMatrixWorld();
    const [cx, cy, cz] = PLAQUE_PANEL.center;
    const line = PLAQUE_LAYOUT.lines[2];
    const glyphMeters = 0.7 * (line.fontPx / PLAQUE_LAYOUT.height) * PLAQUE_PANEL.height;
    const lineY = cy + PLAQUE_PANEL.height / 2 - (line.y / PLAQUE_LAYOUT.height) * PLAQUE_PANEL.height;
    const toPixelY = (v: THREE.Vector3) => (1 - (v.clone().project(camera).y + 1) / 2) * 900;
    for (const x of [cx - PLAQUE_PANEL.width / 2, cx, cx + PLAQUE_PANEL.width / 2]) {
      const height = toPixelY(new THREE.Vector3(x, lineY - glyphMeters / 2, cz)) - toPixelY(new THREE.Vector3(x, lineY + glyphMeters / 2, cz));
      expect(height).toBeGreaterThanOrEqual(10);
    }
    expect(PLAQUE_LAYOUT.width / PLAQUE_LAYOUT.height).toBeCloseTo(PLAQUE_PANEL.width / PLAQUE_PANEL.height, 2);
    expect(PLAQUE_LAYOUT.lines[2].fontPx).toBeGreaterThan(PLAQUE_LAYOUT.lines[1].fontPx);
    expect(PLAQUE_LAYOUT.lines[0].fontPx).toBeGreaterThan(PLAQUE_LAYOUT.lines[2].fontPx);
  });

  test('switching the plaque language redraws the three lines and flags the texture for upload', () => {
    const scene = new THREE.Scene();
    const plaque = createPlaque(scene, 'zh', null);
    const canvas = plaque.texture.image as unknown as FakeCanvas;
    const version = plaque.texture.version;
    setPlaqueLanguage(plaque, 'en');
    expect(canvas.fillTextCalls.slice(-3)).toEqual([
      'FUBUKI_BB',
      'Full Stack Engineer · System Architect · AI Agent Developer',
      "Tap the red car to take the driver's seat",
    ]);
    expect(plaque.texture.version).toBeGreaterThan(version);
  });
});

test('every character drawn on canvas textures is part of the font preload text', () => {
  const canvases: FakeCanvas[] = [];
  setCanvasFactory(() => { const canvas = createFakeCanvas(); canvases.push(canvas); return canvas; });
  createTextures();
  const plaqueCanvas = createFakeCanvas();
  const ctx = plaqueCanvas.getContext('2d') as CanvasRenderingContext2D;
  drawPlaque(ctx, 'zh');
  drawPlaque(ctx, 'en');
  const drawn = [...canvases, plaqueCanvas].flatMap((canvas) => canvas.fillTextCalls).join('');
  const missing = [...new Set(drawn)].filter((char) => char.trim() && !CANVAS_TEXT.includes(char));
  expect(missing).toEqual([]);
  setCanvasFactory(createFakeCanvasFactory());
});
