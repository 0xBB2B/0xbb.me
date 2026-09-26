import { expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dir, '..');

test('the legacy MC-2D site source and its dedicated tests are deleted', () => {
  expect(existsSync(path.join(root, 'portfolio'))).toBe(false);
  expect(existsSync(path.join(root, 'components/portfolio'))).toBe(false);
  expect(existsSync(path.join(root, 'tests/model-fingerprint.ts'))).toBe(false);
  const leftoverTests = readdirSync(path.join(root, 'tests')).filter(name => name.startsWith('portfolio-'));
  expect(leftoverTests).toEqual([]);
});

test('only the approved profile photo remains published', () => {
  expect(existsSync(path.join(root, 'public/profile.png'))).toBe(false);
  expect(existsSync(path.join(root, 'public/profile-full.png'))).toBe(false);
  expect(existsSync(path.join(root, 'public/site-card.svg'))).toBe(false);
  const jpg = readFileSync(path.join(root, 'public/profile.jpg'));
  expect(createHash('sha256').update(jpg).digest('hex')).toBe('c28ed9a1e2296e6b667212bd3758323b496791982f25b4e663d84ebbb2422543');
});

test('package.json declares only the rainy-konbini runtime dependencies', () => {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  expect(pkg.name).toBe('rainy-konbini-portfolio');
  expect(Object.keys(pkg.dependencies).sort()).toEqual([
    '@fontsource-variable/noto-sans-sc', '@fontsource-variable/noto-serif-sc', '@fontsource/dela-gothic-one',
    '@fontsource/m-plus-rounded-1c', 'react', 'react-dom', 'three',
  ].sort());
  expect(readFileSync(path.join(root, 'bun.lock'), 'utf8')).not.toMatch(/"(?:motion|framer-motion|motion-dom|motion-utils)"\s*:/);
});

test('the built site has no trace of the old game entry or MC-2D branding', () => {
  expect(existsSync(path.join(root, 'dist/index.html'))).toBe(true);
  expect(existsSync(path.join(root, 'dist/game'))).toBe(false);
  expect(existsSync(path.join(root, 'dist/profile.png'))).toBe(false);
  expect(existsSync(path.join(root, 'dist/profile-full.png'))).toBe(false);
  expect(existsSync(path.join(root, 'dist/site-card.svg'))).toBe(false);
  const html = readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  expect(html).not.toMatch(/\/game\/|MC-2D|RHYTHM_BLADE/);
});
