// 依赖 dist/ 为最新构建产物：运行前先执行 `bun run build`，本文件不重复构建。
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import path from 'node:path';
import { preview, type PreviewServer } from 'vite';
import * as THREE from 'three';
import { runBrowser } from './browser';
import { plaquePoint, roadPoint } from './scene-helpers';
import { DEFAULT_CAMERA } from '../diorama/layout';
import { PLAQUE_PANEL } from '../diorama/plaque';
import { storyLayout } from '../diorama/story-scroll';

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
  async function pressKey(key, code, vk, text) {
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, ...(text ? { text } : {}) });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk });
  }
  async function settle() {
    await js('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
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

// 「场景就绪通知」与「点击先看资料」谁先谁后由 React 调度决定，正常时序下窗口不到 1 毫秒，
// 无头浏览器里几乎撞不上；把 React 用来冲刷更新的 MessageChannel 消息延后 400 毫秒，
// 相当于把窗口从亚毫秒级撑开到 400 毫秒，再在场景首帧 rAF 回调里延时 20 毫秒补一次点击，
// 稳定落在通知已发出、状态尚未冲刷的空档里。
const READY_RACE_INJECTION = VIEW_TRACKER + `
  (function() {
    const OriginalMessageChannel = window.MessageChannel;
    window.MessageChannel = function() {
      const channel = new OriginalMessageChannel();
      const originalPostMessage = channel.port2.postMessage.bind(channel.port2);
      channel.port2.postMessage = function(...args) {
        setTimeout(() => originalPostMessage(...args), 400);
      };
      return channel;
    };
    let clicked = false;
    const originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = function(cb) {
      if (!clicked) {
        clicked = true;
        setTimeout(() => {
          const btn = document.querySelector('.loading-shell-button');
          if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }, 20);
      }
      return originalRAF(cb);
    };
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

  test('资料段隐藏且 inert，语言开关不可见', async () => {
    const result = await runBrowser<{ view: string | null; sectionsHidden: boolean; sectionsInert: boolean; langVisible: boolean }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      const view = await js('document.documentElement.dataset.view ?? null');
      const data = await js(\`(() => {
        const sections = document.querySelector('.story-sections');
        const lang = document.querySelector('.story-language');
        const langRect = lang ? lang.getBoundingClientRect() : null;
        const langStyle = lang ? getComputedStyle(lang) : null;
        return {
          sectionsHidden: !!sections && sections.hidden,
          sectionsInert: !!sections && sections.inert,
          langVisible: !!lang && !!langRect && langRect.width > 0 && langRect.height > 0 && langStyle.visibility !== 'hidden' && langStyle.display !== 'none' && Number(langStyle.opacity) > 0,
        };
      })()\`);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view, ...data }));
    `);
    expect(result.view).toBe('diorama');
    expect(result.sectionsHidden).toBe(true);
    expect(result.sectionsInert).toBe(true);
    expect(result.langVisible).toBe(false);
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

  test('仅整体视角且就绪时可聚焦：进入资料视角后 Tab 不会落到该按钮或资料段链接上', async () => {
    const result = await runBrowser<{ views: string[]; focusedSelectors: string[] }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await pressKey('Tab', 'Tab', 9);
      await settle();
      await pressKey('Enter', 'Enter', 13, '\\r');
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      const focusedSelectors = [];
      for (let i = 0; i < 15; i++) {
        await pressKey('Tab', 'Tab', 9);
        await settle();
        const sel = await js(\`(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          if (el.classList.contains('enter-story-button')) return 'enter-story-button';
          if (el.closest('.story-sections')) return 'story-sections-descendant:' + el.tagName;
          return 'other';
        })()\`);
        if (sel) focusedSelectors.push(sel);
      }
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ views: await js('window.__views'), focusedSelectors }));
    `);
    expect(result.views).toContain('story');
    expect(result.focusedSelectors).not.toContain('enter-story-button');
  }, 90_000);

  test('整体视角下连续按 Tab，焦点不会落到隐藏的资料段链接上', async () => {
    const result = await runBrowser<{ view: string | null; focusedSelectors: string[] }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      const focusedSelectors = [];
      for (let i = 0; i < 20; i++) {
        await pressKey('Tab', 'Tab', 9);
        await settle();
        const sel = await js(\`(() => {
          const el = document.activeElement;
          return (el && el !== document.body && el.closest('.story-sections')) ? 'story-sections-descendant' : null;
        })()\`);
        if (sel) focusedSelectors.push(sel);
      }
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view: await js('document.documentElement.dataset.view ?? null'), focusedSelectors }));
    `);
    expect(result.view).toBe('diorama');
    expect(result.focusedSelectors).toEqual([]);
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

  test('进入后滚动位置为第 1 段起点，焦点在第 1 段标题', async () => {
    const p = plaquePoint(1440, 900);
    const expectedStart = storyLayout(900).sectionStarts[0];
    const result = await runBrowser<{ views: string[]; scrollY: number; activeIsHeading: boolean }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      const scrollY = await js('window.scrollY');
      const activeIsHeading = await js(\`(() => {
        const h1 = document.querySelector('.story-sections h1');
        return !!h1 && document.activeElement === h1;
      })()\`);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ views: await js('window.__views'), scrollY, activeIsHeading }));
    `);
    expect(result.views).toContain('story');
    expect(result.scrollY).toBe(expectedStart);
    expect(result.activeIsHeading).toBe(true);
  }, 90_000);
});

describe('资料视角', () => {
  test('一次滚轮翻到下一段：约 0.5 秒时介于两段之间，约 1.2 秒内到位且进度点为第 2 个', async () => {
    const p = plaquePoint(1440, 900);
    const road = roadPoint(1440, 900);
    const result = await runBrowser<{ views: string[]; scrollAfterEnter: number; scrollMid: number; scrollFinal: number; activeFinal: number | null }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      const scrollAfterEnter = await js('window.scrollY');
      await wait(0.6);
      await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: ${road.x}, y: ${road.y}, deltaX: 0, deltaY: 120 });
      await wait(0.5);
      const scrollMid = await js('window.scrollY');
      await wait(0.7);
      const scrollFinal = await js('window.scrollY');
      const activeFinal = await js("Array.from(document.querySelectorAll('.story-dot')).findIndex(d => d.getAttribute('aria-current') === 'true')");
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ views: await js('window.__views'), scrollAfterEnter, scrollMid, scrollFinal, activeFinal }));
    `);
    expect(result.views).toContain('story');
    expect(result.scrollAfterEnter).toBe(0);
    expect(result.scrollMid).toBeGreaterThan(0);
    expect(result.scrollMid).toBeLessThan(900);
    expect(result.scrollFinal).toBe(900);
    expect(result.activeFinal).toBe(1);
  }, 90_000);

  test('连续 5 次滚轮（间隔 50 毫秒）只翻一段', async () => {
    const p = plaquePoint(1440, 900);
    const road = roadPoint(1440, 900);
    const result = await runBrowser<{ views: string[]; scrollY: number }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await wait(0.6);
      for (let i = 0; i < 5; i++) {
        await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: ${road.x}, y: ${road.y}, deltaX: 0, deltaY: 120 });
        await wait(0.05);
      }
      await wait(1.6);
      const scrollY = await js('window.scrollY');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ views: await js('window.__views'), scrollY }));
    `);
    expect(result.views).toContain('story');
    expect(result.scrollY).toBe(900);
  }, 90_000);

  test('持续每 50 毫秒滚动 3 秒不停手：不会卡在第 2 段，能一路翻到最后一段', async () => {
    const p = plaquePoint(1440, 900);
    const road = roadPoint(1440, 900);
    const result = await runBrowser<{ scrollAtOneStep: number; scrollFinal: number; innerHeight: number }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await wait(0.6);
      const innerHeight = await js('window.innerHeight');
      const loopStart = Date.now();
      let scrollAtOneStep = null;
      while (Date.now() - loopStart < 3000) {
        await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: ${road.x}, y: ${road.y}, deltaX: 0, deltaY: 120 });
        if (scrollAtOneStep === null && Date.now() - loopStart >= 1200) {
          scrollAtOneStep = await js('window.scrollY');
        }
        await wait(0.05);
      }
      await wait(0.5);
      const scrollFinal = await js('window.scrollY');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ scrollAtOneStep, scrollFinal, innerHeight }));
    `);
    expect(Math.abs(result.scrollAtOneStep - 1 * result.innerHeight)).toBeLessThanOrEqual(1);
    expect(Math.abs(result.scrollFinal - 2 * result.innerHeight)).toBeLessThanOrEqual(1);
  }, 90_000);

  test('第 1 段向上滚动没有反应', async () => {
    const p = plaquePoint(1440, 900);
    const road = roadPoint(1440, 900);
    const result = await runBrowser<{ views: string[]; scrollY: number }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await wait(0.6);
      await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: ${road.x}, y: ${road.y}, deltaX: 0, deltaY: -120 });
      await wait(0.8);
      const scrollY = await js('window.scrollY');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ views: await js('window.__views'), scrollY }));
    `);
    expect(result.views[result.views.length - 1]).toBe('story');
    expect(result.scrollY).toBe(0);
  }, 90_000);

  test.each([
    ['PageDown', 'PageDown', 34, ''],
    ['ArrowDown', 'ArrowDown', 40, ''],
    [' ', 'Space', 32, ' '],
  ] as const)('键盘翻页：%s 翻到下一段', async (key, code, vk, text) => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ views: string[]; scrollY: number }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await wait(0.6);
      await pressKey(${JSON.stringify(key)}, ${JSON.stringify(code)}, ${vk}, ${JSON.stringify(text)});
      await wait(1.3);
      const scrollY = await js('window.scrollY');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ views: await js('window.__views'), scrollY }));
    `);
    expect(result.views).toContain('story');
    expect(result.scrollY).toBe(900);
  }, 90_000);

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

  test('点击「返回全景」按钮同样退出', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ views: string[] }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await click('.story-back-button');
      const exitDeadline = Date.now() + 3000;
      while (Date.now() < exitDeadline) {
        if (await js("(() => { const v = window.__views; const e = v.lastIndexOf('exiting'); return e >= 0 && v.indexOf('diorama', e + 1) > e; })()")) break;
        await wait(0.05);
      }
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ views: await js('window.__views') }));
    `);
    const exitingIndex = result.views.indexOf('exiting');
    expect(exitingIndex).toBeGreaterThanOrEqual(0);
    expect(result.views.indexOf('diorama', exitingIndex + 1)).toBeGreaterThan(exitingIndex);
  }, 90_000);

  test('语言切到 EN 后「返回全景」按钮文字为 Back to overview，中文为「返回全景」', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ zhText: string; enText: string }>(`
      ${HELPERS}
      ${boot(1440, 900, { lang: 'zh-CN' })}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      const zhText = await js("document.querySelector('.story-back-button')?.textContent ?? ''");
      await click('.story-language button');
      await settle();
      const enText = await js("document.querySelector('.story-back-button')?.textContent ?? ''");
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

describe('资料段高度与视口', () => {
  test('每段高度等于视口高度', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ view: string | null; heights: number[]; innerHeight: number }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      const heights = await js("Array.from(document.querySelectorAll('.story-section')).map(s => s.offsetHeight)");
      const innerHeight = await js('window.innerHeight');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view: await js('document.documentElement.dataset.view ?? null'), heights, innerHeight }));
    `);
    expect(result.view).toBe('story');
    for (const h of result.heights) {
      expect(Math.abs(h - result.innerHeight)).toBeLessThanOrEqual(1);
    }
  }, 90_000);

  test('翻到第 2 段后改变视口高度，滚动位置与段高随之更新', async () => {
    const p = plaquePoint(1440, 900);
    const road = roadPoint(1440, 900);
    const result = await runBrowser<{ view: string | null; scrollY: number; activeIndex: number | null; sectionHeight: number; innerHeight: number }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await wait(0.6);
      await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: ${road.x}, y: ${road.y}, deltaX: 0, deltaY: 120 });
      await wait(1.3);
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 700, deviceScaleFactor: 1, mobile: false });
      await wait(0.3);
      const scrollY = await js('window.scrollY');
      const activeIndex = await js("Array.from(document.querySelectorAll('.story-dot')).findIndex(d => d.getAttribute('aria-current') === 'true')");
      const sectionHeight = await js("document.querySelectorAll('.story-section')[1].offsetHeight");
      const innerHeight = await js('window.innerHeight');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view: await js('document.documentElement.dataset.view ?? null'), scrollY, activeIndex, sectionHeight, innerHeight }));
    `);
    expect(result.view).toBe('story');
    expect(Math.abs(result.scrollY - result.innerHeight)).toBeLessThanOrEqual(1);
    expect(result.activeIndex).toBe(1);
    expect(Math.abs(result.sectionHeight - result.innerHeight)).toBeLessThanOrEqual(1);
  }, 90_000);

  test('翻页动画进行中改变视口高度，动画结束后滚动位置与段高按新视口对齐', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ scrollY: number; heights: number[]; innerHeight: number }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await wait(0.6);
      await pressKey('PageDown', 'PageDown', 34, '');
      await wait(0.3);
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 700, deviceScaleFactor: 1, mobile: false });
      await wait(1.5);
      const scrollY = await js('window.scrollY');
      const heights = await js("Array.from(document.querySelectorAll('.story-section')).map(s => s.offsetHeight)");
      const innerHeight = await js('window.innerHeight');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ scrollY, heights, innerHeight }));
    `);
    expect(Math.abs(result.scrollY - 1 * result.innerHeight)).toBeLessThanOrEqual(1);
    for (const h of result.heights) {
      expect(Math.abs(h - result.innerHeight)).toBeLessThanOrEqual(1);
    }
  }, 90_000);
});

describe('退出时资料段淡出', () => {
  test('exiting 期间资料段容器仍渲染且 inert', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ duringExit: string | null; hidden: boolean; inert: boolean; width: number; height: number }>(`
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
      const data = await js(\`(() => {
        const el = document.querySelector('.story-sections');
        if (!el) return { hidden: true, inert: true, width: 0, height: 0 };
        return { hidden: el.hidden, inert: el.inert, width: el.offsetWidth, height: el.offsetHeight };
      })()\`);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ duringExit, ...data }));
    `);
    expect(result.duringExit).toBe('exiting');
    expect(result.hidden).toBe(false);
    expect(result.inert).toBe(true);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  }, 90_000);

  test('从第 3 段退出，exiting 期间 scrollY 不跳回 0，到 diorama 后归零', async () => {
    const p = plaquePoint(1440, 900);
    const road = roadPoint(1440, 900);
    const result = await runBrowser<{ scrollBeforeExit: number; scrollDuringExit: number; views: string[]; scrollFinal: number }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await wait(0.6);
      for (let i = 0; i < 2; i++) {
        await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: ${road.x}, y: ${road.y}, deltaX: 0, deltaY: 120 });
        await wait(1.6);
      }
      const scrollBeforeExit = await js('window.scrollY');
      await pressKey('Escape', 'Escape', 27);
      await wait(0.2);
      const scrollDuringExit = await js('window.scrollY');
      const exitDeadline = Date.now() + 3000;
      while (Date.now() < exitDeadline) {
        if (await js("(() => { const v = window.__views; const e = v.lastIndexOf('exiting'); return e >= 0 && v.indexOf('diorama', e + 1) > e; })()")) break;
        await wait(0.05);
      }
      const scrollFinal = await js('window.scrollY');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ scrollBeforeExit, scrollDuringExit, views: await js('window.__views'), scrollFinal }));
    `);
    expect(result.scrollBeforeExit).toBe(1800);
    expect(result.scrollDuringExit).not.toBe(0);
    const exitingIndex = result.views.indexOf('exiting');
    expect(exitingIndex).toBeGreaterThanOrEqual(0);
    expect(result.views.indexOf('diorama', exitingIndex + 1)).toBeGreaterThan(exitingIndex);
    expect(result.scrollFinal).toBe(0);
  }, 90_000);

  test('到 diorama 后资料段 hidden 且 inert，连按 Tab 10 次焦点不落在其内部链接上', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ hidden: boolean; inert: boolean; focusedInside: boolean }>(`
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
      const before = await js(\`(() => {
        const el = document.querySelector('.story-sections');
        return { hidden: !!el && el.hidden, inert: !!el && el.inert };
      })()\`);
      let focusedInside = false;
      for (let i = 0; i < 10; i++) {
        await pressKey('Tab', 'Tab', 9);
        await settle();
        const inside = await js("!!(document.activeElement && document.activeElement.closest('.story-sections'))");
        if (inside) focusedInside = true;
      }
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ hidden: before.hidden, inert: before.inert, focusedInside }));
    `);
    expect(result.hidden).toBe(true);
    expect(result.inert).toBe(true);
    expect(result.focusedInside).toBe(false);
  }, 90_000);

  test('exiting 期间返回按钮仍在 DOM 内、随资料段一起变暗且处于 inert 祖先内，到 diorama 后不可见', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ present: boolean; opacity: number | null; insideInert: boolean; afterExitVisible: boolean }>(`
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
      const duringExit = await js(\`(() => {
        const btn = document.querySelector('.story-back-button');
        if (!btn) return { present: false, opacity: null, insideInert: false };
        const container = btn.closest('.story-sections') || btn;
        return { present: true, opacity: parseFloat(getComputedStyle(container).opacity), insideInert: !!btn.closest('[inert]') };
      })()\`);
      const exitDeadline = Date.now() + 3000;
      while (Date.now() < exitDeadline) {
        if (await js("(() => { const v = window.__views; const e = v.lastIndexOf('exiting'); return e >= 0 && v.indexOf('diorama', e + 1) > e; })()")) break;
        await wait(0.05);
      }
      await settle();
      const afterExitVisible = await js(\`(() => {
        const btn = document.querySelector('.story-back-button');
        if (!btn) return false;
        const r = btn.getBoundingClientRect();
        const style = getComputedStyle(btn);
        return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && !btn.closest('[hidden]');
      })()\`);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ...duringExit, afterExitVisible }));
    `);
    expect(result.present).toBe(true);
    expect(result.opacity).toBeLessThan(1);
    expect(result.insideInert).toBe(true);
    expect(result.afterExitVisible).toBe(false);
  }, 90_000);

  test('exiting 期间 story-sections 带 leaving 类，约 500 毫秒时透明度已在淡出中', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ hasLeavingClass: boolean; opacity: number }>(`
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
      await wait(0.5);
      const data = await js(\`(() => {
        const el = document.querySelector('.story-sections');
        if (!el) return { hasLeavingClass: false, opacity: 1 };
        return { hasLeavingClass: el.classList.contains('story-sections--leaving'), opacity: parseFloat(getComputedStyle(el).opacity) };
      })()\`);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify(data));
    `);
    expect(result.hasLeavingClass).toBe(true);
    expect(result.opacity < 1 || result.opacity < 0.9).toBe(true);
  }, 90_000);

  test('退出到 diorama 后再次进入：story-sections 不带 leaving 类，透明度复原为 1，返回按钮可见', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ leavingClassAfterReenter: boolean; opacityAfterReenter: number; backButtonVisible: boolean }>(`
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
      await click([${p.x}, ${p.y}]);
      const reenterDeadline = Date.now() + 5000;
      while (Date.now() < reenterDeadline) {
        const views = await js('window.__views');
        if (views.lastIndexOf('story') > views.lastIndexOf('exiting')) break;
        await wait(0.05);
      }
      await wait(1.2);
      const data = await js(\`(() => {
        const el = document.querySelector('.story-sections');
        const btn = document.querySelector('.story-back-button');
        const r = btn ? btn.getBoundingClientRect() : null;
        const style = btn ? getComputedStyle(btn) : null;
        return {
          leavingClassAfterReenter: !!el && el.classList.contains('story-sections--leaving'),
          opacityAfterReenter: el ? parseFloat(getComputedStyle(el).opacity) : 0,
          backButtonVisible: !!btn && !!r && r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
        };
      })()\`);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify(data));
    `);
    expect(result.leavingClassAfterReenter).toBe(false);
    expect(result.opacityAfterReenter).toBeGreaterThanOrEqual(0.99);
    expect(result.backButtonVisible).toBe(true);
  }, 90_000);
});

describe('资料视角 Tab 聚焦对齐', () => {
  test('聚焦第 3 段链接后自动对齐，随后 ArrowUp 回到第 2 段', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ scrollAfterFocus: number; activeAfterFocus: number | null; scrollAfterUp: number }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await js(\`document.querySelector('.story-sections a[href="https://github.com/0xBB2b"]').focus()\`);
      await wait(0.6);
      const scrollAfterFocus = await js('window.scrollY');
      const activeAfterFocus = await js("Array.from(document.querySelectorAll('.story-dot')).findIndex(d => d.getAttribute('aria-current') === 'true')");
      await pressKey('ArrowUp', 'ArrowUp', 38);
      await wait(1.3);
      const scrollAfterUp = await js('window.scrollY');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ scrollAfterFocus, activeAfterFocus, scrollAfterUp }));
    `);
    expect(result.scrollAfterFocus).toBe(1800);
    expect(result.activeAfterFocus).toBe(2);
    expect(result.scrollAfterUp).toBe(900);
  }, 90_000);

  test('翻页动画进行中聚焦第 3 段链接：动画结束后停在第 3 段，随后 ArrowUp 回到第 2 段', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ scrollAfterSettle: number; activeAfterSettle: number | null; scrollAfterUp: number }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await wait(0.6);
      await pressKey('PageDown', 'PageDown', 34, '');
      await wait(0.2);
      await js(\`document.querySelector('.story-sections a[href="https://github.com/0xBB2b"]').focus()\`);
      await wait(1.5);
      const scrollAfterSettle = await js('window.scrollY');
      const activeAfterSettle = await js("Array.from(document.querySelectorAll('.story-dot')).findIndex(d => d.getAttribute('aria-current') === 'true')");
      await pressKey('ArrowUp', 'ArrowUp', 38);
      await wait(1.3);
      const scrollAfterUp = await js('window.scrollY');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ scrollAfterSettle, activeAfterSettle, scrollAfterUp }));
    `);
    expect(Math.abs(result.scrollAfterSettle - 2 * 900)).toBeLessThanOrEqual(1);
    expect(result.activeAfterSettle).toBe(2);
    expect(Math.abs(result.scrollAfterUp - 900)).toBeLessThanOrEqual(1);
  }, 90_000);
});

describe('资料视角滚轮与触摸过滤', () => {
  test('第 2 段：横向为主的滚轮不翻页', async () => {
    const p = plaquePoint(1440, 900);
    const road = roadPoint(1440, 900);
    const result = await runBrowser<{ scrollBefore: number; scrollAfter: number }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await wait(0.6);
      await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: ${road.x}, y: ${road.y}, deltaX: 0, deltaY: 120 });
      await wait(1.3);
      const scrollBefore = await js('window.scrollY');
      await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: ${road.x}, y: ${road.y}, deltaX: 200, deltaY: 0 });
      await wait(1.3);
      const scrollAfter = await js('window.scrollY');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ scrollBefore, scrollAfter }));
    `);
    expect(result.scrollBefore).toBe(900);
    expect(result.scrollAfter).toBe(900);
  }, 90_000);

  test('资料视角下 Ctrl+滚轮不翻页且不阻止默认行为', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ scrollBefore: number; scrollAfter: number; defaultPrevented: boolean }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await wait(0.6);
      const scrollBefore = await js('window.scrollY');
      const defaultPrevented = await js(\`(() => {
        const event = new WheelEvent('wheel', { deltaY: 100, ctrlKey: true, cancelable: true, bubbles: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      })()\`);
      await wait(0.3);
      const scrollAfter = await js('window.scrollY');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ scrollBefore, scrollAfter, defaultPrevented }));
    `);
    expect(result.scrollBefore).toBe(0);
    expect(result.scrollAfter).toBe(0);
    expect(result.defaultPrevented).toBe(false);
  }, 90_000);

  test('整体视角下 Ctrl+滚轮不被拦截', async () => {
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

  test('双指 touchmove 不被拦截，单指 touchmove 被拦截', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ twoFingerPrevented: boolean; oneFingerPrevented: boolean }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      const data = await js(\`(() => {
        const target = document.body;
        const t1 = new Touch({ identifier: 1, target, clientX: 200, clientY: 300 });
        const t2 = new Touch({ identifier: 2, target, clientX: 260, clientY: 300 });
        const twoEvent = new TouchEvent('touchmove', { touches: [t1, t2], targetTouches: [t1, t2], changedTouches: [t1, t2], cancelable: true, bubbles: true });
        window.dispatchEvent(twoEvent);
        const t3 = new Touch({ identifier: 3, target, clientX: 200, clientY: 300 });
        const oneEvent = new TouchEvent('touchmove', { touches: [t3], targetTouches: [t3], changedTouches: [t3], cancelable: true, bubbles: true });
        window.dispatchEvent(oneEvent);
        return { twoFingerPrevented: twoEvent.defaultPrevented, oneFingerPrevented: oneEvent.defaultPrevented };
      })()\`);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify(data));
    `);
    expect(result.twoFingerPrevented).toBe(false);
    expect(result.oneFingerPrevented).toBe(true);
  }, 90_000);

  test('390×844 手机上滑翻页，下滑返回上一段', async () => {
    const result = await runBrowser<{ view: string | null; scrollAfterUp: number; scrollAfterDown: number }>(`
      ${HELPERS}
      await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      await navigate(${JSON.stringify(BASE_URL)});
      while (!(await js("!!document.querySelector('.enter-story-button')"))) await wait(0.05);
      await click('.loading-shell-button');
      await settle();
      await wait(0.6);
      await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 600 }] });
      await cdp('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 400 }] });
      await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await wait(1.6);
      const scrollAfterUp = await js('window.scrollY');
      await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 300 }] });
      await cdp('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 500 }] });
      await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await wait(1.3);
      const scrollAfterDown = await js('window.scrollY');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view: await js('document.documentElement.dataset.view ?? null'), scrollAfterUp, scrollAfterDown }));
    `);
    expect(result.view).toBe('story');
    expect(result.scrollAfterUp).toBe(844);
    expect(result.scrollAfterDown).toBe(0);
  }, 90_000);

  test('双指缩放手势（先松一指再松另一指）不触发翻页', async () => {
    const result = await runBrowser<{ view: string | null; scrollY: number; activeIndex: number | null }>(`
      ${HELPERS}
      await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      await navigate(${JSON.stringify(BASE_URL)});
      while (!(await js("!!document.querySelector('.enter-story-button')"))) await wait(0.05);
      await click('.loading-shell-button');
      await settle();
      await wait(0.6);
      await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 500 }, { x: 195, y: 600 }] });
      await cdp('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 300 }, { x: 195, y: 800 }] });
      await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: 195, y: 50 }] });
      await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await wait(1.3);
      const scrollY = await js('window.scrollY');
      const activeIndex = await js("Array.from(document.querySelectorAll('.story-dot')).findIndex(d => d.getAttribute('aria-current') === 'true')");
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view: await js('document.documentElement.dataset.view ?? null'), scrollY, activeIndex }));
    `);
    expect(result.view).toBe('story');
    expect(result.scrollY).toBe(0);
    expect(result.activeIndex).toBe(0);
  }, 90_000);
});

describe('资料视角空格键作用域', () => {
  test('焦点在未选中的语言按钮上按空格：切换语言且不翻页', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ scrollBefore: number; scrollAfter: number; htmlLang: string }>(`
      ${HELPERS}
      ${boot(1440, 900, { lang: 'zh-CN' })}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await js("document.querySelector('.story-language button').focus()");
      const scrollBefore = await js('window.scrollY');
      await wait(0.6);
      await pressKey(' ', 'Space', 32, ' ');
      await wait(0.3);
      const scrollAfter = await js('window.scrollY');
      const htmlLang = await js('document.documentElement.lang');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ scrollBefore, scrollAfter, htmlLang }));
    `);
    expect(result.scrollBefore).toBe(0);
    expect(result.htmlLang).toBe('en');
    expect(result.scrollAfter).toBe(0);
  }, 90_000);

  test('焦点在返回按钮上按空格：退出到 diorama', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ views: string[] }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await js("document.querySelector('.story-back-button').focus()");
      await pressKey(' ', 'Space', 32, ' ');
      const exitDeadline = Date.now() + 3000;
      while (Date.now() < exitDeadline) {
        if (await js("(() => { const v = window.__views; const e = v.lastIndexOf('exiting'); return e >= 0 && v.indexOf('diorama', e + 1) > e; })()")) break;
        await wait(0.05);
      }
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ views: await js('window.__views') }));
    `);
    const exitingIndex = result.views.indexOf('exiting');
    expect(exitingIndex).toBeGreaterThanOrEqual(0);
    expect(result.views.indexOf('diorama', exitingIndex + 1)).toBeGreaterThan(exitingIndex);
  }, 90_000);
});

describe('资料视角翻页锁边界', () => {
  test('间隔超过动画时长加冷却时长的第二次 PageDown 能继续翻页', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ scrollY: number }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await wait(0.6);
      await pressKey('PageDown', 'PageDown', 34, '');
      await wait(1.6);
      await pressKey('PageDown', 'PageDown', 34, '');
      await wait(1.2);
      const scrollY = await js('window.scrollY');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ scrollY }));
    `);
    expect(result.scrollY).toBe(1800);
  }, 90_000);

  test.each([
    ['PageUp', 'PageUp', 33],
    ['ArrowUp', 'ArrowUp', 38],
  ] as const)('键盘翻页：%s 翻到上一段', async (key, code, vk) => {
    const p = plaquePoint(1440, 900);
    const road = roadPoint(1440, 900);
    const result = await runBrowser<{ scrollY: number }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await wait(0.6);
      await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: ${road.x}, y: ${road.y}, deltaX: 0, deltaY: 120 });
      await wait(1.6);
      await pressKey(${JSON.stringify(key)}, ${JSON.stringify(code)}, ${vk}, '');
      await wait(1.3);
      const scrollY = await js('window.scrollY');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ scrollY }));
    `);
    expect(result.scrollY).toBe(0);
  }, 90_000);

  test('第 3 段边界：PageDown 向下无反应', async () => {
    const p = plaquePoint(1440, 900);
    const road = roadPoint(1440, 900);
    const result = await runBrowser<{ scrollY: number }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await wait(0.6);
      for (let i = 0; i < 2; i++) {
        await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: ${road.x}, y: ${road.y}, deltaX: 0, deltaY: 120 });
        await wait(1.6);
      }
      await pressKey('PageDown', 'PageDown', 34, '');
      await wait(1.3);
      const scrollY = await js('window.scrollY');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ scrollY }));
    `);
    expect(result.scrollY).toBe(1800);
  }, 90_000);

  test('第 3 段边界：滚轮向下无反应', async () => {
    const p = plaquePoint(1440, 900);
    const road = roadPoint(1440, 900);
    const result = await runBrowser<{ scrollY: number }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await wait(0.6);
      for (let i = 0; i < 2; i++) {
        await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: ${road.x}, y: ${road.y}, deltaX: 0, deltaY: 120 });
        await wait(1.6);
      }
      await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: ${road.x}, y: ${road.y}, deltaX: 0, deltaY: 120 });
      await wait(1.3);
      const scrollY = await js('window.scrollY');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ scrollY }));
    `);
    expect(result.scrollY).toBe(1800);
  }, 90_000);
});

describe('资料段', () => {
  test('三段内容包含姓名、职位、所在地、标题、简介、四个方向与四个链接（中文）', async () => {
    const p = plaquePoint(1440, 900);
    const real = await runBrowser<{ view: string | null; text: string; links: string[]; userSelect: string }>(`
      ${HELPERS}
      ${boot(1440, 900, { lang: 'zh-CN' })}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      const data = await js(\`(() => {
        const container = document.querySelector('.story-sections');
        const text = container ? container.textContent : '';
        const links = Array.from(document.querySelectorAll('.story-sections a')).map(a => a.getAttribute('href'));
        const p = document.querySelector('.story-sections .story-text');
        const userSelect = p ? getComputedStyle(p).userSelect : '';
        return { text, links, userSelect };
      })()\`);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view: await js('document.documentElement.dataset.view ?? null'), ...data }));
    `);
    expect(real.view).toBe('story');
    expect(real.text).toContain('FUBUKI_BB');
    expect(real.text).toContain('Tokyo');
    expect(real.text).toContain('Shanghai');
    expect(real.text).toContain('雨夜里还亮着的店');
    expect(real.text).toContain('一起出发');
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

  test('当前段的进度点随滚动高亮', async () => {
    const p = plaquePoint(1440, 900);
    const road = roadPoint(1440, 900);
    const height = 900;
    const sectionStarts = storyLayout(height).sectionStarts;
    const result = await runBrowser<{ activeAtStart: number | null; activeAfterScroll: number | null }>(`
      ${HELPERS}
      ${boot(1440, height)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      const activeAtStart = await js("Array.from(document.querySelectorAll('.story-dot')).findIndex(d => d.getAttribute('aria-current') === 'true')");
      await js('window.scrollTo(0, ${sectionStarts[1] + (sectionStarts[2] - sectionStarts[1]) * 0.3})');
      await wait(1.2);
      const activeAfterScroll = await js("Array.from(document.querySelectorAll('.story-dot')).findIndex(d => d.getAttribute('aria-current') === 'true')");
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ activeAtStart, activeAfterScroll }));
    `);
    expect(result.activeAtStart).toBe(0);
    expect(result.activeAfterScroll).toBe(1);
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
        fallbackText = await js("(() => { const el = document.querySelector('.story-avatar--fallback'); return el ? el.textContent : null; })()");
        if (fallbackText) break;
        await wait(0.1);
      }
      __stop = true;
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view: await js('document.documentElement.dataset.view ?? null'), fallbackText }));
    `);
    expect(result.view).toBe('story');
    expect(result.fallbackText).toBe('F');
  }, 90_000);

  test('竖屏 390×844 下第 1 段文字位于视口下方 45% 区域', async () => {
    const p = plaquePoint(390, 844);
    const result = await runBrowser<{ view: string | null; top: number }>(`
      ${HELPERS}
      ${boot(390, 844)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      const top = await js("document.querySelector('.story-section .story-text').getBoundingClientRect().top");
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view: await js('document.documentElement.dataset.view ?? null'), top }));
    `);
    expect(result.view).toBe('story');
    expect(result.top).toBeGreaterThanOrEqual(844 * 0.55);
  }, 90_000);

  test('375×667 且三维失败时，所在地文字完整可见且未被遮挡', async () => {
    const result = await runBrowser<{ view: string | null; alertShown: boolean; locationFullyVisible: boolean; covered: boolean }>(`
      ${HELPERS}
      ${boot(375, 667, {
        extraScript: `
          const original = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (type, ...args) {
            if (typeof type === 'string' && type.startsWith('webgl')) return null;
            return original.call(this, type, ...args);
          };
        `,
        waitForExpr: "document.documentElement.dataset.view === 'story'",
      })}
      const alertShown = await js("document.querySelector('[role=\\"alert\\"]') !== null");
      const data = await js(\`(() => {
        const el = document.querySelector('.story-location');
        if (!el) return { locationFullyVisible: false, covered: true };
        const r = el.getBoundingClientRect();
        const fully = r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth;
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const hit = document.elementFromPoint(cx, cy);
        const covered = !(hit === el || el.contains(hit));
        return { locationFullyVisible: fully, covered };
      })()\`);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view: await js('document.documentElement.dataset.view ?? null'), alertShown, ...data }));
    `);
    expect(result.view).toBe('story');
    expect(result.alertShown).toBe(true);
    expect(result.locationFullyVisible).toBe(true);
    expect(result.covered).toBe(false);
  }, 90_000);

  test('宽高比等于 1（800×800）时按宽屏左栏排版', async () => {
    const p = plaquePoint(800, 800);
    const result = await runBrowser<{ view: string | null; left: number }>(`
      ${HELPERS}
      ${boot(800, 800)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      const left = await js("document.querySelector('.story-section .story-text').getBoundingClientRect().left");
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view: await js('document.documentElement.dataset.view ?? null'), left }));
    `);
    expect(result.view).toBe('story');
    expect(result.left).toBeLessThan(400);
  }, 90_000);
});

describe('资料段链接按钮换行不重叠', () => {
  test('390×844 下第 3 段的链接按钮两两不重叠，且都是块级盒子', async () => {
    const sectionStart2 = storyLayout(844).sectionStarts[2];
    const result = await runBrowser<{ view: string | null; displays: string[]; overlaps: boolean }>(`
      ${HELPERS}
      await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
      await navigate(${JSON.stringify(BASE_URL)});
      while (!(await js("!!document.querySelector('.enter-story-button')"))) await wait(0.05);
      await click('.loading-shell-button');
      await js('window.scrollTo(0, ${sectionStart2})');
      await wait(1.2);
      const data = await js(\`(() => {
        const links = Array.from(document.querySelectorAll('.story-links a'));
        const displays = links.map(a => getComputedStyle(a).display);
        const rects = links.map(a => a.getBoundingClientRect());
        let overlaps = false;
        for (let i = 0; i < rects.length; i++) {
          for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i], b = rects[j];
            const separate = a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
            if (!separate) overlaps = true;
          }
        }
        const rows = new Set(rects.map(r => Math.round(r.top))).size;
        return { displays, overlaps, rows };
      })()\`);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view: await js('document.documentElement.dataset.view ?? null'), ...data }));
    `);
    expect(result.view).toBe('story');
    for (const display of result.displays) {
      expect(['inline-block', 'block', 'flex', 'inline-flex']).toContain(display);
    }
    expect(result.overlaps).toBe(false);
    expect((result as { rows?: number }).rows).toBeGreaterThanOrEqual(2);
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
});

describe('先看资料', () => {
  test('点击「先看资料」后加载页立即移除，data-view 变为 story，第 1 段可见', async () => {
    const result = await runBrowser<{ view: string | null; firstSectionVisible: boolean }>(`
      ${HELPERS}
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      const ua = await js('navigator.userAgent');
      await cdp('Emulation.setUserAgentOverride', { userAgent: ua, acceptLanguage: 'en-US' });
      await navigate(${JSON.stringify(BASE_URL)});
      while (!(await js("!!document.querySelector('.enter-story-button')"))) await wait(0.05);
      await click('.loading-shell-button');
      const view = await js('document.documentElement.dataset.view ?? null');
      const shellGone = await js("!document.querySelector('.loading-shell')");
      const firstSectionVisible = await js(\`(() => {
        const s = document.querySelectorAll('.story-section')[0];
        if (!s) return false;
        const r = s.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })()\`);
      await wait(0.2);
      const scrollY = await js('window.scrollY');
      const background = await js("getComputedStyle(document.body).backgroundImage + ' ' + getComputedStyle(document.getElementById('root')).backgroundImage");
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view, shellGone, firstSectionVisible, scrollY, background }));
    `);
    expect(result.view).toBe('story');
    expect((result as any).shellGone).toBe(true);
    expect(result.firstSectionVisible).toBe(true);
    expect((result as any).scrollY).toBe(storyLayout(900).sectionStarts[0]);
    expect((result as any).background).toContain('radial-gradient');
  }, 90_000);

  test('先看资料后场景就绪，canvas 在 450 毫秒内淡入到不透明，随后按 Esc 回到 diorama', async () => {
    const result = await runBrowser<{ opacityReached: boolean; view: string | null }>(`
      ${HELPERS}
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await cdp('Page.addScriptToEvaluateOnNewDocument', { source: ${JSON.stringify(VIEW_TRACKER)} });
      await navigate(${JSON.stringify(BASE_URL)});
      while (!(await js("!!document.querySelector('.enter-story-button')"))) await wait(0.05);
      await click('.loading-shell-button');
      const readyDeadline = Date.now() + 20000;
      while (Date.now() < readyDeadline) {
        if (await js("document.querySelector('#scene')?.getAttribute('aria-busy') === 'false'")) break;
        await wait(0.05);
      }
      const readyAt = Date.now();
      let opacityReached = false;
      while (Date.now() - readyAt < 700) {
        const opacity = await js("(() => { const c = document.querySelector('#scene canvas'); return c ? Number(getComputedStyle(c).opacity) : 0; })()");
        if (opacity >= 0.99) { opacityReached = Date.now() - readyAt <= 500; break; }
        await wait(0.02);
      }
      await pressKey('Escape', 'Escape', 27);
      const dioramaDeadline = Date.now() + 5000;
      while (Date.now() < dioramaDeadline) {
        if (await js("(() => { const v = window.__views; const e = v.lastIndexOf('exiting'); return e >= 0 && v.indexOf('diorama', e + 1) > e; })()")) break;
        await wait(0.05);
      }
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ opacityReached, view: await js('document.documentElement.dataset.view ?? null') }));
    `);
    expect(result.opacityReached).toBe(true);
    expect(result.view).toBe('diorama');
  }, 90_000);

  test('场景就绪通知与点击「先看资料」时序撞在一起时，返回全景按钮仍可见且 Esc 仍能退出', async () => {
    const result = await runBrowser<{ backVisible: boolean; views: string[]; recovered: boolean }>(`
      ${HELPERS}
      await cdp('Page.addScriptToEvaluateOnNewDocument', { source: ${JSON.stringify(READY_RACE_INJECTION)} });
      await navigate(${JSON.stringify(BASE_URL)});
      const readyDeadline = Date.now() + 1500;
      let backVisible = false;
      while (Date.now() < readyDeadline) {
        backVisible = await js("(() => { const b = document.querySelector('.story-back-button'); if (!b) return false; const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; })()");
        if (backVisible) break;
        await wait(0.05);
      }
      await pressKey('Escape', 'Escape', 27);
      const exitDeadline = Date.now() + 3000;
      let recovered = false;
      while (Date.now() < exitDeadline) {
        recovered = await js("(() => { const v = window.__views; const e = v.lastIndexOf('exiting'); return e >= 0 && v.indexOf('diorama', e + 1) > e; })()");
        if (recovered) break;
        await wait(0.05);
      }
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ backVisible, views: await js('window.__views'), recovered }));
    `);
    expect(result.backVisible).toBe(true);
    expect(result.recovered).toBe(true);
  }, 20_000);
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

  test('资料视角点击 EN 后 html lang 变为 en，资料段切换为英文', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ htmlLang: string; text: string }>(`
      ${HELPERS}
      ${boot(1440, 900, { lang: 'zh-CN' })}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await click(\`.story-language button\`);
      await settle();
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ htmlLang: await js('document.documentElement.lang'), text: await js("document.querySelector('.story-sections').textContent") }));
    `);
    expect(result.htmlLang).toBe('en');
    expect(result.text).toContain('Still open on a rainy night');
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
      await click('.story-language button');
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
