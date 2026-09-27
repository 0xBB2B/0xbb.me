// 依赖 dist/ 为最新构建产物：运行前先执行 `bun run build`，本文件不重复构建。
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import path from 'node:path';
import { preview, type PreviewServer } from 'vite';
import { runBrowser } from './browser';
import { percentile95 } from '../diorama/quality';

const ROOT = path.resolve(import.meta.dir, '..');
const PORT = 4204;
const BASE_URL = `http://127.0.0.1:${PORT}/`;

let server: PreviewServer;

beforeAll(async () => {
  server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: PORT, strictPort: true } });
});

afterAll(async () => {
  await server.close();
});

describe('整体视角持续旋转 30 秒的帧率', () => {
  test('95% 帧间隔不超过 33.4 毫秒，且 data-quality 全程保持 high', async () => {
    const result = await runBrowser<{ view: string | null; intervals: number[]; qualities: Array<string | null> }>(`
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await navigate(${JSON.stringify(BASE_URL)});
      const readyDeadline = Date.now() + 40000;
      while (Date.now() < readyDeadline) {
        if (await js("document.documentElement.dataset.view === 'diorama' && document.querySelector('#scene')?.getAttribute('aria-busy') === 'false'")) break;
        await wait(0.2);
      }
      await js('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      await js(\`(() => {
        window.__frameTimes = [];
        function tick(t) {
          window.__frameTimes.push(t);
          requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      })()\`);
      const startX = 1100, startY = 150;
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: startX, y: startY });
      await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: startX, y: startY, button: 'left', buttons: 1, clickCount: 1 });
      const durationMs = 30000;
      const start = Date.now();
      let lastSample = start;
      let x = startX;
      let dir = 1;
      const qualities = [];
      while (Date.now() - start < durationMs) {
        x += dir * 4;
        if (x > startX + 120) dir = -1;
        if (x < startX - 120) dir = 1;
        await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y: startY, buttons: 1 });
        if (Date.now() - lastSample >= 1000) {
          qualities.push(await js('document.documentElement.dataset.quality ?? null'));
          lastSample = Date.now();
        }
        await wait(0.016);
      }
      await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y: startY, button: 'left', buttons: 0, clickCount: 1 });
      const frameTimes = await js('window.__frameTimes');
      const intervals = [];
      for (let i = 1; i < frameTimes.length; i++) intervals.push(frameTimes[i] - frameTimes[i - 1]);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view: await js('document.documentElement.dataset.view ?? null'), intervals, qualities }));
    `);
    expect(result.view).toBe('diorama');
    expect(result.intervals.length).toBeGreaterThan(0);
    expect(percentile95(result.intervals)).toBeLessThanOrEqual(33.4);
    expect(result.qualities.length).toBeGreaterThan(0);
    expect(result.qualities.every((quality) => quality === 'high')).toBe(true);
  }, 90_000);
});
