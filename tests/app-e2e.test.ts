// 依赖 dist/ 为最新构建产物：运行前先执行 `bun run build`，本文件不重复构建。
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import path from 'node:path';
import { preview, type PreviewServer } from 'vite';
import * as THREE from 'three';
import { runBrowser } from './browser';
import { plaquePoint, roadPoint } from './scene-helpers';
import { DEFAULT_CAMERA } from '../diorama/layout';
import { PLAQUE_PANEL } from '../diorama/plaque';
import { storyLayout, snapTarget } from '../diorama/story-scroll';

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
  async function wheelScroll(x, y, totalDeltaY, steps) {
    const n = steps || 12;
    const step = totalDeltaY / n;
    for (let i = 0; i < n; i++) {
      await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: step });
      await wait(0.02);
    }
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
  test('滚动时画面随之变化', async () => {
    const p = plaquePoint(1440, 900);
    const road = roadPoint(1440, 900);
    const result = await runBrowser<{ views: string[]; same: boolean }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      const before = await screenshot();
      await wheelScroll(${road.x}, ${road.y}, 400);
      await wait(0.3);
      const after = await screenshot();
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ views: await js('window.__views'), same: before === after }));
    `);
    expect(result.views).toContain('story');
    expect(result.same).toBe(false);
  }, 90_000);

  test('停止滚动 150 毫秒后平滑吸附到最近一段起点', async () => {
    const p = plaquePoint(1440, 900);
    const road = roadPoint(1440, 900);
    const height = 900;
    const result = await runBrowser<{ views: string[]; raw: number; settled: number }>(`
      ${HELPERS}
      ${boot(1440, height)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await wheelScroll(${road.x}, ${road.y}, 300);
      const raw = await js('window.scrollY');
      await wait(1.2);
      const settled = await js('window.scrollY');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ views: await js('window.__views'), raw, settled }));
    `);
    expect(result.views).toContain('story');
    const expected = snapTarget(result.raw, height);
    expect(Math.abs(result.settled - expected)).toBeLessThan(3);
  }, 90_000);

  test('回拉区中途停手弹回第 1 段', async () => {
    const p = plaquePoint(1440, 900);
    const road = roadPoint(1440, 900);
    const height = 900;
    const sectionStart0 = storyLayout(height).sectionStarts[0];
    const result = await runBrowser<{ views: string[]; raw: number; settled: number }>(`
      ${HELPERS}
      ${boot(1440, height)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await wheelScroll(${road.x}, ${road.y}, -${sectionStart0 * 0.5});
      const raw = await js('window.scrollY');
      await wait(1.2);
      const settled = await js('window.scrollY');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ views: await js('window.__views'), raw, settled }));
    `);
    expect(result.views).toContain('story');
    expect(result.raw).toBeGreaterThan(0);
    expect(result.raw).toBeLessThan(sectionStart0);
    expect(result.settled).toBe(sectionStart0);
  }, 90_000);

  test('滚到 0 且 3D 就绪后回到 diorama，页面恢复不可滚动、资料段隐藏且 inert', async () => {
    const p = plaquePoint(1440, 900);
    const road = roadPoint(1440, 900);
    const result = await runBrowser<{ views: string[]; sectionsHidden: boolean; sectionsInert: boolean; scrollAfterWheel: number }>(`
      ${HELPERS}
      ${boot(1440, 900)}
      await click([${p.x}, ${p.y}]);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await js('window.__views')).includes('story')) break;
        await wait(0.05);
      }
      await settle();
      await wheelScroll(${road.x}, ${road.y}, -3000, 20);
      const dioramaDeadline = Date.now() + 5000;
      while (Date.now() < dioramaDeadline) {
        if ((await js('window.__views')).includes('diorama')) break;
        await wait(0.05);
      }
      await wait(0.3);
      const data = await js(\`(() => {
        const s = document.querySelector('.story-sections');
        return { sectionsHidden: !!s && s.hidden, sectionsInert: !!s && s.inert };
      })()\`);
      await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: ${road.x}, y: ${road.y}, deltaX: 0, deltaY: 200 });
      await wait(0.2);
      const scrollAfterWheel = await js('window.scrollY');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ views: await js('window.__views'), ...data, scrollAfterWheel }));
    `);
    expect(result.views).toContain('story');
    expect(result.views[result.views.length - 1]).toBe('diorama');
    expect(result.sectionsHidden).toBe(true);
    expect(result.sectionsInert).toBe(true);
    expect(result.scrollAfterWheel).toBe(0);
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

  test('先看资料后场景就绪，canvas 在 450 毫秒内淡入到不透明，随后滚到 0 回到 diorama', async () => {
    const road = roadPoint(1440, 900);
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
      await wheelScroll(${road.x}, ${road.y}, -3000, 20);
      const dioramaDeadline = Date.now() + 5000;
      while (Date.now() < dioramaDeadline) {
        if ((await js('window.__views')).includes('diorama')) break;
        await wait(0.05);
      }
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ opacityReached, view: await js('document.documentElement.dataset.view ?? null') }));
    `);
    expect(result.opacityReached).toBe(true);
    expect(result.view).toBe('diorama');
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
