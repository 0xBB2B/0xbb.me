// 依赖 dist/ 为最新构建产物：运行前先执行 `bun run build`，本文件不重复构建。
import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { APP_DATA } from '../data';

const root = path.resolve(import.meta.dir, '..');
const readDist = (file: string) => {
  const target = path.resolve(root, 'dist', file);
  return existsSync(target) ? readFileSync(target, 'utf8') : '';
};

const profileHtml = readDist('profile/index.html');
const homeHtml = readDist('index.html');
const sitemap = readDist('sitemap.xml');

const decodeEntities = (text: string) =>
  text
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');

const visibleText = decodeEntities(
  profileHtml
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' '),
).replace(/\s+/g, ' ');

const metaContent = (html: string, attribute: string, name: string) =>
  html.match(new RegExp(`<meta[^>]*\\s${attribute}="${name}"[^>]*\\scontent="([^"]*)"`, 'i'))?.[1];

const iconHref = (html: string) => html.match(/<link[^>]*\srel="icon"[^>]*\shref="([^"]+)"/i)?.[1];

describe('dist/profile/index.html 是独立资料页的构建产物', () => {
  test('文件存在', () => {
    expect(existsSync(path.resolve(root, 'dist/profile/index.html'))).toBe(true);
  });

  test('title 为 FUBUKI_BB — Profile', () => {
    expect(profileHtml).toContain('<title>FUBUKI_BB — Profile</title>');
  });

  test('canonical 指向 https://0xbb.me/profile/', () => {
    expect(profileHtml).toMatch(/<link[^>]*\srel="canonical"[^>]*\shref="https:\/\/0xbb\.me\/profile\/"/);
  });

  test('description 与首页相同且非空', () => {
    const description = metaContent(profileHtml, 'name', 'description');
    expect(description).toBeTruthy();
    expect(description).toBe(metaContent(homeHtml, 'name', 'description'));
  });

  test('og:image 与 twitter:image 都是 https://0xbb.me/profile.jpg', () => {
    expect(metaContent(profileHtml, 'property', 'og:image')).toBe('https://0xbb.me/profile.jpg');
    expect(metaContent(profileHtml, 'property', 'twitter:image') ?? metaContent(profileHtml, 'name', 'twitter:image')).toBe(
      'https://0xbb.me/profile.jpg',
    );
  });

  test('网站图标与首页是同一个文件，且独立页的相对路径以 ../ 开头', () => {
    const profileIcon = iconHref(profileHtml);
    expect(profileIcon).toBeTruthy();
    expect(profileIcon).toStartWith('../');
    expect(path.basename(profileIcon!)).toBe(path.basename(iconHref(homeHtml)!));
  });
});

describe('不执行脚本时小票内容已经写在 HTML 里', () => {
  const requiredTexts: Array<[string, string]> = [
    ['店名行', 'RAINY NIGHT · 24H'],
    ['名字', 'FUBUKI_BB'],
    ...APP_DATA.profile.roles.en.map((role): [string, string] => [`职位 ${role}`, role]),
    ['所在地', 'Tokyo · Shanghai'],
    ['英文简介第一段全文', APP_DATA.profile.bio.en],
    ...['AI Workflows', 'Scalable Backends', 'Game SDK Ecosystems', 'Payment Platforms'].map((direction): [string, string] => [`方向 ${direction}`, direction]),
  ];

  test.each(requiredTexts)('纯文本包含%s', (_label, text) => {
    expect(visibleText).toContain(text);
  });

  test.each([
    'https://github.com/0xBB2b',
    'https://www.linkedin.com/in/0xbb2b',
    'https://juejin.cn/user/1037558235795032',
    'mailto:bb@yorha.xyz',
  ])('链接 %s 写在 <a href> 里', (href) => {
    const hrefs = [...profileHtml.matchAll(/<a[^>]*\shref="([^"]+)"/gi)].map((match) => match[1]);
    expect(hrefs).toContain(href);
  });

  test('头像是普通 <img>', () => {
    expect(profileHtml).toMatch(/<img[^>]*\ssrc="[^"]*profile\.jpg"/i);
  });
});

describe('独立页不带三维场景', () => {
  const referencedScripts = () => {
    const scriptSrcs = [...profileHtml.matchAll(/<script[^>]*\ssrc="([^"]+)"/gi)].map((match) => match[1]);
    const preloads = [...profileHtml.matchAll(/<link[^>]*\srel="modulepreload"[^>]*\shref="([^"]+)"/gi)].map((match) => match[1]);
    return [...scriptSrcs, ...preloads];
  };

  test('页面确实引用了脚本（否则下面的检查没有意义）', () => {
    expect(referencedScripts().length).toBeGreaterThan(0);
  });

  test('引用的 JS 文件名都不以 world- 开头', () => {
    for (const src of referencedScripts()) {
      expect(path.basename(src)).not.toMatch(/^world-/);
    }
  });

  test('引用的 JS 文件内容不含 WebGLRenderer', () => {
    for (const src of referencedScripts()) {
      const file = path.resolve(root, 'dist/profile', src);
      expect(existsSync(file)).toBe(true);
      expect(readFileSync(file, 'utf8')).not.toContain('WebGLRenderer');
    }
  });

  test('HTML 里没有 <canvas>', () => {
    expect(profileHtml).not.toBe('');
    expect(profileHtml).not.toMatch(/<canvas/i);
  });

  test('没有外部域名的 <script src> 或 <link rel="stylesheet">', () => {
    const scriptSrcs = [...profileHtml.matchAll(/<script[^>]*\ssrc="([^"]+)"/gi)].map((match) => match[1]);
    const styleHrefs = [...profileHtml.matchAll(/<link[^>]*\srel="stylesheet"[^>]*\shref="([^"]+)"/gi)].map((match) => match[1]);
    expect(profileHtml).not.toBe('');
    for (const src of [...scriptSrcs, ...styleHrefs]) {
      expect(src).not.toMatch(/^(https?:)?\/\//i);
    }
  });
});

describe('sitemap 与静态资源', () => {
  test('sitemap.xml 恰好两个 <loc>：首页与 /profile/', () => {
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(locs).toEqual(['https://0xbb.me/', 'https://0xbb.me/profile/']);
  });

  test('dist/profile-full-print.jpg 存在', () => {
    expect(existsSync(path.resolve(root, 'dist/profile-full-print.jpg'))).toBe(true);
  });

  test.each([
    ['dist/index.html', homeHtml],
    ['dist/profile/index.html', profileHtml],
  ])('%s 不出现 playable / walk / lighthouse / 灯塔', (_name, html) => {
    expect(html).not.toBe('');
    expect(html).not.toMatch(/playable|walk|lighthouse|灯塔/i);
  });
});
