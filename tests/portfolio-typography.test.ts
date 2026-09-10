import { expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { APP_DATA } from '../data';
import { LIGHTHOUSE_COPY, SCENE_COPY, UI_COPY, npcPages } from '../portfolio/copy';

const read = (file: string) => readFileSync(path.resolve(import.meta.dir, '..', file), 'utf8');
const typography = read('typography.css');
const hud = read('components/portfolio/WorldViewport.css');
const families = ['noto-sans-sc', 'noto-serif-sc'];

function rule(css: string, selector: string) {
  const start = css.indexOf(`${selector} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf('}', start) + 1);
}

test('shared typography uses bundled variable fonts instead of installed platform fonts', () => {
  expect(typography).toContain('--font-sans: "Noto Sans SC Variable", sans-serif');
  expect(typography).toContain('--font-display: "Noto Serif SC Variable", serif');
  expect(typography).toContain('font-family: var(--font-sans)');
  expect(typography).toContain('font-synthesis: none');
  const dependencies = JSON.parse(read('package.json')).dependencies;
  for (const family of families) {
    expect(dependencies[`@fontsource-variable/${family}`]).toMatch(/^\d+\.\d+\.\d+$/);
    expect(typography).toContain(`@import "@fontsource-variable/${family}/wght.css"`);
    const face = read(`node_modules/@fontsource-variable/${family}/wght.css`);
    expect(face).toContain('unicode-range:');
    expect(face).toContain('font-display: swap');
    expect(face).not.toMatch(/local\(|https?:/);
    expect(read('public/THIRD_PARTY_NOTICES.txt')).toContain(read(`node_modules/@fontsource-variable/${family}/LICENSE`).trim());
  }
});

test('initial HTML loads the font rules and preloads only the two small Latin subsets', () => {
  const html = read('index.html');
  expect(html).toContain('rel="stylesheet" href="./typography.css"');
  expect(html.indexOf('./typography.css')).toBeLessThan(html.indexOf('</head>'));
  const preloads = [...html.matchAll(/<link rel="preload"[^>]+>/g)].map(match => match[0]);
  expect(preloads).toHaveLength(2);
  for (const preload of preloads) {
    expect(preload).toContain('-latin-wght-normal.woff2');
    expect(preload).toContain('as="font"');
    expect(preload).toContain('crossorigin');
  }
});

test('all UI font declarations use the shared sans and display families', () => {
  const files = readdirSync(path.resolve(import.meta.dir, '../components/portfolio')).filter(file => file.endsWith('.css'));
  for (const file of files) {
    const css = read(`components/portfolio/${file}`);
    expect(css, file).not.toMatch(/Georgia|Songti|PingFang|Segoe|YaHei|Consolas|IBM Plex|system-ui|monospace|--font-mono/);
    for (const match of css.matchAll(/(?:font|font-family):\s*([^;]+);/g)) {
      expect(match[1], file).toMatch(/var\(--font-(?:sans|display)\)|inherit/);
    }
  }
});

test('display text preserves the serif hierarchy in both languages', () => {
  expect(rule(typography, ':root')).toContain('--font-display-weight: 400');
  expect(rule(typography, ':root:lang(zh)')).toContain('--font-display-weight: 600');
  for (const [file, selector] of [
    ['WorldViewport', '.town-intro h1'], ['Dialogue', '.dialogue-content h2'],
    ['BoardDetails', '.board-details-content h2'], ['Overview', '.overview-content h3'],
    ['LoadingScreen', '.loading-content h1'],
  ]) {
    const heading = rule(read(`components/portfolio/${file}.css`), selector);
    expect(heading).toContain('var(--font-display-weight)');
    expect(heading).toContain('var(--font-display)');
  }
});

test('the bundled character ranges cover bilingual content and interface symbols', () => {
  const text = JSON.stringify([APP_DATA, UI_COPY, SCENE_COPY, LIGHTHOUSE_COPY, npcPages('greeter', 'en'), npcPages('greeter', 'zh')])
    + 'f. ↗ ◎ ⇄ ← → × · …';
  for (const family of families) {
    const css = read(`node_modules/@fontsource-variable/${family}/wght.css`);
    const ranges = [...css.matchAll(/U\+([0-9a-f]+)(?:-([0-9a-f]+))?/gi)].map(([, from, to]) => [parseInt(from, 16), parseInt(to ?? from, 16)]);
    const missing = [...new Set(text)].filter(char => {
      const point = char.codePointAt(0)!;
      return !ranges.some(([from, to]) => point >= from && point <= to);
    });
    expect(missing, family).toEqual([]);
  }
});

test('scene captions and small HUD labels stay opaque and use readable weights', () => {
  for (const selector of ['.header-note', '.intro-caption']) {
    const text = rule(hud, selector);
    expect(text).toContain('font-weight: 600');
    expect(text).not.toContain('opacity:');
  }
  expect(rule(hud, '.intro-caption')).toContain('font-size: 13px');
  expect(rule(hud, '.eyebrow')).toContain('font: 600 11px/1.5 var(--font-sans)');
  expect(rule(hud, '.keyboard-help')).toContain('font: 600 13px/1.5 var(--font-sans)');
});
