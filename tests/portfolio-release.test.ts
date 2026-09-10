import { expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');

test('release documentation describes the actual MC-2D journey, controls, outfit surprise and static workflow', () => {
  const text = read('README.md');
  for (const word of ['MC-2D', 'Shift', '切换服装', '新服装真好看', '1 秒', '资料速览', 'WebGL2',
    'bun install --frozen-lockfile', 'bun run dev', 'bun test', 'bun run build', 'bun run preview', 'profile-full.png', '33.4', 'MIT']) expect(text).toContain(word);
  expect(text).not.toMatch(/Tactical HUD|RHYTHM_BLADE|节奏光剑玩法|motion\/react|Tailwind CSS（CDN）/i);
});

test('production artifacts contain only the selected entry and no reference pages, game or browser test hooks', () => {
  expect(existsSync(path.join(root, 'dist/index.html'))).toBe(true);
  for (const item of ['game', 'design-reference', 'tests', 'music.ogg']) expect(existsSync(path.join(root, 'dist', item))).toBe(false);
  for (const image of ['profile-full.png', 'profile.png', 'profile.jpg']) {
    expect(readFileSync(path.join(root, 'dist', image)).equals(readFileSync(path.join(root, 'public', image)))).toBe(true);
  }
  const sources = readdirSync(path.join(root, 'dist/assets')).filter(name => name.endsWith('.js')).map(name => read(`dist/assets/${name}`)).join('\n');
  expect(sources).toContain('MC-2D');
  expect(sources).toContain('Switch outfit');
  expect(sources).toContain('新服装真好看');
  expect(sources).not.toMatch(/BeatSaberGame|RHYTHM_BLADE|music\.ogg|__mc2dFrames|__bobCheck|__appearanceCheck|ego-browser/);
  expect(read('dist/index.html')).not.toMatch(/https?:\/\/[^"']+\.(?:js|css)["']/);
  const notices = read('dist/THIRD_PARTY_NOTICES.txt');
  expect(notices).toBe(read('public/THIRD_PARTY_NOTICES.txt'));
  for (const text of ['Meta Platforms', 'three.js authors', 'Permission is hereby granted', 'Copyright (c) 2025 BB']) expect(notices).toContain(text);
});

test('production HTML advertises the published profile JPEG before JavaScript runs', () => {
  const html = read('dist/index.html');
  const meta = new Map<string, string>();
  new HTMLRewriter().on('meta', {
    element(element) {
      const key = element.getAttribute('property') ?? element.getAttribute('name');
      if (key) meta.set(key, element.getAttribute('content') ?? '');
    },
  }).transform(html);
  expect(meta.get('og:image')).toBe('https://0xbb.me/profile.jpg');
  expect(meta.get('twitter:image')).toBe('https://0xbb.me/profile.jpg');
  expect(meta.get('robots')).toBe('index, follow, max-image-preview:large');
  expect(html).not.toContain('site-card.svg');
  expect(readFileSync(path.join(root, 'dist/profile.jpg')).equals(readFileSync(path.join(root, 'public/profile.jpg')))).toBe(true);
});

test('production font rules and preloads resolve to bundled WOFF2 assets with their license', () => {
  const css = readdirSync(path.join(root, 'dist/assets')).filter(name => name.endsWith('.css')).map(name => read(`dist/assets/${name}`)).join('\n');
  expect(css).toContain('Noto Sans SC Variable');
  expect(css).toContain('Noto Serif SC Variable');
  expect(css).toContain('unicode-range:');
  expect(css).not.toMatch(/node_modules|fonts\.googleapis|fonts\.gstatic|local\(/);
  const fonts = [...css.matchAll(/url\(["']?([^\s)"']+\.woff2)["']?\)/g)].map(match => match[1]);
  expect(fonts.length).toBeGreaterThan(2);
  for (const reference of fonts) {
    expect(reference).not.toMatch(/^(?:https?:|\/)/);
    const bytes = readFileSync(path.resolve(root, 'dist/assets', reference));
    expect(bytes.subarray(0, 4).toString()).toBe('wOF2');
  }
  const html = read('dist/index.html');
  const preloads = [...html.matchAll(/<link\b[^>]*rel="preload"[^>]*>/g)].map(match => match[0]);
  expect(preloads).toHaveLength(2);
  for (const preload of preloads) {
    const reference = preload.match(/href="([^"]+)"/)![1];
    expect(reference).toStartWith('./assets/');
    expect(reference).toContain('-latin-wght-normal-');
    expect(existsSync(path.resolve(root, 'dist', reference))).toBe(true);
  }
  expect(read('dist/THIRD_PARTY_NOTICES.txt')).toContain('SIL OPEN FONT LICENSE Version 1.1');
});
