// 依赖 dist/ 为最新构建产物：运行前先执行 `bun run build`，本文件不重复构建。
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { preview, type PreviewServer } from 'vite';
import { runBrowser } from './browser';

const ROOT = path.resolve(import.meta.dir, '..');
const PORT = 4201;
const BASE_URL = `http://127.0.0.1:${PORT}/`;

const indexHtml = readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');

function listDistFiles(extensions: string[]): string[] {
  return readdirSync(path.join(ROOT, 'dist'), { recursive: true })
    .map((entry) => entry.toString())
    .filter((entry) => extensions.some((ext) => entry.endsWith(ext)));
}

test('README 描述雨夜便利店站点的玩法', () => {
  const readme = readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  expect(readme).toContain('雨夜便利店');
  expect(readme).toContain('铭牌');
  expect(readme).toContain('资料视角');
  expect(readme).toContain('先看资料');
});

test('dist/index.html 不引用外部域名的脚本或样式表', () => {
  const scriptSrcs = [...indexHtml.matchAll(/<script[^>]*\ssrc="([^"]+)"/gi)].map((match) => match[1]);
  const styleHrefs = [...indexHtml.matchAll(/<link[^>]*\srel="stylesheet"[^>]*\shref="([^"]+)"/gi)].map((match) => match[1]);
  expect(scriptSrcs.length + styleHrefs.length).toBeGreaterThan(0);
  for (const url of [...scriptSrcs, ...styleHrefs]) {
    expect(url).not.toMatch(/^https?:\/\//i);
    expect(url).not.toMatch(/^\/\//);
  }
});

test('构建产物不残留测试钩子字符串', () => {
  const files = listDistFiles(['.html', '.js']);
  expect(files.length).toBeGreaterThan(0);
  for (const relativePath of files) {
    const content = readFileSync(path.join(ROOT, 'dist', relativePath), 'utf8');
    expect(content).not.toContain('PLAYABLE_TOWN_RESULT');
    expect(content).not.toContain('__test');
  }
});

describe('整体视角画面', () => {
  let server: PreviewServer;

  beforeAll(async () => {
    server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: PORT, strictPort: true } });
  });

  afterAll(async () => {
    await server.close();
  });

  test('除铭牌外没有可见的文字界面元素', async () => {
    const result = await runBrowser<{ view: string | null; visibleTextElements: Array<{ tag: string; text: string }> }>(`
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await navigate(${JSON.stringify(BASE_URL)});
      const deadline = Date.now() + 40000;
      while (Date.now() < deadline) {
        if (await js("document.documentElement.dataset.view === 'diorama' && document.querySelector('#scene')?.getAttribute('aria-busy') === 'false'")) break;
        await wait(0.2);
      }
      await js('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      const visibleTextElements = await js(\`(() => {
        function isAncestorHiddenOrInert(el) {
          let node = el.parentElement;
          while (node) {
            if (node.hasAttribute('inert') || node.hasAttribute('hidden')) return true;
            node = node.parentElement;
          }
          return false;
        }
        const results = [];
        for (const el of document.querySelectorAll('body *')) {
          if (el.tagName === 'CANVAS') continue;
          if (el.classList.contains('enter-story-button') && document.activeElement !== el) continue;
          const hasDirectText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
          if (!hasDirectText) continue;
          if (el.hasAttribute('inert') || el.hasAttribute('hidden') || isAncestorHiddenOrInert(el)) continue;
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          const visible = rect.width > 0 && rect.height > 0 && Number(style.opacity) > 0 && style.visibility !== 'hidden' && style.display !== 'none';
          if (!visible) continue;
          results.push({ tag: el.tagName, text: el.textContent.trim().slice(0, 80) });
        }
        return results;
      })()\`);
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ view: await js('document.documentElement.dataset.view ?? null'), visibleTextElements }));
    `);
    expect(result.view).toBe('diorama');
    expect(result.visibleTextElements).toEqual([]);
  }, 90_000);
});
