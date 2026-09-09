import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { runBrowser } from './browser';

const port = 4189;
const url = `http://127.0.0.1:${port}/`;
let preview: ReturnType<typeof Bun.spawn>;

type Reading = { text: string; links: string[]; canvasCount: number; language: string | null; status: string | null };
type FaultReading = Reading & {
  openDialogs: number;
  statusInDialog: boolean;
  statusFullyInViewport: boolean;
  statusTopmost: boolean;
  moveOrTalkEnabled: boolean;
  screenshotBytes: number;
};
type ContextFault = {
  viewport: { width: number; height: number };
  openedReader: 'dialogue' | 'overview';
  pageBeforeLoss: string | null;
  extension: string;
  en: FaultReading;
  zh: FaultReading;
};
type Result = {
  loading: Reading;
  loaded: Reading;
  moduleFailure: Reading;
  moduleFailureZh: Reading;
  webglFailure: Reading;
  contextFailure: Reading;
  contextFaults: ContextFault[];
  recovered: Reading;
  resized: { sameCanvas: boolean; page: string | null; promptAfterClose: boolean };
  requests: string[];
};
let result: Result;

const observe = String.raw`(() => {
  const dialog = document.querySelector('dialog[open], [role="dialog"]');
  return {
    text: dialog?.innerText || document.body.innerText,
    links: [...(dialog?.querySelectorAll('a') || [])].map(a => a.href),
    canvasCount: document.querySelectorAll('canvas').length,
    language: [...document.querySelectorAll('button')].find(button => /^(Language|语言)$/.test(button.getAttribute('aria-label') || ''))?.getAttribute('aria-label') || null,
    status: document.querySelector('[role="status"], [role="alert"]')?.textContent?.trim() || null,
  };
})()`;

beforeAll(async () => {
  preview = Bun.spawn(['bun', 'run', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: new URL('../', import.meta.url).pathname,
    stdout: 'pipe', stderr: 'pipe',
  });
  for (let attempt = 0; attempt < 50; attempt++) {
    try { if ((await fetch(url)).ok) break; } catch {}
    if (attempt === 49) throw new Error('Static preview did not become ready');
    await Bun.sleep(100);
  }

  result = await runBrowser<Result>(`
    const task = await useOrCreateTaskSpace('hd2d-portfolio-static-delivery')
    await openOrReuseTab(${JSON.stringify(url)}, { wait: true, timeout: 20 })
    await cdp('Network.enable')
    await cdp('Network.setCacheDisabled', { cacheDisabled: true })
    await cdp('Fetch.enable', { patterns: [{ urlPattern: '*WorldViewport*', requestStage: 'Request' }] })
    const paused = async () => {
      for (let i = 0; i < 80; i++) {
        for (const event of await drainEvents()) {
          if (event.method !== 'Fetch.requestPaused') continue
          if (/\\.js(?:\\?|$)/.test(event.params.request.url)) return event
          await cdp('Fetch.continueRequest', { requestId: event.params.requestId })
        }
        await wait(0.05)
      }
      throw new Error('Actual WorldViewport JavaScript chunk was not requested')
    }
    const read = async () => await js(${JSON.stringify(observe)})
    const readFault = async () => {
      const frame = await js(String.raw\`(() => {
        const dialogs = [...document.querySelectorAll('dialog[open], [role="dialog"]')]
          .filter((element, index, all) => all.indexOf(element) === index);
        const dialog = dialogs[0] || null;
        const status = document.querySelector('[role="alert"]');
        const rect = status?.getBoundingClientRect();
        const hit = rect ? document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) : null;
        const style = status ? getComputedStyle(status) : null;
        const activeInputs = [...document.querySelectorAll('button')].filter(button => {
          const label = button.getAttribute('aria-label') || '';
          return /^(Move left|Move right|Talk|View|向左|向右|交谈|查看)$/.test(label) && !button.disabled
            && button.getAttribute('aria-disabled') !== 'true';
        });
        return {
          text: dialog?.innerText || '',
          links: [...(dialog?.querySelectorAll('a') || [])].map(a => a.href),
          canvasCount: document.querySelectorAll('canvas').length,
          language: [...(dialog?.querySelectorAll('button') || [])].find(button => /^(Language|语言)$/.test(button.getAttribute('aria-label') || ''))?.getAttribute('aria-label') || null,
          status: status?.textContent?.trim() || null,
          openDialogs: dialogs.length,
          statusInDialog: !!(dialog && status && dialog.contains(status)),
          statusFullyInViewport: !!(rect && style && style.display !== 'none' && style.visibility !== 'hidden'
            && style.opacity !== '0' && rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.left >= 0
            && rect.right <= innerWidth && rect.bottom <= innerHeight),
          statusTopmost: !!(status && hit && status.contains(hit)),
          moveOrTalkEnabled: activeInputs.length > 0,
        };
      })()\`)
      const { data } = await cdp('Page.captureScreenshot', { format: 'png' })
      frame.screenshotBytes = data.length
      return frame
    }
    const clickLanguage = async () => {
      await js(String.raw\`(() => { const b=[...document.querySelectorAll('dialog[open] button')].find(e=>/^(Back to town|返回城镇)$/.test(e.getAttribute('aria-label')||''));if(!b)throw Error('Close fault reading unavailable');b.click() })()\`)
      await wait(.2)
      const activated = await js(String.raw\`(() => { const b = [...document.querySelectorAll('.town-header button')].find(e => /^(Language|语言)$/.test(e.getAttribute('aria-label') || '')); if (!b) return false; b.click(); return true })()\`)
      if (!activated) throw new Error('Homepage language control unavailable')
      await wait(0.2)
      await clickOverview()
    }
    const clickOverview = async () => {
      const button = await js(String.raw\`(() => { const b = [...document.querySelectorAll('button')].find(e => /Quick overview|资料速览/.test(e.getAttribute('aria-label') || '')); if (!b) return null; const r=b.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2] })()\`)
      if (!button) throw new Error('Overview control unavailable while loading')
      await click(button); await wait(0.2)
    }
    const navigateAndPause = async suffix => {
      await gotoUrl(${JSON.stringify(url)} + suffix)
      const event = await paused()
      return event
    }
    try {
      let event = await navigateAndPause('?loading')
      await clickOverview()
      const loading = await read()
      await cdp('Fetch.continueRequest', { requestId: event.params.requestId })
      await cdp('Fetch.disable')
      await wait(1)
      const loaded = await read()

      await js(String.raw\`(() => document.querySelector('dialog[open] button[aria-label="Back to town"]')?.click())()\`)
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, mobile: false, deviceScaleFactor: 1 })
      await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
      let reachedPrompt = false
      for (let i = 0; i < 40; i++) {
        await wait(0.2)
        reachedPrompt = await js(String.raw\`!![...document.querySelectorAll('button')].find(button => /^(Talk|交谈)$/.test(button.getAttribute('aria-label') || ''))\`)
        if (reachedPrompt) break
      }
      await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
      if (!reachedPrompt) throw new Error('Talk prompt not reached during resize setup')
      await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'e', code: 'KeyE', windowsVirtualKeyCode: 69 })
      await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'e', code: 'KeyE', windowsVirtualKeyCode: 69 })
      await wait(0.3)
      await js(String.raw\`(() => document.querySelector('dialog[open] button[aria-label="Next page"]')?.click())()\`)
      const { root: beforeRoot } = await cdp('DOM.getDocument')
      const { nodeId: beforeCanvas } = await cdp('DOM.querySelector', { nodeId: beforeRoot.nodeId, selector: 'canvas' })
      const { node: beforeNode } = await cdp('DOM.describeNode', { nodeId: beforeCanvas })
      await cdp('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, mobile: true, deviceScaleFactor: 1 })
      await wait(0.2)
      await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, mobile: true, deviceScaleFactor: 1 })
      await wait(0.2)
      const { root: afterRoot } = await cdp('DOM.getDocument')
      const { nodeId: afterCanvas } = await cdp('DOM.querySelector', { nodeId: afterRoot.nodeId, selector: 'canvas' })
      const { node: afterNode } = await cdp('DOM.describeNode', { nodeId: afterCanvas })
      const page = await js(String.raw\`document.querySelector('dialog[open] [aria-current="page"]')?.textContent?.trim() || null\`)
      await js(String.raw\`(() => document.querySelector('dialog[open] button[aria-label="Close introduction"]')?.click())()\`)
      const promptAfterClose = await js(String.raw\`!![...document.querySelectorAll('button')].find(button => /^(Talk|交谈)$/.test(button.getAttribute('aria-label') || ''))\`)
      const resized = { sameCanvas: beforeNode.backendNodeId === afterNode.backendNodeId, page, promptAfterClose }

      await cdp('Fetch.enable', { patterns: [{ urlPattern: '*WorldViewport*', requestStage: 'Request' }] })
      event = await navigateAndPause('?module-failure')
      const failedUrl = event.params.request.url
      await cdp('Network.setBlockedURLs', { urls: [failedUrl] })
      await cdp('Fetch.failRequest', { requestId: event.params.requestId, errorReason: 'Aborted' })
      await cdp('Fetch.disable')
      await wait(1)
      const moduleFailure = await read()
      await clickLanguage()
      const moduleFailureZh = await read()

      await cdp('Network.setBlockedURLs', { urls: [] })
      await cdp('Page.addScriptToEvaluateOnNewDocument', { source: String.raw\`
        if (location.search.includes('webgl-failure')) {
          const native = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function(type, ...args) {
            return /webgl/i.test(String(type)) ? null : native.call(this, type, ...args);
          };
        }
      \` })
      await gotoAndWait(${JSON.stringify(url)} + '?webgl-failure', { timeout: 20, settle: 1 })
      const webglFailure = await read()

      const contextFaults = []
      const viewports = [
        { width: 1440, height: 900, mobile: false },
        { width: 390, height: 844, mobile: true },
        { width: 844, height: 390, mobile: true },
      ]
      const press = async (type, key, code, windowsVirtualKeyCode) =>
        await cdp('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode })
      const openReader = async kind => {
        if (kind === 'overview') {
          await clickOverview()
          return null
        }
        await press('keyDown', 'ArrowRight', 'ArrowRight', 39)
        let prompt = false
        for (let i = 0; i < 48; i++) {
          await wait(0.2)
          prompt = await js(String.raw\`!![...document.querySelectorAll('button')].find(button => /^(Talk|交谈)$/.test(button.getAttribute('aria-label') || ''))\`)
          if (prompt) break
        }
        await press('keyUp', 'ArrowRight', 'ArrowRight', 39)
        if (!prompt) throw new Error('Talk prompt not reached before real context loss')
        await press('keyDown', 'e', 'KeyE', 69); await press('keyUp', 'e', 'KeyE', 69)
        await wait(0.2)
        const next = await js(String.raw\`(() => { const b=document.querySelector('dialog[open] button[aria-label="Next page"]'); if (!b) return false; b.click(); return true })()\`)
        if (!next) throw new Error('NPC dialogue did not open before real context loss')
        await wait(0.2)
        return await js(String.raw\`document.querySelector('dialog[open] [aria-current="page"]')?.textContent?.trim() || null\`)
      }
      const loseRealContext = async () => await js(String.raw\`(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) throw new Error('normal world canvas missing');
        const gl = canvas.getContext('webgl2');
        if (!gl) throw new Error('live WebGL2 context unavailable');
        const extension = gl.getExtension('WEBGL_lose_context');
        if (!extension) throw new Error('WEBGL_lose_context unavailable');
        extension.loseContext();
        return 'WEBGL_lose_context.loseContext';
      })()\`)
      for (const viewport of viewports) {
        await cdp('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1 })
        await cdp('Emulation.setTouchEmulationEnabled', { enabled: viewport.mobile })
        for (const openedReader of ['dialogue', 'overview']) {
          await gotoAndWait(${JSON.stringify(url)} + '?real-context-loss=' + openedReader + '-' + viewport.width, { timeout: 20, settle: 1 })
          const pageBeforeLoss = await openReader(openedReader)
          const extension = await loseRealContext()
          await wait(0.6)
          const en = await readFault()
          await clickLanguage()
          const zh = await readFault()
          contextFaults.push({ viewport, openedReader, pageBeforeLoss, extension, en, zh })
        }
      }
      const contextFailure = contextFaults[0].en
      await cdp('Emulation.setTouchEmulationEnabled', { enabled: false })
      await cdp('Emulation.clearDeviceMetricsOverride')
      await gotoAndWait(${JSON.stringify(url)} + '?recovered', { timeout: 20, settle: 1 })
      const recovered = await read()
      const requests = (await cdp('Performance.getMetrics').catch(() => ({ metrics: [] })), await js('performance.getEntriesByType("resource").map(entry => entry.name)'))
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ loading, loaded, moduleFailure, moduleFailureZh, webglFailure, contextFailure, contextFaults, recovered, resized, requests }))
    } finally {
      await cdp('Fetch.disable').catch(() => {})
      await cdp('Network.setCacheDisabled', { cacheDisabled: false })
      await completeTaskSpace(task.id, { keep: false })
    }
  `);
}, 90_000);

afterAll(() => { preview?.kill(); });

const expectedLinks = [
  'https://0xbb.me/', 'https://github.com/0xBB2B/0xbb.me',
  'https://github.com/0xBB2B/bb-spec', 'https://pi.dev/packages/@0xbb2b/pi-subagent-cluster',
  'https://github.com/0xBB2B/pi-subagent-cluster', 'https://github.com/0xBB2b',
  'https://www.linkedin.com/in/0xbb2b', 'https://juejin.cn/user/1037558235795032', 'mailto:bb@yorha.xyz',
];

function expectCompleteReading(frame: Reading) {
  expect(frame.text).toMatch(/FUBUKI_BB/);
  for (const skill of [/AI Agent|AI 智能体/, /Golang/, /Docker\/k8s/, /Game Publishing SDK|游戏发行 SDK/, /Payment Platforms|支付平台/]) {
    expect(frame.text).toMatch(skill);
  }
  expect(frame.text).not.toMatch(/\b(?:level|rating|score)\b|等级|评级|评分|\d+\s*%|\b(?:999|99|90|85)\b/i);
  for (const project of ['0xbb.me', 'bb-spec', 'pi-subagent-cluster']) expect(frame.text).toContain(project);
  for (const contact of ['GitHub', 'LinkedIn', 'Juejin', 'Email']) expect(frame.text).toContain(contact);
  expect(new Set(frame.links)).toEqual(new Set(expectedLinks));
}

describe('static M1 delivery and graphics fault reading', () => {
  test('graphics-runtime/AC-1: loading is explicit and the complete overview opens before the world chunk completes', () => {
    expect(result.loading.status).toMatch(/Loading graphics|正在加载图形/);
    expectCompleteReading(result.loading);
    expect(result.loaded.canvasCount).toBe(1);
  });

  test('graphics-runtime/AC-2, bilingual/AC-4 and profile-overview/AC-6: actual chunk failure keeps complete bilingual material and links', () => {
    expect(result.moduleFailure.status).toMatch(/Graphics unavailable/);
    expectCompleteReading(result.moduleFailure);
    expect(result.moduleFailureZh.status).toMatch(/图形不可用/);
    expectCompleteReading(result.moduleFailureZh);
    expect(result.moduleFailureZh.links).toEqual(result.moduleFailure.links);
  });

  test('graphics-runtime/AC-2: WebGL initialization failure does not leave loading or a blank page', () => {
    expect(result.webglFailure.canvasCount).toBe(0);
    expect(result.webglFailure.status).toMatch(/Graphics unavailable/);
    expectCompleteReading(result.webglFailure);
  });

  test('graphics-runtime/AC-3: real runtime context loss leaves one visible bilingual reading window in all three viewports', () => {
    expect(result.contextFaults).toHaveLength(6);
    for (const fault of result.contextFaults) {
      expect(fault.extension).toBe('WEBGL_lose_context.loseContext');
      if (fault.openedReader === 'dialogue') expect(fault.pageBeforeLoss).toBe('2 / 3');
      for (const [language, frame] of [['en', fault.en], ['zh', fault.zh]] as const) {
        expect(frame.canvasCount, `${fault.viewport.width}×${fault.viewport.height} ${fault.openedReader} ${language}: exploration stopped`).toBe(0);
        expect(frame.openDialogs, `${fault.viewport.width}×${fault.viewport.height} ${fault.openedReader} ${language}: one reading window`).toBe(1);
        expect(frame.moveOrTalkEnabled, `${fault.viewport.width}×${fault.viewport.height} ${fault.openedReader} ${language}: controls stopped`).toBe(false);
        expect(frame.statusInDialog, `${fault.viewport.width}×${fault.viewport.height} ${fault.openedReader} ${language}: fault belongs to active reading window`).toBe(true);
        expect(frame.statusFullyInViewport, `${fault.viewport.width}×${fault.viewport.height} ${fault.openedReader} ${language}: fault is inside viewport`).toBe(true);
        expect(frame.statusTopmost, `${fault.viewport.width}×${fault.viewport.height} ${fault.openedReader} ${language}: fault is not covered`).toBe(true);
        expect(frame.screenshotBytes).toBeGreaterThan(1_000);
        expectCompleteReading(frame);
      }
      expect(fault.en.status).toMatch(/Graphics unavailable/);
      expect(fault.zh.status).toMatch(/图形不可用/);
      expect(fault.zh.links).toEqual(fault.en.links);
    }
    expect(result.recovered.canvasCount).toBe(1);
    expect(result.recovered.text).toMatch(/Dusk town|A little town/);
    expect(result.recovered.text).not.toMatch(/黄昏小镇|Talk|交谈/);
  });

  test('responsive-layout/AC-4: resizing and phone rotation preserve the canvas, position and non-first dialogue page', () => {
    expect(result.resized.sameCanvas).toBe(true);
    expect(result.resized.page).toBe('2 / 3');
    expect(result.resized.promptAfterClose).toBe(true);
  });

  test('site-entry/AC-3/AC-5/AC-6: only the confirmed HTML persona portrait is requested, not bitmap world assets', () => {
    expect(result.requests.some(request => /WorldViewport[^/]*\.js(?:\?|$)/.test(request))).toBe(true);
    expect(result.requests).not.toContain('http://127.0.0.1:4189/game/');
    for (const image of result.requests.filter(request => /\.(?:png|jpe?g|gif|webp|bmp|avif)(?:[?#]|$)/i.test(request))) {
      expect(new URL(image).pathname).toBe('/profile-full.png');
    }
  });
});
