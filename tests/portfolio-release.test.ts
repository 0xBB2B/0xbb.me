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
