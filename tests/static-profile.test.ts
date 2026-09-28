import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');
const html = readFileSync(path.resolve(root, 'dist/index.html'), 'utf8');
const withoutScripts = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
const bodyMatch = withoutScripts.match(/<body[^>]*>([\s\S]*)<\/body>/i);
const staticBody = bodyMatch ? bodyMatch[1] : '';

describe('the loading shell is static markup, visible before any script runs', () => {
  test('the loading shell stylesheet is inlined in <head> ahead of the bundled stylesheet', () => {
    const styleIndex = html.indexOf('<style data-shell-styles>');
    const headEndIndex = html.indexOf('</head>');
    expect(styleIndex).toBeGreaterThan(-1);
    expect(styleIndex).toBeLessThan(headEndIndex);
    expect(html.slice(styleIndex, html.indexOf('</style>', styleIndex))).toContain('.loading-shell');
    const bundledCss = html.search(/<link[^>]*rel="stylesheet"[^>]*href="\.\/assets\/[^"]+\.css"/);
    expect(bundledCss).toBeGreaterThan(-1);
    expect(styleIndex).toBeLessThan(bundledCss);
  });

  test('the character encoding is declared within the first 1024 bytes', () => {
    expect(Buffer.from(html).subarray(0, 1024).toString('utf8')).toMatch(/<meta charset="UTF-8"/i);
  });

  test('the built page carries its title', () => {
    expect(html).toMatch(/<title>FUBUKI_BB — Engineering, AI Workflows &(?:amp;)? Exploration<\/title>/);
  });

  test('the name FUBUKI_BB appears in the body without executing scripts', () => {
    expect(staticBody).toContain('FUBUKI_BB');
  });

  test('the status text announces "Loading code…" via role=status and aria-live=polite', () => {
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

  test('a button reads "Read the profile first"', () => {
    const buttonTexts: string[] = [];
    new HTMLRewriter()
      .on('button', {
        element() { buttonTexts.push(''); },
        text(chunk) { buttonTexts[buttonTexts.length - 1] += chunk.text; },
      })
      .transform(staticBody);
    expect(buttonTexts.some((text) => text.includes('Read the profile first'))).toBe(true);
  });
});

describe('the full English profile ships as static fallback content', () => {
  let hiddenText = '';
  const hiddenLinks: string[] = [];
  new HTMLRewriter()
    .on('[hidden]', { text(chunk) { hiddenText += chunk.text; } })
    .on('[hidden] a[href]', { element(element) { hiddenLinks.push(element.getAttribute('href') ?? ''); } })
    .transform(withoutScripts);

  const requiredTexts: Array<[string, string]> = [
    ['the name', 'FUBUKI_BB'],
    ['the Full Stack Engineer role', 'Full Stack Engineer'],
    ['the System Architect role', 'System Architect'],
    ['the AI Agent Developer role', 'AI Agent Developer'],
    ['the location line', 'Tokyo · Shanghai'],
    ['the "Still open on a rainy night" heading', 'Still open on a rainy night'],
    ["the \"Let's get going\" heading", "Let's get going"],
    ['the AI Workflows direction', 'AI Workflows'],
    ['the Scalable Backends direction', 'Scalable Backends'],
    ['the Game SDK Ecosystems direction', 'Game SDK Ecosystems'],
    ['the Payment Platforms direction', 'Payment Platforms'],
    [
      'the full English bio paragraph',
      'Behind every interface is a small promise: that someone can find their way, finish their work, or begin something new. This corner of the web brings together full-stack engineering, system architecture, and an ongoing exploration of AI workflows.',
    ],
  ];

  test.each(requiredTexts)('includes %s', (_label, text) => {
    expect(hiddenText.replaceAll('&#x27;', "'")).toContain(text);
  });

  const requiredLinks = [
    'https://github.com/0xBB2b',
    'https://www.linkedin.com/in/0xbb2b',
    'https://juejin.cn/user/1037558235795032',
    'mailto:bb@yorha.xyz',
  ];

  test.each(requiredLinks)('links to %s', (href) => {
    expect(hiddenLinks).toContain(href);
  });
});

test('dist/index.html never mentions the retired playable/lighthouse framing', () => {
  expect(html).not.toMatch(/playable|walk|lighthouse|灯塔/i);
});

test('dist/index.html loads no scripts or stylesheets from external domains', () => {
  const scriptSrcs = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/gi)].map((match) => match[1]);
  const styleHrefs = [...html.matchAll(/<link[^>]*\srel="stylesheet"[^>]*\shref="([^"]+)"/gi)].map((match) => match[1]);
  for (const src of [...scriptSrcs, ...styleHrefs]) {
    expect(src).not.toMatch(/^https?:\/\//i);
  }
});

test('dist/sitemap.xml lists only the homepage', () => {
  const sitemap = readFileSync(path.resolve(root, 'dist/sitemap.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(locs).toEqual(['https://0xbb.me/']);
});

test('public/THIRD_PARTY_NOTICES.txt opens with the rainy konbini portfolio title', () => {
  const notices = readFileSync(path.resolve(root, 'public/THIRD_PARTY_NOTICES.txt'), 'utf8');
  expect(notices.split('\n')[0]).toBe('0xbb.me — Rainy Konbini Portfolio');
});

test('首屏入口脚本不含 three.js 渲染器（三维代码只在动态分块里）', () => {
  const entry = html.match(/<script[^>]+type="module"[^>]+src="\.?\/?([^"]+)"/);
  expect(entry).not.toBeNull();
  const code = readFileSync(path.resolve(root, 'dist', entry![1]), 'utf8');
  expect(code).not.toContain('WebGLRenderer');
});
