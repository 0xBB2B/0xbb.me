import { expect, test, describe } from 'bun:test';
import * as THREE from 'three';
import { setCanvasFactory } from '../diorama/materials';
import { createTextures, drawPlaque, PLAQUE_LAYOUT, CANVAS_TEXT } from '../diorama/textures';
import { buildPedestal, buildGround, buildRoadMarkings } from '../diorama/ground';
import { buildStore } from '../diorama/store';
import { buildStreet } from '../diorama/street';
import { buildLights } from '../diorama/lights';
import { createPlaque, setPlaqueLanguage, setPlaqueGlow, PLAQUE_PANEL } from '../diorama/plaque';
import { DEFAULT_CAMERA, ROOF_ZONES } from '../diorama/layout';
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
  'stop-sign-side',
  'signal-main',
  'neighbor-building',
];

const ZH_LINES = ['FUBUKI_BB', '全栈工程师 · 系统架构师 · AI Agent开发者', 'Tokyo · Shanghai'];
const EN_LINES = ['FUBUKI_BB', 'Full Stack Engineer · System Architect · AI Agent Developer', 'Tokyo · Shanghai'];

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

const STOP_TEXT = '止まれ';

function textureCanvas(mesh: THREE.Mesh): FakeCanvas | undefined {
  const material = mesh.material as THREE.MeshBasicMaterial;
  return material.map?.image as unknown as FakeCanvas | undefined;
}

function meshesDrawing(scene: THREE.Scene, text: string): THREE.Mesh[] {
  const found: THREE.Mesh[] = [];
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && textureCanvas(mesh)?.fillTextCalls.includes(text)) found.push(mesh);
  });
  return found;
}

function isSignFace(mesh: THREE.Mesh): boolean {
  const canvas = textureCanvas(mesh)!;
  return canvas.height <= canvas.width;
}

function signParts(scene: THREE.Scene): THREE.Mesh[] {
  const parts: THREE.Mesh[] = [];
  scene.getObjectByName('stop-sign-side')!.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry.type !== 'CylinderGeometry') parts.push(mesh);
  });
  return parts;
}

function triangleCount(geometry: THREE.BufferGeometry): number {
  return (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
}

function firstTriangleWorldNormal(mesh: THREE.Mesh): THREE.Vector3 {
  const position = mesh.geometry.attributes.position;
  const index = mesh.geometry.index;
  const corner = (i: number) => new THREE.Vector3().fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(mesh.matrixWorld);
  const [a, b, c] = [corner(0), corner(1), corner(2)];
  return b.sub(a).cross(c.sub(a)).normalize();
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

describe('the 止まれ stop sign and road marking exist only on the side street', () => {
  test('the alley has no stop-marking-alley object', () => {
    const scene = assembleScene();
    expect(namedObjects(scene, 'stop-marking-alley')).toHaveLength(0);
  });

  test('exactly one sign-shaped 止まれ face exists, inside the stop-sign-side group', () => {
    const scene = assembleScene();
    const faces = meshesDrawing(scene, STOP_TEXT).filter(isSignFace);
    expect(faces).toHaveLength(1);
    const group = scene.getObjectByName('stop-sign-side')!;
    let ancestor = faces[0].parent;
    while (ancestor && ancestor !== group) ancestor = ancestor.parent;
    expect(ancestor).toBe(group);
  });

  test('exactly one 止まれ road marking exists, named stop-marking-side', () => {
    const scene = assembleScene();
    const markings = meshesDrawing(scene, STOP_TEXT).filter((mesh) => !isSignFace(mesh));
    expect(markings.map((mesh) => mesh.name)).toEqual(['stop-marking-side']);
  });

  test('nothing 止まれ appears on the alley side of the store (x < -5)', () => {
    const scene = assembleScene();
    const offenders = meshesDrawing(scene, STOP_TEXT).filter((mesh) => new THREE.Box3().setFromObject(mesh, true).max.x < -5);
    expect(offenders).toHaveLength(0);
  });
});

describe('the stop sign is an upside-down triangle facing traffic on the side street', () => {
  test('every non-post mesh of the sign group is a single triangle, with no rectangular backing plate', () => {
    const scene = assembleScene();
    const parts = signParts(scene);
    expect(parts.length).toBeGreaterThan(0);
    for (const part of parts) expect(triangleCount(part.geometry)).toBe(1);
  });

  test('the textured sign face normal points to world -z, toward vehicles driving +z to the junction', () => {
    const scene = assembleScene();
    const faces = signParts(scene).filter((mesh) => textureCanvas(mesh));
    expect(faces).toHaveLength(1);
    expect(firstTriangleWorldNormal(faces[0]).dot(new THREE.Vector3(0, 0, -1))).toBeGreaterThan(0.999);
  });

  test('the textured sign face has its apex at the bottom: lowest vertex centered under two equal-height upper vertices', () => {
    const scene = assembleScene();
    const faces = signParts(scene).filter((mesh) => textureCanvas(mesh));
    expect(faces).toHaveLength(1);
    const position = faces[0].geometry.attributes.position;
    const index = faces[0].geometry.index;
    const corner = (i: number) => new THREE.Vector3().fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(faces[0].matrixWorld);
    const [apex, ...upper] = [corner(0), corner(1), corner(2)].sort((a, b) => a.y - b.y);
    expect(upper[0].y).toBeCloseTo(upper[1].y, 4);
    expect(upper[0].y).toBeGreaterThan(apex.y + 1e-4);
    expect(apex.x).toBeCloseTo((upper[0].x + upper[1].x) / 2, 4);
  });

  test('the untextured sign back normal points to world +z, opposite the face', () => {
    const scene = assembleScene();
    const backs = signParts(scene).filter((mesh) => !textureCanvas(mesh));
    expect(backs.length).toBeGreaterThan(0);
    for (const back of backs) expect(firstTriangleWorldNormal(back).dot(new THREE.Vector3(0, 0, 1))).toBeGreaterThan(0.999);
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

  test('the plaque location line glyphs (cap height ~0.7em) are at least 10px tall across the whole line in the default 1440x900 view', () => {
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
      'Tokyo · Shanghai',
    ]);
    expect(plaque.texture.version).toBeGreaterThan(version);
  });
});

describe('the plaque border and face are named objects inside the plaque group', () => {
  test('plaque-border and plaque-face each exist exactly once, nested under the plaque group', () => {
    const scene = assembleScene();
    const group = scene.getObjectByName('plaque')!;
    expect(namedObjects(scene, 'plaque-border')).toHaveLength(1);
    expect(namedObjects(scene, 'plaque-face')).toHaveLength(1);
    for (const name of ['plaque-border', 'plaque-face']) {
      let ancestor = scene.getObjectByName(name)!.parent;
      let insideGroup = false;
      while (ancestor) {
        if (ancestor === group) insideGroup = true;
        ancestor = ancestor.parent;
      }
      expect(insideGroup).toBe(true);
    }
  });
});

function borderBrightness(scene: THREE.Scene): number {
  const mesh = scene.getObjectByName('plaque-border') as THREE.Mesh;
  const material = mesh.material as THREE.MeshStandardMaterial;
  const emissive = material.emissive;
  return material.emissiveIntensity * Math.max(emissive.r, emissive.g, emissive.b);
}

function glowingPlaque() {
  const scene = new THREE.Scene();
  const plaque = createPlaque(scene, 'zh', null);
  return { scene, plaque };
}

describe('the plaque border breathes with a hover-boosted glow', () => {
  test('at the darkest point of the breathing cycle the border still glows above zero', () => {
    const { scene, plaque } = glowingPlaque();
    setPlaqueGlow(plaque, 0, false);
    expect(borderBrightness(scene)).toBeGreaterThan(0);
  });

  test('border brightness rises monotonically as the breathing coefficient goes from 0 to 1', () => {
    const { scene, plaque } = glowingPlaque();
    let previous = -Infinity;
    for (const x of [0, 0.25, 0.5, 0.75, 1]) {
      setPlaqueGlow(plaque, x, false);
      const current = borderBrightness(scene);
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });

  test('hovering boosts border brightness above the unhovered breathing maximum', () => {
    const { scene, plaque } = glowingPlaque();
    setPlaqueGlow(plaque, 1, false);
    const maxBreathing = borderBrightness(scene);
    setPlaqueGlow(plaque, 0.5, true);
    expect(borderBrightness(scene)).toBeGreaterThan(maxBreathing);
  });

  test('the plaque face itself never glows', () => {
    const { scene, plaque } = glowingPlaque();
    setPlaqueGlow(plaque, 1, true);
    const face = scene.getObjectByName('plaque-face') as THREE.Mesh;
    const material = face.material as THREE.MeshStandardMaterial;
    const emissive = material.emissive;
    const faceBrightness = emissive ? material.emissiveIntensity * Math.max(emissive.r, emissive.g, emissive.b) : 0;
    expect(faceBrightness).toBe(0);
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

test('the font preload text contains no character beyond what canvas textures actually draw', () => {
  const canvases: FakeCanvas[] = [];
  setCanvasFactory(() => { const canvas = createFakeCanvas(); canvases.push(canvas); return canvas; });
  createTextures();
  const plaqueCanvas = createFakeCanvas();
  const ctx = plaqueCanvas.getContext('2d') as CanvasRenderingContext2D;
  drawPlaque(ctx, 'zh');
  drawPlaque(ctx, 'en');
  const drawn = new Set([...canvases, plaqueCanvas].flatMap((canvas) => canvas.fillTextCalls).join(''));
  const extra = [...new Set(CANVAS_TEXT)].filter((char) => char.trim() && !drawn.has(char));
  expect(extra).toEqual([]);
  setCanvasFactory(createFakeCanvasFactory());
});

describe('store roof and outer walls ignore lights behind them', () => {
  function toonMeshes(root: THREE.Object3D, pick: (mesh: THREE.Mesh, material: THREE.MeshToonMaterial) => boolean): THREE.MeshToonMaterial[] {
    const found: THREE.MeshToonMaterial[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const material = mesh.material as THREE.MeshToonMaterial;
      if (mesh.isMesh && material.isMeshToonMaterial && pick(mesh, material)) found.push(material);
    });
    return found;
  }

  function shadeTable(material: THREE.MeshToonMaterial): number[] {
    return Array.from((material.gradientMap!.image as { data: ArrayLike<number> }).data);
  }

  function roofSlabs(scene: THREE.Scene): THREE.MeshToonMaterial[] {
    return toonMeshes(scene.getObjectByName('store')!, (mesh) => {
      const p = (mesh.geometry as THREE.BoxGeometry).parameters;
      return mesh.geometry.type === 'BoxGeometry' && p.width === 9.9 && p.height === 0.3 && p.depth === 6.4;
    });
  }

  function outerWalls(scene: THREE.Scene): THREE.MeshToonMaterial[] {
    return toonMeshes(scene.getObjectByName('store')!, (_, material) => material.color.getHexString() === 'dde2ea');
  }

  function roofAndOuterWalls(scene: THREE.Scene): THREE.MeshToonMaterial[] {
    return [...roofSlabs(scene), ...outerWalls(scene)];
  }

  test('the store has exactly one roof slab and at least one outer wall', () => {
    const scene = assembleScene();
    expect(roofSlabs(scene)).toHaveLength(1);
    expect(outerWalls(scene).length).toBeGreaterThanOrEqual(1);
  });

  test('the roof slab and every outer wall are toon materials with a gradient map', () => {
    for (const material of roofAndOuterWalls(assembleScene())) expect(material.gradientMap).toBeTruthy();
  });

  test('back-lit half of their gradient map contributes no brightness', () => {
    for (const material of roofAndOuterWalls(assembleScene())) {
      const table = shadeTable(material);
      expect(table.slice(0, table.length / 2)).toEqual(table.slice(0, table.length / 2).map(() => 0));
    }
  });

  test('front-lit half of their gradient map keeps the regular shading steps', () => {
    for (const material of roofAndOuterWalls(assembleScene())) {
      const table = shadeTable(material);
      expect(table.slice(table.length / 2)).toEqual([215, 255]);
    }
  });

  test('the interior wall and street objects keep the regular four-step shading', () => {
    const scene = assembleScene();
    const store = scene.getObjectByName('store')!;
    const interior = toonMeshes(store, (_, material) => material.color.getHexString() === 'fff3de');
    const outsideStore = toonMeshes(scene, (mesh) => {
      let node: THREE.Object3D | null = mesh;
      while (node) {
        if (node === store) return false;
        node = node.parent;
      }
      return true;
    });
    expect(interior.length).toBeGreaterThan(0);
    expect(outsideStore.length).toBeGreaterThan(0);
    for (const material of [...interior, ...outsideStore]) expect(shadeTable(material)).toEqual([70, 150, 215, 255]);
  });
});

function neighborGroup(scene: THREE.Scene): THREE.Object3D {
  return scene.getObjectByName('neighbor-building')!;
}

function meshesUnder(root: THREE.Object3D): THREE.Mesh[] {
  const found: THREE.Mesh[] = [];
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) found.push(obj as THREE.Mesh);
  });
  return found;
}

function materialsOf(mesh: THREE.Mesh): THREE.Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function isInside(obj: THREE.Object3D, ancestor: THREE.Object3D): boolean {
  for (let node: THREE.Object3D | null = obj; node; node = node.parent) if (node === ancestor) return true;
  return false;
}

describe('the neighbor building is a two-storey tea house left of the store', () => {
  const NEIGHBOR_NAMES = [
    'neighbor-wall-1f',
    'neighbor-wall-2f',
    'neighbor-floor-line',
    'neighbor-rain-pipe',
    'neighbor-meter',
    'kissa-front',
    'kissa-menu-board',
    'kissa-lightbox',
  ];

  function boxOf(scene: THREE.Scene, name: string): THREE.Box3 {
    return new THREE.Box3().setFromObject(scene.getObjectByName(name)!);
  }

  function centerOf(box: THREE.Box3): THREE.Vector3 {
    return box.getCenter(new THREE.Vector3());
  }

  test('the group exists, holds at most 72 meshes and contains no light', () => {
    const group = neighborGroup(assembleScene());
    expect(group).toBeDefined();
    expect(meshesUnder(group).length).toBeLessThanOrEqual(72);
    let lights = 0;
    group.traverse((obj) => {
      if ((obj as THREE.Light).isLight) lights += 1;
    });
    expect(lights).toBe(0);
  });

  for (const name of NEIGHBOR_NAMES) {
    test(`"${name}" exists inside the neighbor-building group`, () => {
      const scene = assembleScene();
      const found = namedObjects(scene, name);
      expect(found.length).toBeGreaterThanOrEqual(1);
      expect(isInside(found[0], neighborGroup(scene))).toBe(true);
    });
  }

  test('the ground floor and upper floor walls use different textures split at the floor line', () => {
    const scene = assembleScene();
    const sideImages = (name: string) => {
      const mesh = meshesUnder(scene.getObjectByName(name)!)[0];
      const materials = mesh.material as THREE.MeshToonMaterial[];
      return [0, 1, 4, 5].map((index) => materials[index]?.map?.image);
    };
    const images1f = sideImages('neighbor-wall-1f');
    const images2f = sideImages('neighbor-wall-2f');
    for (const image of [...images1f, ...images2f]) expect(image).toBeDefined();
    expect(new Set(images1f).size).toBe(1);
    expect(new Set(images2f).size).toBe(1);
    expect(images1f[0]).not.toBe(images2f[0]);
    expect(boxOf(scene, 'neighbor-wall-1f').max.y).toBeLessThanOrEqual(3.8);
    expect(boxOf(scene, 'neighbor-wall-2f').min.y).toBeGreaterThanOrEqual(3.2);
  });

  test('the floor line sits between 3.2m and 3.8m and wraps all four sides', () => {
    const box = boxOf(assembleScene(), 'neighbor-floor-line');
    const center = centerOf(box);
    expect(center.y).toBeGreaterThanOrEqual(3.2);
    expect(center.y).toBeLessThanOrEqual(3.8);
    expect(box.max.x - box.min.x).toBeGreaterThanOrEqual(5.4);
    expect(box.max.z - box.min.z).toBeGreaterThanOrEqual(9.5);
  });

  test('the rain pipe runs vertically from the roof edge to the ground', () => {
    const box = boxOf(assembleScene(), 'neighbor-rain-pipe');
    const size = box.getSize(new THREE.Vector3());
    expect(size.y).toBeGreaterThan(size.x * 5);
    expect(size.y).toBeGreaterThan(size.z * 5);
    expect(box.min.y).toBeLessThanOrEqual(0.3);
    expect(box.max.y).toBeGreaterThanOrEqual(6.8);
  });

  test('the meter box is on the ground-floor side wall facing the alley', () => {
    const center = centerOf(boxOf(assembleScene(), 'neighbor-meter'));
    expect(center.y).toBeLessThan(3.5);
    expect(Math.abs(center.x + 7.6)).toBeLessThanOrEqual(0.4);
  });

  test('the tea house glass is a warm, unlit, textured material', () => {
    const scene = assembleScene();
    const glass = meshesUnder(scene.getObjectByName('kissa-front')!).flatMap(materialsOf);
    expect(glass.length).toBeGreaterThan(0);
    for (const material of glass) {
      const basic = material as THREE.MeshBasicMaterial;
      expect(basic.isMeshBasicMaterial).toBe(true);
      expect(basic.color.r).toBeGreaterThan(basic.color.b);
      expect(basic.map).toBeTruthy();
    }
  });

  for (const name of ['kissa-menu-board', 'kissa-lightbox']) {
    test(`"${name}" stands on the pavement in front of the door`, () => {
      const box = boxOf(assembleScene(), name);
      const center = centerOf(box);
      expect(center.z).toBeGreaterThan(-3.5);
      expect(center.x).toBeGreaterThanOrEqual(-13);
      expect(center.x).toBeLessThanOrEqual(-7.6);
      expect(box.min.y).toBeLessThanOrEqual(0.3);
    });
  }

  test('there is no shutter texture and no shutter-related object in the neighbor group', () => {
    expect('shutter' in createTextures()).toBe(false);
    const group = neighborGroup(assembleScene());
    group.traverse((obj) => {
      expect(obj.name.toLowerCase()).not.toContain('shutter');
    });
  });

  test('only the tea house glass and lightbox glow faces may have their outline turned off', () => {
    const scene = assembleScene();
    const front = scene.getObjectByName('kissa-front')!;
    const lightbox = scene.getObjectByName('kissa-lightbox')!;
    for (const mesh of meshesUnder(neighborGroup(scene))) {
      if (isInside(mesh, front)) continue;
      const inLightbox = isInside(mesh, lightbox);
      for (const material of materialsOf(mesh)) {
        if (inLightbox && (material as THREE.MeshBasicMaterial).isMeshBasicMaterial) continue;
        expect(material.userData.outlineParameters?.visible).not.toBe(false);
      }
    }
  });

  test('the lightbox has a textured unlit glow face', () => {
    const lightbox = assembleScene().getObjectByName('kissa-lightbox')!;
    const glowFaces = meshesUnder(lightbox).flatMap(materialsOf).filter((m) => (m as THREE.MeshBasicMaterial).isMeshBasicMaterial);
    expect(glowFaces.length).toBeGreaterThanOrEqual(1);
    expect(glowFaces.some((m) => (m as THREE.MeshBasicMaterial).map)).toBe(true);
  });

  test('the neighbor building has exactly one rain pipe in the whole scene', () => {
    const scene = assembleScene();
    const wall = { minX: -13, maxX: -7.6, minZ: -13, maxZ: -3.5 };
    const pipes: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const box = new THREE.Box3().setFromObject(mesh);
      const size = box.getSize(new THREE.Vector3());
      const dx = Math.max(wall.minX - box.max.x, box.min.x - wall.maxX, 0);
      const dz = Math.max(wall.minZ - box.max.z, box.min.z - wall.maxZ, 0);
      if (Math.hypot(dx, dz) <= 0.3 && size.y >= 5 && size.x <= 0.2 && size.z <= 0.2) pipes.push(mesh);
    });
    const rainPipe = scene.getObjectByName('neighbor-rain-pipe');
    expect(rainPipe).toBeDefined();
    expect(pipes).toHaveLength(1);
    expect(isInside(pipes[0], rainPipe!)).toBe(true);
  });
});

describe('the neighbor building balcony, curtained windows and rooftop', () => {
  const ROOF_NAMES = ['neighbor-stair-house', 'neighbor-drying-rack', 'neighbor-water-tank', 'neighbor-antenna'];
  const BALCONY_NAMES = ['balcony-pole', 'balcony-hanger', 'balcony-pot', 'balcony-ac'];

  function boxOf(obj: THREE.Object3D): THREE.Box3 {
    return new THREE.Box3().setFromObject(obj);
  }

  function upperWindowFaces(scene: THREE.Scene): { front: THREE.Mesh[]; side: THREE.Mesh[] } {
    const planes = meshesUnder(neighborGroup(scene)).filter((mesh) => mesh.geometry.type === 'PlaneGeometry');
    const near = (mesh: THREE.Mesh, axis: 'x' | 'z', value: number) => {
      const center = boxOf(mesh).getCenter(new THREE.Vector3());
      return Math.abs(center[axis] - value) <= 0.12 && Math.abs(center.y - 4.8) <= 0.8;
    };
    return { front: planes.filter((m) => near(m, 'z', -3.5)), side: planes.filter((m) => near(m, 'x', -7.59)) };
  }

  function lowerSideWindowFaces(scene: THREE.Scene): THREE.Mesh[] {
    return meshesUnder(neighborGroup(scene)).filter((mesh) => {
      if (mesh.geometry.type !== 'PlaneGeometry') return false;
      const center = boxOf(mesh).getCenter(new THREE.Vector3());
      return Math.abs(center.x + 7.59) <= 0.12 && Math.abs(center.y - 2.2) <= 0.5 && Math.abs(center.z + 10.4) <= 0.6;
    });
  }

  function windowColor(mesh: THREE.Mesh): THREE.Color {
    return (materialsOf(mesh)[0] as THREE.MeshBasicMaterial).color;
  }

  function luminance(color: THREE.Color): number {
    return 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
  }

  function parseChannels(style: unknown): number[] | undefined {
    if (typeof style !== 'string') return undefined;
    const hex = style.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
      const digits = hex[1].length === 3 ? hex[1].replace(/./g, '$&$&') : hex[1];
      return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16));
    }
    const rgb = style.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : undefined;
  }

  function horizontalDistance(box: THREE.Box3, x: number, z: number): number {
    const dx = Math.max(box.min.x - x, x - box.max.x, 0);
    const dz = Math.max(box.min.z - z, z - box.max.z, 0);
    return Math.hypot(dx, dz);
  }

  function assembleWithStreet() {
    const scene = new THREE.Scene();
    const textures = createTextures();
    buildPedestal(scene, null);
    buildGround(scene, textures);
    buildRoadMarkings(scene, textures);
    buildStore(scene, textures);
    const street = buildStreet(scene, textures);
    scene.updateMatrixWorld(true);
    return { scene, tvMaterial: street.tvMaterial };
  }

  for (const name of [...BALCONY_NAMES, 'neighbor-parapet', ...ROOF_NAMES, 'neighbor-stair-door']) {
    test(`"${name}" exists inside the neighbor-building group`, () => {
      const scene = assembleScene();
      const found = scene.getObjectByName(name);
      expect(found).toBeDefined();
      expect(isInside(found!, neighborGroup(scene))).toBe(true);
    });
  }

  test('the balcony has 3 to 4 empty hangers and no clothes', () => {
    const scene = assembleScene();
    expect(namedObjects(scene, 'balcony-hanger').length).toBeGreaterThanOrEqual(3);
    expect(namedObjects(scene, 'balcony-hanger').length).toBeLessThanOrEqual(4);
    neighborGroup(scene).traverse((obj) => {
      const center = boxOf(obj).getCenter(new THREE.Vector3());
      if (center.y < 3.9 || center.y > 5.5 || center.z <= -3.6) return;
      expect(obj.name.toLowerCase()).not.toMatch(/cloth|shirt|towel/);
    });
  });

  test('the balcony has 2 to 3 pots', () => {
    const pots = namedObjects(assembleScene(), 'balcony-pot');
    expect(pots.length).toBeGreaterThanOrEqual(2);
    expect(pots.length).toBeLessThanOrEqual(3);
  });

  for (const name of BALCONY_NAMES) {
    test(`every "${name}" sits on the balcony`, () => {
      const objects = namedObjects(assembleScene(), name);
      expect(objects.length).toBeGreaterThanOrEqual(1);
      for (const obj of objects) {
        const center = boxOf(obj).getCenter(new THREE.Vector3());
        expect(center.y).toBeGreaterThanOrEqual(3.9);
        expect(center.y).toBeLessThanOrEqual(5.5);
        expect(center.z).toBeGreaterThanOrEqual(-3.6);
        expect(center.z).toBeLessThanOrEqual(-2.6);
      }
    });
  }

  for (const name of ['neighbor-parapet', ...ROOF_NAMES]) {
    test(`"${name}" rests on the roof slab`, () => {
      const scene = assembleScene();
      expect(scene.getObjectByName(name)).toBeDefined();
      expect(boxOf(scene.getObjectByName(name)!).min.y).toBeGreaterThanOrEqual(7.15);
    });
  }

  test('the parapet runs around the whole roof edge', () => {
    const scene = assembleScene();
    expect(scene.getObjectByName('neighbor-parapet')).toBeDefined();
    const size = boxOf(scene.getObjectByName('neighbor-parapet')!).getSize(new THREE.Vector3());
    expect(size.x).toBeGreaterThanOrEqual(5.3);
    expect(size.z).toBeGreaterThanOrEqual(9.4);
  });

  test('the stair house contains its door', () => {
    const house = assembleScene().getObjectByName('neighbor-stair-house');
    expect(house).toBeDefined();
    expect(house!.getObjectByName('neighbor-stair-door')).toBeDefined();
  });

  test('rooftop objects stay clear of the roof puddles', () => {
    const scene = assembleScene();
    const roof = ROOF_ZONES.find((zone) => zone.x0 === -13)!;
    for (const name of ROOF_NAMES) {
      const object = scene.getObjectByName(name);
      expect(object).toBeDefined();
      const box = boxOf(object!);
      for (const puddle of roof.puddles) {
        const separated =
          box.max.x < puddle.x - puddle.rx || box.min.x > puddle.x + puddle.rx || box.max.z < puddle.z - puddle.rz || box.min.z > puddle.z + puddle.rz;
        expect(separated).toBe(true);
      }
    }
  });

  test('the four upper-floor windows share one curtained texture canvas', () => {
    const { front, side } = upperWindowFaces(assembleScene());
    expect(front).toHaveLength(2);
    expect(side).toHaveLength(2);
    const images = [...front, ...side].map((mesh) => (materialsOf(mesh)[0] as THREE.MeshBasicMaterial).map?.image);
    for (const image of images) expect(image).toBeDefined();
    expect(new Set(images).size).toBe(1);
  });

  test('the flickering tv material belongs to an upper-floor side window', () => {
    const { scene, tvMaterial } = assembleWithStreet();
    const { front, side } = upperWindowFaces(scene);
    const materials = [...front, ...side].flatMap(materialsOf);
    expect(materials).toContain(tvMaterial);
  });

  test('the balcony pole has one bracket at each end', () => {
    const scene = assembleScene();
    const pole = scene.getObjectByName('balcony-pole');
    expect(pole).toBeDefined();
    const poleBox = boxOf(pole!);
    const centerZ = poleBox.getCenter(new THREE.Vector3()).z;
    const brackets = namedObjects(scene, 'balcony-pole-bracket');
    expect(brackets).toHaveLength(2);
    const distances = brackets.map((b) => [poleBox.min.x, poleBox.max.x].map((x) => horizontalDistance(boxOf(b), x, centerZ)));
    expect(Math.min(distances[0][0], distances[1][0])).toBeLessThanOrEqual(0.15);
    expect(Math.min(distances[0][1], distances[1][1])).toBeLessThanOrEqual(0.15);
    expect(distances.filter((d) => Math.min(...d) <= 0.15)).toHaveLength(2);
  });

  test('every hanger hook loops over the pole', () => {
    const scene = assembleScene();
    const pole = scene.getObjectByName('balcony-pole');
    expect(pole).toBeDefined();
    const hangers = namedObjects(scene, 'balcony-hanger');
    expect(hangers.length).toBeGreaterThanOrEqual(1);
    for (const hanger of hangers) expect(boxOf(hanger).intersectsBox(boxOf(pole!))).toBe(true);
  });

  test('upper front windows are one warm and one dark, side windows one white and one tv', () => {
    const { scene, tvMaterial } = assembleWithStreet();
    const { front, side } = upperWindowFaces(scene);
    expect(front).toHaveLength(2);
    expect(side).toHaveLength(2);
    const frontColors = front.map(windowColor);
    expect(frontColors.some((c) => c.r > c.b)).toBe(true);
    expect(frontColors.some((c) => luminance(c) < 0.25)).toBe(true);
    const sideColors = side.map(windowColor);
    expect(sideColors.some((c) => c.r > 0.6 && c.g > 0.6 && c.b > 0.6)).toBe(true);
    expect(side.flatMap(materialsOf)).toContain(tvMaterial);
  });

  test('the lower side window is dark and carries the same curtain texture', () => {
    const scene = assembleScene();
    const lower = lowerSideWindowFaces(scene);
    expect(lower).toHaveLength(1);
    expect(luminance(windowColor(lower[0]))).toBeLessThan(0.25);
    const upperImage = (materialsOf(upperWindowFaces(scene).front[0])[0] as THREE.MeshBasicMaterial).map?.image;
    expect(upperImage).toBeDefined();
    expect((materialsOf(lower[0])[0] as THREE.MeshBasicMaterial).map?.image).toBe(upperImage);
  });

  test('the curtain texture is painted on a neutral near-white base', () => {
    const face = upperWindowFaces(assembleScene()).front[0];
    expect(face).toBeDefined();
    const canvas = (materialsOf(face)[0] as THREE.MeshBasicMaterial).map?.image as unknown as FakeCanvas;
    const channels = parseChannels(canvas.fillStyleCalls[0]);
    expect(channels).toBeDefined();
    expect(Math.max(...channels!) - Math.min(...channels!)).toBeLessThanOrEqual(12);
  });

  test('the parapet has a wall segment flush with each of the four roof slab edges', () => {
    const parapet = assembleScene().getObjectByName('neighbor-parapet');
    expect(parapet).toBeDefined();
    const boxes = meshesUnder(parapet!).map((mesh) => boxOf(mesh));
    const thin = (a: number, b: number) => b - a <= 0.6;
    const flush = (edge: 'west' | 'east' | 'north' | 'south') =>
      boxes.some((box) => {
        if (edge === 'west') return Math.abs(box.min.x + 13.1) <= 0.05 && thin(box.min.x, box.max.x);
        if (edge === 'east') return Math.abs(box.max.x + 7.5) <= 0.05 && thin(box.min.x, box.max.x);
        if (edge === 'north') return Math.abs(box.min.z + 13.1) <= 0.05 && thin(box.min.z, box.max.z);
        return Math.abs(box.max.z + 3.4) <= 0.05 && thin(box.min.z, box.max.z);
      });
    expect(flush('west')).toBe(true);
    expect(flush('east')).toBe(true);
    expect(flush('north')).toBe(true);
    expect(flush('south')).toBe(true);
  });
});

describe('自动贩卖机', () => {
  test('两台贩卖机正面 1.5 米内没有点光源，护栏不会被照到过曝', () => {
    const scene = assembleScene();
    const fronts: THREE.Vector3[] = [];
    const lights: THREE.Vector3[] = [];
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const params = (mesh.geometry as THREE.PlaneGeometry | undefined)?.parameters;
      if (mesh.isMesh && mesh.geometry instanceof THREE.PlaneGeometry && params?.width === 0.86 && params?.height === 1.72) {
        fronts.push(mesh.getWorldPosition(new THREE.Vector3()));
      }
      if ((obj as THREE.PointLight).isPointLight) lights.push(obj.getWorldPosition(new THREE.Vector3()));
    });
    expect(fronts).toHaveLength(2);
    for (const front of fronts) {
      for (const light of lights) expect(light.distanceTo(front)).toBeGreaterThan(1.5);
    }
  });
});
