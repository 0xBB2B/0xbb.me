import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { createServer, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import * as THREE from 'three';
import { DEFAULT_CAMERA, viewFov } from '../diorama/layout';
import { PLAQUE_PANEL, PLAQUE_GLOW } from '../diorama/plaque';
import { stopPose } from '../diorama/story-camera';
import { runBrowser } from './browser';

const root = fileURLToPath(new URL('../', import.meta.url));
const PORT = 4211;
const PAGE_URL = `http://127.0.0.1:${PORT}/tests/fixtures/world-mount.html`;
let server: ViteDevServer;

beforeAll(async () => {
  server = await createServer({
    root,
    configFile: false,
    plugins: [react()],
    server: { host: '127.0.0.1', port: PORT, strictPort: true, hmr: false },
  });
  await server.listen();
});

afterAll(async () => {
  await server?.close();
});

function screenPoint(world: [number, number, number]): { x: number; y: number } {
  const camera = new THREE.PerspectiveCamera(DEFAULT_CAMERA.fov, 1440 / 900, 0.5, 400);
  camera.position.set(...DEFAULT_CAMERA.position);
  camera.lookAt(new THREE.Vector3(...DEFAULT_CAMERA.target));
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const ndc = new THREE.Vector3(...world).project(camera);
  return { x: ((ndc.x + 1) / 2) * 1440, y: ((1 - ndc.y) / 2) * 900 };
}

const PLAQUE_PIXEL = screenPoint(PLAQUE_PANEL.center);
const ROAD_PIXEL = screenPoint([8, 0, 8]);

function bootScript(width: number, height: number): string {
  return `
  await cdp('Emulation.setDeviceMetricsOverride', { width: ${width}, height: ${height}, deviceScaleFactor: 1, mobile: false });
  await navigate(${JSON.stringify(PAGE_URL)});
  let ready = false, mountError = null;
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    ready = await js('!!window.ready');
    mountError = await js('window.mountError ?? null');
    if (ready || mountError) break;
    await wait(0.2);
  }
`;
}

const BOOT = bootScript(1440, 900);
const DEFAULT_DISTANCE = new THREE.Vector3(...DEFAULT_CAMERA.position).distanceTo(new THREE.Vector3(...DEFAULT_CAMERA.target));

describe('挂载与场景组成', () => {
  test('挂载后 20 秒内 ready resolve，舞台里恰好有一个 canvas', async () => {
    const result = await runBrowser<{ ready: boolean; mountError: string | null; canvasCount: number }>(`
      ${BOOT}
      const canvasCount = await js("document.querySelectorAll('#stage canvas').length");
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, mountError, canvasCount }));
    `);
    expect(result.mountError).toBeNull();
    expect(result.ready).toBe(true);
    expect(result.canvasCount).toBe(1);
  }, 60_000);

  test('场景中有 porsche 与 plaque-border，五个驾驶舱内饰名称都不存在', async () => {
    const result = await runBrowser<{ ready: boolean; hasPorsche: boolean; hasBorder: boolean; cabinNames: string[] }>(`
      ${BOOT}
      const hasPorsche = await js("window.handle.scene.getObjectByName('porsche') !== undefined");
      const hasBorder = await js("window.handle.scene.getObjectByName('plaque-border') !== undefined");
      const cabinNames = await js("(() => { const banned = ['driver-door','cabin-interior','center-screen','steering-wheel','door-handle']; const found = []; window.handle.scene.traverse((obj) => { if (banned.includes(obj.name)) found.push(obj.name); }); return found; })()");
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, hasPorsche, hasBorder, cabinNames }));
    `);
    expect(result.ready).toBe(true);
    expect(result.hasPorsche).toBe(true);
    expect(result.hasBorder).toBe(true);
    expect(result.cabinNames).toEqual([]);
  }, 60_000);
});

describe('铭牌边框呼吸', () => {
  test('约 0.6 秒间隔读数不同，启用「减少动态效果」后仍不同', async () => {
    const result = await runBrowser<{ ready: boolean; pair1: [number, number]; pair2: [number, number] }>(`
      ${BOOT}
      const glow = () => js("window.handle.scene.getObjectByName('plaque-border').material.emissiveIntensity");
      const a1 = await glow();
      await wait(0.6);
      const a2 = await glow();
      await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      const b1 = await glow();
      await wait(0.6);
      const b2 = await glow();
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, pair1: [a1, a2], pair2: [b1, b2] }));
    `);
    expect(result.ready).toBe(true);
    expect(result.pair1[0]).not.toBe(result.pair1[1]);
    expect(result.pair2[0]).not.toBe(result.pair2[1]);
  }, 60_000);
});

describe('铭牌悬停', () => {
  test('悬停铭牌时 canvas 光标变为 pointer，移到路面像素后不是 pointer', async () => {
    const result = await runBrowser<{ ready: boolean; hoverCursor: string; awayCursor: string }>(`
      ${BOOT}
      const settle = () => js('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: ${PLAQUE_PIXEL.x}, y: ${PLAQUE_PIXEL.y} });
      await settle();
      const hoverCursor = await js("document.querySelector('#stage canvas').style.cursor");
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: ${ROAD_PIXEL.x}, y: ${ROAD_PIXEL.y} });
      await settle();
      const awayCursor = await js("document.querySelector('#stage canvas').style.cursor");
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, hoverCursor, awayCursor }));
    `);
    expect(result.ready).toBe(true);
    expect(result.hoverCursor).toBe('pointer');
    expect(result.awayCursor).not.toBe('pointer');
  }, 60_000);
});

describe('铭牌点击与拖动', () => {
  test('按下后移动超过 5 像素再松开，2 秒内不触发进入', async () => {
    const px = PLAQUE_PIXEL.x;
    const py = PLAQUE_PIXEL.y;
    const result = await runBrowser<{ ready: boolean; views: string[] }>(`
      ${BOOT}
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: ${px}, y: ${py} });
      await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: ${px}, y: ${py}, button: 'left', buttons: 1, clickCount: 1 });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: ${px + 30}, y: ${py}, buttons: 1 });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: ${px + 30}, y: ${py}, button: 'left', buttons: 0, clickCount: 1 });
      await wait(2);
      const views = await js('window.views ?? []');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, views }));
    `);
    expect(result.ready).toBe(true);
    expect(result.views).not.toContain('entering');
  }, 60_000);

  test('点击铭牌依次触发 entering 与 story，两者间隔不超过 1.5 秒', async () => {
    const px = PLAQUE_PIXEL.x;
    const py = PLAQUE_PIXEL.y;
    const result = await runBrowser<{ ready: boolean; views: string[]; times: number[] }>(`
      ${BOOT}
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: ${px}, y: ${py} });
      await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: ${px}, y: ${py}, button: 'left', buttons: 1, clickCount: 1 });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: ${px}, y: ${py}, button: 'left', buttons: 0, clickCount: 1 });
      const storyDeadline = Date.now() + 5000;
      let views = [];
      while (Date.now() < storyDeadline) {
        views = await js('window.views ?? []');
        if (views.includes('story')) break;
        await wait(0.1);
      }
      const times = await js('window.viewTimes ?? []');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, views, times }));
    `);
    expect(result.ready).toBe(true);
    const enterIndex = result.views.indexOf('entering');
    const storyIndex = result.views.indexOf('story', enterIndex + 1);
    expect(enterIndex).toBeGreaterThanOrEqual(0);
    expect(storyIndex).toBeGreaterThan(enterIndex);
    expect(result.times[storyIndex] - result.times[enterIndex]).toBeLessThanOrEqual(1500);
  }, 60_000);
});

describe('dispose', () => {
  test('dispose() 后舞台内不再有 canvas', async () => {
    const result = await runBrowser<{ ready: boolean; canvasCountAfter: number }>(`
      ${BOOT}
      await js('window.handle && window.handle.dispose()');
      const canvasCountAfter = await js("document.querySelectorAll('#stage canvas').length");
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, canvasCountAfter }));
    `);
    expect(result.ready).toBe(true);
    expect(result.canvasCountAfter).toBe(0);
  }, 60_000);
});

describe('资料视角退出镜头位姿', () => {
  test('规则1: exitToDiorama 后依次经过 exiting、diorama，间隔不超过 1.2 秒，1 秒后镜头回到进入前记录的位姿', async () => {
    const px = ROAD_PIXEL.x;
    const py = ROAD_PIXEL.y;
    const result = await runBrowser<{ ready: boolean; views: string[]; times: number[]; distance: number }>(`
      ${BOOT}
      await js('window.handle.onViewChange((view) => { if (view === "entering" && window.handle.camera) window.__enterPos = { x: window.handle.camera.position.x, y: window.handle.camera.position.y, z: window.handle.camera.position.z }; })');
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: ${px}, y: ${py} });
      await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: ${px}, y: ${py}, button: 'left', buttons: 1, clickCount: 1 });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: ${px + 200}, y: ${py}, buttons: 1 });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: ${px + 200}, y: ${py}, button: 'left', buttons: 0, clickCount: 1 });
      const plaquePoint = await js('window.projectToScreen ? window.projectToScreen([0, -2.87, 14.245]) : null');
      const clickX = plaquePoint ? plaquePoint.x : ${PLAQUE_PIXEL.x};
      const clickY = plaquePoint ? plaquePoint.y : ${PLAQUE_PIXEL.y};
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: clickX, y: clickY });
      await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: clickX, y: clickY, button: 'left', buttons: 1, clickCount: 1 });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: clickX, y: clickY, button: 'left', buttons: 0, clickCount: 1 });
      const storyDeadline = Date.now() + 5000;
      let views = [];
      while (Date.now() < storyDeadline) {
        views = await js('window.views ?? []');
        if (views.includes('story')) break;
        await wait(0.05);
      }
      await js('window.handle.exitToDiorama()');
      const exitDeadline = Date.now() + 3000;
      while (Date.now() < exitDeadline) {
        views = await js('window.views ?? []');
        if (views.lastIndexOf('diorama') > views.indexOf('exiting')) break;
        await wait(0.05);
      }
      await wait(1);
      const distance = await js("(() => { const enter = window.__enterPos; const camera = window.handle && window.handle.camera; if (!enter || !camera) return 9999; return Math.hypot(camera.position.x - enter.x, camera.position.y - enter.y, camera.position.z - enter.z); })()");
      const times = await js('window.viewTimes ?? []');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, views, times, distance }));
    `);
    expect(result.ready).toBe(true);
    const exitingIndex = result.views.indexOf('exiting');
    const dioramaIndex = result.views.indexOf('diorama', exitingIndex + 1);
    expect(exitingIndex).toBeGreaterThanOrEqual(0);
    expect(dioramaIndex).toBeGreaterThan(exitingIndex);
    expect(result.times[dioramaIndex] - result.times[exitingIndex]).toBeLessThanOrEqual(1200);
    expect(result.distance).toBeLessThanOrEqual(0.1);
  }, 60_000);

  test('规则2: 进入动画结束的瞬间镜头已停在第 1 停靠点，不闪回进入前的位置', async () => {
    const px = PLAQUE_PIXEL.x;
    const py = PLAQUE_PIXEL.y;
    const stop0 = stopPose(0);
    const result = await runBrowser<{ ready: boolean; views: string[]; distance: number }>(`
      ${BOOT}
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: ${px}, y: ${py} });
      await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: ${px}, y: ${py}, button: 'left', buttons: 1, clickCount: 1 });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: ${px}, y: ${py}, button: 'left', buttons: 0, clickCount: 1 });
      const storyDeadline = Date.now() + 5000;
      let views = [];
      while (Date.now() < storyDeadline) {
        views = await js('window.views ?? []');
        if (views.includes('story')) break;
        await wait(0.05);
      }
      await js('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      const distance = await js("(() => { const camera = window.handle && window.handle.camera; if (!camera) return 9999; return camera.position.distanceTo({ x: ${stop0.position.x}, y: ${stop0.position.y}, z: ${stop0.position.z} }); })()");
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, views, distance }));
    `);
    expect(result.ready).toBe(true);
    expect(result.views).toContain('story');
    expect(result.distance).toBeLessThan(0.1);
  }, 60_000);
});

describe('离开整体视角后的悬停状态', () => {
  test('规则3: 离开整体视角后悬停不改变光标和边框亮度，边框仍随时间呼吸', async () => {
    const px = PLAQUE_PIXEL.x;
    const py = PLAQUE_PIXEL.y;
    const result = await runBrowser<{ ready: boolean; views: string[]; hoverCursor: string; cursorAfter: string; pair: [number, number] }>(`
      ${BOOT}
      const settle = () => js('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: ${px}, y: ${py} });
      await settle();
      const hoverCursor = await js("document.querySelector('#stage canvas').style.cursor");
      await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: ${px}, y: ${py}, button: 'left', buttons: 1, clickCount: 1 });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: ${px}, y: ${py}, button: 'left', buttons: 0, clickCount: 1 });
      const storyDeadline = Date.now() + 5000;
      let views = [];
      while (Date.now() < storyDeadline) {
        views = await js('window.views ?? []');
        if (views.includes('story')) break;
        await wait(0.05);
      }
      await settle();
      const cursorAfter = await js("document.querySelector('#stage canvas').style.cursor");
      const glow = () => js("window.handle.scene.getObjectByName('plaque-border').material.emissiveIntensity");
      const g1 = await glow();
      await wait(0.6);
      const g2 = await glow();
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, views, hoverCursor, cursorAfter, pair: [g1, g2] }));
    `);
    expect(result.ready).toBe(true);
    expect(result.views).toContain('story');
    expect(result.hoverCursor).toBe('pointer');
    expect(result.cursorAfter).not.toBe('pointer');
    expect(result.pair[0]).toBeLessThan(PLAQUE_GLOW.hover);
    expect(result.pair[1]).toBeLessThan(PLAQUE_GLOW.hover);
    expect(result.pair[0]).not.toBe(result.pair[1]);
  }, 60_000);
});

describe('铭牌右键点击', () => {
  test('规则4: 右键点击铭牌不进入资料视角', async () => {
    const px = PLAQUE_PIXEL.x;
    const py = PLAQUE_PIXEL.y;
    const result = await runBrowser<{ ready: boolean; views: string[] }>(`
      ${BOOT}
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: ${px}, y: ${py} });
      await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: ${px}, y: ${py}, button: 'right', buttons: 2, clickCount: 1 });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: ${px}, y: ${py}, button: 'right', buttons: 0, clickCount: 1 });
      await wait(2);
      const views = await js('window.views ?? []');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, views }));
    `);
    expect(result.ready).toBe(true);
    expect(result.views).not.toContain('entering');
  }, 60_000);
});

describe('竖屏下的视场角与整体默认镜头', () => {
  test('390×844 下相机 fov 等于 viewFov，镜头到默认观察目标的距离与宽屏相同', async () => {
    const result = await runBrowser<{ ready: boolean; fov: number; distance: number }>(`
      ${bootScript(390, 844)}
      const fov = await js("(() => { const camera = window.handle && window.handle.camera; return camera ? camera.fov : -1; })()");
      const distance = await js("(() => { const camera = window.handle && window.handle.camera; return camera ? camera.position.distanceTo({ x: 0, y: -1.4, z: -0.5 }) : -1; })()");
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, fov, distance }));
    `);
    expect(result.ready).toBe(true);
    expect(Math.abs(result.fov - viewFov(390, 844))).toBeLessThan(0.5);
    expect(Math.abs(result.distance - DEFAULT_DISTANCE)).toBeLessThan(0.5);
  }, 60_000);

  test('从 1440×900 改为 390×844 后，fov 随之变为 viewFov', async () => {
    const result = await runBrowser<{ ready: boolean; fovBefore: number; fovAfter: number }>(`
      ${bootScript(1440, 900)}
      const fovBefore = await js('window.handle.camera.fov');
      await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
      await wait(0.5);
      const fovAfter = await js('window.handle.camera.fov');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, fovBefore, fovAfter }));
    `);
    expect(result.ready).toBe(true);
    expect(result.fovBefore).toBeCloseTo(viewFov(1440, 900), 3);
    expect(Math.abs(result.fovAfter - viewFov(390, 844))).toBeLessThan(0.5);
  }, 60_000);

  test('390×844 下展示台（pedestal）与铭牌（plaque）包围盒完整在画面内', async () => {
    const result = await runBrowser<{ ready: boolean; inFrame: boolean }>(`
      ${bootScript(390, 844)}
      const inFrame = await js(\`(() => {
        const check = (name) => {
          const box = window.objectBox(name);
          if (!box) return false;
          const { min, max } = box;
          for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) {
            const p = window.projectToScreen([x, y, z]);
            if (!p || p.x < 0 || p.x > innerWidth || p.y < 0 || p.y > innerHeight || p.z > 1) return false;
          }
          return true;
        };
        return check('pedestal') && check('plaque');
      })()\`);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, inFrame }));
    `);
    expect(result.ready).toBe(true);
    expect(result.inFrame).toBe(true);
  }, 60_000);

  test('竖屏下先看资料后退出，镜头回到默认位姿', async () => {
    const result = await runBrowser<{ ready: boolean; distance: number }>(`
      ${bootScript(390, 844)}
      await js('window.handle.startStoryWithoutEntering()');
      await wait(0.3);
      await js('window.handle.exitToDiorama()');
      await wait(1);
      const distance = await js("(() => { const camera = window.handle && window.handle.camera; return camera ? camera.position.distanceTo({ x: ${DEFAULT_CAMERA.position[0]}, y: ${DEFAULT_CAMERA.position[1]}, z: ${DEFAULT_CAMERA.position[2]} }) : 9999; })()");
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, distance }));
    `);
    expect(result.ready).toBe(true);
    expect(result.distance).toBeLessThanOrEqual(0.1);
  }, 60_000);
});
