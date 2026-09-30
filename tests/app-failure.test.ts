// 依赖 dist/ 为最新构建产物：运行前先执行 `bun run build`，本文件不重复构建。
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { preview, type PreviewServer } from 'vite';
import { runBrowser } from './browser';
import { plaquePoint } from './scene-helpers';

const ROOT = path.resolve(import.meta.dir, '..');
const PORT = 4203;
const BASE_URL = `http://127.0.0.1:${PORT}/`;

let server: PreviewServer;
let worldChunkFile: string | null = null;

beforeAll(async () => {
  server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: PORT, strictPort: true } });

  const indexHtml = readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
  const entryMatch = indexHtml.match(/<script[^>]*type="module"[^>]*src="\.?\/?(assets\/[^"]+\.js)"/);
  const entryFile = entryMatch ? path.basename(entryMatch[1]) : null;
  const assetFiles = readdirSync(path.join(ROOT, 'dist/assets')).filter((name) => name.endsWith('.js'));
  const candidates = assetFiles.filter((name) => name !== entryFile);
  worldChunkFile = candidates.find((name) => /world/i.test(name)) ?? candidates[0] ?? null;
});

afterAll(async () => {
  await server.close();
});

const HELPERS = `
  async function settle() {
    await js('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  }
  const BACK = "Array.from(document.querySelectorAll('button')).find((b) => ['返回全景', 'Back to overview'].includes(b.textContent.trim()))";
  const VISIBLE = "(el) => { if (!el) return false; const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[hidden]'); }";
  const SCROLLER = "(() => { for (let el = document.querySelector('.receipt') && document.querySelector('.receipt').parentElement; el && el !== document.body; el = el.parentElement) { if (/auto|scroll/.test(getComputedStyle(el).overflowY)) return el; } return null; })()";
  async function isVisible(expr) {
    return js('(' + VISIBLE + ')(' + expr + ')');
  }
  async function bodyText() {
    return js('document.body.innerText');
  }
  async function waitStory() {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      if (await js("document.documentElement.dataset.view === 'story'")) return;
      await wait(0.1);
    }
  }
  async function visibleCanvasCount() {
    return js('Array.from(document.querySelectorAll("canvas")).filter(' + VISIBLE + ').length');
  }
  async function pressKey(key, code, vk, text) {
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, ...(text ? { text } : {}) });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk });
  }
`;

const GETCONTEXT_NULL_SCRIPT = `
  const __originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    if (typeof type === 'string' && type.startsWith('webgl')) return null;
    return __originalGetContext.call(this, type, ...args);
  };
`;

const FAILED_EN = "The 3D scene couldn't load";
const FAILED_ZH = '3D 场景无法加载';

const SNAPSHOT = `
  const snapshot = await js(\`(() => {
    const visible = \${VISIBLE};
    return {
      view: document.documentElement.dataset.view ?? null,
      shellGone: !document.querySelector('.loading-shell'),
      receiptVisible: visible(document.querySelector('.receipt')),
      backVisible: visible(\${BACK}),
    };
  })()\`);
`;

describe('三维场景加载失败', () => {
  test('三维代码动态分块加载失败时显示小票与失败提示，无可见 canvas，链接可点', async () => {
    expect(worldChunkFile).not.toBeNull();
    const result = await runBrowser<{ view: string | null; shellGone: boolean; receiptVisible: boolean; backVisible: boolean; text: string; canvasCount: number; linksClickable: boolean }>(`
      ${HELPERS}
      await cdp('Fetch.enable', { patterns: [{ urlPattern: '*${worldChunkFile}' }] });
      let __stop = false;
      (async () => {
        while (!__stop) {
          for (const event of drainEvents()) {
            if (event.method === 'Fetch.requestPaused') {
              await cdp('Fetch.failRequest', { requestId: event.params.requestId, errorReason: 'Failed' });
            }
          }
          await wait(0.05);
        }
      })();
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await cdp('Emulation.setUserAgentOverride', { userAgent: await js('navigator.userAgent'), acceptLanguage: 'en-US' });
      await navigate(${JSON.stringify(BASE_URL)});
      await waitStory();
      __stop = true;
      await wait(1);
      ${SNAPSHOT}
      const linksClickable = await js(\`(() => {
        const links = Array.from(document.querySelectorAll('.receipt a'));
        if (links.length !== 4) return false;
        return links.every((a) => {
          a.scrollIntoView({ block: 'center' });
          const r = a.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) return false;
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return hit === a || a.contains(hit);
        });
      })()\`);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ...snapshot, text: await bodyText(), canvasCount: await visibleCanvasCount(), linksClickable }));
    `);
    expect(result.view).toBe('story');
    expect(result.shellGone).toBe(true);
    expect(result.receiptVisible).toBe(true);
    expect(result.backVisible).toBe(false);
    expect(result.text).toContain(FAILED_EN);
    expect(result.canvasCount).toBe(0);
    expect(result.linksClickable).toBe(true);
  }, 90_000);

  test('WebGL 创建失败时显示小票与失败提示，无可见返回按钮，按 Esc 后仍停留在 story', async () => {
    const result = await runBrowser<{ view: string | null; shellGone: boolean; receiptVisible: boolean; backVisible: boolean; text: string; canvasCount: number; viewAfterEscape: string | null }>(`
      ${HELPERS}
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await cdp('Page.addScriptToEvaluateOnNewDocument', { source: ${JSON.stringify(GETCONTEXT_NULL_SCRIPT)} });
      await cdp('Emulation.setUserAgentOverride', { userAgent: await js('navigator.userAgent'), acceptLanguage: 'en-US' });
      await navigate(${JSON.stringify(BASE_URL)});
      await waitStory();
      await wait(1);
      ${SNAPSHOT}
      const text = await bodyText();
      const canvasCount = await visibleCanvasCount();
      await pressKey('Escape', 'Escape', 27);
      await settle();
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ...snapshot, text, canvasCount, viewAfterEscape: await js('document.documentElement.dataset.view ?? null') }));
    `);
    expect(result.view).toBe('story');
    expect(result.shellGone).toBe(true);
    expect(result.receiptVisible).toBe(true);
    expect(result.backVisible).toBe(false);
    expect(result.text).toContain(FAILED_EN);
    expect(result.canvasCount).toBe(0);
    expect(result.viewAfterEscape).toBe('story');
  }, 90_000);

  test('中文环境下失败提示为「3D 场景无法加载」', async () => {
    const result = await runBrowser<{ text: string }>(`
      ${HELPERS}
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await cdp('Page.addScriptToEvaluateOnNewDocument', { source: ${JSON.stringify(GETCONTEXT_NULL_SCRIPT)} });
      await cdp('Emulation.setUserAgentOverride', { userAgent: await js('navigator.userAgent'), acceptLanguage: 'zh-CN' });
      await navigate(${JSON.stringify(BASE_URL)});
      await waitStory();
      await wait(1);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ text: await bodyText() }));
    `);
    expect(result.text).toContain(FAILED_ZH);
  }, 90_000);

  test('三维失败后小票、相片、语言开关照常可用', async () => {
    const result = await runBrowser<{ view: string | null; htmlLang: string; receiptText: string; photoOpen: boolean; photoOpenAfterEsc: boolean; viewAfterEsc: string | null }>(`
      ${HELPERS}
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await cdp('Page.addScriptToEvaluateOnNewDocument', { source: ${JSON.stringify(GETCONTEXT_NULL_SCRIPT)} });
      await cdp('Emulation.setUserAgentOverride', { userAgent: await js('navigator.userAgent'), acceptLanguage: 'zh-CN' });
      await navigate(${JSON.stringify(BASE_URL)});
      await waitStory();
      await wait(1);
      await click('.language-toggle button');
      await settle();
      const htmlLang = await js('document.documentElement.lang');
      const receiptText = await js("document.querySelector('.receipt').textContent");
      await click('.receipt-avatar-btn');
      await wait(0.3);
      const photoOpen = await js("!!document.querySelector('.photo-print-overlay')");
      await pressKey('Escape', 'Escape', 27);
      await wait(0.3);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({
        view: await js('document.documentElement.dataset.view ?? null'),
        htmlLang,
        receiptText,
        photoOpen,
        photoOpenAfterEsc: await js("!!document.querySelector('.photo-print-overlay')"),
        viewAfterEsc: await js('document.documentElement.dataset.view ?? null'),
      }));
    `);
    expect(result.htmlLang).toBe('en');
    expect(result.receiptText).toContain('Still open on a rainy night');
    expect(result.photoOpen).toBe(true);
    expect(result.photoOpenAfterEsc).toBe(false);
    expect(result.viewAfterEsc).toBe('story');
  }, 90_000);

  test('运行中 WebGL 上下文丢失后显示小票与失败提示', async () => {
    const result = await runBrowser<{ contextLossTriggered: boolean; text: string; view: string | null; receiptVisible: boolean; backVisible: boolean; canvasCount: number }>(`
      ${HELPERS}
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await cdp('Emulation.setUserAgentOverride', { userAgent: await js('navigator.userAgent'), acceptLanguage: 'en-US' });
      await navigate(${JSON.stringify(BASE_URL)});
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        if (await js("document.documentElement.dataset.view === 'diorama' && document.querySelector('#scene')?.getAttribute('aria-busy') === 'false'")) break;
        await wait(0.2);
      }
      const contextLossTriggered = await js(\`(() => {
        const canvas = document.querySelector('#scene canvas');
        if (!canvas) return false;
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) return false;
        const ext = gl.getExtension('WEBGL_lose_context');
        if (!ext) return false;
        ext.loseContext();
        return true;
      })()\`);
      await waitStory();
      await wait(1);
      ${SNAPSHOT}
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ ...snapshot, contextLossTriggered, text: await bodyText(), canvasCount: await visibleCanvasCount() }));
    `);
    expect(result.contextLossTriggered).toBe(true);
    expect(result.view).toBe('story');
    expect(result.text).toContain(FAILED_EN);
    expect(result.receiptVisible).toBe(true);
    expect(result.backVisible).toBe(false);
    expect(result.canvasCount).toBe(0);
  }, 90_000);

  test('资料视角下触发上下文丢失，失败提示出现且小票层滚动位置不变', async () => {
    const p = plaquePoint(1440, 500);
    const result = await runBrowser<{ scrollBefore: number; scrollAfter: number; text: string; h1TopBefore: number; h1TopAfter: number }>(`
      ${HELPERS}
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 500, deviceScaleFactor: 1, mobile: false });
      await cdp('Emulation.setUserAgentOverride', { userAgent: await js('navigator.userAgent'), acceptLanguage: 'en-US' });
      await navigate(${JSON.stringify(BASE_URL)});
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        if (await js("document.documentElement.dataset.view === 'diorama' && document.querySelector('#scene')?.getAttribute('aria-busy') === 'false'")) break;
        await wait(0.2);
      }
      await click([${p.x}, ${p.y}]);
      await waitStory();
      await wait(1);
      await js('(' + SCROLLER + ').scrollTop = 150');
      await settle();
      const scrollBefore = await js('(' + SCROLLER + ').scrollTop');
      const h1TopBefore = await js("document.querySelector('.receipt h1').getBoundingClientRect().top");
      await js(\`(() => {
        const canvas = document.querySelector('#scene canvas');
        const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
        const ext = gl && gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      })()\`);
      const alertDeadline = Date.now() + 5000;
      let text = '';
      while (Date.now() < alertDeadline) {
        text = await bodyText();
        if (text.includes(${JSON.stringify(FAILED_EN)})) break;
        await wait(0.1);
      }
      await wait(0.3);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ scrollBefore, scrollAfter: await js('(' + SCROLLER + ').scrollTop'), text, h1TopBefore, h1TopAfter: await js("document.querySelector('.receipt h1').getBoundingClientRect().top") }));
    `);
    expect(result.text).toContain(FAILED_EN);
    expect(result.scrollBefore).toBeGreaterThan(0);
    expect(result.scrollAfter).toBe(result.scrollBefore);
    expect(Math.abs(result.h1TopAfter - result.h1TopBefore)).toBeLessThanOrEqual(1);
  }, 90_000);
});
