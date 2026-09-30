// 依赖 dist/ 为最新构建产物：运行前先执行 `bun run build`，本文件不重复构建。
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import path from 'node:path';
import { preview, type PreviewServer } from 'vite';
import * as THREE from 'three';
import { runBrowser } from './browser';
import { plaquePoint, roadPoint } from './scene-helpers';
import { DEFAULT_CAMERA } from '../diorama/layout';
import { PLAQUE_PANEL } from '../diorama/plaque';
import { COPY } from '../copy';

const ROOT = path.resolve(import.meta.dir, '..');
const PORT = 4202;
const BASE_URL = `http://127.0.0.1:${PORT}/`;

let server: PreviewServer;

beforeAll(async () => {
  server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: PORT, strictPort: true } });
});

afterAll(async () => {
  await server.close();
});

const HELPERS = `
  async function holdScene() {
    await cdp('Fetch.enable', { patterns: [{ urlPattern: '*/assets/world-*.js' }] });
  }
  async function pressKey(key, code, vk, text) {
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, ...(text ? { text } : {}) });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk });
  }
  async function settle() {
    await js('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  }
  async function waitSceneReady() {
    const deadline = Date.now() + 40000;
    while (Date.now() < deadline) {
      if (await js("document.documentElement.dataset.view === 'diorama' && document.querySelector('#scene')?.getAttribute('aria-busy') === 'false'")) return;
      await wait(0.2);
    }
  }
  async function enterStoryByKeyboard() {
    await pressKey('Tab', 'Tab', 9);
    await settle();
    await pressKey('Enter', 'Enter', 13, '\\r');
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      if ((await js('document.documentElement.dataset.view')) === 'story') return;
      await wait(0.05);
    }
  }
  const BACK = "Array.from(document.querySelectorAll('button')).find((b) => ['返回全景', 'Back to overview'].includes(b.textContent.trim()))";
  const EFFOP = "(el) => { let o = 1; for (; el; el = el.parentElement) o *= Number(getComputedStyle(el).opacity); return o; }";
  const VISIBLE = "(el) => { if (!el) return false; const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && (" + EFFOP + ")(el) > 0 && !el.closest('[hidden]'); }";
  const SCROLLER = "(() => { for (let el = document.querySelector('.receipt') && document.querySelector('.receipt').parentElement; el && el !== document.body; el = el.parentElement) { if (/auto|scroll/.test(getComputedStyle(el).overflowY)) return el; } return null; })()";
  async function waitStory() {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      if ((await js('window.__views')).includes('story')) return;
      await wait(0.05);
    }
  }
  async function waitExited() {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      if (await js("(() => { const v = window.__views; const e = v.lastIndexOf('exiting'); return e >= 0 && v.indexOf('diorama', e + 1) > e; })()")) return;
      await wait(0.05);
    }
  }
  async function isVisible(expr) {
    return js('(' + VISIBLE + ')(' + expr + ')');
  }
  async function clickBack() {
    const p = await js('(() => { const b = ' + BACK + '; if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()');
    await click([p.x, p.y]);
  }
  async function screenshot() {
    const r = await cdp('Page.captureScreenshot', { format: 'png' });
    return r.data;
  }
`;

const VIEW_TRACKER = `
  window.__views = [];
  window.__viewTimes = [];
  (function track() {
    const record = () => {
      const v = document.documentElement?.dataset.view ?? null;
      if (v !== null && window.__views[window.__views.length - 1] !== v) {
        window.__views.push(v);
        window.__viewTimes.push(performance.now());
      }
    };
    new MutationObserver(record).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-view'] });
    record();
  })();
`;

function boot(width: number, height: number, opts: { lang?: 'zh-CN' | 'en-US'; extraScript?: string; waitForExpr?: string } = {}): string {
  const { lang, extraScript = '', waitForExpr = "document.documentElement.dataset.view === 'diorama' && document.querySelector('#scene')?.getAttribute('aria-busy') === 'false'" } = opts;
  return `
    await cdp('Emulation.setDeviceMetricsOverride', { width: ${width}, height: ${height}, deviceScaleFactor: 1, mobile: false });
    ${lang ? `
    const __ua = await js('navigator.userAgent');
    await cdp('Emulation.setUserAgentOverride', { userAgent: __ua, acceptLanguage: ${JSON.stringify(lang)} });
    ` : ''}
    await cdp('Page.addScriptToEvaluateOnNewDocument', { source: ${JSON.stringify(VIEW_TRACKER + extraScript)} });
    await navigate(${JSON.stringify(BASE_URL)});
    const __deadline = Date.now() + 40000;
    while (Date.now() < __deadline) {
      const __done = await js(${JSON.stringify(waitForExpr)});
      if (__done) break;
      await wait(0.2);
    }
  `;
}

describe('整体视角', () => {
  test('滚轮不改变 scrollY，页面始终不可滚动', async () => {
    const point = roadPoint(1440, 900);
    const result = await runBrowser<{ view: string | null; quality: string | null; scrollYs: number[] }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      const view = await js('document.documentElement.dataset.view ?? null');
      const quality = await js('document.documentElement.dataset.quality ?? null');
      const before = await js('window.scrollY');
      await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: ${point.x}, y: ${point.y}, deltaX: 0, deltaY: 800 });
      await wait(0.3);
      const after = await js('window.scrollY');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view, quality, scrollYs: [before, after] }));
    `);
    expect(result.view).toBe('diorama');
    expect(result.quality).toBe('high');
    expect(result.scrollYs).toEqual([0, 0]);
  }, 90_000);

  test('小票层隐藏且 inert，没有可见的语言开关与返回按钮，页面不含进度点与 SCROLL 提示', async () => {
    const result = await runBrowser<{ view: string | null; receiptHidden: boolean; receiptInert: boolean; langVisible: boolean; backVisible: boolean; staleDom: boolean }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      const data = await js(\`(() => {
        const receipt = document.querySelector('.receipt');
        return {
          receiptHidden: !!receipt && !!receipt.closest('[hidden]'),
          receiptInert: !!receipt && !!receipt.closest('[inert]'),
          staleDom: document.querySelectorAll('.story-dot, .story-sections').length > 0 || document.body.textContent.includes('SCROLL ↓'),
        };
      })()\`);
      const langVisible = await isVisible("document.querySelector('.language-toggle')");
      const backVisible = await isVisible(BACK);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view: await js('document.documentElement.dataset.view ?? null'), ...data, langVisible, backVisible }));
    `);
    expect(result.view).toBe('diorama');
    expect(result.receiptHidden).toBe(true);
    expect(result.receiptInert).toBe(true);
    expect(result.langVisible).toBe(false);
    expect(result.backVisible).toBe(false);
    expect(result.staleDom).toBe(false);
  }, 90_000);

  test('Ctrl+滚轮不被拦截', async () => {
    const result = await runBrowser<{ defaultPrevented: boolean }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      const defaultPrevented = await js(\`(() => {
        const event = new WheelEvent('wheel', { deltaY: 100, ctrlKey: true, cancelable: true, bubbles: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      })()\`);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ defaultPrevented }));
    `);
    expect(result.defaultPrevented).toBe(false);
  }, 90_000);
});

describe('键盘隐藏按钮', () => {
  test('平时视觉不可见，Tab 聚焦后出现在左上角，读屏名字为「查看资料」或 View profile', async () => {
    const result = await runBrowser<{ view: string | null; beforeVisible: boolean; afterRect: { top: number; left: number; width: number; height: number } | null; accessibleName: string }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      const beforeVisible = await js(\`(() => {
        const btn = document.querySelector('.enter-story-button');
        if (!btn) return false;
        const r = btn.getBoundingClientRect();
        return r.top >= 0 && r.left >= 0 && r.width > 0 && r.height > 0;
      })()\`);
      await pressKey('Tab', 'Tab', 9);
      await settle();
      const afterRect = await js(\`(() => {
        const btn = document.querySelector('.enter-story-button');
        if (document.activeElement !== btn) return null;
        const r = btn.getBoundingClientRect();
        return { top: r.top, left: r.left, width: r.width, height: r.height };
      })()\`);
      const accessibleName = await js(\`(() => {
        const btn = document.querySelector('.enter-story-button');
        return btn ? (btn.getAttribute('aria-label') || btn.textContent || '') : '';
      })()\`);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view: await js('document.documentElement.dataset.view ?? null'), beforeVisible, afterRect, accessibleName }));
    `);
    expect(result.view).toBe('diorama');
    expect(result.beforeVisible).toBe(false);
    expect(result.afterRect).not.toBeNull();
    expect(result.afterRect!.width).toBeGreaterThan(0);
    expect(result.afterRect!.height).toBeGreaterThan(0);
    expect(result.afterRect!.top).toBeLessThan(200);
    expect(result.afterRect!.left).toBeLessThan(200);
    expect(['查看资料', 'View profile']).toContain(result.accessibleName.trim());
  }, 90_000);

  test('聚焦后回车或空格等同点铭牌，触发 entering 与 story', async () => {
    const result = await runBrowser<{ enter: string[]; space: string[] }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await pressKey('Tab', 'Tab', 9);
      await settle();
      await pressKey('Enter', 'Enter', 13, '\\r');
      const deadline1 = Date.now() + 5000;
      while (Date.now() < deadline1) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      const enter = await js('window.__views');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ enter, space: [] }));
    `);
    expect(result.enter.indexOf('entering')).toBeGreaterThanOrEqual(0);
    expect(result.enter.indexOf('story')).toBeGreaterThan(result.enter.indexOf('entering'));

    const spaceResult = await runBrowser<{ views: string[] }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await pressKey('Tab', 'Tab', 9);
      await settle();
      await pressKey(' ', 'Space', 32, ' ');
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ views: await js('window.__views') }));
    `);
    expect(spaceResult.views.indexOf('entering')).toBeGreaterThanOrEqual(0);
    expect(spaceResult.views.indexOf('story')).toBeGreaterThan(spaceResult.views.indexOf('entering'));
  }, 90_000);

  test('仅整体视角且就绪时可聚焦：进入资料视角后 Tab 不会落到该按钮上', async () => {
    const result = await runBrowser<{ views: string[]; focusedEnterButton: boolean }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await enterStoryByKeyboard();
      let focusedEnterButton = false;
      for (let i = 0; i < 15; i++) {
        await pressKey('Tab', 'Tab', 9);
        await settle();
        if (await js("document.activeElement?.classList.contains('enter-story-button') ?? false")) focusedEnterButton = true;
      }
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ views: await js('window.__views'), focusedEnterButton }));
    `);
    expect(result.views).toContain('story');
    expect(result.focusedEnterButton).toBe(false);
  }, 90_000);

  test('整体视角下连续按 Tab，焦点不会落到隐藏的小票链接上', async () => {
    const result = await runBrowser<{ view: string | null; focusedInside: boolean }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      let focusedInside = false;
      for (let i = 0; i < 20; i++) {
        await pressKey('Tab', 'Tab', 9);
        await settle();
        if (await js("!!document.activeElement?.closest('.receipt')")) focusedInside = true;
      }
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view: await js('document.documentElement.dataset.view ?? null'), focusedInside }));
    `);
    expect(result.view).toBe('diorama');
    expect(result.focusedInside).toBe(false);
  }, 90_000);
});

describe('进入', () => {
  test('点击铭牌依次触发 entering 与 story，间隔不超过 1.5 秒', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ views: string[]; times: number[] }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ views: await js('window.__views'), times: await js('window.__viewTimes') }));
    `);
    const enterIndex = result.views.indexOf('entering');
    const storyIndex = result.views.indexOf('story', enterIndex + 1);
    expect(enterIndex).toBeGreaterThanOrEqual(0);
    expect(storyIndex).toBeGreaterThan(enterIndex);
    expect(result.times[storyIndex] - result.times[enterIndex]).toBeLessThanOrEqual(1500);
  }, 90_000);

  test('按下后拖动超过 5 像素再松开不算点击，不触发进入', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ view: string | null; views: string[] }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      const view = await js('document.documentElement.dataset.view ?? null');
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: ${p.x}, y: ${p.y} });
      await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: ${p.x}, y: ${p.y}, button: 'left', buttons: 1, clickCount: 1 });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: ${p.x + 30}, y: ${p.y}, buttons: 1 });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: ${p.x + 30}, y: ${p.y}, button: 'left', buttons: 0, clickCount: 1 });
      await wait(2);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view, views: await js('window.__views') }));
    `);
    expect(result.view).toBe('diorama');
    expect(result.views).not.toContain('entering');
  }, 90_000);

  test('过渡中 Esc 与滚轮不改变状态，history 与地址栏不变', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ views: string[]; historyDelta: number; sameUrl: boolean }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      const historyBefore = await js('history.length');
      const urlBefore = await js('location.href');
      await click([${p.x}, ${p.y}]);
      await wait(0.3);
      await pressKey('Escape', 'Escape', 27);
      await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: ${p.x}, y: ${p.y}, deltaX: 0, deltaY: 200 });
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      const historyAfter = await js('history.length');
      const urlAfter = await js('location.href');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ views: await js('window.__views'), historyDelta: historyAfter - historyBefore, sameUrl: urlBefore === urlAfter }));
    `);
    expect(result.views).toContain('story');
    expect(result.views.lastIndexOf('diorama')).toBe(0);
    expect(result.historyDelta).toBe(0);
    expect(result.sameUrl).toBe(true);
  }, 90_000);

  test('进入后焦点在小票里的名字，小票、返回按钮、语言开关可见，页面不含进度点与 SCROLL 提示', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ view: string | null; activeIsName: boolean; receiptVisible: boolean; backVisible: boolean; langVisible: boolean; scrollY: number; staleDom: boolean }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      await waitStory();
      await settle();
      const activeIsName = await js(\`(() => {
        const h1 = document.querySelector('.receipt h1');
        return !!h1 && h1.textContent === 'FUBUKI_BB' && document.activeElement === h1;
      })()\`);
      const receiptVisible = await isVisible("document.querySelector('.receipt')");
      const backVisible = await isVisible(BACK);
      const langVisible = await isVisible("document.querySelector('.language-toggle')");
      const staleDom = await js("document.querySelectorAll('.story-dot, .story-sections').length > 0 || document.body.textContent.includes('SCROLL ↓')");
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view: await js('document.documentElement.dataset.view ?? null'), activeIsName, receiptVisible, backVisible, langVisible, scrollY: await js('window.scrollY'), staleDom }));
    `);
    expect(result.view).toBe('story');
    expect(result.activeIsName).toBe(true);
    expect(result.receiptVisible).toBe(true);
    expect(result.backVisible).toBe(true);
    expect(result.langVisible).toBe(true);
    expect(result.scrollY).toBe(0);
    expect(result.staleDom).toBe(false);
  }, 90_000);

  test('进入中不渲染返回按钮，小票层隐藏且 inert', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ snapshots: { back: boolean; receiptInert: boolean; receiptHidden: boolean }[] }>(`
      ${HELPERS}
      ${boot(1440, 900, {
        extraScript: `
          window.__entering = [];
          (function loop() {
            if (document.documentElement?.dataset.view === 'entering') {
              const receipt = document.querySelector('.receipt');
              window.__entering.push({
                back: Array.from(document.querySelectorAll('button')).some((b) => ['返回全景', 'Back to overview'].includes(b.textContent.trim())),
                receiptInert: !!receipt && !!receipt.closest('[inert]'),
                receiptHidden: !!receipt && !!receipt.closest('[hidden]'),
              });
            }
            requestAnimationFrame(loop);
          })();
        `,
      })}
      await click([${p.x}, ${p.y}]);
      await waitStory();
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ snapshots: await js('window.__entering') }));
    `);
    expect(result.snapshots.length).toBeGreaterThan(0);
    for (const snapshot of result.snapshots) {
      expect(snapshot.back).toBe(false);
      expect(snapshot.receiptInert).toBe(true);
      expect(snapshot.receiptHidden).toBe(true);
    }
  }, 90_000);
});

describe('资料视角', () => {
  test('Esc 退出：data-view 依次 exiting、diorama，间隔不超过 1.2 秒，之后滚轮改变镜头距离且 scrollY 为 0', async () => {
    const p = plaquePoint(1440, 900);
    const road = roadPoint(1440, 900);
    const result = await runBrowser<{ views: string[]; times: number[]; scrollY: number; before: string; after: string }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await pressKey('Escape', 'Escape', 27);
      const exitDeadline = Date.now() + 3000;
      while (Date.now() < exitDeadline) {
        if (await js("(() => { const v = window.__views; const e = v.lastIndexOf('exiting'); return e >= 0 && v.indexOf('diorama', e + 1) > e; })()")) break;
        await wait(0.05);
      }
      await settle();
      const before = await screenshot();
      await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: ${road.x}, y: ${road.y}, deltaX: 0, deltaY: 200 });
      await wait(0.4);
      const after = await screenshot();
      const scrollY = await js('window.scrollY');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ views: await js('window.__views'), times: await js('window.__viewTimes'), scrollY, before, after }));
    `);
    const exitingIndex = result.views.indexOf('exiting');
    const dioramaIndex = result.views.indexOf('diorama', exitingIndex + 1);
    expect(exitingIndex).toBeGreaterThanOrEqual(0);
    expect(dioramaIndex).toBeGreaterThan(exitingIndex);
    expect(result.times[dioramaIndex] - result.times[exitingIndex]).toBeLessThanOrEqual(1200);
    expect(result.before).not.toBe(result.after);
    expect(result.scrollY).toBe(0);
  }, 90_000);

  test('点击「返回全景」按钮同样退出，间隔不超过 1.2 秒', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ views: string[]; times: number[] }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      await waitStory();
      await settle();
      await clickBack();
      await waitExited();
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ views: await js('window.__views'), times: await js('window.__viewTimes') }));
    `);
    const exitingIndex = result.views.indexOf('exiting');
    const dioramaIndex = result.views.indexOf('diorama', exitingIndex + 1);
    expect(exitingIndex).toBeGreaterThanOrEqual(0);
    expect(dioramaIndex).toBeGreaterThan(exitingIndex);
    expect(result.times[dioramaIndex] - result.times[exitingIndex]).toBeLessThanOrEqual(1200);
  }, 90_000);

  test('小票高于视口时滚轮滚动小票层：scrollTop 增加，window.scrollY 为 0，data-view 仍为 story', async () => {
    const result = await runBrowser<{ view: string | null; scrollable: boolean; scrollTopBefore: number; scrollTopAfter: number; scrollY: number }>(`
      ${HELPERS}
      ${boot(390, 500)}
      await enterStoryByKeyboard();
      await settle();
      await wait(0.9);
      const info = await js(\`(() => {
        const scroller = \${SCROLLER};
        const r = document.querySelector('.receipt').getBoundingClientRect();
        return { scrollable: !!scroller && scroller.scrollHeight > scroller.clientHeight, x: r.left + r.width / 2, y: innerHeight / 2 };
      })()\`);
      const scrollTopBefore = await js('(' + SCROLLER + ').scrollTop');
      await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: info.x, y: info.y, deltaX: 0, deltaY: 200 });
      await wait(0.5);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({
        view: await js('document.documentElement.dataset.view ?? null'),
        scrollable: info.scrollable,
        scrollTopBefore,
        scrollTopAfter: await js('(' + SCROLLER + ').scrollTop'),
        scrollY: await js('window.scrollY'),
      }));
    `);
    expect(result.scrollable).toBe(true);
    expect(result.scrollTopBefore).toBe(0);
    expect(result.scrollTopAfter).toBeGreaterThan(0);
    expect(result.scrollY).toBe(0);
    expect(result.view).toBe('story');
  }, 90_000);

  test('手指在小票上滑动只滚小票层，不退出', async () => {
    const result = await runBrowser<{ view: string | null; scrollTopAfter: number; scrollY: number }>(`
      ${HELPERS}
      await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 500, deviceScaleFactor: 1, mobile: true });
      await navigate(${JSON.stringify(BASE_URL)});
      await waitSceneReady();
      await enterStoryByKeyboard();
      await settle();
      await wait(0.9);
      await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 400 }] });
      await cdp('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 200 }] });
      await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await wait(0.6);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({
        view: await js('document.documentElement.dataset.view ?? null'),
        scrollTopAfter: await js('(' + SCROLLER + ').scrollTop'),
        scrollY: await js('window.scrollY'),
      }));
    `);
    expect(result.view).toBe('story');
    expect(result.scrollTopAfter).toBeGreaterThan(0);
    expect(result.scrollY).toBe(0);
  }, 90_000);

  test('语言切到 EN 后「返回全景」按钮文字为 Back to overview，中文为「返回全景」', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ zhText: string; enText: string }>(`
      ${HELPERS}
      ${boot(1440, 900, { lang: 'zh-CN' })}
      await click([${p.x}, ${p.y}]);
      await waitStory();
      const zhText = await js('(' + BACK + ')?.textContent ?? ""');
      await click('.language-toggle button');
      await settle();
      const enText = await js('(' + BACK + ')?.textContent ?? ""');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ zhText, enText }));
    `);
    expect(result.zhText).toBe('返回全景');
    expect(result.enText).toBe('Back to overview');
  }, 90_000);

  test('退出动画进行中 Esc 与滚轮不改变状态', async () => {
    const p = plaquePoint(1440, 900);
    const road = roadPoint(1440, 900);
    const result = await runBrowser<{ duringExit: string | null; stillExiting: string | null }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await pressKey('Escape', 'Escape', 27);
      await wait(0.2);
      const duringExit = await js('document.documentElement.dataset.view ?? null');
      await pressKey('Escape', 'Escape', 27);
      await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: ${road.x}, y: ${road.y}, deltaX: 0, deltaY: 200 });
      await wait(0.2);
      const stillExiting = await js('document.documentElement.dataset.view ?? null');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ duringExit, stillExiting }));
    `);
    expect(result.duringExit).toBe('exiting');
    expect(result.stillExiting).toBe('exiting');
  }, 90_000);

  test('整体视角下拖动与滚轮都会改变画面', async () => {
    const road = roadPoint(1440, 900);
    const result = await runBrowser<{ view: string | null; dragChanged: boolean; wheelChanged: boolean }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      const before1 = await screenshot();
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: ${road.x}, y: ${road.y} });
      await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: ${road.x}, y: ${road.y}, button: 'left', buttons: 1, clickCount: 1 });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: ${road.x + 150}, y: ${road.y}, buttons: 1 });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: ${road.x + 150}, y: ${road.y}, button: 'left', buttons: 0, clickCount: 1 });
      await wait(0.4);
      const after1 = await screenshot();
      const before2 = await screenshot();
      await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: ${road.x}, y: ${road.y}, deltaX: 0, deltaY: 200 });
      await wait(0.4);
      const after2 = await screenshot();
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view: await js('document.documentElement.dataset.view ?? null'), dragChanged: before1 !== after1, wheelChanged: before2 !== after2 }));
    `);
    expect(result.view).toBe('diorama');
    expect(result.dragChanged).toBe(true);
    expect(result.wheelChanged).toBe(true);
  }, 90_000);
});

describe('退出时小票淡出', () => {
  test('exiting 期间小票、语言开关、返回按钮仍渲染且处于 inert 内', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ duringExit: string | null; receiptVisible: boolean; receiptInert: boolean; langInert: boolean; backInert: boolean; backPresent: boolean }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      await waitStory();
      await settle();
      await pressKey('Escape', 'Escape', 27);
      await wait(0.15);
      const data = await js(\`(() => {
        const back = \${BACK};
        const lang = document.querySelector('.language-toggle');
        const receipt = document.querySelector('.receipt');
        return {
          duringExit: document.documentElement.dataset.view ?? null,
          receiptInert: !!receipt && !!receipt.closest('[inert]'),
          langInert: !!lang && !!lang.closest('[inert]'),
          backInert: !!back && !!back.closest('[inert]'),
          backPresent: !!back,
        };
      })()\`);
      const receiptVisible = await isVisible("document.querySelector('.receipt')");
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ...data, receiptVisible }));
    `);
    expect(result.duringExit).toBe('exiting');
    expect(result.receiptVisible).toBe(true);
    expect(result.receiptInert).toBe(true);
    expect(result.langInert).toBe(true);
    expect(result.backPresent).toBe(true);
    expect(result.backInert).toBe(true);
  }, 90_000);

  test('exiting 期间小票与返回按钮的整体透明度连续下降而非瞬间消失，到 diorama 后不可见', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ receiptSamples: number[]; backSamples: number[]; afterReceiptVisible: boolean; afterBackVisible: boolean; afterLangVisible: boolean }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      await waitStory();
      await settle();
      await wait(0.7);
      await js(\`(() => {
        const effop = \${EFFOP};
        window.__opacity = { receipt: [], back: [] };
        const startedAt = performance.now();
        (function sample() {
          const view = document.documentElement.dataset.view;
          if (view === 'exiting') {
            window.__opacity.receipt.push(effop(document.querySelector('.receipt')));
            window.__opacity.back.push(effop(\${BACK}));
          }
          if (view !== 'diorama' && performance.now() - startedAt < 4000) requestAnimationFrame(sample);
        })();
      })()\`);
      await pressKey('Escape', 'Escape', 27);
      await waitExited();
      await settle();
      const samples = await js('window.__opacity');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({
        receiptSamples: samples.receipt,
        backSamples: samples.back,
        afterReceiptVisible: await isVisible("document.querySelector('.receipt')"),
        afterBackVisible: await isVisible(BACK),
        afterLangVisible: await isVisible("document.querySelector('.language-toggle')"),
      }));
    `);
    expect(result.receiptSamples.some((value) => value > 0 && value < 1)).toBe(true);
    expect(result.backSamples.some((value) => value > 0 && value < 1)).toBe(true);
    expect(result.afterReceiptVisible).toBe(false);
    expect(result.afterBackVisible).toBe(false);
    expect(result.afterLangVisible).toBe(false);
  }, 90_000);

  test('到 diorama 后小票层 hidden 且 inert，连按 Tab 10 次焦点不落在小票内的链接上', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ hidden: boolean; inert: boolean; focusedInside: boolean }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      await waitStory();
      await settle();
      await pressKey('Escape', 'Escape', 27);
      await waitExited();
      await settle();
      const before = await js(\`(() => {
        const el = document.querySelector('.receipt');
        return { hidden: !!el && !!el.closest('[hidden]'), inert: !!el && !!el.closest('[inert]') };
      })()\`);
      let focusedInside = false;
      for (let i = 0; i < 10; i++) {
        await pressKey('Tab', 'Tab', 9);
        await settle();
        if (await js("!!document.activeElement?.closest('.receipt')")) focusedInside = true;
      }
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ...before, focusedInside }));
    `);
    expect(result.hidden).toBe(true);
    expect(result.inert).toBe(true);
    expect(result.focusedInside).toBe(false);
  }, 90_000);

  test('退出到 diorama 后再次进入：小票整体透明度复原为 1，返回按钮与语言开关可见', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ receiptOpacity: number; backVisible: boolean; langVisible: boolean; receiptInert: boolean }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      await waitStory();
      await settle();
      await pressKey('Escape', 'Escape', 27);
      await waitExited();
      await settle();
      await click([${p.x}, ${p.y}]);
      const reenterDeadline = Date.now() + 5000;
      while (Date.now() < reenterDeadline) {
        const views = await js('window.__views');
        if (views.lastIndexOf('story') > views.lastIndexOf('exiting')) break;
        await wait(0.05);
      }
      await wait(1.2);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({
        receiptOpacity: await js('(' + EFFOP + ')(document.querySelector(".receipt"))'),
        backVisible: await isVisible(BACK),
        langVisible: await isVisible("document.querySelector('.language-toggle')"),
        receiptInert: await js("!!document.querySelector('.receipt')?.closest('[inert]')"),
      }));
    `);
    expect(result.receiptOpacity).toBeGreaterThanOrEqual(0.99);
    expect(result.receiptInert).toBe(false);
    expect(result.backVisible).toBe(true);
    expect(result.langVisible).toBe(true);
  }, 90_000);
});

describe('资料视角空格键作用域', () => {
  test('焦点在未选中的语言按钮上按空格：切换语言', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ scrollY: number; htmlLang: string; view: string | null }>(`
      ${HELPERS}
      ${boot(1440, 900, { lang: 'zh-CN' })}
      await click([${p.x}, ${p.y}]);
      await waitStory();
      await settle();
      await js("document.querySelector('.language-toggle button').focus()");
      await pressKey(' ', 'Space', 32, ' ');
      await wait(0.3);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ scrollY: await js('window.scrollY'), htmlLang: await js('document.documentElement.lang'), view: await js('document.documentElement.dataset.view ?? null') }));
    `);
    expect(result.htmlLang).toBe('en');
    expect(result.view).toBe('story');
    expect(result.scrollY).toBe(0);
  }, 90_000);

  test('焦点在返回按钮上按空格：退出到 diorama', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ views: string[] }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      await waitStory();
      await settle();
      await js('(' + BACK + ').focus()');
      await pressKey(' ', 'Space', 32, ' ');
      await waitExited();
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ views: await js('window.__views') }));
    `);
    const exitingIndex = result.views.indexOf('exiting');
    expect(exitingIndex).toBeGreaterThanOrEqual(0);
    expect(result.views.indexOf('diorama', exitingIndex + 1)).toBeGreaterThan(exitingIndex);
  }, 90_000);
});

describe('小票', () => {
  test('小票包含姓名、职位、所在地、标题、简介、四个方向与四个链接（中文）', async () => {
    const p = plaquePoint(1440, 900);
    const real = await runBrowser<{ view: string | null; text: string; links: string[]; userSelect: string }>(`
      ${HELPERS}
      ${boot(1440, 900, { lang: 'zh-CN' })}
      await click([${p.x}, ${p.y}]);
      await waitStory();
      await settle();
      const data = await js(\`(() => {
        const receipt = document.querySelector('.receipt');
        return {
          text: receipt ? receipt.textContent : '',
          links: Array.from(document.querySelectorAll('.receipt a')).map(a => a.getAttribute('href')),
          userSelect: receipt ? getComputedStyle(receipt).userSelect : '',
        };
      })()\`);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view: await js('document.documentElement.dataset.view ?? null'), ...data }));
    `);
    expect(real.view).toBe('story');
    expect(real.text).toContain('FUBUKI_BB');
    expect(real.text).toContain('Tokyo');
    expect(real.text).toContain('Shanghai');
    expect(real.text).toContain('雨夜里还亮着的店');
    expect(real.text).toContain('AI 工作流');
    expect(real.text).toContain('可扩展后端');
    expect(real.text).toContain('游戏 SDK 生态');
    expect(real.text).toContain('支付平台');
    expect(real.links).toContain('https://github.com/0xBB2b');
    expect(real.links).toContain('https://www.linkedin.com/in/0xbb2b');
    expect(real.links).toContain('https://juejin.cn/user/1037558235795032');
    expect(real.links).toContain('mailto:bb@yorha.xyz');
    expect(real.userSelect).not.toBe('none');
  }, 90_000);

  test('头像加载失败时显示占位字符 F', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ view: string | null; fallbackText: string | null }>(`
      ${HELPERS}
      await cdp('Fetch.enable', { patterns: [{ urlPattern: '*profile.jpg' }] });
      let __stop = false;
      (async () => {
        while (!__stop) {
          for (const event of drainEvents()) {
            if (event.method === 'Fetch.requestPaused') {
              await cdp('Fetch.fulfillRequest', { requestId: event.params.requestId, responseCode: 404 });
            }
          }
          await wait(0.05);
        }
      })();
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      const fallbackDeadline = Date.now() + 5000;
      let fallbackText = null;
      while (Date.now() < fallbackDeadline) {
        fallbackText = await js("(() => { const el = document.querySelector('.receipt-avatar--fallback'); return el ? el.textContent : null; })()");
        if (fallbackText) break;
        await wait(0.1);
      }
      __stop = true;
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view: await js('document.documentElement.dataset.view ?? null'), fallbackText }));
    `);
    expect(result.view).toBe('story');
    expect(result.fallbackText).toBe('F');
  }, 90_000);

  test.each([
    [375, 667, 'zh-CN', '3D 场景无法加载'],
    [375, 667, 'en-US', "The 3D scene couldn't load"],
    [390, 844, 'zh-CN', '3D 场景无法加载'],
    [390, 844, 'en-US', "The 3D scene couldn't load"],
  ] as const)('%d×%d %s 三维失败时，失败提示文字完全在视口内，在小票上方，且不与语言开关相交', async (width, height, lang, message) => {
    const result = await runBrowser<{ view: string | null; found: boolean; inViewport: boolean; aboveReceipt: boolean; overlapsToggle: boolean }>(`
      ${HELPERS}
      ${boot(width, height, {
        lang,
        extraScript: `
          const original = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (type, ...args) {
            if (typeof type === 'string' && type.startsWith('webgl')) return null;
            return original.call(this, type, ...args);
          };
        `,
        waitForExpr: "document.documentElement.dataset.view === 'story'",
      })}
      await wait(1);
      const data = await js(\`(() => {
        const message = ${JSON.stringify(message)};
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let textNode = null;
        while (walker.nextNode()) {
          if (walker.currentNode.textContent.includes(message)) { textNode = walker.currentNode; break; }
        }
        const receipt = document.querySelector('.receipt');
        const toggle = document.querySelector('.language-toggle');
        if (!textNode || !receipt || !toggle) return { found: false, inViewport: false, aboveReceipt: false, overlapsToggle: true };
        const range = document.createRange();
        range.selectNodeContents(textNode);
        const t = range.getBoundingClientRect();
        const g = toggle.getBoundingClientRect();
        return {
          found: true,
          inViewport: t.width > 0 && t.height > 0 && t.top >= 0 && t.left >= 0 && t.bottom <= innerHeight && t.right <= innerWidth,
          aboveReceipt: t.bottom <= receipt.getBoundingClientRect().top + 1,
          overlapsToggle: t.left < g.right && g.left < t.right && t.top < g.bottom && g.top < t.bottom,
        };
      })()\`);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view: await js('document.documentElement.dataset.view ?? null'), ...data }));
    `);
    expect(result.view).toBe('story');
    expect(result.found).toBe(true);
    expect(result.inViewport).toBe(true);
    expect(result.aboveReceipt).toBe(true);
    expect(result.overlapsToggle).toBe(false);
  }, 90_000);

  test('1440×900 下小票右边距为视口宽度的 7% ±1%', async () => {
    const result = await runBrowser<{ ratio: number }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await enterStoryByKeyboard();
      await settle();
      await wait(0.9);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ratio: await js("(innerWidth - document.querySelector('.receipt').getBoundingClientRect().right) / innerWidth") }));
    `);
    expect(result.ratio).toBeGreaterThanOrEqual(0.06);
    expect(result.ratio).toBeLessThanOrEqual(0.08);
  }, 90_000);

  test('390×844 下小票水平居中，左右留白差不超过 2 像素', async () => {
    const result = await runBrowser<{ left: number; right: number }>(`
      ${HELPERS}
      ${boot(390, 844)}
      await enterStoryByKeyboard();
      await settle();
      await wait(0.9);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify(await js(\`(() => {
        const r = document.querySelector('.receipt').getBoundingClientRect();
        return { left: r.left, right: innerWidth - r.right };
      })()\`)));
    `);
    expect(result.left).toBeGreaterThan(0);
    expect(Math.abs(result.left - result.right)).toBeLessThanOrEqual(2);
  }, 90_000);

  test('800×800（宽高比 1:1）下小票靠右，右边距为视口宽度的 7% ±1%', async () => {
    const result = await runBrowser<{ ratio: number }>(`
      ${HELPERS}
      ${boot(800, 800)}
      await enterStoryByKeyboard();
      await settle();
      await wait(0.9);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ratio: await js("(innerWidth - document.querySelector('.receipt').getBoundingClientRect().right) / innerWidth") }));
    `);
    expect(result.ratio).toBeGreaterThanOrEqual(0.06);
    expect(result.ratio).toBeLessThanOrEqual(0.08);
  }, 90_000);

  test('390×844 下返回按钮底边与小票顶部（扣除 10px 锯齿）至少留 6px 间距', async () => {
    const result = await runBrowser<{ backBottom: number; receiptTop: number }>(`
      ${HELPERS}
      ${boot(390, 844)}
      await enterStoryByKeyboard();
      await settle();
      await wait(0.9);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify(await js(\`(() => ({
        backBottom: (\${BACK}).getBoundingClientRect().bottom,
        receiptTop: document.querySelector('.receipt').getBoundingClientRect().top,
      }))()\`)));
    `);
    expect(result.receiptTop - 10 - result.backBottom).toBeGreaterThanOrEqual(6);
  }, 90_000);

  test('小票正文字体以 JetBrains Mono Variable 开头，出现动画时长在 0.5～0.7 秒', async () => {
    const result = await runBrowser<{ fontFamily: string; animationDuration: string }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await enterStoryByKeyboard();
      await settle();
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify(await js(\`(() => {
        const style = getComputedStyle(document.querySelector('.receipt'));
        return { fontFamily: style.fontFamily, animationDuration: style.animationDuration };
      })()\`)));
    `);
    expect(result.fontFamily.startsWith('"JetBrains Mono Variable"')).toBe(true);
    const seconds = parseFloat(result.animationDuration);
    expect(seconds).toBeGreaterThanOrEqual(0.5);
    expect(seconds).toBeLessThanOrEqual(0.7);
  }, 90_000);
});

describe('全身照相片与 Esc', () => {
  test.each([
    [1440, 900],
    [390, 844],
  ] as const)('%d×%d 下点头像打开相片，遮罩尺寸等于视口', async (width, height) => {
    const result = await runBrowser<{ opened: boolean; width: number; height: number; innerWidth: number; innerHeight: number }>(`
      ${HELPERS}
      ${boot(width, height)}
      await enterStoryByKeyboard();
      await settle();
      await wait(0.9);
      await click('.receipt-avatar-btn');
      await wait(0.4);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify(await js(\`(() => {
        const mask = document.querySelector('.photo-print-backdrop') || document.querySelector('.photo-print-overlay');
        const r = mask ? mask.getBoundingClientRect() : { width: 0, height: 0 };
        return { opened: !!mask, width: r.width, height: r.height, innerWidth, innerHeight };
      })()\`)));
    `);
    expect(result.opened).toBe(true);
    expect(Math.abs(result.width - result.innerWidth)).toBeLessThanOrEqual(1);
    expect(Math.abs(result.height - result.innerHeight)).toBeLessThanOrEqual(1);
  }, 90_000);

  test('相片打开时 Tab 与 Shift+Tab 各 6 次，焦点始终留在相片内', async () => {
    const result = await runBrowser<{ initialInside: boolean; forward: boolean[]; backward: boolean[] }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await enterStoryByKeyboard();
      await settle();
      await wait(0.9);
      await click('.receipt-avatar-btn');
      await wait(0.4);
      const initialInside = await js("!!document.activeElement?.closest('.photo-print-overlay')");

      const tabInside = async (modifiers) => {
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers });
        await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers });
        await js('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
        return js("!!document.activeElement?.closest('.photo-print-overlay')");
      };
      const forward = [];
      const backward = [];
      for (let i = 0; i < 6; i++) forward.push(await tabInside(0));
      for (let i = 0; i < 6; i++) backward.push(await tabInside(8));
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ initialInside, forward, backward }));
    `);
    expect(result.initialInside).toBe(true);
    expect(result.forward).toEqual(Array(6).fill(true));
    expect(result.backward).toEqual(Array(6).fill(true));
  }, 90_000);

  test('相片打开时按 Esc 只关相片，data-view 仍为 story；再按 Esc 才退出', async () => {
    const result = await runBrowser<{ photoOpen: boolean; viewAfterFirstEsc: string | null; photoOpenAfterFirstEsc: boolean; views: string[] }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await enterStoryByKeyboard();
      await settle();
      await wait(0.9);
      await click('.receipt-avatar-btn');
      await wait(0.4);
      const photoOpen = await js("!!document.querySelector('.photo-print-overlay')");
      await pressKey('Escape', 'Escape', 27);
      await wait(0.4);
      const viewAfterFirstEsc = await js('document.documentElement.dataset.view ?? null');
      const photoOpenAfterFirstEsc = await js("!!document.querySelector('.photo-print-overlay')");
      await pressKey('Escape', 'Escape', 27);
      await waitExited();
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ photoOpen, viewAfterFirstEsc, photoOpenAfterFirstEsc, views: await js('window.__views') }));
    `);
    expect(result.photoOpen).toBe(true);
    expect(result.viewAfterFirstEsc).toBe('story');
    expect(result.photoOpenAfterFirstEsc).toBe(false);
    const exitingIndex = result.views.indexOf('exiting');
    expect(exitingIndex).toBeGreaterThanOrEqual(0);
    expect(result.views.indexOf('diorama', exitingIndex + 1)).toBeGreaterThan(exitingIndex);
  }, 90_000);
});

describe('加载页', () => {
  test('状态文字依次为「正在加载代码…」与「正在布置雨夜街角…」，#scene 加载期间 aria-busy=true', async () => {
    const result = await runBrowser<{ statuses: string[]; sceneBusySeen: boolean }>(`
      ${HELPERS}
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      const ua = await js('navigator.userAgent');
      await cdp('Emulation.setUserAgentOverride', { userAgent: ua, acceptLanguage: 'zh-CN' });
      await cdp('Page.addScriptToEvaluateOnNewDocument', { source: \`
        window.__statuses = [];
        window.__sceneBusySeen = false;
        const record = () => {
          const el = document.querySelector('[role="status"]');
          const text = el ? el.textContent : null;
          if (text && window.__statuses[window.__statuses.length - 1] !== text) window.__statuses.push(text);
          if (document.querySelector('#scene')?.getAttribute('aria-busy') === 'true') window.__sceneBusySeen = true;
        };
        new MutationObserver(record).observe(document, { subtree: true, childList: true, characterData: true, attributes: true });
      \` });
      await navigate(${JSON.stringify(BASE_URL)});
      const deadline = Date.now() + 8000;
      while (Date.now() < deadline) {
        if (!(await js("!!document.querySelector('.loading-shell')"))) break;
        await wait(0.05);
      }
      const statuses = await js('window.__statuses');
      const sceneBusySeen = await js('window.__sceneBusySeen');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ statuses, sceneBusySeen }));
    `);
    expect(result.statuses).toContain('正在加载代码…');
    expect(result.statuses).toContain('正在布置雨夜街角…');
    expect(result.statuses.indexOf('正在布置雨夜街角…')).toBeGreaterThan(result.statuses.indexOf('正在加载代码…'));
    expect(result.sceneBusySeen).toBe(true);
  }, 90_000);

  test('首帧就绪后 450 毫秒内加载页淡出并移除，data-view 变为 diorama', async () => {
    const result = await runBrowser<{ removedWithinBudget: boolean; view: string | null }>(`
      ${HELPERS}
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await navigate(${JSON.stringify(BASE_URL)});
      const readyDeadline = Date.now() + 20000;
      while (Date.now() < readyDeadline) {
        if (await js("document.querySelector('#scene')?.getAttribute('aria-busy') === 'false'")) break;
        await wait(0.05);
      }
      const readyAt = Date.now();
      let removedWithinBudget = false;
      while (Date.now() - readyAt < 1000) {
        if (!(await js("!!document.querySelector('.loading-shell')"))) { removedWithinBudget = Date.now() - readyAt <= 650; break; }
        await wait(0.02);
      }
      const view = await js('document.documentElement.dataset.view ?? null');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ removedWithinBudget, view }));
    `);
    expect(result.removedWithinBudget).toBe(true);
    expect(result.view).toBe('diorama');
  }, 90_000);

  test('挂起所有网页字体请求时，场景仍在进入「正在布置雨夜街角…」阶段起 2 秒内就绪', async () => {
    const result = await runBrowser<{ stageAt: number | null; readyAt: number | null; elapsed: number | null }>(`
      ${HELPERS}
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      const ua = await js('navigator.userAgent');
      await cdp('Emulation.setUserAgentOverride', { userAgent: ua, acceptLanguage: 'zh-CN' });
      await cdp('Fetch.enable', { patterns: [{ urlPattern: '*.woff2*' }, { urlPattern: '*.woff*' }] });
      await cdp('Page.addScriptToEvaluateOnNewDocument', { source: \`
        window.__sceneStageAt = null;
        window.__sceneReadyAt = null;
        const record = () => {
          const statusEl = document.querySelector('[role="status"]');
          const text = statusEl ? statusEl.textContent : null;
          if (window.__sceneStageAt === null && text === '正在布置雨夜街角…') window.__sceneStageAt = performance.now();
          const busy = document.querySelector('#scene')?.getAttribute('aria-busy');
          if (window.__sceneStageAt !== null && window.__sceneReadyAt === null && busy === 'false') window.__sceneReadyAt = performance.now();
        };
        new MutationObserver(record).observe(document, { subtree: true, childList: true, characterData: true, attributes: true });
        record();
      \` });
      await cdp('Page.navigate', { url: ${JSON.stringify(BASE_URL)} });
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        const found = await js('window.__sceneReadyAt !== null').catch(() => false);
        if (found) break;
        await wait(0.05);
      }
      const stageAt = await js('window.__sceneStageAt');
      const readyAt = await js('window.__sceneReadyAt');
      const elapsed = stageAt !== null && readyAt !== null ? readyAt - stageAt : null;
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ stageAt, readyAt, elapsed }));
    `);
    expect(result.stageAt).not.toBeNull();
    expect(result.elapsed).not.toBeNull();
    expect(result.elapsed!).toBeLessThanOrEqual(2000);
  }, 90_000);
});

describe('先看资料链接', () => {
  test('三维代码请求一直挂起时点「先看资料」，浏览器跳到 /profile/', async () => {
    const result = await runBrowser<{ pathname: string }>(`
      ${HELPERS}
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await holdScene();
      await navigate(${JSON.stringify(BASE_URL)});
      try { await click('a.loading-shell-button'); } catch (error) { if (!/context|destroyed|Cannot find/i.test(String(error))) throw error; }
      let pathname = '';
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        try { pathname = await js('location.pathname'); } catch (error) { pathname = ''; }
        if (pathname === '/profile/') break;
        await wait(0.1);
      }
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ pathname }));
    `);
    expect(result.pathname).toBe('/profile/');
  }, 90_000);

  test('禁用 JavaScript 时名字、状态文字与「先看资料」链接都可见，链接指向 ./profile/', async () => {
    const result = await runBrowser<{ nameVisible: boolean; statusVisible: boolean; linkVisible: boolean; href: string | null; textDecoration: string }>(`
      ${HELPERS}
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await cdp('Emulation.setScriptExecutionDisabled', { value: true });
      await navigate(${JSON.stringify(BASE_URL)});
      const data = await js(\`(() => {
        const visible = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
        const link = document.querySelector('a.loading-shell-button');
        return {
          nameVisible: visible(document.querySelector('.loading-shell-name')),
          statusVisible: visible(document.querySelector('.loading-shell-status')),
          linkVisible: visible(link),
          href: link ? link.getAttribute('href') : null,
          textDecoration: link ? getComputedStyle(link).textDecorationLine : '',
        };
      })()\`);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify(data));
    `);
    expect(result.nameVisible).toBe(true);
    expect(result.statusVisible).toBe(true);
    expect(result.linkVisible).toBe(true);
    expect(result.href).toBe('./profile/');
    expect(result.textDecoration).toBe('none');
  }, 90_000);
});

describe('语言', () => {
  test('浏览器语言以 zh 开头时 html lang 为 zh-CN', async () => {
    const result = await runBrowser<{ htmlLang: string }>(`
      ${HELPERS}
      ${boot(1440, 900, { lang: 'zh-CN' })}
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ htmlLang: await js('document.documentElement.lang') }));
    `);
    expect(result.htmlLang).toBe('zh-CN');
  }, 90_000);

  test('资料视角点击 EN 后 html lang 变为 en，小票与相片文字切换为英文', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ htmlLang: string; text: string; photoLabel: string | null }>(`
      ${HELPERS}
      ${boot(1440, 900, { lang: 'zh-CN' })}
      await click([${p.x}, ${p.y}]);
      await waitStory();
      await click('.language-toggle button');
      await settle();
      await wait(0.9);
      await click('.receipt-avatar-btn');
      await wait(0.3);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({
        htmlLang: await js('document.documentElement.lang'),
        text: await js("document.querySelector('.receipt').textContent"),
        photoLabel: await js("document.querySelector('.photo-print-overlay')?.getAttribute('aria-label') ?? null"),
      }));
    `);
    expect(result.htmlLang).toBe('en');
    expect(result.text).toContain('Still open on a rainy night');
    expect(result.photoLabel).toBe(COPY.en.fullAlt);
  }, 90_000);


  test('刷新后回到浏览器判定语言，无 localStorage 与 cookie 持久化', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ langAfterToggle: string; langAfterReload: string; storageLength: number; cookie: string }>(`
      ${HELPERS}
      ${boot(1440, 900, { lang: 'zh-CN' })}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await click('.language-toggle button');
      await settle();
      const langAfterToggle = await js('document.documentElement.lang');
      await navigate(${JSON.stringify(BASE_URL)});
      while (!(await js("!!document.querySelector('.enter-story-button')"))) await wait(0.05);
      const langAfterReload = await js('document.documentElement.lang');
      const storageLength = await js('window.localStorage.length');
      const cookie = await js('document.cookie');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ langAfterToggle, langAfterReload, storageLength, cookie }));
    `);
    expect(result.langAfterToggle).toBe('en');
    expect(result.langAfterReload).toBe('zh-CN');
    expect(result.storageLength).toBe(0);
    expect(result.cookie).toBe('');
  }, 90_000);
});

describe('铭牌', () => {
  test('默认视角 1440×900 下第三行（Tokyo · Shanghai）投影字高不小于 10 像素', () => {
    const width = 1440;
    const height = 900;
    const rowWorldHeight = PLAQUE_PANEL.height * (116 / 390);
    const [cx, cy, cz] = PLAQUE_PANEL.center;
    const camera = new THREE.PerspectiveCamera(DEFAULT_CAMERA.fov, width / height, 0.5, 400);
    camera.position.set(...DEFAULT_CAMERA.position);
    camera.lookAt(new THREE.Vector3(...DEFAULT_CAMERA.target));
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    const top = new THREE.Vector3(cx, cy + rowWorldHeight / 2, cz).project(camera);
    const bottom = new THREE.Vector3(cx, cy - rowWorldHeight / 2, cz).project(camera);
    const topPixelY = ((1 - top.y) / 2) * height;
    const bottomPixelY = ((1 - bottom.y) / 2) * height;
    expect(Math.abs(bottomPixelY - topPixelY)).toBeGreaterThanOrEqual(10);
  });
});
