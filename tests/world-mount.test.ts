import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { createServer, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import * as THREE from 'three';
import { DEFAULT_CAMERA, viewFov } from '../diorama/layout';
import { PLAQUE_PANEL, PLAQUE_GLOW } from '../diorama/plaque';
import * as storyCamera from '../diorama/story-camera';
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

  test('场景中有 porsche 与 plaque-border', async () => {
    const result = await runBrowser<{ ready: boolean; hasPorsche: boolean; hasBorder: boolean }>(`
      ${BOOT}
      const hasPorsche = await js("window.handle.scene.getObjectByName('porsche') !== undefined");
      const hasBorder = await js("window.handle.scene.getObjectByName('plaque-border') !== undefined");
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, hasPorsche, hasBorder }));
    `);
    expect(result.ready).toBe(true);
    expect(result.hasPorsche).toBe(true);
    expect(result.hasBorder).toBe(true);
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
  test('exitToDiorama 后依次经过 exiting、diorama，间隔不超过 1.2 秒，1 秒后镜头回到进入前记录的位姿', async () => {
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

  test('进入动画结束的瞬间镜头已停在资料镜头位，不闪回进入前的位置', async () => {
    const px = PLAQUE_PIXEL.x;
    const py = PLAQUE_PIXEL.y;
    const storyPosition = storyCamera.storyPose().position;
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
      const distance = await js("(() => { const camera = window.handle && window.handle.camera; if (!camera) return 9999; return camera.position.distanceTo({ x: ${storyPosition.x}, y: ${storyPosition.y}, z: ${storyPosition.z} }); })()");
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, views, distance }));
    `);
    expect(result.ready).toBe(true);
    expect(result.views).toContain('story');
    expect(result.distance).toBeLessThan(0.05);
  }, 60_000);
});

describe('离开整体视角后的悬停状态', () => {
  test('离开整体视角后悬停不改变光标和边框亮度，资料视角暂停后边框亮度不再变化', async () => {
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
    expect(result.pair[0]).toBe(result.pair[1]);
  }, 60_000);
});

describe('铭牌右键点击', () => {
  test('右键点击铭牌不进入资料视角', async () => {
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

  test('竖屏下点铭牌进入后退出，镜头回到进入前位姿', async () => {
    const result = await runBrowser<{ ready: boolean; views: string[]; distance: number }>(`
      ${bootScript(390, 844)}
      await js('window.handle.onViewChange((view) => { if (view === "entering") window.__enterPos = window.handle.camera.position.clone(); })');
      await js('window.handle.enterStory()');
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
      await wait(0.3);
      const distance = await js("window.__enterPos ? window.handle.camera.position.distanceTo(window.__enterPos) : 9999");
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, views, distance }));
    `);
    expect(result.ready).toBe(true);
    expect(result.views).toContain('story');
    expect(result.distance).toBeLessThanOrEqual(0.1);
  }, 60_000);
});

describe('铭牌、车牌和车尾字样贴图随网页字体到达重画', () => {
  test('挂起字体请求时场景仍就绪；放行后铭牌、车牌和车尾字样材质贴图 version 增加', async () => {
    const result = await runBrowser<{ ready: boolean; versionBefore: number; versionAfter: number; plateBefore: number; plateAfter: number; wordBefore: number; wordAfter: number }>(`
      await cdp('Fetch.enable', { patterns: [{ urlPattern: '*.woff2*' }, { urlPattern: '*.woff*' }] });
      let release = false;
      let __stop = false;
      const pending = [];
      (async () => {
        while (!__stop) {
          for (const event of drainEvents()) {
            if (event.method !== 'Fetch.requestPaused') continue;
            if (release) await cdp('Fetch.continueRequest', { requestId: event.params.requestId });
            else pending.push(event.params.requestId);
          }
          await wait(0.05);
        }
      })();
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await cdp('Page.navigate', { url: ${JSON.stringify(PAGE_URL)} });
      let ready = false, mountError = null;
      const mountDeadline = Date.now() + 20000;
      while (Date.now() < mountDeadline) {
        ready = await js('!!window.ready').catch(() => false);
        mountError = await js('window.mountError ?? null').catch(() => null);
        if (ready || mountError) break;
        await wait(0.2);
      }
      const versionBefore = await js("window.handle.scene.getObjectByName('plaque-face').material.map.version");
      const plateBefore = await js("window.handle.scene.getObjectByName('license-plate-front').material.map.version");
      const wordBefore = await js("window.handle.scene.getObjectByName('rear-wordmark').material.map.version");
      release = true;
      for (const id of pending.splice(0)) await cdp('Fetch.continueRequest', { requestId: id });
      const redrawDeadline = Date.now() + 8000;
      let versionAfter = versionBefore;
      let plateAfter = plateBefore;
      let wordAfter = wordBefore;
      while (Date.now() < redrawDeadline) {
        versionAfter = await js("window.handle.scene.getObjectByName('plaque-face').material.map.version");
        plateAfter = await js("window.handle.scene.getObjectByName('license-plate-front').material.map.version");
        wordAfter = await js("window.handle.scene.getObjectByName('rear-wordmark').material.map.version");
        if (versionAfter > versionBefore && plateAfter > plateBefore && wordAfter > wordBefore) break;
        await wait(0.1);
      }
      __stop = true;
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, versionBefore, versionAfter, plateBefore, plateAfter, wordBefore, wordAfter }));
    `);
    expect(result.ready).toBe(true);
    expect(result.versionAfter).toBeGreaterThan(result.versionBefore);
    expect(result.plateAfter).toBeGreaterThan(result.plateBefore);
    expect(result.wordAfter).toBeGreaterThan(result.wordBefore);
  }, 60_000);
});

describe('地面倒影', () => {
  test('滚轮拉近拉远后回到默认视角，两面地面镜子拍到的最亮处与滚轮前相差不超过 10%', async () => {
    const result = await runBrowser<{ ready: boolean; before: number[]; after: number[] }>(`
      await cdp('Page.addScriptToEvaluateOnNewDocument', { source: \`
        let now = 0;
        const raf = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = (cb) => raf(() => { now += 16.667; cb(now); });
        performance.now = () => now;
      \` });
      ${BOOT}
      await js(\`(() => {
        const scene = window.handle.scene;
        scene.onBeforeRender = (renderer) => { window.renderer = renderer; };
        window.mirrorPeaks = () => scene.children.filter((o) => o.isReflector).map((mirror) => {
          const target = mirror.getRenderTarget();
          const pixels = new Uint16Array(target.width * target.height * 4);
          window.renderer.readRenderTargetPixels(target, 0, 0, target.width, target.height, pixels);
          const half = (h) => { const e = (h >> 10) & 31, f = h & 1023; return e === 0 ? f / 16777216 : e === 31 ? 0 : (1 + f / 1024) * 2 ** (e - 15); };
          let peak = 0;
          for (let i = 0; i < pixels.length; i += 4) peak = Math.max(peak, half(pixels[i]) + half(pixels[i + 1]) + half(pixels[i + 2]));
          return peak;
        });
      })()\`);
      await wait(2);
      const before = await js('window.mirrorPeaks()');
      for (const deltaY of [-400, 400, -400, 400]) {
        for (let i = 0; i < 10; i++) {
          await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 720, y: 450, deltaX: 0, deltaY });
          await wait(0.03);
        }
        await wait(0.3);
      }
      await wait(2);
      await js('window.handle.camera.position.set(${DEFAULT_CAMERA.position.join(', ')})');
      await wait(1.5);
      const after = await js('window.mirrorPeaks()');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, before, after }));
    `);
    expect(result.ready).toBe(true);
    expect(result.before).toHaveLength(2);
    result.before.forEach((peak, i) => {
      expect(peak).toBeGreaterThan(1);
      expect(result.after[i]).toBeGreaterThan(peak * 0.9);
      expect(result.after[i]).toBeLessThan(peak * 1.1);
    });
  }, 60_000);
});

interface RefreshTick {
  t: number;
  drawn: boolean;
  animTime: number;
}

function frameDriverScript(stepMs: number): string {
  return `
    (() => {
      const STEP = ${stepMs};
      let now = 0, draws = 0;
      const queue = [];
      for (const Context of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
        if (!Context) continue;
        for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements']) {
          const original = Context.prototype[name];
          if (original) Context.prototype[name] = function (...args) { draws++; return original.apply(this, args); };
        }
      }
      window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
      window.cancelAnimationFrame = () => {};
      performance.now = () => now;
      const animTime = () => {
        let value = 0;
        window.handle.scene.traverse((o) => { if (o.material && o.material.uniforms && o.material.uniforms.uTime) value = o.material.uniforms.uTime.value; });
        return value;
      };
      const pump = setInterval(() => { now += STEP; queue.splice(0).forEach((cb) => cb(now)); }, 4);
      window.stopRefreshPump = () => clearInterval(pump);
      window.runRefreshes = (durationMs) => {
        window.refreshTicks = null;
        (async () => {
          const ticks = [];
          for (let i = 0; i * STEP < durationMs; i++) {
            now += STEP;
            const before = draws;
            queue.splice(0).forEach((cb) => cb(now));
            ticks.push({ t: now, drawn: draws > before, animTime: animTime() });
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
          window.refreshTicks = ticks;
        })();
      };
    })();
  `;
}

async function simulateRefreshes(stepMs: number): Promise<{ ready: boolean; ticks: RefreshTick[] }> {
  return runBrowser<{ ready: boolean; ticks: RefreshTick[] }>(`
    await cdp('Page.addScriptToEvaluateOnNewDocument', { source: ${JSON.stringify(frameDriverScript(stepMs))} });
    ${BOOT}
    await js('window.stopRefreshPump()');
    await js('window.runRefreshes(1000)');
    let ticks = null;
    const runDeadline = Date.now() + 100000;
    while (Date.now() < runDeadline) {
      ticks = await js('window.refreshTicks');
      if (ticks) break;
      await wait(0.2);
    }
    cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, ticks }));
  `);
}

describe('帧率上限 60 帧', () => {
  const cases = [
    { hz: 60, stepMs: 1000 / 60, every: 1, frames: 60 },
    { hz: 120, stepMs: 1000 / 120, every: 2, frames: 60 },
    { hz: 144, stepMs: 6.94, every: 3, frames: 48 },
    { hz: 165, stepMs: 6.06, every: 3, frames: 55 },
  ];

  for (const { hz, stepMs, every, frames } of cases) {
    test(`${hz}Hz 刷新跑 1 秒画出约 ${frames} 帧，帧间隔均匀，跳过的刷新不推进动画时间`, async () => {
      const { ready, ticks } = await simulateRefreshes(stepMs);
      expect(ready).toBe(true);
      const drawn = ticks.filter((tick) => tick.drawn);
      expect(Math.abs(drawn.length - frames)).toBeLessThanOrEqual(1);
      for (let i = 1; i < drawn.length; i++) {
        expect(drawn[i].t - drawn[i - 1].t).toBeCloseTo(every * stepMs, 0);
        expect(drawn[i].animTime - drawn[i - 1].animTime).toBeCloseTo((every * stepMs) / 1000, 3);
      }
      for (let i = 1; i < ticks.length; i++) {
        if (!ticks[i].drawn) expect(ticks[i].animTime).toBe(ticks[i - 1].animTime);
      }
    }, 150_000);
  }
});

describe('渲染器不开默认画布抗锯齿', () => {
  test('舞台画布的 WebGL 上下文 antialias 为 false', async () => {
    const result = await runBrowser<{ ready: boolean; antialias: boolean | null }>(`
      ${BOOT}
      const antialias = await js(\`(() => {
        const canvas = document.querySelector('#stage canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        return gl ? gl.getContextAttributes().antialias : null;
      })()\`);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, antialias }));
    `);
    expect(result.ready).toBe(true);
    expect(result.antialias).toBe(false);
  }, 60_000);
});

describe('首帧渲染出错', () => {
  test('首帧 draw 抛错导致挂载失败后，推进刷新不再执行渲染循环', async () => {
    const result = await runBrowser<{ mountError: string | null; ready: boolean; drawsAfter: number; callbacksRun: number }>(`
      await cdp('Page.addScriptToEvaluateOnNewDocument', { source: \`
        (() => {
          const pending = new Map();
          let nextId = 0;
          let armed = true;
          let boundFramebuffer = null;
          window.__failed = false;
          window.__drawsAfter = 0;
          window.requestAnimationFrame = (cb) => { const id = ++nextId; pending.set(id, cb); return id; };
          window.cancelAnimationFrame = (id) => { pending.delete(id); };
          window.__pump = () => {
            const callbacks = [...pending.values()];
            pending.clear();
            callbacks.forEach((cb) => { try { cb(performance.now()); } catch (e) {} });
            return callbacks.length;
          };
          for (const Context of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
            if (!Context) continue;
            const originalBind = Context.prototype.bindFramebuffer;
            Context.prototype.bindFramebuffer = function (target, framebuffer) {
              boundFramebuffer = framebuffer;
              return originalBind.call(this, target, framebuffer);
            };
            for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements']) {
              const original = Context.prototype[name];
              if (!original) continue;
              Context.prototype[name] = function (...args) {
                if (window.__failed) window.__drawsAfter++;
                if (armed && boundFramebuffer === null) { armed = false; window.__failed = true; throw new Error('first draw failed'); }
                return original.apply(this, args);
              };
            }
          }
        })();
      \` });
      ${BOOT}
      await wait(0.3);
      let callbacksRun = 0;
      for (let i = 0; i < 20; i++) {
        callbacksRun += await js('window.__pump()');
        await wait(0.02);
      }
      const drawsAfter = await js('window.__drawsAfter');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, mountError, drawsAfter, callbacksRun }));
    `);
    expect(result.mountError).not.toBeNull();
    expect(result.ready).toBe(false);
    expect(result.drawsAfter).toBe(0);
    expect(result.callbacksRun).toBe(0);
  }, 60_000);

  test('运行中首帧之后某一帧画帧出错后，推进刷新不再执行渲染循环', async () => {
    const result = await runBrowser<{ ready: boolean; failed: boolean; drawsAfter: number; callbacksRun: number }>(`
      await cdp('Page.addScriptToEvaluateOnNewDocument', { source: \`
        (() => {
          const pending = new Map();
          let nextId = 0;
          let loopStarted = false;
          let frameNo = 0;
          let frameOpen = false;
          window.__failed = false;
          window.__drawsAfter = 0;
          window.requestAnimationFrame = (cb) => { const id = ++nextId; pending.set(id, cb); loopStarted = true; return id; };
          window.cancelAnimationFrame = (id) => { pending.delete(id); };
          window.__pump = () => {
            const callbacks = [...pending.values()];
            pending.clear();
            for (const cb of callbacks) {
              frameOpen = false;
              try { cb(performance.now()); } catch (e) {}
            }
            return callbacks.length;
          };
          for (const Context of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
            if (!Context) continue;
            for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements']) {
              const original = Context.prototype[name];
              if (!original) continue;
              Context.prototype[name] = function (...args) {
                if (window.__failed) window.__drawsAfter++;
                if (loopStarted && !window.__failed && !frameOpen) {
                  frameOpen = true;
                  frameNo++;
                  if (frameNo === 3) { window.__failed = true; throw new Error('third frame draw failed'); }
                }
                return original.apply(this, args);
              };
            }
          }
        })();
      \` });
      ${BOOT}
      await wait(0.3);
      for (let i = 0; i < 30 && !(await js('window.__failed')); i++) {
        await js('window.__pump()');
        await wait(0.02);
      }
      const failed = await js('window.__failed');
      let callbacksRun = 0;
      for (let i = 0; i < 20; i++) {
        callbacksRun += await js('window.__pump()');
        await wait(0.02);
      }
      const drawsAfter = await js('window.__drawsAfter');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, failed, drawsAfter, callbacksRun }));
    `);
    expect(result.ready).toBe(true);
    expect(result.failed).toBe(true);
    expect(result.drawsAfter).toBe(0);
    expect(result.callbacksRun).toBe(0);
  }, 60_000);
});

function pauseDriverScript(stepMs: number): string {
  return `
    (() => {
      const STEP = ${stepMs};
      let now = 0, maxPerTick = 0, draws = 0, screenDraws = 0, boundFramebuffer = null, callbacksRun = 0, mark = null, firstDrawAt = null, firstDrawTime = null;
      const queue = [];
      const animTime = () => {
        let value = 0;
        window.handle.scene.traverse((o) => { if (o.material && o.material.uniforms && o.material.uniforms.uTime) value = o.material.uniforms.uTime.value; });
        return value;
      };
      for (const Context of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
        if (!Context) continue;
        const originalBind = Context.prototype.bindFramebuffer;
        Context.prototype.bindFramebuffer = function (target, framebuffer) {
          boundFramebuffer = framebuffer;
          return originalBind.call(this, target, framebuffer);
        };
        for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements']) {
          const original = Context.prototype[name];
          if (!original) continue;
          Context.prototype[name] = function (...args) {
            draws++;
            if (boundFramebuffer === null) screenDraws++;
            if (mark !== null && firstDrawAt === null) { firstDrawAt = now; firstDrawTime = animTime(); }
            return original.apply(this, args);
          };
        }
      }
      window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
      window.cancelAnimationFrame = () => {};
      performance.now = () => now;
      setInterval(() => {
        now += STEP;
        const callbacks = queue.splice(0);
        callbacksRun += callbacks.length;
        maxPerTick = Math.max(maxPerTick, callbacks.length);
        callbacks.forEach((cb) => cb(now));
      }, 4);
      window.drv = {
        now: () => now,
        draws: () => draws,
        callbacks: () => callbacksRun,
        maxPerTick: () => maxPerTick,
        resetMaxPerTick() { maxPerTick = 0; },
        animTime,
        screenDraws: () => screenDraws,
        markExit() { mark = now; firstDrawAt = null; firstDrawTime = null; },
        exitObservation: () => ({ markAt: mark, firstDrawAt, firstDrawTime }),
      };
    })();
  `;
}

const PAUSE_HELPERS = `
  async function waitView(view, limitSeconds) {
    const deadline = Date.now() + limitSeconds * 1000;
    while (Date.now() < deadline) {
      if ((await js('window.views ?? []')).includes(view)) return true;
      await wait(0.02);
    }
    return false;
  }
  async function waitFake(ms) {
    const target = (await js('window.drv.now()')) + ms;
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline && (await js('window.drv.now()')) < target) await wait(0.02);
  }
  async function enterAndSettle() {
    await js('window.handle.enterStory()');
    await waitView('story', 10);
    await wait(0.3);
  }
  async function waitDiorama() {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      const views = await js('window.views ?? []');
      if (views.lastIndexOf('diorama') > views.indexOf('exiting') && views.indexOf('exiting') >= 0) return;
      await wait(0.02);
    }
  }
`;

function pauseScript(stepMs: number, width = 1440, height = 900): string {
  return `
    await cdp('Page.addScriptToEvaluateOnNewDocument', { source: ${JSON.stringify(pauseDriverScript(stepMs))} });
    ${bootScript(width, height)}
    ${PAUSE_HELPERS}
  `;
}

describe('资料视角镜头位与进入', () => {
  test('进入后镜头与资料镜头位距离小于 0.05 米，entering 到 story 不超过 1.5 秒', async () => {
    const pose = storyCamera.storyPose();
    const result = await runBrowser<{ ready: boolean; views: string[]; times: number[]; position: number[] }>(`
      ${pauseScript(1000 / 60)}
      await js('window.handle.enterStory()');
      await waitView('story', 10);
      await wait(0.3);
      const position = await js('window.handle.camera.position.toArray()');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, views: await js('window.views'), times: await js('window.viewTimes'), position }));
    `);
    expect(result.ready).toBe(true);
    expect(new THREE.Vector3(...result.position).distanceTo(pose.position)).toBeLessThan(0.05);
    const enterIndex = result.views.indexOf('entering');
    const storyIndex = result.views.indexOf('story', enterIndex + 1);
    expect(storyIndex).toBeGreaterThan(enterIndex);
    expect(result.times[storyIndex] - result.times[enterIndex]).toBeLessThanOrEqual(1500);
  }, 60_000);
});

describe('资料视角暂停渲染', () => {
  test('进入 story 后连续 1 秒 draw 调用为 0，且没有刷新回调在执行', async () => {
    const result = await runBrowser<{ ready: boolean; drawsDelta: number; callbacksDelta: number; fakeElapsed: number }>(`
      ${pauseScript(1000 / 60)}
      await enterAndSettle();
      const d0 = await js('window.drv.draws()');
      const c0 = await js('window.drv.callbacks()');
      const n0 = await js('window.drv.now()');
      const limit = Date.now() + 5000;
      while (Date.now() < limit && (await js('window.drv.now()')) - n0 < 1000) await wait(0.05);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({
        ready,
        drawsDelta: (await js('window.drv.draws()')) - d0,
        callbacksDelta: (await js('window.drv.callbacks()')) - c0,
        fakeElapsed: (await js('window.drv.now()')) - n0,
      }));
    `);
    expect(result.ready).toBe(true);
    expect(result.fakeElapsed).toBeGreaterThanOrEqual(1000);
    expect(result.drawsDelta).toBe(0);
    expect(result.callbacksDelta).toBe(0);
  }, 60_000);

  test('暂停期间场景动画时间与铭牌边框亮度都不再变化', async () => {
    const result = await runBrowser<{ ready: boolean; timeBefore: number; timeAfter: number; glowBefore: number; glowAfter: number }>(`
      ${pauseScript(1000 / 60)}
      await enterAndSettle();
      const glow = () => js("window.handle.scene.getObjectByName('plaque-border').material.emissiveIntensity");
      const timeBefore = await js('window.drv.animTime()');
      const glowBefore = await glow();
      await waitFake(2000);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, timeBefore, timeAfter: await js('window.drv.animTime()'), glowBefore, glowAfter: await glow() }));
    `);
    expect(result.ready).toBe(true);
    expect(result.timeAfter).toBe(result.timeBefore);
    expect(result.glowAfter).toBe(result.glowBefore);
  }, 60_000);

  test('暂停期间窗口尺寸变化：尺寸、比例、取景偏移更新，只画一帧，动画时间不推进', async () => {
    const offset = storyCamera.framingOffset(1000, 700);
    const result = await runBrowser<{ ready: boolean; screenDraws: number; baseline: number; drawsDelta: number; timeBefore: number; timeAfter: number; fov: number; aspect: number; offsetX: number | null; screenDrawsLater: number }>(`
      ${pauseScript(1000 / 60)}
      const s0 = await js('window.drv.screenDraws()');
      const t0 = await js('window.drv.now()');
      await waitFake(1000);
      const elapsedFrames = Math.round(((await js('window.drv.now()')) - t0) / ${1000 / 60});
      const baseline = ((await js('window.drv.screenDraws()')) - s0) / elapsedFrames;
      await enterAndSettle();
      const f0 = await js('window.drv.screenDraws()');
      const d0 = await js('window.drv.draws()');
      const timeBefore = await js('window.drv.animTime()');
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1000, height: 700, deviceScaleFactor: 1, mobile: false });
      await wait(0.6);
      const screenDraws = (await js('window.drv.screenDraws()')) - f0;
      const drawsDelta = (await js('window.drv.draws()')) - d0;
      await wait(0.6);
      const screenDrawsLater = (await js('window.drv.screenDraws()')) - f0;
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({
        ready, screenDraws, baseline, drawsDelta, screenDrawsLater, timeBefore,
        timeAfter: await js('window.drv.animTime()'),
        fov: await js('window.handle.camera.fov'),
        aspect: await js('window.handle.camera.aspect'),
        offsetX: await js('window.handle.camera.view ? window.handle.camera.view.offsetX : null'),
      }));
    `);
    expect(result.ready).toBe(true);
    expect(Math.round(result.baseline)).toBe(1);
    expect(result.screenDraws).toBe(1);
    expect(result.screenDrawsLater).toBe(1);
    expect(result.drawsDelta).toBeGreaterThan(0);
    expect(result.timeAfter).toBe(result.timeBefore);
    expect(Math.abs(result.fov - viewFov(1000, 700))).toBeLessThan(0.5);
    expect(result.aspect).toBeCloseTo(1000 / 700, 3);
    expect(result.offsetX).toBeCloseTo(offset.x, 3);
  }, 60_000);
});

describe('退出资料视角恢复渲染', () => {
  test('exitToDiorama 后 0.2 秒内出现 draw；停留 5 秒后恢复，第一帧动画时间与暂停前相差不超过 0.1 秒', async () => {
    const result = await runBrowser<{ ready: boolean; pausedTime: number; markAt: number; firstDrawAt: number | null; firstDrawTime: number | null }>(`
      ${pauseScript(1000 / 60)}
      await enterAndSettle();
      const pausedTime = await js('window.drv.animTime()');
      await waitFake(5000);
      await js('window.drv.markExit()');
      await js('window.handle.exitToDiorama()');
      await wait(0.6);
      const obs = await js('window.drv.exitObservation()');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, pausedTime, markAt: obs.markAt, firstDrawAt: obs.firstDrawAt, firstDrawTime: obs.firstDrawTime }));
    `);
    expect(result.ready).toBe(true);
    expect(result.firstDrawAt).not.toBeNull();
    expect(result.firstDrawAt! - result.markAt).toBeLessThanOrEqual(200);
    expect(Math.abs(result.firstDrawTime! - result.pausedTime)).toBeLessThanOrEqual(0.1);
  }, 60_000);

  test('退出后 view 依次 exiting、diorama，不超过 1.2 秒，镜头与进入前位置距离不超过 0.1 米', async () => {
    const result = await runBrowser<{ ready: boolean; views: string[]; times: number[]; distance: number }>(`
      ${pauseScript(1000 / 60)}
      await js('window.handle.onViewChange((view) => { if (view === "entering") window.__enterPos = window.handle.camera.position.clone(); })');
      await enterAndSettle();
      await waitFake(3000);
      await js('window.handle.exitToDiorama()');
      await waitDiorama();
      await wait(0.3);
      const distance = await js('window.__enterPos ? window.handle.camera.position.distanceTo(window.__enterPos) : 9999');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, views: await js('window.views'), times: await js('window.viewTimes'), distance }));
    `);
    expect(result.ready).toBe(true);
    const exitingIndex = result.views.indexOf('exiting');
    const dioramaIndex = result.views.indexOf('diorama', exitingIndex + 1);
    expect(exitingIndex).toBeGreaterThanOrEqual(0);
    expect(dioramaIndex).toBeGreaterThan(exitingIndex);
    expect(result.times[dioramaIndex] - result.times[exitingIndex]).toBeLessThanOrEqual(1200);
    expect(result.distance).toBeLessThanOrEqual(0.1);
  }, 60_000);
});

describe('暂停与降档统计', () => {
  test('对照：整体视角下持续 50 毫秒慢帧 7 秒会降档', async () => {
    const result = await runBrowser<{ ready: boolean; tiers: string[] }>(`
      ${pauseScript(50)}
      await js('window.__tiers = []; window.handle.onQualityChange((tier) => window.__tiers.push(tier))');
      await waitFake(7000);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, tiers: await js('window.__tiers') }));
    `);
    expect(result.ready).toBe(true);
    expect(result.tiers).toEqual(['low']);
  }, 90_000);

  test('在 story 停留 10 秒（慢帧时钟）再退出，退出后继续跑帧也不降档', async () => {
    const result = await runBrowser<{ ready: boolean; tiers: string[]; views: string[] }>(`
      ${pauseScript(50)}
      await js('window.__tiers = []; window.handle.onQualityChange((tier) => window.__tiers.push(tier))');
      await enterAndSettle();
      await waitFake(10000);
      await js('window.handle.exitToDiorama()');
      await waitDiorama();
      await waitFake(1500);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, tiers: await js('window.__tiers'), views: await js('window.views') }));
    `);
    expect(result.ready).toBe(true);
    expect(result.views).toContain('diorama');
    expect(result.tiers).toEqual([]);
  }, 120_000);
});

describe('暂停边界', () => {
  test('story 到达的同一帧立刻退出，之后每次刷新只执行 1 个渲染循环回调', async () => {
    const result = await runBrowser<{ ready: boolean; views: string[]; maxPerTick: number }>(`
      ${pauseScript(1000 / 60)}
      await js('window.handle.onViewChange((view) => { if (view === "story") window.handle.exitToDiorama(); })');
      await js('window.handle.enterStory()');
      await waitDiorama();
      await js('window.drv.resetMaxPerTick()');
      await waitFake(500);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, views: await js('window.views'), maxPerTick: await js('window.drv.maxPerTick()') }));
    `);
    expect(result.ready).toBe(true);
    expect(result.views).toContain('diorama');
    expect(result.maxPerTick).toBe(1);
  }, 60_000);

  test('暂停期间切换语言：画到屏幕的 draw 恰为 1 次，动画时间不变，之后 0.6 秒不再画', async () => {
    const result = await runBrowser<{ ready: boolean; screenDraws: number; screenDrawsLater: number; timeBefore: number; timeAfter: number }>(`
      ${pauseScript(1000 / 60)}
      await enterAndSettle();
      const f0 = await js('window.drv.screenDraws()');
      const timeBefore = await js('window.drv.animTime()');
      await js("window.handle.setLanguage('en')");
      await wait(0.3);
      const screenDraws = (await js('window.drv.screenDraws()')) - f0;
      await wait(0.6);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({
        ready, screenDraws, timeBefore,
        screenDrawsLater: (await js('window.drv.screenDraws()')) - f0,
        timeAfter: await js('window.drv.animTime()'),
      }));
    `);
    expect(result.ready).toBe(true);
    expect(result.screenDraws).toBe(1);
    expect(result.screenDrawsLater).toBe(1);
    expect(result.timeAfter).toBe(result.timeBefore);
  }, 60_000);

  test('短暂停不降档：正常帧 1 秒、story 停留 2.5 秒、退出后再跑 5 秒正常帧，不触发降档', async () => {
    const result = await runBrowser<{ ready: boolean; tiers: string[]; views: string[] }>(`
      ${pauseScript(1000 / 60)}
      await js('window.__tiers = []; window.handle.onQualityChange((tier) => window.__tiers.push(tier))');
      await waitFake(1000);
      await enterAndSettle();
      await waitFake(2500);
      await js('window.handle.exitToDiorama()');
      await waitDiorama();
      await waitFake(5000);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ready, tiers: await js('window.__tiers'), views: await js('window.views') }));
    `);
    expect(result.ready).toBe(true);
    expect(result.views).toContain('diorama');
    expect(result.tiers).toEqual([]);
  }, 90_000);

  test('暂停中 dispose：之后推进 20 轮刷新，没有渲染循环回调执行，也没有 draw', async () => {
    const result = await runBrowser<{ ready: boolean; drawsDelta: number; callbacksDelta: number; fakeElapsed: number }>(`
      ${pauseScript(1000 / 60)}
      await enterAndSettle();
      await js('window.handle.dispose()');
      const d0 = await js('window.drv.draws()');
      const c0 = await js('window.drv.callbacks()');
      const n0 = await js('window.drv.now()');
      await waitFake(20 * ${1000 / 60});
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({
        ready,
        drawsDelta: (await js('window.drv.draws()')) - d0,
        callbacksDelta: (await js('window.drv.callbacks()')) - c0,
        fakeElapsed: (await js('window.drv.now()')) - n0,
      }));
    `);
    expect(result.ready).toBe(true);
    expect(result.fakeElapsed).toBeGreaterThanOrEqual(20 * (1000 / 60));
    expect(result.callbacksDelta).toBe(0);
    expect(result.drawsDelta).toBe(0);
  }, 60_000);
});
