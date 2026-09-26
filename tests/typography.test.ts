import { expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { APP_DATA } from '../data';
import { COPY } from '../copy';

const read = (file: string) => readFileSync(path.resolve(import.meta.dir, '..', file), 'utf8');
const typography = read('typography.css');
const families = ['noto-sans-sc', 'noto-serif-sc'];

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

test('display weight differs between English and Chinese headings', () => {
  expect(typography).toMatch(/:root\s*{[^}]*--font-display-weight: 400/);
  expect(typography).toMatch(/:root:lang\(zh\)\s*{[^}]*--font-display-weight: 600/);
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

test('the bundled character ranges cover bilingual content and interface symbols', () => {
  const text = JSON.stringify([APP_DATA, COPY]) + 'f. ↗ ◎ ⇄ ← → × · …';
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

test('all UI font declarations use the shared sans and display families', () => {
  const root = path.resolve(import.meta.dir, '..');
  const files = ['index.css'];
  const visit = (directory: string) => {
    for (const entry of readdirSync(path.join(root, directory), { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (file.endsWith('.css')) files.push(file);
    }
  };
  if (existsSync(path.join(root, 'components'))) visit('components');
  for (const file of files) {
    const css = read(file);
    expect(css, file).not.toMatch(/Georgia|Songti|PingFang|Segoe|YaHei|Consolas|IBM Plex|system-ui|monospace|--font-mono/);
    for (const match of css.matchAll(/(?:font|font-family):\s*([^;]+);/g)) {
      expect(match[1], file).toMatch(/var\(--font-(?:sans|display)\)|inherit/);
    }
  }
});

test('the canvas signage fonts are bundled, pinned and credited in the notices', () => {
  const dependencies = JSON.parse(read('package.json')).dependencies;
  for (const family of ['dela-gothic-one', 'm-plus-rounded-1c']) {
    expect(dependencies[`@fontsource/${family}`]).toMatch(/^\d+\.\d+\.\d+$/);
    expect(read('public/THIRD_PARTY_NOTICES.txt')).toContain(read(`node_modules/@fontsource/${family}/LICENSE`).trim());
  }
});
