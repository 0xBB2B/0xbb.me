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
`;

const GETCONTEXT_NULL_SCRIPT = `
  const __originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    if (typeof type === 'string' && type.startsWith('webgl')) return null;
    return __originalGetContext.call(this, type, ...args);
  };
`;

describe('三维场景加载失败', () => {
  test('三维代码动态分块加载失败时显示失败提示，无可见 canvas，链接可点', async () => {
    expect(worldChunkFile).not.toBeNull();
    const result = await runBrowser<{ view: string | null; shellGone: boolean; alertText: string | null; canvasCount: number; linksClickable: boolean }>(`
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
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        if (await js("document.documentElement.dataset.view === 'story'")) break;
        await wait(0.1);
      }
      __stop = true;
      const view = await js('document.documentElement.dataset.view ?? null');
      const shellGone = await js("!document.querySelector('.loading-shell')");
      const alertText = await js("(() => { const el = document.querySelector('[role=\\"alert\\"]'); return el ? el.textContent : null; })()");
      const canvasCount = await js("document.querySelectorAll('#scene canvas').length");
      const linksClickable = await js(\`(() => {
        const links = Array.from(document.querySelectorAll('.story-sections a'));
        if (links.length !== 4) return false;
        return links.every((a) => {
          a.scrollIntoView({ block: 'center' });
          const r = a.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) return false;
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return hit === a || a.contains(hit);
        });
      })()\`);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view, shellGone, alertText, canvasCount, linksClickable }));
    `);
    expect(result.view).toBe('story');
    expect(result.shellGone).toBe(true);
    expect(result.alertText).toContain("The 3D scene couldn't load");
    expect(result.canvasCount).toBe(0);
    expect(result.linksClickable).toBe(true);
  }, 90_000);

  test('WebGL 创建失败时显示失败提示，滚到 0 仍停留在 story', async () => {
    const result = await runBrowser<{ view: string | null; shellGone: boolean; alertText: string | null; canvasCount: number; viewAfterScrollTop: string | null }>(`
      ${HELPERS}
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await cdp('Page.addScriptToEvaluateOnNewDocument', { source: ${JSON.stringify(GETCONTEXT_NULL_SCRIPT)} });
      await cdp('Emulation.setUserAgentOverride', { userAgent: await js('navigator.userAgent'), acceptLanguage: 'en-US' });
      await navigate(${JSON.stringify(BASE_URL)});
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        if (await js("document.documentElement.dataset.view === 'story'")) break;
        await wait(0.1);
      }
      const view = await js('document.documentElement.dataset.view ?? null');
      const shellGone = await js("!document.querySelector('.loading-shell')");
      const alertText = await js("(() => { const el = document.querySelector('[role=\\"alert\\"]'); return el ? el.textContent : null; })()");
      const canvasCount = await js("document.querySelectorAll('#scene canvas').length");
      await js('window.scrollTo(0, 0)');
      await settle();
      const viewAfterScrollTop = await js('document.documentElement.dataset.view ?? null');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view, shellGone, alertText, canvasCount, viewAfterScrollTop }));
    `);
    expect(result.view).toBe('story');
    expect(result.shellGone).toBe(true);
    expect(result.alertText).toContain("The 3D scene couldn't load");
    expect(result.canvasCount).toBe(0);
    expect(result.viewAfterScrollTop).toBe('story');
  }, 90_000);

  test('运行中 WebGL 上下文丢失后显示失败提示', async () => {
    const p = plaquePoint(1440, 900);
    const result = await runBrowser<{ contextLossTriggered: boolean; alertText: string | null; view: string | null }>(`
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
      const alertDeadline = Date.now() + 5000;
      let alertText = null;
      while (Date.now() < alertDeadline) {
        alertText = await js("(() => { const el = document.querySelector('[role=\\"alert\\"]'); return el ? el.textContent : null; })()");
        if (alertText) break;
        await wait(0.1);
      }
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ contextLossTriggered, alertText, view: await js('document.documentElement.dataset.view ?? null') }));
    `);
    expect(result.contextLossTriggered).toBe(true);
    expect(result.alertText).toContain("The 3D scene couldn't load");
    expect(result.view).toBe('story');
  }, 90_000);

  test('先点「先看资料」再触发上下文丢失，失败提示出现且 scrollY 不变', async () => {
    const result = await runBrowser<{ scrollBefore: number; scrollAfter: number; alertText: string | null }>(`
      ${HELPERS}
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await cdp('Emulation.setUserAgentOverride', { userAgent: await js('navigator.userAgent'), acceptLanguage: 'en-US' });
      await navigate(${JSON.stringify(BASE_URL)});
      while (!(await js("!!document.querySelector('.enter-story-button')"))) await wait(0.05);
      await click('.loading-shell-button');
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        if (await js("document.querySelector('#scene')?.getAttribute('aria-busy') === 'false'")) break;
        await wait(0.2);
      }
      const scrollBefore = await js('window.scrollY');
      await js(\`(() => {
        const canvas = document.querySelector('#scene canvas');
        const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
        const ext = gl && gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      })()\`);
      const alertDeadline = Date.now() + 5000;
      let alertText = null;
      while (Date.now() < alertDeadline) {
        alertText = await js("(() => { const el = document.querySelector('[role=\\"alert\\"]'); return el ? el.textContent : null; })()");
        if (alertText) break;
        await wait(0.1);
      }
      const scrollAfter = await js('window.scrollY');
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ scrollBefore, scrollAfter, alertText }));
    `);
    expect(result.alertText).toContain("The 3D scene couldn't load");
    expect(result.scrollAfter).toBe(result.scrollBefore);
  }, 90_000);
});
