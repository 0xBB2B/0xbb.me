import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { APP_DATA } from '../data';

const root = path.resolve(import.meta.dir, '..');
const html = readFileSync(path.resolve(root, 'dist/index.html'), 'utf8');
const withoutScripts = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
const bodyMatch = withoutScripts.match(/<body[^>]*>([\s\S]*)<\/body>/i);
const staticBody = bodyMatch ? bodyMatch[1] : '';

describe('加载页是静态标记，不执行脚本就可见', () => {
  test('加载页样式内联在 <head>，且早于打包出来的样式表', () => {
    const styleIndex = html.indexOf('<style data-shell-styles>');
    const headEndIndex = html.indexOf('</head>');
    expect(styleIndex).toBeGreaterThan(-1);
    expect(styleIndex).toBeLessThan(headEndIndex);
    expect(html.slice(styleIndex, html.indexOf('</style>', styleIndex))).toContain('.loading-shell');
    const bundledCss = html.search(/<link[^>]*rel="stylesheet"[^>]*href="\.\/assets\/[^"]+\.css"/);
    expect(bundledCss).toBeGreaterThan(-1);
    expect(styleIndex).toBeLessThan(bundledCss);
  });

  test('字符编码在前 1024 字节内声明', () => {
    expect(Buffer.from(html).subarray(0, 1024).toString('utf8')).toMatch(/<meta charset="UTF-8"/i);
  });

  test('页面标题正确', () => {
    expect(html).toMatch(/<title>FUBUKI_BB — Engineering, AI Workflows &(?:amp;)? Exploration<\/title>/);
  });

  test('名字 FUBUKI_BB 不执行脚本就在 body 里', () => {
    expect(staticBody).toContain('FUBUKI_BB');
  });

  test('状态文字 Loading code… 带 role=status 与 aria-live=polite', () => {
    let ariaLive: string | null = null;
    let statusText = '';
    new HTMLRewriter()
      .on('[role="status"]', {
        element(element) { ariaLive = element.getAttribute('aria-live'); },
        text(chunk) { statusText += chunk.text; },
      })
      .transform(staticBody);
    expect(ariaLive).toBe('polite');
    expect(statusText).toContain('Loading code…');
  });

  test('「先看资料」是指向 ./profile/ 的链接，不是按钮', () => {
    const links: Array<{ href: string | null; text: string }> = [];
    let buttons = 0;
    new HTMLRewriter()
      .on('a.loading-shell-button', {
        element(element) { links.push({ href: element.getAttribute('href'), text: '' }); },
        text(chunk) { links[links.length - 1].text += chunk.text; },
      })
      .on('button', { element() { buttons++; } })
      .transform(staticBody);
    expect(links).toEqual([{ href: './profile/', text: 'Read the profile first' }]);
    expect(buttons).toBe(0);
  });
});

describe('首页不再内嵌个人资料', () => {
  test('不含简介第一段英文正文', () => {
    expect(html).not.toContain(APP_DATA.profile.bio.en);
  });

  test('不含 data-static-profile', () => {
    expect(html).not.toContain('data-static-profile');
  });

  test('body 里没有 hidden 元素', () => {
    let hidden = 0;
    new HTMLRewriter().on('[hidden]', { element() { hidden++; } }).transform(staticBody);
    expect(hidden).toBe(0);
  });

  test('description 提示点铜牌看小票，不提 scroll', () => {
    const match = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/);
    expect(match?.[1]).toBe(
      'FUBUKI_BB — full-stack engineer and AI agent developer. Explore a rainy-night Tokyo convenience store diorama, then tap the brass plaque to read the profile receipt.',
    );
    expect(match![1]).not.toMatch(/scroll/i);
  });
});

test('dist/index.html 不出现 playable / walk / lighthouse / 灯塔', () => {
  expect(html).not.toMatch(/playable|walk|lighthouse|灯塔/i);
});

test('dist/index.html 不从外部域名加载脚本或样式表', () => {
  const scriptSrcs = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/gi)].map((match) => match[1]);
  const styleHrefs = [...html.matchAll(/<link[^>]*\srel="stylesheet"[^>]*\shref="([^"]+)"/gi)].map((match) => match[1]);
  for (const src of [...scriptSrcs, ...styleHrefs]) {
    expect(src).not.toMatch(/^https?:\/\//i);
  }
});

test('public/THIRD_PARTY_NOTICES.txt 第一行是雨夜便利店作品集标题', () => {
  const notices = readFileSync(path.resolve(root, 'public/THIRD_PARTY_NOTICES.txt'), 'utf8');
  expect(notices.split('\n')[0]).toBe('0xbb.me — Rainy Konbini Portfolio');
});

test('首屏入口脚本不含 three.js 渲染器（三维代码只在动态分块里）', () => {
  const entry = html.match(/<script[^>]+type="module"[^>]+src="\.?\/?([^"]+)"/);
  expect(entry).not.toBeNull();
  const code = readFileSync(path.resolve(root, 'dist', entry![1]), 'utf8');
  expect(code).not.toContain('WebGLRenderer');
});
